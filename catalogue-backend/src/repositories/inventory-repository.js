// PostgreSQL repository for mutable inventory data.
export function createInventoryRepository(pool) {
    return {
        async getQuantities(partNumbers) {
            if (partNumbers.length === 0) return new Map();

            const { rows } = await pool.query(
                `SELECT part_number, quantity_on_hand
                FROM inventory WHERE part_number = ANY($1::integer[])`,
                [partNumbers],
            );

            return new Map(rows.map((row) => [Number(row.part_number), Number(row.quantity_on_hand)]));
        },

        async lockQuantities(connection, partNumbers) {
            if (partNumbers.length === 0) return new Map();

            await connection.query(
                `INSERT INTO inventory (part_number, quantity_on_hand)
                SELECT unnest($1::integer[]), 0
                ON CONFLICT (part_number) DO NOTHING`,
                [partNumbers],
            );

            const { rows } = await connection.query(
                `SELECT part_number, quantity_on_hand FROM inventory
                WHERE part_number = ANY($1::integer[]) FOR UPDATE`,
                [partNumbers],
            );

            return new Map(rows.map((row) => [Number(row.part_number), Number(row.quantity_on_hand)]));
        },

        async decrement(connection, items, orderId) {
            for (const item of items) {
                const result = await connection.query(
                    `UPDATE inventory SET quantity_on_hand = quantity_on_hand - $1,
                    updated_at = CURRENT_TIMESTAMP
                    WHERE part_number = $2 AND quantity_on_hand >= $1`,
                    [item.quantity, item.partNumber],
                );

                if (result.rowCount !== 1) {
                    throw new Error(`Concurrent inventory update failed for part ${item.partNumber}`);
                }

                await connection.query(
                    `INSERT INTO inventory_movements
                    (part_number, quantity_delta, reason, order_id)
                    VALUES ($1, $2, 'ORDER_RESERVED', $3)`,
                    [item.partNumber, -item.quantity, orderId],
                );
            }
        },

        async restore(connection, items, orderId) {
            for (const item of items) {
                await connection.query(
                    `UPDATE inventory SET quantity_on_hand = quantity_on_hand + $1,
                    updated_at = CURRENT_TIMESTAMP WHERE part_number = $2`,
                    [item.quantity, item.partNumber],
                );

                await connection.query(
                    `INSERT INTO inventory_movements
                    (part_number, quantity_delta, reason, order_id)
                    VALUES ($1, $2, 'PAYMENT_RELEASED', $3)`,
                    [item.partNumber, item.quantity, orderId],
                );
            }
        },

        async receive(connection, { partNumber, quantity, note }) {
            await connection.query(
                `INSERT INTO inventory (part_number, quantity_on_hand)
                VALUES ($1, $2)
                ON CONFLICT (part_number) DO UPDATE SET
                    quantity_on_hand = inventory.quantity_on_hand + EXCLUDED.quantity_on_hand,
                    updated_at = CURRENT_TIMESTAMP`,
                [partNumber, quantity],
            );

            const movement = await connection.query(
                `INSERT INTO inventory_movements
                (part_number, quantity_delta, reason, note)
                VALUES ($1, $2, 'RECEIVED', $3)
                RETURNING id`,
                [partNumber, quantity, note || null],
            );

            const quantityResult = await connection.query(
                'SELECT quantity_on_hand FROM inventory WHERE part_number = $1',
                [partNumber],
            );

            return {
                movementId: Number(movement.rows[0].id),
                quantityOnHand: Number(quantityResult.rows[0].quantity_on_hand),
            };
        },

        async recentMovements({ limit, offset }) {
            const { rows } = await pool.query(
                `SELECT id, part_number, quantity_delta, reason, order_id, note, created_at
                FROM inventory_movements ORDER BY id DESC LIMIT $1 OFFSET $2`,
                [limit, offset],
            );

            return rows.map((row) => ({
                id: Number(row.id),
                partNumber: Number(row.part_number),
                quantityDelta: Number(row.quantity_delta),
                reason: row.reason,
                orderId: row.order_id,
                note: row.note,
                createdAt: row.created_at,
            }));
        },
    };
}

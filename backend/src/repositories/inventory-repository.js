// This script provides an inventory repository for managing inventory data in a database. It includes functions to get quantities...
// ...lock quantities, decrement and restore inventory, receive new stock, and retrieve recent inventory movements

// The repository uses a connection pool to execute SQL queries and maps database rows to inventory objects
export function createInventoryRepository(pool) {
    return {
        // Method to get the quantities on hand for a list of part numbers
        async getQuantities(partNumbers) {
            if (partNumbers.length === 0) return new Map();
            
            const placeholders = partNumbers.map(() => '?').join(', ');
            const [rows] = await pool.execute(
                `SELECT part_number, quantity_on_hand
                FROM inventory WHERE part_number IN (${placeholders})`,
                partNumbers,
            );
            
            return new Map(rows.map((row) => [Number(row.part_number), Number(row.quantity_on_hand)]));
        },

        // Method to lock the quantities for a list of part numbers, ensuring that they are not modified by other transactions
        async lockQuantities(connection, partNumbers) {
            if (partNumbers.length === 0) return new Map();
            
            const values = partNumbers.map(() => '(?, 0)').join(', ');
            await connection.execute(
                `INSERT IGNORE INTO inventory (part_number, quantity_on_hand) VALUES ${values}`,
                partNumbers,
            );
            
            const placeholders = partNumbers.map(() => '?').join(', ');
            const [rows] = await connection.execute(
                `SELECT part_number, quantity_on_hand FROM inventory
                WHERE part_number IN (${placeholders}) FOR UPDATE`,
                partNumbers,
            );
            
            return new Map(rows.map((row) => [Number(row.part_number), Number(row.quantity_on_hand)]));
        },

        // Method to decrement the quantities for a list of items, ensuring that the quantities do not go below zero
        async decrement(connection, items, orderId) {
            for (const item of items) {
                const [result] = await connection.execute(
                    `UPDATE inventory SET quantity_on_hand = quantity_on_hand - ?
                    WHERE part_number = ? AND quantity_on_hand >= ?`,
                    [item.quantity, item.partNumber, item.quantity],
                );
                
                if (result.affectedRows !== 1) {
                    throw new Error(`Concurrent inventory update failed for part ${item.partNumber}`);
                }
                
                await connection.execute(
                    `INSERT INTO inventory_movements
                    (part_number, quantity_delta, reason, order_id)
                    VALUES (?, ?, 'ORDER_RESERVED', ?)`,
                    [item.partNumber, -item.quantity, orderId],
                );
            }
        },

        // Method to restore the quantities for a list of items, typically used when an order is canceled or payment is released
        async restore(connection, items, orderId) {
            for (const item of items) {
                await connection.execute(
                    `UPDATE inventory SET quantity_on_hand = quantity_on_hand + ? WHERE part_number = ?`,
                    [item.quantity, item.partNumber],
                );
                
                await connection.execute(
                    `INSERT INTO inventory_movements
                    (part_number, quantity_delta, reason, order_id)
                    VALUES (?, ?, 'PAYMENT_RELEASED', ?)`,
                    [item.partNumber, item.quantity, orderId],
                );
            }
        },

        // Method to receive new stock for a part number, updating the inventory and recording the movement
        async receive(connection, { partNumber, quantity, note }) {
            await connection.execute(
                `INSERT INTO inventory (part_number, quantity_on_hand)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE quantity_on_hand = quantity_on_hand + VALUES(quantity_on_hand)`,
                [partNumber, quantity],
            );
            
            const [result] = await connection.execute(
                `INSERT INTO inventory_movements
                (part_number, quantity_delta, reason, note)
                VALUES (?, ?, 'RECEIVED', ?)`,
                [partNumber, quantity, note || null],
            );
            
            const [rows] = await connection.execute(
                'SELECT quantity_on_hand FROM inventory WHERE part_number = ?',
                [partNumber],
            );
            
            return { movementId: Number(result.insertId), quantityOnHand: Number(rows[0].quantity_on_hand) };
        },

        // Method to retrieve recent inventory movements with pagination support
        async recentMovements({ limit, offset }) {
            const [rows] = await pool.execute(
                `SELECT id, part_number, quantity_delta, reason, order_id, note, created_at
                FROM inventory_movements ORDER BY id DESC LIMIT ? OFFSET ?`,
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

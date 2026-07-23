function mapRate(row) {
    return {
        id: Number(row.id),
        minWeight: Number(row.min_weight),
        maxWeight: row.max_weight === null ? null : Number(row.max_weight),
        charge: Number(row.charge),
    };
}

export function createShippingRepository(pool) {
    return {
        async findForWeight(weight) {
            const { rows } = await pool.query(
                `SELECT id, min_weight, max_weight, charge
                FROM shipping_rates
                WHERE $1 >= min_weight AND (max_weight IS NULL OR $1 < max_weight)
                ORDER BY min_weight DESC LIMIT 1`,
                [weight],
            );
            return rows[0] ? mapRate(rows[0]) : null;
        },

        async list(executor = pool) {
            const { rows } = await executor.query(
                `SELECT id, min_weight, max_weight, charge
                FROM shipping_rates ORDER BY min_weight`,
            );
            return rows.map(mapRate);
        },

        async replace(connection, rates) {
            await connection.query('DELETE FROM shipping_rates');
            for (const rate of rates) {
                await connection.query(
                    `INSERT INTO shipping_rates (min_weight, max_weight, charge)
                    VALUES ($1, $2, $3)`,
                    [rate.minWeight, rate.maxWeight, rate.charge],
                );
            }
        },

        async create(connection, rate) {
            const { rows } = await connection.query(
                `INSERT INTO shipping_rates (min_weight, max_weight, charge)
                VALUES ($1, $2, $3)
                RETURNING id, min_weight, max_weight, charge`,
                [rate.minWeight, rate.maxWeight, rate.charge],
            );
            return mapRate(rows[0]);
        },

        async update(connection, id, rate) {
            const { rows } = await connection.query(
                `UPDATE shipping_rates SET min_weight = $1, max_weight = $2, charge = $3
                WHERE id = $4 RETURNING id, min_weight, max_weight, charge`,
                [rate.minWeight, rate.maxWeight, rate.charge, id],
            );
            return rows[0] ? mapRate(rows[0]) : null;
        },

        async delete(connection, id) {
            const { rows } = await connection.query(
                `DELETE FROM shipping_rates WHERE id = $1
                RETURNING id, min_weight, max_weight, charge`,
                [id],
            );
            return rows[0] ? mapRate(rows[0]) : null;
        },
    };
}

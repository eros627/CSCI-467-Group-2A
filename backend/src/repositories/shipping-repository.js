/* This script provides a shipping repository for managing shipping rate data in a database. 
It includes functions to find shipping rates based on weight, list all shipping rates, and replace existing shipping rates. 
The repository uses a connection pool to execute SQL queries and maps database rows to shipping rate objects */

// Function to map a database row to a shipping rate object
function mapRate(row) {
    return {
        id: Number(row.id),
        minWeight: Number(row.min_weight),
        maxWeight: row.max_weight === null ? null : Number(row.max_weight),
        charge: Number(row.charge),
    };
}

// Function to create a shipping repository with methods for finding, listing, and replacing shipping rates
export function createShippingRepository(pool) {
    return {
        // Method to find a shipping rate for a given weight
        async findForWeight(weight) {
            const [rows] = await pool.execute(
                `SELECT id, min_weight, max_weight, charge
                FROM shipping_rates
                WHERE ? >= min_weight AND (max_weight IS NULL OR ? < max_weight)
                ORDER BY min_weight DESC LIMIT 1`,
                [weight, weight],
            );
            
            return rows[0] ? mapRate(rows[0]) : null;
        },
        
        // Method to list all shipping rates ordered by minimum weight
        async list() {
            const [rows] = await pool.execute(
                `SELECT id, min_weight, max_weight, charge
                FROM shipping_rates ORDER BY min_weight`,
            );
            
            return rows.map(mapRate);
        },
        
        // Method to replace all existing shipping rates with a new set of rates
        async replace(connection, rates) {
            await connection.execute('DELETE FROM shipping_rates');
            
            for (const rate of rates) {
                await connection.execute(
                    `INSERT INTO shipping_rates (min_weight, max_weight, charge)
                    VALUES (?, ?, ?)`,
                    [rate.minWeight, rate.maxWeight, rate.charge],
                );
            }
        },
    };
}

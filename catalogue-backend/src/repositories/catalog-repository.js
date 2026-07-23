/* This script provides a catalog repository for managing product data in a database. 
It includes functions to list products, retrieve products by part number, and find products by exact description. 
The repository uses a connection pool to execute SQL queries and maps database rows to product objects */

// Function to map a database row to a product object
function mapProduct(row) {
    return {
        partNumber: Number(row.number),
        description: row.description,
        price: Number(row.price),
        weight: Number(row.weight),
        pictureUrl: row.pictureURL,
    };
}

// Function to create a catalog repository with methods for listing and retrieving products
export function createCatalogRepository(pool) {
    return {
        // Method to list products with optional search, limit, and offset parameters
        async list({ search, limit, offset }) {
            const parameters = [];
            let where = '';
            
            if (search) {
                where = 'WHERE description LIKE ? OR CAST(number AS CHAR) = ?';
                parameters.push(`%${search}%`, search);
            }
            
            const [rows] = await pool.execute(
                `SELECT number, description, price, weight, pictureURL
                FROM parts ${where}
                ORDER BY number
                LIMIT ? OFFSET ?`,
                [...parameters, limit, offset],
            );
      
            const [countRows] = await pool.execute(
                `SELECT COUNT(*) AS total FROM parts ${where}`,
                parameters,
            );
            
            return { items: rows.map(mapProduct), total: Number(countRows[0].total) };
        },

        // Method to retrieve a product by its part number
        async getByNumber(partNumber) {
            const [rows] = await pool.execute(
                `SELECT number, description, price, weight, pictureURL
                FROM parts WHERE number = ? LIMIT 1`,
                [partNumber],
            );
            
            return rows[0] ? mapProduct(rows[0]) : null;
        },

        // Method to retrieve multiple products by their part numbers
        async getByPartNumbers(partNumbers) {
            if (partNumbers.length === 0) return [];
            
            const placeholders = partNumbers.map(() => '?').join(', ');
            const [rows] = await pool.execute(
                `SELECT number, description, price, weight, pictureURL
                FROM parts WHERE number IN (${placeholders})`,
                partNumbers,
            );
            
            return rows.map(mapProduct);
        },

        // Method to find products by exact description, case-insensitive
        async findByExactDescription(description) {
            const [rows] = await pool.execute(
                `SELECT number, description, price, weight, pictureURL
                FROM parts WHERE LOWER(description) = LOWER(?) ORDER BY number LIMIT 2`,
                [description],
            );
            
            return rows.map(mapProduct);
        },
    };
}

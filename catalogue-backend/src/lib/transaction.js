/* This function executes a given work function within a database transaction using a connection from the provided pool. 
It ensures that the transaction is properly committed if the work succeeds, or rolled back if an error occurs. 
The connection is released back to the pool after the transaction is completed, regardless of success or failure */

export async function withTransaction(pool, work) {
    const connection = await pool.connect();
  
    try {
        await connection.query('BEGIN');
        const result = await work(connection);
        await connection.query('COMMIT');
        return result;
    } 
    catch (error) {
        try {
            await connection.query('ROLLBACK');
        } 
        catch {
            // Keep the original error; a broken connection is discarded by the pool.
            }
            throw error;
    } 
    finally {
        connection.release();
    }
}

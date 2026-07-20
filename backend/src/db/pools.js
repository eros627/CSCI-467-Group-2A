/* This script checks the syntax of all .js files under the 'src' directory using Node.js's built-in syntax checking feature
It recursively finds all .js files and runs a synchronous child process to check their syntax... 
...reporting any failures and setting the exit code accordingly */

// This module provides functions to create and manage MySQL connection pools for the application and legacy databases
import mysql from 'mysql2/promise';

// Create a connection pool for the given settings
function createPool(settings) {
    return mysql.createPool({
        host: settings.host,
        port: settings.port,
        database: settings.database,
        user: settings.user,
        password: settings.password,
        connectionLimit: settings.connectionLimit,
        waitForConnections: true,
        queueLimit: 0,
        decimalNumbers: true,
        timezone: 'Z',
        enableKeepAlive: true,
    });
}

// Create connection pools for the application and legacy databases based on the provided configuration
export function createPools(config) {
    return {
        app: createPool(config.appDb),
        legacy: createPool(config.legacyDb),
    };
}

// Close the connection pools for the application and legacy databases
export async function closePools(pools) {
    await Promise.allSettled([pools.app.end(), pools.legacy.end()]);
}

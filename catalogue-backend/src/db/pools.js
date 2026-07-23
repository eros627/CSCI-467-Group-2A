// The mutable application data lives in PostgreSQL; the read-only legacy parts
// catalog remains in MySQL.
import mysql from 'mysql2/promise';
import pg from 'pg';

const { Pool: PostgresPool } = pg;

// Create a connection pool for the given settings
function createLegacyPool(settings) {
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

function createApplicationPool(settings) {
    return new PostgresPool({
        host: settings.host,
        port: settings.port,
        database: settings.database,
        user: settings.user,
        password: settings.password,
        max: settings.connectionLimit,
        ssl: settings.ssl ? { rejectUnauthorized: false } : false,
    });
}

// Create connection pools for the application and legacy databases based on the provided configuration
export function createPools(config) {
    return {
        app: createApplicationPool(config.appDb),
        legacy: createLegacyPool(config.legacyDb),
    };
}

// Close the connection pools for the application and legacy databases
export async function closePools(pools) {
    await Promise.allSettled([pools.app.end(), pools.legacy.end()]);
}

/* This script is responsible for loading and validating the application's configuration settings from environment variables. 
It provides utility functions to parse integers and booleans, as well as to construct database configuration objects. 
The main function, `loadConfig`, gathers all necessary settings, applies defaults where appropriate, and checks for required settings in production environments. 
If any required settings are missing or invalid, it throws an `AppError` with a descriptive message. */

// Import AppError: it allows us to throw a specific error when the configuration is invalid, providing better error handling and debugging capabilities
import { AppError } from './lib/errors.js';

// Utility function to parse an environment variable as a non-negative integer, with a fallback value
function integer(name, fallback) {
    const raw = process.env[name];
    const value = raw === undefined || raw === '' ? fallback : Number(raw);
    if (!Number.isInteger(value) || value < 0) {
        throw new AppError(500, 'CONFIGURATION_ERROR', `${name} must be a non-negative integer`);
    }
    return value;
}

// Utility function to parse an environment variable as a boolean, with a fallback value
function boolean(name, fallback = false) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    return raw.toLowerCase() === 'true';
}

// Utility function to construct a database configuration object from environment variables, with optional defaults
function database(prefix, defaults = {}) {
    return {
        host: process.env[`${prefix}_HOST`] || defaults.host || '127.0.0.1',
        port: integer(`${prefix}_PORT`, defaults.port),
        database: process.env[`${prefix}_NAME`] || defaults.database,
        user: process.env[`${prefix}_USER`] || defaults.user,
        password: process.env[`${prefix}_PASSWORD`] || '',
        connectionLimit: integer(`${prefix}_CONNECTION_LIMIT`, defaults.connectionLimit || 10),
        ssl: boolean(`${prefix}_SSL`, defaults.ssl || false),
    };
}

// The loadConfig function gathers and validates the application's configuration settings from environment variables
export function loadConfig() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const config = {
        nodeEnv,
        port: integer('PORT', 3000),
        trustProxy: boolean('TRUST_PROXY'),
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        appDb: database('APP_DB', { port: 5432, database: 'auto_parts_app', connectionLimit: 10 }),
        legacyDb: database('LEGACY_DB', { port: 3306, database: 'csci467', connectionLimit: 5 }),
        payment: {
            url: process.env.PAYMENT_URL || 'http://blitz.cs.niu.edu/CreditCard/',
            vendorId: process.env.PAYMENT_VENDOR_ID || '',
            timeoutMs: integer('PAYMENT_TIMEOUT_MS', 10000),
        },
        auth: {
            warehouseApiKey: process.env.WAREHOUSE_API_KEY || '',
            adminApiKey: process.env.ADMIN_API_KEY || '',
        },
        mail: {
            mode: process.env.MAIL_MODE || 'console',
            from: process.env.MAIL_FROM || 'orders@example.com',
            smtp: {
                host: process.env.SMTP_HOST || '',
                port: integer('SMTP_PORT', 587),
                secure: boolean('SMTP_SECURE'),
                auth: process.env.SMTP_USER
                    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || '' }
                    : undefined,
            },
        },
    };
    
    if (nodeEnv === 'production') {
        const required = [
            ['APP_DB_NAME', config.appDb.database],
            ['APP_DB_USER', config.appDb.user],
            ['LEGACY_DB_NAME', config.legacyDb.database],
            ['LEGACY_DB_USER', config.legacyDb.user],
            ['PAYMENT_VENDOR_ID', config.payment.vendorId],
            ['WAREHOUSE_API_KEY', config.auth.warehouseApiKey],
            ['ADMIN_API_KEY', config.auth.adminApiKey],
        ];
        
        const missing = required.filter(([, value]) => !value).map(([name]) => name);
        if (missing.length) {
            throw new AppError(500, 'CONFIGURATION_ERROR', `Missing required settings: ${missing.join(', ')}`);
        }
    }
    
    return config;
}

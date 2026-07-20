const mysql = require('mysql2/promise');

const legacyDb = mysql.createPool({
    host: process.env.LEGACY_DB_HOST,
    port: process.env.LEGACY_DB_PORT,
    user: process.env.LEGACY_DB_USER,
    password: process.env.LEGACY_DB_PASSWORD,
    database: process.env.LEGACY_DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = legacyDb;
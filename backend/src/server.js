require('dotenv').config();

const express = require('express');
const cors = require('cors');

const pool = require('./config/db');
const legacyDb = require('./config/legacyDb');

const productRoutes = require('./routes/productRoutes');
const shippingRateRoutes = require('./routes/shippingRateRoutes');

const orderRoutes = require('./routes/orderRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/shipping-rates', shippingRateRoutes);

app.use('/api/orders', orderRoutes);

app.get('/', (req, res) => {
    res.json({
        message: 'Backend is running'
    });
});

app.get('/api/test-database', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');

        res.json({
            message: 'Database connected',
            time: result.rows[0].now
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Database connection failed'
        });
    }
});

app.get('/api/test-legacy', async (req, res) => {
    try {
        const [rows] = await legacyDb.query(
            'SELECT COUNT(*) AS total FROM parts'
        );

        res.json({
            message: 'Legacy database connected',
            totalParts: rows[0].total
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Legacy database connection failed'
        });
    }
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Backend server is running on port ${port}`);
});
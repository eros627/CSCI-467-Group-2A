const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT *
            FROM orders
            ORDER BY order_id DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Failed to load orders'
        });
    }
});

router.get('/:id/items', async (req, res) => {
    try {
        const orderId = req.params.id;

        const result = await pool.query(
            `
            SELECT
                order_item_id,
                part_number,
                quantity,
                unit_price
            FROM order_items
            WHERE order_id = $1
            ORDER BY order_item_id
            `,
            [orderId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Failed to load order items'
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const orderId = req.params.id;

        const result = await pool.query(
            `
            SELECT *
            FROM orders
            WHERE order_id = $1
            `,
            [orderId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Order not found'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Failed to load order'
        });
    }
});

module.exports = router;
const express = require('express');
const legacyDb = require('../config/legacyDb');
const pool = require('../config/db');

const router = express.Router();

function buildInventoryPartNumber(productNumber) {
    return `PART-${1000 + Number(productNumber)}`;
}

router.get('/', async (req, res) => {
    try {
        const [products] = await legacyDb.query(`
            SELECT
                number,
                description,
                price,
                weight,
                pictureURL
            FROM parts
            ORDER BY number
        `);

        const inventoryResult = await pool.query(`
            SELECT
                part_number,
                quantity_on_hand
            FROM inventory
        `);

        const inventoryMap = new Map(
            inventoryResult.rows.map((item) => [
                item.part_number,
                item.quantity_on_hand
            ])
        );

        const productsWithInventory = products.map((product) => {
            const inventoryPartNumber =
                buildInventoryPartNumber(product.number);

            return {
                ...product,
                qtyAvailable:
                    inventoryMap.get(inventoryPartNumber) || 0
            };
        });

        res.json(productsWithInventory);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Failed to load products'
        });
    }
});

router.get('/:number', async (req, res) => {
    try {
        const productNumber = req.params.number;

        const [rows] = await legacyDb.query(
            `
            SELECT
                number,
                description,
                price,
                weight,
                pictureURL
            FROM parts
            WHERE number = ?
            `,
            [productNumber]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: 'Product not found'
            });
        }

        const inventoryPartNumber =
            buildInventoryPartNumber(productNumber);

        const inventoryResult = await pool.query(
            `
            SELECT quantity_on_hand
            FROM inventory
            WHERE part_number = $1
            `,
            [inventoryPartNumber]
        );

        const qtyAvailable =
            inventoryResult.rows.length > 0
                ? inventoryResult.rows[0].quantity_on_hand
                : 0;

        res.json({
            ...rows[0],
            qtyAvailable
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: 'Failed to load product'
        });
    }
});

module.exports = router;
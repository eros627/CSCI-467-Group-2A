const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    res.json({
        message: 'Shipping rates route works'
    });
});

module.exports = router;
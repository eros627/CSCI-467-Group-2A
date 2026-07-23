import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { validate } from '../middleware/validate.js';
import { receiptBody } from '../validation/schemas.js';

export function inventoryRoutes(warehouseService) {
    const router = Router();
    router.post('/receive', validate({ body: receiptBody }), asyncHandler(async (req, res) => {
        res.status(201).json({ data: await warehouseService.receive(req.body) });
    }));
    return router;
}

import { Router } from 'express';
import { asyncHandler } from '../lib/async-handler.js';
import { validate } from '../middleware/validate.js';
import {
    shippingQuoteQuery,
    shippingRateBody,
    shippingRateIdParams,
} from '../validation/schemas.js';

export function shippingQuoteRoutes(adminService) {
    const router = Router();
    router.get('/', validate({ query: shippingQuoteQuery }), asyncHandler(async (req, res) => {
        res.json({ data: await adminService.quoteShipping(req.query.weight) });
    }));
    return router;
}

export function shippingRateRoutes(adminService) {
    const router = Router();

    router.get('/', asyncHandler(async (_req, res) => {
        res.json({ data: await adminService.listShippingRates() });
    }));
    router.post('/', validate({ body: shippingRateBody }), asyncHandler(async (req, res) => {
        res.status(201).json({ data: await adminService.createShippingRate(req.body) });
    }));
    router.put('/:rateId', validate({ params: shippingRateIdParams, body: shippingRateBody }), asyncHandler(async (req, res) => {
        res.json({ data: await adminService.updateShippingRate(req.params.rateId, req.body) });
    }));
    router.delete('/:rateId', validate({ params: shippingRateIdParams }), asyncHandler(async (req, res) => {
        res.json({ data: await adminService.deleteShippingRate(req.params.rateId) });
    }));

    return router;
}

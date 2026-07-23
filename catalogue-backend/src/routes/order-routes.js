import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../lib/async-handler.js';
import { ValidationError } from '../lib/errors.js';
import { requireAnyApiKey, requireApiKey } from '../middleware/api-key.js';
import { validate } from '../middleware/validate.js';
import {
    createOrderBody,
    customerOrderQuery,
    orderIdParams,
    orderSearchQuery,
    retryPaymentBody,
    shipmentBody,
} from '../validation/schemas.js';

const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

export function orderRoutes({
    orderService,
    adminService,
    warehouseService,
    adminApiKey,
    warehouseApiKey,
}) {
    const router = Router();
    const requireStaff = requireAnyApiKey([adminApiKey, warehouseApiKey]);
    const requireWarehouse = requireApiKey(warehouseApiKey, 'Warehouse');

    router.get('/', requireStaff, validate({ query: orderSearchQuery }), asyncHandler(async (req, res) => {
        const result = await adminService.listOrders(req.query);
        res.json({
            data: result.items,
            pagination: { limit: req.query.limit, offset: req.query.offset, total: result.total },
        });
    }));

    router.post('/', paymentLimiter, validate({ body: createOrderBody }), asyncHandler(async (req, res) => {
        const idempotencyKey = req.get('idempotency-key')?.trim() || undefined;
        if (idempotencyKey && idempotencyKey.length > 128) {
            throw new ValidationError('Idempotency-Key cannot exceed 128 characters');
        }

        const result = await orderService.create({ ...req.body, idempotencyKey });
        res
            .status(result.replayed ? 200 : 201)
            .location(`/api/orders/${result.order.id}`)
            .json({ data: result.order, replayed: result.replayed });
    }));

    router.get(
        '/:id',
        validate({ params: orderIdParams, query: customerOrderQuery }),
        (req, res, next) => (req.query.email ? next() : requireStaff(req, res, next)),
        asyncHandler(async (req, res) => {
            const order = req.query.email
                ? await orderService.getForCustomer(req.params.id, req.query.email)
                : await adminService.getOrder(req.params.id);
            res.json({ data: order });
        }),
    );

    router.patch(
        '/:id',
        requireWarehouse,
        validate({ params: orderIdParams, body: shipmentBody }),
        asyncHandler(async (req, res) => {
            res.json({ data: await warehouseService.ship(req.params.id, req.body) });
        }),
    );

    router.post('/:id/payment', paymentLimiter, validate({ params: orderIdParams, body: retryPaymentBody }), asyncHandler(async (req, res) => {
        const order = await orderService.retryPayment(req.params.id, req.body.customerEmail, req.body.payment);
        res.json({ data: order });
    }));

    return router;
}

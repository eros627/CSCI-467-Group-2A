// This script defines the order routes for the application. It includes endpoints for creating orders, retrieving order details...
// ...and retrying payments. The routes are protected and require appropriate validation and error handling

// // Import Router: it allows us to create modular route handlers in Express.js 
import { Router } from 'express';

// Import rateLimit: a middleware function that limits the number of requests from a single IP address within a specified time window...
// ...to prevent abuse and ensure fair usage of the API
import rateLimit from 'express-rate-limit';

// Import asyncHandler: a utility function that wraps asynchronous route handlers to catch errors and pass them to the error-handling middleware
import { asyncHandler } from '../lib/async-handler.js';

// Import ValidationError: a custom error class that represents validation errors...
// ...used to provide meaningful error messages when request validation fails
import { ValidationError } from '../lib/errors.js';

// Import validate: a middleware function that validates incoming requests against defined schemas to ensure data integrity...
// ...and prevent invalid data from being processed
import { validate } from '../middleware/validate.js';

// Import createOrderBody: a schema that defines the expected structure and validation rules for the request body when creating an order
// Import orderIdParams: a schema that defines the expected structure and validation rules for the order ID parameter in the route
// Import retryPaymentBody: a schema that defines the expected structure and validation rules for the request body when retrying a payment
// Import customerOrderQuery: a schema that defines the expected structure and validation rules for the query parameters used to...
// ...retrieve a customer's order
import {
    createOrderBody,
    orderIdParams,
    retryPaymentBody,
    customerOrderQuery,
} from '../validation/schemas.js';

// Define a rate limiter for payment-related routes to limit the number of requests from a single IP address...
// ...to 30 requests per 15 minutes. This helps prevent abuse and ensures fair usage of the API
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

// This function defines the order routes for the application. It takes an orderService as a parameter...
// ...which is responsible for handling the business logic related to orders. The function returns an Express router...
// ...with defined routes for creating orders, retrieving order details, and retrying payments
export function orderRoutes(orderService) {
    const router = Router();
    
    router.post('/', paymentLimiter, validate({ body: createOrderBody }), asyncHandler(async (req, res) => {
        const idempotencyKey = req.get('idempotency-key')?.trim() || undefined;
        
        if (idempotencyKey && idempotencyKey.length > 128) {
            throw new ValidationError('Idempotency-Key cannot exceed 128 characters');
        }
        
        const result = await orderService.create({
            ...req.body,
            idempotencyKey,
        });
        
        res
            .status(result.replayed ? 200 : 201)
            .location(`/api/orders/${result.order.id}`)
            .json({ data: result.order, replayed: result.replayed });
    }));
    
    router.get('/:id', validate({ params: orderIdParams, query: customerOrderQuery }), asyncHandler(async (req, res) => {
        res.json({ data: await orderService.getForCustomer(req.params.id, req.query.email) });
    }));
    
    router.post('/:id/payment', paymentLimiter, validate({ params: orderIdParams, body: retryPaymentBody }), asyncHandler(async (req, res) => {
        const order = await orderService.retryPayment(req.params.id, req.body.customerEmail, req.body.payment);
        res.json({ data: order });
    }));
    
    return router;
}

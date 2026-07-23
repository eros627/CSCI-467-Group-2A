// This script defines the admin routes for the application. It includes endpoints for managing shipping rates and orders. 
// The routes are protected and require appropriate validation and error handling

// Import Router: it allows us to create modular route handlers in Express.js 
import { Router } from 'express';

// Import asyncHandler: a utility function that wraps asynchronous route handlers to catch errors and pass them to the error-handling middleware
import { asyncHandler } from '../lib/async-handler.js';

// Import validate: a middleware function that validates incoming requests against defined schemas to ensure data integrity...
// ...and prevent invalid data from being processed
import { validate } from '../middleware/validate.js';

// Import orderIdParams: a schema that defines the expected structure and validation rules for the order ID parameter in the route
// Import orderSearchQuery: a schema that defines the expected structure and validation rules for the query parameters used to search for orders
// Import shippingRatesBody: a schema that defines the expected structure and validation rules for the request body when updating shipping rates
import { orderIdParams, orderSearchQuery, shippingRatesBody } from '../validation/schemas.js';

/* This function defines the admin routes for the application. It takes an adminService as a parameter...
...which is responsible for handling the business logic related to shipping rates and orders. The function returns an Express router...
...with defined routes for managing shipping rates and orders */
export function adminRoutes(adminService) {
    const router = Router();
    
    router.get('/shipping-rates', asyncHandler(async (_req, res) => {
        res.json({ data: await adminService.listShippingRates() });
    }));
    
    router.put('/shipping-rates', validate({ body: shippingRatesBody }), asyncHandler(async (req, res) => {
        res.json({ data: await adminService.replaceShippingRates(req.body.rates) });
    }));
    
    router.get('/orders', validate({ query: orderSearchQuery }), asyncHandler(async (req, res) => {
        const result = await adminService.listOrders(req.query);
        res.json({ data: result.items, pagination: { limit: req.query.limit, offset: req.query.offset, total: result.total } });
    }));
    
    router.get('/orders/:id', validate({ params: orderIdParams }), asyncHandler(async (req, res) => {
        res.json({ data: await adminService.getOrder(req.params.id) });
    }));
    
    return router;
}

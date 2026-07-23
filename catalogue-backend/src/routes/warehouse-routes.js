// This script defines the warehouse routes for the application. It includes endpoints for managing orders and inventory in the warehouse. 
// The routes are protected and require appropriate validation and error handling

// Import Router: it allows us to create modular route handlers in Express.js 
import { Router } from 'express';

// Import asyncHandler: a utility function that wraps asynchronous route handlers to catch errors and pass them to the error-handling middleware
import { asyncHandler } from '../lib/async-handler.js';

// Import validate: a middleware function that validates incoming requests against defined schemas to ensure data integrity...
// ...and prevent invalid data from being processed
import { validate } from '../middleware/validate.js';

// Import orderIdParams: a schema that defines the expected structure and validation rules for the order ID parameter in the route
// Import paginationQuery: a schema that defines the expected structure and validation rules for the query parameters used for pagination
// Import receiptBody: a schema that defines the expected structure and validation rules for the request body when receiving inventory
// Import shipmentBody: a schema that defines the expected structure and validation rules for the request body when shipping an order
import {
    orderIdParams,
    paginationQuery,
    receiptBody,
    shipmentBody,
} from '../validation/schemas.js';

// This function sends an HTML response with the specified value. 
// It sets the response type to 'html' and sends the provided value as the response body
function html(res, value) {
    res.type('html').send(value);
}

// This function defines the warehouse routes for the application. It takes a warehouseService and a documentService as parameters...
// ...which are responsible for handling the business logic related to warehouse operations and document generation, respectively
export function warehouseRoutes({ warehouseService, documentService }) {
    const router = Router();
    
    router.get('/orders/ready', validate({ query: paginationQuery }), asyncHandler(async (req, res) => {
        const result = await warehouseService.listReady(req.query);
        res.json({ data: result.items, pagination: { ...req.query, total: result.total } });
    }));
    router.get('/orders/:id', validate({ params: orderIdParams }), asyncHandler(async (req, res) => {
        res.json({ data: await warehouseService.getOrder(req.params.id) });
    }));
    
    router.get('/orders/:id/packing-list', validate({ params: orderIdParams }), asyncHandler(async (req, res) => {
        html(res, documentService.packingList(await warehouseService.getPackableOrder(req.params.id)));
    }));
    
    router.get('/orders/:id/invoice', validate({ params: orderIdParams }), asyncHandler(async (req, res) => {
        html(res, documentService.invoice(await warehouseService.getPackableOrder(req.params.id)));
    }));
    
    router.get('/orders/:id/shipping-label', validate({ params: orderIdParams }), asyncHandler(async (req, res) => {
        html(res, documentService.shippingLabel(await warehouseService.getPackableOrder(req.params.id)));
    }));
    
    router.post('/orders/:id/ship', validate({ params: orderIdParams, body: shipmentBody }), asyncHandler(async (req, res) => {
        res.json({ data: await warehouseService.ship(req.params.id, req.body) });
    }));
    
    router.post('/inventory/receipts', validate({ body: receiptBody }), asyncHandler(async (req, res) => {
        res.status(201).json({ data: await warehouseService.receive(req.body) });
    }));
    
    router.get('/inventory/movements', validate({ query: paginationQuery }), asyncHandler(async (req, res) => {
        res.json({ data: await warehouseService.movements(req.query) });
    }));
    
    return router;
}

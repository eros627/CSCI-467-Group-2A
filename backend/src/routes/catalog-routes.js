// This script defines the catalog routes for the application. It includes endpoints for listing catalog items...
// ...and retrieving details of a specific item by its part number. The routes are protected and require appropriate validation and error handling

// Import Router: it allows us to create modular route handlers in Express.js 
import { Router } from 'express';

// Import asyncHandler: a utility function that wraps asynchronous route handlers to catch errors and pass them to the error-handling middleware
import { asyncHandler } from '../lib/async-handler.js';

// Import validate: a middleware function that validates incoming requests against defined schemas to ensure data integrity...
// ...and prevent invalid data from being processed
import { validate } from '../middleware/validate.js';

// Import catalogQuery: a schema that defines the expected structure and validation rules for the query parameters used to list catalog items
// Import partNumberParams: a schema that defines the expected structure and validation rules for the part number parameter in the route
import { catalogQuery, partNumberParams } from '../validation/schemas.js';

/* This function defines the catalog routes for the application. It takes a catalogService as a parameter...
...which is responsible for handling the business logic related to catalog items. The function returns an Express router...
...with defined routes for listing catalog items and retrieving details of a specific item by its part number */
export function catalogRoutes(catalogService) {
    const router = Router();
    
    router.get('/', validate({ query: catalogQuery }), asyncHandler(async (req, res) => {
        const result = await catalogService.list(req.query);
        res.json({ data: result.items, pagination: { ...req.query, total: result.total } });
    }));

    router.get('/:partNumber', validate({ params: partNumberParams }), asyncHandler(async (req, res) => {
        res.json({ data: await catalogService.get(req.params.partNumber) });
    }));
    
    return router;
}

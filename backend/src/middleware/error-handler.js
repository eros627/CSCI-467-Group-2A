// This script provides middleware for Express.js to handle request IDs, not found routes, and error handling
// It generates a unique request ID for each request, handles 404 errors for undefined routes, and normalizes errors for consistent responses 

// Import randomUUID: it allows us to generate a unique identifier for each request 
import { randomUUID } from 'node:crypto';

// Import AppError: it allows us to create custom error objects with a status code, error code, and message
// Import NotFoundError: it allows us to create a specific error object for not found routes
import { AppError, NotFoundError } from '../lib/errors.js';

// Import logger: it allows us to log errors and other information for debugging and monitoring
import { logger } from '../lib/logger.js';

// Middleware to generate a unique request ID for each request and set it in the response headers
export function requestId(req, res, next) {
    req.id = req.get('x-request-id') || randomUUID();
    res.set('x-request-id', req.id);
    next();
}

// Middleware to handle 404 errors for undefined routes
export function notFound(req, _res, next) {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
}

// Middleware to handle errors and normalize them for consistent responses
export function errorHandler(error, req, res, _next) {
    let normalized = error;
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        normalized = new AppError(400, 'INVALID_JSON', 'Request body is not valid JSON');
    }
    
    const status = normalized.status || 500;
    if (status >= 500) {
        logger.error('Request failed', {
            requestId: req.id,
            method: req.method,
            path: req.originalUrl,
            error: normalized.message,
            stack: process.env.NODE_ENV === 'development' ? normalized.stack : undefined,
        });
    }
    
    const body = {
        error: {
            code: normalized.code || 'INTERNAL_ERROR',
            message: normalized.expose === false || (!normalized.status && status >= 500)
                ? 'An unexpected server error occurred'
                : normalized.message,
            requestId: req.id,
        },
    };
    
    if (normalized.details && (status < 500 || normalized.expose || process.env.NODE_ENV === 'development')) {
        body.error.details = normalized.details;
    }
    
    res.status(status).json(body);
}

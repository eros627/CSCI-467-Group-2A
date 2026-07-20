/* This script provides middleware for Express.js to require an API key for access to certain routes. 
It checks the 'x-api-key' header or the 'Authorization' header for a Bearer token and compares it to... 
... the expected API key in a timing-safe manner to prevent timing attacks */

// Import timingSafeEqual: it allows us to compare two buffers in a way that takes the same amount of time...
// ...regardless of how similar they are, which helps prevent timing attacks
import { timingSafeEqual } from 'node:crypto';

// Import AppError: it allows us to create custom error objects with a status code, error code, and message
// Import UnauthorizedError: it allows us to create a specific error object for unauthorized access
import { AppError, UnauthorizedError } from '../lib/errors.js';

// Function to extract the API key from the request headers
function suppliedKey(req) {
    const direct = req.get('x-api-key');
    if (direct) return direct;
    
    const authorization = req.get('authorization');
    
    return authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
}

// Function to create middleware that requires a specific API key for access
export function requireApiKey(expectedKey, role) {
    return function apiKeyMiddleware(req, _res, next) {
        if (!expectedKey) {
            next(new AppError(503, 'AUTH_NOT_CONFIGURED', `${role} API access is not configured`));
            return;
        }
        
        const actual = suppliedKey(req);
        const expectedBuffer = Buffer.from(expectedKey);
        const actualBuffer = Buffer.from(actual);
        const valid = actualBuffer.length === expectedBuffer.length
            && timingSafeEqual(actualBuffer, expectedBuffer);
        
        if (!valid) {
            next(new UnauthorizedError());
            return;
        }
        
        next();
    };
}

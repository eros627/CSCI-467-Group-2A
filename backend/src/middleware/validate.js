// This script provides middleware for Express.js to validate request parameters, query strings, and body content against Zod schemas. 
// It ensures that incoming requests conform to the expected structure and types, throwing a ValidationError if they do not

// Import ValidationError: it allows us to create a specific error object for validation failures
import { ValidationError } from '../lib/errors.js';

// Function to format Zod issues into a more readable structure
function formatIssues(issues) {
    return issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
    }));
}

// Function to create middleware that validates request parameters, query strings, and body content against provided Zod schemas
export function validate(schemas) {
    return function validationMiddleware(req, _res, next) {
        try {
            for (const location of ['params', 'query', 'body']) {
                if (!schemas[location]) continue;
                
                const parsed = schemas[location].parse(req[location]);
                if (location === 'query') {
                    // Express 5 exposes req.query with a prototype getter. An own property
                    // retains Zod coercions/defaults for downstream handlers.
                    Object.defineProperty(req, 'query', {
                        value: parsed,
                        writable: true,
                        configurable: true,
                        enumerable: true,
                    });
                } 
                
                else {
                    req[location] = parsed;
                }
            }
            
            next();
        } 
        
        catch (error) {
            if (error.issues) {
                next(new ValidationError('Request validation failed', formatIssues(error.issues)));
                return;
            }
            
            next(error);
        }
    };
}

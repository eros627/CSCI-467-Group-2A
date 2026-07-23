/* This script defines custom error classes for handling different types of application errors in a structured way. 
 Each error class extends the base `AppError` class, which itself extends the built-in `Error` class. 
The `AppError` class includes properties for HTTP status codes, error codes, messages, and additional details. 
The derived classes represent specific error scenarios such as validation errors, unauthorized access, resource not found...
...conflicts, payment declines, and external service errors */

// Base class for application errors
export class AppError extends Error {
    constructor(status, code, message, details) {
        super(message);
        this.name = this.constructor.name;
        this.status = status;
        this.code = code;
        this.details = details;
        this.expose = status < 500;
    }
}

// Class for validation errors (HTTP 400)
export class ValidationError extends AppError {
    constructor(message, details) {
        super(400, 'VALIDATION_ERROR', message, details);
    }
}

// Class for unauthorized access errors (HTTP 401)
export class UnauthorizedError extends AppError {
    constructor(message = 'A valid API key is required') {
        super(401, 'UNAUTHORIZED', message);
    }
}

// Class for resource not found errors (HTTP 404)
export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(404, 'NOT_FOUND', `${resource} was not found`);
    }
}

// Class for conflict errors (HTTP 409)
export class ConflictError extends AppError {
    constructor(code, message, details) {
        super(409, code, message, details);
    }
}

// Class for payment declined errors (HTTP 402)
export class PaymentDeclinedError extends AppError {
    constructor(message, details) {
        super(402, 'PAYMENT_DECLINED', message, details);
    }
}

// Class for external service errors (HTTP 502)
export class ExternalServiceError extends AppError {
    constructor(service, message = `${service} is unavailable`, details) {
        super(502, 'EXTERNAL_SERVICE_ERROR', message, details);
        this.expose = true;
    }
}

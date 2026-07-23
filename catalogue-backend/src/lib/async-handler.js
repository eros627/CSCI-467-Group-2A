// This function is a higher-order function that takes an asynchronous route handler as an argument...
// ...and returns a new function that wraps the original handler. The wrapper function ensures that...
// ...any errors thrown by the asynchronous handler are caught and passed to the next middleware in the Express.js error handling chain

export function asyncHandler(handler) {
    return function wrappedHandler(req, res, next) {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

// This script provides utility functions for handling monetary values, including converting between dollars and cents...
// ...formatting money, and validating monetary amounts. It also imports a custom ValidationError class for error handling

// Import ValidationError: it allows us to throw a specific error when the monetary amount is invalid...
// ...providing better error handling and debugging capabilities
import { ValidationError } from './errors.js';

// Convert a monetary value in dollars to cents, rounding to the nearest cent
export function toCents(value) {
	const amount = Number(value);
	
	if (!Number.isFinite(amount)) throw new ValidationError('Invalid monetary amount');
  
	return Math.round((amount + Number.EPSILON) * 100);
}

// Convert a monetary value in cents to dollars, rounding to two decimal places
export function fromCents(cents) {
	return Number((cents / 100).toFixed(2));
}

// Format a monetary value to two decimal places, ensuring it is a valid number
export function formatMoney(value) {
	return Number(value).toFixed(2);
}

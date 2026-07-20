/* This script defines validation schemas for various data structures used in the application, such as orders, customers, payments, and shipping rates. 
It uses the Zod library to create these schemas, ensuring that incoming data adheres to the expected formats and constraints. 
The schemas include custom validations for specific fields, such as credit card numbers and expiration dates */

// Import the Zod library for schema validation
import { z } from 'zod';

// Import isFutureExpiration: it allows to validate that the credit card expiration date is in the future and follows the MM/YYYY format
// Import isLuhnValid: it allows to validate that the credit card number passes the Luhn algorithm check for validity
import { isFutureExpiration, isLuhnValid } from '../lib/card.js';

// Define reusable validation schemas for positive integers, monetary values, short text, and dates
const positiveInteger = z.coerce.number().int().positive().max(2147483647);
const money = z.coerce.number().finite().nonnegative().max(9999999999.99);
const shortText = z.string().trim().min(1).max(255);
const date = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
    .refine((value) => {
        const parsed = new Date(`${value}T00:00:00Z`);
        return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value);
    }, 'Expected a real calendar date');


// Define validation schemas for route parameters, query parameters, and request bodies used in the application.
// These schemas ensure that incoming data adheres to the expected formats and constraints, providing robust validation for API endpoints
export const partNumberParams = z.object({ partNumber: positiveInteger });
export const orderIdParams = z.object({ id: z.string().uuid() });

export const catalogQuery = z.object({
    search: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
});

export const customer = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    address: z.object({
        line1: z.string().trim().min(2).max(150),
        line2: z.string().trim().max(150).optional(),
        city: z.string().trim().min(1).max(100),
        state: z.string().trim().min(1).max(100),
        postalCode: z.string().trim().min(2).max(20),
        country: z.string().trim().min(2).max(100).default('US'),
    }),
});

export const payment = z.object({
    cardNumber: z.string().trim().refine(isLuhnValid, 'Invalid card number'),
    expirationDate: z.string().trim().refine(isFutureExpiration, 'Card expiration must be MM/YYYY and not expired'),
    cardholderName: z.string().trim().min(2).max(120),
});

export const createOrderBody = z.object({
    customer,
    items: z.array(z.object({
        partNumber: positiveInteger,
        quantity: z.coerce.number().int().min(1).max(1000),
    })).min(1).max(100
    payment,
});

export const customerOrderQuery = z.object({ email: z.string().trim().email().max(254) });

export const retryPaymentBody = z.object({
    customerEmail: z.string().trim().email().max(254),
    payment,
});

export const paginationQuery = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0),
});

export const receiptBody = z.object({
    partNumber: positiveInteger.optional(),
    description: z.string().trim().min(1).max(50).optional(),
    quantity: z.coerce.number().int().min(1).max(1000000),
    note: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
    if ((value.partNumber === undefined) === (value.description === undefined)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Provide exactly one of partNumber or description',
            path: ['partNumber'],
        });
    }
});

export const shipmentBody = z.object({
    carrier: shortText,
    trackingNumber: z.string().trim().min(2).max(100),
});

export const shippingRatesBody = z.object({
    rates: z.array(z.object({
        minWeight: z.coerce.number().finite().nonnegative().max(99999999),
        maxWeight: z.union([z.coerce.number().finite().positive().max(99999999), z.null()]),
        charge: money,
    })).min(1).max(100),
});

export const orderSearchQuery = paginationQuery.extend({
    dateFrom: date.optional(),
    dateTo: date.optional(),
    status: z.enum(['PENDING_PAYMENT', 'AUTHORIZED', 'PAYMENT_FAILED', 'SHIPPED']).optional(),
    minPrice: money.optional(),
    maxPrice: money.optional(),
}).refine(
    (value) => value.minPrice === undefined || value.maxPrice === undefined || value.minPrice <= value.maxPrice,
    { message: 'minPrice cannot exceed maxPrice', path: ['minPrice'] },
);

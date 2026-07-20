// This script is responsible for sending credit card authorization requests to an external payment service. 
// It uses the fetch API to send HTTP requests and handles timeouts, errors, and response parsing

// Import AppError: it represents application-level errors
// Import ExternalServiceError: it represents errors from external services

import { AppError, ExternalServiceError } from '../lib/errors.js';

// Import formatMoney: it formats a number as a string with two decimal places
import { formatMoney } from '../lib/money.js';

// Import normalizeCardNumber: it normalizes a credit card number by removing non-digit characters
import { normalizeCardNumber } from '../lib/card.js';

// Function to create the payment service with the provided configuration and optional fetch implementation
export function createPaymentService(config, fetchImplementation = globalThis.fetch) {
    return {
        // Function to authorize a credit card transaction
        async authorize({ transactionId, cardNumber, expirationDate, cardholderName, amount }) {
            if (!config.vendorId) {
                throw new AppError(500, 'CONFIGURATION_ERROR', 'PAYMENT_VENDOR_ID is not configured');
            }
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
            
            let response;
            try {
                response = await fetchImplementation(config.url, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        accept: 'application/json, text/plain',
                    },
                    body: JSON.stringify({
                        vendor: config.vendorId,
                        trans: transactionId,
                        cc: normalizeCardNumber(cardNumber),
                        name: cardholderName,
                        exp: expirationDate,
                        amount: formatMoney(amount),
                    }),
                    signal: controller.signal,
                });
            } 
            catch (error) {
                const message = error.name === 'AbortError'
                    ? 'Credit-card authorization timed out'
                    : 'Credit-card authorization service is unavailable';
                throw new ExternalServiceError('Credit-card authorization', message);
            } 
            finally {
                clearTimeout(timeout);
            }
            
            const body = (await response.text()).trim();
            if (!response.ok) {
                throw new ExternalServiceError(
                    'Credit-card authorization',
                    `Credit-card service returned HTTP ${response.status}`,
                );
            }
            
            if (!body) {
                throw new ExternalServiceError('Credit-card authorization', 'Credit-card service returned an empty response');
            }
            
            if (/^error\b/i.test(body)) {
                return { approved: false, message: body.replace(/^error\s*:?\s*/i, '') || 'Card was declined' };
            }
            return { approved: true, authorizationNumber: body };
        },
    };
}

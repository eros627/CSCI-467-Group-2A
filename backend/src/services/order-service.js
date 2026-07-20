/* This script is responsible for handling order creation, payment authorization, and inventory management. 
It ensures that orders are processed correctly, payments are authorized, and inventory is updated accordingly. 
It also handles idempotency to prevent duplicate orders and manages order status transitions */

// Import randomUUID: it allows generating unique identifiers for orders and transactions
import { randomUUID } from 'node:crypto';

// Import ConflictError: it is thrown when there is a conflict in order processing, such as insufficient inventory or invalid order status
// Import NotFoundError: it is thrown when an order or resource is not found
// Import PaymentDeclinedError: it is thrown when a payment authorization is declined
// Import UnauthorizedError: it is thrown when a customer tries to access an order they do not own
// Import ValidationError: it is thrown when there are validation issues with the order data
import {
    ConflictError,
    NotFoundError,
    PaymentDeclinedError,
    UnauthorizedError,
    ValidationError,
} from '../lib/errors.js';

// Import fromCents: it converts an amount in cents to a decimal representation
// Import toCents: it converts a decimal amount to cents
import { fromCents, toCents } from '../lib/money.js';

// Import normalizeCardNumber: it normalizes a credit card number by removing non-digit characters
import { normalizeCardNumber } from '../lib/card.js';

// Function to consolidate items by part number and sum their quantities
function consolidateItems(items) {
    const quantities = new Map();
    for (const item of items) {
        quantities.set(item.partNumber, (quantities.get(item.partNumber) || 0) + item.quantity);
    }
    return [...quantities].map(([partNumber, quantity]) => ({ partNumber, quantity }));
}

// Function to determine shortages for requested items based on available quantities
function shortagesFor(items, quantities) {
    return items
        .filter((item) => (quantities.get(item.partNumber) || 0) < item.quantity)
        .map((item) => ({
            partNumber: item.partNumber,
            requested: item.quantity,
            available: quantities.get(item.partNumber) || 0,
        }));
}

// Function to create the order service with the provided repositories and services
export function createOrderService({
    catalogRepository,
    inventoryRepository,
    shippingRepository,
    orderRepository,
    paymentService,
    emailService,
    withTransaction,
}) {
    // Function to build a priced order by consolidating items, fetching product details, calculating totals, and determining shipping charges
    async function buildPricedOrder({ customer, items, idempotencyKey }) {
        const consolidated = consolidateItems(items);
        const products = await catalogRepository.getByPartNumbers(consolidated.map((item) => item.partNumber));
        const productsByNumber = new Map(products.map((product) => [product.partNumber, product]));
        const missing = consolidated.filter((item) => !productsByNumber.has(item.partNumber));
        
        if (missing.length) {
            throw new ValidationError('One or more part numbers do not exist', {
                partNumbers: missing.map((item) => item.partNumber),
            });
        }
        
        let subtotalCents = 0;
        let totalWeight = 0;
        
        const pricedItems = consolidated.map((item) => {
            const product = productsByNumber.get(item.partNumber);
            const lineCents = toCents(product.price) * item.quantity;
            
            subtotalCents += lineCents;
            totalWeight += product.weight * item.quantity;
            
            return {
                ...item,
                description: product.description,
                unitPrice: fromCents(toCents(product.price)),
                unitWeight: product.weight,
                lineTotal: fromCents(lineCents),
            };
        });
        
        totalWeight = Number(totalWeight.toFixed(4));
        const rate = await shippingRepository.findForWeight(totalWeight);
        
        if (!rate) {
            throw new ValidationError('No shipping bracket is configured for this order weight', { totalWeight });
        }
        
        const shippingCents = toCents(rate.charge);
        const id = randomUUID();
        
        return {
            id,
            idempotencyKey: idempotencyKey || randomUUID(),
            paymentTransactionId: `ORDER-${id}`,
            customer,
            items: pricedItems,
            subtotal: fromCents(subtotalCents),
            shippingCharge: fromCents(shippingCents),
            totalAmount: fromCents(subtotalCents + shippingCents),
            totalWeight,
        };
    }
    
    // Function to reserve a new order by locking inventory quantities, checking for shortages, inserting the order, and decrementing inventory
    async function reserveNewOrder(order) {
        return withTransaction(async (connection) => {
            const quantities = await inventoryRepository.lockQuantities(
                connection,
                order.items.map((item) => item.partNumber),
            );
            
            const shortages = shortagesFor(order.items, quantities);
            if (shortages.length) {
                throw new ConflictError('INSUFFICIENT_INVENTORY', 'Requested quantity is not available', { shortages });
            }
            
            const orderNumber = await orderRepository.insert(connection, order);
            await inventoryRepository.decrement(connection, order.items, order.id);
            return orderNumber;
        });
    }
    
    // Function to release inventory and mark an order as payment failed in case of payment authorization failure
    async function releaseFailedPayment(orderId, message) {
        await withTransaction(async (connection) => {
            const order = await orderRepository.getByIdForUpdate(connection, orderId);
            
            if (!order || order.status !== 'PENDING_PAYMENT') return;
            
            await inventoryRepository.restore(connection, order.items, order.id);
            await orderRepository.markPaymentFailed(connection, order.id, message);
        });
    }
    
    // Function to authorize a reserved order by calling the payment service, handling authorization results, and updating order status
    async function authorizeReservedOrder(order, payment) {
        let result;
        try {
            result = await paymentService.authorize({
                transactionId: order.payment.transactionId,
                cardNumber: payment.cardNumber,
                expirationDate: payment.expirationDate,
                cardholderName: payment.cardholderName,
                amount: order.totalAmount,
            });
        } 
        catch (error) {
            await releaseFailedPayment(order.id, 'Authorization service error; inventory released');
            error.details = { ...(error.details || {}), orderId: order.id };
            throw error;
        }
        
        if (!result.approved) {
            await releaseFailedPayment(order.id, result.message);
            throw new PaymentDeclinedError(result.message, { orderId: order.id });
        }
        
        const cardLast4 = normalizeCardNumber(payment.cardNumber).slice(-4);
        await withTransaction(async (connection) => {
            const current = await orderRepository.getByIdForUpdate(connection, order.id);
            
            if (!current) throw new NotFoundError('Order');
            if (current.status === 'AUTHORIZED') return;
            
            if (current.status !== 'PENDING_PAYMENT') {
                throw new ConflictError('INVALID_ORDER_STATUS', `Cannot authorize an order in ${current.status} status`);
            }
            
            await orderRepository.markAuthorized(connection, order.id, {
                authorizationNumber: result.authorizationNumber,
                cardLast4,
            });
            
            await orderRepository.addEvent(connection, order.id, 'AUTHORIZED', 'Credit card authorized');
        });
        
        const authorized = await orderRepository.getById(order.id);
        await emailService.sendOrderConfirmation(authorized);
        return authorized;
    }
    
    // Return the order service object with methods for creating orders, retrieving orders for customers, and retrying payments
    return {
        // Method to create a new order, handling idempotency, building the priced order, reserving inventory, and authorizing payment
        async create({ customer, items, payment, idempotencyKey }) {
            if (idempotencyKey) {
                const existing = await orderRepository.findByIdempotencyKey(idempotencyKey);
                if (existing) {
                    if (existing.customer.email.toLowerCase() !== customer.email.toLowerCase()) {
                        throw new ConflictError('IDEMPOTENCY_KEY_REUSED', 'Idempotency key was already used');
                    }
                    return { order: existing, replayed: true };
                }
            }
            const proposed = await buildPricedOrder({ customer, items, idempotencyKey });
            try {
                await reserveNewOrder(proposed);
            } 
            catch (error) {
                if (idempotencyKey && error.code === 'ER_DUP_ENTRY') {
                    const existing = await orderRepository.findByIdempotencyKey(idempotencyKey);
                    if (existing) return { order: existing, replayed: true };
                }
                throw error;
            }
            
            const pending = await orderRepository.getById(proposed.id);
            return { order: await authorizeReservedOrder(pending, payment), replayed: false };
        },
        
        // Method to retrieve an order for a specific customer, ensuring the order exists and belongs to the customer
        async getForCustomer(id, email) {
            const order = await orderRepository.getById(id);
            
            if (!order) throw new NotFoundError('Order');
            if (order.customer.email.toLowerCase() !== email.toLowerCase()) throw new UnauthorizedError();
            
            return order;
        },
        
        // Method to retry payment for an order that previously failed, ensuring the order is in the correct status and inventory is available
        async retryPayment(id, customerEmail, payment) {
            const current = await orderRepository.getById(id);
            
            if (!current) throw new NotFoundError('Order');
            if (current.customer.email.toLowerCase() !== customerEmail.toLowerCase()) throw new UnauthorizedError();
            
            if (current.status !== 'PAYMENT_FAILED') {
                throw new ConflictError('INVALID_ORDER_STATUS', `Payment cannot be retried for ${current.status} orders`);
            }
            
            await withTransaction(async (connection) => {
                const locked = await orderRepository.getByIdForUpdate(connection, id);

                if (locked.status !== 'PAYMENT_FAILED') {
                    throw new ConflictError('INVALID_ORDER_STATUS', `Payment cannot be retried for ${locked.status} orders`);
                }
                
                const quantities = await inventoryRepository.lockQuantities(
                    connection,
                    locked.items.map((item) => item.partNumber),
                );
                
                const shortages = shortagesFor(locked.items, quantities);
                if (shortages.length) {
                    throw new ConflictError('INSUFFICIENT_INVENTORY', 'Requested quantity is no longer available', { shortages });
                }
                
                await inventoryRepository.decrement(connection, locked.items, locked.id);
                await orderRepository.resetForPayment(connection, locked.id);
                await orderRepository.setPaymentTransactionId(connection, locked.id, `PAY-${randomUUID()}`);
                await orderRepository.addEvent(connection, locked.id, 'PENDING_PAYMENT', 'Inventory re-reserved for payment retry');
            });

            return authorizeReservedOrder(await orderRepository.getById(id), payment);
        },
    };
}

// This script defines the admin service for managing shipping rates and orders. It includes functions to list and replace shipping rates...
// ...as well as to list and retrieve orders. The service ensures that shipping brackets are validated before being replaced in the repository

// Import NotFoundError: it allows to throw an error when an order is not found in the repository
// Import ValidationError: it allows to throw an error when the shipping brackets are not valid
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';

/* The validateBrackets function checks the validity of the shipping brackets provided. It ensures that there is at least one bracket...
...that the first bracket starts at weight 0, that only the last bracket can have no maximum weight, that each maximum weight is greater than...
...its corresponding minimum weight, and that the brackets are sorted, contiguous, and non-overlapping. If any of these conditions are not met...
...a ValidationError is thrown with an appropriate message */
function validateBrackets(rates) {
    if (rates.length === 0) throw new ValidationError('At least one shipping bracket is required');
    if (rates[0].minWeight !== 0) throw new ValidationError('The first bracket must start at weight 0');
    
    for (let index = 0; index < rates.length; index += 1) {
        const current = rates[index];
        const last = index === rates.length - 1;
        
        if (current.maxWeight === null && !last) {
            throw new ValidationError('Only the final shipping bracket can have no maximum weight');
        }
        
        if (current.maxWeight !== null && current.maxWeight <= current.minWeight) {
            throw new ValidationError('Each maximum weight must be greater than its minimum weight');
        }
        
        if (index > 0 && current.minWeight !== rates[index - 1].maxWeight) {
            throw new ValidationError('Shipping brackets must be sorted, contiguous, and non-overlapping');
        }
    }
    
    if (rates.at(-1).maxWeight !== null) {
        throw new ValidationError('The final shipping bracket must have maxWeight set to null');
    }
}

/* The createAdminService function initializes the admin service with the provided repositories and transaction handler. 
It returns an object containing methods to manage shipping rates and orders. The methods include listing shipping rates...
...replacing shipping rates with validation, listing orders based on filters, and retrieving a specific order by ID with...
...error handling for not found cases */
export function createAdminService({ shippingRepository, orderRepository, withTransaction }) {
    async function shippingMutation(work) {
        try {
            return await withTransaction(work);
        }
        catch (error) {
            if (['23505', '23514'].includes(error.code)) {
                throw new ConflictError('SHIPPING_RATE_CONFLICT', 'Shipping rate conflicts with the existing schedule');
            }
            throw error;
        }
    }

    return {
        // The listShippingRates method retrieves a list of shipping rates from the repository
        listShippingRates() {
            return shippingRepository.list();
        },
        
        // The replaceShippingRates method validates the provided shipping rates and replaces them in the repository within a transaction
        async replaceShippingRates(rates) {
            validateBrackets(rates);
            await withTransaction((connection) => shippingRepository.replace(connection, rates));
            return shippingRepository.list();
        },

        async quoteShipping(weight) {
            const rate = await shippingRepository.findForWeight(weight);
            if (!rate) throw new NotFoundError('Shipping rate for this weight');
            return { weight, charge: rate.charge, rateId: rate.id };
        },

        createShippingRate(rate) {
            return shippingMutation((connection) => shippingRepository.create(connection, rate));
        },

        async updateShippingRate(id, rate) {
            const updated = await shippingMutation((connection) => shippingRepository.update(connection, id, rate));
            if (!updated) throw new NotFoundError('Shipping rate');
            return updated;
        },

        async deleteShippingRate(id) {
            const deleted = await shippingMutation((connection) => shippingRepository.delete(connection, id));
            if (!deleted) throw new NotFoundError('Shipping rate');
            return deleted;
        },
        
        // The listOrders method retrieves a list of orders from the repository based on the provided filters
        listOrders(filters) {
            return orderRepository.list(filters);
        },
        
        // The getOrder method retrieves an order by its ID from the repository. If the order is not found, it throws a NotFoundError
        async getOrder(id) {
            const order = await orderRepository.getById(id);
            if (!order) throw new NotFoundError('Order');
            return order;
        },
    };
}

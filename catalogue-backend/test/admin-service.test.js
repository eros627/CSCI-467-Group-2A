// This script tests the admin service, which is responsible for managing shipping rates and other administrative tasks. 
// It uses Node.js's built-in test module to define test cases and assertions

// Import assert: it allows us to make assertions about the expected outcomes of our tests
import assert from 'node:assert/strict';

// Import test: it allows us to define test cases and organize them into a test suite
import test from 'node:test';

// Import createAdminService: this is the function that creates an instance of the admin service, which we will be testing
import { createAdminService } from '../src/services/admin-service.js';

// Define a helper function to create an instance of the admin service with an in-memory store for shipping rates
function serviceWithStore() {
    let rates = [];
    const shippingRepository = {
        list: async () => rates,
        replace: async (_connection, value) => { rates = value; },
    };
    
    return createAdminService({
        shippingRepository,
        orderRepository: {},
        withTransaction: (work) => work({}),
    });
}

// Test case: admin replaces a complete contiguous shipping-rate schedule
test('admin replaces a complete contiguous shipping-rate schedule', async () => {
    const service = serviceWithStore();
    const rates = [
        { minWeight: 0, maxWeight: 5, charge: 7.95 },
        { minWeight: 5, maxWeight: null, charge: 12.95 },
    ];
    
    assert.deepEqual(await service.replaceShippingRates(rates), rates);
});

// Test case: admin rejects gaps and a bounded final rate
test('admin rejects gaps and a bounded final rate', async () => {
    const service = serviceWithStore();
    
    await assert.rejects(
        service.replaceShippingRates([
            { minWeight: 0, maxWeight: 5, charge: 5 },
            { minWeight: 6, maxWeight: null, charge: 10 },
        ]),
        { code: 'VALIDATION_ERROR' },
    );
    
    await assert.rejects(
        service.replaceShippingRates([{ minWeight: 0, maxWeight: 5, charge: 5 }]),
        { code: 'VALIDATION_ERROR' },
    );
});

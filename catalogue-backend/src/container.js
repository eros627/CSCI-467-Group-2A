// This script is responsible for creating the application container, which holds all the services and repositories used in the application. 
// It also manages the database connection pools and provides a way to close them when the application shuts down

import { createPools, closePools } from './db/pools.js';
import { withTransaction } from './lib/transaction.js';
import { createCatalogRepository } from './repositories/catalog-repository.js';
import { createInventoryRepository } from './repositories/inventory-repository.js';
import { createOrderRepository } from './repositories/order-repository.js';
import { createShippingRepository } from './repositories/shipping-repository.js';
import { createAdminService } from './services/admin-service.js';
import { createCatalogService } from './services/catalog-service.js';
import { documentService } from './services/document-service.js';
import { createEmailService } from './services/email-service.js';
import { createOrderService } from './services/order-service.js';
import { createPaymentService } from './services/payment-service.js';
import { createWarehouseService } from './services/warehouse-service.js';

// The createContainer function initializes the application container with the provided configuration. 
// It sets up database connection pools, repositories, and services, and provides a method to close the pools when the application shuts down
export function createContainer(config) {
    const pools = createPools(config);
    const transaction = (work) => withTransaction(pools.app, work);
    const catalogRepository = createCatalogRepository(pools.legacy);
    const inventoryRepository = createInventoryRepository(pools.app);
    const orderRepository = createOrderRepository(pools.app);
    const shippingRepository = createShippingRepository(pools.app);
    const emailService = createEmailService(config.mail);
    const paymentService = createPaymentService(config.payment);
    
    return {
        pools,
        services: {
            catalogService: createCatalogService({ catalogRepository, inventoryRepository }),
            orderService: createOrderService({
                catalogRepository,
                inventoryRepository,
                shippingRepository,
                orderRepository,
                paymentService,
                emailService,
                withTransaction: transaction,
            }),
            warehouseService: createWarehouseService({
                catalogRepository,
                inventoryRepository,
                orderRepository,
                emailService,
                withTransaction: transaction,
            }),
            adminService: createAdminService({
                shippingRepository,
                orderRepository,
                withTransaction: transaction,
            }),
            documentService,
            healthService: {
                // The readiness method checks the health of the application and legacy databases by executing a simple query on each
                async readiness() {
                    await Promise.all([
                        pools.app.query('SELECT 1'),
                        pools.legacy.query('SELECT 1'),
                    ]);
                    return { status: 'ready', applicationDatabase: 'up', legacyDatabase: 'up' };
                },
            },
        },
        // The close method gracefully closes the database connection pools when the application shuts down
        close: () => closePools(pools),
    };
}

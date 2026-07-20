/* This script defines the warehouse service for managing inventory, orders, and shipments. 
It includes functions to receive products into inventory, list ready orders, retrieve specific orders...
...ship orders, and track recent inventory movements */

// Import ConflictError: it allows to throw an error when there is a conflict in the operation
// Import NotFoundError: it allows to throw an error when an order is not found in the repository
// Import ValidationError: it allows to throw an error when the input data is invalid
import { ConflictError, NotFoundError, ValidationError } from '../lib/errors.js';

// The createWarehouseService function initializes the warehouse service with the provided repositories, email service, and transaction handler
export function createWarehouseService({
    catalogRepository,
    inventoryRepository,
    orderRepository,
    emailService,
    withTransaction,
}) {
    return {
        // The receive method processes the receipt of products into inventory. 
        // It checks for the product by part number or description, validates the input, and updates the inventory accordingly    
        async receive({ partNumber, description, quantity, note }) {
            let product;
            if (partNumber !== undefined) {
                product = await catalogRepository.getByNumber(partNumber);
            } 
            else {
                const matches = await catalogRepository.findByExactDescription(description);
                if (matches.length > 1) {
                    throw new ConflictError(
                        'AMBIGUOUS_PRODUCT_DESCRIPTION',
                        'More than one product has that description; use a part number',
                        { partNumbers: matches.map((item) => item.partNumber) },
                    );
                }
                [product] = matches;
            }

            if (!product) throw new NotFoundError('Product');
            const receipt = await withTransaction((connection) => inventoryRepository.receive(connection, {
                partNumber: product.partNumber,
                quantity,
                note,
            }));
            return { product, quantityReceived: quantity, ...receipt };
        },
        
        // The listReady method retrieves a list of orders that are ready for packing and shipping, filtered by the 'AUTHORIZED' status
        async listReady({ limit, offset }) {
            return orderRepository.list({ status: 'AUTHORIZED', limit, offset });
        },
        
        // The getOrder method retrieves a specific order by its ID from the order repository
        async getOrder(id) {
            const order = await orderRepository.getById(id);
            if (!order) throw new NotFoundError('Order');
            return order;
        },

        // The getPackableOrder method retrieves a specific order by its ID and checks if it is in a status that allows packing and shipping
        async getPackableOrder(id) {
            const order = await orderRepository.getById(id);
            if (!order) throw new NotFoundError('Order');
        
            if (!['AUTHORIZED', 'SHIPPED'].includes(order.status)) {
                throw new ConflictError('INVALID_ORDER_STATUS', 'Documents are available only for authorized or shipped orders');
            }
            return order;
        },

        // The ship method processes the shipment of an order. It checks the order status, marks it as shipped, adds a shipment event...
        // ...and sends a shipment confirmation email to the customer
        async ship(id, shipment) {
            await withTransaction(async (connection) => {
                const order = await orderRepository.getByIdForUpdate(connection, id);
                
                if (!order) throw new NotFoundError('Order');
                if (order.status !== 'AUTHORIZED') {
                    throw new ConflictError('INVALID_ORDER_STATUS', `Only authorized orders can ship; current status is ${order.status}`);
                }         
                const changed = await orderRepository.markShipped(connection, id, shipment);
                
                if (!changed) throw new ConflictError('ORDER_CHANGED', 'Order status changed while shipping');
                await orderRepository.addEvent(
                    connection,
                    id,
                    'SHIPPED',
                    `${shipment.carrier} tracking ${shipment.trackingNumber}`,
                );
            });
            
            const shipped = await orderRepository.getById(id);
            await emailService.sendShipmentConfirmation(shipped);
            return shipped;
        },

        // The movements method retrieves recent inventory movements based on the provided query parameters
        async movements(query) {
            return inventoryRepository.recentMovements(query);
        },
    };
}

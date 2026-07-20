/* This script provides an order repository for managing order data in a database. 
It includes functions to insert orders, retrieve orders by ID or idempotency key, update order status, and list orders with filters. 
The repository uses a connection pool to execute SQL queries and maps database rows to order objects */

// Function to map a database row to an order object
function mapOrder(row) {
    if (!row) return null;
    return {
        id: row.id,
        orderNumber: Number(row.order_number),
        status: row.status,
        customer: {
            name: row.customer_name,
            email: row.customer_email,
            address: {
                line1: row.address_line1,
                line2: row.address_line2,
                city: row.city,
                state: row.state_region,
                postalCode: row.postal_code,
                country: row.country,
            },
        },
        subtotal: Number(row.subtotal),
        shippingCharge: Number(row.shipping_charge),
        totalAmount: Number(row.total_amount),
        totalWeight: Number(row.total_weight),
        payment: {
            transactionId: row.payment_transaction_id,
            authorizationNumber: row.payment_authorization_number,
            cardLast4: row.card_last4,
        },
        shipping: {
            carrier: row.carrier,
            trackingNumber: row.tracking_number,
        },
        createdAt: row.created_at,
        authorizedAt: row.authorized_at,
        shippedAt: row.shipped_at,
    };
}

// Function to map a database row to an order item object
function mapItem(row) {
    return {
        partNumber: Number(row.part_number),
        description: row.description,
        unitPrice: Number(row.unit_price),
        unitWeight: Number(row.unit_weight),
        quantity: Number(row.quantity),
        lineTotal: Number(row.line_total),
    };
}

// Function to create an order repository with methods for managing orders
export function createOrderRepository(pool) {

    // Helper function to retrieve an order by ID from a given executor (connection or pool)
    async function getByIdFrom(executor, id, { forUpdate = false } = {}) {
        const [rows] = await executor.execute(
            `SELECT * FROM orders WHERE id = ?${forUpdate ? ' FOR UPDATE' : ''}`,
            [id],
        );
        
        if (!rows[0]) return null;
        const order = mapOrder(rows[0]);
        const [itemRows] = await executor.execute(
            `SELECT part_number, description, unit_price, unit_weight, quantity, line_total
            FROM order_items WHERE order_id = ? ORDER BY id`,
            [id],
        );
    
        const [eventRows] = await executor.execute(
            `SELECT status, note, created_at FROM order_events WHERE order_id = ? ORDER BY id`,
            [id],
        );
        
        order.items = itemRows.map(mapItem);
        order.events = eventRows.map((row) => ({
            status: row.status,
            note: row.note,
            createdAt: row.created_at,
        }));
        
        return order;
    }

    return {
        // Method to insert a new order into the database, including its items and an initial event
        async insert(connection, order) {
            const [result] = await connection.execute(
                `INSERT INTO orders (
                    id, idempotency_key, status, customer_name, customer_email,
                    address_line1, address_line2, city, state_region, postal_code, country,
                    subtotal, shipping_charge, total_amount, total_weight, payment_transaction_id
                ) VALUES (?, ?, 'PENDING_PAYMENT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    order.id,
                    order.idempotencyKey,
                    order.customer.name,
                    order.customer.email,
                    order.customer.address.line1,
                    order.customer.address.line2 || null,
                    order.customer.address.city,
                    order.customer.address.state,
                    order.customer.address.postalCode,
                    order.customer.address.country,
                    order.subtotal,
                    order.shippingCharge,
                    order.totalAmount,
                    order.totalWeight,
                    order.paymentTransactionId,
                ],
            );
            
            for (const item of order.items) {
                await connection.execute(
                    `INSERT INTO order_items
                    (order_id, part_number, description, unit_price, unit_weight, quantity, line_total)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        order.id,
                        item.partNumber,
                        item.description,
                        item.unitPrice,
                        item.unitWeight,
                        item.quantity,
                        item.lineTotal,
                    ],
                );
            }
            
            await this.addEvent(connection, order.id, 'PENDING_PAYMENT', 'Inventory reserved; awaiting authorization');
            return Number(result.insertId);
        },

        // Method to add an event to an order, recording a status change and an optional note
        async addEvent(connection, orderId, status, note) {
            await connection.execute(
                'INSERT INTO order_events (order_id, status, note) VALUES (?, ?, ?)',
                [orderId, status, note || null],
            );
        },

        // Method to find an order by its idempotency key, returning the order if found or null if not
        async findByIdempotencyKey(idempotencyKey) {
            const [rows] = await pool.execute(
                'SELECT id FROM orders WHERE idempotency_key = ? LIMIT 1',
                [idempotencyKey],
            );
            
            return rows[0] ? getByIdFrom(pool, rows[0].id) : null;
        },

        getById(id) {
            return getByIdFrom(pool, id);
        },

        getByIdForUpdate(connection, id) {
            return getByIdFrom(connection, id, { forUpdate: true });
        },

        // Method to mark an order as authorized, updating its status and recording the authorization details
        async markAuthorized(connection, id, { authorizationNumber, cardLast4 }) {
            const [result] = await connection.execute(
                `UPDATE orders SET status = 'AUTHORIZED', payment_authorization_number = ?,
                card_last4 = ?, authorized_at = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'PENDING_PAYMENT'`,
                [authorizationNumber, cardLast4, id],
            );
            
            return result.affectedRows === 1;
        },

        // Method to mark an order as payment failed, updating its status and recording a note about the failure
        async markPaymentFailed(connection, id, note) {
            const [result] = await connection.execute(
                `UPDATE orders SET status = 'PAYMENT_FAILED'
                WHERE id = ? AND status = 'PENDING_PAYMENT'`,
                [id],
            );
            
            if (result.affectedRows === 1) await this.addEvent(connection, id, 'PAYMENT_FAILED', note);
            return result.affectedRows === 1;
        },

        // Method to reset an order for payment, changing its status back to pending payment if it was previously marked as payment failed
        async resetForPayment(connection, id) {
            const [result] = await connection.execute(
                `UPDATE orders SET status = 'PENDING_PAYMENT'
                WHERE id = ? AND status = 'PAYMENT_FAILED'`,
                [id],
            );
            
            return result.affectedRows === 1;
        },
        
        // Method to set the payment transaction ID for an order, updating the corresponding field in the database
        async setPaymentTransactionId(connection, id, transactionId) {
            await connection.execute(
                'UPDATE orders SET payment_transaction_id = ? WHERE id = ?',
                [transactionId, id],
            );
        },
        
        // Method to mark an order as shipped, updating its status, carrier, tracking number, and shipped timestamp
        async markShipped(connection, id, { carrier, trackingNumber }) {
            const [result] = await connection.execute(
                `UPDATE orders SET status = 'SHIPPED', carrier = ?, tracking_number = ?,
                shipped_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'AUTHORIZED'`,
                [carrier, trackingNumber, id],
            );
            
            return result.affectedRows === 1;
        },

        // Method to list orders with optional filters for date range, status, and price range, returning a paginated result
        async list(filters) {
            const conditions = [];
            const parameters = [];
            
            if (filters.dateFrom) {
                conditions.push('created_at >= ?');
                parameters.push(filters.dateFrom);
            }
            
            if (filters.dateTo) {
                conditions.push('created_at < DATE_ADD(?, INTERVAL 1 DAY)');
                parameters.push(filters.dateTo);
            }
            
            if (filters.status) {
                conditions.push('status = ?');
                parameters.push(filters.status);
            }
            
            if (filters.minPrice !== undefined) {
                conditions.push('total_amount >= ?');
                parameters.push(filters.minPrice);
            }
            
            if (filters.maxPrice !== undefined) {
                conditions.push('total_amount <= ?');
                parameters.push(filters.maxPrice);
            }
            
            const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
            const [rows] = await pool.execute(
                `SELECT * FROM orders ${where} ORDER BY created_at DESC, order_number DESC
                LIMIT ? OFFSET ?`,
                [...parameters, filters.limit, filters.offset],
            );
            
            const [countRows] = await pool.execute(
                `SELECT COUNT(*) AS total FROM orders ${where}`,
                parameters,
            );
            return { items: rows.map(mapOrder), total: Number(countRows[0].total) };
        },
    };
}

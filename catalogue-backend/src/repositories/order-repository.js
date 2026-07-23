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

export function createOrderRepository(pool) {
    async function getByIdFrom(executor, id, { forUpdate = false } = {}) {
        const orderResult = await executor.query(
            `SELECT * FROM orders WHERE id = $1${forUpdate ? ' FOR UPDATE' : ''}`,
            [id],
        );

        if (!orderResult.rows[0]) return null;
        const order = mapOrder(orderResult.rows[0]);
        const itemResult = await executor.query(
            `SELECT part_number, description, unit_price, unit_weight, quantity, line_total
            FROM order_items WHERE order_id = $1 ORDER BY id`,
            [id],
        );
        const eventResult = await executor.query(
            `SELECT status, note, created_at FROM order_events WHERE order_id = $1 ORDER BY id`,
            [id],
        );

        order.items = itemResult.rows.map(mapItem);
        order.events = eventResult.rows.map((row) => ({
            status: row.status,
            note: row.note,
            createdAt: row.created_at,
        }));
        return order;
    }

    return {
        async insert(connection, order) {
            const result = await connection.query(
                `INSERT INTO orders (
                    id, idempotency_key, status, customer_name, customer_email,
                    address_line1, address_line2, city, state_region, postal_code, country,
                    subtotal, shipping_charge, total_amount, total_weight, payment_transaction_id
                ) VALUES ($1, $2, 'PENDING_PAYMENT', $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15)
                RETURNING order_number`,
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
                await connection.query(
                    `INSERT INTO order_items
                    (order_id, part_number, description, unit_price, unit_weight, quantity, line_total)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [order.id, item.partNumber, item.description, item.unitPrice,
                        item.unitWeight, item.quantity, item.lineTotal],
                );
            }

            await this.addEvent(connection, order.id, 'PENDING_PAYMENT', 'Inventory reserved; awaiting authorization');
            return Number(result.rows[0].order_number);
        },

        async addEvent(connection, orderId, status, note) {
            await connection.query(
                'INSERT INTO order_events (order_id, status, note) VALUES ($1, $2, $3)',
                [orderId, status, note || null],
            );
        },

        async findByIdempotencyKey(idempotencyKey) {
            const { rows } = await pool.query(
                'SELECT id FROM orders WHERE idempotency_key = $1 LIMIT 1',
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

        async markAuthorized(connection, id, { authorizationNumber, cardLast4 }) {
            const result = await connection.query(
                `UPDATE orders SET status = 'AUTHORIZED', payment_authorization_number = $1,
                card_last4 = $2, authorized_at = CURRENT_TIMESTAMP
                WHERE id = $3 AND status = 'PENDING_PAYMENT'`,
                [authorizationNumber, cardLast4, id],
            );
            return result.rowCount === 1;
        },

        async markPaymentFailed(connection, id, note) {
            const result = await connection.query(
                `UPDATE orders SET status = 'PAYMENT_FAILED'
                WHERE id = $1 AND status = 'PENDING_PAYMENT'`,
                [id],
            );
            if (result.rowCount === 1) await this.addEvent(connection, id, 'PAYMENT_FAILED', note);
            return result.rowCount === 1;
        },

        async resetForPayment(connection, id) {
            const result = await connection.query(
                `UPDATE orders SET status = 'PENDING_PAYMENT'
                WHERE id = $1 AND status = 'PAYMENT_FAILED'`,
                [id],
            );
            return result.rowCount === 1;
        },

        async setPaymentTransactionId(connection, id, transactionId) {
            await connection.query(
                'UPDATE orders SET payment_transaction_id = $1 WHERE id = $2',
                [transactionId, id],
            );
        },

        async markShipped(connection, id, { carrier, trackingNumber }) {
            const result = await connection.query(
                `UPDATE orders SET status = 'SHIPPED', carrier = $1, tracking_number = $2,
                shipped_at = CURRENT_TIMESTAMP WHERE id = $3 AND status = 'AUTHORIZED'`,
                [carrier, trackingNumber, id],
            );
            return result.rowCount === 1;
        },

        async list(filters) {
            const conditions = [];
            const parameters = [];
            const parameter = (value) => {
                parameters.push(value);
                return `$${parameters.length}`;
            };

            if (filters.dateFrom) conditions.push(`created_at >= ${parameter(filters.dateFrom)}::date`);
            if (filters.dateTo) {
                conditions.push(`created_at < (${parameter(filters.dateTo)}::date + INTERVAL '1 day')`);
            }
            if (filters.status) conditions.push(`status = ${parameter(filters.status)}`);
            if (filters.minPrice !== undefined) conditions.push(`total_amount >= ${parameter(filters.minPrice)}`);
            if (filters.maxPrice !== undefined) conditions.push(`total_amount <= ${parameter(filters.maxPrice)}`);

            const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
            const limit = parameter(filters.limit);
            const offset = parameter(filters.offset);
            const { rows } = await pool.query(
                `SELECT * FROM orders ${where} ORDER BY created_at DESC, order_number DESC
                LIMIT ${limit} OFFSET ${offset}`,
                parameters,
            );

            const countParameters = parameters.slice(0, -2);
            const countResult = await pool.query(
                `SELECT COUNT(*) AS total FROM orders ${where}`,
                countParameters,
            );
            return { items: rows.map(mapOrder), total: Number(countResult.rows[0].total) };
        },
    };
}

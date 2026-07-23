import assert from 'node:assert/strict';
import test from 'node:test';
import { createOrderService } from '../src/services/order-service.js';

const request = {
  customer: {
    name: 'Jane Driver',
    email: 'jane@example.com',
    address: {
      line1: '123 Main St',
      city: 'DeKalb',
      state: 'IL',
      postalCode: '60115',
      country: 'US',
    },
  },
  items: [{ partNumber: 2, quantity: 1 }, { partNumber: 2, quantity: 1 }],
  payment: {
    cardNumber: '4111111111111111',
    expirationDate: '12/2099',
    cardholderName: 'Jane Driver',
  },
  idempotencyKey: 'checkout-123',
};

function fakeEnvironment({ inventory = 5, paymentResult = { approved: true, authorizationNumber: 'AUTH-123' } } = {}) {
  const state = {
    inventory: new Map([[2, inventory]]),
    orders: new Map(),
    paymentCalls: 0,
    paymentResult,
    confirmations: 0,
  };

  const orderRepository = {
    async insert(_connection, value) {
      const stored = {
        id: value.id,
        orderNumber: state.orders.size + 1,
        status: 'PENDING_PAYMENT',
        customer: value.customer,
        items: value.items,
        subtotal: value.subtotal,
        shippingCharge: value.shippingCharge,
        totalAmount: value.totalAmount,
        totalWeight: value.totalWeight,
        payment: {
          transactionId: value.paymentTransactionId,
          authorizationNumber: null,
          cardLast4: null,
        },
        shipping: { carrier: null, trackingNumber: null },
        idempotencyKey: value.idempotencyKey,
        events: [],
        createdAt: new Date().toISOString(),
        authorizedAt: null,
        shippedAt: null,
      };
      state.orders.set(value.id, stored);
      await this.addEvent({}, value.id, 'PENDING_PAYMENT', 'created');
      return stored.orderNumber;
    },
    async addEvent(_connection, id, status, note) {
      state.orders.get(id).events.push({ status, note });
    },
    async findByIdempotencyKey(key) {
      return [...state.orders.values()].find((order) => order.idempotencyKey === key) || null;
    },
    async getById(id) { return state.orders.get(id) || null; },
    async getByIdForUpdate(_connection, id) { return state.orders.get(id) || null; },
    async markAuthorized(_connection, id, result) {
      const order = state.orders.get(id);
      if (order.status !== 'PENDING_PAYMENT') return false;
      order.status = 'AUTHORIZED';
      order.payment.authorizationNumber = result.authorizationNumber;
      order.payment.cardLast4 = result.cardLast4;
      order.authorizedAt = new Date().toISOString();
      return true;
    },
    async markPaymentFailed(_connection, id, note) {
      const order = state.orders.get(id);
      if (order.status !== 'PENDING_PAYMENT') return false;
      order.status = 'PAYMENT_FAILED';
      await this.addEvent({}, id, 'PAYMENT_FAILED', note);
      return true;
    },
    async resetForPayment(_connection, id) {
      state.orders.get(id).status = 'PENDING_PAYMENT';
      return true;
    },
    async setPaymentTransactionId(_connection, id, transactionId) {
      state.orders.get(id).payment.transactionId = transactionId;
    },
  };

  const inventoryRepository = {
    async lockQuantities() { return new Map(state.inventory); },
    async decrement(_connection, items) {
      for (const item of items) state.inventory.set(item.partNumber, state.inventory.get(item.partNumber) - item.quantity);
    },
    async restore(_connection, items) {
      for (const item of items) state.inventory.set(item.partNumber, state.inventory.get(item.partNumber) + item.quantity);
    },
  };

  const service = createOrderService({
    catalogRepository: {
      getByPartNumbers: async () => [{
        partNumber: 2,
        description: 'wiper blade pair',
        price: 23.37,
        weight: 2.5,
        pictureUrl: 'http://example.test/2.jpg',
      }],
    },
    inventoryRepository,
    shippingRepository: { findForWeight: async () => ({ charge: 7.95 }) },
    orderRepository,
    paymentService: {
      async authorize() {
        state.paymentCalls += 1;
        return state.paymentResult;
      },
    },
    emailService: {
      async sendOrderConfirmation() { state.confirmations += 1; },
    },
    withTransaction: (work) => work({}),
  });
  return { service, state };
}

test('checkout consolidates lines, prices server-side, reserves stock, and authorizes', async () => {
  const { service, state } = fakeEnvironment();
  const result = await service.create(request);
  assert.equal(result.replayed, false);
  assert.equal(result.order.status, 'AUTHORIZED');
  assert.equal(result.order.items.length, 1);
  assert.equal(result.order.items[0].quantity, 2);
  assert.equal(result.order.subtotal, 46.74);
  assert.equal(result.order.shippingCharge, 7.95);
  assert.equal(result.order.totalAmount, 54.69);
  assert.equal(state.inventory.get(2), 3);
  assert.equal(result.order.payment.cardLast4, '1111');
  assert.equal(state.confirmations, 1);
});

test('declined checkout records failure and restores reserved stock', async () => {
  const { service, state } = fakeEnvironment({ paymentResult: { approved: false, message: 'declined' } });
  await assert.rejects(service.create(request), { code: 'PAYMENT_DECLINED', status: 402 });
  assert.equal(state.inventory.get(2), 5);
  assert.equal([...state.orders.values()][0].status, 'PAYMENT_FAILED');
  assert.equal(state.confirmations, 0);
});

test('insufficient inventory prevents order creation and payment call', async () => {
  const { service, state } = fakeEnvironment({ inventory: 1 });
  await assert.rejects(service.create(request), { code: 'INSUFFICIENT_INVENTORY', status: 409 });
  assert.equal(state.orders.size, 0);
  assert.equal(state.paymentCalls, 0);
  assert.equal(state.inventory.get(2), 1);
});

test('idempotent replay returns the first order without charging again', async () => {
  const { service, state } = fakeEnvironment();
  const first = await service.create(request);
  const second = await service.create(request);
  assert.equal(second.replayed, true);
  assert.equal(second.order.id, first.order.id);
  assert.equal(state.paymentCalls, 1);
  assert.equal(state.inventory.get(2), 3);
});

test('payment retry re-reserves inventory and uses a new gateway transaction ID', async () => {
  const { service, state } = fakeEnvironment({ paymentResult: { approved: false, message: 'declined' } });
  await assert.rejects(service.create(request), { code: 'PAYMENT_DECLINED' });
  const failed = [...state.orders.values()][0];
  const firstTransactionId = failed.payment.transactionId;
  state.paymentResult = { approved: true, authorizationNumber: 'AUTH-RETRY' };

  const authorized = await service.retryPayment(failed.id, request.customer.email, request.payment);
  assert.equal(authorized.status, 'AUTHORIZED');
  assert.notEqual(authorized.payment.transactionId, firstTransactionId);
  assert.equal(state.inventory.get(2), 3);
  assert.equal(state.paymentCalls, 2);
});

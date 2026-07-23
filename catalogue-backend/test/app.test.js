import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';

function testApp() {
  const product = {
    partNumber: 2,
    description: 'wiper blade pair',
    price: 23.37,
    weight: 2.5,
    pictureUrl: 'http://example.test/2.jpg',
    availableQuantity: 5,
  };
  return createApp({
    config: {
      nodeEnv: 'test',
      trustProxy: false,
      corsOrigin: 'http://localhost:5173',
      auth: { warehouseApiKey: 'warehouse-secret', adminApiKey: 'admin-secret' },
    },
    services: {
      healthService: { readiness: async () => ({ status: 'ready' }) },
      catalogService: {
        list: async () => ({ items: [product], total: 1 }),
        get: async () => product,
      },
      orderService: {
        create: async () => { throw new Error('valid request was not expected in this test'); },
        getForCustomer: async () => null,
        retryPayment: async () => null,
      },
      warehouseService: {
        listReady: async () => ({ items: [], total: 0 }),
        getOrder: async () => null,
        getPackableOrder: async () => null,
        ship: async (id, shipment) => ({ id, status: 'SHIPPED', shipping: shipment }),
        receive: async (receipt) => ({ ...receipt, quantityOnHand: receipt.quantity }),
        movements: async () => [],
      },
      adminService: {
        listShippingRates: async () => [],
        replaceShippingRates: async () => [],
        quoteShipping: async (weight) => ({ weight, charge: 12.95, rateId: 2 }),
        createShippingRate: async (rate) => ({ id: 3, ...rate }),
        updateShippingRate: async (id, rate) => ({ id, ...rate }),
        deleteShippingRate: async (id) => ({ id, minWeight: 20, maxWeight: null, charge: 19.95 }),
        listOrders: async (query) => ({ items: [query], total: 1 }),
        getOrder: async (id) => ({ id, status: 'AUTHORIZED' }),
      },
      documentService: { packingList: () => '', invoice: () => '', shippingLabel: () => '' },
    },
  });
}

test('catalog endpoint returns pagination and attached inventory', async () => {
  const response = await request(testApp()).get('/api/products?limit=10&offset=0').expect(200);
  assert.equal(response.body.data[0].partNumber, 2);
  assert.equal(response.body.data[0].availableQuantity, 5);
  assert.equal(response.body.pagination.total, 1);
});

test('request validation rejects invalid checkout before business services', async () => {
  const response = await request(testApp()).post('/api/orders').send({ items: [] }).expect(400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  assert.ok(response.body.error.details.length > 0);
});

test('warehouse routes require the configured warehouse key', async () => {
  await request(testApp()).get('/api/warehouse/orders/ready').expect(401);
  const response = await request(testApp())
    .get('/api/warehouse/orders/ready')
    .set('x-api-key', 'warehouse-secret')
    .expect(200);
  assert.deepEqual(response.body.data, []);
});

test('integration catalog aliases and shipping quote match the frontend contract', async () => {
  const catalog = await request(testApp()).get('/api/parts').expect(200);
  assert.equal(catalog.body.data[0].partNumber, 2);

  const search = await request(testApp()).get('/api/parts/search?q=wiper&limit=10').expect(200);
  assert.equal(search.body.data[0].partNumber, 2);
  assert.equal(search.body.pagination.search, 'wiper');

  const quote = await request(testApp()).get('/api/shipping-quote?weight=5').expect(200);
  assert.deepEqual(quote.body.data, { weight: 5, charge: 12.95, rateId: 2 });
});

test('shared order routes accept staff keys and normalize integration filters', async () => {
  const response = await request(testApp())
    .get('/api/orders?status=authorized&startDate=2026-07-01&endDate=2026-07-31')
    .set('x-api-key', 'admin-secret')
    .expect(200);

  assert.equal(response.body.data[0].status, 'AUTHORIZED');
  assert.equal(response.body.data[0].dateFrom, '2026-07-01');
  assert.equal(response.body.data[0].dateTo, '2026-07-31');
  assert.equal(response.body.pagination.total, 1);
});

test('direct receiving and fulfillment routes use the warehouse key', async () => {
  const id = '86b43491-7378-47ef-901c-fbb863d5980f';
  const received = await request(testApp())
    .post('/api/inventory/receive')
    .set('x-api-key', 'warehouse-secret')
    .send({ partNumber: 2, quantity: 4 })
    .expect(201);
  assert.equal(received.body.data.quantityOnHand, 4);

  const order = await request(testApp())
    .get(`/api/orders/${id}`)
    .set('x-api-key', 'warehouse-secret')
    .expect(200);
  assert.equal(order.body.data.status, 'AUTHORIZED');

  const shipped = await request(testApp())
    .patch(`/api/orders/${id}`)
    .set('x-api-key', 'warehouse-secret')
    .send({ carrier: 'UPS', trackingNumber: '1Z999' })
    .expect(200);
  assert.equal(shipped.body.data.status, 'SHIPPED');
});

test('shipping rate CRUD routes require the admin key', async () => {
  await request(testApp()).get('/api/shipping-rates').expect(401);
  const created = await request(testApp())
    .post('/api/shipping-rates')
    .set('x-api-key', 'admin-secret')
    .send({ minWeight: 20, maxWeight: null, charge: 19.95 })
    .expect(201);
  assert.equal(created.body.data.id, 3);

  const updated = await request(testApp())
    .put('/api/shipping-rates/3')
    .set('x-api-key', 'admin-secret')
    .send({ minWeight: 20, maxWeight: null, charge: 21.95 })
    .expect(200);
  assert.equal(updated.body.data.charge, 21.95);

  const deleted = await request(testApp())
    .delete('/api/shipping-rates/3')
    .set('x-api-key', 'admin-secret')
    .expect(200);
  assert.equal(deleted.body.data.id, 3);
});

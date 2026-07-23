import assert from 'node:assert/strict';
import test from 'node:test';
import { createPaymentService } from '../src/services/payment-service.js';

const config = {
  url: 'http://payments.test/CreditCard/',
  vendorId: 'VE001-99',
  timeoutMs: 1000,
};

test('payment service sends the exact course gateway field names', async () => {
  let request;
  const service = createPaymentService(config, async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return new Response('AUTH-123', { status: 200 });
  });
  const result = await service.authorize({
    transactionId: 'ORDER-1',
    cardNumber: '4111-1111-1111-1111',
    expirationDate: '12/2099',
    cardholderName: 'Jane Driver',
    amount: 42.5,
  });
  assert.deepEqual(request.body, {
    vendor: 'VE001-99',
    trans: 'ORDER-1',
    cc: '4111111111111111',
    name: 'Jane Driver',
    exp: '12/2099',
    amount: '42.50',
  });
  assert.equal(result.approved, true);
  assert.equal(result.authorizationNumber, 'AUTH-123');
});

test('gateway Error response is a decline, not an authorization number', async () => {
  const service = createPaymentService(config, async () => new Response('Error: invalid card', { status: 200 }));
  const result = await service.authorize({
    transactionId: 'ORDER-2',
    cardNumber: '4111111111111111',
    expirationDate: '12/2099',
    cardholderName: 'Jane Driver',
    amount: 10,
  });
  assert.deepEqual(result, { approved: false, message: 'invalid card' });
});

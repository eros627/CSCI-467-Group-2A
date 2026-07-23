import assert from 'node:assert/strict';
import test from 'node:test';
import { isFutureExpiration, isLuhnValid, normalizeCardNumber } from '../src/lib/card.js';
import { fromCents, toCents } from '../src/lib/money.js';

test('card helpers normalize and validate without retaining formatting', () => {
  assert.equal(normalizeCardNumber('4111-1111 1111-1111'), '4111111111111111');
  assert.equal(isLuhnValid('4111 1111 1111 1111'), true);
  assert.equal(isLuhnValid('4111 1111 1111 1112'), false);
  assert.equal(isFutureExpiration('12/2099', new Date('2026-07-14T00:00:00Z')), true);
  assert.equal(isFutureExpiration('06/2026', new Date('2026-07-14T00:00:00Z')), false);
});

test('money helpers use integer cents at calculation boundaries', () => {
  assert.equal(toCents(10.005), 1001);
  assert.equal(fromCents(1001), 10.01);
});

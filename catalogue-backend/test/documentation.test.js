import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';

test('OpenAPI document is valid YAML with a route contract', async () => {
  const document = parse(await readFile(new URL('../docs/openapi.yaml', import.meta.url), 'utf8'));
  assert.equal(document.openapi, '3.1.0');
  assert.ok(Object.keys(document.paths).length >= 10);
  assert.ok(document.components.schemas.Order);
  for (const path of [
    '/api/parts',
    '/api/parts/search',
    '/api/shipping-quote',
    '/api/inventory/receive',
    '/api/orders',
    '/api/orders/{id}',
    '/api/shipping-rates',
    '/api/shipping-rates/{rateId}',
  ]) {
    assert.ok(document.paths[path], `OpenAPI is missing ${path}`);
  }
});

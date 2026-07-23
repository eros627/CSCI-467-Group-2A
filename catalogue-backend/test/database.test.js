import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config.js';
import { withTransaction } from '../src/lib/transaction.js';

test('database defaults split PostgreSQL application data from the MySQL legacy catalog', () => {
  const names = ['NODE_ENV', 'APP_DB_PORT', 'LEGACY_DB_PORT'];
  const previous = new Map(names.map((name) => [name, process.env[name]]));
  process.env.NODE_ENV = 'test';
  delete process.env.APP_DB_PORT;
  delete process.env.LEGACY_DB_PORT;

  try {
    const config = loadConfig();
    assert.equal(config.appDb.port, 5432);
    assert.equal(config.legacyDb.port, 3306);
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test('PostgreSQL transaction helper commits successful work and releases the client', async () => {
  const statements = [];
  const client = {
    query: async (statement) => { statements.push(statement); },
    release: () => { statements.push('RELEASE'); },
  };
  const result = await withTransaction({ connect: async () => client }, async () => 'done');
  assert.equal(result, 'done');
  assert.deepEqual(statements, ['BEGIN', 'COMMIT', 'RELEASE']);
});

test('PostgreSQL transaction helper rolls back failed work and releases the client', async () => {
  const statements = [];
  const client = {
    query: async (statement) => { statements.push(statement); },
    release: () => { statements.push('RELEASE'); },
  };
  await assert.rejects(
    withTransaction({ connect: async () => client }, async () => { throw new Error('failed'); }),
    /failed/,
  );
  assert.deepEqual(statements, ['BEGIN', 'ROLLBACK', 'RELEASE']);
});

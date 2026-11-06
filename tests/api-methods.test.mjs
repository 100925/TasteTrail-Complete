import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../backend/server.js';

test('read-only API rejects write methods without changing recipes', async () => {
  const server = createServer();

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const before = await (await fetch(`${base}/api/recipes`)).json();

    assert.ok(before.length > 0, 'Catalogue must contain recipes');

    const routes = [
      '/api/recipes',
      `/api/recipes/${before[0].id}`,
    ];

    for (const route of routes) {
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
        const response = await fetch(`${base}${route}`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Unexpected change' }),
        });

        const label = `${method} ${route}`;

        assert.equal(response.status, 405, label);
        assert.equal(response.headers.get('allow'), 'GET, HEAD', label);
        assert.deepEqual(
          await response.json(),
          { message: 'Method not allowed' },
          label,
        );
      }
    }

    const after = await (await fetch(`${base}/api/recipes`)).json();
    assert.deepEqual(after, before, 'Recipes must remain unchanged');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  }
});
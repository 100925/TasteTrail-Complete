import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../backend/server.js';

test('recipe API rejects unsupported methods without changing recipes', async () => {
  const server = createServer();

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const base = `http://127.0.0.1:${server.address().port}`;

    const beforeResponse = await fetch(`${base}/api/recipes`);
    assert.equal(beforeResponse.status, 200);

    const before = await beforeResponse.json();
    assert.ok(Array.isArray(before), 'Catalogue must be an array');
    assert.ok(before.length > 0, 'Catalogue must contain recipes');

    // Only test methods that these routes do not support.
    // Recipe detail routes support PUT and DELETE with authentication.
    const routes = [
      {
        route: '/api/recipes',
        methods: ['PUT', 'PATCH', 'DELETE'],
      },
      {
        route: `/api/recipes/${before[0].id}`,
        methods: ['POST', 'PATCH'],
      },
    ];

    for (const { route, methods } of routes) {
      for (const method of methods) {
        const response = await fetch(`${base}${route}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Unexpected change',
          }),
        });

        const label = `${method} ${route}`;

        assert.equal(response.status, 405, label);

        assert.equal(
          response.headers.get('allow'),
          'GET, HEAD',
          label,
        );

        assert.deepEqual(
          await response.json(),
          { message: 'Method not allowed' },
          label,
        );
      }
    }

    const afterResponse = await fetch(`${base}/api/recipes`);
    assert.equal(afterResponse.status, 200);

    const after = await afterResponse.json();

    assert.deepEqual(
      after,
      before,
      'Recipes must remain unchanged after unsupported requests',
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });

      server.closeAllConnections();
    });
  }
});
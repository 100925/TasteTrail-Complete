import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../backend/server.js';

test('API HEAD requests return headers without a body', async () => {
  const server = createServer();

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const base = `http://127.0.0.1:${server.address().port}`;

    const cases = [
      ['/api/health', 200],
      ['/api/recipes', 200],
      ['/api/recipes/not-a-number', 404],
      ['/api/unknown', 404],
    ];

    for (const [route, expectedStatus] of cases) {
      const response = await fetch(`${base}${route}`, {
        method: 'HEAD',
      });

      assert.equal(response.status, expectedStatus, route);
      assert.match(
        response.headers.get('content-type') ?? '',
        /application\/json/,
        route,
      );
      assert.equal(await response.text(), '', route);
    }
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  }
});
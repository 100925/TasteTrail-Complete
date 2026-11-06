import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../backend/server.js';

test('health GET and HEAD responses prevent caching', async () => {
  const server = createServer();

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const url = `http://127.0.0.1:${server.address().port}/api/health`;

    for (const method of ['GET', 'HEAD']) {
      const response = await fetch(url, { method });

      assert.equal(response.status, 200, method);

      assert.equal(
        response.headers.get('cache-control'),
        'no-store',
        `${method} health response must prevent caching`,
      );

      if (method === 'GET') {
        const body = await response.json();
        assert.equal(body.status, 'ok');
      } else {
        assert.equal(await response.text(), '');
      }
    }
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });

      server.closeAllConnections();
    });
  }
});
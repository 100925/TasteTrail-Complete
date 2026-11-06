import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../backend/server.js';

test('recipe updates and deletes require authentication', async () => {
  const server = createServer();

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const base = `http://127.0.0.1:${server.address().port}`;

    for (const method of ['PUT', 'DELETE']) {
      const response = await fetch(`${base}/api/recipes/1`, {
        method,
      });

      assert.equal(response.status, 401, method);
      assert.deepEqual(
        await response.json(),
        { message: 'Authentication required for this operation' },
        method,
      );
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
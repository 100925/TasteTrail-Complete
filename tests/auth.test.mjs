import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabaseConnection } from '../backend/db/connection.js';
import { runMigrations } from '../backend/db/migrate.js';
import { seedDatabase } from '../backend/db/seed.js';
import {
  createUser,
  authenticateUser,
  findUserById,
  findUserByEmail,
  updateUserProfile
} from '../backend/db/users.js';
import {
  createSessionToken,
  verifySessionToken,
  extractTokenFromHeader
} from '../backend/auth/session.js';
import { createServer } from '../backend/server.js';

test('user repository creates valid users and enforces unique email', () => {
  const db = createDatabaseConnection(':memory:');
  try {
    runMigrations(db);

    const user = createUser(db, {
      email: 'chef@tastetrail.com',
      password: 'ChefPassword123!',
      displayName: 'Chef Antonio',
      bio: 'Loves fresh pasta and aromatic herbs'
    });

    assert.ok(user.id);
    assert.equal(user.email, 'chef@tastetrail.com');
    assert.equal(user.displayName, 'Chef Antonio');
    assert.equal(user.role, 'user');
    assert.equal(user.bio, 'Loves fresh pasta and aromatic herbs');

    // Duplicate email registration should fail
    assert.throws(
      () =>
        createUser(db, {
          email: 'CHEF@tastetrail.com',
          password: 'AnotherPassword123!',
          displayName: 'Duplicate Chef'
        }),
      /already exists/
    );

    // Validation failures
    assert.throws(() => createUser(db, { email: 'bad-email', password: '123' }), /valid email/);
    assert.throws(() => createUser(db, { email: 'good@email.com', password: '123' }), /at least 6 characters/);
    assert.throws(
      () => createUser(db, { email: 'good@email.com', password: 'Password123!', displayName: ' ' }),
      /at least 2 characters/
    );
  } finally {
    db.close();
  }
});

test('user repository authenticates valid credentials and rejects invalid ones', () => {
  const db = createDatabaseConnection(':memory:');
  try {
    runMigrations(db);
    seedDatabase(db);

    // Authenticate seeded admin
    const admin = authenticateUser(db, 'admin@tastetrail.com', 'AdminPassword123!');
    assert.ok(admin);
    assert.equal(admin.role, 'admin');

    // Authenticate seeded demo user
    const demo = authenticateUser(db, 'demo@tastetrail.com', 'DemoPassword123!');
    assert.ok(demo);
    assert.equal(demo.role, 'user');

    // Incorrect password
    assert.equal(authenticateUser(db, 'admin@tastetrail.com', 'WrongPass'), null);

    // Non-existent email
    assert.equal(authenticateUser(db, 'nobody@tastetrail.com', 'AnyPass123!'), null);
  } finally {
    db.close();
  }
});

test('session token signing, verification, tampering, and header extraction', () => {
  const mockUser = { id: 42, email: 'tester@tastetrail.com', role: 'user', displayName: 'Tester' };
  const token = createSessionToken(mockUser);

  assert.ok(typeof token === 'string');
  assert.equal(token.split('.').length, 3);

  const payload = verifySessionToken(token);
  assert.ok(payload);
  assert.equal(payload.userId, 42);
  assert.equal(payload.email, 'tester@tastetrail.com');

  // Header extraction
  assert.equal(extractTokenFromHeader(`Bearer ${token}`), token);
  assert.equal(extractTokenFromHeader('Basic 12345'), null);
  assert.equal(extractTokenFromHeader(null), null);

  // Tampered token rejection
  const tampered = token.slice(0, -4) + 'abcd';
  assert.equal(verifySessionToken(tampered), null);
  assert.equal(verifySessionToken('completely.invalid.token'), null);
  assert.equal(verifySessionToken(''), null);
});

test('HTTP server provides working registration, login, and profile endpoints', async () => {
  const db = createDatabaseConnection(':memory:');
  runMigrations(db);
  seedDatabase(db);

  const server = createServer({ db });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const base = `http://127.0.0.1:${server.address().port}`;

    // 1. Register a new user
    const registerRes = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'baker@tastetrail.com',
        password: 'BakerPassword123!',
        displayName: 'Sourdough Sally',
        bio: 'Artisan sourdough baker'
      })
    });
    assert.equal(registerRes.status, 201);
    const registerData = await registerRes.json();
    assert.ok(registerData.token);
    assert.equal(registerData.user.email, 'baker@tastetrail.com');
    assert.equal(registerData.user.displayName, 'Sourdough Sally');

    const authToken = registerData.token;

    // 2. Reject duplicate registration
    const dupRes = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'baker@tastetrail.com',
        password: 'BakerPassword123!',
        displayName: 'Duplicate Sally'
      })
    });
    assert.equal(dupRes.status, 400);

    // 3. Login with credentials
    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'baker@tastetrail.com',
        password: 'BakerPassword123!'
      })
    });
    assert.equal(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.ok(loginData.token);
    assert.equal(loginData.user.displayName, 'Sourdough Sally');

    // 4. Reject invalid login
    const badLogin = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'baker@tastetrail.com',
        password: 'WrongPassword'
      })
    });
    assert.equal(badLogin.status, 401);

    // 5. Fetch profile using session token
    const meRes = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.user.email, 'baker@tastetrail.com');

    // 6. Profile without token returns 401
    const unauthRes = await fetch(`${base}/api/auth/me`);
    assert.equal(unauthRes.status, 401);

    // 7. Profile with invalid token returns 401
    const invalidTokenRes = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: 'Bearer fake-token-123' }
    });
    assert.equal(invalidTokenRes.status, 401);

    // 8. Logout endpoint
    const logoutRes = await fetch(`${base}/api/auth/logout`, { method: 'POST' });
    assert.equal(logoutRes.status, 200);

    // 9. Method not allowed checks
    const getRegister = await fetch(`${base}/api/auth/register`);
    assert.equal(getRegister.status, 405);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

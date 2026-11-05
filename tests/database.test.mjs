import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabaseConnection } from '../backend/db/connection.js';
import { runMigrations } from '../backend/db/migrate.js';
import { seedDatabase } from '../backend/db/seed.js';
import { hashPassword, verifyPassword } from '../backend/auth/password.js';

test('password hashing generates unique salts and verifies correctly', () => {
  const p1 = hashPassword('MySecretPass123!');
  const p2 = hashPassword('MySecretPass123!');

  assert.notEqual(p1.salt, p2.salt);
  assert.notEqual(p1.hash, p2.hash);

  assert.equal(verifyPassword('MySecretPass123!', p1.hash, p1.salt), true);
  assert.equal(verifyPassword('WrongPassword', p1.hash, p1.salt), false);
  assert.equal(verifyPassword('', p1.hash, p1.salt), false);
});

test('password hashing rejects passwords shorter than 6 characters', () => {
  assert.throws(() => hashPassword('12345'), /at least 6 characters/);
});

test('database migrations apply cleanly to an in-memory SQLite database', () => {
  const db = createDatabaseConnection(':memory:');
  try {
    const appliedFirst = runMigrations(db);
    assert.ok(appliedFirst.includes('001_initial_schema.sql'));

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((r) => r.name);

    assert.ok(tables.includes('users'));
    assert.ok(tables.includes('recipes'));
    assert.ok(tables.includes('recipe_ingredients'));
    assert.ok(tables.includes('recipe_instructions'));
    assert.ok(tables.includes('user_favourites'));
    assert.ok(tables.includes('meal_plans'));
    assert.ok(tables.includes('shopping_items'));
    assert.ok(tables.includes('pantry_items'));
    assert.ok(tables.includes('recipe_reviews'));
    assert.ok(tables.includes('_migrations'));

    // Second run should be idempotent and apply 0 migrations
    const appliedSecond = runMigrations(db);
    assert.equal(appliedSecond.length, 0);
  } finally {
    db.close();
  }
});

test('database enforces foreign key constraints', () => {
  const db = createDatabaseConnection(':memory:');
  try {
    runMigrations(db);

    // Attempting to insert a recipe ingredient with a non-existent recipe_id should fail
    assert.throws(() => {
      db.prepare(
        'INSERT INTO recipe_ingredients (recipe_id, item, raw_text) VALUES (?, ?, ?)'
      ).run(99999, 'Oregano', '1 tsp Oregano');
    });
  } finally {
    db.close();
  }
});

test('seedDatabase populates initial users and curated recipes', () => {
  const db = createDatabaseConnection(':memory:');
  try {
    runMigrations(db);
    const result = seedDatabase(db);

    assert.equal(result.users, 2);
    assert.ok(result.recipes >= 8);

    const admin = db.prepare("SELECT * FROM users WHERE email = 'admin@tastetrail.com'").get();
    assert.ok(admin);
    assert.equal(admin.role, 'admin');
    assert.equal(verifyPassword('AdminPassword123!', admin.password_hash, admin.salt), true);

    const demo = db.prepare("SELECT * FROM users WHERE email = 'demo@tastetrail.com'").get();
    assert.ok(demo);
    assert.equal(demo.role, 'user');
    assert.equal(verifyPassword('DemoPassword123!', demo.password_hash, demo.salt), true);

    const recipe = db.prepare('SELECT * FROM recipes WHERE id = 1').get();
    assert.ok(recipe);
    assert.equal(recipe.is_curated, 1);

    const ingredients = db.prepare('SELECT * FROM recipe_ingredients WHERE recipe_id = 1').all();
    assert.ok(ingredients.length > 0);

    const instructions = db.prepare('SELECT * FROM recipe_instructions WHERE recipe_id = 1').all();
    assert.ok(instructions.length > 0);

    // Re-running seed should not duplicate records
    const repeatResult = seedDatabase(db);
    assert.equal(repeatResult.users, 2);
    assert.equal(repeatResult.recipes, result.recipes);
  } finally {
    db.close();
  }
});

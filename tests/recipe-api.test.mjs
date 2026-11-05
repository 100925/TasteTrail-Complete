import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabaseConnection } from '../backend/db/connection.js';
import { runMigrations } from '../backend/db/migrate.js';
import { seedDatabase } from '../backend/db/seed.js';
import {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  deleteRecipe
} from '../backend/db/recipes.js';
import { createServer } from '../backend/server.js';

test('recipe repository retrieves all recipes with ingredients and instructions', () => {
  const db = createDatabaseConnection(':memory:');
  try {
    runMigrations(db);
    seedDatabase(db);

    const recipes = getAllRecipes(db);
    assert.ok(recipes.length >= 8);

    const first = recipes[0];
    assert.ok(first.id);
    assert.ok(first.title);
    assert.ok(first.cuisine);
    assert.ok(first.diet);
    assert.ok(first.cookingTime > 0);
    assert.ok(Array.isArray(first.ingredients) && first.ingredients.length > 0);
    assert.ok(Array.isArray(first.instructions) && first.instructions.length > 0);
  } finally {
    db.close();
  }
});

test('recipe repository filters by cuisine, diet, difficulty, time, and search', () => {
  const db = createDatabaseConnection(':memory:');
  try {
    runMigrations(db);
    seedDatabase(db);

    const italian = getAllRecipes(db, { cuisine: 'Italian' });
    assert.ok(italian.length > 0);
    assert.ok(italian.every((r) => r.cuisine === 'Italian'));

    const veg = getAllRecipes(db, { diet: 'Veg' });
    assert.ok(veg.length > 0);
    assert.ok(veg.every((r) => r.diet === 'Veg'));

    const easy = getAllRecipes(db, { difficulty: 'Easy' });
    assert.ok(easy.length > 0);
    assert.ok(easy.every((r) => r.difficulty === 'Easy'));

    const quick = getAllRecipes(db, { maxTime: '15' });
    assert.ok(quick.length > 0);
    assert.ok(quick.every((r) => r.cookingTime <= 15));

    const mango = getAllRecipes(db, { search: 'mango' });
    assert.ok(mango.length > 0);
    assert.ok(mango.some((r) => r.title.toLowerCase().includes('mango') || r.ingredients.some((i) => i.toLowerCase().includes('mango'))));

    const sortedByTime = getAllRecipes(db, { sort: 'time' });
    for (let i = 1; i < sortedByTime.length; i++) {
      assert.ok(sortedByTime[i].cookingTime >= sortedByTime[i - 1].cookingTime);
    }
  } finally {
    db.close();
  }
});

test('recipe repository getRecipeById handles valid, non-existent, and invalid IDs', () => {
  const db = createDatabaseConnection(':memory:');
  try {
    runMigrations(db);
    seedDatabase(db);

    const item = getRecipeById(db, 1);
    assert.ok(item);
    assert.equal(item.id, 1);
    assert.ok(item.ingredients.length > 0);
    assert.ok(item.instructions.length > 0);

    assert.equal(getRecipeById(db, 99999), null);
    assert.equal(getRecipeById(db, -5), null);
    assert.equal(getRecipeById(db, 'invalid'), null);
  } finally {
    db.close();
  }
});

test('recipe repository allows recipe creation and deletion', () => {
  const db = createDatabaseConnection(':memory:');
  try {
    runMigrations(db);
    seedDatabase(db);

    const newRecipe = createRecipe(db, {
      title: 'Spicy Garlic Noodles',
      cuisine: 'Asian',
      diet: 'Veg',
      cookingTime: 12,
      difficulty: 'Easy',
      description: 'Quick wok-tossed noodles in chilli garlic oil.',
      ingredients: ['200g egg-free noodles', '4 cloves minced garlic', '2 tbsp soy sauce'],
      instructions: ['Boil noodles until al dente.', 'Sauté garlic in hot oil.', 'Toss noodles in sauce.']
    });

    assert.ok(newRecipe.id);
    assert.equal(newRecipe.title, 'Spicy Garlic Noodles');
    assert.equal(newRecipe.ingredients.length, 3);
    assert.equal(newRecipe.instructions.length, 3);

    // Verify it is found in catalogue search
    const found = getAllRecipes(db, { search: 'Garlic Noodles' });
    assert.ok(found.some((r) => r.id === newRecipe.id));

    // Verify deletion
    const deleted = deleteRecipe(db, newRecipe.id);
    assert.equal(deleted, true);
    assert.equal(getRecipeById(db, newRecipe.id), null);
  } finally {
    db.close();
  }
});

test('recipe repository validates required fields on creation', () => {
  const db = createDatabaseConnection(':memory:');
  try {
    runMigrations(db);

    assert.throws(() => createRecipe(db, {}), /Recipe title is required/);
    assert.throws(() => createRecipe(db, { title: 'Test' }), /Recipe cuisine is required/);
    assert.throws(() => createRecipe(db, { title: 'Test', cuisine: 'Indian' }), /diet type is required/);
    assert.throws(() => createRecipe(db, { title: 'Test', cuisine: 'Indian', diet: 'Veg' }), /Cooking time must be/);
  } finally {
    db.close();
  }
});

test('HTTP server serves database-backed catalogue and handles query filtering', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const base = `http://127.0.0.1:${server.address().port}`;

    // Health check includes database connectivity
    const health = await (await fetch(`${base}/api/health`)).json();
    assert.equal(health.status, 'ok');
    assert.equal(health.database, 'connected');
    assert.ok(health.recipes >= 8);

    // Catalogue endpoint returns database recipes
    const recipes = await (await fetch(`${base}/api/recipes`)).json();
    assert.ok(recipes.length >= 8);
    assert.ok(recipes[0].ingredients.length > 0);

    // Query parameter filtering via API
    const italian = await (await fetch(`${base}/api/recipes?cuisine=Italian`)).json();
    assert.ok(italian.length > 0);
    assert.ok(italian.every((r) => r.cuisine === 'Italian'));

    const quick = await (await fetch(`${base}/api/recipes?maxTime=15`)).json();
    assert.ok(quick.length > 0);
    assert.ok(quick.every((r) => r.cookingTime <= 15));

    // Detail endpoint returns recipe or 404
    const item = await (await fetch(`${base}/api/recipes/1`)).json();
    assert.equal(item.id, 1);
    assert.ok(item.title);

    const notFound = await fetch(`${base}/api/recipes/99999`);
    assert.equal(notFound.status, 404);

    const invalid = await fetch(`${base}/api/recipes/abc`);
    assert.equal(invalid.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

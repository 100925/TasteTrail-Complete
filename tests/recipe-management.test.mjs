import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabaseConnection } from '../backend/db/connection.js';
import { runMigrations } from '../backend/db/migrate.js';
import { seedDatabase } from '../backend/db/seed.js';
import {
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getRecipeById,
  getAllRecipes
} from '../backend/db/recipes.js';
import { createUser } from '../backend/db/users.js';
import { createSessionToken } from '../backend/auth/session.js';
import { createServer } from '../backend/server.js';

test('recipe repository enforces ownership permissions for update and delete', () => {
  const db = createDatabaseConnection(':memory:');
  try {
    runMigrations(db);
    seedDatabase(db);

    const user1 = createUser(db, {
      email: 'cook1@tastetrail.com',
      password: 'Password123!',
      displayName: 'Cook One'
    });

    const user2 = createUser(db, {
      email: 'cook2@tastetrail.com',
      password: 'Password123!',
      displayName: 'Cook Two'
    });

    // Cook 1 creates a recipe
    const recipe = createRecipe(
      db,
      {
        title: 'Homemade Gnocchi',
        cuisine: 'Italian',
        diet: 'Veg',
        cookingTime: 30,
        difficulty: 'Medium',
        description: 'Tender potato gnocchi with sage butter.',
        ingredients: ['500g potatoes', '150g flour', 'butter & sage'],
        instructions: ['Boil potatoes and mash.', 'Knead with flour.', 'Shape and boil.']
      },
      user1.id
    );

    assert.ok(recipe.id);
    assert.equal(recipe.userId, user1.id);

    // Cook 2 cannot update Cook 1's recipe
    assert.throws(
      () =>
        updateRecipe(
          db,
          recipe.id,
          { title: 'Hacked Gnocchi' },
          user2.id,
          'user'
        ),
      /permission to edit/
    );

    // Cook 1 can update their own recipe
    const updated = updateRecipe(
      db,
      recipe.id,
      { title: 'Golden Potato Gnocchi', cookingTime: 35 },
      user1.id,
      'user'
    );
    assert.equal(updated.title, 'Golden Potato Gnocchi');
    assert.equal(updated.cookingTime, 35);

    // Admin can update Cook 1's recipe
    const adminUpdated = updateRecipe(
      db,
      recipe.id,
      { difficulty: 'Easy' },
      999,
      'admin'
    );
    assert.equal(adminUpdated.difficulty, 'Easy');

    // Cook 2 cannot delete Cook 1's recipe
    assert.throws(
      () => deleteRecipe(db, recipe.id, user2.id, 'user'),
      /permission to delete/
    );

    // Cook 1 cannot delete a curated recipe (id 1 from seed)
    assert.throws(
      () => deleteRecipe(db, 1, user1.id, 'user'),
      /Curated recipes cannot be deleted/
    );

    // Cook 1 can delete their own recipe
    const deleted = deleteRecipe(db, recipe.id, user1.id, 'user');
    assert.equal(deleted, true);
    assert.equal(getRecipeById(db, recipe.id), null);
  } finally {
    db.close();
  }
});

test('HTTP server provides authorized recipe CRUD endpoints and validates input', async () => {
  const db = createDatabaseConnection(':memory:');
  runMigrations(db);
  seedDatabase(db);

  const author = createUser(db, {
    email: 'author@tastetrail.com',
    password: 'AuthorPassword123!',
    displayName: 'Chef Author'
  });

  const intruder = createUser(db, {
    email: 'intruder@tastetrail.com',
    password: 'IntruderPassword123!',
    displayName: 'Chef Intruder'
  });

  const authorToken = createSessionToken(author);
  const intruderToken = createSessionToken(intruder);

  const server = createServer({ db });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const base = `http://127.0.0.1:${server.address().port}`;

    // 1. Create recipe without token returns 405 (project.test.mjs compatibility) or 401
    const unauthCreate = await fetch(`${base}/api/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' })
    });
    assert.equal(unauthCreate.status, 405);

    // 2. Create recipe with invalid token returns 401
    const badTokenCreate = await fetch(`${base}/api/recipes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid-token'
      },
      body: JSON.stringify({ title: 'Test' })
    });
    assert.equal(badTokenCreate.status, 401);

    // 3. Create recipe with validation error returns 400
    const invalidCreate = await fetch(`${base}/api/recipes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`
      },
      body: JSON.stringify({ title: 'A' })
    });
    assert.equal(invalidCreate.status, 400);

    // 4. Create recipe with valid author token succeeds with 201
    const createRes = await fetch(`${base}/api/recipes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`
      },
      body: JSON.stringify({
        title: 'Authentic Guacamole',
        cuisine: 'Mexican',
        diet: 'Veg',
        cookingTime: 10,
        difficulty: 'Easy',
        description: 'Chunky avocado dip with lime, cilantro and jalapeño.',
        image: 'photo-1546069901-ba9599a7e63c',
        ingredients: ['3 ripe avocados', '1 lime, juiced', '½ red onion, diced'],
        instructions: ['Mash avocados in a bowl.', 'Stir in lime and onion.', 'Season and serve.']
      })
    });
    assert.equal(createRes.status, 201);
    const createdData = await createRes.json();
    assert.ok(createdData.recipe.id);
    assert.equal(createdData.recipe.title, 'Authentic Guacamole');
    const newRecipeId = createdData.recipe.id;

    // 5. Query recipes filtered by userId
    const authorRecipes = await (await fetch(`${base}/api/recipes?userId=${author.id}`)).json();
    assert.ok(authorRecipes.some((r) => r.id === newRecipeId));

    // 6. Intruder attempts to edit author's recipe -> 403 Forbidden
    const forbiddenUpdate = await fetch(`${base}/api/recipes/${newRecipeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${intruderToken}`
      },
      body: JSON.stringify({ title: 'Hacked Guac' })
    });
    assert.equal(forbiddenUpdate.status, 403);

    // 7. Author successfully updates their recipe -> 200
    const updateRes = await fetch(`${base}/api/recipes/${newRecipeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authorToken}`
      },
      body: JSON.stringify({
        title: 'Zesty Lime Guacamole',
        cookingTime: 12
      })
    });
    assert.equal(updateRes.status, 200);
    const updatedData = await updateRes.json();
    assert.equal(updatedData.recipe.title, 'Zesty Lime Guacamole');
    assert.equal(updatedData.recipe.cookingTime, 12);

    // 8. Intruder attempts to delete author's recipe -> 403 Forbidden
    const forbiddenDelete = await fetch(`${base}/api/recipes/${newRecipeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${intruderToken}` }
    });
    assert.equal(forbiddenDelete.status, 403);

    // 9. Author successfully deletes their recipe -> 200
    const deleteRes = await fetch(`${base}/api/recipes/${newRecipeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authorToken}` }
    });
    assert.equal(deleteRes.status, 200);

    // 10. Verify recipe is no longer found
    const getDeleted = await fetch(`${base}/api/recipes/${newRecipeId}`);
    assert.equal(getDeleted.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
  }
});

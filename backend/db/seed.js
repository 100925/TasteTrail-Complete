import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from '../auth/password.js';

const rootDir = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));

function parseIngredient(raw) {
  // Parse common patterns like "2 tbsp olive oil", "½ tsp salt", "400g spaghetti", "1 ripe mango"
  const trimmed = raw.trim();
  const match = trimmed.match(/^([\d/½¼¾⅓⅔.]+(?:\s*-\s*[\d/½¼¾⅓⅔.]+)?)\s*([a-zA-Z]+)?\s+(.*)$/);
  if (match) {
    let qtyStr = match[1];
    let qty = 1;
    if (qtyStr.includes('½')) qty = 0.5;
    else if (qtyStr.includes('¼')) qty = 0.25;
    else if (qtyStr.includes('¾')) qty = 0.75;
    else if (qtyStr.includes('⅓')) qty = 0.33;
    else if (qtyStr.includes('⅔')) qty = 0.67;
    else {
      const parsed = parseFloat(qtyStr);
      if (!isNaN(parsed)) qty = parsed;
    }
    const unit = match[2] || '';
    const item = match[3] || trimmed;
    return { item, quantity: qty, unit, raw_text: trimmed };
  }
  return { item: trimmed, quantity: 1, unit: 'item', raw_text: trimmed };
}

export function seedDatabase(db) {
  const usersCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get();
  let adminId = 1;

  if (usersCountRow.count === 0) {
    const adminAuth = hashPassword('AdminPassword123!');
    const demoAuth = hashPassword('DemoPassword123!');

    const insertUser = db.prepare(`
      INSERT INTO users (email, password_hash, salt, display_name, role, bio)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION;');
    try {
      const adminRes = insertUser.run(
        'admin@tastetrail.com',
        adminAuth.hash,
        adminAuth.salt,
        'TasteTrail Admin',
        'admin',
        'TasteTrail system administrator & recipe curator'
      );
      adminId = adminRes.lastInsertRowid;

      insertUser.run(
        'demo@tastetrail.com',
        demoAuth.hash,
        demoAuth.salt,
        'Demo Foodie',
        'user',
        'Passionate home cook exploring everyday flavours'
      );
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } else {
    const existingAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    if (existingAdmin) adminId = existingAdmin.id;
  }

  const recipesCountRow = db.prepare('SELECT COUNT(*) as count FROM recipes').get();
  if (recipesCountRow.count === 0) {
    const recipesFilePath = path.join(rootDir, 'src', 'recipes.json');
    if (fs.existsSync(recipesFilePath)) {
      const rawRecipes = JSON.parse(fs.readFileSync(recipesFilePath, 'utf8'));

      const insertRecipe = db.prepare(`
        INSERT INTO recipes (id, title, cuisine, diet, cooking_time, prep_time, difficulty, servings, description, image, user_id, is_curated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);

      const insertIngredient = db.prepare(`
        INSERT INTO recipe_ingredients (recipe_id, item, quantity, unit, raw_text, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const insertInstruction = db.prepare(`
        INSERT INTO recipe_instructions (recipe_id, step_number, instruction)
        VALUES (?, ?, ?)
      `);

      db.exec('BEGIN TRANSACTION;');
      try {
        for (const r of rawRecipes) {
          insertRecipe.run(
            r.id,
            r.title,
            r.cuisine,
            r.diet,
            r.cookingTime,
            10,
            r.difficulty || 'Medium',
            4,
            r.description,
            r.image,
            adminId
          );

          if (Array.isArray(r.ingredients)) {
            r.ingredients.forEach((ing, idx) => {
              const parsed = parseIngredient(ing);
              insertIngredient.run(r.id, parsed.item, parsed.quantity, parsed.unit, parsed.raw_text, idx);
            });
          }

          if (Array.isArray(r.instructions)) {
            r.instructions.forEach((inst, idx) => {
              insertInstruction.run(r.id, idx + 1, inst);
            });
          }
        }
        db.exec('COMMIT;');
      } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
      }
    }
  }

  return {
    users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    recipes: db.prepare('SELECT COUNT(*) as count FROM recipes').get().count
  };
}

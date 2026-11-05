export function validateImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:text/html')) {
    return '';
  }
  return trimmed;
}

export function getAllRecipes(db, filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.cuisine && filters.cuisine !== 'All') {
    conditions.push('cuisine = ?');
    params.push(filters.cuisine);
  }

  if (filters.diet && filters.diet !== 'All') {
    conditions.push('diet = ?');
    params.push(filters.diet);
  }

  if (filters.difficulty && filters.difficulty !== 'All') {
    conditions.push('difficulty = ?');
    params.push(filters.difficulty);
  }

  if (filters.userId) {
    conditions.push('user_id = ?');
    params.push(Number(filters.userId));
  }

  if (filters.maxTime && filters.maxTime !== 'All') {
    const timeNum = Number(filters.maxTime);
    if (!isNaN(timeNum) && timeNum > 0) {
      conditions.push('cooking_time <= ?');
      params.push(timeNum);
    }
  }

  const searchQuery = (filters.search || filters.q || '').trim();
  if (searchQuery) {
    const pattern = `%${searchQuery}%`;
    conditions.push(`(
      title LIKE ? OR 
      description LIKE ? OR 
      cuisine LIKE ? OR 
      diet LIKE ? OR 
      id IN (SELECT recipe_id FROM recipe_ingredients WHERE item LIKE ? OR raw_text LIKE ?)
    )`);
    params.push(pattern, pattern, pattern, pattern, pattern, pattern);
  }

  let sql = 'SELECT * FROM recipes';
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  if (filters.sort === 'time') {
    sql += ' ORDER BY cooking_time ASC, title ASC';
  } else if (filters.sort === 'name') {
    sql += ' ORDER BY title ASC';
  } else if (filters.sort === 'newest') {
    sql += ' ORDER BY created_at DESC, id DESC';
  } else {
    sql += ' ORDER BY id ASC';
  }

  const recipeRows = db.prepare(sql).all(...params);
  if (recipeRows.length === 0) {
    return [];
  }

  const recipeIds = recipeRows.map((r) => r.id);
  const placeholders = recipeIds.map(() => '?').join(',');

  const ingredientRows = db
    .prepare(`SELECT recipe_id, raw_text FROM recipe_ingredients WHERE recipe_id IN (${placeholders}) ORDER BY sort_order ASC`)
    .all(...recipeIds);

  const instructionRows = db
    .prepare(`SELECT recipe_id, instruction FROM recipe_instructions WHERE recipe_id IN (${placeholders}) ORDER BY step_number ASC`)
    .all(...recipeIds);

  const ingredientsByRecipe = new Map();
  for (const ing of ingredientRows) {
    if (!ingredientsByRecipe.has(ing.recipe_id)) {
      ingredientsByRecipe.set(ing.recipe_id, []);
    }
    ingredientsByRecipe.get(ing.recipe_id).push(ing.raw_text);
  }

  const instructionsByRecipe = new Map();
  for (const inst of instructionRows) {
    if (!instructionsByRecipe.has(inst.recipe_id)) {
      instructionsByRecipe.set(inst.recipe_id, []);
    }
    instructionsByRecipe.get(inst.recipe_id).push(inst.instruction);
  }

  return recipeRows.map((r) => ({
    id: r.id,
    title: r.title,
    cuisine: r.cuisine,
    diet: r.diet,
    cookingTime: r.cooking_time,
    prepTime: r.prep_time || 10,
    difficulty: r.difficulty || 'Medium',
    servings: r.servings || 4,
    description: r.description,
    image: r.image || '',
    userId: r.user_id,
    isCurated: Boolean(r.is_curated),
    ingredients: ingredientsByRecipe.get(r.id) || [],
    instructions: instructionsByRecipe.get(r.id) || []
  }));
}

export function getRecipeById(db, id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null;
  }

  const row = db.prepare('SELECT * FROM recipes WHERE id = ?').get(numericId);
  if (!row) {
    return null;
  }

  const ingredients = db
    .prepare('SELECT raw_text FROM recipe_ingredients WHERE recipe_id = ? ORDER BY sort_order ASC')
    .all(numericId)
    .map((i) => i.raw_text);

  const instructions = db
    .prepare('SELECT instruction FROM recipe_instructions WHERE recipe_id = ? ORDER BY step_number ASC')
    .all(numericId)
    .map((i) => i.instruction);

  return {
    id: row.id,
    title: row.title,
    cuisine: row.cuisine,
    diet: row.diet,
    cookingTime: row.cooking_time,
    prepTime: row.prep_time || 10,
    difficulty: row.difficulty || 'Medium',
    servings: row.servings || 4,
    description: row.description,
    image: row.image || '',
    userId: row.user_id,
    isCurated: Boolean(row.is_curated),
    ingredients,
    instructions
  };
}

export function createRecipe(db, data, userId = null) {
  if (!data.title || typeof data.title !== 'string') {
    throw new Error('Recipe title is required');
  }
  if (data.title.trim().length < 2) {
    throw new Error('Recipe title must be at least 2 characters long');
  }
  if (!data.cuisine || typeof data.cuisine !== 'string') {
    throw new Error('Recipe cuisine is required');
  }
  if (!data.diet || typeof data.diet !== 'string') {
    throw new Error('Recipe diet type is required');
  }
  const cookingTime = Number(data.cookingTime || data.cooking_time);
  if (isNaN(cookingTime) || cookingTime <= 0) {
    throw new Error('Cooking time must be a positive number of minutes');
  }
  const ingredients = Array.isArray(data.ingredients) ? data.ingredients.filter((i) => typeof i === 'string' && i.trim()) : [];
  if (ingredients.length === 0) {
    throw new Error('At least one ingredient is required');
  }
  const instructions = Array.isArray(data.instructions) ? data.instructions.filter((i) => typeof i === 'string' && i.trim()) : [];
  if (instructions.length === 0) {
    throw new Error('At least one instruction step is required');
  }

  const image = validateImageUrl(data.image);

  const insertRecipe = db.prepare(`
    INSERT INTO recipes (title, cuisine, diet, cooking_time, prep_time, difficulty, servings, description, image, user_id, is_curated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
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
    const res = insertRecipe.run(
      data.title.trim(),
      data.cuisine.trim(),
      data.diet.trim(),
      cookingTime,
      Number(data.prepTime || 10),
      data.difficulty || 'Medium',
      Number(data.servings || 4),
      data.description ? data.description.trim() : '',
      image,
      userId
    );
    const recipeId = res.lastInsertRowid;

    ingredients.forEach((ing, index) => {
      const text = ing.trim();
      insertIngredient.run(recipeId, text, 1, 'item', text, index);
    });

    instructions.forEach((inst, index) => {
      const text = inst.trim();
      insertInstruction.run(recipeId, index + 1, text);
    });

    db.exec('COMMIT;');
    return getRecipeById(db, recipeId);
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function updateRecipe(db, id, data, userId = null, role = 'user') {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('Invalid recipe ID');
  }

  const existing = db.prepare('SELECT * FROM recipes WHERE id = ?').get(numericId);
  if (!existing) {
    throw new Error('Recipe not found');
  }

  if (role !== 'admin' && existing.user_id !== userId) {
    throw new Error('You do not have permission to edit this recipe');
  }

  if (data.title !== undefined && (!data.title || data.title.trim().length < 2)) {
    throw new Error('Recipe title must be at least 2 characters long');
  }
  const cookingTime = data.cookingTime !== undefined ? Number(data.cookingTime) : existing.cooking_time;
  if (isNaN(cookingTime) || cookingTime <= 0) {
    throw new Error('Cooking time must be a positive number of minutes');
  }

  const title = data.title !== undefined ? data.title.trim() : existing.title;
  const cuisine = data.cuisine !== undefined ? data.cuisine.trim() : existing.cuisine;
  const diet = data.diet !== undefined ? data.diet.trim() : existing.diet;
  const difficulty = data.difficulty !== undefined ? data.difficulty : existing.difficulty;
  const prepTime = data.prepTime !== undefined ? Number(data.prepTime) : existing.prep_time;
  const servings = data.servings !== undefined ? Number(data.servings) : existing.servings;
  const description = data.description !== undefined ? data.description.trim() : existing.description;
  const image = data.image !== undefined ? validateImageUrl(data.image) : existing.image;

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(`
      UPDATE recipes
      SET title = ?, cuisine = ?, diet = ?, cooking_time = ?, prep_time = ?, difficulty = ?, servings = ?, description = ?, image = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(title, cuisine, diet, cookingTime, prepTime, difficulty, servings, description, image, numericId);

    if (Array.isArray(data.ingredients) && data.ingredients.length > 0) {
      db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(numericId);
      const insertIngredient = db.prepare(`
        INSERT INTO recipe_ingredients (recipe_id, item, quantity, unit, raw_text, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      data.ingredients.forEach((ing, index) => {
        const text = String(ing).trim();
        if (text) {
          insertIngredient.run(numericId, text, 1, 'item', text, index);
        }
      });
    }

    if (Array.isArray(data.instructions) && data.instructions.length > 0) {
      db.prepare('DELETE FROM recipe_instructions WHERE recipe_id = ?').run(numericId);
      const insertInstruction = db.prepare(`
        INSERT INTO recipe_instructions (recipe_id, step_number, instruction)
        VALUES (?, ?, ?)
      `);
      data.instructions.forEach((inst, index) => {
        const text = String(inst).trim();
        if (text) {
          insertInstruction.run(numericId, index + 1, text);
        }
      });
    }

    db.exec('COMMIT;');
    return getRecipeById(db, numericId);
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

export function deleteRecipe(db, id, userId = null, role = 'user') {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return false;
  }

  const existing = db.prepare('SELECT * FROM recipes WHERE id = ?').get(numericId);
  if (!existing) {
    return false;
  }

  if (existing.is_curated === 1 && role !== 'admin') {
    throw new Error('Curated recipes cannot be deleted');
  }

  if (role !== 'admin' && existing.user_id !== userId) {
    throw new Error('You do not have permission to delete this recipe');
  }

  const res = db.prepare('DELETE FROM recipes WHERE id = ?').run(numericId);
  return res.changes > 0;
}

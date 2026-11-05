export function normalizeRecipe(recipe) {
  return { id: recipe.id, name: recipe.title, category: recipe.cuisine,
    type: recipe.diet, time: recipe.cookingTime, rating: 'Curated',
    difficulty: recipe.difficulty, image: recipe.image, description: recipe.description,
    ingredients: recipe.ingredients, steps: recipe.instructions };
}
export function filterRecipes(recipes, { query = '', category = 'All', type = 'All', maxTime = 'All', sort = 'default', favourites = null } = {}) {
  const result = recipes.filter((r) => (!favourites || favourites.includes(r.id)) &&
    (category === 'All' || r.category === category) && (type === 'All' || r.type === type) &&
    (maxTime === 'All' || r.time <= Number(maxTime)) &&
    [r.name, r.category, r.type, ...r.ingredients].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  if (sort === 'time') result.sort((a,b) => a.time - b.time);
  if (sort === 'name') result.sort((a,b) => a.name.localeCompare(b.name));
  return result;
}
export function shoppingIngredients(recipes, ids) {
  return [...new Set(recipes.filter((r) => ids.includes(r.id)).flatMap((r) => r.ingredients))].sort();
}

export function normalizeRecipe(recipe) {
  return {
    id: recipe.id,
    name: recipe.title,
    category: recipe.cuisine,
    type: recipe.diet,
    time: recipe.cookingTime,
    rating: 'Curated',
    difficulty: recipe.difficulty,
    image: recipe.image,
    description: recipe.description,
    ingredients: recipe.ingredients,
    steps: recipe.instructions
  };
}

export function filterRecipes(
  recipes,
  {
    query = '',
    category = 'All',
    type = 'All',
    difficulty = 'All',
    maxTime = 'All',
    sort = 'default',
    favourites = null
  } = {}
) {
  const result = recipes.filter((recipe) => {
    const matchesFavourites =
      !favourites || favourites.includes(recipe.id);

    const matchesCategory =
      category === 'All' || recipe.category === category;

    const matchesType =
      type === 'All' || recipe.type === type;

    const matchesDifficulty =
      difficulty === 'All' || recipe.difficulty === difficulty;

    const matchesTime =
      maxTime === 'All' || recipe.time <= Number(maxTime);

    const searchText = [
      recipe.name,
      recipe.category,
      recipe.type,
      ...recipe.ingredients
    ].join(' ').toLowerCase();

    const matchesSearch =
      searchText.includes(query.trim().toLowerCase());

    return (
      matchesFavourites &&
      matchesCategory &&
      matchesType &&
      matchesDifficulty &&
      matchesTime &&
      matchesSearch
    );
  });

  if (sort === 'time') {
    result.sort((a, b) => a.time - b.time);
  }

  if (sort === 'name') {
    result.sort((a, b) => a.name.localeCompare(b.name));
  }

  return result;
}

export function shoppingIngredients(recipes, ids) {
  return [
    ...new Set(
      recipes
        .filter((recipe) => ids.includes(recipe.id))
        .flatMap((recipe) => recipe.ingredients)
    )
  ].sort();
}
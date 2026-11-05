import bundledRecipes from './recipes.json';
import { normalizeRecipe } from './recipe-utils.js';
const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
export async function getRecipes(signal) {
  try {
    const response = await fetch(`${API_BASE_URL}/recipes`, { signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]) });
    if (!response.ok) throw new Error('Recipe server unavailable');
    const data = await response.json();
    if (!Array.isArray(data) || !data.length || data.some((r) => !Number.isInteger(r.id) || !r.title || !r.cuisine || !r.diet || !Array.isArray(r.ingredients) || !Array.isArray(r.instructions) || !r.instructions.length)) throw new Error('Invalid recipe data');
    return { recipes: data.map(normalizeRecipe), offline: false };
  } catch (error) {
    if (signal.aborted) throw error;
    return { recipes: bundledRecipes.map(normalizeRecipe), offline: true };
  }
}

import bundledRecipes from './recipes.json';
import { normalizeRecipe } from './recipe-utils.js';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export async function getRecipes(signal) {
  try {
    const response = await fetch(`${API_BASE_URL}/recipes`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(5000)])
    });
    if (!response.ok) throw new Error('Recipe server unavailable');
    const data = await response.json();
    if (
      !Array.isArray(data) ||
      !data.length ||
      data.some(
        (r) =>
          !Number.isInteger(r.id) ||
          !r.title ||
          !r.cuisine ||
          !r.diet ||
          !Array.isArray(r.ingredients) ||
          !Array.isArray(r.instructions) ||
          !r.instructions.length
      )
    ) {
      throw new Error('Invalid recipe data');
    }
    return { recipes: data.map(normalizeRecipe), offline: false };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { recipes: bundledRecipes.map(normalizeRecipe), offline: true };
  }
}

export async function registerUser(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Registration failed');
  }
  return data;
}

export async function loginUser(payload) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }
  return data;
}

export async function getCurrentUser(token) {
  if (!token) return null;
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.user || null;
}

export async function logoutUser() {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
  } catch {
    // Ignore network failure on logout
  }
}


export async function createRecipeApi(recipeData, token) {
  const response = await fetch(`${API_BASE_URL}/recipes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(recipeData)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to create recipe');
  }
  return normalizeRecipe(data.recipe);
}

export async function updateRecipeApi(id, recipeData, token) {
  const response = await fetch(`${API_BASE_URL}/recipes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(recipeData)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update recipe');
  }
  return normalizeRecipe(data.recipe);
}

export async function deleteRecipeApi(id, token) {
  const response = await fetch(`${API_BASE_URL}/recipes/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete recipe');
  }
  return data;
}

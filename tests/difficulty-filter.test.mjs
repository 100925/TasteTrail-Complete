import test from "node:test";
import assert from "node:assert/strict";
import { filterRecipes } from "../src/recipe-utils.js";

const recipes = [
  {
    id: 1,
    name: "Quick Pasta",
    category: "Italian",
    type: "Veg",
    difficulty: "Easy",
    time: 15,
    ingredients: ["Pasta", "Tomato"]
  },
  {
    id: 2,
    name: "Vegetable Pizza",
    category: "Italian",
    type: "Veg",
    difficulty: "Medium",
    time: 35,
    ingredients: ["Flour", "Tomato"]
  },
  {
    id: 3,
    name: "Chicken Curry",
    category: "Indian",
    type: "Non-Veg",
    difficulty: "Medium",
    time: 45,
    ingredients: ["Chicken", "Onion"]
  }
];

test("Easy difficulty returns only easy recipes", () => {
  const result = filterRecipes(recipes, {
    difficulty: "Easy"
  });

  assert.deepEqual(result.map((recipe) => recipe.id), [1]);
});

test("Medium difficulty returns only medium recipes", () => {
  const result = filterRecipes(recipes, {
    difficulty: "Medium"
  });

  assert.deepEqual(result.map((recipe) => recipe.id), [2, 3]);
});

test("All difficulties returns every recipe", () => {
  const result = filterRecipes(recipes, {
    difficulty: "All"
  });

  assert.deepEqual(result.map((recipe) => recipe.id), [1, 2, 3]);
});

test("Difficulty combines with cuisine and ingredient search", () => {
  const result = filterRecipes(recipes, {
    difficulty: "Medium",
    category: "Italian",
    query: "tomato"
  });

  assert.deepEqual(result.map((recipe) => recipe.id), [2]);
});

test("Difficulty combines with favourites and food type", () => {
  const result = filterRecipes(recipes, {
    difficulty: "Medium",
    favourites: [2, 3],
    type: "Veg"
  });

  assert.deepEqual(result.map((recipe) => recipe.id), [2]);
});

test("Incompatible difficulty and cooking time return no recipes", () => {
  const result = filterRecipes(recipes, {
    difficulty: "Medium",
    maxTime: "15"
  });

  assert.deepEqual(result, []);
});
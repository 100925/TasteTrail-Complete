import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Image, Clock, ChefHat, Sparkles } from 'lucide-react';
import { createRecipeApi, updateRecipeApi } from './api.js';

const CUISINE_OPTIONS = ['Italian', 'Mexican', 'Indian', 'Mediterranean', 'Asian', 'American', 'Healthy', 'Other'];
const DIET_OPTIONS = ['Veg', 'Non-Veg', 'Contains egg'];
const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];

export default function RecipeFormModal({
  isOpen,
  onClose,
  initialRecipe = null,
  token,
  onSaved,
  notify
}) {
  const isEditing = Boolean(initialRecipe?.id);

  const [title, setTitle] = useState('');
  const [cuisine, setCuisine] = useState('Italian');
  const [diet, setDiet] = useState('Veg');
  const [cookingTime, setCookingTime] = useState(25);
  const [difficulty, setDifficulty] = useState('Medium');
  const [servings, setServings] = useState(4);
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState(['']);
  const [instructions, setInstructions] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (initialRecipe) {
        setTitle(initialRecipe.name || initialRecipe.title || '');
        setCuisine(initialRecipe.category || initialRecipe.cuisine || 'Italian');
        setDiet(initialRecipe.type || initialRecipe.diet || 'Veg');
        setCookingTime(initialRecipe.time || initialRecipe.cookingTime || 25);
        setDifficulty(initialRecipe.difficulty || 'Medium');
        setServings(initialRecipe.servings || 4);
        setImage(initialRecipe.image || '');
        setDescription(initialRecipe.description || '');
        setIngredients(
          Array.isArray(initialRecipe.ingredients) && initialRecipe.ingredients.length > 0
            ? [...initialRecipe.ingredients]
            : ['']
        );
        setInstructions(
          Array.isArray(initialRecipe.steps || initialRecipe.instructions) &&
          (initialRecipe.steps || initialRecipe.instructions).length > 0
            ? [...(initialRecipe.steps || initialRecipe.instructions)]
            : ['']
        );
      } else {
        setTitle('');
        setCuisine('Italian');
        setDiet('Veg');
        setCookingTime(25);
        setDifficulty('Medium');
        setServings(4);
        setImage('');
        setDescription('');
        setIngredients(['']);
        setInstructions(['']);
      }
    }
  }, [isOpen, initialRecipe]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function updateIngredient(index, value) {
    setIngredients((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, '']);
  }

  function removeIngredient(index) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function updateInstruction(index, value) {
    setInstructions((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  }

  function addInstruction() {
    setInstructions((prev) => [...prev, '']);
  }

  function removeInstruction(index) {
    setInstructions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const cleanTitle = title.trim();
    if (!cleanTitle || cleanTitle.length < 2) {
      setError('Recipe title must be at least 2 characters long.');
      return;
    }

    const cleanIngredients = ingredients.map((i) => i.trim()).filter(Boolean);
    if (cleanIngredients.length === 0) {
      setError('Please add at least one ingredient.');
      return;
    }

    const cleanInstructions = instructions.map((i) => i.trim()).filter(Boolean);
    if (cleanInstructions.length === 0) {
      setError('Please add at least one cooking step.');
      return;
    }

    const payload = {
      title: cleanTitle,
      cuisine,
      diet,
      cookingTime: Number(cookingTime),
      difficulty,
      servings: Number(servings),
      image: image.trim(),
      description: description.trim(),
      ingredients: cleanIngredients,
      instructions: cleanInstructions
    };

    setLoading(true);
    try {
      if (isEditing) {
        const updated = await updateRecipeApi(initialRecipe.id, payload, token);
        notify(`${updated.name} updated successfully!`);
        onSaved(updated, 'update');
      } else {
        const created = await createRecipeApi(payload, token);
        notify(`${created.name} added to recipes!`);
        onSaved(created, 'create');
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save recipe.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="form-heading">
      <div className="recipe-form-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>

        <h2 id="form-heading" className="auth-title">
          {isEditing ? 'Edit Recipe' : 'Add New Recipe'}
        </h2>
        <p className="auth-subtitle">
          {isEditing
            ? 'Update your recipe ingredients, timing and cooking instructions.'
            : 'Share your favourite dish with the TasteTrail community.'}
        </p>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="recipe-editor-form">
          <div className="form-grid">
            <label className="auth-field full-span">
              <span>Recipe Title *</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Creamy Sun-Dried Tomato Fettuccine"
                required
              />
            </label>

            <label className="auth-field">
              <span>Cuisine</span>
              <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                {CUISINE_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="auth-field">
              <span>Diet Classification</span>
              <select value={diet} onChange={(e) => setDiet(e.target.value)}>
                {DIET_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className="auth-field">
              <span>Cooking Time (minutes)</span>
              <input
                type="number"
                min="1"
                max="600"
                value={cookingTime}
                onChange={(e) => setCookingTime(e.target.value)}
                required
              />
            </label>

            <label className="auth-field">
              <span>Difficulty</span>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                {DIFFICULTY_OPTIONS.map((diff) => (
                  <option key={diff} value={diff}>
                    {diff}
                  </option>
                ))}
              </select>
            </label>

            <label className="auth-field">
              <span>Servings</span>
              <input
                type="number"
                min="1"
                max="50"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
              />
            </label>

            <label className="auth-field">
              <span>Image (Photo ID or URL)</span>
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="e.g. photo-1546069901-ba9599a7e63c"
              />
            </label>
          </div>

          <label className="auth-field">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief summary of what makes this dish delicious..."
              rows={2}
            />
          </label>

          <div className="form-section">
            <div className="section-header-row">
              <h3>Ingredients</h3>
              <button type="button" className="text-button" onClick={addIngredient}>
                <Plus size={14} /> Add Ingredient
              </button>
            </div>
            {ingredients.map((ing, idx) => (
              <div key={idx} className="dynamic-row">
                <input
                  type="text"
                  value={ing}
                  onChange={(e) => updateIngredient(idx, e.target.value)}
                  placeholder={`Ingredient ${idx + 1} (e.g. 2 tbsp olive oil)`}
                />
                {ingredients.length > 1 && (
                  <button
                    type="button"
                    className="icon-remove-btn"
                    onClick={() => removeIngredient(idx)}
                    aria-label={`Remove ingredient ${idx + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="form-section">
            <div className="section-header-row">
              <h3>Cooking Steps</h3>
              <button type="button" className="text-button" onClick={addInstruction}>
                <Plus size={14} /> Add Step
              </button>
            </div>
            {instructions.map((step, idx) => (
              <div key={idx} className="dynamic-row">
                <span className="step-num">{idx + 1}</span>
                <textarea
                  value={step}
                  onChange={(e) => updateInstruction(idx, e.target.value)}
                  placeholder={`Step ${idx + 1} instruction...`}
                  rows={2}
                />
                {instructions.length > 1 && (
                  <button
                    type="button"
                    className="icon-remove-btn"
                    onClick={() => removeInstruction(idx)}
                    aria-label={`Remove step ${idx + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="form-actions-row">
            <button type="button" className="outline-button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Saving…' : isEditing ? 'Update Recipe' : 'Publish Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

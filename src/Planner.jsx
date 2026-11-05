import React, { useEffect, useMemo, useState } from 'react';
import { readObject, writeSaved } from './storage.js';
import { shoppingIngredients } from './recipe-utils.js';
export default function Planner({ recipes, mealPlan, setMealPlan, onOpen, onBrowse, notify }) {
  const [schedule, setSchedule] = useState(() => readObject('tt-schedule'));
  const [checked, setChecked] = useState(() => {
    try { const x = JSON.parse(localStorage.getItem('tt-shopping')); return Array.isArray(x) ? x.filter((s) => typeof s === 'string') : []; } catch { return []; }
  });
  const ingredients = useMemo(() => shoppingIngredients(recipes, mealPlan), [recipes, mealPlan]);
  const planned = recipes.filter((r) => mealPlan.includes(r.id));
  useEffect(() => { if (!writeSaved('tt-schedule', schedule)) notify('Schedule cannot be saved in this browser.'); }, [schedule]);
  useEffect(() => { if (!writeSaved('tt-shopping', checked)) notify('Checklist cannot be saved in this browser.'); }, [checked]);
  function update(id, key, value) { setSchedule((items) => ({ ...items, [id]: { ...items[id], [key]: value } })); }
  function remove(id) {
    setMealPlan((ids) => ids.filter((item) => item !== id));
    setSchedule((items) => { const copy = {...items}; delete copy[id]; return copy; });
  }
  function download() {
    const text = 'TasteTrail shopping checklist\n\n' + ingredients.map((item) => `${checked.includes(item) ? '[x]' : '[ ]'} ${item}`).join('\n');
    const url = URL.createObjectURL(new Blob([text], {type: 'text/plain'}));
    const link = document.createElement('a'); link.href = url; link.download = 'tastetrail-shopping-list.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!planned.length) return <div className="empty-state"><span>🍽️</span><h3>Your meal plan starts here</h3><p>Bookmark a recipe to plan a meal and build your shopping checklist.</p><button className="primary-button" onClick={onBrowse}>Explore recipes</button></div>;
  return <>
    <div className="planner-list">{planned.map((recipe) => <div className="planner-row" key={recipe.id}>
      <img src={recipe.image} alt={recipe.name} onError={(e) => {e.currentTarget.onerror = null; e.currentTarget.src = '/food-placeholder.svg';}} />
      <div className="plan-info"><button className="recipe-title" onClick={() => onOpen(recipe)}>{recipe.name}</button><small>{recipe.category} · {recipe.time} min · {recipe.type}</small></div>
      <label className="plan-field">Date<input aria-label={`Date for ${recipe.name}`} type="date" value={typeof schedule[recipe.id]?.date === 'string' ? schedule[recipe.id].date : ''} onChange={(e) => update(recipe.id, 'date', e.target.value)} /></label>
      <label className="plan-field">Meal<select aria-label={`Meal for ${recipe.name}`} value={schedule[recipe.id]?.meal || 'Dinner'} onChange={(e) => update(recipe.id, 'meal', e.target.value)}>{['Breakfast','Lunch','Dinner','Snack'].map((meal) => <option key={meal}>{meal}</option>)}</select></label>
      <button className="remove-button" aria-label={`Remove ${recipe.name} from planner`} onClick={() => remove(recipe.id)}>Remove</button>
    </div>)}</div>
    <div className="planner-tools"><button className="outline-button" onClick={onBrowse}>Add more meals</button><button className="outline-button" onClick={() => {setMealPlan([]); setSchedule({}); setChecked([]); notify('Meal planner cleared');}}>Clear planner</button></div>
    <section className="shopping-panel"><h2>Shopping <em>checklist.</em></h2><p>Ingredients from your saved meals. Amounts are per recipe; add the amounts together when an ingredient is used in several meals.</p>
      <div className="shopping-grid">{ingredients.map((item) => <label className="ingredient" key={item}><input type="checkbox" checked={checked.includes(item)} onChange={() => setChecked((items) => items.includes(item) ? items.filter((x) => x !== item) : [...items,item])} />{item}</label>)}</div>
      <button className="primary-button" onClick={download}>Download shopping list</button>
    </section>
  </>;
}

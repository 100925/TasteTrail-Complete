import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from '../backend/server.js';
import {filterRecipes, normalizeRecipe, shoppingIngredients} from '../src/recipe-utils.js';
import {readSaved, writeSaved} from '../src/storage.js';
const raw = JSON.parse(await readFile(new URL('../src/recipes.json',import.meta.url)));
const recipes = raw.map(normalizeRecipe);
test('catalogue has unique IDs and complete detail fields', () => {
 assert.equal(new Set(raw.map((r)=>r.id)).size,raw.length);
 for(const r of recipes){assert.ok(r.name && r.category && r.type && r.difficulty);assert.ok(r.time>0);assert.ok(r.ingredients.length && r.steps.length);}
});
test('filters include newly loaded recipes and support ingredients, diet, cuisine and time',()=>{
 assert.equal(filterRecipes([],{}).length,0); assert.equal(filterRecipes(recipes,{}).length,8);
 assert.equal(filterRecipes(recipes,{query:'  MANGO  '})[0].id,8);
 assert.equal(filterRecipes(recipes,{type:'Veg'}).some((r)=>r.id===5),false);
 assert.equal(filterRecipes(recipes,{type:'Contains egg'})[0].id,5);
 assert.equal(filterRecipes(recipes,{category:'Italian'}).length,2);
 assert.ok(filterRecipes(recipes,{maxTime:'15'}).every((r)=>r.time<=15));
 assert.equal(filterRecipes(recipes,{favourites:[7]})[0].id,7);
 assert.equal(filterRecipes(recipes,{sort:'time'})[0].id,8);
 assert.equal(filterRecipes(recipes,{query:'not a dish'}).length,0);
});
test('shopping ingredients are combined and deduplicated',()=>{
 const list=shoppingIngredients(recipes,[1,2]); assert.equal(list.filter((x)=>x==='½ tsp salt, adjust to taste').length,1); assert.deepEqual(shoppingIngredients(recipes,[]),[]);
});
test('storage handles corrupt data, valid persistence and unavailable storage',()=>{
 let value='{}'; globalThis.localStorage={getItem:()=>value,setItem:(_,v)=>{value=v;}};
 assert.deepEqual(readSaved('x'),[]);value='broken';assert.deepEqual(readSaved('x'),[]);
 assert.ok(writeSaved('x',[1,2,2,'3']));assert.deepEqual(readSaved('x'),[1,2]);
 globalThis.localStorage={getItem:()=>{throw Error();},setItem:()=>{throw Error();}};
 assert.deepEqual(readSaved('x'),[]); assert.equal(writeSaved('x',[]),false);
});
test('server supplies catalogue, detail, errors and production website',async()=>{
 const server=createServer(); await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));
 try {const base=`http://127.0.0.1:${server.address().port}`;
 assert.equal((await (await fetch(base+'/api/health')).json()).status,'ok');
 assert.equal((await (await fetch(base+'/api/recipes')).json()).length,8);
 assert.equal((await (await fetch(base+'/api/recipes/1')).json()).id,1);
 assert.equal((await fetch(base+'/api/recipes/999')).status,404);
 assert.equal((await fetch(base+'/api/unknown')).status,404);
 assert.equal((await fetch(base+'/api/recipes',{method:'POST'})).status,405);
 assert.equal((await fetch(base+'/%E0%A4%A')).status,400);
 const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(await page.text(),/TasteTrail/);
 assert.equal((await fetch(base+'/src/App.jsx')).status,404);
 } finally {await new Promise((resolve)=>server.close(resolve));}
});

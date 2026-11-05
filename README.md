# TasteTrail — Recipe Discovery & Meal Planning

A React + Vite website with a lightweight Node.js recipe API. Preserves the original TasteTrail design and completes its discovery, favourites, cooking-guide and personal meal-planning flows.

## Start on Windows / VS Code

1. Extract the ZIP (do not run inside the compressed folder).
2. Open the extracted `tastetrail-frontend` folder in VS Code.
3. Use Node.js 22.12 or newer (your Node 26 also works).
4. Open Terminal → New Terminal and run:

```powershell
npm ci
npm run dev
```

5. Open **http://localhost:5173**. One command starts both the frontend and recipe API.
6. Press Ctrl+C to stop both servers.

The frontend uses port 5173 and the backend uses port 5000. Stop any earlier copies of the project if either port is already occupied. No MongoDB, API key, account or separate backend install is required.

## Run the production build

```powershell
npm run build
npm start
```

Open **http://localhost:5000**. The ZIP includes a verified `dist` build, so `npm start` can also run it directly with Node, even before installing frontend packages. Do not double-click `dist/index.html`; use the server.

## Included features

- Home page, responsive navigation and animated recipe cards.
- Eight curated recipes with quantities, cooking steps and actual difficulty labels.
- Search by dish or ingredient; cuisine and diet filters; maximum cooking time; alphabetical and quickest-first sorting.
- Egg-containing brownies correctly separated from vegetarian dishes.
- Recipe detail dialog with ingredient checkboxes and step-by-step cooking, keyboard focus trapping and Escape to close.
- Favourites saved in this browser, surviving refresh.
- Planner with recipe removal, dates, meal types and a clear action.
- Shopping checklist derived from planned meals, with checkmarks and text-file download. Quantities are per recipe, not automatically summed across dishes.
- Surprise recipe selection.
- Loading, retry and API-unavailable states. A bundled copy of the recipe catalogue keeps discovery usable when the API is unavailable.
- Image fallback, storage-error handling and reduced-motion styling.

## Data and scope

This is a complete local recipe-discovery project, not a multiuser service. Recipes are curated data in `src/recipes.json`; edit that file and rebuild/restart to update the catalogue. The API is read-only. Favourites, schedules and shopping checkmarks are stored in browser localStorage, not a cloud database. Clearing browser data removes them; another browser/device has a separate collection. The same recipe appears once in the planner and can be assigned one date/meal. There is no account login, payment system or shared database.

Food photos and Google Fonts need internet; fallback artwork and system fonts work without them. Initial `npm ci` needs internet. Recipe ratings are labelled “Curated” rather than presenting invented customer reviews.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start frontend and backend together |
| `npm run dev:frontend` | Start only Vite |
| `npm run dev:backend` | Start only the API |
| `npm run build` | Generate `dist` |
| `npm start` | Serve the API and built website on port 5000 |
| `npm run preview` | Preview the build on Vite's preview port, using the bundled recipe fallback |
| `npm test` | Run catalogue, filtering, storage and server checks; build first |

## API

- `GET /api/health` — server status and recipe count.
- `GET /api/recipes` — full recipe catalogue.
- `GET /api/recipes/:id` — recipe detail, or 404.

Development uses Vite's same-origin API proxy. Production serves frontend and API together. The server binds to the local computer by default. `PORT` can change the production port; the default development proxy expects 5000.

## Project structure

```text
src/                 React components, catalogue, filters and browser storage
backend/server.js    Dependency-free Node API and production file server
scripts/dev.mjs      Cross-platform combined development startup
public/              Local fallback artwork
 tests/              Automated checks
vite.config.js       React plugin and API proxy
 dist/               Ready-to-run production website
```

## Changes from the uploaded project

Fixed missing backend dependencies/startup, unused MongoDB connection, missing seed script, hard-coded API fetches, missing recipe memo dependency, unseen errors/loading states, mismatched cuisine filters, egg classification, hard-coded difficulty, invalid stored values, dialog keyboard handling and external-image failure states. Added dated planning, meal types, shopping list, time filters, sorting, tests, pinned dependencies and these setup instructions. Git history and node_modules are intentionally excluded from the distribution.

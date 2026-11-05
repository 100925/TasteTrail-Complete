# Verification — 5 November 2026

## Passed

- Clean frontend dependency installation (`npm ci`).
- Production bundle compilation (`npm run build`).
- Five automated test groups (`npm test`): complete recipe records; search/diet/cuisine/time/favourite filters and sorting; shopping ingredient deduplication; corrupt/unavailable browser storage; live API/production server responses and errors.

## Browser testing limitation

A browser interaction test was prepared, but Chromium could not launch because the execution environment disallows the required process socket. Desktop/mobile visual checks and click-through automation were therefore not completed. Build success does not substitute for these checks.

## Manual acceptance checks

1. Run `npm run dev`; open localhost:5173 and verify eight recipes under Explore.
2. Search `mango`; clear search. Select Italian, Vegetarian, Contains egg, and maximum cooking time filters. Check sorting.
3. Favourite a recipe, reload, and verify it appears in Favourites.
4. Open a recipe; check ingredients, Next/Previous, Tab focus cycling and Escape to close.
5. Bookmark a recipe; open Meal planner, choose a date and meal, check shopping items and download the checklist.
6. Reload and return to Meal planner; confirm the saved fields and checklist.
7. Remove a planned meal and clear the remaining planner.
8. Narrow the browser to 390 px; test mobile navigation and card/planner layout.
9. Stop the API while keeping the frontend running, then reload. Confirm bundled recipes and Retry connection are shown.
10. Restart the API and retry; confirm the connection notice disappears.

## Intentional scope

Local browser persistence; static curated recipes; no user account or cloud synchronization. External photos/fonts need internet. Recipe amounts on shopping lists are per recipe and are not automatically totalled across dishes.

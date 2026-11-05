# Contributing to TasteTrail

## Requirements

- Node.js 22.12 or newer
- npm
- Git

## Run locally

Open a terminal in the folder containing package.json.

Install dependencies:

    npm ci

Start the frontend and backend:

    npm run dev

Open http://localhost:5173.

Press Ctrl+C to stop the application.

## Create a change

Update main before starting:

    git switch main
    git pull origin main

Create a branch with a descriptive name:

    git switch -c feature/your-change

Keep each pull request focused on one useful improvement.

## Verify changes

For application changes, run:

    npm run build
    npm test

Build before running tests because the server tests use the built website.

Check affected features in the browser.
For documentation changes, preview the Markdown and verify links.

Report only the checks you actually completed.

## Files to exclude

Do not commit:
- node_modules or dist
- .env files
- Passwords, access tokens or other secrets
- Personal information in screenshots

## Submit a pull request

1. Review your changes using git diff.
2. Commit with a descriptive message.
3. Push your branch.
4. Open a pull request targeting main.
5. Explain the change and how you verified it.
6. Wait for automated checks and review before merging.

Use a merge commit for this project's history requirements.

## After merging

Return to main and download the merged changes:

    git switch main
    git pull origin main
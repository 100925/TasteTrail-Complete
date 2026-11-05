# Windows Startup Troubleshooting

## npm cannot find package.json or package-lock.json

Make sure the terminal is inside the project folder, not the outer ZIP extraction folder.

For the default Downloads location:

    cd "C:\Users\DELL\Downloads\TasteTrail-Complete\tastetrail-frontend"

Check that the project files exist:

    dir package.json
    dir package-lock.json

Install dependencies:

    npm ci

After installation succeeds, start the application:

    npm run dev

Open http://localhost:5173.

## Port is already in use

An earlier copy of the application may still be running.

Go to its terminal and press Ctrl+C, then run npm run dev again.
The frontend uses port 5173 and the backend uses port 5000.

## Recipes use the bundled collection

The recipe API may be unavailable.

Stop the application with Ctrl+C and restart it with npm run dev.
Check the terminal for backend errors, then click Retry connection.

## Stop the application

Press Ctrl+C in the terminal running npm run dev.
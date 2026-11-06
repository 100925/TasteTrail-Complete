import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  initDatabase,
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  createUser,
  authenticateUser,
  findUserById
} from './db/index.js';
import {
  createSessionToken,
  verifySessionToken,
  extractTokenFromHeader
} from './auth/session.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const rawRecipes = JSON.parse(await readFile(path.join(root, 'src/recipes.json'), 'utf8'));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2'
};

function parseJsonBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        return resolve({});
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function getSessionUser(req) {
  const token = extractTokenFromHeader(req.headers.authorization);
  if (!token) return null;
  return verifySessionToken(token);
}

export function createServer(options = {}) {
  let db = null;
  try {
    const init = initDatabase(options);
    db = init.db;
  } catch (err) {
    console.error('Database initialization notice:', err.message);
  }

  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    function json(status, body) {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    }

    let urlObj;
    try {
      urlObj = new URL(req.url, 'http://localhost');
    } catch {
      return json(400, { message: 'Invalid URL' });
    }

    let pathname;
    try {
      pathname = decodeURIComponent(urlObj.pathname);
    } catch {
      return json(400, { message: 'Invalid URL' });
    }

    // Auth Routes
    if (pathname === '/api/auth/register') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return json(405, { message: 'Method not allowed' });
      }
      if (!db) {
        return json(503, { message: 'Database service unavailable' });
      }
      let body;
      try {
        body = await parseJsonBody(req);
      } catch (err) {
        return json(400, { message: err.message });
      }

      try {
        const user = createUser(db, {
          email: body.email,
          password: body.password,
          displayName: body.displayName,
          bio: body.bio
        });
        const token = createSessionToken(user);
        return json(201, {
          message: 'Account created successfully',
          user,
          token
        });
      } catch (err) {
        return json(400, { message: err.message });
      }
    }

    if (pathname === '/api/auth/login') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return json(405, { message: 'Method not allowed' });
      }
      if (!db) {
        return json(503, { message: 'Database service unavailable' });
      }
      let body;
      try {
        body = await parseJsonBody(req);
      } catch (err) {
        return json(400, { message: err.message });
      }

      const user = authenticateUser(db, body.email, body.password);
      if (!user) {
        return json(401, { message: 'Invalid email or password' });
      }

      const token = createSessionToken(user);
      return json(200, {
        message: 'Signed in successfully',
        user,
        token
      });
    }

    if (pathname === '/api/auth/me') {
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.setHeader('Allow', 'GET, HEAD');
        return json(405, { message: 'Method not allowed' });
      }
      if (!db) {
        return json(503, { message: 'Database service unavailable' });
      }

      const session = getSessionUser(req);
      if (!session) {
        return json(401, { message: 'Missing, invalid or expired authorization token' });
      }

      const user = findUserById(db, session.userId);
      if (!user) {
        return json(404, { message: 'User account no longer exists' });
      }

      return json(200, { user });
    }

    if (pathname === '/api/auth/logout') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return json(405, { message: 'Method not allowed' });
      }
      return json(200, { message: 'Signed out successfully' });
    }

    // Recipe CRUD endpoints
    if (pathname === '/api/recipes' && req.method === 'POST') {
      if (!req.headers.authorization) {
        res.setHeader('Allow', 'GET, HEAD');
        return json(405, { message: 'Method not allowed' });
      }
      if (!db) {
        return json(503, { message: 'Database service unavailable' });
      }

      const session = getSessionUser(req);
      if (!session) {
        return json(401, { message: 'Valid authorization required to create recipes' });
      }

      let body;
      try {
        body = await parseJsonBody(req);
      } catch (err) {
        return json(400, { message: err.message });
      }

      try {
        const newRecipe = createRecipe(db, body, session.userId);
        return json(201, {
          message: 'Recipe created successfully',
          recipe: newRecipe
        });
      } catch (err) {
        return json(400, { message: err.message });
      }
    }

    if (pathname.startsWith('/api/recipes/') && (req.method === 'PUT' || req.method === 'DELETE')) {
      const idStr = pathname.slice('/api/recipes/'.length);
      if (!/^\d+$/.test(idStr)) {
        return json(404, { message: 'Recipe not found' });
      }
      const id = Number(idStr);

      if (!db) {
        return json(503, { message: 'Database service unavailable' });
      }

      const session = getSessionUser(req);
      if (!session) {
        return json(401, { message: 'Authentication required for this operation' });
      }

      if (req.method === 'PUT') {
        let body;
        try {
          body = await parseJsonBody(req);
        } catch (err) {
          return json(400, { message: err.message });
        }

        try {
          const updated = updateRecipe(db, id, body, session.userId, session.role);
          return json(200, {
            message: 'Recipe updated successfully',
            recipe: updated
          });
        } catch (err) {
          if (err.message === 'Recipe not found') {
            return json(404, { message: err.message });
          }
          if (err.message.includes('permission')) {
            return json(403, { message: err.message });
          }
          return json(400, { message: err.message });
        }
      }

      if (req.method === 'DELETE') {
        try {
          const success = deleteRecipe(db, id, session.userId, session.role);
          if (!success) {
            return json(404, { message: 'Recipe not found' });
          }
          return json(200, { message: 'Recipe deleted successfully' });
        } catch (err) {
          if (err.message.includes('permission') || err.message.includes('Curated')) {
            return json(403, { message: err.message });
          }
          return json(400, { message: err.message });
        }
      }
    }

    // Read-only catalog routes and static assets require GET / HEAD
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      return json(405, { message: 'Method not allowed' });
    }

    if (pathname === '/api/health') {
      res.setHeader('Cache-Control', 'no-store');
      let dbStatus = 'disconnected';
      let count = rawRecipes.length;
      if (db) {
        try {
          const row = db.prepare('SELECT COUNT(*) as count FROM recipes').get();
          if (row) {
            count = row.count;
            dbStatus = 'connected';
          }
        } catch {
          dbStatus = 'error';
        }
      }
      return json(200, { status: 'ok', recipes: count, database: dbStatus });
    }

    if (pathname === '/api/recipes') {
      if (db) {
        try {
          const filters = {
            cuisine: urlObj.searchParams.get('cuisine') || 'All',
            diet: urlObj.searchParams.get('diet') || 'All',
            difficulty: urlObj.searchParams.get('difficulty') || 'All',
            maxTime: urlObj.searchParams.get('maxTime') || 'All',
            userId: urlObj.searchParams.get('userId') || null,
            search: urlObj.searchParams.get('q') || urlObj.searchParams.get('search') || '',
            sort: urlObj.searchParams.get('sort') || 'default'
          };
          const recipes = getAllRecipes(db, filters);
          return json(200, recipes);
        } catch (error) {
          console.error('Recipe retrieval error:', error.message);
        }
      }
      return json(200, rawRecipes);
    }

    if (pathname.startsWith('/api/recipes/')) {
      const idStr = pathname.slice('/api/recipes/'.length);
      if (!/^\d+$/.test(idStr)) {
        return json(404, { message: 'Recipe not found' });
      }
      const id = Number(idStr);

      if (db) {
        try {
          const item = getRecipeById(db, id);
          if (item) {
            return json(200, item);
          }
          return json(404, { message: 'Recipe not found' });
        } catch (error) {
          console.error('Recipe detail lookup error:', error.message);
        }
      }

      const fallbackItem = rawRecipes.find((r) => r.id === id);
      return fallbackItem ? json(200, fallbackItem) : json(404, { message: 'Recipe not found' });
    }

    if (pathname.startsWith('/api/')) {
      return json(404, { message: 'API route not found' });
    }

    const dist = path.join(root, 'dist');
    const target = path.resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(dist + path.sep)) {
      return json(403, { message: 'Forbidden' });
    }

    try {
      const content = await readFile(target);
      res.writeHead(200, {
        'Content-Type': types[path.extname(target)] || 'application/octet-stream'
      });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch {
      return json(404, {
        message:
          'File not found. Run npm run build to serve the website here; during development use http://localhost:5173.'
      });
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 5000);
  const server = createServer();
  server.on('error', (error) => {
    console.error(`Cannot start TasteTrail: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () =>
    console.log(`TasteTrail server: http://localhost:${port}`)
  );
}

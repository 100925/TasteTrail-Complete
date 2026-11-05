import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const recipes = JSON.parse(await readFile(path.join(root, 'src/recipes.json'), 'utf8'));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
export function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    function json(status, body) {res.writeHead(status, {'Content-Type':'application/json'}); res.end(JSON.stringify(body));}
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch {return json(400, {message:'Invalid URL'});}
    if (!['GET','HEAD'].includes(req.method)) {res.setHeader('Allow','GET, HEAD'); return json(405, {message:'Method not allowed'});}
    if (pathname === '/api/health') return json(200, {status:'ok', recipes:recipes.length});
    if (pathname === '/api/recipes') return json(200, recipes);
    if (pathname.startsWith('/api/recipes/')) {const id = pathname.slice('/api/recipes/'.length); const item = /^\d+$/.test(id) && recipes.find((r) => r.id === Number(id)); return item ? json(200,item) : json(404,{message:'Recipe not found'});}
    if (pathname.startsWith('/api/')) return json(404, {message:'API route not found'});
    const dist = path.join(root,'dist');
    const target = path.resolve(dist, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(dist + path.sep)) return json(403, {message:'Forbidden'});
    try {const content = await readFile(target); res.writeHead(200, {'Content-Type':types[path.extname(target)] || 'application/octet-stream'}); res.end(req.method === 'HEAD' ? undefined : content);}
    catch {return json(404, {message:'File not found. Run npm run build to serve the website here; during development use http://localhost:5173.'});}
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 5000);
  const server = createServer();
  server.on('error', (error) => {console.error(`Cannot start TasteTrail: ${error.message}`); process.exitCode = 1;});
  server.listen(port, '127.0.0.1', () => console.log(`TasteTrail server: http://localhost:${port}`));
}

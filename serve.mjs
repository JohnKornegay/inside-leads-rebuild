/**
 * Local dev server — mirrors Vercel's cleanUrls + trailingSlash:false behavior
 * Handles:
 *   /blog          → blog.html
 *   /blog/slug     → blog/slug/index.html
 *   /services      → services.html
 *   /locations/raleigh → locations/raleigh/index.html
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3001;

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.xml':  'application/xml',
  '.txt':  'text/plain',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

function resolve(urlPath) {
  // Strip query string
  urlPath = urlPath.split('?')[0];

  // Homepage
  if (urlPath === '/') return 'index.html';

  const rel = urlPath.slice(1); // remove leading slash

  // 1. Exact file match (e.g. /css/style.css, /js/main.js, /favicon.ico)
  const exact = path.join(__dirname, rel);
  if (fs.existsSync(exact) && fs.statSync(exact).isFile()) return rel;

  // 2. Try appending .html (cleanUrls: /services → services.html)
  const withHtml = path.join(__dirname, rel + '.html');
  if (fs.existsSync(withHtml)) return rel + '.html';

  // 3. Try directory index (cleanUrls: /blog/slug → blog/slug/index.html)
  const dirIndex = path.join(__dirname, rel, 'index.html');
  if (fs.existsSync(dirIndex)) return path.join(rel, 'index.html');

  return null; // 404
}

const server = http.createServer((req, res) => {
  const rel = resolve(req.url);

  if (!rel) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`404 Not Found: ${req.url}`);
    return;
  }

  const filePath = path.join(__dirname, rel);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Server error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  Dev server: http://localhost:${PORT}\n`);
});

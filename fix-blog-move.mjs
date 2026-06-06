/**
 * Moves blog.html into blog/index.html
 * - Fixes CSS/JS paths to root-relative (/css/style.css, /js/main.js)
 * - Removes blog.html from root
 * - Updates vercel.json to remove the now-unnecessary /blog rewrite
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read blog.html
let html = fs.readFileSync(path.join(__dirname, 'blog.html'), 'utf8');

// Fix relative paths → root-relative (needed since file moves into blog/ subdir)
html = html.replace(/href="css\/style\.css"/g, 'href="/css/style.css"');
html = html.replace(/src="js\/main\.js"/g, 'src="/js/main.js"');

// Write to blog/index.html
fs.writeFileSync(path.join(__dirname, 'blog', 'index.html'), html, 'utf8');
console.log('✓ Wrote blog/index.html');

// Remove blog.html from root
fs.unlinkSync(path.join(__dirname, 'blog.html'));
console.log('✓ Deleted blog.html from root');

// Update vercel.json — remove the /blog rewrite (no longer needed)
const vercelPath = path.join(__dirname, 'vercel.json');
const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
vercel.rewrites = vercel.rewrites.filter(r => r.source !== '/blog');
fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2), 'utf8');
console.log('✓ Removed /blog rewrite from vercel.json');

console.log('\nDone. blog/index.html now serves at /blog with no naming conflict.');

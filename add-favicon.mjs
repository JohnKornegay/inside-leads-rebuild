/**
 * Adds favicon link tags to every HTML file in the project.
 * Skips files that already have them.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FAVICON_TAGS = `  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />`;

function addFavicon(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  if (html.includes('favicon')) {
    console.log(`  SKIP (already has favicon): ${path.relative(__dirname, filePath)}`);
    return;
  }
  // Insert before </head>
  html = html.replace('</head>', `${FAVICON_TAGS}\n</head>`);
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`  Added: ${path.relative(__dirname, filePath)}`);
}

// Root HTML files
for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.html'))) {
  addFavicon(path.join(__dirname, f));
}

// blog/* subdirs
for (const slug of fs.readdirSync(path.join(__dirname, 'blog'))) {
  const p = path.join(__dirname, 'blog', slug, 'index.html');
  if (fs.existsSync(p)) addFavicon(p);
}

// locations/* subdirs
for (const city of fs.readdirSync(path.join(__dirname, 'locations'))) {
  const p = path.join(__dirname, 'locations', city, 'index.html');
  if (fs.existsSync(p)) addFavicon(p);
}

console.log('\n✓ Done.');

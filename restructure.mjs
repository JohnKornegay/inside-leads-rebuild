/**
 * Inside Leads URL Restructure Script
 * - Updates all internal href links to clean/extensionless URLs
 * - Updates canonical tags to use www.getinsideleads.com
 * - Creates blog/ and locations/ folder structures
 * - Fixes CSS/JS paths for files moved into subdirectories
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

// ── Link replacement map (applied to all files) ──────────────────────────────
const HREF_REPLACEMENTS = [
  // Core pages: remove .html extension, use root-relative
  [/href="index\.html"/g,   'href="/"'],
  [/href="services\.html"/g, 'href="/services"'],
  [/href="blog\.html"/g,    'href="/blog"'],
  [/href="contact\.html"/g,  'href="/contact"'],
  [/href="team\.html"/g,    'href="/team"'],
  [/href="tools\.html"/g,   'href="/tools"'],
  // Location pages → /locations/*
  [/href="raleigh\.html"/g,  'href="/locations/raleigh"'],
  [/href="detroit\.html"/g,  'href="/locations/detroit"'],
  // Blog articles → /blog/*
  [/href="article\.html"/g,                      'href="/blog/how-ai-is-transforming-seo"'],
  [/href="blog-local-seo-raleigh\.html"/g,        'href="/blog/local-seo-raleigh"'],
  [/href="blog-gbp-checklist\.html"/g,            'href="/blog/gbp-checklist"'],
  [/href="blog-google-ads-not-converting\.html"/g, 'href="/blog/google-ads-not-converting"'],
  [/href="blog-hyperlocal-marketing\.html"/g,     'href="/blog/hyperlocal-marketing"'],
  [/href="blog-instagram-recommendations\.html"/g, 'href="/blog/instagram-recommendations"'],
  [/href="blog-google-ads-bidding\.html"/g,       'href="/blog/google-ads-bidding"'],
  [/href="blog-brand-awareness\.html"/g,          'href="/blog/brand-awareness"'],
  [/href="blog-digital-marketing-myths\.html"/g,  'href="/blog/digital-marketing-myths"'],
  // Services hash links (keep working)
  [/href="services\.html#/g, 'href="/services#'],
];

// ── Canonical replacements (no-www → www, strip .html) ───────────────────────
const CANONICAL_REPLACEMENTS = [
  // Core pages
  [/https:\/\/getinsideleads\.com\//g, 'https://www.getinsideleads.com/'],
  // Strip .html from canonical hrefs
  [/(href="https:\/\/www\.getinsideleads\.com\/[^"]*?)\.html"/g, '$1"'],
  // Fix blog article canonicals to new paths
  [/https:\/\/www\.getinsideleads\.com\/article/g,                     'https://www.getinsideleads.com/blog/how-ai-is-transforming-seo'],
  [/https:\/\/www\.getinsideleads\.com\/blog-local-seo-raleigh/g,      'https://www.getinsideleads.com/blog/local-seo-raleigh'],
  [/https:\/\/www\.getinsideleads\.com\/blog-gbp-checklist/g,          'https://www.getinsideleads.com/blog/gbp-checklist'],
  [/https:\/\/www\.getinsideleads\.com\/blog-google-ads-not-converting/g, 'https://www.getinsideleads.com/blog/google-ads-not-converting'],
  [/https:\/\/www\.getinsideleads\.com\/blog-hyperlocal-marketing/g,   'https://www.getinsideleads.com/blog/hyperlocal-marketing'],
  [/https:\/\/www\.getinsideleads\.com\/blog-instagram-recommendations/g, 'https://www.getinsideleads.com/blog/instagram-recommendations'],
  [/https:\/\/www\.getinsideleads\.com\/blog-google-ads-bidding/g,     'https://www.getinsideleads.com/blog/google-ads-bidding'],
  [/https:\/\/www\.getinsideleads\.com\/blog-brand-awareness/g,        'https://www.getinsideleads.com/blog/brand-awareness'],
  [/https:\/\/www\.getinsideleads\.com\/blog-digital-marketing-myths/g, 'https://www.getinsideleads.com/blog/digital-marketing-myths'],
  [/https:\/\/www\.getinsideleads\.com\/raleigh/g,                     'https://www.getinsideleads.com/locations/raleigh'],
  [/https:\/\/www\.getinsideleads\.com\/detroit/g,                     'https://www.getinsideleads.com/locations/detroit'],
];

// ── JSON-LD URL replacements ──────────────────────────────────────────────────
const JSONLD_REPLACEMENTS = [
  [/"https:\/\/getinsideleads\.com\//g, '"https://www.getinsideleads.com/'],
  [/https:\/\/www\.getinsideleads\.com\/article"/g,                     'https://www.getinsideleads.com/blog/how-ai-is-transforming-seo"'],
  [/https:\/\/www\.getinsideleads\.com\/blog-local-seo-raleigh"/g,      'https://www.getinsideleads.com/blog/local-seo-raleigh"'],
  [/https:\/\/www\.getinsideleads\.com\/blog-gbp-checklist"/g,          'https://www.getinsideleads.com/blog/gbp-checklist"'],
  [/https:\/\/www\.getinsideleads\.com\/blog-google-ads-not-converting"/g, 'https://www.getinsideleads.com/blog/google-ads-not-converting"'],
  [/https:\/\/www\.getinsideleads\.com\/blog-hyperlocal-marketing"/g,   'https://www.getinsideleads.com/blog/hyperlocal-marketing"'],
  [/https:\/\/www\.getinsideleads\.com\/blog-instagram-recommendations"/g, 'https://www.getinsideleads.com/blog/instagram-recommendations"'],
  [/https:\/\/www\.getinsideleads\.com\/blog-google-ads-bidding"/g,     'https://www.getinsideleads.com/blog/google-ads-bidding"'],
  [/https:\/\/www\.getinsideleads\.com\/blog-brand-awareness"/g,        'https://www.getinsideleads.com/blog/brand-awareness"'],
  [/https:\/\/www\.getinsideleads\.com\/blog-digital-marketing-myths"/g, 'https://www.getinsideleads.com/blog/digital-marketing-myths"'],
  [/https:\/\/www\.getinsideleads\.com\/raleigh"/g,                     'https://www.getinsideleads.com/locations/raleigh"'],
  [/https:\/\/www\.getinsideleads\.com\/detroit"/g,                     'https://www.getinsideleads.com/locations/detroit"'],
  [/https:\/\/www\.getinsideleads\.com\/team\.html"/g,                  'https://www.getinsideleads.com/team"'],
];

// ── Files that will be moved into subdirectories ──────────────────────────────
const FILE_MOVES = [
  // [source, destination folder]
  ['article.html',                       'blog/how-ai-is-transforming-seo'],
  ['blog-local-seo-raleigh.html',        'blog/local-seo-raleigh'],
  ['blog-gbp-checklist.html',            'blog/gbp-checklist'],
  ['blog-google-ads-not-converting.html','blog/google-ads-not-converting'],
  ['blog-hyperlocal-marketing.html',     'blog/hyperlocal-marketing'],
  ['blog-instagram-recommendations.html','blog/instagram-recommendations'],
  ['blog-google-ads-bidding.html',       'blog/google-ads-bidding'],
  ['blog-brand-awareness.html',          'blog/brand-awareness'],
  ['blog-digital-marketing-myths.html',  'blog/digital-marketing-myths'],
  ['raleigh.html',                       'locations/raleigh'],
  ['detroit.html',                       'locations/detroit'],
];

// ── CSS/JS path fix for files moved into subdirectories ──────────────────────
// blog/* = 2 levels deep → ../../
// locations/* = 2 levels deep → ../../
const SUBDIR_PATH_FIXES = [
  [/href="css\/style\.css"/g,  'href="/css/style.css"'],
  [/src="js\/main\.js"/g,      'src="/js/main.js"'],
];

function applyReplacements(content, replacements) {
  let result = content;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ── Step 1: Update all root HTML files in-place ───────────────────────────────
console.log('\n── Step 1: Updating root HTML files ──');
const rootHtmlFiles = fs.readdirSync(ROOT)
  .filter(f => f.endsWith('.html'));

for (const file of rootHtmlFiles) {
  const filePath = path.join(ROOT, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  content = applyReplacements(content, HREF_REPLACEMENTS);
  content = applyReplacements(content, CANONICAL_REPLACEMENTS);
  content = applyReplacements(content, JSONLD_REPLACEMENTS);

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  Updated: ${file}`);
  } else {
    console.log(`  No changes: ${file}`);
  }
}

// ── Step 2: Create folder structure and move files ────────────────────────────
console.log('\n── Step 2: Creating folder structure ──');
for (const [source, destFolder] of FILE_MOVES) {
  const sourcePath = path.join(ROOT, source);
  const destDir = path.join(ROOT, destFolder);
  const destPath = path.join(destDir, 'index.html');

  if (!fs.existsSync(sourcePath)) {
    console.log(`  SKIP (not found): ${source}`);
    continue;
  }

  fs.mkdirSync(destDir, { recursive: true });

  let content = fs.readFileSync(sourcePath, 'utf8');

  // Fix relative CSS/JS paths for subdirectory files
  content = applyReplacements(content, SUBDIR_PATH_FIXES);

  fs.writeFileSync(destPath, content, 'utf8');
  fs.unlinkSync(sourcePath); // Remove old flat file
  console.log(`  Moved: ${source} → ${destFolder}/index.html`);
}

// ── Step 3: Rebuild sitemap.xml ───────────────────────────────────────────────
console.log('\n── Step 3: Rebuilding sitemap.xml ──');
const today = '2026-06-05';
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.getinsideleads.com/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.getinsideleads.com/services</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.getinsideleads.com/locations/raleigh</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.getinsideleads.com/locations/detroit</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.getinsideleads.com/contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.getinsideleads.com/tools</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.getinsideleads.com/team</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.getinsideleads.com/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.getinsideleads.com/blog/how-ai-is-transforming-seo</loc>
    <lastmod>2026-06-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.getinsideleads.com/blog/local-seo-raleigh</loc>
    <lastmod>2026-06-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.getinsideleads.com/blog/gbp-checklist</loc>
    <lastmod>2026-06-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.getinsideleads.com/blog/google-ads-not-converting</loc>
    <lastmod>2026-06-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.getinsideleads.com/blog/hyperlocal-marketing</loc>
    <lastmod>2026-06-03</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.getinsideleads.com/blog/instagram-recommendations</loc>
    <lastmod>2026-06-03</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.getinsideleads.com/blog/google-ads-bidding</loc>
    <lastmod>2026-06-03</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.getinsideleads.com/blog/brand-awareness</loc>
    <lastmod>2026-06-03</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.getinsideleads.com/blog/digital-marketing-myths</loc>
    <lastmod>2026-06-03</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
console.log('  sitemap.xml rebuilt.');

// ── Step 4: Update robots.txt ─────────────────────────────────────────────────
console.log('\n── Step 4: Updating robots.txt ──');
const robots = `User-agent: *
Allow: /

Sitemap: https://www.getinsideleads.com/sitemap.xml
`;
fs.writeFileSync(path.join(ROOT, 'robots.txt'), robots, 'utf8');
console.log('  robots.txt updated.');

console.log('\n✓ Restructure complete.\n');

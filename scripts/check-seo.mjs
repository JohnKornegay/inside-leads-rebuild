#!/usr/bin/env node
/**
 * Static SEO regression checks for the site.
 * Usage: node scripts/check-seo.mjs   (exits 1 if any check fails)
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SITE = 'https://www.getinsideleads.com';
const failures = [];
const fail = (file, msg) => failures.push(`${file}: ${msg}`);

/** @returns {string[]} every .html file under dir, skipping node_modules and dotfolders */
function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name.startsWith('.')) return [];
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return htmlFiles(full);
    return name.endsWith('.html') ? [full] : [];
  });
}

/** Maps a clean site path ("/blog/foo") to the file Vercel would serve, or null. */
function resolvePath(path) {
  const clean = path.replace(/[#?].*$/, '').replace(/\/$/, '') || '/';
  if (clean === '/') return join(ROOT, 'index.html');
  const rel = clean.slice(1);
  for (const candidate of [rel, `${rel}.html`, join(rel, 'index.html')]) {
    const full = join(ROOT, candidate);
    if (existsSync(full) && statSync(full).isFile()) return full;
  }
  return null;
}

const files = htmlFiles(ROOT);
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'");

for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join('/');
  const html = readFileSync(file, 'utf8');

  const titles = [...html.matchAll(/<title>([\s\S]*?)<\/title>/g)];
  if (titles.length !== 1) fail(rel, `expected 1 <title>, found ${titles.length}`);
  else if (decode(titles[0][1]).length > 60) fail(rel, `title is ${decode(titles[0][1]).length} chars (max 60)`);

  const desc = html.match(/<meta name="description" content="([^"]*)"/);
  if (!desc) fail(rel, 'missing meta description');
  else if (decode(desc[1]).length > 160) fail(rel, `meta description is ${decode(desc[1]).length} chars (max 160)`);

  if (!/<link rel="canonical" href="https:\/\/www\.getinsideleads\.com[^"]*"/.test(html)) fail(rel, 'missing absolute canonical');
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fail(rel, `expected 1 <h1>, found ${h1s}`);
  if (!/property="og:image"/.test(html)) fail(rel, 'missing og:image');

  for (const [, block] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const json = JSON.parse(block);
      if (/getinsideleads\.com\/[^"]*\.html/.test(JSON.stringify(json))) fail(rel, 'JSON-LD contains a .html URL');
      if (/555-0100/.test(block)) fail(rel, 'JSON-LD contains placeholder phone');
    } catch (err) {
      fail(rel, `invalid JSON-LD: ${err.message}`);
    }
  }

  const banned = [
    [/seo-audit\.html/, 'links to legacy seo-audit.html'],
    [/uploads-ssl\.webflow\.com/, 'loads images from the old Webflow CDN'],
    [/fonts\.googleapis\.com/, 'loads Google Fonts (font is self-hosted)'],
    [/<a href="#"[^>]*aria-label="Share/, 'dead # share link'],
    [/<script src="[^"]*main\.js"><\/script>/, 'main.js is not deferred'],
    [/href="css\/style\.css"/, 'relative stylesheet path'],
    [/<img[^>]*src=""/, 'img with empty src'],
  ];
  for (const [re, msg] of banned) if (re.test(html)) fail(rel, msg);
  if (/class="nav-toggle"/.test(html) && !/aria-controls="mobile-nav"/.test(html)) fail(rel, 'nav toggle missing aria-controls');

  // Internal links must resolve to a page in the repo
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    const url = href.startsWith(SITE) ? href.slice(SITE.length) || '/' : href;
    if (!url.startsWith('/') || url.startsWith('//')) continue;
    if (/\.(css|js|svg|ico|png|webp|woff2|xml|txt|pdf)([?#]|$)/.test(url)) continue;
    if (!resolvePath(url)) fail(rel, `broken internal link ${href}`);
  }
}

// Homepage teaser cards must point at distinct posts
const home = readFileSync(join(ROOT, 'index.html'), 'utf8');
const teasers = [...home.matchAll(/<a href="(\/blog\/[^"]+)" class="blog-card/g)].map((m) => m[1]);
if (new Set(teasers).size !== teasers.length || teasers.length < 3) fail('index.html', `blog teasers not distinct: ${teasers.join(', ')}`);
if (/\$0M\+|>0\+<|>0%</.test(home)) fail('index.html', 'stats bar renders zeros without JS');

// Sitemap: every listed URL resolves; no ignored tags; every indexable page listed
const sitemap = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const loc of locs) if (!resolvePath(loc.slice(SITE.length) || '/')) fail('sitemap.xml', `URL has no page: ${loc}`);
if (/<priority>|<changefreq>/.test(sitemap)) fail('sitemap.xml', 'contains priority/changefreq (ignored by Google)');
for (const file of files) {
  const canon = readFileSync(file, 'utf8').match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canon && !locs.includes(canon)) fail('sitemap.xml', `missing ${canon}`);
}

// Security headers and apex redirect
const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
const headerKeys = (vercel.headers || []).flatMap((h) => h.headers.map((x) => x.key.toLowerCase()));
for (const key of ['x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy']) {
  if (!headerKeys.includes(key)) fail('vercel.json', `missing ${key} header`);
}
if (!headerKeys.some((k) => k.startsWith('content-security-policy'))) fail('vercel.json', 'missing CSP header');
if (!(vercel.redirects || []).some((r) => r.has?.some((h) => h.type === 'host' && h.value === 'getinsideleads.com'))) {
  fail('vercel.json', 'missing apex -> www redirect');
}

// llms.txt uses Markdown links
const llms = readFileSync(join(ROOT, 'llms.txt'), 'utf8');
if (!/\[[^\]]+\]\(https:\/\/www\.getinsideleads\.com/.test(llms)) fail('llms.txt', 'no Markdown links');

if (failures.length) {
  console.error(`✗ ${failures.length} SEO check(s) failed:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ All SEO checks passed (${files.length} pages, ${locs.length} sitemap URLs)`);

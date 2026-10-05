#!/usr/bin/env node
/**
 * Regenerates sitemap.xml from the HTML pages in the repo.
 * - URL comes from each page's canonical tag (pages with noindex are skipped)
 * - lastmod is the page's last git commit date, or today if it has uncommitted changes
 * Usage: node scripts/build-sitemap.mjs   (run before committing content changes)
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const today = new Date().toISOString().slice(0, 10);

/** @returns {string[]} every .html file under dir, skipping node_modules and dotfolders */
function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name.startsWith('.')) return [];
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return htmlFiles(full);
    return name.endsWith('.html') ? [full] : [];
  });
}

/** @param {string} file @returns {string} YYYY-MM-DD */
function lastModified(file) {
  const rel = relative(ROOT, file);
  const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
  try {
    if (git('status', '--porcelain', '--', rel)) return today;
    return git('log', '-1', '--format=%cs', '--', rel) || today;
  } catch {
    return today;
  }
}

const entries = htmlFiles(ROOT)
  .map((file) => {
    const html = readFileSync(file, 'utf8');
    if (/<meta name="robots" content="[^"]*noindex/i.test(html)) return null;
    const loc = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    return loc ? { loc, lastmod: lastModified(file) } : null;
  })
  .filter(Boolean)
  .sort((a, b) => {
    const isHome = (e) => new URL(e.loc).pathname === '/';
    if (isHome(a) !== isHome(b)) return isHome(a) ? -1 : 1;
    return a.loc.localeCompare(b.loc);
  });

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries.map(({ loc, lastmod }) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`),
  '</urlset>',
  '',
].join('\n');

writeFileSync(join(ROOT, 'sitemap.xml'), xml);
console.log(`sitemap.xml: ${entries.length} URLs`);

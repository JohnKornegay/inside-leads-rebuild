/**
 * SEO Audit Fix Script — Inside Leads
 * Fixes all issues found in the June 2026 SEO audit:
 * 1. og:url + mainEntityOfPage .html extensions in blog articles
 * 2. publisher URL missing www. in JSON-LD
 * 3. team.html bio still says "10+" instead of "20+"
 * 4. instagram-recommendations has a 2024 reference
 * 5. js/blog.js and js/article.js relative paths in subdirectories
 * 6. Phone placeholder (919) 555-0100 removal from all footers
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fixFile(relPath, ...transforms) {
  const fullPath = path.join(__dirname, relPath);
  if (!fs.existsSync(fullPath)) { console.log(`  SKIP (not found): ${relPath}`); return; }
  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;
  for (const [pattern, replacement] of transforms) {
    content = content.replace(pattern, replacement);
  }
  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`  Fixed: ${relPath}`);
  } else {
    console.log(`  No changes: ${relPath}`);
  }
}

// All blog article index.html files
const BLOG_ARTICLES = [
  'blog/how-ai-is-transforming-seo/index.html',
  'blog/local-seo-raleigh/index.html',
  'blog/gbp-checklist/index.html',
  'blog/google-ads-not-converting/index.html',
  'blog/hyperlocal-marketing/index.html',
  'blog/instagram-recommendations/index.html',
  'blog/google-ads-bidding/index.html',
  'blog/brand-awareness/index.html',
  'blog/digital-marketing-myths/index.html',
];

// All HTML files with footers (for phone removal)
const ALL_HTML = [
  'index.html', 'services.html', 'contact.html', 'team.html', 'tools.html',
  'blog/index.html',
  'locations/raleigh/index.html',
  'locations/detroit/index.html',
  ...BLOG_ARTICLES,
];

console.log('\n── Fix 1: og:url + mainEntityOfPage .html in blog articles ──');
for (const f of BLOG_ARTICLES) {
  fixFile(f,
    // og:url: strip .html from blog article URLs
    [/(<meta property="og:url" content="https:\/\/www\.getinsideleads\.com\/blog\/[^"]+?)\.html"/g, '$1"'],
    // mainEntityOfPage @id: strip .html
    [/("@id"\s*:\s*"https:\/\/www\.getinsideleads\.com\/blog\/[^"]+?)\.html"/g, '$1"'],
    // publisher no-www → www
    [/"url"\s*:\s*"https:\/\/getinsideleads\.com"/g, '"url": "https://www.getinsideleads.com"'],
    // Fix relative JS paths for subdirectory files
    [/src="js\/article\.js"/g, 'src="/js/article.js"'],
    [/src="js\/blog\.js"/g, 'src="/js/blog.js"'],
    [/src="js\/main\.js"/g, 'src="/js/main.js"'],
    [/href="css\/style\.css"/g, 'href="/css/style.css"'],
  );
}

console.log('\n── Fix 2: blog/index.html JS path ──');
fixFile('blog/index.html',
  [/src="js\/blog\.js"/g, 'src="/js/blog.js"'],
  [/src="js\/main\.js"/g, 'src="/js/main.js"'],
  [/href="css\/style\.css"/g, 'href="/css/style.css"'],
);

console.log('\n── Fix 3: team.html — update 10+ to 20+ ──');
fixFile('team.html',
  // Hover overlay text
  [/10\+ years of digital marketing excellence/g, '20+ years of digital marketing excellence'],
  // Fun facts card
  [/<p>10\+ Years<\/p>/g, '<p>20+ Years</p>'],
);

console.log('\n── Fix 4: instagram-recommendations — 2024 reference ──');
fixFile('blog/instagram-recommendations/index.html',
  [/\b2024\b/g, '2026'],
);

console.log('\n── Fix 5: Remove (919) 555-0100 phone from all footers ──');
for (const f of ALL_HTML) {
  fixFile(f,
    // Remove entire footer list item with placeholder phone
    [/\s*<li><a href="tel:\+19195550100">\(919\) 555-0100<\/a><\/li>/g, ''],
    // Also clean up any remaining phone references
    [/\s*<li><a href="tel:[^"]*">\([0-9]{3}\) 555-[0-9]{4}<\/a><\/li>/g, ''],
  );
}

console.log('\n── Fix 6: homepage no-www in JSON-LD ──');
fixFile('index.html',
  [/"url"\s*:\s*"https:\/\/getinsideleads\.com"/g, '"url": "https://www.getinsideleads.com"'],
  [/"@id"\s*:\s*"https:\/\/getinsideleads\.com"/g, '"@id": "https://www.getinsideleads.com"'],
);

console.log('\n✓ All SEO fixes applied.\n');

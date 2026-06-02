/* ============================================
   INSIDE LEADS — article.js
   Hydrates article.html from ?slug= query param
   using the blog-posts edge function.
   Falls back to static content when no slug given.
   ============================================ */

(function () {

  const slug = new URLSearchParams(window.location.search).get('slug');
  if (!slug) return; // no slug → show static fallback content as-is

  const BLOG_FN_URL = `${SUPABASE_URL}/functions/v1/blog-posts/${encodeURIComponent(slug)}`;

  /* ---- Element helpers ---- */
  const q  = (sel)     => document.querySelector(sel);
  const qa = (sel)     => document.querySelectorAll(sel);
  const setText  = (sel, val) => { const el = q(sel); if (el && val != null) el.textContent = val; };
  const setHtml  = (sel, val) => { const el = q(sel); if (el && val != null) el.innerHTML = val; };
  const setAttr  = (sel, attr, val) => { const el = q(sel); if (el && val != null) el.setAttribute(attr, val); };

  async function loadArticle() {
    try {
      const res = await fetch(BLOG_FN_URL, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Apikey': SUPABASE_ANON_KEY,
        },
      });

      if (res.status === 404) {
        window.location.replace('blog.html');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const { post } = await res.json();
      if (!post) { window.location.replace('blog.html'); return; }

      hydrate(post);
    } catch (err) {
      console.error('article.js: failed to load post', err);
      // Leave static fallback in place on network error
    }
  }

  function hydrate(post) {
    const cat     = post.blog_categories;
    const catName = cat?.name || 'Insights';
    const author  = post.author || 'John Kornegay';
    const date    = post.published_at
      ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : '';

    /* ---- <title> + meta ---- */
    document.title = `${post.seo_title || post.title} | Inside Leads`;
    setMetaDesc(post.seo_description || post.excerpt || '');
    setOgMeta(post);

    /* ---- Breadcrumb category ---- */
    const breadcrumbCat = q('.article-breadcrumb span:last-child');
    if (breadcrumbCat) breadcrumbCat.textContent = catName;

    /* ---- Eyebrow ---- */
    setText('.article-cat', catName);

    /* ---- Main headline ---- */
    setText('.article-title', post.title);

    /* ---- Author + date ---- */
    setText('.article-author-name', author);
    setText('.article-date', date);

    /* ---- Cover image ---- */
    if (post.featured_image) {
      const coverEl = q('.article-cover img');
      if (coverEl) {
        coverEl.src    = post.featured_image;
        coverEl.dataset.src = post.featured_image;
        coverEl.alt    = post.title;
        coverEl.classList.remove('img-blur');
      }
    }

    /* ---- Article body ---- */
    const body = q('#article-body');
    if (body && post.content) {
      // Preserve the inline CTA block if it exists, append after content
      const inlineCta = body.querySelector('.article-cta-inline');
      body.innerHTML = post.content;
      if (inlineCta) body.appendChild(inlineCta);

      // Re-add IDs to h2 headings for TOC anchors
      body.querySelectorAll('h2').forEach(h => {
        if (!h.id) {
          h.id = h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        }
      });
    }

    /* ---- Table of Contents ---- */
    buildToc(post.content);

    /* ---- Share links ---- */
    const pageUrl = encodeURIComponent(window.location.href);
    const pageTitle = encodeURIComponent(post.title);
    qa('.article-share-btn').forEach(btn => {
      const label = btn.getAttribute('aria-label') || '';
      if (label.includes('LinkedIn')) {
        btn.href = `https://www.linkedin.com/shareArticle?mini=true&url=${pageUrl}&title=${pageTitle}`;
        btn.target = '_blank';
        btn.rel = 'noopener';
      } else if (label.includes('Twitter') || label.includes('X')) {
        btn.href = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`;
        btn.target = '_blank';
        btn.rel = 'noopener';
      }
    });

    /* ---- Re-run scroll reveals on new content ---- */
    setTimeout(() => {
      qa('#article-body .reveal').forEach(el => el.classList.add('visible'));
    }, 80);
  }

  function buildToc(html) {
    if (!html) return;
    const toc = q('.toc-list');
    if (!toc) return;

    // Parse headings from the raw HTML string
    const matches = [...html.matchAll(/<h2[^>]*id=["']([^"']*)["'][^>]*>([\s\S]*?)<\/h2>/gi)];
    if (!matches.length) {
      // Try headings without pre-set IDs — fall back to auto-generated ones
      const div = document.createElement('div');
      div.innerHTML = html;
      const headings = div.querySelectorAll('h2');
      if (!headings.length) return;
      toc.innerHTML = [...headings].map(h => {
        const id = h.id || h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return `<li><a href="#${id}" class="toc-link">${escHtml(h.textContent)}</a></li>`;
      }).join('');
      return;
    }

    toc.innerHTML = matches.map(([, id, innerHtml]) => {
      const text = innerHtml.replace(/<[^>]+>/g, '').trim();
      return `<li><a href="#${id}" class="toc-link">${escHtml(text)}</a></li>`;
    }).join('');
  }

  function setMetaDesc(desc) {
    let el = document.querySelector('meta[name="description"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', 'description');
      document.head.appendChild(el);
    }
    el.setAttribute('content', desc);
  }

  function setOgMeta(post) {
    const metas = {
      'og:title':       post.seo_title || post.title,
      'og:description': post.seo_description || post.excerpt || '',
      'og:image':       post.featured_image || '',
      'og:url':         window.location.href,
    };
    Object.entries(metas).forEach(([prop, content]) => {
      if (!content) return;
      let el = document.querySelector(`meta[property="${prop}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', prop);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    });
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  loadArticle();

})();

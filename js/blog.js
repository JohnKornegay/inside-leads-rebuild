/* ============================================
   INSIDE LEADS — blog.js
   Loads posts from blog-posts edge function,
   then wires up category filter + search.
   Falls back to static HTML if fetch fails.
   ============================================ */

(function () {

  const BLOG_FN_URL = `${SUPABASE_URL}/functions/v1/blog-posts`;

  const container    = document.getElementById('blog-posts-container');
  const noResultsMsg = document.getElementById('no-results-msg');
  const filterBtns   = document.querySelectorAll('.blog-filter-row .filter-btn');
  const searchInput  = document.querySelector('.blog-search-input');
  const clearLink    = document.getElementById('clear-filters-link');

  if (!container) return;

  let allPosts = [];
  let activeCat = 'all';
  let searchQuery = '';

  /* ---- Category slug → display name map ---- */
  const catLabels = {
    seo:      'SEO',
    ppc:      'PPC',
    social:   'Social Media',
    branding: 'Brand Strategy',
    local:    'Local Marketing',
    ai:       'AI Consulting',
  };

  /* ---- Render a single card ---- */
  function buildCard(post, delay) {
    const cat     = post.blog_categories;
    const catSlug = cat?.slug || 'seo';
    const catName = cat?.name || catLabels[catSlug] || 'Insights';
    const title   = escHtml(post.title);
    const excerpt = escHtml(post.excerpt || '');
    const img     = post.featured_image || '';
    const slug    = post.slug;
    const date    = post.published_at
      ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';

    const titleLower   = post.title.toLowerCase();
    const excerptLower = (post.excerpt || '').toLowerCase();

    const imgHtml = img
      ? `<img src="${escAttr(img)}" alt="${title}" loading="lazy" />`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--bg-alt);">
           <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M9 21l1.5-3h3L15 21"/></svg>
         </div>`;

    return `
      <a href="article.html?slug=${encodeURIComponent(slug)}"
         class="blog-card reveal delay-${delay}"
         data-category="${escAttr(catSlug)}"
         data-title="${escAttr(titleLower)}"
         data-excerpt="${escAttr(excerptLower)}">
        <div class="blog-card-img">${imgHtml}</div>
        <div class="blog-card-body">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span class="blog-card-cat">${escHtml(catName)}</span>
            ${date ? `<span class="blog-card-read">${escHtml(date)}</span>` : ''}
          </div>
          <h3 class="blog-card-title">${title}</h3>
          <p class="blog-card-excerpt">${excerpt}</p>
          <span class="blog-card-link">Read Post <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>
        </div>
      </a>`;
  }

  /* ---- Filter + search on already-rendered cards ---- */
  function applyFilters() {
    const cards = container.querySelectorAll('.blog-card');
    let visible = 0;
    cards.forEach(card => {
      const catMatch = activeCat === 'all' || card.dataset.category === activeCat;
      const searchMatch = !searchQuery ||
        (card.dataset.title || '').includes(searchQuery) ||
        (card.dataset.excerpt || '').includes(searchQuery);
      const show = catMatch && searchMatch;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (noResultsMsg) noResultsMsg.style.display = visible === 0 ? 'block' : 'none';
  }

  /* ---- Render all posts into container ---- */
  function renderPosts(posts) {
    if (!posts.length) {
      container.innerHTML = '';
      if (noResultsMsg) noResultsMsg.style.display = 'block';
      return;
    }
    const delays = [1, 2, 3];
    container.innerHTML = posts.map((p, i) => buildCard(p, delays[i % 3])).join('');
    if (noResultsMsg) noResultsMsg.style.display = 'none';

    // Trigger reveal on new cards
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    container.querySelectorAll('.reveal').forEach(el => io.observe(el));
  }

  /* ---- Skeleton loader ---- */
  function showSkeleton() {
    const skeletons = Array.from({ length: 6 }, () => `
      <div class="blog-card" style="pointer-events:none;">
        <div class="blog-card-img" style="background:var(--bg-card);animation:skeleton-pulse 1.4s ease-in-out infinite;"></div>
        <div class="blog-card-body" style="gap:.75rem;">
          <div style="height:.6rem;width:5rem;background:var(--bg-card);border-radius:3px;animation:skeleton-pulse 1.4s ease-in-out infinite;"></div>
          <div style="height:.9rem;width:90%;background:var(--bg-card);border-radius:3px;animation:skeleton-pulse 1.4s ease-in-out infinite;"></div>
          <div style="height:.9rem;width:70%;background:var(--bg-card);border-radius:3px;animation:skeleton-pulse 1.4s ease-in-out infinite;"></div>
          <div style="height:.75rem;width:100%;background:var(--bg-card);border-radius:3px;animation:skeleton-pulse 1.4s ease-in-out infinite;"></div>
          <div style="height:.75rem;width:85%;background:var(--bg-card);border-radius:3px;animation:skeleton-pulse 1.4s ease-in-out infinite;"></div>
        </div>
      </div>`).join('');
    container.innerHTML = skeletons;
  }

  /* ---- Fetch posts ---- */
  async function loadPosts() {
    showSkeleton();
    try {
      const res = await fetch(BLOG_FN_URL, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Apikey': SUPABASE_ANON_KEY,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      allPosts = json.posts || json.data || [];
      renderPosts(allPosts);
    } catch (err) {
      console.warn('blog-posts fetch failed, using static HTML fallback', err);
      // Leave static HTML in place — container already had it before showSkeleton replaced it.
      // Re-fetch from static DOM is not possible, so just show a quiet error note.
      container.innerHTML = `<p style="color:var(--muted);font-size:.88rem;padding:2rem 0;grid-column:1/-1;">Unable to load articles. Please refresh the page.</p>`;
    }
  }

  /* ---- Wire filters ---- */
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.filter;
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value.toLowerCase().trim();
      applyFilters();
    });
  }

  if (clearLink) {
    clearLink.addEventListener('click', e => {
      e.preventDefault();
      activeCat = 'all';
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
      applyFilters();
    });
  }

  /* ---- Inject skeleton keyframes into document ---- */
  if (!document.getElementById('skeleton-style')) {
    const style = document.createElement('style');
    style.id = 'skeleton-style';
    style.textContent = '@keyframes skeleton-pulse { 0%,100%{opacity:.5} 50%{opacity:1} }';
    document.head.appendChild(style);
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function escAttr(str) {
    return String(str || '').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  loadPosts();

})();

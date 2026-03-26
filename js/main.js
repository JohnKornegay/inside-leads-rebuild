/* ============================================
   INSIDE LEADS — main.js
   All interactive features
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Sticky Nav ---- */
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- Mobile Nav Toggle ---- */
  const toggle = document.querySelector('.nav-toggle');
  const mobileMenu = document.querySelector('.nav-mobile');
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () => {
      const open = toggle.classList.toggle('open');
      mobileMenu.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        toggle.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---- Active nav link ---- */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-mobile a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  /* ---- Scroll Reveal (IntersectionObserver) ---- */
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .step');
  if (revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  }

  /* ---- Animated Counters ---- */
  const counters = document.querySelectorAll('[data-counter]');
  if (counters.length) {
    const counterIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCounter(e.target);
          counterIO.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => counterIO.observe(c));
  }

  function animateCounter(el) {
    const target = parseInt(el.dataset.counter, 10);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const duration = 1800;
    const start = performance.now();
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const update = (now) => {
      const t = Math.min((now - start) / duration, 1);
      el.textContent = prefix + Math.round(easeOut(t) * target) + suffix;
      if (t < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  /* ---- Typing Animation (hero only) ---- */
  const typedEl = document.querySelector('[data-typed]');
  if (typedEl) {
    const words = JSON.parse(typedEl.dataset.typed);
    let wi = 0, ci = 0, deleting = false;
    const speed = { type: 80, delete: 40, pause: 2200 };
    function tick() {
      const word = words[wi];
      if (!deleting) {
        typedEl.textContent = word.slice(0, ++ci);
        if (ci === word.length) { deleting = true; setTimeout(tick, speed.pause); return; }
      } else {
        typedEl.textContent = word.slice(0, --ci);
        if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; }
      }
      setTimeout(tick, deleting ? speed.delete : speed.type);
    }
    tick();
  }

  /* ---- Services Filter (services page) ---- */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const serviceCards = document.querySelectorAll('.service-card[data-category]');
  if (filterBtns.length && serviceCards.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.filter;
        serviceCards.forEach(card => {
          const match = cat === 'all' || card.dataset.category === cat;
          card.style.display = match ? '' : 'none';
        });
      });
    });
  }

  /* ---- Blog Posts Loading ---- */
  const blogPostsContainer = document.querySelector('#blog-posts-container');
  let allBlogPosts = [];

  async function loadBlogPosts() {
    if (!blogPostsContainer) return;

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blog-posts`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load blog posts');
      }

      const data = await response.json();
      allBlogPosts = data.posts || [];

      renderBlogPosts(allBlogPosts);
    } catch (error) {
      console.error('Error loading blog posts:', error);
      blogPostsContainer.innerHTML = '<p style="text-align:center;padding:3rem;color:var(--muted);">Unable to load posts. Please try again later.</p>';
    }
  }

  function renderBlogPosts(posts) {
    if (!blogPostsContainer) return;

    blogPostsContainer.innerHTML = '';

    if (posts.length === 0) {
      const noResults = document.querySelector('.blog-no-results');
      if (noResults) noResults.style.display = 'block';
      return;
    }

    const noResults = document.querySelector('.blog-no-results');
    if (noResults) noResults.style.display = 'none';

    posts.forEach((post, index) => {
      const card = document.createElement('a');
      card.href = `#`;
      card.className = `blog-card reveal delay-${(index % 3) + 1}`;
      card.dataset.category = post.blog_categories?.slug || 'uncategorized';
      card.dataset.title = post.title.toLowerCase();
      card.dataset.excerpt = (post.excerpt || '').toLowerCase();

      card.innerHTML = `
        <div class="blog-card-img">
          <img src="${post.featured_image || 'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg'}" alt="${post.title}" loading="lazy" />
        </div>
        <div class="blog-card-body">
          <span class="blog-card-cat">${post.blog_categories?.name || 'Uncategorized'}</span>
          <h3 class="blog-card-title">${post.title}</h3>
          <p class="blog-card-excerpt">${post.excerpt || ''}</p>
          <span class="blog-card-link">Read Post <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>
        </div>
      `;

      blogPostsContainer.appendChild(card);
    });

    const revealEls = blogPostsContainer.querySelectorAll('.reveal');
    if (revealEls.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.12 });
      revealEls.forEach(el => io.observe(el));
    }
  }

  if (blogPostsContainer) {
    loadBlogPosts();
  }

  /* ---- Blog Search + Filter ---- */
  const blogSearch = document.querySelector('.blog-search-input');
  const blogFilterBtns = document.querySelectorAll('.blog-filter-row .filter-btn');
  const noResults = document.querySelector('.blog-no-results');

  let blogCatFilter = 'all';
  let blogSearchQuery = '';

  function applyBlogFilters() {
    let filteredPosts = allBlogPosts;

    if (blogCatFilter !== 'all') {
      filteredPosts = filteredPosts.filter(post =>
        post.blog_categories?.slug === blogCatFilter
      );
    }

    if (blogSearchQuery) {
      filteredPosts = filteredPosts.filter(post =>
        post.title.toLowerCase().includes(blogSearchQuery) ||
        (post.excerpt && post.excerpt.toLowerCase().includes(blogSearchQuery))
      );
    }

    renderBlogPosts(filteredPosts);
  }

  if (blogSearch) {
    blogSearch.addEventListener('input', e => {
      blogSearchQuery = e.target.value.toLowerCase().trim();
      applyBlogFilters();
    });
  }
  if (blogFilterBtns.length) {
    blogFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        blogFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        blogCatFilter = btn.dataset.filter;
        applyBlogFilters();
      });
    });
  }

  /* ---- Multi-Step Contact Form ---- */
  const formPanels = document.querySelectorAll('.form-panel');
  const stepIndicators = document.querySelectorAll('.form-step-indicator');
  let currentStep = 0;

  function goToStep(n) {
    formPanels.forEach((p, i) => p.classList.toggle('active', i === n));
    stepIndicators.forEach((s, i) => {
      s.classList.toggle('active', i === n);
      s.classList.toggle('done', i < n);
    });
    currentStep = n;
  }
  if (formPanels.length) goToStep(0);

  document.querySelectorAll('[data-next-step]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(currentStep)) goToStep(currentStep + 1);
    });
  });
  document.querySelectorAll('[data-prev-step]').forEach(btn => {
    btn.addEventListener('click', () => goToStep(currentStep - 1));
  });

  function validateStep(step) {
    const panel = formPanels[step];
    if (!panel) return true;
    let valid = true;
    panel.querySelectorAll('[required]').forEach(input => {
      if (!input.value.trim()) {
        input.style.borderColor = '#f08080';
        valid = false;
        input.addEventListener('input', () => { input.style.borderColor = ''; }, { once: true });
      }
    });
    return valid;
  }

  /* ---- Contact Form Submit ---- */
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = contactForm.querySelector('[type="submit"]');
      const msg = contactForm.querySelector('.form-message');
      btn.textContent = 'Sending…';
      btn.disabled = true;

      try {
        const formData = {
          service: contactForm.querySelector('#service').value,
          budget: contactForm.querySelector('#budget').value,
          name: contactForm.querySelector('#name').value,
          company: contactForm.querySelector('#company').value,
          email: contactForm.querySelector('#email').value,
          phone: contactForm.querySelector('#phone').value,
          website: contactForm.querySelector('#website').value,
          description: contactForm.querySelector('#description').value,
          notes: contactForm.querySelector('#notes').value,
          source: 'contact_page'
        };

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contact-submission`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          throw new Error('Failed to submit form');
        }

        msg.className = 'form-message success';
        msg.textContent = 'Thank you! Our team will reach out shortly to schedule your consult.';
        contactForm.reset();
        if (formPanels.length) goToStep(0);
      } catch (error) {
        console.error('Form submission error:', error);
        msg.className = 'form-message error';
        msg.textContent = 'Sorry, something went wrong. Please try again or email us directly at hello@insideleads.com.';
      } finally {
        btn.textContent = 'BOOK CONSULT';
        btn.disabled = false;
      }
    });
  }

  /* ---- Smooth anchor scroll ---- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---- Parallax hero glow ---- */
  const heroGlow = document.querySelector('.hero-glow');
  if (heroGlow) {
    window.addEventListener('mousemove', e => {
      const x = (e.clientX / window.innerWidth - .5) * 40;
      const y = (e.clientY / window.innerHeight - .5) * 40;
      heroGlow.style.transform = `translate(${x}px, ${y}px)`;
    }, { passive: true });
  }

});

/* ============================================
   INSIDE LEADS — main.js
   All interactive features
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Sticky Nav (hide on scroll down, show on scroll up) ---- */
  const nav = document.querySelector('.nav');
  if (nav) {
    let lastY = 0;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY;
          nav.classList.toggle('scrolled', y > 20);
          if (y > 80) {
            nav.classList.toggle('hidden', y > lastY);
          } else {
            nav.classList.remove('hidden');
          }
          lastY = y;
          ticking = false;
        });
        ticking = true;
      }
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

  /* ---- Blog Filter + Search (static DOM) ---- */
  const blogCards = document.querySelectorAll('#blog-posts-container .blog-card');
  const blogFilterBtns = document.querySelectorAll('.blog-filter-row .filter-btn');
  const blogSearch = document.querySelector('.blog-search-input');
  const noResultsMsg = document.getElementById('no-results-msg');
  const clearFiltersLink = document.getElementById('clear-filters-link');

  let blogCatFilter = 'all';
  let blogSearchQuery = '';

  function applyBlogFilters() {
    let visibleCount = 0;
    blogCards.forEach(card => {
      const catMatch = blogCatFilter === 'all' || card.dataset.category === blogCatFilter;
      const searchMatch = !blogSearchQuery ||
        (card.dataset.title || '').includes(blogSearchQuery) ||
        (card.dataset.excerpt || '').includes(blogSearchQuery);
      const show = catMatch && searchMatch;
      card.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });
    if (noResultsMsg) noResultsMsg.style.display = visibleCount === 0 ? 'block' : 'none';
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

  if (blogSearch) {
    blogSearch.addEventListener('input', e => {
      blogSearchQuery = e.target.value.toLowerCase().trim();
      applyBlogFilters();
    });
  }

  if (clearFiltersLink) {
    clearFiltersLink.addEventListener('click', e => {
      e.preventDefault();
      blogCatFilter = 'all';
      blogSearchQuery = '';
      if (blogSearch) blogSearch.value = '';
      blogFilterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
      applyBlogFilters();
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

        await new Promise(resolve => setTimeout(resolve, 800));

        msg.className = 'form-message success';
        msg.textContent = 'Thank you! Our team will reach out shortly to schedule your consult.';
        contactForm.reset();
        if (formPanels.length) goToStep(0);
      } catch (error) {
        console.error('Form submission error:', error);
        msg.className = 'form-message error';
        msg.textContent = 'Sorry, something went wrong. Please try again or email us directly at john@getinsideleads.com.';
      } finally {
        btn.textContent = 'BOOK CONSULT';
        btn.disabled = false;
      }
    });
  }

  /* ---- Reading Progress Bar ---- */
  const progressBar = document.getElementById('reading-progress');
  if (progressBar) {
    const updateProgress = () => {
      const body = document.getElementById('article-body');
      if (!body) return;
      const scrollTop = window.scrollY;
      const total = body.offsetTop + body.offsetHeight - window.innerHeight;
      progressBar.style.width = `${Math.min(100, Math.max(0, scrollTop / total * 100))}%`;
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  /* ---- Blur-up Image Loading ---- */
  document.querySelectorAll('img[data-src]').forEach(img => {
    const real = new Image();
    real.onload = () => { img.src = real.src; img.classList.add('loaded'); };
    real.src = img.dataset.src;
  });

  /* ---- TOC Active Section ---- */
  const tocLinks = document.querySelectorAll('.toc-link');
  if (tocLinks.length) {
    const headings = Array.from(document.querySelectorAll('.article-body h2[id]'));
    const tocIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          tocLinks.forEach(l => l.classList.remove('active'));
          const link = document.querySelector(`.toc-link[href="#${e.target.id}"]`);
          if (link) link.classList.add('active');
        }
      });
    }, { rootMargin:'-15% 0% -65% 0%' });
    headings.forEach(h => tocIO.observe(h));
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

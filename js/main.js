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

  /* ---- Blog Search + Filter ---- */
  const blogSearch = document.querySelector('.blog-search-input');
  const blogFilterBtns = document.querySelectorAll('.blog-filter-row .filter-btn');
  const blogCards = document.querySelectorAll('.blog-card[data-category]');
  const noResults = document.querySelector('.blog-no-results');

  let blogCatFilter = 'all';
  let blogSearchQuery = '';

  function applyBlogFilters() {
    let visible = 0;
    blogCards.forEach(card => {
      const catMatch = blogCatFilter === 'all' || card.dataset.category === blogCatFilter;
      const searchMatch = !blogSearchQuery ||
        card.dataset.title.toLowerCase().includes(blogSearchQuery) ||
        card.dataset.excerpt.toLowerCase().includes(blogSearchQuery);
      const show = catMatch && searchMatch;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';
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
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      const btn = contactForm.querySelector('[type="submit"]');
      const msg = contactForm.querySelector('.form-message');
      btn.textContent = 'Sending…';
      btn.disabled = true;
      // Simulate async submit
      setTimeout(() => {
        msg.className = 'form-message success';
        msg.textContent = 'Thank you! Our team will reach out shortly to schedule your consult.';
        contactForm.reset();
        if (formPanels.length) goToStep(0);
        btn.textContent = 'BOOK CONSULT';
        btn.disabled = false;
      }, 1400);
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

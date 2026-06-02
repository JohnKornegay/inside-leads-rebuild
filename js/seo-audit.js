/* ============================================
   INSIDE LEADS — seo-audit.js
   SEO Audit Tool interactive logic
   ============================================ */

(function () {

  const EDGE_FN_URL = `${SUPABASE_URL}/functions/v1/seo-audit`;

  const form           = document.getElementById('audit-form');
  const urlInput       = document.getElementById('audit-url');
  const submitBtn      = document.getElementById('audit-submit-btn');
  const errorEl        = document.getElementById('audit-error');
  const inputCard      = document.getElementById('audit-input-card');
  const loadingSection = document.getElementById('audit-loading');
  const resultsSection = document.getElementById('audit-results');
  const howSection     = document.getElementById('audit-how');

  if (!form) return;

  /* ---- Loading step animation ---- */
  let loadingTimer = null;
  const loadingSteps = [
    document.getElementById('lstep-1'),
    document.getElementById('lstep-2'),
    document.getElementById('lstep-3'),
    document.getElementById('lstep-4'),
    document.getElementById('lstep-5'),
  ];

  function startLoadingAnimation() {
    let step = 0;
    loadingSteps.forEach(s => { if (s) { s.classList.remove('active', 'done'); } });
    if (loadingSteps[0]) loadingSteps[0].classList.add('active');
    loadingTimer = setInterval(() => {
      if (step < loadingSteps.length - 1) {
        if (loadingSteps[step]) loadingSteps[step].classList.replace('active', 'done');
        step++;
        if (loadingSteps[step]) loadingSteps[step].classList.add('active');
      }
    }, 1800);
  }

  function stopLoadingAnimation() {
    if (loadingTimer) { clearInterval(loadingTimer); loadingTimer = null; }
    loadingSteps.forEach(s => { if (s) s.classList.add('done'); });
  }

  /* ---- Show/hide sections ---- */
  function showLoading(url) {
    const loadingUrlEl = document.getElementById('audit-loading-url');
    if (loadingUrlEl) loadingUrlEl.textContent = url;
    loadingSection.style.display = 'block';
    resultsSection.style.display = 'none';
    if (howSection) howSection.style.display = 'none';
    errorEl.style.display = 'none';
    window.scrollTo({ top: loadingSection.offsetTop - 80, behavior: 'smooth' });
    startLoadingAnimation();
  }

  function hideLoading() {
    stopLoadingAnimation();
    loadingSection.style.display = 'none';
  }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Analyze Website <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  }

  /* ---- Render results ---- */
  function renderResults(data) {
    hideLoading();
    resultsSection.style.display = 'block';
    if (howSection) howSection.style.display = 'none';

    // Score ring
    const arc = document.getElementById('audit-score-arc');
    const scoreNum = document.getElementById('audit-score-number');
    const scoreDomain = document.getElementById('audit-score-domain');
    const scoreGrade = document.getElementById('audit-score-grade');

    const score = data.overall_score;
    const circumference = 314;
    const offset = circumference - (score / 100) * circumference;

    if (arc) {
      arc.style.strokeDashoffset = circumference; // reset
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          arc.style.strokeDashoffset = offset;
        });
      });
    }

    // Animate score number
    if (scoreNum) {
      let current = 0;
      const duration = 1200;
      const start = performance.now();
      const easeOut = t => 1 - Math.pow(1 - t, 3);
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        current = Math.round(easeOut(t) * score);
        scoreNum.textContent = current;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    if (scoreDomain) scoreDomain.textContent = data.domain;

    if (scoreGrade) {
      let grade, cls;
      if (score >= 85)      { grade = 'Excellent'; cls = 'grade-excellent'; }
      else if (score >= 65) { grade = 'Good';      cls = 'grade-good'; }
      else if (score >= 45) { grade = 'Needs Work'; cls = 'grade-fair'; }
      else                  { grade = 'Poor';      cls = 'grade-poor'; }
      scoreGrade.textContent = grade;
      scoreGrade.className = `audit-score-grade ${cls}`;
    }

    // Category bars
    const cats = data.categories;
    Object.entries(cats).forEach(([key, val]) => {
      const bar   = document.getElementById(`cat-bar-${key}`);
      const label = document.getElementById(`cat-score-${key}`);
      if (bar) {
        bar.style.width = '0%';
        requestAnimationFrame(() => requestAnimationFrame(() => {
          bar.style.width = `${val}%`;
        }));
      }
      if (label) label.textContent = `${val}`;
    });

    // Summary counts
    const s = data.summary;
    const el = (id) => document.getElementById(id);
    if (el('summary-passed'))   el('summary-passed').textContent   = s.passed;
    if (el('summary-warnings')) el('summary-warnings').textContent = s.warnings;
    if (el('summary-failed'))   el('summary-failed').textContent   = s.failed;

    // Checks list
    renderChecks(data.checks, 'all');

    // Filter buttons
    document.querySelectorAll('.audit-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.audit-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderChecks(data.checks, btn.dataset.filter);
      });
    });

    // CTA contact link — pre-fill URL
    const ctaContact = document.getElementById('audit-cta-contact');
    if (ctaContact) {
      ctaContact.href = `contact.html?url=${encodeURIComponent(data.url)}&service=seo`;
    }

    // "Run another" button
    const runAnother = document.getElementById('audit-run-another');
    if (runAnother) {
      runAnother.addEventListener('click', resetAudit);
    }

    window.scrollTo({ top: resultsSection.offsetTop - 80, behavior: 'smooth' });

    // Trigger reveal animations on results
    setTimeout(() => {
      resultsSection.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    }, 100);
  }

  function renderChecks(checks, filter) {
    const list = document.getElementById('audit-checks-list');
    if (!list) return;

    const filtered = filter === 'all' ? checks : checks.filter(c => c.status === filter);

    // Sort: fail first, then warn, then pass; within each group: critical > high > medium > low
    const statusOrder = { fail: 0, warn: 1, pass: 2 };
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...filtered].sort((a, b) => {
      const sd = statusOrder[a.status] - statusOrder[b.status];
      if (sd !== 0) return sd;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    if (sorted.length === 0) {
      list.innerHTML = '<p style="color:var(--muted);font-size:.88rem;padding:2rem 0;">No checks in this category.</p>';
      return;
    }

    list.innerHTML = sorted.map(check => {
      const icons = {
        pass: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        warn: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        fail: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      };
      return `
        <div class="audit-check-item status-${check.status}">
          <div class="audit-check-icon">${icons[check.status]}</div>
          <div class="audit-check-body">
            <div class="audit-check-title">${escHtml(check.title)}</div>
            <div class="audit-check-desc">${escHtml(check.description)}</div>
            ${check.detail ? `<div class="audit-check-detail">${escHtml(check.detail)}</div>` : ''}
          </div>
          <span class="audit-check-priority priority-${check.priority}">${check.priority}</span>
        </div>`;
    }).join('');
  }

  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function resetAudit() {
    resultsSection.style.display = 'none';
    loadingSection.style.display = 'none';
    if (howSection) howSection.style.display = '';
    errorEl.style.display = 'none';
    urlInput.value = '';
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Analyze Website <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---- Form submit ---- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = urlInput.value.trim();
    if (!raw) {
      showError('Please enter a website URL or domain.');
      return;
    }

    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Analyzing… <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

    showLoading(raw.replace(/^https?:\/\//, '').split('/')[0]);

    try {
      const res = await fetch(EDGE_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ url: raw }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        hideLoading();
        if (howSection) howSection.style.display = '';
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Analyze Website <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
        showError(json.error || 'Something went wrong. Please try again.');
        return;
      }

      renderResults(json.data);
    } catch (err) {
      console.error('Audit error:', err);
      hideLoading();
      if (howSection) howSection.style.display = '';
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Analyze Website <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
      showError('Unable to connect to the audit service. Please try again in a moment.');
    }
  });

  // Allow pressing Enter in input
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') form.dispatchEvent(new Event('submit'));
  });

})();

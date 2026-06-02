/* ============================================
   INSIDE LEADS — contact.js
   Contact form → contact-submission edge function
   + URL param pre-fill from SEO audit CTA
   ============================================ */

(function () {

  const CONTACT_FN_URL = `${SUPABASE_URL}/functions/v1/contact-submission`;

  /* ---- Pre-fill from URL params (?url=...&service=seo) ---- */
  const params = new URLSearchParams(window.location.search);
  const preService = params.get('service');
  const preUrl     = params.get('url');

  if (preService) {
    const serviceEl = document.getElementById('service');
    if (serviceEl) {
      const map = {
        seo:    'SEO',
        ppc:    'PPC',
        web:    'Web Development',
        social: 'Social Media',
        local:  'Local SEO',
        ai:     'AI Consulting',
      };
      const val = map[preService.toLowerCase()] || preService;
      for (let i = 0; i < serviceEl.options.length; i++) {
        if (serviceEl.options[i].value === val) {
          serviceEl.selectedIndex = i;
          break;
        }
      }
    }
  }

  if (preUrl) {
    const websiteEl = document.getElementById('website');
    if (websiteEl) websiteEl.value = decodeURIComponent(preUrl);
  }

  /* ---- Form submit ---- */
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = form.querySelector('[type="submit"]');
    const msg = form.querySelector('.form-message');

    const originalHtml = btn.innerHTML;
    btn.innerHTML = 'Sending… <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
    btn.disabled = true;
    if (msg) msg.className = 'form-message';

    const payload = {
      service:     (document.getElementById('service')?.value     || '').trim(),
      budget:      (document.getElementById('budget')?.value      || '').trim(),
      name:        (document.getElementById('name')?.value        || '').trim(),
      company:     (document.getElementById('company')?.value     || '').trim(),
      email:       (document.getElementById('email')?.value       || '').trim(),
      phone:       (document.getElementById('phone')?.value       || '').trim(),
      website:     (document.getElementById('website')?.value     || '').trim(),
      description: (document.getElementById('description')?.value || '').trim(),
      notes:       (document.getElementById('notes')?.value       || '').trim(),
      source:      'contact_page',
    };

    try {
      const res = await fetch(CONTACT_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || 'Submission failed');
      }

      if (msg) {
        msg.className = 'form-message success';
        msg.textContent = 'Thank you! Our team will reach out shortly to schedule your consult.';
      }
      form.reset();

      // Reset to step 1
      const formPanels = document.querySelectorAll('.form-panel');
      const stepIndicators = document.querySelectorAll('.form-step-indicator');
      formPanels.forEach((p, i) => p.classList.toggle('active', i === 0));
      stepIndicators.forEach((s, i) => {
        s.classList.toggle('active', i === 0);
        s.classList.remove('done');
      });

    } catch (err) {
      console.error('Contact form error:', err);
      if (msg) {
        msg.className = 'form-message error';
        msg.textContent = 'Sorry, something went wrong. Please try again or email us at john@getinsideleads.com.';
      }
    } finally {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
    }
  });

})();

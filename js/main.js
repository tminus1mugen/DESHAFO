/* ===================================================
   DESHAFO INTEGRATED CBO — Main JavaScript
   =================================================== */

/* ─────────────────────────────────────────────────
   SPA ROUTER — smooth page transitions without reload
   Only activates when served over http/https.
   On file:// protocol, links work normally (no fetch).
   ───────────────────────────────────────────────── */
(function initRouter() {
  // Don't intercept on file:// — fetch() is blocked there
  const isHTTP = location.protocol === 'http:' || location.protocol === 'https:';
  if (!isHTTP) return;

  const SKIP_EXTS = /\.(pdf|jpg|jpeg|png|gif|webp|svg|zip|mp4|mp3)$/i;
  const MAIN_ID   = 'spa-main';

  /* Wrap the page body (between .mobile-nav and footer) in a swappable div */
  function wrapMain() {
    if (document.getElementById(MAIN_ID)) return document.getElementById(MAIN_ID);
    const mobileNav = document.querySelector('.mobile-nav');
    const footer    = document.querySelector('footer');
    if (!mobileNav || !footer) return null;
    const wrap = document.createElement('div');
    wrap.id = MAIN_ID;
    wrap.style.cssText = 'opacity:1;transition:opacity 0.2s ease;';
    const nodes = [];
    let cur = mobileNav.nextSibling;
    while (cur && cur !== footer) { nodes.push(cur); cur = cur.nextSibling; }
    if (nodes.length) { nodes[0].parentNode.insertBefore(wrap, nodes[0]); nodes.forEach(n => wrap.appendChild(n)); }
    return wrap;
  }

  /* Parse fetched HTML — extract content + page-specific styles */
  function parseDoc(html) {
    const doc     = new DOMParser().parseFromString(html, 'text/html');
    const title   = doc.title;
    const mobileNav = doc.querySelector('.mobile-nav');
    const footer  = doc.querySelector('footer');
    if (!mobileNav || !footer) return { title, frag: null, styles: '' };
    const nodes = [];
    let n = mobileNav.nextSibling;
    while (n && n !== footer) { nodes.push(n); n = n.nextSibling; }
    const frag = document.createDocumentFragment();
    nodes.forEach(node => frag.appendChild(node));
    const styles = Array.from(doc.querySelectorAll('head style')).map(s => s.outerHTML).join('');
    return { title, frag, styles };
  }

  /* Highlight the active nav link */
  function setActive(href) {
    const page = href.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-left a, .nav-right a, .mobile-nav a').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === page);
    });
  }

  /* Navigate to a new page */
  async function navigate(href, push) {
    const main = document.getElementById(MAIN_ID);
    if (!main) return;
    main.style.opacity = '0';
    try {
      const html = await (await fetch(href)).text();
      const { title, frag, styles } = parseDoc(html);
      // Swap page-specific styles
      document.querySelectorAll('style[data-spa]').forEach(s => s.remove());
      if (styles) {
        const el = document.createElement('div');
        el.setAttribute('data-spa', '');
        el.innerHTML = styles;
        document.head.appendChild(el);
      }
      main.innerHTML = '';
      if (frag) main.appendChild(frag);
      document.title = title;
      if (push) history.pushState({ href }, title, href);
      setActive(href);
      window.scrollTo({ top: 0 });
      main.style.opacity = '1';
      initPageFeatures();
    } catch(err) {
      // Fallback: normal navigation
      location.href = href;
    }
  }

  /* Intercept all internal link clicks */
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('//') ||
        href.startsWith('mailto:') || href.startsWith('tel:') ||
        href.startsWith('#') || SKIP_EXTS.test(href)) return;
    e.preventDefault();
    // Close mobile menu
    document.querySelector('.hamburger')?.classList.remove('open');
    const mn = document.querySelector('.mobile-nav');
    if (mn) { mn.classList.remove('open'); document.body.style.overflow = ''; }
    // Same page — just scroll up
    const current = location.pathname.split('/').pop() || 'index.html';
    if (href === current) { window.scrollTo({ top: 0 }); return; }
    await navigate(href, true);
  });

  window.addEventListener('popstate', (e) => {
    const href = e.state?.href || location.pathname.split('/').pop() || 'index.html';
    navigate(href, false);
  });

  document.addEventListener('DOMContentLoaded', () => {
    wrapMain();
    const page = location.pathname.split('/').pop() || 'index.html';
    history.replaceState({ href: page }, document.title, page);
    setActive(page);
  });
})();


/* ─────────────────────────────────────────────────
   PAGE FEATURES — re-run after every SPA navigation
   ───────────────────────────────────────────────── */
function initPageFeatures() {
  initScrollReveal();
  initCounters();
  initGalleryLightbox();
  initForms();
  initPasswordToggles();
  initOrbit();
}

function initScrollReveal() {
  const els = document.querySelectorAll('.reveal:not(.visible)');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  els.forEach(el => obs.observe(el));
}

function initCounters() {
  const els = document.querySelectorAll('.count-up:not([data-counted])');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.setAttribute('data-counted', '');
      const target = parseInt(el.dataset.target, 10);
      const suffix = el.dataset.suffix || '';
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / 1800, 1);
        el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });
  els.forEach(el => obs.observe(el));
}

function initGalleryLightbox() {
  document.querySelectorAll('.gallery-item:not([data-lb]),.gallery-preview-item:not([data-lb])').forEach(item => {
    item.setAttribute('data-lb', '');
    item.addEventListener('click', () => {
      item.style.outline = '3px solid var(--gold)';
      setTimeout(() => item.style.outline = '', 600);
    });
  });
}

function initForms() {
  document.querySelectorAll('form:not([data-bound])').forEach(form => {
    form.setAttribute('data-bound', '');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      if (!btn) return;
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Submitted!';
      btn.style.cssText = 'background:var(--green);color:#fff;';
      setTimeout(() => { btn.innerHTML = orig; btn.style.cssText = ''; }, 2500);
    });
  });
}

function initPasswordToggles() {
  const EYE = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const EYEOFF = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
  document.querySelectorAll('.pw-toggle:not([data-bound])').forEach(t => {
    t.setAttribute('data-bound', '');
    t.innerHTML = EYE;
    t.addEventListener('click', () => {
      const inp = t.parentElement.querySelector('input');
      if (!inp) return;
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      t.innerHTML = show ? EYEOFF : EYE;
    });
  });
}

function initOrbit() {
  const el = document.getElementById('orbitVisual');
  if (!el || el._orbit) return;
  // Disable orbit on mobile (screen width <= 768px) or if element is hidden
  if (window.innerWidth <= 768 || el.offsetWidth === 0 || el.offsetHeight === 0) return;
  el._orbit = true;
  const nodes = Array.from(el.querySelectorAll('.orbit-node'));
  if (!nodes.length) return;
  let angle = -Math.PI / 2, paused = false;
  const RADIUS = 196, SPEED = 0.007;
  const tick = () => {
    if (!el.isConnected) return;
    // Stop if element becomes hidden or window resized to mobile
    if (window.innerWidth <= 768 || el.offsetWidth === 0 || el.offsetHeight === 0) return;
    if (!paused) angle += SPEED;
    const cx = el.offsetWidth / 2, cy = el.offsetHeight / 2;
    nodes.forEach((n, i) => {
      const a = angle + i * Math.PI * 2 / nodes.length;
      n.style.left = (cx + RADIUS * Math.cos(a)) + 'px';
      n.style.top  = (cy + RADIUS * Math.sin(a)) + 'px';
      const tip = n.querySelector('.orbit-tooltip');
      if (tip) {
        if (cy + RADIUS * Math.sin(a) > cy) { tip.style.top = 'auto'; tip.style.bottom = 'calc(100% + 12px)'; }
        else { tip.style.bottom = 'auto'; tip.style.top = 'calc(100% + 12px)'; }
      }
    });
    requestAnimationFrame(tick);
  };
  nodes.forEach(n => {
    n.addEventListener('mouseenter', () => paused = true);
    n.addEventListener('mouseleave', () => paused = false);
  });
  requestAnimationFrame(tick);
}

/* ── Persistent behaviours (navbar, hamburger) — run once ── */
document.addEventListener('DOMContentLoaded', () => {
  // Navbar scroll shadow
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 40), { passive: true });
  }

  // Hamburger toggle
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });
  }

  // Active nav link on first load
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-left a, .nav-right a, .mobile-nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === page);
  });

  // Run page features on first load
  initPageFeatures();
});

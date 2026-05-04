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
        href.startsWith('javascript:') || href.startsWith('#') || SKIP_EXTS.test(href)) return;
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
      const action = form.getAttribute('action');
      
      // Allow native submission for FormSubmit so activation and CAPTCHA work correctly
      if (action && action.includes('formsubmit.co')) {
        const btn = form.querySelector('[type="submit"]');
        if (btn) btn.innerHTML = 'Redirecting...';
        return; 
      }

      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      if (!btn) return;
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Submitted!';
      btn.style.cssText = 'background:var(--green);color:#fff;';
      form.reset();
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

/* ─────────────────────────────────────────────────
   GLOBAL LIGHTBOX FUNCTIONS
   ───────────────────────────────────────────────── */
const galleryOrder = [
  { id: 'deshafoteens', src: 'assets/images/deshafoteens.jpeg', title: 'Deshafo Teens and MOSA Youth join forces for a shoreline clean-up at the Lake Victoria Pier in Homabay.' },
  { id: 'community2', src: 'assets/images/community2.jpeg', title: 'Community women accessing clean, solar-pumped water from the newly drilled borehole at Deshafo Integrated School.' },
  { id: 'photo2', src: 'assets/images/photo2.jpeg', title: 'Learners practicing proper hand hygiene with running water after their environmental conservation activities.' },
  { id: 'photo3', src: 'assets/images/photo3.jpeg', title: 'Instilling lifelong health and hygiene practices through post-activity handwashing.' },
  { id: 'foodsec', src: 'assets/images/foodsec.jpeg', title: 'Food Security in Action: Drilled water enables students to plant and nurture their own crops in the school garden.' },
  { id: 'foodsec2', src: 'assets/images/foodsec2.jpeg', title: 'Harvest Time: Reaping the benefits of sustainable agriculture and reliable water access at the school.' },
  { id: 'vid', src: 'assets/images/vid.mp4', title: 'Practical Learning: Students engage in hands-on education about the nutritional value of the foods they cultivate.' },
  { id: 'wash', src: 'assets/images/wash.jpeg', title: 'Promoting health and hygiene during the DESHAFO Character & Purpose Mentorship Program.' },
  { id: 'wash2', src: 'assets/images/wash2.jpeg', title: 'Mentorship participants washing hands, reinforcing the importance of sanitation in youth development.' },
  { id: 'edu1', src: 'assets/images/edu1.jpeg', title: 'Empowering children through CBC curriculum guidance and active learning.' },
  { id: 'edu2', src: 'assets/images/edu2.jpeg', title: 'Students actively participating in an academic support session.' },
  { id: 'edu3', src: 'assets/images/edu3.jpeg', title: 'Teacher and student sharing a joyful moment during an education session.' },
  { id: 'edu4', src: 'assets/images/edu4.jpeg', title: 'Students gathered for an outdoor learning and assembly session.' },
  { id: 'climm1', src: 'assets/images/climm1.jpeg', title: 'Youth climate ambassadors leading a local tree planting drive.' },
  { id: 'climm2', src: 'assets/images/climm2.jpeg', title: 'Integrating climate literacy into practical school activities.' },
  { id: 'climm3', src: 'assets/images/climm3.jpeg', title: 'Community-led climate action protecting local ecosystems.' },
  { id: 'gretech1', src: 'assets/images/gretech1.jpeg', title: 'Children enthusiastically participating in outdoor games and dancing at the GRETECHI Conference.' },
  { id: 'gretech2', src: 'assets/images/gretech2.jpeg', title: 'Children attentively listening during an outdoor teaching session under a tent at the GRETECHI Conference.' },
  { id: 'gretech3', src: 'assets/images/gretech3.jpeg', title: 'Children showcasing their creative crafts and learning new skills with mentors.' },
  { id: 'gretech4', src: 'assets/images/gretech4.jpeg', title: 'The official poster and invitation for the annual GRETECHI Conference.' },
  { id: 'teen1', src: 'assets/images/teen1.jpeg', title: 'Empowering teen mothers through psychosocial counselling and peer support.' },
  { id: 'teen2', src: 'assets/images/teen2.jpeg', title: 'School reintegration advocacy and life skills training for young mothers.' },
  { id: 'teenvid', src: 'assets/images/teenvid.mp4', title: 'Video: Teen mother reintegration and community sensitization in action.' },
  { id: 'comm1', src: 'assets/images/comm1.jpeg', title: 'Community outreach program engagement.' },
  { id: 'comm2', src: 'assets/images/comm2.jpeg', title: 'Local community leadership and development.' },
  { id: 'comm', src: 'assets/images/comm3.jpeg', title: 'Village Dialogue: A participatory community forum where residents voice their concerns, share success stories, and collaborate on local solutions for education, health, and climate resilience.' },
  { id: 'community', src: 'assets/images/community.jpg', title: 'Community engagement and outreach.' },
  { id: 'kidsvid', src: 'assets/images/kids.mp4', title: 'Video: Outdoor games and team-building at the GRETECHI Conference.' },
  { id: 'gretech5vid', src: 'assets/images/gretech5.mp4', title: 'Video: Boarder registration day 1 at the GRETECHI Conference.' },
  { id: 'sfpvid', src: 'assets/images/sfp.mp4', title: 'Video: School feeding program providing nutritious meals to students.' },
  { id: 'tmpvid', src: 'assets/images/tmp.mp4', title: 'Video: Teen membership program orientation and activities.' },
  { id: 'plvid', src: 'assets/images/pl.mp4', title: 'Video: Students engaged in hands-on practical lessons.' },
  { id: 'tpvid', src: 'assets/images/tp.mp4', title: 'Video: Tree planting activity as part of our climate action program.' },
  { id: 'tp2vid', src: 'assets/images/tp2.mp4', title: 'Video: Community-led tree planting in Homabay County.' },
  { id: 'wash3vid', src: 'assets/images/wash3.mp4', title: 'Video: Pupils washing their hands.' },
  { id: 'wash4vid', src: 'assets/images/wash4.mp4', title: 'Video: Teens washing their hands.' },
  { id: 'kmvid', src: 'assets/images/km.mp4', title: 'Video: Kid mentorship program and celebrations.' },
  { id: 'wsvid', src: 'assets/images/ws.mp4', title: 'Video: Final touches on the water supply project.' },
  { id: 'ws2vid', src: 'assets/images/ws2.mp4', title: 'Video: Borehole drilling for sustainable water access.' },
  { id: 'ficvid', src: 'assets/images/fic.mp4', title: 'Video: Pupils first in command.' },
  { id: 'pwdvid', src: 'assets/images/PWD.mp4', title: 'Video: Teacher representing people with disabilities.' },
  { id: 'ecdvid', src: 'assets/images/ECD.mp4', title: 'Video: ECD graduation ceremony 2025.' },
  { id: 'sfvid', src: 'assets/images/sf.mp4', title: 'Video: School farm cultivation and agricultural learning.' }
];

let currentLbIndex = 0;

window.openLightbox = function(id, title) {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  const inner = document.querySelector('.lightbox-inner');

  let src = null;
  const idx = galleryOrder.findIndex(item => item.id === id);
  if (idx !== -1) {
    currentLbIndex = idx;
    src = galleryOrder[idx].src;
    title = title || galleryOrder[idx].title;
  }
  inner.innerHTML = '';

  if (src && src.endsWith('.mp4')) {
    const vid = document.createElement('video');
    vid.src = src;
    vid.controls = true;
    vid.autoplay = true;
    vid.className = 'lightbox-img';
    inner.appendChild(vid);
  } else {
    const img = document.createElement('img');
    img.src = src || 'assets/images/photo1.jpg';
    img.alt = title;
    img.className = 'lightbox-img';
    inner.appendChild(img);
  }

  const caption = document.createElement('div');
  caption.className = 'lightbox-caption';
  caption.innerText = title;
  inner.appendChild(caption);

  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
};

window.closeLightbox = function() {
  const lb = document.getElementById('lightbox');
  if (lb) {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    const inner = document.querySelector('.lightbox-inner');
    if (inner) inner.innerHTML = ''; // Stop video playing when closed
  }
};

document.addEventListener('click', function(e) {
  if (e.target && e.target.id === 'lightbox') window.closeLightbox();
});

document.addEventListener('keydown', (e) => {
  const lb = document.getElementById('lightbox');
  if (!lb || !lb.classList.contains('open')) return;
  
  if (e.key === 'Escape') window.closeLightbox();
  if (e.key === 'ArrowLeft') window.navigateLightbox(-1);
  if (e.key === 'ArrowRight') window.navigateLightbox(1);
});

window.navigateLightbox = function(direction) {
  if (!galleryOrder.length) return;
  currentLbIndex = (currentLbIndex + direction + galleryOrder.length) % galleryOrder.length;
  const next = galleryOrder[currentLbIndex];
  window.openLightbox(next.id, next.title);
};

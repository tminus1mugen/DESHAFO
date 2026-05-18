/* ===================================================
   DESHAFO INTEGRATED CBO — Main JavaScript
   =================================================== */

/* ─────────────────────────────────────────────────
   TOP PROGRESS BAR — works on all protocols
   ───────────────────────────────────────────────── */
const Progress = (function() {
  let el, styleAdded = false, t1, t2;
  function bar() {
    if (!el) {
      if (!styleAdded) {
        const s = document.createElement('style');
        s.textContent = '#nav-progress{position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,#D9B24C,#F0D57A);z-index:99999;opacity:0;pointer-events:none;border-radius:0 2px 2px 0;box-shadow:0 0 10px rgba(217,178,76,0.5);}';
        document.head.appendChild(s);
        styleAdded = true;
      }
      el = document.createElement('div');
      el.id = 'nav-progress';
      document.body.appendChild(el);
    }
    return el;
  }
  function start() {
    clearTimeout(t1); clearTimeout(t2);
    const b = bar();
    b.style.transition = 'none';
    b.style.width = '0'; b.style.opacity = '1';
    void b.offsetHeight;
    b.style.transition = 'width 0.35s cubic-bezier(0.4,0,0.2,1)';
    b.style.width = '25%';
    t1 = setTimeout(() => { b.style.transition = 'width 1.2s cubic-bezier(0.4,0,0.2,1)'; b.style.width = '75%'; }, 350);
  }
  function done() {
    clearTimeout(t1); clearTimeout(t2);
    const b = bar();
    b.style.transition = 'width 0.2s ease, opacity 0.35s ease 0.15s';
    b.style.width = '100%';
    t2 = setTimeout(() => { b.style.opacity = '0'; }, 150);
    t2 = setTimeout(() => { b.style.transition = 'none'; b.style.width = '0'; }, 550);
  }
  return { start, done };
})();

/* On file:// protocol, show the bar on link click (page will reload naturally) */
(function() {
  const SKIP_EXTS = /\.(pdf|jpg|jpeg|png|gif|webp|svg|zip|mp4|mp3)$/i;
  if (location.protocol !== 'file:') return;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('//') ||
        href.startsWith('mailto:') || href.startsWith('tel:') ||
        href.startsWith('javascript:') || href.startsWith('#') || SKIP_EXTS.test(href)) return;
    Progress.start();
  });
})();

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
    wrap.style.cssText = 'opacity:1;transform:translateY(0);transition:opacity 0.25s cubic-bezier(0.4,0,0.2,1),transform 0.25s cubic-bezier(0.4,0,0.2,1);';
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

    Progress.start();

    // Fade out + slide down slightly
    main.style.transition = 'opacity 0.22s cubic-bezier(0.4,0,0.2,1),transform 0.22s cubic-bezier(0.4,0,0.2,1)';
    main.style.opacity = '0';
    main.style.transform = 'translateY(12px)';

    // Wait for fade-out to finish before swapping content
    await new Promise(r => setTimeout(r, 230));

    try {
      const [pagePath, hash] = href.split('#');
      const html = await (await fetch(pagePath)).text();
      const { title, frag, styles } = parseDoc(html);

      // Swap page-specific styles
      document.querySelectorAll('style[data-spa]').forEach(s => s.remove());
      if (styles) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = styles;
        tempDiv.querySelectorAll('style').forEach(origStyle => {
          const newStyle = document.createElement('style');
          newStyle.setAttribute('data-spa', '');
          newStyle.textContent = origStyle.textContent;
          document.head.appendChild(newStyle);
        });
      }

      main.innerHTML = '';
      if (frag) main.appendChild(frag);
      document.title = title;
      if (push) history.pushState({ href }, title, href);
      setActive(href);

      if (hash) {
        const target = document.getElementById(hash);
        if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        else window.scrollTo({ top: 0 });
      } else {
        window.scrollTo({ top: 0 });
      }

      // Position above, no transition, then animate in
      main.style.transition = 'none';
      main.style.transform = 'translateY(-10px)';
      void main.offsetHeight; // force reflow

      main.style.transition = 'opacity 0.35s cubic-bezier(0.4,0,0.2,1),transform 0.35s cubic-bezier(0.4,0,0.2,1)';
      main.style.opacity = '1';
      main.style.transform = 'translateY(0)';

      Progress.done();
      initPageFeatures();
    } catch(err) {
      Progress.done();
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
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, {
    threshold: 0.02,
    rootMargin: '0px 0px -20px 0px'
  });
  // Immediate check for elements in viewport
  setTimeout(() => {
    els.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 100) {
        el.classList.add('visible');
        obs.unobserve(el);
      }
    });
  }, 50);
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
  { id: 'deshafoteens', src: 'assets/images/deshafoteens.jpeg', title: 'Lake Victoria Shoreline Clean-up: DESHAFO Teens partner with MOSA Youth to remove plastic waste and restore the ecological health of Lake Victoria, Kenya\'s largest freshwater resource, protecting ecosystems and community livelihoods in Homabay County.' },
  { id: 'community2', src: 'assets/images/community2.jpeg', title: 'Solar-Powered Water Access: Local women and children celebrate clean water from a solar-powered borehole at DESHAFO Integrated School — a transformation that reduces waterborne disease, saves time, and supports school gardening in Homabay County.' },
  { id: 'photo2', src: 'assets/images/photo2.jpeg', title: 'Handwashing Heroes: Learners master life‑saving hygiene practices after environmental activities, building habits that reduce disease and keep families thriving in rural Homabay.' },
  { id: 'photo3', src: 'assets/images/photo3.jpeg', title: 'Lifelong Sanitation: Post‑activity handwashing becomes a ritual of care, instilling hygiene values that last a lifetime in young learners across Homabay County.' },
  { id: 'foodsec', src: 'assets/images/foodsec.jpeg', title: 'School Gardens for Food Security: With reliable water from the borehole, students plant and nurture nutritious crops, learning agriculture that feeds families and builds resilience against drought in Homabay.' },
  { id: 'foodsec2', src: 'assets/images/foodsec2.jpeg', title: 'Harvest of Hope: Students reap the rewards of their garden — fresh vegetables that nourish the school community and demonstrate the power of sustainable agriculture at DESHAFO Integrated School.' },
  { id: 'vid', src: 'assets/images/vid.mp4', title: 'From Soil to Plate: A hands‑on lesson where students discover where food comes from, the nutrients it provides, and the pride of growing their own produce at DESHAFO Integrated School.' },
  { id: 'wash', src: 'assets/images/wash.jpeg', title: 'Clean Hands, Bright Futures: The DESHAFO Character & Purpose Mentorship Program weaves health messages into sessions that shape responsible, healthy youth across Homabay.' },
  { id: 'wash2', src: 'assets/images/wash2.jpeg', title: 'Sanitation Champions: Mentorship participants practice proper handwashing — a simple act that prevents diarrheal disease and keeps schools safe in rural communities.' },
  { id: 'edu1', src: 'assets/images/edu1.jpeg', title: 'CBC in Action: Teachers guide learners through the Competency‑Based Curriculum, fostering critical thinking, creativity, and real‑world skills at DESHAFO Integrated School.' },
  { id: 'edu2', src: 'assets/images/edu2.jpeg', title: 'Active Learning: Students participate in an academic support session, asking questions and building confidence in core subjects with DESHAFO mentors.' },
  { id: 'edu3', src: 'assets/images/edu3.jpeg', title: 'Joy in Education: A teacher shares a moment of connection with a student, embodying DESHAFO\'s supportive, child‑centered approach to learning in Homabay County.' },
  { id: 'edu4', src: 'assets/images/edu4.jpeg', title: 'Outdoor Assembly: Students gather for an open‑air lesson, combining education with fresh air and community spirit at DESHAFO Integrated School.' },
  { id: 'climm1', src: 'assets/images/climm1.jpeg', title: 'Youth Climate Ambassadors: Young leaders drive a local tree planting drive, combating deforestation and building climate resilience one seedling at a time in Homabay County.' },
  { id: 'climm2', src: 'assets/images/climm2.jpeg', title: 'Climate Literacy in Practice: Students get their hands dirty planting trees, linking classroom lessons to real environmental stewardship and ecosystem restoration.' },
  { id: 'climm3', src: 'assets/images/climm3.jpeg', title: 'Community‑Led Climate Action: Residents plant trees to restore watersheds, safeguard biodiversity, and build long‑term climate resilience for future generations.' },
  { id: 'gretech1', src: 'assets/images/gretech1.jpeg', title: 'Playful Learning at GRETECHI: Children dance, play games, and build teamwork at the annual four‑day GRETECHI Conference — a celebration of youth potential and purpose in Homabay.' },
  { id: 'gretech2', src: 'assets/images/gretech2.jpeg', title: 'Focused Under the Tent: Children attentively listen during an outdoor teaching session at the GRETECHI Conference — where education meets adventure and mentorship.' },
  { id: 'gretech3', src: 'assets/images/gretech3.jpeg', title: 'Creative Crafts & Mentorship: Children showcase handmade projects and learn new skills from dedicated mentors during the GRETECHI Conference, sparking imagination and confidence.' },
  { id: 'gretech4', src: 'assets/images/gretech4.jpeg', title: 'GRETECHI Conference 2025: The official poster and invitation to a transformative four‑day event that empowers children through mentorship, skills training, and purpose‑driven activities in Homabay.' },
  { id: 'teen1', src: 'assets/images/teen1.jpeg', title: 'Teen Mother Support: Young mothers find psychosocial counselling, peer solidarity, and hope in a safe space that encourages them to dream again at DESHAFO.' },
  { id: 'teen2', src: 'assets/images/teen2.jpeg', title: 'Back to School Advocacy: Teen mothers receive life‑skills training and community support to return to education, breaking cycles of poverty and early pregnancy in Homabay.' },
  { id: 'teenvid', src: 'assets/images/teenvid.mp4', title: 'Reintegration in Action: Teen mothers share their stories, participate in community sensitization, and reclaim their education — proving that second chances create lasting change in Homabay.' },
  { id: 'comm1', src: 'assets/images/comm1.jpeg', title: 'Community Leadership in Action: Local elders and stakeholders gather to discuss sustainable development initiatives for outbram village, fostering grassroots participation in community-driven change.' },
  { id: 'comm2', src: 'assets/images/comm2.jpeg', title: 'Local Capacity Building: Community members actively participate in a training session focused on environmental conservation, health advocacy, and economic empowerment — key pillars of DESHAFO\'s grassroots approach.' },
  { id: 'comm', src: 'assets/images/comm3.jpeg', title: 'Village Dialogue: A participatory community forum where residents voice their concerns, share success stories, and collaborate on local solutions for education, health, and climate resilience.' },
  { id: 'community', src: 'assets/images/community.jpg', title: 'Grassroots Mobilization: DESHAFO team members engage directly with community members in Homabay County, building trust, raising awareness, and mobilizing support for youth and women-led programs.' },
  { id: 'kidsvid', src: 'assets/images/kids.mp4', title: 'GRETECHI Games & Team‑Building: Energetic outdoor activities where children learn cooperation, leadership, and joy through play at the GRETECHI Conference in Homabay.' },
  { id: 'gretech5vid', src: 'assets/images/gretech5.mp4', title: 'GRETECHI Boarder Registration Day 1: New arrivals check‑in, receive mentorship materials, and begin their transformative journey at the annual GRETECHI Conference.' },
  { id: 'sfpvid', src: 'assets/images/sfp.mp4', title: 'Nourishing Young Minds: The School Feeding Program serves balanced meals that improve attendance, concentration, and overall health at DESHAFO Integrated School.' },
  { id: 'tmpvid', src: 'assets/images/tmp.mp4', title: 'Teen Membership Orientation: Adolescents join DESHAFO\'s network, discovering opportunities for leadership, skills training, and peer support in Homabay County.' },
  { id: 'plvid', src: 'assets/images/pl.mp4', title: 'Practical Learning in Action: Students conduct experiments and apply theory in hands‑on classroom experiences that deepen understanding of key subjects at DESHAFO.' },
  { id: 'tpvid', src: 'assets/images/tp.mp4', title: 'Tree Planting for Climate Action: Learners plant native trees on school grounds, combating climate change while beautifying their environment and learning environmental stewardship.' },
  { id: 'tp2vid', src: 'assets/images/tp2.mp4', title: 'Community Tree Planting: Neighbors, youth, and elders unite to plant hundreds of trees across Homabay, restoring watersheds and protecting natural resources for future generations.' },
  { id: 'wash3vid', src: 'assets/images/wash3.mp4', title: 'Pupil Handwashing Demonstration: Young children correctly wash hands with soap and water, mastering hygiene habits that keep families healthy in rural communities.' },
  { id: 'wash4vid', src: 'assets/images/wash4.mp4', title: 'Teen Hygiene Leaders: Adolescents model proper handwashing for younger students, becoming peer educators in health and sanitation across Homabay schools.' },
  { id: 'kmvid', src: 'assets/images/km.mp4', title: 'Kid Mentorship Celebrations: Children are recognized for achievements, their big smiles reflecting the confidence built through DESHAFO\'s mentorship programs.' },
  { id: 'wsvid', src: 'assets/images/ws.mp4', title: 'Water Project Finishing Touches: Community members add final details to a new water supply system that will provide clean, reliable water for years to come at DESHAFO.' },
  { id: 'ws2vid', src: 'assets/images/ws2.mp4', title: 'Borehole Drilling in Progress: A drilling rig penetrates dry earth, promising transformative access to groundwater for the school and surrounding villages in Homabay County.' },
  { id: 'ficvid', src: 'assets/images/fic.mp4', title: 'Pupils First in Command: Students take leadership roles in school activities, building confidence and responsibility through DESHAFO\'s empowerment programs.' },
  { id: 'pwdvid', src: 'assets/images/PWD.mp4', title: 'Inclusion Matters: A dedicated teacher advocates for learners with disabilities, ensuring accessible education and equal opportunity for every child at DESHAFO.' },
  { id: 'ecdvid', src: 'assets/images/ECD.mp4', title: 'ECD Graduation Ceremony 2025: Young graduates don caps and gowns, marking a milestone in early childhood education and setting the stage for lifelong learning at DESHAFO.' },
  { id: 'sfvid', src: 'assets/images/sf.mp4', title: 'School Farm Cultivation: Tending crops and livestock, students learn agricultural science while supplying fresh produce for school meals and community markets at DESHAFO.' }
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

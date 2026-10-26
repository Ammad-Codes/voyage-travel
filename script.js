document.documentElement.classList.add('js');

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce;
const root = document.documentElement;
const body = document.body;
const header = document.getElementById('header');
const progress = document.getElementById('progress');
const heroBg = document.getElementById('heroBg');
let lastY = 0;
let ticking = false;

/* Split a heading into letters or words */
function splitText(el) {
  const mode = el.dataset.split;
  const text = el.textContent.trim();
  const parts = mode === 'letters' ? [...text] : text.split(' ');
  const cls = mode === 'letters' ? 'ch' : 'wd';
  el.textContent = '';
  el.classList.add('split');
  el.setAttribute('aria-label', text);
  /* FIX: in letters mode keep each word together so it never breaks mid-word */
  let holder = el;
  parts.forEach((part, i) => {
    if (mode === 'letters' && (!holder || holder === el || part === ' ')) {
      if (part === ' ') { el.appendChild(document.createTextNode(' ')); holder = null; return; }
      holder = document.createElement('span');
      holder.className = 'word';
      holder.setAttribute('aria-hidden', 'true');
      el.appendChild(holder);
    }
    const span = document.createElement('span');
    span.className = cls;
    span.style.setProperty('--i', i);
    span.setAttribute('aria-hidden', 'true');
    span.textContent = part === ' ' ? '\u00a0' : part;
    (mode === 'letters' ? holder : el).appendChild(span);
    if (mode === 'words' && i < parts.length - 1) el.appendChild(document.createTextNode(' '));
  });
}

/* Typewriter that types and deletes destination words */
function typeWords(el, words) {
  let w = 0, c = 0, deleting = false;
  const tick = () => {
    const word = words[w];
    c += deleting ? -1 : 1;
    el.textContent = word.slice(0, c);
    let delay = deleting ? 55 : 110;
    if (!deleting && c === word.length) { deleting = true; delay = 1600; }
    else if (deleting && c === 0) { deleting = false; w = (w + 1) % words.length; delay = 300; }
    setTimeout(tick, delay);
  };
  tick();
}

/* Count-up numbers */
function animateCount(el) {
  const target = Number(el.dataset.count);
  if (reduce) { el.textContent = target.toLocaleString('en-US'); return; }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / 1600);
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))).toLocaleString('en-US');
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function onRevealed(el) {
  el.querySelectorAll('[data-count]').forEach(animateCount);
}

/* Scroll reveal for [data-reveal] and [data-split] */
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in');
    io.unobserve(entry.target);
    onRevealed(entry.target);
  });
}, { threshold: 0.2 });

/* FIX: clip-path reveals start almost fully clipped, so a 0.2 threshold can never be met.
   They get their own observer that fires once any part is visible. */
const ioClip = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in');
    ioClip.unobserve(entry.target);
    onRevealed(entry.target);
  });
}, { threshold: 0, rootMargin: '0px 0px -10% 0px' });

/* Image skeleton: fade in when loaded */
function initImages() {
  document.querySelectorAll('.media img').forEach((img) => {
    const box = img.parentElement;
    const done = () => { img.classList.add('loaded'); box.classList.add('is-loaded'); };
    if (img.complete && img.naturalWidth > 0) done();
    else {
      img.addEventListener('load', done);
      /* FIX: if an image fails, do not leave the shimmer running forever */
      img.addEventListener('error', () => { box.classList.add('is-loaded'); });
    }
  });
}

/* Sticky story: change the image as steps scroll by */
function setActiveStep(i) {
  document.querySelectorAll('.step').forEach((s, n) => s.classList.toggle('active', n === i));
  document.querySelectorAll('.stage img').forEach((img, n) => img.classList.toggle('active', n === i));
}

const stepIO = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) setActiveStep(Number(entry.target.dataset.step));
  });
}, { rootMargin: '-45% 0px -45% 0px' });

/* Filter chips with fade and scale */
function applyFilter(cat) {
  document.querySelectorAll('.col[data-cat]').forEach((col) => {
    const show = cat === 'all' || col.dataset.cat === cat;
    col.style.transitionDelay = '0ms';
    if (show) {
      col.style.display = '';
      /* FIX: force a reflow so the fade-in actually transitions after display:none */
      void col.offsetWidth;
      requestAnimationFrame(() => col.classList.remove('is-hidden'));
    } else {
      col.classList.add('is-hidden');
      setTimeout(() => {
        if (col.classList.contains('is-hidden')) col.style.display = 'none';
      }, 450);
    }
  });
}

/* 3D tilt that follows the cursor */
function tiltMove(e) {
  const card = e.currentTarget;
  const r = card.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  card.style.setProperty('--ry', `${(x - 0.5) * 10}deg`);
  card.style.setProperty('--rx', `${(0.5 - y) * 8}deg`);
  card.style.setProperty('--mx', `${x * 100}%`);
  card.style.setProperty('--my', `${y * 100}%`);
}

function tiltReset(e) {
  const card = e.currentTarget;
  card.style.setProperty('--rx', '0deg');
  card.style.setProperty('--ry', '0deg');
}

/* Magnetic pull on buttons */
function magnetMove(e) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  const x = e.clientX - (r.left + r.width / 2);
  const y = e.clientY - (r.top + r.height / 2);
  el.style.translate = `${x * 0.25}px ${y * 0.25}px`;
}

function magnetReset(e) {
  e.currentTarget.style.translate = '0px 0px';
}

/* Ripple from the click point */
function ripple(e) {
  const btn = e.currentTarget;
  const r = btn.getBoundingClientRect();
  const dot = document.createElement('span');
  dot.className = 'ripple';
  dot.style.left = `${e.clientX - r.left}px`;
  dot.style.top = `${e.clientY - r.top}px`;
  btn.appendChild(dot);
  setTimeout(() => dot.remove(), 700);
}

/* Booking form: spinner, then check */
function submitBooking(e) {
  e.preventDefault();
  const btn = e.currentTarget.querySelector('button[type="submit"]');
  btn.classList.remove('done');
  btn.classList.add('loading');
  setTimeout(() => {
    btn.classList.remove('loading');
    btn.classList.add('done');
  }, 1400);
}

/* Fade the page before jumping to an in-page link */
function smoothLeave(e) {
  const href = e.currentTarget.getAttribute('href');
  /* FIX: a bare "#" would make querySelector throw */
  if (!href || href === '#') return;
  const target = document.querySelector(href);
  if (!target) return;
  e.preventDefault();
  body.classList.add('leaving');
  setTimeout(() => {
    target.scrollIntoView();
    body.classList.remove('leaving');
  }, 380);
}

/* Parallax inside image frames */
function parallaxFrames() {
  if (reduce) return;
  document.querySelectorAll('[data-speed]').forEach((img) => {
    const r = img.parentElement.getBoundingClientRect();
    const offset = r.top + r.height / 2 - window.innerHeight / 2;
    img.style.transform = `translate3d(0, ${(-offset * Number(img.dataset.speed)).toFixed(1)}px, 0)`;
  });
}

/* Line that draws down the timeline */
function updateTimeline() {
  document.querySelectorAll('.timeline').forEach((tl) => {
    const r = tl.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - r.top) / r.height));
    tl.style.setProperty('--p', p.toFixed(3));
  });
}

/* Header show/hide, progress bar, hero parallax */
function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  header.classList.toggle('scrolled', y > 40);
  header.classList.toggle('hidden', y > lastY && y > 200);
  lastY = y;
  if (!reduce) heroBg.style.setProperty('--py', `${y * 0.35}px`);
  parallaxFrames();
  updateTimeline();
}

function init() {
  document.querySelectorAll('[data-split]').forEach(splitText);
  document.querySelectorAll('[data-reveal], [data-split]').forEach((el) => (el.dataset.reveal === 'clip' ? ioClip : io).observe(el));
  document.querySelectorAll('.step').forEach((s) => stepIO.observe(s));
  initImages();
  typeWords(document.getElementById('typed'), ['Paris', 'Kyoto', 'Santorini', 'Marrakesh']);

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      applyFilter(chip.dataset.filter);
    });
  });

  document.querySelectorAll('.btn').forEach((btn) => btn.addEventListener('click', ripple));

  if (canFine) {
    document.querySelectorAll('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', magnetMove);
      el.addEventListener('pointerleave', magnetReset);
    });
    document.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('pointermove', tiltMove);
      card.addEventListener('pointerleave', tiltReset);
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', smoothLeave));
  document.getElementById('bookForm').addEventListener('submit', submitBooking);

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onScroll();
      ticking = false;
    });
  }, { passive: true });

  setTimeout(() => root.classList.add('is-ready'), 300);
  onScroll();
}

init();

/* =====================================================================
   ADDITIONS (appended): mobile menu, booking validation + success,
   card actions, destination shortcuts, safeguards
   ===================================================================== */
(function extras() {
  /* tells the page's safety net in <head> that the script started fine */
  window.__voyageReady = true;

  /* ---------- Mobile menu ---------- */
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('mobileMenu');
  function setMenu(open) {
    body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', String(!open));
    if (open) header.classList.remove('hidden');
  }
  toggle.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && body.classList.contains('menu-open')) { setMenu(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 761px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });
  /* the header must stay visible while the menu is open */
  window.addEventListener('scroll', () => { if (body.classList.contains('menu-open')) header.classList.remove('hidden'); }, { passive: true });

  /* ---------- Hero search jumps to destinations ---------- */
  const heroSearch = document.querySelector('.search input');
  const searchBtn = document.querySelector('.search .btn');
  if (heroSearch && searchBtn) {
    const go = () => {
      const q = heroSearch.value.trim().toLowerCase();
      if (q) {
        const chip = document.querySelector('.chip[data-filter="all"]');
        if (chip) chip.click();
        setTimeout(() => {
          document.querySelectorAll('.col[data-cat]').forEach((col) => {
            const name = col.querySelector('h3').textContent.toLowerCase();
            if (!name.includes(q)) { col.classList.add('is-hidden'); setTimeout(() => { if (col.classList.contains('is-hidden')) col.style.display = 'none'; }, 450); }
          });
        }, 80);
      }
      const t = document.getElementById('destinations');
      body.classList.add('leaving');
      setTimeout(() => { t.scrollIntoView(); body.classList.remove('leaving'); }, 380);
    };
    searchBtn.addEventListener('click', go);
    heroSearch.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  }

  /* ---------- Card buttons ---------- */
  document.querySelectorAll('.icon-btn[data-action="like"]').forEach((b) => {
    b.addEventListener('click', () => {
      const on = b.classList.toggle('liked');
      b.setAttribute('aria-pressed', String(on));
    });
  });
  const select = document.getElementById('destination');
  document.querySelectorAll('[data-dest]').forEach((a) => {
    a.addEventListener('click', () => { if (select) select.value = a.dataset.dest; });
  });

  /* ---------- Booking validation, then success ---------- */
  const form = document.getElementById('bookForm');
  const btn = form.querySelector('button[type="submit"]');
  const dateInput = form.elements.date;
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  dateInput.min = todayStr;

  const rules = {
    name: (v) => (v.trim().length < 2 ? 'Please tell us your name.' : ''),
    email: (v) => (!v.trim() ? 'Please enter your email.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? 'That email does not look right.' : ''),
    destination: (v) => (!v ? 'Choose a destination.' : ''),
    date: (v) => (!v ? 'Pick a travel date.' : v < todayStr ? 'Travel date cannot be in the past.' : ''),
    travellers: (v) => (!v || Number(v) < 1 || Number(v) > 20 ? 'Enter between 1 and 20 travellers.' : '')
  };

  function setError(field, msg) {
    let err = field.parentElement.querySelector('.field-error');
    if (!msg) { if (err) err.remove(); field.classList.remove('invalid'); field.removeAttribute('aria-invalid'); return false; }
    if (!err) { err = document.createElement('span'); err.className = 'field-error'; err.setAttribute('role', 'alert'); field.parentElement.appendChild(err); }
    err.textContent = msg;
    field.classList.add('invalid');
    field.setAttribute('aria-invalid', 'true');
    return true;
  }
  const validateField = (name) => setError(form.elements[name], rules[name](form.elements[name].value));
  Object.keys(rules).forEach((name) => {
    const f = form.elements[name];
    f.addEventListener('blur', () => validateField(name));
    f.addEventListener('input', () => { if (f.classList.contains('invalid')) validateField(name); });
  });

  const success = document.getElementById('bookSuccess');
  let busy = false;

  /* capture phase: runs before the pasted submitBooking and can stop it */
  form.addEventListener('submit', (e) => {
    if (busy) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    let firstBad = null;
    Object.keys(rules).forEach((name) => {
      if (validateField(name) && !firstBad) firstBad = form.elements[name];
    });
    if (firstBad) {
      e.preventDefault();
      e.stopImmediatePropagation();
      firstBad.focus();
      return;
    }
    busy = true;
    btn.disabled = true;
    success.classList.remove('show');
    /* the pasted submitBooking now runs: spinner 1.4s, then check */
    setTimeout(() => {
      const ref = 'VYG-' + Math.random().toString(36).slice(2, 8).toUpperCase();
      const dest = form.elements.destination.value;
      const first = form.elements.name.value.trim().split(' ')[0];
      success.querySelector('.ref').textContent = ref;
      success.querySelector('.who').textContent = `Thank you, ${first}. Your ${dest} enquiry is in. A travel designer will reply within one working day.`;
      success.classList.add('show');
      form.reset();
      success.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
      setTimeout(() => { btn.classList.remove('done'); btn.disabled = false; busy = false; }, 2600);
    }, 1500);
  }, true);

  /* clear the "done" check if the user edits the form again */
  form.addEventListener('input', () => { if (!busy) btn.classList.remove('done'); });
})();

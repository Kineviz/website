/* ============================================================
   Kineviz scroll-driven story site — interactions
   No dependencies. Everything degrades gracefully.
   Live visuals are cropped iframe embeds of @kineviz/gl examples
   (https://kineviz-gl.vercel.app/examples).
   ============================================================ */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Scroll progress + nav solidify ---------- */
  const progress = document.getElementById('scrollProgress');
  const nav = document.getElementById('nav');
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
    if (progress) progress.style.width = (p * 100).toFixed(2) + '%';
    if (nav) nav.classList.toggle('is-solid', (h.scrollTop || 0) > window.innerHeight * 0.7);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 1b. Nav: dropdowns + mobile drawer ---------- */
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const dropdownItems = [...document.querySelectorAll('.nav__item--has')];
  const isMobile = () => window.matchMedia('(max-width:900px)').matches;

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-menu-open');
      navToggle.setAttribute('aria-expanded', String(open));
      if (!open) closeAllDropdowns();
    });
  }
  function closeAllDropdowns(except) {
    dropdownItems.forEach((it) => {
      if (it === except) return;
      it.classList.remove('is-open');
      const b = it.querySelector('.nav__link');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  dropdownItems.forEach((item) => {
    const btn = item.querySelector('.nav__link');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const open = !item.classList.contains('is-open');
      closeAllDropdowns(open ? item : null);
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });
  // close on outside click / Escape
  document.addEventListener('click', (e) => {
    if (nav && !nav.contains(e.target)) { closeAllDropdowns(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllDropdowns();
      if (nav && nav.classList.contains('is-menu-open')) {
        nav.classList.remove('is-menu-open');
        navToggle && navToggle.setAttribute('aria-expanded', 'false');
      }
    }
  });
  // reset menu state when crossing the mobile/desktop boundary
  window.addEventListener('resize', () => {
    if (!isMobile() && nav) {
      nav.classList.remove('is-menu-open');
      navToggle && navToggle.setAttribute('aria-expanded', 'false');
      closeAllDropdowns();
    }
  }, { passive: true });

  /* ---------- 2. Generic reveal-on-enter ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } });
  }, { threshold: 0.18 });
  document.querySelectorAll('.reveal-up, [data-feat], [data-soln]').forEach((el, i) => {
    if (el.hasAttribute('data-soln')) el.style.setProperty('--d', (i % 3) * 0.08 + 's');
    revealIO.observe(el);
  });

  /* ---------- 3. Premise: light up words on scroll ---------- */
  const premise = document.getElementById('premise');
  const words = premise ? [...premise.querySelectorAll('[data-word]')] : [];
  if (premise && words.length) {
    function litPremise() {
      const r = premise.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const passed = Math.min(Math.max(-r.top, 0), total);
      const frac = total > 0 ? passed / total : 0;
      const n = Math.round(frac * words.length * 1.25);
      words.forEach((w, i) => w.classList.toggle('lit', i < n));
    }
    window.addEventListener('scroll', litPremise, { passive: true });
    litPremise();
  }

  /* ---------- 4. Stat counters ---------- */
  const statIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const plain = el.dataset.plain === '1';
      const dur = 1400; const start = performance.now();
      function tick(now) {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const val = Math.round(target * eased);
        el.textContent = (plain ? String(val) : val.toLocaleString()) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      statIO.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach((el) => statIO.observe(el));

  /* ============================================================
     5. @kineviz/gl live embeds
     Each example page is a side-by-side code playground; the live
     canvas is the right-hand pane (≈x700,w700 of a 1400-wide layout,
     top offset varies with title height). We mount the page in an
     iframe and crop+scale to show only that pane, covering the box.
     Iframes are mounted lazily on approach and torn down when far
     offscreen so we never hold more than a couple of WebGL contexts.
     ============================================================ */
  const GL_BASE = 'https://kineviz-gl.vercel.app/examples/';
  const NATIVE_W = 1400, NATIVE_H = 900, PANE_X = 700, PANE_W = 700;

  function fitCover(wrap, iframe, top) {
    const paneH = NATIVE_H - top;
    const Wd = wrap.clientWidth, Hd = wrap.clientHeight;
    if (!Wd || !Hd) return;
    const S = Math.max(Wd / PANE_W, Hd / paneH);
    const px = (Wd - PANE_W * S) / 2;   // center the pane horizontally
    const py = (Hd - paneH * S) / 2;    // center the pane vertically
    iframe.style.width = NATIVE_W + 'px';
    iframe.style.height = NATIVE_H + 'px';
    iframe.style.transform =
      `translate(${(px - PANE_X * S).toFixed(1)}px, ${(py - top * S).toFixed(1)}px) scale(${S.toFixed(4)})`;
  }

  function mountEmbed(wrap) {
    if (wrap._iframe) return;
    const slug = wrap.dataset.gl;
    if (!slug) return;
    const top = parseInt(wrap.dataset.glTop || '149', 10);
    const iframe = document.createElement('iframe');
    iframe.className = 'gl-embed__frame';
    iframe.src = GL_BASE + slug;
    iframe.loading = 'lazy';
    iframe.title = wrap.dataset.glTitle || 'Live Kineviz GL visualization';
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('tabindex', '-1');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.allow = 'autoplay; fullscreen';
    iframe.addEventListener('load', () => {
      wrap.classList.add('is-ready');
      fitCover(wrap, iframe, top);
      // re-fit a few times as the WebGL app lays out / fits its camera
      setTimeout(() => fitCover(wrap, iframe, top), 600);
      setTimeout(() => fitCover(wrap, iframe, top), 1800);
    });
    wrap.appendChild(iframe);
    wrap._iframe = iframe;
    wrap._top = top;
    fitCover(wrap, iframe, top);
    if (!wrap._ro) {
      wrap._ro = new ResizeObserver(() => { if (wrap._iframe) fitCover(wrap, wrap._iframe, wrap._top); });
      wrap._ro.observe(wrap);
    }
  }

  function unmountEmbed(wrap) {
    if (!wrap._iframe) return;
    wrap._iframe.remove();
    wrap._iframe = null;
    wrap.classList.remove('is-ready');
  }

  const embeds = [...document.querySelectorAll('.gl-embed')];
  if (embeds.length) {
    const embedIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => { e.isIntersecting ? mountEmbed(e.target) : unmountEmbed(e.target); });
    }, { rootMargin: '400px 0px 400px 0px', threshold: 0 });

    embeds.forEach((w) => {
      if (w.dataset.glEager) mountEmbed(w);   // hero loads right away
      embedIO.observe(w);
    });

    window.addEventListener('resize', () => {
      embeds.forEach((w) => { if (w._iframe) fitCover(w, w._iframe, w._top); });
    }, { passive: true });
  }

  /* ---------- 6. Smooth-scroll for in-page anchors (respect reduce) ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
    });
  });
})();

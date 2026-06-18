/* ============================================================
   Kineviz scroll-driven story site — interactions
   No dependencies. Everything degrades gracefully.
   ============================================================ */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PALETTE = ['#8b5cf6', '#fbbf24', '#2dd4bf', '#4f6bff', '#f472b6', '#34d399'];

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
     Graph canvas engine (shared)
     ============================================================ */
  function makeGraph(canvas, opts) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const o = Object.assign({ count: 46, link: 150, speed: 0.18, radius: [1.6, 4.2], glow: true, drift: true }, opts);
    let nodes = [], W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let running = true, mouse = { x: -9999, y: -9999 };

    function resize() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function seed() {
      nodes = Array.from({ length: o.count }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * o.speed, vy: (Math.random() - 0.5) * o.speed,
        r: o.radius[0] + Math.random() * (o.radius[1] - o.radius[0]),
        c: PALETTE[(Math.random() * PALETTE.length) | 0],
        pulse: Math.random() * Math.PI * 2,
      }));
    }
    function step() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      // edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < o.link) {
            const alpha = (1 - d / o.link) * 0.5;
            ctx.strokeStyle = `rgba(150,160,200,${alpha.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      // nodes
      for (const n of nodes) {
        if (o.drift) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > W) n.vx *= -1;
          if (n.y < 0 || n.y > H) n.vy *= -1;
        }
        // mouse repel
        const mdx = n.x - mouse.x, mdy = n.y - mouse.y, md = Math.hypot(mdx, mdy);
        if (md < 110) { n.x += (mdx / md) * (110 - md) * 0.04; n.y += (mdy / md) * (110 - md) * 0.04; }
        n.pulse += 0.03;
        const rr = n.r + Math.sin(n.pulse) * 0.5;
        if (o.glow) {
          ctx.shadowColor = n.c; ctx.shadowBlur = 12;
        }
        ctx.beginPath(); ctx.arc(n.x, n.y, rr, 0, Math.PI * 2);
        ctx.fillStyle = n.c; ctx.fill();
        ctx.shadowBlur = 0;
      }
      requestAnimationFrame(step);
    }
    function start() { running = true; step(); }
    function stop() { running = false; }

    resize(); seed();
    window.addEventListener('resize', () => { resize(); seed(); }, { passive: true });
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('pointerleave', () => { mouse.x = -9999; mouse.y = -9999; });

    if (!reduce) start(); else { resize(); seed(); step(); stop(); /* one static frame */ }
    return { start, stop, el: canvas };
  }

  // Pause offscreen canvases for perf
  function autoPause(graph) {
    if (!graph) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (reduce) return; e.isIntersecting ? graph.start() : graph.stop(); });
    }, { threshold: 0.01 });
    io.observe(graph.el);
  }

  autoPause(makeGraph(document.getElementById('graphCanvas'), { count: 70, link: 160, speed: 0.22 }));
  autoPause(makeGraph(document.getElementById('miniGraph'), { count: 34, link: 130, speed: 0.3, radius: [2, 5] }));
  autoPause(makeGraph(document.getElementById('ctaCanvas'), { count: 50, link: 150, speed: 0.2 }));

  /* ============================================================
     Story stages — bespoke per-story canvas animations
     ============================================================ */
  function stageCanvas(stage) {
    const c = document.createElement('canvas');
    c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    stage.appendChild(c);
    const ctx = c.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W, H;
    function resize() { const r = stage.getBoundingClientRect(); W = r.width; H = r.height; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    resize();
    new ResizeObserver(resize).observe(stage);
    return { c, ctx, get W() { return W; }, get H() { return H; }, dpr };
  }

  function buildStory(stage) {
    const accent = stage.closest('.story').dataset.accent || '#8b5cf6';
    const kind = stage.dataset.stage;
    const s = stageCanvas(stage);
    let active = false, t = 0;

    // node set depends on kind
    let pts = [];
    function seedNetwork(n) {
      pts = Array.from({ length: n }, (_, i) => ({
        x: Math.random() * s.W, y: Math.random() * s.H,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        r: 2 + Math.random() * 4, rogue: false, born: Math.random(),
      }));
    }
    seedNetwork(kind === 'stream' ? 0 : 30);

    function frame() {
      if (!active) return;
      t += 0.016;
      s.ctx.clearRect(0, 0, s.W, s.H);
      const cx = s.W / 2, cy = s.H / 2;

      if (kind === 'network') {
        // extremist network: cluster, then highlight + "remove"
        const phase = (Math.sin(t * 0.35) + 1) / 2; // 0..1 cycle
        pts.forEach((p) => { p.x += p.vx; p.y += p.vy;
          if (p.x < 20 || p.x > s.W - 20) p.vx *= -1; if (p.y < 20 || p.y > s.H - 20) p.vy *= -1; });
        // edges
        for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 120) { s.ctx.strokeStyle = `rgba(160,150,210,${(1 - d / 120) * 0.4})`; s.ctx.lineWidth = 1; s.ctx.beginPath(); s.ctx.moveTo(a.x, a.y); s.ctx.lineTo(b.x, b.y); s.ctx.stroke(); }
        }
        pts.forEach((p, i) => {
          const flagged = i % 3 === 0;
          const fade = flagged ? Math.max(0, 1 - phase * 1.3) : 1;
          s.ctx.globalAlpha = fade;
          s.ctx.fillStyle = flagged ? accent : '#5b6178';
          s.ctx.shadowColor = accent; s.ctx.shadowBlur = flagged ? 16 * fade : 0;
          s.ctx.beginPath(); s.ctx.arc(p.x, p.y, p.r * (flagged ? 1.3 : 1), 0, 6.3); s.ctx.fill();
          s.ctx.shadowBlur = 0; s.ctx.globalAlpha = 1;
        });
      }
      else if (kind === 'geo') {
        // geospatial: faint grid + drifting hotspots connected by routes
        s.ctx.strokeStyle = 'rgba(120,130,170,.12)'; s.ctx.lineWidth = 1;
        const gp = 46;
        for (let x = 0; x < s.W; x += gp) { s.ctx.beginPath(); s.ctx.moveTo(x, 0); s.ctx.lineTo(x, s.H); s.ctx.stroke(); }
        for (let y = 0; y < s.H; y += gp) { s.ctx.beginPath(); s.ctx.moveTo(0, y); s.ctx.lineTo(s.W, y); s.ctx.stroke(); }
        pts.forEach((p) => { p.x += p.vx * 0.5; p.y += p.vy * 0.5; if (p.x < 0 || p.x > s.W) p.vx *= -1; if (p.y < 0 || p.y > s.H) p.vy *= -1; });
        // routes between nearest hotspots
        for (let i = 0; i < pts.length; i++) {
          let best = null, bd = 1e9;
          for (let j = 0; j < pts.length; j++) if (i !== j) { const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y); if (d < bd) { bd = d; best = pts[j]; } }
          if (best) {
            const dash = (t * 40) % 16;
            s.ctx.setLineDash([6, 10]); s.ctx.lineDashOffset = -dash;
            s.ctx.strokeStyle = `${accent}66`; s.ctx.lineWidth = 1.4;
            s.ctx.beginPath(); s.ctx.moveTo(pts[i].x, pts[i].y); s.ctx.lineTo(best.x, best.y); s.ctx.stroke();
            s.ctx.setLineDash([]);
          }
        }
        pts.forEach((p) => {
          const pulse = 1 + Math.sin(t * 2 + p.born * 6) * 0.3;
          s.ctx.fillStyle = accent; s.ctx.shadowColor = accent; s.ctx.shadowBlur = 18;
          s.ctx.beginPath(); s.ctx.arc(p.x, p.y, 3.5 * pulse, 0, 6.3); s.ctx.fill();
          s.ctx.shadowBlur = 0;
          s.ctx.strokeStyle = `${accent}33`; s.ctx.beginPath(); s.ctx.arc(p.x, p.y, 14 * pulse, 0, 6.3); s.ctx.stroke();
        });
      }
      else if (kind === 'stream') {
        // 40M events: dense streaming particles, a few flagged
        if (Math.random() < 0.9) for (let k = 0; k < 4; k++) pts.push({ x: -10, y: 30 + Math.random() * (s.H - 60), vx: 1.6 + Math.random() * 2.4, vy: (Math.random() - 0.5) * 0.4, r: 1.5 + Math.random() * 2, rogue: Math.random() < 0.06, life: 1 });
        pts = pts.filter((p) => p.x < s.W + 20);
        pts.forEach((p) => {
          p.x += p.vx; p.y += p.vy;
          s.ctx.fillStyle = p.rogue ? accent : 'rgba(120,128,155,.7)';
          if (p.rogue) { s.ctx.shadowColor = accent; s.ctx.shadowBlur = 14; }
          s.ctx.beginPath(); s.ctx.arc(p.x, p.y, p.rogue ? p.r * 2 : p.r, 0, 6.3); s.ctx.fill();
          s.ctx.shadowBlur = 0;
          if (p.rogue) { s.ctx.strokeStyle = `${accent}55`; s.ctx.beginPath(); s.ctx.arc(p.x, p.y, 10, 0, 6.3); s.ctx.stroke(); }
        });
      }
      else if (kind === 'ring') {
        // collusion ring: nodes on a circle, suspicious cross-links light up
        const N = 12, R = Math.min(s.W, s.H) * 0.32;
        const ring = Array.from({ length: N }, (_, i) => ({ x: cx + Math.cos((i / N) * 6.283 + t * 0.15) * R, y: cy + Math.sin((i / N) * 6.283 + t * 0.15) * R }));
        // colluding pairs
        const pairs = [[0, 5], [1, 7], [3, 9], [2, 8], [6, 11]];
        pairs.forEach((pr, idx) => {
          const lit = (Math.sin(t * 1.5 + idx) + 1) / 2;
          s.ctx.strokeStyle = `${accent}${Math.round(lit * 200 + 30).toString(16).padStart(2, '0')}`;
          s.ctx.lineWidth = 1 + lit * 2;
          s.ctx.beginPath(); s.ctx.moveTo(ring[pr[0]].x, ring[pr[0]].y); s.ctx.lineTo(ring[pr[1]].x, ring[pr[1]].y); s.ctx.stroke();
        });
        // outer ring links
        ring.forEach((p, i) => { const q = ring[(i + 1) % N]; s.ctx.strokeStyle = 'rgba(140,148,180,.18)'; s.ctx.lineWidth = 1; s.ctx.beginPath(); s.ctx.moveTo(p.x, p.y); s.ctx.lineTo(q.x, q.y); s.ctx.stroke(); });
        ring.forEach((p) => { s.ctx.fillStyle = accent; s.ctx.shadowColor = accent; s.ctx.shadowBlur = 12; s.ctx.beginPath(); s.ctx.arc(p.x, p.y, 5, 0, 6.3); s.ctx.fill(); s.ctx.shadowBlur = 0; });
      }
      requestAnimationFrame(frame);
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !reduce) { if (!active) { active = true; frame(); } }
        else { active = false; }
      });
    }, { threshold: 0.05 });
    io.observe(stage);
    if (reduce) { active = true; frame(); active = false; } // single static frame
  }
  document.querySelectorAll('.story__stage[data-stage]').forEach(buildStory);

  /* ---------- 5. Smooth-scroll for in-page anchors (respect reduce) ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
    });
  });
})();

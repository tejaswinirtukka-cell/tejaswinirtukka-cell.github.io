/* Decorative "fan of futures" background for the hero: many possible paths spreading out, with a median line and a calm range band. Illustrative only. */
(function () {
  var hero = document.querySelector('.hero');
  var cv = document.getElementById('fan');
  if (!hero || !cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var M = 110, T = 90;            // paths, steps
  var GROW = 7000, HOLD = 5500, FADE = 1800;

  var seed = 20261105;
  function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function nrm() { var u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  var P = [], B = null;           // paths (arrays of values), bands per step
  function build() {
    P = [];
    var common = [], i, j;
    for (j = 0; j < T; j++) common.push(nrm());
    for (i = 0; i < M; i++) {
      var v = 0, vel = 0, p = [0], jumpAt = rnd() < 0.18 ? Math.floor(10 + rnd() * (T - 20)) : -1, jump = (rnd() - 0.5) * 0.5;
      for (j = 1; j < T; j++) {
        vel = 0.88 * vel + 0.0035 * (0.55 * common[j] + 0.83 * nrm());
        v += 0.0014 + vel;
        if (j === jumpAt) v += jump;
        p.push(v);
      }
      P.push(p);
    }
    B = [];
    for (j = 0; j < T; j++) {
      var col = P.map(function (p) { return p[j]; }).sort(function (a, b) { return a - b; });
      B.push({ lo: col[Math.floor(M * 0.1)], q1: col[Math.floor(M * 0.25)], med: col[Math.floor(M * 0.5)], q3: col[Math.floor(M * 0.75)], hi: col[Math.floor(M * 0.9)] });
    }
  }

  function hex(h) {
    h = (h || '').trim();
    if (h.charAt(0) !== '#') return [120, 110, 100];
    if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
  }
  var col = {};
  function readColours() {
    var cs = getComputedStyle(document.documentElement);
    col.accent = hex(cs.getPropertyValue('--accent')); col.muted = hex(cs.getPropertyValue('--muted'));
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  var W = 0, H = 0, dpr = 1, x0 = 0, x1 = 0, y0 = 0, amp = 0;
  function size() {
    var r = hero.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    if (W < 820) { x0 = W * 0.04; x1 = W * 1.04; y0 = H * 0.2; amp = H * 0.34; }
    else { x0 = W * 0.30; x1 = W * 1.03; y0 = H * 0.55; amp = H * 0.95; }
  }
  function X(j) { return x0 + (x1 - x0) * j / (T - 1); }
  function Y(v) { return y0 - v * amp; }

  function ease(u) { return 1 - Math.pow(1 - u, 3); }
  function draw(progress, alpha) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var n = Math.max(2, Math.floor(progress * (T - 1)) + 1), j, i;
    ctx.globalAlpha = alpha;
    // ranges: 10 to 90 and 25 to 75
    function band(a, b, fill) {
      ctx.fillStyle = fill; ctx.beginPath();
      for (j = 0; j < n; j++) ctx[j ? 'lineTo' : 'moveTo'](X(j), Y(B[j][a]));
      for (j = n - 1; j >= 0; j--) ctx.lineTo(X(j), Y(B[j][b]));
      ctx.closePath(); ctx.fill();
    }
    band('lo', 'hi', rgba(col.accent, 0.045));
    band('q1', 'q3', rgba(col.accent, 0.07));
    // individual futures
    ctx.lineWidth = 1; ctx.strokeStyle = rgba(col.muted, 0.17);
    for (i = 0; i < P.length; i += 2) {
      ctx.beginPath();
      for (j = 0; j < n; j++) ctx[j ? 'lineTo' : 'moveTo'](X(j), Y(P[i][j]));
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(col.muted, 0.08);
    for (i = 1; i < P.length; i += 2) {
      ctx.beginPath();
      for (j = 0; j < n; j++) ctx[j ? 'lineTo' : 'moveTo'](X(j), Y(P[i][j]));
      ctx.stroke();
    }
    // median
    ctx.strokeStyle = rgba(col.accent, 0.6); ctx.lineWidth = 1.8; ctx.beginPath();
    for (j = 0; j < n; j++) ctx[j ? 'lineTo' : 'moveTo'](X(j), Y(B[j].med));
    ctx.stroke();
    // origin tick
    ctx.strokeStyle = rgba(col.muted, 0.18); ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(x0, y0 - amp * 0.35); ctx.lineTo(x0, y0 + amp * 0.35); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  var running = false, visible = true, raf = 0, t0 = 0;
  function tick() {
    if (!running) return;
    var now = performance.now(), el = now - t0, total = GROW + HOLD + FADE, c = el % total;
    if (el >= total && c < 40) { seed = (seed * 1664525 + 1013904223) | 0; build(); }
    var p, a;
    if (c < GROW) { p = ease(c / GROW); a = 1; }
    else if (c < GROW + HOLD) { p = 1; a = 1; }
    else { p = 1; a = 1 - (c - GROW - HOLD) / FADE; }
    draw(p, a);
    raf = requestAnimationFrame(tick);
  }
  function start() { if (running || reduce || !visible || document.hidden) return; running = true; if (!t0) t0 = performance.now(); raf = requestAnimationFrame(tick); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function still() { draw(1, 1); }

  readColours(); size(); build();
  if (reduce) still(); else start();
  if (window.ResizeObserver) new ResizeObserver(function () { size(); if (!running) still(); }).observe(hero);
  else window.addEventListener('resize', function () { size(); if (!running) still(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(hero);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { readColours(); if (!running) still(); });
})();

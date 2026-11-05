/* Quiet network globe for the hero background. Decorative only: neutral world cities, no places are claimed. Land dots: Natural Earth (public domain) via globe-data.js. */
(function () {
  var hero = document.querySelector('.hero');
  var cv = document.getElementById('globe');
  if (!hero || !cv || !window.GLOBE_DOTS || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var rad = Math.PI / 180;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function vec(la, lo) { la *= rad; lo *= rad; return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)]; }
  var DOTS = [];
  window.GLOBE_DOTS.forEach(function (r) { r[1].forEach(function (lo) { DOTS.push(vec(r[0], lo)); }); });
  var CITIES = [[40.7, -74], [51.5, -0.1], [48.9, 2.3], [50.1, 8.7], [52.4, 4.9], [53.3, -6.3], [40.4, -3.7], [45.5, 9.2], [47.4, 8.5], [59.3, 18.1], [41, 29], [30, 31.2], [24.7, 46.7], [25.2, 55.3], [25.3, 51.5], [19.1, 72.9], [28.6, 77.2], [13, 77.6], [1.35, 103.8], [22.3, 114.2], [31.2, 121.5], [35.7, 139.7], [37.6, 127], [-33.9, 151.2], [-26.2, 28], [6.5, 3.4], [-1.3, 36.8], [-23.5, -46.6], [19.4, -99.1], [43.7, -79.4], [37.8, -122.4], [41.9, -87.6]];
  var CV = CITIES.map(function (c) { return vec(c[0], c[1]); });

  function hex(h) {
    h = (h || '').trim();
    if (h.charAt(0) !== '#') return [120, 130, 150];
    if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
  }
  var col = {};
  function readColours() { var cs = getComputedStyle(document.documentElement); col.a = hex(cs.getPropertyValue('--accent')); col.m = hex(cs.getPropertyValue('--muted')); }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 0, narrow = false;
  function size() {
    var r = hero.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    narrow = W < 820;
    if (narrow) { R = Math.min(W * 0.9, 440); cx = W * 0.55; cy = Math.min(H * 0.22, 380); }
    else { R = Math.min(H * 0.64, W * 0.38); cx = W * 0.7; cy = H * 0.5; }
  }

  var cl = 1, sl = 0, cp = 1, sp = 0, out = [0, 0, 0];
  function view(lon, lat) { var L = lon * rad, P = lat * rad; cl = Math.cos(L); sl = Math.sin(L); cp = Math.cos(P); sp = Math.sin(P); }
  function proj(v, k) {
    k = k || 1; var x = v[0] * k, y = v[1] * k, z = v[2] * k;
    var x1 = x * cl - z * sl, z1 = x * sl + z * cl, y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    out[0] = cx + R * x1; out[1] = cy - R * y2; out[2] = z2; return out;
  }

  var AL = [0.2, 0.36, 0.56, 0.8], bx = [[], [], [], []], by = [[], [], [], []];
  function frame(now, animate) {
    view(animate ? (now / 1000 * 3) % 360 : 40, -18);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = rgba(col.a, 0.28); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.stroke();
    var i, b, p;
    for (b = 0; b < 4; b++) { bx[b].length = 0; by[b].length = 0; }
    for (i = 0; i < DOTS.length; i++) {
      p = proj(DOTS[i]); if (p[2] <= 0.04) continue;
      b = p[2] < 0.22 ? 0 : p[2] < 0.5 ? 1 : p[2] < 0.8 ? 2 : 3; bx[b].push(p[0]); by[b].push(p[1]);
    }
    var sz = Math.max(1.7, R / 180);
    for (b = 0; b < 4; b++) { ctx.fillStyle = rgba(col.m, AL[b] * 0.9); for (i = 0; i < bx[b].length; i++) ctx.fillRect(bx[b][i] - sz / 2, by[b][i] - sz / 2, sz, sz); }
    // faint city lights
    for (i = 0; i < CV.length; i++) {
      p = proj(CV[i]); if (p[2] < 0.1) continue;
      var tw = animate ? 0.5 + 0.5 * Math.sin(now / 900 + i * 1.7) : 0.6;
      ctx.fillStyle = rgba(col.a, (0.25 + 0.45 * tw) * Math.min(1, p[2] * 2)); ctx.beginPath(); ctx.arc(p[0], p[1], 2.1, 0, 6.2832); ctx.fill();
    }
    if (!animate) return;
    // occasional arcs between two cities
    for (var k = 0; k < 3; k++) {
      var per = 7000, t0 = now + k * 2333, ph = (t0 % per) / per, seed = Math.floor(t0 / per) * 7 + k * 13;
      var va = CV[seed % CV.length], vb = CV[(seed * 5 + 3) % CV.length];
      var dot = va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2], ang = Math.acos(Math.max(-1, Math.min(1, dot)));
      if (ang < 0.3) continue;
      var n = 40, al = Math.sin(Math.PI * ph), st = false;
      ctx.strokeStyle = rgba(col.a, 0.5 * al); ctx.lineWidth = 1.3; ctx.beginPath();
      for (i = 0; i <= n * ph; i++) {
        var t = i / n, w1 = Math.sin((1 - t) * ang) / Math.sin(ang), w2 = Math.sin(t * ang) / Math.sin(ang), lift = 1 + (0.06 + 0.2 * ang / Math.PI) * Math.sin(Math.PI * t);
        var v = [va[0] * w1 + vb[0] * w2, va[1] * w1 + vb[1] * w2, va[2] * w1 + vb[2] * w2];
        p = proj(v, lift);
        if (p[2] > 0) { if (!st) { ctx.moveTo(p[0], p[1]); st = true; } else ctx.lineTo(p[0], p[1]); } else st = false;
      }
      ctx.stroke();
    }
  }

  var running = false, visible = true, raf = 0;
  function loop() { if (!running) return; frame(performance.now(), true); raf = requestAnimationFrame(loop); }
  function start() { if (running || reduce || !visible || document.hidden) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function still() { frame(performance.now(), false); }

  readColours(); size();
  if (reduce) still(); else start();
  if (window.ResizeObserver) new ResizeObserver(function () { size(); if (!running) still(); }).observe(hero);
  else window.addEventListener('resize', function () { size(); if (!running) still(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(hero);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  function recolour() { readColours(); if (!running) still(); }
  document.addEventListener('themechange', recolour);
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolour);
})();

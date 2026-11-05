/* Decorative globe for the hero. Land dots come from globe-data.js (Natural Earth, public domain). */
(function () {
  var hero = document.querySelector('.hero');
  var cv = document.getElementById('globe');
  var chip = document.getElementById('globe-chip');
  if (!hero || !cv || !window.GLOBE_DOTS || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var rad = Math.PI / 180;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // places: base = where I live, target = markets I am looking at, past = where I studied or worked
  var P = {
    dubai: [25.2048, 55.2708], ams: [52.3676, 4.9041], dub: [53.3498, -6.2603],
    pune: [18.5204, 73.8567], blr: [12.9716, 77.5946], sin: [1.3521, 103.8198]
  };
  var MARKS = [
    { n: 'Dubai', p: P.dubai, k: 'base', dx: 10, dy: -10, a: 'left' },
    { n: 'Amsterdam', p: P.ams, k: 'target', dx: 10, dy: -8, a: 'left' },
    { n: 'Dublin', p: P.dub, k: 'target', dx: -10, dy: -8, a: 'right' },
    { n: 'Pune', p: P.pune, k: 'past', dx: -9, dy: -6, a: 'right' },
    { n: 'Bengaluru', p: P.blr, k: 'past', dx: 10, dy: 14, a: 'left' },
    { n: 'Singapore', p: P.sin, k: 'past', dx: 10, dy: -8, a: 'left' }
  ];
  var ARCS = [
    { a: P.dubai, b: P.ams, k: 'target' }, { a: P.dubai, b: P.dub, k: 'target' },
    { a: P.dubai, b: P.pune, k: 'past' }, { a: P.dubai, b: P.sin, k: 'past' }
  ];
  var STOPS = [
    { f: [25.2, 55.3], t: 'Dubai, UAE', s: 'home base', k: 'base' },
    { f: [52.4, 4.9], t: 'Amsterdam, Netherlands', s: 'target market', k: 'target' },
    { f: [53.3, -6.3], t: 'Dublin, Ireland', s: 'target market', k: 'target' },
    { f: [15.7, 75.7], t: 'India', s: 'studied in Bengaluru, worked in Pune', k: 'past' }
  ];
  var HOLD = 3600, MOVE = 2600;

  function vec(p) {
    var la = p[0] * rad, lo = p[1] * rad;
    return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
  }
  // flatten land dots
  var DX = [], DY = [], DZ = [];
  window.GLOBE_DOTS.forEach(function (row) {
    row[1].forEach(function (lon) {
      var v = vec([row[0], lon]); DX.push(v[0]); DY.push(v[1]); DZ.push(v[2]);
    });
  });
  var N = DX.length;
  // arcs: precomputed unit vectors lifted above the surface
  ARCS.forEach(function (A) {
    var a = vec(A.a), b = vec(A.b);
    var dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    var ang = Math.acos(dot), s = Math.sin(ang), pts = [], n = 56;
    for (var i = 0; i <= n; i++) {
      var t = i / n, w1 = Math.sin((1 - t) * ang) / s, w2 = Math.sin(t * ang) / s;
      var lift = 1 + (0.06 + 0.2 * ang / Math.PI) * Math.sin(Math.PI * t);
      pts.push([(a[0] * w1 + b[0] * w2) * lift, (a[1] * w1 + b[1] * w2) * lift, (a[2] * w1 + b[2] * w2) * lift]);
    }
    A.pts = pts;
  });
  MARKS.forEach(function (m) { m.v = vec(m.p); });

  // colours from the page theme
  var col = {};
  function hex(h) {
    h = (h || '').trim();
    if (h.charAt(0) !== '#') return [120, 110, 100];
    if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
    return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
  }
  function readColours() {
    var cs = getComputedStyle(document.documentElement);
    col.accent = hex(cs.getPropertyValue('--accent'));
    col.muted = hex(cs.getPropertyValue('--muted'));
    col.ink = hex(cs.getPropertyValue('--ink'));
    col.bg = hex(cs.getPropertyValue('--bg'));
  }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 0, narrow = false, offL = 22, offP = 12;
  function size() {
    var r = hero.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    narrow = W < 820;
    if (narrow) { R = Math.min(W * 0.9, 440); cx = W * 0.55; cy = Math.min(H * 0.22, 380); offL = 0; offP = 22; }
    else { R = Math.min(H * 0.64, W * 0.37); cx = W * 0.68; cy = H * 0.5; offL = 22; offP = 12; }
  }

  function ease(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function pos(now, t0) {
    var el = Math.max(0, now - t0), cyc = HOLD + MOVE, n = STOPS.length;
    var k = Math.floor(el / cyc) % n, r = el % cyc, A = STOPS[k], B = STOPS[(k + 1) % n];
    if (r < HOLD) return { lat: A.f[0], lon: A.f[1] + 2.2 * Math.sin(now / 2400), stop: k, moving: false };
    var u = ease((r - HOLD) / MOVE);
    var dl = ((B.f[1] - A.f[1] + 540) % 360) - 180;
    return { lat: A.f[0] + (B.f[0] - A.f[0]) * u, lon: A.f[1] + dl * u, stop: u > 0.35 ? (k + 1) % n : k, moving: true };
  }

  var lastStop = -1;
  function setChip(i) {
    if (!chip || i === lastStop) return;
    lastStop = i;
    var S = STOPS[i], dot = chip.querySelector('.gd'), txt = chip.querySelector('.t');
    chip.classList.add('swap');
    setTimeout(function () {
      dot.className = 'gd ' + S.k; txt.textContent = S.t + ' · ' + S.s; chip.classList.remove('swap');
    }, lastStop === 0 && !chip.dataset.init ? 0 : 280);
    chip.dataset.init = '1';
  }

  var L0 = 0, P0 = 0, cl = 1, sl = 0, cp = 1, sp = 0;
  function setView(lat, lon) {
    L0 = (lon + offL) * rad; P0 = (lat - offP) * rad;
    cl = Math.cos(L0); sl = Math.sin(L0); cp = Math.cos(P0); sp = Math.sin(P0);
  }
  // returns screen x, y and depth z for a unit (or lifted) vector
  var out = [0, 0, 0];
  function proj(x, y, z) {
    var x1 = x * cl - z * sl, z1 = x * sl + z * cl;
    var y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    out[0] = cx + R * x1; out[1] = cy - R * y2; out[2] = z2;
    return out;
  }

  var ALPHA = [0.22, 0.4, 0.62, 0.85], bx = [[], [], [], []], by = [[], [], [], []];
  function frame(now, t0, animate) {
    var s = animate ? pos(now, t0) : { lat: STOPS[0].f[0], lon: STOPS[0].f[1], stop: 0 };
    setView(s.lat, s.lon); setChip(s.stop);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);

    // sphere body and soft rim
    var g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.12);
    g.addColorStop(0, rgba(col.accent, 0.0)); g.addColorStop(0.86, rgba(col.accent, 0.05));
    g.addColorStop(0.94, rgba(col.accent, 0.12)); g.addColorStop(1, rgba(col.accent, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = rgba(col.accent, 0.4); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.stroke();

    // graticule
    ctx.strokeStyle = rgba(col.accent, 0.1); ctx.lineWidth = 0.8;
    var la, lo, p, started;
    for (la = -60; la <= 60; la += 30) {
      ctx.beginPath(); started = false;
      for (lo = -180; lo <= 180; lo += 5) {
        var v = vec([la, lo]); p = proj(v[0], v[1], v[2]);
        if (p[2] > 0) { if (!started) { ctx.moveTo(p[0], p[1]); started = true; } else ctx.lineTo(p[0], p[1]); } else started = false;
      }
      ctx.stroke();
    }
    for (lo = -180; lo < 180; lo += 30) {
      ctx.beginPath(); started = false;
      for (la = -85; la <= 85; la += 5) {
        var w = vec([la, lo]); p = proj(w[0], w[1], w[2]);
        if (p[2] > 0) { if (!started) { ctx.moveTo(p[0], p[1]); started = true; } else ctx.lineTo(p[0], p[1]); } else started = false;
      }
      ctx.stroke();
    }

    // land dots, batched by depth
    var i, b;
    for (b = 0; b < 4; b++) { bx[b].length = 0; by[b].length = 0; }
    for (i = 0; i < N; i++) {
      var q = proj(DX[i], DY[i], DZ[i]);
      if (q[2] <= 0.04) continue;
      b = q[2] < 0.22 ? 0 : q[2] < 0.5 ? 1 : q[2] < 0.8 ? 2 : 3;
      bx[b].push(q[0]); by[b].push(q[1]);
    }
    var sz = Math.max(1.8, R / 170);
    for (b = 0; b < 4; b++) {
      ctx.fillStyle = rgba(col.muted, ALPHA[b]);
      for (i = 0; i < bx[b].length; i++) ctx.fillRect(bx[b][i] - sz / 2, by[b][i] - sz / 2, sz, sz);
    }

    // arcs
    ARCS.forEach(function (A, ai) {
      var target = A.k === 'target';
      ctx.strokeStyle = target ? rgba(col.accent, 0.7) : rgba(col.muted, 0.4);
      ctx.lineWidth = target ? 1.6 : 1.1;
      ctx.setLineDash(target ? [] : [4, 5]);
      ctx.beginPath(); var st = false, j, c;
      for (j = 0; j < A.pts.length; j++) {
        c = A.pts[j]; var pp = proj(c[0], c[1], c[2]);
        if (pp[2] > 0) { if (!st) { ctx.moveTo(pp[0], pp[1]); st = true; } else ctx.lineTo(pp[0], pp[1]); } else st = false;
      }
      ctx.stroke(); ctx.setLineDash([]);
      if (animate && target) {
        var t = ((now / 3200) + ai * 0.37) % 1, k = Math.min(A.pts.length - 1, Math.floor(t * (A.pts.length - 1)));
        c = A.pts[k]; var hp = proj(c[0], c[1], c[2]);
        if (hp[2] > 0) { ctx.fillStyle = rgba(col.accent, 1); ctx.beginPath(); ctx.arc(hp[0], hp[1], 2.8, 0, 6.2832); ctx.fill(); }
      }
    });

    // markers and names
    var active = STOPS[s.stop].k;
    ctx.font = '600 12px "Segoe UI", system-ui, sans-serif';
    MARKS.forEach(function (m) {
      var mp = proj(m.v[0], m.v[1], m.v[2]);
      if (mp[2] < 0.12) return;
      var x = mp[0], y = mp[1], fade = Math.min(1, (mp[2] - 0.12) / 0.3);
      if (m.k === 'base') {
        if (animate) {
          var ph = (now / 1400) % 1;
          ctx.strokeStyle = rgba(col.accent, 0.5 * (1 - ph) * fade); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x, y, 6 + ph * 18, 0, 6.2832); ctx.stroke();
        }
        ctx.fillStyle = rgba(col.accent, fade); ctx.beginPath(); ctx.arc(x, y, 5.5, 0, 6.2832); ctx.fill();
      } else if (m.k === 'target') {
        ctx.fillStyle = rgba(col.bg, fade); ctx.strokeStyle = rgba(col.accent, fade); ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.2832); ctx.fill(); ctx.stroke();
      } else {
        ctx.fillStyle = rgba(col.muted, 0.9 * fade); ctx.beginPath(); ctx.arc(x, y, 3.6, 0, 6.2832); ctx.fill();
      }
      if (narrow) return;
      ctx.textAlign = m.a; ctx.fillStyle = rgba(col.ink, 0.85 * fade);
      ctx.fillText(m.n, x + m.dx, y + m.dy);
    });
  }

  var running = false, visible = true, t0 = performance.now(), raf = 0;
  function loop(now) {
    if (!running) return;
    frame(performance.now(), t0, true);
    raf = requestAnimationFrame(loop);
  }
  function start() { if (running || reduce || !visible || document.hidden) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function still() { frame(performance.now(), t0, false); }

  readColours(); size();
  if (reduce) { still(); } else { start(); }
  if (window.ResizeObserver) { new ResizeObserver(function () { size(); if (!running) still(); }).observe(hero); }
  else { window.addEventListener('resize', function () { size(); if (!running) still(); }); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { readColours(); if (!running) still(); });
  }
})();

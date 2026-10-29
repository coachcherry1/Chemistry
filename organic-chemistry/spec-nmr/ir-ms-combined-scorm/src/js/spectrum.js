/* spectrum.js — turns a band table into a drawn IR spectrum.
 *
 * Absorption is modelled per band and combined multiplicatively so percent
 * transmittance can never leave 0-100:
 *
 *     T(v) = baseline(v) * PRODUCT over bands of (1 - depth * profile(v))
 *
 * Lorentzian profiles give the sharp bands; Gaussian profiles give the broad
 * hydrogen-bonded O-H envelopes. A small amount of seeded jitter and detector
 * noise is added so a molecule never draws pixel-identical twice and students
 * read the chemistry instead of memorising a picture.
 */

var IR = (function () {
  var V_MAX = 4000, V_MIN = 400;

  /* Deterministic PRNG (mulberry32) so a given seed always redraws the same. */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function lorentz(v, c, w) {
    var x = (v - c) / (w / 2);
    return 1 / (1 + x * x);
  }

  function gauss(v, c, w) {
    var x = (v - c) / w;
    return Math.exp(-2.7725887 * x * x); /* 4 ln 2 */
  }

  /* Apply seeded jitter to band centres: real samples never land exactly on
     the textbook number, and neither should ours. Jitter stays well inside
     each band's tolerance window. */
  function jitter(bands, seed) {
    var r = rng(seed), out = [];
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      var span = b.s === 'g' ? 18 : 6;
      var c = b.c + (r() - 0.5) * 2 * span;
      if (b.t && b.tol) {
        /* Keep the jittered centre off the edge of its window, but cap the
           margin: a wide window (the carbonyl region is 280 cm-1 across) would
           otherwise drag a band towards the middle and misplace it - an amide
           C=O at 1655 would be pushed up past 1670. */
        var pad = Math.min(10, (b.tol[1] - b.tol[0]) * 0.18);
        c = Math.max(b.tol[0] + pad, Math.min(b.tol[1] - pad, c));
      }
      out.push({
        g: b.g, c: c, w: b.w * (0.92 + r() * 0.16), d: b.d * (0.93 + r() * 0.14),
        s: b.s, tol: b.tol, t: b.t, nominal: b.c
      });
    }
    return out;
  }

  /* Percent transmittance at one wavenumber. */
  function transmittance(bands, v) {
    var t = 1;
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      var p = b.s === 'g' ? gauss(v, b.c, b.w) : lorentz(v, b.c, b.w);
      if (p < 0.0004) continue;
      t *= (1 - b.d * p);
    }
    return t * 100;
  }

  /* A drawable spectrum: jittered bands plus the sampled curve. */
  function build(molecule, seed) {
    var bands = jitter(molecule.bands, seed);
    var r = rng(seed ^ 0x9e3779b9);
    var N = 1800, pts = new Float64Array(N), i, v;
    var drift = 0.6 + r() * 1.4, phase = r() * 6.283;
    for (i = 0; i < N; i++) {
      v = V_MAX - (V_MAX - V_MIN) * (i / (N - 1));
      var base = 98.4 - drift * Math.sin(phase + 3.1 * i / N);
      var noise = (r() - 0.5) * 0.55;
      pts[i] = Math.max(0.6, Math.min(100, transmittance(bands, v) * base / 100 + noise));
    }
    return { molecule: molecule, bands: bands, curve: pts, n: N, seed: seed };
  }

  /* Wavenumber of a sample index and back again. */
  function vAt(i, n) { return V_MAX - (V_MAX - V_MIN) * (i / (n - 1)); }

  /* Plot geometry, recomputed on every draw so resizing stays exact. */
  function plotRect(w, h) {
    return { x: 52, y: 14, w: Math.max(40, w - 52 - 14), h: Math.max(40, h - 14 - 34) };
  }

  function xOfV(v, rect) {
    return rect.x + rect.w * (V_MAX - v) / (V_MAX - V_MIN);
  }

  function vOfX(px, rect) {
    return V_MAX - (px - rect.x) / rect.w * (V_MAX - V_MIN);
  }

  function yOfT(t, rect) {
    return rect.y + rect.h * (100 - t) / 100;
  }

  /* %T at one wavenumber, by nearest sample. */
  function tAt(spec, v) {
    var i = Math.round((V_MAX - v) / (V_MAX - V_MIN) * (spec.n - 1));
    return spec.curve[Math.max(0, Math.min(spec.n - 1, i))];
  }

  /* Minimum %T inside a window — used to park a label callout on its peak. */
  function depthAt(spec, v0, v1) {
    var lo = Math.min(v0, v1), hi = Math.max(v0, v1), best = 100, bestV = (lo + hi) / 2;
    for (var i = 0; i < spec.n; i++) {
      var v = vAt(i, spec.n);
      if (v < lo || v > hi) continue;
      if (spec.curve[i] < best) { best = spec.curve[i]; bestV = v; }
    }
    return { t: best, v: bestV };
  }

  /* Read tokens fresh on each draw so a theme change repaints correctly. */
  function tone(name, fallback) {
    var c = getComputedStyle(document.documentElement).getPropertyValue(name);
    return c && c.trim() ? c.trim() : fallback;
  }

  function draw(canvas, spec) {
    var dpr = window.devicePixelRatio || 1;
    var cssW = canvas.clientWidth, cssH = canvas.clientHeight;
    if (!cssW || !cssH) return null;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    var rect = plotRect(cssW, cssH);
    var ink = tone('--ink', '#12212e');
    var grid = tone('--grid', '#d8e2ea');
    var trace = tone('--trace', '#0f5d8f');
    var muted = tone('--muted', '#5d7283');

    /* plot face */
    ctx.fillStyle = tone('--paper', '#ffffff');
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    /* grid + axis labels */
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (var v = 4000; v >= 400; v -= 500) {
      var x = Math.round(xOfV(v, rect)) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, rect.y); ctx.lineTo(x, rect.y + rect.h); ctx.stroke();
      ctx.fillText(String(v), x, rect.y + rect.h + 6);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var t = 0; t <= 100; t += 20) {
      var y = Math.round(yOfT(t, rect)) + 0.5;
      ctx.beginPath(); ctx.moveTo(rect.x, y); ctx.lineTo(rect.x + rect.w, y); ctx.stroke();
      ctx.fillText(String(t), rect.x - 7, y);
    }

    /* axis titles */
    ctx.save();
    ctx.translate(13, rect.y + rect.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = muted;
    ctx.fillText('% Transmittance', 0, 0);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Wavenumber (cm⁻¹)', rect.x + rect.w / 2, cssH - 4);

    /* frame */
    ctx.strokeStyle = grid;
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);

    /* the trace */
    ctx.beginPath();
    for (var i = 0; i < spec.n; i++) {
      var px = xOfV(vAt(i, spec.n), rect);
      var py = yOfT(spec.curve[i], rect);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = trace;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    /* Two teaching lines: 3000 separates sp2 C-H from sp3 C-H, and 1500
       separates the diagnostic region from the fingerprint region. Captions sit
       on their own chips, on two different rows so they cannot collide at
       narrow widths, and below the baseline trace so they stay readable. */
    ctx.font = '10px system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    function divider(v, capY, leftText, rightText) {
      var xd = Math.round(xOfV(v, rect)) + 0.5;
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = tone('--divider', '#b48ac8');
      ctx.beginPath(); ctx.moveTo(xd, rect.y); ctx.lineTo(xd, rect.y + rect.h); ctx.stroke();
      ctx.restore();

      [[leftText, false], [rightText, true]].forEach(function (pair) {
        var text = pair[0], toRight = pair[1];
        var tw = ctx.measureText(text).width;
        var cx = toRight ? xd + 5 : xd - 5 - tw;
        ctx.fillStyle = tone('--paper', '#ffffff');
        ctx.globalAlpha = 0.88;
        ctx.fillRect(cx - 3, capY - 8, tw + 6, 15);
        ctx.globalAlpha = 1;
        ctx.fillStyle = muted;
        ctx.textAlign = 'left';
        ctx.fillText(text, cx, capY);
      });
    }

    divider(3000, rect.y + rect.h * 0.11, '\u2190 sp\u00B2 C\u2013H', 'sp\u00B3 C\u2013H \u2192');
    divider(1500, rect.y + rect.h * 0.22, '\u2190 diagnostic region', 'fingerprint \u2192');
    ctx.textBaseline = 'alphabetic';

    return rect;
  }

  return {
    V_MAX: V_MAX, V_MIN: V_MIN,
    build: build, draw: draw, plotRect: plotRect,
    xOfV: xOfV, vOfX: vOfX, yOfT: yOfT, depthAt: depthAt, tAt: tAt, rng: rng
  };
})();

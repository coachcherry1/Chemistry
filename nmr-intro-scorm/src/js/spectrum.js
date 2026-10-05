/* spectrum.js — turns a compound into a drawn ¹H NMR spectrum.
 *
 * Each set of equivalent hydrogens becomes one signal: n neighbouring H split
 * it into n + 1 lines with Pascal's-triangle intensities, and the total area
 * of the signal is proportional to the number of H in the set. Every line is
 * a Lorentzian, so peak heights follow from areas exactly as they would on an
 * instrument.
 *
 * The spectrum is simulated at 60 MHz with one coupling constant (J = 7 Hz)
 * for everything. That is a real benchtop field strength, and it spreads a
 * quartet over about 0.35 ppm, so multiplets can be read on the full plot
 * instead of needing a zoomed inset for each one. Insets are still drawn,
 * the way a printed spectrum draws them, for any multiplet whose outer lines
 * would otherwise be too small to count (a septet, typically) - each labelled
 * with its vertical expansion, ×4 or ×8.
 *
 * A small seeded jitter moves every shift by up to ±0.015 ppm so a compound
 * never draws identically twice, and TMS is drawn at 0 ppm as the reference.
 */

var NMR = (function () {
  'use strict';

  var FIELD = 60;              /* MHz */
  var J = 7.0;                 /* Hz */
  var SPACING = J / FIELD;     /* ppm between neighbouring lines of a multiplet */
  var BROAD = { acid: 0.16, alcohol: 0.07 };   /* O-H line widths, ppm */

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

  function pascal(n) {
    var row = [1];
    for (var k = 0; k < n; k++) {
      var next = [1];
      for (var i = 1; i < row.length; i++) next.push(row[i - 1] + row[i]);
      next.push(1);
      row = next;
    }
    return row;
  }

  /* A drawable spectrum: one signal per set, sorted downfield first. */
  function build(mol, seed) {
    var r = rng(seed);
    var signals = Chem.sets(mol).map(function (s) {
      var d = Math.round((s.d + (r() - 0.5) * 0.03) * 1000) / 1000;
      var row = pascal(s.n), total = Math.pow(2, s.n);
      return {
        set: s, d: d, n: s.n, nH: s.nH, mult: s.mult,
        w: s.br ? (BROAD[s.r] || 0.07) : 0,
        lines: row.map(function (c, k) {
          return { d: d + (s.n / 2 - k) * SPACING, a: s.nH * c / total };
        }),
        hi: d + s.n / 2 * SPACING, lo: d - s.n / 2 * SPACING
      };
    });
    signals.sort(function (a, b) { return b.d - a.d; });

    /* Relative integrals, as an instrument would print them: the leftmost of
       the smallest signals is 1.00 and the rest carry a couple of percent of
       noise, so a student has to round, not just read. */
    var minH = Math.min.apply(null, signals.map(function (s) { return s.nH; }));
    var ref = signals.filter(function (s) { return s.nH === minH; })[0];
    signals.forEach(function (s, i) {
      s.i = i;
      var noise = s === ref ? 0 : (r() - 0.5) * 0.04;
      s.rel = Math.round(s.nH / minH * (1 + noise) * 100) / 100;
    });

    var top = Math.max.apply(null, signals.map(function (s) { return s.hi + s.w * 2; }));
    return { mol: mol, signals: signals, hi: Math.max(5, Math.ceil(top + 0.6)), lo: -0.5, seed: seed };
  }

  /* Read tokens fresh on each draw so a theme change repaints correctly. */
  function tone(name, fallback) {
    var c = getComputedStyle(document.documentElement).getPropertyValue(name);
    return c && c.trim() ? c.trim() : fallback;
  }

  /* Draw the spectrum and return the geometry the overlay needs.
   *
   *   opts.integral   draw the stepped integral curve
   *   opts.under      function (signal) -> text printed under that signal
   */
  function draw(canvas, spec, opts) {
    opts = opts || {};
    var dpr = window.devicePixelRatio || 1;
    var cssW = canvas.clientWidth, cssH = canvas.clientHeight;
    if (!cssW || !cssH) return null;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    var under = opts.under ? 20 : 0;
    var rect = { x: 12, y: 8, w: Math.max(40, cssW - 24), h: Math.max(60, cssH - 8 - 44 - under) };
    var span = spec.hi - spec.lo;
    var ppx = rect.w / span;
    var base = rect.y + rect.h;
    function xOf(d) { return rect.x + (spec.hi - d) * ppx; }

    /* A sharp line is never drawn narrower than about 2.4 px, so its peak
       cannot fall between two samples and come out short. */
    var sharp = Math.max(0.012, 2.4 / ppx);
    function widthOf(sig) { return sig.w || sharp; }

    function signalAt(sig, d) {
      var w = widthOf(sig), hw = w / 2, v = 0;
      for (var i = 0; i < sig.lines.length; i++) {
        var l = sig.lines[i], x = (d - l.d) / hw;
        v += l.a / (Math.PI * hw) / (1 + x * x);
      }
      return v;
    }
    function totalAt(d) {
      var v = 0;
      for (var i = 0; i < spec.signals.length; i++) v += signalAt(spec.signals[i], d);
      return v;
    }

    var ink = tone('--ink', '#12212e');
    var grid = tone('--grid', '#e2eaf1');
    var trace = tone('--trace', '#0f5d8f');
    var muted = tone('--muted', '#5d7283');
    var expand = tone('--expand', '#7e3fb5');
    var integralTone = tone('--integral', '#b45309');
    var paper = tone('--paper', '#ffffff');

    /* sample the whole trace once; the tallest point sets the vertical scale */
    var N = Math.max(600, Math.ceil(rect.w * dpr * 2));
    var vals = new Float64Array(N + 1), peak = 0, i, d;
    for (i = 0; i <= N; i++) {
      d = spec.hi - span * i / N;
      vals[i] = totalAt(d);
      if (vals[i] > peak) peak = vals[i];
    }
    var k = rect.h * 0.78 / (peak || 1);

    /* Per-signal geometry, and which signals need an expansion inset: a
       multiplet whose outer lines would be under about 10 px tall, or a
       signal too low to see at all (a broad acid O-H). The inset floats
       above the signal it magnifies, at the smallest zoom that makes the
       weakest line readable, or the largest that fits under the plot top. */
    var geo = spec.signals.map(function (sig) {
      var hts = sig.lines.map(function (l) { return signalAt(sig, l.d) * k; });
      var tall = Math.max.apply(null, hts), weak = Math.min.apply(null, hts);
      var g = { sig: sig, x: xOf(sig.d), top: base - tall, zoom: 0, lift: 0 };
      var faint = sig.n > 0 ? weak < rect.h * 0.035 : tall < rect.h * 0.045;
      if (faint) {
        var lift = tall + rect.h * 0.07;
        var room = rect.h * 0.94 - lift - 16;
        var want = sig.n > 0 ? rect.h * 0.03 / weak : rect.h * 0.25 / tall;
        [2, 4, 8, 16, 32, 64].some(function (z) {
          if (tall * z > room) return true;
          g.zoom = z;
          return z >= want;
        });
        if (g.zoom) {
          g.lift = lift;
          g.top = base - lift - tall * g.zoom - 16;
        }
      }
      return g;
    });

    /* plot face */
    ctx.fillStyle = paper;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    /* grid and shift labels */
    var step = ppx < 26 ? 2 : 1;
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (var t = Math.floor(spec.hi); t >= Math.ceil(spec.lo); t--) {
      if (t % step) continue;
      var gx = Math.round(xOf(t)) + 0.5;
      ctx.beginPath(); ctx.moveTo(gx, rect.y); ctx.lineTo(gx, base); ctx.stroke();
      ctx.fillText(String(t), gx, base + 6);
    }

    /* baseline */
    ctx.strokeStyle = muted;
    ctx.beginPath(); ctx.moveTo(rect.x, base + 0.5); ctx.lineTo(rect.x + rect.w, base + 0.5); ctx.stroke();

    /* TMS reference at 0 ppm, a fixed modest height */
    var tmsW = sharp, tmsH = rect.h * 0.2;
    ctx.beginPath();
    for (i = 0; i <= 160; i++) {
      d = 0.25 - 0.5 * i / 160;
      var tx = (d) / (tmsW / 2);
      var ty = base - tmsH / (1 + tx * tx);
      if (i === 0) ctx.moveTo(xOf(d), ty); else ctx.lineTo(xOf(d), ty);
    }
    ctx.strokeStyle = trace;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = muted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('TMS', xOf(0), base - tmsH - 4);

    /* the integral, a stepped curve rising across each signal */
    if (opts.integral) {
      var totalH = spec.signals.reduce(function (s, g) { return s + g.nH; }, 0);
      var ik = rect.h * 0.5 / totalH, ibase = base - rect.h * 0.05;
      ctx.beginPath();
      for (i = 0; i <= N; i += 2) {
        d = spec.hi - span * i / N;
        var area = 0;
        spec.signals.forEach(function (sig) {
          var hw = widthOf(sig) / 2;
          sig.lines.forEach(function (l) { area += l.a * (0.5 - Math.atan((d - l.d) / hw) / Math.PI); });
        });
        var iy = ibase - area * ik, ix = rect.x + rect.w * i / N;
        if (i === 0) ctx.moveTo(ix, iy); else ctx.lineTo(ix, iy);
      }
      ctx.strokeStyle = integralTone;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([]);
      ctx.stroke();
    }

    /* the trace */
    ctx.beginPath();
    for (i = 0; i <= N; i++) {
      var x = rect.x + rect.w * i / N, y = base - vals[i] * k;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = trace;
    ctx.lineWidth = 1.4;
    ctx.lineJoin = 'round';
    ctx.stroke();

    /* expansion insets, raised clear of the signal they magnify */
    geo.forEach(function (g) {
      if (!g.zoom) return;
      var sig = g.sig, pad = 0.1 + widthOf(sig) * 2;
      var d0 = sig.hi + pad, d1 = sig.lo - pad, y0 = base - g.lift;
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = expand;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xOf(d0), y0 + 0.5); ctx.lineTo(xOf(d1), y0 + 0.5); ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      var steps = Math.max(80, Math.ceil((xOf(d1) - xOf(d0)) * dpr * 2));
      for (var s = 0; s <= steps; s++) {
        var dd = d0 + (d1 - d0) * s / steps;
        var ey = y0 - signalAt(sig, dd) * k * g.zoom;
        if (s === 0) ctx.moveTo(xOf(dd), ey); else ctx.lineTo(xOf(dd), ey);
      }
      ctx.strokeStyle = expand;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.fillStyle = expand;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('×' + g.zoom, xOf(d0) - 3, y0 - 2);
    });

    /* text under each signal: integrals or H counts */
    if (opts.under) {
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      var right = -Infinity;
      geo.forEach(function (g) {
        var text = opts.under(g.sig);
        if (!text) return;
        var tw = ctx.measureText(text).width;
        var cx = Math.max(g.x, right + 6 + tw / 2);
        right = cx + tw / 2;
        ctx.fillStyle = opts.integral ? integralTone : ink;
        ctx.fillText(text, cx, base + 30);
      });
    }

    /* axis title, with the direction words either side when there is room */
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = muted;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    ctx.fillText('Chemical shift, δ (ppm)', rect.x + rect.w / 2, cssH - 5);
    if (cssW >= 440) {
      ctx.textAlign = 'left';
      ctx.fillText('← downfield (deshielded)', rect.x, cssH - 5);
      ctx.textAlign = 'right';
      ctx.fillText('upfield (shielded) →', rect.x + rect.w, cssH - 5);
    }

    return { rect: rect, base: base, xOf: xOf, signals: geo };
  }

  return { FIELD: FIELD, J: J, SPACING: SPACING, build: build, draw: draw, rng: rng, pascal: pascal };
})();

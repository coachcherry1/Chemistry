/* heat.js: the heating stage.
 *
 * Boxes of particles side by side, one substance in each, and one
 * thermometer for all of them. Drag the thermometer and every box warms or
 * cools together.
 *
 * Inside each box the particles really attract each other (a Lennard-Jones
 * pull that grows as two come close, with a push at very short range),
 * fall gently to the floor, and are kept at the box's temperature by a
 * thermostat. Cold, they settle into a packed crystal and only vibrate;
 * warmer, they slide past each other as a liquid at the bottom; hot enough,
 * they move fast enough to break free of the attraction and fill the box as
 * a gas.
 *
 * Dashed lines join every pair of particles close enough to attract each
 * other strongly: the intermolecular forces. A solid is a still network of
 * them, a liquid a network that keeps breaking and re-forming as the
 * particles slide, and in a gas they are gone: the gas is drawn as ideal,
 * with no attractions.
 *
 * What is real, and what is a model:
 *  - The phase each box shows is the substance's REAL phase at that
 *    temperature: every box is tuned from its real melting and boiling
 *    points (data.js), so it melts and boils where the substance does. The
 *    label under each box comes straight from those points.
 *  - The motion is drawn to show the idea, not real speeds: a solid barely
 *    vibrates, a liquid flows slowly, a gas flies, and each moves a little
 *    faster as it warms.
 *  - Particles are drawn as their molecule's shape, but each one moves as a
 *    single ball. Sizes are not to scale.
 * With reduced motion the boxes stand still: each shows its phase as a
 * still picture that updates when the thermometer moves.
 */

function HeatStage(host, opts) {
  'use strict';
  var h = UI.h;
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }

  var ids = opts.ids;
  var minK = opts.minK, maxK = opts.maxK;
  var K = opts.startK != null ? opts.startK : minK;
  var maxSeen = K, minSeen = K;
  var N = 28;
  var BW = 9, BH = 9;              /* box size, in particle diameters */
  var G = 0.25;                    /* gravity, reduced units */
  var RC = 2.5, RC2 = RC * RC;
  var IMF_R2 = 1.27 * 1.27;       /* neighbours closer than this are drawn joined by an IMF */
  var ECUT = 4 * (Math.pow(1 / RC, 12) - Math.pow(1 / RC, 6));

  /* the box's reduced temperature: placed so the box is a crystal below the
     real melting point, a liquid between, a gas above the boiling point */
  function reduced(id, T) {
    var x = Chem.sub(id);
    /* measured in this box: a crystal that only vibrates up to 0.15, a liquid
       that holds together on the floor and flows slowly at 0.33 to 0.38, a
       gas filling the box from 1.8 */
    if (T >= x.bp) return 1.8 + 1.0 * Math.min(1, (T - x.bp) / (0.4 * x.bp + 20));
    if (x.mp == null || T >= x.mp) {
      var lo = x.mp == null ? 0.5 * x.bp : x.mp;
      return 0.33 + 0.05 * Math.max(0, Math.min(1, (T - lo) / (x.bp - lo)));
    }
    return 0.03 + 0.12 * Math.max(0, Math.min(1, T / x.mp));
  }

  /* element colours for the particles */
  var COLOR = { H: '#e9eef2', He: '#5fd0dc', C: '#505c66', N: '#3d6fd8', O: '#d6392f', F: '#86c84a', Ne: '#f08a5d',
                Cl: '#2ea84f', Ar: '#a879c4', Br: '#9a3326', Kr: '#3fb6c4', I: '#7d3fa1', Xe: '#2f8fd8' };

  /* ----------------------------------------------------------- the DOM */

  var boxes = ids.map(function (id) {
    var x = Chem.sub(id);
    var canvas = h('canvas', { class: 'heat-canvas', role: 'img' });
    var phase = h('p', { class: 'heat-phase' });
    var facts = h('p', { class: 'heat-facts' });
    var fig = h('figure', { class: 'heat-box' }, [
      h('figcaption', { class: 'heat-title' }, [h('b', { text: x.text }), ' ', h('span', { class: 'muted', text: x.name })]),
      canvas, phase, facts
    ]);
    return { id: id, x: x, canvas: canvas, ctx: canvas.getContext('2d'), phase: phase, facts: facts, node: fig,
             p: [], v: [], a: [], ang: [], spin: [], Tst: reduced(id, K), glyph: glyphOf(id) };
  });

  var range = h('input', { type: 'range', class: 'thermo-range', min: String(Math.round(minK)), max: String(Math.round(maxK)),
    step: '1', value: String(Math.round(K)), 'aria-label': 'Thermometer' });
  var readC = h('span', { class: 'thermo-c' });
  var readK = h('span', { class: 'thermo-k' });
  var thermo = h('div', { class: 'thermo' + (opts.fixed ? ' fixed' : '') }, [
    h('div', { class: 'thermo-read' }, [h('span', { class: 'thermo-icon', 'aria-hidden': 'true', text: '🌡' }), readC, readK]),
    opts.fixed ? null : h('div', { class: 'thermo-track' }, [range]),
    h('p', { class: 'heat-key' }, [h('span', { class: 'imf-line', 'aria-hidden': 'true' }),
      ' dashed lines: the attractions (IMFs) between neighbouring particles'])
  ]);
  var node = h('div', { class: 'heat' }, [h('div', { class: 'heat-boxes n' + ids.length }, boxes.map(function (b) { return b.node; })), thermo]);
  host.appendChild(node);

  /* ----------------------------------------------------------- particles */

  function seed(b) {
    var cols = Math.floor(BW / 1.12);
    b.p = []; b.v = []; b.a = []; b.ang = []; b.spin = [];
    for (var i = 0; i < N; i++) {
      var r = Math.floor(i / cols), c = i % cols;
      b.p.push([0.6 + c * 1.12 + (r % 2) * 0.56, 0.6 + r * 0.97]);
      var s = Math.sqrt(b.Tst);
      b.v.push([(Math.random() - 0.5) * 2 * s, (Math.random() - 0.5) * 2 * s]);
      b.a.push([0, 0]);
      b.ang.push(Math.random() * 6.283);
      b.spin.push((Math.random() - 0.5) * 2);
    }
    /* a gas starts spread out, so a box above its boiling point is a gas at once */
    if (b.Tst >= 1) b.p.forEach(function (p) { p[0] = 0.5 + Math.random() * (BW - 1); p[1] = 0.5 + Math.random() * (BH - 1); });
    forces(b);
  }

  function forces(b) {
    var p = b.p, a = b.a, n = p.length;
    for (var i = 0; i < n; i++) { a[i][0] = 0; a[i][1] = -G; }
    for (i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        var dx = p[i][0] - p[j][0], dy = p[i][1] - p[j][1], r2 = dx * dx + dy * dy;
        if (r2 > RC2) continue;
        if (r2 < 0.5) r2 = 0.5;
        var ir2 = 1 / r2, ir6 = ir2 * ir2 * ir2;
        var f = 24 * ir2 * ir6 * (2 * ir6 - 1);
        a[i][0] += f * dx; a[i][1] += f * dy;
        a[j][0] -= f * dx; a[j][1] -= f * dy;
      }
    }
  }

  function kinetic(b) {
    var s = 0;
    b.v.forEach(function (v) { s += v[0] * v[0] + v[1] * v[1]; });
    return s / (2 * b.v.length);          /* 2D: kT per particle = <v²>/2 */
  }

  function step(b, dt) {
    var p = b.p, v = b.v, a = b.a, n = p.length, i;
    for (i = 0; i < n; i++) {
      v[i][0] += 0.5 * a[i][0] * dt; v[i][1] += 0.5 * a[i][1] * dt;
      p[i][0] += v[i][0] * dt; p[i][1] += v[i][1] * dt;
      if (p[i][0] < 0.5) { p[i][0] = 0.5; v[i][0] = Math.abs(v[i][0]); }
      if (p[i][0] > BW - 0.5) { p[i][0] = BW - 0.5; v[i][0] = -Math.abs(v[i][0]); }
      if (p[i][1] < 0.5) { p[i][1] = 0.5; v[i][1] = Math.abs(v[i][1]); }
      if (p[i][1] > BH - 0.5) { p[i][1] = BH - 0.5; v[i][1] = -Math.abs(v[i][1]); }
    }
    forces(b);
    for (i = 0; i < n; i++) { v[i][0] += 0.5 * a[i][0] * dt; v[i][1] += 0.5 * a[i][1] * dt; }
    /* thermostat: nudge the kinetic energy toward the box's temperature */
    var T = kinetic(b);
    if (T > 1e-9) {
      var lam = Math.sqrt(1 + (dt / 0.08) * (b.Tst / T - 1));
      if (!isFinite(lam) || lam <= 0) lam = 0.5;
      lam = Math.max(0.8, Math.min(1.25, lam));
      for (i = 0; i < n; i++) { v[i][0] *= lam; v[i][1] *= lam; }
    }
    for (i = 0; i < n; i++) b.ang[i] += b.spin[i] * Math.sqrt(b.Tst) * dt * 3;
  }

  /* reduced time per second of real time, by phase: a still solid, a slow
     liquid, a fast gas that speeds up as it warms */
  function rate(b) {
    if (b.Tst < 0.3) return 0.9;
    if (b.Tst < 1) return 1.2;
    return 2.4 + 1.2 * Math.min(1, (b.Tst - 1.8) / 1.0);
  }

  /* ----------------------------------------------------------- drawing */

  /* a molecule's shape as small circles around its centre, sized to fit one
     particle diameter */
  function glyphOf(id) {
    var s = SUBSTANCES[id];
    var cx = 0, cy = 0;
    s.atoms.forEach(function (a) { cx += a[1]; cy += a[2]; });
    cx /= s.atoms.length; cy /= s.atoms.length;
    var reach = 0;
    s.atoms.forEach(function (a) { reach = Math.max(reach, Math.hypot(a[1] - cx, a[2] - cy)); });
    var k = reach > 0 ? 0.27 / reach : 0;
    return s.atoms.map(function (a) {
      return { x: (a[1] - cx) * k, y: (a[2] - cy) * k, r: a[0] === 'H' ? 0.11 : s.atoms.length === 1 ? 0.3 : 0.17, c: COLOR[a[0]] || '#888' };
    });
  }

  function cssVar(name, fallback) {
    try { var v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim(); return v || fallback; }
    catch (e) { return fallback; }
  }

  function draw(b) {
    var c = b.canvas, ctx = b.ctx;
    var r = c.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    var W = Math.max(10, Math.round(r.width * dpr)), H = Math.max(10, Math.round(r.height * dpr));
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    var s = Math.min(W / BW, H / BH);
    var ox = (W - BW * s) / 2, oy = (H - BH * s) / 2;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = cssVar('bg', '#f2f5f8');
    ctx.fillRect(ox, oy, BW * s, BH * s);
    ctx.strokeStyle = cssVar('line', '#dde5ec');
    ctx.lineWidth = 2 * dpr;
    ctx.strokeRect(ox, oy, BW * s, BH * s);
    var edge = cssVar('ink', '#12212e');
    /* the intermolecular forces: a dashed line between every pair of
       neighbours close enough to hold on to each other, in a solid or a
       liquid. A gas is treated as ideal: no lines at all. */
    var condensed = Chem.phaseAt(b.id, K) !== 'gas';
    ctx.save();
    ctx.strokeStyle = cssVar('accent', '#0f5d8f');
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = Math.max(1.5 * dpr, 0.05 * s);
    ctx.setLineDash([0.12 * s, 0.1 * s]);
    ctx.beginPath();
    for (var i = 0; condensed && i < b.p.length; i++) {
      for (var j = i + 1; j < b.p.length; j++) {
        var dx = b.p[i][0] - b.p[j][0], dy = b.p[i][1] - b.p[j][1];
        if (dx * dx + dy * dy > IMF_R2) continue;
        ctx.moveTo(ox + b.p[i][0] * s, oy + (BH - b.p[i][1]) * s);
        ctx.lineTo(ox + b.p[j][0] * s, oy + (BH - b.p[j][1]) * s);
      }
    }
    ctx.stroke();
    ctx.restore();
    b.p.forEach(function (p, i) {
      var X = ox + p[0] * s, Y = oy + (BH - p[1]) * s;
      var ca = Math.cos(b.ang[i]), sa = Math.sin(b.ang[i]);
      b.glyph.forEach(function (g) {
        var gx = X + (g.x * ca - g.y * sa) * s, gy = Y + (g.x * sa + g.y * ca) * s;
        ctx.fillStyle = g.c;
        ctx.beginPath(); ctx.arc(gx, gy, g.r * s, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = Math.max(1, 0.03 * s);
        ctx.strokeStyle = edge;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    });
  }

  /* ----------------------------------------------------------- the loop */

  var anim = null, last = null;

  function frame(ts) {
    if (last == null) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    boxes.forEach(function (b) {
      var span = rate(b) * dt, n = Math.min(30, Math.ceil(span / 0.006));
      for (var k = 0; k < n; k++) step(b, span / n);
      draw(b);
    });
    anim = requestAnimationFrame(frame);
  }

  /* reduced motion: a still picture of each phase, settled off screen */
  function settle() {
    boxes.forEach(function (b) {
      seed(b);
      for (var k = 0; k < 1600; k++) step(b, 0.006);
      draw(b);
    });
  }

  function label() {
    var Tc = Chem.fmtC(K);
    readC.textContent = Tc;
    readK.textContent = Chem.fmtK(K);
    range.setAttribute('aria-valuetext', Chem.fmtT(K) + ': ' + boxes.map(function (b) {
      return b.x.text + ' ' + Chem.phaseAt(b.id, K);
    }).join(', '));
    boxes.forEach(function (b) {
      var ph = Chem.phaseAt(b.id, K);
      b.phase.className = 'heat-phase ph-' + ph;
      b.phase.textContent = Chem.cap(ph) + (b.x.mp == null && ph === 'liquid' ? ' (never freezes at normal pressure)' : '');
      b.facts.textContent = (b.x.mp != null ? 'melts ' + Chem.fmtT(b.x.mp) + ' · ' : '') + 'boils ' + Chem.fmtT(b.x.bp);
      b.canvas.setAttribute('aria-label', b.x.name + ' at ' + Chem.fmtT(K) + ': ' + ph + '.');
    });
  }

  function setK(k, quiet) {
    K = Math.max(minK, Math.min(maxK, k));
    maxSeen = Math.max(maxSeen, K);
    minSeen = Math.min(minSeen, K);
    range.value = String(Math.round(K));
    boxes.forEach(function (b) {
      var was = b.Tst;
      b.Tst = reduced(b.id, K);
      /* crossing into the gas gives the particles a kick of speed at once */
      if (was < 1 && b.Tst >= 1) b.v.forEach(function (v) { v[0] *= 1.6; v[1] = Math.abs(v[1]) * 1.6 + 0.6; });
    });
    if (reduceMotion) settle();
    label();
    if (!quiet && opts.onChange) opts.onChange(K, maxSeen, minSeen);
  }

  range.addEventListener('input', function () { setK(+range.value); });

  boxes.forEach(seed);
  label();
  var ro = window.ResizeObserver ? new ResizeObserver(function () { boxes.forEach(draw); }) : null;
  if (ro) boxes.forEach(function (b) { ro.observe(b.canvas); });
  if (reduceMotion) settle(); else anim = requestAnimationFrame(frame);

  return {
    node: node, range: range,
    setK: function (k) { setK(k, true); },
    K: function () { return K; },
    maxSeen: function () { return maxSeen; },
    minSeen: function () { return minSeen; },
    /* for the tests: how spread out each box is (0 packed .. 1 filling the box) */
    spread: function () {
      var out = {};
      boxes.forEach(function (b) {
        var top = 0;
        b.p.forEach(function (p) { top = Math.max(top, p[1]); });
        var hi = b.p.filter(function (p) { return p[1] > BH * 0.55; }).length / b.p.length;
        out[b.id] = hi;
      });
      return out;
    },
    destroy: function () { if (anim) cancelAnimationFrame(anim); anim = null; if (ro) ro.disconnect(); }
  };
}

/* beaker.js: the beaker of particles, and the animation of one drop.
 *
 * Every particle has a place of its own in a jittered grid of 143 cells, shuffled
 * once so the kinds are mixed. Counts come from Buf.counts, never from here:
 *   family unit i (40)   the acid member or the base member of the pair; a unit
 *                        that changes from one to the other flashes
 *   (the spectator ions Na+ and Cl- are not drawn; the model still counts them for the pH)
 *   H+ (12)   OH- (12)   free H+ and OH-
 * Water is not drawn.
 *
 * A drop is shown in four beats so students can see the reaction:
 *   1. the particles that will react pulse,
 *   2. the drop (HCl or NaOH) falls from the dropper,
 *   3. the H+ (or OH-) leaves the drop and travels to a particle,
 *   4. that particle changes form (it flashes), and for a base a little H2O appears.
 * Reduced motion, or ?speed=0, skips the movement and just updates the beaker.
 */

var Beaker = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var W = 520, H = 560, COLS = 11, ROWS = 13;
  var X0 = 80, X1 = 440, Y0 = 222, Y1 = 506;          /* where the particles live */
  var SURFACE = 196, TIP = 96, DROPX = 260;
  var FAM0 = 0, NA0 = 40, CL0 = 72, H0 = 104, OH0 = 116;
  var speed = 1;

  function s(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  var CELLS = (function () {
    var rand = UI.rng(20241107), cells = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        cells.push({ x: X0 + (c + 0.5) * (X1 - X0) / COLS + (rand() - 0.5) * 5, y: Y0 + (r + 0.5) * (Y1 - Y0) / ROWS + (rand() - 0.5) * 4 });
      }
    }
    return UI.shuffle(cells, rand);
  })();

  function label(txt) { return s('text', { x: 0, y: 0, text: txt, class: txt.length > 3 ? 'long' : null }); }
  function pos(cell) { return 'translate(' + cell.x.toFixed(1) + ' ' + cell.y.toFixed(1) + ')'; }

  function ion(cls, txt, cell) {
    var inner = s('g', { class: 'p ' + cls + ' off' }, [s('circle', { r: 10.5, cx: 0, cy: 0 }), label(txt)]);
    return { outer: s('g', { transform: pos(cell) }, [inner]), el: inner };
  }
  function molecule(cls, txt, cell) {
    var inner = s('g', { class: 'p ' + cls + ' off' }, [s('rect', { x: -16, y: -10, width: 32, height: 20, rx: 7 }), label(txt)]);
    return { outer: s('g', { transform: pos(cell) }, [inner]), el: inner };
  }
  function member(pair, which, cell) {
    var P = Buf.PAIRS[pair], isAcid = which === 'ha';
    var ionic = P.type === 'acid' ? !isAcid : isAcid;
    var cls = isAcid ? 'p-ha' : 'p-a', txt = isAcid ? P.ha : P.a;
    return ionic ? ion(cls, txt, cell) : molecule(cls, txt, cell);
  }

  /* the dropper and the beaker glass */
  function glass() {
    var g = s('g', { class: 'glass' });
    g.appendChild(s('rect', { x: 246, y: 8, width: 28, height: 78, rx: 5, class: 'dropper-tube' }));
    g.appendChild(s('path', { d: 'M246 8 Q260 -14 274 8', class: 'dropper-bulb' }));
    g.appendChild(s('path', { d: 'M254 86 L266 86 L262 98 L258 98 Z', class: 'dropper-tip' }));
    return g;
  }

  /* create() -> { node, build(pair), render(pair, ha, a, up, dn, flash), drop(...), busy(), setSpeed(v) } */
  function create() {
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'beaker-svg', role: 'img', 'aria-label': 'A beaker of buffer solution' });
    var defs = s('defs', null, [s('clipPath', { id: 'liquidClip' }, [s('path', { d: 'M66 168 L454 168 L454 500 Q454 522 432 522 L88 522 Q66 522 66 500 Z' })])]);
    svg.appendChild(defs);
    var liquid = s('rect', { x: 60, y: SURFACE, width: 400, height: 330, class: 'liquid', 'clip-path': 'url(#liquidClip)' });
    svg.appendChild(liquid);
    svg.appendChild(s('path', { d: 'M60 150 L60 500 Q60 528 88 528 L432 528 Q460 528 460 500 L460 150', class: 'beaker-glass' }));
    svg.appendChild(s('path', { d: 'M52 150 L68 150 M452 150 L468 150', class: 'beaker-glass' }));
    [250, 300, 350, 400, 450].forEach(function (y, i) {
      svg.appendChild(s('line', { x1: 60, x2: i % 2 ? 80 : 94, y1: y, y2: y, class: 'beaker-tick' }));
    });
    svg.appendChild(glass());
    var layer = s('g', { class: 'layer' });
    svg.appendChild(layer);
    var over = s('g', { class: 'over' });
    svg.appendChild(over);

    var node = document.createElement('figure');
    node.className = 'beaker';
    node.appendChild(svg);

    var el = null, pairNow = null, prevForm = null, working = false;

    function build(pair) {
      pairNow = pair; prevForm = null;
      while (layer.firstChild) layer.removeChild(layer.firstChild);
      el = { HA: [], A: [], H: [], OH: [] };
      function put(list, made) { layer.appendChild(made.outer); list.push(made.el); }
      var i;
      for (i = 0; i < Buf.FAM; i++) { put(el.HA, member(pair, 'ha', CELLS[FAM0 + i])); put(el.A, member(pair, 'a', CELLS[FAM0 + i])); }
      for (i = 0; i < 12; i++) put(el.H, ion('p-h', 'H⁺', CELLS[H0 + i]));
      for (i = 0; i < 12; i++) put(el.OH, ion('p-oh', 'OH⁻', CELLS[OH0 + i]));
    }

    function toggle(g, on) { g.classList.toggle('off', !on); }
    function showFirst(list, n) { for (var k = 0; k < list.length; k++) toggle(list[k], k < n); }

    /* draw a state at once; with flash, a unit that changed form flashes */
    function render(pair, ha, a, up, dn, flash) {
      if (pair !== pairNow) build(pair);
      var c = Buf.counts(pair, ha, a, up, dn), T = ha + a, form = [];
      for (var k = 0; k < Buf.FAM; k++) {
        var f = k >= T ? null : (k < c.A ? 'a' : 'ha');
        form.push(f);
        toggle(el.A[k], f === 'a');
        toggle(el.HA[k], f === 'ha');
        el.A[k].classList.remove('pulse'); el.HA[k].classList.remove('pulse');
        if (flash && prevForm && f && prevForm[k] && prevForm[k] !== f) {
          var g = f === 'a' ? el.A[k] : el.HA[k];
          g.classList.remove('flash'); void g.getBoundingClientRect(); g.classList.add('flash');
        }
      }
      prevForm = form;
      showFirst(el.H, c.H); showFirst(el.OH, c.OH);
      liquid.style.fill = Buf.colour(Buf.pH(pair, ha, a, up, dn));
      svg.setAttribute('aria-label', 'Beaker: ' + c.HA + ' ' + Buf.PAIRS[pair].ha + ', ' + c.A + ' ' + Buf.PAIRS[pair].a + ', ' + c.H + ' free H+, ' + c.OH + ' free OH-');
      return c;
    }

    function wait(ms) { return new Promise(function (res) { setTimeout(res, ms * speed); }); }
    function fly(g, from, to, ms, easing) {
      if (!g.animate || speed === 0) { g.style.transform = 'translate(' + to.x + 'px,' + to.y + 'px)'; return Promise.resolve(); }
      var a = g.animate([{ transform: 'translate(' + from.x + 'px,' + from.y + 'px)' }, { transform: 'translate(' + to.x + 'px,' + to.y + 'px)' }],
        { duration: ms * speed, easing: easing || 'ease-in-out', fill: 'forwards' });
      return a.finished.catch(function () { /* cancelled */ });
    }

    /* the target unit: the first unit whose form the drop changes (or -1 when nothing reacts) */
    function targetUnit(dir, before, after) {
      if (dir === 'acid') return after.A < before.A ? after.A : -1;
      return after.A > before.A ? before.A : -1;
    }

    /* drop(dir, pair, now, next) -> Promise: now and next are { ha, a, up, dn } before and after the drop */
    function drop(dir, pair, now, next) {
      working = true;
      var cBefore = Buf.counts(pair, now.ha, now.a, now.up, now.dn), cAfter = Buf.counts(pair, next.ha, next.a, next.up, next.dn);
      var idx = targetUnit(dir, cBefore, cAfter);
      var reacting = dir === 'acid' ? el.A : el.HA;
      function finish() {
        over.innerHTML = '';
        render(pair, next.ha, next.a, next.up, next.dn, true);
        working = false;
      }
      if (speed === 0) { finish(); return Promise.resolve({ target: idx >= 0 }); }

      /* 1. the particles that will react pulse */
      reacting.forEach(function (g) { if (!g.classList.contains('off')) g.classList.add('pulse'); });
      var cls = dir === 'acid' ? 'acid' : 'base';
      var dropG = s('g', { class: 'drop drop-' + cls, style: 'transform: translate(' + DROPX + 'px,' + TIP + 'px)' },
        [s('path', { d: 'M0 -16 C10 0 12 8 0 12 C-12 8 -10 0 0 -16 Z' }), s('text', { x: 0, y: 3, text: dir === 'acid' ? 'HCl' : 'NaOH' })]);
      over.appendChild(dropG);
      return wait(450).then(function () {
        /* 2. the drop falls */
        return fly(dropG, { x: DROPX, y: TIP }, { x: DROPX, y: SURFACE + 8 }, 520, 'ease-in');
      }).then(function () {
        over.removeChild(dropG);
        /* 3. the H+ or OH- leaves the drop and travels */
        var vis = ion(dir === 'acid' ? 'p-h' : 'p-oh', dir === 'acid' ? 'H⁺' : 'OH⁻', { x: 0, y: 0 });
        vis.el.classList.remove('off');
        vis.el.classList.add('visitor');
        var g = vis.outer; g.removeAttribute('transform'); g.style.transform = 'translate(' + DROPX + 'px,' + (SURFACE + 14) + 'px)';
        over.appendChild(g);
        var from = { x: DROPX, y: SURFACE + 14 };
        if (idx < 0) {
          /* nothing to react with: it stays free and is drawn when the beaker updates */
          return wait(400).then(function () { return { g: g, cell: null }; });
        }
        var cell = CELLS[FAM0 + idx];
        return fly(g, from, { x: cell.x, y: cell.y }, 900, 'ease-in-out').then(function () { return { g: g, cell: cell }; });
      }).then(function (r) {
        /* 4. the particle changes form */
        over.innerHTML = '';
        render(pair, next.ha, next.a, next.up, next.dn, true);
        if (r.cell && dir === 'base') {
          var w = s('g', { class: 'water-bubble', style: 'transform: translate(' + r.cell.x + 'px,' + (r.cell.y - 16) + 'px)' },
            [s('rect', { x: -20, y: -10, width: 40, height: 20, rx: 10 }), s('text', { x: 0, y: 1, text: 'H₂O' })]);
          over.appendChild(w);
          if (w.animate) w.animate([{ opacity: 1, transform: w.style.transform }, { opacity: 0, transform: 'translate(' + r.cell.x + 'px,' + (r.cell.y - 46) + 'px)' }],
            { duration: 1400 * speed, fill: 'forwards' });
        }
        return wait(idx >= 0 ? 700 : 300);
      }).then(function () {
        over.innerHTML = '';
        working = false;
        return { target: idx >= 0 };
      });
    }

    return {
      node: node, build: build, render: render, drop: drop,
      busy: function () { return working; },
      setSpeed: function (v) { speed = v; }
    };
  }

  return { create: create };
})();

/* hybrid.js — the resonance hybrid: what it is, and the pictures of it.
 *
 *   structures(sp)   every resonance structure (all of Rule 5's choices), in
 *                    the answer's layout, the one the answer key draws first
 *   compute(sp)      the hybrid: the average of those structures
 *                      orders   bond order of every bond (4/3 for carbonate)
 *                      labels   '1⅓' on every bond that is not a whole number
 *                      cloud    the bonds the shared-out electrons spread over
 *   draw(sp, opts)   the hybrid as SVG — or, for checkpoint distractors, a
 *                    deliberately wrong "hybrid" (opts.variant)
 *   row(sp)          the resonance structures in standard notation: A ↔ B ↔ C
 *   overlay(sp)      the structures stacked on top of each other, then
 *                    "averaged" into the hybrid (an animation)
 *   ruler(sp)        the measured bond length, between a single and a double
 *                    bond — the evidence that the hybrid is real
 */

var Hybrid = (function () {
  'use strict';
  var h = UI.h;

  var VULGAR = { '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾' };

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  /* 4/3 → '1⅓', 3/2 → '1½', 2/1 → '2' */
  function fracText(num, den) {
    var g = gcd(num, den); num /= g; den /= g;
    var whole = Math.floor(num / den), rem = num - whole * den;
    if (!rem) return String(whole);
    return (whole ? String(whole) : '') + (VULGAR[rem + '/' + den] || ('+' + rem + '/' + den));
  }

  var cache = {};

  function structures(sp) {
    var outs = Lewis.rule5Outcomes(sp);
    var first = JSON.stringify(Lewis.canonical(sp));
    var key = function (s) {
      var d = Lewis.DIRS.filter(function (k) { return s.at[k] && s.bo[k] > 1; })[0];
      return JSON.stringify(s) === first ? -1 : Lewis.DIRS.indexOf(d);
    };
    return outs.slice().sort(function (a, b) { return key(a) - key(b); });
  }

  function compute(sp) {
    if (cache[sp.id]) return cache[sp.id];
    var outs = structures(sp), n = outs.length, s0 = outs[0];
    var orders = {}, labels = {}, cloud = [];
    Lewis.bonds(s0).forEach(function (b) {
      var tot = 0;
      outs.forEach(function (s) { tot += s.bo[b.key] || 1; });
      orders[b.key] = tot / n;
      if (tot % n) { labels[b.key] = fracText(tot, n); if (b.a === 'C') cloud.push(b.key); }
    });
    var order = cloud.length ? labels[cloud[0]] : null;
    var r = { n: n, structures: outs, base: s0, orders: orders, labels: labels, cloud: cloud, order: order, orderValue: cloud.length ? orders[cloud[0]] : null };
    cache[sp.id] = r;
    return r;
  }

  function pairName(sp) {
    var c = compute(sp);
    var k = c.cloud[0];
    return k ? sp.center + '–' + c.base.at[k] : '';
  }

  function describe(sp, r) {
    r = r || compute(sp);
    return 'Resonance hybrid of ' + sp.text + ': ' + sp.center + ' in the center, ' + r.cloud.length + ' identical ' +
      pairName(sp) + ' bonds, each drawn as a solid line plus a dashed line (bond order ' + r.order + '), with the ' +
      'shared electrons spread over all of them.';
  }

  var WORD = { 1: 'one', 2: 'two', 3: 'three', 4: 'four' };

  /* What a drawing shows, in plain words and WITHOUT naming it: the text
     alternative for a checkpoint choice, where "Resonance hybrid of …" would
     give the answer away. */
  function drawingText(sp, variant) {
    var r = compute(sp), v = variant || 'hybrid', k = r.cloud.length, pair = pairName(sp);
    var dbl = pair.replace('–', '='), plural = function (n, w) { return WORD[n] + ' ' + w + (n === 1 ? '' : 's'); };
    var bonds = {
      hybrid: 'all ' + WORD[k] + ' ' + pair + ' bonds drawn as a solid line plus a dashed line, with shading over them',
      one: 'one ' + dbl + ' double bond and ' + plural(k - 1, pair + ' single bond'),
      double: 'all ' + WORD[k] + ' ' + pair + ' bonds drawn as double bonds',
      single: 'all ' + WORD[k] + ' ' + pair + ' bonds drawn as single bonds',
      some: 'one ' + pair + ' single bond and ' + WORD[k - 1] + ' drawn as a solid line plus a dashed line, with shading ' +
            'over those'
    }[v];
    var others = Lewis.DIRS.filter(function (d) { return r.base.at[d] && r.cloud.indexOf(d) < 0; })
      .map(function (d) { return sp.center + '–' + r.base.at[d] + ' single bond'; });
    return sp.text + ': ' + sp.center + ' in the center; ' + bonds + (others.length ? '; a ' + others.join(', a ') : '') + '.';
  }

  /* opts: variant 'hybrid' (default) | 'one' (just one resonance structure,
     drawn hybrid-style) | 'double' (every shared bond double) | 'some' (only
     some bonds shared) | 'single' (every shared bond single);
     labels, cloud: false to leave them out; neutral: describe what is
     drawn without naming it (checkpoint choices); cls, scale */
  function draw(sp, opts) {
    opts = opts || {};
    var r = compute(sp), v = opts.variant || 'hybrid';
    var orders = Object.assign({}, r.orders), labels = Object.assign({}, r.labels), cloud = r.cloud.slice();
    if (v === 'one') {
      Object.keys(orders).forEach(function (k) { orders[k] = r.base.bo[k]; });
      labels = {}; cloud = [];
    } else if (v === 'double' || v === 'single') {
      r.cloud.forEach(function (k) { orders[k] = v === 'double' ? 2 : 1; });
      labels = {}; cloud = [];
    } else if (v === 'some') {
      var k0 = r.cloud[0];
      orders[k0] = 1; delete labels[k0];
      cloud = r.cloud.slice(1);
    }
    if (opts.labels === false) labels = {};
    if (opts.cloud === false) cloud = [];
    return Draw.structure(r.base, {
      scale: opts.scale || 1, noLP: true, orders: orders, labels: labels, cloud: cloud,
      cls: 'hybrid' + (opts.cls ? ' ' + opts.cls : ''),
      title: opts.neutral ? 'Drawing of ' + drawingText(sp, v) : v === 'hybrid' ? describe(sp, r) : 'A drawing of ' + sp.text + ' (' + {
        one: 'one double bond and the rest single', double: 'every bond to ' + sp.center + ' double',
        single: 'every bond single', some: 'only some bonds drawn as partial double bonds'
      }[v] + ')'
    });
  }

  /* the resonance structures, A ↔ B ↔ C */
  function row(sp, opts) {
    opts = opts || {};
    var outs = opts.structures || compute(sp).structures;
    var kids = [];
    outs.forEach(function (s, i) {
      if (i) kids.push(h('span', { class: 'res-arrow', 'aria-hidden': 'true', text: '↔' }));
      kids.push(h('figure', { class: 'res-card' }, [
        Draw.structure(s, { scale: opts.scale || 0.9, cls: 'res-fig',
          title: 'Resonance structure ' + (i + 1) + ': ' + Lewis.describe(s) }),
        opts.captions === false ? null : h('figcaption', { text: String.fromCharCode(65 + i) })
      ]));
    });
    return h('div', { class: 'res-row', role: 'group', 'aria-label': outs.length + ' resonance structures of ' + sp.text +
      ', written with a double-headed arrow between them' }, kids);
  }

  /* The structures stacked on top of each other, then averaged into the
     hybrid. Returns { node, play() }; play() runs the animation (or, with
     reduced motion, jumps to the end) and calls back when the hybrid shows. */
  function overlay(sp, opts) {
    opts = opts || {};
    var r = compute(sp), scale = opts.scale || 1.25;
    var stack = h('div', { class: 'stack' });
    var layers = r.structures.map(function (s) {
      var svg = Draw.structure(s, { scale: scale, alignSingles: true, cls: 'layer', title: '' });
      svg.setAttribute('aria-hidden', 'true');
      stack.appendChild(svg);
      return svg;
    });
    var hyb = draw(sp, { scale: scale, cls: 'layer layer-hybrid' });
    stack.appendChild(hyb);
    var caption = h('p', { class: 'stack-cap', 'aria-live': 'polite' });
    var node = h('div', { class: 'overlay' }, [stack, caption]);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var timers = [];

    function set(mode) {
      stack.className = 'stack ' + mode;
      layers.forEach(function (l, i) {
        l.style.opacity = mode === 'one' ? (i === 0 ? 1 : 0) : mode === 'stacked' ? String(1 / r.n + 0.12) : 0;
      });
      hyb.style.opacity = mode === 'hybrid' ? 1 : 0;
    }
    set('one');
    caption.textContent = 'Structure A on its own.';

    function play(done) {
      timers.forEach(clearTimeout);
      if (reduce) { set('hybrid'); caption.textContent = describe(sp, r); if (done) done(); return; }
      set('one');
      caption.textContent = 'Structure A on its own…';
      timers.push(setTimeout(function () {
        set('stacked');
        caption.textContent = (r.n === 2 ? 'Both structures' : 'All ' + WORD[r.n] + ' structures') + ' laid on top of each ' +
          'other: each bond is double in one structure and single in the ' + (r.n === 2 ? 'other' : 'others') + '…';
      }, 900));
      timers.push(setTimeout(function () {
        set('hybrid');
        caption.textContent = '…and the average is the hybrid: ' + WORD[r.cloud.length] + ' identical bonds, each a ' +
          r.order + ' bond.';
      }, 3300));
      /* once the hybrid has finished fading in (the CSS transition is 1.4 s) */
      if (done) timers.push(setTimeout(done, 3300 + 1450));
    }
    return { node: node, play: play, stop: function () { timers.forEach(clearTimeout); } };
  }

  /* The bond-length ruler: a typical double bond, a typical single bond, the
     student's prediction, and (after they lock it in) the measured length.
     Returns { node } and calls opts.onLocked(predicted) once. opts.done shows
     it already locked, at opts.predicted (the saved prediction) if given. */
  function ruler(sp, opts) {
    opts = opts || {};
    var b = BONDS[sp.id];
    if (!b) return null;
    var dbl = b.pair.replace('–', '=');
    /* narrower on a phone, so the labels stay readable instead of shrinking */
    var W = Math.max(340, Math.min(560, (window.innerWidth || 560) - 64));
    var lo = b.double - 8, hi = b.single + 8, H = 132, x0 = 28, x1 = W - 28, ay = 78;
    function X(pm) { return x0 + (pm - lo) / (hi - lo) * (x1 - x0); }
    var NS = 'http://www.w3.org/2000/svg';
    function el(tag, attrs, text) {
      var n = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      if (text != null) n.textContent = text;
      return n;
    }
    var svg = el('svg', { class: 'ruler', viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': 'Bond length scale in picometers, from ' + lo + ' to ' + hi + '. A typical ' + dbl + ' double bond is ' +
        b.double + ' pm and a typical ' + b.pair + ' single bond is ' + b.single + ' pm.' });
    svg.appendChild(el('line', { class: 'r-axis', x1: x0, y1: ay, x2: x1, y2: ay }));
    for (var t = Math.ceil(lo / 5) * 5; t <= hi; t += 5) {
      svg.appendChild(el('line', { class: 'r-tick', x1: X(t), y1: ay, x2: X(t), y2: ay + (t % 10 ? 4 : 7) }));
      if (!(t % 10)) svg.appendChild(el('text', { class: 'r-num', x: X(t), y: ay + 20 }, String(t)));
    }
    svg.appendChild(el('text', { class: 'r-unit', x: (x0 + x1) / 2, y: ay + 36 }, 'bond length, pm'));
    svg.appendChild(el('text', { class: 'r-end', x: x0, y: H - 2 }, '← shorter, stronger'));
    svg.appendChild(el('text', { class: 'r-end r-end-right', x: x1, y: H - 2 }, 'longer, weaker →'));

    function marker(pm, cls, label, title, labelY) {
      var g = el('g', { class: 'r-mark ' + cls });
      g.appendChild(el('title', {}, title));
      g.appendChild(el('line', { x1: X(pm), y1: ay - 30, x2: X(pm), y2: ay }));
      g.appendChild(el('circle', { cx: X(pm), cy: ay, r: 5 }));
      g.appendChild(el('text', { class: 'r-label', x: X(pm), y: labelY || ay - 36 }, label));
      svg.appendChild(g);
      return g;
    }
    marker(b.double, 'ref', dbl + ' double · ' + b.double, 'Typical ' + dbl + ' double bond: ' + b.double + ' pm');
    marker(b.single, 'ref', b.pair + ' single · ' + b.single, 'Typical ' + b.pair + ' single bond: ' + b.single + ' pm');

    var mid = Math.round((b.single + b.double) / 2);
    var guess = marker(mid, 'guess', 'your prediction', 'Your prediction', ay - 52);
    var actual = null;

    var range = h('input', { type: 'range', class: 'r-range', min: b.double - 6, max: b.single + 6, step: 1, value: mid,
      'aria-label': 'Predict the length of the ' + pairName(sp) + ' bonds in ' + sp.text + ', in picometers' });
    var out = h('output', { class: 'r-out', text: mid + ' pm' });
    var lock = h('button', { type: 'button', class: 'primary', text: 'Lock in my prediction' });
    var msg = h('p', { class: 'reveal', hidden: true, tabindex: '-1', 'aria-live': 'polite' });

    function moveGuess(pm) {
      var x = X(pm);
      guess.querySelector('line').setAttribute('x1', x);
      guess.querySelector('line').setAttribute('x2', x);
      guess.querySelector('circle').setAttribute('cx', x);
      guess.querySelector('text').setAttribute('x', x);
      out.textContent = pm + ' pm';
    }
    range.addEventListener('input', function () { moveGuess(+range.value); });

    var locked = false;
    function doLock() {
      if (locked) return;
      locked = true;
      range.disabled = true;
      lock.disabled = true;
      var p = +range.value;
      actual = marker(b.actual, 'actual', 'measured · ' + b.actual, 'Measured ' + pairName(sp) + ' bonds in ' + sp.text + ': ' +
        b.actual + ' pm', ay - 52 - (Math.abs(X(p) - X(b.actual)) < 90 ? 16 : 0));
      var k = compute(sp).cloud.length;
      msg.hidden = false;
      msg.textContent = (opts.done && opts.predicted == null ? '' : 'You predicted ' + p + ' pm. ') + 'The real ' + pairName(sp) + ' bonds in ' + sp.text + ' are ' + b.actual +
        ' pm — shorter than a single bond (' + b.single + '), longer than a double bond (' + b.double + '), and ' +
        (k === 2 ? 'BOTH' : 'ALL ' + k) + ' of them are exactly the same length. No single resonance structure has ' +
        'that; only the hybrid does. (Shorter also means stronger: these bonds are stronger than a single bond and ' +
        'weaker than a double.)';
      if (opts.onLocked) opts.onLocked(p);
    }
    lock.addEventListener('click', function () {
      doLock();
      msg.focus({ preventScroll: true });          /* the button just disabled itself */
    });

    var node = h('div', { class: 'ruler-box' }, [
      svg,
      h('div', { class: 'r-controls' }, [h('label', { class: 'r-field' }, ['Your prediction: ', range, out]), lock]),
      msg
    ]);
    if (opts.done) {
      var was = opts.predicted != null ? opts.predicted : b.actual;
      range.value = was; moveGuess(was); doLock();
    }
    return { node: node, locked: function () { return locked; } };
  }

  return { structures: structures, compute: compute, draw: draw, row: row, overlay: overlay, ruler: ruler,
           describe: describe, drawingText: drawingText, fracText: fracText, pairName: pairName };
})();

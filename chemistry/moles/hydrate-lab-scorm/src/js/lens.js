/* lens.js: the magnifier above the balance. Fifteen CuSO4 units of the crystal with many small water molecules held between them in the
 * crystal structure (the hydrate). The waters are scattered, not grouped, so the diagram does not give the ratio away:
 * the student finds it from the masses. Heating drives the water out one molecule at a time; each leaves as a gas and
 * floats away, and the blue crystal turns white as the water goes.
 *
 *   show(h)   jump to a state, h = how hydrated the solid still is (1 = all its water, 0 = none)
 *   heat(h)   play the water leaving until only that fraction is left
 *   note(t)   replace the caption (null puts it back)
 *
 * How many are left follows the data (the hydration after each heating), so the molecules leaving match the masses.
 */

var Lens = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var UNITS = 15, TOTAL = 83;                     /* many small units with many waters packed among them: the ratio cannot be read off the picture */
  var COLS = 5, CW = 62, CH = 58, X0 = 9, Y0 = 26;
  var BLUE = '#2a73d1', WHITE = '#f1f3f3';

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function blend(c1, c2, t) {
    var a = hex(c1), b = hex(c2);
    return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }).join(',') + ')';
  }

  function waterMol(g, x, y, sc) {
    var m = el('g', { transform: 'translate(' + x + ' ' + y + ') scale(' + (sc || 0.6) + ')' }, g);
    el('circle', { r: 6.5, class: 'lens-o' }, m);
    el('circle', { cx: -6.5, cy: 5.5, r: 4, class: 'lens-h' }, m);
    el('circle', { cx: 6.5, cy: 5.5, r: 4, class: 'lens-h' }, m);
    return m;
  }

  function create(opts) {
    opts = opts || {};
    var speed = opts.speed == null ? 1 : opts.speed;
    var holder = document.createElement('figure');
    holder.className = 'lens';
    var wrap = document.createElement('div'); wrap.className = 'lens-svg-wrap';
    var cap = document.createElement('figcaption'); cap.className = 'lens-cap';
    holder.appendChild(wrap); holder.appendChild(cap);

    var svg = el('svg', { viewBox: '0 0 500 215', class: 'lens-svg', role: 'img', 'aria-label': 'Magnifier: water molecules held in the crystal' });
    el('rect', { x: 2, y: 2, width: 496, height: 211, rx: 14, class: 'lens-bg' }, svg);
    el('text', { x: 24, y: 18, class: 'lens-title', text: 'Inside the crystal (boxes: CuSO₄)' }, svg);
    el('text', { x: 346, y: 18, class: 'lens-title', text: 'Water gas leaving' }, svg);
    el('line', { x1: 336, y1: 8, x2: 336, y2: 205, class: 'lens-divider' }, svg);
    var gUnits = el('g', {}, svg), gFly = el('g', {}, svg);
    wrap.appendChild(svg);

    /* the six units, and the waters scattered in the spaces between them */
    var boxes = [], slots = [], present = [], centres = [], gW = el('g', {}, gUnits);
    for (var u = 0; u < UNITS; u++) {
      var cx = X0 + CW / 2 + (u % COLS) * CW, cy = Y0 + CH / 2 + Math.floor(u / COLS) * CH + 4;
      centres.push([cx, cy]);
      var g = el('g', {}, gUnits);
      boxes.push(el('rect', { x: cx - 15, y: cy - 8, width: 30, height: 16, rx: 4, class: 'lens-unit' }, g));
      el('text', { x: cx, y: cy + 3, 'text-anchor': 'middle', class: 'lens-lab lens-lab-s', text: 'CuSO₄' }, g);
    }
    function rnd(i, salt) { var x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); }
    var cand = [];
    for (var gy = 0; gy < 13; gy++) for (var gx = 0; gx < 21; gx++) {
      var px = 18 + gx * 15 + (rnd(gx * 21 + gy, 1) - 0.5) * 9, py = 34 + gy * 14 + (rnd(gx * 21 + gy, 2) - 0.5) * 8, ok = true;
      centres.forEach(function (c) { if (Math.abs(px - c[0]) < 21 && Math.abs(py - c[1]) < 13) ok = false; });
      if (px > 324 || py > 206) ok = false;
      if (ok) cand.push([px, py, rnd(gx * 21 + gy, 3)]);
    }
    cand.sort(function (a, b) { return a[2] - b[2]; });
    cand = cand.slice(0, TOTAL); TOTAL = cand.length;
    for (var w = 0; w < cand.length; w++) { slots.push({ x: cand[w][0], y: cand[w][1], node: waterMol(gW, cand[w][0], cand[w][1]) }); present.push(true); }
    /* the order the waters leave in: spread over the diagram, the same every time */
    var order = [];
    for (var o = 0; o < slots.length; o++) order.push(o);
    order.sort(function (a, b) { return rnd(a, 7) - rnd(b, 7); });

    var h = 1, noteText = null, waters = TOTAL, epoch = 0;

    function paintBoxes(hh) { boxes.forEach(function (b) { b.setAttribute('fill', blend(WHITE, BLUE, Math.max(0, Math.min(1, hh)))); }); }
    function captionNow() {
      if (noteText) { cap.textContent = noteText; return; }
      cap.textContent = waters >= TOTAL ? 'In the blue crystal, many water molecules are held in the crystal structure among the CuSO₄ units.' :
        (waters > 0 ? 'Heat drives the water out of the crystal as a gas. The crystal loses its blue colour.' : 'All the water has left. The white solid that is left is CuSO₄ with no water (anhydrous).');
    }
    function setWaters(n) {            /* jump: exactly n waters in the crystal */
      for (var i = 0; i < TOTAL; i++) present[i] = true;
      for (i = 0; i < TOTAL - n; i++) present[order[i]] = false;
      slots.forEach(function (s, idx) { s.node.style.display = present[idx] ? '' : 'none'; });
      waters = n;
    }

    function show(hh) {
      epoch++; while (gFly.firstChild) gFly.removeChild(gFly.firstChild);
      noteText = null; h = hh;
      setWaters(Math.round(TOTAL * hh)); paintBoxes(hh); captionNow();
    }

    /* one water molecule leaves its place and floats off to the right and up, fading */
    function release(idx, slotNo) {
      var s = slots[idx];
      s.node.style.display = 'none';
      present[idx] = false;
      if (speed === 0) return;
      var from = { x: s.x, y: s.y }, to = { x: 345 + (slotNo % 4) * 36 + 10, y: 40 + (slotNo * 23) % 120 };
      var outer = el('g', {}, gFly);
      waterMol(outer, from.x, from.y, 1);
      if (!outer.animate) { gFly.removeChild(outer); return; }
      var a = outer.animate([{ transform: 'translate(0px,0px)', opacity: 1 }, { transform: 'translate(' + (to.x - from.x) + 'px,' + (to.y - from.y) + 'px)', opacity: 0 }],
        { duration: 1800 * speed, easing: 'ease-out', fill: 'forwards' });
      a.onfinish = function () { if (outer.parentNode) outer.parentNode.removeChild(outer); };
    }

    function heat(hh) {
      var want = Math.round(TOTAL * hh), ep = epoch, n = 0;
      while (waters > want) {
        var idx = order[TOTAL - waters];
        release(idx, TOTAL - waters + n);
        waters--; n++;
      }
      h = hh; paintBoxes(hh); captionNow();
      return n;                                    /* how many just left, so the bench can send up gas */
    }

    function note(t) { noteText = t || null; captionNow(); }
    show(1);
    return { node: holder, show: show, heat: heat, note: note, waters: function () { return waters; }, TOTAL: TOTAL, setSpeed: function (v) { speed = v; } };
  }

  return { create: create, UNITS: UNITS };
})();

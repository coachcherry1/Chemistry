/* lens.js: the magnifier above the balance. Six CuSO4 units of the crystal, each with its water molecules held in the
 * crystal structure (the hydrate). Heating drives the water out one molecule at a time; each leaves as a gas and
 * floats away, and the blue crystal turns white as the water goes.
 *
 *   show(h)   jump to a state, h = how hydrated the solid still is (1 = all its water, 0 = none)
 *   heat(h)   play the water leaving until only that fraction is left
 *   note(t)   replace the caption (null puts it back)
 *
 * The molecules shown follow the data: UNITS units with PER water each (the lab's true ratio), so the number that
 * leaves matches the mass the balance reports.
 */

var Lens = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var UNITS = 6, PER = 5, TOTAL = UNITS * PER;
  var COLS = 3, CW = 104, CH = 92, X0 = 14, Y0 = 26;
  var OFFS = [[-37, -25], [0, -34], [37, -25], [-27, 27], [27, 27]];       /* where a unit's 5 waters sit around it */
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

  function waterMol(g, x, y) {
    var m = el('g', { transform: 'translate(' + x + ' ' + y + ')' }, g);
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
    el('text', { x: 24, y: 18, class: 'lens-title', text: 'Inside the crystal' }, svg);
    el('text', { x: 346, y: 18, class: 'lens-title', text: 'Water gas leaving' }, svg);
    el('line', { x1: 336, y1: 8, x2: 336, y2: 205, class: 'lens-divider' }, svg);
    var gUnits = el('g', {}, svg), gFly = el('g', {}, svg);
    wrap.appendChild(svg);

    /* the six units and their 30 waters */
    var boxes = [], slots = [], present = [];
    for (var u = 0; u < UNITS; u++) {
      var cx = X0 + CW / 2 + (u % COLS) * CW, cy = Y0 + CH / 2 + Math.floor(u / COLS) * CH + 4;
      var g = el('g', {}, gUnits);
      var box = el('rect', { x: cx - 19, y: cy - 11, width: 38, height: 22, rx: 5, class: 'lens-unit' }, g);
      el('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', class: 'lens-lab', text: 'CuSO₄' }, g);
      boxes.push(box);
      for (var k = 0; k < PER; k++) {
        slots.push({ x: cx + OFFS[k][0], y: cy + OFFS[k][1], node: waterMol(g, cx + OFFS[k][0], cy + OFFS[k][1]) });
        present.push(true);
      }
    }
    /* the order the waters leave in: spread over the units, the same every time */
    var order = [];
    for (k = 0; k < PER; k++) for (u = 0; u < UNITS; u++) order.push(u * PER + ((k * 2 + u) % PER));
    var seen = {}; order = order.filter(function (i) { if (seen[i]) return false; seen[i] = 1; return true; });
    for (var i2 = 0; i2 < TOTAL; i2++) if (!seen[i2]) order.push(i2);

    var h = 1, noteText = null, waters = TOTAL, epoch = 0;

    function paintBoxes(hh) { boxes.forEach(function (b) { b.setAttribute('fill', blend(WHITE, BLUE, Math.max(0, Math.min(1, hh)))); }); }
    function captionNow() {
      if (noteText) { cap.textContent = noteText; return; }
      cap.textContent = waters >= TOTAL ? 'In the blue crystal every CuSO₄ has water molecules held in the crystal structure.' :
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
      waterMol(outer, from.x, from.y);
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

  return { create: create, UNITS: UNITS, PER: PER };
})();

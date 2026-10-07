/* graph.js — energy versus dihedral angle.
 *
 * One SVG plot that serves every step:
 *   trace    the curve appears only where the student has turned the molecule
 *   sketch   seven handles the student drags to predict the curve's shape
 *   drops    targets at the six named angles for the vocabulary labels
 *   letters  A–F points for quiz questions
 *   curves   several molecules overlaid, for the comparisons in part 3
 *
 * The whole plot is redrawn on every change. A 360-point path is cheap, and it
 * keeps the state in one place.
 */

var EnergyGraph = (function () {
  'use strict';

  var THUMB = 112;   /* thumbnail Newman projections, in plot units */

  function Graph(host, opts) {
    opts = opts || {};
    this.host = host;
    this.mol = opts.mol;
    this.thumbs = !!opts.thumbs;
    this.hideNumbers = !!opts.hideNumbers;
    /* Size the drawing to the space it gets, so text stays a readable size
       instead of scaling with the plot. */
    var w = host.clientWidth || 640;
    this.W = Math.max(340, Math.min(960, w));
    var plot = Math.round(Math.max(190, Math.min(290, this.W * 0.3)));
    this.H = 14 + plot + 46 + (this.thumbs ? THUMB + 16 : 0);
    var pad = this.thumbs ? 30 : 0;   /* room for the 0° and 360° pictures */
    this.box = { x0: 58 + pad, x1: this.W - 18 - pad, y0: 14, y1: 14 + plot };
    this.yMax = opts.yMax || niceMax(maxEnergy([this.mol]));
    this.curves = [];        /* [{mol, cls, label, visited?}] */
    this.marker = null;
    this.sketch = null;
    this.sketchEditable = false;
    this.drops = null;
    this.letters = null;
    this.onSketch = null;
    this.svg = Draw.svg('0 0 ' + this.W + ' ' + this.H, 'graph');
    host.appendChild(this.svg);
    this.attach();
  }

  function maxEnergy(mols) {
    var m = 0;
    mols.forEach(function (mol) {
      for (var p = 0; p < 360; p += 2) m = Math.max(m, GEOM.energyAt(mol, p));
    });
    return m;
  }

  function niceMax(e) { return Math.max(15, Math.ceil((e + 2) / 5) * 5); }

  Graph.maxEnergy = maxEnergy;
  Graph.niceMax = niceMax;

  Graph.prototype.X = function (phi) { var b = this.box; return b.x0 + (b.x1 - b.x0) * phi / 360; };
  Graph.prototype.Y = function (e) { var b = this.box; return b.y1 - (b.y1 - b.y0) * e / this.yMax; };
  Graph.prototype.Yfrac = function (f) { var b = this.box; return b.y1 - (b.y1 - b.y0) * f; };

  /* Smooth periodic curve through the six sketch values (0..300); the
     seventh handle at 360° is the same conformation as 0°. */
  function sketchAt(vals, phi) {
    var n = 6, t = (phi / 60), i = Math.floor(t) % n, u = t - Math.floor(t);
    function v(k) { return vals[((k % n) + n) % n]; }
    var p0 = v(i - 1), p1 = v(i), p2 = v(i + 1), p3 = v(i + 2);
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
                  (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
  }
  Graph.sketchAt = sketchAt;

  Graph.prototype.render = function () {
    var s = this.svg, self = this, b = this.box, el = Draw.el;
    while (s.firstChild) s.removeChild(s.firstChild);

    /* grid and axes */
    var grid = el('g', { class: 'g-grid' }, s);
    for (var a = 0; a <= 360; a += 60) {
      el('line', { x1: this.X(a), y1: b.y0, x2: this.X(a), y2: b.y1, class: a % 120 === 0 ? 'g-ecl' : 'g-stag' }, grid);
      el('text', { x: this.X(a), y: b.y1 + 17, 'text-anchor': 'middle', class: 'g-tick' }, s, a + '°');
    }
    var step = this.yMax > 30 ? 10 : 5;
    for (var e = 0; e <= this.yMax + 0.01; e += step) {
      el('line', { x1: b.x0, y1: this.Y(e), x2: b.x1, y2: this.Y(e), class: 'g-h' }, grid);
      if (!this.hideNumbers) {
        el('text', { x: b.x0 - 7, y: this.Y(e), 'text-anchor': 'end', 'dominant-baseline': 'central', class: 'g-tick' }, s, e);
      }
    }
    el('line', { x1: b.x0, y1: b.y1, x2: b.x1, y2: b.y1, class: 'g-axis' }, s);
    el('line', { x1: b.x0, y1: b.y0, x2: b.x0, y2: b.y1, class: 'g-axis' }, s);
    var yl = this.hideNumbers ? 'Energy  (higher ↑)' : 'Energy (kJ/mol)';
    el('text', { x: 14, y: (b.y0 + b.y1) / 2, transform: 'rotate(-90 14 ' + ((b.y0 + b.y1) / 2) + ')',
                 'text-anchor': 'middle', class: 'g-title' }, s, yl);
    el('text', { x: (b.x0 + b.x1) / 2, y: b.y1 + 36, 'text-anchor': 'middle', class: 'g-title' }, s,
       (this.mol.axis || 'Dihedral angle') + ' (°)');

    if (this.thumbs) this.paintThumbs();

    /* the student's prediction, drawn under the real curve */
    if (this.sketch) {
      var d = '';
      for (var p = 0; p <= 360; p += 3) {
        d += (p ? 'L' : 'M') + this.X(p).toFixed(1) + ' ' + this.Yfrac(clamp(sketchAt(this.sketch, p % 360))).toFixed(1);
      }
      el('path', { d: d, class: 'g-sketch' }, s);
    }

    this.curves.forEach(function (c) { self.paintCurve(c); });

    if (this.sketch && this.sketchEditable) this.paintHandles();

    if (this.marker != null && this.curves.length) {
      var m = this.curves[0].mol;
      var x = this.X(this.marker), y = this.Y(GEOM.energyAt(m, this.marker));
      el('line', { x1: x, y1: b.y0, x2: x, y2: b.y1, class: 'g-cursor' }, s);
      el('circle', { cx: x, cy: y, r: 6, class: 'g-dot' }, s);
    }

    if (this.letters) {
      this.letters.forEach(function (L) {
        var m = self.curves[0].mol;
        var x = self.X(L.phi), y = self.Y(GEOM.energyAt(m, L.phi));
        el('circle', { cx: x, cy: y, r: 5, class: 'g-dot' }, s);
        el('text', { x: x, y: y - 14, 'text-anchor': 'middle', class: 'g-letter' }, s, L.letter);
      });
    }

    if (this.drops) this.paintDrops();
  };

  function clamp(v) { return Math.max(0, Math.min(1, v)); }

  Graph.prototype.paintCurve = function (c) {
    var self = this, el = Draw.el;
    var d = '', pen = false;
    for (var p = 0; p <= 360; p++) {
      var seen = !c.visited || c.visited[p % 360];
      var prev = p > 0 && (!c.visited || c.visited[(p - 1) % 360]);
      if (!seen) { pen = false; continue; }
      var x = this.X(p).toFixed(1), y = this.Y(GEOM.energyAt(c.mol, p % 360)).toFixed(1);
      d += (pen && prev ? 'L' : 'M') + x + ' ' + y;
      pen = true;
    }
    if (d) el('path', { d: d, class: 'g-curve ' + (c.cls || '') }, this.svg);
    if (c.label && c.labelAt != null) {
      var e = GEOM.energyAt(c.mol, c.labelAt);
      el('text', { x: self.X(c.labelAt) + 6, y: self.Y(e) - 8, class: 'g-curve-label ' + (c.cls || '') }, this.svg, c.label);
    }
  };

  /* A small Newman projection under each named angle, so a prediction is
     made from the pictures rather than from the numbers on the axis. */
  Graph.prototype.paintThumbs = function () {
    var b = this.box, size = Math.min(THUMB, (b.x1 - b.x0) / 6 - 6);
    for (var a = 0; a <= 360; a += 60) {
      var nm = GEOM.newmanAt(this.mol, a % 360);
      var inner = Draw.newman(nm, { offset: a % 120 === 0 ? 20 : 0, cls: 'thumb', bare: true, hideH: true });
      inner.setAttribute('x', (this.X(a) - size / 2).toFixed(1));
      inner.setAttribute('y', (b.y1 + 50).toFixed(1));
      inner.setAttribute('width', size);
      inner.setAttribute('height', (size * 236 / 250).toFixed(1));
      this.svg.appendChild(inner);
    }
  };

  /* ----------------------------------------------------- sketch handles */

  Graph.prototype.paintHandles = function () {
    var el = Draw.el;
    for (var i = 0; i <= 6; i++) {
      var v = this.sketch[i % 6];
      var x = this.X(i * 60), y = this.Yfrac(v);
      var h = el('g', {
        class: 'g-handle', 'data-handle': i, tabindex: 0, role: 'slider',
        'aria-label': 'Predicted energy at ' + (i * 60) + ' degrees' + (i === 6 ? ' (same as 0 degrees)' : ''),
        'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(v * 100)
      }, this.svg);
      el('circle', { cx: x, cy: y, r: 16, class: 'g-handle-hit' }, h);
      el('circle', { cx: x, cy: y, r: 8, class: 'g-handle-dot' }, h);
    }
  };

  Graph.prototype.attach = function () {
    var self = this, drag = null;
    function fracAt(ev) {
      var r = self.svg.getBoundingClientRect();
      var y = (ev.clientY - r.top) * self.H / r.height;
      return clamp((self.box.y1 - y) / (self.box.y1 - self.box.y0));
    }
    function setHandle(i, v) {
      self.sketch[i % 6] = Math.round(v * 100) / 100;
      self.render();
      if (self.onSketch) self.onSketch(self.sketch);
    }
    this.svg.addEventListener('pointerdown', function (ev) {
      if (!self.sketchEditable) return;
      var h = ev.target.closest && ev.target.closest('.g-handle');
      if (!h) return;
      drag = +h.getAttribute('data-handle');
      try { self.svg.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
      ev.preventDefault();
    });
    this.svg.addEventListener('pointermove', function (ev) {
      if (drag == null) return;
      setHandle(drag, fracAt(ev));
    });
    function end() {
      if (drag == null) return;
      var i = drag;
      drag = null;
      var n = self.svg.querySelector('.g-handle[data-handle="' + i + '"]');
      if (n) n.focus({ preventScroll: true });
    }
    this.svg.addEventListener('pointerup', end);
    this.svg.addEventListener('pointercancel', end);
    this.svg.addEventListener('keydown', function (ev) {
      if (!self.sketchEditable) return;
      var h = ev.target.closest && ev.target.closest('.g-handle');
      if (!h) return;
      var i = +h.getAttribute('data-handle');
      var d = ev.key === 'ArrowUp' ? 0.05 : ev.key === 'ArrowDown' ? -0.05 : 0;
      if (!d) return;
      ev.preventDefault();
      setHandle(i, clamp(self.sketch[i % 6] + d));
      var n = self.svg.querySelector('.g-handle[data-handle="' + i + '"]');
      if (n) n.focus({ preventScroll: true });
    });
  };

  /* ------------------------------------------------------- label targets */

  Graph.prototype.paintDrops = function () {
    var self = this, el = Draw.el;
    var m = this.curves[0].mol;
    this.drops.forEach(function (d, i) {
      var e = GEOM.energyAt(m, d.phi);
      var x = self.X(d.phi), y = self.Y(e);
      var above = d.phi % 120 === 0;     /* peaks: label above; valleys: below */
      var ty = above ? y - 26 : y + 26;
      if (ty < self.box.y0 + 12) ty = y + 26;
      if (ty > self.box.y1 - 12) ty = y - 26;
      el('circle', { cx: x, cy: y, r: 5, class: 'g-dot' }, self.svg);
      var w = d.text ? Math.max(54, d.text.length * 7.6 + 16) : 34;
      var g = el('g', {
        class: 'drop gdrop' + (d.text ? ' filled' : ''), 'data-drop': i, tabindex: d.text ? -1 : 0, role: 'button',
        'aria-label': 'Point at ' + d.phi + ' degrees' + (d.text ? ', labelled ' + d.text : ', unlabelled')
      }, self.svg);
      el('rect', { x: x - w / 2, y: ty - 13, width: w, height: 26, rx: 13, class: 'slot-box' }, g);
      el('text', { x: x, y: ty, 'text-anchor': 'middle', 'dominant-baseline': 'central',
                   class: d.text ? 'gdrop-text' : 'slot-plus' }, g, d.text || '+');
    });
  };

  return Graph;
})();

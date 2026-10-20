/* draw.js: the 2D drawings. Chair drawings, flat ring drawings with wedges
 * and dashes, Newman projections down a ring bond, and the ring-flip energy
 * diagram.
 *
 * A chair drawing is not hand-placed: it is the 3D model (chair.js) seen
 * through one fixed camera, a little above the ring and a little round from
 * side-on. Because the projection keeps parallel lines parallel, the axial
 * bonds come out vertical and each equatorial bond parallel to two ring
 * bonds, exactly the rules students learn for drawing chairs by hand. Bonds
 * are drawn back to front with a halo, so where one passes behind another it
 * shows a gap, as in a textbook.
 *
 * Everything is SVG, so it stays sharp at any size and every part a student
 * can act on is a real, focusable element.
 */

var Draw = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var RAD = Math.PI / 180;
  var V = CHAIR.vec;

  function el(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  function svg(viewBox, cls, label) {
    var s = el('svg', { viewBox: viewBox, class: cls || '', role: 'img' });
    if (label) s.setAttribute('aria-label', label);
    return s;
  }

  function fit(s, pts, pad) {
    pad = pad == null ? 10 : pad;
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs) - pad, x1 = Math.max.apply(null, xs) + pad;
    var y0 = Math.min.apply(null, ys) - pad, y1 = Math.max.apply(null, ys) + pad;
    s.setAttribute('viewBox', [x0, y0, x1 - x0, y1 - y0].map(function (v) { return v.toFixed(1); }).join(' '));
    return { w: x1 - x0, h: y1 - y0 };
  }

  function anchorFor(dx) { return dx > 0.35 ? 'start' : dx < -0.35 ? 'end' : 'middle'; }

  /* Rough width of a label in px at the drawings' 16px font. */
  function textW(t) { return 9.2 * t.length + 2; }

  /* ------------------------------------------------------------ chair */

  var S = 60;           /* px per ångström */
  var SUB = 0.95;       /* drawn length of every substituent bond, Å */

  /* Which positions a chair drawing shows when not told: every non-H group,
     and the H on the same carbon. */
  function defaultShow(mol) {
    var out = [];
    MOLECULES.groups(mol).forEach(function (g) {
      [g.c + 't', g.c + 'b'].forEach(function (p) { if (out.indexOf(p) < 0) out.push(p); });
    });
    return out;
  }

  function chairText(mol, t, show) {
    var k = t >= 0.5 ? 1 : 0;
    var bits = MOLECULES.groups(mol).map(function (g) {
      return GROUPS[g.g].name + ' on C' + g.c + ', ' + CHAIR.describe(g.pos, k);
    });
    var shownH = show.filter(function (p) { return MOLECULES.groupAt(mol, CHAIR.carbonOf(p), CHAIR.faceOf(p)) === 'H'; });
    return 'Chair drawing of ' + mol.name + (bits.length ? ': ' + bits.join('; ') : '') +
      (shownH.length === 12 ? '. All twelve H atoms are drawn.' : '.');
  }

  /* Chair drawing of `mol` at flip progress t.
     opts.show     positions to draw ('all' for all twelve); default: the groups
     opts.targets  { pos: { key, aria } } positions drawn as focusable targets
                   (class `drop`, attribute data-drop = key)
     opts.mark     { pos: class } extra classes for a position's bond and label
     opts.text     { pos: text } replace a position's label
     opts.letters  { pos: 'A' } lettered positions (quiz figures)
     opts.numbers  false hides the carbon numbers */
  function chair(mol, t, opts) {
    opts = opts || {};
    t = t || 0;
    var m = CHAIR.model(mol, t);
    var cam = CHAIR.sideCam(t);
    function P3(p) { return [V.dot(cam[0], p) * S, -V.dot(cam[1], p) * S, V.dot(cam[2], p)]; }
    var show = opts.show === 'all' ? CHAIR.POSITIONS.slice() : (opts.show || defaultShow(mol));
    var targets = opts.targets || {}, mark = opts.mark || {}, letters = opts.letters || {}, text = opts.text || {};
    var s = svg('0 0 10 10', 'chair ' + (opts.cls || ''), opts.label || chairText(mol, t, show));
    var pts = [];
    var C = {};
    for (var i = 1; i <= 6; i++) C[i] = P3(CHAIR.atom(m, 'C' + i).p);

    var items = [];
    for (var j = 1; j <= 6; j++) {
      var a = C[j], b = C[j % 6 + 1];
      items.push({ ring: true, a: a, b: b, z: (a[2] + b[2]) / 2 });
    }
    var subs = {};
    show.forEach(function (pos) {
      var c = CHAIR.carbonOf(pos);
      var cp = CHAIR.atom(m, 'C' + c).p, hp = CHAIR.atom(m, pos).p;
      var dir = V.unit(V.sub(hp, cp));
      var end = P3(V.add(cp, V.mul(dir, SUB)));
      var d2 = [end[0] - C[c][0], end[1] - C[c][1]], l2 = Math.sqrt(d2[0] * d2[0] + d2[1] * d2[1]) || 1;
      var u = [d2[0] / l2, d2[1] / l2];
      subs[pos] = { c: c, from: C[c], end: end, u: u, g: CHAIR.atom(m, pos).group };
      items.push({ ring: false, pos: pos, a: C[c], b: end, z: (C[c][2] + end[2]) / 2 });
    });
    items.sort(function (p, q) { return p.z - q.z; });

    var gb = el('g', { class: 'ch-bonds' }, s);
    items.forEach(function (it) {
      var cls = it.ring ? 'ch-ring' : 'ch-sub ' + (mark[it.pos] || '');
      var line = { x1: it.a[0].toFixed(1), y1: it.a[1].toFixed(1), x2: it.b[0].toFixed(1), y2: it.b[1].toFixed(1) };
      el('line', Object.assign({ class: 'ch-halo' }, line), gb);
      el('line', Object.assign({ class: cls }, line), gb);
      pts.push([it.a[0], it.a[1]], [it.b[0], it.b[1]]);
    });

    /* carbon numbers, in the widest open angle round each carbon */
    if (opts.numbers !== false) {
      var gn = el('g', { class: 'ch-nums' }, s);
      for (var n = 1; n <= 6; n++) {
        var dirs = [C[n % 6 + 1], C[(n + 4) % 6 + 1]].map(function (q) { return Math.atan2(q[1] - C[n][1], q[0] - C[n][0]); });
        show.forEach(function (pos) {
          if (CHAIR.carbonOf(pos) === n) dirs.push(Math.atan2(subs[pos].u[1], subs[pos].u[0]));
        });
        dirs.sort(function (x, y) { return x - y; });
        var best = 0, at = 0;
        for (var q = 0; q < dirs.length; q++) {
          var a0 = dirs[q], a1 = q + 1 < dirs.length ? dirs[q + 1] : dirs[0] + 2 * Math.PI;
          if (a1 - a0 > best) { best = a1 - a0; at = (a0 + a1) / 2; }
        }
        var nx = C[n][0] + Math.cos(at) * 13, ny = C[n][1] + Math.sin(at) * 13;
        el('text', { x: nx.toFixed(1), y: ny.toFixed(1), 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'ch-num' + (opts.hotC === n ? ' hot' : '') }, gn, String(n));
        pts.push([nx - 6, ny - 6], [nx + 6, ny + 6]);
      }
    }

    /* labels and targets on top */
    var gl = el('g', { class: 'ch-labels' }, s);
    show.forEach(function (pos) {
      var sb = subs[pos];
      var lab = text[pos] != null ? text[pos] : GROUPS[sb.g].label;
      var gap = 11;
      var lx = sb.end[0] + sb.u[0] * gap, ly = sb.end[1] + sb.u[1] * gap;
      var anchor = anchorFor(sb.u[0]);
      var w = textW(lab);
      /* centre of the label's box, for targets */
      var bx = anchor === 'start' ? lx + w / 2 - 2 : anchor === 'end' ? lx - w / 2 + 2 : lx;
      if (anchor === 'middle') ly += sb.u[1] > 0 ? 3 : -3;
      var tg = targets[pos];
      var parent = gl;
      if (tg) {
        parent = el('g', { class: 'drop chdrop ' + (tg.cls || '') + ' ' + (mark[pos] || ''), 'data-drop': tg.key,
                           'data-pos': pos, tabindex: 0, role: 'button', 'aria-label': tg.aria || pos }, gl);
        var bw = Math.max(30, w + 12);
        el('rect', { x: (bx - bw / 2).toFixed(1), y: (ly - 14).toFixed(1), width: bw.toFixed(1), height: 28, rx: 14,
                     class: 'slot-box' }, parent);
        pts.push([bx - bw / 2, ly - 14], [bx + bw / 2, ly + 14]);
        if (tg.tag) {
          el('text', { x: (bx + bw / 2 - 2).toFixed(1), y: (ly - 13).toFixed(1), 'text-anchor': 'middle',
                       'dominant-baseline': 'central', class: 'ch-tag' }, parent, tg.tag);
        }
        var tone = lab === '+' ? 'slot-plus' : 'tone-' + groupTone(tg.g || sb.g);
        el('text', { x: bx.toFixed(1), y: ly.toFixed(1), 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'ch-label ' + tone }, parent, lab);
      } else if (lab) {
        el('text', { x: bx.toFixed(1), y: ly.toFixed(1), 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'ch-label tone-' + groupTone(sb.g) + ' ' + (mark[pos] || '') }, parent, lab);
        pts.push([bx - w / 2, ly - 10], [bx + w / 2, ly + 10]);
      }
      if (letters[pos]) {
        var lx2 = bx + (anchor === 'end' ? -w / 2 - 12 : w / 2 + 12), ly2 = ly - 12;
        if (anchor === 'middle') { lx2 = bx + 16; ly2 = ly; }
        el('circle', { cx: lx2.toFixed(1), cy: ly2.toFixed(1), r: 10, class: 'ch-letter-bg' }, gl);
        el('text', { x: lx2.toFixed(1), y: ly2.toFixed(1), 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'ch-letter' }, gl, letters[pos]);
        pts.push([lx2 - 12, ly2 - 12], [lx2 + 12, ly2 + 12]);
      }
    });
    fit(s, pts, opts.pad == null ? 8 : opts.pad);
    return s;
  }

  /* ------------------------------------------------------- flat ring */

  /* The ring seen from the top face: a regular hexagon, C1 at the right,
     numbered anticlockwise (the same ring as the chair drawings, seen from
     above). A wedge is a group on the top face, a dash one on the bottom
     face. With only one group the face does not matter, so it gets a plain
     line. */
  function flat(mol, opts) {
    opts = opts || {};
    var R = 40, L = 30;
    var gs = MOLECULES.groups(mol);
    var s = svg('0 0 10 10', 'flat ' + (opts.cls || ''), opts.label || flatText(mol));
    var g = el('g', null, s), pts = [];
    function vtx(k) { var a = (k - 1) * 60 * RAD; return [R * Math.cos(a), -R * Math.sin(a)]; }
    for (var k = 1; k <= 6; k++) {
      var a = vtx(k), b = vtx(k % 6 + 1);
      el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'fl-bond' }, g);
      pts.push(a);
    }
    gs.forEach(function (sub) {
      var v = vtx(sub.c), u = [v[0] / R, v[1] / R];
      var e = [v[0] + u[0] * L, v[1] + u[1] * L];
      var nx = -u[1], ny = u[0];
      if (gs.length === 1) {
        el('line', { x1: v[0], y1: v[1], x2: e[0], y2: e[1], class: 'fl-bond' }, g);
      } else if (sub.f === 't') {
        var w = 6.5;
        el('polygon', { points: [v[0], v[1], e[0] + nx * w, e[1] + ny * w, e[0] - nx * w, e[1] - ny * w].join(' '),
                        class: 'fl-wedge' }, g);
      } else {
        for (var i = 1; i <= 6; i++) {
          var tt = i / 6.3, hw = 6.5 * tt;
          var cx = v[0] + (e[0] - v[0]) * tt, cy = v[1] + (e[1] - v[1]) * tt;
          el('line', { x1: cx + nx * hw, y1: cy + ny * hw, x2: cx - nx * hw, y2: cy - ny * hw, class: 'fl-hash' }, g);
        }
      }
      var lab = GROUPS[sub.g].label;
      var anchor = anchorFor(u[0]);
      var lx = e[0] + u[0] * 6, ly = e[1] + u[1] * 9;
      el('text', { x: lx, y: ly, 'text-anchor': anchor, 'dominant-baseline': 'central',
                   class: 'fl-label tone-' + groupTone(sub.g) }, g, lab);
      var w2 = textW(lab);
      pts.push([anchor === 'end' ? lx - w2 : anchor === 'start' ? lx + w2 : lx - w2 / 2, ly - 10],
               [anchor === 'middle' ? lx + w2 / 2 : lx, ly + 10]);
    });
    if (opts.numbers !== false) {
      for (var n = 1; n <= 6; n++) {
        var p = vtx(n);
        el('text', { x: p[0] * 0.7, y: p[1] * 0.7, 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'fl-num' }, g, String(n));
      }
    }
    var box = fit(s, pts, 8);
    s.setAttribute('width', Math.round(box.w * (opts.scale || 1.2)));
    return s;
  }

  function flatText(mol) {
    var gs = MOLECULES.groups(mol);
    if (!gs.length) return 'Flat drawing of ' + mol.name + '.';
    return 'Flat ring drawing of ' + mol.name + ', seen from the top face: ' + gs.map(function (g) {
      return GROUPS[g.g].name + ' on C' + g.c + (gs.length > 1 ? (g.f === 't' ? ' on a wedge (top face)' : ' on a dash (bottom face)') : '');
    }).join('; ') + '.';
  }

  /* --------------------------------------------------------- Newman */

  var NR = 30, FRONT = 84, BACK = 54, FRONT_LABEL = 100, BACK_LABEL = 66;
  var POS = { 0: 'top', 60: 'upper right', 120: 'lower right', 180: 'bottom', 240: 'lower left', 300: 'upper left' };

  function at(r, a) { return [r * Math.sin(a * RAD), -r * Math.cos(a * RAD)]; }
  function anchorAt(a) { var sx = Math.sin(a * RAD); return sx > 0.3 ? 'start' : sx < -0.3 ? 'end' : 'middle'; }

  /* Static Newman projection of `nm` (CHAIR.newman). opts.hot lists
     positions ('1t') or ring carbons ('R3') to highlight; opts.arc =
     { a, b, text } marks the angle between two groups. An eclipsed
     projection is printed with the back carbon nudged round a few degrees
     (opts.offset), the way textbooks print it, so its bonds still show. */
  function newman(nm, opts) {
    opts = opts || {};
    if (opts.offset) {
      nm = { front: nm.front, carbons: nm.carbons,
             back: nm.back.map(function (q) { return Object.assign({}, q, { a: q.a + opts.offset }); }) };
    }
    var s = svg('-125 -118 250 236', 'newman ' + (opts.cls || ''), opts.label || newmanText(nm));
    var hot = opts.hot || [];
    function isHot(q) { return hot.indexOf(q.pos) >= 0 || (q.ring && hot.indexOf('R' + q.ring) >= 0); }
    var back = el('g', null, s);
    nm.back.forEach(function (q) {
      var p1 = at(NR, q.a), p2 = at(BACK, q.a);
      el('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], class: 'nm-bond-back' + (q.ring ? ' ring' : '') + (isHot(q) ? ' hot' : '') }, back);
    });
    el('circle', { cx: 0, cy: 0, r: NR, class: 'nm-circle' }, s);
    nm.front.forEach(function (q) {
      var p = at(FRONT, q.a);
      el('line', { x1: 0, y1: 0, x2: p[0], y2: p[1], class: 'nm-bond-front' + (q.ring ? ' ring' : '') + (isHot(q) ? ' hot' : '') }, s);
    });
    if (opts.arc) {
      var r = 112, a1 = opts.arc.a, a2 = opts.arc.b;
      var d = ((a2 - a1) % 360 + 360) % 360;
      if (d > 180) { var tmp = a1; a1 = a2; a2 = tmp; d = 360 - d; }
      var p1 = at(r, a1), p2 = at(r, a2);
      el('path', { d: 'M' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 0 1 ' +
                      p2[0].toFixed(1) + ' ' + p2[1].toFixed(1), class: 'nm-arc' }, s);
      var mid = at(r + 10, a1 + d / 2);
      el('text', { x: mid[0].toFixed(1), y: mid[1].toFixed(1), 'text-anchor': anchorAt(a1 + d / 2),
                   'dominant-baseline': 'central', class: 'nm-arc-text' }, s, opts.arc.text);
    }
    var labels = el('g', null, s);
    function label(q, rr, cls) {
      var p = at(rr, q.a);
      el('text', { x: p[0].toFixed(1), y: p[1].toFixed(1), 'text-anchor': anchorAt(q.a), 'dominant-baseline': 'central',
                   class: 'nm-label tone-' + groupTone(q.g) + (cls ? ' ' + cls : '') + (isHot(q) ? ' hot' : '') }, labels,
         GROUPS[q.g].label);
    }
    nm.back.forEach(function (q) { label(q, BACK_LABEL, 'nm-back-label'); });
    nm.front.forEach(function (q) { label(q, FRONT_LABEL); });
    return s;
  }

  function newmanText(nm) {
    function side(list) {
      return list.map(function (q) { return GROUPS[q.g].name + ' ' + (POS[q.a] || q.a + '°'); }).join(', ');
    }
    return 'Newman projection looking down the ' + nm.carbons[0] + '–' + nm.carbons[1] + ' bond. Front carbon (' +
      nm.carbons[0] + '): ' + side(nm.front) + '. Back carbon (' + nm.carbons[1] + '): ' + side(nm.back) + '.';
  }

  /* ------------------------------------------------- ring-flip diagram */

  /* Energy along the flip, from chair 1 (left) to chair 2 (right). The two
     chairs sit at their real relative energies; the hump between them is
     drawn, not computed: it only says that every in-between shape is less
     stable than either chair. There are no numbers on the energy axis. */
  function FlipPlot(host, opts) {
    opts = opts || {};
    this.host = host;
    this.mols = opts.mols || [opts.mol];
    this.captions = opts.captions || null;
    var w = host.clientWidth || 560;
    this.W = Math.max(320, Math.min(720, w));
    this.H = 250;
    this.box = { x0: 44, x1: this.W - 112, y0: 26, y1: this.H - 58 };
    this.marker = null;
    this.markers = null;
    this.svg = svg('0 0 ' + this.W + ' ' + this.H, 'flipplot');
    this.svg.setAttribute('aria-hidden', 'true');
    host.appendChild(this.svg);
    this.setMols(this.mols);
  }

  FlipPlot.prototype.setMols = function (mols) {
    this.mols = mols;
    var lo = Infinity, hi = 0;
    mols.forEach(function (m) {
      [0, 1].forEach(function (k) { var e = AVAL.energy(m, k); lo = Math.min(lo, e); hi = Math.max(hi, e); });
    });
    this.top = Math.max(lo + 45, hi + 15);
    this.yMax = this.top + 6;
  };

  FlipPlot.energyAt = function (mol, t, top) {
    var ea = AVAL.energy(mol, 0), eb = AVAL.energy(mol, 1);
    var s = t * t * (3 - 2 * t);
    var base = ea + (eb - ea) * s;
    var amp = top - (ea + eb) / 2;
    var b = Math.sin(Math.PI * t);
    return base + amp * b * b;
  };

  FlipPlot.prototype.X = function (t) { return this.box.x0 + t * (this.box.x1 - this.box.x0); };
  FlipPlot.prototype.Y = function (e) { return this.box.y1 - (e / this.yMax) * (this.box.y1 - this.box.y0); };

  FlipPlot.prototype.render = function () {
    var s = this.svg, b = this.box, self = this;
    while (s.firstChild) s.removeChild(s.firstChild);
    el('line', { x1: b.x0, y1: b.y1 + 4, x2: b.x0, y2: b.y0 - 10, class: 'g-axis' }, s);
    el('path', { d: 'M' + (b.x0 - 5) + ' ' + (b.y0 - 4) + ' L' + b.x0 + ' ' + (b.y0 - 13) + ' L' + (b.x0 + 5) + ' ' + (b.y0 - 4), class: 'g-axis g-arrow' }, s);
    el('text', { x: b.x0 - 12, y: (b.y0 + b.y1) / 2, 'text-anchor': 'middle', class: 'g-title',
                 transform: 'rotate(-90 ' + (b.x0 - 12) + ' ' + ((b.y0 + b.y1) / 2) + ')' }, s, 'Energy');
    el('line', { x1: b.x0, y1: b.y1 + 4, x2: b.x1 + 4, y2: b.y1 + 4, class: 'g-axis' }, s);
    el('text', { x: (b.x0 + b.x1) / 2, y: this.H - 8, 'text-anchor': 'middle', class: 'g-title' }, s, 'Ring flip');

    this.mols.forEach(function (mol, i) {
      var cls = i === 0 ? '' : ' alt';
      var d = '';
      for (var k = 0; k <= 100; k++) {
        var t = k / 100;
        d += (k ? ' L' : 'M') + self.X(t).toFixed(1) + ' ' + self.Y(FlipPlot.energyAt(mol, t, self.top)).toFixed(1);
      }
      el('path', { d: d, class: 'g-curve' + cls }, s);
      [0, 1].forEach(function (kk) {
        var y = self.Y(AVAL.energy(mol, kk)), x = self.X(kk);
        el('line', { x1: x - 16, y1: y, x2: x + 16, y2: y, class: 'g-level' + cls }, s);
      });
    });

    el('text', { x: this.X(0.5), y: this.Y(this.top) - 9, 'text-anchor': 'middle', class: 'g-note' }, s,
       b.x1 - b.x0 < 260 ? 'less stable shapes' : 'in-between shapes: all less stable');

    /* chair names under the ends */
    ['Chair 1', 'Chair 2'].forEach(function (n, k) {
      el('text', { x: self.X(k), y: b.y1 + 22, 'text-anchor': 'middle', class: 'g-tick strong' }, s, n);
      if (self.captions) {
        el('text', { x: self.X(k), y: b.y1 + 37, 'text-anchor': k ? 'end' : 'start', class: 'g-tick',
                     dx: k ? 16 : -16 }, s, self.captions[k]);
      }
    });

    /* the gap between the chairs, for a single molecule */
    if (this.mols.length === 1) {
      var m = this.mols[0];
      var ea = AVAL.energy(m, 0), eb = AVAL.energy(m, 1);
      if (Math.abs(ea - eb) > 0.05) {
        var x = this.X(1) + 30, y1 = this.Y(ea), y2 = this.Y(eb);
        el('line', { x1: this.X(0) + 16, y1: y1, x2: x + 6, y2: y1, class: 'g-guide' }, s);
        el('line', { x1: x, y1: y1, x2: x, y2: y2, class: 'g-gap' }, s);
        var up = y1 < y2 ? 1 : -1;
        if (Math.abs(y2 - y1) > 16) {
          el('path', { d: 'M' + (x - 4) + ' ' + (y1 + up * 7) + ' L' + x + ' ' + y1 + ' L' + (x + 4) + ' ' + (y1 + up * 7), class: 'g-gap' }, s);
          el('path', { d: 'M' + (x - 4) + ' ' + (y2 - up * 7) + ' L' + x + ' ' + y2 + ' L' + (x + 4) + ' ' + (y2 - up * 7), class: 'g-gap' }, s);
        } else {
          el('line', { x1: x - 4, y1: y1, x2: x + 4, y2: y1, class: 'g-gap' }, s);
          el('line', { x1: x - 4, y1: y2, x2: x + 4, y2: y2, class: 'g-gap' }, s);
        }
        el('text', { x: x + 7, y: (y1 + y2) / 2, 'dominant-baseline': 'central', class: 'g-gap-text' }, s,
           AVAL.fmt(Math.abs(ea - eb)) + ' kJ/mol');
      } else {
        el('text', { x: this.X(1) + 22, y: this.Y(ea) - 12, 'text-anchor': 'start', class: 'g-gap-text' }, s, 'same');
        el('text', { x: this.X(1) + 22, y: this.Y(ea) + 4, 'text-anchor': 'start', class: 'g-gap-text' }, s, 'energy');
      }
    }

    var marks = this.markers || (this.marker != null ? [{ t: this.marker, mol: this.mols[0] }] : []);
    marks.forEach(function (mk, i) {
      var x = self.X(mk.t), y = self.Y(FlipPlot.energyAt(mk.mol, mk.t, self.top));
      el('circle', { cx: x, cy: y, r: 7, class: 'g-dot' + (i ? ' alt' : '') }, s);
      if (mk.label) el('text', { x: x + 10, y: y - 8, class: 'g-letter small' }, s, mk.label);
    });
  };

  return {
    el: el,
    svg: svg,
    chair: chair,
    flat: flat,
    newman: newman,
    newmanText: newmanText,
    FlipPlot: FlipPlot,
    defaultShow: defaultShow
  };
})();

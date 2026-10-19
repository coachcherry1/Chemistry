/* draw.js — the 2D drawings: Newman projections (static, rotatable and the
 * empty template students build on) and the wedge/dash zigzag.
 *
 * Everything is SVG so it stays sharp at any size and every part a student
 * can act on is a real, focusable element.
 */

var Draw = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  /* The student can turn every Newman projection 180°, so the front chain
     group points down instead of up — the way the zigzag looks from the eye
     without standing on your head. It is purely a view: turning the whole
     projection never changes the conformation, so nothing is judged
     differently. 0 or 180. */
  var flip = 0;
  function getFlip() { return flip; }
  function setFlip(f) { flip = f ? 180 : 0; }

  function el(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  function svg(viewBox, cls, label) {
    var s = el('svg', { viewBox: viewBox, class: cls || '', role: 'img' });
    if (label) s.setAttribute('aria-label', label);
    return s;
  }

  var RAD = Math.PI / 180;
  function at(r, a) { return [r * Math.sin(a * RAD), -r * Math.cos(a * RAD)]; }

  function anchorFor(a) {
    var sx = Math.sin(a * RAD);
    return sx > 0.3 ? 'start' : sx < -0.3 ? 'end' : 'middle';
  }

  /* ------------------------------------------------------------ Newman */

  /* Front labels sit well outside back labels, so an eclipsed pair on the
     same ray still reads as two separate groups. */
  var R = 30;          /* the back carbon's circle */
  var FRONT = 84;      /* front bonds run from the centre to here */
  var BACK = 54;       /* back bonds run from the circle's edge to here */
  var FRONT_LABEL = 100, BACK_LABEL = 66;

  /* Printed (not interactive) eclipsed conformations are drawn with the back
     carbon nudged round a little, the way textbooks print them, so the back
     bonds are not hidden behind the front ones. */
  var ECLIPSE_OFFSET = 14;

  function label(g, key, r, a, cls) {
    var p = at(r, a);
    var t = el('text', {
      x: p[0].toFixed(1), y: p[1].toFixed(1),
      'text-anchor': anchorFor(a), 'dominant-baseline': 'central',
      class: 'nm-label tone-' + groupTone(key) + (cls ? ' ' + cls : '')
    }, g, GROUPS[key].label);
    return t;
  }

  /* Static Newman projection of `nm` ({front:[{g,a}], back:[{g,a}]}).
     `opts.offset` nudges the back carbon a few degrees so an eclipsed
     conformation still shows its back bonds, the way textbooks print it. */
  function newman(nm, opts) {
    opts = opts || {};
    if (opts.flip == null) opts.flip = flip;
    var s = svg('-125 -118 250 236', (opts.bare ? '' : 'newman ') + (opts.cls || ''), opts.label || describe(nm, opts.flip));
    paintNewman(s, nm, opts);
    return s;
  }

  function paintNewman(s, nm, opts) {
    while (s.firstChild) s.removeChild(s.firstChild);
    var turn = opts.flip || 0;
    var off = (opts.offset || 0) + turn;
    var back = el('g', { class: 'nm-back' }, s);
    nm.back.forEach(function (q) {
      var a = q.a + off;
      var p1 = at(R, a), p2 = at(BACK, a);
      el('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], class: 'nm-bond-back' }, back);
    });
    el('circle', { cx: 0, cy: 0, r: R, class: 'nm-circle' }, s);
    var front = el('g', { class: 'nm-front' }, s);
    nm.front.forEach(function (q) {
      var p = at(FRONT, q.a + turn);
      el('line', { x1: 0, y1: 0, x2: p[0], y2: p[1], class: 'nm-bond-front' }, front);
    });
    var labels = el('g', null, s);
    function shown(q) { return !(opts.hideH && q.g === 'H'); }
    nm.back.filter(shown).forEach(function (q) { label(labels, q.g, BACK_LABEL, q.a + off, 'nm-back-label'); });
    nm.front.filter(shown).forEach(function (q) { label(labels, q.g, FRONT_LABEL, q.a + turn); });
  }

  var POS = { 0: 'top', 60: 'upper right', 120: 'lower right', 180: 'bottom',
              240: 'lower left', 300: 'upper left' };

  function where(a) {
    a = ((a % 360) + 360) % 360;
    var r = Math.round(a / 60) * 60 % 360;
    return Math.abs(STRAIN.gap(a, r)) < 2 ? POS[r] : Math.round(a) + '°';
  }

  function describe(nm, turn) {
    turn = turn == null ? flip : turn;
    function side(list) {
      return list.map(function (q) { return GROUPS[q.g].name + ' ' + where(q.a + turn); }).join(', ');
    }
    return 'Newman projection. Front carbon: ' + side(nm.front) + '. Back carbon: ' + side(nm.back) + '.';
  }

  /* --------------------------------------------------- rotatable Newman */

  /* The student turns the back carbon by dragging anywhere on the drawing.
     Near a multiple of 60° it snaps, so the named conformations are easy to
     land on exactly. */
  function Rotor(host, mol, onChange) {
    this.mol = mol;
    this.phi = GEOM.phi0(mol);
    this.onChange = onChange;
    this.svg = svg('-125 -118 250 236', 'newman rotor');
    this.svg.setAttribute('aria-hidden', 'true');
    host.appendChild(this.svg);
    var self = this, drag = null;

    function angleOf(ev) {
      var r = self.svg.getBoundingClientRect();
      var x = ev.clientX - (r.left + r.width / 2), y = ev.clientY - (r.top + r.height / 2);
      return Math.atan2(x, -y) / RAD;
    }
    this.svg.addEventListener('pointerdown', function (ev) {
      drag = { a0: angleOf(ev), phi0: self.phi, id: ev.pointerId };
      try { self.svg.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
      self.svg.classList.add('grabbing');
      ev.preventDefault();
    });
    this.svg.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      var d = angleOf(ev) - drag.a0;
      var phi = GEOM.wrap(drag.phi0 + d);
      var near = Math.round(phi / 60) * 60;
      if (Math.abs(phi - near) < 3) phi = near % 360;
      self.set(phi, true);
    });
    function end() { drag = null; self.svg.classList.remove('grabbing'); }
    this.svg.addEventListener('pointerup', end);
    this.svg.addEventListener('pointercancel', end);
    this.paint();
  }

  Rotor.prototype.set = function (phi, fromUser) {
    var prev = this.phi;
    this.phi = GEOM.wrap(Math.round(phi));
    this.paint();
    if (fromUser && this.onChange) this.onChange(this.phi, prev);
  };

  Rotor.prototype.setMolecule = function (mol) { this.mol = mol; this.paint(); };

  Rotor.prototype.paint = function () {
    paintNewman(this.svg, GEOM.newmanAt(this.mol, this.phi), { flip: flip });
    /* a curved arrow round the circle says "you can turn this" */
    var g = el('g', { class: 'nm-grip' }, this.svg);
    var r = 112, a1 = 76, a2 = 104;   /* clear of every label, either way up */
    var p1 = at(r, a1), p2 = at(r, a2);
    el('path', { d: 'M' + p1[0] + ' ' + p1[1] + ' A' + r + ' ' + r + ' 0 0 1 ' + p2[0] + ' ' + p2[1] }, g);
    var tip = at(r, a2), back1 = at(r - 6, a2 - 6), back2 = at(r + 6, a2 - 6);
    el('path', { d: 'M' + back1[0] + ' ' + back1[1] + ' L' + tip[0] + ' ' + tip[1] + ' L' + back2[0] + ' ' + back2[1] }, g);
  };

  /* ---------------------------------------------------- build template */

  /* Six empty positions. Front positions sit where front labels go, back
     positions where back labels go, so a filled template looks exactly like
     the finished projection. Slot order: front 0/120/240, back 60/180/300. */
  var SLOTS = [
    { side: 'front', a: 0 }, { side: 'front', a: 120 }, { side: 'front', a: 240 },
    { side: 'back', a: 60 }, { side: 'back', a: 180 }, { side: 'back', a: 300 }
  ];

  function template(filled, carbons) {
    var turn = flip;
    function A(sl) { return (sl.a + turn) % 360; }
    var s = svg('-125 -118 250 252', 'newman template');
    s.setAttribute('aria-label', 'Newman projection template with six positions');
    var back = el('g', null, s);
    SLOTS.forEach(function (sl) {
      if (sl.side !== 'back') return;
      var p1 = at(R, A(sl)), p2 = at(BACK - 8, A(sl));
      el('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], class: 'nm-bond-back' }, back);
    });
    el('circle', { cx: 0, cy: 0, r: R, class: 'nm-circle' }, s);
    SLOTS.forEach(function (sl) {
      if (sl.side !== 'front') return;
      var p = at(FRONT - 8, A(sl));
      el('line', { x1: 0, y1: 0, x2: p[0], y2: p[1], class: 'nm-bond-front' }, s);
    });
    SLOTS.forEach(function (sl, i) {
      var r = sl.side === 'front' ? FRONT_LABEL - 2 : BACK_LABEL + 2;
      var p = at(r, A(sl));
      var key = filled[i];
      var where = (sl.side === 'front' ? 'Front carbon (' + carbons[0] + ')' : 'Back carbon (' + carbons[1] + ')') +
                  ', ' + POS[A(sl)] + ' position';
      var g = el('g', {
        class: 'drop slot ' + sl.side + (key ? ' filled' : ''), 'data-drop': i, tabindex: 0, role: 'button',
        'aria-label': where + (key ? ', holds ' + GROUPS[key].name + '. Activate to remove it.' : ', empty')
      }, s);
      var w = key ? Math.max(30, GROUPS[key].label.length * 9 + 12) : 30;
      el('rect', { x: p[0] - w / 2, y: p[1] - 15, width: w, height: 30, rx: 15, class: 'slot-box' }, g);
      if (key) {
        el('text', { x: p[0], y: p[1], 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'nm-label tone-' + groupTone(key) }, g, GROUPS[key].label);
      } else {
        el('text', { x: p[0], y: p[1], 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'slot-plus' }, g, '+');
      }
    });
    el('text', { x: -122, y: 128, class: 'nm-caption' }, s, 'front: ' + carbons[0] + ' (centre)');
    el('text', { x: 122, y: 128, 'text-anchor': 'end', class: 'nm-caption' }, s, 'back: ' + carbons[1] + ' (circle)');
    return s;
  }

  /* -------------------------------------------------- wedge/dash zigzag */

  var SCALE = 62;   /* px per ångström */

  function zigzag(mol, opts) {
    opts = opts || {};
    var d = GEOM.drawing(mol);
    function P(p) { return [p[0] * SCALE, -p[1] * SCALE]; }
    var s = svg('0 0 10 10', 'zigzag', zigzagText(mol));
    var g = el('g', null, s);
    var c2 = P(d.C2), c3 = P(d.C3);

    el('line', { x1: c2[0], y1: c2[1], x2: c3[0], y2: c3[1], class: 'zz-bond' }, g);

    var pts = [c2, c3];
    d.bonds.forEach(function (b) {
      var a = P(b.from), z = P(b.to);
      var dx = z[0] - a[0], dy = z[1] - a[1];
      var len = Math.sqrt(dx * dx + dy * dy), ux = dx / len, uy = dy / len;
      /* stop the bond short of the label */
      var stop = 0.72;
      var e = [a[0] + dx * stop, a[1] + dy * stop];
      var nx = -uy, ny = ux;
      if (b.role === 'anchor') {
        el('line', { x1: a[0], y1: a[1], x2: e[0], y2: e[1], class: 'zz-bond' }, g);
      } else if (b.role === 'wedge') {
        var w = 7;
        el('polygon', { points: [a[0], a[1], e[0] + nx * w, e[1] + ny * w, e[0] - nx * w, e[1] - ny * w].join(' '),
                        class: 'zz-wedge' }, g);
      } else {
        for (var i = 1; i <= 6; i++) {
          var t = i / 6.4, hw = 7 * t;
          var cx = a[0] + dx * stop * t, cy = a[1] + dy * stop * t;
          el('line', { x1: cx + nx * hw, y1: cy + ny * hw, x2: cx - nx * hw, y2: cy - ny * hw, class: 'zz-hash' }, g);
        }
      }
      var lx = a[0] + dx * 0.98, ly = a[1] + dy * 0.98;
      var anchor = ux > 0.35 ? 'start' : ux < -0.35 ? 'end' : 'middle';
      if (anchor !== 'middle') lx -= ux * 8;
      el('text', { x: lx, y: ly, 'text-anchor': anchor, 'dominant-baseline': 'central',
                   class: 'zz-label tone-' + groupTone(b.g) }, g, GROUPS[b.g].label);
      pts.push([lx + (anchor === 'end' ? -34 : anchor === 'start' ? 34 : 0), ly]);
      pts.push([lx, ly - 14], [lx, ly + 14]);
    });

    /* carbon numbers sit in the open angle of each vertex */
    el('text', { x: c2[0], y: c2[1] + 24, 'text-anchor': 'middle', class: 'zz-num' }, g, mol.carbons[0]);
    el('text', { x: c3[0], y: c3[1] - 18, 'text-anchor': 'middle', class: 'zz-num' }, g, mol.carbons[1]);

    /* the eye, looking along the central bond from the front carbon */
    if (opts.eye !== false) {
      var ax = d.axis[0], ay = -d.axis[1];
      var ex = c2[0] - ax * 112, ey = c2[1] - ay * 112;
      var deg = Math.atan2(ay, ax) / RAD;
      var eye = el('g', { class: 'zz-eye', transform: 'translate(' + ex + ' ' + ey + ') rotate(' + deg + ')' }, g);
      el('path', { d: 'M-16 0 Q0 -12 16 0 Q0 12 -16 0 Z', class: 'eye-white' }, eye);
      el('circle', { cx: 4, cy: 0, r: 5, class: 'eye-pupil' }, eye);
      el('line', { x1: 22, y1: 0, x2: 80, y2: 0, class: 'eye-ray' }, eye);
      el('path', { d: 'M73 -5 L82 0 L73 5', class: 'eye-ray' }, eye);
      pts.push([ex - 20, ey - 20], [ex + 20, ey + 20]);
    }

    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var minX = Math.min.apply(null, xs) - 12, maxX = Math.max.apply(null, xs) + 12;
    var minY = Math.min.apply(null, ys) - 10, maxY = Math.max.apply(null, ys) + 10;
    s.setAttribute('viewBox', [minX, minY, maxX - minX, maxY - minY].map(function (v) { return v.toFixed(1); }).join(' '));
    return s;
  }

  function zigzagText(mol) {
    function c(side, i) {
      var m = mol[side];
      return mol.carbons[i] + ' carries ' + GROUPS[m.anchor].name + ' in the plane of the page, ' +
             GROUPS[m.wedge].name + ' on a wedge (toward you) and ' + GROUPS[m.dash].name + ' on a dash (away from you)';
    }
    return 'Wedge and dash drawing of ' + mol.name + '. ' + c('front', 0) + '. ' + c('back', 1) +
           '. The eye looks along the ' + mol.carbons[0] + '–' + mol.carbons[1] + ' bond from the ' + mol.carbons[0] + ' end.';
  }

  /* ------------------------------------------------- bond-line formula */

  /* A plain skeletal formula: a zigzag chain, substituents as branches
     (methyl = a bare line, halogens labelled), carbons numbered, and the
     bond the Newman projection looks down drawn heavier. */
  function skeletal(id) {
    var sk = SKELETAL[id];
    var L = 38, dx = L * Math.cos(Math.PI / 6), dy = L * Math.sin(Math.PI / 6);
    var s = svg('0 0 10 10', 'skeletal', 'Bond-line formula of ' + sk.name + ', carbons numbered 1 to ' + sk.n +
      '; the highlighted bond is C' + sk.view[0] + '–C' + sk.view[1] + '.');
    var g = el('g', null, s), pts = [];
    function P(i) { return [i * dx, i % 2 ? 0 : dy]; }       /* carbon i (1-based): even down, odd up */
    function up(i) { return i % 2 === 1; }
    for (var i = 1; i < sk.n; i++) {
      var a = P(i), b = P(i + 1);
      var hot = (i === sk.view[0] && i + 1 === sk.view[1]);
      el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: hot ? 'sk-bond sk-view' : 'sk-bond' }, g);
    }
    var count = {};
    sk.subs.forEach(function (sub) { count[sub[0]] = (count[sub[0]] || 0) + 1; });
    var seen = {};
    sk.subs.forEach(function (sub) {
      var at = sub[0], k = seen[at] = (seen[at] || 0) + 1, n = count[at];
      var base = up(at) ? -90 : 90;
      var ang = (base + (n === 1 ? 0 : (k === 1 ? -32 : 32))) * RAD;
      var a = P(at), e = [a[0] + L * Math.cos(ang), a[1] + L * Math.sin(ang)];
      if (sub[1] === 'CH3') {
        el('line', { x1: a[0], y1: a[1], x2: e[0], y2: e[1], class: 'sk-bond' }, g);
        pts.push(e);
      } else {
        var stop = 0.62;
        el('line', { x1: a[0], y1: a[1], x2: a[0] + (e[0] - a[0]) * stop, y2: a[1] + (e[1] - a[1]) * stop, class: 'sk-bond' }, g);
        var t = [a[0] + (e[0] - a[0]) * 0.86, a[1] + (e[1] - a[1]) * 0.86];
        el('text', { x: t[0], y: t[1], 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'sk-label tone-' + groupTone(sub[1]) }, g, sub[1]);
        pts.push([t[0] - 12, t[1] - 10], [t[0] + 12, t[1] + 10]);
      }
    });
    for (var c = 1; c <= sk.n; c++) {
      var q = P(c), below = up(c);
      /* number on the open side of each carbon, away from any branch */
      var ny = q[1] + (below ? 15 : -9);
      el('text', { x: q[0], y: ny, 'text-anchor': 'middle', class: 'sk-num' + (sk.view.indexOf(c) >= 0 ? ' sk-num-view' : '') }, g, String(c));
      pts.push(q, [q[0], ny + 4], [q[0], ny - 10]);
    }
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs) - 12, x1 = Math.max.apply(null, xs) + 12;
    var y0 = Math.min.apply(null, ys) - 8, y1 = Math.max.apply(null, ys) + 8;
    s.setAttribute('viewBox', [x0, y0, x1 - x0, y1 - y0].map(function (v) { return v.toFixed(1); }).join(' '));
    s.setAttribute('width', Math.round((x1 - x0) * 1.15));
    return s;
  }

  return {
    el: el,
    skeletal: skeletal,
    svg: svg,
    newman: newman,
    describe: describe,
    Rotor: Rotor,
    template: template,
    SLOTS: SLOTS,
    ECLIPSE_OFFSET: ECLIPSE_OFFSET,
    getFlip: getFlip,
    setFlip: setFlip,
    zigzag: zigzag
  };
})();

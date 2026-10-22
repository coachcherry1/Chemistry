/* render.js — a drawing as SVG.
 *
 * The same function draws the editor's canvas and the exported picture, so
 * what you see is what you copy. Everything that makes up the picture carries
 * its own colors and fonts as attributes (no CSS classes), because an SVG
 * turned into a PNG, or pasted somewhere else, does not get the page's
 * stylesheet. The editor's extras — grid, selection rings, click targets —
 * go in a separate group that exports leave out.
 *
 *   svg(doc, opts)
 *     theme      'light' (dark ink on white) or 'dark' (light ink, for a dark slide)
 *     background a color, or null for transparent
 *     color      true: element colors; false: every symbol in plain ink
 *     lonePairs  draw lone pairs and single electrons
 *     formal     label nonzero formal charges (+1, −1)
 *     brackets   brackets and charge around every ion (net formal charge ≠ 0),
                once every atom in it has its electrons (Model.finished)
 *     fit        true: crop to the drawing plus `pad`; false: the editor's
 *                fixed world (editor.w × editor.h grid units)
 *     scale      pixels per drawing unit in the width/height attributes
 *     editor     { w, h, selected, pending } or null
 */

var Render = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var U = 60;                                  /* one bond length, px */
  var FONT = 'Arial, Helvetica, sans-serif';
  var ACCENT = { light: '#0f5d8f', dark: '#5fb3e6' };
  var GRID = { light: '#c9d3dc', dark: '#3a4a5a' };

  function el(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null || attrs[k] === false) return;
      if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function halfW(sym) { return sym.length > 1 ? 13.5 : 8.5; }

  /* distance from an atom's center to the edge of a box round its symbol,
     along the unit vector u */
  function reach(u, a, b) {
    var x = Math.abs(u[0]) > 1e-9 ? a / Math.abs(u[0]) : Infinity;
    var y = Math.abs(u[1]) > 1e-9 ? b / Math.abs(u[1]) : Infinity;
    return Math.min(x, y);
  }

  /* --------------------------------------------- where electrons are drawn */

  var R2 = Math.SQRT1_2;
  /* the eight sides of an atom, in order of preference when two are equally good */
  var SIDES = [
    { n: 'N', v: [0, -1] }, { n: 'S', v: [0, 1] }, { n: 'W', v: [-1, 0] }, { n: 'E', v: [1, 0] },
    { n: 'NE', v: [R2, -R2] }, { n: 'SW', v: [-R2, R2] }, { n: 'NW', v: [-R2, -R2] }, { n: 'SE', v: [R2, R2] }
  ];

  function angleOf(v) { return Math.atan2(v[1], v[0]) * 180 / Math.PI; }
  function apart(a, b) { var t = Math.abs(a - b) % 360; return Math.min(t, 360 - t); }

  /* The sides an atom's lone pairs and single electrons go on: chosen
     together, as the set that stays as far as possible from the bonds and then
     from each other. An atom on its own (a dot symbol) uses the four sides
     only. Returns [{ v, pair }], pairs first. */
  function sites(doc, a) {
    var n = a.lp + a.e1;
    if (!n) return [];
    var bonds = Model.bondsOf(doc, a.id).map(function (b) {
      var o = Model.atom(doc, Model.other(b, a.id));
      return angleOf([o.x - a.x, o.y - a.y]);
    });
    var free = SIDES.filter(function (s) {
      return bonds.every(function (b) { return apart(b, angleOf(s.v)) > 30; });
    });
    if (!bonds.length && n <= 4) free = SIDES.slice(0, 4);
    n = Math.min(n, free.length);
    var best = null, bestScore = null;
    (function choose(start, set) {
      if (set.length === n) {
        var near = 999, pair = 999, sum = 0;
        set.forEach(function (s, i) {
          var mine = 999, ang = angleOf(s.v);
          bonds.forEach(function (b) { mine = Math.min(mine, apart(ang, b)); });
          set.forEach(function (t, j) {
            if (i === j) return;
            var d = apart(ang, angleOf(t.v));
            mine = Math.min(mine, d);
            pair = Math.min(pair, d);
          });
          near = Math.min(near, mine);
          sum += mine;
        });
        var sc = [near, pair, sum];
        var better = !best || sc[0] > bestScore[0] + 1e-6 || (Math.abs(sc[0] - bestScore[0]) < 1e-6 &&
          (sc[1] > bestScore[1] + 1e-6 || (Math.abs(sc[1] - bestScore[1]) < 1e-6 && sc[2] > bestScore[2] + 1e-6)));
        if (better) { best = set.slice(); bestScore = sc; }
        return;
      }
      for (var i = start; i <= free.length - (n - set.length); i++) {
        set.push(free[i]);
        choose(i + 1, set);
        set.pop();
      }
    })(0, []);
    return (best || []).map(function (s, i) { return { v: s.v, pair: i < a.lp }; });
  }

  /* ----------------------------------------------------------------- draw */

  function svg(doc, o) {
    o = o || {};
    var theme = o.theme === 'dark' ? 'dark' : 'light';
    var C = COLORS[theme], ink = C.ink;
    var colorOf = function (sym) { return o.color === false ? ink : (C[sym] || ink); };
    var halo = o.background || (theme === 'dark' ? '#0d1b2a' : '#ffffff');
    var box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    function grow(x, y, rx, ry) {
      box.x0 = Math.min(box.x0, x - (rx || 0)); box.x1 = Math.max(box.x1, x + (rx || 0));
      box.y0 = Math.min(box.y0, y - (ry || 0)); box.y1 = Math.max(box.y1, y + (ry || 0));
    }
    function P(a) { return [a.x * U, a.y * U]; }

    var gBonds = el('g'), gBr = el('g'), gAtoms = el('g'), gDots = el('g'), gFc = el('g'), gArrows = el('g');

    /* bonds */
    doc.bonds.forEach(function (b) {
      var A = Model.atom(doc, b.a), Z = Model.atom(doc, b.b);
      var a = P(A), z = P(Z);
      var dx = z[0] - a[0], dy = z[1] - a[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
      var u = [dx / len, dy / len], perp = [-u[1], u[0]];
      var ra = reach(u, halfW(A.el) + 4, 14), rz = reach(u, halfW(Z.el) + 4, 14);
      var lines = b.order === 1.5 ? [{ o: -3.2 }, { o: 4, dash: true }]
        : b.order === 2 ? [{ o: -3.6 }, { o: 3.6 }]
        : b.order === 3 ? [{ o: -6 }, { o: 0 }, { o: 6 }] : [{ o: 0 }];
      lines.forEach(function (l) {
        gBonds.appendChild(el('line', {
          x1: a[0] + u[0] * ra + perp[0] * l.o, y1: a[1] + u[1] * ra + perp[1] * l.o,
          x2: z[0] - u[0] * rz + perp[0] * l.o, y2: z[1] - u[1] * rz + perp[1] * l.o,
          stroke: ink, 'stroke-width': l.dash ? 2.4 : 2.6, 'stroke-linecap': l.dash ? 'butt' : 'round',
          'stroke-dasharray': l.dash ? '5 4.5' : null
        }));
      });
    });

    /* atoms, then their electrons */
    var taken = {};                      /* atom id → sides used by electrons (for the formal-charge label) */
    doc.atoms.forEach(function (a) {
      var p = P(a);
      grow(p[0], p[1], halfW(a.el) + 4, 14);
      gAtoms.appendChild(el('text', {
        x: p[0], y: p[1], 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': FONT,
        'font-size': 24, 'font-weight': 'bold', fill: colorOf(a.el), text: a.el
      }));
      var ss = sites(doc, a);
      taken[a.id] = ss.map(function (s) { return angleOf(s.v); });
      if (o.lonePairs === false) return;
      ss.forEach(function (s) {
        var r = reach(s.v, halfW(a.el) + 7, 18);
        var m = [p[0] + s.v[0] * r, p[1] + s.v[1] * r], q = [-s.v[1], s.v[0]];
        var dots = s.pair ? [[m[0] + q[0] * 5, m[1] + q[1] * 5], [m[0] - q[0] * 5, m[1] - q[1] * 5]] : [m];
        dots.forEach(function (d) {
          gDots.appendChild(el('circle', { cx: d[0], cy: d[1], r: 2.7, fill: ink }));
          grow(d[0], d[1], 4, 4);
        });
      });
    });

    /* formal charges, in the free corner nearest the upper right */
    if (o.formal) doc.atoms.forEach(function (a) {
      var fc = Model.formalCharge(doc, a.id);
      if (!fc) return;
      var used = Model.bondsOf(doc, a.id).map(function (b) {
        var t = Model.atom(doc, Model.other(b, a.id));
        return angleOf([t.x - a.x, t.y - a.y]);
      }).concat(o.lonePairs === false ? [] : taken[a.id]);
      var tries = [[R2, -R2], [-R2, -R2], [R2, R2], [-R2, R2], [1, 0], [0, -1], [-1, 0], [0, 1]];
      var v = tries.filter(function (t) { return used.every(function (u) { return apart(u, angleOf(t)) > 30; }); })[0] || tries[0];
      var p = P(a), r = reach(v, halfW(a.el) + 13, 24);
      var label = (fc > 0 ? '+' : '−') + Math.abs(fc);
      gFc.appendChild(el('text', {
        x: p[0] + v[0] * r, y: p[1] + v[1] * r, 'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-family': FONT, 'font-size': 14, 'font-weight': 'bold', fill: ink, stroke: halo, 'stroke-width': 4,
        'paint-order': 'stroke', 'stroke-linejoin': 'round', text: label
      }));
      grow(p[0] + v[0] * r, p[1] + v[1] * r, 13, 9);
    });

    /* brackets and charge round every ion */
    if (o.brackets) Model.components(doc).forEach(function (ids) {
      var q = Model.charge(doc, ids);
      if (!q || !Model.finished(doc, ids)) return;
      var bb = Model.bounds(doc, ids);
      var x0 = bb.x0 * U - 34, x1 = bb.x1 * U + 34, y0 = bb.y0 * U - 32, y1 = bb.y1 * U + 32, t = 8;
      gBr.appendChild(el('path', {
        d: 'M' + (x0 + t) + ' ' + y0 + 'H' + x0 + 'V' + y1 + 'H' + (x0 + t) +
           'M' + (x1 - t) + ' ' + y0 + 'H' + x1 + 'V' + y1 + 'H' + (x1 - t),
        fill: 'none', stroke: ink, 'stroke-width': 2
      }));
      gBr.appendChild(el('text', { x: x1 + 4, y: y0 + 6, 'font-family': FONT, 'font-size': 18, 'font-weight': 'bold',
        fill: ink, text: Model.chargeLabel(q) }));
      grow(x0, y0); grow(x1 + 30, y1);
    });

    /* arrows: ↔ resonance, → reaction, ⇌ equilibrium */
    doc.arrows.forEach(function (r) {
      var c = P(r), L = 0.8 * U, x0 = c[0] - L, x1 = c[0] + L, y = c[1];
      var line = function (xa, ya, xb, yb) {
        gArrows.appendChild(el('line', { x1: xa, y1: ya, x2: xb, y2: yb, stroke: ink, 'stroke-width': 2.4,
          'stroke-linecap': 'round' }));
      };
      var head = function (x, yy, dir, half) {            /* dir 1 → right, −1 → left; half: 'up' | 'down' */
        var d = 'M' + x + ' ' + yy + 'L' + (x - dir * 11) + ' ' + (yy - (half === 'down' ? 0 : 6.5)) +
          'L' + (x - dir * 11) + ' ' + (yy + (half === 'up' ? 0 : 6.5)) + 'Z';
        gArrows.appendChild(el('path', { d: d, fill: ink }));
      };
      if (r.kind === 'eq') {
        line(x0, y - 4, x1 - 2, y - 4); head(x1, y - 4, 1, 'up');
        line(x0 + 2, y + 4, x1, y + 4); head(x0, y + 4, -1, 'down');
      } else {
        line(r.kind === 'rxn' ? x0 : x0 + 4, y, x1 - 4, y);
        head(x1, y, 1);
        if (r.kind !== 'rxn') head(x0, y, -1);
      }
      grow(c[0], y, L + 2, 10);
    });

    /* the frame */
    var vb;
    if (o.fit) {
      var pad = o.pad == null ? 16 : o.pad;
      if (box.x0 === Infinity) box = { x0: 0, y0: 0, x1: U, y1: U };
      vb = [box.x0 - pad, box.y0 - pad, box.x1 - box.x0 + 2 * pad, box.y1 - box.y0 + 2 * pad];
    } else {
      vb = [0, 0, o.editor.w * U, o.editor.h * U];
    }
    var scale = o.scale || 1;
    var root = el('svg', {
      xmlns: NS, viewBox: vb.join(' '), width: Math.round(vb[2] * scale), height: Math.round(vb[3] * scale),
      role: 'img', 'aria-label': o.title || describe(doc)
    });
    if (o.background) root.appendChild(el('rect', { x: vb[0], y: vb[1], width: vb[2], height: vb[3], fill: o.background }));

    var ed = o.editor;
    if (ed) {
      var grid = el('g', { 'data-ui': '1' });
      for (var gx = 1; gx < ed.w; gx++) for (var gy = 1; gy < ed.h; gy++) {
        grid.appendChild(el('circle', { cx: gx * U, cy: gy * U, r: 1.8, fill: GRID[theme] }));
      }
      root.appendChild(grid);
    }
    [gBonds, gBr, gAtoms, gDots, gFc, gArrows].forEach(function (g) { root.appendChild(g); });

    if (ed) {
      var acc = ACCENT[theme], ui = el('g', { 'data-ui': '1' });
      var sel = ed.selected, pend = ed.pending;
      doc.bonds.forEach(function (b) {
        var a = P(Model.atom(doc, b.a)), z = P(Model.atom(doc, b.b));
        if (b.id === sel) ui.appendChild(el('line', { x1: a[0], y1: a[1], x2: z[0], y2: z[1], stroke: acc,
          'stroke-width': 14, 'stroke-opacity': 0.25, 'stroke-linecap': 'round' }));
        ui.appendChild(el('line', { x1: a[0], y1: a[1], x2: z[0], y2: z[1], stroke: 'transparent', 'stroke-width': 18,
          'data-id': b.id, class: 'hit hit-bond' }));
      });
      doc.arrows.forEach(function (r) {
        var c = P(r);
        if (r.id === sel) ui.appendChild(el('rect', { x: c[0] - 0.8 * U - 6, y: c[1] - 14, width: 1.6 * U + 12, height: 28,
          rx: 6, fill: acc, 'fill-opacity': 0.15, stroke: acc, 'stroke-dasharray': '4 3' }));
        ui.appendChild(el('rect', { x: c[0] - 0.8 * U - 6, y: c[1] - 14, width: 1.6 * U + 12, height: 28,
          fill: 'transparent', 'data-id': r.id, class: 'hit hit-arrow' }));
      });
      doc.atoms.forEach(function (a) {
        var p = P(a);
        if (a.id === sel || a.id === pend) ui.appendChild(el('circle', { cx: p[0], cy: p[1], r: halfW(a.el) + 11,
          fill: 'none', stroke: acc, 'stroke-width': 2.5, 'stroke-dasharray': a.id === pend ? null : '5 4' }));
        ui.appendChild(el('circle', { cx: p[0], cy: p[1], r: 21, fill: 'transparent', 'data-id': a.id,
          class: 'hit hit-atom' }));
      });
      root.appendChild(ui);
    }
    return root;
  }

  /* the text alternative: what is drawn, molecule by molecule */
  function describe(doc) {
    var parts = Model.summary(doc).map(function (c) {
      return c.formula + (c.charge ? ' (charge ' + Model.chargeLabel(c.charge) + ')' : '');
    });
    return parts.length ? 'Lewis structure: ' + parts.join(', ') : 'Empty drawing';
  }

  /* SVG markup for a download or the clipboard: no editor layers */
  function markup(doc, o) {
    var node = svg(doc, Object.assign({}, o, { editor: null, fit: true }));
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(node);
  }

  return { svg: svg, markup: markup, sites: sites, describe: describe, U: U };
})();

/* draw.js — Lewis structures as SVG.
 *
 * One function draws every structure in the activity: the one being built
 * (with drop slots, clickable atoms and clickable lone pairs) and the small
 * read-only drawings in quiz questions. What is clickable is decided by the
 * builder through `opts`; the drawing only tags elements with data-slot so
 * the builder can delegate events.
 */

var Draw = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var D = 66;                       /* bond length on the grid, px */
  var FONT = 24;

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

  function xy(slot) { var p = Lewis.pos(slot); return [p[0] * D, p[1] * D]; }

  function tone(sym) { return 'el-' + sym.toLowerCase(); }

  /* unit vector for one of the eight directions */
  function unit(dir) {
    var v = Lewis.VEC[dir], n = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    return [v[0] / n, v[1] / n];
  }

  /* distance from an atom's center to the edge of a box around its symbol,
     along u — a box, not an ellipse, so a pair on a diagonal clears the
     corner of a two-letter symbol like Xe */
  function reach(u, a, b) {
    var x = Math.abs(u[0]) > 1e-9 ? a / Math.abs(u[0]) : Infinity;
    var y = Math.abs(u[1]) > 1e-9 ? b / Math.abs(u[1]) : Infinity;
    return Math.min(x, y);
  }

  /* where the two dots of a lone pair sit, on one side of an atom */
  function pairDots(slot, side, sym) {
    var c = xy(slot), u = unit(side), r = reach(u, halfW(sym) + 7, 18);
    var m = [c[0] + u[0] * r, c[1] + u[1] * r], perp = [-u[1], u[0]];
    return [[m[0] - 5 * perp[0], m[1] - 5 * perp[1]], [m[0] + 5 * perp[0], m[1] + 5 * perp[1]]];
  }

  /* `order` may be fractional (a resonance hybrid): then the bond is a solid
     line for the whole part plus a dashed line for the part that is shared
     out — the usual way to draw a partial double bond. */
  function bondLines(s, b, cls, order, align) {
    var a = xy(b.a), z = xy(b.b);
    var symA = s.at[b.a], symZ = s.at[b.b];
    var dx = z[0] - a[0], dy = z[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
    var u = [dx / len, dy / len], perp = [-u[1], u[0]];
    var ra = reach(u, halfW(symA) + 4, 14), rz = reach(u, halfW(symZ) + 4, 14);
    var g = el('g', { class: 'bond' + (cls ? ' ' + cls : ''), 'data-bond': b.key });
    if (order == null) order = b.order;
    var whole = Math.floor(order + 1e-9), part = order - whole > 1e-9;
    var lines = [];
    var offs = whole === 1 ? [0] : whole === 2 ? [-3.6, 3.6] : whole === 3 ? [-6, 0, 6] : [-8, -2.7, 2.7, 8];
    if (part) offs = whole === 1 ? [-3.2] : offs.map(function (o) { return o - 3.2; });
    else if (align && whole === 1) offs = [-3.6];      /* on one line of a double bond: see opts.alignSingles */
    offs.forEach(function (o) { lines.push({ o: o, dashed: false }); });
    if (part) lines.push({ o: offs[offs.length - 1] + 7.2, dashed: true });
    lines.forEach(function (l) {
      g.appendChild(el('line', {
        class: l.dashed ? 'partial' : null,
        x1: a[0] + u[0] * ra + perp[0] * l.o, y1: a[1] + u[1] * ra + perp[1] * l.o,
        x2: z[0] - u[0] * rz + perp[0] * l.o, y2: z[1] - u[1] * rz + perp[1] * l.o
      }));
    });
    return g;
  }

  /* opts:
       frame      'full' (the builder's fixed 5×5 grid, for Rule 2), 'fit' (the atoms
                  plus the ring round the center) or 'tight' (default)
       scale      pixels per drawing unit (the drawing still shrinks to fit)
       drops      slots to show as empty drop targets
       dropFilled true: filled slots are drop targets too (Rule 2: click to take back)
       atoms      slots whose atom is clickable
       lps        slots whose lone pairs are clickable
     for a resonance hybrid:
       orders     { slot: bond order } — fractional orders draw solid + dashed
       noLP       true: leave the lone pairs out
       cloud      slots whose bonds to the center sit in the shaded
                  "electron cloud" (the shared-out electrons)
       labels     { slot: '1½' } bond-order labels, at the middle of the bond
       alignSingles  true: draw a single bond on the line one side of a double
                  bond would use, so resonance structures laid on top of each
                  other show 1 + 1 lines, not a triple bond
       flags      { slot: 'bad' | 'good' }
       pulse      slot whose bond to its parent was just made
       atomLabel / lpLabel  functions(slot) → accessible names
       title      text alternative for the whole drawing                       */
  function structure(s, opts) {
    opts = opts || {};
    var filled = Lewis.filled(s);
    var drops = opts.drops || [];
    var full = opts.frame === 'full';

    /* frame */
    var minX, maxX, minY, maxY;
    if (full) {
      minX = minY = -2 * D; maxX = maxY = 2 * D;
    } else {
      /* 'fit' keeps at least the ring around the central atom, so a small
         molecule is not drawn huge and the center stays in the middle */
      var pts = (filled.length ? filled : ['C']).concat(opts.frame === 'fit' ? ['N', 'E', 'S', 'W'] : []);
      minX = minY = Infinity; maxX = maxY = -Infinity;
      pts.forEach(function (k) {
        var p = xy(k);
        minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
      });
    }
    var pad = 34, bracket = s.charge ? 14 : 0, chargeRoom = s.charge ? 26 : 0;
    var vx = minX - pad - bracket, vy = minY - pad - bracket - (s.charge ? 4 : 0);
    var vw = maxX - minX + 2 * (pad + bracket) + chargeRoom, vh = maxY - minY + 2 * (pad + bracket) + (s.charge ? 4 : 0);
    if (full) { vx = -2 * D - 46; vy = -2 * D - 46; vw = 4 * D + 92 + 24; vh = 4 * D + 92; }

    var root = el('svg', {
      class: 'lewis' + (opts.cls ? ' ' + opts.cls : ''), viewBox: [vx, vy, vw, vh].join(' '),
      width: Math.round(vw * (opts.scale || 1)), height: Math.round(vh * (opts.scale || 1)), role: 'img',
      'aria-label': opts.title || (filled.length ? Lewis.describe(s) : 'Empty drawing area')
    });

    /* the electron cloud of a hybrid, under everything */
    if (opts.cloud && opts.cloud.length) {
      var c0 = xy('C'), d = '';
      opts.cloud.forEach(function (k) { var p = xy(k); d += 'M' + c0[0] + ' ' + c0[1] + 'L' + p[0] + ' ' + p[1]; });
      root.appendChild(el('path', { class: 'cloud', d: d }));
    }

    /* bonds next, under the atoms */
    var gb = el('g', { class: 'bonds' });
    Lewis.bonds(s).forEach(function (b) {
      gb.appendChild(bondLines(s, b, opts.pulse === b.key ? 'pulse' : '', opts.orders ? opts.orders[b.key] : null,
        opts.alignSingles));
    });
    root.appendChild(gb);

    /* brackets and charge — not while atoms are being placed (Rule 2), where
       they would cut across the drop spots */
    if (s.charge && filled.length && !full) {
      var bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
      filled.forEach(function (k) {
        var p = xy(k);
        bx0 = Math.min(bx0, p[0]); bx1 = Math.max(bx1, p[0]); by0 = Math.min(by0, p[1]); by1 = Math.max(by1, p[1]);
      });
      bx0 -= 32; bx1 += 32; by0 -= 30; by1 += 30;
      var tick = 8;
      root.appendChild(el('path', { class: 'bracket', d:
        'M' + (bx0 + tick) + ' ' + by0 + 'H' + bx0 + 'V' + by1 + 'H' + (bx0 + tick) +
        'M' + (bx1 - tick) + ' ' + by0 + 'H' + bx1 + 'V' + by1 + 'H' + (bx1 - tick) }));
      root.appendChild(el('text', { class: 'charge', x: bx1 + 4, y: by0 + 6, text: Lewis.chargeText(s.charge) }));
    }

    /* drop targets (Rule 2) */
    drops.forEach(function (k) {
      if (Lewis.has(s, k)) return;
      var p = xy(k);
      var g = el('g', { class: 'drop slot' + (k === 'C' ? ' center' : ''), 'data-drop': k, tabindex: 0, role: 'button',
        'aria-label': k === 'C' ? 'Central atom position' : 'Empty position ' + Lewis.WHERE[Lewis.dirOf(k)] + ' ' +
          (Lewis.isInner(k) ? 'the central atom' : 'the ' + s.at[Lewis.parentOf(k)]) });
      g.appendChild(el('circle', { class: 'slot-ring', cx: p[0], cy: p[1], r: k === 'C' ? 24 : 19 }));
      g.appendChild(el('text', { class: 'slot-plus', x: p[0], y: p[1], text: '+' }));
      if (k === 'C') g.appendChild(el('text', { class: 'slot-cap', x: p[0], y: p[1] + 40, text: 'center' }));
      if (Lewis.isOuter(k)) {
        var q = xy(Lewis.parentOf(k));
        g.appendChild(el('line', { class: 'slot-link', x1: (p[0] + q[0]) / 2 + (p[0] - q[0]) * 0.18, y1: (p[1] + q[1]) / 2 + (p[1] - q[1]) * 0.18,
          x2: (p[0] + q[0]) / 2 - (p[0] - q[0]) * 0.18, y2: (p[1] + q[1]) / 2 - (p[1] - q[1]) * 0.18 }));
      } else if (k !== 'C' && Lewis.has(s, 'C')) {
        g.appendChild(el('line', { class: 'slot-link', x1: p[0] * 0.62, y1: p[1] * 0.62, x2: p[0] * 0.38, y2: p[1] * 0.38 }));
      }
      root.appendChild(g);
    });

    /* atoms */
    var atomActive = opts.atoms || [];
    var flags = opts.flags || {};
    filled.forEach(function (k) {
      var p = xy(k), sym = s.at[k];
      var on = atomActive.indexOf(k) >= 0;
      var dropBack = opts.dropFilled;          /* the central atom too: a click on it gets an answer */
      var g = el('g', { class: 'atom ' + tone(sym) + (on ? ' active' : '') + (dropBack ? ' drop filled' : '') +
        (flags[k] ? ' flag-' + flags[k] : ''), 'data-slot': k });
      if (dropBack) g.setAttribute('data-drop', k);
      if (on || dropBack) {
        g.setAttribute('tabindex', 0);
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', opts.atomLabel ? opts.atomLabel(k) : sym);
      }
      g.appendChild(el('circle', { class: 'atom-ring', cx: p[0], cy: p[1], r: halfW(sym) + 5.5 }));
      g.appendChild(el('text', { class: 'sym', x: p[0], y: p[1], text: sym }));
      root.appendChild(g);
    });

    /* lone pairs — drawn after the atoms, so a pair sitting close to a wide
       symbol (Cl, Xe) is on top and a click on it reaches the pair */
    var lpActive = opts.lps || [];
    if (!opts.noLP) filled.forEach(function (k) {
      var n = s.lp[k] || 0;
      if (!n) return;
      var sides = Lewis.freeSides(s, k);
      for (var i = 0; i < n && i < sides.length; i++) {
        var dots = pairDots(k, sides[i], s.at[k]);
        var on = lpActive.indexOf(k) >= 0;
        var g = el('g', { class: 'lp' + (on ? ' active' : ''), 'data-slot': k, 'data-i': i });
        if (on) {
          g.setAttribute('tabindex', 0);
          g.setAttribute('role', 'button');
          g.setAttribute('aria-label', opts.lpLabel ? opts.lpLabel(k) : 'Lone pair on ' + s.at[k]);
          var mx = (dots[0][0] + dots[1][0]) / 2, my = (dots[0][1] + dots[1][1]) / 2;
          g.appendChild(el('circle', { class: 'lp-hit', cx: mx, cy: my, r: 9 }));
        }
        dots.forEach(function (d) { g.appendChild(el('circle', { class: 'dot', cx: d[0], cy: d[1], r: 2.7 })); });
        root.appendChild(g);
      }
    });

    /* bond-order labels, beside the middle of each bond */
    var labels = opts.labels || {};
    Object.keys(labels).forEach(function (k) {
      if (!Lewis.has(s, k)) return;
      var a = xy(Lewis.parentOf(k)), z = xy(k);
      var dx = z[0] - a[0], dy = z[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
      var perp = [-dy / len, dx / len];
      if (perp[1] > 0 || (Math.abs(perp[1]) < 1e-9 && perp[0] < 0)) perp = [-perp[0], -perp[1]];   /* above / right */
      root.appendChild(el('text', { class: 'bo-label', x: (a[0] + z[0]) / 2 + perp[0] * 17,
        y: (a[1] + z[1]) / 2 + perp[1] * 17, text: labels[k] }));
    });

    return root;
  }

  /* A small read-only drawing for a quiz question or choice. */
  function figure(s, cls) {
    return structure(s, { cls: 'fig' + (cls ? ' ' + cls : '') });
  }

  return { structure: structure, figure: figure, D: D, FONT: FONT };
})();

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

  /* where the two dots of a lone pair sit, on one side of an atom */
  function pairDots(slot, side, sym) {
    var c = xy(slot), hw = halfW(sym), x = c[0], y = c[1];
    if (side === 'N') return [[x - 5, y - 18], [x + 5, y - 18]];
    if (side === 'S') return [[x - 5, y + 18], [x + 5, y + 18]];
    if (side === 'E') return [[x + hw + 7, y - 5], [x + hw + 7, y + 5]];
    return [[x - hw - 7, y - 5], [x - hw - 7, y + 5]];
  }

  function bondLines(s, b, cls) {
    var a = xy(b.a), z = xy(b.b);
    var symA = s.at[b.a], symZ = s.at[b.b];
    var horiz = a[1] === z[1];
    var g = el('g', { class: 'bond' + (cls ? ' ' + cls : ''), 'data-bond': b.key });
    var offs = b.order === 1 ? [0] : b.order === 2 ? [-3.6, 3.6] : b.order === 3 ? [-6, 0, 6] : [-8, -2.7, 2.7, 8];
    offs.forEach(function (o) {
      var x1, y1, x2, y2;
      if (horiz) {
        var sg = z[0] > a[0] ? 1 : -1;
        x1 = a[0] + sg * (halfW(symA) + 4); x2 = z[0] - sg * (halfW(symZ) + 4);
        y1 = y2 = a[1] + o;
      } else {
        var sv = z[1] > a[1] ? 1 : -1;
        y1 = a[1] + sv * 14; y2 = z[1] - sv * 14;
        x1 = x2 = a[0] + o;
      }
      g.appendChild(el('line', { x1: x1, y1: y1, x2: x2, y2: y2 }));
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

    /* bonds first, under everything */
    var gb = el('g', { class: 'bonds' });
    Lewis.bonds(s).forEach(function (b) { gb.appendChild(bondLines(s, b, opts.pulse === b.key ? 'pulse' : '')); });
    root.appendChild(gb);

    /* brackets and charge */
    if (s.charge && filled.length) {
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
        'aria-label': k === 'C' ? 'Central atom position' : 'Empty position ' + Lewis.WHERE[k[0]] + ' ' + (k.length === 1 ? 'the central atom' : 'the ' + s.at[k[0]]) });
      g.appendChild(el('circle', { class: 'slot-ring', cx: p[0], cy: p[1], r: k === 'C' ? 24 : 19 }));
      g.appendChild(el('text', { class: 'slot-plus', x: p[0], y: p[1], text: '+' }));
      if (k === 'C') g.appendChild(el('text', { class: 'slot-cap', x: p[0], y: p[1] + 40, text: 'center' }));
      if (k.length === 2) {
        var q = xy(k[0]);
        g.appendChild(el('line', { class: 'slot-link', x1: (p[0] + q[0]) / 2 + (p[0] - q[0]) * 0.18, y1: (p[1] + q[1]) / 2 + (p[1] - q[1]) * 0.18,
          x2: (p[0] + q[0]) / 2 - (p[0] - q[0]) * 0.18, y2: (p[1] + q[1]) / 2 - (p[1] - q[1]) * 0.18 }));
      } else if (k !== 'C' && Lewis.has(s, 'C')) {
        g.appendChild(el('line', { class: 'slot-link', x1: p[0] * 0.62, y1: p[1] * 0.62, x2: p[0] * 0.38, y2: p[1] * 0.38 }));
      }
      root.appendChild(g);
    });

    /* lone pairs */
    var lpActive = opts.lps || [];
    filled.forEach(function (k) {
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
          var horiz = sides[i] === 'N' || sides[i] === 'S';
          var mx = (dots[0][0] + dots[1][0]) / 2, my = (dots[0][1] + dots[1][1]) / 2;
          g.appendChild(el('rect', { class: 'lp-hit', x: mx - (horiz ? 12 : 8), y: my - (horiz ? 8 : 12),
            width: horiz ? 24 : 16, height: horiz ? 16 : 24, rx: 6 }));
        }
        dots.forEach(function (d) { g.appendChild(el('circle', { class: 'dot', cx: d[0], cy: d[1], r: 2.7 })); });
        root.appendChild(g);
      }
    });

    /* atoms */
    var atomActive = opts.atoms || [];
    var flags = opts.flags || {};
    filled.forEach(function (k) {
      var p = xy(k), sym = s.at[k];
      var on = atomActive.indexOf(k) >= 0;
      var dropBack = opts.dropFilled && k !== 'C';
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

    return root;
  }

  /* A small read-only drawing for a quiz question or choice. */
  function figure(s, cls) {
    return structure(s, { cls: 'fig' + (cls ? ' ' + cls : '') });
  }

  return { structure: structure, figure: figure, D: D, FONT: FONT };
})();

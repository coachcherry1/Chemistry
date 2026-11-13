/* particles.js: the particle drawings.
 *
 * A particle is drawn from its tree in reactions.js (which atom touches
 * which): atoms are overlapping lettered circles, coloured by element, the
 * size following the element's covalent radius (bigger atoms are drawn
 * bigger; the scale is squeezed so that H can still hold its letter). Colour
 * is never the only cue: every atom carries its symbol.
 *
 *   Particles.layout(formula)        atoms with places, for the validator too
 *   Particles.fill(svg, items, o)    a box of particles: items [{ f, n }]
 *   Particles.one(formula, scale)    one particle as a small svg
 *   Particles.key(elements)          the colour key for these elements
 *   Particles.groups(formula, ion)   the atoms of each such ion in the particle
 */
var Particles = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  /* symbol: [name, covalent radius in pm (Cordero 2008), fill, letter colour] */
  var EL = {
    H: ['hydrogen', 31, '#ffffff', '#16202a'], C: ['carbon', 76, '#4a4f57', '#ffffff'], N: ['nitrogen', 71, '#3565c9', '#ffffff'],
    O: ['oxygen', 66, '#d93030', '#ffffff'], F: ['fluorine', 57, '#b6e86b', '#16202a'], Cl: ['chlorine', 102, '#46c463', '#16202a'],
    Br: ['bromine', 120, '#9c4128', '#ffffff'], I: ['iodine', 139, '#7438ad', '#ffffff'], S: ['sulfur', 105, '#f2d03b', '#16202a'],
    P: ['phosphorus', 107, '#f08c2e', '#16202a'], Li: ['lithium', 128, '#e0cdf7', '#16202a'], Na: ['sodium', 166, '#b9a4ea', '#16202a'],
    K: ['potassium', 203, '#a28ddb', '#16202a'], Mg: ['magnesium', 141, '#9ed9b0', '#16202a'], Ca: ['calcium', 176, '#cdd9a3', '#16202a'],
    Ba: ['barium', 215, '#b9ca8b', '#16202a'], Al: ['aluminum', 121, '#c7ccd4', '#16202a'], Fe: ['iron', 132, '#dd8f60', '#16202a'],
    Cu: ['copper', 132, '#e0a868', '#16202a'], Zn: ['zinc', 122, '#aab4c8', '#16202a'], Ag: ['silver', 145, '#e3e7ec', '#16202a'],
    Hg: ['mercury', 132, '#b9c0cc', '#16202a'], Pb: ['lead', 146, '#737b87', '#ffffff']
  };
  /* atoms that sit at a corner when they have two neighbours (water is bent) */
  var BENT = { O: 1, S: 1 };

  function radius(el) { return 5.5 + EL[el][1] * 0.06; }

  function s(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  /* 'O(H)(H)' -> [{ el, parent }] in the order written */
  function readTree(tree) {
    var atoms = [], stack = [], last = -1, i = 0, m;
    while (i < tree.length) {
      var ch = tree[i];
      if (ch === '(') { stack.push(last); i++; continue; }
      if (ch === ')') { last = stack.pop(); i++; continue; }
      m = /^[A-Z][a-z]?/.exec(tree.slice(i));
      if (!m) throw new Error('bad tree ' + tree);
      atoms.push({ el: m[0], parent: stack.length ? stack[stack.length - 1] : -1, kids: [] });
      if (atoms[atoms.length - 1].parent >= 0) atoms[atoms[atoms.length - 1].parent].kids.push(atoms.length - 1);
      last = atoms.length - 1;
      i += m[0].length;
    }
    return atoms;
  }

  var cache = {};
  /* Places for the atoms of one particle, centred on (0, 0), and the radius R
     of the circle that holds it. */
  function layout(formula) {
    if (cache[formula]) return cache[formula];
    var atoms = readTree(Rx.tree(formula));
    atoms.forEach(function (a) { a.r = radius(a.el); });
    function bond(a, b) { return 0.8 * (a.r + b.r); }
    /* O and S with two neighbours sit at a corner; so does N between two O (NO2) */
    function bent(a) {
      if (BENT[a.el]) return true;
      return a.el === 'N' && a.kids.every(function (c) { return atoms[c].el === 'O'; }) && (a.parent < 0 || atoms[a.parent].el === 'O');
    }
    function place(i, from, depth) {
      var a = atoms[i], k = a.kids.length;
      a.kids.forEach(function (c, j) {
        var ang;
        if (a.parent < 0) {
          ang = k === 2 && bent(a) ? (j ? 35 : 145) : k === 1 ? 0 : 90 + 360 * j / k;
        } else if (k === 1 && bent(a)) {
          ang = from + (depth % 2 ? 110 : -110);
        } else {
          ang = from + 360 * (j + 1) / (k + 1);
        }
        var b = atoms[c], d = bond(a, b), rad = ang * Math.PI / 180;
        b.x = a.x + d * Math.cos(rad);
        b.y = a.y + d * Math.sin(rad);
        place(c, ang + 180, depth + 1);
      });
    }
    atoms[0].x = 0; atoms[0].y = 0;
    place(0, 180, 0);
    /* settle: atoms that do not touch in the tree are pushed apart, touching atoms keep their distance */
    var n = atoms.length, it, i, j;
    for (it = 0; it < 240 && n > 3; it++) {
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
        var a = atoms[i], b = atoms[j];
        if (a.parent === j || b.parent === i) continue;
        var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 0.01, min = 0.9 * (a.r + b.r);
        if (d < min) {
          var push = (min - d) / 2 * 0.5;
          a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push;
        }
      }
      for (i = 1; i < n; i++) {
        var c = atoms[i], p = atoms[c.parent];
        var ex = c.x - p.x, ey = c.y - p.y, len = Math.sqrt(ex * ex + ey * ey) || 0.01, off = (len - bond(c, p)) / 2;
        c.x -= ex / len * off; c.y -= ey / len * off; p.x += ex / len * off; p.y += ey / len * off;
      }
    }
    /* centre on the middle of the smallest box, then find the holding circle */
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    atoms.forEach(function (a) { x0 = Math.min(x0, a.x - a.r); x1 = Math.max(x1, a.x + a.r); y0 = Math.min(y0, a.y - a.r); y1 = Math.max(y1, a.y + a.r); });
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = 0;
    atoms.forEach(function (a) { a.x -= cx; a.y -= cy; R = Math.max(R, Math.sqrt(a.x * a.x + a.y * a.y) + a.r); });
    return (cache[formula] = { atoms: atoms, R: R });
  }

  /* The atoms of each polyatomic ion inside a particle: [[atom index, ...], ...],
     found from which atoms touch. hoh: water is HOH, so one of its H and its O
     are a hydroxide. The validator checks that as many are found as the
     formula has. */
  var CENTRE = { NO3: ['N', 'O', 3], SO4: ['S', 'O', 4], PO4: ['P', 'O', 4], CO3: ['C', 'O', 3], ClO3: ['Cl', 'O', 3], NH4: ['N', 'H', 4] };
  var groupCache = {};
  function groups(formula, ion, hoh) {
    var id = formula + '|' + ion + '|' + (hoh ? 1 : 0);
    if (groupCache[id]) return groupCache[id];
    var atoms = layout(formula).atoms, out = [];
    function near(i) { var a = atoms[i]; return (a.parent >= 0 ? [a.parent] : []).concat(a.kids); }
    function of(i, el) { return near(i).filter(function (j) { return atoms[j].el === el; }); }
    atoms.forEach(function (a, i) {
      var c = CENTRE[ion];
      if (c) {
        if (a.el === c[0] && of(i, c[1]).length >= c[2]) out.push([i].concat(of(i, c[1]).slice(0, c[2])));
      } else if (ion === 'OH') {
        /* an O holding an H: on a metal, or in the water of a neutralization */
        var hs = of(i, 'H');
        var acid = near(i).some(function (j) { return /^(S|P|N|C|Cl)$/.test(atoms[j].el); });
        if (a.el === 'O' && hs.length && !acid && (formula !== 'H2O' || hoh)) out.push([i, hs[0]]);
      } else if (ion === 'C2H3O2') {
        /* the carbon with two O, and the CH3 beside it */
        var cs = of(i, 'C');
        if (a.el === 'C' && of(i, 'O').length === 2 && cs.length === 1) out.push([i].concat(of(i, 'O'), cs, of(cs[0], 'H')));
      }
    });
    return (groupCache[id] = out);
  }

  /* one particle as a <g>, turned by rot degrees (the letters stay upright).
     ions: [{ ion, tint, hoh }]: each of these ions inside the particle gets a
     coloured outline, so it can be counted as one piece. */
  function particle(formula, x, y, scale, rot, cls, ions) {
    var lay = layout(formula), rad = (rot || 0) * Math.PI / 180, co = Math.cos(rad), si = Math.sin(rad);
    var g = s('g', { class: 'particle' + (cls ? ' ' + cls : ''), 'data-f': formula });
    function at(a) { return [x + (a.x * co - a.y * si) * scale, y + (a.x * si + a.y * co) * scale, a.r * scale]; }
    (ions || []).forEach(function (it) {
      groups(formula, it.ion, it.hoh).forEach(function (list) {
        var halo = s('g', { class: 'halo tint' + it.tint, 'data-ion': it.ion });
        list.forEach(function (i) {
          var p = at(lay.atoms[i]);
          halo.appendChild(s('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: (p[2] + Math.max(2.5, 3.5 * scale)).toFixed(1) }));
        });
        g.appendChild(halo);
      });
    });
    /* big atoms first, so a small H is never hidden */
    var order = lay.atoms.slice().sort(function (a, b) { return b.r - a.r; });
    order.forEach(function (a) {
      var p = at(a), px = p[0], py = p[1], r = p[2];
      g.appendChild(s('circle', { cx: px.toFixed(1), cy: py.toFixed(1), r: r.toFixed(1), fill: EL[a.el][2], class: 'atom' }));
      if (r >= 5) {
        g.appendChild(s('text', { x: px.toFixed(1), y: (py + r * 0.36).toFixed(1), 'font-size': (r * (a.el.length > 1 ? 0.92 : 1.12)).toFixed(1),
          fill: EL[a.el][3], class: 'atom-t', text: a.el }));
      }
    });
    return g;
  }

  /* Fill a box with n particles of each item, as large as will fit. Rows flow
     left to right, one kind after the other. o: { w, h, max (largest scale),
     was: [n, ...] (counts drawn before: the new particles pop in), scale
     (use this scale if it fits), measure (draw nothing, return the scale) }.
     Returns the scale used. Two boxes that belong together are measured
     first and drawn at the smaller scale, so an atom is the same size in both. */
  function fill(svg, items, o) {
    var W = o.w, H = o.h, pad = 8;
    if (!o.measure) {
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
    }
    var cells = [];
    items.forEach(function (it, k) {
      var R = layout(it.f).R;
      for (var i = 0; i < it.n; i++) cells.push({ f: it.f, R: R, k: k, i: i });
    });
    if (!cells.length) return o.max || 2.1;
    function flow(sc) {
      var gap = 5 * sc + 2, kindGap = 10 * sc, x = pad, y = pad, rowH = 0, rows = [[]], lastK = cells[0].k;
      for (var c = 0; c < cells.length; c++) {
        var cell = cells[c], d = 2 * cell.R * sc;
        if (cell.k !== lastK) { x += kindGap; lastK = cell.k; }
        if (x + d > W - pad && rows[rows.length - 1].length) { x = pad; y += rowH + gap; rowH = 0; rows.push([]); }
        if (x + d > W - pad) return null;
        rows[rows.length - 1].push({ cell: cell, x: x + d / 2, d: d, row: rows.length - 1 });
        cell.y0 = y;
        rowH = Math.max(rowH, d);
        rows[rows.length - 1].h = rowH; rows[rows.length - 1].y = y; rows[rows.length - 1].w = x + d;
        x += d + gap;
      }
      var total = y + rowH + pad;
      return total <= H ? { rows: rows, total: total } : null;
    }
    var sc = o.max || 2.1, fit = null;
    if (o.scale) { sc = o.scale; fit = flow(sc); }
    for (; !fit && sc >= 0.1; sc -= 0.05) { fit = flow(sc); if (fit) break; }
    if (!fit) return 0;
    if (o.measure) return sc;
    var dy = (H - fit.total) / 2;
    fit.rows.forEach(function (row) {
      var dx = (W - pad - row.w) / 2;
      row.forEach(function (p) {
        var c = p.cell, rot = ((c.k * 7 + c.i * 5) % 12) * 30 + (c.k % 2 ? 15 : 0);
        var isNew = o.was && c.i >= (o.was[c.k] || 0);
        svg.appendChild(particle(c.f, p.x + dx, row.y + dy + row.h / 2, sc, rot, isNew ? 'pop' : null, o.ions));
      });
    });
    return sc;
  }

  function one(formula, scale) {
    var sc = scale || 1.4, R = layout(formula).R * sc + 3;
    var svg = s('svg', { viewBox: [-R, -R, 2 * R, 2 * R].join(' '), width: (2 * R).toFixed(0), height: (2 * R).toFixed(0), class: 'pone',
      role: 'img', 'aria-label': 'one particle of ' + Chem.pretty(formula) });
    svg.appendChild(particle(formula, 0, 0, sc, 0));
    return svg;
  }

  /* the colour key: a dot and a name for each element */
  function key(els) {
    var box = document.createElement('div');
    box.className = 'pkey';
    els.forEach(function (el) {
      var item = document.createElement('span');
      item.className = 'pkey-i';
      var r = 9, svg = s('svg', { viewBox: '-10 -10 20 20', width: 20, height: 20, 'aria-hidden': 'true' }, [
        s('circle', { cx: 0, cy: 0, r: r, fill: EL[el][2], class: 'atom' }),
        s('text', { x: 0, y: 3.4, 'font-size': el.length > 1 ? 8.5 : 10, fill: EL[el][3], class: 'atom-t', text: el })
      ]);
      item.appendChild(svg);
      item.appendChild(document.createTextNode(' ' + EL[el][0]));
      box.appendChild(item);
    });
    return box;
  }

  /* fill two boxes at one scale */
  function pair(svgL, itemsL, svgR, itemsR, o) {
    var a = fill(null, itemsL, { w: o.w, h: o.h, max: o.max, measure: true });
    var b = fill(null, itemsR, { w: o.w, h: o.h, max: o.max, measure: true });
    var sc = Math.min(a, b);
    fill(svgL, itemsL, { w: o.w, h: o.h, max: o.max, scale: sc, was: o.wasL, ions: o.ions });
    fill(svgR, itemsR, { w: o.w, h: o.h, max: o.max, scale: sc, was: o.wasR, ions: o.ions });
    return sc;
  }

  return { pair: pair, groups: groups, EL: EL, layout: layout, readTree: readTree, particle: particle, fill: fill, one: one, key: key, radius: radius };
})();

if (typeof module !== 'undefined') module.exports = Particles;

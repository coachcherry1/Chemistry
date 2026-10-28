/* draw.js: the 2D drawings, all SVG, all computed from the graph.
 *
 *   mol(m, opts)       a bond-line formula (layout.js), with wedges and
 *                      dashes, double bonds, labels for heteroatoms, and on
 *                      request the H atoms, lone pairs, charges, carbon
 *                      numbers and clickable atoms
 *   scene(items)       several species side by side in one picture (a
 *                      substrate and its nucleophile), for the arrow tool
 *   newman(nm, opts)   a Newman projection (build3d.js gives the angles)
 *   energy(profile)    a reaction energy diagram
 *
 * Every drawing records where its atoms, bonds and lone pairs ended up
 * (svg._geo), so the curved-arrow tool can start and end arrows on them.
 */

var Draw = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var S = 44;                /* px per bond */
  var FONT = 15;

  function el(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  function svg(cls, label) {
    var s = el('svg', { class: cls || 'mol', role: 'img', viewBox: '0 0 10 10' });
    if (label) s.setAttribute('aria-label', label);
    return s;
  }

  function fit(s, box, pad) {
    pad = pad == null ? 12 : pad;
    var x0 = box[0] - pad, y0 = box[1] - pad, w = box[2] - box[0] + 2 * pad, h = box[3] - box[1] + 2 * pad;
    s.setAttribute('viewBox', [x0, y0, w, h].map(function (v) { return v.toFixed(1); }).join(' '));
    s.setAttribute('width', w.toFixed(0));
    s.setAttribute('height', h.toFixed(0));
  }

  function tone(e) { return { H: 'h', C: 'c', N: 'n', O: 'o', F: 'f', S: 's', Cl: 'cl', Br: 'br', I: 'i' }[e] || 'c'; }

  var SUB = { 2: '₂', 3: '₃' };

  /* --------------------------------------------------- bond-line formula */

  /* The text of an atom's label, and which character the bond meets. */
  function labelOf(m, i, L, opts, dirIn) {
    var a = m.atoms[i];
    var ab = L.abbr[i];
    var left = dirIn != null && dirIn > 0.3;   /* the neighbour is to the right: write it backwards */
    if (ab) return { text: left ? ab.left : ab.text, anchorAt: left ? ab.left.length - 1 : 0, alkyl: !!ab.alkyl, el: ab.alkyl ? 'C' : a.el };
    if (a.el === 'C') {
      if (m.atoms.filter(function (x) { return x.el === 'C'; }).length === 1 && !opts.mech) {
        var t = 'C' + (a.h ? 'H' + (SUB[a.h] || '') : '');
        if (left) t = (a.h ? 'H' + (SUB[a.h] || '') : '') + 'C';
        return { text: t, anchorAt: left ? t.length - 1 : 0, el: 'C' };
      }
      return null;
    }
    var hs = a.h ? 'H' + (SUB[a.h] || '') : '';
    if (a.el === 'H') return { text: 'H', anchorAt: 0, el: 'H' };
    var txt = left ? hs + a.el : a.el + hs;
    return { text: txt, anchorAt: left ? hs.length : 0, el: a.el };
  }

  /* opts:
       scale       px per bond (34)
       numbers     carbon numbers (true, or { atom: text })
       lp          draw lone pairs on these atoms (array) or all (true)
       hot         { atom: cls }   extra class on an atom's label or vertex
       hotBond     { bond: cls }
       pick        atoms drawn as focusable targets: { atom: aria label }
       label       aria-label (default: the name)
       mech        mechanism style (layout.js)
       g, at       draw into group g at offset at (for scenes)            */
  function mol(m, opts) {
    opts = opts || {};
    var sc = opts.scale || S;
    var L = opts.layout || Layout.layout(m, opts);
    var root = opts.g || svg('mol ' + (opts.cls || ''), opts.label != null ? opts.label : describe(m));
    var g = el('g', { class: 'm-g' }, root);
    var off = opts.at || [0, 0];
    var P = {};
    Object.keys(L.pos).forEach(function (i) { P[i] = [off[0] + L.pos[i][0] * sc, off[1] - L.pos[i][1] * sc]; });
    var geo = { P: P, lp: {}, bonds: {}, labels: {}, m: m, L: L };
    var box = [Infinity, Infinity, -Infinity, -Infinity];
    function grow(x, y, r) { r = r || 0; box[0] = Math.min(box[0], x - r); box[1] = Math.min(box[1], y - r); box[2] = Math.max(box[2], x + r); box[3] = Math.max(box[3], y + r); }
    Object.keys(P).forEach(function (i) { grow(P[i][0], P[i][1]); });

    /* labels first (their sizes shorten the bonds) */
    var labels = {};
    Object.keys(P).forEach(function (k) {
      var i = +k;
      var nbs = L.adj[i] || [];
      var dx = 0;
      nbs.forEach(function (x) { if (P[x.j]) dx += (P[x.j][0] - P[i][0]); });
      if (nbs.length) dx /= nbs.length * sc;
      var lab = labelOf(m, i, L, opts, nbs.length === 1 ? dx : null);
      if (lab) labels[i] = lab;
    });

    function shrink(i) { return labels[i] ? 0.34 * sc : 0; }

    var gb = el('g', { class: 'm-bonds' }, g);
    m.bonds.forEach(function (b, k) {
      if (!P[b.a] || !P[b.b]) return;
      var a = P[b.a], c = P[b.b];
      var dx = c[0] - a[0], dy = c[1] - a[1], len = Math.hypot(dx, dy) || 1;
      var ux = dx / len, uy = dy / len;
      var s0 = shrink(b.a), s1 = shrink(b.b);
      var p0 = [a[0] + ux * s0, a[1] + uy * s0], p1 = [c[0] - ux * s1, c[1] - uy * s1];
      var cls = 'm-bond' + (opts.hotBond && opts.hotBond[k] ? ' ' + opts.hotBond[k] : '');
      var w = L.wedge[k];
      geo.bonds[k] = { p0: p0, p1: p1, mid: [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2] };
      if (w) {
        var from = w.from === b.a ? p0 : p1, to = w.from === b.a ? p1 : p0;
        var nx = -(to[1] - from[1]), ny = to[0] - from[0], nl = Math.hypot(nx, ny) || 1;
        nx /= nl; ny /= nl;
        var hw = 0.13 * sc;
        if (w.type === 'w') {
          el('polygon', { class: 'm-wedge' + (opts.hotBond && opts.hotBond[k] ? ' ' + opts.hotBond[k] : ''),
            points: [from, [to[0] + nx * hw, to[1] + ny * hw], [to[0] - nx * hw, to[1] - ny * hw]].map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') }, gb);
        } else {
          var n = 6;
          for (var t = 1; t <= n; t++) {
            var f = t / n, cx = from[0] + (to[0] - from[0]) * f, cy = from[1] + (to[1] - from[1]) * f, hh = hw * f;
            el('line', { class: 'm-hash' + (opts.hotBond && opts.hotBond[k] ? ' ' + opts.hotBond[k] : ''),
              x1: (cx + nx * hh).toFixed(1), y1: (cy + ny * hh).toFixed(1), x2: (cx - nx * hh).toFixed(1), y2: (cy - ny * hh).toFixed(1) }, gb);
          }
        }
        return;
      }
      line(p0, p1, cls);
      if (b.order === 3) {
        var tx = -uy * 0.15 * sc, ty = ux * 0.15 * sc;
        line([p0[0] + tx, p0[1] + ty], [p1[0] + tx, p1[1] + ty], cls);
        line([p0[0] - tx, p0[1] - ty], [p1[0] - tx, p1[1] - ty], cls);
        return;
      }
      if (b.order >= 2) {
        var side = doubleSide(m, L, P, b);
        var nx2 = -uy, ny2 = ux, gap = 0.16 * sc;
        if (side === 0) {
          /* centred: redraw as two lines either side */
          gb.removeChild(gb.lastChild);
          line([p0[0] + nx2 * gap / 2, p0[1] + ny2 * gap / 2], [p1[0] + nx2 * gap / 2, p1[1] + ny2 * gap / 2], cls);
          line([p0[0] - nx2 * gap / 2, p0[1] - ny2 * gap / 2], [p1[0] - nx2 * gap / 2, p1[1] - ny2 * gap / 2], cls);
        } else {
          var sh = 0.14 * len;
          var q0 = [p0[0] + ux * (labels[b.a] ? 0 : sh) + nx2 * gap * side, p0[1] + uy * (labels[b.a] ? 0 : sh) + ny2 * gap * side];
          var q1 = [p1[0] - ux * (labels[b.b] ? 0 : sh) + nx2 * gap * side, p1[1] - uy * (labels[b.b] ? 0 : sh) + ny2 * gap * side];
          line(q0, q1, cls);
        }
      }
    });
    function line(p0, p1, cls) {
      el('line', { class: cls, x1: p0[0].toFixed(1), y1: p0[1].toFixed(1), x2: p1[0].toFixed(1), y2: p1[1].toFixed(1) }, gb);
    }

    /* atom labels, charges, lone pairs */
    var gl = el('g', { class: 'm-labels' }, g);
    var cw = 0.58 * FONT;
    Object.keys(P).forEach(function (k) {
      var i = +k, a = m.atoms[i], p = P[i];
      var lab = labels[i];
      var hot = opts.hot && opts.hot[i] ? ' ' + opts.hot[i] : '';
      if (lab) {
        var x0 = p[0] - cw * (lab.anchorAt + 0.5);
        var t = el('text', { x: x0.toFixed(1), y: (p[1] + FONT * 0.36).toFixed(1), class: 'm-label tone-' + tone(lab.el) + hot }, gl);
        writeLabel(t, lab.text);
        geo.labels[i] = { x0: x0, x1: x0 + cw * lab.text.length, y: p[1] };
        grow(x0, p[1] - FONT * 0.6); grow(x0 + cw * lab.text.length, p[1] + FONT * 0.5);
      } else if (hot) {
        el('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: (0.16 * sc).toFixed(1), class: 'm-dot' + hot }, gl);
      }
      var wantLp = opts.lp === true ? (a.el !== 'C' && a.el !== 'H') : opts.lp && opts.lp.indexOf(i) >= 0;
      if (wantLp && lab && !lab.alkyl) {
        var n = m.lonePairs(i);
        var dirs = lpDirs(i, n);
        geo.lp[i] = [];
        dirs.forEach(function (d, q) {
          var r = 0.5 * sc;
          var cx2 = p[0] + d[0] * r * (Math.abs(d[0]) > 0.5 ? 1.05 : 0.95), cy2 = p[1] + d[1] * r * 0.95 + (Math.abs(d[1]) < 0.5 ? -2 : 0);
          var nx = -d[1], ny = d[0];
          var gp = el('g', { class: 'm-lp', 'data-atom': i, 'data-lp': q }, gl);
          el('circle', { cx: (cx2 + nx * 3.4).toFixed(1), cy: (cy2 + ny * 3.4).toFixed(1), r: 2.1, class: 'm-lp-dot' }, gp);
          el('circle', { cx: (cx2 - nx * 3.4).toFixed(1), cy: (cy2 - ny * 3.4).toFixed(1), r: 2.1, class: 'm-lp-dot' }, gp);
          geo.lp[i].push([cx2, cy2, d]);
          grow(cx2, cy2, 5);
        });
      }
    });

    /* charges, where nothing else is: beside the label or the vertex, away
       from its bonds and lone pairs */
    Object.keys(P).forEach(function (k) {
      var i = +k, a = m.atoms[i], p = P[i];
      if (!a.charge || (L.abbr[i] && !opts.mech)) return;
      var lab = labels[i];
      var busy = (L.adj[i] || []).filter(function (x) { return P[x.j]; }).map(function (x) {
        return Math.atan2(P[x.j][1] - p[1], P[x.j][0] - p[0]);
      });
      (geo.lp[i] || []).forEach(function (q) { busy.push(Math.atan2(q[2][1], q[2][0])); });
      var cand = [-Math.PI / 4, -3 * Math.PI / 4, Math.PI / 4, 3 * Math.PI / 4, -Math.PI / 2, 0, Math.PI, Math.PI / 2];
      var best = cand[0], bd = -1;
      cand.forEach(function (c) {
        var d = busy.length ? Math.min.apply(null, busy.map(function (u) { var x = Math.abs(c - u) % (2 * Math.PI); return x > Math.PI ? 2 * Math.PI - x : x; })) : 9;
        if (d > bd + 0.01) { bd = d; best = c; }
      });
      var r = lab ? 0.62 * sc : 0.42 * sc;
      var cx = p[0] + Math.cos(best) * r, cy = p[1] + Math.sin(best) * r;
      if (lab) {
        var lx = geo.labels[i];
        if (Math.cos(best) > 0.3) cx = Math.max(cx, lx.x1 + 7);
        if (Math.cos(best) < -0.3) cx = Math.min(cx, lx.x0 - 7);
      }
      el('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: 6.2, class: 'm-charge-ring' }, gl);
      el('text', { x: cx.toFixed(1), y: (cy + 4).toFixed(1), class: 'm-charge', 'text-anchor': 'middle' }, gl, a.charge > 0 ? '+' : '−');
      geo.charge = geo.charge || {};
      geo.charge[i] = [cx, cy];
      grow(cx, cy, 7);
    });

    /* the open direction round atom i (unit, screen coordinates) */
    function freeDir(i, wide) {
      var used = (L.adj[i] || []).filter(function (x) { return P[x.j]; }).map(function (x) { return Math.atan2(P[x.j][1] - P[i][1], P[x.j][0] - P[i][0]); });
      if (!used.length) return [0.7, -0.7];
      var cand = [-Math.PI / 4, -Math.PI / 2, -3 * Math.PI / 4, 0, Math.PI, Math.PI / 4, 3 * Math.PI / 4, Math.PI / 2];
      var best = cand[0], bd = -1;
      cand.forEach(function (c) {
        var d = Math.min.apply(null, used.map(function (u) { var x = Math.abs(c - u) % (2 * Math.PI); return x > Math.PI ? 2 * Math.PI - x : x; }));
        if (d > bd + 0.01) { bd = d; best = c; }
      });
      return [Math.cos(best), Math.sin(best)];
    }

    /* lone pairs sit in the open directions round a label: up, down and the
       side away from its bond */
    function lpDirs(i, n) {
      if (!n) return [];
      var used = (L.adj[i] || []).filter(function (x) { return P[x.j]; }).map(function (x) {
        return Math.atan2(P[x.j][1] - P[i][1], P[x.j][0] - P[i][0]);
      });
      var cand = [-Math.PI / 2, Math.PI / 2, 0, Math.PI];
      if (labels[i] && labels[i].text.length > 1) {
        /* a long label (OH, SH): no pair across its letters */
        var lx = geo.labels[i];
        cand = cand.filter(function (c) {
          if (Math.abs(Math.cos(c)) < 0.5) return true;
          var tip = P[i][0] + Math.cos(c) * 0.5 * S;
          return tip < lx.x0 || tip > lx.x1;
        });
      }
      var free = cand.map(function (c) {
        var d = used.length ? Math.min.apply(null, used.map(function (u) { var x = Math.abs(c - u) % (2 * Math.PI); return x > Math.PI ? 2 * Math.PI - x : x; })) : 9;
        return { c: c, d: d };
      }).filter(function (x) { return x.d > 0.9; }).sort(function (p, q) { return q.d - p.d; });
      return free.slice(0, n).map(function (x) { return [Math.cos(x.c), Math.sin(x.c)]; });
    }

    /* carbon numbers */
    if (opts.numbers) {
      var num = opts.numbers === true ? Name.numbers(m) : opts.numbers;
      Object.keys(num).forEach(function (i) {
        if (!P[i]) return;
        var d = freeDir(+i);
        var x = P[i][0] + d[0] * 13, y = P[i][1] + d[1] * 13 + 4;
        if (labels[i]) { x = P[i][0] + d[0] * 18; y = P[i][1] + d[1] * 18 + 4; }
        el('text', { x: x.toFixed(1), y: y.toFixed(1), class: 'm-num', 'text-anchor': 'middle' }, gl, String(num[i]));
        grow(x, y, 7);
      });
    }

    /* clickable atoms */
    if (opts.pick) {
      var gp2 = el('g', { class: 'm-picks' }, g);
      Object.keys(opts.pick).forEach(function (i) {
        if (!P[i]) return;
        var t = el('g', { class: 'drop m-pick', 'data-drop': String(i), tabindex: 0, role: 'button', 'aria-label': opts.pick[i] }, gp2);
        el('circle', { cx: P[i][0].toFixed(1), cy: P[i][1].toFixed(1), r: (0.3 * sc).toFixed(1), class: 'slot-box' }, t);
      });
    }

    geo.box = box;
    if (!opts.g) {
      fit(root, box, opts.pad);
      root._geo = geo;
    }
    return opts.g ? geo : root;
  }

  /* Subscripts and charges in a label: CH₃ and N₃ come through as text. */
  function writeLabel(t, text) { t.textContent = text; }

  /* Which side of a double bond its second line goes on: toward the ring's
     centre, or the side with more neighbours; 0 for centred. */
  function doubleSide(m, L, P, b) {
    var a = P[b.a], c = P[b.b];
    if (L.ring && L.ring.indexOf(b.a) >= 0 && L.ring.indexOf(b.b) >= 0) {
      var cx = 0, cy = 0;
      L.ring.forEach(function (i) { cx += P[i][0] / 6; cy += P[i][1] / 6; });
      return sideOf(cx, cy);
    }
    function sideOf(x, y) { return Math.sign((c[0] - a[0]) * (y - a[1]) - (c[1] - a[1]) * (x - a[0])) * -1 || 0; }
    var s = 0, n = 0;
    [b.a, b.b].forEach(function (x) {
      (L.adj[x] || []).forEach(function (y) {
        if (y.j === b.a || y.j === b.b || !P[y.j]) return;
        s += sideOf(P[y.j][0], P[y.j][1]); n++;
      });
    });
    if (!n) return 0;
    if (s === 0) return 1;
    return s > 0 ? 1 : -1;
  }

  function describe(m) {
    var n = Name.name(m);
    return 'Bond-line formula of ' + (n || 'a molecule');
  }

  /* ---------------------------------------------------- chair helpers */

  var RAD = Math.PI / 180;
  var V = CHAIR.vec;
  function anchorFor(dx) { return dx > 0.35 ? 'start' : dx < -0.35 ? 'end' : 'middle'; }
  function textW(t) { return 9.2 * t.length + 2; }
  function fitPts(s, pts, pad) {
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    fit(s, [Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs), Math.max.apply(null, ys)], pad);
  }
  function ctone(g) {
    var G2 = CGROUPS[g];
    if (!G2) return 'c';
    if (G2.tint) return G2.tint;
    return tone(G2.el);
  }
  /* the non-H groups of a ring spec, as [{ pos, g, c, f }] */
  function ringGroups(spec) {
    var out = [];
    for (var c = 1; c <= 6; c++) ['t', 'b'].forEach(function (f) {
      var g = CHAIR.groupAt(spec, c, f);
      if (g !== 'H') out.push({ pos: c + f, g: g, c: c, f: f });
    });
    return out;
  }

  /* ------------------------------------------------------------ chair */

  var CS = 60;          /* chairs: px per ångström */
  var CSUB = 0.95;      /* chairs: drawn length of every substituent bond, Å */

  /* Which positions a chair drawing shows when not told: every non-H group,
     and the H on the same carbon. */
  function defaultShow(mol) {
    var out = [];
    ringGroups(mol).forEach(function (g) {
      [g.c + 't', g.c + 'b'].forEach(function (p) { if (out.indexOf(p) < 0) out.push(p); });
    });
    return out;
  }

  function chairText(mol, t, show) {
    var k = t >= 0.5 ? 1 : 0;
    var bits = ringGroups(mol).map(function (g) {
      return CGROUPS[g.g].name + ' on C' + g.c + ', ' + CHAIR.describe(g.pos, k);
    });
    var shownH = show.filter(function (p) { return CHAIR.groupAt(mol, CHAIR.carbonOf(p), CHAIR.faceOf(p)) === 'H'; });
    return 'Chair drawing of the ring' + (bits.length ? ': ' + bits.join('; ') : '') +
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
    function P3(p) { return [V.dot(cam[0], p) * CS, -V.dot(cam[1], p) * CS, V.dot(cam[2], p)]; }
    var show = opts.show === 'all' ? CHAIR.POSITIONS.slice() : (opts.show || defaultShow(mol));
    var targets = opts.targets || {}, mark = opts.mark || {}, letters = opts.letters || {}, text = opts.text || {};
    var s = svg('chair ' + (opts.cls || ''), opts.label || chairText(mol, t, show));
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
      var end = P3(V.add(cp, V.mul(dir, CSUB)));
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
      var lab = text[pos] != null ? text[pos] : CGROUPS[sb.g].label;
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
        var tone = lab === '+' ? 'slot-plus' : 'tone-' + ctone(tg.g || sb.g);
        el('text', { x: bx.toFixed(1), y: ly.toFixed(1), 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'ch-label ' + tone }, parent, lab);
      } else if (lab) {
        el('text', { x: bx.toFixed(1), y: ly.toFixed(1), 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'ch-label tone-' + ctone(sb.g) + ' ' + (mark[pos] || '') }, parent, lab);
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
    fitPts(s, pts, opts.pad == null ? 8 : opts.pad);
    return s;
  }

  /* --------------------------------------------------------- Newman */

  var NR = 30, FRONT = 84, BACK = 56, FRONT_LABEL = 98, BACK_LABEL = 70;

  function at(r, a) { return [r * Math.sin(a * RAD), -r * Math.cos(a * RAD)]; }
  function anchorAt(a) { var sx = Math.sin(a * RAD); return sx > 0.3 ? 'start' : sx < -0.3 ? 'end' : 'middle'; }
  var CLOCK = { 0: 'at the top', 60: 'upper right', 90: 'right', 120: 'lower right', 180: 'at the bottom', 240: 'lower left',
                270: 'left', 300: 'upper left' };

  /* A group written as Klein writes it in a Newman projection. */
  function groupText(m, from, j) {
    if (j < 0) return 'H';
    var a = m.atoms[j];
    if (a.el !== 'C') {
      if (a.el === 'O' || a.el === 'S') return a.el + (a.h ? 'H' : '');
      return a.el;
    }
    var al = Name.alkyl(m, j, from);
    var SHORT = { methyl: 'CH₃', ethyl: 'CH₂CH₃', isopropyl: 'CH(CH₃)₂', 'tert-butyl': 'C(CH₃)₃', propyl: 'CH₂CH₂CH₃' };
    if (al && SHORT[al]) return SHORT[al];
    return 'C';
  }

  /* nm: { front: [{ a, text, el, cls }], back: [...] } angles in degrees
     clockwise from the top. opts.label, opts.cls, opts.flat (an alkene seen
     end on: no circle). */
  function newman(nm, opts) {
    opts = opts || {};
    var s = svg('newman ' + (opts.cls || ''), opts.label || newmanText(nm));
    s.setAttribute('viewBox', '-128 -120 256 240');
    var back = el('g', null, s);
    nm.back.forEach(function (q) {
      if (q.alpha === 0) return;
      var p1 = at(NR, q.a), p2 = at(BACK, q.a);
      var ln = el('line', { x1: p1[0].toFixed(1), y1: p1[1].toFixed(1), x2: p2[0].toFixed(1), y2: p2[1].toFixed(1),
        class: 'nm-bond-back' + (q.cls ? ' ' + q.cls : '') }, back);
      if (q.alpha != null) ln.setAttribute('opacity', q.alpha);
    });
    var circ = el('circle', { cx: 0, cy: 0, r: NR, class: 'nm-circle' }, s);
    if (opts.flat != null) circ.setAttribute('opacity', 1 - opts.flat);
    nm.front.forEach(function (q) {
      if (q.alpha === 0) return;
      var p = at(FRONT, q.a);
      var ln = el('line', { x1: 0, y1: 0, x2: p[0].toFixed(1), y2: p[1].toFixed(1), class: 'nm-bond-front' + (q.cls ? ' ' + q.cls : '') }, s);
      if (q.alpha != null) ln.setAttribute('opacity', q.alpha);
    });
    var labels = el('g', null, s);
    function label(q, rr, cls) {
      if (q.alpha === 0) return;
      var p = at(rr, q.a);
      var t = el('text', { x: p[0].toFixed(1), y: p[1].toFixed(1), 'text-anchor': anchorAt(q.a), 'dominant-baseline': 'central',
        class: 'nm-label tone-' + tone(q.el || 'C') + (cls ? ' ' + cls : '') + (q.cls ? ' ' + q.cls : '') }, labels, q.text);
      if (q.alpha != null) t.setAttribute('opacity', q.alpha);
    }
    nm.back.forEach(function (q) { label(q, BACK_LABEL, 'nm-back-label small'); });
    nm.front.forEach(function (q) { label(q, FRONT_LABEL); });
    return s;
  }

  function newmanText(nm) {
    function side(list) {
      return list.filter(function (q) { return q.alpha !== 0; }).map(function (q) {
        return q.text + ' ' + (CLOCK[Math.round(q.a / 30) * 30 % 360] || 'at ' + Math.round(q.a) + '°');
      }).join(', ');
    }
    return 'Newman projection. Front carbon: ' + side(nm.front) + '. Back carbon: ' + side(nm.back) + '.';
  }

  /* ------------------------------------------------------ energy diagram */

  /* points: [{ E (0 = start, 1 = the highest), t (label), ts }], drawn
     evenly along the reaction coordinate with smooth humps.
     opts.marker: progress 0 to 1; opts.upto: draw the curve only so far;
     opts.bands: [{ from, to, text, cls }] shaded stretches (Klein's
     substitution and proton-transfer colours). */
  function energy(points, opts) {
    opts = opts || {};
    var W = opts.w || 330, H = opts.h || 200;
    var s = svg('energy ' + (opts.cls || ''), opts.label || 'Energy diagram');
    s.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var x0 = 34, x1 = W - 12, y0 = 22, y1 = H - 30;
    var lo = Math.min.apply(null, points.map(function (p) { return p.E; })), hi = Math.max.apply(null, points.map(function (p) { return p.E; }));
    function X(f) { return x0 + 10 + f * (x1 - x0 - 20); }
    function Y(e) { return y1 - 14 - (e - lo) / (hi - lo || 1) * (y1 - y0 - 30); }
    var n = points.length;
    function E(f) {
      var u = f * (n - 1), k = Math.min(n - 2, Math.floor(u)), t = u - k;
      return points[k].E + (points[k + 1].E - points[k].E) * (1 - Math.cos(Math.PI * t)) / 2;
    }
    (opts.bands || []).forEach(function (b) {
      el('rect', { x: X(b.from).toFixed(1), y: y0, width: (X(b.to) - X(b.from)).toFixed(1), height: y1 - y0, class: 'en-band ' + (b.cls || '') }, s);
      if (b.text) el('text', { x: ((X(b.from) + X(b.to)) / 2).toFixed(1), y: y0 + 12, 'text-anchor': 'middle', class: 'en-band-text' }, s, b.text);
    });
    el('line', { x1: x0, y1: y1, x2: x1, y2: y1, class: 'en-axis' }, s);
    el('line', { x1: x0, y1: y1, x2: x0, y2: y0 - 6, class: 'en-axis' }, s);
    el('polygon', { points: [x0 - 4, y0 - 2, x0 + 4, y0 - 2, x0, y0 - 10].join(' '), class: 'en-arrow' }, s);
    el('text', { x: 12, y: (y0 + y1) / 2, class: 'en-axis-text', transform: 'rotate(-90 12 ' + ((y0 + y1) / 2) + ')', 'text-anchor': 'middle' }, s, 'Energy');
    el('text', { x: (x0 + x1) / 2, y: H - 8, class: 'en-axis-text', 'text-anchor': 'middle' }, s, 'Reaction coordinate');
    var upto = opts.upto == null ? 1 : opts.upto;
    var d = '', dRest = '';
    for (var k = 0; k <= 120; k++) {
      var f = k / 120;
      var pt = X(f).toFixed(1) + ' ' + Y(E(f)).toFixed(1);
      if (f <= upto + 1e-9) d += (d ? ' L' : 'M') + pt;
      else dRest += (dRest ? ' L' : 'M') + pt;
    }
    if (dRest) el('path', { d: dRest, class: 'en-curve rest' }, s);
    el('path', { d: d, class: 'en-curve' }, s);
    points.forEach(function (p, i) {
      var f = i / (n - 1);
      if (!p.t || f > upto + 1e-9) return;
      var y = Y(p.E) + (p.ts ? -9 : 15);
      el('text', { x: X(f).toFixed(1), y: y.toFixed(1), 'text-anchor': 'middle', class: 'en-label' + (p.ts ? ' ts' : '') }, s, p.t);
    });
    if (opts.marker != null) {
      var mf = Math.max(0, Math.min(1, opts.marker));
      el('circle', { cx: X(mf).toFixed(1), cy: Y(E(mf)).toFixed(1), r: 6.5, class: 'en-marker' }, s);
    }
    s._X = X; s._Y = Y; s._E = E;
    return s;
  }

  /* ------------------------------------------------------------- scenes */

  /* items: [{ mol, opts }] laid left to right with `gap` px between, or at
     explicit offsets (item.at). Returns an svg with _geo = [geo per item]. */
  function scene(items, o) {
    o = o || {};
    var root = svg('mol scene ' + (o.cls || ''), o.label || '');
    var x = 0, geos = [];
    var box = [Infinity, Infinity, -Infinity, -Infinity];
    items.forEach(function (it) {
      var g = el('g', { class: 'sp', 'data-sp': geos.length }, root);
      var opts = Object.assign({}, it.opts || {}, { g: g, at: [0, 0] });
      /* lay out once to measure, then shift */
      var geo = mol(it.mol, opts);
      var dx = it.at ? it.at[0] : x - geo.box[0];
      var dy = it.at ? it.at[1] : -((geo.box[1] + geo.box[3]) / 2) + (it.dy || 0);
      g.setAttribute('transform', 'translate(' + dx.toFixed(1) + ',' + dy.toFixed(1) + ')');
      shiftGeo(geo, dx, dy);
      geos.push(geo);
      box = [Math.min(box[0], geo.box[0]), Math.min(box[1], geo.box[1]), Math.max(box[2], geo.box[2]), Math.max(box[3], geo.box[3])];
      x = geo.box[2] + (it.gap != null ? it.gap : o.gap != null ? o.gap : 40);
    });
    (o.text || []).forEach(function (t) {
      el('text', { x: t.x, y: t.y, class: 'scene-text', 'text-anchor': 'middle' }, root, t.text);
    });
    fit(root, box, o.pad != null ? o.pad : 16);
    root._geo = geos;
    root._box = box;
    return root;
  }

  function shiftGeo(geo, dx, dy) {
    function mv(p) { p[0] += dx; p[1] += dy; }
    Object.keys(geo.P).forEach(function (i) { mv(geo.P[i]); });
    Object.keys(geo.lp).forEach(function (i) { geo.lp[i].forEach(mv); });
    Object.keys(geo.bonds).forEach(function (k) { mv(geo.bonds[k].p0); mv(geo.bonds[k].p1); mv(geo.bonds[k].mid); });
    Object.keys(geo.labels).forEach(function (i) { geo.labels[i].x0 += dx; geo.labels[i].x1 += dx; geo.labels[i].y += dy; });
    if (geo.charge) Object.keys(geo.charge).forEach(function (i) { mv(geo.charge[i]); });
    geo.box = [geo.box[0] + dx, geo.box[1] + dy, geo.box[2] + dx, geo.box[3] + dy];
  }

  return { el: el, svg: svg, fit: fit, mol: mol, scene: scene, tone: tone, S: S, chair: chair, ringGroups: ringGroups, newman: newman, groupText: groupText, energy: energy, at: at, shiftGeo: shiftGeo };
})();

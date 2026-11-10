/* render.js: the drawings, all SVG, all from chem.js states.
 *
 *   draw(st, o)       one state: bond-line formula, heteroatom labels, every
 *                     lone pair, formal charges in circles, and on request
 *                     curved arrows, partial charges and clickable atoms
 *   Player(sc, o)     one step of a mechanism as an animation: p = 0 is the
 *                     drawing with its arrows, p = 1 the products. The
 *                     electron pairs ride the arrows, the bonds that break
 *                     fade (dashed while they go), new bonds grow, atoms
 *                     glide to their new places and the charges change.
 *   arrowPath(...)    the curve of a curved arrow between two places
 *
 * A drawing records where its atoms, bonds and lone pairs are (geo), so the
 * arrow tool can start and end arrows on them. Nothing here moves on its
 * own: the caller sets p (a slider, Play, or the energy diagram).
 */

var Render = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var S = 44;
  var FONT = 15;
  var RAD = Math.PI / 180;

  function el(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function f1(v) { return (+v).toFixed(1); }
  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function seg(p, a, b) { return smooth((p - a) / (b - a)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function angDist(a, b) { var x = Math.abs(a - b) % (2 * Math.PI); return x > Math.PI ? 2 * Math.PI - x : x; }

  function tone(e) { return { H: 'h', C: 'c', N: 'n', O: 'o', F: 'f', S: 's', Cl: 'cl', Br: 'br', I: 'i', Li: 'li' }[e] || 'c'; }
  var SUB = { 2: '₂', 3: '₃' };

  /* ---------------------------------------------------------- labels */

  /* The text at an atom and which character sits on the atom itself.
     Carbons are corners of the bond-line drawing unless labelled. */
  function labelOf(st, a, P) {
    /* an OH, HO or HS label is just the atom and its hidden H: written to suit its bonds */
    if (a.label && !/^(H[₂₃]?)?[A-Z][a-z]?(H[₂₃]?)?$/.test(a.label.replace(/[₂₃]/g, '')) || (a.label && a.el === 'C')) {
      var at = a.label.indexOf(a.el);
      return { text: a.label, at: at < 0 ? 0 : at };
    }
    if (a.el === 'C') return null;
    if (!a.h) return { text: a.el, at: 0 };
    var hs = 'H' + (SUB[a.h] || '');
    /* the H atoms go on the side away from the bonds; alone, H first (HO⁻, HS⁻) */
    var nb = Chem.neighbours(st, a.id), dx = 0;
    nb.forEach(function (n) { dx += P[n.id][0] - P[a.id][0]; });
    if (dx > 0.1 || !nb.length) return { text: hs + a.el, at: hs.length };
    return { text: a.el + hs, at: 0 };
  }

  /* Directions (radians, screen) for n lone pairs round an atom with
     bonds along `used`: as far from the bonds and from each other as they
     can be, on the 30° grid, square to the page when it is a tie. */
  var lpCache = {};
  function lpDirs(used, n, block) {
    if (!n) return [];
    var k = used.map(function (u) { return Math.round(u / RAD); }).join(',') + '|' + n + '|' + (block || 0);
    if (lpCache[k]) return lpCache[k];
    var cand = [];
    for (var d = 0; d < 360; d += 30) {
      var r = d * RAD;
      if (block === -1 && Math.cos(r) < -0.3) continue;
      if (block === 1 && Math.cos(r) > 0.3) continue;
      cand.push(r);
    }
    /* as far apart as possible; then as far from the bonds in all; then square */
    var best = null, bs = -1, bf = -1, bt = 0;
    (function walk(start, pick) {
      if (pick.length === n) {
        var all = used.concat(pick), m = 9, far = 0;
        for (var i = 0; i < all.length; i++) for (var j = i + 1; j < all.length; j++) m = Math.min(m, angDist(all[i], all[j]));
        pick.forEach(function (a) { used.forEach(function (u) { far += angDist(a, u); }); });
        var sq = pick.reduce(function (s, a) { var x = Math.round(a / RAD) % 90; return s + (x === 0 ? 1 : 0); }, 0);
        var better = m > bs + 1e-6 || (Math.abs(m - bs) < 1e-6 && (far > bf + 1e-6 || (Math.abs(far - bf) < 1e-6 && sq > bt)));
        if (better) { bs = m; bf = far; best = pick.slice(); bt = sq; }
        return;
      }
      for (var c = start; c < cand.length; c++) { pick.push(cand[c]); walk(c + 1, pick); pick.pop(); }
    })(0, []);
    lpCache[k] = (best || []).map(function (a) { return [Math.cos(a), Math.sin(a)]; });
    return lpCache[k];
  }

  /* -------------------------------------------------------- one frame */

  /* Lay a state out in screen px: { P: { id: [x, y] } } */
  function screen(st, sc) {
    var P = {};
    st.atoms.forEach(function (a) { P[a.id] = [a.x * sc, -a.y * sc]; });
    return P;
  }

  /* Draw into group g. o: sc, P (positions, px), bonds [{ a, b, k, op, dash }]
     (one entry per line of a bond), lp { id: n }, charges [{ id, c, op }],
     opacity { id }, hot { id: cls }, partial { id: '+' | '-' }.
     Returns geo { P, lp: { id: [[x, y, dir]] }, labels, box }. */
  function paint(st, g, o) {
    var sc = o.sc || S, P = o.P;
    /* directions (lone pairs, charges, which way a label reads) can be taken from
       another set of positions, so nothing hops about while atoms glide */
    var LP = o.layoutP || P;
    var geo = { P: P, lp: {}, labels: {}, charge: {}, box: [Infinity, Infinity, -Infinity, -Infinity] };
    function grow(x, y, r) { r = r || 0; var b = geo.box; b[0] = Math.min(b[0], x - r); b[1] = Math.min(b[1], y - r); b[2] = Math.max(b[2], x + r); b[3] = Math.max(b[3], y + r); }
    var labels = {};
    st.atoms.forEach(function (a) { var l = labelOf(st, a, LP); if (l) labels[a.id] = l; grow(P[a.id][0], P[a.id][1], 6); });
    function shrink(id) { return labels[id] ? 0.34 * sc : 0; }

    /* bonds */
    var gb = el('g', { class: 'm-bonds' }, g);
    var cx = 0, cy = 0;
    st.atoms.forEach(function (a) { cx += P[a.id][0]; cy += P[a.id][1]; });
    cx /= st.atoms.length; cy /= st.atoms.length;
    (o.bonds || []).forEach(function (b) {
      var A = P[b.a], B = P[b.b];
      var dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      var s0 = shrink(b.a), s1 = shrink(b.b);
      var p0 = [A[0] + ux * s0, A[1] + uy * s0], p1 = [B[0] - ux * s1, B[1] - uy * s1];
      var nx = -uy, ny = ux, gap = 0.16 * sc, off = 0, trim = 0;
      if (b.k === 2 || b.k === 3) {
        if (b.n === 2 && b.k === 2) {
          /* a double bond: second line inside a ring, or toward the neighbours */
          var side = b.side != null ? b.side : 1;
          off = gap * side;
          trim = 0.14 * len;
        } else off = b.k === 2 ? gap : -gap;
      }
      if (b.centred) { off = (b.k === 1 ? 0.5 : -0.5) * gap; trim = 0; }
      var q0 = [p0[0] + nx * off + ux * (labels[b.a] ? 0 : trim), p0[1] + ny * off + uy * (labels[b.a] ? 0 : trim)];
      var q1 = [p1[0] + nx * off - ux * (labels[b.b] ? 0 : trim), p1[1] + ny * off - uy * (labels[b.b] ? 0 : trim)];
      if (b.grow != null) {
        /* a bond being made: drawn out from the atom the electrons come from */
        if (b.from === b.b) { var tmp = q0; q0 = q1; q1 = tmp; }
        q1 = [q0[0] + (q1[0] - q0[0]) * b.grow, q0[1] + (q1[1] - q0[1]) * b.grow];
        if (b.grow < 0.02) return;
      }
      el('line', { class: 'm-bond' + (b.dash ? ' partial' : '') + (b.cls ? ' ' + b.cls : ''), x1: f1(q0[0]), y1: f1(q0[1]), x2: f1(q1[0]), y2: f1(q1[1]),
        opacity: b.op != null && b.op < 0.999 ? b.op.toFixed(2) : null }, gb);
    });

    /* labels */
    var gl = el('g', { class: 'm-labels' }, g);
    var cw = 0.58 * FONT;
    st.atoms.forEach(function (a) {
      var p = P[a.id], lab = labels[a.id];
      var hot = o.hot && o.hot[a.id] ? ' ' + o.hot[a.id] : '';
      if (lab) {
        var x0 = p[0] - cw * (lab.at + 0.5);
        el('text', { x: f1(x0), y: f1(p[1] + FONT * 0.36), class: 'm-label tone-' + tone(a.el) + hot }, gl, lab.text);
        geo.labels[a.id] = { x0: x0, x1: x0 + cw * lab.text.length, y: p[1] };
        grow(x0, p[1] - FONT * 0.6); grow(x0 + cw * lab.text.length, p[1] + FONT * 0.5);
      } else if (hot) {
        el('circle', { cx: f1(p[0]), cy: f1(p[1]), r: f1(0.17 * sc), class: 'm-dot' + hot }, gl);
      }
    });

    function usedDirs(id) {
      return Chem.neighbours(st, id).map(function (n) { return Math.atan2(LP[n.id][1] - LP[id][1], LP[n.id][0] - LP[id][0]); })
        .concat((o.extraUsed && o.extraUsed[id]) || []);
    }

    /* lone pairs */
    st.atoms.forEach(function (a) {
      var n = o.lp ? (o.lp[a.id] != null ? o.lp[a.id] : 0) : a.lp;
      if (!n) return;
      var lab = labels[a.id], p = P[a.id];
      var block = 0;
      if (lab && lab.text.length > a.el.length) block = lab.at > 0 ? -1 : 1;
      var dirs = lpDirs(usedDirs(a.id), n, block);
      geo.lp[a.id] = [];
      var spots = dirs.map(function (d) {
        var r = (lab ? 0.5 : 0.36) * sc;
        if (lab && Math.abs(d[0]) > 0.5) {
          /* clear the letters on that side */
          var L = geo.labels[a.id];
          r = Math.max(r, (d[0] > 0 ? L.x1 - p[0] : p[0] - L.x0) + 5);
        }
        return [p[0] + d[0] * r, p[1] + d[1] * r * 0.92 + (Math.abs(d[1]) < 0.5 ? -1 : 0), d];
      });
      /* pairs that have left on an arrow are not drawn; pairs that have just landed are marked */
      function nearest(pt, taken) {
        var best = -1, bd = Infinity;
        spots.forEach(function (q, i) { if (taken[i]) return; var dd = Math.hypot(q[0] - pt[0], q[1] - pt[1]); if (dd < bd) { bd = dd; best = i; } });
        return best;
      }
      var gone = {}, fresh = {};
      ((o.lpSkip && o.lpSkip[a.id]) || []).forEach(function (pt) { var i = nearest(pt, gone); if (i >= 0) gone[i] = 1; });
      ((o.lpMark && o.lpMark[a.id]) || []).forEach(function (pt) { var i = nearest(pt, fresh); if (i >= 0) fresh[i] = 1; });
      spots.forEach(function (q, i) {
        geo.lp[a.id].push(q);
        if (gone[i]) return;
        var nx = -q[2][1], ny = q[2][0], rr = fresh[i] ? 2.1 * (o.pop || 1) : 2.1;
        var gp = el('g', { class: 'm-lp' + (fresh[i] ? ' new' : '') }, gl);
        el('circle', { cx: f1(q[0] + nx * 3.4), cy: f1(q[1] + ny * 3.4), r: f1(rr), class: 'm-lp-dot' }, gp);
        el('circle', { cx: f1(q[0] - nx * 3.4), cy: f1(q[1] - ny * 3.4), r: f1(rr), class: 'm-lp-dot' }, gp);
        grow(q[0], q[1], 5);
      });
    });

    /* formal charges, then partial charges, where nothing else is */
    function freeSpot(id, r0) {
      var p = P[id], lab = labels[id];
      var busy = usedDirs(id);
      (geo.lp[id] || []).forEach(function (q) { busy.push(Math.atan2(q[2][1], q[2][0])); });
      var cand = [-45, -135, 45, 135, -90, 0, 180, 90].map(function (d) { return d * RAD; });
      /* never across the letters of a longer label (HO, H₃C) */
      if (lab && lab.text.length > Chem.atom(st, id).el.length) {
        var side = lab.at > 0 ? -1 : 1;
        cand = cand.filter(function (c) { return Math.cos(c) * side < 0.3; });
      }
      var best = cand[0], bd = -1;
      cand.forEach(function (c) {
        var d = busy.length ? Math.min.apply(null, busy.map(function (u) { return angDist(c, u); })) : 9;
        if (d > bd + 0.01) { bd = d; best = c; }
      });
      var r = r0 || (lab ? 0.62 * sc : 0.42 * sc);
      var x = p[0] + Math.cos(best) * r, y = p[1] + Math.sin(best) * r;
      if (lab) {
        var L = geo.labels[id];
        if (Math.cos(best) > 0.3) x = Math.max(x, L.x1 + 7);
        if (Math.cos(best) < -0.3) x = Math.min(x, L.x0 - 7);
      }
      return [x, y];
    }
    (o.charges || []).forEach(function (q) {
      if (!q.c) return;
      var at = freeSpot(q.id);
      var gq = el('g', { class: 'm-charge-g' + (q.fresh ? ' new' : '') }, gl);
      el('circle', { cx: f1(at[0]), cy: f1(at[1]), r: f1(6.2 * (q.fresh ? (o.pop || 1) : 1)), class: 'm-charge-ring' }, gq);
      el('text', { x: f1(at[0]), y: f1(at[1] + 4), class: 'm-charge', 'text-anchor': 'middle' }, gq, q.c > 0 ? '+' : '−');
      geo.charge[q.id] = at;
      grow(at[0], at[1], 7);
    });
    Object.keys(o.partial || {}).forEach(function (id) {
      var at = freeSpot(id, (labels[id] ? 0.7 : 0.5) * sc);
      el('text', { x: f1(at[0]), y: f1(at[1] + 5), class: 'm-partial ' + (o.partial[id] === '+' ? 'pos' : 'neg'), 'text-anchor': 'middle' }, gl,
        'δ' + (o.partial[id] === '+' ? '+' : '−'));
      grow(at[0], at[1], 10);
    });
    return geo;
  }

  /* Which side of A=B its second line goes: toward the middle of a ring
     the bond is in, else toward its neighbours; 0 when there are none. */
  function doubleSide(st, P, a, b) {
    var A = P[a], B = P[b];
    function sideOf(x, y) { return Math.sign((B[0] - A[0]) * (y - A[1]) - (B[1] - A[1]) * (x - A[0])); }
    var ring = ringCentre(st, P, a, b);
    if (ring) return sideOf(ring[0], ring[1]) || 1;
    var s = 0, n = 0;
    [a, b].forEach(function (x) {
      Chem.neighbours(st, x).forEach(function (y) {
        if (y.id === a || y.id === b) return;
        s += sideOf(P[y.id][0], P[y.id][1]); n++;
      });
    });
    if (!n) return 0;
    return s >= 0 ? 1 : -1;
  }
  /* the centre of a 5- or 6-membered ring through a-b, if there is one */
  function ringCentre(st, P, a, b) {
    var found = null;
    (function walk(path) {
      if (found || path.length > 5) return;
      var last = path[path.length - 1];
      Chem.neighbours(st, last).forEach(function (n) {
        if (found) return;
        if (n.id === a) { if (path.length >= 4) found = path.slice(); return; }
        if (path.indexOf(n.id) >= 0) return;
        walk(path.concat([n.id]));
      });
    })([b]);
    if (!found) return null;
    var pts = found.concat([a]), x = 0, y = 0;
    pts.forEach(function (id) { x += P[id][0]; y += P[id][1]; });
    return [x / pts.length, y / pts.length];
  }

  /* The bond lines of a state, for paint(). */
  function bondLines(st, P, mods) {
    var out = [];
    st.bonds.forEach(function (b) {
      var side = b.o === 2 ? doubleSide(st, P, b.a, b.b) : null;
      for (var k = 1; k <= b.o; k++) {
        var line = { a: b.a, b: b.b, k: k, n: b.o, side: side, centred: b.o === 2 && side === 0 };
        if (mods) mods(line);
        out.push(line);
      }
    });
    return out;
  }

  /* -------------------------------------------------- curved arrows */

  function unit(v) { var l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }

  function centreOf(geo, ids) {
    var x = 0, y = 0, n = 0;
    (ids || Object.keys(geo.P)).forEach(function (i) { x += geo.P[i][0]; y += geo.P[i][1]; n++; });
    return [x / n, y / n];
  }

  /* Where an arrow key sits on the drawing. */
  function pointOf(geo, key, toward) {
    var k = Chem.keys.parse(key);
    if (k.kind === 'lp') {
      var list = geo.lp[k.a];
      if (!list || !list.length) return geo.P[k.a].slice();
      if (!toward) return [list[0][0], list[0][1]];
      var best = list[0], bd = Infinity;
      list.forEach(function (q) { var d = Math.hypot(q[0] - toward[0], q[1] - toward[1]); if (d < bd) { bd = d; best = q; } });
      return [best[0], best[1]];
    }
    if (k.kind === 'bond') {
      var a = geo.P[k.a], b = geo.P[k.b];
      return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    }
    return geo.P[k.a].slice();
  }

  function headOf(H, C) {
    var tx = H[0] - C[0], ty = H[1] - C[1], tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    var hs = 9, hw = 4.6;
    return [[H[0] + tx * 2, H[1] + ty * 2], [H[0] - tx * hs - ty * hw, H[1] - ty * hs + tx * hw], [H[0] - tx * hs + ty * hw, H[1] - ty * hs - tx * hw]]
      .map(function (q) { return f1(q[0]) + ',' + f1(q[1]); }).join(' ');
  }

  /* An arrow from key f to key t on a drawing: { T, C, H (the quadratic
     curve), d, head } */
  function arrowPath(geo, st, f, t) {
    var F = Chem.keys.parse(f), Tk = Chem.keys.parse(t);
    var centre = centreOf(geo);
    function out(T, C, H) {
      return { T: T, C: C, H: H, d: 'M' + f1(T[0]) + ' ' + f1(T[1]) + ' Q' + f1(C[0]) + ' ' + f1(C[1]) + ' ' + f1(H[0]) + ' ' + f1(H[1]), head: headOf(H, C) };
    }
    function pieceCentre(id) {
      var pc = Chem.pieces(st).filter(function (p) { return p.indexOf(id) >= 0; })[0];
      return centreOf(geo, pc);
    }
    /* a bond's pair onto one of its own atoms: a short hook over the bond */
    if (F.kind === 'bond' && Tk.kind === 'atom' && (Tk.a === F.a || Tk.a === F.b)) {
      var X = Tk.a, A = X === F.a ? F.b : F.a;
      var PX = geo.P[X], PA = geo.P[A];
      var u = unit([PX[0] - PA[0], PX[1] - PA[1]]), n = [-u[1], u[0]];
      var sc0 = pieceCentre(X), mid = [(PX[0] + PA[0]) / 2, (PX[1] + PA[1]) / 2];
      if ((mid[0] - sc0[0]) * n[0] + (mid[1] - sc0[1]) * n[1] < 0) n = [-n[0], -n[1]];
      var T1 = [mid[0] + n[0] * 5, mid[1] + n[1] * 5];
      var H1 = [PX[0] + n[0] * 13 - u[0] * 2, PX[1] + n[1] * 13 - u[1] * 2];
      var C1 = [(T1[0] + H1[0]) / 2 + n[0] * 16 + u[0] * 2, (T1[1] + H1[1]) / 2 + n[1] * 16 + u[1] * 2];
      return out(T1, C1, H1);
    }
    /* a lone pair into the bond to its own atom (a new pi bond) */
    if (F.kind === 'lp' && Tk.kind === 'bond' && (Tk.a === F.a || Tk.b === F.a)) {
      var O = F.a, Cc = Tk.a === O ? Tk.b : Tk.a;
      var PO = geo.P[O], PC = geo.P[Cc];
      var Tl = pointOf(geo, f, PC);
      var M = [(PO[0] + PC[0]) / 2, (PO[1] + PC[1]) / 2];
      var v = unit([PC[0] - PO[0], PC[1] - PO[1]]), nn = [-v[1], v[0]];
      if ((Tl[0] - PO[0]) * nn[0] + (Tl[1] - PO[1]) * nn[1] < 0) nn = [-nn[0], -nn[1]];
      var H2 = [M[0] + nn[0] * 4, M[1] + nn[1] * 4];
      var C2 = [(Tl[0] + H2[0]) / 2 + nn[0] * 16, (Tl[1] + H2[1]) / 2 + nn[1] * 16];
      return out(Tl, C2, H2);
    }
    /* a bond's pair moving over to the next bond */
    if (F.kind === 'bond' && Tk.kind === 'bond') {
      var shared = [F.a, F.b].filter(function (x) { return x === Tk.a || x === Tk.b; })[0];
      if (shared != null) {
        var S0 = geo.P[shared];
        var e1 = geo.P[F.a === shared ? F.b : F.a], e2 = geo.P[Tk.a === shared ? Tk.b : Tk.a];
        var inside = unit([(e1[0] - S0[0]) + (e2[0] - S0[0]), (e1[1] - S0[1]) + (e2[1] - S0[1])]);
        var o2 = [-inside[0], -inside[1]];
        var m1 = [(e1[0] + S0[0]) / 2, (e1[1] + S0[1]) / 2], m2 = [(e2[0] + S0[0]) / 2, (e2[1] + S0[1]) / 2];
        var T3 = [m1[0] + o2[0] * 3, m1[1] + o2[1] * 3], H3 = [m2[0] + o2[0] * 5, m2[1] + o2[1] * 5];
        var C3 = [(T3[0] + H3[0]) / 2 + o2[0] * 20, (T3[1] + H3[1]) / 2 + o2[1] * 20];
        return out(T3, C3, H3);
      }
    }
    var headAt = pointOf(geo, t);
    var T = pointOf(geo, f, headAt);
    var H = headAt.slice();
    var dx = H[0] - T[0], dy = H[1] - T[1], L = Math.hypot(dx, dy) || 1;
    var stopAt = Tk.kind === 'atom' ? (geo.labels[Tk.a] ? 12 : 8) : 4;
    H = [H[0] - dx / L * stopAt, H[1] - dy / L * stopAt];
    var startAt = F.kind === 'lp' ? 5 : 2;
    T = [T[0] + dx / L * startAt, T[1] + dy / L * startAt];
    dx = H[0] - T[0]; dy = H[1] - T[1]; L = Math.hypot(dx, dy) || 1;
    var nx = -dy / L, ny = dx / L;
    var mid2 = [(T[0] + H[0]) / 2, (T[1] + H[1]) / 2];
    var side = ((mid2[0] + nx - centre[0]) * nx + (mid2[1] + ny - centre[1]) * ny) > 0 ? 1 : -1;
    if (F.kind === 'lp') {
      var tail = pointOf(geo, f, headAt);
      (geo.lp[F.a] || []).forEach(function (q) {
        if (Math.abs(q[0] - tail[0]) < 0.5 && Math.abs(q[1] - tail[1]) < 0.5) side = (q[2][0] * nx + q[2][1] * ny) > 0 ? 1 : -1;
      });
    }
    var bulge = Math.max(16, Math.min(46, 0.42 * L));
    var C = [mid2[0] + nx * bulge * side, mid2[1] + ny * bulge * side];
    return out(T, C, H);
  }

  function bez(A, p) {
    var u = 1 - p;
    return [u * u * A.T[0] + 2 * u * p * A.C[0] + p * p * A.H[0], u * u * A.T[1] + 2 * u * p * A.C[1] + p * p * A.H[1]];
  }

  function drawArrow(g, A, cls) {
    var gg = el('g', { class: 'arw-g ' + (cls || '') }, g);
    el('path', { d: A.d, class: 'arw' }, gg);
    el('polygon', { points: A.head, class: 'arw-head' }, gg);
    return gg;
  }

  /* ------------------------------------------------------ a whole drawing */

  function svg(cls, label) {
    var s = el('svg', { class: 'mol ' + (cls || ''), role: 'img' });
    if (label) s.setAttribute('aria-label', label);
    return s;
  }
  function fit(s, box, pad) {
    pad = pad == null ? 12 : pad;
    var x0 = box[0] - pad, y0 = box[1] - pad, w = box[2] - box[0] + 2 * pad, h = box[3] - box[1] + 2 * pad;
    s.setAttribute('viewBox', [x0, y0, w, h].map(f1).join(' '));
    s.setAttribute('width', Math.round(w));
    s.setAttribute('height', Math.round(h));
  }
  function charges(st) { return st.atoms.map(function (a) { return { id: a.id, c: Chem.charge(st, a.id) }; }); }

  /* A state on its own. o: scale, arrows [{ from, to }], hot, partial,
     label, cls, pad, g (draw into this group instead). Returns the svg
     (with _geo) or, with o.g, the geo. */
  function draw(st, o) {
    o = o || {};
    var sc = o.scale || S;
    var root = o.g || svg(o.cls, o.label || '');
    var g = el('g', { class: 'm-g' }, root);
    var P = screen(st, sc);
    var geo = paint(st, g, { sc: sc, P: P, bonds: bondLines(st, P), charges: charges(st), hot: o.hot, partial: o.partial });
    geo.st = st;
    if (o.arrows && o.arrows.length) {
      var ga = el('g', { class: 'arrows' }, g);
      o.arrows.forEach(function (a) {
        var A = arrowPath(geo, st, a.from, a.to);
        drawArrow(ga, A, a.cls);
        [A.T, A.C, A.H].forEach(function (q) { geo.box[0] = Math.min(geo.box[0], q[0] - 4); geo.box[1] = Math.min(geo.box[1], q[1] - 4); geo.box[2] = Math.max(geo.box[2], q[0] + 4); geo.box[3] = Math.max(geo.box[3], q[1] + 4); });
      });
    }
    if (o.g) return geo;
    fit(root, geo.box, o.pad);
    root._geo = geo;
    return root;
  }

  /* --------------------------------------------------------- animation */

  /* One step, played. sc: a scene (before, after, arrows, picks).
     o: scale, label, ts (Klein's transition-state brackets just before the
     electrons land), arrows/picks/after (to play a student's own arrows).
     Returns { node (svg), set(p), p() }.

     The step is played in beats, each a clean cut, with nothing fading:
       0 to TAKEOFF     the drawing and its arrows, still
       TAKEOFF to LAND  each pair of electrons rides its arrow; a bond that is
                        breaking is dashed, a bond being made is drawn out,
                        dashed, from the atom the electrons come from
       LAND             the electrons arrive: the new bonds and lone pairs are
                        there (in the arrow colour), the old ones are gone, the
                        charges have changed, and the arrows are no longer needed
       GLIDE to SETTLE  the atoms move to where the product is drawn
     Before LAND the drawing is laid out as the reactants, afterwards as the
     products, so lone pairs and charges never hop about on the way. */
  var TAKEOFF = 0.08, LAND = 0.54, GLIDE = 0.62, SETTLE = 0.94;

  function easeOut(t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3); }

  /* the first part (0 to u) of an arrow's curve, as a path */
  function partPath(A, u) {
    var c = [lerp(A.T[0], A.C[0], u), lerp(A.T[1], A.C[1], u)], e = bez(A, u);
    return 'M' + f1(A.T[0]) + ' ' + f1(A.T[1]) + ' Q' + f1(c[0]) + ' ' + f1(c[1]) + ' ' + f1(e[0]) + ' ' + f1(e[1]);
  }

  function Player(sc, o) {
    o = o || {};
    var scale = o.scale || S;
    var before = sc.before, after = o.after || sc.after, arrows = o.arrows || sc.arrows, picks = o.picks || sc.picks || [];
    var root = svg('mol player ' + (o.cls || ''), o.label || (sc.title || 'Mechanism') + ': animation');
    var P0 = screen(before, scale), P1 = screen(after, scale);
    /* the arrows, and the room the whole step needs, from the first and last frames */
    var probe = el('g', {}, root);
    var geo0 = paint(before, probe, { sc: scale, P: P0, bonds: bondLines(before, P0), charges: charges(before) });
    root.removeChild(probe);
    var paths = arrows.map(function (a) { return arrowPath(geo0, before, a.from, a.to); });
    var probe1 = el('g', {}, root);
    var geo1 = paint(after, probe1, { sc: scale, P: P1, bonds: bondLines(after, P1), charges: charges(after) });
    root.removeChild(probe1);
    var box = [Math.min(geo0.box[0], geo1.box[0]), Math.min(geo0.box[1], geo1.box[1]), Math.max(geo0.box[2], geo1.box[2]), Math.max(geo0.box[3], geo1.box[3])];
    paths.forEach(function (A) { [A.T, A.C, A.H].forEach(function (q) { box[0] = Math.min(box[0], q[0] - 6); box[1] = Math.min(box[1], q[1] - 6); box[2] = Math.max(box[2], q[0] + 6); box[3] = Math.max(box[3], q[1] + 6); }); });
    if (o.ts) { box[0] -= 16; box[2] += 22; box[1] -= 8; box[3] += 8; }
    fit(root, box, o.pad != null ? o.pad : 10);

    /* what each bond does: stays, breaks or is made; and which atom a new one is drawn from */
    var pairs = {};
    before.bonds.forEach(function (b) { pairs[Chem.keys.pair(b.a, b.b)] = { a: b.a, b: b.b, o0: b.o, o1: 0 }; });
    after.bonds.forEach(function (b) {
      var k = Chem.keys.pair(b.a, b.b);
      if (pairs[k]) pairs[k].o1 = b.o;
      else pairs[k] = { a: b.a, b: b.b, o0: 0, o1: b.o };
    });
    var lpSkip = {}, lpLand = {};
    picks.forEach(function (m, i) {
      var A = paths[i];
      if (!A) return;
      if (m.src.lp != null) (lpSkip[m.src.lp] = lpSkip[m.src.lp] || []).push(A.T);
      if (m.dst.lp != null) (lpLand[m.dst.lp] = lpLand[m.dst.lp] || []).push([A.H[0] - P0[m.dst.lp][0], A.H[1] - P0[m.dst.lp][1]]);
      if (m.dst.bond) {
        var src = m.src.lp != null ? [m.src.lp] : m.src.bond;
        var x = pairs[Chem.keys.pair(m.dst.bond[0], m.dst.bond[1])];
        if (x) x.from = src.indexOf(m.dst.bond[0]) >= 0 ? m.dst.bond[0] : src.indexOf(m.dst.bond[1]) >= 0 ? m.dst.bond[1] : m.dst.bond[0];
      }
    });
    var changed = {};
    before.atoms.forEach(function (a) { if (Chem.charge(before, a.id) !== Chem.charge(after, a.id)) changed[a.id] = 1; });
    var newBond = {};
    Object.keys(pairs).forEach(function (k) { if (pairs[k].o1 > pairs[k].o0) newBond[k] = pairs[k].o0; });
    var cur = 0;
    var g = el('g', { class: 'm-g' }, root);

    function frame(p) {
      cur = p;
      g.innerHTML = '';
      var geo;
      if (p < LAND) {
        /* the reactants, with the electrons on their way */
        var u = seg(p, TAKEOFF, LAND), off = p > TAKEOFF;
        var lines = [];
        Object.keys(pairs).forEach(function (k) {
          var x = pairs[k], n = Math.max(x.o0, x.o1);
          var side = n === 2 ? doubleSide(x.o0 === 2 ? before : after, P0, x.a, x.b) : null;
          for (var q = 1; q <= n; q++) {
            var in0 = q <= x.o0, in1 = q <= x.o1;
            var line = { a: x.a, b: x.b, k: q, n: n, side: side, centred: n === 2 && side === 0 };
            if (in0 && !in1) { if (off) { line.dash = true; line.cls = 'breaking'; } }
            else if (!in0 && in1) { if (!off) continue; line.dash = true; line.cls = 'forming'; line.grow = u; line.from = x.from || x.a; }
            lines.push(line);
          }
        });
        var partial = null;
        if (o.ts && p > LAND - 0.16) { partial = {}; (o.ts.partial || []).forEach(function (id) { partial[id] = '-'; }); }
        /* in the transition state the charge is shared: δ− on both ends, no full charge on either */
        var chA = charges(before).filter(function (c) { return !(partial && partial[c.id]); });
        geo = paint(before, g, { sc: scale, P: P0, bonds: lines, charges: chA, lpSkip: off ? lpSkip : null, hot: o.hot, partial: partial });
        var ga = el('g', { class: 'arrows' }, g);
        paths.forEach(function (A) { drawArrow(ga, A); });
        if (off) {
          /* the pairs riding the arrows, each with the path it has covered behind it */
          var ge = el('g', { class: 'e-pairs' }, g);
          paths.forEach(function (A) {
            el('path', { d: partPath(A, u), class: 'e-trail' }, ge);
            var q = bez(A, u), q2 = bez(A, Math.min(1, u + 0.02)), q0 = bez(A, Math.max(0, u - 0.02));
            var t = unit([q2[0] - q0[0], q2[1] - q0[1]]), nn = [-t[1], t[0]];
            el('circle', { cx: f1(q[0] + nn[0] * 3.6), cy: f1(q[1] + nn[1] * 3.6), r: 3, class: 'e-dot' }, ge);
            el('circle', { cx: f1(q[0] - nn[0] * 3.6), cy: f1(q[1] - nn[1] * 3.6), r: 3, class: 'e-dot' }, ge);
          });
        }
        if (o.ts && p > LAND - 0.16) {
          /* Klein's transition state: both bonds partial, in brackets */
          var gt = el('g', { class: 'ts-bracket' }, g);
          var x0 = box[0] - 6, x1 = box[2] + 4, y0 = box[1], y1 = box[3];
          el('path', { d: 'M' + f1(x0 + 8) + ' ' + f1(y0) + ' H' + f1(x0) + ' V' + f1(y1) + ' H' + f1(x0 + 8), class: 'ts-line' }, gt);
          el('path', { d: 'M' + f1(x1 - 8) + ' ' + f1(y0) + ' H' + f1(x1) + ' V' + f1(y1) + ' H' + f1(x1 - 8), class: 'ts-line' }, gt);
          el('text', { x: f1(x1 + 4), y: f1(y0 + 12), class: 'ts-mark' }, gt, '‡');
        }
        return geo;
      }
      /* the products: what is new stays in the arrow colour until the atoms have settled */
      var s = easeOut((p - GLIDE) / (SETTLE - GLIDE));
      var P = {};
      before.atoms.forEach(function (a) { P[a.id] = [lerp(P0[a.id][0], P1[a.id][0], s), lerp(P0[a.id][1], P1[a.id][1], s)]; });
      var fresh = p < SETTLE + 0.03;
      var pop = 1 + 0.3 * (1 - seg(p, LAND, LAND + 0.07));
      var lpMark = null;
      if (fresh) {
        lpMark = {};
        Object.keys(lpLand).forEach(function (id) { lpMark[id] = lpLand[id].map(function (d) { return [P[id][0] + d[0], P[id][1] + d[1]]; }); });
      }
      var linesB = bondLines(after, P1, function (line) {
        var nb = newBond[Chem.keys.pair(line.a, line.b)];
        if (fresh && nb != null && line.k > nb) line.cls = 'new';
      });
      geo = paint(after, g, { sc: scale, P: P, layoutP: P1, bonds: linesB, lpMark: lpMark, pop: pop, hot: o.hot,
        charges: charges(after).map(function (c) { return { id: c.id, c: c.c, fresh: fresh && !!changed[c.id] }; }) });
      /* a ring where each pair landed, for a moment */
      if (p < LAND + 0.09) {
        var w = seg(p, LAND, LAND + 0.09);
        var gf = el('g', { class: 'e-land' }, g);
        paths.forEach(function (A) { el('circle', { cx: f1(A.H[0]), cy: f1(A.H[1]), r: f1(4 + 12 * w), class: 'e-ring', 'stroke-width': f1(3 * (1 - w) + 0.5) }, gf); });
      }
      return geo;
    }
    frame(o.p || 0);
    return { node: root, set: frame, p: function () { return cur; }, box: box, paths: paths, geo0: geo0 };
  }

  /* Several steps in a row (a chain): p from 0 to 1 runs every step. */
  function ChainPlayer(list, o) {
    o = o || {};
    var n = list.length;
    var host = document.createElement('div');
    host.className = 'chain-player';
    var players = list.map(function (sc) { return Player(sc, Object.assign({}, o, { label: sc.title })); });
    /* one viewBox for every step, so the picture does not jump */
    var box = players.reduce(function (b, pl) { return [Math.min(b[0], pl.box[0]), Math.min(b[1], pl.box[1]), Math.max(b[2], pl.box[2]), Math.max(b[3], pl.box[3])]; },
      [Infinity, Infinity, -Infinity, -Infinity]);
    players.forEach(function (pl) { fit(pl.node, box, 10); });
    var shown = -1, cur = 0;
    function set(p) {
      cur = p;
      var k = Math.min(n - 1, Math.floor(p * n + 1e-9));
      var q = p * n - k;
      if (p >= 1) { k = n - 1; q = 1; }
      if (k !== shown) { host.innerHTML = ''; host.appendChild(players[k].node); shown = k; }
      players[k].set(q);
      return k;
    }
    set(o.p || 0);
    return { node: host, set: set, p: function () { return cur; }, n: n };
  }

  return { S: S, el: el, svg: svg, fit: fit, draw: draw, paint: paint, bondLines: bondLines, screen: screen, charges: charges,
           arrowPath: arrowPath, drawArrow: drawArrow, pointOf: pointOf, Player: Player, ChainPlayer: ChainPlayer, smooth: smooth, seg: seg,
           BEATS: { TAKEOFF: TAKEOFF, LAND: LAND, GLIDE: GLIDE, SETTLE: SETTLE } };
})();

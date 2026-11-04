/* play.js: one step of a mechanism, played, as in the arrow-pushing activity.
 *
 * p = 0 is the scene (mech.js) with its curved arrows, p = 1 the products.
 * The electron pairs ride the arrows, the bonds that break fade (dashed
 * while they go), new bonds grow, atoms glide to their places in the
 * products' bond-line drawings and the charges move. A concerted step shows
 * Klein's transition-state brackets, with δ− where the charge is spread.
 *
 * The products are what the arrows make: each arrow moves one pair in the
 * graph (a lone pair into a new bond, a bond onto one of its atoms, a bond
 * over to the next bond, a group moving with its pair), and the formal
 * charges follow. Stereochemistry the arrows cannot say (inversion, E or Z)
 * comes from react.js through the scene's `stereo`. Each product is laid
 * out by layout.js and turned to sit where its atoms were.
 *
 * Nothing moves on its own: the caller sets p (a slider, Play).
 */

var Play = (function () {
  'use strict';

  var S = Draw.S;
  var RAD = Math.PI / 180;

  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function seg(p, a, b) { return smooth((p - a) / (b - a)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function f1(v) { return (+v).toFixed(1); }
  function pk(a, b) { return Math.min(a, b) + '-' + Math.max(a, b); }

  /* ------------------------------------------------------------ graph */

  /* Every species of the scene in one graph; idx(s, i) is atom i of
     species s in it. */
  function union(scene) {
    var g = new Mol.M(), off = [];
    scene.species.forEach(function (sp, s) {
      var o = g.atoms.length;
      off.push(o);
      sp.mol.atoms.forEach(function (a) {
        g.add(a.el, { h: a.h, charge: a.charge, s: s });
        var u = g.atoms[g.atoms.length - 1];
        if (a.parity) u.parity = { nb: a.parity.nb.map(function (j) { return j < 0 ? j : j + o; }), sign: a.parity.sign };
      });
      sp.mol.bonds.forEach(function (b) {
        var k = g.bond(b.a + o, b.b + o, b.order);
        if (b.cfg) g.bonds[k].cfg = { na: b.cfg.na + o, nb: b.cfg.nb + o, rel: b.cfg.rel };
      });
    });
    return { g: g, idx: function (s, i) { return off[s] + i; }, off: off };
  }

  function parseKey(key, idx) {
    var p = key.split(':'), s = +p[1];
    if (p[0] === 'bond') { var ij = p[2].split('-').map(Number); return { kind: 'bond', a: idx(s, ij[0]), b: idx(s, ij[1]) }; }
    return { kind: p[0], a: idx(s, +p[2]) };
  }

  function addBond(g, a, b, d) {
    var k = g.bondBetween(a, b);
    if (k < 0) { if (d > 0) g.bond(a, b, d); return; }
    g.bonds[k].order += d;
    if (g.bonds[k].order <= 0) g.bonds.splice(k, 1);
  }

  /* The graph after the arrows. Returns { g, moved: { atom: 1 } (atoms
     that lost or gained a bond), src: { atom: lone pairs used } }. */
  function apply(before, arrows, idx) {
    var g = before.clone();
    var lost = {}, gained = {}, src = {};
    arrows.forEach(function (ar) {
      var F = parseKey(ar.from, idx), T = parseKey(ar.to, idx);
      if (F.kind === 'lp' && T.kind === 'atom') {
        /* a lone pair becomes a bond */
        addBond(g, F.a, T.a, 1);
        g.atoms[F.a].charge += 1; g.atoms[T.a].charge -= 1;
        src[F.a] = (src[F.a] || 0) + 1;
        gained[F.a] = gained[T.a] = 1;
      } else if (F.kind === 'bond' && T.kind === 'atom' && (T.a === F.a || T.a === F.b)) {
        /* a bond's pair onto one of its own atoms: the bond breaks */
        var other = T.a === F.a ? F.b : F.a;
        addBond(g, F.a, F.b, -1);
        g.atoms[other].charge += 1; g.atoms[T.a].charge -= 1;
        lost[other] = lost[T.a] = 1;
      } else if (F.kind === 'bond' && T.kind === 'atom') {
        /* a 1,2-shift: the group not next to the target moves with its pair */
        var adj = g.bondBetween(F.a, T.a) >= 0;
        var stay = adj ? F.a : F.b, go = adj ? F.b : F.a;
        addBond(g, stay, go, -1);
        addBond(g, go, T.a, 1);
        g.atoms[stay].charge += 1; g.atoms[T.a].charge -= 1;
        lost[stay] = 1; gained[T.a] = 1;
      } else if (F.kind === 'bond' && T.kind === 'bond') {
        /* a bond's pair over to the next bond: the end it leaves loses an
           electron, the far end of the new bond gains one */
        var shared = [F.a, F.b].filter(function (x) { return x === T.a || x === T.b; })[0];
        var leave = F.a === shared ? F.b : F.a, far = T.a === shared ? T.b : T.a;
        addBond(g, F.a, F.b, -1);
        addBond(g, T.a, T.b, 1);
        g.atoms[leave].charge += 1; g.atoms[far].charge -= 1;
        lost[leave] = 1; gained[far] = 1; lost[shared] = 1;
      }
    });
    /* an atom whose neighbours changed has lost its configuration; the
       scene's own stereo() puts back what the mechanism decides */
    Object.keys(lost).concat(Object.keys(gained)).forEach(function (k) { g.atoms[+k].parity = null; });
    g.bonds.forEach(function (b) {
      if (b.cfg && (lost[b.a] || lost[b.b] || gained[b.a] || gained[b.b])) b.cfg = null;
    });
    return { g: g, src: src };
  }

  /* Connected pieces of a graph: lists of atom indices. */
  function pieces(g) {
    var seen = {}, out = [];
    g.atoms.forEach(function (a, i) {
      if (seen[i]) return;
      var list = [], stack = [i];
      seen[i] = 1;
      while (stack.length) {
        var x = stack.pop();
        list.push(x);
        g.nb(x).forEach(function (y) { if (!seen[y.j]) { seen[y.j] = 1; stack.push(y.j); } });
      }
      out.push(list.sort(function (p, q) { return p - q; }));
    });
    return out;
  }

  /* One piece as a molecule of its own; back[k] is its atom k in g. */
  function sub(g, list) {
    var m = new Mol.M(), at = {};
    list.forEach(function (u, k) {
      at[u] = k;
      var a = g.atoms[u];
      m.add(a.el, { h: a.h, charge: a.charge });
    });
    list.forEach(function (u, k) {
      var p = g.atoms[u].parity;
      if (p && p.nb.every(function (j) { return j < 0 || at[j] != null; })) m.atoms[k].parity = { nb: p.nb.map(function (j) { return j < 0 ? j : at[j]; }), sign: p.sign };
    });
    g.bonds.forEach(function (b) {
      if (at[b.a] == null) return;
      var k = m.bond(at[b.a], at[b.b], b.order);
      if (b.cfg && at[b.cfg.na] != null && at[b.cfg.nb] != null) m.bonds[k].cfg = { na: at[b.cfg.na], nb: at[b.cfg.nb], rel: b.cfg.rel };
    });
    return { mol: m, back: list, at: at };
  }

  /* ----------------------------------------------------------- fitting */

  /* The rigid motion (with a mirror, which a drawing may use: wedges and
     dashes swap) that puts the points A nearest the points B. */
  function procrustes(A, B, W) {
    var keys = Object.keys(A).filter(function (k) { return B[k] && W[k] > 0; });
    if (!keys.length) return null;
    function solve(mirror) {
      var sw = 0, ax = 0, ay = 0, bx = 0, by = 0;
      keys.forEach(function (k) {
        var w = W[k], y = mirror ? -A[k][1] : A[k][1];
        sw += w; ax += w * A[k][0]; ay += w * y; bx += w * B[k][0]; by += w * B[k][1];
      });
      ax /= sw; ay /= sw; bx /= sw; by /= sw;
      var sxx = 0, sxy = 0;
      keys.forEach(function (k) {
        var w = W[k], X = A[k][0] - ax, Y = (mirror ? -A[k][1] : A[k][1]) - ay, U = B[k][0] - bx, V = B[k][1] - by;
        sxx += w * (X * U + Y * V); sxy += w * (X * V - Y * U);
      });
      var th = Math.atan2(sxy, sxx), c = Math.cos(th), s = Math.sin(th);
      function map(q) { var X = q[0] - ax, Y = (mirror ? -q[1] : q[1]) - ay; return [bx + c * X - s * Y, by + s * X + c * Y]; }
      return { map: map, mirror: mirror, err: err(map, keys, A, B, W) };
    }
    var r0 = solve(false), r1 = solve(true);
    return r1.err < r0.err - 1e-6 ? r1 : r0;
  }
  function err(map, keys, A, B, W) {
    var e = 0;
    keys.forEach(function (k) { var q = map(A[k]); e += W[k] * (Math.pow(q[0] - B[k][0], 2) + Math.pow(q[1] - B[k][1], 2)); });
    return e;
  }

  /* Turned so that atom a to atom b points along `ang` (radians, screen),
     with a where it was; mirrored across that line if that fits better. */
  function anchored(A, B, W, a, b, ang) {
    var cur = Math.atan2(A[b][1] - A[a][1], A[b][0] - A[a][0]);
    var rot = ang - cur, c = Math.cos(rot), s = Math.sin(rot);
    var c2 = Math.cos(2 * ang), s2 = Math.sin(2 * ang);
    var keys = Object.keys(A).filter(function (k) { return B[k] && W[k] > 0; });
    function make(mirror) {
      function map(q) {
        var X = q[0] - A[a][0], Y = q[1] - A[a][1];
        var x = X * c - Y * s, y = X * s + Y * c;
        if (mirror) { var x2 = c2 * x + s2 * y, y2 = s2 * x - c2 * y; x = x2; y = y2; }
        return [B[a][0] + x, B[a][1] + y];
      }
      return { map: map, mirror: mirror, err: err(map, keys, A, B, W) };
    }
    var r0 = make(false), r1 = make(true);
    return r1.err < r0.err - 1e-6 ? r1 : r0;
  }

  function unit(v) { var l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }

  /* ----------------------------------------------------------- outcome */

  /* What a scene's arrows make, without drawing anything (tools/validate.js
     checks it against react.js): { g0, g1, idx, src, pieces: [atom lists],
     main (the largest piece), products: [molecules, H folded back in] }. */
  function outcome(scene, arrows) {
    arrows = arrows && arrows.length ? arrows : scene.arrows.map(function (a) { return { from: a.from[0], to: a.to[0] }; });
    var U0 = union(scene), idx = U0.idx, g0 = U0.g;
    var res = apply(g0, arrows, idx), g1 = res.g;
    if (scene.stereo) scene.stereo(g1, idx, g0);
    /* the main product first (the one with the reacting carbon), then by size */
    var key = scene.anchor ? idx(scene.anchor.a[0], scene.anchor.a[1]) : -1;
    var list = pieces(g1).sort(function (p, q) { return (q.indexOf(key) >= 0) - (p.indexOf(key) >= 0) || q.length - p.length; });
    return { g0: g0, g1: g1, idx: idx, src: res.src, arrows: arrows, pieces: list,
             products: list.map(function (pc) { return fold(sub(g1, pc).mol); }) };
  }

  /* A drawn H atom counted on its atom again, as the rest of the activity
     keeps it (for names). */
  function fold(m) {
    var gone = [];
    m.atoms.forEach(function (a, i) {
      if (a.el !== 'H') return;
      var nb = m.nb(i);
      if (nb.length !== 1) return;
      var c = m.atoms[nb[0].j];
      c.h++;
      if (c.parity) c.parity.nb = c.parity.nb.map(function (j) { return j === i ? -1 : j; });
      gone.push(i);
    });
    return gone.length ? m.without(gone) : m;
  }

  /* Problems with a drawing of the products: a wedge or dash that says the
     other configuration, a C=C drawn cis that is trans. P: screen points,
     wedge: { 'a-b': { from, type } }. */
  function drawnProblems(g, P, wedge) {
    var out = [];
    g.atoms.forEach(function (a, c) {
      if (!a.parity || !P[c] || !Mol.isCentre(g, c)) return;
      var V = {}, sum = [0, 0, 0], ok = true;
      g.nb(c).forEach(function (x) {
        if (!P[x.j]) { ok = false; return; }
        var w = wedge[pk(c, x.j)];
        var z = w && w.from === c ? (w.type === 'w' ? 0.9 : -0.9) : 0;
        var d = [P[x.j][0] - P[c][0], -(P[x.j][1] - P[c][1])], l = Math.hypot(d[0], d[1]) || 1;
        V[x.j] = [d[0] / l, d[1] / l, z];
        sum = GEOM.add(sum, GEOM.unit(V[x.j]));
      });
      if (!ok) return;
      V[-1] = GEOM.mul(sum, -1);
      var v = a.parity.nb.map(function (j) { return V[j]; });
      if (v.some(function (q) { return !q; })) return;
      if (!Object.keys(wedge).some(function (k) { return wedge[k].from === c; })) { out.push('no wedge or dash on centre ' + c); return; }
      var det = GEOM.det3(GEOM.sub(v[1], v[0]), GEOM.sub(v[2], v[0]), GEOM.sub(v[3], v[0]));
      if ((det > 0 ? 1 : -1) !== a.parity.sign) out.push('centre ' + c + ' drawn with the wrong configuration');
    });
    g.bonds.forEach(function (b) {
      if (!b.cfg || !P[b.a] || !P[b.b] || !P[b.cfg.na] || !P[b.cfg.nb]) return;
      var A = P[b.a], B = P[b.b];
      function side(q) { return Math.sign((B[0] - A[0]) * (q[1] - A[1]) - (B[1] - A[1]) * (q[0] - A[0])); }
      var rel = side(P[b.cfg.na]) === side(P[b.cfg.nb]) ? 'cis' : 'trans';
      if (rel !== b.cfg.rel) out.push('C=C ' + b.a + '-' + b.b + ' drawn ' + rel + ', is ' + b.cfg.rel);
    });
    return out;
  }

  /* ------------------------------------------------------------ player */

  /* scene: a mech.js scene. o: arrows (the ones drawn, else the scene's),
     badges (number the arrows), label. Returns { node, set(p), p() }. */
  function Player(scene, o) {
    o = o || {};
    var built = Arrows.compose(scene);
    var geos = built.geos;
    var centre = Arrows.centroid(geos);
    var oc = outcome(scene, o.arrows);
    var arrows = oc.arrows, idx = oc.idx, g0 = oc.g0, g1 = oc.g1, res = oc;
    var n = g0.atoms.length;

    /* before: positions, lone pairs shown, wedges, abbreviations */
    var P0 = {}, lpShow = [], abbr0 = {}, wedge0 = {}, ring0 = null;
    scene.species.forEach(function (sp, s) {
      var geo = geos[s];
      Object.keys(geo.P).forEach(function (i) { P0[idx(s, +i)] = geo.P[i].slice(); });
      Object.keys(geo.lp).forEach(function (i) { lpShow.push(idx(s, +i)); });
      Object.keys(geo.L.abbr).forEach(function (i) { abbr0[idx(s, +i)] = geo.L.abbr[i]; });
      Object.keys(geo.L.wedge).forEach(function (k) {
        var b = sp.mol.bonds[k], w = geo.L.wedge[k];
        wedge0[pk(idx(s, b.a), idx(s, b.b))] = { from: idx(s, w.from), type: w.type };
      });
      if (geo.L.ring && !ring0) ring0 = geo.L.ring.map(function (i) { return idx(s, i); });
    });

    /* after: each piece laid out and put where its atoms were */
    var P1 = {}, vis1 = {}, abbr1 = {}, wedge1 = {}, ring1 = null;
    var anchor = scene.anchor ? { a: idx(scene.anchor.a[0], scene.anchor.a[1]), b: idx(scene.anchor.b[0], scene.anchor.b[1]),
      away: scene.anchor.away ? idx(scene.anchor.away[0], scene.anchor.away[1]) : null } : null;
    var mainC = null;
    /* the main product first, so the others can move away from it */
    var list = oc.pieces;
    list.forEach(function (pc) {
      if (pc.length === 1) return;
      var sp = sub(g1, pc);
      var L1 = Layout.layout(sp.mol, { mech: true });
      var A = {}, W = {};
      Object.keys(L1.pos).forEach(function (k) { A[sp.back[+k]] = [L1.pos[k][0] * S, -L1.pos[k][1] * S]; });
      /* who the piece is mostly made of */
      var count = {};
      pc.forEach(function (u) { var s = g0.atoms[u].s; count[s] = (count[s] || 0) + 1; });
      var major = +Object.keys(count).sort(function (p, q) { return count[q] - count[p]; })[0];
      var others = pc.filter(function (u) { return g0.atoms[u].s !== major; });
      var acid = others.length && others.every(function (u) { return g0.atoms[u].el === 'H'; });
      pc.forEach(function (u) { W[u] = acid || g0.atoms[u].s === major ? 1 : 0.15; });
      var fit;
      if (anchor && pc.indexOf(anchor.a) >= 0 && A[anchor.a] && A[anchor.b]) {
        var dir = anchor.away != null
          ? Math.atan2(P0[anchor.a][1] - P0[anchor.away][1], P0[anchor.a][0] - P0[anchor.away][0])
          : Math.atan2(P0[anchor.b][1] - P0[anchor.a][1], P0[anchor.b][0] - P0[anchor.a][0]);
        fit = anchored(A, P0, W, anchor.a, anchor.b, dir);
      } else fit = procrustes(A, P0, W);
      if (!fit) return;
      var moved = {};
      Object.keys(A).forEach(function (u) { moved[u] = fit.map(A[u]); });
      if (acid) {
        /* a base with its new proton backs away from where the H was */
        var hU = others[0], was = g0.nb(hU)[0];
        var d = was ? unit([P0[hU][0] - P0[was.j][0], P0[hU][1] - P0[was.j][1]]) : [0, -1];
        Object.keys(moved).forEach(function (u) { moved[u] = [moved[u][0] + d[0] * 0.55 * S, moved[u][1] + d[1] * 0.55 * S]; });
      }
      Object.keys(moved).forEach(function (u) { P1[u] = moved[u]; vis1[u] = 1; });
      if (mainC == null) {
        var cx = 0, cy = 0, nn = 0;
        Object.keys(moved).forEach(function (u) { cx += moved[u][0]; cy += moved[u][1]; nn++; });
        mainC = [cx / nn, cy / nn];
      }
      Object.keys(L1.abbr).forEach(function (k) { abbr1[sp.back[+k]] = L1.abbr[k]; });
      Object.keys(L1.wedge).forEach(function (k) {
        var b = sp.mol.bonds[k], w = L1.wedge[k];
        var t = fit.mirror ? (w.type === 'w' ? 'd' : 'w') : w.type;
        wedge1[pk(sp.back[b.a], sp.back[b.b])] = { from: sp.back[w.from], type: t };
      });
      if (L1.ring && !ring1) ring1 = L1.ring.map(function (k) { return sp.back[k]; });
    });
    /* a lone ion (the leaving group) moves on, away from what it left */
    list.forEach(function (pc) {
      if (pc.length !== 1) return;
      var u = pc[0];
      if (!P0[u]) return;
      var was = g0.nb(u)[0];
      var d = was ? unit([P0[u][0] - P0[was.j][0], P0[u][1] - P0[was.j][1]]) : [1, 0];
      if (mainC) {
        var e = unit([P0[u][0] - mainC[0], P0[u][1] - mainC[1]]);
        d = unit([d[0] + 0.6 * e[0], d[1] + 0.6 * e[1]]);
      }
      var q = [P0[u][0] + d[0] * 1.05 * S, P0[u][1] + d[1] * 1.05 * S];
      /* and on, until it is clear of everything else */
      for (var t = 0; t < 8 && near(q, u) < 1.25 * S; t++) q = [q[0] + d[0] * 0.3 * S, q[1] + d[1] * 0.3 * S];
      P1[u] = q;
      vis1[u] = 1;
    });
    function near(q, self) {
      var best = Infinity;
      Object.keys(P1).forEach(function (k) { if (+k !== self) best = Math.min(best, Math.hypot(P1[k][0] - q[0], P1[k][1] - q[1])); });
      return best;
    }
    /* an atom drawn on one side only keeps the other side's place */
    for (var u = 0; u < n; u++) {
      if (!P0[u] && P1[u]) P0[u] = P1[u].slice();
      if (!P1[u] && P0[u]) P1[u] = P0[u].slice();
    }
    var vis0 = {};
    scene.species.forEach(function (sp, s) { Object.keys(geos[s].P).forEach(function (i) { vis0[idx(s, +i)] = 1; }); });

    /* bonds on either side */
    var pairs = {};
    g0.bonds.forEach(function (b) { pairs[pk(b.a, b.b)] = { a: b.a, b: b.b, o0: b.order, o1: 0 }; });
    g1.bonds.forEach(function (b) {
      var k = pk(b.a, b.b);
      if (pairs[k]) pairs[k].o1 = b.order;
      else pairs[k] = { a: b.a, b: b.b, o0: 0, o1: b.order };
    });
    var lp0 = {}, lp1 = {};
    lpShow.forEach(function (x) { lp0[x] = g0.lonePairs(x); lp1[x] = g1.lonePairs(x); });

    /* the arrows on the first frame */
    var paths = arrows.map(function (a) { return Arrows.geometry(geos, a.from, a.to, centre); });
    /* where each lone pair sits at the start, and which ones ride an arrow */
    var dirs0 = {}, used = {};
    scene.species.forEach(function (sp, s) {
      Object.keys(geos[s].lp).forEach(function (i) { dirs0[idx(s, +i)] = geos[s].lp[i].map(function (q) { return q[2]; }); });
    });
    arrows.forEach(function (a, k) {
      if (!/^lp:/.test(a.from)) return;
      var q = a.from.split(':'), x = idx(+q[1], +q[2]), list = geos[+q[1]].lp[q[2]] || [];
      var T = paths[k].T, best = -1, bd = Infinity;
      list.forEach(function (l, j) {
        if ((used[x] || []).indexOf(j) >= 0) return;
        var d = Math.hypot(l[0] - T[0], l[1] - T[1]);
        if (d < bd) { bd = d; best = j; }
      });
      if (best >= 0) (used[x] = used[x] || []).push(best);
    });
    var ts = (scene.ts || []).map(function (q) { return idx(q[0], q[1]); });

    var root = Draw.svg('mol scene arrow-svg player', o.label || (scene.title + ': the arrows played'));
    var gg = Draw.el('g', { class: 'frame' }, root);
    var cur = 0;

    function frame(p, into) {
      var host = into || gg;
      host.innerHTML = '';
      var s = seg(p, 0.2, 0.9);
      var after = p >= 0.5;
      var vis = after ? vis1 : vis0;
      var fm = new Mol.M();
      for (var i = 0; i < n; i++) {
        var a0 = g0.atoms[i], a1 = g1.atoms[i];
        fm.add(a0.el, { h: after ? a1.h : a0.h, charge: p < 0.58 ? a0.charge : a1.charge });
      }
      var chargeOp = {};
      for (i = 0; i < n; i++) {
        if (g0.atoms[i].charge === g1.atoms[i].charge) continue;
        chargeOp[i] = p < 0.58 ? 1 - seg(p, 0.3, 0.46) : seg(p, 0.62, 0.8);
      }
      var pos = {};
      Object.keys(vis).forEach(function (k) {
        var q0 = P0[k], q1 = P1[k];
        pos[k] = [lerp(q0[0], q1[0], s) / S, -lerp(q0[1], q1[1], s) / S];
      });
      var fadeOut = 1 - seg(p, 0.2, 0.6), fadeIn = seg(p, 0.42, 0.85);
      var style = {}, wedge = {}, adj = {};
      Object.keys(pos).forEach(function (k) { adj[k] = []; });
      Object.keys(pairs).forEach(function (key) {
        var x = pairs[key], nn = Math.max(x.o0, x.o1);
        if (!pos[x.a] || !pos[x.b]) return;
        var op = 1, dash = false, op2 = null, dash2 = false;
        if (x.o0 === 0) { op = fadeIn; dash = op < 0.98; }
        else if (x.o1 === 0) { op = fadeOut; dash = op < 0.98; }
        else if (x.o1 > x.o0) { op2 = fadeIn; dash2 = fadeIn < 0.98; }
        else if (x.o0 > x.o1) { op2 = fadeOut; dash2 = fadeOut < 0.98; }
        if (op < 0.02) return;
        if (op2 != null && op2 < 0.02) { nn = Math.min(x.o0, x.o1); op2 = null; }
        var k = fm.bond(x.a, x.b, nn);
        style[k] = { op: Math.max(op, dash ? 0.25 : op), dash: dash, op2: op2, dash2: dash2 };
        var w = (after ? wedge1 : wedge0)[key];
        if (w && !dash) wedge[k] = w;
        if (op >= 0.5) { adj[x.a].push({ j: x.b, b: k, order: nn }); adj[x.b].push({ j: x.a, b: k, order: nn }); }
      });
      /* a pair that rides an arrow leaves its place; the others stay put */
      var lpN = {}, lpAt = {};
      lpShow.forEach(function (x) {
        if (p >= 0.55) { lpN[x] = lp1[x]; return; }
        lpN[x] = lp0[x]; lpAt[x] = dirs0[x];
        if (p >= 0.04 && used[x]) {
          lpAt[x] = dirs0[x].filter(function (d, k) { return used[x].indexOf(k) < 0; });
          lpN[x] = lpAt[x].length;
        }
      });
      var L = { pos: pos, wedge: wedge, abbr: after ? abbr1 : abbr0, adj: adj, ring: after ? ring1 : ring0 };
      var geo = Draw.mol(fm, { layout: L, g: host, at: [0, 0], mech: true, lp: lpShow, lpN: lpN, lpAt: lpAt, bondStyle: style, chargeOp: chargeOp, label: '' });
      /* the arrows fade as the electrons arrive */
      var aop = 1 - seg(p, 0.3, 0.5);
      if (aop > 0.02) {
        var ga = Draw.el('g', { class: 'arrows', opacity: aop < 0.999 ? aop.toFixed(2) : null }, host);
        paths.forEach(function (A, k) {
          Draw.el('path', { d: A.d, class: 'arw' }, ga);
          Draw.el('polygon', { points: A.head, class: 'arw-head' }, ga);
          if (o.badges) {
            Draw.el('circle', { cx: f1(A.mid[0]), cy: f1(A.mid[1]), r: 8, class: 'arw-badge' }, ga);
            Draw.el('text', { x: f1(A.mid[0]), y: f1(A.mid[1] + 4), class: 'arw-num', 'text-anchor': 'middle' }, ga, String(k + 1));
          }
          grow(geo.box, A.T, 4); grow(geo.box, A.C, 9); grow(geo.box, A.H, 4);
        });
      }
      /* the electron pairs riding the arrows */
      if (p > 0.02 && p < 0.5) {
        var t = seg(p, 0.04, 0.44);
        var ge = Draw.el('g', { class: 'e-pairs' }, host);
        paths.forEach(function (A) {
          var q = bez(A, t), q2 = bez(A, Math.min(1, t + 0.02)), q3 = bez(A, Math.max(0, t - 0.02));
          var tg = unit([q2[0] - q3[0], q2[1] - q3[1]]), nv = [-tg[1], tg[0]];
          Draw.el('circle', { cx: f1(q[0] + nv[0] * 3.4), cy: f1(q[1] + nv[1] * 3.4), r: 2.8, class: 'e-dot' }, ge);
          Draw.el('circle', { cx: f1(q[0] - nv[0] * 3.4), cy: f1(q[1] - nv[1] * 3.4), r: 2.8, class: 'e-dot' }, ge);
        });
      }
      /* Klein's transition state: brackets, ‡, δ− where the charge is shared */
      if (ts.length && Math.abs(p - 0.5) < 0.13) {
        var gt = Draw.el('g', { class: 'ts-bracket' }, host);
        ts.forEach(function (x) {
          if (!geo.P[x]) return;
          var lab = geo.labels[x], q = geo.P[x];
          var tx = lab ? lab.x1 + 2 : q[0] + 6, ty = q[1] - 12;
          Draw.el('text', { x: f1(tx), y: f1(ty), class: 'm-partial neg' }, gt, 'δ−');
        });
        var b = box || geo.box;
        var x0 = b[0] + 2, x1 = b[2] - 12, y0 = b[1] + 4, y1 = b[3] - 4;
        Draw.el('path', { d: 'M' + f1(x0 + 8) + ' ' + f1(y0) + ' H' + f1(x0) + ' V' + f1(y1) + ' H' + f1(x0 + 8), class: 'ts-line' }, gt);
        Draw.el('path', { d: 'M' + f1(x1 - 8) + ' ' + f1(y0) + ' H' + f1(x1) + ' V' + f1(y1) + ' H' + f1(x1 - 8), class: 'ts-line' }, gt);
        Draw.el('text', { x: f1(x1 + 3), y: f1(y0 + 12), class: 'ts-mark' }, gt, '‡');
      }
      return geo;
    }
    function grow(b, q, r) { b[0] = Math.min(b[0], q[0] - r); b[1] = Math.min(b[1], q[1] - r); b[2] = Math.max(b[2], q[0] + r); b[3] = Math.max(b[3], q[1] + r); }
    function bez(A, t) {
      var v = 1 - t;
      return [v * v * A.T[0] + 2 * v * t * A.C[0] + t * t * A.H[0], v * v * A.T[1] + 2 * v * t * A.C[1] + t * t * A.H[1]];
    }

    /* one picture size for every frame */
    var box = null;
    var probe = Draw.el('g', {}, root);
    var b0 = frame(0, probe).box.slice(), b1 = frame(1, probe).box.slice(), bm = frame(0.5, probe).box.slice();
    root.removeChild(probe);
    box = [Math.min(b0[0], b1[0], bm[0]) - 14, Math.min(b0[1], b1[1], bm[1]) - 8, Math.max(b0[2], b1[2], bm[2]) + 22, Math.max(b0[3], b1[3], bm[3]) + 8];
    Draw.fit(root, box, 4);

    function set(p) { cur = p; frame(p); }
    set(o.p || 0);
    return { node: root, set: set, p: function () { return cur; }, after: g1, box: box,
             problems: drawnProblems(g1, P1, wedge1) };
  }

  return { Player: Player, outcome: outcome, fold: fold, drawnProblems: drawnProblems };
})();

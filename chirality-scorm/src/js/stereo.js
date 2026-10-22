/* stereo.js: turning molecules, reflecting them, and deciding how two
 * drawings are related.
 *
 * Turning. A drawing of one chirality centre has four places a group can be
 * drawn: two bonds in the page, a wedge and a dash. They point to the
 * corners of a regular tetrahedron, so exactly twelve turns of the molecule
 * put every group back in one of those four places: no turn at all, eight
 * turns of a third (hold one bond still and spin the other three) and three
 * half turns (such as turning the molecule over, so wedges become dashes and
 * left becomes right). Those twelve are every drawing of the molecule with
 * that template; the other twelve ways of putting the same four groups in the
 * same four places draw its mirror image. A zigzag stays in the page under
 * four turns: none, turning it over, turning it upside down, and spinning it
 * half a turn in the page.
 *
 * Reflecting. A mirror beside the molecule swaps left and right; a mirror
 * behind the page swaps wedges and dashes. Either one turns every R into S.
 *
 * Relationships. Two drawings are the same molecule when one can be turned
 * to lie exactly on the other, enantiomers when one's mirror image can, and
 * diastereomers when they have the same atoms and bonds but neither works.
 * `relation` decides from R and S (comparing every centre, and allowing for
 * the molecule being numbered from either end); `superimposable` decides by
 * laying the 3D models on each other, without looking at R or S at all.
 * tools/validate.js checks that the two always agree.
 */

var STEREO = (function () {
  'use strict';

  var G = GEOM;
  var MIRRORS = {
    beside: [[-1, 0, 0], [0, 1, 0], [0, 0, 1]],
    behind: [[1, 0, 0], [0, 1, 0], [0, 0, -1]]
  };

  /* ------------------------------------------------------------- turns */

  /* The twelve turns that map a template's four slots onto themselves,
     each with the slot every slot moves to. */
  var groupCache = {};
  function turns(tpl) {
    if (groupCache[tpl]) return groupCache[tpl];
    var T = MOLECULES.TEMPLATES[tpl], names = MOLECULES.SLOT_ORDER[tpl];
    var dirs = names.map(function (n) { return T[n]; });
    var out = [];
    permutations([0, 1, 2, 3]).forEach(function (p) {
      /* the linear map taking slot i to slot p[i], from three of them */
      var A = [dirs[0], dirs[1], dirs[2]], B = [dirs[p[0]], dirs[p[1]], dirs[p[2]]];
      var R = solve(A, B);
      if (!R) return;
      if (G.dist(G.mvec(R, dirs[3]), dirs[p[3]]) > 1e-6) return;
      if (G.mdet(R) < 0) return;
      var map = {};
      names.forEach(function (n, i) { map[n] = names[p[i]]; });
      out.push({ R: R, map: map });
    });
    groupCache[tpl] = out;
    return out;
  }

  function permutations(a) {
    if (a.length <= 1) return [a];
    var out = [];
    a.forEach(function (x, i) {
      permutations(a.slice(0, i).concat(a.slice(i + 1))).forEach(function (p) { out.push([x].concat(p)); });
    });
    return out;
  }

  /* The matrix R with R·a[i] = b[i] for three independent vectors. */
  function solve(a, b) {
    var A = G.transpose(a), Bm = G.transpose(b);         /* columns are the vectors */
    var d = G.mdet(A);
    if (Math.abs(d) < 1e-9) return null;
    var inv = adjugate(A).map(function (r) { return r.map(function (v) { return v / d; }); });
    return G.mmul(Bm, inv);
  }
  function adjugate(m) {
    var c = function (r, k) {
      var rows = [0, 1, 2].filter(function (x) { return x !== r; }), cols = [0, 1, 2].filter(function (x) { return x !== k; });
      var v = m[rows[0]][cols[0]] * m[rows[1]][cols[1]] - m[rows[0]][cols[1]] * m[rows[1]][cols[0]];
      return ((r + k) % 2 ? -1 : 1) * v;
    };
    return [[c(0, 0), c(1, 0), c(2, 0)], [c(0, 1), c(1, 1), c(2, 1)], [c(0, 2), c(1, 2), c(2, 2)]];
  }

  var I = G.ident();
  var OVER = G.rot([0, 1, 0], 180);              /* turn it over: about the page's up–down line */
  var UPSIDE = G.rot([1, 0, 0], 180);            /* upside down: about the page's left–right line */
  var INPAGE = G.rot([0, 0, 1], 180);            /* half a turn in the page */
  var CHAIN_TURNS = [I, OVER, UPSIDE, INPAGE];

  /* Every orientation a molecule can be drawn in. */
  function orientations(m) {
    if (m.kind === 'centre') return turns(m.tpl).map(function (t) { return t.R; });
    if (m.kind === 'chain') return CHAIN_TURNS;
    return [I];
  }

  /* The drawable orientation nearest to R (after a free turn of the 3D
     model, it settles there). */
  function nearest(m, R) {
    var best = null, bt = -Infinity;
    orientations(m).forEach(function (O) {
      var t = G.mmul(R, G.transpose(O));
      var tr = t[0][0] + t[1][1] + t[2][2];
      if (tr > bt + 1e-9) { bt = tr; best = O; }
    });
    return best;
  }

  /* A third of a turn about the bond to the group in `slot`. */
  function spin(m, R, slot) {
    var T = MOLECULES.TEMPLATES[m.tpl];
    return G.mmul(G.rot(T[slot], 120), R);
  }

  /* ---- applying a turn or a reflection */

  /* Model m with every atom moved by the linear map L about m's pivot. */
  function apply(m, L) {
    if (!L || L === I) return m;
    var c = m.pivot;
    return MOLECULES.transformed(m, function (p) { return G.add(c, G.mvec(L, G.sub(p, c))); });
  }

  function mirror(m, where) { return apply(m, MIRRORS[where || 'beside']); }

  /* ---- reading a centre drawing */

  /* Which group sits in each slot of the template, for a model turned or
     reflected so its bonds lie along the slots: {ul: 'Br', ...}. */
  function arrangement(m) {
    var T = MOLECULES.TEMPLATES[m.tpl], out = {};
    var c = m.atoms[m.centre].p;
    Object.keys(m.slots).forEach(function (s) {
      var a = m.atoms[m.slots[s]];
      var v = G.unit(G.sub(a.p, c));
      var best = null, bd = -2;
      Object.keys(T).forEach(function (n) { var d = G.dot(v, T[n]); if (d > bd) { bd = d; best = n; } });
      out[best] = a.group;
    });
    return out;
  }

  /* The atom in a given slot of a centre drawing. */
  function atomInSlot(m, slot) {
    var T = MOLECULES.TEMPLATES[m.tpl], c = m.atoms[m.centre].p;
    var best = null, bd = -2;
    Object.keys(m.slots).forEach(function (s) {
      var i = m.slots[s];
      var d = G.dot(G.unit(G.sub(m.atoms[i].p, c)), T[slot]);
      if (d > bd) { bd = d; best = i; }
    });
    return best;
  }

  /* How a bond is drawn: 'wedge', 'dash' or 'plain', from where it points. */
  function bondStyle(from, to) {
    var v = G.unit(G.sub(to, from));
    return v[2] > 0.3 ? 'wedge' : v[2] < -0.3 ? 'dash' : 'plain';
  }

  /* Is the lowest-priority group on centre c pointing away from the reader? */
  function fourOnDash(m, c) {
    var o = CIP.rank(m, c).order;
    return bondStyle(m.atoms[c].p, m.atoms[o[3]].p) === 'dash';
  }

  /* A centre drawing from a slot assignment {ul: 'Br', ...}: what a student
     builds. */
  function fromSlots(tpl, slots, name) {
    var spec = { id: 'built', name: name || 'built', centre: { tpl: tpl } };
    Object.keys(slots).forEach(function (s) { spec.centre[s] = slots[s]; });
    return MOLECULES.fromSpec(spec);
  }

  /* ------------------------------------------------------ relationships */

  function descriptors(m) {
    var out = {};
    CIP.centres(m).forEach(function (c) { out[c] = CIP.label(m, c); });
    return out;
  }

  /* Heavy-atom graph isomorphisms from a to b: arrays mapping a's atom index
     to b's. */
  function isomorphisms(a, b, limit) {
    function heavy(m) { return m.atoms.filter(function (x) { return x.el !== 'H'; }).map(function (x) { return x.i; }); }
    var ha = heavy(a), hb = heavy(b);
    if (ha.length !== hb.length) return [];
    var na = MOLECULES.neighbours(a), nb = MOLECULES.neighbours(b);
    function inv(m, nbm, i) {
      var hs = nbm[i].filter(function (x) { return m.atoms[x.j].el === 'H'; }).length;
      var bonds = nbm[i].filter(function (x) { return m.atoms[x.j].el !== 'H'; }).map(function (x) {
        return m.atoms[x.j].el + x.order; }).sort().join();
      return m.atoms[i].el + '|' + hs + '|' + bonds;
    }
    var ia = {}, ib = {};
    ha.forEach(function (i) { ia[i] = inv(a, na, i); });
    hb.forEach(function (i) { ib[i] = inv(b, nb, i); });
    var out = [], map = {}, used = {};
    limit = limit || 400;
    function ok(i, j) {
      if (ia[i] !== ib[j]) return false;
      return na[i].every(function (x) {
        if (a.atoms[x.j].el === 'H' || map[x.j] == null) return true;
        return nb[j].some(function (y) { return y.j === map[x.j] && y.order === x.order; });
      });
    }
    function go(k) {
      if (out.length >= limit) return;
      if (k === ha.length) { var c = {}; Object.keys(map).forEach(function (x) { c[x] = map[x]; }); out.push(c); return; }
      var i = ha[k];
      hb.forEach(function (j) {
        if (used[j] || !ok(i, j)) return;
        map[i] = j; used[j] = true;
        go(k + 1);
        delete map[i]; used[j] = false;
      });
    }
    go(0);
    return out;
  }

  var OPP = { R: 'S', S: 'R' };

  /* 'identical', 'enantiomers', 'diastereomers' or 'constitutional', from
     R and S alone. Two drawings with no chirality centres cannot be told
     apart this way (cis and trans rings), so those go by superposition. */
  function relation(a, b) {
    var isos = isomorphisms(a, b);
    if (!isos.length) return 'constitutional';
    var da = descriptors(a), db = descriptors(b);
    var ca = Object.keys(da);
    if (!ca.length) return geometric(a, b);
    function all(iso, flip) {
      return ca.every(function (c) {
        var t = db[iso[c]];
        return t && t === (flip ? OPP[da[c]] : da[c]);
      });
    }
    if (isos.some(function (iso) { return all(iso, false); })) return 'identical';
    if (isos.some(function (iso) { return all(iso, true); })) return 'enantiomers';
    return 'diastereomers';
  }

  function chiral(m) { return relation(m, mirror(m)) !== 'identical'; }

  /* Meso: chirality centres, but the molecule is its own mirror image. */
  function meso(m) { return CIP.centres(m).length > 0 && !chiral(m); }

  /* ---- by laying one model on the other */

  /* The atoms whose places the drawing fixes: centres, the zigzag, the ring
     and the first atom of every group (not the far atoms of a group, whose
     turn about its own bond the drawing does not show). */
  function skeleton(m) {
    return m.atoms.filter(function (x) { return !x.sub && x.el !== 'H'; }).map(function (x) { return x.i; });
  }

  /* The atoms two drawings are laid on each other by: every chirality centre
     and the four atoms bonded to it (an H included), whose places the
     drawing fixes exactly. A molecule with no chirality centre uses its
     skeleton instead. Returns pairs [atom, centre the H hangs from or -1]. */
  function layAtoms(m) {
    var cs = CIP.centres(m);
    if (!cs.length) return skeleton(m).map(function (i) { return [i, -1]; });
    var nb = MOLECULES.neighbours(m), seen = {}, out = [];
    cs.forEach(function (c) {
      if (!seen[c]) { seen[c] = 1; out.push([c, -1]); }
      nb[c].forEach(function (x) {
        if (seen[x.j]) return;
        seen[x.j] = 1;
        out.push([x.j, m.atoms[x.j].el === 'H' ? c : -1]);
      });
    });
    return out;
  }

  function superimposable(a, b, tol) {
    tol = tol == null ? 0.05 : tol;
    var lay = layAtoms(a), nbB = MOLECULES.neighbours(b);
    return isomorphisms(a, b).some(function (iso) {
      var P = [], Q = [];
      for (var k = 0; k < lay.length; k++) {
        var i = lay[k][0], c = lay[k][1], j;
        if (c < 0) j = iso[i];
        else j = (nbB[iso[c]].filter(function (x) { return b.atoms[x.j].el === 'H'; })[0] || {}).j;
        if (j == null) return false;
        P.push(a.atoms[i].p);
        Q.push(b.atoms[j].p);
      }
      return G.superpose(P, Q).rmsd < tol;
    });
  }

  function geometric(a, b) {
    if (!isomorphisms(a, b, 1).length) return 'constitutional';
    if (superimposable(a, b)) return 'identical';
    if (superimposable(mirror(a), b)) return 'enantiomers';
    return 'diastereomers';
  }

  /* ---- the match meter: how much of the copy lies on the original */

  /* Atoms of the skeleton plus the H atoms on it, for counting. */
  function frame(m) {
    return m.atoms.filter(function (x) { return !x.sub; }).map(function (x) { return x.i; });
  }

  /* How many of a's frame atoms have an atom of the same element of b
     within `tol` Å, with both models centred on their pivots. Atoms that
     sit on the pivot (the centre itself) are not counted. */
  function matchCount(a, b, tol) {
    tol = tol || 0.35;
    var fa = frame(a), fb = frame(b);
    var used = {}, n = 0, total = 0;
    fa.forEach(function (i) {
      var p = G.sub(a.atoms[i].p, a.pivot);
      if (G.len(p) < 0.2) return;
      total++;
      for (var k = 0; k < fb.length; k++) {
        var j = fb[k];
        if (used[j] || b.atoms[j].el !== a.atoms[i].el) continue;
        if (G.dist(p, G.sub(b.atoms[j].p, b.pivot)) < tol) { used[j] = true; n++; return; }
      }
    });
    return { n: n, total: total };
  }

  /* Which of a's frame atoms have no partner in b (for the overlay). */
  function mismatched(a, b, tol) {
    tol = tol || 0.35;
    var fb = frame(b), used = {}, out = [];
    frame(a).forEach(function (i) {
      var p = G.sub(a.atoms[i].p, a.pivot);
      if (G.len(p) < 0.2) return;
      for (var k = 0; k < fb.length; k++) {
        var j = fb[k];
        if (used[j] || b.atoms[j].el !== a.atoms[i].el) continue;
        if (G.dist(p, G.sub(b.atoms[j].p, b.pivot)) < tol) { used[j] = true; return; }
      }
      out.push(i);
    });
    return out;
  }

  /* ---- conformations of a two-carbon zigzag (the meso step) */

  /* The atoms on the far side of the bond i–j, seen from i. */
  function side(m, i, j) {
    var nb = MOLECULES.neighbours(m), seen = {}, stack = [j];
    seen[i] = true;
    var out = [];
    while (stack.length) {
      var k = stack.pop();
      if (seen[k]) continue;
      seen[k] = true;
      out.push(k);
      nb[k].forEach(function (x) { if (!seen[x.j]) stack.push(x.j); });
    }
    return out;
  }

  /* Model m with everything on C3's side turned by `deg` about C2–C3. */
  function twisted(m, deg) {
    var c2 = m.carbonAt[2], c3 = m.carbonAt[3];
    var p2 = m.atoms[c2].p, p3 = m.atoms[c3].p;
    var R = G.rot(G.sub(p3, p2), deg);
    var moving = {};
    side(m, c2, c3).forEach(function (k) { moving[k] = true; });
    var c = Object.create(Object.getPrototypeOf(m));
    Object.keys(m).forEach(function (k) { c[k] = m[k]; });
    c.atoms = m.atoms.map(function (a) {
      var b = {};
      Object.keys(a).forEach(function (k) { b[k] = a[k]; });
      if (moving[a.i]) b.p = G.add(p3, G.mvec(R, G.sub(a.p, p3)));
      return b;
    });
    return c;
  }

  /* The X–C2–C3–X dihedral of a 2,3-disubstituted butane, for the groups
     that are not H or the chain. */
  function subDihedral(m) {
    var c2 = m.carbonAt[2], c3 = m.carbonAt[3];
    function sub(c) {
      return MOLECULES.neighbours(m)[c].map(function (x) { return x.j; }).filter(function (j) {
        var a = m.atoms[j];
        return a.head && a.slot && a.el !== 'H' && a.owner === c;
      })[0];
    }
    return G.torsion(m.atoms[sub(c2)].p, m.atoms[c2].p, m.atoms[c3].p, m.atoms[sub(c3)].p);
  }

  /* Is the reflection through the plane (point o, unit normal n) a symmetry
     of m? Checked on the frame atoms. */
  function symmetricIn(m, o, n) {
    var f = frame(m);
    return f.every(function (i) {
      var p = m.atoms[i].p;
      var d = G.dot(G.sub(p, o), n);
      var q = G.sub(p, G.mul(n, 2 * d));
      return f.some(function (j) { return m.atoms[j].el === m.atoms[i].el && G.dist(m.atoms[j].p, q) < 0.1; });
    });
  }

  /* The mirror plane of a meso zigzag, if this conformation has one: the
     plane cutting C2–C3 in half at right angles. */
  function mesoPlane(m) {
    var p2 = m.atoms[m.carbonAt[2]].p, p3 = m.atoms[m.carbonAt[3]].p;
    var o = G.mul(G.add(p2, p3), 0.5), n = G.unit(G.sub(p3, p2));
    return symmetricIn(m, o, n) ? { o: o, n: n } : null;
  }

  /* A mirror plane through a centre drawing's centre, if it has one: the
     plane holding two of its groups and the centre. */
  function centrePlane(m) {
    var c = m.atoms[m.centre].p, heads = Object.keys(m.slots).map(function (s) { return m.slots[s]; });
    for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) {
      var n = G.unit(G.cross(G.sub(m.atoms[heads[i]].p, c), G.sub(m.atoms[heads[j]].p, c)));
      if (symmetricIn(m, c, n)) return { o: c, n: n, through: [heads[i], heads[j]] };
    }
    return null;
  }

  /* A mirror plane of a ring, if it has one: through two opposite ring
     carbons and the ring's axis. */
  function ringPlane(m) {
    for (var k = 0; k < 3; k++) {
      var a = m.atoms[m.ringAtoms[k]].p, b = m.atoms[m.ringAtoms[k + 3]].p;
      var n = G.unit(G.cross(G.sub(b, a), [0, 0, 1]));
      if (symmetricIn(m, [0, 0, 0], n)) return { o: [0, 0, 0], n: n, through: [k + 1, k + 4] };
    }
    return null;
  }

  return {
    MIRRORS: MIRRORS, OVER: OVER, UPSIDE: UPSIDE, INPAGE: INPAGE, I: I,
    turns: turns, orientations: orientations, nearest: nearest, spin: spin, apply: apply, mirror: mirror,
    arrangement: arrangement, atomInSlot: atomInSlot, bondStyle: bondStyle, fourOnDash: fourOnDash, fromSlots: fromSlots,
    descriptors: descriptors, isomorphisms: isomorphisms, relation: relation, chiral: chiral, meso: meso,
    superimposable: superimposable, geometric: geometric, matchCount: matchCount, mismatched: mismatched,
    twisted: twisted, subDihedral: subDihedral, symmetricIn: symmetricIn, mesoPlane: mesoPlane,
    centrePlane: centrePlane, ringPlane: ringPlane, permutations: permutations, side: side
  };
})();

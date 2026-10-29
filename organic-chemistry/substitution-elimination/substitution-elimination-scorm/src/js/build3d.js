/* build3d.js: 3D models of the molecules, built from the graph.
 *
 * Real geometry: tetrahedral carbons, flat ones at a double bond or a
 * carbocation, staggered chains, real bond lengths. Every chirality centre
 * and double bond comes out as the graph says (the parity and the cis/trans
 * reference of mol.js), so a model can be checked against the drawing and
 * the name.
 *
 * build(m, { root, axis, up, anti }) puts atom `root` at the origin and its
 * neighbour `axis` along +x. `up` is the neighbour of root that points up
 * (+y) in a Newman projection looking from root down the axis; `anti` is the
 * atom on `axis` placed anti (dihedral 180°) to `up`. That is how the E2
 * steps line up the H and the leaving group, and tools/validate.js uses the
 * same models to check react.js's stereochemistry a second way.
 *
 * The model's atoms are { el, p, g (graph index, or the H's carbon), h (true
 * for an implicit H made real) }.
 */

var Build3D = (function () {
  'use strict';

  var G = GEOM;
  var TET = G.TET, TRI = 2 * Math.PI / 3;

  function build(m, o) {
    o = o || {};
    var atoms = [], bonds = [], of = {};
    function push(a) { atoms.push(a); return atoms.length - 1; }
    function link(i, j, order) { bonds.push({ a: i, b: j, order: order || 1 }); }

    /* the neighbours of graph atom i, with its implicit H as {j: -1} */
    function around(i) {
      var list = m.nb(i).map(function (x) { return { j: x.j, order: x.order }; });
      for (var k = 0; k < m.atoms[i].h; k++) list.push({ j: -1, order: 1, k: k });
      return list;
    }
    function flat(i) {
      var a = m.atoms[i];
      if (a.el !== 'C') return false;
      return a.charge !== 0 && a.h + m.nb(i).length === 3 || m.nb(i).some(function (x) { return x.order === 2; });
    }
    function linear(i) { return m.nb(i).some(function (x) { return x.order === 3; }) || (m.atoms[i].el === 'N' && m.nb(i).length === 2 && m.nb(i).every(function (x) { return x.order === 2; })); }

    function signed(par, pos) {
      var v = par.nb.map(function (j) { return pos[j]; });
      if (v.some(function (q) { return !q; })) return 0;
      var d = G.det3(G.sub(v[1], v[0]), G.sub(v[2], v[0]), G.sub(v[3], v[0]));
      return d > 0 ? 1 : -1;
    }

    var root = o.root != null ? o.root : 0;
    var r = push({ el: m.atoms[root].el, p: [0, 0, 0], g: root });
    of[root] = r;
    var nbs = around(root);
    var axis = o.axis != null ? o.axis : nbs[0].j;
    var first = nbs.filter(function (x) { return x.j === axis; })[0] || nbs[0];
    var rest = nbs.filter(function (x) { return x !== first; });
    if (o.up != null) rest.sort(function (p, q) { return (q.j === o.up) - (p.j === o.up); });
    var dirs;
    var n = nbs.length;
    if (flat(root)) dirs = [[1, 0, 0], [Math.cos(TRI), Math.sin(TRI), 0], [Math.cos(TRI), -Math.sin(TRI), 0]];
    else if (n === 4 || n === 3 && m.atoms[root].el !== 'C') dirs = [[1, 0, 0]].concat([0, 120, 240].map(function (a) { return dirAround(-1, a); }));
    else if (n === 2 && linear(root)) dirs = [[1, 0, 0], [-1, 0, 0]];
    else dirs = [[1, 0, 0]].concat([0, 120, 240].map(function (a) { return dirAround(-1, a); }));
    /* the root's own configuration: swap the last two if it comes out wrong */
    var par = m.atoms[root].parity;
    if (par && rest.length >= 3) {
      var pos = {};
      pos[first.j] = dirs[0];
      rest.forEach(function (x, k) { pos[x.j] = dirs[k + 1]; });
      if (signed(par, pos) !== par.sign) { var t = rest[1]; rest[1] = rest[2]; rest[2] = t; }
    }
    var order = [first].concat(rest);
    order.forEach(function (x, k) {
      var el = x.j < 0 ? 'H' : m.atoms[x.j].el;
      var len = bondLength(m.atoms[root].el, el, x.order);
      var p = G.mul(dirs[k], len);
      var idx = push({ el: el, p: p, g: x.j < 0 ? root : x.j, h: x.j < 0 });
      if (x.j >= 0) of[x.j] = idx;
      link(r, idx, x.order);
    });
    /* each branch, staggered from the root's other bonds */
    order.forEach(function (x, k) {
      if (x.j < 0) return;
      grow(x.j, root, order.length > 1 ? r + 1 + ((k + 1) % order.length) : null, k === 0 && o.anti != null ? { anti: o.anti, ref: o.up } : null);
    });

    function dirAround(sign, deg) {
      var a = deg * Math.PI / 180, T3 = Math.sqrt(8) / 3;
      return [sign / 3, T3 * Math.cos(a), T3 * Math.sin(a)];
    }

    /* place the rest of the neighbours of graph atom i, entered from parent */
    function grow(i, parent, refIdx, want) {
      var me = atoms[of[i]].p, pp = atoms[of[parent]].p;
      /* a root with one neighbour has no reference atom: any direction off the axis will do */
      var refP = refIdx != null ? atoms[refIdx].p : G.add(pp, [0, 1, 0.3]);
      var refAtom = refIdx == null ? null : atoms[refIdx].h ? -1 : atoms[refIdx].g;
      var kids = around(i).filter(function (x) { return x.j !== parent; });
      if (!kids.length) return;
      var bondIn = m.bonds[m.bondBetween(i, parent)];
      var dih, ang;
      if (linear(i)) { ang = Math.PI; dih = [0]; }
      else if (flat(i)) { ang = TRI; dih = [0, 180]; }
      else { ang = TET; dih = [180, 60, 300]; }
      /* a double bond into i: put the cis partner where the graph says */
      if (bondIn.order === 2 && bondIn.cfg && kids.length === 2) {
        var cfg = bondIn.cfg;
        var mine = bondIn.a === i ? cfg.na : cfg.nb, theirs = bondIn.a === i ? cfg.nb : cfg.na;
        var rel = cfg.rel;
        if (refAtom !== theirs) rel = rel === 'cis' ? 'trans' : 'cis';
        var mk = kids.filter(function (x) { return x.j === mine; })[0];
        if (mk) {
          var other = kids.filter(function (x) { return x !== mk; })[0];
          /* dih[0] = 0 is cis to the reference atom, dih[1] = 180 trans */
          kids = rel === 'cis' ? [mk, other] : [other, mk];
        }
      }
      /* the anti H for the E2 models */
      if (want && want.anti != null) {
        kids.sort(function (p, q) { return (q.j === want.anti || (want.anti === -1 && q.j < 0 && q.k === 0)) - (p.j === want.anti || (want.anti === -1 && p.j < 0 && p.k === 0)); });
        refP = atoms[of[want.ref]].p;
        refIdx = of[want.ref];
      }
      var place = kids.map(function (x, k) {
        var el = x.j < 0 ? 'H' : m.atoms[x.j].el;
        return G.place(refP, pp, me, bondLength(m.atoms[i].el, el, x.order), ang, dih[k] != null ? dih[k] : 0);
      });
      var par2 = m.atoms[i].parity;
      if (par2 && kids.length === 3) {
        var pos2 = {};
        pos2[parent] = pp;
        kids.forEach(function (x, k) { pos2[x.j] = place[k]; });
        if (signed(par2, pos2) !== par2.sign) {
          /* swap the two that are not pinned (the anti H stays anti) */
          var a1 = want && want.anti != null ? 1 : 0, a2 = 2;
          if (!(want && want.anti != null)) a1 = 1;
          var t2 = kids[a1]; kids[a1] = kids[a2]; kids[a2] = t2;
        }
      }
      kids.forEach(function (x, k) {
        var el = x.j < 0 ? 'H' : m.atoms[x.j].el;
        var p = G.place(refP, pp, me, bondLength(m.atoms[i].el, el, x.order), ang, dih[k] != null ? dih[k] : 0);
        var idx = push({ el: el, p: p, g: x.j < 0 ? i : x.j, h: x.j < 0 });
        if (x.j >= 0) of[x.j] = idx;
        link(of[i], idx, x.order);
      });
      kids.forEach(function (x) { if (x.j >= 0) grow(x.j, i, of[parent], null); });
    }

    return { atoms: atoms, bonds: bonds, of: of };
  }

  /* Turn everything on b's side of bond a–b by deg about the a→b axis
     (model indices). */
  function twist(model, a, b, deg) {
    var side = sideOf(model, b, a);
    var axis = G.unit(G.sub(model.atoms[b].p, model.atoms[a].p));
    var R = G.rot(axis, deg);
    var o = model.atoms[b].p;
    var out = { atoms: model.atoms.map(function (x) { return Object.assign({}, x); }), bonds: model.bonds, of: model.of };
    side.forEach(function (i) { out.atoms[i].p = G.add(o, G.mvec(R, G.sub(model.atoms[i].p, o))); });
    return out;
  }

  function sideOf(model, from, stop) {
    var nb = model.atoms.map(function () { return []; });
    model.bonds.forEach(function (b) { nb[b.a].push(b.b); nb[b.b].push(b.a); });
    var seen = [from], todo = [from];
    while (todo.length) {
      var i = todo.pop();
      nb[i].forEach(function (j) { if (j !== stop && seen.indexOf(j) < 0) { seen.push(j); todo.push(j); } });
    }
    return seen;
  }

  /* Newman angles (degrees clockwise from up, as the eye sees them looking
     from atom a to atom b) of every atom bonded to a and to b. */
  function newman(model, a, b) {
    var A = model.atoms[a].p, B = model.atoms[b].p;
    var W = G.unit(G.sub(B, A));
    var UP = G.unit(G.sub([0, 1, 0], G.mul(W, W[1])));
    if (G.len(G.sub([0, 1, 0], G.mul(W, W[1]))) < 1e-6) UP = [0, 0, 1];
    var RIGHT = G.cross(W, UP);
    function ang(from, to) {
      var d = G.sub(to, from);
      var p = G.sub(d, G.mul(W, G.dot(d, W)));
      var t = Math.atan2(G.dot(p, RIGHT), G.dot(p, UP)) * 180 / Math.PI;
      return ((t % 360) + 360) % 360;
    }
    function list(c, other) {
      var out = [];
      model.bonds.forEach(function (bd) {
        var j = bd.a === c ? bd.b : bd.b === c ? bd.a : -1;
        if (j < 0 || j === other) return;
        out.push({ i: j, a: ang(model.atoms[c].p, model.atoms[j].p) });
      });
      return out.sort(function (p, q) { return p.a - q.a; });
    }
    return { front: list(a, b), back: list(b, a), cam: [RIGHT, UP, G.mul(W, -1)] };
  }

  function dihedral(model, i, j, k, l) {
    var P = function (x) { return model.atoms[x].p; };
    return G.torsion(P(i), P(j), P(k), P(l));
  }

  /* The graph's configuration read back from a model: the parity sign of
     graph atom c. */
  function paritySign(model, m, c) {
    var par = m.atoms[c].parity;
    var pos = {};
    model.bonds.forEach(function (bd) {
      var x = model.of[c];
      var j = bd.a === x ? bd.b : bd.b === x ? bd.a : -1;
      if (j < 0) return;
      var at = model.atoms[j];
      pos[at.h ? -1 : at.g] = at.p;
    });
    var v = par.nb.map(function (j) { return pos[j]; });
    var d = G.det3(G.sub(v[1], v[0]), G.sub(v[2], v[0]), G.sub(v[3], v[0]));
    return d > 0 ? 1 : -1;
  }

  return { build: build, twist: twist, newman: newman, dihedral: dihedral, paritySign: paritySign, sideOf: sideOf };
})();

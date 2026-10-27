/* cip.js: priorities (the Cahn–Ingold–Prelog rules) and R or S.
 *
 * Only the rules the course teaches, which are all these molecules need:
 *   1. Higher atomic number first.
 *   2. A tie: list the atoms on each tied atom, highest first, and compare
 *      the lists at the first point of difference (never the totals). Still
 *      tied: move one atom further out along the highest branches.
 *   3. A double bond counts twice: C=O is written as if the C carried two O
 *      atoms (and the O two C atoms). The copies, like the atom closing a
 *      ring, carry nothing further.
 *
 * Each branch of a chirality centre is unfolded into a tree (Klein's
 * "hierarchical digraph"), every set of branches sorted highest first, and
 * two branches compared sphere by sphere. The same comparison also says
 * where the first point of difference is, which is what the feedback quotes.
 *
 * R or S comes from the 3D model: with 4 pointing away, 1 → 2 → 3 clockwise
 * is R. That is the sign of a triple product, so it holds in every
 * orientation, and tools/validate.js checks it against the drawing in every
 * orientation the activity can show.
 */

var CIP = (function () {
  'use strict';

  var G = GEOM;
  var MAXD = 10;
  var VALENCE = { C: 4, N: 3, O: 2, F: 1, Cl: 1, Br: 1, I: 1, H: 1 };

  function Z(el) { return ELEMENTS[el].z; }

  function phantom() { return { z: 0, el: '', kids: [], phantom: true }; }

  /* The copy of an atom made for a double bond or a ring closure. */
  function dup(m, j) {
    var el = m.atoms[j].el, kids = [];
    for (var i = 1; i < VALENCE[el]; i++) kids.push(phantom());
    return { z: Z(el), el: el, atom: j, dup: true, kids: kids };
  }

  /* The tree of atom `to`, reached from `from`. `path` is every atom
     between the chirality centre and here. */
  function tree(m, nb, from, to, path, depth) {
    var a = m.atoms[to];
    var n = { z: Z(a.el), el: a.el, atom: to, kids: [] };
    if (depth >= MAXD) return n;
    var p2 = path.concat([to]);
    nb[to].forEach(function (x) {
      var d;
      if (x.j === from) {
        for (d = 1; d < x.order; d++) n.kids.push(dup(m, from));
        return;
      }
      if (path.indexOf(x.j) >= 0) { n.kids.push(dup(m, x.j)); return; }
      n.kids.push(tree(m, nb, to, x.j, p2, depth + 1));
      for (d = 1; d < x.order; d++) n.kids.push(dup(m, x.j));
    });
    return n;
  }

  function levels(n) {
    var out = [[n]], cur = [n];
    for (var l = 1; l <= MAXD; l++) {
      var next = [];
      cur.forEach(function (x) { x.kids.forEach(function (k) { next.push(k); }); });
      if (!next.length) break;
      out.push(next);
      cur = next;
    }
    return out;
  }

  /* +1 if branch a outranks branch b, −1 if b outranks a, 0 if they tie
     all the way out. Both trees must already be sorted (canon). */
  function cmp(a, b) {
    var la = levels(a), lb = levels(b);
    for (var l = 0; l < Math.max(la.length, lb.length); l++) {
      var xa = la[l] || [], xb = lb[l] || [];
      for (var i = 0; i < Math.max(xa.length, xb.length); i++) {
        var za = xa[i] ? xa[i].z : -1, zb = xb[i] ? xb[i].z : -1;
        if (za !== zb) return za > zb ? 1 : -1;
      }
    }
    return 0;
  }

  /* Sort every set of branches highest first, from the outside in. */
  function canon(n) {
    n.kids.forEach(canon);
    n.kids.sort(function (a, b) { return cmp(b, a); });
    return n;
  }

  function branches(m, c) {
    var nb = MOLECULES.neighbours(m);
    return nb[c].map(function (x) { return { j: x.j, tree: canon(tree(m, nb, c, x.j, [c], 1)) }; });
  }

  /* The groups on atom c, highest priority first, and any ties. */
  function rank(m, c) {
    var key = '_rank' + c;
    if (m[key]) return m[key];
    var bs = branches(m, c);
    bs.sort(function (a, b) { return cmp(b.tree, a.tree); });
    var ties = [];
    for (var i = 0; i + 1 < bs.length; i++) if (cmp(bs[i].tree, bs[i + 1].tree) === 0) ties.push([bs[i].j, bs[i + 1].j]);
    var r = { order: bs.map(function (b) { return b.j; }), trees: bs, ties: ties };
    Object.defineProperty(m, key, { value: r, enumerable: false });
    return r;
  }

  /* A carbon with four different groups. */
  function isCentre(m, c) {
    var a = m.atoms[c];
    if (a.el !== 'C') return false;
    var nb = MOLECULES.neighbours(m)[c];
    if (nb.length !== 4 || nb.some(function (x) { return x.order !== 1; })) return false;
    return !rank(m, c).ties.length;
  }

  function centres(m) {
    var key = '_centres';
    if (m[key]) return m[key];
    var out = [];
    m.atoms.forEach(function (a, i) { if (isCentre(m, i)) out.push(i); });
    Object.defineProperty(m, key, { value: out, enumerable: false });
    return out;
  }

  /* The priority (1 to 4) of each group on centre c, keyed by the atom
     bonded to c. */
  function priorities(m, c) {
    var out = {};
    rank(m, c).order.forEach(function (j, k) { out[j] = k + 1; });
    return out;
  }

  /* R or S from the 3D model. With v1 to v4 the bonds to groups 1 to 4,
     1 → 2 → 3 runs clockwise seen from the side opposite 4 exactly when
     (v1 − v4)·((v2 − v4) × (v3 − v4)) is negative. */
  function handed(m, c, order) {
    var p = m.atoms[c].p;
    var v = order.map(function (j) { return G.sub(m.atoms[j].p, p); });
    var d = G.det3(G.sub(v[0], v[3]), G.sub(v[1], v[3]), G.sub(v[2], v[3]));
    return d < 0 ? 'R' : 'S';
  }

  function label(m, c) {
    if (!isCentre(m, c)) return null;
    return handed(m, c, rank(m, c).order);
  }

  /* ------------------------------------------------------- explanations */

  var SYM = function (n) { return n.phantom ? 'nothing' : n.el; };
  function setText(nodes) { return '(' + nodes.map(SYM).join(', ') + ')'; }

  /* Where branches a and b (sorted trees) first differ. */
  function firstDifference(a, b) {
    if (a.z !== b.z) return { level: 0, a: a, b: b };
    var la = levels(a), lb = levels(b);
    for (var l = 1; l < Math.max(la.length, lb.length) + 1; l++) {
      var pa = la[l - 1] || [], pb = lb[l - 1] || [];
      for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
        var sa = pa[i] ? pa[i].kids : [], sb = pb[i] ? pb[i].kids : [];
        for (var k = 0; k < Math.max(sa.length, sb.length); k++) {
          var za = sa[k] ? sa[k].z : -1, zb = sb[k] ? sb[k].z : -1;
          if (za !== zb) {
            return { level: l, parentA: pa[i], parentB: pb[i], setA: sa, setB: sb, k: k,
                     winA: za > zb, path: i };
          }
        }
      }
    }
    return null;
  }

  /* How a group on centre c is written: its label in a centre drawing, or
     its condensed formula. */
  function groupText(m, c, j) {
    var a = m.atoms[j];
    if (a.group && a.head) return GROUPS[a.group].label;
    return MOLECULES.condensed(m, c, j);
  }

  /* Why group hi outranks group lo on centre c, in a sentence or two. */
  function explain(m, c, hi, lo) {
    var trees = {};
    branches(m, c).forEach(function (b) { trees[b.j] = b.tree; });
    var A = trees[hi], B = trees[lo];
    var nA = groupText(m, c, hi), nB = groupText(m, c, lo);
    var d = firstDifference(A, B);
    if (!d) return nA + ' and ' + nB + ' are the same group, so they tie.';
    if (d.level === 0) {
      var atomA = nA === d.a.el, atomB = nB === d.b.el;
      if (atomA && atomB) return nA + ' (atomic number ' + d.a.z + ') outranks ' + nB + ' (' + d.b.z + ').';
      var partA = atomA ? nA + ' has atomic number ' + d.a.z : nA + ' is attached through ' + d.a.el + ' (atomic number ' + d.a.z + ')';
      var partB = atomB ? nB + ' has atomic number ' + d.b.z : nB + ' is attached through ' + d.b.el + ' (' + d.b.z + ')';
      return nA + ' outranks ' + nB + ': ' + partA + ', and ' + partB + '.';
    }
    var first = A.el;
    var diffA = d.setA[d.k], diffB = d.setB[d.k];
    var beats = (diffA ? SYM(diffA) : 'nothing') + ' beats ' + (diffB ? SYM(diffB) : 'nothing');
    var dupAtom = d.setA.concat(d.setB).filter(function (n) { return n.dup; })[0];
    var dupNote = dupAtom ? ' The double bond to ' + dupAtom.el + ' counts twice, so ' + dupAtom.el + ' is listed two times.' : '';
    if (d.level === 1) {
      return 'Both ' + nA + ' and ' + nB + ' are attached through ' + first + '. List the atoms on that ' + first +
        ', highest first: ' + nA + ' has ' + setText(d.setA) + ' and ' + nB + ' has ' + setText(d.setB) +
        '. At the first point of difference ' + beats + ', so ' + nA + ' wins.' + dupNote;
    }
    var shared = setText(A.kids);
    return 'Both ' + nA + ' and ' + nB + ' are attached through ' + first + ' carrying ' + shared +
      ', a tie. Move one atom further out, to the highest atom of each: ' + nA + ' now has ' + setText(d.setA) +
      ' and ' + nB + ' has ' + setText(d.setB) + '. ' + beats.charAt(0).toUpperCase() + beats.slice(1) +
      ', so ' + nA + ' wins.' + dupNote;
  }

  /* The sphere at which hi and lo are decided: 0 = the first atoms differ. */
  function decidedAt(m, c, hi, lo) {
    var trees = {};
    branches(m, c).forEach(function (b) { trees[b.j] = b.tree; });
    var d = firstDifference(trees[hi], trees[lo]);
    return d ? d.level : -1;
  }

  /* The atoms on a group's first atom, as Klein writes them: (C, H, H). */
  function setOf(m, c, j) {
    var trees = {};
    branches(m, c).forEach(function (b) { trees[b.j] = b.tree; });
    return setText(trees[j].kids);
  }

  return {
    rank: rank, isCentre: isCentre, centres: centres, priorities: priorities, label: label, handed: handed,
    explain: explain, decidedAt: decidedAt, setOf: setOf, groupText: groupText, cmpTrees: cmp
  };
})();

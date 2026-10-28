/* mol.js: molecules as graphs, read from SMILES, with their stereochemistry.
 *
 * Every molecule in the activity is written once, as a SMILES string (or, for
 * a cyclohexane, as the flat-ring spec of the chairs activity). Everything a
 * student sees or answers is computed from the graph: the bond-line drawing
 * (layout.js), the name (name.js), R and S and E and Z (CIP below), the
 * products of every reaction (react.js) and the 3D models (build3d.js).
 *
 * The graph keeps heavy atoms; hydrogen atoms are counted on their atom
 * (`h`) unless a step needs one drawn, when it becomes a real atom
 * (`explicitH`). Each atom also keeps an `id` that survives a reaction, so a
 * product can be laid beside its substrate atom for atom.
 *
 * Stereochemistry is stored the way SMILES states it, independent of any
 * drawing:
 *   atom.parity = { nb: [a, b, c, d], sign }   the four neighbours (-1 for an
 *       implicit H) and the sign of the signed volume
 *       (b - a) . ((c - a) x (d - a)) they would have in 3D. SMILES "@" is
 *       sign -1 and "@@" is +1.
 *   bond.cfg = { na, nb, rel }                  a double bond: neighbour na of
 *       bond.a and nb of bond.b are 'cis' or 'trans'.
 * A carbon is R when its neighbours in priority order 4, 1, 2, 3 have a
 * negative signed volume (seen with 4 at the back, 1 → 2 → 3 is clockwise).
 * tools/validate.js checks this against textbook molecules.
 */

var ELEMENTS = {
  H:  { z: 1,  name: 'hydrogen', valence: 1, color: '#f3f4f5', edge: '#8e979f', ball: 0.27, vdw: 1.10, ve: 1 },
  C:  { z: 6,  name: 'carbon',   valence: 4, color: '#5a6168', edge: '#2b2f33', ball: 0.40, vdw: 1.70, ve: 4 },
  N:  { z: 7,  name: 'nitrogen', valence: 3, color: '#3f6fd8', edge: '#1c3a80', ball: 0.40, vdw: 1.55, ve: 5 },
  O:  { z: 8,  name: 'oxygen',   valence: 2, color: '#e5352b', edge: '#7e1712', ball: 0.40, vdw: 1.52, ve: 6 },
  F:  { z: 9,  name: 'fluorine', valence: 1, color: '#a6d65c', edge: '#557a25', ball: 0.38, vdw: 1.47, ve: 7 },
  S:  { z: 16, name: 'sulfur',   valence: 2, color: '#e3c22b', edge: '#7d6a0d', ball: 0.52, vdw: 1.80, ve: 6 },
  Cl: { z: 17, name: 'chlorine', valence: 1, color: '#36b14c', edge: '#1d6e2c', ball: 0.56, vdw: 1.75, ve: 7 },
  Br: { z: 35, name: 'bromine',  valence: 1, color: '#9a4a24', edge: '#4f220c', ball: 0.64, vdw: 1.85, ve: 7 },
  I:  { z: 53, name: 'iodine',   valence: 1, color: '#8043a6', edge: '#46205e', ball: 0.74, vdw: 1.98, ve: 7 }
};

var HALOGENS = ['F', 'Cl', 'Br', 'I'];

/* Bond lengths in ångströms. */
function bondLength(a, b, order) {
  var k = [a, b].sort().join('-') + (order === 2 ? '=' : order === 3 ? '#' : '');
  var L = {
    'C-C': 1.54, 'C-C=': 1.34, 'C-H': 1.09, 'C-O': 1.43, 'H-O': 0.96, 'C-N': 1.47, 'C-N#': 1.16, 'C-S': 1.82,
    'H-S': 1.34, 'C-F': 1.35, 'C-Cl': 1.78, 'Br-C': 1.94, 'C-I': 2.14, 'N-N': 1.24, 'N-N=': 1.24
  };
  return L[k] || 1.5;
}

var Mol = (function () {
  'use strict';

  function M() { this.atoms = []; this.bonds = []; }

  M.prototype.add = function (el, o) {
    o = o || {};
    var a = { el: el, h: o.h || 0, charge: o.charge || 0, parity: null, id: o.id != null ? o.id : this.atoms.length };
    Object.keys(o).forEach(function (k) { if (!(k in a)) a[k] = o[k]; });
    this.atoms.push(a);
    return this.atoms.length - 1;
  };

  M.prototype.bond = function (a, b, order) {
    this.bonds.push({ a: a, b: b, order: order || 1, cfg: null });
    return this.bonds.length - 1;
  };

  /* Neighbours of atom i: [{ j, b (bond index), order }]. */
  M.prototype.nb = function (i) {
    var out = [];
    this.bonds.forEach(function (bd, k) {
      if (bd.a === i) out.push({ j: bd.b, b: k, order: bd.order });
      else if (bd.b === i) out.push({ j: bd.a, b: k, order: bd.order });
    });
    return out;
  };

  M.prototype.bondBetween = function (i, j) {
    for (var k = 0; k < this.bonds.length; k++) {
      var b = this.bonds[k];
      if ((b.a === i && b.b === j) || (b.a === j && b.b === i)) return k;
    }
    return -1;
  };

  /* Heavy (non-H) neighbours, and carbon neighbours. */
  M.prototype.heavy = function (i) { var m = this; return this.nb(i).filter(function (x) { return m.atoms[x.j].el !== 'H'; }); };
  M.prototype.carbonsOn = function (i) { var m = this; return this.nb(i).filter(function (x) { return m.atoms[x.j].el === 'C'; }); };

  /* Every H on atom i, counted or drawn. */
  M.prototype.hCount = function (i) {
    var m = this;
    return this.atoms[i].h + this.nb(i).filter(function (x) { return m.atoms[x.j].el === 'H'; }).length;
  };

  M.prototype.byId = function (id) {
    for (var i = 0; i < this.atoms.length; i++) if (this.atoms[i].id === id) return i;
    return -1;
  };

  M.prototype.clone = function () {
    var c = new M();
    c.atoms = this.atoms.map(function (a) {
      var b = {};
      Object.keys(a).forEach(function (k) { b[k] = a[k]; });
      if (a.parity) b.parity = { nb: a.parity.nb.slice(), sign: a.parity.sign };
      return b;
    });
    c.bonds = this.bonds.map(function (b) {
      return { a: b.a, b: b.b, order: b.order, cfg: b.cfg ? { na: b.cfg.na, nb: b.cfg.nb, rel: b.cfg.rel } : null };
    });
    Object.keys(this).forEach(function (k) { if (k !== 'atoms' && k !== 'bonds') c[k] = this[k]; }, this);
    return c;
  };

  /* A copy without the atoms in `gone`; indices are renumbered, and
     parities and double-bond references follow. */
  M.prototype.without = function (gone) {
    var keep = [], map = {};
    this.atoms.forEach(function (a, i) { if (gone.indexOf(i) < 0) { map[i] = keep.length; keep.push(i); } });
    var c = this.clone();
    c.atoms = keep.map(function (i) { return c.atoms[i]; });
    c.atoms.forEach(function (a) {
      if (a.parity) {
        if (a.parity.nb.some(function (j) { return j >= 0 && map[j] == null; })) a.parity = null;
        else a.parity.nb = a.parity.nb.map(function (j) { return j < 0 ? j : map[j]; });
      }
    });
    c.bonds = c.bonds.filter(function (b) { return map[b.a] != null && map[b.b] != null; }).map(function (b) {
      var nb = { a: map[b.a], b: map[b.b], order: b.order, cfg: null };
      if (b.cfg && map[b.cfg.na] != null && map[b.cfg.nb] != null) nb.cfg = { na: map[b.cfg.na], nb: map[b.cfg.nb], rel: b.cfg.rel };
      return nb;
    });
    c.map = map;
    return c;
  };

  /* Make one H on atom i a real atom, so it can be drawn and pointed at.
     Returns the new atom's index. */
  M.prototype.explicitH = function (i, tag) {
    var a = this.atoms[i];
    if (a.h < 1) throw new Error('No H to draw on atom ' + i);
    a.h--;
    var k = this.add('H', { id: 'H' + a.id + (tag ? tag : '') + '.' + this.atoms.length });
    this.bond(i, k, 1);
    if (a.parity) {
      var p = a.parity.nb.indexOf(-1);
      if (p >= 0) a.parity.nb[p] = k;
    }
    return k;
  };

  /* Lone pairs on atom i, from its valence electrons, bonds and charge. */
  M.prototype.lonePairs = function (i) {
    var a = this.atoms[i], e = ELEMENTS[a.el];
    if (!e || a.el === 'H') return 0;
    var bonds = a.h + this.nb(i).reduce(function (s, x) { return s + x.order; }, 0);
    return Math.max(0, Math.round((e.ve - a.charge - bonds) / 2));
  };

  /* ------------------------------------------------------------ SMILES */

  var ORGANIC = ['Cl', 'Br', 'B', 'C', 'N', 'O', 'S', 'F', 'I', 'P'];

  function parse(s) {
    var m = new M();
    var order = [];                 /* per atom, its neighbours in written order */
    var chiral = [];
    var bracketH = [];
    var dirs = [];                  /* directional single bonds: { b, ch, left } */
    var stack = [], rings = {};
    var prev = null, bo = null, dir = null, i = 0;

    function link(a, b, ord, ch) {
      var k = m.bond(a, b, ord || 1);
      if (ch) dirs.push({ b: k, ch: ch, left: a });
      return k;
    }

    while (i < s.length) {
      var c = s.charAt(i);
      if (c === '(') { stack.push(prev); i++; continue; }
      if (c === ')') { prev = stack.pop(); i++; continue; }
      if (c === '-') { bo = 1; i++; continue; }
      if (c === '=') { bo = 2; i++; continue; }
      if (c === '#') { bo = 3; i++; continue; }
      if (c === '/' || c === '\\') { bo = 1; dir = c; i++; continue; }
      if (/[0-9]/.test(c)) {
        if (rings[c]) {
          var r = rings[c];
          link(r.atom, prev, bo || r.bo || 1, null);
          order[r.atom][r.slot] = prev;
          order[prev].push(r.atom);
          delete rings[c];
        } else {
          rings[c] = { atom: prev, slot: order[prev].length, bo: bo };
          order[prev].push(null);
        }
        bo = null; dir = null; i++;
        continue;
      }
      var el, charge = 0, h = null, ch = '';
      if (c === '[') {
        var end = s.indexOf(']', i);
        var body = s.slice(i + 1, end);
        var mm = /^([A-Z][a-z]?)(@@|@)?(H\d?)?([+-]\d?)?$/.exec(body);
        if (!mm) throw new Error('Bad bracket atom [' + body + '] in ' + s);
        el = mm[1];
        ch = mm[2] || '';
        h = mm[3] ? (mm[3].length > 1 ? +mm[3].slice(1) : 1) : 0;
        if (mm[4]) charge = (mm[4].charAt(0) === '+' ? 1 : -1) * (mm[4].length > 1 ? +mm[4].slice(1) : 1);
        i = end + 1;
      } else {
        el = null;
        for (var k = 0; k < ORGANIC.length; k++) if (s.substr(i, ORGANIC[k].length) === ORGANIC[k]) { el = ORGANIC[k]; break; }
        if (!el) throw new Error('Bad character ' + c + ' in ' + s);
        i += el.length;
      }
      var a = m.add(el, { charge: charge });
      order[a] = [];
      chiral[a] = ch;
      bracketH[a] = h;
      if (prev != null) {
        link(prev, a, bo, dir);
        order[prev].push(a);
        order[a].push(prev);
      }
      if (h) order[a].push(-1);
      prev = a; bo = null; dir = null;
    }

    /* implicit H: brackets say; the organic subset fills its normal valence */
    m.atoms.forEach(function (a, j) {
      if (bracketH[j] != null) { a.h = bracketH[j]; return; }
      var used = m.nb(j).reduce(function (t, x) { return t + x.order; }, 0);
      a.h = Math.max(0, ELEMENTS[a.el].valence - used);
    });
    /* tetrahedral centres */
    m.atoms.forEach(function (a, j) {
      if (!chiral[j]) return;
      if (order[j].length !== 4) throw new Error('Chiral atom without four neighbours in ' + s);
      a.parity = { nb: order[j].slice(), sign: chiral[j] === '@' ? -1 : 1 };
    });
    /* double bonds: which side each directional neighbour is on */
    m.bonds.forEach(function (bd) {
      if (bd.order !== 2) return;
      function sideOf(x) {
        var found = null;
        dirs.forEach(function (d) {
          var b = m.bonds[d.b];
          if (b === bd) return;
          var other = b.a === x ? b.b : b.b === x ? b.a : null;
          if (other == null || found) return;
          /* '/' rises left to right: the right-hand atom is up */
          var otherIsRight = d.left === x;
          var up = d.ch === '/' ? otherIsRight : !otherIsRight;
          found = { n: other, up: up };
        });
        return found;
      }
      var sa = sideOf(bd.a), sb = sideOf(bd.b);
      if (sa && sb) bd.cfg = { na: sa.n, nb: sb.n, rel: sa.up === sb.up ? 'cis' : 'trans' };
    });
    return m;
  }

  /* --------------------------------------------- a flat cyclohexane spec */

  /* The chairs activity's way of writing a ring: { 1: { t: 'Cl' }, 2: { b:
     'CH3' } }, t for the top face (a wedge), b for the bottom (a dash).
     Groups are SMILES fragments. The parity of each substituted carbon is
     read from a flat hexagon with the top face toward the reader. */
  var RING_GROUPS = { Cl: 'Cl', Br: 'Br', I: 'I', F: 'F', CH3: 'C', Et: 'CC', iPr: 'C(C)C', tBu: 'C(C)(C)C',
                      OH: 'O', SH: 'S', CN: 'C#N', N3: 'N=[N+]=[N-]', OEt: 'OCC', OMe: 'OC', SCH3: 'SC' };

  function fromRing(spec, ene) {
    var m = new M();
    var ring = [];
    for (var c = 1; c <= 6; c++) ring.push(m.add('C', { ringNum: c }));
    for (c = 0; c < 6; c++) m.bond(ring[c], ring[(c + 1) % 6], ene && ene[0] === c + 1 && ene[1] === (c + 1) % 6 + 1 ? 2 : 1);
    var faces = {};
    Object.keys(spec).forEach(function (k) {
      var at = ring[k - 1];
      ['t', 'b'].forEach(function (f) {
        var g = spec[k][f];
        if (!g) return;
        var frag = parse(RING_GROUPS[g] || g);
        var off = m.atoms.length;
        frag.atoms.forEach(function (a) { m.add(a.el, { h: a.h, charge: a.charge }); });
        frag.bonds.forEach(function (b) { m.bond(b.a + off, b.b + off, b.order); });
        m.bond(at, off, 1);
        m.atoms[off].h = Math.max(0, m.atoms[off].h - 1);
        faces[at] = faces[at] || {};
        faces[at][f] = off;
      });
    });
    m.atoms.forEach(function (a, i) {
      if (i > 5) return;
      var used = m.nb(i).reduce(function (t, x) { return t + x.order; }, 0);
      a.h = 4 - used;
    });
    /* parity from the flat hexagon: ring neighbours in the page, the top
       group toward the reader, the bottom one away */
    ring.forEach(function (at, c) {
      var f = faces[at];
      if (!f) return;
      var ang = function (k) { return k * Math.PI / 3; };
      var P = function (k) { return [Math.cos(ang(k)), Math.sin(ang(k)), 0]; };
      var me = P(c), out = me;
      var prv = P((c + 5) % 6), nxt = P((c + 1) % 6);
      var up = GEOM.add(me, GEOM.add(GEOM.mul(out, 0.5), [0, 0, 0.8]));
      var dn = GEOM.add(me, GEOM.add(GEOM.mul(out, 0.5), [0, 0, -0.8]));
      var nb = [ring[(c + 5) % 6], ring[(c + 1) % 6], f.t != null ? f.t : -1, f.b != null ? f.b : -1];
      if (nb[2] === -1 && nb[3] === -1) return;
      if (m.atoms[at].h + (f.t != null ? 1 : 0) + (f.b != null ? 1 : 0) !== 2 && !(f.t != null && f.b != null)) return;
      var v = GEOM.det3(GEOM.sub(nxt, prv), GEOM.sub(up, prv), GEOM.sub(dn, prv));
      m.atoms[at].parity = { nb: nb, sign: v > 0 ? 1 : -1 };
    });
    m.ring = ring;
    m.ringSpec = spec;
    return m;
  }

  /* ------------------------------------------------------- CIP priorities */

  var DEPTH = 9;

  /* The branch of the hierarchical digraph reached from `parent` into atom i.
     Duplicates stand for the far end of a multiple bond and for a ring
     closing back onto the path. */
  function node(m, i, parent, path, depth) {
    var a = m.atoms[i];
    var n = { z: ELEMENTS[a.el].z, kids: [] };
    if (depth > DEPTH) return n;
    var p2 = path.concat([i]);
    m.nb(i).forEach(function (x) {
      if (x.j === parent) {
        for (var k = 1; k < x.order; k++) n.kids.push({ z: ELEMENTS[m.atoms[x.j].el].z, kids: [], dup: true });
        return;
      }
      if (path.indexOf(x.j) >= 0) n.kids.push({ z: ELEMENTS[m.atoms[x.j].el].z, kids: [], dup: true });
      else n.kids.push(node(m, x.j, i, p2, depth + 1));
      for (var k2 = 1; k2 < x.order; k2++) n.kids.push({ z: ELEMENTS[m.atoms[x.j].el].z, kids: [], dup: true });
    });
    for (var h = 0; h < a.h; h++) n.kids.push({ z: 1, kids: [] });
    n.kids.sort(function (p, q) { return cmp(q, p); });
    return n;
  }

  var PHANTOM = { z: 0, kids: [] };

  /* Compare two branches sphere by sphere, each sphere's atoms in the order
     of the branches they hang from: the first point of difference decides. */
  function cmp(A, B) {
    var la = [A], lb = [B];
    for (var guard = 0; guard < 40; guard++) {
      var n = Math.max(la.length, lb.length);
      for (var k = 0; k < n; k++) {
        var za = la[k] ? la[k].z : 0, zb = lb[k] ? lb[k].z : 0;
        if (za !== zb) return za - zb;
      }
      var na = [], nb2 = [];
      for (k = 0; k < n; k++) {
        var ka = la[k] ? la[k].kids : [], kb = lb[k] ? lb[k].kids : [];
        for (var q = 0; q < 3; q++) { na.push(ka[q] || PHANTOM); nb2.push(kb[q] || PHANTOM); }
      }
      if (!na.some(function (x) { return x.z; }) && !nb2.some(function (x) { return x.z; })) return 0;
      la = na; lb = nb2;
    }
    return 0;
  }

  /* The substituents of atom c (ignoring `skip`), highest priority first:
     [{ j (index, or -1 for an implicit H), n (branch) }], and whether any
     two tie. */
  function rank(m, c, skip) {
    var list = [];
    m.nb(c).forEach(function (x) {
      if (x.j === skip) return;
      list.push({ j: x.j, n: node(m, x.j, c, [c], 1) });
    });
    for (var h = 0; h < m.atoms[c].h; h++) list.push({ j: -1, n: { z: 1, kids: [] } });
    list.sort(function (p, q) { return cmp(q.n, p.n); });
    var tie = false;
    for (var k = 1; k < list.length; k++) if (cmp(list[k - 1].n, list[k].n) === 0) tie = true;
    return { order: list, tie: tie };
  }

  function permSign(p) {
    var s = 1, a = p.slice();
    for (var i = 0; i < a.length; i++) for (var j = i + 1; j < a.length; j++) if (a[i] > a[j]) s = -s;
    return s;
  }

  /* 'R', 'S', or null when the atom is not a chirality centre or its
     configuration is not stated. */
  function rs(m, c) {
    var a = m.atoms[c];
    if (!a.parity) return null;
    var r = rank(m, c);
    if (r.tie || r.order.length !== 4) return null;
    var o = r.order.map(function (x) { return x.j; });
    var pos = [o[3], o[0], o[1], o[2]].map(function (j) { return a.parity.nb.indexOf(j); });
    if (pos.some(function (p) { return p < 0; })) return null;
    var v = a.parity.sign * permSign(pos);
    return v < 0 ? 'R' : 'S';
  }

  /* Is atom c a chirality centre (four different groups)? Independent of
     whether its configuration is stated. */
  function isCentre(m, c) {
    var a = m.atoms[c];
    if (a.el !== 'C') return false;
    var deg = a.h + m.nb(c).length;
    if (deg !== 4 || m.nb(c).some(function (x) { return x.order > 1; }) || a.h > 1) return false;
    return !rank(m, c).tie;
  }

  /* The higher-priority group on atom x of a double bond x=y, or null if its
     two groups tie. */
  function topOn(m, x, y) {
    var r = rank(m, x, y);
    if (r.order.length < 2 || r.tie) return null;
    return r.order[0].j;
  }

  /* 'E', 'Z' or null for double bond k. */
  function ez(m, k) {
    var b = m.bonds[k];
    if (b.order !== 2 || !b.cfg) return null;
    var ta = topOn(m, b.a, b.b), tb = topOn(m, b.b, b.a);
    if (ta == null || tb == null) return null;
    var same = b.cfg.rel === 'cis';
    if (ta !== b.cfg.na) same = !same;
    if (tb !== b.cfg.nb) same = !same;
    return same ? 'Z' : 'E';
  }

  /* Can double bond k have E and Z isomers (two different groups on each end)? */
  function isStereoAlkene(m, k) {
    var b = m.bonds[k];
    if (b.order !== 2) return false;
    /* in a six-membered ring a C=C can only be cis */
    var ring = ringOf(m);
    if (ring && ring.indexOf(b.a) >= 0 && ring.indexOf(b.b) >= 0) return false;
    if (m.atoms[b.a].el !== 'C' || m.atoms[b.b].el !== 'C') return false;
    return topOn(m, b.a, b.b) != null && topOn(m, b.b, b.a) != null &&
      m.nb(b.a).length + m.atoms[b.a].h === 3 && m.nb(b.b).length + m.atoms[b.b].h === 3;
  }

  /* Invert a centre's configuration in place (SN2), or set it. */
  function setParity(m, c, nb, sign) { m.atoms[c].parity = { nb: nb.slice(), sign: sign }; }

  /* ------------------------------------------------------ classification */

  /* Methyl, 1°, 2° or 3°: the number of carbons on the carbon. */
  function degree(m, c) {
    var n = m.carbonsOn(c).length;
    return n;
  }

  /* Atoms reachable from `from` without crossing `stop`. */
  function side(m, from, stop) {
    var seen = [from], todo = [from];
    while (todo.length) {
      var i = todo.pop();
      m.nb(i).forEach(function (x) {
        if (x.j === stop && i === from) return;
        if (seen.indexOf(x.j) < 0 && x.j !== stop) { seen.push(x.j); todo.push(x.j); }
      });
    }
    return seen;
  }

  /* The atoms of the 6-membered carbon ring, in ring order, or null. */
  function ringOf(m) {
    if (m.ring) return m.ring.slice();
    var n = m.atoms.length;
    for (var s = 0; s < n; s++) {
      if (m.atoms[s].el !== 'C') continue;
      var found = null;
      (function walk(path) {
        if (found) return;
        var last = path[path.length - 1];
        m.nb(last).forEach(function (x) {
          if (found || m.atoms[x.j].el !== 'C') return;
          if (x.j === path[0] && path.length === 6) { found = path.slice(); return; }
          if (path.indexOf(x.j) >= 0 || path.length >= 6) return;
          walk(path.concat([x.j]));
        });
      })([s]);
      if (found) return found;
    }
    return null;
  }

  return {
    M: M,
    parse: parse,
    fromRing: fromRing,
    rank: rank,
    cmp: cmp,
    rs: rs,
    ez: ez,
    isCentre: isCentre,
    isStereoAlkene: isStereoAlkene,
    topOn: topOn,
    setParity: setParity,
    degree: degree,
    side: side,
    ringOf: ringOf,
    permSign: permSign,
    RING_GROUPS: RING_GROUPS
  };
})();

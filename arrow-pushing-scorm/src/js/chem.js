/* chem.js: the electron bookkeeping behind every curved arrow.
 *
 * A state is a drawing with its electrons counted:
 *   atoms  [{ id, el, h, lp, x, y, label }]   h = hidden H atoms (bond-line
 *          style), lp = lone pairs; x, y in bond lengths, y up
 *   bonds  [{ a, b, o }]                        atom ids, bond order
 * The charge on an atom is never stored: it is the formal charge,
 * valence electrons - 2 x lone pairs - bonds (hidden H included).
 *
 * Arrow keys: 'lp:A' a lone pair on atom A, 'bond:A-B' the bond between A
 * and B, 'atom:A' an atom. An arrow { from, to } always moves one pair of
 * electrons. apply() moves them all at once, as one step of a mechanism,
 * and returns the new state, or the rule the arrows break:
 *   tail on an atom (never on a positive charge), a head that is neither a
 *   new bond nor a new lone pair, a fifth bond to C, N, O or F (Klein:
 *   never more than four orbitals), an H with two bonds, an H left with none.
 * An arrow from a bond to a third atom can mean a new bond to either end of
 * the old one; every reading is tried, and a step's key decides which.
 *
 * classify() names the step from the bonds that changed, by Klein's four
 * patterns (6.8): an H that moves without its electrons is a proton
 * transfer; an H or a carbon that moves with them to the carbocation next
 * door is a carbocation rearrangement; any other new sigma bond is a
 * nucleophilic attack and any other broken sigma bond is loss of a leaving
 * group. Two at once is a concerted step. tools/validate.js checks every
 * mechanism against Klein's own labels.
 */

var Chem = (function () {
  'use strict';

  var VE = { H: 1, Li: 1, C: 4, N: 5, O: 6, F: 7, S: 6, Cl: 7, Br: 7, I: 7 };
  var STD = { H: 1, Li: 1, C: 4, N: 3, O: 2, F: 1, S: 2, Cl: 1, Br: 1, I: 1 };
  /* Pauling electronegativities, for partial charges */
  var EN = { H: 2.20, Li: 0.98, C: 2.55, N: 3.04, O: 3.44, F: 3.98, S: 2.58, Cl: 3.16, Br: 2.96, I: 2.66 };
  var ROW2 = ['C', 'N', 'O', 'F'];
  var HALOGEN = ['F', 'Cl', 'Br', 'I'];
  var RAD = Math.PI / 180;

  var PATTERN = {
    nuc: 'Nucleophilic attack',
    lg: 'Loss of a leaving group',
    pt: 'Proton transfer',
    shift: 'Carbocation rearrangement'
  };
  var ORDER = ['pt', 'nuc', 'lg', 'shift'];

  /* ------------------------------------------------------------ states */

  function pairKey(a, b) { return a < b ? a + '-' + b : b + '-' + a; }

  function atom(st, id) {
    for (var i = 0; i < st.atoms.length; i++) if (st.atoms[i].id === id) return st.atoms[i];
    return null;
  }
  function bond(st, a, b) {
    for (var i = 0; i < st.bonds.length; i++) {
      var x = st.bonds[i];
      if ((x.a === a && x.b === b) || (x.a === b && x.b === a)) return x;
    }
    return null;
  }
  function order(st, a, b) { var x = bond(st, a, b); return x ? x.o : 0; }
  function neighbours(st, id) {
    var out = [];
    st.bonds.forEach(function (x) {
      if (x.o <= 0) return;
      if (x.a === id) out.push({ id: x.b, o: x.o });
      else if (x.b === id) out.push({ id: x.a, o: x.o });
    });
    return out;
  }
  function bondSum(st, id) { return neighbours(st, id).reduce(function (s, n) { return s + n.o; }, 0); }
  function charge(st, id) {
    var a = atom(st, id);
    return VE[a.el] - 2 * a.lp - bondSum(st, id) - a.h;
  }
  /* orbitals in use: bonds (a double bond still one sigma and one pi, two),
     hidden H atoms and lone pairs */
  function orbitals(st, id) { var a = atom(st, id); return bondSum(st, id) + a.h + a.lp; }

  function clone(st) {
    return {
      atoms: st.atoms.map(function (a) { var b = {}; Object.keys(a).forEach(function (k) { b[k] = a[k]; }); return b; }),
      bonds: st.bonds.map(function (x) { return { a: x.a, b: x.b, o: x.o }; })
    };
  }

  /* Carbons bonded to a carbon (methyl 0, primary 1, secondary 2, tertiary 3). */
  function degree(st, id) { return neighbours(st, id).filter(function (n) { return atom(st, n.id).el === 'C'; }).length; }
  function isCation(st, id) { var a = atom(st, id); return a.el === 'C' && charge(st, id) > 0; }

  /* ---------------------------------------------------------- building */

  /* Atom specs: [id, el, place, opts]. place is [x, y], or [ref, angle] or
     [ref, angle, length]: one bond from atom ref at that angle (degrees, 0
     to the right, 90 up). opts: c charge, h hidden H (otherwise the usual
     valence), o order of the bond to ref, nob no bond to ref, label text.
     Extra bonds: [a, b, order]. */
  function build(spec) {
    var st = { atoms: [], bonds: [] };
    var given = {};
    spec.atoms.forEach(function (s) {
      var id = s[0], el = s[1], pl = s[2], o = s[3] || {};
      var p = place(st, pl);
      st.atoms.push({ id: id, el: el, x: p[0], y: p[1], h: 0, lp: 0, label: o.label || null });
      given[id] = o;
      if (typeof pl[0] === 'string' && !o.nob) st.bonds.push({ a: pl[0], b: id, o: o.o || 1 });
    });
    (spec.bonds || []).forEach(function (b) { st.bonds.push({ a: b[0], b: b[1], o: b[2] || 1 }); });
    st.atoms.forEach(function (a) {
      var o = given[a.id], c = o.c || 0, s = bondSum(st, a.id);
      if (o.h != null) a.h = o.h;
      else if (a.el === 'C') a.h = Math.max(0, 4 - s - Math.abs(c));
      else a.h = Math.max(0, STD[a.el] + c - s);
      if (a.el === 'H') a.h = 0;
      var e = VE[a.el] - c - s - a.h;
      if (e < 0 || e % 2) throw new Error('Atom ' + a.id + ' (' + a.el + ', charge ' + c + ') cannot have ' + e + ' non-bonding electrons');
      a.lp = e / 2;
    });
    return st;
  }

  function place(st, pl) {
    if (typeof pl[0] !== 'string') return [pl[0], pl[1]];
    var r = atom(st, pl[0]);
    if (!r) throw new Error('No atom ' + pl[0] + ' to place from');
    var len = pl[2] != null ? pl[2] : 1;
    return [r.x + Math.cos(pl[1] * RAD) * len, r.y + Math.sin(pl[1] * RAD) * len];
  }

  /* Move atoms in a copy of a state, for the drawing after a step:
     moves: [['id id id', dx, dy]] translations, then after: { id: place }. */
  function arrange(st, moves, after) {
    var out = clone(st);
    (moves || []).forEach(function (m) {
      m[0].split(' ').forEach(function (id) { var a = atom(out, id); a.x += m[1]; a.y += m[2]; });
    });
    Object.keys(after || {}).forEach(function (id) {
      var p = place(out, after[id]);
      var a = atom(out, id);
      a.x = p[0]; a.y = p[1];
    });
    return out;
  }

  /* Make one hidden H on atom id a drawn atom, at angle ang. */
  function showH(st, id, hid, ang) {
    var out = clone(st), a = atom(out, id);
    if (a.h < 1) throw new Error('No hidden H on ' + id);
    a.h--;
    out.atoms.push({ id: hid, el: 'H', x: a.x + Math.cos(ang * RAD), y: a.y + Math.sin(ang * RAD), h: 0, lp: 0, label: null });
    out.bonds.push({ a: id, b: hid, o: 1 });
    return out;
  }

  /* ---------------------------------------------------------- the arrows */

  function parseKey(k) {
    var i = k.indexOf(':');
    var kind = k.slice(0, i), rest = k.slice(i + 1);
    if (kind === 'bond') { var j = rest.indexOf('-'); return { kind: kind, a: rest.slice(0, j), b: rest.slice(j + 1) }; }
    return { kind: kind, a: rest };
  }
  function lpKey(a) { return 'lp:' + a; }
  function bondKey(a, b) { return 'bond:' + pairKey(a, b); }
  function atomKey(a) { return 'atom:' + a; }

  /* The ways one arrow can move its pair: [{ src, dst }] or { err }.
     src: { lp: A } or { bond: [A, B] }; dst: { lp: D } or { bond: [X, D] }. */
  function readings(st, arw) {
    var f = parseKey(arw.from), t = parseKey(arw.to);
    if (f.kind === 'atom') return { err: charge(st, f.a) > 0 ? 'tailPlus' : 'tailAtom', atom: f.a };
    if (arw.from === arw.to) return { err: 'nowhere' };
    if (f.kind === 'lp') {
      if (t.kind === 'atom') {
        if (t.a === f.a) return { err: 'nowhere' };
        return [{ src: { lp: f.a }, dst: { bond: [f.a, t.a] } }];
      }
      if (t.kind === 'bond') {
        if (t.a === f.a || t.b === f.a) return [{ src: { lp: f.a }, dst: { bond: [t.a, t.b] } }];
        return { err: 'reach' };
      }
      return { err: 'headLp' };
    }
    /* from a bond */
    if (t.kind === 'atom') {
      if (t.a === f.a || t.a === f.b) return [{ src: { bond: [f.a, f.b] }, dst: { lp: t.a } }];
      return [{ src: { bond: [f.a, f.b] }, dst: { bond: [f.b, t.a] } }, { src: { bond: [f.a, f.b] }, dst: { bond: [f.a, t.a] } }];
    }
    if (t.kind === 'bond') {
      var shared = [f.a, f.b].filter(function (x) { return x === t.a || x === t.b; });
      if (shared.length === 1) return [{ src: { bond: [f.a, f.b] }, dst: { bond: [t.a, t.b] } }];
      return { err: 'reach' };
    }
    return { err: 'headLp' };
  }

  /* Move the pairs. Returns { state } or { err, atom, arrow }. */
  function move(st, picks) {
    var out = clone(st);
    for (var k = 0; k < picks.length; k++) {
      var m = picks[k];
      if (m.src.lp != null) {
        var a = atom(out, m.src.lp);
        if (a.lp < 1) return { err: 'noLp', atom: m.src.lp, arrow: k };
        a.lp--;
      } else {
        var b = bond(out, m.src.bond[0], m.src.bond[1]);
        if (!b || b.o < 1) return { err: 'noBond', arrow: k };
        b.o--;
      }
      if (m.dst.lp != null) atom(out, m.dst.lp).lp++;
      else {
        var x = m.dst.bond[0], y = m.dst.bond[1];
        if (x === y) return { err: 'nowhere', arrow: k };
        var d = bond(out, x, y);
        if (d) d.o++;
        else out.bonds.push({ a: x, b: y, o: 1 });
      }
    }
    out.bonds = out.bonds.filter(function (x) { return x.o > 0; });
    for (var i = 0; i < out.atoms.length; i++) {
      var at = out.atoms[i], id = at.id, s = bondSum(out, id);
      if (out.bonds.some(function (x) { return x.o > 3; })) return { err: 'quad' };
      if (at.el === 'H') {
        if (s > 1) return { err: 'h2', atom: id };
        if (s === 0) return { err: 'bareH', atom: id };
        continue;
      }
      if (orbitals(out, id) > 4) return { err: 'octet', atom: id };
    }
    return { state: out };
  }

  /* Every reading of the arrows: [{ state, picks }] that obey the rules,
     or { err } for the first rule broken. */
  function apply(st, arrows) {
    var lists = [];
    for (var k = 0; k < arrows.length; k++) {
      var r = readings(st, arrows[k]);
      if (r.err) return { err: r.err, arrow: k, atom: r.atom };
      lists.push(r);
    }
    var ok = [], firstErr = null;
    (function walk(k, picks) {
      if (k === lists.length) {
        var res = move(st, picks);
        if (res.err) { if (!firstErr) firstErr = res; }
        else ok.push({ state: res.state, picks: picks.slice() });
        return;
      }
      lists[k].forEach(function (p) { picks.push(p); walk(k + 1, picks); picks.pop(); });
    })(0, []);
    if (!ok.length) return firstErr || { err: 'none' };
    /* a bond's pair going to a third atom: the reading that makes a new
       bond (not one more to a neighbour) first */
    ok.sort(function (p, q) { return newBonds(st, q) - newBonds(st, p); });
    return { all: ok, state: ok[0].state, picks: ok[0].picks };
  }
  function newBonds(st, r) {
    return r.picks.filter(function (m) { return m.dst.bond && !bond(st, m.dst.bond[0], m.dst.bond[1]); }).length;
  }

  /* Same electrons in the same places (positions aside). */
  function same(s1, s2) {
    if (s1.atoms.length !== s2.atoms.length) return false;
    for (var i = 0; i < s1.atoms.length; i++) {
      var a = s1.atoms[i], b = atom(s2, a.id);
      if (!b || a.lp !== b.lp || a.h !== b.h || a.el !== b.el) return false;
    }
    var m1 = {}, m2 = {};
    s1.bonds.forEach(function (x) { if (x.o) m1[pairKey(x.a, x.b)] = x.o; });
    s2.bonds.forEach(function (x) { if (x.o) m2[pairKey(x.a, x.b)] = x.o; });
    var k1 = Object.keys(m1), k2 = Object.keys(m2);
    return k1.length === k2.length && k1.every(function (k) { return m2[k] === m1[k]; });
  }

  /* The reading of `arrows` that gives `target`, or null. */
  function reach(st, arrows, target) {
    var r = apply(st, arrows);
    if (r.err) return null;
    for (var i = 0; i < r.all.length; i++) if (same(r.all[i].state, target)) return r.all[i];
    return null;
  }

  /* ------------------------------------------------------- what changed */

  /* Every bond that changed: [{ a, b, from, to }] */
  function changes(s1, s2) {
    var m = {};
    s1.bonds.forEach(function (x) { m[pairKey(x.a, x.b)] = { a: x.a, b: x.b, from: x.o, to: 0 }; });
    s2.bonds.forEach(function (x) {
      var k = pairKey(x.a, x.b);
      if (m[k]) m[k].to = x.o;
      else m[k] = { a: x.a, b: x.b, from: 0, to: x.o };
    });
    return Object.keys(m).map(function (k) { return m[k]; }).filter(function (c) { return c.from !== c.to; });
  }

  /* Bonds broken and bonds made, a pi bond counted on its own:
     { broken: [{ a, b, pi }], formed: [...] } */
  function ledger(s1, s2) {
    var out = { broken: [], formed: [] };
    changes(s1, s2).forEach(function (c) {
      for (var o = c.from; o > c.to; o--) out.broken.push({ a: c.a, b: c.b, pi: o > 1 });
      for (var p = c.from + 1; p <= c.to; p++) out.formed.push({ a: c.a, b: c.b, pi: p > 1 });
    });
    return out;
  }

  /* Klein's patterns for one step: ['pt', 'nuc', ...] in that order. */
  function classify(s1, s2) {
    var ch = changes(s1, s2);
    var sigmaBroken = ch.filter(function (c) { return c.from > 0 && c.to === 0; });
    var sigmaMade = ch.filter(function (c) { return c.from === 0 && c.to > 0; });
    var used = {}, found = {};
    function other(c, id) { return c.a === id ? c.b : c.a; }
    /* something that moved from one partner to another */
    s1.atoms.forEach(function (a) {
      var lost = sigmaBroken.filter(function (c) { return c.a === a.id || c.b === a.id; });
      var got = sigmaMade.filter(function (c) { return c.a === a.id || c.b === a.id; });
      if (lost.length !== 1 || got.length !== 1) return;
      var x = other(lost[0], a.id), y = other(got[0], a.id);
      var moverIsGroup = a.el === 'H' || (a.el === 'C' && atom(s1, x).el === 'C' && atom(s1, y).el === 'C');
      if (!moverIsGroup) return;
      var xBefore = charge(s1, x), xAfter = charge(s2, x);
      if (order(s1, x, y) > 0 && isCation(s1, y) && xAfter > xBefore) {
        found.shift = 1;
      } else if (a.el === 'H' && xAfter <= xBefore) {
        found.pt = 1;
      } else return;
      used[pairKey(lost[0].a, lost[0].b)] = 1;
      used[pairKey(got[0].a, got[0].b)] = 1;
    });
    sigmaMade.forEach(function (c) { if (!used[pairKey(c.a, c.b)]) found.nuc = 1; });
    sigmaBroken.forEach(function (c) { if (!used[pairKey(c.a, c.b)]) found.lg = 1; });
    return ORDER.filter(function (k) { return found[k]; });
  }

  /* ------------------------------------------------------------ pieces */

  /* Connected pieces: [[id, ...]] in drawing order. */
  function pieces(st) {
    var seen = {}, out = [];
    st.atoms.forEach(function (a) {
      if (seen[a.id]) return;
      var list = [], stack = [a.id];
      seen[a.id] = 1;
      while (stack.length) {
        var id = stack.pop();
        list.push(id);
        neighbours(st, id).forEach(function (n) { if (!seen[n.id]) { seen[n.id] = 1; stack.push(n.id); } });
      }
      out.push(list);
    });
    return out;
  }

  /* --------------------------------------------- comparing with SMILES */

  /* A small SMILES reader (no stereochemistry), for textbook anchors. */
  function smiles(s) {
    var atoms = [], bonds = [], stack = [], rings = {}, prev = null, bo = null, i = 0;
    var ORG = ['Cl', 'Br', 'C', 'N', 'O', 'S', 'F', 'I'];
    while (i < s.length) {
      var c = s.charAt(i);
      if (c === '(') { stack.push(prev); i++; continue; }
      if (c === ')') { prev = stack.pop(); i++; continue; }
      if (c === '.') { prev = null; i++; continue; }
      if (c === '=') { bo = 2; i++; continue; }
      if (c === '#') { bo = 3; i++; continue; }
      if (c === '-') { bo = 1; i++; continue; }
      if (/[0-9]/.test(c)) {
        if (rings[c]) { bonds.push({ a: rings[c].at, b: prev, o: bo || rings[c].bo || 1 }); delete rings[c]; }
        else rings[c] = { at: prev, bo: bo };
        bo = null; i++; continue;
      }
      var el, ch = 0, h = null;
      if (c === '[') {
        var end = s.indexOf(']', i), body = s.slice(i + 1, end);
        var mm = /^([A-Z][a-z]?)(H\d?)?([+-]\d?)?$/.exec(body);
        if (!mm) throw new Error('Bad SMILES atom [' + body + ']');
        el = mm[1];
        h = mm[2] ? (mm[2].length > 1 ? +mm[2].slice(1) : 1) : 0;
        if (mm[3]) ch = (mm[3].charAt(0) === '+' ? 1 : -1) * (mm[3].length > 1 ? +mm[3].slice(1) : 1);
        i = end + 1;
      } else {
        el = null;
        for (var k = 0; k < ORG.length; k++) if (s.substr(i, ORG[k].length) === ORG[k]) { el = ORG[k]; break; }
        if (!el) throw new Error('Bad SMILES character ' + c + ' in ' + s);
        i += el.length;
      }
      atoms.push({ el: el, h: h, c: ch });
      var n = atoms.length - 1;
      if (prev != null) bonds.push({ a: prev, b: n, o: bo || 1 });
      prev = n; bo = null;
    }
    atoms.forEach(function (a, j) {
      if (a.h != null) return;
      var used = bonds.reduce(function (t, b) { return t + (b.a === j || b.b === j ? b.o : 0); }, 0);
      a.h = Math.max(0, STD[a.el] - used);
    });
    return { atoms: atoms, bonds: bonds };
  }

  /* A state as plain graphs, one per piece, with every H counted on its
     heavy atom: [{ atoms: [{ el, h, c }], bonds: [{ a, b, o }] }] */
  function graphs(st) {
    return pieces(st).map(function (ids) {
      var heavy = ids.filter(function (id) {
        var a = atom(st, id);
        return a.el !== 'H' || neighbours(st, id).every(function (n) { return atom(st, n.id).el === 'H'; });
      });
      var idx = {};
      heavy.forEach(function (id, k) { idx[id] = k; });
      var atoms = heavy.map(function (id) {
        var a = atom(st, id);
        var hs = a.h + neighbours(st, id).filter(function (n) { return atom(st, n.id).el === 'H' && idx[n.id] == null; }).length;
        return { el: a.el, h: hs, c: charge(st, id) };
      });
      var bonds = [];
      st.bonds.forEach(function (b) { if (b.o && idx[b.a] != null && idx[b.b] != null) bonds.push({ a: idx[b.a], b: idx[b.b], o: b.o }); });
      return { atoms: atoms, bonds: bonds };
    });
  }

  function splitGraph(g) {
    var seen = {}, out = [];
    g.atoms.forEach(function (a, i) {
      if (seen[i]) return;
      var list = [], stack = [i];
      seen[i] = 1;
      while (stack.length) {
        var j = stack.pop();
        list.push(j);
        g.bonds.forEach(function (b) {
          var k = b.a === j ? b.b : b.b === j ? b.a : null;
          if (k != null && !seen[k]) { seen[k] = 1; stack.push(k); }
        });
      }
      var idx = {};
      list.forEach(function (j, n) { idx[j] = n; });
      out.push({ atoms: list.map(function (j) { return g.atoms[j]; }),
                 bonds: g.bonds.filter(function (b) { return idx[b.a] != null; }).map(function (b) { return { a: idx[b.a], b: idx[b.b], o: b.o }; }) });
    });
    return out;
  }

  function iso(g1, g2) {
    var n = g1.atoms.length;
    if (n !== g2.atoms.length || g1.bonds.length !== g2.bonds.length) return false;
    function adj(g) {
      var A = g.atoms.map(function () { return {}; });
      g.bonds.forEach(function (b) { A[b.a][b.b] = b.o; A[b.b][b.a] = b.o; });
      return A;
    }
    var A1 = adj(g1), A2 = adj(g2);
    function sig(g, A, i) { var a = g.atoms[i]; return a.el + a.h + ':' + a.c + ':' + Object.keys(A[i]).length; }
    var map = [], used = [];
    function ok(i, j) {
      if (sig(g1, A1, i) !== sig(g2, A2, j)) return false;
      for (var k = 0; k < i; k++) {
        var o1 = A1[i][k] || 0, o2 = A2[j][map[k]] || 0;
        if (o1 !== o2) return false;
      }
      return true;
    }
    return (function walk(i) {
      if (i === n) return true;
      for (var j = 0; j < n; j++) {
        if (used[j] || !ok(i, j)) continue;
        used[j] = 1; map[i] = j;
        if (walk(i + 1)) return true;
        used[j] = 0;
      }
      return false;
    })(0);
  }

  /* Does the state hold exactly the species of the SMILES ('.'-separated)? */
  function matches(st, smi) {
    var mine = graphs(st);
    var theirs = splitGraph(smiles(smi));
    if (mine.length !== theirs.length) return false;
    var taken = [];
    return mine.every(function (g) {
      for (var k = 0; k < theirs.length; k++) {
        if (!taken[k] && iso(g, theirs[k])) { taken[k] = 1; return true; }
      }
      return false;
    });
  }

  /* -------------------------------------------------- reactive centres */

  /* Klein 6.7: the electrophilic and nucleophilic centres of a molecule.
     Electrophilic: a carbocation, the C of a C=O, a carbon bonded to Cl, Br
     or I (or F). Nucleophilic: an atom with a lone pair and a negative
     charge, the O of an alcohol or water, a halide ion, a C=C pi bond.
     A carbonyl O and the halogen of an alkyl halide are not counted, as
     in Klein. Returns { nuc: [id], elec: [id], pi: [[a, b]] }. */
  function centres(st) {
    var out = { nuc: [], elec: [], pi: [] };
    st.atoms.forEach(function (a) {
      var id = a.id, c = charge(st, id), nb = neighbours(st, id);
      if (a.el === 'C') {
        if (c > 0) out.elec.push(id);
        else if (nb.some(function (n) { return n.o === 2 && atom(st, n.id).el === 'O'; })) out.elec.push(id);
        else if (nb.some(function (n) { return n.o === 1 && HALOGEN.indexOf(atom(st, n.id).el) >= 0; })) out.elec.push(id);
        else if (c < 0) out.nuc.push(id);
        return;
      }
      if (a.el === 'H' || a.el === 'Li') return;
      if (!a.lp) return;
      if (c < 0) { out.nuc.push(id); return; }
      if (c > 0) return;
      if (a.el === 'O' || a.el === 'S' || a.el === 'N') {
        if (nb.some(function (n) { return n.o > 1; })) return;           /* a carbonyl O */
        if (a.el === 'O' && !(a.h + nb.filter(function (n) { return atom(st, n.id).el === 'H'; }).length)) return; /* an ether O: not used here */
        out.nuc.push(id);
      }
    });
    st.bonds.forEach(function (b) {
      if (b.o === 2 && atom(st, b.a).el === 'C' && atom(st, b.b).el === 'C') out.pi.push([b.a, b.b]);
    });
    return out;
  }

  /* Partial charges on a polar bond from Pauling electronegativities:
     { id: '+' or '-' } for the two atoms (none for a difference under 0.5). */
  function partials(st, a, b) {
    var d = EN[atom(st, b).el] - EN[atom(st, a).el], out = {};
    if (Math.abs(d) < 0.5) return out;
    out[a] = d > 0 ? '+' : '-';
    out[b] = d > 0 ? '-' : '+';
    return out;
  }

  /* --------------------------------------------- carbocation shifts */

  /* The best 1,2-shift for the carbocation at c: { kind: 'H' | 'CH3',
     from (neighbour), group (the carbon of a migrating CH3, or null for a
     hidden H), gain } or null when no shift makes a more stable cation.
     Only simple degrees count here (Klein 6.11): methyl < 1° < 2° < 3°. */
  function bestShift(st, c) {
    if (!isCation(st, c)) return null;
    var now = degree(st, c), best = null;
    neighbours(st, c).forEach(function (n) {
      var nb = atom(st, n.id);
      if (nb.el !== 'C' || n.o !== 1) return;
      /* the new cation would be at n.id: its carbons, minus a migrating C */
      var hs = nb.h + neighbours(st, n.id).filter(function (x) { return atom(st, x.id).el === 'H'; }).length;
      if (hs) {
        var g = degree(st, n.id);
        if (g > now && (!best || g > best.deg)) best = { kind: 'H', from: n.id, group: null, deg: g };
      }
      neighbours(st, n.id).forEach(function (x) {
        if (x.id === c) return;
        var xa = atom(st, x.id);
        if (xa.el !== 'C' || xa.h !== 3 || x.o !== 1) return;
        var g2 = degree(st, n.id) - 1;   /* loses the CH3 */
        if (g2 > now && (!best || g2 > best.deg)) best = { kind: 'CH3', from: n.id, group: x.id, deg: g2 };
      });
    });
    return best;
  }

  return {
    VE: VE, EN: EN, PATTERN: PATTERN, ORDER: ORDER, HALOGEN: HALOGEN, ROW2: ROW2,
    build: build, arrange: arrange, showH: showH, clone: clone,
    atom: atom, bond: bond, order: order, neighbours: neighbours, charge: charge, orbitals: orbitals, degree: degree,
    isCation: isCation, pieces: pieces,
    keys: { lp: lpKey, bond: bondKey, atom: atomKey, parse: parseKey, pair: pairKey },
    readings: readings, apply: apply, reach: reach, same: same, changes: changes, ledger: ledger, classify: classify,
    smiles: smiles, graphs: graphs, matches: matches, centres: centres, partials: partials, bestShift: bestShift
  };
})();

if (typeof module !== 'undefined') module.exports = Chem;

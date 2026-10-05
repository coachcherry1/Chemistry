/* analysis.js — reads a compound's graph and works out what its ¹H NMR
 * spectrum must look like: how many H each set holds (integration), how many
 * neighbouring H split it (n + 1 rule), and, for the Solve level, the one
 * difference that rules a wrong structure out.
 *
 * Nothing here touches the DOM, so tools/validate.js and tools/answer-key.js
 * load it under Node and check the bank with exactly the logic students see.
 *
 * Splitting is first order: every vicinal coupling counts the same, O-H
 * hydrogens exchange (no splitting either way), equivalent H do not split each
 * other, and coupling through more than three bonds is ignored.
 */

var Chem = (function () {
  'use strict';

  var cache = {};

  function bondsOf(mol, i) {
    var out = [];
    mol.bonds.forEach(function (b) {
      if (b[0] === i) out.push({ j: b[1], order: b[2] || 1 });
      else if (b[1] === i) out.push({ j: b[0], order: b[2] || 1 });
    });
    return out;
  }

  function isCarbonylCarbon(mol, i) {
    return bondsOf(mol, i).some(function (b) {
      return b.order === 2 && mol.atoms[b.j].t === 'O';
    });
  }

  /* What one neighbouring atom contributes to the splitting of set `sid`. */
  function neighbourPart(mol, j, sid) {
    var a = mol.atoms[j];
    if (a.h > 0) {
      if (a.oh) return { key: 'oh', text: 'the O–H', h: a.h, counts: false,
                         note: 'its H exchanges, so it does not split' };
      if (a.s === sid) return { key: 'eq' + a.t, text: 'an equivalent ' + a.t, plural: 'equivalent ' + a.t + ' groups',
                                h: a.h, counts: false, note: 'equivalent H do not split each other' };
      return { key: a.t, text: 'the ' + a.t, plural: a.t + ' groups', h: a.h, counts: true };
    }
    if (a.t === 'C') {
      return isCarbonylCarbon(mol, j)
        ? { key: 'C=O', text: 'the C=O carbon', h: 0, counts: false }
        : { key: 'C', text: 'a carbon with no H', h: 0, counts: false };
    }
    if (a.t === '') return { key: 'ring', text: 'a ring carbon with no H', h: 0, counts: false };
    return { key: a.t, text: 'the ' + a.t, h: 0, counts: false };
  }

  function neighbourParts(mol, i, sid) {
    return bondsOf(mol, i).map(function (b) { return neighbourPart(mol, b.j, sid); });
  }

  /* Neighbouring H that split a group: H on directly bonded atoms, except O-H
     and except H in the group's own set. */
  function splitCount(mol, i, sid) {
    if (mol.atoms[i].oh) return 0;
    return neighbourParts(mol, i, sid).reduce(function (sum, p) {
      return sum + (p.counts ? p.h : 0);
    }, 0);
  }

  function sets(mol) {
    if (cache[mol.id]) return cache[mol.id];
    var ids = Object.keys(mol.sets);
    var out = ids.map(function (id, index) {
      var def = mol.sets[id];
      var atoms = [];
      mol.atoms.forEach(function (a, i) { if (a.h > 0 && a.s === id) atoms.push(i); });
      var first = mol.atoms[atoms[0]] || { t: '?', h: 0 };
      var n = atoms.length ? splitCount(mol, atoms[0], id) : 0;
      return {
        id: id, index: index, atoms: atoms,
        text: first.t, h: first.h, nH: first.h * atoms.length,
        d: def.d, r: def.r, env: def.env, all: def.all || def.env, why: def.why,
        br: !!def.br, oh: !!first.oh,
        n: n, lines: n + 1, mult: MULTIPLICITY[n] || (n + 1) + ' lines'
      };
    });
    cache[mol.id] = out;
    return out;
  }

  function setById(mol, id) {
    var all = sets(mol);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  function joinList(items) {
    if (items.length < 2) return items.join('');
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  }

  var COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];

  /* "the CH₃ (3 H) and the O (no H)" - what a set's group is bonded to. */
  function neighbourText(mol, set) {
    var parts = neighbourParts(mol, set.atoms[0], set.id);
    var grouped = [];
    parts.forEach(function (p) {
      for (var k = 0; k < grouped.length; k++) {
        if (grouped[k].key === p.key && grouped[k].plural) { grouped[k].times++; return; }
      }
      grouped.push({ key: p.key, part: p, plural: p.plural, times: 1 });
    });
    return joinList(grouped.map(function (g) {
      var p = g.part;
      if (g.times > 1) {
        var name = COUNT_WORDS[g.times] + ' ' + p.plural;
        return p.counts ? name + ' (' + p.h * g.times + ' H)' : name + ' (' + p.note + ')';
      }
      if (p.note) return p.text + ' (' + p.note + ')';
      if (p.h) return p.text + ' (' + p.h + ' H)';
      return /no H$/.test(p.text) ? p.text : p.text + ' (no H)';
    }));
  }

  function neighbourPhrase(n) {
    return n === 0 ? 'no neighbouring H' : n + ' neighbouring H';
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  /* ------------------------------------------------ telling compounds apart
   *
   * The Solve level shows a spectrum with the integration printed under each
   * signal. What a student can read off it, signal by signal, is the H count,
   * the multiplicity and the shift region. Two compounds that agree on all
   * three for every signal cannot be told apart at this level, so one is
   * never offered as a decoy for the other.
   */
  function signatureKey(mol) {
    return sets(mol).map(function (s) { return s.nH + '|' + s.n + '|' + s.r; }).sort().join(',');
  }

  function indistinguishable(a, b) {
    return signatureKey(a) === signatureKey(b);
  }

  function tally(list, f) {
    var t = {};
    list.forEach(function (x) { var k = f(x); t[k] = (t[k] || 0) + 1; });
    return t;
  }

  function overlap(ta, tb) {
    var n = 0;
    Object.keys(ta).forEach(function (k) { n += Math.min(ta[k], tb[k] || 0); });
    return n;
  }

  /* How hard `b` is to tell from `a` - higher means a better decoy. It
     compares what a student sees: the number of signals first, then the
     splitting pattern and the shape of the integration (2 : 3 looks the same
     whether it is 2H : 3H or 4H : 6H), then the H counts and the shift
     regions. Bromoethane therefore draws diethyl ether - two signals, a
     quartet and a triplet in a 2 : 3 ratio - where only the printed H counts
     decide it. */
  function similarity(a, b) {
    var A = sets(a), B = sets(b);
    function feature(f) { return overlap(tally(A, f), tally(B, f)); }
    var minA = Math.min.apply(null, A.map(function (s) { return s.nH; }));
    var minB = Math.min.apply(null, B.map(function (s) { return s.nH; }));
    var score = 0;
    if (A.length === B.length) score += 4;
    score += feature(function (s) { return s.n; });
    score += overlap(tally(A, function (s) { return s.nH / minA; }),
                     tally(B, function (s) { return s.nH / minB; }));
    score += feature(function (s) { return s.nH; }) * 0.5;
    score += feature(function (s) { return s.r; }) * 0.75;
    score += feature(function (s) { return s.n + '|' + s.r; });
    if (a.family === b.family) score += 1;
    if (a.formula === b.formula) score += 2;
    return score;
  }

  /* The first piece of evidence in the spectrum of `ans` that rules out the
     structure `dec`: signal count, then integration, then splitting, then
     shift - the order a student should check them in. `dOf` gives the shift
     actually drawn for a set, so the message quotes what is on screen. */
  function contrast(ans, dec, dOf) {
    dOf = dOf || function (s) { return s.d; };
    function at(s) { return 'δ ' + dOf(s).toFixed(2); }
    var A = sets(ans).slice().sort(function (x, y) { return dOf(y) - dOf(x); });
    var D = sets(dec);
    var name = dec.name;

    if (A.length !== D.length) {
      return name + ' has ' + plural(D.length, 'set') + ' of equivalent hydrogens, so it would give ' +
             plural(D.length, 'signal') + '. This spectrum has ' + A.length + '.';
    }

    var need = tally(A, function (s) { return s.nH; });
    var have = tally(D, function (s) { return s.nH; });
    for (var i = 0; i < A.length; i++) {
      var a = A[i];
      if ((have[a.nH] || 0) >= need[a.nH]) continue;
      if (!have[a.nH]) {
        return 'The signal at ' + at(a) + ' integrates to ' + a.nH + 'H. ' + name +
               (a.nH === 1 ? ' has no hydrogen that sits in a set on its own.'
                           : ' has no set of ' + a.nH + ' equivalent hydrogens.');
      }
      var k = have[a.nH];
      return 'This spectrum has ' + COUNT_WORDS[need[a.nH]] + ' ' + a.nH + 'H signals, but ' + name +
             ' has only ' + COUNT_WORDS[k] + (a.nH === 1
               ? (k === 1 ? ' hydrogen that sits' : ' hydrogens that sit') + ' in a set on its own.'
               : ' set' + (k === 1 ? '' : 's') + ' of ' + a.nH + ' equivalent hydrogens.');
    }

    /* pair signals by H count and multiplicity */
    var pool = D.slice(), unmatched = [];
    A.forEach(function (s) {
      for (var k = 0; k < pool.length; k++) {
        if (pool[k].nH === s.nH && pool[k].n === s.n) { pool.splice(k, 1); return; }
      }
      unmatched.push(s);
    });
    if (unmatched.length) {
      var u = unmatched[0];
      var other = pool.filter(function (s) { return s.nH === u.nH; })[0];
      if (other) {
        return 'The ' + u.nH + 'H signal at ' + at(u) + ' is a ' + u.mult + '. In ' + name + ', ' +
               other.all + ' would give a ' + other.mult + ' — ' + neighbourPhrase(other.n) + '.';
      }
    }

    /* same counts, same splitting: the shift has to decide it */
    var left = D.slice();
    for (var m = 0; m < A.length; m++) {
      var s = A[m];
      var same = left.filter(function (x) { return x.nH === s.nH && x.n === s.n; });
      var hit = same.filter(function (x) { return x.r === s.r; })[0];
      if (hit) { left.splice(left.indexOf(hit), 1); continue; }
      var twin = same[0];
      if (!twin) continue;
      var rs = REGIONS[s.r], rt = REGIONS[twin.r];
      return 'The ' + s.nH + 'H ' + s.mult + ' at ' + at(s) + ' sits in the range for ' + rs.where +
             ' (' + rangeText(rs) + ' ppm). In ' + name + ', the ' + twin.nH + 'H ' + twin.mult +
             ' comes from ' + twin.all + ', which would sit at ' + rangeText(rt) + ' ppm.';
    }

    return name + ' would give a very similar spectrum — compare the shifts signal by signal.';
  }

  return {
    sets: sets,
    setById: setById,
    splitCount: splitCount,
    neighbourText: neighbourText,
    neighbourPhrase: neighbourPhrase,
    isCarbonylCarbon: isCarbonylCarbon,
    signatureKey: signatureKey,
    indistinguishable: indistinguishable,
    similarity: similarity,
    contrast: contrast,
    joinList: joinList,
    plural: plural
  };
})();

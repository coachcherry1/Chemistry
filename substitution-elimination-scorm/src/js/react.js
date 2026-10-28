/* react.js: the reactions, computed from the graph.
 *
 * Klein's three steps (section 7.11):
 *   1. the function of the reagent (REAGENTS, FUNCTIONS)
 *   2. the substrate, methyl to 3°, and the mechanisms Klein's table gives
 *      for it (TABLE)
 *   3. the products, with their regiochemistry and stereochemistry:
 *        SN2   back-side attack: inversion of configuration
 *        SN1   a flat carbocation, attacked from either face: both
 *              configurations; a 1,2-hydride or methyl shift first when it
 *              gives a more substituted carbocation
 *        E2    every β carbon with an H anti-coplanar to the leaving group:
 *              the Zaitsev product is major unless the base is sterically
 *              hindered (t-BuOK: Hofmann); a β carbon with two H gives both
 *              E and Z, the one with the larger groups trans major
 *              (stereoselective); a β carbon with one H gives only the one
 *              its configuration allows (stereospecific); on a ring the
 *              leaving group and the H must be trans-diaxial
 *        E1    from the carbocation: the Zaitsev product, larger groups trans
 *
 * t-BuOK is a strong nucleophile and a strong base, as the teacher teaches
 * it, but sterically hindered: it prefers E2 even at a primary carbon and
 * gives the Hofmann product.
 *
 * Nothing about a product is typed in. tools/validate.js checks the model
 * against the textbook's own examples (Klein 7.7: 2-chloropentane and
 * NaOEt) and every answer in the activity against the model.
 */

var React = (function () {
  'use strict';

  var FUNCTIONS = {
    nuc:  { short: 'Nucleophile only', klein: 'Strong nucleophile, weak base' },
    both: { short: 'Strong nucleophile and strong base', klein: '' },
    base: { short: 'Base only', klein: 'Strong base, weak nucleophile' },
    weak: { short: 'Weak nucleophile, weak base', klein: '' }
  };
  var FN_ORDER = ['nuc', 'both', 'base', 'weak'];

  /* species: the SMILES of the part that reacts (Na⁺ and K⁺ are spectators) */
  var REAGENTS = {
    NaOH:  { text: 'NaOH', fn: 'both', species: '[OH-]', ion: 'HO⁻',
             why: 'HO⁻ is a strong base (its conjugate acid, water, is a weak acid) and a strong nucleophile (a negative charge on an uncrowded O).' },
    NaOMe: { text: 'NaOMe', fn: 'both', species: 'C[O-]', ion: 'MeO⁻',
             why: 'MeO⁻ is a strong base (its conjugate acid, methanol, is a weak acid) and a strong nucleophile (a negative charge on an uncrowded O).' },
    NaOEt: { text: 'NaOEt', fn: 'both', species: 'CC[O-]', ion: 'EtO⁻',
             why: 'EtO⁻ is a strong base (its conjugate acid, ethanol, is a weak acid) and a strong nucleophile (a negative charge on an uncrowded O).' },
    tBuOK: { text: 't-BuOK', fn: 'both', species: 'CC(C)(C)[O-]', ion: 't-BuO⁻', hindered: true,
             why: 't-BuO⁻ is a strong base and a strong nucleophile, but it is sterically hindered: it prefers E2 even at a primary carbon, and it removes the most accessible H, giving the Hofmann product.' },
    DBN:   { text: 'DBN', fn: 'base',
             why: 'DBN is a strong base, but the N that would attack is crowded by the rings around it, so it is a weak nucleophile.' },
    DBU:   { text: 'DBU', fn: 'base',
             why: 'DBU is a strong base, but the N that would attack is crowded by the rings around it, so it is a weak nucleophile.' },
    NaH:   { text: 'NaH', fn: 'base', species: '[H-]', ion: 'H⁻',
             why: 'H⁻ is a very strong base (its conjugate acid, H₂, is an extremely weak acid), but it is small and not polarizable, so it is a weak nucleophile.' },
    NaI:   { text: 'NaI', fn: 'nuc', species: '[I-]', ion: 'I⁻',
             why: 'I⁻ is the conjugate base of HI, a strong acid, so it is a weak base. It is large and polarizable, so it is a strong nucleophile.' },
    NaBr:  { text: 'NaBr', fn: 'nuc', species: '[Br-]', ion: 'Br⁻',
             why: 'Br⁻ is the conjugate base of HBr, a strong acid, so it is a weak base. It is large and polarizable, so it is a strong nucleophile.' },
    NaCl:  { text: 'NaCl', fn: 'nuc', species: '[Cl-]', ion: 'Cl⁻',
             why: 'Cl⁻ is the conjugate base of HCl, a strong acid, so it is a weak base. Its negative charge makes it a strong nucleophile.' },
    NaSH:  { text: 'NaSH', fn: 'nuc', species: '[SH-]', ion: 'HS⁻',
             why: 'HS⁻ has a negative charge on a large, polarizable S: a strong nucleophile. Its conjugate acid, H₂S, is a much stronger acid than water, so HS⁻ is a weak base.' },
    NaSR:  { text: 'NaSCH₃', fn: 'nuc', species: 'C[S-]', ion: 'CH₃S⁻', rs: true,
             why: 'CH₃S⁻ (an RS⁻) has a negative charge on a large, polarizable S: a strong nucleophile, and a weak base.' },
    H2S:   { text: 'H₂S', fn: 'nuc', species: 'S',
             why: 'H₂S is neutral, but its S is large and polarizable, so it is a strong nucleophile. It is a weak base.' },
    RSH:   { text: 'CH₃SH', fn: 'nuc', species: 'CS', rs: true,
             why: 'CH₃SH (an RSH) is neutral, but its S is large and polarizable, so it is a strong nucleophile. It is a weak base.' },
    NaCN:  { text: 'NaCN', fn: 'nuc', species: '[C-]#N', ion: '⁻CN',
             why: '⁻CN is a strong nucleophile and a weak base (far weaker than HO⁻), so with a 1° or 2° substrate it substitutes.' },
    NaN3:  { text: 'NaN₃', fn: 'nuc', species: '[N-]=[N+]=[N-]', ion: 'N₃⁻',
             why: 'N₃⁻ (azide) is a strong nucleophile and a weak base (its conjugate acid, HN₃, is a fairly strong acid).' },
    H2O:   { text: 'H₂O', fn: 'weak', species: 'O',
             why: 'H₂O is neutral and its O is small and not polarizable: a weak nucleophile and a weak base.' },
    MeOH:  { text: 'MeOH', fn: 'weak', species: 'CO',
             why: 'MeOH is neutral and its O is small and not polarizable: a weak nucleophile and a weak base.' },
    EtOH:  { text: 'EtOH', fn: 'weak', species: 'CCO',
             why: 'EtOH is neutral and its O is small and not polarizable: a weak nucleophile and a weak base.' }
  };
  var REAGENT_ORDER = ['NaOH', 'NaOMe', 'NaOEt', 'tBuOK', 'DBN', 'DBU', 'NaH', 'NaI', 'NaBr', 'NaCl', 'NaSH', 'NaSR',
                       'H2S', 'RSH', 'NaCN', 'NaN3', 'H2O', 'MeOH', 'EtOH'];

  /* Klein's table (7.11), by substrate and function. */
  var TABLE = {
    1: { base: [['E2', 'major']], both: [['SN2', 'major'], ['E2', 'minor']], nuc: [['SN2', 'major']], weak: [] },
    2: { base: [['E2', 'major']], both: [['E2', 'major'], ['SN2', 'minor']], nuc: [['SN2', 'major']], weak: [] },
    3: { base: [['E2', 'major']], both: [['E2', 'major']], nuc: [['SN1', 'major']], weak: [['SN1', 'major'], ['E1', 'minor']] }
  };

  function mechanisms(deg, key) {
    var r = REAGENTS[key];
    if (deg === 0) return r.fn === 'nuc' || r.fn === 'both' ? [['SN2', 'major']] : [];
    var list = TABLE[deg][r.fn].map(function (x) { return x.slice(); });
    /* the hindered base: E2 even at a primary carbon */
    if (r.hindered && deg === 1) list = [['E2', 'major'], ['SN2', 'minor']];
    return list;
  }

  /* ---------------------------------------------------------- substrate */

  /* The leaving group and the α carbon. */
  function lg(m) {
    for (var i = 0; i < m.atoms.length; i++) {
      if (HALOGENS.indexOf(m.atoms[i].el) < 0) continue;
      var c = m.nb(i).filter(function (x) { return m.atoms[x.j].el === 'C'; })[0];
      if (c && m.nb(c.j).every(function (x) { return x.order === 1; })) return { x: i, a: c.j };
    }
    return null;
  }

  /* 0 (methyl), 1, 2 or 3. */
  function degree(m) { var L = lg(m); return Mol.degree(m, L.a); }
  var DEGREE_WORD = ['methyl', 'primary (1°)', 'secondary (2°)', 'tertiary (3°)'];

  /* β carbons: carbons on the α carbon, with how many H each carries. */
  function betas(m, a) {
    return m.carbonsOn(a).map(function (x) { return { b: x.j, h: m.hCount(x.j) }; });
  }

  /* ------------------------------------------------------- substitution */

  /* The nucleophile's attacking atom in a species graph. */
  function nucAtom(sp) {
    for (var i = 0; i < sp.atoms.length; i++) if (sp.atoms[i].charge < 0 && sp.atoms[i].el !== 'N') return i;
    for (i = 0; i < sp.atoms.length; i++) if (sp.atoms[i].charge < 0) {
      /* azide: a terminal N */
      if (sp.nb(i).length === 1) return i;
    }
    for (i = 0; i < sp.atoms.length; i++) if (sp.atoms[i].el === 'O' || sp.atoms[i].el === 'S') return i;
    return 0;
  }

  /* Replace the leaving group with the nucleophile from `key`.
     mode 'inv' (SN2), 'ret' (front-side, never happens), or a sign. */
  function substitute(m, key, mode, at) {
    var L = lg(m);
    var a = at != null ? at : L.a;
    var sp = Mol.parse(REAGENTS[key].species);
    var nu = nucAtom(sp);
    var out = m.clone();
    var off = out.atoms.length;
    sp.atoms.forEach(function (x, i) { out.add(x.el, { h: x.h, charge: x.charge, id: 'nu' + i }); });
    sp.bonds.forEach(function (b) { out.bond(b.a + off, b.b + off, b.order); });
    var n = off + nu;
    out.bond(a, n, 1);
    /* the attacking atom is now bonded: an anion is neutral, a neutral
       nucleophile loses a proton */
    if (out.atoms[n].charge < 0) out.atoms[n].charge = 0;
    else if (out.atoms[n].h > 0) out.atoms[n].h--;
    var par = out.atoms[a].parity;
    if (par && at == null) {
      var p = par.nb.indexOf(L.x);
      par.nb[p] = n;
      if (mode === 'inv') par.sign = -par.sign;
      else if (typeof mode === 'number') par.sign = mode;
    }
    var res = out.without([L.x]);
    return res;
  }

  /* ------------------------------------------------------- carbocations */

  /* The carbocation from loss of the leaving group: C+ at the α carbon,
     flat, so its configuration is gone. */
  function cation(m) {
    var L = lg(m);
    var out = m.clone();
    out.atoms[L.a].charge = 1;
    out.atoms[L.a].parity = null;
    var res = out.without([L.x]);
    res.plus = res.map[L.a];
    return res;
  }

  /* The best 1,2-shift for the carbocation at c: a hydride or a methyl from
     a neighbouring carbon, if it gives a more substituted carbocation.
     { from, kind: 'H' | 'CH3', group (the CH3's atom), deg } or null. */
  function bestShift(cat, c) {
    var d0 = Mol.degree(cat, c), best = null;
    cat.carbonsOn(c).forEach(function (x) {
      var n = x.j;
      if (cat.hCount(n) > 0) {
        var d = Mol.degree(cat, n);
        if (d > d0 && (!best || d > best.deg)) best = { from: n, kind: 'H', deg: d };
      }
      cat.carbonsOn(n).forEach(function (y) {
        if (y.j === c) return;
        var isMe = cat.atoms[y.j].h === 3 && cat.carbonsOn(y.j).length === 1;
        if (!isMe) return;
        var d2 = Mol.degree(cat, n) - 1;
        if (d2 > d0 && (!best || d2 > best.deg)) best = { from: n, kind: 'CH3', group: y.j, deg: d2 };
      });
    });
    return best;
  }

  /* Carry out a shift: the cation moves to s.from. */
  function doShift(cat, c, s) {
    var out = cat.clone();
    out.atoms[c].charge = 0;
    out.atoms[s.from].charge = 1;
    out.atoms[s.from].parity = null;
    out.atoms[c].parity = null;
    if (s.kind === 'H') { out.atoms[s.from].h--; out.atoms[c].h++; }
    else {
      var k = out.bondBetween(s.from, s.group);
      out.bonds[k] = { a: c, b: s.group, order: 1, cfg: null };
    }
    out.plus = s.from;
    return out;
  }

  /* The nucleophile on a carbocation at c, from the top or bottom face
     (sign +1 or -1), or with no configuration if c is not a centre. */
  function capture(cat, c, key, sign) {
    var sp = Mol.parse(REAGENTS[key].species);
    var nu = nucAtom(sp);
    var out = cat.clone();
    var off = out.atoms.length;
    sp.atoms.forEach(function (x, i) { out.add(x.el, { h: x.h, charge: x.charge, id: 'nu' + i }); });
    sp.bonds.forEach(function (b) { out.bond(b.a + off, b.b + off, b.order); });
    var n = off + nu;
    out.bond(c, n, 1);
    out.atoms[c].charge = 0;
    if (out.atoms[n].charge < 0) out.atoms[n].charge = 0;
    else if (out.atoms[n].h > 0) out.atoms[n].h--;
    if (sign && Mol.isCentre(out, c)) {
      var nb = out.nb(c).map(function (x) { return x.j; });
      while (nb.length < 4) nb.push(-1);
      out.atoms[c].parity = { nb: nb, sign: sign };
    }
    return out;
  }

  /* A neutral nucleophile on the carbocation before it loses its proton:
     the oxonium ion of a solvolysis. { mol, o (the O), h (its H, drawn) } */
  function oxonium(cat, c, key) {
    var sp = Mol.parse(REAGENTS[key].species);
    var nu = nucAtom(sp);
    var out = cat.clone();
    var off = out.atoms.length;
    sp.atoms.forEach(function (x, i) { out.add(x.el, { h: x.h, charge: x.charge, id: 'nu' + i }); });
    sp.bonds.forEach(function (b) { out.bond(b.a + off, b.b + off, b.order); });
    var o = off + nu;
    out.bond(c, o, 1);
    out.atoms[c].charge = 0;
    out.atoms[o].charge = 1;
    var h = out.explicitH(o);
    return { mol: out, o: o, h: h };
  }

  /* -------------------------------------------------------- elimination */

  var T3 = Math.sqrt(8) / 3;
  function around(sign, deg) {
    var r = deg * Math.PI / 180;
    return [sign / 3, T3 * Math.cos(r), T3 * Math.sin(r)];
  }

  /* The other two groups on the α carbon when the leaving group points up
     (0°) in a Newman projection looking from α to β: [group at 120°, group at
     240°] (indices, -1 for an implicit H). Angles are measured clockwise as
     the eye sees them. */
  function frontPair(m, a, b, x) {
    var others = m.nb(a).filter(function (y) { return y.j !== b && y.j !== x; }).map(function (y) { return y.j; });
    for (var h = 0; h < m.atoms[a].h; h++) others.push(-1);
    var par = m.atoms[a].parity;
    if (!par) return { pair: others, fixed: false };
    var pos = {};
    pos[b] = [1.54, 0, 0]; pos[x] = around(-1, 0); pos[others[0]] = around(-1, 120); pos[others[1]] = around(-1, 240);
    if (handed(par, pos) !== par.sign) others = [others[1], others[0]];
    return { pair: others, fixed: true };
  }

  /* The back carbon's groups with `h` anti (180°): [group at 60°, group at 300°]. */
  function backPair(m, a, b, h) {
    var others = m.nb(b).filter(function (y) { return y.j !== a && y.j !== h; }).map(function (y) { return y.j; });
    var hs = m.atoms[b].h - (h === -1 ? 1 : 0);
    for (var k = 0; k < hs; k++) others.push(-1);
    var par = m.atoms[b].parity;
    if (!par) return { pair: others, fixed: false };
    var pos = {};
    var B = [1.54, 0, 0];
    pos[a] = [0, 0, 0]; pos[h] = GEOM.add(B, around(1, 180));
    pos[others[0]] = GEOM.add(B, around(1, 60)); pos[others[1]] = GEOM.add(B, around(1, 300));
    if (handed(par, pos) !== par.sign) others = [others[1], others[0]];
    return { pair: others, fixed: true };
  }

  function handed(par, pos) {
    var v = par.nb.map(function (j) { return pos[j]; });
    if (v.some(function (q) { return !q; })) return 0;
    var d = GEOM.det3(GEOM.sub(v[1], v[0]), GEOM.sub(v[2], v[0]), GEOM.sub(v[3], v[0]));
    return d > 0 ? 1 : -1;
  }

  /* Steric size of the group at atom j seen from atom from (H smallest). */
  function size(m, j, from) {
    if (j < 0 || m.atoms[j].el === 'H') return 0;
    return 10 * m.heavy(j).filter(function (x) { return x.j !== from; }).length + Mol.side(m, j, from).length;
  }

  /* The alkene from removing the leaving group from α and an H from β.
     `cfg`: { na, nb, rel } in the substrate's indices, or null. */
  function alkene(m, a, b, x, cfg) {
    var out = m.clone();
    out.atoms[b].h--;
    out.atoms[a].parity = null;
    out.atoms[b].parity = null;
    var k = out.bondBetween(a, b);
    out.bonds[k].order = 2;
    /* cfg.na is on the α carbon, cfg.nb on the β carbon; the bond stores
       its references in its own a, b order */
    if (cfg && cfg.na >= 0 && cfg.nb >= 0) {
      out.bonds[k].cfg = out.bonds[k].a === a ? { na: cfg.na, nb: cfg.nb, rel: cfg.rel } : { na: cfg.nb, nb: cfg.na, rel: cfg.rel };
    }
    var res = out.without([x]);
    return res;
  }

  /* Number of carbons on the two alkene carbons: how substituted it is. */
  function substitution(m) {
    var n = 0;
    m.bonds.forEach(function (bd) {
      if (bd.order !== 2 || m.atoms[bd.a].el !== 'C' || m.atoms[bd.b].el !== 'C') return;
      n = m.carbonsOn(bd.a).length + m.carbonsOn(bd.b).length - 2;
    });
    return n;
  }

  /* Every E2 product from β carbon b, with how it can form:
     [{ mol, beta, how: 'only' | 'selective-major' | 'selective-minor' | 'specific' }] */
  function e2From(m, a, b, x) {
    var hb = m.hCount(b);
    if (!hb) return [];
    var test = alkene(m, a, b, x, null);
    var k = test.bondBetween(test.map[a], test.map[b]);
    if (!Mol.isStereoAlkene(test, k)) return [{ mol: test, beta: b, how: 'only' }];
    var fp = frontPair(m, a, b, x);
    var outs = [];
    function make(back) {
      /* the group at 120° on α and the one at 60° on β end up cis */
      var na = fp.pair[0], nb = back.pair[0];
      var cfg;
      if (na >= 0 && nb >= 0) cfg = { na: na, nb: nb, rel: 'cis' };
      else if (na >= 0) cfg = { na: na, nb: back.pair[1], rel: 'trans' };
      else if (nb >= 0) cfg = { na: fp.pair[1], nb: nb, rel: 'trans' };
      else cfg = { na: fp.pair[1], nb: back.pair[1], rel: 'cis' };
      return alkene(m, a, b, x, cfg);
    }
    if (hb === 1) {
      var hj = m.atoms[b].h ? -1 : m.nb(b).filter(function (y) { return m.atoms[y.j].el === 'H'; })[0].j;
      var bp = backPair(m, a, b, hj);
      return [{ mol: make(bp), beta: b, how: 'specific' }];
    }
    /* two H: either can be anti; the larger β group goes trans to the larger α group */
    var R = m.nb(b).filter(function (y) { return y.j !== a && m.atoms[y.j].el !== 'H'; }).map(function (y) { return y.j; })[0];
    var pA = make({ pair: [R, -1] }), pB = make({ pair: [-1, R] });
    var big = size(m, fp.pair[0], a) > size(m, fp.pair[1], a) ? 0 : 1;
    /* pA has R cis to the 120° group; major has R cis to the smaller one */
    var major = big === 0 ? pB : pA, minor = big === 0 ? pA : pB;
    return [{ mol: major, beta: b, how: 'selective-major' }, { mol: minor, beta: b, how: 'selective-minor' }];
  }

  /* On a ring: can β carbon b give an H trans-diaxial to the leaving group? */
  function ringAnti(m, a, b, x) {
    var ring = Mol.ringOf(m);
    if (!ring || ring.indexOf(a) < 0 || ring.indexOf(b) < 0) return true;
    var fx = faceOf(m, a, x, ring);
    var subs = m.nb(b).filter(function (y) { return ring.indexOf(y.j) < 0 && m.atoms[y.j].el !== 'H'; });
    if (m.hCount(b) === 2) return true;
    if (m.hCount(b) === 0) return false;
    /* one H: it is on the face opposite the group */
    var fg = faceOf(m, b, subs[0].j, ring);
    return fg === fx;  /* the group on the same face as X means the H is on the other face */
  }

  /* Face of group j on ring carbon c: +1 or -1, from the parity on a flat hexagon. */
  function faceOf(m, c, j, ring) {
    var par = m.atoms[c].parity;
    if (!par) return 0;
    var k = ring.indexOf(c);
    var P = function (i) { var t = i * Math.PI / 3; return [Math.cos(t), Math.sin(t), 0]; };
    var pos = {};
    pos[ring[(k + 5) % 6]] = P((k + 5) % 6);
    pos[ring[(k + 1) % 6]] = P((k + 1) % 6);
    var others = par.nb.filter(function (q) { return q !== ring[(k + 5) % 6] && q !== ring[(k + 1) % 6]; });
    var up = GEOM.add(GEOM.mul(P(k), 1.5), [0, 0, 0.8]), dn = GEOM.add(GEOM.mul(P(k), 1.5), [0, 0, -0.8]);
    pos[j] = up;
    others.forEach(function (q) { if (q !== j) pos[q] = dn; });
    return handed(par, pos) === par.sign ? 1 : -1;
  }

  /* A-values (kJ/mol, Klein, as in the chairs activity). */
  var AVAL = { Cl: 2.0, Br: 2.0, I: 2.0, CH3: 7.6, iPr: 9.2, tBu: 22.8 };

  function groupKey(m, c, j) {
    var e = m.atoms[j].el;
    if (HALOGENS.indexOf(e) >= 0) return e;
    if (e !== 'C') return null;
    var al = Name.alkyl(m, j, c);
    return { methyl: 'CH3', isopropyl: 'iPr', 'tert-butyl': 'tBu' }[al] || 'CH3';
  }

  /* The two chairs of a ring substrate: which has the leaving group axial,
     the A-value cost of each (sum over axial groups), and how much less
     stable the reactive chair is. */
  function chairs(m) {
    var L = lg(m), ring = Mol.ringOf(m);
    if (!ring) return null;
    var ka = ring.indexOf(L.a), fx = faceOf(m, L.a, L.x, ring);
    var cost = [0, 0], axial = [[], []];
    ring.forEach(function (c, k) {
      m.nb(c).forEach(function (y) {
        if (ring.indexOf(y.j) >= 0 || m.atoms[y.j].el === 'H') return;
        var f = faceOf(m, c, y.j, ring) || 1;
        if (m.nb(c).filter(function (z) { return ring.indexOf(z.j) < 0 && m.atoms[z.j].el !== 'H'; }).length === 2) {
          /* two groups on one carbon: one is axial in each chair */
          var g = groupKey(m, c, y.j);
          var first = m.nb(c).filter(function (z) { return ring.indexOf(z.j) < 0; })[0].j === y.j;
          var ch = first ? 0 : 1;
          cost[ch] += AVAL[g] || 0; axial[ch].push(y.j);
          return;
        }
        /* chair 0 is the one with the leaving group axial */
        var ax0 = ((k - ka) % 2 === 0) === (f === fx);
        var g2 = groupKey(m, c, y.j);
        cost[ax0 ? 0 : 1] += AVAL[g2] || 0;
        axial[ax0 ? 0 : 1].push(y.j);
      });
    });
    return { reactive: cost[0], other: cost[1], gap: cost[0] - cost[1], axial: axial };
  }

  /* --------------------------------------------------------- everything */

  function e2Products(m, key) {
    var L = lg(m);
    var hind = REAGENTS[key] && REAGENTS[key].hindered;
    var list = [];
    betas(m, L.a).forEach(function (bt) {
      if (!bt.h) return;
      if (!ringAnti(m, L.a, bt.b, L.x)) return;
      e2From(m, L.a, bt.b, L.x).forEach(function (p) { list.push(p); });
    });
    /* identical products from equivalent β carbons count once */
    var seen = {};
    list = list.filter(function (p) { var n = Name.name(p.mol); if (seen[n]) return false; seen[n] = 1; return true; });
    var subs = list.map(function (p) { return substitution(p.mol); });
    var hi = Math.max.apply(null, subs), lo = Math.min.apply(null, subs);
    list.forEach(function (p, i) {
      p.subst = subs[i];
      p.regio = hi === lo ? null : subs[i] === hi ? 'Zaitsev' : subs[i] === lo ? 'Hofmann' : 'other';
    });
    var want = hind ? lo : hi;
    var major = list.filter(function (p) { return p.subst === want && p.how !== 'selective-minor'; })[0];
    list.forEach(function (p) { p.role = p === major ? 'major' : 'minor'; });
    return list;
  }

  /* SN1 or E1: the carbocation (after a shift if one helps). */
  function cationPath(m) {
    var cat = cation(m);
    var c = cat.plus;
    var s = bestShift(cat, c);
    return { first: cat, c: c, shift: s, final: s ? doShift(cat, c, s) : cat, at: s ? s.from : c };
  }

  function sn1Products(m, key) {
    var cp = cationPath(m);
    var out = [];
    var one = capture(cp.final, cp.at, key, 1);
    if (one.atoms[cp.at].parity) {
      out.push({ mol: one, face: 1 });
      out.push({ mol: capture(cp.final, cp.at, key, -1), face: -1 });
    } else out.push({ mol: one });
    out.forEach(function (p) { p.rearranged = !!cp.shift; });
    return { list: out, path: cp };
  }

  function e1Products(m) {
    var cp = cationPath(m);
    var cat = cp.final, c = cp.at;
    var list = [];
    cat.carbonsOn(c).forEach(function (x) {
      if (!cat.hCount(x.j)) return;
      var out = cat.clone();
      out.atoms[c].charge = 0;
      out.atoms[x.j].h--;
      var k = out.bondBetween(c, x.j);
      out.bonds[k].order = 2;
      if (Mol.isStereoAlkene(out, k)) {
        /* larger groups trans: E1 is stereoselective */
        var ga = out.nb(c).filter(function (y) { return y.j !== x.j; }).map(function (y) { return y.j; });
        var gb = out.nb(x.j).filter(function (y) { return y.j !== c; }).map(function (y) { return y.j; });
        while (ga.length < 2) ga.push(-1);
        while (gb.length < 2) gb.push(-1);
        var bigA = size(out, ga[0], c) >= size(out, ga[1], c) ? ga[0] : ga[1];
        var bigB = gb.filter(function (j) { return j >= 0; }).sort(function (p, q) { return size(out, q, x.j) - size(out, p, x.j); })[0];
        var fwd = out.bonds[k].a === c;
        function cfgOf(rel) { return fwd ? { na: bigA, nb: bigB, rel: rel } : { na: bigB, nb: bigA, rel: rel }; }
        var maj = out.clone(); maj.bonds[k].cfg = cfgOf('trans');
        var mnr = out.clone(); mnr.bonds[k].cfg = cfgOf('cis');
        list.push({ mol: maj, how: 'selective-major' }, { mol: mnr, how: 'selective-minor' });
      } else list.push({ mol: out, how: 'only' });
    });
    var seen = {};
    list = list.filter(function (p) { var n = Name.name(p.mol); if (seen[n]) return false; seen[n] = 1; return true; });
    var subs = list.map(function (p) { return substitution(p.mol); });
    var hi = Math.max.apply(null, subs), lo = Math.min.apply(null, subs);
    list.forEach(function (p, i) { p.subst = subs[i]; p.regio = hi === lo ? null : subs[i] === hi ? 'Zaitsev' : 'Hofmann'; });
    var major = list.filter(function (p) { return p.subst === hi && p.how !== 'selective-minor'; })[0];
    list.forEach(function (p) { p.role = p === major ? 'major' : 'minor'; });
    return list;
  }

  /* Klein's three steps for substrate m and reagent key. */
  function predict(m, key) {
    var deg = degree(m);
    var mechs = mechanisms(deg, key);
    var products = [];
    mechs.forEach(function (mr) {
      var mech = mr[0], role = mr[1];
      if (mech === 'SN2') products.push({ mol: substitute(m, key, 'inv'), mech: 'SN2', role: role });
      if (mech === 'E2') e2Products(m, key).forEach(function (p) {
        products.push({ mol: p.mol, mech: 'E2', role: role === 'major' ? p.role : 'minor', regio: p.regio, how: p.how });
      });
      if (mech === 'SN1') sn1Products(m, key).list.forEach(function (p) {
        products.push({ mol: p.mol, mech: 'SN1', role: role, face: p.face, rearranged: p.rearranged });
      });
      if (mech === 'E1') e1Products(m).forEach(function (p) {
        products.push({ mol: p.mol, mech: 'E1', role: 'minor', regio: p.regio, how: p.how });
      });
    });
    products.forEach(function (p) { p.name = Name.name(p.mol); });
    return { deg: deg, fn: REAGENTS[key].fn, mechs: mechs, products: products };
  }

  return {
    FUNCTIONS: FUNCTIONS, FN_ORDER: FN_ORDER, REAGENTS: REAGENTS, REAGENT_ORDER: REAGENT_ORDER, TABLE: TABLE,
    DEGREE_WORD: DEGREE_WORD, AVAL: AVAL,
    mechanisms: mechanisms, lg: lg, degree: degree, betas: betas, substitute: substitute, cation: cation,
    bestShift: bestShift, doShift: doShift, capture: capture, cationPath: cationPath, alkene: alkene,
    e2From: e2From, e2Products: e2Products, sn1Products: sn1Products, e1Products: e1Products, predict: predict,
    frontPair: frontPair, backPair: backPair, substitution: substitution, ringAnti: ringAnti, faceOf: faceOf,
    chairs: chairs, size: size, nucAtom: nucAtom, oxonium: oxonium
  };
})();

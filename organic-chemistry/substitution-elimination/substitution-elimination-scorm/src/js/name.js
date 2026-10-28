/* name.js: IUPAC names computed from the graph, in the style the class uses:
 * locants before the suffix and E/Z for every stereogenic double bond
 * ((E)-pent-2-ene, butan-2-ol, (S)-butane-2-thiol), R and S for chirality
 * centres on a chain, cis and trans for two groups on a ring, and Klein's
 * forms for rings (1-methylcyclohexene, methylenecyclohexane, 4-methylcyclohexanol).
 *
 * The parent chain is the one that holds the suffix group, then the most
 * C=C bonds, then the most carbons, then the most substituents (the rule
 * Klein teaches: the parent chain includes the double bond). It is numbered
 * to give the lowest locant to the suffix, then the double bond, then the
 * substituents as a set, then the one cited first alphabetically.
 *
 * Scope: chains and one cyclohexane or cyclohexene ring carrying halogens,
 * alkyl groups (methyl to butyl, isopropyl, sec-butyl, isobutyl,
 * tert-butyl), alkoxy groups, OH, SH, CN, N3 and a methylene group.
 * tools/validate.js checks every molecule in the activity against a name
 * written out by hand from the textbook.
 */

var Name = (function () {
  'use strict';

  var STEM = ['', 'meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec'];
  var MULT = ['', '', 'di', 'tri', 'tetra'];
  var HALO = { F: 'fluoro', Cl: 'chloro', Br: 'bromo', I: 'iodo' };

  function isNitrileC(m, i) {
    return m.atoms[i].el === 'C' && m.nb(i).some(function (x) { return x.order === 3 && m.atoms[x.j].el === 'N'; });
  }

  /* The suffix group on carbon i, if any: 'nitrile', 'ol' or 'thiol'. */
  function suffixOn(m, i) {
    if (isNitrileC(m, i)) return 'nitrile';
    var s = null;
    m.nb(i).forEach(function (x) {
      var a = m.atoms[x.j];
      if (x.order !== 1) return;
      if (a.el === 'O' && a.h === 1 && a.charge === 0) s = s || 'ol';
      if (a.el === 'S' && a.h === 1 && a.charge === 0) s = s || 'thiol';
    });
    return s;
  }
  var SUFFIX_RANK = { nitrile: 3, ol: 2, thiol: 1 };

  /* ---------------------------------------------------- substituent names */

  /* An alkyl group entered at carbon i from atom `from`. */
  function alkyl(m, i, from) {
    /* a ring is never one of these alkyl groups */
    var ring = Mol.ringOf(m);
    if (ring && ring.indexOf(i) >= 0) return null;
    var cs = m.carbonsOn(i).filter(function (x) { return x.j !== from; });
    if (m.nb(i).some(function (x) { return x.j !== from && m.atoms[x.j].el !== 'C' && m.atoms[x.j].el !== 'H'; })) return null;
    if (m.nb(i).some(function (x) { return x.order > 1; })) return null;
    function chainLen(j, f) {
      var k = m.carbonsOn(j).filter(function (x) { return x.j !== f; });
      if (!k.length) return 1;
      if (k.length > 1) return -99;
      return 1 + chainLen(k[0].j, j);
    }
    if (!cs.length) return 'methyl';
    if (cs.length === 1) {
      var n = chainLen(cs[0].j, i);
      if (n > 0) return ['', 'ethyl', 'propyl', 'butyl', 'pentyl'][n];
      /* CH2 then a branch: isobutyl */
      var k2 = m.carbonsOn(cs[0].j).filter(function (x) { return x.j !== i; });
      if (k2.length === 2 && k2.every(function (x) { return m.carbonsOn(x.j).length === 1; })) return 'isobutyl';
      return null;
    }
    if (cs.length === 2) {
      var l = cs.map(function (x) { return chainLen(x.j, i); }).sort();
      if (l[0] === 1 && l[1] === 1) return 'isopropyl';
      if (l[0] === 1 && l[1] === 2) return 'sec-butyl';
      return null;
    }
    if (cs.length === 3 && cs.every(function (x) { return chainLen(x.j, i) === 1; })) return 'tert-butyl';
    return null;
  }

  var ALKOXY = { methyl: 'methoxy', ethyl: 'ethoxy', propyl: 'propoxy', isopropyl: 'isopropoxy', butyl: 'butoxy',
                 'tert-butyl': 'tert-butoxy' };

  /* The prefix name of the group on chain atom c through neighbour j. */
  function prefix(m, c, j, order) {
    var a = m.atoms[j];
    if (order === 2 && a.el === 'C' && m.carbonsOn(j).length === 1 && a.h === 2) return 'methylene';
    if (HALO[a.el]) return HALO[a.el];
    if (a.el === 'O') {
      if (a.h === 1) return 'hydroxy';
      var r = m.carbonsOn(j).filter(function (x) { return x.j !== c; });
      if (r.length === 1) { var al = alkyl(m, r[0].j, j); if (al && ALKOXY[al]) return ALKOXY[al]; }
      return null;
    }
    if (a.el === 'S') {
      if (a.h === 1) return 'sulfanyl';
      var rs = m.carbonsOn(j).filter(function (x) { return x.j !== c; });
      if (rs.length === 1) { var al2 = alkyl(m, rs[0].j, j); if (al2) return '(' + al2 + 'sulfanyl)'; }
      return null;
    }
    if (a.el === 'N' && m.nb(j).some(function (x) { return m.atoms[x.j].el === 'N'; })) return 'azido';
    if (a.el === 'C') {
      if (isNitrileC(m, j)) return 'cyano';
      return alkyl(m, j, c);
    }
    return null;
  }

  /* Sort key: multiplying prefixes are never in it, nor the italic tert-
     and sec-; iso is. */
  function alphaKey(p) { return p.replace(/^\(/, '').replace(/^(tert|sec)-/, ''); }

  function assemble(subs) {
    /* subs: [{ name, loc }] */
    var by = {};
    subs.forEach(function (s) { (by[s.name] = by[s.name] || []).push(s.loc); });
    var names = Object.keys(by).sort(function (p, q) { return alphaKey(p) < alphaKey(q) ? -1 : alphaKey(p) > alphaKey(q) ? 1 : 0; });
    return names.map(function (n) {
      var locs = by[n].sort(function (x, y) { return x - y; });
      return { text: (locs[0] == null ? '' : locs.join(',') + '-') + MULT[locs.length] + n, name: n };
    });
  }

  function joinPrefixes(parts) {
    var out = '';
    parts.forEach(function (p, i) { out += (i ? '-' : '') + p.text; });
    return out;
  }

  /* Compare two locant lists term by term; shorter lists pad with Infinity. */
  function cmpLocs(a, b) {
    for (var i = 0; i < Math.max(a.length, b.length); i++) {
      var x = a[i] == null ? Infinity : a[i], y = b[i] == null ? Infinity : b[i];
      if (x !== y) return x - y;
    }
    return 0;
  }

  /* ------------------------------------------------------- stereo labels */

  function descriptor(list) {
    if (!list.length) return '';
    list.sort(function (p, q) { return p.loc - q.loc; });
    if (list.length === 1) return '(' + list[0].d + ')-';
    return '(' + list.map(function (x) { return x.loc + x.d; }).join(',') + ')-';
  }

  /* --------------------------------------------------------------- chains */

  function chainName(m) {
    var carbons = [];
    m.atoms.forEach(function (a, i) { if (a.el === 'C') carbons.push(i); });
    function cnb(i) { return m.carbonsOn(i).map(function (x) { return x.j; }); }
    /* every simple path of carbons */
    var paths = [];
    carbons.forEach(function (s) {
      (function walk(p) {
        paths.push(p);
        cnb(p[p.length - 1]).forEach(function (j) { if (p.indexOf(j) < 0) walk(p.concat([j])); });
      })([s]);
    });
    var best = null;
    var sufRank = 0;
    carbons.forEach(function (c) { var s = suffixOn(m, c); if (s && SUFFIX_RANK[s] > sufRank) sufRank = SUFFIX_RANK[s]; });

    paths.forEach(function (p) {
      var sufLocs = [], dbLocs = [], subs = [], ok = true, nDb = 0;
      p.forEach(function (c, k) {
        var s = suffixOn(m, c);
        if (s && SUFFIX_RANK[s] === sufRank) sufLocs.push(k + 1);
        m.nb(c).forEach(function (x) {
          var on = p.indexOf(x.j);
          if (on >= 0) {
            if (x.order === 2 && on === k + 1) { dbLocs.push(k + 1); nDb++; }
            return;
          }
          if (m.atoms[x.j].el === 'H') return;
          /* the suffix group itself is not a prefix */
          if (sufRank && suffixOn(m, c) && SUFFIX_RANK[suffixOn(m, c)] === sufRank) {
            var a = m.atoms[x.j];
            if ((a.el === 'O' || a.el === 'S') && a.h === 1) return;
            if (a.el === 'N' && x.order === 3) return;
          }
          var nm = prefix(m, c, x.j, x.order);
          if (!nm) ok = false;
          subs.push({ name: nm, loc: k + 1, atom: x.j });
        });
      });
      if (!ok) return;
      /* the nitrile carbon must end the chain */
      if (sufRank === 3 && sufLocs.length && sufLocs[0] !== 1) return;
      if (sufRank && !sufLocs.length) return;
      var subLocs = subs.map(function (s) { return s.loc; }).sort(function (x, y) { return x - y; });
      var alphaFirst = assemble(subs.map(function (s) { return { name: s.name, loc: null }; }));
      var firstName = alphaFirst.length ? alphaFirst[0].name : null;
      var firstLoc = subs.filter(function (s) { return s.name === firstName; }).map(function (s) { return s.loc; }).sort()[0] || 0;
      var cand = { p: p, sufLocs: sufLocs, dbLocs: dbLocs, nDb: nDb, subs: subs, subLocs: subLocs, firstLoc: firstLoc };
      if (!best || better(cand, best)) best = cand;
    });

    function better(a, b) {
      if (a.nDb !== b.nDb) return a.nDb > b.nDb;
      if (a.p.length !== b.p.length) return a.p.length > b.p.length;
      if (a.subs.length !== b.subs.length) return a.subs.length > b.subs.length;
      var c = cmpLocs(a.sufLocs, b.sufLocs); if (c) return c < 0;
      c = cmpLocs(a.dbLocs, b.dbLocs); if (c) return c < 0;
      c = cmpLocs(a.subLocs, b.subLocs); if (c) return c < 0;
      return a.firstLoc < b.firstLoc;
    }
    if (!best) return null;
    lastSeq = best.p.slice();

    var n = best.p.length;
    var parts = assemble(best.subs);
    var single = n <= 2 && best.subs.length + best.sufLocs.length === 1 && !best.nDb;
    if (n === 1 || single) parts.forEach(function (x) { x.text = x.text.replace(/^[\d,]+-/, ''); });
    var pre = joinPrefixes(parts);
    var stem = STEM[n];
    var suf = { 3: 'nitrile', 2: 'ol', 1: 'thiol' }[sufRank] || '';
    /* ethene and propene need no locant for the double bond */
    var ene = !best.nDb ? '' : n <= 3 ? 'en' : '-' + best.dbLocs.join(',') + '-en';
    var sufLoc = suf === 'nitrile' || n <= 2 ? '' : '-' + best.sufLocs.join(',') + '-';
    var parent;
    if (!suf) parent = stem + (ene ? ene + 'e' : 'ane');
    else if (ene) parent = stem + ene + (sufLoc || '') + suf;
    else parent = stem + (suf === 'ol' ? 'an' : 'ane') + sufLoc + suf;
    var name = pre + parent;

    /* stereo descriptors on the chain */
    var st = [];
    best.p.forEach(function (c, k) {
      var d = Mol.rs(m, c);
      if (d) st.push({ loc: k + 1, d: d });
      if (k + 1 < n) {
        var bk = m.bondBetween(c, best.p[k + 1]);
        var e = Mol.ez(m, bk);
        if (e) st.push({ loc: k + 1, d: e });
      }
    });
    return descriptor(st) + name;
  }

  /* ---------------------------------------------------------------- rings */

  function ringName(m, ring) {
    /* every numbering: a start and a direction */
    var best = null;
    for (var s = 0; s < 6; s++) for (var d = -1; d <= 1; d += 2) {
      var seq = [];
      for (var k = 0; k < 6; k++) seq.push(ring[((s + d * k) % 6 + 6) % 6]);
      var sufLocs = [], dbLocs = [], subs = [], ok = true, sufRank = 0, exo = false;
      seq.forEach(function (c) { var x = suffixOn(m, c); if (x) sufRank = Math.max(sufRank, SUFFIX_RANK[x]); });
      seq.forEach(function (c, k) {
        var sx = suffixOn(m, c);
        if (sx && SUFFIX_RANK[sx] === sufRank) sufLocs.push(k + 1);
        m.nb(c).forEach(function (x) {
          var on = seq.indexOf(x.j);
          if (on >= 0) {
            if (x.order === 2 && (on === k + 1 || (k === 5 && on === 0))) dbLocs.push(k + 1);
            return;
          }
          if (m.atoms[x.j].el === 'H') return;
          if (sufRank && sx && SUFFIX_RANK[sx] === sufRank) {
            var a = m.atoms[x.j];
            if ((a.el === 'O' || a.el === 'S') && a.h === 1) return;
            if (a.el === 'C' && isNitrileC(m, x.j)) return;
          }
          var nm = prefix(m, c, x.j, x.order);
          if (nm === 'methylene') exo = true;
          if (!nm) ok = false;
          subs.push({ name: nm, loc: k + 1, atom: x.j, on: c });
        });
      });
      if (!ok) return null;
      if (sufRank && sufLocs[0] !== 1) continue;
      /* a ring double bond takes 1,2 */
      if (dbLocs.length && dbLocs[0] !== 1) continue;
      var subLocs = subs.map(function (x) { return x.loc; }).sort(function (x, y) { return x - y; });
      var alpha = assemble(subs.map(function (x) { return { name: x.name, loc: null }; }));
      var first = alpha.length ? alpha[0].name : null;
      var firstLoc = subs.filter(function (x) { return x.name === first; }).map(function (x) { return x.loc; }).sort()[0] || 0;
      var cand = { seq: seq, sufLocs: sufLocs, dbLocs: dbLocs, subs: subs, subLocs: subLocs, firstLoc: firstLoc, sufRank: sufRank, exo: exo };
      if (!best || cmpLocs(cand.subLocs, best.subLocs) < 0 ||
          (cmpLocs(cand.subLocs, best.subLocs) === 0 && cand.firstLoc < best.firstLoc)) best = cand;
    }
    if (!best) return null;
    lastSeq = best.seq.slice();
    var parts = assemble(best.subs);
    /* one group alone needs no locant */
    if (best.subs.length === 1 && !best.dbLocs.length && !best.sufRank) parts[0].text = parts[0].text.replace(/^1-/, '');
    if (best.exo && best.subs.length === 1) parts[0].text = parts[0].text.replace(/^1-/, '');
    var parent = 'cyclohex' + (best.dbLocs.length ? 'ene' : 'ane');
    if (best.sufRank === 2) parent = best.dbLocs.length ? 'cyclohex-2-en-1-ol' : 'cyclohexanol';
    if (best.sufRank === 1) parent = 'cyclohexanethiol';
    if (best.sufRank === 3) parent = 'cyclohexanecarbonitrile';
    var name = joinPrefixes(parts) + parent;

    /* cis or trans: two stereogenic ring carbons, each with one group */
    var stereo = best.seq.filter(function (c) {
      var groups = m.nb(c).filter(function (x) { return best.seq.indexOf(x.j) < 0 && m.atoms[x.j].el !== 'H'; });
      var hs = m.hCount(c);
      return m.atoms[c].parity && groups.length === 1 && hs === 1;
    });
    if (stereo.length === 2 && !best.dbLocs.length) {
      var f = stereo.map(function (c) { return face(m, c, best.seq); });
      name = (f[0] === f[1] ? 'cis-' : 'trans-') + name;
    }
    return name;
  }

  /* Which face (+1 top, -1 bottom) the group on ring carbon c is on, for the
     ring traversed in the order `seq`, from its parity on a flat hexagon. */
  function face(m, c, seq) {
    var k = seq.indexOf(c);
    var P = function (i) { var a = i * Math.PI / 3; return [Math.cos(a), Math.sin(a), 0]; };
    var me = P(k), prv = P((k + 5) % 6), nxt = P((k + 1) % 6);
    var up = GEOM.add(GEOM.mul(me, 1.5), [0, 0, 0.8]), dn = GEOM.add(GEOM.mul(me, 1.5), [0, 0, -0.8]);
    var par = m.atoms[c].parity;
    var g = m.nb(c).filter(function (x) { return seq.indexOf(x.j) < 0 && m.atoms[x.j].el !== 'H'; })[0].j;
    var h = par.nb.filter(function (j) { return j !== g && seq.indexOf(j) < 0; })[0];
    var pos = {};
    pos[seq[(k + 5) % 6]] = prv; pos[seq[(k + 1) % 6]] = nxt; pos[g] = up; pos[h] = dn;
    var v = par.nb.map(function (j) { return pos[j]; });
    var vol = GEOM.det3(GEOM.sub(v[1], v[0]), GEOM.sub(v[2], v[0]), GEOM.sub(v[3], v[0]));
    return (vol > 0 ? 1 : -1) === par.sign ? 1 : -1;
  }

  var lastSeq = null;

  function name(m) {
    if (m._name !== undefined && m._nameKey === key(m)) return m._name;
    var ring = Mol.ringOf(m);
    lastSeq = null;
    var n = ring ? ringName(m, ring) : chainName(m);
    Object.defineProperty(m, '_name', { value: n, writable: true, configurable: true, enumerable: false });
    Object.defineProperty(m, '_seq', { value: lastSeq, writable: true, configurable: true, enumerable: false });
    Object.defineProperty(m, '_nameKey', { value: key(m), writable: true, configurable: true, enumerable: false });
    return n;
  }

  /* A cheap fingerprint of the graph, so a cached name is never stale. */
  function key(m) {
    return m.atoms.map(function (a) { return a.el + a.h + a.charge + (a.parity ? a.parity.sign + a.parity.nb.join('.') : ''); }).join('|') +
      '#' + m.bonds.map(function (b) { return b.a + '-' + b.b + ':' + b.order + (b.cfg ? b.cfg.na + b.cfg.rel + b.cfg.nb : ''); }).join('|');
  }

  /* Locant of each atom of the parent chain or ring: { atomIndex: n }. */
  function numbers(m) {
    name(m);
    var out = {};
    (m._seq || []).forEach(function (i, k) { out[i] = k + 1; });
    return out;
  }

  /* With a capital letter, for the start of a sentence or a caption. */
  function cap(s) {
    var i = s.search(/[a-z]/);
    if (i < 0) return s;
    /* never capitalise an italic prefix's letter after a locant: (R)-2-bromo... */
    return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1);
  }

  return { name: name, cap: cap, face: face, alkyl: alkyl, numbers: numbers };
})();

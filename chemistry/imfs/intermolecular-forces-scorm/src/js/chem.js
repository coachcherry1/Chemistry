/* chem.js: everything the activity says about a substance, worked out from
 * its structure (data.js), so the steps, the questions, the answer key and
 * the validator cannot disagree.
 *
 * Electrons    the sum of the atomic numbers: every electron in the molecule.
 *              More electrons, a bigger and more polarizable electron cloud,
 *              stronger London dispersion forces (LDF).
 * Polar        has a polar bond (an electronegativity difference of 0.4 or
 *              more, so C–H and C–C do not count) and is not radially
 *              symmetric. Only one-centre molecules can be symmetric: no lone
 *              pairs on the centre and every outer atom the same (CH4). A
 *              two-atom molecule is polar if its bond is.
 * Forces       every substance has LDF; a polar one also has dipole-dipole
 *              forces; one with an H bonded to N, O or F also hydrogen bonds.
 * H-bonds      a donor is an H bonded to N, O or F; a receiver is a lone
 *              pair on N, O or F. Each hydrogen bond needs one of each, so a
 *              molecule can make as many as the smaller of the two numbers:
 *              water 2, ammonia 1, ethanol 1, ethylene glycol 2.
 *
 * The class compares two substances like this (compare()):
 *   1. different strongest forces: LDF < dipole-dipole < hydrogen bonding
 *   2. both hydrogen bond: more hydrogen bonds per molecule wins
 *   3. otherwise: more electrons, stronger LDF
 * The activity only ever asks a comparison where this gives one answer AND
 * the real melting and boiling points agree with it (tools/validate.js).
 */

var Chem = (function () {
  'use strict';

  var VALENCE = { H: 1, He: 2, C: 4, N: 5, O: 6, F: 7, Ne: 8, Cl: 7, Ar: 8, Br: 7, Kr: 8, I: 7, Xe: 8 };
  var NOBLE = { He: 1, Ne: 1, Ar: 1, Kr: 1, Xe: 1 };
  var NOF = { N: 1, O: 1, F: 1 };
  var POLAR_BOND = 0.4;
  var R = 8.314;

  var SUB = '₀₁₂₃₄₅₆₇₈₉';
  function pretty(f) { return f.replace(/\d/g, function (d) { return SUB[+d]; }); }

  function bondOrderSum(s, i) {
    return s.bonds.reduce(function (a, b) { return a + (b[0] === i || b[1] === i ? b[2] : 0); }, 0);
  }
  function neighbours(s, i) {
    var out = [];
    s.bonds.forEach(function (b) { if (b[0] === i) out.push(b[1]); else if (b[1] === i) out.push(b[0]); });
    return out;
  }

  /* lone pairs on each atom: what is left of its valence electrons after its
     bonds (every atom here is neutral) */
  function lonePairs(s) {
    return s.atoms.map(function (a, i) {
      if (a[0] === 'H') return 0;
      if (NOBLE[a[0]]) return VALENCE[a[0]] / 2;
      return (VALENCE[a[0]] - bondOrderSum(s, i)) / 2;
    });
  }

  /* the directions (degrees, y down) each atom's lone pairs are drawn in: as
     far from its bonds and from each other as 16 possible directions allow */
  function lpAngles(s, i, n) {
    if (!n) return [];
    var a = s.atoms[i];
    var taken = neighbours(s, i).map(function (j) {
      var b = s.atoms[j];
      return Math.atan2(b[2] - a[2], b[1] - a[1]) * 180 / Math.PI;
    });
    var cands = [];
    for (var k = 0; k < 16; k++) cands.push(-90 + k * 22.5);
    function gap(x, y) { var d = Math.abs(((x - y) % 360 + 540) % 360 - 180); return d; }
    var best = null, bestScore = null;
    (function choose(start, set) {
      if (set.length === n) {
        var near = 999, sum = 0;
        set.forEach(function (x, p) {
          var m = 999;
          taken.forEach(function (t) { m = Math.min(m, gap(x, t)); });
          set.forEach(function (y, q) { if (q !== p) m = Math.min(m, gap(x, y)); });
          near = Math.min(near, m);
          sum += m;
        });
        var sc = [near, sum];
        if (!best || sc[0] > bestScore[0] + 1e-9 || (Math.abs(sc[0] - bestScore[0]) < 1e-9 && sc[1] > bestScore[1] + 1e-9)) {
          best = set.slice(); bestScore = sc;
        }
        return;
      }
      for (var c = start; c < cands.length; c++) { set.push(cands[c]); choose(c + 1, set); set.pop(); }
    })(0, []);
    return best;
  }

  var cache = {};

  function sub(id) {
    if (cache[id]) return cache[id];
    var s = SUBSTANCES[id];
    if (!s) throw new Error('unknown substance ' + id);
    var lp = lonePairs(s);
    var electrons = 0, mass = 0;
    s.atoms.forEach(function (a) { electrons += ELEMENTS[a[0]].z; mass += ELEMENTS[a[0]].mass; });

    /* polar bonds, and polarity */
    var dEN = s.bonds.map(function (b) {
      var x = ELEMENTS[s.atoms[b[0]][0]].en, y = ELEMENTS[s.atoms[b[1]][0]].en;
      return Math.abs(x - y);
    });
    var polarBond = dEN.some(function (d) { return d >= POLAR_BOND; });
    var polar = false, why = s.atoms.length === 1 ? 'atom' : !polarBond ? 'bonds' : 'asym';
    if (polarBond) {
      if (s.atoms.length === 2) polar = true;
      else {
        var centre = -1;
        s.atoms.forEach(function (a, i) { if (neighbours(s, i).length === s.atoms.length - 1) centre = i; });
        if (centre >= 0) {
          var outer = neighbours(s, centre).map(function (j) { return s.atoms[j][0]; });
          var same = outer.every(function (e) { return e === outer[0]; });
          polar = !(lp[centre] === 0 && same);
          if (!polar) why = 'sym';
        } else polar = true;
      }
    }

    /* hydrogen bonding: donors and receivers */
    var donors = [], receivers = [];
    s.atoms.forEach(function (a, i) {
      if (a[0] === 'H' && neighbours(s, i).some(function (j) { return NOF[s.atoms[j][0]]; })) donors.push(i);
      if (NOF[a[0]]) for (var k = 0; k < lp[i]; k++) receivers.push([i, k]);
    });
    var hbond = donors.length > 0;
    var pairs = hbond ? Math.min(donors.length, receivers.length) : 0;
    var imf = hbond ? 'hbond' : polar ? 'dipole' : 'ldf';

    var out = {
      id: id, name: s.name, text: pretty(s.formula), electrons: electrons, mass: mass,
      mp: s.mp, bp: s.bp, lp: lp, polar: polar, polarBond: polarBond, imf: imf, polarWhy: why,
      donors: donors, receivers: receivers, pairs: pairs, noble: s.atoms.length === 1,
      everyday: (typeof EVERYDAY !== 'undefined' && EVERYDAY[id]) || ''
    };
    cache[id] = out;
    return out;
  }

  var RANK = { ldf: 0, dipole: 1, hbond: 2 };
  var IMF_NAME = { ldf: 'London dispersion forces only', dipole: 'dipole-dipole forces (and LDF)',
                   hbond: 'hydrogen bonding (and dipole-dipole forces and LDF)' };
  var IMF_SHORT = { ldf: 'LDF', dipole: 'dipole-dipole', hbond: 'hydrogen bonding' };

  /* The class's comparison: the stronger IMFs, or null if the rules cannot
     tell. basis: 'type' | 'pairs' | 'electrons'. */
  function compare(a, b) {
    var x = sub(a), y = sub(b);
    if (RANK[x.imf] !== RANK[y.imf]) return { winner: RANK[x.imf] > RANK[y.imf] ? a : b, basis: 'type' };
    if (x.imf === 'hbond' && x.pairs !== y.pairs) return { winner: x.pairs > y.pairs ? a : b, basis: 'pairs' };
    if (x.electrons !== y.electrons) return { winner: x.electrons > y.electrons ? a : b, basis: 'electrons' };
    return { winner: null, basis: null };
  }

  /* Does real data agree that `w` has the stronger IMFs than `l`? Higher
     boiling point, and higher melting point whenever both have one. */
  function dataAgrees(w, l) {
    var x = sub(w), y = sub(l);
    if (!(x.bp > y.bp)) return false;
    if (x.mp != null && y.mp != null && !(x.mp > y.mp)) return false;
    return true;
  }

  /* why, in the class's words */
  function reason(a, b) {
    var c = compare(a, b);
    if (!c.winner) return '';
    var w = sub(c.winner), l = sub(c.winner === a ? b : a);
    if (c.basis === 'type') {
      return w.text + ' has ' + IMF_SHORT[w.imf] + ', and ' + l.text + ' has ' +
        (l.imf === 'ldf' ? 'only LDF' : 'only ' + IMF_SHORT[l.imf] + ' and LDF') + '. ' + cap(IMF_SHORT[w.imf]) +
        ' is stronger' + (Math.abs(w.electrons - l.electrons) <= 4 ? ', and their electron counts are about the same (' +
        w.electrons + ' and ' + l.electrons + ')' : '') + '.';
    }
    if (c.basis === 'pairs') {
      return w.text + ' can make ' + w.pairs + ' hydrogen bonds per molecule and ' + l.text + ' only ' + l.pairs + '.';
    }
    return w.text + ' has more electrons (' + w.electrons + ' to ' + l.electrons + '), so it is more polarizable: ' +
      'stronger LDF.';
  }

  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  /* the IMFs a substance has, as the class names them */
  function forces(id) {
    var x = sub(id);
    return { ldf: true, dipole: x.polar, hbond: x.imf === 'hbond' };
  }

  /* why a substance is polar or not, in the class's words */
  function polarText(id) {
    var x = sub(id);
    if (x.polar) return x.text + ' is polar: it has polar bonds and is not radially symmetric, so it has a δ+ end and a δ− end.';
    if (x.polarWhy === 'atom') return x.text + ' is a single atom: no bonds, so no permanent δ+ or δ− end.';
    if (x.polarWhy === 'sym') return x.text + ' has polar bonds, but it is radially symmetric, so it is nonpolar.';
    var s = SUBSTANCES[id];
    var same = s.atoms.every(function (a) { return a[0] === s.atoms[0][0]; });
    if (same) return x.text + ' is two identical atoms sharing the bond equally: nonpolar.';
    var kinds = [];
    s.bonds.forEach(function (b) {
      var k = [s.atoms[b[0]][0], s.atoms[b[1]][0]].sort().join('–');
      if (kinds.indexOf(k) < 0) kinds.push(k);
    });
    return x.text + ' has only ' + kinds.join(' and ') + ' bonds, which are barely polar (a difference of 0.35 or less): nonpolar.';
  }

  /* What is wrong with a student's choice of IMFs for a substance, or ''
     when it is right. picks: { ldf, dipole, hbond } */
  function forcesFeedback(id, picks) {
    var x = sub(id), want = forces(id), s = SUBSTANCES[id];
    if (!picks.ldf) return 'Every substance has London dispersion forces: they come from its electrons (' + x.text + ' has ' +
      x.electrons + ').';
    if (picks.dipole !== want.dipole) return polarText(id) + (want.dipole ? ' So it has dipole-dipole forces.' :
      ' So no dipole-dipole forces.');
    if (picks.hbond && !want.hbond) {
      var hs = s.atoms.map(function (a, i) { return a[0] === 'H' ? s.atoms[neighbours(s, i)[0]][0] : null; }).filter(Boolean);
      var on = hs.filter(function (e, i) { return hs.indexOf(e) === i; });
      return hs.length
        ? x.text + ' has no H bonded to N, O or F (its H ' + (hs.length > 1 ? 'atoms are' : 'is') + ' on ' + on.join(' and ') +
          '), so it cannot donate a hydrogen bond. No hydrogen bonding.'
        : x.text + ' has no H at all, so it cannot hydrogen bond.';
    }
    if (!picks.hbond && want.hbond) {
      var on2 = x.donors.map(function (i) { return s.atoms[neighbours(s, i)[0]][0]; })[0];
      return x.text + ' has an H bonded to ' + on2 + ', so it hydrogen bonds (and, being polar, it has dipole-dipole forces too).';
    }
    return '';
  }

  /* "LDF, dipole-dipole and hydrogen bonding", for a summary */
  function forcesText(id) {
    var f = forces(id), out = ['LDF'];
    if (f.dipole) out.push('dipole-dipole');
    if (f.hbond) out.push('hydrogen bonding');
    return out.length < 2 ? 'LDF only' : out.slice(0, -1).join(', ') + ' and ' + out[out.length - 1];
  }

  function toC(K) { return K - 273.15; }
  /* whole degrees, except just below zero (butane boils at −0.5 °C) */
  function fmtC(K) {
    var x = toC(K), c = Math.abs(x) < 1 && Math.abs(x - Math.round(x)) > 0.05 ? Math.round(x * 10) / 10 : Math.round(x);
    if (c === 0) c = 0;
    return (c < 0 ? '−' + (-c) : String(c)) + ' °C';
  }
  function fmtK(K) { return Math.round(K) + ' K'; }
  function fmtT(K) { return fmtC(K) + ' (' + fmtK(K) + ')'; }

  /* the real phase at 1 atm, from the real melting and boiling points */
  function phaseAt(id, K) {
    var x = sub(id);
    if (K >= x.bp) return 'gas';
    if (x.mp == null || K >= x.mp) return 'liquid';
    return 'solid';
  }

  /* average speed of the molecules, m/s: sqrt(8RT / πM) */
  function speed(id, K) { return Math.sqrt(8 * R * K / (Math.PI * sub(id).mass / 1000)); }

  return {
    sub: sub, compare: compare, dataAgrees: dataAgrees, reason: reason, phaseAt: phaseAt, speed: speed,
    lpAngles: lpAngles, neighbours: neighbours, pretty: pretty, cap: cap, forces: forces, forcesFeedback: forcesFeedback,
    forcesText: forcesText, polarText: polarText,
    toC: toC, fmtC: fmtC, fmtK: fmtK, fmtT: fmtT, IMF_NAME: IMF_NAME, IMF_SHORT: IMF_SHORT, RANK: RANK, NOF: NOF
  };
})();

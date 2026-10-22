/* avalues.js: A-values, and the energy of each chair built from them.
 *
 * The A-value of a group is how much higher in energy the chair with that
 * group axial is than the chair with it equatorial. An axial group crowds the
 * two axial H atoms on the same face, two carbons away (1,3-diaxial
 * interactions), so each of those interactions costs half the A-value.
 *
 * The numbers are the ones the Newman packages already use, so the two
 * activities never disagree: Klein's 3.8 kJ/mol for each CH₃/H 1,3-diaxial
 * interaction (the same as a gauche-butane interaction, so axial CH₃ costs
 * 2 × 3.8 = 7.6), and the per-interaction values the Newman strain table
 * gives the halogens and branched groups.
 *
 * A chair's energy is the sum over every pair of axial positions on the same
 * face, two carbons apart: nothing for H/H (that is the baseline of
 * cyclohexane itself), half the A-value for X/H, and a measured value for
 * the one X/Y pair the activity uses (two axial CH₃ groups on one face).
 *
 * Shares of molecules use the Boltzmann factor at 25 °C: with these numbers,
 * methylcyclohexane is 95% equatorial and tert-butylcyclohexane all but 1 in
 * 10,000, as the textbooks say.
 */

var AVAL = (function () {
  'use strict';

  var SOURCES = {
    klein:  'Klein: an axial CH₃ costs two gauche-butane interactions, 2 × 3.8 kJ/mol',
    newman: 'Twice the 1,3-diaxial value in the Newman packages\' strain table (from measured A-values)',
    syn:    'Measured syn-diaxial CH₃/CH₃ interaction, about 3.7 kcal/mol (Allinger and Miller); not in Klein'
  };

  /* [group, A-value in kJ/mol, source] */
  var ROWS = [
    ['Cl',  2.0,  'newman'],
    ['Br',  2.0,  'newman'],
    ['CH3', 7.6,  'klein'],
    ['iPr', 9.2,  'newman'],
    ['tBu', 22.8, 'newman']
  ];

  /* Two non-H groups axial on the same face, two carbons apart. */
  var PAIRS = [['CH3', 'CH3', 15.4, 'syn']];

  var NAMES = { H: 'H', CH3: 'CH₃', Cl: 'Cl', Br: 'Br', iPr: 'CH(CH₃)₂', tBu: 'C(CH₃)₃' };

  var A = { H: 0 };
  ROWS.forEach(function (r) { A[r[0]] = r[1]; });

  function key(g) { return GROUPS[g] ? GROUPS[g].strain : g; }

  function aValue(g) {
    var k = key(g);
    if (A[k] == null) throw new Error('No A-value for ' + g);
    return A[k];
  }

  function pairCost(x, y) {
    x = key(x); y = key(y);
    if (x === 'H' && y === 'H') return 0;
    if (y === 'H') return A[x] / 2;
    if (x === 'H') return A[y] / 2;
    for (var i = 0; i < PAIRS.length; i++) {
      var p = PAIRS[i];
      if ((p[0] === x && p[1] === y) || (p[0] === y && p[1] === x)) return p[2];
    }
    throw new Error('No 1,3-diaxial value for ' + x + '/' + y);
  }

  function pairLabel(x, y) {
    x = key(x); y = key(y);
    if (x === 'H') { var t = x; x = y; y = t; }
    return NAMES[x] + '/' + NAMES[y];
  }

  /* The 1,3-diaxial interactions in chair k (0 or 1) of `mol`:
     [{label, cost, n, pos: [[p, q], ...]}], biggest first, and their sum. */
  function chair(mol, k) {
    var found = {}, order = [];
    CHAIR.FACES.forEach(function (f) {
      for (var c = 1; c <= 6; c++) {
        var p = c + f, q = CHAIR.posKey(c + 2, f);
        if (!CHAIR.isAxial(p, k) || !CHAIR.isAxial(q, k)) continue;
        var gp = MOLECULES.groupAt(mol, c, f), gq = MOLECULES.groupAt(mol, CHAIR.carbonOf(q), f);
        var cost = pairCost(gp, gq);
        if (!cost) continue;
        var lab = pairLabel(gp, gq);
        if (!found[lab]) { found[lab] = { label: lab, cost: cost, n: 0, pos: [] }; order.push(lab); }
        found[lab].n++;
        found[lab].pos.push([p, q]);
      }
    });
    var parts = order.map(function (l) { return found[l]; }).sort(function (a, b) { return b.cost - a.cost; });
    return { parts: parts, e: parts.reduce(function (s, x) { return s + x.cost * x.n; }, 0) };
  }

  function energy(mol, k) { return chair(mol, k).e; }

  /* Which chair is lower (0 or 1), or -1 if they are equal. */
  function better(mol) {
    var d = energy(mol, 0) - energy(mol, 1);
    return Math.abs(d) < 0.05 ? -1 : d > 0 ? 1 : 0;
  }

  var RT = 0.0083145 * 298.15;

  /* Fraction of molecules in chair k at 25 °C. */
  function share(mol, k) {
    var d = energy(mol, k ? 0 : 1) - energy(mol, k ? 1 : 0);
    return 1 / (1 + Math.exp(-d / RT));
  }

  /* "about 19 in 20" for the larger share p (0.5 to 1). */
  function shareText(p) {
    var q = 1 - p;
    if (q > 0.45) return 'about half';
    if (q > 0.2) return 'about ' + Math.round(10 * p) + ' in 10';
    if (q > 0.035) return 'about ' + Math.round(20 * p) + ' in 20';
    if (q > 0.015) return 'about ' + Math.round(40 * p) + ' in 40';
    if (q > 0.004) return 'about 99 in 100';
    if (q > 0.0005) return 'about 499 in 500';
    var n = Math.pow(10, Math.round(Math.log(1 / q) / Math.LN10));
    return 'all but about 1 in ' + n.toLocaleString('en-US');
  }

  /* Tidy numbers for display: 7.6, 2, never 7.6000000001. */
  function fmt(x) {
    var r = Math.round(x * 10) / 10;
    if (Math.abs(r) < 0.05) r = 0;
    return r % 1 === 0 ? String(r) : r.toFixed(1);
  }

  /* "CH₃/H 1,3-diaxial × 2 = 7.6 kJ/mol" */
  function breakdown(mol, k) {
    var c = chair(mol, k);
    if (!c.parts.length) return 'No 1,3-diaxial interactions: 0 kJ/mol.';
    return c.parts.map(function (p) {
      return p.label + ' 1,3-diaxial ' + (p.n > 1 ? p.n + ' × ' + fmt(p.cost) : fmt(p.cost));
    }).join('  +  ') + '  =  ' + fmt(c.e) + ' kJ/mol';
  }

  return {
    SOURCES: SOURCES,
    ROWS: ROWS,
    PAIRS: PAIRS,
    NAMES: NAMES,
    RT: RT,
    aValue: aValue,
    pairCost: pairCost,
    chair: chair,
    energy: energy,
    better: better,
    share: share,
    shareText: shareText,
    breakdown: breakdown,
    fmt: fmt
  };
})();

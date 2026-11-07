/* data.js: the numbers of the lab. Every reading on the balance comes from here, so the paper sheet's
 * calculations work out for every student.
 *
 * Each student gets random masses (from a seed, so a reload gives the same ones):
 *   crucible + lid   25.0000 to 35.0000 g
 *   magnesium        0.1000 to 0.2000 g   (a stand-in for what fits in a real crucible)
 * All are read to 0.0001 g. The product mass is worked out from what happened in the crucible:
 *   - the magnesium that burned in oxygen made MgO (24.31 + 16.00 = 40.31 g/mol of Mg);
 *   - about a sixth of the magnesium (6 of 36 atoms in the magnifier) reacted with nitrogen to make
 *     Mg3N2 (100.95 g per 3 Mg, 33.65 g per Mg). The water step converts it: 6 drops of DI water finish
 *     both clusters (3 drops each), so fewer drops leave some nitride behind;
 *   - a small random scatter (within 1%) stands in for everything else (a bit of smoke, a warm balance).
 * With the water step done, the O : Mg ratio of the data comes out between about 0.97 and 1.03.
 */

var Lab = (function () {
  'use strict';

  var MG = 24.31, O = 16.00, N = 14.01;
  var NITRIDE_FRACTION = 1 / 6;                 /* of the magnesium, before the water step */
  var DROPS_TO_FINISH = 6;                      /* 3 drops per cluster, two clusters */

  function r4(x) { return Math.round(x * 10000) / 10000; }

  /* the student's numbers, from a seed */
  function make(seed) {
    var rand = UI.rng(seed);
    var cruc = r4(25 + rand() * 10);
    var mg = r4(0.1 + rand() * 0.1);
    var eps = (rand() - 0.5) * 0.02;            /* within 1% */
    return { cruc: cruc, mg: mg, eps: eps };
  }

  /* the fraction of the magnesium still held as nitride after `drops` drops of water */
  function nitrideLeft(drops) { return NITRIDE_FRACTION * Math.max(0, 1 - drops / DROPS_TO_FINISH); }

  /* mass of the product alone, in g, for a run in which `drops` drops of water were added */
  function product(d, drops) {
    var fr = nitrideLeft(drops), n = d.mg / MG;
    var perMgNitride = (3 * MG + 2 * N) / 3;
    return r4(n * ((1 - fr) * (MG + O) + fr * perMgNitride) * (1 + d.eps));
  }

  /* what the balance shows for the crucible, lid and product together */
  function finalTotal(d, drops) { return r4(d.cruc + product(d, drops)); }

  /* the sheet's calculation, so the validator can check it: moles of O and Mg, and their ratio */
  function ratio(d, drops) {
    var oxy = finalTotal(d, drops) - r4(d.cruc + d.mg);
    return { oxy: r4(oxy), nMg: d.mg / MG, nO: oxy / O, ratio: (oxy / O) / (d.mg / MG) };
  }

  /* a balance reading as text, 4 decimals */
  function fmt(x) { return x.toFixed(4) + ' g'; }

  return { MG: MG, O: O, N: N, NITRIDE_FRACTION: NITRIDE_FRACTION, DROPS_TO_FINISH: DROPS_TO_FINISH, make: make, product: product,
           finalTotal: finalTotal, ratio: ratio, nitrideLeft: nitrideLeft, fmt: fmt, r4: r4 };
})();

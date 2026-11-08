/* data.js: the numbers of the hydrate lab. Every reading on the balance comes from here, so the paper sheet's
 * calculations work out for every student, and like real data they are close to the formula but never exact.
 *
 * The solid is copper(II) sulfate pentahydrate, CuSO4 . 5H2O (blue crystals; white once the water is gone). The
 * student shakes out the solid, so the mass of hydrate is the student's own (the dispensed amounts come from a seed,
 * so a reload gives the same ones). Each student gets:
 *   crucible + lid   25.0000 to 35.0000 g
 *   a little solid left behind in the weigh boat when it is poured (0.003 to 0.008 g)
 *   an experimental error: the water : salt mole ratio comes out 0.10 to 0.15 away from 5 (above or below),
 *   so every student's data give 4.85 to 4.90 or 5.10 to 5.15 and round to 5
 * Heating removes most of the water at first and then less and less, so the mass falls 3 or 4 times (never fewer
 * than 3 heatings, at most 5) until two masses in a row agree within 0.01 g, the usual "constant mass".
 * Class roundings: Cu 63.5, S 32.1, O 16.0, H 1.0 (CuSO4 159.6, H2O 18.0).
 */

var Lab = (function () {
  'use strict';

  var M_SALT = 159.6, M_WATER = 18.0, X_TRUE = 5;
  var TOL = 0.01;                                 /* two masses in a row this close (g) count as constant */
  var MIN_HEATS = 3, MAX_HEATS = 5;
  var MIN_SOLID = 1.5, MAX_SOLID = 3.0;           /* the student shakes out about 2 g */
  var CLICKS = 60;

  function r4(x) { return Math.round(x * 10000) / 10000; }

  /* the student's numbers, from a seed */
  function make(seed) {
    var rand = UI.rng(seed);
    var d = { seed: seed };
    d.cruc = r4(25 + rand() * 10);
    d.loss = r4(0.003 + rand() * 0.005);
    d.amounts = [];
    for (var i = 0; i < CLICKS; i++) d.amounts.push(r4(0.1 + rand() * 0.22));
    d.dev = (0.1 + rand() * 0.05) * (rand() < 0.5 ? -1 : 1);
    d.f = [0.8 + rand() * 0.08, 0.93 + rand() * 0.04, 0.8 + rand() * 0.12, 0.8 + rand() * 0.15, 0.8 + rand() * 0.15];
    d.noise = [];
    for (i = 0; i < MAX_HEATS; i++) d.noise.push((rand() - 0.5) * 0.004);
    return d;
  }

  /* what the student has shaken out after `clicks` shakes (g) */
  function dispensed(d, clicks) {
    var s = 0;
    for (var i = 0; i < Math.min(clicks, CLICKS); i++) s += d.amounts[i];
    return r4(s);
  }

  /* the hydrate that ends up in the crucible when the boat is poured */
  function inCrucible(d, clicks) { return r4(dispensed(d, clicks) - d.loss); }

  /* the heating run for a mass of hydrate mh (g): the contents of the crucible after each heating */
  function run(d, mh) {
    var x = X_TRUE + d.dev;
    var A = r4(mh * M_SALT / (M_SALT + x * M_WATER));             /* the final mass of the white solid */
    var W = mh - A;                                                /* the water that left */
    var e = [], k, left = W;
    for (k = 0; k < MAX_HEATS; k++) { left = left * (1 - d.f[k]); e.push(k === 0 ? left + d.noise[k] : Math.min(left + d.noise[k], e[k - 1])); }   /* the mass never goes back up */
    var K = MAX_HEATS;
    for (k = MIN_HEATS - 1; k < MAX_HEATS; k++) if (Math.abs(e[k - 1] - e[k]) <= TOL * 0.9) { K = k + 1; break; }
    var contents = [];
    for (k = 0; k < K; k++) contents.push(r4(A + e[k] - e[K - 1]));
    var hyd = [1];                                                  /* how hydrated the solid is after 0, 1, 2 ... heatings */
    for (k = 0; k < K; k++) hyd.push(Math.max(0, (contents[k] - A) / W));
    return { x: x, A: A, W: W, K: K, contents: contents, hyd: hyd };
  }

  /* what the balance shows after heating number k (1 to K): crucible, lid and contents */
  function reading(d, mh, k) { return r4(d.cruc + run(d, mh).contents[k - 1]); }

  /* the sheet's calculation, so the validator can check it */
  function ratio(d, mh) {
    var r = run(d, mh);
    var m0 = r4(d.cruc + mh), mf = r4(d.cruc + r.contents[r.K - 1]);
    var water = m0 - mf, salt = mf - d.cruc;
    return { water: r4(water), salt: r4(salt), nWater: water / M_WATER, nSalt: salt / M_SALT, x: (water / M_WATER) / (salt / M_SALT), K: r.K };
  }

  /* a balance reading as text, 4 decimals */
  function fmt(x) { return x.toFixed(4) + ' g'; }

  return { M_SALT: M_SALT, M_WATER: M_WATER, X_TRUE: X_TRUE, TOL: TOL, MIN_HEATS: MIN_HEATS, MAX_HEATS: MAX_HEATS, MIN_SOLID: MIN_SOLID, MAX_SOLID: MAX_SOLID, CLICKS: CLICKS,
           make: make, dispensed: dispensed, inCrucible: inCrucible, run: run, reading: reading, ratio: ratio, fmt: fmt, r4: r4 };
})();

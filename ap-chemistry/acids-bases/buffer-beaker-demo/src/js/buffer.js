/* buffer.js: the buffer model of the beaker demo. Everything on screen (the pH,
 * the particles, the curves, the strength chart) comes from here, so they cannot
 * disagree.
 *
 * One generic conjugate pair, written HA (the ACID MEMBER, a weak acid) and A- (the BASE
 * MEMBER, its conjugate base), with Ka 1.8e-5 (pKa 4.74). The salt is NaA, so Na+ is the
 * spectator that comes with A-. The numbers are those of acetic acid and acetate, but the
 * tool never names them: it is any weak acid and its conjugate base.
 *
 * A beaker is described by four numbers:
 *   ha, a   the acid member and the base member, in units of 0.010 M (a slider
 *           step). They may be any real number: the strength chart uses ha and a
 *           that no slider can reach.
 *   up, dn  drops of strong acid (HCl) and of strong base (NaOH) added. One drop
 *           is 0.010 M, the same unit. The volume change is ignored.
 * The pH is solved exactly from a charge balance:
 *   acid-type pair   [Na+] + [H+] = [A-] + [Cl-] + [OH-]
 *   base-type pair   [NH4+] + [Na+] + [H+] = [Cl-] + [OH-]
 */

var Buf = (function () {
  'use strict';

  var KW = 1e-14;
  var U = 0.010;            /* mol/L of one particle or one drop */
  var MAXC = 20;            /* the sliders go from 0 to 20 units (0.20 M) */
  var MAXD = 12;            /* the most drops of each kind */
  var FAM = 2 * MAXC;       /* acid-member + base-member particles the beaker can hold */

  var PAIRS = {
    HA: { id: 'HA', type: 'acid', name: 'A weak acid, HA, and its conjugate base, A⁻', haFormula: 'HA', aFormula: 'A⁻',
          ha: 'HA', a: 'A⁻', ka: 1.8e-5, spectator: 'Na⁺', salt: 'NaA' }
  };

  function pKa(pair) { return -Math.log10(PAIRS[pair].ka); }

  /* the spectator ions, in drops or particles */
  function ions(pair, ha, a, up, dn) {
    return PAIRS[pair].type === 'acid'
      ? { Na: a + dn, Cl: up }
      : { Na: dn, Cl: ha + up };
  }

  function solve(pair, ha, a, up, dn) {
    var P = PAIRS[pair], ka = P.ka, ct = (ha + a) * U, io = ions(pair, ha, a, up, dn);
    var net = (io.Na - io.Cl) * U;
    var lo = 1e-14, hi = 1;
    for (var i = 0; i < 200; i++) {
      var mid = Math.sqrt(lo * hi), f;
      if (P.type === 'acid') f = net + mid - ct * ka / (ka + mid) - KW / mid;
      else f = ct * mid / (ka + mid) + net + mid - KW / mid;
      if (f > 0) hi = mid; else lo = mid;
    }
    var h = Math.sqrt(lo * hi);
    return { h: h, oh: KW / h, fb: ka / (ka + h) };
  }

  function pH(pair, ha, a, up, dn) { return -Math.log10(solve(pair, ha, a, up || 0, dn || 0).h); }

  /* whole-particle counts for the beaker (ha and a are whole numbers there) */
  function counts(pair, ha, a, up, dn) {
    var r = solve(pair, ha, a, up, dn), io = ions(pair, ha, a, up, dn), T = ha + a;
    var A = Math.round(T * r.fb);
    return { HA: T - A, A: A, Na: io.Na, Cl: io.Cl, H: Math.round(r.h / U), OH: Math.round(r.oh / U) };
  }

  function chargeBalanced(pair, ha, a, up, dn) {
    var c = counts(pair, ha, a, up, dn);
    return PAIRS[pair].type === 'acid' ? c.Na + c.H === c.A + c.Cl + c.OH : c.HA + c.Na + c.H === c.Cl + c.OH;
  }

  /* the curve against NET drops (negative is NaOH): [net, pH], one point per quarter drop */
  function curve(pair, ha, a) {
    var pts = [];
    for (var x = -MAXD; x <= MAXD + 1e-9; x += 0.25) pts.push([x, x >= 0 ? pH(pair, ha, a, x, 0) : pH(pair, ha, a, 0, -x)]);
    return pts;
  }

  /* the change in pH when n drops of acid ('acid') or base ('base') go into a beaker with ha and a */
  function change(pair, ha, a, dir, n) {
    var start = pH(pair, ha, a, 0, 0);
    var end = dir === 'acid' ? pH(pair, ha, a, n, 0) : pH(pair, ha, a, 0, n);
    return { start: start, end: end, delta: end - start };
  }

  /* how much of the member that reacts is left after n drops (0 when it is all used up) */
  function reserve(ha, a, dir, n) { return Math.max(0, (dir === 'acid' ? a : ha) - n); }

  /* Henderson-Hasselbalch: pKa + log(base member / acid member). Only for a buffer. */
  function hh(pair, ha, a) { return pKa(pair) + Math.log10(a / ha); }
  function appreciable(ha, a) { return ha > 0 && a > 0 && ha / a <= 10 && a / ha <= 10; }

  function reactAcid(pair) { var P = PAIRS[pair]; return 'H⁺ + ' + P.a + ' → ' + P.ha; }
  function reactBase(pair) { var P = PAIRS[pair]; return 'OH⁻ + ' + P.ha + ' → ' + P.a + ' + H₂O'; }

  /* the colour of a universal-indicator-like liquid, as a hex string */
  var STOPS = [[0, [211, 47, 47]], [2, [230, 74, 25]], [4, [249, 168, 37]], [6, [192, 202, 51]], [7, [67, 160, 71]],
               [8, [38, 166, 154]], [10, [30, 136, 229]], [12, [94, 53, 177]], [14, [74, 20, 140]]];
  function colour(v) {
    v = Math.max(0, Math.min(14, v));
    for (var i = 1; i < STOPS.length; i++) {
      if (v <= STOPS[i][0]) {
        var a = STOPS[i - 1], b = STOPS[i], t = (v - a[0]) / (b[0] - a[0]);
        var c = a[1].map(function (x, k) { return Math.round(x + (b[1][k] - x) * t); });
        return 'rgb(' + c.join(',') + ')';
      }
    }
    return 'rgb(74,20,140)';
  }

  return { U: U, MAXC: MAXC, MAXD: MAXD, FAM: FAM, PAIRS: PAIRS, pKa: pKa, solve: solve, pH: pH, counts: counts, chargeBalanced: chargeBalanced,
           curve: curve, change: change, reserve: reserve, hh: hh, appreciable: appreciable, reactAcid: reactAcid, reactBase: reactBase, colour: colour };
})();

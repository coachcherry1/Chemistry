/* buffer.js: the buffer model. Everything a student sees about a flask (its pH,
 * the curve, the particle diagram, the reaction that happens) and every
 * checkpoint answer comes from here, so they cannot disagree.
 *
 * Two conjugate pairs, each as an ACID MEMBER and a BASE MEMBER:
 *   AC  acetic acid CH3COOH (written HAc) and acetate CH3COO- (Ac-), Ka 1.8e-5.
 *       The salt is sodium acetate, so Na+ is the spectator that comes with Ac-.
 *   NH  ammonium NH4+ (acid member) and ammonia NH3 (base member), Ka = Kw/Kb
 *       with Kb 1.8e-5. The salt is ammonium chloride, so Cl- is the spectator.
 * (HF is left out on purpose: its Ka is large enough that the Henderson-
 * Hasselbalch equation is already poor after a few additions.)
 *
 * A flask is described by three whole numbers:
 *   ha, a   how many particles of the acid member and the base member it
 *           starts with (one particle stands for 0.010 M)
 *   x       how much STRONG acid (x > 0, HCl) or STRONG base (x < 0, NaOH) has
 *           been added, in the same particle units. Dilution is ignored: the
 *           amount added is a few drops.
 * The pH is solved exactly from a charge balance (students never see it).
 * Water is not drawn.
 *
 *   acid-type pair   [Na+] + [H+] = [A-] + [Cl-] + [OH-]
 *   base-type pair   [NH4+] + [Na+] + [H+] = [Cl-] + [OH-]
 */

var Buf = (function () {
  'use strict';

  var KW = 1e-14;
  var U = 0.010;             /* mol/L that one particle stands for */
  var MAXX = 12;             /* the most strong acid or base that is added, in particles */
  var FAM = 22;              /* the most acid-member + base-member particles a flask can hold */
  var N0 = 10;               /* each member of the ordinary buffer */

  var PAIRS = {
    AC: { id: 'AC', type: 'acid', acidName: 'acetic acid', baseName: 'acetate ion', haFormula: 'CH₃COOH', aFormula: 'CH₃COO⁻',
          ha: 'HAc', a: 'Ac⁻', ka: 1.8e-5, saltName: 'sodium acetate', spectator: 'Na⁺', salt: 'NaAc' },
    NH: { id: 'NH', type: 'base', acidName: 'ammonium ion', baseName: 'ammonia', haFormula: 'NH₄⁺', aFormula: 'NH₃',
          ha: 'NH₄⁺', a: 'NH₃', ka: KW / 1.8e-5, saltName: 'ammonium chloride', spectator: 'Cl⁻', salt: 'NH₄Cl' }
  };

  /* the four flasks the activity uses, as [ha, a] */
  var KINDS = {
    buffer: { name: 'buffer', ha: N0, a: N0 },
    acid: { name: 'acid member alone', ha: N0, a: 0 },
    base: { name: 'base member alone', ha: 0, a: N0 },
    water: { name: 'pure water', ha: 0, a: 0 }
  };

  function pKa(pair) { return -Math.log10(PAIRS[pair].ka); }

  /* the strong-acid and strong-base ions, in particles */
  function ions(pair, ha, a, x) {
    var up = Math.max(x, 0), dn = Math.max(-x, 0);
    return PAIRS[pair].type === 'acid'
      ? { Na: a + dn, Cl: up }           /* NaAc brings Na+ with the Ac-; HCl brings Cl- */
      : { Na: dn, Cl: ha + up };         /* NH4Cl brings Cl- with the NH4+; NaOH brings Na+ */
  }

  /* exact [H+] by bisection on the charge balance */
  function solve(pair, ha, a, x) {
    var P = PAIRS[pair], ka = P.ka, ct = (ha + a) * U, io = ions(pair, ha, a, x);
    var net = (io.Na - io.Cl) * U;
    var lo = 1e-14, hi = 1;
    for (var i = 0; i < 200; i++) {
      var mid = Math.sqrt(lo * hi), f;
      if (P.type === 'acid') f = net + mid - ct * ka / (ka + mid) - KW / mid;
      else f = ct * mid / (ka + mid) + net + mid - KW / mid;
      if (f > 0) hi = mid; else lo = mid;
    }
    var h = Math.sqrt(lo * hi);
    return { h: h, oh: KW / h, ct: ct, fb: ka / (ka + h) };
  }

  function pH(pair, ha, a, x) { return -Math.log10(solve(pair, ha, a, x).h); }

  /* whole-particle counts for the diagram */
  function counts(pair, ha, a, x) {
    var r = solve(pair, ha, a, x), io = ions(pair, ha, a, x), T = ha + a;
    var A = Math.round(T * r.fb);
    return { HA: T - A, A: A, Na: io.Na, Cl: io.Cl, H: Math.round(r.h / U), OH: Math.round(r.oh / U) };
  }

  function chargeBalanced(pair, ha, a, x) {
    var c = counts(pair, ha, a, x);
    return PAIRS[pair].type === 'acid' ? c.Na + c.H === c.A + c.Cl + c.OH : c.HA + c.Na + c.H === c.Cl + c.OH;
  }

  /* the curve, one point per quarter particle: [x, pH] */
  function curve(pair, ha, a) {
    var pts = [];
    for (var x = -MAXX; x <= MAXX + 1e-9; x += 0.25) pts.push([x, pH(pair, ha, a, x)]);
    return pts;
  }

  /* the Henderson-Hasselbalch value, from the two members. Only meaningful for a
     buffer: it needs appreciable amounts of BOTH. */
  function hh(pair, ha, a) { return pKa(pair) + Math.log10(a / ha); }

  /* "appreciable amounts of both": neither member is less than a tenth of the other */
  function appreciable(ha, a) { return ha > 0 && a > 0 && ha / a <= 10 && a / ha <= 10; }

  /* the members after x is added to a buffer (what the reaction does), when both are still there */
  function after(ha, a, x) { return { ha: ha + x, a: a - x }; }

  /* every species in a flask, as a short list for a sentence */
  function flaskList(pair, ha, a, x) {
    var P = PAIRS[pair], c = counts(pair, ha, a, x), out = [];
    function add(n, label) { if (n > 0) out.push(n + ' ' + label); }
    add(c.HA, P.ha); add(c.A, P.a); add(c.Na, 'Na⁺'); add(c.Cl, 'Cl⁻'); add(c.H, 'H⁺'); add(c.OH, 'OH⁻');
    return out.length ? out.join(', ') : 'nothing drawn (only water)';
  }

  function reactAcid(pair) { var P = PAIRS[pair]; return 'H⁺ + ' + P.a + ' → ' + P.ha; }
  function reactBase(pair) { var P = PAIRS[pair]; return 'OH⁻ + ' + P.ha + ' → ' + P.a + ' + H₂O'; }

  /* a plain pH for water that gets x particles of strong acid or base */
  function pHWater(x) { return pH('AC', 0, 0, x); }

  function f2(v) { return v.toFixed(2); }

  return {
    U: U, MAXX: MAXX, FAM: FAM, N0: N0, PAIRS: PAIRS, KINDS: KINDS, pKa: pKa, solve: solve, pH: pH, counts: counts,
    chargeBalanced: chargeBalanced, curve: curve, hh: hh, appreciable: appreciable, after: after, flaskList: flaskList,
    reactAcid: reactAcid, reactBase: reactBase, pHWater: pHWater, f2: f2
  };
})();

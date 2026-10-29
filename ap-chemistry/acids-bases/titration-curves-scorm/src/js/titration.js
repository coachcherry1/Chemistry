/* titration.js: the titration model. Everything a student sees about the
 * flask (the pH, the curve, the particle diagram, what sets the pH) and every
 * checkpoint answer comes from here, so they cannot disagree.
 *
 * Two titrations, each 25.00 mL of 0.100 M acid in the flask and 0.100 M NaOH
 * in the buret:
 *   SS  hydrochloric acid, a strong acid (all of it is H+ and Cl-)
 *   WS  hydrofluoric acid, a weak acid (Ka 6.8 x 10^-4); its anion F- is the
 *       simple conjugate base
 *
 * The pH is solved exactly, from a charge balance:
 *   [Na+] + [H+] = [anion] + [OH-]      with [anion] = Ct Ka / (Ka + [H+])
 * (for the strong acid the anion is Cl- and is all there is). Students never
 * see the equations; they see their results.
 *
 * The particle diagram draws UNITS = 24 acid units, which is the amount of
 * acid at the start. Counts are the exact amounts, rounded to whole
 * particles. 24 divides by 2, 3, 4 and 6, so the five points of the
 * titration land on whole numbers, and the rounded counts keep the charge
 * balanced (tools/validate.js checks it). Water is not drawn.
 *
 * `u` is how many NaOH units have been added (0 to 36). One unit is
 * 25/24 mL, so u = 24 is the equivalence point (25.00 mL).
 */

var Titration = (function () {
  'use strict';

  var KW = 1e-14;
  var UNITS = 24;
  var ACID_ML = 25;          /* mL of acid in the flask */
  var ACID_M = 0.100;        /* mol/L of both the acid and the NaOH */
  var MAX_U = 36;            /* the end of the curve: 37.5 mL */
  var KA_HF = 6.8e-4;

  var SYSTEMS = {
    SS: { id: 'SS', name: 'strong acid, strong base', acid: 'HCl', acidName: 'hydrochloric acid', anion: 'Cl⁻',
          weak: false, equation: 'HCl + NaOH → NaCl + H₂O' },
    WS: { id: 'WS', name: 'weak acid, strong base', acid: 'HF', acidName: 'hydrofluoric acid', anion: 'F⁻',
          weak: true, ka: KA_HF, equation: 'HF + NaOH → NaF + H₂O' }
  };

  /* the five points every walk visits, in order (u = NaOH units added) */
  var POINTS = [
    { id: 'start', u: 0, name: 'Start', short: 'Start' },
    { id: 'half', u: 12, name: 'Half-equivalence point', short: 'Half-equivalence' },
    { id: 'before', u: 18, name: 'Before the equivalence point', short: 'Before equivalence' },
    { id: 'equiv', u: 24, name: 'Equivalence point', short: 'Equivalence' },
    { id: 'after', u: 30, name: 'After the equivalence point', short: 'After equivalence' }
  ];

  function point(id) {
    for (var i = 0; i < POINTS.length; i++) if (POINTS[i].id === id) return POINTS[i];
    return null;
  }

  function volume(u) { return u * ACID_ML / UNITS; }

  var nAcid = ACID_M * ACID_ML / 1000;                /* mol of acid, 0.0025 */

  /* exact [H+], [OH-] and the volume after adding u units of NaOH */
  function solve(sys, u) {
    var mL = volume(u), Vt = (ACID_ML + mL) / 1000;
    var nBase = ACID_M * mL / 1000;
    var na = nBase / Vt, ct = nAcid / Vt, h;
    if (!SYSTEMS[sys].weak) {
      var net = ct - na;
      h = (net + Math.sqrt(net * net + 4 * KW)) / 2;
    } else {
      var ka = SYSTEMS[sys].ka, lo = 1e-14, hi = 1;
      for (var i = 0; i < 200; i++) {
        var mid = Math.sqrt(lo * hi);
        var f = na + mid - ct * ka / (ka + mid) - KW / mid;
        if (f > 0) hi = mid; else lo = mid;
      }
      h = Math.sqrt(lo * hi);
    }
    return { h: h, oh: KW / h, Vt: Vt, ct: ct, mL: mL };
  }

  function pH(sys, u) { return -Math.log10(solve(sys, u).h); }

  function unitsOf(conc, Vt) { return conc * Vt / (nAcid / UNITS); }

  /* particle counts for the diagram (water is not drawn) */
  function counts(sys, u) {
    var r = solve(sys, u), c = {};
    c.Na = Math.round(u);
    c.H = Math.round(unitsOf(r.h, r.Vt));
    c.OH = Math.round(unitsOf(r.oh, r.Vt));
    if (SYSTEMS[sys].weak) {
      c.A = Math.round(UNITS * SYSTEMS[sys].ka / (SYSTEMS[sys].ka + r.h));
      c.HA = UNITS - c.A;
    } else {
      c.A = UNITS;
      c.HA = 0;
    }
    return c;
  }

  /* what is in the flask, as a list of species for a tally */
  function species(sys) {
    var S = SYSTEMS[sys];
    return S.weak
      ? [{ id: 'HA', label: 'HF' }, { id: 'H', label: 'H⁺' }, { id: 'A', label: 'F⁻' }, { id: 'Na', label: 'Na⁺' }, { id: 'OH', label: 'OH⁻' }]
      : [{ id: 'H', label: 'H⁺' }, { id: 'A', label: 'Cl⁻' }, { id: 'Na', label: 'Na⁺' }, { id: 'OH', label: 'OH⁻' }];
  }

  function chargeBalanced(sys, u) {
    var c = counts(sys, u);
    return c.H + c.Na === c.A + c.OH;
  }

  /* the curve, one point per half unit: [mL, pH] */
  function curve(sys) {
    var pts = [];
    for (var u = 0; u <= MAX_U + 1e-9; u += 0.25) pts.push([volume(u), pH(sys, u)]);
    return pts;
  }

  /* below, equal or above pH 7 */
  function side(sys, u) {
    var v = pH(sys, u);
    return Math.abs(v - 7) < 0.05 ? 'equal' : (v < 7 ? 'below' : 'above');
  }

  /* what sets the pH, by what is in the flask */
  function setter(sys, u) {
    var c = counts(sys, u), weak = SYSTEMS[sys].weak;
    if (c.OH > 0) return 'excess-oh';
    if (!weak) return c.H > 0 ? 'strong-h' : 'neutral';
    if (c.Na === 0) return 'weak-acid';
    return c.HA > 0 ? 'buffer' : 'conjugate-base';
  }

  var SETTER_TEXT = {
    'strong-h': 'The H⁺ that is left. A strong acid is all H⁺ and Cl⁻, so the pH is set by how much H⁺ the NaOH has not yet used up.',
    'weak-acid': 'The few H⁺ that came from HF molecules ionizing. Most HF stays whole, so the pH is higher than a strong acid of the same amount.',
    'buffer': 'The mix of HF and F⁻. This is a buffer: the F⁻ takes up H⁺ and the HF gives it back, so the pH changes slowly.',
    'conjugate-base': 'The F⁻. It is the conjugate base of a weak acid, so a tiny amount of it takes H⁺ from water and makes OH⁻: F⁻ + H₂O → HF + OH⁻.',
    'neutral': 'Nothing. Na⁺ and Cl⁻ do not react with water, so only water’s own H⁺ and OH⁻ are left: pH 7.',
    'excess-oh': 'The extra OH⁻ from the NaOH that has no acid left to react with.'
  };

  /* the one particle that sets the pH at the equivalence point (null when none does) */
  function equivalenceSetter(sys) { return SYSTEMS[sys].weak ? 'A' : null; }

  /* about 1 F- in this many reacts with water at the equivalence point of the weak acid */
  function reactingOneIn() {
    var r = solve('WS', UNITS);
    return Math.round(r.ct / r.oh);
  }

  /* a short account of the flask at a point, from the counts */
  function flask(sys, u) {
    var c = counts(sys, u), S = SYSTEMS[sys];
    var out = [];
    function add(n, label) { if (n > 0) out.push(n + ' ' + label); }
    if (S.weak) add(c.HA, 'HF');
    add(c.H, 'H⁺');
    add(c.A, S.anion);
    add(c.Na, 'Na⁺');
    add(c.OH, 'OH⁻');
    return out.join(', ');
  }

  /* pairs for the sorting step: which side of 7 is the equivalence point?
     A strong acid with a strong base ends at 7; a weak acid with a strong
     base ends above 7. */
  var PAIRS = [
    { id: 'hcl-naoh', acid: 'HCl', base: 'NaOH', strong: true },
    { id: 'hbr-koh', acid: 'HBr', base: 'KOH', strong: true },
    { id: 'hno3-naoh', acid: 'HNO₃', base: 'NaOH', strong: true },
    { id: 'hclo4-lioh', acid: 'HClO₄', base: 'LiOH', strong: true },
    { id: 'hf-naoh', acid: 'HF', base: 'NaOH', strong: false },
    { id: 'hf-koh', acid: 'HF', base: 'KOH', strong: false },
    { id: 'hcn-naoh', acid: 'HCN', base: 'NaOH', strong: false },
    { id: 'hno2-koh', acid: 'HNO₂', base: 'KOH', strong: false }
  ];
  function pairSide(p) { return p.strong ? 'equal' : 'above'; }

  return {
    UNITS: UNITS, MAX_U: MAX_U, ACID_ML: ACID_ML, ACID_M: ACID_M, KA_HF: KA_HF, PKA_HF: -Math.log10(KA_HF),
    SYSTEMS: SYSTEMS, POINTS: POINTS, point: point, volume: volume, solve: solve, pH: pH, counts: counts, species: species,
    chargeBalanced: chargeBalanced, curve: curve, side: side, setter: setter, SETTER_TEXT: SETTER_TEXT,
    equivalenceSetter: equivalenceSetter, reactingOneIn: reactingOneIn, flask: flask, PAIRS: PAIRS, pairSide: pairSide
  };
})();

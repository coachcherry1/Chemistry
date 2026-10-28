/* compounds.js — the item bank. Every compound carries BOTH spectra.
 *
 * `bands` is the IR band table, in the IR package's format:
 *
 *   g     group id from groups.js, or null for a band drawn only so the
 *         spectrum looks like a real one
 *   c     band centre, cm-1         w   full width at half maximum, cm-1
 *   d     depth, 0-1                s   'l' Lorentzian or 'g' Gaussian
 *   tol   [lo, hi] the window a label may be dropped in
 *   t     true if the band is scored. Scored bands sit above 1500 cm-1.
 *
 * `peaks` is the EI mass spectrum, in the mass spec package's format:
 *
 *   mz, ab   nominal m/z and relative abundance (base peak = 100)
 *   ion      id from fragments.js, for a peak whose fragment is known
 *   role     'mplus' the molecular ion   'key' a scored loss
 *            'cluster' above the line, not diagnostic   'minor' faint
 *            'mcl' a rearrangement peak — drawn, never scored
 *   why      for a key peak, the reason that fragment survived
 *   note     overrides the generated explanation for a non-scored peak
 *
 * Isotope peaks are NOT listed: massspec.js computes M+1 and M+2 from the
 * formula, so they cannot be entered wrong.
 *
 * `source` says where each spectrum came from:
 *   'ir' / 'ms'  carried over unchanged from the IR or mass spec package,
 *                which have already been through review
 *   'new'        written for this package from standard literature values,
 *                rounded and idealised the same way. ANSWER_KEY.md marks
 *                these so they can be spot-checked against a reference.
 *
 * `hidden` names a group the structure has but the IR does not score,
 * with the reason. Benzoic acid's ring C-H is under the acid O-H envelope,
 * so it is drawn but never asked about — and never offered as a "this
 * compound has none" distractor either. tools/validate.js works out from
 * each structure which groups it must contain, and fails the build if one
 * is neither scored nor listed here.
 *
 * `theme` drives the draw: across a run, every theme appears at least twice.
 *
 * A compound can be an ANSWER at Levels 1 and 2 only if its molecular ion
 * is readable (above the 5% line) — every mass spectrum label is a loss from
 * M, and you cannot subtract from a peak that is not there. That is worked
 * out from the peak table, not tagged. Compounds with no readable M+ are
 * answers from Level 3, where the missing M+ is itself a clue, and they can
 * be offered as wrong options at every level.
 */

/* ------------------------------------------------------- structure helpers */

var HEX = [[0.62, 0], [0.31, 0.537], [-0.31, 0.537], [-0.62, 0], [-0.31, -0.537], [0.31, -0.537]];
var HEX_BONDS = [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1], [5, 0, 1]];

/* A benzene ring with substituents hung off vertex 0, to the right. */
function arene(extraPts, extraBonds, labels) {
  return { pts: HEX.concat(extraPts), bonds: HEX_BONDS.concat(extraBonds),
           rings: [[0, 1, 2, 3, 4, 5]], labels: labels || {} };
}

/* A saturated ring — same hexagon, no aromatic circle. */
function ring6(extraPts, extraBonds, labels) {
  return { pts: HEX.concat(extraPts), bonds: HEX_BONDS.concat(extraBonds), labels: labels || {} };
}

/* n vertices of a zig-zag chain starting at (x0, y0). */
function zig(n, x0, y0) {
  var p = [];
  for (var i = 0; i < n; i++) p.push([(x0 || 0) + i, (y0 || 0) + (i % 2 ? 0.5 : 0)]);
  return p;
}

function link(n, off) {
  var b = [];
  off = off || 0;
  for (var i = 0; i < n - 1; i++) b.push([off + i, off + i + 1, 1]);
  return b;
}

/* Saturated C-H, the set almost every molecule here shows. The scored band is
   the one just below 3000; its partners are drawn but not scored. */
function alkylCH(depth) {
  return [
    { g: 'ch_sp3', c: 2958, w: 34, d: depth, s: 'l', tol: [2840, 3000], t: true },
    { g: null,     c: 2928, w: 36, d: depth * 0.95, s: 'l' },
    { g: null,     c: 2870, w: 32, d: depth * 0.75, s: 'l' },
    { g: null,     c: 1462, w: 30, d: 0.35, s: 'l' },
    { g: null,     c: 1378, w: 24, d: 0.28, s: 'l' }
  ];
}

var COMPOUNDS = [

  /* ================================================== alcohols and ethers */
  {
    id: 'butan1ol', name: '1-Butanol', formula: 'C₄H₁₀O', f: 'C4H10O', cls: 'Primary alcohol',
    theme: 'alcohol', source: { ir: 'ir', ms: 'ms' },
    structure: { pts: zig(4).concat([[4, 0]]), bonds: link(5), labels: { 4: 'OH' } },
    bands: [
      { g: 'oh_alcohol', c: 3340, w: 280, d: 0.80, s: 'g', tol: [3180, 3620], t: true },
      { g: 'co_single',  c: 1055, w: 42, d: 0.82, s: 'l' },
      { g: null, c: 1380, w: 26, d: 0.30, s: 'l' }
    ].concat(alkylCH(0.80)),
    peaks: [
      { mz: 74, ab: 1, role: 'minor' },
      { mz: 56, ab: 60, ion: 'dehydr', role: 'key',
        why: 'Dehydration: the alcohol throws off water. M−18 is the alcohol flag, and in a primary alcohol it is one of the tallest things in the spectrum.' },
      { mz: 55, ab: 25, role: 'cluster' },
      { mz: 43, ab: 45, ion: 'c3h7', role: 'cluster' },
      { mz: 41, ab: 60, ion: 'c3h5', role: 'cluster' },
      { mz: 31, ab: 100, ion: 'ch2oh', role: 'key',
        why: 'Alpha cleavage: the C–C bond next to the OH breaks and the oxygen lone pair pushes in to share the charge. m/z 31 IS a primary alcohol — no other structure puts a peak exactly there.' },
      { mz: 28, ab: 30, role: 'cluster' },
      { mz: 27, ab: 40, role: 'cluster' }
    ]
  },
  {
    id: 'butan2ol', name: '2-Butanol', formula: 'C₄H₁₀O', f: 'C4H10O', cls: 'Secondary alcohol',
    theme: 'alcohol', source: { ir: 'new', ms: 'ms' },
    structure: { pts: zig(4).concat([[1, 1.5]]),
                 bonds: link(4).concat([[1, 4, 1]]), labels: { 4: 'OH' } },
    bands: [
      { g: 'oh_alcohol', c: 3350, w: 270, d: 0.78, s: 'g', tol: [3180, 3620], t: true },
      { g: 'co_single',  c: 1110, w: 40, d: 0.78, s: 'l' },
      { g: null, c: 990, w: 30, d: 0.40, s: 'l' }
    ].concat(alkylCH(0.80)),
    peaks: [
      { mz: 74, ab: 1, role: 'minor' },
      { mz: 59, ab: 10, ion: 'c2h5choh', role: 'key',
        why: 'Alpha cleavage losing the METHYL. Same oxygen resonance as the other route, but a methyl radical is the worse leaving radical, so this peak stays short.' },
      { mz: 56, ab: 8, ion: 'dehydr', role: 'key',
        why: 'Dehydration, −18. Present, as it is in every alcohol, but a secondary alcohol would rather cleave alpha than lose water.' },
      { mz: 45, ab: 100, ion: 'ch3choh', role: 'key',
        why: 'Alpha cleavage losing the ETHYL — the bigger, easier piece to break off. What is left keeps the oxygen AND carries an extra methyl, so this is the base peak. As the base peak, m/z 45 means a secondary alcohol.' },
      { mz: 43, ab: 18, ion: 'c3h7', role: 'cluster' },
      { mz: 41, ab: 20, ion: 'c3h5', role: 'cluster' },
      { mz: 31, ab: 25, ion: 'ch2oh', role: 'cluster',
        note: 'Real, but it takes a hydrogen shift to get there, not a clean α-cleavage. m/z 31 only tells you PRIMARY ALCOHOL when it is the base peak — here it is a minor route and the tall peak is the one that identifies this compound.' },
      { mz: 29, ab: 25, role: 'cluster' },
      { mz: 27, ab: 25, role: 'cluster' }
    ]
  },
  {
    id: 'tbutanol', name: '2-Methyl-2-propanol', formula: 'C₄H₁₀O', f: 'C4H10O', cls: 'Tertiary alcohol',
    theme: 'alcohol', source: { ir: 'new', ms: 'ms' },
    structure: { pts: [[1, 0], [0, 0.5], [2, 0.5], [1, -1], [1, 1]],
                 bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]], labels: { 4: 'OH' } },
    bands: [
      { g: 'oh_alcohol', c: 3370, w: 260, d: 0.76, s: 'g', tol: [3180, 3620], t: true },
      { g: 'co_single',  c: 1202, w: 36, d: 0.76, s: 'l' },
      { g: null, c: 1382, w: 14, d: 0.40, s: 'l' },
      { g: null, c: 1367, w: 14, d: 0.46, s: 'l' },
      { g: null, c: 915, w: 24, d: 0.40, s: 'l' }
    ].concat(alkylCH(0.80)),
    peaks: [
      { mz: 59, ab: 100, ion: 'me2coh', role: 'key',
        why: 'Alpha cleavage losing one of the three methyls. What is left keeps the oxygen AND has two methyls propping up the charge — so stable that the molecular ion at 74 never survives long enough to be seen at all.' },
      { mz: 57, ab: 6, ion: 'c4h9', role: 'key',
        why: 'Losing the whole OH, −17, leaves a tert-butyl cation — an excellent carbocation in its own right. It still loses badly to the other route, because keeping the oxygen beats even a tertiary carbon.' },
      { mz: 43, ab: 20, ion: 'c3h7', role: 'cluster' },
      { mz: 41, ab: 25, ion: 'c3h5', role: 'cluster' },
      { mz: 31, ab: 25, ion: 'ch2oh', role: 'cluster',
        note: 'Real, but it takes a hydrogen shift to get there, not a clean α-cleavage. m/z 31 only tells you PRIMARY ALCOHOL when it is the base peak — here it is a minor route and the tall peak is the one that identifies this compound.' },
      { mz: 29, ab: 12, role: 'cluster' }
    ]
  },
  {
    id: 'cyclohexanol', name: 'Cyclohexanol', formula: 'C₆H₁₂O', f: 'C6H12O', cls: 'Secondary alcohol',
    theme: 'alcohol', source: { ir: 'new', ms: 'ms' },
    structure: ring6([[1.62, 0]], [[0, 6, 1]], { 6: 'OH' }),
    bands: [
      { g: 'oh_alcohol', c: 3340, w: 280, d: 0.80, s: 'g', tol: [3180, 3620], t: true },
      { g: 'ch_sp3', c: 2932, w: 30, d: 0.86, s: 'l', tol: [2840, 3000], t: true },
      { g: 'co_single', c: 1068, w: 36, d: 0.80, s: 'l' },
      { g: null, c: 2855, w: 28, d: 0.72, s: 'l' },
      { g: null, c: 1450, w: 22, d: 0.50, s: 'l' },
      { g: null, c: 970, w: 26, d: 0.40, s: 'l' },
      { g: null, c: 890, w: 24, d: 0.30, s: 'l' }
    ],
    peaks: [
      { mz: 100, ab: 10, role: 'mplus' },
      { mz: 82, ab: 50, ion: 'dehydr', role: 'key',
        why: 'Dehydration, −18. A ring cannot cleave alpha and fly apart the way a chain can, so losing water is the dominant escape and M−18 is enormous.' },
      { mz: 67, ab: 30, role: 'cluster' },
      { mz: 57, ab: 100, role: 'cluster',
        note: 'The base peak, but not a single clean break: the ring has to open first and then lose a piece, which takes two steps. It is real and it is tall — the −18 is the peak that says "alcohol" in one step.' },
      { mz: 44, ab: 45, role: 'cluster' },
      { mz: 41, ab: 40, ion: 'c3h5', role: 'cluster' }
    ]
  },
  {
    id: 'phenol', name: 'Phenol', formula: 'C₆H₆O', f: 'C6H6O', cls: 'Phenol',
    theme: 'alcohol', source: { ir: 'ir', ms: 'new' },
    structure: arene([[1.62, 0]], [[0, 6, 1]], { 6: 'OH' }),
    bands: [
      { g: 'oh_alcohol', c: 3350, w: 260, d: 0.76, s: 'g', tol: [3190, 3640], t: true },
      { g: 'ch_sp2',     c: 3055, w: 24, d: 0.38, s: 'l', tol: [3000, 3140], t: true },
      { g: 'cc_arene',   c: 1596, w: 16, d: 0.56, s: 'l', tol: [1545, 1650], t: true },
      { g: 'co_single',  c: 1225, w: 36, d: 0.78, s: 'l' },
      { g: null, c: 1498, w: 16, d: 0.62, s: 'l' },
      { g: null, c: 1360, w: 26, d: 0.44, s: 'l' },
      { g: null, c: 810, w: 26, d: 0.66, s: 'l' },
      { g: null, c: 750, w: 24, d: 0.78, s: 'l' }
    ],
    /* The molecular ion is the base peak: an aromatic ring holds a molecular
       ion together. Nothing here breaks by one of the four routes this unit
       teaches, so M+ is the only scored peak — and the lesson. */
    peaks: [
      { mz: 94, ab: 100, role: 'mplus' },
      { mz: 66, ab: 35, role: 'cluster',
        note: 'M − 28: the ring throws out a molecule of carbon monoxide after the O–H hydrogen moves across. Phenols do this, but it is a rearrangement rather than one of the four breaks this unit covers. The lesson here is how tall M⁺ is.' },
      { mz: 65, ab: 25, role: 'cluster',
        note: 'One hydrogen further along the same ring break-up as m/z 66. It confirms a ring and nothing more.' },
      { mz: 40, ab: 10, role: 'cluster' },
      { mz: 39, ab: 20, role: 'cluster' },
      { mz: 55, ab: 5, role: 'minor' }
    ]
  },
  {
    id: 'diethylether', name: 'Diethyl ether', formula: 'C₄H₁₀O', f: 'C4H10O', cls: 'Ether',
    theme: 'alcohol', source: { ir: 'ir', ms: 'ms' },
    structure: { pts: zig(5), bonds: link(5), labels: { 2: 'O' } },
    bands: [
      { g: 'ch_sp3',    c: 2975, w: 32, d: 0.80, s: 'l', tol: [2840, 3000], t: true },
      { g: 'co_single', c: 1122, w: 40, d: 0.90, s: 'l' },
      { g: null, c: 2930, w: 32, d: 0.66, s: 'l' },
      { g: null, c: 2870, w: 30, d: 0.60, s: 'l' },
      { g: null, c: 1450, w: 28, d: 0.44, s: 'l' },
      { g: null, c: 1380, w: 26, d: 0.40, s: 'l' }
    ],
    peaks: [
      { mz: 74, ab: 30, role: 'mplus' },
      { mz: 59, ab: 100, ion: 'etoch2', role: 'key',
        why: 'Alpha cleavage next to the ether oxygen: a methyl leaves and the lone pair stabilises what remains. An ether does exactly what an alcohol does — the oxygen is doing the same job.' },
      { mz: 45, ab: 40, ion: 'ch3choh', role: 'cluster',
        note: 'Oxygen-stabilised and quite tall — but reaching it means breaking the C–O bond AND shifting a hydrogen, which is not a clean α-cleavage. The peak above it is.' },
      { mz: 31, ab: 25, ion: 'ch2oh', role: 'cluster',
        note: 'An ether can make this too, by a longer route. It is not the α-cleavage peak — that one is higher up and much taller.' },
      { mz: 29, ab: 30, ion: 'c2h5', role: 'cluster' },
      { mz: 27, ab: 15, role: 'cluster' }
    ]
  },
  {
    id: 'mtbe', name: 'tert-Butyl methyl ether (MTBE)', formula: 'C₅H₁₂O', f: 'C5H12O', cls: 'Ether',
    theme: 'alcohol', source: { ir: 'new', ms: 'ms' },
    structure: { pts: [[1, 0], [0, 0.5], [1, -1], [1, 1], [2, 0.5], [3, 0]],
                 bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [4, 5, 1]], labels: { 4: 'O' } },
    bands: [
      { g: 'ch_sp3',    c: 2980, w: 32, d: 0.82, s: 'l', tol: [2840, 3000], t: true },
      { g: 'co_single', c: 1085, w: 40, d: 0.88, s: 'l' },
      { g: null, c: 2950, w: 30, d: 0.62, s: 'l' },
      { g: null, c: 2828, w: 26, d: 0.30, s: 'l' },
      { g: null, c: 1470, w: 24, d: 0.40, s: 'l' },
      { g: null, c: 1385, w: 14, d: 0.34, s: 'l' },
      { g: null, c: 1365, w: 14, d: 0.42, s: 'l' },
      { g: null, c: 1205, w: 34, d: 0.66, s: 'l' }
    ],
    peaks: [
      { mz: 88, ab: 2, role: 'minor' },
      { mz: 73, ab: 100, ion: 'me2coome', role: 'key',
        why: 'Alpha cleavage losing a methyl from the quaternary carbon, leaving an oxygen-stabilised cation. Oxygen resonance beats the bare tert-butyl route, even though a tert-butyl cation is itself excellent.' },
      { mz: 57, ab: 30, ion: 'c4h9', role: 'key',
        why: 'The other route: break the C–O bond and take the tert-butyl cation instead — a loss of •OCH₃, −31. Very good, but still second to the oxygen-stabilised ion.' },
      { mz: 41, ab: 25, ion: 'c3h5', role: 'cluster' },
      { mz: 43, ab: 15, ion: 'c3h7', role: 'cluster' },
      { mz: 29, ab: 20, role: 'cluster' }
    ]
  },

  /* ========================================================== carbonyls */
  {
    id: 'acetone', name: 'Acetone', formula: 'C₃H₆O', f: 'C3H6O', cls: 'Ketone',
    theme: 'carbonyl', source: { ir: 'new', ms: 'ms' },
    structure: { pts: [[0, 0], [1, 0.5], [2, 0], [1, 1.5]],
                 bonds: [[0, 1, 1], [1, 2, 1], [1, 3, 2]], labels: { 3: 'O' } },
    /* Acetone's weak C-H stretch at about 3005 is left out: it is the one
       sp3 C-H that sits just left of the 3000 line, and drawing it would make
       the line a rule with an exception on the very first ketone. */
    bands: [
      { g: 'co_carbonyl', c: 1715, w: 24, d: 0.92, s: 'l', tol: [1620, 1900], t: true },
      { g: 'ch_sp3',      c: 2968, w: 30, d: 0.40, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 2925, w: 30, d: 0.30, s: 'l' },
      { g: null, c: 1420, w: 26, d: 0.48, s: 'l' },
      { g: null, c: 1362, w: 22, d: 0.66, s: 'l' },
      { g: null, c: 1222, w: 26, d: 0.68, s: 'l' },
      { g: null, c: 1092, w: 22, d: 0.24, s: 'l' },
      { g: null, c: 530, w: 24, d: 0.50, s: 'l' }
    ],
    peaks: [
      { mz: 58, ab: 26, role: 'mplus' },
      { mz: 43, ab: 100, ion: 'ch3co', role: 'key',
        why: 'Alpha cleavage throws off one methyl and leaves CH₃C≡O⁺. The C=O spreads the positive charge, which no plain alkyl fragment can do — so nothing else acetone can make comes close, and this is the base peak.' },
      { mz: 42, ab: 9, role: 'minor' },
      { mz: 27, ab: 6, role: 'minor' },
      { mz: 15, ab: 12, ion: 'ch3', role: 'key',
        why: 'The other half of the same break. A bare CH₃⁺ is the worst carbocation there is, so this peak stays small — the charge almost always goes with the piece that kept the C=O.' }
    ]
  },
  {
    id: 'propanal', name: 'Propanal', formula: 'C₃H₆O', f: 'C3H6O', cls: 'Aldehyde',
    theme: 'carbonyl', source: { ir: 'new', ms: 'new' },
    structure: { pts: [[0, 0.5], [1, 0], [2, 0.5], [2, 1.35], [3, 0]],
                 bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 2], [2, 4, 1]], labels: { 3: 'O', 4: 'H' } },
    bands: [
      { g: 'co_carbonyl', c: 1730, w: 24, d: 0.90, s: 'l', tol: [1620, 1900], t: true },
      { g: 'ch_aldehyde', c: 2818, w: 26, d: 0.40, s: 'l', tol: [2680, 2838], t: true },
      { g: 'ch_sp3',      c: 2984, w: 32, d: 0.58, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 2720, w: 24, d: 0.40, s: 'l' },
      { g: null, c: 2945, w: 30, d: 0.46, s: 'l' },
      { g: null, c: 1460, w: 26, d: 0.36, s: 'l' },
      { g: null, c: 1395, w: 22, d: 0.30, s: 'l' },
      { g: null, c: 1095, w: 30, d: 0.30, s: 'l' }
    ],
    peaks: [
      { mz: 58, ab: 80, role: 'mplus' },
      { mz: 57, ab: 12, ion: 'c2h5co', role: 'key',
        why: 'Losing just the aldehyde HYDROGEN, −1, leaves CH₃CH₂C≡O⁺ with the C=O holding the charge. A ketone has no hydrogen on its C=O carbon to lose, so an M−1 is an aldehyde flag — acetone, with the same M of 58, shows none.' },
      { mz: 31, ab: 6, role: 'minor' },
      { mz: 29, ab: 100, ion: 'cho', role: 'key',
        why: 'The bond next to the C=O breaks, and the charge can go either way: keep CHO⁺ and lose the ethyl, or keep C₂H₅⁺ and lose the CHO. Both land at m/z 29, so the two routes pile up into the base peak — the −29 ambiguity in a single peak.' },
      { mz: 28, ab: 60, role: 'cluster' },
      { mz: 27, ab: 40, role: 'cluster' },
      { mz: 26, ab: 12, role: 'minor' }
    ]
  },
  {
    id: 'butanone', name: '2-Butanone', formula: 'C₄H₈O', f: 'C4H8O', cls: 'Ketone',
    theme: 'carbonyl', source: { ir: 'ir', ms: 'ms' },
    structure: { pts: [[0, 0], [1, 0.5], [2, 0], [3, 0.5], [1, 1.5]],
                 bonds: link(4).concat([[1, 4, 2]]), labels: { 4: 'O' } },
    bands: [
      { g: 'co_carbonyl', c: 1715, w: 24, d: 0.91, s: 'l', tol: [1620, 1900], t: true },
      { g: 'ch_sp3',    c: 2980, w: 32, d: 0.55, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 2940, w: 32, d: 0.45, s: 'l' },
      { g: null, c: 1415, w: 26, d: 0.42, s: 'l' },
      { g: null, c: 1360, w: 24, d: 0.46, s: 'l' },
      { g: null, c: 1170, w: 34, d: 0.40, s: 'l' }
    ],
    peaks: [
      { mz: 72, ab: 24, role: 'mplus' },
      { mz: 57, ab: 5, ion: 'c2h5co', role: 'minor' },
      { mz: 43, ab: 100, ion: 'ch3co', role: 'key',
        why: 'The break can drop either group. Dropping the ETHYL wins, because the bigger piece comes off more easily — so the C=O fragment at 43 towers over the one at 57.' },
      { mz: 42, ab: 3, role: 'minor' },
      { mz: 29, ab: 25, ion: 'c2h5', role: 'key',
        why: 'The other half of the break that gives 43: a plain ethyl fragment, primary and unhelped. Real, but a long way below the piece that kept the C=O.' },
      { mz: 27, ab: 20, role: 'cluster' }
    ]
  },
  {
    id: 'benzaldehyde', name: 'Benzaldehyde', formula: 'C₇H₆O', f: 'C7H6O', cls: 'Aromatic aldehyde',
    theme: 'carbonyl', source: { ir: 'ir', ms: 'ms' },
    structure: arene([[1.62, 0], [2.12, 0.87], [2.62, 0]], [[0, 6, 1], [6, 7, 2], [6, 8, 1]],
                     { 7: 'O', 8: 'H' }),
    bands: [
      { g: 'co_carbonyl', c: 1702, w: 24, d: 0.90, s: 'l', tol: [1655, 1900], t: true },
      { g: 'ch_aldehyde', c: 2820, w: 26, d: 0.38, s: 'l', tol: [2680, 2838], t: true },
      { g: 'ch_sp2',      c: 3065, w: 24, d: 0.42, s: 'l', tol: [3000, 3140], t: true },
      { g: 'cc_arene',    c: 1598, w: 16, d: 0.58, s: 'l', tol: [1548, 1650], t: true },
      { g: null, c: 2738, w: 24, d: 0.40, s: 'l' },
      { g: null, c: 1585, w: 16, d: 0.50, s: 'l' },
      { g: null, c: 1455, w: 18, d: 0.44, s: 'l' },
      { g: null, c: 1205, w: 30, d: 0.48, s: 'l' },
      { g: null, c: 745, w: 24, d: 0.80, s: 'l' },
      { g: null, c: 688, w: 24, d: 0.78, s: 'l' }
    ],
    peaks: [
      { mz: 106, ab: 100, role: 'mplus' },
      { mz: 105, ab: 95, ion: 'phco', role: 'key',
        why: 'Losing just the aldehyde HYDROGEN leaves a fragment with a C=O and a ring to share the charge. M−1 nearly as tall as M⁺ is the giveaway for an aldehyde on a ring.' },
      { mz: 77, ab: 85, ion: 'ph', role: 'key',
        why: 'Losing the whole CHO group gives the phenyl cation. This is the −29 that is NOT an ethyl: there is no ethyl group anywhere in benzaldehyde.' },
      { mz: 51, ab: 30, ion: 'c4h3', role: 'cluster' },
      { mz: 29, ab: 10, ion: 'cho', role: 'cluster' },
      { mz: 50, ab: 15, role: 'minor' },
      { mz: 78, ab: 10, role: 'minor' }
    ]
  },
  {
    id: 'acetophenone', name: 'Acetophenone', formula: 'C₈H₈O', f: 'C8H8O', cls: 'Aryl ketone',
    theme: 'carbonyl', source: { ir: 'ir', ms: 'ms' },
    structure: arene([[1.62, 0], [2.12, 0.87], [2.62, 0]],
                     [[0, 6, 1], [6, 7, 2], [6, 8, 1]], { 7: 'O' }),
    bands: [
      { g: 'co_carbonyl', c: 1685, w: 24, d: 0.91, s: 'l', tol: [1655, 1900], t: true },
      { g: 'ch_sp2',    c: 3062, w: 24, d: 0.38, s: 'l', tol: [3000, 3140], t: true },
      { g: 'ch_sp3',    c: 2925, w: 30, d: 0.36, s: 'l', tol: [2840, 3000], t: true },
      { g: 'cc_arene',  c: 1598, w: 16, d: 0.60, s: 'l', tol: [1545, 1650], t: true },
      { g: null, c: 1580, w: 16, d: 0.48, s: 'l' },
      { g: null, c: 1450, w: 18, d: 0.52, s: 'l' },
      { g: null, c: 1265, w: 32, d: 0.66, s: 'l' },
      { g: null, c: 760, w: 24, d: 0.78, s: 'l' },
      { g: null, c: 690, w: 24, d: 0.80, s: 'l' }
    ],
    peaks: [
      { mz: 120, ab: 30, role: 'mplus' },
      { mz: 105, ab: 100, ion: 'phco', role: 'key',
        why: 'Alpha cleavage drops the methyl and leaves a fragment holding BOTH a C=O and a benzene ring. Two things spreading the charge over one fragment — nothing in this spectrum can compete.' },
      { mz: 77, ab: 85, ion: 'ph', role: 'key',
        why: 'The ring-plus-C=O fragment then loses carbon monoxide to give the bare ring. A second-generation fragment, but so characteristic that 105 with 77 underneath it is the signature of a benzene ring next to a C=O.' },
      { mz: 51, ab: 30, ion: 'c4h3', role: 'cluster' },
      { mz: 43, ab: 8, ion: 'ch3co', role: 'minor' },
      { mz: 50, ab: 15, role: 'minor' }
    ]
  },
  {
    id: 'ethylacetate', name: 'Ethyl acetate', formula: 'C₄H₈O₂', f: 'C4H8O2', cls: 'Ester',
    theme: 'carbonyl', source: { ir: 'ir', ms: 'new' },
    structure: { pts: [[0, 0], [1, 0.5], [1, 1.35], [2, 0], [3, 0.5], [4, 0]],
                 bonds: [[0, 1, 1], [1, 2, 2], [1, 3, 1], [3, 4, 1], [4, 5, 1]],
                 labels: { 2: 'O', 3: 'O' } },
    bands: [
      { g: 'co_carbonyl', c: 1742, w: 22, d: 0.92, s: 'l', tol: [1620, 1900], t: true },
      { g: 'ch_sp3',    c: 2985, w: 30, d: 0.52, s: 'l', tol: [2840, 3000], t: true },
      { g: 'co_single', c: 1240, w: 38, d: 0.86, s: 'l' },
      { g: null, c: 2940, w: 32, d: 0.40, s: 'l' },
      { g: null, c: 1372, w: 24, d: 0.50, s: 'l' },
      { g: null, c: 1045, w: 40, d: 0.72, s: 'l' }
    ],
    peaks: [
      { mz: 88, ab: 8, role: 'mplus' },
      { mz: 73, ab: 4, role: 'minor' },
      { mz: 70, ab: 12, role: 'mcl',
        note: 'm/z 70 is real, but it comes from a REARRANGEMENT — hydrogens move before anything breaks. That is not part of this unit; the peak worth reading is the base peak at 43.' },
      { mz: 61, ab: 14, role: 'mcl',
        note: 'm/z 61 comes from a double hydrogen shift, a rearrangement ethyl esters are known for. It is not one of the four breaks this unit covers, so leave it alone.' },
      { mz: 45, ab: 15, role: 'cluster',
        note: 'The other half of the break that gives 43: the ethoxy piece, C₂H₅O⁺, holding the charge instead. Real, but the piece that kept the C=O wins by a distance.' },
      { mz: 43, ab: 100, ion: 'ch3co', role: 'key',
        why: 'The C–O bond on the far side of the C=O breaks and the ethoxy radical walks off, −45. What is left is CH₃C≡O⁺ with the C=O holding the charge — which is why every acetate ester has its base peak at 43.' },
      { mz: 42, ab: 8, role: 'minor' },
      { mz: 29, ab: 20, ion: 'c2h5', role: 'cluster' },
      { mz: 27, ab: 14, role: 'cluster' }
    ]
  },

  /* ============================================ acids and acid derivatives */
  {
    id: 'aceticacid', name: 'Acetic acid', formula: 'C₂H₄O₂', f: 'C2H4O2', cls: 'Carboxylic acid',
    theme: 'acid', source: { ir: 'new', ms: 'new' },
    structure: { pts: [[0, 0], [1, 0.5], [1, 1.35], [2, 0]],
                 bonds: [[0, 1, 1], [1, 2, 2], [1, 3, 1]], labels: { 2: 'O', 3: 'OH' } },
    hidden: { ch_sp3: 'the methyl C–H is a small spike riding on the acid O–H envelope' },
    bands: [
      { g: 'oh_acid',     c: 3000, w: 700, d: 0.66, s: 'g', tol: [2480, 3320], t: true },
      { g: 'co_carbonyl', c: 1714, w: 26, d: 0.92, s: 'l', tol: [1620, 1900], t: true },
      { g: 'co_single',   c: 1294, w: 38, d: 0.66, s: 'l' },
      { g: null, c: 2940, w: 30, d: 0.30, s: 'l' },
      { g: null, c: 1412, w: 26, d: 0.44, s: 'l' },
      { g: null, c: 935, w: 60, d: 0.46, s: 'l' },
      { g: null, c: 620, w: 40, d: 0.40, s: 'l' }
    ],
    peaks: [
      { mz: 60, ab: 75, role: 'mplus' },
      { mz: 45, ab: 90, ion: 'cooh', role: 'key',
        why: 'The bond between the methyl and the C=O breaks and •CH₃ walks off, −15, leaving the COOH to hold the charge. Only a carboxylic acid can make HO–C≡O⁺.' },
      { mz: 43, ab: 100, ion: 'ch3co', role: 'key',
        why: 'The acid drops its •OH, −17, and what is left is CH₃C≡O⁺ with the C=O holding the charge — the same fragment acetone makes. A −17 this big is an acid talking; an alcohol would lose water instead.' },
      { mz: 42, ab: 12, role: 'cluster' },
      { mz: 29, ab: 8, role: 'minor' },
      { mz: 15, ab: 15, ion: 'ch3', role: 'cluster',
        note: 'The methyl cation — the other half of the break that gives 45. A bare CH₃⁺ is the worst carbocation there is, so it stays small.' }
    ]
  },
  {
    id: 'benzoicacid', name: 'Benzoic acid', formula: 'C₇H₆O₂', f: 'C7H6O2', cls: 'Aromatic carboxylic acid',
    theme: 'acid', source: { ir: 'ir', ms: 'new' },
    structure: arene([[1.62, 0], [2.12, 0.87], [2.62, 0]], [[0, 6, 1], [6, 7, 2], [6, 8, 1]],
                     { 7: 'O', 8: 'OH' }),
    hidden: { ch_sp2: 'the ring C–H is buried under the acid O–H envelope' },
    bands: [
      { g: 'oh_acid',   c: 3010, w: 690, d: 0.62, s: 'g', tol: [2470, 3330], t: true },
      { g: 'co_carbonyl', c: 1685, w: 26, d: 0.90, s: 'l', tol: [1655, 1900], t: true },
      { g: 'cc_arene',  c: 1602, w: 16, d: 0.52, s: 'l', tol: [1560, 1650], t: true },
      { g: 'co_single', c: 1290, w: 38, d: 0.72, s: 'l' },
      { g: null, c: 3070, w: 26, d: 0.34, s: 'l' },
      { g: null, c: 1452, w: 18, d: 0.46, s: 'l' },
      { g: null, c: 930, w: 60, d: 0.50, s: 'l' },
      { g: null, c: 710, w: 24, d: 0.78, s: 'l' }
    ],
    peaks: [
      { mz: 122, ab: 80, role: 'mplus' },
      { mz: 105, ab: 100, ion: 'phco', role: 'key',
        why: 'The acid drops its •OH, −17, and what is left keeps a C=O AND a benzene ring to share the charge. Acetophenone and methyl benzoate make this same fragment — the molecular ion, and the O–H in the IR, are what separate them.' },
      { mz: 77, ab: 70, ion: 'ph', role: 'key',
        why: 'The whole •COOH group leaves, −45, and the bare ring keeps the charge. 105 and 77 together say "a benzene ring next to a C=O"; what else the C=O carries is the IR’s job.' },
      { mz: 51, ab: 40, ion: 'c4h3', role: 'cluster' },
      { mz: 50, ab: 18, role: 'cluster' },
      { mz: 94, ab: 5, role: 'minor' },
      { mz: 39, ab: 8, role: 'minor' }
    ]
  },
  {
    id: 'methylbenzoate', name: 'Methyl benzoate', formula: 'C₈H₈O₂', f: 'C8H8O2', cls: 'Aromatic ester',
    theme: 'acid', source: { ir: 'new', ms: 'new' },
    structure: arene([[1.62, 0], [2.12, 0.87], [2.62, 0], [3.62, 0]],
                     [[0, 6, 1], [6, 7, 2], [6, 8, 1], [8, 9, 1]], { 7: 'O', 8: 'O' }),
    bands: [
      { g: 'co_carbonyl', c: 1724, w: 22, d: 0.92, s: 'l', tol: [1655, 1900], t: true },
      { g: 'ch_sp2',      c: 3065, w: 24, d: 0.32, s: 'l', tol: [3000, 3140], t: true },
      { g: 'ch_sp3',      c: 2952, w: 30, d: 0.36, s: 'l', tol: [2840, 3000], t: true },
      { g: 'cc_arene',    c: 1602, w: 16, d: 0.54, s: 'l', tol: [1545, 1650], t: true },
      { g: 'co_single',   c: 1280, w: 34, d: 0.88, s: 'l' },
      { g: null, c: 1585, w: 16, d: 0.40, s: 'l' },
      { g: null, c: 1452, w: 18, d: 0.50, s: 'l' },
      { g: null, c: 1437, w: 18, d: 0.46, s: 'l' },
      { g: null, c: 1112, w: 30, d: 0.70, s: 'l' },
      { g: null, c: 712, w: 24, d: 0.80, s: 'l' }
    ],
    peaks: [
      { mz: 136, ab: 30, role: 'mplus' },
      { mz: 105, ab: 100, ion: 'phco', role: 'key',
        why: 'The bond to the methoxy group breaks and •OCH₃ walks off, −31. What is left holds a C=O AND a benzene ring — the same fragment acetophenone and benzoic acid make, which is why 105 alone cannot tell the three apart. The molecular ion can.' },
      { mz: 77, ab: 60, ion: 'ph', role: 'key',
        why: 'The whole ester group, •COOCH₃, leaves the ring behind: −59. The bare ring is a poor cation, but m/z 77 under 105 is the standard sign of a benzene ring next to a C=O.' },
      { mz: 51, ab: 30, ion: 'c4h3', role: 'cluster' },
      { mz: 50, ab: 12, role: 'minor' },
      { mz: 39, ab: 8, role: 'minor' }
    ]
  },
  {
    id: 'acetylchloride', name: 'Acetyl chloride', formula: 'C₂H₃ClO', f: 'C2H3ClO', cls: 'Acid chloride',
    theme: 'acid', source: { ir: 'ir', ms: 'new' },
    structure: { pts: [[0, 0], [1, 0.5], [1, 1.35], [2, 0]],
                 bonds: [[0, 1, 1], [1, 2, 2], [1, 3, 1]], labels: { 2: 'O', 3: 'Cl' } },
    bands: [
      { g: 'co_carbonyl', c: 1802, w: 24, d: 0.92, s: 'l', tol: [1620, 1900], t: true },
      { g: 'ch_sp3',      c: 2940, w: 32, d: 0.34, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 1355, w: 26, d: 0.56, s: 'l' },
      { g: null, c: 1105, w: 34, d: 0.62, s: 'l' },
      { g: null, c: 605, w: 40, d: 0.70, s: 'l' }
    ],
    /* The C–Cl bond is so much weaker than everything else that the
       molecular ion barely survives: M+ and the chlorine's M+2 are both below
       the reading line. The chlorine is in the formula, not in the spectrum —
       which is the lesson this compound carries. */
    peaks: [
      { mz: 78, ab: 2, role: 'minor' },
      { mz: 65, ab: 1.3, role: 'minor' },
      { mz: 63, ab: 4, role: 'minor' },
      { mz: 43, ab: 100, ion: 'ch3co', role: 'key',
        why: 'The C–Cl bond is the weakest in the molecule. It breaks, the chlorine walks off, −35, and the charge stays on CH₃C≡O⁺ where the C=O can hold it — so readily that the molecular ion barely survives.' },
      { mz: 42, ab: 8, role: 'minor' },
      { mz: 15, ab: 18, ion: 'ch3', role: 'cluster',
        note: 'The methyl cation, from the C=O fragment breaking up further. A bare CH₃⁺ is the least stable carbocation there is, so it stays small.' }
    ]
  },
  {
    id: 'propanamide', name: 'Propanamide', formula: 'C₃H₇NO', f: 'C3H7NO', cls: 'Primary amide',
    theme: 'acid', source: { ir: 'ir', ms: 'new' },
    structure: { pts: [[0, 0], [1, 0.5], [2, 0], [2, 0.9], [3, -0.4]],
                 bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 2], [2, 4, 1]],
                 labels: { 3: 'O', 4: 'NH₂' } },
    bands: [
      { g: 'nh_amide', c: 3352, w: 60, d: 0.60, s: 'l', tol: [3240, 3480], t: true },
      { g: 'co_carbonyl', c: 1655, w: 30, d: 0.90, s: 'l', tol: [1620, 1900], t: true },
      { g: 'ch_sp3',   c: 2940, w: 32, d: 0.40, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 3180, w: 70, d: 0.50, s: 'l' },
      { g: null, c: 1620, w: 34, d: 0.72, s: 'l' },
      { g: null, c: 1425, w: 28, d: 0.38, s: 'l' }
    ],
    peaks: [
      { mz: 73, ab: 55, role: 'mplus' },
      { mz: 57, ab: 12, ion: 'c2h5co', role: 'cluster',
        note: 'M − 16: the NH₂ has left and the C=O keeps the charge. Real, but losing the ethyl on the other side of the C=O is the better deal, and that gives the base peak.' },
      { mz: 45, ab: 8, role: 'minor' },
      { mz: 44, ab: 100, ion: 'conh2', role: 'key',
        why: 'The bond next to the C=O breaks and the ethyl walks off, −29, leaving H₂N–C≡O⁺ with the C=O and the nitrogen both helping to hold the charge. An odd molecular ion and a base peak at 44 is the signature of a primary amide.' },
      { mz: 29, ab: 15, ion: 'c2h5', role: 'cluster' },
      { mz: 28, ab: 20, role: 'cluster' },
      { mz: 27, ab: 18, role: 'cluster' }
    ]
  },
  {
    id: 'nmethylacetamide', name: 'N-Methylacetamide', formula: 'C₃H₇NO', f: 'C3H7NO', cls: 'Secondary amide',
    theme: 'acid', source: { ir: 'ir', ms: 'new' },
    structure: { pts: [[0, 0], [1, 0.5], [1, 1.35], [2, 0], [3, 0.5]],
                 bonds: [[0, 1, 1], [1, 2, 2], [1, 3, 1], [3, 4, 1]],
                 labels: { 2: 'O', 3: 'NH' } },
    bands: [
      { g: 'nh_amide', c: 3300, w: 70, d: 0.58, s: 'l', tol: [3180, 3470], t: true },
      { g: 'co_carbonyl', c: 1655, w: 30, d: 0.90, s: 'l', tol: [1620, 1900], t: true },
      { g: 'ch_sp3',   c: 2940, w: 32, d: 0.38, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 1560, w: 30, d: 0.78, s: 'l' },
      { g: null, c: 1410, w: 28, d: 0.42, s: 'l' }
    ],
    peaks: [
      { mz: 73, ab: 100, role: 'mplus' },
      { mz: 58, ab: 18, ion: 'ch3nhco', role: 'key',
        why: 'The bond between the C=O and its methyl breaks and •CH₃ leaves, −15. What is left, CH₃NH–C≡O⁺, has the C=O and the nitrogen sharing the charge. Propanamide, the same mass, loses an ethyl instead — which is why the two look so different here.' },
      { mz: 43, ab: 30, ion: 'ch3co', role: 'cluster' },
      { mz: 42, ab: 10, role: 'cluster' },
      { mz: 30, ab: 65, role: 'cluster',
        note: 'CH₂=NH₂⁺, the nitrogen fragment. Real and tall, but getting there from an N-methyl amide takes a hydrogen shift, not one clean break — so it is not one of the peaks marked here.' },
      { mz: 28, ab: 20, role: 'cluster' },
      { mz: 15, ab: 12, ion: 'ch3', role: 'cluster' }
    ]
  },

  /* ============================================================= nitrogen */
  {
    id: 'butylamine', name: '1-Butanamine', formula: 'C₄H₁₁N', f: 'C4H11N', cls: 'Primary amine',
    theme: 'nitrogen', source: { ir: 'ir', ms: 'new' },
    structure: { pts: zig(4).concat([[4, 0]]), bonds: link(5), labels: { 4: 'NH₂' } },
    bands: [
      { g: 'nh_amine1', c: 3368, w: 50, d: 0.36, s: 'l', tol: [3245, 3500], t: true },
      { g: 'ch_sp3',    c: 2958, w: 32, d: 0.78, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 3290, w: 50, d: 0.32, s: 'l' },
      { g: null, c: 2930, w: 32, d: 0.72, s: 'l' },
      { g: null, c: 2860, w: 30, d: 0.60, s: 'l' },
      { g: null, c: 1612, w: 40, d: 0.34, s: 'l' },
      { g: null, c: 1070, w: 36, d: 0.34, s: 'l' },
      { g: null, c: 810, w: 70, d: 0.40, s: 'l' }
    ],
    peaks: [
      { mz: 73, ab: 8, role: 'mplus' },
      { mz: 44, ab: 5, role: 'minor' },
      { mz: 42, ab: 6, role: 'minor' },
      { mz: 41, ab: 8, role: 'minor' },
      { mz: 30, ab: 100, ion: 'ch2nh2', role: 'key',
        why: 'Alpha cleavage at the nitrogen: the C–C bond next to the NH₂ breaks, the propyl walks off, −43, and CH₂=NH₂⁺ is left with the nitrogen holding the charge. Nitrogen does this even more willingly than oxygen, so m/z 30 swamps everything — as the base peak, it means a primary amine.' },
      { mz: 28, ab: 12, role: 'cluster' },
      { mz: 27, ab: 10, role: 'cluster' }
    ]
  },
  {
    id: 'diethylamine', name: 'Diethylamine', formula: 'C₄H₁₁N', f: 'C4H11N', cls: 'Secondary amine',
    theme: 'nitrogen', source: { ir: 'new', ms: 'ms' },
    structure: { pts: zig(5), bonds: link(5), labels: { 2: 'NH' } },
    bands: [
      { g: 'nh_amine2', c: 3288, w: 50, d: 0.20, s: 'l', tol: [3200, 3460], t: true },
      { g: 'ch_sp3',    c: 2966, w: 32, d: 0.84, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 2932, w: 32, d: 0.70, s: 'l' },
      { g: null, c: 2870, w: 30, d: 0.62, s: 'l' },
      { g: null, c: 2810, w: 26, d: 0.46, s: 'l' },
      { g: null, c: 1460, w: 26, d: 0.40, s: 'l' },
      { g: null, c: 1380, w: 22, d: 0.34, s: 'l' },
      { g: null, c: 1140, w: 34, d: 0.44, s: 'l' },
      { g: null, c: 730, w: 70, d: 0.46, s: 'l' }
    ],
    peaks: [
      { mz: 73, ab: 20, role: 'mplus' },
      { mz: 58, ab: 100, ion: 'etnhchme', role: 'key',
        why: 'Alpha cleavage losing a methyl from one of the ethyls, leaving the nitrogen holding the charge. Another odd molecular ion — one nitrogen.' },
      { mz: 44, ab: 12, role: 'cluster' },
      { mz: 30, ab: 30, ion: 'ch2nh2', role: 'cluster',
        note: 'CH₂=NH₂⁺ — nitrogen-stabilised and real, but reaching it from a SECONDARY amine takes more than one step. m/z 30 points to a primary amine only when it dominates; here the base peak does.' },
      { mz: 28, ab: 20, role: 'cluster' },
      { mz: 56, ab: 10, role: 'minor' }
    ]
  },
  {
    id: 'benzonitrile', name: 'Benzonitrile', formula: 'C₇H₅N', f: 'C7H5N', cls: 'Nitrile',
    theme: 'nitrogen', source: { ir: 'new', ms: 'new' },
    structure: arene([[1.62, 0], [2.62, 0]], [[0, 6, 1], [6, 7, 3]], { 7: 'N' }),
    bands: [
      { g: 'cn_nitrile', c: 2229, w: 16, d: 0.66, s: 'l', tol: [2180, 2300], t: true },
      { g: 'ch_sp2',     c: 3068, w: 24, d: 0.36, s: 'l', tol: [3000, 3140], t: true },
      { g: 'cc_arene',   c: 1599, w: 16, d: 0.44, s: 'l', tol: [1545, 1650], t: true },
      { g: null, c: 1490, w: 16, d: 0.56, s: 'l' },
      { g: null, c: 1448, w: 18, d: 0.50, s: 'l' },
      { g: null, c: 758, w: 24, d: 0.80, s: 'l' },
      { g: null, c: 688, w: 24, d: 0.78, s: 'l' },
      { g: null, c: 548, w: 22, d: 0.50, s: 'l' }
    ],
    peaks: [
      { mz: 103, ab: 100, role: 'mplus' },
      { mz: 102, ab: 5, role: 'minor' },
      { mz: 76, ab: 30, ion: 'c6h4', role: 'key',
        why: 'The ring throws off a whole molecule of HCN, −27, taking the nitrogen and its carbon with it. The molecular ion is still the tallest peak — a benzene ring holds a molecular ion together — but this −27 says where the nitrogen was.' },
      { mz: 75, ab: 8, role: 'minor' },
      { mz: 51, ab: 10, role: 'cluster' },
      { mz: 50, ab: 16, role: 'cluster' }
    ]
  },
  {
    id: 'nitrobenzene', name: 'Nitrobenzene', formula: 'C₆H₅NO₂', f: 'C6H5NO2', cls: 'Nitro compound',
    theme: 'nitrogen', source: { ir: 'ir', ms: 'new' },
    structure: arene([[1.62, 0]], [[0, 6, 1]], { 6: 'NO₂' }),
    bands: [
      { g: 'no2_group', c: 1522, w: 24, d: 0.90, s: 'l', tol: [1500, 1570], t: true },
      { g: 'ch_sp2',    c: 3078, w: 24, d: 0.36, s: 'l', tol: [3000, 3140], t: true },
      { g: 'cc_arene',  c: 1608, w: 16, d: 0.48, s: 'l', tol: [1580, 1680], t: true },
      { g: null, c: 1348, w: 24, d: 0.88, s: 'l' },
      { g: null, c: 1480, w: 18, d: 0.42, s: 'l' },
      { g: null, c: 852, w: 24, d: 0.72, s: 'l' },
      { g: null, c: 705, w: 24, d: 0.76, s: 'l' }
    ],
    peaks: [
      { mz: 123, ab: 65, role: 'mplus' },
      { mz: 93, ab: 15, role: 'cluster',
        note: 'M − 30: nitric oxide, NO, has left. That needs an oxygen to move onto the ring first — a rearrangement, not one of the four breaks this unit covers. Real, and a known nitro signature, but the −46 is the clean one.' },
      { mz: 77, ab: 100, ion: 'ph', role: 'key',
        why: 'The C–N bond breaks and the whole nitro group walks off as •NO₂, −46, leaving the bare ring. The odd molecular ion said "nitrogen"; losing 46 says it was a nitro group — and the IR’s strong band near 1520 agrees.' },
      { mz: 65, ab: 12, role: 'cluster' },
      { mz: 51, ab: 55, ion: 'c4h3', role: 'cluster' },
      { mz: 50, ab: 20, role: 'cluster' },
      { mz: 39, ab: 10, role: 'cluster' },
      { mz: 30, ab: 8, role: 'minor' }
    ]
  },

  /* ========================================================= hydrocarbons */
  {
    id: 'hexane', name: 'Hexane', formula: 'C₆H₁₄', f: 'C6H14', cls: 'Straight-chain alkane',
    theme: 'hydrocarbon', source: { ir: 'ir', ms: 'ms' },
    structure: { pts: zig(6), bonds: link(6), labels: {} },
    bands: alkylCH(0.88),
    peaks: [
      { mz: 86, ab: 12, role: 'mplus' },
      { mz: 57, ab: 45, ion: 'c4h9s', role: 'key',
        why: 'A butyl cation from breaking the chain — but with no branch point it has nothing special going for it, so it never dominates.' },
      { mz: 43, ab: 100, ion: 'c3h7', role: 'key',
        why: 'Breaking the middle of the chain. With no branch point anywhere, every C–C bond is about as good as every other, so the spectrum is a smooth run of clusters rather than one dominant peak. That evenness IS the evidence for a straight chain.' },
      { mz: 41, ab: 40, ion: 'c3h5', role: 'cluster' },
      { mz: 29, ab: 35, ion: 'c2h5', role: 'cluster' },
      { mz: 27, ab: 30, role: 'cluster' },
      { mz: 71, ab: 10, role: 'cluster' }
    ]
  },
  {
    id: 'dimethylbutane', name: '2,2-Dimethylbutane', formula: 'C₆H₁₄', f: 'C6H14', cls: 'Branched alkane',
    theme: 'hydrocarbon', source: { ir: 'new', ms: 'ms' },
    structure: { pts: [[1, 0], [0, 0.5], [1, -1], [1, 1], [2, 0.5], [3, 0]],
                 bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [4, 5, 1]], labels: {} },
    bands: [
      { g: 'ch_sp3', c: 2962, w: 34, d: 0.86, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 2912, w: 32, d: 0.62, s: 'l' },
      { g: null, c: 2873, w: 30, d: 0.66, s: 'l' },
      { g: null, c: 1470, w: 26, d: 0.42, s: 'l' },
      { g: null, c: 1385, w: 14, d: 0.34, s: 'l' },
      { g: null, c: 1366, w: 14, d: 0.42, s: 'l' },
      { g: null, c: 1250, w: 22, d: 0.22, s: 'l' }
    ],
    peaks: [
      { mz: 86, ab: 1, role: 'minor' },
      { mz: 71, ab: 12, ion: 'c5h11', role: 'key',
        why: 'Losing a methyl from the quaternary carbon. Also gives a tertiary cation, but it is the less favourable of the two cuts.' },
      { mz: 57, ab: 100, ion: 'c4h9', role: 'key',
        why: 'The chain breaks at the quaternary carbon and leaves a TERT-BUTYL cation — three methyls donating into an empty orbital. It forms so readily that the molecular ion at 86 is all but gone. A missing M⁺ plus a huge 57 says "branch point" before you have worked anything else out.' },
      { mz: 43, ab: 25, ion: 'c3h7', role: 'cluster' },
      { mz: 41, ab: 30, ion: 'c3h5', role: 'cluster' },
      { mz: 29, ab: 25, role: 'cluster' }
    ]
  },
  {
    id: 'cyclohexane', name: 'Cyclohexane', formula: 'C₆H₁₂', f: 'C6H12', cls: 'Cycloalkane',
    theme: 'hydrocarbon', source: { ir: 'new', ms: 'new' },
    structure: ring6([], []),
    bands: [
      { g: 'ch_sp3', c: 2927, w: 30, d: 0.90, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 2853, w: 28, d: 0.80, s: 'l' },
      { g: null, c: 1449, w: 22, d: 0.55, s: 'l' },
      { g: null, c: 1258, w: 18, d: 0.12, s: 'l' },
      { g: null, c: 903, w: 18, d: 0.25, s: 'l' }
    ],
    peaks: [
      { mz: 84, ab: 70, role: 'mplus' },
      { mz: 69, ab: 25, role: 'cluster',
        note: 'M − 15. A ring has no methyl to lose until it has opened, so this takes two steps and stays modest. The −28 is the break that says "ring".' },
      { mz: 56, ab: 100, ion: 'c4h8', role: 'key',
        why: 'The ring opens and sheds a whole molecule of ethene, −28. A ring has to break TWO bonds to lose anything, so it throws off a small stable molecule rather than a radical — and the M⁺ stays tall, because breaking one bond alone loses nothing.' },
      { mz: 55, ab: 30, role: 'cluster' },
      { mz: 42, ab: 25, role: 'cluster' },
      { mz: 41, ab: 55, ion: 'c3h5', role: 'cluster' },
      { mz: 39, ab: 20, role: 'cluster' },
      { mz: 27, ab: 20, role: 'cluster' }
    ]
  },
  {
    id: 'hexene', name: '1-Hexene', formula: 'C₆H₁₂', f: 'C6H12', cls: 'Alkene',
    theme: 'hydrocarbon', source: { ir: 'ir', ms: 'new' },
    structure: { pts: zig(6), bonds: [[0, 1, 2], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1]],
                 labels: {} },
    bands: [
      { g: 'ch_sp2',    c: 3082, w: 26, d: 0.46, s: 'l', tol: [3000, 3140], t: true },
      { g: 'cc_alkene', c: 1642, w: 22, d: 0.42, s: 'l', tol: [1600, 1690], t: true },
      { g: null, c: 993, w: 26, d: 0.72, s: 'l' },
      { g: null, c: 910, w: 28, d: 0.80, s: 'l' }
    ].concat(alkylCH(0.82)),
    peaks: [
      { mz: 84, ab: 25, role: 'mplus' },
      { mz: 69, ab: 25, role: 'cluster' },
      { mz: 56, ab: 85, role: 'mcl',
        note: 'm/z 56 is real and tall, but it comes from a REARRANGEMENT: the chain folds over, passes a hydrogen across, and throws off a molecule of ethene. That is not one of the four breaks this unit covers, so leave it alone.' },
      { mz: 55, ab: 60, role: 'cluster' },
      { mz: 43, ab: 30, ion: 'c3h7', role: 'cluster' },
      { mz: 42, ab: 70, role: 'mcl',
        note: 'm/z 42 comes from the same kind of rearrangement as 56 — a hydrogen passed across before the chain breaks, this time throwing off propene. Real, but not part of this unit.' },
      { mz: 41, ab: 100, ion: 'c3h5', role: 'key',
        why: 'The bond one carbon out from the C=C breaks and the propyl walks off, −43. What is left is CH₂=CH–CH₂⁺, and the double bond next door spreads the charge — the same trick as breaking next to a benzene ring, on a smaller scale. That is why it beats every other break in the chain.' },
      { mz: 39, ab: 30, role: 'cluster' },
      { mz: 29, ab: 25, role: 'cluster' },
      { mz: 27, ab: 35, role: 'cluster' }
    ]
  },
  {
    id: 'hexyne', name: '1-Hexyne', formula: 'C₆H₁₀', f: 'C6H10', cls: 'Terminal alkyne',
    theme: 'hydrocarbon', source: { ir: 'ir', ms: 'new' },
    structure: { pts: [[0, 0], [1, 0], [2, 0], [3, 0.5], [4, 0], [5, 0.5]],
                 bonds: [[0, 1, 3], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1]], labels: {} },
    bands: [
      { g: 'ch_sp',     c: 3310, w: 24, d: 0.72, s: 'l', tol: [3230, 3400], t: true },
      { g: 'cc_alkyne', c: 2120, w: 18, d: 0.26, s: 'l', tol: [2040, 2200], t: true },
      { g: null, c: 630, w: 40, d: 0.60, s: 'l' }
    ].concat(alkylCH(0.84)),
    /* No readable molecular ion, so this is an answer from Level 3 only.
       The IR carries it: ≡C–H and C≡C together are unmistakable. */
    peaks: [
      { mz: 82, ab: 2, role: 'minor' },
      { mz: 81, ab: 8, role: 'cluster',
        note: 'M − 1: a terminal alkyne can lose the hydrogen on its end carbon. But there is no readable molecular ion to count from, so on this spectrum alone you could not have said so.' },
      { mz: 67, ab: 100, role: 'cluster',
        note: 'The base peak, M − 15: a methyl has left. Worth knowing once you know the answer — but with no molecular ion above the line, the loss could not have been worked out from this spectrum.' },
      { mz: 54, ab: 45, role: 'cluster' },
      { mz: 53, ab: 30, role: 'cluster' },
      { mz: 43, ab: 40, ion: 'c3h7', role: 'cluster' },
      { mz: 41, ab: 80, ion: 'c3h5', role: 'cluster' },
      { mz: 39, ab: 60, role: 'cluster' },
      { mz: 27, ab: 40, role: 'cluster' }
    ]
  },
  {
    id: 'toluene', name: 'Toluene', formula: 'C₇H₈', f: 'C7H8', cls: 'Alkylbenzene',
    theme: 'hydrocarbon', source: { ir: 'ir', ms: 'ms' },
    structure: arene([[1.62, 0]], [[0, 6, 1]]),
    bands: [
      { g: 'ch_sp2',   c: 3062, w: 24, d: 0.52, s: 'l', tol: [3000, 3140], t: true },
      { g: 'ch_sp3',   c: 2925, w: 32, d: 0.50, s: 'l', tol: [2840, 3000], t: true },
      { g: 'cc_arene', c: 1605, w: 16, d: 0.52, s: 'l', tol: [1560, 1650], t: true },
      { g: null, c: 3028, w: 22, d: 0.34, s: 'l' },
      { g: null, c: 2870, w: 28, d: 0.30, s: 'l' },
      { g: null, c: 1496, w: 16, d: 0.58, s: 'l' },
      { g: null, c: 1460, w: 18, d: 0.40, s: 'l' },
      { g: null, c: 729, w: 22, d: 0.86, s: 'l' },
      { g: null, c: 695, w: 22, d: 0.88, s: 'l' }
    ],
    peaks: [
      { mz: 92, ab: 70, role: 'mplus' },
      { mz: 91, ab: 100, ion: 'c7h7', role: 'key',
        why: 'Losing a single hydrogen leaves C₇H₇⁺, where the ring spreads the charge around itself. It is so much better off than the molecular ion that M−1 outgrows M⁺.' },
      { mz: 65, ab: 25, ion: 'c5h5', role: 'cluster' },
      { mz: 39, ab: 20, role: 'cluster' },
      { mz: 51, ab: 10, role: 'minor' }
    ]
  },
  {
    id: 'propylbenzene', name: 'Propylbenzene', formula: 'C₉H₁₂', f: 'C9H12', cls: 'Alkylbenzene',
    theme: 'hydrocarbon', source: { ir: 'new', ms: 'ms' },
    structure: arene([[1.62, 0], [2.24, 0.4], [2.86, 0]], [[0, 6, 1], [6, 7, 1], [7, 8, 1]]),
    bands: [
      { g: 'ch_sp2',   c: 3027, w: 24, d: 0.46, s: 'l', tol: [3000, 3140], t: true },
      { g: 'ch_sp3',   c: 2960, w: 32, d: 0.62, s: 'l', tol: [2840, 3000], t: true },
      { g: 'cc_arene', c: 1604, w: 16, d: 0.44, s: 'l', tol: [1550, 1650], t: true },
      { g: null, c: 3063, w: 22, d: 0.34, s: 'l' },
      { g: null, c: 2931, w: 32, d: 0.56, s: 'l' },
      { g: null, c: 2872, w: 30, d: 0.44, s: 'l' },
      { g: null, c: 1496, w: 16, d: 0.58, s: 'l' },
      { g: null, c: 1454, w: 18, d: 0.48, s: 'l' },
      { g: null, c: 745, w: 22, d: 0.80, s: 'l' },
      { g: null, c: 698, w: 22, d: 0.86, s: 'l' }
    ],
    peaks: [
      { mz: 120, ab: 25, role: 'mplus' },
      { mz: 91, ab: 100, ion: 'c7h7', role: 'key',
        why: 'The bond one carbon out from the ring breaks — but here the group that leaves is an ethyl, so this is a −29 rather than a −15. The fragment is the same C₇H₇⁺; only the arithmetic changes.' },
      { mz: 92, ab: 9, role: 'minor' },
      { mz: 65, ab: 12, ion: 'c5h5', role: 'cluster' },
      { mz: 39, ab: 10, role: 'cluster' },
      { mz: 51, ab: 6, role: 'minor' }
    ]
  },
  {
    id: 'cumene', name: 'Isopropylbenzene (cumene)', formula: 'C₉H₁₂', f: 'C9H12', cls: 'Alkylbenzene',
    theme: 'hydrocarbon', source: { ir: 'new', ms: 'ms' },
    structure: arene([[1.62, 0], [2.42, 0.5], [2.42, -0.5]], [[0, 6, 1], [6, 7, 1], [6, 8, 1]]),
    bands: [
      { g: 'ch_sp2',   c: 3030, w: 24, d: 0.44, s: 'l', tol: [3000, 3140], t: true },
      { g: 'ch_sp3',   c: 2962, w: 32, d: 0.72, s: 'l', tol: [2840, 3000], t: true },
      { g: 'cc_arene', c: 1604, w: 16, d: 0.42, s: 'l', tol: [1550, 1650], t: true },
      { g: null, c: 3065, w: 22, d: 0.32, s: 'l' },
      { g: null, c: 2930, w: 32, d: 0.50, s: 'l' },
      { g: null, c: 2872, w: 30, d: 0.46, s: 'l' },
      { g: null, c: 1495, w: 16, d: 0.58, s: 'l' },
      { g: null, c: 1460, w: 18, d: 0.46, s: 'l' },
      { g: null, c: 1385, w: 14, d: 0.30, s: 'l' },
      { g: null, c: 1365, w: 14, d: 0.32, s: 'l' },
      { g: null, c: 760, w: 22, d: 0.80, s: 'l' },
      { g: null, c: 698, w: 22, d: 0.86, s: 'l' }
    ],
    peaks: [
      { mz: 120, ab: 25, role: 'mplus' },
      { mz: 105, ab: 100, ion: 'phchch3', role: 'key',
        why: 'The bond next to the ring breaks and a methyl leaves. The cation left behind is next to the ring AND secondary — the ring and the remaining methyl both feed it — so it beats the alternative easily.' },
      { mz: 79, ab: 15, role: 'cluster' },
      { mz: 77, ab: 20, ion: 'ph', role: 'key',
        why: 'Losing the whole isopropyl group, a −43, gives the bare ring. It happens, but the bare ring is poorly stabilised, so the break next to the ring wins.' },
      { mz: 51, ab: 12, ion: 'c4h3', role: 'cluster' },
      { mz: 103, ab: 10, role: 'minor' }
    ]
  },

  /* =============================================================== halides */
  {
    id: 'bromopropane', name: '1-Bromopropane', formula: 'C₃H₇Br', f: 'C3H7Br', cls: 'Alkyl bromide',
    theme: 'halide', source: { ir: 'new', ms: 'ms' }, isotopeTarget: true,
    structure: { pts: zig(3).concat([[3, 0.5]]), bonds: link(4), labels: { 3: 'Br' } },
    bands: [
      { g: 'ch_sp3', c: 2966, w: 32, d: 0.66, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 2933, w: 30, d: 0.50, s: 'l' },
      { g: null, c: 2875, w: 28, d: 0.40, s: 'l' },
      { g: null, c: 1460, w: 24, d: 0.44, s: 'l' },
      { g: null, c: 1380, w: 20, d: 0.28, s: 'l' },
      { g: null, c: 1250, w: 22, d: 0.66, s: 'l' },
      { g: null, c: 1210, w: 20, d: 0.40, s: 'l' },
      { g: null, c: 745, w: 26, d: 0.40, s: 'l' },
      { g: null, c: 560, w: 26, d: 0.60, s: 'l' }
    ],
    peaks: [
      { mz: 122, ab: 30, role: 'mplus' },
      { mz: 43, ab: 100, ion: 'c3h7', role: 'key',
        why: 'The C–Br bond is much the weakest in the molecule, so it breaks first and leaves a propyl cation. The bromine walks off with the electrons.' },
      { mz: 41, ab: 30, ion: 'c3h5', role: 'cluster' },
      { mz: 27, ab: 30, role: 'cluster' },
      { mz: 39, ab: 12, role: 'cluster' }
    ]
  },
  {
    id: 'chlorobutane', name: '1-Chlorobutane', formula: 'C₄H₉Cl', f: 'C4H9Cl', cls: 'Alkyl chloride',
    theme: 'halide', source: { ir: 'new', ms: 'ms' }, isotopeTarget: true,
    structure: { pts: zig(4).concat([[4, 0]]), bonds: link(5), labels: { 4: 'Cl' } },
    bands: [
      { g: 'ch_sp3', c: 2962, w: 32, d: 0.74, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 2933, w: 30, d: 0.62, s: 'l' },
      { g: null, c: 2874, w: 28, d: 0.48, s: 'l' },
      { g: null, c: 1465, w: 24, d: 0.44, s: 'l' },
      { g: null, c: 1380, w: 20, d: 0.28, s: 'l' },
      { g: null, c: 1290, w: 22, d: 0.40, s: 'l' },
      { g: null, c: 735, w: 26, d: 0.56, s: 'l' },
      { g: null, c: 652, w: 24, d: 0.62, s: 'l' }
    ],
    peaks: [
      { mz: 92, ab: 12, role: 'mplus' },
      { mz: 56, ab: 75, ion: 'dehydrohalo', role: 'key',
        why: 'The chlorine leaves taking a neighbouring hydrogen with it — loss of HCl, −36. Exactly the move an alcohol makes when it loses water.' },
      { mz: 41, ab: 100, ion: 'c3h5', role: 'cluster' },
      { mz: 43, ab: 30, ion: 'c3h7', role: 'cluster' },
      { mz: 27, ab: 45, role: 'cluster' },
      { mz: 29, ab: 20, role: 'cluster' }
    ]
  },
  {
    id: 'bromobenzene', name: 'Bromobenzene', formula: 'C₆H₅Br', f: 'C6H5Br', cls: 'Aryl bromide',
    theme: 'halide', source: { ir: 'new', ms: 'ms' }, isotopeTarget: true,
    structure: arene([[1.62, 0]], [[0, 6, 1]], { 6: 'Br' }),
    bands: [
      { g: 'ch_sp2',   c: 3064, w: 24, d: 0.40, s: 'l', tol: [3000, 3140], t: true },
      { g: 'cc_arene', c: 1578, w: 16, d: 0.52, s: 'l', tol: [1540, 1640], t: true },
      { g: null, c: 1476, w: 16, d: 0.72, s: 'l' },
      { g: null, c: 1444, w: 16, d: 0.50, s: 'l' },
      { g: null, c: 1070, w: 20, d: 0.52, s: 'l' },
      { g: null, c: 1020, w: 18, d: 0.46, s: 'l' },
      { g: null, c: 737, w: 22, d: 0.86, s: 'l' },
      { g: null, c: 688, w: 22, d: 0.86, s: 'l' }
    ],
    peaks: [
      { mz: 156, ab: 100, role: 'mplus' },
      { mz: 77, ab: 90, ion: 'ph', role: 'key',
        why: 'Losing the bromine atom, −79, leaves the bare ring. The C–Br bond is much the weakest thing here, so it goes first — and the ring holds the molecular ion together so well that M⁺ still edges it.' },
      { mz: 51, ab: 30, ion: 'c4h3', role: 'cluster' },
      { mz: 50, ab: 20, role: 'cluster' },
      { mz: 78, ab: 8, role: 'minor' }
    ]
  },
  {
    id: 'chlorobenzene', name: 'Chlorobenzene', formula: 'C₆H₅Cl', f: 'C6H5Cl', cls: 'Aryl chloride',
    theme: 'halide', source: { ir: 'new', ms: 'ms' }, isotopeTarget: true,
    structure: arene([[1.62, 0]], [[0, 6, 1]], { 6: 'Cl' }),
    bands: [
      { g: 'ch_sp2',   c: 3068, w: 24, d: 0.40, s: 'l', tol: [3000, 3140], t: true },
      { g: 'cc_arene', c: 1584, w: 16, d: 0.54, s: 'l', tol: [1540, 1640], t: true },
      { g: null, c: 1478, w: 16, d: 0.74, s: 'l' },
      { g: null, c: 1446, w: 16, d: 0.52, s: 'l' },
      { g: null, c: 1084, w: 20, d: 0.56, s: 'l' },
      { g: null, c: 1024, w: 18, d: 0.42, s: 'l' },
      { g: null, c: 740, w: 22, d: 0.86, s: 'l' },
      { g: null, c: 690, w: 22, d: 0.86, s: 'l' }
    ],
    peaks: [
      { mz: 112, ab: 100, role: 'mplus' },
      { mz: 77, ab: 55, ion: 'ph', role: 'key',
        why: 'Losing the chlorine atom, −35, gives the bare ring. The ring holds the molecular ion together so well that M⁺ itself stays the base peak — aromatic rings usually do this.' },
      { mz: 51, ab: 25, ion: 'c4h3', role: 'cluster' },
      { mz: 50, ab: 15, role: 'cluster' },
      { mz: 75, ab: 8, role: 'minor' }
    ]
  }
];

/* molecules.js — the item bank.
 *
 * Every spectrum in this activity is GENERATED from the numbers below, not
 * scanned from a database. Each band is:
 *
 *   g     group id from groups.js, or null for a band that is drawn only so
 *         the spectrum looks like a real spectrum
 *   c     band centre, cm-1
 *   w     full width at half maximum, cm-1
 *   d     depth, 0-1 (1 = absorbs everything -> 0 %T)
 *   s     'l' Lorentzian (sharp) or 'g' Gaussian (broad, H-bonded)
 *   tol   [lo, hi] the wavenumber window a student may drop the label in
 *   t     true if this band is a drop target
 *
 * All carbonyls share one group, co_carbonyl: this activity does not split
 * ester from ketone from amide by a few tens of wavenumbers. The accepted
 * window is the whole carbonyl region, narrowed only where an aromatic ring
 * C=C target sits just below it.
 *
 * ONLY BANDS ABOVE 1500 cm-1 ARE SCORED. Everything below the 1500 line is the
 * fingerprint region: those bands are drawn, and C-O is named in the answer key
 * and the correlation table, but no student is ever asked to label one.
 *
 * The sp2 / sp3 C-H windows meet exactly at 3000, which is the line drawn on
 * the plot: above 3000 is sp2, below is sp3, and nothing straddles it.
 *
 * `theme` drives the draw. Each level takes one molecule per theme, so a run
 * always contains an alcohol, an acid, a carbonyl, an N-H compound, a plain
 * hydrocarbon and a triple bond rather than whatever chance produces.
 *
 * `tags` are the levels a molecule may be drawn for: 'find' (Level 1, label by
 * family) and 'name' (Level 2, label by specific group, compound hidden).
 *
 * Structures use a tiny skeletal spec: pts (vertices), bonds [i, j, order],
 * labels (vertex -> heteroatom text), rings (vertices drawn with an inner
 * circle for aromaticity).
 */

/* Hexagon vertices for a benzene ring, substituent leaving vertex 0 to the right. */
var HEX = [[0.62, 0], [0.31, 0.537], [-0.31, 0.537], [-0.62, 0], [-0.31, -0.537], [0.31, -0.537]];
var HEX_BONDS = [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1], [5, 0, 1]];

function arene(extraPts, extraBonds, labels) {
  return {
    pts: HEX.concat(extraPts),
    bonds: HEX_BONDS.concat(extraBonds),
    rings: [[0, 1, 2, 3, 4, 5]],
    labels: labels || {}
  };
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

var MOLECULES = [
  {
    id: 'hexane', name: 'Hexane', formula: 'C₆H₁₄', cls: 'Alkane',
    theme: 'hc', tags: ['find'],
    structure: { pts: [[0, 0], [1, 0.5], [2, 0], [3, 0.5], [4, 0], [5, 0.5]],
                 bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1]], labels: {} },
    bands: alkylCH(0.88)
  },

  {
    id: 'hexene', name: '1-Hexene', formula: 'C₆H₁₂', cls: 'Alkene',
    theme: 'hc', tags: ['find', 'name'],
    structure: { pts: [[0, 0], [1, 0.5], [2, 0], [3, 0.5], [4, 0], [5, 0.5]],
                 bonds: [[0, 1, 2], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1]], labels: {} },
    bands: [
      { g: 'ch_sp2',    c: 3082, w: 26, d: 0.46, s: 'l', tol: [3000, 3140], t: true },
      { g: 'cc_alkene', c: 1642, w: 22, d: 0.42, s: 'l', tol: [1600, 1690], t: true },
      { g: null, c: 993, w: 26, d: 0.72, s: 'l' },
      { g: null, c: 910, w: 28, d: 0.80, s: 'l' }
    ].concat(alkylCH(0.82))
  },

  {
    id: 'hexyne', name: '1-Hexyne', formula: 'C₆H₁₀', cls: 'Terminal alkyne',
    theme: 'triple', tags: ['find', 'name'],
    structure: { pts: [[0, 0], [1, 0], [2, 0], [3, 0.5], [4, 0], [5, 0.5]],
                 bonds: [[0, 1, 3], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1]], labels: {} },
    bands: [
      { g: 'ch_sp',     c: 3310, w: 24, d: 0.72, s: 'l', tol: [3230, 3400], t: true },
      { g: 'cc_alkyne', c: 2120, w: 18, d: 0.26, s: 'l', tol: [2040, 2200], t: true },
      { g: null, c: 630, w: 40, d: 0.60, s: 'l' }
    ].concat(alkylCH(0.84))
  },

  {
    id: 'toluene', name: 'Toluene', formula: 'C₇H₈', cls: 'Aromatic hydrocarbon',
    theme: 'hc', tags: ['find', 'name'],
    structure: arene([[1.5, 0]], [[0, 6, 1]]),
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
    ]
  },

  {
    id: 'butanol', name: '1-Butanol', formula: 'C₄H₁₀O', cls: 'Alcohol',
    theme: 'oh', tags: ['find', 'name'],
    structure: { pts: [[0, 0], [1, 0.5], [2, 0], [3, 0.5], [4, 0]],
                 bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1]], labels: { 4: 'OH' } },
    bands: [
      { g: 'oh_alcohol', c: 3340, w: 280, d: 0.80, s: 'g', tol: [3180, 3620], t: true },
      { g: 'co_single',  c: 1055, w: 42, d: 0.82, s: 'l' },
      { g: null, c: 1380, w: 26, d: 0.30, s: 'l' }
    ].concat(alkylCH(0.80))
  },

  {
    id: 'phenol', name: 'Phenol', formula: 'C₆H₆O', cls: 'Phenol',
    theme: 'oh', tags: ['find', 'name'],
    structure: arene([[1.5, 0]], [[0, 6, 1]], { 6: 'OH' }),
    bands: [
      { g: 'oh_alcohol', c: 3350, w: 260, d: 0.76, s: 'g', tol: [3190, 3640], t: true },
      { g: 'ch_sp2',     c: 3055, w: 24, d: 0.38, s: 'l', tol: [3000, 3140], t: true },
      { g: 'cc_arene',   c: 1596, w: 16, d: 0.56, s: 'l', tol: [1545, 1650], t: true },
      { g: 'co_single',  c: 1225, w: 36, d: 0.78, s: 'l' },
      { g: null, c: 1498, w: 16, d: 0.62, s: 'l' },
      { g: null, c: 1360, w: 26, d: 0.44, s: 'l' },
      { g: null, c: 810, w: 26, d: 0.66, s: 'l' },
      { g: null, c: 750, w: 24, d: 0.78, s: 'l' }
    ]
  },

  {
    id: 'butanoicacid', name: 'Butanoic acid', formula: 'C₄H₈O₂', cls: 'Carboxylic acid',
    theme: 'acid', tags: ['find', 'name'],
    structure: { pts: [[0, 0], [1, 0.5], [2, 0], [3, 0.5], [3, 1.35], [4, 0]],
                 bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 2], [3, 5, 1]],
                 labels: { 4: 'O', 5: 'OH' } },
    bands: [
      { g: 'oh_acid', c: 3000, w: 700, d: 0.66, s: 'g', tol: [2480, 3320], t: true },
      { g: 'co_carbonyl', c: 1712, w: 26, d: 0.90, s: 'l', tol: [1620, 1900], t: true },
      { g: 'co_single', c: 1290, w: 40, d: 0.58, s: 'l' },
      { g: null, c: 2960, w: 34, d: 0.55, s: 'l' },
      { g: null, c: 2935, w: 34, d: 0.50, s: 'l' },
      { g: null, c: 1415, w: 26, d: 0.40, s: 'l' },
      { g: null, c: 935, w: 60, d: 0.48, s: 'l' }
    ]
  },

  {
    id: 'benzoicacid', name: 'Benzoic acid', formula: 'C₇H₆O₂', cls: 'Aromatic carboxylic acid',
    theme: 'acid', tags: ['find', 'name'],
    structure: arene([[1.5, 0], [1.5, 0.85], [2.4, -0.45]], [[0, 6, 1], [6, 7, 2], [6, 8, 1]],
                     { 7: 'O', 8: 'OH' }),
    bands: [
      { g: 'oh_acid',   c: 3010, w: 690, d: 0.62, s: 'g', tol: [2470, 3330], t: true },
      { g: 'co_carbonyl', c: 1685, w: 26, d: 0.90, s: 'l', tol: [1655, 1900], t: true },
      { g: 'cc_arene',  c: 1602, w: 16, d: 0.52, s: 'l', tol: [1560, 1650], t: true },
      { g: 'co_single', c: 1290, w: 38, d: 0.72, s: 'l' },
      { g: null, c: 3070, w: 26, d: 0.34, s: 'l' },
      { g: null, c: 1452, w: 18, d: 0.46, s: 'l' },
      { g: null, c: 930, w: 60, d: 0.50, s: 'l' },
      { g: null, c: 710, w: 24, d: 0.78, s: 'l' }
    ]
  },

  {
    id: 'ethylacetate', name: 'Ethyl acetate', formula: 'C₄H₈O₂', cls: 'Ester',
    theme: 'co', tags: ['find', 'name'],
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
    ]
  },

  {
    id: 'butanone', name: '2-Butanone', formula: 'C₄H₈O', cls: 'Ketone',
    theme: 'co', tags: ['find', 'name'],
    structure: { pts: [[0, 0], [1, 0.5], [1, 1.35], [2, 0], [3, 0.5]],
                 bonds: [[0, 1, 1], [1, 2, 2], [1, 3, 1], [3, 4, 1]], labels: { 2: 'O' } },
    bands: [
      { g: 'co_carbonyl', c: 1715, w: 24, d: 0.91, s: 'l', tol: [1620, 1900], t: true },
      { g: 'ch_sp3',    c: 2980, w: 32, d: 0.55, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 2940, w: 32, d: 0.45, s: 'l' },
      { g: null, c: 1415, w: 26, d: 0.42, s: 'l' },
      { g: null, c: 1360, w: 24, d: 0.46, s: 'l' },
      { g: null, c: 1170, w: 34, d: 0.40, s: 'l' }
    ]
  },

  {
    id: 'butanal', name: 'Butanal', formula: 'C₄H₈O', cls: 'Aldehyde',
    theme: 'co', tags: ['find', 'name'],
    structure: { pts: [[0, 0], [1, 0.5], [2, 0], [3, 0.5], [3, 1.35], [4, 0]],
                 bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 2], [3, 5, 1]],
                 labels: { 4: 'O', 5: 'H' } },
    bands: [
      { g: 'co_carbonyl', c: 1727, w: 24, d: 0.90, s: 'l', tol: [1620, 1900], t: true },
      { g: 'ch_aldehyde', c: 2820, w: 26, d: 0.40, s: 'l', tol: [2680, 2838], t: true },
      { g: 'ch_sp3',      c: 2962, w: 32, d: 0.58, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 2718, w: 24, d: 0.42, s: 'l' },
      { g: null, c: 2930, w: 32, d: 0.50, s: 'l' },
      { g: null, c: 1460, w: 28, d: 0.35, s: 'l' },
      { g: null, c: 1125, w: 34, d: 0.30, s: 'l' }
    ]
  },

  {
    id: 'benzaldehyde', name: 'Benzaldehyde', formula: 'C₇H₆O', cls: 'Aromatic aldehyde',
    theme: 'co', tags: ['name'],
    structure: arene([[1.5, 0], [1.5, 0.85], [2.4, -0.45]], [[0, 6, 1], [6, 7, 2], [6, 8, 1]],
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
    ]
  },

  {
    id: 'acetophenone', name: 'Acetophenone', formula: 'C₈H₈O', cls: 'Aryl ketone',
    theme: 'co', tags: ['name'],
    structure: arene([[1.5, 0], [1.5, 0.85], [2.4, -0.45]], [[0, 6, 1], [6, 7, 2], [6, 8, 1]],
                     { 7: 'O' }),
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
    ]
  },

  {
    id: 'acetylchloride', name: 'Acetyl chloride', formula: 'C₂H₃ClO', cls: 'Acid chloride',
    theme: 'co', tags: ['name'],
    structure: { pts: [[0, 0], [1, 0.5], [1, 1.35], [2, 0]],
                 bonds: [[0, 1, 1], [1, 2, 2], [1, 3, 1]], labels: { 2: 'O', 3: 'Cl' } },
    bands: [
      { g: 'co_carbonyl', c: 1802, w: 24, d: 0.92, s: 'l', tol: [1620, 1900], t: true },
      { g: 'ch_sp3',      c: 2940, w: 32, d: 0.34, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 1355, w: 26, d: 0.56, s: 'l' },
      { g: null, c: 1105, w: 34, d: 0.62, s: 'l' },
      { g: null, c: 605, w: 40, d: 0.70, s: 'l' }
    ]
  },

  {
    id: 'aceticanhydride', name: 'Acetic anhydride', formula: 'C₄H₆O₃', cls: 'Anhydride',
    theme: 'co', tags: ['name'],
    structure: { pts: [[0, 0], [1, 0.5], [1, 1.35], [2, 0], [3, 0.5], [3, 1.35], [4, 0]],
                 bonds: [[0, 1, 1], [1, 2, 2], [1, 3, 1], [3, 4, 1], [4, 5, 2], [4, 6, 1]],
                 labels: { 2: 'O', 3: 'O', 5: 'O' } },
    bands: [
      { g: 'co_carbonyl', c: 1825, w: 24, d: 0.86, s: 'l', tol: [1620, 1900], t: true },
      { g: 'ch_sp3',       c: 2940, w: 32, d: 0.30, s: 'l', tol: [2840, 3000], t: true },
      { g: 'co_single',    c: 1125, w: 38, d: 0.88, s: 'l' },
      { g: null, c: 1752, w: 24, d: 0.92, s: 'l' },
      { g: null, c: 1370, w: 26, d: 0.58, s: 'l' },
      { g: null, c: 1000, w: 34, d: 0.62, s: 'l' }
    ]
  },

  {
    id: 'propanamide', name: 'Propanamide', formula: 'C₃H₇NO', cls: 'Primary amide',
    theme: 'nh', tags: ['find', 'name'],
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
    ]
  },

  {
    id: 'nmethylacetamide', name: 'N-Methylacetamide', formula: 'C₃H₇NO', cls: 'Secondary amide',
    theme: 'nh', tags: ['name'],
    structure: { pts: [[0, 0], [1, 0.5], [1, 1.35], [2, 0], [3, 0.5]],
                 bonds: [[0, 1, 1], [1, 2, 2], [1, 3, 1], [3, 4, 1]],
                 labels: { 2: 'O', 3: 'NH' } },
    bands: [
      { g: 'nh_amide', c: 3300, w: 70, d: 0.58, s: 'l', tol: [3180, 3470], t: true },
      { g: 'co_carbonyl', c: 1655, w: 30, d: 0.90, s: 'l', tol: [1620, 1900], t: true },
      { g: 'ch_sp3',   c: 2940, w: 32, d: 0.38, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 1560, w: 30, d: 0.78, s: 'l' },
      { g: null, c: 1410, w: 28, d: 0.42, s: 'l' }
    ]
  },

  {
    id: 'butylamine', name: '1-Butanamine', formula: 'C₄H₁₁N', cls: 'Primary amine',
    theme: 'nh', tags: ['find', 'name'],
    structure: { pts: [[0, 0], [1, 0.5], [2, 0], [3, 0.5], [4, 0]],
                 bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1]], labels: { 4: 'NH₂' } },
    bands: [
      { g: 'nh_amine1', c: 3368, w: 50, d: 0.36, s: 'l', tol: [3245, 3500], t: true },
      { g: 'ch_sp3',    c: 2958, w: 32, d: 0.78, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 3290, w: 50, d: 0.32, s: 'l' },
      { g: null, c: 2930, w: 32, d: 0.72, s: 'l' },
      { g: null, c: 2860, w: 30, d: 0.60, s: 'l' },
      { g: null, c: 1612, w: 40, d: 0.34, s: 'l' },
      { g: null, c: 1070, w: 36, d: 0.34, s: 'l' },
      { g: null, c: 810, w: 70, d: 0.40, s: 'l' }
    ]
  },

  {
    id: 'nmethylbutylamine', name: 'N-Methylbutan-1-amine', formula: 'C₅H₁₃N', cls: 'Secondary amine',
    theme: 'nh', tags: ['name'],
    structure: { pts: [[0, 0], [1, 0.5], [2, 0], [3, 0.5], [4, 0]],
                 bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1]], labels: { 3: 'NH' } },
    bands: [
      { g: 'nh_amine2', c: 3295, w: 54, d: 0.26, s: 'l', tol: [3200, 3460], t: true },
      { g: 'ch_sp3',    c: 2958, w: 32, d: 0.82, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 2930, w: 32, d: 0.76, s: 'l' },
      { g: null, c: 2860, w: 30, d: 0.66, s: 'l' },
      { g: null, c: 2790, w: 30, d: 0.44, s: 'l' },
      { g: null, c: 1465, w: 28, d: 0.42, s: 'l' },
      { g: null, c: 1130, w: 36, d: 0.32, s: 'l' }
    ]
  },

  {
    id: 'butyronitrile', name: 'Butanenitrile', formula: 'C₄H₇N', cls: 'Nitrile',
    theme: 'triple', tags: ['find', 'name'],
    structure: { pts: [[0, 0], [1, 0.5], [2, 0], [3, 0], [4, 0]],
                 bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 3]], labels: { 4: 'N' } },
    bands: [
      { g: 'cn_nitrile', c: 2246, w: 18, d: 0.52, s: 'l', tol: [2180, 2320], t: true },
      { g: 'ch_sp3',     c: 2962, w: 32, d: 0.66, s: 'l', tol: [2840, 3000], t: true },
      { g: null, c: 2935, w: 32, d: 0.58, s: 'l' },
      { g: null, c: 1460, w: 28, d: 0.38, s: 'l' },
      { g: null, c: 1425, w: 26, d: 0.32, s: 'l' }
    ]
  },

  {
    id: 'nitrobenzene', name: 'Nitrobenzene', formula: 'C₆H₅NO₂', cls: 'Nitro compound',
    theme: 'other', tags: ['find', 'name'],
    structure: arene([[1.6, 0]], [[0, 6, 1]], { 6: 'NO₂' }),
    bands: [
      { g: 'no2_group', c: 1522, w: 24, d: 0.90, s: 'l', tol: [1500, 1570], t: true },
      { g: 'ch_sp2',    c: 3078, w: 24, d: 0.36, s: 'l', tol: [3000, 3140], t: true },
      { g: 'cc_arene',  c: 1608, w: 16, d: 0.48, s: 'l', tol: [1580, 1680], t: true },
      { g: null, c: 1348, w: 24, d: 0.88, s: 'l' },
      { g: null, c: 1480, w: 18, d: 0.42, s: 'l' },
      { g: null, c: 852, w: 24, d: 0.72, s: 'l' },
      { g: null, c: 705, w: 24, d: 0.76, s: 'l' }
    ]
  },

  {
    id: 'diethylether', name: 'Diethyl ether', formula: 'C₄H₁₀O', cls: 'Ether',
    theme: 'other', tags: ['name'],
    structure: { pts: [[0, 0], [1, 0.5], [2, 0], [3, 0.5], [4, 0]],
                 bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1]], labels: { 2: 'O' } },
    bands: [
      { g: 'ch_sp3',    c: 2975, w: 32, d: 0.80, s: 'l', tol: [2840, 3000], t: true },
      { g: 'co_single', c: 1122, w: 40, d: 0.90, s: 'l' },
      { g: null, c: 2930, w: 32, d: 0.66, s: 'l' },
      { g: null, c: 2870, w: 30, d: 0.60, s: 'l' },
      { g: null, c: 1450, w: 28, d: 0.44, s: 'l' },
      { g: null, c: 1380, w: 26, d: 0.40, s: 'l' }
    ]
  }
];

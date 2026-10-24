/* compounds.js — the item bank.
 *
 * Every spectrum is GENERATED from the peak tables below. The peaks listed
 * are the real ones: relative intensities are rounded and idealised, but no
 * peak is invented and no significant peak is deleted. Isotope peaks are NOT
 * listed — massspec.js computes M+1 and M+2 from the molecular formula, so
 * they cannot be entered wrong.
 *
 * Each peak is:
 *
 *   mz     nominal mass-to-charge
 *   ab     relative abundance, base peak = 100
 *   ion    id from fragments.js (omit for a peak that is only drawn)
 *   role   'mplus'   the molecular ion
 *          'key'     a scored drop target
 *          'cluster' ABOVE the reading threshold but not diagnostic — the
 *                    C3H5+/C3H7+/C4H9+ chatter every alkyl chain throws off.
 *                    Drawn, clickable, and it explains why it is not an answer.
 *          'minor'   small, below or near the threshold
 *          'mcl'     a McLafferty rearrangement peak. This package does not
 *                    teach McLafferty, but deleting a real peak would be a
 *                    lie, so it is drawn and says so when clicked.
 *   why    for a key peak, the stability argument. Used at Level 3.
 *
 * `tags` are the levels a compound may be drawn for:
 *   'loss'    Levels 1 AND 2 — name what was lost from the molecular ion.
 *             REQUIRES a visible molecular ion: you cannot subtract from a
 *             peak that is not there. Level 2 is the same task with the
 *             compound hidden behind three candidate structures.
 *   'predict' Level 3 — predict the base peak. Needs two or more competing
 *             cleavages, or there is nothing to decide.
 *
 * `theme` drives the draw, exactly as it does in the IR package: each level
 * takes one compound per theme before filling the rest freely, so a run
 * always contains an alcohol, a carbonyl, an arene, a branched chain, a
 * heteroatom compound and a halide.
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

var PENT = [[0.62, 0], [0.19, 0.59], [-0.50, 0.36], [-0.50, -0.36], [0.19, -0.59]];
var PENT_BONDS = [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 0, 1]];

function ring5(extraPts, extraBonds, labels) {
  return { pts: PENT.concat(extraPts), bonds: PENT_BONDS.concat(extraBonds), labels: labels || {} };
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

/* A quaternary or tertiary centre at index 0 with substituents around it. */
function centre(subs) {
  return { pts: [[1, 0]].concat(subs), bonds: subs.map(function (_, i) { return [0, i + 1, 1]; }) };
}

var COMPOUNDS = [

  /* ========================= carbonyls: the fragment that keeps the C=O */
  {
    id: 'acetone', name: 'Acetone', formula: 'C₃H₆O', f: 'C3H6O', cls: 'Ketone',
    theme: 'carbonyl', tags: ['loss'],
    structure: { pts: [[0, 0], [1, 0.5], [2, 0], [1, 1.5]],
                 bonds: [[0, 1, 1], [1, 2, 1], [1, 3, 2]], labels: { 3: 'O' } },
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
    id: 'butanone', name: '2-Butanone', formula: 'C₄H₈O', f: 'C4H8O', cls: 'Ketone',
    theme: 'carbonyl', tags: ['loss', 'predict'],
    structure: { pts: [[0, 0], [1, 0.5], [2, 0], [3, 0.5], [1, 1.5]],
                 bonds: link(4).concat([[1, 4, 2]]), labels: { 4: 'O' } },
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
    id: 'pentan3one', name: '3-Pentanone', formula: 'C₅H₁₀O', f: 'C5H10O', cls: 'Ketone',
    theme: 'carbonyl', tags: ['loss', 'predict'],
    structure: { pts: zig(5).concat([[2, -1]]),
                 bonds: link(5).concat([[2, 5, 2]]), labels: { 5: 'O' } },
    peaks: [
      { mz: 86, ab: 24, role: 'mplus' },
      { mz: 57, ab: 100, ion: 'c2h5co', role: 'key',
        why: 'Alpha cleavage on either side gives the same C=O fragment, because the molecule is symmetrical. Two routes to one well-propped-up fragment makes it overwhelming.' },
      { mz: 29, ab: 56, ion: 'c2h5', role: 'key',
        why: 'The ethyl cation left behind when the charge stays on the alkyl side instead. Primary, so it loses the competition — but there are two ethyls to make it, which is why it is still tall.' },
      { mz: 27, ab: 30, role: 'cluster' },
      { mz: 28, ab: 9, role: 'minor' }
    ]
  },
  {
    id: 'pentan2one', name: '2-Pentanone', formula: 'C₅H₁₀O', f: 'C5H10O', cls: 'Ketone',
    theme: 'carbonyl', tags: ['loss', 'predict'],
    structure: { pts: zig(5).concat([[1, 1.5]]),
                 bonds: link(5).concat([[1, 5, 2]]), labels: { 5: 'O' } },
    peaks: [
      { mz: 86, ab: 25, role: 'mplus' },
      { mz: 71, ab: 8, ion: 'c3h7co', role: 'key',
        why: 'Alpha cleavage losing the METHYL. It works, but dropping the propyl instead gives a better radical, so this is the minor of the two routes.' },
      { mz: 58, ab: 20, role: 'mcl' },
      { mz: 43, ab: 100, ion: 'ch3co', role: 'key',
        why: 'Alpha cleavage losing the PROPYL — the bigger, easier piece to break off — leaving CH₃C≡O⁺. The C=O carries the charge, and that wins again.' },
      { mz: 41, ab: 12, role: 'cluster' },
      { mz: 27, ab: 15, role: 'cluster' }
    ]
  },
  {
    id: 'acetophenone', name: 'Acetophenone', formula: 'C₈H₈O', f: 'C8H8O', cls: 'Aryl ketone',
    theme: 'carbonyl', tags: ['loss', 'predict'],
    structure: arene([[1.62, 0], [2.12, 0.87], [2.62, 0]],
                     [[0, 6, 1], [6, 7, 2], [6, 8, 1]], { 7: 'O' }),
    peaks: [
      { mz: 120, ab: 30, role: 'mplus' },
      { mz: 105, ab: 100, ion: 'phco', role: 'key',
        why: 'Alpha cleavage drops the methyl and leaves a fragment holding BOTH a C=O and a benzene ring. Two things spreading the charge over one fragment — nothing in this spectrum can compete.' },
      { mz: 77, ab: 85, ion: 'ph', role: 'key',
        why: 'The benzoyl then loses carbon monoxide to give the phenyl cation. A second-generation fragment, but so characteristic that 105 with 77 underneath it is the signature of a phenyl ketone.' },
      { mz: 51, ab: 30, ion: 'c4h3', role: 'cluster' },
      { mz: 43, ab: 8, ion: 'ch3co', role: 'minor' },
      { mz: 50, ab: 15, role: 'minor' }
    ]
  },
  {
    id: 'benzaldehyde', name: 'Benzaldehyde', formula: 'C₇H₆O', f: 'C7H6O', cls: 'Aromatic aldehyde',
    /* No 'predict': benzaldehyde's base peak is the molecular ion itself, so
       there is no winning cleavage to pick. That is its own lesson, taught at
       Levels 1 and 2 instead. */
    theme: 'carbonyl', tags: ['loss'],
    structure: arene([[1.62, 0], [2.12, 0.87]], [[0, 6, 1], [6, 7, 2]], { 7: 'O' }),
    peaks: [
      { mz: 106, ab: 100, role: 'mplus' },
      { mz: 105, ab: 95, ion: 'phco', role: 'key',
        why: 'Losing just the aldehyde HYDROGEN leaves a benzoyl cation. M−1 nearly as tall as M⁺ is the giveaway for an aldehyde on a ring.' },
      { mz: 77, ab: 85, ion: 'ph', role: 'key',
        why: 'Losing the whole CHO group gives the phenyl cation. This is the −29 that is NOT an ethyl: there is no ethyl group anywhere in benzaldehyde.' },
      { mz: 51, ab: 30, ion: 'c4h3', role: 'cluster' },
      /* The formyl cation itself. Not a drop target — it is too small, and
         106 − 29 is 77, which is not a loss the table knows. But it is the
         concrete answer to "which 29 is this?", so clicking it says so. */
      { mz: 29, ab: 10, ion: 'cho', role: 'cluster' },
      { mz: 50, ab: 15, role: 'minor' },
      { mz: 78, ab: 10, role: 'minor' }
    ]
  },
  {
    id: 'methylacetate', name: 'Methyl acetate', formula: 'C₃H₆O₂', f: 'C3H6O2', cls: 'Ester',
    theme: 'carbonyl', tags: ['loss', 'predict'],
    structure: { pts: [[0, 0], [1, 0.5], [1, 1.5], [2, 0], [3, 0.5]],
                 bonds: [[0, 1, 1], [1, 2, 2], [1, 3, 1], [3, 4, 1]], labels: { 2: 'O', 3: 'O' } },
    peaks: [
      { mz: 74, ab: 25, role: 'mplus' },
      { mz: 59, ab: 25, ion: 'acetoxy', role: 'key',
        why: 'Breaking the O–CH₃ bond. It happens, but it leaves the charge on a much poorer cation than the other route does.' },
      { mz: 43, ab: 100, ion: 'ch3co', role: 'key',
        why: 'Breaking the C–O bond on the other side of the carbonyl leaves CH₃C≡O⁺. Every acetate ester does this, which is why m/z 43 is the first thing to look for in one.' },
      { mz: 42, ab: 12, role: 'cluster' },
      { mz: 15, ab: 20, ion: 'ch3', role: 'minor' }
    ]
  },

  /* ============================== alcohols: alpha cleavage and dehydration */
  {
    id: 'butan1ol', name: '1-Butanol', formula: 'C₄H₁₀O', f: 'C4H10O', cls: 'Primary alcohol',
    theme: 'alcohol', tags: ['predict'],
    structure: { pts: zig(4).concat([[4, 0]]), bonds: link(5), labels: { 4: 'OH' } },
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
    theme: 'alcohol', tags: ['predict'],
    structure: { pts: zig(4).concat([[1, 1.5]]),
                 bonds: link(4).concat([[1, 4, 1]]), labels: { 4: 'OH' } },
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
    theme: 'alcohol', tags: ['predict'],
    structure: { pts: [[1, 0], [0, 0.5], [2, 0.5], [1, -1], [1, 1]],
                 bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]], labels: { 4: 'OH' } },
    peaks: [
      { mz: 59, ab: 100, ion: 'me2coh', role: 'key',
        why: 'Alpha cleavage losing one of the three methyls. What is left keeps the oxygen AND has two methyls propping up the charge — so stable that the molecular ion at 74 never survives long enough to be seen at all.' },
      { mz: 57, ab: 6, ion: 'c4h9', role: 'key',
        why: 'Losing the whole OH, −17, leaves a tert-butyl cation — an excellent carbocation in its own right. It still loses badly to the other route, because keeping the oxygen beats even a tertiary carbon. That comparison is the point of this one.' },
      { mz: 43, ab: 20, ion: 'c3h7', role: 'cluster' },
      { mz: 41, ab: 25, ion: 'c3h5', role: 'cluster' },
      { mz: 31, ab: 25, ion: 'ch2oh', role: 'cluster',
        note: 'Real, but it takes a hydrogen shift to get there, not a clean α-cleavage. m/z 31 only tells you PRIMARY ALCOHOL when it is the base peak — here it is a minor route and the tall peak is the one that identifies this compound.' },
      { mz: 29, ab: 12, role: 'cluster' }
    ]
  },
  {
    id: 'mbutan2ol', name: '2-Methyl-2-butanol', formula: 'C₅H₁₂O', f: 'C5H12O', cls: 'Tertiary alcohol',
    theme: 'alcohol', tags: ['predict'],
    structure: { pts: [[1, 0], [0, 0.5], [1, -1], [1, 1], [2, 0.5], [3, 0]],
                 bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [4, 5, 1]], labels: { 3: 'OH' } },
    peaks: [
      { mz: 73, ab: 15, ion: 'etmecoh', role: 'key',
        why: 'Alpha cleavage losing a METHYL. Perfectly good chemistry, but a methyl radical is the least stable radical on offer, so this route runs second.' },
      { mz: 70, ab: 10, ion: 'dehydr', role: 'key',
        why: 'Dehydration, −18. Tertiary alcohols dehydrate readily — and since the molecular ion at 88 is gone, this is close to the highest peak you can see.' },
      { mz: 59, ab: 100, ion: 'me2coh', role: 'key',
        why: 'Alpha cleavage losing the ETHYL. The same fragment tert-butanol makes, and reached by breaking off the bigger group — which is exactly why this beats the 73. Comparing these two peaks IS the lesson.' },
      { mz: 55, ab: 20, ion: 'c4h7', role: 'cluster' },
      { mz: 43, ab: 15, ion: 'c3h7', role: 'cluster' },
      { mz: 41, ab: 18, ion: 'c3h5', role: 'cluster' }
    ]
  },
  {
    id: 'cyclohexanol', name: 'Cyclohexanol', formula: 'C₆H₁₂O', f: 'C6H12O', cls: 'Secondary alcohol',
    theme: 'alcohol', tags: ['loss'],
    structure: ring6([[1.62, 0]], [[0, 6, 1]], { 6: 'OH' }),
    peaks: [
      { mz: 100, ab: 10, role: 'mplus' },
      { mz: 82, ab: 50, ion: 'dehydr', role: 'key',
        why: 'Dehydration, −18. A ring cannot cleave alpha and fly apart the way a chain can, so losing water is the dominant escape and M−18 is enormous.' },
      { mz: 67, ab: 30, role: 'cluster' },
      { mz: 57, ab: 100, role: 'cluster' },
      { mz: 44, ab: 45, role: 'cluster' },
      { mz: 41, ab: 40, ion: 'c3h5', role: 'cluster' }
    ]
  },
  {
    id: 'cyclopentanol', name: 'Cyclopentanol', formula: 'C₅H₁₀O', f: 'C5H10O', cls: 'Secondary alcohol',
    theme: 'alcohol', tags: ['loss'],
    structure: ring5([[1.62, 0]], [[0, 5, 1]], { 5: 'OH' }),
    peaks: [
      { mz: 86, ab: 20, role: 'mplus' },
      { mz: 68, ab: 35, ion: 'dehydr', role: 'key',
        why: 'Dehydration, −18. A ring cannot break in half and fly apart the way a chain can, so throwing off water is the easiest way out and M−18 is prominent.' },
      { mz: 57, ab: 100, role: 'cluster' },
      { mz: 44, ab: 30, role: 'cluster' },
      { mz: 41, ab: 35, ion: 'c3h5', role: 'cluster' },
      { mz: 39, ab: 15, role: 'cluster' }
    ]
  },
  {
    id: 'phenylethanol', name: '1-Phenylethanol', formula: 'C₈H₁₀O', f: 'C8H10O', cls: 'Benzylic alcohol',
    theme: 'alcohol', tags: ['loss', 'predict'],
    structure: arene([[1.62, 0], [2.12, 0.87], [2.62, 0]],
                     [[0, 6, 1], [6, 7, 1], [6, 8, 1]], { 7: 'OH' }),
    peaks: [
      { mz: 122, ab: 25, role: 'mplus' },
      { mz: 107, ab: 100, ion: 'phchoh', role: 'key',
        why: 'Alpha cleavage losing the methyl. The cation gets oxygen resonance AND the benzene ring — the best-stabilised ion in the spectrum by a distance.' },
      { mz: 104, ab: 12, ion: 'dehydr', role: 'key',
        why: 'Dehydration, −18. Small here: the alpha cleavage route is so much better that water loss barely gets a look in.' },
      { mz: 79, ab: 75, role: 'cluster' },
      { mz: 77, ab: 50, ion: 'ph', role: 'key',
        why: 'The phenyl cation. m/z 77 under a taller peak 28 mass units above it is the standard sign of a monosubstituted ring.' },
      { mz: 51, ab: 20, ion: 'c4h3', role: 'cluster' },
      { mz: 43, ab: 30, role: 'cluster' }
    ]
  },

  /* ================================ arenes: breaking next to the ring, m/z 91 */
  {
    id: 'toluene', name: 'Toluene', formula: 'C₇H₈', f: 'C7H8', cls: 'Alkylbenzene',
    theme: 'arene', tags: ['loss'],
    structure: arene([[1.62, 0]], [[0, 6, 1]]),
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
    id: 'ethylbenzene', name: 'Ethylbenzene', formula: 'C₈H₁₀', f: 'C8H10', cls: 'Alkylbenzene',
    theme: 'arene', tags: ['loss'],
    structure: arene([[1.62, 0], [2.24, 0.4]], [[0, 6, 1], [6, 7, 1]]),
    peaks: [
      { mz: 106, ab: 25, role: 'mplus' },
      { mz: 91, ab: 100, ion: 'c7h7', role: 'key',
        why: 'The bond one carbon out from the ring breaks, the methyl leaves, and the ring takes the charge. This is the −15 to expect from any ethylbenzene.' },
      { mz: 65, ab: 12, ion: 'c5h5', role: 'cluster' },
      { mz: 51, ab: 10, role: 'cluster' },
      { mz: 39, ab: 10, role: 'cluster' },
      { mz: 77, ab: 5, ion: 'ph', role: 'minor' }
    ]
  },
  {
    id: 'propylbenzene', name: 'Propylbenzene', formula: 'C₉H₁₂', f: 'C9H12', cls: 'Alkylbenzene',
    theme: 'arene', tags: ['loss'],
    structure: arene([[1.62, 0], [2.24, 0.4], [2.86, 0]], [[0, 6, 1], [6, 7, 1], [7, 8, 1]]),
    peaks: [
      { mz: 120, ab: 25, role: 'mplus' },
      { mz: 91, ab: 100, ion: 'c7h7', role: 'key',
        why: 'The same break next to the ring — but here the group that leaves is an ethyl, so this is a −29 rather than a −15. The fragment is the same C₇H₇⁺; only the arithmetic changes.' },
      { mz: 92, ab: 9, role: 'minor' },
      { mz: 65, ab: 12, ion: 'c5h5', role: 'cluster' },
      { mz: 39, ab: 10, role: 'cluster' },
      { mz: 51, ab: 6, role: 'minor' }
    ]
  },
  {
    id: 'cumene', name: 'Isopropylbenzene (cumene)', formula: 'C₉H₁₂', f: 'C9H12', cls: 'Alkylbenzene',
    theme: 'arene', tags: ['loss', 'predict'],
    structure: arene([[1.62, 0], [2.42, 0.5], [2.42, -0.5]], [[0, 6, 1], [6, 7, 1], [6, 8, 1]]),
    peaks: [
      { mz: 120, ab: 25, role: 'mplus' },
      { mz: 105, ab: 100, ion: 'phchch3', role: 'key',
        why: 'Benzylic cleavage losing a methyl. The cation left behind is benzylic AND secondary — the ring and the remaining methyl both feed it — so it beats the alternative easily.' },
      { mz: 79, ab: 15, role: 'cluster' },
      { mz: 77, ab: 20, ion: 'ph', role: 'key',
        why: 'Losing the whole isopropyl group, a −43, gives the phenyl cation. It happens, but the phenyl cation is poorly stabilised, so the benzylic route wins.' },
      { mz: 51, ab: 12, ion: 'c4h3', role: 'cluster' },
      { mz: 103, ab: 10, role: 'minor' }
    ]
  },
  {
    id: 'butylbenzene', name: 'Butylbenzene', formula: 'C₁₀H₁₄', f: 'C10H14', cls: 'Alkylbenzene',
    theme: 'arene', tags: ['loss'],
    structure: arene([[1.62, 0], [2.24, 0.4], [2.86, 0], [3.48, 0.4]],
                     [[0, 6, 1], [6, 7, 1], [7, 8, 1], [8, 9, 1]]),
    peaks: [
      { mz: 134, ab: 25, role: 'mplus' },
      { mz: 92, ab: 35, role: 'mcl' },
      { mz: 91, ab: 100, ion: 'c7h7', role: 'key',
        why: 'The same break next to the ring, losing a propyl — a −43 this time. However long the chain gets, the ring takes the charge and you land at m/z 91.' },
      { mz: 65, ab: 12, ion: 'c5h5', role: 'cluster' },
      { mz: 51, ab: 8, role: 'cluster' },
      { mz: 39, ab: 8, role: 'cluster' }
    ]
  },

  /* ================================= branched chains: tertiary carbocations */
  {
    id: 'hexane', name: 'Hexane', formula: 'C₆H₁₄', f: 'C6H14', cls: 'Straight-chain alkane',
    theme: 'branch', tags: ['loss'],
    structure: { pts: zig(6), bonds: link(6), labels: {} },
    peaks: [
      { mz: 86, ab: 12, role: 'mplus' },
      { mz: 57, ab: 45, ion: 'c4h9', role: 'key',
        why: 'A butyl cation from breaking the chain — but this butyl is PRIMARY, not tertiary, so it has nothing special going for it.' },
      { mz: 43, ab: 100, ion: 'c3h7', role: 'key',
        why: 'Breaking the middle of the chain. With no branch point anywhere, every C–C bond is about as good as every other, so the spectrum is a smooth run of clusters rather than one dominant peak. That evenness IS the evidence for a straight chain.' },
      { mz: 41, ab: 40, ion: 'c3h5', role: 'cluster' },
      { mz: 29, ab: 35, ion: 'c2h5', role: 'cluster' },
      { mz: 27, ab: 30, role: 'cluster' },
      { mz: 71, ab: 10, role: 'cluster' }
    ]
  },
  {
    id: 'methylpentane', name: '3-Methylpentane', formula: 'C₆H₁₄', f: 'C6H14', cls: 'Branched alkane',
    theme: 'branch', tags: ['loss'],
    structure: { pts: [[0, 0], [1, 0.5], [2, 0], [3, 0.5], [4, 0], [2, -1]],
                 bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [2, 5, 1]], labels: {} },
    peaks: [
      { mz: 86, ab: 12, role: 'mplus' },
      { mz: 71, ab: 15, role: 'cluster' },
      { mz: 57, ab: 100, ion: 'c4h9s', role: 'key',
        why: 'Losing an ethyl, −29, leaves the charge on the branched carbon — a SECONDARY cation. Compare it with the same m/z 57 from a compound with a quaternary carbon: there it is a tert-butyl and the molecular ion vanishes, here the molecular ion survives at 12%. One branch is not the same as two.' },
      { mz: 56, ab: 35, role: 'cluster' },
      { mz: 43, ab: 25, ion: 'c3h7', role: 'cluster' },
      { mz: 41, ab: 35, ion: 'c3h5', role: 'cluster' },
      { mz: 29, ab: 25, role: 'cluster' },
      { mz: 27, ab: 30, role: 'cluster' }
    ]
  },
  {
    id: 'dimethylbutane', name: '2,2-Dimethylbutane', formula: 'C₆H₁₄', f: 'C6H14', cls: 'Branched alkane',
    theme: 'branch', tags: ['predict'],
    structure: { pts: [[1, 0], [0, 0.5], [1, -1], [1, 1], [2, 0.5], [3, 0]],
                 bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [4, 5, 1]], labels: {} },
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
    id: 'methylbutane', name: '2-Methylbutane', formula: 'C₅H₁₂', f: 'C5H12', cls: 'Branched alkane',
    theme: 'branch', tags: ['loss'],
    structure: { pts: [[0, 0], [1, 0.5], [2, 0], [3, 0.5], [1, 1.5]],
                 bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [1, 4, 1]], labels: {} },
    peaks: [
      { mz: 72, ab: 10, role: 'mplus' },
      { mz: 57, ab: 35, ion: 'c4h9s', role: 'key',
        why: 'Losing a methyl, −15, leaves a four-carbon cation — but a SECONDARY one, because this molecule has a branch and no quaternary carbon. Compare it with the m/z 57 of a compound that does have one: same mass, very different height.' },
      { mz: 43, ab: 100, ion: 'c3h7', role: 'key',
        why: 'Losing an ethyl, −29, leaves the cation sitting on the branched carbon. Breaking off the bigger group is easier, so this is the taller of the two.' },
      { mz: 42, ab: 55, role: 'cluster' },
      { mz: 41, ab: 35, ion: 'c3h5', role: 'cluster' },
      { mz: 29, ab: 30, role: 'cluster' },
      { mz: 27, ab: 35, role: 'cluster' }
    ]
  },
  {
    id: 'isooctane', name: '2,2,4-Trimethylpentane', formula: 'C₈H₁₈', f: 'C8H18', cls: 'Branched alkane',
    theme: 'branch', tags: ['predict'],
    structure: { pts: [[1, 0], [0, 0.5], [1, -1], [1, 1], [2, 0.5], [3, 0], [4, 0.5], [3, -1]],
                 bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [4, 5, 1], [5, 6, 1], [5, 7, 1]],
                 labels: {} },
    peaks: [
      { mz: 99, ab: 8, ion: 'c7h15', role: 'key',
        why: 'Losing one methyl, −15. It leaves a tertiary cation and it is the only route that keeps most of the molecule intact — which is why it is the highest peak you can see at all.' },
      { mz: 57, ab: 100, ion: 'c4h9', role: 'key',
        why: 'The bond between the quaternary carbon and the rest snaps, handing back a tert-butyl cation. The molecular ion at 114 is invisible — isooctane falls apart at that branch point essentially on contact.' },
      { mz: 43, ab: 35, ion: 'c3h7', role: 'cluster' },
      { mz: 41, ab: 45, ion: 'c3h5', role: 'cluster' },
      { mz: 29, ab: 20, role: 'cluster' },
      { mz: 56, ab: 25, role: 'cluster' }
    ]
  },

  /* ============================== heteroatoms: amines and ethers, alpha again */
  {
    id: 'propylamine', name: '1-Propanamine', formula: 'C₃H₉N', f: 'C3H9N', cls: 'Primary amine',
    theme: 'hetero', tags: ['loss'],
    structure: { pts: zig(3).concat([[3, 0.5]]), bonds: link(4), labels: { 3: 'NH₂' } },
    peaks: [
      { mz: 59, ab: 20, role: 'mplus' },
      { mz: 30, ab: 100, ion: 'ch2nh2', role: 'key',
        why: 'Alpha cleavage at the nitrogen. Nitrogen holds a positive charge even more willingly than oxygen does, so m/z 30 swamps everything. Note the ODD molecular ion — that is the nitrogen rule.' },
      { mz: 28, ab: 25, role: 'cluster' },
      { mz: 41, ab: 10, role: 'cluster' },
      { mz: 44, ab: 8, role: 'minor' },
      { mz: 27, ab: 15, role: 'cluster' }
    ]
  },
  {
    id: 'diethylamine', name: 'Diethylamine', formula: 'C₄H₁₁N', f: 'C4H11N', cls: 'Secondary amine',
    theme: 'hetero', tags: ['loss'],
    structure: { pts: zig(5), bonds: link(5), labels: { 2: 'NH' } },
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
    id: 'diethylether', name: 'Diethyl ether', formula: 'C₄H₁₀O', f: 'C4H10O', cls: 'Ether',
    /* No 'predict': only one route here is a clean α-cleavage. The other tall
       peaks need a hydrogen shift, so there is no fair pair to weigh. */
    theme: 'hetero', tags: ['loss'],
    structure: { pts: zig(5), bonds: link(5), labels: { 2: 'O' } },
    peaks: [
      { mz: 74, ab: 30, role: 'mplus' },
      { mz: 59, ab: 100, ion: 'etoch2', role: 'key',
        why: 'Alpha cleavage next to the ether oxygen: a methyl leaves and the lone pair stabilises what remains. An ether does exactly what an alcohol does — the oxygen is doing the same job.' },
      { mz: 45, ab: 40, ion: 'ch3choh', role: 'cluster',
        note: 'Oxygen-stabilised and quite tall — but reaching it means breaking the C–O bond AND shifting a hydrogen, which is not the clean α-cleavage this level is about. The peak above it is.' },
      { mz: 31, ab: 25, ion: 'ch2oh', role: 'cluster',
        note: 'An ether can make this too, by a longer route. It is not the α-cleavage peak — that one is higher up and much taller.' },
      { mz: 29, ab: 30, ion: 'c2h5', role: 'cluster' },
      { mz: 27, ab: 15, role: 'cluster' }
    ]
  },
  {
    id: 'mtbe', name: 'tert-Butyl methyl ether (MTBE)', formula: 'C₅H₁₂O', f: 'C5H12O', cls: 'Ether',
    theme: 'hetero', tags: ['predict'],
    structure: { pts: [[1, 0], [0, 0.5], [1, -1], [1, 1], [2, 0.5], [3, 0]],
                 bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [4, 5, 1]], labels: { 4: 'O' } },
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

  /* ============================================= halides: isotope patterns */
  {
    id: 'bromopropane', name: '1-Bromopropane', formula: 'C₃H₇Br', f: 'C3H7Br', cls: 'Alkyl bromide',
    theme: 'halide', tags: ['loss'], isotopeTarget: true,
    structure: { pts: zig(3).concat([[3, 0.5]]), bonds: link(4), labels: { 3: 'Br' } },
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
    theme: 'halide', tags: ['loss'], isotopeTarget: true,
    structure: { pts: zig(4).concat([[4, 0]]), bonds: link(5), labels: { 4: 'Cl' } },
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
    theme: 'halide', tags: ['loss'], isotopeTarget: true,
    structure: arene([[1.62, 0]], [[0, 6, 1]], { 6: 'Br' }),
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
    theme: 'halide', tags: ['loss'], isotopeTarget: true,
    structure: arene([[1.62, 0]], [[0, 6, 1]], { 6: 'Cl' }),
    peaks: [
      { mz: 112, ab: 100, role: 'mplus' },
      { mz: 77, ab: 55, ion: 'ph', role: 'key',
        why: 'Losing the chlorine atom, −35, gives the phenyl cation. The ring holds the molecular ion together so well that M⁺ itself stays the base peak — aromatic rings usually do this.' },
      { mz: 51, ab: 25, ion: 'c4h3', role: 'cluster' },
      { mz: 50, ab: 15, role: 'cluster' },
      { mz: 75, ab: 8, role: 'minor' }
    ]
  }
];

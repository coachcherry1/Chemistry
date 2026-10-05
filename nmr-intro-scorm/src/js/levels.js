/* levels.js — the five levels: what each asks, how many compounds it draws,
 * what every run of it must include, and the short lesson shown before it.
 *
 * `items` is the number of compounds a level draws. Shorten the activity by
 * lowering it; tools/validate.js checks each level's pool can still fill it.
 *
 * `needs` are filled first - one compound each, unless an earlier pick already
 * covers it - so every run of a level teaches the same things. The places
 * left over are a free draw that prefers a family not yet used. Which compound
 * fills each place still varies, so a retry is a different set.
 *
 * `includes` says the same thing in words, for the answer key - keep the two
 * in step. `ref` names the reference-panel sections shown with the level
 * (built in game.js); `lesson` and `how` are the screen shown before it starts.
 */

function ofKind(k) { return function (m) { return m.kind === k; }; }
function hasRegion() {
  var list = Array.prototype.slice.call(arguments);
  return function (m) {
    return Chem.sets(m).some(function (s) { return list.indexOf(s.r) >= 0; });
  };
}
function hasSet(test) { return function (m) { return Chem.sets(m).some(test); }; }
function needsScaling(m) {
  var sets = Chem.sets(m);
  var min = Math.min.apply(null, sets.map(function (s) { return s.nH; }));
  return sets.some(function (s) { return s.nH % min !== 0; });
}

var LEVELS = [
  { n: 1, key: 'equiv', name: 'Equivalent H', items: 5,
    refTitle: 'Equivalent hydrogens — the tests', ref: ['equiv'],
    needs: [ofKind('sym'), ofKind('branch'), ofKind('ring'), ofKind('trap')],
    includes: 'a symmetric molecule, a branched one, a ring, and two look-alike groups that are not equivalent',
    blurb: 'Colour equivalent groups alike. Each set of equivalent hydrogens gives one signal.',
    lesson: [
      'Hydrogens in the same environment are chemically equivalent, and each set of ' +
      'equivalent hydrogens produces one signal. Count the sets and you have counted the signals.',
      'Two groups are equivalent when the molecule’s symmetry swaps them — a mirror ' +
      'plane, or a rotation. The three H on a CH₃ are always equivalent, because the group spins freely.',
      'Watch for look-alikes. In methyl acetate both groups are CH₃, but one is bonded to ' +
      'the C=O and the other to an O. Different neighbours, different environments: two signals.'
    ],
    how: 'Pick a colour, then click every group that belongs with it. Use a new colour for ' +
         'each set, then press Check.' },

  { n: 2, key: 'shift', name: 'Chemical shift', items: 5,
    refTitle: 'Chemical shift table', ref: ['shift'],
    needs: [hasRegion('oxygen'), hasRegion('carbonyl'),
            hasRegion('aromatic', 'vinyl', 'aldehyde', 'acid'), hasRegion('halide')],
    includes: 'a C–H on a carbon bonded to O, a C–H next to C=O, a far-downfield signal (aromatic, alkene, aldehyde or acid), and a C–H on a carbon bonded to Br',
    blurb: 'The compound is drawn and its hydrogens are lettered. Drag each letter onto its signal.',
    lesson: [
      'Where a signal sits is its chemical shift, δ, measured in ppm from the reference ' +
      'compound TMS at 0.',
      'Electronegative atoms (O, Cl, Br) and C=O groups pull electron density away from ' +
      'nearby hydrogens. Less shielded, those H appear further left — downfield, at larger δ.',
      'The pull fades with distance: an H one carbon further away is barely moved. The shift ' +
      'table is in the reference panel under the spectrum.'
    ],
    how: 'Each set of hydrogens is lettered on the structure. Drag each letter onto the signal ' +
         'it produces.' },

  { n: 3, key: 'integ', name: 'Integration', items: 4,
    refTitle: 'Using integrals', ref: ['integ'],
    needs: [needsScaling, hasSet(function (s) { return s.nH >= 6; }),
            function (m) { return Chem.sets(m).length >= 3; }],
    includes: 'a ratio with halves to scale up, a set of 6 H or more, and three or more signals',
    blurb: 'The compound is hidden. Use the integrals and the formula to count the H in each signal.',
    lesson: [
      'The area under a signal — its integral — is proportional to the number of ' +
      'hydrogens that produce it.',
      'Integrals give a ratio, not a count. Divide each by the smallest, then scale so the ' +
      'total matches the number of H in the molecular formula.',
      'Example: integrals of 1.50 : 1.00 : 1.50 add up to 4. If the formula has 8 H, each 1.00 ' +
      'is worth 2 H — so the signals are 3H, 2H and 3H.'
    ],
    how: 'The compound is hidden. Drag the right number of hydrogens onto each signal.' },

  { n: 4, key: 'split', name: 'Splitting', items: 5,
    refTitle: 'Splitting — the n + 1 rule', ref: ['split'],
    needs: [hasSet(function (s) { return s.n >= 5; }), hasSet(function (s) { return s.oh; }),
            hasSet(function (s) { return !s.oh && s.n === 0; }),
            hasSet(function (s) { return s.n === 3; })],
    includes: 'a sextet or septet, an O–H, a singlet from a group with no neighbouring H, and a quartet',
    blurb: 'Predict each set’s splitting with the n + 1 rule, then check it against the spectrum.',
    lesson: [
      'A signal is split by the hydrogens on neighbouring atoms. With n neighbouring H it ' +
      'splits into n + 1 lines — the n + 1 rule.',
      'In CH₃–CH₂–, the CH₃ has 2 neighbouring H, so it is a triplet; ' +
      'the CH₂ has 3, so it is a quartet.',
      'Equivalent hydrogens do not split each other, and an O–H usually appears as a ' +
      'singlet that does not split its neighbours either.'
    ],
    how: 'Drag a splitting pattern onto each set of hydrogens. Once every set has one, the ' +
         'spectrum appears so you can check your predictions.' },

  { n: 5, key: 'solve', name: 'Solve it', items: 4,
    refTitle: 'Shift table and splitting patterns', ref: ['shift', 'split'], needs: [],
    includes: 'a free draw, preferring a compound family not yet used',
    blurb: 'Shift, integration and splitting together: identify the compound.',
    lesson: [
      'Now read everything at once: how many signals there are, where they sit, how many H ' +
      'each holds and how each is split.',
      'Every option offered fits part of the evidence. Look for the one signal that rules ' +
      'each wrong structure out.'
    ],
    how: 'The number of hydrogens is printed under each signal. Pick the compound that ' +
         'produced the spectrum.' }
];

/* fragments.js — the label vocabulary.
 *
 * A peak in an EI mass spectrum can be named two ways, and this activity
 * teaches them in that order:
 *
 * Both labelling levels work in the LOSS view — "that peak is M minus 43" —
 * because that is how the chemistry is taught: fragments lost from the
 * molecular ion. The FRAGMENT view ("that 43 is CH3CO+") is recognition
 * material only: it shows up in the reference table, in the Level 3 cards and
 * in feedback, but no student is asked to produce one.
 *
 * The loss is arithmetic: M - m/z. The ion is chemistry. They are not the
 * same question, and the gap between them is where the teaching happens -
 * CH3CO+ sits at m/z 43 in BOTH acetone and 2-butanone, but it is a loss of
 * 15 from one and a loss of 29 from the other.
 *
 * So a loss key is COMPUTED per molecule (see lossKey below) rather than
 * stored on the ion. Only the ion id lives in the bank.
 *
 * MECHANISMS. Four, and no more - this package deliberately does not teach
 * the McLafferty rearrangement. Compounds that really show one keep the peak
 * (it would be a lie to delete it) but it is drawn as `mcl` and can never be
 * scored; clicking it says so.
 *
 *   alpha       a bond next to a heteroatom breaks, and the lone pair left
 *               behind stabilises the cation by resonance. The single most
 *               productive idea in the whole unit.
 *   dehydr      an alcohol loses water, -18
 *   branch      the bond at the most substituted carbon breaks, because the
 *               carbocation left behind is 3 > 2 > 1 > methyl
 *   benzylic    a bond one carbon from a ring breaks; the cation delocalises
 *               into the ring, giving the m/z 91 fragment
 *   sigma       a plain C-C break with nothing special stabilising it
 */

/* ---------------------------------------------------------------- losses */

/* `also` names the second neutral that fits the same arithmetic. -29 and -43
   are the two that matter: they are why Level 1 is not the whole story. */
var LOSSES = {
  1:  { neutral: '•H',      hint: 'Loss of a single hydrogen atom. Small, but when M−1 is TALLER than M⁺ it means the fragment left behind is unusually stable — C₇H₇⁺ from toluene, the ring-plus-C=O fragment from benzaldehyde.' },
  15: { neutral: '•CH₃', hint: 'Loss of a methyl radical. Look for a methyl sitting on a branch point or right next to a C=O — those are the two places a methyl leaves from.' },
  17: { neutral: '•OH',     hint: 'Loss of a hydroxyl radical. An alcohol or an acid. Usually much weaker than the −18 next to it.' },
  18: { neutral: 'H₂O',     hint: 'Loss of water — dehydration. This is an alcohol. M⁺ and M−18 together are the signature; in a tertiary alcohol the M⁺ may be gone entirely and only the −18 survives.' },
  29: { neutral: '•C₂H₅', also: '•CHO',
        hint: 'Loss of 29 is AMBIGUOUS: an ethyl radical, or a formyl radical from an aldehyde. Decide it from the rest of the spectrum — an aldehyde also shows M−1, an ethyl group usually shows m/z 29 itself.' },
  31: { neutral: '•OCH₃', also: '•CH₂OH',
        hint: 'Loss of 31 is a methoxy radical from a methyl ester or ether — or a •CH₂OH from a primary alcohol. Both weigh 31, both are CH₃O.' },
  35: { neutral: '•Cl',     hint: 'Loss of a chlorine atom. Check the M/M+2 pair first: if it was 3:1 there was a Cl to lose.' },
  36: { neutral: 'HCl',     hint: 'Loss of hydrogen chloride from an alkyl chloride — the chlorine takes a neighbouring hydrogen with it.' },
  43: { neutral: '•C₃H₇', also: 'CH₃CO•',
        hint: 'Loss of 43 is AMBIGUOUS: a propyl radical, or an acetyl radical from a methyl ketone. Decide it from the rest of the spectrum — a methyl ketone normally shows a strong m/z 43 of its own.' },
  45: { neutral: '•OC₂H₅', hint: 'Loss of an ethoxy radical — an ethyl ester or an ethyl ether.' },
  57: { neutral: '•C₄H₉', also: '•COC₂H₅',
        hint: 'Loss of 57 runs the same trap as −29 and −43: a butyl radical, usually tert-butyl leaving a branch point, or an acyl radical from a ketone. Same question, bigger numbers.' },
  79: { neutral: '•Br',     hint: 'Loss of a bromine atom. Check the M/M+2 pair first: if it was 1:1 there was a Br to lose.' }
};

/* Landmarks are not losses and not ordinary ions. They answer to the same key
   at every level, because "which peak is the molecular ion" is the same
   question however far into the unit you are. */
var LANDMARKS = {
  mplus: {
    label: 'M⁺·  molecular ion', sub: 'the intact molecule',
    hint: 'The molecular ion — the whole molecule with one electron knocked off. It is the rightmost real peak, ignoring the isotope peaks just past it. Its mass is the compound’s molecular weight.'
  },
  miso1: {
    label: 'M+1', sub: '¹³C isotope',
    hint: 'The M+1 peak is one ¹³C in place of a ¹²C. Its height is about 1.1% of M⁺ for every carbon in the molecule, so M+1 ÷ M ÷ 1.1% COUNTS THE CARBONS.'
  },
  miso2: {
    label: 'M+2', sub: 'heavy halogen isotope',
    hint: 'An M+2 peak this big is a halogen. About a THIRD the height of M⁺ means chlorine (³⁵Cl : ³⁷Cl is 3:1). About EQUAL to M⁺ means bromine (⁷⁹Br : ⁸¹Br is 1:1).'
  }
};

/* -------------------------------------------------------------- fragments
 *
 * Fragments are named by their FORMULA and by what they kept — "keeps the
 * C=O", "alkyl fragment" — not by ion class. Students are not asked to
 * memorise the words acylium, oxocarbenium, iminium or tropylium; they are
 * asked to recognise a fragment and say why it was stable enough to survive.
 *
 * `f`    the ion's own formula, so tools/validate.js can check the arithmetic
 * `lost`  for an ion whose mass depends on the molecule, the NEUTRAL formula
 *         it corresponds to instead ('X' and 'HX' stand for a halogen)
 * `mz`   nominal m/z; null for an ion whose mass depends on the molecule
 * `cls`  stability class, which is the whole point of the unit
 * `mech` how it forms
 * `twin` an ion of the SAME m/z that it is routinely confused with. This
 *        drives distractor choice at Level 2: the wrong tile offered against
 *        a m/z 43 acylium is the m/z 43 propyl cation, not something absurd.
 */
var IONS = {
  /* --- the alkyl series: 15, 29, 43, 57, 71 — each one CH2 (14) bigger --- */
  ch3: {
    f: 'CH3', mz: 15, cls: 'methyl', mech: 'sigma', label: 'CH₃⁺', name: 'alkyl fragment',
    hint: 'The smallest alkyl fragment, and the first of the series 15, 29, 43, 57. A lone CH₃⁺ is the least stable carbocation there is, so this peak is always small — but seeing it means there was a methyl to lose.'
  },
  c2h5: {
    f: 'C2H5', mz: 29, cls: 'primary', mech: 'sigma', label: 'C₂H₅⁺', name: 'alkyl fragment', twin: 'cho',
    hint: 'An ethyl fragment — second in the alkyl series, 14 more than CH₃⁺. Careful at m/z 29: CHO from an aldehyde weighs the same. Check whether the structure has a C=O before you decide which one this is.'
  },
  c3h5: {
    f: 'C3H5', mz: 41, cls: 'allylic', mech: 'sigma', label: 'C₃H₅⁺', name: 'alkyl fragment',
    hint: 'm/z 41 turns up under almost any chain longer than three carbons. It is a real peak, but it narrows nothing down.'
  },
  c3h7: {
    f: 'C3H7', mz: 43, cls: 'secondary', mech: 'branch', label: 'C₃H₇⁺', name: 'alkyl fragment', twin: 'ch3co',
    hint: 'A three-carbon alkyl fragment — third in the series 15, 29, 43, 57. Careful at m/z 43: CH₃CO from a methyl ketone weighs the same. A C=O in the structure is what tells them apart.'
  },
  c4h7: {
    f: 'C4H7', mz: 55, cls: 'allylic', mech: 'sigma', label: 'C₄H₇⁺', name: 'alkyl fragment',
    hint: 'A four-carbon fragment with a double bond in it — very often what is left after an alcohol loses water and then a methyl.'
  },
  c4h9: {
    f: 'C4H9', mz: 57, cls: 'tertiary', mech: 'branch', label: '(CH₃)₃C⁺', name: 'alkyl fragment (3°)', twin: 'c2h5co',
    hint: 'THE tertiary carbocation. Three methyls propping up the positive charge make it far more stable than a straight-chain C₄H₉⁺ — so stable that a molecule containing a tert-butyl group often shows almost no molecular ion at all. A big m/z 57 means a branch point.'
  },
  c4h9s: {
    f: 'C4H9', mz: 57, cls: 'secondary', mech: 'branch', label: 'C₄H₉⁺', name: 'alkyl fragment (2°)',
    hint: 'A four-carbon alkyl fragment, but a SECONDARY one — only two groups propping up the charge, not three. Same formula and same mass as a tert-butyl fragment, and a good deal less stable, which is why m/z 57 is modest here and enormous in a compound with a real branch point.'
  },
  c5h11: {
    f: 'C5H11', mz: 71, cls: 'tertiary', mech: 'branch', label: 'C₅H₁₁⁺', name: 'alkyl fragment (3°)', twin: 'c3h7co',
    hint: 'A methyl has left the branch point, and what remains is still a tertiary carbocation. Careful at m/z 71: a four-carbon C=O fragment weighs the same.'
  },
  c7h15: {
    f: 'C7H15', mz: 99, cls: 'tertiary', mech: 'branch', label: 'C₇H₁₅⁺', name: 'alkyl fragment (3°)',
    hint: 'One methyl gone from the branch point, leaving a tertiary carbocation with most of the molecule still attached. In a heavily branched alkane this is often the highest peak you can see at all.'
  },

  /* --- fragments that keep the oxygen: cleavage next to O --- */
  ch2oh: {
    f: 'CH3O', mz: 31, cls: 'resonance', mech: 'alpha', label: 'CH₂=OH⁺', name: 'keeps the oxygen',
    hint: 'ALPHA CLEAVAGE: the C–C bond next to the OH breaks, and the oxygen helps carry the positive charge — which is why this fragment beats a plain alkyl one. As the BASE PEAK, m/z 31 means a primary alcohol.'
  },
  ch3choh: {
    f: 'C2H5O', mz: 45, cls: 'resonance', mech: 'alpha', label: 'CH₃CH=OH⁺', name: 'keeps the oxygen',
    hint: 'ALPHA CLEAVAGE next to the OH — same idea as m/z 31, one carbon bigger. As the BASE PEAK, m/z 45 means a secondary alcohol.'
  },
  me2coh: {
    f: 'C3H7O', mz: 59, cls: 'resonance', mech: 'alpha', label: '(CH₃)₂C=OH⁺', name: 'keeps the oxygen',
    hint: 'ALPHA CLEAVAGE next to the OH, with two methyls helping as well. As the BASE PEAK, m/z 59 means a tertiary alcohol.'
  },
  c2h5choh: {
    f: 'C3H7O', mz: 59, cls: 'resonance', mech: 'alpha', label: 'CH₃CH₂CH=OH⁺', name: 'keeps the oxygen',
    hint: 'ALPHA CLEAVAGE the other way round: this time the methyl left and the ethyl stayed. Same oxygen help, but a methyl is the harder of the two to break off, so this peak stays short.'
  },
  etmecoh: {
    f: 'C4H9O', mz: 73, cls: 'resonance', mech: 'alpha', label: 'CH₃CH₂(CH₃)C=OH⁺', name: 'keeps the oxygen',
    hint: 'ALPHA CLEAVAGE losing the methyl rather than the ethyl. Perfectly good, but losing the SMALLER group is the less favourable of the two routes, so this is the shorter peak.'
  },
  etoch2: {
    f: 'C3H7O', mz: 59, cls: 'resonance', mech: 'alpha', label: 'CH₃CH₂O⁺=CH₂', name: 'keeps the oxygen',
    hint: 'ALPHA CLEAVAGE in an ether — the bond next to the oxygen breaks and the oxygen carries the charge. An ether does exactly what an alcohol does here.'
  },
  ch2ome: {
    f: 'C2H5O', mz: 45, cls: 'resonance', mech: 'alpha', label: 'CH₃O⁺=CH₂', name: 'keeps the oxygen',
    hint: 'ALPHA CLEAVAGE next to a methyl ether oxygen.'
  },
  me2coome: {
    f: 'C4H9O', mz: 73, cls: 'resonance', mech: 'alpha', label: '(CH₃)₂C=O⁺CH₃', name: 'keeps the oxygen',
    hint: 'ALPHA CLEAVAGE losing a methyl off the branch point, with the ether oxygen carrying the charge. Oxygen help beats the bare tert-butyl route, even though that one is good too.'
  },
  phchoh: {
    f: 'C7H7O', mz: 107, cls: 'resonance', mech: 'alpha', label: 'C₆H₅CH=OH⁺', name: 'keeps the oxygen',
    hint: 'The best of both: ALPHA CLEAVAGE gives the oxygen’s help, and the benzene ring spreads the charge as well. Two things propping up one fragment, so this peak dominates.'
  },

  /* --- fragments that keep the C=O --- */
  cho: {
    f: 'CHO', mz: 29, cls: 'resonance', mech: 'alpha', label: 'CHO⁺', name: 'keeps the C=O', twin: 'c2h5',
    hint: 'The CHO fragment from an aldehyde, and the reason −29 is ambiguous. The C=O spreads the charge, so this is a better fragment than the ethyl sitting at the same mass — but only an aldehyde can make it.'
  },
  ch3co: {
    f: 'C2H3O', mz: 43, cls: 'resonance', mech: 'alpha', label: 'CH₃C≡O⁺', name: 'keeps the C=O', twin: 'c3h7',
    hint: 'ALPHA CLEAVAGE at a carbonyl: the C=O spreads the positive charge better than anything else in this unit, which is why m/z 43 is the base peak of almost every methyl ketone and acetate. Careful — a propyl fragment weighs the same.'
  },
  c2h5co: {
    f: 'C3H5O', mz: 57, cls: 'resonance', mech: 'alpha', label: 'CH₃CH₂C≡O⁺', name: 'keeps the C=O', twin: 'c4h9',
    hint: 'A C=O fragment one carbon longer than CH₃C≡O⁺. Careful at m/z 57: a tert-butyl fragment weighs the same, and only this one needs a C=O in the structure.'
  },
  c3h7co: {
    f: 'C4H7O', mz: 71, cls: 'resonance', mech: 'alpha', label: 'CH₃CH₂CH₂C≡O⁺', name: 'keeps the C=O', twin: 'c5h11',
    hint: 'A four-carbon C=O fragment. Careful at m/z 71: a tertiary alkyl fragment weighs the same.'
  },
  phco: {
    f: 'C7H5O', mz: 105, cls: 'resonance', mech: 'alpha', label: 'C₆H₅C≡O⁺', name: 'keeps the C=O and the ring', twin: 'phchch3',
    hint: 'A C=O fragment with a benzene ring attached — the charge is spread over both. m/z 105 with m/z 77 underneath it is the standard sign of a ring next to a carbonyl.'
  },
  acetoxy: {
    f: 'C2H3O2', mz: 59, cls: 'resonance', mech: 'alpha', label: 'CH₃CO–O⁺', name: 'keeps both oxygens',
    hint: 'The ester has lost the methyl off its oxygen. Real, but much weaker than m/z 43 — breaking the other C–O bond is the better deal.'
  },

  /* --- fragments that keep the nitrogen --- */
  ch2nh2: {
    f: 'CH4N', mz: 30, cls: 'resonance', mech: 'alpha', label: 'CH₂=NH₂⁺', name: 'keeps the nitrogen',
    hint: 'ALPHA CLEAVAGE at the nitrogen. Nitrogen carries a positive charge even more willingly than oxygen does, so this fragment usually swamps the spectrum. As the BASE PEAK, m/z 30 means a primary amine.'
  },
  etnhchme: {
    f: 'C3H8N', mz: 58, cls: 'resonance', mech: 'alpha', label: 'CH₃CH=NH⁺C₂H₅', name: 'keeps the nitrogen',
    hint: 'ALPHA CLEAVAGE at a secondary amine: a methyl leaves one of the ethyls, and the nitrogen carries the charge.'
  },

  /* --- fragments built on the ring --- */
  c7h7: {
    f: 'C7H7', mz: 91, cls: 'resonance', mech: 'benzylic', label: 'C₇H₇⁺', name: 'benzyl fragment',
    hint: 'BENZYLIC CLEAVAGE: the bond one carbon out from the ring breaks, and the ring spreads the charge around itself. m/z 91 is the most recognisable peak in organic mass spectrometry — it means a benzene ring with at least one carbon attached.'
  },
  phchch3: {
    f: 'C8H9', mz: 105, cls: 'resonance', mech: 'benzylic', label: 'C₆H₅CH⁺CH₃', name: 'benzyl fragment (+CH₃)', twin: 'phco',
    hint: 'A benzyl fragment with a methyl still on it — the ring spreads the charge and the methyl helps too. Careful at m/z 105: a ring-plus-C=O fragment weighs the same, and that one needs an oxygen.'
  },
  ph: {
    f: 'C6H5', mz: 77, cls: 'aryl', mech: 'sigma', label: 'C₆H₅⁺', name: 'the bare ring',
    hint: 'The bare benzene ring. It is not especially stable — the ring cannot help this one — but m/z 77 is so characteristic that it is worth knowing on sight as “there is a benzene ring here”.'
  },
  c4h3: {
    f: 'C4H3', mz: 51, cls: 'aryl', mech: 'sigma', label: 'C₄H₃⁺', name: 'ring fragment',
    hint: 'What is left when the bare ring itself breaks up. m/z 51 under m/z 77 corroborates a ring, and nothing more.'
  },
  c5h5: {
    f: 'C5H5', mz: 65, cls: 'aryl', mech: 'sigma', label: 'C₅H₅⁺', name: 'ring fragment',
    hint: 'What the benzyl fragment turns into when it breaks up further. m/z 65 sitting under m/z 91 confirms the 91 really is a benzyl fragment.'
  },

  /* --- whole-molecule fragments, mass set by the molecule --- */
  dehydr: {
    lost: 'H2O', f: null, mz: null, cls: 'radical', mech: 'dehydr',
    label: '[M − H₂O]⁺', name: 'what is left of the molecule',
    hint: 'DEHYDRATION. The alcohol throws off water, −18, and what is left is the rest of the molecule. M⁺ and M−18 together say alcohol; in a tertiary alcohol the M⁺ can vanish and leave M−18 as the highest peak you can see.'
  },
  dehydrohalo: {
    lost: 'HX', f: null, mz: null, cls: 'radical', mech: 'sigma',
    label: '[M − HCl]⁺', name: 'what is left of the molecule',
    hint: 'The chlorine leaves with a neighbouring hydrogen, −36 — exactly the way an alcohol loses water.'
  }
};

var ION_IDS = Object.keys(IONS);

/* ---------------------------------------------------------------- keying */

/* Level 1 asks what was LOST, which only exists relative to the molecular
   ion, so it has to be worked out per molecule rather than stored. */
function lossKey(peak, molecularMass) {
  if (peak.role === 'mplus') return 'mplus';
  if (peak.role === 'miso1') return 'miso1';
  if (peak.role === 'miso2') return 'miso2';
  return 'loss_' + (molecularMass - peak.mz);
}

function ionKey(peak) {
  if (peak.role === 'mplus') return 'mplus';
  if (peak.role === 'miso1') return 'miso1';
  if (peak.role === 'miso2') return 'miso2';
  return peak.ion;
}

function keyOf(peak, molecularMass, mode) {
  return mode === 'ion' ? ionKey(peak) : lossKey(peak, molecularMass);
}

/* ---------------------------------------------------------------- labels */

function lossNumber(key) {
  return key.indexOf('loss_') === 0 ? +key.slice(5) : null;
}

/* A loss tile reads the way the loss is spoken about in class — "M minus
   15" — with the neutral that left on the line underneath, rather than the
   other way round. The arithmetic is the headline. */
function keyLabel(key) {
  if (LANDMARKS[key]) return LANDMARKS[key].label;
  var n = lossNumber(key);
  if (n != null) return 'M − ' + n;
  return IONS[key].label;
}

/* The sub-line under a tile: what actually walked off. */
function keySub(key) {
  if (LANDMARKS[key]) return LANDMARKS[key].sub;
  var n = lossNumber(key);
  if (n != null) {
    var L = LOSSES[n];
    return L ? 'lost ' + L.neutral + (L.also ? ' or ' + L.also : '') : 'lost ' + n;
  }
  return IONS[key].name;
}

function keyHint(key) {
  if (LANDMARKS[key]) return LANDMARKS[key].hint;
  var n = lossNumber(key);
  if (n != null) return LOSSES[n] ? LOSSES[n].hint : 'A loss of ' + n + ' mass units.';
  return IONS[key].hint;
}

/* Everything a tile may show. Landmarks are in both universes because the
   molecular ion is asked for at both levels. */
/* Everything a tile may show. Only the loss vocabulary is draggable: the
   fragment names in IONS are recognition material — they appear in the
   reference table, in the Level 3 cards and in the feedback — but a student
   is never asked to produce one. */
var UNIVERSE = {
  loss: ['mplus', 'miso1', 'miso2'].concat(
    Object.keys(LOSSES).map(function (n) { return 'loss_' + n; }))
};

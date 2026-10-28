/* shifts.js — the chemical-shift regions, the splitting vocabulary and the
 * wording students see as feedback. This is the file to edit to make the
 * activity speak the way you teach.
 *
 * Every set of hydrogens in molecules.js names one region `r`. A set's shift
 * must fall inside its region's range; tools/validate.js refuses a bank where
 * it does not.
 *
 *   label  the row heading in the shift table
 *   where  finishes the sentence "this signal sits where ___ appear"
 *   range  [low, high] in ppm, as printed in the shift table
 *   hint   the reason, shown when a student places a set of this kind
 *   broad  O-H regions: the signal is a broad singlet and the shift wanders
 *          with concentration, so it is found by elimination, not by range
 */

var REGIONS = {
  alkyl: {
    label: 'Alkyl C–H', where: 'H on ordinary alkyl carbons', range: [0.8, 2.0],
    hint: 'Nothing electronegative nearby, so these H are well shielded and sit far ' +
          'upfield. CH₃ ≈ 0.9, CH₂ ≈ 1.3, CH ≈ 1.5 — a little higher when an O or Br ' +
          'is two carbons away.'
  },
  allylic: {
    label: 'C–H next to C=C (allylic)', where: 'H on a carbon next to a C=C', range: [1.6, 2.2],
    hint: 'The neighbouring C=C deshields these H slightly, so they sit just above the ' +
          'plain alkyl range.'
  },
  carbonyl: {
    label: 'C–H next to C=O', where: 'H on a carbon next to a C=O', range: [2.0, 2.7],
    hint: 'The C=O pulls electron density from the carbon next to it, so these H are ' +
          'deshielded a little: 2.0–2.7 ppm.'
  },
  benzylic: {
    label: 'C–H next to a benzene ring (benzylic)', where: 'H on a carbon attached to a benzene ring',
    range: [2.2, 2.8],
    hint: 'A carbon attached to a benzene ring feels the ring’s pull: 2.2–2.8 ppm.'
  },
  halide: {
    label: 'C–H on a carbon bonded to Br or Cl', where: 'H on a carbon bonded to Br or Cl',
    range: [2.7, 4.5],
    hint: 'Br and Cl are electronegative and pull electron density off the carbon they ' +
          'are bonded to, deshielding its H: about 3–4.5 ppm.'
  },
  oxygen: {
    label: 'C–H on a carbon bonded to O', where: 'H on a carbon bonded to O', range: [3.2, 5.2],
    hint: 'Oxygen is strongly electronegative, so H on the carbon bonded to it are well ' +
          'deshielded: 3.2–4 ppm in alcohols and ethers, up to about 5 on the O side of an ester.'
  },
  vinyl: {
    label: 'C=C–H (alkene)', where: 'H on a C=C', range: [4.5, 6.5],
    hint: 'H on the carbons of a C=C are strongly deshielded by the double bond: 4.5–6.5 ppm.'
  },
  aromatic: {
    label: 'Aromatic C–H (benzene ring)', where: 'H on a benzene ring', range: [6.5, 8.5],
    hint: 'The ring of moving π electrons deshields H on a benzene ring strongly: 6.5–8.5 ppm.'
  },
  aldehyde: {
    label: 'Aldehyde H, O=C–H', where: 'an aldehyde H', range: [9.0, 10.5],
    hint: 'An H on the C=O carbon itself is about as deshielded as a C–H gets: 9–10 ppm. ' +
          'Nothing else sits there.'
  },
  acid: {
    label: 'Carboxylic acid O–H', where: 'a carboxylic acid O–H', range: [10.0, 13.0], broad: true,
    hint: 'The acid O–H is the furthest downfield signal you will meet: a broad singlet at ' +
          '10–13 ppm.'
  },
  alcohol: {
    label: 'Alcohol O–H', where: 'an alcohol O–H', range: [1.0, 5.5], broad: true,
    hint: 'An alcohol O–H wanders anywhere from 1 to 5.5 ppm depending on concentration. ' +
          'Look for a broad singlet in a gap the C–H signals do not explain.'
  }
};

/* Index = number of neighbouring H, n. A signal has n + 1 lines. */
var MULTIPLICITY = ['singlet', 'doublet', 'triplet', 'quartet', 'quintet',
                    'sextet', 'septet', 'octet', 'nonet'];

/* Display names for the `family` field in molecules.js. */
var FAMILIES = {
  alcohol: 'Alcohol', ether: 'Ether', ester: 'Ester', ketone: 'Ketone',
  aldehyde: 'Aldehyde', acid: 'Carboxylic acid', halide: 'Alkyl halide',
  alkene: 'Alkene', arene: 'Aromatic hydrocarbon', alkane: 'Cycloalkane'
};

function rangeText(r) {
  return r.range[0].toFixed(1) + '–' + r.range[1].toFixed(1);
}

/* bonds.js — the measured evidence for the hybrid: bond lengths, in pm
 * (1 pm = 10⁻¹² m).
 *
 * For each species: a typical single bond and a typical double bond between
 * the same two elements (from ordinary molecules), and the measured length
 * of the bonds in the resonance species itself. All values are rounded to
 * the nearest pm, as general-chemistry textbooks quote them:
 *
 *   O–O   148  hydrogen peroxide, H–O–O–H        O=O  121  oxygen, O₂
 *   N–O   140  the N–OH bond of nitric acid      N=O  120  typical N=O
 *   C–O   143  methanol, CH₃–OH                  C=O  120  formaldehyde, CH₂O
 *
 *   ozone O₃       128 (gas)        nitrite NO₂⁻   124 (sodium nitrite)
 *   nitrate NO₃⁻   125 (sodium nitrate)          carbonate CO₃²⁻ 129 (calcite)
 *
 * What the activity teaches from these is qualitative: every bond in the
 * species is the SAME length, and that length is BETWEEN the single and the
 * double bond. (Bond length is not a straight-line function of bond order,
 * so the real values sit nearer the double bond than a 1½ or 1⅓ "average"
 * would suggest — the activity never claims otherwise.) tools/validate.js
 * checks each value lies strictly between its single and double.
 *
 * The sulfur species are left out on purpose: measured S–O bonds in SO₂ and
 * SO₃ are as short as S=O double bonds, which is the expanded-octet picture
 * this class does not use.
 */

var BONDS = {
  O3:  { pair: 'O–O', single: 148, double: 121, actual: 128 },
  NO2: { pair: 'N–O', single: 140, double: 120, actual: 124 },
  NO3: { pair: 'N–O', single: 140, double: 120, actual: 125 },
  CO3: { pair: 'C–O', single: 143, double: 120, actual: 129 }
};

/* Bond STRENGTH, for the comparison in Part 1: ozone's O–O bonds next to the
 * O–O bonds of two molecules with no resonance.
 *
 *   hydrogen peroxide  H–O–O–H  bond order 1    148 pm   about 210 kJ/mol
 *   ozone              O₃        bond order 1½   128 pm   about 300 kJ/mol *
 *   oxygen             O=O       bond order 2    121 pm   about 500 kJ/mol
 *
 * energy = the energy needed to break the O–O bond, rounded so it reads as
 * approximate: HO–OH 210–213 kJ/mol, O=O 498 kJ/mol.
 *
 * * For ozone it is the AVERAGE per bond: pulling O₃ apart into three O atoms
 *   takes about 605 kJ/mol (3 × 249 − 143, from the enthalpies of formation of
 *   O atoms and of O₃), so about 300 per bond. Breaking just ONE of ozone's
 *   bonds takes much less, about 106 kJ/mol, because the O₂ left behind ends up
 *   with a full double bond — a college-level subtlety the activity avoids by
 *   quoting the average (and saying so on screen).
 *
 * Textbook bond-energy tables list a "typical" O–O single bond as 146 kJ/mol;
 * if that is the table your class uses, change 210 to 146 — the ranking is the
 * same. tools/validate.js checks the order, and that the lengths match BONDS.
 */

var STRENGTH = {
  O3: { pair: 'O–O', rows: [
    { id: 'H2O2', order: '1', length: 148, energy: 210 },
    { id: 'O3', order: '1½', length: 128, energy: 300, average: true },
    { id: 'O2', order: '2', length: 121, energy: 500 }
  ] }
};

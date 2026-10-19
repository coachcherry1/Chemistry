/* species.js — every molecule and ion in the resonance activity.
 *
 * Same format as the Lewis activity (see that file for the details):
 *   formula, charge, name   — the central atom is the first one written, not
 *                             counting H (Rule 2)
 *   layout   where the other atoms are drawn: N, NE, E, SE, S, SW, W, NW.
 *            Bent species put their two O atoms at SW and SE (the central
 *            lone pair goes on top); trigonal ones use N, SW and SE.
 *   key      the hand-written answer the validator checks the 5-rule engine
 *            against: e = valence electrons, bo = the central atom's bond
 *            orders in ONE resonance structure, clp = lone pairs on the
 *            central atom, n = how many resonance structures (1 = none)
 *   note     shown when the student finishes the 5-rule build
 *
 * RESONANCE in this class: Rule 5 has a choice, and every choice gives the
 * SAME structure turned around (equivalent resonance structures). Species
 * whose Rule 5 choices give DIFFERENT structures — CO₂ (O=C=O or O≡C–O),
 * HCO₃⁻ and HNO₃ (the double bond could go to the O–H oxygen), N₃⁻, SCN⁻,
 * acetone — are beyond this class and left out. tools/validate.js checks
 * that every species here is one or the other: exactly one structure, or
 * two or more that are all equivalent.
 */

var SPECIES = {

  /* ---- resonance: built and explored in the activity */
  O3:    { formula: 'O3', charge: 0, name: 'ozone',
           layout: { SW: 'O', SE: 'O' }, key: { e: 18, bo: '21', clp: 1, n: 2 },
           note: 'Rule 5 made one double bond — but notice it let you pick EITHER end oxygen. Hold that thought.' },
  NO2:   { formula: 'NO2', charge: -1, name: 'nitrite ion',
           layout: { SW: 'O', SE: 'O' }, key: { e: 18, bo: '21', clp: 1, n: 2 },
           note: 'Rule 5 again had a choice of two oxygens. You picked one — the other was just as good.' },
  NO3:   { formula: 'NO3', charge: -1, name: 'nitrate ion',
           layout: { N: 'O', SW: 'O', SE: 'O' }, key: { e: 24, bo: '211', clp: 0, n: 3 },
           note: 'Three oxygens, and any one of them could have shared the pair in Rule 5.' },
  CO3:   { formula: 'CO3', charge: -2, name: 'carbonate ion',
           layout: { N: 'O', SW: 'O', SE: 'O' }, key: { e: 24, bo: '211', clp: 0, n: 3 },
           note: 'C was 2 short, so one oxygen shared a pair — but which one? Any of the three would do.' },
  SO2:   { formula: 'SO2', charge: 0, name: 'sulfur dioxide',
           layout: { SW: 'O', SE: 'O' }, key: { e: 18, bo: '21', clp: 1, n: 2 } },
  SO3:   { formula: 'SO3', charge: 0, name: 'sulfur trioxide',
           layout: { N: 'O', SW: 'O', SE: 'O' }, key: { e: 24, bo: '211', clp: 0, n: 3 } },
  HCO2:  { formula: 'HCO2', charge: -1, name: 'formate ion',
           layout: { N: 'H', SW: 'O', SE: 'O' }, key: { e: 18, bo: '211', clp: 0, n: 2 } },

  /* ---- no resonance: used in checkpoint questions, for comparison */
  CH2O:  { formula: 'CH2O', charge: 0, name: 'formaldehyde',
           layout: { W: 'H', E: 'H', N: 'O' }, key: { e: 12, bo: '211', clp: 0, n: 1 } },
  SO4:   { formula: 'SO4', charge: -2, name: 'sulfate ion',
           layout: { W: 'O', E: 'O', N: 'O', S: 'O' }, key: { e: 32, bo: '1111', clp: 0, n: 1 } },
  ClO3:  { formula: 'ClO3', charge: -1, name: 'chlorate ion',
           layout: { W: 'O', E: 'O', S: 'O' }, key: { e: 26, bo: '111', clp: 1, n: 1 } },
  HCN:   { formula: 'HCN', charge: 0, name: 'hydrogen cyanide',
           layout: { W: 'H', E: 'N' }, key: { e: 10, bo: '31', clp: 0, n: 1 } },
  NH4:   { formula: 'NH4', charge: 1, name: 'ammonium ion',
           layout: { W: 'H', E: 'H', N: 'H', S: 'H' }, key: { e: 8, bo: '1111', clp: 0, n: 1 } },
  H2O:   { formula: 'H2O', charge: 0, name: 'water',
           layout: { W: 'H', E: 'H' }, key: { e: 8, bo: '11', clp: 2, n: 1 } }
};

/* Part 4 ("On your own"): each student gets one of these, at random, and
   keeps it if they leave and come back. */
var POOLS = {
  own: { title: 'A new resonance species', ids: ['SO2', 'SO3', 'HCO2'] }
};

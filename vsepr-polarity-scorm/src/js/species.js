/* species.js: every molecule and ion in the activity.
 *
 * The same format as the Lewis structures activity, so the same 5-rule
 * engine (lewis.js) builds and checks every one of them:
 *
 *   formula  written the way students see it; the central atom is worked out
 *            from it by Rule 2 (the first atom written, not counting H)
 *   charge   0 for a molecule
 *   layout   where the other atoms sit in the drawn Lewis structure: N, NE, E,
 *            SE, S, SW, W, NW around the central atom
 *   key      the answer, written by hand so tools/validate.js can check that
 *            the 5-rule engine gets the same thing:
 *              e    total valence electrons
 *              bo   orders of the central atom's bonds, largest first
 *              clp  lone pairs on the central atom
 *   note     shown when the student finishes a build (optional)
 *
 * What VSEPR adds (vsepr.js) is worked out from the finished structure, never
 * typed here: the electron domains, the molecular geometry, the 3D model and
 * whether the molecule is polar.
 *
 * Scope: 2 to 6 electron domains. Lone pairs on the central atom only with 4
 * domains (trigonal pyramidal and bent), so no SF4, ClF3, XeF2 or XeF4, and no
 * molecule whose 5 rules give 3 domains with a lone pair (SO2). The validator
 * enforces it.
 */

var SPECIES = {

  /* ---- builds */
  H2O:   { formula: 'H2O', charge: 0, name: 'water',
           layout: { W: 'H', E: 'H' }, key: { e: 8, bo: '11', clp: 2 },
           note: 'O ends with two single bonds and two lone pairs: 8 electrons.' },
  CO2:   { formula: 'CO2', charge: 0, name: 'carbon dioxide',
           layout: { W: 'O', E: 'O' }, key: { e: 16, bo: '22', clp: 0 },
           note: 'C was 4 electrons short after Rule 4, so Rule 5 ran twice and C ends with 8.' },
  BF3:   { formula: 'BF3', charge: 0, name: 'boron trifluoride',
           layout: { W: 'F', E: 'F', S: 'F' }, key: { e: 24, bo: '111', clp: 0 },
           note: 'B is one of the exceptions: it is stable with 6 electrons, so Rule 5 leaves it alone.' },

  /* ---- the shapes, 2 to 6 domains */
  CH4:   { formula: 'CH4', charge: 0, name: 'methane',
           layout: { W: 'H', E: 'H', N: 'H', S: 'H' }, key: { e: 8, bo: '1111', clp: 0 } },
  NH3:   { formula: 'NH3', charge: 0, name: 'ammonia',
           layout: { W: 'H', E: 'H', S: 'H' }, key: { e: 8, bo: '111', clp: 1 } },
  BeF2:  { formula: 'BeF2', charge: 0, name: 'beryllium fluoride',
           layout: { W: 'F', E: 'F' }, key: { e: 16, bo: '11', clp: 0 } },
  PCl5:  { formula: 'PCl5', charge: 0, name: 'phosphorus pentachloride',
           layout: { N: 'Cl', W: 'Cl', E: 'Cl', SW: 'Cl', SE: 'Cl' }, key: { e: 40, bo: '11111', clp: 0 } },
  SF6:   { formula: 'SF6', charge: 0, name: 'sulfur hexafluoride',
           layout: { W: 'F', E: 'F', NW: 'F', NE: 'F', SW: 'F', SE: 'F' }, key: { e: 48, bo: '111111', clp: 0 } },

  /* ---- more molecules: sorting, polarity and checkpoints */
  HCN:   { formula: 'HCN', charge: 0, name: 'hydrogen cyanide',
           layout: { W: 'H', E: 'N' }, key: { e: 10, bo: '31', clp: 0 } },
  CH2O:  { formula: 'CH2O', charge: 0, name: 'formaldehyde',
           layout: { W: 'H', E: 'H', N: 'O' }, key: { e: 12, bo: '211', clp: 0 } },
  BCl3:  { formula: 'BCl3', charge: 0, name: 'boron trichloride',
           layout: { W: 'Cl', E: 'Cl', S: 'Cl' }, key: { e: 24, bo: '111', clp: 0 } },
  BeCl2: { formula: 'BeCl2', charge: 0, name: 'beryllium chloride',
           layout: { W: 'Cl', E: 'Cl' }, key: { e: 16, bo: '11', clp: 0 } },
  PF5:   { formula: 'PF5', charge: 0, name: 'phosphorus pentafluoride',
           layout: { N: 'F', W: 'F', E: 'F', SW: 'F', SE: 'F' }, key: { e: 40, bo: '11111', clp: 0 } },
  CCl4:  { formula: 'CCl4', charge: 0, name: 'carbon tetrachloride',
           layout: { W: 'Cl', E: 'Cl', N: 'Cl', S: 'Cl' }, key: { e: 32, bo: '1111', clp: 0 } },
  CH3Cl: { formula: 'CH3Cl', charge: 0, name: 'chloromethane',
           layout: { N: 'Cl', W: 'H', E: 'H', S: 'H' }, key: { e: 14, bo: '1111', clp: 0 } },
  CH2Cl2:{ formula: 'CH2Cl2', charge: 0, name: 'dichloromethane',
           layout: { W: 'Cl', E: 'Cl', N: 'H', S: 'H' }, key: { e: 20, bo: '1111', clp: 0 } },
  CHCl3: { formula: 'CHCl3', charge: 0, name: 'chloroform',
           layout: { N: 'H', W: 'Cl', E: 'Cl', S: 'Cl' }, key: { e: 26, bo: '1111', clp: 0 } },
  PCl3:  { formula: 'PCl3', charge: 0, name: 'phosphorus trichloride',
           layout: { W: 'Cl', E: 'Cl', S: 'Cl' }, key: { e: 26, bo: '111', clp: 1 } },
  NF3:   { formula: 'NF3', charge: 0, name: 'nitrogen trifluoride',
           layout: { W: 'F', E: 'F', S: 'F' }, key: { e: 26, bo: '111', clp: 1 } },
  OF2:   { formula: 'OF2', charge: 0, name: 'oxygen difluoride',
           layout: { W: 'F', E: 'F' }, key: { e: 20, bo: '11', clp: 2 } },
  H2S:   { formula: 'H2S', charge: 0, name: 'hydrogen sulfide',
           layout: { W: 'H', E: 'H' }, key: { e: 8, bo: '11', clp: 2 } },

  /* ---- ions from the Lewis structures activity: shapes only, never polarity */
  NH4:   { formula: 'NH4', charge: 1, name: 'ammonium ion',
           layout: { W: 'H', E: 'H', N: 'H', S: 'H' }, key: { e: 8, bo: '1111', clp: 0 } },
  H3O:   { formula: 'H3O', charge: 1, name: 'hydronium ion',
           layout: { W: 'H', E: 'H', S: 'H' }, key: { e: 8, bo: '111', clp: 1 } },
  SO4:   { formula: 'SO4', charge: -2, name: 'sulfate ion',
           layout: { W: 'O', E: 'O', N: 'O', S: 'O' }, key: { e: 32, bo: '1111', clp: 0 } },
  ClO3:  { formula: 'ClO3', charge: -1, name: 'chlorate ion',
           layout: { W: 'O', E: 'O', S: 'O' }, key: { e: 26, bo: '111', clp: 1 } },
  ClO2:  { formula: 'ClO2', charge: -1, name: 'chlorite ion',
           layout: { W: 'O', E: 'O' }, key: { e: 20, bo: '11', clp: 2 } },
  PO4:   { formula: 'PO4', charge: -3, name: 'phosphate ion',
           layout: { W: 'O', E: 'O', N: 'O', S: 'O' }, key: { e: 32, bo: '1111', clp: 0 } },
  SO3:   { formula: 'SO3', charge: -2, name: 'sulfite ion',
           layout: { W: 'O', E: 'O', S: 'O' }, key: { e: 26, bo: '111', clp: 1 } }
};

/* Measured bond angles, used only to build the 3D models of NH3 and H2O, so
   the model shows the angle squeezed as much as it really is. Students are
   never asked for these numbers: on screen the angle reads "<109.5°" or
   "<<109.5°". Any other molecule with a lone pair is shown only as a Lewis
   structure (tools/validate.js checks that no other one is drawn in 3D).
   Source: CRC Handbook of Chemistry and Physics, gas-phase structures. */
var MEASURED_ANGLE = { NH3: 106.7, H2O: 104.5 };

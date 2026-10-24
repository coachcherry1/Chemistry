/* species.js — every molecule and ion in the activity.
 *
 *   formula  written the way students see it; the central atom is worked out
 *            from it by Rule 2 (the first atom written, not counting H)
 *   charge   0 for a molecule
 *   layout   where the other atoms sit in the drawn answer: N, NE, E, SE, S,
 *            SW, W, NW around the central atom. 'OH' is an oxygen with its H
 *            on the outside — in an oxyacid every H bonds to an O, never to
 *            the central atom.
 *   key      the answer, written by hand so tools/validate.js can check that
 *            the 5-rule engine (lewis.js) gets the same thing:
 *              e    total valence electrons
 *              bo   orders of the central atom's bonds, largest first
 *              clp  lone pairs on the central atom
 *   note     shown when the student finishes the build (optional)
 *
 * Every species here was chosen so the 5 rules give ONE structure: no
 * resonance (no O₃, CO₃²⁻, NO₃⁻, NO₂⁻, HNO₃, HCO₃⁻, SO₂, SO₃, SCN⁻).
 *
 * Octet exceptions (Part 4 and the second Part 5 pool) come straight out of
 * the 5 rules: B and Be are stable with 6 and 4 electrons, so Rule 5 leaves
 * them alone (BF₃, BeF₂); and a period-3-or-below central atom keeps every
 * electron Rules 2 and 4 give it, even past 8 (SF₆ from six bonds, XeF₄ from
 * leftover lone pairs). A period-2 central atom never goes past 8, and Rule 5
 * never takes any atom past what the rules give it. tools/validate.js
 * enforces all of this, and that no two lone pairs on an atom are drawn
 * squeezed side by side.
 */

var SPECIES = {

  /* ---- the worked example */
  NH3:   { formula: 'NH3', charge: 0, name: 'ammonia',
           layout: { W: 'H', E: 'H', S: 'H' }, key: { e: 8, bo: '111', clp: 1 } },

  /* ---- Part 1: molecules */
  PCl3:  { formula: 'PCl3', charge: 0, name: 'phosphorus trichloride',
           layout: { W: 'Cl', E: 'Cl', S: 'Cl' }, key: { e: 26, bo: '111', clp: 1 },
           note: 'P ends with three single bonds and one lone pair: 8 electrons. It already had its octet ' +
                 'after Rule 4, so Rule 5 had nothing to do.' },
  CH2O:  { formula: 'CH2O', charge: 0, name: 'formaldehyde',
           layout: { W: 'H', E: 'H', N: 'O' }, key: { e: 12, bo: '211', clp: 0 },
           note: 'After Rule 4, C had only 6 electrons. Rule 5 turned one of O’s lone pairs into a second ' +
                 'C–O bond — a double bond — and now C and O both have 8.' },
  HCN:   { formula: 'HCN', charge: 0, name: 'hydrogen cyanide',
           layout: { W: 'H', E: 'N' }, key: { e: 10, bo: '31', clp: 0 },
           note: 'C was 4 electrons short, so Rule 5 ran twice: two of N’s lone pairs became bonds, making ' +
                 'a triple bond.' },

  /* ---- Part 2: polyatomic ions */
  NH4:   { formula: 'NH4', charge: 1, name: 'ammonium ion',
           layout: { W: 'H', E: 'H', N: 'H', S: 'H' }, key: { e: 8, bo: '1111', clp: 0 },
           note: 'The + charge means the ion has LOST an electron: 5 + 4 − 1 = 8. Four single bonds use ' +
                 'all 8, and N has its octet.' },
  ClO3:  { formula: 'ClO3', charge: -1, name: 'chlorate ion',
           layout: { W: 'O', E: 'O', S: 'O' }, key: { e: 26, bo: '111', clp: 1 },
           note: 'The − charge added one electron: 7 + 18 + 1 = 26. Cl reaches 8 with three single bonds ' +
                 'and the lone pair it got in Rule 4.' },
  SO4:   { formula: 'SO4', charge: -2, name: 'sulfate ion',
           layout: { W: 'O', E: 'O', N: 'O', S: 'O' }, key: { e: 32, bo: '1111', clp: 0 },
           note: 'No double bonds. S reached 8 electrons with four single bonds, so it was never electron ' +
                 'deficient and Rule 5 never ran.' },

  /* ---- Part 3: oxyacids */
  H2SO4: { formula: 'H2SO4', charge: 0, name: 'sulfuric acid',
           layout: { W: 'OH', E: 'OH', N: 'O', S: 'O' }, key: { e: 32, bo: '1111', clp: 0 },
           note: 'The same S as in sulfate: four single bonds and an octet, so no double bonds. The two ' +
                 'H atoms sit on oxygens — that O–H is what makes it an acid.' },
  HNO2:  { formula: 'HNO2', charge: 0, name: 'nitrous acid',
           layout: { W: 'OH', E: 'O' }, key: { e: 18, bo: '21', clp: 1 },
           note: 'N is in period 2 and had only 6 electrons after Rule 4, so Rule 5 made one N=O double ' +
                 'bond.' },

  /* ---- Part 4: exceptions to the octet */
  BF3:   { formula: 'BF3', charge: 0, name: 'boron trifluoride',
           layout: { W: 'F', E: 'F', S: 'F' }, key: { e: 24, bo: '111', clp: 0 },
           note: 'B ends with only 6 electrons: three single bonds and no lone pairs. B is one of the exceptions — ' +
                 'it is stable with 6 — so it is not electron deficient, and Rule 5 leaves it alone.' },
  BeF2:  { formula: 'BeF2', charge: 0, name: 'beryllium fluoride',
           layout: { W: 'F', E: 'F' }, key: { e: 16, bo: '11', clp: 0 },
           note: 'Be ends with just 4 electrons: two single bonds. Be is the other exception — it is stable with 4 — ' +
                 'so Rule 5 has nothing to fix.' },
  SF6:   { formula: 'SF6', charge: 0, name: 'sulfur hexafluoride',
           layout: { W: 'F', E: 'F', NW: 'F', NE: 'F', SW: 'F', SE: 'F' }, key: { e: 48, bo: '111111', clp: 0 },
           note: 'S ends with 12 electrons, because Rule 2 gave it six single bonds. That is an expanded octet: an ' +
                 'atom in period 3 or below can hold more than 8. Rule 5 never ran — S was never short.' },
  XeF4:  { formula: 'XeF4', charge: 0, name: 'xenon tetrafluoride',
           layout: { N: 'F', E: 'F', S: 'F', W: 'F' }, key: { e: 36, bo: '1111', clp: 2 },
           note: 'Rule 4 put the 4 leftover electrons on Xe as two lone pairs, so Xe ends with 12 — an expanded ' +
                 'octet. Xe is in period 5, so it can hold them.' },

  /* ---- Part 5 pools: oxyanions */
  PO4:   { formula: 'PO4', charge: -3, name: 'phosphate ion',
           layout: { W: 'O', E: 'O', N: 'O', S: 'O' }, key: { e: 32, bo: '1111', clp: 0 } },
  SO3:   { formula: 'SO3', charge: -2, name: 'sulfite ion',
           layout: { W: 'O', E: 'O', S: 'O' }, key: { e: 26, bo: '111', clp: 1 } },
  ClO4:  { formula: 'ClO4', charge: -1, name: 'perchlorate ion',
           layout: { W: 'O', E: 'O', N: 'O', S: 'O' }, key: { e: 32, bo: '1111', clp: 0 } },
  ClO2:  { formula: 'ClO2', charge: -1, name: 'chlorite ion',
           layout: { W: 'O', E: 'O' }, key: { e: 20, bo: '11', clp: 2 } },
  BrO3:  { formula: 'BrO3', charge: -1, name: 'bromate ion',
           layout: { W: 'O', E: 'O', S: 'O' }, key: { e: 26, bo: '111', clp: 1 } },
  IO4:   { formula: 'IO4', charge: -1, name: 'periodate ion',
           layout: { W: 'O', E: 'O', N: 'O', S: 'O' }, key: { e: 32, bo: '1111', clp: 0 } },

  /* ---- Part 5 pools: oxyacids */
  H3PO4: { formula: 'H3PO4', charge: 0, name: 'phosphoric acid',
           layout: { W: 'OH', E: 'OH', S: 'OH', N: 'O' }, key: { e: 32, bo: '1111', clp: 0 } },
  H2SO3: { formula: 'H2SO3', charge: 0, name: 'sulfurous acid',
           layout: { W: 'OH', E: 'OH', S: 'O' }, key: { e: 26, bo: '111', clp: 1 } },
  HClO4: { formula: 'HClO4', charge: 0, name: 'perchloric acid',
           layout: { W: 'OH', E: 'O', N: 'O', S: 'O' }, key: { e: 32, bo: '1111', clp: 0 } },
  HClO3: { formula: 'HClO3', charge: 0, name: 'chloric acid',
           layout: { W: 'OH', E: 'O', S: 'O' }, key: { e: 26, bo: '111', clp: 1 } },
  HSO4:  { formula: 'HSO4', charge: -1, name: 'hydrogen sulfate ion',
           layout: { W: 'OH', E: 'O', N: 'O', S: 'O' }, key: { e: 32, bo: '1111', clp: 0 } },
  H2PO4: { formula: 'H2PO4', charge: -1, name: 'dihydrogen phosphate ion',
           layout: { W: 'OH', E: 'OH', N: 'O', S: 'O' }, key: { e: 32, bo: '1111', clp: 0 } },

  /* ---- Part 5 pools: multiple bonds */
  H2CO3: { formula: 'H2CO3', charge: 0, name: 'carbonic acid',
           layout: { W: 'OH', E: 'OH', N: 'O' }, key: { e: 24, bo: '211', clp: 0 } },
  CO:    { formula: 'CO', charge: 0, name: 'carbon monoxide',
           layout: { E: 'O' }, key: { e: 10, bo: '3', clp: 1 } },
  CN:    { formula: 'CN', charge: -1, name: 'cyanide ion',
           layout: { E: 'N' }, key: { e: 10, bo: '3', clp: 1 } },
  CO2:   { formula: 'CO2', charge: 0, name: 'carbon dioxide',
           layout: { W: 'O', E: 'O' }, key: { e: 16, bo: '22', clp: 0 } },

  /* ---- Part 5 pools: exceptions */
  BCl3:  { formula: 'BCl3', charge: 0, name: 'boron trichloride',
           layout: { W: 'Cl', E: 'Cl', S: 'Cl' }, key: { e: 24, bo: '111', clp: 0 } },
  BeCl2: { formula: 'BeCl2', charge: 0, name: 'beryllium chloride',
           layout: { W: 'Cl', E: 'Cl' }, key: { e: 16, bo: '11', clp: 0 } },
  PCl5:  { formula: 'PCl5', charge: 0, name: 'phosphorus pentachloride',
           layout: { N: 'Cl', W: 'Cl', E: 'Cl', SW: 'Cl', SE: 'Cl' }, key: { e: 40, bo: '11111', clp: 0 } },
  SF4:   { formula: 'SF4', charge: 0, name: 'sulfur tetrafluoride',
           layout: { W: 'F', E: 'F', NW: 'F', NE: 'F' }, key: { e: 34, bo: '1111', clp: 1 } },
  ICl4:  { formula: 'ICl4', charge: -1, name: 'tetrachloroiodate ion',
           layout: { N: 'Cl', E: 'Cl', S: 'Cl', W: 'Cl' }, key: { e: 36, bo: '1111', clp: 2 } },
  PF6:   { formula: 'PF6', charge: -1, name: 'hexafluorophosphate ion',
           layout: { W: 'F', E: 'F', NW: 'F', NE: 'F', SW: 'F', SE: 'F' }, key: { e: 48, bo: '111111', clp: 0 } },
  XeF2:  { formula: 'XeF2', charge: 0, name: 'xenon difluoride',
           layout: { W: 'F', E: 'F' }, key: { e: 22, bo: '11', clp: 3 } },
  ClF3:  { formula: 'ClF3', charge: 0, name: 'chlorine trifluoride',
           layout: { N: 'F', E: 'F', S: 'F' }, key: { e: 28, bo: '111', clp: 2 } },

  /* ---- used only in checkpoint questions */
  NF3:   { formula: 'NF3', charge: 0, name: 'nitrogen trifluoride',
           layout: { W: 'F', E: 'F', S: 'F' }, key: { e: 26, bo: '111', clp: 1 } },
  OF2:   { formula: 'OF2', charge: 0, name: 'oxygen difluoride',
           layout: { W: 'F', E: 'F' }, key: { e: 20, bo: '11', clp: 2 } },
  CCl4:  { formula: 'CCl4', charge: 0, name: 'carbon tetrachloride',
           layout: { W: 'Cl', E: 'Cl', N: 'Cl', S: 'Cl' }, key: { e: 32, bo: '1111', clp: 0 } },
  H3O:   { formula: 'H3O', charge: 1, name: 'hydronium ion',
           layout: { W: 'H', E: 'H', S: 'H' }, key: { e: 8, bo: '111', clp: 1 } },
  IO3:   { formula: 'IO3', charge: -1, name: 'iodate ion',
           layout: { W: 'O', E: 'O', S: 'O' }, key: { e: 26, bo: '111', clp: 1 } }
};

/* Part 5 ("On your own"): each student gets one species from each pool, at
   random, and keeps it if they leave and come back. */
var POOLS = {
  mix:   { title: 'A molecule, ion or oxyacid',
           ids: ['ClO3', 'PO4', 'SO3', 'ClO4', 'ClO2', 'BrO3', 'IO4', 'H3PO4', 'H2SO3', 'HClO4', 'HClO3', 'HSO4',
                 'H2PO4', 'H2CO3', 'CO', 'CN', 'CO2'] },
  exc:   { title: 'An exception to the octet',
           ids: ['BCl3', 'BeCl2', 'PCl5', 'SF4', 'ICl4', 'PF6', 'XeF2', 'ClF3'] }
};

/* data.js — the element pool, the ions, and the transition-metal rule.
 *
 * Everything a teacher would want to change about WHICH ions appear lives here.
 * After an edit run `node tools/validate.js` and `node tools/answer-key.js`.
 *
 * The rule students practise is a conditional:
 *   IF the positive ion is a transition metal -> metal (Roman numeral) + anion
 *   ELSE                                      -> cation + anion
 * `tm: true` marks a transition metal AS TAUGHT IN THIS CLASS: Sn and Pb count,
 * Ag and Zn do not (each has only one charge). Mercury is used only as Hg2+;
 * mercury(I) is the diatomic Hg2 2+ ion and is deliberately left out.
 */

var DATA = (function () {
  'use strict';

  /* Elements 1-20 plus Honors Element List 2 - the only symbols students have
     memorized. tools/validate.js fails if any ion uses a symbol outside this. */
  var POOL = [
    'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
    'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
    'Ti', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Br',
    'Kr', 'Rb', 'Ag', 'Sn', 'I', 'Xe', 'Ba', 'Au', 'Hg', 'Pb'
  ];

  var ELEMENT_NAMES = {
    H: 'hydrogen', He: 'helium', Li: 'lithium', Be: 'beryllium', B: 'boron',
    C: 'carbon', N: 'nitrogen', O: 'oxygen', F: 'fluorine', Ne: 'neon',
    Na: 'sodium', Mg: 'magnesium', Al: 'aluminum', Si: 'silicon', P: 'phosphorus',
    S: 'sulfur', Cl: 'chlorine', Ar: 'argon', K: 'potassium', Ca: 'calcium',
    Ti: 'titanium', Cr: 'chromium', Mn: 'manganese', Fe: 'iron', Co: 'cobalt',
    Ni: 'nickel', Cu: 'copper', Zn: 'zinc', Ga: 'gallium', Br: 'bromine',
    Kr: 'krypton', Rb: 'rubidium', Ag: 'silver', Sn: 'tin', I: 'iodine',
    Xe: 'xenon', Ba: 'barium', Au: 'gold', Hg: 'mercury', Pb: 'lead'
  };

  /* Pool elements that never appear in a compound here. Used as wrong answers
     ("which pair forms an ionic compound?"). */
  var NO_ION = ['H', 'He', 'B', 'C', 'Si', 'Ne', 'Ar', 'Kr', 'Xe'];

  var G1 = 'Group 1 metals always form 1+ ions.';
  var G2 = 'Group 2 metals always form 2+ ions.';
  var G13 = 'Al and Ga (Group 13) always form 3+ ions.';

  /* Positive ions.
     t        formula text
     charges  every charge this activity will use
     near     cations a student is likely to confuse this one with; they become
              the wrong-answer tiles
     why      shown when a student gets the charge or the TM question wrong */
  var CATIONS = [
    { t: 'Li', name: 'lithium',   charges: [1], group: 1, near: ['Na', 'Be'], why: G1 },
    { t: 'Na', name: 'sodium',    charges: [1], group: 1, near: ['K', 'Li'],  why: G1 },
    { t: 'K',  name: 'potassium', charges: [1], group: 1, near: ['Na', 'Ca'], why: G1 },
    { t: 'Rb', name: 'rubidium',  charges: [1], group: 1, near: ['K', 'Ba'],  why: G1 },
    { t: 'Be', name: 'beryllium', charges: [2], group: 2, near: ['Mg', 'Ba'], why: G2 },
    { t: 'Mg', name: 'magnesium', charges: [2], group: 2, near: ['Mn', 'Ca'], why: G2 },
    { t: 'Ca', name: 'calcium',   charges: [2], group: 2, near: ['Mg', 'K'],  why: G2 },
    { t: 'Ba', name: 'barium',    charges: [2], group: 2, near: ['Be', 'Ca'], why: G2 },
    { t: 'Al', name: 'aluminum',  charges: [3], group: 13, near: ['Ga', 'Ag'], why: G13 },
    { t: 'Ga', name: 'gallium',   charges: [3], group: 13, near: ['Al', 'Au'], why: G13 },
    { t: 'Ag', name: 'silver',    charges: [1], group: 11, dblock: true, near: ['Au', 'Al'],
      why: 'Silver is not a transition metal in this class — it only ever forms Ag⁺.' },
    { t: 'Zn', name: 'zinc',      charges: [2], group: 12, dblock: true, near: ['Sn', 'Ni'],
      why: 'Zinc is not a transition metal in this class — it only ever forms Zn²⁺.' },
    { t: 'NH4', name: 'ammonium', charges: [1], poly: true, near: ['Na', 'Ni'], traps: ['ammonia'],
      why: 'Ammonium, NH₄⁺, is the only positive polyatomic ion on your list. It is always 1+ and never takes a Roman numeral.' },

    { t: 'Ti', name: 'titanium',  charges: [2, 3, 4], tm: true, near: ['Sn', 'Ni'] },
    { t: 'Cr', name: 'chromium',  charges: [2, 3],    tm: true, near: ['Cu', 'Co'] },
    { t: 'Mn', name: 'manganese', charges: [2, 3, 4], tm: true, near: ['Mg', 'Fe'] },
    { t: 'Fe', name: 'iron',      charges: [2, 3],    tm: true, near: ['Pb', 'Ni'] },
    { t: 'Co', name: 'cobalt',    charges: [2, 3],    tm: true, near: ['Cu', 'Cr'] },
    { t: 'Ni', name: 'nickel',    charges: [2, 3],    tm: true, near: ['Zn', 'Co'] },
    { t: 'Cu', name: 'copper',    charges: [1, 2],    tm: true, near: ['Co', 'Au'] },
    { t: 'Au', name: 'gold',      charges: [1, 3],    tm: true, near: ['Ag', 'Cu'] },
    { t: 'Hg', name: 'mercury',   charges: [2],       tm: true, near: ['Ag', 'Mn'] },
    { t: 'Sn', name: 'tin',       charges: [2, 4],    tm: true, notD: true, near: ['Ti', 'Zn'] },
    { t: 'Pb', name: 'lead',      charges: [2, 4],    tm: true, notD: true, near: ['Fe', 'Sn'] }
  ];

  /* Negative ions. Single-element ions carry `el`, the element name a student
     writes by mistake instead of the -ide name. Polyatomic ions are exactly the
     class Polyatomic Ions List; tools/validate.js checks that list. */
  var ANIONS = [
    { t: 'N',  name: 'nitride',   charge: 3, el: 'nitrogen',   group: 15, near: ['NO3', 'NO2'] },
    { t: 'P',  name: 'phosphide', charge: 3, el: 'phosphorus', group: 15, near: ['PO4', 'PO3'] },
    { t: 'O',  name: 'oxide',     charge: 2, el: 'oxygen',     group: 16, near: ['O2', 'OH'] },
    { t: 'S',  name: 'sulfide',   charge: 2, el: 'sulfur',     group: 16, near: ['SO4', 'SO3'] },
    { t: 'F',  name: 'fluoride',  charge: 1, el: 'fluorine',   group: 17, near: ['Cl', 'Br'] },
    { t: 'Cl', name: 'chloride',  charge: 1, el: 'chlorine',   group: 17, near: ['ClO3', 'ClO'] },
    { t: 'Br', name: 'bromide',   charge: 1, el: 'bromine',    group: 17, near: ['BrO3', 'Cl'] },
    { t: 'I',  name: 'iodide',    charge: 1, el: 'iodine',     group: 17, near: ['Br', 'Cl'] },

    { t: 'CN',     name: 'cyanide',      charge: 1, poly: true, near: ['N', 'CO3'] },
    { t: 'OH',     name: 'hydroxide',    charge: 1, poly: true, near: ['O', 'O2'] },
    { t: 'ClO',    name: 'hypochlorite', charge: 1, poly: true, near: ['ClO2', 'Cl'] },
    { t: 'ClO2',   name: 'chlorite',     charge: 1, poly: true, near: ['ClO3', 'ClO'] },
    { t: 'ClO3',   name: 'chlorate',     charge: 1, poly: true, near: ['ClO4', 'ClO2'] },
    { t: 'ClO4',   name: 'perchlorate',  charge: 1, poly: true, near: ['ClO3', 'ClO'] },
    { t: 'C2H3O2', name: 'acetate',      charge: 1, poly: true, alt: 'CH3COO', near: ['CO3', 'CN'] },
    { t: 'MnO4',   name: 'permanganate', charge: 1, poly: true, near: ['CrO4', 'O'] },
    { t: 'NO2',    name: 'nitrite',      charge: 1, poly: true, near: ['NO3', 'N'] },
    { t: 'NO3',    name: 'nitrate',      charge: 1, poly: true, near: ['NO2', 'N'] },
    { t: 'BrO3',   name: 'bromate',      charge: 1, poly: true, near: ['Br', 'ClO3'] },
    { t: 'CO3',    name: 'carbonate',    charge: 2, poly: true, near: ['C2H3O2', 'CN'] },
    { t: 'CrO4',   name: 'chromate',     charge: 2, poly: true, near: ['Cr2O7', 'MnO4'] },
    { t: 'Cr2O7',  name: 'dichromate',   charge: 2, poly: true, near: ['CrO4', 'MnO4'] },
    { t: 'O2',     name: 'peroxide',     charge: 2, poly: true, near: ['O', 'OH'] },
    { t: 'SO3',    name: 'sulfite',      charge: 2, poly: true, near: ['SO4', 'S'] },
    { t: 'SO4',    name: 'sulfate',      charge: 2, poly: true, near: ['SO3', 'S'] },
    { t: 'PO4',    name: 'phosphate',    charge: 3, poly: true, near: ['PO3', 'P'] },
    { t: 'PO3',    name: 'phosphite',    charge: 3, poly: true, near: ['PO4', 'P'] }
  ];

  /* Pairings that are left out of the compound pool.
     - Peroxide only with Group 1 and 2 metals. With a transition metal the
       formula collides with an oxide: lead(II) peroxide and lead(IV) oxide
       would both be PbO2.
     - Ammonium never with nitride, phosphide, oxide or peroxide - those
       compounds do not exist and only confuse.
     - A metal never paired with a polyatomic ion built on the same metal
       (chromium dichromate, manganese permanganate). */
  function allowed(cation, anion) {
    if (anion.t === 'O2' && !(cation.group === 1 || cation.group === 2)) return false;
    if (anion.t === 'O2' && cation.t === 'Be') return false;
    if (cation.t === 'NH4' && ['N', 'P', 'O', 'O2'].indexOf(anion.t) >= 0) return false;
    if (cation.t === 'Cr' && (anion.t === 'CrO4' || anion.t === 'Cr2O7')) return false;
    if (cation.t === 'Mn' && anion.t === 'MnO4') return false;
    return true;
  }

  /* British spellings are accepted silently in typed answers. */
  var SPELLING = {
    aluminium: 'aluminum', sulphide: 'sulfide', sulphate: 'sulfate', sulphite: 'sulfite'
  };

  return {
    POOL: POOL, ELEMENT_NAMES: ELEMENT_NAMES, NO_ION: NO_ION,
    CATIONS: CATIONS, ANIONS: ANIONS, allowed: allowed, SPELLING: SPELLING
  };
})();

/* data.js: the elements and substances in the activity.
 *
 * Melting and boiling points are real, at 1 atm, from the CRC Handbook of
 * Chemistry and Physics (97th ed.), stored in kelvin and shown in °C and K.
 * Helium has no melting point at 1 atm (it stays liquid down to absolute
 * zero unless squeezed), so its `mp` is null and it is only ever compared
 * with neon by boiling point.
 *
 * Everything else a step or a question says about a substance (its electron
 * count, whether it is polar, which intermolecular forces it has, how many
 * hydrogen bonds it can make) is worked out from its structure in chem.js,
 * never typed here.
 *
 * Structures are drawn on a grid (x right, y down, one bond length = 1),
 * every atom and bond shown, as Lewis structures. Lone pairs are added by
 * chem.js (each atom gets an octet; H a doublet).
 *
 *   atoms  [element, x, y]
 *   bonds  [i, j, order]
 */

var ELEMENTS = {
  H:  { z: 1,  mass: 1.008,  en: 2.20, name: 'hydrogen' },
  He: { z: 2,  mass: 4.0026, en: null, name: 'helium' },
  C:  { z: 6,  mass: 12.011, en: 2.55, name: 'carbon' },
  N:  { z: 7,  mass: 14.007, en: 3.04, name: 'nitrogen' },
  O:  { z: 8,  mass: 15.999, en: 3.44, name: 'oxygen' },
  F:  { z: 9,  mass: 18.998, en: 3.98, name: 'fluorine' },
  Ne: { z: 10, mass: 20.180, en: null, name: 'neon' },
  Cl: { z: 17, mass: 35.45,  en: 3.16, name: 'chlorine' },
  Ar: { z: 18, mass: 39.948, en: null, name: 'argon' },
  Br: { z: 35, mass: 79.904, en: 2.96, name: 'bromine' },
  Kr: { z: 36, mass: 83.798, en: null, name: 'krypton' },
  I:  { z: 53, mass: 126.90, en: 2.66, name: 'iodine' },
  Xe: { z: 54, mass: 131.29, en: null, name: 'xenon' }
};

/* Noble gas atoms for the polarizability step: the radius of the atom's
   electron cloud when it is not bonded (pm, Bondi) and its polarizability
   (Å³, CRC Handbook). */
var ATOM_SIZE = {
  He: { vdw: 140, alpha: 0.205 },
  Ne: { vdw: 154, alpha: 0.396 },
  Ar: { vdw: 188, alpha: 1.641 },
  Kr: { vdw: 202, alpha: 2.484 },
  Xe: { vdw: 216, alpha: 4.044 }
};

var SUBSTANCES = {

  /* ---- the noble gases */
  He:   { name: 'helium', formula: 'He', mp: null, bp: 4.22, atoms: [['He', 0, 0]], bonds: [] },
  Ne:   { name: 'neon', formula: 'Ne', mp: 24.56, bp: 27.10, atoms: [['Ne', 0, 0]], bonds: [] },
  Ar:   { name: 'argon', formula: 'Ar', mp: 83.81, bp: 87.30, atoms: [['Ar', 0, 0]], bonds: [] },
  Kr:   { name: 'krypton', formula: 'Kr', mp: 115.78, bp: 119.73, atoms: [['Kr', 0, 0]], bonds: [] },
  Xe:   { name: 'xenon', formula: 'Xe', mp: 161.40, bp: 165.05, atoms: [['Xe', 0, 0]], bonds: [] },

  /* ---- the halogens */
  F2:   { name: 'fluorine', formula: 'F2', mp: 53.48, bp: 85.03, atoms: [['F', 0, 0], ['F', 1, 0]], bonds: [[0, 1, 1]] },
  Cl2:  { name: 'chlorine', formula: 'Cl2', mp: 171.6, bp: 239.11, atoms: [['Cl', 0, 0], ['Cl', 1, 0]], bonds: [[0, 1, 1]] },
  Br2:  { name: 'bromine', formula: 'Br2', mp: 265.9, bp: 331.9, atoms: [['Br', 0, 0], ['Br', 1, 0]], bonds: [[0, 1, 1]] },
  I2:   { name: 'iodine', formula: 'I2', mp: 386.85, bp: 457.4, atoms: [['I', 0, 0], ['I', 1, 0]], bonds: [[0, 1, 1]] },

  /* ---- 18 electrons */
  HCl:  { name: 'hydrogen chloride', formula: 'HCl', mp: 158.97, bp: 188.1,
          atoms: [['H', 0, 0], ['Cl', 1, 0]], bonds: [[0, 1, 1]] },
  C2H6: { name: 'ethane', formula: 'C2H6', mp: 90.35, bp: 184.6,
          atoms: [['C', 0, 0], ['C', 1, 0], ['H', -1, 0], ['H', 0, -1], ['H', 0, 1], ['H', 2, 0], ['H', 1, -1], ['H', 1, 1]],
          bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [1, 5, 1], [1, 6, 1], [1, 7, 1]] },
  CH3F: { name: 'fluoromethane', formula: 'CH3F', mp: 135.35, bp: 194.75,
          atoms: [['C', 0, 0], ['F', 1, 0], ['H', -1, 0], ['H', 0, -1], ['H', 0, 1]],
          bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
  CH3OH:{ name: 'methanol', formula: 'CH3OH', mp: 175.62, bp: 337.75,
          atoms: [['C', 0, 0], ['O', 1, 0], ['H', 1.7, 0.7], ['H', -1, 0], ['H', 0, -1], ['H', 0, 1]],
          bonds: [[0, 1, 1], [1, 2, 1], [0, 3, 1], [0, 4, 1], [0, 5, 1]] },

  /* ---- 10 electrons */
  CH4:  { name: 'methane', formula: 'CH4', mp: 90.69, bp: 111.66,
          atoms: [['C', 0, 0], ['H', -1, 0], ['H', 1, 0], ['H', 0, -1], ['H', 0, 1]],
          bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
  NH3:  { name: 'ammonia', formula: 'NH3', mp: 195.42, bp: 239.82,
          atoms: [['N', 0, 0], ['H', -0.9, 0.5], ['H', 0.9, 0.5], ['H', 0, 1]],
          bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] },
  H2O:  { name: 'water', formula: 'H2O', mp: 273.15, bp: 373.15,
          atoms: [['O', 0, 0], ['H', -0.8, 0.6], ['H', 0.8, 0.6]], bonds: [[0, 1, 1], [0, 2, 1]] },
  HF:   { name: 'hydrogen fluoride', formula: 'HF', mp: 189.79, bp: 292.67,
          atoms: [['H', 0, 0], ['F', 1, 0]], bonds: [[0, 1, 1]] },

  /* ---- about 34 electrons */
  C4H10:{ name: 'butane', formula: 'C4H10', mp: 134.85, bp: 272.65,
          atoms: [['C', 0, 0], ['C', 1, 0], ['C', 2, 0], ['C', 3, 0], ['H', -1, 0], ['H', 0, -1], ['H', 0, 1], ['H', 1, -1],
                  ['H', 1, 1], ['H', 2, -1], ['H', 2, 1], ['H', 4, 0], ['H', 3, -1], ['H', 3, 1]],
          bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 4, 1], [0, 5, 1], [0, 6, 1], [1, 7, 1], [1, 8, 1], [2, 9, 1], [2, 10, 1],
                  [3, 11, 1], [3, 12, 1], [3, 13, 1]] },
  acetone: { name: 'acetone', formula: 'C3H6O', mp: 178.45, bp: 329.2,
          atoms: [['C', 0, 0], ['C', 1, 0], ['C', 2, 0], ['O', 1, -1], ['H', -1, 0], ['H', 0, -1], ['H', 0, 1], ['H', 3, 0],
                  ['H', 2, -1], ['H', 2, 1]],
          bonds: [[0, 1, 1], [1, 2, 1], [1, 3, 2], [0, 4, 1], [0, 5, 1], [0, 6, 1], [2, 7, 1], [2, 8, 1], [2, 9, 1]] },
  ethanol: { name: 'ethanol', formula: 'C2H5OH', mp: 159.01, bp: 351.44,
          atoms: [['C', 0, 0], ['C', 1, 0], ['O', 2, 0], ['H', 2.7, 0.7], ['H', -1, 0], ['H', 0, -1], ['H', 0, 1], ['H', 1, -1],
                  ['H', 1, 1]],
          bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 4, 1], [0, 5, 1], [0, 6, 1], [1, 7, 1], [1, 8, 1]] },
  propanol: { name: '1-propanol', formula: 'C3H7OH', mp: 148.76, bp: 370.35,
          atoms: [['C', 0, 0], ['C', 1, 0], ['C', 2, 0], ['O', 3, 0], ['H', 3.7, 0.7], ['H', -1, 0], ['H', 0, -1], ['H', 0, 1],
                  ['H', 1, -1], ['H', 1, 1], ['H', 2, -1], ['H', 2, 1]],
          bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [0, 5, 1], [0, 6, 1], [0, 7, 1], [1, 8, 1], [1, 9, 1], [2, 10, 1],
                  [2, 11, 1]] },
  glycol: { name: 'ethylene glycol', formula: 'C2H4(OH)2', mp: 260.46, bp: 470.45,
          atoms: [['O', 0, 0], ['H', -0.7, 0.7], ['C', 1, 0], ['C', 2, 0], ['O', 3, 0], ['H', 3.7, -0.7], ['H', 1, -1],
                  ['H', 1, 1], ['H', 2, -1], ['H', 2, 1]],
          bonds: [[0, 1, 1], [0, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1], [2, 6, 1], [2, 7, 1], [3, 8, 1], [3, 9, 1]] }
};

/* Where a student has met each one: everyday uses only, never an organic
   class name (the validator checks student text for those). */
var EVERYDAY = {
  ethanol: 'in hand sanitizer',
  glycol: 'antifreeze',
  acetone: 'nail polish remover'
};

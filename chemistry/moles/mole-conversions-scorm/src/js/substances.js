/* substances.js: everything a problem can start from.
 *
 * kind decides the particle word:
 *   element    atoms      (Fe, He)
 *   diatomic   molecules  (O2, Cl2): 1 mol Cl2 = 2 mol Cl is a ratio too
 *   molecular  molecules  (H2O, PCl3)
 *   ionic      none: an ionic compound is never counted in particles, so the
 *              activity never needs a word for one unit of an ionic
 *              compound. Its elements still are (atoms O in Fe2O3).
 *
 * gas: a gas at STP (0 °C, 1 atm), so it alone gets 22.4 L = 1 mol. Every one
 * of them boils (or sublimes) below 0 °C; tools/validate.js holds the boiling
 * points that say so.
 *
 * Digits in a formula are always subscripts (there are no coefficients).
 */
var SUBSTANCES = [
  /* elements, counted in atoms */
  { f: 'He', kind: 'element', gas: true },
  { f: 'Ne', kind: 'element', gas: true },
  { f: 'Kr', kind: 'element', gas: true },
  { f: 'C', kind: 'element' },
  { f: 'Na', kind: 'element' },
  { f: 'Mg', kind: 'element' },
  { f: 'Al', kind: 'element' },
  { f: 'Si', kind: 'element' },
  { f: 'K', kind: 'element' },
  { f: 'Ca', kind: 'element' },
  { f: 'Fe', kind: 'element' },
  { f: 'Ni', kind: 'element' },
  { f: 'Cu', kind: 'element' },
  { f: 'Zn', kind: 'element' },
  { f: 'Ag', kind: 'element' },
  { f: 'Sn', kind: 'element' },
  { f: 'Au', kind: 'element' },
  { f: 'Pb', kind: 'element' },

  /* diatomic elements, counted in molecules */
  { f: 'H2', kind: 'diatomic', gas: true },
  { f: 'N2', kind: 'diatomic', gas: true },
  { f: 'O2', kind: 'diatomic', gas: true },
  { f: 'F2', kind: 'diatomic', gas: true },
  { f: 'Cl2', kind: 'diatomic', gas: true },
  { f: 'Br2', kind: 'diatomic' },
  { f: 'I2', kind: 'diatomic' },

  /* molecular compounds, counted in molecules */
  { f: 'CO2', kind: 'molecular', gas: true },
  { f: 'CO', kind: 'molecular', gas: true },
  { f: 'CH4', kind: 'molecular', gas: true },
  { f: 'NH3', kind: 'molecular', gas: true },
  { f: 'SO2', kind: 'molecular', gas: true },
  { f: 'N2O', kind: 'molecular', gas: true },
  { f: 'C2H6', kind: 'molecular', gas: true },
  { f: 'C3H8', kind: 'molecular', gas: true },
  { f: 'H2S', kind: 'molecular', gas: true },
  { f: 'HCl', kind: 'molecular', gas: true },
  { f: 'SF6', kind: 'molecular', gas: true },
  { f: 'H2O', kind: 'molecular' },
  { f: 'PCl3', kind: 'molecular' },
  { f: 'SBr2', kind: 'molecular' },
  { f: 'CCl4', kind: 'molecular' },
  { f: 'N2O5', kind: 'molecular' },
  { f: 'P4O10', kind: 'molecular' },
  { f: 'C6H12O6', kind: 'molecular' },
  { f: 'C8H18', kind: 'molecular' },
  { f: 'C12H22O11', kind: 'molecular' },

  /* ionic compounds: mass and moles only */
  { f: 'NaCl', kind: 'ionic' },
  { f: 'KCl', kind: 'ionic' },
  { f: 'CaCl2', kind: 'ionic' },
  { f: 'MgCl2', kind: 'ionic' },
  { f: 'AlCl3', kind: 'ionic' },
  { f: 'MgO', kind: 'ionic' },
  { f: 'Na2O', kind: 'ionic' },
  { f: 'Al2O3', kind: 'ionic' },
  { f: 'Fe2O3', kind: 'ionic' },
  { f: 'CaF2', kind: 'ionic' },
  { f: 'Na2SO4', kind: 'ionic' },
  { f: 'K2SO4', kind: 'ionic' },
  { f: 'CaCO3', kind: 'ionic' },
  { f: 'Na2CO3', kind: 'ionic' },
  { f: 'NaHCO3', kind: 'ionic' },
  { f: 'CuSO4', kind: 'ionic' },
  { f: 'K3PO4', kind: 'ionic' },
  { f: 'Mg(NO3)2', kind: 'ionic' },
  { f: 'Ca(NO3)2', kind: 'ionic' },
  { f: 'Al(NO3)3', kind: 'ionic' },
  { f: 'Ca(OH)2', kind: 'ionic' },
  { f: 'Mg(OH)2', kind: 'ionic' },
  { f: '(NH4)2SO4', kind: 'ionic' },
  { f: '(NH4)3PO4', kind: 'ionic' },
  { f: 'Ca3(PO4)2', kind: 'ionic' },
  { f: 'Al2(SO4)3', kind: 'ionic' }
];

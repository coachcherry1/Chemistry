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
 * name: the class's name, written before the formula in every prompt
 * ("sulfur dibromide, SBr2"). Prefixes for molecular compounds, Roman
 * numerals only for iron and copper, American spelling (aluminum).
 * tools/validate.js names every compound again from its ions or prefixes.
 *
 * gas: a gas at STP (0 °C, 1 atm), so it alone gets 22.4 L = 1 mol. Every one
 * of them boils (or sublimes) below 0 °C; tools/validate.js holds the boiling
 * points that say so.
 *
 * aq: dissolves well enough in water to be a solution in the molarity
 * version, at up to maxM mol/L. The validator holds real solubilities and
 * keeps maxM at half of each or less.
 *
 * Digits in a formula are always subscripts (there are no coefficients).
 */
var SUBSTANCES = [
  /* elements, counted in atoms */
  { f: 'He', kind: 'element', gas: true },
  { f: 'Ne', kind: 'element', gas: true },
  { f: 'Ar', kind: 'element', gas: true },
  { f: 'Kr', kind: 'element', gas: true },
  { f: 'C', kind: 'element' },
  { f: 'Na', kind: 'element' },
  { f: 'Mg', kind: 'element' },
  { f: 'Al', kind: 'element' },
  { f: 'Si', kind: 'element' },
  { f: 'K', kind: 'element' },
  { f: 'Ca', kind: 'element' },
  { f: 'Cr', kind: 'element' },
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
  { f: 'CO2', kind: 'molecular', gas: true, name: 'carbon dioxide' },
  { f: 'CO', kind: 'molecular', gas: true, name: 'carbon monoxide' },
  { f: 'CH4', kind: 'molecular', gas: true, name: 'methane' },
  { f: 'NH3', kind: 'molecular', gas: true, name: 'ammonia', aq: true, maxM: 2.0 },
  { f: 'SO2', kind: 'molecular', gas: true, name: 'sulfur dioxide' },
  { f: 'N2O', kind: 'molecular', gas: true, name: 'dinitrogen monoxide' },
  { f: 'C2H6', kind: 'molecular', gas: true, name: 'ethane' },
  { f: 'C3H8', kind: 'molecular', gas: true, name: 'propane' },
  { f: 'H2S', kind: 'molecular', gas: true, name: 'hydrogen sulfide' },
  { f: 'HCl', kind: 'molecular', gas: true, name: 'hydrogen chloride' },
  { f: 'SF6', kind: 'molecular', gas: true, name: 'sulfur hexafluoride' },
  { f: 'H2O', kind: 'molecular', name: 'water' },
  { f: 'PCl3', kind: 'molecular', name: 'phosphorus trichloride' },
  { f: 'SBr2', kind: 'molecular', name: 'sulfur dibromide' },
  { f: 'CCl4', kind: 'molecular', name: 'carbon tetrachloride' },
  { f: 'N2O5', kind: 'molecular', name: 'dinitrogen pentoxide' },
  { f: 'P4O10', kind: 'molecular', name: 'tetraphosphorus decoxide' },
  { f: 'C6H12O6', kind: 'molecular', name: 'glucose', aq: true, maxM: 1.5 },
  { f: 'C8H18', kind: 'molecular', name: 'octane' },
  { f: 'C12H22O11', kind: 'molecular', name: 'sucrose', aq: true, maxM: 1.2 },

  /* ionic compounds: mass and moles only */
  { f: 'NaCl', kind: 'ionic', name: 'sodium chloride', aq: true, maxM: 2.0 },
  { f: 'KCl', kind: 'ionic', name: 'potassium chloride', aq: true, maxM: 1.5 },
  { f: 'CaCl2', kind: 'ionic', name: 'calcium chloride', aq: true, maxM: 2.0 },
  { f: 'MgCl2', kind: 'ionic', name: 'magnesium chloride', aq: true, maxM: 2.0 },
  { f: 'AlCl3', kind: 'ionic', name: 'aluminum chloride', aq: true, maxM: 1.5 },
  { f: 'GaCl3', kind: 'ionic', name: 'gallium chloride', aq: true, maxM: 2.0 },
  { f: 'KBr', kind: 'ionic', name: 'potassium bromide', aq: true, maxM: 2.0 },
  { f: 'MgO', kind: 'ionic', name: 'magnesium oxide' },
  { f: 'Na2O', kind: 'ionic', name: 'sodium oxide' },
  { f: 'Al2O3', kind: 'ionic', name: 'aluminum oxide' },
  { f: 'Fe2O3', kind: 'ionic', name: 'iron(III) oxide' },
  { f: 'CaF2', kind: 'ionic', name: 'calcium fluoride' },
  { f: 'Na2SO4', kind: 'ionic', name: 'sodium sulfate', aq: true, maxM: 0.8 },
  { f: 'K2SO4', kind: 'ionic', name: 'potassium sulfate', aq: true, maxM: 0.3 },
  { f: 'CaCO3', kind: 'ionic', name: 'calcium carbonate' },
  { f: 'Na2CO3', kind: 'ionic', name: 'sodium carbonate', aq: true, maxM: 0.8 },
  { f: 'K2CO3', kind: 'ionic', name: 'potassium carbonate', aq: true, maxM: 2.0 },
  { f: 'NaHCO3', kind: 'ionic', name: 'sodium hydrogen carbonate', aq: true, maxM: 0.5 },
  { f: 'NaNO3', kind: 'ionic', name: 'sodium nitrate', aq: true, maxM: 2.0 },
  { f: 'CuSO4', kind: 'ionic', name: 'copper(II) sulfate', aq: true, maxM: 0.6 },
  { f: 'K3PO4', kind: 'ionic', name: 'potassium phosphate', aq: true, maxM: 1.5 },
  { f: 'Mg(NO3)2', kind: 'ionic', name: 'magnesium nitrate', aq: true, maxM: 1.5 },
  { f: 'Ca(NO3)2', kind: 'ionic', name: 'calcium nitrate', aq: true, maxM: 2.0 },
  { f: 'Zn(NO3)2', kind: 'ionic', name: 'zinc nitrate', aq: true, maxM: 2.0 },
  { f: 'Ba(NO3)2', kind: 'ionic', name: 'barium nitrate', aq: true, maxM: 0.2 },
  { f: 'Al(NO3)3', kind: 'ionic', name: 'aluminum nitrate', aq: true, maxM: 1.2 },
  { f: 'Ca(OH)2', kind: 'ionic', name: 'calcium hydroxide' },
  { f: 'Mg(OH)2', kind: 'ionic', name: 'magnesium hydroxide' },
  { f: 'Ca(C2H3O2)2', kind: 'ionic', name: 'calcium acetate', aq: true, maxM: 0.8 },
  { f: '(NH4)2SO4', kind: 'ionic', name: 'ammonium sulfate', aq: true, maxM: 2.0 },
  { f: '(NH4)3PO4', kind: 'ionic', name: 'ammonium phosphate' },
  { f: 'Ca3(PO4)2', kind: 'ionic', name: 'calcium phosphate' },
  { f: 'Al2(SO4)3', kind: 'ionic', name: 'aluminum sulfate' }
];

/* compounds.js: the real compounds behind every problem, for all three
 * packages (config.js picks the mode). Everything a problem shows (percents,
 * grams, lab masses, the grams of CO2 and H2O, the molar mass) is computed
 * from these formulas in problems.js; nothing here is typed twice.
 *
 * FORMULAS: compounds for the empirical and molecular formula package.
 *   f     the formula as written (molecular formula for a molecular compound)
 *   name  its name, American spelling
 *   mol   true: a molecular compound whose molar mass may be given, so the
 *         molecular formula can be asked
 *   note  shown once the formula is found
 * HYDRATES: the anhydrous salt, its name, and n in salt.nH2O.
 * HYDROCARBONS: C and H only, for combustion analysis (the molar mass can be
 *   given for the molecular formula).
 *
 * The multiplier each one needs (Multiply if not whole) comes from the
 * formula: Fe2O3 is Fe 1 : O 1.5, so x 2. Fractions used are halves, thirds,
 * fourths and fifths only (the teacher's choice); tools/validate.js fails on
 * a compound that would need sixths or sevenths (C7H8, C6H8O7) and on any
 * problem whose quotients do not sit close to their fraction with every
 * periodic table in tools/tables.js.
 */
var FORMULAS = [
  /* ionic and network compounds: the formula is the empirical formula */
  { f: 'Fe2O3', name: 'iron(III) oxide', note: 'Rust.' },
  { f: 'Al2O3', name: 'aluminum oxide', note: 'Ruby and sapphire are aluminum oxide with a trace of another metal.' },
  { f: 'Cr2O3', name: 'chromium(III) oxide', note: 'A green paint pigment.' },
  { f: 'Fe3O4', name: 'iron(II,III) oxide', note: 'Magnetite, the magnetic iron ore.' },
  { f: 'Pb3O4', name: 'lead(II,IV) oxide', note: 'Red lead, an old orange-red pigment.' },
  { f: 'Mn2O7', name: 'manganese(VII) oxide', note: 'A dark red oil that explodes when warmed.' },
  { f: 'Mg3N2', name: 'magnesium nitride', note: 'The side product of the magnesium oxide lab.' },
  { f: 'Al4C3', name: 'aluminum carbide', note: 'With water it gives off methane.' },
  { f: 'K2Cr2O7', name: 'potassium dichromate', note: 'Bright orange crystals.' },
  { f: 'Na2S2O3', name: 'sodium thiosulfate', note: 'Used to develop photographs.' },
  { f: 'Ca3(PO4)2', name: 'calcium phosphate', note: 'The mineral of bones and teeth.' },
  { f: 'Al2(SO4)3', name: 'aluminum sulfate', note: 'Used to clear cloudy water.' },
  { f: 'Fe2(SO4)3', name: 'iron(III) sulfate', note: 'Used in water treatment.' },
  { f: 'V2O5', name: 'vanadium(V) oxide', note: 'The catalyst for making sulfuric acid.' },
  { f: 'Cu2O', name: 'copper(I) oxide', note: 'A red powder.' },
  { f: 'KMnO4', name: 'potassium permanganate', note: 'Deep purple crystals.' },
  { f: 'Na2CO3', name: 'sodium carbonate', note: 'Washing soda, without its water.' },
  { f: 'CaCO3', name: 'calcium carbonate', note: 'Chalk, limestone and seashells.' },
  { f: 'Na2SO4', name: 'sodium sulfate', note: 'Used in powdered detergents.' },
  { f: 'CuCl2', name: 'copper(II) chloride', note: 'Turns a flame blue-green.' },
  /* molecular compounds, empirical formula only */
  { f: 'N2O5', name: 'dinitrogen pentoxide', note: 'A white solid that makes nitric acid with water.' },
  { f: 'N2O3', name: 'dinitrogen trioxide', note: 'A deep blue liquid when cold.' },
  { f: 'SO3', name: 'sulfur trioxide', note: 'Makes sulfuric acid with water.' },
  { f: 'P4S3', name: 'tetraphosphorus trisulfide', mol: true, note: 'In the heads of strike-anywhere matches.' },
  /* molecular compounds: the molar mass can be given */
  { f: 'C6H12O6', name: 'glucose', mol: true, note: 'Blood sugar.' },
  { f: 'C6H8O6', name: 'vitamin C (ascorbic acid)', mol: true, note: 'In citrus fruit.' },
  { f: 'C6H6', name: 'benzene', mol: true, note: 'A ring of six carbon atoms.' },
  { f: 'N2H4', name: 'hydrazine', mol: true, note: 'A rocket fuel.' },
  { f: 'H2O2', name: 'hydrogen peroxide', mol: true, note: 'A bleach and disinfectant.' },
  { f: 'N2O4', name: 'dinitrogen tetroxide', mol: true, note: 'A rocket fuel oxidizer.' },
  { f: 'P4O10', name: 'tetraphosphorus decoxide', mol: true, note: 'Its empirical formula, P₂O₅, gave its old name, phosphorus pentoxide.' },
  { f: 'P4O6', name: 'tetraphosphorus hexoxide', mol: true, note: 'What phosphorus makes when it burns with too little air.' },
  { f: 'C8H18', name: 'octane', mol: true, note: 'In gasoline.' },
  { f: 'C10H8', name: 'naphthalene', mol: true, note: 'Mothballs.' },
  { f: 'C4H10', name: 'butane', mol: true, note: 'Lighter fuel.' },
  { f: 'C2H6O2', name: 'ethylene glycol', mol: true, note: 'Antifreeze.' },
  { f: 'C2H4O2', name: 'acetic acid', mol: true, note: 'The acid in vinegar.' },
  { f: 'C2H2O4', name: 'oxalic acid', mol: true, note: 'In rhubarb leaves.' },
  { f: 'C10H14N2', name: 'nicotine', mol: true, note: 'In tobacco.' },
  { f: 'C8H8', name: 'styrene', mol: true, note: 'Polystyrene is made from it.' },
  { f: 'C6H12', name: 'cyclohexane', mol: true, note: 'A ring of six CH₂ groups.' },
  { f: 'C3H6O3', name: 'lactic acid', mol: true, note: 'In sour milk and tired muscles.' },
  { f: 'C6H4Cl2', name: 'para-dichlorobenzene', mol: true, note: 'Another mothball compound.' },
  { f: 'C10H22', name: 'decane', mol: true, note: 'In kerosene.' },
  { f: 'C12H10', name: 'biphenyl', mol: true, note: 'Two benzene rings joined.' },
  { f: 'C14H10', name: 'anthracene', mol: true, note: 'Three benzene rings joined side by side.' },
  { f: 'C8H10', name: 'xylene', mol: true, note: 'A solvent in paints and markers.' },
  { f: 'C6H14', name: 'hexane', mol: true, note: 'A solvent.' },
  { f: 'C9H8O4', name: 'aspirin', mol: true, note: 'A pain reliever.' },
  { f: 'C5H8', name: 'isoprene', mol: true, note: 'Natural rubber is made of it.' },
  { f: 'C5H12', name: 'pentane', mol: true, note: 'A very volatile liquid.' },
  { f: 'C8H8O3', name: 'vanillin', mol: true, note: 'The flavor of vanilla.' },
  { f: 'C7H6O2', name: 'benzoic acid', mol: true, note: 'A food preservative.' },
  { f: 'C3H6N6', name: 'melamine', mol: true, note: 'Melamine plates and countertops are made from it.' },
  { f: 'C4H6', name: '1,3-butadiene', mol: true, note: 'Synthetic rubber is made from it.' },
  { f: 'C6H10', name: 'cyclohexene', mol: true, note: 'A ring with one double bond.' },
  { f: 'C9H12', name: 'mesitylene', mol: true, note: 'A benzene ring with three CH₃ groups.' },
  { f: 'C2H2', name: 'acetylene', mol: true, note: 'The fuel of a welding torch.' },
  { f: 'C4H8O2', name: 'butyric acid', mol: true, note: 'The smell of rancid butter.' },
  { f: 'C4H6O4', name: 'succinic acid', mol: true, note: 'Found in amber.' },
  { f: 'C6H10O4', name: 'adipic acid', mol: true, note: 'Nylon is made from it.' },
  { f: 'C4H6O6', name: 'tartaric acid', mol: true, note: 'Cream of tartar comes from it.' },
  { f: 'C2N2', name: 'cyanogen', mol: true, note: 'A poisonous gas.' },
  { f: 'S2Cl2', name: 'disulfur dichloride', mol: true, note: 'Used to harden rubber.' },
  { f: 'C2H4Cl2', name: '1,2-dichloroethane', mol: true, note: 'PVC is made from it.' }
];

var HYDRATES = [
  { salt: 'CuSO4', name: 'copper(II) sulfate', n: 5, note: 'Blue crystals that turn white when the water is driven off.' },
  { salt: 'MgSO4', name: 'magnesium sulfate', n: 7, note: 'Epsom salt.' },
  { salt: 'BaCl2', name: 'barium chloride', n: 2 },
  { salt: 'CoCl2', name: 'cobalt(II) chloride', n: 6, note: 'Pink crystals that turn blue when the water is driven off.' },
  { salt: 'Na2CO3', name: 'sodium carbonate', n: 10, note: 'Washing soda.' },
  { salt: 'CaCl2', name: 'calcium chloride', n: 2, note: 'Used to melt ice on roads.' },
  { salt: 'Na2SO4', name: 'sodium sulfate', n: 10, note: 'Glauber’s salt.' },
  { salt: 'ZnSO4', name: 'zinc sulfate', n: 7 },
  { salt: 'FeSO4', name: 'iron(II) sulfate', n: 7, note: 'Pale green crystals.' },
  { salt: 'NiCl2', name: 'nickel(II) chloride', n: 6, note: 'Green crystals.' },
  { salt: 'SrCl2', name: 'strontium chloride', n: 6, note: 'Turns a flame red.' },
  { salt: 'MgCl2', name: 'magnesium chloride', n: 6 },
  { salt: 'CuCl2', name: 'copper(II) chloride', n: 2, note: 'Blue-green crystals.' },
  { salt: 'Na2S2O3', name: 'sodium thiosulfate', n: 5 },
  { salt: 'CaSO4', name: 'calcium sulfate', n: 2, note: 'Gypsum, in drywall.' },
  { salt: 'Ba(OH)2', name: 'barium hydroxide', n: 8 },
  { salt: 'Sr(OH)2', name: 'strontium hydroxide', n: 8 },
  { salt: 'LiCl', name: 'lithium chloride', n: 1 },
  { salt: 'MnSO4', name: 'manganese(II) sulfate', n: 1, note: 'Pale pink crystals.' },
  { salt: 'Fe(NO3)3', name: 'iron(III) nitrate', n: 9, note: 'Pale violet crystals.' },
  { salt: 'Al(NO3)3', name: 'aluminum nitrate', n: 9 },
  { salt: 'Cr(NO3)3', name: 'chromium(III) nitrate', n: 9, note: 'Dark violet crystals.' },
  { salt: 'Ca(NO3)2', name: 'calcium nitrate', n: 4 },
  { salt: 'BeSO4', name: 'beryllium sulfate', n: 4 },
  { salt: 'Mg(NO3)2', name: 'magnesium nitrate', n: 6 },
  { salt: 'NiSO4', name: 'nickel(II) sulfate', n: 6, note: 'Blue-green crystals.' },
  { salt: 'SnCl2', name: 'tin(II) chloride', n: 2 },
  { salt: 'NaC2H3O2', name: 'sodium acetate', n: 3, note: 'The “hot ice” of hand warmers.' },
  { salt: 'Pb(C2H3O2)2', name: 'lead(II) acetate', n: 3 }
];

/* Greek prefixes for the water in a hydrate's name */
var PREFIXES = ['mono', 'di', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa', 'nona', 'deca'];

var HYDROCARBONS = [
  { f: 'CH4', name: 'methane', note: 'Natural gas.' },
  { f: 'C2H6', name: 'ethane', note: 'Also in natural gas.' },
  { f: 'C3H8', name: 'propane', note: 'Grill fuel.' },
  { f: 'C4H10', name: 'butane', note: 'Lighter fuel.' },
  { f: 'C5H12', name: 'pentane', note: 'A very volatile liquid.' },
  { f: 'C6H14', name: 'hexane', note: 'A solvent.' },
  { f: 'C8H18', name: 'octane', note: 'In gasoline.' },
  { f: 'C10H22', name: 'decane', note: 'In kerosene.' },
  { f: 'C2H4', name: 'ethene (ethylene)', note: 'The gas that ripens fruit.' },
  { f: 'C3H6', name: 'propene', note: 'Polypropylene is made from it.' },
  { f: 'C5H10', name: 'cyclopentane', note: 'A ring of five CH₂ groups.' },
  { f: 'C6H12', name: 'cyclohexane', note: 'A ring of six CH₂ groups.' },
  { f: 'C2H2', name: 'ethyne (acetylene)', note: 'The fuel of a welding torch.' },
  { f: 'C6H6', name: 'benzene', note: 'A ring of six carbon atoms.' },
  { f: 'C8H8', name: 'styrene', note: 'Polystyrene is made from it.' },
  { f: 'C3H4', name: 'propyne', note: 'A fuel gas for cutting metal.' },
  { f: 'C4H6', name: '1,3-butadiene', note: 'Synthetic rubber is made from it.' },
  { f: 'C8H12', name: '1,5-cyclooctadiene', note: 'A ring of eight carbon atoms with two double bonds.' },
  { f: 'C5H8', name: 'isoprene', note: 'Natural rubber is made of it.' },
  { f: 'C6H10', name: 'cyclohexene', note: 'A ring with one double bond.' },
  { f: 'C8H10', name: 'xylene', note: 'A solvent in paints and markers.' },
  { f: 'C10H8', name: 'naphthalene', note: 'Mothballs.' },
  { f: 'C12H10', name: 'biphenyl', note: 'Two benzene rings joined.' },
  { f: 'C14H10', name: 'anthracene', note: 'Three benzene rings joined side by side.' },
  { f: 'C9H12', name: 'mesitylene', note: 'A benzene ring with three CH₃ groups.' },
  { f: 'C10H14', name: 'durene', note: 'A benzene ring with four CH₃ groups.' }
];

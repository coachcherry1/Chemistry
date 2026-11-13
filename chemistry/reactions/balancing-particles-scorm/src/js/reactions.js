/* reactions.js: every substance and every reaction of the activity.
 *
 * SUBSTANCES: formula -> [name, tree]. The tree says which atom touches which
 * in the particle drawing: an atom, then each neighbour in brackets, so
 * water is O(H)(H). The validator checks that every tree has exactly the
 * atoms of its formula. Ionic compounds are drawn as one formula unit.
 *
 * REACTIONS: formulas only. The coefficients are never written here: Chem.balance
 * works them out. type is for the classifying package (S synthesis, D
 * decomposition, SR single replacement, DR double replacement, C combustion,
 * N neutralization; the teacher's rules: one product is a synthesis, one
 * reactant a decomposition, acid + base a neutralization, a compound of C and
 * H burning to CO2 and H2O a combustion). level 1 to 3. lesson: used by a
 * lesson step, so never in the graded set. big: too many particles for this
 * package's graded set (kept for the classifying package).
 */
var Rx = (function () {
  'use strict';

  function alkane(n) {
    if (n === 1) return 'C(H)(H)(H)(H)';
    var t = 'C(H)(H)(H)';
    for (var i = 1; i < n; i++) t = (i === n - 1 ? 'C(H)(H)(H)(' : 'C(H)(') + t + (i === n - 1 ? ')' : ')(H)');
    return t;
  }
  var NO3 = 'O(N(O)(O))';

  var SUBSTANCES = {
    /* elements */
    'H2': ['hydrogen', 'H(H)'], 'O2': ['oxygen', 'O(O)'], 'N2': ['nitrogen', 'N(N)'], 'F2': ['fluorine', 'F(F)'],
    'Cl2': ['chlorine', 'Cl(Cl)'], 'Br2': ['bromine', 'Br(Br)'], 'I2': ['iodine', 'I(I)'], 'P4': ['phosphorus', 'P(P)(P)(P)'],
    'Li': ['lithium', 'Li'], 'Na': ['sodium', 'Na'], 'K': ['potassium', 'K'], 'Mg': ['magnesium', 'Mg'], 'Ca': ['calcium', 'Ca'],
    'Al': ['aluminum', 'Al'], 'Fe': ['iron', 'Fe'], 'Cu': ['copper', 'Cu'], 'Zn': ['zinc', 'Zn'], 'Hg': ['mercury', 'Hg'],
    /* molecules */
    'H2O': ['water', 'O(H)(H)'], 'H2O2': ['hydrogen peroxide', 'O(H)(O(H))'], 'NH3': ['ammonia', 'N(H)(H)(H)'],
    'HCl': ['hydrogen chloride', 'Cl(H)'], 'CO': ['carbon monoxide', 'C(O)'], 'CO2': ['carbon dioxide', 'C(O)(O)'],
    'NO': ['nitrogen monoxide', 'N(O)'], 'NO2': ['nitrogen dioxide', 'N(O)(O)'], 'N2O': ['dinitrogen monoxide', 'N(N)(O)'],
    'N2O5': ['dinitrogen pentoxide', 'O(N(O)(O))(N(O)(O))'], 'SO2': ['sulfur dioxide', 'S(O)(O)'], 'SO3': ['sulfur trioxide', 'S(O)(O)(O)'],
    'P4O10': ['tetraphosphorus decoxide', 'P(O)(O)(O(P(O)(O(P(O)(O)(O(P(O)(O)))))))'], 'HNO3': ['nitric acid', 'N(O(H))(O)(O)'], 'PCl5': ['phosphorus pentachloride', 'P(Cl)(Cl)(Cl)(Cl)(Cl)'],
    'CH4': ['methane', alkane(1)], 'C2H6': ['ethane', alkane(2)], 'C3H8': ['propane', alkane(3)], 'C4H10': ['butane', alkane(4)],
    'C5H12': ['pentane', alkane(5)], 'C2H4': ['ethene', 'C(H)(H)(C(H)(H))'], 'C2H5OH': ['ethanol', 'C(H)(H)(H)(C(H)(O(H))(H))'],
    'C3H5(NO3)3': ['nitroglycerin', 'C(H)(H)(' + NO3 + ')(C(H)(C(H)(H)(' + NO3 + '))(' + NO3 + '))'],
    'H2SO4': ['sulfuric acid', 'S(O(H))(O)(O(H))(O)'], 'H3PO4': ['phosphoric acid', 'P(O(H))(O(H))(O(H))(O)'],
    /* ionic compounds, one formula unit each */
    'NaCl': ['sodium chloride', 'Na(Cl)'], 'KBr': ['potassium bromide', 'K(Br)'], 'KCl': ['potassium chloride', 'K(Cl)'],
    'KI': ['potassium iodide', 'K(I)'], 'LiF': ['lithium fluoride', 'Li(F)'], 'AgCl': ['silver chloride', 'Ag(Cl)'],
    'MgO': ['magnesium oxide', 'Mg(O)'], 'CaO': ['calcium oxide', 'Ca(O)'], 'CuO': ['copper(II) oxide', 'Cu(O)'], 'HgO': ['mercury(II) oxide', 'Hg(O)'],
    'MgCl2': ['magnesium chloride', 'Mg(Cl)(Cl)'], 'CaCl2': ['calcium chloride', 'Ca(Cl)(Cl)'], 'ZnCl2': ['zinc chloride', 'Zn(Cl)(Cl)'],
    'CuCl2': ['copper(II) chloride', 'Cu(Cl)(Cl)'], 'BaCl2': ['barium chloride', 'Ba(Cl)(Cl)'], 'PbI2': ['lead(II) iodide', 'Pb(I)(I)'],
    'AlCl3': ['aluminum chloride', 'Al(Cl)(Cl)(Cl)'], 'Li3N': ['lithium nitride', 'N(Li)(Li)(Li)'], 'Mg3N2': ['magnesium nitride', 'Mg(N(Mg))(N(Mg))'],
    'Al2O3': ['aluminum oxide', 'O(Al(O))(Al(O))'], 'Fe2O3': ['iron(III) oxide', 'O(Fe(O))(Fe(O))'], 'Fe3O4': ['iron(II,III) oxide', 'Fe(O(Fe(O)))(O(Fe(O)))'],
    'NaOH': ['sodium hydroxide', 'O(Na)(H)'], 'Ca(OH)2': ['calcium hydroxide', 'Ca(O(H))(O(H))'], 'Al(OH)3': ['aluminum hydroxide', 'Al(O(H))(O(H))(O(H))'],
    'KClO3': ['potassium chlorate', 'Cl(O(K))(O)(O)'], 'KNO3': ['potassium nitrate', 'N(O(K))(O)(O)'], 'KNO2': ['potassium nitrite', 'N(O(K))(O)'],
    'AgNO3': ['silver nitrate', 'N(O(Ag))(O)(O)'], 'Ca(NO3)2': ['calcium nitrate', 'Ca(' + NO3 + ')(' + NO3 + ')'],
    'Pb(NO3)2': ['lead(II) nitrate', 'Pb(' + NO3 + ')(' + NO3 + ')'], 'NH4NO3': ['ammonium nitrate', 'N(H)(H)(H)(H(' + NO3 + '))'],
    'CaCO3': ['calcium carbonate', 'C(O(Ca))(O)(O)'], 'Na2SO4': ['sodium sulfate', 'S(O(Na))(O)(O(Na))(O)'], 'BaSO4': ['barium sulfate', 'S(O(Ba))(O)(O)(O)'],
    'NaC2H3O2': ['sodium acetate', 'C(H)(H)(H)(C(O)(O(Na)))'],
    'Ca(C2H3O2)2': ['calcium acetate', 'Ca(O(C(O)(C(H)(H)(H))))(O(C(O)(C(H)(H)(H))))'],
    'CuSO4': ['copper(II) sulfate', 'S(O(Cu))(O)(O)(O)'], 'Cu(OH)2': ['copper(II) hydroxide', 'Cu(O(H))(O(H))'],
    'Mg(NO3)2': ['magnesium nitrate', 'Mg(' + NO3 + ')(' + NO3 + ')'], 'Ag': ['silver', 'Ag'],
    'Zn3(PO4)2': ['zinc phosphate', 'P(O(Zn))(O)(O(Zn(O(P(O)(O(Zn))(O)))))(O)'],
    'Na3PO4': ['sodium phosphate', 'P(O(Na))(O(Na))(O(Na))(O)'],
    'Ca3(PO4)2': ['calcium phosphate', 'P(O(Ca))(O)(O(Ca(O(P(O)(O(Ca))(O)))))(O)'],
    'Al2(SO4)3': ['aluminum sulfate', 'Al(O(S(O)(O)(O(Al(O(S(O)(O)(O)))))))(O(S(O)(O)(O)))']
  };

  function rx(id, eq, type, level, flag) {
    var sides = eq.split(' -> ');
    var o = { id: id, l: sides[0].split(' + '), r: sides[1].split(' + '), type: type, level: level };
    if (flag) o[flag] = true;
    return o;
  }

  var REACTIONS = [
    rx('water', 'H2 + O2 -> H2O', 'S', 1, 'lesson'),
    rx('ammonia', 'N2 + H2 -> NH3', 'S', 1, 'lesson'),
    rx('methane', 'CH4 + O2 -> CO2 + H2O', 'C', 2, 'lesson'),
    rx('rust', 'Fe + O2 -> Fe2O3', 'S', 2, 'lesson'),
    rx('acetate', 'Na3PO4 + Ca(C2H3O2)2 -> Ca3(PO4)2 + NaC2H3O2', 'DR', 3, 'lesson'),
    rx('h3po4', 'P4O10 + H2O -> H3PO4', 'S', 2, 'lesson'),
    rx('hcl', 'H2 + Cl2 -> HCl', 'S', 1),
    rx('nacl', 'Na + Cl2 -> NaCl', 'S', 1),
    rx('mgo', 'Mg + O2 -> MgO', 'S', 1),
    rx('kbr', 'K + Br2 -> KBr', 'S', 1),
    rx('lif', 'Li + F2 -> LiF', 'S', 1),
    rx('cao', 'Ca + O2 -> CaO', 'S', 1),
    rx('cuo', 'Cu + O2 -> CuO', 'S', 1),
    rx('no', 'N2 + O2 -> NO', 'S', 1),
    rx('co2', 'CO + O2 -> CO2', 'S', 1),
    rx('so3', 'SO2 + O2 -> SO3', 'S', 1),
    rx('no2', 'NO + O2 -> NO2', 'S', 1),
    rx('peroxide', 'H2O2 -> H2O + O2', 'D', 1),
    rx('hgo', 'HgO -> Hg + O2', 'D', 1),
    rx('electrolysis', 'H2O -> H2 + O2', 'D', 1),
    rx('hno3', 'N2O5 + H2O -> HNO3', 'S', 1),
    rx('nh4no3', 'NH4NO3 -> N2O + H2O', 'D', 1),
    rx('znhcl', 'Zn + HCl -> ZnCl2 + H2', 'SR', 1),
    rx('mghcl', 'Mg + HCl -> MgCl2 + H2', 'SR', 1),
    rx('mgagno3', 'Mg + AgNO3 -> Mg(NO3)2 + Ag', 'SR', 1),
    rx('alcl3', 'Al + Cl2 -> AlCl3', 'S', 2),
    rx('al2o3', 'Al + O2 -> Al2O3', 'S', 2),
    rx('mg3n2', 'Mg + N2 -> Mg3N2', 'S', 2),
    rx('li3n', 'Li + N2 -> Li3N', 'S', 2),
    rx('p4o10', 'P4 + O2 -> P4O10', 'S', 2),
    rx('kclo3', 'KClO3 -> KCl + O2', 'D', 2),
    rx('kno3', 'KNO3 -> KNO2 + O2', 'D', 2),
    rx('n2o5', 'N2O5 -> NO2 + O2', 'D', 2),
    rx('nawater', 'Na + H2O -> NaOH + H2', 'SR', 2),
    rx('cl2ki', 'Cl2 + KI -> KCl + I2', 'SR', 2),
    rx('alcucl2', 'Al + CuCl2 -> AlCl3 + Cu', 'SR', 2),
    rx('alcuso4', 'Al + CuSO4 -> Al2(SO4)3 + Cu', 'SR', 2),
    rx('cuoh2', 'NaOH + CuSO4 -> Cu(OH)2 + Na2SO4', 'DR', 2),
    rx('al2so43', 'Al2(SO4)3 -> Al2O3 + SO3', 'D', 2),
    rx('agcl', 'AgNO3 + CaCl2 -> AgCl + Ca(NO3)2', 'DR', 2),
    rx('pbi2', 'Pb(NO3)2 + KI -> PbI2 + KNO3', 'DR', 2),
    rx('naohh2so4', 'NaOH + H2SO4 -> Na2SO4 + H2O', 'N', 2, 'lesson'),
    rx('caoh2hcl', 'Ca(OH)2 + HCl -> CaCl2 + H2O', 'N', 2),
    rx('ethene', 'C2H4 + O2 -> CO2 + H2O', 'C', 2),
    rx('propane', 'C3H8 + O2 -> CO2 + H2O', 'C', 2),
    rx('ethanol', 'C2H5OH + O2 -> CO2 + H2O', 'C', 2),
    rx('fe2o3co', 'Fe2O3 + CO -> Fe + CO2', '', 2),
    rx('caco3hcl', 'CaCO3 + HCl -> CaCl2 + H2O + CO2', 'DR', 2),
    rx('alhcl', 'Al + HCl -> AlCl3 + H2', 'SR', 3),
    rx('fe3o4', 'Fe + H2O -> Fe3O4 + H2', 'SR', 3),
    rx('ethane', 'C2H6 + O2 -> CO2 + H2O', 'C', 3),
    rx('pentane', 'C5H12 + O2 -> CO2 + H2O', 'C', 3),
    rx('nh3o2', 'NH3 + O2 -> NO + H2O', '', 3),
    rx('znh3po4', 'Zn + H3PO4 -> Zn3(PO4)2 + H2', 'SR', 3),
    rx('pcl5', 'PCl5 + H2O -> H3PO4 + HCl', '', 3),
    rx('h3po4naoh', 'H3PO4 + NaOH -> Na3PO4 + H2O', 'N', 3),
    rx('aloh3h2so4', 'Al(OH)3 + H2SO4 -> Al2(SO4)3 + H2O', 'N', 3),
    rx('caoh2h3po4', 'Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O', 'N', 3),
    rx('ca3po42', 'Na3PO4 + CaCl2 -> Ca3(PO4)2 + NaCl', 'DR', 3),
    rx('baso4', 'Al2(SO4)3 + BaCl2 -> BaSO4 + AlCl3', 'DR', 3),
    rx('butane', 'C4H10 + O2 -> CO2 + H2O', 'C', 3, 'big'),
    rx('nitroglycerin', 'C3H5(NO3)3 -> CO2 + H2O + N2 + O2', 'D', 3, 'big')
  ];

  var byId = {};
  REACTIONS.forEach(function (r) { byId[r.id] = r; });

  return {
    SUBSTANCES: SUBSTANCES, REACTIONS: REACTIONS,
    get: function (id) { return byId[id]; },
    name: function (f) { return SUBSTANCES[f][0]; },
    tree: function (f) { return SUBSTANCES[f][1]; }
  };
})();

if (typeof module !== 'undefined') module.exports = Rx;

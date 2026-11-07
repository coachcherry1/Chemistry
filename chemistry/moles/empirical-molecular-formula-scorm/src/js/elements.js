/* elements.js: the periodic table on screen.
 *
 * std is the IUPAC standard atomic weight as a string, so it can be rounded
 * exactly (no binary fractions). The table students see shows each mass
 * rounded to the tenths place, the class's standard; chem.js does the
 * rounding. A bracketed mass is the mass number of the longest-lived isotope
 * of a radioactive element: shown as it is, never used in a problem.
 *
 * Periods 1 to 6 only, with lanthanum in group 3; the lanthanides and period
 * 7 are not needed for any molar mass here.
 *
 * [symbol, atomic number, name, std, group, period]
 */
var ELEMENTS = (function () {
  'use strict';
  var rows = [
    ['H', 1, 'hydrogen', '1.008', 1, 1],
    ['He', 2, 'helium', '4.0026', 18, 1],
    ['Li', 3, 'lithium', '6.94', 1, 2],
    ['Be', 4, 'beryllium', '9.0122', 2, 2],
    ['B', 5, 'boron', '10.81', 13, 2],
    ['C', 6, 'carbon', '12.011', 14, 2],
    ['N', 7, 'nitrogen', '14.007', 15, 2],
    ['O', 8, 'oxygen', '15.999', 16, 2],
    ['F', 9, 'fluorine', '18.998', 17, 2],
    ['Ne', 10, 'neon', '20.180', 18, 2],
    ['Na', 11, 'sodium', '22.990', 1, 3],
    ['Mg', 12, 'magnesium', '24.305', 2, 3],
    ['Al', 13, 'aluminum', '26.982', 13, 3],
    ['Si', 14, 'silicon', '28.085', 14, 3],
    ['P', 15, 'phosphorus', '30.974', 15, 3],
    ['S', 16, 'sulfur', '32.06', 16, 3],
    ['Cl', 17, 'chlorine', '35.45', 17, 3],
    ['Ar', 18, 'argon', '39.948', 18, 3],
    ['K', 19, 'potassium', '39.098', 1, 4],
    ['Ca', 20, 'calcium', '40.078', 2, 4],
    ['Sc', 21, 'scandium', '44.956', 3, 4],
    ['Ti', 22, 'titanium', '47.867', 4, 4],
    ['V', 23, 'vanadium', '50.942', 5, 4],
    ['Cr', 24, 'chromium', '51.996', 6, 4],
    ['Mn', 25, 'manganese', '54.938', 7, 4],
    ['Fe', 26, 'iron', '55.845', 8, 4],
    ['Co', 27, 'cobalt', '58.933', 9, 4],
    ['Ni', 28, 'nickel', '58.693', 10, 4],
    ['Cu', 29, 'copper', '63.546', 11, 4],
    ['Zn', 30, 'zinc', '65.38', 12, 4],
    ['Ga', 31, 'gallium', '69.723', 13, 4],
    ['Ge', 32, 'germanium', '72.630', 14, 4],
    ['As', 33, 'arsenic', '74.922', 15, 4],
    ['Se', 34, 'selenium', '78.971', 16, 4],
    ['Br', 35, 'bromine', '79.904', 17, 4],
    ['Kr', 36, 'krypton', '83.798', 18, 4],
    ['Rb', 37, 'rubidium', '85.468', 1, 5],
    ['Sr', 38, 'strontium', '87.62', 2, 5],
    ['Y', 39, 'yttrium', '88.906', 3, 5],
    ['Zr', 40, 'zirconium', '91.224', 4, 5],
    ['Nb', 41, 'niobium', '92.906', 5, 5],
    ['Mo', 42, 'molybdenum', '95.95', 6, 5],
    ['Tc', 43, 'technetium', '(98)', 7, 5],
    ['Ru', 44, 'ruthenium', '101.07', 8, 5],
    ['Rh', 45, 'rhodium', '102.91', 9, 5],
    ['Pd', 46, 'palladium', '106.42', 10, 5],
    ['Ag', 47, 'silver', '107.87', 11, 5],
    ['Cd', 48, 'cadmium', '112.41', 12, 5],
    ['In', 49, 'indium', '114.82', 13, 5],
    ['Sn', 50, 'tin', '118.71', 14, 5],
    ['Sb', 51, 'antimony', '121.76', 15, 5],
    ['Te', 52, 'tellurium', '127.60', 16, 5],
    ['I', 53, 'iodine', '126.90', 17, 5],
    ['Xe', 54, 'xenon', '131.29', 18, 5],
    ['Cs', 55, 'cesium', '132.91', 1, 6],
    ['Ba', 56, 'barium', '137.33', 2, 6],
    ['La', 57, 'lanthanum', '138.91', 3, 6],
    ['Hf', 72, 'hafnium', '178.49', 4, 6],
    ['Ta', 73, 'tantalum', '180.95', 5, 6],
    ['W', 74, 'tungsten', '183.84', 6, 6],
    ['Re', 75, 'rhenium', '186.21', 7, 6],
    ['Os', 76, 'osmium', '190.23', 8, 6],
    ['Ir', 77, 'iridium', '192.22', 9, 6],
    ['Pt', 78, 'platinum', '195.08', 10, 6],
    ['Au', 79, 'gold', '196.97', 11, 6],
    ['Hg', 80, 'mercury', '200.59', 12, 6],
    ['Tl', 81, 'thallium', '204.38', 13, 6],
    ['Pb', 82, 'lead', '207.2', 14, 6],
    ['Bi', 83, 'bismuth', '208.98', 15, 6],
    ['Po', 84, 'polonium', '(209)', 16, 6],
    ['At', 85, 'astatine', '(210)', 17, 6],
    ['Rn', 86, 'radon', '(222)', 18, 6]
  ];
  var out = {};
  rows.forEach(function (r) {
    out[r[0]] = { sym: r[0], z: r[1], name: r[2], std: r[3], group: r[4], period: r[5] };
  });
  return out;
})();

/* data.js: the elements and their successive ionization energies. No DOM.
 *
 * Every value is in kJ/mol and matches the class packet wherever the packet
 * prints one:
 *   part5      all values exactly as printed in Part 5 (the X, Y, Z table and
 *              question 5.3). Na, Mg, Al and Be.
 *   part2+ref  1st ionization energy from the Part 2 data table; the later
 *              ones are standard reference values (CRC / NIST), rounded to
 *              the nearest whole kJ/mol.
 *
 * Part 2 and Part 5 of the packet disagree by 1 or 2 kJ/mol for Na, Mg, Al
 * and Be (Part 2 lists 495, 737, 576, 898). Part 5 is the successive
 * ionization page, so its values win here.
 *
 * Only elements 1 to 20 appear, the same set as the packet's data tables.
 */

var DATA = (function () {
  'use strict';

  var SYMBOLS = ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
                 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca'];

  var NAMES = ['hydrogen', 'helium', 'lithium', 'beryllium', 'boron', 'carbon', 'nitrogen',
               'oxygen', 'fluorine', 'neon', 'sodium', 'magnesium', 'aluminum', 'silicon',
               'phosphorus', 'sulfur', 'chlorine', 'argon', 'potassium', 'calcium'];

  /* Successive ionization energies, 1st first. */
  var IE = {
    Li: { src: 'part2+ref', ie: [519, 7298, 11815] },
    Be: { src: 'part5',     ie: [899, 1757, 14849, 21007] },
    B:  { src: 'part2+ref', ie: [799, 2427, 3660, 25026, 32827] },
    C:  { src: 'part2+ref', ie: [1080, 2353, 4621, 6223, 37831] },
    Na: { src: 'part5',     ie: [496, 4562, 6910, 9544, 13354] },
    Mg: { src: 'part5',     ie: [738, 1451, 7733, 10542, 13631] },
    Al: { src: 'part5',     ie: [578, 1817, 2745, 11577, 14842] },
    Si: { src: 'part2+ref', ie: [785, 1577, 3232, 4356, 16091] },
    P:  { src: 'part2+ref', ie: [1010, 1907, 2914, 4964, 6274, 21267] },
    S:  { src: 'part2+ref', ie: [990, 2252, 3357, 4556, 7004, 8496, 27107] },
    K:  { src: 'part2+ref', ie: [418, 3052, 4420, 5877, 7975] },
    Ca: { src: 'part2+ref', ie: [590, 1145, 4912, 6491, 8153] }
  };

  /* Which elements each kind of question may use.
     STRIP   Part 1. Group 1 and 2 only: the steps before and after the jump
             are all clearly small, so "small step or huge jump?" is never a
             judgement call.
     FULL    mystery elements shown with the jump in the data.
     HIDDEN  mystery elements shown with only four values, so the jump is not
             in the data yet.
     PAIRS   "which has the larger kth ionization energy?" The first element
             has already emptied its outer level at that point; the second
             has not. Step 1 decides every one of them. */
  var STRIP = ['Na', 'Mg', 'K', 'Ca'];
  var FULL = ['Li', 'Be', 'B', 'C', 'Na', 'Mg', 'Al', 'Si', 'P', 'K', 'Ca'];
  var HIDDEN = ['C', 'Si', 'P', 'S'];
  var HIDDEN_SHOWN = 4;
  var PAIRS = [['Li', 'Be', 2], ['Na', 'Mg', 2], ['K', 'Ca', 2], ['Be', 'B', 3],
               ['Mg', 'Al', 3], ['B', 'C', 4], ['Al', 'Si', 4]];

  /* Elements whose positive ion the activity may name. Only metals form the
     ion the jump points to; boron, carbon, silicon and phosphorus do not. */
  var METALS = ['Li', 'Be', 'Na', 'Mg', 'Al', 'K', 'Ca'];

  function z(sym) { return SYMBOLS.indexOf(sym) + 1; }

  return {
    SYMBOLS: SYMBOLS, NAMES: NAMES, IE: IE,
    STRIP: STRIP, FULL: FULL, HIDDEN: HIDDEN, HIDDEN_SHOWN: HIDDEN_SHOWN, PAIRS: PAIRS,
    METALS: METALS,
    z: z,
    name: function (sym) { return NAMES[z(sym) - 1]; }
  };
})();

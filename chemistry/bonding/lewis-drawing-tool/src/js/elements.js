/* elements.js — the main-group elements, periods 1–5.
 *
 * valence  the electrons a neutral atom brings (its group, 1–8; He 2)
 * period   only a central atom from period 3 or below can have more than 8
 * metal    group 1 and 2 metals (not Be) and Al: a formula with one of these
 *          is drawn as an ionic dot diagram, [Na]⁺ [:Cl:]⁻
 * stable   the incomplete-octet exceptions of the 5 rules: B is stable with 6
 *          electrons and Be with 4
 *
 * COLORS are the element colors of the drawings (the same as the Lewis and
 * resonance activities), for a white page and for a dark slide. "Color
 * atoms" off draws every symbol in plain ink instead.
 */

var ELEMENTS = (function () {
  var rows = [
    ['H', '', '', '', '', '', '', 'He'],
    ['Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne'],
    ['Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar'],
    ['K', 'Ca', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr'],
    ['Rb', 'Sr', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe']
  ];
  var groups = [1, 2, 13, 14, 15, 16, 17, 18];
  var out = {};
  rows.forEach(function (row, p) {
    row.forEach(function (el, g) {
      if (!el) return;
      out[el] = { period: p + 1, group: groups[g], valence: el === 'He' ? 2 : g + 1,
                  metal: (g < 2 && el !== 'H' && el !== 'Be') || el === 'Al' };
    });
  });
  out.B.stable = 6;
  out.Be.stable = 4;
  return out;
})();

/* the table the element picker shows: main groups, periods 1–5 */
var PERIODIC = {
  groups: [1, 2, 13, 14, 15, 16, 17, 18],
  rows: [
    ['H', '', '', '', '', '', '', 'He'],
    ['Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne'],
    ['Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar'],
    ['K', 'Ca', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr'],
    ['Rb', 'Sr', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe']
  ]
};

var COLORS = {
  light: { ink: '#12212e', H: '#4b5966', N: '#2f62cc', O: '#c9302a', F: '#2e7d32', Cl: '#1e7b48', Br: '#9a2f24',
           I: '#7a3a9e', S: '#8a6d00', P: '#b4501f', B: '#a0522d', Be: '#4f7a28', Xe: '#1b7f8c', Se: '#8a6d00',
           Si: '#5b6770', Na: '#5b4fc4', K: '#5b4fc4', Li: '#5b4fc4', Mg: '#2f7d6b', Ca: '#2f7d6b', Al: '#5b6770' },
  dark:  { ink: '#f2f6fa', H: '#c3cfd9', N: '#8fb3ff', O: '#ff8a80', F: '#8be08f', Cl: '#6ee0a0', Br: '#ff9d8f',
           I: '#d6a6f5', S: '#f0d060', P: '#ffab7a', B: '#f0b07f', Be: '#b5e08a', Xe: '#6fe3ee', Se: '#f0d060',
           Si: '#c4ccd3', Na: '#b9b0ff', K: '#b9b0ff', Li: '#b9b0ff', Mg: '#7fe0c8', Ca: '#7fe0c8', Al: '#c4ccd3' }
};

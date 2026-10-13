/* elements.js — the main-group elements the activity uses, and the periodic
 * table students see.
 *
 * `valence` is what Rule 1 adds up. `period` decides what happens when a
 * student tries to give a central atom more than 8 electrons: a period-2 atom
 * just gets told it can't, a period-3-or-below atom gets the anti-AI speech.
 * `en` (Pauling) is only used by tools/validate.js, to check that "the first
 * atom written, not counting H" really is the least electronegative one in
 * every formula the activity uses.
 */

var ELEMENTS = {
  H:  { name: 'hydrogen',   group: 1,  period: 1, valence: 1, en: 2.20 },
  C:  { name: 'carbon',     group: 14, period: 2, valence: 4, en: 2.55 },
  N:  { name: 'nitrogen',   group: 15, period: 2, valence: 5, en: 3.04 },
  O:  { name: 'oxygen',     group: 16, period: 2, valence: 6, en: 3.44 },
  F:  { name: 'fluorine',   group: 17, period: 2, valence: 7, en: 3.98 },
  P:  { name: 'phosphorus', group: 15, period: 3, valence: 5, en: 2.19 },
  S:  { name: 'sulfur',     group: 16, period: 3, valence: 6, en: 2.58 },
  Cl: { name: 'chlorine',   group: 17, period: 3, valence: 7, en: 3.16 },
  Br: { name: 'bromine',    group: 17, period: 4, valence: 7, en: 2.96 },
  I:  { name: 'iodine',     group: 17, period: 5, valence: 7, en: 2.66 }
};

/* The periodic table in the reference panel: main groups only, periods 1–5.
   Group numbers are shown both ways (1–18 and 1A–8A); valence electrons are
   NOT shown — working them out from the group is part of Rule 1. */
var PERIODIC = {
  groups: [1, 2, 13, 14, 15, 16, 17, 18],
  groupsA: ['1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A'],
  rows: [
    ['H',  '',   '',   '',   '',   '',   '',   'He'],
    ['Li', 'Be', 'B',  'C',  'N',  'O',  'F',  'Ne'],
    ['Na', 'Mg', 'Al', 'Si', 'P',  'S',  'Cl', 'Ar'],
    ['K',  'Ca', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr'],
    ['Rb', 'Sr', 'In', 'Sn', 'Sb', 'Te', 'I',  'Xe']
  ]
};

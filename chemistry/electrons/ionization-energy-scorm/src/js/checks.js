/* checks.js: the check-for-understanding bank. No DOM.
 *
 * a[0] is the right answer; the options are shuffled when shown. `why` is
 * shown after every answer, right or wrong. Each tag has at least three
 * questions, so a missed check can come back as a different question on the
 * same idea.
 *
 * Tags
 *   eq     what the kth ionization energy removes, as an equation
 *   small  why each one costs a little more: the particle is more positive
 *   occ    occupied energy levels after electrons come off
 *   cause  explaining the jump with occupied levels, not size or wanting
 *   ion    reading the ion and the group from the data
 *
 * Wording follows the class packet: occupied energy levels, row (not
 * period), Step 1 and Step 2, and the two proportionality statements.
 */

var Checks = (function () {
  'use strict';

  var BANK = [
    /* ----------------------------------------------------------------- eq */
    { id: 'eq1', tag: 'eq', q: 'Which equation represents the 3rd ionization energy of aluminum?',
      a: ['Al²⁺(g) + energy → Al³⁺(g) + e⁻',
          'Al(g) + energy → Al³⁺(g) + 3e⁻',
          'Al⁺(g) + energy → Al²⁺(g) + e⁻',
          'Al³⁺(g) + energy → Al⁴⁺(g) + e⁻'],
      why: 'Each ionization energy removes one electron. The 3rd one starts from Al²⁺, which has already lost two, and leaves Al³⁺.' },
    { id: 'eq2', tag: 'eq', q: 'Which equation represents the 2nd ionization energy of magnesium?',
      a: ['Mg⁺(g) + energy → Mg²⁺(g) + e⁻',
          'Mg(g) + energy → Mg²⁺(g) + 2e⁻',
          'Mg(g) + energy → Mg⁺(g) + e⁻',
          'Mg²⁺(g) + energy → Mg³⁺(g) + e⁻'],
      why: 'The 2nd ionization energy starts from the 1+ ion and removes one more electron. Mg(g) → Mg⁺(g) is the 1st.' },
    { id: 'eq3', tag: 'eq', q: 'A classmate says the 2nd ionization energy of sodium is the energy to remove an electron from a second sodium atom. What is wrong with that?',
      a: ['It removes a second electron from the same particle, Na⁺, not from another atom',
          'Nothing. That is correct',
          'It removes two electrons at once from one sodium atom',
          'It puts an electron back onto Na⁺'],
      why: 'Na⁺(g) + energy → Na²⁺(g) + e⁻. The 2nd ionization energy always starts from the ion the 1st one left behind.' },
    { id: 'eq4', tag: 'eq', q: 'Which particle does the 4th ionization energy of silicon start from?',
      a: ['Si³⁺', 'Si', 'Si⁴⁺', 'Si⁴⁻'],
      why: 'Three electrons are already gone, so the 4th ionization energy pulls an electron off Si³⁺ and leaves Si⁴⁺.' },

    /* -------------------------------------------------------------- small */
    { id: 'sm1', tag: 'small', q: 'Magnesium’s first two electrons both come from occupied level 3. Why does the 2nd one (1451 kJ/mol) cost more than the 1st (738 kJ/mol)?',
      a: ['Mg⁺ is more positive. The same 12 protons now hold only 11 electrons, so each one left is pulled harder',
          'Mg⁺ has more protons than Mg',
          'Mg⁺ has fewer occupied energy levels than Mg',
          'The 2nd electron wants to stay with the atom'],
      why: 'Step 1 is a tie (both electrons come from level 3) and Step 2 is a tie (12 protons both times). What changed is the particle: each removal leaves it more positive, so the next electron costs a little more. A small step, not a jump.' },
    { id: 'sm2', tag: 'small', q: 'Sodium’s 2nd, 3rd and 4th ionization energies (4562, 6910, 9544) all pull electrons from occupied level 2. Why does each one still cost more than the one before?',
      a: ['Each removal leaves the particle more positive, so the electrons that are left are held more tightly',
          'Each removal adds a proton to the nucleus',
          'Each electron comes from a level farther out than the last',
          'Each removal adds a new occupied energy level'],
      why: 'Same occupied level and the same 11 protons every time. The particle goes Na⁺, Na²⁺, Na³⁺, more positive each time, so each step goes up a little.' },
    { id: 'sm3', tag: 'small', q: 'Which statement is true for every element?',
      a: ['Each ionization energy is larger than the one before it',
          'The huge jump always comes after the 2nd ionization energy',
          'Ionization energies go down once the outer level is empty',
          'The 1st ionization energy is always the largest'],
      why: 'Every removal leaves a more positive particle, so the cost always goes up. Where the huge jump lands depends on how many electrons are in the outer level.' },
    { id: 'sm4', tag: 'small', q: 'Removing an electron from Mg to make Mg⁺ changes which of these?',
      a: ['The number of electrons, so the particle becomes more positive',
          'The number of protons in the nucleus',
          'The element: Mg⁺ is sodium',
          'Nothing at all'],
      why: 'The nucleus never changes during ionization. Mg, Mg⁺ and Mg²⁺ all have 12 protons. Only the electron count drops, which is why each particle is more positive than the last.' },

    /* ---------------------------------------------------------------- occ */
    { id: 'oc1', tag: 'occ', q: 'Magnesium is 1s² 2s² 2p⁶ 3s². After it loses two electrons, what has happened to energy level 3?',
      a: ['It still exists, but it is empty. Mg²⁺ has 2 occupied energy levels',
          'It is gone. Mg²⁺ only has 2 energy levels',
          'It still holds electrons. Mg²⁺ has 3 occupied energy levels',
          'It moved closer to the nucleus'],
      why: 'The level did not go anywhere. It just has nothing in it any more, so Mg²⁺ (1s² 2s² 2p⁶) has two occupied energy levels. That is why its next electron is so much closer in.' },
    { id: 'oc2', tag: 'occ', q: 'Potassium is 1s² 2s² 2p⁶ 3s² 3p⁶ 4s¹. How many occupied energy levels does K⁺ have?',
      a: ['3', '4', '2', '1'],
      why: 'Removing the 4s electron empties level 4, so K⁺ is 1s² 2s² 2p⁶ 3s² 3p⁶, with 3 occupied energy levels. Level 4 still exists; it is simply unoccupied.' },
    { id: 'oc3', tag: 'occ', q: 'A classmate says Na⁺ has 3 energy levels because sodium is in row 3. What should they have said?',
      a: ['Na⁺ has 2 occupied energy levels. Level 3 exists, but it is empty',
          'Na⁺ has 3 occupied energy levels',
          'Na⁺ has 4 occupied energy levels because it is positive',
          'Na⁺ has 1 occupied energy level'],
      why: 'Na⁺ is 1s² 2s² 2p⁶. Energy levels exist whether or not they hold electrons. Only the occupied ones set the distance.' },
    { id: 'oc4', tag: 'occ', q: 'Aluminum is 1s² 2s² 2p⁶ 3s² 3p¹. Which of its electrons is the first one to come from occupied level 2?',
      a: ['The 4th', 'The 1st', 'The 2nd', 'The 3rd'],
      why: 'Aluminum has 3 electrons in level 3 (3s² 3p¹). The 1st, 2nd and 3rd come from level 3. Only the 4th has to come from level 2, which is where the jump is.' },

    /* -------------------------------------------------------------- cause */
    { id: 'ca1', tag: 'cause', q: 'A classmate writes: “The 3rd ionization energy of magnesium is huge because Mg²⁺ is a small ion.” What is wrong with that?',
      a: ['It uses the size as the cause. The cause is that the 3rd electron comes from occupied level 2, closer to the nucleus',
          'Nothing. Small ions always hold electrons tightly',
          'Mg²⁺ is actually a large ion',
          'It should say Mg²⁺ has more protons than Mg'],
      why: 'Distance means the number of occupied energy levels, never the measured radius. The small size and the huge ionization energy are both results of the same thing: the next electron is in level 2.' },
    { id: 'ca2', tag: 'cause', q: 'A classmate writes: “Sodium’s 2nd ionization energy is huge because Na⁺ has a full outer shell and wants to keep it.” How should it be explained instead?',
      a: ['The 2nd electron comes from occupied level 2, which is closer to the nucleus, so it is held much more tightly',
          'Na⁺ has more protons than Na',
          'Na⁺ is larger than Na',
          'Na⁺ has gained an energy level'],
      why: 'Atoms do not want anything. Explain it with attraction: the 2nd electron comes from the level underneath, which is closer in, and the attraction is inversely proportional to the distance squared.' },
    { id: 'ca3', tag: 'cause', q: 'Why is the huge jump so much bigger than the steps before it?',
      a: ['The distance changes. The electron now comes from a lower occupied level, and the attraction is inversely proportional to the distance squared',
          'The nucleus gains protons at that point',
          'The electron being removed is heavier',
          'The particle suddenly becomes negative'],
      why: 'Before the jump, Step 1 is a tie and only the more positive particle makes each step a little larger. At the jump the occupied level changes, so Step 1 decides, and a change in distance moves the attraction sharply.' },
    { id: 'ca4', tag: 'cause', q: 'Which step of the two-step rule explains the huge jump in magnesium’s ionization energies?',
      a: ['Step 1: the 3rd electron comes from a different occupied level than the 2nd',
          'Step 2: Mg²⁺ has more protons than Mg⁺',
          'Neither. The jump happens because Mg²⁺ wants a full shell',
          'Step 2: the protons are closer together'],
      why: 'Mg⁺ loses its electron from level 3; Mg²⁺ has to lose one from level 2. The occupied levels differ, so Step 1 settles it. The protons are 12 every time, so Step 2 never changes.' },

    /* ---------------------------------------------------------------- ion */
    { id: 'io1', tag: 'ion', q: 'Why does magnesium form Mg²⁺ and never Mg³⁺?',
      a: ['The 3rd electron sits past the jump. It comes from occupied level 2 and costs about 5 times as much as the 2nd',
          'Magnesium wants a full outer shell',
          'Magnesium only has 2 electrons',
          'Mg³⁺ would have more protons than Mg²⁺'],
      why: 'The two level 3 electrons cost 738 and 1451 kJ/mol. The 3rd has to come from level 2 and costs 7733. That jump is why magnesium stops at 2+.' },
    { id: 'io2', tag: 'ion', q: 'An element’s first four ionization energies are 590, 1145, 4912 and 6491 kJ/mol. Which ion does it form?',
      a: ['X²⁺', 'X⁺', 'X³⁺', 'X⁴⁺'],
      why: 'The jump is between the 2nd and 3rd (4912 is about 4 times 1145), so there are 2 electrons in the outer level. It loses those 2 and stops: X²⁺.' },
    { id: 'io3', tag: 'ion', q: 'An element’s huge jump comes between its 3rd and 4th ionization energies. Which group is it in?',
      a: ['Group 13', 'Group 3', 'Group 4', 'Group 14'],
      why: '3 electrons in the outer level (s² p¹) puts it in group 13. Group 3 is in the middle of the table, among the transition metals.' },
    { id: 'io4', tag: 'ion', q: 'An element in row 2 has these ionization energies: 519, 7298, 11815 kJ/mol. Which element is it?',
      a: ['Lithium', 'Beryllium', 'Sodium', 'Boron'],
      why: 'The jump is right after the 1st (7298 is about 14 times 519), so there is 1 electron in the outer level: group 1. Group 1, row 2 is lithium, 1s² 2s¹.' }
  ];

  var BY_ID = {};
  BANK.forEach(function (q) { BY_ID[q.id] = q; });

  var TAGS = ['eq', 'small', 'occ', 'cause', 'ion'];

  return {
    BANK: BANK,
    TAGS: TAGS,
    get: function (id) { return BY_ID[id] || null; },
    byTag: function (tag) { return BANK.filter(function (q) { return q.tag === tag; }); }
  };
})();

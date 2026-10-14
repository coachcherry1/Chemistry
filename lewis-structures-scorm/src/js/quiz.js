/* quiz.js — the graded checkpoint questions. These are the ONLY graded part
 * of the activity.
 *
 * Five checkpoints, one at the end of each part. Each draws `draw` questions
 * from its pool: every `core` question, then a random fill, so a new attempt
 * in the LMS sees a different mix.
 *
 * The correct choice is always written FIRST here; the order is shuffled on
 * screen. `why` is shown after the student answers, right or wrong.
 *
 * A choice is either text or a drawing:
 *   { lewis: 'SO4' }                     the answer the 5 rules give
 *   { lewis: 'SO4', mod: { expand: 2 } }  changed on purpose (see Lewis.variant)
 * A drawing that gives a central atom from period 3 or below MORE electrons
 * than the rules give it (extra double bonds — not SF₆'s legitimate 12) gets
 * the anti-AI message automatically. For text choices, list the indices that
 * mean "add double bonds the rules never asked for" in `snark`.
 *
 * `fig` is a drawing shown with the question. `fact` ties a numeric answer to
 * the 5-rule engine, so `node tools/validate.js` catches an answer that no
 * longer matches the chemistry:
 *   ['total', id]         Rule 1 total            ['left2', id]   left after Rule 2
 *   ['clp', id]           lone pairs on center     ['after4', id]  electrons on center after Rule 4
 *   ['center', id]        the central atom         ['bo', id, slot] order of that bond
 *   ['centerE', id]       electrons around the central atom in the finished structure
 */

var QUIZZES = {

  A: {
    title: 'Checkpoint 1 — molecules',
    draw: 3,
    core: ['a-nf3-total', 'a-ch2o-rule5'],
    pool: [
      { id: 'a-nf3-total', fact: ['total', 'NF3'],
        q: 'How many valence electrons does NF₃ have?',
        choices: ['26', '12', '24', '8'],
        why: 'N is in group 15 (5 valence electrons) and F is in group 17 (7 each). 5 + 3 × 7 = 26. ' +
             '(12 forgets that there are three F atoms.)' },
      { id: 'a-of2-center', fact: ['center', 'OF2'],
        q: 'Which atom goes in the center of OF₂?',
        choices: ['O', 'F', 'Either one — it doesn’t matter', 'There is no central atom'],
        why: 'Rule 2: the central atom is the least electronegative one — the first written, not counting H. ' +
             'That is O. F is the most electronegative element of all and is never in the center.' },
      { id: 'a-h-center',
        q: 'Why is H never the central atom?',
        choices: ['H can make only one bond — it is stable with a doublet (2 electrons)',
                  'H is the most electronegative element',
                  'H has no valence electrons',
                  'H is always written first'],
        why: 'A central atom bonds to two or more atoms. H is full with 2 electrons, and one single bond ' +
             'already gives it that.' },
      { id: 'a-ccl4-left', fact: ['left2', 'CCl4'],
        q: 'CCl₄ has 32 valence electrons. After Rule 2 (C in the center, four single bonds), how many ' +
           'electrons are left to place?',
        choices: ['24', '28', '16', '32'],
        why: 'Each single bond uses 2 electrons: 4 × 2 = 8, and 32 − 8 = 24. (28 counts only 1 electron per bond.)' },
      { id: 'a-nf3-lp', fact: ['clp', 'NF3'],
        q: 'In the Lewis structure of NF₃, how many lone pairs are on N?',
        choices: ['1', '0', '2', '3'],
        why: '26 − 6 (three bonds) = 20. Each F needs 3 lone pairs: 18 electrons. The last 2 go on N (Rule 4) ' +
             'as 1 lone pair, and N has 3 bonds + 1 lone pair = 8.' },
      { id: 'a-ch2o-rule5',
        q: 'After Rule 4 in CH₂O, C has only 6 electrons around it. What does Rule 5 tell you to do?',
        choices: ['Move one of O’s lone pairs into the C–O bond, making a double bond',
                  'Add one more lone pair to C',
                  'Move a lone pair from an H into a C–H bond',
                  'Nothing — 6 electrons is fine for C'],
        why: 'C is electron deficient by 2. Rule 5 shares one of O’s lone pairs as a second C–O bond: C=O. ' +
             'You can’t add a new lone pair — every electron was already placed — and H has no lone pairs to give.' },
      { id: 'a-hcn-struct',
        q: 'Which is the correct Lewis structure of HCN?',
        choices: [{ lewis: 'HCN' },
                  { lewis: 'HCN', mod: { stage: 4 } },
                  { lewis: 'HCN', mod: { set: { bo: { E: 2 }, lp: { C: 1, E: 2 } } } },
                  { lewis: 'HCN', mod: { set: { lp: { C: 1 } } } }],
        why: 'Rule 1: 1 + 4 + 5 = 10 electrons. After Rule 4, C has only 4, so Rule 5 runs twice: two of N’s ' +
             'lone pairs become bonds — a triple bond. That leaves N one lone pair and uses exactly 10 electrons. ' +
             '(H–C=N with a lone pair on C looks full, but it needs 12 electrons.)' }
    ]
  },

  B: {
    title: 'Checkpoint 2 — polyatomic ions',
    draw: 3,
    core: ['b-po4-total', 'b-clo4-struct'],
    pool: [
      { id: 'b-po4-total', fact: ['total', 'PO4'],
        q: 'How many valence electrons are in the phosphate ion, PO₄³⁻?',
        choices: ['32', '29', '26', '14'],
        why: '5 (P) + 4 × 6 (O) = 29, and the 3− charge means 3 EXTRA electrons: 29 + 3 = 32. (26 takes the ' +
             'charge away instead of adding it; 14 forgets that there are four O atoms.)' },
      { id: 'b-nh4-total', fact: ['total', 'NH4'],
        q: 'How many valence electrons are in the ammonium ion, NH₄⁺?',
        choices: ['8', '9', '10', '4'],
        why: '5 + 4 × 1 = 9, and the + charge means the ion has LOST one electron: 9 − 1 = 8.' },
      { id: 'b-so3-lp', fact: ['clp', 'SO3'],
        q: 'How many lone pairs end up on S in the sulfite ion, SO₃²⁻?',
        choices: ['1', '0', '2', '3'],
        why: '6 + 18 + 2 = 26. Three bonds use 6 (20 left). The three O atoms take 3 lone pairs each: 18 (2 left). ' +
             'Rule 4 puts the last 2 on S as one lone pair. S has 3 bonds + 1 lone pair = 8, so Rule 5 has nothing to do.' },
      { id: 'b-so4-why', snark: [3],
        q: 'Why does the sulfate ion, SO₄²⁻, have no double bonds?',
        choices: ['S already has 8 electrons after Rule 4, so it is not electron deficient and Rule 5 does not apply',
                  'The 2− charge cancels out the double bonds',
                  'O atoms can never form double bonds',
                  'It does — S has two S=O double bonds'],
        why: 'Four single bonds give S 8 electrons. Rule 5 only runs when the central atom is electron deficient, ' +
             'so it never runs here. (O does form double bonds — in CH₂O, for one — when the central atom needs them.)' },
      { id: 'b-clo4-struct',
        q: 'Which is the correct Lewis structure of the perchlorate ion, ClO₄⁻?',
        choices: [{ lewis: 'ClO4' },
                  { lewis: 'ClO4', mod: { expand: 3 } },
                  { lewis: 'ClO4', mod: { set: { lp: { N: 2, E: 2, S: 2, W: 2 } } } },
                  { lewis: 'ClO4', mod: { set: { lp: { W: 2 } } } }],
        why: '7 + 4 × 6 + 1 = 32. Four bonds use 8, and the four O atoms take 3 lone pairs each (24). Nothing is ' +
             'left, and Cl already has 8 — so no double bonds. The drawing with three Cl=O double bonds gives Cl ' +
             '14 electrons: that is the college-level “reduce the formal charge” answer. Rule 5 never runs on a Cl ' +
             'that already has 8.' },
      { id: 'b-cn-bonds', fact: ['bo', 'CN', 'E'],
        q: 'How many bonds (shared pairs) are between C and N in the cyanide ion, CN⁻?',
        choices: ['3', '1', '2', '4'],
        why: '4 + 5 + 1 = 10. One bond (2) and 3 lone pairs on N (6) leave 2, which go on C. C then has only 4, ' +
             'so Rule 5 runs twice: two of N’s lone pairs become bonds — a triple bond.' },
      { id: 'b-clo2-lp', fact: ['clp', 'ClO2'],
        q: 'The chlorite ion, ClO₂⁻, has 20 valence electrons. How many lone pairs are on Cl?',
        choices: ['2', '0', '1', '3'],
        why: 'Two bonds use 4 (16 left). Each O takes 3 lone pairs: 12 (4 left). Rule 4 puts the last 4 on Cl as ' +
             '2 lone pairs. Cl: 2 bonds + 2 lone pairs = 8.' }
    ]
  },

  C: {
    title: 'Checkpoint 3 — oxyacids',
    draw: 3,
    core: ['c-h-where', 'c-h3po4-struct'],
    pool: [
      { id: 'c-h-where',
        q: 'In sulfuric acid, H₂SO₄, what is each H atom bonded to?',
        choices: ['An O atom', 'The S atom', 'The other H atom', 'Both an O atom and the S atom'],
        why: 'In an oxyacid every H bonds to an O, and that O bonds to the central atom: H–O–S. H can only make one bond.' },
      { id: 'c-h3po4-struct',
        q: 'Which is the correct Lewis structure of phosphoric acid, H₃PO₄?',
        choices: [{ lewis: 'H3PO4' },
                  { lewis: 'H3PO4', mod: { expand: 1 } },
                  { lewis: 'H3PO4', mod: { set: { lp: { N: 2 } } } },
                  { lewis: 'H3PO4', mod: { set: { lp: { W: 1, E: 1, S: 1 } } } }],
        why: '3 + 5 + 4 × 6 = 32. Seven single bonds (four P–O, three O–H) use 14. The three O–H oxygens take 2 lone ' +
             'pairs each and the other O takes 3: 18 more, so nothing is left. P has 8 from four single bonds — no ' +
             'double bond. A P=O double bond would have to come from Rule 5, and Rule 5 never runs on a P that already ' +
             'has 8.' },
      { id: 'c-h2so3-total', fact: ['total', 'H2SO3'],
        q: 'How many valence electrons are in sulfurous acid, H₂SO₃?',
        choices: ['26', '24', '28', '18'],
        why: '2 × 1 + 6 + 3 × 6 = 26. Don’t forget the two H atoms (leaving them out gives 24).' },
      { id: 'c-hclo3-lp', fact: ['clp', 'HClO3'],
        q: 'How many lone pairs are on Cl in chloric acid, HClO₃?',
        choices: ['1', '0', '2', '3'],
        why: '1 + 7 + 18 = 26. Four single bonds (three Cl–O, one O–H) use 8, leaving 18. The O–H oxygen needs 2 lone ' +
             'pairs and the other two O atoms need 3 each: 16. The last 2 go on Cl as one lone pair, and Cl has 8.' },
      { id: 'c-hno2-rule5',
        q: 'After Rule 4 in nitrous acid, HNO₂, N has only 6 electrons around it. What does Rule 5 do?',
        choices: ['Moves a lone pair from an O into its N–O bond, making an N=O double bond',
                  'Adds another lone pair to N',
                  'Moves the H atom onto N',
                  'Nothing — N is fine with 6'],
        why: 'N is electron deficient by 2, so one oxygen lone pair becomes a second N–O bond. N is in period 2, so ' +
             'once it has 8 it is full.' },
      { id: 'c-h2so4-doubles', snark: [1, 2, 3],
        q: 'How many double bonds are in the Lewis structure of H₂SO₄?',
        choices: ['0', '1', '2', '3'],
        why: 'None. Seven single bonds and the lone pairs on O use all 32 electrons, and S has 8 from its four single ' +
             'bonds. An S=O double bond would have to come from Rule 5, and Rule 5 never runs: S is not electron deficient.' },
      { id: 'c-hso4-total', fact: ['total', 'HSO4'],
        q: 'How many valence electrons are in the hydrogen sulfate ion, HSO₄⁻?',
        choices: ['32', '31', '30', '33'],
        why: '1 + 6 + 24 = 31, plus 1 for the − charge: 32 — the same as sulfate, SO₄²⁻. That is why both have the ' +
             'same S: four single bonds and no lone pairs.' }
    ]
  },

  D: {
    title: 'Checkpoint 4 — exceptions to the octet',
    draw: 3,
    core: ['d-bf3-rule5', 'd-sf6-struct'],
    pool: [
      { id: 'd-bf3-rule5',
        q: 'After Rule 4, B in BF₃ has only 6 electrons around it. What does Rule 5 do?',
        choices: ['Nothing — B is an exception: it is stable with 6 electrons',
                  'Moves a lone pair from an F into a B–F bond, making a B=F double bond',
                  'Adds a lone pair to B',
                  'Removes one F atom so B has room'],
        why: 'B (like Be) is an exception to the octet: it is stable with 6 electrons, so it is not electron ' +
             'deficient and Rule 5 leaves it alone. BF₃ is three single bonds and no lone pairs on B.' },
      { id: 'd-bef2-e', fact: ['centerE', 'BeF2'],
        q: 'How many electrons surround Be in the Lewis structure of BeF₂?',
        choices: ['4', '8', '6', '2'],
        why: '2 + 2 × 7 = 16. Two bonds use 4, and the two F atoms take 3 lone pairs each (12). Nothing is left, so ' +
             'Be has just its two bonds — 4 electrons — and Be is stable with 4.' },
      { id: 'd-sf6-struct',
        q: 'Which is the correct Lewis structure of SF₆?',
        choices: [{ lewis: 'SF6' },
                  { lewis: 'SF6', mod: { set: { lp: { W: 2, E: 2, NW: 2, NE: 2, SW: 2, SE: 2 } } } },
                  { lewis: 'SF6', mod: { set: { lp: { E: 2 } } } },
                  { lewis: 'SF6', mod: { set: { bo: { E: 2 }, lp: { E: 2 } } } }],
        why: '6 + 6 × 7 = 48. Rule 2 connects all six F atoms to S: six single bonds use 12. The F atoms take 3 lone ' +
             'pairs each (36), and nothing is left. S ends with 12 — an expanded octet, which a period-3 atom can ' +
             'hold because the rules gave it those bonds. An S=F double bond would come from Rule 5, which never ' +
             'runs: S is not short.' },
      { id: 'd-xef4-lp', fact: ['clp', 'XeF4'],
        q: 'How many lone pairs are on Xe in XeF₄?',
        choices: ['2', '0', '1', '4'],
        why: '8 + 4 × 7 = 36. Four bonds use 8 (28 left); the F atoms take 3 lone pairs each (24, so 4 left). Rule 4 ' +
             'puts the last 4 on Xe as 2 lone pairs, and Xe ends with 12.' },
      { id: 'd-xef4-rule',
        q: 'Xe ends up with 12 electrons in XeF₄. Which rule puts the extra electrons there?',
        choices: ['Rule 4 — any remaining electrons go on the central atom',
                  'Rule 5 — Xe uses lone pairs from F to make double bonds',
                  'Rule 3 — Xe fills its octet first',
                  'None — Xe can only have 8, so XeF₄ is drawn wrong'],
        why: 'After Rule 3 there are still 4 electrons left, and Rule 4 says ANY remaining electrons go on the ' +
             'central atom. Xe is in period 5, so it can hold more than 8.' },
      { id: 'd-who-expands',
        q: 'Which of these central atoms can end up with MORE than 8 electrons?',
        choices: ['S — it is in period 3', 'C — it can make four bonds', 'N — it has a lone pair',
                  'B — it is an exception'],
        why: 'Only atoms in period 3 or below can hold more than 8 (an expanded octet). Period-2 atoms like C, N and ' +
             'O never go past 8, and B goes the other way: it is stable with only 6.' },
      { id: 'd-bcl3-total', fact: ['total', 'BCl3'],
        q: 'How many valence electrons are in BCl₃?',
        choices: ['24', '26', '21', '18'],
        why: 'B is in group 13 (3 valence electrons) and Cl in group 17 (7 each): 3 + 3 × 7 = 24. Three bonds and ' +
             'the Cl lone pairs use all 24, and B is left with 6 — which is fine for B.' },
      { id: 'd-sf4-e', fact: ['centerE', 'SF4'],
        q: 'SF₄ has 34 valence electrons. How many electrons surround S in the finished structure?',
        choices: ['10', '8', '12', '6'],
        why: 'Four bonds use 8 (26 left); the F atoms take 24 (2 left). Rule 4 puts the last 2 on S: 4 bonds (8) + ' +
             '1 lone pair (2) = 10 — an expanded octet.' }
    ]
  },

  E: {
    title: 'Checkpoint 5 — putting it together',
    draw: 4,
    core: ['e-spot', 'e-rule5-when'],
    pool: [
      { id: 'e-spot', snark: [1],
        q: 'A classmate turned in this structure for the sulfate ion. What is wrong with it?',
        fig: { lewis: 'SO4', mod: { expand: 2 } },
        choices: ['S had 8 electrons after Rule 4, so Rule 5 should never have run — the double bonds give S 12',
                  'Nothing — this is correct',
                  'The O atoms need more lone pairs',
                  'The brackets and charge should not be there'],
        why: 'Count around S: two double bonds (8) and two single bonds (4) = 12. Rule 5 only fixes a central atom ' +
             'with FEWER than 8. Following the rules gives four single bonds and 3 lone pairs on every O.' },
      { id: 'e-rule5-when', snark: [2],
        q: 'When do you make a double or triple bond?',
        choices: ['Only when the central atom has fewer than 8 electrons after Rule 4 — and it isn’t B or Be',
                  'Whenever an outer atom has lone pairs it could share',
                  'Whenever the central atom is in period 3 or below',
                  'Whenever the formula has O in it'],
        why: 'That is Rule 5: double and triple bonds fix an electron-deficient central atom. If the central atom ' +
             'already has 8 or more — whatever period it is in — you are done. B and Be are exceptions: they are ' +
             'stable with 6 and 4, so they are never electron deficient.' },
      { id: 'e-co2-after4', fact: ['after4', 'CO2'],
        q: 'CO₂ has 16 valence electrons. After Rule 4, how many electrons are around C?',
        choices: ['4', '8', '6', '2'],
        why: 'Two bonds use 4 (12 left), and each O takes 3 lone pairs (12). Nothing is left for C, which has just ' +
             'its two bonds: 4 electrons. So Rule 5 has to find 4 more — two lone pairs from the O atoms.' },
      { id: 'e-co-struct',
        q: 'Which is the correct Lewis structure of carbon monoxide, CO?',
        choices: [{ lewis: 'CO' },
                  { lewis: 'CO', mod: { stage: 4 } },
                  { lewis: 'CO', mod: { set: { bo: { E: 2 }, lp: { E: 2, C: 2 } } } },
                  { lewis: 'CO', mod: { set: { lp: { C: 0 } } } }],
        why: '4 + 6 = 10. One bond (2), three lone pairs on O (6), and the last 2 on C. C has only 4, so Rule 5 ' +
             'runs twice: a triple bond, with one lone pair left on each atom.' },
      { id: 'e-h3o-lp', fact: ['clp', 'H3O'],
        q: 'How many lone pairs are on O in the hydronium ion, H₃O⁺?',
        choices: ['1', '0', '2', '3'],
        why: '6 + 3 − 1 = 8. Three O–H bonds use 6. The H atoms are already full (Rule 3 skips them), so the last ' +
             '2 go on O: one lone pair.' },
      { id: 'e-rule3-h',
        q: 'In Rule 3, why don’t the H atoms get any lone pairs?',
        choices: ['H is stable with a doublet, and its bond already gives it 2 electrons',
                  'H has no electrons of its own',
                  'H only gets lone pairs in Rule 4',
                  'They do — every outer atom gets 3 lone pairs'],
        why: 'H is full with 2 electrons. One single bond is 2 shared electrons, so an H needs nothing more.' },
      { id: 'e-io4-lp', fact: ['clp', 'IO4'],
        q: 'How many lone pairs are on I in the periodate ion, IO₄⁻?',
        choices: ['0', '1', '2', '4'],
        why: '7 + 24 + 1 = 32 — the same count as perchlorate. Four bonds and 3 lone pairs on each O use all 32, ' +
             'so I gets no lone pairs and has exactly 8.' },
      { id: 'e-sf6-so4', snark: [3],
        q: 'S ends with 12 electrons in SF₆ but only 8 in SO₄²⁻. Why the difference?',
        choices: ['In SF₆ Rule 2 gives S six bonds; in SO₄²⁻ four single bonds already give S its 8, so Rule 5 never runs',
                  'F can make double bonds and O can’t',
                  'SO₄²⁻ is an ion, and ions can’t have expanded octets',
                  'There is no difference — SO₄²⁻ should have two S=O double bonds so S has 12 too'],
        why: 'An expanded octet only ever comes from Rules 2 and 4. SF₆ has six atoms to connect to S, so Rule 2 ' +
             'gives S six bonds. In sulfate, four single bonds already give S 8 electrons, so S is not electron ' +
             'deficient and Rule 5 never makes an S=O double bond.' }
    ]
  }
};

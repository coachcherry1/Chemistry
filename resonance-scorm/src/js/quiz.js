/* quiz.js — the graded checkpoint questions. These are the ONLY graded part
 * of the activity.
 *
 * Four checkpoints, one at the end of each part. Each draws `draw` questions
 * from its pool: every `core` question, then a random fill, so a new attempt
 * sees a different mix. The correct choice is always written FIRST here; the
 * order is shuffled on screen. `why` is shown after the student answers.
 *
 * A choice is text or a drawing:
 *   { hybrid: 'NO3' }                      the resonance hybrid
 *   { hybrid: 'NO3', variant: 'one' }      a wrong "hybrid": 'one' (a single
 *                                          resonance structure), 'double',
 *                                          'single', 'some' — see hybrid.js
 *   { lewis: 'SO2' }                       a Lewis structure from the 5 rules
 *   { lewis: 'SO2', mod: { expand: 1 } }   changed on purpose (lewis.js variant)
 * A Lewis drawing that piles extra double bonds onto a period-3+ central atom
 * gets the anti-AI message automatically; for text choices list those
 * indices in `snark`.
 *
 * `fact` ties an answer to the engine, so `node tools/validate.js` catches an
 * answer that no longer matches the chemistry:
 *   ['n', id]          how many resonance structures
 *   ['order', id]      bond order of each shared bond in the hybrid ('1⅓')
 *   ['total', id]      valence electrons
 *   ['resonant', [ids]] choice 0's species has resonance, the others do not
 */

var QUIZZES = {

  A: {
    title: 'Checkpoint 1 — ozone and the idea of resonance',
    draw: 3,
    core: ['a-flip', 'a-what-moves'],
    pool: [
      { id: 'a-flip',
        q: 'Which statement about ozone, O₃, is true?',
        choices: ['Every ozone molecule is the hybrid: its two O–O bonds are identical, between a single and a double bond',
                  'Each ozone molecule flips back and forth between its two resonance structures',
                  'Half of all ozone molecules are structure A and the other half are structure B',
                  'One O–O bond is a double bond and the other is a single bond'],
        why: 'Resonance structures are not real molecules taking turns. Ozone is ONE thing all the time — the hybrid. ' +
             'A mule is not a horse half the time and a donkey the other half; it is always a mule.' },
      { id: 'a-what-moves',
        q: 'What is different between ozone’s two resonance structures?',
        choices: ['Only where the double bond and the lone pairs are — every atom stays in the same place',
                  'Which atom is in the center',
                  'How many valence electrons there are',
                  'The two end O atoms swap places'],
        why: 'Resonance structures have the same atoms in the same places and the same number of electrons. Only ' +
             'electrons move: here, which end O shares its pair in Rule 5.' },
      { id: 'a-o3-order', fact: ['order', 'O3'],
        q: 'What is the bond order of each O–O bond in the ozone hybrid?',
        choices: ['1½', '1', '2', '1⅓'],
        why: 'Each O–O bond is double in one structure and single in the other: (2 + 1) ÷ 2 = 1½.' },
      { id: 'a-o3-length',
        q: 'Both O–O bonds in ozone are 128 pm long. A typical O–O single bond is 148 pm and an O=O double bond is ' +
           '121 pm. What does that show?',
        choices: ['Both bonds are the same: in between a single and a double bond — the hybrid',
                  'Ozone has one single bond and one double bond',
                  'Both of ozone’s bonds are double bonds',
                  'Both of ozone’s bonds are single bonds'],
        why: 'If ozone really had one single and one double bond, one bond would be about 148 pm and the other about ' +
             '121 pm. Instead both are 128 pm — between the two — which is exactly what the hybrid predicts.' },
      { id: 'a-when',
        q: 'How can you tell, from the 5 rules, that a molecule or ion has resonance structures?',
        choices: ['Rule 5 has a choice: the double bond could go to more than one identical atom',
                  'It has a double bond anywhere',
                  'It has oxygen in it',
                  'Its central atom has a lone pair'],
        why: 'Resonance shows up when Rule 5 could have gone more than one equally good way. CH₂O has a double bond, ' +
             'but only one O to put it on — so it has no resonance.' }
    ]
  },

  B: {
    title: 'Checkpoint 2 — nitrite and nitrate',
    draw: 3,
    core: ['b-no3-hybrid', 'b-no3-count'],
    pool: [
      { id: 'b-no3-hybrid',
        q: 'Which drawing shows the resonance hybrid of the nitrate ion, NO₃⁻?',
        choices: [{ hybrid: 'NO3' },
                  { hybrid: 'NO3', variant: 'one' },
                  { hybrid: 'NO3', variant: 'double' },
                  { hybrid: 'NO3', variant: 'some' }],
        why: 'In the hybrid all three N–O bonds are identical: each is a solid line plus a dashed line (a partial ' +
             'double bond), and the extra electrons are spread over all three O atoms (δ−). One double bond and two ' +
             'single bonds is just one resonance structure, not the real ion.' },
      { id: 'b-no3-count', fact: ['n', 'NO3'],
        q: 'How many resonance structures does the nitrate ion, NO₃⁻, have?',
        choices: ['3', '1', '2', '4'],
        why: 'After Rule 4, N has only 6 electrons, so Rule 5 needs one O to share a pair — and any of the three O ' +
             'atoms will do. Three choices, three resonance structures.' },
      { id: 'b-no3-order', fact: ['order', 'NO3'],
        q: 'What is the bond order of each N–O bond in the nitrate hybrid?',
        choices: ['1⅓', '1½', '2', '1'],
        why: 'Each N–O bond is double in one structure and single in the other two: (2 + 1 + 1) ÷ 3 = 1⅓.' },
      { id: 'b-no2-order', fact: ['order', 'NO2'],
        q: 'What is the bond order of each N–O bond in the nitrite hybrid, NO₂⁻?',
        choices: ['1½', '1⅓', '2', '1'],
        why: 'Two resonance structures; each N–O bond is double in one and single in the other: (2 + 1) ÷ 2 = 1½.' },
      { id: 'b-no2-charge',
        q: 'Where is the 1− charge of the nitrite ion in the hybrid?',
        choices: ['Spread over both O atoms — each carries part of it (δ−)',
                  'On the single-bonded O atom only',
                  'On the N atom',
                  'It jumps from one O to the other'],
        why: 'In each resonance structure the single-bonded O carries the extra electrons — but it is a different O ' +
             'each time. In the real ion the charge is shared: each O is partly negative (δ−).' },
      { id: 'b-longer',
        q: 'Which ion has the LONGER N–O bonds: nitrite (NO₂⁻) or nitrate (NO₃⁻)?',
        choices: ['Nitrate — its bond order is lower (1⅓ instead of 1½)',
                  'Nitrite — it has fewer bonds',
                  'They are exactly the same length',
                  'Nitrate — because it has a 1− charge'],
        why: 'A lower bond order means a longer, weaker bond. Nitrate’s 1⅓ bonds are a little longer than nitrite’s ' +
             '1½ bonds (about 125 pm and 124 pm).' }
    ]
  },

  C: {
    title: 'Checkpoint 3 — carbonate',
    draw: 3,
    core: ['c-co3-hybrid', 'c-co3-length'],
    pool: [
      { id: 'c-co3-hybrid',
        q: 'Which drawing shows the resonance hybrid of the carbonate ion, CO₃²⁻?',
        choices: [{ hybrid: 'CO3' },
                  { hybrid: 'CO3', variant: 'one' },
                  { hybrid: 'CO3', variant: 'single' },
                  { hybrid: 'CO3', variant: 'some' }],
        why: 'All three C–O bonds in carbonate are identical partial double bonds (bond order 1⅓), and the 2− charge ' +
             'is spread over all three O atoms (δ−).' },
      { id: 'c-co3-length',
        q: 'What are the three C–O bonds in the carbonate ion like?',
        choices: ['All the same length — between a C–O single bond and a C=O double bond',
                  'One short (double) and two long (single)',
                  'All the same length as a C=O double bond',
                  'All the same length as a C–O single bond'],
        why: 'All three are 129 pm: shorter than a C–O single bond (143 pm), longer than a C=O double bond (120 pm). ' +
             'Only the hybrid explains three identical bonds.' },
      { id: 'c-co3-count', fact: ['n', 'CO3'],
        q: 'How many resonance structures does the carbonate ion have?',
        choices: ['3', '2', '1', '4'],
        why: 'C is 2 electrons short after Rule 4, and any of the three O atoms can share a pair: three structures.' },
      { id: 'c-co3-charge',
        q: 'How is carbonate’s 2− charge spread out in the hybrid?',
        choices: ['Over all three O atoms — each is partly negative (δ−)',
                  'On the two single-bonded O atoms only',
                  'On the C atom',
                  'On one O atom'],
        why: 'Which two O atoms are single-bonded changes from structure to structure. In the real ion every O carries ' +
             'part of the charge.' },
      { id: 'c-co3-order', fact: ['order', 'CO3'],
        q: 'What is the bond order of each C–O bond in carbonate?',
        choices: ['1⅓', '1½', '2', '1'],
        why: '(2 + 1 + 1) ÷ 3 = 1⅓ — the same as nitrate, which has the same shape and the same pattern of bonds.' },
      { id: 'c-vs-ch2o',
        q: 'Which bond is SHORTER: a C–O bond in carbonate (bond order 1⅓) or the C=O bond in formaldehyde, CH₂O ' +
           '(a true double bond)?',
        choices: ['The C=O in formaldehyde — a higher bond order means a shorter bond',
                  'The C–O in carbonate — it has more O atoms',
                  'They are the same length',
                  'The C–O in carbonate — because it has a charge'],
        why: 'Bond order 2 beats bond order 1⅓: the double bond is shorter (120 pm against 129 pm).' }
    ]
  },

  D: {
    title: 'Checkpoint 4 — putting it together',
    draw: 4,
    core: ['d-which', 'd-so2-rules'],
    pool: [
      { id: 'd-which', fact: ['resonant', ['SO3', 'SO4', 'ClO3', 'CH2O']],
        q: 'Which of these has resonance structures (by our 5 rules)?',
        choices: ['SO₃', 'SO₄²⁻', 'ClO₃⁻', 'CH₂O'],
        why: 'SO₃: after Rule 4, S has only 6 electrons, and any of the three O atoms can share a pair. SO₄²⁻ and ' +
             'ClO₃⁻ never get to Rule 5 — their central atoms already have 8 — and CH₂O has only one O to share.' },
      { id: 'd-so2-rules',
        q: 'Which is a correct resonance structure of SO₂ by the 5 rules?',
        choices: [{ lewis: 'SO2' },
                  { lewis: 'SO2', mod: { expand: 1 } },
                  { lewis: 'SO2', mod: { stage: 4 } },
                  { lewis: 'SO2', mod: { set: { lp: { C: 0 } } } }],
        why: '6 + 2 × 6 = 18. After Rule 4, S has 6 electrons, so ONE O shares a pair: O=S–O with a lone pair on S. ' +
             'The other O could share instead — that is the second resonance structure. Two double bonds would give ' +
             'S more than 8, and Rule 5 never does that.' },
      { id: 'd-so2-count', fact: ['n', 'SO2'],
        q: 'By our 5 rules, how many resonance structures does SO₂ have?',
        choices: ['2', '1', '3', '0'],
        why: 'S needs one pair, and either O can give it: two equivalent structures, just like ozone and nitrite.' },
      { id: 'd-ch2o-why',
        q: 'Why does formaldehyde, CH₂O, have NO resonance structures?',
        choices: ['Only the O can share a pair in Rule 5, so the double bond can go just one place',
                  'C is in period 2',
                  'It has no charge',
                  'It has hydrogen atoms in it'],
        why: 'H atoms have no lone pairs to share, so the double bond can only go to the O. One choice means one ' +
             'structure — no resonance.' },
      { id: 'd-formate-order', fact: ['order', 'HCO2'],
        q: 'What is the bond order of each C–O bond in the formate ion, HCO₂⁻?',
        choices: ['1½', '1⅓', '2', '1'],
        why: 'Two O atoms can share the pair: two resonance structures, so each C–O is (2 + 1) ÷ 2 = 1½. The C–H bond ' +
             'stays a plain single bond — it is the same in both structures.' },
      { id: 'd-hybrid-def',
        q: 'What is a resonance hybrid?',
        choices: ['The one real structure: an average of all the resonance structures',
                  'The resonance structure with the most double bonds',
                  'A mixture — some molecules are one structure and some are another',
                  'The first structure the 5 rules give you'],
        why: 'The resonance structures are drawings we need because one Lewis drawing can’t show a partial double ' +
             'bond. The hybrid — their average — is what the molecule or ion really is.' },
      { id: 'd-so3-hybrid',
        q: 'Which drawing shows the resonance hybrid of sulfur trioxide, SO₃?',
        choices: [{ hybrid: 'SO3' },
                  { hybrid: 'SO3', variant: 'one' },
                  { hybrid: 'SO3', variant: 'double' },
                  { hybrid: 'SO3', variant: 'some' }],
        why: 'Three identical S–O bonds, each 1⅓, with the O atoms partly negative — the same pattern as nitrate and ' +
             'carbonate. Three S=O double bonds would mean Rule 5 ran three times, but S was only one pair short.' }
    ]
  }
};

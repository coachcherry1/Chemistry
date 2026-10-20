/* quiz.js: the graded checkpoint questions.
 *
 * Four checkpoints, one at the end of each part. Each draws `draw` questions
 * from its pool: every `core` question, then a random fill. A retry of the
 * activity therefore sees a different mix.
 *
 * Nothing here asks for a number. Every question asks the student to compare,
 * rank, identify or explain; the A-value table is shown open beside
 * checkpoints 3 and 4, so students read it to decide which group crowds
 * more, never to add numbers up. tools/validate.js fails if a question or a
 * choice quotes an energy.
 *
 * The correct choice is always written FIRST here; the order is shuffled on
 * screen. `why` is shown after the student answers, right or wrong, and that
 * explanation is the point of the question.
 *
 * Figures:
 *   { chair: molId, k: 0 | 1, show, letters, mark }  a chair drawing (k = which chair)
 *   { flat: molId }                                    the flat ring drawing
 *   { newman: molId, k, bond: [i, j] }                 a Newman projection down a ring bond
 *   { boat: true }                                     the boat
 * `struct` lists molecules whose flat drawings are shown under the question.
 * A choice can be a figure instead of text.
 *
 * Several answers depend on the model (which position is axial, which chair
 * is lower). `node tools/validate.js` checks each of them.
 */

var QUIZZES = {

  A: {
    title: 'Checkpoint 1: the chair',
    draw: 4,
    core: ['a-why-chair', 'a-spot-axial'],
    pool: [
      { id: 'a-why-chair',
        q: 'Why is the chair the most stable shape of cyclohexane?',
        choices: ['Its bond angles are close to 109.5° and every C–C bond is staggered',
                  'It is flat, so its atoms are as far apart as possible',
                  'Its bonds are eclipsed, which holds the ring together',
                  'All of its H atoms are equatorial'],
        why: 'No angle strain, because the bond angles are close to the ideal 109.5°, and no torsional strain, ' +
             'because every bond is staggered (the Newman projection down any ring bond shows it). A flat ring ' +
             'would have both kinds of strain.' },
      { id: 'a-spot-axial',
        q: 'Which lettered H is axial?',
        fig: { chair: 'cyclohexane', show: 'all', letters: { '3t': 'A', '2t': 'B', '4t': 'C', '6t': 'D' } },
        choices: ['A', 'B', 'C', 'D'],
        why: 'A points straight up, parallel to the axis of the ring: axial. B, C and D point out from the ring, ' +
             'around its equator: equatorial.' },
      { id: 'a-is-this',
        q: 'The H labelled X is…',
        fig: { chair: 'cyclohexane', show: 'all', letters: { '2b': 'X' }, mark: { '2b': 'hot' } },
        choices: ['Axial, pointing down', 'Axial, pointing up', 'Equatorial, pointing slightly up',
                  'Equatorial, pointing slightly down'],
        why: 'It points straight down, parallel to the axis of the ring, so it is axial and points down.' },
      { id: 'a-each',
        q: 'How many axial positions does each carbon of a chair have?',
        choices: ['One: every carbon has one axial and one equatorial position',
                  'Two',
                  'None: only some carbons have axial positions',
                  'It depends on whether the carbon is at the end of the chair'],
        why: 'Every carbon has exactly one of each, so the ring has six axial and six equatorial positions.' },
      { id: 'a-alternate',
        q: 'The axial H on C1 points up. Which way does the axial H on C4 point?',
        choices: ['Down', 'Up', 'Out from the ring, like an equatorial H'],
        why: 'Axial positions alternate all the way round: C1 up, C2 down, C3 up, C4 down.' },
      { id: 'a-eq-dir',
        q: 'On a carbon whose axial H points up, the equatorial H points…',
        choices: ['Out from the ring and slightly down', 'Out from the ring and slightly up', 'Straight down',
                  'Straight up'],
        why: 'On every carbon the equatorial position tilts slightly the opposite way to the axial one, so each ' +
             'carbon has one position up and one down.' },
      { id: 'a-faces',
        q: 'How many of the twelve H atoms of chair cyclohexane point up, toward the top face of the ring?',
        choices: ['6', '3', '12', '2'],
        why: 'Each carbon has one H up and one H down. Of the six up H atoms, three are axial (on C1, C3 and C5) ' +
             'and three are equatorial (on C2, C4 and C6).' },
      { id: 'a-boat',
        q: 'Why is the boat less stable than the chair?',
        choices: ['Its two flagpole H atoms crowd each other, and some of its bonds are eclipsed',
                  'Its bond angles are all 120°',
                  'It has fewer H atoms than the chair',
                  'Every one of its bonds is staggered'],
        why: 'Steric strain (the flagpole H atoms at the two ends point at each other) plus torsional strain ' +
             '(looking down C2–C3, the bonds are eclipsed). The chair has neither.' },
      { id: 'a-flat',
        q: 'Why is cyclohexane not flat?',
        choices: ['A flat ring would have 120° bond angles and every C–C bond eclipsed',
                  'A flat ring would not have room for twelve H atoms',
                  'Rings of carbon atoms can never be flat',
                  'A flat ring would have too few bonds'],
        why: 'Both angle strain (120° instead of about 109.5°) and torsional strain (every bond eclipsed). Folding ' +
             'into a chair removes both.' },
      { id: 'a-newman',
        q: 'Looking down any C–C bond of the chair, the Newman projection shows the bonds…',
        fig: { newman: 'cyclohexane', k: 0, bond: [1, 2] },
        choices: ['Staggered', 'Eclipsed', 'Totally eclipsed', 'Half staggered and half eclipsed'],
        why: 'Every bond on the back carbon sits exactly between two bonds on the front carbon. Every ring bond of ' +
             'the chair is staggered, which is why the chair has no torsional strain.' }
    ]
  },

  B: {
    title: 'Checkpoint 2: the ring flip',
    draw: 4,
    core: ['b-ax-to-eq', 'b-up-stays'],
    pool: [
      { id: 'b-ax-to-eq',
        q: 'In a ring flip, what happens to a group that was axial?',
        choices: ['It becomes equatorial', 'It stays axial', 'It becomes axial on the other face',
                  'It leaves the ring'],
        why: 'A flip swaps every axial position for an equatorial one, and every equatorial position for an axial one.' },
      { id: 'b-up-stays',
        q: 'A group points up before a ring flip. After the flip it points…',
        choices: ['Up', 'Down', 'Sideways, in the plane of the ring', 'Up or down, at random'],
        why: 'Nothing changes face in a ring flip. Up stays up and down stays down; only axial and equatorial swap.' },
      { id: 'b-methyl-after',
        q: 'In this chair of methylcyclohexane the CH₃ is axial. After a ring flip, the CH₃ is…',
        fig: { chair: 'methyl', k: 0 },
        choices: ['Equatorial, pointing slightly up', 'Axial, pointing down', 'Equatorial, pointing slightly down',
                  'Still axial, pointing up'],
        why: 'Axial becomes equatorial, and the CH₃ stays on the top face, so it points out and slightly up.' },
      { id: 'b-letter',
        q: 'After a ring flip, the H labelled A will be…',
        fig: { chair: 'cyclohexane', show: 'all', letters: { '4t': 'A' }, mark: { '4t': 'hot' } },
        choices: ['Axial, pointing up', 'Axial, pointing down', 'Equatorial, pointing slightly up',
                  'Equatorial, pointing slightly down'],
        why: 'A is equatorial and points slightly up. A flip makes it axial, and it stays on the top face: axial, up.' },
      { id: 'b-eq-down',
        q: 'An equatorial H points out and slightly down. After a ring flip it is…',
        choices: ['Axial, pointing straight down', 'Axial, pointing straight up', 'Equatorial, pointing slightly up',
                  'Still equatorial, pointing slightly down'],
        why: 'Equatorial becomes axial, and down stays down.' },
      { id: 'b-bonds',
        q: 'Does a ring flip break any bonds?',
        choices: ['No: it only turns about single bonds, so the two chairs are conformations of the same molecule',
                  'Yes: two C–C bonds break and form again',
                  'Yes: the C–H bonds break and the H atoms move',
                  'Only when the ring carries a substituent'],
        why: 'A flip is like turning the back carbon of a Newman projection: bonds turn, nothing breaks. The two ' +
             'chairs are two conformations of one molecule.' },
      { id: 'b-speed',
        q: 'At room temperature, cyclohexane rings flip…',
        choices: ['Many thousands of times every second', 'About once a day', 'Never: the chair is locked',
                  'Only when the sample is heated strongly'],
        why: 'The energy hump between the chairs is small, so each ring flips roughly 100,000 times a second at ' +
             'room temperature.' },
      { id: 'b-between',
        q: 'During a ring flip the ring passes through shapes in between the two chairs. Compared with the chairs, ' +
           'these shapes are…',
        choices: ['Less stable (higher in energy)', 'More stable (lower in energy)', 'Exactly as stable',
                  'Not real: the ring jumps straight from one chair to the other'],
        why: 'That is the hump on the energy diagram. Every shape in between, such as the boat, is less stable than ' +
             'either chair, so the molecules spend almost all their time as chairs.' },
      { id: 'b-same',
        q: 'For cyclohexane itself (every position an H), the two chairs are…',
        choices: ['The same shape with the same energy', 'Different energies, because one has more axial H atoms',
                  'Two different compounds', 'Impossible to tell apart, because cyclohexane cannot flip'],
        why: 'Each chair has six axial and six equatorial H atoms. A flip only swaps which H is which.' },
      { id: 'b-twice',
        q: 'A ring flips, then flips again. An H that started axial is now…',
        choices: ['Axial again, pointing the same way as at the start', 'Equatorial', 'Axial, on the other face',
                  'Gone from the ring'],
        why: 'Each flip swaps axial and equatorial, so two flips bring every H back to where it started.' },
      { id: 'b-all',
        q: 'In chair 1 of cyclohexane, six H atoms are axial. After a ring flip, how many of those six are still axial?',
        choices: ['None', 'Three', 'Six', 'One'],
        why: 'All six become equatorial at once, and the six equatorial H atoms become axial.' }
    ]
  },

  C: {
    title: 'Checkpoint 3: axial crowding and A-values',
    draw: 5,
    core: ['c-which-h', 'c-why-eq', 'c-rank'],
    pool: [
      { id: 'c-which-h',
        q: 'The CH₃ in this chair is axial. Which two lettered H atoms does it crowd?',
        fig: { chair: 'methyl', k: 0, show: 'all', letters: { '3t': 'A', '5t': 'B', '2b': 'C', '2t': 'D', '4t': 'E' } },
        choices: ['A and B', 'C and D', 'A and D', 'D and E'],
        why: 'A and B are the axial H atoms on C3 and C5. They point up, the same way as the CH₃, two carbons away: ' +
             '1,3-diaxial interactions. C points down, and D and E are equatorial, pointing away from the ring.' },
      { id: 'c-why-eq',
        q: 'Why does methylcyclohexane prefer the chair with the CH₃ equatorial?',
        choices: ['An axial CH₃ crowds the two axial H atoms on its face; an equatorial CH₃ points away from the ring',
                  'An equatorial CH₃ is closer to the other H atoms, which holds it in place',
                  'An axial CH₃ has torsional strain because its bonds are eclipsed',
                  'A CH₃ group is too heavy to point up'],
        why: 'Axial CH₃ has two 1,3-diaxial interactions (steric strain). Equatorial CH₃ has none. Both chairs are ' +
             'fully staggered, so torsional strain is not the difference.' },
      { id: 'c-rank',
        q: 'Rank these groups by how strongly they prefer the equatorial position, weakest first.',
        choices: ['Br < CH₃ < CH(CH₃)₂ < C(CH₃)₃',
                  'CH₃ < Br < CH(CH₃)₂ < C(CH₃)₃',
                  'C(CH₃)₃ < CH(CH₃)₂ < CH₃ < Br',
                  'Br < CH(CH₃)₂ < CH₃ < C(CH₃)₃'],
        why: 'Read the A-values: the bigger the A-value, the stronger the preference. Br is a big atom on a long ' +
             'bond, so it crowds the axial H atoms the least.' },
      { id: 'c-name',
        q: 'Why are they called 1,3-diaxial interactions?',
        choices: ['Both partners are axial, on carbons two apart (like C1 and C3), on the same face',
                  'Every chair has either 1 or 3 of them',
                  'They are between an axial group and an equatorial group',
                  'They only ever happen between C1 and C3'],
        why: 'An axial group on C1 crowds the axial atoms on C3 and C5: both pairs are "1,3" (two carbons apart), ' +
             'and both partners are axial on the same face.' },
      { id: 'c-tbu',
        q: 'Which statement about tert-butylcyclohexane at room temperature is true?',
        choices: ['Almost every molecule has the C(CH₃)₃ group equatorial, so the ring is effectively locked',
                  'The ring cannot flip at all',
                  'About half the molecules have the C(CH₃)₃ group axial',
                  'The C(CH₃)₃ group prefers the axial position'],
        why: 'It has by far the biggest A-value. The ring can still flip, but the axial chair is so crowded that all ' +
             'but about 1 in 10,000 molecules are in the equatorial chair.' },
      { id: 'c-br',
        q: 'Br is a bigger atom than carbon, yet an axial Br costs less than an axial CH₃. Why?',
        choices: ['The C–Br bond is long, so the Br sits farther from the axial H atoms',
                  'A Br atom is smaller than a CH₃ group',
                  'Br attracts the axial H atoms',
                  'Br can never be axial'],
        why: 'The same long-bond effect as in Newman projections. The C–Br bond (1.94 Å) holds the Br out beyond ' +
             'the axial H atoms, while a CH₃ on its shorter bond, with its own H atoms, reaches right into them.' },
      { id: 'c-newman',
        q: 'This Newman projection looks down C1–C2 of methylcyclohexane with the CH₃ axial. How is the CH₃ ' +
           'arranged relative to the ring carbon C3?',
        fig: { newman: 'methyl', k: 0, bond: [1, 2], hot: ['1t', 'R3'] },
        choices: ['Gauche, like the two CH₃ groups in gauche butane', 'Anti, like anti butane', 'Eclipsed',
                  'Too far apart to say'],
        why: 'The CH₃ and C3 are 60° apart: gauche. Looking down C1–C6, it is gauche to C5 too. These two gauche ' +
             'interactions are the two 1,3-diaxial interactions seen from a different direction.' },
      { id: 'c-same',
        q: 'The steric strain of an axial CH₃ is the same kind of strain as…',
        choices: ['The gauche interaction between the two CH₃ groups in butane',
                  'The torsional strain of eclipsed ethane',
                  'The angle strain of a flat ring',
                  'The attraction between opposite charges'],
        why: 'Each CH₃/H 1,3-diaxial interaction is a gauche-butane interaction in disguise (the CH₃ is gauche to a ' +
             'ring carbon), so Klein gives each one the same value as gauche butane.' },
      { id: 'c-eq-none',
        q: 'How many 1,3-diaxial interactions does an equatorial CH₃ have?',
        choices: ['None', 'One', 'Two', 'Four'],
        why: 'An equatorial group points out, away from the ring, past the axial H atoms. It has no 1,3-diaxial ' +
             'interactions at all.' },
      { id: 'c-lower',
        q: 'Which chair of methylcyclohexane is lower in energy?',
        choices: [{ chair: 'methyl', k: 1 }, { chair: 'methyl', k: 0 }],
        why: 'The chair with the CH₃ equatorial: no 1,3-diaxial interactions. With the CH₃ axial it crowds the axial ' +
             'H atoms on C3 and C5.' },
      { id: 'c-mostly',
        q: 'At any moment, most methylcyclohexane molecules are…',
        choices: ['In the chair with the CH₃ equatorial, though each one keeps flipping back and forth',
                  'In the chair with the CH₃ axial',
                  'Split evenly between the two chairs',
                  'Stuck in one chair for good'],
        why: 'About 19 in 20 are in the equatorial chair at any moment. Each molecule still flips many times a ' +
             'second; it just spends most of its time in the more stable chair.' },
      { id: 'c-ipr',
        q: 'An axial CH(CH₃)₂ costs only a little more than an axial CH₃. Why?',
        choices: ['It can turn so that its small H points in over the ring, keeping its CH₃ groups away',
                  'It is smaller than a CH₃ group',
                  'It is never axial',
                  'Its two CH₃ groups attract the axial H atoms'],
        why: 'Only the H of the isopropyl group has to face the axial H atoms; both CH₃ groups point outward.' },
      { id: 'c-tbu-why',
        q: 'Why does C(CH₃)₃ prefer the equatorial position so much more strongly than CH(CH₃)₂?',
        choices: ['However it turns, one of its CH₃ groups points straight at the axial H atoms',
                  'Its bond to the ring is longer',
                  'It is lighter than CH(CH₃)₂',
                  'It has fewer H atoms than CH(CH₃)₂'],
        why: 'C(CH₃)₃ has three CH₃ groups and no H, so axial, one CH₃ always points in over the ring and crashes ' +
             'into the axial H atoms. That is why its A-value is so large.' },
      { id: 'c-table',
        q: 'According to the A-value table, which group has the weakest preference for the equatorial position?',
        choices: ['Cl', 'CH₃', 'CH(CH₃)₂', 'C(CH₃)₃'],
        why: 'Cl has the smallest A-value of these: its long C–Cl bond keeps it away from the axial H atoms.' }
    ]
  },

  D: {
    title: 'Checkpoint 4: two groups, cis and trans',
    draw: 5,
    core: ['d-trans14', 'd-bigger', 'd-match', 'd-cis-trans'],
    pool: [
      { id: 'd-trans14', struct: ['trans14'],
        q: 'Which chair of trans-1,4-dimethylcyclohexane is more stable?',
        choices: [{ chair: 'trans14', k: 1 }, { chair: 'trans14', k: 0 }],
        why: 'The one with both CH₃ groups equatorial: no 1,3-diaxial interactions. In the other chair both are ' +
             'axial, with four 1,3-diaxial interactions between them.' },
      { id: 'd-bigger', struct: ['cisTM'],
        q: 'In cis-1-tert-butyl-4-methylcyclohexane only one group can be equatorial. Which group is equatorial ' +
           'in the more stable chair?',
        choices: ['The C(CH₃)₃ group', 'The CH₃ group', 'Neither', 'Both, because cis groups are always equatorial'],
        why: 'The A-value of C(CH₃)₃ is far bigger than that of CH₃, so the C(CH₃)₃ takes the equatorial position ' +
             'and the CH₃ goes axial.' },
      { id: 'd-match',
        q: 'Which chair drawing shows this molecule?',
        fig: { flat: 'cis13' },
        choices: [{ chair: 'cis13', k: 1 }, { chair: 'trans13', k: 1 }, { chair: 'cis14', k: 1 }, { chair: 'trans14', k: 1 }],
        why: 'Both CH₃ groups are on wedges, on C1 and C3, so both point up. Only the first drawing has CH₃ groups on ' +
             'C1 and C3, both up. One wrong choice has one CH₃ down (trans); the other two put the second CH₃ on C4.' },
      { id: 'd-cis-trans', struct: ['cis14', 'trans14'],
        q: 'Can a ring flip turn cis-1,4-dimethylcyclohexane into trans-1,4-dimethylcyclohexane?',
        choices: ['No: a flip never moves a group to the other face, so cis stays cis',
                  'Yes: a flip moves every group to the other face',
                  'Yes, but only if the ring is heated',
                  'Only when one of the groups is axial'],
        why: 'Cis and trans are different compounds. Moving a group to the other face would mean breaking a bond; a ' +
             'flip only swaps axial and equatorial.' },
      { id: 'd-cis14', struct: ['cis14'],
        q: 'Why do the two chairs of cis-1,4-dimethylcyclohexane have the same energy?',
        choices: ['In either chair one CH₃ is axial and the other is equatorial',
                  'Both CH₃ groups are equatorial in both chairs',
                  'Both CH₃ groups are axial in both chairs',
                  'Cis molecules cannot flip'],
        why: 'Both groups are on the top face. In each chair one of them must be axial, so each chair pays for one ' +
             'axial CH₃.' },
      { id: 'd-cis13', struct: ['cis13'],
        q: 'In the more stable chair of cis-1,3-dimethylcyclohexane, the two CH₃ groups are…',
        choices: ['Both equatorial', 'Both axial', 'One axial and one equatorial', 'Eclipsed with each other'],
        why: 'Cis-1,3 can put both groups equatorial at once. In the other chair both are axial.' },
      { id: 'd-cis13-worst', struct: ['cis13'],
        q: 'In the less stable chair of cis-1,3-dimethylcyclohexane both CH₃ groups are axial on the same face. Why ' +
           'is that chair so high in energy?',
        choices: ['The two CH₃ groups are two carbons apart on the same face, so they crowd each other directly',
                  'Both CH₃ groups are eclipsed with the ring bonds',
                  'A chair cannot have two axial groups',
                  'The two CH₃ groups are anti to each other'],
        why: 'A CH₃/CH₃ 1,3-diaxial interaction: two big groups side by side, pointing the same way. It is much ' +
             'worse than a CH₃/H one.' },
      { id: 'd-both-eq', struct: ['trans14', 'cis14', 'trans13'],
        q: 'Which of these can have both CH₃ groups equatorial at the same time?',
        choices: ['trans-1,4-Dimethylcyclohexane', 'cis-1,4-Dimethylcyclohexane', 'trans-1,3-Dimethylcyclohexane',
                  'None of them'],
        why: 'In trans-1,4 one group is up and one is down, and in one chair those are both equatorial positions. ' +
             'Cis-1,4 and trans-1,3 always have one group axial.' },
      { id: 'd-identify',
        q: 'Is the molecule in this chair cis or trans?',
        fig: { chair: 'trans14', k: 1 },
        choices: ['Trans: one CH₃ points slightly up and the other slightly down',
                  'Cis: both CH₃ groups are equatorial',
                  'Cis: both CH₃ groups point up',
                  'You cannot tell from a chair drawing'],
        why: 'Trans means opposite faces. Here the CH₃ on C1 tilts up and the CH₃ on C4 tilts down. Both being ' +
             'equatorial does not make it cis: look at up and down, not at axial and equatorial.' },
      { id: 'd-best-drawing',
        q: 'Which drawing shows this molecule in its more stable chair?',
        fig: { flat: 'trans14' },
        choices: [{ chair: 'trans14', k: 1 }, { chair: 'trans14', k: 0 }, { chair: 'cis14', k: 0 }, { chair: 'cis14', k: 1 }],
        why: 'The drawing is trans-1,4 (one wedge, one dash). Its more stable chair has both CH₃ groups equatorial. ' +
             'The diaxial chair is the same molecule but less stable, and the other two drawings are the cis isomer.' },
      { id: 'd-rule',
        q: 'Which rule finds the more stable chair of a ring with two groups?',
        choices: ['Put as many groups as possible equatorial, and the biggest group equatorial first',
                  'Put the heaviest group axial',
                  'Put both groups axial so they point away from each other',
                  'Put the two groups on opposite faces'],
        why: 'Equatorial groups have no 1,3-diaxial interactions. If both cannot be equatorial, the one with the ' +
             'bigger A-value gets the equatorial position.' },
      { id: 'd-tm-axial', struct: ['cisTM'],
        q: 'In the more stable chair of cis-1-tert-butyl-4-methylcyclohexane, why does the CH₃ have to be axial?',
        choices: ['The groups are cis, so one must be axial, and the bigger C(CH₃)₃ takes the equatorial spot',
                  'CH₃ groups always prefer the axial position',
                  'The C(CH₃)₃ group pushes the CH₃ through the ring',
                  'It does not: both groups are equatorial'],
        why: 'In a cis-1,4 ring one group is always axial. The C(CH₃)₃ is far too big to go axial, so the CH₃ does.' }
    ]
  }
};

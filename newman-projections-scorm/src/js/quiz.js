/* quiz.js — the graded checkpoint questions.
 *
 * Four checkpoints, one at the end of each part. Each draws `draw` questions
 * from its pool: every `core` question, then a random fill. A retry of the
 * activity (a new attempt in the LMS) therefore sees a different mix.
 *
 * The correct choice is always written FIRST here; the order is shuffled on
 * screen. `why` is shown after the student answers, right or wrong — that
 * explanation is the point of the question.
 *
 * Figures:
 *   { newman: molId, phi: n }       a Newman projection at that dihedral
 *   { zigzag: molId }               the wedge/dash drawing
 *   { graph: molId, letters: {...} } the energy curve with lettered points
 * A choice can be a figure instead of text.
 *
 * Several answers are numbers from the strain table. If you change the table,
 * `node tools/validate.js` tells you which questions now disagree with it.
 */

var QUIZZES = {

  A: {
    title: 'Checkpoint 1 — ethane and the vocabulary',
    draw: 4,
    core: ['a-front', 'a-torsional'],
    pool: [
      { id: 'a-front',
        q: 'In a Newman projection, how is the FRONT carbon drawn?',
        choices: ['As the point where three bonds meet in the centre',
                  'As the circle',
                  'As a wedge',
                  'It is not drawn at all'],
        why: 'You are looking straight down the C–C bond. The front carbon is the point where its three ' +
             'bonds meet. The back carbon hides behind it and is drawn as the circle, with its bonds ' +
             'starting at the edge.' },
      { id: 'a-dihedral',
        q: 'What does the dihedral angle in a Newman projection measure?',
        choices: ['The angle between a bond on the front carbon and a bond on the back carbon',
                  'The H–C–H bond angle on one carbon (109.5°)',
                  'The angle between two bonds on the same carbon',
                  'How far the C–C bond tilts out of the page'],
        why: 'Looking down the bond, the dihedral angle is the angle you see between one front bond and ' +
             'one back bond. Turning the back carbon changes it; the bond angles on each carbon never change.' },
      { id: 'a-eclipsed',
        q: 'What is this conformation of ethane called?',
        fig: { newman: 'ethane', phi: 0 },
        choices: ['Eclipsed', 'Staggered', 'Anti', 'Gauche'],
        why: 'Every back C–H bond sits directly behind a front C–H bond (printed slightly offset so you can ' +
             'see it). That is eclipsed.' },
      { id: 'a-staggered',
        q: 'What is this conformation of ethane called?',
        fig: { newman: 'ethane', phi: 60 },
        choices: ['Staggered', 'Eclipsed', 'Totally eclipsed', 'Gauche'],
        why: 'Every back bond points exactly between two front bonds. That is staggered — the lowest-energy ' +
             'shape of ethane.' },
      { id: 'a-torsional',
        q: 'Why is eclipsed ethane higher in energy than staggered ethane?',
        choices: ['Torsional strain: the C–H bonds on the two carbons line up, and the electrons in those bonds repel',
                  'Steric strain: the hydrogen atoms are big enough to bump into each other',
                  'The C–C bond has to stretch to reach the eclipsed shape',
                  'Eclipsed ethane has fewer bonds'],
        why: 'Hydrogen atoms are too small to collide here. The 12 kJ/mol is torsional strain — the cost of ' +
             'lining bonds up one behind the other.' },
      { id: 'a-each',
        q: 'Eclipsed ethane is 12 kJ/mol higher than staggered ethane and has three H/H eclipsing ' +
           'interactions. How much does each one cost?',
        choices: ['4 kJ/mol', '12 kJ/mol', '3 kJ/mol', '36 kJ/mol'],
        why: '12 ÷ 3 = 4 kJ/mol for each H/H eclipsing interaction — the first entry in the strain table.' },
      { id: 'a-count',
        q: 'As the back carbon of ethane turns through a full 360°, how many times does the molecule pass ' +
           'through an eclipsed conformation?',
        choices: ['3', '1', '2', '6'],
        why: 'Every 120° another back C–H lines up behind a front C–H: at 0°, 120° and 240°. Your graph had ' +
             'three peaks.' },
      { id: 'a-same',
        q: 'Staggered ethane and eclipsed ethane are…',
        choices: ['Two conformations of the same molecule — turning about the C–C single bond changes one into the other',
                  'Two different compounds',
                  'Two isomers that cannot change into each other',
                  'Resonance structures'],
        why: 'No bonds are made or broken; the molecule only turns about a single bond. Different shapes of ' +
             'one molecule are called conformations.' },
      { id: 'a-roomtemp',
        q: 'At room temperature, ethane molecules…',
        choices: ['Turn rapidly about the C–C bond, but at any moment most are near a staggered conformation',
                  'Are locked in the staggered conformation',
                  'Spend equal time in every conformation',
                  'Spend most of their time eclipsed'],
        why: '12 kJ/mol is a small barrier, so the molecules rotate constantly. Staggered is lowest in ' +
             'energy, so at any instant most molecules are close to staggered.' }
    ]
  },

  B: {
    title: 'Checkpoint 2 — butane, torsional and steric strain',
    draw: 5,
    core: ['b-lowest', 'b-steric', 'b-calc'],
    pool: [
      { id: 'b-lowest',
        q: 'Which conformation of butane is lowest in energy?',
        choices: [{ newman: 'butane', phi: 180 }, { newman: 'butane', phi: 60 },
                  { newman: 'butane', phi: 120 }, { newman: 'butane', phi: 0 }],
        why: 'Anti: staggered, so no torsional strain, and the CH₃ groups are 180° apart, so no steric ' +
             'strain. 0 kJ/mol.' },
      { id: 'b-highest',
        q: 'Which conformation of butane is highest in energy?',
        choices: [{ newman: 'butane', phi: 0 }, { newman: 'butane', phi: 120 },
                  { newman: 'butane', phi: 60 }, { newman: 'butane', phi: 180 }],
        why: 'Totally eclipsed: CH₃ eclipsing CH₃ (11) plus two H/H (4 + 4) = 19 kJ/mol.' },
      { id: 'b-steric',
        q: 'Gauche butane is 3.8 kJ/mol higher in energy than anti butane. What kind of strain is that?',
        choices: ['Steric strain — the two CH₃ groups are close enough that their electron clouds repel',
                  'Torsional strain — bonds are lined up behind each other',
                  'Both torsional and steric strain',
                  'Angle strain — the bond angles are squeezed'],
        why: 'Gauche is staggered, so no bonds line up and there is no torsional strain. The 3.8 kJ/mol is ' +
             'steric strain from two CH₃ groups 60° apart.' },
      { id: 'b-calc',
        q: 'Use the strain table. What is the energy of this conformation of butane, compared with anti?',
        fig: { newman: 'butane', phi: 120 },
        choices: ['16 kJ/mol', '12 kJ/mol', '19 kJ/mol', '14 kJ/mol'],
        why: 'Two CH₃/H eclipsing interactions (6 + 6) and one H/H (4): 16 kJ/mol.' },
      { id: 'b-total',
        q: 'Totally eclipsed butane (19 kJ/mol) is higher than the other eclipsed conformation (16 kJ/mol), ' +
           'even though both have three eclipsing interactions. Why?',
        choices: ['The two CH₃ groups eclipse each other, adding steric strain to the torsional strain',
                  'Totally eclipsed butane has four eclipsing interactions',
                  'Its CH₃ groups are anti',
                  'It has a gauche interaction as well'],
        why: 'CH₃/CH₃ eclipsed costs 11 kJ/mol — torsional and steric strain together — compared with 6 for ' +
             'CH₃/H. 11 + 4 + 4 = 19.' },
      { id: 'b-count',
        q: 'How many CH₃/CH₃ gauche interactions does this conformation of butane have?',
        fig: { newman: 'butane', phi: 300 },
        choices: ['1', '0', '2', '3'],
        why: 'The two CH₃ groups are 60° apart: one gauche interaction, 3.8 kJ/mol.' },
      { id: 'b-antigauche',
        q: 'Anti and gauche butane are both staggered. What is the difference?',
        choices: ['In anti the CH₃ groups are 180° apart; in gauche they are 60° apart',
                  'Anti is staggered and gauche is eclipsed',
                  'In gauche the CH₃ groups are 180° apart; in anti they are 60° apart',
                  'There is none — they have the same energy'],
        why: 'Both are staggered. Anti puts the CH₃ groups opposite each other (180°); gauche puts them next ' +
             'to each other (60°), which costs 3.8 kJ/mol.' },
      { id: 'b-graph',
        q: 'Which lettered point on this graph is the anti conformation?',
        fig: { graph: 'butane', letters: { A: 0, B: 60, C: 120, D: 180, E: 240, F: 300 } },
        choices: ['D', 'A', 'B', 'C'],
        why: 'Anti is the lowest point on the curve, at 180°.' },
      { id: 'b-graph2',
        q: 'Point C on this graph (120°) is which conformation?',
        fig: { graph: 'butane', letters: { A: 0, B: 60, C: 120, D: 180, E: 240, F: 300 } },
        choices: ['Eclipsed, with each CH₃ eclipsing an H', 'Totally eclipsed', 'Gauche', 'Anti'],
        why: 'At 120° each CH₃ sits behind an H: eclipsed, 16 kJ/mol. Totally eclipsed is point A.' },
      { id: 'b-true',
        q: 'Which statement about butane is true?',
        choices: ['Every staggered conformation is lower in energy than every eclipsed conformation',
                  'All staggered conformations have the same energy',
                  'Eclipsed conformations have dihedral angles of 60°, 180° and 300°',
                  'The anti conformation has one gauche interaction'],
        why: 'The highest staggered conformation (gauche, 3.8) is still far below the lowest eclipsed one ' +
             '(16). But the staggered ones are not all equal: anti 0, gauche 3.8.' },
      { id: 'b-path',
        q: 'Turning butane from anti (180°) to gauche (60°) the short way, the molecule must pass through…',
        choices: ['An eclipsed conformation (CH₃ eclipsing H) at 120°',
                  'The totally eclipsed conformation at 0°',
                  'Nothing higher in energy than gauche',
                  'A second anti conformation'],
        why: 'Between any two staggered conformations lies an eclipsed one. From 180° to 60° the molecule ' +
             'passes 120°, at 16 kJ/mol.' },
      { id: 'b-ch3h',
        q: 'In the strain table, CH₃/H eclipsed costs 6 kJ/mol but H/H eclipsed only 4. Where does the ' +
           'extra 2 kJ/mol come from?',
        choices: ['CH₃ is bigger than H, so a little steric strain adds to the torsional strain',
                  'A C–H bond is weaker than a C–C bond',
                  'A gauche interaction is hidden inside it',
                  'The CH₃ group pulls electrons out of the C–C bond'],
        why: 'Both are mostly torsional strain, but a CH₃ crowds the H it eclipses a little more than another ' +
             'H would.' }
    ]
  },

  C: {
    title: 'Checkpoint 3 — halogens and branched groups',
    draw: 4,
    core: ['c-best', 'c-bond'],
    pool: [
      { id: 'c-best',
        q: 'Looking down C2–C3 of 2-bromobutane, which conformation is lowest in energy?',
        choices: [{ newman: 'bromobutane', phi: 180 }, { newman: 'bromobutane', phi: 60 },
                  { newman: 'bromobutane', phi: 300 }, { newman: 'bromobutane', phi: 0 }],
        why: 'CH₃ anti to CH₃ leaves only a Br/CH₃ gauche interaction, about 1 kJ/mol. Putting Br anti to ' +
             'the CH₃ instead forces a CH₃/CH₃ gauche interaction (3.8).' },
      { id: 'c-bond',
        q: 'Br is a much bigger atom than C, yet a Br/CH₃ gauche interaction costs about 1 kJ/mol, compared ' +
           'with 3.8 for CH₃/CH₃. What is the main reason?',
        choices: ['The C–Br bond is long (1.94 Å vs 1.54 Å for C–C), so the Br sits farther from its neighbours',
                  'A Br atom is smaller than a carbon atom',
                  'Br is attracted to the CH₃ group',
                  'Br/CH₃ is torsional strain, not steric strain'],
        why: 'A bigger atom, but on a longer bond. A CH₃ also carries three H atoms that poke toward its ' +
             'neighbours; a Br is a smooth ball held farther out.' },
      { id: 'c-rank',
        q: 'Rank these groups by the strain they cause when gauche to a CH₃, smallest first.',
        choices: ['Br < CH₃ < CH(CH₃)₂ < C(CH₃)₃',
                  'CH₃ < Br < CH(CH₃)₂ < C(CH₃)₃',
                  'C(CH₃)₃ < CH(CH₃)₂ < CH₃ < Br',
                  'CH₃ < CH(CH₃)₂ < C(CH₃)₃ < Br'],
        why: 'About 1, 3.8, 4.6 and 11.4 kJ/mol. Halogens are "small" in this sense; branching makes a group ' +
             'bulky fast.' },
      { id: 'c-tbu',
        q: 'In the lowest-energy conformation of 2,2,3-trimethylpentane, viewed down C3–C4, which group on ' +
           'C3 is anti to the CH₃ on C4?',
        choices: ['C(CH₃)₃', 'CH₃', 'H', 'None — the lowest-energy conformation is eclipsed'],
        why: 'The tert-butyl group has by far the biggest gauche cost (11.4 kJ/mol), so it goes anti. The CH₃ ' +
             'is then gauche instead: 3.8 kJ/mol.' },
      { id: 'c-ipr',
        q: 'In the lowest-energy conformation of 2,3-dimethylpentane, viewed down C3–C4, which group on C3 is ' +
           'anti to the CH₃ on C4?',
        choices: ['CH(CH₃)₂', 'CH₃', 'H', 'None — the lowest-energy conformation is eclipsed'],
        why: 'It is close. Isopropyl gauche to CH₃ costs 4.6 kJ/mol, CH₃ gauche to CH₃ costs 3.8, so the ' +
             'isopropyl group takes the anti position — but only by 0.8 kJ/mol.' },
      { id: 'c-methylbutane',
        q: 'Looking down C2–C3 of 2-methylbutane, two staggered conformations cost 3.8 kJ/mol and one costs ' +
           '7.6 kJ/mol. What makes that one worse?',
        choices: ['The CH₃ on C3 is gauche to both CH₃ groups on C2',
                  'Two of its groups are eclipsed',
                  'The CH₃ on C3 is anti to a CH₃ on C2',
                  'It has torsional strain'],
        why: 'When the H on C2 is anti to the CH₃ on C3, both CH₃ groups on C2 end up gauche to it: ' +
             '2 × 3.8 = 7.6 kJ/mol.' },
      { id: 'c-count',
        q: 'How many CH₃/CH₃ gauche interactions does this conformation of 2-methylbutane have?',
        fig: { newman: 'methylbutane', phi: 300 },
        choices: ['2', '1', '0', '3'],
        why: 'The CH₃ on the back carbon sits 60° from both CH₃ groups on the front carbon: two gauche ' +
             'interactions, 7.6 kJ/mol.' },
      { id: 'c-clbr',
        q: 'Swap the Br in 2-bromobutane for a Cl. How does the energy of the best staggered conformation change?',
        choices: ['Hardly at all — Cl and Br cost about the same when gauche to a CH₃',
                  'It drops a lot, because Cl is a smaller atom',
                  'It rises a lot, because Cl is more electronegative',
                  'The best conformation becomes an eclipsed one'],
        why: 'Cl is a smaller atom than Br, but its bond is shorter too. The two effects nearly cancel: both ' +
             'cost about 1 kJ/mol gauche to a CH₃.' },
      { id: 'c-rule',
        q: 'Which rule finds the lowest-energy staggered conformation?',
        choices: ['Put the groups with the biggest gauche costs anti to each other',
                  'Put the heaviest atoms anti to each other',
                  'Put the two hydrogens anti to each other',
                  'Eclipse the two largest groups'],
        why: 'Weight does not matter; crowding does. 2-bromobutane breaks "heaviest anti": Br is heavy but ' +
             'crowds a neighbour less than CH₃ does.' }
    ]
  },

  D: {
    title: 'Checkpoint 4 — wedges, dashes and the best conformation',
    draw: 5,
    core: ['d-dmb', 'd-A', 'd-B'],
    pool: [
      { id: 'd-dmb',
        q: 'Looking down C2–C3 of 2,3-dimethylbutane, how many CH₃/CH₃ gauche interactions does the best ' +
           'staggered conformation have?',
        choices: ['2', '0', '1', '3'],
        why: 'With the two H atoms anti, each CH₃ on C2 is anti to one CH₃ on C3 and gauche to the other: ' +
             '2 × 3.8 = 7.6 kJ/mol. No staggered conformation does better.' },
      { id: 'd-dmb-calc',
        q: 'Using the strain table, what is the energy of this conformation of 2,3-dimethylbutane?',
        fig: { newman: 'dimethylbutane', phi: 180 },
        choices: ['11.4 kJ/mol', '7.6 kJ/mol', '3.8 kJ/mol', '15.2 kJ/mol'],
        why: 'Three CH₃/CH₃ gauche interactions: 3 × 3.8 = 11.4 kJ/mol.' },
      { id: 'd-A',
        q: 'This is Molecule A. When its two Br atoms are anti, the two CH₃ groups are…',
        fig: { zigzag: 'pairA_Br' },
        choices: ['Anti', 'Gauche', 'Eclipsed', '120° apart'],
        why: 'In A, putting the Br atoms anti also puts CH₃ anti to CH₃ and H anti to H. Only two small ' +
             'Br/CH₃ gauche interactions remain: 2.0 kJ/mol.' },
      { id: 'd-B',
        q: 'This is Molecule B. When its two Br atoms are anti, the two CH₃ groups are…',
        fig: { zigzag: 'pairB_Br' },
        choices: ['Gauche', 'Anti', 'Eclipsed', '120° apart'],
        why: 'In B, putting the Br atoms anti forces the CH₃ groups gauche: 3.8 + 1 + 1 = 5.8 kJ/mol.' },
      { id: 'd-AvsB',
        q: 'Molecule B\'s best conformation (5.8 kJ/mol) is higher in energy than Molecule A\'s (2.0 kJ/mol). Why?',
        choices: ['In B, no staggered conformation lets both the Br atoms and the CH₃ groups be anti at the same time',
                  'B contains more atoms than A',
                  'B\'s bromine atoms are bigger than A\'s',
                  'B is always in an eclipsed conformation'],
        why: 'Same atoms, same bonds. The wedges and dashes decide which pairs can be anti together. In A ' +
             'both pairs can; in B one pair has to go gauche.' },
      { id: 'd-rotate',
        q: 'Can you turn Molecule A into Molecule B just by rotating about the C2–C3 bond?',
        choices: ['No — you would have to swap two groups on one carbon, which means breaking bonds. They are different molecules.',
                  'Yes — turn the back carbon 120°',
                  'Yes — turn the back carbon 180°',
                  'Yes — they are already the same conformation'],
        why: 'Rotation only changes the conformation; it can never move a Br from a wedge to a dash. You will ' +
             'learn the name for this relationship in the next unit.' },
      { id: 'd-halo',
        q: 'Going from 2,3-dichlorobutane to 2,3-dibromobutane to 2,3-diiodobutane, which conformations rise ' +
           'in energy the most?',
        choices: ['The ones where the two halogens are gauche or eclipsed with each other',
                  'The ones where the two halogens are anti',
                  'Every conformation rises by the same amount',
                  'None of them — the halogens never affect the energy'],
        why: 'Halogen/halogen contacts grow Cl < Br < I (gauche: about 5, 7 and 9 kJ/mol). When the halogens ' +
             'are anti they never touch, so those conformations barely change.' },
      { id: 'd-brbr',
        q: 'Why does a Br/Br gauche interaction (about 7 kJ/mol) cost so much more than a Br/CH₃ gauche ' +
           'interaction (about 1 kJ/mol)?',
        choices: ['Two Br atoms are both large and both carry a partial negative charge, so they repel strongly',
                  'Br/Br is an eclipsing interaction, not a gauche one',
                  'Br and CH₃ attract each other',
                  'Br/Br is torsional strain'],
        why: 'C–Br bonds are polar, with the Br δ−. Two δ− atoms with big electron clouds, 60° apart, push ' +
             'each other away.' },
      { id: 'd-torsional',
        q: 'Which of these is pure torsional strain, with no steric strain?',
        choices: ['H/H eclipsed', 'CH₃/CH₃ gauche', 'CH₃/CH₃ eclipsed', 'Br/Br gauche'],
        why: 'Two eclipsing H atoms are too small to crowd each other, so the 4 kJ/mol is all torsional strain. ' +
             'Every gauche cost is steric strain.' },
      { id: 'd-always',
        q: 'Which statement is true for every molecule in this activity?',
        choices: ['The lowest-energy conformation is a staggered one',
                  'The two heaviest atoms always end up anti',
                  'An eclipsed conformation can be lowest if the groups are small',
                  'All staggered conformations have the same energy'],
        why: 'Staggered always wins, because it has no torsional strain. WHICH staggered conformation wins ' +
             'depends on the gauche costs.' }
    ]
  }
};

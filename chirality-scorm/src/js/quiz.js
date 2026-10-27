/* quiz.js: the graded checkpoint questions.
 *
 * Four checkpoints, one at the end of each part. Each draws `draw` questions
 * from its pool: every `core` question, then a random fill. A retry of the
 * activity therefore sees a different mix.
 *
 * Nothing here asks for a calculation. Every question asks the student to
 * identify, compare, rank or explain, and the atomic numbers are open beside
 * checkpoints 2 to 4. R and S questions show drawings with 4 on the dash, on
 * a wedge, in the page or hidden; the explanations always rotate the molecule
 * until 4 is on the dash before reading it.
 *
 * The correct choice is always written FIRST here; the order is shuffled on
 * screen. `why` is shown after the student answers, right or wrong, and that
 * explanation is the point of the question.
 *
 * Figures (app.js, figure):
 *   { mol: id }                    a wedge/dash or bond-line drawing
 *     turn: n | 'over' | 'upside'  turned first (n indexes STEREO.orientations)
 *     mirror: 'beside' | 'behind'  reflected first
 *     numbers: true                carbon numbers on a zigzag
 *   { flat: id }                   a ring drawn flat, as in the chairs activity
 *   { pair: [fig, fig], captions } two drawings side by side
 * A choice can be a figure instead of text.
 *
 * Every answer that depends on a molecule is checked against the model by
 * tools/validate.js, which names any question that no longer agrees.
 */

var QUIZZES = {

  A: {
    title: 'Checkpoint 1: chirality',
    draw: 4,
    core: ['a-chiral', 'a-centre-which'],
    pool: [
      { id: 'a-chiral',
        q: 'What does it mean for a molecule to be chiral?',
        choices: ['It cannot be turned to fit exactly onto its mirror image',
                  'It has a mirror plane',
                  'It contains a halogen atom',
                  'It has more than one carbon atom'],
        why: 'Chiral means handed. Like your left and right hands, the molecule and its mirror image cannot be laid on ' +
             'each other exactly, however you turn them. A molecule with a mirror plane is achiral.' },
      { id: 'a-which-chiral',
        q: 'Which of these molecules is chiral?',
        choices: [{ mol: 'chbrclf' }, { mol: 'ch2brcl' }, { mol: 'propanol2' }, { mol: 'ethanol' }],
        why: 'Only CHBrClF has a carbon with four different groups: Br, Cl, F and H. Each of the others has two groups the ' +
             'same on its carbon, so it has a mirror plane and its mirror image fits on it.' },
      { id: 'a-centre-which',
        q: 'Which carbon of 3-methylhexane is a chirality centre?',
        fig: { mol: 'methylhexane', numbers: true },
        choices: ['C3', 'C2', 'C4', 'None of them'],
        why: 'C3 carries H, CH₃, CH₂CH₃ and CH₂CH₂CH₃: four different groups. C2 and C4 each carry two H atoms, and C1 and ' +
             'C6 are CH₃ carbons.' },
      { id: 'a-not-centre',
        q: 'Why is C3 of 3-methylpentane not a chirality centre?',
        fig: { mol: 'methylpentane', numbers: true },
        choices: ['Two of its groups are the same: it carries two CH₂CH₃ groups',
                  'It carries an H atom',
                  'It is in the middle of the chain',
                  'It has no halogen atom on it'],
        why: 'A chirality centre needs four different groups. C3 carries H, CH₃ and two identical CH₂CH₃ groups, so ' +
             '3-methylpentane has no chirality centre and is achiral.' },
      { id: 'a-count',
        q: 'How many chirality centres does 2-bromo-3-chlorobutane have?',
        fig: { mol: 'bcb_line', numbers: true },
        choices: ['2', '1', '0', '4'], compact: true,
        why: 'C2 carries H, Br, CH₃ and CHClCH₃; C3 carries H, Cl, CH₃ and CHBrCH₃. Both have four different groups. C1 ' +
             'and C4 are CH₃ carbons.' },
      { id: 'a-count-dmb',
        q: 'How many chirality centres does 2,2-dimethylbutane have?',
        fig: { mol: 'dimethylbutane', numbers: true },
        choices: ['0', '1', '2', '3'], compact: true,
        why: 'C2 carries three CH₃ groups and a CH₂CH₃ group, and every other carbon carries at least two H atoms. No carbon ' +
             'has four different groups.' },
      { id: 'a-plane',
        q: 'A molecule has a mirror plane. What does that tell you?',
        choices: ['It is achiral: its mirror image is the same molecule',
                  'It is chiral',
                  'It has exactly one chirality centre',
                  'It has an enantiomer'],
        why: 'The mirror plane cuts the molecule into two halves that are mirror images of each other, so reflecting the ' +
             'whole molecule gives the same molecule back. It is achiral and has no enantiomer.' },
      { id: 'a-mirror',
        q: 'Which drawing shows the mirror image of this molecule?',
        fig: { mol: 'chbrclf' },
        choices: [{ mol: 'chbrclf', mirror: 'beside' }, { mol: 'chbrclf', turn: 'over' }, { mol: 'chbrclf', turn: 4 },
                  { mol: 'chbrclf', turn: 9 }],
        why: 'A mirror beside the molecule turns left into right and leaves the wedge and the dash alone. The other three ' +
             'drawings are the molecule itself, turned: each would fit the original exactly.' },
      { id: 'a-mirror-behind',
        q: 'A mirror lies flat behind the page. What does it do to a drawing’s wedges and dashes?',
        choices: ['Every wedge becomes a dash and every dash becomes a wedge',
                  'Nothing: wedges stay wedges and dashes stay dashes',
                  'Only the H atom moves',
                  'Every group moves from left to right'],
        why: 'Whatever points toward you (a wedge) appears in a mirror behind the page pointing away (a dash), and the other ' +
             'way round. Bonds in the page stay where they are. The result is the mirror image.' },
      { id: 'a-meter',
        q: 'You turn the mirror image of a molecule every way you can, and at best two of its four atoms line up with the ' +
           'original. The molecule is…',
        choices: ['Chiral', 'Achiral', 'Meso', 'Not a real molecule'],
        why: 'If the mirror image never fits, the molecule is chiral. For an achiral molecule all four atoms line up in some ' +
             'position, as they did for CH₂BrCl.' },
      { id: 'a-sp2',
        q: 'Can a carbon in a C=C double bond be a chirality centre?',
        choices: ['No: it is joined to only three atoms, not four',
                  'Yes, if all its groups are different',
                  'Yes, always',
                  'Only if it also carries a halogen'],
        why: 'A chirality centre needs four different groups on one carbon. A carbon in a double bond is joined to only three ' +
             'atoms.' }
    ]
  },

  B: {
    title: 'Checkpoint 2: priorities',
    draw: 4,
    core: ['b-top', 'b-tie'],
    pool: [
      { id: 'b-top',
        q: 'Which group gets priority 1 on this chirality centre?',
        fig: { mol: 'chloroethanol' },
        choices: ['Cl', 'OH', 'CH₃', 'H'], compact: true,
        why: 'Cl is attached through chlorine, atomic number 17, the highest of the four atoms on the centre (O is 8, C is 6 ' +
             'and H is 1).' },
      { id: 'b-why-br',
        q: 'On CHBrClF, why does Br get priority 1 rather than F?',
        choices: ['Br has the higher atomic number',
                  'Br is more electronegative',
                  'Br makes the longest bond',
                  'F is drawn on a wedge'],
        why: 'Priority goes by atomic number: Br is 35 and F is 9. Electronegativity plays no part. F is the most ' +
             'electronegative atom but ranks below both Br and Cl.' },
      { id: 'b-tie',
        q: 'On 2-butanol’s chirality centre, why does CH₂CH₃ outrank CH₃?',
        fig: { mol: 'butanol' },
        choices: ['Its carbon carries (C, H, H) against (H, H, H): C beats H at the first point of difference',
                  'It has more atoms altogether',
                  'It is the longer group, so it is bigger',
                  'It is drawn in the plane of the page'],
        why: 'Both groups are attached through C, a tie. List the atoms on each of those carbons: (C, H, H) for CH₂CH₃ and ' +
             '(H, H, H) for CH₃. The first atoms already differ, C against H, and that decides it.' },
      { id: 'b-first-diff',
        q: 'On this chirality centre, which group ranks higher: CH₂OH or C(CH₃)₃?',
        fig: { mol: 'tmb' },
        choices: ['CH₂OH: (O, H, H) beats (C, C, C) at the first atom, O against C',
                  'C(CH₃)₃: it has more carbon atoms',
                  'C(CH₃)₃: its atomic numbers add up to more',
                  'They tie'],
        why: 'Compare the lists in order, highest first: O against C. O wins straight away, and nothing after the first ' +
             'difference counts, so the size of C(CH₃)₃ never matters.' },
      { id: 'b-double',
        q: 'On glyceraldehyde, why does CHO outrank CH₂OH?',
        fig: { mol: 'glyceraldehyde' },
        choices: ['The C=O counts as two O atoms: (O, O, H) beats (O, H, H)',
                  'CHO has fewer H atoms, so it ranks higher',
                  'CH₂OH is bigger, so it ranks lower',
                  'They tie, and CHO is chosen by convention'],
        why: 'A double bond counts twice, so the carbon of CHO is written as carrying (O, O, H). Against (O, H, H) the first ' +
             'atoms tie and the second ones decide: O beats H.' },
      { id: 'b-rank-alanine',
        q: 'Rank the groups on alanine’s chirality centre, highest priority first.',
        fig: { mol: 'alanine' },
        choices: ['NH₂ > COOH > CH₃ > H', 'COOH > NH₂ > CH₃ > H', 'NH₂ > CH₃ > COOH > H', 'COOH > CH₃ > NH₂ > H'],
        why: 'N (7) beats C (6), so NH₂ is 1. COOH and CH₃ both attach through C: the carbon of COOH carries (O, O, O), ' +
             'counting the C=O twice, against (H, H, H), so COOH is 2. H is 4.' },
      { id: 'b-rank-lactic',
        q: 'Rank the groups on lactic acid’s chirality centre, highest priority first.',
        fig: { mol: 'lactic' },
        choices: ['OH > COOH > CH₃ > H', 'COOH > OH > CH₃ > H', 'OH > CH₃ > COOH > H', 'COOH > CH₃ > OH > H'],
        why: 'O (8) beats C (6), so OH is 1. The carbon of COOH carries (O, O, O) and that of CH₃ carries (H, H, H), so COOH ' +
             'is 2 and CH₃ is 3. H is 4.' },
      { id: 'b-vinyl',
        q: 'On 3-methyl-1-pentene, which group ranks higher: CH=CH₂ or CH₂CH₃?',
        fig: { mol: 'methylpentene' },
        choices: ['CH=CH₂: its carbon counts as carrying (C, C, H)',
                  'CH₂CH₃: (C, H, H) beats (C, H)',
                  'CH₂CH₃: it has more H atoms',
                  'They tie'],
        why: 'The double bond counts twice, so the first carbon of CH=CH₂ carries (C, C, H). Against (C, H, H) for CH₂CH₃, ' +
             'the second atom decides: C beats H.' },
      { id: 'b-lowest',
        q: 'Which group is priority 4 on this chirality centre?',
        fig: { mol: 'bcfe' },
        choices: ['CH₃', 'F', 'Cl', 'Br'], compact: true,
        why: 'CH₃ is attached through carbon, atomic number 6, lower than F (9), Cl (17) and Br (35). Priority 4 is the ' +
             'lowest-ranked group, whatever it is: it need not be H.' },
      { id: 'b-propyl',
        q: 'On this chirality centre, which group ranks higher: CH₂CH₂CH₃ or CH₂CH₃?',
        fig: { mol: 'methylhexane_c' },
        choices: ['CH₂CH₂CH₃', 'CH₂CH₃', 'They tie'], compact: true,
        why: 'Both carbons carry (C, H, H): a tie. Move one atom further out: the next carbon of CH₂CH₂CH₃ carries ' +
             '(C, H, H) and the next of CH₂CH₃ carries (H, H, H). C beats H.' },
      { id: 'b-sum',
        q: 'Two groups are attached to a chirality centre through C. One carbon carries (Br, H, H) and the other (C, C, C). ' +
           'Which group ranks higher?',
        choices: ['The one with (Br, H, H): Br beats C at the first point of difference',
                  'The one with (C, C, C): three carbons beat two H atoms',
                  'The one with (C, C, C): its atomic numbers add up to more',
                  'They tie'],
        why: 'Compare the highest atom of each list first: Br (35) against C (6). Br wins, and nothing else is looked at. ' +
             'Adding up atomic numbers is never part of the rules.' }
    ]
  },

  C: {
    title: 'Checkpoint 3: R and S',
    draw: 4,
    core: ['c-read-wedge', 'c-which-S'],
    pool: [
      { id: 'c-read-dash',
        q: 'Is this chirality centre R or S?',
        fig: { mol: 'chbrclf' },
        choices: ['R', 'S', 'It cannot be named until the molecule is rotated'],
        why: '4 (the H) is already on the dash, so read it as it is: Br → Cl → F runs clockwise. R.' },
      { id: 'c-read-wedge',
        q: 'What is the configuration of this chirality centre?',
        fig: { mol: 'chbrclf_w' },
        choices: ['S', 'R', 'It cannot be named while 4 is on a wedge'],
        why: '4 (the H) is on the wedge, so rotate the molecule first: turned over, the H is on the dash. Then Br → Cl → F ' +
             'runs counterclockwise. S.' },
      { id: 'c-which-S',
        q: 'Which drawing shows (S)-alanine?',
        choices: [{ mol: 'alanine', turn: 7 }, { mol: 'alanine', mirror: 'beside' }, { mol: 'alanine', mirror: 'beside', turn: 5 },
                  { mol: 'alanine', mirror: 'beside', turn: 10 }],
        why: 'Rotate each drawing until the H is on the dash. Only one then has NH₂ → COOH → CH₃ running counterclockwise. The ' +
             'other three are (R)-alanine, turned different ways.' },
      { id: 'c-which-R',
        q: 'Which drawing shows (R)-2-butanol?',
        choices: [{ mol: 'butanol_R', turn: 3 }, { mol: 'butanol', turn: 'over' }, { mol: 'butanol', turn: 6 },
                  { mol: 'butanol', turn: 11 }],
        why: 'Rotate each drawing until the H is on the dash. Only one then has OH → CH₂CH₃ → CH₃ running clockwise. The ' +
             'other three are (S)-2-butanol, turned different ways.' },
      { id: 'c-rule',
        q: 'In a drawing, 4 is on a wedge. What should you do before you read 1 → 2 → 3?',
        choices: ['Rotate the molecule until 4 is on the dash',
                  'Nothing: read 1 → 2 → 3 just as it is drawn',
                  'Ignore the wedge and treat the drawing as flat',
                  'Give up: the centre cannot be named'],
        why: 'If 4 is not on the dash, rotate the molecule. 1 → 2 → 3 only tells you R or S when 4 points away from you.' },
      { id: 'c-same',
        q: 'Are these two drawings the same molecule, or enantiomers?',
        fig: { pair: [{ mol: 'butanol' }, { mol: 'butanol', turn: 5 }], captions: ['First drawing', 'Second drawing'] },
        choices: ['The same molecule: one is the other, rotated', 'Enantiomers', 'Diastereomers', 'Constitutional isomers'],
        why: 'Rotate the second drawing until its H is on the dash and both read the same: S. Same configuration, same ' +
             'molecule.' },
      { id: 'c-enant',
        q: 'How are these two drawings of 2-butanol related?',
        fig: { pair: [{ mol: 'butanol' }, { mol: 'butanol_R', turn: 8 }], captions: ['First drawing', 'Second drawing'] },
        choices: ['Enantiomers', 'The same molecule: one is the other, rotated', 'Diastereomers', 'Constitutional isomers'],
        why: 'With the H rotated onto the dash, the first reads S and the second R: mirror images that cannot be laid on ' +
             'each other.' },
      { id: 'c-mirror-label',
        q: 'A chirality centre is R. In the molecule’s mirror image, that centre is…',
        choices: ['S', 'R', 'R or S, depending on how the image is turned', 'No longer a chirality centre'],
        why: 'A mirror turns clockwise into counterclockwise, so the mirror image is S at that centre.' },
      { id: 'c-rotate-label',
        q: 'An (R) molecule is rotated a third of a turn around one of its bonds. Its label is now…',
        choices: ['Still R: rotating never changes R or S', 'S', 'R or S, depending on which bond', 'Unknown until 4 is on the dash'],
        why: 'Rotating changes how the molecule is drawn, not the molecule itself. Only a reflection (or breaking bonds) ' +
             'turns R into S.' },
      { id: 'c-not-H',
        q: 'Name the chirality centre of this 1-bromo-1-chloro-1-fluoroethane: R or S?',
        fig: { mol: 'bcfe_plane' },
        choices: ['R', 'S', 'It has none, because it has no H'],
        why: 'Here 4 is the CH₃, attached through carbon. It lies in the page, so rotate until the CH₃ is on the dash: ' +
             'Br → Cl → F then runs clockwise. R.' },
      { id: 'c-hidden',
        q: 'What is the configuration of C2 in this drawing of 2-bromobutane?',
        fig: { mol: 'bromobutane_line', numbers: true },
        choices: ['S', 'R', 'It cannot be named, because the H is not drawn'],
        why: 'The hidden H on C2 is on the wedge, opposite the dashed Br. Rotate so the H is on the dash: Br → CH₂CH₃ → CH₃ ' +
             'then runs counterclockwise. S.' },
      { id: 'c-steering',
        q: 'Seen with 4 pointing straight away from you, 1 → 2 → 3 runs counterclockwise. The centre is…',
        choices: ['S', 'R', 'Unknown until the molecule is rotated'],
        why: 'With 4 pointing away, read it as it is: counterclockwise is S.' }
    ]
  },

  D: {
    title: 'Checkpoint 4: two centres, meso and rings',
    draw: 4,
    core: ['d-count-meso', 'd-A-B'],
    pool: [
      { id: 'd-count',
        q: 'How many stereoisomers does 2-bromo-3-chlorobutane have?',
        choices: ['4', '2', '3', '8'], compact: true,
        why: 'Two centres, each R or S: (2R,3R), (2S,3S), (2R,3S) and (2S,3R). Could one be meso? Cut between C2 and C3: ' +
             'one half carries Br and the other Cl, so the halves differ and no mirror plane is possible. All four are chiral.' },
      { id: 'd-count-meso',
        q: 'How many stereoisomers does 2,3-dibromobutane have?',
        choices: ['3', '4', '2', '8'], compact: true,
        why: 'Two centres allow at most four, so check for meso. Cut between C2 and C3: both halves carry Br, H and CH₃, so ' +
             'they match. Turned so Br eclipses Br, (2R,3S) has every group facing its twin across a mirror plane: it is meso, ' +
             'and (2S,3R) is the same molecule. (2R,3R) and (2S,3S) never pair up: a pair of enantiomers. Three in all.' },
      { id: 'd-rel-enant',
        q: '(2R,3R)-2-Bromo-3-chlorobutane and (2S,3S)-2-bromo-3-chlorobutane are…',
        choices: ['Enantiomers', 'Diastereomers', 'The same molecule', 'Constitutional isomers'],
        why: 'Every centre is opposite, so they are mirror images that cannot be laid on each other: enantiomers.' },
      { id: 'd-rel-dia',
        q: '(2R,3R)-2-Bromo-3-chlorobutane and (2R,3S)-2-bromo-3-chlorobutane are…',
        choices: ['Diastereomers', 'Enantiomers', 'The same molecule', 'Constitutional isomers'],
        why: 'C2 is the same in both and C3 is opposite. They are stereoisomers but not mirror images: diastereomers.' },
      { id: 'd-meso-def',
        q: 'What is a meso compound?',
        choices: ['A molecule with chirality centres that is achiral, because it has a mirror plane',
                  'A molecule with no chirality centres',
                  'Any molecule with two chirality centres',
                  'A molecule whose mirror image cannot be laid on it'],
        why: 'A meso compound has chirality centres, yet its mirror image is the same molecule, thanks to a mirror plane ' +
             'that cuts it into two mirror-image halves. To spot one: at least two chirality centres, halves that carry the ' +
             'same groups, and a mirror plane once matching groups are turned to eclipsed. Two centres alone are not enough.' },
      { id: 'd-meso-which',
        q: 'Which drawing shows a meso compound?',
        choices: [{ mol: 'diol_wd' }, { mol: 'diol_ww' }, { mol: 'diol_dd' }, { mol: 'bcb_wd' }],
        why: 'Check the halves first: 2-bromo-3-chlorobutane carries Br on one half and Cl on the other, so it can never be ' +
             'meso. The butanediols’ halves match. Turn the one with one OH on a wedge and one on a dash until OH eclipses OH: ' +
             'every group faces its twin, so it has a mirror plane and is meso, (2R,3S). The other two never pair up: they ' +
             'are a pair of enantiomers.' },
      { id: 'd-A-B',
        q: 'Molecule A from the Newman activity is meso-2,3-dibromobutane and Molecule B is (2R,3R)-2,3-dibromobutane. A and B ' +
           'are…',
        choices: ['Diastereomers', 'Enantiomers', 'The same molecule in different conformations', 'Constitutional isomers'],
        why: 'Same atoms, same bonds, a different arrangement in space, and not mirror images: diastereomers. That is why ' +
             'their energy curves differed in the Newman activity: diastereomers are different molecules.' },
      { id: 'd-plane-conf',
        q: 'In which conformation does meso-2,3-dibromobutane show its mirror plane?',
        fig: { mol: 'dbb_A', numbers: true },
        choices: ['With the two Br atoms eclipsed', 'With the two Br atoms anti', 'With the two Br atoms gauche',
                  'In none: it has no mirror plane'],
        why: 'With Br eclipsing Br, CH₃ eclipsing CH₃ and H eclipsing H, every group faces its twin, and the plane between ' +
             'C2 and C3 cuts the molecule into mirror-image halves. In other conformations the plane does not show, but it is ' +
             'the same meso molecule: finding the plane in any one conformation is enough.' },
      { id: 'd-halves',
        q: '2,3-Dibromopentane has two chirality centres. Can any of its stereoisomers be meso?',
        fig: { mol: 'dbp_wd', numbers: true },
        choices: ['No: one half ends in CH₃ and the other in CH₂CH₃, so the halves differ',
                  'Yes: the stereoisomer with one Br on a wedge and the other Br on a dash',
                  'Yes: every molecule with two chirality centres has one meso stereoisomer',
                  'No: a meso compound always needs three or more chirality centres'],
        why: 'Cut between C2 and C3. Both centres carry Br and H, but the C2 half ends in CH₃ and the C3 half in CH₂CH₃. ' +
             'Halves that differ can never reflect onto each other, so no stereoisomer has a mirror plane: all four are chiral.' },
      { id: 'd-facing',
        q: 'Meso-2,3-dibromobutane is turned so that its two Br atoms are eclipsed. Across its mirror plane, which groups ' +
           'face each other?',
        choices: ['Br faces Br, CH₃ faces CH₃ and H faces H', 'Br faces Br, CH₃ faces H and H faces CH₃',
                  'Br faces CH₃, CH₃ faces Br and H faces H', 'None: no group faces its twin'],
        why: 'In the meso form, once Br eclipses Br, every group on C2 faces its twin on C3. That is what makes the plane ' +
             'between them a mirror plane. In the chiral (2R,3R) form, Br can face Br, but then CH₃ faces H.' },
      { id: 'd-rs-shortcut',
        q: 'A molecule has two chirality centres, C2 and C3, and its two halves match. Which stereoisomer is meso?',
        choices: ['(2R,3S)', '(2R,3R)', '(2S,3S)', 'None of them'], compact: true,
        why: 'With matching halves, (2R,3S) is meso: it has a mirror plane, and its mirror image, (2S,3R), is the same ' +
             'molecule read from the other end. (2R,3R) and (2S,3S) have no mirror plane: they are a pair of enantiomers.' },
      { id: 'd-energy',
        q: 'How does the energy of Molecule B, (2R,3R)-2,3-dibromobutane, compare with that of its enantiomer, (2S,3S)?',
        choices: ['They are the same: enantiomers have the same energy',
                  '(2S,3S) is lower', '(2S,3S) is higher', 'They cannot be compared'],
        why: 'Every conformation of one has a mirror-image conformation of the other with exactly the same strain. ' +
             'Diastereomers, like A and B, differ in energy; enantiomers do not.' },
      { id: 'd-label-both',
        q: 'What are the configurations of C2 and C3 in this molecule?',
        fig: { mol: 'bcb_ww', numbers: true },
        choices: ['(2R,3R)', '(2R,3S)', '(2S,3R)', '(2S,3S)'], compact: true,
        why: 'Both H atoms are on dashes, so read each centre as it is drawn. At C2, Br → CHClCH₃ → CH₃ runs clockwise: R. ' +
             'At C3, Cl → CHBrCH₃ → CH₃ runs clockwise too: R.' },
      { id: 'd-ring-cis13',
        q: 'cis-1,3-Dimethylcyclohexane is…',
        fig: { flat: 'cis13' },
        choices: ['Meso: it has two chirality centres and a mirror plane', 'Chiral', 'Achiral, with no chirality centres',
                  'A pair of enantiomers'],
        why: 'Two chirality centres, C1 and C3. A plane through C2 and C5 cuts the ring into halves that match: each carries ' +
             'one CH₃, and in the cis isomer both CH₃ groups are on the same face, so each reflects onto the other. That is a ' +
             'mirror plane, so it is meso: its mirror image is itself.' },
      { id: 'd-ring-14',
        q: 'Why does 1,4-dimethylcyclohexane have no chirality centres?',
        fig: { flat: 'cis14' },
        choices: ['From C1, the ring runs to C4 exactly the same way in both directions, so two of C1’s groups are the same',
                  'Ring carbons can never be chirality centres',
                  'C1 carries two H atoms',
                  'The CH₃ groups are too far apart'],
        why: 'C1 carries H, CH₃ and two branches of the ring. Going round the ring either way you meet the same atoms in the ' +
             'same order, so those two branches are identical. The same holds at C4.' },
      { id: 'd-ring-trans13',
        q: 'trans-1,3-Dimethylcyclohexane is…',
        fig: { flat: 'trans13' },
        choices: ['Chiral', 'Meso', 'Achiral, with no chirality centres'],
        why: 'Two chirality centres, and the halves either side of C2 and C5 carry the same groups, but one CH₃ points up and ' +
             'the other down, so the plane cannot reflect one onto the other. No mirror plane: chiral. Its mirror image does ' +
             'not fit on it.' },
      { id: 'd-cistrans',
        q: 'cis-1,4-Dimethylcyclohexane and trans-1,4-dimethylcyclohexane are…',
        choices: ['Diastereomers', 'Enantiomers', 'The same molecule', 'Conformations of one molecule'],
        why: 'They have the same atoms and bonds but a different arrangement in space, and they are not mirror images: ' +
             'diastereomers. Every cis and trans pair is.' }
    ]
  }
};

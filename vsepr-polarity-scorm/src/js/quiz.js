/* quiz.js: the graded checkpoint questions. These are the ONLY graded part
 * of the activity.
 *
 * Three checkpoints. Each draws `draw` questions from its pool: every `core`
 * question, then a random fill, so a new attempt in the LMS sees a different
 * mix.
 *
 * The correct choice is always written FIRST here; the order is shuffled on
 * screen. `why` is shown after the student answers, right or wrong.
 *
 * A choice is text or a Lewis structure ({ lewis: 'PCl3' }). `fig` is a
 * Lewis structure shown with the question.
 *
 * `fact` ties the answer to the model (vsepr.js), so `node tools/validate.js`
 * catches an answer that no longer matches the chemistry:
 *   ['domains', id]       the first choice is the number of electron domains
 *   ['geometry', id]      the first choice is the molecular geometry
 *   ['angle', id]         the first choice is the angle ("<109.5°" and so on)
 *   ['polar', id]         the first choice starts "Polar" or "Nonpolar", as the model says
 *   ['pick', 'geometry', name]  only the first drawing has that geometry
 *   ['pick', 'polar', true|false]  only the first drawing is polar (or nonpolar)
 * Every question that names a molecule's shape, angle or polarity must carry
 * a fact; the validator checks that too.
 *
 * Angles are asked only as students learn them: 180°, 120°, 109.5°, 90°,
 * "<109.5°" (one lone pair) and "<<109.5°" (two lone pairs). No measured
 * angle is ever asked for or shown.
 */

var QUIZZES = {

  A: {
    title: 'Checkpoint 1: electron domains',
    draw: 4,
    core: ['a-co2', 'a-why-double'],
    pool: [
      { id: 'a-co2', fact: ['domains', 'CO2'], fig: { lewis: 'CO2' },
        q: 'How many electron domains are around the C in CO₂?',
        choices: ['2', '4', '6', '8'],
        why: 'Each O is one domain, whether its bond is single, double or triple, and C has no lone pairs: 2 ' +
             'domains. (4 counts each pair of a double bond separately; a double bond is ONE domain.)' },
      { id: 'a-hcn', fact: ['domains', 'HCN'], fig: { lewis: 'HCN' },
        q: 'How many electron domains are around the C in HCN?',
        choices: ['2', '3', '4', '5'],
        why: 'One domain for the H and one for the N. The triple bond is still one domain: all three pairs sit ' +
             'between C and N and point the same way. 2 domains.' },
      { id: 'a-ch2o', fact: ['domains', 'CH2O'], fig: { lewis: 'CH2O' },
        q: 'How many electron domains are around the C in CH₂O?',
        choices: ['3', '4', '2', '6'],
        why: 'Two H atoms and one O, and no lone pairs on C: 3 domains. The C=O double bond counts once.' },
      { id: 'a-nh3', fact: ['domains', 'NH3'], fig: { lewis: 'NH3' },
        q: 'How many electron domains are around the N in NH₃?',
        choices: ['4', '3', '5', '2'],
        why: 'Three bonds to H and one lone pair. A lone pair is a domain too: 4 domains.' },
      { id: 'a-h2o', fact: ['domains', 'H2O'], fig: { lewis: 'H2O' },
        q: 'How many electron domains are around the O in H₂O?',
        choices: ['4', '2', '3', '6'],
        why: 'Two bonds to H and two lone pairs: 4 domains. (2 forgets that lone pairs are domains.)' },
      { id: 'a-bf3', fact: ['domains', 'BF3'], fig: { lewis: 'BF3' },
        q: 'How many electron domains are around the B in BF₃?',
        choices: ['3', '4', '6', '2'],
        why: 'Three bonds to F and no lone pairs on B (B is stable with 6 electrons): 3 domains.' },
      { id: 'a-pcl5', fact: ['domains', 'PCl5'], fig: { lewis: 'PCl5' },
        q: 'How many electron domains are around the P in PCl₅?',
        choices: ['5', '4', '6', '10'],
        why: 'Five bonds to Cl and no lone pairs on P: 5 domains. (10 is the number of electrons around P, not ' +
             'the number of domains.)' },
      { id: 'a-sf6', fact: ['domains', 'SF6'], fig: { lewis: 'SF6' },
        q: 'How many electron domains are around the S in SF₆?',
        choices: ['6', '4', '12', '5'],
        why: 'Six bonds to F and no lone pairs on S: 6 domains. (12 is the number of electrons around S.)' },
      { id: 'a-so4', fact: ['domains', 'SO4'], fig: { lewis: 'SO4' },
        q: 'How many electron domains are around the S in the sulfate ion, SO₄²⁻?',
        choices: ['4', '6', '8', '5'],
        why: 'Four single bonds to O and no lone pairs on S: 4 domains. An ion is counted the same way.' },
      { id: 'a-why-double',
        q: 'Why does a double bond count as only ONE electron domain?',
        choices: ['It fills one region of space, the same as a single bond or a lone pair would',
                  'A double bond has half as many electrons as a single bond, so it counts for less',
                  'Double bonds are too strong to push on the other electrons around the central atom',
                  'Only lone pairs count as domains, so a bond of any kind is counted just one time'],
        why: 'A domain is one region of space around the central atom. A double bond (or a triple bond) occupies the same space a single bond or a lone pair would: one region, so one domain.' },
      { id: 'a-what-counts',
        q: 'Which of these counts as one electron domain on the central atom?',
        choices: ['Each of them: a lone pair, a single bond, a double bond or a triple bond',
                  'Only single bonds; a double or a triple bond counts as two or three domains',
                  'Only the bonds; lone pairs on the central atom are never counted as domains',
                  'Only the lone pairs; bonds are shared, so they are not counted as domains'],
        why: 'Every bonded atom is one domain, however many pairs it shares, and every lone pair on the central ' +
             'atom is one domain.' },
      { id: 'a-spread',
        q: 'Why do electron domains spread out around the central atom?',
        choices: ['They are all negative, so they repel and get as far apart as they can',
                  'The outer atoms attract each other, so they pull the bonds into a 3D shape',
                  'The Lewis structure is drawn that way, and the molecule copies the drawing',
                  'The lone pairs pull the bonds toward them, and that bends the molecule into 3D'],
        why: 'Electrons repel electrons. The domains push each other as far apart as they can in 3D, which is ' +
             'why the molecule is not flat like its Lewis structure.' }
    ]
  },

  B: {
    title: 'Checkpoint 2: molecular geometry and angles',
    draw: 6,
    core: ['b-name-nh3', 'b-why-lp', 'b-angle-h2o'],
    pool: [
      { id: 'b-name-ch4', fact: ['geometry', 'CH4'], fig: { lewis: 'CH4' },
        q: 'What is the molecular geometry of CH₄?',
        choices: ['Tetrahedral', 'Square, flat', 'Trigonal pyramidal', 'Trigonal planar'],
        why: '4 domains, no lone pairs: the four H atoms sit at the corners of a tetrahedron. The flat square is ' +
             'only how the Lewis structure is drawn on paper.' },
      { id: 'b-name-nh3', fact: ['geometry', 'NH3'], fig: { lewis: 'NH3' },
        q: 'What is the molecular geometry of NH₃?',
        choices: ['Trigonal pyramidal', 'Tetrahedral', 'Trigonal planar', 'Bent'],
        why: '4 domains point to the corners of a tetrahedron, but one is a lone pair. The molecular geometry ' +
             'names only where the atoms are: N on top of a tripod of three H atoms, a trigonal pyramid.' },
      { id: 'b-name-h2o', fact: ['geometry', 'H2O'], fig: { lewis: 'H2O' },
        q: 'What is the molecular geometry of H₂O?',
        choices: ['Bent', 'Linear', 'Tetrahedral', 'Trigonal pyramidal'],
        why: '4 domains, two of them lone pairs. The three atoms make a V shape: bent. (Linear is how it looks in ' +
             'the Lewis structure, not in 3D.)' },
      { id: 'b-name-bf3', fact: ['geometry', 'BF3'], fig: { lewis: 'BF3' },
        q: 'What is the molecular geometry of BF₃?',
        choices: ['Trigonal planar', 'Trigonal pyramidal', 'Tetrahedral', 'Bent'],
        why: '3 domains and no lone pairs on B: a flat triangle with B in the middle, trigonal planar.' },
      { id: 'b-name-co2', fact: ['geometry', 'CO2'], fig: { lewis: 'CO2' },
        q: 'What is the molecular geometry of CO₂?',
        choices: ['Linear', 'Bent', 'Trigonal planar', 'Tetrahedral'],
        why: '2 domains (each double bond counts once) and no lone pairs on C: a straight line, linear.' },
      { id: 'b-name-pcl5', fact: ['geometry', 'PCl5'], fig: { lewis: 'PCl5' },
        q: 'What is the molecular geometry of PCl₅?',
        choices: ['Trigonal bipyramidal', 'Octahedral', 'Tetrahedral', 'Trigonal planar'],
        why: '5 domains and no lone pairs: three Cl around the middle and one above and one below, trigonal ' +
             'bipyramidal.' },
      { id: 'b-name-sf6', fact: ['geometry', 'SF6'], fig: { lewis: 'SF6' },
        q: 'What is the molecular geometry of SF₆?',
        choices: ['Octahedral', 'Trigonal bipyramidal', 'Tetrahedral', 'Hexagonal'],
        why: '6 domains and no lone pairs: one F on each side of S (left, right, up, down, front, back), ' +
             'octahedral.' },
      { id: 'b-name-pcl3', fact: ['geometry', 'PCl3'], fig: { lewis: 'PCl3' },
        q: 'What is the molecular geometry of PCl₃?',
        choices: ['Trigonal pyramidal', 'Trigonal planar', 'Tetrahedral', 'Bent'],
        why: 'P has three bonds and one lone pair: 4 domains, one of them a lone pair, so trigonal pyramidal, ' +
             'like NH₃. (Trigonal planar would need no lone pair on P.)' },
      { id: 'b-name-of2', fact: ['geometry', 'OF2'], fig: { lewis: 'OF2' },
        q: 'What is the molecular geometry of OF₂?',
        choices: ['Bent', 'Linear', 'Trigonal pyramidal', 'Tetrahedral'],
        why: 'O has two bonds and two lone pairs: 4 domains, two of them lone pairs, so bent, like H₂O.' },
      { id: 'b-name-clo3', fact: ['geometry', 'ClO3'], fig: { lewis: 'ClO3' },
        q: 'What is the molecular geometry of the chlorate ion, ClO₃⁻?',
        choices: ['Trigonal pyramidal', 'Trigonal planar', 'Tetrahedral', 'Bent'],
        why: 'Cl has three bonds and one lone pair: 4 domains, one a lone pair, so trigonal pyramidal.' },
      { id: 'b-angle-bf3', fact: ['angle', 'BF3'], fig: { lewis: 'BF3' },
        q: 'What is the F–B–F bond angle in BF₃?',
        choices: ['120°', '109.5°', '90°', '180°'],
        why: 'Three domains spread out evenly in a flat triangle: 360° ÷ 3 = 120°.' },
      { id: 'b-angle-co2', fact: ['angle', 'CO2'], fig: { lewis: 'CO2' },
        q: 'What is the O–C–O bond angle in CO₂?',
        choices: ['180°', '120°', '109.5°', '90°'],
        why: 'Two domains get as far apart as they can on opposite sides of C: 180°.' },
      { id: 'b-angle-ch4', fact: ['angle', 'CH4'], fig: { lewis: 'CH4' },
        q: 'What is the H–C–H bond angle in CH₄?',
        choices: ['109.5°', '90°', '120°', '<109.5°'],
        why: 'Four bonding domains at the corners of a tetrahedron: 109.5°. (90° is how the Lewis structure ' +
             'looks on paper.)' },
      { id: 'b-angle-sf6', fact: ['angle', 'SF6'], fig: { lewis: 'SF6' },
        q: 'What is the angle between two neighbouring S–F bonds in SF₆?',
        choices: ['90°', '120°', '109.5°', '60°'],
        why: 'Octahedral: every F is at right angles to its four neighbours, 90°.' },
      { id: 'b-angle-pcl5', fact: ['angle', 'PCl5'], fig: { lewis: 'PCl5' },
        q: 'Which bond angles does PCl₅ have?',
        choices: ['90° and 120°', 'Only 109.5°', 'Only 90°', 'Only 120°'],
        why: 'Trigonal bipyramidal: the three Cl around the middle are 120° apart, and the Cl above and below ' +
             'are at 90° to them.' },
      { id: 'b-angle-nh3', fact: ['angle', 'NH3'], fig: { lewis: 'NH3' },
        q: 'What is the H–N–H bond angle in NH₃?',
        choices: ['<109.5°', '109.5°', '<<109.5°', '120°'],
        why: 'The lone pair repels more strongly than the bonding pairs, so it squeezes the bonds a little ' +
             'closer together: less than 109.5°.' },
      { id: 'b-angle-h2o', fact: ['angle', 'H2O'], fig: { lewis: 'H2O' },
        q: 'What is the H–O–H bond angle in H₂O?',
        choices: ['<<109.5°', '<109.5°', '109.5°', '180°'],
        why: 'Two lone pairs, and each repels more strongly than a bonding pair. Together they squeeze the two ' +
             'bonds even closer than in NH₃: well below 109.5°, <<109.5°.' },
      { id: 'b-why-lp',
        q: 'Why is the H–O–H angle in H₂O smaller than the H–C–H angle in CH₄?',
        choices: ['Lone pairs repel more strongly than bonds, so H₂O’s two lone pairs squeeze its bonds closer',
                  'H₂O has only 2 electron domains, not 4 like CH₄, so its two bonds are pulled in much closer',
                  'O atoms are bigger than C atoms, so the H atoms around an O have to sit much closer together',
                  'The two H atoms in H₂O attract each other strongly, and that pulls the two O–H bonds together'],
        why: 'Both have 4 domains. A lone pair is held by only one nucleus, so it spreads out wider and pushes ' +
             'harder than a bond, squeezing the bond angle below 109.5°.' },
      { id: 'b-rank',
        q: 'Rank the bond angles from largest to smallest: CH₄, NH₃, H₂O.',
        choices: ['CH₄ > NH₃ > H₂O', 'H₂O > NH₃ > CH₄', 'NH₃ > CH₄ > H₂O', 'All three are 109.5°'],
        why: 'All three have 4 domains. No lone pairs: 109.5°. One lone pair: <109.5°. Two lone pairs: ' +
             '<<109.5°. Each lone pair squeezes the bonds a little more.' },
      { id: 'b-same-domains',
        q: 'CH₄ and NH₃ both have 4 electron domains. Why are their molecular geometries different?',
        choices: ['Molecular geometry names only where the atoms are, and one of NH₃’s domains is a lone pair',
                  'NH₃ has fewer electron domains than CH₄, because N makes only three bonds instead of four',
                  'N makes a double bond to one of its H atoms, while C makes only single bonds to its H atoms',
                  'They are not different at all: both molecules are tetrahedral, with every angle exactly 109.5°'],
        why: 'In both, the 4 domains point to the corners of a tetrahedron. In NH₃ one corner holds a lone pair, ' +
             'not an atom, so the atoms make a trigonal pyramid.' },
      { id: 'b-pick-tp', fact: ['pick', 'geometry', 'trigonal pyramidal'],
        q: 'Which molecule is trigonal pyramidal?',
        choices: [{ lewis: 'PCl3' }, { lewis: 'BCl3' }, { lewis: 'CCl4' }, { lewis: 'OF2' }],
        why: 'PCl₃: 4 domains, one a lone pair. BCl₃ has no lone pair on B (trigonal planar), CCl₄ has none ' +
             '(tetrahedral), and OF₂ has two (bent).' },
      { id: 'b-pick-bent', fact: ['pick', 'geometry', 'bent'],
        q: 'Which molecule is bent?',
        choices: [{ lewis: 'H2S' }, { lewis: 'BeCl2' }, { lewis: 'CO2' }, { lewis: 'HCN' }],
        why: 'H₂S: 4 domains, two of them lone pairs, so bent. BeCl₂, CO₂ and HCN have 2 domains and no lone ' +
             'pairs on the central atom: linear.' }
    ]
  },

  C: {
    title: 'Checkpoint 3: polarity and radial symmetry',
    draw: 6,
    core: ['c-co2', 'c-nh3-bf3', 'c-ch2cl2'],
    pool: [
      { id: 'c-co2', fact: ['polar', 'CO2'], fig: { lewis: 'CO2' },
        q: 'CO₂ has two polar C=O bonds. Is the CO₂ molecule polar?',
        choices: ['Nonpolar: it is radially symmetric, so its two polar bonds cancel each other out',
                  'Polar: each C=O bond is polar, so the whole molecule must be polar as well',
                  'Polar: O is more electronegative than C, so electrons are pulled toward both O atoms',
                  'Nonpolar: C and O have the same electronegativity, so its bonds are not polar at all'],
        why: 'Each C=O bond is polar, pulling electrons toward its O. The two O atoms sit on opposite sides of C, so the two pulls are equal and opposite: they cancel. Radially symmetric: nonpolar. Polar bonds are not enough.' },
      { id: 'c-h2o', fact: ['polar', 'H2O'], fig: { lewis: 'H2O' },
        q: 'Is H₂O polar or nonpolar?',
        choices: ['Polar: the two lone pairs on O break the symmetry, so its polar bonds do not cancel',
                  'Nonpolar: its two O–H bonds are identical, so their pulls cancel each other out',
                  'Nonpolar: it has 4 electron domains like CH₄, and CH₄ is a nonpolar molecule',
                  'Polar: H is more electronegative than O, so the electrons are pulled toward the H atoms'],
        why: 'The lone pairs take up one side of O, so both O–H bonds lean the same way. Their pulls add up instead of cancelling: a δ− end at O and a δ+ end at the H atoms. Not radially symmetric: polar.' },
      { id: 'c-ccl4', fact: ['polar', 'CCl4'], fig: { lewis: 'CCl4' },
        q: 'Is CCl₄ polar or nonpolar?',
        choices: ['Nonpolar: it is radially symmetric, so its four polar C–Cl bonds cancel out',
                  'Polar: each C–Cl bond is polar, so the whole molecule must be polar as well',
                  'Polar: Cl is more electronegative than C, so electrons are pulled toward the Cl',
                  'Nonpolar: the Cl atoms have no lone pairs, so none of its bonds can be polar'],
        why: 'Each C–Cl bond is polar, but the four Cl atoms surround C evenly. The four pulls are equal and point evenly all the way around, so they cancel. Radially symmetric: nonpolar.' },
      { id: 'c-ch2cl2', fact: ['polar', 'CH2Cl2'], fig: { lewis: 'CH2Cl2' },
        q: 'CH₂Cl₂ has the same tetrahedral shape as CCl₄. Is it polar or nonpolar?',
        choices: ['Polar: 2 H and 2 Cl are not all the same, so the bond pulls do not cancel',
                  'Nonpolar: every tetrahedral molecule is nonpolar, whatever its outer atoms are',
                  'Nonpolar: C has no lone pair, so the pulls of its four bonds always cancel',
                  'Polar: C has a lone pair, and it takes up one side of the tetrahedron'],
        why: 'The shape alone does not decide it. The C–Cl bonds pull much harder than the C–H bonds, so the four pulls are not equal and cannot cancel. Not radially symmetric: polar.' },
      { id: 'c-chcl3', fact: ['polar', 'CHCl3'], fig: { lewis: 'CHCl3' },
        q: 'Is CHCl₃ polar or nonpolar?',
        choices: ['Polar: one H and three Cl are not all the same, so the pulls do not cancel',
                  'Nonpolar: it is tetrahedral, and a tetrahedral molecule is always nonpolar',
                  'Nonpolar: C has no lone pair, so the pulls of all four bonds cancel out',
                  'Nonpolar: it has more Cl than H, so the three Cl atoms balance the one H atom'],
        why: 'One outer atom differs from the others, so the bond pulls are not equal all the way around C and cannot cancel. Not radially symmetric: polar.' },
      { id: 'c-ch4', fact: ['polar', 'CH4'], fig: { lewis: 'CH4' },
        q: 'Is CH₄ polar or nonpolar?',
        choices: ['Nonpolar: it is radially symmetric, so the pulls of its four bonds cancel',
                  'Polar: it has four bonds, and every bond between two different elements is polar',
                  'Polar: H is less electronegative than C, so each H is δ+ and the C is δ−',
                  'Polar: it has 4 electron domains, and that always makes a molecule polar'],
        why: 'Four identical H atoms evenly around C and no lone pair: radially symmetric, so the bond pulls cancel. (Its C–H bonds are barely polar anyway.) Nonpolar.' },
      { id: 'c-bf3', fact: ['polar', 'BF3'], fig: { lewis: 'BF3' },
        q: 'Is BF₃ polar or nonpolar?',
        choices: ['Nonpolar: it is radially symmetric, so its three polar B–F bonds cancel',
                  'Polar: the B–F bonds are very polar, so the molecule must be polar too',
                  'Polar: B has only 6 electrons, so the charge cannot be spread out evenly',
                  'Polar: F is the most electronegative element, so it makes any molecule polar'],
        why: 'Each B–F bond is very polar, but the three F atoms are spread evenly around B, 120° apart. The three equal pulls cancel. Radially symmetric: nonpolar.' },
      { id: 'c-sf6', fact: ['polar', 'SF6'], fig: { lewis: 'SF6' },
        q: 'Is SF₆ polar or nonpolar?',
        choices: ['Nonpolar: it is radially symmetric, so its six polar S–F bonds cancel',
                  'Polar: the S–F bonds are polar, so the whole molecule must be polar too',
                  'Polar: S has more than 8 electrons, and that pushes the charge to one side',
                  'Polar: it has 6 electron domains, and that many domains makes it polar'],
        why: 'The same atom on every side and no lone pair: radially symmetric. Each S–F bond has a partner pulling the opposite way, so the pulls cancel. Nonpolar.' },
      { id: 'c-pcl3', fact: ['polar', 'PCl3'], fig: { lewis: 'PCl3' },
        q: 'PCl₃ has three identical Cl atoms. Is it polar or nonpolar?',
        choices: ['Polar: the lone pair on P breaks the symmetry, so the bond pulls do not cancel',
                  'Nonpolar: its three Cl atoms are identical, so their pulls cancel each other out',
                  'Nonpolar: it has no double bonds, so none of its bonds is polar enough to count',
                  'Polar: P is more electronegative than Cl, so the electrons are pulled toward P'],
        why: 'Identical outer atoms are not enough: the lone pair takes up one side of P, so the three P–Cl bonds all lean the same way. Their pulls add up instead of cancelling. Not radially symmetric: polar.' },
      { id: 'c-hcn', fact: ['polar', 'HCN'], fig: { lewis: 'HCN' },
        q: 'HCN is linear, like CO₂. Is HCN polar or nonpolar?',
        choices: ['Polar: H and N are different, so the pulls on the two sides of C do not cancel',
                  'Nonpolar: every linear molecule is symmetric, so its bond pulls always cancel out',
                  'Nonpolar: C has no lone pair, so the pulls of its two bonds cancel each other',
                  'Nonpolar: its triple bond holds the electrons in the middle, between the C and the N'],
        why: 'Same shape as CO₂, but not the same on both sides of C: the C≡N bond pulls much harder than the C–H bond, so they cannot cancel. The N end is δ− and the H end δ+. Not radially symmetric: polar.' },
      { id: 'c-nh3-bf3',
        q: 'NH₃ and BF₃ both have three identical outer atoms. Why is NH₃ polar while BF₃ is not?',
        choices: ['NH₃ has a lone pair on N, so it is not symmetric and its bond pulls do not cancel',
                  'N–H bonds are polar but B–F bonds are not, so only NH₃ has polar bonds to add up',
                  'NH₃ has more atoms than BF₃, and the extra atoms give it a δ+ end and a δ− end',
                  'BF₃ has a lone pair on B, which balances its three bonds so that their pulls all cancel'],
        why: 'The radial symmetry test has two checks: no lone pair on the central atom, and every outer atom the same. BF₃ passes both, so its three bond pulls cancel. NH₃ fails the first: its lone pair takes up one side of N, so its three N–H bonds lean the same way and do not cancel.' },
      { id: 'c-rule',
        q: 'What makes a molecule radially symmetric?',
        choices: ['No lone pair on the central atom, and every outer atom the same',
                  'Every bond in the molecule is polar, so the charge spreads out evenly',
                  'It has exactly 4 electron domains, at the corners of a tetrahedron',
                  'Its outer atoms have no lone pairs, so nothing pushes the bonds aside'],
        why: 'Then it looks the same in every direction from the central atom, so the pulls of its bonds are equal all the way around and cancel: nonpolar.' },
      { id: 'c-why-sym',
        q: 'Why is a radially symmetric molecule nonpolar, even when its bonds are polar?',
        choices: ['Its polar bonds pull equally in every direction, so they cancel each other out',
                  'Its bonds stop being polar once the molecule is radially symmetric in 3D',
                  'Its outer atoms have no electrons left over, so there is no charge to move around',
                  'All of its atoms have the same electronegativity, so no bond pulls on the electrons'],
        why: 'Each polar bond still pulls electrons toward its outer atom. In a radially symmetric molecule those pulls are equal and spread evenly all the way around, so they cancel, like a tug-of-war with equal teams on every side. No δ+ end and no δ− end.' },
      { id: 'c-centres',
        q: 'In a molecule that is NOT radially symmetric, what happens to the pulls of its polar bonds?',
        choices: ['They do not cancel, so the molecule has a δ+ end and a δ− end: polar',
                  'They always cancel, because every bond pulls with exactly the same strength',
                  'They disappear, because only symmetric molecules can have polar bonds',
                  'They all point at the central atom, which becomes δ− while the rest stays neutral'],
        why: 'Without radial symmetry the pulls are uneven or all lean one way, so they add up instead of cancelling: one end δ−, the other δ+.' },
      { id: 'c-field',
        q: 'Molecules are placed between a + plate and a − plate. Which ones turn to line up?',
        choices: ['The polar ones, whose bond pulls do not cancel: their δ− end turns to the + plate',
                  'The radially symmetric ones, because their charge is spread evenly all around them',
                  'Every molecule with a polar bond, even when the pulls of its bonds cancel out',
                  'None of them, because a molecule has no overall charge for the plates to pull on'],
        why: 'Only a molecule whose bond pulls do not cancel has a δ− end and a δ+ end for the plates to pull. A radially symmetric molecule has no ends and keeps tumbling.' },
      { id: 'c-pick-polar', fact: ['pick', 'polar', true],
        q: 'Which molecule is NOT radially symmetric, and so polar?',
        choices: [{ lewis: 'NH3' }, { lewis: 'CO2' }, { lewis: 'BF3' }, { lewis: 'CCl4' }],
        why: 'NH₃: its lone pair on N breaks the radial symmetry. CO₂, BF₃ and CCl₄ have no lone pair on the central ' +
             'atom and identical outer atoms: radially symmetric.' },
      { id: 'c-pick-nonpolar', fact: ['pick', 'polar', false],
        q: 'Which molecule is radially symmetric, and so nonpolar?',
        choices: [{ lewis: 'PCl5' }, { lewis: 'H2O' }, { lewis: 'CHCl3' }, { lewis: 'NF3' }],
        why: 'PCl₅: five identical Cl atoms and no lone pair on P. H₂O and NF₃ have lone pairs on the central atom, and ' +
             'CHCl₃ has different outer atoms: none of them is radially symmetric.' }
    ]
  }
};

/* questions.js: the study guide, as data. make.js renders every figure and
 * builds the two Word files (student guide, answer key) from it.
 * Figure specs (rendered in the browser from the arrow-pushing model):
 *   { row: [cell, ...] }        cell: { label, mol | after | arrows | shift | shiftProduct, partial }
 *   { chain: id, arrows, names } a mechanism, step by step, with or without its arrows
 * No em dashes, no "spontaneous", no Lewis acid or base, no hyperconjugation.
 */
const R = (label, c) => Object.assign({ label }, c);

module.exports = [
  { stem: 'Rank each set of carbocations from least stable (1) to most stable (3). Write the numbers under the structures.',
    parts: [
      { fig: { row: [R('A', { mol: 'r3' }), R('B', { mol: 'r4' }), R('C', { mol: 'cat1' })] }, ans: 'C < A < B', why: 'A is 2°, B is 3° and C is 1°. Each alkyl group on the C⁺ is electron-donating (induction), so more alkyl groups means a more stable carbocation: 1° < 2° < 3°.' },
      { fig: { row: [R('A', { mol: 'gCyMe' }), R('B', { mol: 'gMeCy' }), R('C', { mol: 'r7' })] }, ans: 'A < C < B', why: 'A is 1° (the C⁺ has one carbon on it), C is 2° and B is 3° (the C⁺ is in the ring and has the CH₃ and two ring carbons on it).' },
      { fig: { row: [R('A', { mol: 'gBenzyl' }), R('B', { mol: 'cat1' }), R('C', { mol: 'cat2' })] }, ans: 'B < C < A', why: 'B is 1° and C is 2°. A is also 2°, but its C⁺ is next to a benzene ring: the + is spread over the ring by resonance, which stabilizes it more than any alkyl group can.' }
    ] },
  { stem: 'Each compound has two electrophilic centres. Mark both of them. (Hint: for (a) to (c) you will need to draw a resonance structure.)',
    parts: [
      { fig: { row: [R('a', { mol: 'gEnone' })] }, ans: 'The carbon of the C=O (C2) and the alkene carbon at the far end of the C=C (C4).', key: { mol: 'gEnone', partial: ['C2', 'C4'] },
        why: 'The C=O carbon is δ+ because O pulls electron density away. Push the C=O pair onto O and the C=C pair into the C2–C3 bond, and the + lands on C4.' },
      { fig: { row: [R('b', { mol: 'gRingEnone' })] }, ans: 'The carbon of the C=O (C1) and the alkene carbon next to the CH₂ (C3).', key: { mol: 'gRingEnone', partial: ['R0', 'R2'] },
        why: 'Same pattern in a ring: the C=O carbon, and the far carbon of the C=C, which carries the + in the resonance structure.' },
      { fig: { row: [R('c', { mol: 'gEnoate' })] }, ans: 'The carbon of the C=O (C1) and the alkene carbon at the far end of the C=C (C3).', key: { mol: 'gEnoate', partial: ['C1', 'C3'] },
        why: 'An ester carbonyl carbon is electrophilic. Resonance through the C=C puts a second + on C3.' },
      { fig: { row: [R('d', { mol: 'sb62' })] }, ans: 'The carbon of the C=O (C3) and the carbon bonded to Cl (C7).', key: { mol: 'sb62', partial: ['C3', 'C7'] },
        why: 'The C=O carbon and the C–Cl carbon are both δ+. The OH is a nucleophilic centre, not an electrophilic one.' }
    ] },
  { stem: 'Will each species act as a nucleophile (N) or an electrophile (E) in a polar reaction? Write N or E under each one.',
    fig: { row: ['k8e', 'kWater', 'k8i', 'kHS', 'kAcetone', 'k8d'].map((id, i) => R('abcdef'[i], { mol: id })) }, perRow: 3,
    ansText: 'a) E (an empty p orbital on C⁺). b) N, but weak (water has lone pairs and no negative charge). c) E (the C bonded to I is δ+). d) N, a strong nucleophile (HS⁻: negative charge, large and polarizable). e) E (the C=O carbon is δ+). f) N (the electrons of the C=C pi bond).' },
  { stem: 'Will each species act as a nucleophile (N) or an electrophile (E) in a polar reaction? Write N or E under each one.',
    fig: { row: ['k8f', 'k8c', 'kMeOH', 'k8a', 'kI', 'k8b'].map((id, i) => R('abcdef'[i], { mol: id })) }, perRow: 3,
    ansText: 'a) N, strong (the alkoxide O has a negative charge and lone pairs). b) E (the C=O carbon is δ+). c) N, but weak (neutral O with lone pairs). d) E (the C bonded to Br is δ+). e) N, strong (I⁻ is large and polarizable). f) N, but weak (the OH oxygen is neutral).' },
  { stem: 'For each mechanism, name the pattern of arrow pushing in each step, in order.',
    parts: [
      { fig: { chain: 'k633', arrows: true } },
      { fig: { chain: 'xTbuOH', arrows: true } },
      { fig: { chain: 'f631', arrows: true } },
      { fig: { chain: 'k649', arrows: true } }
    ], chainAnswers: true },
  { stem: 'Draw the curved arrows for each step of the mechanism, and name the pattern of each step.',
    parts: [
      { fig: { chain: 'gDehyd', arrows: false } },
      { fig: { chain: 'gHydr', arrows: false } },
      { fig: { chain: 'f623', arrows: false } },
      { fig: { chain: 'k629', arrows: false } }
    ], chainAnswers: true },
  { stem: 'Draw the curved arrows for each step, and name its pattern.',
    parts: ['acylAttack', 'tetLoss', 'alkeneH3O', 'deprotKetone', 'cMeAttack', 'dIsobuteneHBr'].map((id) => ({ fig: { chain: id, arrows: false } })), chainAnswers: true },
  { stem: 'Predict whether each carbocation will rearrange. If it will, draw the curved arrow for the rearrangement and the carbocation that results.',
    parts: ['r1', 'r3', 'r6'].map((id) => ({ fig: { row: [R(null, { mol: id })] }, shift: id })) },
  { stem: 'Predict whether each carbocation will rearrange. If it will, draw the curved arrow for the rearrangement and the carbocation that results.',
    parts: ['r8', 'r5', 'r7'].map((id) => ({ fig: { row: [R(null, { mol: id })] }, shift: id })) },
  { stem: 'Predict whether each carbocation will rearrange. If it will, draw the curved arrow for the rearrangement and the carbocation that results.',
    parts: ['gR3', 'gBu2', 'gBenzyl'].map((id) => ({ fig: { row: [R(null, { mol: id })] }, shift: id })) },
  { stem: 'Name the pattern of arrow pushing in each step: nucleophilic attack, loss of a leaving group, proton transfer or carbocation rearrangement.',
    fig: { row: ['nAllylLoss', 'nArenium', 'nPhShift', 'nCyclize', 'yAlkeneCation', 'nOxDeprot'].map((id, i) => R('abcdef'[i], { arrows: id })) }, perRow: 3,
    names: ['nAllylLoss', 'nArenium', 'nPhShift', 'nCyclize', 'yAlkeneCation', 'nOxDeprot'] },
  { stem: 'Name the pattern of arrow pushing in each step: nucleophilic attack, loss of a leaving group, proton transfer or carbocation rearrangement.',
    fig: { row: ['nTbuClLoss', 'nAllylWater', 'nAllylShift', 'protKetone', 'yOxLoss2', 'yRingHShift'].map((id, i) => R('abcdef'[i], { arrows: id })) }, perRow: 3,
    names: ['nTbuClLoss', 'nAllylWater', 'nAllylShift', 'protKetone', 'yOxLoss2', 'yRingHShift'] },
  { stem: 'What type of reaction steps are represented below?', mc: true,
    parts: [{ fig: { chain: 'ester', arrows: true }, mcChain: 'ester' }, { fig: { chain: 'gHydr', arrows: true }, mcChain: 'gHydr' }] },
  { stem: 'Answer in one or two sentences.', short: [
    { q: 'Why is a 3° carbocation more stable than a 1° carbocation?', a: 'Alkyl groups are electron-donating. Each one on the C⁺ pushes a little electron density toward it (induction), which spreads out the + charge. A 3° carbocation has three alkyl groups, a 1° has one.' },
    { q: 'Why does a proton transfer need two curved arrows?', a: 'One arrow moves a pair of electrons from the base to the H, making the new bond. An H can only have one bond, so the pair in its old bond has to leave: the second arrow moves that pair onto the atom the H came from.' },
    { q: 'In a hydride shift, what moves, and why does it only happen when it makes a more stable carbocation?', a: 'An H moves to the C⁺ next door together with the pair of electrons of its bond (H⁻). The + charge ends up on the carbon it left. It happens when that new carbon is more substituted (for example 2° to 3°), because the new carbocation is lower in energy.' },
    { q: 'A step breaks a bond and forms no new bond. Is it endothermic or exothermic? Explain.', a: 'Endothermic. Breaking a bond takes energy in, and with no new bond forming there is no energy given back out.' },
    { q: 'What does it mean for a step to be concerted? Give an example.', a: 'Two patterns happen at the same time, in one step with one transition state and no intermediate. Example: a nucleophile attacks a carbon as the leaving group leaves (hydroxide and 1-chlorobutane).' }
  ] },
  { stem: 'Challenge. The mechanism below converts 3,3-dimethylbutan-2-ol into 2-bromo-2,3-dimethylbutane with HBr.',
    parts: [
      { text: 'a) Draw the curved arrows for each step.', fig: { chain: 'f631', arrows: false }, chainAnswers: true },
      { text: 'b) Name the pattern of each step.', noFig: true, ans: 'Step 1 proton transfer, step 2 loss of a leaving group, step 3 carbocation rearrangement (a methyl shift), step 4 nucleophilic attack.' },
      { text: 'c) Explain why the CH₃ shift happens before Br⁻ attacks.', noFig: true, ans: 'Loss of water leaves a 2° carbocation. A CH₃ shift from the next carbon makes a 3° carbocation, which is more stable (three electron-donating alkyl groups), so the shift happens first and Br⁻ then attacks the more stable carbocation.' }
    ] }
];

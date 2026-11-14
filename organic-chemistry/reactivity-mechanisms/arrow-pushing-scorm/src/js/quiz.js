/* quiz.js: the graded checkpoint questions.
 *
 * Four checkpoints, one at the end of each part, and a final check on
 * reactions the student has not seen. Each draws `draw` questions: every
 * `core` question, one from each `pick` group, then a random fill from the
 * rest, so a retry sees a different mix. Every one has a vocabulary question
 * in its core; Checkpoints 3 and 4 each have one graded arrow drawing
 * (`draw: scene`), judged on the first Check, and one question naming a
 * pattern or a sequence of patterns; the final check has two drawings, a
 * pattern and a sequence.
 *
 * Nothing here asks for a calculation. The correct choice is always written
 * FIRST; the order is shuffled on screen. `why` is shown after the student
 * answers, right or wrong.
 *
 * `check` ties a question to the model, and tools/validate.js fails if the
 * model disagrees:
 *   pattern: id       the first choice is the scene's pattern (chem.js)
 *   seq: chain        the first choice is the chain's patterns, in order
 *   role: [id, r]     the first choice is the molecule's role, 'nuc' or 'elec'
 *   elecCount: id     the first choice is its number of electrophilic centres
 *   shift: id         the first choice is the carbocation's shift, or none
 *   ints: profile     the first choice is the number of intermediates
 *   rule: true        figure choices: only the first breaks one of Klein's rules
 *   steps: id         the first choice counts the scene's transition states
 *   roleIn: [id, atom] the first choice names the step's nucleophile
 *   elecAt: [id, atom] the first choice names the molecule's electrophilic atom
 *   onlyBreaks: id    the step breaks a bond and makes none
 *   arrows: [id, n]   the step takes n curved arrows
 *   chainLen: [id, n] the chain has n steps (n peaks, n − 1 valleys)
 * Figures (app.js): { mech: id, arrows }, { mol: id }, { energy: profile, dG },
 * { chain: id }.
 */

var QUIZZES = (function () {
  'use strict';

  var P = ['Nucleophilic attack', 'Loss of a leaving group', 'Proton transfer', 'Carbocation rearrangement'];
  /* the four patterns, the right one first */
  function pat(first) { return [first].concat(P.filter(function (x) { return x !== first; })); }
  var NAME_WHY = {
    lg: 'The only arrow starts on the C–Cl bond and ends on Cl: the bond breaks and Cl leaves with both electrons. That is loss of a leaving group, and it leaves a carbocation.',
    pt: 'Water takes the H, and the C–H pair moves into the ring to make a pi bond. An H moving from one atom to another without its electrons is a proton transfer.',
    shift: 'A CH₃ moves, with its bonding pair, from the next carbon onto the carbocation: a methyl shift, which is a carbocation rearrangement. The new carbocation is 3°.',
    nuc: 'A lone pair on the O makes a new bond to the carbocation. That is nucleophilic attack, even inside one molecule; it closes a ring.'
  };

  var Q = {
    A: {
      title: 'Checkpoint 1: energy and bonds',
      draw: 4,
      core: ['a-break', 'a-favor', 'a-why'],
      pool: [
        { id: 'a-break', q: 'H and Cl are pulled apart, along the arrow. Breaking a bond is:', fig: { bond: 'apart' }, choices: ['Endothermic: energy goes into the system', 'Exothermic: energy goes out of the system', 'Neither: no energy changes hands'],
          why: 'Bond breaking is endothermic. The bonding electrons sit low in energy, so the surroundings must give the system energy to pull the atoms apart.' },
        { id: 'a-why', q: 'Why does breaking a bond take energy in?', fig: { bond: 'apart' },
          choices: ['Bonded electrons sit lower than in free atoms', 'The atoms are lower in energy once they are apart', 'Breaking a bond releases the energy stored in it'],
          why: 'Two atoms bond because their shared pair sits lower in energy than in the separate atoms (the bottom of the curve). Pulling them apart lifts the electrons back up, and that energy has to come in from the surroundings.' },
        { id: 'a-favor', q: 'A reaction with ΔG < 0, like this one, is:', fig: { energy: 'exo', dG: true }, choices: ['Exergonic and thermodynamically favorable', 'Endergonic and not thermodynamically favorable', 'Endergonic and thermodynamically favorable'],
          why: 'ΔG < 0 means the products are lower in free energy than the reactants: exergonic, and thermodynamically favorable (K > 1).' },
        { id: 'a-homo', q: 'This is homolytic cleavage of H–Cl, with two fish-hook arrows. It gives:', fig: { split: 'homo' }, choices: ['Two radicals, one electron each', 'Two ions, a cation and an anion', 'A cation and a radical'],
          why: 'Homolytic: the bond splits evenly, one electron to each atom (two fish-hook arrows). Each atom has an unpaired electron: two radicals.' },
        { id: 'a-hetero', q: 'Heterolytic cleavage of H–Cl gives these ions. It is drawn with:', fig: { split: 'hetero', p: 1 }, choices: ['One curved arrow: both electrons to one atom', 'Two fish-hook arrows: one electron to each atom', 'A straight reaction arrow between the atoms'],
          why: 'Heterolytic: both electrons of the bond go to one atom, shown by one curved arrow with a full head. It makes a cation and an anion: ions.' },
        { id: 'a-647', q: 'For a reaction with ΔH° < 0, which must be true? (Klein 6.47)',
          choices: ['The bonds broken are weaker than the bonds formed', 'The bonds broken are stronger than the bonds formed', 'Every bond is broken homolytically', 'Every bond is broken heterolytically'],
          why: 'Breaking the old bonds takes energy in; making the new ones gives energy out. If more comes out than goes in (exothermic), the bonds formed must be stronger than the bonds broken.' },
        { id: 'a-endo', q: 'What does this energy diagram show?', fig: { energy: 'endo' },
          choices: ['Endergonic: not thermodynamically favorable', 'Exergonic: thermodynamically favorable', 'Exergonic: not thermodynamically favorable'],
          why: 'The products sit higher than the reactants, so ΔG > 0: endergonic, not thermodynamically favorable, and K < 1.' },
        { id: 'a-valley', q: 'On this energy diagram, the marked valley between two peaks is:', fig: { energy: 'two', mark: 2 }, choices: ['An intermediate', 'A transition state', 'The activation energy'], compact: true,
          why: 'Every peak is a transition state and every valley between peaks is an intermediate (Klein Figure 6.21).' },
        { id: 'a-ts', q: 'The marked peak is a transition state. A transition state:', fig: { energy: 'two', mark: 1 }, choices: ['Has partial bonds and cannot be isolated', 'Sits in a valley and lives a short time', 'Is another name for an intermediate'],
          why: 'A transition state is the top of a hill: bonds are partly broken and partly formed at once. The reaction passes through it; it cannot be isolated. An intermediate sits in a valley and lives for a short time.' },
        { id: 'a-dS', q: 'Which change makes ΔS of the system positive?', choices: ['One molecule breaks into two', 'Two molecules join into one', 'An open chain closes into a ring'],
          why: 'More molecules, or an open chain instead of a ring, means more ways to arrange the system: higher entropy (Klein Figure 6.7).' },
        { id: 'a-highT', q: 'ΔH > 0 and ΔS > 0. When is the reaction thermodynamically favorable?', choices: ['Only at high temperature', 'Only at low temperature', 'At every temperature', 'At no temperature'], compact: true,
          why: 'ΔG = ΔH − TΔS. With ΔH > 0 and ΔS > 0, the −TΔS term wins only when T is large enough: favorable at high temperature.' },
        { id: 'a-fast', q: 'Which one tells you how fast a reaction goes?', fig: { energy: 'exo', Ea: true, dG: true }, choices: ['Eₐ, the height of the hill', 'ΔG, from reactants to products', 'Whether it is exothermic'],
          why: 'Kinetics (how fast) depends on the activation energy, the climb from the reactants to the transition state. Thermodynamics (ΔG) only says which side is favored at equilibrium.' },
        { id: 'a-make', q: 'H and Cl come together, along the arrow, and bond. When a bond forms, energy is:', fig: { bond: 'together' }, choices: ['Released: bond making is exothermic', 'Taken in: bond making is endothermic', 'Not exchanged at all'],
          why: 'Bond making is exothermic: the electrons drop into a low-energy bonding orbital, and the system gives that energy to the surroundings.' },
        { id: 'a-K', q: 'This reaction is thermodynamically favorable. It has:', fig: { energy: 'exo', dG: true }, choices: ['K > 1', 'K < 1', 'K = 0'], compact: true,
          why: 'ΔG < 0 goes with K > 1: at equilibrium there are more products than reactants.' }
      ]
    },

    B: {
      title: 'Checkpoint 2: nucleophiles and electrophiles',
      draw: 4,
      core: ['b-nuc', 'b-empty'],
      pool: [
        { id: 'b-nuc', q: 'A nucleophile is:', choices: ['Electron-rich: it gives a pair of electrons', 'Electron-poor: it takes a pair of electrons', 'Any ion with a positive charge'],
          why: 'A nucleophile ("nucleus lover") is electron-rich and donates a pair of electrons. An electrophile ("electron lover") is electron-poor and accepts one.' },
        { id: 'b-k8a', q: 'Will this compound act as a nucleophile or an electrophile?', fig: { mol: 'k8a' }, choices: ['Electrophile', 'Nucleophile'], compact: true, check: { role: ['k8a', 'elec'] },
          why: 'Br pulls electron density from the carbon it is bonded to (induction), so that carbon is δ+: an alkyl halide is an electrophile.' },
        { id: 'b-k8f', q: 'Will this ion act as a nucleophile or an electrophile?', fig: { mol: 'k8f' }, choices: ['Nucleophile', 'Electrophile'], compact: true, check: { role: ['k8f', 'nuc'] },
          why: 'An alkoxide has a negative charge on an O with lone pairs: a strong nucleophile.' },
        { id: 'b-k8d', q: 'Will cyclohexene act as a nucleophile or an electrophile?', fig: { mol: 'k8d' }, choices: ['Nucleophile', 'Electrophile'], compact: true, check: { role: ['k8d', 'nuc'] },
          why: 'The pi bond of an alkene is a region of high electron density, so alkenes are nucleophiles.' },
        { id: 'b-k8c', q: 'Will cyclopentanone act as a nucleophile or an electrophile?', fig: { mol: 'k8c' }, choices: ['Electrophile', 'Nucleophile'], compact: true, check: { role: ['k8c', 'elec'] },
          why: 'The carbon of a C=O is δ+ by induction and by resonance, so a carbonyl group is an electrophile.' },
        { id: 'b-empty', q: 'Why is the carbon of a carbocation, like this one, electrophilic?', fig: { mol: 'cat3' }, choices: ['It has an empty p orbital', 'It has a lone pair to give', 'It has four bonds'],
          why: 'A carbocation has only three bonds and no lone pair. Its empty p orbital can accept a pair of electrons.' },
        { id: 'b-polar', q: 'Why are I⁻ and HS⁻ such strong nucleophiles?', fig: { mols: ['kI', 'kHS'] }, choices: ['They are large and polarizable', 'They hold their electrons very tightly', 'They carry a positive charge'],
          why: 'Polarizability: the electron cloud of a large atom (I, S) distorts easily toward an electrophile. Klein: I⁻ and HS⁻ are among the strongest nucleophiles known.' },
        { id: 'b-weak', q: 'Water and alcohols (ROH), like methanol, are:', fig: { mols: ['kWater', 'kMeOH'] }, choices: ['Weak nucleophiles', 'Strong nucleophiles', 'Electrophiles'], compact: true,
          why: 'Their O has lone pairs, so they can attack, but with no negative charge they are weak nucleophiles.' },
        { id: 'b-spect', q: 'In a mechanism, NaOH, LiOH and KOH are all:', fig: { mol: 'k8h' }, choices: ['The same nucleophile: hydroxide', 'Three different nucleophiles', 'Electrophiles, because of the metal'],
          why: 'Na⁺, Li⁺ and K⁺ are counter-ions that just balance the charge. All three supply the same nucleophile, HO⁻.' },
        { id: 'b-count', q: 'How many electrophilic centres does this compound have?', fig: { mol: 'sb62' }, choices: ['2', '1', '3', '0'], compact: true, check: { elecCount: 'sb62' },
          why: 'Two: the C of the C=O and the C bonded to Cl. The OH is its one nucleophilic centre (Klein SkillBuilder 6.2).' },
        { id: 'b-co', q: 'The carbon of a C=O, as in acetone, is electrophilic because:', fig: { mol: 'kAcetone' }, choices: ['O pulls electron density away from it', 'Its carbon has a lone pair to share', 'It carries a full negative charge'],
          why: 'O is more electronegative than C (induction), and a resonance structure puts + on the carbon. Either way the carbon is δ+.' }
      ]
    },

    C: {
      title: 'Checkpoint 3: the four patterns',
      draw: 5,
      core: ['c-tail', 'c-why'],
      pick: [['c-d1', 'c-d2', 'c-d3', 'c-d4'], ['c-n1', 'c-n2', 'c-n3', 'c-n4']],
      pool: [
        { id: 'c-tail', q: 'Look at the curved arrow. Its tail shows:', fig: { mech: 'brAttack' }, choices: ['Where the electrons start', 'Where the electrons end up', 'Which atom is positive'],
          why: 'The tail sits on the electrons that move, a lone pair or a bond. The head shows where they go: a new bond or a new lone pair.' },
        { id: 'c-d1', draw: 'nWaterTbu', q: 'Draw the curved arrow for this step: water attacks the carbocation.', why: 'One arrow, from a lone pair on the O of water to the carbocation: nucleophilic attack.' },
        { id: 'c-d2', draw: 'nOxLoss', q: 'Draw the curved arrow for this step: water leaves.', why: 'One arrow, from the C–O bond onto the O: loss of a leaving group. Water leaves and the carbocation is left behind.' },
        { id: 'c-d3', draw: 'nOxDeprot', q: 'Draw the curved arrows for this step: water takes a proton from the O⁺.', why: 'Two arrows: a lone pair on water to the H, and the O–H pair back onto the O. That is a proton transfer.' },
        { id: 'c-d4', draw: 'dShift2', q: 'Draw the curved arrow for this carbocation rearrangement.', why: 'One arrow, from the C2–H bond to the carbocation: the H moves with its pair (a hydride shift) and the new carbocation, on C2, is 3°.' },
        { id: 'c-n1', q: 'Read the arrow. Which pattern is this?', fig: { mech: 'nAllylLoss' }, choices: pat(P[1]), check: { pattern: 'nAllylLoss' }, why: NAME_WHY.lg },
        { id: 'c-n2', q: 'Read the arrows. Which pattern is this?', fig: { mech: 'nArenium' }, choices: pat(P[2]), check: { pattern: 'nArenium' }, why: NAME_WHY.pt },
        { id: 'c-n3', q: 'Read the arrow. Which pattern is this?', fig: { mech: 'nPhShift' }, choices: pat(P[3]), check: { pattern: 'nPhShift' }, why: NAME_WHY.shift },
        { id: 'c-n4', q: 'Read the arrow. Which pattern is this?', fig: { mech: 'nCyclize' }, choices: pat(P[0]), check: { pattern: 'nCyclize' }, why: NAME_WHY.nuc },
        { id: 'c-head', q: 'Look at the curved arrow. Its head shows:', fig: { mech: 'brAttack' }, choices: ['A new bond or a new lone pair', 'Where the electrons came from', 'A positive charge leaving'],
          why: 'The head shows where the electrons end up: a new bond (or pi bond), or a new lone pair.' },
        { id: 'c-rule', q: 'Which drawing breaks one of Klein’s rules for curved arrows?', rule: true,
          choices: [{ mech: 'brAttack', rule: 'rPlus' }, { mech: 'brAttack' }, { mech: 'brLoss' }, { mech: 'protKetone' }], check: { rule: true },
          why: 'Its arrow starts on the carbocation. Never put the tail on a positive charge: it has no electrons to give. The tail goes on a lone pair or a bond.' },
        { id: 'c-two', q: 'Acetone takes a proton from H₃O⁺. How many curved arrows does a proton transfer take?', fig: { mol: 'protKetone' }, choices: ['Two', 'One', 'Three'], compact: true,
          why: 'Two: one from the base to the H, and one for the pair of the bond the H leaves. Leaving out the second is the most common mistake.' },
        { id: 'c-stable', q: 'Which carbocation is the most stable?', fig: { mols: ['cat0', 'cat1', 'cat2', 'cat3'] }, choices: ['Tertiary (3°)', 'Secondary (2°)', 'Primary (1°)', 'Methyl'], compact: true,
          why: 'Alkyl groups are electron-donating: each one on the C⁺ pushes electron density toward it by induction. More alkyl groups, more stable: 3° > 2° > 1° > methyl.' },
        { id: 'c-donate', q: 'The three CH₃ groups stabilize this carbocation because alkyl groups are:', fig: { mol: 'cat3' }, choices: ['Electron-donating', 'Electron-withdrawing', 'Positively charged'], compact: true,
          why: 'Alkyl groups are electron-donating groups: by induction they push electron density toward the C⁺ and spread out its positive charge.' },
        { id: 'c-r1', q: 'Will this carbocation rearrange?', fig: { mol: 'r1' }, choices: ['Yes: a hydride shift', 'Yes: a methyl shift', 'No'], compact: true, check: { shift: 'r1' },
          why: 'It is 2°. The carbon next door carries an H; if that H shifts over, the new carbocation is 3°. So a hydride shift.' },
        { id: 'c-r6', q: 'Will this carbocation rearrange?', fig: { mol: 'r6' }, choices: ['Yes: a methyl shift', 'Yes: a hydride shift', 'No'], compact: true, check: { shift: 'r6' },
          why: 'It is 2°. An H from the other neighbour would only give another 2° carbocation, but a CH₃ from the carbon with two CH₃ groups gives a 3° one. So a methyl shift (Klein SkillBuilder 6.6).' },
        { id: 'c-r3', q: 'Will this carbocation rearrange?', fig: { mol: 'r3' }, choices: ['No', 'Yes: a hydride shift', 'Yes: a methyl shift'], compact: true, check: { shift: 'r3' },
          why: 'It is 2°. A hydride shift from either neighbour gives another 2° (or a 1°) carbocation, which is no more stable. So it does not rearrange.' },
        { id: 'c-hmove', q: 'This is a hydride shift. What moves?', fig: { mech: 'shiftH' }, choices: ['An H, with its pair of electrons', 'A proton, without its electrons', 'A whole methyl group'],
          why: 'A hydride shift moves H⁻: the H and both electrons of its bond. A proton (H⁺) moves without its electrons, in a proton transfer.' },
        { id: 'c-why', q: 'Why does this carbocation rearrange?', fig: { mech: 'shiftMe' }, choices: ['To become a more stable cation', 'To pick up one more electron', 'To get rid of its positive charge'],
          why: 'Only if the shift makes a more stable carbocation (for example 2° to 3°). The new one is still a carbocation.' }
      ]
    },

    D: {
      title: 'Checkpoint 4: putting the patterns together',
      draw: 5,
      core: ['d-energy', 'd-why2'],
      pick: [['d-d1', 'd-d2', 'd-d3', 'd-d4'], ['d-s1', 'd-s2']],
      pool: [
        { id: 'd-energy', q: 'In every step, breaking a bond ___ and making a bond ___.', choices: ['Takes in energy; gives out energy', 'Gives out energy; takes in energy', 'Takes in energy; takes in energy'],
          why: 'Bond breaking is endothermic (energy in) and bond making is exothermic (energy out). A step is uphill or downhill depending on which wins.' },
        { id: 'd-d1', draw: 'dSN2', q: 'Draw the curved arrows for this concerted step.', why: 'Two arrows at once: a lone pair on S attacks the carbon (nucleophilic attack) as the C–Br pair goes onto Br (loss of a leaving group).' },
        { id: 'd-d2', draw: 'dAcylOH', q: 'Draw the curved arrows for hydroxide attacking acetyl chloride.', why: 'Two arrows: the O of hydroxide attacks the C of the C=O, and the pi bond’s pair moves up onto the O. One pattern: nucleophilic attack.' },
        { id: 'd-d3', draw: 'dIsobuteneHBr', q: 'Draw the curved arrows: the pi bond takes the H of HBr, making a 3° carbocation.', why: 'Two arrows: from the pi bond to the H, and from the H–Br bond onto Br. A proton transfer, with the pi bond as the base.' },
        { id: 'd-d4', draw: 'cMeAttack', q: 'Draw the curved arrows for the methyl anion attacking acetone.', why: 'Two arrows: the lone pair on the CH₃⁻ attacks the C of the C=O, and the pi bond’s pair moves onto the O. Nucleophilic attack.' },
        { id: 'd-s1', q: 'What is the sequence of patterns in this mechanism (Klein Figure 6.31)?', fig: { chain: 'f631' }, check: { seq: 'f631' },
          choices: ['Proton transfer, loss of a leaving group, carbocation rearrangement, nucleophilic attack',
                    'Nucleophilic attack, loss of a leaving group, carbocation rearrangement, proton transfer',
                    'Proton transfer, carbocation rearrangement, loss of a leaving group, nucleophilic attack'],
          why: 'HBr protonates the OH, water leaves, a CH₃ shifts to make a 3° carbocation, and Br⁻ attacks: all four patterns, one per step.' },
        { id: 'd-s2', q: 'What is the sequence of patterns in this mechanism (Klein SkillBuilder 6.4)?', fig: { chain: 'ester' }, check: { seq: 'ester' },
          choices: ['Nucleophilic attack, loss of a leaving group, proton transfer', 'Proton transfer, nucleophilic attack, loss of a leaving group',
                    'Loss of a leaving group, nucleophilic attack, proton transfer'],
          why: 'Hydroxide attacks the C=O, the alkoxide (CH₃O⁻) is pushed out, and it takes a proton from the acid. Klein: dozens of reactions follow this same three-step sequence.' },
        { id: 'd-why2', q: 'Why does this proton transfer need two curved arrows?', fig: { mech: 'protKetone' },
          choices: ['Without the second, the H would have two bonds', 'Each curved arrow moves only one electron', 'One arrow moves the H, one moves its positive charge'],
          why: 'The first arrow makes a new bond to the H. An H can only have one bond, so its old O–H bond must break: the second arrow moves that pair onto the O.' },
        { id: 'd-concert', q: 'This step is concerted. A concerted step is one in which:', fig: { mech: 'sn2' }, choices: ['Two patterns happen in one step', 'Two steps happen one after another', 'A bond breaks but none forms'],
          why: 'Concerted: two patterns at the same time, in a single step with one transition state, like nucleophilic attack and loss of a leaving group together.' },
        { id: 'd-onestep', q: 'This step is concerted. What does its energy diagram have?', fig: { mech: 'sn2' }, check: { steps: 'sn2' },
          choices: ['One transition state, no intermediate', 'Two transition states, one intermediate', 'No transition state, one intermediate'],
          why: 'One step means one hill: one transition state, where the C–O bond is forming as the C–Cl bond breaks, and no intermediate.' },
        { id: 'd-brattack', q: 'When Br⁻ attacks a carbocation, as here, energy is:', fig: { mech: 'brAttack' }, choices: ['Released: a bond forms', 'Taken in: a bond breaks', 'Unchanged: no bond changes'],
          why: 'Nothing breaks in that step and a C–Br bond forms. Bond making is exothermic, so energy is released.' },
        { id: 'd-four', q: 'How many characteristic patterns of arrow pushing do all ionic mechanisms combine?', choices: ['Four', 'Two', 'Six', 'Ten'], compact: true,
          why: 'Four: nucleophilic attack, loss of a leaving group, proton transfer and carbocation rearrangement. Every ionic mechanism is a combination of them (Klein 6.9).' },
        { id: 'd-which', q: 'In Klein’s Figure 6.31, which step is the carbocation rearrangement?', fig: { chain: 'f631' },
          choices: ['A CH₃ moves from C3 to C2', 'The H of HBr moves to O', 'Water leaves from C2'],
          why: 'The 2° carbocation on C2 takes a CH₃ (with its pair) from C3, which becomes a 3° carbocation.' },
        { id: 'd-ints', q: 'How many intermediates does this energy diagram show?', fig: { energy: 'f631' }, choices: ['3', '4', '2', '1'], compact: true, check: { ints: 'f631' },
          why: 'Four steps, four hills (transition states), and a valley between each pair of hills: three intermediates.' }
      ]
    },

    E: {
      title: 'Final check: all four patterns',
      draw: 7,
      core: ['e-not', 'e-in'],
      pick: [['e-d1', 'e-d2', 'e-d3'], ['e-d4', 'e-d5', 'e-d6'], ['e-s1', 'e-s2', 'e-s3'], ['e-n1', 'e-n2', 'e-n3', 'e-n4']],
      pool: [
        { id: 'e-not', q: 'Which of these is not one of the four patterns of arrow pushing?', compact: true,
          choices: ['Homolytic cleavage', 'Proton transfer', 'Loss of a leaving group', 'Carbocation rearrangement'],
          why: 'The four patterns are nucleophilic attack, loss of a leaving group, proton transfer and carbocation rearrangement. All four move electrons in pairs. Homolytic cleavage moves one electron to each atom and makes radicals.' },
        { id: 'e-d1', draw: 'xIodAttack', q: 'Draw the curved arrow for this step: iodide attacks the carbocation.', why: 'One arrow, from a lone pair on I⁻ to the carbocation: nucleophilic attack. A bond forms, so energy is released.' },
        { id: 'e-d2', draw: 'xIodLoss', q: 'Draw the curved arrow for this step: iodide leaves.', why: 'One arrow, from the C–I bond onto I: loss of a leaving group. It leaves a 3° carbocation. A bond breaks, so the step takes energy in.' },
        { id: 'e-d3', draw: 'xRingShift', q: 'This carbocation rearranges. Draw the curved arrow.', why: 'One arrow, from the bond to a CH₃ on the next carbon to the carbocation: a methyl shift. The 2° carbocation becomes 3°.' },
        { id: 'e-d4', draw: 'xAcidOH', q: 'Draw the curved arrows for this step: hydroxide takes the proton of acetic acid.', why: 'Two arrows: a lone pair on hydroxide to the H, and the O–H pair onto the O of the acid. A proton transfer.' },
        { id: 'e-d5', draw: 'k629', q: 'Draw the curved arrows for this concerted step (Klein 6.29).', why: 'Two arrows at once: a lone pair on the O of ethoxide attacks the carbon (nucleophilic attack) as the C–I pair goes onto I (loss of a leaving group).' },
        { id: 'e-d6', draw: 'xNH3Acyl', q: 'Draw the curved arrows for ammonia attacking acetyl chloride.', why: 'Two arrows: the lone pair on N attacks the C of the C=O, and the pi bond’s pair moves onto the O, so the carbon never has five bonds. One pattern: nucleophilic attack.' },
        { id: 'e-s1', q: 'What is the sequence of patterns in this mechanism (Klein 6.49)?', fig: { chain: 'k649' }, check: { seq: 'k649' },
          choices: ['Proton transfer, loss of a leaving group', 'Loss of a leaving group, proton transfer', 'Nucleophilic attack, proton transfer', 'Proton transfer, nucleophilic attack'],
          why: 'First the O takes the H of HBr (two arrows: a proton transfer). Then the C–O bond breaks and water leaves: loss of a leaving group.' },
        { id: 'e-s2', q: 'What is the sequence of patterns in this mechanism (Klein 6.33)?', fig: { chain: 'k633' }, check: { seq: 'k633' },
          choices: ['Nucleophilic attack, loss of a leaving group', 'Loss of a leaving group, nucleophilic attack', 'Proton transfer, loss of a leaving group', 'Nucleophilic attack, proton transfer'],
          why: 'Hydroxide attacks the C of the C=O (the pi pair moves onto O). Then the O⁻ pushes a pair back down and Cl⁻ is pushed out: loss of a leaving group.' },
        { id: 'e-s3', q: 'What is the sequence of patterns in this mechanism?', fig: { chain: 'xTbuOH' }, check: { seq: 'xTbuOH' },
          choices: ['Proton transfer, loss of a leaving group, nucleophilic attack', 'Loss of a leaving group, proton transfer, nucleophilic attack',
                    'Proton transfer, nucleophilic attack, loss of a leaving group', 'Nucleophilic attack, loss of a leaving group, proton transfer'],
          why: 'HCl protonates the OH, water leaves to give a 3° carbocation, and Cl⁻ attacks it. It is Klein’s Figure 6.31 without the rearrangement: the carbocation is already 3°.' },
        { id: 'e-n1', q: 'Read the arrow. Which pattern is this?', fig: { mech: 'yAlkeneCation' }, choices: pat(P[0]), check: { pattern: 'yAlkeneCation' },
          why: 'The pi bond is the nucleophile: its pair makes a new C–C bond to the carbocation. That is nucleophilic attack. The carbon that lost its share of the pi bond becomes the new carbocation.' },
        { id: 'e-n2', q: 'Read the arrow. Which pattern is this?', fig: { mech: 'yOxLoss2' }, choices: pat(P[1]), check: { pattern: 'yOxLoss2' },
          why: 'The C–O bond breaks and its pair goes onto the O: water leaves. Loss of a leaving group, which leaves a carbocation.' },
        { id: 'e-n3', q: 'Read the arrows. Which pattern is this?', fig: { mech: 'yAmineHCl' }, choices: pat(P[2]), check: { pattern: 'yAmineHCl' },
          why: 'The lone pair on N takes the H, and the H–Cl pair goes onto Cl. An H moving from one atom to another without its electrons is a proton transfer.' },
        { id: 'e-n4', q: 'Read the arrow. Which pattern is this?', fig: { mech: 'yRingHShift' }, choices: pat(P[3]), check: { pattern: 'yRingHShift' },
          why: 'An H on the next carbon moves over with its bonding pair: a hydride shift, which is a carbocation rearrangement. The 2° carbocation becomes 3°.' },
        { id: 'e-nuc', q: 'In this step, which is the nucleophile (Klein 6.29)?', fig: { mech: 'k629' }, check: { roleIn: ['k629', 'Oe'] },
          choices: ['Ethoxide, CH₃CH₂O⁻', 'Iodomethane, CH₃I', 'Neither: both are electrophiles'],
          why: 'Ethoxide has a negative charge on an O with lone pairs: it is electron-rich and gives a pair. The carbon of CH₃I is δ+ because I pulls electron density away: it is the electrophile.' },
        { id: 'e-elec', q: 'A nucleophile attacks acetone. Which atom does it attack?', fig: { mol: 'kAcetone' }, check: { elecAt: ['kAcetone', 'C'] },
          choices: ['The carbon of the C=O', 'The oxygen of the C=O', 'A CH₃ carbon'],
          why: 'The carbon of a C=O is δ+: O pulls electron density away from it. A nucleophile is attracted to that electron-poor carbon.' },
        { id: 'e-in', q: 'Iodide leaves this molecule, and no new bond forms. Why does that step take energy in?', fig: { mol: 'xIodLoss' }, check: { onlyBreaks: 'xIodLoss' },
          choices: ['A bond breaks and none forms to pay it back', 'The I⁻ that leaves carries energy away with it', 'Breaking the C–I bond releases stored energy'],
          why: 'Bond breaking is endothermic. With no new bond to give energy back out, the step is uphill.' },
        { id: 'e-r8', q: 'Will this carbocation rearrange?', fig: { mol: 'r8' }, choices: ['Yes: a methyl shift', 'Yes: a hydride shift', 'No'], compact: true, check: { shift: 'r8' },
          why: 'It is 2°. The carbon next door has two CH₃ groups and no H; if one CH₃ shifts over, the new carbocation is 3°. A methyl shift (Klein 6.41).' },
        { id: 'e-r9', q: 'Will this carbocation rearrange?', fig: { mol: 'r9' }, choices: ['No', 'Yes: a hydride shift', 'Yes: a methyl shift'], compact: true, check: { shift: 'r9' },
          why: 'It is 2°, and a hydride shift from either neighbour would only make another 2° carbocation. Nothing is gained, so it does not rearrange.' },
        { id: 'e-two', q: 'Ethoxide attacks iodomethane as iodide leaves, in one concerted step. How many curved arrows does it take?', fig: { mol: 'k629' }, choices: ['Two', 'One', 'Three'], compact: true, check: { arrows: ['k629', 2] },
          why: 'Two: one from the nucleophile’s lone pair to the carbon, and one from the bond to the leaving group onto the leaving group. One arrow alone would give carbon five bonds.' },
        { id: 'e-miss', q: 'Which drawing is missing a curved arrow?', rule: true,
          choices: [{ mech: 'yAmineHCl', rule: 'rHalf2' }, { mech: 'yAmineHCl' }, { mech: 'yOxLoss2' }, { mech: 'yAlkeneCation' }], check: { rule: true },
          why: 'With only the arrow to the H, that H would have two bonds. A proton transfer always takes two arrows: the second moves the H–Cl pair onto Cl.' },
        { id: 'e-three', q: 'This mechanism has three steps. Its energy diagram has:', fig: { chain: 'xTbuOH' }, check: { chainLen: ['xTbuOH', 3] },
          choices: ['Three transition states and two intermediates', 'Two transition states and three intermediates', 'Three transition states and three intermediates'],
          why: 'Every step has one hill, so three transition states. An intermediate sits in each valley between two hills: two of them.' }
      ]
    }
  };

  /* What each wrong choice says (the misconception, then the next move),
     in the order of the choices after the first. Pattern and shift
     questions get theirs from what each pattern and each shift looks like. */
  var SIG = {
    'Nucleophilic attack': 'Nucleophilic attack would show a lone pair or a pi bond making a new bond to an electrophile.',
    'Loss of a leaving group': 'Loss of a leaving group would show a bond breaking, with its pair going onto the group that leaves.',
    'Proton transfer': 'A proton transfer would show two arrows moving an H from one atom to another, without its electrons.',
    'Carbocation rearrangement': 'A carbocation rearrangement would show an H or a CH₃ next to a C⁺ moving over with its pair.'
  };
  var SHIFT = {
    'Yes: a hydride shift': { 'Yes: a methyl shift': 'A methyl shift here would not give a more stable carbocation. Check each neighbour of the C⁺ for an H whose move makes it more substituted.',
                              'No': 'A shift does pay here: moving an H from a neighbouring carbon gives a more stable carbocation. Check each neighbour of the C⁺.' },
    'Yes: a methyl shift': { 'Yes: a hydride shift': 'Moving an H here does not give a more stable carbocation. Look at the neighbour that carries the CH₃ groups.',
                             'No': 'A shift does pay here: moving a CH₃ from a neighbouring carbon gives a more stable carbocation. Check each neighbour of the C⁺.' },
    'No': { 'Yes: a hydride shift': 'Moving an H over would only make a carbocation that is no more stable. A shift happens only when it gains stability.',
            'Yes: a methyl shift': 'No CH₃ move makes a more stable carbocation here. A shift happens only when it gains stability.' }
  };
  var WRONG = {
    'a-break': ['Exothermic means energy out, and that is bond making. Pulling two bonded atoms apart needs energy put in.',
                'Every bond holds its atoms together; that hold has to be overcome, so energy must be supplied.'],
    'a-why': ['If the separate atoms were lower in energy, bonds would fall apart by themselves. Atoms bond because the shared pair sits lower.',
              'The most common mix-up: breaking a bond never releases energy. Energy comes out only when a bond forms.'],
    'a-favor': ['Endergonic means ΔG > 0. Here ΔG < 0: the products are lower in free energy.',
                'Endergonic means ΔG > 0, and then the reaction is not thermodynamically favorable. Start from the sign of ΔG.'],
    'a-homo': ['Ions come from heterolytic cleavage, where both electrons go to one atom. Homo means the same: one electron each.',
               'Each atom gets one electron back, so neither ends up charged. A cation would mean one atom lost its electron.'],
    'a-hetero': ['Two fish-hooks move one electron each: that is homolytic cleavage. Hetero means different: both electrons go to one atom.',
                 'A reaction arrow separates reactants from products; it never shows where electrons go. Electrons move along curved arrows.'],
    'a-647': ['If the bonds broken were stronger, more energy would go in than comes out, and ΔH would be positive. Compare energy in with energy out.',
              'How a bond breaks does not set the sign of ΔH. Compare the strength of the bonds broken with the bonds formed.',
              'How a bond breaks does not set the sign of ΔH. Compare the strength of the bonds broken with the bonds formed.'],
    'a-endo': ['Exergonic needs the products lower than the reactants. Look where the products sit compared with the reactants.',
               'Exergonic and not favorable never go together: exergonic is ΔG < 0, which is favorable. And here the products sit higher.'],
    'a-valley': ['A transition state is a peak, the top of a hill. The marked valley is a species that lives for a moment.',
                 'Eₐ is a height (the climb from the reactants to a peak), not a point on the curve.'],
    'a-ts': ['That describes an intermediate. A transition state is the top of a peak.',
             'An intermediate sits in a valley and can last a short time. A transition state is the peak, with bonds half made and half broken.'],
    'a-dS': ['Fewer molecules means fewer ways to arrange them: ΔS < 0. Look for the change that makes more pieces.',
             'A ring is held in place, so it has fewer ways to arrange itself than an open chain: ΔS < 0.'],
    'a-highT': ['At low temperature the −TΔS term is small, so the positive ΔH wins and ΔG > 0. Ask which term grows with T.',
                'With ΔH > 0 working against it, ΔG < 0 needs a big enough −TΔS. That only happens when T is large.',
                'ΔS > 0 helps: −TΔS is negative and grows with T. At a high enough temperature it outweighs ΔH.'],
    'a-fast': ['ΔG compares the start with the end: it says which side is favored, not how fast you get there. Speed depends on the hill.',
               'Exothermic is about where the products end up, not the speed. How fast depends on the height of the hill, Eₐ.'],
    'a-make': ['Taking energy in is bond breaking. When a bond forms, the electrons drop lower in energy and the difference goes out.',
               'Making a bond always gives energy out: the same amount it would take to break it again.'],
    'a-K': ['K < 1 means the reactants are favored at equilibrium: ΔG > 0, not thermodynamically favorable.',
            'K is never 0: some products always form. Favorable means more products than reactants at equilibrium.'],
    'b-nuc': ['That is an electrophile, the "electron lover". A nucleophile, the "nucleus lover", brings the electrons.',
              'A positive ion has no pair to give. A nucleophile is electron-rich, usually with a lone pair or a pi bond.'],
    'b-k8a': ['Br has lone pairs, but they are held tightly. Look at the carbon: Br pulls electron density away from it, so it is δ+.'],
    'b-k8f': ['The O carries a negative charge and lone pairs: it is electron-rich, so it gives a pair.'],
    'b-k8d': ['There is no δ+ atom to attack here. The pi bond is a region of electron density that can be given.'],
    'b-k8c': ['The O has lone pairs, but the reactive site is the carbon of the C=O: O pulls density away, so that carbon is δ+.'],
    'b-empty': ['A carbocation has no lone pair; a pair to give would make it a nucleophile.',
                'Count again: the C⁺ has only three bonds. That is why it has room for a pair.'],
    'b-polar': ['Electrons held tightly are hard to give. I and S are large, so their electron clouds shift easily toward an electrophile.',
                'Both carry a negative charge (the ⁻ in I⁻ and HS⁻). A positive charge would make them electrophiles.'],
    'b-weak': ['Strong nucleophiles carry a negative charge, like HO⁻. Water and alcohols are neutral, so their lone pairs are given less readily.',
               'Their O has lone pairs to give, so they are nucleophiles, just weak ones.'],
    'b-spect': ['The metal ions only balance the charge; all three deliver the same HO⁻.',
                'Na⁺, Li⁺ and K⁺ are spectator ions. The part that reacts is HO⁻, a nucleophile.'],
    'b-count': ['Look for every δ+ carbon: the C of the C=O, and the carbon bonded to Cl.',
                'The O of the OH is electron-rich: a nucleophilic centre, not an electrophilic one. Count only the δ+ carbons.',
                'There are δ+ carbons here: the C of the C=O, and the carbon bonded to Cl.'],
    'b-co': ['The carbon of a C=O has no lone pair; the lone pairs are on the O.',
             'The carbon is δ+, not negative: the more electronegative O pulls electron density away from it.'],
    'c-tail': ['That is the head. The tail sits on the electrons before they move.',
               'Arrows never start on a positive charge. The tail is on the electrons: a lone pair or a bond.'],
    'c-head': ['That is the tail. The head points to where the electrons end up.',
               'Arrows move electrons, not charges. The head shows a new bond or a new lone pair; the charges follow from that.'],
    'c-rule': ['This arrow starts on a lone pair of Br⁻ and ends on the C⁺: it follows every rule.',
               'This arrow starts on the C–Br bond and ends on Br: it follows every rule.',
               'Both tails sit on electrons (a lone pair, then an O–H bond) and the H keeps one bond: it follows every rule.'],
    'c-two': ['With one arrow the H would have two bonds. The pair of the bond the H leaves needs its own arrow.',
              'A proton transfer moves two pairs: one to the H, one from its old bond. A third arrow would be another pattern.'],
    'c-stable': ['A 2° carbocation has two alkyl groups pushing electron density in. A 3° has three, so it is more stable.',
                 'A 1° carbocation has only one alkyl group to help. Count the alkyl groups on the C⁺: more is more stable.',
                 'A methyl carbocation has no alkyl groups at all: it is the least stable.'],
    'c-donate': ['Pulling density away would make the C⁺ even poorer. Alkyl groups push electron density toward it.',
                 'Alkyl groups are neutral. They help by pushing electron density toward the C⁺ (induction).'],
    'c-hmove': ['A proton without its electrons moves in a proton transfer. In a hydride shift the H keeps its pair: H⁻.',
                'A CH₃ moving is a methyl shift. Hydride means an H with its pair.'],
    'c-why': ['No electron is gained: the H or CH₃ brings the pair of its own bond, and the + just moves.',
              'After the shift it is still a carbocation; the + only moves to a carbon where it is more stable.'],
    'd-energy': ['That is backwards: breaking takes energy in, making gives energy out.',
                 'Making a bond gives energy out: the electrons drop into a lower-energy bond.'],
    'd-why2': ['A curved arrow with a full head moves a pair, two electrons. Fish-hooks move one, and these are not fish-hooks.',
               'Arrows move electrons, never charges. The second arrow moves the pair of the O–H bond the H leaves.'],
    'd-s1': ['The first step makes no bond to carbon: HBr gives its H to the O. Read each step’s arrows in order.',
             'The rearrangement needs a carbocation first, and that comes from water leaving. Read each step in order.'],
    'd-s2': ['Step 1 moves no H between atoms: hydroxide’s lone pair makes a bond to the C of the C=O.',
             'Nothing leaves first: step 1 makes a bond to the C of the C=O. Read each step’s arrows in order.'],
    'd-concert': ['Steps one after another are a sequence, with an intermediate between them. Concerted means at the same time.',
                  'That is loss of a leaving group on its own. Concerted means two patterns happen together, in one step.'],
    'd-onestep': ['Two hills and a valley would be two steps. A concerted step is one step: one hill.',
                  'Every step passes over a hill, a transition state. Intermediates sit between steps, and here there is only one step.'],
    'd-brattack': ['No bond breaks in this step: Br⁻ only makes a new bond to the C⁺.',
                   'A new C–Br bond forms, and bond making gives energy out.'],
    'd-four': ['Count them: nucleophilic attack, loss of a leaving group, proton transfer and carbocation rearrangement.',
               'Count them: nucleophilic attack, loss of a leaving group, proton transfer and carbocation rearrangement.',
               'Count them: nucleophilic attack, loss of a leaving group, proton transfer and carbocation rearrangement.'],
    'd-which': ['An H moving to the O is a proton transfer, the first step.',
                'Water leaving is loss of a leaving group: it makes the carbocation that then rearranges.'],
    'd-ints': ['Four is the number of hills (transition states). Count only the valleys between hills.',
               'Count every valley between two hills: there are three.',
               'One valley would mean two steps. This diagram has four hills, so three valleys between them.'],
    'e-not': ['Proton transfer is one of the four: an H moves between atoms, two arrows.',
              'Loss of a leaving group is one of the four: a bond breaks and its pair leaves.',
              'Carbocation rearrangement is one of the four: an H or CH₃ shifts to the C⁺.'],
    'e-s1': ['Water cannot leave until it is water: the OH must take the H first. Read step 1 again.',
             'No new bond to carbon forms in step 1: the O takes the H of HBr.',
             'Step 2 makes no new bond: the C–O bond breaks and water leaves.'],
    'e-s2': ['Nothing leaves first: step 1 is hydroxide’s pair making a bond to the C of the C=O.',
             'No H moves in step 1: hydroxide attacks the carbon.',
             'No H moves in step 2: the C=O re-forms and Cl⁻ is pushed out.'],
    'e-s3': ['HO⁻ is a poor leaving group; it leaves only after it takes an H and becomes water. Step 1 is the proton transfer.',
             'Cl⁻ cannot attack until there is a carbocation, and that needs water to leave first.',
             'Read step 1: HCl gives its H to the O; no bond to carbon forms.'],
    'e-nuc': ['The C of CH₃I is δ+: it receives the pair, so it is the electrophile.',
              'Ethoxide carries a negative charge and lone pairs: it is electron-rich, a nucleophile.'],
    'e-elec': ['The O is δ−: it is electron-rich and repels a nucleophile. Its neighbour is the δ+ atom.',
               'A CH₃ carbon is not electron-poor: no strongly electronegative atom pulls on it.'],
    'e-in': ['The I⁻ does not carry energy away. The step is uphill because a bond breaks and none forms.',
             'Breaking a bond never releases energy: it takes energy in. Energy comes out only when a bond forms.'],
    'e-two': ['One arrow would give the carbon a fifth bond. The leaving group needs its own arrow.',
              'Count the pairs that move: the nucleophile’s lone pair and the bond to the leaving group. Two.'],
    'e-miss': ['This proton transfer has both arrows: one to the H and one from the H–Cl bond onto Cl.',
               'Water leaving takes one arrow: the C–O pair goes onto the O. Nothing is missing.',
               'A pi bond attacking a C⁺ takes one arrow, and no atom gets a fifth bond. Nothing is missing.'],
    'e-three': ['Each step is one hill, so three steps means three transition states.',
                'Intermediates sit only between steps: three steps leave two valleys between them.']
  };
  Object.keys(Q).forEach(function (k) {
    Q[k].pool.forEach(function (q) {
      if (q.draw) return;
      if (WRONG[q.id]) q.wrong = WRONG[q.id];
      else if (q.check && q.check.pattern) q.wrong = q.choices.slice(1).map(function (c) { return SIG[c] + ' Follow each tail and head, then name what they do.'; });
      else if (q.check && q.check.shift) q.wrong = q.choices.slice(1).map(function (c) { return SHIFT[q.choices[0]][c]; });
    });
  });
  return Q;
})();

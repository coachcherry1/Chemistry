/* quiz.js: the graded checkpoint questions.
 *
 * Four checkpoints, one at the end of each part. Each draws `draw`
 * questions: every `core` question, one from each `pick` group, then a
 * random fill from the rest, so a retry sees a different mix. Every
 * checkpoint has a vocabulary question in its core; Checkpoints 3 and 4 each
 * have one graded arrow drawing (`draw: scene`), judged on the first Check,
 * and one question naming a pattern or a sequence of patterns.
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
 *   rev: card         the first choice is the card's reaction arrow (Klein 6.12)
 *   steps: id         the first choice counts the scene's transition states
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

  return {
    A: {
      title: 'Checkpoint 1: energy and bonds',
      draw: 4,
      core: ['a-break', 'a-favor'],
      pool: [
        { id: 'a-break', q: 'Breaking a bond is:', choices: ['Endothermic: energy goes into the system', 'Exothermic: energy goes out of the system', 'Neither: no energy changes hands'],
          why: 'Bond breaking is endothermic. The bonding electrons sit low in energy, so the surroundings must give the system energy to pull the atoms apart.' },
        { id: 'a-favor', q: 'A reaction with ΔG < 0 is:', choices: ['Exergonic and thermodynamically favorable', 'Endergonic and not thermodynamically favorable', 'Endergonic and thermodynamically favorable'],
          why: 'ΔG < 0 means the products are lower in free energy than the reactants: exergonic, and thermodynamically favorable (K > 1).' },
        { id: 'a-homo', q: 'Homolytic cleavage of a bond gives:', choices: ['Two radicals, one electron each', 'Two ions, a cation and an anion', 'A cation and a radical'],
          why: 'Homolytic: the bond splits evenly, one electron to each atom (two fish-hook arrows). Each atom has an unpaired electron: two radicals.' },
        { id: 'a-hetero', q: 'Heterolytic cleavage is drawn with:', choices: ['One curved arrow: both electrons to one atom', 'Two fish-hook arrows: one electron to each atom', 'A straight reaction arrow between the atoms'],
          why: 'Heterolytic: both electrons of the bond go to one atom, shown by one curved arrow with a full head. It makes a cation and an anion: ions.' },
        { id: 'a-647', q: 'For a reaction with ΔH° < 0, which must be true? (Klein 6.47)',
          choices: ['The bonds broken are weaker than the bonds formed', 'The bonds broken are stronger than the bonds formed', 'Every bond is broken homolytically', 'Every bond is broken heterolytically'],
          why: 'Breaking the old bonds takes energy in; making the new ones gives energy out. If more comes out than goes in (exothermic), the bonds formed must be stronger than the bonds broken.' },
        { id: 'a-endo', q: 'What does this energy diagram show?', fig: { energy: 'endo', dG: true },
          choices: ['Endergonic: not thermodynamically favorable', 'Exergonic: thermodynamically favorable', 'Exergonic: not thermodynamically favorable'],
          why: 'The products sit higher than the reactants, so ΔG > 0: endergonic, not thermodynamically favorable, and K < 1.' },
        { id: 'a-valley', q: 'On an energy diagram, a valley between two peaks is:', choices: ['An intermediate', 'A transition state', 'The activation energy'], compact: true,
          why: 'Every peak is a transition state and every valley between peaks is an intermediate (Klein Figure 6.21).' },
        { id: 'a-ts', q: 'A transition state:', choices: ['Has partial bonds and cannot be isolated', 'Sits in a valley and lives a short time', 'Is another name for an intermediate'],
          why: 'A transition state is the top of a hill: bonds are partly broken and partly formed at once. The reaction passes through it; it cannot be isolated. An intermediate sits in a valley and lives for a short time.' },
        { id: 'a-dS', q: 'Which change makes ΔS of the system positive?', choices: ['One molecule breaks into two', 'Two molecules join into one', 'An open chain closes into a ring'],
          why: 'More molecules, or an open chain instead of a ring, means more ways to arrange the system: higher entropy (Klein Figure 6.7).' },
        { id: 'a-highT', q: 'ΔH > 0 and ΔS > 0. When is the reaction thermodynamically favorable?', choices: ['Only at high temperature', 'Only at low temperature', 'At every temperature', 'At no temperature'], compact: true,
          why: 'ΔG = ΔH − TΔS. With ΔH > 0 and ΔS > 0, the −TΔS term wins only when T is large enough: favorable at high temperature.' },
        { id: 'a-fast', q: 'Which one tells you how fast a reaction goes?', choices: ['Eₐ, the height of the hill', 'ΔG, from reactants to products', 'Whether it is exothermic'],
          why: 'Kinetics (how fast) depends on the activation energy, the climb from the reactants to the transition state. Thermodynamics (ΔG) only says which side is favored at equilibrium.' },
        { id: 'a-make', q: 'When a bond forms, energy is:', choices: ['Released: bond making is exothermic', 'Taken in: bond making is endothermic', 'Not exchanged at all'],
          why: 'Bond making is exothermic: the electrons drop into a low-energy bonding orbital, and the system gives that energy to the surroundings.' },
        { id: 'a-K', q: 'A reaction that is thermodynamically favorable has:', choices: ['K > 1', 'K < 1', 'K = 0'], compact: true,
          why: 'ΔG < 0 goes with K > 1: at equilibrium there are more products than reactants.' }
      ]
    },

    B: {
      title: 'Checkpoint 2: nucleophiles and electrophiles',
      draw: 4,
      core: ['b-nuc'],
      pool: [
        { id: 'b-nuc', q: 'A nucleophile is:', choices: ['Electron-rich: it gives a pair of electrons', 'Electron-poor: it takes a pair of electrons', 'Any ion with a positive charge'],
          why: 'A nucleophile ("nucleus lover") is electron-rich and donates a pair of electrons: a Lewis base. An electrophile ("electron lover") is electron-poor and accepts one: a Lewis acid.' },
        { id: 'b-lewis', q: 'An electrophile is also:', choices: ['A Lewis acid', 'A Lewis base', 'A radical'], compact: true,
          why: 'An electrophile accepts a pair of electrons, which is what a Lewis acid does.' },
        { id: 'b-k8a', q: 'Will this compound act as a nucleophile or an electrophile?', fig: { mol: 'k8a' }, choices: ['Electrophile', 'Nucleophile'], compact: true, check: { role: ['k8a', 'elec'] },
          why: 'Br pulls electron density from the carbon it is bonded to (induction), so that carbon is δ+: an alkyl halide is an electrophile.' },
        { id: 'b-k8f', q: 'Will this ion act as a nucleophile or an electrophile?', fig: { mol: 'k8f' }, choices: ['Nucleophile', 'Electrophile'], compact: true, check: { role: ['k8f', 'nuc'] },
          why: 'An alkoxide has a negative charge on an O with lone pairs: a strong nucleophile.' },
        { id: 'b-k8d', q: 'Will cyclohexene act as a nucleophile or an electrophile?', fig: { mol: 'k8d' }, choices: ['Nucleophile', 'Electrophile'], compact: true, check: { role: ['k8d', 'nuc'] },
          why: 'The pi bond of an alkene is a region of high electron density, so alkenes are nucleophiles.' },
        { id: 'b-k8c', q: 'Will cyclopentanone act as a nucleophile or an electrophile?', fig: { mol: 'k8c' }, choices: ['Electrophile', 'Nucleophile'], compact: true, check: { role: ['k8c', 'elec'] },
          why: 'The carbon of a C=O is δ+ by induction and by resonance, so a carbonyl group is an electrophile.' },
        { id: 'b-empty', q: 'Why is the carbon of a carbocation electrophilic?', choices: ['It has an empty p orbital', 'It has a lone pair to give', 'It has four bonds'],
          why: 'A carbocation has only three bonds and no lone pair. Its empty p orbital can accept a pair of electrons.' },
        { id: 'b-polar', q: 'Why are I⁻ and HS⁻ such strong nucleophiles?', choices: ['They are large and polarizable', 'They hold their electrons very tightly', 'They carry a positive charge'],
          why: 'Polarizability: the electron cloud of a large atom (I, S) distorts easily toward an electrophile. Klein: I⁻ and HS⁻ are among the strongest nucleophiles known.' },
        { id: 'b-weak', q: 'Water and alcohols (ROH) are:', choices: ['Weak nucleophiles', 'Strong nucleophiles', 'Electrophiles'], compact: true,
          why: 'Their O has lone pairs, so they can attack, but with no negative charge they are weak nucleophiles.' },
        { id: 'b-spect', q: 'In a mechanism, NaOH, LiOH and KOH are all:', choices: ['The same nucleophile: hydroxide', 'Three different nucleophiles', 'Electrophiles, because of the metal'],
          why: 'Na⁺, Li⁺ and K⁺ are counter-ions that just balance the charge. All three supply the same nucleophile, HO⁻.' },
        { id: 'b-count', q: 'How many electrophilic centres does this compound have?', fig: { mol: 'sb62' }, choices: ['2', '1', '3', '0'], compact: true, check: { elecCount: 'sb62' },
          why: 'Two: the C of the C=O and the C bonded to Cl. The OH is its one nucleophilic centre (Klein SkillBuilder 6.2).' },
        { id: 'b-co', q: 'The carbon of a C=O is electrophilic because:', choices: ['O pulls electron density away from it', 'Its carbon has a lone pair to share', 'It carries a full negative charge'],
          why: 'O is more electronegative than C (induction), and a resonance structure puts + on the carbon. Either way the carbon is δ+.' }
      ]
    },

    C: {
      title: 'Checkpoint 3: the four patterns',
      draw: 5,
      core: ['c-tail'],
      pick: [['c-d1', 'c-d2', 'c-d3', 'c-d4'], ['c-n1', 'c-n2', 'c-n3', 'c-n4']],
      pool: [
        { id: 'c-tail', q: 'The tail of a curved arrow shows:', choices: ['Where the electrons start', 'Where the electrons end up', 'Which atom is positive'],
          why: 'The tail sits on the electrons that move, a lone pair or a bond. The head shows where they go: a new bond or a new lone pair.' },
        { id: 'c-d1', draw: 'nWaterTbu', q: 'Draw the curved arrow for this step: water attacks the carbocation.', why: 'One arrow, from a lone pair on the O of water to the carbocation: nucleophilic attack.' },
        { id: 'c-d2', draw: 'nOxLoss', q: 'Draw the curved arrow for this step: water leaves.', why: 'One arrow, from the C–O bond onto the O: loss of a leaving group. Water leaves and the carbocation is left behind.' },
        { id: 'c-d3', draw: 'nOxDeprot', q: 'Draw the curved arrows for this step: water takes a proton from the O⁺.', why: 'Two arrows: a lone pair on water to the H, and the O–H pair back onto the O. That is a proton transfer.' },
        { id: 'c-d4', draw: 'dShift2', q: 'Draw the curved arrow for this carbocation rearrangement.', why: 'One arrow, from the C2–H bond to the carbocation: the H moves with its pair (a hydride shift) and the new carbocation, on C2, is 3°.' },
        { id: 'c-n1', q: 'Read the arrow. Which pattern is this?', fig: { mech: 'nAllylLoss' }, choices: pat(P[1]), check: { pattern: 'nAllylLoss' }, why: NAME_WHY.lg },
        { id: 'c-n2', q: 'Read the arrows. Which pattern is this?', fig: { mech: 'nArenium' }, choices: pat(P[2]), check: { pattern: 'nArenium' }, why: NAME_WHY.pt },
        { id: 'c-n3', q: 'Read the arrow. Which pattern is this?', fig: { mech: 'nPhShift' }, choices: pat(P[3]), check: { pattern: 'nPhShift' }, why: NAME_WHY.shift },
        { id: 'c-n4', q: 'Read the arrow. Which pattern is this?', fig: { mech: 'nCyclize' }, choices: pat(P[0]), check: { pattern: 'nCyclize' }, why: NAME_WHY.nuc },
        { id: 'c-head', q: 'The head of a curved arrow shows:', choices: ['A new bond or a new lone pair', 'Where the electrons came from', 'A positive charge leaving'],
          why: 'The head shows where the electrons end up: a new bond (or pi bond), or a new lone pair.' },
        { id: 'c-rule', q: 'Which drawing breaks one of Klein’s rules for curved arrows?', rule: true,
          choices: [{ mech: 'brAttack', rule: 'rPlus' }, { mech: 'brAttack' }, { mech: 'brLoss' }, { mech: 'protKetone' }], check: { rule: true },
          why: 'Its arrow starts on the carbocation. Never put the tail on a positive charge: it has no electrons to give. The tail goes on a lone pair or a bond.' },
        { id: 'c-two', q: 'How many curved arrows does a proton transfer take?', choices: ['Two', 'One', 'Three'], compact: true,
          why: 'Two: one from the base to the H, and one for the pair of the bond the H leaves. Leaving out the second is the most common mistake.' },
        { id: 'c-stable', q: 'Which carbocation is the most stable?', choices: ['Tertiary (3°)', 'Secondary (2°)', 'Primary (1°)', 'Methyl'], compact: true,
          why: 'Each alkyl group on the C⁺ donates a little electron density into its empty p orbital (hyperconjugation): 3° > 2° > 1° > methyl.' },
        { id: 'c-hyper', q: 'Neighbouring alkyl groups stabilize a carbocation by:', choices: ['Hyperconjugation', 'Resonance', 'Hydrogen bonding'], compact: true,
          why: 'Hyperconjugation: a C–H or C–C bond next door overlaps a little with the empty p orbital and shares some of its electron density.' },
        { id: 'c-r1', q: 'Will this carbocation rearrange?', fig: { mol: 'r1' }, choices: ['Yes: a hydride shift', 'Yes: a methyl shift', 'No'], compact: true, check: { shift: 'r1' },
          why: 'It is 2°. The carbon next door carries an H; if that H shifts over, the new carbocation is 3°. So a hydride shift.' },
        { id: 'c-r6', q: 'Will this carbocation rearrange?', fig: { mol: 'r6' }, choices: ['Yes: a methyl shift', 'Yes: a hydride shift', 'No'], compact: true, check: { shift: 'r6' },
          why: 'It is 2°. An H from the other neighbour would only give another 2° carbocation, but a CH₃ from the carbon with two CH₃ groups gives a 3° one. So a methyl shift (Klein SkillBuilder 6.6).' },
        { id: 'c-r3', q: 'Will this carbocation rearrange?', fig: { mol: 'r3' }, choices: ['No', 'Yes: a hydride shift', 'Yes: a methyl shift'], compact: true, check: { shift: 'r3' },
          why: 'It is 2°. A hydride shift from either neighbour gives another 2° (or a 1°) carbocation, which is no more stable. So it does not rearrange.' },
        { id: 'c-hmove', q: 'In a hydride shift, what moves?', choices: ['An H, with its pair of electrons', 'A proton, without its electrons', 'A whole methyl group'],
          why: 'A hydride shift moves H⁻: the H and both electrons of its bond. A proton (H⁺) moves without its electrons, in a proton transfer.' },
        { id: 'c-why', q: 'Why does a carbocation rearrange?', choices: ['To become a more stable cation', 'To pick up one more electron', 'To get rid of its positive charge'],
          why: 'Only if the shift makes a more stable carbocation (for example 2° to 3°). The new one is still a carbocation.' }
      ]
    },

    D: {
      title: 'Checkpoint 4: putting the patterns together',
      draw: 5,
      core: ['d-energy'],
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
        { id: 'd-concert', q: 'A concerted step is one in which:', choices: ['Two patterns happen in one step', 'Two steps happen one after another', 'A bond breaks but none forms'],
          why: 'Concerted: two patterns at the same time, in a single step with one transition state, like nucleophilic attack and loss of a leaving group together.' },
        { id: 'd-onestep', q: 'This step is concerted. What does its energy diagram have?', fig: { mech: 'sn2' }, check: { steps: 'sn2' },
          choices: ['One transition state, no intermediate', 'Two transition states, one intermediate', 'No transition state, one intermediate'],
          why: 'One step means one hill: one transition state, where the C–O bond is forming as the C–Cl bond breaks, and no intermediate.' },
        { id: 'd-shiftarrow', q: 'Klein draws a carbocation rearrangement with which reaction arrow?', choices: ['→, irreversible', '⇌, reversible'], compact: true, check: { rev: 'v4' },
          why: 'The more stable carbocation dominates so heavily that the reverse shift is negligible: an irreversible arrow.' },
        { id: 'd-water', q: 'Reversible (⇌) or irreversible (→)?', fig: { mech: 'nWaterTbu' }, check: { rev: 'v1' },
          choices: ['⇌: water can leave again', '→: water can never leave again'],
          why: 'After water attacks, it can leave again just as easily, so the step runs both ways: ⇌.' },
        { id: 'd-methyl', q: 'Reversible (⇌) or irreversible (→)?', fig: { mech: 'cMeAttack' }, check: { rev: 'v2' },
          choices: ['→: CH₃⁻ is a poor leaving group', '⇌: CH₃⁻ is a good leaving group'],
          why: 'A methyl anion is a very strong base and a very poor leaving group: once it has attacked, it does not leave again. →.' },
        { id: 'd-brattack', q: 'When Br⁻ attacks a carbocation, energy is:', choices: ['Released: a bond forms', 'Taken in: a bond breaks', 'Unchanged: no bond changes'],
          why: 'Nothing breaks in that step and a C–Br bond forms. Bond making is exothermic, so energy is released.' },
        { id: 'd-four', q: 'How many characteristic patterns of arrow pushing do all ionic mechanisms combine?', choices: ['Four', 'Two', 'Six', 'Ten'], compact: true,
          why: 'Four: nucleophilic attack, loss of a leaving group, proton transfer and carbocation rearrangement. Every ionic mechanism is a combination of them (Klein 6.9).' },
        { id: 'd-which', q: 'In Klein’s Figure 6.31, which step is the carbocation rearrangement?', fig: { chain: 'f631' },
          choices: ['A CH₃ moves from C3 to C2', 'The H of HBr moves to O', 'Water leaves from C2'],
          why: 'The 2° carbocation on C2 takes a CH₃ (with its pair) from C3, which becomes a 3° carbocation.' },
        { id: 'd-ints', q: 'How many intermediates does this energy diagram show?', fig: { energy: 'f631' }, choices: ['3', '4', '2', '1'], compact: true, check: { ints: 'f631' },
          why: 'Four steps, four hills (transition states), and a valley between each pair of hills: three intermediates.' }
      ]
    }
  };
})();

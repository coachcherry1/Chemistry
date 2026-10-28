/* quiz.js: the graded checkpoint questions.
 *
 * Five checkpoints, one at the end of each part. Each draws `draw`
 * questions from its pool: every `core` question, then a random fill, so a
 * retry sees a different mix. Every checkpoint has a reagent-function
 * question in its core: Klein's first step, practised all the way through.
 *
 * Nothing here asks for a calculation, and no question asks students to draw
 * arrows: arrows are practised (ungraded) in the steps and judged here by
 * picking the right drawing.
 *
 * The correct choice is always written FIRST; the order is shuffled on
 * screen. `why` is shown after the student answers, right or wrong.
 *
 * `check` ties a question to the model, and tools/validate.js fails if the
 * model disagrees:
 *   fn: key             the first choice is that reagent's function
 *   fnPick: fn          the first choice is the only reagent with that function
 *   major: [id, key]    the first choice is the model's major product
 *   none: [id, key]     the first choice is not formed; the others are
 *   mech: [id, key]     the first choice is the mechanisms the model gives
 *   degree: id          the first choice is the substrate's class
 *   shift: [id, kind]   the carbocation's best shift
 *   faster: [id, id]    the first ring reacts faster by E2 (its reactive chair is the stable one)
 *   names: [id, key]    every name in the first choice is a model product
 *   mechfig: true       figure choices: the first has the mechanism's own arrows
 * Figures (app.js, figure): { mol: id }, { smiles }, { ring, ene }, { mech, arrows }, { pair }.
 */

var QUIZZES = (function () {
  'use strict';

  var F = React.FUNCTIONS;
  var FN = {
    nuc: 'Nucleophile only (strong nucleophile, weak base)',
    both: 'Strong nucleophile and strong base',
    base: 'Base only (strong base, weak nucleophile)',
    weak: 'Weak nucleophile, weak base'
  };
  void F;
  /* the four functions, the right one first */
  function fnChoices(key) {
    var fn = React.REAGENTS[key].fn;
    return [FN[fn]].concat(['nuc', 'both', 'base', 'weak'].filter(function (x) { return x !== fn; }).map(function (x) { return FN[x]; }));
  }
  function fnWhy(key) { return React.REAGENTS[key].why; }

  return {
    A: {
      title: 'Checkpoint 1: the function of the reagent',
      draw: 4,
      core: ['a-nash', 'a-dbu'],
      pool: [
        { id: 'a-nash', q: 'What is the function of NaSH?', choices: fnChoices('NaSH'), check: { fn: 'NaSH' }, why: fnWhy('NaSH') },
        { id: 'a-dbu', q: 'What is the function of DBU?', choices: fnChoices('DBU'), check: { fn: 'DBU' }, why: fnWhy('DBU') },
        { id: 'a-naoet', q: 'What is the function of NaOEt?', choices: fnChoices('NaOEt'), check: { fn: 'NaOEt' }, why: fnWhy('NaOEt') },
        { id: 'a-etoh', q: 'What is the function of ethanol, EtOH?', choices: fnChoices('EtOH'), check: { fn: 'EtOH' }, why: fnWhy('EtOH') },
        { id: 'a-nacn', q: 'What is the function of NaCN?', choices: fnChoices('NaCN'), check: { fn: 'NaCN' }, why: fnWhy('NaCN') },
        { id: 'a-tbuok', q: 't-BuOK and NaOEt are both strong nucleophiles and strong bases. What is different about t-BuOK?',
          choices: ['It is sterically hindered, so it favours E2', 'It is a weak base, so it substitutes', 'It is a weak nucleophile, so it never reacts', 'It only reacts by SN1 and E1'],
          why: 't-BuO⁻ is crowded by its three CH₃ groups. It reaches an H more easily than a carbon, so it favours E2, even at a 1° carbon, and it takes the most accessible H (the Hofmann product).' },
        { id: 'a-iweak', q: 'Why is I⁻ a weak base?',
          choices: ['Its conjugate acid, HI, is a strong acid', 'It has no lone pairs left to share with an H', 'It is too large and crowded to reach an H', 'It is neutral, so it cannot attract a proton'],
          why: 'The conjugate base of a strong acid is a weak base. HI is a strong acid, so I⁻ holds on to its electrons and hardly takes a proton. It is still a strong nucleophile: charged, large and polarizable.' },
        { id: 'a-hostrong', q: 'Why is HO⁻ a strong base?',
          choices: ['Water, its conjugate acid, is a weak acid', 'Its O is large and easily polarized, like S', 'It is sterically hindered, like t-BuO⁻', 'It comes from a strong acid, like HCl'],
          why: 'The weaker the conjugate acid, the stronger the base. Water is a weak acid, so HO⁻ is a strong base.' },
        { id: 'a-pick-base', q: 'Which reagent is a base only (strong base, weak nucleophile)?', choices: ['NaH', 'NaI', 'NaOMe', 'MeOH'], compact: true, check: { fnPick: 'base' },
          why: 'H⁻ is a very strong base (H₂ is an extremely weak acid) but small and not polarizable, so it is a weak nucleophile. NaI is a nucleophile only, NaOMe a strong nucleophile and strong base, MeOH weak at both.' },
        { id: 'a-pick-nuc', q: 'Which reagent is a nucleophile only (strong nucleophile, weak base)?', choices: ['NaN₃', 'NaOH', 'DBN', 'H₂O'], compact: true, check: { fnPick: 'nuc' },
          why: 'N₃⁻ is a strong nucleophile and a weak base. NaOH is strong at both, DBN is a base only, and water is weak at both.' },
        { id: 'a-spectator', q: 'NaOMe reacts with an alkyl halide. Which part of it reacts?',
          choices: ['MeO⁻; Na⁺ is a spectator', 'Na⁺; MeO⁻ is a spectator', 'Both, as one molecule', 'Neither; it is only a solvent'],
          why: 'Na⁺ and K⁺ are spectator ions. The function of the reagent belongs to the anion: here MeO⁻, a strong nucleophile and a strong base.' },
        { id: 'a-h2s', q: 'H₂S has no charge. Why is it still a strong nucleophile?',
          choices: ['Its S is large and polarizable', 'It is a strong base, stronger than HO⁻', 'It is sterically hindered', 'It is always used as the solvent'],
          why: 'Polarizability: the electron cloud of a large atom like S shifts easily toward the carbon it attacks. That makes H₂S and RSH strong nucleophiles even though they are neutral and weak bases.' },
        { id: 'a-degree', q: 'What kind of substrate is 2-bromo-2-methylbutane?', fig: { mol: 'bmb' },
          choices: ['3° (tertiary)', '2° (secondary)', '1° (primary)', 'Methyl'], compact: true, check: { degree: 'bmb' },
          why: 'The α carbon (the one with the Br) carries three carbons, so the substrate is tertiary.' }
      ]
    },

    B: {
      title: 'Checkpoint 2: substitution',
      draw: 5,
      core: ['b-fn-nan3', 'b-sn2-product'],
      pool: [
        { id: 'b-fn-nan3', q: 'What is the function of NaN₃?', choices: fnChoices('NaN3'), check: { fn: 'NaN3' }, why: fnWhy('NaN3') },
        { id: 'b-sn2-product', q: 'What is the product of (R)-2-bromobutane with NaCN?', fig: { rxn: ['bbR', 'NaCN'] },
          choices: [{ smiles: 'C[C@H](C#N)CC' }, { smiles: 'C[C@@H](C#N)CC' }, { smiles: 'C/C=C/C' }], check: { major: ['bbR', 'NaCN'] },
          why: 'A 2° substrate and a nucleophile only: SN2. Back-side attack inverts the configuration, so (R)-2-bromobutane gives (S)-2-methylbutanenitrile. Weak base: no elimination.' },
        { id: 'b-sn2-mech', q: 'Which describes the SN2 mechanism?',
          choices: ['One step: nucleophilic attack and loss of the leaving group together', 'Two steps: loss of the leaving group, then nucleophilic attack',
                    'Two steps: nucleophilic attack, then loss of the leaving group', 'One step: proton transfer and loss of the leaving group together'],
          why: 'SN2 is concerted: the nucleophile attacks as the leaving group leaves. Loss of the leaving group first is SN1; proton transfer with loss of the leaving group is E2.' },
        { id: 'b-backside', q: 'Why does SN2 invert the configuration?',
          choices: ['The nucleophile attacks from the back side', 'The carbocation is attacked from either face', 'The nucleophile takes the leaving group’s place', 'The product is always R'],
          why: 'The nucleophile comes in opposite the leaving group, and the other three groups turn inside out, like an umbrella in the wind: inversion of configuration.' },
        { id: 'b-rate', q: 'Rank these alkyl bromides for SN2, fastest first.',
          choices: ['methyl > 1° > 2° > 3°', '3° > 2° > 1° > methyl', '2° > 1° > methyl > 3°', 'all the same'], compact: true,
          why: 'Every carbon on the α carbon crowds the back side, so methyl is fastest and a 3° substrate does not react by SN2 at all.' },
        { id: 'b-3deg', q: 'Why does 2-bromo-2-methylpropane not react by SN2?', fig: { mol: 'tBuBr' },
          choices: ['Its three CH₃ groups block the back side', 'It has no β H atoms for the base', 'Br⁻ is far too poor a leaving group', 'Its carbocation would be far too unstable'],
          why: 'The three CH₃ groups surround the back side of the α carbon, so the nucleophile cannot get in. (It has nine β H atoms, Br⁻ is a good leaving group, and its 3° carbocation is the most stable kind.)' },
        { id: 'b-sn1-order', q: 'In what order do the steps of an SN1 in ethanol happen?',
          choices: ['Loss of a leaving group, nucleophilic attack, proton transfer', 'Nucleophilic attack, loss of a leaving group, proton transfer',
                    'Proton transfer, loss of a leaving group, nucleophilic attack', 'Nucleophilic attack and loss of a leaving group, at once'],
          why: 'The leaving group leaves first (the slow step), ethanol attacks the carbocation, and a second ethanol takes the proton from the oxonium ion.' },
        { id: 'b-rds', q: 'Which step of an SN1 is the rate-determining step?',
          choices: ['Loss of the leaving group', 'Nucleophilic attack', 'The final proton transfer', 'All three equally'], compact: true,
          why: 'Forming the carbocation is the slow step, the highest hump on the energy diagram. Only the substrate takes part in it, so SN1 is unimolecular.' },
        { id: 'b-cation', q: 'Which carbocation is the most stable?', choices: ['3°', '2°', '1°', 'methyl'], compact: true,
          why: 'Stability rises with the number of carbons on the C⁺: 3° > 2° > 1° > methyl. That is why SN1 and E1 need a 3° substrate.' },
        { id: 'b-sn1-stereo', q: '(R)-3-Bromo-3-methylhexane reacts with ethanol by SN1. What forms?', fig: { mol: 'bmhR' },
          choices: ['(R)- and (S)-3-ethoxy-3-methylhexane, equally', 'Only (S)-3-ethoxy-3-methylhexane, by inversion', 'Only (R)-3-ethoxy-3-methylhexane, by retention', 'No product: a 3° substrate cannot react'], check: { names: ['bmhR', 'EtOH'] },
          why: 'The carbocation is flat, and ethanol attacks either face equally: a racemic mixture. SN1 is not stereospecific.' },
        { id: 'b-oxonium', q: 'In a solvolysis in ethanol, what does nucleophilic attack produce?',
          choices: ['An oxonium ion', 'A carbocation', 'An alkene', 'An alkoxide ion'], compact: true,
          why: 'Ethanol’s O bonds to the carbocation and carries the positive charge: an oxonium ion. A proton transfer to another ethanol then gives the neutral ether.' },
        { id: 'b-shift-kind', q: '3-Bromo-2,2-dimethylbutane loses Br⁻ in ethanol. How does its carbocation rearrange?', fig: { mol: 'b22dmb' },
          choices: ['A methyl shift, giving a 3° carbocation', 'A hydride shift, giving a 3° carbocation', 'It does not rearrange', 'A methyl shift, giving a 1° carbocation'], check: { shift: ['b22dmb', 'CH3'] },
          why: 'The next carbon carries three CH₃ groups and no H. A CH₃ moves over with its bonding electrons, and the positive charge lands on that carbon, now 3°.' },
        { id: 'b-shift-product', q: 'What is the major substitution product of 2-bromo-3-methylbutane in ethanol?', fig: { mol: 'b3mb' },
          choices: [{ smiles: 'CCOC(C)(C)CC' }, { smiles: 'CCOC(C)C(C)C' }, { smiles: 'CC=C(C)C' }], check: { major: ['b3mb', 'EtOH', 'shift'] },
          why: 'The 2° carbocation becomes 3° by a hydride shift, and ethanol attacks it there: 2-ethoxy-2-methylbutane. Without the shift you would get 2-ethoxy-3-methylbutane (minor).' },
        { id: 'b-sn2-arrows', q: 'Which drawing shows the arrows of the SN2 of 2-bromobutane with HS⁻ correctly?',
          choices: [{ mech: 'sn2', arrows: 'right', label: 'lone pair on S to the α carbon, and the C–Br bond to Br' },
                    { mech: 'sn2', arrows: 'noLG', label: 'only the arrow from S to the α carbon' },
                    { mech: 'sn2', arrows: 'toBr', label: 'lone pair on S to Br, and the C–Br bond to Br' },
                    { mech: 'sn2', arrows: 'reversed', label: 'from the α carbon to S, and the C–Br bond to Br' }], check: { mechfig: true },
          why: 'Two arrows, in one step: the lone pair on S attacks the α carbon (nucleophilic attack), and the C–Br bond’s electrons go to Br (loss of a leaving group). Arrows always start on electrons.' },
        { id: 'b-ring', q: 'cis-1-Bromo-4-methylcyclohexane reacts with NaSH. What is the product?', fig: { mol: 'cisBrMe' },
          choices: [{ ring: { 1: { b: 'SH' }, 4: { t: 'CH3' } } }, { ring: { 1: { t: 'SH' }, 4: { t: 'CH3' } } }], check: { major: ['cisBrMe', 'NaSH'] },
          why: 'SN2: the HS⁻ attacks the face opposite the Br, so the SH ends up on the other face from the CH₃. Cis becomes trans.' },
        { id: 'b-stereospec', q: 'Why is SN2 called stereospecific?',
          choices: ['The substrate decides the product’s configuration', 'It gives two stereoisomers, one of them major', 'It always gives a racemic mixture of enantiomers', 'It only happens on rings and other cyclic molecules'],
          why: 'Stereospecific: the configuration of the substrate decides the configuration of the product. SN2 always inverts.' },
        { id: 'b-shift-arrow', q: 'Which drawing shows the arrow for the hydride shift?',
          choices: [{ mech: 'shiftH', arrows: 'right', label: 'the C–H bond to the carbocation' },
                    { mech: 'shiftH', arrows: 'away', label: 'the C–H bond to its own carbon' },
                    { mech: 'shiftH', arrows: 'fromC', label: 'from the carbocation to the H' }], check: { mechfig: true },
          why: 'The H moves with its pair of electrons, so the arrow starts on the C–H bond and points at the carbocation next door.' }
      ]
    },

    C: {
      title: 'Checkpoint 3: elimination',
      draw: 5,
      core: ['c-fn-tbuok', 'c-e2-major'],
      pool: [
        { id: 'c-fn-tbuok', q: 'What is the function of t-BuOK?', choices: fnChoices('tBuOK'), check: { fn: 'tBuOK' }, why: fnWhy('tBuOK') },
        { id: 'c-e2-major', q: 'What is the major product of 2-bromo-2-methylbutane with NaOEt?', fig: { rxn: ['bmb', 'NaOEt'] },
          choices: [{ smiles: 'CC=C(C)C' }, { smiles: 'C=C(C)CC' }, { smiles: 'CCOC(C)(C)CC' }], check: { major: ['bmb', 'NaOEt'] },
          why: 'A 3° substrate and a strong base: E2. Ethoxide is not hindered, so the Zaitsev product, the more substituted alkene, is major.' },
        { id: 'c-e2-mech', q: 'Which describes the E2 mechanism?',
          choices: ['One step: proton transfer and loss of the leaving group together', 'Two steps: loss of the leaving group, then proton transfer',
                    'One step: nucleophilic attack and loss of the leaving group together', 'Two steps: proton transfer, then loss of the leaving group'],
          why: 'E2 is concerted: the base takes a β H as the leaving group leaves. Two steps through a carbocation is E1; nucleophilic attack is substitution.' },
        { id: 'c-e2-arrows', q: 'Which drawing shows the arrows of the E2 of 2-bromo-2-methylpropane with EtO⁻ correctly?',
          choices: [{ mech: 'e2', arrows: 'right', label: 'base to H, C–H bond to the C–C bond, C–Br bond to Br' },
                    { mech: 'e2', arrows: 'toC', label: 'base to the α carbon, C–Br bond to Br' },
                    { mech: 'e2', arrows: 'noPi', label: 'base to H, C–Br bond to Br' },
                    { mech: 'e2', arrows: 'lgWrong', label: 'base to H, C–H bond to the C–C bond, C–Br bond to C' }], check: { mechfig: true },
          why: 'Three arrows, one step: the base takes the β H, the C–H bond’s electrons become the π bond, and the C–Br bond’s electrons leave with Br.' },
        { id: 'c-anti', q: 'For E2, the H and the leaving group must be…', choices: ['anti-coplanar', 'syn-coplanar', 'gauche', 'on one carbon'], compact: true,
          why: 'Anti-coplanar: on opposite sides of the C–C bond, in one plane. That is staggered, so it is the low-energy way.' },
        { id: 'c-syn', q: 'Why does E2 almost never go through the syn-coplanar arrangement?',
          choices: ['It is eclipsed, so it is high in energy', 'The H is too far away for the base to reach', 'It gives a substitution product instead', 'It needs a carbocation to form first'],
          why: 'Syn-coplanar means the H and the leaving group are eclipsed. Eclipsed conformations are much higher in energy than the staggered, anti-coplanar one.' },
        { id: 'c-zaitsev', q: 'What is the Zaitsev product?', choices: ['The more substituted alkene', 'The less substituted alkene', 'The substitution product', 'The (Z) alkene'],
          why: 'Zaitsev: the more substituted alkene, major with an ordinary base. Hofmann: the less substituted alkene, major with a sterically hindered base.' },
        { id: 'c-hofmann', q: 'What is the major product of 2-bromo-2-methylbutane with t-BuOK?', fig: { rxn: ['bmb', 'tBuOK'] },
          choices: [{ smiles: 'C=C(C)CC' }, { smiles: 'CC=C(C)C' }, { smiles: 'CCC(C)(C)OC(C)(C)C' }], check: { major: ['bmb', 'tBuOK'] },
          why: 't-BuO⁻ is sterically hindered: it takes an H from the less crowded CH₃, giving the Hofmann product, the less substituted alkene. No SN2 at a 3° carbon.' },
        { id: 'c-regiosel', q: 'An E2 gives two alkenes with the C=C in different places, one of them major. The reaction is…',
          choices: ['regioselective', 'regiospecific', 'stereoselective', 'stereospecific'], compact: true,
          why: 'Regioselective: more than one regiochemical product can form, and one is major.' },
        { id: 'c-stereosel', q: 'What is the major product of 3-bromopentane with NaOEt?', fig: { rxn: ['bp3', 'NaOEt'] },
          choices: [{ smiles: 'CC/C=C/C' }, { smiles: 'CC/C=C\\C' }, { smiles: 'CCC(CC)OCC' }], check: { major: ['bp3', 'NaOEt'] },
          why: 'C2 has two H atoms, so both (E)- and (Z)-pent-2-ene can form. The E isomer, with its larger groups trans, comes from the less crowded transition state: major. The SN2 product is minor.' },
        { id: 'c-stereosel-why', q: 'Why is (E)-pent-2-ene the major alkene from 3-bromopentane?',
          choices: ['Its anti conformation is less crowded', 'C2 has only one H that can be removed', 'The (Z) alkene cannot form at all', 'Ethoxide is a sterically hindered base'],
          why: 'With the H that gives the E alkene anti-coplanar, the CH₃ and the CH₂CH₃ are not gauche to each other. That transition state is lower in energy, so the E alkene forms faster.' },
        { id: 'c-stereospec', q: 'What is the major product of (2R,3S)-2-bromo-3-methylpentane with NaOEt?', fig: { mol: 'bmpRS' },
          choices: [{ smiles: 'C/C=C(/C)CC' }, { smiles: 'C/C=C(\\C)CC' }, { smiles: 'C=CC(C)CC' }], check: { major: ['bmpRS', 'NaOEt'] },
          why: 'C3 has one H, so only one conformation puts it anti-coplanar to the Br, and only one stereoisomer of the Zaitsev alkene can form: here the (Z) alkene. Stereospecific.' },
        { id: 'c-stereospec-why', q: 'Why is the E2 of (2R,3S)-2-bromo-3-methylpentane stereospecific?',
          choices: ['C3 has only one H that can be anti to the Br', 'C3 has two H atoms, and either one can leave', 'It goes through a flat carbocation first', 'Ethoxide is a sterically hindered base'],
          why: 'Only one H on C3 means only one anti-coplanar conformation, which decides the alkene’s geometry. The other diastereomer gives the other stereoisomer.' },
        { id: 'c-e1-order', q: 'In what order do the steps of E1 happen?',
          choices: ['Loss of a leaving group, then proton transfer', 'Proton transfer, then loss of a leaving group', 'Both at once', 'Nucleophilic attack, then proton transfer'],
          why: 'E1 goes through the carbocation: the leaving group leaves first (the slow step), then the solvent takes a β H.' },
        { id: 'c-e1-sn1', q: 'What is the major product of 2-bromo-2-methylbutane in ethanol?', fig: { rxn: ['bmb', 'EtOH'] },
          choices: [{ smiles: 'CCOC(C)(C)CC' }, { smiles: 'CC=C(C)C' }, { smiles: 'C=C(C)CC' }], check: { major: ['bmb', 'EtOH'] },
          why: 'A 3° substrate in ethanol, a weak nucleophile and weak base: SN1 is major and E1 minor. Among the alkenes, the Zaitsev product is major.' },
        { id: 'c-e1-hofmann', q: 'Why can a bulky base not turn E1 toward the Hofmann product?',
          choices: ['The base is not in the slow step', 'E1 has no proton transfer', 'E1 always gives substitution', 'E1 is stereospecific'],
          why: 'In E1 the carbocation forms first, without the base. It then loses the H that gives the more stable alkene, so the Zaitsev product is major whatever the base.' }
      ]
    },

    D: {
      title: 'Checkpoint 4: E2 in rings',
      draw: 4,
      core: ['d-fn-nah', 'd-locked'],
      pool: [
        { id: 'd-fn-nah', q: 'What is the function of NaH?', choices: fnChoices('NaH'), check: { fn: 'NaH' }, why: fnWhy('NaH') },
        { id: 'd-locked', q: 'Which reacts much faster by E2 with NaOEt?',
          choices: [{ mol: 'cisBrTb' }, { mol: 'transBrTb' }], check: { faster: ['cisBrTb', 'transBrTb'] },
          why: 'The tert-butyl group stays equatorial. In the cis isomer that leaves the Br axial, trans-diaxial to H atoms on C2 and C6: fast. The trans isomer is locked with its Br equatorial: drastically slower.' },
        { id: 'd-diaxial', q: 'For E2 on a cyclohexane, the leaving group must be…',
          choices: ['axial, with an axial H next to it', 'equatorial, with an equatorial H', 'axial, with an equatorial H next to it', 'either axial or equatorial'],
          why: 'Anti-coplanar on a ring means trans-diaxial: the leaving group axial and an axial H on the next carbon, on the other face.' },
        { id: 'd-count', q: 'Chlorocyclohexane in the chair with its Cl axial: how many H atoms are anti-coplanar to the Cl?',
          choices: ['Two', 'One', 'Four', 'None'], compact: true,
          why: 'The axial H on C2 and the axial H on C6, both on the face opposite the Cl. The equatorial H atoms point out from the ring.' },
        { id: 'd-cis', q: 'What is the major product of cis-1-chloro-2-methylcyclohexane with NaOEt?', fig: { mol: 'cisClMe' },
          choices: [{ ring: { 1: { t: 'CH3' } }, ene: [1, 2] }, { ring: { 3: { t: 'CH3' } }, ene: [1, 2] }, { smiles: 'C=C1CCCCC1' }], check: { major: ['cisClMe', 'NaOEt'] },
          why: 'With the Cl axial, both C2 and C6 have an axial H anti-coplanar to it, so both alkenes can form. The more substituted one, 1-methylcyclohexene (Zaitsev), is major.' },
        { id: 'd-trans', q: 'What is the major product of trans-1-chloro-2-methylcyclohexane with NaOEt?', fig: { mol: 'transClMe' },
          choices: [{ ring: { 3: { t: 'CH3' } }, ene: [1, 2] }, { ring: { 1: { t: 'CH3' } }, ene: [1, 2] }, { smiles: 'C=C1CCCCC1' }], check: { major: ['transClMe', 'NaOEt'] },
          why: 'With the Cl axial, the CH₃ on C2 is axial too, so C2 has no axial H. Only the H on C6 is anti-coplanar: 3-methylcyclohexene is the only alkene, even though it is the less substituted one.' },
        { id: 'd-regiospec', q: 'trans-1-Chloro-2-methylcyclohexane gives only one alkene. That E2 is…',
          choices: ['regiospecific', 'regioselective', 'stereoselective', 'not an E2 at all'], compact: true,
          why: 'Regiospecific: only one regiochemical product can form, because only one β H can be anti-coplanar to the leaving group.' },
        { id: 'd-trans-slow', q: 'Why is the E2 of trans-1-chloro-2-methylcyclohexane slow?',
          choices: ['Its reactive chair has both groups axial', 'It has no β H atoms on either side', 'Cl⁻ is a much poorer leaving group than Br⁻', 'Its CH₃ group reacts with the base first'],
          why: 'The Cl is axial only in the chair with the CH₃ axial too, the less stable chair. Few molecules sit in that chair at any moment, so the reaction is slower.' },
        { id: 'd-locked-why', q: 'Why is the E2 of trans-1-bromo-4-tert-butylcyclohexane drastically slower?', fig: { mol: 'transBrTb' },
          choices: ['The ring is locked with the Br equatorial', 'The tert-butyl group acts as a hindered base', 'Its Br is held axial, too crowded to leave', 'C2 and C6 have no H atoms to remove'],
          why: 'A tert-butyl group is far too big to be axial, so it locks the ring in the chair where the Br is equatorial. No H is anti-coplanar to an equatorial Br.' },
        { id: 'd-k718', q: 'Klein problem 7.18: which undergoes E2 more rapidly?',
          choices: [{ mol: 'transTbCl' }, { mol: 'cisTbCl' }], check: { faster: ['transTbCl', 'cisTbCl'] },
          why: 'With the tert-butyl group equatorial, the trans isomer has its Cl axial (fast E2); the cis isomer has its Cl equatorial and locked there (very slow).' },
        { id: 'd-menthyl', q: 'Neomenthyl chloride gives mostly the more substituted alkene; menthyl chloride gives only the less substituted one. Why?',
          fig: { pair: [{ mol: 'neomenthylCl' }, { mol: 'menthylCl' }] },
          choices: ['Only one β H of menthyl chloride can be trans-diaxial', 'Menthyl chloride has no β H atoms next to its Cl', 'Neomenthyl chloride reacts by SN1 instead of E2', 'Menthyl chloride needs a sterically hindered base'],
          why: 'Menthyl chloride can only put its Cl axial in the chair with every group axial, and there the isopropyl side has no axial H anti to the Cl. Only one β H qualifies: regiospecific. Neomenthyl chloride has its Cl axial in its stable chair, with axial H atoms on both sides.' },
        { id: 'd-ccmh', q: 'What is the major product of 1-chloro-1-methylcyclohexane with t-BuOK?', fig: { mol: 'ccmh' },
          choices: [{ smiles: 'C=C1CCCCC1' }, { ring: { 1: { t: 'CH3' } }, ene: [1, 2] }, { ring: { 3: { t: 'CH3' } }, ene: [1, 2] }], check: { major: ['ccmh', 'tBuOK'] },
          why: 't-BuO⁻ is sterically hindered, so it takes an H from the CH₃: methylenecyclohexane, the Hofmann product. Ethoxide would give 1-methylcyclohexene.' }
      ]
    },

    E: {
      title: 'Checkpoint 5: predicting the products',
      draw: 5,
      core: ['e-fn-h2o', 'e-klein'],
      pool: [
        { id: 'e-fn-h2o', q: 'What is the function of H₂O?', choices: fnChoices('H2O'), check: { fn: 'H2O' }, why: fnWhy('H2O') },
        { id: 'e-klein', q: 'Klein’s worked example: what is the major product of (R)-2-chloropentane with NaOEt?', fig: { rxn: ['cpR', 'NaOEt'] },
          choices: [{ smiles: 'CC/C=C/C' }, { smiles: 'CC/C=C\\C' }, { smiles: 'C=CCCC' }, { smiles: 'CCC[C@H](C)OCC' }], check: { major: ['cpR', 'NaOEt'] },
          why: 'Strong nucleophile and strong base, 2° substrate: E2 major, SN2 minor. Zaitsev regiochemistry, and the E isomer is favoured: (E)-pent-2-ene. The others all form, as minor products.' },
        { id: 'e-not-formed', q: '(R)-2-Chloropentane reacts with NaOEt. Which of these does NOT form?', fig: { rxn: ['cpR', 'NaOEt'] },
          choices: [{ smiles: 'CCC[C@@H](C)OCC' }, { smiles: 'CCC[C@H](C)OCC' }, { smiles: 'CC/C=C\\C' }, { smiles: 'C=CCCC' }], check: { none: ['cpR', 'NaOEt'] },
          why: 'The SN2 product forms by back-side attack, so it is (S)-2-ethoxypentane, with inverted configuration. (R)-2-ethoxypentane would need attack from the front.' },
        { id: 'e-mech-1both', q: 'A 1° alkyl halide reacts with NaOEt. What does Klein’s table predict?', fig: { rxn: ['bromobutane1', 'NaOEt'] },
          choices: ['SN2, some E2', 'E2, some SN2', 'SN1', 'E2'], compact: true, check: { mech: ['bromobutane1', 'NaOEt'] },
          why: 'Little crowding at a 1° carbon: a strong nucleophile and strong base mostly substitutes (SN2), with some E2.' },
        { id: 'e-mech-2both', q: 'A 2° alkyl halide reacts with NaOMe. What does Klein’s table predict?', fig: { rxn: ['bromopentane2', 'NaOMe'] },
          choices: ['E2, some SN2', 'SN2, some E2', 'SN1, some E1', 'SN2'], compact: true, check: { mech: ['bromopentane2', 'NaOMe'] },
          why: 'At a 2° carbon the strong base mostly eliminates: E2 major, SN2 minor.' },
        { id: 'e-mech-3weak', q: 'A 3° alkyl halide in ethanol. What does Klein’s table predict?', fig: { rxn: ['bmb', 'EtOH'] },
          choices: ['SN1, some E1', 'E2', 'SN2', 'No reaction'], compact: true, check: { mech: ['bmb', 'EtOH'] },
          why: 'Weak nucleophile, weak base, 3° substrate: the carbocation forms, then SN1 (major) and E1 (minor).' },
        { id: 'e-mech-3nuc', q: 'A 3° alkyl halide with NaSH. What does Klein’s table predict?', fig: { rxn: ['bmb', 'NaSH'] },
          choices: ['SN1', 'SN2', 'E2', 'No reaction'], compact: true, check: { mech: ['bmb', 'NaSH'] },
          why: 'A nucleophile only cannot do SN2 at a 3° carbon and is too weak a base for E2, so it waits for the carbocation: SN1.' },
        { id: 'e-mech-tbuok', q: '1-Bromobutane with t-BuOK. What happens?', fig: { rxn: ['bromobutane1', 'tBuOK'] },
          choices: ['E2, some SN2', 'SN2, some E2', 'SN1', 'No reaction'], compact: true, check: { mech: ['bromobutane1', 'tBuOK'] },
          why: 't-BuOK is a strong nucleophile and a strong base, but sterically hindered: unlike the others, at a 1° carbon it mostly eliminates.' },
        { id: 'e-ethanol', q: 'What is the major product of bromoethane with NaOH?', fig: { rxn: ['bromoethane', 'NaOH'] },
          choices: [{ smiles: 'CCO' }, { smiles: 'C=C' }], check: { major: ['bromoethane', 'NaOH'] },
          why: 'A 1° substrate with a strong nucleophile and strong base: SN2 major (ethanol), E2 minor (ethene).' },
        { id: 'e-azide', q: 'What is the product of 2-iodopropane with NaN₃?', fig: { rxn: ['iodopropane2', 'NaN3'] },
          choices: [{ smiles: 'CC(C)N=[N+]=[N-]' }, { smiles: 'C=CC' }], check: { major: ['iodopropane2', 'NaN3'] },
          why: 'Azide is a nucleophile only, and the substrate is 2°: SN2. Azide is too weak a base to eliminate.' },
        { id: 'e-dbu', q: 'What is the product of bromocyclohexane with DBU?', fig: { rxn: ['bromocyclohexane', 'DBU'] },
          choices: ['Cyclohexene, by E2', 'A substitution product, by SN2', 'A substitution product, by SN1', 'No reaction'], check: { names: ['bromocyclohexane', 'DBU'] },
          why: 'DBU is a base only: a strong base but a weak nucleophile, so it eliminates: E2 gives cyclohexene.' },
        { id: 'e-thiol', q: 'What is the product of (R)-2-bromopentane with NaSH?', fig: { rxn: ['bmhxR', 'NaSH'] },
          choices: [{ smiles: 'CCC[C@H](C)S' }, { smiles: 'CCC[C@@H](C)S' }, { smiles: 'CC/C=C/C' }], check: { major: ['bmhxR', 'NaSH'] },
          why: 'A nucleophile only at a 2° carbon: SN2, with inversion of configuration: (S)-pentane-2-thiol.' },
        { id: 'e-tbuok-1', q: 'What is the major product of 1-chloro-2-methylpropane with t-BuOK?', fig: { rxn: ['chloromethylpropane', 'tBuOK'] },
          choices: [{ smiles: 'C=C(C)C' }, { smiles: 'CC(C)COC(C)(C)C' }], check: { major: ['chloromethylpropane', 'tBuOK'] },
          why: 'A 1° substrate, but t-BuOK is sterically hindered: E2 is major (2-methylpropene) and SN2 minor.' },
        { id: 'e-tetra', q: 'What is the major product of 2-bromo-2,3-dimethylbutane with NaOEt?', fig: { rxn: ['bromo2mp', 'NaOEt'] },
          choices: [{ smiles: 'CC(C)=C(C)C' }, { smiles: 'C=C(C)C(C)C' }, { smiles: 'CCOC(C)(C)C(C)C' }], check: { major: ['bromo2mp', 'NaOEt'] },
          why: 'A 3° substrate and an unhindered strong base: E2, Zaitsev product: 2,3-dimethylbut-2-ene, with four carbons on the C=C.' },
        { id: 'e-hofmann-2', q: 'What is the major product of (R)-2-bromopentane with t-BuOK?', fig: { rxn: ['bmhxR', 'tBuOK'] },
          choices: [{ smiles: 'C=CCCC' }, { smiles: 'CC/C=C/C' }, { smiles: 'CC/C=C\\C' }], check: { major: ['bmhxR', 'tBuOK'] },
          why: 'E2 with a sterically hindered base: the Hofmann product, pent-1-ene, is major.' }
      ]
    }
  };
})();

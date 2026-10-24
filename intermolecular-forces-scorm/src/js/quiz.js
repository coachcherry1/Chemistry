/* quiz.js: the graded checkpoint questions. These are the ONLY graded part
 * of the activity.
 *
 * Four checkpoints. Each draws `draw` questions from its pool: every `core`
 * question, then a random fill, so a new attempt in the LMS sees a different
 * mix. The correct choice is always written FIRST here; the order is shuffled
 * on screen. `why` is shown after the student answers, right or wrong.
 *
 * `fact` ties the answer to the model (chem.js), so `node tools/validate.js`
 * catches an answer that no longer matches the chemistry, and checks every
 * comparison against the real melting and boiling points:
 *   ['stronger', a, b]   the first choice starts with the one with the stronger IMFs
 *   ['weaker', a, b]     the first choice starts with the one with the weaker IMFs
 *   ['rank', [ids]]      the first choice lists them weakest to strongest, joined by " < "
 *   ['imf', id]          the first choice is IMF_LIST[the substance's strongest force]
 *   ['pairs', id]        the first choice is how many hydrogen bonds one molecule can make
 *   ['electrons', id]    the first choice is its number of electrons
 *   ['phase', id, K]     the first choice is its real phase at K kelvin
 *   ['dEN', a, b]        the first choice is the electronegativity difference of an a–b bond
 *   ['mostPositiveH']    the first choice is the H on the most electronegative atom
 *   ['donorOnly', [ids]] the first choice is the only one of them that can donate
 * Every question that compares two substances must carry a fact.
 */

var IMF_LIST = {
  ldf: 'Only London dispersion forces',
  dipole: 'Dipole-dipole forces and London dispersion forces',
  hbond: 'Hydrogen bonding, dipole-dipole forces and London dispersion forces'
};

var QUIZZES = {

  A: {
    title: 'Checkpoint 1: London dispersion forces',
    draw: 4,
    core: ['a-ne-xe', 'a-escape'],
    pool: [
      { id: 'a-ne-xe', fact: ['stronger', 'Xe', 'Ne'],
        q: 'Which has the stronger London dispersion forces between its atoms: neon or xenon?',
        choices: ['Xenon: 54 electrons to neon’s 10, so it is far more polarizable',
                  'Neon: its atoms are smaller and pack closer',
                  'They are the same: both are noble gases',
                  'Neither: noble gases have no attractions at all'],
        why: 'More electrons make a bigger electron cloud, held farther from the nucleus. It is easier to push out of ' +
             'shape (more polarizable), so its temporary dipoles are bigger and the LDF are stronger. Xenon boils at ' +
             '−108 °C; neon at −246 °C.' },
      { id: 'a-escape',
        q: 'A liquid is heated to its boiling point. What lets its particles escape into the gas?',
        choices: ['They move fast enough to break free of the attractions between them',
                  'The bonds inside each molecule break',
                  'The particles themselves get bigger',
                  'The attractions between them get stronger'],
        why: 'Temperature is how fast the particles move. At the boiling point they move fast enough to pull away ' +
             'from each other. The molecules themselves stay whole.' },
      { id: 'a-bubbles',
        q: 'What is inside the bubbles in boiling water?',
        choices: ['Water molecules, H₂O, that have broken away from each other',
                  'Hydrogen gas and oxygen gas',
                  'Air that was dissolved in the water',
                  'Heat'],
        why: 'Boiling separates water molecules from each other; it does not break the O–H bonds inside them. The ' +
             'bubbles are water vapour.' },
      { id: 'a-polarizability',
        q: 'What does polarizability mean?',
        choices: ['How easily an electron cloud can be pushed out of shape',
                  'How much charge an atom has',
                  'How polar a bond is',
                  'How many bonds an atom can make'],
        why: 'A polarizable cloud shifts easily to one side, making a temporary δ− side and δ+ side. More ' +
             'polarizable means stronger London dispersion forces.' },
      { id: 'a-why-xe',
        q: 'Why is a xenon atom more polarizable than a neon atom?',
        choices: ['It has more electrons, in a bigger cloud farther from the nucleus, so they are easier to push around',
                  'Xenon is polar and neon is not',
                  'Xenon has fewer electrons to hold on to',
                  'Xenon forms hydrogen bonds'],
        why: 'The outer electrons of a big atom are far from its nucleus and shielded by the electrons beneath them, ' +
             'so the cloud is easy to distort.' },
      { id: 'a-cl2-br2', fact: ['stronger', 'Br2', 'Cl2'],
        q: 'Which has the higher boiling point: Cl₂ or Br₂?',
        choices: ['Br₂: 70 electrons to 34, so stronger London dispersion forces',
                  'Cl₂: chlorine is more electronegative',
                  'They are the same: both are halogens',
                  'Cl₂: its molecules are smaller'],
        why: 'Both are nonpolar and have only LDF. Br₂ has more electrons, so it is more polarizable. Br₂ boils at ' +
             '59 °C, Cl₂ at −34 °C.' },
      { id: 'a-br2-phase', fact: ['phase', 'Br2', 298.15],
        q: 'At room temperature (25 °C), bromine, Br₂, is a…',
        choices: ['Liquid', 'Gas', 'Solid'],
        why: 'Br₂ melts at −7 °C and boils at 59 °C, so at 25 °C it is a liquid: its LDF are strong enough to hold ' +
             'the molecules together, but not to lock them in place.' },
      { id: 'a-i2-phase', fact: ['phase', 'I2', 298.15],
        q: 'At room temperature (25 °C), iodine, I₂, is a…',
        choices: ['Solid', 'Liquid', 'Gas'],
        why: 'I₂ has 106 electrons, the most of the halogens: its LDF are strong enough to keep it solid until 114 °C.' },
      { id: 'a-halogen-rank', fact: ['rank', ['F2', 'Cl2', 'Br2', 'I2']],
        q: 'Rank the halogens by boiling point, lowest first.',
        choices: ['F₂ < Cl₂ < Br₂ < I₂', 'I₂ < Br₂ < Cl₂ < F₂', 'Cl₂ < F₂ < I₂ < Br₂', 'They all boil at the same temperature'],
        why: 'All four are nonpolar, so they have only LDF. Electrons: 18, 34, 70, 106. More electrons, more ' +
             'polarizable, stronger LDF, higher boiling point.' },
      { id: 'a-kr-electrons', fact: ['electrons', 'Kr'],
        q: 'How many electrons does a krypton atom have?',
        choices: ['36', '8', '18', '54'],
        why: 'The atomic number is the number of electrons in a neutral atom: Kr is element 36. (8 counts only the ' +
             'valence electrons; LDF depend on all of them.)' },
      { id: 'a-ar-imf', fact: ['imf', 'Ar'],
        q: 'Which intermolecular forces act between argon atoms?',
        choices: [IMF_LIST.ldf, IMF_LIST.dipole, IMF_LIST.hbond, 'None at all'],
        why: 'An argon atom is not polar and has no H, so it has only LDF. Without them argon could never become a ' +
             'liquid, and it does, at −186 °C.' },
      { id: 'a-all-ldf',
        q: 'Which substances have London dispersion forces?',
        choices: ['All of them: every atom and molecule has electrons that can shift',
                  'Only nonpolar substances',
                  'Only the noble gases',
                  'Only substances that hydrogen bond'],
        why: 'Every particle has an electron cloud, so every substance has LDF. Polar molecules have dipole-dipole ' +
             'forces as well.' },
      { id: 'a-he-ne', fact: ['weaker', 'He', 'Ne'],
        q: 'Helium or neon: which boils at the lower temperature?',
        choices: ['Helium: 2 electrons to neon’s 10, so weaker London dispersion forces',
                  'Neon: it has more electrons to lose',
                  'They boil at the same temperature',
                  'Neither ever boils'],
        why: 'Helium’s tiny 2-electron cloud is the least polarizable of all, so it boils at −269 °C, just 4 K. Neon ' +
             'boils at −246 °C.' }
    ]
  },

  B: {
    title: 'Checkpoint 2: dipole-dipole forces',
    draw: 4,
    core: ['b-hcl-f2', 'b-dd-what'],
    pool: [
      { id: 'b-hcl-f2', fact: ['stronger', 'HCl', 'F2'],
        q: 'HCl and F₂ both have 18 electrons. Which has the higher boiling point?',
        choices: ['HCl: it is polar, so it has dipole-dipole forces as well as LDF',
                  'F₂: fluorine is the most electronegative element',
                  'Neither: with the same electrons, they boil at the same temperature',
                  'F₂: its bond is nonpolar'],
        why: 'The same number of electrons means about the same LDF. HCl adds dipole-dipole forces on top. HCl boils ' +
             'at −85 °C, F₂ at −188 °C.' },
      { id: 'b-dd-what',
        q: 'What are dipole-dipole forces?',
        choices: ['The attraction between the δ+ end of one polar molecule and the δ− end of another',
                  'The attraction between temporary dipoles in nonpolar molecules',
                  'The bonds inside a molecule',
                  'The attraction between an H and a lone pair on N, O or F'],
        why: 'A polar molecule has permanent ends. Neighbours line up δ+ to δ− and hold on to each other.' },
      { id: 'b-hcl-imf', fact: ['imf', 'HCl'],
        q: 'Which intermolecular forces act between HCl molecules?',
        choices: [IMF_LIST.dipole, IMF_LIST.ldf, IMF_LIST.hbond, 'Only dipole-dipole forces'],
        why: 'HCl is polar, so dipole-dipole forces; every molecule has LDF. Its H is bonded to Cl, not to N, O or F, ' +
             'so there is no hydrogen bonding.' },
      { id: 'b-f2-imf', fact: ['imf', 'F2'],
        q: 'Which intermolecular forces act between F₂ molecules?',
        choices: [IMF_LIST.ldf, IMF_LIST.dipole, IMF_LIST.hbond, 'None at all'],
        why: 'Two identical atoms share the bond equally: F₂ is nonpolar, so it has only LDF.' },
      { id: 'b-ethane', fact: ['stronger', 'CH3F', 'C2H6'],
        q: 'Ethane, C₂H₆, and fluoromethane, CH₃F, both have 18 electrons. Which has the higher boiling point?',
        choices: ['CH₃F: it is polar, so it adds dipole-dipole forces to its LDF',
                  'C₂H₆: it has more atoms',
                  'They boil at the same temperature: same electrons',
                  'C₂H₆: it has more H atoms'],
        why: 'Same electrons, about the same LDF. CH₃F’s C–F bond makes it polar. CH₃F boils at −78 °C, ethane at −89 °C.' },
      { id: 'b-acetone', fact: ['stronger', 'acetone', 'C4H10'],
        q: 'Butane, C₄H₁₀, has 34 electrons and acetone, C₃H₆O, has 32. Which has the higher boiling point?',
        choices: ['Acetone: it is polar, and dipole-dipole forces beat LDF even with 2 fewer electrons',
                  'Butane: it has more electrons',
                  'Butane: it has more atoms',
                  'They boil at the same temperature'],
        why: 'Acetone’s C=O makes it polar. Acetone boils at 56 °C, butane at −0.5 °C.' },
      { id: 'b-also-ldf',
        q: 'Do polar molecules like HCl also have London dispersion forces?',
        choices: ['Yes: every molecule has LDF; polar ones have dipole-dipole forces too',
                  'No: polar molecules have only dipole-dipole forces',
                  'Only when they are solid',
                  'Only if they have more than 20 electrons'],
        why: 'LDF come from electrons, and every molecule has them.' },
      { id: 'b-iso-why',
        q: 'Why compare HCl with F₂, and not with Cl₂, to see what dipole-dipole forces add?',
        choices: ['HCl and F₂ have the same number of electrons, so their LDF are about the same and only the dipole-dipole forces differ',
                  'Cl₂ is a liquid',
                  'F₂ is polar and Cl₂ is not',
                  'Cl₂ has no LDF'],
        why: 'With equal electron counts, LDF cancel out of the comparison. That is why the class compares ' +
             'molecules with the same number of electrons.' },
      { id: 'b-acetone-imf', fact: ['imf', 'acetone'],
        q: 'Which intermolecular forces act between acetone molecules?',
        choices: [IMF_LIST.dipole, IMF_LIST.hbond, IMF_LIST.ldf, 'Only hydrogen bonding'],
        why: 'Acetone is polar (its C=O), so it has dipole-dipole forces and LDF. Its H atoms are all bonded to C, so ' +
             'it has nothing to donate: no hydrogen bonding between acetone molecules.' },
      { id: 'b-ar-hcl', fact: ['stronger', 'HCl', 'Ar'],
        q: 'Argon and HCl both have 18 electrons. Which has the higher boiling point?',
        choices: ['HCl: it has dipole-dipole forces as well as LDF',
                  'Ar: it is a noble gas',
                  'They boil at the same temperature',
                  'Ar: it has no bonds to break'],
        why: 'The same electrons, so about the same LDF; HCl is polar as well. HCl boils at −85 °C, argon at −186 °C.' }
    ]
  },

  C: {
    title: 'Checkpoint 3: hydrogen bonding',
    draw: 5,
    core: ['c-donor', 'c-most-positive', 'c-ethanol-glycol'],
    pool: [
      { id: 'c-donor',
        q: 'In a hydrogen bond, what is the H-bond donor?',
        choices: ['An H atom bonded to N, O or F', 'A lone pair on N, O or F', 'Any H atom', 'The O atom of a water molecule'],
        why: 'The donor is the H. Bonded to a very electronegative N, O or F, it is left strongly δ+.' },
      { id: 'c-receiver',
        q: 'In a hydrogen bond, what is the H-bond receiver?',
        choices: ['A lone pair on an N, O or F atom of another molecule', 'An H bonded to C', 'Any atom with a δ+ charge',
                  'The H on the same molecule'],
        why: 'The δ+ H of one molecule is pulled to a lone pair on N, O or F of another.' },
      { id: 'c-den-oh', fact: ['dEN', 'O', 'H'],
        q: 'What is the electronegativity difference in an O–H bond?',
        choices: ['1.24', '0.35', '0.84', '1.78'],
        why: 'O 3.44 − H 2.20 = 1.24. A big difference: the H is strongly δ+.' },
      { id: 'c-den-ch', fact: ['dEN', 'C', 'H'],
        q: 'What is the electronegativity difference in a C–H bond?',
        choices: ['0.35', '1.24', '0.84', '2.20'],
        why: 'C 2.55 − H 2.20 = 0.35. So small that the H is barely δ+: it cannot be an H-bond donor.' },
      { id: 'c-most-positive', fact: ['mostPositiveH'],
        q: 'Which H is the most δ+?',
        choices: ['The H in an H–F bond', 'The H in an H–O bond', 'The H in an H–N bond', 'The H in an H–C bond'],
        why: 'The bigger the electronegativity difference, the more the bond’s electrons are pulled away from the H: ' +
             'H–F 1.78, H–O 1.24, H–N 0.84, H–C 0.35.' },
      { id: 'c-ch4-why',
        q: 'Why can’t the H atoms in CH₄ be donated in a hydrogen bond?',
        choices: ['C and H have nearly the same electronegativity (a difference of 0.35), so each H is barely δ+',
                  'CH₄ has too few H atoms',
                  'The C atom has lone pairs in the way',
                  'CH₄ is a gas'],
        why: 'Only an H bonded to N, O or F is δ+ enough to be donated.' },
      { id: 'c-glycol-pairs', fact: ['pairs', 'glycol'],
        q: 'Ethylene glycol has 2 H atoms on O and 4 lone pairs on O. How many hydrogen bonds can one molecule make with its neighbours?',
        choices: ['2', '4', '6', '1'],
        why: 'Each hydrogen bond needs one H to donate and one lone pair to receive. 2 H atoms, 4 lone pairs: the ' +
             'smaller number, 2, is how many it can make.' },
      { id: 'c-water-pairs', fact: ['pairs', 'H2O'],
        q: 'How many hydrogen bonds can one water molecule make with its neighbours?',
        choices: ['2', '4', '1', '3'],
        why: '2 H atoms on O and 2 lone pairs on O: 2 hydrogen bonds.' },
      { id: 'c-nh3-pairs', fact: ['pairs', 'NH3'],
        q: 'NH₃ has 3 H atoms on N but only 1 lone pair. How many hydrogen bonds can one molecule make?',
        choices: ['1', '3', '4', '0'],
        why: 'Every hydrogen bond needs an H AND a lone pair. With only 1 lone pair among them, the molecules can ' +
             'make 1 each.' },
      { id: 'c-ethanol-glycol', fact: ['stronger', 'glycol', 'ethanol'],
        q: 'Which has the higher boiling point: ethanol or ethylene glycol?',
        choices: ['Ethylene glycol: it can make 2 hydrogen bonds per molecule, ethanol only 1',
                  'Ethanol: its molecules are smaller and move faster',
                  'They boil at the same temperature: both hydrogen bond',
                  'Ethanol: it has more H atoms'],
        why: 'Both hydrogen bond, so count them: glycol 2, ethanol 1. Glycol boils at 197 °C, ethanol at 78 °C.' },
      { id: 'c-water-nh3', fact: ['stronger', 'H2O', 'NH3'],
        q: 'Water and ammonia both have 10 electrons and both hydrogen bond. Which boils higher?',
        choices: ['Water: 2 hydrogen bonds per molecule to ammonia’s 1',
                  'Ammonia: it has more H atoms',
                  'They boil at the same temperature',
                  'Ammonia: N is less electronegative'],
        why: 'Water boils at 100 °C, ammonia at −33 °C.' },
      { id: 'c-acetone-self',
        q: 'Can acetone molecules hydrogen bond with each other?',
        choices: ['No: acetone has no H bonded to N, O or F to donate, even though its O has lone pairs',
                  'Yes: it has an O atom',
                  'Yes: it has six H atoms',
                  'No: acetone is nonpolar'],
        why: 'A hydrogen bond needs a donor AND a receiver. Acetone has receivers (the lone pairs on O) but no donor.' },
      { id: 'c-water-acetone',
        q: 'Acetone mixes with water. How do they hydrogen bond?',
        choices: ['An H on a water molecule bonds to a lone pair on acetone’s O',
                  'An H on acetone bonds to a lone pair on water’s O',
                  'Acetone’s C bonds to water’s O',
                  'They can’t hydrogen bond at all'],
        why: 'Water donates; acetone’s O receives. Acetone’s H atoms are on C, so they cannot be donated.' },
      { id: 'c-methanol-imf', fact: ['imf', 'CH3OH'],
        q: 'Which intermolecular forces act between methanol, CH₃OH, molecules?',
        choices: [IMF_LIST.hbond, IMF_LIST.dipole, IMF_LIST.ldf, 'Only hydrogen bonding'],
        why: 'Its O–H gives hydrogen bonding; it is polar, so dipole-dipole forces; and every molecule has LDF.' },
      { id: 'c-pick-donor', fact: ['donorOnly', ['CH3OH', 'CH3F', 'CH4', 'acetone']],
        q: 'Which of these molecules can be an H-bond donor?',
        choices: ['CH₃OH', 'CH₃F', 'CH₄', 'C₃H₆O (acetone)'],
        why: 'Only CH₃OH has an H bonded to N, O or F. In CH₃F the F has lone pairs but the H atoms are all on C.' }
    ]
  },

  D: {
    title: 'Checkpoint 4: putting it together',
    draw: 5,
    core: ['d-ladder-18', 'd-order'],
    pool: [
      { id: 'd-ladder-18', fact: ['rank', ['F2', 'HCl', 'CH3OH']],
        q: 'F₂, HCl and CH₃OH all have 18 electrons. Rank them by boiling point, lowest first.',
        choices: ['F₂ < HCl < CH₃OH', 'CH₃OH < HCl < F₂', 'HCl < F₂ < CH₃OH', 'They all boil at the same temperature'],
        why: 'Same electrons, so about the same LDF. F₂ has only LDF, HCl adds dipole-dipole forces, CH₃OH adds ' +
             'hydrogen bonding. −188 °C, −85 °C, 65 °C.' },
      { id: 'd-order',
        q: 'Which order of strength does this class use for intermolecular forces?',
        choices: ['London dispersion forces < dipole-dipole forces < hydrogen bonding',
                  'Hydrogen bonding < dipole-dipole forces < London dispersion forces',
                  'Dipole-dipole forces < London dispersion forces < hydrogen bonding',
                  'They are all equally strong'],
        why: 'For molecules with about the same number of electrons, the strongest force a substance has decides it.' },
      { id: 'd-ladder-ethane', fact: ['rank', ['C2H6', 'CH3F', 'CH3OH']],
        q: 'C₂H₆, CH₃F and CH₃OH all have 18 electrons. Rank them by boiling point, lowest first.',
        choices: ['C₂H₆ < CH₃F < CH₃OH', 'CH₃OH < CH₃F < C₂H₆', 'CH₃F < C₂H₆ < CH₃OH', 'C₂H₆ < CH₃OH < CH₃F'],
        why: 'LDF only, then dipole-dipole forces too, then hydrogen bonding too: −89 °C, −78 °C, 65 °C.' },
      { id: 'd-ladder-10', fact: ['rank', ['CH4', 'NH3', 'H2O']],
        q: 'CH₄, NH₃ and H₂O all have 10 electrons. Rank them by boiling point, lowest first.',
        choices: ['CH₄ < NH₃ < H₂O', 'H₂O < NH₃ < CH₄', 'NH₃ < CH₄ < H₂O', 'CH₄ < H₂O < NH₃'],
        why: 'CH₄ cannot hydrogen bond; NH₃ makes 1 hydrogen bond per molecule and H₂O makes 2. −161 °C, −33 °C, 100 °C.' },
      { id: 'd-hcl-methanol', fact: ['stronger', 'CH3OH', 'HCl'],
        q: 'HCl and CH₃OH both have 18 electrons. Which has the higher boiling point?',
        choices: ['CH₃OH: it hydrogen bonds', 'HCl: chlorine is more electronegative than oxygen',
                  'They boil at the same temperature', 'HCl: it is a stronger acid'],
        why: 'CH₃OH has an H on O to donate and lone pairs on O to receive. HCl’s H is on Cl, so it cannot hydrogen ' +
             'bond. 65 °C against −85 °C.' },
      { id: 'd-propanol-glycol', fact: ['stronger', 'glycol', 'propanol'],
        q: '1-Propanol and ethylene glycol both have 34 electrons and both hydrogen bond. Which boils higher?',
        choices: ['Ethylene glycol: 2 hydrogen bonds per molecule to 1-propanol’s 1',
                  '1-Propanol: it has more C atoms',
                  'They boil at the same temperature: same electrons',
                  '1-Propanol: it has more H atoms'],
        why: 'Same electrons, so the LDF match; count the hydrogen bonds. Glycol 197 °C, 1-propanol 97 °C.' },
      { id: 'd-water-ethanol', fact: ['stronger', 'H2O', 'ethanol'],
        q: 'Which has the higher boiling point: water or ethanol?',
        choices: ['Water: 2 hydrogen bonds per molecule to ethanol’s 1',
                  'Ethanol: it has more electrons',
                  'They boil at the same temperature',
                  'Ethanol: it is bigger'],
        why: 'Both hydrogen bond, so count: water 2, ethanol 1. 100 °C against 78 °C.' },
      { id: 'd-ne-hf', fact: ['stronger', 'HF', 'Ne'],
        q: 'Neon and HF both have 10 electrons. Which has the higher boiling point?',
        choices: ['HF: it hydrogen bonds', 'Neon: noble gases have the strongest LDF', 'They boil at the same temperature',
                  'Neon: it has no bonds to break'],
        why: 'The same electrons; HF adds hydrogen bonding (its H is on F). 20 °C against −246 °C.' },
      { id: 'd-temp',
        q: 'Two liquids are at the same temperature. Which one evaporates more easily?',
        choices: ['The one with the weaker intermolecular forces: its molecules break free more easily',
                  'The one with the stronger intermolecular forces',
                  'The one with more electrons',
                  'They evaporate equally'],
        why: 'At the same temperature the molecules move about equally hard; weaker attractions let more of them escape.' }
    ]
  }
};

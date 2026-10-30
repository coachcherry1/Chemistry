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
 *   ['prop', p, w, l]    the first choice starts with w, which has the higher surface
 *                        tension (p 'st') or viscosity ('visc'), or evaporates faster ('evap')
 *   ['propBest', p, most, [ids]]  the first choice starts with the one with the most (or least)
 *   ['rankNames', [ids]] the first choice lists their names strongest IMFs first, joined by " > "
 *   ['imfPair', a, b]    the first choice names a's IMFs, then b's, as "X: forces. Y: forces"
 * `figs` lists the substances whose Lewis structures are drawn beside the
 * question: every substance it names that is more than one atom.
 * Every question that compares two substances must carry a fact.
 */

var IMF_LIST = {
  ldf: 'Only London dispersion forces',
  dipole: 'Dipole-dipole forces and London dispersion forces',
  hbond: 'Hydrogen bonding, dipole-dipole forces and London dispersion forces'
};

var QUIZZES = {

  E: {
    title: 'Checkpoint: properties of liquids',
    draw: 8,
    core: ['e-rule', 'e-decane-imf', 'e-42-rank'],
    pool: [
      { id: 'e-rule',
        q: 'At the same temperature, liquid X has stronger IMFs than liquid Y. Compared with Y, liquid X has…',
        choices: ['Higher surface tension, higher viscosity, and it evaporates more slowly',
                  'Lower surface tension, higher viscosity, and it evaporates more slowly',
                  'Higher surface tension, lower viscosity, and it evaporates more slowly',
                  'Higher surface tension, higher viscosity, and it evaporates faster than Y'],
        why: 'Stronger IMFs hold the molecules together more tightly: the surface pulls in harder, the liquid resists ' +
             'flowing, and fewer molecules break free into the air.' },
      { id: 'e-same-temp',
        q: 'Why are the liquids always compared at the same temperature?',
        choices: ['Warmer molecules move faster, which changes all three properties',
                  'The IMFs only exist at room temperature, so a cold liquid has none',
                  'At other temperatures the molecules would have new Lewis structures',
                  'Surface tension can only be seen while the liquid is boiling hard'],
        why: 'Temperature is how fast the molecules move. To see what the IMFs do, everything else, temperature ' +
             'included, has to stay the same.' },
      { id: 'e-evap-why',
        q: 'Why does a liquid with weaker IMFs evaporate faster?',
        choices: ['Its molecules break free of each other at the surface more easily',
                  'Its molecules are heavier, so they drop out of the liquid sooner',
                  'The bonds inside its molecules break, so each molecule falls apart',
                  'Its molecules attract the air more strongly, and the air pulls them out'],
        why: 'Evaporation is molecules escaping from the surface. The weaker the attractions holding them back, the ' +
             'more of them get away.' },
      { id: 'e-st-what',
        q: 'What is surface tension?',
        choices: ['How strongly the molecules at the surface are pulled in by their neighbours',
                  'How quickly the molecules at the surface escape into the air above it',
                  'How thick the liquid is, and so how slowly it pours out of a pipet or a cup',
                  'How much heavier the surface of a liquid is than all the liquid underneath'],
        why: 'A molecule at the surface has neighbours only beside and below it, so the IMFs pull it inward. ' +
             'Stronger IMFs, a stronger pull: drops bead up.' },
      { id: 'e-visc-what',
        q: 'What is viscosity?',
        choices: ['How strongly a liquid resists flowing, so how slowly it pours',
                  'How quickly a liquid evaporates when it is left out in a dish',
                  'How strongly the surface of a liquid holds a drop in a tall bead',
                  'How many hydrogen bonds each molecule of the liquid can make'],
        why: 'A liquid with strong IMFs holds on to its neighbours as it moves past them, so it flows slowly: high ' +
             'viscosity.' },
      { id: 'e-decane-imf', fact: ['imf', 'decane'], figs: ['decane'],
        q: 'Which intermolecular forces act between decane, C₁₀H₂₂, molecules?',
        choices: [IMF_LIST.ldf, IMF_LIST.dipole, IMF_LIST.hbond, 'Dipole-dipole forces only, because it is such a long molecule'],
        why: 'Decane has only C–C and C–H bonds, so it is nonpolar and has nothing to donate. Only LDF, but with 82 ' +
             'electrons they are strong.' },
      { id: 'e-diol-imf', fact: ['imf', 'pentanediol'], figs: ['pentanediol'],
        q: 'Which intermolecular forces act between 1,5-pentanediol molecules?',
        choices: [IMF_LIST.hbond, IMF_LIST.dipole, IMF_LIST.ldf,
                  'Hydrogen bonding and London dispersion forces, but no dipole-dipole forces'],
        why: 'Each end has an O–H: hydrogen bonding. The molecule is polar, so dipole-dipole forces, and like every ' +
             'molecule it has LDF.' },
      { id: 'e-diol-pairs', fact: ['pairs', 'pentanediol'], figs: ['pentanediol'],
        q: 'How many hydrogen bonds can one 1,5-pentanediol molecule make with its neighbours?',
        choices: ['2', '1', '4', '6'],
        why: '2 H atoms on O and 4 lone pairs on O: the smaller number, 2, is how many hydrogen bonds it can make.' },
      { id: 'e-42-rank', fact: ['rankNames', ['butanol', 'butanone', 'pentane']], figs: ['pentane', 'butanone', 'butanol'],
        q: 'Pentane (42 electrons), 2-butanone (40) and 1-butanol (42). Rank them from strongest to weakest IMFs.',
        choices: ['1-butanol > 2-butanone > pentane', '2-butanone > 1-butanol > pentane', 'pentane > 2-butanone > 1-butanol',
                  '1-butanol > pentane > 2-butanone'],
        why: 'About the same electrons, so about the same LDF. 1-Butanol hydrogen bonds; 2-butanone is polar (its C=O) ' +
             'but has no H on O to donate: dipole-dipole forces; pentane has only LDF.' },
      { id: 'e-alk-visc', fact: ['prop', 'visc', 'decane', 'pentane'], figs: ['pentane', 'decane'],
        q: 'Which has the higher viscosity: pentane or decane?',
        choices: ['Decane: 82 electrons to 42, so stronger LDF hold it together',
                  'Pentane: its smaller molecules pack closer and hold on tighter',
                  'They are the same: both are hydrocarbons with only LDF between them',
                  'Pentane: it has fewer H atoms, so its molecules cannot slip past'],
        why: 'Both have only LDF. Decane has far more electrons, so it is more polarizable and its LDF are stronger: ' +
             'stronger IMFs, higher viscosity.' },
      { id: 'e-alk-evap', fact: ['prop', 'evap', 'pentane', 'decane'], figs: ['pentane', 'decane'],
        q: 'Which evaporates faster: pentane or decane?',
        choices: ['Pentane: 42 electrons to 82, so weaker LDF let it break free',
                  'Decane: its bigger molecules have more room to escape the liquid',
                  'They evaporate equally fast, because both have only LDF between them',
                  'Decane: it has more H atoms at its surface to escape into the air'],
        why: 'Fewer electrons, weaker LDF: pentane’s molecules break free of each other more easily, so it evaporates ' +
             'faster.' },
      { id: 'e-alk-st', fact: ['prop', 'st', 'octane', 'pentane'], figs: ['pentane', 'octane'],
        q: 'Which has the higher surface tension: pentane or octane?',
        choices: ['Octane: 66 electrons to 42, so its LDF pull harder',
                  'Pentane: its smaller molecules sit closer at the surface',
                  'They are the same: both are nonpolar with only LDF',
                  'Pentane: it evaporates faster, so its surface is tighter'],
        why: 'Both have only LDF; octane has more electrons, so stronger LDF pull its surface molecules inward harder.' },
      { id: 'e-42-visc', fact: ['prop', 'visc', 'butanol', 'pentane'], figs: ['pentane', 'butanol'],
        q: 'Pentane and 1-butanol both have 42 electrons. Which has the higher viscosity?',
        choices: ['1-Butanol: its hydrogen bonds are stronger than pentane’s LDF',
                  'Pentane: it has more C atoms, so its molecules tangle and catch',
                  'They are the same: they have the same number of electrons',
                  'Pentane: with no O atom, nothing lets its molecules slide past'],
        why: 'Same electrons, so about the same LDF, but 1-butanol also hydrogen bonds (its O–H). Stronger IMFs, ' +
             'higher viscosity.' },
      { id: 'e-42-evap', fact: ['prop', 'evap', 'pentane', 'butanone'], figs: ['pentane', 'butanone'],
        q: 'Pentane has 42 electrons and 2-butanone 40. Which evaporates faster?',
        choices: ['Pentane: it has only LDF, while 2-butanone adds dipole-dipole forces',
                  '2-Butanone: it has 2 fewer electrons, so its LDF are a little weaker',
                  'They evaporate equally fast: their electron counts are almost the same',
                  '2-Butanone: its O atom is heavy and pulls the molecule out of the liquid'],
        why: 'About the same electrons, so about the same LDF. 2-Butanone is polar, so it adds dipole-dipole forces: ' +
             'stronger IMFs, slower evaporation. Pentane evaporates faster.' },
      { id: 'e-42-st', fact: ['prop', 'st', 'butanone', 'pentane'], figs: ['pentane', 'butanone'],
        q: 'Which has the higher surface tension: pentane or 2-butanone?',
        choices: ['2-Butanone: it is polar, so it adds dipole-dipole forces to its LDF',
                  'Pentane: it has 2 more electrons, so its LDF pull its surface harder',
                  'They are the same: their electron counts are almost exactly the same',
                  'Pentane: nonpolar molecules always hold their surface the most tightly'],
        why: 'About the same electrons, so about the same LDF; 2-butanone is polar as well. Stronger IMFs, higher ' +
             'surface tension.' },
      { id: 'e-58-visc', fact: ['prop', 'visc', 'pentanediol', 'hexanol'], figs: ['hexanol', 'pentanediol'],
        q: '1-Hexanol and 1,5-pentanediol both have 58 electrons. Which has the higher viscosity?',
        choices: ['1,5-Pentanediol: 2 hydrogen bonds per molecule to 1-hexanol’s 1',
                  '1-Hexanol: it has one more C atom, so its chain is longer and stiffer',
                  'They are the same: both hydrogen bond and both have 58 electrons',
                  '1-Hexanol: it has more H atoms, so it has more places to hold on'],
        why: 'Same electrons, both hydrogen bond, but 1,5-pentanediol has an O–H at each end: 2 hydrogen bonds per ' +
             'molecule to 1. Stronger IMFs, higher viscosity.' },
      { id: 'e-58-st', fact: ['prop', 'st', 'pentanediol', 'hexanol'], figs: ['hexanol', 'pentanediol'],
        q: 'Which has the higher surface tension: 1-hexanol or 1,5-pentanediol?',
        choices: ['1,5-Pentanediol: it can make 2 hydrogen bonds per molecule, 1-hexanol 1',
                  '1-Hexanol: its longer chain of C atoms pulls the surface in more tightly',
                  'They are the same: both hydrogen bond, so their surfaces pull equally',
                  '1-Hexanol: it has fewer O atoms, so its molecules sit closer together'],
        why: 'Both have 58 electrons and both hydrogen bond; the one with more hydrogen bonds per molecule has the ' +
             'stronger IMFs: higher surface tension.' },
      { id: 'e-58-evap', fact: ['prop', 'evap', 'heptane', 'hexanol'], figs: ['heptane', 'hexanol'],
        q: 'Heptane and 1-hexanol both have 58 electrons. Which evaporates faster?',
        choices: ['Heptane: it has only LDF, while 1-hexanol also hydrogen bonds',
                  '1-Hexanol: its O atom makes it lighter, so it leaves the liquid first',
                  'They evaporate equally fast: they have the same number of electrons',
                  '1-Hexanol: its O–H end sticks out of the surface and escapes first'],
        why: 'Same electrons, about the same LDF; 1-hexanol also hydrogen bonds. Weaker IMFs, faster evaporation: ' +
             'heptane.' },
      { id: 'e-58-best', fact: ['propBest', 'st', true, ['heptane', 'hexanol', 'pentanediol']], figs: ['heptane', 'hexanol', 'pentanediol'],
        q: 'Heptane, 1-hexanol and 1,5-pentanediol all have 58 electrons. Which has the highest surface tension?',
        choices: ['1,5-Pentanediol: the most hydrogen bonds per molecule',
                  '1-Hexanol: it has the longest chain of carbon atoms',
                  'Heptane: it has the most H atoms of the three liquids',
                  'All three are the same: they have the same electrons'],
        why: 'Heptane has only LDF; 1-hexanol hydrogen bonds once per molecule; 1,5-pentanediol twice. The strongest ' +
             'IMFs, the highest surface tension.' }
    ]
  }
};

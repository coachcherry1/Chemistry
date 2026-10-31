"""Chapter 6: Reaction Mechanisms (50 multiple choice + 50 free response)."""
from qb import *

NUC = '[OH-:1].C[C+:2](C)C'
NUC_OK = [(('lp', 1), ('atom', 2), {'bend': .35})]
LG = 'C[C:2](C)(C)[Br:3]'
LG_OK = [(('bondf', 2, 3, .3), ('atom', 3), {'bend': .7, 'e_off': -9})]
NUC4 = '[OH-:1].C[C+:2]([CH3:4])C'
RE = 'C[C:1](C)([CH3:2])[CH+:3]C'
RE_OK = [(('bond', 1, 2), ('atom', 3), {'bend': .4})]


def dG(h, t, s):
    return round(h - t * s, 1)


def build(b):
    # ------------------------------------------------------------ 6.1 Enthalpy
    b.mc('6.1', 1, 'What does a negative ΔH indicate?', 'The reaction is exothermic (heat is released)', ['The reaction is endothermic', 'The reaction is very slow', 'The reaction has no energy change'], 'Negative ΔH means the products are lower in enthalpy than the reactants.')
    b.mc('6.1', 1, 'Breaking a bond is a(n) ______ process, and forming a bond is a(n) ______ process.', 'endothermic; exothermic', ['exothermic; endothermic', 'endothermic; endothermic', 'exothermic; exothermic'], 'Energy must be put in to break bonds; it is released when bonds form.')
    b.mc('6.1', 2, 'In a reaction, the bonds broken are stronger overall than the bonds formed. What is the sign of ΔH?', 'Positive', ['Negative', 'Zero', 'It cannot be determined'], 'More energy is absorbed breaking strong bonds than is released making weak ones.')
    b.mc('6.1', 2, 'Which pair of bond strengths (kJ/mol) is correct for the reaction CH₄ + Cl₂ → CH₃Cl + HCl (C-H 414, Cl-Cl 243, C-Cl 339, H-Cl 431)?', 'ΔH = −113 kJ/mol', ['ΔH = +113 kJ/mol', 'ΔH = −770 kJ/mol', 'ΔH = +770 kJ/mol'], 'Broken: 414 + 243 = 657. Formed: 339 + 431 = 770. ΔH = 657 − 770 = −113.')
    b.mc('6.1', 3, 'A reaction breaks bonds totalling 850 kJ/mol and forms bonds totalling 920 kJ/mol. What is ΔH?', '−70 kJ/mol', ['+70 kJ/mol', '−1770 kJ/mol', '+1770 kJ/mol'], 'ΔH = bonds broken − bonds formed = 850 − 920.')
    # ------------------------------------------------------------ 6.2 Entropy
    b.mc('6.2', 1, 'Entropy (S) is best described as a measure of:', 'Disorder (the number of ways energy can be distributed)', ['Heat released', 'Rate of reaction', 'Bond strength'], 'More disorder means higher entropy.')
    b.mc('6.2', 2, 'In which reaction does the system gain entropy (ΔS > 0)?', 'One molecule splits into two molecules', ['Two molecules combine into one', 'A liquid freezes', 'A gas dissolves in a liquid'], 'More particles means more disorder.')
    b.mc('6.2', 2, 'What is the sign of ΔS for A + B → C?', 'Negative', ['Positive', 'Zero', 'It depends on ΔH'], 'Two particles become one, so disorder decreases.')
    b.mc('6.2', 3, 'Which change has the largest positive ΔS?', 'A solid dissolving to give many gas molecules', ['A gas condensing to a liquid', 'A liquid freezing to a solid', 'Two molecules forming a ring'], 'Gas molecules are the most disordered.')
    # ------------------------------------------------------------ 6.3 Gibbs free energy
    b.mc('6.3', 1, 'Which equation relates free energy, enthalpy and entropy?', 'ΔG = ΔH − TΔS', ['ΔG = ΔH + TΔS', 'ΔG = TΔH − ΔS', 'ΔG = ΔS − ΔH'], 'The entropy term is multiplied by absolute temperature and subtracted.')
    b.mc('6.3', 1, 'A reaction with ΔG < 0 is:', 'Thermodynamically favorable', ['Always fast', 'Not thermodynamically favorable', 'At equilibrium'], 'Negative ΔG means the products are favored at equilibrium.')
    h, t, s = -40, 300, 0.10
    b.mc('6.3', 2, f'For a reaction, ΔH = {h} kJ/mol, T = {t} K and ΔS = +{s} kJ/(mol·K). What is ΔG?', f'{dG(h, t, s)} kJ/mol', [f'{dG(h, -t, s)} kJ/mol', f'{h - s} kJ/mol', f'+{-dG(h, t, s)} kJ/mol'], 'ΔG = ΔH − TΔS.')
    h, t, s = 30, 300, -0.05
    b.mc('6.3', 2, f'For a reaction, ΔH = +{h} kJ/mol, T = {t} K and ΔS = {s} kJ/(mol·K). What is ΔG?', f'+{dG(h, t, s)} kJ/mol', [f'{dG(h, -t, s)} kJ/mol', f'+{h - s} kJ/mol', f'+{round(h + 2 * t * s, 1)} kJ/mol'], 'ΔG = ΔH − TΔS = 30 − (300)(−0.05).')
    b.mc('6.3', 2, 'A reaction has ΔH < 0 and ΔS > 0. At what temperatures is it thermodynamically favorable?', 'All temperatures', ['Only high temperatures', 'Only low temperatures', 'No temperature'], 'ΔH is negative and −TΔS is negative, so ΔG is always negative.')
    b.mc('6.3', 3, 'A reaction has ΔH > 0 and ΔS > 0. It is thermodynamically favorable only:', 'At high temperature', ['At low temperature', 'At all temperatures', 'At no temperature'], 'The −TΔS term must outweigh the positive ΔH.')
    b.mc('6.3', 3, 'A reaction has ΔH < 0 and ΔS < 0. It is thermodynamically favorable only:', 'At low temperature', ['At high temperature', 'At all temperatures', 'At no temperature'], 'At low T the favorable ΔH wins over the unfavorable −TΔS.')
    # ------------------------------------------------------------ 6.4 Equilibria
    b.mc('6.4', 1, 'If ΔG° is negative, the equilibrium constant K is:', 'Greater than 1', ['Less than 1', 'Equal to 1', 'Zero'], 'Negative ΔG° means products are favored.')
    b.mc('6.4', 2, 'If K = 1 for a reaction, what is ΔG°?', 'Zero', ['Positive', 'Negative', 'Infinite'], 'Reactants and products are equally favored.')
    b.mc('6.4', 2, 'A reaction has a large positive ΔG°. What is true at equilibrium?', 'Reactants are favored', ['Products are favored', 'Equal amounts of reactants and products are present', 'The reaction is exothermic'], 'Large positive ΔG° gives K much less than 1.')
    b.mc('6.4', 3, 'Which change in ΔG° corresponds to the largest K?', '−40 kJ/mol', ['−10 kJ/mol', '0 kJ/mol', '+10 kJ/mol'], 'More negative ΔG° gives a larger K.')
    # ------------------------------------------------------------ 6.5 Kinetics
    b.mc('6.5', 1, 'What does the activation energy (Eₐ) represent?', 'The energy barrier that must be overcome for the reaction to proceed', ['The energy released by the reaction', 'The difference in energy between products and reactants', 'The equilibrium constant'], 'The barrier from reactants to the transition state.')
    b.mc('6.5', 1, 'A smaller activation energy gives a reaction that is:', 'Faster', ['Slower', 'More exothermic', 'Less favorable thermodynamically'], 'A lower barrier means more molecules can cross it.')
    b.mc('6.5', 2, 'Increasing the temperature of a reaction mixture usually makes the reaction faster because:', 'More molecules have enough energy to overcome Eₐ', ['Eₐ becomes smaller', 'ΔG becomes more negative', 'The products become more stable'], 'The fraction of molecules with energy above Eₐ rises with temperature.')
    b.mc('6.5', 2, 'A reaction is thermodynamically favorable (ΔG < 0). Does this mean it is fast?', 'No, speed depends on the activation energy', ['Yes, it is always fast', 'Yes, but only at high temperature', 'No, because ΔG controls only enthalpy'], 'Thermodynamics tells you about the position of equilibrium, kinetics about the rate.')
    b.mc('6.5', 3, 'In a one-step reaction the rate depends on the concentration of both reactants. This is a:', 'Second-order (bimolecular) reaction', ['First-order reaction', 'Zero-order reaction', 'Reaction with no rate law'], 'A rate that depends on two concentrations is second order.')
    b.mc('6.5', 3, 'Doubling the concentration of the only species in the rate law of a first-order reaction changes the rate by what factor?', '2', ['4', '1', '0.5'], 'Rate = k[A]; doubling [A] doubles the rate.')
    # ------------------------------------------------------------ 6.6 Energy diagrams
    b.mc('6.6', 1, 'On an energy diagram, the highest point between reactants and products is the:', 'Transition state', ['Intermediate', 'Product', 'Catalyst'], 'The transition state is the peak.')
    b.mc('6.6', 2, 'On an energy diagram, a valley between two peaks represents:', 'An intermediate', ['A transition state', 'A catalyst', 'The products'], 'Intermediates are short-lived species in a local energy minimum.')
    b.mc('6.6', 2, 'A reaction with two peaks and one valley between them is a:', 'Two-step reaction', ['One-step reaction', 'Three-step reaction', 'Reaction with no intermediate'], 'Each peak is the transition state of one step.')
    b.mc('6.6', 3, 'On a two-step energy diagram, which step is rate-determining?', 'The step with the highest-energy transition state', ['The step with the lowest-energy transition state', 'The first step always', 'The last step always'], 'The highest barrier controls the overall rate.')
    b.mc('6.6', 3, 'If the products are lower in energy than the reactants on an energy diagram, then the reaction is:', 'Exergonic', ['Endergonic', 'Always fast', 'Always slow'], 'Products lower in free energy means ΔG < 0.')
    # ------------------------------------------------------------ 6.7 Nucleophiles and electrophiles
    b.mc('6.7', 1, 'A nucleophile is a species that:', 'Donates a pair of electrons to form a bond', ['Accepts a pair of electrons', 'Donates a proton', 'Is always positively charged'], 'Nucleophiles are electron-pair donors.')
    b.mc('6.7', 1, 'An electrophile is a species that:', 'Accepts a pair of electrons', ['Donates a pair of electrons', 'Always carries a negative charge', 'Is a solvent'], 'Electrophiles are electron-pair acceptors.')
    b.mc('6.7', 2, 'Which species is most likely to act as a nucleophile?', 'HO⁻', ['H₃O⁺', 'CH₃⁺', 'BF₃'], 'Hydroxide has lone pairs and a negative charge.')
    b.mc('6.7', 2, 'Which species is most likely to act as an electrophile?', 'The carbocation (CH₃)₃C⁺', ['HO⁻', 'NH₃', 'Br⁻'], 'The carbocation has an empty p orbital and a positive charge.')
    b.mc('6.7', 3, 'In the reaction of hydroxide with (CH₃)₃C⁺, which is the electrophile?', 'The carbocation', ['Hydroxide', 'Neither', 'Both'], 'Hydroxide donates a pair of electrons and the carbocation accepts them.', img=A(NUC, NUC_OK))
    # ------------------------------------------------------------ 6.8 - 6.10 Arrow pushing
    b.mc('6.8', 1, 'Which is NOT one of the four arrow-pushing patterns?', 'Nucleophilic substitution of a hydride', ['Nucleophilic attack', 'Loss of a leaving group', 'Proton transfer'], 'The four patterns are nucleophilic attack, loss of a leaving group, proton transfer and carbocation rearrangement.')
    b.mc('6.8', 2, 'Which pattern is shown by the curved arrow?', 'Nucleophilic attack', ['Loss of a leaving group', 'Proton transfer', 'Carbocation rearrangement'], 'A lone pair forms a new bond to the electrophilic carbon.', img=A(NUC, NUC_OK))
    b.mc('6.8', 2, 'Which pattern is shown by the curved arrow?', 'Loss of a leaving group', ['Nucleophilic attack', 'Proton transfer', 'Carbocation rearrangement'], 'A bond breaks and the electrons leave with the bromine.', img=A(LG, LG_OK))
    b.mc('6.8', 3, 'Which pattern is shown by the curved arrow?', 'Carbocation rearrangement', ['Loss of a leaving group', 'Proton transfer', 'Nucleophilic attack'], 'A group (here a methyl) moves with its pair of bonding electrons to the adjacent cation.', img=A(RE, RE_OK))
    b.mc('6.10', 2, 'Where does a curved arrow start?', 'At the source of the electrons (a lone pair or bond)', ['At the atom that will become positive', 'At an atom that gains a proton', 'At the product'], 'The tail always starts where the electrons are.')
    b.mc('6.10', 3, 'A curved arrow is used to show hydroxide attacking a carbocation. Which arrow is correct?', A(NUC, NUC_OK), [A(NUC, [(('atom', 2), ('lp', 1), {'bend': .35})]), A(NUC, [(('atom', 1), ('atom', 2), {'bend': .35})]), A(NUC, [(('lp', 1), ('bond', 2, 2), {'bend': .35})])] if False else
         [A(NUC, [(('atom', 2), ('lp', 1), {'bend': .35})]), A(NUC, [(('atom', 1), ('atom', 2), {'bend': 0.0, 's_off': 3})]), A(NUC4, [(('lp', 1), ('atom', 4), {'bend': .35})])],
         'The arrow starts on the lone pair of the nucleophile and ends on the electron-poor carbon.', oimg=True)
    # ------------------------------------------------------------ 6.9 - 6.11
    b.mc('6.9', 3, 'Why does proton transfer typically precede nucleophilic attack on a neutral alcohol in acid?', 'Protonation turns the OH into a better leaving group (water)', ['It adds a negative charge', 'It makes the alcohol more nucleophilic', 'It forms a carbanion'], 'HO⁻ is a poor leaving group; H₂O is a good one.')
    b.mc('6.11', 1, 'Carbocation rearrangements occur to form:', 'A more stable carbocation', ['A less stable carbocation', 'A radical', 'A carbanion'], 'The shift happens when it leads to a more stable cation.')
    b.mc('6.11', 2, 'Which carbocation is the most stable?', 'Tertiary', ['Secondary', 'Primary', 'Methyl'], 'Alkyl groups stabilise the positive charge by induction and hyperconjugation.')
    b.mc('6.11', 3, 'A secondary carbocation next to a quaternary carbon rearranges by a methyl shift. What is the new carbocation?', 'Tertiary', ['Primary', 'Secondary', 'Methyl'], 'The methyl moves to the cationic carbon, leaving the former quaternary carbon positive and tertiary.', img=S('C[C](C)(C)[CH+]C') if False else None)
    b.mc('6.11', 4, 'A secondary carbocation has a tertiary neighbour carbon bearing an H. After a hydride shift, what is the new cation?', 'A tertiary carbocation', ['A primary carbocation', 'A secondary carbocation', 'A radical'], 'The hydride moves with its two electrons from the tertiary carbon to the cation.')
    b.mc('6.10', 4, 'In a hydride shift the curved arrow starts at:', 'The C-H bond', ['The cationic carbon', 'A lone pair on hydrogen', 'The positive charge'], 'The pair of electrons in the C-H bond moves to the adjacent cation.')

    b.mc('6.4', 3, 'A reaction has ΔG° = +10 kJ/mol. Which statement is correct?', 'K is less than 1', ['K is greater than 1', 'K is exactly 1', 'The reaction is exothermic'], 'Positive ΔG° means the reactants are favored at equilibrium.')
    b.mc('6.6', 2, 'Which feature of an energy diagram represents the activation energy?', 'The height from the reactants to the top of the peak', ['The height from reactants to products', 'The depth of a valley', 'The width of the peak'], 'Eₐ is the barrier from reactants to the transition state.')
    # ================================================================ free response
    b.fr('6.1', 1, 'Define exothermic and endothermic.', 'An exothermic reaction releases heat (ΔH < 0); an endothermic reaction absorbs heat (ΔH > 0).', 'Think about the sign of ΔH.')
    b.fr('6.1', 2, 'Explain why bond breaking is endothermic and bond making is exothermic.', 'Energy must be supplied to pull atoms apart, while energy is released when atoms come together to form a bond.', 'Compare the energy flow in each case.')
    b.fr('6.1', 2, 'Estimate ΔH for CH₄ + Cl₂ → CH₃Cl + HCl using C-H 414, Cl-Cl 243, C-Cl 339 and H-Cl 431 kJ/mol.', 'ΔH = (414 + 243) − (339 + 431) = −113 kJ/mol.', 'Bonds broken minus bonds formed.', bal=(['C', 'ClCl'], ['CCl', 'Cl']) if False else None)
    b.fr('6.1', 3, 'A reaction breaks bonds totalling 1000 kJ/mol and forms bonds totalling 880 kJ/mol. Calculate ΔH and say whether the reaction is exothermic or endothermic.', 'ΔH = 1000 − 880 = +120 kJ/mol, so the reaction is endothermic.', 'ΔH = broken − formed.')
    b.fr('6.2', 1, 'What does entropy measure?', 'Disorder, the number of ways energy and matter can be arranged.', 'Greater disorder means greater entropy.')
    b.fr('6.2', 2, 'Predict the sign of ΔS for the reaction A → B + C and explain.', 'ΔS is positive: one molecule becomes two, increasing disorder.', 'Count particles.')
    b.fr('6.2', 2, 'Predict the sign of ΔS for the formation of a ring from a long chain. Explain.', 'ΔS is negative: a flexible chain loses freedom of motion when it closes into a ring.', 'The product is more ordered.')
    b.fr('6.2', 3, 'Explain why an elimination reaction that makes two molecules from one is favored by high temperature.', 'ΔS is positive, so −TΔS becomes more negative as T rises, making ΔG more negative.', 'Look at the −TΔS term.')
    b.fr('6.3', 1, 'Write the equation for Gibbs free energy and name each term.', 'ΔG = ΔH − TΔS, where ΔH is the change in enthalpy, T the absolute temperature and ΔS the change in entropy.', 'Temperature must be in kelvin.')
    b.fr('6.3', 2, f'Calculate ΔG for a reaction with ΔH = −50 kJ/mol, ΔS = −0.10 kJ/(mol·K) at 300 K.', f'ΔG = −50 − (300)(−0.10) = {dG(-50, 300, -0.10)} kJ/mol, which is thermodynamically favorable.', 'ΔG = ΔH − TΔS.')
    b.fr('6.3', 2, f'Calculate ΔG for a reaction with ΔH = +20 kJ/mol, ΔS = +0.20 kJ/(mol·K) at 400 K.', f'ΔG = 20 − (400)(0.20) = {dG(20, 400, 0.20)} kJ/mol, which is thermodynamically favorable.', 'Use kelvin.')
    b.fr('6.3', 3, 'A reaction has ΔH < 0 and ΔS < 0. Explain how the temperature affects whether it is thermodynamically favorable.', 'At low temperature the negative ΔH dominates and ΔG < 0; at high temperature the positive −TΔS dominates and ΔG becomes positive.', 'Compare ΔH and TΔS.')
    b.fr('6.3', 3, 'Calculate the temperature (in K) at which a reaction with ΔH = +60 kJ/mol and ΔS = +0.15 kJ/(mol·K) becomes thermodynamically favorable.', 'Set ΔG = 0: T = ΔH/ΔS = 60/0.15 = 400 K. Above 400 K the reaction is favorable.', 'ΔG = 0 at the crossover.')
    b.fr('6.4', 1, 'What does K > 1 say about the equilibrium position?', 'The products are favored at equilibrium.', 'K = [products]/[reactants].')
    b.fr('6.4', 2, 'Explain the relationship between the sign of ΔG° and the size of K.', 'If ΔG° < 0, K > 1 (products favored); if ΔG° > 0, K < 1 (reactants favored); if ΔG° = 0, K = 1.', 'Negative ΔG° favors products.')
    b.fr('6.4', 3, 'Two reactions have ΔG° = −20 and −5 kJ/mol. Which has the larger K and why?', 'The −20 kJ/mol reaction, because a more negative ΔG° corresponds to a larger K.', 'K increases exponentially as ΔG° becomes more negative.')
    b.fr('6.5', 1, 'Define activation energy.', 'The energy difference between the reactants and the transition state, the barrier the reaction must overcome.', 'Height of the hill.')
    b.fr('6.5', 2, 'Explain why a reaction can be thermodynamically favorable but extremely slow.', 'ΔG tells where equilibrium lies, but the rate depends on Eₐ; a high barrier makes the reaction slow even if ΔG is negative.', 'Thermodynamics vs kinetics.')
    b.fr('6.5', 2, 'Explain why raising the temperature increases the rate of a reaction.', 'More molecules have kinetic energy above Eₐ, so more collisions are productive.', 'Energy distribution.')
    b.fr('6.5', 3, 'Rate = k[A][B] for a one-step reaction. What happens to the rate if [A] is tripled and [B] is halved?', 'The rate is multiplied by 3 × 0.5 = 1.5.', 'Multiply the individual factors.')
    b.fr('6.5', 3, 'For a first-order reaction Rate = k[A], what happens to the rate when [A] is tripled?', 'It triples.', 'Rate is directly proportional to [A].')
    b.fr('6.6', 1, 'On an energy diagram, what do the peaks and the valleys represent?', 'Peaks are transition states; valleys are intermediates.', 'Peaks are unstable; valleys are short-lived species.')
    b.fr('6.6', 2, 'Describe the energy diagram of a one-step, exergonic reaction.', 'The products are at lower energy than the reactants with a single peak (the transition state) between them.', 'Start high, end low, one hump.')
    b.fr('6.6', 2, 'Describe the energy diagram of an endergonic reaction.', 'The products are at higher free energy than the reactants, with the transition state higher than both.', 'End higher than start.')
    b.fr('6.6', 3, 'A two-step reaction has transition states at 80 and 60 kJ/mol above the reactants and an intermediate at 30 kJ/mol. Which step is rate-determining, and what is its activation energy?', 'The first step, because its transition state is highest; its activation energy is 80 kJ/mol.', 'The highest barrier from the preceding valley or start.')
    b.fr('6.6', 3, 'Why is the intermediate in a two-step reaction not an isolable product in most cases?', 'It sits in a shallow energy valley and has a small barrier to the next step, so it reacts quickly.', 'Short-lived.')
    b.fr('6.7', 1, 'Define nucleophile and electrophile.', 'A nucleophile donates an electron pair to form a bond; an electrophile accepts an electron pair.', 'Nucleus-loving vs electron-loving.')
    b.fr('6.7', 2, 'Identify the nucleophile and the electrophile in the reaction shown.', 'The hydroxide ion is the nucleophile (lone pair donor); the carbocation is the electrophile (positive, electron-poor).', 'Follow the arrow from donor to acceptor.', img=A(NUC, NUC_OK))
    b.fr('6.7', 2, 'Which is the better nucleophile, HO⁻ or H₂O? Explain.', 'HO⁻, because the negative charge makes its lone pairs more available to donate.', 'Charged species are usually better nucleophiles.')
    b.fr('6.7', 3, 'Can a species act as both a nucleophile and a base? Explain the difference in what they attack.', 'Yes. A base uses its electrons to take a proton (attack H); a nucleophile uses them to attack an electron-poor atom, usually carbon.', 'Same electron pair, different target.')
    b.fr('6.8', 1, 'List the four patterns of arrow pushing.', 'Nucleophilic attack, loss of a leaving group, proton transfer and carbocation rearrangement.', 'Klein section 6.8.')
    b.fr('6.8', 2, 'Which arrow-pushing pattern is shown? Draw the product.', 'Loss of a leaving group: the C-Br bond electrons move to bromine, giving a tertiary carbocation and Br⁻.', 'The bond breaks and the electrons go to the more electronegative atom.', img=A(LG, LG_OK), aimg=S('C[C+](C)C', '[Br-]'))
    b.fr('6.8', 2, 'Draw the curved arrow(s) for hydroxide attacking the carbocation and draw the product.', 'One arrow from a lone pair on HO⁻ to the positively charged carbon, giving (CH₃)₃COH.', 'The lone pair forms the new bond.', img=S('[OH-]', 'C[C+](C)C'), aimg=A(NUC, NUC_OK))
    b.fr('6.8', 3, 'Describe how nucleophilic attack and loss of a leaving group are related to each other, using the SN1 mechanism as an example.', 'In SN1, the leaving group departs first, creating a carbocation, and then the nucleophile attacks the cation; they are separate steps.', 'SN1 is a two-step process.')
    b.fr('6.9', 2, 'Why does protonating an alcohol allow it to undergo substitution?', 'It converts the poor leaving group HO⁻ into water, a good leaving group.', 'Better leaving group.')
    b.fr('6.9', 3, 'Describe the steps of an acid-catalyzed substitution of an alcohol by bromide through a carbocation intermediate.', 'Proton transfer to the OH, loss of water to form the carbocation, then nucleophilic attack by Br⁻ on the carbocation.', 'Protonate, leave, attack.')
    b.fr('6.9', 3, 'Why do arrow-pushing steps in a mechanism usually combine two patterns in one step (for example, E2)?', 'The base attacks the proton while the leaving group departs; several curved arrows move electrons simultaneously in a single step.', 'E2 is concerted.')
    b.fr('6.10', 2, 'State two rules for drawing curved arrows.', 'The arrow starts at a lone pair or bond (the electron source) and points to an atom or bond that will receive them; never start from a positive charge or an atom.', 'Arrows show electron movement.')
    b.fr('6.10', 2, 'A student draws a curved arrow starting at a carbocation. What is wrong?', 'Curved arrows must start at electrons (a lone pair or bond). A positive charge has no electrons to move.', 'The tail needs electrons.')
    b.fr('6.10', 3, 'Show the curved arrow(s) for loss of the leaving group in the substrate shown.', 'Draw one arrow from the C-Br bond to bromine, producing a carbocation and Br⁻.', 'The bond electrons leave with the halogen.', img=S(LG.replace(':2', '').replace(':3', '')), aimg=A(LG, LG_OK))
    b.fr('6.10', 3, 'Draw the curved arrow for the methyl shift that converts the secondary carbocation shown into a tertiary carbocation.', 'One arrow from the C-CH₃ bond to the carbon bearing the positive charge.', 'The bond pair moves toward the cation.', img=S('C[C](C)(C)[CH+]C') if False else S('CC(C)(C)[CH+]C'), aimg=A(RE, RE_OK))
    b.fr('6.11', 1, 'Why do carbocations rearrange?', 'To form a more stable carbocation (primary → secondary → tertiary).', 'Greater stability.')
    b.fr('6.11', 2, 'Rank the carbocations methyl, primary, secondary and tertiary by stability.', 'Tertiary > secondary > primary > methyl.', 'More alkyl groups = more stable.')
    b.fr('6.11', 2, 'Explain what is moving in a hydride shift and where it goes.', 'A hydrogen with its bonding pair of electrons moves from a carbon to the adjacent carbocation.', 'H⁻ moves with two electrons.')
    b.fr('6.11', 3, 'A secondary carbocation is adjacent to a tertiary carbon bearing one hydrogen. Draw the possible rearrangement and name the product cation type.', 'A hydride shifts from the tertiary carbon to the cationic carbon, producing a tertiary carbocation.', 'Move H with its electrons.')
    b.fr('6.11', 4, 'Explain why a primary carbocation adjacent to a quaternary carbon will rearrange by a methyl shift, but one adjacent to a CH₂ group with no branching will not give a more stable cation.', 'A methyl shift from the quaternary carbon makes a tertiary cation; with unbranched neighbours a hydride shift only produces a secondary cation, which is still an improvement but less dramatic.', 'Compare the cation types formed.')
    b.fr('6.6', 4, 'Sketch in words an energy diagram for a two-step SN1 reaction, naming the intermediate and the rate-determining step.', 'Reactants rise to the first transition state (loss of the leaving group, rate-determining), fall into the carbocation intermediate valley, rise to a smaller second peak (nucleophilic attack) and fall to products.', 'The first step has the larger barrier.')
    b.fr('6.4', 2, 'A reaction has ΔG° = +15 kJ/mol. Are reactants or products favored at equilibrium?', 'Reactants are favored, because K < 1 when ΔG° is positive.', 'Positive ΔG° gives K < 1.')
    b.fr('6.7', 3, 'Classify each as a nucleophile or an electrophile: NH₃, (CH₃)₃C⁺, Br⁻, H₃O⁺.', 'NH₃ and Br⁻ are nucleophiles (lone pairs); (CH₃)₃C⁺ and H₃O⁺ are electrophiles (electron poor).', 'Look for lone pairs versus electron deficiency.')
    b.fr('6.5', 2, 'Which has the higher rate: a reaction with Eₐ = 40 kJ/mol or one with Eₐ = 80 kJ/mol at the same temperature? Explain.', 'The 40 kJ/mol reaction, because more molecules have enough energy to cross the smaller barrier.', 'Lower barrier, faster rate.')

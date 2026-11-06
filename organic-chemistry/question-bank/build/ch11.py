"""Chapter 11: Synthesis (50 multiple choice + 50 free response)."""
from qb import *
from rdkit import Chem
from rdkit.Chem import Descriptors


def mw(smi):
    return Descriptors.MolWt(Chem.MolFromSmiles(smi))


def atom_economy(product, reactants):
    return round(100 * mw(product) / sum(mw(r) for r in reactants))


def build(b):
    # ------------------------------------------------------------ 11.1 One-step
    b.mcstruct('11.1', 1, 'What is the product of propene with H₂ and Pt?', 'CCC', ['CC(C)O', 'CCCBr', 'C#CC'], 'Catalytic hydrogenation converts C=C to C-C.')
    b.mcstruct('11.1', 2, 'What is the product of cyclohexene with Br₂?', 'Br[C@@H]1CCCC[C@H]1Br', ['BrC1CCCCC1', 'BrC1C=CCCC1', 'BrC1(Br)CCCCC1'], 'Addition of Br₂ across the π bond gives trans-1,2-dibromocyclohexane.')
    b.mcstruct('11.1', 2, 'What is the product of 2-bromopropane with NaOEt and heat?', 'C=CC', ['CC(C)OCC', 'CC(C)O', 'CCC'], 'A strong base with a secondary halide favors E2.')
    b.mcstruct('11.1', 2, 'What is the product of 1-bromobutane with NaCN?', 'CCCCC#N', ['CCCC', 'CCC=C', 'CCCCO'], 'Cyanide is a good nucleophile and a weak base: SN2.')
    b.mc('11.1', 1, 'Which reagents convert an alkene into an alcohol with Markovnikov regiochemistry?', 'H₂O, H₂SO₄', ['BH₃·THF; H₂O₂, NaOH', 'H₂, Pt', 'O₃; DMS'], 'Acid-catalyzed hydration is Markovnikov.')
    b.mc('11.1', 1, 'Which reagent converts a terminal alkyne into a methyl ketone?', 'H₂O, H₂SO₄, HgSO₄', ['H₂, Lindlar', 'NaNH₂', 'O₃, DMS'], 'Hydration of an alkyne gives a ketone through an enol.')
    b.mc('11.1', 2, 'Which reagent converts an alkene into an epoxide?', 'mCPBA', ['OsO₄', 'BH₃', 'NBS'], 'A peroxy acid transfers an oxygen to the alkene.')
    # ------------------------------------------------------------ 11.2 Functional groups
    b.mc('11.2', 2, 'How can the position of a halogen be changed?', 'Elimination followed by addition', ['Addition followed by hydrogenation', 'Ozonolysis', 'Substitution twice'], 'Eliminate HX to form an alkene, then add HX in the other orientation.')
    b.mc('11.2', 2, 'How can the position of a π bond be changed?', 'Addition followed by elimination', ['Elimination followed by addition', 'Hydrogenation', 'Ozonolysis'], 'Add HX across the alkene, then eliminate in the other direction.')
    b.mc('11.2', 3, 'Which sequence converts 1-bromopropane into 2-bromopropane?', '(1) NaOEt, heat; (2) HBr', ['(1) HBr; (2) NaOEt', '(1) H₂O; (2) HBr', '(1) NBS; (2) HBr'], 'Eliminate to propene, then add HBr in a Markovnikov sense.', img=S('CCCBr'))
    b.mc('11.2', 3, 'Which sequence converts 1-pentene into 2-pentene?', '(1) HBr; (2) NaOEt, heat', ['(1) H₂, Pt; (2) Br₂', '(1) BH₃; (2) H₂O₂', '(1) O₃; (2) DMS'], 'Add HBr to give 2-bromopentane, then eliminate toward the more substituted alkene.', img=S('C=CCCC'))
    b.mc('11.2', 3, 'Which sequence converts an alkane into an alkene?', '(1) Br₂, hν; (2) NaOEt, heat', ['(1) HBr; (2) NaOH', '(1) H₂, Pt; (2) NBS', '(1) O₃; (2) DMS'], 'Radical bromination, then E2 elimination.')
    b.mc('11.2', 3, 'Which sequence converts but-1-ene into but-1-yne?', '(1) Br₂; (2) excess NaNH₂; (3) H₂O', ['(1) HBr; (2) NaNH₂', '(1) H₂, Pt; (2) NaNH₂', '(1) O₃; (2) DMS'], 'Bromination, double elimination, then protonation.', img=S('C=CCC'))
    b.mc('11.2', 3, 'Which sequence converts an alkyne into a trans alkene?', 'Na, NH₃(l)', ['H₂, Lindlar', 'H₂, Pt', 'BH₃; H₂O₂'], 'Dissolving-metal reduction.')
    b.mc('11.2', 4, 'Which sequence converts cyclohexane into trans-cyclohexane-1,2-diol?', '(1) Br₂, hν; (2) NaOEt; (3) mCPBA; (4) H₃O⁺', ['(1) Br₂, hν; (2) NaOEt; (3) OsO₄; (4) NaHSO₃', '(1) HBr; (2) NaOEt; (3) H₂O', '(1) Cl₂, hν; (2) NaOH; (3) OsO₄'], 'Halogenate, eliminate, then anti dihydroxylation through the epoxide.', img=S('C1CCCCC1'))
    # ------------------------------------------------------------ 11.3 Carbon skeleton
    b.mc('11.3', 1, 'If the carbon skeleton gets larger, which kind of reaction is needed?', 'A C-C bond-forming reaction', ['A C-C bond cleavage', 'An elimination', 'A hydrogenation'], 'New carbons must be attached.')
    b.mc('11.3', 1, 'If the carbon skeleton gets smaller, which kind of reaction is needed?', 'A C-C bond cleavage such as ozonolysis', ['Alkylation of an alkyne', 'Hydrogenation', 'Hydroboration'], 'Ozonolysis splits C=C or C≡C bonds.')
    b.mc('11.3', 2, 'Which reaction forms a new C-C bond?', 'An alkynide reacting with a primary alkyl halide', ['Hydration of an alkene', 'Hydrogenation of an alkene', 'Bromination of an alkene'], 'Alkylation of alkynides is the Klein C-C bond-forming reaction in these chapters.')
    b.mcstruct('11.3', 3, 'What is the product of propyne with (1) NaNH₂; (2) CH₃CH₂Br?', 'CC#CCC', ['CCCCC', 'CC#C', 'CCC=CC'], 'Two carbons are added to the alkyne.')
    b.mc('11.3', 3, 'Which reagent sequence converts hex-3-yne into propanoic acid?', '(1) O₃; (2) H₂O', ['(1) H₂, Lindlar', '(1) NaNH₂; (2) CH₃I', '(1) Br₂'], 'Ozonolysis of an internal alkyne gives two carboxylic acids.', img=S('CCC#CCC'))
    b.mc('11.3', 3, 'Which sequence converts acetylene into hex-3-yne?', '(1) NaNH₂; (2) EtBr; (3) NaNH₂; (4) EtBr', ['(1) H₂O, HgSO₄; (2) EtBr', '(1) NaOH; (2) EtBr', '(1) Br₂; (2) EtBr'], 'Alkylate both terminal hydrogens.', img=S('C#C'))
    b.mc('11.3', 4, 'Which compound is made from cyclohexene by (1) O₃; (2) DMS?', 'Hexanedial', ['Cyclohexane-1,2-diol', 'Hexanedioic acid', 'Cyclohexanone'], 'The ring is cleaved to a dialdehyde.', img=S('C1=CCCCC1'))
    b.mc('11.3', 4, 'Which sequence makes pent-2-yne from propyne?', '(1) NaNH₂; (2) CH₃CH₂Br', ['(1) NaOH; (2) CH₃CH₂Br', '(1) H₂O, HgSO₄', '(1) HBr; (2) CH₃CH₂Br'], 'Alkylation of the alkynide.', img=S('CC#C'))
    # ------------------------------------------------------------ 11.4 Approach
    b.mc('11.4', 1, 'What two questions should be asked first in a synthesis problem?', 'Does the carbon skeleton change? Does the functional group change identity or position?', ['What is the yield? What is the cost?', 'What is the solvent? What is the temperature?', 'How many steps? How many reagents?'], 'Klein section 11.3 states these two questions.')
    b.mc('11.4', 2, 'Comparing a starting material with a product, the product has two more carbon atoms. What is needed?', 'A C-C bond-forming step', ['A hydrogenation', 'An elimination only', 'A hydration'], 'The skeleton must be extended.', img=R('C#C', None, top=[], bottom=[]))
    b.mc('11.4', 2, 'Which transformation changes only the location of a functional group?', '1-Bromopropane → 2-bromopropane', ['Propene → propane', 'Propyne → propanone', 'Propene → ethanal'], 'Both compounds have three carbons and a bromine, but the bromine moves.')
    b.mc('11.4', 3, 'The synthesis of butanal from but-1-yne requires:', 'Anti-Markovnikov hydration (Sia₂BH; H₂O₂, NaOH)', ['Markovnikov hydration (HgSO₄, H₂SO₄)', 'Ozonolysis', 'NaNH₂'], 'The carbonyl must end up at the terminal carbon.', img=S('CCC#C'))
    # ------------------------------------------------------------ 11.5 Retrosynthesis
    b.mc('11.5', 1, 'What is a retrosynthetic analysis?', 'Working backward from the product to the starting material', ['Working forward from the starting material', 'Testing the reaction in the lab', 'Predicting the yield'], 'The last step is identified first.')
    b.mc('11.5', 2, 'In a retrosynthetic analysis of 2-bromopropane from propane, what is the immediate precursor?', 'Propene', ['Propyne', '1-Bromopropane only', 'Propan-2-ol only'], 'Propene + HBr → 2-bromopropane.', img=S('CC(C)Br'))
    b.mc('11.5', 3, 'A retrosynthesis of cis-hex-3-ene from acetylene and ethyl bromide ends with which last step?', 'H₂, Lindlar catalyst on hex-3-yne', ['Na, NH₃ on hex-3-yne', 'H₂, Pt on hex-3-yne', 'O₃ on hex-3-yne'], 'The cis alkene is made by partial hydrogenation of the alkyne.', img=S('CC/C=C\\CC'))
    b.mc('11.5', 3, 'A retrosynthesis of 2-methylpropan-1-ol from 2-methylpropene ends with which last step?', 'BH₃·THF; H₂O₂, NaOH', ['H₂O, H₂SO₄', 'Hg(OAc)₂, H₂O; NaBH₄', 'O₃; DMS'], 'Anti-Markovnikov hydration.', img=S('CC(C)CO'))
    b.mc('11.5', 4, 'Which is the best precursor for a final step of anti-dihydroxylation giving trans-cyclohexane-1,2-diol?', 'Cyclohexene', ['Cyclohexane', 'Benzene', 'Cyclohexanone'], 'mCPBA then H₃O⁺ on the alkene.', img=S('O[C@@H]1CCCC[C@H]1O'))
    b.mc('11.5', 4, 'A target is 2,2-dibromopropane. Which is the best immediate precursor?', 'Propyne', ['Propene', 'Propane', '1,2-dibromopropane'], 'Two equivalents of HBr add to propyne at the same carbon.', img=S('CC(C)(Br)Br'))
    # ------------------------------------------------------------ 11.6 Green chemistry
    b.mc('11.6', 1, 'What is green chemistry?', 'Designing reactions that minimize negative impacts on the environment', ['Chemistry of plants', 'Chemistry using only water', 'Reactions that are always faster'], 'It aims to reduce waste and hazards.')
    b.mc('11.6', 2, 'What does a high atom economy mean?', 'Most atoms of the reactants end up in the desired product', ['The reaction is fast', 'The reaction uses little energy', 'The reaction gives high yield only'], 'Less waste is produced.')
    b.mc('11.6', 3, f'Atom economy of CH₃CH=CH₂ + HBr → CH₃CHBrCH₃ is:', '100%', ['75%', '50%', '25%'], 'An addition uses all atoms of both reactants.', bal=(['C=CC', 'Br'], ['CC(C)Br']))
    ae = atom_economy('C=CC', ['CC(C)Br', 'CC[O-].[Na+]'])
    b.mc('11.6', 4, 'Which has the lower atom economy?', 'Elimination of HBr from 2-bromopropane with NaOEt', ['Addition of HBr to propene', 'Hydrogenation of propene', 'Addition of Br₂ to propene'], 'Eliminations produce a byproduct (salt plus alcohol).')
    # ------------------------------------------------------------ 11.7 Practical tips
    b.mc('11.7', 1, 'Which is generally the best approach to a synthesis problem?', 'Use the fewest reliable steps', ['Use as many steps as possible', 'Use rare reagents', 'Start from the product only'], 'Efficiency matters.')
    b.mc('11.7', 2, 'Why is learning the reagents from Chapters 7 to 10 essential for synthesis?', 'Each synthesis is built from those known reactions', ['Synthesis uses only new reactions', 'Reagents are never repeated', 'They are all identical'], 'Mastery of reactions is the foundation.')
    b.mc('11.7', 3, 'Which is NOT a good strategy when planning a synthesis?', 'Ignoring regiochemistry and stereochemistry', ['Working backward from the target', 'Checking the carbon skeleton first', 'Looking for the fewest steps'], 'You must control where and how groups are added.')
    b.mc('11.7', 3, 'Several different routes give the same correct product. How should you choose?', 'Prefer the route with fewer steps and better selectivity', ['Choose the one with the most steps', 'Choose the longest route', 'Choose any route with radicals'], 'Efficiency and selectivity are priorities.')
    b.mc('11.2', 3, 'To convert propene into 1,2-dibromopropane use:', 'Br₂', ['HBr', 'NBS', 'H₂, Pt'], 'Addition of Br₂ across the double bond.', img=S('C=CC'))
    b.mc('11.2', 3, 'To convert cyclohexene into cis-cyclohexane-1,2-diol use:', 'OsO₄, then NaHSO₃', ['mCPBA, then H₃O⁺', 'Br₂, then NaOH', 'H₂, Pt'], 'Syn dihydroxylation.', img=S('C1=CCCCC1'))
    b.mc('11.2', 4, 'Which sequence converts 2-bromo-2-methylpropane into 2-methylpropan-1-ol?', '(1) t-BuOK; (2) BH₃·THF; (3) H₂O₂, NaOH', ['(1) NaOH', '(1) HBr; (2) NaOH', '(1) H₂O, heat'], 'Eliminate, then anti-Markovnikov hydration.', img=S('CC(C)(C)Br'))

    b.mc('11.1', 1, 'Which reagent converts an alkene into an alkane?', 'H₂, Pt', ['HBr', 'Br₂', 'O₃'], 'Catalytic hydrogenation.')
    b.mc('11.1', 1, 'Which reagents cleave an alkene into two carbonyl compounds?', 'O₃, then DMS', ['H₂, Pt', 'BH₃, then H₂O₂', 'NBS'], 'Ozonolysis.')
    b.mc('11.1', 2, 'Which reagent adds Br across a double bond?', 'Br₂', ['NBS', 'NaBr', 'HBr with peroxides'], 'Halogenation of an alkene.')
    b.mc('11.2', 2, 'Which reagent brominates the allylic position of an alkene?', 'NBS with light', ['Br₂ in the dark', 'HBr', 'NaBr'], 'Allylic bromination.')
    b.mc('11.2', 2, 'Which reagent converts a vicinal dibromide into an alkyne?', 'Excess NaNH₂', ['H₂, Pt', 'NaOH, cold', 'HBr'], 'Two successive E2 reactions.')
    b.mc('11.4', 3, 'Which change requires C-C bond cleavage?', 'Cyclohexene to hexanedial', ['Propyne to pent-2-yne', 'Propene to propane', 'Propene to 2-bromopropane'], 'The ring is broken open, so the skeleton changes by cleavage.')
    # ================================================================ free response
    b.fr('11.1', 1, 'Give the reagents to convert propene into propane.', 'H₂ with Pt (or Pd or Ni).', 'Catalytic hydrogenation.', img=S('C=CC'))
    b.fr('11.1', 2, 'Give the reagents to convert cyclohexene into trans-1,2-dibromocyclohexane.', 'Br₂ in CH₂Cl₂ (or CCl₄).', 'Anti addition.', img=S('C1=CCCCC1'), aimg=S('Br[C@@H]1CCCC[C@H]1Br'))
    b.fr('11.1', 2, 'Give the reagents to convert but-2-yne into trans-but-2-ene.', 'Na, NH₃(l).', 'Dissolving-metal reduction.', img=S('CC#CC'), aimg=S('C/C=C/C'))
    b.fr('11.1', 2, 'Give the reagents to convert but-2-yne into cis-but-2-ene.', 'H₂, Lindlar catalyst.', 'Poisoned catalyst.', img=S('CC#CC'), aimg=S('C/C=C\\C'))
    b.fr('11.1', 3, 'Give the reagents to convert 1-methylcyclohexene into 1-methylcyclohexan-1-ol and into trans-2-methylcyclohexan-1-ol.', 'H₂O, H₂SO₄ (Markovnikov) for the first; BH₃·THF then H₂O₂, NaOH (anti-Markovnikov, syn addition) for the second.', 'Regiochemistry controls the choice.', img=S('CC1=CCCCC1'))
    b.fr('11.1', 3, 'Give the product of 3-methylbut-1-ene with (1) Hg(OAc)₂, H₂O; (2) NaBH₄, and explain why this reagent is used instead of H₂SO₄/H₂O.', '3-Methylbutan-2-ol; oxymercuration avoids a carbocation rearrangement.', 'No free carbocation.', img=S('C=CC(C)C'), aimg=S('CC(C)C(C)O'))
    # functional group changes
    b.fr('11.2', 2, 'Propose a synthesis of 2-bromopropane from 1-bromopropane.', '(1) NaOEt, heat (E2) to propene; (2) HBr (Markovnikov).', 'Eliminate, then add.', img=S('CCCBr'), aimg=S('CC(C)Br'))
    b.fr('11.2', 2, 'Show how to convert 2-bromopropane into 1-bromopropane in two steps.', '(1) NaOEt, heat (E2); (2) HBr, ROOR (anti-Markovnikov).', 'Radical addition.', img=S('CC(C)Br'), aimg=S('CCCBr'))
    b.fr('11.2', 3, 'Propose a synthesis of pent-2-ene from pent-1-ene.', '(1) HBr (Markovnikov, gives 2-bromopentane); (2) NaOEt, heat (E2, Zaitsev product).', 'Add then eliminate.', img=S('C=CCCC'), aimg=S('CC=CCC'))
    b.fr('11.2', 3, 'Propose a synthesis of cyclohexene from cyclohexane.', '(1) Br₂, hν; (2) NaOEt, heat.', 'Radical bromination then E2.', img=S('C1CCCCC1'), aimg=S('C1=CCCCC1'))
    b.fr('11.2', 3, 'Propose a synthesis of 3-bromocyclohexene from cyclohexane.', '(1) Br₂, hν; (2) NaOEt, heat to give cyclohexene; (3) NBS, hν (allylic bromination).', 'Make the alkene, then brominate the allylic position.', img=S('C1CCCCC1'), aimg=S('BrC1C=CCCC1'))
    b.fr('11.2', 3, 'Give a three-step route from but-1-ene to but-1-yne.', '(1) Br₂; (2) excess NaNH₂; (3) H₂O.', 'Bromination, then double elimination.', img=S('C=CCC'), aimg=S('CCC#C'))
    b.fr('11.2', 3, 'Propose a synthesis of propane-1,2-diol (cis addition irrelevant) from 2-bromopropane.', '(1) NaOEt, heat to propene; (2) OsO₄, then NaHSO₃ (or mCPBA, then H₃O⁺).', 'Eliminate, then dihydroxylate.', img=S('CC(C)Br'), aimg=S('CC(O)CO'))
    b.fr('11.2', 4, 'Propose a synthesis of trans-cyclohexane-1,2-diol from cyclohexanol.', '(1) H₂SO₄, heat (dehydration) to cyclohexene; (2) mCPBA; (3) H₃O⁺.', 'Alkene first, then anti dihydroxylation.', img=S('OC1CCCCC1'), aimg=S('O[C@@H]1CCCC[C@H]1O'))
    b.fr('11.2', 4, 'Propose a synthesis of 2-methylpropan-1-ol from 2-bromo-2-methylpropane.', '(1) t-BuOK, heat (E2, gives 2-methylpropene); (2) BH₃·THF; (3) H₂O₂, NaOH.', 'Eliminate then anti-Markovnikov hydration.', img=S('CC(C)(C)Br'), aimg=S('CC(C)CO'))
    b.fr('11.2', 3, 'Propose a synthesis of butanal from but-1-yne.', '(1) Sia₂BH (or 9-BBN); (2) H₂O₂, NaOH; the enol tautomerizes to butanal.', 'Anti-Markovnikov hydration of a terminal alkyne.', img=S('CCC#C'), aimg=S('CCCC=O'))
    # skeleton
    b.fr('11.3', 1, 'How do you decide whether a synthesis needs C-C bond formation or cleavage?', 'Compare the number of carbons in the starting material and the product: more carbons needs bond formation, fewer needs bond cleavage.', 'Count the carbons.')
    b.fr('11.3', 2, 'Propose a synthesis of pent-2-yne from propyne.', '(1) NaNH₂; (2) CH₃CH₂Br.', 'Alkylate the alkynide.', img=S('CC#C'), aimg=S('CC#CCC'))
    b.fr('11.3', 3, 'Propose a synthesis of hex-3-yne from acetylene.', '(1) NaNH₂; (2) CH₃CH₂Br; (3) NaNH₂; (4) CH₃CH₂Br.', 'Two alkylations.', img=S('C#C'), aimg=S('CCC#CCC'))
    b.fr('11.3', 3, 'Propose a synthesis of acetic acid from but-2-yne.', '(1) O₃; (2) H₂O. Two equivalents of acetic acid form.', 'Cleavage of the triple bond.', img=S('CC#CC'), aimg=S('CC(=O)O'))
    b.fr('11.3', 3, 'Propose a synthesis of acetone from 2-methylbut-2-ene.', '(1) O₃; (2) DMS (the other product is acetaldehyde).', 'Ozonolysis.', img=S('CC=C(C)C'), aimg=S('CC(C)=O'))
    b.fr('11.3', 3, 'Propose a synthesis of hexanedial from cyclohexene.', '(1) O₃; (2) DMS.', 'Cleaves the ring.', img=S('C1=CCCCC1'), aimg=S('O=CCCCCC=O'))
    b.fr('11.3', 4, 'Propose a synthesis of cis-pent-2-ene from propyne and bromoethane.', '(1) NaNH₂; (2) CH₃CH₂Br; (3) H₂, Lindlar catalyst.', 'Alkylate, then reduce to cis.', img=S('CC#C'), aimg=S('C/C=C\\CC'))
    b.fr('11.3', 4, 'Propose a synthesis of trans-hex-3-ene from acetylene and bromoethane.', '(1) NaNH₂; (2) CH₃CH₂Br; (3) NaNH₂; (4) CH₃CH₂Br; (5) Na, NH₃(l).', 'Build hex-3-yne, then dissolving-metal reduction.', img=S('C#C'), aimg=S('CC/C=C/CC'))
    b.fr('11.3', 4, 'Propose a synthesis of butan-2-one from acetylene and bromoethane.', '(1) NaNH₂; (2) CH₃CH₂Br to give but-1-yne; (3) H₂O, H₂SO₄, HgSO₄.', 'Extend, then hydrate.', img=S('C#C'), aimg=S('CCC(C)=O'))
    # approach and retro
    b.fr('11.4', 2, 'List the two questions to ask when approaching a synthesis problem.', 'Is there any change in the carbon skeleton? Is there any change in the identity and/or location of the functional group?', 'Klein 11.3.')
    b.fr('11.4', 2, 'Does converting 1-butene into 1-butyne change the skeleton or only the functional group?', 'Only the functional group; both have four carbons.', 'Count carbons.')
    b.fr('11.4', 3, 'Does converting propyne into pent-2-yne change the skeleton? What type of reaction is needed?', 'Yes, it gains two carbons; a C-C bond-forming reaction (alkylation of the alkynide) is needed.', 'Compare carbon counts.')
    b.fr('11.5', 1, 'Define retrosynthetic analysis.', 'Working backward from the target molecule, identifying the last step first and the preceding compounds in turn until a simple starting material is reached.', 'Backwards.')
    b.fr('11.5', 2, 'Write the retrosynthesis (last two steps) for 1-bromopropane from propane.', 'Target ⇒ propene (add HBr, ROOR) ⇒ 2-bromopropane (E2) ⇒ propane (Br₂, hν).', 'Work backward.', img=S('CCCBr'))
    b.fr('11.5', 3, 'Write the retrosynthesis for trans-cyclohexane-1,2-diol starting from cyclohexane.', 'Target ⇐ epoxide/cyclohexene (mCPBA, H₃O⁺) ⇐ bromocyclohexane (NaOEt) ⇐ cyclohexane (Br₂, hν).', 'Last step first.', img=S('O[C@@H]1CCCC[C@H]1O'))
    b.fr('11.5', 3, 'Write the retrosynthesis for hex-3-yne from acetylene and bromoethane.', 'Hex-3-yne ⇐ but-1-yne + ethyl bromide ⇐ acetylene + ethyl bromide, each time via an alkynide.', 'Two alkylations.', img=S('CCC#CCC'))
    b.fr('11.5', 4, 'Write the retrosynthesis for 2,2-dibromopropane from propane.', '2,2-Dibromopropane ⇐ propyne (2 HBr) ⇐ 1,2-dibromopropane (excess NaNH₂) ⇐ propene (Br₂) ⇐ 2-bromopropane (NaOEt) ⇐ propane (Br₂, hν).', 'Work back through the alkyne.', img=S('CC(C)(Br)Br'))
    b.fr('11.5', 4, 'Write the retrosynthesis for cis-pent-2-ene starting from acetylene and bromoalkanes.', 'cis-Pent-2-ene ⇐ pent-2-yne (H₂, Lindlar) ⇐ propyne + CH₃CH₂Br (NaNH₂) ⇐ acetylene + CH₃Br (NaNH₂).', 'Build the alkyne then reduce.', img=S('C/C=C\\CC'))
    b.fr('11.5', 4, 'Write the retrosynthesis for 2-methylpropan-1-ol starting from 2-methylpropane.', 'Target ⇐ 2-methylpropene (BH₃; H₂O₂, NaOH) ⇐ 2-bromo-2-methylpropane (t-BuOK or NaOEt) ⇐ 2-methylpropane (Br₂, hν).', 'Radical bromination is selective for the tertiary C-H.', img=S('CC(C)CO'))
    # green chemistry and tips
    b.fr('11.6', 1, 'Define green chemistry in your own words.', 'Designing chemical reactions and processes to minimize their negative effects on the environment.', 'Reduce waste and hazard.')
    b.fr('11.6', 2, f'Calculate the atom economy of CH₃CH=CH₂ + HBr → CH₃CHBrCH₃.', '100%, since all atoms of both reactants appear in the product.', 'Addition reactions use all atoms.', bal=(['C=CC', 'Br'], ['CC(C)Br']))
    b.fr('11.6', 3, f'Estimate the atom economy of CH₃CHBrCH₃ + NaOCH₂CH₃ → CH₃CH=CH₂ + NaBr + CH₃CH₂OH. (Molar masses: product 42.1; reactants 123.0 + 68.1.)', f'About {ae}% (42.1/191.1); the rest is wasted as NaBr and ethanol.', 'Product mass divided by total reactant mass.')
    b.fr('11.6', 3, 'Explain why an addition reaction is typically greener than an elimination reaction.', 'Addition incorporates every atom of the reactants in the product (100% atom economy), whereas elimination releases a byproduct such as a salt and an alcohol.', 'Atom economy.')
    b.fr('11.6', 3, 'Give two ways a chemist can make a synthesis greener.', 'Use fewer steps and reagents, choose safer solvents, use catalysts instead of stoichiometric reagents, or choose routes with higher atom economy.', 'Many answers are possible.')
    b.fr('11.7', 2, 'Why might two correct synthesis routes differ in quality?', 'One may use fewer steps, higher-yielding reactions or more selective reagents; shorter, selective routes are preferred.', 'Efficiency.')
    b.fr('11.7', 3, 'Why must regiochemistry be considered when planning an alkene-to-alcohol step?', 'Acid-catalyzed hydration (or oxymercuration) puts OH on the more substituted carbon, hydroboration on the less substituted carbon, so the reagent determines which constitutional isomer forms.', 'Markovnikov vs anti-Markovnikov.')
    b.fr('11.7', 3, 'Why does the stereochemistry of an addition step matter in synthesis?', 'Syn and anti additions give different stereoisomers (for example, cis vs trans diols), so the reagent must be chosen to give the required stereoisomer.', 'Syn vs anti.')
    b.fr('11.7', 4, 'Propose a synthesis of cis-cyclohexane-1,2-diol from bromocyclohexane.', '(1) NaOEt, heat (E2) to give cyclohexene; (2) OsO₄, then NaHSO₃/H₂O.', 'Eliminate then syn dihydroxylation.', img=S('BrC1CCCCC1'), aimg=S('O[C@@H]1CCCC[C@@H]1O'))
    b.fr('11.2', 4, 'Propose a synthesis of 2-bromopropane from propyne.', '(1) H₂, Pt (to propane or use Lindlar to propene); (2) with propene, HBr. Using Lindlar: H₂, Lindlar gives propene, then HBr gives 2-bromopropane.', 'Reduce the alkyne to the alkene, then add HBr.', img=S('CC#C'), aimg=S('CC(C)Br'))
    b.fr('11.2', 3, 'Propose a synthesis of 1,2-dibromocyclohexane from cyclohexane.', '(1) Br₂, hν; (2) NaOEt, heat; (3) Br₂.', 'Make the alkene, then add Br₂.', img=S('C1CCCCC1'), aimg=S('Br[C@@H]1CCCC[C@H]1Br'))
    b.fr('11.3', 3, 'Propose a synthesis of propanoic acid from hex-3-yne.', '(1) O₃; (2) H₂O (two equivalents of propanoic acid form).', 'Cleavage of an internal alkyne.', img=S('CCC#CCC'), aimg=S('CCC(=O)O'))
    b.fr('11.1', 1, 'Give the reagents to convert propyne into propene.', 'H₂ with Lindlar catalyst.', 'Partial reduction.', img=S('CC#C'), aimg=S('C=CC'))
    b.fr('11.2', 2, 'Give the reagents to convert propene into 1,2-dibromopropane.', 'Br₂.', 'Halogenation.', img=S('C=CC'), aimg=S('CC(Br)CBr'))
    b.fr('11.3', 2, 'Give the reagents to convert 2-butene into two molecules of acetaldehyde.', '(1) O₃; (2) DMS.', 'Ozonolysis.', img=S('CC=CC'), aimg=S('CC=O'))

"""Chapter 7: Substitution and Elimination (50 new multiple choice; the 100 free-response problems already exist)."""
from qb import *


def build(b):
    # ------------------------------------------------------------ 7.1 / 7.2
    b.mc('7.1', 1, 'In a substitution reaction, what happens?', 'A leaving group is replaced by another group', ['A π bond is formed and a leaving group is lost', 'Two molecules add across a double bond', 'A radical is formed'], 'Substitution swaps one group for another; elimination forms a π bond.')
    b.mc('7.1', 1, 'In an elimination reaction of an alkyl halide, what is formed?', 'An alkene', ['An alkane', 'An alcohol', 'An alkyne only'], 'The halide and a β hydrogen are lost to form a C=C bond.')
    b.mc('7.1', 2, 'Which is a good leaving group?', 'Br⁻', ['HO⁻', 'H⁻', 'CH₃⁻'], 'Good leaving groups are weak bases that are stable on their own.')
    b.mc('7.2', 1, 'What is the IUPAC name of CH₃CH₂CH₂Br?', '1-Bromopropane', ['2-Bromopropane', 'Propyl bromine', '3-Bromopropane'], 'The halogen is a substituent on the three-carbon chain, numbered from the end nearest it.', img=S('CCCBr'))
    b.mcname('7.2', 2, 'What is the IUPAC name of the compound shown?', 'CC(Cl)CC', ['1-chlorobutane', '2-chloro-2-methylpropane', '2-chloro-3-methylbutane'], 'Number from the end nearest the chlorine.')
    b.mcname('7.2', 3, 'What is the IUPAC name of the compound shown?', 'CC(C)CC(Br)C', ['3-bromo-4-methylpentane', '2-bromo-2-methylpentane', '3-bromo-2-methylbutane'], 'The longest chain has five carbons; the lowest locants are 2 and 4, with the bromo group named first alphabetically.')
    b.mc('7.2', 2, 'Classify the alkyl halide 2-bromo-2-methylpropane.', 'Tertiary', ['Primary', 'Secondary', 'Quaternary'], 'The carbon bearing the bromine is bonded to three other carbons.', img=S('CC(C)(C)Br'))
    b.mc('7.2', 2, 'Classify the alkyl halide shown.', 'Primary', ['Secondary', 'Tertiary', 'Quaternary'], 'The carbon bearing the halogen is attached to only one other carbon.', img=S('CCCCl'))
    # ------------------------------------------------------------ 7.3 SN2
    b.mc('7.3', 1, 'What does SN2 stand for?', 'Substitution, nucleophilic, bimolecular', ['Substitution, nucleophilic, unimolecular', 'Substitution, neutral, bimolecular', 'Single-step nucleophile, 2 products'], 'The rate depends on two species.')
    b.mc('7.3', 1, 'The SN2 mechanism proceeds:', 'In one concerted step', ['In two steps through a carbocation', 'In three steps', 'Through a radical'], 'Bond formation and bond breaking occur at the same time.')
    b.mc('7.3', 2, 'From which direction does the nucleophile attack in an SN2 reaction?', 'From the side opposite the leaving group (back-side attack)', ['From the same side as the leaving group', 'From either side equally', 'In the plane of the molecule'], 'The nucleophile attacks the σ* orbital opposite the leaving group.')
    b.mc('7.3', 2, 'What is the stereochemical outcome of an SN2 reaction at a chirality center?', 'Inversion of configuration', ['Retention of configuration', 'Racemization', 'No change'], 'The three other groups flip like an umbrella in the wind.')
    b.mc('7.3', 2, 'Which substrate reacts fastest by SN2?', 'Methyl bromide', ['Isopropyl bromide', 'tert-Butyl bromide', 'Neopentyl bromide'], 'Less steric hindrance means faster SN2.')
    b.mc('7.3', 3, 'Rank the alkyl bromides from fastest to slowest SN2: 1° , 2°, 3°, methyl.', 'Methyl > 1° > 2° > 3°', ['3° > 2° > 1° > methyl', '1° > methyl > 2° > 3°', 'Methyl > 2° > 1° > 3°'], 'Steric hindrance slows the back-side attack.')
    p = 'C[C@H](Br)CC'
    inv = cip('C[C@@H](O)CC')[0]
    ret = cip('C[C@H](O)CC')[0]
    b.mc('7.3', 3, f'The ({cip(p)[0]})-2-bromobutane shown reacts with NaOH in an SN2 reaction. What is the configuration of the butan-2-ol formed?', inv, [ret, 'Racemic mixture', 'No reaction'], 'SN2 inverts the configuration; here the priority order is unchanged so the label flips.', img=R(p, None, top=['NaOH'], bottom=[]))
    b.mc('7.3', 3, 'In the SN2 reaction of 1-bromobutane with NaCN, what is the product?', 'Pentanenitrile', ['Butanenitrile', 'Pent-1-ene', 'Butan-1-ol'], 'Cyanide replaces bromine, adding one carbon.', img=R('CCCCBr', None, top=['NaCN'], bottom=[]))
    b.mc('7.3', 4, 'Which factor does NOT speed up an SN2 reaction?', 'Making the substrate more substituted at the reacting carbon', ['A better leaving group', 'A stronger nucleophile', 'A less hindered substrate'], 'More substituents block the back-side attack.')
    # ------------------------------------------------------------ 7.4 Nucleophilicity
    b.mc('7.4', 1, 'Which is the stronger nucleophile in a polar protic solvent: I⁻ or F⁻?', 'I⁻', ['F⁻', 'They are equal', 'Neither is a nucleophile'], 'In protic solvents the small anion is held tightly by hydrogen bonds; the larger iodide is more polarizable.')
    b.mc('7.4', 2, 'Which is the stronger nucleophile: CH₃O⁻ or CH₃OH?', 'CH₃O⁻', ['CH₃OH', 'They are equal', 'Neither'], 'A negatively charged species is generally a stronger nucleophile than its neutral conjugate acid.')
    b.mc('7.4', 2, 'Which reagent is both a strong nucleophile and a weak base?', 'I⁻', ['HO⁻', 'NaH', 't-BuOK'], 'Iodide is polarizable and the conjugate base of a strong acid.')
    b.mc('7.4', 3, 'Which reagent is a strong base but a poor nucleophile because of its size?', 'Potassium tert-butoxide', ['Sodium iodide', 'Sodium cyanide', 'Sodium azide'], 'The bulky tert-butoxide cannot easily attack carbon but can remove a proton.')
    # ------------------------------------------------------------ 7.5 E2
    b.mc('7.5', 1, 'What does E2 stand for?', 'Elimination, bimolecular', ['Elimination, unimolecular', 'Electrophilic, two-step', 'Equilibrium, two-step'], 'The rate depends on both the substrate and the base.')
    b.mc('7.5', 2, 'In an E2 reaction, which pattern of arrows applies?', 'Proton transfer and loss of the leaving group at the same time', ['Nucleophilic attack and carbocation rearrangement', 'Loss of a leaving group only', 'Two separate steps'], 'The base removes a β hydrogen as the leaving group leaves.')
    b.mc('7.5', 3, 'In E2, the β hydrogen and the leaving group must be:', 'Anti-coplanar', ['Gauche', 'Eclipsed', 'On the same side'], 'Anti-coplanar alignment allows the orbitals to overlap in the transition state.')
    b.mc('7.5', 3, 'What is the major organic product of 2-bromopropane with sodium ethoxide in ethanol (heat)?', 'Propene', ['Propan-2-ol', 'Ethyl isopropyl ether', 'Propane'], 'A strong base with a secondary halide favors E2.', img=R('CC(C)Br', None, top=['NaOEt, EtOH'], bottom=['heat']))
    # ------------------------------------------------------------ 7.6 Alkene stability
    b.mc('7.6', 1, 'Which alkene is most stable?', 'The most substituted alkene', ['The least substituted alkene', 'A terminal alkene', 'A cis alkene'], 'Hyperconjugation stabilises substituted alkenes.')
    b.mc('7.6', 2, 'Which is the most stable alkene?', '2-Methylbut-2-ene', ['2-Methylbut-1-ene', '3-Methylbut-1-ene', 'Pent-1-ene'], 'The trisubstituted alkene is more stable than the di- or monosubstituted ones.')
    b.mc('7.6', 3, 'Which is more stable: cis- or trans-but-2-ene, and why?', 'trans, because the methyl groups are farther apart and there is less steric strain', ['cis, because the dipole is larger', 'They are equally stable', 'cis, because of hydrogen bonding'], 'Steric strain destabilizes the cis isomer.')
    b.mc('7.6', 3, 'Which cycloalkene is least able to contain a trans double bond?', 'Cyclohexene', ['Cyclodecene', 'Cyclooctene', 'Cyclododecene'], 'A trans double bond in a small ring would be too strained.')
    # ------------------------------------------------------------ 7.7 Regio and stereo
    b.mc('7.7', 2, 'In an E2 reaction of 2-bromo-2-methylbutane with sodium ethoxide, the major product is:', '2-Methylbut-2-ene', ['2-Methylbut-1-ene', 'tert-Pentyl ethyl ether', '2-Methylbutan-2-ol'], 'The Zaitsev (more substituted) alkene is favored with a small base.', img=R('CCC(C)(C)Br', None, top=['NaOEt'], bottom=['heat']))
    b.mc('7.7', 3, 'Using potassium tert-butoxide instead of ethoxide on 2-bromo-2-methylbutane gives mostly:', '2-Methylbut-1-ene', ['2-Methylbut-2-ene', 'tert-Pentyl tert-butyl ether', '2-Methylbutan-2-ol'], 'A bulky base removes the less hindered β proton, giving the less substituted (Hofmann) alkene.', img=R('CCC(C)(C)Br', None, top=['t-BuOK'], bottom=['heat']))
    b.mc('7.7', 3, 'An E2 reaction produces a new stereogenic alkene. Which isomer is typically major?', 'The trans (E) isomer', ['The cis (Z) isomer', 'A 1:1 mixture', 'Neither'], 'The more stable alkene forms faster.')
    b.mc('7.7', 4, 'Which β hydrogens of a cyclohexyl bromide can undergo E2 elimination?', 'Only those anti-coplanar to the bromine (axial-axial)', ['Any β hydrogen', 'Only equatorial hydrogens', 'Only hydrogens on the same face as Br'], 'In a chair, the leaving group and the hydrogen must both be axial.')
    # ------------------------------------------------------------ 7.8 SN1 / E1
    b.mc('7.8', 1, 'What does SN1 stand for?', 'Substitution, nucleophilic, unimolecular', ['Substitution, nucleophilic, bimolecular', 'Single nucleophile, one step', 'Substitution, neutral, one-step'], 'The slow step involves only the substrate.')
    b.mc('7.8', 2, 'In an SN1 reaction, the rate-determining step is:', 'Loss of the leaving group to give a carbocation', ['Attack of the nucleophile', 'Proton transfer', 'Loss of a proton'], 'The first step has the highest barrier.')
    b.mc('7.8', 2, 'Which substrate reacts fastest by SN1?', 'tert-Butyl bromide', ['Isopropyl bromide', 'Ethyl bromide', 'Methyl bromide'], 'A tertiary carbocation is the most stable.')
    b.mc('7.8', 3, 'A chirality center undergoes SN1 substitution. The product is typically:', 'A mixture of enantiomers (racemic)', ['Pure inversion', 'Pure retention', 'No product'], 'The planar carbocation can be attacked from either face.')
    b.mc('7.8', 3, 'Which species is an intermediate in E1 and SN1 reactions?', 'A carbocation', ['A carbanion', 'A radical', 'A carbene'], 'Both mechanisms start with loss of the leaving group.')
    # ------------------------------------------------------------ 7.9 Predicting
    b.mc('7.9', 2, 'A tertiary alkyl halide with a strong base (NaOEt) gives mainly:', 'E2 elimination', ['SN2 substitution', 'SN1 substitution', 'No reaction'], 'A strong base with a hindered substrate favors elimination.')
    b.mc('7.9', 2, 'A primary alkyl halide with a strong nucleophile that is a weak base (NaCN) gives mainly:', 'SN2 substitution', ['E2 elimination', 'SN1 substitution', 'E1 elimination'], 'Unhindered substrate plus good nucleophile gives SN2.')
    b.mc('7.9', 3, 'A tertiary alkyl halide in warm ethanol (no strong base) gives:', 'A mixture of SN1 and E1 products', ['Only SN2 product', 'Only E2 product', 'No reaction'], 'The solvent is a weak nucleophile and weak base.')
    b.mc('7.9', 3, 'Which conditions favor E2 over SN2 for a secondary alkyl halide?', 'A strong, bulky base and heat', ['A weak base, room temperature', 'A good nucleophile that is a weak base', 'A polar protic solvent with no base'], 'Heat and strong or bulky bases favor elimination.')
    b.mc('7.9', 4, 'Which substrate/reagent pair gives mainly the SN2 product?', 'CH₃CH₂CH₂Br with NaN₃', ['(CH₃)₃CBr with NaOEt', '(CH₃)₂CHBr with t-BuOK, heat', '(CH₃)₃CBr in ethanol'], 'Only the primary halide with a nucleophile that is a weak base gives SN2.')
    # ------------------------------------------------------------ 7.10 - 7.12
    b.mc('7.10', 2, 'Why is the OH group of an alcohol a poor leaving group?', 'HO⁻ is a strong base', ['HO⁻ is too large', 'It has no lone pairs', 'It is not polar'], 'Strong bases are poor leaving groups.')
    b.mc('7.10', 3, 'What converts an alcohol into a good leaving group for substitution?', 'Protonation with a strong acid or conversion to a tosylate', ['Treating it with NaOH', 'Treating it with a base only', 'Reducing it'], 'Water (after protonation) and TsO⁻ are good leaving groups.')
    b.mc('7.11', 3, 'To convert 1-bromobutane into butan-1-ol with high yield, which reagent is best?', 'NaOH in a polar solvent (SN2)', ['t-BuOK', 'H₂O, heat', 'HBr'], 'A primary halide with a good nucleophile gives SN2.')
    b.mc('7.11', 4, 'To make 2-methylbut-1-ene from 2-bromo-2-methylbutane the best reagent is:', 'Potassium tert-butoxide', ['Sodium ethoxide', 'Water', 'Sodium iodide'], 'A bulky base gives the Hofmann product.')
    b.mc('7.12', 1, 'Which is a polar protic solvent?', 'Ethanol', ['Acetone', 'DMSO', 'DMF'], 'Protic solvents have an O-H or N-H group.')
    b.mc('7.12', 2, 'SN2 reactions are generally fastest in:', 'Polar aprotic solvents', ['Polar protic solvents', 'Nonpolar solvents', 'Water only'], 'Aprotic solvents do not hydrogen-bond to the nucleophile.')
    b.mc('7.12', 3, 'Which solvent favors SN1 reactions by stabilizing the carbocation and leaving group?', 'A polar protic solvent', ['A nonpolar solvent', 'A polar aprotic solvent', 'Hexane'], 'Protic solvents solvate ions through hydrogen bonding and ion-dipole interactions.')

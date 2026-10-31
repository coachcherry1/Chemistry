"""Chapter 4: Alkanes and Cycloalkanes (40 new multiple choice + 50 free response; 10 naming multiple choice already exist)."""
import re
from qb import *

FH = [(90, 'H'), (210, 'H'), (330, 'H')]
FM = [(90, 'CH₃'), (210, 'H'), (330, 'H')]
ST = [(270, 'H'), (30, 'H'), (150, 'H')]                     # staggered back carbon of ethane
EC = [(90, 'H'), (210, 'H'), (330, 'H')]                     # eclipsed
ANTI = [(270, 'CH₃'), (30, 'H'), (150, 'H')]
GAUCHE = [(30, 'CH₃'), (150, 'H'), (270, 'H')]
ECL = [(210, 'CH₃'), (330, 'H'), (90, 'H')]                  # CH3 eclipses H
TOT = [(90, 'CH₃'), (210, 'H'), (330, 'H')]                  # CH3 eclipses CH3


def parent(smi):
    return re.search(r'(meth|eth|prop|but|pent|hex|hept|oct|non|dec)ane$', nm(smi)).group(0)


def build(b):
    # ------------------------------------------------------------ 4.1 Introduction to alkanes
    b.mc('4.1', 1, 'What is the general molecular formula of an acyclic alkane with n carbon atoms?', 'CₙH₂ₙ₊₂', ['CₙH₂ₙ', 'CₙH₂ₙ₋₂', 'CₙHₙ'], 'Saturated acyclic hydrocarbons have two hydrogens per carbon plus two more at the chain ends.')
    b.mc('4.1', 2, 'Which compound is a saturated hydrocarbon?', 'CC(C)C', ['C=CCC', 'C#CC', 'C1=CCC1'], 'A saturated hydrocarbon has no π bonds; the others contain C=C or C≡C bonds.', oimg=True)
    b.fr('4.1', 1, 'Give the molecular formula of the unbranched alkane that has eight carbon atoms.', 'C₈H₁₈ (octane).', 'CₙH₂ₙ₊₂ with n = 8.')
    b.fr('4.1', 2, 'How many hydrogen atoms does cyclohexane have, and why is this two fewer than hexane?', 'Cyclohexane is C₆H₁₂. Closing the ring removes one hydrogen from each end carbon (two hydrogens in total).', 'Cycloalkanes have the formula CₙH₂ₙ.')
    # ------------------------------------------------------------ 4.2 Nomenclature
    b.mc('4.2', 1, 'What is the IUPAC parent name for an unbranched chain of six carbon atoms?', 'Hexane', ['Pentane', 'Heptane', 'Butane'], 'The prefixes are meth-, eth-, prop-, but-, pent-, hex-, hept-, oct-, non-, dec-.')
    s1 = 'CC(C)CC(CCC)CC'
    b.mc('4.2', 2, 'What is the parent chain (longest chain) of the compound shown?', parent(s1).capitalize(), [p.capitalize() for p in ('pentane', 'octane', 'hexane') if p != parent(s1)][:3] + (['Nonane'] if len([p for p in ('pentane', 'octane', 'hexane') if p != parent(s1)]) < 3 else []),
         'Find the longest continuous chain of carbons, not just the one drawn horizontally.', img=S(s1))
    b.mcname('4.2', 2, 'What is the IUPAC name of the compound shown?', 'CC(C)CC(C)C', ['3,5-dimethylpentane', '2,4-dimethylbutane', '2,4-dimethylhexane'], 'Five-carbon parent; numbering from either end gives 2,4.')
    b.mcname('4.2', 3, 'What is the IUPAC name of the compound shown?', 'CCC(C)C(C)(C)C', ['2,2,3-trimethylbutane', '2,3,3-trimethylpentane', '2,2,4-trimethylpentane'], 'Pentane parent; the lowest locant set is 2,2,3.')
    b.mcring('4.2', 1, 'What is the IUPAC name of the compound shown?', 'CC1CCCCC1', 'methylcyclohexane', ['ethylcyclohexane', 'methylcyclopentane', 'cycloheptane'], 'A six-membered ring with one methyl group.')
    b.mcring('4.2', 2, 'What is the IUPAC name of the compound shown?', 'CC1CCCCC1C', '1,2-dimethylcyclohexane', ['1,3-dimethylcyclohexane', '1,4-dimethylcyclohexane', '1,1-dimethylcyclohexane'], 'Number so the substituents get the lowest locants: 1,2.')
    b.mcring('4.2', 3, 'What is the IUPAC name of the compound shown?', 'CCC1CCCCC1C', '1-ethyl-2-methylcyclohexane', ['1-ethyl-3-methylcyclohexane', '1-ethyl-4-methylcyclohexane', '1-ethyl-1-methylcyclohexane'], 'The locants are 1,2 either way; alphabetical order gives ethyl the lower number.')
    rs = 'CC(C)CC(CC)CC'
    b.mcstruct('4.2', 3, 'Which structure is 4-ethyl-2-methylhexane?', rs, ['CC(C)CC(C)CC', 'CCC(C)CC(C)CC', 'CC(C)C(CC)CCC'], 'Hexane chain with a methyl on carbon 2 and an ethyl on carbon 4.')
    sn = lambda smi: nm(smi)
    b.fr('4.2', 1, 'Name the straight-chain alkane with seven carbon atoms.', 'Heptane.', 'hept- is the prefix for seven.')
    for smi, d in (('CC(C)CCCC', 2), ('CCC(C)CCCC', 2), ('CC(C)(C)CCC', 2), ('CC(C)C(C)(C)CCC', 3), ('CCC(CC)C(C)CC', 3)):
        b.fr('4.2', d, 'Give the IUPAC name of the compound shown.', sn(smi) + '.', 'Longest chain, lowest locants, substituents in alphabetical order.', img=S(smi))
    b.fr('4.2', 2, 'Give the IUPAC name of the compound shown.', '1,4-dimethylcyclohexane.', 'The ring is the parent; number to give the lowest locants.', img=S('CC1CCC(C)CC1'))
    assert nm('CCCC(CC)C(C)(C)C') == '3-ethyl-2,2-dimethylhexane'
    b.name_true += [('CC1CCC(C)CC1', '1,4-dimethylcyclohexane')]
    b.fr('4.2', 3, 'Draw 3-ethyl-2,2-dimethylhexane.', 'A six-carbon chain with two methyl groups on carbon 2 and an ethyl group on carbon 3.', 'Draw the parent chain first, then attach the substituents at the stated carbons.', aimg=S('CCCC(CC)C(C)(C)C'))
    assert nm('CC(C)C(C)C') == '2,3-dimethylbutane'
    b.fr('4.2', 2, 'Draw 2,3-dimethylbutane.', 'A four-carbon chain with a methyl group on each of carbons 2 and 3.', 'Butane parent with two methyl substituents.', aimg=S('CC(C)C(C)C'))
    b.fr('4.2', 1, 'What are the names of the substituents -CH(CH₃)₂ and -C(CH₃)₃?', 'Isopropyl and tert-butyl.', 'These common names for complex substituents are accepted by IUPAC.', img=S('CC(C)C', 'CC(C)(C)C', labels='I II'))
    b.fr('4.2', 3, 'A student names the compound shown 2-ethylbutane. Explain the mistake and give the correct name.', 'The longest chain has five carbons, not four. The correct name is 3-methylpentane.', 'Always choose the longest continuous chain as the parent.', img=S('CCC(C)CC'))
    # ------------------------------------------------------------ 4.3 Constitutional isomers
    b.mc('4.3', 2, 'How many constitutional isomers does pentane (C₅H₁₂) have?', '3', ['2', '4', '5'], 'Pentane, 2-methylbutane and 2,2-dimethylpropane.')
    b.mc('4.3', 2, 'Which pair are constitutional isomers?', 'Butane and 2-methylpropane', ['Propane and butane', 'Ethanol and ethane', 'Cyclohexane and hexane'], 'Both are C₄H₁₀ with different connectivity; the others differ in molecular formula.')
    b.fr('4.3', 2, 'Draw all constitutional isomers of C₅H₁₂ and name them.', 'Pentane, 2-methylbutane and 2,2-dimethylpropane.', 'Vary the longest chain: five carbons, four carbons plus a methyl, three carbons plus two methyls.', aimg=S('CCCCC', 'CC(C)CC', 'CC(C)(C)C', labels='I II III'))
    b.fr('4.3', 3, 'Draw all five constitutional isomers of C₆H₁₄.', 'Hexane, 2-methylpentane, 3-methylpentane, 2,2-dimethylbutane and 2,3-dimethylbutane.', 'Work systematically from the longest chain downward and avoid drawing the same compound twice.', aimg=S('CCCCCC', 'CC(C)CCC', 'CCC(C)CC', 'CC(C)(C)CC', 'CC(C)C(C)C'))
    b.fr('4.3', 2, 'Are the two drawings the same compound? Explain.', 'Yes. Both are a four-carbon chain with a methyl group on carbon 2 (2-methylbutane); numbering from the other end only changes how it is drawn.', 'Compare the connectivity, not the orientation.', img=S('CC(C)CC', 'CCC(C)C', labels='I II'))
    # ------------------------------------------------------------ 4.4 Relative stability of isomeric alkanes
    b.mc('4.4', 2, 'Two isomeric alkanes are burned. The isomer with the smaller heat of combustion is:', 'More stable', ['Less stable', 'The one with more carbon atoms', 'The one with fewer hydrogen atoms'], 'Less energy released means the starting alkane was already lower in energy.')
    b.mc('4.4', 2, 'Compared with their unbranched isomers, branched alkanes are generally:', 'More stable, with lower heats of combustion', ['Less stable, with higher heats of combustion', 'Equal in stability', 'More stable, with higher heats of combustion'], 'Branching lowers the energy of an alkane.')
    b.fr('4.4', 1, 'Define the heat of combustion of an alkane.', 'The heat released (-ΔH°) when one mole of the alkane burns completely in oxygen.', 'It can be measured and used to compare isomers.')
    b.fr('4.4', 3, 'Octane and 2,2,3,3-tetramethylbutane are isomers (C₈H₁₈). Which has the smaller heat of combustion? Explain.', '2,2,3,3-Tetramethylbutane, because the more highly branched isomer is more stable and releases less heat.', 'Both give the same products, so differences in heat come from differences in starting energy.', img=S('CCCCCCCC', 'CC(C)(C)C(C)(C)C', labels='I II'))
    # ------------------------------------------------------------ 4.5 Sources and uses of alkanes
    b.mc('4.5', 1, 'What process separates crude oil into fractions?', 'Fractional distillation', ['Cracking', 'Reforming', 'Hydrogenation'], 'Fractions are separated by differences in boiling point.')
    b.mc('4.5', 2, 'Which process converts straight-chain alkanes into branched and aromatic hydrocarbons that reduce knocking?', 'Reforming', ['Cracking', 'Fractional distillation', 'Combustion'], 'Cracking breaks large alkanes into smaller ones; reforming rearranges them.')
    b.fr('4.5', 2, 'Distinguish cracking from reforming.', 'Cracking breaks C-C bonds of large alkanes to make smaller alkanes suitable for gasoline. Reforming converts straight-chain alkanes into branched and aromatic hydrocarbons that burn more smoothly.', 'Both improve the yield and quality of gasoline.')
    b.fr('4.5', 1, 'Why do petroleum fractions come off a distillation tower at different temperatures?', 'They have different boiling points, and boiling points increase with molecular size.', 'Larger alkanes have stronger dispersion forces.')
    # ------------------------------------------------------------ 4.6 Drawing Newman projections
    b.mc('4.6', 1, 'In a Newman projection, what does the circle represent?', 'The back carbon, with its bonds starting at the circle', ['The front carbon', 'A double bond', 'The center of the molecule'], 'The front carbon is the point where the front bonds meet; the circle is the back carbon.', img=NW(FM, ANTI))
    b.mc('4.6', 2, 'What kind of conformation of ethane is shown?', 'Staggered', ['Eclipsed', 'Planar', 'Twist'], 'The front and back C-H bonds are 60° apart.', img=NW(FH, ST))
    b.mc('4.6', 3, 'This Newman projection looks down the C2-C3 bond of butane. What is the conformation?', 'Anti', ['Gauche', 'Eclipsed', 'Totally eclipsed'], 'The two CH₃ groups are 180° apart.', img=NW(FM, ANTI))
    b.fr('4.6', 2, 'Draw a staggered Newman projection of ethane.', 'The front carbon has three C-H bonds meeting at the center; the back carbon (a circle) has three C-H bonds placed between the front bonds.', 'Staggered means the groups are 60° apart.', aimg=NW(FH, ST))
    b.fr('4.6', 2, 'How do you read a Newman projection?', 'You look straight down one C-C bond. The front carbon is the point where three bonds meet and the back carbon is the circle with three bonds starting at its edge.', 'The two carbons are one behind the other.')
    b.fr('4.6', 3, 'Draw a staggered Newman projection of propane looking down the C1-C2 bond, with the methyl group of C2 on the back carbon.', 'The front carbon (C1) shows three hydrogens; the back carbon (C2) shows CH₃ and two hydrogens, each between front bonds.', 'C2 carries the CH₃ group.', aimg=NW(FH, [(270, 'CH₃'), (30, 'H'), (150, 'H')]))
    # ------------------------------------------------------------ 4.7 Conformational analysis of ethane and propane
    b.mc('4.7', 1, 'Which conformation of ethane is lower in energy?', 'Staggered', ['Eclipsed', 'They are equal', 'It depends on temperature only'], 'Staggered C-H bonds are farthest apart.')
    b.mc('4.7', 2, 'The energy cost of eclipsing in ethane is called:', 'Torsional strain', ['Angle strain', 'Steric strain', 'Resonance'], 'Torsional strain comes from eclipsing interactions between bonds.')
    b.mc('4.7', 3, 'How does the torsional strain of propane (eclipsed) compare with that of ethane?', 'Slightly larger, because a C-H bond eclipses a C-CH₃ bond', ['Much smaller', 'Exactly the same', 'Zero, because propane is branched'], 'The extra methyl group adds a small amount of strain to the eclipsed form.')
    b.fr('4.7', 2, 'Sketch the energy diagram for one full 360° rotation about the C-C bond of ethane. How many maxima and minima does it have?', 'Three minima (staggered) and three maxima (eclipsed), repeating every 60°.', 'Staggered and eclipsed conformations alternate every 60°.')
    b.fr('4.7', 2, 'What is the dihedral angle between a front group and the nearest back group in a staggered conformation and in an eclipsed conformation?', 'Staggered: 60°. Eclipsed: 0°.', 'The dihedral (torsional) angle measures the relative position of front and back groups.')
    b.fr('4.7', 2, 'Define torsional strain.', 'The increase in energy of a molecule caused by eclipsing interactions between bonds on adjacent atoms.', 'It is largest when the dihedral angle is zero.')
    b.fr('4.7', 3, 'Why are all three staggered conformations of ethane equal in energy?', 'Each carbon has three identical hydrogens, so rotating by 120° gives an arrangement that is indistinguishable from the first (they are degenerate).', 'Equivalent structures have identical energy.')
    # ------------------------------------------------------------ 4.8 Conformational analysis of butane
    b.mc('4.8', 2, 'Which Newman projection shows the most stable conformation of butane (looking down the C2-C3 bond)?', NW(FM, ANTI), [NW(FM, GAUCHE), NW(FM, ECL), NW(FM, TOT)], 'The anti conformation keeps the two CH₃ groups as far apart as possible (180°).', oimg=True)
    b.mc('4.8', 2, 'Which conformation of butane is the highest in energy?', 'The one in which the two CH₃ groups eclipse each other', ['The anti conformation', 'The gauche conformation', 'A staggered conformation'], 'Eclipsing of the two methyl groups gives both torsional and steric strain.')
    b.mc('4.8', 3, 'Why is the gauche conformation of butane higher in energy than the anti conformation?', 'Steric strain: the two CH₃ groups are only 60° apart and crowd each other', ['Torsional strain from eclipsed bonds', 'Angle strain at carbon', 'The gauche form has an extra bond'], 'Both are staggered, so the difference is the van der Waals crowding of the methyl groups.')
    b.mc('4.8', 3, 'Which list orders the butane conformations from lowest to highest energy?', 'Anti < gauche < eclipsed (CH₃/H) < totally eclipsed (CH₃/CH₃)', ['Gauche < anti < eclipsed < totally eclipsed', 'Anti < eclipsed < gauche < totally eclipsed', 'Eclipsed < gauche < anti < totally eclipsed'], 'Staggered forms are below eclipsed forms, and anti is the best staggered form.')
    b.fr('4.8', 2, 'Draw the anti conformation of butane as a Newman projection looking down C2-C3.', 'Front carbon: CH₃ at the top and two H; back carbon: CH₃ at the bottom (180° from the front CH₃) and two H.', 'Anti means the dihedral angle between the methyl groups is 180°.', aimg=NW(FM, ANTI))
    b.fr('4.8', 2, 'Draw the gauche conformation of butane as a Newman projection looking down C2-C3.', 'The two CH₃ groups are 60° apart (both staggered).', 'Gauche means the dihedral angle between the methyl groups is 60°.', aimg=NW(FM, GAUCHE))
    b.fr('4.8', 3, 'List the four main conformations of butane from lowest to highest energy and explain the order.', 'Anti, gauche, eclipsed (CH₃ eclipsing H) and totally eclipsed (CH₃ eclipsing CH₃). Staggered forms avoid torsional strain; anti also avoids steric crowding; the totally eclipsed form has the most strain.', 'Torsional and steric strain both contribute.', img=S('CCCC'))
    b.fr('4.8', 3, 'What type of strain is present in the gauche conformation but absent in the anti conformation?', 'Steric strain, from the two methyl groups being close together.', 'Gauche is staggered, so there is no torsional strain.')
    # ------------------------------------------------------------ 4.9 Cycloalkanes
    b.mc('4.9', 1, 'What is the general formula for a cycloalkane with one ring?', 'CₙH₂ₙ', ['CₙH₂ₙ₊₂', 'CₙH₂ₙ₋₂', 'CₙHₙ'], 'Forming the ring removes two hydrogens from CₙH₂ₙ₊₂.')
    b.mc('4.9', 2, 'Which ring would have the most angle strain if it were planar?', 'Cyclopropane', ['Cyclopentane', 'Cyclohexane', 'Cycloheptane'], 'Its 60° bond angles deviate most from the tetrahedral 109.5°.')
    b.fr('4.9', 2, 'Why does cyclopropane suffer from angle strain?', 'Its C-C-C bond angles are 60°, far from the ideal 109.5° of sp³ carbon.', 'The carbons of a three-membered ring are forced into a triangle.', img=S('C1CC1'))
    b.mcring('4.9', 1, 'What is the IUPAC name of the compound shown?', 'CCC1CCC1', 'ethylcyclobutane', ['methylcyclobutane', 'ethylcyclopropane', 'propylcyclobutane'], 'A four-membered ring bearing one ethyl group.') if False else None
    b.name_true += [('CCC1CCC1', 'ethylcyclobutane')]
    b.fr('4.9', 1, 'Draw ethylcyclobutane.', 'A four-membered ring bearing an ethyl substituent.', 'Cyclobutane is the parent.', aimg=S('CCC1CCC1'))
    b.fr('4.9', 3, 'A planar cyclohexane would have 120° bond angles. Explain why real cyclohexane is not planar.', 'It puckers into a chair conformation, which has nearly tetrahedral (109.5°) angles and staggered bonds, relieving angle and torsional strain.', 'A planar ring would be strained in both ways.')
    # ------------------------------------------------------------ 4.10 Conformations of cyclohexane
    b.mc('4.10', 1, 'Which conformation of cyclohexane is the most stable?', 'Chair', ['Boat', 'Twist-boat', 'Half-chair'], 'The chair has tetrahedral angles and all bonds staggered.')
    b.mc('4.10', 2, 'Which order of cyclohexane conformations is from lowest to highest energy?', 'Chair < twist-boat < boat < half-chair', ['Boat < chair < twist-boat < half-chair', 'Twist-boat < chair < boat < half-chair', 'Chair < boat < twist-boat < half-chair'], 'The chair is the global minimum and the half-chair is the highest-energy transition-state-like form.')
    b.mc('4.10', 2, 'The C-C-C bond angles in the chair conformation of cyclohexane are approximately:', '109.5°', ['120°', '90°', '60°'], 'The chair is essentially free of angle strain.', img=CH())
    b.fr('4.10', 2, 'Explain why the chair conformation has no significant angle or torsional strain.', 'Its bond angles are close to 109.5° and all neighbouring C-H and C-C bonds are staggered.', 'Look at the Newman projection down any ring C-C bond.')
    b.fr('4.10', 2, 'Why is the boat conformation higher in energy than the chair?', 'The boat has eclipsing interactions along its sides and the two flagpole hydrogens crowd each other.', 'Both torsional and steric strain are present.')
    b.fr('4.10', 3, 'How many axial and how many equatorial hydrogens does the chair of cyclohexane have?', 'Six axial and six equatorial hydrogens (one of each on every carbon).', 'Each ring carbon has two hydrogens, one axial and one equatorial.', img=CH(numbers=True))
    # ------------------------------------------------------------ 4.11 Drawing chair conformations
    b.mc('4.11', 2, 'Is the CH₃ group in this chair axial or equatorial?', 'Axial', ['Equatorial', 'Planar', 'Gauche'], 'It points straight up, parallel to the ring axis.', img=CH([(1, 'up', 'CH₃')]))
    b.mc('4.11', 2, 'Is the chlorine in this chair axial or equatorial?', 'Equatorial', ['Axial', 'Planar', 'Eclipsed'], 'It points outward from the ring, roughly parallel to the ring bonds one carbon away.', img=CH([(2, 'up', 'Cl')]))
    b.fr('4.11', 2, 'How can you recognize the axial bonds in a drawing of a chair?', 'Axial bonds are vertical (parallel to the ring axis) and alternate up and down on adjacent carbons.', 'Equatorial bonds point outward, roughly in the plane of the ring.', img=CH([(1, 'up', 'H'), (2, 'down', 'H'), (3, 'up', 'H')]))
    b.fr('4.11', 3, 'Draw the chair that results from a ring flip of the conformation shown. Is the CH₃ now axial or equatorial?', 'After the ring flip the CH₃ group is equatorial.', 'A ring flip turns every axial group into an equatorial one and vice versa.', img=CH([(1, 'up', 'CH₃')]), aimg=CH([(1, 'up', 'CH₃')], flipped=True))
    b.fr('4.11', 2, 'How do axial bonds on adjacent carbons of a chair point?', 'In opposite directions: if one axial bond is up, the next is down.', 'Axial bonds alternate up and down around the ring.')
    # ------------------------------------------------------------ 4.12 Monosubstituted cyclohexane
    b.mc('4.12', 2, 'Which chair of methylcyclohexane is more stable?', 'The right chair, with CH₃ equatorial', ['The left chair, with CH₃ axial', 'Both are equally stable', 'Neither; the boat is more stable'], 'An axial CH₃ crowds the axial hydrogens on carbons 3 and 5.', img=CF([(1, 'up', 'CH₃')]))
    b.mc('4.12', 2, 'The steric interaction between an axial substituent and the axial hydrogens on carbons 3 and 5 is called:', 'A 1,3-diaxial interaction', ['A gauche interaction in a chain', 'Angle strain', 'Resonance repulsion'], 'The axial group points into the same face as the axial hydrogens two carbons away.')
    b.fr('4.12', 2, 'Why does a substituent prefer the equatorial position on a cyclohexane chair?', 'In the axial position it suffers 1,3-diaxial interactions with the axial hydrogens on the same face of the ring; the equatorial position points away from the ring and avoids them.', 'Compare the number of gauche-type interactions.', img=CF([(1, 'up', 'CH₃')]))
    b.fr('4.12', 3, 'Which has the larger preference for the equatorial position, CH₃ or C(CH₃)₃? Explain.', 'C(CH₃)₃, because the bulky tert-butyl group has much more severe 1,3-diaxial interactions than CH₃.', 'The larger the group, the greater the strain when axial.')
    b.fr('4.12', 3, 'In methylcyclohexane, about how much more strained is the axial chair than the equatorial chair, and where does the strain come from?', 'About 7.6 kJ/mol: two gauche-butane-type interactions (about 3.8 kJ/mol each) between the axial CH₃ and the axial hydrogens on carbons 3 and 5.', 'Each 1,3-diaxial CH₃/H interaction resembles one gauche interaction in butane.')
    # ------------------------------------------------------------ 4.13 Disubstituted cyclohexane
    b.mc('4.13', 3, 'Which conformation of cis-1,3-dimethylcyclohexane is more stable?', 'The right chair, with both CH₃ groups equatorial', ['The left chair, with both CH₃ groups axial', 'They are equal in energy', 'Neither chair; only the boat exists'], 'The diaxial chair has a severe CH₃/CH₃ 1,3-diaxial interaction.', img=CF([(1, 'up', 'CH₃'), (3, 'up', 'CH₃')]))
    b.mc('4.13', 3, 'Which isomer can exist in a chair with both substituents equatorial?', 'trans-1,4-Dimethylcyclohexane', ['cis-1,2-Dimethylcyclohexane', 'trans-1,3-Dimethylcyclohexane', 'cis-1,4-Dimethylcyclohexane'], 'The others have one axial and one equatorial group in each chair.')
    b.fr('4.13', 2, 'Draw both chair conformations of trans-1,4-dimethylcyclohexane and state which is more stable.', 'One chair has both CH₃ groups axial and the other has both equatorial; the diequatorial chair is more stable.', 'Trans-1,4 substituents are both axial or both equatorial.', aimg=CF([(1, 'up', 'CH₃'), (4, 'down', 'CH₃')]))
    b.fr('4.13', 3, 'Describe the two chair conformations of cis-1,2-dimethylcyclohexane. Which is more stable?', 'In each chair one CH₃ is axial and one is equatorial, so the two chairs have the same energy.', 'Cis-1,2 groups are always axial/equatorial.', aimg=CF([(1, 'up', 'CH₃'), (2, 'up', 'CH₃')]))
    b.fr('4.13', 3, 'Draw both chairs of cis-1,3-dimethylcyclohexane. Which interaction makes the diaxial chair very unstable?', 'The two axial CH₃ groups on the same face (carbons 1 and 3) interact strongly with each other (a CH₃/CH₃ 1,3-diaxial interaction), so the diequatorial chair is strongly preferred.', 'Cis-1,3 groups are both axial or both equatorial.', aimg=CF([(1, 'up', 'CH₃'), (3, 'up', 'CH₃')]))
    # ------------------------------------------------------------ 4.14 cis-trans stereoisomerism
    b.mc('4.14', 1, 'In cis-1,2-dimethylcyclohexane the two methyl groups are:', 'On the same face of the ring', ['On opposite faces of the ring', 'Both in the plane of the ring', 'Bonded to the same carbon'], 'Cis means same side; trans means opposite sides.')
    b.mc('4.14', 2, 'Can cis- and trans-1,3-dimethylcyclohexane interconvert by a ring flip?', 'No; they are different stereoisomers that can only interconvert by breaking bonds', ['Yes, by a ring flip', 'Yes, by rotating a C-C bond', 'Yes, at high temperature without breaking bonds'], 'A ring flip changes axial/equatorial, not the faces the groups are on.')
    cis_s, trans_s = ('C[C@H]1CCCC[C@@H]1C', 'C[C@H]1CCCC[C@H]1C')
    if cip(cis_s) != ['R', 'S']:
        cis_s, trans_s = trans_s, cis_s
    assert cip(cis_s) in (['R', 'S'], ['S', 'R']) and cip(trans_s) in (['R', 'R'], ['S', 'S'])
    b.fr('4.14', 2, 'Draw cis- and trans-1,2-dimethylcyclohexane using wedges and dashes.', 'In the cis isomer both methyl groups are on wedges (or both on dashes); in the trans isomer one is on a wedge and one is on a dash.', 'Same face is cis; opposite faces is trans.', aimg=S(cis_s, trans_s, labels='cis trans'))
    b.fr('4.14', 3, 'Why are cis and trans-1,2-dimethylcyclohexane stereoisomers rather than constitutional isomers?', 'They have the same connectivity but a different spatial arrangement, and they cannot interconvert without breaking bonds.', 'Constitutional isomers differ in connectivity.')
    # ------------------------------------------------------------ 4.15 Polycyclic systems
    b.mc('4.15', 2, 'Which prefix is used in the name of a compound that contains two rings sharing atoms?', 'Bicyclo', ['Dicyclo', 'Bi', 'Cyclo-di'], 'Bicycloalkanes are named with "bicyclo" and bracketed bridge lengths.')
    b.name_true += [('C1CCC2CCCCC2C1', 'bicyclo[4.4.0]decane')]
    b.fr('4.15', 3, 'Name the bicyclic compound shown (two fused six-membered rings, ten carbons).', 'Bicyclo[4.4.0]decane (decalin).', 'The bracket numbers give the carbons in each bridge between the bridgeheads: 4, 4 and 0.', img=S('C1CCC2CCCCC2C1'))
    b.fr('4.15', 2, 'How many carbons are in the bicyclic compound bicyclo[2.2.1]heptane, and what does the 1 in the brackets tell you?', 'Seven carbons (2 + 2 + 1 + the two bridgeheads). The 1 is the number of carbons in the shortest bridge between the bridgeheads.', 'Add the bridge numbers and the two bridgehead carbons: 2 + 2 + 1 + 2 = 7.')

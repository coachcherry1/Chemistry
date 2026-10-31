"""Chapter 5: Stereoisomerism (50 multiple choice + 50 free response)."""
from qb import *
from rdkit import Chem
from rdkit.Chem import rdCIPLabeler


def ez(smi):
    m = Chem.MolFromSmiles(smi)
    rdCIPLabeler.AssignCIPLabels(m)
    return [x.GetProp('_CIPCode') for x in m.GetBonds() if x.HasProp('_CIPCode')][0]


def mirror(smi):
    return smi.replace('@@', '#').replace('@', '@@').replace('#', '@')


def centres(smi):
    return len(Chem.FindMolChiralCenters(Chem.MolFromSmiles(smi), includeUnassigned=True, useLegacyImplementation=False))


def relation(a, b):
    ca, cb = Chem.CanonSmiles(a), Chem.CanonSmiles(b)
    if ca == cb:
        return 'identical'
    if Chem.CanonSmiles(mirror(a)) == cb:
        return 'enantiomers'
    return 'diastereomers'


def build(b):
    # ------------------------------------------------------------ 5.1 Isomers
    b.mc('5.1', 1, 'Which term describes two compounds with the same molecular formula but different connectivity of atoms?', 'Constitutional isomers', ['Stereoisomers', 'Enantiomers', 'Conformers'], 'Constitutional isomers differ in which atoms are bonded to which.')
    b.mc('5.1', 1, 'Which term describes two compounds with the same connectivity but a different spatial arrangement of atoms?', 'Stereoisomers', ['Constitutional isomers', 'Structural isomers', 'Functional isomers'], 'Same connectivity, different arrangement in space.')
    b.mc('5.1', 2, 'What is the relationship between the two compounds shown?', 'Constitutional isomers', ['Stereoisomers', 'Identical compounds', 'Different molecular formulas'],
         'Both are C₄H₁₀O, but the atoms are connected differently.', img=S('CCCCO', 'CC(C)(C)O', labels='A B'))
    b.mc('5.1', 2, 'What is the relationship between cis- and trans-but-2-ene?', 'Stereoisomers', ['Constitutional isomers', 'Identical compounds', 'Different molecular formulas'],
         'The atoms are connected in the same order; only the arrangement across the double bond differs.', img=S('C/C=C\\C', 'C/C=C/C', labels='cis trans'))
    # ------------------------------------------------------------ 5.2 Chirality centres
    b.mc('5.2', 1, 'What is a chirality center (stereocenter) in an organic compound?', 'A carbon bonded to four different groups', ['Any carbon with four bonds', 'A carbon in a double bond', 'Any carbon bonded to a heteroatom'], 'Four different groups make the mirror image nonsuperimposable.')
    b.mc('5.2', 1, 'A compound with one chirality center has how many stereoisomers?', 'Two', ['One', 'Three', 'Four'], 'The two stereoisomers are enantiomers of one another.')
    b.mc('5.2', 2, 'How many chirality centers are in the compound shown?', '1', ['0', '2', '3'], 'Only C2, bonded to H, OH, CH₃ and CH₂CH₃, has four different groups.', img=S('CC(O)CC'))
    b.mc('5.2', 2, 'Which compound contains a chirality center?', 'Butan-2-ol', ['Propan-2-ol', 'Butan-1-ol', '2-Methylpropan-2-ol'], 'In butan-2-ol, C2 bears H, OH, CH₃ and C₂H₅.')
    b.mc('5.2', 3, 'How many chirality centers are in the compound shown?', '2', ['1', '3', '4'], 'C2 and C3 each have four different groups.', img=S('CC(Cl)C(Br)CC'))
    # ------------------------------------------------------------ 5.3 R and S
    b.mc('5.3', 1, 'In the Cahn-Ingold-Prelog system, priorities are first assigned according to what?', 'Atomic number of the atoms directly attached to the center', ['Atomic mass', 'Size of the group', 'Number of carbons in the group'], 'Higher atomic number gets higher priority.')
    b.mc('5.3', 1, 'With priority 4 on a dash, going 1 → 2 → 3 clockwise gives which designation?', 'R', ['S', 'E', 'Z'], 'Clockwise is R (rectus) and counterclockwise is S (sinister).')
    b.mc('5.3', 2, 'Rank the groups on a chirality center from highest to lowest priority: -OH, -CH₃, -H, -NH₂.', '-OH > -NH₂ > -CH₃ > -H', ['-NH₂ > -OH > -CH₃ > -H', '-OH > -CH₃ > -NH₂ > -H', '-H > -CH₃ > -NH₂ > -OH'], 'Atomic numbers: O 8, N 7, C 6, H 1.')
    b.mc('5.3', 4, 'Which of the following is the correct priority order for -CH₂OH, -CH₃, -CH₂CH₃, -H?', '-CH₂OH > -CH₂CH₃ > -CH₃ > -H', ['-CH₂CH₃ > -CH₂OH > -CH₃ > -H', '-CH₃ > -CH₂CH₃ > -CH₂OH > -H', '-CH₂OH > -CH₃ > -CH₂CH₃ > -H'],
         'All three carbons tie at the first point; compare their substituents: (O,H,H) beats (C,H,H) beats (H,H,H).')
    # drawn molecules whose configuration is computed
    drawn = [('C[C@H](O)CC', 'butan-2-ol'), ('C[C@@H](O)CC', 'butan-2-ol'), ('C[C@H](Cl)CC', '2-chlorobutane'), ('C[C@@H](Br)CC', '2-bromobutane'),
             ('C[C@H](N)C(=O)O', 'alanine'), ('C[C@@H](N)C(=O)O', 'alanine'), ('C[C@H](O)C(=O)O', 'lactic acid'), ('C[C@@H](O)C(=O)O', 'lactic acid')]
    for k, (smi, nm_) in enumerate(drawn[:6]):
        c = cip(smi)[0]
        other = 'S' if c == 'R' else 'R'
        if k < 4:
            b.mc('5.3', 2, f'What is the configuration of the chirality center in {nm_}?', c, [other, 'E', 'Z'], 'Rank the four groups, point the lowest priority away from you and trace 1 → 2 → 3.', img=S(smi))
        else:
            b.mc('5.3', 3, f'What is the configuration of the chirality center in this sample of {nm_}?', c, [other, 'Meso', 'Cannot be determined'], 'Rank by atomic number (N or O above C above H), then trace 1 → 2 → 3 with H pointing away.', img=S(smi))
    b.mc('5.3', 3, 'If the lowest priority group is on a wedge and 1 → 2 → 3 appears clockwise, what is the configuration?', 'S', ['R', 'E', 'Meso'], 'Looking from the front puts the lowest priority group toward you, so the apparent direction is reversed.')
    b.mc('5.3', 4, 'A chirality center is drawn with the lowest priority group on a wedge and 1 → 2 → 3 counterclockwise. What is the configuration?', 'R', ['S', 'E', 'Z'], 'Reverse the apparent direction because the lowest priority group points toward the viewer.')
    # ------------------------------------------------------------ 5.4 Optical activity
    b.mc('5.4', 1, 'What instrument measures the rotation of plane-polarized light?', 'A polarimeter', ['A spectrometer', 'A calorimeter', 'A chromatograph'], 'The polarimeter reports the observed rotation.')
    b.mc('5.4', 1, 'What is a racemic mixture?', 'An equal mixture of two enantiomers', ['A pure single enantiomer', 'A mixture of constitutional isomers', 'A mixture of diastereomers'], 'Equal amounts mean the rotations cancel.')
    b.mc('5.4', 2, 'Two enantiomers rotate plane-polarized light:', 'By equal amounts in opposite directions', ['By equal amounts in the same direction', 'By different amounts in opposite directions', 'Not at all'], 'Enantiomers share all physical properties except the sign of rotation.')
    b.mc('5.4', 3, 'An enantiomer has a specific rotation of +20°. What is the specific rotation of its enantiomer?', '-20°', ['+20°', '0°', '-40°'], 'Enantiomers have equal magnitudes and opposite signs.')
    b.mc('5.4', 4, 'A sample contains 75% of one enantiomer and 25% of the other. What is the enantiomeric excess?', '50%', ['25%', '75%', '100%'], 'Enantiomeric excess is the major percentage minus the minor percentage.')
    # ------------------------------------------------------------ 5.5 Enantiomers and diastereomers
    b.mc('5.5', 1, 'Enantiomers are best described as:', 'Stereoisomers that are nonsuperimposable mirror images', ['Stereoisomers that are not mirror images', 'Constitutional isomers', 'Identical compounds'], 'Mirror images that cannot be superimposed.')
    b.mc('5.5', 1, 'Diastereomers are best described as:', 'Stereoisomers that are not mirror images', ['Mirror-image stereoisomers', 'Constitutional isomers', 'Compounds with different formulas'], 'Diastereomers are stereoisomers that are not enantiomers.')
    pairs = [('C[C@H](O)CC', 'C[C@@H](O)CC'), ('CC[C@H](Cl)[C@H](C)Cl', 'CC[C@@H](Cl)[C@@H](C)Cl'), ('CC[C@H](Cl)[C@H](C)Cl', 'CC[C@@H](Cl)[C@H](C)Cl'), ('C[C@H](N)C(=O)O', 'C[C@@H](N)C(=O)O'),
             ('C[C@H](Br)[C@H](O)CC', 'C[C@@H](Br)[C@@H](O)CC'), ('C[C@H](Br)[C@H](O)CC', 'C[C@H](Br)[C@@H](O)CC')]
    for k, (p, q) in enumerate(pairs[:4]):
        r = relation(p, q)
        r_t = {'enantiomers': 'Enantiomers', 'diastereomers': 'Diastereomers', 'identical': 'Identical compounds'}[r]
        wrong = [t for t in ('Enantiomers', 'Diastereomers', 'Identical compounds', 'Constitutional isomers') if t != r_t][:3]
        b.mc('5.5', 2 if k < 2 else 3, 'What is the relationship between the two compounds shown?', r_t, wrong, 'Compare every chirality center: all inverted gives enantiomers; some inverted gives diastereomers.', img=S(p, q, labels='A B'))
    b.mc('5.5', 3, 'A compound has two chirality centers with configurations (2R,3S). Which stereoisomer is its enantiomer?', '(2S,3R)', ['(2R,3R)', '(2S,3S)', '(2R,3S)'], 'An enantiomer inverts every center.')
    b.mc('5.5', 3, 'A compound has two chirality centers with configurations (2R,3S). Which stereoisomer is a diastereomer?', '(2R,3R)', ['(2S,3R)', 'Its mirror image', 'Itself'], 'Inverting only one center gives a diastereomer.')
    # ------------------------------------------------------------ 5.6 Symmetry
    b.mc('5.6', 1, 'A compound with a plane of symmetry is:', 'Achiral', ['Chiral', 'Always optically active', 'Always a racemic mixture'], 'A mirror plane makes the molecule identical to its mirror image.')
    b.mc('5.6', 2, 'Which describes a meso compound?', 'Contains chirality centers but is achiral', ['Contains no chirality centers', 'Is chiral and optically active', 'Is a racemic mixture'], 'A plane of symmetry cancels the chirality of its centers.')
    b.mc('5.6', 2, 'Is the compound shown chiral?', 'No, it is meso', ['Yes, it has two chirality centers', 'Yes, it is optically active', 'It cannot be determined'], 'The halves are mirror images across a plane in the middle of the C2-C3 bond.', img=S('C[C@H](Br)[C@@H](Br)C'))
    b.mc('5.6', 4, 'How many stereoisomers does 2,3-dibromobutane have?', '3', ['2', '4', '1'], 'Two enantiomers plus one meso compound, because the meso form is its own mirror image.')
    b.mc('5.6', 3, 'Which compound is meso?', 'cis-1,2-dimethylcyclohexane', ['trans-1,2-dimethylcyclohexane', 'Butan-2-ol', '2-Chlorobutane'], 'The cis isomer has an internal mirror plane; the trans isomer exists as a pair of enantiomers.')
    # ------------------------------------------------------------ 5.7 - 5.10
    b.mc('5.7', 1, 'In a Fischer projection, horizontal bonds point:', 'Toward the viewer (out of the page)', ['Away from the viewer', 'Within the plane of the page', 'Up the page'], 'Horizontal lines are wedges and vertical lines are dashes.')
    b.mc('5.7', 3, 'Rotating a Fischer projection by 180° in the plane of the page changes the configuration of the chirality center:', 'Not at all', ['From R to S', 'From S to R', 'To a diastereomer'], 'A 180° turn in the plane is the same molecule; a 90° turn would invert the picture.')
    b.mc('5.8', 2, 'Why is butane achiral even though some of its conformations lack a mirror plane?', 'Its conformations interconvert rapidly by bond rotation', ['It has a chirality center', 'It contains no hydrogens', 'It has a double bond'], 'The mirror-image conformations are constantly interconverting.')
    b.mc('5.9', 4, 'Which statement is true?', 'A compound can be chiral without having a chirality center', ['Every chiral compound has a chirality center', 'Every compound with a chirality center is chiral', 'Chirality only occurs in carbon compounds'], 'Some allenes, biaryls and helices are chiral without stereocenters.')
    b.mc('5.10', 2, 'What is the purpose of resolution?', 'To separate a racemic mixture into its enantiomers', ['To convert one enantiomer into the other', 'To make a racemic mixture', 'To change a compound into a constitutional isomer'], 'Resolution separates the two enantiomers of a racemate.')
    b.mc('5.10', 3, 'Why are diastereomers helpful in resolving a racemic mixture?', 'Diastereomers have different physical properties and can be separated', ['Diastereomers are mirror images', 'Diastereomers rotate light equally', 'Diastereomers have identical solubilities'], 'Enantiomers cannot be separated by ordinary means; diastereomeric salts can.')
    # ------------------------------------------------------------ 5.11 E and Z
    b.mc('5.11', 1, 'In the E/Z system, a Z alkene has the highest priority groups:', 'On the same side of the double bond', ['On opposite sides', 'On the same carbon', 'In a ring'], 'Z is from the German zusammen (together).')
    for smi, nm_ in [('C/C=C/CC', 'pent-2-ene'), ('F/C=C\\Cl', '1-chloro-2-fluoroethene'), ('C/C=C(/Cl)CC', '3-chloropent-2-ene')]:
        z = ez(smi)
        other = 'Z' if z == 'E' else 'E'
        b.mc('5.11', 2, f'What is the configuration of the double bond in {nm_}?', z, [other, 'R', 'S'], 'Rank the two groups on each end of the double bond, then compare their sides.', img=S(smi))
    b.mc('5.11', 3, 'Which alkene cannot show E/Z isomerism?', '2-Methylbut-2-ene', ['But-2-ene', 'Pent-2-ene', '1,2-Dichloroethene'], 'One alkene carbon of 2-methylbut-2-ene has two identical methyl groups.')

    # ================================================================ free response
    b.fr('5.1', 1, 'Define constitutional isomers and give an example pair.', 'Constitutional isomers have the same molecular formula but different connectivity, for example butan-1-ol and diethyl ether (both C₄H₁₀O).', 'Different connectivity is the key.')
    b.fr('5.1', 1, 'Define stereoisomers.', 'Stereoisomers have the same connectivity of atoms but differ in the arrangement of the atoms in space.', 'Same connectivity, different 3D arrangement.')
    b.fr('5.1', 2, 'Are the two compounds shown constitutional isomers or stereoisomers? Explain.', 'Constitutional isomers: the formula C₄H₁₀O is shared but the oxygen sits at a different carbon.', 'Compare the connectivity, not the 3D shape.', img=S('CCCCO', 'CCC(C)O', labels='A B'))
    b.fr('5.1', 2, 'Draw the two stereoisomers of but-2-ene and label each as cis or trans.', 'cis-But-2-ene has both CH₃ groups on the same side of the double bond; trans-but-2-ene has them on opposite sides.', 'The groups are cis if they are on the same side.', aimg=S('C/C=C\\C', 'C/C=C/C', labels='cis trans'))
    b.fr('5.1', 3, 'Draw all constitutional isomers of C₄H₁₀ and state how many there are.', 'Two: butane and 2-methylpropane (isobutane).', 'Try a straight chain and a branched chain.', aimg=S('CCCC', 'CC(C)C'))
    b.fr('5.1', 3, 'Are cis- and trans-1,2-dimethylcyclohexane constitutional isomers or stereoisomers? Explain.', 'Stereoisomers: both have the same connectivity but the methyl groups are on the same face in cis and opposite faces in trans.', 'Check the connectivity first.')
    # chirality centres
    b.fr('5.2', 2, 'Identify the chirality center in the compound shown and list its four groups.', 'The chirality center is C2; its groups are H, OH, CH₃ and CH₂CH₃.', 'The carbon bearing the OH has four different groups.', img=S('CC(O)CC'))
    b.fr('5.2', 2, 'Explain why propan-2-ol does not have a chirality center.', 'C2 bears two identical methyl groups, so only three different groups are attached.', 'Two methyl groups are identical.', img=S('CC(C)O'))
    b.fr('5.2', 2, 'How many chirality centers does 3-methylhexane have, and where?', 'One, at C3 (bonded to H, CH₃, CH₂CH₃ and CH₂CH₂CH₃).', 'Look for a carbon with four different groups.', img=S('CCC(C)CCC'))
    b.fr('5.2', 3, 'Circle the chirality centers in the compound shown by naming their carbon numbers.', 'C2 and C3 are chirality centers; each carbon has four different groups.', 'Count carbons from the end nearest the first branch.', img=S('CC(Cl)C(Br)CC'))
    b.fr('5.2', 3, 'Draw a molecule of formula C₄H₉Br that has a chirality center.', '2-Bromobutane, CH₃CHBrCH₂CH₃, has a chirality center at C2.', 'Put the Br on an internal carbon of the straight chain.', aimg=S('CC(Br)CC'))
    # R/S drawn
    for k, smi in enumerate(['C[C@H](Cl)CC', 'C[C@@H](N)C(=O)O', 'C[C@H](O)C(=O)O', 'C[C@@H](Br)CC']):
        c = cip(smi)[0]
        b.fr('5.3', 2 if k < 3 else 3, 'Assign R or S to the chirality center in the compound shown. List the priorities.', f'The configuration is {c}. Priorities are assigned by atomic number, the lowest priority group (H) is pointed away, and the 1 → 2 → 3 direction is read.', 'Rank groups, put 4 on a dash, trace 1 to 2 to 3.', img=S(smi))
    b.fr('5.3', 1, 'What do R and S stand for, and what do they describe?', 'R is rectus (clockwise) and S is sinister (counterclockwise); they describe the configuration of a chirality center.', 'Latin for right and left.')
    b.fr('5.3', 2, 'Explain how to assign priorities when two attached atoms are the same.', 'Move outward to the next atoms and compare their substituents in order until a first difference is found.', 'Compare sets of atoms, atom by atom.')
    b.fr('5.3', 3, 'Rank the groups -CH₂OH, -CH₂CH₃, -CH₃ and -H on a chirality center.', '-CH₂OH > -CH₂CH₃ > -CH₃ > -H', 'The first atoms are all C, so look at what the carbons carry: (O,H,H), (C,H,H), (H,H,H).')
    b.fr('5.3', 4, 'The lowest priority group is on a wedge and 1 → 2 → 3 looks clockwise. What is the configuration and why?', 'S, because the apparent direction is reversed when the lowest priority group points toward you.', 'View from the opposite side.')
    # optical activity
    b.fr('5.4', 1, 'What is the difference between dextrorotatory and levorotatory?', 'Dextrorotatory (+) rotates plane-polarized light clockwise; levorotatory (−) rotates it counterclockwise.', 'Based on the direction of rotation.')
    b.fr('5.4', 2, 'Explain why a racemic mixture is optically inactive.', 'The two enantiomers rotate light by equal amounts in opposite directions, so the rotations cancel.', 'Equal and opposite.')
    b.fr('5.4', 2, 'What is a racemic mixture, and how is it written?', 'An equal mixture of two enantiomers, written as (±) or racemic.', 'Equal amounts of each enantiomer.')
    b.fr('5.4', 3, 'A sample contains 80% of the (+) enantiomer and 20% of the (−) enantiomer. Calculate the enantiomeric excess.', '60% ee (80% − 20%).', 'ee is the major minus the minor.')
    b.fr('5.4', 3, 'The (R) enantiomer of a compound is dextrorotatory. What can you say about the rotation of the (S) enantiomer?', 'It is levorotatory with the same magnitude, because enantiomers rotate light equally in opposite directions.', 'Equal and opposite.')
    # enantiomers and diastereomers
    for k, (p, q) in enumerate(pairs[:4]):
        r = relation(p, q)
        b.fr('5.5', 2 if k < 2 else 3, 'Are these two compounds enantiomers, diastereomers or identical? Explain.', f'{r.capitalize()}: compare the configuration at each chirality center.', 'All inverted = enantiomers; some inverted = diastereomers; none inverted = identical.', img=S(p, q, labels='A B'))
    b.fr('5.5', 1, 'State one physical property that differs between diastereomers but not between enantiomers.', 'Melting point (or boiling point, solubility): diastereomers have different physical properties while enantiomers have identical ones (apart from the sign of rotation).', 'Enantiomers share nearly all properties.')
    b.fr('5.5', 2, 'Draw the enantiomer of the compound shown.', 'Reflect the structure so that the chirality center is inverted (wedge ↔ dash).', 'A mirror image.', img=S('C[C@H](O)CC'), aimg=S('C[C@@H](O)CC'))
    b.fr('5.5', 2, 'For a compound with three chirality centers, how many stereoisomers are possible (no meso)?', '2³ = 8', 'Use 2ⁿ.')
    # symmetry
    b.fr('5.6', 1, 'What kind of symmetry element makes a compound achiral?', 'A plane of symmetry (reflectional symmetry).', 'A mirror plane inside the molecule.')
    b.fr('5.6', 4, 'Explain why 2,3-dibromobutane has three stereoisomers rather than four.', 'One of the four possible combinations, (2R,3S), is meso and identical to its mirror image; the other two form an enantiomeric pair.', 'Use symmetry.', aimg=S('C[C@H](Br)[C@@H](Br)C'))
    b.fr('5.6', 3, 'Is the compound shown chiral or meso? Identify the plane of symmetry.', 'Meso: a plane of symmetry passes through the middle of the C2-C3 bond, so the molecule is achiral despite two chirality centers.', 'Compare the two halves.', img=S('C[C@H](Br)[C@@H](Br)C'))
    b.fr('5.6', 3, 'Is the compound shown chiral? Explain.', 'Yes. It has two chirality centers and no plane of symmetry.', 'Look for a mirror plane.', img=S('C[C@H](Br)[C@H](Br)C'))
    # Fischer, mobile systems, resolution
    b.fr('5.7', 1, 'In a Fischer projection, what do the horizontal and vertical lines mean?', 'Horizontal lines are bonds coming out of the page (wedges); vertical lines are bonds going behind the page (dashes).', 'Think of the bow-tie shape.')
    b.fr('5.7', 2, 'Describe how to assign R or S from a Fischer projection when the lowest priority group is on a horizontal bond.', 'Trace 1 → 2 → 3 and then reverse the answer, because the lowest priority group points toward the viewer.', 'A horizontal group is on a wedge.')
    b.fr('5.7', 4, 'Describe what happens to the configuration if you rotate a Fischer projection by 90° in the plane of the page.', 'The drawing now represents the enantiomer, because the horizontal and vertical roles swap.', 'Horizontal bonds point out of the page.')
    b.fr('5.8', 2, 'Explain why butane, which has chiral conformations, is not optically active.', 'The mirror-image conformations interconvert rapidly through single-bond rotation, so the sample contains equal amounts and is achiral overall.', 'Think about rapid rotation.')
    b.fr('5.9', 4, 'Can a compound be chiral without containing a chirality center? Give a reason.', 'Yes. A compound lacking a plane of symmetry is chiral even without a stereocenter, for example some allenes or helical molecules.', 'Chirality depends on overall symmetry.')
    b.fr('5.10', 4, 'Explain why reacting a racemic acid with one pure enantiomer of a chiral base allows the acid enantiomers to be separated.', 'The products are diastereomeric salts, which have different physical properties and can be separated, for example by crystallisation.', 'Enantiomer + pure chiral reagent gives diastereomers.')
    # E and Z
    for k, smi in enumerate(['C/C=C/CC', 'F/C=C\\Cl', 'C/C=C(/Cl)CC', 'C/C=C\\CC', 'F/C(Cl)=C/Br']):
        z = ez(smi)
        b.fr('5.11', 2 if k < 3 else 3, 'Assign E or Z to the double bond in the compound shown.', f'{z}: rank the groups on each alkene carbon by CIP priority and check whether the higher priority groups are on the same side (Z) or opposite sides (E).', 'Compare priorities at each end.', img=S(smi))
    b.fr('5.11', 1, 'What do E and Z mean in alkene nomenclature?', 'E (entgegen) means the higher priority groups are on opposite sides; Z (zusammen) means they are on the same side.', 'German for opposite and together.')
    b.fr('5.11', 2, 'Draw (Z)-but-2-ene.', 'Both methyl groups are on the same side of the double bond.', 'Z = together.', aimg=S('C/C=C\\C'))
    b.fr('5.11', 3, 'Explain why propene has no E or Z designation.', 'One alkene carbon (CH₂) carries two identical hydrogens, so the two arrangements are the same compound.', 'Each alkene carbon needs two different groups.')
    b.fr('5.11', 3, 'Draw (E)-pent-2-ene and (Z)-pent-2-ene.', 'In E the CH₃ and CH₂CH₃ groups are on opposite sides; in Z they are on the same side.', 'Higher priority on each carbon: CH₃CH₂ on C3 and CH₃ on C2.', aimg=S('C/C=C/CC', 'C/C=C\\CC', labels='E Z'))

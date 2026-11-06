"""AP Chemistry course units (names as in the Fall 2024 course and exam description) and the unit(s) each released free-response question belongs to (read by hand from the questions)."""
UNITS = {1: 'Unit 1: Atomic Structure and Properties', 2: 'Unit 2: Compound Structure and Properties',
         3: 'Unit 3: Properties of Substances and Mixtures', 4: 'Unit 4: Chemical Reactions', 5: 'Unit 5: Kinetics',
         6: 'Unit 6: Thermochemistry', 7: 'Unit 7: Equilibrium', 8: 'Unit 8: Acids and Bases', 9: 'Unit 9: Thermodynamics and Electrochemistry'}
# exam weighting of each unit in the multiple-choice section, from the Fall 2024 course and exam description
WEIGHT = {1: '7-9%', 2: '7-9%', 3: '18-22%', 4: '7-9%', 5: '7-9%', 6: '7-9%', 7: '7-9%', 8: '11-15%', 9: '7-9%'}

FRQ_UNITS = {
    2015: {1: [9, 1], 2: [2, 3, 9], 3: [4, 8], 4: [7], 5: [5], 6: [2, 3], 7: [6, 9]},
    2016: {1: [6, 2, 1], 2: [4, 9, 2], 3: [4, 3], 4: [8, 9], 5: [5], 6: [7, 3], 7: [8, 4]},
    2017: {1: [3, 4, 5], 2: [2, 6], 3: [7], 4: [3], 5: [6], 6: [7, 2], 7: [9, 4]},
    2018: {1: [6, 4], 2: [7], 3: [1, 3, 9], 4: [3], 5: [8], 6: [9], 7: [1, 5]},
    2019: {1: [2, 3, 9], 2: [2, 3, 6], 3: [4], 4: [3], 5: [1], 6: [5], 7: [4]},
    2021: {1: [8, 4, 2], 2: [1, 3, 9], 3: [4, 3], 4: [6], 5: [9], 6: [2, 7], 7: [3]},
    2022: {1: [4, 3, 8], 2: [2, 7, 9], 3: [1, 9], 4: [2, 3], 5: [5], 6: [3], 7: [2, 7]},
    2023: {1: [1, 4, 9], 2: [6, 2, 7], 3: [5, 4], 4: [8], 5: [3, 8], 6: [3, 2], 7: [7]},
    2024: {1: [8], 2: [4, 9, 8], 3: [1, 9, 4], 4: [6], 5: [7], 6: [5], 7: [3, 4]},
    2025: {1: [1], 2: [1, 8], 3: [2, 6, 9], 4: [2, 3], 5: [2, 3], 6: [9], 7: [8, 2]},
    2026: {1: [1, 6], 2: [2, 4], 3: [8], 4: [2, 7], 5: [2, 3], 6: [3], 7: [6, 4]},
}

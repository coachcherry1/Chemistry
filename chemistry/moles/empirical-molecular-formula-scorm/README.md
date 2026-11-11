# Empirical and Molecular Formulas

**Web version** (runs without Schoology; progress saves in the browser): <https://coachcherry1.github.io/Chemistry/chemistry/moles/empirical-molecular-formula-scorm/src/index.html>

A SCORM 1.2 activity for Schoology, for honors chemistry, about 35 minutes: the empirical formula of a compound from its percent
composition or from grams, then its molecular formula from its molar mass, always by the teacher's four steps.
No story problems: fluency with the routine, from real compounds.

## What students do

| Step | What it practises |
| --- | --- |
| The four steps | A worked example (Fe2O3 from 69.9% Fe and 30.1% O), each column filled in with Show step and explained, typeset |
| Warm-up: from percents | Your turn, every quotient whole |
| Warm-up: from grams | Grams given, so Step 1 keeps them |
| The fraction finder, Name the fraction, Whole or not?, Multiply them all | Decimals as fractions (below) |
| Warm-up: multiply if not whole | A problem needing x 2 or x 3 |
| Molecular formulas | CH2O: formaldehyde, acetic acid, lactic acid, glucose; n = molar mass / 30.0 |
| Warm-up: a molecular formula | Step 5: empirical formula mass, n, the subscripts |
| Graded problems | 8: three from percents, two from grams, three with a molar mass (two from percents, one from grams) |
| Results | Score, steps right on the first check by step, every problem with its worked solution |

Compounds: 65 real ones (`FORMULAS` in `compounds.js`): oxides and salts (Fe2O3, Fe3O4, Mg3N2, K2Cr2O7, Ca3(PO4)2 ...), molecular
compounds named by prefixes (N2O5, P4O10), and molecular compounds whose molar mass can be given (glucose, vitamin C, octane,
naphthalene, aspirin ...). Prompts give the elements, not the name; the name is shown when the formula is found. Every set has a
problem needing x 1, x 2, x 3 and x 4 or x 5, and at least two molecular formulas with n above 1; it opens with a problem from
percents that needs x 1 or x 2.

## The four steps (on screen in the teacher's words)

1. **Percents to grams:** given percents, assume a 100 g sample, so 40.0% is 40.0 g. Given grams, use the grams.
2. **Grams to moles,** set up by dimensional analysis, one line per row: g C x (1 mol C / ___ g C) = ___ mol C. The molar
   mass is the blank in the bottom of the fraction (to the tenths place; the Periodic table button docks a table with every atomic
   mass to tenths), and the g that cancels is struck through. Moles to at least 3 significant figures.
3. **Divide by small:** tap the smallest mole value, divide every row by it, to two decimal places.
4. **Multiply if not whole:** within 0.1 of a whole number, round (x 1). Otherwise read the decimal as a fraction and multiply every
   row by the same number: .50 x 2; .33 and .67 x 3; .25 and .75 x 4; .20, .40, .60 and .80 x 5 (halves, thirds, fourths and fifths).

Every problem is the same table: a row per element, a column per step. A strip above it names the four steps and lights
the one being worked; each column opens when the one before it is right, and each step has its own Check. Feedback names the slip
(a percent typed as a decimal, O2's mass for O, multiplying by the molar mass, dividing by the largest, rounding 1.33 down to 1 or
1.5 up to 2, multiplying only one row, adding n instead of multiplying), and every box is judged against the student's own earlier boxes, so one slip is
counted once. Hint says what to do in the step; Show me appears after two misses and fills the step in.

## Decimals as fractions (Multiply if not whole)

The hurdle the teacher named. Part 2 has four ungraded steps, the same in all three formula packages:

- **The fraction finder:** a ruler of the decimal part, 0 to 1, with a row for halves, thirds, fourths and fifths and shaded "round"
  ends (within 0.1 of a whole number). Students put 13 quotients on it; the nearest fraction lights up with what to multiply by.
- **Name the fraction:** 10 cards (every fraction once, one more half, a little lab scatter such as 1.34). For each: the fraction, the
  multiplier and the whole number (2.67 is 2 2/3, x 3, 8).
- **Whole or not?** 8 cards to sort: round it (within 0.1) or multiply.
- **Multiply them all:** four real compounds' ratios needing x 2, x 3, x 4 and x 5 (1 : 1.33 : 1 is x 3, 3 : 4 : 3): one multiplier for every row.

Beside every problem the fraction finder and its chart (decimal ending, fraction, multiply by) stay open. In the warm-ups a quotient
can be put on the ruler with a tap; in the graded problems the ruler and chart are a reference only, so reading the fraction is the
student's own work.

## Grading

The first Check of every step of every graded problem counts (the teacher's choice): the score is the steps right on the first check
out of all the steps (4 per problem, 5 with a molecular formula: 35 in all), sent as `cmi.core.score.raw` (0 to 100) after every step, with one `cmi.interactions` record per
step (id like `P3_C6H8O6_2moles`). An empty box, or the right number rounded too far (moles to fewer than 3 significant figures, a
quotient to fewer than 2 decimals, a molar mass not to tenths), is not an answer: the student is told and checks again. `completed`
on the results page, no `masteryscore`, retakes give new problems and the gradebook keeps the best. Progress is saved only in
`cmi.suspend_data` (`localStorage` only without an LMS); the largest save is about 2,600 characters of the 4,096 allowed. Bump
`SCHEMA` in `src/js/app.js` when the steps, the plan or a compound changes.

The results page shows the score, the steps right on the first check by step (which of the four each student misses), every problem
with its typeset worked solution, and the big ideas.

## The class's rules

- **Molar masses to the tenths place**, as in mole conversions: the on-screen table rounds every atomic mass to tenths; also accepted
  are full masses rounded at the end and a two-decimal table's tenths (Fe 55.9, Cu 63.6); a zero in the tenths place need not be typed.
- **1.5% tolerance** for molar masses and moles (students use different periodic tables). `tools/tables.js` works every problem of
  120 sets with six tables (tenths, two decimals, full masses, H 1.008, whole numbers with Cl 35.5 or 35) and the validator fails if
  any box is refused or any quotient reads as another fraction. Every problem's numbers are chosen so that, with every one of those
  tables, each quotient sits within 0.07 of a whole number or nearer its fraction than halfway to the next one.
- **Real compounds only**, with numbers computed from standard atomic weights (percents to 3 significant figures, grams to 0.001 g).

## Building and uploading

```bash
node tools/validate.js                    # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh                                # dist/empirical-molecular-formula-v2.zip
node tools/walkthrough.js                 # Playwright: plays the whole activity against a fake LMS (SEED=n: one student's problems)
node tools/layout.js                      # Playwright: fits a Chromebook, 1366x650 and 1366x520
```

Upload `dist/empirical-molecular-formula-v2.zip` in Schoology with **Add Materials > Add File/Link/External Tool > Add File** (or **Package**).
`src/index.html?step=set&seed=5&problem=3` opens a step (ids in `ANSWER_KEY.md`, or numbers), a given set and one of its problems
without saving anything.

## One code base, three packages

`empirical-molecular-formula-scorm/`, `hydrate-formula-scorm/` and `combustion-analysis-scorm/` share every file in `src/js` (except
`config.js`, which names the mode, the save key and the minutes), `src/css` and `tools/`; each validator fails if they differ, so a fix
goes into all three. The page title, the manifest (`EMPMOLFORMULA_*`, `HYDRATEFORMULA_*`, `COMBUSTANALYSIS_*`), `build.sh`, this README
and the answer key are per package.

## Files

`src/js/`: `config.js`, `util.js`, `elements.js` (periodic table, standard atomic weights as text), `compounds.js` (the real compounds,
hydrates and hydrocarbons), `chem.js` (formulas, molar masses to tenths, the fractions, a judge for every box, the slips), `problems.js`
(problems, warm-ups and drill cards from a seed; the worked solutions as LaTeX), `tex.js` (LaTeX to MathML), `ptable.js` (the docked
table), `finder.js` (the fraction finder), `work.js` (one problem: the four-step table), `drills.js`, `scenes.js` (the opening scenes),
`scorm.js`, `app.js`.

Offline, no CDN, web fonts or WebGL; mouse, touch and keyboard (Tab between boxes, Enter to check); dark mode; reduced motion.

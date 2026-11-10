# Formula of a Hydrate

**Web version** (runs without Schoology; progress saves in the browser): <https://coachcherry1.github.io/Chemistry/chemistry/moles/hydrate-formula-scorm/src/index.html>

A SCORM 1.2 activity for Schoology, for honors chemistry, about 25 minutes: the formula of a hydrate from its percent water, from
its mass before and after heating, or from crucible lab data, by the teacher's four steps, and its name.
No story problems: fluency with the routine, from real compounds.

## What students do

| Step | What it practises |
| --- | --- |
| What is a hydrate? | Heat CuSO4.5H2O in a crucible (predict first): the crystals turn white, water vapor rises, the balance drops; heat again to constant mass. The prefixes mono to deca |
| The four steps for a hydrate | A worked example (CuSO4.5H2O from crucible data), each column filled in with Show step and explained |
| Warm-up: percent water | Assume 100 g of the hydrate: % water is the grams of water, the rest is the salt |
| Warm-up: before and after heating | The water is the mass lost |
| The fraction finder, Name the fraction, Whole or not?, Multiply them all | Decimals as fractions (below) |
| Warm-up: crucible data | Subtract the readings for each part |
| Graded problems | 6: two from percent water, two from masses before and after heating, two from crucible readings |
| Results | Score, steps right on the first check by step, every problem with its worked solution |

Hydrates: 29 real ones (`HYDRATES` in `compounds.js`), n from 1 (LiCl.H2O, MnSO4.H2O) to 10 (Na2CO3.10H2O, Na2SO4.10H2O). The
prompt names the salt and gives its formula ("a hydrate of copper(II) sulfate, CuSO4"); Step 2's setups have the salt's molar mass
and water's 18.0 as their blanks; Step 5 picks the Greek prefix (copper(II) sulfate pentahydrate). Heating and crucible data have a little balance
scatter (the quotient comes out like 4.96), so Step 4 is the "within 0.1 of a whole number" call. Every set has at least four
different numbers of waters, one of 1 or 2 and one of 6 or more. Names use Roman numerals for Cu, Co, Fe, Ni, Mn, Cr, Sn and Pb; the
validator builds every name again from its ions.

## The four steps (on screen in the teacher's words)

1. **Percents to grams:** given percents, assume a 100 g sample, so 40.0% is 40.0 g. Given grams, use the grams.
2. **Grams to moles,** set up by dimensional analysis, one line per row: g CuSO4 x (1 mol CuSO4 / ___ g CuSO4) = ___ mol CuSO4. The molar
   mass is the blank in the bottom of the fraction (to the tenths place; the Periodic table button docks a table with every atomic
   mass to tenths), and the g that cancels is struck through. Moles to at least 3 significant figures.
3. **Divide by small:** tap the smallest mole value, divide every row by it, to two decimal places.
4. **Multiply if not whole:** within 0.1 of a whole number, round (x 1). Otherwise read the decimal as a fraction and multiply every
   row by the same number: .50 x 2; .33 and .67 x 3; .25 and .75 x 4; .20, .40, .60 and .80 x 5 (halves, thirds, fourths and fifths).

Every problem is the same table: a row per part (the anhydrous salt and the water), a column per step. A strip above it names the four steps and lights
the one being worked; each column opens when the one before it is right, and each step has its own Check. Feedback names the slip
(a percent typed as a decimal, O2's mass for O, multiplying by the molar mass, dividing by the largest, rounding 1.33 down to 1 or
1.5 up to 2, multiplying only one row, the water's percent typed for the salt, adding instead of subtracting), and every box is judged against the student's own earlier boxes, so one slip is
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
out of all the steps (5 per problem with the name: 30 in all), sent as `cmi.core.score.raw` (0 to 100) after every step, with one `cmi.interactions` record per
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
./build.sh                                # dist/hydrate-formula-v2.zip
node tools/walkthrough.js                 # Playwright: plays the whole activity against a fake LMS (SEED=n: one student's problems)
node tools/layout.js                      # Playwright: fits a Chromebook, 1366x650 and 1366x520
```

Upload `dist/hydrate-formula-v2.zip` in Schoology with **Add Materials > Add File/Link/External Tool > Add File** (or **Package**).
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

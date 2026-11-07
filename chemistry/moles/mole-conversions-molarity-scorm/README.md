# Mole Conversions with Molarity: Dimensional Analysis

**Web version** (runs without Schoology; progress saves in the browser): <https://coachcherry1.github.io/Chemistry/chemistry/moles/mole-conversions-molarity-scorm/src/index.html>

A SCORM 1.2 activity for Schoology, for honors chemistry, about 30 minutes. It is the mole conversions activity
(`../mole-conversions-scorm/`) with **molarity taught as dimensional analysis**: a solution's volume, in L or mL, is
one more place on the mole map, and the molarity given in the prompt (in mol/L) is the equality that joins it to
moles. Everything else is the same: tap or drag equalities into the chain, flip them until the units cancel, type the
molar mass (to tenths) and the ratio in their blanks, and round to the right significant figures.

The two packages share every script except `src/js/config.js` (`molarity: true` here), and each validator checks the
shared files are still identical, so a fix made in one is copied to the other.

## What is different from the basic version

- **L of solution and L of gas.** Volumes are always one or the other: "2.70 L of 0.350 mol/L potassium chloride
  solution, KCl" or "21.55 L of helium gas, He, at STP". On the mole map, L of solution sits beside L of gas above
  moles, joined to it by the mol/L road; 22.4 L = 1 mol stays for gases only.
- **The molarity equality is printed** from the prompt (the teacher's choice): 0.350 mol/L in the problem gives the
  chip 1 L KCl solution = 0.350 mol KCl. Students choose it and flip it.
- **mL:** two of the four molarity problems give the volume in mL, as on the class's practice set (350. mL), so
  1000 mL KCl solution = 1 L KCl solution is one more step. mL is not on the map; Hint says to change it to L first.
- **Significant figures:** the molarity is a measurement, so it is always given with the same number of
  significant figures as the volume, and the answer keeps that many. The other equalities count as exact.
- **Only substances that dissolve** are made into solutions (25 of them, from sodium chloride to sucrose), at no more
  than half their real solubility; the validator holds the solubilities.

## What students do

| Step | What it practises |
| --- | --- |
| The mole map | Tap the five roads around moles of NH₃ (molar mass, Avogadro's number, 22.4 L of gas, mol/L, ratio) |
| The mass road | Warm-up: g to mol of a compound, typing its molar mass |
| The particle road | Warm-up: mol to molecules, 6.02 × 10²³ |
| The L of gas road | Warm-up: L of a gas at STP to mol |
| The ratio road | Warm-up: mol of a compound to mol of an element in it, typing the ratio |
| The molarity road | Warm-up: L of solution to mol, with the molarity from the prompt |
| Mixed problems | Graded: 14 problems, 4 one-step, 5 two-step, 4 three-step and 1 four-step, in a mixed order |
| Results | Score, first-try count, every problem with its answer and typeset worked solution, a new attempt |

The four molarity problems are, in random directions: L of solution to mol (1 step), L of solution to g (2 steps),
mL of solution to g (3 steps) and mL of solution to atoms of an element in it (4 steps, like "number of Cl atoms in
350. mL of .350 mol/L gallium chloride solution"). The other ten are the basic version's mix.

Every prompt names the substance and gives its formula. Worked solutions are typeset from LaTeX, as in the basic
version: each factor a fraction, cancelled units struck through, the answer on its own line for long chains.

## Grading

14 graded problems per attempt; a problem counts when it is right before **Show solution**. `cmi.core.score.raw`
(0 to 100), `completed` on the results screen, no `masteryscore`, one `cmi.interactions` record per problem, retakes
keep the best score, progress only in `cmi.suspend_data`. Its own SCORM identifiers (`MOLECONVM_*`), save key
(`mole-conversions-molarity-state`) and zip, so both versions can sit in one course.

## Building and uploading

```bash
node tools/validate.js                    # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh                                # dist/mole-conversions-molarity-v1.zip
node tools/walkthrough.js                 # Playwright: plays the whole activity against a fake LMS
node tools/layout.js                      # Playwright: fits a Chromebook, 1366x650 and 1366x520
```

Upload `dist/mole-conversions-molarity-v1.zip` in Schoology with **Add Materials → Add File/Link/External Tool → Add
File** (or **Package**). `src/index.html?step=set&seed=5&problem=3` opens a step, a given set and one of its problems
without saving anything. See `../mole-conversions-scorm/README.md` for the files, the feedback and the class's rules.

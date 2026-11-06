# Mole Conversions: Dimensional Analysis

**Web version** (runs without Schoology; progress saves in the browser): <https://coachcherry1.github.io/Chemistry/chemistry/moles/mole-conversions-scorm/src/index.html>

A SCORM 1.2 activity for Schoology, for honors chemistry, about 25 minutes. It works like the dimensional analysis
mixed challenge (`to-merge/Honors Chemistry/Math and Measurements/DimAnalysis-6-Mixed-Challenge/`): tap or drag an
equality into the chain, flip it until its units cancel, then type the answer to the right significant figures. What
is new: the **molar-mass equality has a blank** where the student types the molar mass, **to the tenths place**,
and the **ratio equality has a blank** for the number from the formula (1 mol SBr₂ = ___ mol Br). No story problems:
fluency only, in the style of the class's Moles formative quiz.

## What students do

| Step | What it practises |
| --- | --- |
| Mole Town | The class's map: tap the four roads around moles of CO₂ (molar mass, Avogadro's number, 22.4 L, ratio) |
| The mass road | Warm-up, one step: g to mol of a compound, typing its molar mass |
| The particle road | Warm-up: mol to molecules, 6.022 × 10²³, the ×10ⁿ button |
| The 22.4 L road | Warm-up: L of a gas at STP to mol |
| The ratio road | Warm-up: mol of a compound to mol of an element in it, typing the ratio |
| Mixed problems | Graded: 12 problems, 3 one-step, 5 two-step and 4 three-step, in a mixed order |
| Results | Score, first-try count, every problem with its answer, big ideas, a new attempt |

Every student gets their own substances (71 in all: elements, diatomic elements, molecular and ionic compounds) and
numbers (2 to 4 significant figures). Problems are routes on the Mole Town map: g, mol, particles or L at STP of a
substance, or g, mol or atoms of an element counted in it, through the ratio. In every set at least 4 problems use
the ratio and at least 2 use 22.4 L, and no substance repeats.

Beside the work, a small Mole Town map marks the start (blue), the target (yellow) and the unit reached so far, and
lights each road a placed factor uses. The **Periodic table** button docks a table along the bottom of the window
(atomic masses to tenths) and scrolls the chain into view above it.

## The class's rules

- **Molar masses to the tenths place.** The table shows every atomic mass rounded to tenths; the molar mass is those
  added up (CCl₄ = 12.0 + 4(35.5) = 154.0). Also accepted, so a student working from their own table is never
  marked wrong: the full masses added and rounded at the end (153.8), and the tenths value of a two-decimal table
  (Fe 55.85 gives 55.9; Cu 63.55 gives 63.6). The answer is checked against the molar mass the student typed.
- **Significant figures:** 22.4 L, 6.022 × 10²³, the molar mass and the ratio all count as exact; the given quantity
  decides. A right number with the wrong count is not marked correct: the rule is explained and they try again.
- **Particles:** atoms of an element, molecules of a diatomic element or a molecular compound. Ionic compounds are
  never counted in particles (their elements are: atoms O in Fe₂O₃), so no particle word for them is needed.
- **22.4 L only for gases at STP**; the validator holds a boiling point for every substance.

## Feedback

Check looks at the units first (a factor upside down, a unit left over, two substances that never cancel without
the ratio), then each blank, then the number. A wrong molar mass gets the likely slip: subscripts left out
(SBr₂ as 112.0), brackets not multiplied (Mg(NO₃)₂ as 86.3), atomic numbers, an element left out, an atom
miscounted, or not to the tenths place. A wrong ratio: another element's count, the subscript inside brackets,
every atom counted. A wrong number: upside down, off by the ratio, off by a power of ten (with how to enter
6.022 × 10²³ on a calculator), the last digit off from rounding in between, or the significant figures. **Hint**
says where on the map the student is and which road to take next.

## Grading

12 graded problems per attempt. A problem counts when it is right before **Show solution** (which asks to confirm);
hints and checking again are free, as in the mixed challenge. `cmi.core.score.raw` (0 to 100) after every problem,
`completed` on the results screen, no `masteryscore`, one `cmi.interactions` record per problem (the answer typed and
the one expected). Retakes give new problems and the gradebook keeps the best. Progress, including a half-built
chain, is saved only in `cmi.suspend_data` (`localStorage` only without an LMS). Bump `SCHEMA` in `src/js/app.js`
whenever the steps, the problem plan, a substance or an atomic mass changes.

## Building and uploading

```bash
node tools/validate.js                    # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh                                # dist/mole-conversions-v1.zip
node tools/walkthrough.js                 # Playwright: plays the whole activity against a fake LMS
node tools/layout.js                      # Playwright: fits a Chromebook, 1366x650 and 1366x520
```

Upload `dist/mole-conversions-v1.zip` in Schoology with **Add Materials → Add File/Link/External Tool → Add File**
(or **Package**). `src/index.html?step=set&seed=5&problem=3` opens a step (ids in `ANSWER_KEY.md`, or numbers 1 to
7), a given set and one of its problems without saving anything.

## Files

`src/js/`: `util.js`, `elements.js` (periodic table, standard atomic weights as text), `substances.js`, `chem.js`
(formulas, molar masses to tenths and what else is accepted, the slips, the equalities, unit cancelling, judging),
`problems.js` (the set plan and the warm-ups, from a seed), `map.js` (Mole Town), `ptable.js` (the docked table),
`work.js` (one problem: chain, chips, blanks, Check, Hint, Show solution, drag and keyboard), `scorm.js`, `app.js`.

Offline, no CDN, web fonts or WebGL; mouse, touch, drag and keyboard (Tab to an equality and Enter to add it; on a
placed factor, arrow keys move it and Delete removes it); dark mode; reduced motion.

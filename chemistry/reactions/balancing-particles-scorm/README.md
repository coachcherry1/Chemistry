# Balancing equations with particles (honors chemistry)

SCORM 1.2 package for Schoology, about 25 minutes. Package 1 of the reactions unit (see `../PLAN.md`).

**Web version:** https://coachcherry1.github.io/Chemistry/chemistry/reactions/balancing-particles-scorm/src/index.html
(works once this branch is merged into `main`)

**Upload to Schoology:** `dist/balancing-particles-v1.zip`

## What students do

Every reaction is shown as particles: a box of reactants and a box of products. Students change the coefficients with + and −
(or type them, or use the arrow keys) and the boxes redraw. The goal is always the same: every atom in the reactants box is in
the products box (the law of conservation of mass).

| Part | Steps | Graded |
| --- | --- | --- |
| 1 Reading the picture | Subscripts and coefficients (count atoms in 3 H₂O, 2 Al₂O₃, 2 Ca(OH)₂); what may you change (a coefficient, never a subscript) | no |
| 2 Is it conserved? | Four pictures: are the atoms conserved? | no |
| 3 Balancing | Water, ammonia and methane with a live atom tally; then iron and oxygen with the tally hidden until Check, and the tips | no |
| 4 Picture to equation | A picture of 4 H₂ + 2 O₂ → 4 H₂O is written 2 H₂ + O₂ → 2 H₂O: lowest whole numbers | no |
| 5 Graded | 6 choice questions (select, then Submit answer), then 10 equations (3 easy, 4 medium, 3 hard) | yes |
| 6 Results | Score, every equation and question with its answer, a new attempt | |

## Grading

- 16 graded items. Score = items right the first time / 16, sent to the gradebook as 0 to 100 after every item.
- **Questions:** clicking a choice only selects it; Submit answer grades it, once.
- **Equations:** the atom tally is hidden until the first Check, so students count the particles themselves, and that first
  Check is what counts. After a miss the tally shows and they keep going until it is balanced (Show me after three misses).
- A Check with an empty box is not counted. Coefficients that conserve every atom but are not the lowest whole numbers
  (4, 2, 4 for 2, 1, 2) are told to reduce, and count as a miss.
- Retakes give new questions and equations; the gradebook keeps the best score. Progress is saved in `cmi.suspend_data`.

## Teacher links

- `src/index.html?step=<id or number>` opens one step (ids: count, change, conserved, first, second, third, strategy, lowest,
  quiz, set, results). Nothing is saved or reported in this mode.
- `?step=set&seed=<n>&problem=<1 to 10>` opens one graded equation of one student's set.
- `ANSWER_KEY.md` lists every equation in the pool with its answer.

## How it is built

- `chem.js` reads formulas and **balances every equation by solving it**; no coefficient is typed anywhere. `reactions.js` holds
  80 substances (name and particle drawing) and 54 reactions (48 in the graded pool), each tagged with its type for the
  classifying package that follows.
- `particles.js` draws each particle from the atoms that touch: lettered circles coloured by element, bigger atoms drawn
  bigger (from covalent radii, squeezed so H still holds its letter). Both boxes always use one scale.
- `bench.js` is the workbench; `steps.js` the other lesson steps and the choice questions; `problems.js` one student's
  questions and equations from a seed; `app.js` the order, saving and scoring.
- Two reactions (butane, nitroglycerin) are in `reactions.js` but marked `big`: too many particles for this package, kept
  for the classifying package.

## Before every commit

```bash
node tools/validate.js                    # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh                                # zip into dist/
node tools/walkthrough.js                 # Playwright, fake LMS; SHOTS=dir DARK=1 optional
node tools/layout.js                      # Playwright: fits a Chromebook
```

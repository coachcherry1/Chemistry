# Balancing equations with particles (honors chemistry)

SCORM 1.2 package for Schoology, about 30 minutes. Package 1 of the reactions unit (see `../PLAN.md`). It shares its code with
package 2, `../balancing-reaction-types-scorm/`: every file in `src/js` (except `config.js`), `src/css` and `tools/` is the same
in both, and each validator fails if they differ, so a fix goes into both.

**Web version:** https://coachcherry1.github.io/Chemistry/chemistry/reactions/balancing-particles-scorm/src/index.html
(works once this branch is merged into `main`)

**Upload to Schoology:** `dist/balancing-particles-v4.zip`

## What students do

Every reaction is shown as particles: a box of reactants and a box of products, with the **inventory down the centre**, under
the arrow, as it is written on paper (count in the reactants | what is counted | count in the products). Students change the
coefficients with + and − (or type them, or use the arrow keys); the boxes and the inventory follow. The goal is always the
same: every row of the inventory matches (the law of conservation of mass).

| Part | Steps | Graded |
| --- | --- | --- |
| 1 Reading the picture | Subscripts and coefficients (count atoms in 3 H₂O, 2 Al₂O₃, 2 Ca(OH)₂); what may you change (a coefficient, never a subscript) | no |
| 2 Is it conserved? | Four pictures: are the atoms conserved? | no |
| 3 Balancing | Water, ammonia and methane with the live inventory; then iron and oxygen, where the student types the starting inventory first, with the tips | no |
| 4 Polyatomic ions | Na₃PO₄ + Ca(C₂H₃O₂)₂: the ions are on both sides, so each is one row (Na, PO₄, Ca, C₂H₃O₂). P₄O₁₀ + H₂O → H₃PO₄: PO₄ is on one side only, so atom by atom. NaOH + H₂SO₄: a neutralization, so water is written HOH and OH stays together (Na, OH, H, SO₄). Each starts with the student typing the inventory. Every kept ion is outlined in colour in the boxes and ringed the same colour in its inventory row | no |
| 5 Graded | 6 choice questions (select, then Submit answer), then 10 equations (3 easy, 4 medium, 3 hard) | yes |
| 6 Results | Score, every equation and question with its answer, a new attempt | |

## Grading

- 16 graded items. Score = items right the first time / 16, sent to the gradebook as 0 to 100 after every item.
- **Questions:** clicking a choice only selects it; Submit answer grades it, once.
- **Equations:** the inventory follows the coefficients, but no row is marked right or wrong until the first Check, so
  students compare the two columns themselves, and that first Check is what counts. After a miss the rows are marked and
  they keep going until it is balanced (Show me after three misses).
- A Check with an empty box is not counted. Coefficients that conserve every atom but are not the lowest whole numbers
  (4, 2, 4 for 2, 1, 2) are told to reduce, and count as a miss.
- Retakes give new questions and equations; the gradebook keeps the best score. Progress is saved in `cmi.suspend_data`.

## Teacher links

- `src/index.html?step=<id or number>` opens one step (ids: count, change, conserved, first, second, third, strategy, ions,
  split, mixed, quiz, set, results). Nothing is saved or reported in this mode.
- `?step=set&seed=<n>&problem=<1 to 10>` opens one graded equation of one student's set.
- `ANSWER_KEY.md` lists every equation in the pool with its answer.

## How it is built

- `chem.js` reads formulas and **balances every equation by solving it**; no coefficient is typed anywhere. It also writes the
  inventory: a polyatomic ion (NO₃, SO₄, PO₄, CO₃, OH, ClO₃, C₂H₃O₂, NH₄) is one row only when it is in the reactants and in
  the products; otherwise its atoms are counted. In a neutralization water is written HOH (a hydroxide and a hydrogen). `reactions.js` holds 88 substances (name and particle drawing) and 65
  reactions (56 in the graded pool), each tagged with its type for the classifying package that follows.
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

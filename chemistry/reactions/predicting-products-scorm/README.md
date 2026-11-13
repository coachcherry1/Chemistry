# Predicting products (honors chemistry)

SCORM 1.2 package for Schoology, about 40 minutes. Package 3 of the reactions unit (see `../PLAN.md`); students should have done
the two balancing packages first.

**Web version:** https://coachcherry1.github.io/Chemistry/chemistry/reactions/predicting-products-scorm/src/index.html
(works once this branch is merged into `main`)

**Upload to Schoology:** `dist/predicting-products-v1.zip`

## What students do

Given only the reactants, students decide whether a reaction happens, build the products from ion charges, give their states
and balance. Two kinds of reaction only:

- **Single replacement**, decided by the activity series: a metal with a salt solution, a metal with an acid (H₂ forms), a
  halogen with a halide. No metal with water.
- **Double replacement**, decided by the solubility table: a reaction only if a product is a solid. Otherwise: no reaction.

The class handout (activity series with the halogens, solubility table) is drawn on screen beside every problem, drill and
question.

| Part | Steps | Graded |
| --- | --- | --- |
| 1 Single replacement | Reading the series (six pairs); zinc in copper(II) sulfate and copper in zinc sulfate as particle animations, after a prediction; Al + CuCl₂ and Mg + HCl worked step by step | no |
| 2 Double replacement | Reading the table (eight compounds); AgNO₃ + NaCl and NaCl + KNO₃ as animations, after a prediction; Pb(NO₃)₂ + KI and NaCl + KNO₃ worked step by step | no |
| 3 Graded | 4 questions (select, then Submit answer), then 10 problems | yes |
| 4 Results | Score by kind of step, every problem with its equation and reason, a new attempt | |

## A problem, step by step

| Step | Single replacement | Double replacement |
| --- | --- | --- |
| Will it react? | First: a choice and Submit answer, from the series. If not, the problem ends here | Third, after the states: a solid means a reaction |
| Products | The new compound (pick its two ions, set how many of each) and the element set free (Cu or Cu₂? H or H₂?) | Both possible products, each built from a positive and a negative ion |
| States | (s), (l), (g) or (aq) for each product | The same, from the solubility table |
| Balance | The workbench of the balancing packages, inventory down the centre | The same |

Ions are shown with their charges; the student has to make the charges cancel. Feedback names the usual slips: subscripts
copied from the reactant, a formula not in lowest terms, the reactants built again, H for H₂, a wrong state.

## Grading

- 37 graded items: 4 questions and 33 steps (every set has three single replacements that react, two that do not, four
  double replacements that give a solid and one that does not). Score = items right the first time / 37.
- A Check with something left unchosen is not counted. After a miss the student keeps going until the step is right (Show
  me after three misses).
- Retakes give new questions and problems; the gradebook keeps the best score. Progress is saved in `cmi.suspend_data`.

## Choices made from the handout

- Bromide and iodide follow chloride; lithium salts are always soluble; the halogens are F₂ > Cl₂ > Br₂ > I₂ (agreed with
  the teacher).
- The ion each metal forms is the one on the handout's series (iron forms Fe²⁺, lead Pb²⁺, copper Cu²⁺).
- Some compounds are never used, as a reactant or a product, because the real compound is only slightly soluble, reacts with
  water or does not exist, so the table would give a doubtful answer: `ANSWER_KEY.md` lists them (CaSO₄, PbCl₂, Ca(OH)₂ ...).
- Lone metals are Mg, Al, Zn, Fe, Pb, Cu and Ag: none that reacts with water. A single replacement is only asked when the
  new salt is soluble.
- A lone halogen is written (aq); as products Br₂ is (l) and I₂ is (s).

## Teacher links

- `src/index.html?step=<id or number>` opens one step (ids: willit, plate, sr1, sr2, sol, mix, dr1, dr2, quiz, set, results).
- `?step=set&seed=<n>&problem=<1 to 10>&rung=<1 to 4>` opens one graded problem of one student's set at one step.
- `ANSWER_KEY.md` has the reference tables, every single replacement in the pools and the solids the double replacements make.

## How it is built

- `ions.js` holds the handout as data and works everything out from it: formulas from charges, names, states, whether a
  replacement happens, the products, and a particle drawing for every compound. The validator types the series and the
  solubility of every pair of ions a second time and compares.
- `problems.js` builds a student's set from a seed; `ladder.js` is a problem worked step by step; `ref.js` draws the
  handout; `scene.js` the two animations; `steps.js` the drills and questions.
- `chem.js`, `bench.js`, `util.js` and `scorm.js` are the balancing packages' files, unchanged (the validator checks);
  `particles.js` is theirs with strontium added.

## Before every commit

```bash
node tools/validate.js                    # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh                                # zip into dist/
node tools/walkthrough.js                 # Playwright, fake LMS; SHOTS=dir DARK=1 optional
node tools/layout.js                      # Playwright: fits a Chromebook
```

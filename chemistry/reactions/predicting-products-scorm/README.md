# Predicting products (honors chemistry)

SCORM 1.2 package for Schoology, about 40 minutes. Package 3 of the reactions unit (see `../PLAN.md`); students should have done
the two balancing packages first.

**Web version:** https://coachcherry1.github.io/Chemistry/chemistry/reactions/predicting-products-scorm/src/index.html
(works once this branch is merged into `main`)

**Upload to Schoology:** `dist/predicting-products-v3.zip`

## What students do

Given only the reactants, students decide whether a reaction happens, build the products from ion charges, give their states
and balance. Two kinds of reaction only:

- **Single replacement**, decided by the activity series: a metal with a salt solution, a metal with an acid or with cold
  water (H₂ forms; water is written HOH), a halogen with a halide. **No state symbols**: they do not matter here.
- **Double replacement**, decided by the solubility rules: a reaction only if a product is a solid. Otherwise: no reaction.
  States matter here, so they are asked: (aq) or (s).

The reference (activity series with the halogens, solubility rules) is drawn on screen beside every problem, drill and
question. The same data makes two printable sheets in `../reference-sheet/`: the full one, and an assessment version with the same tables but not the rules for using them (students are to know those by heart).

| Part | Steps | Graded |
| --- | --- | --- |
| 1 Single replacement | Reading the series (eight pairs, two of them a metal in cold water); zinc in copper(II) sulfate and copper in zinc sulfate as particle animations, after a prediction; Al + CuCl₂ and Mg + HCl worked step by step | no |
| 2 Double replacement | Reading the rules (eight compounds); AgNO₃ + NaCl and NaCl + KNO₃ as animations, after a prediction; Pb(NO₃)₂ + KI and NaCl + KNO₃ worked step by step | no |
| 3 Graded | 4 questions (select, then Submit answer), then 10 problems | yes |
| 4 Results | Score by kind of step, every problem with its equation and reason, a new attempt | |

## A problem, step by step

| Step | Single replacement | Double replacement |
| --- | --- | --- |
| Will it react? | First: a choice and Submit answer, from the series. If not, the problem ends here | Third, after the states: a solid means a reaction |
| Products | The new compound (pick its two ions, set how many of each) and the element set free (Cu or Cu₂? H or H₂?) | Both possible products, each built from a positive and a negative ion |
| States | not asked: they do not matter in a single replacement | (aq) or (s) for each product, from the solubility rules |
| Balance | The workbench of the balancing packages, inventory down the centre | The same |

Ions are shown with their charges; the student has to make the charges cancel. Feedback names the usual slips: subscripts
copied from the reactant, a formula not in lowest terms, the reactants built again, H for H₂, a wrong state in a double replacement.

## Grading

- 34 graded items: 4 questions and 30 steps (every set has three single replacements that react, two that do not, four
  double replacements that give a solid and one that does not). Score = items right the first time / 34.
- A Check with something left unchosen is not counted. After a miss the student keeps going until the step is right (Show
  me after three misses).
- Retakes give new questions and problems; the gradebook keeps the best score. Progress is saved in `cmi.suspend_data`.

## The reference, corrected (November 2026)

The teacher asked for the handout to be made more accurate. What changed from the old sheet:

- **Activity series:** in the order of the standard reduction potentials, so cesium and rubidium come before potassium
  (the old sheet had Rb, K, Cs). It now says what each metal replaces hydrogen from: Li to Na from cold water, Mg to Cd
  from steam, Co to Pb from acids only, Cu to Au from nothing. The halogens are listed: F₂ > Cl₂ > Br₂ > I₂.
- **Solubility rules:** group 1 (lithium included) and ammonium are always soluble; bromide and iodide are listed with
  chloride; Hg₂²⁺ is an exception for the halides and sulfate; the sulfides of Ca, Sr and Ba are not insoluble.
- **Two answers only, as a novice would see them:** a compound either dissolves, (aq), or a solid is seen, (s). There is no
  "slightly soluble": Ca(OH)₂, CaSO₄, Ag₂SO₄, Sr(OH)₂, PbCl₂ and PbBr₂ are insoluble, and now appear in the problems.

## Choices made in the problems

- A few compounds that react with water, do not exist or are too borderline to ask about (silver acetate) are never used as a
  reactant or a product: `ANSWER_KEY.md` lists them.
- Lone metals include the ones that react with water (K, Ba, Ca, Na) as well as Mg, Al, Zn, Fe, Pb, Cu and Ag: on paper
  the series decides. The ion each metal forms is the one on the series (iron forms Fe²⁺, lead Pb²⁺, copper Cu²⁺).
- A metal in cold water: K, Na, Ba and Ca react (a hydroxide and H₂; calcium's hydroxide is a solid, which a single
  replacement does not show); Zn, Fe, Pb, Cu and Ag do not.
- A double replacement may make two solids at once (Ba(OH)₂ + CuSO₄).

## Teacher links

- `src/index.html?step=<id or number>` opens one step (ids: willit, plate, sr1, sr2, sol, mix, dr1, dr2, quiz, set, results).
- `?step=set&seed=<n>&problem=<1 to 10>&rung=<n>` opens one graded problem of one student's set at one step.
- `ANSWER_KEY.md` has the reference tables, every single replacement in the pools and the solids the double replacements make.

## How it is built

- `ions.js` holds the reference as data and works everything out from it: formulas from charges, names, states, whether a
  replacement happens, the products, and a particle drawing for every compound. The validator sorts the series again from a table
  of standard potentials and types the solubility of every pair of ions a second time.
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

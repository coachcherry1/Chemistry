# Balancing and reaction types (honors chemistry)

SCORM 1.2 package for Schoology, about 35 minutes. Package 2 of the reactions unit (see `../PLAN.md`); students should have
done package 1, `../balancing-particles-scorm/`, first. The two packages share one code base: every file in `src/js` (except
`config.js`), `src/css` and `tools/` is the same in both, and each validator fails if they differ, so a fix goes into both.

**Web version:** https://coachcherry1.github.io/Chemistry/chemistry/reactions/balancing-reaction-types-scorm/src/index.html
(works once this branch is merged into `main`)

**Upload to Schoology:** `dist/balancing-reaction-types-v1.zip`

## What students do

Every reaction is balanced **and** classified on one workbench: the equation with its coefficients, the particle boxes with
the inventory down the centre, and six type buttons. One Check judges the coefficients and the type together.

| Part | Steps | Graded |
| --- | --- | --- |
| 1 Balancing recap | Iron and oxygen (type the inventory, then balance); NaOH + H₂SO₄ with water as HOH | no |
| 2 The six types | A card for each type (general form, what gives it away, an example as particles) beside the three rules for close calls; then eight reactions to classify | no |
| 3 Balance and classify | P₄O₁₀ + H₂O → H₃PO₄ and CH₄ + O₂: balance and choose the type, one Check for both | no |
| 4 Graded | 4 questions on the types (select, then Submit answer), then 10 reactions | yes |
| 5 Results | Score, every reaction with its type, a new attempt | |

## The six types and the rules

Synthesis (A + B → AB), decomposition (AB → A + B), single replacement (A + BC → AC + B), double replacement
(AB + CD → AD + CB), combustion (CxHy + O₂ → CO₂ + H₂O) and neutralization (HX + MOH → MX + HOH).

1. **One product is a synthesis, one reactant a decomposition**, whatever else is true.
2. **An acid with a base is a neutralization**, not a double replacement. Water is written HOH.
3. **Combustion** is kept for a compound of carbon and hydrogen (or C, H and O) reacting with O₂ to make CO₂ and H₂O.
   A metal burning in O₂ makes one product: a synthesis.

## Grading

- 24 graded items: 4 questions, and 10 reactions worth 2 each (the coefficients and the type). Score = items right the
  first time / 24, sent to the gradebook as 0 to 100 after every item.
- **Reactions:** clicking a type only selects it. The first Check counts for both items; a Check with no type chosen, or
  with an empty coefficient, is not counted. After a miss the student keeps going until both are right (Show me after
  three misses).
- **Every student's set** has all six types, easiest first, and ends with the **decomposition of nitroglycerin**
  (4 C₃H₅(NO₃)₃ → 12 CO₂ + 10 H₂O + 6 N₂ + O₂). Its coefficients are never shown before that.
- Retakes give a new set (nitroglycerin stays); the gradebook keeps the best score. Progress is saved in `cmi.suspend_data`.

## Teacher links

- `src/index.html?step=<id or number>` opens one step (ids: recap, hoh, types, sort, both1, both2, quiz, set, results).
  Nothing is saved or reported in this mode.
- `?step=set&seed=<n>&problem=<1 to 10>` opens one graded reaction of one student's set (10 is nitroglycerin).
- `ANSWER_KEY.md` lists every reaction in the pool with its coefficients and type.

## How it is built

- `config.js` sets `classify: true`; that one switch gives this activity from package 1's code.
- `Chem.classify` works out each reaction's type from its formulas by the three rules; the validator checks every tag in
  `reactions.js` against it. Reactions that fit none of the six cleanly are left out of this package.
- See package 1's README for the model, the particles and the inventory.

## Before every commit

```bash
node tools/validate.js                    # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh                                # zip into dist/
node tools/walkthrough.js                 # Playwright, fake LMS; SHOTS=dir DARK=1 optional
node tools/layout.js                      # Playwright: fits a Chromebook
```

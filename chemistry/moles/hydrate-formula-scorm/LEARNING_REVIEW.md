# Learning review

## 2026-11-14: review with dual-coding, erroneous-example and retrieval criteria

Status of the items in the earlier entry below:
- Done: Find the mistake (`mistakeDrill` in `drills.js`); the four steps recalled from memory before the graded set (`recallDrill`, `app.js` `recall` step).
- Open: the find-the-mistake cards are still words only. Each card is a numbered list of text lines (`drills.js` ~233 to 240), with no table beside it.
- Open: spacing (no review a week later) and elaboration (no "why" questions anywhere in `src/js`).
- Not applicable here: the molar-mass reminder beside Step 5. This package has no molecular-formula part; Step 5 is the Greek prefix.

Found on this review:

### 1. Write for a novice chemist
- Strong: the heat step draws the idea before the routine (crucible, water leaving as wisps, the anhydrous salt defined in the heat scene, `scenes.js` ~146); the worked example and faded warm-ups; the Greek prefixes are taught in Step 5 with real hydrates.
- Missing: no vocabulary panel. Terms such as "constant mass", "crucible" and "percent water" are not defined in one place a student can return to. (Checked only for a glossary and for the anhydrous definition; not an exhaustive term search.)
- Proposed: a Vocabulary panel with hydrate, anhydrous salt, water of hydration, constant mass, crucible and percent water, in the same wording as the steps.

### 2. Cognitive science
- Strong: predict before the heating reveal (generation); the first Check of each step counts (calibration); named slips in feedback (plan for error); real compounds (concrete examples); the recall of the four steps before the set.
- Missing, and a real gap: the graded set never asks for Step 4's multiplier. `problems.js` (`hydrateProblem`) sets `mult: 1` for every hydrate, and `tools/validate.js` reports `multipliers {"1":3600}` across 400 seeds. Students never have to read a decimal as a fraction in a graded hydrate problem, which is the hurdle the teacher named. The fraction drills are ungraded.
- Missing: spacing across days; elaboration ("why" questions); retrieval of what each step produces (the recall step only checks order).
- Proposed: (a) decide whether hydrates should include a non-whole multiplier (a teacher decision; real hydrate ratios are whole, so this needs a deliberate data choice) or state on screen that this step is not needed for hydrates; (b) a free-recall prompt before the set (write what each step produces, then check); (c) one "why" after the heat step (why the lost mass is the water) and one after Step 3 (why divide by the smallest); (d) a short mixed review of the formula packages a week later.

### 3. Dual-code
- Strong: the heat scene draws the water leaving; the table keeps each row labelled; the fraction finder pictures each decimal; the lattice and the crucible scene are drawn from the model.
- Missing: the mistake cards are words only; the 5-waters-to-1-salt ratio is never drawn as particles, so "divide by small" stays symbolic.
- Proposed: show the mistaken table beside each card's lines; draw one salt unit with five waters beside Step 2 and Step 3 so the ratio is seen as well as read.

### Erroneous examples (ranked, with the other suggestions below)
- Only two mistake cards. Add a third, drawn from slips the feedback already names: forgetting to subtract the crucible (or adding instead of subtracting), and typing the water's percent for the salt.

### Ranked suggestions
1. The graded set never needs the multiplier (`mult: 1`). Teacher's decision, then a change to `problems.js`. Shared code: copy to the empirical and combustion packages too.
2. Mistake cards: draw the mistaken table beside the words (`drills.js`, shared: copy to all three).
3. Dual code for the ratio: draw one salt with five waters beside Steps 2 and 3 (`scenes.js` and `app.js`, shared: copy to all three).
4. Free-recall prompt before the graded set, replacing the tap-order step (`drills.js` `recallDrill`, shared).
5. Two more mistake cards: crucible not subtracted, water's percent typed for the salt (`problems.js` `Gen.mistakes`, shared).
6. Vocabulary panel (`app.js`, shared).
7. "Why" questions after the heat step and after Step 3 (`app.js`, shared).
8. Spacing: a mixed review of the formula packages a week later (scheduling; not a code change in this package alone).
9. Confidence tick before the first Check in the warm-ups (`work.js`, shared).

Shared code: `src/js` and `src/css` are identical across the hydrate, empirical and combustion packages; only `config.js` differs. Every fix in `src/js` must go into all three packages, or the validators fail.

Validator (run for this review, read-only): `validate: ok (hydrate: 29 compounds, 400 seeds of 6 problems and 3 warm-ups, multipliers {"1":3600}, six periodic tables, judges, drills, largest save 2080 characters, packaging)`.


## 2026-11-14: faded examples, find the mistake, scaffolds that fade

Changes (the teacher chose suggestions 1, 2 and 3 of the cognitive science review):

- **Faded worked examples.** After the Show step example, the warm-ups hand over one step at a time: w-pct (Steps 1 and 2 worked), w-heat (Step 1), then w-lab on its own.
  Worked steps are marked "worked for you" in the step strip.
- **Find the mistake** (Part 2, ungraded): two finished problems each with one wrong step (the whole hydrate counted as water; Cu’s 63.5 used as the molar mass of CuSO₄). The student picks
  the step, then what went wrong, then sees the fix and the right answer. Built by the model (`Gen.mistakes`, `Gen.worked`);
  the validator checks each mistake changes the answer and the unchanged work gives the right one.
- **Scaffolds fade (expertise reversal).** In graded problems the fraction finder is behind a Show fraction finder button. The
  four-step strip stays on screen (the teacher's rule: the steps stay named on screen). Just before the graded set the
  student taps the four steps in order from memory (retrieval of the routine).
- Also: Submit answer on every graded step; Step 1's choice selects, then submits.

### 1. Write for a novice chemist
- Strong: one routine in the teacher's words; worked example, then fading support, then independent graded work; feedback
  names the slip and the next move.
- Missing: the molecular-formula part assumes "molar mass" is fluent from the mole conversions packages.
- Proposed: a one-line reminder of what molar mass means beside Step 5.

### 2. Cognitive science
- Strong: calibration (first submit counts), interleaving in the graded set (percents or grams, every multiplier), plan for
  error (named slips, find the mistake), retrieval of the routine, no opt out (a step must end right).
- Missing: spacing across days, and elaboration (few "why" questions).
- Proposed: a short mixed review a week later; one tap-to-answer "why?" after two example steps (suggestion 4).

### 3. Dual-code
- Strong: the table shows the work as it is done; the fraction finder pictures each decimal; the dimensional analysis setup
  strikes the units that cancel; the opening scene draws the chemistry (heating, burning).
- Missing: the find-the-mistake cards are words only.
- Proposed: show the mistaken table beside the words.

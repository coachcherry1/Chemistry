# Learning review

## 2026-11-18: products shown before the arrows are asked for (zip v4, SCHEMA 5 unchanged)

The teacher: Klein shows the products of a step when it asks for the arrows; asking for arrows with no products on screen was
too much of a stretch and an undesirable difficulty. Every arrow-drawing exercise now shows **reactants, an arrow, then the
products** (`.product-fig`, drawn from the step's `after`): the pattern steps, the concerted step and every graded drawing
in the checkpoints and the final check. Figure 6.31's own step keeps its row of structures (it already shows every product).
The products never give the answer away: the arrows are still the student's to draw. The walkthrough checks the products are
beside every drawing; the layout check still fits 1366 x 520.

- Check 1 (novice): the task is now the textbook's, so a student can see what the arrows must make.
- Check 2 (cognitive science): effort stays on choosing the arrows (desirable difficulty), not on guessing the product.
- Check 3 (dual code): reactants and products on screen together, with the arrows added between them.
- Same change to consider in `substitution-elimination-scorm/` (its arrow steps also show reactants only).

## 2026-11-14 (latest): predictions shuffled (zip v3, SCHEMA 5)

Found by the SN1/SN2/E1/E2 activity's learning review: all five predictions had the right answer first and were never
shuffled, so picking the first choice always won. Each student now sees the choices in a seeded order (the same after a
reload). Generation (check 2) is now real for every prediction.

## 2026-11-14 (later): all six suggestions built (zip v2, SCHEMA 5)

The teacher chose all six suggestions of the first review (below). 28 steps (was 25); the graded set is unchanged in size
(25 per attempt) from a pool of 80 (was 78).

- **No opt out and feedback per wrong choice.** Every wrong choice of every multiple-choice question (66 questions) has its
  own feedback, naming the misconception and the next move. The first answer counts; a wrong one is struck out and the
  student picks again until right before Next appears. A wrong graded drawing is redrawn until right. Show me (after three
  misses, in every drawing) shows the right arrows beside the drawing to copy, instead of finishing it. A reload keeps the
  question open. Walkthrough and validator check it.
- **Worked example, then fading.** Patterns 1 to 4: the first scene is worked (arrows drawn; the student plays it and says
  it in words), the second has one arrow given in grey (or, for the methyl shift, the tail ringed), Pattern 3's third is
  unaided. Name the pattern, Figure 6.31, the concerted step and all checkpoints are unaided.
- **Retrieval, not recognition.** A new step before Checkpoint 3, **The four patterns, from memory**: pick the four out of
  six (homolytic cleavage and ring flip are the decoys, each with its reason), then name four pictures. The four-pattern
  card and its Vocabulary entries are hidden there, for every pattern or sequence question, and for the whole final check.
- **Every checkpoint question that names something draws it.** Checkpoint 1: the H–Cl energy curve (bond broken, bond
  made, why), the cleavage pictures, energy diagrams with a ringed peak or valley, Eₐ and ΔG brackets (the sign only, never
  the word asked for). Later: I⁻ and HS⁻, water and methanol, hydroxide, acetone, the four carbocations, the hydride and
  methyl shifts, the concerted step, the three-step mechanism. The validator fails a question that names one of these and
  draws nothing.
- **Prerequisites, one idea per step, vocabulary.** The intro lists five prerequisites. Thermodynamically favorable is now
  two steps (read exergonic or endergonic from a diagram; then ΔG = ΔH − TΔS); Two patterns at once is two (the concerted
  step; then a sequence of patterns). "Hydride" left the Pattern 3 tiles; "Base" and "Hydride shift" are in Vocabulary.
- **Elaboration and spacing.** A why question in every checkpoint's core (new: why bond breaking takes energy in, why a
  proton transfer needs two arrows; now core: why a carbocation is electrophilic, why it rearranges, why iodide leaving
  takes energy in). The SN1/SN2/E1/E2 activity now opens with a four-pattern warm-up (its own `LEARNING_REVIEW.md`).

### 1. Write for a novice chemist
- Strong now: prerequisites named; a worked example before every pattern; one new idea per step; feedback on every wrong choice.
- Still missing: three Checkpoint 1 questions stay words only (ΔS sign, ΔH > 0 and ΔS > 0, Klein 6.47), since they name
  no species and a picture would give the answer away.

### 2. Cognitive science
- Strong now: no opt out everywhere; retrieval of the four patterns before Checkpoint 3 and in every pattern question;
  spacing into the next package; a why in every core.
- Still missing: spacing across days (a short mixed review a week later), and calibration beyond the first answer (a
  "how sure are you?" before submitting was not built).

### 3. Dual-code
- Strong now: every checkpoint question that names a species or an energy idea draws it.
- Still missing: the energy ledger beside each animation lists bonds in words; the bond it names is not marked on the
  drawing (suggested in the first review under dual code, not in the six built).

## 2026-11-14: first review against the Learning design rule

The package was built before the rule (zip v1, SCHEMA 4). This review covers what students see and do in all 25 steps and the
78-question pool. Nothing is changed yet; the suggestions at the end wait for the teacher's choice.

### 1. Write for a novice chemist
- Strong: one pattern per step in Part 3, named in Klein's words (the four pattern names stay on screen in the reference
  beside Checkpoints 2 to 4); every term is in Vocabulary; wrong arrows get Klein's reason, worked out from the drawing
  ("never start an arrow on a positive charge: it has no electrons to give") and arrows that obey the rules show what they
  would make; Show me after three misses; the teacher's wording rules (no "spontaneous", induction not hyperconjugation).
- Missing:
  - **Prerequisites are not named.** The package assumes Lewis structures with lone pairs, formal charge (every charge
    after an arrow is computed from it), δ+/δ− from electronegativity, 1°/2°/3° carbons, hybridization ("empty p orbital")
    and AP thermodynamics (ΔH, ΔS, ΔG, K). Nothing on screen says so.
  - **No worked example before each pattern.** Reading a curved arrow plays one example, then Patterns 1 to 3 ask the
    student to draw cold. The first drawing is also the first use of the arrow tool, so the tool and the chemistry are
    learnt at the same moment.
  - **Two steps carry two new ideas.** Thermodynamically favorable (ΔG = ΔH − TΔS, the four-sign table, and exergonic and
    endergonic together); Two patterns at once (a concerted drawing, then naming a three-step sequence).
  - Words used before they are defined: "hydride" is a tile in the Pattern 3 sentence before Pattern 4 defines it;
    "base" (the proton-transfer sentence) is never defined here.
- Proposed: a "Before you start" card on the intro listing the prerequisites in one line each; a worked example as the
  first scene of each pattern step (arrows already drawn, the student plays it and fills the sentence), then the next scene
  drawn with one hint (the tail is placed), then unaided; split Two patterns at once into two steps; drop "hydride" from the
  Pattern 3 tiles and add "Base" and "Hydride" to Vocabulary.

### 2. Cognitive science
- Strong:
  - Generation: every Part 1 and 2 step predicts before the reveal; "Name the pattern" before "draw" in Figure 6.31.
  - Interleaving: Patterns 1 to 4 are taught one at a time, then mixed in Name the pattern (8 steps), every checkpoint and
    the final check; Checkpoint 3 always draws one step of a different pattern from its graded drawings.
  - Spacing inside the package: bond breaking endothermic and bond making exothermic return in every animation's ledger,
    in Checkpoint 4 (`d-energy`, core) and the final check (`e-in`).
  - Calibration: first answer and first Check count; a graded Check with nothing drawn is not an answer.
  - Transfer: the final check uses only reactions no step has shown (the validator enforces it).
  - Desirable difficulty: the arrow tool works by tap, drag or keyboard, and the judge ignores arrow order and equivalent heads.
- Missing:
  - **No opt out is not met in the graded questions.** A wrong graded drawing draws the right arrows for the student; a wrong
    choice is highlighted and the student moves on. Neither ends with the student producing the right answer.
  - **Plan for error is weaker in the checkpoints than in the steps.** Each question has one `why`, shown right or wrong; no
    wrong choice gets its own feedback, although the distractors are real misconceptions (the tail shows where the electrons
    end up; a proton transfer takes one arrow; a carbocation rearranges "to get rid of its positive charge").
  - **Retrieval vs recognition.** The four-pattern card beside Checkpoints 3 and 4 defines each pattern, so "Which pattern
    is this?" can be answered by matching the card instead of from memory. The final check has the same reference.
  - **Elaboration is thin in the graded set.** Checkpoint 1 and the final check have no why or how question; Checkpoints 2 to 4
    have 2 or 3 each.
  - **Spacing across packages:** nothing here brings back an earlier package, and the SN1/SN2/E1/E2 package does not open by
    retrieving these four patterns.
- Proposed: after a wrong graded answer (counted wrong), the student redraws until right (Show me after three) or taps the
  right choice and reads why before Next; a `wrong` entry per distractor in `quiz.js`, naming the misconception and the next
  move; hide the four-pattern card during the pattern and sequence questions and the final check (keep Table 6.3, which is
  data), and before Checkpoint 3 have the student pick the four pattern names from memory out of six; one "why" question in
  each checkpoint's core (for example after a graded drawing: "Why does this step need two arrows?"); a four-question warm-up
  of these patterns at the start of `substitution-elimination-scorm/`.

### 3. Dual-code
- Strong: every mechanism is drawn from the model and plays (electrons ride the arrows, bonds break and form, charges land);
  δ+ and δ− and the nucleophilic and electrophilic centres are marked on the molecule; the energy dot moves along the
  diagram as the reaction plays; Figure 6.31 is drawn in the step with its energy diagram growing a hill per step. Students
  work both ways: picture to words (name the pattern, the word-tile sentences) and words to picture (draw "water takes a
  proton from the O⁺").
- Missing:
  - **Checkpoint 1 is almost all words:** 12 of its 13 questions have no picture, including "a valley between two peaks is",
    "a transition state" and "which tells you how fast a reaction goes", which are pictures by nature.
  - Questions that name a species without drawing it (the rule: any question that names a molecule draws it): `b-polar`
    (I⁻, HS⁻), `b-weak` (water, alcohols), `b-spect` (NaOH, LiOH, KOH), `b-co` (C=O), `b-empty` (carbocation), `c-stable`
    (the four carbocations), `c-hmove`, `d-brattack`, `e-in` (iodide leaving).
  - The energy ledger beside each animation lists bonds in words; the bond it names is not marked on the drawing.
- Proposed: energy-diagram figures for the Checkpoint 1 diagram questions (from `energy.js`, as `d-ints` already does) and
  the H–Cl energy curve for `a-break`/`a-make`; drawings for every question in the list above (all molecules are already
  in `scenes.js`); highlight each ledger bond on the drawing as its line fills.

### Suggestions, in order of value
1. **No opt out and per-choice feedback** in the graded questions (`app.js` `ask()`, `quiz.js` `wrong`). Small, every question.
2. **Worked example, then faded, for each pattern** (Parts 3 and 4). Medium.
3. **Retrieval, not recognition:** hide the four-pattern card during pattern and sequence questions and the final check;
   recall the four names before Checkpoint 3. Small.
4. **Draw every checkpoint question** that names a species or an energy idea (about 20 questions). Medium, model already there.
5. **Prerequisites card, two split steps, vocabulary fixes.** Small.
6. **A "why" in every checkpoint core**, and the four-pattern warm-up in the SN1/SN2 package. Small to medium.

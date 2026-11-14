# Learning review

## 2026-11-14 (latest): suggestions 1 to 4 built (zip v6, SCHEMA 3)

The teacher chose suggestions 1 to 4 of the full review below. Steps and pool are unchanged (27 steps; 23 graded from 73).

- **Predictions shuffled.** Each student sees the choices in a seeded order (the same after a reload). The arrow-pushing
  activity's predictions are shuffled too (its zip v3).
- **No opt out and per-choice feedback.** A wrong checkpoint answer counts, is struck out with its own feedback (193
  lines, one per wrong choice, naming the misconception and the next move), and the student picks again until right
  before Next. A reload keeps the question open. Show me now shows the right arrows beside the drawing to copy. A wrong
  drop in the Part 4 sort says what the chosen bin means and where on the card to look, instead of describing the right bin.
- **Retrieval, not recognition.** The three reference drawers are closed and hidden during checkpoints.
- **Drawn.** Every question that names a molecule or a reagent draws it (was 12 of 13 words only in Checkpoint 1):
  each reagent's reacting part with lone pairs and charge, Na⁺ beside MeO⁻, the four carbocations as the choices, the
  chair with its axial Cl, the attack that makes the oxonium ion, and the substrates of three why questions.

### Still open (suggestions 5 to 9)
- Elaboration and interleaving: a why in every core; decision questions in Checkpoints 2 to 4; SN1 stereochemistry
  and a rearrangement in Checkpoint 5.
- Prerequisites card, six Vocabulary terms, the first step split in two.
- Worked example, then fading, in Predict the products; a prediction before each watched-only play; Welcome back.

## 2026-11-14 (later): full review against the Learning design rule (zip v5, SCHEMA 3)

The teacher asked for a cognitive science review of the whole activity: 27 steps and the 73-question pool. It is read from
the code and the step structure, not from watching students. Nothing is changed yet; the suggestions at the end wait for
the teacher's choice. Standing choices are kept: no graded arrow drawing, no reference table beside the checkpoints, and
as many animations as possible.

### 1. Write for a novice chemist
- Strong: Klein's three steps are named in his words and stay in reach (reference drawer); Klein's reasons for wrong
  arrows (`mech.js`); every product card in Predict the products explains itself from the model (`roleWhy`); the reagent
  sort and the decision table explain each wrong drop.
- Missing:
  - **Prerequisites are not named.** The intro assumes the arrow-pushing activity, Newman projections (staggered,
    eclipsed), chairs (axial, equatorial), R and S, E and Z, conjugate acids (Klein ch. 3) and 1°/2°/3° carbons.
  - **Terms used but not in Vocabulary:** polarizable (18 uses), conjugate acid (13), transition state (6),
    rate-determining step (4), oxonium ion (3), spectator ion (2).
  - **The first real step carries four new ideas:** substitution versus elimination, what S, E, N, 1 and 2 mean, the bond
    that breaks in all four, and clicking α and β carbons to classify methyl, 1°, 2° and 3°.
  - **No worked example in Part 5.** Predict the products starts with Klein's worked example 7.7, but the student does it
    cold, and all five problems keep the same scaffold; nothing fades.
  - **Show me finishes the drawing** for the student after three misses, instead of showing arrows to copy.
- Proposed: a "Before you start" card on the intro; the six terms in Vocabulary; split the first step in two (who's who;
  then the α and β carbons and 1°/2°/3°); problem 1 of Predict the products shown worked (each of Klein's steps revealed
  with its reason), problem 2 with step 1 given, problems 3 to 5 unaided; Show me shows the arrows beside the drawing to
  copy, as the arrow-pushing activity now does.

### 2. Cognitive science
- Strong:
  - Generation: 15 predictions before reveals, and every mechanism is drawn by the student before it plays.
  - Spacing: a reagent-function question is core in every checkpoint; the warm-up brings back the arrow-pushing patterns.
  - Calibration: the first submitted answer counts (a click selects, Submit grades).
  - Concrete examples: most ideas have two or more real molecules (two shifts, two substrates for regiochemistry, cis and
    trans rings, two locked chairs and Klein 7.18).
  - Desirable difficulty: arrows, sorts and turns work by tap, drag or keyboard; the arrow judge ignores order.
- Missing:
  - **Every prediction has the right answer first.** All 15 `PREDICT` entries have `answer: 0` and `predictCard` does not
    shuffle, so "pick the first one" always wins and generation can be skipped. (The arrow-pushing activity has the same:
    5 of 5.)
  - **No opt out is not met in the checkpoints.** A wrong answer is highlighted with the right one and the student moves
    on; the student never produces the right answer.
  - **Plan for error is weaker in the checkpoints than in the steps.** Each question has one `why`, shown right or wrong;
    no wrong choice has its own feedback. The step sort of Part 4 says "Look again" with the right bin's description, so a
    miss reveals the answer instead of naming the student's confusion.
  - **Retrieval versus recognition.** The three reference drawers (the four mechanisms, Klein's three steps, Vocabulary)
    stay open under every checkpoint. About 13 of the 73 questions are answered there almost word for word: `c-zaitsev`,
    `c-regiosel`, `d-regiospec`, `d-diaxial`, `c-anti`, `b-rate`, `b-sn1-order`, `c-e1-order`, `b-sn2-mech`, `c-e2-mech`,
    `b-backside`, `b-stereospec`, `b-cation`.
  - **Elaboration is thin in the graded set.** Why or how questions: 3 of 13, 4 of 17, 4 of 16, 4 of 12, and 0 of 15 in
    Checkpoint 5; none is ever core.
  - **Interleaving.** Checkpoint 2 is all substitution and Checkpoint 3 all elimination, so "SN2 or E2?" is first asked in
    Part 5. Within the parts each idea is practised in a block.
  - **Spacing across the activity and across days.** Checkpoint 5 and the predict problems never return to SN1
    stereochemistry or carbocation rearrangements. The activity is about 50 minutes and saves progress, so many students
    will finish it on another day, and nothing on return asks them to recall what they did before.
  - **Watched-only animations.** The plays in the regiochemistry step and in predict problems 2 to 5 have no question
    before Play, so they are watched, not predicted.
- Proposed: shuffle the prediction choices (seeded per student), here and in the arrow-pushing activity; after a wrong
  checkpoint answer, the student picks again until right before Next (the first answer still counts), with a `wrong` line
  per distractor (the product-picture questions can take theirs from `roleWhy`, as Predict the products already does); hide
  the reference drawers during checkpoints (the drawers stay in every step); one why question in every checkpoint's core and
  three in the Checkpoint 5 pool; one "SN2 or E2?" or "SN1 or SN2?" decision question in the pools of Checkpoints 2 to 4;
  one SN1-stereochemistry and one rearrangement question in Checkpoint 5's pool; a "Welcome back" of three short questions
  from finished parts when a student resumes after a day or more (never graded); a one-tap prediction before each
  watched-only play ("Which β H does t-BuO⁻ take?", "Where does the C–Br pair go?").

### 3. Dual-code
- Strong: every mechanism the student draws plays from the model (electrons ride the arrows, bonds fade or grow, atoms
  glide, charges move) with a caption, beside an energy diagram whose marker follows; SN2 in 3D beside its energy diagram;
  Newman projections beside 3D models; chairs beside their Newman projections; the Part 4 sort is drawn out; 14 of 15
  Checkpoint 5 questions draw their molecules.
- Missing:
  - **Checkpoint 1 is words only: 12 of 13 questions,** including both core reagent-function questions. The reagent is the
    picture here: the charge and lone pairs of HS⁻, the bulk of t-BuO⁻, DBU's crowded N.
  - Other questions that name a species and draw nothing: `b-cation` (four carbocations), `b-oxonium`, `c-zaitsev`,
    `d-count` (a chair), and the function questions in Checkpoints 2 to 5 (NaN₃, t-BuOK, NaH, H₂O).
- Proposed: draw the reagent's reactive species in every reagent question (`Mech.reagent` already builds it, with lone
  pairs and charge), and draw the species in the other questions above; the validator fails any question that names a
  species and draws nothing, as in the arrow-pushing activity.

### Suggestions, in order of value
1. **Shuffle the predictions** (all 15 have the answer first; the arrow-pushing activity's 5 too). Small.
2. **No opt out and per-choice feedback** in the checkpoints; Show me shows arrows to copy; the Part 4 sort names the
   student's confusion. Medium: about 50 text questions need a line per distractor; picture questions use `roleWhy`.
3. **Retrieval, not recognition:** hide the three reference drawers during checkpoints. Small.
4. **Draw every checkpoint question that names a species** (Checkpoint 1 first). Medium; the model draws all of them.
5. **A why in every checkpoint core, and decision questions mixed into Checkpoints 2 to 4;** SN1 stereochemistry and a
   rearrangement back in Checkpoint 5. Small to medium.
6. **Prerequisites card, six Vocabulary terms, and the first step split in two.** Small.
7. **Worked example, then fading, in Predict the products.** Medium.
8. **Active animations:** a one-tap prediction before each watched-only play. Medium.
9. **Welcome back:** three ungraded recall questions when a student resumes on a later day. Medium.

## 2026-11-14: the four-pattern warm-up (zip v5, SCHEMA 3)

Change: a first step, **Warm-up: the four patterns**, suggested by the arrow-pushing activity's learning review (spacing
across packages). Students name, from memory, the pattern in four steps of this activity's own mechanisms: the three SN1
steps of 2-bromo-2-methylpropane in ethanol (loss of a leaving group, nucleophilic attack, proton transfer) and a hydride
shift. Never graded. A wrong name says what that pattern looks like and the student picks again. The validator checks that
the four steps are one of each pattern. This entry covers the warm-up only; the rest of the activity has not yet been
reviewed against the Learning design rule.

### 1. Write for a novice chemist
- Strong: it names its prerequisite (the arrow-pushing activity) and uses Klein's four names, the same words as that activity.
- Missing: nothing new is taught here, so no definitions are needed beyond the feedback on a wrong pick.

### 2. Cognitive science
- Strong: retrieval (no pattern reference on screen), spacing (the earlier package comes back), and a preview of the SN1
  steps students draw later in Part 2; no opt out (a wrong pick is put right).
- Missing: a full review of Parts 1 to 5 against the rule.
- Proposed: review the whole activity when it is next changed.

### 3. Dual-code
- Strong: every step is drawn from the model with its curved arrows; the student reads the picture into words.

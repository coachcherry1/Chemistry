# Titration Curves: strong acids, weak acids and the equivalence point

A SCORM 1.2 activity for Schoology, for AP Chemistry (Unit 8, acids and bases). Students watch a **particle diagram
change at five points of a titration curve**, first for a strong acid (HCl) and then for a weak acid (HF), both
titrated with NaOH, and find out why the equivalence point is exactly pH 7 for the first and above 7 for the second.
A review checkpoint repeats the reasoning with a different weak acid, acetic acid. **Conceptual only**: nobody calculates
a pH. About 40 minutes. Same look, controls, saving and grading as the other activities in this repository.

**The key objective:** the equivalence point is where moles of base equal moles of acid, and its pH is set by the ions
left in the flask. Na⁺ and Cl⁻ do not react with water (pH 7). The conjugate base of a weak acid does, and makes OH⁻
(pH above 7).

---

## What students do

| Part | Steps | What happens |
| --- | --- | --- |
| 1 Strong acid | 2 + checkpoint | **What a titration does:** predict how much NaOH reaches the equivalence point of 25.00 mL of 0.100 M HCl; the flask appears as 24 H⁺ and 24 Cl⁻. **HCl and NaOH, five points:** start, half-equivalence point, before equivalence, equivalence, after. At each, predict what is in the flask (the diagram then changes) and what decides the pH (the pH and a numbered dot appear on the curve). Then a slider explores the whole curve. **Checkpoint 1** (4 questions). |
| 2 Weak acid | 3 + checkpoint | **A weak acid is different from the start:** predict which of two flasks of the same amount of acid has more H⁺; HF has 2 ions in 24, HCl 24. **HF and NaOH, five points**, the same way: mostly whole HF, then a buffer, equal HF and F⁻ at the half-equivalence point (pH is about the pKa), only F⁻ at equivalence. **Side by side:** both titrations at one point at a time, with what is different. **Checkpoint 2** (4). |
| 3 Why they differ | 2 + checkpoint | **Click the particle that decides the pH** in both flasks at equivalence: nothing in HCl, F⁻ in HF, with a reason for each wrong click. Then F⁻ + H₂O → HF + OH⁻ is shown (one sample ion, with the real fraction stated). **Sort eight titrations** into "exactly 7" and "above 7". **Checkpoint 3** (4). |
| 4 Read the curve | 2 + checkpoint | **Match** five particle diagrams of the HF flask to their numbered points on the curve (drag, or click a diagram and then a point). **Find the points:** which curve is the weak acid, then move a marker to the half-equivalence point and the equivalence points. **Checkpoint 4** (4). |
| 5 Review | checkpoint | **Checkpoint 5** (4): acetic acid is weaker than HF. Rank the equivalence points, say what decides the pH, read the half-equivalence point from the pKa. |

Every prediction, sort, match and click has to be finished to move on, but none of them is graded. A wrong answer is
explained on the spot, for example *Na⁺ comes from a strong base: it does not take H⁺ from water or give H⁺ to it, so it
does not change the pH.* A card dropped in the wrong box of the sort is explained by its own acid and ions.

**Sized for a Chromebook.** Whatever a student works with is on screen together at 1366 x 650 and in a 1366 x 520 LMS
frame, and down to a 900 x 600 window: the question, the particle diagram and the curve of a walk; both flasks of the
side-by-side step; the particles to click and the button below them; the cards and the boxes; the diagrams, the
points and the curve of the match; the graph and the task; a checkpoint question with its figure and all its choices.
`tools/layout.js` checks all of it. **Back** and **Next** sit above each step as well as below it.

---

## The chemistry, and the teacher's choices

- **Two titrations in the lessons, one more in the review.** 25.00 mL of 0.100 M acid in the flask, 0.100 M NaOH in the
  buret. HCl (strong); **HF** (weak, Ka 6.8 x 10⁻⁴, pKa 3.17), chosen because its anion F⁻ is a simple ion; acetic acid
  (Ka 1.8 x 10⁻⁵, pKa 4.74) for Checkpoint 5 only, drawn as HAc and Ac⁻.
- **Five points**, in NaOH units of 25/24 mL: the start (0), the half-equivalence point (12), before equivalence (18),
  equivalence (24) and after (30). The term is *half-equivalence point*, as the class uses it.
- **24 acid units in every diagram.** 24 divides by 2, 3, 4 and 6, so each point lands on whole particles. **Water is
  not drawn**, and the screen says so. A weak acid is drawn as weak: 2 of 24 HF have ionized at the start (about 8%, the
  real ratio); acetic acid is about 1 in 75 ionized, so none is drawn, and a note says why.
- **Spectators and the conjugate base.** Na⁺ never changes the pH. A weak acid's conjugate base reacts with water;
  at the HF equivalence point only about 1 F⁻ in 58,000 does, far too few to draw, so the step draws one as a sample
  and says that it is.
- **Left out on purpose:** pH, pKa and Ka calculations, ICE tables, the Henderson-Hasselbalch equation, buffer
  capacity, indicators, polyprotic acids and weak base titrations (a good second activity). A **reference table**
  (Ka and pKa of the acids, with the particle key) sits beside every checkpoint instead.

## Alignment with the AP Chemistry CED

Checked against the AP Chemistry Course and Exam Description (2024, Course Framework V.1, Unit 8, pp. 143 to 158).

| CED | What the activity does |
| --- | --- |
| 8.5.A.1 titration curve, pH against volume of titrant | Every curve; Part 4 reads them (suggested skill 5.D, graphical information) |
| 8.5.A.2 at equivalence, moles of titrant equal moles of analyte, for strong and weak | Setup step; `a-equiv-def`, `b-same-volume`, `d-eq-vol` |
| 8.5.A.3 half-equivalence point: [HA] = [A⁻], so pH = pKa | HF walk, point 2; `b-half-count`, `b-half-pka`, `b-half-why`, `d-half-mark`, `e-half` |
| 8.5.A.4 pH at equivalence is set by the major species: neutral for strong/strong; for a weak acid the conjugate base reacts with water and makes the solution basic | Part 3; `a-ss-eq-*`, `b-ws-eq-*`, `c-*`, Checkpoint 5 |
| 8.4.A.1 and 8.4.A.2 H⁺ + OH⁻ and HA + OH⁻ → A⁻ + H₂O; buffer while the acid is in excess; excess OH⁻ sets the pH after; A⁻ + H₂O ⇌ HA + OH⁻ at equimolar | The two walks; `a-react`, `a-after-ph`, `b-buffer`, `c-react-eq`, `e-after` |
| 8.3.A.1 a weak acid ionizes only a little | Compare step; `b-hf-ionize`, `b-count-start`, `b-start-higher` |
| 8.8.A.1 a buffer holds both members of a conjugate pair; the acid reacts with added base, the conjugate base with added acid | Buffer wording throughout, `b-buffer`, vocabulary |
| 6.C particulate representations (the CED recommends them with the half-equivalence point) | The particle diagram at every point |

Not covered, on purpose (conceptual activity about strong against weak acids): weak base with strong acid (8.4.A.3, the second half of
8.5.A.4), polyprotic acids (8.5.A.5), indicators and their pKa (8.7.A.2 and 8.7.A.3), pH, pKa and percent ionization calculations (8.1 to
8.3, the pH of a titration point in 8.4, 8.9), buffer capacity (8.10). The CED notes that students often confuse the half-equivalence point,
the equivalence point and the end point; this activity teaches the first two and leaves out the end point with the indicators.
The CED accepts both H⁺ and H₃O⁺; the activity uses H⁺ and says so under the acid table, along with 25 °C.

## How it is built

One model makes every number a student sees.

- `titration.js` solves the pH of each flask exactly from a charge balance, then turns the amounts into whole particles
  (rounded, and checked to keep the charge balanced at every slider position). The particle diagram, the pH reading,
  the curve, what decides the pH, every prediction and every checkpoint answer come from it, so they cannot disagree.
- `particles.js` draws the flask: every particle has a fixed place, so ions fade in and out while the rest stay put.
- `curve.js` draws the pH curve from the same numbers, with the numbered points, the live dot and the click, drag or
  arrow-key marker.
- `quiz.js` holds 54 questions. Each one that reads the model carries a `fact` that `tools/validate.js` checks.
- `app.js` has the steps, the saving and the scoring; `picker.js` is the shared drag, click and keyboard placement.

## Grading

**A score, from the five checkpoints only.** 20 questions per attempt (4 + 4 + 4 + 4 + 4); the **first answer** to
each counts. The SCO writes `cmi.core.score.raw` (0 to 100) after every answer, out of all 20; `lesson_status` becomes
`completed` on the results screen. There is no `masteryscore`. Each answer is also a `cmi.interactions` record.
Each checkpoint always asks its **core** questions (★ in `ANSWER_KEY.md`) and fills the rest at random from its pool, so a
retake sees a different mix. A retake keeps the best score.

Progress is saved to `cmi.suspend_data` (about 1.3 KB of the 4 KB allowed); `localStorage` is used only when the page runs
without an LMS. The save carries a schema version (`SCHEMA` in `src/js/app.js`): **bump it whenever you change the step
list, a quiz pool or the five points.** The SCORM identifiers (`TITRATION_*`) and the save key
(`titration-curves-state`) differ from every other package's, so all can sit in one course.

---

## Building and uploading

```bash
./build.sh                 # dist/titration-curves-v1.zip
./build.sh some-name       # dist/some-name.zip
```

`imsmanifest.xml` has to sit at the root of the zip, which is why `build.sh` zips from inside `src/`. In Schoology: **Add
Materials, Add File/Link/External Tool, Add File**, upload `dist/titration-curves-v1.zip`, enable the gradebook column,
then open it once as a student and check that the badge reads **Connected to the LMS**. The built zip is committed.

### Testing without an LMS

Open `src/index.html` in a browser. Everything works; the badge reads *Standalone* and nothing is reported.

### Teacher links for class

```
src/index.html?step=ws-walk          jump to any step (ids or numbers 1 to 15) to preview it
src/index.html?step=quiz-C&all       a checkpoint with every question in its pool
```

Neither saves progress or reports anything. Step ids: `setup`, `ss-walk`, `quiz-A`, `compare`, `ws-walk`, `side`, `quiz-B`,
`why`, `pairs`, `quiz-C`, `match`, `find`, `quiz-D`, `quiz-E`, `results`.

---

## Editing the content

| File | What it holds |
| --- | --- |
| `src/js/titration.js` | The acids, the five points, the pH solver, the particle counts, what decides the pH, the pairs to sort |
| `src/js/quiz.js` | The checkpoint questions. The correct choice is written **first**; the order is shuffled on screen. `fact` ties an answer to the model; `diagram` and `curve` draw a figure beside the question. |
| `src/js/app.js` | The step list (`STEPS`), the instructions above each step, the five-point stories, the results and the words to know |

After any edit:

```bash
node tools/validate.js                    # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh
node tools/walkthrough.js                 # Playwright, fake LMS; SHOTS=dir DARK=1 optional
node tools/layout.js                      # Playwright: fits a Chromebook (1366x650, 1366x520 LMS frame)
```

`tools/validate.js` re-derives the pH values and particle counts a second way (closed-form formulas and hand-worked
numbers) and refuses an activity where: a pH, a count or a charge balance disagrees; a curve is not rising, is steepest
anywhere but at the equivalence point, or the weak acid is not above the strong one before it; a checkpoint answer
disagrees with the model, a pool is too small, two choices are the same, or the right answer is the longest choice; a
number quoted in a question is not one the model produces; student text calculates or uses a term outside the class's;
the manifest leaves out a file, or an identifier or the save key matches another package's; or the saved state could outgrow
4 KB.

`tools/walkthrough.js` plays the whole activity in a headless browser against a fake LMS: it checks that the particles on
screen match the model at every point and slider position, answers some predictions wrongly on purpose, clicks the wrong
particle, sorts and matches wrongly first, reloads halfway through a walk, and checks the score, status and interaction
records that arrive and that a retake keeps the best score.

## Layout

```
titration-curves-scorm/
├── src/
│   ├── imsmanifest.xml   SCORM 1.2 manifest, must be at the zip root
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── util.js       small DOM and random-number helpers
│       ├── titration.js  the titration model
│       ├── particles.js  the particle diagram of the flask
│       ├── curve.js      the titration curve
│       ├── picker.js     drag, click or keyboard placement
│       ├── quiz.js       checkpoint questions
│       ├── scorm.js      SCORM 1.2 run-time wrapper
│       └── app.js        steps, saving, scoring
├── tools/
│   ├── validate.js       chemistry and item-bank checks
│   ├── answer-key.js     regenerates ANSWER_KEY.md
│   ├── walkthrough.js    end-to-end browser test (optional)
│   └── layout.js         Chromebook fit test (optional)
├── build.sh
├── ANSWER_KEY.md         generated
└── README.md
```

No CDN, no web fonts, no WebGL, no network calls: it works offline inside a locked-down LMS iframe and on a Chromebook.

## Accessibility

Everything works by mouse, touch or keyboard: choices, particles, cards and boxes are buttons (Tab, Enter); a card can be
dragged or picked and then placed; the graph marker moves with the arrow keys; the slider is a standard range input. Every
particle diagram and curve has a text description (the counts of each particle), feedback goes through a live region, a
particle is always labelled with its symbol (colour is never the only signal), the page follows the system light and dark
setting, and `prefers-reduced-motion` turns the fading and moving off.

# Newman Projections — Conformations and Strain

A SCORM 1.2 activity for Schoology. Students build Newman projections from wedge/dash drawings,
turn the molecules in 3D, watch the energy curve draw itself as they rotate, and answer graded
checkpoint questions on torsional strain, gauche interactions and the best staggered conformation.

Written for a high-school organic elective using Klein, *Organic Chemistry*: kJ/mol throughout,
Klein's strain-table values, and no R/S or *meso* vocabulary (the last part sets that unit up
without naming it). About 35 minutes.

---

## What students do

| Part | Steps | What happens |
| --- | --- | --- |
| 1 Ethane | 6 | Swing a 3D model round to look down the C–C bond. Build the Newman projection from a wedge/dash drawing (one red and one blue H to track). **Sketch a predicted energy curve**, then turn the back carbon through 360° — the real curve fills in only where they have turned it, laid over their sketch. Label the peaks and valleys. **Checkpoint 1** (4 questions). |
| 2 Butane | 5 | Build butane down C2–C3, predict, rotate, label anti / gauche / eclipsed / totally eclipsed. At every named angle the readout shows where the number comes from, e.g. `CH₃/CH₃ eclipsed 11 + H/H eclipsed 2 × 4 = 19 kJ/mol`. **Checkpoint 2** (5). |
| 3 Substituted butanes | 6 | Build 2-bromobutane (C2 is now a stereocentre, so the wedge and dash matter). **Predict** which group goes anti to the back CH₃, then rotate to the minimum and lock it in. Swap the Br for Cl, I, CH₃, CH(CH₃)₂ and C(CH₃)₃ — predicting each time — and compare curves. **Checkpoint 3** (4). Build 2,3-dimethylbutane, **predict** the gauche count, find the best conformation. |
| 4 Wedges & dashes | 4 | Build "Molecule A" and "Molecule B" — both 2,3-dibromobutane, differing only in one wedge. **Predict**, then turn each until the Br atoms are anti: A's CH₃ groups end up anti, B's gauche. **Predict** what changes with Cl and I, and switch halogens to see. **Checkpoint 4** (5). |

Every build, graph and prediction has to be finished to move on, but none of them is graded.
A wrong build gets specific feedback and another try:

- *wrong groups on a carbon* — names what each carbon should carry;
- *front and back swapped*;
- *two groups swapped on one carbon* — "that makes a different molecule, not a different view; check
  which group is on the wedge and which is on the dash";
- *right molecule, wrong conformation* — "in the zigzag the two chain groups point opposite ways, so
  they must be anti".

After one miss a tip appears; after two, a "Show me in 3D" button opens the drawing as a 3D model
they can turn to the view from the eye. Turning the whole projection by 120° is accepted — it is the
same picture with your head tilted.

Molecules A and B are only ever called "Molecule A" and "Molecule B". A is the *meso* compound and
B is (2R,3R); the closing question asks whether rotation can turn one into the other and says
"you will learn the name for this relationship in the next unit".

---

## Grading

**A score, from the four checkpoints only.** 18 questions per attempt (4 + 5 + 4 + 5); the
**first answer** to each counts. The SCO writes `cmi.core.score.raw` (0–100) after every answer,
out of all 18, so a student who stops halfway shows the credit earned so far. `lesson_status`
becomes `completed` on the results screen. There is no `masteryscore`, so the LMS will not overwrite
the status with passed/failed.

Each graded answer is also written as a `cmi.interactions` record (question id, letter chosen,
right/wrong) for LMS reports that show them. The question ids are listed in `ANSWER_KEY.md`.

Each checkpoint always includes its **core** questions (★ in the answer key) and fills the rest at
random from a larger pool, so a retake sees a different mix. 40 questions in all.

Answered questions stay answered: re-opening the activity resumes where the student left off and
does not allow re-answering. To give a student a fresh attempt, reset their attempt in Schoology.

Progress is saved to `cmi.suspend_data` (about 1.3 KB of the 4 KB allowed) and mirrored to
`localStorage`. The save carries a schema version (`SCHEMA` in `src/js/app.js`): **bump it whenever
you change the step list, a quiz pool or a molecule**, or a student resuming an old save will carry a
stale set of questions.

---

## The chemistry model

### Where the curves come from

Every energy is a **sum of strain-table entries**, exactly as students add them by hand. Each pair of
groups, one on the front carbon and one on the back, costs its *eclipsed* value at 0°, its *gauche*
value at 60°, and nothing at 120° or 180°. Between those angles the curve is the smoothest one through
them (a short cosine series), which reproduces the textbook shapes: ethane is 6(1 + cos 3φ), and
butane's curve passes exactly through 19, 3.8, 16 and 0.

So the graph never disagrees with the table. Klein's four values are used unchanged:

| Interaction | Eclipsed | Gauche |
| --- | ---: | ---: |
| H / H | 4 | — |
| CH₃ / H | 6 | — |
| CH₃ / CH₃ | 11 | 3.8 |

### Halogens and branched groups — read this before teaching Part 3

Klein's table stops at CH₃. The other rows are built from measured data and are marked * in the
strain table students see. Two results may differ from what students — or a quick textbook answer
key — expect:

1. **A halogen next to H or CH₃ crowds it *less* than a CH₃ does.** Br/CH₃ gauche costs about
   1 kJ/mol against 3.8 for CH₃/CH₃, because the C–Br bond is long (1.94 Å vs 1.54 Å) and holds the
   big atom away from its neighbours. The value is half the cyclohexane axial–equatorial difference
   (A-value), the same reasoning that makes axial methylcyclohexane cost 2 × 3.8. So in
   **2-bromobutane the best conformation has CH₃ anti to CH₃, not Br anti to CH₃.** The activity asks
   students to predict this first, because most will guess Br.
2. **Cl, Br and I are about the same against H and CH₃.** Bigger atom, longer bond; the two cancel
   (A-values Cl 0.53, Br 0.48, I 0.47 kcal/mol). Where the halogens really differ is **against each
   other**: halogen/halogen gauche costs Cl 5, Br 7, I 9 kJ/mol (1,2-dihaloethane gauche–anti
   differences; the iodine value is extrapolated). That is where the activity makes the Br-vs-Cl
   comparison, in Part 4.

Branched groups use the same A-value reasoning: CH(CH₃)₂/CH₃ gauche 4.6, C(CH₃)₃/CH₃ gauche 11.4.

H/X eclipsed values come from the measured rotation barriers of CH₃CH₂X (Cl and Br 15.5, I 13.4 kJ/mol)
minus two H/H eclipsing costs. The remaining eclipsed values (CH₃/X, X/X, the branched groups) are
estimates; no checkpoint question depends on them — they only set the heights of the eclipsed peaks.

**Fluorine is left out on purpose.** 1,2-Difluoroethane prefers *gauche* (the gauche effect). A size
model would teach the wrong answer, and the real explanation is beyond this course.

If you teach halogen size differently and want the activity to match, edit `src/js/strain.js` and
run the validator — it will tell you which questions and predictions then need rewording.

### Builds are computed from the drawing

Each molecule is authored as its wedge/dash drawing (which group is in the page, on the wedge, on the
dash). The Newman projection a student must build, the 3D model and the energy curve are all
**computed** from that drawing, so the answer key cannot disagree with the picture. Looking from the
eye with the front chain group straight up, every wedge lands on the left of the Newman projection
and every dash on the right; `tools/validate.js` checks this.

---

## Building and uploading

```bash
./build.sh                       # → dist/newman-projections-v1.zip
./build.sh newman-unit4-practice # → dist/newman-unit4-practice.zip
```

`imsmanifest.xml` has to sit at the root of the zip, which is why `build.sh` zips from inside `src/`.
Zipping the `src` folder itself produces a package Schoology rejects.

To upload:

1. In your Schoology course, **Add Materials → Add File/Link/External Tool → Add File** and upload
   `dist/newman-projections-v1.zip`, or use **Add Materials → Package** if your install shows it.
2. Schoology detects the SCORM manifest and creates a SCORM item.
3. Open the item's settings and enable the gradebook column. It receives the 0–100 score.
4. Open it once as a student (Preview as Student) and check that the badge in the top right reads
   **Connected to the LMS**.

If that badge reads **Standalone — no LMS detected** inside Schoology, the SCO could not find the
SCORM API — almost always because Schoology served the zip as a plain file rather than launching it
as SCORM.

A built `dist/newman-projections-v1.zip` is committed, so you can upload it without running anything.

### Testing without an LMS

Open `src/index.html` in a browser. Everything works; the badge reads *Standalone* and nothing is
reported. A *Start over* button on the results screen clears the saved progress.

### Teacher links for class

```
src/index.html?explore              free rotation of any molecule, with its curve — for the board
src/index.html?explore=pairB_Br     start on one molecule (ids are listed in ANSWER_KEY.md)
src/index.html?step=trace-butane    jump to any step (ids or numbers 1–22) to preview it
```

Neither mode saves progress or reports anything.

---

## Editing the content

| File | What it holds |
| --- | --- |
| `src/js/strain.js` | The strain table, with the source of every number |
| `src/js/molecules.js` | Every molecule, as its wedge/dash drawing |
| `src/js/quiz.js` | The checkpoint questions. The correct choice is written **first**; the order is shuffled on screen. `why` is the explanation shown after answering. |
| `src/js/app.js` | The step list (`STEPS`), the prediction questions and the build feedback wording |

After any edit:

```bash
node tools/validate.js                  # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh
```

`tools/validate.js` refuses an activity where:

- ethane or butane no longer give Klein's 12 / 19 / 16 / 3.8;
- any curve has a valley that is not staggered or a peak that is not eclipsed, or a staggered
  conformation that is not below every eclipsed one;
- a wedge does not land on the left of the Newman projection or a dash on the right;
- Molecule A is not centrosymmetric with its halogens anti, or B's CH₃ groups are not gauche then;
- a build accepts any arrangement other than the right answer turned 0°, 120° or 240° (it tries every
  arrangement of the six groups);
- a prediction's key or a question's answer no longer matches the strain table;
- a quiz pool is smaller than its draw, or a question id cannot be a SCORM interaction id.

`tools/walkthrough.js` (optional, needs Playwright) plays the whole activity in a headless browser
against a fake LMS — wrong builds, wrong answers, a reload halfway — and checks the score, status
and interaction records that arrive.

To shorten the activity, lower `draw` in `src/js/quiz.js` or remove steps from `STEPS` in
`src/js/app.js`, then bump `SCHEMA`.

---

## Layout

```
newman-projections-scorm/
├── src/
│   ├── imsmanifest.xml   SCORM 1.2 manifest — must be at the zip root
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── groups.js     substituents and element colours
│       ├── strain.js     the strain table and the energy model
│       ├── geometry.js   wedge/dash → Newman angles → 3D coordinates
│       ├── molecules.js  the molecules
│       ├── draw.js       Newman projections, the build template, the zigzag
│       ├── viewer3d.js   ball-and-stick / space-filling 3D on a canvas
│       ├── graph.js      energy vs. dihedral angle
│       ├── picker.js     drag, click or keyboard placement
│       ├── quiz.js       checkpoint questions
│       ├── scorm.js      SCORM 1.2 run-time wrapper
│       └── app.js        steps, saving, scoring
├── tools/
│   ├── validate.js       chemistry and item-bank checks
│   ├── answer-key.js     regenerates ANSWER_KEY.md
│   └── walkthrough.js    end-to-end browser test (optional)
├── build.sh
├── ANSWER_KEY.md         generated
└── README.md
```

No CDN, no web fonts, no WebGL, no network calls: it works offline inside a locked-down LMS iframe
and on a Chromebook.

## Accessibility

Every placement works by drag, by click-then-click, and by keyboard (Tab to a group, Enter; Tab to a
position, Enter). The molecule turns with a slider as well as by dragging, and the arrow keys keep
turning past 360°. Prediction dots move with the arrow keys. Drawings carry text descriptions,
feedback is announced through a live region, colours are never the only signal, the page follows
the system light/dark setting, and `prefers-reduced-motion` turns off the animations.

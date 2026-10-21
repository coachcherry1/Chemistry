# Newman Projections: Conformations and Strain (qualitative, no calculations)

A SCORM 1.2 activity for Schoology. Students build Newman projections from wedge/dash drawings,
turn the molecules in 3D, watch the energy curve draw itself as they rotate, and answer graded
checkpoint questions on torsional strain, gauche interactions and the best staggered conformation.
**Every checkpoint question is qualitative** (compare, rank, identify, explain), and the strain
table sits open beside the questions. Nothing has to be calculated.

Written for a high-school organic elective using Klein, *Organic Chemistry*: kJ/mol throughout,
Klein's strain-table values, and no R/S or *meso* vocabulary (the last part sets that unit up
without naming it). About 35 minutes.

---

## This package and its twin

This is the version **without calculations**. Students still see energies (the graph's axis, the
strain table, the breakdown under the rotating projection), but no question asks them to add
anything up. Instead they compare and rank: *which conformation is higher?*, *rank butane's
conformations*, *which staggered conformation of 2-bromobutane is highest?*, *why is a Br/Br gauche
interaction worse than a Br/CH₃ one?* The strain table is open beside every checkpoint question:
Klein's three H/CH₃ rows for checkpoints 1–2, the full table for 3–4.

The version **with calculations** is a separate SCORM package in its own folder,
[`newman-projections-scorm`](../newman-projections-scorm). It has the same builds, rotations,
graphs and predictions; some of its checkpoint questions ask for an energy from the table.

The two packages have different course titles, SCORM identifiers and saved-progress keys, so both
can sit in one Schoology course (say, one per section) with their own gradebook columns.

The two folders share all their code except the question bank (`src/js/quiz.js`) and a few lines of
wording. A fix to anything else (the drawings, the 3D model, the graph, saving, scoring) belongs
in both folders.

---

## What students do

| Part | Steps | What happens |
| --- | --- | --- |
| 1 Ethane | 6 | Swing a 3D model round to look down the C–C bond. Build the Newman projection from a wedge/dash drawing (one red and one blue H to track). **Sketch a predicted energy curve**, then turn the back carbon through 360°. The real curve fills in only where they have turned it, laid over their sketch. Label the peaks and valleys. **Checkpoint 1** (4 questions). |
| 2 Butane | 5 | Build butane down C2–C3, predict, rotate, label anti / gauche / eclipsed / totally eclipsed. At every named angle the readout shows where the number comes from, e.g. `CH₃/CH₃ eclipsed 11 + H/H eclipsed 2 × 4 = 19 kJ/mol`. **Checkpoint 2** (5). |
| 3 Substituted butanes | 7 | Build 2-bromobutane with the **eye on the right**, so C3 is in front. C2 is now a stereocentre, so the wedge and dash matter. **Predict** which group goes anti to the back CH₃, then rotate to the minimum and lock it in. **Bond length:** predict which of CH₃, Cl, Br and I crowds a gauche CH₃ the most, then compare them in a space-filling model and a to-scale drawing of their electron clouds, and predict what a short bond would do to a Br. Swap the Br for Cl, I, CH₃, CH(CH₃)₂ and C(CH₃)₃, predicting each time, and compare curves. **Checkpoint 3** (4). Build 2,3-dimethylbutane (eye on the right again), **predict** the gauche count, find the best conformation. |
| 4 Wedges & dashes | 4 | Build "Molecule A" (eye on the left) and "Molecule B" (eye on the right). Both are 2,3-dibromobutane and differ only in one wedge. **Predict**, then turn each until the Br atoms are anti: A's CH₃ groups end up anti, B's gauche. **Predict** what changes with Cl and I, and switch halogens to see. **Checkpoint 4** (5), which always includes a drawing with the eye on the right and four Newman projections to choose from. |

### Where the eye is

The eye is not always on the left. Three builds (2-bromobutane, 2,3-dimethylbutane and Molecule B)
look down the bond from the right-hand end, so the right-hand carbon (C3) is in front and C2 is the
circle. A student who has learned "the left carbon goes in front" gets these wrong and has to work out
which carbon is nearer the eye. The tips, the 3D model's "Down the C3–C2 bond" button and the
checking all follow the eye. In the answer key each build says which end the eye is at.

Every build, graph and prediction has to be finished to move on, but none of them is graded.
A wrong build gets specific feedback and another try:

- *wrong groups on a carbon*: names what each carbon should carry;
- *front and back swapped*;
- *two groups swapped on one carbon*: "that makes a different molecule, not a different view; check
  which group is on the wedge and which is on the dash";
- *right molecule, wrong conformation*: "in the zigzag the two chain groups point opposite ways, so
  they must be anti".

A **Turn view 180°** button on the build template and on every rotatable projection turns the
Newman projection upside down, so the front chain group can point *down*, the way the zigzag looks
from the eye, instead of up. It is only a view (a projection turned as a whole is the same
projection), so builds are checked the same way either way up. The choice is remembered for the rest
of the activity, and the 3D "down the bond" view, quiz figures and graph thumbnails follow it.

**Sized for a Chromebook.** On every step where a molecule turns, the Newman projection and the
energy graph sit side by side (with the 3D model beside them when there is room), so a student
turning the molecule watches the curve grow without scrolling or zooming out. This holds on a
1366 × 650 browser tab and in a frame as short as 520 px. On a narrower window the graph sits beside
the Newman projection and stays in view as the page scrolls. After a prediction, the page scrolls just
far enough to bring the molecule and graph on screen. **Back** and **Next** appear above each step as
well as below it.

Every Newman projection labels all six groups, H included, down to the small ones under the graphs.
A bare bond with no label reads as a methyl to a beginner. In the small eclipsed drawings a back
label that would run into the front label beside it is written on its other side.

After one miss a tip appears; after two, a "Show me in 3D" button opens the drawing as a 3D model
they can turn to the view from the eye. Turning the whole projection by 120° is accepted, because it is
the same picture with your head tilted.

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

Any question that names a substituted molecule shows its **bond-line formula** with the carbons
numbered and the bond being looked down highlighted; the swap step shows one for each molecule too.
They are listed in `SKELETAL` in `src/js/molecules.js`, and attached to a question with `struct`.

Each checkpoint always includes its **core** questions (★ in the answer key) and fills the rest at
random from a larger pool, so a retake sees a different mix. 51 questions in all.

**Retakes.** Re-opening the activity resumes where the student left off. Once they reach the
results screen, a **Start a new attempt** button (with an "are you sure?" step) clears every answer,
build and prediction and draws a fresh set of checkpoint questions. Parts already reached stay
open, so a student can jump straight to the one they want to redo. The gradebook always keeps the
**best** score: during and after a retake the SCO reports the better of the best finished attempt
and the current one, so retaking can never lower a grade, and the status stays `completed`.

Progress is saved to `cmi.suspend_data` (about 1.3 KB of the 4 KB allowed). `localStorage` is used
only when the page runs outside an LMS, so a newly posted copy in Schoology always starts fresh rather
than picking up progress the browser kept from another copy.

The save carries a schema version (`SCHEMA` in `src/js/app.js`). A save from any other version is
ignored and the student starts from step 1 with no answers and no score carried over. **Bump it
whenever you change the step list, a quiz pool or a molecule.** Version 2 of the zips uses schema 3,
so nothing saved by a v1 zip is resumed.

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
| H / H | 4 | 0 |
| CH₃ / H | 6 | 0 |
| CH₃ / CH₃ | 11 | 3.8 |

### Halogens and branched groups: read this before teaching Part 3

Klein's table stops at CH₃. The other rows are built from measured data and are marked * in the
strain table students see. Two results may differ from what students, or a quick textbook answer
key, expect:

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
estimates. No checkpoint question depends on them; they only set the heights of the eclipsed peaks.

**Fluorine is left out on purpose.** 1,2-Difluoroethane prefers *gauche* (the gauche effect). A size
model would teach the wrong answer, and the real explanation is beyond this course.

If you teach halogen size differently and want the activity to match, edit `src/js/strain.js` and
run the validator. It will tell you which questions and predictions then need rewording.

### Why Cl, Br and I crowd less than CH₃ (the bond-length step)

The bond-length step in Part 3 puts numbers on it. Each group sits on C2, gauche to the CH₃ on C3, at
the bond length the 3D model uses. Its size is its van der Waals radius, with Pauling's 2.0 Å for a
whole CH₃ group, whose H atoms stick out. The overlap is how far the two electron clouds reach into
each other:

| Group on C2 | Bond (Å) | Radius (Å) | Distance to the CH₃ on C3 (Å) | Overlap (Å) |
| --- | ---: | ---: | ---: | ---: |
| CH₃ | 1.54 | 2.00 | 2.95 | 1.05 |
| Cl | 1.78 | 1.75 | 3.08 | 0.67 |
| Br | 1.94 | 1.85 | 3.18 | 0.67 |
| I | 2.14 | 1.98 | 3.30 | 0.68 |

Going down the halogens the atom grows, but the bond grows more, and the two cancel. The CH₃ group is
about as wide as a Br atom and sits on the shortest bond, so it overlaps the most. The step ends with
a prediction that changes only the bond length: an atom the size of Br on a C–C-length bond would
overlap by 0.90 Å, more than a real Br. The distances come from the activity's idealised geometry
(perfect tetrahedral angles, a 60° gauche angle), so treat them as a model rather than measured values.
Four checkpoint 3 questions build on this.

### Builds are computed from the drawing

Each molecule is authored as its wedge/dash drawing (which group is in the page, on the wedge, on the
dash). The Newman projection a student must build, the 3D model and the energy curve are all
**computed** from that drawing, so the answer key cannot disagree with the picture. Looking from the
eye with the front chain group straight up, every wedge lands on the left of the Newman projection
and every dash on the right; `tools/validate.js` checks this.

---

## Building and uploading

```bash
./build.sh                   # → dist/newman-projections-qualitative-v2.zip
./build.sh newman-unit4-qual  # → dist/newman-unit4-qual.zip
```

`imsmanifest.xml` has to sit at the root of the zip, which is why `build.sh` zips from inside `src/`.
Zipping the `src` folder itself produces a package Schoology rejects.

To upload:

1. In your Schoology course, **Add Materials → Add File/Link/External Tool → Add File** and upload
   `dist/newman-projections-qualitative-v2.zip`, or use **Add Materials → Package** if your install shows it.
2. Schoology detects the SCORM manifest and creates a SCORM item.
3. Open the item's settings and enable the gradebook column. It receives the 0–100 score.
4. Open it once as a student (Preview as Student) and check that the badge in the top right reads
   **Connected to the LMS**.

**Replacing an earlier version.** Post the new zip as a new item and delete or unpublish the old
one. Every student starts the new item from step 1, with no answers and an empty gradebook column.
Even if a package is swapped inside an existing item, nobody resumes: saves from the v1 zips
are ignored. The old item's gradebook column keeps its scores until you remove it.

If that badge reads **Standalone: no LMS detected** inside Schoology, the SCO could not find the
SCORM API. That is almost always because Schoology served the zip as a plain file rather than launching it
as SCORM.

A built `dist/newman-projections-qualitative-v2.zip` is committed, so you can upload it without running anything.

### Testing without an LMS

Open `src/index.html` in a browser. Everything works; the badge reads *Standalone* and nothing is
reported. The *Start a new attempt* button on the results screen works here too.

### Teacher links for class

```
src/index.html?explore              free rotation of any molecule, with its curve, for the board
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
| `src/js/quiz.js` | The checkpoint questions, none of which may ask for a calculation. The correct choice is written **first**; the order is shuffled on screen. `why` is the explanation shown after answering. |
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
- a "which projection does the eye see?" question has more than one choice that matches its drawing,
  or the first choice does not;
- a molecule viewed from the right gives a different energy curve from the same molecule viewed from
  the left;
- any file contains an em dash;
- a quiz pool is smaller than its draw, or a question id cannot be a SCORM interaction id;
- a question quotes an energy, or offers a calculated value as a choice.

`tools/walkthrough.js` (optional, needs Playwright) plays the whole activity in a headless browser
against a fake LMS (wrong builds, wrong answers, a reload halfway) and checks the score, status
and interaction records that arrive, and that the strain table is open beside every checkpoint.
It then starts a second attempt and checks that it begins clean
while the gradebook keeps the best score. Before any of that it checks that a first-release save, or a
save the browser kept from another copy, is ignored and the student starts at step 1. On every sketch and
label step it checks that each small Newman projection under the graph shows six labels and that
none of them overlap. It uses the Next buttons above and below the step in turn and checks that
they always agree.

`tools/layout.js` (optional, needs Playwright) opens every step at Chromebook and LMS-frame window
sizes, from 900 × 600 to 1920 × 950, including 1366 × 650 and 1366 × 520. On each step where a
molecule turns it scrolls to the Newman projection and fails unless the projection, its slider and
the whole graph are on screen together. It also fails any step that scrolls sideways. Run it after
any change to the page layout.

To shorten the activity, lower `draw` in `src/js/quiz.js` or remove steps from `STEPS` in
`src/js/app.js`, then bump `SCHEMA`.

---

## Layout

```
newman-projections-qualitative-scorm/
├── src/
│   ├── imsmanifest.xml   SCORM 1.2 manifest, must be at the zip root
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
│   ├── walkthrough.js    end-to-end browser test (optional)
│   └── layout.js         fits-a-Chromebook check (optional)
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

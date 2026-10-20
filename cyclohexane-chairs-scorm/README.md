# Cyclohexane Chairs: Ring Flips and Axial Crowding

A SCORM 1.2 activity for Schoology. Students turn cyclohexane rings in 3D, label axial and equatorial
positions, flip rings from one chair to the other, find the H atoms an axial group crowds, and use
A-values to pick the more stable chair of rings carrying one or two groups. **Every checkpoint question is
qualitative** (compare, rank, identify, explain). The A-value table sits open beside the questions in
checkpoints 3 and 4, and nothing has to be calculated.

Written for a high-school organic elective using Klein, *Organic Chemistry*, as the follow-on to the
Newman projection activities: kJ/mol throughout, the same values as the Newman strain table, and the
same look, controls, saving and grading. About 35 to 40 minutes.

**The key idea, which every part builds toward:** an axial group crowds the two axial atoms on the same
face of the ring, two carbons away (1,3-diaxial interactions, a kind of steric strain). An equatorial
group points away from the ring and crowds nothing. So after a ring flip the chair with the big group
equatorial wins, and the bigger the group, the stronger the preference.

---

## What students do

| Part | Steps | What happens |
| --- | --- | --- |
| 1 The chair | 5 | **Predict** what strain a flat ring would have, then turn a 3D cyclohexane and look from the side, from the top and down the C1–C2 bond (a staggered Newman projection). **Chair or boat?** Predict, then compare: the boat's flagpole H atoms glow red and its C2–C3 bond is eclipsed. Label all twelve H atoms **axial or equatorial** on a chair drawing (the 3D model lights up each one). Predict the **up/down** pattern, then click every H that points up. **Checkpoint 1** (4 questions). |
| 2 The ring flip | 3 | **Predict** where a red axial-up H goes, then drag the flip slider: the 3D model, the chair drawing and an energy hump move together. Every axial H becomes equatorial and **up stays up**; a button colours all six axial H atoms so students watch them change at once. **Draw the other chair**: put the CH₃ and H of methylcyclohexane in their places on chair 2. **Checkpoint 2** (4). |
| 3 Axial crowding | 5 | **Who does the axial CH₃ bump into?** Click the two H atoms it crowds (the axial H atoms on C3 and C5, which glow red in 3D); every wrong click explains itself. **Flip it equatorial**: predict, flip, count what the equatorial CH₃ crowds (nothing), and see the energy gap (the A-value) and a bar showing about 19 in 20 molecules equatorial. **Down the C1–C2 bond**: Newman projections show the axial CH₃ gauche to C3 and C5, the gauche-butane interactions from the Newman unit. **Bigger groups push harder**: Cl, Br, CH(CH₃)₂ and C(CH₃)₃, predicting each against CH₃. **Checkpoint 3** (5). |
| 4 Two groups | 4 | **From flat ring to chair**: trans-1,4-dimethylcyclohexane drawn flat with a wedge and a dash; place both CH₃ groups on the chair. **Which chair wins?** Predict and flip trans- and cis-1,4-dimethylcyclohexane: trans goes diaxial to diequatorial, cis has one axial group either way; can a flip turn cis into trans? **Lock in the better chair**: cis-1-tert-butyl-4-methyl (the bigger group takes equatorial) and cis-1,3-dimethyl (two axial CH₃ groups on one face collide). **Checkpoint 4** (5). |

Every build, label, flip and prediction has to be finished to move on, but none of them is graded. A wrong
build gets specific feedback ("The CH₃ on C1 is on the wrong face. It is on a wedge in the flat drawing, so
it belongs on the top face. In this chair, C1's up position is the axial one, pointing straight up."), a
tip, and after two misses a "Show me in 3D" button.

### The twist-boat

The boat gets one short step, because its flagpole H atoms are the first steric clash students meet and set
up the axial crowding in Part 3. The twist-boat is named once, in that step's explanation, and never
again. The ring-flip animation passes through a boat, and the top of the energy hump is labelled only "in-between
shapes: all less stable". No graded question asks about the twist-boat or the half-chair; one question in
the checkpoint 1 pool asks why the boat is less stable than the chair.

### Chair 1 and chair 2

Every molecule is first shown in "chair 1" and flips to "chair 2". The second chair is drawn exactly as
textbooks draw the other chair: the mirror-image template, with C1 still at the right-hand end and every
group still on its own face. A group on the top face of C1 starts axial.

---

## Grading

**A score, from the four checkpoints only.** 18 questions per attempt (4 + 4 + 5 + 5); the
**first answer** to each counts. The SCO writes `cmi.core.score.raw` (0–100) after every answer,
out of all 18, so a student who stops halfway shows the credit earned so far. `lesson_status`
becomes `completed` on the results screen. There is no `masteryscore`, so the LMS will not overwrite
the status with passed/failed.

Each graded answer is also written as a `cmi.interactions` record (question id, letter chosen,
right/wrong) for LMS reports that show them. The question ids are listed in `ANSWER_KEY.md`.

Any question that names a disubstituted molecule shows its flat drawing, and several use chair drawings
or Newman projections as the question or as the choices.

Each checkpoint always includes its **core** questions (★ in the answer key) and fills the rest at
random from a larger pool, so a retake sees a different mix. 47 questions in all.

**Retakes.** Re-opening the activity resumes where the student left off. Once they reach the
results screen, a **Start a new attempt** button (with an "are you sure?" step) clears every answer,
build and prediction and draws a fresh set of checkpoint questions. Parts already reached stay
open, so a student can jump straight to the one they want to redo. The gradebook always keeps the
**best** score: during and after a retake the SCO reports the better of the best finished attempt
and the current one, so retaking can never lower a grade, and the status stays `completed`.

Progress is saved to `cmi.suspend_data` (about 1.6 KB of the 4 KB allowed). `localStorage` is used
only when the page runs outside an LMS, so a newly posted copy in Schoology always starts fresh rather
than picking up progress the browser kept from another copy.

The save carries a schema version (`SCHEMA` in `src/js/app.js`). A save from any other version is
ignored and the student starts from step 1 with no answers and no score carried over. **Bump it
whenever you change the step list, a quiz pool or a molecule.**

---

## The chemistry model

### One 3D model drives every picture and every answer

The ring is a perfect chair: 1.54 Å C–C bonds and tetrahedral angles, so every ring bond is exactly
staggered. Each carbon has a top-face and a bottom-face position; which of the two is axial depends on
the chair. Everything students see is **computed** from that model, never drawn by hand:

- **Chair drawings** are the 3D model seen through a fixed camera a little above the ring. Because the
  projection keeps parallel lines parallel, axial bonds come out vertical and every equatorial bond
  parallel to two ring bonds, which are the rules students learn for drawing chairs.
- **The ring flip** swings C4 up through the plane of C2, C3, C5 and C6 (a boat), then C1 down through it
  (the other chair). No bond changes length, and the ring is kept level, so "up" means up throughout.
- **Newman projections** look down a ring bond of the model.
- **Who crowds whom** is measured: two atoms crowd each other when their van der Waals spheres overlap.
  An axial CH₃, Cl or Br crowds exactly the axial H atoms on C3 and C5 and nothing else; an equatorial one
  crowds nothing. Branched groups also touch the H atoms on C2 and C6 in both chairs, which cancels out of
  the A-value, so only the 1,3-diaxial contacts are highlighted.

So the answer key cannot disagree with the pictures, and `tools/validate.js` checks all of it.

### A-values

| Group | A-value (kJ/mol) | Each 1,3-diaxial interaction |
| --- | ---: | ---: |
| Cl | 2.0 | 1.0 |
| Br | 2.0 | 1.0 |
| CH₃ | 7.6 | 3.8 |
| CH(CH₃)₂ | 9.2 | 4.6 |
| C(CH₃)₃ | 22.8 | 11.4 |

An A-value is the energy of the chair with the group axial minus the chair with it equatorial: two
1,3-diaxial interactions. CH₃ is Klein's value (each CH₃/H 1,3-diaxial interaction is a gauche-butane
interaction, 3.8 kJ/mol). The others are the values the Newman packages' strain table already uses for
the halogens and branched groups (it lists half the A-value as the gauche cost), so the two activities
never disagree; the validator checks this when the Newman folder is next door.

A chair's energy is the sum of its 1,3-diaxial interactions. One more value is needed for two axial CH₃
groups on the same face (cis-1,3-dimethylcyclohexane): 15.4 kJ/mol, the measured syn-diaxial interaction
(about 3.7 kcal/mol, Allinger and Miller). It is marked * in the table students see, as not in the textbook.

**Shares of molecules** come from these values at 25 °C: Cl and Br about 7 in 10 equatorial,
CH₃ about 19 in 20 (the textbook 95%), CH(CH₃)₂ about 39 in 40, C(CH₃)₃ all but about 1 in 10,000.

**Bond length.** Cl and Br are bigger atoms than carbon but cost less than CH₃ when axial, because their
long C–X bonds (1.78 and 1.94 Å) hold them out beyond the axial H atoms. This is the same point the Newman
activity's bond-length step makes, and the swap step says so.

If you teach different A-values, edit `src/js/avalues.js` and run the validator. It will tell you which
questions and notes then need rewording.

---

## Building and uploading

```bash
./build.sh                      # → dist/cyclohexane-chairs-v1.zip
./build.sh cyclohexane-unit5    # → dist/cyclohexane-unit5.zip
```

`imsmanifest.xml` has to sit at the root of the zip, which is why `build.sh` zips from inside `src/`.
Zipping the `src` folder itself produces a package Schoology rejects.

To upload:

1. In your Schoology course, **Add Materials → Add File/Link/External Tool → Add File** and upload
   `dist/cyclohexane-chairs-v1.zip`, or use **Add Materials → Package** if your install shows it.
2. Schoology detects the SCORM manifest and creates a SCORM item.
3. Open the item's settings and enable the gradebook column. It receives the 0–100 score.
4. Open it once as a student (Preview as Student) and check that the badge in the top right reads
   **Connected to the LMS**.

The package has its own course title, SCORM identifiers and saved-progress key, so it can sit in the same
course as the Newman packages with its own gradebook column.

If that badge reads **Standalone: no LMS detected** inside Schoology, the SCO could not find the
SCORM API. That is almost always because Schoology served the zip as a plain file rather than launching it
as SCORM.

A built `dist/cyclohexane-chairs-v1.zip` is committed, so you can upload it without running anything.

### Testing without an LMS

Open `src/index.html` in a browser. Everything works; the badge reads *Standalone* and nothing is
reported. The *Start a new attempt* button on the results screen works here too.

### Teacher links for class

```
src/index.html?explore              flip any molecule, with its energy diagram, for the board
src/index.html?explore=cisTM        start on one molecule (ids are listed in ANSWER_KEY.md)
src/index.html?step=crowd           jump to any step (ids or numbers 1–18) to preview it
```

Neither mode saves progress or reports anything.

---

## Editing the content

| File | What it holds |
| --- | --- |
| `src/js/avalues.js` | The A-values, with the source of every number, and the chair energies |
| `src/js/molecules.js` | Every molecule, as its flat drawing: which carbon carries which group, on which face |
| `src/js/quiz.js` | The checkpoint questions, none of which may ask for a calculation. The correct choice is written **first**; the order is shuffled on screen. `why` is the explanation shown after answering. |
| `src/js/app.js` | The step list (`STEPS`), the predictions (`PREDICT`), the build feedback and the wording of every step |
| `src/js/chair.js` | The 3D geometry, the ring flip and the drawing camera |

After any edit:

```bash
node tools/validate.js                  # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh
```

`tools/validate.js` refuses an activity where:

- a chair bond is not 1.54 Å, an angle not tetrahedral, or a ring bond not staggered;
- a carbon does not have exactly one axial position, axial positions do not alternate up and down, or an
  axial bond is not parallel to the ring axis;
- a ring flip leaves any position axial (or equatorial) in both chairs, changes a bond length, or moves a
  position to the other face;
- the boat's C2–C3 and C5–C6 bonds are not eclipsed, or its flagpole H atoms are not its most crowded pair;
- the second chair drawing is not the mirror image of the first, an axial bond is not vertical in a
  drawing, or an equatorial bond is not parallel to its two ring bonds;
- an axial group crowds anything but the axial H atoms on C3 and C5, an equatorial CH₃, Cl or Br crowds
  anything, or the axial CH₃ is not gauche to C3 and C5 in the Newman projections;
- axial CH₃ no longer costs 2 × 3.8 kJ/mol, the A-values are out of order, methylcyclohexane is not about
  95% equatorial, or an A-value disagrees with the Newman strain table;
- a build accepts anything but the one right answer, or a wrong build gets no feedback;
- a prediction's key, a note's quoted number or a question's answer no longer matches the model;
- a "which chair shows this molecule?" question has more than one choice showing the drawn compound;
- any file contains an em dash;
- a quiz pool is smaller than its draw, a question id cannot be a SCORM interaction id, or a question
  quotes an energy.

`tools/walkthrough.js` (optional, needs Playwright) plays the whole activity in a headless browser
against a fake LMS (wrong labels, wrong builds, wrong clicks, a wrong lock-in, wrong answers, a reload
halfway) and checks the score, status and interaction records that arrive, and that the A-value table is
open beside checkpoints 3 and 4 only. It then starts a second attempt and checks that it begins clean while
the gradebook keeps the best score. Before any of that it checks that a save from another release, or a
save the browser kept from another copy, is ignored and the student starts at step 1. `SHOTS=dir` saves a
screenshot of every step and `DARK=1` runs it in dark mode.

To shorten the activity, lower `draw` in `src/js/quiz.js` or remove steps from `STEPS` in
`src/js/app.js`, then bump `SCHEMA`.

---

## Layout

```
cyclohexane-chairs-scorm/
├── src/
│   ├── imsmanifest.xml   SCORM 1.2 manifest, must be at the zip root
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── groups.js     substituents and element colours
│       ├── chair.js      the 3D ring, the flip, crowding, cameras, Newman projections
│       ├── molecules.js  the molecules, as flat drawings
│       ├── avalues.js    A-values and chair energies
│       ├── draw.js       chair drawings, flat rings, Newman projections, the energy diagram
│       ├── viewer3d.js   ball-and-stick / space-filling 3D on a canvas
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

Every label, placement and atom pick works by drag, by click-then-click, and by keyboard (Tab to a word or
group, Enter; Tab to a position, Enter). The flip has a slider as well as a play button, and the slider
reads out "Chair 1", "Chair 2" or how far through the flip it is. Drawings carry text descriptions,
feedback is announced through a live region, colours are never the only signal (axial and equatorial,
up and down, crowded and not each carry a word or a line style too), the page follows the system
light/dark setting, and `prefers-reduced-motion` turns off the animations.

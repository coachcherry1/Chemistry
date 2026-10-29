# Chirality: R and S, Enantiomers and Diastereomers

**The version without meso compounds**, for years when the group needs more time on R and S. It is a copy of
`chirality-scorm/` with the meso tutorial, the Molecules A and B step, cis-1,3-dimethylcyclohexane and every meso
question taken out, and its own SCORM identifiers, save key and zip, so both can be posted in Schoology. A fix to
shared code (saving, scoring, picker, 3D viewer, R/S reading) usually belongs in both folders.

A SCORM 1.2 activity for Schoology. Students hold a molecule up to a mirror in 3D and try to make its reflection
fit, find chirality centres in bond-line drawings, rank groups by the priority rules, rotate molecules until 4 is
on the dash and read R or S, and sort pairs of stereoisomers into enantiomers and diastereomers, in chains and in
rings. **Every checkpoint question is
qualitative** (identify, compare, rank, explain). Nothing is calculated: no specific rotation and no optical
activity. The atomic numbers sit open beside checkpoints 2 to 4.

Written for a high-school organic elective using Klein, *Organic Chemistry* (chapter 5), as the follow-on to the
Newman projection and cyclohexane chair activities, with the same look, controls, saving and grading. About 30
minutes.

**The idea every R and S step is built on, in the teacher's words: if 4 is not on the dash, rotate the
molecule.** The activity never swaps two groups and never reads a centre with 4 toward the reader and reverses the
answer. Students rotate.

---

## What students do

| Part | Steps | What happens |
| --- | --- | --- |
| 1 Chirality | 4 | **Mirror, mirror:** CHBrClF stands beside a mirror in 3D. Turning it turns its reflection, as a real mirror would; then students pick up the reflection and try to make it fit. A meter counts the atoms that line up: never more than two of four. CH₂BrCl's reflection fits after one turn, and its mirror plane (the page itself) appears. **Draw the mirror image:** place the atoms of CHBrClF as a mirror beside the molecule shows them, then as a mirror lying behind the page shows them. **Find the chirality centres:** click every carbon with four different groups in four bond-line drawings; the 3D model colours the four groups on whichever carbon is clicked, the same colour for groups that are the same. **Checkpoint 1** (4 questions). |
| 2 Priorities | 3 | **Highest atomic number first:** predict which atom of CHBrClF ranks 1 (most pick F, the most electronegative), then put the numbers 1 to 4 on the groups; then a molecule whose priority 4 is CH₃, not H. **Ties:** 2-butanol, CH₂OH against C(CH₃)₃ (the biggest group of the chairs activity loses to one O) and glyceraldehyde (the C=O counts twice). A **Look closer** button lists the atoms on each group's first carbon, written as Klein writes them: (C, H, H). **Checkpoint 2** (4). |
| 3 R and S | 5 | **Read the steering wheel:** 4 already on the dash. Click 1, 2, 3; an arrow follows; choose clockwise (R) or counterclockwise (S). The first molecule is the Newman activity's drawing of 2-bromobutane, which is R. A **Steering-wheel view** button swings the 3D model round so 4 hides behind the carbon. **If 4 is not on the dash, rotate:** alanine with H on the wedge (Turn it over), then a molecule whose 4 is a CH₃ in the page (a turn over leaves it there; it takes a spin around a bond). Reading stays locked until 4 is on the dash. **The hidden H:** a bond-line 2-butanol with the OH on a dash; find the hidden H (on the wedge), rotate, redraw the molecule with 4 on the dash, and read it. **Mirror images have opposite labels:** the mirror image of (R)-2-butanol, read after rotating, is S; the original stays R however it is turned. **Checkpoint 3** (4). |
| 4 Two centres | 3 | **Four stereoisomers:** name both centres of one 2-bromo-3-chlorobutane (one centre needs a rotation), then label all six pairs of the four stereoisomers enantiomers or diastereomers. **Rings:** predict whether trans-1,3-dimethylcyclohexane is chiral, then sort trans-1,3- and cis- and trans-1,4-dimethylcyclohexane (from the chairs activity) into chiral or no chirality centres, with each ring's chair in 3D and a button that looks for a mirror plane. cis- and trans-1,4 are still diastereomers. **Checkpoint 4** (4). |

Every drawing, ranking, reading and prediction has to be finished to move on, but none of them is graded. A wrong
answer gets specific feedback and another try, for example:

- *a mirror image drawn turned over*: "You moved every group from left to right and changed the wedge and the
  dash: that is the original molecule turned over. It would fit the original exactly, so it is not the mirror
  image."
- *a priority*: "Both CH₂OH and C(CH₃)₃ are attached through C. List the atoms on that C, highest first: CH₂OH has
  (O, H, H) and C(CH₃)₃ has (C, C, C). At the first point of difference O beats C, so CH₂OH wins."
- *reading too early*: "4 is not on the dash yet, so 1 → 2 → 3 tells you nothing. Rotate the molecule first."
- *a redraw that only moved the H*: "You moved the H to the dash and the OH to the wedge, and nothing else moved.
  That drawing is the mirror image of the molecule. When the molecule really turns over, the CH₃ and the CH₂CH₃
  change sides too."

**Sized for a Chromebook.** Wherever a molecule turns, the 3D model, the drawing of it as it now lies, the turn
buttons and the R/S buttons sit side by side, so a student rotating the model watches the drawing change without
scrolling. This holds on a 1366 × 650 browser tab and in a frame as short as 520 px. **Back** and **Next** appear
above each step as well as below it.

### Rotating, never swapping

A molecule can be rotated in three ways, and the drawing always shows the model as it now lies:

- drag the 3D model (or use the arrow keys): when it is let go it settles into the nearest position that can be
  drawn on paper (two bonds in the page, a wedge and a dash);
- **Turn it over**: half a turn about the page's up–down line, so wedges become dashes and left becomes right;
- **Spin around** a group: hold that bond still and turn the other three a third of a turn.

Those are the only moves, and they are real rotations: the twelve positions of a molecule they reach are exactly
the twelve ways to draw it. A drawing a student makes by moving groups around on paper is judged against those
twelve. A drawing that moves only two groups is the mirror image, and the feedback says so in those words, without
ever offering it as a shortcut. `tools/validate.js` fails if any student-facing text mentions swapping, switching
or reversing.

### Rockwise and sountersockwise

In three places only: where R and S are first introduced ("As your teacher puts it: R is rockwise and S is
sountersockwise."), the R and S entries of the Vocabulary drawer, and the Big ideas on the results screen. Never in
a question or in feedback; the validator counts them. The activity says counterclockwise rather than anticlockwise,
because the joke needs it.

### Molecules A and B

The Newman activity's Molecules A and B are left out of this version, because A is a meso compound. Only B's
enantiomer pair, (2R,3R) and (2S,3S), appears, in one checkpoint 4 question about energy.

---

## Grading

**A score, from the four checkpoints only.** 16 questions per attempt (4 + 4 + 4 + 4); the **first answer** to
each counts. The SCO writes `cmi.core.score.raw` (0–100) after every answer, out of all 16, so a student who stops
halfway shows the credit earned so far. `lesson_status` becomes `completed` on the results screen. There is no
`masteryscore`, so the LMS will not overwrite the status with passed/failed.

Each graded answer is also written as a `cmi.interactions` record (question id, letter chosen, right/wrong) for
LMS reports that show them. The question ids are listed in `ANSWER_KEY.md`.

Each checkpoint always includes its **core** questions (★ in the answer key) and fills the rest at random from a
larger pool, so a retake sees a different mix. 46 questions in all. Most R and S questions show drawings with 4 on
a wedge, in the page or hidden, and "Which drawing is (S)-alanine?" offers four drawings in different positions, so
none is a 50/50 guess.

**Retakes.** Re-opening the activity resumes where the student left off. Once they reach the results screen, a
**Start a new attempt** button (with an "are you sure?" step) clears every answer, drawing and prediction and draws
a fresh set of checkpoint questions. Parts already reached stay open. The gradebook always keeps the **best**
score: during and after a retake the SCO reports the better of the best finished attempt and the current one, so
retaking can never lower a grade, and the status stays `completed`.

Progress is saved to `cmi.suspend_data` (about 2 KB of the 4 KB allowed). `localStorage` is used only when the page
runs outside an LMS, so a newly posted copy in Schoology always starts fresh rather than picking up progress the
browser kept from another copy.

The save carries a schema version (`SCHEMA` in `src/js/app.js`). A save from any other version is ignored and the
student starts from step 1 with no answers and no score carried over. **Bump it whenever you change the step list,
a quiz pool or a molecule.**

---

## The chemistry model

### One 3D model per molecule, written once

Every molecule is written once, as the drawing a student sees (`src/js/molecules.js`): one chirality centre in a
template (two bonds in the page, a wedge and a dash), a zigzag with a wedge and a dash at each carbon, or a ring
drawn flat. The 3D model is built from that drawing with exact geometry (tetrahedral angles, real bond lengths) in
the frame of the page, so a wedge in the drawing is a bond pointing at the reader in 3D. Everything else is
computed from the model:

- **Drawings** are the model seen from the front. Turned or reflected, it draws itself. The only adjustments are
  the textbook ones: every bond the same length, and a wedge and a dash that point the same way fanned apart.
- **Priorities** (`src/js/cip.js`) follow the rules the course teaches: higher atomic number first; at a tie, list
  the atoms on each tied atom, highest first, and compare at the first point of difference; a double bond counts
  twice. The same comparison writes the feedback, naming the sphere and the atoms that decide it.
- **R or S** is the sign of a triple product of the bonds to groups 1 to 4, so it cannot depend on how the molecule
  is turned.
- **Relationships** (`src/js/stereo.js`) are decided twice, independently: by comparing R and S centre by centre
  (allowing for a symmetric molecule numbered from either end), and by laying the 3D models on each other. The
  validator checks that the two always agree.

Checked against the textbook, from Fischer projections and independent of every drawing in the activity:
L-alanine is S, D-glyceraldehyde is R, L-lactic acid is S, natural L-(+)-tartaric acid is (2R,3R) and
meso-tartaric acid is (2R,3S). The alanine students meet is the S form, the one in proteins.

### Scope

In: chirality, mirror images and mirror planes, chirality centres, priorities (atomic number, first point of
difference, double bonds), R and S by rotation, enantiomers, diastereomers (including cis and trans rings), counting
stereoisomers. Meso compounds are left out (they are in `chirality-scorm/`); the validator fails if "meso" appears
in student text.

Left out on purpose: Fischer projections (their rotation rules are usually taught as swaps; they could be a
separate short activity), optical activity and specific rotation, (+)/(−) and D/L, E/Z, chirality without a
chirality centre, isotopes in the priority rules.

---

## Building and uploading

```bash
./build.sh                    # → dist/chirality-no-meso-v1.zip
./build.sh chirality-unit6    # → dist/chirality-unit6.zip
```

`imsmanifest.xml` has to sit at the root of the zip, which is why `build.sh` zips from inside `src/`. Zipping the
`src` folder itself produces a package Schoology rejects.

To upload:

1. In your Schoology course, **Add Materials → Add File/Link/External Tool → Add File** and upload
   `dist/chirality-no-meso-v1.zip`, or use **Add Materials → Package** if your install shows it.
2. Schoology detects the SCORM manifest and creates a SCORM item.
3. Open the item's settings and enable the gradebook column. It receives the 0–100 score.
4. Open it once as a student (Preview as Student) and check that the badge in the top right reads **Connected to
   the LMS**.

The package has its own course title, SCORM identifiers and saved-progress key, so it can sit in the same course as
the Newman and chairs packages with its own gradebook column.

If that badge reads **Standalone: no LMS detected** inside Schoology, the SCO could not find the SCORM API. That is
almost always because Schoology served the zip as a plain file rather than launching it as SCORM.

A built `dist/chirality-no-meso-v1.zip` is committed, so you can upload it without running anything.

### Testing without an LMS

Open `src/index.html` in a browser. Everything works; the badge reads *Standalone* and nothing is reported.

### Teacher links for class

```
src/index.html?explore              rotate, reflect and read any molecule, for the board
src/index.html?explore=dbb_A        start on one molecule (ids are listed in ANSWER_KEY.md)
src/index.html?step=rings           jump to any step (ids or numbers 1–16) to preview it
```

Neither mode saves progress or reports anything.

---

## Editing the content

| File | What it holds |
| --- | --- |
| `src/js/molecules.js` | Every molecule, as its drawing, and the builder that makes its 3D model |
| `src/js/groups.js` | The elements (atomic numbers, colours) and the groups that sit on a chirality centre |
| `src/js/cip.js` | The priority rules, R and S, and the wording of every priority explanation |
| `src/js/stereo.js` | Turning, reflecting, the relationships between drawings, mirror planes |
| `src/js/quiz.js` | The checkpoint questions, none of which may ask for a calculation. The correct choice is written **first**; the order is shuffled on screen. `why` is the explanation shown after answering. |
| `src/js/app.js` | The step list (`STEPS`), the predictions (`PREDICT`), the feedback and the wording of every step |

After any edit:

```bash
node tools/validate.js                  # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh
```

`tools/validate.js` refuses an activity where:

- a bond length or bond angle in any 3D model is wrong;
- a textbook anchor (L-alanine, D-glyceraldehyde, L-lactic acid, the tartaric acids) comes out with the wrong
  configuration, or the activity's alanine, glyceraldehyde or lactic acid is not the form it claims;
- a priority, or the sphere where a tie is broken, differs from what a step or question says;
- any of the twelve turns of a molecule changes a label, a reflection fails to turn every R into S, or a turn
  button is not one of the twelve turns;
- a drawn bond points more than 46° from where the 3D bond points, a wedge or dash is drawn the wrong way, or
  reading 1 → 2 → 3 off any drawing with 4 on the dash gives a different answer from the model, in every
  orientation and reflection;
- comparing R and S and laying the 3D models on each other ever disagree about a pair of drawings;
- a build accepts anything but the right drawings (all 24 arrangements are tried), or a wrong one gets no feedback;
- a step's claim no longer holds (CHBrClF's mirror image never lines up more than two atoms, CH₂BrCl's fits after
  Turn it over, Molecule A's fits upside down and shows a mirror plane only when its Br atoms are eclipsed, B never
  does, and so on), or a prediction's key disagrees with the model;
- a "which drawing ...?" question has more than one right choice, or the right one is not first;
- a question text is repeated, a quiz pool is smaller than its draw, or a question id cannot be a SCORM interaction
  id;
- anything students read mentions an energy, a percentage in a question, optical activity, swapping, switching or
  reversing, or uses "rockwise" anywhere but its three places;
- any file contains an em dash.

`tools/walkthrough.js` (optional, needs Playwright) plays the whole activity in a headless browser against a fake LMS
(wrong drawings, wrong rankings, wrong clicks, a reading tried before 4 is on the dash, wrong answers, a reload
halfway) and checks the score, status and interaction records that arrive. It then starts a second attempt and
checks that it begins clean while the gradebook keeps the best score. Before any of that it checks that a save from
another release, or a save the browser kept from another copy, is ignored. `SHOTS=dir` saves a screenshot of every
step and `DARK=1` runs it in dark mode.

`tools/layout.js` (optional, needs Playwright) opens every step at window sizes from 900 × 600 to 1920 × 950,
including 1366 × 650 and 1366 × 520, answering every prediction. It fails unless each 3D model, its turn buttons, its
drawing and the R/S buttons are on screen together, each tray and the drawing or table it fills are on screen
together, and each clickable drawing fits. It also fails any step that scrolls sideways.

To shorten the activity, lower `draw` in `src/js/quiz.js` or remove steps from `STEPS` in `src/js/app.js`, then bump
`SCHEMA`.

---

## Layout

```
chirality-scorm/
├── src/
│   ├── imsmanifest.xml   SCORM 1.2 manifest, must be at the zip root
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── geom.js       vectors, rotations, superposition
│       ├── groups.js     elements and groups
│       ├── molecules.js  the molecules, as drawings, and their 3D models
│       ├── cip.js        priorities, R and S, explanations
│       ├── stereo.js     turns, mirrors, relationships, mirror planes
│       ├── draw.js       wedge/dash and bond-line drawings, templates, flat rings, Newman projections
│       ├── viewer3d.js   ball-and-stick 3D on a canvas, with the mirror and the steering wheel
│       ├── picker.js     drag, click or keyboard placement
│       ├── quiz.js       checkpoint questions
│       ├── scorm.js      SCORM 1.2 run-time wrapper
│       └── app.js        steps, saving, scoring
├── tools/
│   ├── validate.js       chemistry, teaching and item-bank checks
│   ├── answer-key.js     regenerates ANSWER_KEY.md
│   ├── walkthrough.js    end-to-end browser test (optional)
│   └── layout.js         fits-a-Chromebook check (optional)
├── build.sh
├── ANSWER_KEY.md         generated
└── README.md
```

No CDN, no web fonts, no WebGL, no network calls: it works offline inside a locked-down LMS iframe and on a
Chromebook.

## Accessibility

Every placement and click works by drag, by click-then-click, and by keyboard (Tab to a tile, Enter; Tab to a
target, Enter). A 3D model turns with the arrow keys as well as by dragging, and every turn has a button. Drawings
carry text descriptions, feedback is announced through a live region, colours are never the only signal (priority
numbers, R and S, and right and wrong each carry a number, letter or word too), the page follows the system
light/dark setting, and `prefers-reduced-motion` turns off the animations.

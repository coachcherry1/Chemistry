# VSEPR: Molecular Geometry and Polarity

A SCORM 1.2 activity for Schoology, for honors chemistry. Students build Lewis structures with the class's 5
rules while a 3D window beside the drawing follows along, count the electron domains, watch the domains spread
out into the real molecule, name its molecular geometry and bond angle, and then decide which molecules are
polar by radial symmetry. About 25 minutes. It follows **Lewis Structures: The 5 Rules** and comes before the
intermolecular forces activity.

The 5 rules, their wording, the builder, the B and Be exceptions, the expanded octets and the anti-AI messages
are the Lewis structures activity's own (`lewis.js`, `builder.js`, `draw.js`, `snark.js`), copied in.

---

## What students do

| Part | Steps | What happens |
| --- | --- | --- |
| 1 Lewis to 3D | 5 | **A Lewis structure is flat; a molecule is not.** CH₄'s Lewis structure beside a 3D CH₄ drawn just as flat. **Predict** the real H–C–H angle, then press *Let the domains spread out*: the bonds swing apart into a tetrahedron, 109.5°. **Build H₂O, CO₂ and BF₃** with the 5 rules. The 3D window beside the drawing follows every rule, still flat; when the structure is done, the student **counts the electron domains** (a wrong count gets specific help: lone pairs count; a double bond is ONE domain), and only then does the molecule spread out into 3D with its geometry and angle. **Checkpoint 1** (4 questions). |
| 2 Molecular geometry | 4 | **From 2 to 6 domains:** BeF₂, BF₃, CH₄, PCl₅ and SF₆ (shuffled for each student) in 3D with their angles marked; drag each name onto its molecule. **Lone pairs push harder:** CH₄ → NH₃ → H₂O, predicting each time; the lone pairs are drawn as fat lobes and the angle reads 109.5°, then **<109.5°**, then **<<109.5°**. **Name the geometry by its atoms:** hide the lone pairs to see that the domains still point to the corners of a tetrahedron while the atoms make a pyramid or a bent shape; then sort nine Lewis structures (including ions from the Lewis activity, in a different order for each student) into tetrahedral, trigonal pyramidal and bent. **Checkpoint 2** (6). |
| 3 Polarity | 4 | **Radial symmetry:** every atom tinted by its partial charge (δ− red, δ+ blue) and two markers for the centre of positive charge and the centre of negative charge. **Predict** whether CO₂ is polar; then, for CO₂ and (in a random order) BF₃, CH₄, SF₆, H₂O and NH₃, answer two questions: **is it radially symmetric?** (with specific help: a lone pair on the central atom, or outer atoms that differ, breaks the symmetry) and **so, polar or nonpolar?** A two-line symmetry checklist and an explanation in the same words follow each one. **Same shape: is it radially symmetric?** CH₄, CH₃Cl, CH₂Cl₂, CHCl₃ and CCl₄ in a random order, charges hidden until the symmetry question is answered: all tetrahedral, so the shape alone cannot decide. **The electric field test:** molecules tumble between a + plate and a − plate; switch the field on and the polar ones snap into line (their box turns green, "LINED UP: polar") while the nonpolar ones keep tumbling. **Checkpoint 3** (6), every answer worded in terms of radial symmetry, with the electronegativity table open beside it. |

Builds, counts, namings, sorts and predictions have to be finished to move on, but none of them is graded.

### What the activity teaches, and what it leaves out

- **Electron domains**: every bonded atom is one (single, double or triple bond), every lone pair on the central
  atom is one. The word "steric number", AXE notation and hybridization never appear.
- **Molecular geometries** for 2 to 6 domains: linear 180°, trigonal planar 120°, tetrahedral 109.5°, trigonal
  bipyramidal 90° and 120°, octahedral 90°. Lone pairs only with 4 domains: trigonal pyramidal **<109.5°** and
  bent **<<109.5°**. No see-saw, T-shaped, square planar or square pyramidal, and no molecule whose 5 rules give
  3 domains with a lone pair (SO₂). The validator rejects any of them, in a species or in student text.
- **Lone pairs repel more strongly than shared pairs**, so they squeeze the bond angle. Students learn the signs
  (<109.5°, <<109.5°), never the numbers. The 3D models of NH₃ and H₂O are built at their measured angles
  (106.7° and 104.5°) so the picture is true, but no question asks for or quotes them. Angles are only ever
  compared within CH₄, NH₃ and H₂O, where the lone-pair rule always holds.
- **Polarity by radial symmetry**: no lone pairs on the central atom and all outer atoms the same, nonpolar;
  otherwise polar. Every explanation names radial symmetry as the cause, never the shape name, and says why in the
  class's words: in a radially symmetric molecule the pulls of the polar bonds cancel each other out; otherwise
  they do not, and the molecule has a δ+ end and a δ− end. The model behind the charge view gives every atom a partial charge from the Pauling
  electronegativity difference of its bonds and places the centre of each sign. No dipole arrows, no dipole
  moments and no "how polar" comparisons: the field test turns every polar molecule equally.
- **Ions** (NH₄⁺, H₃O⁺, SO₄²⁻, ClO₃⁻, ClO₂⁻, PO₄³⁻, SO₃²⁻) get geometries but are never asked about polarity.

---

## Grading

**A score, from the three checkpoints only.** 16 questions per attempt (4 + 6 + 6) from a pool of 51; the **first
answer** to each counts. Each checkpoint always includes its core questions (★ in `ANSWER_KEY.md`) and fills the
rest at random, so a retake sees a different mix. The SCO writes `cmi.core.score.raw` (0 to 100) after every
answer, out of all 16, so a student who stops halfway shows the credit earned so far; `lesson_status` becomes
`completed` on the results screen. There is no `masteryscore`, so the LMS will not overwrite the status with
passed or failed. Each answer is also written as a `cmi.interactions` record.

**Retakes:** the results screen offers a new attempt with new questions. The gradebook keeps the best finished
attempt's score. Progress is saved only in `cmi.suspend_data` (about 1 KB), so resetting an attempt in Schoology
really starts it over and a second student on the same Chromebook starts fresh (`localStorage` is used only
without an LMS). A save from another release is ignored. A build in progress is not saved. Bump `SCHEMA` in
`src/js/app.js` whenever the steps, a quiz pool or a molecule changes.

---

## The model

`src/js/vsepr.js` turns the 5-rule engine's finished Lewis structure into everything else, so the steps, the
answers, the answer key and the validator cannot disagree:

- **Domains** are counted from the structure (bonded atoms + lone pairs on the central atom).
- **The 3D model** puts the domains on the template for their number, matched to the directions they have in the
  Lewis drawing, so the *spread out* animation moves each one as little as possible. NH₃ and H₂O have their bonds
  squeezed to the measured angle about the axis opposite the lone pairs. Angle arcs appear only where all the outer
  atoms are alike (so the label is exactly the molecule's angle); the viewer marks the pair that faces the student.
- **Polarity** is read from where the centre of positive charge and the centre of negative charge fall.
- **The field test** (`field.js`) turns each molecule by the push the plates give its charged ends, with random
  thermal kicks; "lined up" is read from the motion itself.

---

## Building and uploading

```bash
node tools/validate.js                    # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh                                # dist/vsepr-polarity-v3.zip
node tools/walkthrough.js                 # optional, Playwright: plays the whole activity against a fake LMS
node tools/layout.js                      # optional, Playwright: fits a Chromebook, 1366x650 and 1366x520
```

`imsmanifest.xml` has to sit at the root of the zip, which is why `build.sh` zips from inside `src/`. Upload
`dist/vsepr-polarity-v3.zip` in Schoology with **Add Materials → Add File/Link/External Tool → Add File** (or
**Package**), enable the gradebook column, and preview as a student: the badge in the top right should read
**Connected to the LMS**. The SCORM identifiers and the storage key are this package's own, so it can sit in the
same course as every other activity.

### Teacher links

```
src/index.html?step=squeeze      jump to any step (ids are in ANSWER_KEY.md, or numbers 1 to 14)
src/index.html?explore           any molecule in 3D, with charges, and the spread from flat
src/index.html?explore=SF6
```

None of these save progress or report anything.

### What the validator checks

`tools/validate.js` refuses the activity when the 5-rule engine disagrees with a species' key; a species is out
of scope; a 3D angle is not the ideal (or measured) one, an arc label disagrees with the angle it marks, or a
molecule with lone pairs and no measured angle would be drawn in 3D; the model's polarity disagrees with the
textbook; a checkpoint answer, a prediction or a sorting bin no longer matches the model; a pool is smaller than
its draw or a question id is not a safe SCORM id; a sentence answer is longer than every wrong choice (so the
longest choice never gives the answer away); a question quotes a measured angle; an out-of-scope shape name
or a word outside the class's scope (steric number, hybridization, formal charge, dipole, van der Waals) appears in
student text; or any file contains an em dash.

---

## Layout

```
vsepr-polarity-scorm/
├── src/
│   ├── imsmanifest.xml
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── util.js, elements.js, lewis.js, draw.js, picker.js, snark.js, builder.js
│       │                 the Lewis structures activity's engine and builder (builder.js adds one
│       │                 hook so the 3D window can follow it)
│       ├── species.js    the molecules and ions, and the two measured angles
│       ├── vsepr.js      domains, geometry, 3D models, partial charges, polarity
│       ├── viewer3d.js   ball-and-stick 3D on a 2D canvas: lone-pair lobes, angle arcs, charge view
│       ├── field.js      the electric field test
│       ├── quiz.js       checkpoint questions
│       ├── scorm.js      SCORM 1.2 run-time wrapper
│       └── app.js        steps, saving, scoring
├── tools/                validate.js, answer-key.js, walkthrough.js, layout.js
├── build.sh
├── ANSWER_KEY.md         generated
└── README.md
```

No CDN, no web fonts, no WebGL, no network calls. Every action works by mouse, touch and keyboard (Tab and
Enter; arrow keys turn a 3D molecule), drawings and 3D views carry text descriptions, colour is never the only
signal (atoms show their symbols, charges read δ+ and δ−), the page follows the system light or dark setting,
and `prefers-reduced-motion` turns the animations into instant changes.

# Intermolecular Forces: LDF, Dipole-Dipole and Hydrogen Bonding

A SCORM 1.2 activity for Schoology, for honors chemistry. Students warm real substances on a heating stage and
watch them melt and boil at their real temperatures, see where London dispersion forces come from, compare
molecules with the same number of electrons, and draw and count hydrogen bonds. About 25 minutes. It follows
**VSEPR: Molecular Geometry and Polarity**.

**Name the IMFs first, then predict.** Before every comparison students name the forces of each substance from its
Lewis structure: a card per substance with its structure and electron count, and buttons for London dispersion,
dipole-dipole and hydrogen bonding. All three are offered from the first card, so students rule forces out as well
as in, even before dipole-dipole forces and hydrogen bonds are taught; the feedback explains each one. A wrong set gets the specific reason (no LDF; "CH₄ has only C–H bonds"; "its H is
on Cl, not N, O or F"). Only when every card is right does the prediction (or the ranking, or the counting) open.
Each checkpoint has a core question that asks students to name a substance's IMFs, and every question that names a
molecule shows its Lewis structure.

**Every melting and boiling point is real** (CRC Handbook of Chemistry and Physics, 97th ed., at 1 atm), shown in
°C and K. The activity only ever compares two substances when the class's rule gives one answer **and** the real
melting and boiling points agree with it; `tools/validate.js` checks every comparison in every step and question.

---

## What students do

| Part | Steps | What happens |
| --- | --- | --- |
| 1 Melting and boiling | 2 | **What does boiling pull apart?** Predict what is in the bubbles, then warm water past 100 °C: whole H₂O molecules leave. **Temperature and speed:** argon from −200 °C to −170 °C: a still crystal held by a network of dashed IMF lines, a liquid whose lines keep breaking and re-forming, a gas with none. |
| 2 London dispersion forces | 5 | **Helium and neon** (2 and 10 electrons; name the IMFs of each, then predict): boiling points only, since helium never freezes at normal pressure. **Why more electrons attract more:** two atoms side by side, an electron cloud wobbles (a temporary δ−/δ+), the neighbour's cloud follows, they attract; He to Xe, with real cloud sizes and polarizabilities. **The noble gas race:** Ne, Ar, Kr and Xe on one thermometer. **The halogens at 25 °C:** name their IMFs, then predict F₂ gas, Cl₂ gas, Br₂ liquid, I₂ solid. **Checkpoint 1** (4 questions). |
| 3 Dipole-dipole forces | 5 | **Polar molecules have ends:** HCl lined up δ+ to δ−, F₂ with no ends. Races with the same (or nearly the same) number of electrons, each starting with the two Lewis structures and naming the IMFs of each: **HCl and F₂** (18 each), **ethane and fluoromethane** (18 each), **butane (34) and acetone (32)**. **Checkpoint 2** (4). |
| 4 Hydrogen bonding | 7 | **Donor and receiver:** click the H on one water molecule, then a lone pair on another, and the hydrogen bond is drawn. **Which H can be donated?** Click every H on N, O or F in methanol, acetone, ammonia, fluoromethane and HF, with the electronegativity differences beside them (a C–H click explains that 0.35 leaves the H barely δ+). **Draw hydrogen bonds** between two ethanol molecules, water donating to ethanol, ethanol donating to water, and water to acetone (and predict: can acetone hydrogen bond with itself?). **Count the hydrogen bonds:** name the IMFs of ethanol and ethylene glycol from their structures, count (1 and 2), then race them; then methane, ammonia and water, all 10 electrons (0, 1, 2). **Checkpoint 3** (5), with the electronegativity table beside it. |
| 5 All together | 2 | **Three forces, 18 electrons each:** name the IMFs of F₂, HCl and CH₃OH, put them in order, then race them. **Checkpoint 4** (5). |

IMF names, predictions, races, clicks, drawings and counts must be finished to move on, but none is graded. Each race's
thermometer stays locked until the student has predicted, and the step is done once every substance has boiled.

### The class's rules, and what is left out

- **IMFs are between molecules.** Boiling separates molecules; the bonds inside them stay whole.
- **LDF** in every substance, compared by **electron count**; students use the word **polarizability**
  (greater polarizability, stronger LDF). "Van der Waals" never appears.
- **Dipole-dipole forces** in polar molecules, always compared with LDF at (nearly) the same electron count. Two
  polar molecules are never compared by how polar they are.
- **Hydrogen bonding**: the **donor** is an H bonded to N, O or F; the **receiver** is a lone pair on N, O or F
  of another molecule. Students count **how many hydrogen bonds a molecule can make: the smaller of its H atoms on
  N, O or F and its lone pairs on N, O or F** (water 2, ammonia 1, ethanol 1, ethylene glycol 2). This predicts
  every comparison in the activity, and the validator checks it against the real data.
- **LDF < dipole-dipole < hydrogen bonding** for molecules with about the same number of electrons.
- **Left out on purpose:** isomers and contact area, the H₂/He exception, comparing degrees of polarity, organic
  class names (molecules go by their names, with everyday uses: ethanol in hand sanitizer, ethylene glycol
  antifreeze, acetone nail polish remover). Two comparisons that look tempting are kept out because the real data
  would contradict the rule: ethanol against methanol (the boiling points follow the electrons, the melting points
  do not) and water against ethylene glycol (the same number of hydrogen bonds, and the melting points reverse).
  Ammonia and HF (1 hydrogen bond each) are never compared with each other.
- The "Which H can be donated?" step and the checkpoint compare only H–F, H–O and H–N with H–C and never give a
  cutoff number, so nothing suggests that HCl's H (a difference of 0.96) can be donated.

---

## The heating stage (`src/js/heat.js`)

Each box runs a real particle simulation: the particles attract each other (a Lennard-Jones pull that grows as two
come close, with a push at very short range), fall gently to the floor, and are held at the box's temperature by a
thermostat. Cold, they settle into a packed crystal that only vibrates; warmer, a liquid that flows at the bottom;
hot enough, they break free and fill the box.

- **The phase is real.** Each box is tuned from its substance's real melting and boiling points, so it melts and
  boils where the substance does, and the label under it comes straight from those points.
- **Dashed lines are the IMFs.** Every pair of particles close enough to attract strongly is joined by a dashed
  line. A solid is a still network of them; in a liquid the network keeps breaking and re-forming; a gas is drawn
  as ideal, with no lines at all.
- **The motion shows the idea, not real speeds.** A solid barely vibrates, a liquid flows slowly and a gas flies.
  The simulation's reduced temperature runs 0.03 to 0.15 in a solid, 0.33 to 0.38 in a liquid and 1.8 to 2.8 in a
  gas, so the condensed phases stay calm and visibly held together.
- Particles are drawn as their molecule's shape but move as single balls, and sizes are not to scale.
- With `prefers-reduced-motion`, each box shows a settled still picture that updates as the thermometer moves.

The electron-cloud step (`cloud.js`) uses each noble gas atom's real radius and polarizability (`data.js`) for
the size of each cloud and how far it shifts. Its "attraction right now" bar is a picture of the idea, not a
measured force.

---

## Grading

**A score, from the four checkpoints only.** 18 questions per attempt (4 + 4 + 5 + 5) from a pool of 58; the
**first answer** to each counts. Each checkpoint always includes its core questions (★ in `ANSWER_KEY.md`) and
fills the rest at random. The SCO writes `cmi.core.score.raw` (0 to 100) after every answer, out of all 18;
`lesson_status` becomes `completed` on the results screen; no `masteryscore`. Each answer is also a
`cmi.interactions` record. The results screen offers a new attempt; the gradebook keeps the best finished
attempt. Progress is saved only in `cmi.suspend_data` (under 1 KB), so resetting an attempt in Schoology starts
it over (`localStorage` is used only without an LMS). A save from another release is ignored. Bump `SCHEMA` in
`src/js/app.js` whenever the steps, a quiz pool or a substance changes.

---

## Building and uploading

```bash
node tools/validate.js                    # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh                                # dist/intermolecular-forces-v2.zip
node tools/walkthrough.js                 # optional, Playwright: plays the whole activity against a fake LMS
node tools/layout.js                      # optional, Playwright: fits a Chromebook, 1366x650 and 1366x520
```

Upload `dist/intermolecular-forces-v2.zip` in Schoology with **Add Materials → Add File/Link/External Tool → Add
File** (or **Package**), enable the gradebook column, and preview as a student: the badge in the top right should
read **Connected to the LMS**. The SCORM identifiers and the storage key are this package's own.

### Teacher links

```
src/index.html?step=noble                      jump to any step (ids in ANSWER_KEY.md, or numbers 1 to 22)
src/index.html?explore=H2O,NH3,CH4,HF          up to four substances on one thermometer (ids in data.js)
```

None of these save progress or report anything.

### What the validator checks

`tools/validate.js` refuses the activity when an electron count, a polarity, a strongest force or a hydrogen-bond
count disagrees with the textbook answers written in the validator; an atom in a drawing lacks its octet; any
comparison (race, prediction, ranking, question) is not decided by the class's rule or the real melting and
boiling points disagree with it; helium is compared with anything but neon, or given a melting point; a race's
thermometer does not cross every boiling point; a step compares substances without having students name their
IMFs first, offers fewer forces than one of its substances has, or the force checker accepts a wrong set; a
question names a molecule without drawing its Lewis structure; a drawing task's donor cannot donate or its receiver has no lone
pair on N, O or F; a checkpoint answer no longer matches the model; a temperature quoted in a question or step is
not a real melting or boiling point in the data; student text uses "van der Waals", an organic class name or
"acceptor"; or any file contains an em dash.

---

## Layout

```
intermolecular-forces-scorm/
├── src/
│   ├── imsmanifest.xml
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── util.js       small helpers (from the Lewis structures activity)
│       ├── data.js       elements, melting and boiling points, structures, atom sizes and polarizabilities
│       ├── chem.js       electrons, polarity, forces, hydrogen bonds, the class's comparison rule, phases
│       ├── mol2d.js      Lewis structures as SVG, scenes of several molecules, hydrogen bonds
│       ├── heat.js       the heating stage
│       ├── cloud.js      the electron clouds (where LDF come from)
│       ├── picker.js     drag, click or keyboard placement
│       ├── quiz.js       checkpoint questions
│       ├── scorm.js      SCORM 1.2 run-time wrapper
│       └── app.js        steps, saving, scoring
├── tools/                validate.js, answer-key.js, walkthrough.js, layout.js
├── build.sh
├── ANSWER_KEY.md         generated
└── README.md
```

No CDN, no web fonts, no WebGL, no network calls. Every action works by mouse, touch and keyboard (Tab and
Enter; the arrow keys move the thermometer), every drawing and box carries a text description, colour is never
the only signal (phases are named, charges read δ+ and δ−), and the page follows the system light or dark setting.

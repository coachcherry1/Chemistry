# Lewis Structures — The 5 Rules

A SCORM 1.2 activity for Schoology. Students build Lewis structures one rule at a time:

1. Sum the valence electrons.
2. Place the least electronegative atom (the first written, excluding H) in the center and connect all
   atoms with single bonds.
3. Fill the octets of the external atoms — not H, which is stable with a doublet.
4. Place ANY remaining electrons on the central atom.
5. If the central atom is electron deficient, use lone pairs of electrons to create double and triple
   bonds.

Written for an honors introductory chemistry class: molecules, polyatomic ions and oxyacids, no
resonance, and **no expanded octets** — a student who gives S, P or Cl more than 8 electrons is told,
with some attitude, to stop looking up answers with AI and follow the 5 rules. About 25–30 minutes.

---

## What students do

| Part | Steps | What happens |
| --- | --- | --- |
| 1 Molecules | 5 | A worked example (NH₃) they step through rule by rule. Then they build **PCl₃** (Rule 5 has nothing to do), **CH₂O** (a double bond) and **HCN** (Rule 5 runs twice: a triple bond). **Checkpoint 1** (4 questions). |
| 2 Polyatomic ions | 4 | **NH₄⁺** (a + charge takes an electron away), **ClO₃⁻** (a − charge adds one; a lone pair on Cl), **SO₄²⁻** (S already has 8 after Rule 4 — the first expanded-octet trap). **Checkpoint 2** (4). |
| 3 Oxyacids | 3 | **H₂SO₄** (every H bonds to an O; the second trap) and **HNO₂** (Rule 5 with a period-2 central atom). **Checkpoint 3** (4). |
| 4 On your own | 4 | Three builds picked at random per student: one oxyanion (PO₄³⁻, SO₃²⁻, ClO₄⁻, ClO₂⁻, BrO₃⁻, IO₄⁻), one oxyacid (H₃PO₄, H₂SO₃, HClO₄, HClO₃, HSO₄⁻, H₂PO₄⁻), one multiple bond (H₂CO₃, CO, CN⁻, CO₂). **Checkpoint 4** (4). |

### The builder

The 5 rules stay on the left the whole time, with an **electron bookkeeping** table that fills in as
each rule checks out (32 → −12 → 20 left → −20 → 0 left …). A rule unlocks only when the one before it
is right.

| Rule | What the student does | What the feedback catches |
| --- | --- | --- |
| 1 | Types the valence electrons — in a table (element × atoms × valence each, then the charge) for the first five builds, then just the total. The periodic table is right there, with group numbers but no valence counts. | Forgetting the charge, applying it the wrong way, forgetting a subscript, a wrong group. |
| 2 | Drags (or clicks) the central atom onto the center spot, then every other atom into a spot around it — each spot is a single bond. A spot appears beyond each outer atom too, for an H that bonds to that atom. Then: electrons used in bonds, electrons left. | H in the center; the wrong central atom ("the first written, not counting H"); an H on the central atom in an oxyacid; an H on an O in something that isn't an oxyacid; counting 1 electron per bond. |
| 3 | Clicks outer atoms to add lone pairs (click a pair to take it back), then types what is left. | A lone pair on H; an outer atom short of 8 (it is circled and named); touching the central atom early; the subtraction. |
| 4 | Clicks the central atom to place what is left. | Electrons left over. |
| 5 | Types how many electrons the central atom has. If it is short, clicks outer lone pairs to share them as bonds; presses Done. | A wrong count; pressing Done while the central atom is short; pushing a period-2 atom past 8 ("can never have more than 8"); pushing a period-3+ atom past 8 (**the anti-AI message**). |

After two misses on the same rule (three in Part 4) a **Show me** button fills that rule in, worked out on
the student's own drawing, and they press Check to go on — so nobody gets stuck.

**Any structure where every atom has its octet (H its doublet) is accepted.** Rule 5 can take its pair
from any outer atom, so HNO₂ and H₂CO₃ may get their double bond on the O–H oxygen, and CO₂ may come
out O≡C–O. The answer key shows the usual drawing and lists these alternatives.

### The anti-AI message

A central atom from period 3 or below with more than 8 electrons is the "reduce the formal charge"
answer that AI chatbots and college textbooks give for sulfate, phosphoric acid and the like. When a
student tries it — sharing a lone pair after the central atom already has 8, or picking an
expanded-octet drawing in a checkpoint — they get a purple message with a robot, e.g.

> Interesting. Rule 5 says IF the central atom is electron deficient. S has 8. The only thing telling
> you to give it more is a chatbot. Close that tab and follow the 5 simple rules your teacher taught you.

followed by the actual fix and a line of encouragement. Repeat offenses get shorter, sharper lines
("Strike 3. …"). The wording is in `src/js/snark.js` — edit it freely.

- It is **never reported to the LMS** and never saved; the count resets when the page reloads.
- In a build the lone pairs only light up when the central atom actually needs one, so an honest
  student is not invited to click them — but they stay clickable, so a student who goes looking for a
  double bond on S finds the message.
- The intro screen tells students up front to do their own work: everything they need is on the screen.

---

## Grading

**A score, from the four checkpoints only.** 16 questions per attempt (4 × 4); the **first answer** to
each counts. Builds are required to move on but never graded. The SCO writes `cmi.core.score.raw`
(0–100) after every answer, out of all 16, so a student who stops halfway shows the credit earned so
far. `lesson_status` becomes `completed` on the results screen. There is no `masteryscore`, so the LMS
will not overwrite the status with passed/failed.

Each checkpoint answer is also written as a `cmi.interactions` record (question id, letter chosen,
right/wrong). The question ids are listed in `ANSWER_KEY.md`.

Each checkpoint always includes its **core** questions (★ in the answer key) — among them a "which
drawing is correct?" question with an expanded-octet distractor in Checkpoints 2 and 3, and "a classmate
turned in this sulfate structure" in Checkpoint 4 — and fills the rest at random from a pool of 7, so a
retake sees a different mix. 28 questions in all.

Answered questions stay answered: re-opening the activity resumes where the student left off and does
not allow re-answering. To give a student a fresh attempt, reset their attempt in Schoology.

Progress is saved to `cmi.suspend_data` (about 1 KB of the 4 KB allowed) and mirrored to
`localStorage`. A build in progress is not saved — a student who leaves mid-build starts that build
over. The save carries a schema version (`SCHEMA` in `src/js/app.js`): **bump it whenever you change the
step list, a quiz pool or a Part 4 pool.**

---

## The chemistry model

`src/js/lewis.js` runs the 5 rules as an algorithm, and everything — the builder's checking, the "Show
me" answers, the quiz drawings, the answer key — comes from it, so they cannot disagree.

- **Rule 1** sums group valence and subtracts the charge (−2 adds 2).
- **Rule 2** takes the first element written that isn't H as the central atom. In an oxyacid each H
  bonds to an O.
- **Rule 3** gives every outer atom 8 (H 2); **Rule 4** puts the rest on the central atom.
- **Rule 5**, only while the central atom has fewer than 8, turns an outer lone pair into a bond.

What is in scope was chosen so the rules give one answer, and `tools/validate.js` enforces it:

- **No resonance.** Every species has exactly one best structure (smallest total formal charge — used
  only inside the validator, never shown to students). O₃, CO₃²⁻, NO₃⁻, NO₂⁻, HNO₃, HCO₃⁻, SO₂ and SO₃
  are left out; the validator checks that it would catch them.
- **No legitimate expanded octets.** Nothing where Rule 4 gives the central atom more than 8 (SF₄,
  XeF₄, PCl₅), so "more than 8 is wrong" holds for the whole activity.
- **No boron**, which stops at 6.
- **The first atom written really is the least electronegative** in every formula (checked against
  Pauling values).

---

## Building and uploading

```bash
./build.sh                          # → dist/lewis-structures-v1.zip
./build.sh lewis-structures-period3 # → dist/lewis-structures-period3.zip
```

`imsmanifest.xml` has to sit at the root of the zip, which is why `build.sh` zips from inside `src/`.
Zipping the `src` folder itself produces a package Schoology rejects.

To upload:

1. In your Schoology course, **Add Materials → Add File/Link/External Tool → Add File** and upload
   `dist/lewis-structures-v1.zip`, or use **Add Materials → Package** if your install shows it.
2. Schoology detects the SCORM manifest and creates a SCORM item.
3. Open the item's settings and enable the gradebook column. It receives the 0–100 score.
4. Open it once as a student (Preview as Student) and check that the badge in the top right reads
   **Connected to the LMS**.

If that badge reads **Standalone — no LMS detected** inside Schoology, the SCO could not find the
SCORM API — almost always because Schoology served the zip as a plain file rather than launching it
as SCORM.

A built `dist/lewis-structures-v1.zip` is committed, so you can upload it without running anything.

### Testing without an LMS

Open `src/index.html` in a browser. Everything works; the badge reads *Standalone* and nothing is
reported. A *Start over* button on the results screen clears the saved progress.

### Teacher links for class

```
src/index.html?build                 build any species with the class — pick from a list
src/index.html?build=H2SO4           start on one species (IDs are in ANSWER_KEY.md)
src/index.html?step=b-SO4            jump to any step (ids or numbers 1–17) to preview it
src/index.html?step=b-ion&pick=PO4   preview a Part 4 step with a chosen species
```

None of these save progress or report anything.

---

## Editing the content

| File | What it holds |
| --- | --- |
| `src/js/species.js` | Every molecule and ion: formula, charge, where the atoms are drawn, the hand-written answer, and the Part 4 pools |
| `src/js/quiz.js` | The checkpoint questions. The correct choice is written **first**; the order is shuffled on screen. A choice can be a drawing (`{ lewis: 'SO4', mod: { expand: 2 } }`). `fact` ties a numeric answer to the rules so the validator can check it. |
| `src/js/snark.js` | The anti-AI messages |
| `src/js/builder.js` | The rules' wording (`RULES`) and all the builder's feedback |
| `src/js/app.js` | The step list (`STEPS`) and the instructions above each step |
| `src/js/elements.js` | Valence electrons, periods, and the periodic table students see |

After any edit:

```bash
node tools/validate.js                  # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh
```

`tools/validate.js` refuses an activity where:

- a species' hand-written answer is not what the 5 rules give;
- a species has resonance, a legitimate expanded octet, or an odd electron count;
- the first atom written (not H) is not the least electronegative;
- an oxyacid has an H on the central atom, or the layout doesn't hold the formula's atoms;
- a Part 4 pool holds the wrong kind of species;
- a quiz answer disagrees with the rules, a "correct" drawing is invalid, a wrong drawing is valid, or
  two choices are the same;
- a quiz pool is smaller than its draw, or a question id cannot be a SCORM interaction id;
- the saved state could outgrow SCORM 1.2's 4 KB.

`tools/walkthrough.js` (optional, needs Playwright) plays the whole activity in a headless browser
against a fake LMS — wrong totals, wrong central atoms, an expanded-octet attempt on every period-3
build, wrong checkpoint answers (two of them expanded-octet drawings), a reload halfway — and checks the
score, status and interaction records that arrive, and that nothing about the anti-AI messages does.

To shorten the activity, lower `draw` in `src/js/quiz.js` or remove steps from `STEPS` in
`src/js/app.js`, then bump `SCHEMA`.

---

## Layout

```
lewis-structures-scorm/
├── src/
│   ├── imsmanifest.xml   SCORM 1.2 manifest — must be at the zip root
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── util.js       small DOM and random-number helpers
│       ├── elements.js   valence electrons, periods, the periodic table
│       ├── species.js    the molecules and ions, and the Part 4 pools
│       ├── lewis.js      the 5 rules as an algorithm; checking a structure
│       ├── draw.js       Lewis structures as SVG
│       ├── picker.js     drag, click or keyboard placement (shared with the Newman activity)
│       ├── snark.js      the anti-AI messages
│       ├── builder.js    building one structure, rule by rule
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

No CDN, no web fonts, no network calls: it works offline inside a locked-down LMS iframe and on a
Chromebook.

## Accessibility

Placing atoms works by drag, by click-then-click, and by keyboard (Tab to an atom, Enter; Tab to a spot,
Enter). Atoms and lone pairs in the drawing are buttons: Tab to one and press Enter. Every drawing has a
text description (atoms, bonds, lone pairs), feedback is announced through a live region, element
colors are never the only signal (the symbol is always there), the page follows the system light/dark
setting, and `prefers-reduced-motion` turns off the animation. On a phone the drawing comes first and the
rules card follows it.

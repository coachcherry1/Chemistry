# Resonance — Structures and the Hybrid

A SCORM 1.2 activity for Schoology, the follow-up to **Lewis Structures — The 5 Rules** and built the
same way. Students use the same 5 rules and the same builder; this time Rule 5 has a choice to make.

1. Sum the valence electrons.
2. Place the least electronegative atom (the first written, excluding H) in the center and connect all
   atoms with single bonds.
3. Fill the octets of the external atoms — not H, which is stable with a doublet.
4. Place ANY remaining electrons on the central atom.
5. If the central atom is electron deficient, use lone pairs of electrons to create double and triple
   bonds.

Written for honors chemistry, **equivalent resonance structures only**: ozone, nitrite, nitrate,
carbonate, and on their own SO₂, SO₃ or formate. Non-equivalent resonance (CO₂'s O≡C–O, HNO₃, HCO₃⁻,
acetone…) is beyond the class and left out. The goal is the picture students should carry away: **the
real molecule is the hybrid** — every shared bond identical, a solid line plus a dashed line, the shared
electrons spread out — and it never flips between the structures. Its bonds are in between a single and a
double bond in length *and* in strength, which students compare against molecules with no resonance
(H–O–O–H and O=O for ozone). About 25–30 minutes.

---

## What students do

| Part | Steps | What happens |
| --- | --- | --- |
| 1 Ozone | 5 | Build **O₃** with the 5 rules. *Two students, two answers*: both followed the rules, so which is right? (Both — and neither is the real molecule.) Resonance structures and the ↔ arrow are introduced. Then **the hybrid**, the mule analogy, and the bond-length evidence. **How strong are ozone's bonds?** — rank the O–O bonds of hydrogen peroxide (single), ozone (1½) and oxygen gas (double), then see the bond orders, lengths and energies. **Checkpoint 1** (4 questions). |
| 2 Nitrite & nitrate | 6 | Build **NO₂⁻**, find its other resonance structure, its hybrid. Then **NO₃⁻** from the structure after Rule 4: find all three, the hybrid (bond order 1⅓). **Checkpoint 2** (3). |
| 3 Carbonate | 4 | Build **CO₃²⁻**, find all three, the hybrid and the evidence. **Checkpoint 3** (3). |
| 4 On your own | 4 | One of **SO₂, SO₃** or **formate (HCO₂⁻)**, picked at random per student: build it with fewer hints, find every structure, the hybrid. **Checkpoint 4** (4). |

### The steps

- **Build** — the builder from the Lewis activity, unchanged: the rules card, the electron bookkeeping,
  Show me after two misses (three in Part 4), Undo last bond. The builds in Parts 1–3 end with a note
  that Rule 5 could have picked a different O.
- **Find every resonance structure** — structure A (the one they built) is already in the row. Below it
  is the structure after Rule 4; they click a lone pair on a *different* O, press **Add this structure**,
  and it joins the row with a ↔. When they think they have them all, **I’ve found them all**. Feedback
  catches: a structure they already have ("the same as structure A"), adding before Rule 5, stopping too
  early ("one O has not had the double bond yet"), a second double bond on a full central atom (period 2:
  "can never have more than 8"; S: **the anti-AI message**).
- **The hybrid** — three short beats:
  1. **Predict** the bond order (1, 1½, 1⅓, 2, or "one bond is 2 and the others are 1"). Not graded; the
     explanation shows the arithmetic, e.g. (2 + 1 + 1) ÷ 3 = 1⅓.
  2. **Average them** — an animation: structure A on its own, then all the structures laid on top of each
     other at partial opacity (the double bond is "in every place at once"), then they fade into the
     hybrid. A key explains the drawing.
  3. **The evidence** — a bond-length ruler with a typical single and double bond marked. Students slide
     a marker to predict, lock it in, and the measured length appears: in between, and the same for every
     bond. (O₃, NO₂⁻, NO₃⁻ and CO₃²⁻ only — see *The chemistry* below.)

### What the hybrid looks like

Drawn from the structures by averaging, never by hand:

- every shared bond is a **solid line plus a dashed line**, labelled with its bond order (1½ or 1⅓);
- a **shaded cloud** over those bonds — where the shared electrons spread out;
- **no partial charges** (δ+/δ−) and no formal charges;
- **no lone pairs**, to keep the picture clear (the key says so);
- the same atoms in the same places as the resonance structures, so the overlay lines up exactly.

The checkpoints ask students to pick the hybrid out of four drawings: the hybrid, one resonance structure
drawn alone, every bond double (or every bond single), and only some bonds partial.

### The anti-AI message

The same as the Lewis activity: a second double bond on S in SO₂ or SO₃ (the expanded-octet answer that
chatbots and college textbooks give) gets a purple message with a robot telling the student to stop
looking up answers with AI and follow the 5 rules, then the fix. It shows up in the resonance search (Part
4, or the teacher demo) and in one checkpoint drawing. It is **never reported to the LMS** and never saved.
The wording is in `src/js/snark.js`.

---

## Grading

**A score, from the four checkpoints only.** 14 questions per attempt (4 + 3 + 3 + 4); the **first
answer** to each counts. Builds, resonance searches and predictions are required to move on but never
graded. The SCO writes `cmi.core.score.raw` (0–100) after every answer, out of all 14; `lesson_status`
becomes `completed` on the results screen. There is no `masteryscore`, so the LMS will not overwrite the
status with passed/failed. Each answer is also a `cmi.interactions` record (question id, letter chosen,
right/wrong); the ids are in `ANSWER_KEY.md`.

Each checkpoint always asks its **core** questions (★ in the answer key) — "does ozone flip back and
forth?", "rank the O–O bonds of H₂O₂, O₃ and O₂ by strength", "pick the nitrate hybrid", "how strong is a
nitrate N–O bond next to a single and a double bond?", "pick the carbonate hybrid", "rank the C–O bonds of
methanol, carbonate and formaldehyde by strength", "which of these has resonance?", "which SO₂ structure
follows the rules?" — and fills the rest at random from its pool, so a retake sees a different mix. 25
questions in all.

Progress is saved to `cmi.suspend_data` (under 1 KB of the 4 KB allowed), which belongs to one student's
one attempt — resetting an attempt in Schoology starts it over, and a second student on the same
Chromebook starts fresh. (`localStorage` is used only when the page runs without an LMS.) On leaving, the
SCO sets `cmi.core.exit` to `suspend`, so the LMS resumes the attempt next time — a finished attempt
reopens on its results instead of starting over. A build or search in progress is not saved. **Bump `SCHEMA` in `src/js/app.js` whenever you change the step list, a
quiz pool or the Part 4 pool.**

---

## The chemistry

`src/js/lewis.js` (the same engine as the Lewis activity) runs the 5 rules; **the resonance structures
are every finished structure Rule 5 can reach**, and the hybrid is their average (`src/js/hybrid.js`).
Nothing about a structure or a hybrid is written by hand, so the builder, the search, the drawings, the
quiz answers and the answer key cannot disagree.

- **Equivalent only.** A species is in scope when Rule 5's choices all give the same structure turned
  around. `tools/validate.js` checks this for every species and checks that it would reject CO₂, HNO₃ and
  HCO₃⁻.
- **Bond order** = (2 + 1 + …) ÷ number of structures: 1½ for two, 1⅓ for three. Formate's C–H stays a
  single bond (the validator checks no unshared bond is fractional).
- **Bond lengths** (`src/js/bonds.js`, sources in the file): O₃ 128 pm (O–O 148, O=O 121); NO₂⁻ 124 and
  NO₃⁻ 125 pm (N–O 140, N=O 120); CO₃²⁻ 129 pm (C–O 143, C=O 120). The lesson is qualitative — the bonds
  are all the same length, between a single and a double — and the activity never claims the length is a
  straight-line average of the two (it isn't: the real values sit nearer the double bond). **SO₂ and SO₃
  get no ruler on purpose**: their measured S–O bonds are as short as an S=O double bond, which is the
  expanded-octet picture this class doesn't use.
- **Bond strength** (`STRENGTH` in `src/js/bonds.js`): the energy to break the O–O bond — hydrogen
  peroxide about 210 kJ/mol, ozone about 300, oxygen gas about 500. Ozone's is the **average per bond**
  (pulling O₃ apart into atoms takes about 605 kJ/mol), and the screen says so: breaking just *one* ozone
  bond takes only about 106 kJ/mol, because the O₂ left behind gets a full double bond — a subtlety the
  activity avoids. If your class uses a bond-energy table with O–O at 146 kJ/mol, change 210 to 146 in
  that file; the ranking is the same. The validator checks the ranking, the bond orders and that the
  lengths match the ruler.

---

## Building and uploading

```bash
./build.sh                  # → dist/resonance-v1.zip
./build.sh resonance-test   # → dist/resonance-test.zip
```

`imsmanifest.xml` has to sit at the root of the zip, which is why `build.sh` zips from inside `src/`.

To upload: in your Schoology course, **Add Materials → Add File/Link/External Tool → Add File** (or
**Package**) and upload `dist/resonance-v1.zip`; enable the gradebook column in the item's settings; open
it once as a student and check the badge in the top right reads **Connected to the LMS**. A built
`dist/resonance-v1.zip` is committed, so you can upload it without running anything.

### Testing without an LMS

Open `src/index.html` in a browser. Everything works; the badge reads *Standalone* and nothing is
reported. A *Start over* button on the results screen clears the saved progress.

### Teacher links for class

```
src/index.html?build               pick any species; build it, find its resonance structures, or show its hybrid
src/index.html?build=CO3           start on one species (IDs are in ANSWER_KEY.md)
src/index.html?step=h-CO3          jump to any step (ids or numbers 1–20) to preview it
src/index.html?step=r-own&pick=SO3 preview a Part 4 step with a chosen species
```

The board mode also lists species with no resonance (H₂O, NH₄⁺, HCN, CH₂O, SO₄²⁻, ClO₃⁻) for contrast.
None of these links save progress or report anything.

---

## Editing the content

| File | What it holds |
| --- | --- |
| `src/js/species.js` | Every molecule and ion, the hand-written answer (`n` = how many resonance structures), and the Part 4 pool |
| `src/js/bonds.js` | The bond lengths for the ruler, and the bond energies for the strength comparison |
| `src/js/quiz.js` | The checkpoint questions. The correct choice is written **first**; the order is shuffled on screen. A choice can be a hybrid drawing (`{ hybrid: 'NO3', variant: 'one' }`) or a Lewis drawing (`{ lewis: 'SO2', mod: { expand: 1 } }`). `fact` ties an answer to the chemistry so the validator can check it. |
| `src/js/app.js` | The step list (`STEPS`), the instructions above each step, the ozone comparison, the hybrid step |
| `src/js/snark.js` | The anti-AI messages |

After any edit:

```bash
node tools/validate.js                  # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh
```

`tools/validate.js` refuses an activity where a species' hand-written answer (electrons, bonds, central
lone pairs, number of structures) is not what the 5 rules give; a species has non-equivalent structures,
an octet exception, or a structure the builder would reject; the first atom written is not the least
electronegative; a hybrid's bonds are not all the same order, its order is not 1½ or 1⅓, or its charges
don't add up; a bond length is not between its single and double bond; a step uses a species with no
resonance or a hybrid step has no evidence; a quiz answer disagrees with the chemistry, a wrong drawing is
right, or two choices are the same; no checkpoint choice can trigger the anti-AI message; or the saved
state could outgrow 4 KB.

`tools/walkthrough.js` (optional, needs Playwright) plays the whole activity in a headless browser
against a fake LMS — wrong totals and central atoms, Rule 5 made, undone and remade; every resonance
search with a repeat, an early "found them all" and a refused second double bond (the anti-AI message for
SO₃); every hybrid with a wrong prediction, the animation and the ruler; wrong checkpoint answers; a reload
halfway and a step back; a fresh attempt in the same browser — and checks the score, status and
interaction records that arrive, and that nothing about the anti-AI messages does. `POOL=SO3` forces the
Part 4 species; `ALL=1` first builds and searches every resonance species.

---

## Layout

```
resonance-scorm/
├── src/
│   ├── imsmanifest.xml   SCORM 1.2 manifest — must be at the zip root
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── util.js       small DOM and random-number helpers
│       ├── elements.js   valence electrons, periods, the periodic table
│       ├── species.js    the molecules and ions, and the Part 4 pool
│       ├── bonds.js      measured bond lengths and bond energies
│       ├── lewis.js      the 5 rules as an algorithm (same as the Lewis activity)
│       ├── draw.js       Lewis structures and hybrids as SVG
│       ├── picker.js     drag, click or keyboard placement
│       ├── snark.js      the anti-AI messages
│       ├── builder.js    building one structure, rule by rule (same as the Lewis activity)
│       ├── hybrid.js     the resonance structures, the hybrid, the overlay, the ruler
│       ├── resonance.js  finding every resonance structure
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

Everything works by mouse, touch or keyboard: atoms, lone pairs and choices are buttons (Tab, Enter), and
the ruler is a standard slider (arrow keys). Every drawing has a text description — nitrate's hybrid
says "3 identical N–O bonds, each drawn as a solid line plus a dashed line (bond order 1⅓), with the
shared electrons spread over all of them" — and the animation's captions are announced. The bond-strength
evidence is a real table (the bars are decoration; the numbers are in the text). Feedback goes through
a live region, element colors are never the only signal, the page follows the system light/dark setting,
and `prefers-reduced-motion` skips the animation straight to the hybrid. On a phone the resonance
structures stack vertically with ↕-turned arrows.

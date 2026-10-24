# ¹H NMR — An Introduction

A click-and-drag SCORM 1.2 activity for Schoology that introduces proton NMR one idea at
a time: chemically equivalent hydrogens, chemical shift, integration and splitting, then
all four together.

Built as a companion to the IR diagnostic-region activity: the same drag-a-label
interaction, completion-only grading and packaging, with a level per concept.

---

## The five levels

| Level | Name | What the student does |
| --- | --- | --- |
| 1 | Equivalent H | The compound is drawn with every hydrogen-bearing group as a capsule (CH₃, CH₂, OH …). The student picks a colour and clicks groups to colour each **set of equivalent hydrogens** alike, then checks. A correct grouping reveals the spectrum, its signals labelled in the student's colours: one set, one signal. Five compounds. |
| 2 | Chemical shift | The compound is drawn with its sets lettered **a, b, c**. The student drags each letter onto the signal it produces, reasoning from the **shift table** (available below the spectrum). Five compounds. |
| 3 | Integration | The compound is **hidden**; only its molecular formula is shown. Relative integrals are printed under the signals and the integral curve is drawn. The student works out how many H each signal holds and drags **3H, 2H …** onto it. The compound is revealed at the end. Four compounds. |
| 4 | Splitting | The compound is drawn and lettered. The student **predicts** each set's multiplicity with the n + 1 rule by dragging **singlet, doublet, triplet …** onto it. Once every set has one, the spectrum appears, labelled, so the prediction can be checked against the real multiplets. Five compounds. |
| 5 | Solve it | The compound is hidden and the H count is printed under each signal. The student reads shift, integration and splitting together and picks the compound from three structures. Four compounds. |

Each level opens with a short lesson screen — the key idea, a worked example where it
helps, and how to play — and the reference panel under the plot keeps that level's table
or rules at hand while it runs: the equivalence tests, the shift table, the integration
method, the n + 1 table and the common patterns (ethyl, isopropyl, tert-butyl).

Levels unlock in order. Wrong answers are never penalised: the label returns to the tray and
the feedback explains the reasoning. For example, dropping *quartet* on the CH₃ of an ethyl
group returns

> Not a quartet. Set a (CH₃) is bonded to the CH₂ (2 H). Add up the H that split it,
> then add one.

and dropping *triplet* on a CH₂ next to a CH₃ — the commonest slip, n lines instead of
n + 1 — returns

> Not a triplet — 3 is the number of neighbouring H. The rule is n + 1.

Twenty-three compounds is a class period. To shorten it, lower `items` in
`src/js/levels.js`; `tools/validate.js` checks the level can still be filled.

### What every run includes

The draw is **balanced, not purely random.** Each level lists `needs` in `levels.js` and
fills them first, then draws the rest preferring a compound family not yet used:

| Level | Every run includes |
| --- | --- |
| 1 | a symmetric molecule, a branched one, a ring, and a "trap" — two groups that look alike but are not equivalent (the two CH₃ groups of methyl acetate) |
| 2 | a C–H on a carbon bonded to O, a C–H next to C=O, a far-downfield signal (aromatic, alkene, aldehyde or acid), and a C–H on a carbon bonded to Br |
| 3 | a ratio with halves to scale up (1.5 : 1), a set of 6 H or more, and three or more signals |
| 4 | a sextet or septet, an O–H, a singlet from a group with no neighbouring H, and a quartet |
| 5 | a free draw across the bank |

Which compound fills each place varies, so a retry is a different set, and the run avoids
reusing a compound across levels. Over 3,000 simulated runs every need was met every time,
no level ever repeated a compound, and every compound in each level's pool was drawn.

### The compound question (Level 5)

The two decoys are chosen to need reasoning, not recognition. They are ranked by how alike
their spectra would look — same number of signals first, then the same splitting pattern
and integration shape, then the same H counts and shift regions — so:

- **ethyl acetate** comes up against **methyl propanoate** and **2-butanone**. All three
  give a 3H singlet, a 2H quartet and a 3H triplet; only the shifts decide it (the quartet
  at 4.1 is a CH₂ on the ester O).
- **bromoethane** comes up against **diethyl ether**: two signals, a quartet and a
  triplet, both 2 : 3. Only the printed H counts — 2H and 3H against 4H and 6H — decide it.
- **2-propanol** comes up against **2-methylpropanoic acid** and **isopropyl acetate**,
  all three with a 6H doublet and a 1H septet.

A wrong pick is explained by the first piece of evidence that rules it out, checked in the
order a student should check: number of signals, then integration, then splitting, then
shift —

> Not Methyl propanoate. The 2H quartet at δ 4.12 sits in the range for H on a carbon
> bonded to O (3.2–5.2 ppm). In Methyl propanoate, the 2H quartet comes from the CH₂
> bonded to the C=O, which would sit at 2.0–2.7 ppm.

Two compounds that agree on every signal's H count, multiplicity and shift region could
not be told apart at this level, so one is never offered against the other.
`tools/validate.js` lists any such pair, and fails if a likely decoy has no single
signal that rules it out. `ANSWER_KEY.md` tables the usual decoys for every compound with
the message a student sees.

---

## Where the spectra come from

**Every spectrum is generated, not scanned.** Each compound in `src/js/molecules.js` is a
small graph — atoms, bonds, and which set of equivalent hydrogens each group belongs to —
plus a literature chemical shift (CDCl₃) for each set. From that:

- **integration** is the number of H in each set, counted from the structure;
- **splitting** is the number of H on directly bonded atoms (the n + 1 rule), also counted
  from the structure: equivalent H do not split each other, and O–H hydrogens exchange, so
  they neither split nor are split;
- each line of an n + 1 multiplet gets its Pascal's-triangle share of the set's area, and
  is drawn as a Lorentzian, so peak heights follow from areas exactly as on an instrument.

Integration and splitting are never typed in, so they cannot disagree with the structure a
student sees. The equivalence of groups *is* typed in — it is what Level 1 asks about — and
`tools/validate.js` refuses a set whose groups have different neighbours.

Spectra are simulated as **first order at 60 MHz with one coupling constant, J = 7 Hz**.
60 MHz is a real benchtop field, and it spreads a quartet over about 0.35 ppm, so multiplets
can be counted on the full plot. Where the outer lines of a multiplet would be too small to
see — a septet beside a 6H doublet, typically — the plot adds a vertical **expansion** above
the signal, labelled ×4 or ×8, the way a printed spectrum does. TMS is drawn at 0 ppm.

A seeded jitter moves each shift by up to ±0.015 ppm and adds a couple of percent of noise
to the printed integrals, so a compound never draws identically twice and the integrals
have to be rounded rather than read.

Nothing is copied from a spectral database, so nothing restricts redistributing the
package, and every peak position is known exactly. The plot redraws at the container's
size, so it stays crisp in a Schoology iframe, on a Chromebook and on a phone; on a narrow
screen a wide spectrum scrolls sideways inside its frame rather than squeezing its
multiplets until the lines merge.

---

## Grading

**Completion only.** The SCO writes `cmi.core.lesson_status = "completed"` once a student
finishes all five levels and writes no numeric score, so the Schoology column reads
complete / incomplete rather than a percent.

Students still see their own first-try accuracy on the level-complete and finish screens —
it just isn't reported.

To report a percent instead, set `cmi.core.score.raw` alongside the status in
`markComplete()` in `src/js/scorm.js` and add an `<adlcp:masteryscore>` to
`src/imsmanifest.xml`.

Progress is saved to `cmi.suspend_data` when the activity opens and after every answer, so
a student who closes the window mid-activity resumes where they left off (at the start of
the compound they were on). It also mirrors to `localStorage`, which is what makes resume
work when the activity is opened outside an LMS.

The save carries a schema version (`SCHEMA` in `src/js/game.js`). **Bump it whenever you
change the level list, the draw or compound ids** — a save written by an older build is
then discarded rather than resumed.

---

## Building and uploading

```bash
./build.sh                     # → dist/nmr-intro-v1.zip
./build.sh nmr-unit8-practice  # → dist/nmr-unit8-practice.zip
```

`imsmanifest.xml` has to sit at the root of the zip, which is why `build.sh` zips from
inside `src/` rather than from the project root. Zipping the `src` folder itself will
produce a package Schoology rejects.

To upload:

1. In your Schoology course, **Add Materials → Add File/Link/External Tool → Add File**
   and upload `dist/nmr-intro-v1.zip`, or use **Add Materials → Package** if your install
   shows it.
2. Schoology detects the SCORM manifest and creates a SCORM item.
3. Open the item's settings and enable the gradebook column if you want completion tracked.
4. Open it once as a student (Preview as Student) to confirm the badge in the top right
   reads **Connected to the LMS**.

If that badge reads **Standalone — no LMS detected** inside Schoology, the SCO could not
find the SCORM API. That is almost always a nesting problem, not a code problem — check
that Schoology launched the package as SCORM rather than serving the zip as a plain file.

### Testing without an LMS

Open `src/index.html` directly in a browser. The activity runs identically; the badge reads
*Standalone* and nothing is reported.

### Putting one compound on the board

Append a query string to show a single compound at one level, useful for a lesson demo:

```
src/index.html?molecule=ethylacetate&level=4
```

`molecule` is any `id` from `ANSWER_KEY.md`; `level` is 1–5 (default 5). A pinned compound
never writes to saved progress, so demoing in class will not disturb a student's resume
state.

---

## Editing the content

Three files hold everything a teacher would want to change.

**`src/js/molecules.js`** — the compound bank. To add a compound, copy an existing entry:

```js
{
  id: 'ethylacetate', name: 'Ethyl acetate', formula: 'C₄H₈O₂', family: 'ester',
  kind: 'trap',                 // Level 1 draw: sym, branch, ring, trap or chain
  levels: [1, 2, 3, 4, 5],      // which levels may draw it
  atoms: [
    { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },   // position in bond lengths, label,
    { x: 1, y: 0, t: 'C' },                  // H count, set of equivalent H
    { x: 1, y: 1, t: 'O' },
    { x: 2, y: 0, t: 'O' },
    { x: 3, y: 0, t: 'CH₂', h: 2, s: 'b' },
    { x: 4, y: 0, t: 'CH₃', h: 3, s: 'c' }
  ],
  bonds: [[0, 1], [1, 2, 2], [1, 3], [3, 4], [4, 5]],   // [i, j, order]
  sets: {
    a: { d: 2.05, r: 'carbonyl', env: 'the CH₃ bonded to the C=O' },
    b: { d: 4.12, r: 'oxygen', env: 'the CH₂ bonded to the ester O' },
    c: { d: 1.26, r: 'alkyl', env: 'the CH₃ at the end of the ethyl group' }
  }
}
```

- `d` is the shift in ppm; `r` is a region from `shifts.js`, and `d` must fall inside it.
- `env` is read out in feedback, so it must fit the sentence "b is ___". A set with more
  than one group also needs `all` (the whole set, for "the 6H doublet comes from ___") and
  `why` (why its groups are equivalent — Level 1's feedback when a student splits them).
- An O–H is `{ t: 'OH', h: 1, s: 'c', oh: true }`, and its set is `br: true`.
- Draw chains along y = 0 with branches straight up or down (y = ±1); `ringAtom(i)` places
  hexagon vertices for a ring.

**`src/js/shifts.js`** — the shift table: each region's range, and the `hint` shown as
feedback. That is where to put the wording you use in class.

**`src/js/levels.js`** — the levels: how many compounds each draws, what every run must
include, and the lesson screens.

After any edit, validate and regenerate the key:

```bash
node tools/validate.js           # refuses an ambiguous or inconsistent bank
node tools/answer-key.js > ANSWER_KEY.md
./build.sh
```

`tools/validate.js` refuses a bank where:

- the drawing does not match the formula, element by element and hydrogen by hydrogen;
- a set's shift is outside its region, or its groups differ in label or in neighbours;
- two signals of one compound would overlap on the plot, or one would run into TMS;
- a Level 2 compound has a signal inside another of its regions' ranges (the shift would
  not decide it), or two same-region signals less than 0.4 ppm apart;
- a Level 3 integral ratio is not a whole number of halves;
- a level's pool cannot fill it, or cannot meet one of its needs;
- a likely Level 5 decoy has no single signal that rules it out.

---

## Layout

```
nmr-intro-scorm/
├── src/
│   ├── imsmanifest.xml      SCORM 1.2 manifest — must be at the zip root
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── shifts.js        shift regions, splitting names, feedback wording
│       ├── molecules.js     the compound bank — structures and shifts
│       ├── analysis.js      integration, n + 1 splitting, decoy reasoning
│       ├── spectrum.js      spectrum model and canvas renderer
│       ├── structures.js    structural formula SVG renderer
│       ├── levels.js        the five levels, their draws and lesson screens
│       ├── scorm.js         SCORM 1.2 run-time wrapper
│       └── game.js          interaction, feedback, progression
├── tools/
│   ├── validate.js          item bank checks
│   └── answer-key.js        regenerates ANSWER_KEY.md
├── build.sh
├── ANSWER_KEY.md            generated — every signal of every compound
└── README.md
```

No CDN, no web fonts, no network calls of any kind, and it works offline inside a
locked-down LMS iframe.

A built `dist/nmr-intro-v1.zip` is committed, so you can download and upload it without
running the build.

## Accessibility

Every placement works three ways, so it does not assume a mouse: pointer drag,
click-the-label then click-the-target, and keyboard (Tab to a label, Enter, Tab to a target,
Enter). Groups on the structure are focusable buttons with spoken names, signals carry their
shift, feedback is announced through an ARIA live region, and `prefers-reduced-motion`
disables the shake animation. Colour is never the only signal — every coloured set also
carries its letter. Dark mode follows the system setting.

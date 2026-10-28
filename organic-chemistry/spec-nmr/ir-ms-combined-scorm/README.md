# IR and Mass Spectrometry — Two Spectra, One Compound

A click-and-drag SCORM 1.2 activity for Schoology. Students are given the IR spectrum and
the mass spectrum of one compound. They label the signals in both, build a case file from
what each spectrum says, and identify the compound. Four levels take the help away one
piece at a time.

It comes after the two single-technique packages in this repository —
`ir-spectroscopy-scorm` (the diagnostic region) and the mass spectrometry package
(reading the fragments) — and uses their code, their vocabulary and their feedback
wording. Those two teach each technique on its own; this one teaches reading them together.

---

## The one idea: each spectrum answers different questions

| The mass spectrum tells you | The IR spectrum tells you |
| --- | --- |
| the molecular mass (M⁺) | which functional groups are there |
| chlorine or bromine (an M+2 at 3:1 or 1:1) | O–H vs N–H vs neither |
| nitrogen (an odd M⁺) | C=O, C≡N, C=C |
| how the carbons are joined (base peak, losses) | sp² vs sp³ C–H (the 3000 line) |

Neither is usually enough on its own. The IR cannot tell 1-butanol from 2-butanol; the mass
spectrum cannot tell acetophenone from cumene. Together they nearly always leave one answer.

### The routine

Every compound is read the same way, in the same order, and the **case file** in the side
panel keeps track:

1. **MS** — find M⁺ → the molecular mass
2. **MS** — look two past M⁺ for an M+2 → chlorine or bromine?
3. **MS** — odd or even M⁺ → nitrogen?
4. **IR** — anything left of 3000? → O–H, N–H, sp² or sp C–H
5. **IR** — C=O, a triple bond, C=C? → the functional group
6. **MS** — the base peak and the big losses → how it is put together
7. pick the structure that fits all of it

The mass spectrum goes on top of the screen and the IR below, because the routine starts
in the mass spectrum.

---

## The four levels

| Level | Name | The compound | Help available | What the student does |
| --- | --- | --- | --- | --- |
| 1 | **Read both spectra** | named and drawn | both reference tables; ranges on the labels; the case file fills itself in | Label the marked peaks in both spectra. IR by bond family (C=O, O–H …), MS with M⁺, M+2 and losses. |
| 2 | **One of three** | hidden; three candidates shown from the start | same as Level 1 | Label with the specific IR groups (alcohol vs acid O–H, 1° vs 2° amine), then pick the compound. |
| 3 | **Build the case** | hidden; four candidates appear at the end | no tables, no ranges on the labels; a Hint button | Label both spectra, **fill in the case file yourself** (mass, halogen, nitrogen, what the IR says), then choose from four. |
| 4 | **Unknown** | hidden; four candidates at the end | none — **nothing is marked**; Hint button | Put every label on the peak it belongs to, or in the **"Not in these spectra"** box. Then the case file, then choose. |

Four compounds per level, sixteen in all — about one long class period. To change it, edit
`items` in the `LEVELS` table at the top of `src/js/game.js` (and bump `SCHEMA`, below).

Levels unlock in order. Wrong answers are never penalised: every wrong drop, wrong case-file
answer and wrong pick explains the discriminator, as in both source packages.

### What each level adds

**Level 1** is about seeing the reasoning happen. As each label goes on, the matching line
of the case file fills in and flashes once: M⁺ → the mass, the halogen and the nitrogen;
each IR label → the bond list and then the IR's verdict; the MS losses → the base peak.
The "What each labelled peak is" panel from the mass spec package builds up underneath.

**Level 2** hides the name but shows three structures from the start, so the question is
"which of these?" rather than a blank. After the pick, **How you could tell** lists each
wrong option with what the IR says about it and what the mass spectrum says, and a closing
line states which spectrum was actually needed — see *Which spectrum does the work*, below.

**Level 3** strips the wavenumber ranges and the "lost •CH₃" sub-lines off the labels and
hides the reference tables. Once the labels are placed, the case file asks four questions
in turn:

- *Where is the molecular ion?* — **No readable M⁺** is always an option; the others are
  numbers a student could really arrive at: M⁺ itself, M+1, the rightmost fragment, the
  base peak. Nothing below the
  reading line is offered, because 1-butanol's M⁺ really is at 74 at about 1%, and a
  student who chose it would be right and marked wrong.
- *Chlorine or bromine?* and *Odd or even?* — skipped (filled in as "can't tell") when
  there is no M⁺, because asking them would be asking for a guess.
- *What does the IR say this is?* — alcohol, acid, carbonyl, amine, amide, nitrile, nitro,
  alkyne, alkene, benzene ring only, or only C–H. The wrong options are the classes of the
  wrong candidates first.

**Level 4** marks nothing. A hairline follows the pointer over either plot with a readout
of the m/z or wavenumber under it, so a student can see exactly where a label will land.
Mass spectrum drops snap to the nearest stick; IR drops are scored against the same
accepted windows the IR package uses. Every label has to go somewhere — the ones the
compound does not have go in the **Not in these spectra** box, because absence is evidence:
no O–H is how an ether is told from an alcohol.

### Compounds with no molecular ion

Seven compounds — 1-butanol, 2-butanol, *tert*-butanol, MTBE, acetyl chloride,
2,2-dimethylbutane and 1-hexyne — have no molecular ion above the reading line. Every mass
spectrum label is a loss from M, so these can only be the answer from **Level 3**, where
the missing M⁺ is a clue in its own right. At Level 3 their mass spectrum has nothing
marked and the case file asks whether there is a molecular ion at all; at Level 4 the M⁺
label itself belongs in the box. They can be offered as wrong options at every level.

The draw makes sure a student meets one: Levels 3 and 4 each take at least one compound
without a readable M⁺ whenever the themes drawn allow it.

### The worked example

Before Level 1, and any time from **How to read these**, a student can step through
2-butanone with the routine: eight steps, each highlighting the part of each spectrum it
reads. (It uses 2-butanone rather than 1-butanol because 1-butanol's molecular ion is below
the reading line — a poor first example of step 1.)

### Hints

Levels 3 and 4 have a Hint button. Each press gives the next useful step of the routine,
pointed at the current compound but never naming a label: "The broad band near 3350 cm⁻¹:
does it stop before about 3100, or is it enormous…?" At Level 4 it also says where a peak
worth labelling is. Hints cost nothing; the finish screen counts them.

---

## Which spectrum does the work

The wrong options are chosen to make a student use both spectra:

- an **IR twin** — the same scored IR bands, so only the mass spectrum rejects it
  (1-butanol against 2-butanol, cumene against propylbenzene)
- an **MS twin** — the molecular ion cannot reject it (the same mass, or no readable M⁺ in
  either), but the IR does in one look (acetone against propanal, propanamide against
  1-butanamine)

One of each is taken first when the bank has them, and the rest go to the closest
compounds by theme, formula and shared bands. A halide always faces at least one halide,
preferring the same halogen, as in the mass spec package. Two compounds that neither
spectrum can separate are never offered against each other; `tools/validate.js` fails the
build if the bank contains such a pair.

**The honest numbers.** The mass spectrum is powerful: comparing M⁺ with each candidate's
formula rejects most wrong options on its own. The IR becomes *necessary* only when a wrong
option has the same molecular mass. So the "How you could tell" panel separates the two
kinds of mass spectrum evidence — the molecular ion (arithmetic) and the fragments (the
stability reasoning from the mass spec unit) — and its last line says exactly what was
true for that item. Across the 28 compounds that can be a Level 2 answer, one run of the
validator gave:

| The two wrong options needed | Compounds |
| --- | --- |
| both spectra | 7 — acetone, acetophenone, propanamide, N-methylacetamide, cyclohexane, propylbenzene, cumene |
| the mass spectrum (the IR could not) | 11 |
| the IR (the molecular ion could not) | 4 — propanal, 1-butanamine, diethylamine, 1-hexene |
| either would have done | 6 |

`node tools/validate.js` prints the current figures and lists every IR twin and mass twin
set. To make "both spectra" more common, add compounds that share a molecular mass with
ones already in the bank.

---

## The compound bank

35 compounds in six themes. Across a sixteen-compound run every theme appears at least
twice: each level takes the four themes used least so far.

| Theme | Compounds |
| --- | --- |
| **Alcohols & ethers** | 1-butanol, 2-butanol, *tert*-butanol, cyclohexanol, phenol, diethyl ether, MTBE |
| **Carbonyls** | acetone, propanal, 2-butanone, benzaldehyde, acetophenone, ethyl acetate |
| **Acids & derivatives** | acetic acid, benzoic acid, methyl benzoate, acetyl chloride, propanamide, N-methylacetamide |
| **Nitrogen** | 1-butanamine, diethylamine, benzonitrile, nitrobenzene |
| **Hydrocarbons** | hexane, 2,2-dimethylbutane, cyclohexane, 1-hexene, 1-hexyne, toluene, propylbenzene, cumene |
| **Halides** | 1-bromopropane, 1-chlorobutane, chlorobenzene, bromobenzene |

Sets worth pointing at in class:

- **1-, 2- and *tert*-butanol** — identical IR; base peaks 31 / 45 / 59.
- **Acetophenone / methyl benzoate / benzoic acid** — all show m/z 105 and 77. M⁺ (120,
  136, 122) and the acid's O–H separate them. Methyl benzoate was added to the plan's list
  for exactly this trio.
- **Acetophenone / cumene** — identical scored mass spectrum (120, 105, 77); the IR's C=O
  decides.
- **Acetone / propanal** — both M = 58; the aldehyde C–H pair near 2720 and 2820, and M−1
  with a base peak at 29, decide.
- **Propanamide / N-methylacetamide / 1-butanamine / diethylamine** — all M = 73, odd, so
  one nitrogen. The IR sorts amines from amides and one N–H from two; the base peak sorts
  the two amides.
- **Cyclohexane / 1-hexene** — both M = 84; sp² C–H and C=C decide.

### Where the spectra came from

Every compound needs both an IR band table and a mass spectrum peak table, and only seven
compounds were in both source banks. So:

- **carried over** — each spectrum already in the IR or mass spec package was copied
  unchanged, and those packages have been through review;
- **new** — 33 spectra were written for this package from standard literature values,
  rounded and idealised in the same way (peak positions and base peaks are the real ones;
  intensities are rounded): 13 IR tables, 10 mass spectra, and both spectra for acetic
  acid, propanal, benzonitrile, cyclohexane and methyl benzoate.

**`ANSWER_KEY.md` marks every new spectrum "new — spot-check".** They were written without
access to a reference database, so they are worth a look against the NIST Chemistry
WebBook before the activity goes to students. The ones to check first:

- **N-methylacetamide** (mass spectrum) — which peak is tallest (drawn as M⁺ at 73, with
  m/z 30 second) and the height of the scored m/z 58;
- **1-hexyne** (mass spectrum) — the base peak is drawn at m/z 67; it is never scored,
  but it appears in the case file and in "how you could tell";
- **propanal** (mass spectrum) — the base peak is drawn at m/z 29 with M⁺ at 80%; some
  references put M⁺ taller.

Band positions and scored peaks elsewhere are the textbook ones. Nothing is copied from any
database, for the reasons given in the IR package's README.

Two choices carried over from the source packages:

- **No McLafferty rearrangement.** Compounds whose base peak is a McLafferty product
  (butanal, butanoic acid, butanenitrile) are left out; rearrangement peaks in compounds
  that are in (1-hexene's 56 and 42, ethyl acetate's 70 and 61) are drawn, never scored,
  and say so when clicked.
- **One carbonyl label**, as in the IR package: ester, ketone, aldehyde and amide C=O all
  answer to *C=O (carbonyl)*.

And one new one: **acetone's weak C–H stretch near 3005 cm⁻¹ is left out**. It is the one
sp³ C–H that sits just left of the 3000 line, and drawing it would make the line a rule
with an exception on the first ketone a student meets.

### What the structures must show

`tools/validate.js` works out from each skeletal structure which IR groups the compound
must have — every carbon's hydrogens are counted back from its bonds — and compares that
with the scored bands. A band table that forgets a C=O, or scores an O–H the structure does
not have, fails the build. A group that is present but deliberately not scored (benzoic
acid's ring C–H, buried under the acid O–H) must be listed in the compound's `hidden`
field with a reason. The game uses the same list to keep distractors honest: a student is
never told a compound "has no" something it has.

---

## Grading

**Completion only**, as in the other two packages. The SCO writes
`cmi.core.lesson_status = "completed"` once a student finishes all four levels and writes
no numeric score, so the Schoology column reads complete / incomplete. Students still see
their own first-try accuracy (and hints used) on the level-complete and finish screens.

To report a percent instead, set `cmi.core.score.raw` alongside the status in
`markComplete()` in `src/js/scorm.js` and add an `<adlcp:masteryscore>` to
`src/imsmanifest.xml`.

Progress is saved to `cmi.suspend_data` after every answer and when the activity opens, and
mirrored to `localStorage` for use outside an LMS. A save is about 350 characters, well
inside SCORM 1.2's 4096. The **Save progress** button says where the save landed, and a
returning student is met with "Welcome back — your progress was saved. You are on Level 2, compound 3 of 4". Resuming
restarts the compound the student was on, not the level.

This package keeps its own storage key, `irms-state`, so it never overwrites the IR
package's `ir-dr-state` or the mass spec package's `ms-rf-state`.

The save carries a schema version (`SCHEMA` in `src/js/game.js`). **Bump it whenever you
change the level list, the draw or the vocabulary**, so an older save is discarded rather
than resumed with a stale lineup.

---

## Building and uploading

```bash
./build.sh                       # → dist/ir-ms-two-spectra-v1.zip
./build.sh irms-unit9-practice   # → dist/irms-unit9-practice.zip
```

`imsmanifest.xml` has to sit at the root of the zip, which is why `build.sh` zips from
inside `src/`. A built `dist/ir-ms-two-spectra-v1.zip` is committed.

To upload: in Schoology, **Add Materials → Add File/Link/External Tool → Add File** (or
**Package** if your install shows it) and upload the zip. Enable the gradebook column in
the item's settings, then open it once as a student and check the badge in the top right
reads **Connected to the LMS**. If it reads *Standalone*, Schoology served the zip as a
plain file rather than launching it as SCORM.

### Testing without an LMS

Open `src/index.html` in a browser. It runs identically; nothing is reported.

### Putting one compound on the board

```
src/index.html?compound=propanal&level=2
```

`compound` is any id from `ANSWER_KEY.md`; `level` is 1–4. A compound with no readable M⁺
pinned at Level 1 or 2 opens at Level 3 instead. A pinned compound never writes to saved
progress.

---

## Editing the content

**`src/js/compounds.js`** — the bank. Each compound has an IR `bands` table (the IR
package's format) and a mass spectrum `peaks` table (the mass spec package's format); the
header comment in the file describes both. `source` records where each came from.

**`src/js/groups.js`** and **`src/js/fragments.js`** — the IR and mass spectrum label
vocabulary and the feedback wording, copied from the two source packages. Their helper
functions carry `ir` / `ms` prefixes here (`irKey`, `irLabel`, `msKey`, `msLabel` …)
because both files load into one page and the originals used the same names.
`fragments.js` adds five losses (−27 HCN, −28 CO or C₂H₄, −46 •NO₂, −59 •CO₂CH₃, and
•COOH as the second reading of −45) and five fragments for the new compounds.

**`src/js/evidence.js`** — the case-file answers, the IR class, the wrong-option picker and
the "how you could tell" verdicts. Everything there is worked out from the bank.

After any edit:

```bash
node tools/validate.js
node tools/answer-key.js > ANSWER_KEY.md
./build.sh
```

`tools/validate.js` refuses a bank where:

- a structure does not reproduce its own formula, or a displayed formula disagrees with `f`;
- an IR band is scored below 1500, on a fingerprint group, outside its own window, or with a
  window that overlaps another scored group's; or the sp²/sp³ windows do not meet at 3000;
- the scored IR bands disagree with the structure (see *What the structures must show*);
- a mass spectrum fragment does not balance against the molecular formula, or sits at the
  wrong m/z; two peaks share an m/z; there is not exactly one base peak;
- a scored peak has no `why`, or is a loss with no label in `fragments.js`, or two scored
  peaks are the same loss;
- a molecular ion is called `mplus` but could wobble under the reading line, or a peak at M
  above the line is not called `mplus`;
- a compound has fewer than three honest wrong labels for either spectrum;
- two compounds are indistinguishable to both spectra, or a compound has fewer than three
  fair wrong options;
- a theme has too few compounds for the draw to fill four levels.

It prints the IR twin and mass twin sets and the *which spectrum does the work* figures
every time.

---

## Layout

```
ir-ms-combined-scorm/
├── src/
│   ├── imsmanifest.xml      SCORM 1.2 manifest — must be at the zip root
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── groups.js        IR vocabulary            (from the IR package, helpers renamed)
│       ├── fragments.js     mass spectrum vocabulary (from the MS package, helpers renamed, 5 losses added)
│       ├── compounds.js     the bank — both spectra per compound
│       ├── spectrum.js      IR renderer              (from the IR package, unchanged)
│       ├── massspec.js      mass spectrum renderer   (from the MS package, two small additions)
│       ├── structures.js    skeletal structures      (from the MS package, unchanged)
│       ├── evidence.js      case file, IR class, wrong options, verdicts
│       ├── scorm.js         SCORM 1.2 wrapper        (from the MS package, own storage key)
│       └── game.js          levels, drag and drop, the case file, the walkthrough
├── tools/
│   ├── validate.js
│   └── answer-key.js
├── build.sh
├── ANSWER_KEY.md            generated
└── README.md
```

The two changes to `massspec.js`: its structure reader knows an explicit aldehyde `H` and a
`NO₂` group, which the IR bank's structures use, and it spells three more neutrals the
conventional way (HCN, •COOH, •CO₂CH₃). A SCORM zip has to be self-contained, so shared
files are copied rather than linked; if you fix a bug in the renderer here, check whether
the source package needs it too.

No CDN, no web fonts, no network calls.

## Accessibility

Every drop works three ways: pointer drag, click-the-label then click-the-peak, and
keyboard. At Levels 1–3 the markers are buttons, so Tab and Enter reach them. At Level 4,
where nothing is marked, each plot takes focus: ← and → step between peaks (every readable
peak and drawn band, not just the answers), and Enter drops the chosen label at the
hairline. Case-file answers, candidates and the "Not in these spectra" box are ordinary
buttons. Feedback is announced through an ARIA live region and stays on screen as the page
scrolls. The two spectra have their own accent colours, but colour is never the only
signal: every plot, label group and case-file row also carries an "MS" or "IR" tag.
`prefers-reduced-motion` turns off the shake and the case-file flash.

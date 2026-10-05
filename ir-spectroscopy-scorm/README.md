# IR Spectroscopy — The Diagnostic Region

A click-and-drag SCORM 1.2 activity for Schoology. Students label the peaks in the
diagnostic region of an IR spectrum with the functional group that produced them.

Built to sit alongside the functional-group identification activity: same drag-a-label
interaction, but the target is a spectrum instead of a structure.

---

## Where the spectra come from

**Every spectrum is generated, not scanned.** `src/js/molecules.js` holds an empirical band
table for each compound — centre, width, depth and shape for each absorption. The renderer
in `src/js/spectrum.js` sums those band profiles and converts to percent transmittance:

```
T(v) = baseline(v) × ∏ (1 − depth × profile(v))
```

Lorentzian profiles give the sharp bands; broad Gaussians give the hydrogen-bonded O–H
envelopes. A seeded jitter moves each band a few wavenumbers and adds faint detector noise,
so the same compound never draws twice identically and students have to read the chemistry
rather than recognise a picture.

Three reasons this beats scraping a spectral database:

1. **Nothing is redistributed.** SDBS and similar databases prohibit systematic downloading
   and redistribution of their spectra, which a package you hand out through an LMS would
   plainly be. Nothing here is copied from anyone.
2. **Peak positions are known exactly**, so a drop can be scored against a defined
   wavenumber window instead of hand-annotated pixel coordinates on a JPEG.
3. **It scales.** The plot is redrawn at the container's size, so it stays crisp in a
   Schoology iframe, on a Chromebook and on a phone.

Every band value is listed with its expected literature range in `ANSWER_KEY.md`.

### Adding real spectra later

`spectrum.js` plots from a sampled curve, so a JCAMP-DX (`.jdx`) loader would drop in
without touching the game logic. NIST WebBook files are public domain and can be downloaded
by hand. That path is deliberately not built yet — it is not needed for the activity to work.

---

## The three levels

| Level | Name | What the student does |
| --- | --- | --- |
| 1 | Find the band | The compound is named and drawn. The student drags each **bond family** (C=O, O–H, C≡N …) onto the peak it produced. Correlation table available, tiles carry their wavenumber ranges. Seven spectra. |
| 2 | Name the group | The compound is hidden. The student labels each marked peak with the **specific** group — alcohol vs acid O–H, nitrile vs alkyne, alkene vs aromatic C=C — then identifies the compound from three structures. No correlation table; tiles still carry their ranges. Seven spectra. |
| 3 | From memory | The same task as Level 2 with **the wavenumber ranges stripped off the tiles**. A tile reads only `C=O (carbonyl)`, so the student supplies the number rather than reading it off the label and matching. Seven spectra. |

Levels 2 and 3 draw from the same pool but avoid reusing a compound, so a student normally
meets fourteen different spectra across them. A repeat is possible in about a quarter of
runs — at most one compound — when Level 2's free pick happens to take the second of a
theme that only has two members. The theme guarantee wins over the repeat.

Twenty-one spectra is a full class period. To shorten it, change `items` in the `LEVELS`
table at the top of `src/js/game.js`; each level needs at least six to keep one compound
per core theme.

Levels unlock in order. Wrong answers are never penalised: the tile returns to the tray and
the feedback line explains the discriminator, e.g. dropping *O–H (alcohol)* on butanoic
acid's broad envelope returns

> Not at 2983 cm⁻¹. Enormously broad — it swallows the C–H peaks and runs down past 2600.
> Only a carboxylic acid does that.

That explanation is the point of the activity; the score is incidental.

### One label for every carbonyl

Ester, ketone, aldehyde, amide, acid chloride and anhydride C=O bands are separated by a
few tens of wavenumbers. This package does not ask students to split them: there is a
single **C=O (carbonyl)** label with an accepted window covering the whole 1630–1830
region. The bands still *draw* at their correct positions — an amide at 1655, an anhydride
at 1825 — so the spectra stay honest and you can point at the shifts in class.

To reinstate the split, give the carbonyls distinct group ids in `src/js/groups.js` and
point each molecule's band at the right one.

### What is and isn't collapsed

A group is asked for **by name at both levels** when the family label would hide a
distinction worth teaching:

- **the four C–H groups** — sp³, sp², sp (terminal alkyne) and aldehyde. One "C–H" tile
  would make the peaks either side of 3000 interchangeable.
- **the three N–H groups** — 1° amine, 2° amine, amide. These are *counting* distinctions
  (two N–H spikes vs one), not small wavenumber shifts.
- **any family with a single member**, computed automatically, so a lone "C=O" tile shows
  its own label and range rather than a bare family name.

Everything else collapses at Level 1 and splits at Levels 2 and 3: O–H (alcohol vs acid),
C≡N vs C≡C, and alkene vs aromatic C=C.

Level 3 changes no answers — the same groups, the same accepted windows. It only removes
the wavenumber subtitle from each tile, and the "this compound has no …" feedback stops
quoting a range so a wrong drop cannot hand the number back.

### The compound question

Levels 2 and 3 close by asking which compound produced the spectrum. Two things govern the
options offered alongside the right answer.

**They have to be decidable.** A student can only reason from the peaks they labelled, so a
decoy whose scored peaks match the answer's exactly is never offered. That matters more
since the carbonyl collapse: ethyl acetate, 2-butanone, acetyl chloride and acetic
anhydride now all produce the same scored set (`C=O` + `sp³ C–H`), so offering one against
another would be a coin toss. `tools/validate.js` prints these indistinguishable clusters.

**They have to need reasoning.** Decoys are ranked to prefer compounds that share the
answer's headline group, then those sharing diagnostic bands, then isomers. So 1-butanol is
offered against **phenol** — aromatic alcohol against aliphatic, separated by the ring C=C
and the sp² C–H — and against **diethyl ether**, its C₄H₁₀O isomer with no O–H at all.
Benzaldehyde comes up against acetophenone and butanal, where the aldehyde C–H doublet and
the ring bands are the only things deciding it. The ranking carries a small random term, so
the same compound does not always draw the same pair.

Measured across every compound at both levels: 42 questions, none decidable by elimination
of obviously unrelated structures, 37 offering a same-theme decoy and 40 offering a decoy
that shares a band region. The one exception is diethyl ether, whose only scored band *is*
sp³ C–H — it is identified by what is absent, which is a fair question of its own.

`ANSWER_KEY.md` tables the usual pairings with the band that rules each decoy out.

### Only the diagnostic region is scored

Every drop target is above 1500 cm⁻¹. Bands below that line — C–O single bonds, NO₂
symmetric stretch, aromatic out-of-plane bends — are drawn, and C–O is named in the
correlation table and the answer key, but a student is never asked to label one. Groups
marked as fingerprint are excluded from the distractor pool too, so nobody is told a
compound "has no C–O" when it plainly does.

`tools/validate.js` enforces this: a scored band below 1500 fails the build.

### Two dotted lines

The plot draws a dashed divider at **3000 cm⁻¹** and another at **1500 cm⁻¹**, captioned on
either side. The 1500 line separates the diagnostic region from the fingerprint. The 3000
line separates sp² C–H from sp³ C–H, and the item bank is built so nothing straddles it:
the sp² accepted window starts at exactly 3000 and the sp³ window ends at exactly 3000.

Because of that line, the four C–H groups — sp³, sp², ≡C–H and aldehyde C–H — are asked for
**by name at both levels**. Collapsing them into one "C–H" tile at Level 1 would make the
peaks on either side of 3000 interchangeable, which is precisely the distinction being
taught.

### Compounds in the bank

22 compounds spanning the Organic I diagnostic set: alkane, alkene, terminal alkyne,
arene, alcohol, phenol, ether, carboxylic acid (aliphatic and aromatic), ester, ketone,
aryl ketone, aldehyde, aromatic aldehyde, 1° and 2° amide, 1° and 2° amine, nitrile, nitro,
acid chloride and anhydride.

The draw is **balanced by theme, not purely random.** Each molecule carries a `theme`
(`oh`, `acid`, `co`, `nh`, `hc`, `triple`, `other`) and every level takes one compound per
core theme before filling the last place freely. A run therefore always contains an
alcohol, a carboxylic acid, a carbonyl, an N–H compound, a plain hydrocarbon and a triple
bond — which compound fills each place still varies, so a retry is a different set.

`tools/validate.js` fails if any level's pool is missing a theme, so a class of compound
can't silently drop out of rotation.

---

## Grading

**Completion only.** The SCO writes `cmi.core.lesson_status = "completed"` once a student
finishes all three levels and writes no numeric score, so the Schoology column reads
complete / incomplete rather than a percent.

Students still see their own first-try accuracy on the level-complete and finish screens —
it just isn't reported.

To report a percent instead, set `cmi.core.score.raw` alongside the status in
`markComplete()` in `src/js/scorm.js` and add an `<adlcp:masteryscore>` to
`src/imsmanifest.xml`.

Progress is saved to `cmi.suspend_data` when the activity opens and after every answer, so
a student who closes the window mid-activity resumes where they left off. It also mirrors
to `localStorage`, which is what makes resume work when the activity is opened outside an
LMS.

The save carries a schema version (`SCHEMA` in `src/js/game.js`). **Bump it whenever you
change the level list, the draw or the group vocabulary** — a save written by an older
build is then discarded rather than resumed. Without that, a student carries a stale lineup
of spectra forward and never sees your edits.

---

## Building and uploading

```bash
./build.sh                    # → dist/ir-diagnostic-region-v1.zip
./build.sh ir-unit7-practice  # → dist/ir-unit7-practice.zip
```

`imsmanifest.xml` has to sit at the root of the zip, which is why `build.sh` zips from
inside `src/` rather than from the project root. Zipping the `src` folder itself will
produce a package Schoology rejects.

To upload:

1. In your Schoology course, **Add Materials → Add File/Link/External Tool → Add File**
   and upload `dist/ir-diagnostic-region-v1.zip`, or use **Add Materials → Package** if
   your install shows it.
2. Schoology detects the SCORM manifest and creates a SCORM item.
3. Open the item's settings and enable the gradebook column if you want completion tracked.
   With completion-only reporting the column will show complete/incomplete.
4. Open it once as a student (Preview as Student) to confirm the badge in the top right
   reads **Connected to the LMS**.

If that badge reads **Standalone — no LMS detected** inside Schoology, the SCO could not
find the SCORM API. That is almost always a nesting problem, not a code problem — check
that Schoology launched the package as SCORM rather than serving the zip as a plain file.

### Testing without an LMS

Open `src/index.html` directly in a browser. The activity runs identically; the badge reads
*Standalone* and nothing is reported.

### Putting one named spectrum on the board

Append a query string to show a single compound, useful for a lesson demo:

```
src/index.html?molecule=ethylacetate&level=3
```

`molecule` is any `id` from `ANSWER_KEY.md`; `level` is 1, 2 or 3 (default 3). A pinned
spectrum never writes to saved progress, so demoing in class will not disturb a student's
resume state.

---

## Editing the content

Everything a teacher would want to change lives in two files.

**`src/js/molecules.js`** — the compound bank. To add a compound, copy an existing entry:

```js
{
  id: 'propanenitrile', name: 'Propanenitrile', formula: 'C₃H₅N', cls: 'Nitrile',
  theme: 'triple',                           // draw bucket; see the bank notes above
  tags: ['find', 'name'],                    // which levels may draw it
  structure: { pts: [...], bonds: [...], labels: {...} },
  bands: [
    { g: 'cn_nitrile', c: 2250, w: 18, d: 0.52, s: 'l', tol: [2180, 2300], t: true },
    { g: null,         c: 1460, w: 28, d: 0.38, s: 'l' }
  ]
}
```

- `g` is a group id from `src/js/groups.js`, or `null` for a band that is drawn but never
  scored.
- `c` centre, `w` full width at half maximum, `d` depth 0–1, `s` is `'l'` Lorentzian or
  `'g'` Gaussian.
- `tol` is the window a label may be dropped in; `t: true` makes the band a drop target.
  A drop target must be above 1500 cm⁻¹.

**`src/js/groups.js`** — the label vocabulary and, importantly, the `hint` string shown as
feedback. That is where to put the wording you use in class.

After any edit, validate and regenerate the key:

```bash
node tools/validate.js         # catches overlapping drop windows and bad group ids
node tools/answer-key.js > ANSWER_KEY.md
./build.sh
```

`tools/validate.js` is worth running every time. It refuses a bank where:

- two different groups have overlapping drop windows in the same molecule, or another
  group's band sits inside a target's window — either would make a question ambiguous;
- a drop target sits below 1500 cm⁻¹, or on a group marked `fingerprint`;
- an sp² C–H window does not start at exactly 3000, or an sp³ window does not end there;
- a level's pool is missing one of the core themes.

---

## Layout

```
ir-spectroscopy-scorm/
├── src/
│   ├── imsmanifest.xml      SCORM 1.2 manifest — must be at the zip root
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── groups.js        functional group vocabulary and feedback wording
│       ├── molecules.js     the compound bank — band tables and structures
│       ├── spectrum.js      band model and canvas renderer
│       ├── structures.js    skeletal structure SVG renderer
│       ├── scorm.js         SCORM 1.2 run-time wrapper
│       └── game.js          levels, drag and drop, progression
├── tools/
│   ├── validate.js          item bank checks
│   └── answer-key.js        regenerates ANSWER_KEY.md
├── build.sh
├── ANSWER_KEY.md            generated — every band with its literature range
└── README.md
```

No CDN, no web fonts, no network calls of any kind — about 76 KB of source, a 28 KB zip,
and it works offline inside a locked-down LMS iframe.

A built `dist/ir-diagnostic-region-v1.zip` is committed, so you can download and upload it
without running the build.

## Accessibility

Every drop works three ways, so it does not assume a mouse: pointer drag, click-the-label
then click-the-peak, and keyboard (tab to a label, Enter, tab to a peak, Enter). Peaks and
labels carry text alternatives naming their wavenumber, feedback is announced through an
ARIA live region, and `prefers-reduced-motion` disables the shake animation. Colour is never
the only signal — correct placements also change border style and show the label text.

# Naming Ionic Compounds — Names & Formulas

A SCORM 1.2 activity for Schoology. Students name ionic compounds and write their formulas,
with and without transition metals and with polyatomic ions. The whole activity is built around
one conditional:

> **IF** the positive ion is a transition metal → metal **(Roman numeral)** + negative ion
> **OTHERWISE** → positive ion + negative ion

Only elements 1–20, Honors Element List 2 and the class Polyatomic Ions List appear.

---

## The transition-metal rule, as taught in this class

| Needs a Roman numeral | No Roman numeral |
| --- | --- |
| Ti, Cr, Mn, Fe, Co, Ni, Cu, Au, Hg, **Sn, Pb** | Group 1 (Li, Na, K, Rb), Group 2 (Be, Mg, Ca, Ba), Al, Ga, **Ag, Zn**, NH₄⁺ |

- **Sn and Pb count as transition metals.** Each can be 2+ or 4+.
- **Ag and Zn are not transition metals.** They are Ag⁺ and Zn²⁺ only, and *silver(I)* and
  *zinc(II)* are marked wrong with an explanation.
- **Mercury is used only as Hg²⁺.** Mercury(I) is the diatomic Hg₂²⁺ ion and never appears.

| Metal | Charges used |
| --- | --- |
| Ti, Mn | 2+, 3+, 4+ |
| Cr, Fe, Co, Ni | 2+, 3+ |
| Cu | 1+, 2+ |
| Au | 1+, 3+ |
| Sn, Pb | 2+, 4+ |
| Hg | 2+ |

## The three levels

| Level | Name | What the student does |
| --- | --- | --- |
| 1 | Transition metal or not? | 10 metals, one at a time, **highlighted on the periodic table**: name it, decide *transition metal or not*, and give the charge if it has only one. Ag, Zn, Sn and Pb appear every run. Then 4 nonmetals: name, ion, and *-ide* name. |
| 2 | Mixed practice | 12 questions, **interleaved**: 6 formula → name and 6 name → formula, shuffled so there are never three of one kind in a row. They mix transition and non-transition metals, single-element and polyatomic ions, and ammonium. Every naming question starts with *Is it a transition metal?*; formula questions start with the two charges. |
| 3 | On your own | 12 more interleaved questions, **typed**, with no flowchart and no steps. The periodic table is still available. |

There is no blocked practice after Level 1: every level from 2 on mixes all the cases, so the
if/then decision has to be made fresh on every question.

Each run of Level 2 is guaranteed to include:

- a reduced formula of the TiO₂/PbO₂ type;
- an Ag or Zn compound and an Sn or Pb compound;
- a Cu⁺ or Au⁺ compound;
- ammonium;
- a formula that needs parentheses and one that doesn't;
- both binary and polyatomic compounds, and both transition and non-transition metals.

Level 3 has the same kind of coverage.

On a naming question in Level 2, the steps are:

1. *Transition metal?*
2. *How many of the polyatomic ion?* — only when the formula has parentheses.
3. On the YES branch, the **total negative charge**, then the **charge on each metal**.
4. Build the name from tiles. The Roman-numeral row includes "none", which has to be chosen on
   purpose.

On a formula question the steps are:

1. The charge on each ion.
2. A formula builder with a count and a **( ) switch** for each ion.

The flowchart beside the question switches between *formula → name* and *name → formula* to
match the question on screen. The box for the current step lights up, and the branch not taken
fades.

### Check for understanding

- A multiple-choice check comes after every 2nd question in Level 2 (every 3rd in Level 3,
  every 4th in Level 1), and each level ends with a **3-question checkpoint**. That's about 20
  checks per run.
- They come from a bank of 78 written questions plus generated ones. The generated ones cover
  the metal's charge in a formula, picking the right formula, and picking the right name.
- Every answer shows an explanation.
- A missed check brings back a **different question on the same idea** a few questions later
  (at most 4 extra per level).

### Feedback on mistakes

Wrong answers are never penalised. Every mistake gets its own explanation, whether it came from
tiles or typing:

| Mistake | Feedback |
| --- | --- |
| *calcium(II) chloride* | Group 2 metals always form 2+ ions. Leave the Roman numeral off. |
| *iron oxide* for Fe₂O₃ | Iron is a transition metal, so its name needs the metal's charge as a Roman numeral. |
| *lead(II) oxide* for PbO₂ | Swapping the subscripts back doesn't work here — this formula was reduced. The 2 O carry 4− in total, balanced by 1 Pb. |
| Fe₃O for iron(III) oxide | The Roman numeral (III) is the charge on each Fe ion, not the number of Fe atoms. |
| Ti₂O₄ | The charges balance, but an ionic formula uses the lowest whole-number ratio. |
| CaNO₃₂ | To show more than one NO₃, wrap it in parentheses: (NO₃)₂. |
| Ca(SO₄) | Parentheses only go around a polyatomic ion when there is more than one of it. |
| NaO for sodium peroxide | Peroxide is O₂²⁻ — keep the O₂ together. |
| *magnesium(IV) oxide* for MnO₂ | Magnesium is Mg. The positive ion here is Mn. |
| fe2o3 | Check your capital letters — Co is cobalt, CO would mean carbon and oxygen. |

After 3 wrong tries on a build or typed question, the answer is shown so nobody is stuck.

Typed answers accept `Fe2(SO4)3` or `Fe₂(SO₄)₃`, and either acetate form (C₂H₃O₂ or CH₃COO).
Capital letters are enforced in formulas but not in names.

### Pairings left out

- Peroxide only pairs with Group 1 and 2 metals. With a transition metal it would collide with
  an oxide: lead(II) peroxide and lead(IV) oxide are both PbO₂.
- Ammonium never pairs with nitride, phosphide, oxide or peroxide.
- A metal never pairs with a polyatomic ion built on itself (chromium dichromate).

`ANSWER_KEY.md` lists all 933 compounds in the pool, the ion tables, and the written question bank.

---

## The periodic table

The **Periodic table** button opens a table laid out like the College Board AP Chemistry table:
atomic number, symbol, atomic mass, group numbers, and La/Ac with the lanthanoid and actinoid rows
below. In Level 1 it sits beside the question with the current element highlighted.

It deliberately shows **no element names and no ion charges**. It helps students *locate* an
element without handing them what they have memorized.

The official College Board PDF is **linked, not bundled**. The table's footer opens it in a new
tab, which works wherever the school network allows collegeboard.org.

---

## Grading

**Completion only.** `cmi.core.lesson_status` becomes `completed` when a student finishes Level 3,
and no numeric score is written. Students still see their own accuracy on the level and finish
screens.

Progress saves to `cmi.suspend_data` after every answer, so a student can close the window and
resume later. A finished question is not repeated on return. The run takes under 1,000
characters, well under the SCORM 1.2 limit of 4,096.

Bump `SCHEMA` in `src/js/game.js` whenever you change the levels, the draw or the ion list, so an
old save is discarded rather than resumed.

---

## Building and uploading

```bash
./build.sh                    # → dist/ionic-naming-v2.zip
```

`imsmanifest.xml` must sit at the root of the zip, which is why `build.sh` zips from inside `src/`.

1. In Schoology: **Add Materials → Add File/Link/External Tool → Add File**, and upload
   `dist/ionic-naming-v2.zip`. Or use **Add Materials → Package** if your install shows it.
2. Enable the gradebook column in the item's settings to track completion.
3. Open it once with **Preview as Student**. The badge in the top right should read
   **Connected to the LMS**.

A built `dist/ionic-naming-v2.zip` is committed, so you can upload it without running the build.

### Teacher preview

Open `src/index.html` directly, or add `?level=N` (1–3) to jump straight to a level:

```
src/index.html?level=2
```

Preview mode unlocks every level and **saves nothing**, so showing it in class never touches a
student's progress.

---

## Editing the content

| To change | Edit |
| --- | --- |
| Which metals are transition metals, their charges, the ions, left-out pairings | `src/js/data.js` |
| Check-for-understanding questions | `src/js/cfu.js` (`BANK`) |
| Items per level, how often checks appear, checkpoint topics | `LEVELS` at the top of `src/js/plan.js` |

A run is about 58 screens: 38 questions and 20 checks. Progress saves, so it can span two days.
To shorten it, lower `count` (or `metals`/`anions` in Level 1) or raise `cfuEvery` in `LEVELS`.
Level 1 can be dropped entirely by removing it from `LEVELS` and the `draw` switch.

After any edit:

```bash
node tools/validate.js                 # refuses content that could produce a bad question
node tools/answer-key.js > ANSWER_KEY.md
./build.sh
```

`tools/validate.js` checks that:

- only memorized elements are used;
- the transition-metal set is exactly Ti Cr Mn Fe Co Ni Cu Au Hg Sn Pb, Ag is 1+ only, Zn is
  2+ only, and Hg is 2+ only;
- the polyatomic ions match the class list, with the right charges;
- every one of the 933 compounds balances, is in lowest terms, has a unique formula and a unique
  name, follows the parentheses and Roman-numeral rules, and is accepted when answered correctly;
- the classic mistakes are rejected;
- 2,000 simulated runs each contain every required case, never put three names or three
  formulas in a row, never repeat a question, and fit the SCORM save limit.

---

## Layout

```
ionic-naming-scorm/
├── src/
│   ├── imsmanifest.xml      SCORM 1.2 manifest — must be at the zip root
│   ├── index.html           page, both flowcharts, periodic-table dialog
│   ├── css/styles.css
│   └── js/
│       ├── data.js          element pool, ions, the transition-metal rule
│       ├── chem.js          compounds, formatting, answer checking and feedback
│       ├── cfu.js           check-for-understanding bank and generators
│       ├── plan.js          levels and the balanced draw
│       ├── ptable.js        AP-style periodic table
│       ├── scorm.js         SCORM 1.2 run-time wrapper
│       └── game.js          steps, builders, progression
├── tools/
│   ├── validate.js
│   └── answer-key.js
├── build.sh
├── ANSWER_KEY.md            generated
└── README.md
```

No CDN, no web fonts, no network calls. It works offline inside a locked-down LMS iframe.

## Accessibility

- Every control is a real button, checkbox or text field, so it all works by keyboard.
- Focus moves to the next step automatically.
- Feedback is announced through an ARIA live region.
- `prefers-reduced-motion` turns off the flowchart transitions.
- Color is never the only signal: completed steps carry a ✓, and wrong choices are struck through.
- Dark mode follows the device setting.

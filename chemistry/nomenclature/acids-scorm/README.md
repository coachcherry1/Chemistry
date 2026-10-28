# Acids, Ionic and Covalent — Names & Formulas

A SCORM 1.2 activity for Schoology. It follows the ionic and ionic-or-covalent activities and
adds binary acids and oxyacids. Level 1 is acids only; Levels 2 and 3 mix all four kinds of
compound.

```
Does it start with H?
  YES → ACID. Is there oxygen in the negative ion?
          NO  → hydro- + root + -ic acid                   HCl → hydrochloric acid
          YES, an -ate ion → root + -ic acid               H₂SO₄ → sulfuric acid
          YES, an -ite ion → root + -ous acid              H₂SO₃ → sulfurous acid
          Formula: number of H = the ion's charge; never parentheses
  NO  → metal (or NH₄⁺) first → IONIC (Roman numeral only for a transition metal)
        two nonmetals          → COVALENT (prefixes; mono- dropped on the first element; never reduce)
```

**Nothing is typed.** Every answer is built from tiles.

Same constraints as before:

- only elements 1–20, Honors Element List 2 and the class Polyatomic Ions List;
- Sn and Pb count as transition metals, Ag and Zn do not;
- mercury is used as Hg²⁺ only;
- acid formulas are written without (aq);
- completion-only grading.

---

## The acids

There are 22 acids, one for each ion on the class lists that forms one:

| Kind | Acids |
| --- | --- |
| Binary (no oxygen) | HF, HCl, HBr, HI, H₂S, **HCN** (hydrocyanic — cyanide has no oxygen, so it follows the binary rule) |
| From -ate ions | chloric, perchloric, nitric, bromic, carbonic, chromic, dichromic, sulfuric, phosphoric, permanganic, acetic |
| From -ite ions | hypochlorous, chlorous, nitrous, sulfurous, phosphorous |

- **Acetic acid** is accepted as HC₂H₃O₂ or CH₃COOH. Naming questions show either form.
- **Left out:**
  - hydroxide and peroxide, which give water and hydrogen peroxide, not acids;
  - nitride and phosphide;
  - ammonium, a positive ion.

## The three levels

| Level | Name | What the student does |
| --- | --- | --- |
| 1 | Acids | 14 acids: 7 to name and 7 formulas to write. 4 binary, 5 from -ate ions, 5 from -ite ions, mixed so no kind comes up three times running. **Naming:** *Which acid rule applies?*, then the acid builder. **Formulas:** *Which negative ion is in it?*, then *How many H?*, then the formula builder. |
| 2 | All compounds | 16 questions: 4 acids, 4 ionic, 4 transition-metal ionic, 4 covalent. Half naming, half formula-writing, interleaved. Every question opens with a four-way decision: **Acid / Ionic / Ionic + Roman numeral / Covalent**. Then come that branch's steps. |
| 3 | On your own | 16 more of the same mix, with no steps and no flowchart. To name a compound the student first chooses **Acid name** or **Ionic or covalent name**, so the decision is still part of every answer. |

### The builders

- **Acid name builder:** `[hydro- / none] [root] [-ic acid / -ous acid]`.
  - The root tiles include the per-/hypo- relatives (hypochlor-, chlor-, perchlor-).
  - They also include the *sulf-* / *phosph-* slips.
- **Ionic or covalent name builder:** the same five rows as before — prefix, first part, Roman
  numeral, prefix, second part.
- **Formula builder:** two parts, a count of 1–10 for each, and a ( ) switch for each.
  - In Levels 2–3 an **H** tile appears as a wrong option for ionic and covalent compounds
    whose negative ion forms an acid, which tempts HNO₃ for sodium nitrate.

### Look-alikes side by side

- **Level 1:** three acid pairs per run, for example:
  - HNO₃ / HNO₂
  - H₂SO₄ / H₂SO₃
  - HClO₃ / HClO₂
  - HClO₄ / HClO
  - HCl / HClO₃
  - H₂S / H₂SO₄
  - H₂CrO₄ / H₂Cr₂O₇
- **Levels 2–3:** one acid-vs-other pair and one ionic-vs-covalent pair per run, for example:
  - HNO₃ / NaNO₃
  - H₂SO₃ / SO₃
  - HNO₂ / NO₂
  - HCl / NaCl
  - HMnO₄ / KMnO₄
  - SnCl₄ / CCl₄

  The full list is in `src/js/plan.js` and `ANSWER_KEY.md`.

### Feedback on acid mistakes

| Mistake | Feedback |
| --- | --- |
| *hydrosulfuric acid* for H₂SO₄ | No hydro- here: SO₄²⁻ contains oxygen. Hydro- is only for acids whose negative ion has no oxygen. |
| *chloric acid* for HCl | There is no oxygen in Cl⁻, so this is a binary acid: it needs hydro- in front. |
| *sulfurous acid* for H₂SO₄ | Sulfate ends in -ate, and -ate becomes -ic. |
| *sulfic acid* | Acids of sulfur and phosphorus keep the whole root: sulfur-, phosphor-. |
| *chloric acid* for HClO₄ | The acid keeps the per- or hypo- of its ion. Look at the ion’s name: perchlorate. |
| *hydrogen chloride* for HCl | This is an acid, so its name ends in "acid". |
| HSO₄ | Each H is 1+ and SO₄²⁻ is 2−, so the number of H must match the anion’s charge. |
| H₂(SO₄) | Acids never use parentheses. |
| HNO₂ for nitric acid | HNO₂ is nitrous acid. Nitric acid comes from NO₃⁻, nitrate. |
| HNO₃ for sodium nitrate | HNO₃ is nitric acid. Sodium nitrate is not an acid, so it does not start with H. |
| Acid builder chosen for NaNO₃ (Level 3) | This is not an acid — it does not start with H. Ionic: Na is a metal… |

All the ionic and covalent feedback from the earlier activities is still here.

### Check for understanding

- A check question comes after every 3rd question in Levels 1 and 3 and every 2nd in Level 2,
  plus a 3-question checkpoint at the end of each level. That's about 25 per run.
- The bank has 139 written questions:
  - 25 new ones: 12 on acid names, 7 on acid formulas, and 6 on telling acids from other
    compounds;
  - the ionic and covalent banks.
- Generated questions cover:
  - "Which acid rule does … follow?";
  - acid name ↔ formula;
  - "Which naming rules apply?" for all four types;
  - everything from the earlier activities.

---

## Grading, saving, uploading

**Completion only.** The status becomes `completed` when Level 3 is finished. Progress saves
after every answer; the saved data stays under 1,200 of the 4,096 characters SCORM 1.2 allows.

```bash
./build.sh                    # → dist/acids-v1.zip
```

Upload `dist/acids-v1.zip` in Schoology with **Add Materials → Add File** (or **Package**). Then
open it once with **Preview as Student**. If it sits on "Importing SCORM Package…", refresh
after a minute.

A built zip is committed. Add `?level=N` (1–3) to `src/index.html` for a teacher preview that
saves nothing.

## Editing

| To change | Edit |
| --- | --- |
| Which acids appear, and their roots | `src/js/data.js` (`ACIDS`, `ROOT_TRAPS`) |
| Covalent compounds, ions, transition metals | `src/js/data.js` |
| Check questions | `src/js/cfu.js` |
| Items per level, targets, look-alike pairs, required cases | `src/js/plan.js` |

After any edit:

```bash
node tools/validate.js
node tools/answer-key.js > ANSWER_KEY.md
./build.sh
```

`tools/validate.js` checks that:

- every acid has exactly the expected name, H = charge, and no parentheses;
- both acetic acid formulas are accepted;
- every compound of all three kinds is accepted when built correctly;
- every acid and cross-over mistake is rejected;
- the wrong builder is rejected for both acids and non-acids;
- 2,000 simulated runs each:
  - hit the per-level targets and required cases;
  - place the look-alike pairs side by side;
  - never repeat a category three times in a row, or three names or three formulas;
  - fit the save limit.

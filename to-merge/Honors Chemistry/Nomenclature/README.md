# Nomenclature — Simulation Index

**Course:** Honors Chemistry
**Schoology unit:** Nomenclature
**Last updated:** 2026-10-01

Each simulation folder holds `<name>/index.html` (or `<name>.html`) + `imsmanifest.xml`,
with a ready-to-upload `<name>-scorm.zip` beside it. All are SCORM 1.2, completion-graded,
no student-name gate.

## Simulations

### `compound-naming-simple` — Compound Naming (Simple)
Name a compound from its formula (and vice versa) for binary ionic compounds with
fixed-charge metals and simple binary covalent compounds (prefix naming).
**Completion:** 20 correct.

### `compound-naming-advanced` — Compound Naming (Advanced)
Same task, extended to polyatomic ions, variable-charge (Roman-numeral) metals, and acids.
**Completion:** 20 correct.

*(Both were split out of the original combined `chemical-bonding-prediction` sim, which had
a student-selectable difficulty/mode.)*

### `chemical-nomenclature-tutorial` — Chemical Nomenclature Tutorial
Larger decision-tree-style tutorial covering all 3 bond types (ionic — main group and
transition metal, covalent, and both binary/oxyacid acids), both directions (Formula → Name
and Name → Formula). Home screen has two parts:
- **Practice Modes (ungraded):** pick a direction + bond type (Ionic / Covalent / Acids / All 3)
  and practice indefinitely; wrong answers reveal the correct answer and why.
- **The Assignment (completion grade):** a fixed 20-problem run — 10 Formula → Name then
  10 Name → Formula, each with the same required mix (2 main-group binary ionic, 2 main-group
  ionic w/ polyatomic ion, 1 transition metal + single nonmetal (excludes Zn/Ag/Cd), 1 transition
  metal + polyatomic ion, 2 covalent, 1 binary acid, 1 oxyacid). Wrong answers in the assignment
  don't reveal anything — just "try again" on the same problem. Fires SCORM completion
  (`cmi.core.lesson_status = completed`) once all 20 are done; no mastery score. A **Save
  Progress** button (shown only during the assignment) writes the current problem position to
  `cmi.suspend_data` (falls back to localStorage outside an LMS); the home screen then offers
  "Resume Assignment (Problem X of 20)" instead of the plain Start button until it's cleared
  (by finishing, or by choosing "Start Over Instead").

Ported in from `Old Simulations/nomenclature-tutorial.html` (an older, much larger build) with
several bugs fixed along the way — most notably a compound-selection bug that could leave the
screen with no answer boxes after picking a compound type.

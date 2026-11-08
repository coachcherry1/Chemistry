# Virtual Lab: Formula of a Hydrate

A virtual lab for regular chemistry, done as a **pre-lab on paper** before the real lab (heating blue copper(II) sulfate hydrate to constant
mass). It is the companion of `empirical-formula-mgo-scorm/` (same bench, same graphics, same paper-sheet approach). Students practice the
setup and the calculations in the simulation and **write every reading and calculation on a paper lab sheet**. The simulation has no data
tables, no typed answers and **reports no score** (opened from the LMS it only marks itself completed).

**Status:** zip v1 (SCHEMA 1). Web version:
`https://coachcherry1.github.io/Chemistry/chemistry/moles/hydrate-lab-scorm/src/index.html` (live once merged to `main`).

## The lab sheet (`lab-sheet/`)

- `Formula of a Hydrate - Virtual Lab Pre-Lab Sheet - STUDENT.docx` (and a `.pdf` to print): two pages, front and back. The data table
  (Box 1, Box 2, a row for each heating), the procedure paired with what to do in the simulation, the calculations (mass of water, mass of
  anhydrous solid, moles, the water : CuSO₄ ratio, the formula and name), **Look closer** (why heat to constant mass, why the lid is cracked
  open, why the data are never exactly a whole number) and a **What if...?** table.
- `... TEACHER EDITION.docx`: how the simulation and the sheet fit together, how to check each student's random numbers, a worked example
  and every answer.
- `build_sheet.py` builds both from one script (python-docx). Every number in the teacher edition is computed there.

## What the simulation does

The solid is **copper(II) sulfate pentahydrate**, CuSO₄·5H₂O (blue crystals, white once the water is gone). The bottle is labelled
CuSO₄·xH₂O, so the student finds x. Every student gets **different random masses**, so the teacher checks the math, not the numbers.

- The bench is the magnesium oxide lab's (ring stand and clay triangle set up, burner whose **flame height is set by turning the bottom of the
  barrel**, crucible with the lid cracked open, ceramic pad), with an **open balance** (no doors) and a **weigh boat**.
- The student masses the crucible and lid, drags the weigh boat onto the balance, drags the bottle of hydrate (mouth down) above the boat and
  **clicks the bottle** to shake out solid: real-looking blue crystals fall and heap up in the boat (about 2 g, at least 1.5 g). The boat is
  poured into the crucible (a little stays behind, as in life) and the crucible is massed again.
- Then heat, cool (the 5 minutes can be skipped) and mass, **repeated until two masses in a row agree within 0.01 g** (at least 3 heatings, at
  most 5; usually 3, sometimes 4). The simulation says when the mass is constant (it never tells the student that water is left). A **running data table** under the instructions lists every reading as it is taken. Water leaves the crucible as gas wisps; the crucible reddens
  as it heats; the magnifier (first heating only, so students do not read it as "all the water is gone") shows fifteen small CuSO₄ units with 83 small water molecules scattered among them (so the ratio cannot be counted off the picture), and the molecules leave one by one as the crystal turns white.
- **Real data:** the water : CuSO₄ mole ratio from a student's readings is 0.10 to 0.15 away from 5, above or below (4.85 to 4.90 or 5.10 to
  5.15), so it rounds to 5 but is never perfect. Heating removes most of the water the first time and little after that.

## Files

`data.js` (the numbers: `Lab.make`, `Lab.run`), `scene.js` (the bench), `lens.js` (the magnifier), `app.js` (steps and the heat model),
`picker.js`, `scorm.js`, `util.js`. Tools: `node tools/validate.js`, `node tools/answer-key.js > ANSWER_KEY.md`, `./build.sh hydrate-lab-v1`,
`node tools/walkthrough.js`, `node tools/layout.js`. `?seed=<n>` gives a particular student's masses; `?step=<n>&k=<heating>` jumps to a step.

## Rules this package follows

Offline only, no CDN or WebGL; keyboard, touch and drag for every action; dark mode; reduced motion (the teaching motions still play, a
little quicker); no em dashes; its own SCORM identifiers (`HYDRATE_LAB_*`); a web version on GitHub Pages.

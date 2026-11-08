# Virtual Lab: Empirical Formula of Magnesium Oxide

A virtual lab for regular chemistry, done as a **pre-lab on paper** before the real lab (burning magnesium in a crucible). Students
practice the setup and the calculations in the simulation and **write every reading and calculation on a paper lab sheet**. The
simulation has no data tables, no typed answers and **reports no score** (opened from the LMS it only marks itself completed).

**Status:** zip v1 (SCHEMA 1). The lab sheet is in `lab-sheet/`; the simulation is in `src/`. Web version:
`https://coachcherry1.github.io/Chemistry/chemistry/moles/empirical-formula-mgo-scorm/src/index.html` (live once merged to `main`).

## The lab sheet (`lab-sheet/`)

- `Empirical Formula of MgO - Virtual Lab Pre-Lab Sheet - STUDENT.docx` (and a `.pdf` to print): two pages, front and back. The teacher's data table
  (Boxes 1 to 5), the procedure paired with what to do in the simulation, While Cooling, After Cooling, **Look closer: magnesium and
  nitrogen** (why we add water: magnesium nitride, Mg₃N₂, is converted to magnesium hydroxide and ammonia, and reheating turns the
  hydroxide into MgO), and a **What if...?** table (lid too wide, lid too tight, water step skipped).
- `... TEACHER EDITION.docx`: how the simulation and the sheet fit together, how to check each student's random numbers, a worked example,
  and every answer.
- `build_sheet.py` builds both from one script (python-docx). Every number in the teacher edition is computed there.

## What the simulation does

Every student gets **different random masses**, so the teacher checks the math, not the numbers: crucible + lid **25.000 to 35.000 g**,
magnesium **0.100 to 0.200 g** (a stand-in for what fits in a real crucible), read to 0.0001 g. The product mass is the ideal MgO mass with
a small scatter (within about 1%).

- A 2D bench drawn in code: the ring stand and clay triangle already set up, crucible with the lid cracked open (placed automatically), Bunsen burner
  whose **flame height is set by turning the bottom of the barrel** (the end of the scale is the perfect height: the tip just touches the crucible), an analytical balance with its door open, a DI water dropper and a wire
  gauze pad. No goggles, scissors or tongs.
- Students drag the equipment into place, read the balance, set the flame, watch the magnesium glow inside the crucible, take the lid off onto the ceramic pad, bring the DI bottle above the open crucible and add 6 to 7 drops of
  water (steam and ammonia gas rising; a simulation can show the gas but not its smell), reheat, and fast-forward the 5-minute cool.
- "What if" buttons show the lid too wide, the lid too tight, and the water step skipped.
- A slim bar across the top gives the step and says which box on the sheet to fill in.

## Rules this package follows

Offline only, no CDN or WebGL; keyboard, touch and drag for every action; dark mode; reduced motion; no em dashes; its own SCORM
identifiers; a web version on GitHub Pages: `https://coachcherry1.github.io/Chemistry/chemistry/moles/empirical-formula-mgo-scorm/src/index.html`
(once merged to `main`).

## How it works (for the code reader)

- `data.js` (`Lab`): the masses from a seed, and the product mass worked out from what happened in the crucible (MgO, a sixth of the
  magnesium as Mg₃N₂ before the water, each drop converting one of the six nitride magnesium atoms). The balance, the magnifier and the
  validator all use it, so they agree.
- `scene.js`: the bench, one SVG; `lens.js`: the magnifier above the balance (36 magnesium atoms; O₂ and N₂ fly in and join them while it burns, water frees NH₃ from the nitride, heating turns Mg(OH)₂ back into MgO); `app.js`: the steps and the heat model
  (the flame must touch the crucible for the magnesium to ignite; a short flame does not).
- `?seed=<n>` gives a particular student's masses; `?step=<n>` jumps to a step (for teachers and the tools).
- Tools: `node tools/validate.js`, `node tools/answer-key.js > ANSWER_KEY.md`, `./build.sh mgo-lab-v1`, `node tools/walkthrough.js`, `node tools/layout.js`.

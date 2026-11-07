# Virtual Lab: Empirical Formula of Magnesium Oxide

A virtual lab for regular chemistry, done as a **pre-lab on paper** before the real lab (burning magnesium in a crucible). Students
practice the setup and the calculations in the simulation and **write every reading and calculation on a paper lab sheet**. The
simulation has no data tables, no typed answers and **reports no score** (opened from the LMS it only marks itself completed).

**Status:** the lab sheet is drafted (`lab-sheet/`). The simulation (`src/`) is not built yet; its bench drawing was sketched with the
teacher and is described below.

## The lab sheet (`lab-sheet/`)

- `Empirical Formula of MgO - Virtual Lab Pre-Lab Sheet - STUDENT.docx` (and a `.pdf` to print): three pages. The teacher's data table
  (Boxes 1 to 5), the procedure paired with what to do in the simulation, While Cooling, After Cooling, **Look closer: magnesium and
  nitrogen** (why we add water: magnesium nitride, Mg₃N₂, is converted to magnesium hydroxide and ammonia, and reheating turns the
  hydroxide into MgO), and a **What if...?** table (lid too wide, lid too tight, water step skipped).
- `... TEACHER EDITION.docx`: how the simulation and the sheet fit together, how to check each student's random numbers, a worked example,
  and every answer.
- `build_sheet.py` builds both from one script (python-docx). Every number in the teacher edition is computed there.

## What the simulation will do

Every student gets **different random masses**, so the teacher checks the math, not the numbers: crucible + lid **25.000 to 35.000 g**,
magnesium **0.100 to 0.200 g** (a stand-in for what fits in a real crucible), read to 0.0001 g. The product mass is the ideal MgO mass with
a small scatter (within about 1%).

- A 2D bench drawn in code: ring stand with ring, clay triangle, crucible with the lid cracked open (placed automatically), Bunsen burner
  whose **flame height is set by turning the bottom of the barrel**, an analytical balance with its door open, a DI water dropper and a wire
  gauze pad. No goggles, scissors or tongs.
- Students drag the equipment into place, read the balance, set the flame, watch the magnesium glow inside the crucible, add 6 to 7 drops of
  water (steam, the magnifier shows Mg₃N₂ + H₂O → Mg(OH)₂ + NH₃), reheat, and fast-forward the 5-minute cool.
- "What if" buttons show the lid too wide, the lid too tight, and the water step skipped.
- A slim bar across the top gives the step and says which box on the sheet to fill in.

## Rules this package follows

Offline only, no CDN or WebGL; keyboard, touch and drag for every action; dark mode; reduced motion; no em dashes; its own SCORM
identifiers; a web version on GitHub Pages: `https://coachcherry1.github.io/Chemistry/chemistry/moles/empirical-formula-mgo-scorm/src/index.html`
(once the simulation is built and merged).

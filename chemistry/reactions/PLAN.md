# Reactions unit: plan for four SCORM packages (honors chemistry)

Status: **plan only, waiting for the teacher's review. Nothing is built.**
Decisions marked **(default)** are my recommendation; the teacher can change any of them in review.

## The set

| # | Folder (in `chemistry/reactions/`) | Activity | Time |
| --- | --- | --- | --- |
| 1 | `balancing-particles-scorm/` | Intro to balancing with particle diagrams; conservation of mass | about 25 min |
| 2 | `balancing-reaction-types-scorm/` | The same, plus classifying into the six types | about 35 min |
| 3 | `predicting-products-scorm/` | Predicting products: single replacement (activity series), double replacement (a solid forms) | about 40 min |
| 4 | `net-ionic-equations-scorm/` | Net ionic equations with a beaker of moving, to-scale ions; solid or water, or no reaction | about 35 min |

All four follow the house shell: ungraded builds and predictions with specific feedback, graded work where the first
Check or Submit answer counts, score 0 to 100, retakes keep the best, saves in `cmi.suspend_data`, runs as a web page
from GitHub Pages, offline, keyboard and touch, dark mode, reduced motion, fits a Chromebook at 1366x520, no em dashes.

The teacher's existing simulations in `to-merge/Honors Chemistry/Reactions/` (equation balancing practice, reaction type
identification with a 100-reaction bank, the potion lab) stay as they are. They drill with symbols only; these four add
the particle level. The six type names and the bank's conventions are taken from them.

## Shared code

- **`chem.js` (one model for all four):** reads formulas, counts atoms, balances any equation by solving it (so no
  coefficient is typed twice), builds ionic formulas from charges, holds the activity series and the solubility table,
  predicts products, splits strong electrolytes into ions and derives the net ionic equation. Every answer on screen
  and in the answer key comes from it.
- **`particles.js`:** space-filling particles drawn to scale from real radii, coloured by element **and** lettered
  (so colour is never the only cue), in the look of the combustion `burn` scene and the buffer beaker.
- Packages 1 and 2 are one code base with a `config.js` switch (`classify`), as with the two mole-conversion
  packages: each validator fails if the shared files differ. Packages 3 and 4 share `chem.js`, `particles.js`
  and the usual shell files.
- Each package gets its own SCORM ids (`BALPART_*`, `BALTYPES_*`, `PREDPROD_*`, `NETIONIC_*`), save key, `SCHEMA`,
  validator, answer key, walkthrough, layout test, README with its Pages address, and committed zip.

## 1. Balancing with particle diagrams

**Key objective:** atoms are neither made nor destroyed, so every atom in the reactants box is in the products box.
A coefficient changes how many particles there are; a subscript is part of what the substance is and never changes.

**The workbench (used all the way through):** the equation on top with a stepper (and a typed box) for each
coefficient; under it a **Reactants box** and a **Products box** of particles that redraw as the coefficients change;
under those an **atom tally** per element (left count, right count, a tick when they match) and a **mass line**
(total mass of each box from the class's tenths masses), so the law of conservation of mass is seen in both atoms and
grams. All of it is on screen together at 1366x520.

**Steps (about 12):**

- Part 1, reading the picture: what a subscript and a coefficient mean (count the atoms in 3 H₂O); an ungraded sort
  "changes how many" vs "changes what it is" (H₂O to H₂O₂ is a different substance, shown as a different particle).
- Part 2, is it conserved? Given diagrams: count each element on both sides, say balanced or not; an unbalanced
  diagram shows the leftover or missing atoms highlighted, and the mass line disagrees.
- Part 3, balancing: H₂ + O₂ → H₂O guided (predict first, then fix with coefficients only), two more with hints,
  then a strategy step (start with the element in the fewest places, leave lone elements for last, keep a polyatomic
  ion together when it is on both sides).
- Part 4, from picture to equation: a diagram of 4 H₂ + 2 O₂ → 4 H₂O is written 2, 1, 2 (lowest whole numbers).
- Graded set and results.

**Graded:** 10 equations balanced on the workbench (3 easy, 4 medium, 3 hard, drawn per student from a pool of about
45; first Check counts; Check with a coefficient left empty is not an answer; a multiple of the right answer is told
"reduce to lowest whole numbers" and does count as wrong on first Check **(default)**) plus 6 choice questions with
Submit answer (count atoms, pick the balanced diagram, pick the diagram that matches an equation, what may be changed).

**Scope:** formulas are always given; molecular substances and simple ionic compounds (drawn as formula units, no
solution yet); coefficients up to 6 and at most about 16 particles a side so the boxes stay readable; no states, no
classification, no moles.

## 2. Balancing and reaction types

A copy of package 1 by config. Parts 1 to 4 are shortened to one recap step each **(default: the students have done
package 1 first)**, then:

- Part 5, the six types: synthesis, decomposition, single replacement, double replacement, combustion,
  neutralization. Each is shown as a particle animation of its pattern (two things join, one splits, a lone element
  takes a place, partners trade, a fuel and O₂ become CO₂ and H₂O, an acid and a base become a salt and water) beside
  the general form (A + B → AB ...). An ungraded card sort, then "what gives it away" clues.
- **Tie-break rules, on screen (default, matching the teacher's bank):** acid + base → salt + water is called
  **neutralization**, although the partners trade as in a double replacement; a compound of C and H (or C, H, O)
  burning in O₂ to CO₂ + H₂O is **combustion**; an element joining O₂ (2 Mg + O₂ → 2 MgO) is **synthesis**.
- **Graded:** 10 reactions, each balanced on the workbench and then classified (two graded interactions per
  reaction, 20 in all), at least one of every type, plus 4 choice questions on the patterns. Pool of about 60
  reactions tagged by type, cross-checked against the 100-reaction bank.

## 3. Predicting products

**Key objective:** from the reactants alone, decide whether a reaction happens, write correct product formulas from
ion charges, give states, and balance.

**Reference beside every step and checkpoint:** the activity series and the solubility table.

- Part 1, single replacement: a lone element and a compound; the lone element can only replace the one like it
  (metal for metal, halogen for halogen). The activity series: an element replaces anything **below** it. Particle
  view: zinc atoms in a strip, Cu²⁺ ions arriving, copper atoms plating on while Zn²⁺ leaves into solution; with
  Cu in ZnSO₄ nothing happens. Ungraded "will it react?" sort.
- Part 2, writing the products: the new compound's formula comes from the charges (crossing charges, as in the
  ionic naming activity), never from copying the old subscripts; the freed element is written as an element
  (H₂, Cl₂ ... diatomic). Then balance on the package 1 workbench.
- Part 3, double replacement: the positive ions trade partners; write both formulas from charges; look each product
  up in the solubility table; (s) for the solid, (aq) for the rest. If neither product is a solid: **no reaction**.
  Particle view: two beakers poured together, the solid settling.
- Graded set and results.

**Graded:** 10 problems (5 single, 5 double, 3 of the 10 are "no reaction"). Each problem is a ladder, the first
Check of each rung counting: (1) reaction or no reaction, (2) the products, built with ion tiles and subscript
steppers, (3) states, (4) coefficients. Score = rungs right first time / all rungs. A "no reaction" problem has one
rung. Plus 4 choice questions (reading the series and the table).

**Scope (defaults, please confirm):**

- Single replacement: metal + salt solution, metal + acid (H₂ forms), halogen + halide salt. No metal + water.
- A metal with more than one charge gets the charge named in the prompt ("iron forms iron(II) here").
- Double replacement: only precipitates. No gas formers, no water formers here (water comes in package 4).
- Only pairs whose solubility is clear-cut: the validator holds real solubilities and refuses borderline cases
  (CaSO₄, Ag₂SO₄, Ca(OH)₂, PbCl₂).

## 4. Net ionic equations

**Key objective:** a dissolved strong electrolyte is separate ions; the ions that are the same before and after are
spectators; the net ionic equation is what is left: a solid forming, or H⁺ + OH⁻ → H₂O, or nothing at all.

**The beaker (`beaker.js`):** two solutions are poured together. Ions drift and bounce the whole time. The ones that
react find each other, pair up, sink and stack into a solid on the bottom; the spectators keep moving. For an acid and
a base, H⁺ and OH⁻ meet and become a water molecule. For a "no reaction" mix, everything just keeps moving.

- **To scale:** every ion is drawn from its real ionic radius (Shannon radii, in `data.js` with the source);
  polyatomic ions are drawn as their atoms at real size (NO₃⁻, SO₄²⁻, CO₃²⁻, PO₄³⁻, OH⁻, NH₄⁺). The validator
  checks every drawn size against the table. A scale bar is shown.
- **Counts are real:** Na₂SO₄ gives two Na⁺ for each SO₄²⁻; the validator checks the charge balance of the beaker
  before and after every reaction, and that the solid has the formula's ratio.
- Water molecules of the solvent are not drawn (as in the other beakers); the water a neutralization makes is.
- Tap any ion to name it; a "Highlight spectators" switch after the prediction; Pour again; a slider for speed.
  Reduced motion shows before and after stills.

**Steps (about 14):**

- Part 1, what "aq" looks like: a strong electrolyte dissolves into ions; write the split (Na₂SO₄ → 2 Na⁺ + SO₄²⁻;
  the count and the charge are the usual slips). A solid stays together.
- Part 2, a solid forms: watch AgNO₃ + NaCl; predict which ions stay behind; then three lines of the same reaction:
  the balanced equation, the complete ionic equation (split every (aq), keep (s)), strike out the spectators (tap to
  cancel, struck through as in the mole conversions), the net ionic equation in lowest whole numbers with states.
- Part 3, water forms: strong acid + strong base; always H⁺(aq) + OH⁻(aq) → H₂O(l).
- Part 4, no reaction: every ion is a spectator, everything cancels, so the answer is "no reaction".
- Graded set and results.

**Graded:** 8 problems (4 solid, 2 water, 2 no reaction, mixed order). Rungs, first Check of each counting:
(1) the products and their states or "no reaction" (the first 3 problems give the balanced equation, the later 5
give only the reactants **(default)**), (2) the complete ionic equation, (3) the spectators, (4) the net ionic
equation built from ion tiles, coefficient steppers and state pickers. Plus 4 choice questions (which picture shows
this mix, which ions are spectators in this beaker).

**Scope (the teacher's):** reactants are strong electrolytes only: soluble salts, strong acids (HCl, HBr, HI, HNO₃,
H₂SO₄ written as 2 H⁺ + SO₄²⁻, HClO₄) and strong bases (group 1 hydroxides, Ba(OH)₂, Sr(OH)₂). Products are solids
or water only. No weak acids or bases, no gases, no solid reactants. The validator fails on any weak acid.
H⁺ is written H⁺, not H₃O⁺ **(default)**.

## Questions for the teacher

1. **Activity series and solubility rules:** which ones does the class use? If there is a handout, the packages
   will match it exactly. Default series: Li, K, Ba, Ca, Na, Mg, Al, Zn, Fe, Ni, Sn, Pb, (H), Cu, Ag, Au, and
   F₂, Cl₂, Br₂, I₂. Default rules: group 1, NH₄⁺, NO₃⁻ and C₂H₃O₂⁻ always soluble; Cl⁻, Br⁻, I⁻ soluble except
   with Ag⁺, Pb²⁺, Hg₂²⁺; SO₄²⁻ soluble except with Ba²⁺, Sr²⁺, Pb²⁺; CO₃²⁻, PO₄³⁻, OH⁻, S²⁻ insoluble except
   with group 1 and NH₄⁺ (Ba(OH)₂ and Sr(OH)₂ soluble).
2. **Classification tie-breaks** in package 2: are the three rules above the class's?
3. **Package 2:** a short recap of balancing and then the types (default), or all of package 1 again in full?
4. **Single replacement scope:** halogens and metal + acid in, metal + water out?
5. **Net ionic problems:** balanced equation given for the first few only (default), for all, or for none?
6. **Ba(OH)₂ + H₂SO₄** (a solid and water at once): one challenge problem, or leave it out (default: out)?
7. **Mass line** in package 1: totals in amu from the class's tenths masses (default), or atoms only?

## Build order

Package 1 first, with screenshots for the teacher before the others, because its workbench and particles are reused
by 2 and 3. Then 2, then 4's beaker (reused in 3's particle views), then 3. After each: validator, answer key, zip,
walkthrough, layout test; at the end a section per package in `CLAUDE.md`, the rows in its tables, and a rebuilt root
`index.html`.

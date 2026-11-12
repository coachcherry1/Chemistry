# Chemistry SCORM activities

SCORM 1.2 packages posted to Schoology for three high-school courses: **chemistry** (honors), **AP chemistry**
and an **organic chemistry elective** (textbook: Klein, *Organic Chemistry*). Each package is a self-contained
folder; fixes to shared code (saving, scoring, picker, 3D viewer, Lewis builder) usually belong in every folder
that has a copy. Everything is on `main`; older work branches were merged in October 2026.

**Folder layout:** `class/topic/package/`, for example `chemistry/bonding/lewis-structures-scorm/`. The classes are
`chemistry/`, `ap-chemistry/` and `organic-chemistry/`. Packages elsewhere in this file are named by their folder
alone; find one with `find . -name <folder> -type d`. All commands run inside the package folder, wherever it sits.
A new package goes in the topic folder that fits it (make the folder if none does), one level below the class.
`reference/ap-chemistry-frq/` holds the released AP free-response questions and scoring guidelines (2015 to 2026 except 2020, © College Board)
for checking each AP activity against how the exam asks; it is not an activity and has its own README.

**Chemistry (honors)**

| Folder | Activity |
| --- | --- |
| `chemistry/electrons/ionization-energy-scorm/` | Successive ionization energies, the two-step rule (about 10 min) |
| `chemistry/nomenclature/ionic-naming-scorm/` | Naming ionic compounds and writing formulas |
| `chemistry/nomenclature/ionic-covalent-scorm/` | Ionic or covalent? Choosing the naming rules |
| `chemistry/nomenclature/acids-scorm/` | Binary acids and oxyacids, mixed with ionic and covalent |
| `chemistry/bonding/lewis-structures-scorm/` | Lewis structures by the teacher's 5 rules (builder, B/Be exceptions, expanded octets, AI-answer warnings in `snark.js`) |
| `chemistry/bonding/lewis-drawing-tool/` | Teacher's drawing tool, same 5-rule engine, reports no score |
| `chemistry/bonding/vsepr-polarity-scorm/` | VSEPR: build by the 5 rules beside a 3D window, molecular geometry for 2 to 6 domains, polarity by radial symmetry |
| `chemistry/imfs/intermolecular-forces-scorm/` | IMFs: heating stage with real mp/bp, LDF and polarizability, dipole-dipole, hydrogen bonds (follows VSEPR) |
| `chemistry/imfs/intermolecular-forces-liquids-scorm/` | The same IMF activity plus a part 6, properties of liquids: surface tension, viscosity, evaporation rate (about 40 min) |
| `chemistry/imfs/properties-of-liquids-scorm/` | That part 6 on its own: surface tension, viscosity, evaporation rate of bigger molecules (about 15 min) |
| `chemistry/moles/mole-conversions-scorm/` | Mole conversions by dimensional analysis: typed molar mass (tenths) and ratio blanks, the mole map, 12 mixed 1- to 3-step problems, typeset (LaTeX) solutions (about 25 min) |
| `chemistry/moles/mole-conversions-molarity-scorm/` | The same with molarity: L and mL of solution, the mol/L from the prompt as an equality, 14 mixed 1- to 4-step problems (about 30 min) |
| `chemistry/moles/empirical-molecular-formula-scorm/` | Empirical and molecular formulas by the teacher's four steps (percents to grams, grams to moles, divide by small, multiply if not whole): from percents or grams, the fraction finder and decimals-as-fractions drills, n from the molar mass, 8 graded problems (about 35 min) |
| `chemistry/moles/hydrate-formula-scorm/` | Formula of a hydrate by the same four steps: heating a hydrate, percent water, masses before and after heating, crucible data, the Greek prefix, 6 graded problems (about 25 min) |
| `chemistry/moles/combustion-analysis-scorm/` | Combustion analysis by the same four steps: a hydrocarbon (C and H only) from its grams of CO₂ and H₂O, × 2 H per H₂O, empirical and molecular formula, 6 graded problems (about 30 min) |
| `chemistry/moles/empirical-formula-mgo-scorm/` | Virtual lab (pre-lab, with a paper sheet): empirical formula of MgO, the nitride side reaction and the water fix (about 20 min, no score) |
| `chemistry/moles/hydrate-lab-scorm/` | Virtual lab (pre-lab, with a paper sheet): formula of a hydrate, CuSO₄·5H₂O heated to constant mass in a crucible, realistic data (about 25 min, no score) |
| `chemistry/reactions/balancing-particles-scorm/` | Balancing with particle diagrams: a reactants box and a products box that follow the coefficients, the atom tally, conservation of mass, lowest whole numbers, 10 graded equations and 6 questions (about 25 min). Package 1 of 4; the plan for the rest is `chemistry/reactions/PLAN.md` |

**AP chemistry**

| Folder | Activity |
| --- | --- |
| `ap-chemistry/bonding/resonance-scorm/` | Resonance structures and the hybrid, same 5 rules and builder |
| `ap-chemistry/kinetics/acetone-kinetics-scorm/` | Virtual lab: iodination of acetone by initial rates |
| `ap-chemistry/acids-bases/titration-curves-scorm/` | Titration curves: a particle diagram at five points, strong acid (HCl) vs weak acid (HF), why the equivalence point differs, acetic acid review (conceptual) |
| `ap-chemistry/acids-bases/buffers-scorm/` | Buffer Solution Visualization: an acid or base added to a buffer, particle diagrams of the reaction, why the pH barely moves, the Henderson-Hasselbalch equation (only for buffers) (first draft) |
| `ap-chemistry/acids-bases/buffer-beaker-demo/` | Buffer Beaker Demo: the teacher's smartboard beaker (no checkpoints, no score): sliders for HA and A⁻, drops of HCl or NaOH with the reaction animated, and the pH vs drops graph (the sliders show how more of each species shrinks the pH change) |

**Organic chemistry elective (Klein)**

| Folder | Activity |
| --- | --- |
| `organic-chemistry/spec-nmr/ir-spectroscopy-scorm/` | IR diagnostic-region drag and drop |
| `organic-chemistry/spec-nmr/ms-spectrometry-scorm/` | Mass spectrometry: reading the fragments |
| `organic-chemistry/spec-nmr/ir-ms-combined-scorm/` | IR and mass spec together: two spectra, one compound |
| `organic-chemistry/spec-nmr/nmr-intro-scorm/` | Intro 1H NMR: equivalence, shift, integration, splitting |
| `organic-chemistry/configurations-stereoisomerism/newman-projections-scorm/` | Newman projections, with calculations |
| `organic-chemistry/configurations-stereoisomerism/newman-projections-qualitative-scorm/` | Same, qualitative (no calculations) |
| `organic-chemistry/configurations-stereoisomerism/cyclohexane-chairs-scorm/` | Chairs, ring flips, 1,3-diaxial crowding (qualitative) |
| `organic-chemistry/configurations-stereoisomerism/chirality-scorm/` | Chirality, R and S, enantiomers, diastereomers and meso compounds (qualitative) |
| `organic-chemistry/configurations-stereoisomerism/chirality-no-meso-scorm/` | Same, without meso compounds, for a weaker group |
| `organic-chemistry/reactivity-mechanisms/arrow-pushing-scorm/` | Klein 6, before SN1/SN2: bond breaking and making, ΔG, energy diagrams, nucleophiles and electrophiles, drawing curved arrows, the four patterns, a final check (about 50 min) |
| `organic-chemistry/substitution-elimination/substitution-elimination-scorm/` | SN1, SN2, E1 and E2: reagent function, mechanisms with curved arrows, regio- and stereochemistry, rings, predicting products (about 50 min) |

**Older packages predate some house rules.** Everything except Newman, chairs, chirality (both versions), arrow pushing, mole conversions (both), the formula packages (all three) and balancing with particles contains em
dashes (the Lewis, resonance and drawing-tool validators allow them). The mass spec, IR + mass spec, NMR,
naming, acids and ionization energy packages still load a browser save inside an LMS when
`cmi.suspend_data` is empty (fixed in IR, Newman, chairs, chirality, Lewis and resonance). Only Newman,
chairs, chirality, SN1/SN2, arrow pushing, mole conversions, the formula packages and balancing with particles have `tools/layout.js`. The acetone kinetics lab still grades a choice on the
click, with no Submit answer button. Bring a package up to the rules when you next change it.

## House rules

- Plan first and get approval before building a new activity.
- No em dashes anywhere (each validator fails on one). Spelling as in the existing files: colour, centre, neighbour.
- Organic packages: kJ/mol, Klein's values. Honors packages: the teacher's 5 Lewis rules and Pauling
  electronegativities, as in `lewis-structures-scorm/`. Qualitative packages never ask for a calculation; a reference table sits beside the checkpoints instead.
- Same shell in every package: ungraded builds and predictions with specific feedback, graded checkpoints
  (first answer counts, core + random pool), score 0–100 to `cmi.core.score.raw`, `completed` at results,
  no masteryscore, retakes keep the best score, saves only in `cmi.suspend_data` (localStorage only when
  standalone), a `SCHEMA` version in `app.js` (bump when steps, pools or molecules change), its own SCORM
  identifiers and storage key.
- **Submit answer on every graded question** (the teacher: it is too easy to click a choice without reading it all the way
  through). Clicking a choice only selects it (class `selected`, `aria-pressed`) and can be changed freely; a **Submit answer**
  button (`.submit-answer`, disabled until something is selected) grades it, and that first submit is what counts. The button
  removes itself once used, then Next appears. Ungraded predictions and builds may still answer on the click. Typed or built
  answers already have a Check button, which is their submit. In the checkpoint shell this is `choose()` and the `submit`
  button in `RENDER.quiz`'s `ask()`; in the nomenclature and ionization energy packages it is the `checksubmit` action. In the IR, mass spec, IR + mass
  spec and NMR packages it is `Submit.pick()` in `game.js` (class `to-submit`) for the compound choices, the mass spec routes and
  m/z, and the IR + mass spec case file; a wrong submit there is struck out and the student picks again. Their labelling (tile, then
  peak) is already two steps and is unchanged. Walkthroughs
  click the choice and then `.quiz .submit-answer`.
- Offline only: no CDN, web fonts or WebGL. Keyboard, touch and drag for every action; dark mode; reduced motion.
- Answers are computed from the model, never typed twice, and the validator checks them.
- Every package also runs as a plain web page (see **Web version** below).
- Built zips are committed in `dist/`. Branch for new work; don't open a PR unless asked.

## Web version (GitHub Pages)

Every new package must also run as an ordinary web page, outside Schoology, from GitHub Pages. The address is
the site address plus the path to the file on GitHub:

```
https://coachcherry1.github.io/Chemistry/ + <class>/<topic>/<package>/src/index.html
```

For example `https://coachcherry1.github.io/Chemistry/chemistry/bonding/vsepr-polarity-scorm/src/index.html`.

- `src/index.html` must work opened straight from that address with no LMS: no error when the SCORM API is missing,
  saves go to localStorage, and the score and results still show.
- Relative paths only (`app.js`, `./img/x.svg`), never a leading `/` or a path outside the package folder, so the
  page works under `/Chemistry/` on Pages, inside the zip and from a local file.
- Put the Pages address in the package's `README.md`, and give it to the teacher when the package is done.
- Pages shows only `main`: a package on a branch gives 404 until it is merged.
- Folder names with spaces (the `to-merge/` folders) need `%20` for each space, and the teacher's own simulations
  in `to-merge/` keep `index.html` directly in the activity folder, with no `src/` in the address.

## Searchable index (index.html)

`tools/build_index.py` writes the root `index.html` from `tools/index_template.html`. It indexes every simulation (each
`src/index.html` package plus every page in `to-merge/`) and the organic question banks (`molecules.json`,
`problems.json`, `questions.json`), checks that every image and link it writes exists, and prints the counts. Run it
whenever a package is added, renamed or removed and commit the new `index.html`. A new collection needs one loader in the
script. Pages shows only `main`.

- **Topics:** `content/taxonomy.json` holds the organic chapters 2 to 11 and their sections (read from the chapter PDFs;
  section 3.4 is split into the four ARIO factors) plus "Other organic topics" for spectroscopy. Every organic item must
  map to at least one section id; the mapping rules (`QUIZ_SECS`, `problem_secs`, `MOL_SECS`, `SIM_SECS`) are in
  `build_index.py`, and an unknown id stops the build. Honors and AP topics come from their folder names.
- **Wording edits:** question text is edited through `content/overrides.json` (id to fields), never in the generated Word
  or JSON files. The index page's Edit button exports a file; `python3 tools/apply_edits.py <file>` merges it and rebuilds the
  problem bank, the question set and the index. Problem ids: `question`, `answer`, `explanation`. Multiple choice ids:
  `stem`, `options` (list, null where unchanged), `why`.
- **Word documents:** `tools/build_word_docs.py` writes one question document and one answer key per organic chapter (Ch. 2 to 11) to
  `organic-chemistry/word-docs/` from the same data as the index (question bank, acid/base quiz, substitution/elimination problems). The index has a
  blue **Download Word docs** button and, when a chapter is selected, a link to that chapter's pair. `apply_edits.py` rebuilds them before the index.
- **Worksheet builder:** the index has a **Worksheet** tab (button) where any question can be collected, reordered, edited, laid out on Letter pages by dragging and
  resizing boxes, given text boxes and an answer key, and exported to PDF (print, exact layout) or Word (order, text and sizes, not exact positions).
  Source `tools/worksheet.js` and `tools/worksheet.css` (inlined by `build_index.py`); see `tools/WORKSHEET_BUILDER.md`. Edit those files, never the generated `index.html`.
- **Builds:** the problem banks are generated by scripts in their `build/` folders and share `organic-chemistry/_shared/`
  (`chemdraw.py` drawings, `namer.py` IUPAC names, `overrides.py`). `molecules.json` is the source of truth for the
  molecule ids; do not re-run its `generate.py` unless the whole set is being replaced.

## Organic question bank (difficulty and filters)

`organic-chemistry/question-bank/` holds about 100 questions per Klein chapter 2 to 11 (50 multiple choice, 50 free response), built by
`build/chNN.py`; see its README. `tools/apply_edits.py` rebuilds both question banks before the index. Every question has a difficulty 1 to 5 (Easy, Basic, Moderate, Hard, Very hard); only 1 to 4 are
written, level 5 is Klein's Challenge level and is avoided. The index filters by topic, subtopic, difficulty, format (Multiple
choice or Free response) and course, sorts by difficulty, and lets the teacher change any question's difficulty inline (exported
as `difficulty` through the Edits file). Questions follow the same wording rules as everywhere else (no em dashes, no
"spontaneous", "anti-coplanar", "back-side").

## AP chemistry question bank

`ap-chemistry/question-bank/` holds every released AP Chemistry free-response question from 2015 to 2026 (no 2020 exam): 77 questions cut
out of the College Board papers with their diagrams (`images/AP<year>F<n>.png`), tagged by AP unit in `build/ap_meta.py`, and shown in the
index's AP Chemistry tab. Long questions start at difficulty 4, short ones at 3. The papers have no answer keys. `reference/` keeps the
source PDFs, their raw text, `frq-text/` (clean hand-checked wording of every question), two multiple-choice practice exams (60 questions each, no keys) and `REFERENCE.md`, which is where to look when
writing new AP questions. These are College Board materials, published as released.

## Before every commit (in the package folder)

```bash
node tools/validate.js                    # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh                                # zip into dist/
node tools/walkthrough.js                 # Playwright, fake LMS; SHOTS=dir DARK=1 optional
node tools/layout.js                      # Playwright: fits a Chromebook (1366x650, 1366x520 LMS frame)
```

Students use school Chromebooks. Whatever a student works with (a slider or molecule and the plot or
graph it moves, a tray and its drop targets) must be on screen together at 1366x520 without zooming;
`tools/layout.js` checks this. Back and Next sit above each step as well as below it.

Playwright lives at `/opt/node22/lib/node_modules/playwright` with Chromium preinstalled. To look at a
step, open `src/index.html?step=<id or number>`. To keep context small, screenshot the panel you need,
not the full page.

## cyclohexane-chairs-scorm (branch `cyclohexane-chairs`, zip v2, SCHEMA 3)

- **Key objective:** steric strain from axial groups (1,3-diaxial interactions); equatorial avoids it.
- 21 steps in 4 parts; 18 graded questions (4+4+5+5) from a pool of 51. The A-value table is open beside checkpoints 3–4.
- **A-values (kJ/mol):** Cl 2.0, Br 2.0, CH₃ 7.6 (Klein: 2 × 3.8), CH(CH₃)₂ 9.2, C(CH₃)₃ 22.8. They match the Newman strain table.
  CH₃/CH₃ syn-diaxial 15.4 is starred as not in Klein.
- **Scope:** cis/trans vocabulary; only 1,4 and 1,3 disubstituted rings (no 1,2). The boat gets one short step.
  The twist-boat is named once and never graded.
- **Geometry:** one 3D chair model (`chair.js`) drives everything.
  - Chair drawings are projections of it. Chair 2 is drawn as the mirror template, with C1 at the right and up staying up.
  - Klein-style Newman projections of the chair (`Draw.klein`) look down C1–C2 and C5–C4 at once.
    Chair 2 is drawn from the same direction as chair 1, not turned over as in Klein Fig. 4.29.
  - A flip turns the bonds on C1/C5 by ±60° and on C2/C4 the other way.
  - Klein views appear in Parts 1–3 and in two Part 4 steps: a trans-1,4 build on C1 and C4 (`build-newman2`) and
    cis-1,3's diaxial chair with the CH₃/CH₃ clash (`newman13`).
- **Flip animation:** a chair drawing redrawn through a flip passes `steady` to `Draw.chair` (one frame for the whole
  flip, carbon numbers that glide; a still drawing keeps the widest-gap rule). The 3D views `start`, `side`, `above` and
  `newman` follow the flip (`FOLLOWS` in `viewer3d.js`); a view turned by hand does not. A played flip is timed by
  `flipAt()` in `app.js` so it does not stop at the boat (t = 0.5 is still exactly the boat). The walkthrough checks it.
- **Files:**
  - `chair.js`: geometry, flip, crowding, cameras
  - `molecules.js`: flat-ring molecules
  - `avalues.js`: A-values and energies
  - `draw.js`: chair, flat, Newman, Klein, energy plot
  - `viewer3d.js`: 3D viewer
  - `app.js`: `STEPS`, `PREDICT`, renderers
  - `quiz.js`: question bank

## chirality-scorm (branch `claude/hopeful-feynman-fuhl6t`, zip v1, SCHEMA 5)

- **Key objective:** name a chirality centre R or S by rotating the molecule until 4 is on the dash, never by swapping
  groups; then tell enantiomers, diastereomers and meso compounds apart.
- 19 steps in 4 parts; 16 graded questions (4+4+4+4) from a pool of 53. The atomic-number table is open beside checkpoints 2–4,
  Klein's chart of the kinds of isomers beside checkpoint 4.
- **Teacher's wording:** the rule on screen is "If 4 is not on the dash, rotate the molecule." R is "rockwise" and S
  "sountersockwise" (the teacher's joke, credited to them) in exactly three places: the steering-wheel step, Big ideas and
  Vocabulary, never in `quiz.js`. Swap, switch, interchange and reverse never appear in student text. The validator checks all of it.
- **Scope:** no calculations, no optical activity, no Fischer projections (the validator uses Fischer only for its textbook
  anchors). The mirror image is drawn both beside the molecule and behind the page. Rings: cis/trans 1,3- and
  1,4-dimethylcyclohexane from the chairs activity. Molecules A and B (2,3-dibromobutane) come from the Newman activity.
- **Four different groups is the working test** (the teacher: the mirror image is the fun part, the practical test
  needs stressing). Mirror, mirror is CHBrClF only and its reveal names the four groups; Find the chirality centres has
  six molecules; **Chiral or not?** (`chiral`, `RENDER.centres` with `verdict`) sorts lactic acid, glycine, alanine,
  glycerol and 2-propanol (one centre or none, each with an everyday `note`). `CENTRE_RULE` is on screen in both
  steps. Checkpoint 1's core is `a-centre-which` and `a-butanol`.
- **Klein's mirrors** (`Draw.pane`: a tinted glass pane in perspective, the image drawn on it, "Enantiomer"): the
  `drawmirror` step is Klein's figure with amphetamine (`Ph` group: a flat benzene ring, 1.39 Å bonds, drawn as a
  hexagon) and his three mirrors, next to (`beside`), behind and beneath. Students build only the mirror behind (one
  choice: wedge or dash), then see all three side by side and predict how many molecules (`threeSame`: one). Building
  all three by flipping the drawing was tried and dropped: a chemist found it a drawing puzzle, and confusing. The 3D mirror scenes have a real glass pane (camera turned 24°).
- **Enantiomers vs diastereomers by mirror images:** Klein's chart (`Draw.isomerChart`, Fig. 5.11) in the four step,
  Vocabulary and beside checkpoint 4; tiles "Enantiomers: mirror images" / "Diastereomers: NOT mirror images"; each
  pair has a Mirror button (the first in a mirror behind it, beside the second); feedback and explanations lead with
  "are they mirror images?"; checkpoint 4's core includes `d-chart`.
- **Meso is recognised by an internal mirror plane**, taught in the `mesotut` step before Molecules A and B: two centres
  give at most 2ⁿ; cut between the centres and the halves must match (`STEREO.halves`); turn to eclipsed and every group
  must face its twin (`STEREO.facing`). R,S only confirms it. Not by laying the molecule on its mirror image (a guided
  version of that was tried and reverted). The three checks are `MESO_CHECKS` in `app.js`, also in Vocabulary.
- **Rotation is the teacher's spear** (and Klein's): spear the molecule through the carbon, between the two bonds in
  the page, and rotate it about the spear: 180° for 4 on the wedge, 90° for 4 in the page (worksheet part e). The
  spear is vertical in Klein's layout (template A, also V) and comes from the side in a sideways drawing (template S,
  used for the rotate step's 4-in-page molecule). A zigzag has vertical and side 180° spears through its middle. A
  centre has 24 drawable orientations: its template's 12 and 12 more in the partner template (A and V, or S turned
  round), so turn indices 0 to 11 are unchanged. `STEREO.spears`/`speared`. Each spear is drawn on the structure
  (`Draw.mol` `opts.spears`: 180° arrow at the point end, 90° at the other) and as a rod in 3D (viewer `spears`,
  `onSpear`); each half, its arrow and its button are clickable; the drawing animates with the model (sheared
  frames in a fixed `box`). Nothing in the R/S rotator or the mirror scenes can be dragged; the look-only viewers
  (centres, rank, mesotut, meso plane, rings) still can. Rules name the turn ("Rotate the molecule 90° on the side
  spear."). The validator tries every turn in every position and reflection.
- **Geometry:** one 3D model per molecule drives everything.
  - Drawings are projections of it (x right, y up, z toward the reader). A bond whose unit vector has z above 0.3 is a
    wedge, below −0.3 a dash.
  - R/S is read from the model's handedness; CIP priorities come from a hierarchical digraph with duplicate atoms.
  - Relationships are found twice, from the R/S labels and by superposing the models, and must agree.
  - Turns snap to the 12 drawable orientations of each template; a mirror reflects beside (x) or behind (z) the page.
- **Files:**
  - `geom.js`: vectors, rotations, superposition
  - `groups.js`: elements and substituents
  - `molecules.js`: molecule specs and builders
  - `cip.js`: priorities, explanations, R/S
  - `stereo.js`: turns, mirrors, relationships, meso and mirror planes
  - `draw.js`: wedge-and-dash, flat ring and Newman drawings
  - `viewer3d.js`: 3D viewer (2D canvas, linked mirror image)
  - `app.js`: `STEPS`, `PREDICT`, renderers
  - `quiz.js`: question bank

## chirality-no-meso-scorm (zip v1, SCHEMA 5)

- A copy of `chirality-scorm/` for weaker years: Parts 1–3 identical; Part 4 keeps the four stereoisomers and Rings
  (trans-1,3, cis- and trans-1,4 only: chiral or no chirality centres). No meso tutorial, no Molecules A and B, no cis-1,3.
- 17 steps; 16 graded questions (4+4+4+4) from a pool of 48. Checkpoint 4 is enantiomers, diastereomers, counting and rings
  (core `d-chart`, `d-rel-dia`).
- The validator fails if "meso" appears in student text. Its own SCORM ids (`CHIRALITY_NOMESO_*`), save key
  (`chirality-no-meso-state`) and zip. A fix to shared code in `chirality-scorm/` usually belongs here too.

## vsepr-polarity-scorm (branch `vsepr-polarity`, zip v3, SCHEMA 3)

- **Key objective:** domains spread apart, so the Lewis structure (flat) is not the shape; lone pairs repel more
  strongly than shared pairs; polarity by radial symmetry.
- 14 steps in 3 parts; 16 graded questions (4+6+6) from a pool of 51. The electronegativity table is open beside checkpoint 3.
- **Polarity is radial symmetry, never the shape name.** Every polarity step asks "Is X radially symmetric?" before
  "polar or nonpolar?"; explanations and all of checkpoint 3 are worded in symmetry (`Vsepr.symmetry`). "Lopsided" is
  banned. The reason is always given as "the pulls of its polar bonds cancel each other out" (or do not). Molecule
  orders and the step-8 sort cards are shuffled per student (CO₂ stays first where it is predicted).
- **Checkpoint choices:** the right answer is never the longest sentence choice; the validator checks it.
- **Teacher's choices:** builds use the 5 rules (lewis.js, builder.js, draw.js, snark.js copied from `lewis-structures-scorm/`;
  builder.js adds an `onChange` hook for the 3D window). 2 to 6 electron domains; lone pairs on the central atom only with
  4 domains (no see-saw, T-shaped, square planar, square pyramidal, no 7 domains). Angles taught as 109.5°, **<109.5°**
  (one lone pair) and **<<109.5°** (two); no 107 or 104.5 is ever asked or shown. "Molecular geometry", shape only (no
  electron-domain geometry name). No steric number, AXE, hybridization, formal charge or dipole arrows/moments.
- **Polarity:** atoms get partial charges from Pauling electronegativity differences; the charge view marks the centre of
  positive and of negative charge; together means nonpolar (radially symmetric), apart means polar. Ions get geometries
  but never a polarity. The field test turns every polar molecule equally (no "how polar").
- **Geometry (`vsepr.js`):** domain templates matched to the Lewis drawing's directions for the flat-to-3D spread.
  NH₃ and H₂O are built at their measured angles (`MEASURED_ANGLE` in species.js); no other lone-pair molecule is drawn in
  3D. Angle arcs only where all outer atoms are alike; mixed outer atoms read "about 109.5°".
- **Files:** `species.js`, `vsepr.js` (model), `viewer3d.js` (canvas 3D, lone-pair lobes, arcs, charges), `field.js`
  (field test), `quiz.js`, `app.js`, plus the copied Lewis files.

## intermolecular-forces-scorm (branch `intermolecular-forces`, zip v5, SCHEMA 3)

- **Key objective:** IMFs are between molecules; stronger IMFs, higher mp/bp; with similar electron counts LDF <
  dipole-dipole < hydrogen bonding.
- 22 steps in 5 parts; 18 graded questions (4+4+5+5) from a pool of 58. The atomic-number table is beside every
  checkpoint, the electronegativity table beside checkpoint 3.
- **The habit: name the IMFs, then predict.** Every comparison step opens with a card per substance (Lewis structure,
  electrons, toggles for all three forces from the first card, so students rule forces out too);
  the prediction, ranking or counting opens only when all are right. One IMF-naming question is core in each checkpoint;
  every question naming a molecule draws it (`figs`). The validator checks both.
- **Checkpoint choices:** the right answer is never the longest sentence choice; the validator checks it.
- **Teacher's rules:** LDF compared by electron count, with the word polarizability. Hydrogen bonds: **donor** (H on N, O
  or F) and **receiver** (lone pair on N, O or F; never "acceptor"); count per molecule = min(H on N/O/F, lone pairs on
  N/O/F). Helium only by boiling point, only against neon (no mp at 1 atm). Excluded: "van der Waals", degrees of
  polarity, isomers and contact area, H₂/He, organic class names (alcohol, carbonyl, ether ...).
- **Data:** real mp/bp (CRC 97th ed.) in kelvin in `data.js`, shown in °C and K. Every comparison anywhere must be
  decided by `Chem.compare` and agree with both bp and mp (`Chem.dataAgrees`); the validator also requires every °C
  quoted in questions and steps to be a real data point. Kept out because the data disagree: ethanol vs methanol,
  water vs ethylene glycol, NH₃ vs HF.
- **Order:** `mixed()` in app.js shuffles each comparison step's substances per student (seeded), never rising bp for 3+.
- **Clouds (`cloud.js`):** the cloud sloshes (target-seeking spring), ripples and carries electron specks; shifts keep the
  real polarizability proportions, magnified; a dashed LDF line pops up while both clouds show δ+/δ−.
- **Heating stage (`heat.js`):** 2D Lennard-Jones particles with gravity 0.25 and a thermostat; reduced temperature
  from the real mp/bp: solid 0.03 to 0.15, liquid 0.33 to 0.38, gas 1.8 to 2.8. Dashed IMF lines join close pairs
  (r < 1.27) in solids and liquids, none in a gas (drawn as ideal). Motion is illustrative (solid still, liquid slow);
  no speeds and no boiling-point ticks are shown.
- **Heat button, not a slider** (the teacher saw students jump the thermometer): Heat warms every box from `minK` to
  `maxK` in 10 s (`RAMP`), Pause holds it, Start again returns to the cold end. The range input is a gauge only;
  `stage.range` is the button, so the activity's lock-until-predicted code is unchanged. Same `heat.js` in both IMF
  packages.
- **Files:** `data.js`, `chem.js` (model), `mol2d.js` (Lewis SVG scenes, H-bond lines), `heat.js`, `cloud.js`
  (polarizability), `quiz.js`, `app.js`.
- **Walkthrough harness (both new packages):** the fake LMS reads and writes sessionStorage on every call and never stages
  the next load's data; staging made the reload check fail at random (still the case in the older packages' walkthroughs).

## substitution-elimination-scorm (branch `claude/compassionate-allen-hwn3ov`, zip v4, SCHEMA 2)

- **Key objective:** Klein's three steps (7.9): the function of the reagent, the substrate and Klein's table, then
  regio- and stereochemistry; major and minor products.
- 26 steps in 5 parts; 23 graded questions (4+5+5+4+5) from a pool of 73. Every checkpoint's core has a
  reagent-function question. No reference table beside the checkpoints (the teacher's choice).
- **Klein's wording:** SN2 is nucleophilic attack and loss of the leaving group, concerted, back-side attack,
  inversion of configuration; E2 is proton transfer and loss of the leaving group, anti-coplanar (never
  antiperiplanar); the four arrow patterns by Klein's names. What slows or stops SN2 is **steric hindrance** at
  the back side (the teacher's phrase, never "crowding the back side"). The validator bans backside, Saytzeff,
  Walden and crowding the back side.
- **Teacher's choices:** four functions named "Nucleophile only", "Strong nucleophile and strong base", "Base only",
  "Weak nucleophile, weak base" with Klein's headings beside; t-BuOK is strong/strong but hindered (E2 major at 1°,
  Hofmann). NaCN and NaN₃ nucleophile only, NaH base only. Regiospecific = only one β H can be anti-coplanar.
  SN2 stereospecific, SN1 not. E/Z for every stereogenic alkene, names as (E)-pent-2-ene; Klein's ring names
  (1-methylcyclohexene). Carbocation rearrangements in, on 2° substrates in ethanol (the step explains Klein's ✗).
  Left out: solvents, leaving-group ranking, rate-law equations, graded arrow drawing, A-values on screen.
- **Checked against the teacher's Klein chapter 7 PDF (Nov 2026).** Figure 7.18 is the table (the 3° weak cell is
  "SN1 and E1"): SN1 is favoured unless an E1 alkene is tri- or tetrasubstituted, then E1 is major
  (`React.predict`; tBuBr in EtOH SN1 major, bmb E1 major). That edition says anti-periplanar after introducing
  anti-coplanar, and never says regiospecific or trans-diaxial; the teacher's words are kept.
- **One model:** molecules are SMILES (or the chairs' flat-ring spec) in `molecules.js`, each with its textbook name
  for the validator; names (`name.js`), drawings (`layout.js`), products (`react.js`), 3D (`build3d.js`) and
  mechanisms (`mech.js`) are all computed. E2 stereochemistry is checked twice (parity math and a 3D anti
  conformer). Ring E2 uses faces: an H is trans-diaxial if it is on the face opposite the leaving group.
- **Arrows:** tap the electrons (lone pair or bond), then the target (atom, or bond for a new π bond), or drag, or
  Tab/Enter; Klein's reasons for wrong arrows in `mech.js`; Show me after three misses.
- **Every reaction plays** (`play.js`, the teacher asked for as many animations as possible, like arrow pushing):
  right arrows are replaced by the step played (electron pairs ride the arrows, bonds fade or grow, atoms glide
  into the products, charges move; ‡ brackets and δ− for SN2 and E2), with Play, a slider and the energy marker.
  The products are what the arrows make in the graph; each scene's `anchor` and `stereo` give the inversion and
  E/Z. Regio and the predict problems play mechanisms without drawing (`U.chainBox`, `U.scenesFor`).
  `App.playedScenes()` lists them all: the validator checks their products against react.js, the walkthrough
  their drawings. The step-21 sort shows one reaction at a time, drawn out.
  Each play has a caption line and a Slow motion button; in SN2 the groups swing over the α carbon (`swing`).
- **Files:** `mol.js`, `name.js`, `layout.js`, `draw.js`, `react.js`, `build3d.js`, `viewer3d.js`, `anim.js`, `mech.js`,
  `arrows.js`, `play.js`, `chair.js` (from the chairs activity), `molecules.js`, `quiz.js`, `app.js`, `steps1.js` (Parts 1-2),
  `steps2.js` (Parts 3-4), `steps3.js` (Part 5).

## intermolecular-forces-liquids-scorm (zip v2, SCHEMA 1)

- A copy of `intermolecular-forces-scorm/` (left as it is; the teacher's base version) with part 6, **properties of
  liquids** (10 to 15 min), and its own SCORM ids (`IMFL_*`) and storage key. Fixes to parts 1 to 5 belong in both copies.
- 27 steps in 6 parts; 23 graded questions (4+4+5+5+5) from a pool of 77. The rule sits beside checkpoint 5.
- **Teacher's rules for part 6:** at the same temperature, stronger IMFs mean higher surface tension, higher viscosity
  and slower evaporation (direct, direct, inverse). No vapour pressure, molecular complexity or entanglement, and no
  numbers on screen. A saturated hydrocarbon is nonpolar, LDF only. IUPAC names in the class's style (2-butanone,
  1-butanol, 1,5-pentanediol), never the compounds of the paper prelab (ethanol, 2-propanone, hexane,
  1,2,3-propanetriol, water, dimethyl ether).
- **Liquids:** pentane, heptane, octane, decane, 2-butanone, 1-butanol, 1-hexanol, 1,5-pentanediol, built by
  `straightChain()` in `data.js`. `LIQUID` holds real 20 °C surface tension, viscosity and vapour pressure, used only by
  the validator and to pace `bench.js`. A property is asked only when `Chem.propWinner` and `Chem.propAgrees` (margins
  5%, 30%, 50%) agree; rankings need the real bp to agree (mp is ignored here). 2-Butanone and 1-butanol tie on surface
  tension, so that pair is never compared by it.
- **Step kind `props`** (`RENDER.props`): IMF cards led by the name (and hydrogen-bond counts where `count`), rank
  strongest first, predict each `[prop, most]`, then run the liquid bench (drop on plastic, pipet draining, drop left
  out). Reduced motion shows a still partway through with the order in words.

## arrow-pushing-scorm (branch `claude/charming-gauss-ear0ac`, zip v1, SCHEMA 4)

- **Key objective:** recognise and draw Klein's four patterns (6.8): nucleophilic attack, loss of a leaving group,
  proton transfer, carbocation rearrangement; vocabulary adoption. Comes before `substitution-elimination-scorm/`.
- 25 steps in 5 parts; 25 graded questions (4+4+5+5+7) from a pool of 78. Part 5 is a **final check** (`quiz-E`): 7 questions
  (two graded drawings, a sequence, a pattern, a vocabulary core, two more) on reactions no step or earlier checkpoint has
  shown; the validator enforces that. Energy words beside checkpoint 1, Klein Table
  6.3 (and the four patterns) beside 2 to 4. Every checkpoint's core has a vocabulary question; checkpoints 3 and 4
  each have a **graded arrow drawing** (first Check counts; Check with nothing drawn is not an answer) and a
  pattern or sequence question (pick groups in `quiz.js`).
- **Teacher's wording:** AP Chemistry trained. Never "spontaneous": ΔG < 0 is thermodynamically favorable, ΔG > 0 not
  thermodynamically favorable; ΔG kept; exergonic and endergonic used. No ΔH calculated, but "bond breaking is
  endothermic, bond making is exothermic" everywhere (energy ledger beside every animation). Kinetics left out except
  Eₐ as a hill and peaks/valleys: no rate equations, orders, rate constants, catalysts, Hammond. No reversible or
  irreversible arrows (Klein 6.12 was removed at the teacher's request). No "Lewis acid"/"Lewis base" and no hyperconjugation (not taught in the course): carbocation
  stability is alkyl groups being electron-donating, by induction. The validator bans all of those words and ⇌ in `src/`. Table 6.1 values only as bar heights, never added up.
- **One model:** `chem.js` states (atoms with hidden H and lone pairs, bonds; charges computed) and `apply()` moving one
  pair per arrow with Klein's rules (6.10); `classify()` names a step from the bonds that change. `scenes.js` writes each
  step once (Klein's drawing, coordinates, arrows); the product is what the arrows make, checked against SMILES and
  Klein's pattern by the validator. Chains (`f623`, `f631`, `ester`) start each step where the last ended. Every drawn
  bond, before and after each step, must be 0.7 to 1.35 bond lengths (a ring an arrow closes is redrawn as a ring).
  Klein's Figure 6.31 is drawn inside the `sequence` step so students never need the textbook; animations always start
  from the arrows and play by themselves after a right answer.
- **Arrows:** the SN1/SN2 tap, drag or Tab/Enter tool, judged by `judge.js` by what each arrow does with its pair (order and
  equivalent heads don't matter); Klein's reasons computed from the model; wrong-but-legal arrows show what they make;
  Show me after three misses. A right drawing plays (`Render.Player`), fills the energy ledger, then a word-tile sentence
  (`SAY` in `steps2.js`).
- **Animation beats (`Render.BEATS`), clean cuts, never opacity fades:** arrows still; electrons ride the arrows with a
  trail (breaking bond dashed, forming bond drawn out dashed from the source atom); LAND (new bonds, lone pairs and charges
  in the arrow colour, old ones gone, arrows gone); atoms glide; settle. Before LAND the frame is laid out as the reactants,
  after it as the products (`layoutP`), so lone pairs and charges never hop. The Part 1 pictures use the same beats.
- **Files:** `chem.js`, `scenes.js`, `judge.js`, `render.js`, `arrows.js`, `energy.js`, `picker.js`, `quiz.js`, `scorm.js`,
  `app.js`, `steps1.js` (Parts 1-2), `steps2.js` (Parts 3-4).

## buffer-beaker-demo (zip v1; the teacher's smartboard tool, no score)

- A beaker on the left, two sliders (HA and A⁻, 0 to 0.20 M) and buttons for 1 or 5 drops of HCl or NaOH on the right, a big pH meter
  the **pH vs drops** graph (the buffer's curve, pure water's curve and a dot for the beaker; "Show pure water" hides the water curve and meter line)
  and a **running data table** on the main screen (a row per drop, slider move or reset: action, pH after, change from the previous pH, [HA] and [A⁻]).
  Space is tight, so the drop buttons are compact and the pH strip is thin.
  No checkpoints; `scorm.js` only marks the SCO completed. Companion to `buffers-scorm/` (which keeps its checkpoints).
- **Teacher's choices:** the species are written **HA and A⁻** only (never HAc, Ac⁻, no ammonia pair). **Na⁺ and Cl⁻ are not drawn** and
  not mentioned (the model still counts them for the charge balance); the validator fails if the beaker draws them. The equation is only
  shown with the "Only for a buffer" warning, and says it does not apply when a member is missing.
- **Each drop plays:** the reacting particles pulse, the drop falls, H⁺ or OH⁻ travels to one, it flashes as it changes form (H₂O appears for
  NaOH); with nothing left to react, the H⁺ or OH⁻ stays free and the line under the beaker says the pH changes sharply.
- **One model** (`buffer.js`): `(ha, a, drops of HCl, drops of NaOH)`, real-valued, exact pH from a charge balance; one particle or drop is
  0.010 M. The validator checks every beaker state and that one more step of A⁻ (for HCl) or of HA (for NaOH) never gives a larger pH change while the member lasts.
  An earlier "Same drops, stronger buffer" bar chart was removed at the teacher's request (confusing).
- **Layout:** the whole demo fits at 1280x720 and up (`tools/layout.js`); a shorter window scrolls the right column. Large type and targets.
- **Files:** `buffer.js`, `beaker.js`, `charts.js`, `app.js`, `scorm.js`, `util.js`.

## buffers-scorm, "Buffer Solution Visualization" (zip v1, SCHEMA 1; first draft, to be flushed out with the teacher)

- **Key objective:** a buffer has a particle ready for added acid (the base member) and one ready for added base (the acid member);
  added H⁺ or OH⁻ is used up, the ratio changes little, so the pH changes little. Not about making a buffer.
- 18 steps in 5 parts; 20 graded questions (4+4+4+4+4) from a pool of 40. The pair table and particle key sit beside every checkpoint;
  the equation warning sits beside 4 and 5.
- **The equation rule (teacher's):** pH = pKa + log([base member] / [acid member]) is only for a buffer with appreciable amounts of BOTH
  members. It always appears with that warning (the validator checks the ratio, "does it work" and use steps). Weak acid alone, conjugate
  base alone and strong acid are taught as "does not work". "Appreciable" means neither member under a tenth of the other.
- **Pairs:** acetic acid / acetate (pKa 4.74, Na⁺ spectator) and NH₄⁺ / NH₃ (pKa 9.26, Cl⁻ spectator). HF is left out on purpose (its Ka
  makes the equation poor after a few additions). One particle is 0.010 M; the buffer is 10 + 10; added strong acid or base is in the same
  units, dilution ignored. Free H⁺ is not drawn in a working buffer (counts keep charge balanced).
- **One model** (`buffer.js`): a flask is (pair, acid member, base member, strong acid or base added); the exact pH from a charge balance,
  particle counts, curves, reactions and every checkpoint answer come from it. `quiz.js` `fact` entries: `pH`, `waterpH`, `count`,
  `counts`, `hh`. Where a buffer stops (10 particles of acid or base) is taught in the range steps.
- **Files:** `buffer.js`, `flask.js` (particles, flashes when a particle changes form), `phcurve.js`, `steps.js` (lesson steps),
  `app.js` (order, saving, checkpoint screen), `quiz.js`, `picker.js`, `scorm.js`.
- Teacher links: `?step=<id or number>` and `?step=quiz-D&all`. Walkthrough harness: the fake LMS reads and writes sessionStorage on every call.

## titration-curves-scorm (zip v1, SCHEMA 1)

- **Key objective:** the equivalence point is where moles of base equal moles of acid; its pH is set by the ions left.
  Na⁺ and Cl⁻ do not react with water (pH 7); a weak acid's conjugate base does and makes OH⁻ (pH above 7).
- 15 steps in 5 parts; 20 graded questions (4+4+4+4+4) from a pool of 54. A Ka and pKa table plus the particle key sit beside
  every checkpoint (qualitative: nobody calculates a pH). Checkpoint 5 is the review with a different weak acid.
- **Teacher's choices:** HF is the weak acid because its anion F⁻ is simple (acetic acid, drawn HAc and Ac⁻, only in the
  review). "Half-equivalence point". Water is not drawn. 24 acid units per diagram; a weak acid is drawn with a true ratio
  (2 of 24 HF ionized; none for acetic acid, and a note says why). Left out: pH, pKa and Ka calculations, ICE tables,
  Henderson-Hasselbalch, buffer capacity, indicators, polyprotic acids, weak base titrations.
- **Five points** (NaOH units of 25/24 mL): start 0, half-equivalence 12, before equivalence 18, equivalence 24, after 30. Each
  walk asks what is in the flask (the diagram then changes) and what decides the pH (the pH and a numbered dot appear).
- **One model** (`titration.js`): the exact pH from a charge balance, whole-particle counts (the validator checks the charge
  balance at every slider position), what decides the pH, the pairs to sort. The diagram, curve, predictions and every
  checkpoint answer come from it; `fact` entries in `quiz.js` tie answers to it.
- **Files:** `titration.js`, `particles.js` (flask, fixed place for every particle), `curve.js` (pH curve, numbered points, marker
  you click, drag or arrow-key), `picker.js` (shared), `quiz.js`, `app.js`.
- Teacher links: `?step=<id or number>` and `?step=quiz-C&all` (every question of a pool). Walkthrough harness: the fake LMS
  reads and writes sessionStorage on every call, as in the VSEPR and IMF packages.

## properties-of-liquids-scorm (zip v2, SCHEMA 2)

- Part 6 of `intermolecular-forces-liquids-scorm/` on its own: the same 4 `props` steps, `bench.js` and checkpoint E
  (8 from 19, core 3), with parts 1 to 5, the heating stage, clouds, picker and explore mode removed. Its own SCORM ids
  (`POL_*`), save key (`properties-of-liquids-state`) and zip. `SUBSTANCES` holds only the eight liquids.
  A fix to part 6 in either package usually belongs in the other.

## empirical-formula-mgo-scorm (zip v1, SCHEMA 1; the teacher's pre-lab, no score)

- **Key objective:** practice the setup and the calculations of the magnesium oxide lab; magnesium also makes Mg₃N₂ with the nitrogen of the
  air, and a few drops of water (Mg₃N₂ + 6 H₂O → 3 Mg(OH)₂ + 2 NH₃, then heat: Mg(OH)₂ → MgO + H₂O) fix it. "Nitride", never "nitrate".
- **Data and calculations are on paper** (`lab-sheet/`, built by `build_sheet.py`, student and teacher edition 2 pages each, the teacher's limit). The sim has no tables,
  typed answers or score; `scorm.js` only marks it completed at the last step; `suspend_data` holds the seed. Random masses per student
  (crucible + lid 25 to 35 g, Mg 0.1 to 0.2 g, scatter within 1%); the class's roundings (Mg 24.3, O 16.0, 6.02 × 10²³) on the sheet.
- **Bench (`scene.js`):** 2D SVG from the approved sketch (`design/`). The ring stand and clay triangle are already set up; drag the burner and the crucible,
  or click a tile and then the place; bench pieces (crucible, Mg, lid, DI bottle) can be dragged directly and the drag shows the piece, not a label. No goggles, scissors or tongs.
  Flame height is set by turning the bottom of the burner (a slider); the end of the scale is the perfect height (tip just touches the crucible's bottom, never inside it); the Mg does not ignite below it.
  The lid is placed automatically with a crack (the "what if" buttons were removed at the teacher's request). A big bold summary of the current job sits top left of the bench
  (`goalText()` in `app.js`); a finished step moves on by itself after a pause (`AUTO`; the water step stays manual because the drop count is the student's), and Next stays as a fallback.
- **Water step:** drag the lid onto the ceramic pad, then the DI bottle above the open crucible, then press Add 1 drop. One drop converts one of six nitride Mg
  (the magnifier above the balance, `lens.js`, also shows O₂ and N₂ flying in and joining Mg during the burn, and Mg(OH)₂ turning to MgO on reheating); NH₃ gas is drawn rising (the smell is only in the real lab).
  `data.js` gives the product mass from the drops, so skipping the water gives an O : Mg ratio near 0.93.
- **Files:** `data.js`, `scene.js`, `lens.js`, `app.js`, `picker.js`, `scorm.js`, `util.js`. Walkthrough, layout and validator in `tools/`.

## hydrate-lab-scorm (zip v1, SCHEMA 1; the teacher's pre-lab, no score)

- **Key objective:** practice the setup and the calculations of the hydrate lab: heat a hydrate to constant mass, water lost by mass, moles, the water : salt ratio, the formula
  and name (Greek prefix). Sister of `empirical-formula-mgo-scorm/` (same bench graphics, same paper-sheet approach, copied code: a fix to shared pieces such as `picker.js`,
  the heat model and the scene drawing usually belongs in both). The other `hydrate-formula-scorm/` is the graded four-step tutorial, a different activity.
- **Data and calculations are on paper** (`lab-sheet/`, built by `build_sheet.py`, student 2 pages, teacher edition 3). The sim has no tables, typed answers or score; `scorm.js`
  only marks it completed at the last step; `suspend_data` holds the seed. Class roundings: Cu 63.5, S 32.1, O 16.0, H 1.0 (CuSO₄ 159.6, H₂O 18.0).
- **Open balance and weigh boat** (no glass doors). The student shakes out the solid: drag the weigh boat onto the balance, drag the bottle of hydrate (mouth down, labelled
  CuSO₄·xH₂O so the student finds x) above the boat, **click the bottle** (or the button) to shake out 0.10 to 0.32 g at a time as blue crystals that fall and heap up; about 2 g
  (at least 1.5 g, at most 3 g). Pour the boat into the crucible (a few mg stay behind), mass it, set it in the triangle (the burner is pre-placed).
- **Heat, cool, mass, repeat until constant mass** (two masses in a row within 0.01 g): at least 3 heatings, at most 5 (usually 3, sometimes 4); the sim says when the mass is
  constant and never says water is left (the teacher's choice). A **running data table** (right column, under Back and Next) lists each reading as it is taken. The flame must touch the crucible's bottom (end of the scale). Water leaves the crucible as H₂O gas wisps; the crucible reddens; the magnifier shows 15 small CuSO₄ units
  (first heating only: later it would read as "all the water is gone") with 83 small waters scattered among them, deliberately not a countable ratio (the teacher: the diagram need not show the right ratio), leaving one by one as the crystals go from blue to white.
- **Real data (`data.js`):** the water : CuSO₄ ratio from a student's own readings is always 0.10 to 0.15 from 5 (above or below), never exact; heating removes about 80 to 88%
  of the water, then about 93 to 97%, and so on; masses never rise between heatings; the validator checks 2000 runs (heatings, ratio error, monotone masses, constant at the end).
- **Files:** `data.js` (`Lab.make`, `Lab.run`), `scene.js` (bench, boat, bottle, crystals), `lens.js` (the lattice), `app.js`, `picker.js`, `scorm.js`, `util.js`. Teacher links:
  `?seed=<n>`, `?step=<n>` and `?step=<n>&k=<heating>`. Walkthrough, layout and validator in `tools/`.

## mole-conversions-scorm (zip v4, SCHEMA 2) and mole-conversions-molarity-scorm (zip v3, SCHEMA 2)

- **Key objective:** fluency with mole conversions by dimensional analysis (no story problems), in the style of the
  dimensional analysis mixed challenge (`to-merge/.../DimAnalysis-6-Mixed-Challenge/`, the teacher's): tap or drag an
  equality chip into the chain, left side on top, flip it, units strike through, Check, Hint, Show solution.
- **Two packages, one code base.** Every file in `src/js` (except `config.js`), `src/css` and `tools/` is identical in
  both, and each validator fails if they differ: make a fix in one and copy it to the other. `config.js` holds
  `molarity`, the save key and the minutes; the page title, manifest (`MOLECONV_*`, `MOLECONVM_*`), README, answer key
  and zip are per package.
- **Basic:** 7 steps: the mole map (tap the four roads), four ungraded one-road warm-ups, the graded set of 12 (3 one-,
  5 two-, 4 three-step), results. **Molarity:** 8 steps (a fifth road and warm-up, mol/L) and 14 graded (4, 5, 4 and one
  four-step), 4 of them with a molarity and 2 of those in mL. Mixed order, never starting with more than one step.
- **Teacher's choices:** the molar-mass chip has a blank (`___ g X = 1 mol X`), typed **to the tenths place**; the ratio
  chip has a blank too (`1 mol SBr2 = ___ mol Br`, the teacher's moles-to-moles step). The on-screen periodic table shows
  masses to tenths; also accepted: full masses rounded at the end (CCl4 153.8 as well as 154.0) and a two-decimal table's
  tenths (Fe 55.9, Cu 63.6, Ar 40.0); the answer is checked against the typed molar mass. **Avogadro's number is
  6.02 × 10²³** (the class's rounding; the validator bans 6.022). All equalities exact (sig figs from the given only),
  except a molarity, which is always given with the volume's sig figs. A problem counts if right before Show solution
  (which asks to confirm); hints and re-checks are free.
- **1.5% tolerance (the teacher's choice; `Chem.TOL`):** students use different periodic tables, so an answer with the right
  sig figs counts if a value within 1.5% of the right one (from the typed or the class molar masses) rounds to it, and a
  molar mass to tenths counts within 1.5% of the class's. A zero in the tenths place need not be typed (71 is 71.0; the
  teacher: no frustration over a zero); only a real second decimal is told to round. Named slips are caught first, even inside 1.5%. `tools/tables.js`
  plays five tables (two decimals H 1.01, full H 1.008/Cl 35.45, class with H 1.008, whole numbers with Cl 35.5 or 35)
  through the judges; the validator fails if any answer is refused (1% was tried and refused H 1.01 and Mg 24, Cl 35).
- **Words:** "the mole map", never "Mole Town" (the teacher shares it with peers); "L of gas" (22.4 L, STP) and "L of
  solution" (mol/L), never "L at STP"; molarity written mol/L, its chip printed from the prompt
  (`1 L KCl solution = 0.350 mol KCl`); mL as on the class sheet (350. mL), 1000 mL = 1 L. Every prompt names the
  substance and gives its formula ("9.340 g of sulfur dibromide, SBr2"), as on the class's practice sheets; the chain
  and chips use formulas. Names: prefixes, Roman numerals only for Fe and Cu, "sodium hydrogen carbonate", American
  spelling; the validator names every compound again. Particles: atoms or molecules; ionic compounds are never counted
  in particles, so "formula unit" never appears.
- **The mole map (`map.js`):** L of gas above moles of A (L of solution beside it in the molarity version, slanted
  roads), particles left, mass right, ratio down to moles of B (an element counted in A). 22.4 L only for gases at STP
  (boiling points in the validator); solutions only for the 25 substances marked `aq`, at no more than `maxM`, half the
  real solubility (held in the validator). Units carry their substance: mol SBr2 never cancels mol Br.
- **Worked solutions in LaTeX:** `Chem.texChain` and `Chem.texMM` write them; `tex.js` turns that LaTeX subset into
  MathML for the browser to typeset (no library, no fonts; `\cancel` is a CSS stroke because Chrome has no MathML
  strike). Shown after a right answer, after Show solution and on the results page; `ANSWER_KEY.md` has `$$ ... $$` blocks.
  The validator renders every solution and checks two cancelled units per step.
- **One model:** `chem.js` reads formulas, rounds standard atomic weights (strings, exact) to tenths, lists accepted molar
  masses and likely slips (subscripts, brackets, atomic numbers, an element left out, a miscount), cancels units and judges
  every blank and answer. `problems.js` builds the set and warm-ups from a seed (`Gen.set`, `Gen.warm`; plans in
  `PLANS`); the validator checks 400 seeds against a direct mole calculation and the teacher's Moles formative quiz.
- **Layout:** a long chain wraps onto a second row; below 1300 px the mole map goes under the work. Pools hold at most 8.
- **Files:** `config.js`, `elements.js`, `substances.js`, `chem.js`, `problems.js`, `tex.js`, `map.js`, `ptable.js` (docked
  table), `work.js` (one problem, `Work.solutionHTML`), `scorm.js` (save key from config), `app.js`.

## empirical-molecular-formula-scorm, hydrate-formula-scorm and combustion-analysis-scorm (zip v3, SCHEMA 2)

- **Key objective:** fluency with the teacher's four steps, on screen in the teacher's words in every problem: **Percents to grams**
  (assume 100 g), **Grams to moles**, **Divide by small**, **Multiply if not whole**. The teacher's named hurdle is reading a
  decimal as a fraction. Three packages, one code base: `config.js` `mode` is `empirical`, `hydrate` or `combustion`.
- **One code base.** Every file in `src/js` (except `config.js`), `src/css` and `tools/` is identical in the three, and each validator
  fails if they differ (copy a fix to all three). `config.js` holds the mode, save key and minutes; the page title and h1, manifest
  (`EMPMOLFORMULA_*`, `HYDRATEFORMULA_*`, `COMBUSTANALYSIS_*`), `build.sh`, README and answer key are per package.
- **Steps:** a worked example (`four`: Fe2O3 from percents, CuSO4.5H2O from crucible data, C3H8 from CO2 and H2O) filled one column
  at a time with Show step; ungraded warm-ups; Part 2 "Multiply if not whole" (Name the fraction, 3 cards from different
  rows of the finder; Whole or not?; Multiply them all, where the whole numbers fill in once the multiplier is right; then a warm-up;
  the separate fraction finder step was removed and Name the fraction cut from 10 cards to 3, both the teacher's choice); for empirical and combustion a molecular-formula part (n = molar mass ÷ empirical formula mass);
  the graded set (8, 6, 6) and results. Hydrate opens with `heat` (heat CuSO4.5H2O to constant mass, predict first), combustion
  with `burn` (propane's atoms go into 3 CO2 and 4 H2O: × 1 C per CO2, × 2 H per H2O).
- **The work table (`work.js`):** a row per element (hydrate: anhydrous salt and water; combustion: C from CO2 and H from H2O), a
  column per step, each with its own Check; a step opens when the one before is right. Step 1 asks "percents or grams?" first
  (percents or grams given: the column fills itself once the choice is right, the teacher's choice; hydrate masses: subtract). Step 2 is a **dimensional analysis setup** (the teacher wants DA
  stressed in every honors activity): g X × (1 mol X / ___ g X) = ___ mol X, the molar mass the blank on the bottom, typed to tenths;
  combustion adds × (___ mol C / 1 mol CO₂), the mole ratio the blank on top, and the answer is mol C directly (no mol CO₂ box).
  Cancelling units are struck through; the setup wraps between factors when a formula is long (`.da-piece`). Step 3 taps the
  smallest, then quotients to 2 decimals. Step 4 is one multiplier for every
  row; once it is right the whole numbers fill in (the teacher: typing them is tedious). Step 5: molecular formula (empirical formula mass, n, the subscripts) or the hydrate's Greek prefix.
- **Teacher's choices:** the first Check of every step counts (score = steps right first / all steps; one interaction per step).
  Not an answer (told, check again): empty boxes, the right number rounded too far (moles under 3 significant figures, quotients under
  2 decimals, 3.99 for 4). Within 0.1 of a whole number rounds; otherwise halves, thirds, fourths and fifths only (`Chem.FRACS`), and
  the multiplier is the smallest that makes all whole. Hints free; Show me after two misses in a step. Combustion includes the
  molecular formula (the teacher asked). Hydrate names: salt name + mono to deca + hydrate.
- **Fraction finder (`finder.js`):** a ruler of the decimal part with rows for halves to fifths and shaded "round" ends, plus a chart.
  Interactive in the drills and warm-ups (tap a quotient, the fraction lights up); a reference only in graded problems.
- **One model:** `compounds.js` holds real compounds only (65 formulas, 29 hydrates, 26 hydrocarbons); `problems.js` computes every
  percent, gram, crucible reading and CO2/H2O mass from standard atomic weights, and keeps a problem only when its quotients sit within
  0.07 of a whole number or nearer their fraction than halfway to the next (`Gen.clean`) with the class's, full and whole-number tables.
  `chem.js` judges every box against the student's own earlier boxes (1.5% `TOL` for molar masses and moles, `QTOL` for quotients) and
  names the slips. `tools/tables.js` works 120 sets with six periodic tables; the validator fails on any refusal. Worked solutions are
  LaTeX (`Gen.solution`) typeset by `tex.js` (added `\to`, `\cdot`, `\div`, `\%`).
- **Files:** `config.js`, `util.js`, `elements.js`, `compounds.js`, `chem.js`, `problems.js`, `tex.js`, `ptable.js`, `finder.js`, `work.js`,
  `drills.js`, `scenes.js`, `scorm.js`, `app.js`. Walkthrough harness as in the VSEPR and IMF packages (the fake LMS reads and writes
  sessionStorage on every call); each run picks random problems and prints its seed, `SEED=n` replays one.

## balancing-particles-scorm (zip v1, SCHEMA 1) and the reactions unit

- **The unit is four packages** in `chemistry/reactions/`; `PLAN.md` there holds the approved plan, the teacher's answers
  and the class handout (activity series, solubility table). Only package 1 is built. Next: `balancing-reaction-types-scorm/`
  (balance and classify each reaction together; six types; synthesis is one product, decomposition one reactant;
  nitroglycerin must be in it), `predicting-products-scorm/`, `net-ionic-equations-scorm/`.
- **Key objective:** every atom in the reactants box is in the products box (the law of conservation of mass); a
  coefficient changes how many particles, a subscript is never changed; lowest whole numbers.
- 11 steps in 6 parts; 16 graded items: 6 choice questions (Submit answer) and 10 equations (3 easy, 4 medium, 3 hard
  from a pool of 48). Score = items right the first time / 16.
- **Teacher's choices:** no masses on screen (atoms only). In graded equations the atom tally is hidden until the first
  Check, which is the one that counts; an empty box is not counted; doubled coefficients are told to reduce and count
  as a miss; Show me after three misses.
- **One model:** `chem.js` balances every equation by solving it (the validator balances each again by brute force);
  no coefficient is typed anywhere. `reactions.js`: formula, name and particle tree (`O(H)(H)`) per substance, and
  reactions tagged with a type for package 2 (`''` where the six types do not fit) and `big` (butane, nitroglycerin:
  kept out of this package's graded set).
- **Particles (`particles.js`):** lettered circles coloured by element, sized from covalent radii (squeezed so H holds
  its letter), laid out from the tree and settled; `Particles.pair` draws the two boxes at one scale. To be reused by
  packages 2 and 3; package 4's ions need true ionic radii instead.
- **Written to be shared with package 2:** `config.js` (`classify`, save key, minutes) is the only file meant to differ;
  when package 2 exists, make each validator fail if the shared files differ, as in the mole conversion packages.
- **Files:** `config.js`, `util.js`, `chem.js`, `reactions.js`, `particles.js`, `problems.js` (`Gen.set`, `Gen.quiz`),
  `bench.js` (workbench, `Bench.picture`), `steps.js` (lesson steps, choice questions), `scorm.js`, `app.js`;
  `tools/load.js` loads them for the validator and answer key. Teacher links: `?step=<id or number>`,
  `?step=set&seed=<n>&problem=<1 to 10>`.

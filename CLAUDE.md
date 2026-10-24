# Chemistry SCORM activities

SCORM 1.2 packages posted to Schoology for two high-school courses: **honors chemistry** and an **organic
chemistry elective** (textbook: Klein, *Organic Chemistry*). Each package is a self-contained folder; fixes to
shared code (saving, scoring, picker, 3D viewer, Lewis builder) usually belong in every folder that has a copy.
Everything is on `main`; older work branches were merged in October 2026.

**Honors chemistry**

| Folder | Activity |
| --- | --- |
| `ionization-energy-scorm/` | Successive ionization energies, the two-step rule (about 10 min) |
| `ionic-naming-scorm/` | Naming ionic compounds and writing formulas |
| `ionic-covalent-scorm/` | Ionic or covalent? Choosing the naming rules |
| `acids-scorm/` | Binary acids and oxyacids, mixed with ionic and covalent |
| `lewis-structures-scorm/` | Lewis structures by the teacher's 5 rules (builder, B/Be exceptions, expanded octets, AI-answer warnings in `snark.js`) |
| `resonance-scorm/` | Resonance structures and the hybrid, same 5 rules and builder |
| `lewis-drawing-tool/` | Teacher's drawing tool, same 5-rule engine, reports no score |
| `acetone-kinetics-scorm/` | Virtual lab: iodination of acetone by initial rates |
| `vsepr-polarity-scorm/` | VSEPR: build by the 5 rules beside a 3D window, molecular geometry for 2 to 6 domains, polarity by radial symmetry |
| `intermolecular-forces-scorm/` | IMFs: heating stage with real mp/bp, LDF and polarizability, dipole-dipole, hydrogen bonds (follows VSEPR) |

**Organic chemistry elective (Klein)**

| Folder | Activity |
| --- | --- |
| `ir-spectroscopy-scorm/` | IR diagnostic-region drag and drop |
| `ms-spectrometry-scorm/` | Mass spectrometry: reading the fragments |
| `ir-ms-combined-scorm/` | IR and mass spec together: two spectra, one compound |
| `nmr-intro-scorm/` | Intro 1H NMR: equivalence, shift, integration, splitting |
| `newman-projections-scorm/` | Newman projections, with calculations |
| `newman-projections-qualitative-scorm/` | Same, qualitative (no calculations) |
| `cyclohexane-chairs-scorm/` | Chairs, ring flips, 1,3-diaxial crowding (qualitative) |
| `chirality-scorm/` | Chirality, R and S, enantiomers, diastereomers and meso compounds (qualitative) |

**Older packages predate some house rules.** Everything except Newman, chairs and chirality contains em
dashes (the Lewis, resonance and drawing-tool validators allow them). The mass spec, IR + mass spec, NMR,
naming, acids and ionization energy packages still load a browser save inside an LMS when
`cmi.suspend_data` is empty (fixed in IR, Newman, chairs, chirality, Lewis and resonance). Only Newman,
chairs and chirality have `tools/layout.js`. Bring a package up to the rules when you next change it.

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
- Offline only: no CDN, web fonts or WebGL. Keyboard, touch and drag for every action; dark mode; reduced motion.
- Answers are computed from the model, never typed twice, and the validator checks them.
- Built zips are committed in `dist/`. Branch for new work; don't open a PR unless asked.

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

## cyclohexane-chairs-scorm (branch `cyclohexane-chairs`, zip v2, SCHEMA 2)

- **Key objective:** steric strain from axial groups (1,3-diaxial interactions); equatorial avoids it.
- 19 steps in 4 parts; 18 graded questions (4+4+5+5) from a pool of 51. The A-value table is open beside checkpoints 3–4.
- **A-values (kJ/mol):** Cl 2.0, Br 2.0, CH₃ 7.6 (Klein: 2 × 3.8), CH(CH₃)₂ 9.2, C(CH₃)₃ 22.8. They match the Newman strain table.
  CH₃/CH₃ syn-diaxial 15.4 is starred as not in Klein.
- **Scope:** cis/trans vocabulary; only 1,4 and 1,3 disubstituted rings (no 1,2). The boat gets one short step.
  The twist-boat is named once and never graded.
- **Geometry:** one 3D chair model (`chair.js`) drives everything.
  - Chair drawings are projections of it. Chair 2 is drawn as the mirror template, with C1 at the right and up staying up.
  - Klein-style Newman projections of the chair (`Draw.klein`) look down C1–C2 and C5–C4 at once.
    Chair 2 is drawn from the same direction as chair 1, not turned over as in Klein Fig. 4.29.
  - A flip turns the bonds on C1/C5 by ±60° and on C2/C4 the other way.
- **Files:**
  - `chair.js`: geometry, flip, crowding, cameras
  - `molecules.js`: flat-ring molecules
  - `avalues.js`: A-values and energies
  - `draw.js`: chair, flat, Newman, Klein, energy plot
  - `viewer3d.js`: 3D viewer
  - `app.js`: `STEPS`, `PREDICT`, renderers
  - `quiz.js`: question bank

## chirality-scorm (branch `claude/hopeful-feynman-fuhl6t`, zip v1, SCHEMA 1)

- **Key objective:** name a chirality centre R or S by rotating the molecule until 4 is on the dash, never by swapping
  groups; then tell enantiomers, diastereomers and meso compounds apart.
- 17 steps in 4 parts; 16 graded questions (4+4+4+4) from a pool of 48. The atomic-number table is open beside checkpoints 2–4.
- **Teacher's wording:** the rule on screen is "If 4 is not on the dash, rotate the molecule." R is "rockwise" and S
  "sountersockwise" (the teacher's joke, credited to them) in exactly three places: the steering-wheel step, Big ideas and
  Vocabulary, never in `quiz.js`. Swap, switch, interchange and reverse never appear in student text. The validator checks all of it.
- **Scope:** no calculations, no optical activity, no Fischer projections (the validator uses Fischer only for its textbook
  anchors). The mirror image is drawn both beside the molecule and behind the page. Rings: cis/trans 1,3- and
  1,4-dimethylcyclohexane from the chairs activity. Molecules A and B (2,3-dibromobutane) come from the Newman activity.
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

## vsepr-polarity-scorm (branch `vsepr-polarity`, zip v2, SCHEMA 2)

- **Key objective:** domains spread apart, so the Lewis structure (flat) is not the shape; lone pairs repel more
  strongly than shared pairs; polarity by radial symmetry.
- 14 steps in 3 parts; 16 graded questions (4+6+6) from a pool of 51. The electronegativity table is open beside checkpoint 3.
- **Polarity is radial symmetry, never the shape name.** Every polarity step asks "Is X radially symmetric?" before
  "polar or nonpolar?"; explanations and all of checkpoint 3 are worded in symmetry (`Vsepr.symmetry`). "Lopsided" is
  banned. Molecule orders are shuffled per student (CO₂ stays first where it is predicted).
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

## intermolecular-forces-scorm (branch `intermolecular-forces`, zip v3, SCHEMA 3)

- **Key objective:** IMFs are between molecules; stronger IMFs, higher mp/bp; with similar electron counts LDF <
  dipole-dipole < hydrogen bonding.
- 22 steps in 5 parts; 18 graded questions (4+4+5+5) from a pool of 58. The atomic-number table is beside every
  checkpoint, the electronegativity table beside checkpoint 3.
- **The habit: name the IMFs, then predict.** Every comparison step opens with a card per substance (Lewis structure,
  electrons, toggles for all three forces from the first card, so students rule forces out too);
  the prediction, ranking or counting opens only when all are right. One IMF-naming question is core in each checkpoint;
  every question naming a molecule draws it (`figs`). The validator checks both.
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
- **Files:** `data.js`, `chem.js` (model), `mol2d.js` (Lewis SVG scenes, H-bond lines), `heat.js`, `cloud.js`
  (polarizability), `quiz.js`, `app.js`.
- **Walkthrough harness (both new packages):** the fake LMS reads and writes sessionStorage on every call and never stages
  the next load's data; staging made the reload check fail at random (still the case in the older packages' walkthroughs).

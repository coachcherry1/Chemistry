# Chemistry SCORM activities

SCORM 1.2 packages posted to Schoology for three high-school courses: **chemistry** (honors), **AP chemistry**
and an **organic chemistry elective** (textbook: Klein, *Organic Chemistry*). Each package is a self-contained
folder; fixes to shared code (saving, scoring, picker, 3D viewer, Lewis builder) usually belong in every folder
that has a copy. Everything is on `main`; older work branches were merged in October 2026.

**Folder layout:** `class/topic/package/`, for example `chemistry/bonding/lewis-structures-scorm/`. The classes are
`chemistry/`, `ap-chemistry/` and `organic-chemistry/`. Packages elsewhere in this file are named by their folder
alone; find one with `find . -name <folder> -type d`. All commands run inside the package folder, wherever it sits.
A new package goes in the topic folder that fits it (make the folder if none does), one level below the class.

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

**AP chemistry**

| Folder | Activity |
| --- | --- |
| `ap-chemistry/bonding/resonance-scorm/` | Resonance structures and the hybrid, same 5 rules and builder |
| `ap-chemistry/kinetics/acetone-kinetics-scorm/` | Virtual lab: iodination of acetone by initial rates |

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
| `organic-chemistry/reactivity-mechanisms/arrow-pushing-scorm/` | Klein 6, before SN1/SN2: bond breaking and making, ΔG, energy diagrams, nucleophiles and electrophiles, drawing curved arrows, the four patterns (about 45 min) |
| `organic-chemistry/substitution-elimination/substitution-elimination-scorm/` | SN1, SN2, E1 and E2: reagent function, mechanisms with curved arrows, regio- and stereochemistry, rings, predicting products (about 50 min) |

**Older packages predate some house rules.** Everything except Newman, chairs, chirality (both versions) and arrow pushing contains em
dashes (the Lewis, resonance and drawing-tool validators allow them). The mass spec, IR + mass spec, NMR,
naming, acids and ionization energy packages still load a browser save inside an LMS when
`cmi.suspend_data` is empty (fixed in IR, Newman, chairs, chirality, Lewis and resonance). Only Newman,
chairs, chirality, SN1/SN2 and arrow pushing have `tools/layout.js`. Bring a package up to the rules when you next change it.

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
- **Files:**
  - `chair.js`: geometry, flip, crowding, cameras
  - `molecules.js`: flat-ring molecules
  - `avalues.js`: A-values and energies
  - `draw.js`: chair, flat, Newman, Klein, energy plot
  - `viewer3d.js`: 3D viewer
  - `app.js`: `STEPS`, `PREDICT`, renderers
  - `quiz.js`: question bank

## chirality-scorm (branch `claude/hopeful-feynman-fuhl6t`, zip v1, SCHEMA 2)

- **Key objective:** name a chirality centre R or S by rotating the molecule until 4 is on the dash, never by swapping
  groups; then tell enantiomers, diastereomers and meso compounds apart.
- 18 steps in 4 parts; 16 graded questions (4+4+4+4) from a pool of 51. The atomic-number table is open beside checkpoints 2–4.
- **Teacher's wording:** the rule on screen is "If 4 is not on the dash, rotate the molecule." R is "rockwise" and S
  "sountersockwise" (the teacher's joke, credited to them) in exactly three places: the steering-wheel step, Big ideas and
  Vocabulary, never in `quiz.js`. Swap, switch, interchange and reverse never appear in student text. The validator checks all of it.
- **Scope:** no calculations, no optical activity, no Fischer projections (the validator uses Fischer only for its textbook
  anchors). The mirror image is drawn both beside the molecule and behind the page. Rings: cis/trans 1,3- and
  1,4-dimethylcyclohexane from the chairs activity. Molecules A and B (2,3-dibromobutane) come from the Newman activity.
- **Meso is recognised by an internal mirror plane**, taught in the `mesotut` step before Molecules A and B: two centres
  give at most 2ⁿ; cut between the centres and the halves must match (`STEREO.halves`); turn to eclipsed and every group
  must face its twin (`STEREO.facing`). R,S only confirms it. Not by laying the molecule on its mirror image (a guided
  version of that was tried and reverted). The three checks are `MESO_CHECKS` in `app.js`, also in Vocabulary.
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

## chirality-no-meso-scorm (zip v1, SCHEMA 2)

- A copy of `chirality-scorm/` for weaker years: Parts 1–3 identical; Part 4 keeps the four stereoisomers and Rings
  (trans-1,3, cis- and trans-1,4 only: chiral or no chirality centres). No meso tutorial, no Molecules A and B, no cis-1,3.
- 16 steps; 16 graded questions (4+4+4+4) from a pool of 46. Checkpoint 4 is enantiomers, diastereomers, counting and rings.
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

## intermolecular-forces-scorm (branch `intermolecular-forces`, zip v4, SCHEMA 3)

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
- **Files:** `data.js`, `chem.js` (model), `mol2d.js` (Lewis SVG scenes, H-bond lines), `heat.js`, `cloud.js`
  (polarizability), `quiz.js`, `app.js`.
- **Walkthrough harness (both new packages):** the fake LMS reads and writes sessionStorage on every call and never stages
  the next load's data; staging made the reload check fail at random (still the case in the older packages' walkthroughs).

## substitution-elimination-scorm (branch `claude/compassionate-allen-hwn3ov`, zip v1, SCHEMA 1)

- **Key objective:** Klein's three steps (7.11): the function of the reagent, the substrate and Klein's table, then
  regio- and stereochemistry; major and minor products.
- 26 steps in 5 parts; 23 graded questions (4+5+5+4+5) from a pool of 73. Every checkpoint's core has a
  reagent-function question. No reference table beside the checkpoints (the teacher's choice).
- **Klein's wording:** SN2 is nucleophilic attack and loss of the leaving group, concerted, back-side attack,
  inversion of configuration; E2 is proton transfer and loss of the leaving group, anti-coplanar (never
  antiperiplanar); the four arrow patterns by Klein's names. The validator bans backside, Saytzeff and Walden.
- **Teacher's choices:** four functions named "Nucleophile only", "Strong nucleophile and strong base", "Base only",
  "Weak nucleophile, weak base" with Klein's headings beside; t-BuOK is strong/strong but hindered (E2 major at 1°,
  Hofmann). NaCN and NaN₃ nucleophile only, NaH base only. Regiospecific = only one β H can be anti-coplanar.
  SN2 stereospecific, SN1 not. E/Z for every stereogenic alkene, names as (E)-pent-2-ene; Klein's ring names
  (1-methylcyclohexene). Carbocation rearrangements in, on 2° substrates in ethanol (the step explains Klein's ✗).
  Left out: solvents, leaving-group ranking, rate-law equations, graded arrow drawing, A-values on screen.
- **One model:** molecules are SMILES (or the chairs' flat-ring spec) in `molecules.js`, each with its textbook name
  for the validator; names (`name.js`), drawings (`layout.js`), products (`react.js`), 3D (`build3d.js`) and
  mechanisms (`mech.js`) are all computed. E2 stereochemistry is checked twice (parity math and a 3D anti
  conformer). Ring E2 uses faces: an H is trans-diaxial if it is on the face opposite the leaving group.
- **Arrows:** tap the electrons (lone pair or bond), then the target (atom, or bond for a new π bond), or drag, or
  Tab/Enter; Klein's reasons for wrong arrows in `mech.js`; Show me after three misses.
- **Files:** `mol.js`, `name.js`, `layout.js`, `draw.js`, `react.js`, `build3d.js`, `viewer3d.js`, `anim.js`, `mech.js`,
  `arrows.js`, `chair.js` (from the chairs activity), `molecules.js`, `quiz.js`, `app.js`, `steps1.js` (Parts 1-2),
  `steps2.js` (Parts 3-4), `steps3.js` (Part 5).

## intermolecular-forces-liquids-scorm (zip v1, SCHEMA 1)

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

## arrow-pushing-scorm (branch `claude/charming-gauss-ear0ac`, zip v1, SCHEMA 2)

- **Key objective:** recognise and draw Klein's four patterns (6.8): nucleophilic attack, loss of a leaving group,
  proton transfer, carbocation rearrangement; vocabulary adoption. Comes before `substitution-elimination-scorm/`.
- 24 steps in 4 parts; 18 graded questions (4+4+5+5) from a pool of 57. Energy words beside checkpoint 1, Klein Table
  6.3 (and the four patterns) beside 2 to 4. Every checkpoint's core has a vocabulary question; checkpoints 3 and 4
  each have a **graded arrow drawing** (first Check counts; Check with nothing drawn is not an answer) and a
  pattern or sequence question (pick groups in `quiz.js`).
- **Teacher's wording:** AP Chemistry trained. Never "spontaneous": ΔG < 0 is thermodynamically favorable, ΔG > 0 not
  thermodynamically favorable; ΔG kept; exergonic and endergonic used. No ΔH calculated, but "bond breaking is
  endothermic, bond making is exothermic" everywhere (energy ledger beside every animation). Kinetics left out except
  Eₐ as a hill and peaks/valleys: no rate equations, orders, rate constants, catalysts, Hammond. No reversible or
  irreversible arrows (Klein 6.12 was removed at the teacher's request). The validator bans those words and ⇌ in `src/`. Table 6.1 values only as bar heights, never added up.
- **One model:** `chem.js` states (atoms with hidden H and lone pairs, bonds; charges computed) and `apply()` moving one
  pair per arrow with Klein's rules (6.10); `classify()` names a step from the bonds that change. `scenes.js` writes each
  step once (Klein's drawing, coordinates, arrows); the product is what the arrows make, checked against SMILES and
  Klein's pattern by the validator. Chains (`f623`, `f631`, `ester`) start each step where the last ended. Every drawn
  bond, before and after each step, must be 0.7 to 1.35 bond lengths (a ring an arrow closes is redrawn as a ring).
  Klein's Figure 6.31 is drawn inside the `sequence` step so students never need the textbook; animations always start
  from the arrows and play by themselves after a right answer.
- **Arrows:** the SN1/SN2 tap, drag or Tab/Enter tool, judged by `judge.js` by what each arrow does with its pair (order and
  equivalent heads don't matter); Klein's reasons computed from the model; wrong-but-legal arrows show what they make;
  Show me after three misses. A right drawing plays (`Render.Player`: electrons ride the arrows, bonds fade or grow,
  atoms glide), fills the energy ledger, then a word-tile sentence (`SAY` in `steps2.js`).
- **Files:** `chem.js`, `scenes.js`, `judge.js`, `render.js`, `arrows.js`, `energy.js`, `picker.js`, `quiz.js`, `scorm.js`,
  `app.js`, `steps1.js` (Parts 1-2), `steps2.js` (Parts 3-4).

## properties-of-liquids-scorm (zip v2, SCHEMA 2)

- Part 6 of `intermolecular-forces-liquids-scorm/` on its own: the same 4 `props` steps, `bench.js` and checkpoint E
  (8 from 19, core 3), with parts 1 to 5, the heating stage, clouds, picker and explore mode removed. Its own SCORM ids
  (`POL_*`), save key (`properties-of-liquids-state`) and zip. `SUBSTANCES` holds only the eight liquids.
  A fix to part 6 in either package usually belongs in the other.


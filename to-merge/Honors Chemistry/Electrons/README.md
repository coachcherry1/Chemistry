# Electrons — Simulation Index

**Course:** Honors Chemistry
**Schoology unit:** Electrons
**Last updated:** 2026-09-09

Each simulation folder holds `<name>/index.html` (or `<name>.html`) + `imsmanifest.xml`,
with a ready-to-upload `<name>-scorm.zip` beside it. All are SCORM 1.2, completion-graded,
no student-name gate.

## Simulations

### `bohr-models-valence-electrons` — Bohr Models & Valence Electrons
Complete Bohr shell diagrams for main-group atoms and identify the number of valence
(outer-shell) electrons. Originally issued a certificate; SCORM copy is completion-only + resume.
**Completion:** work through the element set correctly.

### `coulombs-law-attraction` — Coulomb's Law & Attraction
Bridges electron configuration into periodic trends. A single-column, gated progression
(~10-15 min): identify proton/electron symbols, then an interactive **distance lab**
(drag a slider to move an electron toward/away from a proton and watch a dashed,
double-headed arrow's thickness respond), then Bohr models of Li/Na/K (down a group,
inner-shell electrons paired at 90-degree cardinal positions, no force arrows) with four
dropdown questions (which valence electron is farthest/closest, feels the
strongest/weakest pull), then an interactive **charge lab** (add/remove protons at a
fixed distance, watch the force line thicken), then Bohr models of Na/Al/Cl (across a
period, **with** a black force arrow drawn from the reference valence electron straight
to the nucleus) with a gated pair of questions, three
quick mixed practice comparisons (Mg/Ca, Na/Cl, F/Cl), and finally two synthesis
questions where the student states both rules themselves before a summary panel reveals
and explicitly bridges into the next topic (periodic trends). Every question must be
answered correctly to advance — unlimited retries, feedback only (never reveals the
correct choice). No scoring; fall/warm palette, no emojis.
**SCORM:** completion-only (no score badge). Full SCORM 1.2 — Save progress, resume
(picks back up at the same gated step), session time.
**Completion:** reach and click "Finish" on the closing summary.

### `electron-cloud-builder` — Electron Cloud Builder
Quantum-model orbital-shape explorer (no quantum numbers). The student fills a generic
atom one subshell at a time (1s, 2s, 2p, 3s, 3p; each add is locked until the previous
subshell has been photographed), watches an orbital filling diagram fill in (drawn
bottom-up by energy: 1s at the bottom, 3p at the top), then clicks "Take 250,000 snapshots"
to build that subshell's electron cloud on a black 3D viewport by Monte-Carlo sampling
real hydrogenic distributions. The build plays out over about 6 seconds; each subshell has
its own color. Points are stored in flat typed arrays and drawn straight into a pixel
buffer with additive blending and a tone curve, so 250k points per subshell (1.25M across
the whole atom) stay smooth; a per-frame point budget (300k, the same whether or not you're
dragging) only thins the picture once several full clouds are visible at once. A filled **p subshell is drawn as its three orbitals** (p_x, p_y, p_z,
dumbbell along each axis); the viewport has pronounced labelled **x / y / z axes** (z is
vertical) and **click-drag orbits the camera** around the atom, scroll (or Zoom +/-) zooms,
double-click / Reset view recentres. Show/hide is one toggle button per cloud that has
been photographed — 1s, 2s, 2p_x, 2p_y, 2p_z, 3s, 3p_x, 3p_y, 3p_z — all on by default,
so the student can isolate, say, 1s+2s+3s to watch the sphere grow, or a single p_z to see
one dumbbell. A right-hand info card updates as electrons are added ("the plot shows where
we are likely to find the 2p electrons you just added…") and keeps the core ideas on
screen: each dot is one possible spot, not a path; where an electron is found depends on
its energy; higher energy means higher shell, farther out. A "Curious? How were these dots
decided?" link opens a short modal for curious students: start with the Schrödinger equation
`Ĥψ = Eψ` → plug in one electron near a nucleus and solve for ψ (each answer is one orbital)
→ ψ² is the probability map → the program scatters points by that map to build the 3D shape. Pure visualizer — no questions. Three-column layout, sized to fit a
Chromebook screen without scrolling.
**SCORM:** completion-only (no scoring, no score badge). Full SCORM 1.2 wrapper — Save
progress, resume (skips the intro and rebuilds the sampled clouds), session time, unload
checkpoints.
**Completion:** marked `completed` once all five subshells have been photographed.

### `electron-configuration-practice` — Electron Configuration Practice
**Mode 1** config to element (click it on a labeled periodic table), then **Mode 2**
element to full electron configuration. Mode 2 stays locked until Mode 1 is finished.
Mode 2 always includes at least one transition metal. Fall/warm palette, no emojis.
**Scoring:** starts at 100%, minus 3% per wrong answer, floor 60%; small badge in the
header, reported to Schoology. Full SCORM: score, completion, session time, Save
Progress button, and suspend/resume.
**Completion:** 10 correct in Mode 1 + 5 correct in Mode 2.

### `ion-formation-practice` — Ion Formation Practice
Given a main-group element, decide whether it gains or loses electrons and what charge
its ion carries, reasoning from valence-electron count / octet rule.
**Completion:** 10 correct (2 attempts per problem, walkthrough after a 2nd miss).

### `ion-charge-compound-ratio-practice` — Ion Charge & Compound Ratio Practice
Each problem highlights one cation-group element (groups 1, 2, 13) and one anion-group
element (groups 15, 16, 17). Student sets each ion's charge, then the whole-number
cation:anion ratio for a neutral compound, with a live formula preview (e.g. Ga₂Se₃).
**Completion:** 10 correct (2 attempts per problem, walkthrough after a 2nd miss).

### `valence-electrons-and-reactivity` — Valence Electrons, Lewis Symbols & Reactivity
Three gated steps per element: (1) choose the number of valence electrons from its group,
(2) build the Lewis dot symbol (one dot per side before pairing — no dot counter, students
work out the number themselves), (3) pick the element it reacts most like — the driving
point being that same-column elements share valence count and therefore reactivity.
Wrong answers just say "try again" with no hint. Fall/warm palette; each step is hidden
until the previous is correct and the new step auto-scrolls into view.
**Scoring:** starts at 100%, −3% per wrong answer (any step), floor 60%; shown as a small
badge in the header and reported to Schoology. Full SCORM: score, completion, session time,
and Save progress / resume.
**Completion:** 10 elements, no repeats, every main group (1, 2, 14, 15, 16, 17, 18) represented.

### `periodic-trends-comparison` — Periodic Trends Comparison
Compare two highlighted elements for **atomic radius** or **ionization energy**: click the
right element, then finish a sentence explaining the trend with cascading dropdowns
(factor, comparison, effect). Adapted from an old certificate sim: name gate and PDF
certificate removed, fall/warm palette, no emojis/em dashes, questions moved to the right
of the periodic table.
A click-through **intro walkthrough** (11 slides, one beat per click, chat pop-outs)
comes first: what atomic radius and ionization energy are (animated Bohr diagrams with
measuring line / electron-escape), periods vs groups, then the period/group trend
reasoning, with 5 gated concept checks. Ionization-energy problems in the set show a hint
to reason from atomic radius.
**Scoring:** starts at 100%, −3% per wrong submission, floor 60%; badge in the header,
reported to Schoology. Full SCORM: score, completion, session time, Save progress, resume
(resume skips the intro).
**Completion:** 10 problems fully correct (right element + every dropdown).

---
*Related content also lives in **Bonding** (compound builders) and **Atomic Structure and History**
(periodic table drills).*

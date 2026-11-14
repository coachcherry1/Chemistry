# Net ionic equations (honors chemistry)

SCORM 1.2 package for Schoology, about 45 minutes. Package 4 of the reactions unit (see `../PLAN.md`); students should have
done the two balancing packages and predicting products first.

**Web version:** https://coachcherry1.github.io/Chemistry/chemistry/reactions/net-ionic-equations-scorm/src/index.html
(works once this branch is merged into `main`)

**Upload to Schoology:** `dist/net-ionic-equations-v1.zip`

## What students do

Two solutions are poured together in a beaker drawn **to scale**: every ion at its real size (Shannon ionic radii; in a
polyatomic ion each oxygen at 140 pm around the centre atom, at the real bond length), a 200 pm scale bar on every
picture. The ions drift and bounce the whole time. The ones that react find each other, come together in the solid's
ratio and sink, stacking on the bottom; H⁺ joins OH⁻ as a water molecule, HOH, which keeps moving. The **spectators keep
moving the whole time**. With no reaction, everything just keeps moving. The solvent's own water molecules are not
drawn. Tap any ion to name it; **Highlight spectators** rings them; Pour again, and a speed slider. With reduced motion,
Before and After stills.

Then students write it the chemist's way, in five steps that every problem has:

| Step | What the student does |
| --- | --- |
| 1 Balance | The balancing packages' workbench, inventory down the centre (water as HOH: an H and an OH) |
| 2 States | (aq), (s) or (l) for each product, from the solubility rules beside them |
| 3 Complete ionic | For each substance: splits into ions or stays together; how many of each ion (the coefficient counts) and its charge |
| 4 Spectators | Tap the ions that are in the solution, unchanged, on both sides; each is struck out on both sides at once (or: there are none) |
| 5 Net ionic | Build what is left from the terms, with coefficients and states, in lowest whole numbers; or choose No reaction |

**Every problem gives the unbalanced molecular equation** (the teacher's choice) and shows the same five steps, so the
strip never gives away a "no reaction" problem. **Every finished problem plays in the beaker**, in the graded set too.
**No lesson reaction comes back in the graded set.**

| Part | Steps | Graded |
| --- | --- | --- |
| 1 Dissolved ions | What (aq) looks like: three picture cards (words to picture); writing a substance as its ions: eight cards with the picture beside them (picture to words), the first a worked example, the picture only after the answer for the last four | no |
| 2 A solid forms | Predict, then pour AgNO₃ into NaCl; Pb(NO₃)₂ + KI worked through the five steps, with hints | no |
| 3 Water forms | Predict, then pour HCl into NaOH; H₂SO₄ + KOH (reduced to H⁺ + OH⁻ → HOH) | no |
| 4 No reaction | Predict, then pour KCl into NaNO₃; CuSO₄ + NaNO₃ (everything cancels) | no |
| 5 Graded | 4 questions (select, then Submit answer), then 8 problems | yes |
| 6 Results | Score by step, every problem with its net ionic equation, a new attempt | |

The reference beside every step: the class **solubility rules** (the same data as package 3 and the printed sheet in
`../reference-sheet/`) and the list of **strong acids and bases** (names and formulas only; how each splits is the
student's job).

## Scope (the teacher's)

- Reactants are strong electrolytes only: soluble salts, the strong acids HCl, HBr, HI, HNO₃, H₂SO₄ (split as 2 H⁺ + SO₄²⁻)
  and the strong bases LiOH, NaOH, KOH, Ba(OH)₂.
- Products are a solid, water, or nothing. **No weak acids or bases and no gases**: an acid never meets a carbonate or a
  phosphate; ammonium, acetate and sulfide are not used. The validator fails on any weak acid.
- Water is written **HOH** everywhere (a hydrogen and a hydroxide); H⁺ is written H⁺.
- Solubility is the class table, two answers only (what a novice chemist would observe): no "slightly soluble".
- **Ba(OH)₂ + H₂SO₄**, a solid and water at once with no spectators, is the last graded problem every time.

## Grading

- 44 graded items: 4 questions and 8 problems × 5 steps. Every set has 3 problems that make a solid (three different kinds
  of solid), 2 that make water (one of them must be reduced to lowest terms), 2 with no reaction (never the first), and
  the challenge last. Score = items right the first time / 44.
- A Check with something left unchosen is not counted. After a miss the student keeps going until the step is right (Show
  me after three misses). Feedback names the slip: the coefficient left out, a wrong charge, a solid or water split into
  ions, a non-spectator struck out, a spectator kept, not lowest terms, the wrong state.
- Retakes give new questions and problems; the gradebook keeps the best score. Progress is saved in `cmi.suspend_data`.

## Teacher links

- `src/index.html?step=<id or number>` opens a step (preview: nothing is saved or sent).
- `?step=set&seed=<n>&problem=<1 to 8>&rung=<1 to 5>` opens a graded problem at a step; `&done` opens it finished, with the beaker.
- `?step=quiz&seed=<n>` opens the questions of a seed.

## Files

`src/js`: `config.js`, `util.js`, `chem.js`, `bench.js`, `scorm.js` (the balancing packages' files, unchanged), `ions.js`,
`particles.js` (package 3's, unchanged: one set of solubility rules for the unit), `data.js` (the radii and their sources),
`net.js` (the model: products, states, complete and net ionic equations, the beaker's counts), `problems.js` (lesson
reactions, pools, sets, questions), `ref.js`, `beaker.js`, `ladder.js` (the five steps), `steps.js` (the lesson steps and the
questions), `app.js`.

## Before every commit

```bash
node tools/validate.js                    # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh                                # zip into dist/
node tools/walkthrough.js                 # Playwright, fake LMS; SHOTS=dir DARK=1 MOTION=1 optional
node tools/layout.js                      # Playwright: fits a Chromebook (1366x650, 1366x520 LMS frame)
```

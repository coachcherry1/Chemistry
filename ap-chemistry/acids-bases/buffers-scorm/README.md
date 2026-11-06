# Buffer Solution Visualization

A SCORM 1.2 activity for Schoology, for AP Chemistry (Unit 8, acids and bases). It **introduces what a buffer is**: a weak acid
with its conjugate base, or a weak base with its conjugate acid, with appreciable amounts of both. Students watch **particle
diagrams** while a strong acid (HCl) or a strong base (NaOH) is added to a buffer, see which particle reacts, and see why the pH
barely moves. The **Henderson-Hasselbalch equation** is introduced in Part 4, always beside a warning that it is only for a
buffer with appreciable amounts of both members. How to *make* a buffer is not the focus. About 40 minutes. This is a **first
draft**: same look, controls, saving and grading as the other activities in this repository, to be flushed out with the teacher.

**The key objective:** a buffer has a particle ready for added acid (the base member) AND a particle ready for added base (the
acid member). Added H⁺ or OH⁻ is used up in a reaction, so almost none stays free, and the ratio of base member to acid member
changes only a little, so the pH changes only a little.

---

## What students do

| Part | Steps | What happens |
| --- | --- | --- |
| 1 The idea | 3 + checkpoint | **Why does the pH barely move?** Predict which of two flasks (pure water, a buffer) changes more when 4 particles of HCl are added, then add it: pH 7.00 to 1.40 against 4.74 to 4.38. **What is inside a buffer?** Switch between acetic acid / acetate and ammonium / ammonia: the acid member and the base member differ by one H⁺. **Buffer or not?** Sort eight mixtures (CH₃COOH + CH₃COONa and NH₃ + NH₄Cl are buffers; HCl + NaCl, CH₃COOH + NaCl, NaOH + NaCl and NH₃ + NaOH are not), each wrong card explained. **Checkpoint 1** (4 questions). |
| 2 Adding acid | 2 + checkpoint | **Five points** of HCl added to the buffer (0, 2, 4, 6, 8 particles): predict what is in the flask, then watch the particles that change form flash, with the reaction H⁺ + Ac⁻ → HAc, the pH of the buffer and of pure water given the same HCl, and the curve. **Click the particle that takes the H⁺** (each wrong click explained). **Checkpoint 2** (4). |
| 3 Adding base | 3 + checkpoint | The same five points with NaOH (OH⁻ + HAc → Ac⁻ + H₂O), **which particle takes the OH⁻**, then **the whole range**: a slider from 12 NaOH to 12 HCl with three curves (buffer, pure water, acetic acid alone), so students see the flat middle and the cliffs where one member runs out. **Checkpoint 3** (4). |
| 4 The equation | 3 + checkpoint | **The ratio sets the pH:** a slider changes how many Ac⁻ and HAc there are (22 in all) and shows pH = pKa + log(Ac⁻ / HAc); equal amounts give pH = pKa, a ratio of 10 gives pKa + 1. **Does the equation work here?** Six flasks, each one "works" or "does not work": three buffers, then HAc alone, Ac⁻ alone and HCl in water. **Use it:** 4 HCl, then 3 NaOH, added to the 10 / 10 buffer: reaction first (before, change, after), equation second. **Checkpoint 4** (4). |
| 5 Base buffers | 1 + checkpoint | **NH₃ and NH₄⁺**: the same slider and curves with the roles swapped (NH₃ takes added H⁺, NH₄⁺ takes added OH⁻), with the equation line shown only while both members are present. **Checkpoint 5** (4), a review. |

Every prediction, sort and click has to be finished to move on, but none of it is graded. Back and Next sit above each step as
well as below it. **Sized for a Chromebook:** the question, the flask and the graph of every step are on screen together at
1366 x 650 and 1366 x 520 (an LMS frame), and down to 900 x 600. `tools/layout.js` checks this.

---

## The chemistry, and the choices

- **Two pairs.** Acetic acid / acetate (CH₃COOH written HAc and CH₃COO⁻ written Ac⁻, Ka 1.8 × 10⁻⁵, pKa 4.74, from sodium acetate so
  Na⁺ is the spectator) and ammonium / ammonia (NH₄⁺ and NH₃, Kb of NH₃ 1.8 × 10⁻⁵, pKa of NH₄⁺ 9.26, from ammonium chloride so
  Cl⁻ is the spectator). HF is **not** used here: its Ka is large enough that the equation is already poor after a few additions.
- **One particle stands for 0.010 M.** The buffer is 10 acid-member and 10 base-member particles (0.10 M each). Strong acid or base
  is added in the same units (4 particles is 0.040 M), and **dilution is ignored** (a few drops). Water is not drawn.
- **Words.** "Acid member" and "base member" for the two halves of a buffer; "conjugate pair"; "spectator ion"; "buffer capacity" in
  the vocabulary only. The reaction is always shown as H⁺ + Ac⁻ → HAc and OH⁻ + HAc → Ac⁻ + H₂O.
- **Free H⁺ is not drawn in the buffer.** The added H⁺ is used up by the base member; the tiny amount left is far too few to draw
  (the buffer after 4 HCl has 14 HAc, 6 Ac⁻ and 0 free H⁺). The counts keep charge balanced at every position.
- **Where the buffer stops.** With 10 of each member, 10 particles of acid use up the base member and 10 of base the acid member.
  Past that the pH changes sharply. The range steps make students find this, and Checkpoints 3 and 5 ask about it.
- **The equation, with its warning.** pH = pKa + log([base member] / [acid member]). It is always shown beside the box *Only for a buffer.
  Use it only when the solution holds appreciable amounts of BOTH ...*, in the ratio, "does it work", use and checkpoint reference
  panels, in the vocabulary and in the big ideas. "Appreciable" means neither member is less than a tenth of the other. A weak acid
  alone, a conjugate base alone and a strong acid are sorted as "does not work", with the reason (and the weak acid alone is
  pointed to an equilibrium calculation instead). `tools/validate.js` fails if the equation appears without the warning.
- **Reaction first, equation second.** The "use it" step makes students find the new amounts after the strong acid or base has
  reacted, then put them in the equation. Checkpoint 4 does the same.
- **Left out of this draft:** making a buffer from a recipe, buffer capacity calculations, buffers from partial neutralization, the pH
  of a weak acid alone, polyprotic buffers, indicators. (Candidates to add when the draft is flushed out.)

## How it is built

One model makes every number a student sees.

- `buffer.js` solves the pH of each flask exactly from a charge balance, then turns the amounts into whole particles. A flask is
  `(pair, acid-member particles, base-member particles, strong acid or base added)`. The particle diagram, the pH read-outs, the
  curves, the reactions and every checkpoint answer come from it.
- `flask.js` draws a flask: every particle has its own place in a jittered grid of 96 cells, so particles fade in and out in the same
  places, and a particle that changes form (Ac⁻ to HAc) flashes once. Molecules are boxes and ions are circles, with labels, so colour
  is never the only signal.
- `phcurve.js` draws pH against the amount of acid or base added, with dots that follow the slider.
- `steps.js` holds the lesson steps; `app.js` the order, saving, scoring and the checkpoint screen; `quiz.js` the question bank
  (40 questions, 8 per checkpoint, 2 core each, tied to the model by `fact` entries); `picker.js` and `scorm.js` are shared.
- Saving is only in `cmi.suspend_data` inside the LMS (`localStorage` only standalone, key `buffers-state`); `SCHEMA` 1.
- SCORM 1.2: score 0 to 100 in `cmi.core.score.raw`, `completed` at the results screen, no masteryscore, retakes keep the best
  score. Identifiers `BUFFERS_*`.

```bash
node tools/validate.js                    # the chemistry, the diagrams, the item bank, packaging
node tools/answer-key.js > ANSWER_KEY.md
./build.sh buffers-v1                     # zip into dist/
node tools/walkthrough.js                 # Playwright, fake LMS; SHOTS=dir DARK=1 optional
node tools/layout.js                      # Playwright: fits a Chromebook (1366x650, 1366x520 LMS frame)
```

Teacher links: `src/index.html?step=<id or number>` opens a step (for example `?step=ratio`, `?step=when`) and
`?step=quiz-D&all` shows every question of a checkpoint's pool.

# Reactivity and Arrow Pushing: the four patterns

A SCORM 1.2 activity for Schoology, for the organic chemistry elective (Klein, *Organic Chemistry*, chapter 6), meant
to come before the SN1, SN2, E1 and E2 activity. The emphasis is vocabulary and drawing curved arrows; the biggest
objective is recognising Klein's four patterns of arrow pushing (6.8): nucleophilic attack, loss of a leaving group,
proton transfer and carbocation rearrangement. About 45 minutes. Same look, controls, saving and grading as the
SN1/SN2/E1/E2 activity, and the same way of drawing arrows.

**The teacher's wording.** Students are AP Chemistry trained: "spontaneous" never appears. ΔG < 0 is
*thermodynamically favorable*, ΔG > 0 *not thermodynamically favorable*; exergonic and endergonic are used. No ΔH is
ever calculated, but **bond breaking is endothermic and bond making is exothermic** is said in Part 1, shown beside
every animation, and asked in Checkpoints 1 and 4. Most of the kinetics is left out: no rate equations, orders, rate
constants, temperature curves, catalysts or Hammond postulate, and no reversible or irreversible reaction arrows (the teacher's choice). Eₐ appears only as the height of the hill, and peaks
and valleys as transition states and intermediates. `tools/validate.js` fails on any of the left-out words, and on an
em dash.

---

## What students do

| Part | Steps | What happens |
| --- | --- | --- |
| 1 Energy and bonds | 6 + checkpoint | **Breaking a bond takes energy:** predict, then pull H and Cl apart with a slider beside the energy curve (energy in), and let them bond again (energy out). **Homolytic or heterolytic:** two animations, fish-hooks to radicals and a curved arrow to ions. **Bonds broken, bonds formed:** click every bond broken and formed in Klein's SkillBuilder 6.1 and Practice 6.1(b); energy bars drawn to scale from Table 6.1 (never added up) decide exo- or endothermic. **Entropy:** a gas spreading into two flasks; sort five reactions by the sign of ΔS. **Thermodynamically favorable:** exergonic and endergonic diagrams; ΔG = ΔH − TΔS for every combination of signs. **Reading an energy diagram:** Klein Figures 6.23 and 6.22 play beside their diagrams; click every transition state and intermediate. **Checkpoint 1** (4). |
| 2 Nucleophiles and electrophiles | 3 + checkpoint | CH₃Cl and CH₃Li with δ+ and δ− and a pulsing electron cloud; sort fourteen compounds and ions (Klein 6.8 and Table 6.3); click every nucleophilic and electrophilic centre in three molecules (SkillBuilder 6.2, Problem 6.9). **Checkpoint 2** (4). |
| 3 The four patterns | 8 + checkpoint | **Reading a curved arrow:** one played, then five drawings judged by Klein's rules (6.10). **Patterns 1 to 3:** draw the arrows of seven steps (Br⁻ and a carbocation, methanol and acetyl chloride, losses, proton transfers including an alkene and H₃O⁺). **Carbocation stability** with hyperconjugation. **Pattern 4:** Klein's hole analogy, then a hydride shift and a methyl shift. **Will it rearrange?** six carbocations by Klein's SkillBuilder 6.6 steps. **Name the pattern:** eight steps from Klein 6.11 and 6.27. **Checkpoint 3** (5). |
| 4 Putting them together | 2 + checkpoint | **Klein Figure 6.31**, drawn in the step (no textbook needed): name, then draw, each of its four steps; the figure fills in each step's arrows and pattern name, and the energy diagram grows a hill per step; then play the whole mechanism. **Two patterns at once:** 1-chlorobutane and hydroxide, concerted; then name the three-step sequence of SkillBuilder 6.4. **Checkpoint 4** (5). |

### Drawing arrows

As in the SN1/SN2/E1/E2 activity: tap the electrons (a lone pair or a bond), then where they go (an atom, or a
bond for a new pi bond), or drag from one to the other, or use Tab and Enter. Tapping an arrow removes it; Undo
and Clear work too. When the arrows are right:

- **the step plays.** The pair of electrons rides each arrow, bonds that break fade (dashed while they go), new
  bonds grow, atoms glide to their new places and the charges change. A slider and Play run it; with reduced
  motion, Play steps through still frames.
- **an energy ledger fills in** beside it: every bond broken (energy in, endothermic) and every bond made (energy
  out, exothermic).
- **"Say it in words":** a sentence about the step, its blanks filled from word tiles (nucleophile, leaving group,
  hydride shift, concerted...).

Wrong arrows get Klein's reasons, worked out from the drawing rather than typed per step:

- *a tail on an atom:* "An arrow starts where the electrons are: on a lone pair or on a bond, never on an atom."
- *a tail on a carbocation:* "Never start an arrow on a positive charge: it has no electrons to give."
- *a proton transfer with one arrow:* "The H of H₃O⁺ would have two bonds, and an H only ever has one. Draw the second arrow..."
- *an attack on a C=O without the pi arrow:* "The C of the C=O would end up with a fifth bond. Never give C, N or O more than four..."
- *an arrow pointing the wrong way, or a missing arrow:* says so, and names what is still missing.

Arrows that obey the rules but are not the step's show **what they would make instead**. Show me appears after
three wrong checks.

---

## Grading

**A score, from the four checkpoints only.** 18 questions per attempt (4 + 4 + 5 + 5) from a pool of 57; the
**first answer** to each counts, and a **graded drawing counts on its first Check** (pressing Check with nothing
drawn is not an answer). Every checkpoint's core has a vocabulary question; Checkpoints 3 and 4 always have one
graded arrow drawing and one question naming a pattern or a sequence of patterns. Klein Table 6.3 and the four
patterns sit beside Checkpoints 2 to 4, the energy words beside Checkpoint 1. Nothing asks for a calculation.

Arrows, sorts, predictions and sentences must be finished to move on but are never graded. The score (0 to 100) goes
to `cmi.core.score.raw` after every answer; `cmi.core.lesson_status` becomes `completed` at the results screen; no
masteryscore. A retake gets new questions and the gradebook keeps the best score. Progress is saved only in
`cmi.suspend_data` (localStorage only when opened without an LMS), under its own key `arrow-pushing-state`, with
SCORM identifiers `ARROWPUSH_*`.

---

## The model

- `chem.js`: a drawing is a state, atoms (element, hidden H, lone pairs, position) and bonds; formal charges are
  computed, never stored. `apply()` moves one pair per arrow, all at once, and refuses what Klein refuses (a tail
  on an atom or a + charge, a fifth bond to C, N or O, an H with two bonds or none). `classify()` names a step from
  the bonds that change: an H moving without its electrons is a proton transfer; an H or carbon moving with them to
  the carbocation next door is a rearrangement; any other new sigma bond is nucleophilic attack, any other broken
  one loss of a leaving group. It also finds nucleophilic and electrophilic centres, partial charges (Pauling) and
  the best 1,2-shift of a carbocation.
- `scenes.js`: every step written once, as Klein draws it, with the arrows that make it happen and, for the
  validator only, the product as SMILES and Klein's name for the pattern. The product itself is what the arrows
  make. Chains (Figures 6.23 and 6.31, SkillBuilder 6.4) start each step where the last ended.
- `judge.js`: compares a student's arrows with the step's by what each does with its pair, so equivalent heads
  count the same and order never matters.
- `render.js`: drawings and the animation player; `arrows.js` the arrow tool; `energy.js` energy diagrams;
  `steps1.js` Parts 1 and 2; `steps2.js` Parts 3 and 4; `quiz.js` the checkpoints; `app.js` the shell.

## Checks

```bash
node tools/validate.js
```

```bash
node tools/answer-key.js > ANSWER_KEY.md
```

```bash
./build.sh
```

```bash
node tools/walkthrough.js
```

```bash
node tools/layout.js
```

`validate.js` re-derives every mechanism (rules, product, charge, judge, Klein's pattern), Klein's Table 6.1 numbers
and ΔH° answers, every sort and card, every checkpoint key, and the house rules. `walkthrough.js` plays the whole
activity in Chromium against a fake LMS (wrong answers first where it matters, a reload, a retake).
`layout.js` checks that every arrow drawing and its Check, every animation and its slider (and energy diagram),
and every other working group fits a Chromebook window (1366 × 650, and 1366 × 520 in an LMS frame).

The zip is `dist/arrow-pushing-v1.zip`.

# Substitution and Elimination: SN1, SN2, E1 and E2

A SCORM 1.2 activity for Schoology, for the organic chemistry elective (Klein, *Organic Chemistry*, chapter 7).
Students decide what a reagent can do, watch SN2's back-side attack invert a chirality centre in 3D, draw the
curved arrows of every mechanism, turn Newman projections until an H is anti-coplanar to the leaving group,
flip chairs to find trans-diaxial H atoms, and finish by predicting major and minor products with Klein's three
steps. About 45 to 55 minutes. Same look, controls, saving and grading as the Newman, chairs and chirality
activities.

**Klein's wording throughout.** SN2 is nucleophilic attack and loss of the leaving group in one concerted step,
by back-side attack, with inversion of configuration. SN1 is loss of the leaving group, then nucleophilic attack,
then a proton transfer when the nucleophile is neutral (a solvolysis). E2 is proton transfer and loss of the
leaving group in one concerted step, with the H and the leaving group anti-coplanar. E1 is loss of the leaving
group, then proton transfer. The four arrow-pushing patterns are named as Klein names them: nucleophilic
attack, loss of a leaving group, proton transfer, carbocation rearrangement. `tools/validate.js` fails if
student text says antiperiplanar, backside, Saytzeff or Walden, or never says the phrases above.

---

## What students do

| Part | Steps | What happens |
| --- | --- | --- |
| 1 Who's who | 2 + checkpoint | **Substitution or elimination?** An SN2 and an E2 side by side; what S, E, N and the 1 or 2 mean. Predict which bond breaks in all four reactions, then click the α carbon and every β carbon of four alkyl halides and classify each as methyl, 1°, 2° or 3°. **The function of the reagent:** predict whether HO⁻ or I⁻ is the stronger base, then sort all nineteen reagents into Klein's four groups (nucleophile only; strong nucleophile and strong base; base only; weak nucleophile, weak base). Every wrong drop explains itself. **Checkpoint 1** (4). |
| 2 Substitution | 6 + checkpoint | **SN2 arrows** for (R)-2-bromobutane and HS⁻. **Back-side attack:** predict, then a slider (or Play) runs the reaction in 3D beside its energy diagram: HS⁻ comes in opposite the Br, the transition state has both bonds half made, and the three groups turn inside out; (R) becomes (S). Then a ring: cis-1-bromo-4-methylcyclohexane gives the trans thiol (SN2 is stereospecific). **Crowding the back side:** HS⁻ sent toward methyl, 1°, 2° and 3° bromides, seen from the back; the H atoms in its way glow, and the three CH₃ groups of tert-butyl bromide stop it. **SN1, step by step:** tert-butyl bromide in ethanol, three arrow drawings while Klein's Figure 7.15 fills in. **Either face:** the flat carbocation of (R)-3-bromo-3-methylhexane and its empty p orbital, attacked from each face in 3D: a racemic mixture. **Carbocation rearrangements:** draw the hydride shift of 2-bromo-3-methylbutane and the methyl shift of 3-bromo-2,2-dimethylbutane. **Checkpoint 2** (5). |
| 3 Elimination | 6 + checkpoint | **E2 arrows** (three) for tert-butyl bromide and EtO⁻. **Anti-coplanar:** a Newman projection of 2-bromo-2-methylbutane whose back carbon turns (buttons, or drag round the projection); Eliminate stays off until an H is anti-coplanar, and a syn-coplanar (eclipsed) H is explained. Eliminating animates the base taking the H as Br⁻ leaves, both carbons flattening and their p orbitals lining up. **Regioselective:** Klein's four steps (7.3) on 1-chloro-1-methylcyclohexane and 2-bromo-2-methylbutane: β positions, every possible alkene, Zaitsev or Hofmann, and which is major with NaOEt and with t-BuOK. **Stereoselective:** 3-bromopentane, eliminating from both anti conformations; the gauche CH₃ and CH₂CH₃ glow red; (E)-pent-2-ene is major. **Stereospecific:** (2R,3R)-2-bromo-3-methylpentane gives only (E)-3-methylpent-2-ene; predict, then its diastereomer gives only the (Z). **E1:** arrows for both steps, the energy diagram, and the products beside the SN1 that beats it. **Checkpoint 3** (5). |
| 4 E2 in rings | 4 + checkpoint | **Anti-coplanar in a chair:** chlorocyclohexane in a chair drawing, a 3D chair and a Newman projection down C1–C2, all following one flip slider; click the two trans-diaxial H atoms, then flip and see that an equatorial Cl has none. **Which H can leave?** cis- and trans-1-chloro-2-methylcyclohexane: flip until the Cl is axial, click the anti-coplanar H atoms, mark each alkene major, minor or not formed. Cis is regioselective; trans is regiospecific (and slower). **Locked chairs:** cis- and trans-1-bromo-4-tert-butylcyclohexane with bars for the strain in each chair and a race that shows the trans isomer hardly reacting; then Klein's problem 7.18. **Selective or specific?** Sort eight reactions into regioselective, regiospecific, stereoselective and stereospecific. **Checkpoint 4** (4). |
| 5 Predicting products | 2 + checkpoint | **Klein's decision table:** fill all twelve cells (1°, 2°, 3° against the four functions); each wrong drop gives Klein's reason. **Predict the products:** five problems, starting with Klein's worked example 7.7 ((R)-2-chloropentane and NaOEt): the function of the reagent, the mechanisms, then every product card marked major, minor or not formed, with the wrong guesses (the SN2 product with retention, an alkene that misses the α carbon) among them. The first problem ends with the arrows for its major product. **Checkpoint 5** (5). |

Every arrow, sort, build and prediction has to be finished to move on, but none of them is graded. A wrong
answer gets specific feedback and another try, for example:

- *an arrow from an atom:* "An arrow starts where the electrons are: on a lone pair or on a bond, never on an atom."
- *SN2 with one arrow:* "SN2 is concerted: the leaving group leaves as the nucleophile attacks. Add the arrow for loss of the leaving group."
- *the base attacking the α carbon in an E2:* "Attacking the α carbon would be substitution. In E2 the base takes a proton from the β carbon."
- *an equatorial H clicked in a chair:* "That H is equatorial: it points out from the ring, not opposite the Cl."
- *SN2 put in the 3° row of the table:* "A 3° carbon is too crowded for back-side attack: never SN2."

After three wrong checks an arrow drawing offers **Show me**. Arrows are drawn by tapping the electrons (a
lone pair or a bond) and then where they go (an atom, or a bond for a new π bond), by dragging from one to the
other, or with Tab and Enter. Tapping an arrow removes it; Undo and Clear work too. The finished arrows are
numbered and each is named by its pattern.

**Sized for a Chromebook.** Whatever a student works with is on screen together at 1366 × 650 and in a 1366 ×
520 LMS frame: a mechanism and its Check button; a 3D model, its slider and its energy diagram; a Newman
projection, its turn buttons, the 3D model and Eliminate; a chair drawing, its flip slider and its Newman
projection; a sort's bins and tray; the decision table and its results. `tools/layout.js` checks all of it.
**Back** and **Next** sit above each step as well as below it.

---

## The chemistry, and the teacher's choices

- **The function of the reagent** (Klein's step 1), in the teacher's words with Klein's beside them:
  nucleophile only (strong nucleophile, weak base): NaI, NaBr, NaCl, NaSH, NaSCH₃, H₂S, CH₃SH, NaCN, NaN₃;
  strong nucleophile and strong base: NaOH, NaOMe, NaOEt, t-BuOK; base only (strong base, weak
  nucleophile): DBN, DBU, NaH; weak nucleophile, weak base: H₂O, MeOH, EtOH.
- **t-BuOK** is a strong nucleophile and a strong base, as the teacher teaches it, but sterically hindered: unlike
  the others it gives mostly E2 at a 1° carbon (E2, some SN2), and it always gives the Hofmann product.
- **Klein's table** (step 2), as printed: 1° SN2 / SN2, some E2 / E2 / ✗; 2° SN2 / E2, some SN2 / E2 / ✗; 3° SN1 /
  E2 / E2 / SN1, some E1 (columns in the order above).
- **Regioselective**: more than one regiochemical product can form, and one is major (Zaitsev with an ordinary
  base, Hofmann with t-BuOK; E1 Zaitsev). **Regiospecific**: only one can form, because only one β H can be
  anti-coplanar to the leaving group (trans-1-chloro-2-methylcyclohexane, menthyl chloride).
  **Stereoselective**: the β carbon has two H atoms, both stereoisomers form, the one with the larger groups
  trans is major. **Stereospecific**: the substrate's configuration decides the only stereoisomer (E2 from a β
  carbon with one H, and every SN2). SN1 is not stereospecific.
- **Carbocation rearrangements** use 2° substrates in ethanol (a 3° carbocation has nothing better to become).
  Klein's table marks 2° with a weak nucleophile and weak base ✗; the step says so, and explains that these react
  only slowly, but that a 2° carbocation that does form rearranges if a shift makes it 3°. The rearranged product
  is shown as major, the unrearranged one as minor. 2° substrates in ethanol never appear in the prediction
  problems.
- **SN1 stereochemistry** is taught as a racemic mixture (attack on either face); Klein's note about a slight excess
  of inversion is left out. **E1** products are always minor beside SN1.
- **Left out on purpose:** solvent effects, leaving-group ranking beyond the halides, rate laws written as
  equations (only what the 1 and the 2 mean), and graded arrow drawing (checkpoints judge arrows by picking the
  right drawing).
- **Names**: IUPAC, with the locant before the suffix and E/Z for every stereogenic double bond ((E)-pent-2-ene,
  butan-2-ol, butane-2-thiol), R and S on chains, cis and trans on rings, and Klein's forms for rings
  (1-methylcyclohexene, methylenecyclohexane, 4-methylcyclohexanethiol). The parent chain includes the double
  bond. Menthyl and neomenthyl chloride go by their common names.
- **Locked chairs** use the chairs activity's A-values (kJ/mol, Klein) for the strain bars and the race, but no
  number is shown and none is asked.

## How it is built

Everything a student sees or answers is computed from one model; nothing is typed twice.

- `mol.js`: molecules as graphs, read from SMILES (or the chairs activity's flat-ring spec); stereochemistry as
  parities and cis/trans references; CIP priorities, R/S, E/Z.
- `name.js`: the IUPAC names.
- `layout.js`, `draw.js`: bond-line drawings (zigzags, wedges and dashes read from the parity, E/Z geometry),
  lone pairs and charges for mechanisms, Newman projections, chairs (ported from the chairs activity), energy
  diagrams.
- `react.js`: Klein's reagent functions, his table, and the products: inversion, attack on either face,
  hydride and methyl shifts, every β H with the anti-coplanar requirement, Zaitsev or Hofmann, stereoselective
  or stereospecific, trans-diaxial on rings, A-value chairs.
- `build3d.js`, `viewer3d.js`, `anim.js`: 3D models built from the graph, a canvas renderer (no WebGL), and
  the SN2, SN1 and E2 animations as functions of progress.
- `mech.js`, `arrows.js`: the mechanisms' species and arrows, Klein's reasons for wrong arrows, and the tool.
- `molecules.js` (every substrate with its textbook name), `quiz.js` (the bank), `app.js` (steps, saving,
  scoring), `steps1.js` to `steps3.js` (the step renderers), `chair.js` (the chairs activity's model).

`tools/validate.js` checks every name against the textbook, R/S and E/Z on textbook molecules, every drawing's
wedges and alkene geometry against the graph, every 3D model, the stereospecific E2 products a second way (from
a real anti-coplanar 3D conformer), Klein's worked examples (7.3, 7.7, Figure 7.15, 7.18, menthyl and
neomenthyl chloride), his table, the teacher's reagent classes, every mechanism's own arrows and the usual wrong
ones, every prediction key, every sort card and every quiz answer.

## SCORM

- 23 graded questions in five checkpoints (4 + 5 + 5 + 4 + 5) from a pool of 73; every checkpoint's core has a
  reagent-function question. First answer counts; retakes keep the best score.
- Score 0–100 to `cmi.core.score.raw`, `completed` at the results screen, no masteryscore.
- Saves only in `cmi.suspend_data` (localStorage only when standalone), key `substitution-elimination-state`,
  identifiers `SUBELIM_*`, `SCHEMA` 1 in `app.js`.
- Zip: `dist/substitution-elimination-v1.zip`.

## Before every commit (in this folder)

```bash
node tools/validate.js                    # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh                                # zip into dist/
node tools/walkthrough.js                 # Playwright, fake LMS; SHOTS=dir DARK=1 optional
node tools/layout.js                      # Playwright: fits a Chromebook (1366x650, 1366x520 LMS frame)
```

To look at one step, open `src/index.html?step=<id or number>` (nothing is saved).

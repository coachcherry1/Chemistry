# Properties of Liquids: Surface Tension, Viscosity and Evaporation

**Web version** (runs without Schoology; progress saves in the browser): <https://coachcherry1.github.io/Chemistry/chemistry/imfs/properties-of-liquids-scorm/src/index.html>

A SCORM 1.2 activity for Schoology, for honors chemistry, about 15 minutes. It is part 6 of
**Intermolecular Forces and Properties of Liquids** (`../intermolecular-forces-liquids-scorm/`) on its own, for
students who have already done the IMF activity. It has its own SCORM identifiers (`POL_*`), storage key and
gradebook column, so all three IMF packages can sit in one course.

Eight liquids, none of them in the class's paper prelab, by IUPAC names in the class's style: pentane, heptane,
octane, decane, 2-butanone, 1-butanol, 1-hexanol and 1,5-pentanediol. A hydrocarbon of only C–C and C–H bonds is
nonpolar and has only LDF. Everything is compared at the same temperature with the class's rule: **stronger IMFs,
higher surface tension, higher viscosity, slower evaporation**. No vapour pressure, molecular size or
entanglement, and no numbers on screen.

## What students do

| Step | Liquids | What it practises |
| --- | --- | --- |
| Three properties of liquids | pentane, 1-butanol (42 electrons each) | The three words and the rule |
| Bigger hydrocarbons | pentane, heptane, octane, decane | LDF only, compared by electrons |
| About 40 electrons, three forces | pentane (42), 2-butanone (40), 1-butanol (42) | LDF < dipole-dipole < hydrogen bonding |
| 58 electrons each | heptane, 1-hexanol, 1,5-pentanediol | 0, 1 and 2 hydrogen bonds (counted) |
| Checkpoint | 5 questions from a pool of 19, the rule beside it | graded |

Each step: name the IMFs of each liquid from its Lewis structure (a wrong set gets the specific reason), count
hydrogen bonds where asked, rank the liquids strongest first, predict which has the highest (or lowest) surface
tension and viscosity and which evaporates fastest (or most slowly), then **run the liquid bench**: a drop on
plastic beads up or spreads, a pipet drains, a drop left out disappears. The liquids appear in a different order
for each student. Everything before the checkpoint must be finished to move on, but none of it is graded.

## No lies

`LIQUID` in `src/js/data.js` holds real 20 °C surface tension, viscosity and vapour pressure (CRC Handbook,
Yaws). Students never see them. They pace the bench, so what happens first on screen happens first in real
life, ties included, and `tools/validate.js` asks a comparison only when the class's rule and the data agree by a
clear margin (5%, 30%, 50%); every ranking also needs the real boiling points to agree. 2-Butanone and 1-butanol
have the same surface tension, so that pair is never compared by it, and their drops look the same.

## Grading

5 questions per attempt (3 core, ★ in `ANSWER_KEY.md`, and 2 at random); the **first answer** to each counts.
`cmi.core.score.raw` (0 to 100) after every answer, `completed` on the results screen, no `masteryscore`, one
`cmi.interactions` record per answer. Retakes draw new questions and the gradebook keeps the best. Progress is
saved only in `cmi.suspend_data` (`localStorage` only without an LMS). Bump `SCHEMA` in `src/js/app.js` whenever
the steps, the pool or a liquid changes.

## Building and uploading

```bash
node tools/validate.js                    # must pass
node tools/answer-key.js > ANSWER_KEY.md
./build.sh                                # dist/properties-of-liquids-v1.zip
node tools/walkthrough.js                 # Playwright: plays the whole activity against a fake LMS
node tools/layout.js                      # Playwright: fits a Chromebook, 1366x650 and 1366x520
```

Upload `dist/properties-of-liquids-v1.zip` in Schoology with **Add Materials → Add File/Link/External Tool → Add
File** (or **Package**). `src/index.html?step=hydrocarbons` jumps to a step (ids in `ANSWER_KEY.md`, or numbers 1
to 6) without saving anything.

## Files

`src/js/`: `util.js`, `data.js` (elements, the liquids built by `straightChain()`, `LIQUID`), `chem.js` (electrons,
polarity, forces, hydrogen bonds, the comparison rule and the property rule), `mol2d.js` (Lewis structures),
`bench.js` (the liquid bench), `quiz.js`, `scorm.js`, `app.js`. Fixes here usually belong in
`intermolecular-forces-liquids-scorm/` too.

Offline, no CDN, web fonts or WebGL; mouse, touch and keyboard; dark mode; reduced motion shows the bench as a
still partway through, with the order in words.

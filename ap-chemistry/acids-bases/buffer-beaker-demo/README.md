# Buffer Beaker Demo

A teacher's demonstration tool for the **smartboard**, for AP Chemistry (Unit 8, acids and bases). **No checkpoints, no score**
(opened from the LMS it only marks itself completed). A companion to the student activity `../buffers-scorm/`, which keeps its
checkpoints.

**Web version** (runs without Schoology; reports no score): <https://coachcherry1.github.io/Chemistry/ap-chemistry/acids-bases/buffer-beaker-demo/src/index.html>

## What is on screen

- **Left, a large beaker** of buffer. Particles are the **acid member HA** (purple boxes) and the **base member A⁻** (green
  circles), plus free **H⁺** and **OH⁻** when there are any. Water, Na⁺ and Cl⁻ are not drawn (the model still counts the spectator
  ions so the pH is exact). The liquid changes colour with the pH, like a universal indicator.
- **Right, two sliders**: the concentration of **HA** and of **A⁻**, 0.00 to 0.20 M in steps of 0.01 M (one particle is 0.010 M).
- **Four buttons**: add 1 or 5 drops of **HCl**, or 1 or 5 drops of **NaOH** (one drop is 0.010 M, up to 12 of each; dilution is
  ignored). **Reset drops** puts the beaker back. Moving a slider also resets the drops.
- **A big pH meter** with the change since the start, and the pH pure water would have with the same drops. **Show pure water** (on by default) hides the pure water curve, dot and key on the graph and the pure water line under the meter, for when you want only the buffer. **Show the equation**
  opens pH = pKa + log([A⁻] / [HA]), always with the box *Only for a buffer. It needs appreciable amounts of BOTH ...*, and it says
  the equation does not apply when a member is missing.

## What students see when a drop goes in

1. The particles that will react **pulse** (the A⁻ for HCl, the HA for NaOH).
2. The drop (HCl or NaOH) **falls** from the dropper.
3. The **H⁺ (or OH⁻)** leaves the drop and **travels** to one of those particles.
4. That particle **changes form and flashes**: H⁺ + A⁻ → HA, or OH⁻ + HA → A⁻ + H₂O (a little H₂O appears and floats away).
   The reaction is written large under the beaker.
5. With nothing left to react with (all the A⁻ gone for HCl, all the HA gone for NaOH), the H⁺ or OH⁻ **stays free** and the pH
   falls or rises sharply, and the line under the beaker says so.

A run of 5 drops plays the same sequence five times, faster. With reduced motion set, it just updates the beaker.

## Showing that more of each species means a smaller pH change

The **Same drops, stronger buffer** tab (beside **pH vs drops**) answers it directly. Choose HCl or NaOH, the number of drops
(1 to 10), and what to make more of: **A⁻**, **HA** or **both**. Four bars show the pH change for the same drops with that species at
**×½, ×1 (what the sliders say now), ×2 and ×4**, with the concentration, the start and end pH, and how much of the reacting
species is **left**. A sentence under the bars says what doubling does, from the real numbers. Where the species is used up the bar
is hatched and the sentence says the buffer runs out. The validator checks that, for every slider setting and every drop count where
the reacting member survives, more of A⁻, of HA or of both always gives a smaller change.

The **pH vs drops** tab draws this buffer's curve against pure water, with a dot for the beaker, so the flat middle and the cliff
where a member runs out are on screen too.

## How it is built

One model (`buffer.js`) makes every number: the exact pH from a charge balance (acid member HA, base member A⁻, Ka 1.8 × 10⁻⁵, pKa
4.74), the particle counts, the curves and the strength chart. Files: `buffer.js`, `beaker.js` (the beaker, the dropper and the
animation of one drop), `charts.js` (the graph and the strength chart), `app.js`, `scorm.js`, `util.js`. Offline only, no CDN. Works
with a mouse, a touch screen (large targets for a smartboard) or the keyboard. Dark mode. `?speed=0` skips the animation, any other
number scales it. `?tab=strength` opens the strength chart, `?water=0` starts with pure water hidden.

```bash
node tools/validate.js                    # the chemistry, every beaker state, the strength chart, packaging
./build.sh buffer-beaker-demo-v1          # zip into dist/
node tools/walkthrough.js                 # Playwright, fake LMS; SHOTS=dir DARK=1 optional
node tools/layout.js                      # Playwright: whole demo on screen at 1280x720 and up
```

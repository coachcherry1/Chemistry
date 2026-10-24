# Kinetics of the Iodination of Acetone — Virtual Lab

A SCORM 1.2 virtual lab for Schoology. Students run the acid-catalysed iodination of
acetone by the **method of initial rates**, design their own single-variable trials,
read the three orders off their own data, and then match the rate law they measured to
one of three proposed mechanisms.

Single self-contained `index.html` — no CDN, no web fonts, no network calls of any kind.
It works offline inside a locked-down LMS iframe.

---

## What changed in v2

**Run 5 — the prediction check — has been removed.** In v1 the lab ran to five trials:
after the analysis, students were handed an unseen mixture, had to predict its reaction
time from their own rate law and *k*, and then measure it to see how close they landed.
It was the longest single step in the lab and it was slowing classes down.

The lab now ends at the mechanism section instead:

```
Run 1 → Run 2 → Run 3 → Run 4 → concept questions → Analysis → Mechanism → summary
```

Nothing else about the chemistry changed. The four runs still establish all three orders,
the analysis still derives the rate law and *k*, and the mechanism section — which was
already the last thing students did — is now reached straight from the analysis.

What went with Run 5: the composition pool it drew from, the prediction table and its
15% tolerance, the carried-over rate-law card, and the predicted/measured row on the
summary screen. The summary table now reports four runs.

---

## The four runs

| Run | Mixture | Who designs it | What it isolates |
|-----|---------|----------------|------------------|
| 1 | 5.00 mL of each reagent + 5.00 mL water | given | the baseline everything is compared against |
| 2 | acetone varied, HCl and I<sub>2</sub> pinned at 5.00 mL | **the student** | order in acetone |
| 3 | acid doubled to 10.00 mL, no water | given | order in H<sup>+</sup> |
| 4 | iodine doubled to 10.00 mL, no water | given | order in I<sub>2</sub> |

Every run is made up to exactly 20.00 mL, so concentrations stay comparable.

Run 2 is the one the student designs, and the bench enforces the logic of the method: a
plan that changes two reagents at once is rejected, as is one that leaves the varied
reagent too close to Run 1's 5.00 mL to produce a readable difference. The accepted
windows are 2.00–3.00 mL or 8.00–10.00 mL.

Runs 3 and 4 are handed over rather than designed — by the third trial the arithmetic is
the same two steps the student has already done twice, so the bench works it through as a
stepped animation and then gates on a short question about what the comparison shows.
Run 4 is the one that surprises people: the trial takes about twice as long, but the
*rate* does not move at all.

## The chemistry underneath

The bench simulates

```
rate = k[acetone][H⁺]        I₂ is zero order
```

so the time to lose the colour is `[I₂]₀ / rate`. Because the iodine is consumed at a
constant rate, absorbance falls linearly and the average rate over the whole run *is* the
initial rate — which is what makes the stopwatch measurement legitimate, and which
students confirm themselves against the integrated rate law plots.

A colorimeter at 460 nm logs absorbance throughout, using `A = εbc` with ε = 600 M⁻¹cm⁻¹
and b = 1.00 cm. In the analysis the Run 1 trace is plotted three ways — A, ln A and 1/A
against time — with a least-squares fit and R² under each. Only the zero-order plot is
genuinely straight, so students confirm the iodine order a second, independent way.

**Each student is assigned their own rate constant**, drawn from 2.8×10⁻⁵ to 4.2×10⁻⁵,
with ±0.5% scatter on each measured time. Two students will not have the same data. The
orders and the mechanism will match — that is the chemistry.

## Data tables and tolerances

Every run has a gated data table: each reading and each calculated quantity has to be
entered and checked before the next row unlocks, and the table has to be finished before
the run counts as recorded.

| Entry | Accepted within |
|-------|-----------------|
| volumes | ±0.05 mL, and must be typed to two decimal places |
| stopwatch times | exactly as displayed, to one decimal place |
| concentrations, rates, *k* | 5% |
| orders | must follow from the student's own two ratios |

Every check is made against **the student's own recorded data**, not a textbook answer —
so a student who mis-measures a volume still gets a consistent, checkable table.

Redoing a run after the analysis has been opened relocks and clears the analysis and the
mechanism rather than leaving them holding numbers that no longer match the data table.

## Grading

Completion only. When the student finishes the mechanism section the package posts
`cmi.core.lesson_status = completed` with `cmi.core.score.raw = 100`, so Schoology records
the completion grade automatically. There is no partial credit and **no save or resume** —
students need to work straight through in one sitting.

With no LMS present the page runs harmlessly as a plain web page and the SCORM calls are
skipped, which is what makes local testing possible.

## Building and uploading

```sh
./build.sh                          # writes dist/acetone-iodine-kinetics-v2.zip
./build.sh some-other-name          # writes dist/some-other-name.zip
```

`imsmanifest.xml` has to sit at the **zip root**, not inside a folder, so `build.sh` zips
from inside `src/` rather than from the project root. Upload the zip to Schoology as a
SCORM/Common Cartridge package.

A built `dist/acetone-iodine-kinetics-v2.zip` is committed, so you can download and upload
it without running the build.

### Testing without an LMS

Open `src/index.html` directly in a browser. Everything works except the SCORM reporting,
which is skipped when no API object is found on a parent or opener window.

## Layout

```
acetone-kinetics-scorm/
├── src/
│   ├── imsmanifest.xml      SCORM 1.2 manifest — must be at the zip root
│   └── index.html           the whole lab: markup, styles, simulation, SCORM wrapper
├── build.sh
└── README.md
```

About 143 KB of source and a 38 KB zip.

### Where things live in `index.html`

The script is sectioned with banner comments:

| Section | Contents |
|---------|----------|
| A | constants, reagents, run specs, section list, state |
| B | tabs, section switching, per-run step tracker |
| C | run panels, plan validation, burets |
| D | the reaction, the stopwatch and the colorimeter trace |
| D2 | the worked calculation animation for Runs 3 and 4 |
| E | the gated data-table engine and every table's rows |
| F | what happens when a table is finished |
| G | summary, SCORM reporting and start-up |

To change the flow, edit `SECTIONS` and `SECTION_TABS` in section A — the tab bar, the
unlock logic and `switchSection` all read from them.

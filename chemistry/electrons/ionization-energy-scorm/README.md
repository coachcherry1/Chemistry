# Successive Ionization Energies

A SCORM 1.2 activity for Schoology, about 10 minutes long. Students pull electrons off atoms one
at a time, read mystery successive ionization energy data, and explain what they see with the
**two-step rule** from the Atomic Radius and Ionization Energy packet:

> **Step 1.** Count the OCCUPIED energy levels. If they are different, that settles it: fewer
> occupied levels means the electron is closer and held more tightly.
> **Step 2.** Only if the occupied levels are the same do the protons decide.

Inside one element the protons never change, so Step 2 always ties. That leaves exactly two
cases for the next electron, and every question in the activity comes back to one of them:

| The next electron comes from… | What happens | Why |
| --- | --- | --- |
| the **same** occupied level | a small step up | Both steps tie. The particle is more positive each time, so it costs a little more. |
| a **lower** occupied level | a huge jump | The outer level is empty. The electron comes from the level underneath, closer to the nucleus. Step 1 decides. |

It is a companion to Part 5 of the packet (*Pulling Off More Than One Electron*), not a
replacement for it.

---

## Matched to the packet

The wording and the numbers come from the packet itself.

- **The rule and the two statements** are worded as in Part 1: the attraction is *directly*
  proportional to the nuclear charge and *inversely* proportional to the distance squared.
  No equation, no k, no numbers for force.
- **"Occupied energy levels"** everywhere, never just "energy levels". When Mg loses two
  electrons, the diagram keeps level 3 on screen, dashed and labelled *empty*: the level
  still exists, it just has nothing in it (the key's answer to 8.1).
- **"Row"**, not "period", and **"electrons in the outer level"**, not "valence electrons".
- **No shielding and no effective nuclear charge.** The jump is explained by distance alone.
- **Distance means occupied levels, never the measured radius.** "Mg²⁺ is a small ion, so…"
  is a distractor with its own feedback: the size is a result, not a cause.
- **The small step** is explained the way you chose: each removal leaves the particle more
  positive, so the same protons pull harder on the electrons that are left.
- **No em dashes** in anything a student sees. `tools/validate.js` enforces this.

### The numbers

| Elements | Source |
| --- | --- |
| Na, Mg, Al, Be | Part 5 of the packet, exactly as printed (the X, Y, Z table and question 5.3) |
| Li, B, C, Si, P, S, K, Ca | 1st ionization energy from the Part 2 table; later ones are standard reference values (CRC / NIST), rounded to whole kJ/mol |

**The packet disagrees with itself by 1 or 2 kJ/mol.** Part 2 lists Na 495, Mg 737, Al 576 and
Be 898, while Part 5 uses 496, 738, 578 and 899. This activity uses the Part 5 values, since
Part 5 is the successive ionization energy page. You may want to make the two pages agree.

`tools/validate.js` checks every Part 5 value and every Part 2 first ionization energy against
the packet, and checks that the "about how many times bigger" readings for X, Y and Z match
the teacher key (9, 5 and 4 times).

---

## The three parts

| Part | Name | What the student does | Time |
| --- | --- | --- | --- |
| 1 | Strip the atom | One of Na, Mg, K or Ca, shown as an energy-level diagram with its configuration. The student pulls off one electron at a time. Before each one they say how many occupied levels the particle has, then **predict: lower, a small step up, or a huge jump?** The bar appears only after they commit. They explain the first small step and the jump, then give the electrons in the outer level and the ion the element forms. | ~3 min |
| 2 | Mystery elements | Five screens: two mystery elements (one as a table, one as a bar graph) worked the way 5.1 is (jump, electrons in the outer level, group, element on the periodic table, configuration); one check question; one where **the jump is not in the data yet** (four values, no jump: "at least 4", and what data would settle it); and one **head to head** ("Which has the larger 2nd ionization energy, sodium or magnesium?") answered with Step 1. | ~5 min |
| 3 | Checkpoint | Three multiple-choice questions, each on a different idea, each with an explanation. | ~2 min |

The draw is balanced, not purely random. The two mystery elements always come from both sides
of the table (one from groups 1 and 2, one from groups 13 to 15), neither repeats the Part 1
element, and no two check questions in a run share an idea. Which element fills each place
varies, so a retry is a new set.

The side panel shows a flowchart for the current screen. In Part 1 and the head-to-head
questions it is the two-step rule; in the mystery elements it is the 5.1 procedure. The box
for the current step lights up and finished boxes get a ✓.

### Guiding questions worth pointing at in class

- **The jump is not in the data.** Si, P, S or C with only four values. Students who have
  learned "find the jump" have to notice there isn't one yet and say *at least 4*.
- **Head to head.** Na vs Mg for the 2nd ionization energy, Mg vs Al for the 3rd, and so on.
  Magnesium has more protons, but Na⁺ has two occupied levels to Mg⁺'s three, so Step 1
  settles it and the protons never get a vote. This is Part 2's Ne vs Na question in a new form.
- **Why Mg²⁺ and never Mg³⁺.** The third electron sits past the jump. This ties back to the
  ionic naming activity.

### Feedback on mistakes

Wrong answers are never penalised. Every wrong option carries its own explanation:

| Mistake | Feedback |
| --- | --- |
| "Mg⁺ has more protons than Mg" | Removing an electron never touches the nucleus. Step 2 is a tie. |
| "Mg²⁺ is a small ion, so the pull is stronger" | That uses the size as the cause. Say it with occupied energy levels. |
| "Mg²⁺ has a full outer shell and wants to keep it" | Atoms and ions do not want anything. Say it with attraction. |
| Mg²⁺ has 3 occupied levels | Level 3 still exists, but it has nothing in it any more. Only occupied levels count. |
| A jump between the 2nd and 3rd means 3 electrons | The 3rd is the first one past the jump. Count only the ones before it. |
| 3 electrons in the outer level, so group 3 | Group 3 is among the transition metals; 3 electrons is s² p¹, group 13. |
| "The 2nd ionization energy removes an electron from a second atom" | It starts from the ion the 1st one left behind: Na⁺(g) + energy → Na²⁺(g) + e⁻. |
| Predicting "lower" | Every ionization energy is higher than the one before it. |

A missed check question brings back a **different question on the same idea**: two screens
later in Part 2, or at the end of the checkpoint. At most two extra per part.

### Left out on purpose

- **PES.** Out of scope, as you asked.
- **The sublevel dips** (Mg to Al, P to S). Those are Part 7. The activity never asks a student
  to call aluminum's 1st-to-2nd step (about 3 times) anything but a step inside level 3, and
  Al is never the Part 1 element, where "small step or huge jump?" has to be clear-cut.
- **Ions for nonmetals.** The activity says "It forms Al³⁺" but never "It forms P⁵⁺": only
  Li, Be, Na, Mg, Al, K and Ca are named as ions.

`ANSWER_KEY.md` lists every data set, every answer and the full check-question bank.

---

## Grading

**Completion only.** `cmi.core.lesson_status` becomes `completed` when a student finishes Part 3,
and no numeric score is written, so the Schoology column reads complete / incomplete. Students
still see their own accuracy on the part and finish screens.

Progress saves to `cmi.suspend_data` when the activity opens and after every answer, so a
student who closes the window comes back to the same elements. A finished screen is not
repeated. A save is under 400 characters, well inside the SCORM 1.2 limit of 4,096.

Bump `SCHEMA` in `src/js/game.js` whenever you change the parts, the draw or the element list,
so an old save is discarded rather than resumed.

---

## Building and uploading

```bash
./build.sh                    # → dist/ionization-energy-v1.zip
```

`imsmanifest.xml` must sit at the root of the zip, which is why `build.sh` zips from inside `src/`.

1. In Schoology: **Add Materials → Add File/Link/External Tool → Add File**, and upload
   `dist/ionization-energy-v1.zip`. Or use **Add Materials → Package** if your install shows it.
2. Enable the gradebook column in the item's settings to track completion.
3. Open it once with **Preview as Student**. The badge in the top right should read
   **Connected to the LMS**.

A built `dist/ionization-energy-v1.zip` is committed, so you can upload it without running the build.

### Teacher preview

Open `src/index.html` directly, or add `?part=N` (1 to 3) to jump straight to a part:

```
src/index.html?part=2
src/index.html?part=1&element=Mg     # strip a chosen element: Na, Mg, K or Ca
```

Preview mode unlocks every part and **saves nothing**, so showing it in class never touches a
student's progress.

---

## Editing the content

| To change | Edit |
| --- | --- |
| Ionization energies, which elements each question type may use | `src/js/data.js` |
| Check questions | `src/js/checks.js` (`BANK`) |
| The step-by-step questions and their feedback | `src/js/items.js` |
| The parts and the draw | `src/js/plan.js` |

After any edit:

```bash
node tools/validate.js                 # refuses content that could produce a bad question
node tools/answer-key.js > ANSWER_KEY.md
./build.sh
```

`tools/validate.js` checks that:

- the Part 5 values match the packet exactly, every other 1st ionization energy matches Part 2,
  and the jumps for X, Y and Z read 9, 5 and 4 times as in the teacher key;
- every element's ionization energies rise every time;
- the biggest jump sits exactly where the outer level runs out, and stands at least 1.3 times
  above every other step, so "where is the jump?" has one clear answer;
- the four values shown for a "jump not in the data" element contain no step that looks like a jump;
- every head-to-head pair is settled by Step 1 and the data agrees;
- every question the activity can build has exactly one right answer, no repeated options,
  and feedback on every wrong option; only metals are named as ions;
- nothing a student sees uses an em dash, "valence", "period", "octet", shielding or effective
  nuclear charge;
- 2,000 simulated runs are balanced as described above and fit the SCORM save limit.

---

## Layout

```
ionization-energy-scorm/
├── src/
│   ├── imsmanifest.xml      SCORM 1.2 manifest, must be at the zip root
│   ├── index.html           page and both flowcharts
│   ├── css/styles.css
│   └── js/
│       ├── data.js          elements, ionization energies, which questions use which
│       ├── atom.js          configurations, occupied levels, wording helpers
│       ├── checks.js        check-for-understanding bank
│       ├── plan.js          the parts and the balanced draw
│       ├── items.js         builds each question and its feedback
│       ├── draw.js          bar graph, energy-level diagram, table, periodic table
│       ├── scorm.js         SCORM 1.2 run-time wrapper
│       └── game.js          painting, answering, progression
├── tools/
│   ├── validate.js
│   └── answer-key.js
├── build.sh
├── ANSWER_KEY.md            generated
└── README.md
```

No CDN, no web fonts, no network calls. It works offline inside a locked-down LMS iframe.

## Accessibility

- Every control is a real button, so it all works by keyboard, including picking an element
  on the periodic table.
- Focus moves to the next step automatically.
- Feedback is announced through an ARIA live region.
- The graphs and the energy-level diagram carry text descriptions, every bar is labelled with
  its value, and colour is never the only signal: emptied levels are labelled *empty*, the bars
  on each side of the jump are bracketed with words, and wrong choices are struck through.
- Dark mode follows the device setting, and `prefers-reduced-motion` turns off transitions.

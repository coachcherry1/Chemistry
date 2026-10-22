# Lewis Structure Drawing Tool

A teacher's tool, packaged as SCORM 1.2 for Schoology (it also runs straight from the files): build any 2-D
Lewis structure and get a clean picture of it for slides, worksheets and keys. It is separate from the
Lewis structures and resonance activities and **reports no score** — opened from the LMS it simply marks
itself completed.

---

## Two ways to build a structure

**Start from a formula.** Type it and press **Draw** (a new drawing) or **+ Add** (beside what is there):

| You type | You get |
| --- | --- |
| `SO4 2-`, `NH4+`, `NO3-`, `SO42-`, `SO₄²⁻`, `CO3^2-` | the ion, in brackets with its charge |
| `H2SO4`, `HNO3`, `H3PO4` | an oxyacid, every H on an O |
| `SF6`, `XeF4`, `PCl5`, `ICl4-` | the expanded octet the 5 rules give |
| `BF3`, `BeCl2` | B stable with 6, Be with 4 |
| `NO2`, `NO`, `ClO2` | an odd-electron species: one unpaired electron on the central atom |
| `NaCl`, `MgCl2`, `Na2O`, `Li3N` | an ionic dot diagram, every ion in its own brackets |
| `N`, `C`, `Cl-`, `Na+`, `O^2-` | a dot symbol / monatomic ion |
| `CH3OH`, `C2H5OH`, `CH3COOH`, `C6H6`, `HCOO-` … | a built-in common molecule (see the list) |

Single-central-atom species are drawn by the **same 5-rule engine as the Lewis structures activity**: the
first atom written (not H) in the center, H on O in an oxyacid, Rule 5 only while the central atom is short.
So a key you draw here matches what students were taught (`tools/validate.js` checks every species in both
activities). The layout follows the activity too: outer atoms left, right, below and above; bent O₃, SO₂
and NO₂⁻; the odd atom on top in CH₂O and H₂CO₃.

**Common molecules** (the drop-down): hydrogen peroxide, hydrazine, ethane, ethene, ethyne, propane,
methanol, ethanol, methylamine, formic acid, acetic acid, acetaldehyde, acetone, urea, formate, acetate,
benzene. Typing one of their formulas in any order (`CH3OH`, `CH4O`) finds it too.

What it refuses, with a reason: formulas that need more than one central atom and aren't in the list
(draw those by hand), parentheses (`Ca(OH)2`), and ionic compounds with a polyatomic ion (`NaNO3` — draw
NO₃⁻ from its formula and add Na⁺ by hand).

**Draw by hand** on the grid:

| Tool | Tap |
| --- | --- |
| **Atom** | an empty spot: a new atom of the chosen element. Tap an atom to select it — then every atom you place is bonded to it (tap round a C to give it its H atoms). |
| **Bond** | two atoms: a bond. A bond: single → double → triple. An atom, then an empty spot: a new bonded atom. |
| **Lone pair** | an atom: one more lone pair (when it's full, the next tap clears them) |
| **Arrow** | an empty spot: ↔. Tap the arrow: → , then ⇌. |
| **Erase** | an atom, bond or arrow |

Drag an atom to move it; **Shift**-drag moves the whole molecule. **Fill electrons** gives every bonded
atom its octet (H its duet, B 6, Be 4) at once, and a lone atom its valence electrons as a dot symbol.

The **Selected** panel edits whatever you tapped: an atom's element, lone pairs and single electrons, a
bond's order (including **Partial** — a solid line plus a dashed line, for a resonance hybrid), an arrow's
kind, nudging a molecule, and **Duplicate →**, which copies the molecule beside itself with ↔ between —
move a double bond in the copy and you have resonance structures.

Under the drawing, a status line counts each molecule's valence electrons and names any atom that is short
of (or past) its octet — a quick check before you hand out a key.

## Getting the picture out

- **Snip view** — the drawing alone, as big as the window allows, on plain white (or the dark-slide
  color). Then use your snipping tool: **Windows** Win+Shift+S, **Chromebook** Ctrl+Shift+Show windows,
  **Mac** Cmd+Shift+4. Esc goes back. This always works, even inside Schoology.
- **Copy image** — a PNG on the clipboard; paste straight into PowerPoint, Google Slides or Docs.
- **PNG** / **SVG** downloads. SVG stays sharp at any size (PowerPoint, Word and Google Slides take it).

Copy and download can be blocked when the page runs inside an LMS frame; the message says so, and Snip view
still works. Opening `index.html` from the unzipped files on your computer avoids the frame altogether.

**How it looks** (under the drawing): lone pairs on/off, formal charges (+1, −1), brackets on ions (shown
once every atom in the ion has its electrons, so a half-built skeleton isn't labelled with a strange
charge), element colors or plain black for printing, and the background — white, transparent, or **dark
slide** (light ink). **Image size** sets how large Copy image and PNG are.

## Saving

Your current drawing is kept automatically in this browser. **My drawings** keeps named copies (also in
this browser only — nothing is sent to the LMS). Undo/redo cover every change, including Clear and opening
a saved drawing.

Keys: Ctrl+Z / Ctrl+Y undo and redo, Delete removes the selection, 1 / 2 / 3 set a selected bond, Esc clears
the selection; with the drawing focused, arrow keys nudge (Shift: the whole molecule).

---

## Building and uploading

```bash
./build.sh            # → dist/lewis-drawing-tool-v1.zip (the number comes from VERSION)
```

`build.sh` stamps the number in `VERSION` into the zip: the top bar reads **version 1**, and every script and
stylesheet link carries `?v=1`, so an LMS or browser can't keep running an older upload's files. **Bump
`VERSION` before building a zip you hand out.** Opened straight from `src/`, the page reads *version dev*.

To upload: in Schoology, **Add Materials → Add File/Link/External Tool → Add File** (or **Package**) and
upload `dist/lewis-drawing-tool-v1.zip`. Since it is a tool for you, you may want to keep it unpublished or
hidden from students. The built zip is committed, so you can upload it without running anything.

Or skip the LMS: unzip it and open `index.html` in Chrome — everything works, including Copy and downloads.

## Checks

```bash
node tools/validate.js      # the formula starter against both activities' answer keys, templates, reading formulas
node tools/walkthrough.js   # optional, needs Playwright: draws, edits, exports, saves and reloads in a real browser
```

## Layout

```
lewis-drawing-tool/
├── src/
│   ├── imsmanifest.xml   SCORM 1.2 manifest — must be at the zip root
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── util.js       small DOM helpers
│       ├── elements.js   main-group elements, periods 1–5; drawing colors
│       ├── lewis.js      the 5 rules (the same engine as the Lewis structures activity)
│       ├── model.js      a drawing: atoms, bonds, arrows; electron counts, formal charges
│       ├── generate.js   "Start from a formula": templates, ionic, dot symbols, the 5 rules
│       ├── render.js     a drawing as SVG (colors and fonts inline, so copies match the screen)
│       ├── editor.js     the tools, selection, dragging, undo/redo, keyboard
│       ├── export.js     Snip view, Copy image, PNG and SVG
│       ├── scorm.js      marks itself completed in an LMS; no score
│       └── app.js        the page: pickers, options, My drawings
├── tools/
│   ├── validate.js
│   └── walkthrough.js
├── build.sh
├── VERSION
└── README.md
```

No CDN, no web fonts, no network calls.

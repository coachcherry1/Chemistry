# Chemistry

SCORM 1.2 activities for Schoology, organised as `class/topic/activity`: `chemistry/`, `ap-chemistry/` and
`organic-chemistry/`, each holding topic folders (for example `chemistry/bonding/`), each holding one folder per
activity. `CLAUDE.md` lists every package by course, with the house rules and the commands to run before each
commit; each activity folder's `README.md` describes it and its built zip in `dist/`.

## Searchable index

`index.html` at the repo root is one searchable page for everything in this repo. Pick a **course** (Organic, Honors, AP),
a **type** (questions, molecules, simulations) and a **chapter**; choosing a chapter opens its **subtopics**, which are the
textbook sections of that chapter (empty subtopics are dimmed, so you can see where questions are still needed). The
organic chapters (2 to 11) and their sections come from the chapter PDFs and live in `content/taxonomy.json`. Views can be
bookmarked: the address bar records the filters. Answers stay hidden until a card is opened.
On GitHub Pages: <https://coachcherry1.github.io/Chemistry/> (shown once merged to `main`).

**Changing the wording of a question.** The page is a viewer; the Word documents are generated from the same data, so
text is not edited in the documents. Press **Edit wording** on a question card, change it, and save. Edits are kept in your
browser; **Edits** (top right) downloads them as a small file. Send that file to Claude, or run
`python3 tools/apply_edits.py chem-index-edits.json`, and the new wording is written to `content/overrides.json` and
rebuilt into the Word documents, the JSON and CSV data, and the index in one step.

Rebuild the index after adding or changing anything with `python3 tools/build_index.py`.

| Folder | Contents |
| --- | --- |
| `organic-chemistry/nomenclature/molecule-database/` | 500 drawn molecules with verified IUPAC names, CSV and JSON |
| `organic-chemistry/substitution-elimination/problem-bank/` | 100 SN1, SN2, E1 and E2 free-response questions with schemes and answer key |
| `organic-chemistry/acids-bases/acids-bases-quiz/` | 30 acid and base questions (ARIO) and 10 alkane naming questions, as multiple choice, with answer key |
| `organic-chemistry/_shared/` | Drawing, naming and wording-edit code used by the three folders above |
| `content/` | `taxonomy.json` (chapters and sections) and `overrides.json` (wording edits) |

## Web versions

Every activity also runs as a web page on GitHub Pages, outside Schoology (the address is
`https://coachcherry1.github.io/Chemistry/` plus the path to `src/index.html`; see `CLAUDE.md`).

| Package | Web address |
| --- | --- |
| `ap-chemistry/bonding/resonance-scorm/` | <https://coachcherry1.github.io/Chemistry/ap-chemistry/bonding/resonance-scorm/src/index.html> |
| `ap-chemistry/kinetics/acetone-kinetics-scorm/` | <https://coachcherry1.github.io/Chemistry/ap-chemistry/kinetics/acetone-kinetics-scorm/src/index.html> |
| `chemistry/bonding/lewis-drawing-tool/` | <https://coachcherry1.github.io/Chemistry/chemistry/bonding/lewis-drawing-tool/src/index.html> |
| `chemistry/bonding/lewis-structures-scorm/` | <https://coachcherry1.github.io/Chemistry/chemistry/bonding/lewis-structures-scorm/src/index.html> |
| `chemistry/bonding/vsepr-polarity-scorm/` | <https://coachcherry1.github.io/Chemistry/chemistry/bonding/vsepr-polarity-scorm/src/index.html> |
| `chemistry/electrons/ionization-energy-scorm/` | <https://coachcherry1.github.io/Chemistry/chemistry/electrons/ionization-energy-scorm/src/index.html> |
| `chemistry/imfs/intermolecular-forces-liquids-scorm/` | <https://coachcherry1.github.io/Chemistry/chemistry/imfs/intermolecular-forces-liquids-scorm/src/index.html> |
| `chemistry/imfs/intermolecular-forces-scorm/` | <https://coachcherry1.github.io/Chemistry/chemistry/imfs/intermolecular-forces-scorm/src/index.html> |
| `chemistry/nomenclature/acids-scorm/` | <https://coachcherry1.github.io/Chemistry/chemistry/nomenclature/acids-scorm/src/index.html> |
| `chemistry/nomenclature/ionic-covalent-scorm/` | <https://coachcherry1.github.io/Chemistry/chemistry/nomenclature/ionic-covalent-scorm/src/index.html> |
| `chemistry/nomenclature/ionic-naming-scorm/` | <https://coachcherry1.github.io/Chemistry/chemistry/nomenclature/ionic-naming-scorm/src/index.html> |
| `organic-chemistry/configurations-stereoisomerism/chirality-no-meso-scorm/` | <https://coachcherry1.github.io/Chemistry/organic-chemistry/configurations-stereoisomerism/chirality-no-meso-scorm/src/index.html> |
| `organic-chemistry/configurations-stereoisomerism/chirality-scorm/` | <https://coachcherry1.github.io/Chemistry/organic-chemistry/configurations-stereoisomerism/chirality-scorm/src/index.html> |
| `organic-chemistry/configurations-stereoisomerism/cyclohexane-chairs-scorm/` | <https://coachcherry1.github.io/Chemistry/organic-chemistry/configurations-stereoisomerism/cyclohexane-chairs-scorm/src/index.html> |
| `organic-chemistry/configurations-stereoisomerism/newman-projections-qualitative-scorm/` | <https://coachcherry1.github.io/Chemistry/organic-chemistry/configurations-stereoisomerism/newman-projections-qualitative-scorm/src/index.html> |
| `organic-chemistry/configurations-stereoisomerism/newman-projections-scorm/` | <https://coachcherry1.github.io/Chemistry/organic-chemistry/configurations-stereoisomerism/newman-projections-scorm/src/index.html> |
| `organic-chemistry/reactivity-mechanisms/arrow-pushing-scorm/` | <https://coachcherry1.github.io/Chemistry/organic-chemistry/reactivity-mechanisms/arrow-pushing-scorm/src/index.html> |
| `organic-chemistry/spec-nmr/ir-ms-combined-scorm/` | <https://coachcherry1.github.io/Chemistry/organic-chemistry/spec-nmr/ir-ms-combined-scorm/src/index.html> |
| `organic-chemistry/spec-nmr/ir-spectroscopy-scorm/` | <https://coachcherry1.github.io/Chemistry/organic-chemistry/spec-nmr/ir-spectroscopy-scorm/src/index.html> |
| `organic-chemistry/spec-nmr/ms-spectrometry-scorm/` | <https://coachcherry1.github.io/Chemistry/organic-chemistry/spec-nmr/ms-spectrometry-scorm/src/index.html> |
| `organic-chemistry/spec-nmr/nmr-intro-scorm/` | <https://coachcherry1.github.io/Chemistry/organic-chemistry/spec-nmr/nmr-intro-scorm/src/index.html> |
| `organic-chemistry/substitution-elimination/substitution-elimination-scorm/` | <https://coachcherry1.github.io/Chemistry/organic-chemistry/substitution-elimination/substitution-elimination-scorm/src/index.html> |

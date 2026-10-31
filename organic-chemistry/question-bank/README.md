# Organic question bank (Klein chapters 2 to 11)

About 100 questions per chapter (50 multiple choice, 50 free response), drawn structures included. Chapters 3, 4 and 7 count the
older acid-base quiz, the problem bank and the substitution/elimination problems toward their 100.

## Difficulty scale (every question has one, editable in the index)

| Level | Name | Meaning |
| --- | --- | --- |
| 1 | Easy | One fact or definition |
| 2 | Basic | One rule applied once |
| 3 | Moderate | Two steps, or compare two things |
| 4 | Hard | Several ideas together, still reachable in high school |
| 5 | Very hard | Klein's Challenge level. Not written; kept for teacher re-ranking |

Klein's own order, easiest to hardest: Practice, ACS-style multiple choice, Integrated, Challenge.

## Building

```bash
cd organic-chemistry/question-bank/build
python3 build.py          # all chapters: writes questions.json and images/
python3 build.py 8        # one chapter (does not write questions.json)
cd ../../.. && python3 tools/build_index.py
```

Each `chNN.py` holds that chapter's questions through the `Bank` calls in `qb.py` (`mc`, `fr`, `mcname`, `mcring`, `mcstruct`).
Drawings are specs (`S`, `R`, `E`, `A`, `CH`, `CF`, `NW`) rendered by `_shared/chemdraw.py`. The build checks names with OPSIN, atom
balance (`bal=`), distinct options and duplicate stems. R/S, E/Z and enantiomer/diastereomer answers are computed with RDKit.

Change a difficulty or wording in the index (Edit), export, then `python3 tools/apply_edits.py <file>`. Override key `difficulty`
works for `Q##`, `P###` and `C##M##` / `C##F##` ids.

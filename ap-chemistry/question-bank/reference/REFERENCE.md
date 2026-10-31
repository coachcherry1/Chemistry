# AP Chemistry question bank: reference

This folder is the reference for writing AP Chemistry questions later. Everything here is released College Board material
(or a College Board style practice exam), kept as published. Nothing here is our own wording.

## Free-response questions (2015 to 2026, no 2020 exam)

- `reference/frq-pdfs/ap<year>-frq-chemistry.pdf`: the released question paper for each year (7 questions: 3 long at 10 points, 4 short at 4 points).
  Sources: the archive page at adriandingleschemistrypages.com/apfrqarchives-2/ (AP Central for 2023 to 2026, mirrors for 2015 to 2022).
  The papers carry no scoring guidelines, so no answer key is stored.
- `reference/frq-text/ap<year>.md`: the clean text of every question, one file per year. Prose is copied from the paper; equations, subscripts, charges,
  Greek letters and tables are retyped by hand from the page image, and each diagram or graph has a bracketed description. Use these when you need the
  exact wording. Numbers were checked against the PDF text. The questions in `frqs.json` and the index search use this text.
- `reference/text/ap<year>-frq-chemistry.txt`: the raw text copied out of each PDF (rough: formulas and tables come out garbled).
- `frqs.json` and `images/AP<year>F<n>.png`: every question cut out with its diagrams, tables, graphs and particle drawings, exactly as printed
  (the exam directions and answer-box frames are removed). `build/frq_extract.py` makes them from the PDFs, `build/build_bank.py` writes
  `questions.json`, which the index reads. Unit tags are in `build/ap_meta.py`.
- Difficulty starts at 4 (Hard) for the three long questions and 3 (Moderate) for the short ones. Change any of them in the index.

### Which units each question covers (hand-tagged, a question can cover several)

| Year | Q1 (long) | Q2 (long) | Q3 (long) | Q4 | Q5 | Q6 | Q7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2015 | 9,1 | 2,3,9 | 4,8 | 7 | 5 | 2,3 | 6,9 |
| 2016 | 6,2,1 | 4,9,2 | 4,3 | 8,9 | 5 | 7,3 | 8,4 |
| 2017 | 3,4,5 | 2,6 | 7 | 3 | 6 | 7,2 | 9,4 |
| 2018 | 6,4 | 7 | 1,3,9 | 3 | 8 | 9 | 1,5 |
| 2019 | 2,3,9 | 2,3,6 | 4 | 3 | 1 | 5 | 4 |
| 2021 | 8,4,2 | 1,3,9 | 4,3 | 6 | 9 | 2,7 | 3 |
| 2022 | 4,3,8 | 2,7,9 | 1,9 | 2,3 | 5 | 3 | 2,7 |
| 2023 | 1,4,9 | 6,2,7 | 5,4 | 8 | 3,8 | 3,2 | 7 |
| 2024 | 8 | 4,9,8 | 1,9,4 | 6 | 7 | 5 | 3,4 |
| 2025 | 1 | 1,8 | 2,6,9 | 2,3 | 2,3 | 9 | 8,2 |
| 2026 | 1,6 | 2,4 | 8 | 2,7 | 2,3 | 3 | 6,4 |

| Unit | Name | Questions tagged |
| --- | --- | --- |
| 1 | Atomic Structure and Properties | 12 |
| 2 | Molecular and Ionic Compound Structure and Properties | 22 |
| 3 | Intermolecular Forces and Properties | 24 |
| 4 | Chemical Reactions | 19 |
| 5 | Kinetics | 8 |
| 6 | Thermodynamics | 12 |
| 7 | Equilibrium | 12 |
| 8 | Acids and Bases | 13 |
| 9 | Applications of Thermodynamics | 18 |

## Multiple-choice practice exams (Section I)

- `reference/mcq-pdfs/ap-chemistry-practice-exam-2013-section1.pdf`: 60 questions, 90 minutes, no calculator (the 2013 College Board practice exam).
- `reference/mcq-pdfs/ap-chemistry-practice-exam-2-section1.pdf`: practice exam 2, Section I, 60 questions with an answer sheet.
- `reference/text/` has the text of both. Neither file has an answer key.

## How to use this when writing AP questions

- Match the exam style: four choices (A to D), one best answer, short stems, data in tables, graphs, particle diagrams and Lewis diagrams.
- Long free-response questions chain 5 to 8 parts on one scenario (experiment, then calculation, then justification). Short ones are 3 to 4 parts.
- Common verbs: calculate, justify, explain (in terms of ...), identify, write, draw, predict, determine. "Justify" and "explain" always want a reason from principles.
- Check coverage against the unit table above before choosing a topic so the bank stays balanced.
- Use "thermodynamically favorable", never "spontaneous", as in the other courses.

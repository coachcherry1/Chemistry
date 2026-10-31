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

### Which units each question covers (hand-tagged to the Fall 2024 CED unit names, a question can cover several)

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

| Unit | Name | Exam weighting | Questions tagged |
| --- | --- | --- | --- |
| 1 | Atomic Structure and Properties | 7-9% | 12 |
| 2 | Compound Structure and Properties | 7-9% | 22 |
| 3 | Properties of Substances and Mixtures | 18-22% | 24 |
| 4 | Chemical Reactions | 7-9% | 19 |
| 5 | Kinetics | 7-9% | 8 |
| 6 | Thermochemistry | 7-9% | 12 |
| 7 | Equilibrium | 7-9% | 12 |
| 8 | Acids and Bases | 11-15% | 13 |
| 9 | Thermodynamics and Electrochemistry | 7-9% | 18 |

## Course and Exam Description (CED)

- `reference/ced/ap-chemistry-course-and-exam-description.pdf`: the official AP Chemistry CED, effective Fall 2024 (238 pages), downloaded from AP Central.
  `reference/text/ap-chemistry-ced.txt` is its text. It holds the course framework (all nine units with every topic's learning objectives, essential
  knowledge and suggested skills), the six science practices, the exam overview, sample exam questions, scoring guidelines, and the equations and constants sheet.
- Use it to write new questions that match the course: pick a unit and topic, copy the learning objective's verb and level, and tag the question with the unit.
- Exam format: Section I is 60 multiple-choice questions (90 minutes, no calculator). Section II is 7 free-response questions (105 minutes): 3 long (10 points each)
  and 4 short (4 points each).
- Science practices: 1 Models and Representations, 2 Question and Method, 3 Representing Data and Phenomena, 4 Model Analysis, 5 Mathematical Routines,
  6 Argumentation. Weighting in multiple choice: practice 5 is 35-42%, practice 4 is 23-30%, practices 1, 2 and 6 are 8-12% each (practice 3 is not tested).
  In free response: practice 5 is 43-53%, practice 6 is 15-24%, practice 2 is 10-16%, practice 3 is 8-16%, practice 4 is 5-9%, practice 1 is 2-4%.
- Task verbs used in free-response questions: Calculate, Describe, Determine, Estimate, Explain, Identify/Indicate/Circle, Justify, Make a claim,
  Predict, and Represent/Draw/Write an Equation/Complete a Diagram. "Justify" supplies evidence or reasoning for a claim; "Explain" says how or why.

## Multiple-choice practice exams (Section I)

- `reference/mcq-pdfs/ap-chemistry-practice-exam-2013-section1.pdf`: 60 questions, 90 minutes, no calculator (the 2013 College Board practice exam, written for the older course, so check its topics against the CED).
- `reference/mcq-pdfs/ap-chemistry-practice-exam-2-section1.pdf`: practice exam 2, Section I, 60 questions with an answer sheet.
- `reference/text/` has the text of both. Neither file has an answer key.

## How to use this when writing AP questions

- Match the exam style: four choices (A to D), one best answer, short stems, data in tables, graphs, particle diagrams and Lewis diagrams.
- Long free-response questions chain 5 to 8 parts on one scenario (experiment, then calculation, then justification). Short ones are 3 to 4 parts.
- Common verbs: calculate, justify, explain (in terms of ...), identify, write, draw, predict, determine. "Justify" and "explain" always want a reason from principles.
- Check coverage against the unit table above before choosing a topic so the bank stays balanced.
- Use "thermodynamically favorable", never "spontaneous", as in the other courses.

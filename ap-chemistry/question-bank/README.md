# AP Chemistry question bank

77 released AP Chemistry free-response questions (2015 to 2026, no 2020), each cut out as printed with all its diagrams, tagged by AP unit
and shown in the index (AP Chemistry tab) with a difficulty you can change. See `reference/REFERENCE.md` for sources, the unit table and
the two multiple-choice practice exams kept for writing questions later.

```bash
cd ap-chemistry/question-bank/build
python3 frq_extract.py   # PDFs in reference/frq-pdfs -> images/ and frqs.json (needs poppler and Pillow)
python3 build_bank.py    # frqs.json + difficulty edits -> questions.json
cd ../../.. && python3 tools/build_index.py
```

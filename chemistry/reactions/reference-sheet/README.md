# Activity series and solubility rules: the printable references

Two one-page Letter PDFs for honors chemistry, in a Times-style serif font (Times New Roman where it is installed; here
Liberation Serif, which has the same letter widths, embedded in the PDF):

- `Activity_Series_and_Solubility_Rules.pdf`: the full sheet. The two tables, and a short "using the series" and "using the
  rules" box under each.
- `Activity_Series_and_Solubility_Rules_Assessment.pdf`: the same two tables and nothing else. The rules for using them
  (a metal replaces any metal below it; trade the partners and look up both products; an insoluble product is a solid, no
  solid means no reaction) are left off: students are to have them memorized for assessments.

The solubility table has two answers only, soluble (aq) or insoluble (s), as a novice chemist would see them: there is no
middle category (calcium hydroxide is a solid).

Both are built from the same data as the on-screen reference of `../predicting-products-scorm/` (`src/js/ions.js`), so the
sheets and the activity cannot disagree. After changing that data:

```bash
node build.js        # writes both .pdf files and the .html they are printed from; fails if either runs past one page
```

What was corrected from the class's older sheet is listed in `../predicting-products-scorm/README.md`.

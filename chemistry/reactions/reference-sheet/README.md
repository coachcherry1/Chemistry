# Activity series and solubility rules: the printable reference

`Activity_Series_and_Solubility_Rules.pdf` is a one-page Letter handout for honors chemistry, in a Times-style serif font
(Times New Roman where it is installed; here Liberation Serif, which has the same letter widths, embedded in the PDF).

It is built from the same data as the on-screen reference of `../predicting-products-scorm/` (`src/js/ions.js`), so the
sheet and the activity cannot disagree. After changing that data:

```bash
node build.js        # writes the .pdf and the .html it is printed from; fails if it runs past one page
```

What was corrected from the class's older sheet is listed in `../predicting-products-scorm/README.md`.

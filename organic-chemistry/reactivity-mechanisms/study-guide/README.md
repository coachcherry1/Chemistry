# Reactions and Mechanisms study guide (Klein, Chapter 6)

Two Word files, built from the arrow-pushing activity's own model:

- `Reactions_and_Mechanisms_Study_Guide.docx`: 15 questions (about twice the length of the Reactions and Mechanisms test).
  Letter, 0.5 in margins, plain paragraphs and pictures only (no tables, columns or auto-numbering), so any question can be
  copied or cut out whole. The part letters sit inside the pictures.
- `Reactions_and_Mechanisms_Study_Guide_Answer_Key.docx`: answers with the arrows drawn in, the pattern of every step named,
  and the reasoning.

Question types follow the test: rank carbocations, mark electrophilic centres (with resonance), name the sequence of patterns,
draw the curved arrows of a mechanism, will it rearrange, name the pattern of a step, multiple choice on step types, short
explanations, and a challenge. Mechanisms and carbocations come from `arrow-pushing-scorm/` plus new ones in
`build/extra-scenes.js` (alkene hydration, alcohol dehydration, new carbocations and enones).

Rebuild: `node build/make.js` (needs Playwright and the `docx` package). It renders each figure in Chromium from `chem.js`,
`scenes.js` and `render.js` (the activity is not changed), then writes both files. Every new scene is checked as it is built:
its arrows must obey Klein's rules (`Chem.apply`) and make the product written for it.

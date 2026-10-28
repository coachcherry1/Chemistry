/* tools/answer-key.js — regenerates ANSWER_KEY.md from the item bank so the
 * teacher key can never drift away from what the activity actually draws.
 *
 *   node tools/answer-key.js > ANSWER_KEY.md
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'js');
for (const f of ['shifts.js', 'molecules.js', 'analysis.js', 'spectrum.js', 'levels.js']) {
  eval(fs.readFileSync(path.join(src, f), 'utf8'));
}

const out = [];
const p = (s) => out.push(s == null ? '' : s);

p('# Answer key — ¹H NMR: An Introduction');
p();
p('Generated from `src/js/molecules.js` by `node tools/answer-key.js`. Do not hand-edit:');
p('change the bank and regenerate, so the key and the activity stay in step.');
p();
p('**Shifts** are literature values in CDCl₃. Each spectrum is drawn with a seeded jitter of');
p('up to ±0.015 ppm, so a signal moves very slightly between attempts.');
p();
p('**Integration and splitting are not typed in.** The H count of each set and the number of');
p('neighbouring H that split it are counted from the structure by `src/js/analysis.js`, using');
p('the first-order rules the activity teaches: only H on directly bonded atoms split a signal,');
p('equivalent H do not split each other, and O–H hydrogens exchange, so they neither split');
p('nor are split. Longer-range coupling (for example the allylic coupling in 2-methylpropene)');
p('is ignored. Spectra are simulated at 60 MHz with J = 7 Hz throughout.');
p();
p('**Region** is the row of the shift table each set belongs to, with its range in ppm.');
p();

const levelNames = LEVELS.map(L => 'L' + L.n + ' ' + L.name);
p('## Levels');
p();
p('| Level | Compounds drawn | Every run includes |');
p('| --- | :---: | --- |');
for (const L of LEVELS) p('| ' + L.n + ' — ' + L.name + ' | ' + L.items + ' | ' + (L.includes || '') + ' |');
p();

p('## Contents');
p();
const byFamily = {};
for (const m of MOLECULES) (byFamily[m.family] = byFamily[m.family] || []).push(m);
for (const fam of Object.keys(byFamily)) {
  p('- **' + FAMILIES[fam] + '** — ' + byFamily[fam].map(m => m.name).join(', '));
}
p();

function decoys(m) {
  return MOLECULES.filter(d => d.id !== m.id && !Chem.indistinguishable(d, m))
    .map(d => ({ d, score: Chem.similarity(m, d) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.d);
}

for (const m of MOLECULES) {
  const sets = Chem.sets(m).slice().sort((a, b) => b.d - a.d);
  p('## ' + m.name);
  p();
  p('`' + m.id + '` · ' + FAMILIES[m.family] + ' · ' + m.formula + ' · appears in ' +
    m.levels.map(n => levelNames[n - 1]).join(', '));
  p();
  p('**' + Chem.plural(sets.length, 'signal') + '.**');
  p();
  p('| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |');
  p('| :---: | --- | ---: | ---: | --- | --- | --- |');
  for (const s of sets) {
    const r = REGIONS[s.r];
    const split = s.oh ? 'singlet (O–H, exchanges)' : s.mult + ' (n = ' + s.n + ')';
    p('| ' + s.id + ' | ' + s.text + ' | ' + s.d.toFixed(2) + ' | ' + s.nH + ' | ' + split + ' | ' +
      r.label + ', ' + rangeText(r) + ' | ' + s.all + ' |');
  }
  p();
  const multi = Chem.sets(m).filter(s => s.atoms.length > 1);
  if (multi.length && m.levels.indexOf(1) >= 0) {
    p('Equivalence (Level 1): ' + multi.map(s => '**' + s.id + '** — ' + s.why + '.').join(' '));
    p();
  }
  if (m.levels.indexOf(5) >= 0) {
    p('Usual Level 5 decoys, and the evidence that rules each out:');
    p();
    for (const d of decoys(m)) p('- **' + d.name + '** — ' + Chem.contrast(m, d));
    p();
  }
}

console.log(out.join('\n'));

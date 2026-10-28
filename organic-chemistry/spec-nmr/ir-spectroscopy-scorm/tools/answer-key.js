/* tools/answer-key.js — regenerates ANSWER_KEY.md from the item bank so the
 * teacher key can never drift away from what the activity actually draws.
 *
 *   node tools/answer-key.js > ANSWER_KEY.md
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'js');
eval(fs.readFileSync(path.join(src, 'groups.js'), 'utf8'));
eval(fs.readFileSync(path.join(src, 'molecules.js'), 'utf8'));

const out = [];
out.push('# Answer key — IR Spectroscopy: The Diagnostic Region');
out.push('');
out.push('Generated from `src/js/molecules.js` by `node tools/answer-key.js`. Do not hand-edit:');
out.push('change the band table and regenerate, so the key and the activity stay in step.');
out.push('');
out.push('**Scored bands** are the drop targets a student must label. The *drawn* value is the');
out.push('centre this package uses; the *accepted window* is the wavenumber range a label may be');
out.push('dropped in, chosen to match the range in a standard correlation table. Each spectrum is');
out.push('drawn with a small seeded jitter about the drawn value, so the peak a student sees moves');
out.push('by a few wavenumbers between attempts and always stays inside the accepted window.');
out.push('');
out.push('**Every scored band is above 1500 cm⁻¹.** The fingerprint region is drawn and is listed');
out.push('below for each compound, but nothing there is ever a drop target — including C–O, which');
out.push('is named so you can point at it in class without the activity asking students to label it.');
out.push('');
out.push('The sp² and sp³ C–H windows meet exactly at 3000 cm⁻¹, the line drawn on the plot.');
out.push('');

const byClass = {};
for (const m of MOLECULES) (byClass[m.cls] = byClass[m.cls] || []).push(m);

out.push('## Contents');
out.push('');
for (const cls of Object.keys(byClass)) {
  out.push('- **' + cls + '** — ' + byClass[cls].map(m => m.name).join(', '));
}
out.push('');

for (const m of MOLECULES) {
  out.push('## ' + m.name);
  out.push('');
  const levelOf = { find: 'Level 1', name: 'Levels 2 and 3' };
  out.push('`' + m.id + '` · ' + m.cls + ' · ' + m.formula +
           ' · theme `' + m.theme + '` · appears in ' +
           m.tags.map(t => levelOf[t] || t).join(' and '));
  out.push('');
  out.push('| Scored band | Drawn (cm⁻¹) | Accepted window | Literature range | Discriminator |');
  out.push('| --- | ---: | :---: | :---: | --- |');
  for (const b of m.bands.filter(b => b.t)) {
    const g = GROUPS[b.g];
    out.push('| ' + g.label + ' | ' + b.c + ' | ' + b.tol[0] + '–' + b.tol[1] +
             ' | ' + g.range + ' | ' + g.hint + ' |');
  }
  const named = m.bands.filter(b => !b.t && b.g);
  if (named.length) {
    out.push('');
    out.push('Drawn but never scored: ' +
             named.map(b => GROUPS[b.g].label + ' at ' + b.c).join(', ') + ' cm⁻¹ — ' +
             'below the 1500 line, so it is corroboration rather than a question.');
  }
  const extra = m.bands.filter(b => !b.t && !b.g);
  if (extra.length) {
    out.push('');
    out.push('Supporting bands (drawn, not scored): ' +
             extra.map(b => b.c).sort((a, b) => b - a).join(', ') + ' cm⁻¹.');
  }
  out.push('');
}

out.push('## What each level asks for');
out.push('');
out.push('**Level 1** asks for the family of each scored band, with the compound named and the');
out.push('correlation table available.');
out.push('');
out.push('**Level 2** asks for the specific group, with the compound hidden and the correlation');
out.push('table withdrawn. Tiles still carry their wavenumber range.');
out.push('');
out.push('**Level 3** is Level 2 with the wavenumber ranges stripped off the tiles, so the');
out.push('student places each label from memory. Levels 2 and 3 draw from the same pool but');
out.push('avoid reusing a compound, so a student normally meets fourteen different spectra.');
out.push('');
out.push('## The compound question');
out.push('');
out.push('Levels 2 and 3 end by asking which compound produced the spectrum. The two decoys are');
out.push('chosen to need reasoning rather than recognition: each one shares the headline group');
out.push('where the bank allows, and an isomer is preferred, so 1-butanol is offered against');
out.push('phenol (aromatic vs aliphatic alcohol) and diethyl ether (its C₄H₁₀O isomer, with no');
out.push('O–H at all) rather than against something obviously unrelated.');
out.push('');
out.push('A decoy whose **scored peaks match the answer exactly** is never offered — the labelled');
out.push('peaks could not separate them, so the question would be a coin toss. Below, the most');
out.push('likely pairings; the ranking is jittered, so runs vary.');
out.push('');
out.push('| Compound | Usual decoys | What separates them |');
out.push('| --- | --- | --- |');

const SIG = {}, DIST = {};
for (const m of MOLECULES) {
  SIG[m.id] = [...new Set(m.bands.filter(b => b.t).map(b => b.g))].sort();
  DIST[m.id] = SIG[m.id].filter(g => g !== 'ch_sp3');
}
function rank(answer) {
  const aSig = SIG[answer.id].join(','), aDist = DIST[answer.id];
  return MOLECULES.filter(m => m.id !== answer.id && SIG[m.id].join(',') !== aSig)
    .map(m => {
      const d = DIST[m.id];
      const shared = d.filter(g => aDist.includes(g)).length;
      const apart = d.length + aDist.length - 2 * shared;
      return { m, score: shared * 2 - apart + (m.theme === answer.theme ? 4 : 0) +
                        (m.formula === answer.formula ? 3 : 0) };
    }).sort((a, b) => b.score - a.score);
}
for (const m of MOLECULES.filter(m => m.tags.includes('name'))) {
  const top = rank(m).slice(0, 2);
  /* stated as what rules the DECOY out, which is how a student works it */
  const diffs = top.map(({ m: d }) => {
    const present = DIST[m.id].filter(g => !DIST[d.id].includes(g)).map(g => GROUPS[g].label);
    const absent = DIST[d.id].filter(g => !DIST[m.id].includes(g)).map(g => GROUPS[g].label);
    const bits = [];
    if (present.length) bits.push(present.join(' + ') + ' being present');
    if (absent.length) bits.push(absent.join(' + ') + ' being absent');
    return '**' + d.name + '** ruled out by ' + bits.join(' and ');
  });
  out.push('| ' + m.name + ' | ' + top.map(t => t.m.name).join(', ') + ' | ' +
           diffs.join('; ') + ' |');
}
out.push('');
out.push('The four C–H groups are the exception: they are asked for by name at **both** levels.');
out.push('A single “C–H” tile would make the sp² and sp³ peaks interchangeable, which is the');
out.push('distinction the 3000 cm⁻¹ line exists to teach.');
out.push('');
out.push('| Level 1 asks for | Which covers |');
out.push('| --- | --- |');
for (const key of UNIVERSE.family) {
  const members = FAMILIES[key]
    ? Object.keys(GROUPS).filter(k => GROUPS[k].family === key && !GROUPS[k].atomic &&
                                      !GROUPS[k].fingerprint).map(k => GROUPS[k].label)
    : ['asked by name at both levels'];
  out.push('| ' + keyLabel(key) + ' | ' + members.join(', ') + ' |');
}
out.push('');

console.log(out.join('\n'));

/* tools/validate.js — chemistry and item-bank checks. Run after ANY edit to a
 * species, a pool or a question.
 *
 *   node tools/validate.js
 *
 * Exits non-zero if the activity would teach something that disagrees with
 * the 5 rules: a hand-written answer the rules don't produce, a species with
 * resonance, a central atom that is not the first one written, a quiz answer
 * that no longer matches the chemistry, a wrong drawing that the builder
 * would accept.
 */
const fs = require('fs');
const path = require('path');

/* just enough of a browser for the data and logic files to load */
global.window = { addEventListener() {} };
global.document = { addEventListener() {} };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const src = path.join(__dirname, '..', 'src', 'js');
for (const f of ['util.js', 'elements.js', 'species.js', 'lewis.js', 'snark.js', 'quiz.js', 'scorm.js', 'app.js']) {
  (0, eval)(fs.readFileSync(path.join(src, f), 'utf8'));
}

const problems = [];
const fail = (msg) => problems.push(msg);
const ids = Object.keys(SPECIES);

/* ------------------------------------------------ each species on its own */

const resonance = (sp) => {
  /* Every finished structure Rule 5 can reach; the ones with the smallest
     total |formal charge| are how a textbook would draw it. More than one of
     those means resonance (O₃, CO₃²⁻, NO₃⁻, HNO₃ ...). */
  const outs = Lewis.rule5Outcomes(sp);
  const fc = (s) => Lewis.filled(s).reduce((a, k) => a + Math.abs(Lewis.formalCharge(s, k)), 0);
  const best = Math.min(...outs.map(fc));
  return outs.filter((s) => fc(s) === best).length;
};

for (const id of ids) {
  const raw = SPECIES[id];
  let sp;
  try { sp = Lewis.species(id); } catch (e) { fail(`${id}: ${e.message}`); continue; }

  /* formula and layout agree */
  for (const p of sp.parts) if (!ELEMENTS[p.el]) fail(`${id}: unknown element ${p.el}`);
  const count = {};
  sp.parts.forEach((p) => { count[p.el] = (count[p.el] || 0) + p.n; });
  const placed = { [sp.center]: 1 };
  Object.keys(raw.layout).forEach((d) => {
    if (!'NESW'.includes(d) || d.length !== 1) fail(`${id}: layout key ${d} is not N, E, S or W`);
    const a = raw.layout[d];
    if (a === 'OH') { placed.O = (placed.O || 0) + 1; placed.H = (placed.H || 0) + 1; }
    else placed[a] = (placed[a] || 0) + 1;
  });
  if (JSON.stringify(Object.keys(count).sort().map((k) => [k, count[k]])) !==
      JSON.stringify(Object.keys(placed).sort().map((k) => [k, placed[k]]))) {
    fail(`${id}: layout ${JSON.stringify(raw.layout)} does not hold the atoms of ${raw.formula}`);
  }

  /* Rule 2: the first atom written (not H) is the least electronegative */
  const nonH = Object.keys(count).filter((e) => e !== 'H' && e !== sp.center);
  for (const e of nonH) {
    if (ELEMENTS[e].en <= ELEMENTS[sp.center].en) {
      fail(`${id}: ${sp.center} is written first but ${e} is less electronegative — Rule 2 would put the wrong atom in the center`);
    }
  }
  if (sp.acid) {
    if (sp.center === 'O') fail(`${id}: an oxyacid with O in the center`);
    Object.keys(raw.layout).forEach((d) => {
      if (raw.layout[d] === 'H') fail(`${id}: an oxyacid with an H on the central atom`);
    });
  }
  if (!sp.acid && count.H && count.O && sp.center !== 'O' && Object.values(raw.layout).includes('O') &&
      /^H/.test(raw.formula)) {
    fail(`${id}: formula starts with H and has O, but no H sits on an O — is it an oxyacid?`);
  }

  /* the 5 rules, run */
  const r = Lewis.solve(sp);
  if (r.total % 2) fail(`${id}: odd number of electrons (${r.total})`);
  if (r.left2 < 0) fail(`${id}: not enough electrons for the single bonds`);
  if (r.left3 < 0) fail(`${id}: Rule 3 needs more electrons than there are`);
  if (r.left3 % 2) fail(`${id}: an odd number left for the central atom`);
  if (r.centerAfter4 > 8) {
    fail(`${id}: Rule 4 gives ${sp.center} ${r.centerAfter4} electrons — a legitimate expanded octet, which this activity leaves out`);
  }
  const fin = r.s5;
  const acc = Lewis.accepted(fin, sp);
  if (!acc.ok) fail(`${id}: the rules' own answer is not accepted (${acc.problems.join(', ')})`);
  if (Lewis.electrons(fin, 'C') !== 8) fail(`${id}: central atom ends with ${Lewis.electrons(fin, 'C')}`);
  Lewis.filled(fin).forEach((k) => {
    const e = Lewis.electrons(fin, k);
    if (ELEMENTS[fin.at[k]].period === 2 && e > 8) fail(`${id}: ${fin.at[k]} in ${k} has ${e}`);
    if (Lewis.roomFor(fin, k) < 0) fail(`${id}: ${fin.at[k]} in ${k} has more lone pairs than free sides`);
  });
  if (Lewis.expanded(fin)) fail(`${id}: the answer expands the octet`);

  /* the hand-written key */
  const bo = Lewis.DIRS.filter((d) => fin.at[d]).map((d) => fin.bo[d]).sort((a, b) => b - a).join('');
  if (r.total !== raw.key.e) fail(`${id}: key says ${raw.key.e} electrons, the rules give ${r.total}`);
  if (bo !== raw.key.bo) fail(`${id}: key says bonds ${raw.key.bo}, the rules give ${bo}`);
  if (fin.lp.C !== raw.key.clp) fail(`${id}: key says ${raw.key.clp} lone pairs on ${sp.center}, the rules give ${fin.lp.C}`);

  /* every structure Rule 5 can reach is a full-octet structure, and there is no resonance */
  for (const s of Lewis.rule5Outcomes(sp)) {
    const a = Lewis.accepted(s, sp);
    if (!a.ok) fail(`${id}: Rule 5 can reach a structure the builder rejects (${a.problems.join(', ')})`);
  }
  const n = resonance(sp);
  if (n !== 1) fail(`${id}: ${n} equally good structures — resonance, which this activity avoids`);
}

/* the resonance check itself must catch the classic cases */
const probe = {
  CO3x: { formula: 'CO3', charge: -2, name: 'carbonate', layout: { W: 'O', E: 'O', N: 'O' }, key: {} },
  O3x: { formula: 'OO2', charge: 0, name: 'ozone', layout: { W: 'O', E: 'O' }, key: {} },
  HNO3x: { formula: 'HNO3', charge: 0, name: 'nitric acid', layout: { W: 'OH', E: 'O', N: 'O' }, key: {} },
  NO2x: { formula: 'NO2', charge: -1, name: 'nitrite', layout: { W: 'O', E: 'O' }, key: {} }
};
Object.assign(SPECIES, probe);
for (const id of Object.keys(probe)) {
  if (resonance(Lewis.species(id)) < 2) fail(`resonance check missed ${probe[id].name}`);
  delete SPECIES[id];
}

/* --------------------------------------------------------- steps and pools */

for (const s of App.STEPS) {
  if (s.sp && !SPECIES[s.sp]) fail(`step ${s.id}: unknown species ${s.sp}`);
  if (s.pool && !POOLS[s.pool]) fail(`step ${s.id}: unknown pool ${s.pool}`);
  if (s.kind === 'quiz' && !QUIZZES[s.quiz]) fail(`step ${s.id}: unknown checkpoint ${s.quiz}`);
}
for (const k of Object.keys(POOLS)) {
  if (!POOLS[k].ids.length) fail(`pool ${k} is empty`);
  for (const id of POOLS[k].ids) if (!SPECIES[id]) fail(`pool ${k}: unknown species ${id}`);
}
const ionPool = POOLS.ion.ids.map((id) => Lewis.species(id));
if (!ionPool.every((sp) => sp.ion && !sp.acid)) fail('the oxyanion pool holds something that is not a plain oxyanion');
const acidPool = POOLS.acid.ids.map((id) => Lewis.species(id));
if (!acidPool.every((sp) => sp.acid)) fail('the oxyacid pool holds something that is not an oxyacid');
const multiPool = POOLS.multi.ids.map((id) => Lewis.species(id));
if (!multiPool.every((sp) => Lewis.solve(sp).moves.length > 0)) fail('the multiple-bond pool holds something without a multiple bond');

/* ---------------------------------------------------------------- quizzes */

const FACT = {
  total: (sp) => Lewis.solve(sp).total,
  left2: (sp) => Lewis.solve(sp).left2,
  clp: (sp) => Lewis.solve(sp).s5.lp.C,
  after4: (sp) => Lewis.solve(sp).centerAfter4,
  center: (sp) => sp.center,
  bo: (sp, slot) => Lewis.solve(sp).s5.bo[slot]
};

const seen = {};
let graded = 0;
for (const k of Object.keys(QUIZZES)) {
  const Q = QUIZZES[k];
  graded += Q.draw;
  if (Q.pool.length < Q.draw) fail(`checkpoint ${k}: pool of ${Q.pool.length} is smaller than its draw of ${Q.draw}`);
  for (const c of Q.core) if (!Q.pool.some((q) => q.id === c)) fail(`checkpoint ${k}: core question ${c} is not in the pool`);
  if (Q.core.length > Q.draw) fail(`checkpoint ${k}: more core questions than the draw`);
  for (const q of Q.pool) {
    if (seen[q.id]) fail(`duplicate question id ${q.id}`);
    seen[q.id] = 1;
    if (!/^[A-Za-z0-9_-]{1,255}$/.test(q.id)) fail(`${q.id}: not a valid SCORM interaction id`);
    if (q.choices.length < 2 || q.choices.length > 26) fail(`${q.id}: ${q.choices.length} choices`);
    if (!q.why) fail(`${q.id}: no explanation`);
    const texts = q.choices.filter((c) => typeof c === 'string');
    if (new Set(texts).size !== texts.length) fail(`${q.id}: two choices read the same`);

    if (q.fact) {
      const [kind, sid, extra] = q.fact;
      if (!SPECIES[sid]) { fail(`${q.id}: fact names unknown species ${sid}`); continue; }
      const want = String(FACT[kind](Lewis.species(sid), extra));
      if (q.choices[0] !== want) fail(`${q.id}: answer is ${q.choices[0]}, the rules give ${want}`);
      q.choices.slice(1).forEach((c) => { if (c === want) fail(`${q.id}: a wrong choice equals the right answer`); });
    }
    if (q.fig && !SPECIES[q.fig.lewis]) fail(`${q.id}: figure names unknown species ${q.fig.lewis}`);

    q.choices.forEach((c, i) => {
      if (typeof c === 'string') return;
      if (!SPECIES[c.lewis]) { fail(`${q.id}: choice ${i} names unknown species ${c.lewis}`); return; }
      const sp = Lewis.species(c.lewis);
      const s = Lewis.variant(sp, c.mod);
      const ok = Lewis.accepted(s, sp).ok;
      if (i === 0 && !ok) fail(`${q.id}: the correct drawing is not a valid structure`);
      if (i > 0 && ok) fail(`${q.id}: wrong choice ${i} is a valid structure`);
      Lewis.filled(s).forEach((k2) => {
        if (Lewis.roomFor(s, k2) < 0) fail(`${q.id}: choice ${i} has more lone pairs on ${k2} than can be drawn`);
      });
      if (i > 0 && JSON.stringify(s) === JSON.stringify(Lewis.canonical(sp))) fail(`${q.id}: choice ${i} draws the correct answer`);
    });
    const drawings = q.choices.filter((c) => typeof c !== 'string').map((c) => JSON.stringify(Lewis.variant(Lewis.species(c.lewis), c.mod)));
    if (new Set(drawings).size !== drawings.length) fail(`${q.id}: two drawings are the same`);
    (q.snark || []).forEach((i) => {
      if (i === 0) fail(`${q.id}: the correct answer is marked as snark`);
      if (i >= q.choices.length) fail(`${q.id}: snark index ${i} out of range`);
    });
  }
}
if (graded !== App.GRADED) fail(`GRADED is ${App.GRADED} but the checkpoints draw ${graded}`);

/* --------------------------------------------------------------- snark */

for (const k of ['first', 'quiz', 'again', 'cheer']) if (!SNARK[k] || !SNARK[k].length) fail(`SNARK.${k} is empty`);
for (const line of SNARK.again.concat(SNARK.quiz, SNARK.cheer)) {
  if (/\{[XF]\}/.test(line)) fail(`a snark line that can show up without a species uses {X} or {F}: "${line.slice(0, 40)}…"`);
}

/* ------------------------------------------------- suspend_data headroom */

const big = { v: 1, seed: 999999999, step: 16, max: 16, draws: {}, pool: { ion: 'H2PO4', acid: 'H2PO4', multi: 'H2CO3' },
  ans: {}, pick: {}, done: {}, fin: 1 };
for (const k of Object.keys(QUIZZES)) {
  big.draws[k] = QUIZZES[k].pool.slice(0, QUIZZES[k].draw).map((q) => q.id);
  big.draws[k].forEach((id) => { big.ans[id] = 1; big.pick[id] = 3; });
}
App.STEPS.forEach((s) => { big.done[s.id] = 1; });
const size = JSON.stringify(big).length;
if (size > 3500) fail(`saved state could reach ${size} characters; SCORM 1.2 allows 4096`);

/* ------------------------------------------------------------------ report */

if (problems.length) {
  console.error(problems.map((p) => '✗ ' + p).join('\n'));
  console.error(`\n${problems.length} problem(s).`);
  process.exit(1);
}
console.log(`✓ ${ids.length} species, ${Object.keys(seen).length} questions, ${App.STEPS.length} steps — all checks pass ` +
  `(saved state at most ${size} characters).`);

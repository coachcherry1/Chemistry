/* tools/validate.js — chemistry and item-bank checks. Run after ANY edit to a
 * species, the bond data, a pool or a question.
 *
 *   node tools/validate.js
 *
 * Exits non-zero if the activity would teach something that disagrees with
 * the 5 rules or with itself: a hand-written answer the rules don't produce,
 * a species with NON-equivalent resonance structures (beyond this class), a
 * central atom that is not the first one written, a hybrid whose charges
 * don't add up, a bond length outside its single/double range, a quiz answer
 * that no longer matches the chemistry, a wrong drawing that is actually
 * right.
 */
const fs = require('fs');
const path = require('path');

/* just enough of a browser for the data and logic files to load */
global.window = { addEventListener() {} };
global.document = { addEventListener() {} };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const src = path.join(__dirname, '..', 'src', 'js');
for (const f of ['util.js', 'elements.js', 'species.js', 'bonds.js', 'lewis.js', 'snark.js', 'hybrid.js', 'quiz.js',
                 'scorm.js', 'app.js']) {
  (0, eval)(fs.readFileSync(path.join(src, f), 'utf8'));
}

const problems = [];
const fail = (msg) => problems.push(msg);
const ids = Object.keys(SPECIES);

/* A structure with its slots forgotten: which atoms, how bonded, how many lone
   pairs. Two resonance structures are EQUIVALENT when these match — the same
   structure turned around. */
const signature = (s) => JSON.stringify([s.lp.C].concat(Lewis.DIRS.filter((d) => s.at[d]).map((d) => {
  const outer = Lewis.DIRS.map((e) => d + '2').filter((k) => s.at[k]).map((k) => [s.at[k], s.bo[k], s.lp[k]]).sort();
  return JSON.stringify([s.at[d], s.bo[d], s.lp[d], outer]);
}).sort()));
const equivalent = (sp) => new Set(Lewis.rule5Outcomes(sp).map(signature)).size === 1;
const count = (sp) => Lewis.rule5Outcomes(sp).length;

/* ------------------------------------------------ each species on its own */

for (const id of ids) {
  const raw = SPECIES[id];
  let sp;
  try { sp = Lewis.species(id); } catch (e) { fail(`${id}: ${e.message}`); continue; }

  /* formula and layout agree */
  for (const p of sp.parts) if (!ELEMENTS[p.el]) fail(`${id}: unknown element ${p.el}`);
  const atoms = {};
  sp.parts.forEach((p) => { atoms[p.el] = (atoms[p.el] || 0) + p.n; });
  const placed = { [sp.center]: 1 };
  Object.keys(raw.layout).forEach((d) => {
    if (Lewis.DIRS.indexOf(d) < 0) fail(`${id}: layout key ${d} is not one of ${Lewis.DIRS.join(' ')}`);
    const a = raw.layout[d];
    if (a === 'OH') { placed.O = (placed.O || 0) + 1; placed.H = (placed.H || 0) + 1; }
    else placed[a] = (placed[a] || 0) + 1;
  });
  if (JSON.stringify(Object.keys(atoms).sort().map((k) => [k, atoms[k]])) !==
      JSON.stringify(Object.keys(placed).sort().map((k) => [k, placed[k]]))) {
    fail(`${id}: layout ${JSON.stringify(raw.layout)} does not hold the atoms of ${raw.formula}`);
  }

  /* Rule 2: the first atom written (not H) is the least electronegative —
     except ozone, where every atom is O */
  const nonH = Object.keys(atoms).filter((e) => e !== 'H' && e !== sp.center);
  for (const e of nonH) {
    if (ELEMENTS[e].en <= ELEMENTS[sp.center].en) {
      fail(`${id}: ${sp.center} is written first but ${e} is less electronegative — Rule 2 would put the wrong atom in the center`);
    }
  }

  /* the 5 rules, run */
  const r = Lewis.solve(sp);
  if (r.total % 2) fail(`${id}: odd number of electrons (${r.total})`);
  if (r.left2 < 0) fail(`${id}: not enough electrons for the single bonds`);
  if (r.left3 < 0) fail(`${id}: Rule 3 needs more electrons than there are`);
  if (r.left3 % 2) fail(`${id}: an odd number left for the central atom`);
  if (r.centerAfter4 > 8 && ELEMENTS[sp.center].period < 3) fail(`${id}: period-2 ${sp.center} gets ${r.centerAfter4}`);
  if (r.centerTarget !== 8) fail(`${id}: an octet exception — not part of this activity`);
  const fin = r.s5;
  const acc = Lewis.accepted(fin, sp);
  if (!acc.ok) fail(`${id}: the rules' own answer is not accepted (${acc.problems.join(', ')})`);
  for (const [n, s] of [['Rule 2', r.s2], ['Rule 3', r.s3], ['Rule 4', r.s4], ['Rule 5', r.s5]]) {
    Lewis.filled(s).forEach((k) => {
      if (Lewis.roomFor(s, k) < 0) fail(`${id}: after ${n}, ${s.at[k]} in ${k} has more lone pairs than can be drawn`);
      const dirs = Lewis.freeSides(s, k);
      dirs.forEach((a, i) => dirs.forEach((b, j) => {
        if (j > i && Lewis.steps(a, b) === 1) fail(`${id}: after ${n}, two lone pairs on ${s.at[k]} in ${k} are squeezed together (${a}, ${b})`);
      }));
    });
  }

  /* the hand-written key */
  const bo = Lewis.DIRS.filter((d) => fin.at[d]).map((d) => fin.bo[d]).sort((a, b) => b - a).join('');
  if (r.total !== raw.key.e) fail(`${id}: key says ${raw.key.e} electrons, the rules give ${r.total}`);
  if (bo !== raw.key.bo) fail(`${id}: key says bonds ${raw.key.bo}, the rules give ${bo}`);
  if (fin.lp.C !== raw.key.clp) fail(`${id}: key says ${raw.key.clp} lone pairs on ${sp.center}, the rules give ${fin.lp.C}`);
  if (count(sp) !== raw.key.n) fail(`${id}: key says ${raw.key.n} resonance structure(s), Rule 5 gives ${count(sp)}`);

  /* every structure Rule 5 can reach is accepted by the builder, and they are
     all the same structure turned around */
  const outs = Lewis.rule5Outcomes(sp);
  for (const s of outs) {
    const a = Lewis.accepted(s, sp);
    if (!a.ok) fail(`${id}: Rule 5 can reach a structure the builder rejects (${a.problems.join(', ')})`);
    if (Lewis.electrons(s, 'C') !== 8) fail(`${id}: Rule 5 can leave ${sp.center} with ${Lewis.electrons(s, 'C')}`);
  }
  if (!equivalent(sp)) fail(`${id}: its resonance structures are NOT equivalent — beyond this class`);
  if (new Set(outs.map((s) => JSON.stringify([s.lp, s.bo]))).size !== outs.length) fail(`${id}: Rule 5 lists a structure twice`);

  /* the hybrid */
  const hy = Hybrid.compute(sp);
  if (hy.n !== outs.length) fail(`${id}: the hybrid averages ${hy.n} structures, not ${outs.length}`);
  if (JSON.stringify(hy.structures[0]) !== JSON.stringify(Lewis.canonical(sp))) fail(`${id}: structure A is not the answer key's structure`);
  if (hy.n > 1) {
    const vals = hy.cloud.map((k) => hy.orders[k]);
    if (hy.cloud.length < 2) fail(`${id}: resonance, but fewer than two bonds share the electrons`);
    if (new Set(vals).size !== 1) fail(`${id}: the shared bonds are not all the same order (${vals.join(', ')})`);
    if (['1½', '1⅓'].indexOf(hy.order) < 0) fail(`${id}: bond order ${hy.order} — this activity only explains 1½ and 1⅓`);
    if (Math.abs(hy.orderValue - (1 + 1 / hy.n)) > 1e-9) fail(`${id}: bond order ${hy.orderValue} is not 1 + 1/${hy.n}`);
    Object.keys(hy.orders).forEach((k) => {
      if (hy.cloud.indexOf(k) < 0 && hy.orders[k] % 1) fail(`${id}: a fractional bond outside the cloud`);
    });
  } else if (hy.cloud.length) fail(`${id}: no resonance, but the hybrid has a cloud`);
}

/* the equivalence check must catch the cases this class leaves out */
const probe = {
  CO2x: { formula: 'CO2', charge: 0, name: 'carbon dioxide', layout: { W: 'O', E: 'O' }, key: {} },
  HNO3x: { formula: 'HNO3', charge: 0, name: 'nitric acid', layout: { SW: 'OH', SE: 'O', N: 'O' }, key: {} },
  HCO3x: { formula: 'HCO3', charge: -1, name: 'bicarbonate', layout: { SW: 'OH', SE: 'O', N: 'O' }, key: {} }
};
Object.assign(SPECIES, probe);
for (const id of Object.keys(probe)) {
  if (equivalent(Lewis.species(id))) fail(`the equivalence check missed ${probe[id].name}`);
  delete SPECIES[id];
}
for (const id of ['CO3', 'NO3', 'O3']) if (!equivalent(Lewis.species(id))) fail(`the equivalence check rejects ${id}`);

/* ----------------------------------------------------------- bond lengths */

for (const id of Object.keys(BONDS)) {
  const b = BONDS[id];
  if (!SPECIES[id]) { fail(`BONDS.${id}: unknown species`); continue; }
  const sp = Lewis.species(id);
  if (count(sp) < 2) fail(`BONDS.${id}: no resonance — nothing to show`);
  if (!(b.double < b.actual && b.actual < b.single)) fail(`BONDS.${id}: ${b.actual} pm is not between ${b.double} and ${b.single}`);
  if (b.pair !== Hybrid.pairName(sp)) fail(`BONDS.${id}: pair ${b.pair}, the hybrid's bonds are ${Hybrid.pairName(sp)}`);
  if (ELEMENTS[sp.center].period > 2) fail(`BONDS.${id}: a period-3 central atom — its measured bonds fit the expanded-octet picture`);
}

/* ---------------------------------------------------------- bond strength */

/* the bond order of the bond being compared: the hybrid's, or the one bond
   between two atoms of `pair` in a molecule with no resonance */
const orderOf = (sp, pair) => {
  const hy = Hybrid.compute(sp);
  if (hy.n > 1) return hy.orderValue;
  const [a, b] = pair.split('–');
  const s = Lewis.solve(sp).s5;
  const found = Lewis.bonds(s).filter((x) => [s.at[x.a], s.at[x.b]].sort().join() === [a, b].sort().join());
  return found.length === 1 ? s.bo[found[0].key] : NaN;
};
for (const id of Object.keys(STRENGTH)) {
  const S = STRENGTH[id];
  if (!BONDS[id]) fail(`STRENGTH.${id}: no bond lengths for it in BONDS`);
  if (S.pair !== BONDS[id].pair) fail(`STRENGTH.${id}: pair ${S.pair}, BONDS says ${BONDS[id].pair}`);
  const rows = S.rows;
  if (rows.length !== 3) fail(`STRENGTH.${id}: the comparison needs exactly 3 rows (single, hybrid, double)`);
  if (rows.filter((r) => SPECIES[r.id] && count(Lewis.species(r.id)) > 1).length !== 1 || rows[1].id !== id) {
    fail(`STRENGTH.${id}: the middle row must be ${id}, the only species with resonance`);
  }
  rows.forEach((r, i) => {
    if (!SPECIES[r.id]) { fail(`STRENGTH.${id}: unknown species ${r.id}`); return; }
    const o = orderOf(Lewis.species(r.id), S.pair);
    if (Hybrid.fracText(Math.round(o * 6), 6) !== r.order) fail(`STRENGTH.${id}: ${r.id} bond order is ${o}, the row says ${r.order}`);
    if (i && !(r.energy > rows[i - 1].energy)) fail(`STRENGTH.${id}: energies are not weakest to strongest`);
    if (i && !(r.length < rows[i - 1].length)) fail(`STRENGTH.${id}: lengths do not shrink as the bonds get stronger`);
  });
  const want = [BONDS[id].single, BONDS[id].actual, BONDS[id].double];
  rows.forEach((r, i) => { if (r.length !== want[i]) fail(`STRENGTH.${id}: ${r.id} is ${r.length} pm, BONDS says ${want[i]}`); });
}

/* --------------------------------------------------------- steps and pools */

const resonant = (id) => SPECIES[id] && count(Lewis.species(id)) >= 2;
for (const s of App.STEPS) {
  if (s.sp && !SPECIES[s.sp]) fail(`step ${s.id}: unknown species ${s.sp}`);
  if (s.pool && !POOLS[s.pool]) fail(`step ${s.id}: unknown pool ${s.pool}`);
  if (s.kind === 'quiz' && !QUIZZES[s.quiz]) fail(`step ${s.id}: unknown checkpoint ${s.quiz}`);
  if (['build', 'compare', 'res', 'hybrid', 'strength'].indexOf(s.kind) >= 0 && s.sp && !resonant(s.sp)) {
    fail(`step ${s.id}: ${s.sp} has no resonance`);
  }
  if (s.kind === 'compare' && count(Lewis.species(s.sp)) !== 2) fail(`step ${s.id}: compare shows exactly two structures`);
  if (s.kind === 'hybrid' && s.sp && !BONDS[s.sp]) fail(`step ${s.id}: no bond-length evidence for ${s.sp}`);
  if (s.kind === 'strength' && !STRENGTH[s.sp]) fail(`step ${s.id}: no bond-strength data for ${s.sp}`);
}
for (const k of Object.keys(POOLS)) {
  if (!POOLS[k].ids.length) fail(`pool ${k} is empty`);
  for (const id of POOLS[k].ids) if (!resonant(id)) fail(`pool ${k}: ${id} is unknown or has no resonance`);
}
/* a species built in an earlier part must come before its own resonance and hybrid steps */
App.STEPS.forEach((s, i) => {
  if (s.kind !== 'res' || s.given) return;
  const b = App.STEPS[i - 1];
  if (!b || b.kind !== 'build' || (b.sp || b.pool) !== (s.sp || s.pool)) fail(`step ${s.id}: not right after its build`);
});

/* ---------------------------------------------------------------- quizzes */

const FACT = {
  n: (sp) => String(count(sp)),
  order: (sp) => Hybrid.compute(sp).order,
  total: (sp) => String(Lewis.solve(sp).total)
};
const VARIANTS = ['hybrid', 'one', 'double', 'single', 'some'];

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
    if (texts.length && texts.length !== q.choices.length) fail(`${q.id}: mixes text and drawings`);
    if (new Set(texts).size !== texts.length) fail(`${q.id}: two choices read the same`);

    if (q.fact) {
      const [kind, arg] = q.fact;
      if (kind === 'resonant') {
        if (arg.length !== q.choices.length) fail(`${q.id}: fact lists ${arg.length} species for ${q.choices.length} choices`);
        arg.forEach((sid, i) => {
          if (!SPECIES[sid]) { fail(`${q.id}: fact names unknown species ${sid}`); return; }
          const sp = Lewis.species(sid);
          if (q.choices[i] !== sp.text) fail(`${q.id}: choice ${i} reads ${q.choices[i]}, species ${sid} is ${sp.text}`);
          if ((i === 0) !== (count(sp) >= 2)) fail(`${q.id}: ${sid} ${count(sp) >= 2 ? 'has' : 'has no'} resonance`);
        });
      } else if (kind === 'strength') {
        if (!STRENGTH[arg]) { fail(`${q.id}: no STRENGTH data for ${arg}`); continue; }
        const texts = STRENGTH[arg].rows.map((r) => Lewis.species(r.id).text);
        /* each name found after the one before it ("O₂" also sits inside "H₂O₂") */
        let from = 0;
        const inOrder = texts.every((t) => { const x = q.choices[0].indexOf(t, from); from = x + t.length; return x >= 0; });
        if (!inOrder) {
          fail(`${q.id}: answer "${q.choices[0]}" is not ${texts.join(', ')} (weakest to strongest)`);
        }
        if (q.choices.slice(1).some((c) => c === q.choices[0])) fail(`${q.id}: a wrong choice equals the right answer`);
      } else if (!FACT[kind]) fail(`${q.id}: unknown fact ${kind}`);
      else if (!SPECIES[arg]) fail(`${q.id}: fact names unknown species ${arg}`);
      else {
        const want = FACT[kind](Lewis.species(arg));
        if (q.choices[0] !== want) fail(`${q.id}: answer is ${q.choices[0]}, the rules give ${want}`);
        q.choices.slice(1).forEach((c) => { if (c === want) fail(`${q.id}: a wrong choice equals the right answer`); });
      }
    }

    q.choices.forEach((c, i) => {
      if (typeof c === 'string') return;
      if (c.hybrid) {
        if (!resonant(c.hybrid)) { fail(`${q.id}: choice ${i} draws a hybrid of ${c.hybrid}, which has no resonance`); return; }
        const v = c.variant || 'hybrid';
        if (VARIANTS.indexOf(v) < 0) fail(`${q.id}: choice ${i} has unknown variant ${v}`);
        if ((i === 0) !== (v === 'hybrid')) fail(`${q.id}: choice ${i} is ${v === 'hybrid' ? '' : 'not '}the hybrid`);
        return;
      }
      if (!SPECIES[c.lewis]) { fail(`${q.id}: choice ${i} names unknown species ${c.lewis}`); return; }
      const sp = Lewis.species(c.lewis);
      const s = Lewis.variant(sp, c.mod);
      const ok = Lewis.accepted(s, sp).ok;
      if (i === 0 && !ok) fail(`${q.id}: the correct drawing is not a valid structure`);
      if (i > 0 && ok) fail(`${q.id}: wrong choice ${i} is a valid structure`);
      Lewis.filled(s).forEach((k2) => {
        if (Lewis.roomFor(s, k2) < 0) fail(`${q.id}: choice ${i} has more lone pairs on ${k2} than can be drawn`);
      });
      if (i === 0 && Lewis.expanded(s, sp)) fail(`${q.id}: the correct drawing would trigger the anti-AI message`);
    });
    const drawings = q.choices.filter((c) => typeof c !== 'string').map((c) => c.hybrid
      ? 'h:' + c.hybrid + ':' + (c.variant || 'hybrid') : JSON.stringify(Lewis.variant(Lewis.species(c.lewis), c.mod)));
    if (new Set(drawings).size !== drawings.length) fail(`${q.id}: two drawings are the same`);
    (q.snark || []).forEach((i) => {
      if (i === 0) fail(`${q.id}: the correct answer is marked as snark`);
      if (i >= q.choices.length) fail(`${q.id}: snark index ${i} out of range`);
      const c = q.choices[i];
      if (c && c.hybrid && (c.variant !== 'double' || ELEMENTS[Lewis.species(c.hybrid).center].period < 3)) {
        fail(`${q.id}: snark on a hybrid drawing that is not extra double bonds on a period-3 atom`);
      }
    });
  }
}
if (graded !== App.GRADED) fail(`GRADED is ${App.GRADED} but the checkpoints draw ${graded}`);
/* every bond length quoted in a question or explanation is one from bonds.js */
const known = new Set();
Object.values(BONDS).forEach((b) => [b.single, b.double, b.actual].forEach((v) => known.add(v)));
for (const k of Object.keys(QUIZZES)) {
  for (const q of QUIZZES[k].pool) {
    const text = [q.q, q.why].concat(q.choices.filter((c) => typeof c === 'string')).join(' ');
    for (const m of text.matchAll(/(\d{2,3})(?= pm)/g)) {
      if (!known.has(+m[1])) fail(`${q.id}: quotes ${m[1]} pm, which is not in bonds.js`);
    }
  }
}
/* the anti-AI message has something to catch in the checkpoints */
if (!Object.keys(QUIZZES).some((k) => QUIZZES[k].pool.some((q) => q.choices.some((c, i) => App.isSnark(q, i))))) {
  fail('no checkpoint choice triggers the anti-AI message');
}

/* --------------------------------------------------------------- snark */

for (const k of ['first', 'quiz', 'again', 'cheer']) if (!SNARK[k] || !SNARK[k].length) fail(`SNARK.${k} is empty`);
for (const line of SNARK.again.concat(SNARK.quiz, SNARK.cheer)) {
  if (/\{[XFe]\}/.test(line)) fail(`a snark line that can show up without a species uses {X}, {F} or {e}: "${line.slice(0, 40)}…"`);
}
/* the sulfur species really can draw the snark: a second double bond on S */
for (const id of POOLS.own.ids) {
  const sp = Lewis.species(id);
  if (ELEMENTS[sp.center].period < 3) continue;
  if (!Lewis.expanded(Lewis.variant(sp, { expand: 1 }), sp)) fail(`${id}: an extra S=O double bond is not caught as expanded`);
}

/* ------------------------------------------------- suspend_data headroom */

const big = { v: 2, seed: 999999999, step: 18, max: 18, draws: {}, pool: { own: 'HCO2' }, ans: {}, pick: {}, done: {}, fin: 1 };
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
const res = ids.filter(resonant);
console.log(`✓ ${ids.length} species (${res.length} with equivalent resonance: ${res.join(', ')}), ` +
  `${Object.keys(seen).length} questions, ${App.STEPS.length} steps — all checks pass (saved state at most ${size} characters).`);

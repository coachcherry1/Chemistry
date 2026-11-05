/* tools/validate.js: checks the chemistry, the particle diagrams and the item bank.
 *
 *   node tools/validate.js
 *
 * Every number is worked out a second way here (closed-form formulas and
 * hand-worked values) and compared with the model in src/js/buffer.js.
 *
 * Fails when:
 * - a pKa or a pH (the buffer at the start, after acid or base, pure water,
 *   the weak acid alone) disagrees with the hand-worked value;
 * - the Henderson-Hasselbalch value is not within 0.02 of the exact pH for a
 *   buffer with appreciable amounts of both members, or the model calls a flask
 *   a buffer when it is a weak acid alone, a conjugate base alone or water;
 * - a particle diagram does not conserve the pair (acid member + base member),
 *   does not balance charge, does not hold the reaction exactly (each added H+
 *   turns one base member into one acid member), or does not fit the 96 places;
 * - a curve is not falling, the buffer is not flat across the middle, or the
 *   buffer does not fail where one member runs out;
 * - a checkpoint answer no longer matches the model (every question that reads
 *   a pH or a count carries a `fact`), a pool is smaller than its draw plus
 *   two, a question has fewer than four distinct choices, a question id cannot
 *   be a SCORM interaction id, or a sentence answer is longer than every wrong
 *   choice;
 * - a question that points at a diagram or a graph has none;
 * - the equation appears without the warning that it is only for a buffer;
 * - a step kind has no renderer, a part has no steps, or the manifest leaves a
 *   file out, or its identifiers or the save key match another package's;
 * - the saved state could outgrow SCORM 1.2's 4 KB;
 * - any file contains an em dash.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
const problems = [];
const bad = (m) => problems.push(m);

const ctx = {
  console, Math, JSON, Object, Array, String, Number, Error, isNaN, parseInt, Date, RegExp, URLSearchParams, Set,
  window: { matchMedia: () => ({ matches: false }), addEventListener() {} },
  document: { addEventListener() {}, documentElement: {} },
  getComputedStyle: () => ({ getPropertyValue: () => '' })
};
vm.createContext(ctx);
const html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].forEach((m) => {
  vm.runInContext(fs.readFileSync(path.join(src, m[1]), 'utf8'), ctx, { filename: m[1] });
});
const { Buf: B, QUIZZES, App } = ctx;
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const f2 = (v) => v.toFixed(2);

/* ------------------------------------------------------------- the pH values */

const KW = 1e-14, KA = 1.8e-5, KB = 1.8e-5, U = 0.01;
if (!near(B.pKa('AC'), -Math.log10(KA), 1e-9)) bad('pKa of acetic acid is wrong');
if (!near(B.pKa('NH'), 14 + Math.log10(KB), 1e-9)) bad('pKa of ammonium is not 14 - pKb');
if (f2(B.pKa('AC')) !== '4.74' || f2(B.pKa('NH')) !== '9.26') bad('the pKa values the text quotes (4.74 and 9.26) differ from the model');

/* the buffer with equal members sits at the pKa */
['AC', 'NH'].forEach((p) => { if (!near(B.pH(p, 10, 10, 0), B.pKa(p), 0.01)) bad(`${p}: the equal buffer is not at the pKa (${B.pH(p, 10, 10, 0)})`); });
/* pure water that gets x particles of strong acid or base: closed form */
for (let x = -12; x <= 12; x++) {
  const net = x * U, root = Math.sqrt(net * net + 4 * KW);
  const book = net >= 0 ? -Math.log10((net + root) / 2) : 14 + Math.log10((-net + root) / 2);   /* no cancellation either way */
  if (!near(B.pHWater(x), book, 1e-6)) bad(`pure water at x=${x}: ${B.pHWater(x)}, closed form ${book}`);
}
/* a weak acid alone: [H+] = sqrt(Ka C) to a good approximation */
if (!near(B.pH('AC', 10, 0, 0), -0.5 * Math.log10(KA * 0.1), 0.01)) bad('acetic acid alone: pH is not the weak-acid value');
/* conjugate base alone: [OH-] = sqrt(Kb C) */
if (!near(B.pH('AC', 0, 10, 0), 14 + 0.5 * Math.log10((KW / KA) * 0.1), 0.01)) bad('acetate alone: pH is not the weak-base value');

/* Henderson-Hasselbalch agrees with the exact pH for every buffer the activity draws */
let worst = 0;
['AC', 'NH'].forEach((p) => {
  for (let x = -7; x <= 7; x++) {
    const a2 = B.after(10, 10, x);
    worst = Math.max(worst, Math.abs(B.pH(p, 10, 10, x) - B.hh(p, a2.ha, a2.a)));
  }
  for (let a = 2; a <= 20; a++) worst = Math.max(worst, Math.abs(B.pH(p, 22 - a, a, 0) - B.hh(p, 22 - a, a)));
});
if (worst > 0.02) bad(`the equation differs from the exact pH by ${worst.toFixed(3)} for a drawn buffer`);

/* "appreciable amounts of both": which flasks are buffers */
if (B.appreciable(10, 0) || B.appreciable(0, 10) || B.appreciable(0, 0)) bad('a weak acid alone, a conjugate base alone or water is called a buffer');
if (!B.appreciable(10, 10) || !B.appreciable(14, 6) || !B.appreciable(8, 12)) bad('a buffer of appreciable amounts is not called one');

/* the shape of the curves */
['AC', 'NH'].forEach((p) => {
  const c = B.curve(p, 10, 10);
  for (let i = 1; i < c.length; i++) if (c[i][1] > c[i - 1][1] + 1e-9) bad(`${p}: the buffer curve rises as acid is added (x=${c[i][0]})`);
  const span = B.pH(p, 10, 10, -8) - B.pH(p, 10, 10, 8);
  if (span > 2.5 || span < 1) bad(`${p}: the buffer changes ${span.toFixed(2)} units from 8 NaOH to 8 HCl (expected about 1.9 to 2.0)`);
  const wspan = B.pHWater(-8) - B.pHWater(8);
  if (wspan < 11) bad('pure water does not swing by 11 units across 8 acid to 8 base');
  if (B.pH(p, 10, 10, 12) > 2 || B.pH(p, 10, 10, -12) < 12) bad(`${p}: the buffer does not fail past 10 particles of acid or base`);
  if (B.pH(p, 10, 10, 1) - B.pH(p, 10, 10, 11) < 2) bad(`${p}: no cliff between 1 and 11 particles of acid`);
});
/* the acid alone is not a buffer: it falls sharply on the first particles of acid */
if (B.pH('AC', 10, 0, 0) - B.pH('AC', 10, 0, 2) < 1) bad('acetic acid alone should drop at once when acid is added');

/* ------------------------------------------------------------ the particles */

/* the four ordinary flasks are drawn at every x; the others (the ratio slider, the equation sorts) only as they are, at x = 0 */
const flasks = [];
['AC', 'NH'].forEach((p) => {
  Object.keys(B.KINDS).forEach((k) => flasks.push([p, B.KINDS[k].ha, B.KINDS[k].a, true]));
  for (let a = 2; a <= 20; a++) flasks.push([p, 22 - a, a, false]);
  [[14, 6], [6, 14], [8, 12], [12, 8], [3, 17], [17, 3], [11, 11], [9, 13], [13, 9]].forEach((q) => flasks.push([p, q[0], q[1], false]));
});
flasks.forEach(([p, ha, a, all]) => {
  for (let x = all ? -B.MAXX : 0; x <= (all ? B.MAXX : 0); x++) {
    const c = B.counts(p, ha, a, x), tag = `${p} ${ha}/${a} x=${x}`;
    if (c.HA + c.A !== ha + a) bad(`${tag}: acid member + base member = ${c.HA + c.A}, not ${ha + a}`);
    if (!B.chargeBalanced(p, ha, a, x)) bad(`${tag}: the diagram does not balance charge ${JSON.stringify(c)}`);
    if (ha + a > B.FAM || c.Na > 22 || c.Cl > 22 || c.H > 12 || c.OH > 12) bad(`${tag}: more particles than places ${JSON.stringify(c)}`);
    if (Math.min(c.HA, c.A, c.Na, c.Cl, c.H, c.OH) < 0) bad(`${tag}: a negative count`);
  }
});
/* the reaction, exactly: while both members last, each added H+ or OH- changes one member into the other */
['AC', 'NH'].forEach((p) => {
  for (let x = -10; x <= 10; x++) {
    const c = B.counts(p, 10, 10, x), want = B.after(10, 10, x);
    if (c.HA !== want.ha || c.A !== want.a) bad(`${p} x=${x}: the reaction gives ${want.ha}/${want.a}, the diagram shows ${c.HA}/${c.A}`);
    if (x !== 0 && c.H + c.OH !== 0) bad(`${p} x=${x}: free H+ or OH- is drawn while a buffer is still working (${c.H}, ${c.OH})`);
  }
  const past = B.counts(p, 10, 10, 12);
  if (past.A !== 0 && p === 'AC') bad('AC x=12: the base member should be used up');
});
if (B.counts('AC', 10, 10, 12).H !== 2) bad('AC after 12 HCl: 2 free H+ expected (10 base members used up)');
if (B.counts('AC', 10, 10, -12).OH !== 2) bad('AC after 12 NaOH: 2 free OH- expected (10 acid members used up)');
if (B.counts('AC', 0, 0, 4).H !== 4 || B.counts('AC', 0, 0, 4).Cl !== 4) bad('pure water with 4 HCl should hold 4 H+ and 4 Cl-');

/* ------------------------------------------------------------ the item bank */

const CONCEPTUAL = new Set(['a-def', 'a-pair', 'a-water', 'a-hcl-nacl', 'a-nh', 'a-both', 'a-acid-only', 'a-spectator', 'b-react', 'b-click', 'b-ratio', 'b-nh',
  'c-react', 'c-click', 'c-spectator', 'c-flat', 'c-both', 'd-only', 'd-no', 'd-dilute', 'e-which', 'e-acid-nh', 'e-base-nh', 'e-curve', 'e-no-hh', 'e-down']);
const ids = new Set();
let graded = 0;

Object.keys(QUIZZES).forEach((k) => {
  const Q = QUIZZES[k];
  graded += Q.draw;
  if (Q.pool.length < Q.draw + 2) bad(`checkpoint ${k}: the pool (${Q.pool.length}) is smaller than the draw (${Q.draw}) plus two`);
  Q.core.forEach((c) => { if (!Q.pool.some((q) => q.id === c)) bad(`checkpoint ${k}: core question ${c} is not in the pool`); });
  if (Q.core.length > Q.draw) bad(`checkpoint ${k}: more core questions than the draw`);
  Q.pool.forEach((q) => {
    const where = q.id;
    if (ids.has(q.id)) bad(`${where}: duplicate question id`);
    ids.add(q.id);
    if (!/^[a-z][a-z0-9-]{2,60}$/.test(q.id)) bad(`${where}: cannot be a SCORM interaction id`);
    if (q.choices.length !== 4) bad(`${where}: ${q.choices.length} choices, four expected`);
    if (new Set(q.choices).size !== q.choices.length) bad(`${where}: two choices are the same`);
    if (!q.why || q.why.length < 20) bad(`${where}: no explanation`);
    const right = q.choices[0], others = q.choices.slice(1);
    if (right.length > 28 && right.length > Math.max(...others.map((c) => c.length))) bad(`${where}: the right answer is the longest choice`);
    if (q.diagram) {
      const d = q.diagram;
      if (!B.PAIRS[d.pair]) bad(`${where}: diagram of an unknown pair`);
      if (!(d.ha + d.a <= B.FAM && Math.abs(d.x) <= B.MAXX && Number.isInteger(d.x))) bad(`${where}: diagram out of range`);
    }
    if (q.curve) q.curve.series.forEach((c) => { if (!B.PAIRS[c.pair]) bad(`${where}: curve of an unknown pair`); });
    if (/\bdiagram\b/i.test(q.q) && !q.diagram) bad(`${where}: mentions a diagram but has none`);
    if (/\b(graph|curve)\b/i.test(q.q) && !q.curve) bad(`${where}: mentions a graph but has none`);

    const f = q.fact;
    if (!f) { if (!CONCEPTUAL.has(q.id)) bad(`${where}: no fact, and not listed as a conceptual question`); return; }
    if (CONCEPTUAL.has(q.id)) bad(`${where}: listed as conceptual but carries a fact`);
    const miss = (m) => bad(`${where}: ${m}`);
    const sameFlask = (pair, ha, a, x) => {
      if (q.diagram && (q.diagram.pair !== pair || q.diagram.ha !== ha || q.diagram.a !== a || q.diagram.x !== x)) miss('the diagram is not the flask the fact is about');
    };
    switch (f[0]) {
      case 'pH': {
        const v = f2(B.pH(f[1], f[2], f[3], f[4]));
        if (!right.includes(v)) miss(`right answer "${right}" does not contain the pH ${v}`);
        others.forEach((c) => { if (c.includes(v)) miss(`a wrong choice also contains ${v}`); });
        break;
      }
      case 'waterpH': {
        const v = f2(B.pHWater(f[1]));
        if (!right.includes(v)) miss(`right answer "${right}" does not contain the pH ${v}`);
        others.forEach((c) => { if (c.includes(v)) miss(`a wrong choice also contains ${v}`); });
        break;
      }
      case 'count': {
        const n = B.counts(f[1], f[2], f[3], f[4])[f[5]];
        if (!right.startsWith(String(n) + (right.length === String(n).length ? '' : ':')) && right !== String(n)) miss(`right answer "${right}" should be ${n}`);
        sameFlask(f[1], f[2], f[3], f[4]);
        if (!q.diagram) miss('a count question must show its diagram');
        break;
      }
      case 'counts': {
        const n = B.counts(f[1], f[2], f[3], f[4])[f[5]];
        if (n !== f[6]) miss(`the model has ${n}, the fact says ${f[6]}`);
        sameFlask(f[1], f[2], f[3], f[4]);
        if (!q.diagram) miss('a counts question must show its diagram');
        break;
      }
      case 'hh': {
        const v = f2(B.hh(f[1], f[2], f[3]));
        if (!right.includes(v)) miss(`right answer "${right}" does not contain ${v}`);
        others.forEach((c) => { if (c.includes(v)) miss(`a wrong choice also contains ${v}`); });
        if (!B.appreciable(f[2], f[3])) miss('the equation is applied to a flask without appreciable amounts of both members');
        break;
      }
      default: miss(`unknown fact "${f[0]}"`);
    }
  });
});
if (App.GRADED !== graded || graded !== 20) bad(`graded questions: App says ${App.GRADED}, the bank has ${graded}, the plan has 20`);

/* ------------------------------------------------------------ student text */

const read = (f) => fs.readFileSync(path.join(src, f), 'utf8');
const studentText = ['js/app.js', 'js/steps.js', 'js/quiz.js', 'js/buffer.js', 'js/flask.js', 'js/phcurve.js', 'index.html'].map(read).join('\n');
const BANNED = [[/van der Waals/i, 'van der Waals'], [/\bspontaneous/i, 'spontaneous'], [/\bfull ICE\b/i, 'full ICE']];
BANNED.forEach(([re, name]) => { if (re.test(studentText)) bad(`student text uses "${name}"`); });
/* the equation is never shown without its warning */
const hhShows = (read('js/app.js').match(/pH = pKa \+ log/g) || []).length + (read('js/steps.js').match(/pH = pKa \+ log|pH = ' \+ Buf\.pKa/g) || []).length;
if (!/Only for a buffer\. /.test(studentText)) bad('the warning "Only for a buffer." is missing');
if (!/appreciable amounts of BOTH/.test(studentText)) bad('the warning does not say "appreciable amounts of BOTH"');
const stepsSrc = read('js/steps.js');
['R.ratio', 'R.when', 'R.use'].forEach((fn) => {
  const body = stepsSrc.slice(stepsSrc.indexOf(fn + ' = function'));
  const end = body.indexOf('\n  };');
  if (!/hhWarning\(\)/.test(body.slice(0, end))) bad(`${fn}: shows the equation without the "only for a buffer" warning`);
});
if (!/hhWarning\(\)/.test(read('js/app.js').slice(read('js/app.js').indexOf("RENDER.quiz"), read('js/app.js').indexOf('RENDER.results')))) bad('the checkpoint reference lacks the warning');
if (hhShows < 3) bad('the equation is not shown where expected');

/* ------------------------------------------------------------------- steps */

const KINDS = ['problem', 'members', 'sort', 'walk', 'click', 'range', 'ratio', 'when', 'use', 'quiz', 'results'];
const stepIds = new Set();
App.STEPS.forEach((s) => {
  if (stepIds.has(s.id)) bad(`duplicate step id ${s.id}`);
  stepIds.add(s.id);
  if (!KINDS.includes(s.kind)) bad(`${s.id}: unknown kind ${s.kind}`);
  if (typeof App.RENDER[s.kind] !== 'function') bad(`${s.id}: no renderer for kind ${s.kind}`);
  if (s.kind === 'quiz' && !QUIZZES[s.quiz]) bad(`${s.id}: no checkpoint ${s.quiz}`);
  if ((s.kind === 'walk' || s.kind === 'click') && !['acid', 'base'].includes(s.dir)) bad(`${s.id}: direction must be acid or base`);
  if (s.kind === 'range' && !B.PAIRS[s.pair]) bad(`${s.id}: unknown pair ${s.pair}`);
  if (!App.PARTS.some((p) => p.n === s.part)) bad(`${s.id}: part ${s.part} does not exist`);
});
if (Object.keys(QUIZZES).some((k) => !App.STEPS.some((s) => s.quiz === k))) bad('a checkpoint is not in the step list');
if (!App.PARTS.every((p) => App.STEPS.some((s) => s.part === p.n))) bad('a part has no steps');
const order = App.STEPS.map((s) => s.id);
if (order.indexOf('hh-ratio') !== -1) bad('old step id hh-ratio');
if (order.indexOf('ratio') < order.indexOf('quiz-C')) bad('the equation comes before checkpoint 3');
if (order.indexOf('when') < order.indexOf('ratio')) bad('"does it work" comes before the ratio step');

/* --------------------------------------------------------------- packaging */

const manifest = read('imsmanifest.xml');
const listed = [...manifest.matchAll(/<file href="([^"]+)"\/>/g)].map((m) => m[1]);
const onDisk = [];
(function walk(d, rel) {
  fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    if (e.name.startsWith('.')) return;
    if (e.isDirectory()) walk(path.join(d, e.name), rel + e.name + '/');
    else if (e.name !== 'imsmanifest.xml') onDisk.push(rel + e.name);
  });
})(src, '');
onDisk.forEach((f) => { if (!listed.includes(f)) bad(`${f} is in src/ but not in the manifest`); });
listed.forEach((f) => { if (!onDisk.includes(f)) bad(`the manifest lists ${f}, which is not in src/`); });
if (/masteryscore/i.test(manifest.replace(/<!--[\s\S]*?-->/g, ''))) bad('the manifest sets a masteryscore');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
scripts.forEach((f) => { if (!listed.includes(f)) bad(`${f} is loaded by index.html but not in the manifest`); });

/* identifiers and the save key must differ from every other package's */
const repo = path.join(root, '..', '..', '..');
const mine = { ids: [...manifest.matchAll(/identifier="([^"]+)"/g)].map((m) => m[1]), store: (read('js/scorm.js').match(/var STORE = '([^']+)'/) || [])[1] };
if (!mine.store) bad('no save key in scorm.js');
(function scan(d, depth) {
  if (depth > 3) return;
  fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    if (!e.isDirectory() || e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist') return;
    const f = path.join(d, e.name);
    if (path.resolve(f) === path.resolve(root)) return;
    const mf = path.join(f, 'src', 'imsmanifest.xml');
    if (fs.existsSync(mf)) {
      const other = fs.readFileSync(mf, 'utf8');
      [...other.matchAll(/identifier="([^"]+)"/g)].forEach((m) => { if (mine.ids.includes(m[1])) bad(`identifier ${m[1]} is also used by ${path.relative(repo, f)}`); });
      const sj = path.join(f, 'src', 'js', 'scorm.js');
      if (fs.existsSync(sj)) {
        const o = (fs.readFileSync(sj, 'utf8').match(/var STORE = '([^']+)'/) || [])[1];
        if (o && o === mine.store) bad(`save key ${o} is also used by ${path.relative(repo, f)}`);
      }
      return;
    }
    scan(f, depth + 1);
  });
})(repo, 0);

/* the saved state, at its fullest, must fit SCORM 1.2's 4 KB */
const full = {
  v: App.SCHEMA, seed: 999999999, step: App.STEPS.length - 1, max: App.STEPS.length - 1,
  draws: Object.keys(QUIZZES).reduce((o, k) => { o[k] = QUIZZES[k].pool.slice().sort((a, b) => b.id.length - a.id.length).slice(0, QUIZZES[k].draw).map((q) => q.id); return o; }, {}),
  ans: {}, pick: {}, done: {}, wk: { 'acid-walk': 5, 'base-walk': 5, when: 6, use: 2 },
  seen: { problem: 2, members: { AC: 1, NH: 1 }, membersQ: 1, range: { l: 1, r: 1, q: 1 }, 'base-buffer': { l: 1, r: 1, q: 1 }, ratio: { lo: 1, hi: 1, q1: 1, q2: 1 } },
  fin: 1, best: 100, att: 99
};
Object.keys(full.draws).forEach((k) => full.draws[k].forEach((id) => { full.ans[id] = 1; full.pick[id] = 3; }));
App.STEPS.forEach((s) => { full.done[s.id] = 1; });
const size = JSON.stringify(full).length;
if (size > 3000) bad(`the saved state can reach ${size} characters; SCORM 1.2 allows 4096 and the wrapper refuses 4000`);

/* ------------------------------------------------------------------ text */

(function scan(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'dist') scan(f); return; }
    if (!/\.(js|html|css|md|xml|sh)$/.test(e.name)) return;
    if (e.name === 'ANSWER_KEY.md') return;
    if (fs.readFileSync(f, 'utf8').indexOf(String.fromCharCode(0x2014)) >= 0) bad(`${path.relative(root, f)} contains an em dash`);
  });
})(root);

if (problems.length) {
  console.error('FAILED:\n - ' + problems.join('\n - '));
  process.exit(1);
}
console.log('OK: model, curves, particle diagrams and the item bank check out.');

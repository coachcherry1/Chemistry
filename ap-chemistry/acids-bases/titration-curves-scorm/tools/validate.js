/* tools/validate.js: checks the chemistry, the particle diagrams and the item bank.
 *
 *   node tools/validate.js
 *
 * Every number is worked out a second way here (closed-form formulas and
 * hand-worked values) and compared with the model in src/js/titration.js.
 *
 * Fails when:
 * - the pH at the start, at the half-equivalence point, at the equivalence
 *   point or after it disagrees with the textbook value; the strong/strong
 *   equivalence point is not exactly pH 7 or the weak acid's is not above 7;
 *   pH at the half-equivalence point is not within 0.05 of the pKa;
 * - a curve is not rising, is steepest anywhere but at the equivalence point,
 *   or the weak acid's curve is not above the strong acid's before the
 *   equivalence point (or the two differ after it);
 * - a particle diagram does not conserve the acid (HF + F- = 24), does not
 *   balance charge, or does not match the moles of NaOH added;
 * - a checkpoint answer no longer matches the model (every question that
 *   reads a number, a point, an acid or a curve carries a `fact`), a pool is
 *   smaller than its draw plus two, a question has fewer than four distinct
 *   choices, a question id cannot be a SCORM interaction id, or a sentence
 *   answer is longer than every wrong choice;
 * - a question's diagram or curve contradicts its fact, or a question that
 *   points at a diagram, a curve or a dot has none;
 * - a decimal in student text is not a pH, pKa or volume the model produces,
 *   or a claim ("about 8%", "1 in 75", "1 in 57,917") disagrees with the model;
 * - student text calculates (Henderson, ICE tables) or uses a term outside the
 *   class's (midpoint, half-neutralization), or the weak acid walk uses a
 *   system other than HF;
 * - a walk's choices for "what is in the flask" or "what decides the pH" do
 *   not hold exactly one right answer among four different ones;
 * - the manifest leaves a file out, or its identifiers or the save key match
 *   another package's;
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
  console, Math, JSON, Object, Array, String, Number, Error, isNaN, parseInt, Date, RegExp, URLSearchParams,
  window: { matchMedia: () => ({ matches: false }), addEventListener() {} },
  document: { addEventListener() {}, documentElement: {} },
  getComputedStyle: () => ({ getPropertyValue: () => '' })
};
vm.createContext(ctx);
const html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].forEach((m) => {
  vm.runInContext(fs.readFileSync(path.join(src, m[1]), 'utf8'), ctx, { filename: m[1] });
});
const { Titration: T } = ctx;

const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* ------------------------------------------------------------- the pH values */

const KW = 1e-14, KA = 6.8e-4, C0 = 0.100;

/* strong acid: closed form from the leftover moles (or the excess OH-) */
function bookStrong(mL) {
  const net = (C0 * 25 - C0 * mL) / (25 + mL);       /* mmol/mL = mol/L */
  const h = (net + Math.sqrt(net * net + 4 * KW)) / 2;
  return -Math.log10(h);
}
/* weak acid start: the quadratic x^2 + Ka x - Ka C = 0 */
const bookWeakStart = -Math.log10((-KA + Math.sqrt(KA * KA + 4 * KA * C0)) / 2);
/* weak acid at equivalence: the F- hydrolyzes, x = sqrt(Kb c) with c = 0.0500 M */
const bookWeakEq = 14 + Math.log10(Math.sqrt((KW / KA) * (C0 * 25 / 50)));

if (T.UNITS !== 24) bad(`UNITS is ${T.UNITS}, the plan draws 24 acid units`);
if (!near(T.volume(24), 25, 1e-9)) bad(`the equivalence point is at ${T.volume(24)} mL, not 25.00`);
if (!near(T.PKA_HF, 3.17, 0.005)) bad(`pKa of HF is ${T.PKA_HF}, textbook 3.17`);

[0, 6, 12, 18, 23, 24, 25, 30, 36].forEach((u) => {
  const want = bookStrong(T.volume(u)), got = T.pH('SS', u);
  if (!near(got, want, 0.005)) bad(`strong/strong pH at u=${u}: model ${got.toFixed(3)}, book ${want.toFixed(3)}`);
});
if (!near(T.pH('SS', 0), 1.0, 0.005)) bad(`0.100 M HCl has pH ${T.pH('SS', 0)}, textbook 1.00`);
if (!near(T.pH('SS', 24), 7.0, 0.005)) bad(`strong/strong equivalence point is pH ${T.pH('SS', 24)}, must be 7`);
if (!near(T.pH('SS', 30), 12.05, 0.01)) bad(`strong/strong at 31.25 mL is pH ${T.pH('SS', 30)}, textbook 12.05`);

if (!near(T.pH('WS', 0), bookWeakStart, 0.01)) bad(`HF start pH ${T.pH('WS', 0)}, book ${bookWeakStart}`);
if (!near(T.pH('WS', 24), bookWeakEq, 0.02)) bad(`HF equivalence pH ${T.pH('WS', 24)}, book ${bookWeakEq}`);
if (!(T.pH('WS', 24) > 7.5)) bad(`weak acid equivalence point must be clearly above 7, it is ${T.pH('WS', 24)}`);
if (!near(T.pH('WS', 12), T.PKA_HF, 0.05)) bad(`half-equivalence pH ${T.pH('WS', 12)} is not within 0.05 of the pKa ${T.PKA_HF}`);
if (!near(T.pH('WS', 30), T.pH('SS', 30), 0.01)) bad('after the equivalence point the two curves must agree (the excess OH- sets the pH)');
if (T.side('SS', 24) !== 'equal') bad('side(SS, equivalence) must be equal');
if (T.side('WS', 24) !== 'above') bad('side(WS, equivalence) must be above');

/* acetic acid, the review acid in Checkpoint 5 (Ka 1.8e-5, pKa 4.74) */
const KA_AC = 1.8e-5;
const bookAcStart = -Math.log10((-KA_AC + Math.sqrt(KA_AC * KA_AC + 4 * KA_AC * C0)) / 2);
const bookAcEq = 14 + Math.log10(Math.sqrt((KW / KA_AC) * (C0 * 25 / 50)));
if (!near(T.PKA_AC, 4.74, 0.005)) bad(`pKa of acetic acid is ${T.PKA_AC}, textbook 4.74`);
if (!near(T.pH('AC', 0), bookAcStart, 0.01)) bad(`acetic acid start pH ${T.pH('AC', 0)}, book ${bookAcStart}`);
if (!near(T.pH('AC', 24), bookAcEq, 0.02)) bad(`acetic acid equivalence pH ${T.pH('AC', 24)}, book ${bookAcEq}`);
if (!near(T.pH('AC', 12), T.PKA_AC, 0.05)) bad(`acetic acid half-equivalence pH ${T.pH('AC', 12)} is not within 0.05 of its pKa ${T.PKA_AC}`);
if (!near(T.pH('AC', 30), T.pH('SS', 30), 0.01)) bad('after the equivalence point acetic acid must agree with the others');
if (T.side('AC', 24) !== 'above') bad('side(AC, equivalence) must be above');
/* the weaker the acid, the higher the pH before the equivalence point and at it */
for (let u = 0; u < 24; u++) {
  if (!(T.pH('AC', u) > T.pH('WS', u))) bad(`acetic acid is a weaker acid than HF, so its pH must be higher (u=${u})`);
}
if (!(T.pH('AC', 24) > T.pH('WS', 24) && T.pH('WS', 24) > 7)) bad('equivalence pH must rise: strong 7 < HF < acetic acid');
if (!(T.PKA_AC > T.PKA_HF)) bad('acetic acid must have the larger pKa');

/* --------------------------------------------------------------- the curves */

['SS', 'WS', 'AC'].forEach((sys) => {
  const c = T.curve(sys);
  for (let i = 1; i < c.length; i++) if (!(c[i][1] > c[i - 1][1])) { bad(`${sys}: the curve is not rising at ${c[i][0].toFixed(2)} mL`); break; }
  let best = 0, at = 0;
  for (let i = 1; i < c.length; i++) { const s = (c[i][1] - c[i - 1][1]) / (c[i][0] - c[i - 1][0]); if (s > best) { best = s; at = c[i][0]; } }
  if (!near(at, 25, 0.5)) bad(`${sys}: the curve is steepest at ${at.toFixed(2)} mL, not at the equivalence point`);
});
for (let u = 0; u < 24; u++) {
  if (!(T.pH('WS', u) > T.pH('SS', u))) bad(`before the equivalence point the weak acid must read higher than the strong acid (u=${u})`);
}
if (!(T.pH('WS', 23) < 7)) bad('one unit before the equivalence point the weak acid is still below 7');

/* ------------------------------------------------------- particle diagrams */

['SS', 'WS', 'AC'].forEach((sys) => {
  for (let u = 0; u <= T.MAX_U; u++) {
    const c = T.counts(sys, u);
    if (c.Na !== u) bad(`${sys} u=${u}: ${c.Na} Na+, must equal the NaOH units added`);
    if (c.HA + c.A !== 24) bad(`${sys} u=${u}: HA ${c.HA} + anion ${c.A} is not the 24 acid units`);
    if (!T.chargeBalanced(sys, u)) bad(`${sys} u=${u}: charge is not balanced (${JSON.stringify(c)})`);
    if (sys === 'SS' && c.HA !== 0) bad(`SS u=${u}: a strong acid has no intact molecules`);
    Object.keys(c).forEach((k) => { if (c[k] < 0 || c[k] !== Math.floor(c[k])) bad(`${sys} u=${u}: ${k} is ${c[k]}`); });
  }
});
/* the five points, worked out by hand */
const BOOK_COUNTS = {
  SS: { 0: { H: 24, A: 24, HA: 0, Na: 0, OH: 0 }, 12: { H: 12, A: 24, HA: 0, Na: 12, OH: 0 }, 18: { H: 6, A: 24, HA: 0, Na: 18, OH: 0 },
        24: { H: 0, A: 24, HA: 0, Na: 24, OH: 0 }, 30: { H: 0, A: 24, HA: 0, Na: 30, OH: 6 } },
  WS: { 0: { H: 2, A: 2, HA: 22, Na: 0, OH: 0 }, 12: { H: 0, A: 12, HA: 12, Na: 12, OH: 0 }, 18: { H: 0, A: 18, HA: 6, Na: 18, OH: 0 },
        24: { H: 0, A: 24, HA: 0, Na: 24, OH: 0 }, 30: { H: 0, A: 24, HA: 0, Na: 30, OH: 6 } },
  /* only about 1 in 75 acetic acid molecules ionizes: too few to draw at the start */
  AC: { 0: { H: 0, A: 0, HA: 24, Na: 0, OH: 0 }, 12: { H: 0, A: 12, HA: 12, Na: 12, OH: 0 }, 18: { H: 0, A: 18, HA: 6, Na: 18, OH: 0 },
        24: { H: 0, A: 24, HA: 0, Na: 24, OH: 0 }, 30: { H: 0, A: 24, HA: 0, Na: 30, OH: 6 } }
};
Object.keys(BOOK_COUNTS).forEach((sys) => Object.keys(BOOK_COUNTS[sys]).forEach((u) => {
  const got = T.counts(sys, +u), want = BOOK_COUNTS[sys][u];
  Object.keys(want).forEach((k) => { if (got[k] !== want[k]) bad(`${sys} u=${u}: ${k} is ${got[k]}, hand-worked ${want[k]}`); });
}));
if (!T.POINTS.every((p, i) => p.u === [0, 12, 18, 24, 30][i])) bad('the five points are not at 0, 12, 18, 24 and 30 units');

/* the weak acid is shown as a weak acid: a small fraction ionized at the start */
const startFrac = T.counts('WS', 0).A / 24;
if (!(startFrac > 0.04 && startFrac < 0.15)) bad(`HF is drawn ${Math.round(100 * startFrac)}% ionized at the start; 0.100 M HF is about 8%`);
if (T.counts('WS', 0).H < 1) bad('the weak acid must show at least one ionized unit at the start');
if (!near(T.reactingOneIn('WS'), 57917, 200)) bad(`1 in ${T.reactingOneIn('WS')} F- reacts at equivalence, hand-worked about 1 in 57,900`);

/* what sets the pH, by point */
const SETTER = {
  SS: { 0: 'strong-h', 12: 'strong-h', 18: 'strong-h', 24: 'neutral', 30: 'excess-oh' },
  WS: { 0: 'weak-acid', 12: 'buffer', 18: 'buffer', 24: 'conjugate-base', 30: 'excess-oh' },
  AC: { 0: 'weak-acid', 12: 'buffer', 18: 'buffer', 24: 'conjugate-base', 30: 'excess-oh' }
};
Object.keys(SETTER).forEach((sys) => Object.keys(SETTER[sys]).forEach((u) => {
  if (T.setter(sys, +u) !== SETTER[sys][u]) bad(`${sys} u=${u}: setter ${T.setter(sys, +u)}, expected ${SETTER[sys][u]}`);
}));
T.PAIRS.forEach((p) => { if (T.pairSide(p) !== (p.strong ? 'equal' : 'above')) bad(`pair ${p.id}: wrong side of 7`); });

/* ------------------------------------------------------- the question bank */

const { QUIZZES, App } = ctx;
const LABEL = { SS: 'HCl', WS: 'HF', AC: 'Acetic acid' };          /* how a choice names a flask */
const RANK = { SS: 'HCl', WS: 'HF', AC: 'CH₃COOH' };                /* how a ranking names a titration */
const SIDE = { equal: 'Exactly 7', above: 'Above 7', below: 'Below 7' };
const ids = new Set();
let graded = 0;

Object.keys(QUIZZES).forEach((k) => {
  const Q = QUIZZES[k];
  graded += Q.draw;
  if (Q.pool.length < Q.draw + 2) bad(`checkpoint ${k}: the pool (${Q.pool.length}) is smaller than the draw (${Q.draw}) plus two`);
  Q.core.forEach((c) => { if (!Q.pool.some((q) => q.id === c)) bad(`checkpoint ${k}: core question ${c} is not in the pool`); });
  if (Q.core.length > Q.draw) bad(`checkpoint ${k}: more core questions than the draw`);
  Q.pool.forEach((q) => {
    const where = `${q.id}`;
    if (ids.has(q.id)) bad(`${where}: duplicate question id`);
    ids.add(q.id);
    if (!/^[a-z][a-z0-9-]{2,60}$/.test(q.id)) bad(`${where}: cannot be a SCORM interaction id`);
    if (q.choices.length !== 4) bad(`${where}: ${q.choices.length} choices, four expected`);
    if (new Set(q.choices).size !== q.choices.length) bad(`${where}: two choices are the same`);
    if (!q.why || q.why.length < 20) bad(`${where}: no explanation`);
    const right = q.choices[0], others = q.choices.slice(1);
    if (right.length > 28 && right.length > Math.max(...others.map((c) => c.length))) bad(`${where}: the right answer is the longest choice`);
    if (q.diagram) {
      if (!T.SYSTEMS[q.diagram.sys]) bad(`${where}: diagram of an unknown flask`);
      if (!Number.isInteger(q.diagram.u) || q.diagram.u < 0 || q.diagram.u > T.MAX_U) bad(`${where}: diagram at u=${q.diagram.u}`);
    }
    if (q.curve) {
      q.curve.systems.forEach((c) => { if (!T.SYSTEMS[c.sys]) bad(`${where}: curve of an unknown titration`); });
      if (q.curve.mark != null && !(Number.isInteger(q.curve.mark) && q.curve.mark >= 0 && q.curve.mark <= T.MAX_U)) bad(`${where}: dot at ${q.curve.mark}`);
    }
    /* a question that points at a figure must have one */
    const text = q.q;
    if (/\b(diagram)\b/i.test(text) && !q.diagram) bad(`${where}: mentions a diagram but has none`);
    if (/\b(this curve|the curve|the graph|the dot|curve A)\b/i.test(text) && !q.curve) bad(`${where}: mentions a curve but has none`);
    if (/dot marks/i.test(text) && !(q.curve && q.curve.mark != null)) bad(`${where}: mentions a dot but has no mark`);

    /* the fact */
    const f = q.fact;
    if (!f) return;
    const miss = (m) => bad(`${where}: ${m}`);
    switch (f[0]) {
      case 'count': {
        const n = T.counts(f[1], f[2])[f[3]];
        if (right !== String(n)) miss(`right answer "${right}", the model has ${n}`);
        if (q.diagram && (q.diagram.sys !== f[1] || q.diagram.u !== f[2])) miss('the diagram is not the flask the fact is about');
        if (!q.diagram) miss('a count question must show its diagram');
        break;
      }
      case 'side': {
        const want = SIDE[T.side(f[1], f[2])];
        if (!right.startsWith(want)) miss(`right answer "${right}", the model says "${want}"`);
        break;
      }
      case 'higherSys': {
        const [a, b, u] = [f[1], f[2], f[3]];
        const hi = T.pH(a, u) > T.pH(b, u) ? a : b;
        if (!right.startsWith(LABEL[hi])) miss(`right answer should start "${LABEL[hi]}"`);
        break;
      }
      case 'setter': {
        const kind = T.setter(f[1], f[2]);
        if (!right.includes(T.SETTER_KEY[kind])) miss(`right answer must contain "${T.SETTER_KEY[kind]}" (${kind})`);
        others.forEach((c) => { if (c.includes(T.SETTER_KEY[kind])) miss(`a wrong choice also says "${T.SETTER_KEY[kind]}"`); });
        if (q.diagram && (q.diagram.sys !== f[1] || q.diagram.u !== f[2])) miss('the diagram is not the flask the fact is about');
        break;
      }
      case 'pka': {
        if (!right.includes(T.pKa(f[1]).toFixed(2))) miss(`right answer must contain the pKa ${T.pKa(f[1]).toFixed(2)}`);
        if (q.curve && q.curve.mark != null && (q.curve.systems[0].sys !== f[1] || q.curve.mark !== 12)) miss('the dot is not at the half-equivalence point of that acid');
        break;
      }
      case 'rankEq': {
        const order = f[1].slice().sort((a, b) => T.pH(a, 24) - T.pH(b, 24)).map((x) => RANK[x]).join(' < ');
        if (right !== order) miss(`right answer "${right}", the model ranks ${order}`);
        break;
      }
      case 'pair': {
        const pair = T.PAIRS.find((x) => x.id === f[1]);
        if (!pair) { miss('unknown pair'); break; }
        if (!right.startsWith(SIDE[T.pairSide(pair)])) miss(`right answer must start "${SIDE[T.pairSide(pair)]}"`);
        break;
      }
      case 'equivVol':
        if (!right.includes(T.volume(24).toFixed(2) + ' mL')) miss('right answer must be 25.00 mL');
        break;
      case 'curveIs':
        if (!right.startsWith(RANK[f[1]] + ' with NaOH')) miss(`right answer should start "${RANK[f[1]]} with NaOH"`);
        if (!q.curve || q.curve.systems.length !== 1 || q.curve.systems[0].sys !== f[1]) miss('the curve shown is not that titration');
        break;
      case 'pointOf': {
        const pt = T.POINTS.find((x) => x.u === f[2]);
        if (!pt) { miss(`u=${f[2]} is not one of the five points`); break; }
        if (right !== pt.name) miss(`right answer "${right}", the point is "${pt.name}"`);
        if (!q.diagram || q.diagram.sys !== f[1] || q.diagram.u !== f[2]) miss('the diagram is not the flask the fact is about');
        break;
      }
      case 'eqSetter': {
        if (T.equivalenceSetter(f[1]) !== 'A') miss('only a weak acid has a particle that decides the pH at equivalence');
        if (!right.startsWith(T.SYSTEMS[f[1]].anion)) miss(`right answer should start with ${T.SYSTEMS[f[1]].anion}`);
        break;
      }
      case 'sameVol':
        if (!right.startsWith('The same')) miss('right answer must start "The same"');
        if (T.volume(T.UNITS) !== 25) miss('the equivalence volume is not the same for both acids');
        break;
      case 'overlay':
        if (!right.startsWith('A is HF')) miss('curve A must be the weak acid');
        if (!(q.curve.systems[0].sys === 'WS' && q.curve.systems[0].label === 'A' && q.curve.systems[1].sys === 'SS' && q.curve.systems[1].label === 'B')) miss('curve A must be the HF curve and B the HCl curve');
        break;
      default: miss(`unknown fact "${f[0]}"`);
    }
  });
});
if (App.GRADED !== graded || graded !== 20) bad(`graded questions: App says ${App.GRADED}, the bank has ${graded}, the plan has 20`);

/* every question that reads the model must carry a fact (conceptual ones are listed) */
const CONCEPTUAL = new Set(['a-equiv-def', 'a-spectator', 'a-react', 'a-steep', 'a-ss-start', 'b-hf-ionize', 'b-half-why', 'b-na-spectator',
  'c-na-no', 'c-conj-base', 'c-always7', 'c-react-eq', 'c-eq-def', 'd-buffer-region', 'd-after-same']);
Object.keys(QUIZZES).forEach((k) => QUIZZES[k].pool.forEach((q) => {
  if (!q.fact && !CONCEPTUAL.has(q.id)) bad(`${q.id}: no fact, and not listed as a conceptual question`);
  if (q.fact && CONCEPTUAL.has(q.id)) bad(`${q.id}: listed as conceptual but carries a fact`);
}));

/* ------------------------------------------------------------ student text */

const read = (f) => fs.readFileSync(path.join(src, f), 'utf8');
const studentText = ['js/app.js', 'js/quiz.js', 'js/titration.js', 'js/particles.js', 'js/curve.js', 'index.html'].map(read).join('\n');
const BANNED = [[/\bcalculat/i, 'calculate'], [/Henderson/i, 'Henderson'], [/\bICE table/i, 'ICE table'], [/midpoint/i, 'midpoint'],
  [/half-neutrali[sz]/i, 'half-neutralization'], [/halfway point/i, 'halfway point'], [/half equivalence/i, 'half equivalence (use the hyphen)'],
  [/van der Waals/i, 'van der Waals']];
BANNED.forEach(([re, name]) => { if (re.test(studentText.replace(/No calculating is needed/g, ''))) bad(`student text uses "${name}"`); });
if (!/half-equivalence point/.test(studentText)) bad('student text never says "half-equivalence point"');
if (!/equivalence point/.test(studentText)) bad('student text never says "equivalence point"');

/* decimals in the questions must be values the model produces */
const allowed = new Set(['25.00', '12.50', '12.5', '31.25', '37.50', '0.100', T.PKA_HF.toFixed(2), T.PKA_AC.toFixed(2)]);
['SS', 'WS', 'AC'].forEach((sys) => T.POINTS.forEach((p) => { allowed.add(T.pH(sys, p.u).toFixed(2)); allowed.add(T.pH(sys, p.u).toFixed(1)); allowed.add(T.volume(p.u).toFixed(2)); }));
allowed.add('7.00'); allowed.add('7');
const quizText = read('js/quiz.js');
[...quizText.matchAll(/(?<![\d.])(\d+\.\d+)(?![\d.])/g)].forEach((m) => { if (!allowed.has(m[1])) bad(`quiz.js quotes ${m[1]}, which is not a value the model produces`); });

/* claims */
const hfFrac = T.counts('WS', 0).A / 24;
if (/about 8%/.test(studentText) && !near(100 * (-KA + Math.sqrt(KA * KA + 4 * KA * C0)) / 2 / C0, 8, 0.6)) bad('"about 8%" disagrees with the model');
const acFrac = (-KA_AC + Math.sqrt(KA_AC * KA_AC + 4 * KA_AC * C0)) / 2 / C0;
if (/1 in 75\b/.test(studentText) && !near(1 / acFrac, 75, 4)) bad(`"1 in 75" disagrees with the model (1 in ${Math.round(1 / acFrac)})`);
if (hfFrac < 0.05) bad('the HF flask is drawn with fewer than 5% ionized');

/* ------------------------------------------------------------------- steps */

const KINDS = ['setup', 'walk', 'quiz', 'compare', 'side', 'why', 'pairs', 'match', 'find', 'results'];
const stepIds = new Set();
App.STEPS.forEach((s) => {
  if (stepIds.has(s.id)) bad(`duplicate step id ${s.id}`);
  stepIds.add(s.id);
  if (!KINDS.includes(s.kind)) bad(`${s.id}: unknown kind ${s.kind}`);
  if (s.kind === 'quiz' && !QUIZZES[s.quiz]) bad(`${s.id}: no checkpoint ${s.quiz}`);
  if (s.kind === 'walk' && !(s.sys === 'SS' || s.sys === 'WS')) bad(`${s.id}: a walk must use HCl or HF, not ${s.sys}`);
  if (!App.PARTS.some((p) => p.n === s.part)) bad(`${s.id}: part ${s.part} does not exist`);
});
if (Object.keys(QUIZZES).some((k) => !App.STEPS.some((s) => s.quiz === k))) bad('a checkpoint is not in the step list');
if (App.STEPS.filter((s) => s.kind === 'walk').map((s) => s.sys).join() !== 'SS,WS') bad('the walks must be HCl first, then HF');
if (!App.PARTS.every((p) => App.STEPS.some((s) => s.part === p.n))) bad('a part has no steps');
T.POINTS.forEach((p) => { if (!App.CONTRAST[p.id]) bad(`no side-by-side text for the ${p.id} point`); });

/* the choices a walk offers: four different, exactly one right */
['SS', 'WS'].forEach((sys) => {
  for (let seed = 1; seed <= 40; seed++) {
    const rand = ctx.UI.rng(seed * 7919);
    T.POINTS.forEach((p, k) => {
      const fc = App.flaskChoices(sys, k, rand);
      const right = T.flask(sys, p.u);
      if (fc.choices.length !== 4 || new Set(fc.choices).size !== 4) bad(`${sys} point ${k + 1}: flask choices are not four different lists`);
      if (fc.choices[fc.answer] !== right) bad(`${sys} point ${k + 1}: flask answer ${fc.choices[fc.answer]} is not ${right}`);
      if (fc.choices.filter((c) => c === right).length !== 1) bad(`${sys} point ${k + 1}: the right flask list appears more than once`);
      const sc = App.setterChoices(sys, p.u, rand);
      const want = T.setterChoice(sys, T.setter(sys, p.u));
      if (sc.choices.length !== 4 || new Set(sc.choices).size !== 4) bad(`${sys} point ${k + 1}: pH choices are not four different statements`);
      if (sc.choices[sc.answer] !== want) bad(`${sys} point ${k + 1}: pH answer is ${sc.choices[sc.answer]}, not ${want}`);
    });
  }
  T.POINTS.forEach((p, k) => {
    if (!App.story(sys, k) || !App.phStory(sys, k).length) bad(`${sys} point ${k + 1}: no story`);
  });
});

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
  ans: {}, pick: {}, done: {}, wk: { 'ss-walk': 5, 'ws-walk': 5 }, seen: { setup: 1, 'side:side': { start: 1, half: 1, before: 1, equiv: 1, after: 1 } }, fin: 1, best: 100, att: 99
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
console.log('OK: model, curves and particle diagrams check out.');

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

/* --------------------------------------------------------------- the curves */

['SS', 'WS'].forEach((sys) => {
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

['SS', 'WS'].forEach((sys) => {
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
if (!near(T.reactingOneIn(), 57917, 200)) bad(`1 in ${T.reactingOneIn()} F- reacts at equivalence, hand-worked about 1 in 57,900`);

/* what sets the pH, by point */
const SETTER = {
  SS: { 0: 'strong-h', 12: 'strong-h', 18: 'strong-h', 24: 'neutral', 30: 'excess-oh' },
  WS: { 0: 'weak-acid', 12: 'buffer', 18: 'buffer', 24: 'conjugate-base', 30: 'excess-oh' }
};
Object.keys(SETTER).forEach((sys) => Object.keys(SETTER[sys]).forEach((u) => {
  if (T.setter(sys, +u) !== SETTER[sys][u]) bad(`${sys} u=${u}: setter ${T.setter(sys, +u)}, expected ${SETTER[sys][u]}`);
}));
T.PAIRS.forEach((p) => { if (T.pairSide(p) !== (p.strong ? 'equal' : 'above')) bad(`pair ${p.id}: wrong side of 7`); });

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

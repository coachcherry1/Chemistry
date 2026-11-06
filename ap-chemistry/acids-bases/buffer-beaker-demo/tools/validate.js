/* tools/validate.js: checks the chemistry, the beaker's particles and the packaging.
 *
 *   node tools/validate.js
 *
 * Fails when:
 * - a pKa or a pH (the equal buffer, pure water with drops, HA alone, A- alone) disagrees with the hand-worked value, or the Henderson-Hasselbalch value is
 *   not within 0.05 of the exact pH for a buffer with appreciable amounts of both members;
 * - a beaker does not conserve the pair (acid member + base member), does not balance
 *   charge, holds more particles than it has places for, or does not show the reaction
 *   exactly (each drop of HCl turns one base member into one acid member while the base
 *   member lasts; each drop of NaOH turns one acid member into one base member);
 * - the "same drops, stronger buffer" chart does not show a smaller pH change for more of
 *   a species (checked for every slider setting and every drop count where the member that
 *   reacts is not used up);
 * - the equation can be shown without its "only for a buffer" warning;
 * - the tool reports a score or has checkpoints;
 * - the manifest leaves a file out, or its identifiers match another package's;
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
  console, Math, JSON, Object, Array, String, Number, Error, isNaN, parseInt, Date, RegExp, URLSearchParams, Set, Promise,
  window: { matchMedia: () => ({ matches: false }), addEventListener() {} },
  document: { addEventListener() {}, documentElement: {} },
  getComputedStyle: () => ({ getPropertyValue: () => '' })
};
vm.createContext(ctx);
const html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].forEach((m) => {
  vm.runInContext(fs.readFileSync(path.join(src, m[1]), 'utf8'), ctx, { filename: m[1] });
});
const { Buf: B, Charts } = ctx;
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const KW = 1e-14, KA = 1.8e-5, U = 0.01;

/* ------------------------------------------------------------- the pH values */

if (f(B.pKa('HA')) !== '4.74') bad('the pKa (4.74) differs from the model');
function f(v) { return v.toFixed(2); }
['HA'].forEach((p) => { if (!near(B.pH(p, 10, 10, 0, 0), B.pKa(p), 0.01)) bad(`${p}: the equal buffer is not at the pKa`); });
for (let up = 0; up <= 12; up++) {
  const net = up * U, v = -Math.log10((net + Math.sqrt(net * net + 4 * KW)) / 2);
  if (!near(B.pH('HA', 0, 0, up, 0), v, 1e-6)) bad(`pure water with ${up} drops of HCl: ${B.pH('HA', 0, 0, up, 0)}, closed form ${v}`);
  const w = 14 + Math.log10((net + Math.sqrt(net * net + 4 * KW)) / 2);
  if (!near(B.pH('HA', 0, 0, 0, up), w, 1e-6)) bad(`pure water with ${up} drops of NaOH: ${B.pH('HA', 0, 0, 0, up)}, closed form ${w}`);
}
if (!near(B.pH('HA', 10, 0, 0, 0), -0.5 * Math.log10(KA * 0.1), 0.01)) bad('acetic acid alone: not the weak-acid value');
if (!near(B.pH('HA', 0, 10, 0, 0), 14 + 0.5 * Math.log10((KW / KA) * 0.1), 0.01)) bad('acetate alone: not the weak-base value');
/* HCl then NaOH into water: only the difference matters for pH, so 5 and 5 is pH 7 */
if (!near(B.pH('HA', 0, 0, 5, 5), 7, 1e-6)) bad('5 drops of HCl and 5 of NaOH in water should be pH 7');

let worst = 0, worstAt = '';
['HA'].forEach((p) => {
  for (let ha = 1; ha <= B.MAXC; ha++) for (let a = 1; a <= B.MAXC; a++) {
    if (!B.appreciable(ha, a)) continue;
    for (let up = 0; up <= 12; up++) for (const dn of [0, 3]) {
      if (up && dn) continue;
      const x = up - dn, h2 = ha + x, a2 = a - x;
      if (h2 < 1 || a2 < 1 || !B.appreciable(h2, a2)) continue;
      const d = Math.abs(B.pH(p, ha, a, up, dn) - B.hh(p, h2, a2));
      if (d > worst) { worst = d; worstAt = `${p} ${ha}/${a} up ${up} dn ${dn}`; }
    }
  }
});
if (worst > 0.05) bad(`the equation differs from the exact pH by ${worst.toFixed(3)} (${worstAt})`);
if (B.appreciable(10, 0) || B.appreciable(0, 10) || B.appreciable(0, 0)) bad('a weak acid alone, a conjugate base alone or water is called a buffer');
if (!B.appreciable(10, 10) || !B.appreciable(14, 6) || !B.appreciable(8, 12)) bad('a buffer is not called one');

/* ------------------------------------------------------------ the particles */

let n = 0;
['HA'].forEach((p) => {
  for (let ha = 0; ha <= B.MAXC; ha++) for (let a = 0; a <= B.MAXC; a++) {
    for (let up = 0; up <= B.MAXD; up++) for (let dn = 0; dn <= B.MAXD; dn += (dn < 3 ? 1 : 3)) {
      const c = B.counts(p, ha, a, up, dn), tag = `${p} ${ha}/${a} up ${up} dn ${dn}`;
      n++;
      if (c.HA + c.A !== ha + a) bad(`${tag}: acid member + base member = ${c.HA + c.A}, not ${ha + a}`);
      if (!B.chargeBalanced(p, ha, a, up, dn)) bad(`${tag}: the beaker does not balance charge ${JSON.stringify(c)}`);
      if (c.Na > 32 || c.Cl > 32 || c.H > 12 || c.OH > 12 || Math.min(c.HA, c.A, c.Na, c.Cl, c.H, c.OH) < 0) bad(`${tag}: out of range ${JSON.stringify(c)}`);
    }
    for (let k = 1; k <= Math.min(B.MAXD, a); k++) {
      const c = B.counts(p, ha, a, k, 0);
      if (c.A !== a - k || c.HA !== ha + k) bad(`${p} ${ha}/${a}: ${k} drops of HCl should make ${ha + k} acid members and ${a - k} base members, the beaker shows ${c.HA}/${c.A}`);
    }
    for (let k = 1; k <= Math.min(B.MAXD, ha); k++) {
      const c = B.counts(p, ha, a, 0, k);
      if (c.A !== a + k || c.HA !== ha - k) bad(`${p} ${ha}/${a}: ${k} drops of NaOH should make ${ha - k} acid members and ${a + k} base members, the beaker shows ${c.HA}/${c.A}`);
    }
    if (problems.length > 12) return;
  }
});

/* ------------------------------------------------ the strength chart */

let checked = 0;
['HA'].forEach((p) => {
  for (let ha = 1; ha <= B.MAXC; ha++) for (let a = 1; a <= B.MAXC; a++) for (const dir of ['acid', 'base']) for (let k = 1; k <= 10; k++) for (const vary of ['A', 'HA', 'both']) {
    const d = Charts.strengthData(p, ha, a, dir, k, vary);
    if (d[0].left <= 0) continue;                       /* the member that reacts is used up even at half strength */
    const m = d.map((x) => Math.abs(x.delta));
    checked++;
    for (let i = 1; i < m.length; i++) if (m[i] > m[i - 1] + 1e-9) { bad(`strength chart: more ${vary} gives a LARGER change (${p} ${ha}/${a} ${dir} ${k} drops: ${m.map((x) => x.toFixed(3)).join(' ')})`); break; }
    if (dir === 'acid' && d.some((x) => x.delta >= 0)) bad('strength chart: acid drops raised the pH');
    if (dir === 'base' && d.some((x) => x.delta <= 0)) bad('strength chart: base drops lowered the pH');
    if (problems.length > 12) return;
  }
});
if (checked < 1000) bad('the strength chart was barely checked');

/* ------------------------------------------------------------ the page text */

const read = (rel) => fs.readFileSync(path.join(src, rel), 'utf8');
const app = read('js/app.js'), scorm = read('js/scorm.js');
if (!/Only for a buffer\. /.test(app) || !/appreciable amounts of BOTH/.test(app)) bad('the equation warning is missing from app.js');
const eqFn = app.slice(app.indexOf('function paintEq'), app.indexOf('/* what the beaker, the meter'));
if (!/Only for a buffer/.test(eqFn)) bad('paintEq shows the equation without the warning');
const beakerSrc = read('js/beaker.js');
if (/'Na⁺'|'Cl⁻'/.test(beakerSrc)) bad('the beaker draws sodium or chloride ions');
if (/score\.raw|setScore|masteryscore/i.test(scorm + app + read('imsmanifest.xml').replace(/<!--[\s\S]*?-->/g, ''))) bad('this tool must not report a score');
if (/QUIZZES|recordAnswer|\bquiz-/.test(app + read('index.html'))) bad('this tool has no checkpoints');

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
onDisk.forEach((x) => { if (!listed.includes(x)) bad(`${x} is in src/ but not in the manifest`); });
listed.forEach((x) => { if (!onDisk.includes(x)) bad(`the manifest lists ${x}, which is not in src/`); });
[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]).forEach((x) => { if (!listed.includes(x)) bad(`${x} is loaded but not in the manifest`); });

const repo = path.join(root, '..', '..', '..');
const mine = [...manifest.matchAll(/identifier="([^"]+)"/g)].map((m) => m[1]);
(function scan(d, depth) {
  if (depth > 3) return;
  fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    if (!e.isDirectory() || e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist') return;
    const dir = path.join(d, e.name);
    if (path.resolve(dir) === path.resolve(root)) return;
    const mf = path.join(dir, 'src', 'imsmanifest.xml');
    if (fs.existsSync(mf)) {
      [...fs.readFileSync(mf, 'utf8').matchAll(/identifier="([^"]+)"/g)].forEach((m) => { if (mine.includes(m[1])) bad(`identifier ${m[1]} is also used by ${path.relative(repo, dir)}`); });
      return;
    }
    scan(dir, depth + 1);
  });
})(repo, 0);

(function scan(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
    const file = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'dist') scan(file); return; }
    if (!/\.(js|html|css|md|xml|sh)$/.test(e.name)) return;
    if (fs.readFileSync(file, 'utf8').indexOf(String.fromCharCode(0x2014)) >= 0) bad(`${path.relative(root, file)} contains an em dash`);
  });
})(root);

if (problems.length) {
  console.error('FAILED:\n - ' + problems.slice(0, 20).join('\n - ') + (problems.length > 20 ? `\n ... and ${problems.length - 20} more` : ''));
  process.exit(1);
}
console.log(`OK: model, ${n} beaker states, ${checked} strength-chart settings and packaging check out.`);

/* tools/validate.js: checks the chemistry, the problems and the judging.
 *
 *   node tools/validate.js
 *
 * Fails when:
 * - an atomic mass on screen is not the standard atomic weight rounded to the
 *   tenths place (the textbook values below), or an accepted alternative is
 *   not what a two-decimal table gives (Fe 55.9, Cu 63.6);
 * - a formula is read differently from the independent count below, or a
 *   molar mass differs from the tenths added up by hand;
 * - a substance is called a gas without boiling below 0 °C (or the other way
 *   round), or its kind (element, diatomic, molecular, ionic) is wrong;
 * - the teacher's formative quiz does not come out as worked by hand;
 * - over many seeds, a set is not 3 one-step, 5 two-step and 4 three-step
 *   problems starting with a one-step one, uses the ratio fewer than 4 times
 *   or 22.4 L fewer than 2, repeats a substance, offers an untrue equality
 *   (22.4 L for a non-gas, particles of an ionic compound, a wrong ratio),
 *   has a shorter route than its step count, or an answer that differs from
 *   a direct mole calculation; or a given quantity or an answer shows the
 *   wrong number of significant figures;
 * - the judges refuse a right molar mass, ratio or answer, or accept a slip;
 * - the manifest, the storage key or the SCORM identifiers clash, a path is
 *   absolute, something loads from the network, or any file contains an em
 *   dash or the words "formula unit".
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
const problems = [];
const bad = (m) => { if (problems.length < 60) problems.push(m); else if (problems.length === 60) problems.push('...'); };

const ctx = {
  console, Math, JSON, Object, Array, String, Number, Error, isNaN, isFinite, parseInt, parseFloat, Date, RegExp, URLSearchParams,
  window: { matchMedia: () => ({ matches: false }), addEventListener() {} },
  document: { addEventListener() {}, documentElement: {} }
};
vm.createContext(ctx);
const html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
scripts.forEach((f) => vm.runInContext(fs.readFileSync(path.join(src, f), 'utf8'), ctx, { filename: f }));
const { ELEMENTS, SUBSTANCES, Chem, Gen, App } = ctx;

/* ------------------------------------------------------------- elements */

/* Tenths values from a standard periodic table, for every element used. */
const TENTHS = {
  H: 1.0, He: 4.0, C: 12.0, N: 14.0, O: 16.0, F: 19.0, Ne: 20.2, Na: 23.0, Mg: 24.3, Al: 27.0, Si: 28.1, P: 31.0,
  S: 32.1, Cl: 35.5, K: 39.1, Ca: 40.1, Fe: 55.8, Ni: 58.7, Cu: 63.5, Zn: 65.4, Br: 79.9, Kr: 83.8, Ag: 107.9,
  Sn: 118.7, I: 126.9, Au: 197.0, Pb: 207.2
};
/* where a two-decimal table (55.85, 63.55) rounds to a different tenth */
const ALT = { Fe: 55.9, Cu: 63.6 };

const used = new Set();
SUBSTANCES.forEach((s) => Object.keys(Chem.sp(s.f).counts).forEach((x) => used.add(x)));
used.forEach((x) => {
  if (!(x in TENTHS)) bad('element ' + x + ' is used but has no textbook tenths value here');
  else if (Chem.t10(x) !== Math.round(TENTHS[x] * 10)) bad(x + ' shows ' + Chem.tableMass(x) + ', expected ' + TENTHS[x].toFixed(1));
  const alt = Chem.alt10(x);
  if ((alt == null) !== !(x in ALT)) bad(x + ': alternative tenths value ' + alt + ' where expected ' + ALT[x]);
  else if (alt != null && alt !== Math.round(ALT[x] * 10)) bad(x + ' alternative ' + alt / 10 + ', expected ' + ALT[x]);
});
Object.keys(ELEMENTS).forEach((x) => {
  const e = ELEMENTS[x];
  if (!/^(\d+\.\d+|\d+|\(\d+\))$/.test(e.std)) bad(x + ': unreadable standard atomic weight ' + e.std);
  if (!Chem.radioactive(x)) {
    const t = Chem.t10(x) / 10, std = parseFloat(e.std);
    if (Math.abs(t - std) > 0.05 + 1e-9) bad(x + ': tenths value ' + t + ' is not ' + e.std + ' rounded');
  }
});
const cells = new Set();
Object.keys(ELEMENTS).forEach((x) => {
  const k = ELEMENTS[x].period + ':' + ELEMENTS[x].group;
  if (cells.has(k)) bad('two elements in one periodic table cell ' + k);
  cells.add(k);
});

/* ------------------------------------------------------------- formulas */

/* An independent reading: expand brackets by text, then count. */
function countIndependent(f) {
  let s = f;
  for (;;) {
    const m = /\(([^()]+)\)(\d*)/.exec(s);
    if (!m) break;
    const n = +(m[2] || 1);
    const inner = m[1].replace(/([A-Z][a-z]?)(\d*)/g, (q, el, d) => el + (+(d || 1) * n));
    s = s.slice(0, m.index) + inner + s.slice(m.index + m[0].length);
  }
  const out = {};
  for (const m of s.matchAll(/([A-Z][a-z]?)(\d*)/g)) out[m[1]] = (out[m[1]] || 0) + +(m[2] || 1);
  return out;
}
const same = (a, b) => JSON.stringify(Object.keys(a).sort().map((k) => [k, a[k]])) === JSON.stringify(Object.keys(b).sort().map((k) => [k, b[k]]));

/* Boiling (or subliming) point at 1 atm, °C: below 0 means a gas at STP. */
const BP = {
  He: -269, Ne: -246, Kr: -153, H2: -253, N2: -196, O2: -183, F2: -188, Cl2: -34, Br2: 59, I2: 184,
  CO2: -78, CO: -191, CH4: -162, NH3: -33, SO2: -10, N2O: -88, C2H6: -89, C3H8: -42, H2S: -60, HCl: -85, SF6: -64,
  H2O: 100, PCl3: 76, SBr2: 60, CCl4: 77, N2O5: 33, P4O10: 360, C8H18: 126
};
const METALS = new Set(['Li', 'Na', 'K', 'Mg', 'Ca', 'Al', 'Fe', 'Ni', 'Cu', 'Zn', 'Ag', 'Sn', 'Au', 'Pb']);
const DIATOMIC = new Set(['H2', 'N2', 'O2', 'F2', 'Cl2', 'Br2', 'I2']);

const keys = new Set();
SUBSTANCES.forEach((s) => {
  if (keys.has(s.f)) bad('substance listed twice: ' + s.f);
  keys.add(s.f);
  const sp = Chem.sp(s.f);
  if (!same(sp.counts, countIndependent(s.f))) bad(s.f + ': read as ' + JSON.stringify(sp.counts) + ', expected ' + JSON.stringify(countIndependent(s.f)));
  const byHand = Object.entries(countIndependent(s.f)).reduce((t, [x, n]) => t + n * Math.round(TENTHS[x] * 10), 0);
  if (Chem.mm10(s.f) !== byHand) bad(s.f + ': molar mass ' + Chem.mmText(s.f) + ', by hand ' + (byHand / 10).toFixed(1));
  const exact = Object.entries(sp.counts).reduce((t, [x, n]) => t + n * parseFloat(ELEMENTS[x].std), 0);
  Chem.mmAccepted(s.f).forEach((a) => {
    if (Math.abs(a / 10 - exact) > 0.35) bad(s.f + ': accepted molar mass ' + a / 10 + ' is far from ' + exact.toFixed(3));
  });
  if (!Chem.mmAccepted(s.f).includes(Chem.mm10(s.f))) bad(s.f + ': the on-screen molar mass is not accepted');
  if (!Chem.mmAccepted(s.f).includes(Math.round(exact * 10))) bad(s.f + ': the exact molar mass rounded at the end is not accepted');
  /* gas at STP */
  const solid = sp.kind === 'ionic' || (sp.kind === 'element' && !(s.f in BP)) || /^C(6|12)H/.test(s.f);
  const gasByData = s.f in BP ? BP[s.f] < 0 : false;
  if (!(s.f in BP) && !solid) bad(s.f + ': no boiling point to decide gas or not');
  if (!!s.gas !== gasByData) bad(s.f + (s.gas ? ' is called a gas at STP but boils at ' : ' is not called a gas but boils at ') + BP[s.f] + ' °C');
  /* kind */
  const syms = Object.keys(sp.counts);
  const kind = syms.length === 1 && sp.counts[syms[0]] === 1 && s.f === syms[0] ? 'element'
    : DIATOMIC.has(s.f) ? 'diatomic'
    : syms.some((x) => METALS.has(x)) || /^\(NH4\)/.test(s.f) ? 'ionic' : 'molecular';
  if (kind !== s.kind) bad(s.f + ' is listed as ' + s.kind + ', expected ' + kind);
  if (sp.kind === 'ionic' && sp.part) bad(s.f + ': an ionic compound must not be counted in particles');
});

/* ---------------------------------------------------- the teacher's quiz */

function solveText(fromTok, toTok, given, sig) {
  const A = Chem.untok(fromTok).key, B = Chem.untok(toTok).key;
  const ids = [...new Set(Chem.edgesOf(A).concat(Chem.edgesOf(B), Chem.ratiosOf(A), Chem.ratiosOf(B)))];
  const route = Chem.route(fromTok, toTok, ids);
  return { steps: route.length, text: Chem.fmtSig(Chem.chainValue(given, route), sig) };
}
[
  ['L|He', 'mol|He', 21.55, 4, 1, '0.9621'],
  ['g|Mg(NO3)2', 'mol|Mg(NO3)2', 53.0, 3, 1, '0.357'],
  ['part|PCl3', 'g|PCl3', 8.15e25, 3, 2, '1.86 × 10⁴'],
  ['g|SBr2', 'part|Br', 9.340, 4, 3, '5.862 × 10²²']
].forEach(([f, t, g, sig, steps, want]) => {
  const r = solveText(f, t, g, sig);
  if (r.text !== want || r.steps !== steps) bad('quiz anchor ' + f + ' to ' + t + ': ' + r.steps + ' steps, ' + r.text + '; expected ' + steps + ', ' + want);
});
[['SBr2', '191.9'], ['Mg(NO3)2', '148.3'], ['PCl3', '137.5'], ['He', '4.0']].forEach(([k, v]) => {
  if (Chem.mmText(k) !== v) bad('quiz molar mass of ' + k + ' is ' + Chem.mmText(k) + ', expected ' + v);
});

/* ------------------------------------------------------------ the judges */

SUBSTANCES.forEach((s) => {
  const k = s.f;
  if (!Chem.judgeMM(k, Chem.mmText(k)).ok) bad(k + ': its own molar mass ' + Chem.mmText(k) + ' is refused');
  Chem.mmAccepted(k).forEach((a) => { if (!Chem.judgeMM(k, (a / 10).toFixed(1)).ok) bad(k + ': accepted ' + a / 10 + ' is refused'); });
  if (Chem.judgeMM(k, '').kind !== 'empty') bad(k + ': an empty molar mass is not called empty');
  const two = Object.entries(Chem.sp(k).counts).reduce((t, [x, n]) => t + n * parseFloat(ELEMENTS[x].std), 0).toFixed(2);
  if (Chem.judgeMM(k, two).kind !== 'tenths' && !Chem.judgeMM(k, two).ok) bad(k + ': ' + two + ' (two decimals) is not told to round to tenths');
  Chem.mmSlips(k).forEach((sl) => {
    const j = Chem.judgeMM(k, (sl.v10 / 10).toFixed(1));
    if (j.ok) bad(k + ': the slip ' + sl.v10 / 10 + ' (' + sl.kind + ') is accepted');
    if (/—/.test(sl.msg)) bad(k + ': em dash in a slip message');
  });
  const sp = Chem.sp(k);
  if (sp.compound) sp.order.forEach((b) => {
    const n = sp.counts[b];
    if (!Chem.judgeRatio(k, b, String(n)).ok) bad(k + ' to ' + b + ': the ratio ' + n + ' is refused');
    if (Chem.judgeRatio(k, b, String(n + 1)).ok) bad(k + ' to ' + b + ': the ratio ' + (n + 1) + ' is accepted');
    if (Chem.edge('ratio:' + k + ':' + b).R.v !== countIndependent(k)[b]) bad(k + ' to ' + b + ': the ratio equality is wrong');
  });
});
if (Chem.judgeMM('SBr2', '112.0').kind !== 'subscripts') bad('SBr2 112.0 is not diagnosed as subscripts left out');
if (Chem.judgeMM('Mg(NO3)2', '86.3').kind !== 'brackets') bad('Mg(NO3)2 86.3 is not diagnosed as brackets');
if (Chem.judgeRatio('Mg(NO3)2', 'O', '3').kind !== 'brackets') bad('Mg(NO3)2 O ratio 3 is not diagnosed as brackets');

[['5.86e22', 5.86e22, 3], ['5.86 x 10^22', 5.86e22, 3], ['5.86 × 10²²', 5.86e22, 3], ['5.86 × 10^-22', 5.86e-22, 3],
 ['0.0350', 0.035, 3], ['350', 350, 2], ['3.50e2', 350, 3], ['1,250', 1250, 3]].forEach(([t, v, sf]) => {
  const p = Chem.parseNum(t);
  if (Math.abs(p - v) > Math.abs(v) * 1e-12) bad('parseNum("' + t + '") gave ' + p);
  if (Chem.sigFigsIn(t) !== sf) bad('sigFigsIn("' + t + '") gave ' + Chem.sigFigsIn(t) + ', expected ' + sf);
});
['5.86e22x', '5.86 10 22', 'abc', '1..2'].forEach((t) => { if (!isNaN(Chem.parseNum(t))) bad('parseNum("' + t + '") should not read'); });

/* ------------------------------------------------------------ the problems */

const plan = { 1: 3, 2: 5, 3: 4 };
function direct(p) {
  /* moles of the start substance, across the ratio if needed, then the target unit */
  const f = Chem.untok(p.fromTok), t = Chem.untok(p.toTok);
  const M = (k) => Object.entries(countIndependent(k)).reduce((s, [x, n]) => s + n * TENTHS[x], 0);
  let n = f.node === 'g' ? p.given.v / M(f.key) : f.node === 'part' ? p.given.v / 6.022e23 : f.node === 'L' ? p.given.v / 22.4 : p.given.v;
  if (f.key !== t.key) {
    if (f.key === p.A) n = n * countIndependent(p.A)[t.key];
    else n = n / countIndependent(p.A)[f.key];
  }
  return t.node === 'g' ? n * M(t.key) : t.node === 'part' ? n * 6.022e23 : t.node === 'L' ? n * 22.4 : n;
}
function checkProblem(p, where) {
  const A = Chem.sp(p.A);
  if (p.B && !(p.B in A.counts)) bad(where + ': ' + p.B + ' is not in ' + p.A);
  const route = Chem.route(p.fromTok, p.toTok, p.pool);
  if (!route || route.length !== p.steps) bad(where + ': shortest route ' + (route && route.length) + ', labelled ' + p.steps);
  if (p.path.length !== p.steps) bad(where + ': solution path has ' + p.path.length + ' factors');
  const an = Chem.cancel(p.fromTok, p.path);
  if (!Chem.unitsReach(an, p.toTok)) bad(where + ': the solution leaves ' + Chem.leftText(an));
  if (new Set(p.pool).size !== p.pool.length) bad(where + ': a repeated equality in the pool');
  if (p.pool.length > 8) bad(where + ': ' + p.pool.length + ' equalities in the pool');
  p.pool.forEach((id) => {
    const e = Chem.edge(id);
    if (e.type === 'stp' && !Chem.sp(e.s).gas) bad(where + ': 22.4 L offered for ' + e.s);
    if (e.type === 'stp' && !SUBSTANCES.some((s) => s.f === e.s)) bad(where + ': 22.4 L offered for an element inside a compound');
    if (e.type === 'av' && !Chem.sp(e.s).part) bad(where + ': particles offered for ' + e.s);
    if (e.type === 'ratio' && e.R.v !== countIndependent(e.a)[e.b]) bad(where + ': wrong ratio ' + id);
  });
  [p.fromTok, p.toTok].forEach((t) => {
    const u = Chem.untok(t);
    if (u.node === 'part' && !Chem.sp(u.key).part) bad(where + ': counts particles of ' + u.key);
    if (u.node === 'L' && !Chem.sp(u.key).gas) bad(where + ': volume at STP of ' + u.key);
  });
  const d = direct(p);
  if (Math.abs(d - p.ans) > Math.abs(d) * 1e-9) bad(where + ': answer ' + p.ans + ', direct calculation ' + d);
  if (Chem.sigFigsIn(p.given.str) !== p.given.sig) bad(where + ': given ' + p.given.str + ' does not show ' + p.given.sig + ' significant figures');
  if (Math.abs(Chem.parseNum(p.given.str) - p.given.v) > Math.abs(p.given.v) * 1e-12) bad(where + ': given ' + p.given.str + ' reads as ' + Chem.parseNum(p.given.str));
  if (Chem.untok(p.fromTok).node !== 'part' && /×/.test(p.given.str)) bad(where + ': given ' + p.given.str + ' in scientific notation');
  if (Chem.sigFigsIn(p.ansStr) !== p.given.sig) bad(where + ': answer ' + p.ansStr + ' shows the wrong significant figures');
  if (!Chem.judgeAnswer(p.ansStr, p.ans, p.given.sig).ok) bad(where + ': the answer ' + p.ansStr + ' is refused');
  if (!Chem.judgeAnswer(p.ansAscii, p.ans, p.given.sig).ok) bad(where + ': the answer ' + p.ansAscii + ' is refused');
  const wrongSig = Chem.fmtSig(p.ans, p.given.sig + 1);
  if (Chem.judgeAnswer(wrongSig, p.ans, p.given.sig).ok) bad(where + ': ' + wrongSig + ' (one figure too many) is accepted');
  /* (an answer near 1 is its own reciprocal within rounding, so it is left out) */
  if (Math.abs(1 / p.ans - p.ans) / p.ans > 0.05 && Chem.judgeAnswer(String(1 / p.ans), p.ans, p.given.sig).kind !== 'reciprocal') {
    bad(where + ': the reciprocal is not diagnosed');
  }
  /* the answer with any accepted molar mass is accepted against that molar mass */
  p.path.forEach((t) => {
    const e = Chem.edge(t.e);
    if (e.type !== 'mm') return;
    Chem.mmAccepted(e.s).forEach((a) => {
      const vals = {}; vals[t.e] = a / 10;
      const ex = Chem.chainValue(p.given.v, p.path, vals);
      if (!Chem.judgeAnswer(Chem.fmtSig(ex, p.given.sig), ex, p.given.sig).ok) bad(where + ': refused with molar mass ' + a / 10);
    });
  });
  if (/—/.test(p.fromText + p.toText)) bad(where + ': em dash in a prompt');
  if (/ L /.test(p.fromText + ' ') !== /at STP/.test(p.fromText)) bad(where + ': "at STP" missing or misplaced in ' + p.fromText);
}

const SEEDS = 400;
for (let seed = 1; seed <= SEEDS; seed++) {
  const set = Gen.set(seed);
  if (JSON.stringify(set) !== JSON.stringify(Gen.set(seed))) bad('seed ' + seed + ': the set is not the same twice');
  if (set.length !== App.GRADED) bad('seed ' + seed + ': ' + set.length + ' problems');
  const by = { 1: 0, 2: 0, 3: 0 };
  set.forEach((p) => { by[p.steps]++; });
  [1, 2, 3].forEach((n) => { if (by[n] !== plan[n]) bad('seed ' + seed + ': ' + by[n] + ' problems of ' + n + ' steps'); });
  if (set[0].steps !== 1) bad('seed ' + seed + ': starts with a ' + set[0].steps + '-step problem');
  const ratio = set.filter((p) => p.path.some((t) => Chem.edge(t.e).type === 'ratio')).length;
  const stp = set.filter((p) => p.path.some((t) => Chem.edge(t.e).type === 'stp')).length;
  if (ratio < 4) bad('seed ' + seed + ': only ' + ratio + ' problems use the ratio');
  if (stp < 2) bad('seed ' + seed + ': only ' + stp + ' problems use 22.4 L');
  const As = set.map((p) => p.A);
  if (new Set(As).size !== As.length) bad('seed ' + seed + ': a substance repeats: ' + As.join(' '));
  const ids = set.map((p) => p.id);
  if (new Set(ids).size !== ids.length) bad('seed ' + seed + ': repeated interaction ids');
  ids.forEach((id) => { if (!/^[A-Za-z0-9_]{1,255}$/.test(id)) bad('seed ' + seed + ': bad interaction id ' + id); });
  set.forEach((p, i) => checkProblem(p, 'seed ' + seed + ' problem ' + (i + 1)));
  Gen.WARM.forEach((w) => {
    const p = Gen.warm(seed, w);
    checkProblem(p, 'seed ' + seed + ' ' + w);
    const road = { 'w-mass': 'mm', 'w-part': 'av', 'w-stp': 'stp', 'w-ratio': 'ratio' }[w];
    if (p.steps !== 1 || Chem.edge(p.path[0].e).type !== road) bad('seed ' + seed + ' ' + w + ': not one step on the ' + road + ' road');
  });
}
const w = App.STEPS.filter((s) => s.kind === 'warm').map((s) => s.id);
if (JSON.stringify(w) !== JSON.stringify(Gen.WARM)) bad('the warm-up steps and Gen.WARM differ');
if (!(App.SCHEMA >= 1)) bad('no SCHEMA in app.js');

/* ------------------------------------------------------------- packaging */

const manifest = fs.readFileSync(path.join(src, 'imsmanifest.xml'), 'utf8');
if (/masteryscore/.test(manifest.replace(/<!--[\s\S]*?-->/g, ''))) bad('the manifest sets a masteryscore');
const listed = [...manifest.matchAll(/<file href="([^"]+)"\/>/g)].map((m) => m[1]).sort();
const onDisk = [];
(function walk(d, rel) {
  fs.readdirSync(d).forEach((f) => {
    const p = path.join(d, f), r = rel ? rel + '/' + f : f;
    if (fs.statSync(p).isDirectory()) walk(p, r);
    else if (f !== 'imsmanifest.xml' && !f.startsWith('.')) onDisk.push(r);
  });
})(src, '');
if (JSON.stringify(listed) !== JSON.stringify(onDisk.sort())) bad('manifest files ' + listed.join(',') + ' differ from src ' + onDisk.join(','));
scripts.forEach((f) => { if (!listed.includes(f)) bad(f + ' is loaded but not in the manifest'); });
const ids = [...manifest.matchAll(/identifier="([^"]+)"/g)].map((m) => m[1]);
const repo = path.join(root, '..', '..', '..');
(function walk(d) {
  fs.readdirSync(d).forEach((f) => {
    if (f === 'node_modules' || f === '.git') return;
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f === 'imsmanifest.xml' && path.resolve(p) !== path.resolve(src, 'imsmanifest.xml')) {
      const other = fs.readFileSync(p, 'utf8');
      ids.forEach((id) => { if (other.includes('"' + id + '"')) bad('SCORM identifier ' + id + ' is also in ' + p); });
    } else if (f === 'scorm.js' && !p.startsWith(src)) {
      if (fs.readFileSync(p, 'utf8').includes("'mole-conversions-state'")) bad('storage key also used in ' + p);
    }
  });
})(repo);
if (!fs.readFileSync(path.join(src, 'js', 'scorm.js'), 'utf8').includes("'mole-conversions-state'")) bad('scorm.js does not use its own storage key');

const texts = [];
(function walk(d) {
  fs.readdirSync(d).forEach((f) => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { if (f !== 'dist') walk(p); }
    else if (/\.(js|html|css|md|xml|sh)$/.test(f)) texts.push(p);
  });
})(root);
texts.forEach((p) => {
  const t = fs.readFileSync(p, 'utf8');
  const rel = path.relative(root, p);
  if (/—|\\u2014|&mdash;/.test(t) && rel !== path.join('tools', 'validate.js')) bad(rel + ' contains an em dash');
  if (/formula units?/i.test(t) && rel.startsWith('src')) bad(rel + ' says "formula unit"');
  if (rel.startsWith('src') && /(src|href)="\//.test(t)) bad(rel + ' has an absolute path');
  if (rel.startsWith('src') && /(src|href)="https?:|url\(["']?https?:|@import/.test(t)) bad(rel + ' loads something from the network');
});

if (problems.length) {
  console.error('validate: ' + problems.length + ' problem(s)\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('validate: ok (' + SUBSTANCES.length + ' substances, ' + used.size + ' elements, ' + SEEDS + ' seeds of ' +
  App.GRADED + ' problems and 4 warm-ups, the teacher’s quiz anchors, judges and packaging)');

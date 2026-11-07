/* tools/validate.js: checks the chemistry, the problems and the judging.
 *
 *   node tools/validate.js
 *
 * Fails when:
 * - an atomic mass on screen is not the standard atomic weight rounded to the
 *   tenths place (the textbook values below), or an accepted alternative is
 *   not what a two-decimal table gives (Fe 55.9, Cu 63.6);
 * - a formula is read differently from the independent count below, or a
 *   molar mass differs from the tenths added up by hand, or a name differs
 *   from the one built again here from its ions or prefixes;
 * - a substance is called a gas without boiling below 0 °C (or the other way
 *   round), or its kind (element, diatomic, molecular, ionic) is wrong;
 * - the teacher's formative quiz does not come out as worked by hand (with
 *   Avogadro's number as the class rounds it, 6.02 x 10^23);
 * - a substance offered as a solution is not soluble enough: every maxM must
 *   be half of the real solubility or less, and every molarity at most maxM,
 *   with as many significant figures as the volume;
 * - over many seeds, a set is not 3 one-step, 5 two-step and 4 three-step
 *   problems starting with a one-step one, uses the ratio fewer than 4 times
 *   or 22.4 L fewer than 2, repeats a substance, offers an untrue equality
 *   (22.4 L for a non-gas, particles of an ionic compound, a wrong ratio),
 *   has a shorter route than its step count, or an answer that differs from
 *   a direct mole calculation; or a given quantity or an answer shows the
 *   wrong number of significant figures (in the molarity version: 14 problems,
 *   4 one-, 5 two-, 4 three- and 1 four-step, 4 with a molarity, 2 in mL);
 * - a worked solution's LaTeX does not typeset (Tex.toMathML) to balanced
 *   MathML;
 * - the judges refuse a right molar mass, ratio or answer, or accept a slip;
 *   an answer or molar mass within 1.5% (Chem.TOL) is refused, or one 2% off
 *   accepted; or a student working from any of five other periodic tables
 *   (tools/tables.js) is marked wrong on any problem;
 * - the manifest, the storage key or the SCORM identifiers clash, a path is
 *   absolute, something loads from the network, or any file contains an em
 *   dash, the words "formula unit", "Mole Town" (it is the mole map) or
 *   "L at STP" (it is L of gas), or 6.022;
 * - a file the two mole conversion packages share differs between them
 *   (everything in src/js and tools except config.js, and the stylesheet).
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
const { ELEMENTS, SUBSTANCES, Chem, Gen, App, Tex, CONFIG } = ctx;
const AVO = 6.02e23;

/* ------------------------------------------------------------- elements */

/* Tenths values from a standard periodic table, for every element used. */
const TENTHS = {
  H: 1.0, He: 4.0, C: 12.0, N: 14.0, O: 16.0, F: 19.0, Ne: 20.2, Na: 23.0, Mg: 24.3, Al: 27.0, Si: 28.1, P: 31.0,
  S: 32.1, Cl: 35.5, Ar: 39.9, K: 39.1, Ca: 40.1, Cr: 52.0, Fe: 55.8, Ni: 58.7, Cu: 63.5, Zn: 65.4, Ga: 69.7, Br: 79.9,
  Kr: 83.8, Ag: 107.9, Sn: 118.7, I: 126.9, Ba: 137.3, Au: 197.0, Pb: 207.2
};
/* where a two-decimal table (55.85, 63.55, 39.95) rounds to a different tenth */
const ALT = { Fe: 55.9, Cu: 63.6, Ar: 40.0 };

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
  He: -269, Ne: -246, Ar: -186, Kr: -153, H2: -253, N2: -196, O2: -183, F2: -188, Cl2: -34, Br2: 59, I2: 184,
  CO2: -78, CO: -191, CH4: -162, NH3: -33, SO2: -10, N2O: -88, C2H6: -89, C3H8: -42, H2S: -60, HCl: -85, SF6: -64,
  H2O: 100, PCl3: 76, SBr2: 60, CCl4: 77, N2O5: 33, P4O10: 360, C8H18: 126
};
const METALS = new Set(['Li', 'Na', 'K', 'Mg', 'Ca', 'Ba', 'Al', 'Ga', 'Cr', 'Fe', 'Ni', 'Cu', 'Zn', 'Ag', 'Sn', 'Au', 'Pb']);
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


/* ---------------------------------------------------------------- names */

const CATION = { Na: 'sodium', K: 'potassium', Mg: 'magnesium', Ca: 'calcium', Ba: 'barium', Al: 'aluminum', Ga: 'gallium',
  Zn: 'zinc', Fe: 'iron', Cu: 'copper', NH4: 'ammonium' };
const CHARGE = { Na: 1, K: 1, Mg: 2, Ca: 2, Ba: 2, Al: 3, Ga: 3, Zn: 2, NH4: 1 };
const ANION = { Cl: ['chloride', 1], Br: ['bromide', 1], F: ['fluoride', 1], O: ['oxide', 2], SO4: ['sulfate', 2],
  CO3: ['carbonate', 2], HCO3: ['hydrogen carbonate', 1], NO3: ['nitrate', 1], PO4: ['phosphate', 3], OH: ['hydroxide', 1],
  C2H3O2: ['acetate', 1] };
const ROMAN = ['', 'I', 'II', 'III', 'IV'];
function ionicName(f) {
  const m = /^(\(NH4\)|[A-Z][a-z]?)(\d*)(.+)$/.exec(f);
  const cat = m[1].replace(/[()]/g, ''), nc = +(m[2] || 1);
  let an, na;
  const g = /^\(([^()]+)\)(\d+)$/.exec(m[3]);
  if (g) { an = g[1]; na = +g[2]; }
  else if (ANION[m[3]]) { an = m[3]; na = 1; }
  else { const e = /^([A-Z][a-z]?)(\d*)$/.exec(m[3]); an = e[1]; na = +(e[2] || 1); }
  if (!CATION[cat] || !ANION[an]) return null;
  const charge = ANION[an][1] * na / nc;
  if (CHARGE[cat] && CHARGE[cat] !== charge) return 'charges do not balance';
  return CATION[cat] + (CHARGE[cat] ? '' : '(' + ROMAN[charge] + ')') + ' ' + ANION[an][0];
}
const PREFIX = ['', 'mono', 'di', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa', 'nona', 'deca'];
const ROOT = { O: 'ox', S: 'sulf', Cl: 'chlor', Br: 'brom', F: 'fluor', N: 'nitr', P: 'phosph' };
function prefixName(f) {
  const parts = [...f.matchAll(/([A-Z][a-z]?)(\d*)/g)].map((m) => [m[1], +(m[2] || 1)]);
  if (parts.length !== 2) return null;
  const [[a, na], [b, nb]] = parts;
  const second = (PREFIX[nb] + ROOT[b] + 'ide').replace(/([ao])oxide$/, 'oxide');
  return (na > 1 ? PREFIX[na] : '') + ELEMENTS[a].name + ' ' + second;
}
const COMMON = { H2O: 'water', NH3: 'ammonia', CH4: 'methane', C2H6: 'ethane', C3H8: 'propane', C8H18: 'octane',
  C6H12O6: 'glucose', C12H22O11: 'sucrose', H2S: 'hydrogen sulfide', HCl: 'hydrogen chloride' };
SUBSTANCES.forEach((s) => {
  const sp = Chem.sp(s.f);
  const want = s.kind === 'element' || s.kind === 'diatomic' ? ELEMENTS[Object.keys(sp.counts)[0]].name
    : COMMON[s.f] || (s.kind === 'ionic' ? ionicName(s.f) : prefixName(s.f));
  if (sp.name !== want) bad(s.f + ' is named "' + sp.name + '", expected "' + want + '"');
});

/* ------------------------------------------------------------ solubility */

/* Solubility in water near 20 \u00B0C, mol per litre of saturated solution (rounded down). */
const SOL = {
  NH3: 15, C6H12O6: 3.2, C12H22O11: 2.6, NaCl: 5.4, KCl: 4.0, CaCl2: 5.0, MgCl2: 4.5, AlCl3: 3.0, GaCl3: 5.0, KBr: 4.5,
  Na2SO4: 1.8, K2SO4: 0.6, Na2CO3: 1.8, K2CO3: 5.5, NaHCO3: 1.1, NaNO3: 6.5, CuSO4: 1.2, K3PO4: 3.0, 'Mg(NO3)2': 3.6,
  'Ca(NO3)2': 5.0, 'Zn(NO3)2': 4.0, 'Ba(NO3)2': 0.4, 'Al(NO3)3': 2.6, 'Ca(C2H3O2)2': 2.0, '(NH4)2SO4': 4.0
};
SUBSTANCES.forEach((s) => {
  if (!s.aq) return;
  if (!(s.f in SOL)) bad(s.f + ' is offered as a solution with no solubility to check');
  else if (!(s.maxM > 0 && s.maxM <= SOL[s.f] / 2 + 1e-9)) bad(s.f + ': maxM ' + s.maxM + ' is over half its solubility, ' + SOL[s.f] + ' mol/L');
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
  ['g|SBr2', 'part|Br', 9.340, 4, 3, '5.860 \u00D7 10\u00B2\u00B2']
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

/* ------------------------------------------------------------ tolerance */

/* Answers and molar masses within Chem.TOL (1.5%) count; significant figures
   still have to be right; slips are still named; and every periodic table in
   tools/tables.js gets every problem through the real judges. */
if (Chem.TOL !== 0.015) bad('the tolerance is ' + Chem.TOL + ', the teacher chose 0.015 (1.5%)');
/* (a rounded answer stands for its whole rounding interval: 102 is 101.5 to 102.5, which touches 1.5%) */
[['101', 100, 3, true], ['98.6', 100, 3, true], ['102', 100, 3, true], ['103', 100, 3, false], ['97.9', 100, 3, false],
 ['101.0', 100, 3, false], ['1.1', 1.049, 2, true], ['1.0', 1.049, 2, true], ['5.94e22', 5.86e22, 3, true], ['5.96e22', 5.86e22, 3, false],
 ['5.9e22', 5.86e22, 2, true], ['6.0e22', 5.86e22, 2, false]].forEach(([raw, ex, sig, ok]) => {
  if (Chem.judgeAnswer(raw, ex, sig).ok !== ok) bad('tolerance: ' + raw + ' for ' + ex + ' (' + sig + ' s.f.) should ' + (ok ? '' : 'not ') + 'count');
});
if (Chem.judgeAnswer('101.0', 100, 3).kind !== 'sigfigs') bad('tolerance: a near answer with the wrong significant figures is not told so');
if (Chem.judgeAnswer('103', 100, 3).kind !== 'close') bad('tolerance: an answer 3% off is not called close');
if (!Chem.judgeAnswer('103', 100, 3, { also: 101.6 }).ok) bad('tolerance: an answer near the class value is refused');
[['NaCl', '57.7', true], ['NaCl', '59.3', true], ['NaCl', '57.5', false], ['NaCl', '57.70', false], ['MgCl2', '94.0', true]].forEach(([k, raw, ok]) => {
  if (Chem.judgeMM(k, raw).ok !== ok) bad('tolerance: molar mass ' + raw + ' for ' + k + ' should ' + (ok ? '' : 'not ') + 'count');
});
if (Chem.judgeMM('C6H12O6', '181.0').kind !== 'count') bad('tolerance: a miscounted H in glucose is accepted instead of named');
if (Chem.judgeMM('SBr2', '112.0').kind !== 'subscripts') bad('tolerance: SBr2 112.0 is not named a subscript slip');
require('./tables.js')(ctx).run(150).forEach((r) => {
  if (r.blanks || r.own || r.cls) {
    bad('periodic table "' + r.name + '": ' + r.blanks + ' molar masses and ' + (r.own + r.cls) + ' answers refused, e.g. ' + r.examples.join('; '));
  }
});

/* ------------------------------------------------------------ the problems */

const plan = CONFIG.molarity ? { 1: 4, 2: 5, 3: 4, 4: 1 } : { 1: 3, 2: 5, 3: 4 };
function direct(p) {
  /* moles of the start substance, across the ratio if needed, then the target unit */
  const f = Chem.untok(p.fromTok), t = Chem.untok(p.toTok);
  const M = (k) => Object.entries(countIndependent(k)).reduce((s, [x, n]) => s + n * TENTHS[x], 0);
  const molar = p.M ? parseFloat(p.M.str) : NaN;
  let n = f.node === 'g' ? p.given.v / M(f.key) : f.node === 'part' ? p.given.v / AVO : f.node === 'L' ? p.given.v / 22.4
    : f.node === 'Lsol' ? p.given.v * molar : f.node === 'mLsol' ? p.given.v / 1000 * molar : p.given.v;
  if (f.key !== t.key) {
    if (f.key === p.A) n = n * countIndependent(p.A)[t.key];
    else n = n / countIndependent(p.A)[f.key];
  }
  return t.node === 'g' ? n * M(t.key) : t.node === 'part' ? n * AVO : t.node === 'L' ? n * 22.4
    : t.node === 'Lsol' ? n / molar : t.node === 'mLsol' ? n / molar * 1000 : n;
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
    if (e.type === 'sol' && (!p.M || e.M !== p.M.str || e.s !== p.A)) bad(where + ': a molarity equality that is not the prompt\u2019s');
    if (e.type === 'av' && e.L.v !== AVO) bad(where + ': Avogadro\u2019s number is not 6.02 x 10^23');
  });
  const nodes = [Chem.untok(p.fromTok).node, Chem.untok(p.toTok).node];
  const sol = nodes.some((x) => x === 'Lsol' || x === 'mLsol'), ml = nodes.includes('mLsol');
  if (sol !== !!p.M) bad(where + ': a molarity without a solution, or the other way round');
  if (sol !== p.pool.some((id) => /^sol:/.test(id))) bad(where + ': the molarity equality is missing or not needed');
  if (ml !== p.pool.some((id) => /^ml:/.test(id))) bad(where + ': the 1000 mL = 1 L equality is missing or not needed');
  if (sol && !CONFIG.molarity) bad(where + ': a solution problem in the basic version');
  if (p.M) {
    if (!Chem.sp(p.A).aq) bad(where + ': ' + p.A + ' is not offered as a solution');
    if (Chem.sigFigsIn(p.M.str) !== p.given.sig) bad(where + ': the molarity ' + p.M.str + ' does not have ' + p.given.sig + ' significant figures');
    if (!(p.M.v <= Chem.sp(p.A).maxM && p.M.v >= 0.01)) bad(where + ': molarity ' + p.M.str + ' out of range for ' + p.A);
    if (p.promptText.indexOf(p.M.str + ' mol/L') < 0) bad(where + ': the prompt does not give the molarity');
  }
  if (!/^Convert /.test(p.promptText) || p.promptText.indexOf(Chem.sp(p.A).name) < 0) bad(where + ': the prompt does not name ' + p.A + ': ' + p.promptText);
  /* the worked solution typesets */
  try {
    const tex = Chem.texChain(p.given.str, p.fromTok, p.path, {}, { answer: p.ansStr, toTok: p.toTok });
    const mml = Tex.toMathML(tex, true);
    const stack = [];
    for (const m of mml.matchAll(/<(\/?)([a-z]+)[^>]*>/g)) {
      if (!m[1]) stack.push(m[2]);
      else if (stack.pop() !== m[2]) { bad(where + ': unbalanced MathML'); break; }
    }
    if (stack.length) bad(where + ': unclosed MathML');
    if ((tex.match(/\\cancel/g) || []).length !== 2 * p.steps) bad(where + ': ' + (tex.match(/\\cancel/g) || []).length + ' cancelled units for ' + p.steps + ' steps');
    p.path.forEach((t) => { if (Chem.edge(t.e).type === 'mm') Tex.toMathML(Chem.texMM(Chem.edge(t.e).s)); });
  } catch (e) { bad(where + ': ' + e.message); }
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
  if (/\u2014/.test(p.promptText)) bad(where + ': em dash in a prompt');
  if (nodes.includes('L') !== /at STP/.test(p.promptText)) bad(where + ': "at STP" missing or misplaced in ' + p.promptText);
}

const SEEDS = 400;
for (let seed = 1; seed <= SEEDS; seed++) {
  const set = Gen.set(seed);
  if (JSON.stringify(set) !== JSON.stringify(Gen.set(seed))) bad('seed ' + seed + ': the set is not the same twice');
  if (set.length !== App.GRADED) bad('seed ' + seed + ': ' + set.length + ' problems');
  const by = { 1: 0, 2: 0, 3: 0, 4: 0 };
  set.forEach((p) => { by[p.steps]++; });
  [1, 2, 3, 4].forEach((n) => { if (by[n] !== (plan[n] || 0)) bad('seed ' + seed + ': ' + by[n] + ' problems of ' + n + ' steps'); });
  const withM = set.filter((p) => p.M).length, withML = set.filter((p) => p.pool.some((id) => /^ml:/.test(id))).length;
  if (withM !== (CONFIG.molarity ? 4 : 0) || withML !== (CONFIG.molarity ? 2 : 0)) bad('seed ' + seed + ': ' + withM + ' molarity problems, ' + withML + ' in mL');
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
    const road = { 'w-mass': 'mm', 'w-part': 'av', 'w-stp': 'stp', 'w-ratio': 'ratio', 'w-sol': 'sol' }[w];
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
    } else if ((f === 'scorm.js' || f === 'config.js') && !p.startsWith(src)) {
      if (fs.readFileSync(p, 'utf8').includes("'" + CONFIG.store + "'")) bad('storage key ' + CONFIG.store + ' also used in ' + p);
    }
  });
})(repo);
if (!/STORE = CONFIG\.store/.test(fs.readFileSync(path.join(src, 'js', 'scorm.js'), 'utf8'))) bad('scorm.js does not take its storage key from config.js');

/* The two mole conversion packages share every file but config.js, the
   page, the manifest and the docs: a fix in one belongs in the other. */
const SIBLINGS = ['mole-conversions-scorm', 'mole-conversions-molarity-scorm'];
const me = path.basename(path.resolve(root));
const sib = SIBLINGS.filter((x) => x !== me)[0];
const sibRoot = path.join(root, '..', sib);
if (SIBLINGS.includes(me) && fs.existsSync(sibRoot)) {
  const shared = [];
  fs.readdirSync(path.join(src, 'js')).forEach((f) => { if (f !== 'config.js') shared.push('src/js/' + f); });
  fs.readdirSync(path.join(root, 'tools')).forEach((f) => shared.push('tools/' + f));
  shared.push('src/css/styles.css');
  shared.forEach((rel) => {
    const other = path.join(sibRoot, rel);
    if (!fs.existsSync(other)) bad(rel + ' is missing from ' + sib);
    else if (fs.readFileSync(other, 'utf8') !== fs.readFileSync(path.join(root, rel), 'utf8')) bad(rel + ' differs from ' + sib + '/' + rel);
  });
}

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
  if (/Mole Town|L at STP|6\.022/.test(t) && rel.startsWith('src')) bad(rel + ' says ' + /Mole Town|L at STP|6\.022/.exec(t)[0]);
  if (rel.startsWith('src') && /(src|href)="\//.test(t)) bad(rel + ' has an absolute path');
  if (rel.startsWith('src') && /(src|href)="https?:|url\(["']?https?:|@import/.test(t)) bad(rel + ' loads something from the network');
});

if (problems.length) {
  console.error('validate: ' + problems.length + ' problem(s)\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('validate: ok (' + SUBSTANCES.length + ' substances, ' + used.size + ' elements, ' + SEEDS + ' seeds of ' +
  App.GRADED + ' problems and ' + Gen.WARM.length + ' warm-ups, the teacher’s quiz anchors, judges and packaging)');

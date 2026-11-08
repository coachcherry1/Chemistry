/* tools/validate.js: checks the chemistry, the problems and the judging.
 *
 *   node tools/validate.js
 *
 * Fails when:
 * - an atomic mass on screen is not the standard atomic weight rounded to the
 *   tenths place, or a two-decimal table's alternative is not Fe 55.9 or Cu 63.6;
 * - a formula is read differently from the independent count below, an
 *   empirical formula or multiplier differs from one worked here by hand, a
 *   compound would need a fraction other than halves, thirds, fourths or
 *   fifths, or a name differs from the one built again here from its ions
 *   or prefixes (hydrates: the salt's name and the Greek prefix);
 * - over 400 seeds, a set does not follow the plan (kinds, molar masses,
 *   no compound twice, none from a warm-up, every multiplier x 1 to x 5
 *   used, molecular formulas with n above 1, opening with a problem from
 *   percents with x 1 or x 2), a warm-up does not fit its step, or a
 *   problem's numbers differ from the ones computed here from the formula
 *   (percents, grams, crucible readings, grams of CO2 and H2O, molar mass);
 * - a student working from any of six periodic tables (tools/tables.js) has
 *   any box refused, or a quotient that reads as another fraction;
 * - a judge refuses a right box or accepts a known slip (percent as a
 *   decimal, the water's percent as the salt, O2's mass for O, multiplying
 *   by the molar mass, a reciprocal quotient, rounding 1.5 to 2, multiplying
 *   one row only, forgetting the 2 H in H2O, adding n);
 * - a worked solution's LaTeX does not typeset (Tex.toMathML);
 * - a drill card is not what its fraction says, or the drills miss a fraction;
 * - the largest save (every warm-up and one graded problem half done) does
 *   not fit SCORM 1.2's suspend_data;
 * - the manifest, the storage key or the SCORM identifiers clash, a path is
 *   absolute, something loads from the network, any file contains an em
 *   dash, the step names are not the teacher's four, or a file the three
 *   formula packages share differs between them (everything in src/js and
 *   tools except config.js, and the stylesheet).
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
const { ELEMENTS, FORMULAS, HYDRATES, HYDROCARBONS, PREFIXES, Chem, Gen, App, Tex, Work, CONFIG } = ctx;
const tables = require('./tables.js')(ctx);
const MODE = CONFIG.mode;

/* ------------------------------------------------------------- elements */

const TENTHS = {
  H: 1.0, Li: 6.9, Be: 9.0, B: 10.8, C: 12.0, N: 14.0, O: 16.0, Na: 23.0, Mg: 24.3, Al: 27.0, P: 31.0, S: 32.1, Cl: 35.5,
  K: 39.1, Ca: 40.1, V: 50.9, Cr: 52.0, Mn: 54.9, Fe: 55.8, Co: 58.9, Ni: 58.7, Cu: 63.5, Zn: 65.4, Sr: 87.6, Sn: 118.7,
  Ba: 137.3, Pb: 207.2
};
const ALT = { Fe: 55.9, Cu: 63.6 };
const allFormulas = FORMULAS.map((c) => c.f).concat(HYDRATES.map((c) => c.salt), HYDROCARBONS.map((c) => c.f), ['H2O', 'CO2']);
const used = new Set();
allFormulas.forEach((f) => Object.keys(Chem.info(f).counts).forEach((x) => used.add(x)));
used.forEach((x) => {
  if (!(x in TENTHS)) bad('element ' + x + ' is used but has no textbook tenths value here');
  else if (Chem.t10(x) !== Math.round(TENTHS[x] * 10)) bad(x + ' shows ' + Chem.tableMass(x) + ', expected ' + TENTHS[x].toFixed(1));
  const alt = Chem.alt10(x);
  if ((alt == null) !== !(x in ALT)) bad(x + ': alternative tenths value ' + alt + ' where expected ' + ALT[x]);
  else if (alt != null && alt !== Math.round(ALT[x] * 10)) bad(x + ' alternative ' + alt / 10 + ', expected ' + ALT[x]);
});

/* ------------------------------------------------------------- formulas */

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
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
/* by hand: the empirical counts, and the smallest k (1 to 5) that makes every ratio to the smallest whole */
function byHand(f) {
  const c = countIndependent(f);
  const g = Object.values(c).reduce((a, b) => gcd(a, b));
  const ef = {};
  Object.keys(c).forEach((x) => { ef[x] = c[x] / g; });
  const min = Math.min(...Object.values(ef));
  let k = 0;
  for (let t = 1; t <= 12; t++) if (Object.values(ef).every((v) => Math.abs(v * t / min - Math.round(v * t / min)) < 1e-9)) { k = t; break; }
  return { counts: c, ef, n: g, k };
}
allFormulas.forEach((f) => {
  if (!same(Chem.info(f).counts, countIndependent(f))) bad(f + ' read as ' + JSON.stringify(Chem.info(f).counts));
});
FORMULAS.concat(HYDROCARBONS).forEach((c) => {
  const hnd = byHand(c.f), ef = Chem.empirical(c.f);
  if (!same(ef.counts, hnd.ef) || ef.n !== hnd.n) bad(c.f + ': empirical formula ' + ef.f + ' x ' + ef.n);
  if (!(hnd.k >= 1 && hnd.k <= 5)) bad(c.f + ' needs x ' + hnd.k + ': only halves, thirds, fourths and fifths are used');
  if (Gen.multOf(c.f) !== hnd.k) bad(c.f + ': multiplier ' + Gen.multOf(c.f) + ', by hand ' + hnd.k);
});
['FORMULAS', 'HYDROCARBONS'].forEach((name) => {
  const list = ctx[name].map((c) => c.f);
  if (new Set(list).size !== list.length) bad(name + ' lists a formula twice');
});
if (new Set(HYDRATES.map((c) => c.salt)).size !== HYDRATES.length) bad('HYDRATES lists a salt twice');
HYDROCARBONS.forEach((c) => { if (Object.keys(countIndependent(c.f)).sort().join() !== 'C,H') bad(c.f + ' is not a hydrocarbon'); });

/* ---------------------------------------------------------------- names */

const CATIONS = { Na: 'sodium', K: 'potassium', Li: 'lithium', Mg: 'magnesium', Ca: 'calcium', Ba: 'barium', Sr: 'strontium',
  Be: 'beryllium', Al: 'aluminum', Zn: 'zinc' };
const VARIABLE = { Cu: 'copper', Co: 'cobalt', Fe: 'iron', Ni: 'nickel', Mn: 'manganese', Cr: 'chromium', Sn: 'tin', Pb: 'lead', V: 'vanadium' };
const ANIONS = { SO4: ['sulfate', 2], NO3: ['nitrate', 1], OH: ['hydroxide', 1], CO3: ['carbonate', 2], S2O3: ['thiosulfate', 2],
  C2H3O2: ['acetate', 1], Cl: ['chloride', 1], O: ['oxide', 2], N: ['nitride', 3], C: ['carbide', 4], PO4: ['phosphate', 3],
  Cr2O7: ['dichromate', 2], MnO4: ['permanganate', 1] };
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
function ionicName(f) {
  const m = /^([A-Z][a-z]?)(\d*)(.*)$/.exec(f);
  const cat = m[1], nc = +(m[2] || 1);
  let rest = m[3], an, na = 1;
  const br = /^\((.+)\)(\d*)$/.exec(rest);
  if (br) { an = br[1]; na = +(br[2] || 1); }
  else if (ANIONS[rest]) an = rest;
  else { const e = /^([A-Z][a-z]?)(\d*)$/.exec(rest); if (!e) return null; an = e[1]; na = +(e[2] || 1); }
  if (!ANIONS[an]) return null;
  const charge = ANIONS[an][1] * na / nc;
  if (VARIABLE[cat]) return Number.isInteger(charge) ? VARIABLE[cat] + '(' + ROMAN[charge] + ') ' + ANIONS[an][0] : null;
  return CATIONS[cat] ? CATIONS[cat] + ' ' + ANIONS[an][0] : null;
}
const NUM = ['', 'mono', 'di', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa', 'nona', 'deca'];
const ROOT = { O: 'oxide', S: 'sulfide', Cl: 'chloride', N: 'nitride' };
const FIRST = { N: 'nitrogen', P: 'phosphorus', S: 'sulfur', C: 'carbon' };
function prefixName(f) {
  const m = /^([A-Z][a-z]?)(\d*)([A-Z][a-z]?)(\d*)$/.exec(f);
  const a = (+(m[2] || 1) > 1 ? NUM[+m[2]] : '') + FIRST[m[1]];
  let b = NUM[+(m[4] || 1)] + ROOT[m[3]];
  b = b.replace(/aoxide$/, 'oxide').replace(/ooxide$/, 'oxide');
  return a + ' ' + b;
}
if (JSON.stringify(PREFIXES) !== JSON.stringify(NUM.slice(1))) bad('the hydrate prefixes are not mono to deca');
HYDRATES.forEach((c) => {
  const want = ionicName(c.salt);
  if (want !== c.name) bad(c.salt + ' is named "' + c.name + '", from its ions "' + want + '"');
  if (!(c.n >= 1 && c.n <= 10)) bad(c.salt + ': n = ' + c.n);
});
const MIXED = { Fe3O4: 'iron(II,III) oxide', Pb3O4: 'lead(II,IV) oxide' };
const BINARY = ['N2O5', 'N2O3', 'SO3', 'P4S3', 'N2O4', 'P4O10', 'P4O6', 'S2Cl2'];
FORMULAS.forEach((c) => {
  let want = null;
  if (MIXED[c.f]) want = MIXED[c.f];
  else if (BINARY.includes(c.f)) want = prefixName(c.f);
  else if (!/^C/.test(c.f) || /^(CaCO3|CuCl2|Cu2O|Cr2O3)$/.test(c.f)) want = ionicName(c.f);
  if (want == null) return;    /* organic and common names (glucose, hydrazine) are not built here */
  if (want !== c.name) bad(c.f + ' is named "' + c.name + '", built here as "' + want + '"');
});

/* ------------------------------------------------------------- problems */

const std = (x) => parseFloat(ELEMENTS[x].std);
const Mstd = (f) => { const c = countIndependent(f); return Object.keys(c).reduce((s, x) => s + c[x] * std(x), 0); };
const r3 = (v) => Math.round(v * 1000) / 1000;
const near = (a, b, t) => Math.abs(a - b) <= t;

function checkTex(p, where) {
  Gen.solution(p).forEach((st) => st.lines.forEach((l) => {
    let mm;
    try { mm = Tex.toMathML(l, true); } catch (e) { bad(where + ': solution does not typeset: ' + e.message); return; }
    const open = (mm.match(/<m[a-z]+[ >]/g) || []).length, close = (mm.match(/<\/m[a-z]+>/g) || []).length;
    if (open !== close) bad(where + ': unbalanced MathML');
  }));
}

function checkData(p, where) {
  const hnd = p.mode === 'hydrate' ? null : byHand(p.f);
  if (p.mode === 'hydrate') {
    if (p.rows.length !== 2 || p.rows[0].sub !== 1 || p.rows[1].sub !== p.n || p.mult !== 1) bad(where + ': hydrate rows');
    if (p.prefix !== NUM[p.n]) bad(where + ': prefix ' + p.prefix);
    const Ms = Mstd(p.salt), Mw = Mstd('H2O');
    const pw = 100 * p.n * Mw / (Ms + p.n * Mw);
    if (p.kind === 'pct') {
      if (p.rows[1].pct !== pw.toPrecision(3)) bad(where + ': % water ' + p.rows[1].pct + ', computed ' + pw.toPrecision(3));
      if (!near(p.rows[0].g + p.rows[1].g, 100, 1e-6)) bad(where + ': the salt and the water are not 100 g');
    } else {
      const lost = p.H - p.R;
      if (!near(p.rows[1].g, r3(lost), 1e-9)) bad(where + ': water lost ' + p.rows[1].g);
      const ratio = (lost / Mw) / (p.R / Ms);
      if (Math.abs(ratio - p.n) > 0.07) bad(where + ': the lab data give ' + ratio.toFixed(3) + ' waters, not ' + p.n);
      if (p.kind === 'lab' && !(p.C >= 20 && p.C <= 30)) bad(where + ': crucible ' + p.C);
    }
  } else {
    p.order.forEach((x, i) => {
      if (p.rows[i].sub !== hnd.ef[x]) bad(where + ': ' + x + ' whole number ' + p.rows[i].sub + ', empirical ' + hnd.ef[x]);
    });
    if (p.mult !== hnd.k) bad(where + ': multiplier ' + p.mult + ', by hand ' + hnd.k);
    const M = Mstd(p.f);
    if (p.mode === 'empirical' && p.kind === 'pct') {
      let sum = 0;
      p.rows.forEach((r) => {
        const want = (100 * hnd.counts[r.atom] * std(r.atom) / M).toPrecision(3);
        if (r.pct !== want) bad(where + ': ' + r.atom + ' ' + r.pct + '%, computed ' + want + '%');
        sum += r.g;
      });
      if (!(sum > 99.7 && sum < 100.3)) bad(where + ': percents add up to ' + sum);
    }
    if (p.mode === 'empirical' && p.kind === 'g') {
      const tot = p.rows.reduce((s, r) => s + r.g, 0);
      p.rows.forEach((r) => {
        if (r.g < 0.1) bad(where + ': ' + r.gStr + ' g has fewer than 3 significant figures');
        const frac = hnd.counts[r.atom] * std(r.atom) / M;
        if (!near(r.g / tot, frac, 0.0015 / tot + 1e-4)) bad(where + ': ' + r.atom + ' grams are not its share of the compound');
      });
    }
    if (p.mode === 'combustion') {
      const co2 = r3(p.S * hnd.counts.C * Mstd('CO2') / M), h2o = r3(p.S * (hnd.counts.H / 2) * Mstd('H2O') / M);
      if (p.rows[0].g !== co2 || p.rows[1].g !== h2o) bad(where + ': CO2 ' + p.rows[0].g + ' and H2O ' + p.rows[1].g + ', computed ' + co2 + ' and ' + h2o);
      const gC = p.rows[0].g / Mstd('CO2') * std('C'), gH = p.rows[1].g / Mstd('H2O') * 2 * std('H');
      if (Math.abs(gC + gH - p.S) / p.S > 0.005) bad(where + ': C + H do not add up to the sample');
      if (p.rows.some((r) => r.g < 0.1)) bad(where + ': a mass under 0.100 g');
    }
    if (p.mol) {
      if (p.mol.Mstr !== M.toFixed(1)) bad(where + ': molar mass ' + p.mol.Mstr + ', computed ' + M.toFixed(1));
      if (p.mol.n !== hnd.n) bad(where + ': n = ' + p.mol.n);
    }
  }
  const steps = ['grams', 'moles', 'divide', 'multiply'].concat(p.mol ? ['molecular'] : []).concat(p.mode === 'hydrate' ? ['name'] : []);
  if (JSON.stringify(p.steps) !== JSON.stringify(steps)) bad(where + ': steps ' + p.steps.join());
  if (p.choice !== (p.kind === 'pct' ? 'pct' : 'g')) bad(where + ': step 1 choice');
  if (/\u2014/.test(p.promptText)) bad(where + ': em dash in a prompt');
}

/* the judges on this problem: right boxes in, known slips out */
function checkJudges(p, where) {
  const m = Gen.model(p);
  const expect = (j, ok, what) => { if (!!j.ok !== ok) bad(where + ': ' + what + (ok ? ' refused: ' + (j.msg || '') : ' accepted')); };
  p.rows.forEach((r, i) => {
    if (r.how === 'pct') {
      expect(Chem.judgeGrams(r.gStr, r.g, 'pct', { pct: r.pct, dp: r.dp }), true, 'grams ' + r.gStr);
      expect(Chem.judgeGrams(String(r.g / 100), r.g, 'pct', { pct: r.pct, dp: r.dp }), false, 'percent as a decimal');
    }
    if (r.how === 'rest') expect(Chem.judgeGrams(p.rows[1].gStr, r.g, 'rest', { pct: r.pct, dp: r.dp }), false, 'the water’s percent as the salt');
    if (r.how === 'sub') {
      expect(Chem.judgeGrams(r.gStr, r.g, 'sub', r.ctx), true, 'grams by subtraction');
      expect(Chem.judgeGrams(String(r3(r.ctx.a + r.ctx.b)), r.g, 'sub', r.ctx), false, 'added instead of subtracted');
    }
    const mm = Chem.mmValue(r.mmF);
    expect(Chem.judgeMM(r.mmF, Chem.mmText(r.mmF)), true, 'molar mass ' + r.mmF);
    if (r.atom && !r.per && Chem.DIATOMIC[r.atom]) expect(Chem.judgeMM(r.mmF, (2 * mm).toFixed(1)), false, r.atom + '2 for ' + r.atom);
    const molM = r.g / mm;
    expect(Chem.judgeMoles(Chem.fmtMol(molM), r.g, mm, mm, r.atom), true, 'moles ' + r.key);
    if (mm > 1.5) expect(Chem.judgeMoles(Chem.fmtSig(r.g * mm, 3), r.g, mm, mm, r.atom), false, 'grams times molar mass');
    const two = Chem.judgeMoles(Chem.fmtSig(molM, 2), r.g, mm, mm, r.atom);
    if (Chem.fmtSig(molM, 2) !== Chem.fmtSig(molM, 3) && !two.fmt) bad(where + ': moles to 2 significant figures not sent back to round');
    if (r.per) {
      expect(Chem.judgePer(String(r.per), r.atom, r.molecule), true, 'atoms per molecule');
      if (r.atom === 'H') {
        expect(Chem.judgePer('1', 'H', 'H2O'), false, '1 H per H2O');
        expect(Chem.judgeAtomMoles(Chem.fmtMol(molM), Chem.roundSig(molM, 3), 2, 'H', 'H2O'), false, 'mol H2O as mol H');
      }
    }
    const q = m.rows[i].q;
    expect(Chem.judgeQuotient(Chem.fmtQ(q), q, q, {}), true, 'quotient ' + Chem.fmtQ(q));
    if (q > 1.2) expect(Chem.judgeQuotient(Chem.fmtQ(1 / q), q, q, {}), false, 'an upside-down quotient');
    const one = Chem.fmtDec(q, 1);
    if (Math.abs(parseFloat(one) - Chem.roundTo(q, 2)) > 0.004 && Math.abs(parseFloat(one) - q) <= Chem.QTOL && !Chem.judgeQuotient(one, q, q, {}).fmt) {
      bad(where + ': a quotient to one decimal place is not sent back');
    }
  });
  const qs = m.rows.map((x) => Chem.roundTo(x.q, 2));
  expect(Chem.judgeMultiplier(String(p.mult), qs, p.mult), true, 'multiplier');
  if (p.mult > 1) {
    expect(Chem.judgeMultiplier('1', qs, p.mult), false, 'x 1 when not whole');
    expect(Chem.judgeMultiplier(String(2 * p.mult), qs, p.mult), false, 'a multiplier twice too big');
    p.rows.forEach((r, i) => {
      if (!Chem.fracOf(qs[i]).whole) expect(Chem.judgeWhole(String(Math.round(qs[i])), qs[i], p.mult, r.sub), false, 'rounding ' + qs[i] + ' instead of multiplying');
    });
  }
  p.rows.forEach((r, i) => expect(Chem.judgeWhole(String(r.sub), qs[i], p.mult, r.sub), true, 'whole number ' + r.sub));
  if (p.mol) {
    expect(Chem.judgeMM(p.ef, Chem.mmText(p.ef)), true, 'empirical formula mass');
    expect(Chem.judgeN(String(p.mol.n), p.mol.M, Chem.mmValue(p.ef), p.mol.n), true, 'n');
    if (p.mol.n > 1) {
      p.order.forEach((x) => {
        const ef = p.efCounts[x];
        if (ef + p.mol.n !== ef * p.mol.n) expect(Chem.judgeSub(String(ef + p.mol.n), ef * p.mol.n, ef, p.mol.n, x), false, 'adding n');
      });
    }
  }
}

const SEEDS = 400;
const counts = { mult: {}, n: {} };
for (let seed = 1; seed <= SEEDS; seed++) {
  let set;
  try { set = Gen.set(seed); } catch (e) { bad('seed ' + seed + ': ' + e.message); continue; }
  if (set.length !== Gen.PLAN.length || set.length !== App.GRADED) bad('seed ' + seed + ': ' + set.length + ' problems');
  const kinds = (l) => l.map((x) => x.kind + (x.mol ? '+mol' : '')).sort().join();
  if (kinds(set) !== kinds(Gen.PLAN)) bad('seed ' + seed + ': kinds ' + kinds(set));
  const keys = set.map((p) => Gen.keyOf(p.c));
  if (new Set(keys).size !== keys.length) bad('seed ' + seed + ': a compound repeats');
  const warmKeys = Gen.WARM.map((w) => Gen.keyOf(Gen.warm(seed, w).c));
  if (new Set(warmKeys).size !== warmKeys.length) bad('seed ' + seed + ': a warm-up compound repeats');
  if (keys.some((k) => warmKeys.includes(k))) bad('seed ' + seed + ': a graded problem uses a warm-up compound');
  const first = set[0];
  if (first.mol || first.mult > 2 || (MODE !== 'combustion' && first.kind !== 'pct')) bad('seed ' + seed + ': opens with ' + first.id + ' ' + first.kind);
  if (MODE === 'hydrate') {
    const ns = set.map((p) => p.n);
    if (new Set(ns).size < 4) bad('seed ' + seed + ': only ' + new Set(ns).size + ' different numbers of waters');
  } else {
    const ms = set.map((p) => p.mult);
    [1, 2, 3].forEach((k) => { if (!ms.includes(k)) bad('seed ' + seed + ': no problem needs x ' + k); });
    if (!ms.includes(4) && !ms.includes(5)) bad('seed ' + seed + ': no problem needs x 4 or x 5');
    if (set.filter((p) => p.mol && p.mol.n >= 2).length < 2) bad('seed ' + seed + ': fewer than 2 molecular formulas with n above 1');
  }
  const ids = set.map((p) => p.id);
  if (new Set(ids).size !== ids.length) bad('seed ' + seed + ': repeated interaction ids');
  ids.forEach((id) => { if (!/^[A-Za-z0-9_]{1,200}$/.test(id)) bad('seed ' + seed + ': bad interaction id ' + id); });
  set.concat(Gen.WARM.map((w) => Gen.warm(seed, w))).forEach((p) => {
    const where = 'seed ' + seed + ' ' + p.id;
    counts.mult[p.mult] = (counts.mult[p.mult] || 0) + 1;
    if (p.mol) counts.n[p.mol.n] = (counts.n[p.mol.n] || 0) + 1;
    checkData(p, where);
    checkJudges(p, where);
    checkTex(p, where);
    if (!Gen.clean(p)) bad(where + ': quotients not clean');
  });
  Gen.WARMS[MODE].forEach((slot) => {
    const p = Gen.warm(seed, slot.id);
    if (p.kind !== slot.kind || !!p.mol !== !!slot.mol) bad('seed ' + seed + ' ' + slot.id + ': kind ' + p.kind);
    if (slot.mult && !slot.mult.includes(p.mult)) bad('seed ' + seed + ' ' + slot.id + ': needs x ' + p.mult);
    if (slot.minN && !(p.mol.n >= slot.minN)) bad('seed ' + seed + ' ' + slot.id + ': n = ' + p.mol.n);
  });
  /* the drills */
  const fc = Gen.fracCards(seed);
  if (fc.length !== 10) bad('seed ' + seed + ': ' + fc.length + ' fraction cards');
  const seenFr = new Set();
  fc.forEach((c) => {
    const f = Chem.fracOf(c.q);
    if (f.whole || f.num !== c.num || f.den !== c.den || c.whole !== Math.round(c.q * c.den) || c.str !== c.q.toFixed(2)) bad('seed ' + seed + ': fraction card ' + c.str);
    seenFr.add(c.num + '/' + c.den);
  });
  if (seenFr.size !== Chem.FRACS.length) bad('seed ' + seed + ': the fraction cards miss a fraction');
  const wc = Gen.wholeCards(seed);
  if (wc.filter((c) => c.round).length !== 4 || wc.length !== 8) bad('seed ' + seed + ': whole-or-not cards');
  wc.forEach((c) => {
    const f = Chem.fracOf(c.q);
    if (c.round !== f.whole || (c.round && (Math.abs(c.q - c.n) > 0.06 || c.n !== f.n)) || c.q < 1) bad('seed ' + seed + ': whole-or-not card ' + c.str);
  });
  const ar = Gen.allRatios(seed);
  if (ar.map((r) => r.mult).sort().join() !== '2,3,4,5') bad('seed ' + seed + ': the multiply-them-all ratios do not use x 2 to x 5');
  ar.forEach((r) => {
    const hnd = byHand(r.f);
    r.rows.forEach((row) => { if (row.sub !== hnd.ef[row.sym]) bad('seed ' + seed + ': ratio ' + r.f + ' ' + row.sym); });
  });
}
['example'].forEach(() => {
  const ex = Gen.example();
  checkData(ex, 'example'); checkJudges(ex, 'example'); checkTex(ex, 'example');
  const want = { empirical: 'Fe2O3', hydrate: 'CuSO4·5H2O', combustion: 'C3H8' }[MODE];
  if (ex.f !== want) bad('the worked example is ' + ex.f + ', not ' + want);
});

/* six periodic tables, every box */
tables.run(120).forEach((r) => {
  if (r.refused) bad('table "' + r.name + '": ' + r.refused + ' of ' + r.n + ' problems refused, e.g. ' + r.examples.join(' | '));
});

/* ------------------------------------------------------------------ app */

const warmSteps = App.STEPS.filter((s) => s.kind === 'warm').map((s) => s.id);
if (JSON.stringify(warmSteps) !== JSON.stringify(Gen.WARM)) bad('the warm-up steps and Gen.WARM differ');
if (!(App.SCHEMA >= 1)) bad('no SCHEMA in app.js');
if (['Percents to grams', 'Grams to moles', 'Divide by small', 'Multiply if not whole'].join() !==
    ['grams', 'moles', 'divide', 'multiply'].map((s) => Work.STEP_NAMES[s]).join()) bad('the step names are not the teacher’s four');
const kinds = new Set(App.STEPS.map((s) => s.kind));
const appSrc = fs.readFileSync(path.join(src, 'js', 'app.js'), 'utf8');
kinds.forEach((k) => { if (!new RegExp('RENDER\\.' + k + ' = ').test(appSrc)) bad('no renderer for step kind ' + k); });

/* the largest save: two warm-ups half done (one revisited, one not yet
   finished), or one warm-up and one graded problem half done; every drill touched */
(function () {
  const half = (q) => {
    const v = {};
    q.rows.forEach((r, i) => { v['g' + i] = r.gStr; v['mm' + i] = Chem.mmText(r.mmF); v['mM' + i] = '0.0000123'; v['per' + i] = '2';
      v['mol' + i] = '0.0000123'; v['q' + i] = '1.33'; v['w' + i] = '10'; v['ms' + i] = '14'; });
    v.mult = '5'; v.efm = '123.4'; v.n = '2';
    return { s: 3, v, k: { grams: 2, moles: 3, divide: 1 }, g: { grams: 0, moles: 1, divide: 0 },
      n: { g: q.rows.map((r) => r.g), mm: q.rows.map(() => 123.4), mol: q.rows.map(() => 0.0123456), molM: q.rows.map(() => 0.0123456), q: q.rows.map(() => 1.33), sm: 0 },
      c1: 'pct', sm: 0 };
  };
  const make = (warmHalf, graded) => {
    const st = { v: App.SCHEMA, seed: 123456789, step: 14, max: 14, done: {}, w: {}, d: {}, p: [], view: null, fin: 0, best: 87.5, att: 3 };
    App.STEPS.forEach((s) => { st.done[s.id] = 1; });
    Gen.WARM.forEach((w, i) => { st.w[w] = i < warmHalf ? half(Gen.warm(1, w)) : { r: 1 }; });
    Gen.set(1).forEach((q, i) => { st.p[i] = graded && i === App.GRADED - 1 ? half(q) : { r: 1, s: q.steps.length, g: { grams: 1, moles: 0, divide: 1, multiply: 1, molecular: 1, name: 0 } }; });
    st.d = { finder: { seen: {} }, 'd-frac': { i: 9, a: { fr: '2/3', k: 3, w: '8' } }, 'd-whole': { sel: {}, done: 1 }, 'd-all': { i: 3, a: { k: '5', w0: '5', w1: '11', w2: '1' } },
      heat: { pred: 'down', heated: 1, what: 1, again: 1 }, burn: { burned: 1, c: 1, h: 1 }, nmean: { a: { 0: '1', 1: '2', 2: '3', 3: '6' }, done: 1 } };
    for (let i = 0; i < 13; i++) st.d.finder.seen[i] = 1;
    for (let i = 0; i < 8; i++) st.d['d-whole'].sel[i] = 'round';
    return JSON.stringify(st).length;
  };
  const len = Math.max(make(2, false), make(1, true));
  if (len > 4000) bad('the largest save is ' + len + ' characters, over the 4000 suspend_data allows');
  counts.save = len;
})();

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
const FOLDER_MODE = { 'empirical-molecular-formula-scorm': 'empirical', 'hydrate-formula-scorm': 'hydrate', 'combustion-analysis-scorm': 'combustion' };
const me = path.basename(path.resolve(root));
if (FOLDER_MODE[me] && FOLDER_MODE[me] !== MODE) bad('config.js says ' + MODE + ' in ' + me);

/* The three formula packages share every file but config.js, the page, the
   manifest, build.sh and the docs: a fix in one belongs in all three. */
Object.keys(FOLDER_MODE).filter((x) => x !== me).forEach((sib) => {
  const sibRoot = path.join(root, '..', sib);
  if (!fs.existsSync(sibRoot)) { bad(sib + ' is missing'); return; }
  const shared = [];
  fs.readdirSync(path.join(src, 'js')).forEach((f) => { if (f !== 'config.js') shared.push('src/js/' + f); });
  fs.readdirSync(path.join(root, 'tools')).forEach((f) => shared.push('tools/' + f));
  shared.push('src/css/styles.css');
  shared.forEach((rel) => {
    const other = path.join(sibRoot, rel);
    if (!fs.existsSync(other)) bad(rel + ' is missing from ' + sib);
    else if (fs.readFileSync(other, 'utf8') !== fs.readFileSync(path.join(root, rel), 'utf8')) bad(rel + ' differs from ' + sib + '/' + rel);
  });
  const strip = (t) => t.replace(/<title>[^<]*<\/title>/, '').replace(/<h1>[^<]*<\/h1>/, '');
  if (strip(fs.readFileSync(path.join(sibRoot, 'src', 'index.html'), 'utf8')) !== strip(html)) bad('index.html differs from ' + sib + ' beyond its title');
});

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
  if (new RegExp('\\u2014|&' + 'mdash;').test(t)) bad(rel + ' contains an em dash');
  if (rel.startsWith('src') && /(src|href)="\//.test(t)) bad(rel + ' has an absolute path');
  if (rel.startsWith('src') && /(src|href)="https?:|url\(["']?https?:|@import/.test(t)) bad(rel + ' loads something from the network');
});

if (problems.length) {
  console.error('validate: ' + problems.length + ' problem(s)\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('validate: ok (' + MODE + ': ' + Gen.catalogue().length + ' compounds, ' + SEEDS + ' seeds of ' + App.GRADED + ' problems and ' +
  Gen.WARM.length + ' warm-ups, multipliers ' + JSON.stringify(counts.mult) + (Object.keys(counts.n).length ? ', n ' + JSON.stringify(counts.n) : '') +
  ', six periodic tables, judges, drills, largest save ' + counts.save + ' characters, packaging)');

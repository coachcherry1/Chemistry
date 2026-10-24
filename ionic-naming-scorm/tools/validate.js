/* tools/validate.js — content checks. Run after any edit to data.js or cfu.js.
 *
 *   node tools/validate.js
 *
 * Exits non-zero if the content could produce a wrong, ambiguous or
 * out-of-scope question.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = path.join(__dirname, '..', 'src', 'js');
for (const f of ['data.js', 'chem.js', 'cfu.js', 'plan.js', 'ptable.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
}

const problems = [];
const fail = (msg) => problems.push(msg);
const POOL = new Set(DATA.POOL);

/* ------------------------------------------------------------ element pool */

const expectedPool = ['H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P',
  'S', 'Cl', 'Ar', 'K', 'Ca', 'Ti', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Br', 'Kr', 'Rb',
  'Ag', 'Sn', 'I', 'Xe', 'Ba', 'Au', 'Hg', 'Pb'];
if (DATA.POOL.length !== expectedPool.length || !expectedPool.every((s) => POOL.has(s))) {
  fail('POOL is not elements 1-20 plus Element List 2');
}

function symbolsIn(text) {
  const atoms = Chem.atoms(text);
  if (!atoms) { fail('unreadable ion formula ' + text); return []; }
  return Object.keys(atoms);
}

for (const ion of [...DATA.CATIONS, ...DATA.ANIONS]) {
  for (const t of [ion.t, ion.alt].filter(Boolean)) {
    for (const sym of symbolsIn(t)) {
      if (!POOL.has(sym)) fail(ion.name + ' (' + t + ') uses ' + sym + ', which is not on the memorized list');
    }
  }
  for (const n of ion.near || []) {
    if (!Chem.CAT[n] && !Chem.AN[n]) fail(ion.name + ' lists unknown near ion ' + n);
  }
}

/* ------------------------------------------------- the transition-metal rule */

const TM = ['Ti', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Au', 'Hg', 'Sn', 'Pb'];
const tmNow = DATA.CATIONS.filter((c) => c.tm).map((c) => c.t).sort();
if (tmNow.join() !== TM.slice().sort().join()) fail('transition metals are ' + tmNow.join(', ') + '; expected ' + TM.join(', '));
if (Chem.CAT.Ag.tm || Chem.CAT.Ag.charges.join() !== '1') fail('Ag must be a non-transition metal, always 1+');
if (Chem.CAT.Zn.tm || Chem.CAT.Zn.charges.join() !== '2') fail('Zn must be a non-transition metal, always 2+');
if (Chem.CAT.Hg.charges.join() !== '2') fail('Hg must be used only as Hg2+ (mercury(I) is left out)');
for (const c of DATA.CATIONS) {
  if (!c.tm && c.charges.length !== 1) fail(c.name + ' has one charge in class but lists ' + c.charges.join(','));
  if (!c.tm && !c.why) fail(c.name + ' needs a `why` explaining its fixed charge');
  if (c.tm && c.charges.length < 1) fail(c.name + ' has no charges');
}
for (const s of DATA.NO_ION) {
  if (Chem.CAT[s] || Chem.AN[s]) fail(s + ' is listed as never forming an ion but is used as one');
}

/* ---------------------------------------------- the class polyatomic ion list */

const PAI = {
  NH4: 'ammonium', CN: 'cyanide', OH: 'hydroxide', ClO: 'hypochlorite', ClO2: 'chlorite',
  ClO3: 'chlorate', ClO4: 'perchlorate', C2H3O2: 'acetate', MnO4: 'permanganate', NO2: 'nitrite',
  NO3: 'nitrate', BrO3: 'bromate', CO3: 'carbonate', CrO4: 'chromate', Cr2O7: 'dichromate',
  O2: 'peroxide', SO3: 'sulfite', SO4: 'sulfate', PO4: 'phosphate', PO3: 'phosphite'
};
const polysNow = DATA.CATIONS.filter((c) => c.poly).concat(DATA.ANIONS.filter((a) => a.poly));
if (polysNow.length !== Object.keys(PAI).length) fail('polyatomic ions: ' + polysNow.length + ', class list has ' + Object.keys(PAI).length);
for (const ion of polysNow) {
  if (PAI[ion.t] !== ion.name) fail(ion.t + ' "' + ion.name + '" is not on the class polyatomic ion list');
}
const PAI_CHARGE = { CN: 1, OH: 1, ClO: 1, ClO2: 1, ClO3: 1, ClO4: 1, C2H3O2: 1, MnO4: 1, NO2: 1, NO3: 1,
  BrO3: 1, CO3: 2, CrO4: 2, Cr2O7: 2, O2: 2, SO3: 2, SO4: 2, PO4: 3, PO3: 3 };
for (const a of DATA.ANIONS.filter((x) => x.poly)) {
  if (PAI_CHARGE[a.t] !== a.charge) fail(a.name + ' has charge ' + a.charge + '-, list says ' + PAI_CHARGE[a.t] + '-');
}

/* ------------------------------------------------------------- compounds */

const all = Chem.all();
const byFormula = new Map(), byName = new Map();
for (const cpd of all) {
  const f = Chem.formula(cpd), n = Chem.name(cpd);
  if (cpd.m * cpd.q !== cpd.n * cpd.a.charge) fail(f + ' does not balance');
  if (Chem.gcd(cpd.m, cpd.n) !== 1) fail(f + ' is not in lowest terms');
  if (byFormula.has(f)) fail('formula ' + f + ' is both ' + byFormula.get(f) + ' and ' + n);
  if (byName.has(n)) fail('name ' + n + ' is both ' + byName.get(n) + ' and ' + f);
  byFormula.set(f, n);
  byName.set(n, f);
  for (const t of Chem.accepted(cpd)) {
    if (!Chem.checkFormula(cpd, t).ok) fail(f + ': its own formula ' + t + ' is marked wrong');
  }
  if (!Chem.checkName(cpd, n).ok) fail(n + ': its own name is marked wrong');
  if (Chem.fromCode(cpd.code) === null) fail(cpd.code + ' does not round-trip');
  const parens = !!((cpd.c.poly && cpd.m > 1) || (cpd.a.poly && cpd.n > 1));
  if (parens !== f.includes('(')) fail(f + ': parentheses do not follow the rule');
  if (!!cpd.c.tm !== /\([IV]+\)/.test(n)) fail(n + ': Roman numeral does not follow the transition-metal rule');
}

/* Every targeted mistake has to be caught as a mistake, never accepted. */
const traps = [
  ['Fe3.O', 'Fe3O'], ['Fe3.O', 'Fe3O2'], ['Ti4.O', 'Ti2O4'], ['Ca2.NO3', 'CaNO32'],
  ['Ca2.SO4', 'Ca(SO4)'], ['Na1.O2', 'NaO'], ['Co2.Cl', 'COCl2'], ['NH41.SO4', 'NH42SO4']
];
for (const [code, wrong] of traps) {
  if (Chem.checkFormula(Chem.fromCode(code), wrong).ok) fail(code + ': the mistake ' + wrong + ' was accepted');
}
const nameTraps = [
  ['Ag1.Cl', 'silver(I) chloride'], ['Zn2.O', 'zinc(II) oxide'], ['Pb4.O', 'lead(II) oxide'],
  ['Fe3.O', 'iron oxide'], ['Na1.Cl', 'sodium chlorine'], ['Mn4.O', 'magnesium(IV) oxide']
];
for (const [code, wrong] of nameTraps) {
  if (Chem.checkName(Chem.fromCode(code), wrong).ok) fail(code + ': the mistake "' + wrong + '" was accepted');
}

/* ------------------------------------------------------------ check questions */

const TAGS = new Set(['tm', 'fixed', 'ide', 'ionic', 'numeral', 'charge', 'reduce', 'paren', 'poly']);
const ids = new Set();
const formulaLike = /\(?[A-Z][a-z]?[₀-₉]*\)?[₀-₉]*(?:\(?[A-Z][a-z]?[₀-₉]*\)?[₀-₉]*)*[⁰-⁹]*[⁺⁻]?/g;
function checkSymbols(where, text) {
  for (const tok of text.match(formulaLike) || []) {
    /* Roman numerals and capitalised words ("NOT", "ALL") are not formulas */
    if (/^\(?[IVX]+\)?$/.test(tok) || /^[A-Z]{3,}$/.test(tok)) continue;
    const symbols = tok.match(/[A-Z][a-z]?/g) || [];
    const formulaish = symbols.length > 1 || /[₀-₉⁰-⁹⁺⁻]/.test(tok);
    if (!formulaish) continue;
    for (const s of symbols) if (!POOL.has(s)) fail(where + ': "' + tok + '" uses ' + s + ', not on the memorized list');
  }
}
for (const b of CFU.BANK) {
  if (ids.has(b.id)) fail('duplicate question id ' + b.id);
  ids.add(b.id);
  if (!TAGS.has(b.tag)) fail(b.id + ': unknown tag ' + b.tag);
  if (!(b.min >= 1 && b.min <= Plan.LEVELS.length)) fail(b.id + ': min level ' + b.min);
  if (!b.why) fail(b.id + ': no explanation');
  if (b.a.length < 3 || new Set(b.a).size !== b.a.length) fail(b.id + ': needs 3+ distinct options');
  for (const t of [b.q, ...b.a, b.why]) checkSymbols(b.id, t);
  if (b.tag !== 'tm' && b.tag !== 'fixed' && b.tag !== 'ide' && b.tag !== 'ionic' && b.min < 2) fail(b.id + ': naming and formula questions start at Level 2');
  if (b.min > Plan.LEVELS.length) fail(b.id + ': min level ' + b.min + ' is past the last level');
}
let generated = 0;
for (const cpd of all) {
  for (const k of ['c', 'f', 'n']) {
    if (k === 'c' && !cpd.c.tm) continue;
    const q = CFU.build('g:' + k + ':' + cpd.code);
    generated++;
    if (!q) { fail('g:' + k + ':' + cpd.code + ' does not build'); continue; }
    if (q.a.length < 3 || new Set(q.a).size !== q.a.length) fail('g:' + k + ':' + cpd.code + ': options ' + q.a.join(' | '));
  }
}

/* ------------------------------------------------------------ the draw */

const RUNS = 2000;
let maxState = 0;
let blocked = 0;
const counts = {};
for (let r = 0; r < RUNS; r++) {
  const seed = (r * 2654435761) >>> 0;
  const plan = Plan.newPlan(seed);
  const seen = new Set();
  for (const L of Plan.LEVELS) {
    const list = plan[L.n];
    for (const code of list) {
      if (!Plan.valid(code)) fail('run ' + r + ' level ' + L.n + ': invalid code ' + code);
      const q = Plan.strip(code);
      if (q.startsWith('q:') || q.startsWith('g:')) {
        if (seen.has(q)) fail('run ' + r + ': question ' + q + ' asked twice');
        seen.add(q);
      }
    }
    counts[L.n] = counts[L.n] || { min: 1e9, max: 0, checks: 0 };
    counts[L.n].min = Math.min(counts[L.n].min, list.length);
    counts[L.n].max = Math.max(counts[L.n].max, list.length);
    counts[L.n].checks += list.filter((c) => /^!?(q|g):/.test(c)).length / RUNS;
    const cpds = list.map((c) => Plan.compoundOf(c)).filter(Boolean).map(Chem.fromCode);
    const t = cpds.map((c) => ({ c, t: Chem.traits(c) }));
    const has = (f) => t.some((x) => f(x.c, x.t));
    const names = list.filter((c) => c.startsWith('n:')).length;
    const formulas = list.filter((c) => c.startsWith('f:')).length;
    const need = {
      1: () => ['Ag', 'Zn', 'Sn', 'Pb'].every((s) => list.includes('m:' + s)),
      2: () => names === 6 && formulas === 6 && has((c, x) => x.fourOverTwo) &&
               has((c) => c.c.t === 'Ag' || c.c.t === 'Zn') && has((c) => c.c.t === 'Sn' || c.c.t === 'Pb') &&
               has((c, x) => x.ammonium) && has((c, x) => x.parens) && has((c, x) => x.tm && c.q === 1) &&
               has((c, x) => !x.tm) && has((c, x) => x.binary) && has((c, x) => x.poly),
      3: () => names === 6 && formulas === 6 && has((c, x) => x.parens) && has((c, x) => x.ammonium) &&
               has((c) => c.c.t === 'Ag' || c.c.t === 'Zn') && has((c) => c.c.t === 'Sn' || c.c.t === 'Pb')
    };
    /* interleaved: never three names or three formulas in a row */
    if (L.n >= 2) {
      const kinds = list.map((c) => c.charAt(0)).filter((k) => k === 'n' || k === 'f').join('');
      if (/nnn|fff/.test(kinds)) blocked++;
    }
    if (!need[L.n]()) fail('run ' + r + ' level ' + L.n + ' is missing a required case: ' + list.join(' '));
  }
  /* worst case: every level also takes its full quota of follow-up questions */
  const padded = JSON.parse(JSON.stringify(plan));
  for (const k of Object.keys(padded)) for (let i = 0; i < 4; i++) padded[k].push('!+g:f:NH41.Cr2O7');
  const size = JSON.stringify({ v: 1, s: 4294967295, u: 6, l: 6, i: 99, p: padded,
    st: { items: 999, clean: 999, checks: 999, checksRight: 999 } }).length;
  maxState = Math.max(maxState, size);
}
if (blocked) fail(blocked + ' of ' + RUNS + ' runs had three names or three formulas in a row');
if (maxState > 4000) fail('saved state can reach ' + maxState + ' characters; SCORM 1.2 allows 4096');

/* ------------------------------------------------------------- report */

console.log('compounds in pool:     ' + all.length);
console.log('bank questions:        ' + CFU.BANK.length + '  (+ ' + generated + ' generated variants)');
console.log('largest saved state:   ' + maxState + ' / 4000 characters');
for (const L of Plan.LEVELS) {
  const c = counts[L.n];
  console.log('level ' + L.n + ': ' + (c.min === c.max ? c.min : c.min + '-' + c.max) + ' items, ~' +
              c.checks.toFixed(1) + ' check questions  (' + L.name + ')');
}
if (problems.length) {
  console.error('\n' + problems.length + ' problem(s):');
  [...new Set(problems)].slice(0, 60).forEach((p) => console.error('  - ' + p));
  process.exit(1);
}
console.log('\nOK');

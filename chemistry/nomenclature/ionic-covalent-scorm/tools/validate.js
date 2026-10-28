/* tools/validate.js — content checks. Run after any edit to data.js or cfu.js.
 *
 *   node tools/validate.js
 *
 * Exits non-zero if the content could produce a wrong, ambiguous or
 * out-of-scope question, or if a level draw breaks its mixing rules.
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
const ionic = Chem.allIonic(), covalent = Chem.allCovalent();
const byFormula = new Map(), byName = new Map();
for (const cpd of all) {
  const f = Chem.formula(cpd), n = Chem.name(cpd);
  if (byFormula.has(f)) fail('formula ' + f + ' is both ' + byFormula.get(f) + ' and ' + n);
  if (byName.has(n)) fail('name ' + n + ' is both ' + byName.get(n) + ' and ' + f);
  byFormula.set(f, n);
  byName.set(n, f);
  for (const t of Chem.accepted(cpd)) {
    if (!Chem.checkFormula(cpd, t).ok) fail(f + ': its own formula ' + t + ' is marked wrong');
  }
  if (!Chem.checkName(cpd, n).ok) fail(n + ': its own name is marked wrong');
  if (Chem.fromCode(cpd.code) !== cpd && Chem.formula(Chem.fromCode(cpd.code)) !== f) fail(cpd.code + ' does not round-trip');
}
for (const cpd of ionic) {
  const f = Chem.formula(cpd), n = Chem.name(cpd);
  if (cpd.m * cpd.q !== cpd.n * cpd.a.charge) fail(f + ' does not balance');
  if (Chem.gcd(cpd.m, cpd.n) !== 1) fail(f + ' is not in lowest terms');
  const parens = !!((cpd.c.poly && cpd.m > 1) || (cpd.a.poly && cpd.n > 1));
  if (parens !== f.includes('(')) fail(f + ': parentheses do not follow the rule');
  if (!!cpd.c.tm !== /\([IV]+\)/.test(n)) fail(n + ': Roman numeral does not follow the transition-metal rule');
  if (Chem.rule(cpd) === 'cov') fail(f + ' is ionic but ruled covalent');
}

/* Covalent: two different nonmetals from the memorized list, no hydrogen,
   names that follow the prefix rules exactly. */
const NONMETAL_SIDE = new Set(['B', 'C', 'N', 'O', 'F', 'Si', 'P', 'S', 'Cl', 'Br', 'I', 'Kr', 'Xe']);
const P = DATA.PREFIXES;
if (new Set(DATA.COVALENT).size !== DATA.COVALENT.length) fail('a covalent compound is listed twice');
for (const cpd of covalent) {
  const n = Chem.name(cpd);
  for (const e of [cpd.e1, cpd.e2]) {
    if (!POOL.has(e)) fail(cpd.f + ' uses ' + e + ', not on the memorized list');
    if (!NONMETAL_SIDE.has(e)) fail(cpd.f + ': ' + e + ' is not on the nonmetal side of the staircase');
  }
  if (cpd.e1 === cpd.e2) fail(cpd.f + ' is an element, not a compound');
  if (!Chem.AN[cpd.e2] || Chem.AN[cpd.e2].poly) fail(cpd.f + ': ' + cpd.e2 + ' has no -ide name');
  if (Chem.rule(cpd) !== 'cov') fail(cpd.f + ' is covalent but not ruled so');
  const [w1, w2] = n.split(' ');
  if (cpd.x === 1 && /^mono/.test(w1)) fail(n + ': mono- on the first element');
  if (cpd.x > 1 && !w1.startsWith(P[cpd.x])) fail(n + ': first prefix should be ' + P[cpd.x]);
  if (!w2.startsWith(P[cpd.y].replace(/[ao]$/, ''))) fail(n + ': second prefix should be ' + P[cpd.y]);
  if (/(a|o)oxide$/.test(w2)) fail(n + ': the vowel before oxide should be dropped');
  if (/\(/.test(n)) fail(n + ': a covalent name with a Roman numeral');
}

/* Every targeted mistake has to be caught as a mistake, never accepted. */
const traps = [
  ['Fe3.O', 'Fe3O'], ['Fe3.O', 'Fe3O2'], ['Ti4.O', 'Ti2O4'], ['Ca2.NO3', 'CaNO32'],
  ['Ca2.SO4', 'Ca(SO4)'], ['Na1.O2', 'NaO'], ['Co2.Cl', 'COCl2'], ['NH41.SO4', 'NH42SO4'],
  ['Ca2.Cl', 'CaCl'], ['Na1.NO2', 'NO2'], ['Co2.O', 'CO'],
  ['v.N2O4', 'NO2'], ['v.P4O10', 'P2O5'], ['v.S2Cl2', 'SCl'], ['v.CO2', 'C2O2'], ['v.CO', 'CoO'],
  ['v.N2O4', 'N4O2'], ['v.CCl4', 'C(Cl)4']
];
for (const [code, wrong] of traps) {
  const r = Chem.checkFormula(Chem.fromCode(code), wrong);
  if (r.ok) fail(code + ': the mistake ' + wrong + ' was accepted');
}
const none = { p1: 'none', num: 'none', p2: 'none' };
const nameTraps = [
  ['Ag1.Cl', 'silver(I) chloride'], ['Zn2.O', 'zinc(II) oxide'], ['Pb4.O', 'lead(II) oxide'],
  ['Fe3.O', 'iron oxide'], ['Na1.Cl', 'sodium chlorine'], ['Mn4.O', 'magnesium(IV) oxide'],
  ['Ca2.Cl', 'calcium dichloride'], ['Fe3.Cl', 'iron trichloride'], ['NH41.Cl', 'ammonium monochloride'],
  ['v.CO2', 'carbon(IV) oxide'], ['v.CO', 'monocarbon monoxide'], ['v.CO', 'carbon oxide'],
  ['v.N2O4', 'nitrogen dioxide'], ['v.N2O5', 'dinitrogen pentaoxide'], ['v.CO2', 'carbon dioxygen']
];
for (const [code, wrong] of nameTraps) {
  if (Chem.checkName(Chem.fromCode(code), wrong).ok) fail(code + ': the mistake "' + wrong + '" was accepted');
}
/* Builder tiles: a prefix tile on an ionic name, or a numeral tile on a
   covalent one, is called out even if the rest is right. */
if (Chem.checkName(Chem.fromCode('Ca2.Cl'), 'calcium dichloride', { p1: 'none', num: 'none', p2: 'di' }).ok) {
  fail('a prefix tile on an ionic name was accepted');
}
if (Chem.checkName(Chem.fromCode('v.CO2'), 'carbon(IV) dioxide', { p1: 'none', num: 'IV', p2: 'di' }).ok) {
  fail('a Roman numeral tile on a covalent name was accepted');
}
for (const cpd of all) {
  if (!Chem.checkName(cpd, Chem.name(cpd), cpd.kind === 'cov'
      ? { p1: cpd.x > 1 ? P[cpd.x] : 'none', num: 'none', p2: P[cpd.y] } : none).ok) {
    fail(Chem.name(cpd) + ': the correct tiles are marked wrong');
  }
}

/* ------------------------------------------------------------ check questions */

const TAGS = new Set(['decide', 'cross', 'prefix', 'covred', 'tm', 'fixed', 'ide', 'ionic', 'numeral', 'charge', 'reduce', 'paren', 'poly']);
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
  if (b.min > Plan.LEVELS.length) fail(b.id + ': min level ' + b.min + ' is past the last level');
}
let generated = 0;
for (const cpd of all) {
  const kinds = cpd.kind === 'cov' ? ['r', 'f', 'n'] : cpd.c.tm ? ['r', 'c', 'f', 'n'] : ['r', 'f', 'n'];
  for (const k of kinds) {
    const code = 'g:' + k + ':' + cpd.code;
    const q = CFU.build(code);
    generated++;
    if (!q) { fail(code + ' does not build'); continue; }
    if (q.a.length < 3 || new Set(q.a).size !== q.a.length) fail(code + ': options ' + q.a.join(' | '));
    if (k !== 'r' && q.a.length < 4) fail(code + ': only ' + q.a.length + ' options');
  }
}

/* ------------------------------------------------------------ the draw */

const RUNS = 2000;
let maxState = 0, ruleRuns = 0, dirRuns = 0, pairMisses = 0;
const counts = {};
const isPair = new Set(Plan.PAIRS.map((p) => p.join('|')));
for (let r = 0; r < RUNS; r++) {
  const seed = (r * 2654435761) >>> 0;
  const plan = Plan.newPlan(seed);
  const seenQ = new Set(), seenC = new Set();
  for (const L of Plan.LEVELS) {
    const list = plan[L.n];
    for (const code of list) {
      if (!Plan.valid(code)) fail('run ' + r + ' level ' + L.n + ': invalid code ' + code);
      const q = Plan.strip(code);
      if (q.startsWith('q:') || q.startsWith('g:')) {
        if (seenQ.has(q)) fail('run ' + r + ': question ' + q + ' asked twice');
        seenQ.add(q);
      }
    }
    counts[L.n] = counts[L.n] || { min: 1e9, max: 0, checks: 0 };
    counts[L.n].min = Math.min(counts[L.n].min, list.length);
    counts[L.n].max = Math.max(counts[L.n].max, list.length);
    counts[L.n].checks += list.filter((c) => /^!?(q|g):/.test(c)).length / RUNS;

    const content = list.filter((c) => /^[rnf]:/.test(c));
    if (content.length !== L.count) fail('run ' + r + ' level ' + L.n + ' has ' + content.length + ' questions, not ' + L.count);
    const cpds = content.map((c) => Chem.fromCode(c.slice(2)));
    cpds.forEach((c) => { if (seenC.has(c.code)) fail('run ' + r + ': ' + c.code + ' appears twice'); seenC.add(c.code); });
    const rules = cpds.map(Chem.rule);
    for (const k of ['cov', 'ion', 'tm']) {
      const got = rules.filter((x) => x === k).length;
      if (got !== L.targets[k]) fail('run ' + r + ' level ' + L.n + ': ' + got + ' ' + k + ', target ' + L.targets[k]);
    }
    if (/(.)\1\1/.test(rules.map((x) => x[0]).join(''))) ruleRuns++;
    const has = (f) => cpds.some((c) => f(c, Chem.traits(c)));
    const agZn = (c) => c.kind === 'ion' && (c.c.t === 'Ag' || c.c.t === 'Zn');
    const snPb = (c) => c.kind === 'ion' && (c.c.t === 'Sn' || c.c.t === 'Pb');
    const ok = has(agZn) && has(snPb) && has((c, t) => t.ammonium) && has((c, t) => t.noble) &&
      (L.n === 1 || (has((c, t) => t.reducible) && has((c, t) => t.monoSecond) && has((c, t) => t.fourOverTwo) &&
                     has((c, t) => t.cov === false && t.parens) && has((c) => c.kind === 'ion' && c.c.tm && c.q === 1)));
    if (!ok) fail('run ' + r + ' level ' + L.n + ' is missing a required case: ' + content.join(' '));
    /* look-alike pairs side by side */
    let adjacent = 0;
    for (let i = 1; i < cpds.length; i++) {
      if (isPair.has(cpds[i - 1].code + '|' + cpds[i].code) || isPair.has(cpds[i].code + '|' + cpds[i - 1].code)) adjacent++;
    }
    if (adjacent < L.pairs) pairMisses++;
    if (L.n >= 2) {
      const dirs = content.map((c) => c[0]).join('');
      if (/nnn|fff/.test(dirs)) dirRuns++;
      const nn = (dirs.match(/n/g) || []).length;
      if (nn !== L.count / 2) fail('run ' + r + ' level ' + L.n + ': ' + nn + ' names of ' + L.count);
    }
  }
  /* worst case: every level also takes its full quota of follow-up questions */
  const padded = JSON.parse(JSON.stringify(plan));
  for (const k of Object.keys(padded)) for (let i = 0; i < 4; i++) padded[k].push('!+g:f:NH41.Cr2O7');
  const size = JSON.stringify({ v: 1, s: 4294967295, u: 3, l: 3, i: 99, p: padded,
    st: { items: 999, clean: 999, checks: 999, checksRight: 999 } }).length;
  maxState = Math.max(maxState, size);
}
if (ruleRuns) fail(ruleRuns + ' level draws had the same rule set three times in a row');
if (dirRuns) fail(dirRuns + ' level draws had three names or three formulas in a row');
if (pairMisses) fail(pairMisses + ' level draws were missing a side-by-side look-alike pair');
if (maxState > 4000) fail('saved state can reach ' + maxState + ' characters; SCORM 1.2 allows 4096');

/* ------------------------------------------------------------- report */

console.log('compounds in pool:     ' + ionic.length + ' ionic + ' + covalent.length + ' covalent');
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

/* tools/validate.js: checks the activity without a browser. Must pass before
 * every commit.
 *
 *   node tools/validate.js
 *
 * It checks the house rules (no em dash, offline, relative paths, the
 * manifest lists every file), the class handout typed a second time here
 * (the activity series, the halogens, the solubility of every pair of ions
 * that can appear), every compound (formula from the charges, name, particle
 * drawing), every problem in the pools (reacts or not, products, states and
 * coefficients, each worked out again here), and the graded work of 400
 * students.
 */
const fs = require('fs');
const path = require('path');
const { load, scripts, SRC } = require('./load.js');
const A = load();
const { Chem, Ions, Rx, Particles, Gen, Bench, Steps, App, CONFIG } = A;

let bad = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { bad++; console.error('FAIL: ' + msg); } }

/* ------------------------------------------------------------ house rules */
const ROOT = path.join(__dirname, '..');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
}
const textFiles = walk(SRC).concat(walk(path.join(ROOT, 'tools')), [path.join(ROOT, 'README.md'), path.join(ROOT, 'ANSWER_KEY.md')])
  .filter((f) => fs.existsSync(f) && /\.(js|css|html|xml|md)$/.test(f));
const EM = String.fromCharCode(0x2014);
textFiles.forEach((f) => {
  const t = fs.readFileSync(f, 'utf8');
  ok(t.indexOf(EM) < 0, 'em dash in ' + path.relative(ROOT, f));
  if (f.startsWith(SRC)) {
    ok(!/https?:\/\/(?!www\.(imsproject|adlnet|imsglobal|w3)\.org)/.test(t), 'a web address in ' + path.relative(ROOT, f) + ' (offline only)');
    ok(!/(src|href)="\//.test(t), 'a path starting with / in ' + path.relative(ROOT, f));
    ok(!/webgl|@import|font-face/i.test(t), 'WebGL or a web font in ' + path.relative(ROOT, f));
  }
});
const manifest = fs.readFileSync(path.join(SRC, 'imsmanifest.xml'), 'utf8');
const listed = [];
manifest.replace(/<file href="([^"]+)"\/>/g, (m, f) => { listed.push(f); return m; });
const actual = walk(SRC).map((f) => path.relative(SRC, f)).filter((f) => f !== 'imsmanifest.xml').sort();
ok(JSON.stringify(listed.slice().sort()) === JSON.stringify(actual), 'the manifest does not list exactly the files of src/');
ok(JSON.stringify(scripts().slice().sort()) === JSON.stringify(actual.filter((f) => /\.js$/.test(f))), 'index.html does not load exactly the scripts of src/js');
ok(/identifier="PREDPROD_MANIFEST"/.test(manifest) && !/masteryscore/i.test(manifest.replace(/<!--[\s\S]*?-->/g, '')), 'manifest identifiers, or a masteryscore');
ok(CONFIG.store === 'predicting-products-state' && typeof App.SCHEMA === 'number', 'the save key or SCHEMA');
['ladder.js', 'steps.js'].forEach((f) => {
  const t = fs.readFileSync(path.join(SRC, 'js', f), 'utf8');
  ok(/submit-answer/.test(t) && /aria-pressed/.test(t) && /selected/.test(t), f + ': graded choices need select, then Submit answer');
});
/* the workbench and the model are the balancing packages': a fix goes into all */
const SHARED = path.join(ROOT, '..', 'balancing-particles-scorm', 'src', 'js');
if (fs.existsSync(SHARED)) {
  ['util.js', 'scorm.js', 'chem.js', 'bench.js'].forEach((f) => {
    ok(fs.readFileSync(path.join(SHARED, f), 'utf8') === fs.readFileSync(path.join(SRC, 'js', f), 'utf8'), f + ' differs from the copy in balancing-particles-scorm');
  });
}
ok(!/hydroxide|OH/.test(Gen.METALS.join()) && Gen.METALS.every((m) => ['Li', 'K', 'Na', 'Ca', 'Ba', 'Sr'].indexOf(m) < 0), 'no metal that reacts with water as a lone metal');

/* --------------------------------------------------- the handout, typed again */
const SERIES = 'Li Rb K Cs Ba Sr Ca Na Mg Al Mn Zn Cr Fe Cd Co Ni Sn Pb H Cu Ag Hg Pt Au'.split(' ');
const CHARGE = { Li: 1, Rb: 1, K: 1, Cs: 1, Ba: 2, Sr: 2, Ca: 2, Na: 1, Mg: 2, Al: 3, Mn: 2, Zn: 2, Cr: 3, Fe: 2, Cd: 2, Co: 2, Ni: 2, Sn: 2, Pb: 2, H: 1, Cu: 2, Ag: 1, Hg: 2, Pt: 2, Au: 3 };
ok(Ions.SERIES.map((x) => x[0]).join(' ') === SERIES.join(' '), 'the activity series is not the handout\'s');
Ions.SERIES.forEach((x) => ok(x[2] === CHARGE[x[0]], 'the ion of ' + x[0] + ' on the series'));
Object.keys(Ions.CATIONS).forEach((c) => { if (CHARGE[c]) ok(Ions.CATIONS[c][1] === CHARGE[c], c + ': the charge does not match the series'); });
ok(Ions.HALOGENS.map((x) => x[0]).join(' ') === 'F Cl Br I', 'the halogens: F, Cl, Br, I');
const above = (a, b) => SERIES.indexOf(a) < SERIES.indexOf(b);
/* S soluble, I insoluble, - never used. Columns: Cl Br I NO3 SO4 CO3 PO4 OH C2H3O2 S */
const COLS = ['Cl', 'Br', 'I', 'NO3', 'SO4', 'CO3', 'PO4', 'OH', 'C2H3O2', 'S'];
const REAL = {
  Na: 'SSSSSSSSSS', K: 'SSSSSSSSSS', NH4: 'SSSSSSS-SS', Mg: 'SSSSSIII--', Ca: 'SSSS-II-S-', Ba: 'SSSSIIISS-', Sr: 'SSSSIII---',
  Al: 'SSSSS-II--', Zn: 'SSSSSIII-I', Fe: 'SSSSSIII-I', Pb: '--ISIIIISI', Cu: 'SS-SSIII-I', Ag: 'IIIS-II--I'
};
ok(Gen.DR_CATS.join() === Object.keys(REAL).join() && Gen.DR_ANS.join() === COLS.join(), 'the ions of the double replacements');
const real = (cat, an) => REAL[cat][COLS.indexOf(an)];
Object.keys(REAL).forEach((cat) => COLS.forEach((an) => {
  const r = real(cat, an);
  ok((r === '-') === !Ions.usable(cat, an), cat + ' ' + an + ': avoided or not?');
  if (r !== '-') ok((r === 'S') === Ions.soluble(cat, an), cat + ' ' + an + ': the table says ' + (Ions.soluble(cat, an) ? 'soluble' : 'insoluble') + ', it is ' + r);
}));
/* the handout's own rows, and the agreed additions */
ok(Ions.soluble('Ag', 'Cl') === false && Ions.soluble('Pb', 'I') === false && Ions.soluble('Ba', 'SO4') === false && Ions.soluble('Sr', 'SO4') === false, 'insoluble exceptions');
ok(Ions.soluble('Ba', 'OH') && Ions.soluble('Na', 'CO3') && Ions.soluble('NH4', 'PO4') && Ions.soluble('K', 'S') && Ions.soluble('Li', 'CO3'), 'soluble exceptions');
ok(!Ions.soluble('Ag', 'Br') && !Ions.soluble('Ag', 'I') && Ions.soluble('Li', 'PO4'), 'bromide and iodide follow chloride; lithium is always soluble');

/* -------------------------------------------------------------- compounds */
const names = {};
Object.keys(Ions.BY).forEach((f) => {
  const p = Ions.BY[f], want = Chem.parse(f), got = {};
  Particles.readTree(Ions.tree(f)).forEach((a) => { got[a.el] = (got[a.el] || 0) + 1; });
  const key = (o) => Object.keys(o).sort().map((k) => k + o[k]).join(' ');
  ok(key(want) === key(got), f + ': the particle tree has ' + key(got) + ', the formula ' + key(want));
  const r = Ions.ratio(p.cat, p.an);
  ok(r[0] * Ions.CATIONS[p.cat][1] === r[1] * Ions.ANIONS[p.an][1] && Chem.gcd(r[0], r[1]) === 1, f + ': the charges do not cancel in lowest terms');
  ok(Object.keys(want).every((el) => Particles.EL[el]), f + ': an element with no colour');
  const n = Ions.name(f);
  ok(n && !names[n], f + ': name missing or used twice: ' + n); names[n] = 1;
  const lay = Particles.layout(f);
  ok(lay.atoms.every((a) => isFinite(a.x) && isFinite(a.y)) && lay.R > 0 && lay.R < 90, f + ': drawing out of range');
});
ok(Ions.formula('Al', 'SO4') === 'Al2(SO4)3' && Ions.formula('NH4', 'PO4') === '(NH4)3PO4' && Ions.formula('Ca', 'OH') === 'Ca(OH)2' && Ions.formula('H', 'SO4') === 'H2SO4' &&
   Ions.formula('Fe', 'Cl') === 'FeCl2' && Ions.formula('Ba', 'SO4') === 'BaSO4', 'formulas from charges');
ok(Ions.name('FeCl2') === 'iron(II) chloride' && Ions.name('HCl') === 'hydrochloric acid' && Ions.name('Br2') === 'bromine' && Ions.name('Zn') === 'zinc', 'names');
ok(Ions.state('H2') === 'g' && Ions.state('Br2') === 'l' && Ions.state('I2') === 's' && Ions.state('Cu') === 's' && Ions.state('AgCl') === 's' && Ions.state('HCl') === 'aq', 'states');

/* --------------------------------------------------------------- problems */
const P = Gen.pools();
const sizes = Object.keys(P).map((k) => k + ' ' + P[k].length).join(', ');
Object.keys(P).forEach((k) => ok(P[k].length >= 2, 'pool ' + k + ' has only ' + P[k].length));
function checkProblem(p, where) {
  const tag = where + ' ' + p.id + ': ';
  ok(p.coefs && Chem.conserved(p.rx, p.coefs) && Chem.judge(p.rx, p.coefs).kind === 'right', tag + 'not balanced');
  ok(Chem.inventory(p.rx, p.coefs).every((x) => x.ok), tag + 'the inventory does not match at the answer');
  const all = p.l.concat(p.products);
  all.forEach((f) => { const pr = Ions.parts(f); if (pr && pr.cat !== 'H') ok(Ions.usable(pr.cat, pr.an) && real(pr.cat, pr.an) !== '-', tag + f + ' should never be used'); });
  if (p.kind === 'sr') {
    const comp = Ions.parts(p.l[1]), lone = Ions.symOf(p.l[0]);
    ok(Ions.isElement(p.l[0]) && comp, tag + 'a lone element and a compound');
    if (p.sub === 'halogen') {
      ok('F Cl Br I'.split(' ').indexOf(lone) < 'F Cl Br I'.split(' ').indexOf(comp.an) === p.reacts, tag + 'halogen order');
      ok(p.products[0] === Ions.formula(comp.cat, lone) && p.products[1] === comp.an + '2', tag + 'halogen products');
    } else {
      ok(above(lone, comp.cat) === p.reacts, tag + 'the series says ' + above(lone, comp.cat));
      ok(p.products[0] === Ions.formula(lone, comp.an) && p.products[1] === (comp.cat === 'H' ? 'H2' : comp.cat), tag + 'products');
      ok((p.sub === 'acid') === (comp.cat === 'H'), tag + 'acid or salt');
      ok(real(lone, comp.an) === 'S', tag + 'the new salt must be soluble, or the metal would be coated');
    }
    ok(p.rungs.join() === (p.reacts ? 'react,products,states,balance' : 'react'), tag + 'rungs');
    if (p.reacts) ok(p.states[p.products[0]] === 'aq' && p.states[p.products[1]] === ({ H2: 'g', Br2: 'l', I2: 's', Cl2: 'g' }[p.products[1]] || 's'), tag + 'states');
  } else {
    const a = Ions.parts(p.l[0]), b = Ions.parts(p.l[1]);
    ok(real(a.cat, a.an) === 'S' && real(b.cat, b.an) === 'S' && a.cat !== b.cat && a.an !== b.an, tag + 'two different soluble compounds');
    ok(p.products.join() === [Ions.formula(a.cat, b.an), Ions.formula(b.cat, a.an)].join(), tag + 'the partners trade');
    const solid = [real(a.cat, b.an), real(b.cat, a.an)].map((x) => x === 'I');
    ok((solid[0] || solid[1]) === p.reacts, tag + 'reacts only if a product is insoluble');
    p.products.forEach((f, k) => ok(p.states[f] === (solid[k] ? 's' : 'aq'), tag + 'state of ' + f));
    ok(p.rungs.join() === (p.reacts ? 'products,states,react,balance' : 'products,states,react'), tag + 'rungs');
  }
  ok(/\.$/.test(p.prompt) && p.why.length > 20, tag + 'prompt or reason');
  /* the outlines of the kept ions, and a readable picture */
  if (p.reacts) {
    const info = Chem.rows(p.rx), sp = Chem.species(p.rx);
    info.kept.forEach((ion) => {
      const per = info.rows.filter((x) => x.key === ion)[0].per;
      sp.forEach((f, j) => ok(Particles.groups(f, ion, false).length === per[j], tag + f + ' should show ' + per[j] + ' ' + ion + ' outlined'));
    });
    const sc = Math.min(
      Particles.fill(null, p.l.map((f, j) => ({ f, n: p.coefs[j] })), { w: Bench.BOXW, h: Bench.BOXH, measure: true }),
      Particles.fill(null, p.products.map((f, j) => ({ f, n: p.coefs[2 + j] })), { w: Bench.BOXW, h: Bench.BOXH, measure: true }));
    ok(sc >= 0.5, tag + 'particles drawn too small at the answer (' + sc.toFixed(2) + ')');
  }
}
Object.keys(P).forEach((k) => P[k].forEach((p) => {
  checkProblem(p, k);
  ok(p.reacts === /Yes$/.test(k), k + ' ' + p.id + ': in the wrong pool');
}));
ok(Gen.equation(Gen.make('Al', 'CuCl2'), true) === '2 Al(s) + 3 CuCl₂(aq) → 2 AlCl₃(aq) + 3 Cu(s)', 'Al + CuCl2: ' + Gen.equation(Gen.make('Al', 'CuCl2'), true));
ok(Gen.equation(Gen.make('Cu', 'HCl'), true) === 'Cu(s) + HCl(aq) → no reaction', 'Cu + HCl');
ok(Gen.equation(Gen.make('Cl2', 'KBr'), true) === 'Cl₂(aq) + 2 KBr(aq) → 2 KCl(aq) + Br₂(l)', 'Cl2 + KBr');
ok(Gen.equation(Gen.make('Pb(NO3)2', 'KI'), true) === 'Pb(NO₃)₂(aq) + 2 KI(aq) → PbI₂(s) + 2 KNO₃(aq)', 'Pb(NO3)2 + KI');

/* ----------------------------------------------------------------- lesson */
const ids = {};
App.STEPS.forEach((s, i) => {
  ok(!ids[s.id], 'step id twice: ' + s.id); ids[s.id] = 1;
  ok(i === 0 || s.part >= App.STEPS[i - 1].part, 'parts out of order at ' + s.id);
  if (s.kind === 'ladder') checkProblem(Gen.make(s.l[0], s.l[1]), 'lesson');
});
const lesson = (id) => { const s = App.STEPS.filter((x) => x.id === id)[0]; return Gen.make(s.l[0], s.l[1]); };
ok(lesson('sr1').reacts && lesson('sr2').sub === 'acid' && lesson('sr2').reacts && lesson('dr1').reacts && !lesson('dr2').reacts, 'the four lesson problems');
ok(Steps.WILLIT.filter((w) => Gen.make(w[0], w[1]).reacts).length === 3 && Steps.WILLIT.length === 6, 'will it react: three of each');
ok(Steps.SOL.filter((f) => Ions.state(f) === 's').length === 4 && Steps.SOL.length === 8 && Steps.SOL.every((f) => Ions.BY[f]), 'soluble or not: four of each');
ok(App.STEPS[App.STEPS.length - 1].kind === 'results' && App.PARTS.length === 4, 'results last');

/* ----------------------------------------------------------- graded work */
const seen = {};
for (let seed = 1; seed <= 400; seed++) {
  const set = Gen.set(seed * 7919 + 13), tag = 'seed ' + seed + ': ';
  ok(set.length === 10 && new Set(set.map((p) => p.id)).size === 10, tag + '10 different problems');
  const sr = set.filter((p) => p.kind === 'sr'), dr = set.filter((p) => p.kind === 'dr');
  ok(sr.length === 5 && sr.filter((p) => !p.reacts).length === 2 && dr.length === 5 && dr.filter((p) => !p.reacts).length === 1, tag + 'five of each kind, three with no reaction');
  ok(sr.filter((p) => p.sub === 'metal').length === 3 && sr.filter((p) => p.sub === 'acid').length === 1 && sr.filter((p) => p.sub === 'halogen').length === 1, tag + 'three metals, an acid and a halogen');
  ok(set[0].kind === 'sr' && set[0].sub === 'metal' && set[0].reacts, tag + 'a metal that reacts first');
  ok(set.reduce((t, p) => t + p.rungs.length, 0) === 33, tag + '33 steps in all');
  set.forEach((p) => { seen[p.kind + (p.reacts ? 'Y' : 'N')] = (seen[p.kind + (p.reacts ? 'Y' : 'N')] || new Set()).add(p.id); });
  const qs = Gen.quiz(seed * 7919 + 13);
  ok(qs.length === 4 && qs.map((q) => q.kind).join() === 'series,acid,insoluble,noreaction', tag + 'the four questions');
  const sym = (name) => Ions.SERIES.filter((x) => x[1] === name.toLowerCase())[0][0];
  const plain = (t) => t.replace(/[₀-₉]/g, (d) => '₀₁₂₃₄₅₆₇₈₉'.indexOf(d));
  qs.forEach((q) => {
    ok(q.choices.length === 4 && new Set(q.choices).size === 4 && q.right >= 0 && q.why && q.stem, tag + q.id + ' choices');
    let truth;
    if (q.kind === 'series') truth = q.choices.map((c) => above(sym(c), q.target));
    else if (q.kind === 'acid') truth = q.choices.map((c) => !above(sym(c), 'H'));
    else if (q.kind === 'insoluble') truth = q.choices.map((c) => { const pr = Ions.parts(plain(c)); return real(pr.cat, pr.an) === 'I'; });
    else truth = q.choices.map((c) => {
      const pr = plain(c).split(' and ').map((f) => Ions.parts(f));
      return real(pr[0].cat, pr[1].an) === 'S' && real(pr[1].cat, pr[0].an) === 'S';
    });
    ok(truth.filter(Boolean).length === 1 && truth[q.right], tag + q.id + ': exactly one choice must be right: ' + q.choices.join(' / '));
  });
}
ok(seen.srY.size >= 30 && seen.srN.size >= 25 && seen.drY.size >= 200 && seen.drN.size >= 100, 'too little variety across 400 students');
ok(App.totalItems.length === 0, 'App.totalItems');

console.log(bad ? bad + ' of ' + checks + ' checks FAILED' : 'All ' + checks + ' checks passed: ' + Object.keys(Ions.BY).length + ' compounds; pools: ' + sizes + '; 400 students.');
process.exit(bad ? 1 : 0);

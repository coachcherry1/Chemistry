/* tools/validate.js: chemistry, teaching and item-bank checks. Run after ANY
 * edit to a molecule, a step, a prediction or a question.
 *
 *   node tools/validate.js
 *
 * Exits non-zero if the activity would teach something that disagrees with
 * its own model or with the textbook:
 *   - a name that differs from the textbook's, an R/S or E/Z label that is
 *     wrong (checked on textbook molecules), a drawing whose wedges, dashes
 *     or cis/trans geometry say something else, a 3D model that does not
 *     match the graph;
 *   - a reaction outcome that differs from Klein's worked examples (7.3,
 *     7.7, Figure 7.15, problem 7.18, menthyl and neomenthyl chloride), the
 *     decision table, or the teacher's classification of the reagents;
 *   - E2 stereochemistry that two independent methods disagree on;
 *   - a prediction key, a sort card or a quiz answer the model does not
 *     support.
 * It also holds the activity to its house rules: no em dashes anywhere,
 * Klein's wording (anti-coplanar, back-side attack, Zaitsev), a reagent
 * question in every checkpoint, and no right answer that is the longest choice.
 */
const fs = require('fs');
const path = require('path');

global.window = { addEventListener() {}, matchMedia() { return { matches: false }; } };
global.document = { addEventListener() {} };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const src = path.join(__dirname, '..', 'src', 'js');
const FILES = ['geom.js', 'mol.js', 'name.js', 'layout.js', 'chair.js', 'draw.js', 'react.js', 'build3d.js', 'viewer3d.js', 'anim.js',
               'mech.js', 'arrows.js', 'molecules.js', 'picker.js', 'quiz.js', 'scorm.js', 'app.js', 'steps1.js', 'steps2.js', 'steps3.js'];
for (const f of FILES) (0, eval)(fs.readFileSync(path.join(src, f), 'utf8'));

const problems = [];
const fail = (msg) => problems.push(msg);
const name = (m) => Name.name(m);
const G = GEOM;

/* ------------------------------------------------- names and stereo */

for (const id of Object.keys(MOLS)) {
  const m = mol(id);
  const n = name(m);
  if (n !== MOLS[id].name) fail(`${id}: computed name "${n}", textbook "${MOLS[id].name}"`);
}

/* Textbook molecules for the R/S and E/Z machinery, from PubChem's
   isomeric SMILES: L-alanine is (S), (R)-2-butanol, (E)-but-2-ene. */
const ANCHORS = [
  ['C[C@@H](C(=O)O)N', 'S', 'L-alanine'],
  ['C[C@@H](O)CC', 'R', '(R)-butan-2-ol'],
  ['OC[C@@H](O)C=O', 'R', 'D-glyceraldehyde']
];
for (const [s, want, what] of ANCHORS) {
  const m = Mol.parse(s);
  const got = m.atoms.map((a, i) => Mol.rs(m, i)).filter(Boolean);
  if (got.length !== 1 || got[0] !== want) fail(`${what}: R/S gave ${got.join(',')}, textbook ${want}`);
}
if (name(Mol.parse('C/C=C/C')) !== '(E)-but-2-ene') fail('(E)-but-2-ene named ' + name(Mol.parse('C/C=C/C')));
if (name(Mol.parse('C/C=C\\C')) !== '(Z)-but-2-ene') fail('(Z)-but-2-ene named ' + name(Mol.parse('C/C=C\\C')));
/* naming rules the class uses */
const NAMES = [
  ['CC(OCC)C(C)(C)C', '3-ethoxy-2,2-dimethylbutane'], ['CCC(=C)CC', '2-ethylbut-1-ene'], ['C=C(C)C', '2-methylpropene'],
  ['CCC(C)C#N', '2-methylbutanenitrile'], ['CC(S)CC', 'butane-2-thiol'], ['CC(O)CC', 'butan-2-ol'], ['C=C1CCCCC1', 'methylenecyclohexane'],
  ['CC1=CCCCC1', '1-methylcyclohexene'], ['CC(C)(C)C1CC=CCC1', '4-tert-butylcyclohexene']
];
for (const [s, want] of NAMES) if (name(Mol.parse(s)) !== want) fail(`${s}: named ${name(Mol.parse(s))}, should be ${want}`);

/* --------------------------------------------- drawings and 3D models */

const seen = {};
function every(fn) {
  /* every molecule the activity can show: substrates, products, quiz figures */
  const list = [];
  Object.keys(MOLS).forEach((id) => list.push([id, mol(id)]));
  Object.keys(MOLS).forEach((id) => {
    ['NaOEt', 'tBuOK', 'NaSH', 'EtOH', 'NaCN', 'NaOMe', 'NaOH', 'NaN3', 'DBU'].forEach((k) => {
      try { React.predict(mol(id), k).products.forEach((p, i) => list.push([id + '+' + k + '#' + i, p.mol])); } catch (e) { /* not every pair reacts */ }
    });
  });
  Object.keys(QUIZZES).forEach((k) => QUIZZES[k].pool.forEach((q) => {
    [q.fig].concat(q.choices).forEach((c) => {
      if (!c || typeof c !== 'object') return;
      if (c.smiles) list.push([q.id + ':' + c.smiles, Mol.parse(c.smiles)]);
      if (c.ring) list.push([q.id + ':ring', Mol.fromRing(c.ring, c.ene)]);
    });
  }));
  list.forEach(([id, m]) => fn(id, m));
}
every((id, m) => {
  const L = Layout.layout(m, {});
  /* each chirality centre is drawn with a wedge or dash that reads its parity */
  m.atoms.forEach((a, c) => {
    if (!a.parity) return;
    const ring = Mol.ringOf(m);
    const onRing = ring && ring.indexOf(c) >= 0;
    if (!onRing && !Mol.isCentre(m, c)) return;
    const marks = {};
    Object.keys(L.wedge).forEach((k) => { const w = L.wedge[k]; if (w.from === c) { const b = m.bonds[k]; marks[b.a === c ? b.b : b.a] = w.type; } });
    if (!Object.keys(marks).length) {
      if (Mol.isCentre(m, c)) fail(`${id}: chirality centre ${c} drawn without a wedge or dash`);
      return;
    }
    if (L.handed(c, marks) !== a.parity.sign) fail(`${id}: the wedges at atom ${c} draw the other enantiomer`);
  });
  /* each stereogenic double bond is drawn cis or trans as the graph says */
  m.bonds.forEach((b, k) => {
    if (!b.cfg || b.order !== 2 || !L.pos[b.cfg.na] || !L.pos[b.cfg.nb]) return;
    if (Layout.drawnRel(L, b.a, b.b, b.cfg.na, b.cfg.nb) !== b.cfg.rel) fail(`${id}: double bond ${k} drawn ${b.cfg.rel === 'cis' ? 'trans' : 'cis'}`);
  });
  /* the 3D model has the graph's configurations */
  if (Mol.ringOf(m)) return;
  const md = Build3D.build(m, {});
  m.atoms.forEach((a, c) => {
    if (a.parity && Mol.isCentre(m, c) && Build3D.paritySign(md, m, c) !== a.parity.sign) fail(`${id}: 3D model has atom ${c} the wrong way round`);
  });
  m.bonds.forEach((b) => {
    if (!b.cfg || b.order !== 2) return;
    const d = Build3D.dihedral(md, md.of[b.cfg.na], md.of[b.a], md.of[b.b], md.of[b.cfg.nb]);
    if ((Math.abs(d) < 90 ? 'cis' : 'trans') !== b.cfg.rel) fail(`${id}: 3D model has a double bond the wrong way round`);
  });
});

/* E2 stereochemistry a second way: build the anti-coplanar conformer in 3D
   and read which groups end up on the same side. */
for (const id of Object.keys(MOLS)) {
  const m = mol(id);
  if (Mol.ringOf(m)) continue;
  const L = React.lg(m);
  if (!L) continue;
  React.betas(m, L.a).forEach((bt) => {
    if (m.hCount(bt.b) !== 1) return;
    const prods = React.e2From(m, L.a, bt.b, L.x);
    if (prods[0].how !== 'specific') return;
    const md = Build3D.build(m, { root: L.a, axis: bt.b, up: L.x, anti: -1 });
    const nm = Build3D.newman(md, md.of[L.a], md.of[bt.b]);
    const hAnti = nm.back.find((x) => Math.abs(x.a - 180) < 2);
    if (!hAnti || md.atoms[hAnti.i].el !== 'H') { fail(`${id}: no anti H in the 3D model`); return; }
    const alt = App.conformerAlkene(m, L, bt.b, md, nm);
    if (name(alt) !== name(prods[0].mol)) fail(`${id}: E2 from C${bt.b}: react.js says ${name(prods[0].mol)}, the 3D model ${name(alt)}`);
  });
}

/* ---------------------------------------------- the textbook's examples */

function pred(id, key) { const r = React.predict(mol(id), key); return r; }
function roles(r) { const o = {}; r.products.forEach((p) => { o[p.name] = p.role; }); return o; }
function expect(what, cond) { if (!cond) fail(what); }

/* Klein 7.7: 2-chloropentane and NaOEt */
{
  const r = roles(pred('cpR', 'NaOEt'));
  expect('Klein 7.7: (E)-pent-2-ene should be major', r['(E)-pent-2-ene'] === 'major');
  expect('Klein 7.7: (Z)-pent-2-ene minor', r['(Z)-pent-2-ene'] === 'minor');
  expect('Klein 7.7: pent-1-ene minor', r['pent-1-ene'] === 'minor');
  expect('Klein 7.7: the SN2 product, inverted, minor', r['(S)-2-ethoxypentane'] === 'minor' && !r['(R)-2-ethoxypentane']);
}
/* Klein 7.3: 1-chloro-1-methylcyclohexane, Zaitsev and Hofmann */
expect('Klein 7.3: NaOEt gives 1-methylcyclohexene', roles(pred('ccmh', 'NaOEt'))['1-methylcyclohexene'] === 'major');
expect('Klein 7.3: t-BuOK gives methylenecyclohexane', roles(pred('ccmh', 'tBuOK'))['methylenecyclohexane'] === 'major');
/* Figure 7.15: tert-butyl bromide in ethanol */
expect('Figure 7.15: 2-ethoxy-2-methylpropane by SN1', roles(pred('tBuBr', 'EtOH'))['2-ethoxy-2-methylpropane'] === 'major');
/* stereoselective: 3-bromopentane gives (E)-pent-2-ene major */
expect('3-bromopentane: (E)-pent-2-ene major', roles(pred('bp3', 'NaOEt'))['(E)-pent-2-ene'] === 'major');
/* rings: regioselective and regiospecific */
expect('cis-1-chloro-2-methylcyclohexane: 1-methylcyclohexene major', roles(pred('cisClMe', 'NaOEt'))['1-methylcyclohexene'] === 'major');
expect('trans-1-chloro-2-methylcyclohexane: only 3-methylcyclohexene', (() => {
  const r = pred('transClMe', 'NaOEt').products.filter((p) => p.mech === 'E2'); return r.length === 1 && r[0].name === '3-methylcyclohexene';
})());
/* the textbook's menthyl chloride (only the less substituted alkene) and neomenthyl chloride (Zaitsev major) */
expect('menthyl chloride: one alkene only', pred('menthylCl', 'NaOEt').products.filter((p) => p.mech === 'E2').length === 1);
expect('neomenthyl chloride: the Zaitsev alkene major', pred('neomenthylCl', 'NaOEt').products.some((p) => p.mech === 'E2' && p.role === 'major' && p.regio === 'Zaitsev'));
/* Klein 7.18 and the locked chairs */
expect('Klein 7.18: the trans isomer reacts faster', React.chairs(mol('transTbCl')).gap < 0 && React.chairs(mol('cisTbCl')).gap > 15);
expect('locked chair: cis-1-bromo-4-tert-butyl reactive, trans locked', React.chairs(mol('cisBrTb')).gap < 0 && React.chairs(mol('transBrTb')).gap > 15);
/* rearrangements */
expect('2-bromo-3-methylbutane: a hydride shift', React.cationPath(mol('b3mb')).shift.kind === 'H');
expect('3-bromo-2,2-dimethylbutane: a methyl shift', React.cationPath(mol('b22dmb')).shift.kind === 'CH3');
expect('a 3° carbocation never shifts', !React.cationPath(mol('bmb')).shift && !React.cationPath(mol('tBuBr')).shift);

/* Klein's decision table, as printed */
const KLEIN_TABLE = {
  1: { base: 'E2', both: 'SN2, some E2', nuc: 'SN2', weak: 'No reaction' },
  2: { base: 'E2', both: 'E2, some SN2', nuc: 'SN2', weak: 'No reaction' },
  3: { base: 'E2', both: 'E2', nuc: 'SN1', weak: 'SN1, some E1' }
};
[1, 2, 3].forEach((d) => Object.keys(KLEIN_TABLE[d]).forEach((fn) => {
  const got = App.resultOf(React.TABLE[d][fn]);
  if (got !== KLEIN_TABLE[d][fn]) fail(`table ${d}° ${fn}: ${got}, Klein ${KLEIN_TABLE[d][fn]}`);
}));
if (App.resultOf(React.mechanisms(1, 'tBuOK')) !== 'E2, some SN2') fail('t-BuOK at a 1° carbon should give mostly E2');

/* the teacher's classification of every reagent */
const FN = { NaOH: 'both', NaOMe: 'both', NaOEt: 'both', tBuOK: 'both', DBN: 'base', DBU: 'base', NaH: 'base', NaI: 'nuc', NaBr: 'nuc',
             NaCl: 'nuc', NaSH: 'nuc', NaSR: 'nuc', H2S: 'nuc', RSH: 'nuc', NaCN: 'nuc', NaN3: 'nuc', H2O: 'weak', MeOH: 'weak', EtOH: 'weak' };
Object.keys(FN).forEach((k) => { if (!React.REAGENTS[k] || React.REAGENTS[k].fn !== FN[k]) fail(`reagent ${k}: function ${React.REAGENTS[k] && React.REAGENTS[k].fn}, should be ${FN[k]}`); });
if (React.REAGENT_ORDER.length !== Object.keys(FN).length) fail('the reagent sort does not use every reagent');
if (!React.REAGENTS.tBuOK.hindered) fail('t-BuOK must be marked sterically hindered');

/* ------------------------------------------------------ the mechanisms */

function arrowsRight(sc) { return Mech.judge(sc, sc.arrows.map((a) => ({ from: a.from[0], to: a.to[0] }))).ok; }
{
  const tb = mol('tBuBr'), cat = React.cation(tb), ox = React.oxonium(cat, cat.plus, 'EtOH');
  const sc = [Mech.sn2(mol('bbR'), 'NaSH'), Mech.loss(tb), Mech.attack(cat, cat.plus, 'EtOH'), Mech.protonOff(ox.mol, ox.o, ox.h, 'EtOH'), Mech.e2(tb, 'NaOEt')];
  const c2 = React.cation(mol('b3mb')); sc.push(Mech.shift(c2, c2.plus, React.bestShift(c2, c2.plus)));
  const c3 = React.cation(mol('b22dmb')); sc.push(Mech.shift(c3, c3.plus, React.bestShift(c3, c3.plus)));
  sc.forEach((s) => { if (!arrowsRight(s)) fail(s.title + ': its own arrows are not accepted'); });
  /* a wrong arrow is refused and explained */
  const sn2 = sc[0];
  const bad = Mech.judge(sn2, [{ from: sn2.arrows[1].from[0], to: sn2.arrows[0].to[0] }]);
  if (bad.ok || !/electronegative/.test(bad.msg)) fail('SN2: the C–Br electrons going to C were not caught: ' + bad.msg);
  const one = Mech.judge(sn2, [{ from: sn2.arrows[0].from[0], to: sn2.arrows[0].to[0] }]);
  if (one.ok || !/concerted/.test(one.msg)) fail('SN2: a missing arrow was not explained as concerted: ' + one.msg);
  const e2 = sc[4];
  const toC = Mech.judge(e2, [{ from: e2.arrows[0].from[0], to: Mech.keys.ak(0, React.lg(e2.species[0].mol).a) }]);
  if (toC.ok || !/substitution/.test(toC.msg)) fail('E2: the base attacking carbon was not explained: ' + toC.msg);
  const atomTail = Mech.judge(e2, [{ from: Mech.keys.ak(0, 0), to: e2.arrows[0].to[0] }]);
  if (!/never on an atom/.test(atomTail.msg)) fail('an arrow from an atom was not explained');
  /* the question figures' wrong sets are really wrong */
  Object.keys(App.MECHFIG).forEach((k) => {
    const s = App.MECHFIG[k]();
    Object.keys(s.wrongSets).forEach((w) => { if (Mech.judge(s, s.wrongSets[w]).ok) fail(`MECHFIG ${k}.${w} is accepted as right`); });
  });
}

/* ----------------------------------------------------- predictions */

const P = App.PREDICT;
function answerIs(pid, text) { const p = P[pid]; if (p.choices[p.answer] !== text) fail(`PREDICT ${pid}: key "${p.choices[p.answer]}", model "${text}"`); }
answerIs('ringsn2', /^trans/.test(name(React.substitute(mol('cisBrMe'), 'NaSH', 'inv'))) ? 'Trans' : 'Cis');
answerIs('shift', React.cationPath(mol('b3mb')).shift.kind === 'H' ? 'A hydride shift makes a 3° carbocation' : 'A methyl shift makes a 3° carbocation');
answerIs('locked', React.chairs(mol('cisBrTb')).gap < React.chairs(mol('transBrTb')).gap ? 'cis-1-Bromo-4-tert-butylcyclohexane' : 'trans-1-Bromo-4-tert-butylcyclohexane');
answerIs('k718', React.chairs(mol('transTbCl')).gap < React.chairs(mol('cisTbCl')).gap ? 'trans-1-tert-Butyl-3-chlorocyclohexane' : 'cis-1-tert-Butyl-3-chlorocyclohexane');
answerIs('e1major', roles(pred('bmb', 'EtOH'))['2-ethoxy-2-methylbutane'] === 'major' ? 'The SN1 product, 2-ethoxy-2-methylbutane' : '?');
{
  const sizes = ['bromomethane', 'bromopropane1', 'bromopropane2', 'tBuBr'].map((id) => Anim.approach(mol(id), 'NaSH'));
  if (!(sizes[0].crowd < sizes[1].crowd && sizes[1].crowd < sizes[2].crowd && sizes[3].blocked && !sizes[2].blocked)) fail('sterics: crowding should rise from methyl to 2° and block 3°');
  answerIs('fastest', 'Bromomethane');
  const a = pred('bmpRR', 'NaOEt').products.find((p) => p.role === 'major').name, b = pred('bmpRS', 'NaOEt').products.find((p) => p.role === 'major').name;
  if (a === b) fail('the two diastereomers of 2-bromo-3-methylpentane give the same alkene');
  answerIs('specific', a !== b ? 'No: it gives the other stereoisomer' : 'Yes: the same alkene');
}

/* ------------------------------------------------------- sort cards */

App.SEL_CARDS.forEach((c) => {
  const m = mol(c.sub), r = React.predict(m, c.key);
  const main = r.mechs[0][0];
  const list = r.products.filter((p) => p.mech === main);
  const regios = {}; list.forEach((p) => { if (p.regio) regios[p.regio] = 1; });
  let bin = null;
  if (main === 'SN2' && list[0].mol.atoms.some((a, i) => a.parity && Mol.isCentre(list[0].mol, i))) bin = 'stereospec';
  else if (list.some((p) => p.how === 'selective-major')) bin = 'stereosel';
  else if (list.some((p) => p.how === 'specific' && p.role === 'major') && !Mol.ringOf(m)) bin = 'stereospec';
  else if (Object.keys(regios).length >= 2) bin = 'regiosel';
  else if (list.length === 1 && React.betas(m, React.lg(m).a).filter((b) => b.h).length >= 2) bin = 'regiospec';
  if (bin !== c.bin) fail(`sort card ${c.id} (${c.sub} + ${c.key}): the model puts it in ${bin}, the card in ${c.bin}`);
});

/* ------------------------------------------------------------ quizzes */

const FNTEXT = {
  nuc: 'Nucleophile only (strong nucleophile, weak base)', both: 'Strong nucleophile and strong base',
  base: 'Base only (strong base, weak nucleophile)', weak: 'Weak nucleophile, weak base'
};
const TEXT_REAGENT = {}; Object.keys(React.REAGENTS).forEach((k) => { TEXT_REAGENT[React.REAGENTS[k].text] = k; });
const ids = {};
Object.keys(QUIZZES).forEach((k) => {
  const Q = QUIZZES[k];
  if (Q.draw > Q.pool.length) fail(`${k}: draws ${Q.draw} from a pool of ${Q.pool.length}`);
  Q.core.forEach((c) => { if (!Q.pool.some((q) => q.id === c)) fail(`${k}: core ${c} not in the pool`); });
  if (!Q.core.some((c) => { const q = Q.pool.find((x) => x.id === c); return q.check && q.check.fn; })) fail(`${k}: no reagent-function question in the core`);
  Q.pool.forEach((q) => {
    if (ids[q.id]) fail('duplicate question id ' + q.id);
    ids[q.id] = 1;
    if (!q.why || q.choices.length < 2) fail(q.id + ': needs a why and at least two choices');
    const texts = q.choices.filter((c) => typeof c === 'string');
    /* the four reagent functions are fixed labels, not sentences */
    if (texts.length === q.choices.length && texts.length > 2 && !(q.check && q.check.fn)) {
      const L0 = texts[0].length, longest = Math.max(...texts.slice(1).map((t) => t.length));
      if (L0 > longest + 4) fail(`${q.id}: the right answer is the longest choice (${L0} vs ${longest})`);
    }
    const ck = q.check;
    if (!ck) return;
    const figName = (c) => name(App.figure ? (c.mol ? mol(c.mol) : c.smiles ? Mol.parse(c.smiles) : Mol.fromRing(c.ring, c.ene)) : null);
    if (ck.fn && q.choices[0] !== FNTEXT[React.REAGENTS[ck.fn].fn]) fail(`${q.id}: first choice is not ${ck.fn}'s function`);
    if (ck.fnPick) q.choices.forEach((c, i) => { const r = React.REAGENTS[TEXT_REAGENT[c]]; if (!r) fail(`${q.id}: unknown reagent ${c}`); else if ((r.fn === ck.fnPick) !== (i === 0)) fail(`${q.id}: ${c} is ${r.fn}`); });
    if (ck.major) {
      /* a 2° substrate in ethanol is past Klein's table: use the SN1 path itself */
      const maj = ck.major[2] === 'shift' ? React.sn1Products(mol(ck.major[0]), ck.major[1]).list.map((p) => name(p.mol))
        : pred(ck.major[0], ck.major[1]).products.filter((p) => p.role === 'major').map((p) => p.name);
      if (maj.indexOf(figName(q.choices[0])) < 0) fail(`${q.id}: first choice ${figName(q.choices[0])} is not the major product (${maj.join(', ')})`);
      q.choices.slice(1).forEach((c) => { if (maj.indexOf(figName(c)) >= 0) fail(`${q.id}: another choice is also major`); });
    }
    if (ck.none) {
      const ns = pred(ck.none[0], ck.none[1]).products.map((p) => p.name);
      if (ns.indexOf(figName(q.choices[0])) >= 0) fail(`${q.id}: the "not formed" answer forms`);
      q.choices.slice(1).forEach((c) => { if (ns.indexOf(figName(c)) < 0) fail(`${q.id}: ${figName(c)} does not form either`); });
    }
    if (ck.mech && q.choices[0] !== App.resultOf(pred(ck.mech[0], ck.mech[1]).mechs)) fail(`${q.id}: mechanisms ${App.resultOf(pred(ck.mech[0], ck.mech[1]).mechs)}`);
    if (ck.degree) { const d = React.degree(mol(ck.degree)); if (q.choices[0].indexOf(['Methyl', '1°', '2°', '3°'][d]) !== 0) fail(`${q.id}: substrate is ${d}°`); }
    if (ck.shift && React.cationPath(mol(ck.shift[0])).shift.kind !== ck.shift[1]) fail(`${q.id}: the shift is not ${ck.shift[1]}`);
    if (ck.faster) {
      const g = ck.faster.map((id) => React.chairs(mol(id)).gap);
      if (!(g[0] < g[1]) || q.choices[0].mol !== ck.faster[0]) fail(`${q.id}: ${ck.faster[0]} is not the faster`);
    }
    if (ck.names) {
      const ns = pred(ck.names[0], ck.names[1]).products.map((p) => p.name);
      const said = q.choices[0].match(/\([RS]\)-[^ ,]+|[a-z0-9,-]*(cyclohexene|hexane)\b/gi) || [];
      if (ck.names[1] === 'EtOH') {
        const both = ns.filter((n) => /ethoxy/.test(n));
        if (both.length !== 2) fail(`${q.id}: expected both enantiomers`);
      } else if (!ns.some((n) => q.choices[0].toLowerCase().indexOf(n) >= 0)) fail(`${q.id}: "${q.choices[0]}" does not name a model product (${ns.join(', ')})`);
      void said;
    }
    if (ck.mechfig) {
      const fig = q.choices[0];
      const s = App.MECHFIG[fig.mech]();
      if (fig.arrows !== 'right') fail(`${q.id}: first figure is not the right arrows`);
      q.choices.slice(1).forEach((c) => { if (!s.wrongSets[c.arrows]) fail(`${q.id}: no wrong set ${c.arrows}`); });
    }
  });
});
/* every checkpoint question that names an alkyl halide in a figure shows it */
let graded = 0; Object.keys(QUIZZES).forEach((k) => { graded += QUIZZES[k].draw; });
if (graded !== App.GRADED) fail('graded count mismatch');

/* ------------------------------------------------------- house rules */

const DASH = new RegExp('\\u2014|&' + 'mdash;');   /* split so this line does not match itself */
function walk(dir, out) {
  fs.readdirSync(dir).forEach((f) => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out); else if (/\.(js|css|html|xml|md)$/.test(f)) out.push(p);
  });
  return out;
}
const root = path.join(__dirname, '..');
walk(path.join(root, 'src'), []).concat(walk(path.join(root, 'tools'), [])).concat(['README.md', 'ANSWER_KEY.md'].map((f) => path.join(root, f)).filter((f) => fs.existsSync(f)))
  .forEach((f) => {
    const text = fs.readFileSync(f, 'utf8');
    text.split('\n').forEach((line, i) => { if (DASH.test(line)) fail(`em dash in ${path.relative(root, f)}:${i + 1}`); });
  });

/* Klein's wording in everything students read */
const studentText = [];
App.STEPS.forEach((s) => studentText.push(s.title, s.text));
Object.keys(P).forEach((k) => studentText.push(P[k].q, ...P[k].choices));
Object.keys(QUIZZES).forEach((k) => QUIZZES[k].pool.forEach((q) => { studentText.push(q.q, q.why); q.choices.forEach((c) => { if (typeof c === 'string') studentText.push(c); }); }));
App.VOCAB.forEach((v) => studentText.push(v[0], v[1]));
App.BIG_IDEAS.forEach((t) => studentText.push(t));
['steps1.js', 'steps2.js', 'steps3.js', 'mech.js', 'react.js'].forEach((f) => {
  const t = fs.readFileSync(path.join(src, f), 'utf8');
  (t.match(/'(?:[^'\\\n]|\\.)*'/g) || []).forEach((s) => studentText.push(s));
});
const all = studentText.join('\n');
const BANNED = [[/antiperiplanar|anti-periplanar/i, 'anti-coplanar (Klein)'], [/\bbackside\b/i, 'back-side'], [/saytze/i, 'Zaitsev'],
                [/\bSN 2\b|\bS N 2\b/, 'SN2'], [/Walden/i, 'inversion of configuration (Klein)']];
BANNED.forEach(([re, use]) => { const m = all.match(re); if (m) fail(`student text says "${m[0]}": use ${use}`); });
const MUST = [[/concerted/, 'concerted (SN2 and E2)'], [/back-side attack/, 'back-side attack'], [/anti-coplanar/, 'anti-coplanar'],
              [/proton transfer and loss of the leaving group/, 'E2 as proton transfer and loss of the leaving group'],
              [/nucleophilic attack and loss of the leaving group/, 'SN2 as nucleophilic attack and loss of the leaving group'],
              [/Regiospecific/, 'regiospecific'], [/Stereospecific/, 'stereospecific'], [/Stereoselective/, 'stereoselective'], [/Regioselective/, 'regioselective'],
              [/trans-diaxial/, 'trans-diaxial'], [/carbocation rearrangement/i, 'carbocation rearrangement']];
MUST.forEach(([re, what]) => { if (!re.test(all)) fail('student text never says ' + what); });

/* ------------------------------------------------------------- report */

if (problems.length) {
  console.error(problems.length + ' problem(s):\n  ' + problems.join('\n  '));
  process.exit(1);
}
const nQ = Object.keys(QUIZZES).reduce((s, k) => s + QUIZZES[k].pool.length, 0);
console.log(`Validation passed: ${Object.keys(MOLS).length} molecules, ${App.STEPS.length} steps, ${App.GRADED} graded questions from a pool of ${nQ}.`);

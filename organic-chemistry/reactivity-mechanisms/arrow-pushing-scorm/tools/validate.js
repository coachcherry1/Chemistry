/* tools/validate.js: checks the activity against its own model and against
 * Klein. Run from the package folder: node tools/validate.js
 *
 * Every mechanism step: its arrows obey Klein's rules (chem.js), make the
 * product written as SMILES, pass the arrow judge, keep the total charge, and
 * are named by the classifier with Klein's own pattern. Every chain starts
 * each step where the one before ended. The Part 1 numbers are Klein's
 * (Table 6.1 and his ΔH° answers); every sort, card, prediction and
 * checkpoint key agrees with the model; every question with a `check` is
 * re-derived. And the house rules: no em dashes anywhere, never
 * "spontaneous", none of the kinetics left out of this activity, the right
 * answer never the longest choice, a vocabulary question in every
 * checkpoint's core, a graded drawing in Checkpoints 3 and 4, the manifest
 * listing every file, and identifiers no other package uses.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
let failures = 0;
function fail(msg) { failures++; console.error('FAIL ' + msg); }
function ok(cond, msg) { if (!cond) fail(msg); }

/* ---- load the model, quiz and step data without a browser */
const noop = () => {};
const fakeEl = () => ({ setAttribute: noop, appendChild: noop, addEventListener: noop, classList: { add: noop, toggle: noop }, style: {} });
const ctx = {
  console, Math, JSON, Object, Array, String, Number, Error, setTimeout, URLSearchParams,
  window: { matchMedia: () => ({ matches: false }), addEventListener: noop },
  document: { addEventListener: noop, createElement: fakeEl, createElementNS: fakeEl, createTextNode: fakeEl, getElementById: fakeEl },
  localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
  location: { search: '' }, navigator: {}, requestAnimationFrame: noop, cancelAnimationFrame: noop
};
ctx.window.document = ctx.document;
vm.createContext(ctx);
const order = ['chem', 'scenes', 'judge', 'render', 'arrows', 'energy', 'picker', 'quiz', 'scorm', 'app', 'steps1', 'steps2'];
for (const f of order) vm.runInContext(fs.readFileSync(path.join(src, 'js', f + '.js'), 'utf8').replace(/^if \(typeof module.*$/m, ''), ctx, { filename: f + '.js' });
const { Chem, SCENES, Judge, QUIZZES, App, Energy } = vm.runInContext('({ Chem, SCENES, Judge, QUIZZES, App, Energy })', ctx);
const S = SCENES.S;

/* ============================================================ mechanisms */

const totalCharge = (st) => st.atoms.reduce((t, a) => t + Chem.charge(st, a.id), 0);
let nSteps = 0;
for (const [id, sc] of Object.entries(S)) {
  if (Array.isArray(sc) || !sc.arrows || !sc.arrows.length) continue;
  nSteps++;
  const r = Chem.apply(sc.before, sc.arrows);
  ok(!r.err, `${id}: its arrows break a rule (${r.err})`);
  if (sc.smiles) ok(Chem.matches(sc.after, sc.smiles), `${id}: the arrows do not make ${sc.smiles}`);
  else if (!/shift$/.test(id)) fail(`${id}: no product SMILES to check against`);
  ok(JSON.stringify(sc.patterns) === JSON.stringify(sc.klein), `${id}: classified ${sc.patterns}, Klein says ${sc.klein}`);
  ok(totalCharge(sc.before) === totalCharge(sc.after), `${id}: total charge changes`);
  const j = Judge.judge(sc, sc.arrows);
  ok(j.ok, `${id}: the judge rejects its own arrows: ${j.msg}`);
  /* the arrows in reverse order are just as right */
  ok(Judge.judge(sc, sc.arrows.slice().reverse()).ok, `${id}: arrow order matters to the judge`);
  /* every arrow on its own, if the step has two or more, is not enough */
  if (sc.arrows.length > 1) sc.arrows.forEach((a, k) => ok(!Judge.judge(sc, [a]).ok, `${id}: arrow ${k + 1} alone is accepted`));
  /* no atom ever ends with more than four orbitals or an H with two bonds */
  sc.after.atoms.forEach((a) => {
    if (a.el === 'H') ok(Chem.neighbours(sc.after, a.id).length === 1, `${id}: H ${a.id} has ${Chem.neighbours(sc.after, a.id).length} bonds`);
    else ok(Chem.orbitals(sc.after, a.id) <= 4, `${id}: ${a.id} has more than four orbitals`);
  });
}
ok(nSteps >= 30, `only ${nSteps} mechanism steps`);

/* chains: each step starts where the last one ended */
for (const c of ['f623', 'f631', 'ester']) {
  const list = S[c];
  ok(Array.isArray(list) && list.length >= 2, `${c}: not a chain`);
  for (let k = 1; k < list.length; k++) ok(Chem.same(list[k].before, list[k - 1].after), `${c}: step ${k + 1} does not start where step ${k} ended`);
}
/* Klein Figure 6.31 has all four patterns, one per step, in this order */
ok(S.f631.map((x) => x.patterns[0]).join() === 'pt,lg,shift,nuc', 'f631: not Klein’s proton transfer, loss, rearrangement, attack');
ok(S.ester.map((x) => x.patterns[0]).join() === 'nuc,lg,pt', 'ester: not Klein’s SkillBuilder 6.4 sequence');
ok(S.sn2.patterns.length === 2 && S.dSN2.patterns.length === 2, 'the concerted steps are not two patterns at once');

/* some typical mistakes must be caught with Klein's reason */
const K = SCENES.key;
const wrong = (id, arr, re, what) => {
  const r = Judge.judge(S[id], arr.map((a) => ({ from: K(a[0]), to: K(a[1]) })));
  ok(!r.ok && re.test(r.msg), `${id}: ${what}: got "${r.msg}"`);
};
wrong('protKetone', [['lp:O', 'H1']], /two bonds/, 'one-arrow proton transfer');
wrong('acylAttack', [['lp:Om', 'C']], /fifth bond|four orbitals/, 'attack without the pi arrow');
wrong('brAttack', [['C', 'Br']], /positive charge/, 'tail on the carbocation');
wrong('brLoss', [['Br', 'C']], /never on an atom/, 'tail on an atom');
wrong('sn2', [['lp:O', 'C1']], /fifth bond|four orbitals/, 'SN2 without loss of the leaving group');

/* ============================================================== Part 1 */

for (const id of ['bdeA', 'bdeB']) {
  const sc = S[id];
  ok(Chem.matches(sc.after, sc.smiles), `${id}: the products are not ${sc.smiles}`);
  const L = Chem.ledger(sc.before, sc.after);
  const sum = (list) => list.reduce((t, b) => {
    const v = sc.bde[Chem.keys.pair(b.a, b.b)];
    ok(v != null, `${id}: no Klein value for ${b.a}-${b.b}`);
    return t + (v || 0);
  }, 0);
  const dH = sum(L.broken) - sum(L.formed);
  ok(dH === sc.kleinH, `${id}: Table 6.1 gives ΔH° = ${dH}, Klein's answer is ${sc.kleinH}`);
  ok(sc.after.atoms.every((a) => Chem.charge(sc.after, a.id) === 0), `${id}: a product is charged`);
}
/* Klein Table 6.1 values used (kJ/mol) */
const T61 = { 'bdeA:C-H': 381, 'bdeA:Cl1-Cl2': 243, 'bdeA:C-Cl1': 331, 'bdeA:Cl2-H': 431, 'bdeB:C-Cl': 331, 'bdeB:H1-O': 498, 'bdeB:C-O': 381, 'bdeB:Cl-H1': 431 };
Object.keys(T61).forEach((k) => { const [id, b] = k.split(':'); ok(S[id].bde[b] === T61[k], `${id}: ${b} is not Klein’s ${T61[k]} kJ/mol`); });

/* entropy cards (Klein 6.3 and Figure 6.7) */
const DS = { s1: 1, s2: -1, s3: -1, s4: 1, s5: -1 };
vm.runInContext('this.__ds = ' + JSON.stringify(Object.keys(DS)), ctx);
ok(Chem.matches(S.da.after, S.da.smiles), 'da: the ring is not cyclohexene');
const dsPairs = { s1: [S.brLoss.before, S.brLoss.after], s2: [S.nWaterTbu.before, S.nWaterTbu.after], s3: [S.da.before, S.da.after], s4: [S.da.after, S.da.before], s5: [S.nCyclize.before, S.nCyclize.after] };
Object.keys(DS).forEach((k) => ok(App.dS(dsPairs[k][0], dsPairs[k][1]) === DS[k], `entropy card ${k}: the model gives ΔS ${App.dS(dsPairs[k][0], dsPairs[k][1])}`));
/* the ΔH, ΔS table */
const WHEN = { '-1,1': 0, '1,-1': 1, '-1,-1': 2, '1,1': 3 };
App.SIGNS.forEach((s) => ok(App.when(s[0], s[1]) === WHEN[s.join()], `favor: wrong answer for ΔH ${s[0]}, ΔS ${s[1]}`));
/* energy diagrams: peaks and valleys */
const kinds = (p) => { const k = Energy.kinds(SCENES.PROFILES[p]); return { ts: Object.values(k).filter((x) => x === 'ts').length, int: Object.values(k).filter((x) => x === 'int').length }; };
ok(kinds('f622').ts === 1 && kinds('f622').int === 0, 'f622: Klein Figure 6.22 has one transition state and no intermediate');
ok(kinds('f623').ts === 2 && kinds('f623').int === 1, 'f623: Klein Figure 6.23 has two transition states and one intermediate');
ok(kinds('f631').ts === 4 && kinds('f631').int === 3, 'f631: four steps need four peaks and three valleys');
ok(SCENES.PROFILES.f631.length === 2 * S.f631.length + 1, 'f631: profile points do not match the steps');
ok(SCENES.PROFILES.f623.length === 2 * S.f623.length + 1, 'f623: profile points do not match the steps');

/* ============================================================== Part 2 */

const k68 = { k8a: 'elec', k8b: 'nuc', k8c: 'elec', k8d: 'nuc', k8e: 'elec', k8f: 'nuc', k8g: 'nuc', k8h: 'nuc', k8i: 'elec', k8j: 'nuc',
  kWater: 'nuc', kMeOH: 'nuc', kHS: 'nuc', kAcetone: 'elec' };
App.SORT_IDS.forEach((id) => ok(App.roleOf(id) === k68[id], `sort: ${id} comes out ${App.roleOf(id)}, Klein says ${k68[id]}`));
const sb = Chem.centres(S.sb62.before);
ok(sb.nuc.length === 1 && sb.elec.length === 2, 'sb62: Klein SkillBuilder 6.2 has one nucleophilic and two electrophilic centres');
const p69 = Chem.centres(S.p69.before);
ok(p69.nuc.length === 1 && p69.elec.length === 1, 'p69: Klein 6.9 has one of each');
const pt = Chem.partials(S.ch3cl.before, 'C', 'X'), pl = Chem.partials(S.ch3li.before, 'C', 'X');
ok(pt.C === '+' && pl.C === '-', 'rich: CH3Cl must be δ+ at C and CH3Li δ− (Klein Figure 6.26)');
ok(App.PREDICT.poor.answer === 0, 'rich: the prediction key is not CH3Cl');
/* role figures in scenes: the nucleophile and electrophile they name are centres */
for (const [id, sc] of Object.entries(S)) {
  if (!sc.role) continue;
  const c = Chem.centres(sc.before);
  ok(c.nuc.indexOf(sc.role.nuc) >= 0, `${id}: ${sc.role.nuc} is not a nucleophilic centre`);
  ok(c.elec.indexOf(sc.role.elec) >= 0, `${id}: ${sc.role.elec} is not an electrophilic centre`);
}

/* ============================================================== Part 3 */

SCENES.RULES.forEach((r) => {
  const res = Chem.apply(S[r.scene].before, r.arrows);
  ok((r.id === 'rGood') === !res.err, `rules: ${r.id} comes out ${res.err || 'fine'}`);
});
for (const id of Object.keys(SCENES.SHIFT_KLEIN)) {
  const st = S[id].before;
  const plus = st.atoms.find((a) => Chem.isCation(st, a.id)).id;
  const b = Chem.bestShift(st, plus);
  ok((b ? b.kind : null) === SCENES.SHIFT_KLEIN[id], `${id}: the model shifts ${b ? b.kind : 'nothing'}, Klein ${SCENES.SHIFT_KLEIN[id]}`);
  const sh = SCENES.shiftScene(id);
  if (b) ok(sh && sh.patterns.join() === 'shift', `${id}: its shift animation is not a rearrangement`);
}
App.STEPS.filter((s) => s.id === 'rearrange')[0].mols.forEach((id) => ok(SCENES.SHIFT_KLEIN[id] !== undefined, `rearrange: ${id} has no Klein answer`));
ok(App.PREDICT.order3.answer === 0, 'stable: the key is not tertiary');
['cat0', 'cat1', 'cat2', 'cat3'].forEach((id, d) => {
  const st = S[id].before, c = st.atoms.find((a) => Chem.isCation(st, a.id)).id;
  ok(Chem.degree(st, c) === d, `${id}: not a degree-${d} carbocation`);
});

/* ============================================================== Part 4 */

SCENES.REVERSE.forEach((c) => ok(App.arrowFor(c) === c.klein, `reverse: ${c.id} gets ${App.arrowFor(c)}, Klein ${c.klein}`));

/* ================================================================ steps */

const kindsUsed = new Set(App.STEPS.map((s) => s.kind));
kindsUsed.forEach((k) => ok(typeof App.RENDER[k] === 'function', `no renderer for step kind ${k}`));
const ids = App.STEPS.map((s) => s.id);
ok(new Set(ids).size === ids.length, 'duplicate step ids');
App.STEPS.forEach((s) => {
  (s.scenes || []).forEach((x) => ok(S[x] && S[x].arrows && S[x].arrows.length, `${s.id}: scene ${x} has no arrows`));
  if (s.kind === 'draw') s.scenes.forEach((x) => ok(App.SAY[x], `${s.id}: ${x} has no sentence to say in words`));
});
Object.keys(App.SAY).forEach((k) => {
  const sp = App.SAY[k], words = sp[sp.length - 1];
  sp.slice(0, -1).filter((x) => typeof x === 'number').forEach((n) => ok(words[n], `say ${k}: blank ${n} has no word`));
});
Object.keys(App.PREDICT).forEach((k) => { const p = App.PREDICT[k]; ok(p.answer >= 0 && p.answer < p.choices.length, `prediction ${k}: bad key`); });
ok(App.STEPS[App.STEPS.length - 1].kind === 'results', 'the last step is not the results');
ok(typeof App.SCHEMA === 'number', 'no SCHEMA');

/* ================================================================ quiz */

let total = 0;
const seen = new Set();
const VOCAB_CORE = { A: ['a-break', 'a-favor'], B: ['b-nuc'], C: ['c-tail'], D: ['d-energy'] };
for (const k of Object.keys(QUIZZES)) {
  const Q = QUIZZES[k];
  total += Q.draw;
  const qids = Q.pool.map((q) => q.id);
  qids.forEach((id) => { ok(!seen.has(id), `quiz: duplicate id ${id}`); seen.add(id); });
  Q.core.forEach((id) => ok(qids.indexOf(id) >= 0, `${k}: core ${id} not in the pool`));
  (Q.pick || []).forEach((g) => g.forEach((id) => ok(qids.indexOf(id) >= 0, `${k}: pick ${id} not in the pool`)));
  ok(Q.core.length + (Q.pick || []).length <= Q.draw, `${k}: core and picks exceed draw`);
  ok(qids.length >= Q.draw + 4, `${k}: pool too small for a retry to differ`);
  VOCAB_CORE[k].forEach((id) => ok(Q.core.indexOf(id) >= 0, `${k}: vocabulary question ${id} is not core`));
  if (k === 'C' || k === 'D') {
    ok((Q.pick || []).some((g) => g.every((id) => Q.pool.find((q) => q.id === id).draw)), `${k}: no graded drawing in every attempt`);
    ok((Q.pick || []).some((g) => g.every((id) => { const q = Q.pool.find((x) => x.id === id); return q.check && (q.check.pattern || q.check.seq); })), `${k}: no pattern or sequence question in every attempt`);
  }
  /* a few draws: right size, no duplicates */
  for (let t = 0; t < 30; t++) {
    let seed = t * 7919 + 1;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const d = App.drawQuiz(Q, rand);
    ok(d.length === Q.draw && new Set(d).size === d.length, `${k}: a draw of ${d.length}`);
  }
  for (const q of Q.pool) {
    if (q.draw) {
      const sc = S[q.draw];
      ok(sc && sc.arrows.length && Judge.judge(sc, sc.arrows).ok, `${q.id}: graded drawing ${q.draw} has no working key`);
      ok(q.why, `${q.id}: no explanation`);
      continue;
    }
    ok(q.choices && q.choices.length >= 2 && q.why, `${q.id}: needs choices and an explanation`);
    if (typeof q.choices[0] === 'string') {
      ok(new Set(q.choices).size === q.choices.length, `${q.id}: duplicate choices`);
      const L0 = q.choices[0].length, longest = Math.max(...q.choices.slice(1).map((c) => c.length));
      if (!q.compact && L0 > longest + 4) fail(`${q.id}: the right answer is the longest choice (${L0} vs ${longest})`);
    }
    const c = q.check;
    if (!c) continue;
    if (c.pattern) ok(q.choices[0] === Chem.PATTERN[S[c.pattern].patterns[0]], `${q.id}: not the pattern of ${c.pattern}`);
    if (c.seq) {
      const want = S[c.seq].map((x) => Chem.PATTERN[x.patterns[0]]).join(', ');
      ok(q.choices[0].toLowerCase() === want.toLowerCase(), `${q.id}: sequence should be ${want}`);
      q.choices.slice(1).forEach((x) => ok(x.toLowerCase() !== want.toLowerCase(), `${q.id}: a wrong choice is also right`));
    }
    if (c.role) ok((c.role[1] === 'nuc' ? 'Nucleophile' : 'Electrophile') === q.choices[0] && App.roleOf(c.role[0]) === c.role[1], `${q.id}: role of ${c.role[0]}`);
    if (c.elecCount) ok(+q.choices[0] === Chem.centres(S[c.elecCount].before).elec.length, `${q.id}: electrophilic centres of ${c.elecCount}`);
    if (c.shift) {
      const a = App.shiftAnswer(c.shift);
      ok(q.choices[0] === ['Yes: a hydride shift', 'Yes: a methyl shift', 'No'][a], `${q.id}: shift of ${c.shift}`);
    }
    if (c.ints) ok(+q.choices[0] === kinds(c.ints).int, `${q.id}: intermediates in ${c.ints}`);
    if (c.steps) ok(/^One transition state, no intermediate/.test(q.choices[0]) === (S[c.steps].patterns.length === 2), `${q.id}: ${c.steps} is not one step`);
    if (c.rev) {
      const card = SCENES.REVERSE.find((x) => x.id === c.rev);
      ok(q.choices[0].indexOf(App.arrowFor(card) === 'eq' ? '⇌' : '→') === 0, `${q.id}: reaction arrow for ${c.rev}`);
    }
    if (c.rule) {
      q.choices.forEach((ch, i) => {
        const sc = S[ch.mech];
        const arr = ch.rule ? SCENES.RULES.find((r) => r.id === ch.rule).arrows : sc.arrows;
        ok(!!Chem.apply(sc.before, arr).err === (i === 0), `${q.id}: choice ${i} ${i === 0 ? 'breaks no rule' : 'breaks a rule'}`);
      });
    }
  }
}
ok(total === App.GRADED, 'GRADED does not match the checkpoints');
ok(total === 18, `${total} graded questions, the plan has 18`);
const poolSize = Object.values(QUIZZES).reduce((t, Q) => t + Q.pool.length, 0);
ok(poolSize >= 50, `pool of ${poolSize}`);

/* ========================================================= house rules */

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { if (f !== 'dist' && f !== 'node_modules') walk(p); }
    else if (/\.(js|html|css|md|xml|sh)$/.test(f)) files.push(p);
  }
})(root);
const DASH = new RegExp(String.fromCharCode(0x2014));
const BANNED = [/spontane/i, /rate equation/i, /rate constant/i, /\b(first|second|third)[- ]order\b/i, /Hammond/i, /catalys/i, /\bacceptor\b/i];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  text.split('\n').forEach((line, i) => {
    if (DASH.test(line)) fail(`em dash in ${path.relative(root, f)}:${i + 1}`);
    /* the left-out words are banned from what students see (src/), not from the notes */
    if (f.indexOf(src + path.sep) !== 0) return;
    BANNED.forEach((re) => { if (re.test(line)) fail(`"${line.match(re)[0]}" in ${path.relative(root, f)}:${i + 1}`); });
  });
}
/* the wording the teacher asked for */
const studentText = ['app.js', 'steps1.js', 'steps2.js', 'quiz.js'].map((f) => fs.readFileSync(path.join(src, 'js', f), 'utf8')).join('\n');
ok(/not thermodynamically favorable/.test(studentText) && /\bthermodynamically favorable/.test(studentText), 'never says (not) thermodynamically favorable');
ok(/exergonic/i.test(studentText) && /endergonic/i.test(studentText), 'never says exergonic and endergonic');
ok(App.BIG_IDEAS.some((t) => /Bond breaking is endothermic/.test(t) && /bond making is exothermic/.test(t)), 'Big ideas do not say bond breaking is endothermic and bond making exothermic');
['Nucleophilic attack', 'Loss of a leaving group', 'Proton transfer', 'Carbocation rearrangement'].forEach((p) => ok(App.VOCAB.some((v) => v[0] === p), `vocabulary has no ${p}`));

/* the manifest lists every file the page loads */
const manifest = fs.readFileSync(path.join(src, 'imsmanifest.xml'), 'utf8');
const html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const loaded = [...html.matchAll(/(?:src|href)="((?:js|css)\/[^"]+)"/g)].map((m) => m[1]);
loaded.forEach((f) => ok(manifest.indexOf(`href="${f}"`) >= 0, `manifest misses ${f}`));
fs.readdirSync(path.join(src, 'js')).forEach((f) => ok(loaded.indexOf('js/' + f) >= 0, `index.html does not load js/${f}`));
ok(order.every((f) => loaded.indexOf('js/' + f + '.js') >= 0), 'index.html misses a script');
ok(!/https?:\/\//.test(html.replace(/http:\/\/www\.(imsproject|adlnet|w3)\.org[^"]*/g, '')), 'index.html loads something from the network');
/* identifiers no other package uses */
/* every other package in the repository, wherever its class and topic folders put it */
let repo = root;
while (!fs.existsSync(path.join(repo, '.git')) && path.dirname(repo) !== repo) repo = path.dirname(repo);
const others = [];
(function find(d, depth) {
  if (depth > 4) return;
  for (const f of fs.readdirSync(d)) {
    if (f.startsWith('.') || f === 'node_modules') continue;
    const p = path.join(d, f);
    if (!fs.statSync(p).isDirectory()) continue;
    if (fs.existsSync(path.join(p, 'src', 'imsmanifest.xml'))) { if (p !== root) others.push(p); }
    else find(p, depth + 1);
  }
})(repo, 0);
ok(others.length >= 10, `found only ${others.length} other packages`);
const myId = manifest.match(/manifest identifier="([^"]+)"/)[1];
const myStore = fs.readFileSync(path.join(src, 'js', 'scorm.js'), 'utf8').match(/STORE = '([^']+)'/)[1];
ok(myStore === 'arrow-pushing-state', 'storage key');
others.forEach((d) => {
  const m = fs.readFileSync(path.join(d, 'src', 'imsmanifest.xml'), 'utf8');
  ok(m.indexOf('"' + myId + '"') < 0, `manifest identifier ${myId} is also used by ${d}`);
  const sj = path.join(d, 'src', 'js', 'scorm.js');
  if (fs.existsSync(sj)) ok(fs.readFileSync(sj, 'utf8').indexOf("'" + myStore + "'") < 0, `storage key also used by ${d}`);
});
ok(!/masteryscore/.test(manifest.replace(/<!--[\s\S]*?-->/g, '')), 'the manifest sets a masteryscore');

if (failures) { console.error(failures + ' failure(s).'); process.exit(1); }
console.log(`Validated: ${nSteps} mechanism steps, ${App.STEPS.length} steps, ${total} graded questions from a pool of ${poolSize}, ` +
  `${Object.keys(App.SAY).length} sentences, house rules.`);

/* tools/validate.js: checks the chemistry, the data and the item bank.
 *
 *   node tools/validate.js
 *
 * Fails when:
 * - an electron count, a polarity or a hydrogen-bond count disagrees with
 *   the textbook answer written below, or a melting point is not below its
 *   boiling point;
 * - any comparison the activity makes (a race, a prediction, a ranking, a
 *   checkpoint answer) is not decided by the class's rule (LDF < dipole-dipole
 *   < hydrogen bonding; then the number of hydrogen bonds; then electrons),
 *   or the real boiling points, and the melting points where both exist,
 *   disagree with it;
 * - helium is compared by anything but its boiling point, or with anything
 *   but neon;
 * - a checkpoint answer no longer matches the model, a pool is smaller than
 *   its draw, or a question id cannot be a SCORM interaction id;
 * - a question names a substance of more than one atom without drawing its
 *   Lewis structure (`figs`);
 * - a step that compares substances does not have students name the IMFs of
 *   each one first, a step offers fewer forces than one of its substances
 *   has, or the force checker accepts a wrong set of forces;
 * - a temperature quoted in a question or a step is not a real melting or
 *   boiling point in the data (or 25 °C, room temperature);
 * - student text uses a word outside the class's scope (van der Waals, the
 *   organic class names, "acceptor" instead of "receiver"), or any file
 *   contains an em dash.
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
const { SUBSTANCES, ELEMENTS, Chem, QUIZZES, IMF_LIST, App } = ctx;
const sub = (id) => Chem.sub(id);

/* ---------------------------------------------------------- substances */

/* the textbook answers, kept apart from the model so the two check each other */
const BOOK = {
  He: [2, 'ldf', 0], Ne: [10, 'ldf', 0], Ar: [18, 'ldf', 0], Kr: [36, 'ldf', 0], Xe: [54, 'ldf', 0],
  F2: [18, 'ldf', 0], Cl2: [34, 'ldf', 0], Br2: [70, 'ldf', 0], I2: [106, 'ldf', 0],
  HCl: [18, 'dipole', 0], C2H6: [18, 'ldf', 0], CH3F: [18, 'dipole', 0], CH3OH: [18, 'hbond', 1],
  CH4: [10, 'ldf', 0], NH3: [10, 'hbond', 1], H2O: [10, 'hbond', 2], HF: [10, 'hbond', 1],
  C4H10: [34, 'ldf', 0], acetone: [32, 'dipole', 0], ethanol: [26, 'hbond', 1], propanol: [34, 'hbond', 1], glycol: [34, 'hbond', 2]
};
Object.keys(SUBSTANCES).forEach((id) => {
  const x = sub(id), b = BOOK[id];
  if (!b) { bad(`${id}: no textbook answer to check against`); return; }
  if (x.electrons !== b[0]) bad(`${id}: ${x.electrons} electrons, textbook ${b[0]}`);
  if (x.imf !== b[1]) bad(`${id}: strongest force ${x.imf}, textbook ${b[1]}`);
  if (x.pairs !== b[2]) bad(`${id}: ${x.pairs} hydrogen bonds per molecule, textbook ${b[2]}`);
  if (x.mp != null && !(x.mp < x.bp)) bad(`${id}: melting point not below boiling point`);
  if (x.mp == null && id !== 'He') bad(`${id}: no melting point`);
  /* every atom has an octet (H a doublet), so the lone pairs are right */
  const s = SUBSTANCES[id];
  s.atoms.forEach((a, i) => {
    const bonds = s.bonds.reduce((n, bd) => n + (bd[0] === i || bd[1] === i ? bd[2] : 0), 0);
    const e = 2 * bonds + 2 * x.lp[i];
    const want = a[0] === 'H' || a[0] === 'He' ? 2 : 8;
    if (e !== want) bad(`${id}: atom ${i} (${a[0]}) has ${e} electrons around it`);
  });
});

/* ---------------------------------------------------------- comparisons */

function checkPair(w, l, where) {
  const c = Chem.compare(w, l);
  if (c.winner !== w) bad(`${where}: the class rule says ${c.winner || 'nothing'} beats ${w === c.winner ? l : w}, not ${w}`);
  else if (!Chem.dataAgrees(w, l)) bad(`${where}: real data disagree that ${w} beats ${l}`);
  if ((w === 'He' || l === 'He') && (w === 'He' ? l : w) !== 'Ne') bad(`${where}: helium compared with ${w === 'He' ? l : w}`);
}
function checkOrder(ids, where) {
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) checkPair(ids[j], ids[i], where);
}

App.STEPS.forEach((s) => {
  if (s.ids && s.ids.length > 1 && ['race', 'count', 'rank'].indexOf(s.kind) >= 0) {
    const order = s.ids.slice().sort((a, b) => sub(a).bp - sub(b).bp);
    checkOrder(order, s.id);
    /* the race must start below every boiling point and go past every one */
    order.forEach((id) => {
      if (!(s.minK < sub(id).bp && s.maxK > sub(id).bp + 1)) bad(`${s.id}: the thermometer does not cross ${id}'s boiling point`);
    });
  }
  if (s.kind === 'race' && s.ids.length === 1) {
    const x = sub(s.ids[0]);
    if (!(s.minK < (x.mp || x.bp) && s.maxK > x.bp)) bad(`${s.id}: the thermometer does not cover melting and boiling`);
  }
  if (s.kind === 'phases') {
    const order = s.ids.slice().sort((a, b) => sub(a).bp - sub(b).bp);
    checkOrder(order, s.id);
  }
  if (s.predict && App.PREDICT[s.predict] && App.PREDICT[s.predict].who) {
    const p = App.predictionFor(s.predict, s.ids);
    if (s.ids.indexOf(p.answerId) < 0) bad(`${s.id}: prediction key not among the substances`);
  }
  if (s.kind === 'draw') s.tasks.forEach((t, k) => {
    t.donor.forEach((m) => { if (!sub(s.mols[m].id).donors.length) bad(`${s.id} task ${k + 1}: donor ${s.mols[m].id} has no H to donate`); });
    t.receiver.forEach((m) => { if (!sub(s.mols[m].id).receivers.length) bad(`${s.id} task ${k + 1}: receiver ${s.mols[m].id} has no lone pair on N, O or F`); });
    const ok = t.donor.some((d) => t.receiver.some((r) => r !== d));
    if (!ok) bad(`${s.id} task ${k + 1}: no donor and receiver on different molecules`);
  });
});
if (sub('He').mp !== null) bad('helium was given a melting point');

/* naming the IMFs of each substance comes before every comparison */
const KEYS = ['ldf', 'dipole', 'hbond'];
App.STEPS.forEach((s) => {
  const names = s.kind === 'phases' || s.kind === 'count' || s.kind === 'rank' || (s.kind === 'race' && s.assign);
  if (s.kind === 'race' && s.ids.length > 1 && !s.assign) bad(`${s.id}: compares substances without naming their IMFs first`);
  if (!names) return;
  const offer = App.offered(s).map((f) => f[0]);
  s.ids.forEach((id) => {
    const f = Chem.forces(id);
    KEYS.forEach((k) => { if (f[k] && offer.indexOf(k) < 0) bad(`${s.id}: ${id} has ${k}, which the step does not offer`); });
    for (let m = 0; m < 8; m++) {
      const picks = { ldf: !!(m & 1), dipole: !!(m & 2), hbond: !!(m & 4) };
      const right = KEYS.every((k) => picks[k] === f[k]);
      const fb = Chem.forcesFeedback(id, picks);
      if (right && fb) bad(`${s.id}: the right forces for ${id} are refused: ${fb}`);
      if (!right && !fb) bad(`${s.id}: a wrong set of forces for ${id} is accepted (${JSON.stringify(picks)})`);
    }
  });
});
const forcesPhrase = { ldf: 'only LDF', dipole: 'dipole-dipole forces and LDF', hbond: 'hydrogen bonding, dipole-dipole forces and LDF' };

/* ---------------------------------------------------------- questions */

const allIds = new Set();
const disp = (id) => sub(id).text;
const nameOf = (id) => sub(id).name;
const starts = (txt, id) => txt.indexOf(disp(id)) === 0 || txt.toLowerCase().indexOf(nameOf(id).toLowerCase()) === 0;
Object.keys(QUIZZES).forEach((k) => {
  const Q = QUIZZES[k];
  if (Q.pool.length < Q.draw) bad(`${k}: pool smaller than draw`);
  Q.core.forEach((id) => { if (!Q.pool.some((q) => q.id === id)) bad(`${k}: core ${id} not in pool`); });
  Q.pool.forEach((q) => {
    if (allIds.has(q.id)) bad(`duplicate question id ${q.id}`);
    allIds.add(q.id);
    if (!/^[a-z0-9-]{1,40}$/.test(q.id)) bad(`${q.id}: not a safe SCORM interaction id`);
    if (new Set(q.choices).size !== q.choices.length) bad(`${q.id}: duplicate choices`);
    if (q.choices.length < 3) bad(`${q.id}: fewer than 3 choices`);
    const first = q.choices[0];
    /* the Lewis structure of every substance of more than one atom it names */
    (q.figs || []).forEach((id) => { if (!SUBSTANCES[id]) bad(`${q.id}: figure of unknown ${id}`); });
    const named = new Set();
    (q.fact || []).slice(1).forEach((v) => [].concat(v).forEach((id) => { if (SUBSTANCES[id]) named.add(id); }));
    Object.keys(SUBSTANCES).forEach((id) => {
      const x = sub(id);
      if (q.q.indexOf(x.text) >= 0 || new RegExp('\\b' + x.name + '\\b', 'i').test(q.q)) named.add(id);
    });
    named.forEach((id) => {
      if (SUBSTANCES[id].atoms.length > 1 && (q.figs || []).indexOf(id) < 0) bad(`${q.id}: names ${id} but does not draw it`);
    });
    if (!q.fact) {
      if (/\b(boils?|boiling point) (higher|lower)|higher boiling point|stronger (London|intermolecular|forces)/i.test(q.q) &&
          !/order of strength|evaporates|what lets|do before you predict/i.test(q.q)) bad(`${q.id}: compares substances but has no fact`);
      return;
    }
    const [kind, a, b] = q.fact;
    if (kind === 'stronger') { checkPair(a, b, q.id); if (!starts(first, a)) bad(`${q.id}: answer does not start with ${a}`); }
    else if (kind === 'weaker') { checkPair(b, a, q.id); if (!starts(first, a)) bad(`${q.id}: answer does not start with ${a}`); }
    else if (kind === 'rank') { checkOrder(a, q.id); if (first !== a.map(disp).join(' < ')) bad(`${q.id}: answer is not ${a.map(disp).join(' < ')}`); }
    else if (kind === 'imf') { if (first !== IMF_LIST[sub(a).imf]) bad(`${q.id}: ${a} has ${sub(a).imf}, answer "${first}"`); }
    else if (kind === 'imfPair') {
      const want = disp(a) + ': ' + forcesPhrase[sub(a).imf] + '. ' + disp(b) + ': ' + forcesPhrase[sub(b).imf];
      if (first !== want) bad(`${q.id}: answer should be "${want}"`);
    }
    else if (kind === 'pairs') { if (first !== String(sub(a).pairs)) bad(`${q.id}: ${a} makes ${sub(a).pairs}, answer ${first}`); }
    else if (kind === 'electrons') { if (first !== String(sub(a).electrons)) bad(`${q.id}: ${a} has ${sub(a).electrons} electrons`); }
    else if (kind === 'phase') { if (first.toLowerCase() !== Chem.phaseAt(a, b)) bad(`${q.id}: ${a} is ${Chem.phaseAt(a, b)} at ${b} K`); }
    else if (kind === 'dEN') { const d = Math.abs(ELEMENTS[a].en - ELEMENTS[b].en).toFixed(2); if (first !== d) bad(`${q.id}: ${a}–${b} difference is ${d}`); }
    else if (kind === 'mostPositiveH') {
      const els = q.choices.map((c) => (c.match(/H–([A-Z][a-z]?)/) || [])[1]);
      const best = els.slice().sort((x, y) => ELEMENTS[y].en - ELEMENTS[x].en)[0];
      if (els[0] !== best) bad(`${q.id}: the most δ+ H is on ${best}`);
    } else if (kind === 'donorOnly') {
      const can = a.map((id) => sub(id).donors.length > 0);
      if (!can[0] || can.slice(1).some(Boolean)) bad(`${q.id}: not exactly the first one can donate`);
      if (!starts(first, a[0])) bad(`${q.id}: answer is not ${a[0]}`);
    } else bad(`${q.id}: unknown fact ${kind}`);
  });
});

/* ---------------------------------------------------------- temperatures */

const real = new Set(['25 °C']);
Object.keys(SUBSTANCES).forEach((id) => {
  const x = sub(id);
  [x.mp, x.bp].forEach((K) => { if (K != null) real.add(Chem.fmtC(K)); });
});
const texts = [fs.readFileSync(path.join(src, 'js', 'quiz.js'), 'utf8'),
  App.STEPS.map((s) => (s.text || '') + ' ' + (s.title || '')).join(' ')].join('\n');
const quoted = [...texts.matchAll(/(−?\d+(?:\.\d)?) °C/g)].map((m) => m[1] + ' °C');
/* the thermometer's own start and end temperatures are allowed in step text */
App.STEPS.forEach((s) => { ['minK', 'maxK', 'startK'].forEach((k) => { if (s[k] != null) real.add(Chem.fmtC(s[k])); }); });
quoted.forEach((t) => { if (!real.has(t)) bad(`quoted temperature ${t} is not a real melting or boiling point in the data`); });

/* ---------------------------------------------------------- words */

function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) { if (d.name !== 'dist') walk(p, out); }
    else if (/\.(js|html|css|md|xml|sh)$/.test(d.name)) out.push(p);
  });
  return out;
}
walk(root, []).forEach((f) => {
  if (fs.readFileSync(f, 'utf8').indexOf('\u2014') >= 0) bad(`${path.relative(root, f)}: contains an em dash`);
});
const student = ['app.js', 'quiz.js', 'data.js'].map((f) => fs.readFileSync(path.join(src, 'js', f), 'utf8')).join('\n');
[/van der waals/i, /\balcohol/i, /hydroxyl/i, /carbonyl/i, /ketone/i, /aldehyde/i, /\bether\b/i, /functional group/i,
 /\balkane/i, /acceptor/i, /contact area/i, /surface area/i, /dipole moment/i].forEach((re) => {
  if (re.test(student)) bad(`student text uses ${re}`);
});

/* ---------------------------------------------------------- report */

const pool = Object.keys(QUIZZES).reduce((n, k) => n + QUIZZES[k].pool.length, 0);
if (problems.length) {
  console.error(problems.length + ' problem(s):\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`${Object.keys(SUBSTANCES).length} substances, ${App.STEPS.length} steps, ${pool} questions (${App.GRADED} graded per attempt), ` +
  `${quoted.length} quoted temperatures, every one real.`);
console.log('All checks passed.');

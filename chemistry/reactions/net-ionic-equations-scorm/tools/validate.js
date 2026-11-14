/* tools/validate.js: checks the activity without a browser. Must pass before
 * every commit.
 *
 *   node tools/validate.js
 *
 * - house rules: no em dashes, relative paths, manifest lists every file,
 *   its own SCORM identifiers and save key, Submit answer on graded choices
 * - shared code: chem.js, bench.js, util.js and scorm.js are the balancing
 *   packages' files; ions.js and particles.js are package 3's (one set of
 *   solubility rules for the whole unit)
 * - scope (the teacher's): every reactant is a strong electrolyte (a soluble
 *   salt, HCl, HBr, HI, HNO3, H2SO4, LiOH, NaOH, KOH or Ba(OH)2); no weak
 *   acid or base, no gas, anywhere; water written HOH; no "slightly soluble"
 * - the model: every problem the generator can make is balanced again by
 *   brute force; its complete and net ionic equations conserve atoms and
 *   charge; spectators are the same on both sides; the net ionic equation is
 *   in lowest terms and empty exactly when no solid and no water form; every
 *   state agrees with the solubility rules typed again here
 * - sizes: every sphere the beaker draws is the table's radius (Shannon,
 *   covalent), and every beaker is neutral before and after, its solid in the
 *   formula's ratio
 * - the sets: 400 seeds give 8 problems (3 solid, 2 water with one to reduce,
 *   2 no reaction, the challenge last), never a lesson reaction, never
 *   opening with no reaction; 4 questions whose choices are distinct
 */
const fs = require('fs');
const path = require('path');
const { load, scripts, SRC } = require('./load');

const ROOT = path.join(__dirname, '..');
const errors = [];
const fail = (m) => errors.push(m);
const A = load();
const { Chem, Ions, Net, Gen, Data, App } = A;

/* ------------------------------------------------------------ house rules */
function walk(d) {
  return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return e.name === 'dist' || e.name === 'node_modules' ? [] : walk(p);
    return [p];
  });
}
const textFiles = walk(ROOT).filter((f) => /\.(js|html|css|xml|md|sh)$/.test(f));
textFiles.forEach((f) => { if (fs.readFileSync(f, 'utf8').indexOf('\u2014') >= 0) fail('em dash in ' + path.relative(ROOT, f)); });
/* this package's own files (the shared ones are checked by their own packages) */
const OWN = ['config', 'data', 'net', 'problems', 'ref', 'beaker', 'ladder', 'steps', 'app'].map((f) => path.join(SRC, 'js', f + '.js'))
  .concat([path.join(SRC, 'index.html'), path.join(SRC, 'css', 'styles.css')]);
const srcText = OWN.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
[/slightly soluble/i, /electrolyte/i, /H₂O/, /H3O\+|H₃O|hydronium/i, /CH3COOH|acetic acid/i, /\bHF\b/, /H2CO3|H3PO4|NH3\b/, /spontaneous/i].forEach((re) => {
  if (re.test(srcText)) fail('banned word or formula in src/: ' + re);
});
const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
if (/(src|href)="\//.test(html)) fail('index.html has an absolute path');
const manifest = fs.readFileSync(path.join(SRC, 'imsmanifest.xml'), 'utf8');
scripts().forEach((f) => { if (manifest.indexOf('href="' + f + '"') < 0) fail('manifest is missing ' + f); });
(manifest.match(/file href="([^"]+)"/g) || []).forEach((m) => {
  const f = m.slice(11, -1);
  if (!fs.existsSync(path.join(SRC, f))) fail('manifest lists a missing file ' + f);
});
if (!/identifier="NETIONIC_MANIFEST"/.test(manifest) || /PREDPROD|BALPART|BALTYPES/.test(manifest)) fail('manifest identifiers are not this package\'s own');
if (A.CONFIG.store !== 'net-ionic-equations-state') fail('save key is not this package\'s own');
if (typeof App.SCHEMA !== 'number') fail('no SCHEMA in app.js');
const steps = fs.readFileSync(path.join(SRC, 'js', 'steps.js'), 'utf8');
if (steps.indexOf("class: 'primary submit-answer'") < 0) fail('graded questions have no Submit answer button');

/* ------------------------------------------------------------ shared code */
const same = (a, b) => fs.readFileSync(a, 'utf8') === fs.readFileSync(b, 'utf8');
['chem.js', 'bench.js', 'util.js', 'scorm.js'].forEach((f) => {
  if (!same(path.join(SRC, 'js', f), path.join(ROOT, '..', 'balancing-particles-scorm', 'src', 'js', f))) fail(f + ' differs from balancing-particles-scorm');
});
['ions.js', 'particles.js'].forEach((f) => {
  if (!same(path.join(SRC, 'js', f), path.join(ROOT, '..', 'predicting-products-scorm', 'src', 'js', f))) fail(f + ' differs from predicting-products-scorm');
});

/* ------------------------------------------------- the solubility rules, typed again */
const G1 = ['Li', 'Na', 'K'];
function solubleAgain(c, a) {
  if (c === 'H' || G1.includes(c)) return true;
  if (a === 'NO3') return true;
  if (['Cl', 'Br', 'I'].includes(a)) return !['Ag', 'Pb'].includes(c);
  if (a === 'SO4') return !['Ca', 'Sr', 'Ba', 'Pb', 'Ag'].includes(c);
  if (a === 'OH') return c === 'Ba';
  if (a === 'CO3' || a === 'PO4') return false;
  throw new Error('no rule for ' + c + ' ' + a);
}
const STRONG = ['HCl', 'HBr', 'HI', 'HNO3', 'H2SO4', 'LiOH', 'NaOH', 'KOH', 'Ba(OH)2'];

/* ------------------------------------------------------------ the model */
function atoms(terms) {
  const out = {};
  terms.forEach((t) => {
    const f = t.t === 'ion' ? (t.key === 'H' ? 'H' : Net.ionSym(t.key, t.q > 0)) : t.f;
    const c = Chem.parse(f);
    Object.keys(c).forEach((e) => { out[e] = (out[e] || 0) + c[e] * t.n; });
  });
  return JSON.stringify(Object.keys(out).sort().map((k) => k + out[k]));
}
const charge = (terms) => terms.reduce((s, t) => s + (t.t === 'ion' ? t.q * t.n : 0), 0);
function brute(rx) {
  const sp = rx.l.concat(rx.r), n = sp.length, c = sp.map(Chem.parse);
  const els = Chem.elements(rx);
  for (let k = 0; k < Math.pow(8, n); k++) {
    const co = []; let x = k;
    for (let i = 0; i < n; i++) { co.push(x % 8 + 1); x = Math.floor(x / 8); }
    if (els.every((e) => sp.reduce((s, f, i) => s + (i < rx.l.length ? 1 : -1) * co[i] * (c[i][e] || 0), 0) === 0)) return co;
  }
  return null;
}
function checkProblem(p, where) {
  const tag = where + ' ' + p.id;
  p.l.forEach((f) => {
    if (!Net.reactantOK(f)) fail(tag + ': reactant ' + f + ' is not a strong electrolyte');
    const pr = Net.partsOf(f);
    if (pr.cat === 'H' || pr.an === 'OH') { if (!STRONG.includes(f)) fail(tag + ': ' + f + ' is not one of the strong acids and bases'); }
    else if (!solubleAgain(pr.cat, pr.an)) fail(tag + ': reactant ' + f + ' is not soluble');
  });
  p.r.forEach((f) => {
    const pr = Net.partsOf(f);
    if (f !== 'H2O' && pr.cat === 'H' && !['Cl', 'Br', 'I', 'NO3', 'SO4'].includes(pr.an)) fail(tag + ': makes a weak acid ' + f);
    const want = f === 'H2O' ? 'l' : solubleAgain(pr.cat, pr.an) ? 'aq' : 's';
    if (p.states[f] !== want) fail(tag + ': state of ' + f + ' is ' + p.states[f] + ', the rules say ' + want);
  });
  const b = brute(p.rx);
  if (!b || b.join() !== p.coefs.join()) fail(tag + ': coefficients ' + p.coefs + ', brute force ' + b);
  const L = p.ionic.left, R = p.ionic.right;
  if (atoms(L) !== atoms(R)) fail(tag + ': complete ionic equation does not conserve atoms');
  if (charge(L) !== 0 || charge(R) !== 0) fail(tag + ': complete ionic equation is not neutral on each side');
  p.spect.forEach((k) => {
    const a = L.find((t) => t.key === k), c = R.find((t) => t.t === 'ion' && t.key === k);
    if (!a || !c || a.n !== c.n) fail(tag + ': spectator ' + k + ' is not the same on both sides');
  });
  R.filter((t) => t.t === 'ion').forEach((t) => { if (!p.spect.includes(t.key)) fail(tag + ': ion ' + t.key + ' on the product side is not a spectator'); });
  const forms = p.solids.length > 0 || p.water;
  if (!!p.net !== forms) fail(tag + ': net ionic equation ' + (p.net ? 'exists' : 'is missing') + ' but a solid or water ' + (forms ? 'forms' : 'does not form'));
  if (p.net) {
    const nl = p.net.left, nr = p.net.right;
    if (atoms(nl) !== atoms(nr)) fail(tag + ': net ionic equation does not conserve atoms');
    if (charge(nl) !== charge(nr)) fail(tag + ': net ionic equation does not conserve charge');
    if (nl.concat(nr).reduce((g, t) => Chem.gcd(g, t.n), 0) !== 1) fail(tag + ': net ionic equation not in lowest terms');
    nl.concat(nr).forEach((t) => { if (t.t === 'ion' && p.spect.includes(t.key)) fail(tag + ': a spectator is in the net ionic equation'); });
    if (p.water && !(nl.some((t) => t.key === 'H') && nl.some((t) => t.key === 'OH') && nr.some((t) => t.f === 'H2O'))) fail(tag + ': water forms but the net ionic equation has no H+ + OH- -> HOH');
  }
  if (/H₂O/.test(Net.molecularText(p) + Net.ionicText(p) + Net.netText(p))) fail(tag + ': water not written HOH');
  /* the beaker */
  const bk = Net.beaker(p);
  const sum = (list) => list.reduce((s, t) => s + t.q * t.n, 0);
  if (sum(bk.a) !== 0 || sum(bk.b) !== 0) fail(tag + ': a solution in the beaker is not neutral');
  const have = {};
  bk.a.concat(bk.b).forEach((t) => { have[t.key] = (have[t.key] || 0) + t.n; });
  const total = Object.values(have).reduce((s, n) => s + n, 0);
  if (total > 26) fail(tag + ': ' + total + ' ions in the beaker');
  bk.solids.forEach((sd) => {
    const r = Ions.ratio(sd.cat, sd.an);
    if (sd.nc !== r[0] || sd.na !== r[1]) fail(tag + ': solid not in the formula ratio');
    have[sd.cat] -= sd.units * sd.nc; have[sd.an] -= sd.units * sd.na;
  });
  if (bk.water) { have.H -= bk.water; have.OH -= bk.water; }
  Object.keys(have).forEach((k) => { if (have[k] < 0) fail(tag + ': the beaker runs out of ' + k); });
  const left = Object.keys(have).reduce((s, k) => s + have[k] * (k === 'H' ? 1 : Ions.CATIONS[k] ? Ions.CATIONS[k][1] : -Ions.ANIONS[k][1]), 0);
  if (left !== 0) fail(tag + ': the free ions left after the reaction are not neutral');
  const reacted = Object.keys(have).filter((k) => have[k] === 0);
  /* exactly the non-spectators are used up */
  p.ionic.left.forEach((t) => {
    const used = have[t.key] === 0;
    if (used === p.spect.includes(t.key)) fail(tag + ': in the beaker ' + t.key + (used ? ' is used up but is a spectator' : ' is left over but is not a spectator'));
  });
  void reacted;
}

const P = Gen.pools();
Object.keys(P).forEach((k) => {
  if (P[k].length < (k === 'water' ? 10 : 30)) fail('pool ' + k + ' has only ' + P[k].length);
  P[k].forEach((p) => { checkProblem(p, 'pool ' + k); if (p.kind !== k) fail('pool ' + k + ' holds a ' + p.kind + ' problem ' + p.id); if (Gen.SEEN[Gen.key(p.l)]) fail('a lesson reaction is in pool ' + k + ': ' + p.id); });
});
const ch = Net.make(Gen.CHALLENGE[0], Gen.CHALLENGE[1]);
checkProblem(ch, 'challenge');
if (ch.kind !== 'both' || ch.spect.length) fail('the challenge is not a solid and water with no spectators');

/* the lesson */
const L = Gen.LESSON;
[['solid', 'solid'], ['water', 'water'], ['none', 'none'], ['exSolid', 'solid'], ['exWater', 'water'], ['exNone', 'none']].forEach(([k, kind]) => {
  const p = Net.make(L[k][0], L[k][1]);
  checkProblem(p, 'lesson ' + k);
  if (p.kind !== kind) fail('lesson ' + k + ' is ' + p.kind + ', not ' + kind);
});
if (!Gen.reduces(Net.make(L.exWater[0], L.exWater[1]))) fail('the lesson\'s water problem does not need reducing');
L.aq.forEach((f) => { if (Net.state(f) === 'aq' && !Net.reactantOK(f)) fail('lesson picture ' + f + ' is not a strong electrolyte'); });
if (Net.state(L.aq[2]) !== 's') fail('the third picture card should be a solid');
L.split.forEach(([f, n]) => { if (f !== 'H2O' && Net.state(f) === 'aq' && !Net.reactantOK(f)) fail('split card ' + f + ' is not a soluble salt, strong acid or strong base'); });

/* ------------------------------------------------------------ sizes */
const T = Data;
function sizeCheck(key) {
  const sh = T.shape(key);
  sh.atoms.forEach((a, i) => {
    let want;
    if (key === 'HOH') want = a.el === 'O' ? 140 : 31;           /* water: the usual 140 pm molecule, H at its covalent radius as in OH- */
    else if (a.el === 'H') want = T.COVALENT.H;
    else if (sh.atoms.length === 1) want = T.IONIC[key];
    else if (key === 'OH') want = T.IONIC.OH;
    else if (a.el === 'O') want = T.IONIC.O;
    else want = T.COVALENT[a.el];
    if (a.r !== want) fail('size of ' + key + ' atom ' + i + ' (' + a.el + ') is ' + a.r + ' pm, the table says ' + want);
    if (key !== 'HOH' && i && sh.atoms.length > 1 && a.el !== 'H' && Math.abs(Math.hypot(a.x, a.y) - (key === 'SO4' || key === 'PO4' ? 0.816 : 1) * T.BOND[key]) > 0.5 && a.el === 'O') fail('bond length in ' + key);
  });
}
Net.CATS.concat(Net.ANS, ['H', 'HOH']).forEach(sizeCheck);
/* water drawn as the bent covalent molecule, the H atoms standing out from the O */
(() => {
  const w = T.shape('HOH').atoms, hs = w.filter((a) => a.el === 'H'), o = w.find((a) => a.el === 'O');
  if (w[0].el !== 'O') fail('water: the H atoms should be drawn in front of the O');
  const ang = Math.acos((hs[0].x * hs[1].x + hs[0].y * hs[1].y) / (Math.hypot(hs[0].x, hs[0].y) * Math.hypot(hs[1].x, hs[1].y))) * 180 / Math.PI;
  if (Math.abs(ang - 104.5) > 0.1) fail('water is not bent at 104.5 degrees: ' + ang);
  hs.forEach((a) => { if (Math.hypot(a.x, a.y) + a.r <= o.r + 20) fail('water: an H atom does not stand out from the O'); });
  /* H+ joining OH- must not change the size of the H (the teacher) */
  const ohH = T.shape('OH').atoms.find((a) => a.el === 'H');
  if (hs.some((a) => a.r !== ohH.r) || T.shape('H').atoms[0].r !== ohH.r) fail('water: its H atoms are not the size of the H in OH- and of H+');
})();
const SHANNON = { Li: 76, Na: 102, K: 138, Ag: 115, Mg: 72, Ca: 100, Sr: 118, Ba: 135, Zn: 74, Fe: 78, Pb: 119, Cu: 73, Al: 53.5, Cl: 181, Br: 196, I: 220, OH: 137, O: 140 };
Object.keys(SHANNON).forEach((k) => { if (T.IONIC[k] !== SHANNON[k]) fail('ionic radius of ' + k + ' is not Shannon\'s ' + SHANNON[k]); });
if (!/Shannon/.test(fs.readFileSync(path.join(SRC, 'js', 'data.js'), 'utf8'))) fail('data.js does not name its source');

/* ------------------------------------------------------------ the sets */
const kinds = {};
for (let seed = 1; seed <= 400; seed++) {
  const set = Gen.set(seed * 7919);
  const tag = 'seed ' + seed;
  if (set.length !== Gen.COUNT) { fail(tag + ': ' + set.length + ' problems'); continue; }
  const count = { solid: 0, water: 0, none: 0, both: 0 };
  set.forEach((p) => { count[p.kind]++; checkProblem(p, tag); if (p.rungs.join() !== Gen.RUNGS.join()) fail(tag + ': a problem has other steps'); if (Gen.SEEN[Gen.key(p.l)]) fail(tag + ': lesson reaction ' + p.id); });
  if (count.solid !== 3 || count.water !== 2 || count.none !== 2 || count.both !== 1) fail(tag + ': kinds ' + JSON.stringify(count));
  if (set[0].kind === 'none') fail(tag + ': opens with no reaction');
  if (Gen.key(set[7].l) !== Gen.key(Gen.CHALLENGE)) fail(tag + ': the challenge is not last');
  if (set.filter((p) => p.kind === 'water' && Gen.reduces(p)).length !== 1) fail(tag + ': not exactly one water problem to reduce');
  if (new Set(set.map((p) => Gen.key(p.l))).size !== 8) fail(tag + ': a problem twice');
  const solidAn = set.filter((p) => p.kind === 'solid').map((p) => Net.partsOf(p.solids[0]).an);
  if (new Set(solidAn).size !== 3) fail(tag + ': two solids of the same kind');
  const qs = Gen.quiz(seed * 7919);
  if (qs.length !== Gen.QUIZ) fail(tag + ': ' + qs.length + ' questions');
  qs.forEach((q) => {
    if (!(q.right >= 0 && q.right < q.choices.length)) fail(tag + ' ' + q.id + ': no right answer');
    if (new Set(q.choices).size !== q.choices.length) fail(tag + ' ' + q.id + ': two choices the same: ' + q.choices.join(' | '));
    if (/\u2014/.test(q.stem + q.choices.join('') + q.why)) fail(tag + ': em dash in a question');
    kinds[q.kind] = (kinds[q.kind] || 0) + 1;
    const m = /^(spect|net|what)-(.*)$/.exec(q.id);
    if (m) {
      const l = m[2].split('+');
      if (set.some((p) => Gen.key(p.l) === Gen.key(l))) fail(tag + ' ' + q.id + ': a question is one of the graded problems');
      if (Gen.SEEN[Gen.key(l)]) fail(tag + ' ' + q.id + ': a question is a lesson reaction');
      const p = Net.make(l[0], l[1]);
      if (q.kind === 'net' && q.choices[q.right] !== Net.netText(p)) fail(tag + ' ' + q.id + ': the right choice is not the net ionic equation');
      if (q.kind === 'spect' && q.choices[q.right] !== Net.spectText(p)) fail(tag + ' ' + q.id + ': the right choice is not the spectators');
    }
  });
}
['pic', 'spect', 'net', 'what'].forEach((k) => { if (kinds[k] !== 400) fail('question kind ' + k + ' appears ' + (kinds[k] || 0) + ' times in 400 sets'); });

/* ------------------------------------------------------------ report */
if (errors.length) {
  console.log(errors.length + ' problem(s):\n  ' + Array.from(new Set(errors)).slice(0, 60).join('\n  '));
  process.exit(1);
}
console.log('OK: pools ' + P.solid.length + ' solid, ' + P.water.length + ' water, ' + P.none.length + ' no reaction; every problem checked; 400 sets and question sets checked; sizes match the tables.');

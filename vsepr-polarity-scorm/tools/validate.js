/* tools/validate.js: checks the chemistry and the item bank.
 *
 *   node tools/validate.js
 *
 * Fails when:
 * - the 5-rule engine disagrees with a species' hand-written key, or the first
 *   atom written (not H) is not the least electronegative;
 * - a species is out of scope (more than 6 domains, or a lone pair with
 *   anything but 4 domains);
 * - a 3D model's angles are not the ideal ones (or, for NH3 and H2O, the
 *   measured ones), an angle label disagrees with the angle it marks, or a
 *   molecule with lone pairs and no measured angle would be drawn in 3D;
 * - the model calls a molecule polar or nonpolar against the textbook;
 * - a checkpoint answer, a prediction's key or a sorting bin no longer matches
 *   the model; a pool is smaller than its draw; a question id cannot be a
 *   SCORM interaction id;
 * - a question quotes a measured angle, a shape name or a word outside the
 *   class's scope appears in student text, or any file contains an em dash.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src');
const problems = [];
const bad = (m) => problems.push(m);

/* load the page's scripts with just enough of a browser to define them */
const ctx = {
  console, Math, JSON, Object, Array, String, Number, Error, isNaN, parseInt, Date, RegExp, URLSearchParams,
  window: { matchMedia: () => ({ matches: false }), addEventListener() {} },
  document: { addEventListener() {}, documentElement: {} },
  getComputedStyle: () => ({ getPropertyValue: () => '' })
};
vm.createContext(ctx);
const html = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
for (const f of scripts) {
  /* top-level var and function declarations land on the context */
  vm.runInContext(fs.readFileSync(path.join(src, f), 'utf8'), ctx, { filename: f });
}
const { SPECIES, MEASURED_ANGLE, ELEMENTS, Lewis, VSEPR, QUIZZES, App } = ctx;
const V = VSEPR.V;

/* ---------------------------------------------------------- species */

Object.keys(SPECIES).forEach((id) => {
  const sp = Lewis.species(id), key = SPECIES[id].key, r = Lewis.solve(sp), s = r.s5;
  if (r.total !== key.e) bad(`${id}: Rule 1 gives ${r.total} electrons, key says ${key.e}`);
  const bo = Lewis.DIRS.filter((d) => Lewis.has(s, d)).map((d) => s.bo[d]).sort((a, b) => b - a).join('');
  if (bo !== key.bo) bad(`${id}: bond orders ${bo}, key says ${key.bo}`);
  if ((s.lp.C || 0) !== key.clp) bad(`${id}: ${s.lp.C} lone pairs on the central atom, key says ${key.clp}`);
  const others = sp.parts.filter((p) => p.el !== 'H' && p.el !== sp.center);
  others.forEach((p) => { if (ELEMENTS[p.el].en < ELEMENTS[sp.center].en) bad(`${id}: ${p.el} is less electronegative than the central ${sp.center}`); });
  const acc = Lewis.accepted(s, sp);
  if (!acc.ok) bad(`${id}: the engine's own structure is not accepted (${acc.problems.join(', ')})`);
  const i = VSEPR.info(id);
  if (!i.inScope) bad(`${id}: out of scope (${i.domains} domains, ${i.lp} lone pairs)`);
  if (i.lp && i.domains !== 4) bad(`${id}: lone pairs with ${i.domains} domains`);
  if (i.domains > 6) bad(`${id}: more than 6 domains`);
});

/* ---------------------------------------------------------- 3D models */

const IDEAL = { 2: [180], 3: [120], 4: [109.47], 5: [90, 120, 180], 6: [90, 180] };
const near = (a, b, tol) => Math.abs(a - b) <= (tol || 0.3);

function check3D(id) {
  const i = VSEPR.info(id);
  if (i.lp && !MEASURED_ANGLE[id]) { bad(`${id}: drawn in 3D with lone pairs but has no measured angle`); return; }
  const m = VSEPR.model3D(id);
  const angs = [];
  for (let a = 1; a < m.atoms.length; a++) for (let b = a + 1; b < m.atoms.length; b++) angs.push(V.angle(m.atoms[a].p, m.atoms[b].p));
  if (!i.lp) {
    angs.forEach((x) => { if (!IDEAL[i.domains].some((y) => near(x, y))) bad(`${id}: bond angle ${x.toFixed(1)} is not ideal for ${i.domains} domains`); });
  } else {
    angs.forEach((x) => { if (!near(x, MEASURED_ANGLE[id], 0.05)) bad(`${id}: bond angle ${x.toFixed(2)}, measured ${MEASURED_ANGLE[id]}`); });
    const lp = m.lps.map((l) => l.dir);
    if (lp.length !== i.lp) bad(`${id}: ${lp.length} lone-pair lobes for ${i.lp} lone pairs`);
  }
  m.arcs.forEach((arc) => {
    const x = V.angle(m.atoms[arc.i].p, m.atoms[arc.j].p);
    if (arc.label === '<109.5°') { if (!(x < 109.4 && x > 105)) bad(`${id}: "<109.5°" marks ${x.toFixed(1)}`); }
    else if (arc.label === '<<109.5°') { if (!(x < MEASURED_ANGLE.NH3)) bad(`${id}: "<<109.5°" marks ${x.toFixed(1)}, not below NH3`); }
    else if (!near(x, parseFloat(arc.label), 0.6)) bad(`${id}: arc labelled ${arc.label} marks ${x.toFixed(1)}`);
  });
  const outer = new Set(m.atoms.slice(1).map((a) => a.el));
  if (outer.size > 1 && m.arcs.length) bad(`${id}: angle arcs on a molecule with different outer atoms`);
  if (outer.size === 1 && !m.arcs.length) bad(`${id}: no angle arc`);
}

/* every molecule the steps draw in 3D */
const drawn3D = new Set();
App.STEPS.forEach((s) => {
  if (s.kind === 'flat' || s.kind === 'build') drawn3D.add(s.sp);
  ['set', 'look'].forEach((k) => (s[k] || []).forEach((id) => { if (s.kind !== 'field') drawn3D.add(id); }));
  if (s.kind === 'field') s.set.forEach((id) => { if (!SPECIES[id]) bad(`field: unknown ${id}`); });
  if (s.sp && !SPECIES[s.sp]) bad(`${s.id}: unknown species ${s.sp}`);
});
drawn3D.forEach(check3D);
/* and every 3D model at all, for the teacher's explore page */
Object.keys(SPECIES).forEach((id) => { if (!VSEPR.info(id).lp || MEASURED_ANGLE[id]) check3D(id); });

/* measured angles: lone pairs squeeze, two more than one */
if (!(MEASURED_ANGLE.NH3 < 109.47 && MEASURED_ANGLE.H2O < MEASURED_ANGLE.NH3)) bad('measured angles do not fall 109.5 > NH3 > H2O');

/* ---------------------------------------------------------- polarity */

/* the textbook answer, kept apart from the model so the two check each other */
const POLAR = { H2O: 1, NH3: 1, HCN: 1, CH2O: 1, CH3Cl: 1, CH2Cl2: 1, CHCl3: 1, PCl3: 1, NF3: 1, OF2: 1, H2S: 1,
                CO2: 0, BF3: 0, CH4: 0, BeF2: 0, PCl5: 0, SF6: 0, BCl3: 0, BeCl2: 0, PF5: 0, CCl4: 0 };
Object.keys(SPECIES).forEach((id) => {
  const p = VSEPR.polar(id);
  if (SPECIES[id].charge) { if (p !== null) bad(`${id}: an ion was given a polarity`); return; }
  if (!(id in POLAR)) { bad(`${id}: no textbook polarity to check against`); return; }
  if (!!p !== !!POLAR[id]) bad(`${id}: the model says ${p ? 'polar' : 'nonpolar'}, the textbook ${POLAR[id] ? 'polar' : 'nonpolar'}`);
});

/* the radial symmetry test the class uses must agree with the charge model */
Object.keys(SPECIES).forEach((id) => {
  if (SPECIES[id].charge) return;
  const sym = VSEPR.symmetry(id).symmetric;
  if (sym === !!VSEPR.polar(id)) bad(`${id}: the symmetry test says ${sym ? 'symmetric' : 'not symmetric'} but the model says ${VSEPR.polar(id) ? 'polar' : 'nonpolar'}`);
});

/* ---------------------------------------------------------- steps */

const STEP = (id) => App.STEPS.find((s) => s.id === id);
const gal = STEP('gallery');
const galNames = gal.set.map((id) => VSEPR.info(id).geometry);
if (new Set(galNames).size !== gal.set.length) bad('gallery: two molecules share a geometry');
gal.set.forEach((id) => { if (VSEPR.info(id).lp) bad(`gallery: ${id} has a lone pair`); });
const sort = STEP('sort');
sort.bins.forEach((b) => { if (VSEPR.NAMES.indexOf(b) < 0) bad(`sort: unknown bin ${b}`); });
sort.cards.forEach((id) => {
  const g = VSEPR.info(id).geometry;
  if (sort.bins.indexOf(g) < 0) bad(`sort: ${id} is ${g}, which has no bin`);
});
sort.bins.forEach((b) => { if (sort.cards.filter((id) => VSEPR.info(id).geometry === b).length < 2) bad(`sort: fewer than 2 cards for ${b}`); });
App.STEPS.filter((s) => s.kind === 'charges' || s.kind === 'field').forEach((s) => s.set.forEach((id) => {
  if (SPECIES[id].charge) bad(`${s.id}: ion ${id} in a polarity step`);
}));
const fieldSet = STEP('field').set;
if (!fieldSet.some((id) => VSEPR.polar(id)) || !fieldSet.some((id) => !VSEPR.polar(id))) bad('field: needs polar and nonpolar molecules');

/* predictions */
const P = App.PREDICT;
Object.keys(P).forEach((k) => {
  const p = P[k];
  if (!p.fact) return;
  const [kind, id, want] = p.fact;
  if (kind === 'angle') {
    const a = VSEPR.info(id).angle;
    if (typeof want === 'string' && a !== want) bad(`predict ${k}: model says ${a}, key expects ${want}`);
    if (want === 0 && p.choices[p.answer].indexOf(a) !== 0) bad(`predict ${k}: answer does not start with ${a}`);
  }
  if (kind === 'polar' && !!VSEPR.polar(id) !== want) bad(`predict ${k}: ${id} polarity disagrees`);
});
const fc = App.fieldChoices(fieldSet);
const polarNames = fieldSet.filter((id) => VSEPR.polar(id)).map((id) => Lewis.species(id).text);
if (!polarNames.every((n) => fc[0].indexOf(n) >= 0)) bad('field prediction: answer does not list every polar molecule');

/* ---------------------------------------------------------- questions */

const allIds = new Set();
Object.keys(QUIZZES).forEach((k) => {
  const Q = QUIZZES[k];
  if (Q.pool.length < Q.draw) bad(`${k}: pool ${Q.pool.length} smaller than draw ${Q.draw}`);
  Q.core.forEach((id) => { if (!Q.pool.some((q) => q.id === id)) bad(`${k}: core ${id} not in pool`); });
  if (Q.core.length > Q.draw) bad(`${k}: more core questions than the draw`);
  Q.pool.forEach((q) => {
    if (allIds.has(q.id)) bad(`duplicate question id ${q.id}`);
    allIds.add(q.id);
    if (!/^[a-z0-9-]{1,40}$/.test(q.id)) bad(`${q.id}: not a safe SCORM interaction id`);
    if (q.choices.length < 3) bad(`${q.id}: fewer than 3 choices`);
    const texts = q.choices.map((c) => typeof c === 'string' ? c : 'lewis:' + c.lewis);
    if (new Set(texts).size !== texts.length) bad(`${q.id}: duplicate choices`);
    if (q.fig && !SPECIES[q.fig.lewis]) bad(`${q.id}: unknown figure ${q.fig.lewis}`);
    q.choices.forEach((c) => { if (typeof c !== 'string' && !SPECIES[c.lewis]) bad(`${q.id}: unknown choice ${c.lewis}`); });
    const geomChoice = q.choices.some((c) => typeof c === 'string' && VSEPR.NAMES.indexOf(c.toLowerCase()) >= 0);
    const angleChoice = q.choices.some((c) => typeof c === 'string' && /^<{0,2}\d/.test(c));
    if ((geomChoice || angleChoice) && !q.fact) bad(`${q.id}: names a geometry or angle but has no fact`);
    if (!q.fact) return;
    const [kind, a, b] = q.fact;
    const first = q.choices[0];
    if (kind === 'domains') {
      if (String(VSEPR.info(a).domains) !== first) bad(`${q.id}: ${a} has ${VSEPR.info(a).domains} domains, answer ${first}`);
      if (q.choices.slice(1).indexOf(first) >= 0) bad(`${q.id}: answer repeated`);
    } else if (kind === 'geometry') {
      if (VSEPR.info(a).geometry !== first.toLowerCase()) bad(`${q.id}: ${a} is ${VSEPR.info(a).geometry}, answer ${first}`);
      if (q.choices.slice(1).some((c) => c.toLowerCase() === VSEPR.info(a).geometry)) bad(`${q.id}: a distractor is also right`);
    } else if (kind === 'angle') {
      if (VSEPR.info(a).angle !== first) bad(`${q.id}: ${a} is ${VSEPR.info(a).angle}, answer ${first}`);
    } else if (kind === 'polar') {
      const p = VSEPR.polar(a);
      if (!/^(Polar|Nonpolar):/.test(first) || (first.indexOf('Polar') === 0) !== !!p) bad(`${q.id}: ${a} is ${p ? 'polar' : 'nonpolar'}, answer "${first}"`);
      q.choices.slice(1).forEach((c) => { if (/^Polar:/.test(c) === !!p && /^(Polar|Nonpolar):/.test(c) && /symmetric|lopsided|lone pair on P makes|outer atoms are not/.test(c)) bad(`${q.id}: distractor "${c}" may be right`); });
    } else if (kind === 'pick') {
      const ok = q.choices.map((c) => b === undefined ? false : a === 'geometry' ? VSEPR.info(c.lewis).geometry === b : !!VSEPR.polar(c.lewis) === b);
      if (!ok[0]) bad(`${q.id}: the first drawing is not the answer`);
      if (ok.slice(1).some(Boolean)) bad(`${q.id}: more than one drawing is right`);
    } else bad(`${q.id}: unknown fact ${kind}`);
  });
});

/* ---------------------------------------------------------- words */

function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) { if (d.name !== 'dist' && d.name !== 'node_modules') walk(p, out); }
    else if (/\.(js|html|css|md|xml|sh)$/.test(d.name)) out.push(p);
  });
  return out;
}
walk(root, []).forEach((f) => {
  const t = fs.readFileSync(f, 'utf8');
  if (t.indexOf('\u2014') >= 0) bad(`${path.relative(root, f)}: contains an em dash`);
});
/* student text: the steps, the questions, the species notes */
const student = ['app.js', 'quiz.js', 'species.js'].map((f) => fs.readFileSync(path.join(src, 'js', f), 'utf8')).join('\n');
[/see-?saw/i, /T-shaped/, /square planar/i, /square pyramidal/i, /pentagonal/i, /steric number/i, /hybridi[sz]/i,
 /\bAXE\b/, /formal charge/i, /dipole/i, /van der waals/i, /lopsided/i].forEach((re) => {
  if (re.test(student)) bad(`student text uses ${re}`);
});
const quizText = fs.readFileSync(path.join(src, 'js', 'quiz.js'), 'utf8');
if (/\b(107|104\.5|106\.7)\b/.test(quizText)) bad('a question quotes a measured angle');

/* ---------------------------------------------------------- report */

const pool = Object.keys(QUIZZES).reduce((n, k) => n + QUIZZES[k].pool.length, 0);
if (problems.length) {
  console.error(problems.length + ' problem(s):\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`${Object.keys(SPECIES).length} species, ${App.STEPS.length} steps, ${pool} questions (${App.GRADED} graded per attempt), ` +
  `${drawn3D.size} molecules drawn in 3D.`);
console.log('All checks passed.');

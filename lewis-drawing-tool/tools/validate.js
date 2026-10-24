/* tools/validate.js — checks the formula starter.
 *
 *   node tools/validate.js
 *
 * 1. Every species in the Lewis structures and resonance activities (read from
 *    the sibling folders when they are there) comes out of "Start from a
 *    formula" with the answer those activities teach: the same number of
 *    valence electrons, the same bonds to the central atom, the same lone
 *    pairs on it — so a teacher's diagram never disagrees with the activity.
 * 2. Every template is a complete structure: the right electron count, every
 *    atom with its duet / octet, formal charges adding up to its charge.
 * 3. Typed formulas are read the way the hint says (SO4 2-, NH4+, SO42-, SO₄²⁻ …).
 * 4. Odd-electron species, ionic compounds and dot symbols come out right, and
 *    formulas the tool can't lay out are refused with a message.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = { addEventListener() {} };
global.document = { addEventListener() {} };
const src = path.join(__dirname, '..', 'src', 'js');
for (const f of ['util.js', 'elements.js', 'lewis.js', 'model.js', 'generate.js']) {
  (0, eval)(fs.readFileSync(path.join(src, f), 'utf8'));
}

const problems = [];
const fail = (m) => problems.push(m);
let checked = 0;

/* electrons drawn, bonds to the central atom, lone pairs on it */
function shape(doc) {
  const center = doc.atoms[0];
  const total = doc.atoms.reduce((s, a) => s + 2 * a.lp + a.e1, 0) + doc.bonds.reduce((s, b) => s + 2 * b.order, 0);
  const bo = Model.bondsOf(doc, center.id).map((b) => b.order).sort((x, y) => y - x).join('');
  return { total, bo, clp: center.lp, center: center.el };
}

/* ---------------------------------------- 1. the activities' answer keys */

function speciesFrom(dir) {
  const file = path.join(__dirname, '..', '..', dir, 'src', 'js', 'species.js');
  if (!fs.existsSync(file)) return null;
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(file, 'utf8') + '\nthis.SPECIES = SPECIES;', ctx);
  return ctx.SPECIES;
}

for (const dir of ['lewis-structures-scorm', 'resonance-scorm']) {
  const list = speciesFrom(dir);
  if (!list) { console.log(`(skipped ${dir}: not found next to this folder)`); continue; }
  for (const id of Object.keys(list)) {
    const sp = list[id];
    if (sp.key.e == null) continue;
    const text = sp.formula + (sp.charge ? ' ' + Math.abs(sp.charge) + (sp.charge < 0 ? '-' : '+') : '');
    const r = Generate.generate(text);
    if (r.error) { fail(`${dir} ${id} (${text}): ${r.error}`); continue; }
    if (/Drawn as/.test(r.note || '')) continue;          /* a template (H2O2 in the resonance set) */
    const s = shape(r.doc);
    checked++;
    if (s.total !== sp.key.e) fail(`${dir} ${id}: ${s.total} electrons drawn, the key says ${sp.key.e}`);
    if (s.bo !== sp.key.bo) fail(`${dir} ${id}: bonds to the center ${s.bo}, the key says ${sp.key.bo}`);
    if (s.clp !== sp.key.clp) fail(`${dir} ${id}: ${s.clp} lone pairs on ${s.center}, the key says ${sp.key.clp}`);
    /* H on O in every oxyacid, as the activity draws it */
    const acid = Object.values(sp.layout).includes('OH');
    const hOnO = r.doc.atoms.filter((a) => a.el === 'H').every((a) =>
      Model.bondsOf(r.doc, a.id).some((b) => Model.atom(r.doc, Model.other(b, a.id)).el === 'O'));
    if (acid && !hOnO) fail(`${dir} ${id}: an H is not on an O`);
  }
}

/* ------------------------------------------------------- 2. templates */

for (const t of Generate.templates()) {
  const r = Generate.generate(t.f);
  if (r.error) { fail(`template ${t.name}: ${r.error}`); continue; }
  if (!new RegExp('Drawn as ' + t.name.replace(/[()]/g, '\\$&')).test(r.note)) fail(`template ${t.name}: "${t.f}" did not find it`);
  const doc = r.doc, ids = doc.atoms.map((a) => a.id);
  const want = doc.atoms.reduce((s, a) => s + ELEMENTS[a.el].valence, 0) - Generate.read(t.f).charge;
  if (shape(doc).total !== want) fail(`template ${t.name}: ${shape(doc).total} electrons, should be ${want}`);
  doc.atoms.forEach((a) => {
    if (Model.electrons(doc, a.id) !== Model.target(a.el)) fail(`template ${t.name}: ${a.el} has ${Model.electrons(doc, a.id)}`);
  });
  if (Model.charge(doc, ids) !== Generate.read(t.f).charge) fail(`template ${t.name}: formal charges add to ${Model.charge(doc, ids)}`);
  for (let i = 0; i < doc.atoms.length; i++) for (let j = i + 1; j < doc.atoms.length; j++) {
    const a = doc.atoms[i], b = doc.atoms[j];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 0.9) fail(`template ${t.name}: two atoms drawn on top of each other`);
  }
  doc.bonds.forEach((b) => {
    const a = Model.atom(doc, b.a), z = Model.atom(doc, b.b), d = Math.hypot(a.x - z.x, a.y - z.y);
    if (d < 0.95 || d > 1.45) fail(`template ${t.name}: a ${a.el}–${z.el} bond ${d.toFixed(2)} units long`);
  });
  checked++;
}

/* ------------------------------------------------- 3. reading formulas */

const READS = [
  ['SO4 2-', 'SO4', -2], ['SO4^2-', 'SO4', -2], ['SO4(2-)', 'SO4', -2], ['SO42-', 'SO4', -2], ['SO₄²⁻', 'SO4', -2],
  ['NH4+', 'NH4', 1], ['NO3-', 'NO3', -1], ['NO3−', 'NO3', -1], ['PO43-', 'PO4', -3], ['CO3 -2', 'CO3', -2],
  ['H2O', 'H2O', 0], ['O^2-', 'O', -2], ['Cl-', 'Cl', -1], [' CH3COOH ', 'CH3COOH', 0], ['O2 2-', 'O2', -2]
];
for (const [text, f, q] of READS) {
  const r = Generate.read(text);
  if (r.error || r.formula !== f || r.charge !== q) fail(`read "${text}": got ${r.error || r.formula + ' ' + r.charge}, want ${f} ${q}`);
}
for (const bad of ['', 'so4', 'Ca(OH)2', 'Zz2', 'H2O!']) {
  if (!Generate.read(bad).error) fail(`read "${bad}" should be refused`);
}

/* ------------------------------ 4. odd electrons, ionic, dot symbols, refusals */

const odd = Generate.generate('NO2');
if (odd.error || odd.doc.atoms[0].e1 !== 1 || shape(odd.doc).total !== 17) fail('NO2: one unpaired electron on N, 17 in all');
const nacl = Generate.generate('MgCl2');
if (nacl.error) fail('MgCl2: ' + nacl.error);
else {
  const qs = Model.components(nacl.doc).map((ids) => Model.charge(nacl.doc, ids)).sort();
  if (qs.join() !== '-1,-1,2') fail('MgCl2: ions ' + qs.join());
}
const dot = Generate.generate('N');
if (dot.error || dot.doc.atoms[0].lp !== 1 || dot.doc.atoms[0].e1 !== 3) fail('N: a dot symbol with one pair and three singles');
for (const f of ['C3H8O', 'NaNO3', 'C2H6O2']) if (!Generate.generate(f).error) fail(`${f} should be refused, not mis-drawn`);
for (const f of ['H2', 'He', 'Na+', 'O^2-', 'XeF4', 'ICl4-', 'BF3', 'BeCl2', 'S2O3 2-']) {
  const r = Generate.generate(f);
  if (r.error) fail(`${f}: ${r.error}`);
}

/* ------------------------------------------------------------- report */

if (problems.length) {
  console.error(problems.map((p) => '✗ ' + p).join('\n'));
  console.error(`\n${problems.length} problem(s).`);
  process.exit(1);
}
console.log(`✓ ${checked} structures checked against the activities' answer keys and the templates, ` +
  `${READS.length} formula readings — all pass.`);

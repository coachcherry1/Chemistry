/* tools/validate.js: chemistry, teaching and item-bank checks. Run after ANY
 * edit to a molecule, a step, a prediction or a question.
 *
 *   node tools/validate.js
 *
 * Exits non-zero if the activity would teach something that disagrees with
 * its own model or with the textbook: a priority or an R/S label that is
 * wrong, a drawing that reads differently from its 3D model, a turn that
 * changes a label, a relationship that the 3D models contradict, a build that
 * accepts a wrong drawing, a prediction key or quiz answer the model does not
 * support. It also holds the activity to its teaching rules: no swapping of
 * groups and no reversing of answers anywhere in what students read, the
 * teacher's "rockwise" in exactly three places, no calculations, no em dashes.
 */
const fs = require('fs');
const path = require('path');

/* just enough of a browser for the data and logic files to load */
global.window = { addEventListener() {}, matchMedia() { return { matches: false }; } };
global.document = { addEventListener() {} };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const src = path.join(__dirname, '..', 'src', 'js');
const FILES = ['geom.js', 'groups.js', 'molecules.js', 'cip.js', 'stereo.js', 'draw.js', 'viewer3d.js', 'picker.js',
               'quiz.js', 'scorm.js', 'app.js'];
for (const f of FILES) (0, eval)(fs.readFileSync(path.join(src, f), 'utf8'));

const problems = [];
const fail = (msg) => problems.push(msg);
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
const G = GEOM;
const ids = Object.keys(MOLECULES);
const mol = (id) => molecule(id);
const label = (m, c) => CIP.label(m, c);
const labels = (m) => CIP.centres(m).map((c) => (m.kind === 'centre' ? '' : m.atoms[c].num) + label(m, c)).join(',');
const groupOf = (m, j) => (m.atoms[j].group && m.atoms[j].head ? m.atoms[j].group : null);
const order = (m, c) => CIP.rank(m, c).order;
const texts = (m, c) => order(m, c).map((j) => CIP.groupText(m, c, j));

/* ---------------------------------------------------- the 3D models */

for (const id of ids) {
  const m = mol(id);
  const nb = MOLECULES.neighbours(m);
  m.atoms.forEach((a, i) => {
    const ns = nb[i];
    /* bond lengths */
    ns.forEach((x) => {
      if (x.j < i) return;
      const want = bondLength(a.el, m.atoms[x.j].el, x.order);
      const got = G.dist(a.p, m.atoms[x.j].p);
      if (!near(got, want, 0.01)) fail(`${id}: ${a.el}–${m.atoms[x.j].el} bond is ${got.toFixed(3)} Å, not ${want}`);
    });
    if (a.el !== 'C' || ns.length < 3) return;
    const flat = ns.some((x) => x.order === 2) || (GROUPS[a.group] && GROUPS[a.group].flat);
    const want = flat ? 120 : 109.47;
    for (let p = 0; p < ns.length; p++) for (let q = p + 1; q < ns.length; q++) {
      const ang = G.angle(G.sub(m.atoms[ns[p].j].p, a.p), G.sub(m.atoms[ns[q].j].p, a.p));
      if (!near(ang, want, 0.6)) { fail(`${id}: an angle at ${a.id} is ${ang.toFixed(1)}°, not ${want}°`); return; }
    }
  });
}

/* ---------------------------------------------------- textbook anchors */

/* Independent of every drawing in the activity: the configurations of five
   textbook molecules from their Fischer projections (vertical bonds go back,
   horizontal bonds come forward), using only the priority ORDER from cip.js. */
function handedness(v) {
  const d = G.det3(G.sub(v[0], v[3]), G.sub(v[1], v[3]), G.sub(v[2], v[3]));
  return d < 0 ? 'R' : 'S';
}
const FISCHER = { top: [0, 1, -1], bottom: [0, -1, -1], left: [-1, 0, 1], right: [1, 0, 1] };
function fischerOne(id, where) {
  const m = mol(id), c = m.centre;
  return handedness(order(m, c).map((j) => FISCHER[where[groupOf(m, j)]]));
}
const ANCHORS = [
  ['L-alanine', fischerOne('alanine', { COOH: 'top', CH3: 'bottom', NH2: 'left', H: 'right' }), 'S'],
  ['D-glyceraldehyde', fischerOne('glyceraldehyde', { CHO: 'top', CH2OH: 'bottom', OH: 'right', H: 'left' }), 'R'],
  ['L-lactic acid', fischerOne('lactic', { COOH: 'top', CH3: 'bottom', OH: 'left', H: 'right' }), 'S']
];
/* tartaric acid: C2 above C3, each with its OH to the right or the left */
function fischerTartaric(oh2, oh3) {
  const m = mol('tart_ww');
  return [2, 3].map((num) => {
    const c = m.carbonAt[num], oh = num === 2 ? oh2 : oh3;
    const where = (j) => {
      const a = m.atoms[j];
      if (a.group === 'OH' && a.head) return oh;
      if (a.el === 'H') return oh === 'right' ? 'left' : 'right';
      const up = num === 2 ? a.end != null : a.backbone;          /* C1 above C2; C2 above C3 */
      return up ? 'top' : 'bottom';
    };
    return num + handedness(order(m, c).map((j) => FISCHER[where(j)]));
  }).join(',');
}
ANCHORS.push(['L-(+)-tartaric acid', fischerTartaric('right', 'left'), '2R,3R']);
ANCHORS.push(['meso-tartaric acid', fischerTartaric('right', 'right'), '2R,3S']);
for (const [name, got, want] of ANCHORS) if (got !== want) fail(`textbook anchor: ${name} comes out ${got}, not ${want}`);
/* and the activity's own molecules agree with the anchors */
if (labels(mol('alanine')) !== 'S' || labels(mol('alanine_w')) !== 'S') fail('alanine should be drawn as (S)-alanine, the form in proteins');
if (labels(mol('glyceraldehyde')) !== 'R') fail('glyceraldehyde should be (R), D-glyceraldehyde');
if (labels(mol('lactic')) !== 'S') fail('lactic acid should be drawn as (S)');
if (!STEREO.meso(mol('tart_wd')) || STEREO.meso(mol('tart_ww'))) fail('tartaric acid: one wedge and one dash should be meso');

/* ---------------------------------------------------- priorities */

/* A double bond counts twice and the first point of difference decides. */
const PRIORITY = {
  chbrclf: ['Br', 'Cl', 'F', 'H'], ch2brcl: null, bcfe: ['Br', 'Cl', 'F', 'CH₃'], butanol: ['OH', 'CH₂CH₃', 'CH₃', 'H'],
  tmb: ['CH₂OH', 'C(CH₃)₃', 'CH₃', 'H'], glyceraldehyde: ['OH', 'CHO', 'CH₂OH', 'H'], alanine: ['NH₂', 'COOH', 'CH₃', 'H'],
  lactic: ['OH', 'COOH', 'CH₃', 'H'], methylpentene: ['CH=CH₂', 'CH₂CH₃', 'CH₃', 'H'],
  methylhexane_c: ['CH₂CH₂CH₃', 'CH₂CH₃', 'CH₃', 'H'], chloroethanol: ['Cl', 'OH', 'CH₃', 'H'],
  bromomethylbutane: ['CH₂Br', 'CH₂CH₃', 'CH₃', 'H'], bromotmb: ['CH₂Br', 'C(CH₃)₃', 'CH₃', 'H']
};
for (const id of Object.keys(PRIORITY)) {
  const m = mol(id);
  if (PRIORITY[id] === null) { if (CIP.isCentre(m, m.centre)) fail(`${id} should not have a chirality centre`); continue; }
  if (texts(m, m.centre).join(' > ') !== PRIORITY[id].join(' > ')) fail(`${id}: priorities are ${texts(m, m.centre).join(' > ')}`);
  const o = order(m, m.centre);
  for (let k = 0; k < 3; k++) if (!CIP.explain(m, m.centre, o[k], o[k + 1])) fail(`${id}: no explanation for ${k + 1} over ${k + 2}`);
}
{
  const m = mol('tmb'), o = order(m, m.centre);
  if (CIP.decidedAt(m, m.centre, o[0], o[1]) !== 1 || !/O beats C/.test(CIP.explain(m, m.centre, o[0], o[1]))) {
    fail('tmb: CH₂OH should beat C(CH₃)₃ at the first point of difference, O against C');
  }
  const g = mol('glyceraldehyde'), og = order(g, g.centre);
  if (!/double bond to O counts twice/.test(CIP.explain(g, g.centre, og[1], og[2]))) fail('glyceraldehyde: CHO over CH₂OH should mention the double bond');
  const h = mol('methylhexane_c'), oh = order(h, h.centre);
  if (CIP.decidedAt(h, h.centre, oh[0], oh[1]) !== 2) fail('3-methylhexane: propyl against ethyl should be decided one atom further out');
  const v = mol('methylpentene'), ov = order(v, v.centre);
  if (CIP.decidedAt(v, v.centre, ov[0], ov[1]) !== 1) fail('3-methyl-1-pentene: CH=CH₂ against CH₂CH₃ should be decided by the duplicated C');
}
/* no carbon in a double bond is ever a chirality centre */
for (const id of ids) {
  const m = mol(id), nb = MOLECULES.neighbours(m);
  for (const c of CIP.centres(m)) if (nb[c].some((x) => x.order === 2)) fail(`${id}: a doubly bonded carbon counts as a chirality centre`);
}

/* ---------------------------------------------------- turning and reflecting */

for (const id of ids) {
  const m = mol(id), l0 = labels(m);
  for (const O of STEREO.orientations(m)) {
    if (labels(STEREO.apply(m, O)) !== l0) { fail(`${id}: a turn changes its label`); break; }
  }
  for (const w of ['beside', 'behind']) {
    const flipped = CIP.centres(m).map((c) => (m.kind === 'centre' ? '' : m.atoms[c].num) + ({ R: 'S', S: 'R' })[label(m, c)]).join(',');
    if (labels(STEREO.mirror(m, w)) !== flipped) fail(`${id}: the mirror ${w} does not turn every R into S`);
  }
}
/* every template has exactly twelve turns, and the buttons are among them */
for (const tpl of ['V', 'A']) {
  const T = STEREO.turns(tpl);
  if (T.length !== 12) fail(`template ${tpl} has ${T.length} turns, not 12`);
  const has = (R) => T.some((t) => G.gap(t.R, R) < 0.01);
  if (!has(STEREO.OVER)) fail(`template ${tpl}: Turn it over is not one of its turns`);
  for (const s of Object.keys(MOLECULES.TEMPLATES[tpl])) {
    if (!has(G.rot(MOLECULES.TEMPLATES[tpl][s], 120))) fail(`template ${tpl}: a spin around ${s} is not one of its turns`);
  }
}

/* ---------------------------------------------------- drawings agree with the model */

/* Every bond is drawn as it points, and reading R or S off a drawing with 4
   on the dash gives the model's answer, in every orientation and reflection
   the activity can show. */
for (const id of ids) {
  const base = mol(id);
  if (base.kind === 'ring') continue;
  const shapes = [];
  for (const M of [base, STEREO.mirror(base, 'beside'), STEREO.mirror(base, 'behind')]) {
    for (const O of STEREO.orientations(M)) shapes.push(STEREO.apply(M, O));
  }
  let bad = 0;
  for (const m of shapes) {
    for (const wr of [false, true]) {
      const L = Draw.layout(m, { showH: 'all', wedgeRight: wr });
      Object.keys(L.groups).forEach((j) => {
        const b = L.groups[j], a = m.atoms[j], v = m.atoms[b.a];
        if (b.style !== 'plain' || a.plain || a.end != null || a.terminal) {
          if (!a.plain && a.end == null && !a.terminal && b.style !== STEREO.bondStyle(v.p, a.p)) bad++;
        }
        const t = [a.p[0] - v.p[0], -(a.p[1] - v.p[1])], l = Math.hypot(t[0], t[1]);
        if (l > 0.2) {
          const cos = (t[0] * b.d[0] + t[1] * b.d[1]) / l;
          if (cos < Math.cos(46 * Math.PI / 180)) bad++;
        }
      });
      for (const c of CIP.centres(m)) {
        if (!STEREO.fourOnDash(m, c)) continue;
        if (Draw.drawnClockwise(L, c, order(m, c)) !== (label(m, c) === 'R')) bad++;
      }
    }
  }
  if (bad) fail(`${id}: ${bad} drawn bond(s) or readings disagree with the 3D model`);
}

/* ---------------------------------------------------- relationships */

/* R and S, compared centre by centre, against laying the 3D models on each
   other: the two must always agree. */
const byName = {};
for (const id of ids) (byName[MOLECULES[id].name] = byName[MOLECULES[id].name] || []).push(id);
for (const name of Object.keys(byName)) {
  const group = byName[name];
  for (const a of group) for (const b of group) {
    const A = mol(a), B = mol(b);
    if (!STEREO.isomorphisms(A, B, 1).length) continue;
    const r1 = STEREO.relation(A, B), r2 = STEREO.geometric(A, B);
    if (r1 !== r2) fail(`${a} and ${b}: R/S says ${r1}, the 3D models say ${r2}`);
  }
}
for (const id of ids) {
  const m = mol(id);
  const r1 = STEREO.relation(m, STEREO.mirror(m)), r2 = STEREO.geometric(m, STEREO.mirror(m));
  if (r1 !== r2) fail(`${id} and its mirror image: R/S says ${r1}, the 3D models say ${r2}`);
}
/* distinct stereoisomers in a set of drawings */
function distinct(list) {
  const out = [];
  for (const id of list) if (!out.some((o) => STEREO.relation(mol(o), mol(id)) === 'identical')) out.push(id);
  return out.length;
}

/* ---------------------------------------------------- the steps */

const S = (id) => App.STEPS.find((s) => s.id === id);
const P = App.PREDICT;
const key = (p) => p.choices[p.answer];
const m0 = (id) => mol(S(id).mols ? S(id).mols[0] : S(id).mol);

/* mirror: CHBrClF never fits (two atoms at most), CH₂BrCl fits after Turn it over */
{
  const x = mol('chbrclf'), img = STEREO.mirror(x, 'beside');
  const best = Math.max(...STEREO.orientations(img).map((O) => STEREO.matchCount(STEREO.apply(img, O), x).n));
  if (best !== 2) fail(`mirror: the best fit of CHBrClF's mirror image should be 2 atoms, not ${best}`);
  const y = mol('ch2brcl'), imgY = STEREO.mirror(y, 'beside');
  const fit = STEREO.matchCount(STEREO.apply(imgY, STEREO.OVER), y);
  if (fit.n !== fit.total) fail('mirror: CH₂BrCl\'s mirror image should fit after Turn it over (the step says so)');
  const plane = STEREO.centrePlane(y);
  if (!plane || Math.abs(plane.n[2]) < 0.999) fail('mirror: CH₂BrCl\'s mirror plane should be the page itself (the step says so)');
  if (key(P.fit1) !== 'No, never' || !STEREO.chiral(x) || key(P.fit2) !== 'Yes' || STEREO.chiral(y)) fail('mirror: a prediction key is wrong');
}
/* drawmirror: of the 24 drawings, exactly the reflection is accepted, and every other one is explained */
{
  const m = mol(S('drawmirror').mol), slots = MOLECULES.SLOT_ORDER[m.tpl];
  const gs = slots.map((s) => STEREO.arrangement(m)[s]);
  for (const where of ['beside', 'behind']) {
    let ok = 0;
    for (const perm of STEREO.permutations([0, 1, 2, 3])) {
      const got = {};
      slots.forEach((s, i) => { got[s] = gs[perm[i]]; });
      const r = App.judgeMirror(m, where, got);
      if (r.ok) {
        ok++;
        if (STEREO.relation(STEREO.fromSlots(m.tpl, got), m) !== 'enantiomers') fail(`drawmirror ${where}: the accepted drawing is not the mirror image`);
      } else if (!r.msg) fail(`drawmirror ${where}: a wrong drawing gets no feedback`);
    }
    if (ok !== 1) fail(`drawmirror ${where}: ${ok} drawings accepted, not exactly 1`);
  }
  const beh = STEREO.arrangement(STEREO.mirror(m, 'behind')), orig = STEREO.arrangement(m);
  if (beh.w !== orig.d || beh.d !== orig.w || beh.ul !== orig.ul) fail('a mirror behind the page should exchange only wedge and dash');
}
/* centres: what the step expects in each molecule */
{
  const want = { butanol_line: [2], methylpentane: [], dimethylpentane: [3], bcb_line: [2, 3] };
  for (const id of S('centres').mols) {
    const m = mol(id), got = CIP.centres(m).map((c) => m.atoms[c].num);
    if (got.join() !== (want[id] || []).join()) fail(`centres: ${id} has chirality centres at ${got.join() || 'none'}`);
    m.backbone.forEach((i) => {
      const num = m.atoms[i].num;
      if (got.indexOf(num) < 0 && !App.whyNotCentre(m, num)) fail(`centres: no explanation for C${num} of ${id}`);
    });
  }
}
/* rank and ties */
{
  if (texts(mol('chbrclf'), mol('chbrclf').centre)[0] !== 'Br' || !/^Br/.test(key(P.top))) fail('rank: priority 1 of CHBrClF should be Br');
  const t = mol('tmb');
  if (texts(t, t.centre)[0] !== 'CH₂OH' || key(P.bigger) !== 'CH₂OH') fail('ties: CH₂OH should outrank C(CH₃)₃');
  for (const id of S('ties').mols) {
    const m = mol(id), o = order(m, m.centre);
    if (![0, 1, 2].some((k) => CIP.decidedAt(m, m.centre, o[k], o[k + 1]) >= 1)) fail(`ties: ${id} has no tie to break`);
  }
}
/* wheel: 4 already on the dash */
{
  const b = mol('bromobutane'), c = b.carbonAt[2];
  if (label(b, c) !== 'R' || !STEREO.fourOnDash(b, c)) fail('wheel: 2-bromobutane, as drawn in the Newman activity, should be R with H on the dash');
  const s = mol('butanol_S');
  if (labels(s) !== 'S' || !STEREO.fourOnDash(s, s.centre)) fail('wheel: the second molecule should be (S)-2-butanol with H on the dash');
}
/* rotate: 4 on a wedge, then 4 (CH₃) in the page, which Turn it over leaves in the page */
{
  const a = mol('alanine_w'), o = order(a, a.centre);
  if (STEREO.bondStyle(a.atoms[a.centre].p, a.atoms[o[3]].p) !== 'wedge' || !/^No/.test(key(P.asis))) fail('rotate: alanine should start with H on the wedge');
  const b = mol('bcfe_plane'), ob = order(b, b.centre);
  if (b.atoms[ob[3]].group !== 'CH3' || STEREO.bondStyle(b.atoms[b.centre].p, b.atoms[ob[3]].p) !== 'plain') fail('rotate: 4 should be CH₃, in the page');
  const turned = STEREO.apply(b, STEREO.OVER);
  if (STEREO.bondStyle(turned.atoms[turned.centre].p, turned.atoms[ob[3]].p) !== 'plain') fail('rotate: Turn it over should leave CH₃ in the page');
}
/* hidden: the H hides on the wedge; exactly three redraws are right */
{
  const m = mol('butanol_hidden'), c = m.carbonAt[2], o = order(m, c);
  if (STEREO.bondStyle(m.atoms[c].p, m.atoms[o[3]].p) !== 'wedge' || !/wedge/.test(key(P.hiddenH))) fail('hidden: the hidden H should be on the wedge');
  if (STEREO.relation(STEREO.fromSlots('A', App.HIDDEN_AS_DRAWN), m) !== 'identical') fail('hidden: HIDDEN_AS_DRAWN is not the drawn molecule');
  const moved = Object.assign({}, App.HIDDEN_AS_DRAWN, { w: 'OH', d: 'H' });
  if (STEREO.relation(STEREO.fromSlots('A', moved), m) !== 'enantiomers') fail('hidden: moving only the H and OH should draw the mirror image');
  const tiles = ['OH', 'CH3', 'Et', 'H'], slots = MOLECULES.SLOT_ORDER.A;
  let ok = 0;
  for (const perm of STEREO.permutations([0, 1, 2, 3])) {
    const got = {};
    slots.forEach((s, i) => { got[s] = tiles[perm[i]]; });
    const r = App.judgeRedraw(m, got);
    if (r.ok) {
      ok++;
      if (got.d !== 'H') fail('hidden: a redraw without H on the dash is accepted');
    } else if (!r.msg) fail('hidden: a wrong redraw gets no feedback');
  }
  if (ok !== 3) fail(`hidden: ${ok} redraws accepted, not the 3 with H on the dash`);
}
/* enant: the mirror behind the page puts the H on the wedge, and turns R into S */
{
  const m = mol('butanol_R'), img = STEREO.mirror(m, 'behind'), o = order(img, img.centre);
  if (labels(m) !== 'R' || labels(img) !== 'S' || key(P.mirrorLabel) !== 'S') fail('enant: (R)-2-butanol\'s mirror image should be S');
  if (STEREO.bondStyle(img.atoms[img.centre].p, img.atoms[o[3]].p) !== 'wedge') fail('enant: in the mirror behind the page the H should be on the wedge');
}
/* four: four stereoisomers, A to D; A–B and C–D enantiomers, the rest diastereomers */
{
  const ms = S('four').mols;
  if (distinct(ms) !== 4 || key(P.count4) !== '4') fail('four: 2-bromo-3-chlorobutane should have four stereoisomers');
  const want = { '01': 'enantiomers', '23': 'enantiomers' };
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const r = STEREO.relation(mol(ms[i]), mol(ms[j]));
    if (r !== (want['' + i + j] || 'diastereomers')) fail(`four: ${ms[i]} and ${ms[j]} are ${r}`);
  }
  const A = mol(ms[0]), cs = CIP.centres(A);
  if (cs.every((c) => STEREO.fourOnDash(A, c))) fail('four: one of molecule A\'s centres should need a rotation');
}
/* rings */
{
  const want = { trans13: 'chiral', cis14: 'no chirality centres', trans14: 'no chirality centres' };
  if (S('rings').mols.includes('cis13')) fail('rings: cis-1,3 is meso and has no place in this version');
  for (const id of S('rings').mols) if (App.ringAnswer(mol(id)) !== want[id]) fail(`rings: ${id} comes out ${App.ringAnswer(mol(id))}`);
  const planes = { cis13: [2, 5], trans13: null, cis14: [1, 4], trans14: [1, 4] };
  for (const id of Object.keys(planes)) {
    const p = STEREO.ringPlane(mol(id));
    if (JSON.stringify(p ? p.through : null) !== JSON.stringify(planes[id])) fail(`rings: ${id}'s mirror plane is ${p ? p.through : 'missing'}`);
  }
  if (STEREO.relation(mol('cis14'), mol('trans14')) !== 'diastereomers') fail('rings: cis- and trans-1,4 should be diastereomers');
  if (!/^No: it is chiral/.test(key(P.trans13)) || !STEREO.chiral(mol('trans13')) || CIP.centres(mol('trans13')).length !== 2) fail('rings: the trans-1,3 prediction key is wrong');
}

/* ---------------------------------------------------- steps and predictions */

{
  const seen = new Set();
  for (const s of App.STEPS) {
    if (seen.has(s.id)) fail(`duplicate step id ${s.id}`);
    seen.add(s.id);
    for (const id of s.mols || (s.mol ? [s.mol] : [])) if (!MOLECULES[id]) fail(`step ${s.id}: unknown molecule ${id}`);
  }
  for (const k of Object.keys(P)) {
    const p = P[k];
    if (p.answer !== 0) fail(`prediction ${k}: the key should be written first`);
    if (new Set(p.choices).size !== p.choices.length) fail(`prediction ${k}: duplicate choices`);
  }
  if (App.GRADED !== 16) fail(`${App.GRADED} graded questions per attempt, not 16`);
}

/* ---------------------------------------------------- quiz bank */

const qids = new Set();
const qtexts = new Map();
const allFigs = (q) => [q.fig].concat(q.choices.filter((c) => typeof c !== 'string')).filter(Boolean);
function figMols(f) { return f.pair ? f.pair.flatMap(figMols) : [f.mol || f.flat || f.newman]; }
for (const k of Object.keys(QUIZZES)) {
  const Q = QUIZZES[k];
  if (Q.pool.length < Q.draw) fail(`quiz ${k}: pool of ${Q.pool.length} is smaller than the draw of ${Q.draw}`);
  for (const c of Q.core) if (!Q.pool.some((q) => q.id === c)) fail(`quiz ${k}: core question ${c} is not in the pool`);
  if (Q.core.length > Q.draw) fail(`quiz ${k}: more core questions than the draw`);
  for (const q of Q.pool) {
    if (qids.has(q.id)) fail(`duplicate question id ${q.id}`);
    qids.add(q.id);
    if (q.choices.length < 2 || q.choices.length > 4) fail(`${q.id}: ${q.choices.length} choices`);
    if (!q.why) fail(`${q.id}: no explanation`);
    if (/[^A-Za-z0-9-]/.test(q.id)) fail(`${q.id}: ids must be letters, digits and hyphens (they become SCORM interaction ids)`);
    for (const f of allFigs(q)) for (const id of figMols(f)) if (!MOLECULES[id]) fail(`${q.id}: figure uses unknown molecule ${id}`);
    const t = q.choices.map((c) => (typeof c === 'string' ? c : JSON.stringify(c)));
    if (new Set(t).size !== t.length) fail(`${q.id}: duplicate choices`);
    if (qtexts.has(q.q)) fail(`${q.id}: the same question text as ${qtexts.get(q.q)}`);
    qtexts.set(q.q, q.id);
  }
}
/* "Which drawing ...?": exactly one choice is right, and it is the first */
const F = (spec) => App.figModel(spec);
const WHICH = {
  'a-which-chiral': (c) => STEREO.chiral(F(c)),
  'a-mirror': (c, q) => STEREO.relation(F(c), F(q.fig)) === 'enantiomers',
  'c-which-S': (c) => labels(F(c)) === 'S',
  'c-which-R': (c) => labels(F(c)) === 'R'
};
const Qn = (id) => Object.keys(QUIZZES).map((k) => QUIZZES[k].pool.find((q) => q.id === id)).find(Boolean);
for (const id of Object.keys(WHICH)) {
  const q = Qn(id);
  if (!q) { fail(`check for unknown question ${id}`); continue; }
  const right = q.choices.map((c) => !!WHICH[id](c, q));
  if (!right[0]) fail(`${id}: the first (correct) choice is not right`);
  if (right.slice(1).some(Boolean)) fail(`${id}: a wrong choice is also right`);
}
/* the "which drawing" questions about R and S make students rotate: their
   right answer does not have 4 on the dash */
for (const id of ['c-which-S', 'c-which-R']) {
  const m = F(Qn(id).choices[0]);
  if (STEREO.fourOnDash(m, m.centre)) fail(`${id}: the right drawing already has 4 on the dash`);
}
/* questions whose answer depends on the model: if a molecule or a rule
   changes, these say which question text to update */
const bcbBy = (lab) => S('four').mols.find((id) => App.configText(mol(id)) === lab);
const checks = {
  'a-chiral': () => true,
  'a-centre-which': () => labels(mol('methylhexane')) && CIP.centres(mol('methylhexane')).map((c) => mol('methylhexane').atoms[c].num).join() === '3',
  'a-not-centre': () => { const m = mol('methylpentane'); return !CIP.isCentre(m, m.carbonAt[3]) && /two CH₂CH₃ groups/.test(App.groupsOn(m, m.carbonAt[3])); },
  'a-count': () => CIP.centres(mol('bcb_line')).length === 2,
  'a-count-dmb': () => CIP.centres(mol('dimethylbutane')).length === 0,
  'a-plane': () => STEREO.centrePlane(mol('ch2brcl')) && !STEREO.chiral(mol('ch2brcl')),
  'a-mirror-behind': () => true,
  'a-meter': () => STEREO.chiral(mol('chbrclf')),
  'a-sp2': () => true,
  'b-top': () => texts(mol('chloroethanol'), mol('chloroethanol').centre)[0] === 'Cl',
  'b-why-br': () => ELEMENTS.Br.z > ELEMENTS.F.z,
  'b-tie': () => { const m = mol('butanol'), o = order(m, m.centre); return CIP.decidedAt(m, m.centre, o[1], o[2]) === 1 && /\(C, H, H\)/.test(CIP.explain(m, m.centre, o[1], o[2])); },
  'b-first-diff': () => texts(mol('tmb'), mol('tmb').centre)[0] === 'CH₂OH',
  'b-double': () => texts(mol('glyceraldehyde'), mol('glyceraldehyde').centre)[1] === 'CHO',
  'b-rank-alanine': () => texts(mol('alanine'), mol('alanine').centre).join(' > ') === 'NH₂ > COOH > CH₃ > H',
  'b-rank-lactic': () => texts(mol('lactic'), mol('lactic').centre).join(' > ') === 'OH > COOH > CH₃ > H',
  'b-vinyl': () => texts(mol('methylpentene'), mol('methylpentene').centre)[0] === 'CH=CH₂',
  'b-lowest': () => texts(mol('bcfe'), mol('bcfe').centre)[3] === 'CH₃',
  'b-propyl': () => texts(mol('methylhexane_c'), mol('methylhexane_c').centre)[0] === 'CH₂CH₂CH₃',
  'b-sum': () => texts(mol('bromotmb'), mol('bromotmb').centre)[0] === 'CH₂Br',
  'c-read-dash': () => labels(mol('chbrclf')) === 'R' && STEREO.fourOnDash(mol('chbrclf'), mol('chbrclf').centre),
  'c-read-wedge': () => { const m = mol('chbrclf_w'); return labels(m) === 'S' && STEREO.bondStyle(m.atoms[m.centre].p, m.atoms[order(m, m.centre)[3]].p) === 'wedge'; },
  'c-rule': () => true,
  'c-same': () => { const f = Qn('c-same').fig.pair; const b = F(f[1]); return STEREO.relation(F(f[0]), b) === 'identical' && !STEREO.fourOnDash(b, b.centre); },
  'c-enant': () => { const f = Qn('c-enant').fig.pair; return STEREO.relation(F(f[0]), F(f[1])) === 'enantiomers'; },
  'c-mirror-label': () => true,
  'c-rotate-label': () => true,
  'c-not-H': () => { const m = mol('bcfe_plane'); return labels(m) === 'R' && m.atoms[order(m, m.centre)[3]].group === 'CH3'; },
  'c-hidden': () => { const m = mol('bromobutane_line'), c = m.carbonAt[2]; return label(m, c) === 'S' && STEREO.bondStyle(m.atoms[c].p, m.atoms[order(m, c)[3]].p) === 'wedge'; },
  'c-steering': () => true,
  'd-count': () => distinct(S('four').mols) === 4,
  'd-max3': () => true,   /* 2 × 2 × 2: each centre R or S */
  'd-rel-enant': () => STEREO.relation(mol(bcbBy('(2R,3R)')), mol(bcbBy('(2S,3S)'))) === 'enantiomers',
  'd-rel-pair': () => STEREO.relation(mol(bcbBy('(2R,3S)')), mol(bcbBy('(2S,3R)'))) === 'enantiomers',
  'd-rel-dia': () => STEREO.relation(mol(bcbBy('(2R,3R)')), mol(bcbBy('(2R,3S)'))) === 'diastereomers',
  'd-which-dia': () => STEREO.relation(mol(bcbBy('(2R,3R)')), mol(bcbBy('(2R,3S)'))) === 'diastereomers' &&
    STEREO.relation(mol(bcbBy('(2R,3R)')), mol(bcbBy('(2S,3S)'))) === 'enantiomers' &&
    STEREO.relation(mol(bcbBy('(2R,3S)')), mol(bcbBy('(2S,3R)'))) === 'enantiomers',
  'd-enant-of': () => App.configText(STEREO.mirror(mol(bcbBy('(2R,3S)')))) === '(2S,3R)' &&
    STEREO.relation(mol(bcbBy('(2R,3S)')), mol(bcbBy('(2S,3R)'))) === 'enantiomers',
  'd-energy': () => App.configText(mol('dbb_B')) === '(2R,3R)' && App.configText(mol('dbb_C')) === '(2S,3S)' &&
    STEREO.relation(mol('dbb_B'), mol('dbb_C')) === 'enantiomers',
  'd-label-both': () => App.configText(mol('bcb_ww')) === '(2R,3R)' && CIP.centres(mol('bcb_ww')).every((c) => STEREO.fourOnDash(mol('bcb_ww'), c)),
  'd-ring-14': () => App.ringAnswer(mol('cis14')) === 'no chirality centres',
  'd-ring-trans13': () => App.ringAnswer(mol('trans13')) === 'chiral' && STEREO.relation(mol('trans13'), mol('cis13')) === 'diastereomers',
  'd-cistrans': () => STEREO.relation(mol('cis14'), mol('trans14')) === 'diastereomers'
};
for (const id of Object.keys(checks)) {
  if (!qids.has(id)) { fail(`check for unknown question ${id}`); continue; }
  if (!checks[id]()) fail(`question ${id} no longer matches the model, so update its text`);
}
for (const id of qids) if (!checks[id] && !WHICH[id]) fail(`question ${id} has no check in tools/validate.js`);

/* ---------------------------------------------------- what students read */

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const STUDENT = ['src/js/app.js', 'src/js/quiz.js', 'src/index.html'];
{
  /* never a calculation, and no optical activity (left out on purpose); the
     results screen may show the score as a percentage, a question may not */
  for (const f of STUDENT) {
    const t = read(f);
    if (/\bkJ\b/.test(t)) fail(`${f} mentions an energy`);
    if (/specific rotation|\[α\]|optical|polari[sz]ed|enantiomeric excess/i.test(t)) fail(`${f} mentions optical activity`);
    /* this is the version without meso compounds */
    if (/\bmeso\b/i.test(t)) fail(`${f} mentions meso: this version leaves meso compounds out`);
  }
  if (/\d\s*%|percent/i.test(read('src/js/quiz.js'))) fail('a question mentions a percentage');
  /* the teacher's rule: rotate, never swap two groups or reverse an answer */
  for (const f of STUDENT) {
    read(f).split('\n').forEach((l, i) => {
      if (/\bswap|\bswitch|interchang|\brevers/i.test(l)) fail(`${f}:${i + 1} talks about swapping or reversing: "${l.trim().slice(0, 80)}"`);
      if (/opposite (of what|answer)|answer is (the )?opposite/i.test(l)) fail(`${f}:${i + 1} tells students to take the opposite answer`);
    });
  }
  const app = read('src/js/app.js');
  if (!/4 is not on the dash\. Rotate the molecule\./.test(app)) fail('the rule "4 is not on the dash. Rotate the molecule." is missing');
  /* rockwise: in three places only (where R and S are introduced, the
     vocabulary, the big ideas) and never in a question */
  const count = (re) => STUDENT.reduce((n, f) => n + (read(f).match(re) || []).length, 0);
  if (count(/rockwise/gi) !== 3) fail(`"rockwise" appears ${count(/rockwise/gi)} times, not 3`);
  if (count(/sountersockwise/gi) !== 3) fail(`"sountersockwise" appears ${count(/sountersockwise/gi)} times, not 3`);
  if (/rockwise|sountersockwise/i.test(read('src/js/quiz.js'))) fail('quiz.js uses rockwise');
}

/* ---------------------------------------------------- no em dashes */

/* Nothing a student or teacher reads may contain an em dash. */
{
  const DASH = new RegExp('\\u2014|&' + 'mdash;');   /* split so this line does not match itself */
  const files = [];
  (function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) { if (f !== 'dist' && f[0] !== '.') walk(full); }
      else if (/\.(js|html|css|md|xml|sh)$/.test(f)) files.push(full);
    }
  })(root);
  for (const f of files) {
    fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      if (DASH.test(l)) fail(`em dash in ${path.relative(root, f)}:${i + 1}`);
    });
  }
}

/* ---------------------------------------------------- report */

console.log(`${ids.length} molecules, ${App.STEPS.length} steps, ${qids.size} questions ` +
            `(${App.GRADED} graded per attempt, none asking for a calculation), ${ANCHORS.length} textbook anchors.`);
if (problems.length) {
  console.log('\nPROBLEMS:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('All checks passed.');

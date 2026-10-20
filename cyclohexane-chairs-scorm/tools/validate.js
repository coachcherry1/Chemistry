/* tools/validate.js: chemistry and item-bank checks. Run after ANY edit to
 * the A-values, a molecule, a step or a question.
 *
 *   node tools/validate.js
 *
 * Exits non-zero if the activity would teach something that disagrees with
 * its own model: a chair that is not staggered, a ring flip that moves a
 * group to the other face, an axial group that crowds the wrong H atoms, a
 * prediction key or quiz answer that the model contradicts, a build that
 * accepts a wrong answer.
 */
const fs = require('fs');
const path = require('path');

/* just enough of a browser for the data and logic files to load */
global.window = { addEventListener() {}, matchMedia() { return { matches: false }; } };
global.document = { addEventListener() {} };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const src = path.join(__dirname, '..', 'src', 'js');
for (const f of ['groups.js', 'chair.js', 'molecules.js', 'avalues.js', 'draw.js', 'quiz.js', 'scorm.js', 'app.js']) {
  (0, eval)(fs.readFileSync(path.join(src, f), 'utf8'));
}

const problems = [];
const fail = (msg) => problems.push(msg);
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
const V = CHAIR.vec;
const ax = (pos, k) => CHAIR.isAxial(pos, k);
const up = (pos) => CHAIR.faceOf(pos) === 't';
const E = (id, k) => AVAL.energy(molecule(id), k);

/* ---------------------------------------------------- the chair itself */

for (const k of [0, 1]) {
  const r = CHAIR.ringAt(k);
  for (let i = 0; i < 6; i++) {
    const a = r[(i + 5) % 6], b = r[i], c = r[(i + 1) % 6], d = r[(i + 2) % 6];
    if (!near(V.dist(b, c), 1.54, 1e-3)) fail(`chair ${k + 1}: C${i + 1}–C${(i + 1) % 6 + 1} is ${V.dist(b, c).toFixed(3)} Å`);
    if (!near(CHAIR.angleAt(a, b, c), 109.47, 0.05)) fail(`chair ${k + 1}: angle at C${i + 1} is ${CHAIR.angleAt(a, b, c).toFixed(2)}°`);
    const tor = Math.abs(CHAIR.torsion(b, c, d, r[(i + 3) % 6]));
    if (!near(tor, 60, 0.5)) fail(`chair ${k + 1}: ring bond C${(i + 1) % 6 + 1}–C${(i + 2) % 6 + 1} is not staggered (${tor.toFixed(1)}°)`);
  }
  /* one axial and one equatorial position on every carbon, axial along the ring axis */
  const dirs = CHAIR.slotDirs(r);
  for (let c = 1; c <= 6; c++) {
    const n = ['t', 'b'].filter((f) => ax(c + f, k)).length;
    if (n !== 1) fail(`chair ${k + 1}: C${c} has ${n} axial positions`);
    for (const f of ['t', 'b']) {
      const z = dirs[c - 1][f][2];
      if (ax(c + f, k) && !near(Math.abs(z), 1, 1e-6)) fail(`chair ${k + 1}: axial ${c}${f} is not parallel to the ring axis`);
      if (!ax(c + f, k) && !near(Math.abs(z), 1 / 3, 1e-3)) fail(`chair ${k + 1}: equatorial ${c}${f} does not tilt by the tetrahedral amount`);
      if ((z > 0) !== (f === 't')) fail(`chair ${k + 1}: the ${f === 't' ? 'top' : 'bottom'} position on C${c} points the wrong way`);
    }
  }
}
/* axial positions alternate: C1, C3, C5 up in chair 1 */
for (let c = 1; c <= 6; c++) {
  if (ax(c + 't', 0) !== (c % 2 === 1)) fail(`chair 1: C${c}'s axial position should point ${c % 2 ? 'up' : 'down'}`);
}

/* ---------------------------------------------------- the ring flip */

for (const pos of CHAIR.POSITIONS) {
  if (ax(pos, 0) === ax(pos, 1)) fail(`ring flip: ${pos} is ${ax(pos, 0) ? 'axial' : 'equatorial'} in both chairs`);
}
for (let i = 0; i <= 40; i++) {
  const t = i / 40, r = CHAIR.ringAt(t);
  for (let j = 0; j < 6; j++) {
    if (!near(V.dist(r[j], r[(j + 1) % 6]), 1.54, 1e-3)) { fail(`ring flip: a bond changes length at t = ${t}`); break; }
  }
  /* a group never changes face during the flip */
  const dirs = CHAIR.slotDirs(r);
  for (let c = 1; c <= 6; c++) {
    if (!(dirs[c - 1].t[2] > dirs[c - 1].b[2])) { fail(`ring flip: C${c}'s top and bottom positions cross at t = ${t}`); break; }
  }
}
{
  const r = CHAIR.ringAt(0.5);
  const tor23 = CHAIR.torsion(r[0], r[1], r[2], r[3]), tor56 = CHAIR.torsion(r[3], r[4], r[5], r[0]);
  if (!near(tor23, 0, 0.5) || !near(tor56, 0, 0.5)) fail('boat: C2–C3 and C5–C6 should be eclipsed');
  if (!(r[0][2] > r[1][2] && r[3][2] > r[2][2])) fail('boat: C1 and C4 should both point up');
  const boat = CHAIR.model(molecule('cyclohexane'), 0.5);
  const hh = CHAIR.contacts(boat).filter((c) => /^\d[tb]$/.test(c.a) && /^\d[tb]$/.test(c.b));
  if (!hh.length || [hh[0].a, hh[0].b].sort().join() !== '1t,4t') fail('boat: the flagpole H atoms (1t, 4t) should be the most crowded pair');
}
/* the chair drawing of chair 2 is the mirror image of chair 1's, with C1 still at the right */
{
  const p0 = CHAIR.project(CHAIR.model(molecule('cyclohexane'), 0));
  const p1 = CHAIR.project(CHAIR.model(molecule('cyclohexane'), 1));
  const mirror = { 1: 4, 2: 3, 3: 2, 4: 1, 5: 6, 6: 5 };
  for (let c = 1; c <= 6; c++) {
    const a = p1['C' + c], b = p0['C' + mirror[c]];
    if (!near(a.x, -b.x, 1e-6) || !near(a.y, b.y, 1e-6)) { fail(`drawing: chair 2 is not the mirror image of chair 1 at C${c}`); break; }
  }
  for (const k of [0, 1]) {
    const m = CHAIR.model(molecule('cyclohexane'), k), P = CHAIR.project(m);
    const xs = [1, 2, 3, 4, 5, 6].map((c) => P['C' + c].x);
    if (Math.max(...xs) !== P.C1.x) fail(`drawing: C1 is not the right-hand end of chair ${k + 1}`);
    for (const pos of CHAIR.POSITIONS) {
      const c = CHAIR.carbonOf(pos), a = P['C' + c], b = P[pos];
      const dx = b.x - a.x, dy = b.y - a.y;
      if (ax(pos, k) && Math.abs(dx) > 1e-6) fail(`drawing: axial ${pos} is not vertical in chair ${k + 1}`);
      if (!ax(pos, k)) {
        /* equatorial bonds are parallel to the ring bonds once removed */
        const i = c - 1, q = P['C' + ((i + 1) % 6 + 1)], r = P['C' + ((i + 2) % 6 + 1)];
        const ex = r.x - q.x, ey = r.y - q.y;
        if (Math.abs(dx * ey - dy * ex) / Math.hypot(dx, dy) / Math.hypot(ex, ey) > 1e-6) {
          fail(`drawing: equatorial ${pos} is not parallel to C${(i + 1) % 6 + 1}–C${(i + 2) % 6 + 1} in chair ${k + 1}`);
        }
      }
    }
  }
}

/* ---------------------------------------------------- 1,3-diaxial crowding */

/* An axial group crowds exactly the two axial H atoms on its face, two
   carbons away; a small equatorial group crowds nothing at all. */
const keys = (o) => Object.keys(o).sort().join();
for (const id of ['methyl', 'chloro', 'bromo', 'isopropyl', 'tertbutyl']) {
  const m1 = CHAIR.model(molecule(id), 0), m2 = CHAIR.model(molecule(id), 1);
  if (!ax('1t', 0) || ax('1t', 1)) fail(`${id}: the group should start axial`);
  if (keys(CHAIR.crowdedBy(m1, '1t')) !== CHAIR.synAxial('1t').sort().join()) {
    fail(`${id}: axial, it crowds ${keys(CHAIR.crowdedBy(m1, '1t')) || 'nothing'}, not the axial H atoms on C3 and C5`);
  }
  if (Object.keys(CHAIR.crowdedBy(m2, '1t')).length) fail(`${id}: equatorial, it has a 1,3-diaxial contact`);
  if (['methyl', 'chloro', 'bromo'].includes(id)) {
    if (Object.keys(CHAIR.crowdedBy(m1, '1t', true)).length !== 2) fail(`${id}: axial, it touches H atoms other than the two on C3 and C5`);
    if (Object.keys(CHAIR.crowdedBy(m2, '1t', true)).length) fail(`${id}: equatorial, it touches an H atom`);
  }
}
if (CHAIR.contacts(CHAIR.model(molecule('cyclohexane'), 0)).length) fail('cyclohexane chair: no two atoms should crowd each other');
{
  /* axial CH₃ seen down C1–C2 and C1–C6: gauche to C3 and C5; equatorial: anti */
  const gapTo = (k, i, j, ring) => {
    const nm = CHAIR.newman(molecule('methyl'), k, i, j), all = nm.front.concat(nm.back);
    return CHAIR.gap(all.find((q) => q.pos === '1t').a, all.find((q) => q.ring === ring).a);
  };
  if (gapTo(0, 1, 2, 3) !== 60 || gapTo(0, 1, 6, 5) !== 60) fail('axial CH₃ is not gauche to C3 and C5');
  if (gapTo(1, 1, 2, 3) !== 180 || gapTo(1, 1, 6, 5) !== 180) fail('equatorial CH₃ is not anti to C3 and C5');
  for (const k of [0, 1]) for (let i = 1; i <= 6; i++) {
    const nm = CHAIR.newman(molecule('cyclohexane'), k, i, i % 6 + 1);
    const ok = nm.front.every((f) => nm.back.every((b) => [60, 180].includes(CHAIR.gap(f.a, b.a))));
    if (!ok) fail(`chair ${k + 1}: the Newman projection down C${i}–C${i % 6 + 1} is not staggered`);
  }
}

/* ---------------------------------------------------- A-values and energies */

const A = (g) => AVAL.aValue(g);
if (!near(A('CH3'), 2 * 3.8)) fail('axial CH₃ should cost two gauche-butane interactions, 2 × 3.8 kJ/mol (Klein)');
if (!(A('Cl') <= A('Br') + 0.01 && A('Br') < A('CH3') && A('CH3') < A('iPr') && A('iPr') < A('tBu'))) {
  fail('A-values are no longer ordered Cl ≈ Br < CH₃ < CH(CH₃)₂ < C(CH₃)₃');
}
if (!near(E('methyl', 0) - E('methyl', 1), A('CH3'))) fail('methylcyclohexane: the chairs do not differ by the A-value');
const share = (id) => AVAL.share(molecule(id), 1);
if (!(share('methyl') > 0.94 && share('methyl') < 0.97)) fail(`methylcyclohexane is ${(share('methyl') * 100).toFixed(1)}% equatorial, not about 95%`);
if (!(share('tertbutyl') > 0.9998)) fail('tert-butylcyclohexane is not essentially all equatorial');
if (AVAL.better(molecule('trans14')) !== 1 || AVAL.better(molecule('cis14')) !== -1 ||
    AVAL.better(molecule('cis13')) !== 1 || AVAL.better(molecule('trans13')) !== -1 || AVAL.better(molecule('cisTM')) !== 1) {
  fail('the more stable chair of a disubstituted molecule has changed');
}
/* The A-values are the Newman packages' 1,3-diaxial values doubled, so the
   two activities agree. Checked when the Newman package sits next door. */
{
  const strain = path.join(__dirname, '..', '..', 'newman-projections-qualitative-scorm', 'src', 'js', 'strain.js');
  if (fs.existsSync(strain)) {
    const S = (0, eval)(fs.readFileSync(strain, 'utf8') + '\nSTRAIN');
    for (const g of ['Cl', 'Br', 'iPr', 'tBu', 'CH3']) {
      const row = S.ROWS.find((r) => [r[0], r[1]].sort().join() === [g, 'CH3'].sort().join());
      if (!row) continue;
      if (!near(A(g), 2 * row[3])) fail(`A-value of ${g} (${A(g)}) is not twice the Newman strain table's gauche value (${row[3]})`);
    }
  }
}

/* ---------------------------------------------------- molecules */

/* Two drawings show the same compound if one is the other turned round in
   the plane (renumbering) or turned over (renumbering backwards and swapping
   the faces). Mirror images stay different. */
function canonical(id) {
  const gs = MOLECULES.groups(molecule(id));
  const out = [];
  for (const d of [1, -1]) for (let r = 0; r < 6; r++) {
    out.push(gs.map((g) => {
      const c = ((d * (g.c - 1) + r) % 6 + 6) % 6 + 1;
      const f = d === 1 ? g.f : g.f === 't' ? 'b' : 't';
      return c + f + g.g;
    }).sort().join(','));
  }
  return out.sort()[0];
}
for (const id of ['trans14', 'cis14', 'cis13', 'trans13', 'cisTM', 'transTM']) {
  const m = molecule(id), gs = MOLECULES.groups(m);
  const same = gs[0].f === gs[1].f;
  if ((m.rel === 'cis') !== same) fail(`${id} is called ${m.rel} but its groups are on ${same ? 'the same face' : 'opposite faces'}`);
}

/* ---------------------------------------------------- steps */

const S = (id) => App.STEPS.find((s) => s.id === id);
const P = App.PREDICT;
const key = (p) => p.choices[p.answer];

/* builds: every way of putting the tiles on the slots is checked, and only
   the right one is accepted */
for (const s of App.STEPS.filter((x) => x.kind === 'build')) {
  const m = molecule(s.mol);
  const want = {};
  s.slots.forEach((p) => { want[p] = MOLECULES.groupAt(m, CHAIR.carbonOf(p), CHAIR.faceOf(p)); });
  const tiles = s.slots.map((p) => want[p]);
  const perms = (arr) => arr.length <= 1 ? [arr] :
    arr.flatMap((x, i) => perms(arr.slice(0, i).concat(arr.slice(i + 1))).map((q) => [x].concat(q)));
  const seen = new Set();
  let accepted = 0;
  for (const q of perms(tiles)) {
    const k = q.join();
    if (seen.has(k)) continue;
    seen.add(k);
    const got = {};
    s.slots.forEach((p, i) => { got[p] = q[i]; });
    const r = App.judgeBuild(s, m, got, want);
    if (r.ok) accepted++;
    else if (!r.msg) fail(`${s.id}: a wrong build gets no feedback`);
  }
  if (accepted !== 1) fail(`${s.id}: ${accepted} arrangements accepted, expected exactly 1`);
}
{
  const s = S('build-flip');
  if (ax('1t', s.k) || !ax('1b', s.k)) fail('build-flip: in chair 2 the CH₃ should be equatorial and the H axial');
  const f = S('build-flat');
  if (!ax('1t', f.k) || !ax('4b', f.k)) fail('build-flat: in the template chair both CH₃ groups of trans-1,4 should be axial');
}

/* prediction keys */
if (key(P.axialC2) !== (ax('2b', 0) ? 'Down' : 'Up')) fail('updown: the key for C2’s axial H is wrong');
if (!(ax('1t', 0) && !ax('1b', 0)) || key(P.eqC1) !== 'Out, and slightly down') fail('updown: the key for C1’s equatorial H is wrong');
if (key(P.flip) !== (ax('1t', 1) ? 'Axial' : 'Equatorial') + ', still pointing up') fail('flip: the key for the red H is wrong');
if (AVAL.better(molecule('methyl')) !== 1 || !/equatorial/.test(key(P.lower))) fail('compare: the key for the lower chair is wrong');
if (Object.keys(CHAIR.crowdedBy(CHAIR.model(molecule('methyl'), 1), '1t', true)).length !== 0 || key(P.count) !== 'None') {
  fail('compare: an equatorial CH₃ should crowd no H atoms');
}
if (!/^Gauche/.test(key(P.gauche)) || key(P.c1c6) !== 'C5') fail('newman: a prediction key is wrong');
for (const x of MOLECULES.SWAP_ORDER) {
  const want = A(x) < A('CH3') ? 0 : A(x) - A('CH3') < 5 ? 1 : 2;
  if (App.swapAnswer(x) !== want) fail(`swap: the key for ${x} is wrong`);
}
if (!App.SWAP_NOTES.Cl.includes(AVAL.shareText(share('chloro')))) fail('swap: the Cl note quotes the wrong share');
if (!App.SWAP_NOTES.tBu.toLowerCase().includes(AVAL.shareText(share('tertbutyl')))) fail('swap: the C(CH₃)₃ note quotes the wrong share');
if (!App.SWAP_NOTES.Cl.includes(GROUPS.Cl.bond.toFixed(2)) || !App.SWAP_NOTES.Br.includes(GROUPS.Br.bond.toFixed(2))) {
  fail('swap: a note quotes the wrong bond length');
}
for (const b of App.BEST) {
  if (App.bestAnswer(b) !== 0) fail(`best: the first choice for ${b.id} is not the right one`);
  if (b.id === 'cisTM' && !(b.note.includes(AVAL.fmt(A('tBu'))) && b.note.includes(AVAL.fmt(A('CH3'))))) fail('best: the cisTM note quotes the wrong A-values');
}
if (key(P.flat) !== 'Angle strain and torsional strain' || key(P.boat) !== 'The chair' || !/^No/.test(key(P.cistrans))) {
  fail('a prediction key in parts 1 or 4 has changed');
}

/* ---------------------------------------------------- quiz bank */

const ids = new Set();
for (const k of Object.keys(QUIZZES)) {
  const Q = QUIZZES[k];
  if (Q.pool.length < Q.draw) fail(`quiz ${k}: pool of ${Q.pool.length} is smaller than the draw of ${Q.draw}`);
  for (const c of Q.core) if (!Q.pool.some((q) => q.id === c)) fail(`quiz ${k}: core question ${c} is not in the pool`);
  if (Q.core.length > Q.draw) fail(`quiz ${k}: more core questions than the draw`);
  for (const q of Q.pool) {
    if (ids.has(q.id)) fail(`duplicate question id ${q.id}`);
    ids.add(q.id);
    if (q.choices.length < 2 || q.choices.length > 4) fail(`${q.id}: ${q.choices.length} choices`);
    if (!q.why) fail(`${q.id}: no explanation`);
    if (/[^A-Za-z0-9-]/.test(q.id)) fail(`${q.id}: ids must be letters, digits and hyphens (they become SCORM interaction ids)`);
    /* this package never asks for a number */
    for (const c of q.choices) if (typeof c === 'string' && /\d\s*kJ/.test(c)) fail(`${q.id}: choice "${c}" is an energy`);
    if (/\d\s*kJ/.test(q.q)) fail(`${q.id}: the question quotes an energy, so reword it to compare instead`);
    const figs = [q.fig].concat(q.choices.filter((c) => typeof c !== 'string')).filter(Boolean);
    for (const f of figs) {
      const id = f.chair || f.flat || f.newman;
      if (!f.boat && !MOLECULES[id]) fail(`${q.id}: figure uses unknown molecule ${id}`);
      for (const p of Object.keys(f.letters || {}).concat(Object.keys(f.mark || {}))) {
        if (!CHAIR.POSITIONS.includes(p)) fail(`${q.id}: figure marks unknown position ${p}`);
        if (f.show && f.show !== 'all' && !f.show.includes(p)) fail(`${q.id}: figure letters a position it does not draw`);
      }
    }
    for (const st of q.struct || []) if (!MOLECULES[st]) fail(`${q.id}: unknown molecule ${st}`);
    const texts = q.choices.map((c) => typeof c === 'string' ? c : JSON.stringify(c));
    if (new Set(texts).size !== texts.length) fail(`${q.id}: duplicate choices`);
  }
}

/* "Which chair is ...?" questions, answered from the model. */
for (const k of Object.keys(QUIZZES)) for (const q of QUIZZES[k].pool) {
  if (typeof q.choices[0] === 'string' || !q.choices[0].chair) continue;
  const ch = q.choices;
  if (q.fig && q.fig.flat) {
    const want = canonical(q.fig.flat);
    const lowest = (c) => AVAL.energy(molecule(c.chair), c.k) <= AVAL.energy(molecule(c.chair), 1 - c.k) + 0.01;
    const rightBy = (c) => canonical(c.chair) === want && (q.id !== 'd-best-drawing' || lowest(c));
    if (!rightBy(ch[0])) fail(`${q.id}: the first (correct) choice does not show the drawn molecule`);
    if (ch.slice(1).some(rightBy)) fail(`${q.id}: a wrong choice also shows the drawn molecule`);
  } else {
    const e0 = AVAL.energy(molecule(ch[0].chair), ch[0].k);
    if (ch.slice(1).some((c) => c.chair !== ch[0].chair || AVAL.energy(molecule(c.chair), c.k) <= e0)) {
      fail(`${q.id}: the first choice is not the lowest-energy chair of the same molecule`);
    }
  }
}

/* Questions whose answer depends on the model. If you change the geometry or
   the A-values, these tell you which question text to update. */
const syn = CHAIR.synAxial('1t').sort().join();
const Qn = (id) => Object.keys(QUIZZES).map((k) => QUIZZES[k].pool.find((q) => q.id === id)).find(Boolean);
/* the position a figure gives a letter, read from the question itself */
const at = (id, letter) => Object.keys(Qn(id).fig.letters).find((p) => Qn(id).fig.letters[p] === letter);
const checks = {
  'a-spot-axial': () => { const L = Qn('a-spot-axial').fig.letters;
                          return Object.keys(L).filter((p) => ax(p, 0)).map((p) => L[p]).join() === Qn('a-spot-axial').choices[0]; },
  'a-is-this': () => ax(at('a-is-this', 'X'), 0) && !up(at('a-is-this', 'X')) &&
                     /^Axial, pointing down/.test(Qn('a-is-this').choices[0]),
  'a-alternate': () => ax('1t', 0) && ax('4b', 0),
  'a-eq-dir': () => ax('1t', 0) && !ax('1b', 0),
  'a-faces': () => CHAIR.POSITIONS.filter(up).length === 6 && CHAIR.POSITIONS.filter((p) => up(p) && ax(p, 0)).length === 3,
  'a-newman': () => true,   /* checked above: every ring bond staggered */
  'a-each': () => true,
  'b-ax-to-eq': () => CHAIR.POSITIONS.every((p) => ax(p, 0) !== ax(p, 1)),
  'b-up-stays': () => true, /* checked above: no position changes face */
  'b-methyl-after': () => ax('1t', 0) && !ax('1t', 1),
  'b-letter': () => { const p = at('b-letter', 'A');
                      return Qn('b-letter').choices[0] === (ax(p, 1) ? 'Axial' : 'Equatorial') + ', pointing ' +
                        (ax(p, 1) ? '' : 'slightly ') + (up(p) ? 'up' : 'down') && ax(p, 0) !== ax(p, 1); },
  'b-eq-down': () => CHAIR.POSITIONS.filter((p) => !up(p) && !ax(p, 0)).every((p) => ax(p, 1)),
  'b-same': () => near(E('cyclohexane', 0), E('cyclohexane', 1)),
  'b-all': () => CHAIR.POSITIONS.filter((p) => ax(p, 0)).every((p) => !ax(p, 1)),
  'c-which-h': () => { const L = Qn('c-which-h').fig.letters;
                       const hit = Object.keys(L).filter((p) => CHAIR.synAxial('1t').includes(p)).map((p) => L[p]).sort();
                       return hit.join(' and ') === Qn('c-which-h').choices[0]; },
  'c-why-eq': () => E('methyl', 0) > E('methyl', 1),
  'c-rank': () => A('Br') < A('CH3') && A('CH3') < A('iPr') && A('iPr') < A('tBu'),
  'c-tbu': () => share('tertbutyl') > 0.999,
  'c-br': () => A('Br') < A('CH3') && GROUPS.Br.bond > GROUPS.CH3.bond,
  'c-newman': () => true,   /* checked above: axial CH₃ gauche to C3 */
  'c-same': () => near(A('CH3') / 2, 3.8),
  'c-eq-none': () => !Object.keys(CHAIR.crowdedBy(CHAIR.model(molecule('methyl'), 1), '1t', true)).length,
  'c-mostly': () => share('methyl') > 0.9,
  'c-ipr': () => A('iPr') - A('CH3') < 2 && A('tBu') - A('iPr') > 10,
  'c-tbu-why': () => Object.values(CHAIR.crowdedBy(CHAIR.model(molecule('tertbutyl'), 0), '1t'))[0] >
                     Object.values(CHAIR.crowdedBy(CHAIR.model(molecule('isopropyl'), 0), '1t'))[0],
  'c-table': () => ['CH3', 'iPr', 'tBu'].every((g) => A('Cl') < A(g)),
  'c-name': () => true,
  'd-bigger': () => !ax('1t', AVAL.better(molecule('cisTM'))) && ax('4t', AVAL.better(molecule('cisTM'))),
  'd-tm-axial': () => !ax('1t', AVAL.better(molecule('cisTM'))),
  'd-cis-trans': () => true,
  'd-cis14': () => AVAL.better(molecule('cis14')) === -1 && [0, 1].every((k) => ax('1t', k) !== ax('4t', k)),
  'd-cis13': () => [ '1t', '3t' ].every((p) => !ax(p, AVAL.better(molecule('cis13')))),
  'd-cis13-worst': () => AVAL.chair(molecule('cis13'), 0).parts.some((x) => x.label === 'CH₃/CH₃'),
  'd-both-eq': () => [0, 1].some((k) => !ax('1t', k) && !ax('4b', k)) &&
                     ![0, 1].some((k) => !ax('1t', k) && !ax('4t', k)) && ![0, 1].some((k) => !ax('1t', k) && !ax('3b', k)),
  'd-identify': () => !ax('1t', 1) && !ax('4b', 1),
  'd-rule': () => true
};
for (const id of Object.keys(checks)) {
  if (!ids.has(id)) { fail(`check for unknown question ${id}`); continue; }
  if (!checks[id]()) fail(`question ${id} no longer matches the model, so update its text`);
}

/* ---------------------------------------------------- no em dashes */

/* Nothing a student or teacher reads may contain an em dash. */
{
  const root = path.join(__dirname, '..');
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

console.log(`${Object.keys(MOLECULES).length} molecules, ${App.STEPS.length} steps, ${ids.size} questions ` +
            `(${App.GRADED} graded per attempt, none asking for a calculation), ${AVAL.ROWS.length} A-values.`);
if (problems.length) {
  console.log('\nPROBLEMS:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('All checks passed.');

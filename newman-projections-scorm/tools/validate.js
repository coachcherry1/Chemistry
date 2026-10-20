/* tools/validate.js: chemistry and item-bank checks. Run after ANY edit to
 * the strain table, a molecule or a question.
 *
 *   node tools/validate.js
 *
 * Exits non-zero if the activity would teach something that disagrees with
 * its own model: a curve whose valleys are not staggered, a quiz answer that
 * no longer matches the strain table, a build that accepts a wrong molecule.
 */
const fs = require('fs');
const path = require('path');

/* just enough of a browser for the data and logic files to load */
global.window = { addEventListener() {} };
global.document = { addEventListener() {} };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
const src = path.join(__dirname, '..', 'src', 'js');
for (const f of ['groups.js', 'strain.js', 'geometry.js', 'molecules.js', 'draw.js', 'quiz.js', 'scorm.js', 'app.js']) {
  (0, eval)(fs.readFileSync(path.join(src, f), 'utf8'));
}

const problems = [];
const fail = (msg) => problems.push(msg);
const near = (a, b, tol = 0.05) => Math.abs(a - b) <= tol;
const E = (id, phi) => GEOM.energyAt(molecule(id), phi);
const mols = Object.keys(MOLECULES).filter((k) => MOLECULES[k].front);

/* ---------------------------------------------------- Klein's numbers */

[[0, 12], [60, 0], [120, 12], [180, 0]].forEach(([p, e]) => {
  if (!near(E('ethane', p), e)) fail(`ethane at ${p}° is ${E('ethane', p).toFixed(2)}, Klein says ${e}`);
});
[[0, 19], [60, 3.8], [120, 16], [180, 0], [240, 16], [300, 3.8]].forEach(([p, e]) => {
  if (!near(E('butane', p), e)) fail(`butane at ${p}° is ${E('butane', p).toFixed(2)}, Klein says ${e}`);
});

/* ---------------------------------------------------- drawing convention */

for (const id of mols) {
  const m = molecule(id);
  const nm = GEOM.newmanOf(m);
  const at = (side, role) => nm[side].find((q) => q.role === role).a;
  const want = { front: { anchor: 0, dash: 120, wedge: 240 }, back: { anchor: 180, dash: 60, wedge: 300 } };
  for (const side of ['front', 'back']) for (const role of ['anchor', 'dash', 'wedge']) {
    if (at(side, role) !== want[side][role]) {
      fail(`${id}: ${side} ${role} lands at ${at(side, role)}°, expected ${want[side][role]}° ` +
           '(wedges left, dashes right, chain anti)');
    }
  }
  for (const side of ['front', 'back']) for (const role of ['anchor', 'dash', 'wedge']) {
    if (!GROUPS[m[side][role]]) fail(`${id}: unknown group ${m[side][role]}`);
  }
}

/* ---------------------------------------------------- curve shape */

for (const id of mols) {
  const m = molecule(id);
  let named;
  try { named = namedEnergies(m); } catch (e) { fail(`${id}: ${e.message}`); continue; }
  const best = bestStaggered(m);
  const N = 3600, v = [];
  for (let i = 0; i < N; i++) v.push(GEOM.energyAt(m, i / 10));
  let gmin = Infinity, gminAt = 0;
  for (let i = 0; i < N; i++) {
    const a = v[(i + N - 1) % N], b = v[i], c = v[(i + 1) % N];
    const phi = i / 10;
    const d60 = Math.abs(((phi % 60) + 60) % 60);
    const off = Math.min(d60, 60 - d60);
    const nearest = Math.round(phi / 60) * 60 % 360;
    if (b < a && b <= c) {
      if (off > 12 || nearest % 120 === 0) fail(`${id}: a valley at ${phi}° is not at a staggered angle`);
    }
    if (b > a && b >= c) {
      if (off > 12 || nearest % 120 !== 0) fail(`${id}: a peak at ${phi}° is not at an eclipsed angle`);
    }
    if (b < gmin) { gmin = b; gminAt = phi; }
  }
  if (gmin < best.e - 0.5) fail(`${id}: curve dips to ${gmin.toFixed(2)}, below its best staggered value ${best.e}`);
  if (STRAIN.gap(gminAt, best.phi) > 8 && !named.some((n) => n.phi % 120 && near(n.e, best.e) && STRAIN.gap(gminAt, n.phi) <= 8)) {
    fail(`${id}: lowest point at ${gminAt}° is more than 8° from the lock-in target ${best.phi}°`);
  }
  const maxStag = Math.max(...named.filter((n) => n.phi % 120).map((n) => n.e));
  const minEcl = Math.min(...named.filter((n) => n.phi % 120 === 0).map((n) => n.e));
  if (maxStag >= minEcl) fail(`${id}: a staggered conformation (${maxStag}) is not below every eclipsed one (${minEcl})`);
}

/* ---------------------------------------------------- either end of the bond */

/* Looking from the other end changes the picture, never the molecule: the
   energy at every dihedral angle must be the same, and the front carbon must
   be the one at the eye. */
for (const id of mols.filter((k) => MOLECULES[k].eye === 'right')) {
  const R = molecule(id), L = molecule(MOLECULES[id].base);
  for (let p = 0; p < 360; p += 5) {
    if (!near(GEOM.energyAt(R, p), GEOM.energyAt(L, p), 1e-6)) { fail(`${id}: energy at ${p}° differs from ${L.id}`); break; }
  }
  if (GEOM.phi0(R) !== GEOM.phi0(L)) fail(`${id}: drawn conformation differs from ${L.id}`);
  if (R.carbons[0] !== L.carbons[1]) fail(`${id}: the front carbon should be ${L.carbons[1]}`);
}

/* Two Newman descriptions show the same thing if one is the other turned as
   a whole (by 120° steps: front positions stay front positions). */
function key(nm, turn) {
  const at = (side) => nm[side].map((q) => GEOM.wrap(q.a + turn) + ':' + GROUPS[q.g].label + (q.g === 'Hr' || q.g === 'Hb' ? q.g : ''))
    .sort().join(',');
  return at('front') + '|' + at('back');
}
function sameView(a, b) { return [0, 120, 240].some((t) => key(a, t) === key(b, 0)); }

/* ---------------------------------------------------- the A / B pair */

for (const x of MOLECULES.HALOGENS) {
  const A = molecule('pairA_' + x), B = molecule('pairB_' + x);
  const ch3 = (m, phi) => {
    const nm = GEOM.newmanAt(m, phi);
    const f = nm.front.find((q) => q.role === 'anchor').a, b = nm.back.find((q) => q.role === 'anchor').a;
    return STRAIN.gap(f, b);
  };
  if (ch3(A, 180) !== 180) fail(`pairA_${x}: with the halogens anti, the CH₃ groups are not anti`);
  if (ch3(B, 180) !== 60) fail(`pairB_${x}: with the halogens anti, the CH₃ groups are not gauche`);
  const nm = GEOM.newmanOf(A);
  const centro = nm.front.every((q) => nm.back.some((r) => r.g === q.g && STRAIN.gap(r.a, q.a + 180) === 0));
  if (!centro) fail(`pairA_${x} is not centrosymmetric in the drawn conformation, so it is not the meso compound`);
  if (bestStaggered(A).phi !== 180 || bestStaggered(B).phi !== 180) fail(`pair ${x}: halogens-anti is not the best conformation`);
}

/* ---------------------------------------------------- builds */

const builds = App.STEPS.filter((s) => s.kind === 'build');
for (const s of builds) {
  const m = molecule(s.mol);
  const want = App.targetSlots(m);
  if (want.length !== 6) { fail(`${s.id}: target has ${want.length} positions`); continue; }
  const rot = (a, k) => [a[k % 3], a[(k + 1) % 3], a[(k + 2) % 3]];
  for (let k = 0; k < 3; k++) {
    const turned = rot(want.slice(0, 3), k).concat(rot(want.slice(3), k));
    if (!App.judgeBuild(m, turned, want).ok) fail(`${s.id}: the answer turned ${k * 120}° as a whole is rejected`);
  }
  /* every other arrangement of the same six groups must be rejected */
  const perms = (arr) => arr.length <= 1 ? [arr] :
    arr.flatMap((x, i) => perms(arr.slice(0, i).concat(arr.slice(i + 1))).map((p) => [x].concat(p)));
  const seen = new Set();
  let accepted = 0;
  for (const p of perms(want)) {
    const key = p.join();
    if (seen.has(key)) continue;
    seen.add(key);
    const r = App.judgeBuild(m, p, want);
    if (r.ok) accepted++;
    else if (!r.msg) fail(`${s.id}: a wrong build gets no feedback`);
  }
  let distinct = new Set();
  for (let k = 0; k < 3; k++) distinct.add(rot(want.slice(0, 3), k).concat(rot(want.slice(3), k)).join());
  if (accepted !== distinct.size) fail(`${s.id}: ${accepted} arrangements accepted, expected ${distinct.size}`);
}

/* ---------------------------------------------------- predictions */

for (const s of App.STEPS.filter((x) => x.kind === 'find')) {
  const m = molecule(s.mol);
  const best = bestStaggered(m);
  const nm = GEOM.newmanAt(m, best.phi);
  if (s.id === 'find-bromo') {
    /* "which group on C2 is anti to the CH₃ on C3", whichever end the eye is at */
    const c2 = m.carbons[0] === 'C2' ? 'front' : 'back', c3 = c2 === 'front' ? 'back' : 'front';
    const ch3 = nm[c3].find((q) => q.role === 'anchor').a;
    const anti = nm[c2].find((q) => STRAIN.gap(q.a, ch3 + 180) === 0).g;
    const label = GROUPS[anti].label;
    if (s.predict.choices[s.predict.answer] !== label) fail(`find-bromo: model says ${label} is anti, prediction key says ${s.predict.choices[s.predict.answer]}`);
  }
  if (s.id === 'find-dmb') {
    const n = best.parts.filter((p) => p.label === 'CH₃/CH₃' && p.kind === 'gauche').reduce((a, p) => a + p.n, 0);
    if (String(n) !== s.predict.choices[s.predict.answer]) fail(`find-dmb: best has ${n} CH₃/CH₃ gauche, key says ${s.predict.choices[s.predict.answer]}`);
  }
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
    const figs = [q.fig].concat(q.choices.filter((c) => typeof c !== 'string')).filter(Boolean);
    for (const f of figs) {
      const id = f.newman || f.zigzag || f.graph;
      if (!MOLECULES[id] || !MOLECULES[id].front) fail(`${q.id}: figure uses unknown molecule ${id}`);
    }
    for (const st of q.struct || []) if (!SKELETAL[st]) fail(`${q.id}: unknown bond-line structure ${st}`);
    const texts = q.choices.map((c) => typeof c === 'string' ? c : JSON.stringify(c));
    if (new Set(texts).size !== texts.length) fail(`${q.id}: duplicate choices`);
  }
}

/* Questions whose answer is a number or a picture from the model. If you
   change the strain table, these tell you which question text to update. */
const fmt = STRAIN.fmt;
const over = (g, bond) => GROUPS[g].radius + GROUPS.CH3.radius - GEOM.contact(bond || GROUPS[g].bond, GROUPS.CH3.bond, 60);
const checks = {
  'c-longbond': () => GEOM.contact(GROUPS.Br.bond, 1.54, 60) > GEOM.contact(GROUPS.CH3.bond, 1.54, 60) &&
                      near(GEOM.contact(GROUPS.Br.bond, 1.54, 60), 3.18, 0.005) && near(GEOM.contact(1.54, 1.54, 60), 2.95, 0.005),
  'c-methylsize': () => GROUPS.CH3.radius >= GROUPS.Br.radius && GROUPS.CH3.bond < GROUPS.Br.bond &&
                        over('CH3') > over('Br'),
  'c-hypo': () => over('Br', GROUPS.CH3.bond) > over('Br'),
  'c-iodine': () => near(over('I'), over('Cl'), 0.05) && near(STRAIN.pair('I', 'CH3').gau, STRAIN.pair('Cl', 'CH3').gau),
  'd-eye': () => true,     /* checked above: only the first choice matches the drawing */
  'a-each': () => near(STRAIN.pair('H', 'H').ecl, 4) && near(E('ethane', 0), 12),
  'a-count': () => namedEnergies(molecule('ethane')).filter((n) => near(n.e, 12)).length === 3,
  'b-lowest': () => bestStaggered(molecule('butane')).phi === 180,
  'b-highest': () => namedEnergies(molecule('butane')).every((n) => E('butane', 0) >= n.e),
  'b-calc': () => near(E('butane', 120), 16),
  'b-total': () => near(STRAIN.pair('CH3', 'CH3').ecl, 11) && near(STRAIN.pair('H', 'CH3').ecl, 6),
  'b-count': () => GEOM.breakdownAt(molecule('butane'), 300).some((p) => p.label === 'CH₃/CH₃' && p.n === 1),
  'b-true': () => true,       /* covered by the curve-shape check above */
  'c-best': () => bestStaggered(molecule('bromobutane')).phi === 180 && near(E('bromobutane', 60), 3.8),
  'c-rank': () => STRAIN.pair('Br', 'CH3').gau < 3.8 && 3.8 < STRAIN.pair('iPr', 'CH3').gau &&
                  STRAIN.pair('iPr', 'CH3').gau < STRAIN.pair('tBu', 'CH3').gau,
  'c-tbu': () => bestStaggered(molecule('trimethylpentane')).phi === 60,
  'c-ipr': () => bestStaggered(molecule('dimethylpentane')).phi === 60 &&
                 near(STRAIN.pair('iPr', 'CH3').gau - 3.8, 0.8),
  'c-methylbutane': () => namedEnergies(molecule('methylbutane')).filter((n) => n.phi % 120)
                            .map((n) => fmt(n.e)).sort().join() === '3.8,3.8,7.6',
  'c-count': () => GEOM.breakdownAt(molecule('methylbutane'), 300).some((p) => p.label === 'CH₃/CH₃' && p.n === 2),
  'c-clbr': () => near(bestStaggered(molecule('chlorobutane')).e, bestStaggered(molecule('bromobutane')).e, 0.3),
  'd-dmb': () => near(bestStaggered(molecule('dimethylbutane')).e, 7.6),
  'd-dmb-calc': () => near(E('dimethylbutane', 180), 11.4),
  'd-AvsB': () => near(bestStaggered(molecule('pairB_Br')).e, 5.8) && near(bestStaggered(molecule('pairA_Br')).e, 2.0),
  'd-halo': () => STRAIN.pair('Cl', 'Cl').gau < STRAIN.pair('Br', 'Br').gau && STRAIN.pair('Br', 'Br').gau < STRAIN.pair('I', 'I').gau,
  'd-brbr': () => near(STRAIN.pair('Br', 'Br').gau, 7) && near(STRAIN.pair('Br', 'CH3').gau, 1)
};
for (const id of Object.keys(checks)) {
  if (!ids.has(id)) { fail(`check for unknown question ${id}`); continue; }
  if (!checks[id]()) fail(`question ${id} no longer matches the strain table, so update its text`);
}

/* ---------------------------------------------------- bond-line formulas */

/* Each bond-line formula must carry the same groups on the viewed bond as
   the molecule it stands for, and every molecule the swap step shows needs one. */
for (const id of Object.keys(SKELETAL)) {
  const sk = SKELETAL[id];
  if (!MOLECULES[id] || !MOLECULES[id].front) continue;
  const m = molecule(id);
  const [f, b] = sk.view;
  const heavy = (c) => {
    const out = sk.subs.filter((x) => x[0] === c).map((x) => x[1] === 'CH3' ? 'C' : x[1]);
    if (c - 1 >= 1 && c - 1 !== (c === f ? b : f)) out.push('C');
    if (c + 1 <= sk.n && c + 1 !== (c === f ? b : f)) out.push('C');
    return out.sort().join();
  };
  const fromMol = (side) => ['anchor', 'wedge', 'dash'].map((r) => m[side][r]).filter((g) => g !== 'H')
    .map((g) => ['CH3', 'iPr', 'tBu'].includes(g) ? 'C' : g).sort().join();
  if (heavy(f) !== fromMol('front') || heavy(b) !== fromMol('back')) {
    fail(`bond-line formula ${id} does not match the molecule on C${f}–C${b}`);
  }
}
for (const x of MOLECULES.SWAP_ORDER) {
  const id = { Br: 'bromobutane', Cl: 'chlorobutane', I: 'iodobutane', CH3: 'methylbutane',
               iPr: 'dimethylpentane', tBu: 'trimethylpentane' }[x];
  if (!SKELETAL[id]) fail(`swap step: no bond-line formula for ${id}`);
}

/* "Which projection does the eye see?" questions: exactly one choice may
   match the drawing in the figure. */
for (const k of Object.keys(QUIZZES)) for (const q of QUIZZES[k].pool) {
  if (!q.fig || !q.fig.zigzag || typeof q.choices[0] === 'string' || !q.choices[0].newman) continue;
  const m = molecule(q.fig.zigzag);
  const drawn = GEOM.newmanAt(m, GEOM.phi0(m));
  const hits = q.choices.map((c) => sameView(App.nmFor(c), drawn));
  if (!hits[0]) fail(`${q.id}: the first (correct) choice is not what the eye sees`);
  if (hits.slice(1).some(Boolean)) fail(`${q.id}: a wrong choice also matches the drawing`);
}

/* ---------------------------------------------------- no em dashes */

/* Nothing a student or teacher reads may contain an em dash. */
{
  const root = path.join(__dirname, '..');
  const DASH = new RegExp('\u2014|&' + 'mdash;');   /* split so this line does not match itself */
  const files = [];
  (function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) { if (f !== 'dist' && f[0] !== '.') walk(full); }
      else if (/\.(js|html|css|md|xml|sh)$/.test(f)) files.push(full);
    }
  })(root);
  for (const f of files) {
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((l, i) => {
      if (DASH.test(l)) fail(`em dash in ${path.relative(root, f)}:${i + 1}`);
    });
  }
}

/* ---------------------------------------------------- report */

console.log(`${mols.length} molecules, ${builds.length} builds, ${ids.size} questions ` +
            `(${App.GRADED} graded per attempt), ${STRAIN.ROWS.length} strain-table rows.`);
if (problems.length) {
  console.log('\nPROBLEMS:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('All checks passed.');

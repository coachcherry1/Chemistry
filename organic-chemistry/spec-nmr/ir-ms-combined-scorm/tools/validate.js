/* tools/validate.js — item bank checks. Run after any edit to compounds.js.
 *
 *   node tools/validate.js
 *
 * Exits non-zero if the bank could produce an item that is unanswerable,
 * ambiguous, or chemically wrong. It runs the checks from both source
 * packages — the IR package's drop-window rules and the mass spec package's
 * mass balance — plus the ones that only make sense with both spectra:
 *
 *   - the IR bands must match the STRUCTURE: every group the drawing has is
 *     scored or excused in `hidden`, and nothing is scored that it lacks
 *   - no two compounds may be indistinguishable to both spectra at once
 *   - every compound needs enough honest wrong labels
 *   - the theme draw must be able to fill all four levels
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'js');
global.window = {};
global.getComputedStyle = () => ({ getPropertyValue: () => '' });
for (const f of ['groups.js', 'fragments.js', 'compounds.js', 'massspec.js', 'evidence.js']) {
  eval.call(global, fs.readFileSync(path.join(src, f), 'utf8'));
}

const THEMES = ['alcohol', 'carbonyl', 'acid', 'nitrogen', 'hydrocarbon', 'halide'];
const SOURCES = ['ir', 'ms', 'new'];

const problems = [];
const warn = [];
const fail = (c, msg) => problems.push(c.id + ': ' + msg);

function parse(f) { return MS.parseFormula(f); }
function mass(counts) { return MS.massOf(counts); }

const seen = new Set();

for (const c of COMPOUNDS) {
  if (seen.has(c.id)) fail(c, 'duplicate id');
  seen.add(c.id);
  if (THEMES.indexOf(c.theme) < 0) fail(c, 'theme "' + c.theme + '" is not one of ' + THEMES.join(', '));
  if (!c.source || SOURCES.indexOf(c.source.ir) < 0 || SOURCES.indexOf(c.source.ms) < 0) {
    fail(c, 'source must say where each spectrum came from: { ir, ms } each one of ' + SOURCES.join('/'));
  }

  /* ------------------------------------------------ formula and structure */
  const mol = parse(c.f);
  if (!mol) { fail(c, 'could not parse formula "' + c.f + '"'); continue; }
  const M = mass(mol);
  const plain = c.formula.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, d => '₀₁₂₃₄₅₆₇₈₉'.indexOf(d));
  if (plain !== c.f) fail(c, 'displayed formula ' + c.formula + ' does not match f: "' + c.f + '"');

  const atoms = MS.atomsOf(c.structure);
  if (atoms.some(a => !a)) fail(c, 'the structure uses a label massspec.js does not know');
  else {
    const drawn = MS.countsOf(atoms, c.structure.pts.map((_, i) => i));
    if (!MS.sameCounts(drawn, mol)) {
      fail(c, 'the structure as drawn is ' + JSON.stringify(drawn) + ', not ' + c.f +
              ' — a missing bond or a wrong label');
    }
  }

  /* ------------------------------------------------------------------ IR */
  const targets = c.bands.filter(b => b.t);
  if (!targets.length) fail(c, 'no scored IR bands');
  for (const b of c.bands) {
    if (b.g && !GROUPS[b.g]) fail(c, 'unknown group id "' + b.g + '"');
    if (!(b.c > 400 && b.c < 4000)) fail(c, 'band centre ' + b.c + ' is off the plotted axis');
    if (!(b.d > 0 && b.d <= 1)) fail(c, 'band at ' + b.c + ' has depth ' + b.d);
    if (b.s !== 'l' && b.s !== 'g') fail(c, 'band at ' + b.c + ' has shape "' + b.s + '"');
    if (!b.t) continue;
    if (!b.g) { fail(c, 'a scored band has no group'); continue; }
    if (!b.tol) { fail(c, 'scored band at ' + b.c + ' has no window'); continue; }
    if (b.c < 1500) fail(c, GROUPS[b.g].label + ' is scored at ' + b.c + ', below the 1500 line');
    if (GROUPS[b.g].fingerprint) fail(c, GROUPS[b.g].label + ' is a fingerprint group and cannot be scored');
    if (b.g === 'ch_sp2' && b.tol[0] !== 3000) fail(c, 'the sp2 C-H window starts at ' + b.tol[0] + ', not 3000');
    if (b.g === 'ch_sp3' && b.tol[1] !== 3000) fail(c, 'the sp3 C-H window ends at ' + b.tol[1] + ', not 3000');
    if (b.c < b.tol[0] || b.c > b.tol[1]) fail(c, 'scored band ' + b.c + ' sits outside its window ' + b.tol.join('-'));
  }
  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const A = targets[i], B = targets[j];
      if (A.g === B.g) { fail(c, 'two scored bands share the group ' + A.g); continue; }
      if (A.tol[0] < B.tol[1] && B.tol[0] < A.tol[1]) {
        fail(c, 'drop windows overlap: ' + A.g + ' ' + A.tol.join('-') + ' vs ' + B.g + ' ' + B.tol.join('-'));
      }
    }
  }
  for (const t of targets) {
    for (const o of c.bands) {
      if (o === t || !o.g || o.g === t.g) continue;
      if (o.c >= t.tol[0] && o.c <= t.tol[1]) fail(c, o.g + ' at ' + o.c + ' sits inside the window for ' + t.g);
    }
  }

  /* the IR must agree with the structure */
  const present = Evidence.present(c).filter(g => GROUPS[g] && !GROUPS[g].fingerprint);
  const scored = Evidence.scoredGroups(c);
  const hidden = c.hidden || {};
  for (const g of scored) {
    if (present.indexOf(g) < 0) fail(c, 'scores ' + GROUPS[g].label + ', but the structure has none');
  }
  for (const g of present) {
    if (scored.indexOf(g) < 0 && !hidden[g]) {
      fail(c, 'the structure has ' + GROUPS[g].label + ' but the IR neither scores it nor explains ' +
              'why in `hidden` — and a student could be told it is absent');
    }
  }
  for (const g of Object.keys(hidden)) {
    if (!GROUPS[g]) fail(c, 'hidden names unknown group ' + g);
    else if (scored.indexOf(g) >= 0) fail(c, 'hidden lists ' + g + ', which is scored');
    else if (present.indexOf(g) < 0) fail(c, 'hidden lists ' + g + ', which the structure does not have');
  }

  /* --------------------------------------------------------- mass spectrum */
  const mzSeen = new Set();
  let base = 0;
  const losses = new Map();
  const readable = Evidence.readableM(c);

  for (const p of c.peaks) {
    if (mzSeen.has(p.mz)) fail(c, 'two peaks at m/z ' + p.mz);
    mzSeen.add(p.mz);
    if (!(p.ab > 0 && p.ab <= 100)) fail(c, 'm/z ' + p.mz + ' has abundance ' + p.ab);
    if (p.ab === 100) base++;
    if (p.mz > M) fail(c, 'm/z ' + p.mz + ' is heavier than the molecule (' + M + ')');
    if (p.role === 'mplus') {
      if (p.mz !== M) fail(c, 'the molecular ion is listed at ' + p.mz + ' but ' + c.f + ' weighs ' + M);
      /* abundances wobble by up to 12% at draw time; 6.5 stays above the 5% line */
      if (p.ab < 6.5) fail(c, 'M+ at ' + p.ab + '% can wobble below the 5% line; call it minor instead');
    } else if (p.mz === M && p.ab >= 5) {
      fail(c, 'the peak at M (' + M + ') is ' + p.ab + '% but is not marked mplus');
    }
    if (p.role === 'mcl' && p.ion) fail(c, 'the rearrangement peak at ' + p.mz + ' must not carry an ion id');

    if (p.ion) {
      const ion = IONS[p.ion];
      if (!ion) { fail(c, 'unknown ion "' + p.ion + '" at m/z ' + p.mz); continue; }
      if (ion.f) {
        const fr = parse(ion.f);
        if (mass(fr) !== p.mz) fail(c, ion.label + ' weighs ' + mass(fr) + ' but is listed at m/z ' + p.mz);
        for (const el of Object.keys(fr)) {
          if ((mol[el] || 0) < fr[el]) fail(c, ion.label + ' at m/z ' + p.mz + ' contains more ' + el + ' than ' + c.f);
        }
      } else if (ion.lost) {
        const hal = ['Cl', 'Br', 'F', 'I'].find(h => mol[h]);
        const lost = ion.lost === 'HX' ? (hal ? { H: 1, [hal]: 1 } : null) : parse(ion.lost);
        if (!lost) fail(c, ion.label + ' needs a halogen the molecule does not have');
        else if (M - mass(lost) !== p.mz) fail(c, ion.label + ' should sit at ' + (M - mass(lost)) + ', not ' + p.mz);
      }
    }
    if (p.role === 'key') {
      if (!p.why) fail(c, 'the scored peak at m/z ' + p.mz + ' has no why');
      if (!p.ion) fail(c, 'the scored peak at m/z ' + p.mz + ' has no ion');
      if (readable) {
        const n = M - p.mz;
        if (!LOSSES[n]) fail(c, 'm/z ' + p.mz + ' is a loss of ' + n + ', which fragments.js has no tile for');
        if (losses.has(n)) fail(c, 'two scored peaks are both M − ' + n);
        losses.set(n, p.mz);
        if (p.ab < 6.5) warn.push(c.id + ': scored m/z ' + p.mz + ' at ' + p.ab + '% sits close to the reading line');
        if (!MS.fragmentView(c, p)) warn.push(c.id + ': no picture for m/z ' + p.mz + ' (the fragment panel shows the loss only)');
      }
    }
  }
  if (base !== 1) fail(c, (base ? base + ' peaks' : 'no peak') + ' at 100% — exactly one base peak, please');

  const hal = Evidence.halogen(c);
  if (c.isotopeTarget && !hal) fail(c, 'isotopeTarget is set but there is no Cl or Br');
  if (hal && readable && !c.isotopeTarget) fail(c, 'a readable halide should set isotopeTarget');
  if (c.isotopeTarget && readable) {
    const mp = c.peaks.find(p => p.role === 'mplus');
    const iso = mp.ab * (hal === 'Br' ? 0.973 : 0.32);
    if (iso < 5) warn.push(c.id + ': its M+2 would be about ' + iso.toFixed(1) + '%, under the line, so it is drawn but never marked');
  }

  /* --------------------------------------- enough honest wrong labels */
  if (readable) {
    const needed = new Set(c.peaks.filter(p => p.role === 'key').map(p => 'loss_' + (M - p.mz)));
    const okMs = MS_UNIVERSE.filter(k => {
      if (k === 'mplus' || k === 'miso1' || needed.has(k)) return false;
      if (k === 'miso2') return !hal;
      const n = lossNumber(k);
      return LOSSES[n] && !c.peaks.some(p => p.mz === M - n && p.ab >= 4);
    });
    if (okMs.length < 3) fail(c, 'only ' + okMs.length + ' mass spectrum labels can honestly be offered as wrong');
  }
  for (const mode of ['family', 'group']) {
    const banned = new Set(present.map(g => irKey(g, mode)));
    const okIr = IR_UNIVERSE[mode].filter(k => !banned.has(k));
    if (okIr.length < 3) fail(c, 'only ' + okIr.length + ' IR labels (' + mode + ') can honestly be offered as wrong');
  }
}

/* ------------------------------------------------------ across the bank */

/* No two compounds may be indistinguishable to both spectra. */
const blind = [];
for (let i = 0; i < COMPOUNDS.length; i++) {
  for (let j = i + 1; j < COMPOUNDS.length; j++) {
    if (!Evidence.decidable(COMPOUNDS[i], COMPOUNDS[j])) blind.push(COMPOUNDS[i].id + ' / ' + COMPOUNDS[j].id);
  }
}
if (blind.length) problems.push('indistinguishable to both spectra: ' + blind.join(', '));

/* Every compound needs three wrong options for Levels 3 and 4. */
for (const c of COMPOUNDS) {
  const n = COMPOUNDS.filter(d => d.id !== c.id && Evidence.decidable(c, d)).length;
  if (n < 3) fail(c, 'only ' + n + ' compounds can fairly be offered against it');
}

/* The draw. Levels 1 and 2 need compounds with a readable M+; across sixteen
   items the least-used-first draw takes each theme at most three times, at
   most twice in Levels 1-2. */
for (const t of THEMES) {
  const all = COMPOUNDS.filter(c => c.theme === t);
  const withM = all.filter(c => Evidence.readableM(c));
  if (withM.length < 2) problems.push('theme ' + t + ' has ' + withM.length + ' compound(s) with a readable M+; Levels 1-2 can need 2');
  if (all.length < 3) problems.push('theme ' + t + ' has ' + all.length + ' compound(s); a run can need 3');
}

/* ------------------------------------------------------------------ report */

/* Which spectrum each answer's closest rivals need, as the game draws them.
   Informational — this is the figure the README quotes. */
const rand = MS.rng(20260925);
const need = { both: [], ms: [], ir: [], either: [] };
for (const c of COMPOUNDS.filter(c => Evidence.readableM(c))) {
  const d = Evidence.pickDecoys(c, 2, rand);
  const v = d.map(x => Evidence.whyNot(c, x));
  const irOK = v.every(x => x.ir), msOK = v.every(x => x.msMass);
  (need[!irOK && !msOK ? 'both' : !irOK ? 'ms' : !msOK ? 'ir' : 'either']).push(c.id);
}

const irTwins = {};
for (const c of COMPOUNDS) (irTwins[Evidence.scoredGroups(c).join('+')] = irTwins[Evidence.scoredGroups(c).join('+')] || []).push(c.id);
const massTwins = {};
for (const c of COMPOUNDS) {
  const M = Evidence.readableM(c);
  if (M) (massTwins[M] = massTwins[M] || []).push(c.id);
}

const counts = { ir: 0, ms: 0, both: 0 };
for (const c of COMPOUNDS) {
  if (c.source.ir === 'new' && c.source.ms === 'new') counts.both++;
  else if (c.source.ir === 'new') counts.ir++;
  else if (c.source.ms === 'new') counts.ms++;
}

console.log(COMPOUNDS.length + ' compounds, ' +
  COMPOUNDS.filter(c => Evidence.readableM(c)).length + ' with a readable M+ (answers at every level), ' +
  COMPOUNDS.filter(c => !Evidence.readableM(c)).length + ' without (answers from Level 3)');
console.log('new spectra: ' + counts.ir + ' IR only, ' + counts.ms + ' MS only, ' + counts.both +
  ' compounds new on both sides — ' + (counts.ir + counts.ms + 2 * counts.both) + ' spectra to spot-check');

console.log('\nIR twins — same scored bands, so only the mass spectrum separates them:');
Object.values(irTwins).filter(g => g.length > 1).forEach(g => console.log('  ' + g.join(', ')));
console.log('\nMass twins — same readable M+, so the molecular ion cannot separate them:');
Object.entries(massTwins).filter(([, g]) => g.length > 1).forEach(([m, g]) => console.log('  ' + m + ': ' + g.join(', ')));

console.log('\nLevel 2, one sample draw — what the two wrong options need:');
console.log('  both spectra   ' + need.both.length + '  ' + need.both.join(', '));
console.log('  the MS         ' + need.ms.length + '  ' + need.ms.join(', '));
console.log('  the IR         ' + need.ir.length + '  ' + need.ir.join(', '));
console.log('  either one     ' + need.either.length + '  ' + need.either.join(', '));

if (warn.length) {
  console.log('\nnotes:');
  warn.forEach(l => console.log('  ' + l));
}
if (problems.length) {
  console.log('\nPROBLEMS:');
  problems.forEach(l => console.log('  ' + l));
  process.exit(1);
}
console.log('\nbank is valid');

/* tools/validate.js — item bank checks. Run after any edit to compounds.js.
 *
 *   node tools/validate.js
 *
 * Exits non-zero if the bank could produce an item that is unanswerable,
 * ambiguous, or chemically wrong.
 *
 * The check that matters most is MASS BALANCE. A mass spectrum is arithmetic,
 * so the arithmetic can be verified: for every scored fragment,
 *
 *     ion formula + neutral lost = molecular formula
 *
 * with no negative atom counts anywhere. A mistyped m/z cannot survive that.
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'js');
eval(fs.readFileSync(path.join(src, 'fragments.js'), 'utf8'));
eval(fs.readFileSync(path.join(src, 'compounds.js'), 'utf8'));
global.getComputedStyle = () => ({ getPropertyValue: () => '' });
eval(fs.readFileSync(path.join(src, 'massspec.js'), 'utf8'));

const MASS = { C: 12, H: 1, N: 14, O: 16, F: 19, S: 32, Cl: 35, Br: 79, I: 127 };
const HALOGENS = ['Cl', 'Br', 'F', 'I'];

const problems = [];
const warn = [];
const ambiguous = [];
const fail = (c, msg) => problems.push(c.id + ': ' + msg);

/* ------------------------------------------------------- formula arithmetic */

function parse(formula) {
  const out = {};
  const re = /([A-Z][a-z]?)(\d*)/g;
  let m, consumed = 0;
  while ((m = re.exec(formula)) !== null) {
    if (m[0] === '') break;
    consumed += m[0].length;
    if (!(m[1] in MASS)) return { bad: 'unknown element ' + m[1] };
    out[m[1]] = (out[m[1]] || 0) + (m[2] === '' ? 1 : +m[2]);
  }
  if (consumed !== formula.length) return { bad: 'could not parse "' + formula + '"' };
  return out;
}

function mass(counts) {
  return Object.keys(counts).reduce((s, el) => s + MASS[el] * counts[el], 0);
}

function subtract(a, b) {
  const out = Object.assign({}, a);
  for (const el of Object.keys(b)) {
    out[el] = (out[el] || 0) - b[el];
    if (out[el] < 0) return null;          /* the ion contains an atom the molecule does not */
    if (out[el] === 0) delete out[el];
  }
  return out;
}

function formulaText(counts) {
  const keys = Object.keys(counts).sort();
  if (!keys.length) return 'nothing';
  return keys.map(el => el + (counts[el] > 1 ? counts[el] : '')).join('');
}

/* Resolve the 'X' / 'HX' placeholders on a halogen loss against the molecule. */
function resolveLost(lost, molCounts) {
  const hal = HALOGENS.find(h => molCounts[h]);
  if (lost === 'X') return hal ? { [hal]: 1 } : null;
  if (lost === 'HX') return hal ? { H: 1, [hal]: 1 } : null;
  return parse(lost);
}

/* ------------------------------------------------------------ bank checks */

const seen = new Set();
const SIG = {};

for (const c of COMPOUNDS) {
  if (seen.has(c.id)) fail(c, 'duplicate id');
  seen.add(c.id);

  if (!c.tags || !c.tags.length) fail(c, 'no level tags, so it can never be drawn');
  if (!c.structure || !c.structure.pts) fail(c, 'no structure');
  if (!c.theme) fail(c, 'no theme, so the balanced draw cannot place it');

  const mol = parse(c.f);
  if (mol.bad) { fail(c, mol.bad); continue; }
  const M = mass(mol);

  /* the displayed formula must agree with the parseable one */
  const plain = c.formula.replace(/[₀₁₂₃₄₅₆₇₈₉]/g,
    d => '₀₁₂₃₄₅₆₇₈₉'.indexOf(d));
  if (plain !== c.f) fail(c, 'displayed formula ' + c.formula + ' does not match f: "' + c.f + '"');

  const mzSeen = new Map();
  let base = 0, mplus = null;
  const keyLosses = new Map(), keyIons = new Map();

  for (const p of c.peaks) {
    if (mzSeen.has(p.mz)) fail(c, 'two peaks at m/z ' + p.mz);
    mzSeen.set(p.mz, p);

    if (!(p.ab > 0 && p.ab <= 100)) fail(c, 'm/z ' + p.mz + ' has abundance ' + p.ab);
    if (p.ab === 100) base++;
    if (p.mz > M) fail(c, 'm/z ' + p.mz + ' is heavier than the molecule (' + M + ')');
    if (p.role === 'mplus') {
      mplus = p;
      if (p.mz !== M) fail(c, 'the molecular ion is listed at ' + p.mz + ' but ' + c.f + ' weighs ' + M);
    }
    if (p.role === 'mcl' && p.ion) fail(c, 'the McLafferty peak at ' + p.mz + ' must not carry an ion id');

    /* --- the mass balance, for every peak that names an ion --- */
    if (p.ion) {
      const ion = IONS[p.ion];
      if (!ion) { fail(c, 'unknown ion id "' + p.ion + '" at m/z ' + p.mz); continue; }

      if (ion.f) {
        const ionCounts = parse(ion.f);
        if (ionCounts.bad) { fail(c, ion.f + ': ' + ionCounts.bad); continue; }
        if (mass(ionCounts) !== p.mz) {
          fail(c, ion.label + ' is ' + ion.f + ' = ' + mass(ionCounts) +
                  ', but it is listed at m/z ' + p.mz);
        }
        if (ion.mz != null && ion.mz !== p.mz) {
          fail(c, ion.label + ' is declared at m/z ' + ion.mz + ' but used at ' + p.mz);
        }
        const neutral = subtract(mol, ionCounts);
        if (neutral === null) {
          fail(c, ion.label + ' (' + ion.f + ') contains atoms ' + c.f + ' does not have');
        } else if (mass(neutral) !== M - p.mz) {
          fail(c, ion.label + ': the neutral lost does not balance');
        }
      } else if (ion.lost) {
        const lost = resolveLost(ion.lost, mol);
        if (!lost) { fail(c, ion.label + ' needs a halogen and ' + c.f + ' has none'); continue; }
        if (M - mass(lost) !== p.mz) {
          fail(c, ion.label + ' should be at m/z ' + (M - mass(lost)) +
                  ' (' + M + ' − ' + formulaText(lost) + '), not ' + p.mz);
        }
        if (subtract(mol, lost) === null) {
          fail(c, ion.label + ': ' + c.f + ' cannot lose ' + formulaText(lost));
        }
      } else {
        fail(c, 'ion "' + p.ion + '" has neither a formula nor a neutral loss');
      }
    }

    /* --- scored peaks --- */
    if (p.role !== 'key') continue;
    if (!p.ion) fail(c, 'the scored peak at m/z ' + p.mz + ' names no ion');
    if (!p.why) fail(c, 'the scored peak at m/z ' + p.mz + ' has no `why`, so Level 3 cannot use it');

    const loss = M - p.mz;
    if (loss !== 0 && !LOSSES[loss]) {
      fail(c, 'the scored peak at m/z ' + p.mz + ' is a loss of ' + loss +
              ', which is not in the LOSSES table — Level 1 would have no tile for it');
    }
    if (keyLosses.has(loss)) {
      fail(c, 'two scored peaks are both a loss of ' + loss + ' — Level 1 could not tell them apart');
    }
    keyLosses.set(loss, p.mz);
    if (keyIons.has(p.ion)) {
      fail(c, 'two scored peaks both claim ' + p.ion + ' — Level 2 could not tell them apart');
    }
    keyIons.set(p.ion, p.mz);
  }

  /* --- the drawing has to BE the molecule ---
     Hydrogens are counted back from the bonds, so a structure with a missing
     bond or a stray vertex will not reproduce the formula. This also
     underpins the fragment pictures: they are cut out of this same drawing. */
  const drawn = MS.countsOf(MS.atomsOf(c.structure),
                            c.structure.pts.map((_, i) => i));
  if (!MS.sameCounts(drawn, mol)) {
    fail(c, 'the drawn structure works out to ' + formulaText(drawn) +
            ', but the formula says ' + c.f);
  }

  /* --- every peak a student labels must have an honest picture ---
     Checked against a BUILT spectrum, not the declared peak list: the isotope
     peaks are generated at draw time, so checking compounds.js alone misses
     them — which is exactly how an M+2 once reached students captioned
     "lost ?". Whatever the student can drop a tile on gets checked. */
  const built = MS.build(c, 4242);
  for (const p of built.peaks) {
    if (!p.target) continue;
    const view = MS.fragmentView(c, p);
    if (!view) {
      fail(c, 'no fragment picture can be derived for m/z ' + p.mz +
              ' — the panel would show a gap where the structure should be');
      continue;
    }
    if (view.kind === 'cut') {
      const kept = MS.countsOf(MS.atomsOf(c.structure), view.keeps);
      const want = MS.parseFormula(IONS[p.ion].f);
      if (!MS.sameCounts(kept, want)) {
        fail(c, 'the fragment picture for m/z ' + p.mz + ' keeps ' + formulaText(kept) +
                ', not ' + IONS[p.ion].f);
      }
      if (view.ambiguous) ambiguous.push(c.id + ' m/z ' + p.mz);
    }
    /* Every cell in the panel carries a caption. A blank one reads as a
       question mark next to a drawing, which teaches nothing. */
    const caption = view.kind === 'isotope' ? view.note
                  : view.kind === 'whole' ? 'the whole molecule'
                  : MS.neutralOf(built, p);
    if (!caption) {
      fail(c, 'the fragment panel has no caption for m/z ' + p.mz +
              ' — it would render as "lost ?"');
    }
  }

  /* An M+2 only becomes a drop target if it clears the reading threshold, so
     say which halides actually get to carry the isotope lesson. */
  if (c.isotopeTarget) {
    const m2 = built.peaks.find(p => p.role === 'miso2');
    if (!m2 || !m2.target) {
      warn.push(c.id + ': its M+2 is only ' + (m2 ? m2.ab.toFixed(1) : '0') +
                '% — below the reading threshold, so this compound is drawn honestly but ' +
                'never asks the student to label the doublet');
    }
  }

  if (base !== 1) fail(c, 'expected exactly one base peak (ab: 100), found ' + base);

  /* massspec.js holds every other peak at or below 97 so the base peak cannot
     change identity when abundances wobble. A declared value above that is
     silently squashed, so say so rather than letting the drawn spectrum
     disagree with the number written here. */
  for (const p of c.peaks) {
    if (p.ab !== 100 && p.ab > 97) {
      warn.push(c.id + ': m/z ' + p.mz + ' is declared at ' + p.ab +
                '%, but non-base peaks are capped at 97% so the base peak stays unambiguous');
    }
  }
  if (!c.peaks.some(p => p.role === 'key')) fail(c, 'no scored peaks');

  /* --- what each level needs --- */
  if (c.tags.includes('loss')) {
    if (!mplus) {
      fail(c, 'tagged for the labelling levels but has no molecular ion — you cannot ' +
              'subtract from a peak that is not there');
    } else if (mplus.ab < 5) {
      fail(c, 'tagged for the labelling levels but its molecular ion is only ' + mplus.ab +
              '% — too faint to measure a loss from');
    }
  }
  if (c.tags.includes('predict')) {
    const competing = c.peaks.filter(p => p.role === 'key' && p.ion && IONS[p.ion] &&
                                          IONS[p.ion].mech !== null);
    if (competing.length < 2) {
      fail(c, 'tagged for Level 3 but offers only ' + competing.length +
              ' competing cleavage — there is nothing to predict');
    }
    if (!competing.some(p => p.ab === 100)) {
      fail(c, 'tagged for Level 3 but the base peak is not one of the scored cleavages');
    }
  }

  /* a scored peak the student is told to ignore would be a contradiction */
  for (const p of c.peaks) {
    if (p.role === 'key' && p.ab < 5 && p.role !== 'mplus') {
      warn.push(c.id + ': the scored peak at m/z ' + p.mz + ' is only ' + p.ab +
                '%, below the reading threshold students are taught to apply');
    }
  }

  /* The signature is every peak a student is asked to label — scored
     fragments AND the molecular ion, which is a drop target in its own
     right. Two compounds sharing a signature cannot be told apart from the
     evidence the activity gives, so they must never be offered against each
     other in the identify question. */
  SIG[c.id] = c.peaks.filter(p => p.role === 'key' || p.role === 'mplus')
                     .map(p => p.mz).sort((a, b) => a - b).join(',');
}

/* An ion no compound uses is legitimate — it still teaches in the reference
   table and still makes a fair distractor — but a teacher adding compounds
   should know which ones are carrying their weight and which are not. */
const usedIons = new Set();
for (const c of COMPOUNDS) for (const p of c.peaks) if (p.ion) usedIons.add(p.ion);
const idle = ION_IDS.filter(k => !usedIons.has(k));
if (idle.length) {
  warn.push('no compound uses ' + idle.join(', ') +
            ' — they appear only in the reference table, as recognition material');
}

/* --------------------------------------------- level pools and theme cover */

/* Level 3 does not draw halides: a C–X bond simply breaks, with no second
   route to weigh it against, so there is nothing there to predict. */
const THEMES = {
  loss:    ['alcohol', 'carbonyl', 'arene', 'branch', 'hetero', 'halide'],
  predict: ['alcohol', 'carbonyl', 'branch', 'hetero']
};
for (const tag of ['loss', 'predict']) {
  const pool = COMPOUNDS.filter(c => c.tags.includes(tag));
  const missing = THEMES[tag].filter(t => !pool.some(c => c.theme === t));
  if (missing.length) {
    problems.push('the "' + tag + '" pool has no ' + missing.join(', ') +
                  ' compound, so that theme drops out of that level');
  }
  const need = tag === 'loss' ? 12 : 6;   /* the loss pool feeds BOTH labelling levels */
  if (pool.length < need) {
    problems.push('the "' + tag + '" pool has only ' + pool.length + ' compounds, and ' +
                  need + ' are drawn');
  }
  if (tag === 'loss') {
    for (const t of THEMES[tag]) {
      const n = pool.filter(c => c.theme === t).length;
      if (n < 2) {
        problems.push('only ' + n + ' "' + t + '" compound can do losses, so Levels 1 and 2 ' +
                      'would both have to draw it');
      }
    }
  }

  /* Level 3 draws last, after Levels 1-2 have taken twelve compounds. A theme
     it guarantees must therefore have enough members that are EITHER
     Level-3-only or plentiful enough to survive that, or the guarantee forces
     a repeat. */
  if (tag === 'predict') {
    for (const t of THEMES[tag]) {
      const inTheme = pool.filter(c => c.theme === t);
      const exclusive = inTheme.filter(c => !c.tags.includes('loss')).length;
      const lossSameTheme = COMPOUNDS.filter(c => c.tags.includes('loss') && c.theme === t).length;
      /* worst case Levels 1-2 take two of this theme from the shared pool */
      if (exclusive < 1 && inTheme.length - Math.min(2, lossSameTheme) < 1) {
        problems.push('Level 3 guarantees a "' + t + '" compound, but Levels 1-2 can use ' +
                      'them all first, forcing a repeat');
      }
    }
  }
}

/* Compounds whose scored peaks are identical cannot be told apart from the
   evidence a student actually has, so they must never be offered against each
   other in the identify question. */
const clusters = {};
for (const id of Object.keys(SIG)) (clusters[SIG[id]] = clusters[SIG[id]] || []).push(id);
const collisions = Object.values(clusters).filter(g => g.length > 1);

/* ----------------------------------------------------------------- report */

console.log(COMPOUNDS.length + ' compounds, ' + ION_IDS.length + ' ions, ' +
            Object.keys(LOSSES).length + ' losses.');
console.log('scored peaks: ' + COMPOUNDS.reduce((n, c) =>
            n + c.peaks.filter(p => p.role === 'key').length, 0) +
            '  ·  drawn peaks: ' + COMPOUNDS.reduce((n, c) => n + c.peaks.length, 0));

if (collisions.length) {
  console.log('\nindistinguishable by scored peaks alone (never offered against each other):');
  for (const g of collisions) console.log('  ' + g.join('  =  ') + '   [' + SIG[g[0]] + ']');
}

/* More than one bond cut gives a piece of the right formula. In this bank they
   are all symmetry twins — losing either of two equivalent methyls — so the
   picture is the same molecule seen from the other end. Listed so that a new
   compound producing a genuine ambiguity gets looked at. */
if (ambiguous.length) {
  console.log('\nfragment pictures with more than one matching cut (symmetry twins):');
  console.log('  ' + ambiguous.join(', '));
}

if (warn.length) {
  console.log('\nwarnings:');
  for (const w of warn) console.log('  ! ' + w);
}

if (problems.length) {
  console.log('\nFAILED:');
  for (const p of problems) console.log('  x ' + p);
  process.exit(1);
}
console.log('\nbank OK');

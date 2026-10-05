/* tools/validate.js — item bank checks. Run after any edit to molecules.js,
 * shifts.js or levels.js.
 *
 *   node tools/validate.js
 *
 * Exits non-zero if the bank could produce an unanswerable, ambiguous or
 * wrong item.
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'js');
for (const f of ['shifts.js', 'molecules.js', 'analysis.js', 'spectrum.js', 'levels.js']) {
  eval(fs.readFileSync(path.join(src, f), 'utf8'));
}

const problems = [];
const notes = [];
const fail = (m, msg) => problems.push(m.id + ': ' + msg);

const KINDS = ['sym', 'branch', 'ring', 'trap', 'chain'];
const SUB = { '₀': 0, '₁': 1, '₂': 2, '₃': 3, '₄': 4, '₅': 5, '₆': 6, '₇': 7, '₈': 8, '₉': 9 };

/* C₄H₈O₂ -> { C: 4, H: 8, O: 2 } */
function parseFormula(f) {
  const out = {};
  const re = /([A-Z][a-z]?)([₀-₉]*)/g;
  let m;
  while ((m = re.exec(f))) {
    const n = m[2] ? +m[2].split('').map(c => SUB[c]).join('') : 1;
    out[m[1]] = (out[m[1]] || 0) + n;
  }
  return out;
}

function elementOf(atom) {
  if (atom.t === '' || /^C(?!l)/.test(atom.t)) return 'C';
  if (/^O/.test(atom.t)) return 'O';
  return atom.t;
}

const seen = new Set();
const SPACING = NMR.SPACING;

for (const m of MOLECULES) {
  if (seen.has(m.id)) fail(m, 'duplicate id');
  seen.add(m.id);

  if (!m.name || !m.formula) fail(m, 'missing name or formula');
  if (!FAMILIES[m.family]) fail(m, 'unknown family "' + m.family + '"');
  if (KINDS.indexOf(m.kind) < 0) fail(m, 'unknown kind "' + m.kind + '"');
  if (!m.levels || !m.levels.length) fail(m, 'no levels, so it can never be drawn');
  (m.levels || []).forEach(n => { if (!LEVELS[n - 1]) fail(m, 'level ' + n + ' does not exist'); });

  /* ---- atoms and bonds */
  m.atoms.forEach((a, i) => {
    if (typeof a.t !== 'string') fail(m, 'atom ' + i + ' has no label');
    if (a.h > 0) {
      if (!a.s || !m.sets[a.s]) fail(m, 'atom ' + i + ' (' + a.t + ') carries H but no valid set');
      const expect = a.t === 'OH' ? 1 : (/^CH₃/.test(a.t) ? 3 : /^CH₂/.test(a.t) ? 2 : /^CH/.test(a.t) ? 1 : null);
      if (expect !== null && expect !== a.h) fail(m, 'atom ' + i + ' is drawn ' + a.t + ' but has h = ' + a.h);
    } else if (a.s) {
      fail(m, 'atom ' + i + ' (' + a.t + ') is in set ' + a.s + ' but carries no H');
    }
    if (a.oh && a.t !== 'OH') fail(m, 'atom ' + i + ' is flagged oh but drawn ' + a.t);
    if (a.t === 'OH' && !a.oh) fail(m, 'atom ' + i + ' is an OH not flagged oh');
  });

  const bondKeys = new Set();
  m.bonds.forEach(b => {
    const [i, j, order] = b;
    if (!m.atoms[i] || !m.atoms[j] || i === j) fail(m, 'bad bond ' + JSON.stringify(b));
    if (order != null && [1, 2, 3].indexOf(order) < 0) fail(m, 'bad bond order ' + JSON.stringify(b));
    const key = Math.min(i, j) + '-' + Math.max(i, j);
    if (bondKeys.has(key)) fail(m, 'duplicate bond ' + key);
    bondKeys.add(key);
  });

  /* two atoms drawn on top of each other would hide a capsule */
  for (let i = 0; i < m.atoms.length; i++) {
    for (let j = i + 1; j < m.atoms.length; j++) {
      const d = Math.hypot(m.atoms[i].x - m.atoms[j].x, m.atoms[i].y - m.atoms[j].y);
      if (d < 0.95) fail(m, 'atoms ' + i + ' and ' + j + ' are drawn ' + d.toFixed(2) + ' bonds apart');
    }
  }

  /* the drawing must match the formula, element by element */
  const formula = parseFormula(m.formula);
  const drawn = {};
  m.atoms.forEach(a => {
    const e = elementOf(a);
    drawn[e] = (drawn[e] || 0) + 1;
    if (a.h > 0) drawn.H = (drawn.H || 0) + a.h;
  });
  for (const e of new Set(Object.keys(formula).concat(Object.keys(drawn)))) {
    if ((formula[e] || 0) !== (drawn[e] || 0)) {
      fail(m, 'formula ' + m.formula + ' has ' + (formula[e] || 0) + ' ' + e + ' but the structure draws ' +
              (drawn[e] || 0));
    }
  }

  /* ---- sets */
  const sets = Chem.sets(m);
  for (const s of sets) {
    const def = m.sets[s.id];
    if (!s.atoms.length) { fail(m, 'set ' + s.id + ' has no atoms'); continue; }
    if (typeof def.d !== 'number') fail(m, 'set ' + s.id + ' has no shift');
    const region = REGIONS[def.r];
    if (!region) { fail(m, 'set ' + s.id + ' has unknown region "' + def.r + '"'); continue; }
    if (def.d < region.range[0] || def.d > region.range[1]) {
      fail(m, 'set ' + s.id + ' at ' + def.d + ' ppm is outside its region ' + def.r + ' (' +
              rangeText(region) + ')');
    }
    for (const field of ['env', 'all']) {
      if (!/^(the|a|an) /.test(s[field])) {
        fail(m, 'set ' + s.id + ' ' + field + ' "' + s[field] + '" must start with the / a / an to read in a sentence');
      }
    }
    if (s.atoms.length > 1) {
      if (!def.all) fail(m, 'set ' + s.id + ' has several groups but no `all` wording');
      if (!def.why) fail(m, 'set ' + s.id + ' has several groups but no `why` - Level 1 needs it');
    }
    if (s.oh !== !!def.br) fail(m, 'set ' + s.id + ': O-H sets, and only O-H sets, are broad');
    if (s.oh && ['alcohol', 'acid'].indexOf(def.r) < 0) fail(m, 'set ' + s.id + ' is an O-H in region ' + def.r);

    /* every group in a set must look the same and be split the same */
    for (const i of s.atoms) {
      const a = m.atoms[i];
      if (a.t !== s.text || a.h !== s.h || !!a.oh !== s.oh) {
        fail(m, 'set ' + s.id + ' mixes ' + s.text + ' and ' + a.t + ' groups');
      }
      const n = Chem.splitCount(m, i, s.id);
      if (n !== s.n) fail(m, 'set ' + s.id + ': group ' + i + ' has ' + n + ' neighbouring H, group ' +
                             s.atoms[0] + ' has ' + s.n + ' - they cannot be equivalent');
    }
    if (s.n > 6 && (m.levels.indexOf(4) >= 0 || m.levels.indexOf(5) >= 0)) {
      fail(m, 'set ' + s.id + ' would be a ' + s.mult + ', beyond the septet the activity teaches');
    }
  }

  /* ---- signals must not overlap on the plot, or a slot would be ambiguous */
  const spans = sets.map(s => {
    const w = s.br ? (s.r === 'acid' ? 0.16 : 0.07) : 0.016;
    const margin = s.br ? w * 2.5 : 0.04;
    return { s, lo: s.d - s.n / 2 * SPACING - margin, hi: s.d + s.n / 2 * SPACING + margin };
  });
  for (let i = 0; i < spans.length; i++) {
    if (spans[i].lo < 0.3) fail(m, 'set ' + spans[i].s.id + ' runs into TMS at 0 ppm');
    for (let j = i + 1; j < spans.length; j++) {
      const a = spans[i], b = spans[j];
      if (a.lo < b.hi && b.lo < a.hi) {
        fail(m, 'signals ' + a.s.id + ' (' + a.s.d + ') and ' + b.s.id + ' (' + b.s.d + ') overlap on the plot');
      }
    }
  }

  /* ---- Level 2 asks which set made which signal, from the shift alone */
  if (m.levels.indexOf(2) >= 0) {
    const present = new Set(sets.map(s => s.r));
    for (const s of sets) {
      for (const r of present) {
        if (r === s.r || r === 'alcohol') continue;
        const rr = REGIONS[r].range;
        if (s.d >= rr[0] && s.d <= rr[1]) {
          fail(m, 'Level 2: set ' + s.id + ' (' + s.r + ', ' + s.d + ') also sits inside the ' + r +
                  ' range that this compound has, so the shift does not decide it');
        }
      }
    }
    for (let i = 0; i < sets.length; i++) {
      for (let j = i + 1; j < sets.length; j++) {
        if (sets[i].r === sets[j].r && Math.abs(sets[i].d - sets[j].d) < 0.4) {
          fail(m, 'Level 2: sets ' + sets[i].id + ' and ' + sets[j].id + ' share a region and sit only ' +
                  Math.abs(sets[i].d - sets[j].d).toFixed(2) + ' ppm apart');
        }
      }
    }
  }

  /* ---- Level 3 feedback rounds the integral ratio to halves */
  if (m.levels.indexOf(3) >= 0) {
    const min = Math.min(...sets.map(s => s.nH));
    if (sets.length < 2) fail(m, 'Level 3 needs at least two signals to have a ratio');
    for (const s of sets) {
      if ((s.nH / min * 2) % 1) fail(m, 'Level 3: ' + s.nH + '/' + min + ' is not a whole number of halves');
    }
  }
}

/* ---- every level's pool must be able to fill it, needs first */
for (const L of LEVELS) {
  const pool = MOLECULES.filter(m => m.levels.indexOf(L.n) >= 0);
  if (pool.length < L.items) {
    problems.push('Level ' + L.n + ': pool has ' + pool.length + ' compounds, needs ' + L.items);
  }
  (L.needs || []).forEach((need, i) => {
    const fits = pool.filter(need);
    if (!fits.length) problems.push('Level ' + L.n + ': nothing in the pool satisfies need #' + (i + 1));
    else if (fits.length < 2) notes.push('Level ' + L.n + ': need #' + (i + 1) + ' has a single candidate (' +
                                         fits[0].id + '), so it appears in every run');
  });
  if ((L.needs || []).length > L.items) {
    problems.push('Level ' + L.n + ': more needs than items');
  }
}

/* ---- Level 5: every compound needs fair, explainable decoys */
const clusters = {};
for (const m of MOLECULES) (clusters[Chem.signatureKey(m)] = clusters[Chem.signatureKey(m)] || []).push(m.id);
Object.values(clusters).filter(c => c.length > 1).forEach(c => {
  notes.push('Cannot be told apart at Level 5, so never offered against each other: ' + c.join(', '));
});

for (const m of MOLECULES.filter(x => x.levels.indexOf(5) >= 0)) {
  const ranked = MOLECULES.filter(d => d.id !== m.id && !Chem.indistinguishable(d, m))
    .map(d => ({ d, score: Chem.similarity(m, d) }))
    .sort((a, b) => b.score - a.score);
  if (ranked.length < 2) fail(m, 'Level 5 has fewer than two fair decoys');
  /* the decoys a student can actually be offered: the top few by similarity */
  ranked.slice(0, 5).forEach(({ d }) => {
    const why = Chem.contrast(m, d);
    if (/very similar spectrum/.test(why)) fail(m, 'no single signal rules out decoy ' + d.id);
  });
}

if (notes.length) {
  console.log('Notes:');
  notes.forEach(n => console.log('  - ' + n));
}
if (problems.length) {
  console.error('\n' + problems.length + ' problem(s):');
  problems.forEach(p => console.error('  x ' + p));
  process.exit(1);
}
console.log('\nOK: ' + MOLECULES.length + ' compounds, ' +
            MOLECULES.reduce((n, m) => n + Chem.sets(m).length, 0) + ' signals, ' +
            LEVELS.length + ' levels.');

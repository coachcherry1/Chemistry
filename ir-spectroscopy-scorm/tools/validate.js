/* tools/validate.js — item bank checks. Run after any edit to molecules.js.
 *
 *   node tools/validate.js
 *
 * Exits non-zero if the bank could produce an unanswerable or ambiguous item.
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'js');
eval(fs.readFileSync(path.join(src, 'groups.js'), 'utf8'));
eval(fs.readFileSync(path.join(src, 'molecules.js'), 'utf8'));

const problems = [];
const warn = [];
const fail = (m, msg) => problems.push(m.id + ': ' + msg);

const seenIds = new Set();

for (const m of MOLECULES) {
  if (seenIds.has(m.id)) fail(m, 'duplicate id');
  seenIds.add(m.id);

  if (!m.tags || !m.tags.length) fail(m, 'no level tags, so it can never be drawn');
  if (!m.structure || !m.structure.pts) fail(m, 'no structure');

  const targets = m.bands.filter(b => b.t);
  if (!targets.length) fail(m, 'no scored bands');

  for (const b of m.bands) {
    if (b.g && !GROUPS[b.g]) fail(m, 'unknown group id "' + b.g + '"');
    if (!(b.c > 400 && b.c < 4000)) fail(m, 'band centre ' + b.c + ' is off the plotted axis');
    if (!(b.d > 0 && b.d <= 1)) fail(m, 'band at ' + b.c + ' has depth ' + b.d + ', expected 0-1');
    if (b.s !== 'l' && b.s !== 'g') fail(m, 'band at ' + b.c + ' has shape "' + b.s + '"');
    if (!b.t) continue;
    if (!b.g) fail(m, 'a scored band has no group');
    /* the whole activity is about the diagnostic region */
    if (b.c < 1500) {
      fail(m, GROUPS[b.g] ? GROUPS[b.g].label + ' is scored at ' + b.c +
                            ' cm-1, below the 1500 line' : 'a scored band sits below 1500');
    }
    if (b.g && GROUPS[b.g] && GROUPS[b.g].fingerprint) {
      fail(m, GROUPS[b.g].label + ' is marked fingerprint and must not be a drop target');
    }
    /* sp2 and sp3 C-H must meet exactly at the 3000 line that the plot draws */
    if (b.g === 'ch_sp2' && b.tol[0] !== 3000) {
      fail(m, 'the sp2 C-H window starts at ' + b.tol[0] + ', not at the 3000 line');
    }
    if (b.g === 'ch_sp3' && b.tol[1] !== 3000) {
      fail(m, 'the sp3 C-H window ends at ' + b.tol[1] + ', not at the 3000 line');
    }
    if (!b.tol) { fail(m, 'scored band at ' + b.c + ' has no tolerance window'); continue; }
    if (b.c < b.tol[0] || b.c > b.tol[1]) {
      fail(m, 'scored band centre ' + b.c + ' sits outside its window ' + b.tol.join('-'));
    }
    /* jitter must never push a peak out of its own window */
    const span = b.s === 'g' ? 18 : 6;
    if (b.c - span < b.tol[0] || b.c + span > b.tol[1]) {
      warn.push(m.id + ': ' + b.g + ' jitter reaches the edge of its window (clamped at run time)');
    }
  }

  /* two different groups must not share overlapping drop windows */
  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      if (targets[i].g === targets[j].g) {
        fail(m, 'two scored bands share the group ' + targets[i].g +
                ', which makes the pairing ambiguous');
        continue;
      }
      const [a, b] = [targets[i].tol, targets[j].tol];
      if (a[0] < b[1] && b[0] < a[1]) {
        fail(m, 'drop windows overlap: ' + targets[i].g + ' ' + a.join('-') +
                ' vs ' + targets[j].g + ' ' + b.join('-'));
      }
    }
  }

  /* a band belonging to another group must not sit inside a drop window */
  for (const t of targets) {
    for (const o of m.bands) {
      if (o === t || !o.g || o.g === t.g) continue;
      if (o.c >= t.tol[0] && o.c <= t.tol[1]) {
        fail(m, o.g + ' at ' + o.c + ' sits inside the drop window for ' + t.g);
      }
    }
  }
}

/* every level must have enough molecules to fill it, and enough themes that a
   run cannot miss a whole compound class - an activity with no alcohol in it is
   the bug this check exists to prevent */
const CORE_THEMES = ['oh', 'acid', 'co', 'nh', 'hc', 'triple'];
/* how many spectra each tag has to supply, and across how many levels: 'name'
   serves Levels 2 and 3, which try to draw disjoint sets */
const TAGS = { find: { perLevel: 7, levels: [1] }, name: { perLevel: 7, levels: [2, 3] } };
for (const [tag, cfg] of Object.entries(TAGS)) {
  const pool = MOLECULES.filter(m => m.tags.includes(tag));
  const total = cfg.perLevel * cfg.levels.length;
  if (pool.length < total) {
    problems.push('only ' + pool.length + ' molecules tagged ' + tag + ', but Level' +
                  (cfg.levels.length > 1 ? 's ' : ' ') + cfg.levels.join(' and ') +
                  ' need ' + total + ' between them');
  }
  for (const theme of CORE_THEMES) {
    const n = pool.filter(m => m.theme === theme).length;
    if (!n) {
      problems.push('no molecule tagged ' + tag + ' has theme "' + theme + '", so that ' +
                    'compound class can never appear in Level ' + cfg.levels.join('/') + ' runs');
    } else if (n < cfg.levels.length) {
      warn.push('theme "' + theme + '" has only ' + n + ' molecule(s) tagged ' + tag +
                ' for ' + cfg.levels.length + ' levels, so one will repeat across Level ' +
                cfg.levels.join(' and '));
    }
  }
}

/* Level 2 needs two decoys of a different class for the compound question */
for (const m of MOLECULES.filter(m => m.tags.includes('name'))) {
  const decoys = MOLECULES.filter(o => o.id !== m.id && o.cls !== m.cls).length;
  if (decoys < 2) problems.push(m.id + ': not enough compounds of another class to build the choices');
}

/* The compound question can only be decided from the peaks a student labelled.
   Compounds sharing a scored signature are indistinguishable to this activity,
   so they must never be offered against each other - pickDecoys() excludes
   them. Report the clusters so the bank's blind spots are visible. */
const sigOf = m => [...new Set(m.bands.filter(b => b.t).map(b => b.g))].sort().join('+');
const clusters = {};
for (const m of MOLECULES) (clusters[sigOf(m)] = clusters[sigOf(m)] || []).push(m);

const blind = [];
for (const [sig, group] of Object.entries(clusters)) {
  if (group.length < 2) continue;
  blind.push(group.map(m => m.name).join(', ') + '  [' + sig + ']');
  /* each of them still needs two options that ARE distinguishable */
  for (const m of group.filter(m => m.tags.includes('name'))) {
    const usable = MOLECULES.filter(o => o.id !== m.id && sigOf(o) !== sig).length;
    if (usable < 2) {
      problems.push(m.id + ': only ' + usable + ' compound(s) differ from it in scored ' +
                    'peaks, so its compound question cannot be given two fair decoys');
    }
  }
}

/* report repeated Level 1 keys, which is what the tile counts depend on */
const multi = [];
for (const m of MOLECULES) {
  const counts = {};
  for (const b of m.bands.filter(b => b.t)) {
    const k = levelKey(b.g, 'family');
    counts[k] = (counts[k] || 0) + 1;
  }
  const dupes = Object.keys(counts).filter(k => counts[k] > 1);
  if (dupes.length) {
    multi.push(m.id + ' needs ' + dupes.map(k => counts[k] + '× ' + keyLabel(k)).join(', '));
  }
}

console.log(MOLECULES.length + ' molecules, ' + Object.keys(GROUPS).length + ' groups, ' +
            MOLECULES.reduce((n, m) => n + m.bands.filter(b => b.t).length, 0) + ' scored bands');
if (multi.length) {
  console.log('\nLevel 1 items needing a repeated tile:');
  multi.forEach(l => console.log('  ' + l));
}
if (blind.length) {
  console.log('\nCompounds with identical scored peaks (never offered against each other');
  console.log('in the compound question, because the labelled peaks cannot separate them):');
  blind.forEach(l => console.log('  ' + l));
}
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

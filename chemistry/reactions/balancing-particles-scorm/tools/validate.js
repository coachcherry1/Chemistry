/* tools/validate.js: checks the activity without a browser. Must pass before
 * every commit.
 *
 *   node tools/validate.js
 *
 * It checks the house rules (no em dash, offline, relative paths, the
 * manifest lists every file), every substance (the particle tree has exactly
 * the atoms of the formula, a sound drawing), every reaction (balanced a
 * second way by brute force, lowest whole numbers, one answer only), the
 * inventory (ions kept together only when they are on both sides; its rows
 * match exactly when the atoms are conserved), the lesson's fixed pictures,
 * and the graded work of 400 students: the plan of
 * equations, and every choice question answered again here from the question
 * itself.
 */
const fs = require('fs');
const path = require('path');
const { load, scripts, SRC } = require('./load.js');
const A = load();
const { Chem, Rx, Particles, Gen, Steps, App, Bench, CONFIG } = A;

let bad = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { bad++; console.error('FAIL: ' + msg); } }

/* ------------------------------------------------------------ house rules */
const ROOT = path.join(__dirname, '..');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
}
const textFiles = walk(SRC).concat(walk(path.join(ROOT, 'tools')), [path.join(ROOT, 'README.md'), path.join(ROOT, 'ANSWER_KEY.md')])
  .filter((f) => fs.existsSync(f) && /\.(js|css|html|xml|md)$/.test(f));
const EM = String.fromCharCode(0x2014);
textFiles.forEach((f) => {
  const t = fs.readFileSync(f, 'utf8');
  ok(t.indexOf(EM) < 0, 'em dash in ' + path.relative(ROOT, f));
  if (f.startsWith(SRC)) {
    ok(!/https?:\/\/(?!www\.(imsproject|adlnet|imsglobal|w3)\.org)/.test(t), 'a web address in ' + path.relative(ROOT, f) + ' (offline only)');
    ok(!/(src|href)="\//.test(t), 'a path starting with / in ' + path.relative(ROOT, f));
    ok(!/webgl|@import|font-face/i.test(t), 'WebGL or a web font in ' + path.relative(ROOT, f));
  }
});
const manifest = fs.readFileSync(path.join(SRC, 'imsmanifest.xml'), 'utf8');
const listed = [];
manifest.replace(/<file href="([^"]+)"\/>/g, (m, f) => { listed.push(f); return m; });
const actual = walk(SRC).map((f) => path.relative(SRC, f)).filter((f) => f !== 'imsmanifest.xml').sort();
ok(JSON.stringify(listed.slice().sort()) === JSON.stringify(actual), 'the manifest does not list exactly the files of src/: ' + listed.join(' ') + ' vs ' + actual.join(' '));
ok(JSON.stringify(scripts().slice().sort()) === JSON.stringify(actual.filter((f) => /\.js$/.test(f))), 'index.html does not load exactly the scripts of src/js');
ok(/identifier="BALPART_MANIFEST"/.test(manifest) && !/masteryscore/i.test(manifest.replace(/<!--[\s\S]*?-->/g, '')), 'manifest identifiers, or a masteryscore');
ok(CONFIG.store === 'balancing-particles-state', 'the save key');
ok(typeof App.SCHEMA === 'number', 'SCHEMA');
const appSrc = fs.readFileSync(path.join(SRC, 'js', 'steps.js'), 'utf8');
ok(/submit-answer/.test(appSrc) && /aria-pressed/.test(appSrc) && /selected/.test(appSrc), 'graded choices need select, then Submit answer');

/* ------------------------------------------------------------- substances */
const used = {};
Rx.REACTIONS.forEach((r) => Chem.species(r).forEach((f) => { used[f] = 1; }));
Steps.COUNT.forEach((c) => { used[c[1]] = 1; });
Object.keys(Rx.SUBSTANCES).forEach((f) => {
  const want = Chem.parse(f), got = {};
  Particles.readTree(Rx.tree(f)).forEach((a) => { got[a.el] = (got[a.el] || 0) + 1; });
  const key = (o) => Object.keys(o).sort().map((k) => k + o[k]).join(' ');
  ok(key(want) === key(got), f + ': the particle tree has ' + key(got) + ', the formula ' + key(want));
  Object.keys(want).forEach((el) => ok(Particles.EL[el], f + ': no colour or radius for ' + el));
  ok(Rx.name(f) && Rx.name(f) === Rx.name(f).trim(), f + ': name');
  ok(used[f], f + ' is not used by any reaction');
  const lay = Particles.layout(f);
  ok(lay.atoms.every((a) => isFinite(a.x) && isFinite(a.y)) && lay.R > 0 && lay.R < 85, f + ': drawing out of range (R ' + lay.R.toFixed(0) + ')');
  lay.atoms.forEach((a, i) => {
    if (a.parent >= 0) {
      const p = lay.atoms[a.parent], d = Math.hypot(a.x - p.x, a.y - p.y), t = 0.8 * (a.r + p.r);
      ok(Math.abs(d - t) < 0.2 * t, f + ': touching atoms ' + p.el + ' and ' + a.el + ' are drawn ' + (d / t).toFixed(2) + ' of their distance apart');
    }
    lay.atoms.forEach((b, j) => {
      if (j <= i) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      ok(d > 0.55 * (a.r + b.r), f + ': atoms ' + a.el + ' and ' + b.el + ' are drawn on top of each other');
    });
  });
});
/* bigger atoms are drawn bigger */
const els = Object.keys(Particles.EL);
els.forEach((a) => els.forEach((b) => {
  if (Particles.EL[a][1] < Particles.EL[b][1]) ok(Particles.radius(a) < Particles.radius(b), a + ' should be drawn smaller than ' + b);
}));
ok(new Set(els.map((e) => Particles.EL[e][2] + Particles.EL[e][0])).size === els.length, 'element colours and names');

/* -------------------------------------------------------------- reactions */
function brute(r, max) {
  /* every set of coefficients up to max that conserves every atom */
  const sp = Chem.species(r), nl = r.l.length, counts = sp.map(Chem.parse), elsOf = Chem.elements(r), found = [];
  const c = sp.map(() => 1);
  for (;;) {
    let fine = true;
    for (const el of elsOf) {
      let s = 0;
      for (let j = 0; j < sp.length; j++) s += (counts[j][el] || 0) * c[j] * (j < nl ? 1 : -1);
      if (s !== 0) { fine = false; break; }
    }
    if (fine) found.push(c.slice());
    let k = 0;
    while (k < c.length && c[k] === max) { c[k] = 1; k++; }
    if (k === c.length) break;
    c[k]++;
  }
  return found;
}
const ids = {};
Rx.REACTIONS.forEach((r) => {
  ok(!ids[r.id], 'reaction id twice: ' + r.id); ids[r.id] = 1;
  Chem.species(r).forEach((f) => ok(Rx.SUBSTANCES[f], r.id + ': unknown substance ' + f));
  ok(new Set(Chem.species(r)).size === Chem.species(r).length, r.id + ': a substance on both sides');
  const c = Chem.balance(r);
  ok(c, r.id + ' cannot be balanced');
  if (!c) return;
  ok(Chem.conserved(r, c) && c.reduce(Chem.gcd, 0) === 1, r.id + ': not conserved or not lowest');
  ok(Chem.judge(r, c).kind === 'right' && Chem.judge(r, c.map((x) => x * 2)).kind === 'multiple', r.id + ': the judge');
  const max = Math.max.apply(null, c);
  const all = brute(r, Math.min(13, Math.max(max, 6)));
  ok(all.length >= 1 && all.every((s) => s.every((x, j) => x * c[0] === c[j] * s[0])), r.id + ': brute force finds another answer');
  ok(all.some((s) => s.join() === c.join()), r.id + ': brute force does not find ' + c.join());
  ok([1, 2, 3].indexOf(r.level) >= 0, r.id + ': level');
  ok(['S', 'D', 'SR', 'DR', 'C', 'N', ''].indexOf(r.type) >= 0, r.id + ': type');
  if (r.type === 'S') ok(r.r.length === 1, r.id + ': a synthesis has one product');
  if (r.type === 'D') ok(r.l.length === 1, r.id + ': a decomposition has one reactant');
  if (r.type === 'C') ok(r.l.indexOf('O2') >= 0 && r.r.join() === 'CO2,H2O', r.id + ': a combustion burns to CO2 and H2O');
  if (r.type === 'N') ok(r.r.indexOf('H2O') >= 0, r.id + ': a neutralization makes water');
  if (!r.big) {
    /* the picture stays readable: at the answer, and with every coefficient one too many */
    const nl = r.l.length;
    const sc = (cs) => Math.min(
      Particles.fill(null, r.l.map((f, j) => ({ f, n: cs[j] })), { w: Bench.BOXW, h: Bench.BOXH, measure: true }),
      Particles.fill(null, r.r.map((f, j) => ({ f, n: cs[nl + j] })), { w: Bench.BOXW, h: Bench.BOXH, measure: true }));
    ok(sc(c) >= 0.75, r.id + ': particles drawn too small at the answer (scale ' + sc(c).toFixed(2) + ')');
    ok(sc(c.map((x) => x + 2)) >= 0.55, r.id + ': particles drawn too small two past the answer');
  }
});
ok(Particles.fill(null, [{ f: 'O2', n: 20 }, { f: 'C3H5(NO3)3', n: 20 }], { w: Bench.BOXW, h: Bench.BOXH, measure: true }) > 0, 'a full box still draws');

/* -------------------------------------------------------------- inventory */
const rnd = A.UI.rng(77);
Rx.REACTIONS.forEach((r) => {
  const c = Chem.balance(r), info = Chem.rows(r), sp = Chem.species(r);
  ok(Chem.inventory(r, c).every((x) => x.ok), r.id + ': the inventory does not match at the answer');
  /* every atom is in exactly one row */
  sp.forEach((f, j) => {
    const want = Chem.parse(f), got = {};
    info.rows.forEach((row) => {
      const a = row.ion ? Chem.parse(row.ion) : { [row.key]: 1 };
      Object.keys(a).forEach((el) => { got[el] = (got[el] || 0) + a[el] * row.per[j]; });
    });
    Object.keys(want).forEach((el) => ok(want[el] === (got[el] || 0), r.id + ': ' + f + ' has ' + want[el] + ' ' + el + ', the inventory counts ' + (got[el] || 0)));
  });
  info.rows.forEach((row) => ok(row.per.every((n) => n >= 0), r.id + ': a negative count in row ' + row.key));
  const nl = r.l.length;
  info.kept.forEach((ion) => {
    const per = info.rows.filter((x) => x.key === ion)[0].per;
    ok(per.slice(0, nl).some((n) => n > 0) && per.slice(nl).some((n) => n > 0), r.id + ': ' + ion + ' kept but not on both sides');
    /* the outline in the picture: as many ions found among the touching atoms as the inventory counts */
    sp.forEach((f, j) => {
      const found = Particles.groups(f, ion, info.hoh);
      ok(found.length === per[j], r.id + ': ' + f + ' should show ' + per[j] + ' ' + ion + ' outlined, the drawing finds ' + found.length);
      const want = Chem.parse(ion), atoms = Particles.layout(f).atoms;
      found.forEach((g) => {
        const got = {};
        g.forEach((i) => { got[atoms[i].el] = (got[atoms[i].el] || 0) + 1; });
        ok(Object.keys(want).every((el) => want[el] === got[el]) && new Set(g).size === g.length, r.id + ': the outline of ' + ion + ' in ' + f + ' has the wrong atoms');
      });
      ok(new Set(found.flat()).size === found.flat().length, r.id + ': two ' + ion + ' outlines share an atom in ' + f);
    });
  });
  /* a neutralization writes water as HOH and keeps the hydroxide together */
  ok(info.hoh === (r.type === 'N'), r.id + ': only a neutralization writes HOH');
  if (r.type === 'N') ok(info.kept.indexOf('OH') >= 0 && /HOH/.test(Chem.equation(r)) && !/H₂O/.test(Chem.equation(r)), r.id + ': a neutralization keeps OH and shows HOH');
  ok(info.rows.length <= 6, r.id + ': more than 6 rows in the inventory');
  /* the rows all match exactly when the atoms are conserved */
  for (let k = 0; k < 40; k++) {
    const t = c.map((x) => Math.max(1, x + Math.floor(rnd() * 5) - 2));
    ok(Chem.inventory(r, t).every((x) => x.ok) === Chem.conserved(r, t), r.id + ': inventory and atoms disagree at ' + t.join());
  }
});
const kept = (id) => Chem.rows(Rx.get(id)).kept.join();
ok(kept('acetate') === 'PO4,C2H3O2', 'the teacher\'s example keeps PO4 and C2H3O2 together: ' + kept('acetate'));
ok(Chem.rows(Rx.get('acetate')).rows.map((x) => x.key).join() === 'Na,PO4,Ca,C2H3O2', 'the teacher\'s inventory order: Na, PO4, Ca, C2H3O2');
ok(kept('h3po4') === '' && Chem.rows(Rx.get('h3po4')).rows.map((x) => x.key).join() === 'P,O,H', 'P4O10 + H2O: PO4 is on one side only, so atom by atom');
ok(Chem.rows(Rx.get('naohh2so4')).rows.map((x) => x.key).join() === 'Na,OH,H,SO4', 'NaOH + H2SO4 with HOH: rows Na, OH, H, SO4');
ok(kept('nawater') === '', 'Na + H2O is not a neutralization: no HOH');
ok(kept('ethanol') === '' && kept('kclo3') === '' && kept('nitroglycerin') === '', 'an ion on one side only must not be kept');
ok(Chem.ionCount('Ca3(PO4)2', 'PO4') === 2 && Chem.ionCount('P4O10', 'PO4') === 0 && Chem.ionCount('NO2', 'NO3') === 0 && Chem.ionCount('NH4NO3', 'NH4') === 1, 'ionCount');
ok(Gen.ionList().length >= 8, 'too few inventory questions: ' + Gen.ionList().length);

/* ----------------------------------------------------------------- lesson */
const stepIds = {};
App.STEPS.forEach((s, i) => {
  ok(!stepIds[s.id], 'step id twice: ' + s.id); stepIds[s.id] = 1;
  ok(i === 0 || s.part >= App.STEPS[i - 1].part, 'parts out of order at ' + s.id);
  if (s.kind === 'bench') {
    ok(Rx.get(s.rx) && Rx.get(s.rx).lesson, s.id + ': a lesson bench needs a lesson reaction');
    if (s.ask) ok(s.ask.c.filter((c) => c.ok).length === 1 && s.ask.c.every((c) => c.fb), s.id + ': the prediction needs one right choice and feedback for each');
  }
});
ok(App.STEPS[App.STEPS.length - 1].kind === 'results' && App.PARTS.length === App.STEPS[App.STEPS.length - 1].part, 'results last');
const cons = Steps.CARDS.map((c) => Chem.conserved(Rx.get(c.rx), c.c));
ok(cons.filter(Boolean).length === 2 && cons.length === 4, 'Is it conserved? needs two pictures of each kind');
Steps.COUNT.forEach((c) => ok(Rx.SUBSTANCES[c[1]] && c[0] > 1, 'count card ' + c[1]));

/* ----------------------------------------------------------- graded work */
const graded = Rx.REACTIONS.filter((r) => !r.lesson && !r.big);
graded.forEach((r) => ok(Chem.balance(r).some((x) => x > 1), r.id + ': a graded equation whose answer is all 1s'));
Gen.PLAN.forEach((pl) => ok(Gen.pool(pl[0]).length >= pl[1] + 4, 'pool for level ' + pl[0] + ' too small'));
ok(Gen.COUNT === 10 && Gen.QUIZ === 6 && App.ITEMS === 16, 'the plan: 10 equations and 6 questions');
const seenRx = {}, seenQ = {};
for (let seed = 1; seed <= 400; seed++) {
  const set = Gen.set(seed * 7919 + 13);
  ok(set.length === 10 && new Set(set.map((p) => p.id)).size === 10, 'seed ' + seed + ': 10 different equations');
  ok(set.map((p) => p.level).join('') === '1112222333', 'seed ' + seed + ': 3 easy, 4 medium, 3 hard, in order');
  set.forEach((p) => { seenRx[p.id] = 1; ok(!p.rx.lesson && !p.rx.big && Chem.judge(p.rx, p.coefs).kind === 'right', 'seed ' + seed + ': ' + p.id); });
  const qs = Gen.quiz(seed * 7919 + 13);
  ok(qs.length === 6, 'seed ' + seed + ': 6 questions');
  let yes = 0;
  qs.forEach((q) => {
    seenQ[q.id] = 1;
    const tag = 'seed ' + seed + ' ' + q.id + ': ';
    ok(q.choices.length >= 3 && q.choices.length <= 4 && new Set(q.choices).size === q.choices.length, tag + 'choices ' + q.choices.join(' / '));
    ok(q.right >= 0 && q.right < q.choices.length && q.why && q.stem, tag + 'right answer or explanation missing');
    const right = q.choices[q.right];
    if (q.kind === 'count') {
      const m = /How many (\w+) atoms are in (\d+) (\S+)\?/.exec(q.stem);
      const el = Object.keys(Particles.EL).filter((e) => Particles.EL[e][0] === m[1])[0];
      const f = m[3].replace(/[₀-₉]/g, (d) => '₀₁₂₃₄₅₆₇₈₉'.indexOf(d));
      ok(+right === +m[2] * Chem.parse(f)[el], tag + 'count');
    } else if (q.kind === 'conserved') {
      const t = Bench.tallyOf(Bench.items(q.fig.rx, q.fig.coefs)), off = t.filter((x) => !x.ok);
      ok(off.length <= 1, tag + 'more than one element off');
      if (off.length) ok(right === 'No: the number of ' + Particles.EL[off[0].el][0] + ' atoms changes', tag + 'which element');
      else { yes++; ok(/^Yes/.test(right), tag + 'conserved'); }
      ok(q.fig.coefs.reduce((a, b) => a + b, 0) <= 14, tag + 'too many particles to count');
    } else if (q.kind === 'inventory') {
      /* counted again here, straight from the formulas */
      const r = Rx.get(q.rxid), n = (list) => list.reduce((t, f) => {
        const m = new RegExp('\\(' + q.ion + '\\)(\\d*)').exec(f);
        /* the water of a neutralization is HOH: one hydroxide */
        if (f === 'H2O') return t + (q.ion === 'OH' && r.type === 'N' ? 1 : 0);
        return t + (m ? +(m[1] || 1) : f.indexOf(q.ion) >= 0 ? 1 : 0);
      }, 0);
      ok(right === n(r.l) + ' in the reactants, ' + n(r.r) + ' in the products', tag + 'the ion count');
      ok(n(r.l) > 0 && n(r.r) > 0 && q.choices.length === 4, tag + 'the ion must be on both sides, with four choices');
    }
    /* the "No" choices and the count choices differ only in a name or a number, so only the others are checked */
    if (/[a-z]{3}/.test(right) && q.kind !== 'inventory' && !/^No: /.test(right)) {
      ok(q.choices.some((c, i) => i !== q.right && c.length > right.length), tag + 'the right answer is the longest choice');
    }
  });
  ok(yes === 1, 'seed ' + seed + ': one conserved picture and one that is not');
  ok(qs.filter((q) => q.kind === 'inventory').length === 1, 'seed ' + seed + ': one inventory question');
  const figs = qs.filter((q) => q.fig).map((q) => q.fig.rx.id);
  ok(new Set(figs).size === figs.length, 'seed ' + seed + ': a reaction drawn in two questions');
}
graded.forEach((r) => ok(seenRx[r.id], r.id + ' never comes up in 400 students'));
Gen.RULES.forEach((r) => { ok(seenQ[r.id], r.id + ' never comes up'); ok(r.c.slice(1).some((c) => c.length > r.c[0].length), r.id + ': the right answer is the longest'); });
Gen.COUNT_PLAIN.concat(Gen.COUNT_BRACKET).forEach((it) => {
  const q = Gen.countQ('x', it, A.UI.rng(1));
  ok(q.choices.length === 4, 'count question ' + it.join(' ') + ' needs four different choices');
});

console.log(bad ? bad + ' of ' + checks + ' checks FAILED' : 'All ' + checks + ' checks passed: ' + Object.keys(Rx.SUBSTANCES).length + ' substances, ' +
  Rx.REACTIONS.length + ' reactions (' + graded.length + ' in the graded pool), 400 students.');
process.exit(bad ? 1 : 0);

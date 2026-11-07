/* problems.js: every problem, warm-up and drill card, from a seed, for the
 * package config.js names (CONFIG.mode):
 *   empirical   empirical formulas from percents or grams; molecular
 *               formulas from a molar mass
 *   hydrate     the formula of a hydrate from percent water, masses before
 *               and after heating, or crucible lab data
 *   combustion  the empirical (and molecular) formula of a hydrocarbon from
 *               the grams of CO2 and H2O it makes
 *
 * A problem is a table of rows (one per element, or the anhydrous salt and
 * the water, or C from CO2 and H from H2O) worked through the teacher's four
 * steps. Every number shown is computed here from the real formula in
 * compounds.js (standard atomic weights), never typed. A problem is used
 * only when every quotient sits close to its fraction with the class's
 * table, the full masses and whole numbers (tools/validate.js tries five
 * tables): close means within 0.07 of a whole number, or nearer its
 * fraction than halfway to the next one, less 0.005.
 */
var Gen = (function () {
  'use strict';

  var MODE = CONFIG.mode;
  var CANDS = [0].concat(Chem.FRACS.map(function (f) { return f.v; })).concat([1]);

  function std(x) { return Chem.stdMass(x); }
  function pick(arr, rand) { return arr[Math.floor(rand() * arr.length)]; }
  function between(rand, lo, hi, dp) { return Chem.roundTo(lo + rand() * (hi - lo), dp); }
  function elName(x) { return Chem.el(x).name; }
  function listText(words) { return words.length < 3 ? words.join(' and ') : words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1]; }
  function g3(v) { return Chem.fmtDec(v, 3); }

  /* how far a quotient may sit from its target and still be read the same */
  function allowance(t) {
    var f = t - Math.floor(t + 1e-9);
    if (f < 1e-6 || f > 1 - 1e-6) return 0.07;
    var i = 0;
    while (i < CANDS.length && Math.abs(CANDS[i] - f) > 1e-6) i++;
    var lo = CANDS[i - 1], hi = CANDS[i + 1];
    var dlo = lo === 0 ? f - Chem.WHOLE : (f - lo) / 2;
    var dhi = hi === 1 ? 1 - Chem.WHOLE - f : (hi - f) / 2;
    return Math.min(dlo, dhi) - 0.005;
  }

  /* --------------------------------------------------------------- rows */

  /* The moles of each row from the grams, with a periodic table (a function
     from symbol to atomic mass) and moles rounded to sig figures (0: not). */
  function molesWith(p, mass, sig) {
    var M = function (f) { var c = Chem.info(f).counts; return Object.keys(c).reduce(function (s, x) { return s + c[x] * mass(x); }, 0); };
    return p.rows.map(function (r) {
      var m = r.g / M(r.mmF);
      if (sig) m = Chem.roundSig(m, sig);
      if (r.per) { m = m * r.per; if (sig) m = Chem.roundSig(m, sig); }
      return m;
    });
  }
  function quotients(moles, round) {
    var min = Math.min.apply(null, moles);
    return moles.map(function (m) { return round ? Chem.roundTo(m / min, 2) : m / min; });
  }
  var CHECK_TABLES = [
    function (x) { return Chem.t10(x) / 10; },
    std,
    function (x) { return x === 'Cl' ? 35.5 : Math.round(std(x)); },
    function (x) { return Math.round(std(x)); }
  ];
  /* every quotient close to its target with these tables, and read the same */
  function clean(p, tables) {
    return (tables || CHECK_TABLES).every(function (mass) {
      return [0, 3].every(function (sig) {
        var q = quotients(molesWith(p, mass, sig), !!sig);
        if (Chem.multiplierFor(q) !== p.mult) return false;
        return q.every(function (v, i) {
          return Math.abs(v - p.rows[i].target) <= allowance(p.rows[i].target) && Chem.wholeAfter(v, p.mult) === p.rows[i].sub;
        });
      });
    });
  }

  /* --------------------------------------------------------- problems */

  /* Empirical formula problems. kind 'pct' or 'g'; mol: give the molar mass. */
  function empiricalProblem(c, kind, mol, rand) {
    var I = Chem.info(c.f), ef = Chem.empirical(c.f);
    var M = Chem.mmStd(c.f);
    var w = I.order.map(function (x) { return I.counts[x] * std(x) / M; });
    var min = Math.min.apply(null, I.order.map(function (x) { return ef.counts[x]; }));
    var targets = I.order.map(function (x) { return ef.counts[x] / min; });
    var mult = Chem.multiplierFor(targets);
    var p = {
      mode: 'empirical', kind: kind, f: c.f, name: c.name, note: c.note, order: I.order.slice(),
      efCounts: ef.counts, ef: ef.f, efDisp: Chem.subs(ef.f), mult: mult, choice: kind === 'pct' ? 'pct' : 'g',
      rows: [], data: []
    };
    var total = 0;
    if (kind === 'g') {
      var minW = Math.min.apply(null, w);
      var lo = Math.max(1.2, 0.15 / minW);
      total = between(rand, lo, lo + 3, 3);
    }
    I.order.forEach(function (x, i) {
      var row = { key: x, label: x, atom: x, mmF: x, target: targets[i], sub: Chem.wholeAfter(targets[i], mult) };
      if (kind === 'pct') {
        var s = (100 * w[i]).toPrecision(3);
        row.pct = s; row.g = parseFloat(s); row.gStr = s; row.how = 'pct'; row.typed = true; row.dp = Chem.decimalsIn(s);
        p.data.push({ label: elName(x), value: s + '%' });
      } else {
        row.g = Chem.roundTo(total * w[i], 3); row.gStr = g3(row.g); row.how = 'given'; row.typed = false; row.dp = 3;
        p.data.push({ label: elName(x), value: row.gStr + ' g' });
      }
      p.rows.push(row);
    });
    var names = listText(I.order.map(elName));
    if (kind === 'pct') {
      p.prompt = 'A compound of ' + names + ' is ' + listText(p.rows.map(function (r) { return r.pct + '% ' + elName(r.atom); })) + ' by mass.';
    } else {
      p.prompt = 'A sample of a compound contains ' + listText(p.rows.map(function (r) { return r.gStr + ' g of ' + elName(r.atom); })) + '.';
    }
    if (mol) {
      var Ms = Chem.fmtDec(M, 1);
      p.mol = { M: parseFloat(Ms), Mstr: Ms, n: ef.n, f: c.f, disp: Chem.subs(c.f), counts: I.counts, efm: Chem.mmValue(ef.f) };
      p.prompt += ' Its molar mass is ' + Ms + ' g/mol.';
      p.data.push({ label: 'molar mass', value: Ms + ' g/mol' });
      p.ask = 'Find its empirical formula and its molecular formula.';
    } else p.ask = 'Find its empirical formula.';
    return p;
  }

  /* Hydrate problems. kind 'pct' (percent water), 'heat' (masses before and
     after heating), 'lab' (crucible readings). */
  function hydrateProblem(c, kind, rand) {
    var Ms = Chem.mmStd(c.salt), Mw = Chem.mmStd('H2O');
    var fs = Ms / (Ms + c.n * Mw);
    var saltD = Chem.subs(c.salt);
    var p = {
      mode: 'hydrate', kind: kind, salt: c.salt, saltDisp: saltD, name: c.name, n: c.n, note: c.note, mult: 1,
      f: Chem.hydrateText(c.salt, c.n), fDisp: Chem.hydrateDisp(c.salt, c.n), prefix: PREFIXES[c.n - 1],
      choice: kind === 'pct' ? 'pct' : 'g', data: []
    };
    var rows = [
      { key: 'salt', label: saltD, mmF: c.salt, target: 1, sub: 1 },
      { key: 'water', label: 'H₂O', mmF: 'H2O', target: c.n, sub: c.n }
    ];
    p.rows = rows;
    var intro = 'A hydrate of ' + c.name + ', ' + saltD + ',';
    if (kind === 'pct') {
      var s = (100 * (1 - fs)).toPrecision(3);
      var dp = Chem.decimalsIn(s), rest = Chem.fmtDec(100 - parseFloat(s), dp);
      rows[1].g = parseFloat(s); rows[1].gStr = s; rows[1].how = 'pct'; rows[1].pct = s;
      rows[0].g = parseFloat(rest); rows[0].gStr = rest; rows[0].how = 'rest'; rows[0].pct = s;
      rows.forEach(function (r) { r.typed = true; r.dp = dp; });
      p.prompt = intro + ' is ' + s + '% water by mass.';
      p.data.push({ label: 'water', value: s + '%' });
      return p;
    }
    /* a little scatter, as a real balance gives, but the quotient stays close to n */
    for (var tries = 0; tries < 40; tries++) {
      var H = between(rand, 1.5, 4.5, 3);
      var e = (rand() - 0.5) * 0.008;
      var R = Chem.roundTo(H * fs * (1 + e), 3);
      var C = kind === 'lab' ? between(rand, 20, 30, 3) : 0;
      rows[0].g = R; rows[1].g = Chem.roundTo(H - R, 3);
      rows.forEach(function (r) { r.gStr = g3(r.g); r.dp = 3; });
      p.H = H; p.R = R; p.C = C;
      if (clean(p)) break;
    }
    if (kind === 'heat') {
      rows[0].how = 'given'; rows[0].typed = false;
      rows[1].how = 'sub'; rows[1].typed = true;
      rows[1].ctx = { a: H, b: R, how: 'Water lost = mass of the hydrate − mass of the anhydrous salt left.',
        other: [{ v: R, msg: 'That is what is left, the anhydrous salt. The water is what was lost: hydrate − anhydrous salt.' },
                { v: H, msg: 'That is the whole hydrate. The water is what was lost: hydrate − anhydrous salt.' }] };
      p.prompt = 'A ' + g3(H) + ' g sample of a hydrate of ' + c.name + ', ' + saltD + ', is heated until all of its water is driven off. ' +
        g3(R) + ' g of anhydrous ' + saltD + ' is left.';
      p.data.push({ label: 'hydrate', value: g3(H) + ' g' }, { label: 'after heating', value: g3(R) + ' g' });
      return p;
    }
    var cH = Chem.roundTo(C + H, 3), cR = Chem.roundTo(C + R, 3);
    p.lab = [
      { label: 'Empty crucible', value: g3(C) + ' g' },
      { label: 'Crucible + hydrate', value: g3(cH) + ' g' },
      { label: 'Crucible + anhydrous ' + saltD + ' (heated to constant mass)', value: g3(cR) + ' g' }
    ];
    rows.forEach(function (r) { r.how = 'sub'; r.typed = true; });
    rows[0].ctx = { a: cR, b: C, how: 'Anhydrous salt = (crucible + anhydrous salt) − empty crucible.',
      other: [{ v: cR, msg: 'That still includes the crucible: subtract the empty crucible.' },
              { v: H, msg: 'That is the hydrate before heating. The anhydrous salt is what is left: (crucible + anhydrous salt) − empty crucible.' },
              { v: Chem.roundTo(cH - cR, 3), msg: 'That is the water lost. This row is the anhydrous salt left in the crucible.' }] };
    rows[1].ctx = { a: cH, b: cR, how: 'Water lost = (crucible + hydrate) − (crucible + anhydrous salt).',
      other: [{ v: H, msg: 'That is the whole hydrate. The water is what was lost on heating: (crucible + hydrate) − (crucible + anhydrous salt).' },
              { v: R, msg: 'That is the anhydrous salt. The water is what was lost: (crucible + hydrate) − (crucible + anhydrous salt).' }] };
    p.prompt = 'A student heats ' + intro.replace(/^A /, 'a ') + ' in a crucible until its mass stops changing.';
    return p;
  }

  /* Combustion analysis: a hydrocarbon burned in oxygen; the grams of CO2 and H2O. */
  function combustionProblem(c, mol, rand) {
    var I = Chem.info(c.f), ef = Chem.empirical(c.f);
    var M = Chem.mmStd(c.f);
    var nC = I.counts.C, nH = I.counts.H;
    var min = Math.min(ef.counts.C, ef.counts.H);
    var targets = [ef.counts.C / min, ef.counts.H / min];
    var mult = Chem.multiplierFor(targets);
    var p = {
      mode: 'combustion', kind: 'comb', f: c.f, name: c.name, note: c.note, order: ['C', 'H'], efCounts: ef.counts, ef: ef.f,
      efDisp: Chem.subs(ef.f), mult: mult, choice: 'g', data: []
    };
    p.rows = [
      { key: 'C', label: 'C', atom: 'C', molecule: 'CO2', mmF: 'CO2', per: 1, target: targets[0], sub: Chem.wholeAfter(targets[0], mult), how: 'given', typed: false, dp: 3 },
      { key: 'H', label: 'H', atom: 'H', molecule: 'H2O', mmF: 'H2O', per: 2, target: targets[1], sub: Chem.wholeAfter(targets[1], mult), how: 'given', typed: false, dp: 3 }
    ];
    for (var tries = 0; tries < 40; tries++) {
      var S = between(rand, 0.4, 2.0, 3);
      p.S = S;
      p.rows[0].g = Chem.roundTo(S * nC * Chem.mmStd('CO2') / M, 3);
      p.rows[1].g = Chem.roundTo(S * (nH / 2) * Chem.mmStd('H2O') / M, 3);
      p.rows.forEach(function (r) { r.gStr = g3(r.g); });
      if (clean(p)) break;
    }
    p.prompt = 'A ' + g3(p.S) + ' g sample of an unknown hydrocarbon (only C and H) burns completely in oxygen. It makes ' +
      p.rows[0].gStr + ' g of CO₂ and ' + p.rows[1].gStr + ' g of H₂O.';
    p.data.push({ label: 'burned', value: g3(p.S) + ' g' }, { label: 'CO₂', value: p.rows[0].gStr + ' g' }, { label: 'H₂O', value: p.rows[1].gStr + ' g' });
    if (mol) {
      var Ms = Chem.fmtDec(M, 1);
      p.mol = { M: parseFloat(Ms), Mstr: Ms, n: ef.n, f: c.f, disp: Chem.subs(c.f), counts: I.counts, efm: Chem.mmValue(ef.f) };
      p.prompt += ' Its molar mass is ' + Ms + ' g/mol.';
      p.data.push({ label: 'molar mass', value: Ms + ' g/mol' });
      p.ask = 'Find its empirical formula and its molecular formula.';
    } else p.ask = 'Find its empirical formula.';
    return p;
  }

  /* The steps of a problem: the four, plus the molecular formula or the name. */
  function finish(p, id) {
    p.id = id;
    p.steps = ['grams', 'moles', 'divide', 'multiply'];
    if (p.mol) p.steps.push('molecular');
    if (p.mode === 'hydrate') { p.steps.push('name'); p.ask = 'Find the formula of the hydrate and name it.'; }
    p.promptText = p.prompt + ' ' + p.ask;
    p.answerText = p.mode === 'hydrate' ? p.fDisp + ', ' + p.name + ' ' + p.prefix + 'hydrate' :
      p.efDisp + (p.mol ? '; molecular formula ' + p.mol.disp : '');
    p.answerAscii = p.mode === 'hydrate' ? p.f : p.ef + (p.mol ? ' ' + p.mol.f : '');
    return p;
  }

  /* ------------------------------------------------------------ catalogue */

  function multOf(f) {
    var ef = Chem.empirical(f), I = Chem.info(f);
    var min = Math.min.apply(null, I.order.map(function (x) { return ef.counts[x]; }));
    return Chem.multiplierFor(I.order.map(function (x) { return ef.counts[x] / min; }));
  }
  function make(c, kind, mol, rand) {
    if (MODE === 'empirical') return empiricalProblem(c, kind, mol, rand);
    if (MODE === 'hydrate') return hydrateProblem(c, kind, rand);
    return combustionProblem(c, mol, rand);
  }
  function catalogue() {
    if (MODE === 'empirical') return FORMULAS;
    if (MODE === 'hydrate') return HYDRATES;
    return HYDROCARBONS;
  }
  function keyOf(c) { return c.f || c.salt; }

  /* A problem of a kind for a compound, or null when its numbers are not clean. */
  function build(c, slot, rand) {
    var p = make(c, slot.kind, !!slot.mol, rand);
    return clean(p) ? p : null;
  }

  /* --------------------------------------------------------- the plans */

  var PLANS = {
    empirical: [
      { kind: 'pct' }, { kind: 'pct' }, { kind: 'pct' }, { kind: 'g' }, { kind: 'g' },
      { kind: 'pct', mol: true }, { kind: 'pct', mol: true }, { kind: 'g', mol: true }
    ],
    hydrate: [{ kind: 'pct' }, { kind: 'pct' }, { kind: 'heat' }, { kind: 'heat' }, { kind: 'lab' }, { kind: 'lab' }],
    combustion: [{ kind: 'comb' }, { kind: 'comb' }, { kind: 'comb' }, { kind: 'comb', mol: true }, { kind: 'comb', mol: true }, { kind: 'comb', mol: true }]
  };
  var PLAN = PLANS[MODE];

  var WARMS = {
    empirical: [
      { id: 'w-whole', kind: 'pct', mult: [1] },
      { id: 'w-grams', kind: 'g', mult: [1] },
      { id: 'w-mult', kind: 'pct', mult: [2, 3] },
      { id: 'w-mol', kind: 'pct', mol: true, minN: 2 }
    ],
    hydrate: [{ id: 'w-pct', kind: 'pct' }, { id: 'w-heat', kind: 'heat' }, { id: 'w-lab', kind: 'lab' }],
    combustion: [
      { id: 'w-whole', kind: 'comb', mult: [1] },
      { id: 'w-mult', kind: 'comb', mult: [3] },
      { id: 'w-mol', kind: 'comb', mol: true, minN: 2, mult: [1] }
    ]
  };
  var WARM = WARMS[MODE].map(function (w) { return w.id; });

  function fits(c, slot) {
    if (slot.mol && MODE === 'empirical' && !c.mol) return false;
    if (MODE === 'hydrate') return true;
    var m = multOf(c.f);
    if (slot.mult && slot.mult.indexOf(m) < 0) return false;
    if (slot.minN && Chem.empirical(c.f).n < slot.minN) return false;
    return true;
  }

  function warmUsed(seed) {
    var used = {};
    WARMS[MODE].forEach(function (w) { var p = warm(seed, w.id); used[keyOf(p.c)] = 1; });
    return used;
  }

  /* The warm-ups: each its own compound, from the seed. */
  var warmCache = {};
  function warm(seed, id) {
    var k = seed + ':' + id;
    if (warmCache[k]) return warmCache[k];
    var idx = WARM.indexOf(id);
    if (idx < 0) throw new Error('no warm-up ' + id);
    var slot = WARMS[MODE][idx];
    var rand = UI.rng(seed * 7919 + UI.hash(id));
    var taken = {};
    for (var j = 0; j < idx; j++) taken[keyOf(warm(seed, WARM[j]).c)] = 1;
    var list = UI.shuffle(catalogue(), rand).filter(function (c) { return !taken[keyOf(c)] && fits(c, slot); });
    for (var i = 0; i < list.length; i++) {
      var p = build(list[i], slot, rand);
      if (p) {
        p.c = list[i];
        return (warmCache[k] = finish(p, 'W' + (idx + 1) + '_' + keyOf(list[i]).replace(/\W/g, '')));
      }
    }
    throw new Error('no warm-up for ' + id);
  }

  /* What a set must cover: every multiplier, and molecular formulas with n above 1. */
  function setOK(list) {
    if (MODE === 'hydrate') {
      var ns = list.map(function (p) { return p.n; });
      var distinct = ns.filter(function (n, i) { return ns.indexOf(n) === i; }).length;
      return distinct >= 4 && ns.some(function (n) { return n <= 2; }) && ns.some(function (n) { return n >= 6; });
    }
    var ms = list.map(function (p) { return p.mult; });
    var count = function (m) { return ms.filter(function (x) { return x === m; }).length; };
    var mols = list.filter(function (p) { return p.mol; });
    if (count(1) < 1 || count(3) < 1 || count(4) + count(5) < 1) return false;
    if (count(2) < (MODE === 'empirical' ? 2 : 1)) return false;
    if (mols.filter(function (p) { return p.mol.n >= 2; }).length < 2) return false;
    return true;
  }

  var setCache = {};
  function set(seed) {
    if (setCache[seed]) return setCache[seed];
    var used = warmUsed(seed);
    var rand = UI.rng(seed * 104729 + 17);
    for (var attempt = 0; attempt < 200; attempt++) {
      var taken = {};
      var list = [];
      var ok = PLAN.every(function (slot) {
        var cands = UI.shuffle(catalogue(), rand).filter(function (c) { return !used[keyOf(c)] && !taken[keyOf(c)] && fits(c, slot); });
        for (var i = 0; i < cands.length; i++) {
          var p = build(cands[i], slot, rand);
          if (p) { p.c = cands[i]; taken[keyOf(cands[i])] = 1; list.push(p); return true; }
        }
        return false;
      });
      if (!ok || !setOK(list)) continue;
      /* a mixed order that opens with a problem without a molar mass and an easy multiplier */
      var order = UI.shuffle(list, rand);
      var first = order.filter(function (p) { return !p.mol && p.mult <= 2 && (MODE === 'combustion' || p.kind === 'pct'); })[0];
      if (!first) continue;
      order = [first].concat(order.filter(function (p) { return p !== first; }));
      return (setCache[seed] = order.map(function (p, i) { return finish(p, 'P' + (i + 1) + '_' + keyOf(p.c).replace(/\W/g, '')); }));
    }
    throw new Error('no set for seed ' + seed);
  }

  /* ------------------------------------------------------------ drills */

  /* Name the fraction: every fraction once, one more half, and a little of
     the scatter real data have (1.34 is still 1 1/3). */
  function fracCards(seed) {
    var rand = UI.rng(seed * 31 + 5);
    var fr = Chem.FRACS.concat([Chem.FRACS.filter(function (f) { return f.den === 2; })[0]]);
    return UI.shuffle(fr, rand).map(function (f) {
      var w = 1 + Math.floor(rand() * 3);
      var noise = pick([0, 0, 0.01, -0.01], rand);
      var q = Chem.roundTo(w + f.v + noise, 2);
      return { q: q, str: Chem.fmtQ(q), w: w, num: f.num, den: f.den, uni: f.uni, mult: f.den, whole: Chem.wholeAfter(q, f.den) };
    });
  }
  /* Whole or not? four to round (within 0.06 of a whole number) and four to multiply. */
  function wholeCards(seed) {
    var rand = UI.rng(seed * 37 + 11);
    var cards = [];
    var offs = UI.shuffle([0.01, 0.02, 0.03, 0.04, 0.05, -0.01, -0.02, -0.03, -0.04], rand);
    for (var i = 0; i < 4; i++) {
      /* a quotient after Divide by small is never below 1 */
      var w = (offs[i] < 0 ? 2 : 1) + Math.floor(rand() * 2);
      var q = Chem.roundTo(w + offs[i], 2);
      cards.push({ q: q, str: Chem.fmtQ(q), round: true, n: Math.round(q) });
    }
    UI.shuffle(Chem.FRACS, rand).slice(0, 4).forEach(function (f) {
      var w2 = 1 + Math.floor(rand() * 3);
      var q2 = Chem.roundTo(w2 + f.v, 2);
      cards.push({ q: q2, str: Chem.fmtQ(q2), round: false, uni: f.uni, mult: f.den });
    });
    return UI.shuffle(cards, rand);
  }
  /* Multiply them all: ratios of real compounds that need x 2 to x 5. */
  function allRatios(seed) {
    var rand = UI.rng(seed * 41 + 3);
    var seen = {};
    var pool = FORMULAS.concat(HYDROCARBONS).filter(function (c) {
      if (seen[c.f]) return false;
      seen[c.f] = 1;
      return multOf(c.f) > 1;
    });
    var out = [], mults = {};
    UI.shuffle(pool, rand).forEach(function (c) {
      var m = multOf(c.f);
      if (out.length >= 4 || mults[m]) return;
      mults[m] = 1;
      var ef = Chem.empirical(c.f), I = Chem.info(c.f);
      var min = Math.min.apply(null, I.order.map(function (x) { return ef.counts[x]; }));
      out.push({ f: c.f, ef: ef.f, efDisp: Chem.subs(ef.f), name: c.name, mult: m, rows: I.order.map(function (x) {
        var q = ef.counts[x] / min;
        return { sym: x, q: Chem.roundTo(q, 2), str: Chem.fmtQ(q), sub: Chem.wholeAfter(q, m) };
      }) });
    });
    return out;
  }

  /* --------------------------------------------------------- the model */

  /* The class's numbers for a problem: molar masses to tenths, moles, the
     quotients and the whole numbers. */
  function model(p) {
    var rows = p.rows.map(function (r) {
      var mm = Chem.mmValue(r.mmF);
      var mol = r.g / mm;
      return { mm: mm, mmText: Chem.mmText(r.mmF), molMolecule: mol, mol: r.per ? mol * r.per : mol };
    });
    var moles = rows.map(function (r) { return r.mol; });
    var min = Math.min.apply(null, moles);
    var small = moles.indexOf(min);
    rows.forEach(function (r, i) { r.q = r.mol / min; r.sub = p.rows[i].sub; });
    return { rows: rows, small: small, mult: p.mult };
  }

  /* --------------------------------------------------- worked solution */

  function texHydrate(salt, n) { return Chem.texText(salt) + '\\cdot ' + (n === 1 ? '' : n) + Chem.texText('H2O'); }
  function texFormulaOf(p) { return p.mode === 'hydrate' ? texHydrate(p.salt, p.n) : Chem.texText(p.ef); }

  /* The worked solution, step by step: { step, title, lines: [LaTeX], notes } */
  function solution(p) {
    var m = model(p);
    var steps = [];
    var lab = function (r) { return r.atom ? r.atom : r.key === 'salt' ? p.salt : 'H2O'; };
    /* step 1 */
    var s1 = { step: 1, title: 'Percents to grams', lines: [], notes: [] };
    if (p.choice === 'pct') {
      s1.notes.push('Assume a 100 g sample' + (p.mode === 'hydrate' ? ' of the hydrate' : '') + ': each percent becomes that many grams.');
      p.rows.forEach(function (r) {
        if (r.how === 'pct') s1.lines.push(Chem.texText(lab(r) + ': ') + r.pct + '\\% \\to ' + r.gStr + '\\ ' + Chem.texU('g', lab(r)));
        else s1.lines.push(Chem.texText(lab(r) + ': ') + '100 - ' + r.pct + ' = ' + r.gStr + '\\ ' + Chem.texU('g', lab(r)));
      });
    } else if (p.kind === 'heat' || p.kind === 'lab') {
      s1.notes.push('No percents: find the grams of the anhydrous salt and of the water from the masses.');
      if (p.kind === 'heat') {
        s1.lines.push(Chem.texText(p.salt + ': ') + p.rows[0].gStr + '\\ ' + Chem.texU('g', p.salt) + Chem.texText(' (left after heating)'));
        s1.lines.push(Chem.texText('H2O: ') + g3(p.H) + ' - ' + g3(p.R) + ' = ' + p.rows[1].gStr + '\\ ' + Chem.texU('g', 'H2O'));
      } else {
        s1.lines.push(Chem.texText(p.salt + ': ') + g3(p.C + p.R) + ' - ' + g3(p.C) + ' = ' + p.rows[0].gStr + '\\ ' + Chem.texU('g', p.salt));
        s1.lines.push(Chem.texText('H2O: ') + g3(p.C + p.H) + ' - ' + g3(p.C + p.R) + ' = ' + p.rows[1].gStr + '\\ ' + Chem.texU('g', 'H2O'));
      }
    } else {
      s1.notes.push(p.mode === 'combustion' ? 'No percents: the grams of CO₂ and H₂O are given.' : 'No percents: the grams are given.');
    }
    steps.push(s1);
    /* step 2 */
    var s2 = { step: 2, title: 'Grams to moles', lines: [], notes: [] };
    p.rows.forEach(function (r, i) {
      var x = m.rows[i];
      var gU = Chem.texU('g', r.mmF), molU = Chem.texU('mol', r.mmF);
      var line = Chem.texText(lab(r) + ': ') + r.gStr + '\\ ' + Chem.texX(gU) + ' \\times \\frac{1\\ ' + (r.per ? Chem.texX(molU) : molU) + '}{' + x.mmText + '\\ ' + Chem.texX(gU) + '}';
      if (r.per) line += ' \\times \\frac{' + r.per + '\\ ' + Chem.texU('mol', r.atom) + '}{1\\ ' + Chem.texX(molU) + '}';
      line += ' = ' + Chem.fmtMol(x.mol) + '\\ ' + Chem.texU('mol', r.per ? r.atom : r.mmF);
      s2.lines.push(line);
    });
    p.rows.forEach(function (r, i) {
      if (r.mmF.length > 2 || Chem.info(r.mmF).order.length > 1) s2.notes.push('Molar mass of ' + Chem.subs(r.mmF) + ': ' + Chem.mmWork(r.mmF) + ' g/mol.');
    });
    if (p.mode === 'combustion') {
      s2.notes.push('Every C atom ends up in a CO₂ (1 C each) and every H atom in an H₂O (2 H each).');
      var gC = m.rows[0].mol * Chem.mmValue('C'), gH = m.rows[1].mol * Chem.mmValue('H');
      s2.notes.push('Check: ' + Chem.fmtSig(gC, 3) + ' g C + ' + Chem.fmtSig(gH, 3) + ' g H = ' + Chem.fmtSig(gC + gH, 3) + ' g, the mass burned (' + g3(p.S) +
        ' g): the sample was only C and H.');
    }
    steps.push(s2);
    /* step 3 */
    var s3 = { step: 3, title: 'Divide by small', lines: [], notes: [] };
    var minMol = Chem.fmtMol(m.rows[m.small].mol);
    s3.notes.push('The smallest is ' + minMol + ' mol (' + Chem.subs(lab(p.rows[m.small])) + '): divide every row by it.');
    s3.lines.push(p.rows.map(function (r, i) {
      return Chem.texText(lab(r) + ': ') + '\\frac{' + Chem.fmtMol(m.rows[i].mol) + '}{' + minMol + '} = ' + Chem.fmtQ(m.rows[i].q);
    }).join('\\quad '));
    steps.push(s3);
    /* step 4 */
    var s4 = { step: 4, title: 'Multiply if not whole', lines: [], notes: [] };
    if (p.mult === 1) {
      s4.notes.push('Every quotient is within 0.1 of a whole number: round, multiply by 1.');
      s4.lines.push(p.rows.map(function (r, i) { return Chem.texText(lab(r) + ': ') + Chem.fmtQ(m.rows[i].q) + ' \\to ' + r.sub; }).join('\\quad '));
    } else {
      var fr = m.rows.map(function (x) { return Chem.fracOf(x.q); }).filter(function (f) { return !f.whole; });
      s4.notes.push(fr.map(function (f) { return f.value.toFixed(2) + ' is ' + f.text + ' (' + f.improper + ')'; }).join('; ') + ', so multiply every row by ' + p.mult + '.');
      s4.lines.push(p.rows.map(function (r, i) {
        return Chem.texText(lab(r) + ': ') + Chem.fmtQ(m.rows[i].q) + ' \\times ' + p.mult + ' = ' + Chem.fmtQ(m.rows[i].q * p.mult) + ' \\to ' + r.sub;
      }).join('\\quad '));
    }
    s4.lines.push((p.mode === 'hydrate' ? Chem.texText('Formula: ') : Chem.texText('Empirical formula: ')) + texFormulaOf(p));
    steps.push(s4);
    if (p.mol) {
      var efm = Chem.mmText(p.ef);
      steps.push({ step: 5, title: 'Molecular formula', notes: ['Empirical formula mass of ' + p.efDisp + ': ' + Chem.mmWork(p.ef) + ' g/mol.'],
        lines: ['n = \\frac{' + p.mol.Mstr + '\\ \\text{g/mol}}{' + efm + '\\ \\text{g/mol}} = ' + Chem.fmtQ(p.mol.M / Chem.mmValue(p.ef)) + ' \\to ' + p.mol.n,
                Chem.texText('Molecular formula: (' + p.ef + ')') + '_{' + p.mol.n + '} = ' + Chem.texText(p.mol.f)] });
    }
    if (p.mode === 'hydrate') {
      steps.push({ step: 5, title: 'Name', lines: [], notes: [p.n + ' water' + (p.n === 1 ? '' : 's') + ': ' + p.prefix + '. ' + p.fDisp + ' is ' + p.name + ' ' + p.prefix + 'hydrate.'] });
    }
    return steps;
  }

  /* The worked example of the first step, the same for every student. */
  function example() {
    var rand = UI.rng(2026);
    var c, p;
    if (MODE === 'empirical') { c = FORMULAS.filter(function (x) { return x.f === 'Fe2O3'; })[0]; p = make(c, 'pct', false, rand); }
    else if (MODE === 'hydrate') { c = HYDRATES.filter(function (x) { return x.salt === 'CuSO4'; })[0]; p = make(c, 'lab', false, rand); }
    else { c = HYDROCARBONS.filter(function (x) { return x.f === 'C3H8'; })[0]; p = make(c, 'comb', false, rand); }
    p.c = c;
    return finish(p, 'EX');
  }

  return {
    PLAN: PLAN, example: example, PLANS: PLANS, WARM: WARM, WARMS: WARMS, MODE: MODE,
    set: set, warm: warm, model: model, solution: solution, clean: clean, allowance: allowance,
    molesWith: molesWith, quotients: quotients, multOf: multOf, make: make, catalogue: catalogue, keyOf: keyOf,
    fracCards: fracCards, wholeCards: wholeCards, allRatios: allRatios, texHydrate: texHydrate
  };
})();

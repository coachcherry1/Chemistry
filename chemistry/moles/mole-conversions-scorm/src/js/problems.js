/* problems.js: the problems, made from a seed so a save can rebuild them.
 *
 * Every problem is one route on the mole map, from one unit to another: g,
 * mol, particles or L of gas of the substance (A), or g, mol or atoms of an
 * element counted inside it (B), joined to A by the ratio from the formula.
 * In the molarity version A can also be a solution: L (or mL) of solution,
 * with the molarity given in the prompt. The number of steps is the number
 * of roads on the shortest route, found by Chem.route over the equalities in
 * the problem's own pool.
 *
 * The basic graded set is 12 problems (3 one-step, 5 two-step, 4 three-step);
 * the molarity set is 14 (4, 5, 4 and one of four steps), 4 of them with a
 * molarity and 2 of those in mL. Both come in a mixed order that never
 * starts with a problem of more than one step. The given numbers are random
 * (2 to 4 significant figures); a retake gets a new seed and new problems.
 */
var Gen = (function () {
  'use strict';

  var SIGS = [2, 3, 3, 4, 4];
  /* powers of ten for a given quantity, by unit */
  var KS = { g: [-1, 0, 0, 1, 1, 2], mol: [-2, -1, -1, 0, 0], L: [-1, 0, 0, 1, 1], part: [21, 22, 23, 23, 24, 25],
             Lsol: [-1, -1, 0], mLsol: [1, 2, 2] };

  function pick(arr, rand) { return arr[Math.floor(rand() * arr.length)]; }

  /* A measured quantity with its significant figures shown plainly: a
     particle count in scientific notation, anything else as a decimal whose
     last digit is never an ambiguous trailing zero. A whole number of mL
     ending in zero gets the class's decimal point instead (350. mL). */
  function given(node, rand, sigWanted) {
    for (var tries = 0; tries < 80; tries++) {
      var sig = sigWanted || pick(SIGS, rand), k = pick(KS[node], rand);
      var lo = Math.pow(10, sig - 1);
      var m = lo + Math.floor(rand() * 9 * lo);
      var mant = (m / lo).toFixed(sig - 1);
      var value = Number((m / lo * Math.pow(10, k)).toPrecision(sig));
      if (node === 'part') {
        return { v: value, sig: sig, str: mant + ' ' + Chem.TIMES + ' 10' + Chem.sup(k), ascii: mant + 'e' + k };
      }
      var dec = sig - 1 - k;
      if (dec < 0) continue;
      var str = value.toFixed(dec);
      if (dec === 0 && /0$/.test(str)) {
        if (node !== 'mLsol') continue;
        str += '.';
      }
      return { v: value, sig: sig, str: str, ascii: str };
    }
    throw new Error('no given quantity for ' + node);
  }

  /* A molarity with the same significant figures as the volume, below the
     substance's maxM (half its solubility or less). */
  function molarity(A, sig, rand) {
    var max = Chem.sp(A).maxM;
    for (var tries = 0; tries < 200; tries++) {
      var k = pick([-2, -1, -1, 0], rand);
      var lo = Math.pow(10, sig - 1);
      var m = lo + Math.floor(rand() * 9 * lo);
      var value = Number((m / lo * Math.pow(10, k)).toPrecision(sig));
      if (value > max || value < 0.01) continue;
      return { v: value, sig: sig, str: value.toFixed(sig - 1 - k) };
    }
    throw new Error('no molarity for ' + A);
  }

  var KEYS = SUBSTANCES.map(function (s) { return s.f; });
  var GROUPS = {
    any: function (s) { return true; },
    nonionic: function (s) { return s.kind !== 'ionic'; },
    gas: function (s) { return s.gas; },
    compound: function (s) { return s.compound; },
    molcomp: function (s) { return s.kind === 'molecular' || s.kind === 'diatomic'; },
    molecular: function (s) { return s.kind === 'molecular'; },
    gascomp: function (s) { return s.gas && s.compound; },
    multi: function (s) { return s.compound && s.order.length > 1; },
    /* two or more elements and a subscript above 1: a molar mass worth adding up */
    multisub: function (s) { return s.compound && s.order.length > 1 && s.order.some(function (x) { return s.counts[x] > 1; }); },
    aq: function (s) { return s.aq; }
  };
  function eligible(group) { return KEYS.filter(function (k) { return GROUPS[group](Chem.sp(k)); }); }

  /* Each way is [from, to] as node:role. A way is drawn at random, so a
     repeated way is the likelier direction. */
  var TEMPLATES = {
    'g-mol':       { steps: 1, A: 'any',      ways: [['g:A', 'mol:A'], ['mol:A', 'g:A']] },
    'part-mol':    { steps: 1, A: 'nonionic', ways: [['part:A', 'mol:A'], ['mol:A', 'part:A']] },
    'L-mol':       { steps: 1, A: 'gas',      ways: [['L:A', 'mol:A'], ['mol:A', 'L:A']] },
    'g-part':      { steps: 2, A: 'nonionic', ways: [['g:A', 'part:A'], ['part:A', 'g:A']] },
    'L-g':         { steps: 2, A: 'gas',      ways: [['L:A', 'g:A'], ['g:A', 'L:A']] },
    'L-part':      { steps: 2, A: 'gas',      ways: [['L:A', 'part:A'], ['part:A', 'L:A']] },
    'gA-molB':     { steps: 2, A: 'compound', ways: [['g:A', 'mol:B'], ['g:A', 'mol:B'], ['mol:B', 'g:A']] },
    'partA-molB':  { steps: 2, A: 'molcomp',  ways: [['part:A', 'mol:B'], ['mol:A', 'part:B']] },
    'gA-partB':    { steps: 3, A: 'compound', ways: [['g:A', 'part:B'], ['g:A', 'part:B'], ['g:A', 'part:B'], ['part:B', 'g:A']] },
    'gA-gB':       { steps: 3, A: 'compound', ways: [['g:A', 'g:B'], ['g:A', 'g:B'], ['g:B', 'g:A']] },
    'partA-gB':    { steps: 3, A: 'molcomp',  ways: [['part:A', 'g:B'], ['part:A', 'part:B']] },
    'LA-partB':    { steps: 3, A: 'gascomp',  ways: [['L:A', 'part:B'], ['L:A', 'g:B']] },

    /* the molarity version: a solution of A, its molarity in the prompt */
    'Lsol-mol':    { steps: 1, A: 'aq', ways: [['Lsol:A', 'mol:A'], ['Lsol:A', 'mol:A'], ['mol:A', 'Lsol:A']] },
    'Lsol-g':      { steps: 2, A: 'aq', ways: [['Lsol:A', 'g:A'], ['Lsol:A', 'g:A'], ['g:A', 'Lsol:A']] },
    'mLsol-g':     { steps: 3, A: 'aq', ways: [['mLsol:A', 'g:A'], ['mLsol:A', 'g:A'], ['g:A', 'mLsol:A']] },
    'mLsol-partB': { steps: 4, A: 'aq', ways: [['mLsol:A', 'part:B']] },

    /* the warm-ups: one road each */
    'w-mass':      { steps: 1, A: 'multisub',  ways: [['g:A', 'mol:A']] },
    'w-part':      { steps: 1, A: 'molecular', ways: [['mol:A', 'part:A']] },
    'w-stp':       { steps: 1, A: 'gas',       ways: [['L:A', 'mol:A']] },
    'w-ratio':     { steps: 1, A: 'multisub',  ways: [['mol:A', 'mol:B']], two: true },
    'w-sol':       { steps: 1, A: 'aq',        ways: [['Lsol:A', 'mol:A']] }
  };

  var PLANS = {
    basic: ['g-mol', 'part-mol', 'L-mol',
            'g-part', 'L-g', 'L-part', 'gA-molB', 'partA-molB',
            'gA-partB', 'gA-gB', 'partA-gB', 'LA-partB'],
    molarity: ['g-mol', 'part-mol', 'L-mol', 'Lsol-mol',
               'g-part', 'L-g', 'gA-molB', 'partA-molB', 'Lsol-g',
               'gA-partB', 'gA-gB', 'LA-partB', 'mLsol-g',
               'mLsol-partB']
  };
  var WARMS = {
    basic: ['w-mass', 'w-part', 'w-stp', 'w-ratio'],
    molarity: ['w-mass', 'w-part', 'w-stp', 'w-ratio', 'w-sol']
  };
  var KIND = CONFIG.molarity ? 'molarity' : 'basic';
  var SET_PLAN = PLANS[KIND], WARM = WARMS[KIND];

  /* An element counted in A, likelier one with a subscript above 1. */
  function pickB(A, rand, onlyMany) {
    var s = Chem.sp(A), bag = [];
    s.order.forEach(function (x) {
      var w = s.counts[x] > 1 ? 3 : (onlyMany ? 0 : 1);
      for (var i = 0; i < w; i++) bag.push(x);
    });
    return bag.length ? pick(bag, rand) : null;
  }

  function inRange(node, v) {
    var a = Math.abs(v);
    return node === 'part' ? a >= 1e19 && a <= 1e27 : a >= 1e-3 && a < 1e5;
  }

  function safe(s) { return s.replace(/[^A-Za-z0-9]+/g, '_').replace(/_$/, ''); }
  var isSol = function (node) { return node === 'Lsol' || node === 'mLsol'; };

  function build(name, rand, used) {
    var T = TEMPLATES[name];
    if (!T) throw new Error('no template ' + name);
    var all = eligible(T.A);
    for (var tries = 0; tries < 80; tries++) {
      var fresh = all.filter(function (k) { return !used[k]; });
      var A = pick(fresh.length ? fresh : all, rand);
      var way = pick(T.ways, rand);
      var needB = way.some(function (w) { return /:B$/.test(w); });
      var B = needB ? pickB(A, rand, T.two) : null;
      if (needB && !B) continue;
      var tokOf = function (w) { var p = w.split(':'); return Chem.tok(p[0], p[1] === 'A' ? A : B); };
      var fromTok = tokOf(way[0]), toTok = tokOf(way[1]);
      var from = Chem.untok(fromTok), to = Chem.untok(toTok);
      var g = given(from.node, rand);
      var sol = isSol(from.node) || isSol(to.node);
      var M = sol ? molarity(A, g.sig, rand) : null;

      var pool = Chem.edgesOf(A).slice();
      if (M) pool.push('sol:' + A + ':' + M.str);
      if (from.node === 'mLsol' || to.node === 'mLsol') pool.push('ml:' + A);
      if (B) { pool = pool.concat(Chem.edgesOf(B)); pool.push('ratio:' + A + ':' + B); }
      var others = Chem.ratiosOf(A).filter(function (id) { return pool.indexOf(id) < 0; });
      /* one wrong ratio as a distractor, unless the pool is already full (8) */
      if (others.length && pool.length < 8) pool.push(pick(others, rand));
      pool = UI.shuffle(pool, rand);

      var path = Chem.route(fromTok, toTok, pool);
      if (!path || path.length !== T.steps) continue;
      var ans = Chem.chainValue(g.v, path);
      if (!inRange(to.node, ans)) continue;
      used[A] = 1;
      return {
        t: name, A: A, B: B, fromTok: fromTok, toTok: toTok, steps: T.steps, given: g, M: M, pool: pool, path: path,
        ans: ans, ansStr: Chem.fmtSig(ans, g.sig), ansAscii: Chem.fmtSig(ans, g.sig, true),
        ratioN: B ? Chem.ratio(A, B) : 0
      };
    }
    throw new Error('could not build ' + name);
  }

  /* The prompt, in the class's words with names: "Convert 9.340 g of sulfur
     dibromide, SBr2, to atoms of bromine, Br." Returned as pieces; q pieces
     are highlighted on screen. */
  function prompt(p) {
    var f = Chem.untok(p.fromTok), t = Chem.untok(p.toTok);
    function about(u) {
      var s = Chem.sp(u.key);
      if (u.node === 'L') return { rest: ' of ' + s.name + ' gas, ' + s.disp + ', at STP', comma: false };
      if (isSol(u.node)) return { rest: ' of ' + p.M.str + ' mol/L ' + s.name + ' solution, ' + s.disp, comma: true };
      return { rest: ' of ' + s.name + ', ' + s.disp, comma: true };
    }
    var a = about(f);
    var parts = ['Convert ', { q: p.given.str + ' ' + Chem.unitWord(f.node, f.key) }, a.rest + (a.comma ? ',' : '') + ' to '];
    if (t.key === f.key && !isSol(t.node)) {
      parts.push({ q: Chem.unitText(p.toTok) + (t.node === 'L' ? ' at STP' : '') });
      parts.push('.');
    } else if (t.key === f.key) {
      /* the same substance, named already: only the molarity is new */
      parts.push({ q: Chem.unitWord(t.node, t.key) });
      parts.push(' of ' + p.M.str + ' mol/L ' + Chem.disp(t.key) + ' solution.');
    } else {
      parts.push({ q: Chem.unitWord(t.node, t.key) });
      parts.push(about(t).rest + '.');
    }
    return parts;
  }

  function finish(p, id) {
    p.id = id;
    p.fromText = p.given.str + ' ' + Chem.unitText(p.fromTok);
    p.toText = Chem.unitText(p.toTok);
    p.prompt = prompt(p);
    p.promptText = p.prompt.map(function (x) { return typeof x === 'string' ? x : x.q; }).join('');
    return p;
  }

  /* The graded set for a seed. */
  function set(seed) {
    var rand = UI.rng(seed), used = {};
    var list = UI.shuffle(SET_PLAN.map(function (t) { return build(t, rand, used); }), rand);
    if (list[0].steps !== 1) {
      var j = list.map(function (p) { return p.steps; }).indexOf(1);
      var x = list[0]; list[0] = list[j]; list[j] = x;
    }
    return list.map(function (p, i) {
      var n = i + 1;
      return finish(p, 'P' + (n < 10 ? '0' : '') + n + '_' + safe(p.fromTok + '_to_' + p.toTok));
    });
  }

  /* One warm-up problem for a seed. */
  function warm(seed, name) {
    var rand = UI.rng((seed ^ UI.hash(name)) >>> 0);
    return finish(build(name, rand, {}), name);
  }

  return { given: given, molarity: molarity, build: build, set: set, warm: warm, eligible: eligible, prompt: prompt,
           TEMPLATES: TEMPLATES, PLANS: PLANS, WARMS: WARMS, SET_PLAN: SET_PLAN, WARM: WARM };
})();

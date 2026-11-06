/* problems.js: the problems, made from a seed so a save can rebuild them.
 *
 * Every problem is one route on the Mole Town map, from one unit to another:
 * g, mol, particles or L at STP of the substance (A), or g, mol or atoms of
 * an element counted inside it (B), joined to A by the ratio from the formula.
 * The number of steps is the number of roads on the shortest route, found by
 * Chem.route over the equalities in the problem's own pool.
 *
 * The graded set is 12 problems: 3 of one step, 5 of two and 4 of three, in
 * a mixed order that never starts with a three-step problem. Six use the
 * ratio, four the 22.4 L road. The given numbers are random (2 to 4
 * significant figures); a retake gets a new seed and new problems.
 */
var Gen = (function () {
  'use strict';

  var SIGS = [2, 3, 3, 4, 4];
  /* powers of ten for a given quantity, by unit */
  var KS = { g: [-1, 0, 0, 1, 1, 2], mol: [-2, -1, -1, 0, 0], L: [-1, 0, 0, 1, 1], part: [21, 22, 23, 23, 24, 25] };

  function pick(arr, rand) { return arr[Math.floor(rand() * arr.length)]; }

  /* A measured quantity with its significant figures shown plainly: a
     particle count in scientific notation, anything else as a decimal whose
     last digit is never an ambiguous trailing zero. */
  function given(node, rand) {
    for (var tries = 0; tries < 80; tries++) {
      var sig = pick(SIGS, rand), k = pick(KS[node], rand);
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
      if (dec === 0 && /0$/.test(str)) continue;
      return { v: value, sig: sig, str: str, ascii: str };
    }
    throw new Error('no given quantity for ' + node);
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
    multisub: function (s) { return s.compound && s.order.length > 1 && s.order.some(function (x) { return s.counts[x] > 1; }); }
  };
  function eligible(group) { return KEYS.filter(function (k) { return GROUPS[group](Chem.sp(k)); }); }

  /* Each way is [from, to] as node:role. A way is drawn at random, so a
     repeated way is the likelier direction. */
  var TEMPLATES = {
    'g-mol':      { steps: 1, A: 'any',      ways: [['g:A', 'mol:A'], ['mol:A', 'g:A']] },
    'part-mol':   { steps: 1, A: 'nonionic', ways: [['part:A', 'mol:A'], ['mol:A', 'part:A']] },
    'L-mol':      { steps: 1, A: 'gas',      ways: [['L:A', 'mol:A'], ['mol:A', 'L:A']] },
    'g-part':     { steps: 2, A: 'nonionic', ways: [['g:A', 'part:A'], ['part:A', 'g:A']] },
    'L-g':        { steps: 2, A: 'gas',      ways: [['L:A', 'g:A'], ['g:A', 'L:A']] },
    'L-part':     { steps: 2, A: 'gas',      ways: [['L:A', 'part:A'], ['part:A', 'L:A']] },
    'gA-molB':    { steps: 2, A: 'compound', ways: [['g:A', 'mol:B'], ['g:A', 'mol:B'], ['mol:B', 'g:A']] },
    'partA-molB': { steps: 2, A: 'molcomp',  ways: [['part:A', 'mol:B'], ['mol:A', 'part:B']] },
    'gA-partB':   { steps: 3, A: 'compound', ways: [['g:A', 'part:B'], ['g:A', 'part:B'], ['g:A', 'part:B'], ['part:B', 'g:A']] },
    'gA-gB':      { steps: 3, A: 'compound', ways: [['g:A', 'g:B'], ['g:A', 'g:B'], ['g:B', 'g:A']] },
    'partA-gB':   { steps: 3, A: 'molcomp',  ways: [['part:A', 'g:B'], ['part:A', 'part:B']] },
    'LA-partB':   { steps: 3, A: 'gascomp',  ways: [['L:A', 'part:B'], ['L:A', 'g:B']] },

    /* the warm-ups: one road each */
    'w-mass':     { steps: 1, A: 'multisub',     ways: [['g:A', 'mol:A']] },
    'w-part':     { steps: 1, A: 'molecular', ways: [['mol:A', 'part:A']] },
    'w-stp':      { steps: 1, A: 'gas',       ways: [['L:A', 'mol:A']] },
    'w-ratio':    { steps: 1, A: 'multisub',  ways: [['mol:A', 'mol:B']], two: true }
  };

  var SET_PLAN = ['g-mol', 'part-mol', 'L-mol',
                  'g-part', 'L-g', 'L-part', 'gA-molB', 'partA-molB',
                  'gA-partB', 'gA-gB', 'partA-gB', 'LA-partB'];
  var WARM = ['w-mass', 'w-part', 'w-stp', 'w-ratio'];

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

      var pool = Chem.edgesOf(A).slice();
      if (B) { pool = pool.concat(Chem.edgesOf(B)); pool.push('ratio:' + A + ':' + B); }
      var others = Chem.ratiosOf(A).filter(function (id) { return pool.indexOf(id) < 0; });
      if (others.length) pool.push(pick(others, rand));
      pool = UI.shuffle(pool, rand);

      var path = Chem.route(fromTok, toTok, pool);
      if (!path || path.length !== T.steps) continue;
      var from = Chem.untok(fromTok);
      var g = given(from.node, rand);
      var ans = Chem.chainValue(g.v, path);
      if (!inRange(Chem.untok(toTok).node, ans)) continue;
      used[A] = 1;
      return {
        t: name, A: A, B: B, fromTok: fromTok, toTok: toTok, steps: T.steps, given: g, pool: pool, path: path,
        ans: ans, ansStr: Chem.fmtSig(ans, g.sig), ansAscii: Chem.fmtSig(ans, g.sig, true),
        ratioN: B ? Chem.ratio(A, B) : 0
      };
    }
    throw new Error('could not build ' + name);
  }

  function label(p) {
    var f = Chem.untok(p.fromTok), t = Chem.untok(p.toTok);
    return {
      from: p.given.str + ' ' + Chem.unitText(p.fromTok) + (f.node === 'L' ? ' at STP' : ''),
      to: Chem.unitText(p.toTok) + (t.node === 'L' ? ' at STP' : '')
    };
  }

  function finish(p, id) {
    p.id = id;
    var l = label(p);
    p.fromText = l.from;
    p.toText = l.to;
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

  return { given: given, build: build, set: set, warm: warm, eligible: eligible, label: label,
           TEMPLATES: TEMPLATES, SET_PLAN: SET_PLAN, WARM: WARM };
})();

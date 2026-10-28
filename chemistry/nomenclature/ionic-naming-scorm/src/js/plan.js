/* plan.js — the level list and the draw for one run. No DOM.
 *
 * A run is a list of item codes per level:
 *   m:Fe          Level 1: is this metal a transition metal? its charge? its name?
 *   a:O           Level 1: which ion does this nonmetal form, and what is it called?
 *   n:Fe3.SO4     name this compound      (f:Fe3.SO4 = write its formula)
 *   q:tm1         a check-for-understanding question from the bank
 *   g:c:Pb4.O     a generated check question (see cfu.js)
 * A leading "!" marks a level-end checkpoint question and a leading "+" a
 * follow-up added after a missed check.
 *
 * After Level 1 every level is interleaved: names and formulas, transition
 * metals and not, single-element and polyatomic ions, shuffled together.
 * The draw is balanced, not purely random: each level fills a list of
 * required cases, so every run meets Ag and Zn, Sn and Pb, a reduced formula
 * like PbO2, a formula that needs parentheses, and ammonium. Which compound
 * fills each case varies, so a retry is a new set.
 */

var Plan = (function () {
  'use strict';

  var LEVELS = [
    { n: 1, name: 'Transition metal or not?', kind: 'ions', metals: 10, anions: 4, cfuEvery: 4,
      tags: ['tm', 'fixed', 'ide', 'ionic'], checkpoint: ['tm', 'fixed', 'ide'],
      blurb: 'Find each element on the periodic table. Decide whether it is a transition metal, then give its name and charge.' },
    { n: 2, name: 'Mixed practice', kind: 'mixed', count: 12, cfuEvery: 2,
      tags: ['tm', 'charge', 'numeral', 'reduce', 'paren', 'poly', 'fixed', 'ide'],
      checkpoint: ['tm', 'charge', 'paren'],
      blurb: 'Names and formulas, mixed: transition metals or not, single-element or polyatomic ions. Every question starts with the same decision — is it a transition metal?' },
    { n: 3, name: 'On your own', kind: 'typed', count: 12, cfuEvery: 3,
      tags: ['tm', 'charge', 'numeral', 'reduce', 'paren', 'poly', 'fixed', 'ide'],
      checkpoint: ['numeral', 'reduce', 'poly'],
      blurb: 'Still mixed, now typed — no flowchart and no steps. The periodic table is still there.' }
  ];

  var FIXED_METALS = ['Li', 'Na', 'K', 'Rb', 'Be', 'Mg', 'Ca', 'Ba', 'Al', 'Ga'];
  var TM_METALS = ['Ti', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Au', 'Hg'];
  var EXCEPTIONS = ['Ag', 'Zn', 'Sn', 'Pb'];

  var POOL = Chem.all().map(function (cpd) { return { cpd: cpd, t: Chem.traits(cpd) }; });

  /* mulberry32 - small, fast, seedable */
  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function any(list, rand) { return list[Math.floor(rand() * list.length)]; }

  /* Picks a compound matching a test. Prefers one the run has not used and
     whose positive ion this level has not used, so a level does not name
     three iron compounds in a row. */
  function chooser(rand, used) {
    var cats = {};
    return function (test) {
      var base = POOL.filter(function (x) { return test(x.cpd, x.t); });
      var tiers = [
        base.filter(function (x) { return !used[x.cpd.code] && !cats[x.cpd.c.t]; }),
        base.filter(function (x) { return !used[x.cpd.code]; }),
        base
      ];
      for (var i = 0; i < tiers.length; i++) {
        if (!tiers[i].length) continue;
        var x = any(tiers[i], rand);
        used[x.cpd.code] = true;
        cats[x.cpd.c.t] = true;
        return x.cpd.code;
      }
      return null;
    };
  }

  /* ------------------------------------------------------ content per level */

  function drawIons(rand) {
    var metals = EXCEPTIONS
      .concat(shuffle(FIXED_METALS, rand).slice(0, 3))
      .concat(shuffle(TM_METALS, rand).slice(0, 3));
    var anions = [any(['N', 'P'], rand), any(['O', 'S'], rand), any(['F', 'Cl', 'Br', 'I'], rand)];
    var rest = ['N', 'P', 'O', 'S', 'F', 'Cl', 'Br', 'I'].filter(function (x) { return anions.indexOf(x) < 0; });
    anions.push(any(rest, rand));
    return shuffle(metals, rand).map(function (s) { return 'm:' + s; })
      .concat(shuffle(anions, rand).map(function (s) { return 'a:' + s; }));
  }

  /* Interleaved: names and formulas shuffled together, so every question
     starts from the same decision instead of a level that answers it in
     advance. Each slot is a case the level must cover; which compound fills
     it varies from run to run. */
  function interleave(rand, used, names, formulas) {
    var pick = chooser(rand, used);
    var n = shuffle(names.map(function (test) { return 'n:' + pick(test); }), rand);
    var f = shuffle(formulas.map(function (test) { return 'f:' + pick(test); }), rand);
    /* Merge at random, but never three of the same kind in a row, so the
       student can't settle into naming mode or formula mode. */
    var out = [];
    /* After taking from `a`, the rest can still be laid out with runs of at
       most two only if neither kind outnumbers the other by too much. */
    function ok(a, b, run) {
      var na = a.length - 1, nb = b.length;
      if (a.length === 0 || run >= 2) return false;
      return na <= 2 * nb + (2 - run - 1) && nb <= 2 * (na + 1);
    }
    while (n.length || f.length) {
      var lastKind = out.length ? out[out.length - 1].charAt(0) : '';
      var run = 0;
      for (var i = out.length - 1; i >= 0 && out[i].charAt(0) === lastKind; i--) run++;
      var canN = ok(n, f, lastKind === 'n' ? run : 0);
      var canF = ok(f, n, lastKind === 'f' ? run : 0);
      var from = canN && canF ? (rand() * (n.length + f.length) < n.length ? n : f)
               : canN ? n : canF ? f : (n.length ? n : f);
      out.push(from.shift());
    }
    return out;
  }

  function snPb(c) { return c.c.t === 'Sn' || c.c.t === 'Pb'; }
  function agZn(c) { return c.c.t === 'Ag' || c.c.t === 'Zn'; }

  function drawMixed(rand, used) {
    return interleave(rand, used, [
      function (c, t) { return t.tm && t.binary && t.fourOverTwo; },
      function (c, t) { return agZn(c) && t.binary; },
      function (c, t) { return t.tm && c.a.poly && c.n > 1; },
      function (c, t) { return t.ammonium; },
      function (c, t) { return !t.tm && !t.ammonium && c.a.poly; },
      function (c) { return snPb(c); }
    ], [
      function (c, t) { return t.tm && c.a.poly && t.reduced; },
      function (c, t) { return t.tm && t.binary && c.m > 1 && c.q !== c.m; },
      function (c, t) { return !t.tm && c.a.poly && c.n > 1; },
      function (c, t) { return c.a.poly && c.n === 1 && !t.ammonium; },
      function (c, t) { return agZn(c) || (t.binary && !t.tm); },
      function (c, t) { return t.tm && c.q === 1; }
    ]);
  }

  function drawTyped(rand, used) {
    return interleave(rand, used, [
      function (c, t) { return t.tm && t.binary && t.reduced; },
      function (c, t) { return t.tm && c.a.poly; },
      function (c, t) { return !t.tm && !t.ammonium && c.a.poly; },
      function (c) { return agZn(c); },
      function (c, t) { return t.ammonium; },
      function () { return true; }
    ], [
      function (c, t) { return t.tm && t.binary && t.reduced; },
      function (c, t) { return t.parens; },
      function (c, t) { return t.binary && !t.tm; },
      function (c) { return snPb(c); },
      function (c, t) { return c.a.poly && c.n === 1 && !t.ammonium; },
      function () { return true; }
    ]);
  }

  /* ------------------------------------------------------------ checks */

  function compoundOf(code) {
    var m = /^(?:[nf]|g:[cfn]):(.+)$/.exec(code);
    return m ? m[1] : null;
  }

  function genCandidates(level, tag) {
    var test = null, kind = null;
    if (level < 2) return [];
    if (tag === 'charge') {
      kind = 'c';
      test = function (c, t) { return t.tm && c.n !== c.q; };
    } else if (tag === 'numeral') {
      kind = 'f';
      test = function (c, t) { return t.tm && c.q !== c.m; };
    } else if (tag === 'reduce') {
      kind = 'f';
      test = function (c, t) { return t.reduced; };
    } else if (tag === 'paren') {
      kind = 'f';
      test = function (c, t) { return t.parens; };
    } else if (tag === 'tm') {
      kind = 'n';
      test = function () { return true; };
    }
    if (!test) return [];
    return POOL.filter(function (x) { return test(x.cpd, x.t); })
      .map(function (x) { return 'g:' + kind + ':' + x.cpd.code; });
  }

  /* One check question for a level, preferring the given tags. Written
     questions are favoured; generated ones fill in and keep a long run fresh.
     A generated question never reuses a compound the level already shows. */
  function pickCheck(level, tags, rand, usedQ, avoid) {
    var order = shuffle(tags, rand);
    for (var i = 0; i < order.length; i++) {
      var tag = order[i];
      var bank = CFU.BANK.filter(function (b) {
        return b.tag === tag && b.min <= level && !usedQ['q:' + b.id];
      }).map(function (b) { return 'q:' + b.id; });
      var gen = genCandidates(level, tag).filter(function (g) {
        return !usedQ[g] && !avoid[compoundOf(g)];
      });
      var from = bank.length && (!gen.length || rand() < 0.6) ? bank : gen;
      if (from.length) {
        var code = any(from, rand);
        usedQ[code] = true;
        return code;
      }
    }
    return null;
  }

  function withChecks(level, content, rand, usedQ) {
    var L = LEVELS[level - 1], out = [], avoid = {};
    content.forEach(function (code) { var c = compoundOf(code); if (c) avoid[c] = true; });
    content.forEach(function (code, i) {
      out.push(code);
      if ((i + 1) % L.cfuEvery === 0 && i + 1 < content.length) {
        var q = pickCheck(level, L.tags, rand, usedQ, avoid);
        if (q) out.push(q);
      }
    });
    L.checkpoint.forEach(function (tag) {
      var q = pickCheck(level, [tag], rand, usedQ, avoid);
      if (q) out.push('!' + q);
    });
    return out;
  }

  function draw(level, rand, used, usedQ) {
    var content;
    switch (level) {
      case 1: content = drawIons(rand); break;
      case 2: content = drawMixed(rand, used); break;
      default: content = drawTyped(rand, used);
    }
    return withChecks(level, content, rand, usedQ);
  }

  function newPlan(seed) {
    var rand = rng(seed);
    var used = {}, usedQ = {}, plan = {};
    LEVELS.forEach(function (L) { plan[L.n] = draw(L.n, rand, used, usedQ); });
    return plan;
  }

  function strip(code) { return code.replace(/^[!+]+/, ''); }

  /* Can this code still be built? A save from an older build may name an ion
     or question that has since been removed. */
  function valid(raw) {
    var code = strip(String(raw || ''));
    var p = code.split(':');
    switch (p[0]) {
      case 'm': return !!Chem.CAT[p[1]] && !Chem.CAT[p[1]].poly;
      case 'a': return !!Chem.AN[p[1]] && !Chem.AN[p[1]].poly;
      case 'n': case 'f': return !!Chem.fromCode(p.slice(1).join(':'));
      case 'q': case 'g': return !!CFU.build(code);
    }
    return false;
  }

  /* A follow-up question on the same idea after a missed check. Returns null
     when the bank and generators have nothing left for that tag. */
  function followUp(level, tag, plan, seed) {
    var rand = rng(seed);
    var usedQ = {}, avoid = {};
    Object.keys(plan).forEach(function (k) {
      plan[k].forEach(function (code) {
        var s = strip(code);
        usedQ[s] = true;
        if (+k === level) { var c = compoundOf(s); if (c) avoid[c] = true; }
      });
    });
    return pickCheck(level, [tag], rand, usedQ, avoid);
  }

  return {
    LEVELS: LEVELS, rng: rng, shuffle: shuffle, newPlan: newPlan, followUp: followUp,
    strip: strip, compoundOf: compoundOf, valid: valid
  };
})();

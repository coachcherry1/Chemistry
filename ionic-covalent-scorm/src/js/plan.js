/* plan.js — the level list and the draw for one run. No DOM.
 *
 * A run is a list of item codes per level:
 *   r:Sn4.Cl      Level 1: which naming rules does this formula use?
 *   n:v.N2O4      name this compound      (f:v.N2O4 = write its formula)
 *   q:dc1         a check-for-understanding question from the bank
 *   g:r:Pb4.O     a generated check question (see cfu.js)
 * Compound codes: "Fe3.SO4" is ionic (cation, charge, anion); "v.N2O4" is
 * covalent. A leading "!" marks a level-end checkpoint question and a leading
 * "+" a follow-up added after a missed check.
 *
 * Every level mixes the three rule sets - ionic, ionic with a transition
 * metal, covalent - so the decision has to be made fresh on every question.
 * Each level fills a list of required cases, places look-alike pairs (SnCl4
 * beside CCl4, CoO beside CO) next to each other, and is ordered so the same
 * rule set never comes up three times running. In Levels 2 and 3 names and
 * formulas are interleaved the same way.
 */

var Plan = (function () {
  'use strict';

  var LEVELS = [
    { n: 1, name: 'Which rules?', count: 16, cfuEvery: 4, pairs: 4,
      targets: { cov: 6, ion: 5, tm: 5 },
      tags: ['decide', 'cross', 'prefix', 'tm'], checkpoint: ['decide', 'cross', 'tm'],
      blurb: 'Ionic, ionic with a transition metal, or covalent? Find both elements on the periodic table and pick the rules that fit.' },
    { n: 2, name: 'Mixed practice', count: 14, cfuEvery: 2, pairs: 1,
      targets: { cov: 5, ion: 4, tm: 5 },
      tags: ['decide', 'cross', 'prefix', 'covred', 'tm', 'charge', 'paren', 'numeral'],
      checkpoint: ['decide', 'covred', 'cross'],
      blurb: 'Names and formulas, all three rule sets mixed. Every question starts with the same decision: ionic or covalent?' },
    { n: 3, name: 'On your own', count: 14, cfuEvery: 3, pairs: 1,
      targets: { cov: 5, ion: 4, tm: 5 },
      tags: ['decide', 'cross', 'prefix', 'covred', 'tm', 'charge', 'paren', 'numeral'],
      checkpoint: ['decide', 'prefix', 'charge'],
      blurb: 'Still mixed, now with no steps and no flowchart. The builder offers prefixes and Roman numerals every time — use only the ones that belong.' }
  ];

  /* Look-alikes that only the decision tells apart. Each pair is placed side
     by side wherever it appears. */
  var PAIRS = [
    ['Sn4.Cl', 'v.CCl4'], ['Sn4.Cl', 'v.SiCl4'], ['Pb4.O', 'v.SiO2'], ['Pb4.O', 'v.CO2'],
    ['Ti4.O', 'v.SiO2'], ['Fe3.O', 'v.N2O3'], ['Cr3.O', 'v.B2O3'], ['Co2.O', 'v.CO'],
    ['NH41.Cl', 'v.NCl3'], ['Na1.NO2', 'v.NO2'], ['Na1.SO3', 'v.SO3'], ['Ag1.Cl', 'Cu1.Cl'],
    ['Zn2.S', 'Ni2.S'], ['Ca2.Cl', 'v.SCl2'], ['Mg2.F', 'Mn2.F'], ['Al3.Cl', 'v.BCl3'],
    ['Ba2.F', 'v.XeF2'], ['K1.F', 'v.KrF2'], ['Pb2.Cl', 'v.PCl3'], ['Sn4.O', 'v.SO2']
  ];

  function agZn(c) { return c.kind === 'ion' && (c.c.t === 'Ag' || c.c.t === 'Zn'); }
  function snPb(c) { return c.kind === 'ion' && (c.c.t === 'Sn' || c.c.t === 'Pb'); }

  /* Cases each level must contain, by rule set. */
  var REQUIRED = {
    1: {
      cov: [function (c, t) { return t.noble; }],
      ion: [agZn, function (c, t) { return t.ammonium; }],
      tm: [snPb]
    },
    2: {
      cov: [function (c, t) { return t.reducible; }, function (c, t) { return t.monoSecond; },
            function (c, t) { return t.firstPrefix && !t.reducible; }, function (c, t) { return t.noble; }],
      ion: [agZn, function (c, t) { return t.ammonium; },
            function (c, t) { return !t.ammonium && c.a.poly && c.n > 1; }],
      tm: [function (c, t) { return t.fourOverTwo; }, snPb,
           function (c) { return c.q === 1; }, function (c) { return c.a.poly; }]
    }
  };
  REQUIRED[3] = REQUIRED[2];

  var POOL = Chem.all().map(function (cpd) { return { cpd: cpd, t: Chem.traits(cpd), r: Chem.rule(cpd) }; });
  var BY_CODE = {};
  POOL.forEach(function (x) { BY_CODE[x.cpd.code] = x; });

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
     whose first element this level has not used, so a level does not show
     three iron compounds. */
  function chooser(rand, used) {
    var firsts = {};
    function first(cpd) { return cpd.kind === 'cov' ? cpd.e1 : cpd.c.t; }
    return function (test) {
      var base = POOL.filter(function (x) { return test(x.cpd, x.t, x.r); });
      var tiers = [
        base.filter(function (x) { return !used[x.cpd.code] && !firsts[first(x.cpd)]; }),
        base.filter(function (x) { return !used[x.cpd.code]; }),
        base
      ];
      for (var i = 0; i < tiers.length; i++) {
        if (!tiers[i].length) continue;
        var x = any(tiers[i], rand);
        used[x.cpd.code] = true;
        firsts[first(x.cpd)] = true;
        return x.cpd.code;
      }
      return null;
    };
  }

  /* ------------------------------------------------------ content per level */

  function ruleOf(code) { return BY_CODE[code].r; }

  /* Blocks of one or two compound codes: the look-alike pairs first, then
     singles filling the required cases and the per-rule targets. */
  function chooseBlocks(L, rand, used) {
    var pick = chooser(rand, used);
    var pairs = shuffle(PAIRS, rand).filter(function (p) {
      return p.every(function (c) { return BY_CODE[c] && !used[c]; });
    });
    var chosen = [], taken = {};
    var have = { ion: [], tm: [], cov: [] };

    /* A pair is only taken if every rule set still has room for the
       required cases the pairs so far have not covered. */
    function fits(extra) {
      return ['cov', 'ion', 'tm'].every(function (r) {
        var codes = have[r].concat(extra.filter(function (c) { return ruleOf(c) === r; }));
        var unmet = REQUIRED[L.n][r].filter(function (test) {
          return !codes.some(function (c) { return test(BY_CODE[c].cpd, BY_CODE[c].t); });
        }).length;
        return L.targets[r] - codes.length >= unmet;
      });
    }

    for (var i = 0; i < pairs.length && chosen.length < L.pairs; i++) {
      if (taken[pairs[i][0]] || taken[pairs[i][1]] || !fits(pairs[i])) continue;
      chosen.push(pairs[i]);
      taken[pairs[i][0]] = taken[pairs[i][1]] = true;
      used[pairs[i][0]] = used[pairs[i][1]] = true;
      pairs[i].forEach(function (c) { have[ruleOf(c)].push(c); });
    }
    var blocks = chosen.map(function (p) { return shuffle(p, rand); });

    ['cov', 'ion', 'tm'].forEach(function (r) {
      var need = L.targets[r] - have[r].length;
      REQUIRED[L.n][r].forEach(function (test) {
        if (need <= 0) return;
        if (have[r].some(function (c) { return test(BY_CODE[c].cpd, BY_CODE[c].t); })) return;
        var code = pick(function (c, t, rr) { return rr === r && test(c, t); });
        have[r].push(code);
        blocks.push([code]);
        need--;
      });
      while (need-- > 0) {
        var code = pick(function (c, t, rr) { return rr === r; });
        have[r].push(code);
        blocks.push([code]);
      }
    });
    return blocks;
  }

  /* Names and formulas split as evenly as possible inside each rule set, and
     exactly evenly overall. */
  function assignDirections(blocks, rand) {
    var byRule = { cov: [], ion: [], tm: [] };
    blocks.forEach(function (b) { b.forEach(function (code, i) { byRule[ruleOf(code)].push({ b: b, i: i }); }); });
    var oddStart = rand() < 0.5 ? 'n' : 'f';
    ['cov', 'ion', 'tm'].forEach(function (r) {
      var list = shuffle(byRule[r], rand);
      var startN = list.length % 2 ? oddStart === 'n' : rand() < 0.5;
      if (list.length % 2) oddStart = oddStart === 'n' ? 'f' : 'n';
      list.forEach(function (slot, k) {
        var dir = (k % 2 === 0) === startN ? 'n' : 'f';
        slot.b[slot.i] = dir + ':' + slot.b[slot.i];
      });
    });
  }

  function runOf3(list, key) {
    for (var i = 2; i < list.length; i++) {
      if (key(list[i]) === key(list[i - 1]) && key(list[i]) === key(list[i - 2])) return true;
    }
    return false;
  }

  /* Shuffle the blocks until no rule set - and, in Levels 2-3, no direction -
     comes up three times in a row. */
  function orderBlocks(blocks, rand, keys) {
    var best = null;
    for (var tries = 0; tries < 400; tries++) {
      var flat = [].concat.apply([], shuffle(blocks, rand));
      if (!keys.some(function (k) { return runOf3(flat, k); })) return flat;
      best = flat;
    }
    return best;
  }

  function codeOf(item) { return item.replace(/^[a-z]:/, ''); }
  function ruleKey(item) { return ruleOf(codeOf(item)); }
  function dirKey(item) { return item.charAt(0); }

  function drawContent(L, rand, used) {
    var blocks = chooseBlocks(L, rand, used);
    if (L.n === 1) {
      blocks.forEach(function (b) { b.forEach(function (c, i) { b[i] = 'r:' + c; }); });
      return orderBlocks(blocks, rand, [ruleKey]);
    }
    assignDirections(blocks, rand);
    return orderBlocks(blocks, rand, [ruleKey, dirKey]);
  }

  /* ------------------------------------------------------------ checks */

  function compoundOf(code) {
    var m = /^(?:[nfr]|g:[cfnr]):(.+)$/.exec(code);
    return m ? m[1] : null;
  }

  function gen(kind, test) {
    return POOL.filter(function (x) { return test(x.cpd, x.t); })
      .map(function (x) { return 'g:' + kind + ':' + x.cpd.code; });
  }

  function genCandidates(level, tag) {
    var cov = function (c) { return c.kind === 'cov'; };
    var ion = function (c) { return c.kind === 'ion'; };
    switch (tag) {
      case 'decide': return level >= 2 ? gen('r', function () { return true; }) : [];
      case 'prefix': return gen('n', cov).concat(gen('f', cov));
      case 'covred': return gen('n', function (c, t) { return t.reducible; })
                              .concat(gen('f', function (c, t) { return t.reducible; }));
      case 'cross': return gen('n', function (c, t) { return ion(c) && t.binary; });
      case 'tm': return gen('n', ion);
      case 'charge': return gen('c', function (c, t) { return t.tm && c.n !== c.q; });
      case 'numeral': return gen('f', function (c, t) { return t.tm && c.q !== c.m; });
      case 'reduce': return gen('f', function (c, t) { return t.reduced; });
      case 'paren': return gen('f', function (c, t) { return t.parens; });
    }
    return [];
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
      var gens = genCandidates(level, tag).filter(function (g) {
        return !usedQ[g] && !avoid[compoundOf(g)];
      });
      var from = bank.length && (!gens.length || rand() < 0.6) ? bank : gens;
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

  function newPlan(seed) {
    var rand = rng(seed);
    var used = {}, usedQ = {}, plan = {};
    LEVELS.forEach(function (L) {
      plan[L.n] = withChecks(L.n, drawContent(L, rand, used), rand, usedQ);
    });
    return plan;
  }

  function strip(code) { return code.replace(/^[!+]+/, ''); }

  /* Can this code still be built? A save from an older build may name a
     compound or question that has since been removed. */
  function valid(raw) {
    var code = strip(String(raw || ''));
    var p = code.split(':');
    switch (p[0]) {
      case 'r': case 'n': case 'f': return !!Chem.fromCode(p.slice(1).join(':'));
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
    LEVELS: LEVELS, PAIRS: PAIRS, rng: rng, shuffle: shuffle, newPlan: newPlan, followUp: followUp,
    strip: strip, compoundOf: compoundOf, valid: valid
  };
})();

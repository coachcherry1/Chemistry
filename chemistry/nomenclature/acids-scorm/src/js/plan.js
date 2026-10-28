/* plan.js — the level list and the draw for one run. No DOM.
 *
 * A run is a list of item codes per level:
 *   n:h.SO4       name this compound      (f:h.SO4 = write its formula)
 *   q:ac1         a check-for-understanding question from the bank
 *   g:r:Pb4.O     a generated check question (see cfu.js)
 * Compound codes: "Fe3.SO4" ionic (cation, charge, anion), "v.N2O4" covalent,
 * "h.SO4" acid. A leading "!" marks a level-end checkpoint question and a
 * leading "+" a follow-up added after a missed check.
 *
 * Level 1 is acids only, mixed by acid type (binary, -ate -> -ic,
 * -ite -> -ous). Levels 2 and 3 mix all four rule sets - acid, ionic, ionic
 * with a transition metal, covalent. Each level fills a list of required
 * cases, places look-alike pairs next to each other, never repeats a
 * category three times running, and interleaves names and formulas the same
 * way.
 */

var Plan = (function () {
  'use strict';

  var LEVELS = [
    { n: 1, name: 'Acids', count: 14, cfuEvery: 3, pairs: 3, acidsOnly: true,
      targets: { bin: 4, ic: 5, ous: 5 },
      tags: ['acid', 'acidf'], checkpoint: ['acid', 'acidf', 'acid'],
      blurb: 'Binary acids and oxyacids, mixed. Every question starts with the same decision: no oxygen (hydro-…-ic), an -ate ion (-ic) or an -ite ion (-ous)?' },
    { n: 2, name: 'All compounds', count: 16, cfuEvery: 2, pairs: 2,
      targets: { acid: 4, cov: 4, ion: 4, tm: 4 },
      tags: ['acidx', 'acid', 'decide', 'cross', 'prefix', 'covred', 'tm', 'charge', 'paren'],
      checkpoint: ['acidx', 'decide', 'cross'],
      blurb: 'Acids, ionic and covalent compounds, mixed. Every question starts with the same decision: acid, ionic, ionic with a Roman numeral, or covalent?' },
    { n: 3, name: 'On your own', count: 16, cfuEvery: 3, pairs: 2,
      targets: { acid: 4, cov: 4, ion: 4, tm: 4 },
      tags: ['acidx', 'acid', 'acidf', 'decide', 'cross', 'prefix', 'covred', 'tm', 'charge', 'paren'],
      checkpoint: ['acidx', 'acidf', 'prefix'],
      blurb: 'Still all four types, now with no steps and no flowchart. Choose the right builder and use only the parts that belong.' }
  ];

  /* Look-alikes that only the decision tells apart, placed side by side.
     Level 1 draws from the acid pairs; Levels 2-3 take one acid-versus-other
     pair and one ionic-versus-covalent pair. */
  var ACID_PAIRS = [
    ['h.NO3', 'h.NO2'], ['h.SO4', 'h.SO3'], ['h.ClO3', 'h.ClO2'], ['h.ClO4', 'h.ClO'],
    ['h.PO4', 'h.PO3'], ['h.Cl', 'h.ClO3'], ['h.S', 'h.SO4'], ['h.CrO4', 'h.Cr2O7'], ['h.Br', 'h.BrO3']
  ];
  var CROSS_PAIRS = [
    ['h.NO3', 'Na1.NO3'], ['h.SO3', 'v.SO3'], ['h.SO3', 'Na1.SO3'], ['h.NO2', 'v.NO2'],
    ['h.ClO3', 'K1.ClO3'], ['h.Cl', 'Na1.Cl'], ['h.S', 'Zn2.S'], ['h.PO4', 'Ca2.PO4'],
    ['h.CO3', 'v.CO2'], ['h.F', 'v.XeF2'], ['h.SO4', 'Cu2.SO4'], ['h.MnO4', 'K1.MnO4']
  ];
  var IONCOV_PAIRS = [
    ['Sn4.Cl', 'v.CCl4'], ['Sn4.Cl', 'v.SiCl4'], ['Pb4.O', 'v.SiO2'], ['Pb4.O', 'v.CO2'],
    ['Ti4.O', 'v.SiO2'], ['Fe3.O', 'v.N2O3'], ['Cr3.O', 'v.B2O3'], ['Co2.O', 'v.CO'],
    ['NH41.Cl', 'v.NCl3'], ['Ag1.Cl', 'Cu1.Cl'], ['Zn2.S', 'Ni2.S'], ['Ca2.Cl', 'v.SCl2'],
    ['Mg2.F', 'Mn2.F'], ['Al3.Cl', 'v.BCl3'], ['Ba2.F', 'v.XeF2'], ['K1.F', 'v.KrF2'],
    ['Pb2.Cl', 'v.PCl3'], ['Sn4.O', 'v.SO2']
  ];
  var PAIRS = ACID_PAIRS.concat(CROSS_PAIRS).concat(IONCOV_PAIRS);
  var PAIR_SETS = { 1: [ACID_PAIRS, ACID_PAIRS, ACID_PAIRS], 2: [CROSS_PAIRS, IONCOV_PAIRS], 3: [CROSS_PAIRS, IONCOV_PAIRS] };

  function agZn(c) { return c.kind === 'ion' && (c.c.t === 'Ag' || c.c.t === 'Zn'); }
  function snPb(c) { return c.kind === 'ion' && (c.c.t === 'Sn' || c.c.t === 'Pb'); }

  /* Cases each level must contain, by category. */
  var REQUIRED = {
    1: {
      bin: [function (c) { return c.a.t === 'S' || c.a.t === 'CN'; }],
      ic: [function (c, t) { return t.multiH; }, function (c, t) { return t.perHypo; }],
      ous: [function (c, t) { return t.multiH; }, function (c, t) { return t.perHypo; }]
    },
    2: {
      acid: [function (c, t) { return t.binary; }, function (c) { return c.type === 'ic'; },
             function (c) { return c.type === 'ous'; }],
      cov: [function (c, t) { return t.reducible; }, function (c, t) { return t.monoSecond; },
            function (c, t) { return t.noble; }],
      ion: [agZn, function (c, t) { return t.ammonium; },
            function (c, t) { return !t.ammonium && c.a.poly && c.n > 1; }],
      tm: [function (c, t) { return t.fourOverTwo; }, snPb, function (c) { return c.q === 1; }]
    }
  };
  REQUIRED[3] = REQUIRED[2];

  /* r is the category a level balances on: the acid type for acids in
     Level 1, the four-way rule everywhere else. */
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
    function first(cpd) { return cpd.kind === 'cov' ? cpd.e1 : cpd.kind === 'acid' ? cpd.code : cpd.c.t; }
    return function (test) {
      var base = POOL.filter(function (x) {
        if (acidLevel && x.r !== 'acid') return false;
        return test(x.cpd, x.t, acidLevel ? x.cpd.type : x.r);
      });
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

  var acidLevel = false;
  function ruleOf(code) {
    var x = BY_CODE[code];
    return acidLevel ? x.cpd.type : x.r;
  }

  /* Blocks of one or two compound codes: the look-alike pairs first, then
     singles filling the required cases and the per-rule targets. */
  function chooseBlocks(L, rand, used) {
    var pick = chooser(rand, used);
    var sets = PAIR_SETS[L.n];
    var chosen = [], taken = {};
    var have = {};
    Object.keys(L.targets).forEach(function (r) { have[r] = []; });

    /* A pair is only taken if every rule set still has room for the
       required cases the pairs so far have not covered. */
    function fits(extra) {
      return Object.keys(L.targets).every(function (r) {
        var codes = have[r].concat(extra.filter(function (c) { return ruleOf(c) === r; }));
        var unmet = REQUIRED[L.n][r].filter(function (test) {
          return !codes.some(function (c) { return test(BY_CODE[c].cpd, BY_CODE[c].t); });
        }).length;
        return L.targets[r] - codes.length >= unmet;
      });
    }

    sets.slice(0, L.pairs).forEach(function (set) {
      var pairs = shuffle(set, rand).filter(function (p) {
        /* Levels 2-3 may reuse an acid inside a pair - there are only 22 */
        return p.every(function (c) {
          return BY_CODE[c] && !taken[c] && (!used[c] || (!acidLevel && BY_CODE[c].r === 'acid'));
        }) && fits(p);
      });
      if (!pairs.length) return;
      var pr = pairs[0];
      chosen.push(pr);
      pr.forEach(function (c) { taken[c] = used[c] = true; have[ruleOf(c)].push(c); });
    });
    var blocks = chosen.map(function (p) { return shuffle(p, rand); });

    Object.keys(L.targets).forEach(function (r) {
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
    var byRule = {};
    blocks.forEach(function (b) {
      b.forEach(function (code, i) { (byRule[ruleOf(code)] = byRule[ruleOf(code)] || []).push({ b: b, i: i }); });
    });
    var oddStart = rand() < 0.5 ? 'n' : 'f';
    Object.keys(byRule).forEach(function (r) {
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
    acidLevel = !!L.acidsOnly;
    var blocks = chooseBlocks(L, rand, used);
    assignDirections(blocks, rand);
    var flat = orderBlocks(blocks, rand, [ruleKey, dirKey]);
    acidLevel = false;
    return flat;
  }

  /* ------------------------------------------------------------ checks */

  function compoundOf(code) {
    var m = /^(?:[nfr]|g:[cfnrt]):(.+)$/.exec(code);
    return m ? m[1] : null;
  }

  function gen(kind, test) {
    return POOL.filter(function (x) { return test(x.cpd, x.t); })
      .map(function (x) { return 'g:' + kind + ':' + x.cpd.code; });
  }

  function genCandidates(level, tag) {
    var cov = function (c) { return c.kind === 'cov'; };
    var ion = function (c) { return c.kind === 'ion'; };
    var acid = function (c) { return c.kind === 'acid'; };
    switch (tag) {
      case 'acid': return gen('n', acid).concat(gen('t', acid));
      case 'acidf': return gen('f', acid);
      case 'acidx': return level >= 2 ? gen('r', acid) : [];
      case 'decide': return level >= 2 ? gen('r', function (c) { return !acid(c); }) : [];
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

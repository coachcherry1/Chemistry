/* plan.js: the parts and the draw for one run. No DOM.
 *
 * A run is a list of item codes per part:
 *   s:Mg        Part 1: strip the atom, one electron at a time
 *   t:Al        mystery element, data as a table
 *   g:K         mystery element, data as a bar graph
 *   h:Si        mystery element with only four values, so no jump yet
 *   c:Na.Mg.2   which has the larger 2nd ionization energy, Na or Mg?
 *   q:eq1       a check question from the bank
 * A leading "!" marks a checkpoint question and a leading "+" a follow-up
 * added after a missed check.
 *
 * The draw is balanced, not purely random. The two full mystery elements
 * always come from different sides of the table (one from groups 1 and 2,
 * one from groups 13 to 15), neither repeats the Part 1 element, and the
 * check questions in a run never share a tag. Which element fills each place
 * varies, so a retry is a new set.
 */

var Plan = (function () {
  'use strict';

  var PARTS = [
    { n: 1, name: 'Strip the atom',
      blurb: 'Pull electrons off one at a time. Before each one, predict what it will cost.' },
    { n: 2, name: 'Mystery elements',
      blurb: 'Find the huge jump, count the electrons in the outer level, and name the element.' },
    { n: 3, name: 'Checkpoint',
      blurb: 'Three questions. Every one comes with an explanation.' }
  ];

  var MID_TAGS = ['eq', 'small', 'occ'];

  /* mulberry32: small, fast, seedable */
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

  function without(list, used) {
    var left = list.filter(function (x) { return used.indexOf(x) < 0; });
    return left.length ? left : list;
  }

  function newPlan(seed, opts) {
    var rand = rng(seed);
    opts = opts || {};

    var strip = opts.strip && DATA.STRIP.indexOf(opts.strip) >= 0 ? opts.strip : any(DATA.STRIP, rand);
    var used = [strip];

    var sSide = DATA.FULL.filter(function (x) { return Atom.outer(x) <= 2; });
    var pSide = DATA.FULL.filter(function (x) { return Atom.outer(x) >= 3; });
    var first = any(without(sSide, used), rand);
    used.push(first);
    var second = any(without(pSide, used), rand);
    used.push(second);
    var pair = shuffle([first, second], rand);
    var kinds = shuffle(['t', 'g'], rand);

    var hidden = any(without(DATA.HIDDEN, used), rand);
    used.push(hidden);

    var pairs = DATA.PAIRS.filter(function (p) { return used.indexOf(p[0]) < 0 && used.indexOf(p[1]) < 0; });
    var cmp = any(pairs.length ? pairs : DATA.PAIRS, rand);

    var midTag = any(MID_TAGS, rand);
    var mid = any(Checks.byTag(midTag), rand).id;
    var cpTags = shuffle(Checks.TAGS.filter(function (t) { return t !== midTag; }), rand).slice(0, 3);
    var cps = cpTags.map(function (t) { return '!q:' + any(Checks.byTag(t), rand).id; });

    var p = {};
    p[1] = ['s:' + strip];
    p[2] = [kinds[0] + ':' + pair[0], kinds[1] + ':' + pair[1], 'q:' + mid, 'h:' + hidden,
            'c:' + cmp[0] + '.' + cmp[1] + '.' + cmp[2]];
    p[3] = cps;
    return p;
  }

  function strip(code) { return code.replace(/^[!+]*/, ''); }

  function valid(code) {
    var c = strip(code), m;
    if ((m = /^([stgh]):([A-Za-z]+)$/.exec(c))) {
      if (m[1] === 's') return DATA.STRIP.indexOf(m[2]) >= 0;
      if (m[1] === 'h') return DATA.HIDDEN.indexOf(m[2]) >= 0;
      return DATA.FULL.indexOf(m[2]) >= 0;
    }
    if ((m = /^c:([A-Za-z]+)\.([A-Za-z]+)\.(\d)$/.exec(c))) {
      return DATA.PAIRS.some(function (p) { return p[0] === m[1] && p[1] === m[2] && String(p[2]) === m[3]; });
    }
    if ((m = /^q:(\w+)$/.exec(c))) return !!Checks.get(m[1]);
    return false;
  }

  /* A different question on the same idea, one the run has not asked yet. */
  function followUp(tag, plan, seed) {
    var asked = {};
    Object.keys(plan).forEach(function (k) {
      plan[k].forEach(function (c) {
        var m = /^q:(\w+)$/.exec(strip(c));
        if (m) asked[m[1]] = true;
      });
    });
    var left = Checks.byTag(tag).filter(function (q) { return !asked[q.id]; });
    if (!left.length) return null;
    return 'q:' + any(left, rng(seed)).id;
  }

  return {
    PARTS: PARTS, rng: rng, shuffle: shuffle, newPlan: newPlan, valid: valid,
    followUp: followUp, bare: strip
  };
})();

#!/usr/bin/env node
/* validate.js: refuses content that could produce a wrong or ambiguous
 * question. Run after any edit to src/js/data.js, checks.js or items.js.
 *
 *   node tools/validate.js
 */

'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var SRC = path.join(__dirname, '..', 'src');
var ctx = vm.createContext({ console: console });
['data.js', 'atom.js', 'checks.js', 'plan.js', 'items.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(SRC, 'js', f), 'utf8'), ctx, { filename: f });
});
var DATA = vm.runInContext('DATA', ctx);
var Atom = vm.runInContext('Atom', ctx);
var Checks = vm.runInContext('Checks', ctx);
var Plan = vm.runInContext('Plan', ctx);
var Items = vm.runInContext('Items', ctx);

var failures = [], seen = {};
function fail(msg) {
  var key = msg.replace(/^[!+]*/, '');
  if (!seen[key]) { seen[key] = true; failures.push(msg); }
}
function check(cond, msg) { if (!cond) fail(msg); }

/* ------------------------------------------------ the packet's own numbers */

/* Part 5, the X / Y / Z table and question 5.3, exactly as printed. */
var PART5 = {
  Na: [496, 4562, 6910, 9544, 13354],
  Mg: [738, 1451, 7733, 10542, 13631],
  Al: [578, 1817, 2745, 11577, 14842],
  Be: [899, 1757, 14849, 21007]
};
/* Part 2, the 1st ionization energy row. */
var PART2 = {
  H: 1309, He: 2370, Li: 519, Be: 898, B: 799, C: 1080, N: 1400, O: 1300, F: 1678, Ne: 2100,
  Na: 495, Mg: 737, Al: 576, Si: 785, P: 1010, S: 990, Cl: 1250, Ar: 1500, K: 418, Ca: 590
};
/* The teacher key's answers to 5.1, "about how many times bigger". */
var KEY_TIMES = { Na: 'about 9 times', Mg: 'about 5 times', Al: 'about 4 times' };

Object.keys(DATA.IE).forEach(function (sym) {
  var e = DATA.IE[sym], ie = e.ie;
  if (e.src === 'part5') {
    check(JSON.stringify(ie) === JSON.stringify(PART5[sym]), sym + ': does not match Part 5 of the packet');
  } else if (e.src === 'part2+ref') {
    check(ie[0] === PART2[sym], sym + ': 1st ionization energy ' + ie[0] + ' does not match Part 2 (' + PART2[sym] + ')');
  } else {
    fail(sym + ': unknown source ' + e.src);
  }
  for (var i = 1; i < ie.length; i++) check(ie[i] > ie[i - 1], sym + ': ionization energies must rise every time');
  check(ie.length <= DATA.z(sym), sym + ': more ionization energies than electrons');
});
Object.keys(KEY_TIMES).forEach(function (sym) {
  var ie = DATA.IE[sym].ie, o = Atom.outer(sym);
  check(Atom.times(ie[o - 1], ie[o]) === KEY_TIMES[sym],
        sym + ': jump reads "' + Atom.times(ie[o - 1], ie[o]) + '" but the teacher key says ' + KEY_TIMES[sym]);
});

/* ----------------------------------------------------------- the chemistry */

DATA.SYMBOLS.forEach(function (sym, i) {
  var z = i + 1;
  var total = Atom.config(sym, 0).reduce(function (a, s) { return a + s.c; }, 0);
  check(total === z, sym + ': configuration holds ' + total + ' electrons, not ' + z);
  var row = z <= 2 ? 1 : z <= 10 ? 2 : z <= 18 ? 3 : 4;
  check(Atom.row(sym) === row, sym + ': occupied levels ' + Atom.row(sym) + ', expected row ' + row);
  var group = z === 1 ? 1 : z === 2 ? 18 : [0, 1, 2, 13, 14, 15, 16, 17, 18][Atom.outer(sym)];
  check(Atom.group(sym) === group, sym + ': group ' + Atom.group(sym) + ', expected ' + group);
});

function ratios(v) {
  var r = [];
  for (var i = 1; i < v.length; i++) r.push(v[i] / v[i - 1]);
  return r;
}

/* The biggest jump has to sit exactly where the outer level runs out, and
   stand clearly above every other step. */
function clearJump(sym, values) {
  var o = Atom.outer(sym);
  check(values.length > o, sym + ': the data must run past the jump');
  var r = ratios(values);
  check(Atom.biggestJump(values) === o, sym + ': biggest jump is not after the ' + Atom.ordinal(o));
  var others = r.filter(function (_, i) { return i !== o - 1; });
  var second = Math.max.apply(null, others);
  check(r[o - 1] >= 1.3 * second, sym + ': the jump (' + r[o - 1].toFixed(2) + ' times) is too close to another step (' +
        second.toFixed(2) + ' times)');
}

DATA.FULL.forEach(function (sym) { clearJump(sym, DATA.IE[sym].ie); });
DATA.HIDDEN.forEach(function (sym) {
  var ie = DATA.IE[sym].ie, n = DATA.HIDDEN_SHOWN;
  clearJump(sym, ie);
  check(Atom.outer(sym) >= n, sym + ': hidden-jump element needs at least ' + n + ' outer electrons');
  var r = ratios(ie.slice(0, n));
  check(Math.max.apply(null, r) < 2.5, sym + ': a step in the first ' + n + ' values looks like a jump');
});
DATA.STRIP.forEach(function (sym) {
  var n = Items.STRIP_SHOWN, ie = DATA.IE[sym].ie, o = Atom.outer(sym);
  check(ie.length >= n, sym + ': strip element needs ' + n + ' values');
  check(o < n, sym + ': the jump must be inside the ' + n + ' values Part 1 shows');
  check(o <= 2, sym + ': strip elements are groups 1 and 2 only, so every step is plainly small or huge');
  clearJump(sym, ie.slice(0, n));
});
DATA.PAIRS.forEach(function (p) {
  var a = p[0], b = p[1], k = p[2];
  check(Atom.row(a) === Atom.row(b), p.join('/') + ': pair must share a row');
  check(DATA.IE[a].ie.length >= k && DATA.IE[b].ie.length >= k, p.join('/') + ': missing data');
  check(Atom.occupied(a, k - 1) < Atom.occupied(b, k - 1), p.join('/') + ': Step 1 must decide it');
  check(DATA.IE[a].ie[k - 1] > DATA.IE[b].ie[k - 1], p.join('/') + ': the data disagrees with Step 1');
});
DATA.METALS.forEach(function (sym) {
  check([1, 2, 13].indexOf(Atom.group(sym)) >= 0, sym + ': only group 1, 2 and 13 metals may be named as ions');
});

/* ------------------------------------------------------------- the checks */

var ids = {};
Checks.BANK.forEach(function (q) {
  check(!ids[q.id], q.id + ': duplicate id');
  ids[q.id] = true;
  check(Checks.TAGS.indexOf(q.tag) >= 0, q.id + ': unknown tag ' + q.tag);
  check(q.a.length === 4, q.id + ': needs four options');
  check(new Set(q.a).size === q.a.length, q.id + ': repeated option');
  check(q.why && q.why.length > 20, q.id + ': needs an explanation');
});
Checks.TAGS.forEach(function (t) {
  check(Checks.byTag(t).length >= 3, t + ': needs at least three questions, so a follow-up can differ');
});

/* -------------------------------------------------------------- the items */

var texts = [];
function collect(label, s) { if (s) texts.push([label, String(s)]); }

function allCodes() {
  var codes = [];
  DATA.STRIP.forEach(function (s) { codes.push('s:' + s); });
  DATA.FULL.forEach(function (s) { codes.push('t:' + s, 'g:' + s); });
  DATA.HIDDEN.forEach(function (s) { codes.push('h:' + s); });
  DATA.PAIRS.forEach(function (p) { codes.push('c:' + p.join('.')); });
  Checks.BANK.forEach(function (q) { codes.push('q:' + q.id, '!q:' + q.id, '+q:' + q.id); });
  return codes;
}

allCodes().forEach(function (code) {
  check(Plan.valid(code), code + ': rejected by Plan.valid');
  [1, 2, 3, 99, 12345].forEach(function (seed, n) {
    var it;
    try { it = Items.build(code, seed, n); } catch (e) { fail(code + ': build threw ' + e.message); return; }
    collect(code + ' prompt', it.prompt);
    collect(code + ' kicker', it.kicker);
    collect(code + ' answer', it.answer);
    (it.lines || []).forEach(function (l) { collect(code + ' line', l); });
    check(it.steps.length > 0, code + ': no steps');
    if (!it.isCheck) check(!!it.answer, code + ': no summary answer');
    if (it.answer && /It forms/.test(it.answer)) {
      check(DATA.METALS.indexOf(it.sym) >= 0, code + ': names an ion for a non-metal');
    }
    it.steps.forEach(function (s, i) {
      var where = code + ' step ' + (i + 1);
      collect(where + ' q', s.q);
      collect(where + ' right', s.rightMsg);
      collect(where + ' why', s.why);
      if (s.type === 'choice' || s.type === 'check') {
        var right = s.options.filter(function (o) { return o.correct; });
        check(right.length === 1, where + ': needs exactly one right answer, has ' + right.length);
        var labels = s.options.map(function (o) { return o.label; });
        check(new Set(labels).size === labels.length, where + ': repeated option ' + labels.join(' | '));
        s.options.forEach(function (o) {
          collect(where + ' option', o.label);
          collect(where + ' option why', o.why);
          collect(where + ' summary', o.summary);
          if (s.type === 'choice' && !o.correct) check(!!o.why, where + ': wrong option "' + o.label + '" has no feedback');
        });
      }
      if (s.type === 'pick') check(DATA.SYMBOLS.indexOf(s.right) >= 0, where + ': pick answer not on the table');
      if (s.type === 'action') collect(where + ' label', s.label);
      try { if (s.onRight) s.onRight(it, { answer: '' }); } catch (e) { fail(where + ': onRight threw ' + e.message); }
    });
  });
});

/* ----------------------------------------------------------- the wording */

Plan.PARTS.forEach(function (P) { collect('part name', P.name); collect('part blurb', P.blurb); });
collect('group hint', Atom.groupHint());

/* The packet's conventions: occupied energy levels, rows, and no shielding
   or effective nuclear charge anywhere. No em dashes in anything students see. */
var BANNED = [
  [/—|&mdash;/, 'an em dash'],
  [/valence/i, '"valence" (the packet says "electrons in the outer level")'],
  [/shield/i, 'shielding (not part of the rule)'],
  [/effective nuclear|zeff/i, 'effective nuclear charge (not part of the rule)'],
  [/core electron/i, '"core electrons"'],
  [/\bperiods?\b/i, '"period" (the packet says "row")'],
  [/octet/i, '"octet"']
];
texts.forEach(function (t) {
  BANNED.forEach(function (b) {
    if (b[0].test(t[1])) fail(t[0] + ': uses ' + b[1] + ': "' + t[1].slice(0, 90) + '"');
  });
});

/* Every source file too, comments included, for the em dash. */
function walk(dir) {
  fs.readdirSync(dir).forEach(function (f) {
    var p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) return walk(p);
    if (!/\.(js|html|css|xml)$/.test(f)) return;
    var src = fs.readFileSync(p, 'utf8');
    if (/—|&mdash;/.test(src)) fail(path.relative(SRC, p) + ': contains an em dash');
    if (/\.html$/.test(f)) {
      var visible = src.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ');
      BANNED.forEach(function (b) { if (b[0].test(visible)) fail(f + ': page text uses ' + b[1]); });
    }
  });
}
walk(SRC);

/* ------------------------------------------------------------ the draw */

var RUNS = 2000;
for (var seed = 1; seed <= RUNS; seed++) {
  var p = Plan.newPlan(seed * 2654435761 >>> 0);
  var where = 'run ' + seed;
  [1, 2, 3].forEach(function (n) {
    p[n].forEach(function (c) { check(Plan.valid(c), where + ': bad code ' + c); });
  });
  check(p[1].length === 1 && /^s:/.test(p[1][0]), where + ': Part 1 must be one strip item');
  var strip = p[1][0].slice(2);
  var kinds = p[2].map(function (c) { return Plan.bare(c).charAt(0); }).join('');
  check(/^(tg|gt)qhc$/.test(kinds), where + ': Part 2 order is ' + kinds);
  var full = p[2].slice(0, 2).map(function (c) { return c.slice(2); });
  var hidden = p[2][3].slice(2);
  check(full[0] !== full[1], where + ': the two mystery elements repeat');
  check(full.indexOf(strip) < 0, where + ': a mystery element repeats the Part 1 element');
  check(full.indexOf(hidden) < 0, where + ': the hidden-jump element repeats a mystery element');
  var sides = full.map(function (s) { return Atom.outer(s) <= 2 ? 's' : 'p'; }).sort().join('');
  check(sides === 'ps', where + ': mystery elements must come from both sides of the table');
  var tags = [p[2][2]].concat(p[3]).map(function (c) { return Checks.get(Plan.bare(c).slice(2)).tag; });
  check(new Set(tags).size === tags.length, where + ': two checks share a tag');
  check(p[3].length === 3 && p[3].every(function (c) { return c.charAt(0) === '!'; }), where + ': checkpoint must be three questions');

  /* The biggest save: every follow-up added. */
  var big = JSON.parse(JSON.stringify(p));
  big[2].splice(4, 0, '+q:eq3', '+q:sm4');
  big[3].push('!+q:ca3', '!+q:io4');
  var json = JSON.stringify({ v: 1, s: 4294967295, u: 3, l: 3, i: 5, p: big,
                              st: { items: 99, clean: 99, checks: 99, checksRight: 99 } });
  check(json.length < 4000, where + ': save is ' + json.length + ' characters, over the SCORM 1.2 limit');
}

/* ---------------------------------------------------------------- report */

if (failures.length) {
  console.error(failures.length + ' problem' + (failures.length === 1 ? '' : 's') + ':');
  failures.slice(0, 60).forEach(function (f) { console.error('  - ' + f); });
  process.exit(1);
}
console.log('OK: ' + Object.keys(DATA.IE).length + ' elements, ' + allCodes().length + ' item codes, ' +
            Checks.BANK.length + ' check questions, ' + texts.length + ' strings, ' + RUNS + ' simulated runs.');

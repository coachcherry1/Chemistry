/* chem.js: the model. Formulas, molar masses to the tenths place, the four
 * steps, the fractions of Multiply if not whole, the judging of every box a
 * student types and the LaTeX of every worked solution. Nothing here touches
 * the page, so tools/validate.js runs all of it in node.
 *
 * The teacher's four steps, in the teacher's words:
 *   1 Percents to grams     given percents, assume 100 g: 40.0% is 40.0 g
 *   2 Grams to moles        grams divided by the molar mass
 *   3 Divide by small       every mole value divided by the smallest one
 *   4 Multiply if not whole multiply every value by the same number until
 *                           all are whole (1.5 is 1 1/2, so x 2)
 *
 * The class's rules, as the teacher set them:
 * - Molar masses to the tenths place, as in the mole conversion packages
 *   (judgeMM is theirs: two-decimal tables, full masses rounded at the end
 *   and anything within 1.5%, Chem.TOL, count; a zero in the tenths place
 *   need not be typed).
 * - Moles to at least 3 significant figures, quotients to 2 decimal places
 *   (1.33). Fewer is not marked wrong: the student is asked to keep more
 *   and Check again, and that Check is the one that counts.
 * - A quotient within 0.1 of a whole number is whole (1.92 is 2). Otherwise
 *   it is a fraction: halves, thirds, fourths or fifths (.50 x 2; .33 and
 *   .67 x 3; .25 and .75 x 4; .20 .40 .60 .80 x 5), and every value is
 *   multiplied by the smallest number that makes them all whole.
 * - Each box is judged against the student's own earlier boxes (their
 *   grams, their molar mass, their moles), so one slip is never marked twice.
 */
var Chem = (function () {
  'use strict';

  var TOL = 0.015;
  var TOL_TEXT = String(Math.round(TOL * 1000) / 10) + '%';
  /* within this much of a whole number, a quotient is whole */
  var WHOLE = 0.1;
  /* a quotient typed within this much of the right one counts (it is rounded
     to two decimals, and a student may divide unrounded calculator values) */
  var QTOL = 0.012;

  /* ------------------------------------------------------------ numbers */

  var SUPS = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
               '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  var SUP_BACK = {};
  Object.keys(SUPS).forEach(function (k) { SUP_BACK[SUPS[k]] = k; });
  function sup(n) { return String(n).split('').map(function (c) { return SUPS[c] || c; }).join(''); }
  var SUBS = '₀₁₂₃₄₅₆₇₈₉';
  function subs(f) { return String(f).replace(/\d/g, function (d) { return SUBS[+d]; }); }
  var TIMES = '×';

  /* A decimal string scaled to an integer number of 10^-dp units, rounded
     half up, with no binary fraction ever formed: scaled('55.845', 1) is 558. */
  function scaled(str, dp) {
    var m = /^(\d+)(?:\.(\d+))?$/.exec(String(str));
    if (!m) return null;
    var frac = m[2] || '';
    var keep = (frac + '000000000').slice(0, dp);
    var n = parseInt(m[1] + keep, 10);
    if (frac.length > dp && +frac[dp] >= 5) n += 1;
    return n;
  }
  function tenthsText(t10) { return (t10 / 10).toFixed(1); }
  function roundSig(v, sig) { return (v === 0 || !isFinite(v)) ? v : Number(v.toPrecision(sig)); }
  function roundTo(v, d) { var p = Math.pow(10, d); return Math.round(v * p + (v >= 0 ? 1e-9 : -1e-9)) / p; }

  /* Significant figures a typed number shows (trailing zeros only after a point). */
  function sigFigsIn(str) {
    var s = String(str == null ? '' : str).trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, '');
    s = s.replace(/(×|x|\*)10\^?/g, 'e');
    var m = s.split('e')[0].replace(/^[+-]/, '');
    if (!/^[0-9]*\.?[0-9]*$/.test(m) || m === '' || m === '.') return 0;
    var hasDot = m.indexOf('.') >= 0;
    var digits = m.replace('.', '').replace(/^0+/, '');
    if (digits === '') return 0;
    if (!hasDot) digits = digits.replace(/0+$/, '');
    return digits.length;
  }
  function decimalsIn(str) {
    var m = /\.(\d*)$/.exec(String(str == null ? '' : str).trim());
    return m ? m[1].length : 0;
  }
  function parseNum(str) {
    if (str == null) return NaN;
    var s = String(str).trim().toLowerCase();
    if (/\d\s+\d/.test(s)) return NaN;
    s = s.replace(/,/g, '').replace(/\s+/g, '').replace(/[−–]/g, '-');
    if (!s) return NaN;
    s = s.replace(/[⁰¹²³⁴-⁹⁻]/g, function (c) { return SUP_BACK[c]; });
    s = s.replace(/(×|x|\*)10\^?/g, 'e').replace(/e\+/, 'e');
    s = s.replace(/(g\/mol|mol|g|%)$/, '');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e-?\d+)?$/.test(s)) return NaN;
    return parseFloat(s);
  }
  /* sig significant figures, never in scientific notation (no value here
     is big or small enough to need it) */
  function fmtSig(v, sig) {
    if (!isFinite(v)) return '?';
    if (v === 0) return '0';
    var r = roundSig(v, sig);
    var exp = Math.floor(Math.log10(Math.abs(r)) + 1e-12);
    var decimals = Math.max(0, sig - 1 - exp);
    var s = r.toFixed(decimals);
    return decimals === 0 && exp >= sig ? s : s;
  }
  function fmtDec(v, d) { return roundTo(v, d).toFixed(d); }
  /* moles as the solutions write them: 3 significant figures */
  function fmtMol(v) { return fmtSig(v, 3); }
  function fmtQ(v) { return fmtDec(v, 2); }

  /* --------------------------------------------------------- elements */

  function el(sym) {
    var e = ELEMENTS[sym];
    if (!e) throw new Error('no element ' + sym);
    return e;
  }
  function radioactive(sym) { return /^\(/.test(el(sym).std); }
  function t10(sym) { return scaled(el(sym).std, 1); }
  function alt10(sym) {
    var two = scaled(el(sym).std, 2);
    var a = scaled((two / 100).toFixed(2), 1);
    return a === t10(sym) ? null : a;
  }
  function tableMass(sym) { return radioactive(sym) ? el(sym).std : tenthsText(t10(sym)); }
  function stdMass(sym) { return parseFloat(el(sym).std); }
  var DIATOMIC = { H: 1, N: 1, O: 1, F: 1, Cl: 1, Br: 1, I: 1 };

  /* --------------------------------------------------------- formulas */

  function parse(f) {
    var i = 0;
    function num() {
      var m = /^\d+/.exec(f.slice(i));
      if (!m) return 1;
      i += m[0].length;
      return +m[0];
    }
    function seq() {
      var items = [];
      while (i < f.length && f[i] !== ')') {
        if (f[i] === '(') {
          i++;
          var inner = seq();
          if (f[i] !== ')') throw new Error('unclosed bracket in ' + f);
          i++;
          items.push({ group: inner, n: num() });
        } else {
          var m = /^[A-Z][a-z]?/.exec(f.slice(i));
          if (!m) throw new Error('cannot read ' + f);
          i += m[0].length;
          el(m[0]);
          items.push({ el: m[0], n: num() });
        }
      }
      return items;
    }
    var items = seq();
    if (i !== f.length) throw new Error('cannot read ' + f);
    return items;
  }

  /* Atom counts. mode 'nosubs' reads every subscript as 1, 'nogroup' ignores
     the number after a bracket, 'lastonly' applies it to the last atom only. */
  function countAtoms(items, mode) {
    var counts = {}, order = [];
    function walk(list, mult) {
      list.forEach(function (it) {
        if (it.group) {
          var gm = mode === 'nosubs' || mode === 'nogroup' ? 1 : it.n;
          if (mode === 'lastonly') {
            it.group.forEach(function (g, j) {
              if (g.group) walk([g], mult);
              else add(g.el, mult * g.n * (j === it.group.length - 1 ? it.n : 1));
            });
          } else walk(it.group, mult * gm);
        } else add(it.el, mult * (mode === 'nosubs' ? 1 : it.n));
      });
    }
    function add(sym, n) {
      if (!(sym in counts)) { counts[sym] = 0; order.push(sym); }
      counts[sym] += n;
    }
    walk(items, 1);
    return { counts: counts, order: order };
  }

  var INFO = {};
  function info(f) {
    if (INFO[f]) return INFO[f];
    var items = parse(f), c = countAtoms(items, 'normal');
    return (INFO[f] = { f: f, items: items, counts: c.counts, order: c.order, disp: subs(f) });
  }
  function disp(f) { return info(f).disp; }
  function hasText(f) {
    var s = info(f);
    var parts = s.order.map(function (x) { return s.counts[x] + ' ' + x; });
    return parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  }
  /* a formula from an element order and counts: C3H4O3 (a count of 1 is not written) */
  function formulaOf(order, counts) {
    return order.map(function (x) { return x + (counts[x] === 1 ? '' : counts[x]); }).join('');
  }
  function hydrateText(salt, n) { return salt + '·' + (n === 1 ? '' : n) + 'H2O'; }
  function hydrateDisp(salt, n) { return subs(salt) + '·' + (n === 1 ? '' : n) + 'H₂O'; }

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  function lcm(a, b) { return a / gcd(a, b) * b; }

  /* The empirical formula: the counts divided by their greatest common divisor. */
  function empirical(f) {
    var s = info(f);
    var g = s.order.reduce(function (acc, x) { return gcd(acc, s.counts[x]); }, 0);
    var counts = {};
    s.order.forEach(function (x) { counts[x] = s.counts[x] / g; });
    return { order: s.order.slice(), counts: counts, f: formulaOf(s.order, counts), n: g };
  }

  /* ------------------------------------------------------- molar mass */

  function sumTenths(counts) {
    return Object.keys(counts).reduce(function (s, x) { return s + counts[x] * t10(x); }, 0);
  }
  function mm10(f) { return sumTenths(info(f).counts); }
  function mmText(f) { return tenthsText(mm10(f)); }
  function mmValue(f) { return mm10(f) / 10; }
  function mmStd(f) {
    var c = info(f).counts;
    return Object.keys(c).reduce(function (s, x) { return s + c[x] * stdMass(x); }, 0);
  }
  /* every molar mass the class can defend, in tenths */
  function mmAccepted(f) {
    var s = info(f), out = {};
    var syms = s.order;
    (function combo(k, total) {
      if (k === syms.length) { out[total] = 1; return; }
      var x = syms[k], n = s.counts[x];
      combo(k + 1, total + n * t10(x));
      if (alt10(x) != null) combo(k + 1, total + n * alt10(x));
    })(0, 0);
    var exact = syms.reduce(function (t, x) { return t + s.counts[x] * scaled(el(x).std, 5); }, 0);
    out[Math.floor((exact + 5000) / 10000)] = 1;
    return Object.keys(out).map(Number).sort(function (a, b) { return a - b; });
  }
  /* "63.5 + 32.1 + 4(16.0) = 159.6" */
  function mmWork(f) {
    var s = info(f);
    var terms = s.order.map(function (x) {
      var m = tenthsText(t10(x));
      return s.counts[x] === 1 ? m : s.counts[x] + '(' + m + ')';
    });
    return terms.length === 1 && s.counts[s.order[0]] === 1 ? mmText(f) : terms.join(' + ') + ' = ' + mmText(f);
  }

  function mmSlips(f) {
    var s = info(f);
    var acc = mmAccepted(f);
    var out = [];
    var hasGroup = s.items.some(function (it) { return it.group && it.n > 1; });
    function push(v10, kind, msg) {
      if (acc.some(function (a) { return Math.abs(a - v10) < 1.5; })) return;
      if (out.some(function (o) { return o.v10 === v10; })) return;
      out.push({ v10: v10, kind: kind, msg: msg });
    }
    if (hasGroup) {
      var g = s.items.filter(function (it) { return it.group && it.n > 1; })[0];
      var msgG = 'The ' + g.n + ' after the brackets multiplies every atom inside them. ' + s.disp + ' has ' + hasText(f) + '.';
      push(sumTenths(countAtoms(s.items, 'nogroup').counts), 'brackets', msgG);
      push(sumTenths(countAtoms(s.items, 'lastonly').counts), 'brackets', msgG);
    }
    push(sumTenths(countAtoms(s.items, 'nosubs').counts), 'subscripts',
      'Count every atom: a subscript tells how many of the atom just before it. ' + s.disp + ' has ' + hasText(f) + '.');
    var z = s.order.reduce(function (t, x) { return t + s.counts[x] * el(x).z; }, 0);
    push(z * 10, 'atomic-number', 'Those look like atomic numbers. Use the atomic masses from the periodic table.');
    if (s.order.length > 1) {
      s.order.forEach(function (x) {
        push(mm10(f) - s.counts[x] * t10(x), 'left-out',
          'Did you leave out the ' + x + '? Every atom in ' + s.disp + ' adds its mass: ' + hasText(f) + '.');
      });
      s.order.forEach(function (x) {
        var n = s.counts[x];
        var line = 'Count the ' + x + ' atoms again. ' + s.disp + ' has ' + hasText(f) + '.';
        push(mm10(f) + t10(x), 'count', line);
        if (n > 1) push(mm10(f) - t10(x), 'count', line);
      });
    }
    return out;
  }

  /* A typed molar mass. For one element (a row of the table) a diatomic
     molecule's mass is the likely slip: O is 16.0 here, never O2's 32.0. */
  function judgeMM(f, raw) {
    var s = info(f);
    var str = String(raw == null ? '' : raw).trim().replace(/\s*g\s*\/\s*mol\s*$/i, '').replace(/,/g, '');
    var what = s.order.length === 1 && s.counts[s.order[0]] === 1 ? 'the atomic mass of ' + s.disp : 'the molar mass of ' + s.disp;
    if (!str) return { ok: false, empty: true, msg: 'Type ' + what + ', to the tenths place.' };
    if (!/^\d*\.?\d*$/.test(str) || str === '.') return { ok: false, fmt: true, msg: 'Type ' + what + ' as a number to the tenths place, like 58.5.' };
    var x = parseFloat(str), x10 = x * 10;
    var acc = mmAccepted(f);
    var near = function (a, tol) { return Math.abs(x10 - a) <= tol; };
    var trimmed = str.indexOf('.') >= 0 ? str.replace(/0+$/, '').replace(/\.$/, '') : str;
    var tenths = /^\d+(\.\d)?$/.test(trimmed);
    if (tenths && acc.some(function (a) { return near(a, 1e-6); })) return { ok: true, v: x };
    if (s.order.length === 1 && s.counts[s.order[0]] === 1) {
      var sym = s.order[0];
      if (DIATOMIC[sym] && near(2 * t10(sym), 1.5)) {
        return { ok: false, kind: 'diatomic', msg: 'That is ' + sym + '₂. The ' + el(sym).name + ' here is ' + sym + ' atoms in a compound, so ' +
          'use the atomic mass of ' + sym + ' from the periodic table.' };
      }
      if (near(el(sym).z * 10, 0.6)) return { ok: false, kind: 'atomic-number', msg: 'That is the atomic number of ' + sym + '. Use its atomic mass.' };
    }
    var slips = mmSlips(f);
    for (var i = 0; i < slips.length; i++) {
      if (near(slips[i].v10, 0.6)) return { ok: false, kind: slips[i].kind, msg: slips[i].msg };
    }
    var canon = mm10(f);
    var within = function (tol) { return Math.abs(x10 - canon) <= canon * tol + 1e-6; };
    if (tenths && within(TOL)) return { ok: true, v: x };
    if (!tenths && (within(TOL) || acc.some(function (a) { return near(a, 5 - 1e-6); }))) {
      return { ok: false, fmt: true, msg: 'Round ' + what + ' to the tenths place, one digit after the decimal point (a whole number like 32 is ' +
        'fine when the tenths digit is 0).' };
    }
    if (within(3 * TOL)) {
      return { ok: false, kind: 'close', msg: 'Close, but more than ' + TOL_TEXT + ' away. Use each atomic mass rounded to the tenths place, as the ' +
        'periodic table here shows it' + (s.order.length > 1 || s.counts[s.order[0]] > 1 ? ', and add them up: ' + s.disp + ' has ' + hasText(f) : '') + '.' };
    }
    return { ok: false, kind: 'wrong', msg: 'That is not ' + what + '.' + (s.order.length > 1 || s.counts[s.order[0]] > 1 ?
      ' Add the atomic mass of every atom, each rounded to the tenths place: ' + s.disp + ' has ' + hasText(f) + '.' :
      ' Read it from the periodic table (Periodic table button).') };
  }

  /* ---------------------------------------------------------- fractions */

  var UNI = { '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾', '1/5': '⅕', '2/5': '⅖', '3/5': '⅗', '4/5': '⅘' };
  /* every fraction the finder knows: halves, thirds, fourths, fifths, in lowest terms */
  var FRACS = [];
  [2, 3, 4, 5].forEach(function (d) {
    for (var n = 1; n < d; n++) if (gcd(n, d) === 1) FRACS.push({ num: n, den: d, v: n / d, uni: UNI[n + '/' + d], dec: fmtDec(n / d, 2).slice(1) });
  });
  FRACS.sort(function (a, b) { return a.v - b.v; });
  var DENS = [2, 3, 4, 5];

  /* What a quotient is: whole (within 0.1) or a whole number and a fraction. */
  function fracOf(q) {
    var w = Math.floor(q + 1e-9), f = q - w;
    if (f <= WHOLE + 1e-9) return { whole: true, n: w, mult: 1, dist: f };
    if (f >= 1 - WHOLE - 1e-9) return { whole: true, n: w + 1, mult: 1, dist: 1 - f };
    var best = null;
    FRACS.forEach(function (fr) { if (!best || Math.abs(f - fr.v) < Math.abs(f - best.v)) best = fr; });
    return { whole: false, w: w, num: best.num, den: best.den, mult: best.den, dist: Math.abs(f - best.v), frac: best,
             text: (w ? w : '') + best.uni, improper: (w * best.den + best.num) + '/' + best.den, value: w + best.v };
  }
  /* the smallest number that makes every quotient whole */
  function multiplierFor(qs) {
    return qs.reduce(function (m, q) { var f = fracOf(q); return f.whole ? m : lcm(m, f.den); }, 1);
  }
  function wholeAfter(q, mult) { return Math.round(q * mult); }
  /* does every quotient times mult land within 0.1 of a whole number? */
  function allWhole(qs, mult) {
    return qs.every(function (q) { var v = q * mult; return Math.abs(v - Math.round(v)) <= WHOLE + 1e-9; });
  }

  /* ------------------------------------------------------------- judges */

  /* Each judge returns { ok } or { ok: false, msg, kind }; empty (nothing
     typed) and fmt (the right number, rounded too far) are not answers:
     the Check that counts is the next one. */

  function readNum(raw, what) {
    var str = String(raw == null ? '' : raw).trim();
    if (!str) return { empty: true, msg: 'Fill in ' + what + '.' };
    var v = parseNum(str);
    if (isNaN(v)) return { fmt: true, msg: 'Type ' + what + ' as a number, like 1.25.' };
    return { v: v, str: str.replace(/\s*(g\/mol|mol|g|%)\s*$/i, '') };
  }
  function near(a, b, tol) { return Math.abs(a - b) <= tol; }
  /* x could be a rounding, to the sf significant figures it shows, of a value within TOL of want:
     0.013 for 0.01248 (typed 0.0125 first, then rounded again) is the right moles rounded too far */
  function rounds(x, want, sf) {
    if (!(sf > 0) || !(x > 0) || !(want > 0)) return false;
    var half = 0.5 * Math.pow(10, Math.floor(Math.log10(x) + 1e-12) - sf + 1);
    return x - half <= want * (1 + TOL) + 1e-15 && x + half >= want * (1 - TOL) - 1e-15;
  }
  function rel(a, b) { return Math.abs(a - b) / Math.abs(b || 1); }

  /* Grams, Step 1. want: the right grams (a number); how: 'pct' (the
     percent is the grams), 'rest' (100 minus a percent), 'sub' (a
     difference of two balance readings). ctx: { pct, a, b, dp } */
  function judgeGrams(raw, want, how, ctx) {
    ctx = ctx || {};
    var r = readNum(raw, 'the grams');
    if (r.empty || r.fmt) return { ok: false, empty: r.empty, fmt: r.fmt, msg: r.msg };
    var x = r.v, dp = ctx.dp != null ? ctx.dp : 3;
    if (near(x, want, 0.5 * Math.pow(10, -dp) + 1e-9)) return { ok: true, v: x };
    /* fewer decimals than the data: rounded too soon (2.3 for 2.320 is a slip, not 2.32) */
    var d = decimalsIn(r.str);
    if (d < dp && near(roundTo(want, d), x, 1e-9) && !near(roundTo(want, dp), x, 1e-9)) {
      return { ok: false, fmt: true, msg: 'Keep every decimal place the data give (' + fmtDec(want, dp).replace(/^-/, '') + ' has ' + dp + '): do not round yet.' };
    }
    if (how === 'pct' || how === 'rest') {
      if (near(x * 100, want, 0.05) || near(x, want / 100, 0.0005)) {
        return { ok: false, kind: 'fraction', msg: 'Assume a 100 g sample: ' + ctx.pct + '% of 100 g is ' + ctx.pct + ' g. Percents become grams with the same number.' };
      }
      if (how === 'rest' && near(x, 100 - want, 0.05)) {
        return { ok: false, kind: 'other-part', msg: 'That is the water. Of the 100 g, the rest is the anhydrous salt: 100 − ' + ctx.pct + '.' };
      }
      return { ok: false, kind: 'wrong', msg: how === 'pct' ? 'Assume a 100 g sample: then each percent is that many grams.' :
        'Assume a 100 g sample of the hydrate: the water is ' + ctx.pct + ' g, and the anhydrous salt is the rest of the 100 g.' };
    }
    if (how === 'sub') {
      if (ctx.a != null && near(x, ctx.a + ctx.b, 0.0006)) return { ok: false, kind: 'added', msg: 'You added. The part you want is a difference: subtract.' };
      if (near(x, -want, 0.0006)) return { ok: false, kind: 'sign', msg: 'A mass is never negative: subtract the smaller reading from the larger.' };
      if (ctx.other && ctx.other.some(function (o) { return near(x, o.v, 0.0006); })) {
        var o = ctx.other.filter(function (o) { return near(x, o.v, 0.0006); })[0];
        return { ok: false, kind: 'other-pair', msg: o.msg };
      }
      return { ok: false, kind: 'wrong', msg: ctx.how || 'Subtract the two masses again.' };
    }
    return { ok: false, kind: 'wrong', msg: 'Not those grams.' };
  }

  /* Moles, Step 2: the answer of the dimensional analysis setup
       g X x (1 mol X / ___ g X) [x (___ mol C / 1 mol X)] = ___ mol
     g: the student's grams, mm: their molar mass, cls: the class's molar
     mass, atom: for a row of one element, its symbol (the O2 slip); per: in
     combustion, the mole ratio (1 C per CO2, 2 H per H2O) and molecule the
     CO2 or H2O it is read from. */
  function judgeMoles(raw, g, mm, cls, atom, per, molecule) {
    per = per || 1;
    var r = readNum(raw, 'the moles');
    if (r.empty || r.fmt) return { ok: false, empty: r.empty, fmt: r.fmt, msg: r.msg };
    var x = r.v, sf = sigFigsIn(r.str);
    var a = g * per / mm, b = g * per / cls;
    var hit = function (want) { return rel(x, want) <= TOL; };
    /* the right moles rounded to 1 or 2 significant figures: not wrong, too short */
    if (sf < 3 && (rounds(x, a, sf) || rounds(x, b, sf) || hit(a) || hit(b))) {
      return { ok: false, fmt: true, msg: 'Keep at least 3 significant figures in moles (' + fmtMol(a) + '): rounding too early can change the ratio.' };
    }
    if (hit(a) || hit(b)) return { ok: true, v: x };
    var M = molecule ? subs(molecule) : '';
    if (per > 1 && (hit(g / mm) || hit(g / cls))) {
      return { ok: false, kind: 'forgot-ratio', msg: 'That is mol ' + M + '. The mole ratio turns it into mol ' + atom + ': multiply by the ' + per +
        ' on top (' + per + ' mol ' + atom + ' / 1 mol ' + M + ').' };
    }
    if (per > 1 && (hit(g / mm / per) || hit(g / cls / per))) {
      return { ok: false, kind: 'divided-ratio', msg: 'The ' + per + ' is on top of the mole ratio: multiply by it, do not divide.' };
    }
    if (rel(x, g * mm * per) <= 0.02) {
      return { ok: false, kind: 'multiplied', msg: 'The molar mass is on the bottom of the fraction, so divide by it. Multiply across the top, divide by the bottom.' };
    }
    if (rel(x, mm / g * per) <= 0.02 || rel(x, mm / g) <= 0.02) {
      return { ok: false, kind: 'upside-down', msg: 'Upside down: the grams go on top and the molar mass on the bottom, so g cancels and mol is left.' };
    }
    if (rel(x, g) <= 0.005) return { ok: false, kind: 'grams', msg: 'Those are still grams. Multiply across the top and divide by the bottom to get moles.' };
    if (atom && !molecule && DIATOMIC[atom] && rel(x, g / (2 * mm)) <= 0.02) {
      return { ok: false, kind: 'diatomic', msg: 'You divided by the mass of ' + atom + '₂. Each ' + atom + ' atom counts here: use ' + mm + ' g/mol.' };
    }
    if (x !== 0) {
      var k = Math.round(Math.log10(Math.abs(x / a)));
      if (k !== 0 && rel(x / Math.pow(10, k), a) <= 0.02) return { ok: false, kind: 'power', msg: 'The digits are right but the decimal point is not. Check where the decimal point goes.' };
    }
    if (rel(x, a) <= 3 * TOL) return { ok: false, kind: 'close', msg: 'Close: work the setup again, without rounding before the end.' };
    return { ok: false, kind: 'wrong', msg: 'Multiply across the top and divide by the bottom: ' + g + (per > 1 ? ' × ' + per : '') + ' ÷ the molar mass.' };
  }

  /* Combustion: the mole ratio, atoms of C or H in one molecule of CO2 or H2O. */
  function judgePer(raw, atom, molecule) {
    var r = readNum(raw, 'how many ' + atom + ' atoms are in one ' + subs(molecule));
    if (r.empty || r.fmt) return { ok: false, empty: r.empty, fmt: r.fmt, msg: r.msg };
    var want = info(molecule).counts[atom];
    if (r.v === want) return { ok: true, v: want };
    if (atom === 'H' && r.v === 1) return { ok: false, kind: 'forgot-2', msg: 'Look at the formula: H₂O has 2 H atoms, so every mol of H₂O holds 2 mol of H.' };
    if (atom === 'C' && r.v === 2) return { ok: false, kind: 'the-O', msg: 'The 2 in CO₂ belongs to the O. One CO₂ holds 1 C atom.' };
    return { ok: false, kind: 'wrong', msg: 'Count the ' + atom + ' atoms in one ' + subs(molecule) + '.' };
  }
  /* Step 3: which row is the smallest? (two within 0.5% are both fine) */
  function smallestOK(moles, i) {
    var m = Math.min.apply(null, moles);
    return moles[i] <= m * 1.005 + 1e-12;
  }
  /* Step 3: a quotient. own: this row's moles over the chosen divisor, from
     the student's own moles; cls: the same from the class's molar masses. */
  function judgeQuotient(raw, own, cls, ctx) {
    ctx = ctx || {};
    var r = readNum(raw, 'the quotient');
    if (r.empty || r.fmt) return { ok: false, empty: r.empty, fmt: r.fmt, msg: r.msg };
    var x = r.v, d = decimalsIn(r.str);
    var hit = function (want) { return near(x, want, QTOL) || rel(x, want) <= 0.01; };
    var two = function (want) { return near(x, roundTo(want, 2), 1e-9); };
    /* the right quotient rounded to fewer than 2 decimals (1.3 for 1.33) is too short, not wrong;
       1 for 1.00 or 2 for 2.00 is fine: the zeros need not be typed */
    if (d < 2 && !two(own) && !two(cls) && (near(x, roundTo(own, d), 1e-9) || near(x, roundTo(cls, d), 1e-9) || hit(own) || hit(cls))) {
      return { ok: false, fmt: true, msg: 'Keep two decimal places: one decimal place can hide the fraction (1.3 could be 1⅓ or 1¼, and 1 could be 1⅓).' };
    }
    if (hit(own) || hit(cls)) return { ok: true, v: x };
    if (ctx.big && hit(own * ctx.small / ctx.big)) {
      return { ok: false, kind: 'largest', msg: 'Divide by small: every mole value is divided by the smallest one, so the smallest row is 1.00 and every other row is more than 1.' };
    }
    if (own > 0 && hit(1 / own)) return { ok: false, kind: 'upside-down', msg: 'Upside down: each row’s moles go on top, the smallest moles on the bottom.' };
    if (ctx.mol != null && rel(x, ctx.mol) <= 0.01) return { ok: false, kind: 'not-divided', msg: 'Those are the moles. Divide them by the smallest moles.' };
    return { ok: false, kind: 'wrong', msg: 'This row’s moles ÷ the smallest moles.' };
  }

  /* Step 4: the multiplier and the whole numbers. qs: the student's
     quotients; subs: the right whole numbers; mult: the right multiplier. */
  function judgeMultiplier(raw, qs, mult) {
    var r = readNum(raw, 'the number to multiply by (1 if every value is already whole)');
    if (r.empty || r.fmt) return { ok: false, empty: r.empty, fmt: r.fmt, msg: r.msg };
    var k = r.v;
    if (k !== Math.round(k) || k < 1) return { ok: false, kind: 'not-integer', msg: 'Multiply by a whole number: 1 (already whole), 2, 3, 4 or 5.' };
    if (k === mult) return { ok: true, v: k };
    var notWhole = qs.filter(function (q) { return !fracOf(q).whole; });
    if (k === 1) {
      var q1 = notWhole[0];
      return { ok: false, kind: 'rounded', msg: fmtQ(q1) + ' is not within 0.1 of a whole number, so it cannot be rounded. Multiply if not whole: ' +
        'what fraction is .' + fmtQ(q1).split('.')[1] + '?' };
    }
    if (!allWhole(qs, k)) {
      var bad = qs.filter(function (q) { var v = q * k; return Math.abs(v - Math.round(v)) > WHOLE; })[0];
      return { ok: false, kind: 'still-not-whole', msg: fmtQ(bad) + ' × ' + k + ' = ' + fmtQ(bad * k) + ', still not whole. Read .' + fmtQ(bad).split('.')[1] +
        ' as a fraction: its bottom number is the one to multiply by.' };
    }
    if (mult === 1) return { ok: false, kind: 'already-whole', msg: 'Every value is already within 0.1 of a whole number: round them, multiply by 1.' };
    return { ok: false, kind: 'too-big', msg: 'Those all come out whole, but they could all be divided by ' + (k / mult) + '. Use the smallest number that works.' };
  }
  function judgeWhole(raw, q, k, want) {
    var r = readNum(raw, 'the whole number');
    if (r.empty || r.fmt) return { ok: false, empty: r.empty, fmt: r.fmt, msg: r.msg };
    var x = r.v;
    if (x === want) return { ok: true, v: x };
    if (near(x, q * k, 0.06) && Math.abs(x - want) < 0.5) return { ok: false, fmt: true, msg: 'Round ' + fmtQ(q * k) + ' to ' + want + ': a subscript is a whole number.' };
    if (k > 1 && (x === Math.round(q) || near(x, q, 0.02))) {
      return { ok: false, kind: 'not-multiplied', msg: fracOf(q).whole ? 'Multiply every row by ' + k + ', the whole ones too: ' + fmtQ(q) + ' × ' + k + '.' :
        'Do not round ' + fmtQ(q) + ': it is a fraction. Multiply it by ' + k + ' like every other row.' };
    }
    return { ok: false, kind: 'wrong', msg: fmtQ(q) + ' × ' + k + ' rounded to a whole number.' };
  }

  /* Molecular formula: n = molar mass / empirical formula mass. */
  function judgeN(raw, M, efm, want) {
    var r = readNum(raw, 'n');
    if (r.empty || r.fmt) return { ok: false, empty: r.empty, fmt: r.fmt, msg: r.msg };
    var x = r.v;
    if (x === want) return { ok: true, v: x };
    if (near(x, want, 0.08)) return { ok: false, fmt: true, msg: 'n is a whole number: round ' + r.str + ' to ' + want + '.' };
    if (efm > 0 && near(x, efm / M, 0.02)) return { ok: false, kind: 'upside-down', msg: 'Upside down: n = molar mass ÷ empirical formula mass, so n is 1 or more.' };
    return { ok: false, kind: 'wrong', msg: 'n = ' + M + ' ÷ the empirical formula mass, rounded to a whole number.' };
  }
  function judgeSub(raw, want, ef, n, sym) {
    var r = readNum(raw, 'the subscript of ' + sym);
    if (r.empty || r.fmt) return { ok: false, empty: r.empty, fmt: r.fmt, msg: r.msg };
    if (r.v === want) return { ok: true, v: r.v };
    if (r.v === ef + n && n > 1) return { ok: false, kind: 'added', msg: 'Multiply every subscript by n, do not add n.' };
    if (r.v === ef && n > 1) return { ok: false, kind: 'not-multiplied', msg: 'Multiply every subscript of the empirical formula by n = ' + n + ', ' + sym + ' too.' };
    return { ok: false, kind: 'wrong', msg: 'The subscript of ' + sym + ' in the empirical formula × n.' };
  }

  /* ------------------------------------------------------------ LaTeX */

  function texText(str) {
    return ('\\text{' + String(str).replace(/(\d+)/g, '}_{$1}\\text{') + '}').replace(/\\text\{\}/g, '');
  }
  /* a unit with a formula: g CO2, mol H */
  function texU(unit, f) { return texText(unit + ' ' + f); }
  function texX(s) { return '\\cancel{' + s + '}'; }

  return {
    TOL: TOL, TOL_TEXT: TOL_TEXT, WHOLE: WHOLE, QTOL: QTOL, TIMES: TIMES, FRACS: FRACS, DENS: DENS, UNI: UNI,
    sup: sup, subs: subs, scaled: scaled, tenthsText: tenthsText, roundSig: roundSig, roundTo: roundTo,
    sigFigsIn: sigFigsIn, decimalsIn: decimalsIn, parseNum: parseNum, fmtSig: fmtSig, fmtDec: fmtDec, fmtMol: fmtMol, fmtQ: fmtQ,
    el: el, t10: t10, alt10: alt10, tableMass: tableMass, radioactive: radioactive, stdMass: stdMass, DIATOMIC: DIATOMIC,
    parse: parse, countAtoms: countAtoms, info: info, disp: disp, hasText: hasText, formulaOf: formulaOf,
    hydrateText: hydrateText, hydrateDisp: hydrateDisp, gcd: gcd, lcm: lcm, empirical: empirical,
    mm10: mm10, mmText: mmText, mmValue: mmValue, mmStd: mmStd, mmAccepted: mmAccepted, mmWork: mmWork, mmSlips: mmSlips, judgeMM: judgeMM,
    fracOf: fracOf, multiplierFor: multiplierFor, wholeAfter: wholeAfter, allWhole: allWhole,
    judgeGrams: judgeGrams, judgeMoles: judgeMoles, judgePer: judgePer,
    smallestOK: smallestOK, judgeQuotient: judgeQuotient, judgeMultiplier: judgeMultiplier, judgeWhole: judgeWhole,
    judgeN: judgeN, judgeSub: judgeSub,
    texText: texText, texU: texU, texX: texX
  };
})();

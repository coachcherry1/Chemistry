/* chem.js: the model. Formulas, molar masses to the tenths place, the roads
 * of the mole map (the equalities), unit cancelling, the judging of every
 * typed blank and answer, and the LaTeX of every worked solution. Nothing
 * here touches the page, so tools/validate.js runs all of it in node.
 *
 * The class's rules, as the teacher set them:
 * - Molar masses to the tenths place. The atomic masses on screen are rounded
 *   to tenths and added up (CCl4 = 12.0 + 4(35.5) = 154.0). A molar mass
 *   worked from the full masses and rounded at the end (153.8) is accepted
 *   too, and so is the tenths value of a two-decimal table (Fe 55.85 gives
 *   55.9, where the full 55.845 gives 55.8). The answer is then checked
 *   against the molar mass the student typed.
 * - 22.4 L = 1 mol for a gas at STP, 6.02 x 10^23 particles = 1 mol (the
 *   class rounds Avogadro's number to 6.02), and the ratio from the formula
 *   (1 mol SBr2 = 2 mol Br).
 * - In the molarity version, the molarity in the prompt (0.350 mol/L) is the
 *   equality 1 L solution = 0.350 mol, and 1000 mL = 1 L. Volumes are "L of
 *   gas" or "L of solution", never just L.
 * - Answers within 1.5% (TOL) of the right one count, rounding allowed for,
 *   and so does a molar mass within 1.5% written to tenths: periodic tables
 *   differ. tools/tables.js plays five tables (two decimals, full masses, H
 *   1.008, whole numbers with Cl 35.5 or 35) through the judges; at 1% the
 *   two-decimal table (H 1.01) and whole numbers (Mg 24, Cl 35) were refused.
 *   Significant figures still have to be right.
 * - Every equality counts as exact: the given quantity alone decides the
 *   significant figures. A molarity is a measurement too, so it is always
 *   given with the same number of significant figures as the volume.
 */
var Chem = (function () {
  'use strict';

  var AV = 6.02e23;
  var STP = 22.4;
  /* The class's tolerance: a molar mass or an answer within 1.5% of the
     class's own value counts, so a student working from a periodic table with
     other masses (Cl 35.45, H 1.008 or 1.01, Mg 24) is not marked wrong. One
     number to change; every message reads it (TOL_TEXT). */
  var TOL = 0.015;
  var TOL_TEXT = String(Math.round(TOL * 1000) / 10) + '%';

  /* ------------------------------------------------------------ numbers */

  var SUPS = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
               '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  var SUP_BACK = {};
  Object.keys(SUPS).forEach(function (k) { SUP_BACK[SUPS[k]] = k; });
  function sup(n) { return String(n).split('').map(function (c) { return SUPS[c] || c; }).join(''); }
  var SUBS = '₀₁₂₃₄₅₆₇₈₉';
  function subs(f) { return f.replace(/\d/g, function (d) { return SUBS[+d]; }); }

  var TIMES = '×';
  var AV_TEXT = '6.02 ' + TIMES + ' 10' + sup(23);

  /* A decimal string scaled to an integer number of 10^-dp units, rounded half
     up: scaled('55.845', 1) is 558 (55.8), scaled('55.85', 1) is 559. Exact,
     because no binary fraction is ever formed. */
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

  /* Significant figures a typed answer shows. Trailing zeros count only with a
     decimal point: 4.50 is 3, a bare 450 is 2. */
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

  /* Accepts 12500, 1.25e4, 1.25 x 10^4, 1.25 × 10^4, 1.25 × 10⁴, 12,500. A superscript
     power turns back into plain digits right after the 10, so the same rule
     reads all of them. */
  function parseNum(str) {
    if (str == null) return NaN;
    var s = String(str).trim().toLowerCase();
    /* digits split by a space (5.86 10 22) are not one number */
    if (/\d\s+\d/.test(s)) return NaN;
    s = s.replace(/,/g, '').replace(/\s+/g, '').replace(/[\u2212\u2013]/g, '-');
    if (!s) return NaN;
    s = s.replace(/[\u2070\u00B9\u00B2\u00B3\u2074-\u2079\u207B]/g, function (c) { return SUP_BACK[c]; });
    s = s.replace(/(\u00D7|x|\*)10\^?/g, 'e').replace(/e\+/, 'e');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e-?\d+)?$/.test(s)) return NaN;
    return parseFloat(s);
  }

  /* Exactly sig significant figures, in scientific notation whenever plain
     decimals would hide trailing zeros or the number is very big or small. */
  function fmtSig(v, sig, ascii) {
    if (!isFinite(v)) return '?';
    if (v === 0) return '0';
    var r = roundSig(v, sig);
    var exp = Math.floor(Math.log10(Math.abs(r)) + 1e-12);
    var sci = function () {
      var mant = (r / Math.pow(10, exp)).toFixed(sig - 1);
      return ascii ? mant + 'e' + exp : mant + ' ' + TIMES + ' 10' + sup(exp);
    };
    if (exp >= sig || exp < -3) return sci();
    var decimals = Math.max(0, sig - 1 - exp);
    var s = r.toFixed(decimals);
    return (decimals === 0 && /0$/.test(s)) ? sci() : s;
  }

  /* The exact (unrounded) product, shown before rounding in worked solutions. */
  function fmtLong(v) {
    if (!isFinite(v)) return '?';
    var a = Math.abs(v);
    if (a >= 1e6 || a < 1e-3) {
      var e = Math.floor(Math.log10(a) + 1e-12);
      return String(Number((v / Math.pow(10, e)).toFixed(5))) + ' ' + TIMES + ' 10' + sup(e);
    }
    return String(Number(v.toPrecision(7)));
  }

  /* --------------------------------------------------------- elements */

  function el(sym) {
    var e = ELEMENTS[sym];
    if (!e) throw new Error('no element ' + sym);
    return e;
  }
  function radioactive(sym) { return /^\(/.test(el(sym).std); }
  /* the tenths value on screen */
  function t10(sym) { return scaled(el(sym).std, 1); }
  /* the tenths value of a two-decimal table, when it differs (Fe 55.85 gives 55.9) */
  function alt10(sym) {
    var two = scaled(el(sym).std, 2);
    var a = scaled((two / 100).toFixed(2), 1);
    return a === t10(sym) ? null : a;
  }
  function tableMass(sym) { return radioactive(sym) ? el(sym).std : tenthsText(t10(sym)); }

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

  /* Atom counts. mode: 'normal'; 'nosubs' (every subscript read as 1);
     'nogroup' (the number after a bracket ignored); 'lastonly' (that number
     applied to the last atom in the bracket only). */
  function countAtoms(items, mode) {
    var counts = {}, order = [];
    function walk(list, mult) {
      list.forEach(function (it, k) {
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

  /* --------------------------------------------------------- species */

  var SP = {};
  function makeSpecies(f, kind, extra) {
    extra = extra || {};
    var items = parse(f);
    var c = countAtoms(items, 'normal');
    var only = c.order.length === 1 ? c.order[0] : null;
    return {
      key: f, f: f, disp: subs(f), kind: kind, gas: !!extra.gas, items: items, counts: c.counts, order: c.order,
      part: kind === 'ionic' ? null : (kind === 'element' ? 'atoms' : 'molecules'),
      compound: kind !== 'element',
      /* an element (or diatomic element) is named after the element */
      name: extra.name || (only ? el(only).name : f),
      aq: !!extra.aq, maxM: extra.maxM || 0
    };
  }
  SUBSTANCES.forEach(function (s) { SP[s.f] = makeSpecies(s.f, s.kind, s); });

  /* A substance, or an element counted inside one (O in CO2: atoms O, never a gas here). */
  function sp(key) {
    if (SP[key]) return SP[key];
    if (ELEMENTS[key]) return (SP[key] = makeSpecies(key, 'element'));
    throw new Error('no substance ' + key);
  }
  function disp(key) { return sp(key).disp; }
  function nameOf(key) { return sp(key).name; }

  /* "1 S and 2 Br" */
  function hasText(key) {
    var s = sp(key);
    var parts = s.order.map(function (x) { return s.counts[x] + ' ' + x; });
    return parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  }

  /* ------------------------------------------------------- molar mass */

  function sumTenths(counts) {
    return Object.keys(counts).reduce(function (s, x) { return s + counts[x] * t10(x); }, 0);
  }
  /* what the on-screen table gives: tenths added up */
  function mm10(key) { return sumTenths(sp(key).counts); }
  function mmText(key) { return tenthsText(mm10(key)); }
  function mmValue(key) { return mm10(key) / 10; }

  /* Every molar mass the class can defend, in tenths. */
  function mmAccepted(key) {
    var s = sp(key), out = {};
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

  /* "32.1 + 2(79.9) = 191.9" */
  function mmWork(key) {
    var s = sp(key);
    var terms = s.order.map(function (x) {
      var m = tenthsText(t10(x));
      return s.counts[x] === 1 ? m : s.counts[x] + '(' + m + ')';
    });
    return terms.length === 1 && s.counts[s.order[0]] === 1 ? mmText(key) : terms.join(' + ') + ' = ' + mmText(key);
  }

  /* Wrong molar masses a student is likely to type, each with what went
     wrong. A slip that lands on an accepted value is dropped. */
  function mmSlips(key) {
    var s = sp(key);
    var acc = mmAccepted(key);
    var out = [];
    var hasGroup = s.items.some(function (it) { return it.group && it.n > 1; });
    function push(v10, kind, msg) {
      if (acc.some(function (a) { return Math.abs(a - v10) < 1.5; })) return;
      if (out.some(function (o) { return o.v10 === v10; })) return;
      out.push({ v10: v10, kind: kind, msg: msg });
    }
    if (hasGroup) {
      var g = s.items.filter(function (it) { return it.group && it.n > 1; })[0];
      var msgG = 'The ' + g.n + ' after the brackets multiplies every atom inside them. ' + s.disp + ' has ' + hasText(key) + '.';
      push(sumTenths(countAtoms(s.items, 'nogroup').counts), 'brackets', msgG);
      push(sumTenths(countAtoms(s.items, 'lastonly').counts), 'brackets', msgG);
    }
    push(sumTenths(countAtoms(s.items, 'nosubs').counts), 'subscripts',
      'Count every atom: a subscript tells how many of the atom just before it. ' + s.disp + ' has ' + hasText(key) + '.');
    var z = s.order.reduce(function (t, x) { return t + s.counts[x] * el(x).z; }, 0);
    push(z * 10, 'atomic-number', 'Those look like atomic numbers. Use the atomic masses from the periodic table.');
    if (s.order.length > 1) {
      s.order.forEach(function (x) {
        push(mm10(key) - s.counts[x] * t10(x), 'left-out',
          'Did you leave out the ' + x + '? Every atom in ' + s.disp + ' adds its mass: ' + hasText(key) + '.');
      });
    }
    if (s.compound) s.order.forEach(function (x) {
      var n = s.counts[x];
      var line = 'Count the ' + x + ' atoms again. ' + s.disp + ' has ' + hasText(key) + '.';
      push(mm10(key) + t10(x), 'count', line);
      if (n > 1) push(mm10(key) - t10(x), 'count', line);
    });
    return out;
  }

  /* Judge a typed molar mass. */
  function judgeMM(key, raw) {
    var s = sp(key);
    var str = String(raw == null ? '' : raw).trim().replace(/\s*g\s*\/\s*mol\s*$/i, '').replace(/,/g, '');
    if (!str) return { ok: false, kind: 'empty', msg: 'Type the molar mass of ' + s.disp + ' in the blank, to the tenths place.' };
    if (!/^\d*\.?\d*$/.test(str) || str === '.') {
      return { ok: false, kind: 'unreadable', msg: 'Type the molar mass as a number to the tenths place, like 58.5.' };
    }
    var x = parseFloat(str);
    var x10 = x * 10;
    var acc = mmAccepted(key);
    var near = function (a, tol) { return Math.abs(x10 - a) <= tol; };
    var tenths = /^\d+\.\d$/.test(str);
    if (tenths && acc.some(function (a) { return near(a, 1e-6); })) return { ok: true, kind: 'ok', v: x };
    /* a slip is named even when it lands within TOL (a miscounted H in sucrose) */
    var slips = mmSlips(key);
    for (var i = 0; i < slips.length; i++) {
      if (near(slips[i].v10, 0.6)) return { ok: false, kind: slips[i].kind, msg: slips[i].msg };
    }
    var canon = mm10(key);
    var within = function (tol) { return Math.abs(x10 - canon) <= canon * tol + 1e-6; };
    if (tenths && within(TOL)) return { ok: true, kind: 'near', v: x };
    if (!tenths && (within(TOL) || acc.some(function (a) { return near(a, 5 - 1e-6); }))) {
      return { ok: false, kind: 'tenths',
        msg: 'Close: write it to the tenths place, with one digit after the decimal point. The class rounds every molar mass to tenths.' };
    }
    if (within(3 * TOL)) {
      return { ok: false, kind: 'close', msg: 'Close, but more than ' + TOL_TEXT + ' away. Use each atomic mass rounded to the tenths place, as the ' +
        'periodic table here shows it, then add them up: ' + s.disp + ' has ' + hasText(key) + '.' };
    }
    if (s.compound && s.order.some(function (e) { return near(t10(e), 0.6); })) {
      var e1 = s.order.filter(function (e) { return near(t10(e), 0.6); })[0];
      return { ok: false, kind: 'one-element', msg: 'That is the atomic mass of ' + e1 + ' alone. The molar mass of ' + s.disp +
        ' adds every atom in it: ' + hasText(key) + '.' };
    }
    return { ok: false, kind: 'wrong', msg: 'That is not the molar mass of ' + s.disp + '. Add the atomic mass of every atom, each ' +
      'rounded to the tenths place: ' + s.disp + ' has ' + hasText(key) + '.' };
  }

  /* ------------------------------------------------------------ ratio */

  function ratio(a, b) { return sp(a).counts[b] || 0; }

  function judgeRatio(a, b, raw) {
    var A = sp(a), want = ratio(a, b);
    var str = String(raw == null ? '' : raw).trim();
    if (!str) return { ok: false, kind: 'empty', msg: 'Type how many mol ' + b + ' are in 1 mol ' + A.disp + ': read it from the formula.' };
    var x = parseNum(str);
    if (isNaN(x)) return { ok: false, kind: 'unreadable', msg: 'Type a whole number: how many ' + b + ' atoms are in one ' + A.disp + '.' };
    if (x === want) return { ok: true, kind: 'ok', v: x };
    if (Math.round(x) !== x) {
      return { ok: false, kind: 'fraction', msg: 'The equality reads 1 mol ' + A.disp + ' = ___ mol ' + b + '. One ' + A.disp +
        ' holds a whole number of ' + b + ' atoms, so the blank is a whole number.' };
    }
    var groupCount = countAtoms(A.items, 'nogroup').counts[b];
    if (groupCount !== want && x === groupCount) {
      return { ok: false, kind: 'brackets', msg: 'The number after the brackets multiplies every atom inside them. Count the ' + b +
        ' atoms in ' + A.disp + ' again.' };
    }
    var other = A.order.filter(function (e) { return e !== b && A.counts[e] === x && A.counts[e] !== want; })[0];
    if (other) {
      return { ok: false, kind: 'other-element', msg: 'That is the number of ' + other + ' atoms in one ' + A.disp + '. This ratio is about ' +
        b + '.' };
    }
    var total = A.order.reduce(function (t, e) { return t + A.counts[e]; }, 0);
    if (x === total) return { ok: false, kind: 'total', msg: 'That counts every atom in ' + A.disp + '. Count only the ' + b + ' atoms.' };
    return { ok: false, kind: 'wrong', msg: 'Count the ' + b + ' atoms in one ' + A.disp + ': the subscript after ' + b +
      ', times any number after brackets around it.' };
  }

  /* -------------------------------------------------------- the roads */

  /* A unit is a node of the mole map for one substance: 'g|SBr2', 'mol|Br'.
     Nodes: g, mol, part (atoms or molecules), L (L of gas), Lsol (L of
     solution) and mLsol (mL of solution). */
  function tok(node, key) { return node + '|' + key; }
  function untok(t) { var i = t.indexOf('|'); return { node: t.slice(0, i), key: t.slice(i + 1) }; }
  function unitWord(node, key) {
    return node === 'part' ? sp(key).part : node === 'Lsol' ? 'L' : node === 'mLsol' ? 'mL' : node;
  }
  /* what follows the formula: L He gas, L KCl solution */
  function unitTail(node) { return node === 'L' ? ' gas' : node === 'Lsol' || node === 'mLsol' ? ' solution' : ''; }
  function unitText(t) { var u = untok(t); return unitWord(u.node, u.key) + ' ' + disp(u.key) + unitTail(u.node); }

  /* One equality per road, written the way the map writes it, left side first:
       mm     ___ g X = 1 mol X              (the blank: the molar mass)
       av     6.02 x 10^23 atoms X = 1 mol X
       stp    22.4 L X gas = 1 mol X         (gases at STP only)
       ratio  1 mol A = ___ mol B            (the blank: the count from the formula)
       sol    1 L X solution = 0.350 mol X   (the molarity, printed from the prompt;
                                              the id carries it: sol:KCl:0.350)
       ml     1000 mL X solution = 1 L X solution */
  function edge(id) {
    var p = id.split(':'), type = p[0];
    if (type === 'ratio') {
      return { id: id, type: type, a: p[1], b: p[2],
        L: { t: tok('mol', p[1]), v: 1 }, R: { t: tok('mol', p[2]), v: ratio(p[1], p[2]), blank: 'ratio' } };
    }
    var key = p[1];
    if (type === 'mm') return { id: id, type: type, s: key, L: { t: tok('g', key), v: mmValue(key), blank: 'mm' }, R: { t: tok('mol', key), v: 1 } };
    if (type === 'av') return { id: id, type: type, s: key, L: { t: tok('part', key), v: AV }, R: { t: tok('mol', key), v: 1 } };
    if (type === 'stp') return { id: id, type: type, s: key, L: { t: tok('L', key), v: STP }, R: { t: tok('mol', key), v: 1 } };
    if (type === 'sol') {
      return { id: id, type: type, s: key, M: p[2],
        L: { t: tok('Lsol', key), v: 1 }, R: { t: tok('mol', key), v: parseFloat(p[2]), text: p[2] } };
    }
    if (type === 'ml') return { id: id, type: type, s: key, L: { t: tok('mLsol', key), v: 1000 }, R: { t: tok('Lsol', key), v: 1 } };
    throw new Error('no road ' + id);
  }
  function edgesOf(key) {
    var s = sp(key), out = ['mm:' + key];
    if (s.part) out.push('av:' + key);
    if (s.gas) out.push('stp:' + key);
    return out;
  }
  function ratiosOf(key) {
    var s = sp(key);
    return s.compound ? s.order.map(function (b) { return 'ratio:' + key + ':' + b; }) : [];
  }
  function valueText(v, side) {
    if (side && side.text) return side.text;
    if (v === AV) return AV_TEXT;
    return String(v);
  }
  /* what is written on one side of an equality; blank shows as ___ */
  function sideText(side, blankText) {
    var v = side.blank ? (blankText != null ? blankText : '___') : valueText(side.v, side);
    return v + ' ' + unitText(side.t);
  }
  function edgeText(id, blanks) {
    var e = edge(id);
    return sideText(e.L, blanks && blanks.L) + ' = ' + sideText(e.R, blanks && blanks.R);
  }
  /* the road name, for hints and the map */
  var ROAD_NAME = { mm: 'molar mass', av: 'Avogadro’s number', stp: '22.4 L of gas', ratio: 'ratio',
                    sol: 'molarity (mol/L)', ml: '1000 mL = 1 L' };

  /* A factor in a chain: {e: edge id, f: 0 or 1}. f 0 puts the left side of
     the equality on top, as the student first places it. */
  function top(tile) { var e = edge(tile.e); return tile.f ? e.R : e.L; }
  function bottom(tile) { var e = edge(tile.e); return tile.f ? e.L : e.R; }

  /* Diagonal cancelling over the whole chain. Units of different substances
     never cancel: mol SBr2 and mol Br are not the same unit. */
  function cancel(startTok, tiles) {
    var nums = [{ cell: 0, t: startTok, x: false }], dens = [];
    tiles.forEach(function (tl, i) {
      nums.push({ cell: i + 1, t: top(tl).t, x: false });
      dens.push({ cell: i + 1, t: bottom(tl).t, x: false });
    });
    nums.forEach(function (n) {
      var d = dens.filter(function (d) { return !d.x && d.t === n.t; })[0];
      if (d) { d.x = true; n.x = true; }
    });
    var struck = {};
    nums.forEach(function (n) { if (n.x) struck[n.cell + ':top'] = 1; });
    dens.forEach(function (d) { if (d.x) struck[d.cell + ':bottom'] = 1; });
    return {
      struck: struck,
      top: nums.filter(function (n) { return !n.x; }).map(function (n) { return n.t; }),
      bottom: dens.filter(function (d) { return !d.x; }).map(function (d) { return d.t; })
    };
  }
  function unitsReach(an, targetTok) { return an.top.length === 1 && an.top[0] === targetTok && an.bottom.length === 0; }
  function leftText(an) {
    if (!an.top.length && !an.bottom.length) return 'no units';
    var t = an.top.map(unitText).join(' · ') || '1';
    return an.bottom.length ? t + ' / ' + an.bottom.map(unitText).join(' · ') : t;
  }

  /* The value of a chain. values: edge id to the number the student typed
     in its blank (accepted), or the model's own when left out. */
  function chainValue(start, tiles, values) {
    var v = start;
    tiles.forEach(function (tl) {
      var e = edge(tl.e);
      var side = function (s) { return s.blank && values && values[tl.e] != null ? values[tl.e] : s.v; };
      var t = tl.f ? side(e.R) : side(e.L), b = tl.f ? side(e.L) : side(e.R);
      v = v * t / b;
    });
    return v;
  }

  /* Shortest chain of factors from one unit to another, over these roads. */
  function route(fromTok, toTok, ids) {
    var seen = {}; seen[fromTok] = [];
    var queue = [fromTok];
    while (queue.length) {
      var cur = queue.shift();
      if (cur === toTok) return seen[cur];
      ids.forEach(function (id) {
        var e = edge(id), next = null, tile = null;
        if (e.R.t === cur) { next = e.L.t; tile = { e: id, f: 0 }; }
        else if (e.L.t === cur) { next = e.R.t; tile = { e: id, f: 1 }; }
        if (next && !(next in seen)) { seen[next] = seen[cur].concat([tile]); queue.push(next); }
      });
    }
    return null;
  }

  /* ---------------------------------------------------- the answer */

  /* raw: what the student typed; exact: the chain's value with their molar
     masses; sig: the given quantity's significant figures. */
  /* Could this rounded answer come from a value within TOL of the exact one?
     The typed number stands for everything that rounds to it at the figures
     it shows (2.5 is 2.45 to 2.55), so a right answer whose last digit tips
     the other way still counts. */
  function withinTol(val, digits, exact) {
    if (!(digits > 0) || val === 0 || exact === 0 || (val < 0) !== (exact < 0)) return false;
    var a = Math.abs(val), x = Math.abs(exact);
    var e = Math.floor(Math.log10(a) + 1e-12);
    var half = 0.5 * Math.pow(10, e - digits + 1);
    var eps = x * 1e-9;
    return a + half >= x * (1 - TOL) - eps && a - half <= x * (1 + TOL) + eps;
  }

  /* raw: what the student typed; exact: the chain's value with their molar
     masses; sig: the significant figures the answer must show; info.also:
     the chain's value with the class's molar masses. An answer within TOL of
     either counts: a student may type a molar mass rounded to tenths but keep
     their own table's masses in the calculator. */
  function judgeAnswer(raw, exact, sig, info) {
    info = info || {};
    var val = parseNum(raw);
    if (isNaN(val)) return { ok: false, kind: 'unreadable' };
    var given = sigFigsIn(raw);
    var rel = function (a) { return Math.abs(a - exact) / Math.abs(exact || 1); };
    if (withinTol(val, given, exact) || (info.also != null && withinTol(val, given, info.also))) {
      if (given === sig) return { ok: true, kind: rel(val) <= Math.abs(roundSig(exact, sig) - exact) / Math.abs(exact) + 1e-9 ? 'ok' : 'near' };
      return { ok: false, kind: 'sigfigs', given: given };
    }
    if (rel(val) <= 3 * TOL) return { ok: false, kind: 'close' };
    if (val !== 0 && Math.abs(1 / val - exact) / Math.abs(exact) <= 0.02) return { ok: false, kind: 'reciprocal' };
    if (info.ratio > 1 && (rel(val * info.ratio) <= 0.02 || rel(val / info.ratio) <= 0.02)) return { ok: false, kind: 'ratio' };
    if (val !== 0) {
      var k = Math.round(Math.log10(Math.abs(val / exact)));
      if (k !== 0 && rel(val / Math.pow(10, k)) <= 0.02) return { ok: false, kind: 'power', k: k };
    }
    return { ok: false, kind: 'arithmetic' };
  }

  /* ------------------------------------------------------------ LaTeX */

  /* Text with formula digits as subscripts: "g Mg(NO3)2 solution" becomes
     \text{g Mg(NO}_{3}\text{)}_{2}\text{ solution}. Units have no other digits. */
  function texText(str) {
    return ('\\text{' + str.replace(/(\d+)/g, '}_{$1}\\text{') + '}').replace(/\\text\{\}/g, '');
  }
  function texFormula(f) { return texText(f); }
  function texUnit(t) {
    var u = untok(t);
    return texText(unitWord(u.node, u.key) + ' ' + u.key + unitTail(u.node));
  }
  /* "5.862 × 10²²" to 5.862 \times 10^{22} */
  function texNum(str) {
    return String(str).replace(/\s*\u00D7\s*10([\u2070\u00B9\u00B2\u00B3\u2074-\u2079\u207B]+)/, function (m, e) {
      return ' \\times 10^{' + e.split('').map(function (c) { return SUP_BACK[c]; }).join('') + '}';
    });
  }
  /* The worked chain: the given quantity times each factor as a fraction,
     cancelled units struck through (opts.cancel false leaves them plain),
     then "= answer". vals: typed blank values by edge id. */
  function texChain(given, fromTok, tiles, vals, opts) {
    opts = opts || {};
    var an = cancel(fromTok, tiles);
    var unit = function (k, t) { var u = texUnit(t); return opts.cancel !== false && an.struck[k] ? '\\cancel{' + u + '}' : u; };
    var parts = [texNum(given) + '\\ ' + unit('0:top', fromTok)];
    tiles.forEach(function (tl, i) {
      var e = edge(tl.e), T = top(tl), B = bottom(tl);
      var num = function (sd) {
        if (!sd.blank) return texNum(valueText(sd.v, sd));
        var v = vals && vals[tl.e] != null ? vals[tl.e] : sd.v;
        return e.type === 'mm' ? Number(v).toFixed(1) : String(v);
      };
      parts.push('\\frac{' + num(T) + '\\ ' + unit((i + 1) + ':top', T.t) + '}{' + num(B) + '\\ ' + unit((i + 1) + ':bottom', B.t) + '}');
    });
    return parts.join(' \\times ') + (opts.answer != null ? ' = ' + texNum(opts.answer) + '\\ ' + texUnit(opts.toTok) : '');
  }
  /* \text{molar mass of SBr}_{2} = 32.1 + 2(79.9) = 191.9\ \text{g/mol} */
  function texMM(key) {
    var single = sp(key).order.length === 1 && sp(key).counts[sp(key).order[0]] === 1;
    return texText('molar mass of ' + key) + ' = ' + (single ? '' : mmWork(key).replace(/ = .*$/, '') + ' = ') + mmText(key) +
      '\\ \\text{g/mol}';
  }

  return {
    AV: AV, AV_TEXT: AV_TEXT, STP: STP, TIMES: TIMES, TOL: TOL, TOL_TEXT: TOL_TEXT, withinTol: withinTol,
    sup: sup, subs: subs, scaled: scaled, tenthsText: tenthsText,
    roundSig: roundSig, sigFigsIn: sigFigsIn, parseNum: parseNum, fmtSig: fmtSig, fmtLong: fmtLong,
    el: el, t10: t10, alt10: alt10, tableMass: tableMass, radioactive: radioactive,
    parse: parse, countAtoms: countAtoms, sp: sp, disp: disp, nameOf: nameOf, hasText: hasText,
    mm10: mm10, mmText: mmText, mmValue: mmValue, mmAccepted: mmAccepted, mmWork: mmWork, mmSlips: mmSlips, judgeMM: judgeMM,
    ratio: ratio, judgeRatio: judgeRatio,
    tok: tok, untok: untok, unitWord: unitWord, unitTail: unitTail, unitText: unitText,
    texText: texText, texFormula: texFormula, texUnit: texUnit, texNum: texNum, texChain: texChain, texMM: texMM,
    edge: edge, edgesOf: edgesOf, ratiosOf: ratiosOf, edgeText: edgeText, sideText: sideText, valueText: valueText,
    ROAD_NAME: ROAD_NAME, top: top, bottom: bottom,
    cancel: cancel, unitsReach: unitsReach, leftText: leftText, chainValue: chainValue, route: route,
    judgeAnswer: judgeAnswer
  };
})();

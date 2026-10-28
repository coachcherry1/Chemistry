/* chem.js — compounds, formatting, and answer checking. No DOM.
 *
 * A compound is { c: cation, a: anion, q: cation charge, m, n, code } where m
 * and n are the subscripts in lowest terms. Every formula string is plain
 * ASCII ("Fe2(SO4)3"); uni() turns it into display text with subscripts.
 *
 * checkName() and checkFormula() are shared by the tile builders and the typed
 * answers: a builder composes a string and hands it here, so a wrong tile gets
 * exactly the same explanation as the same mistake typed.
 */

var Chem = (function () {
  'use strict';

  var ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  var SUB = '₀₁₂₃₄₅₆₇₈₉';
  var SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  var CHARGE_RE = /[+\-−–^⁺⁻¹²³⁰-⁹]/;

  var CAT = {}, AN = {}, CAT_BY_NAME = {}, AN_BY_NAME = {}, EL_BY_NAME = {};
  DATA.CATIONS.forEach(function (c) { CAT[c.t] = c; CAT_BY_NAME[c.name] = c; });
  DATA.ANIONS.forEach(function (a) { AN[a.t] = a; AN_BY_NAME[a.name] = a; });
  Object.keys(DATA.ELEMENT_NAMES).forEach(function (s) { EL_BY_NAME[DATA.ELEMENT_NAMES[s]] = s; });
  var NAME_WORDS = Object.keys(CAT_BY_NAME).concat(Object.keys(AN_BY_NAME)).concat(Object.keys(EL_BY_NAME));

  /* ------------------------------------------------------------ formatting */

  function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }

  function uni(text) {
    return String(text).replace(/\d/g, function (d) { return SUB[+d]; });
  }

  function sup(n, sign) {
    var digits = n > 1 ? String(n).split('').map(function (d) { return SUP[+d]; }).join('') : '';
    return digits + sign;
  }

  function catIon(c, q) { return uni(c.t) + sup(q, '⁺'); }
  function anIon(a) { return uni(a.t) + sup(a.charge, '⁻'); }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function block(text, count, paren) {
    return (paren ? '(' + text + ')' : text) + (count > 1 ? count : '');
  }

  /* ------------------------------------------------------------ compounds */

  function make(catT, q, anT) {
    var c = CAT[catT], a = AN[anT];
    if (!c || !a || c.charges.indexOf(q) < 0 || !DATA.allowed(c, a)) return null;
    var g = gcd(q, a.charge);
    return { c: c, a: a, q: q, m: a.charge / g, n: q / g, code: catT + q + '.' + anT };
  }

  function fromCode(code) {
    var p = /^(NH4|[A-Z][a-z]?)(\d)\.([A-Za-z0-9]+)$/.exec(code || '');
    return p ? make(p[1], +p[2], p[3]) : null;
  }

  function formula(cpd, alt) {
    var at = alt && cpd.a.alt ? cpd.a.alt : cpd.a.t;
    return block(cpd.c.t, cpd.m, cpd.c.poly && cpd.m > 1) +
           block(at, cpd.n, cpd.a.poly && cpd.n > 1);
  }

  function accepted(cpd) {
    var list = [formula(cpd)];
    if (cpd.a.alt) list.push(formula(cpd, true));
    return list;
  }

  function name(cpd) {
    return cpd.c.name + (cpd.c.tm ? '(' + ROMAN[cpd.q] + ')' : '') + ' ' + cpd.a.name;
  }

  function all() {
    var out = [];
    DATA.CATIONS.forEach(function (c) {
      c.charges.forEach(function (q) {
        DATA.ANIONS.forEach(function (a) {
          var cpd = make(c.t, q, a.t);
          if (cpd) out.push(cpd);
        });
      });
    });
    return out;
  }

  /* Plain-language properties the level draws select on. */
  function traits(cpd) {
    return {
      tm: !!cpd.c.tm,
      binary: !cpd.c.poly && !cpd.a.poly,
      poly: !!(cpd.c.poly || cpd.a.poly),
      ammonium: cpd.c.t === 'NH4',
      parens: (cpd.c.poly && cpd.m > 1) || (cpd.a.poly && cpd.n > 1),
      /* the formula was reduced, so swapping subscripts back gives the wrong charge */
      reduced: gcd(cpd.q, cpd.a.charge) > 1,
      /* the classic TiO2 / PbO2 case: a 4+ metal over a 2- ion */
      fourOverTwo: cpd.q === 4 && cpd.a.charge === 2
    };
  }

  /* --------------------------------------------------------- atom counting */

  /* Flat element counts for a formula string, or null if unreadable. */
  function atoms(s) {
    var i = 0, out = {};
    function add(map, sym, k) { map[sym] = (map[sym] || 0) + k; }
    function num() {
      var d = '';
      while (i < s.length && /\d/.test(s[i])) d += s[i++];
      return d ? parseInt(d, 10) : 1;
    }
    while (i < s.length) {
      var ch = s[i];
      if (ch === '(') {
        i++;
        var inner = {};
        while (i < s.length && s[i] !== ')') {
          var m = /^[A-Z][a-z]?/.exec(s.slice(i));
          if (!m) return null;
          i += m[0].length;
          add(inner, m[0], num());
        }
        if (s[i] !== ')') return null;
        i++;
        var k = num();
        Object.keys(inner).forEach(function (sym) { add(out, sym, inner[sym] * k); });
      } else {
        var e = /^[A-Z][a-z]?/.exec(s.slice(i));
        if (!e) return null;
        i += e[0].length;
        add(out, e[0], num());
      }
    }
    return out;
  }

  function sameAtoms(x, y) {
    if (!x || !y) return false;
    var kx = Object.keys(x), ky = Object.keys(y);
    return kx.length === ky.length && kx.every(function (k) { return x[k] === y[k]; });
  }

  /* ------------------------------------------------------ formula checking */

  function normFormula(raw) {
    return String(raw || '')
      .replace(/[₀-₉]/g, function (d) { return String(SUB.indexOf(d)); })
      .replace(/\s+/g, '');
  }

  /* Split a formula into positive-ion and negative-ion blocks for a given pair
     of ion texts. Returns null if the string is not those two ions. */
  function blocks(s, cText, aText) {
    var re = new RegExp('^(?:\\((' + cText + ')\\)|(' + cText + '))(\\d*)' +
                        '(?:\\((' + aText + ')\\)|(' + aText + '))(\\d*)$');
    var p = re.exec(s);
    if (!p) return null;
    return {
      cParen: !!p[1], cDigits: p[3], cn: p[3] ? parseInt(p[3], 10) : 1,
      aParen: !!p[4], aDigits: p[6], an: p[6] ? parseInt(p[6], 10) : 1,
      aText: aText
    };
  }

  function yes() { return { ok: true, msg: '' }; }
  function no(msg) { return { ok: false, msg: msg }; }

  function parenMissing(text, k) {
    return 'To show more than one ' + uni(text) + ', wrap it in parentheses: (' + uni(text) + ')' +
           uni(String(k)) + '. Without them the ' + k + ' would multiply only the last atom.';
  }

  function judgeBlocks(cpd, b) {
    var c = cpd.c, a = cpd.a;
    if (b.cDigits === '1' || b.aDigits === '1') {
      return no('Leave out subscripts of 1 — no number already means one.');
    }
    if (b.cn === 0 || b.an === 0) return no('A subscript of 0 means none of that ion. Check your numbers.');
    if ((b.cParen && !c.poly) || (b.aParen && !a.poly)) {
      var single = b.aParen && !a.poly ? a.t : c.t;
      return no('Parentheses only go around polyatomic ions. ' + uni(single) +
                ' is a single atom, so it never needs them.');
    }
    var pos = b.cn * cpd.q, neg = b.an * a.charge;
    if (pos !== neg) {
      if (c.tm && b.cn === cpd.q && cpd.q !== cpd.m) {
        return no('The Roman numeral (' + ROMAN[cpd.q] + ') is the charge on each ' + c.t +
                  ' ion, not the number of ' + c.t + ' atoms. Use the charges ' +
                  catIon(c, cpd.q) + ' and ' + anIon(a) + ' to balance.');
      }
      return no('The charges don’t balance: ' + b.cn + ' × ' + catIon(c, cpd.q) + ' = ' + pos +
                '+, but ' + b.an + ' × ' + anIon(a) + ' = ' + neg +
                '−. Find the smallest numbers that make them equal.');
    }
    var g = gcd(b.cn, b.an);
    if (g > 1) {
      return no('The charges balance, but an ionic formula uses the lowest whole-number ratio. ' +
                'Divide both subscripts by ' + g + '.');
    }
    if (c.poly && b.cn > 1 && !b.cParen) return no(parenMissing(c.t, b.cn));
    if (a.poly && b.an > 1 && !b.aParen) return no(parenMissing(b.aText, b.an));
    if ((b.cParen && b.cn === 1) || (b.aParen && b.an === 1)) {
      return no('Parentheses only go around a polyatomic ion when there is more than one of it. ' +
                'With just one, leave them off.');
    }
    return no('Check the order and the numbers against your charges.');
  }

  function checkFormula(cpd, raw) {
    var c = cpd.c, a = cpd.a;
    var s = normFormula(raw);
    if (!s) return no('Enter a formula first.');
    if (CHARGE_RE.test(s)) {
      return no('Leave the charges out. A formula shows only symbols and subscripts — ' +
                'the charges are what you use to work out the subscripts.');
    }
    var ok = accepted(cpd);
    if (ok.indexOf(s) >= 0) return yes();
    var lower = s.toLowerCase();
    if (ok.some(function (x) { return x.toLowerCase() === lower; })) {
      return no('Check your capital letters. Every symbol starts with a capital and any second ' +
                'letter is lowercase — Co is cobalt, but CO would mean carbon and oxygen.');
    }
    /* A formula never has three lowercase letters in a row; a name does. */
    if (/[a-z]{3}/.test(s) && NAME_WORDS.some(function (w) { return lower.indexOf(w) >= 0; })) {
      return no('That looks like a name. Type the formula with element symbols and numbers, like Fe2O3.');
    }

    var aTexts = [a.t].concat(a.alt ? [a.alt] : []);
    for (var i = 0; i < aTexts.length; i++) {
      var b = blocks(s, c.t, aTexts[i]);
      if (b) return judgeBlocks(cpd, b);
    }

    for (var j = 0; j < aTexts.length; j++) {
      if (blocks(s, aTexts[j], c.t)) {
        return no('Write the positive ion first: ' + uni(c.t) + ' comes before ' + uni(a.t) + '.');
      }
    }

    if (sameAtoms(atoms(s), atoms(formula(cpd)))) {
      return no('You have the right atoms, but keep each polyatomic ion together as one unit, ' +
                'written the way it is on your list. Use parentheses and a subscript outside ' +
                'them to show more than one.');
    }

    for (var k = 0; k < DATA.CATIONS.length; k++) {
      var X = DATA.CATIONS[k];
      if (X === c) continue;
      for (var t = 0; t < aTexts.length; t++) {
        if (blocks(s, X.t, aTexts[t])) {
          return no(uni(X.t) + ' is ' + X.name + '. For ' + c.name + ' use ' + uni(c.t) + '.');
        }
      }
    }

    for (var y = 0; y < DATA.ANIONS.length; y++) {
      var Y = DATA.ANIONS[y];
      if (Y === a) continue;
      var yTexts = [Y.t].concat(Y.alt ? [Y.alt] : []);
      for (var z = 0; z < yTexts.length; z++) {
        if (!blocks(s, c.t, yTexts[z])) continue;
        if (a.t === 'O2' && Y.t === 'O') {
          return no('Peroxide is O₂²⁻ — one ion made of two oxygens. Keep the O₂ together; ' +
                    'never change the subscripts inside a polyatomic ion.');
        }
        return no(uni(Y.t) + ' is ' + Y.name + '. ' + cap(a.name) + ' is ' + anIon(a) + '.');
      }
    }

    if (!atoms(s)) {
      return no('That isn’t a readable formula. Use element symbols and numbers, like Fe2(SO4)3.');
    }
    return no('Check the symbols: ' + c.name + ' is ' + uni(c.t) + ' and ' + a.name + ' is ' +
              anIon(a) + '.');
  }

  /* --------------------------------------------------------- name checking */

  function normName(raw) {
    return String(raw || '').toLowerCase()
      .replace(/\s*\(\s*/g, '(')
      .replace(/\s*\)\s*/g, ') ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(function (w) { return DATA.SPELLING[w] || w; })
      .join(' ');
  }

  function romanValue(s) {
    var i = ROMAN.map(function (r) { return r.toLowerCase(); }).indexOf(String(s).toLowerCase());
    return i > 0 ? i : null;
  }

  function chargeHow(cpd) {
    var tot = cpd.n * cpd.a.charge;
    return 'The ' + (cpd.n > 1 ? cpd.n + ' ' : '') + uni(cpd.a.t) + ' carr' +
           (cpd.n > 1 ? 'y ' : 'ies ') + tot + '− in total, balanced by ' + cpd.m + ' ' + cpd.c.t + '.';
  }

  function checkName(cpd, raw) {
    var c = cpd.c, a = cpd.a, q = cpd.q;
    var s = normName(raw);
    if (!s) return no('Enter a name first.');
    if (s === normName(name(cpd))) return yes();
    /* A name never has a letter followed directly by a digit; a formula does. */
    if (/[a-z]\d/.test(s)) {
      return no('That looks like a formula. Type the compound’s name in words, like iron(III) oxide.');
    }

    var p =/^([a-z]+)\s*(?:\(([^)]*)\))?\s*(.*)$/.exec(s);
    if (!p) {
      return no('Write the positive ion’s name first, then the negative ion’s — ' +
                'with a Roman numeral in parentheses only if the metal needs one.');
    }
    var cw = p[1], num = p[2], rest = p[3].trim();

    if (num === undefined && /^(i{1,3}|iv|v|vi{1,3}|\d)\s/.test(rest)) {
      return no('Put the Roman numeral in parentheses right after the metal, like iron(III) oxide.');
    }

    if (cw !== c.name) {
      if (c.traps && c.traps.indexOf(cw) >= 0) {
        return no('Ammonia is NH₃, a neutral molecule. The ion NH₄⁺ is ammonium.');
      }
      var otherCat = CAT_BY_NAME[cw];
      var sym = otherCat ? otherCat.t : EL_BY_NAME[cw];
      if (sym) return no(cap(cw) + ' is ' + uni(sym) + '. The positive ion here is ' + uni(c.t) + '.');
      return no('Check the spelling of the positive ion — the name for ' + uni(c.t) + '.');
    }

    if (num !== undefined) num = num.trim();
    if (c.tm) {
      if (num === undefined || num === '') {
        return no(cap(c.name) + ' is a transition metal, so its name needs the metal’s charge ' +
                  'as a Roman numeral in parentheses: ' + c.name + '(?).');
      }
      if (/^\d+$/.test(num)) {
        return no('Write the charge as a Roman numeral' +
                  (ROMAN[+num] ? ': (' + ROMAN[+num] + '), not (' + num + ').' : '.'));
      }
      var v = romanValue(num);
      if (!v) return no('(' + num + ') isn’t a Roman numeral. Use I, II, III or IV.');
      if (v !== q) {
        if (v === cpd.m && cpd.m !== q) {
          return no('The Roman numeral is the charge on each ' + c.t + ', not the number of ' +
                    c.t + ' atoms. ' + chargeHow(cpd));
        }
        if (v === cpd.n && cpd.n !== q) {
          return no('Swapping the subscripts back doesn’t work here — this formula was reduced. ' +
                    chargeHow(cpd));
        }
        return no('Check the charge. ' + chargeHow(cpd));
      }
    } else if (num !== undefined) {
      return no(c.why + ' Leave the Roman numeral off.');
    }

    if (rest !== a.name) {
      if (!rest) return no('Add the name of the negative ion.');
      if (a.el && rest === a.el) {
        return no('A negative ion made from one element ends in -ide: ' + a.name + ', not ' + a.el + '.');
      }
      var Y = AN_BY_NAME[rest];
      if (Y) {
        if (a.t === 'O' && Y.t === 'O2') {
          return no('Peroxide is O₂²⁻. A single O²⁻ ion is oxide.');
        }
        return no(cap(Y.name) + ' is ' + anIon(Y) + '. This compound has ' + anIon(a) + '.');
      }
      if (EL_BY_NAME[rest]) {
        return no(anIon(a) + ' is ' + (a.poly ? 'a polyatomic ion — use its name from your list.'
                                               : 'an ion, so its name ends in -ide.'));
      }
      return no('Check the spelling of the negative ion — the name for ' + anIon(a) + '.');
    }

    return no('Check your spelling and spacing.');
  }

  return {
    ROMAN: ROMAN, CAT: CAT, AN: AN,
    gcd: gcd, uni: uni, sup: sup, cap: cap, block: block,
    catIon: catIon, anIon: anIon,
    make: make, fromCode: fromCode, formula: formula, accepted: accepted, name: name,
    all: all, traits: traits, atoms: atoms,
    checkFormula: checkFormula, checkName: checkName, normName: normName
  };
})();

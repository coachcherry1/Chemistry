/* chem.js — compounds, formatting, and answer checking. No DOM.
 *
 * Three kinds of compound:
 *   ionic     { kind: 'ion', c: cation, a: anion, q: cation charge, m, n, code }
 *             m and n are the subscripts in lowest terms; code "Fe3.SO4"
 *   covalent  { kind: 'cov', e1, e2, x, y, f, code }
 *             e1/e2 element symbols, x/y the real atom counts; code "v.N2O4"
 *   acid      { kind: 'acid', a: anion, n: number of H, root, type, f, code }
 *             type 'bin' (hydro-...-ic), 'ic' (from -ate) or 'ous' (from -ite);
 *             code "h.SO4"
 * rule(cpd) is the decision the whole activity is about: 'acid', 'ion', 'tm'
 * or 'cov'. acidType(cpd) is the second decision inside the acid branch.
 *
 * Every formula string is plain ASCII ("Fe2(SO4)3"); uni() turns it into
 * display text with subscripts. checkName() and checkFormula() grade what the
 * tile builders compose and explain the specific mistake - especially the
 * cross-over ones: prefixes on an ionic name, a Roman numeral on a covalent
 * one, a reduced covalent formula, "no prefix means one" in an ionic formula.
 */

var Chem = (function () {
  'use strict';

  var ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  var PREFIXES = DATA.PREFIXES;
  var SUB = '₀₁₂₃₄₅₆₇₈₉';
  var SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';

  var CAT = {}, AN = {}, CAT_BY_NAME = {}, AN_BY_NAME = {}, EL_BY_NAME = {}, KNOWN = {};
  DATA.CATIONS.forEach(function (c) { CAT[c.t] = c; CAT_BY_NAME[c.name] = c; KNOWN[c.name] = true; });
  DATA.ANIONS.forEach(function (a) { AN[a.t] = a; AN_BY_NAME[a.name] = a; KNOWN[a.name] = true; });
  Object.keys(DATA.ELEMENT_NAMES).forEach(function (s) { EL_BY_NAME[DATA.ELEMENT_NAMES[s]] = s; });
  var EL = DATA.ELEMENT_NAMES;

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

  /* The a or o at the end of a prefix is dropped before "oxide" only:
     monoxide, tetroxide, pentoxide. Dioxide and trioxide keep their i. */
  function elide(prefix, word) {
    if (prefix && word === 'oxide' && /[ao]$/.test(prefix)) return prefix.slice(0, -1) + word;
    return prefix + word;
  }

  /* ---------------------------------------------------------- ionic compounds */

  function make(catT, q, anT) {
    var c = CAT[catT], a = AN[anT];
    if (!c || !a || c.charges.indexOf(q) < 0 || !DATA.allowed(c, a)) return null;
    var g = gcd(q, a.charge);
    return { kind: 'ion', c: c, a: a, q: q, m: a.charge / g, n: q / g, code: catT + q + '.' + anT };
  }

  /* -------------------------------------------------------- covalent compounds */

  var COV = {};
  DATA.COVALENT.forEach(function (f) {
    var p = /^([A-Z][a-z]?)(\d*)([A-Z][a-z]?)(\d*)$/.exec(f);
    COV[f] = {
      kind: 'cov', f: f, code: 'v.' + f,
      e1: p[1], x: p[2] ? +p[2] : 1, e2: p[3], y: p[4] ? +p[4] : 1
    };
  });

  function covByCounts(e1, x, e2, y) {
    return COV[block(e1, x) + block(e2, y)] || null;
  }

  function covName(cpd) {
    return (cpd.x > 1 ? PREFIXES[cpd.x] : '') + EL[cpd.e1] + ' ' + elide(PREFIXES[cpd.y], AN[cpd.e2].name);
  }

  /* ----------------------------------------------------------------- acids */

  var ACIDS = {}, ACID_BY_F = {};
  Object.keys(DATA.ACIDS).forEach(function (t) {
    var a = AN[t];
    var hasO = /O/.test(a.t);
    var type = !hasO ? 'bin' : /ate$/.test(a.name) ? 'ic' : 'ous';
    var acid = {
      kind: 'acid', a: a, n: a.charge, root: DATA.ACIDS[t], type: type,
      f: block('H', a.charge) + a.t, code: 'h.' + t
    };
    if (a.alt) acid.alt = 'CH3COOH';
    ACIDS[acid.code] = acid;
    ACID_BY_F[acid.f] = acid;
    if (acid.alt) ACID_BY_F[acid.alt] = acid;
  });

  var ACID_TYPES = {
    bin: 'Binary acid (no oxygen) — hydro- … -ic acid',
    ic: 'From an -ate ion — … -ic acid',
    ous: 'From an -ite ion — … -ous acid'
  };

  function acidName(cpd) {
    return (cpd.type === 'bin' ? 'hydro' : '') + cpd.root + (cpd.type === 'ous' ? 'ous' : 'ic') + ' acid';
  }

  function acidWhy(cpd) {
    var a = cpd.a, ion = anIon(a);
    if (cpd.type === 'bin') {
      return 'There is no oxygen in ' + ion + ', so it is named like a binary acid: hydro- + root + -ic.';
    }
    return ion + ' is ' + a.name + ', and ' + (cpd.type === 'ic' ? '-ate becomes -ic' : '-ite becomes -ous') +
           ' — no hydro-, because the ion contains oxygen.';
  }

  /* ---------------------------------------------------------------- shared */

  function fromCode(code) {
    code = code || '';
    if (code.indexOf('v.') === 0) return COV[code.slice(2)] || null;
    if (code.indexOf('h.') === 0) return ACIDS[code] || null;
    var p = /^(NH4|[A-Z][a-z]?)(\d)\.([A-Za-z0-9]+)$/.exec(code);
    return p ? make(p[1], +p[2], p[3]) : null;
  }

  function rule(cpd) {
    if (cpd.kind === 'acid') return 'acid';
    return cpd.kind === 'cov' ? 'cov' : cpd.c.tm ? 'tm' : 'ion';
  }

  var RULES = {
    acid: 'Acid — starts with H',
    ion: 'Ionic — no Roman numeral',
    tm: 'Ionic — Roman numeral (transition metal)',
    cov: 'Covalent — prefixes'
  };

  function tmWhy(c) {
    var ions = c.charges.map(function (q) { return catIon(c, q); });
    if (c.tm && c.notD) {
      return c.t + ' is not in the d-block, but in this class it counts as a transition metal: it can be ' +
             ions.join(' or ') + ', so its name needs a Roman numeral.';
    }
    if (c.tm && ions.length > 1) {
      return c.t + ' is a transition metal — it can be ' + ions.join(' or ') +
             ', so its name needs a Roman numeral.';
    }
    if (c.tm) {
      return c.t + ' is a transition metal, so its name always carries a Roman numeral. ' +
             'Here it is always ' + ions[0] + ': mercury(II).';
    }
    if (c.poly) return c.why;
    if (c.dblock) {
      return c.t + ' sits in the d-block, but it is not a transition metal in this class: it only ' +
             'ever forms ' + ions[0] + ', so no Roman numeral.';
    }
    return c.t + ' is in Group ' + c.group + ', not a transition metal. ' + c.why + ' No Roman numeral.';
  }

  /* Why this compound gets the rules it gets - the explanation behind every
     "which rules?" answer, right or wrong. */
  function ruleWhy(cpd) {
    if (cpd.kind === 'acid') {
      return 'Acid: the formula starts with H, and the rest is the negative ion ' + anIon(cpd.a) + '. ' + acidWhy(cpd);
    }
    if (cpd.kind === 'cov') {
      var tag = function (s) { return s === 'B' || s === 'Si' ? s + ' (a metalloid)' : s; };
      return 'Covalent: ' + tag(cpd.e1) + ' and ' + tag(cpd.e2) + ' are both on the nonmetal side of ' +
             'the staircase, so they share electrons instead of forming ions. Name it with prefixes — ' +
             'never a Roman numeral.' +
             (cpd.e1 === 'Xe' || cpd.e1 === 'Kr'
               ? ' ' + cpd.e1 + ' is a noble gas: it never forms an ion, but it can share electrons.' : '');
    }
    var c = cpd.c;
    return (c.poly
      ? 'Ionic: NH₄⁺ is a positive ion, so this is ionic even though every element in it is a nonmetal. '
      : 'Ionic: ' + c.t + ' is a metal. ') + tmWhy(c);
  }

  function formula(cpd, alt) {
    if (cpd.kind === 'acid') return alt && cpd.alt ? cpd.alt : cpd.f;
    if (cpd.kind === 'cov') return cpd.f;
    var at = alt && cpd.a.alt ? cpd.a.alt : cpd.a.t;
    return block(cpd.c.t, cpd.m, cpd.c.poly && cpd.m > 1) +
           block(at, cpd.n, cpd.a.poly && cpd.n > 1);
  }

  function accepted(cpd) {
    var list = [formula(cpd)];
    if ((cpd.kind === 'ion' && cpd.a.alt) || cpd.alt) list.push(formula(cpd, true));
    return list;
  }

  function name(cpd) {
    if (cpd.kind === 'acid') return acidName(cpd);
    if (cpd.kind === 'cov') return covName(cpd);
    return cpd.c.name + (cpd.c.tm ? '(' + ROMAN[cpd.q] + ')' : '') + ' ' + cpd.a.name;
  }

  /* Element symbols in a compound, for highlighting on the periodic table. */
  function elements(cpd) {
    return Object.keys(atoms(formula(cpd)));
  }

  function allIonic() {
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

  function allCovalent() {
    return DATA.COVALENT.map(function (f) { return COV[f]; });
  }

  function allAcids() {
    return Object.keys(DATA.ACIDS).map(function (t) { return ACIDS['h.' + t]; });
  }

  function all() { return allIonic().concat(allCovalent()).concat(allAcids()); }

  /* Plain-language properties the level draws select on. */
  function traits(cpd) {
    if (cpd.kind === 'acid') {
      return {
        acid: true, cov: false, tm: false, binary: cpd.type === 'bin', poly: false, ammonium: false,
        parens: false, reduced: false, fourOverTwo: false, reducible: false, monoSecond: false,
        firstPrefix: false, noble: false,
        /* H2SO4, H3PO4: more than one H to count */
        multiH: cpd.n > 1,
        /* perchloric, hypochlorous: the ion's per-/hypo- carries over */
        perHypo: /^(per|hypo)/.test(cpd.a.name) && cpd.a.t !== 'MnO4'
      };
    }
    if (cpd.kind === 'cov') {
      return {
        acid: false, cov: true, tm: false, binary: true, poly: false, ammonium: false, parens: false,
        reduced: false, fourOverTwo: false,
        /* N2O4, P4O10: the formula a student is tempted to reduce */
        reducible: gcd(cpd.x, cpd.y) > 1,
        /* carbon monoxide: the second element keeps mono- */
        monoSecond: cpd.y === 1,
        /* dinitrogen: the first element takes a prefix too */
        firstPrefix: cpd.x > 1,
        noble: cpd.e1 === 'Xe' || cpd.e1 === 'Kr'
      };
    }
    return {
      acid: false, cov: false,
      tm: !!cpd.c.tm,
      binary: !cpd.c.poly && !cpd.a.poly,
      poly: !!(cpd.c.poly || cpd.a.poly),
      ammonium: cpd.c.t === 'NH4',
      parens: !!((cpd.c.poly && cpd.m > 1) || (cpd.a.poly && cpd.n > 1)),
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

  /* Split a formula into first and second blocks for a given pair of texts.
     Returns null if the string is not those two parts. */
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

  var CAPS = 'Check your capital letters. Every symbol starts with a capital and any second ' +
             'letter is lowercase — Co is cobalt, but CO is carbon and oxygen.';

  function parenMissing(text, k) {
    return 'To show more than one ' + uni(text) + ', wrap it in parentheses: (' + uni(text) + ')' +
           uni(String(k)) + '. Without them the ' + k + ' would multiply only the last atom.';
  }

  function judgeIonBlocks(cpd, b) {
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
      var balance = 'The charges don’t balance: ' + b.cn + ' × ' + catIon(c, cpd.q) + ' = ' + pos +
                    '+, but ' + b.an + ' × ' + anIon(a) + ' = ' + neg + '−.';
      if (b.cn === 1 && b.an === 1) {
        return no('This is ionic, and an ionic name has no prefixes — so “no prefix” does NOT mean ' +
                  'one of each. The charges decide. ' + balance);
      }
      return no(balance + ' Find the smallest numbers that make them equal.');
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

  function acidInstead(cpd, s) {
    var other = ACID_BY_F[s];
    if (!other || other === cpd) return null;
    return uni(s) + ' is ' + acidName(other) + ' — an acid. ' + cap(name(cpd)) +
           (cpd.kind === 'acid' ? ' comes from ' + anIon(cpd.a) + ', ' + cpd.a.name + '.'
                                : ' is not an acid, so it does not start with H.');
  }

  function checkAcidFormula(cpd, s) {
    var a = cpd.a, ion = anIon(a);
    var other = acidInstead(cpd, s);
    if (other) return no(other);
    var texts = [a.t].concat(a.alt ? [a.alt] : []);
    for (var i = 0; i < texts.length; i++) {
      var b = blocks(s, 'H', texts[i]);
      if (!b) continue;
      if (b.cParen || b.aParen) {
        return no('Acids never use parentheses. There is only one ' + uni(a.t) + '; the H count balances it.');
      }
      if (b.cDigits === '1' || b.aDigits === '1') return no('Leave out subscripts of 1 — no number already means one.');
      if (b.an > 1) return no('An acid has just one ' + uni(a.t) + '. Balance its charge with H, not with more anions.');
      if (b.cn !== cpd.n) {
        return no('Each H is 1+ and ' + ion + ' is ' + a.charge + '−, so the number of H must match the ' +
                  'anion’s charge.');
      }
    }
    if (COV[s]) {
      return no(uni(s) + ' is ' + covName(COV[s]) + ', a covalent molecule. An acid starts with H, then the ' +
                'negative ion: ' + ion + '.');
    }
    if (!/^H/.test(s)) return no('Every acid formula starts with H.');
    for (var j = 0; j < DATA.ANIONS.length; j++) {
      var Y = DATA.ANIONS[j];
      if (Y === a) continue;
      if (new RegExp('^H\\d*\\(?' + Y.t + '\\)?\\d*$').test(s)) {
        return no(uni(Y.t) + ' is ' + Y.name + '. ' + cap(acidName(cpd)) + ' comes from ' + ion + ', ' + a.name + '.');
      }
    }
    return no('An acid is H followed by the negative ion its name comes from: ' + a.name + ', ' + ion + '.');
  }

  function checkIonFormula(cpd, s) {
    var c = cpd.c, a = cpd.a;
    var acidMsg = acidInstead(cpd, s);
    if (acidMsg) return no(acidMsg);
    if (COV[s]) {
      return no(uni(s) + ' on its own is ' + covName(COV[s]) + ', a covalent molecule. ' +
                cap(name(cpd)) + ' is ionic, so it needs its positive ion, ' +
                (c.poly ? 'NH₄⁺' : catIon(c, cpd.q)) + ', too.');
    }
    var aTexts = [a.t].concat(a.alt ? [a.alt] : []);
    for (var i = 0; i < aTexts.length; i++) {
      var b = blocks(s, c.t, aTexts[i]);
      if (b) return judgeIonBlocks(cpd, b);
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
    var first = /^\(?([A-Z][a-z]?)\)?\d*/.exec(s);
    if (first && first[1] !== c.t && EL[first[1]] && !CAT[first[1]]) {
      return no(uni(first[1]) + ' is ' + EL[first[1]] + '. For ' + c.name + ' use ' + uni(c.t) + '.');
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
    return no('Check the symbols: ' + c.name + ' is ' + uni(c.t) + ' and ' + a.name + ' is ' +
              anIon(a) + '.');
  }

  function checkCovFormula(cpd, s) {
    var e1 = cpd.e1, e2 = cpd.e2;
    var acidMsg = acidInstead(cpd, s);
    if (acidMsg) return no(acidMsg);
    var b = blocks(s, e1, e2);
    if (b) {
      if (b.cParen || b.aParen) {
        return no('Parentheses are only for polyatomic ions. A covalent formula is just the two ' +
                  'elements with their subscripts.');
      }
      if (b.cDigits === '1' || b.aDigits === '1') {
        return no('Leave out subscripts of 1 — no number already means one.');
      }
      if (b.cn * cpd.y === b.an * cpd.x && b.cn < cpd.x) {
        var red = covByCounts(e1, b.cn, e2, b.an);
        return no('Never reduce a covalent formula — the prefixes give the exact number of each ' +
                  'atom in the molecule.' +
                  (red ? ' ' + uni(red.f) + ' is a different compound: ' + covName(red) + '.' : ''));
      }
      if (b.cn === cpd.y && b.an === cpd.x && cpd.x !== cpd.y) {
        return no('Each prefix counts the element written right after it. Check which number ' +
                  'belongs to ' + EL[e1] + ' and which to ' + EL[e2] + '.');
      }
      if (b.cn > 1 && cpd.x === 1) {
        return no(cap(EL[e1]) + ' has no prefix in the name, so there is one ' + e1 +
                  ' atom. Only the second element’s prefix gives a subscript here.');
      }
      return no('This is covalent: there are no charges to balance. Read the prefixes — each one ' +
                'tells you exactly how many atoms of the element right after it.');
    }
    if (blocks(s, e2, e1)) {
      return no('Write the elements in the order the name gives them: ' + EL[e1] + ' first.');
    }
    var p = /^\(?([A-Z][a-z]?)\)?(\d*)\(?([A-Z][a-z]?)\)?(\d*)$/.exec(s);
    if (p && p[1] !== e1 && EL[p[1]]) {
      return no(uni(p[1]) + ' is ' + EL[p[1]] + '. ' + cap(EL[e1]) + ' is ' + e1 + '.');
    }
    if (p && p[3] !== e2 && EL[p[3]]) {
      return no(uni(p[3]) + ' is ' + EL[p[3]] + '. ' + cap(AN[e2].name) + ' comes from ' + e2 + '.');
    }
    var poly = DATA.ANIONS.filter(function (a) { return a.poly && s.indexOf(a.t) > 0; })[0];
    if (poly) {
      return no(uni(poly.t) + ' is a polyatomic ion. A covalent compound is just two elements, ' +
                'each with the subscript its prefix gives.');
    }
    return no('Use the two element symbols from the name, with each prefix as a subscript.');
  }

  function checkFormula(cpd, raw) {
    var s = normFormula(raw);
    if (!s) return no('Build a formula first.');
    var ok = accepted(cpd);
    if (ok.indexOf(s) >= 0) return yes();
    var lower = s.toLowerCase();
    if (ok.some(function (x) { return x.toLowerCase() === lower; })) return no(CAPS);
    if (cpd.kind === 'acid') return checkAcidFormula(cpd, s);
    return cpd.kind === 'cov' ? checkCovFormula(cpd, s) : checkIonFormula(cpd, s);
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

  /* "tetroxide" -> {prefix: 'tetra', base: 'oxide', elided: true}. A word
     that is itself a known name (dichromate, permanganate) is never split. */
  var LONGEST_FIRST = PREFIXES.filter(Boolean).sort(function (a, b) { return b.length - a.length; });
  function splitPrefix(word) {
    if (KNOWN[word] || EL_BY_NAME[word]) return { prefix: '', base: word };
    for (var i = 0; i < LONGEST_FIRST.length; i++) {
      var p = LONGEST_FIRST[i];
      if (/[ao]$/.test(p) && word === p.slice(0, -1) + 'oxide') return { prefix: p, base: 'oxide', elided: true };
    }
    for (var j = 0; j < LONGEST_FIRST.length; j++) {
      var q = LONGEST_FIRST[j], rest = word.slice(q.length);
      if (word.indexOf(q) === 0 && (KNOWN[rest] || EL_BY_NAME[rest])) return { prefix: q, base: rest };
    }
    return { prefix: '', base: word };
  }

  function prefixOnIonic(cpd) {
    var c = cpd.c;
    var why = c.poly ? 'NH₄⁺ is a positive ion' : c.t + ' is a metal';
    if (c.tm) {
      return 'This is ionic — ' + why + '. Ionic names never use prefixes. ' + cap(c.name) +
             ' is a transition metal, so show its charge with a Roman numeral instead.';
    }
    return 'This is ionic — ' + why + ' — so no prefixes. The charges already fix how many of ' +
           'each ion there are.';
  }

  function numeralOnCov(cpd) {
    return 'This is covalent: ' + cpd.e1 + ' and ' + cpd.e2 + ' are both on the nonmetal side of the staircase, so there are no ' +
           'ions and no charge to show. Covalent names never use Roman numerals — count the ' +
           'atoms and use prefixes.';
  }

  function chargeHow(cpd) {
    var tot = cpd.n * cpd.a.charge;
    return 'The ' + (cpd.n > 1 ? cpd.n + ' ' : '') + uni(cpd.a.t) + ' carr' +
           (cpd.n > 1 ? 'y ' : 'ies ') + tot + '− in total, balanced by ' + cpd.m + ' ' + cpd.c.t + '.';
  }

  function checkCovName(cpd, s) {
    var F = uni(cpd.f), e1 = cpd.e1, e2 = cpd.e2;
    var n1 = EL[e1], n2 = AN[e2].name;
    if (/\(/.test(s)) return no(numeralOnCov(cpd));
    var w = s.split(' ');
    if (w.length !== 2) {
      return no('A covalent name is two words: the first element, then the second element ending ' +
                'in -ide, each with a prefix that counts its atoms.');
    }
    var a = splitPrefix(w[0]), b = splitPrefix(w[1]);

    if (a.base !== n1) {
      var sym = EL_BY_NAME[a.base] || (CAT_BY_NAME[a.base] && CAT_BY_NAME[a.base].t);
      if (sym) return no(cap(a.base) + ' is ' + uni(sym) + '. The first element here is ' + e1 + '.');
      return no('Check the first element — the name for ' + e1 + '.');
    }
    if (b.base !== n2) {
      if (b.base === EL[e2]) {
        return no('The second element ends in -ide: ' + n2 + ', not ' + b.base + '.');
      }
      var Y = AN_BY_NAME[b.base];
      if (Y && Y.poly) {
        return no(cap(Y.name) + ' is the polyatomic ion ' + anIon(Y) + '. A covalent compound is ' +
                  'just two elements, and the second one ends in -ide.');
      }
      if (Y) return no(cap(Y.name) + ' comes from ' + Y.t + '. The second element here is ' + e2 + '.');
      return no('Check the second element — the -ide name for ' + e2 + '.');
    }

    if (cpd.x === 1 && a.prefix === 'mono') {
      return no('Drop mono- on the first element. With one atom of the first element it gets no ' +
                'prefix: carbon monoxide, not monocarbon monoxide.');
    }
    var x2 = a.prefix ? PREFIXES.indexOf(a.prefix) : 1, y2 = PREFIXES.indexOf(b.prefix);
    if (y2 > 0 && x2 * cpd.y === y2 * cpd.x && x2 < cpd.x) {
      var red = covByCounts(e1, x2, e2, y2);
      return no('Count the atoms exactly as written in ' + F + ' — never reduce a covalent ' +
                'formula.' + (red ? ' ' + cap(covName(red)) + ' is ' + uni(red.f) +
                ', a different compound.' : ''));
    }
    if (cpd.x === 1 && a.prefix) {
      return no('Count the ' + e1 + ' atoms in ' + F + ': there is only one, so ' + n1 + ' gets no prefix.');
    }
    if (cpd.x > 1 && !a.prefix) {
      return no('There is more than one ' + e1 + ' atom in ' + F + ', so ' + n1 + ' needs a prefix too.');
    }
    if (cpd.x > 1 && a.prefix !== PREFIXES[cpd.x]) {
      return no('Count the ' + e1 + ' atoms in ' + F + ' again — the prefix on ' + n1 + ' doesn’t match.');
    }
    if (!b.prefix) {
      return no('The second element always gets a prefix — even mono-, as in carbon monoxide.');
    }
    if (b.prefix !== PREFIXES[cpd.y]) {
      return no('Count the ' + e2 + ' atoms in ' + F + ' again — the prefix on ' + n2 + ' doesn’t match.');
    }
    if (n2 === 'oxide' && /[ao]$/.test(b.prefix) && !b.elided) {
      return no('Drop the ' + b.prefix.slice(-1) + ' before oxide: ' + elide(b.prefix, 'oxide') + '.');
    }
    return no('Check your spelling.');
  }

  function checkIonName(cpd, s) {
    var c = cpd.c, a = cpd.a, q = cpd.q;
    var words = s.replace(/\([^)]*\)/g, ' ').split(' ').filter(Boolean);
    var prefixed = words.some(function (w) {
      var sp = splitPrefix(w);
      return sp.prefix && KNOWN[sp.base];
    });
    if (prefixed) return no(prefixOnIonic(cpd));

    var p = /^([a-z]+)\s*(?:\(([^)]*)\))?\s*(.*)$/.exec(s);
    if (!p) {
      return no('Write the positive ion’s name first, then the negative ion’s — ' +
                'with a Roman numeral in parentheses only if the metal needs one.');
    }
    var cw = p[1], num = p[2], rest = p[3].trim();

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
        if (a.t === 'O' && Y.t === 'O2') return no('Peroxide is O₂²⁻. A single O²⁻ ion is oxide.');
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

  /* Acid names come from three tiles: hydro- or nothing, a root, -ic or -ous.
     A string is split into the same three parts so both paths share the
     explanations. */
  function acidParts(s) {
    var m = /^(hydro)?([a-z]+?)(ic|ous) acid$/.exec(s);
    return m ? { pre: m[1] ? 'hydro' : 'none', root: m[2], end: m[3] } : null;
  }

  function checkAcidName(cpd, s, sel) {
    var a = cpd.a, ion = anIon(a);
    var p = sel && sel.root ? sel : acidParts(s);
    if (!p) {
      return no('This is an acid — the formula starts with H — so its name ends in “acid” and is built ' +
                'from the negative ion: ' + a.name + '.');
    }
    if (cpd.type === 'bin' && p.pre !== 'hydro') {
      return no('There is no oxygen in ' + ion + ', so this is a binary acid: it needs hydro- in front.');
    }
    if (cpd.type !== 'bin' && p.pre === 'hydro') {
      return no('No hydro- here: ' + ion + ' contains oxygen. Hydro- is only for acids whose negative ion ' +
                'has no oxygen, like HCl and H₂S.');
    }
    if (p.root !== cpd.root) {
      if (p.root + 'ur' === cpd.root || p.root + 'or' === cpd.root) {
        return no('Acids of sulfur and phosphorus keep the whole root: sulfur-, phosphor-. “Sulfic” and ' +
                  '“phosphic” aren’t words.');
      }
      if (/chlor$/.test(p.root) && /chlor$/.test(cpd.root)) {
        return no('The acid keeps the per- or hypo- of its ion — or has none if the ion has none. Look at ' +
                  'the ion’s name: ' + a.name + '.');
      }
      return no('Check the root: this acid comes from ' + ion + ', ' + a.name + '.');
    }
    var want = cpd.type === 'ous' ? 'ous' : 'ic';
    if (p.end !== want) {
      if (cpd.type === 'bin') return no('Binary acids always end in -ic: hydro- … -ic acid.');
      return no(cap(a.name) + ' ends in ' + (cpd.type === 'ic' ? '-ate, and -ate becomes -ic.' : '-ite, and -ite becomes -ous.'));
    }
    return no('Check your spelling.');
  }

  /* `sel` is the builder's tile choice, when there is one. It lets a prefix
     tile on an ionic name - or a numeral tile on a covalent one - be called
     out as the cross-over mistake it is, whatever else was picked. */
  function checkName(cpd, raw, sel) {
    var s = normName(raw);
    if (!s) return no('Build a name first.');
    var isAcid = cpd.kind === 'acid';
    if (sel && sel.mode && (sel.mode === 'acid') !== isAcid) {
      return no(isAcid ? 'This one is an acid. ' + ruleWhy(cpd)
                       : 'This is not an acid — it does not start with H. ' + ruleWhy(cpd));
    }
    if (s === normName(name(cpd))) return yes();
    if (isAcid) return checkAcidName(cpd, s, sel);
    if (/ acid$/.test(s)) return no('This is not an acid — it does not start with H. ' + ruleWhy(cpd));
    if (sel) {
      if (cpd.kind === 'ion' && (sel.p1 !== 'none' || sel.p2 !== 'none')) return no(prefixOnIonic(cpd));
      if (cpd.kind === 'cov' && sel.num !== 'none') return no(numeralOnCov(cpd));
    }
    return cpd.kind === 'cov' ? checkCovName(cpd, s) : checkIonName(cpd, s);
  }

  return {
    ROMAN: ROMAN, PREFIXES: PREFIXES, CAT: CAT, AN: AN, COV: COV, EL: EL,
    gcd: gcd, uni: uni, sup: sup, cap: cap, block: block, elide: elide,
    catIon: catIon, anIon: anIon,
    RULES: RULES, tmWhy: tmWhy, ruleWhy: ruleWhy, ACID_TYPES: ACID_TYPES, acidWhy: acidWhy,
    allAcids: allAcids, ACID_BY_F: ACID_BY_F,
    make: make, fromCode: fromCode, rule: rule, formula: formula, accepted: accepted, name: name,
    elements: elements, all: all, allIonic: allIonic, allCovalent: allCovalent, covByCounts: covByCounts,
    traits: traits, atoms: atoms,
    checkFormula: checkFormula, checkName: checkName, normName: normName
  };
})();

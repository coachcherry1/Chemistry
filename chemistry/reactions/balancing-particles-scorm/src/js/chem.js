/* chem.js: the model. Reads formulas, counts atoms, balances an equation by
 * solving it (so no coefficient is typed twice anywhere) and judges a
 * student's coefficients. No DOM: the validator and the answer key load it
 * in node.
 *
 * A reaction is { l: [formula, ...], r: [formula, ...] }. Coefficients are
 * one flat list, reactants first.
 */
var Chem = (function () {
  'use strict';

  /* ---------------------------------------------------------------- formulas */

  /* 'Ca3(PO4)2' -> { Ca: 3, P: 2, O: 8 } */
  function parse(formula) {
    var i = 0, s = formula;
    function group() {
      var out = {};
      while (i < s.length && s[i] !== ')') {
        var part, m;
        if (s[i] === '(') {
          i++;
          part = group();
          if (s[i] !== ')') throw new Error('unclosed bracket in ' + formula);
          i++;
        } else {
          m = /^[A-Z][a-z]?/.exec(s.slice(i));
          if (!m) throw new Error('cannot read ' + formula + ' at ' + i);
          i += m[0].length;
          part = {};
          part[m[0]] = 1;
        }
        m = /^\d+/.exec(s.slice(i));
        var n = m ? +m[0] : 1;
        if (m) i += m[0].length;
        Object.keys(part).forEach(function (el) { out[el] = (out[el] || 0) + part[el] * n; });
      }
      return out;
    }
    var res = group();
    if (i !== s.length) throw new Error('cannot read ' + formula);
    return res;
  }

  var SUB = '₀₁₂₃₄₅₆₇₈₉';
  /* 'Ca3(PO4)2' -> 'Ca₃(PO₄)₂' */
  function pretty(formula) {
    return formula.replace(/\d/g, function (d) { return SUB[+d]; });
  }

  function species(rx) { return rx.l.concat(rx.r); }

  /* every element of the reaction, in the order it first appears */
  function elements(rx) {
    var seen = {}, out = [];
    species(rx).forEach(function (f) {
      var re = /[A-Z][a-z]?/g, m;
      while ((m = re.exec(f))) if (!seen[m[0]]) { seen[m[0]] = 1; out.push(m[0]); }
    });
    return out;
  }

  /* ---------------------------------------------------------------- balancing */

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  function frac(n, d) { if (d < 0) { n = -n; d = -d; } var g = gcd(n, d) || 1; return [n / g, d / g]; }
  function sub(a, b) { return frac(a[0] * b[1] - b[0] * a[1], a[1] * b[1]); }
  function mul(a, b) { return frac(a[0] * b[0], a[1] * b[1]); }
  function div(a, b) { return frac(a[0] * b[1], a[1] * b[0]); }

  /* The lowest whole-number coefficients, or null when the equation cannot be
     balanced or has more than one independent answer. */
  function balance(rx) {
    var sp = species(rx), els = elements(rx), nl = rx.l.length;
    var counts = sp.map(parse);
    var m = els.map(function (el) {
      return sp.map(function (f, j) { return frac((counts[j][el] || 0) * (j < nl ? 1 : -1), 1); });
    });
    var rows = m.length, cols = sp.length, lead = [], r = 0;
    for (var c = 0; c < cols && r < rows; c++) {
      var p = -1;
      for (var i = r; i < rows; i++) if (m[i][c][0] !== 0) { p = i; break; }
      if (p < 0) continue;
      var t = m[p]; m[p] = m[r]; m[r] = t;
      var pv = m[r][c];
      m[r] = m[r].map(function (x) { return div(x, pv); });
      for (var k = 0; k < rows; k++) {
        if (k === r || m[k][c][0] === 0) continue;
        var f = m[k][c];
        m[k] = m[k].map(function (x, j) { return sub(x, mul(f, m[r][j])); });
      }
      lead.push(c);
      r++;
    }
    if (lead.length !== cols - 1) return null;
    var free = -1;
    for (var j = 0; j < cols; j++) if (lead.indexOf(j) < 0) free = j;
    var sol = [];
    sol[free] = [1, 1];
    lead.forEach(function (lc, row) { sol[lc] = frac(-m[row][free][0], m[row][free][1]); });
    var den = 1;
    sol.forEach(function (x) { den = den * x[1] / gcd(den, x[1]); });
    var out = sol.map(function (x) { return x[0] * den / x[1]; });
    var g = out.reduce(gcd, 0);
    out = out.map(function (x) { return x / g; });
    if (out.some(function (x) { return x <= 0; })) return null;
    return out;
  }

  /* atoms of each element on each side with these coefficients */
  function tally(rx, coefs) {
    var nl = rx.l.length, sp = species(rx).map(parse);
    return elements(rx).map(function (el) {
      var left = 0, right = 0;
      sp.forEach(function (cnt, j) {
        var n = (cnt[el] || 0) * (coefs[j] || 0);
        if (j < nl) left += n; else right += n;
      });
      return { el: el, left: left, right: right, ok: left === right };
    });
  }

  function conserved(rx, coefs) { return tally(rx, coefs).every(function (t) { return t.ok; }); }

  /* What a set of coefficients is:
       empty     a box is blank or not a whole number of 1 or more
       right     conserved, lowest whole numbers
       multiple  conserved, but every coefficient is k times too big
       off       not conserved; .el is the first element that does not match */
  function judge(rx, coefs) {
    var n = species(rx).length, i;
    for (i = 0; i < n; i++) {
      var c = coefs[i];
      if (typeof c !== 'number' || !isFinite(c) || c < 1 || Math.floor(c) !== c) return { kind: 'empty', at: i };
    }
    var t = tally(rx, coefs);
    var bad = t.filter(function (x) { return !x.ok; });
    if (bad.length) return { kind: 'off', el: bad[0].el, left: bad[0].left, right: bad[0].right, tally: t, bad: bad };
    var g = coefs.slice(0, n).reduce(gcd, 0);
    if (g > 1) return { kind: 'multiple', k: g, tally: t };
    return { kind: 'right', tally: t };
  }

  /* '2 H₂ + O₂ → 2 H₂O' (a coefficient of 1 is not written) */
  function equation(rx, coefs) {
    var nl = rx.l.length;
    function side(list, off) {
      return list.map(function (f, j) {
        var c = coefs ? coefs[off + j] : 1;
        return (c > 1 ? c + ' ' : '') + pretty(f);
      }).join(' + ');
    }
    return side(rx.l, 0) + ' → ' + side(rx.r, nl);
  }

  return { parse: parse, pretty: pretty, species: species, elements: elements, balance: balance, tally: tally,
           conserved: conserved, judge: judge, equation: equation, gcd: gcd };
})();

if (typeof module !== 'undefined') module.exports = Chem;

/* atom.js: electron configurations, occupied energy levels and the wording
 * helpers every question uses. No DOM.
 *
 * Everything here works for elements 1 to 20, where electrons fill
 * 1s 2s 2p 3s 3p 4s in that order and come off in the reverse order. That
 * covers every element the activity uses (K and Ca lose 4s first).
 */

var Atom = (function () {
  'use strict';

  var ORDER = [[1, 's', 2], [2, 's', 2], [2, 'p', 6], [3, 's', 2], [3, 'p', 6], [4, 's', 2]];
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  var WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

  function sup(n) {
    return String(n).split('').map(function (d) { return SUP[d]; }).join('');
  }

  function ordinal(k) {
    var tail = (k % 100 >= 11 && k % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[k % 10] || 'th');
    return k + tail;
  }

  /* Subshells holding electrons, lowest first: [{ n, l, c }]. */
  function config(sym, charge) {
    var left = DATA.z(sym) - (charge || 0), out = [];
    for (var i = 0; i < ORDER.length && left > 0; i++) {
      var c = Math.min(ORDER[i][2], left);
      out.push({ n: ORDER[i][0], l: ORDER[i][1], c: c });
      left -= c;
    }
    return out;
  }

  function configText(sym, charge) {
    return config(sym, charge).map(function (s) { return s.n + s.l + sup(s.c); }).join(' ');
  }

  /* The number of occupied energy levels: the largest n in the configuration. */
  function occupied(sym, charge) {
    var cfg = config(sym, charge);
    return cfg.length ? cfg[cfg.length - 1].n : 0;
  }

  function row(sym) { return occupied(sym, 0); }

  /* Electrons per energy level, level 1 first, for every level the neutral
     atom occupies. An emptied level stays in the list with a count of 0: it
     still exists, it just has nothing in it. */
  function shells(sym, charge) {
    var counts = [];
    for (var n = 1; n <= row(sym); n++) counts.push(0);
    config(sym, charge).forEach(function (s) { counts[s.n - 1] += s.c; });
    return counts;
  }

  /* Electrons in the outermost occupied level of the neutral atom. */
  function outer(sym) {
    var s = shells(sym, 0);
    return s[s.length - 1];
  }

  function group(sym) {
    var z = DATA.z(sym);
    if (z === 1) return 1;
    if (z === 2) return 18;
    var o = outer(sym);
    return o <= 2 ? o : o + 10;
  }

  /* The occupied level the kth electron is pulled from. */
  function levelOf(sym, k) { return occupied(sym, k - 1); }

  function ion(sym, charge) {
    if (!charge) return sym;
    return sym + (charge === 1 ? '' : sup(charge)) + '⁺';
  }

  /* In the packet's form: X (g) + energy → X⁺ (g) + e⁻ */
  function equation(sym, k) {
    return ion(sym, k - 1) + '(g) + energy → ' + ion(sym, k) + '(g) + e⁻';
  }

  function ratio(a, b) { return b / a; }

  /* "about 9 times", the way the packet asks for it in 5.1. */
  function times(a, b) {
    var r = b / a;
    return 'about ' + (r < 2.75 ? (Math.round(r * 2) / 2) : Math.round(r)) + ' times';
  }

  /* Index (1-based) of the ionization energy right before the biggest jump,
     measured as a ratio, which is how the packet reads it. */
  function biggestJump(values) {
    var best = 0, at = 0;
    for (var i = 1; i < values.length; i++) {
      var r = values[i] / values[i - 1];
      if (r > best) { best = r; at = i; }
    }
    return at;
  }

  function word(n) { return WORDS[n] || String(n); }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function groupHint() {
    return 'Groups 1 and 2 hold the s electrons, then the p block starts at group 13. ' +
           'So 1 electron in the outer level is group 1, 2 is group 2, 3 is group 13, 4 is group 14, and so on.';
  }

  return {
    sup: sup, ordinal: ordinal, config: config, configText: configText, occupied: occupied,
    row: row, shells: shells, outer: outer, group: group, levelOf: levelOf, ion: ion,
    equation: equation, ratio: ratio, times: times, biggestJump: biggestJump, word: word,
    cap: cap, groupHint: groupHint
  };
})();

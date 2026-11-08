/* tex.js: LaTeX to MathML, for the worked solutions.
 *
 * problems.js writes every worked solution as LaTeX (Gen.solution);
 * this turns it into MathML, which the browser typesets itself: stacked
 * fractions, raised powers, lowered subscripts. No library, no web fonts,
 * nothing from the network, so it works offline in the LMS frame.
 *
 * Only what the solutions use: \frac{}{}, \text{}, \cancel{} (a struck unit,
 * drawn by CSS: Chrome has no MathML strike of its own), \times, \approx,
 * \to, \cdot, \div, \%,
 * \  (a space), \quad, ^{} and _{}, numbers, letters and = + - ( ) : , /.
 * Anything else throws, and tools/validate.js renders every solution.
 */
var Tex = (function () {
  'use strict';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var OPS = { '=': '=', '+': '+', '-': '−', '(': '(', ')': ')', ':': ':', ',': ',', '/': '/' };
  var CMDS = { times: '×', approx: '≈', to: '→', cdot: '·', div: '÷', '%': '%' };

  function toMathML(src, display) {
    var i = 0;
    function fail(m) { throw new Error('tex: ' + m + ' at ' + i + ' in ' + src); }
    function group() {
      while (src[i] === ' ') i++;
      if (src[i] !== '{') {
        if (i >= src.length) fail('missing argument');
        return atom();
      }
      i++;
      var out = seq('}');
      if (src[i] !== '}') fail('unclosed {');
      i++;
      return '<mrow>' + out + '</mrow>';
    }
    function rawText() {
      if (src[i] !== '{') fail('\\text needs {');
      var depth = 0, start = ++i;
      for (; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') { if (!depth) break; depth--; }
      }
      if (src[i] !== '}') fail('unclosed \\text');
      var t = src.slice(start, i++);
      return '<mtext>' + esc(t).replace(/ /g, ' ') + '</mtext>';
    }
    function atom() {
      var c = src[i];
      if (c === '\\') {
        var m = /^\\([a-zA-Z]+|.)/.exec(src.slice(i));
        if (!m) fail('bad command');
        i += m[0].length;
        var name = m[1];
        if (name === 'frac') { var a = group(), b = group(); return '<mfrac>' + a + b + '</mfrac>'; }
        if (name === 'text') return rawText();
        if (name === 'cancel') return '<mrow class="cx">' + group() + '</mrow>';
        if (name === ' ') return '<mspace width="0.3em"></mspace>';
        if (name === ',') return '<mspace width="0.17em"></mspace>';
        if (name === 'quad') return '<mspace width="1em"></mspace>';
        if (CMDS[name]) return '<mo>' + CMDS[name] + '</mo>';
        fail('unknown command \\' + name);
      }
      var num = /^\d+(\.\d*)?|^\.\d+/.exec(src.slice(i));
      if (num) { i += num[0].length; return '<mn>' + num[0] + '</mn>'; }
      if (/[A-Za-z]/.test(c)) { i++; return '<mi>' + c + '</mi>'; }
      if (OPS[c]) { i++; return '<mo' + (c === '(' || c === ')' ? ' stretchy="false"' : '') + '>' + esc(OPS[c]) + '</mo>'; }
      fail('unexpected ' + c);
    }
    function seq(stop) {
      var out = '';
      while (i < src.length && src[i] !== stop) {
        if (src[i] === ' ') { i++; continue; }
        var base = atom();
        while (src[i] === '^' || src[i] === '_') {
          var kind = src[i++];
          var arg = group();
          var other = src[i] === (kind === '^' ? '_' : '^');
          if (other) {
            i++;
            var arg2 = group();
            base = '<msubsup>' + base + (kind === '_' ? arg + arg2 : arg2 + arg) + '</msubsup>';
          } else base = (kind === '^' ? '<msup>' : '<msub>') + base + arg + (kind === '^' ? '</msup>' : '</msub>');
        }
        out += base;
      }
      return out;
    }
    var body = seq(null);
    if (i !== src.length) fail('stray }');
    return '<math' + (display ? ' display="block"' : '') + '>' + body + '</math>';
  }

  /* Put typeset LaTeX into an element (display: a line of its own). */
  function render(el, src, display) {
    el.innerHTML = toMathML(src, display);
    el.setAttribute('data-tex', src);
    return el;
  }

  return { toMathML: toMathML, render: render };
})();

/* finder.js: the fraction finder, for Multiply if not whole.
 *
 * A ruler of the decimal part of a quotient, 0 to 1, with a row for each
 * fraction the class uses: halves, thirds, fourths and fifths. The shaded
 * ends (within 0.1 of a whole number) are "round". In the drills and the
 * warm-ups a quotient can be put on the ruler: a line drops at its decimal
 * part and the nearest fraction lights up with what to multiply by. In the
 * graded problems the ruler and the chart stay beside the work as a
 * reference, but nothing is placed for the student (the skill is reading
 * the decimal as a fraction).
 *
 * Finder.create({ interactive, compact }) -> { el, place(q), clear() }
 * Finder.chart() -> the chart of decimal endings, fractions and multipliers
 */
var Finder = (function () {
  'use strict';
  var h = UI.h;
  var NS = 'http://www.w3.org/2000/svg';

  function s(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] != null) n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }

  var ROWS = [
    { den: 2, name: 'halves', mult: 2 },
    { den: 3, name: 'thirds', mult: 3 },
    { den: 4, name: 'fourths', mult: 4 },
    { den: 5, name: 'fifths', mult: 5 }
  ];
  function create(opts) {
    opts = opts || {};
    var compact = !!opts.compact;
    /* the compact ruler sits in a 300 px side panel: a narrower view box keeps its text readable */
    var X0 = compact ? 60 : 74, X1 = compact ? 290 : 344, W = compact ? 298 : 356;
    var rowH = compact ? 30 : 36, top = compact ? 24 : 30;
    var H = top + rowH * ROWS.length + 6;
    var x = function (f) { return X0 + f * (X1 - X0); };
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'finder' + (compact ? ' compact' : ''), role: 'img',
      'aria-label': 'Fraction finder: a ruler from 0 to 1 with halves, thirds, fourths and fifths; within 0.1 of either end means round' });
    /* the round zones */
    svg.appendChild(s('rect', { x: x(0), y: top - 14, width: x(0.1) - x(0), height: H - top + 10, class: 'zone' }));
    svg.appendChild(s('rect', { x: x(0.9), y: top - 14, width: x(1) - x(0.9), height: H - top + 10, class: 'zone' }));
    svg.appendChild(s('text', { x: (x(0) + x(0.1)) / 2, y: top - 4, class: 'zone-t', 'text-anchor': 'middle' }, ['round']));
    svg.appendChild(s('text', { x: (x(0.9) + x(1)) / 2, y: top - 4, class: 'zone-t', 'text-anchor': 'middle' }, ['round']));
    var ticks = [];
    ROWS.forEach(function (row, r) {
      var y = top + rowH * r + rowH / 2;
      var g = s('g', { class: 'frow', 'data-den': row.den });
      g.appendChild(s('text', { x: 4, y: y + 4, class: 'frow-t' }, [row.name]));
      g.appendChild(s('text', { x: 4, y: y + 4 + (compact ? 11 : 13), class: 'frow-m' }, ['× ' + row.mult]));
      g.appendChild(s('line', { x1: x(0), y1: y, x2: x(1), y2: y, class: 'fline' }));
      [0, 1].forEach(function (e) { g.appendChild(s('line', { x1: x(e), y1: y - 5, x2: x(e), y2: y + 5, class: 'fend' })); });
      for (var n = 1; n < row.den; n++) {
        var fr = Chem.FRACS.filter(function (f) { return Math.abs(f.v - n / row.den) < 1e-9; })[0];
        if (!fr) continue;      /* 2/4 is a half: it lives on the halves row */
        var cx = x(fr.v);
        var tick = s('g', { class: 'ftick', 'data-v': fr.v.toFixed(4) }, [
          s('circle', { cx: cx, cy: y, r: compact ? 6.5 : 8, class: 'fdot' }),
          s('text', { x: cx, y: y - (compact ? 8 : 11), class: 'funi', 'text-anchor': 'middle' }, [fr.uni]),
          s('text', { x: cx, y: y + (compact ? 14 : 17), class: 'fdec', 'text-anchor': 'middle' }, [fr.dec])
        ]);
        ticks.push({ el: tick, row: g, fr: fr });
        g.appendChild(tick);
      }
      svg.appendChild(g);
    });
    var marker = s('g', { class: 'fmark', visibility: 'hidden' }, [
      s('line', { x1: 0, y1: top - 14, x2: 0, y2: H - 2, class: 'fmark-l' }),
      s('text', { x: 0, y: top - 16, class: 'fmark-t', 'text-anchor': 'middle' }, [''])
    ]);
    svg.appendChild(marker);
    var caption = h('p', { class: 'finder-cap', 'aria-live': 'polite' });
    var el = h('div', { class: 'finder-box' }, [svg, opts.interactive ? caption : null]);

    function clear() {
      marker.setAttribute('visibility', 'hidden');
      ticks.forEach(function (t) { t.el.classList.remove('hit'); t.row.classList.remove('hit'); });
      caption.textContent = '';
    }
    /* Put a quotient on the ruler; returns what it is (Chem.fracOf). */
    function place(q) {
      clear();
      var info = Chem.fracOf(q);
      var f = q - Math.floor(q + 1e-9);
      marker.setAttribute('visibility', 'visible');
      marker.setAttribute('transform', 'translate(' + x(f) + ',0)');
      marker.lastChild.textContent = Chem.fmtQ(q);
      if (info.whole) {
        caption.textContent = Chem.fmtQ(q) + ' is within 0.1 of ' + info.n + ': round it to ' + info.n + ' (multiply by 1).';
      } else {
        var t = ticks.filter(function (t) { return Math.abs(t.fr.v - info.frac.v) < 1e-9; })[0];
        if (t) { t.el.classList.add('hit'); t.row.classList.add('hit'); }
        caption.textContent = Chem.fmtQ(q) + ' is about ' + info.text + ' = ' + info.improper + ': multiply by ' + info.den + ' to get ' +
          Chem.wholeAfter(q, info.den) + ' (' + Chem.fmtQ(q) + ' × ' + info.den + ' = ' + Chem.fmtQ(q * info.den) + ').';
      }
      return info;
    }
    return { el: el, place: place, clear: clear };
  }

  function chart() {
    var rows = [
      ['.00 to .10, .90 to .99', 'whole', 'round (× 1)'],
      ['.50', '½', '× 2'],
      ['.33, .67', '⅓, ⅔', '× 3'],
      ['.25, .75', '¼, ¾', '× 4'],
      ['.20, .40, .60, .80', '⅕, ⅖, ⅗, ⅘', '× 5']
    ];
    return h('table', { class: 'fchart' }, [
      h('thead', null, [h('tr', null, ['Decimal ends in', 'Fraction', 'Multiply by'].map(function (x) { return h('th', { scope: 'col', text: x }); }))]),
      h('tbody', null, rows.map(function (r) { return h('tr', null, r.map(function (c, i) { return h('td', { class: i === 2 ? 'num' : null, text: c }); })); }))
    ]);
  }

  return { create: create, chart: chart, ROWS: ROWS };
})();

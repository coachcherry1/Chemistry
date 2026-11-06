/* phcurve.js: pH against the amount of strong acid or strong base added (an SVG graph).
 *
 * The middle of the graph is 0 (nothing added). To the right, strong acid (HCl)
 * is added; to the left, strong base (NaOH). The curves are drawn from Buf.curve,
 * so they are the same numbers as the particle diagram's pH. Optional parts:
 *   live   a dot per curve that follows the slider (setX)
 *   pka    a dashed line at the pKa of the pair
 */

var PHCurve = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var VW = 440, VH = 300;
  var X0 = 48, X1 = 424, Y0 = 14, Y1 = 250;
  var M = Buf.MAXX;

  function s(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    return n;
  }

  function xs(x) { return X0 + (x + M) / (2 * M) * (X1 - X0); }
  function ys(pH) { return Y1 - pH / 14 * (Y1 - Y0); }

  /* create({ series: [{ pair, ha, a, cls, label }], live, pka: pair }) -> { node, setX(x), legend() } */
  function create(opts) {
    opts = opts || {};
    var series = opts.series;
    var svg = s('svg', { viewBox: '0 0 ' + VW + ' ' + VH, class: 'curve-svg', role: 'img',
      'aria-label': 'pH against the amount of strong acid or strong base added' });
    svg.appendChild(s('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, class: 'cplot' }));
    for (var p = 0; p <= 14; p += 2) {
      svg.appendChild(s('line', { x1: X0, x2: X1, y1: ys(p), y2: ys(p), class: 'cgrid' }));
      svg.appendChild(s('text', { x: X0 - 6, y: ys(p) + 4, class: 'ctick end', text: String(p) }));
    }
    svg.appendChild(s('line', { x1: X0, x2: X1, y1: ys(7), y2: ys(7), class: 'cseven' }));
    svg.appendChild(s('text', { x: X1 - 4, y: ys(7) - 4, class: 'cnote end', text: 'pH 7' }));
    svg.appendChild(s('line', { x1: xs(0), x2: xs(0), y1: Y0, y2: Y1, class: 'ceq' }));
    [-12, -8, -4, 0, 4, 8, 12].forEach(function (v) {
      svg.appendChild(s('line', { x1: xs(v), x2: xs(v), y1: Y1, y2: Y1 + 5, class: 'caxis' }));
      svg.appendChild(s('text', { x: xs(v), y: Y1 + 17, class: 'ctick mid', text: String(Math.abs(v)) }));
    });
    svg.appendChild(s('line', { x1: X0, x2: X1, y1: Y1, y2: Y1, class: 'caxis' }));
    svg.appendChild(s('line', { x1: X0, x2: X0, y1: Y0, y2: Y1, class: 'caxis' }));
    svg.appendChild(s('text', { x: xs(-M / 2), y: VH - 6, class: 'clabel mid', text: '← NaOH added' }));
    svg.appendChild(s('text', { x: xs(M / 2), y: VH - 6, class: 'clabel mid', text: 'HCl added →' }));
    svg.appendChild(s('text', { x: 13, y: (Y0 + Y1) / 2, class: 'clabel mid', transform: 'rotate(-90 13 ' + (Y0 + Y1) / 2 + ')', text: 'pH' }));

    if (opts.pka) {
      var k = Buf.pKa(opts.pka);
      svg.appendChild(s('line', { x1: X0, x2: X1, y1: ys(k), y2: ys(k), class: 'cpka' }));
      svg.appendChild(s('text', { x: X0 + 4, y: ys(k) - 4, class: 'cnote', text: 'pKa ' + k.toFixed(2) }));
    }

    series.forEach(function (c, i) {
      var pts = Buf.curve(c.pair, c.ha, c.a).map(function (q) { return xs(q[0]).toFixed(1) + ',' + ys(Math.max(0, Math.min(14, q[1]))).toFixed(1); });
      svg.appendChild(s('polyline', { points: pts.join(' '), class: 'cline ' + (c.cls || 'cl' + i) }));
    });

    var dots = [];
    if (opts.live) {
      series.forEach(function (c, i) {
        var d = s('circle', { r: 6, class: 'cdot off ' + (c.cls || 'cl' + i) });
        svg.appendChild(d);
        dots.push(d);
      });
    }

    /* setX(null) hides the dots */
    function setX(x) {
      series.forEach(function (c, i) {
        if (!dots[i]) return;
        dots[i].classList.toggle('off', x == null);
        if (x == null) return;
        dots[i].setAttribute('cx', xs(x).toFixed(1));
        dots[i].setAttribute('cy', ys(Buf.pH(c.pair, c.ha, c.a, x)).toFixed(1));
      });
    }

    var node = document.createElement('figure');
    node.className = 'cbox';
    node.appendChild(svg);
    var key = document.createElement('div');
    key.className = 'clegend';
    series.forEach(function (c, i) {
      var item = document.createElement('span');
      item.className = 'clegend-item';
      var sw = document.createElement('i');
      sw.className = 'clegend-sw ' + (c.cls || 'cl' + i);
      sw.setAttribute('aria-hidden', 'true');
      item.appendChild(sw);
      item.appendChild(document.createTextNode(c.label || ''));
      key.appendChild(item);
    });
    if (series.some(function (c) { return c.label; })) node.appendChild(key);
    return { node: node, setX: setX };
  }

  return { create: create, xs: xs, ys: ys };
})();

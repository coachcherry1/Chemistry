/* charts.js: the pH graph under the controls.
 *
 *   Charts.graph(...)   pH against drops: this buffer, pure water (which can be hidden), and a dot at the beaker
 * Every number is worked out by Buf, so the graph and the beaker agree.
 */

var Charts = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var h = UI.h;

  function s(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    return n;
  }

  /* ---------------------------------------------------------------- pH graph */

  var VW = 440, VH = 250, X0 = 40, X1 = 428, Y0 = 10, Y1 = 206, M = Buf.MAXD;
  function xs(x) { return X0 + (x + M) / (2 * M) * (X1 - X0); }
  function ys(v) { return Y1 - v / 14 * (Y1 - Y0); }

  /* graph() -> { node, update(pair, ha, a, up, dn) } */
  function graph() {
    var svg = s('svg', { viewBox: '0 0 ' + VW + ' ' + VH, class: 'g-svg', role: 'img', 'aria-label': 'pH against drops of HCl or NaOH added' });
    svg.appendChild(s('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, class: 'cplot' }));
    for (var p = 0; p <= 14; p += 2) {
      svg.appendChild(s('line', { x1: X0, x2: X1, y1: ys(p), y2: ys(p), class: 'cgrid' }));
      svg.appendChild(s('text', { x: X0 - 5, y: ys(p) + 5, class: 'ctick end', text: String(p) }));
    }
    svg.appendChild(s('line', { x1: X0, x2: X1, y1: ys(7), y2: ys(7), class: 'cseven' }));
    svg.appendChild(s('line', { x1: xs(0), x2: xs(0), y1: Y0, y2: Y1, class: 'ceq' }));
    [-12, -8, -4, 0, 4, 8, 12].forEach(function (v) {
      svg.appendChild(s('line', { x1: xs(v), x2: xs(v), y1: Y1, y2: Y1 + 5, class: 'caxis' }));
      svg.appendChild(s('text', { x: xs(v), y: Y1 + 20, class: 'ctick mid', text: String(Math.abs(v)) }));
    });
    svg.appendChild(s('line', { x1: X0, x2: X1, y1: Y1, y2: Y1, class: 'caxis' }));
    svg.appendChild(s('line', { x1: X0, x2: X0, y1: Y0, y2: Y1, class: 'caxis' }));
    svg.appendChild(s('text', { x: xs(-M / 2), y: VH - 6, class: 'clabel mid', text: '← drops of NaOH' }));
    svg.appendChild(s('text', { x: xs(M / 2), y: VH - 6, class: 'clabel mid', text: 'drops of HCl →' }));
    svg.appendChild(s('text', { x: 12, y: (Y0 + Y1) / 2, class: 'clabel mid', transform: 'rotate(-90 12 ' + (Y0 + Y1) / 2 + ')', text: 'pH' }));
    var pkaLine = s('line', { class: 'cpka' }), pkaText = s('text', { class: 'cnote' });
    var water = s('polyline', { class: 'cline cl-wtr' }), buf = s('polyline', { class: 'cline cl-buf' });
    var dotW = s('circle', { r: 7, class: 'cdot cl-wtr' }), dotB = s('circle', { r: 8, class: 'cdot cl-buf' });
    [pkaLine, pkaText, water, buf, dotW, dotB].forEach(function (n) { svg.appendChild(n); });

    function line(pair, ha, a) {
      return Buf.curve(pair, ha, a).map(function (q) { return xs(q[0]).toFixed(1) + ',' + ys(Math.max(0, Math.min(14, q[1]))).toFixed(1); }).join(' ');
    }
    function update(pair, ha, a, up, dn, showWater) {
      var k = Buf.pKa(pair);
      var wOn = showWater !== false;
      water.style.display = wOn ? '' : 'none'; dotW.style.display = wOn ? '' : 'none'; waterKey.style.display = wOn ? '' : 'none';
      pkaLine.setAttribute('x1', X0); pkaLine.setAttribute('x2', X1); pkaLine.setAttribute('y1', ys(k)); pkaLine.setAttribute('y2', ys(k));
      pkaText.setAttribute('x', X0 + 5); pkaText.setAttribute('y', ys(k) - 5); pkaText.textContent = 'pKa ' + k.toFixed(2);
      water.setAttribute('points', line(pair, 0, 0));
      buf.setAttribute('points', (ha + a) > 0 ? line(pair, ha, a) : '');
      buf.style.display = (ha + a) > 0 ? '' : 'none';
      var net = up - dn;
      dotB.setAttribute('cx', xs(net).toFixed(1)); dotB.setAttribute('cy', ys(Buf.pH(pair, ha, a, up, dn)).toFixed(1));
      dotB.style.display = (ha + a) > 0 ? '' : 'none';
      dotW.setAttribute('cx', xs(net).toFixed(1)); dotW.setAttribute('cy', ys(Buf.pH(pair, 0, 0, up, dn)).toFixed(1));
    }
    var waterKey = h('span', { class: 'clegend-item' }, [h('i', { class: 'clegend-sw cl-wtr' }), 'Pure water']);
    var node = h('figure', { class: 'graph' }, [svg, h('div', { class: 'clegend' }, [
      h('span', { class: 'clegend-item' }, [h('i', { class: 'clegend-sw cl-buf' }), 'This buffer']), waterKey])]);
    return { node: node, update: update };
  }

  return { graph: graph };
})();

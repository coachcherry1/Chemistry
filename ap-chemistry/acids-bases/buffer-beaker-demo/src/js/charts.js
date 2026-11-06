/* charts.js: the two charts under the controls.
 *
 *   Charts.graph(...)     pH against drops: this buffer, pure water, and a dot at the beaker
 *   Charts.strength(...)  "Same drops, stronger buffer": the pH change for the same number of
 *                         drops when one species (or both) is multiplied by 1/2, 1, 2 and 4
 * Every number is worked out by Buf, so the chart and the beaker agree.
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
    function update(pair, ha, a, up, dn) {
      var k = Buf.pKa(pair);
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
    var node = h('figure', { class: 'graph' }, [svg, h('div', { class: 'clegend' }, [
      h('span', { class: 'clegend-item' }, [h('i', { class: 'clegend-sw cl-buf' }), 'This buffer']),
      h('span', { class: 'clegend-item' }, [h('i', { class: 'clegend-sw cl-wtr' }), 'Pure water'])])]);
    return { node: node, update: update };
  }

  /* ---------------------------------------------------------------- strength chart */

  var MULTS = [0.5, 1, 2, 4];
  var CAP = 6;                       /* the tallest bar stands for this many pH units */

  function fmtM(units) { return (units * Buf.U).toFixed(3).replace(/0$/, '') + ' M'; }
  function f2(v) { return v.toFixed(2); }
  function signed(v) { return (v < 0 ? '−' : '+') + Math.abs(v).toFixed(2); }

  /* the numbers behind the chart, so a validator can check them: one entry per multiplier */
  function strengthData(pair, ha, a, dir, n, vary) {
    return MULTS.map(function (m) {
      var ha2 = ha * (vary === 'A' ? 1 : m), a2 = a * (vary === 'HA' ? 1 : m);
      var c = Buf.change(pair, ha2, a2, dir, n);
      return { mult: m, ha: ha2, a: a2, start: c.start, end: c.end, delta: c.delta, left: Buf.reserve(ha2, a2, dir, n) };
    });
  }

  /* strength(onChange) -> { node, update(pair, ha, a), state } */
  function strength() {
    var st = { dir: 'acid', n: 5, vary: 'A' };
    var pairNow = 'HA', haNow = 10, aNow = 10;
    var bars = h('div', { class: 'bars' });
    var note = h('p', { class: 'strength-note' });
    var nOut = h('b', { class: 'n-out' });

    function seg(items, key) {
      return h('div', { class: 'seg', role: 'group' }, items.map(function (it) {
        var attrs = { type: 'button', class: 'mini' + (st[key] === it[0] ? ' on' : ''), 'aria-pressed': st[key] === it[0] ? 'true' : 'false',
          text: it[1], onclick: function () { st[key] = it[0]; paintControls(); draw(); } };
        attrs['data-' + key] = it[0];
        return h('button', attrs);
      }));
    }
    var ctlHost = h('div', { class: 'strength-ctl' });
    function paintControls() {
      var P = Buf.PAIRS[pairNow];
      ctlHost.innerHTML = '';
      ctlHost.appendChild(h('div', { class: 'ctl-row' }, [h('span', { class: 'ctl-name', text: 'Add' }),
        seg([['acid', 'HCl'], ['base', 'NaOH']], 'dir'),
        h('button', { type: 'button', class: 'step', 'aria-label': 'Fewer drops', text: '−', onclick: function () { st.n = Math.max(1, st.n - 1); paintControls(); draw(); } }),
        h('span', { class: 'n-box' }, [nOut]),
        h('button', { type: 'button', class: 'step', 'aria-label': 'More drops', text: '+', onclick: function () { st.n = Math.min(10, st.n + 1); paintControls(); draw(); } }),
        h('span', { class: 'ctl-name', text: 'drops' })]));
      nOut.textContent = String(st.n);
      ctlHost.firstChild.querySelector('.n-box').appendChild(nOut);
      ctlHost.appendChild(h('div', { class: 'ctl-row' }, [h('span', { class: 'ctl-name', text: 'Make more' }),
        seg([['A', P.a], ['HA', P.ha], ['both', 'both']], 'vary')]));
    }

    function draw() {
      var P = Buf.PAIRS[pairNow];
      bars.innerHTML = ''; note.textContent = '';
      var varied = st.vary === 'A' ? aNow : (st.vary === 'HA' ? haNow : Math.min(haNow, aNow));
      if (varied <= 0) {
        bars.appendChild(h('p', { class: 'muted big', text: 'Set the ' + (st.vary === 'HA' ? P.ha : P.a) + ' slider above 0 to compare.' }));
        return;
      }
      var data = strengthData(pairNow, haNow, aNow, st.dir, st.n, st.vary);
      data.forEach(function (d) {
        var tall = Math.min(1, Math.abs(d.delta) / CAP);
        var over = Math.abs(d.delta) > CAP;
        var col = h('div', { class: 'bar-col' + (d.mult === 1 ? ' now' : ''), 'data-mult': String(d.mult) }, [
          h('div', { class: 'bar-val', text: signed(d.delta) }),
          h('div', { class: 'bar-track' }, [h('div', { class: 'bar bar-' + st.dir + (over ? ' bar-over' : ''), style: 'height:' + Math.max(2, Math.round(tall * 100)) + '%' })]),
          h('div', { class: 'bar-x', text: '×' + (d.mult === 0.5 ? '½' : d.mult) + (d.mult === 1 ? ' (now)' : '') }),
          h('div', { class: 'bar-conc', text: st.vary === 'both' ? P.ha + ' ' + fmtM(d.ha) + ', ' + P.a + ' ' + fmtM(d.a)
            : (st.vary === 'A' ? P.a + ' ' + fmtM(d.a) : P.ha + ' ' + fmtM(d.ha)) }),
          h('div', { class: 'bar-pH', text: 'pH ' + f2(d.start) + ' → ' + f2(d.end) }),
          h('div', { class: 'bar-left' + (d.left === 0 ? ' gone' : ''), text: (st.dir === 'acid' ? P.a : P.ha) + ' left: ' + (d.left === 0 ? 'none' : (d.left * Buf.U).toFixed(3).replace(/0$/, '') + ' M') })]);
        bars.appendChild(col);
      });
      var one = data[1], two = data[2];
      var who = st.vary === 'both' ? 'both members' : (st.vary === 'A' ? P.a : P.ha);
      var strong = st.dir === 'acid' ? 'HCl' : 'NaOH';
      var reacting = st.dir === 'acid' ? P.a : P.ha;
      if (one.left === 0) {
        note.textContent = 'These ' + st.n + ' drops of ' + strong + ' use up all of the ' + reacting + ' in the beaker now, so the pH changes sharply. More of it, and the buffer holds.';
      } else {
        note.textContent = 'Same ' + st.n + ' drops of ' + strong + '. Doubling ' + who + (st.vary === 'both' ? '' : ' (the other stays the same)') + ' shrinks the pH change from ' +
          f2(Math.abs(one.delta)) + ' to ' + f2(Math.abs(two.delta)) + '.';
      }
    }

    function update(pair, ha, a) { pairNow = pair; haNow = ha; aNow = a; paintControls(); draw(); }
    var node = h('div', { class: 'strength' }, [ctlHost, bars, note]);
    paintControls();
    return { node: node, update: update, state: st };
  }

  return { graph: graph, strength: strength, strengthData: strengthData, MULTS: MULTS };
})();

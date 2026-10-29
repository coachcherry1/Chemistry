/* curve.js: the titration curve as an SVG graph (pH against mL of NaOH added).
 *
 * The curves are drawn from Titration.curve, so they are the same numbers as
 * the particle diagram's pH. Optional parts:
 *   marks    numbered dots (1 to 5) on the first curve at the five points
 *   live     a dot per curve that follows the slider
 *   eqLine   a dashed line at the equivalence volume
 *   pick     click, drag or use the arrow keys to put a marker on a curve
 */

var Curve = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var VW = 440, VH = 300;
  var X0 = 48, X1 = 424, Y0 = 14, Y1 = 250;
  var XMAX = Titration.volume(Titration.MAX_U);       /* 37.5 mL */

  function s(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function xs(mL) { return X0 + mL / XMAX * (X1 - X0); }
  function ys(pH) { return Y1 - pH / 14 * (Y1 - Y0); }

  /* create({ systems: [{ sys, label, cls }], marks, live, eqLine, pick: { sys, onPick } })
       -> { node, setU(u), reach(k), setPick(u), getPick() } */
  function create(opts) {
    opts = opts || {};
    var systems = opts.systems;
    var svg = s('svg', { viewBox: '0 0 ' + VW + ' ' + VH, class: 'curve-svg', role: 'img',
      'aria-label': 'Titration curve: pH against volume of NaOH added' });
    svg.appendChild(s('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, class: 'cplot' }));

    /* grid and axes */
    for (var p = 0; p <= 14; p += 2) {
      svg.appendChild(s('line', { x1: X0, x2: X1, y1: ys(p), y2: ys(p), class: 'cgrid' }));
      svg.appendChild(s('text', { x: X0 - 6, y: ys(p) + 4, class: 'ctick end', text: String(p) }));
    }
    svg.appendChild(s('line', { x1: X0, x2: X1, y1: ys(7), y2: ys(7), class: 'cseven' }));
    svg.appendChild(s('text', { x: X1 - 4, y: ys(7) - 4, class: 'cnote end', text: 'pH 7' }));
    [0, 10, 20, 30].forEach(function (v) {
      svg.appendChild(s('line', { x1: xs(v), x2: xs(v), y1: Y1, y2: Y1 + 5, class: 'caxis' }));
      svg.appendChild(s('text', { x: xs(v), y: Y1 + 18, class: 'ctick mid', text: String(v) }));
    });
    svg.appendChild(s('line', { x1: X0, x2: X1, y1: Y1, y2: Y1, class: 'caxis' }));
    svg.appendChild(s('line', { x1: X0, x2: X0, y1: Y0, y2: Y1, class: 'caxis' }));
    svg.appendChild(s('text', { x: (X0 + X1) / 2, y: VH - 8, class: 'clabel mid', text: 'Volume of NaOH added (mL)' }));
    svg.appendChild(s('text', { x: 13, y: (Y0 + Y1) / 2, class: 'clabel mid', transform: 'rotate(-90 13 ' + (Y0 + Y1) / 2 + ')', text: 'pH' }));

    if (opts.eqLine) {
      var ex = xs(Titration.volume(Titration.UNITS));
      svg.appendChild(s('line', { x1: ex, x2: ex, y1: Y0, y2: Y1, class: 'ceq' }));
      svg.appendChild(s('text', { x: ex + 4, y: Y1 - 6, class: 'cnote', text: '25.00 mL' }));
    }

    /* the curves */
    systems.forEach(function (c, k) {
      var pts = Titration.curve(c.sys).map(function (q) { return xs(q[0]).toFixed(1) + ',' + ys(q[1]).toFixed(1); });
      svg.appendChild(s('polyline', { points: pts.join(' '), class: 'cline ' + (c.cls || 'cl' + k) }));
      if (c.label) {
        var lx = xs(Titration.volume(8)) + 6, ly = ys(Titration.pH(c.sys, 8)) - 8;
        svg.appendChild(s('text', { x: lx, y: ly, class: 'clabel-curve ' + (c.cls || 'cl' + k), text: c.label }));
      }
    });

    /* numbered points on the first curve */
    var marks = [];
    if (opts.marks) {
      Titration.POINTS.forEach(function (pt, i) {
        var g = s('g', { class: 'cmark off', transform: 'translate(' + xs(Titration.volume(pt.u)).toFixed(1) + ' ' +
          ys(Titration.pH(systems[0].sys, pt.u)).toFixed(1) + ')' }, [
          s('circle', { r: 9 }), s('text', { x: 0, y: 0, text: String(i + 1) })]);
        svg.appendChild(g);
        marks.push(g);
      });
    }

    /* a live dot per curve */
    var dots = [];
    if (opts.live) {
      systems.forEach(function (c, k) {
        var d = s('circle', { r: 6, class: 'cdot off ' + (c.cls || 'cl' + k) });
        svg.appendChild(d);
        dots.push(d);
      });
    }

    /* setU(null) hides the dots */
    function setU(u) {
      systems.forEach(function (c, k) {
        if (!dots[k]) return;
        dots[k].classList.toggle('off', u == null);
        if (u == null) return;
        dots[k].setAttribute('cx', xs(Titration.volume(u)).toFixed(1));
        dots[k].setAttribute('cy', ys(Titration.pH(c.sys, u)).toFixed(1));
      });
    }
    function reach(n) { marks.forEach(function (g, i) { g.classList.toggle('off', i >= n); g.classList.toggle('now', i === n - 1); }); }

    /* pick mode: a diamond that sits on one curve; click, drag or arrow keys move it */
    var pickU = null, pickNode = null, hit = null;
    if (opts.pick) {
      var psys = opts.pick.sys;
      pickNode = s('g', { class: 'cpick off' }, [s('path', { d: 'M0 -9 L9 0 L0 9 L-9 0 Z' }), s('text', { x: 0, y: -14, class: 'cpick-label', text: '' })]);
      hit = s('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, class: 'chit', tabindex: '0', role: 'slider',
        'aria-label': 'Move along the curve with the left and right arrow keys, or click the graph',
        'aria-valuemin': '0', 'aria-valuemax': String(Titration.MAX_U), 'aria-valuenow': '0' });
      svg.appendChild(hit);
      svg.appendChild(pickNode);
      var setPick = function (u) {
        u = Math.max(0, Math.min(Titration.MAX_U, Math.round(u)));
        pickU = u;
        pickNode.classList.remove('off');
        pickNode.setAttribute('transform', 'translate(' + xs(Titration.volume(u)).toFixed(1) + ' ' + ys(Titration.pH(psys, u)).toFixed(1) + ')');
        pickNode.querySelector('text').textContent = Titration.volume(u).toFixed(1) + ' mL';
        hit.setAttribute('aria-valuenow', String(u));
        hit.setAttribute('aria-valuetext', Titration.volume(u).toFixed(1) + ' millilitres of NaOH, pH ' + Titration.pH(psys, u).toFixed(1));
        if (opts.pick.onMove) opts.pick.onMove(u);
      };
      var fromEvent = function (ev) {
        var r = svg.getBoundingClientRect();
        var x = (ev.clientX - r.left) / r.width * VW;
        return (x - X0) / (X1 - X0) * XMAX * Titration.UNITS / Titration.ACID_ML;
      };
      var down = false;
      hit.addEventListener('pointerdown', function (ev) { down = true; try { hit.setPointerCapture(ev.pointerId); } catch (e) { /* ok */ } setPick(fromEvent(ev)); });
      hit.addEventListener('pointermove', function (ev) { if (down) setPick(fromEvent(ev)); });
      hit.addEventListener('pointerup', function () { down = false; });
      hit.addEventListener('pointercancel', function () { down = false; });
      hit.addEventListener('keydown', function (ev) {
        var step = ev.key === 'ArrowRight' || ev.key === 'ArrowUp' ? 1 : (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown' ? -1 : 0);
        if (!step) return;
        ev.preventDefault();
        setPick((pickU == null ? 0 : pickU) + step);
      });
      opts.pick.setPick = setPick;
    }

    var node = document.createElement('figure');
    node.className = 'cbox';
    node.appendChild(svg);
    return {
      node: node, setU: setU, reach: reach,
      setPick: function (u) { if (opts.pick) opts.pick.setPick(u); },
      getPick: function () { return pickU; },
      clearPick: function () { pickU = null; if (pickNode) pickNode.classList.add('off'); }
    };
  }

  return { create: create, xs: xs, ys: ys };
})();

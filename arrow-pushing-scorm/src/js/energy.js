/* energy.js: energy diagrams (Klein 6.3 and 6.6), as in the SN1, SN2, E1
 * and E2 activity.
 *
 * points: [{ E, t, ts }] the reactants, every peak and valley, the
 * products, evenly spaced along the reaction coordinate and joined by smooth
 * curves. No numbers are ever printed: the heights are for the shape only.
 *
 * o: axis ('Free energy (G)' or 'Potential energy'), marker (0 to 1), upto
 * (draw the curve only that far), pick (peaks and valleys become buttons:
 * { i: aria label }), found ({ i: 'ts' | 'int' }), dG (the ΔG bracket and
 * its word), Ea (the activation-energy bracket), w, h.
 */

var Energy = (function () {
  'use strict';

  var el = Render.el;

  function draw(points, o) {
    o = o || {};
    var W = o.w || 340, H = o.h || 210;
    var s = el('svg', { class: 'energy ' + (o.cls || ''), role: 'img', 'aria-label': o.label || 'Energy diagram', viewBox: '0 0 ' + W + ' ' + H });
    var x0 = 34, x1 = W - (o.dG ? 70 : 12), y0 = 22, y1 = H - 30;
    var lo = Math.min.apply(null, points.map(function (p) { return p.E; })), hi = Math.max.apply(null, points.map(function (p) { return p.E; }));
    function X(f) { return x0 + 12 + f * (x1 - x0 - 24); }
    function Y(e) { return y1 - 16 - (e - lo) / (hi - lo || 1) * (y1 - y0 - 36); }
    var n = points.length;
    function E(f) {
      var u = f * (n - 1), k = Math.min(n - 2, Math.floor(u)), t = u - k;
      return points[k].E + (points[k + 1].E - points[k].E) * (1 - Math.cos(Math.PI * t)) / 2;
    }
    el('line', { x1: x0, y1: y1, x2: W - 8, y2: y1, class: 'en-axis' }, s);
    el('line', { x1: x0, y1: y1, x2: x0, y2: y0 - 6, class: 'en-axis' }, s);
    el('polygon', { points: [x0 - 4, y0 - 2, x0 + 4, y0 - 2, x0, y0 - 10].join(' '), class: 'en-arrow' }, s);
    el('text', { x: 12, y: (y0 + y1) / 2, class: 'en-axis-text', transform: 'rotate(-90 12 ' + ((y0 + y1) / 2) + ')', 'text-anchor': 'middle' }, s,
      o.axis || 'Free energy (G)');
    el('text', { x: (x0 + x1) / 2, y: H - 8, class: 'en-axis-text', 'text-anchor': 'middle' }, s, 'Reaction coordinate');
    var upto = o.upto == null ? 1 : o.upto;
    var d = '', rest = '';
    for (var k = 0; k <= 160; k++) {
      var f = k / 160, pt = X(f).toFixed(1) + ' ' + Y(E(f)).toFixed(1);
      if (f <= upto + 1e-9) d += (d ? ' L' : 'M') + pt;
      else rest += (rest ? ' L' : 'M') + pt;
    }
    if (rest) el('path', { d: rest, class: 'en-curve rest' }, s);
    el('path', { d: d, class: 'en-curve' }, s);
    /* the ΔG bracket, from reactants to products */
    if (o.dG) {
      var ya = Y(points[0].E), yb = Y(points[n - 1].E), xr = x1 + 8;
      el('line', { x1: X(0), y1: ya, x2: xr + 6, y2: ya, class: 'en-guide' }, s);
      el('line', { x1: X(1), y1: yb, x2: xr + 6, y2: yb, class: 'en-guide' }, s);
      el('line', { x1: xr, y1: ya, x2: xr, y2: yb, class: 'en-bracket' }, s);
      el('text', { x: xr + 8, y: ((ya + yb) / 2 - 2).toFixed(1), class: 'en-dg' }, s, 'ΔG ' + (points[n - 1].E < points[0].E ? '< 0' : '> 0'));
      el('text', { x: xr + 8, y: ((ya + yb) / 2 + 11).toFixed(1), class: 'en-dg-word' }, s, o.dG);
    }
    /* the activation energy, from reactants to the first peak */
    if (o.Ea) {
      var top = 1;
      for (var q = 1; q < n; q++) if (points[q].ts) { top = q; break; }
      var xt = X(top / (n - 1)), yt = Y(points[top].E), yr = Y(points[0].E);
      el('line', { x1: X(0), y1: yr, x2: xt + 10, y2: yr, class: 'en-guide' }, s);
      el('line', { x1: xt, y1: yt + 4, x2: xt, y2: yr, class: 'en-bracket ea' }, s);
      el('text', { x: (xt + 6).toFixed(1), y: ((yt + yr) / 2 + 4).toFixed(1), class: 'en-ea' }, s, 'Eₐ');
    }
    points.forEach(function (p, i) {
      var f = i / (n - 1);
      if (!p.t || f > upto + 1e-9) return;
      /* a point students have to find is not named for them */
      if (o.pick && o.pick[i] != null) return;
      var y = Y(p.E) + (p.ts ? -9 : 15);
      el('text', { x: X(f).toFixed(1), y: y.toFixed(1), 'text-anchor': 'middle', class: 'en-label' + (p.ts ? ' ts' : '') }, s, p.t);
    });
    if (o.pick) {
      Object.keys(o.pick).forEach(function (i) {
        var f = i / (n - 1), x = X(f), y = Y(points[i].E);
        var found = o.found && o.found[i];
        var g = el('g', { class: 'en-pick drop' + (found ? ' found ' + found : ''), 'data-drop': String(i), tabindex: 0, role: 'button', 'aria-label': o.pick[i] }, s);
        el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 11, class: 'slot-box' }, g);
        if (found) el('text', { x: x.toFixed(1), y: (y + (points[i].ts ? -15 : 24)).toFixed(1), 'text-anchor': 'middle', class: 'en-found' }, g,
          found === 'ts' ? 'Transition state' : 'Intermediate');
      });
    }
    if (o.marker != null) {
      var mf = Math.max(0, Math.min(1, o.marker));
      el('circle', { cx: X(mf).toFixed(1), cy: Y(E(mf)).toFixed(1), r: 6.5, class: 'en-marker' }, s);
    }
    s._X = X; s._Y = Y; s._E = E;
    return s;
  }

  /* The peaks (transition states) and valleys (intermediates) of a profile. */
  function kinds(points) {
    var out = {};
    for (var i = 1; i < points.length - 1; i++) {
      if (points[i].E > points[i - 1].E && points[i].E > points[i + 1].E) out[i] = 'ts';
      else if (points[i].E < points[i - 1].E && points[i].E < points[i + 1].E) out[i] = 'int';
    }
    return out;
  }

  return { draw: draw, kinds: kinds };
})();

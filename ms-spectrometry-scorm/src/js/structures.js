/* structures.js — draws the skeletal formulas from the compact spec in
 * compounds.js.
 *
 * Started as the IR package's renderer and has since grown what that package
 * does not need: `opts.keeps`, a list of the vertices a FRAGMENT holds on to.
 * Everything outside that list is ghosted — drawn faintly and dashed — so a
 * student can see which piece walked off and which kept the charge.
 * `opts.charge` puts a + on the atom holding it, and `opts.highlight` picks
 * out an atom that is special for some other reason: the heavier halogen in
 * an M+2 peak, where nothing broke at all.
 * Vertices carrying a heteroatom label are drawn as text and the
 * bonds stop short of them; bare vertices are ordinary chain carbons.
 */

var Structure = (function () {
  var NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* Pull a bond end back so it meets the edge of a label instead of its centre. */
  function shrink(ax, ay, bx, by, back) {
    var dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    return [bx - dx / len * back, by - dy / len * back];
  }

  function render(spec, opts) {
    opts = opts || {};
    var scale = opts.scale || 34, pad = 22;
    var pts = spec.pts, labels = spec.labels || {};

    /* With no `keeps` every vertex is kept, which is the ordinary drawing. */
    var kept = null;
    if (opts.keeps) {
      kept = {};
      opts.keeps.forEach(function (i) { kept[i] = true; });
    }
    function isKept(i) { return !kept || kept[i]; }

    var xs = pts.map(function (p) { return p[0]; });
    var ys = pts.map(function (p) { return p[1]; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);

    var w = (maxX - minX) * scale + pad * 2;
    var h = (maxY - minY) * scale + pad * 2;

    /* y is flipped so positive y in the spec reads as "up" on screen */
    function X(i) { return (pts[i][0] - minX) * scale + pad; }
    function Y(i) { return (maxY - pts[i][1]) * scale + pad; }

    var svg = el('svg', {
      viewBox: '0 0 ' + w.toFixed(1) + ' ' + h.toFixed(1),
      class: 'structure', role: 'img',
      'aria-label': opts.alt || 'skeletal structure'
    });

    /* aromatic rings get an inner circle rather than alternating double bonds */
    (spec.rings || []).forEach(function (ring) {
      var cx = 0, cy = 0;
      ring.forEach(function (i) { cx += X(i); cy += Y(i); });
      cx /= ring.length; cy /= ring.length;
      var r = Math.hypot(X(ring[0]) - cx, Y(ring[0]) - cy) * 0.58;
      svg.appendChild(el('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: r.toFixed(1),
                                     class: 'bond', fill: 'none' }));
    });

    spec.bonds.forEach(function (bond) {
      var i = bond[0], j = bond[1], order = bond[2] || 1;
      var ax = X(i), ay = Y(i), bx = X(j), by = Y(j);
      if (labels[i]) { var a = shrink(bx, by, ax, ay, 13); ax = a[0]; ay = a[1]; }
      if (labels[j]) { var b = shrink(ax, ay, bx, by, 13); bx = b[0]; by = b[1]; }

      var dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
      var nx = -dy / len, ny = dx / len;
      var offsets = order === 1 ? [0] : order === 2 ? [-2.6, 2.6] : [-3.4, 0, 3.4];
      /* A bond is part of the fragment only if BOTH its ends are — so the
         bond that broke is ghosted along with everything past it. */
      var cls = 'bond' + (isKept(i) && isKept(j) ? '' : ' lost');

      offsets.forEach(function (o) {
        svg.appendChild(el('line', {
          x1: (ax + nx * o).toFixed(1), y1: (ay + ny * o).toFixed(1),
          x2: (bx + nx * o).toFixed(1), y2: (by + ny * o).toFixed(1), class: cls
        }));
      });
    });

    Object.keys(labels).forEach(function (i) {
      var lit = opts.highlight != null && +i === opts.highlight;
      var text = el('text', { x: X(+i).toFixed(1), y: Y(+i).toFixed(1),
                              class: 'atom' + (isKept(+i) ? '' : ' lost') +
                                     (lit ? ' heavy' : ''),
                              'text-anchor': 'middle',
                              'dominant-baseline': 'central' });
      text.textContent = labels[i];
      svg.appendChild(text);
    });

    /* The + goes on the far side of the atom from its remaining bonds, so it
       never lands on top of one. */
    if (opts.charge != null && opts.charge >= 0) {
      var c = opts.charge, cx = X(c), cy = Y(c), ux = 0, uy = 0;
      spec.bonds.forEach(function (bond) {
        var other = bond[0] === c ? bond[1] : bond[1] === c ? bond[0] : -1;
        if (other < 0 || !isKept(other)) return;
        var vx = X(other) - cx, vy = Y(other) - cy, l = Math.hypot(vx, vy) || 1;
        ux += vx / l; uy += vy / l;
      });
      var m = Math.hypot(ux, uy);
      if (m < 0.01) { ux = 0; uy = -1; m = 1; }
      var plus = el('text', {
        x: (cx - ux / m * 13).toFixed(1), y: (cy - uy / m * 13).toFixed(1),
        class: 'charge', 'text-anchor': 'middle', 'dominant-baseline': 'central'
      });
      plus.textContent = '+';
      svg.appendChild(plus);
    }

    return svg;
  }

  return { render: render };
})();

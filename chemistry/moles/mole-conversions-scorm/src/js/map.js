/* map.js: the Mole Town map, laid out as the class's paper copy (turned to
 * landscape): volume at STP above moles of A, particles to the left, mass to
 * the right, the ratio road down to moles of B, and the same again for B.
 *
 * In a problem, A is the substance and B the element counted in it; each
 * node names its unit (g SBr2, atoms Br). The start is blue, the target
 * yellow, the unit the chain has reached so far is ringed, and every road a
 * placed factor uses is lit. Roads a substance does not have (22.4 L for a
 * liquid, particles of an ionic compound) are greyed. In the first step the
 * roads are buttons.
 */
var MoleMap = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var W = 420, H = 280, RX = 50, RY = 23;
  var POS = {
    'A:L': [210, 26], 'A:part': [52, 102], 'A:mol': [210, 102], 'A:g': [368, 102],
    'B:part': [52, 178], 'B:mol': [210, 178], 'B:g': [368, 178], 'B:L': [210, 254]
  };
  var ROADS = [
    { id: 'A:stp', a: 'A:L', b: 'A:mol', label: ['22.4 L = 1 mol'] },
    { id: 'A:av', a: 'A:part', b: 'A:mol', label: ['Avogadro’s', 'number'] },
    { id: 'A:mm', a: 'A:mol', b: 'A:g', label: ['periodic', 'table'] },
    { id: 'ratio', a: 'A:mol', b: 'B:mol', label: ['ratio'] },
    { id: 'B:av', a: 'B:part', b: 'B:mol', label: ['Avogadro’s', 'number'] },
    { id: 'B:mm', a: 'B:mol', b: 'B:g', label: ['periodic', 'table'] },
    { id: 'B:stp', a: 'B:mol', b: 'B:L', label: ['22.4 L = 1 mol'] }
  ];
  var GENERIC = {
    'A:L': ['Volume of A', 'at STP'], 'A:part': ['Particles', 'of A'], 'A:mol': ['Moles', 'of A'], 'A:g': ['Mass', 'of A'],
    'B:L': ['Volume of B', 'at STP'], 'B:part': ['Particles', 'of B'], 'B:mol': ['Moles', 'of B'], 'B:g': ['Mass', 'of B']
  };

  function svg(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] != null) n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }

  /* Where a road's line runs: between the two ellipses' edges. */
  function ends(r) {
    var a = POS[r.a], b = POS[r.b];
    if (a[1] === b[1]) return [a[0] + RX, a[1], b[0] - RX, b[1]];
    return [a[0], a[1] + RY, b[0], b[1] - RY];
  }

  /* opts: { A, B, interactive, onRoad(id) } */
  function create(opts) {
    opts = opts || {};
    var A = opts.A ? Chem.sp(opts.A) : null, B = opts.B ? Chem.sp(opts.B) : null;
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'molemap' + (opts.interactive ? ' interactive' : ''),
      role: opts.interactive ? 'group' : 'img',
      'aria-label': 'Mole Town map: mass, particles and volume at STP of A all join moles of A; the ratio joins moles of A to moles of B.' });

    function labelFor(node) {
      var role = node.split(':')[0], kind = node.split(':')[1];
      var s = role === 'A' ? A : B;
      if (!s) return { lines: GENERIC[node], off: !!A };
      if (kind === 'L') return { lines: ['L at STP', s.gas ? s.disp : (role === 'B' ? 'not used' : 'not a gas')], off: !s.gas || role === 'B' };
      if (kind === 'part') return { lines: [s.part || 'particles', s.part ? s.disp : 'not used'], off: !s.part };
      return { lines: [kind, s.disp], off: false };
    }
    function roadOff(r) {
      if (!A) return false;
      var role = r.id === 'ratio' ? null : r.id.split(':')[0], type = r.id.split(':')[1];
      if (r.id === 'ratio') return !B;
      var s = role === 'A' ? A : B;
      if (!s) return true;
      if (type === 'stp') return !s.gas || role === 'B';
      if (type === 'av') return !s.part;
      return false;
    }

    var roadEls = {}, nodeEls = {};
    ROADS.forEach(function (r) {
      var e = ends(r), g = svg('g', { class: 'road' + (roadOff(r) ? ' off' : ''), 'data-road': r.id });
      g.appendChild(svg('line', { x1: e[0], y1: e[1], x2: e[2], y2: e[3], class: 'road-hit' }));
      g.appendChild(svg('line', { x1: e[0], y1: e[1], x2: e[2], y2: e[3], class: 'road-line' }));
      var horiz = e[1] === e[3];
      r.label.forEach(function (t, i) {
        var x = horiz ? (e[0] + e[2]) / 2 : e[0] + 7;
        var y = horiz ? e[1] - 6 - (r.label.length - 1 - i) * 12 : (e[1] + e[3]) / 2 + 4 + (i - (r.label.length - 1) / 2) * 12;
        g.appendChild(svg('text', { x: x, y: y, class: 'road-label', 'text-anchor': horiz ? 'middle' : 'start' }, t));
      });
      if (opts.interactive && !roadOff(r)) {
        g.setAttribute('role', 'button');
        g.setAttribute('tabindex', '0');
        g.setAttribute('aria-label', 'Road: ' + r.label.join(' '));
        var go = function () { if (opts.onRoad) opts.onRoad(r.id); };
        g.addEventListener('click', go);
        g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
      }
      roadEls[r.id] = g;
      root.appendChild(g);
    });
    Object.keys(POS).forEach(function (node) {
      var p = POS[node], lab = labelFor(node);
      var g = svg('g', { class: 'node' + (lab.off ? ' off' : ''), 'data-node': node });
      g.appendChild(svg('ellipse', { cx: p[0], cy: p[1], rx: RX, ry: RY }));
      g.appendChild(svg('text', { x: p[0], y: p[1] - 4, class: 'node-unit', 'text-anchor': 'middle' }, lab.lines[0]));
      g.appendChild(svg('text', { x: p[0], y: p[1] + 13, class: 'node-sub', 'text-anchor': 'middle' }, lab.lines[1]));
      nodeEls[node] = g;
      root.appendChild(g);
    });

    /* map role of a unit token: 'g|SBr2' -> 'A:g' */
    function nodeOf(t) {
      if (!t || !A) return null;
      var u = Chem.untok(t);
      var role = u.key === A.key ? 'A' : (B && u.key === B.key ? 'B' : null);
      return role ? role + ':' + u.node : null;
    }
    function roadOf(edgeId) {
      var e = Chem.edge(edgeId);
      if (e.type === 'ratio') return 'ratio';
      var role = A && e.s === A.key ? 'A' : 'B';
      return role + ':' + e.type;
    }

    /* st: { start, target, here (tokens), lit: [edge ids], seen: {road id: 1} } */
    function update(st) {
      st = st || {};
      var lit = {};
      (st.lit || []).forEach(function (id) { lit[roadOf(id)] = 1; });
      Object.keys(roadEls).forEach(function (id) {
        roadEls[id].classList.toggle('lit', !!lit[id]);
        roadEls[id].classList.toggle('seen', !!(st.seen && st.seen[id]));
      });
      var s = nodeOf(st.start), t = nodeOf(st.target), here = nodeOf(st.here);
      Object.keys(nodeEls).forEach(function (n) {
        nodeEls[n].classList.toggle('start', n === s);
        nodeEls[n].classList.toggle('target', n === t);
        nodeEls[n].classList.toggle('here', n === here && n !== s);
      });
    }

    return { el: root, update: update, roadOf: roadOf, ROADS: ROADS };
  }

  return { create: create, ROADS: ROADS };
})();

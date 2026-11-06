/* mol2d.js: Lewis structures as SVG, one molecule or several side by side.
 *
 * Every atom and every bond is drawn, and every lone pair as two dots (from
 * chem.js), so the lone pair a hydrogen bond reaches for is always on the
 * page. A scene places molecules at offsets, turned and mirrored, so the H of
 * one can face a lone pair of another. Hydrogen bonds are drawn as dashed
 * lines from the H to the middle of the lone pair.
 *
 * What can be clicked is chosen by the caller: H atoms (opts.pickH) and lone
 * pairs (opts.pickLP). Clickable parts carry data-m (which molecule), data-a
 * (which atom) and data-k (which lone pair on it), a tab stop and a label.
 */

var Mol2D = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null || attrs[k] === false) return;
      if (k === 'text') n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function halfW(sym) { return sym.length > 1 ? 12 : 7.5; }

  /* items: [{ id, x, y, rot, flip, name }]; x, y in bond lengths
     opts: unit (px per bond), pickH, pickLP, charges, hb ([{ from: [m, a],
           to: [m, a, k], cls }]), mark ({ 'm:a': 'good' | 'bad' }), title,
           names (show each molecule's name under it), cls */
  function scene(items, opts) {
    opts = opts || {};
    var U = opts.unit || 46;
    var mols = items.map(function (it, m) {
      var s = SUBSTANCES[it.id], info = Chem.sub(it.id);
      var rot = (it.rot || 0) * Math.PI / 180, c = Math.cos(rot), sn = Math.sin(rot);
      function place(x, y) {
        if (it.flip) x = -x;
        return [((x * c - y * sn) + (it.x || 0)) * U, ((x * sn + y * c) + (it.y || 0)) * U];
      }
      var pts = s.atoms.map(function (a) { return place(a[1], a[2]); });
      var lps = s.atoms.map(function (a, i) {
        return Chem.lpAngles(s, i, info.lp[i]).map(function (deg) {
          var d = it.flip ? 180 - deg : deg;
          return d + (it.rot || 0);
        });
      });
      return { it: it, s: s, info: info, pts: pts, lps: lps, m: m };
    });

    function lpDots(mol, i, k) {
      var p = mol.pts[i], ang = mol.lps[i][k] * Math.PI / 180, sym = mol.s.atoms[i][0];
      var r = halfW(sym) + 9;
      var u = [Math.cos(ang), Math.sin(ang)], perp = [-u[1], u[0]];
      var mid = [p[0] + u[0] * r, p[1] + u[1] * r];
      return { mid: mid, a: [mid[0] - 4.5 * perp[0], mid[1] - 4.5 * perp[1]], b: [mid[0] + 4.5 * perp[0], mid[1] + 4.5 * perp[1]] };
    }

    var root = el('svg', { class: 'mol' + (opts.cls ? ' ' + opts.cls : ''), role: 'img' });
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    function grow(x, y, r) {
      minX = Math.min(minX, x - r); maxX = Math.max(maxX, x + r);
      minY = Math.min(minY, y - r); maxY = Math.max(maxY, y + r);
    }

    var gB = el('g', { class: 'bonds' }), gHB = el('g', { class: 'hbonds' }), gA = el('g', { class: 'atoms' });
    root.appendChild(gHB); root.appendChild(gB); root.appendChild(gA);

    mols.forEach(function (mol) {
      mol.s.bonds.forEach(function (b) {
        var p = mol.pts[b[0]], q = mol.pts[b[1]];
        var dx = q[0] - p[0], dy = q[1] - p[1], L = Math.sqrt(dx * dx + dy * dy) || 1;
        var u = [dx / L, dy / L], perp = [-u[1], u[0]];
        var ra = halfW(mol.s.atoms[b[0]][0]) + 4, rb = halfW(mol.s.atoms[b[1]][0]) + 4;
        var offs = b[2] === 1 ? [0] : b[2] === 2 ? [-3.2, 3.2] : [-5.5, 0, 5.5];
        offs.forEach(function (o) {
          gB.appendChild(el('line', { class: 'bond', x1: p[0] + u[0] * ra + perp[0] * o, y1: p[1] + u[1] * ra + perp[1] * o,
            x2: q[0] - u[0] * rb + perp[0] * o, y2: q[1] - u[1] * rb + perp[1] * o }));
        });
      });
      var q = opts.charges ? partial(mol) : null;
      mol.s.atoms.forEach(function (a, i) {
        var p = mol.pts[i], sym = a[0];
        grow(p[0], p[1], 18);
        var key = mol.m + ':' + i;
        var pick = opts.pickH && sym === 'H';
        var g = el('g', { class: 'atom el-' + sym.toLowerCase() + (pick ? ' pick' : '') + (opts.mark && opts.mark[key] ? ' mark-' + opts.mark[key] : ''),
          'data-m': mol.m, 'data-a': i });
        if (pick) {
          g.setAttribute('tabindex', '0');
          g.setAttribute('role', 'button');
          var on = Chem.neighbours(mol.s, i).map(function (j) { return mol.s.atoms[j][0]; })[0];
          g.setAttribute('aria-label', 'H bonded to ' + on + ' in ' + (mol.it.name || mol.info.name));
        }
        g.appendChild(el('circle', { class: 'atom-ring', cx: p[0], cy: p[1], r: halfW(sym) + 5 }));
        g.appendChild(el('text', { class: 'sym', x: p[0], y: p[1], text: sym }));
        gA.appendChild(g);
        if (q && Math.abs(q[i]) > 0.01) {
          var away = awayFrom(mol, i);
          var tx = p[0] + away[0] * 17, ty = p[1] + away[1] * 17;
          gA.appendChild(el('text', { class: 'delta ' + (q[i] < 0 ? 'neg' : 'pos'), x: tx, y: ty, text: q[i] < 0 ? 'δ−' : 'δ+' }));
          grow(tx, ty, 12);
        }
        for (var k = 0; k < (mol.info.lp[i] || 0); k++) {
          var d = lpDots(mol, i, k);
          var pickL = opts.pickLP && Chem.NOF[sym];
          var lg = el('g', { class: 'lp' + (pickL ? ' pick' : ''), 'data-m': mol.m, 'data-a': i, 'data-k': k });
          if (pickL) {
            lg.setAttribute('tabindex', '0');
            lg.setAttribute('role', 'button');
            lg.setAttribute('aria-label', 'Lone pair ' + (k + 1) + ' on ' + sym + ' in ' + (mol.it.name || mol.info.name));
            lg.appendChild(el('circle', { class: 'lp-hit', cx: d.mid[0], cy: d.mid[1], r: 9 }));
          }
          lg.appendChild(el('circle', { class: 'dot', cx: d.a[0], cy: d.a[1], r: 2.4 }));
          lg.appendChild(el('circle', { class: 'dot', cx: d.b[0], cy: d.b[1], r: 2.4 }));
          gA.appendChild(lg);
          grow(d.mid[0], d.mid[1], 10);
        }
      });
      if (opts.names !== false && (mol.it.name || opts.names)) {
        var xs = mol.pts.map(function (p) { return p[0]; }), ys = mol.pts.map(function (p) { return p[1]; });
        var nx = (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2, ny = Math.max.apply(null, ys) + 34;
        gA.appendChild(el('text', { class: 'mol-name', x: nx, y: ny, text: mol.it.name || mol.info.name }));
        grow(nx, ny, 10);
      }
    });

    (opts.hb || []).forEach(function (b) { gHB.appendChild(hbLine(b)); });

    function hbLine(b) {
      var from = mols[b.from[0]], to = mols[b.to[0]];
      var p = from.pts[b.from[1]], d = lpDots(to, b.to[1], b.to[2]).mid;
      var dx = d[0] - p[0], dy = d[1] - p[1], L = Math.sqrt(dx * dx + dy * dy) || 1;
      var s0 = 11;
      return el('line', { class: 'hb ' + (b.cls || ''), x1: p[0] + dx / L * s0, y1: p[1] + dy / L * s0, x2: d[0] - dx / L * 5, y2: d[1] - dy / L * 5 });
    }

    var pad = 10;
    root.setAttribute('viewBox', [minX - pad, minY - pad, maxX - minX + 2 * pad, maxY - minY + 2 * pad].join(' '));
    root.setAttribute('width', Math.round((maxX - minX + 2 * pad) * (opts.scale || 1)));
    root.setAttribute('height', Math.round((maxY - minY + 2 * pad) * (opts.scale || 1)));
    root.setAttribute('aria-label', opts.title || items.map(function (it) { return Chem.sub(it.id).name; }).join(' and '));

    return {
      svg: root, mols: mols,
      addHB: function (b) { gHB.appendChild(hbLine(b)); },
      clearHB: function () { gHB.innerHTML = ''; }
    };
  }

  /* δ+ and δ− on the ends of polar bonds (an electronegativity difference of
     0.4 or more), the same rule chem.js uses */
  function partial(mol) {
    var q = mol.s.atoms.map(function () { return 0; });
    if (!mol.info.polar) return q;
    mol.s.bonds.forEach(function (b) {
      var x = ELEMENTS[mol.s.atoms[b[0]][0]].en, y = ELEMENTS[mol.s.atoms[b[1]][0]].en;
      if (Math.abs(x - y) < 0.4) return;
      q[b[0]] += x > y ? -1 : 1;
      q[b[1]] += x > y ? 1 : -1;
    });
    return q;
  }

  /* a direction pointing away from an atom's bonds, for its δ label */
  function awayFrom(mol, i) {
    var p = mol.pts[i], sx = 0, sy = 0;
    Chem.neighbours(mol.s, i).forEach(function (j) { sx += mol.pts[j][0] - p[0]; sy += mol.pts[j][1] - p[1]; });
    var L = Math.sqrt(sx * sx + sy * sy);
    if (L < 1e-6) return [0.7, -0.7];
    var u = [-sx / L, -sy / L];
    /* tilt it a little so it misses a lone pair straight out the back */
    return [u[0] * 0.8 - u[1] * 0.6, u[1] * 0.8 + u[0] * 0.6];
  }

  /* one molecule on its own */
  function figure(id, opts) {
    return scene([{ id: id, x: 0, y: 0 }], Object.assign({ names: false, scale: 0.72 }, opts || {})).svg;
  }

  return { scene: scene, figure: figure };
})();

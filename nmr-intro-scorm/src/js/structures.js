/* structures.js — draws a compound as a condensed structural formula: every
 * carbon is labelled (CH₃, CH₂, C ...) and every group that carries hydrogen
 * is drawn as a capsule, because the hydrogen-bearing groups are what the
 * whole activity is about. Bare ring vertices stay skeletal.
 *
 * Everything - bonds, labels, capsules, badges - lives in one SVG, so the
 * capsules scale with the drawing and a capsule can be clicked, focused and
 * dropped on wherever the SVG is shown.
 *
 * Callers style each capsule through opts.pill(atomIndex, atom), returning
 *   cls     extra classes, e.g. 'c2' for the third set colour
 *   badge   a letter in a circle on the capsule's corner
 *   sub     a caption under the capsule
 *   target  focusable and clickable; `label` is then its accessible name
 *   slot    data-slot value, for drop targets that stand for a whole set
 *   flag    outlined in red - the groups a feedback message is about
 *
 * opts.reserveSub keeps room for captions that have not appeared yet, so the
 * drawing does not jump when the first one does.
 */

var Structure = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var BOND = 84;      /* viewBox units per bond */
  var FONT = 17;
  var PILL_H = 28;
  var PAD = 10;

  function el(name, attrs, text) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  /* Rough advance widths, enough to size a label's box. Using fixed metrics
     rather than measuring keeps the drawing identical whether or not it is
     on screen yet. */
  function textWidth(s) {
    var w = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i), ch = s[i];
      if (c >= 0x2080 && c <= 0x2089) w += 0.56;
      else if (ch >= 'A' && ch <= 'Z') w += 0.70;
      else if (ch >= 'a' && ch <= 'z') w += 0.52;
      else w += 0.62;
    }
    return w * FONT;
  }

  function boxOf(atom, isPill) {
    if (isPill) return { hw: textWidth(atom.t) / 2 + 10, hh: PILL_H / 2 };
    if (atom.t) return { hw: textWidth(atom.t) / 2 + 3, hh: 11 };
    return { hw: 0, hh: 0 };
  }

  /* How far a bond must stop short of a label's centre to clear its box. */
  function reach(b, ux, uy) {
    if (!b.hw) return 0;
    var tx = Math.abs(ux) > 1e-6 ? b.hw / Math.abs(ux) : Infinity;
    var ty = Math.abs(uy) > 1e-6 ? b.hh / Math.abs(uy) : Infinity;
    return Math.min(tx, ty) + 4;
  }

  function render(mol, opts) {
    opts = opts || {};
    var atoms = mol.atoms;
    var specs = atoms.map(function (a, i) {
      return a.h > 0 ? ((opts.pill && opts.pill(i, a)) || {}) : null;
    });
    var boxes = atoms.map(function (a, i) { return boxOf(a, !!specs[i]); });
    var hasSub = !!opts.reserveSub || specs.some(function (p) { return p && p.sub; });

    var px = atoms.map(function (a) { return a.x * BOND; });
    var py = atoms.map(function (a) { return -a.y * BOND; });

    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    atoms.forEach(function (a, i) {
      var b = boxes[i], extra = specs[i] ? 9 : 0;
      minX = Math.min(minX, px[i] - b.hw);
      maxX = Math.max(maxX, px[i] + b.hw + extra);
      minY = Math.min(minY, py[i] - b.hh - extra);
      maxY = Math.max(maxY, py[i] + b.hh + (specs[i] && hasSub ? 20 : 0));
    });
    var w = maxX - minX + PAD * 2, h = maxY - minY + PAD * 2;
    function X(i) { return px[i] - minX + PAD; }
    function Y(i) { return py[i] - minY + PAD; }

    var interactive = specs.some(function (p) { return p && p.target; });
    var svg = el('svg', {
      viewBox: '0 0 ' + w.toFixed(1) + ' ' + h.toFixed(1),
      width: w.toFixed(0), height: h.toFixed(0),
      class: 'structure', role: interactive ? 'group' : 'img',
      'aria-label': opts.alt || mol.name
    });
    svg.style.maxWidth = Math.round(w * (opts.zoom || 1)) + 'px';

    /* aromatic rings get an inner circle rather than alternating double bonds */
    (mol.rings || []).forEach(function (ring) {
      var cx = 0, cy = 0;
      ring.forEach(function (i) { cx += X(i); cy += Y(i); });
      cx /= ring.length; cy /= ring.length;
      svg.appendChild(el('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1),
                                     r: (BOND * 0.5).toFixed(1), class: 'bond', fill: 'none' }));
    });

    mol.bonds.forEach(function (bond) {
      var i = bond[0], j = bond[1], order = bond[2] || 1;
      var ax = X(i), ay = Y(i), bx = X(j), by = Y(j);
      var dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
      var ux = dx / len, uy = dy / len;
      var r0 = reach(boxes[i], ux, uy), r1 = reach(boxes[j], ux, uy);
      if (len - r0 - r1 < 3) return;
      var sx = ax + ux * r0, sy = ay + uy * r0, ex = bx - ux * r1, ey = by - uy * r1;
      var nx = -uy, ny = ux;
      var offsets = order === 1 ? [0] : order === 2 ? [-3.4, 3.4] : [-5, 0, 5];
      offsets.forEach(function (o) {
        svg.appendChild(el('line', {
          x1: (sx + nx * o).toFixed(1), y1: (sy + ny * o).toFixed(1),
          x2: (ex + nx * o).toFixed(1), y2: (ey + ny * o).toFixed(1), class: 'bond'
        }));
      });
    });

    /* atoms with no hydrogen: plain text, or nothing for a bare ring vertex */
    atoms.forEach(function (a, i) {
      if (specs[i] || !a.t) return;
      svg.appendChild(el('text', { x: X(i).toFixed(1), y: Y(i).toFixed(1), class: 'atom',
                                   'text-anchor': 'middle', 'dominant-baseline': 'central' }, a.t));
    });

    /* hydrogen-bearing groups: capsules */
    atoms.forEach(function (a, i) {
      var p = specs[i];
      if (!p) return;
      var b = boxes[i], x = X(i), y = Y(i);
      var cls = 'pill' + (p.cls ? ' ' + p.cls : '') + (p.target ? ' target' : '') +
                (p.flag ? ' flag' : '');
      var g = el('g', { class: cls, 'data-node': i,
                        'data-slot': p.slot != null ? p.slot : null });
      if (p.target) {
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', p.label || a.t);
      }
      g.appendChild(el('rect', { x: (x - b.hw).toFixed(1), y: (y - b.hh).toFixed(1),
                                 width: (b.hw * 2).toFixed(1), height: (b.hh * 2).toFixed(1),
                                 rx: b.hh.toFixed(1) }));
      g.appendChild(el('text', { x: x.toFixed(1), y: y.toFixed(1), class: 'pill-text',
                                 'text-anchor': 'middle', 'dominant-baseline': 'central' }, a.t));
      if (p.badge) {
        var bx = x + b.hw - 2, by = y - b.hh + 1;
        g.appendChild(el('circle', { cx: bx.toFixed(1), cy: by.toFixed(1), r: 9.5, class: 'badge' }));
        g.appendChild(el('text', { x: bx.toFixed(1), y: by.toFixed(1), class: 'badge-text',
                                   'text-anchor': 'middle', 'dominant-baseline': 'central' }, p.badge));
      }
      if (p.sub) {
        g.appendChild(el('text', { x: x.toFixed(1), y: (y + b.hh + 13).toFixed(1), class: 'pill-sub',
                                   'text-anchor': 'middle', 'dominant-baseline': 'central' }, p.sub));
      }
      svg.appendChild(g);
    });

    return svg;
  }

  return { render: render, BOND: BOND };
})();

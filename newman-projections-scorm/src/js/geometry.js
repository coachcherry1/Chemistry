/* geometry.js — from a wedge/dash drawing to a Newman projection and a 3D model.
 *
 * Every molecule is authored the way a student sees it: a zigzag in the plane
 * of the page, and on each of the two central carbons one group in the plane
 * (the chain), one on a wedge and one on a dash. The Newman projection the
 * student has to build is then COMPUTED from that drawing, never typed in by
 * hand, so the answer key cannot disagree with the picture.
 *
 * Frames:
 *   world   the page: x right, y up, z out of the page toward the reader.
 *           A wedge points toward +z, a dash toward −z.
 *   newman  x along the C–C bond from front to back, y = "up" in the Newman
 *           projection, z = "right". Angles are measured clockwise from up,
 *           as the viewer at the front carbon sees them.
 *
 * With the eye placed where the zigzag drawing puts it and the front chain
 * group straight up, every wedge lands on the LEFT of the Newman projection
 * and every dash on the RIGHT. tools/validate.js checks this.
 */

var GEOM = (function () {
  'use strict';

  var CC = 1.54;
  var TET = Math.acos(-1 / 3);                  /* 109.47° */
  var AX = 1 / 3, PERP = Math.sqrt(8) / 3;      /* tetrahedral bond components */
  var HALF = Math.acos(1 / Math.sqrt(3));       /* 54.74°, half the tetrahedral angle */

  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function unit(a) { var l = Math.sqrt(dot(a, a)); return [a[0] / l, a[1] / l, a[2] / l]; }

  /* ---- the zigzag as drawn on the page */

  var Z = Math.PI / 2 - HALF;                   /* 35.26°: chain bonds' tilt */
  var U = [Math.cos(Z), -Math.sin(Z), 0];       /* C2 → C3, down and to the right */
  var CHAIN = {
    front: [-Math.cos(Z), -Math.sin(Z), 0],     /* C2 → C1, down and to the left */
    back:  [Math.cos(Z), Math.sin(Z), 0]        /* C3 → C4, up and to the right */
  };
  var c = Math.cos(HALF), s = Math.sin(HALF);
  var OUT = { front: [0, 1, 0], back: [0, -1, 0] };   /* bisector away from the chain */
  var WORLD_DIRS = {
    front: { anchor: CHAIN.front, wedge: [0, c, s],  dash: [0, c, -s] },
    back:  { anchor: CHAIN.back,  wedge: [0, -c, s], dash: [0, -c, -s] }
  };

  /* ---- the Newman frame */

  var W = U;
  var UP = unit(sub(CHAIN.front, mul(W, dot(CHAIN.front, W))));
  var RIGHT = cross(W, UP);

  function wrap(a) { return ((a % 360) + 360) % 360; }

  function newmanAngle(d) {
    var p = sub(d, mul(W, dot(d, W)));
    var a = Math.atan2(dot(p, RIGHT), dot(p, UP)) * 180 / Math.PI;
    return wrap(Math.round(a));
  }

  var ROLES = ['anchor', 'dash', 'wedge'];

  /* The Newman projection of the molecule as drawn: the front chain group at
     0°, so the back chain group sits at 180°. */
  function newmanOf(mol) {
    var out = { front: [], back: [] };
    ['front', 'back'].forEach(function (side) {
      ROLES.forEach(function (role) {
        out[side].push({ g: mol[side][role], a: newmanAngle(WORLD_DIRS[side][role]), role: role });
      });
      out[side].sort(function (p, q) { return p.a - q.a; });
    });
    return out;
  }

  /* The reference dihedral (the graph's x axis) at the drawn conformation. */
  function refAngles(mol) {
    var nm = newmanOf(mol);
    function find(side) {
      var role = mol.ref[side === 'front' ? 0 : 1];
      for (var i = 0; i < nm[side].length; i++) if (nm[side][i].role === role) return nm[side][i].a;
      return 0;
    }
    return { front: find('front'), back: find('back') };
  }

  function phi0(mol) {
    var r = refAngles(mol);
    return wrap(r.back - r.front);
  }

  /* Back-carbon rotation that gives reference dihedral `phi`. */
  function deltaFor(mol, phi) { return wrap(phi - phi0(mol)); }

  /* Newman description with the back carbon turned to dihedral `phi`. */
  function newmanAt(mol, phi) {
    var nm = newmanOf(mol), d = deltaFor(mol, phi);
    return {
      front: nm.front.map(function (p) { return { g: p.g, a: p.a, role: p.role }; }),
      back: nm.back.map(function (p) { return { g: p.g, a: wrap(p.a + d), role: p.role }; })
    };
  }

  function energyAt(mol, phi) {
    return STRAIN.energy(newmanOf(mol), deltaFor(mol, phi));
  }

  function breakdownAt(mol, phi) {
    return STRAIN.breakdown(newmanOf(mol), deltaFor(mol, phi));
  }

  /* ---- 3D atoms */

  /* Place D bonded to C, given bond length r, angle B–C–D and dihedral A–B–C–D. */
  function place(A, B, C, r, angle, dihedral) {
    var bc = unit(sub(C, B));
    var n = unit(cross(sub(B, A), bc));
    var m = cross(n, bc);
    var t = dihedral * Math.PI / 180;
    var d = [-r * Math.cos(angle), r * Math.sin(angle) * Math.cos(t), r * Math.sin(angle) * Math.sin(t)];
    return add(C, add(mul(bc, d[0]), add(mul(m, d[1]), mul(n, d[2]))));
  }

  function toWorld(p) { return add(add(mul(W, p[0]), mul(UP, p[1])), mul(RIGHT, p[2])); }

  /* All atoms and bonds with the back carbon turned to dihedral `phi`, in
     world (page) coordinates. Each atom knows which carbon it hangs from. */
  function atoms(mol, phi) {
    var nm = newmanAt(mol, phi);
    var list = [], bonds = [];
    var C2 = [0, 0, 0], C3 = [CC, 0, 0];
    list.push({ el: 'C', p: C2, side: 'front', center: true });
    list.push({ el: 'C', p: C3, side: 'back', center: true });
    bonds.push([0, 1]);

    function grow(gk, pos, parentPos, grandPos, parentIdx, side) {
      var grp = GROUPS[gk];
      var idx = list.length;
      list.push({ el: grp.el, p: pos, side: side, group: gk });
      bonds.push([parentIdx, idx]);
      (grp.kids || []).forEach(function (k, i) {
        var kp = place(grandPos, parentPos, pos, GROUPS[k].bond, TET, [180, 60, 300][i]);
        grow(k, kp, pos, parentPos, idx, side);
      });
    }

    nm.front.forEach(function (q) {
      var t = q.a * Math.PI / 180;
      var dir = [-AX, PERP * Math.cos(t), PERP * Math.sin(t)];
      grow(q.g, mul(dir, GROUPS[q.g].bond), C2, C3, 0, 'front');
    });
    nm.back.forEach(function (q) {
      var t = q.a * Math.PI / 180;
      var dir = [AX, PERP * Math.cos(t), PERP * Math.sin(t)];
      grow(q.g, add(C3, mul(dir, GROUPS[q.g].bond)), C3, C2, 1, 'back');
    });

    list.forEach(function (at) { at.p = toWorld(at.p); });
    return { atoms: list, bonds: bonds, center: toWorld([CC / 2, 0, 0]) };
  }

  /* Camera orientations as rows of a rotation matrix (world → camera).
     The camera looks down its own −z. */
  var VIEWS = {
    page: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    newman: [RIGHT, UP, mul(W, -1)]
  };

  /* ---- the 2D wedge/dash drawing (page coordinates in ångströms, y up) */

  function drawing(mol) {
    var C2 = [0, 0], C3 = [U[0] * CC, U[1] * CC];
    function end(from, dir, len) { return [from[0] + dir[0] * len, from[1] + dir[1] * len]; }
    var spread = 30 * Math.PI / 180;
    function splay(dir, sign) {
      var a = Math.atan2(dir[1], dir[0]) + sign * spread;
      return [Math.cos(a), Math.sin(a)];
    }
    /* Wedge and dash share one direction in projection, so they are fanned
       apart for legibility. Which side each goes is cosmetic: what carries
       the stereochemistry is wedge versus dash. */
    var bonds = [];
    [['front', C2], ['back', C3]].forEach(function (pair) {
      var side = pair[0], at = pair[1];
      var m = mol[side];
      var chain = CHAIN[side];
      bonds.push({ side: side, role: 'anchor', g: m.anchor, from: at, to: end(at, chain, 1.05) });
      var out = OUT[side];
      var sw = side === 'front' ? 1 : -1;
      bonds.push({ side: side, role: 'wedge', g: m.wedge, from: at, to: end(at, splay(out, sw), 0.9) });
      bonds.push({ side: side, role: 'dash', g: m.dash, from: at, to: end(at, splay(out, -sw), 0.9) });
    });
    return { C2: C2, C3: C3, axis: [U[0], U[1]], bonds: bonds };
  }

  return {
    newmanOf: newmanOf,
    newmanAt: newmanAt,
    phi0: phi0,
    deltaFor: deltaFor,
    energyAt: energyAt,
    breakdownAt: breakdownAt,
    atoms: atoms,
    drawing: drawing,
    VIEWS: VIEWS,
    wrap: wrap,
    vec: { add: add, sub: sub, mul: mul, dot: dot, cross: cross, unit: unit }
  };
})();

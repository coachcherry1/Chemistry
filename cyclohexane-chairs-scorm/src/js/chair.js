/* chair.js: one 3D model of the cyclohexane ring. Every picture in the
 * activity (the 3D model, the chair drawings, the Newman projections) and
 * every answer (which position is axial, where a group goes after a flip,
 * which H atoms an axial group crowds) is computed from it, never typed in,
 * so the answer key cannot disagree with the pictures.
 *
 * Frame: the ring's mean plane is z = 0 and its axis is z. "Top face" means
 * +z. Looking down from the top, the carbons C1 to C6 go round
 * anticlockwise, C1 on the +x side.
 *
 * The chair uses perfect tetrahedral angles and 1.54 Å C–C bonds, so every
 * ring bond is exactly staggered. In chair 1 (t = 0) the odd carbons sit
 * above the mean plane and the even ones below; chair 2 (t = 1) is the other
 * way round.
 *
 * Positions. Each carbon has two substituent positions, one on the top face
 * ('t') and one on the bottom face ('b'). Which of the two is axial depends
 * on the chair; which face it is on never changes. That is the whole content
 * of a ring flip, and tools/validate.js checks it for every position.
 *
 * The flip. Starting from chair 1, C4 swings up through the plane of
 * C2, C3, C5 and C6 (giving a boat), then C1 swings down through it (giving
 * chair 2). Each swing is a turn about the line joining the two carbons
 * either side, so no bond changes length. After every step the ring is
 * re-centred and turned so its mean plane stays level, which keeps "up"
 * meaning up throughout. The real path passes through half-chairs and
 * twist-boats; this one passes through a boat. Students only need to know
 * that the in-between shapes are less stable than the chairs.
 */

var CHAIR = (function () {
  'use strict';

  var CC = 1.54;
  var TET = Math.acos(-1 / 3);                  /* 109.47° */
  var HALF = TET / 2;
  var RING_R = CC * Math.sqrt(8) / 3;           /* 1.452 Å from the axis */
  var Z0 = CC / 6;                              /* 0.257 Å above or below the mean plane */
  var FACES = ['t', 'b'];

  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function unit(a) { var l = len(a); return [a[0] / l, a[1] / l, a[2] / l]; }
  function dist(a, b) { return len(sub(a, b)); }

  /* Rodrigues: turn v by `angle` about the unit vector k. */
  function turn(v, k, angle) {
    var c = Math.cos(angle), s = Math.sin(angle);
    return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
  }

  function wrap(i) { return ((i % 6) + 6) % 6; }

  /* ------------------------------------------------------------ the ring */

  function chair1() {
    var out = [];
    for (var k = 0; k < 6; k++) {
      var a = k * Math.PI / 3;
      out.push([RING_R * Math.cos(a), RING_R * Math.sin(a), k % 2 ? -Z0 : Z0]);
    }
    return out;
  }

  /* Re-centre the ring and turn it (by the smallest turn) so its mean plane
     is level. The plane's normal comes from Newell's method, which for the
     chair is exactly the ring axis. */
  function level(ring) {
    var c = [0, 0, 0];
    ring.forEach(function (p) { c = add(c, p); });
    c = mul(c, 1 / ring.length);
    var r = ring.map(function (p) { return sub(p, c); });
    var n = [0, 0, 0];
    for (var i = 0; i < 6; i++) n = add(n, cross(r[i], r[(i + 1) % 6]));
    n = unit(n);
    var axis = cross(n, [0, 0, 1]);
    var s = len(axis);
    if (s < 1e-9) return r;
    var ang = Math.atan2(s, n[2]);
    axis = mul(axis, 1 / s);
    return r.map(function (p) { return turn(p, axis, ang); });
  }

  /* A point turned about the line through a and b until it reaches `target`
     (which must be the same distance from that line). Returns position(s)
     for s from 0 to 1, taking the shorter way round. */
  function swing(p, a, b, target) {
    var u = unit(sub(b, a));
    var foot = add(a, mul(u, dot(sub(p, a), u)));
    var v0 = sub(p, foot), v1 = sub(target, foot);
    var ang = Math.atan2(dot(u, cross(v0, v1)), dot(v0, v1));
    return function (s) { return add(foot, turn(v0, u, ang * s)); };
  }

  function reflect(p, n) { return sub(p, mul(n, 2 * dot(p, n))); }

  var C1 = chair1();
  var SEAT = unit(cross(sub(C1[2], C1[1]), sub(C1[5], C1[1])));   /* plane of C2, C3, C5, C6 */
  var SWING4 = swing(C1[3], C1[2], C1[4], reflect(C1[3], SEAT));
  var SWING1 = swing(C1[0], C1[1], C1[5], reflect(C1[0], SEAT));

  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  /* Ring carbons at flip progress t: 0 = chair 1, 0.5 = boat, 1 = chair 2. */
  function ringAt(t) {
    var r = C1.slice();
    r[3] = SWING4(smooth(2 * t));
    r[0] = SWING1(smooth(2 * t - 1));
    return level(r);
  }

  /* The two substituent directions on each carbon: symmetric about the
     bisector of the ring angle, in the plane at right angles to the ring
     angle's plane, 109.5° apart. `t` (top) is the one on the +z side in
     chair 1, and because the construction follows the ring smoothly it stays
     on the top face all the way through a flip. */
  function slotDirs(ring) {
    return ring.map(function (p, i) {
      var un = unit(sub(ring[wrap(i + 1)], p)), up = unit(sub(ring[wrap(i - 1)], p));
      var b = mul(unit(add(un, up)), -1);
      var n = unit(cross(un, up));
      return {
        t: add(mul(b, Math.cos(HALF)), mul(n, Math.sin(HALF))),
        b: sub(mul(b, Math.cos(HALF)), mul(n, Math.sin(HALF)))
      };
    });
  }

  /* Axial or equatorial, for each position, in chair 1 (k = 0) and chair 2
     (k = 1). The substituents never change the ring, so this holds for every
     molecule. */
  var AXIAL = [0, 1].map(function (k) {
    var dirs = slotDirs(ringAt(k)), out = {};
    dirs.forEach(function (d, i) {
      FACES.forEach(function (f) { out[(i + 1) + f] = Math.abs(d[f][2]) > 0.9; });
    });
    return out;
  });

  function isAxial(pos, k) { return AXIAL[k ? 1 : 0][pos]; }

  function posKey(c, f) { return wrap(c - 1) + 1 + f; }
  function carbonOf(pos) { return +pos.charAt(0); }
  function faceOf(pos) { return pos.charAt(1); }

  /* The two axial positions on the same face, two carbons away: the ones an
     axial group at `pos` crowds (1,3-diaxial interactions). */
  function synAxial(pos) {
    var c = carbonOf(pos), f = faceOf(pos);
    return [posKey(c + 2, f), posKey(c - 2, f)];
  }

  /* Plain-language name of a position in chair k. */
  function describe(pos, k) {
    var ax = isAxial(pos, k);
    var up = faceOf(pos) === 't';
    return ax ? 'axial, pointing ' + (up ? 'up' : 'down') : 'equatorial, pointing slightly ' + (up ? 'up' : 'down');
  }

  /* ------------------------------------------------------------ atoms */

  /* Place D bonded to C, given bond length r, angle B–C–D and dihedral A–B–C–D. */
  function place(A, B, C, r, angle, dihedral) {
    var bc = unit(sub(C, B));
    var n = unit(cross(sub(B, A), bc));
    var m = cross(n, bc);
    var t = dihedral * Math.PI / 180;
    var d = [-r * Math.cos(angle), r * Math.sin(angle) * Math.cos(t), r * Math.sin(angle) * Math.sin(t)];
    return add(C, add(mul(bc, d[0]), add(mul(m, d[1]), mul(n, d[2]))));
  }

  /* Every atom and bond of `mol` at flip progress t. Ring carbons have ids
     C1 to C6; the first atom of the group at a position has the position's
     id ('1t', '4b'), and the atoms of that group hang below it ('1t.0'). */
  function model(mol, t) {
    t = t || 0;
    var ring = ringAt(t), dirs = slotDirs(ring);
    var atoms = [], bonds = [], index = {};
    function push(a) { index[a.id] = atoms.length; atoms.push(a); return atoms.length - 1; }
    ring.forEach(function (p, i) { push({ id: 'C' + (i + 1), el: 'C', p: p, ring: true, carbon: i + 1 }); });
    for (var i = 0; i < 6; i++) bonds.push([i, (i + 1) % 6]);

    var first = {};
    ring.forEach(function (p, i) {
      FACES.forEach(function (f) {
        var pos = (i + 1) + f, g = MOLECULES.groupAt(mol, i + 1, f);
        first[pos] = { g: g, p: add(p, mul(dirs[i][f], GROUPS[g].bond)) };
      });
    });

    function grow(gk, id, p, parentP, refP, parentIdx, pos) {
      var grp = GROUPS[gk];
      var idx = push({ id: id, el: grp.el, p: p, pos: pos, group: gk, carbon: carbonOf(pos), face: faceOf(pos),
                       head: id === pos });
      bonds.push([parentIdx, idx]);
      (grp.kids || []).forEach(function (k, j) {
        var kp = place(refP, parentP, p, GROUPS[k].bond, TET, [180, 60, 300][j]);
        grow(k, id + '.' + j, kp, p, parentP, idx, pos);
      });
    }

    ring.forEach(function (p, i) {
      FACES.forEach(function (f) {
        var pos = (i + 1) + f, other = (i + 1) + (f === 't' ? 'b' : 't');
        grow(first[pos].g, pos, first[pos].p, p, first[other].p, i, pos);
      });
    });

    return { atoms: atoms, bonds: bonds, index: index, center: [0, 0, 0], t: t };
  }

  function atom(m, id) { return m.atoms[m.index[id]]; }

  /* Pairs of atoms (not bonded to each other or to a common atom) whose
     electron clouds overlap by more than `min` Å, largest overlap first. */
  function contacts(m, min) {
    min = min == null ? 0.1 : min;
    var nb = m.atoms.map(function () { return []; });
    m.bonds.forEach(function (b) { nb[b[0]].push(b[1]); nb[b[1]].push(b[0]); });
    var out = [];
    for (var i = 0; i < m.atoms.length; i++) {
      for (var j = i + 1; j < m.atoms.length; j++) {
        if (nb[i].indexOf(j) >= 0) continue;
        if (nb[i].some(function (k) { return nb[j].indexOf(k) >= 0; })) continue;
        var a = m.atoms[i], b = m.atoms[j];
        if (a.ring && b.ring) continue;
        var over = ELEMENTS[a.el].vdw + ELEMENTS[b.el].vdw - dist(a.p, b.p);
        if (over > min) out.push({ a: a.id, b: b.id, over: over });
      }
    }
    return out.sort(function (x, y) { return y.over - x.over; });
  }

  /* H atoms on other carbons that the group at `pos` crowds, with the
     overlap in Å. `all` false (the default) keeps only the two axial H atoms
     on the same face, two carbons away: the 1,3-diaxial interactions. A
     branched group also touches the H atoms on the next carbons, in either
     chair, and that cancels out of the A-value. */
  function crowdedBy(m, pos, all) {
    var syn = synAxial(pos);
    var hit = {};
    contacts(m).forEach(function (c) {
      var A = atom(m, c.a), B = atom(m, c.b);
      [[A, B], [B, A]].forEach(function (pr) {
        var x = pr[0], y = pr[1];
        if (x.pos === pos && y.pos && y.pos !== pos && y.head && GROUPS[y.group].el.charAt(0) === 'H' &&
            y.carbon !== x.carbon && (all || syn.indexOf(y.pos) >= 0)) {
          hit[y.pos] = Math.max(hit[y.pos] || 0, c.over);
        }
      });
    });
    return hit;
  }

  /* ------------------------------------------------------------ views */

  /* The camera the chair drawings use: a little above the ring's plane and a
     little round from side-on, which is how textbooks draw a chair. Axial
     bonds come out vertical and every equatorial bond parallel to two ring
     bonds, because the projection keeps parallel lines parallel.

     Chair 2 is chair 1 reflected through the mean plane, which is also its
     mirror image through the vertical plane at right angles to C1...C4. So
     seen with the camera swung the other way round (-PSI), chair 2 is
     exactly the mirror image of chair 1's drawing: the "other chair" that
     textbooks draw, with C1 still at the right-hand end and up still up. The
     swing follows the flip, so the drawing morphs smoothly between the two. */
  var PSI = 14 * Math.PI / 180, EPS = 15 * Math.PI / 180;

  function sideCam(t, tilt, swing) {
    var psi = swing != null ? swing : PSI * Math.cos(Math.PI * Math.max(0, Math.min(1, t || 0)));
    var eps = tilt == null ? EPS : tilt;
    return [
      [Math.cos(psi), -Math.sin(psi), 0],
      [Math.sin(psi) * Math.sin(eps), Math.cos(psi) * Math.sin(eps), Math.cos(eps)],
      [-Math.sin(psi) * Math.cos(eps), -Math.cos(psi) * Math.cos(eps), Math.sin(eps)]
    ];
  }
  var SIDE = sideCam(0);
  var TOP = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

  /* Camera rows (screen right, screen up, toward the viewer) for the 3D
     model: 'side' matches the chair drawing, 'above' is the same from higher
     up, 'end' looks along the ring from beyond C4 toward C1 (C1's axial
     group at the back, the axial atoms on C3 and C5 either side in front:
     the clearest view of 1,3-diaxial crowding), 'top' matches the flat ring
     drawing, and 'bond' looks down the bond from carbon i to carbon j, with
     the ring axis up, matching newman(). */
  function camera(name, m, i, j) {
    if (name === 'top') return TOP;
    if (name === 'bond') {
      var F = bondFrame(m, i, j);
      return [F.RIGHT, F.UP, mul(F.W, -1)];
    }
    if (name === 'above') return sideCam(m ? m.t : 0, 42 * Math.PI / 180);
    if (name === 'end') return sideCam(0, 24 * Math.PI / 180, Math.PI / 2);
    return sideCam(m ? m.t : 0);
  }

  /* The point a camera centres on: the bond's midpoint for a bond view. */
  function focus(name, m, i, j) {
    if (name !== 'bond') return [0, 0, 0];
    return mul(add(atom(m, 'C' + i).p, atom(m, 'C' + j).p), 0.5);
  }

  function bondFrame(m, i, j) {
    var a = atom(m, 'C' + i).p, b = atom(m, 'C' + j).p;
    var W = unit(sub(b, a));
    var UP = unit(sub([0, 0, 1], mul(W, W[2])));
    return { W: W, UP: UP, RIGHT: cross(W, UP), a: a };
  }

  /* Newman projection looking down the ring bond from carbon i (front) to
     carbon j (back): { front: [{g, a, pos}], back: [...] }, angles in degrees
     clockwise from up as the eye sees them. */
  function newman(mol, t, i, j) {
    var m = model(mol, t), F = bondFrame(m, i, j);
    function angle(from, to) {
      var d = sub(to, from);
      var p = sub(d, mul(F.W, dot(d, F.W)));
      var a = Math.atan2(dot(p, F.RIGHT), dot(p, F.UP)) * 180 / Math.PI;
      return ((Math.round(a) % 360) + 360) % 360;
    }
    function side(c, other) {
      var me = atom(m, 'C' + c).p, list = [];
      FACES.forEach(function (f) {
        var pos = c + f, h = atom(m, pos);
        list.push({ g: h.group, a: angle(me, h.p), pos: pos });
      });
      [wrap(c - 2) + 1, wrap(c) + 1].forEach(function (n) {
        if (n !== other) list.push({ g: 'R' + n, a: angle(me, atom(m, 'C' + n).p), ring: n });
      });
      return list.sort(function (p, q) { return p.a - q.a; });
    }
    return { front: side(i, j), back: side(j, i), carbons: ['C' + i, 'C' + j] };
  }

  /* Angle between two groups in a Newman projection, folded into 0 to 180. */
  function gap(a, b) {
    var d = Math.abs((((a - b) % 360) + 360) % 360);
    return d > 180 ? 360 - d : d;
  }

  /* Screen coordinates (ångströms, y up) and depth of every atom under a
     camera; the chair drawings are built from this. */
  function project(m, cam) {
    cam = cam || sideCam(m.t);
    var out = {};
    m.atoms.forEach(function (a) {
      out[a.id] = { x: dot(cam[0], a.p), y: dot(cam[1], a.p), z: dot(cam[2], a.p) };
    });
    return out;
  }

  /* Torsion angle a-b-c-d in degrees (for the checks). */
  function torsion(a, b, c, d) {
    var b1 = sub(b, a), b2 = sub(c, b), b3 = sub(d, c);
    var n1 = cross(b1, b2), n2 = cross(b2, b3);
    var x = dot(n1, n2), y = dot(cross(n1, n2), unit(b2));
    return Math.atan2(y, x) * 180 / Math.PI;
  }

  function angleAt(a, b, c) {
    return Math.acos(dot(unit(sub(a, b)), unit(sub(c, b)))) * 180 / Math.PI;
  }

  var POSITIONS = [];
  for (var c = 1; c <= 6; c++) FACES.forEach(function (f) { POSITIONS.push(c + f); });

  return {
    CC: CC,
    FACES: FACES,
    POSITIONS: POSITIONS,
    SIDE: SIDE,
    TOP: TOP,
    sideCam: sideCam,
    focus: focus,
    ringAt: ringAt,
    slotDirs: slotDirs,
    model: model,
    atom: atom,
    isAxial: isAxial,
    synAxial: synAxial,
    describe: describe,
    posKey: posKey,
    carbonOf: carbonOf,
    faceOf: faceOf,
    contacts: contacts,
    crowdedBy: crowdedBy,
    camera: camera,
    newman: newman,
    gap: gap,
    project: project,
    torsion: torsion,
    angleAt: angleAt,
    vec: { add: add, sub: sub, mul: mul, dot: dot, cross: cross, unit: unit, len: len, dist: dist }
  };
})();

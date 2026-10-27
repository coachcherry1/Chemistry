/* geom.js: vectors, rotations and the small amount of linear algebra the
 * rest of the activity needs.
 *
 * Frame (the "page"): x to the right, y up, z out of the page toward the
 * reader. A wedge points toward +z, a dash toward −z, a plain line lies in
 * the page (z = 0). Every 3D model is built in this frame, so its projection
 * onto the page IS the wedge/dash drawing (draw.js), and a rotation is just
 * a 3 × 3 matrix applied to every atom.
 *
 * Matrices are arrays of three rows. R applied to v is mvec(R, v).
 */

var GEOM = (function () {
  'use strict';

  var TET = Math.acos(-1 / 3);                  /* 109.47°, the tetrahedral angle */
  var RAD = Math.PI / 180;

  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function unit(a) { var l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function dist(a, b) { return len(sub(a, b)); }
  function angle(a, b) { return Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b))))) / RAD; }
  function det3(a, b, c) { return dot(a, cross(b, c)); }

  /* ---- matrices */

  function ident() { return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; }
  function mvec(m, v) { return [dot(m[0], v), dot(m[1], v), dot(m[2], v)]; }
  function transpose(m) { return [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]]; }
  function mmul(a, b) {
    var bt = transpose(b);
    return a.map(function (row) { return [dot(row, bt[0]), dot(row, bt[1]), dot(row, bt[2])]; });
  }
  function mdet(m) { return det3(m[0], m[1], m[2]); }
  function trace(m) { return m[0][0] + m[1][1] + m[2][2]; }

  /* Rotation by `deg` degrees about the unit vector k (right-hand rule). */
  function rot(k, deg) {
    k = unit(k);
    var a = deg * RAD, c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    var x = k[0], y = k[1], z = k[2];
    return [
      [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
      [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
      [t * x * z - s * y, t * y * z + s * x, t * z * z + c]
    ];
  }

  /* Re-orthonormalise a rotation that has picked up rounding error. */
  function orthonormal(m) {
    var x = unit(m[0]);
    var y = unit(sub(m[1], mul(x, dot(m[1], x))));
    return [x, y, cross(x, y)];
  }

  /* How far apart two rotations are, in degrees of turning. */
  function gap(a, b) {
    var c = (trace(mmul(a, transpose(b))) - 1) / 2;
    return Math.acos(Math.max(-1, Math.min(1, c))) / RAD;
  }

  /* ---- quaternions, for smooth turns between two orientations */

  function toQuat(m) {
    var t = m[0][0] + m[1][1] + m[2][2], q, s;
    if (t > 0) {
      s = Math.sqrt(t + 1) * 2;
      q = [0.25 * s, (m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s];
    } else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
      s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2;
      q = [(m[2][1] - m[1][2]) / s, 0.25 * s, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s];
    } else if (m[1][1] > m[2][2]) {
      s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2;
      q = [(m[0][2] - m[2][0]) / s, (m[0][1] + m[1][0]) / s, 0.25 * s, (m[1][2] + m[2][1]) / s];
    } else {
      s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;
      q = [(m[1][0] - m[0][1]) / s, (m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, 0.25 * s];
    }
    return q;
  }

  function fromQuat(q) {
    var w = q[0], x = q[1], y = q[2], z = q[3];
    return [
      [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
      [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
      [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]
    ];
  }

  function slerp(a, b, t) {
    var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = b.map(function (v) { return -v; }); d = -d; }
    var r;
    if (d > 0.9995) {
      r = a.map(function (v, i) { return v + (b[i] - v) * t; });
    } else {
      var th = Math.acos(d), s = Math.sin(th);
      var wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
      r = a.map(function (v, i) { return v * wa + b[i] * wb; });
    }
    var l = Math.sqrt(r.reduce(function (acc, v) { return acc + v * v; }, 0));
    return r.map(function (v) { return v / l; });
  }

  /* The rotation part of the way from a to b, t from 0 to 1. */
  function between(a, b, t) { return fromQuat(slerp(toQuat(a), toQuat(b), t)); }

  /* ---- building atoms */

  /* Place D bonded to C, given bond length r, angle B–C–D (radians) and
     dihedral A–B–C–D (degrees). */
  function place(A, B, C, r, ang, dihedral) {
    var bc = unit(sub(C, B));
    var n = unit(cross(sub(B, A), bc));
    var m = cross(n, bc);
    var t = dihedral * RAD;
    var d = [-r * Math.cos(ang), r * Math.sin(ang) * Math.cos(t), r * Math.sin(ang) * Math.sin(t)];
    return add(C, add(mul(bc, d[0]), add(mul(m, d[1]), mul(n, d[2]))));
  }

  /* Dihedral angle a–b–c–d in degrees, −180 to 180. */
  function torsion(a, b, c, d) {
    var b0 = sub(a, b), b1 = unit(sub(c, b)), b2 = sub(d, c);
    var v = sub(b0, mul(b1, dot(b0, b1))), w = sub(b2, mul(b1, dot(b2, b1)));
    return Math.atan2(dot(cross(b1, v), w), dot(v, w)) / RAD;
  }

  /* ---- superposition (Horn's quaternion method) */

  /* Eigen-decomposition of a symmetric 4 × 4 matrix by Jacobi rotations.
     Returns the eigenvector of the largest eigenvalue. */
  function topEigen4(A) {
    var a = A.map(function (r) { return r.slice(); });
    var v = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    for (var sweep = 0; sweep < 60; sweep++) {
      var off = 0;
      for (var p = 0; p < 4; p++) for (var q = p + 1; q < 4; q++) off += a[p][q] * a[p][q];
      if (off < 1e-22) break;
      for (p = 0; p < 4; p++) for (q = p + 1; q < 4; q++) {
        if (Math.abs(a[p][q]) < 1e-30) continue;
        var th = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        var t = (th >= 0 ? 1 : -1) / (Math.abs(th) + Math.sqrt(th * th + 1));
        var c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (var k = 0; k < 4; k++) {
          var akp = a[k][p], akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (k = 0; k < 4; k++) {
          var apk = a[p][k], aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (k = 0; k < 4; k++) {
          var vkp = v[k][p], vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
    var best = 0;
    for (var i = 1; i < 4; i++) if (a[i][i] > a[best][best]) best = i;
    return [v[0][best], v[1][best], v[2][best], v[3][best]];
  }

  /* The proper rotation R that best lays point set P onto Q (same order),
     after centring both, and the root-mean-square distance left over. */
  function superpose(P, Q) {
    var n = P.length;
    var cp = [0, 0, 0], cq = [0, 0, 0];
    P.forEach(function (p) { cp = add(cp, p); });
    Q.forEach(function (q) { cq = add(cq, q); });
    cp = mul(cp, 1 / n); cq = mul(cq, 1 / n);
    var S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < n; i++) {
      var a = sub(P[i], cp), b = sub(Q[i], cq);
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) S[r][c] += a[r] * b[c];
    }
    var xx = S[0][0], xy = S[0][1], xz = S[0][2], yx = S[1][0], yy = S[1][1], yz = S[1][2],
        zx = S[2][0], zy = S[2][1], zz = S[2][2];
    var N = [
      [xx + yy + zz, yz - zy, zx - xz, xy - yx],
      [yz - zy, xx - yy - zz, xy + yx, zx + xz],
      [zx - xz, xy + yx, -xx + yy - zz, yz + zy],
      [xy - yx, zx + xz, yz + zy, -xx - yy + zz]
    ];
    var R = fromQuat(topEigen4(N));
    var ss = 0;
    for (i = 0; i < n; i++) ss += Math.pow(dist(mvec(R, sub(P[i], cp)), sub(Q[i], cq)), 2);
    return { R: R, rmsd: Math.sqrt(ss / n) };
  }

  return {
    TET: TET, RAD: RAD,
    add: add, sub: sub, mul: mul, dot: dot, cross: cross, len: len, unit: unit, dist: dist, angle: angle, det3: det3,
    ident: ident, mvec: mvec, transpose: transpose, mmul: mmul, mdet: mdet, rot: rot, orthonormal: orthonormal,
    gap: gap, toQuat: toQuat, fromQuat: fromQuat, slerp: slerp, between: between,
    place: place, torsion: torsion, superpose: superpose
  };
})();

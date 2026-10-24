/* vsepr.js: from a finished Lewis structure to a 3D molecule, its molecular
 * geometry and its polarity. Everything the steps, the checkpoint answers,
 * the answer key and the validator say about shape and polarity comes from
 * here, so they cannot disagree.
 *
 * Electron domains. Around the central atom, every bonded atom is ONE domain
 * (a single, double or triple bond alike: all its pairs sit between the same
 * two atoms and point the same way) and every lone pair is one domain.
 *
 * Geometry. The domains point as far apart as they can: 2 a line, 3 a flat
 * triangle, 4 a tetrahedron, 5 a trigonal bipyramid, 6 an octahedron. The
 * molecular geometry names only where the ATOMS are. In scope:
 *
 *   domains  lone pairs  molecular geometry     angle
 *      2         0       linear                 180°
 *      3         0       trigonal planar        120°
 *      4         0       tetrahedral            109.5°
 *      4         1       trigonal pyramidal     <109.5°
 *      4         2       bent                   <<109.5°
 *      5         0       trigonal bipyramidal   90° and 120°
 *      6         0       octahedral             90°
 *
 * Lone pairs repel more strongly than bonding pairs, so they squeeze the bond
 * angles below 109.5°: one lone pair a little (<109.5°), two lone pairs more
 * (<<109.5°). Students learn those two signs, not numbers. The 3D models of
 * NH3 and H2O are built at their measured angles (MEASURED_ANGLE in
 * species.js) so the picture is true to life.
 *
 * Polarity, as the class teaches it: every atom carries a partial charge
 * (the more electronegative end of a bond is δ−, the other δ+). Where the
 * molecule is radially symmetric, the δ− charge is spread evenly around the
 * centre: the centre of negative charge and the centre of positive charge
 * fall on the same point, the molecule has no ends, and it is nonpolar.
 * Where it is not radially symmetric (a lone pair on the central atom, or different outer
 * atoms), the two centres pull apart: one end is δ−, the other δ+, and it is
 * polar. The partial charges are the Pauling electronegativity differences
 * (elements.js), a simple model whose only job is to place the two centres.
 * No arrows and no dipole numbers are ever shown.
 *
 * Coordinates: x right, y up, z toward the reader; the Lewis structure lies
 * flat in the page (z = 0), looked at straight on.
 */

var VSEPR = (function () {
  'use strict';

  /* ------------------------------------------------------------ vectors */

  var V = {
    add: function (a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; },
    sub: function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; },
    mul: function (a, k) { return [a[0] * k, a[1] * k, a[2] * k]; },
    dot: function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; },
    cross: function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; },
    len: function (a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); },
    unit: function (a) { var l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
    angle: function (a, b) {
      var c = V.dot(V.unit(a), V.unit(b));
      return Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI;
    }
  };

  /* turn unit vector a toward unit vector b by the fraction t of the angle
     between them (b may be anything but exactly opposite a) */
  function slerp(a, b, t) {
    var d = Math.max(-1, Math.min(1, V.dot(a, b)));
    var th = Math.acos(d);
    if (th < 1e-6) return b.slice();
    if (Math.PI - th < 1e-3) {
      /* opposite: turn through any perpendicular, up preferred */
      var p = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      var axis = V.unit(V.cross(a, p));
      var mid = V.unit(V.cross(axis, a));
      return V.unit(V.add(V.mul(a, Math.cos(th * t)), V.mul(mid, Math.sin(th * t))));
    }
    var s = Math.sin(th);
    return V.unit(V.add(V.mul(a, Math.sin((1 - t) * th) / s), V.mul(b, Math.sin(t * th) / s)));
  }

  /* --------------------------------------------------- the geometries */

  var GEOM = {
    '2/0': { name: 'linear', angle: '180°' },
    '3/0': { name: 'trigonal planar', angle: '120°' },
    '4/0': { name: 'tetrahedral', angle: '109.5°' },
    '4/1': { name: 'trigonal pyramidal', angle: '<109.5°' },
    '4/2': { name: 'bent', angle: '<<109.5°' },
    '5/0': { name: 'trigonal bipyramidal', angle: '90° and 120°' },
    '6/0': { name: 'octahedral', angle: '90°' }
  };
  /* the order students meet them in */
  var NAMES = ['linear', 'trigonal planar', 'tetrahedral', 'trigonal pyramidal', 'bent', 'trigonal bipyramidal',
               'octahedral'];

  var s3 = Math.sqrt(3) / 2;
  var TS = Math.sqrt(2 / 3), TC = Math.sqrt(1 / 3);       /* tetrahedron: sin and cos of 54.7° */

  /* Template directions for each number of domains, oriented to look like
     the Lewis drawing when seen straight on. `lp` lists the slots lone pairs
     take (in the order they are filled). */
  var TEMPLATE = {
    2: { dirs: { W: [-1, 0, 0], E: [1, 0, 0] } },
    3: { dirs: { D: [0, -1, 0], UL: [-s3, 0.5, 0], UR: [s3, 0.5, 0] } },
    4: { dirs: { L: [-TS, 0, -TC], R: [TS, 0, -TC], U: [0, TS, TC], D: [0, -TS, TC] }, lp: ['U', 'D'] },
    5: { dirs: { U: [0, 1, 0], D: [0, -1, 0], EL: [-s3, 0, 0.5], ER: [s3, 0, 0.5], EB: [0, 0, -1] } },
    6: { dirs: { W: [-1, 0, 0], E: [1, 0, 0], U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1] } }
  };

  /* covalent radii (Å), for bond lengths that look right */
  var RCOV = { H: 0.32, Be: 0.96, B: 0.84, C: 0.76, N: 0.71, O: 0.66, F: 0.57, P: 1.07, S: 1.05, Cl: 1.02,
               Br: 1.2, I: 1.39, Xe: 1.4 };
  var SHORTEN = { 1: 1, 2: 0.87, 3: 0.78 };

  function bondLength(a, b, order) { return (RCOV[a] + RCOV[b]) * (SHORTEN[order] || 1); }

  /* the direction of a Lewis grid slot, as drawn on the page */
  function pageDir(dir) {
    var v = Lewis.VEC[dir];
    return V.unit([v[0], -v[1], 0]);
  }

  /* ------------------------------------------------------- domains */

  function domains(s) {
    var bonded = Lewis.DIRS.filter(function (d) { return Lewis.has(s, d); });
    var lp = s.lp.C || 0;
    return { bonds: bonded.length, lp: lp, total: bonded.length + lp, bonded: bonded };
  }

  function geometryOf(n, lp) { return GEOM[n + '/' + lp] || null; }

  function finished(sp) { return Lewis.canonical(typeof sp === 'string' ? Lewis.species(sp) : sp); }

  /* With different outer atoms the angles are only close to the ideal ones
     (CH2O, CH3Cl): "about 120°". A straight line is always 180°. */
  function info(id) {
    var sp = Lewis.species(id), s = finished(sp), d = domains(s), g = geometryOf(d.total, d.lp);
    var outer = d.bonded.map(function (k) { return s.at[k]; });
    var mixed = outer.some(function (e) { return e !== outer[0]; });
    var angle = g ? (mixed && d.total > 2 ? 'about ' + g.angle : g.angle) : null;
    return { sp: sp, s: s, domains: d.total, lp: d.lp, bonds: d.bonds, geometry: g ? g.name : null,
             angle: angle, inScope: !!g, mixed: mixed };
  }

  /* ------------------------------------------------------- 3D models */

  /* Assign each domain of a structure (bonded atoms by their Lewis slot, lone
     pairs as 'lp0', 'lp1', ...) to a template direction, so the morph from the
     flat drawing to 3D moves every domain as little as possible. Lone pairs
     go only to the template's lone-pair slots. */
  function assign(s, n) {
    var T = TEMPLATE[n];
    var keys = Object.keys(T.dirs);
    var lpSlots = (T.lp || []).slice(0, s.lp.C || 0);
    var atomSlots = keys.filter(function (k) { return lpSlots.indexOf(k) < 0; });
    var bonded = Lewis.DIRS.filter(function (d) { return Lewis.has(s, d); });
    var lpSides = Lewis.freeSides(s, 'C');
    var best = null, bestCost = Infinity;
    function cost(map) {
      var c = 0;
      bonded.forEach(function (d) { c += V.angle(pageDir(d), T.dirs[map[d]]); });
      lpSides.forEach(function (d, i) { c += V.angle(pageDir(d), T.dirs[map['lp' + i]]); });
      return c;
    }
    function permute(list, k, used, map, slots, done) {
      if (k === list.length) { done(map); return; }
      slots.forEach(function (slot) {
        if (used[slot]) return;
        used[slot] = 1; map[list[k]] = slot;
        permute(list, k + 1, used, map, slots, done);
        used[slot] = 0; delete map[list[k]];
      });
    }
    var lpKeys = lpSides.map(function (d, i) { return 'lp' + i; });
    permute(bonded, 0, {}, {}, atomSlots, function (m1) {
      permute(lpKeys, 0, {}, Object.assign({}, m1), lpSlots, function (m2) {
        var c = cost(m2);
        if (c < bestCost - 1e-9) { bestCost = c; best = Object.assign({}, m2); }
      });
    });
    return best;
  }

  /* Squeeze the bonds of a 4-domain molecule with lone pairs to its measured
     angle: the bonds close up around the axis opposite the lone pairs. */
  function squeeze(dirs, bondKeys, lpKeys, angle) {
    var lpSum = [0, 0, 0];
    lpKeys.forEach(function (k) { lpSum = V.add(lpSum, dirs[k]); });
    var axis = V.unit(V.mul(lpSum, -1));
    var out = Object.assign({}, dirs);
    var cosT = Math.cos(angle * Math.PI / 180), alpha;
    if (bondKeys.length === 3) {
      /* three bonds at equal angles round the axis: cos θ = cos²α − ½ sin²α */
      alpha = Math.acos(Math.sqrt((cosT + 0.5) / 1.5));
    } else {
      alpha = angle / 2 * Math.PI / 180;
    }
    bondKeys.forEach(function (k) {
      var b = dirs[k];
      var perp = V.unit(V.sub(b, V.mul(axis, V.dot(b, axis))));
      out[k] = V.unit(V.add(V.mul(axis, Math.cos(alpha)), V.mul(perp, Math.sin(alpha))));
    });
    return out;
  }

  /* A model: { atoms: [{ id, el, p, slot }], bonds: [[i, j, order]],
     lps: [{ dir, from }], arcs: [{ i, j, label }], ... }. Atom 0 is the
     central atom at the origin.

     opts.flat   true: the Lewis structure as drawn (z = 0), for any structure,
                 even one half built
     opts.id     the species, for its measured angle
     opts.ideal  true: a molecule with lone pairs and no measured angle keeps
                 the ideal tetrahedral directions (used only to place its
                 charge centres, never drawn)
     The 3D model needs a finished structure in scope. */
  function model(s, opts) {
    opts = opts || {};
    var atoms = [], bonds = [], lps = [], arcs = [];
    if (!s.at.C) return { atoms: atoms, bonds: bonds, lps: lps, arcs: arcs, flat: true };
    atoms.push({ id: 'C', el: s.at.C, p: [0, 0, 0], slot: 'C' });
    var d = domains(s);
    var dirs = {}, slotOf = {}, T = null;
    if (opts.flat) {
      d.bonded.forEach(function (k) { dirs[k] = pageDir(k); });
      Lewis.freeSides(s, 'C').forEach(function (k, i) { dirs['lp' + i] = pageDir(k); });
    } else {
      var g = geometryOf(d.total, d.lp);
      if (!g) throw new Error('out of scope: ' + d.total + ' domains, ' + d.lp + ' lone pairs');
      T = TEMPLATE[d.total];
      slotOf = assign(s, d.total);
      Object.keys(slotOf).forEach(function (k) { dirs[k] = T.dirs[slotOf[k]].slice(); });
      var id = opts.id || null;
      if (d.lp) {
        var angle = id && MEASURED_ANGLE[id];
        if (angle) dirs = squeeze(dirs, d.bonded, Object.keys(dirs).filter(function (k) { return /^lp/.test(k); }), angle);
        else if (!opts.ideal) throw new Error('no measured angle for ' + (id || 'this molecule') + ' with lone pairs');
      }
    }
    d.bonded.forEach(function (k) {
      var el = s.at[k], order = s.bo[k] || 1;
      atoms.push({ id: k, el: el, p: V.mul(dirs[k], bondLength(s.at.C, el, order)), slot: k, dir: dirs[k] });
      bonds.push([0, atoms.length - 1, order]);
    });
    for (var i = 0; i < d.lp; i++) if (dirs['lp' + i]) lps.push({ dir: dirs['lp' + i], from: 0, key: 'lp' + i });

    /* angle arcs: only where every outer atom is the same element, so the
       labelled angle is exactly the one the molecule has. Every pair of bonds
       at a labelled angle is a candidate, grouped by label; the viewer draws
       the one in each group that faces the student best as they turn it. */
    if (!opts.flat) {
      var same = d.bonded.every(function (k) { return s.at[k] === s.at[d.bonded[0]]; });
      var g2 = geometryOf(d.total, d.lp);
      if (same) {
        for (var p1 = 1; p1 < atoms.length; p1++) for (var p2 = p1 + 1; p2 < atoms.length; p2++) {
          var ang = V.angle(atoms[p1].p, atoms[p2].p), label = null;
          if (d.total === 5) label = Math.abs(ang - 120) < 1 ? '120°' : Math.abs(ang - 90) < 1 ? '90°' : null;
          else if (d.total === 6) label = Math.abs(ang - 90) < 1 ? '90°' : null;
          else label = g2.angle;
          if (label) arcs.push({ i: p1, j: p2, label: label, group: label });
        }
      }
    }
    return { atoms: atoms, bonds: bonds, lps: lps, arcs: arcs, flat: !!opts.flat, domains: d.total, lp: d.lp,
             geometry: opts.flat ? null : geometryOf(d.total, d.lp).name };
  }

  function indexOf(atoms, slot) {
    for (var i = 0; i < atoms.length; i++) if (atoms[i].slot === slot) return i;
    return -1;
  }

  function model3D(id) { return model(finished(id), { id: id }); }
  function modelFlat(s) { return model(s, { flat: true }); }

  /* Halfway between the flat drawing (t = 0) and the 3D molecule (t = 1).
     Both must come from the same finished structure. */
  function morph(flat, solid, t) {
    var out = { atoms: [], bonds: solid.bonds, lps: [], arcs: t >= 1 ? solid.arcs : [], flat: false,
                domains: solid.domains, lp: solid.lp, geometry: solid.geometry };
    solid.atoms.forEach(function (a, i) {
      if (i === 0) { out.atoms.push(a); return; }
      var f = flat.atoms[indexOf(flat.atoms, a.slot)];
      var dir = slerp(V.unit(f.p), a.dir, t);
      out.atoms.push({ id: a.id, el: a.el, slot: a.slot, dir: dir, p: V.mul(dir, V.len(a.p)) });
    });
    solid.lps.forEach(function (l, i) {
      var f = flat.lps[i];
      out.lps.push({ dir: f ? slerp(f.dir, l.dir, t) : l.dir, from: 0, key: l.key });
    });
    return out;
  }

  /* ------------------------------------------------------- polarity */

  /* Partial charges from electronegativity differences: in every bond the
     more electronegative atom takes −Δ and the other +Δ. */
  function charges(m) {
    var q = m.atoms.map(function () { return 0; });
    m.bonds.forEach(function (b) {
      var a = m.atoms[b[0]].el, c = m.atoms[b[1]].el;
      var dEN = ELEMENTS[c].en - ELEMENTS[a].en;
      q[b[1]] -= dEN;
      q[b[0]] += dEN;
    });
    return q;
  }

  /* the centre of positive charge and the centre of negative charge */
  function centres(m, q) {
    q = q || charges(m);
    var pos = [0, 0, 0], neg = [0, 0, 0], qp = 0, qn = 0, dip = [0, 0, 0];
    m.atoms.forEach(function (a, i) {
      if (q[i] > 1e-9) { pos = V.add(pos, V.mul(a.p, q[i])); qp += q[i]; }
      if (q[i] < -1e-9) { neg = V.add(neg, V.mul(a.p, -q[i])); qn -= q[i]; }
      dip = V.add(dip, V.mul(a.p, q[i]));
    });
    pos = qp ? V.mul(pos, 1 / qp) : [0, 0, 0];
    neg = qn ? V.mul(neg, 1 / qn) : [0, 0, 0];
    return { pos: pos, neg: neg, gap: V.len(V.sub(pos, neg)), dipole: dip, size: V.len(dip) };
  }

  var POLAR_GAP = 0.02;     /* Å: centres closer than this sit on the same point */

  /* true, false, or null for an ion (polarity is only asked of molecules) */
  function polar(id) {
    var sp = Lewis.species(id);
    if (sp.charge) return null;
    var m = model(finished(sp), { id: id, ideal: true });
    return centres(m).gap > POLAR_GAP;
  }

  /* The radial symmetry test, in the class's two checks: no lone pair on
     the central atom, and every outer atom the same. Both pass: radially
     symmetric, nonpolar. tools/validate.js checks that this agrees with the
     charge model (polar()) for every molecule. */
  function symmetry(id) {
    var i = info(id), s = i.s;
    var outer = Lewis.DIRS.filter(function (d) { return Lewis.has(s, d); }).map(function (d) { return s.at[d]; });
    var same = outer.every(function (e) { return e === outer[0]; });
    return { lpFree: i.lp === 0, sameOuter: same, symmetric: i.lp === 0 && same, outer: outer, lp: i.lp,
             centre: i.sp.center, text: i.sp.text };
  }

  function outerList(outer) {
    var counts = {};
    outer.forEach(function (e) { counts[e] = (counts[e] || 0) + 1; });
    var parts = Object.keys(counts).map(function (e) { return counts[e] + ' ' + e; });
    return parts.length < 2 ? parts[0] : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  }

  /* Why, in the words of the class: radially symmetric or not. */
  function polarReason(id) {
    var y = symmetry(id), X = y.centre, name = y.text;
    if (!y.symmetric) {
      var why = !y.lpFree
        ? 'The ' + (y.lp > 1 ? y.lp + ' lone pairs' : 'lone pair') + ' on ' + X + ' take' + (y.lp > 1 ? '' : 's') +
          ' up room on one side of ' + X + ' where there is no atom'
        : 'Its outer atoms are not all the same (' + outerList(y.outer) + ')';
      return name + ' is not radially symmetric. ' + why + ', so the charge is not spread evenly around ' + X +
        '. The centre of negative charge and the centre of positive charge are in different places: ' + name +
        ' has a δ+ end and a δ− end. Not radially symmetric: polar.';
    }
    return name + ' is radially symmetric: ' + y.outer.length + ' identical ' + y.outer[0] + ' atoms spread evenly ' +
      'around ' + X + ', and no lone pair on ' + X + '. Whichever way you look from ' + X + ', it is the same, so the ' +
      'charge is spread evenly all the way around. The two centres are in the same place: no ends. Radially ' +
      'symmetric: nonpolar.';
  }

  return {
    V: V, slerp: slerp, GEOM: GEOM, NAMES: NAMES, TEMPLATE: TEMPLATE,
    domains: domains, geometryOf: geometryOf, info: info, finished: finished,
    model: model, model3D: model3D, modelFlat: modelFlat, morph: morph,
    charges: charges, centres: centres, polar: polar, polarReason: polarReason, POLAR_GAP: POLAR_GAP,
    symmetry: symmetry, outerList: outerList
  };
})();

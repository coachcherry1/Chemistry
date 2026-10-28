/* anim.js: the reaction animations, frame by frame, from the 3D models.
 *
 * Each animation is a function of progress p (0 = reactants, 1 =
 * products) returning a frame for viewer3d.js, so a slider, the Play
 * button and the energy diagram beside it always agree. Nothing moves on
 * its own: with reduced motion, Play steps through a few frames instead.
 *
 *   sn2(m, key)          back-side attack: the nucleophile comes in opposite
 *                        the leaving group and the other three groups turn
 *                        inside out (inversion of configuration)
 *   sn1(m, key, face)    loss of the leaving group, the flat carbocation and
 *                        its empty p orbital, attack from one face
 *   e2(m, beta, twist)   the base takes the anti-coplanar H as the leaving
 *                        group leaves; both carbons flatten and their p
 *                        orbitals line up into the π bond
 *   approach(m, key)     the nucleophile heading for the back side, and
 *                        whatever stops it
 */

var Anim = (function () {
  'use strict';

  var G = GEOM;

  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function seg(p, a, b) { return smooth((p - a) / (b - a)); }

  /* The atoms of `model` in the subtree hanging from model atom `from`
     (away from `stop`). */
  function subtree(model, from, stop) { return Build3D.sideOf(model, from, stop); }

  /* Rotation taking unit vector u onto v. */
  function turnOnto(u, v) {
    var ax = G.cross(u, v), s = G.len(ax), c = G.dot(u, v);
    if (s < 1e-9) return c > 0 ? G.ident() : G.rot(Math.abs(u[0]) < 0.9 ? G.cross(u, [1, 0, 0]) : G.cross(u, [0, 1, 0]), 180);
    return G.rot(G.mul(ax, 1 / s), Math.atan2(s, c) * 180 / Math.PI);
  }

  /* A species (nucleophile or base) as a small 3D model, its attacking atom
     at the origin, the rest pointing along `away`. */
  function species(smiles, away) {
    var sp = Mol.parse(smiles);
    var nu = React.nucAtom(sp);
    if (sp.atoms.length === 1 && !sp.atoms[0].h) return { atoms: [{ el: sp.atoms[0].el, p: [0, 0, 0], g: 0 }], bonds: [], nu: 0 };
    var md = Build3D.build(sp, { root: nu });
    /* point the rest of it along `away` */
    var c = [0, 0, 0], n = 0;
    md.atoms.forEach(function (a, i) { if (i) { c = G.add(c, a.p); n++; } });
    var R = turnOnto(G.unit(c), G.unit(away));
    md.atoms.forEach(function (a) { a.p = G.mvec(R, a.p); });
    md.nu = 0;
    return md;
  }

  function copyAtoms(model) { return model.atoms.map(function (a) { return { el: a.el, p: a.p.slice(), g: a.g, h: a.h }; }); }

  /* ---------------------------------------------------------------- SN2 */

  function sn2(m, key) {
    var L = React.lg(m);
    var md = Build3D.build(m, { root: L.a, axis: L.x });
    var root = md.of[L.a], lgi = md.of[L.x];
    var groups = [];
    md.bonds.forEach(function (b) {
      var j = b.a === root ? b.b : b.b === root ? b.a : -1;
      if (j < 0 || j === lgi) return;
      groups.push({ head: j, atoms: subtree(md, j, root), d0: G.unit(md.atoms[j].p) });
    });
    var nuc = species(React.REAGENTS[key].species, [-1, 0.8, 0.2]);
    return function (p) {
      var atoms = copyAtoms(md);
      /* the umbrella: x-component of each group's bond from -1/3 to +1/3 */
      var x = lerp(-1 / 3, 1 / 3, seg(p, 0.2, 0.8));
      groups.forEach(function (g) {
        var perp = G.unit([0, g.d0[1], g.d0[2]]);
        var d = G.unit(G.add(G.mul(perp, Math.sqrt(1 - x * x)), [x, 0, 0]));
        var R = turnOnto(g.d0, d);
        g.atoms.forEach(function (i) { atoms[i].p = G.mvec(R, md.atoms[i].p); });
      });
      var dLG = p < 0.5 ? lerp(1.94, 2.45, seg(p, 0.15, 0.5)) : lerp(2.45, 5.2, seg(p, 0.5, 0.95));
      atoms[lgi].p = [dLG, 0, 0];
      atoms[lgi].alpha = 1;
      var dNu = p < 0.5 ? lerp(5.4, 2.45, seg(p, 0.0, 0.5)) : lerp(2.45, 1.82, seg(p, 0.5, 0.85));
      var off = atoms.length;
      nuc.atoms.forEach(function (a) { atoms.push({ el: a.el, p: G.add(a.p, [-dNu, 0, 0]), g: 'nu' }); });
      var bonds = md.bonds.filter(function (b) { return !(b.a === root && b.b === lgi) && !(b.b === root && b.a === lgi); })
        .map(function (b) { return { a: b.a, b: b.b, order: b.order }; });
      nuc.bonds.forEach(function (b) { bonds.push({ a: b.a + off, b: b.b + off, order: b.order }); });
      var ts = p > 0.3 && p < 0.7;
      if (p < 0.7) bonds.push({ a: root, b: lgi, order: 1, partial: p > 0.3 });
      if (p > 0.3) bonds.push({ a: root, b: off + nuc.nu, order: 1, partial: p < 0.7 });
      var tags = [];
      if (ts) {
        tags.push({ p: G.add(atoms[off + nuc.nu].p, [0, -0.85, 0]), text: 'δ−' });
        tags.push({ p: G.add(atoms[lgi].p, [0, -0.95, 0]), text: 'δ−' });
        tags.push({ p: [0, 1.9, 0], text: '‡', cls: 'accent' });
      }
      if (p > 0.9) tags.push({ p: G.add(atoms[lgi].p, [0, 0.95, 0]), text: '−' });
      return { atoms: atoms, bonds: bonds, tags: tags };
    };
  }

  /* ---------------------------------------------------------------- SN1 */

  /* face +1: the nucleophile arrives on the side the leaving group left
     (+x); -1: the opposite side. */
  function sn1(m, key, face) {
    var L = React.lg(m);
    var md = Build3D.build(m, { root: L.a, axis: L.x });
    var root = md.of[L.a], lgi = md.of[L.x];
    var groups = [];
    md.bonds.forEach(function (b) {
      var j = b.a === root ? b.b : b.b === root ? b.a : -1;
      if (j < 0 || j === lgi) return;
      groups.push({ head: j, atoms: subtree(md, j, root), d0: G.unit(md.atoms[j].p) });
    });
    var nuc = species(React.REAGENTS[key].species, [face, 0.9, 0.3]);
    return function (p) {
      var atoms = copyAtoms(md);
      var x;
      if (p < 0.5) x = lerp(-1 / 3, 0, seg(p, 0.1, 0.45));
      else x = face ? lerp(0, -face / 3, seg(p, 0.6, 0.95)) : 0;
      groups.forEach(function (g) {
        var perp = G.unit([0, g.d0[1], g.d0[2]]);
        var d = G.unit(G.add(G.mul(perp, Math.sqrt(1 - x * x)), [x, 0, 0]));
        var R = turnOnto(g.d0, d);
        g.atoms.forEach(function (i) { atoms[i].p = G.mvec(R, md.atoms[i].p); });
      });
      atoms[lgi].p = [lerp(1.94, 5.6, seg(p, 0.08, 0.45)), 0, 0];
      var bonds = md.bonds.filter(function (b) { return !(b.a === root && b.b === lgi) && !(b.b === root && b.a === lgi); })
        .map(function (b) { return { a: b.a, b: b.b, order: b.order }; });
      if (p < 0.3) bonds.push({ a: root, b: lgi, order: 1, partial: p > 0.12 });
      var lobes = [];
      var la = p < 0.5 ? seg(p, 0.3, 0.45) : 1 - seg(p, 0.6, 0.85);
      if (la > 0.02) lobes.push({ p: [0, 0, 0], dir: [1, 0, 0], len: 1.15, alpha: 0.45 * la, w: 0.42 });
      var tags = [];
      if (p > 0.4 && p < 0.65) tags.push({ p: [0, 1.25, 0.6], text: '+' });
      if (p > 0.35) tags.push({ p: G.add(atoms[lgi].p, [0, 0.95, 0]), text: '−' });
      if (face && p > 0.5) {
        var dNu = lerp(5.0, 1.43, seg(p, 0.5, 0.92));
        var off = atoms.length;
        nuc.atoms.forEach(function (a) { atoms.push({ el: a.el, p: G.add(a.p, [face * dNu, 0, 0]), g: 'nu', h: a.h }); });
        nuc.bonds.forEach(function (b) { bonds.push({ a: b.a + off, b: b.b + off, order: b.order }); });
        if (p > 0.8) bonds.push({ a: root, b: off + nuc.nu, order: 1, partial: p < 0.9 });
      }
      return { atoms: atoms, bonds: bonds, lobes: lobes, tags: tags };
    };
  }

  /* ----------------------------------------------------------------- E2 */

  /* The anti-coplanar model: α at the origin, β along +x, the leaving group
     up; `twist` turns the β carbon (degrees, clockwise as the eye sees it). */
  function newmanModel(m, beta, twist) {
    var L = React.lg(m);
    var md = Build3D.build(m, { root: L.a, axis: beta, up: L.x, anti: -1 });
    if (twist) md = Build3D.twist(md, md.of[L.a], md.of[beta], -twist);
    return md;
  }

  /* p from 0 to 1 for the model at its current twist; ok if the group anti
     to the leaving group is an H. */
  function e2(m, beta, twist, key) {
    var L = React.lg(m);
    var md = newmanModel(m, beta, twist);
    var a = md.of[L.a], b = md.of[beta], lgi = md.of[L.x];
    var nm = Build3D.newman(md, a, b);
    var antiAtom = nm.back.filter(function (x) { return Math.abs(x.a - 180) < 3; })[0];
    var hi = antiAtom ? antiAtom.i : null;
    var ok = hi != null && md.atoms[hi].el === 'H';
    var frontG = nm.front.filter(function (x) { return x.i !== lgi; }).map(function (x) { return { head: x.i, atoms: subtree(md, x.i, a), ang: x.a }; });
    var backG = nm.back.filter(function (x) { return x.i !== hi; }).map(function (x) { return { head: x.i, atoms: subtree(md, x.i, b), ang: x.a }; });
    var base = species(React.REAGENTS[key || 'NaOEt'].species, [0.2, -1, 0.3]);
    var hDir = hi != null ? G.unit(G.sub(md.atoms[hi].p, md.atoms[b].p)) : [0, -1, 0];
    function frame(p) {
      var atoms = copyAtoms(md);
      if (!ok) return { atoms: atoms, bonds: md.bonds.map(function (x) { return { a: x.a, b: x.b, order: x.order }; }), ok: false };
      var e = seg(p, 0.25, 0.85);
      /* both carbons flatten: their groups swing toward 90° and 270° */
      var cc = lerp(1.54, 1.34, e);
      var Bpos = [cc, 0, 0];
      function swing(list, centre, from, sign) {
        list.forEach(function (g) {
          var a0 = g.ang * Math.PI / 180;
          var target = g.ang < 180 ? 90 : 270;
          var ang = lerp(g.ang, target, e) * Math.PI / 180;
          var xc = lerp(sign / 3, sign / 2, e);
          var T = Math.sqrt(1 - xc * xc);
          var d0 = G.unit(G.sub(md.atoms[g.head].p, from));
          /* screen angle to model: up = +y, right = +z */
          var d1 = [xc, T * Math.cos(ang), T * Math.sin(ang)];
          var R = turnOnto(d0, G.unit(d1));
          g.atoms.forEach(function (i) { atoms[i].p = G.add(centre, G.mvec(R, G.sub(md.atoms[i].p, from))); });
          void a0;
        });
      }
      swing(frontG, [0, 0, 0], md.atoms[a].p, -1);
      atoms[b].p = Bpos;
      swing(backG, Bpos, md.atoms[b].p, 1);
      /* the leaving group goes up and away, the H goes to the base */
      var lgDir = G.unit(md.atoms[lgi].p);
      atoms[lgi].p = G.mul(lgDir, lerp(1.94, 4.6, seg(p, 0.35, 0.95)));
      var hStart = G.add(Bpos, G.mul(hDir, 1.09));
      var oFinal = G.add(Bpos, G.mul(hDir, 1.09 + 0.96 + 0.25));
      var oPos = G.add(Bpos, G.mul(hDir, lerp(4.6, 1.09 + 0.96 + 0.25, seg(p, 0, 0.5)) + (p > 0.5 ? lerp(0, 1.6, seg(p, 0.6, 1)) : 0)));
      var hPos = p < 0.4 ? hStart : G.add(hStart, G.mul(hDir, lerp(0, 0.25 + 0.2, seg(p, 0.4, 0.6)) + (p > 0.6 ? lerp(0, 1.6, seg(p, 0.6, 1)) : 0)));
      atoms[hi].p = hPos;
      void oFinal;
      var off = atoms.length;
      base.atoms.forEach(function (x) { atoms.push({ el: x.el, p: G.add(x.p, oPos), g: 'base', h: x.h }); });
      var bonds = md.bonds.filter(function (x) {
        var pair = [x.a, x.b];
        return !(pair.indexOf(a) >= 0 && pair.indexOf(lgi) >= 0) && !(pair.indexOf(b) >= 0 && pair.indexOf(hi) >= 0) &&
               !(pair.indexOf(a) >= 0 && pair.indexOf(b) >= 0);
      }).map(function (x) { return { a: x.a, b: x.b, order: x.order }; });
      base.bonds.forEach(function (x) { bonds.push({ a: x.a + off, b: x.b + off, order: x.order }); });
      bonds.push({ a: a, b: b, order: p > 0.7 ? 2 : 1 });
      if (p < 0.65) bonds.push({ a: a, b: lgi, order: 1, partial: p > 0.3 });
      if (p < 0.6) bonds.push({ a: b, b: hi, order: 1, partial: p > 0.3 });
      if (p > 0.3) bonds.push({ a: hi, b: off + base.nu, order: 1, partial: p < 0.6 });
      var lobes = [];
      var la = seg(p, 0.3, 0.6) * (1 - seg(p, 0.75, 0.95));
      if (la > 0.02) {
        lobes.push({ p: [0, 0, 0], dir: [0, 1, 0], len: 1.0, alpha: 0.5 * la });
        lobes.push({ p: Bpos, dir: [0, 1, 0], len: 1.0, alpha: 0.5 * la });
      }
      var tags = [];
      if (p > 0.35 && p < 0.65) tags.push({ p: [cc / 2, -2.4, 0], text: '‡', cls: 'accent' });
      return { atoms: atoms, bonds: bonds, lobes: lobes, tags: tags, ok: true };
    }
    return { frame: frame, ok: ok, model: md, newman: nm, a: a, b: b, lg: lgi, h: hi };
  }

  /* -------------------------------------------------- the back side */

  /* The nucleophile coming in along -x toward the α carbon, stopping where
     it would overlap a group: { frame(p), stop (Å from C), blockers }. */
  function approach(m, key) {
    var L = React.lg(m);
    var md = Build3D.build(m, { root: L.a, axis: L.x });
    var root = md.of[L.a];
    var nuc = species(React.REAGENTS[key].species, [-1, 0.6, 0.3]);
    var rS = ELEMENTS[nuc.atoms[0].el].vdw;
    /* the α carbon's own H atoms flatten out of the way in the transition
       state; what blocks the back side is everything further out */
    var near = {};
    md.bonds.forEach(function (b) { if (b.a === root) near[b.b] = 1; if (b.b === root) near[b.a] = 1; });
    function contacts(d) {
      var hit = [];
      md.atoms.forEach(function (a, i) {
        if (i === root || near[i] || a.g === L.x) return;
        if (G.dist(a.p, [-d, 0, 0]) < (rS + ELEMENTS[a.el].vdw) * 0.72) hit.push(i);
      });
      return hit;
    }
    var TS = 2.45, stop = TS, blockers = contacts(TS), first = null;
    for (var d = 5.0; d >= TS; d -= 0.02) {
      var hit = contacts(d);
      if (hit.length && first == null) first = { d: d, hit: hit };
    }
    /* three β carbons close the path: the nucleophile stops at first contact */
    var blocked = first && first.hit.length >= 3;
    if (blocked) { stop = first.d; blockers = first.hit; }
    return {
      stop: stop, blockers: blockers, blocked: !!blocked, crowd: blockers.length,
      frame: function (p) {
        var atoms = copyAtoms(md);
        var dNu = lerp(5.4, stop, smooth(p));
        var off = atoms.length;
        nuc.atoms.forEach(function (a) { atoms.push({ el: a.el, p: G.add(a.p, [-dNu, 0, 0]), g: 'nu' }); });
        var bonds = md.bonds.map(function (b) { return { a: b.a, b: b.b, order: b.order }; });
        nuc.bonds.forEach(function (b) { bonds.push({ a: b.a + off, b: b.b + off, order: b.order }); });
        if (p > 0.97) blockers.forEach(function (i) { atoms[i].glow = 'bad'; });
        atoms[root].tint = 'accent';
        return { atoms: atoms, bonds: bonds };
      }
    };
  }

  /* --------------------------------------------------- energy profiles */

  var PROFILES = {
    sn2: [{ E: 0, t: 'Reactants' }, { E: 1, t: 'Transition state', ts: true }, { E: -0.35, t: 'Products' }],
    sn1: [{ E: 0, t: 'Substrate' }, { E: 1, t: '', ts: true }, { E: 0.62, t: 'Carbocation' }, { E: 0.74, t: '', ts: true },
          { E: 0.06, t: 'Oxonium ion' }, { E: 0.14, t: '', ts: true }, { E: -0.22, t: 'Product' }],
    sn1ion: [{ E: 0, t: 'Substrate' }, { E: 1, t: '', ts: true }, { E: 0.62, t: 'Carbocation' }, { E: 0.74, t: '', ts: true }, { E: -0.22, t: 'Product' }],
    e2: [{ E: 0, t: 'Reactants' }, { E: 1, t: 'Transition state', ts: true }, { E: -0.3, t: 'Products' }],
    e1: [{ E: 0, t: 'Substrate' }, { E: 1, t: '', ts: true }, { E: 0.62, t: 'Carbocation' }, { E: 0.8, t: '', ts: true }, { E: -0.1, t: 'Alkene' }],
    shift: [{ E: 0, t: 'Substrate' }, { E: 1, t: '', ts: true }, { E: 0.66, t: '2° carbocation' }, { E: 0.74, t: '', ts: true },
            { E: 0.42, t: '3° carbocation' }, { E: 0.5, t: '', ts: true }, { E: -0.2, t: 'Product' }]
  };

  return { sn2: sn2, sn1: sn1, e2: e2, approach: approach, newmanModel: newmanModel, PROFILES: PROFILES, smooth: smooth };
})();

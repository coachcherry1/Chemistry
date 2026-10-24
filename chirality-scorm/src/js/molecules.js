/* molecules.js: every molecule in the activity, written down once, the way a
 * student sees it drawn, and the 3D model built from that drawing.
 *
 * Three kinds of drawing:
 *
 *   centre  one chirality centre with four groups, drawn in a template:
 *           two bonds in the plane of the page, one wedge (toward the
 *           reader) and one dash (away). Template 'V' has the two plain bonds
 *           up and the wedge and dash down; template 'A' is the same turned
 *           upside down.
 *   chain   a zigzag of carbons in the plane of the page. Each carbon in the
 *           middle of the zigzag has two more bonds, one on a wedge and one on
 *           a dash, pointing out of the zigzag's angle. `ends` names groups
 *           drawn at the two ends (as in the Newman activity's drawings of
 *           2,3-dibromobutane); without them the zigzag ends in CH₃ carbons.
 *   ring    cyclohexane drawn flat, a wedge for the top face and a dash for
 *           the bottom face, as in the chairs activity. Its 3D model is a
 *           chair (the more stable one).
 *
 * The 3D model is exact (tetrahedral angles, real bond lengths) and lives in
 * the page frame of geom.js, so a wedge in the drawing IS a bond pointing at
 * the reader in 3D. Priorities, R and S, chirality centres and every
 * relationship are computed from the model (cip.js, stereo.js), never typed
 * in, and tools/validate.js checks the drawings against the model.
 */

var MOLECULES = (function () {
  'use strict';

  var G = GEOM;
  var S2 = Math.sqrt(2 / 3), C2 = Math.sqrt(1 / 3);

  /* Template slot directions. */
  var TEMPLATES = {
    V: { ul: [-S2, C2, 0], ur: [S2, C2, 0], w: [0, -C2, S2], d: [0, -C2, -S2] },
    A: { ll: [-S2, -C2, 0], lr: [S2, -C2, 0], w: [0, C2, S2], d: [0, C2, -S2] }
  };
  var SLOT_ORDER = { V: ['ul', 'ur', 'w', 'd'], A: ['ll', 'lr', 'w', 'd'] };

  var M = {};

  function def(id, spec) { spec.id = id; M[id] = spec; }

  /* ------------------------------------------------------- the molecules */

  /* Part 1: mirror images */
  def('chbrclf', { name: 'Bromochlorofluoromethane', formula: 'CHBrClF', centre: { tpl: 'V', ul: 'Br', ur: 'Cl', w: 'F', d: 'H' } });
  def('ch2brcl', { name: 'Bromochloromethane', formula: 'CH₂BrCl', centre: { tpl: 'V', ul: 'Br', ur: 'Cl', w: 'H', d: 'H' } });

  /* Part 1: finding chirality centres in bond-line formulas (no wedges) */
  def('butanol_line', { name: '2-Butanol', chain: { n: 4, subs: { 2: { w: 'OH', plain: true } } } });
  def('methylpentane', { name: '3-Methylpentane', chain: { n: 5, subs: { 3: { w: 'CH3', plain: true } } } });
  def('dimethylpentane', { name: '2,3-Dimethylpentane', chain: { n: 5, subs: { 2: { w: 'CH3', plain: true }, 3: { d: 'CH3', plain: true } } } });
  def('bcb_line', { name: '2-Bromo-3-chlorobutane', chain: { n: 4, subs: { 2: { w: 'Br', plain: true }, 3: { w: 'Cl', plain: true } } } });
  def('methylhexane', { name: '3-Methylhexane', chain: { n: 6, subs: { 3: { w: 'CH3', plain: true } } } });
  def('dimethylbutane', { name: '2,2-Dimethylbutane', chain: { n: 4, subs: { 2: { w: 'CH3', d: 'CH3', plain: true } } } });
  def('chloropropane', { name: '1,2-Dichloropropane', chain: { n: 3, subs: { 2: { w: 'Cl', plain: true } }, endSub: { 1: 'Cl' } } });

  /* Part 2: priorities */
  def('bcfe', { name: '1-Bromo-1-chloro-1-fluoroethane', formula: 'CBrClF–CH₃', centre: { tpl: 'V', ul: 'Br', ur: 'F', w: 'Cl', d: 'CH3' } });
  def('butanol', { name: '2-Butanol', centre: { tpl: 'V', ul: 'CH3', ur: 'Et', w: 'OH', d: 'H' } });
  def('tmb', { name: '2,3,3-Trimethyl-1-butanol', centre: { tpl: 'V', ul: 'CH2OH', ur: 'tBu', w: 'CH3', d: 'H' } });
  def('glyceraldehyde', { name: 'Glyceraldehyde', centre: { tpl: 'V', ul: 'CHO', ur: 'CH2OH', w: 'OH', d: 'H' } });
  def('alanine', { name: 'Alanine', centre: { tpl: 'V', ul: 'CH3', ur: 'COOH', w: 'NH2', d: 'H' } });
  def('lactic', { name: 'Lactic acid', centre: { tpl: 'V', ul: 'CH3', ur: 'COOH', w: 'OH', d: 'H' } });
  def('methylpentene', { name: '3-Methyl-1-pentene', centre: { tpl: 'V', ul: 'Et', ur: 'Vinyl', w: 'CH3', d: 'H' } });
  def('methylhexane_c', { name: '3-Methylhexane', centre: { tpl: 'V', ul: 'Pr', ur: 'Et', w: 'CH3', d: 'H' } });
  def('chloroethanol', { name: '1-Chloroethanol', centre: { tpl: 'V', ul: 'CH3', ur: 'Cl', w: 'OH', d: 'H' } });
  def('bromomethylbutane', { name: '1-Bromo-2-methylbutane', centre: { tpl: 'V', ul: 'CH2Br', ur: 'Et', w: 'CH3', d: 'H' } });
  def('bromotmb', { name: '1-Bromo-2,3,3-trimethylbutane', centre: { tpl: 'V', ul: 'CH2Br', ur: 'tBu', w: 'CH3', d: 'H' } });
  def('propanol2', { name: '2-Propanol', centre: { tpl: 'V', ul: 'CH3', ur: 'CH3', w: 'OH', d: 'H' } });
  def('ethanol', { name: 'Ethanol', centre: { tpl: 'V', ul: 'CH3', ur: 'OH', w: 'H', d: 'H' } });

  /* Part 3: R and S */
  def('bromobutane', { name: '2-Bromobutane', chain: { first: 2, n: 2, ends: ['CH3', 'CH3'],
    subs: { 2: { w: 'Br', d: 'H' } } }, note: 'drawn as in the Newman activity' });
  def('butanol_S', { name: '2-Butanol', centre: { tpl: 'V', ul: 'CH3', ur: 'Et', w: 'OH', d: 'H' } });
  def('alanine_w', { name: 'Alanine', centre: { tpl: 'V', ul: 'COOH', ur: 'CH3', w: 'H', d: 'NH2' } });
  def('bcfe_plane', { name: '1-Bromo-1-chloro-1-fluoroethane', formula: 'CBrClF–CH₃', centre: { tpl: 'A', ll: 'CH3', lr: 'Br', w: 'Cl', d: 'F' } });
  def('butanol_hidden', { name: '2-Butanol', chain: { n: 4, subs: { 2: { d: 'OH' } } } });
  def('butanol_R', { name: '2-Butanol', centre: { tpl: 'V', ul: 'Et', ur: 'CH3', w: 'OH', d: 'H' } });
  def('lactic_w', { name: 'Lactic acid', centre: { tpl: 'A', ll: 'COOH', lr: 'CH3', w: 'H', d: 'OH' } });
  def('glyceraldehyde_p', { name: 'Glyceraldehyde', centre: { tpl: 'V', ul: 'H', ur: 'CHO', w: 'CH2OH', d: 'OH' } });
  def('chbrclf_w', { name: 'Bromochlorofluoromethane', formula: 'CHBrClF', centre: { tpl: 'V', ul: 'Cl', ur: 'F', w: 'H', d: 'Br' } });
  def('bromobutane_line', { name: '2-Bromobutane', chain: { n: 4, subs: { 2: { d: 'Br' } } } });
  def('butanol_line_w', { name: '2-Butanol', chain: { n: 4, subs: { 2: { w: 'OH' } } } });

  /* Part 4: two chirality centres. Drawn like the Newman activity's
     2,3-dibromobutane: C2 and C3 in the middle, CH₃ at each end. */
  function pair(id, name, x, y, cx, cy, end) {
    def(id, { name: name, chain: { first: 2, n: 2, ends: [end || 'CH3', end || 'CH3'],
      subs: { 2: cx === 'w' ? { w: x, d: 'H' } : { w: 'H', d: x }, 3: cy === 'w' ? { w: y, d: 'H' } : { w: 'H', d: y } } } });
  }
  pair('bcb_ww', '2-Bromo-3-chlorobutane', 'Br', 'Cl', 'w', 'w');
  pair('bcb_wd', '2-Bromo-3-chlorobutane', 'Br', 'Cl', 'w', 'd');
  pair('bcb_dw', '2-Bromo-3-chlorobutane', 'Br', 'Cl', 'd', 'w');
  pair('bcb_dd', '2-Bromo-3-chlorobutane', 'Br', 'Cl', 'd', 'd');
  /* Molecules A and B of the Newman activity, exactly as drawn there */
  pair('dbb_A', '2,3-Dibromobutane', 'Br', 'Br', 'w', 'd');
  pair('dbb_B', '2,3-Dibromobutane', 'Br', 'Br', 'w', 'w');
  pair('dbb_C', '2,3-Dibromobutane', 'Br', 'Br', 'd', 'd');
  pair('dbb_D', '2,3-Dibromobutane', 'Br', 'Br', 'd', 'w');
  pair('diol_wd', '2,3-Butanediol', 'OH', 'OH', 'w', 'd');
  pair('diol_ww', '2,3-Butanediol', 'OH', 'OH', 'w', 'w');
  pair('diol_dd', '2,3-Butanediol', 'OH', 'OH', 'd', 'd');
  pair('diol_dw', '2,3-Butanediol', 'OH', 'OH', 'd', 'w');
  /* tartaric acid: only for checking the priority rules against the
     textbook's natural and meso forms (tools/validate.js) */
  pair('tart_wd', 'Tartaric acid', 'OH', 'OH', 'w', 'd', 'COOH');
  pair('tart_ww', 'Tartaric acid', 'OH', 'OH', 'w', 'w', 'COOH');

  /* Part 4: rings (flat drawings and chairs, as in the chairs activity) */
  def('cis13', { name: 'cis-1,3-Dimethylcyclohexane', ring: { 1: { t: 'CH3' }, 3: { t: 'CH3' } } });
  def('trans13', { name: 'trans-1,3-Dimethylcyclohexane', ring: { 1: { t: 'CH3' }, 3: { b: 'CH3' } } });
  def('cis14', { name: 'cis-1,4-Dimethylcyclohexane', ring: { 1: { t: 'CH3' }, 4: { t: 'CH3' } } });
  def('trans14', { name: 'trans-1,4-Dimethylcyclohexane', ring: { 1: { t: 'CH3' }, 4: { b: 'CH3' } } });
  def('methylcyclohexane', { name: 'Methylcyclohexane', ring: { 1: { t: 'CH3' } } });

  /* ------------------------------------------------------- the builder */

  function Model(spec) {
    this.id = spec.id;
    this.name = spec.name;
    this.spec = spec;
    this.atoms = [];
    this.bonds = [];
    this.index = {};
  }
  Model.prototype.add = function (a) {
    a.i = this.atoms.length;
    this.index[a.id] = a.i;
    this.atoms.push(a);
    return a.i;
  };
  Model.prototype.bond = function (i, j, order) { this.bonds.push([i, j, order || 1]); };
  Model.prototype.atom = function (id) { return this.atoms[this.index[id]]; };

  /* Grow group `gk` from atom `parent`, its first atom at position `p`.
     `ref` is a third atom's position, so the group's own atoms can be
     placed staggered. Returns the index of the group's first atom. */
  function grow(m, gk, parent, p, ref, id, extra) {
    var g = GROUPS[gk];
    var a = { id: id, el: g.el, p: p, group: gk, parent: parent };
    if (extra) Object.keys(extra).forEach(function (k) { a[k] = extra[k]; });
    var idx = m.add(a);
    m.bond(parent, idx, g.order || 1);
    var pp = m.atoms[parent].p;
    (g.kids || []).forEach(function (k, j) {
      var kg = GROUPS[k];
      var r = bondLength(g.el, kg.el, kg.order);
      var kp = g.flat ? G.place(ref, pp, p, r, 2 * Math.PI / 3, [180, 0][j])
                      : G.place(ref, pp, p, r, G.TET, (g.el === 'N' ? [60, 300] : [180, 60, 300])[j]);
      grow(m, k, idx, kp, pp, id + '.' + j, { sub: true, owner: a.owner, slot: a.slot });
    });
    return idx;
  }

  function buildCentre(spec) {
    var m = new Model(spec);
    var c = spec.centre, T = TEMPLATES[c.tpl];
    m.kind = 'centre';
    m.tpl = c.tpl;
    m.centre = m.add({ id: 'C*', el: 'C', p: [0, 0, 0], centre: true });
    m.slots = {};
    var order = SLOT_ORDER[c.tpl];
    order.forEach(function (s, k) {
      var gk = c[s];
      var dir = T[s];
      var ref = G.mul(T[order[(k + 1) % 4]], 1.5);
      var p = G.mul(dir, bondLength('C', GROUPS[gk].el, GROUPS[gk].order));
      m.slots[s] = grow(m, gk, m.centre, p, ref, s, { head: true, slot: s, owner: m.centre });
    });
    m.pivot = [0, 0, 0];
    return m;
  }

  /* The zigzag. Backbone carbons are numbered from `first`; end groups, if
     any, take the numbers either side. Even-numbered carbons sit at the top
     of the zigzag and odd ones at the bottom, as in the Newman activity's
     drawings (C2 up, C3 down). */
  var ZT = Math.PI / 2 - G.TET / 2;          /* 35.26°: each chain bond's tilt */
  var DX = 1.54 * Math.cos(ZT), DY = 1.54 * Math.sin(ZT);

  function buildChain(spec) {
    var m = new Model(spec);
    var ch = spec.chain;
    var first = ch.first || 1, n = ch.n;
    m.kind = 'chain';
    m.backbone = [];
    var nums = [];
    for (var k = 0; k < n; k++) nums.push(first + k);
    var x0 = -(n - 1) * DX / 2;
    nums.forEach(function (num, k) {
      var up = num % 2 === 0;
      var idx = m.add({ id: 'C' + num, el: 'C', p: [x0 + k * DX, up ? DY / 2 : -DY / 2, 0], num: num, backbone: true, up: up });
      if (k) m.bond(m.backbone[k - 1], idx, 1);
      m.backbone.push(idx);
    });
    m.ends = [null, null];
    /* the in-plane continuation of the zigzag beyond each end */
    function beyond(k, side) {
      var a = m.atoms[m.backbone[k]];
      var num = a.num + side, up = num % 2 === 0;
      return [a.p[0] + side * DX, up ? DY / 2 : -DY / 2, 0];
    }
    m.carbonAt = {};
    m.backbone.forEach(function (idx) { m.carbonAt[m.atoms[idx].num] = idx; });

    var subsOf = ch.subs || {};
    function hangers(k) {
      /* the carbon's own wedge and dash directions, out of the zigzag's angle */
      var a = m.atoms[m.backbone[k]];
      var s = a.up ? 1 : -1;
      return { w: [0, s * C2, S2], d: [0, s * C2, -S2] };
    }
    var ends = ch.ends || [null, null];
    /* the two ends: a group drawn at the end, or a CH₃ carbon of the zigzag */
    [0, 1].forEach(function (e) {
      var k = e ? n - 1 : 0, side = e ? 1 : -1;
      var at = m.backbone[k];
      var gk = ends[e];
      var p0 = m.atoms[at].p;
      var nb = n > 1 ? m.atoms[m.backbone[e ? n - 2 : 1]].p : beyond(k, -side);
      if (gk) {
        var pos = beyond(k, side);
        var p = G.add(p0, G.mul(G.unit(G.sub(pos, p0)), bondLength('C', GROUPS[gk].el, GROUPS[gk].order)));
        var num = m.atoms[at].num + side;
        m.ends[e] = grow(m, gk, at, p, nb, 'C' + num, { head: true, end: e, owner: at, num: num });
        m.carbonAt[num] = m.ends[e];
      }
    });
    /* each backbone carbon: its wedge and dash, or, at an end with no end
       group, three H atoms (or a group from endSub) */
    m.backbone.forEach(function (idx, k) {
      var a = m.atoms[idx];
      var internal = (k > 0 || ends[0]) && (k < n - 1 || ends[1]);
      if (internal) {
        var hs = hangers(k), sub = subsOf[a.num] || {};
        var ref = m.atoms[k > 0 ? m.backbone[k - 1] : m.ends[0]].p;
        ['w', 'd'].forEach(function (s) {
          var gk = sub[s] || 'H';
          var p = G.add(a.p, G.mul(hs[s], bondLength('C', GROUPS[gk].el, GROUPS[gk].order)));
          grow(m, gk, idx, p, ref, a.id + s, { head: true, slot: s, owner: idx, plain: !!sub.plain && gk !== 'H' });
        });
      } else {
        /* a CH₃ end of the zigzag: one H continues the zigzag in the page */
        var side = k === 0 ? -1 : 1;
        var nb = m.atoms[m.backbone[k - side]];
        var nb2 = n > 2 ? m.atoms[m.backbone[k - 2 * side]].p : G.add(nb.p, [0, 0, 1]);
        var endGroup = (ch.endSub || {})[a.num];
        [180, 60, 300].forEach(function (dih, j) {
          var gk = j === 0 && endGroup ? endGroup : 'H';
          var p = G.place(nb2, nb.p, a.p, bondLength('C', GROUPS[gk].el), G.TET, dih);
          grow(m, gk, idx, p, nb.p, a.id + ['e', 'w', 'd'][j], { head: true, slot: ['e', 'w', 'd'][j], owner: idx,
            terminal: true });
        });
      }
    });
    /* rotations of a chain turn it about the middle of its backbone */
    var c = [0, 0, 0];
    m.backbone.forEach(function (i) { c = G.add(c, m.atoms[i].p); });
    m.pivot = G.mul(c, 1 / n);
    return m;
  }

  /* ---- rings: the chair of the chairs activity */

  var RING_R = 1.54 * Math.sqrt(8) / 3, Z0 = 1.54 / 6;
  function ringCarbons(k) {
    var out = [];
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3, z = (i % 2 ? -Z0 : Z0) * (k ? -1 : 1);
      out.push([RING_R * Math.cos(a), RING_R * Math.sin(a), z]);
    }
    return out;
  }
  /* top-face and bottom-face directions on each ring carbon */
  function slotDirs(ring) {
    var half = G.TET / 2;
    return ring.map(function (p, i) {
      var un = G.unit(G.sub(ring[(i + 1) % 6], p)), up = G.unit(G.sub(ring[(i + 5) % 6], p));
      var b = G.mul(G.unit(G.add(un, up)), -1);
      var nrm = G.unit(G.cross(un, up));
      var t = G.add(G.mul(b, Math.cos(half)), G.mul(nrm, Math.sin(half)));
      var bt = G.sub(G.mul(b, Math.cos(half)), G.mul(nrm, Math.sin(half)));
      return t[2] > bt[2] ? { t: t, b: bt } : { t: bt, b: t };
    });
  }
  function axialCount(spec, k) {
    var dirs = slotDirs(ringCarbons(k)), n = 0;
    Object.keys(spec.ring).forEach(function (c) {
      ['t', 'b'].forEach(function (f) {
        if (spec.ring[c][f] && Math.abs(dirs[c - 1][f][2]) > 0.9) n++;
      });
    });
    return n;
  }

  function buildRing(spec) {
    var m = new Model(spec);
    m.kind = 'ring';
    var k = axialCount(spec, 0) <= axialCount(spec, 1) ? 0 : 1;
    m.chair = k;
    var ring = ringCarbons(k), dirs = slotDirs(ring);
    m.ringAtoms = ring.map(function (p, i) { return m.add({ id: 'C' + (i + 1), el: 'C', p: p, num: i + 1, ringC: true }); });
    for (var i = 0; i < 6; i++) m.bond(m.ringAtoms[i], m.ringAtoms[(i + 1) % 6], 1);
    m.carbonAt = {};
    m.ringAtoms.forEach(function (idx, j) { m.carbonAt[j + 1] = idx; });
    ring.forEach(function (p, i) {
      var sub = spec.ring[i + 1] || {};
      ['t', 'b'].forEach(function (f) {
        var gk = sub[f] || 'H';
        var q = G.add(p, G.mul(dirs[i][f], bondLength('C', GROUPS[gk].el)));
        var other = G.add(p, dirs[i][f === 't' ? 'b' : 't']);
        grow(m, gk, m.ringAtoms[i], q, other, 'C' + (i + 1) + f, { head: true, slot: f, owner: m.ringAtoms[i],
          axial: Math.abs(dirs[i][f][2]) > 0.9 });
      });
    });
    m.pivot = [0, 0, 0];
    return m;
  }

  function fromSpec(spec) { return spec.centre ? buildCentre(spec) : spec.chain ? buildChain(spec) : buildRing(spec); }

  var cache = {};
  function build(id) {
    if (cache[id]) return cache[id];
    var spec = M[id];
    if (!spec) throw new Error('Unknown molecule ' + id);
    cache[id] = fromSpec(spec);
    return cache[id];
  }

  /* A copy of model m with every atom moved by f(p). Atom indices, ids and
     bonds are kept, so the copy is the same molecule atom for atom. */
  function transformed(m, f, extra) {
    var c = Object.create(Model.prototype);
    Object.keys(m).forEach(function (k) { c[k] = m[k]; });
    c.atoms = m.atoms.map(function (a) {
      var b = {};
      Object.keys(a).forEach(function (k) { b[k] = a[k]; });
      b.p = f(a.p);
      return b;
    });
    c.pivot = f(m.pivot);
    Object.keys(extra || {}).forEach(function (k) { c[k] = extra[k]; });
    return c;
  }

  /* ---- reading the model */

  function neighbours(m) {
    if (m._nb) return m._nb;
    var nb = m.atoms.map(function () { return []; });
    m.bonds.forEach(function (b) {
      nb[b[0]].push({ j: b[1], order: b[2] });
      nb[b[1]].push({ j: b[0], order: b[2] });
    });
    Object.defineProperty(m, '_nb', { value: nb, enumerable: false });
    return nb;
  }

  /* A group written in condensed form: the part of the molecule reached
     from atom `from` through atom `to` (CH₂CH₃, CH(CH₃)₂, CHBrCH₃, COOH...). */
  var SUB = { 1: '', 2: '₂', 3: '₃' };
  function condensed(m, from, to, seen) {
    seen = seen || [from];
    var a = m.atoms[to];
    if (a.ringC) return 'ring carbon C' + a.num;
    if (seen.indexOf(to) >= 0) return '';
    var seen2 = seen.concat([to]);
    var nb = neighbours(m);
    var kids = nb[to].filter(function (x) { return x.j !== from; });
    var hs = kids.filter(function (x) { return m.atoms[x.j].el === 'H'; }).length;
    var heavy = kids.filter(function (x) { return m.atoms[x.j].el !== 'H'; });
    if (a.el === 'H') return 'H';
    var back = nb[to].filter(function (x) { return x.j === from; })[0];
    var head = a.el + (hs ? 'H' + SUB[hs] : '');
    function sub(x) { return condensed(m, to, x.j, seen2); }
    if (a.el !== 'C') return head + heavy.map(sub).join('');      /* OH, NH₂, a halogen */
    var oxo = heavy.filter(function (x) { return x.order === 2 && m.atoms[x.j].el === 'O'; });
    var ene = heavy.filter(function (x) { return x.order === 2 && m.atoms[x.j].el === 'C'; });
    var rest = heavy.filter(function (x) { return x.order === 1; });
    if (oxo.length) {
      var oh = rest.filter(function (x) { return m.atoms[x.j].el === 'O'; });
      return 'C' + (hs ? 'H' : '') + 'O' + (oh.length ? 'OH' : '');
    }
    if (ene.length) return 'CH' + (hs > 1 ? SUB[hs] : '') + '=' + sub(ene[0]);
    if (back && back.order === 2) return head;
    var hetero = rest.filter(function (x) { return m.atoms[x.j].el !== 'C'; }).map(sub);
    var carb = rest.filter(function (x) { return m.atoms[x.j].el === 'C'; }).map(sub);
    var tail = '';
    if (carb.length === 1) tail = carb[0];
    else if (carb.length > 1 && carb.every(function (t) { return t === carb[0]; })) tail = '(' + carb[0] + ')' + SUB[carb.length];
    else if (carb.length > 1) {
      carb.sort(function (x, y) { return x.length - y.length; });
      tail = carb.slice(0, -1).map(function (t) { return '(' + t + ')'; }).join('') + carb[carb.length - 1];
    }
    /* a one-atom group (Br) sits inline; a longer one (OH) in brackets */
    var het = hetero.map(function (t) { return !ELEMENTS[t] && (carb.length || hetero.length > 1) ? '(' + t + ')' : t; });
    if (hetero.length > 1 && hetero.every(function (t) { return t === hetero[0]; })) het = [het[0] + SUB[hetero.length]];
    return head + het.join('') + tail;
  }

  /* Display name of an atom: "C2" for a numbered carbon, else its element. */
  function atomName(m, i) {
    var a = m.atoms[i];
    return a.num != null ? 'C' + a.num : a.el;
  }

  Object.defineProperty(M, 'build', { value: build });
  Object.defineProperty(M, 'fromSpec', { value: fromSpec });
  Object.defineProperty(M, 'transformed', { value: transformed });
  Object.defineProperty(M, 'neighbours', { value: neighbours });
  Object.defineProperty(M, 'condensed', { value: condensed });
  Object.defineProperty(M, 'atomName', { value: atomName });
  Object.defineProperty(M, 'TEMPLATES', { value: TEMPLATES });
  Object.defineProperty(M, 'SLOT_ORDER', { value: SLOT_ORDER });
  Object.defineProperty(M, 'ringCarbons', { value: ringCarbons });
  return M;
})();

function molecule(id) { return MOLECULES.build(id); }

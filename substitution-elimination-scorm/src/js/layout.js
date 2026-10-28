/* layout.js: where every atom of a bond-line drawing goes, computed from the
 * graph (mol.js), never placed by hand.
 *
 * A chain is drawn as a zigzag along its longest path (the most carbons,
 * then the most atoms), every other group at 120° to its neighbours, two
 * groups on one carbon splayed either side of the open angle, and a
 * tert-butyl group as a cross. A ring is a regular hexagon with C1 at the
 * right, numbered anticlockwise, its groups pointing straight out.
 *
 * Stereochemistry is drawn from the graph: a stereogenic double bond is laid
 * out cis or trans as the graph says (a cis one turned level, as Klein draws
 * it), and every chirality centre gets a wedge or a dash on one of its
 * branches, whichever makes the drawing's handedness match the parity.
 * tools/validate.js reads each drawing back and checks both.
 *
 * Alkyl groups on O and S are abbreviated as Klein writes them (OEt, OMe,
 * Ot-Bu, SCH3) unless `opts.full`; in a mechanism (`opts.mech`) the O or S
 * is drawn as its own atom with its lone pairs and the alkyl group as a
 * short label (Et, Me, t-Bu).
 */

var Layout = (function () {
  'use strict';

  var RAD = Math.PI / 180;
  var BL = 1;

  function dir(a) { return [Math.cos(a * RAD), Math.sin(a * RAD)]; }
  function addv(p, d, s) { return [p[0] + d[0] * s, p[1] + d[1] * s]; }
  function angOf(p, q) { return Math.atan2(q[1] - p[1], q[0] - p[0]) / RAD; }
  function norm(a) { a = a % 360; if (a > 180) a -= 360; if (a <= -180) a += 360; return a; }

  /* Alkyl abbreviations, for a carbon entered from a heteroatom. */
  var SHORT = { methyl: 'Me', ethyl: 'Et', 'tert-butyl': 't-Bu', isopropyl: 'i-Pr', propyl: 'Pr' };

  /* The atoms each abbreviation hides, and its text: { root, hide: [], text, left } */
  function abbreviations(m, opts) {
    var out = {};
    if (opts.full) return out;
    m.atoms.forEach(function (a, i) {
      if (a.el !== 'O' && a.el !== 'S' && a.el !== 'N') return;
      var nb = m.nb(i);
      var heavy = nb.filter(function (x) { return m.atoms[x.j].el !== 'H'; });
      /* azide: N=N=N on carbon */
      if (a.el === 'N') {
        var nn = heavy.filter(function (x) { return m.atoms[x.j].el === 'N'; });
        if (nn.length === 1 && heavy.length === 2 && !opts.mech) {
          var mid = nn[0].j;
          var far = m.nb(mid).filter(function (x) { return x.j !== i && m.atoms[x.j].el === 'N'; })[0];
          out[i] = { hide: [mid, far ? far.j : null].filter(function (x) { return x != null; }), text: 'N₃', left: 'N₃' };
        }
        return;
      }
      /* the alkyl part of an ether or thioether, entered from the O or S */
      var cs = heavy.filter(function (x) { return m.atoms[x.j].el === 'C'; });
      var allC = m.atoms.filter(function (x) { return x.el === 'C'; }).length;
      var small = cs.length === 1 && Mol.side(m, cs[0].j, i).filter(function (j) { return m.atoms[j].el === 'C'; }).length === allC;
      if (cs.length !== 2 && !small) return;
      /* pick the side that is a simple alkyl group, the smaller one */
      var cand = cs.map(function (x) { return { j: x.j, al: Name.alkyl(m, x.j, i), size: Mol.side(m, x.j, i).length }; })
        .filter(function (x) { return x.al && SHORT[x.al]; })
        .sort(function (p, q) { return p.size - q.size; });
      if (!cand.length) return;
      var c = cand[0];
      if (cand.length === 2 && cand[0].size === cand[1].size && opts.keep != null && cand[0].j === opts.keep) c = cand[1];
      var hide = Mol.side(m, c.j, i);
      var short = SHORT[c.al];
      if (opts.mech || small) out[c.j] = { hide: hide.filter(function (x) { return x !== c.j; }), text: short, left: short, alkyl: true };
      else {
        var X = a.el === 'O' ? 'O' : 'S';
        if (a.el === 'S' && c.al === 'methyl') out[i] = { hide: hide, text: 'SCH₃', left: 'H₃CS' };
        else out[i] = { hide: hide, text: X + short, left: short + X };
      }
    });
    return out;
  }

  /* The drawable tree: atoms not hidden inside an abbreviation, and the H
     atoms that are real atoms in the graph. */
  function drawable(m, abbr) {
    var hidden = {};
    Object.keys(abbr).forEach(function (k) { abbr[k].hide.forEach(function (j) { hidden[j] = 1; }); });
    var nodes = [];
    m.atoms.forEach(function (a, i) { if (!hidden[i]) nodes.push(i); });
    var adj = {};
    nodes.forEach(function (i) { adj[i] = m.nb(i).filter(function (x) { return !hidden[x.j]; }); });
    return { nodes: nodes, adj: adj, hidden: hidden };
  }

  /* Longest path through the tree, most carbons first. */
  function mainChain(m, T, prefer) {
    var best = null;
    function score(p) {
      var c = p.filter(function (i) { return m.atoms[i].el === 'C'; }).length;
      var st = 0;
      for (var k = 0; k + 1 < p.length; k++) {
        var b = m.bondBetween(p[k], p[k + 1]);
        if (m.bonds[b].cfg && m.bonds[b].order === 2) st++;
      }
      var pref = prefer ? p.filter(function (i) { return prefer.indexOf(i) >= 0; }).length : 0;
      return [st, c, p.length, pref, -p.filter(function (i) { return m.atoms[i].el === 'H'; }).length];
    }
    function cmp(a, b) { for (var k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k] - b[k]; return 0; }
    T.nodes.forEach(function (s) {
      if (T.adj[s].length > 1) return;
      (function walk(p) {
        var last = p[p.length - 1];
        var ext = T.adj[last].filter(function (x) { return p.indexOf(x.j) < 0; });
        if (!ext.length) {
          var sc = score(p);
          if (!best || cmp(sc, best.sc) > 0) best = { p: p, sc: sc };
          return;
        }
        ext.forEach(function (x) { walk(p.concat([x.j])); });
      })([s]);
    });
    return best ? best.p : [T.nodes[0]];
  }

  /* Directions for k branches at an atom whose placed bonds point along
     `used` (degrees). */
  function spread(used, k, tbu) {
    if (!k) return [];
    if (used.length === 1) {
      var back = used[0];
      if (k === 1) return [back + 120];
      if (k === 2) return [back + 120, back - 120];
      return [back + 180, back + 90, back - 90];
    }
    /* the widest gap between placed bonds */
    var s = used.map(norm).sort(function (a, b) { return a - b; });
    var gap = 0, at = 0;
    for (var i = 0; i < s.length; i++) {
      var a0 = s[i], a1 = i + 1 < s.length ? s[i + 1] : s[0] + 360;
      if (a1 - a0 > gap) { gap = a1 - a0; at = (a0 + a1) / 2; }
    }
    if (k === 1) return [at];
    if (k === 2) return [at + 40, at - 40];
    return [at, at + 60, at - 60];
  }

  function layout(m, opts) {
    opts = opts || {};
    var abbr = abbreviations(m, opts);
    var T = drawable(m, abbr);
    var pos = {};
    var ring = Mol.ringOf(m);
    var placed = [];
    var mainPath = null;

    function place(i, p) { pos[i] = p; placed.push(i); }

    /* grow the subtree at i, entered from `from` along direction a */
    function grow(i, from, a, sign) {
      var kids = T.adj[i].filter(function (x) { return x.j !== from && pos[x.j] == null; });
      if (!kids.length) return;
      /* the longest branch continues the zigzag */
      kids.sort(function (p, q) { return depth(q.j, i) - depth(p.j, i); });
      var back = a + 180;
      var tbu = kids.length === 3;
      var dirs;
      if (kids.length === 1) {
        var order = T.adj[i].filter(function (x) { return x.j === from; })[0];
        var straight = order && (order.order === 3 || kids[0].order === 3 ||
          (m.bonds[order.b].order === 2 && m.bonds[kids[0].b].order === 2));
        dirs = [straight ? a : a + 60 * sign];
      } else if (kids.length === 2) dirs = [a + 60 * sign, a - 60 * sign];
      else dirs = [a, a + 90, a - 90];
      kids.forEach(function (x, k) {
        var d = dirs[k] != null ? dirs[k] : a;
        place(x.j, addv(pos[i], dir(d), BL));
        grow(x.j, i, d, -sign * (k === 0 ? 1 : -1));
      });
    }

    function depth(i, from) {
      var best = 0;
      T.adj[i].forEach(function (x) { if (x.j !== from) best = Math.max(best, 1 + depth(x.j, i)); });
      return best;
    }

    if (ring) {
      ring.forEach(function (c, k) { place(c, dir(k * 60).map(function (v) { return v * BL; })); });
      ring.forEach(function (c, k) {
        var subs = T.adj[c].filter(function (x) { return ring.indexOf(x.j) < 0; });
        var rad = k * 60;
        var ds = subs.length === 1 ? [rad] : subs.length === 2 ? [rad + 32, rad - 32] : [];
        /* the top-face group on the anticlockwise side, as in the chairs activity */
        subs.forEach(function (x, n) {
          place(x.j, addv(pos[c], dir(ds[n]), BL));
          grow(x.j, c, ds[n], 1);
        });
      });
    } else {
      var main = mainChain(m, T, opts.prefer);
      mainPath = main;
      /* zigzag phase: put the most important group on the main chain pointing up */
      var phase = 1;
      /* by default the carbon carrying the leaving group, else a chirality centre */
      var key = opts.up != null ? opts.up : null;
      if (key == null) main.forEach(function (i) {
        if (key == null && m.nb(i).some(function (x) { return HALOGENS.indexOf(m.atoms[x.j].el) >= 0 && main.indexOf(x.j) < 0; })) key = i;
      });
      var angles = [];
      for (var k = 0; k + 1 < main.length; k++) angles.push(main.length === 2 ? 0 : 30 * (k % 2 ? -1 : 1));
      function build(ph) {
        var ang = angles.map(function (a) { return a * ph; });
        /* a triple bond is straight on from the bond before it */
        for (var tq = 1; tq < ang.length; tq++) {
          if (m.bonds[m.bondBetween(main[tq], main[tq + 1])].order === 3) {
            var shift = ang[tq - 1] - ang[tq];
            for (var tr = tq; tr < ang.length; tr++) ang[tr] += shift;
          }
        }
        /* a cis double bond: reflect the rest of the chain across it */
        for (var q = 0; q + 1 < main.length; q++) {
          var bk = m.bondBetween(main[q], main[q + 1]);
          var bd = m.bonds[bk];
          if (bd.order !== 2 || !bd.cfg || q === 0 || q + 2 >= main.length) continue;
          var prev = main[q - 1], next = main[q + 2];
          var want = relOf(bd, main[q], main[q + 1], prev, next);
          if (want == null) continue;
          /* in a plain zigzag the chain neighbours are trans */
          var isCis = ((ang[q] - ang[q - 1]) * (ang[q + 1] - ang[q]) > 0);
          if ((want === 'cis') !== isCis) for (var r = q + 1; r < ang.length; r++) ang[r] = 2 * ang[q] - ang[r];
        }
        var P = {};
        P[main[0]] = [0, 0];
        for (var t = 0; t < ang.length; t++) P[main[t + 1]] = addv(P[main[t]], dir(ang[t]), BL);
        return { P: P, ang: ang };
      }
      var lay = build(1);
      if (key != null) {
        var ki = main.indexOf(key);
        if (ki > 0 && ki < main.length - 1) {
          var up = (lay.ang[ki - 1] > lay.ang[ki]);
          if (!up) lay = build(-1);
        }
      }
      main.forEach(function (i) { place(i, lay.P[i]); });
      main.forEach(function (i, k) {
        var used = [];
        if (k > 0) used.push(lay.ang[k - 1] + 180);
        if (k + 1 < main.length) used.push(lay.ang[k]);
        var kids = T.adj[i].filter(function (x) { return main.indexOf(x.j) < 0; });
        kids.sort(function (p, q) { return depth(q.j, i) - depth(p.j, i); });
        var ds = spread(used, kids.length);
        kids.forEach(function (x, n) {
          place(x.j, addv(pos[i], dir(ds[n]), BL));
          var turnSign = k > 0 && k + 1 < main.length && lay.ang[k - 1] > lay.ang[k] ? 1 : -1;
          grow(x.j, i, ds[n], turnSign);
        });
      });
      /* a cis double bond is drawn level */
      for (var q2 = 0; q2 + 1 < main.length; q2++) {
        var b2 = m.bonds[m.bondBetween(main[q2], main[q2 + 1])];
        if (b2.order === 2 && b2.cfg && relOf(b2, main[q2], main[q2 + 1], main[q2 - 1], main[q2 + 2]) === 'cis') {
          var rot = -angOf(pos[main[q2]], pos[main[q2 + 1]]);
          Object.keys(pos).forEach(function (j) {
            var c = Math.cos(rot * RAD), s = Math.sin(rot * RAD), p = pos[j];
            pos[j] = [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
          });
          /* chains hang below the double bond */
          var ref = main[q2 - 1] != null ? pos[main[q2 - 1]] : null;
          if (ref && ref[1] > pos[main[q2]][1]) Object.keys(pos).forEach(function (j) { pos[j] = [pos[j][0], -pos[j][1]]; });
          break;
        }
      }
    }

    /* turned so that the bond from orient[0] to orient[1] points along orient[2] degrees */
    if (opts.orient && pos[opts.orient[0]] && pos[opts.orient[1]]) {
      var o0 = pos[opts.orient[0]];
      var rot2 = (opts.orient[2] - angOf(o0, pos[opts.orient[1]])) * RAD;
      var c2 = Math.cos(rot2), s2 = Math.sin(rot2);
      Object.keys(pos).forEach(function (j) {
        var q = [pos[j][0] - o0[0], pos[j][1] - o0[1]];
        pos[j] = [q[0] * c2 - q[1] * s2, q[0] * s2 + q[1] * c2];
      });
      if (opts.mirrorY) Object.keys(pos).forEach(function (j) { pos[j] = [pos[j][0], -pos[j][1]]; });
    }

    /* wedges and dashes: on a ring, the group on the carbon; on a chain,
       the branches off the main chain (two of them: one wedge, one dash) */
    var wedge = {};
    function isMainNeighbour(c, j) {
      return mainPath && mainPath.indexOf(c) >= 0 && mainPath.indexOf(j) >= 0 &&
        Math.abs(mainPath.indexOf(c) - mainPath.indexOf(j)) === 1;
    }
    /* another ring carbon carrying two different groups (one may be H) */
    function otherRingStereo(c) {
      return ring.some(function (r) {
        if (r === c || !m.atoms[r].parity) return false;
        var g = m.nb(r).filter(function (x) { return ring.indexOf(x.j) < 0; });
        return g.length + m.atoms[r].h === 2 && !(g.length === 2 && Mol.cmp(nodeOf(r, g[0].j), nodeOf(r, g[1].j)) === 0);
      });
    }
    function nodeOf(r, j) { return Mol.rank(m, r).order.filter(function (x) { return x.j === j; })[0].n; }
    function rankMark(j) { var e = m.atoms[j].el; return e === 'C' ? 0 : e === 'H' ? 2 : 1; }
    m.atoms.forEach(function (a, c) {
      if (!a.parity || T.hidden[c] || pos[c] == null) return;
      var onRing = ring && ring.indexOf(c) >= 0;
      if (!onRing && !Mol.isCentre(m, c)) return;
      if (onRing && !Mol.isCentre(m, c) && !otherRingStereo(c)) return;
      var branches = T.adj[c].filter(function (x) {
        return onRing ? ring.indexOf(x.j) < 0 : !isMainNeighbour(c, x.j);
      });
      branches.sort(function (p, q) { return rankMark(q.j) - rankMark(p.j); });
      if (branches.length > 2) branches = branches.slice(0, 2);
      if (!branches.length) return;
      var choices = branches.length === 2 ? [['w', 'd'], ['d', 'w']] : [['w'], ['d']];
      for (var t = 0; t < choices.length; t++) {
        var marks = {};
        branches.forEach(function (x, n) { marks[x.j] = choices[t][n]; });
        if (handed(c, marks) === a.parity.sign) {
          Object.keys(marks).forEach(function (j) { wedge[m.bondBetween(c, +j)] = { from: c, type: marks[j] }; });
          return;
        }
      }
    });

    /* signed volume of the drawn centre: in-page bonds flat, wedges up,
       dashes down, an implicit H opposite the rest */
    function handed(c, marks) {
      var P = {};
      var sum = [0, 0, 0];
      m.nb(c).forEach(function (x) {
        if (pos[x.j] == null) return;
        var d = [pos[x.j][0] - pos[c][0], pos[x.j][1] - pos[c][1], 0];
        var l = Math.hypot(d[0], d[1]) || 1;
        d = [d[0] / l, d[1] / l, marks[x.j] === 'w' ? 0.9 : marks[x.j] === 'd' ? -0.9 : 0];
        P[x.j] = d;
        sum = GEOM.add(sum, GEOM.unit(d));
      });
      P[-1] = GEOM.mul(sum, -1);
      var nb = m.atoms[c].parity.nb.map(function (j) { return P[j]; });
      if (nb.some(function (v) { return !v; })) return 0;
      var v = GEOM.det3(GEOM.sub(nb[1], nb[0]), GEOM.sub(nb[2], nb[0]), GEOM.sub(nb[3], nb[0]));
      return v > 0 ? 1 : -1;
    }

    return { pos: pos, wedge: wedge, abbr: abbr, hidden: T.hidden, adj: T.adj, ring: ring, main: mainPath, handed: handed };
  }

  /* cis or trans for the chain neighbours p (on x) and n (on y) of double
     bond bd, from its stored configuration; null if they are not the
     stored references and cannot be related. */
  function relOf(bd, x, y, p, n) {
    if (!bd.cfg || p == null || n == null) return null;
    var cfg = bd.cfg;
    var na = bd.a === x ? cfg.na : cfg.nb, nb = bd.a === x ? cfg.nb : cfg.na;
    var flip = 0;
    if (na !== p) flip++;
    if (nb !== n) flip++;
    var rel = cfg.rel;
    if (flip % 2) rel = rel === 'cis' ? 'trans' : 'cis';
    return rel;
  }

  /* Cis or trans as drawn, for checks: neighbours a2 of a and b2 of b. */
  function drawnRel(L, a, b, a2, b2) {
    var P = L.pos;
    function sideOf(q) {
      return Math.sign((P[b][0] - P[a][0]) * (P[q][1] - P[a][1]) - (P[b][1] - P[a][1]) * (P[q][0] - P[a][0]));
    }
    return sideOf(a2) === sideOf(b2) ? 'cis' : 'trans';
  }

  return { layout: layout, drawnRel: drawnRel, relOf: relOf, abbreviations: abbreviations };
})();

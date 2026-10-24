/* model.js — a drawing, and everything worked out from it.
 *
 *   doc = { atoms:  [{ id, el, x, y, lp, e1 }],
 *           bonds:  [{ id, a, b, order }],          order 1, 2, 3 or 1.5
 *           arrows: [{ id, x, y, kind }],           kind 'res' ↔, 'rxn' →, 'eq' ⇌
 *           next }                                  the next free id number
 *
 * x, y are in grid units (one unit = one bond length). lp is lone pairs, e1
 * single (unpaired) electrons. Order 1.5 is a partial double bond, drawn as a
 * solid line plus a dashed one (a resonance hybrid).
 *
 * Nothing here knows about the screen. Every edit goes through these
 * functions so the editor, the formula starter and the tests agree.
 */

var Model = (function () {
  'use strict';

  function blank() { return { atoms: [], bonds: [], arrows: [], next: 1 }; }

  function clone(doc) { return JSON.parse(JSON.stringify(doc)); }

  function newId(doc, p) { return p + (doc.next++); }

  function atom(doc, id) {
    for (var i = 0; i < doc.atoms.length; i++) if (doc.atoms[i].id === id) return doc.atoms[i];
    return null;
  }
  function bond(doc, id) {
    for (var i = 0; i < doc.bonds.length; i++) if (doc.bonds[i].id === id) return doc.bonds[i];
    return null;
  }
  function arrow(doc, id) {
    for (var i = 0; i < doc.arrows.length; i++) if (doc.arrows[i].id === id) return doc.arrows[i];
    return null;
  }
  function find(doc, id) { return atom(doc, id) || bond(doc, id) || arrow(doc, id); }

  function bondBetween(doc, a, b) {
    for (var i = 0; i < doc.bonds.length; i++) {
      var x = doc.bonds[i];
      if ((x.a === a && x.b === b) || (x.a === b && x.b === a)) return x;
    }
    return null;
  }

  function bondsOf(doc, id) { return doc.bonds.filter(function (b) { return b.a === id || b.b === id; }); }

  function other(b, id) { return b.a === id ? b.b : b.a; }

  function atomAt(doc, x, y, r) {
    r = r == null ? 0.35 : r;
    for (var i = 0; i < doc.atoms.length; i++) {
      var a = doc.atoms[i];
      if (Math.abs(a.x - x) < r && Math.abs(a.y - y) < r) return a;
    }
    return null;
  }

  /* ---------------------------------------------------------------- edits */

  function addAtom(doc, el, x, y, lp, e1) {
    var a = { id: newId(doc, 'a'), el: el, x: x, y: y, lp: lp || 0, e1: e1 || 0 };
    doc.atoms.push(a);
    return a;
  }

  function addBond(doc, a, b, order) {
    if (a === b) return null;
    var x = bondBetween(doc, a, b);
    if (x) return x;
    x = { id: newId(doc, 'b'), a: a, b: b, order: order || 1 };
    doc.bonds.push(x);
    return x;
  }

  function addArrow(doc, x, y, kind) {
    var r = { id: newId(doc, 'r'), x: x, y: y, kind: kind || 'res' };
    doc.arrows.push(r);
    return r;
  }

  function remove(doc, id) {
    if (atom(doc, id)) {
      doc.atoms = doc.atoms.filter(function (a) { return a.id !== id; });
      doc.bonds = doc.bonds.filter(function (b) { return b.a !== id && b.b !== id; });
    } else {
      doc.bonds = doc.bonds.filter(function (b) { return b.id !== id; });
      doc.arrows = doc.arrows.filter(function (r) { return r.id !== id; });
    }
  }

  /* how many lone pairs + single electrons an atom has room for: one per
     direction its bonds leave free (8 around it), so a crowded atom never gets
     pairs drawn on top of each other */
  function sitesFree(doc, id) { return Math.max(0, 8 - bondsOf(doc, id).length); }

  /* ------------------------------------------------------------ counting */

  function bondSum(doc, id) {
    return bondsOf(doc, id).reduce(function (s, b) { return s + b.order; }, 0);
  }

  /* electrons around an atom: 2 per bond (per unit of bond order), 2 per lone pair, 1 per single electron */
  function electrons(doc, id) {
    var a = atom(doc, id);
    return 2 * a.lp + a.e1 + 2 * bondSum(doc, id);
  }

  function valence(el) { return ELEMENTS[el] ? ELEMENTS[el].valence : 0; }

  /* formal charge = valence − nonbonding electrons − bonds; null when a
     partial bond makes it a fraction */
  function formalCharge(doc, id) {
    var a = atom(doc, id);
    var fc = valence(a.el) - 2 * a.lp - a.e1 - bondSum(doc, id);
    return Math.abs(fc - Math.round(fc)) > 1e-9 ? null : Math.round(fc);
  }

  /* what an atom "wants": H and He a duet, B 6, Be 4, the rest an octet */
  function target(el) {
    if (el === 'H' || el === 'He') return 2;
    if (ELEMENTS[el] && ELEMENTS[el].stable) return ELEMENTS[el].stable;
    return 8;
  }

  /* groups of bonded atoms: each is one molecule or ion */
  function components(doc) {
    var seen = {}, out = [];
    doc.atoms.forEach(function (a) {
      if (seen[a.id]) return;
      var stack = [a.id], comp = [];
      seen[a.id] = 1;
      while (stack.length) {
        var id = stack.pop();
        comp.push(id);
        bondsOf(doc, id).forEach(function (b) {
          var o = other(b, id);
          if (!seen[o]) { seen[o] = 1; stack.push(o); }
        });
      }
      out.push(comp);
    });
    return out;
  }

  function componentOf(doc, id) {
    var cs = components(doc);
    for (var i = 0; i < cs.length; i++) if (cs[i].indexOf(id) >= 0) return cs[i];
    return [];
  }

  /* the net charge of a molecule or ion: the sum of its formal charges */
  function charge(doc, ids) {
    var t = 0;
    for (var i = 0; i < ids.length; i++) {
      var f = formalCharge(doc, ids[i]);
      if (f == null) return null;
      t += f;
    }
    return t;
  }

  /* does a molecule or ion look finished — every bonded atom with at least
     its duet / octet, every lone atom with electrons (or a bare metal
     cation)? Brackets wait for this, so a half-built skeleton is not
     labelled with a strange charge. */
  function finished(doc, ids) {
    return ids.every(function (id) {
      var a = atom(doc, id);
      if (bondsOf(doc, id).length) return electrons(doc, id) >= target(a.el);
      return a.lp + a.e1 > 0 || (ELEMENTS[a.el] && ELEMENTS[a.el].metal);
    });
  }

  var SUB = '₀₁₂₃₄₅₆₇₈₉';
  function sub(n) { return n === 1 ? '' : String(n).replace(/\d/g, function (d) { return SUB[+d]; }); }
  function chargeLabel(q) { return !q ? '' : (Math.abs(q) > 1 ? Math.abs(q) : '') + (q > 0 ? '+' : '−'); }

  /* the order elements are written in: with a C–H bond, Hill order (C, H,
     then A–Z); otherwise the IUPAC order for inorganic formulas — metals and noble
     gases first, then B Si C Sb As P N H Te Se S I Br Cl O F — which gives
     H₂O, NH₃, SO₄, PCl₃, XeF₄ — and H first whenever an H sits on an O
     (acids: HNO₃, H₃PO₄, H₂SO₄), except plain OH */
  var IUPAC = ['B', 'Si', 'C', 'Sb', 'As', 'P', 'N', 'H', 'Te', 'Se', 'S', 'I', 'Br', 'Cl', 'O', 'F'];
  function rank(e) { var i = IUPAC.indexOf(e); return i < 0 ? -1 : i; }
  function formula(doc, ids) {
    var n = {};
    ids.forEach(function (id) { var el = atom(doc, id).el; n[el] = (n[el] || 0) + 1; });
    var els = Object.keys(n).sort();
    var organic = n.C && doc.bonds.some(function (b) {
      var x = atom(doc, b.a), y = atom(doc, b.b);
      return ids.indexOf(b.a) >= 0 && [x.el, y.el].sort().join() === 'C,H';
    });
    if (organic) els = ['C'].concat(n.H ? ['H'] : [], els.filter(function (e) { return e !== 'C' && e !== 'H'; }));
    else {
      els.sort(function (a, b) { return rank(a) - rank(b) || (a < b ? -1 : 1); });
      var acidH = n.H && ids.some(function (id) {
        return atom(doc, id).el === 'H' && bondsOf(doc, id).some(function (b) { return atom(doc, other(b, id)).el === 'O'; });
      });
      if (acidH) els = ['H'].concat(els.filter(function (e) { return e !== 'H'; }));
      if (els.join() === 'H,O' && n.H === 1 && n.O === 1) els = ['O', 'H'];
    }
    return els.map(function (e) { return e + sub(n[e]); }).join('');
  }

  /* what the status line says about each molecule or ion in the drawing */
  function summary(doc) {
    return components(doc).map(function (ids) {
      var total = 0, off = [];
      ids.forEach(function (id) {
        var a = atom(doc, id), e = electrons(doc, id);
        total += 2 * a.lp + a.e1;
        var want = target(a.el), bonded = bondsOf(doc, id).length > 0;
        if (bonded && e !== want) off.push({ el: a.el, e: e, want: want });
      });
      doc.bonds.forEach(function (b) { if (ids.indexOf(b.a) >= 0) total += 2 * b.order; });
      return { ids: ids, formula: formula(doc, ids), electrons: total, charge: charge(doc, ids), off: off };
    });
  }

  /* "Fill electrons": every bonded atom gets lone pairs until it reaches its
     duet / octet (B 6, Be 4); an atom on its own gets its valence electrons
     as a dot symbol (singles first, one per side, then pairs). Never takes
     electrons away. */
  function fill(doc) {
    doc.atoms.forEach(function (a) {
      if (!bondsOf(doc, a.id).length) {
        if (a.lp || a.e1) return;
        var v = valence(a.el);
        if (a.el === 'He') { a.lp = 1; return; }
        a.e1 = v <= 4 ? v : 8 - v;
        a.lp = v <= 4 ? 0 : v - 4;
        return;
      }
      while (electrons(doc, a.id) + 2 <= target(a.el) && a.lp + a.e1 < sitesFree(doc, a.id)) a.lp += 1;
    });
  }

  /* ------------------------------------------------------------ geometry */

  function bounds(doc, ids) {
    var xs = [], ys = [];
    doc.atoms.forEach(function (a) { if (!ids || ids.indexOf(a.id) >= 0) { xs.push(a.x); ys.push(a.y); } });
    if (!ids) doc.arrows.forEach(function (r) { xs.push(r.x - 0.8, r.x + 0.8); ys.push(r.y); });
    if (!xs.length) return null;
    return { x0: Math.min.apply(null, xs), x1: Math.max.apply(null, xs), y0: Math.min.apply(null, ys),
             y1: Math.max.apply(null, ys) };
  }

  function move(doc, ids, dx, dy) {
    doc.atoms.forEach(function (a) { if (ids.indexOf(a.id) >= 0) { a.x += dx; a.y += dy; } });
  }

  /* Put another drawing's atoms, bonds and arrows into this one with fresh
     ids, shifted by (dx, dy). Returns the new atom ids. */
  function merge(doc, part, dx, dy) {
    var map = {}, ids = [];
    part.atoms.forEach(function (a) {
      var n = addAtom(doc, a.el, a.x + dx, a.y + dy, a.lp, a.e1);
      map[a.id] = n.id;
      ids.push(n.id);
    });
    part.bonds.forEach(function (b) { addBond(doc, map[b.a], map[b.b], b.order); });
    (part.arrows || []).forEach(function (r) { addArrow(doc, r.x + dx, r.y + dy, r.kind); });
    return ids;
  }

  /* a drawing read from storage: well-formed, or null */
  function valid(doc) {
    if (!doc || !Array.isArray(doc.atoms) || !Array.isArray(doc.bonds)) return null;
    doc.arrows = Array.isArray(doc.arrows) ? doc.arrows : [];
    var ids = {};
    var ok = doc.atoms.every(function (a) {
      ids[a.id] = 1;
      return a && typeof a.id === 'string' && ELEMENTS[a.el] && isFinite(a.x) && isFinite(a.y) &&
        a.lp >= 0 && a.e1 >= 0;
    }) && doc.bonds.every(function (b) { return ids[b.a] && ids[b.b] && [1, 1.5, 2, 3].indexOf(b.order) >= 0; });
    if (!ok) return null;
    var max = 0;
    doc.atoms.concat(doc.bonds, doc.arrows).forEach(function (x) { max = Math.max(max, +String(x.id).slice(1) || 0); });
    doc.next = Math.max(doc.next || 1, max + 1);
    return doc;
  }

  return {
    blank: blank, clone: clone, atom: atom, bond: bond, arrow: arrow, find: find, bondBetween: bondBetween,
    bondsOf: bondsOf, other: other, atomAt: atomAt, addAtom: addAtom, addBond: addBond, addArrow: addArrow,
    remove: remove, sitesFree: sitesFree, bondSum: bondSum, electrons: electrons, valence: valence,
    formalCharge: formalCharge, target: target, components: components, componentOf: componentOf, charge: charge,
    finished: finished,
    chargeLabel: chargeLabel, formula: formula, summary: summary, fill: fill, bounds: bounds, move: move,
    merge: merge, valid: valid
  };
})();

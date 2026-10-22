/* generate.js — "Start from a formula".
 *
 * Reads what was typed (SO4 2-, NH4+, H2SO4, CO32-, SO₄²⁻ …) and returns a
 * drawing, in this order:
 *
 *   1. a TEMPLATE, matched by what atoms it has (so CH3OH, CH4O and HOCH3 are
 *      all methanol): molecules with more than one central atom, which the
 *      5 rules as taught do not lay out (ethanol, acetic acid, benzene …)
 *   2. an IONIC compound, when there is a metal (NaCl, MgCl2, Na2O): every
 *      metal atom a bare cation, every other atom a monatomic anion with a
 *      full octet, each in its own brackets
 *   3. a single atom or monatomic ion as a dot symbol (N, Cl-, Na+)
 *   4. otherwise the 5 rules, run by lewis.js — the same engine as the Lewis
 *      structures activity, so the answer is the one students are taught:
 *      the first atom written (not H) in the center, H on O in an oxyacid,
 *      Rule 5 only while the central atom is short, B stable with 6, Be with
 *      4, expanded octets only from Rules 2 and 4. An odd number of electrons
 *      (NO2, NO, ClO2) is drawn as the ion with one more electron, then one
 *      electron taken off the central atom: a single dot there.
 *
 * The picture layout follows the Lewis activity: outer atoms left, right,
 * below and above (W, E, S, N); bent for O3, SO2, NO2⁻; the odd atom on top
 * in CH2O and H2CO3; diagonals for five and six bonds.
 */

var SPECIES = {};      /* lewis.js reads species from here; generate() adds them as it goes */

var Generate = (function () {
  'use strict';

  /* -------------------------------------------------------------- reading */

  var SUBS = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' };
  var SUPS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
               '⁺': '+', '⁻': '-' };

  /* "SO4 2-" → { formula: 'SO4', charge: -2 }, or { error } */
  function read(text) {
    var t = String(text || '').trim();
    if (!t) return { error: 'Type a formula, like H2O, SO4 2- or NH4+.' };
    var supCharge = null;
    var m = t.match(/([⁰¹²³⁴⁵⁶⁷⁸⁹]*)([⁺⁻])\s*$/);
    if (m) {
      supCharge = (m[2] === '⁺' ? 1 : -1) * (m[1] ? +m[1].split('').map(function (c) { return SUPS[c]; }).join('') : 1);
      t = t.slice(0, m.index);
    }
    t = t.replace(/[₀-₉]/g, function (c) { return SUBS[c]; }).replace(/[−–—]/g, '-').trim();
    var charge = 0, f = t;
    if (supCharge != null) charge = supCharge;
    else {
      /* a charge set off by a space, ^ or brackets: SO4 2-, SO4^2-, SO4(2-), SO4[2-] */
      var sep = t.match(/^(.*?)(?:\s+|\^|\(|\[)\s*(\d*)\s*([+-])\s*[)\]]?$/);
      var bare = t.match(/^(.*?[A-Za-z0-9])([+-])$/);
      var lead = t.match(/^(.*?)(?:\s+|\^|\(|\[)\s*([+-])\s*(\d+)\s*[)\]]?$/);     /* SO4 -2 */
      if (sep && sep[1]) { f = sep[1]; charge = (sep[3] === '+' ? 1 : -1) * (sep[2] ? +sep[2] : 1); }
      else if (lead && lead[1]) { f = lead[1]; charge = (lead[2] === '+' ? 1 : -1) * +lead[3]; }
      else if (bare) {
        /* NO3- is NO₃⁻; SO42- is SO₄²⁻ (no element takes 42 atoms) */
        f = bare[1]; charge = bare[2] === '+' ? 1 : -1;
        var tail = f.match(/^(.*[A-Za-z])(\d+)$/);
        if (tail && tail[2].length >= 2) { f = tail[1] + tail[2].slice(0, -1); charge *= +tail[2].slice(-1); }
      }
    }
    f = f.replace(/\s+/g, '');
    if (!/^([A-Z][a-z]?\d*)+$/.test(f)) {
      return { error: /[()]/.test(f) ? 'Parentheses aren’t supported — write it out (Ca(OH)2 → draw the ions by hand).'
                                      : 'Can’t read “' + text + '”. Use element symbols with capital letters: H2SO4, SO4 2-, NH4+.' };
    }
    var parts = Lewis.parseFormula(f);
    for (var i = 0; i < parts.length; i++) {
      if (!ELEMENTS[parts[i].el]) return { error: parts[i].el + ' isn’t one of the main-group elements this tool knows (periods 1–5).' };
      if (parts[i].n > 12) return { error: 'That is more ' + parts[i].el + ' atoms than this tool will lay out.' };
    }
    return { formula: f, charge: charge, parts: parts, text: Lewis.display(f, charge) };
  }

  function counts(parts) {
    var n = {};
    parts.forEach(function (p) { n[p.el] = (n[p.el] || 0) + p.n; });
    return n;
  }
  function key(n, charge) {
    return Object.keys(n).sort().map(function (e) { return e + n[e]; }).join('') + ':' + charge;
  }

  /* ------------------------------------------------------------ templates */

  var D = 0.71;   /* a diagonal neighbour one bond length away */
  var TEMPLATES = [
    { name: 'hydrogen peroxide', f: 'H2O2', a: [['H', 0, 0], ['O', 1, 0], ['O', 2, 0], ['H', 3, 0]], b: [[0, 1], [1, 2], [2, 3]] },
    { name: 'hydrazine', f: 'N2H4', a: [['N', 1, 0], ['N', 2, 0], ['H', 0, 0], ['H', 1, 1], ['H', 3, 0], ['H', 2, 1]],
      b: [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5]] },
    { name: 'ethane', f: 'C2H6', a: [['C', 1, 1], ['C', 2, 1], ['H', 0, 1], ['H', 1, 0], ['H', 1, 2], ['H', 3, 1], ['H', 2, 0], ['H', 2, 2]],
      b: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [1, 6], [1, 7]] },
    { name: 'ethene (ethylene)', f: 'C2H4', a: [['C', 1, 0], ['C', 2, 0], ['H', 1 - D, -D], ['H', 1 - D, D], ['H', 2 + D, -D], ['H', 2 + D, D]],
      b: [[0, 1, 2], [0, 2], [0, 3], [1, 4], [1, 5]] },
    { name: 'ethyne (acetylene)', f: 'C2H2', a: [['H', 0, 0], ['C', 1, 0], ['C', 2, 0], ['H', 3, 0]], b: [[0, 1], [1, 2, 3], [2, 3]] },
    { name: 'propane', f: 'C3H8', a: [['C', 1, 1], ['C', 2, 1], ['C', 3, 1], ['H', 0, 1], ['H', 1, 0], ['H', 1, 2], ['H', 2, 0], ['H', 2, 2],
      ['H', 3, 0], ['H', 3, 2], ['H', 4, 1]], b: [[0, 1], [1, 2], [0, 3], [0, 4], [0, 5], [1, 6], [1, 7], [2, 8], [2, 9], [2, 10]] },
    { name: 'methanol', f: 'CH4O', a: [['C', 1, 1], ['H', 0, 1], ['H', 1, 0], ['H', 1, 2], ['O', 2, 1], ['H', 3, 1]],
      b: [[0, 1], [0, 2], [0, 3], [0, 4], [4, 5]] },
    { name: 'ethanol', f: 'C2H6O', a: [['C', 1, 1], ['C', 2, 1], ['O', 3, 1], ['H', 4, 1], ['H', 0, 1], ['H', 1, 0], ['H', 1, 2], ['H', 2, 0], ['H', 2, 2]],
      b: [[0, 1], [1, 2], [2, 3], [0, 4], [0, 5], [0, 6], [1, 7], [1, 8]] },
    { name: 'methylamine', f: 'CH5N', a: [['C', 1, 1], ['N', 2, 1], ['H', 0, 1], ['H', 1, 0], ['H', 1, 2], ['H', 3, 1], ['H', 2, 2]],
      b: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [1, 6]] },
    { name: 'formic acid', f: 'CH2O2', a: [['C', 1, 1], ['H', 0, 1], ['O', 1, 0], ['O', 2, 1], ['H', 3, 1]],
      b: [[0, 1], [0, 2, 2], [0, 3], [3, 4]] },
    { name: 'acetic acid', f: 'C2H4O2', a: [['C', 1, 1], ['C', 2, 1], ['O', 2, 0], ['O', 3, 1], ['H', 4, 1], ['H', 0, 1], ['H', 1, 0], ['H', 1, 2]],
      b: [[0, 1], [1, 2, 2], [1, 3], [3, 4], [0, 5], [0, 6], [0, 7]] },
    { name: 'acetaldehyde', f: 'C2H4O', a: [['C', 1, 1], ['C', 2, 1], ['O', 2, 0], ['H', 3, 1], ['H', 0, 1], ['H', 1, 0], ['H', 1, 2]],
      b: [[0, 1], [1, 2, 2], [1, 3], [0, 4], [0, 5], [0, 6]] },
    { name: 'acetone', f: 'C3H6O', a: [['C', 1, 1], ['C', 2, 1], ['C', 3, 1], ['O', 2, 0], ['H', 0, 1], ['H', 1, 0], ['H', 1, 2],
      ['H', 4, 1], ['H', 3, 0], ['H', 3, 2]], b: [[0, 1], [1, 2], [1, 3, 2], [0, 4], [0, 5], [0, 6], [2, 7], [2, 8], [2, 9]] },
    { name: 'urea', f: 'CH4N2O', a: [['C', 2, 1], ['O', 2, 0], ['N', 1, 1], ['N', 3, 1], ['H', 0, 1], ['H', 1, 2], ['H', 4, 1], ['H', 3, 2]],
      b: [[0, 1, 2], [0, 2], [0, 3], [2, 4], [2, 5], [3, 6], [3, 7]] },
    { name: 'formate ion', f: 'CHO2', q: -1, a: [['C', 1, 1], ['H', 0, 1], ['O', 1, 0], ['O', 2, 1]], b: [[0, 1], [0, 2, 2], [0, 3]] },
    { name: 'acetate ion', f: 'C2H3O2', q: -1, a: [['C', 1, 1], ['C', 2, 1], ['O', 2, 0], ['O', 3, 1], ['H', 0, 1], ['H', 1, 0], ['H', 1, 2]],
      b: [[0, 1], [1, 2, 2], [1, 3], [0, 4], [0, 5], [0, 6]] },
    { name: 'benzene', f: 'C6H6', a: (function () {
      var out = [];
      for (var i = 0; i < 6; i++) {
        var t = (90 - 60 * i) * Math.PI / 180;
        out.push(['C', 2 + Math.cos(t), 2 - Math.sin(t)]);
      }
      for (var j = 0; j < 6; j++) {
        var u = (90 - 60 * j) * Math.PI / 180;
        out.push(['H', 2 + 2 * Math.cos(u), 2 - 2 * Math.sin(u)]);
      }
      return out;
    })(), b: [[0, 1, 2], [1, 2], [2, 3, 2], [3, 4], [4, 5, 2], [5, 0], [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]] }
  ];
  TEMPLATES.forEach(function (t) { t.key = key(counts(Lewis.parseFormula(t.f)), t.q || 0); });

  function fromTemplate(t) {
    var doc = Model.blank(), ids = [];
    t.a.forEach(function (a) { ids.push(Model.addAtom(doc, a[0], Math.round(a[1] * 100) / 100, Math.round(a[2] * 100) / 100).id); });
    t.b.forEach(function (b) { Model.addBond(doc, ids[b[0]], ids[b[1]], b[2] || 1); });
    Model.fill(doc);
    return doc;
  }

  /* --------------------------------------------------------------- ionic */

  function ionic(n, charge) {
    var cations = [], anions = [];
    Object.keys(n).forEach(function (e) {
      for (var i = 0; i < n[e]; i++) {
        if (ELEMENTS[e].metal) cations.push({ el: e, q: ELEMENTS[e].valence });
        else anions.push({ el: e, q: ELEMENTS[e].valence - (e === 'H' ? 2 : 8) });
      }
    });
    var total = cations.concat(anions).reduce(function (s, x) { return s + x.q; }, 0);
    if (!anions.length || total !== charge) {
      return { error: 'That looks ionic, but its ions aren’t all single atoms (or the charges don’t balance). ' +
        'Build the polyatomic ion from its own formula (like NO3-) and add the metal ion by hand.' };
    }
    /* alternate, starting with the more numerous kind */
    var a = cations.length >= anions.length ? cations : anions, b = a === cations ? anions : cations, row = [];
    while (a.length || b.length) { if (a.length) row.push(a.shift()); if (b.length) row.push(b.shift()); }
    var doc = Model.blank();
    row.forEach(function (ion, i) {
      var nonbond = ELEMENTS[ion.el].metal ? 0 : (ion.el === 'H' ? 2 : 8);
      Model.addAtom(doc, ion.el, i * 2.6, 0, nonbond / 2, 0);
    });
    return { doc: doc, brackets: true, note: 'Ionic: each ion in its own brackets.' };
  }

  /* ------------------------------------------------------ the 5 rules */

  var seq = 0;
  var POS = {
    1: ['E'], 2: ['W', 'E'], 4: ['W', 'E', 'S', 'N'], 5: ['N', 'W', 'E', 'SW', 'SE'],
    6: ['W', 'E', 'NW', 'NE', 'SW', 'SE'], 7: ['N', 'W', 'E', 'NW', 'NE', 'SW', 'SE'],
    8: ['N', 'S', 'W', 'E', 'NW', 'NE', 'SW', 'SE']
  };

  function positions(items, clp, hFirst) {
    var k = items.length;
    if (k === 1) return [hFirst ? 'W' : 'E'];
    if (k === 2) return clp === 1 && items[0] === items[1] && items[0] !== 'H' && items[0] !== 'OH' ? ['SW', 'SE'] : ['W', 'E'];
    if (k === 3) {
      if (clp >= 2) return ['N', 'E', 'S'];
      if (clp === 0) {
        var odd = items.filter(function (x) { return items.filter(function (y) { return y === x; }).length === 1; });
        if (odd.length === 1 && odd[0] === items[0] && odd[0] !== 'OH') return ['N', 'W', 'E'];
      }
      return ['W', 'E', 'S'];
    }
    if (k === 4 && clp === 1) return ['W', 'E', 'NW', 'NE'];
    return POS[k];
  }

  function solveWith(r, items, clpGuess, center, typedFormula, charge) {
    var layout = {};
    positions(items, clpGuess, r.hFirst).forEach(function (d, i) { layout[d] = items[i]; });
    var id = 'g' + (++seq);
    SPECIES[id] = { formula: typedFormula, charge: charge, name: '', layout: layout, key: {} };
    return Lewis.solve(Lewis.species(id));
  }

  function rules(r) {
    var n = counts(r.parts), parts = r.parts;
    var center = null;
    parts.forEach(function (p) { if (!center && p.el !== 'H') center = p.el; });
    if (!center) {
      /* only hydrogen: H₂ is the one that makes sense */
      if (n.H !== 2 || r.charge) return { error: 'With only hydrogen, the tool draws H2.' };
      var hh = Model.blank();
      Model.addBond(hh, Model.addAtom(hh, 'H', 0, 0).id, Model.addAtom(hh, 'H', 1, 0).id, 1);
      return { doc: hh, brackets: false, note: '' };
    }
    var rest = Object.assign({}, n);
    rest[center] -= 1;
    var acid = parts[0].el === 'H' && center !== 'O' && (rest.O || 0) > 0 && (rest.H || 0) <= (rest.O || 0);
    var items = [];
    /* in the order typed; for 3+ outer atoms: O–H groups, then other atoms, then H */
    var order = [];
    parts.forEach(function (p) { if (order.indexOf(p.el) < 0) order.push(p.el); });
    if (acid) { for (var i = 0; i < rest.H; i++) items.push('OH'); rest.O -= rest.H; rest.H = 0; }
    order.forEach(function (e) { for (var j = 0; j < (rest[e] || 0); j++) items.push(e); });
    if (items.length >= 3) {
      items.sort(function (a, b) {
        var rank = function (x) { return x === 'OH' ? 0 : x === 'H' ? 2 : 1; };
        return rank(a) - rank(b);
      });
    }
    var bondsToCenter = items.length;
    if (!bondsToCenter) return { error: 'Just one atom — type it on its own, like N or Cl-.' };
    if (bondsToCenter > 8 || (ELEMENTS[center].period <= 2 && bondsToCenter > 4)) {
      return { error: r.text + ' needs more than one central atom. Pick it from Common molecules if it’s there, ' +
        'or draw it by hand.' };
    }
    r.hFirst = parts[0].el === 'H' && items.length === 1;

    /* the electron count; an odd one is done as the ion with one more electron */
    var total = Lewis.valence({ parts: parts, charge: r.charge }).total;
    if (total <= 0) return { error: 'That charge leaves no electrons to draw.' };
    var odd = total % 2 === 1, q = odd ? r.charge - 1 : r.charge;
    var typed = r.formula;
    var first = solveWith(r, items, 0, center, typed, q);
    if (first.left2 < 0 || first.left3 < 0) return { error: 'There aren’t enough electrons to give every outer atom its octet.' };
    var res = solveWith(r, items, first.s4.lp.C, center, typed, q);
    var s = res.s5, doc = Model.blank(), map = {};
    Lewis.filled(s).forEach(function (k) {
      var p = Lewis.pos(k);
      map[k] = Model.addAtom(doc, s.at[k], p[0], p[1], s.lp[k] || 0, 0).id;
    });
    Lewis.bonds(s).forEach(function (b) { Model.addBond(doc, map[b.a], map[b.b], b.order); });
    var notes = [];
    if (acid) notes.push('Oxyacid: each H is on an O, not on ' + center + '.');
    if (odd) {
      var c = Model.atom(doc, map.C);
      if (c.lp > 0) { c.lp -= 1; c.e1 = 1; } else c.e1 = 1;
      notes.push('Odd number of electrons (' + total + '): one unpaired electron on ' + center + '.');
    }
    if (res.centerTarget > 8) notes.push(center + ' ends with ' + res.centerTarget + ' electrons (expanded octet, from Rules 2 and 4).');
    if (ELEMENTS[center].stable) notes.push(center + ' is stable with ' + ELEMENTS[center].stable + ' electrons.');
    return { doc: doc, brackets: r.charge !== 0, note: notes.join(' ') };
  }

  /* ------------------------------------------------------------- the API */

  /* text → { doc, label, note, brackets } or { error } */
  function generate(text) {
    var r = read(text);
    if (r.error) return r;
    var n = counts(r.parts), k = key(n, r.charge);
    for (var i = 0; i < TEMPLATES.length; i++) {
      if (TEMPLATES[i].key === k) {
        return { doc: fromTemplate(TEMPLATES[i]), label: r.text, brackets: r.charge !== 0,
                 note: 'Drawn as ' + TEMPLATES[i].name + '.' };
      }
    }
    var out;
    var atomsTotal = Object.keys(n).reduce(function (s, e) { return s + n[e]; }, 0);
    if (Object.keys(n).some(function (e) { return ELEMENTS[e].metal; }) && atomsTotal > 1) out = ionic(n, r.charge);
    else if (atomsTotal === 1) {
      var el = r.parts[0].el, e = ELEMENTS[el].valence - r.charge;
      if (e < 0 || e > 8) return { error: 'A ' + Lewis.chargeText(r.charge) + ' charge doesn’t make sense for ' + el + '.' };
      var doc = Model.blank(), a = Model.addAtom(doc, el, 0, 0, 0, 0);
      if (el === 'H' || el === 'He') { a.lp = e === 2 ? 1 : 0; a.e1 = e === 1 ? 1 : 0; }
      else { a.e1 = e <= 4 ? e : 8 - e; a.lp = e <= 4 ? 0 : e - 4; }
      out = { doc: doc, brackets: r.charge !== 0, note: r.charge ? '' : 'Dot symbol: its valence electrons.' };
    } else out = rules(r);
    if (out.error) return out;
    out.label = r.text;
    return out;
  }

  function templates() { return TEMPLATES.map(function (t) { return { name: t.name, text: Lewis.display(t.f, t.q || 0), f: t.f + (t.q ? (t.q < 0 ? '-' : '+') : '') }; }); }

  return { read: read, generate: generate, templates: templates };
})();

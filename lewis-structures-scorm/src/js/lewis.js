/* lewis.js — the 5 rules, as an algorithm, and the structure model that the
 * builder, the drawings, the quiz and the validator all share.
 *
 * A structure sits on a cross-shaped grid of slots:
 *
 *                 NN
 *                 N
 *        WW   W   C   E   EE
 *                 S
 *                 SS
 *
 * C is the central atom. N, E, S, W are bonded to C. NN, EE, SS, WW are
 * bonded to the atom next to them (only an H on an oxyacid's O goes there).
 *
 *   s = { charge, at: { slot: element }, lp: { slot: pairs }, bo: { slot: order } }
 *
 * bo is keyed by the OUTER end of each bond: bo.W is the C–W bond, bo.WW the
 * W–WW bond. Every atom has four sides (N, E, S, W); bonds take some, lone
 * pairs fill the rest — so no atom can be drawn with more than four
 * electron domains, which covers everything in this activity.
 */

var Lewis = (function () {
  'use strict';

  var DIRS = ['N', 'E', 'S', 'W'];
  var VEC = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  var OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
  var PERP = { N: ['W', 'E'], S: ['W', 'E'], E: ['N', 'S'], W: ['N', 'S'] };
  var SLOTS = ['C', 'N', 'E', 'S', 'W', 'NN', 'EE', 'SS', 'WW'];
  var WHERE = { N: 'above', E: 'right of', S: 'below', W: 'left of' };

  /* ------------------------------------------------------------ formulas */

  var SUB = '₀₁₂₃₄₅₆₇₈₉';
  var SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';

  function parseFormula(f) {
    var out = [], re = /([A-Z][a-z]?)(\d*)/g, m;
    while ((m = re.exec(f))) out.push({ el: m[1], n: m[2] ? +m[2] : 1 });
    return out;
  }

  function chargeSup(charge) {
    if (!charge) return '';
    var n = Math.abs(charge);
    return (n > 1 ? String(n).split('').map(function (d) { return SUP[+d]; }).join('') : '') +
      (charge > 0 ? '⁺' : '⁻');
  }

  /* '2−', '−', '+' — the plain-text charge, for sentences */
  function chargeText(charge) {
    if (!charge) return '0';
    var n = Math.abs(charge);
    return (n > 1 ? n : '') + (charge > 0 ? '+' : '−');
  }

  function display(formula, charge) {
    return formula.replace(/\d/g, function (d) { return SUB[+d]; }) + chargeSup(charge);
  }

  var cache = {};

  /* The species, with what Rule 1 and Rule 2 derive from its formula. */
  function species(id) {
    if (cache[id]) return cache[id];
    var raw = SPECIES[id];
    if (!raw) throw new Error('unknown species ' + id);
    var parts = parseFormula(raw.formula);
    var center = null;
    for (var i = 0; i < parts.length; i++) if (parts[i].el !== 'H') { center = parts[i].el; break; }
    var acid = Object.keys(raw.layout).some(function (d) { return raw.layout[d] === 'OH'; });
    var sp = {
      id: id, formula: raw.formula, charge: raw.charge || 0, name: raw.name, layout: raw.layout,
      key: raw.key, note: raw.note || '', parts: parts, center: center, acid: acid,
      ion: !!raw.charge, text: display(raw.formula, raw.charge || 0)
    };
    cache[id] = sp;
    return sp;
  }

  /* Rule 1 */
  function valence(sp) {
    var rows = sp.parts.map(function (p) {
      var each = ELEMENTS[p.el].valence;
      return { el: p.el, n: p.n, each: each, sum: each * p.n };
    });
    var neutral = rows.reduce(function (a, r) { return a + r.sum; }, 0);
    return { rows: rows, neutral: neutral, adjust: -sp.charge, total: neutral - sp.charge };
  }

  /* ------------------------------------------------------------ the grid */

  function parentOf(slot) {
    if (slot === 'C') return null;
    return slot.length === 1 ? 'C' : slot[0];
  }

  function dirOf(slot) { return slot === 'C' ? null : slot[0]; }

  function pos(slot) {
    if (slot === 'C') return [0, 0];
    var v = VEC[slot[0]], k = slot.length;
    return [v[0] * k, v[1] * k];
  }

  function empty(charge) { return { charge: charge || 0, at: {}, lp: {}, bo: {} }; }

  function clone(s) {
    return { charge: s.charge, at: Object.assign({}, s.at), lp: Object.assign({}, s.lp), bo: Object.assign({}, s.bo) };
  }

  function has(s, slot) { return !!s.at[slot]; }

  function filled(s) { return SLOTS.filter(function (k) { return has(s, k); }); }

  /* every bond, as { a, b, order, key } with b the outer end */
  function bonds(s) {
    var out = [];
    filled(s).forEach(function (k) {
      var p = parentOf(k);
      if (p && has(s, p)) out.push({ a: p, b: k, order: s.bo[k] || 1, key: k });
    });
    return out;
  }

  /* bonds touching one slot, as { other, order, side } — side is the side of
     THIS atom the bond leaves from */
  function bondsOf(s, slot) {
    var out = [];
    if (slot === 'C') {
      DIRS.forEach(function (d) { if (has(s, d)) out.push({ other: d, order: s.bo[d] || 1, side: d }); });
      return out;
    }
    var d = dirOf(slot), p = parentOf(slot);
    if (has(s, p)) out.push({ other: p, order: s.bo[slot] || 1, side: OPP[d] });
    if (slot.length === 1 && has(s, d + d)) out.push({ other: d + d, order: s.bo[d + d] || 1, side: d });
    return out;
  }

  function bondSum(s, slot) {
    return bondsOf(s, slot).reduce(function (a, b) { return a + b.order; }, 0);
  }

  /* electrons around an atom: 2 for every bonding pair, 2 for every lone pair */
  function electrons(s, slot) { return 2 * (s.lp[slot] || 0) + 2 * bondSum(s, slot); }

  function target(el) { return el === 'H' ? 2 : 8; }

  function totalElectrons(s) {
    var n = 0;
    filled(s).forEach(function (k) { n += 2 * (s.lp[k] || 0); });
    bonds(s).forEach(function (b) { n += 2 * b.order; });
    return n;
  }

  function formalCharge(s, slot) {
    return ELEMENTS[s.at[slot]].valence - 2 * (s.lp[slot] || 0) - bondSum(s, slot);
  }

  /* Free sides of an atom, in the order lone pairs fill them. */
  function freeSides(s, slot) {
    var taken = {};
    bondsOf(s, slot).forEach(function (b) { taken[b.side] = 1; });
    var order;
    if (slot === 'C') {
      var bs = bondsOf(s, slot);
      order = bs.length === 1 ? [OPP[bs[0].side]].concat(PERP[bs[0].side]) : ['N', 'S', 'W', 'E'];
    } else {
      var d = dirOf(slot);
      order = [d].concat(PERP[d]);
    }
    order = order.concat(DIRS.filter(function (x) { return order.indexOf(x) < 0; }));
    return order.filter(function (x) { return !taken[x]; });
  }

  function roomFor(s, slot) { return freeSides(s, slot).length - (s.lp[slot] || 0); }

  /* H atoms sitting on this outer atom */
  function carriesH(s, slot) {
    return slot.length === 1 && slot !== 'C' && s.at[slot + slot] === 'H';
  }

  /* Connectivity only: what is bonded to what. Two structures with the same
     signature are the same skeleton, wherever the atoms were placed. */
  function signature(s) {
    var inner = DIRS.filter(function (d) { return has(s, d); }).map(function (d) {
      return s.at[d] + (has(s, d + d) ? '-' + s.at[d + d] : '');
    }).sort();
    var stray = ['NN', 'EE', 'SS', 'WW'].filter(function (k) { return has(s, k) && !has(s, k[0]); });
    return (s.at.C || '?') + '(' + inner.join(',') + ')' + (stray.length ? '+stray' : '');
  }

  /* ------------------------------------------------------------ the rules */

  /* Rule 2 as drawn in the answer: the central atom, every other atom on a
     single bond, H on the outside of each 'OH'. */
  function skeleton(sp) {
    var s = empty(sp.charge);
    s.at.C = sp.center;
    s.lp.C = 0;
    DIRS.forEach(function (d) {
      var a = sp.layout[d];
      if (!a) return;
      s.at[d] = a === 'OH' ? 'O' : a;
      s.lp[d] = 0;
      s.bo[d] = 1;
      if (a === 'OH') { s.at[d + d] = 'H'; s.lp[d + d] = 0; s.bo[d + d] = 1; }
    });
    return s;
  }

  /* Rule 5's choice when a lone pair has to move. The builder accepts ANY
     outer atom's pair; this is only the one drawn in the answer key and the
     quiz: an O without an H first, then spreading the bonds out (O=C=O, not
     O≡C–O). */
  function pickCanonical(s) {
    var c = DIRS.filter(function (d) { return has(s, d) && s.at[d] !== 'H' && (s.lp[d] || 0) > 0; });
    c.sort(function (a, b) {
      return (carriesH(s, a) - carriesH(s, b)) || ((s.bo[a] || 1) - (s.bo[b] || 1)) ||
        ((s.lp[b] || 0) - (s.lp[a] || 0)) || (DIRS.indexOf(a) - DIRS.indexOf(b));
    });
    return c[0] || null;
  }

  /* Run all five rules. Returns the bookkeeping and the structure after each
     of Rules 2–5. */
  function solve(sp) {
    var v = valence(sp);
    var s2 = skeleton(sp);
    var nb = bonds(s2).length;
    var used2 = 2 * nb, left2 = v.total - used2;

    var s3 = clone(s2), left3 = left2, outerLP = 0;
    filled(s3).forEach(function (k) {
      if (k === 'C') return;
      var need = target(s3.at[k]) - electrons(s3, k);
      if (need > 0) { s3.lp[k] += need / 2; left3 -= need; outerLP += need / 2; }
    });

    var s4 = clone(s3), centerLP = left3 / 2;
    s4.lp.C += centerLP;

    var s5 = clone(s4), moves = [];
    while (electrons(s5, 'C') < 8) {
      var d = pickCanonical(s5);
      if (!d) break;
      s5.lp[d] -= 1;
      s5.bo[d] += 1;
      moves.push(d);
    }
    return {
      total: v.total, valence: v, bonds: nb, used2: used2, left2: left2, outerLP: outerLP, left3: left3,
      centerLP: centerLP, centerAfter4: electrons(s4, 'C'), moves: moves,
      s2: s2, s3: s3, s4: s4, s5: s5
    };
  }

  function canonical(sp) { return solve(sp).s5; }

  /* Is a finished structure one the 5 rules allow? */
  function accepted(s, sp) {
    var problems = [];
    var want = skeleton(sp);
    if (signature(s) !== signature(want)) problems.push('skeleton');
    if (totalElectrons(s) !== valence(sp).total) problems.push('count');
    filled(s).forEach(function (k) {
      var e = electrons(s, k);
      if (e !== target(s.at[k])) problems.push(k + ':' + e);
    });
    return { ok: problems.length === 0, problems: problems };
  }

  /* The central atom has more than 8 and sits in period 3 or below: the
     expanded octet that this class treats as a looked-up answer. */
  function expanded(s) {
    return !!s.at.C && ELEMENTS[s.at.C].period >= 3 && electrons(s, 'C') > 8;
  }

  /* Every finished structure Rule 5 can reach, taking a lone pair from ANY
     outer atom bonded to the center each time it runs. */
  function rule5Outcomes(sp) {
    var start = solve(sp).s4, seen = {}, out = [];
    function key(s) { return JSON.stringify([s.lp, s.bo]); }
    (function walk(s) {
      if (electrons(s, 'C') >= 8) {
        var k = key(s);
        if (!seen[k]) { seen[k] = 1; out.push(s); }
        return;
      }
      var moved = false;
      DIRS.forEach(function (d) {
        if (!has(s, d) || !(s.lp[d] > 0)) return;
        var t = clone(s);
        t.lp[d] -= 1;
        t.bo[d] += 1;
        moved = true;
        walk(t);
      });
      if (!moved) { var k2 = key(s); if (!seen[k2]) { seen[k2] = 1; out.push(s); } }
    })(start);
    return out;
  }

  /* ------------------------------------------------- variants for the quiz */

  /* A drawing for a quiz choice: the answer, or the answer changed on
     purpose.
       { expand: n }   n lone pairs on plain O atoms turned into bonds — the
                       expanded-octet drawing a chatbot or a college book gives
       { stage: 4 }    stop after Rule 4 (Rule 5 skipped)
       { set: { lp: {...}, bo: {...}, at: {...} } }  overwrite slots          */
  function variant(sp, mod) {
    mod = mod || {};
    var r = solve(sp);
    var s = clone(mod.stage === 4 ? r.s4 : mod.stage === 2 ? r.s2 : mod.stage === 3 ? r.s3 : r.s5);
    if (mod.expand) {
      var left = mod.expand;
      ['N', 'S', 'E', 'W'].forEach(function (d) {
        if (left && has(s, d) && s.at[d] === 'O' && !carriesH(s, d) && s.bo[d] === 1 && s.lp[d] > 0) {
          s.lp[d] -= 1; s.bo[d] += 1; left -= 1;
        }
      });
    }
    if (mod.set) {
      ['at', 'lp', 'bo'].forEach(function (f) {
        if (mod.set[f]) Object.keys(mod.set[f]).forEach(function (k) {
          if (mod.set[f][k] == null) delete s[f][k]; else s[f][k] = mod.set[f][k];
        });
      });
    }
    return s;
  }

  /* ---------------------------------------------------------- describing */

  function pairs(n) { return n === 0 ? 'no lone pairs' : n === 1 ? '1 lone pair' : n + ' lone pairs'; }
  var ORDER = { 1: 'single', 2: 'double', 3: 'triple', 4: 'quadruple' };

  function describe(s) {
    var c = s.at.C;
    var parts = DIRS.filter(function (d) { return has(s, d); }).map(function (d) {
      var t = (ORDER[s.bo[d]] || s.bo[d] + '-fold') + ' bond to ' + s.at[d] + ' ' + WHERE[d] + ' it';
      if (has(s, d + d)) t += ' (that ' + s.at[d] + ' also bonded to ' + s.at[d + d] + ')';
      if (s.at[d] !== 'H' || s.lp[d]) t += ', ' + s.at[d] + ' with ' + pairs(s.lp[d] || 0);
      return t;
    });
    return (s.charge ? 'Ion, charge ' + chargeText(s.charge) + '. ' : '') +
      c + ' in the center with ' + pairs(s.lp.C || 0) + '; ' + parts.join('; ') + '.';
  }

  return {
    DIRS: DIRS, VEC: VEC, OPP: OPP, SLOTS: SLOTS, WHERE: WHERE,
    parseFormula: parseFormula, display: display, chargeSup: chargeSup, chargeText: chargeText,
    species: species, valence: valence,
    parentOf: parentOf, pos: pos, empty: empty, clone: clone, has: has, filled: filled,
    bonds: bonds, bondsOf: bondsOf, bondSum: bondSum, electrons: electrons, target: target,
    totalElectrons: totalElectrons, formalCharge: formalCharge, freeSides: freeSides, roomFor: roomFor,
    carriesH: carriesH, signature: signature,
    skeleton: skeleton, solve: solve, canonical: canonical, accepted: accepted, expanded: expanded,
    rule5Outcomes: rule5Outcomes, variant: variant, describe: describe, pairs: pairs, pickCanonical: pickCanonical
  };
})();

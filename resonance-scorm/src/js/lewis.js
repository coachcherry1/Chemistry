/* lewis.js — the 5 rules, as an algorithm, and the structure model that the
 * builder, the drawings, the quiz and the validator all share.
 *
 * A structure sits on a grid of slots: the central atom C, eight positions
 * around it (N, NE, E, SE, S, SW, W, NW) bonded to C, and one position beyond
 * each of those (N2, NE2, ...) bonded to the atom next to it — only an H on an
 * oxyacid's O goes there.
 *
 *          NW2      N2      NE2
 *              NW   N   NE
 *        W2    W    C    E    E2
 *              SW   S   SE
 *          SW2      S2      SE2
 *
 *   s = { charge, at: { slot: element }, lp: { slot: pairs }, bo: { slot: order } }
 *
 * bo is keyed by the OUTER end of each bond: bo.W is the C–W bond, bo.W2 the
 * W–W2 bond. Around every atom, bonds and lone pairs share the same eight
 * directions; an atom holds at most 4 electron domains, except a central
 * atom from period 3 or below, which can hold 6 (SF₆, XeF₄).
 *
 * What counts as "full" for the central atom (centerTarget):
 *   B 6 and Be 4 — the incomplete-octet exceptions; Rule 5 leaves them alone
 *   otherwise 8 — or more, when Rules 2 and 4 already gave a period-3+ atom
 *   more (SF₆ 12, XeF₄ 12, PCl₅ 10). That is a legitimate expanded octet.
 * Pushing the central atom past its target with Rule 5 is never allowed: for
 * a period-3+ atom it is the "reduce the formal charge" answer from AI
 * chatbots, and the student hears about it (see snark.js).
 */

var Lewis = (function () {
  'use strict';

  var DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];      /* clockwise from the top */
  var CARD = ['N', 'E', 'S', 'W'];
  var VEC = { N: [0, -1], NE: [1, -1], E: [1, 0], SE: [1, 1], S: [0, 1], SW: [-1, 1], W: [-1, 0], NW: [-1, -1] };
  var OPP = {};
  DIRS.forEach(function (d, i) { OPP[d] = DIRS[(i + 4) % 8]; });
  var SLOTS = ['C'].concat(DIRS, DIRS.map(function (d) { return d + '2'; }));
  var WHERE = { N: 'above', NE: 'upper right of', E: 'right of', SE: 'lower right of', S: 'below',
                SW: 'lower left of', W: 'left of', NW: 'upper left of' };
  /* tie-breaks when two directions are equally far from everything else */
  var PREF_CENTER = ['N', 'S', 'W', 'E', 'NE', 'SW', 'NW', 'SE'];
  var PREF_OUTER = ['N', 'S', 'W', 'E', 'NE', 'NW', 'SE', 'SW'];

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

  function isOuter(slot) { return /2$/.test(slot); }                    /* beyond an outer atom */
  function isInner(slot) { return slot !== 'C' && !isOuter(slot); }     /* bonded to the center */

  function parentOf(slot) {
    if (slot === 'C') return null;
    return isOuter(slot) ? slot.slice(0, -1) : 'C';
  }

  function dirOf(slot) { return slot === 'C' ? null : slot.replace(/2$/, ''); }

  function pos(slot) {
    if (slot === 'C') return [0, 0];
    var v = VEC[dirOf(slot)], k = isOuter(slot) ? 2 : 1;
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

  /* bonds touching one slot, as { other, order, side } — side is the
     direction the bond leaves THIS atom in */
  function bondsOf(s, slot) {
    var out = [];
    if (slot === 'C') {
      DIRS.forEach(function (d) { if (has(s, d)) out.push({ other: d, order: s.bo[d] || 1, side: d }); });
      return out;
    }
    var d = dirOf(slot), p = parentOf(slot);
    if (has(s, p)) out.push({ other: p, order: s.bo[slot] || 1, side: OPP[d] });
    if (isInner(slot) && has(s, slot + '2')) out.push({ other: slot + '2', order: s.bo[slot + '2'] || 1, side: d });
    return out;
  }

  function bondSum(s, slot) {
    return bondsOf(s, slot).reduce(function (a, b) { return a + b.order; }, 0);
  }

  /* electrons around an atom: 2 for every bonding pair, 2 for every lone pair */
  function electrons(s, slot) { return 2 * (s.lp[slot] || 0) + 2 * bondSum(s, slot); }

  /* what an OUTER atom needs: H a doublet, everything else an octet */
  function target(el) { return el === 'H' ? 2 : 8; }

  /* bonds plus lone pairs an atom can be drawn with: 4 (an octet), except a
     CENTRAL atom from period 3 or below, which can hold 6 (SF₆, XeF₄). An
     outer Cl is no different from an outer F: it stops at 8. */
  function maxDomains(el, slot) { return slot === 'C' && ELEMENTS[el].period >= 3 ? 6 : 4; }

  function totalElectrons(s) {
    var n = 0;
    filled(s).forEach(function (k) { n += 2 * (s.lp[k] || 0); });
    bonds(s).forEach(function (b) { n += 2 * b.order; });
    return n;
  }

  function formalCharge(s, slot) {
    return ELEMENTS[s.at[slot]].valence - 2 * (s.lp[slot] || 0) - bondSum(s, slot);
  }

  function steps(a, b) {
    var i = Math.abs(DIRS.indexOf(a) - DIRS.indexOf(b));
    return Math.min(i, 8 - i);
  }

  /* how many lone pairs an atom can hold, given its bonds */
  function capacity(s, slot) {
    var el = s.at[slot], nb = bondsOf(s, slot).length;
    return Math.max(0, Math.min((el ? maxDomains(el, slot) : 4) - nb, DIRS.length - nb));
  }

  /* The directions an atom's n lone pairs (default: the ones it has) are
     drawn in. They are chosen together, as the set that keeps every pair as
     far as possible from the bonds and then from the other pairs — so two
     pairs never end up squeezed side by side when there is room to spread
     them (ClO₂⁻ with its O atoms on two sides, XeF₄ however its F atoms are
     placed). Ties go to the first directions in the preference order. */
  function freeSides(s, slot, n) {
    var taken = bondsOf(s, slot).map(function (b) { return b.side; });
    var pref = slot === 'C' ? PREF_CENTER : PREF_OUTER;
    var free = pref.filter(function (d) { return taken.indexOf(d) < 0; });
    n = Math.min(n == null ? (s.lp[slot] || 0) : n, capacity(s, slot), free.length);
    if (n <= 0) return [];

    function score(set) {
      var nearAny = 9, nearPair = 9, sum = 0;
      set.forEach(function (d, i) {
        var mine = 9;
        taken.forEach(function (x) { mine = Math.min(mine, steps(d, x)); });
        set.forEach(function (x, j) {
          if (j === i) return;
          mine = Math.min(mine, steps(d, x));
          nearPair = Math.min(nearPair, steps(d, x));
        });
        nearAny = Math.min(nearAny, mine);
        sum += mine;
      });
      return [nearAny, nearPair, sum];
    }
    function better(a, b) {
      for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i];
      return false;
    }

    var best = null, bestScore = null;
    (function choose(start, set) {
      if (set.length === n) {
        var sc = score(set);
        if (!best || better(sc, bestScore)) { best = set.slice(); bestScore = sc; }
        return;
      }
      for (var i = start; i <= free.length - (n - set.length); i++) {
        set.push(free[i]);
        choose(i + 1, set);
        set.pop();
      }
    })(0, []);
    return best;
  }

  function roomFor(s, slot) { return capacity(s, slot) - (s.lp[slot] || 0); }

  /* an outer atom with an H on its far side (the O–H of an oxyacid) */
  function carriesH(s, slot) {
    return isInner(slot) && s.at[slot + '2'] === 'H';
  }

  /* Connectivity only: what is bonded to what. Two structures with the same
     signature are the same skeleton, wherever the atoms were placed. */
  function signature(s) {
    var inner = DIRS.filter(function (d) { return has(s, d); }).map(function (d) {
      return s.at[d] + (has(s, d + '2') ? '-' + s.at[d + '2'] : '');
    }).sort();
    var stray = DIRS.filter(function (d) { return has(s, d + '2') && !has(s, d); });
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
      if (a === 'OH') { s.at[d + '2'] = 'H'; s.lp[d + '2'] = 0; s.bo[d + '2'] = 1; }
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

    var after4 = electrons(s4, 'C');
    var stable = ELEMENTS[sp.center].stable;            /* B 6, Be 4 */
    var goal = stable || Math.max(8, after4);

    var s5 = clone(s4), moves = [];
    while (electrons(s5, 'C') < goal) {
      var d = pickCanonical(s5);
      if (!d) break;
      s5.lp[d] -= 1;
      s5.bo[d] += 1;
      moves.push(d);
    }
    return {
      total: v.total, valence: v, bonds: nb, used2: used2, left2: left2, outerLP: outerLP, left3: left3,
      centerLP: centerLP, centerAfter4: after4, centerTarget: goal, moves: moves,
      s2: s2, s3: s3, s4: s4, s5: s5
    };
  }

  function canonical(sp) { return solve(sp).s5; }

  /* How many electrons the central atom ends with: 6 for B, 4 for Be, else 8
     — or more, if Rules 2 and 4 already gave it more. */
  function centerTarget(sp) { return solve(sp).centerTarget; }

  /* Is a finished structure one the 5 rules allow? */
  function accepted(s, sp) {
    var problems = [];
    var want = skeleton(sp);
    var goal = centerTarget(sp);
    if (signature(s) !== signature(want)) problems.push('skeleton');
    if (totalElectrons(s) !== valence(sp).total) problems.push('count');
    filled(s).forEach(function (k) {
      var e = electrons(s, k);
      if (e !== (k === 'C' ? goal : target(s.at[k]))) problems.push(k + ':' + e);
    });
    return { ok: problems.length === 0, problems: problems };
  }

  /* The looked-up answer: a central atom from period 3 or below with MORE
     electrons than the rules give it — extra double bonds piled on by "Rule 5"
     when it was not electron deficient. (SF₆'s 12 is not this: the rules give
     S 12 there.) */
  function expanded(s, sp) {
    return !!s.at.C && ELEMENTS[s.at.C].period >= 3 && electrons(s, 'C') > centerTarget(sp);
  }

  /* Every finished structure Rule 5 can reach, taking a lone pair from ANY
     outer atom bonded to the center each time it runs. */
  function rule5Outcomes(sp) {
    var r = solve(sp), start = r.s4, goal = r.centerTarget, seen = {}, out = [];
    function key(s) { return JSON.stringify([s.lp, s.bo]); }
    (function walk(s) {
      if (electrons(s, 'C') >= goal) {
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
                       extra-double-bond drawing a chatbot or a college book gives
       { stage: 4 }    stop after Rule 4 (Rule 5 skipped)
       { set: { lp: {...}, bo: {...}, at: {...} } }  overwrite slots          */
  function variant(sp, mod) {
    mod = mod || {};
    var r = solve(sp);
    var s = clone(mod.stage === 4 ? r.s4 : mod.stage === 2 ? r.s2 : mod.stage === 3 ? r.s3 : r.s5);
    if (mod.expand) {
      var left = mod.expand;
      ['N', 'S', 'E', 'W', 'NE', 'SW', 'NW', 'SE'].forEach(function (d) {
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
      if (has(s, d + '2')) t += ' (that ' + s.at[d] + ' also bonded to ' + s.at[d + '2'] + ')';
      if (s.at[d] !== 'H' || s.lp[d]) t += ', ' + s.at[d] + ' with ' + pairs(s.lp[d] || 0);
      return t;
    });
    return (s.charge ? 'Ion, charge ' + chargeText(s.charge) + '. ' : '') +
      c + ' in the center with ' + pairs(s.lp.C || 0) + '; ' + parts.join('; ') + '.';
  }

  return {
    DIRS: DIRS, CARD: CARD, VEC: VEC, OPP: OPP, SLOTS: SLOTS, WHERE: WHERE,
    isOuter: isOuter, isInner: isInner, dirOf: dirOf, maxDomains: maxDomains, centerTarget: centerTarget,
    parseFormula: parseFormula, display: display, chargeSup: chargeSup, chargeText: chargeText,
    species: species, valence: valence,
    parentOf: parentOf, pos: pos, empty: empty, clone: clone, has: has, filled: filled,
    bonds: bonds, bondsOf: bondsOf, bondSum: bondSum, electrons: electrons, target: target,
    totalElectrons: totalElectrons, formalCharge: formalCharge, freeSides: freeSides, roomFor: roomFor,
    capacity: capacity, steps: steps,
    carriesH: carriesH, signature: signature,
    skeleton: skeleton, solve: solve, canonical: canonical, accepted: accepted, expanded: expanded,
    rule5Outcomes: rule5Outcomes, variant: variant, describe: describe, pairs: pairs, pickCanonical: pickCanonical
  };
})();

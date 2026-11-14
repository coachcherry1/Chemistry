/* net.js: the model of this package. No DOM.
 *
 * A problem is two solutions mixed: two compounds that split into ions in water, each written as
 * a formula. Everything else is worked out here from package 3's data
 * (ions.js, unchanged: the same solubility rules and ions):
 *
 *   Net.make(f1, f2)   the molecular equation (products by trading partners,
 *                      water written HOH), its coefficients, the states, the
 *                      complete ionic equation, the spectators and the net
 *                      ionic equation (null: no reaction)
 *   Net.beaker(p)      how many of each ion the beaker draws, and which of
 *                      them come together as a solid or as water
 *
 * Scope (the teacher's): the reactants split completely into ions: soluble
 * salts, the strong acids HCl, HBr, HI, HNO3 and H2SO4, and the strong bases
 * LiOH, NaOH, KOH and Ba(OH)2. The products are a solid, water, or nothing.
 * No weak acids or bases, no gases: an acid is never mixed with a carbonate
 * or a phosphate, and ammonium, acetate and sulfide are not used at all.
 *
 * A term of an ionic equation: { t: 'ion', key, q (signed charge), n } or
 * { t: 'cmp', f, s ('s' or 'l'), n }.
 */
var Net = (function () {
  'use strict';

  /* Two compounds package 3 never needed: hydroiodic acid and lithium
     hydroxide (a strong base here). ions.js itself stays identical to
     package 3's; they are added to its lookup table. */
  Ions.ACIDS.I = 'hydroiodic acid';
  Ions.BY.HI = { cat: 'H', an: 'I' };
  Ions.BY.LiOH = { cat: 'Li', an: 'OH' };

  var CATS = ['Li', 'Na', 'K', 'Ag', 'Mg', 'Ca', 'Sr', 'Ba', 'Zn', 'Fe', 'Pb', 'Cu', 'Al'];
  var ANS = ['Cl', 'Br', 'I', 'NO3', 'OH', 'SO4', 'CO3', 'PO4'];
  var ACID_ANS = ['Cl', 'Br', 'I', 'NO3', 'SO4'];            /* the strong acids */
  var BASE_CATS = ['Li', 'Na', 'K', 'Ba'];                    /* the strong bases */
  var STRONG_ACIDS = ACID_ANS.map(function (a) { return Ions.formula('H', a); });
  var STRONG_BASES = BASE_CATS.map(function (c) { return Ions.formula(c, 'OH'); });

  var SUPD = { 1: '', 2: '²', 3: '³' };
  function pretty(f) { return f === 'H2O' ? 'HOH' : Chem.pretty(f); }
  function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }

  /* ---------------------------------------------------------------- compounds */
  function usable(c, a) { return (c === 'Li' && a === 'OH') || Ions.usable(c, a); }
  function compound(c, a) { return c === 'H' && a === 'OH' ? 'H2O' : Ions.formula(c, a); }
  function partsOf(f) { return f === 'H2O' ? { cat: 'H', an: 'OH' } : Ions.parts(f); }
  function state(f) {
    if (f === 'H2O') return 'l';
    var p = partsOf(f);
    return Ions.soluble(p.cat, p.an) ? 'aq' : 's';
  }
  function isAcid(f) { return STRONG_ACIDS.indexOf(f) >= 0; }
  function isBase(f) { return STRONG_BASES.indexOf(f) >= 0; }
  /* a reactant: a strong acid, a strong base or a soluble salt of the ions above */
  function reactantOK(f) {
    var p = partsOf(f);
    if (!p) return false;
    if (p.cat === 'H') return ACID_ANS.indexOf(p.an) >= 0;
    if (p.an === 'OH') return BASE_CATS.indexOf(p.cat) >= 0;
    return CATS.indexOf(p.cat) >= 0 && ANS.indexOf(p.an) >= 0 && usable(p.cat, p.an) && Ions.soluble(p.cat, p.an);
  }
  function name(f) { return f === 'H2O' ? 'water' : Ions.name(f); }

  /* ---------------------------------------------------------------------- ions */
  function ionSym(key, cat) { return cat ? Ions.CATIONS[key][0] : Ions.ANIONS[key][0]; }
  function charge(key, cat) { return cat ? Ions.CATIONS[key][1] : -Ions.ANIONS[key][1]; }
  function chargeText(q) { return SUPD[Math.abs(q)] + (q > 0 ? '⁺' : '⁻'); }
  function ionText(key, q) { return Chem.pretty(ionSym(key, q > 0)) + chargeText(q); }
  function ionName(key, q) {
    if (key === 'H') return 'hydrogen ion';
    return (q > 0 ? Ions.CATIONS[key][2] : Ions.ANIONS[key][2]) + ' ion';
  }

  /* ----------------------------------------------------------------- equations */
  function termKey(t) { return t.t === 'ion' ? 'ion:' + t.key : 'cmp:' + t.f; }
  function termText(t, coef) {
    var n = coef === false || t.n === 1 ? '' : t.n + ' ';
    return n + (t.t === 'ion' ? ionText(t.key, t.q) + '(aq)' : pretty(t.f) + '(' + t.s + ')');
  }
  function sideText(terms) { return terms.map(function (t) { return termText(t); }).join(' + '); }
  /* the terms of one species: split if dissolved, kept together if not */
  function split(f, n, s) {
    if (s !== 'aq') return [{ t: 'cmp', f: f, s: s, n: n }];
    var p = partsOf(f), r = p.cat === 'H' ? [Chem.parse(f).H, 1] : Ions.ratio(p.cat, p.an);
    return [{ t: 'ion', key: p.cat, q: charge(p.cat, true), n: n * r[0] }, { t: 'ion', key: p.an, q: charge(p.an, false), n: n * r[1] }];
  }
  function merge(terms) {
    var out = [], at = {};
    terms.forEach(function (t) {
      var k = termKey(t);
      if (at[k] != null) out[at[k]].n += t.n;
      else { at[k] = out.length; out.push({ t: t.t, key: t.key, q: t.q, f: t.f, s: t.s, n: t.n }); }
    });
    return out;
  }
  function charges(terms) { return terms.reduce(function (s, t) { return s + (t.t === 'ion' ? t.q * t.n : 0); }, 0); }

  /* ------------------------------------------------------------------- a problem */
  function make(f1, f2) {
    var A = partsOf(f1), B = partsOf(f2);
    var prods = [compound(A.cat, B.an), compound(B.cat, A.an)];
    if (prods[0] === 'H2O') prods.reverse();
    var states = {};
    [f1, f2].concat(prods).forEach(function (f) { states[f] = state(f); });
    var solids = prods.filter(function (f) { return states[f] === 's'; });
    var water = prods.indexOf('H2O') >= 0;
    var kind = water && solids.length ? 'both' : water ? 'water' : solids.length ? 'solid' : 'none';
    var rx = { id: f1 + '+' + f2, l: [f1, f2], r: prods, type: water ? 'N' : 'DR' };
    var coefs = Chem.balance(rx);
    var sp = [f1, f2].concat(prods);
    var left = merge([].concat(split(f1, coefs[0], 'aq'), split(f2, coefs[1], 'aq')));
    var right = merge([].concat(split(prods[0], coefs[2], states[prods[0]]), split(prods[1], coefs[3], states[prods[1]])));
    var rk = {};
    right.forEach(function (t) { if (t.t === 'ion') rk[t.key] = t.n; });
    var spect = left.filter(function (t) { return rk[t.key] === t.n; }).map(function (t) { return t.key; });
    /* positive ions first, as the class writes them */
    var nl = left.filter(function (t) { return spect.indexOf(t.key) < 0; }).sort(function (x, y) { return (y.q > 0) - (x.q > 0); });
    var nr = right.filter(function (t) { return t.t !== 'ion' || spect.indexOf(t.key) < 0; });
    var net = null;
    if (nl.length || nr.length) {
      var g = nl.concat(nr).reduce(function (x, t) { return gcd(x, t.n); }, 0);
      function div(t) { var c = merge([t])[0]; c.n = t.n / g; return c; }
      net = { left: nl.map(div), right: nr.map(div), k: g };
    }
    var p = {
      id: rx.id, l: [f1, f2], r: prods, kind: kind, reacts: !!net, rx: rx, coefs: coefs, states: states, solids: solids, water: water,
      ionic: { left: left, right: right }, spect: spect, net: net, sp: sp
    };
    p.given = f1 + '(aq) + ' + f2 + '(aq)';
    p.unbalanced = pretty(f1) + '(aq) + ' + pretty(f2) + '(aq) → ' + prods.map(pretty).join(' + ');
    p.prompt = 'Solutions of ' + name(f1) + ' and ' + name(f2) + ' are mixed.';
    return p;
  }
  function molecularText(p, withStates) {
    return [p.l, p.r].map(function (side, k) {
      return side.map(function (f, j) {
        var c = p.coefs[k * 2 + j];
        return (c > 1 ? c + ' ' : '') + pretty(f) + (withStates === false ? '' : '(' + p.states[f] + ')');
      }).join(' + ');
    }).join(' → ');
  }
  function ionicText(p) { return sideText(p.ionic.left) + ' → ' + sideText(p.ionic.right); }
  function netText(p) { return p.net ? sideText(p.net.left) + ' → ' + sideText(p.net.right) : 'No reaction: every ion is a spectator.'; }
  /* 'Na⁺', 'Na⁺ and NO₃⁻', 'Na⁺, NO₃⁻ and K⁺' */
  function list(words) { return words.length < 2 ? words.join('') : words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1]; }
  function ionsText(terms) { return list(terms.map(function (t) { return ionText(t.key, t.q); })); }
  function spectText(p) { return ionsText(p.ionic.left.filter(function (t) { return p.spect.indexOf(t.key) >= 0; })); }
  /* one sentence: what happened */
  function why(p) {
    if (!p.net) return 'Both products are soluble, so every ion stays in the solution: all of them are spectators and nothing is left. No reaction.';
    var s = p.spect.length ? spectText(p) + (p.spect.length > 1 ? ' are' : ' is') + ' the spectator' + (p.spect.length > 1 ? 's' : '') + '. ' : 'There are no spectators: every ion reacts. ';
    if (p.kind === 'water') return s + 'H⁺ and OH⁻ become water, HOH.';
    if (p.kind === 'both') return s + 'Ba²⁺ and SO₄²⁻ form a solid while H⁺ and OH⁻ become water.';
    return s + pretty(p.solids[0]) + ' is insoluble: its ions come together as a solid.';
  }

  /* ------------------------------------------------------------- the beaker */
  /* how many formula units to draw: as many as fit about 20 ions */
  function beaker(p) {
    var per = p.ionic.left.reduce(function (s, t) { return s + t.n; }, 0);
    var m = Math.max(1, Math.min(4, Math.floor(20 / per)));
    function ions(f, c) {
      return split(f, c * m, 'aq').map(function (t) { return { key: t.key, q: t.q, n: t.n }; });
    }
    var solids = p.solids.map(function (f) {
      var pr = partsOf(f), r = Ions.ratio(pr.cat, pr.an);
      return { f: f, units: p.coefs[2 + p.r.indexOf(f)] * m, cat: pr.cat, an: pr.an, nc: r[0], na: r[1] };
    });
    var water = p.water ? p.coefs[2 + p.r.indexOf('H2O')] * m : 0;
    return { m: m, a: ions(p.l[0], p.coefs[0]), b: ions(p.l[1], p.coefs[1]), solids: solids, water: water };
  }
  /* a lone solution of one compound (n formula units), for the pictures */
  function solution(f, n) { return split(f, n, 'aq').map(function (t) { return { key: t.key, q: t.q, n: t.n }; }); }

  return {
    CATS: CATS, ANS: ANS, ACID_ANS: ACID_ANS, BASE_CATS: BASE_CATS, STRONG_ACIDS: STRONG_ACIDS, STRONG_BASES: STRONG_BASES,
    pretty: pretty, usable: usable, compound: compound, partsOf: partsOf, state: state, isAcid: isAcid, isBase: isBase, reactantOK: reactantOK,
    name: name, ionSym: ionSym, charge: charge, chargeText: chargeText, ionText: ionText, ionName: ionName,
    termKey: termKey, termText: termText, sideText: sideText, split: split, merge: merge, charges: charges, gcd: gcd,
    list: list, ionsText: ionsText, make: make, molecularText: molecularText, ionicText: ionicText, netText: netText, spectText: spectText, why: why,
    beaker: beaker, solution: solution
  };
})();

/* what bench.js and particles.js ask for: water is H2O inside the model (the
   balancing workbench writes it HOH in a neutralization) */
Rx.name = function (f) { return Net.name(f); };
Rx.tree = function (f) { return f === 'H2O' ? 'O(H)(H)' : Ions.tree(f); };

if (typeof module !== 'undefined') module.exports = Net;

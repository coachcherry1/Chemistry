/* problems.js: one student's graded work, from a seed.
 *
 *   Gen.set(seed)    ten problems: five single replacements (three metal + salt,
 *                    one metal + acid or water, one halogen; three react, two
 *                    do not) and five double replacements (four give a solid,
 *                    one gives no reaction), mixed, a reacting metal first
 *   Gen.quiz(seed)   four choice questions on reading the series and the table
 *   Gen.make(a, b)   the problem for two reactants (lesson steps use it too)
 *
 * A problem's answers all come from Ions (the handout) and Chem.balance:
 *   { id, kind: 'sr' | 'dr', sub, l: [formula, formula], reacts, products: [formula, formula],
 *     states: { formula: 's' | 'l' | 'g' | 'aq' }, rx, coefs, rungs: [...], prompt, why }
 * rungs: what the student does, in order. Single: react, then (if it reacts)
 * products, balance (no states: they do not matter there). Double: products, states, react, then balance
 * if a solid forms.
 */
var Gen = (function () {
  'use strict';

  /* lone metals, the ones that react with water included (the teacher's choice: on paper the series decides) */
  var METALS = ['K', 'Ba', 'Ca', 'Na', 'Mg', 'Al', 'Zn', 'Fe', 'Pb', 'Cu', 'Ag'];
  var WATER_NO = ['Zn', 'Fe', 'Pb', 'Cu', 'Ag'];                 /* dropped into cold water: nothing happens */
  var SALT_ANIONS = ['NO3', 'Cl', 'SO4', 'C2H3O2'];
  var ACID_ANIONS = ['Cl', 'SO4'];
  var HALS = ['Cl', 'Br', 'I'];
  var DR_CATS = ['Na', 'K', 'NH4', 'Mg', 'Ca', 'Ba', 'Sr', 'Al', 'Zn', 'Fe', 'Pb', 'Cu', 'Ag'];
  var DR_ANS = ['Cl', 'Br', 'I', 'NO3', 'SO4', 'CO3', 'PO4', 'OH', 'C2H3O2', 'S'];
  var QUIZ = 4;

  function pick(list, rand) { return list[Math.floor(rand() * list.length)]; }
  function pretty(f) { return Chem.pretty(f); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function elName(sym) { return Ions.name(Ions.elementOf(sym)); }
  function ok(cat, an) { return !!Ions.BY[Ions.formula(cat, an)] && Ions.usable(cat, an); }
  function aq(cat, an) { return ok(cat, an) && Ions.soluble(cat, an); }

  /* ---- one problem from its two reactants */
  function make(a, b) {
    var p = { id: a + '+' + b, l: [a, b], states: {} }, info;
    if (Ions.isElement(a)) {
      info = Ions.single(Ions.symOf(a), b);
      p.kind = 'sr'; p.sub = info.kind; p.el = info.el; p.out = info.out;
      p.reacts = info.reacts; p.products = info.products;
      var lone = elName(info.el), pushed = elName(info.out), isHal = info.kind === 'halogen';
      p.prompt = isHal ? cap(lone) + ', ' + pretty(a) + ', is added to a solution of ' + Ions.name(b) + ', ' + pretty(b) + '.'
               : info.kind === 'water' ? 'A piece of ' + lone + ' is dropped into cold water, HOH.'
               : info.kind === 'acid' ? 'A piece of ' + lone + ' is dropped into ' + Ions.name(b) + ', ' + pretty(b) + '.'
               : 'A piece of ' + lone + ' is placed in a solution of ' + Ions.name(b) + ', ' + pretty(b) + '.';
      p.why = info.kind === 'water'
        ? (info.reacts ? cap(lone) + ' is one of the metals that react with cold water (lithium to sodium on the series), so it takes the place of a hydrogen in HOH.'
                       : cap(lone) + ' does not react with cold water: only the metals from lithium to sodium do. No reaction.')
        : cap(lone) + ' is ' + (info.reacts ? 'above ' : 'below ') + pushed + ' in the ' + (isHal ? 'halogens' : 'activity series') + ', so it ' +
          (info.reacts ? 'takes its place' : 'cannot take its place: no reaction') + '.';
      /* no states in a single replacement: the teacher writes them only where they matter */
      p.rungs = info.reacts ? ['react', 'products', 'balance'] : ['react'];
    } else {
      info = Ions.double(a, b);
      p.kind = 'dr'; p.sub = 'double';
      p.reacts = info.reacts; p.products = info.products; p.solids = info.solids;
      p.prompt = 'Solutions of ' + Ions.name(a) + ', ' + pretty(a) + ', and ' + Ions.name(b) + ', ' + pretty(b) + ', are mixed.';
      p.why = info.reacts ? info.solids.map(function (f) { return cap(Ions.name(f)) + ', ' + pretty(f) + ', is insoluble'; }).join(' and ') +
                            ': a solid forms, so there is a reaction.'
                          : 'Both possible products, ' + info.products.map(pretty).join(' and ') + ', are soluble. Nothing leaves the solution: no reaction.';
      p.rungs = info.reacts ? ['products', 'states', 'react', 'balance'] : ['products', 'states', 'react'];
    }
    p.l.concat(p.products).forEach(function (f) { p.states[f] = Ions.state(f); });
    /* a lone halogen is used as its solution; a lone metal is a solid */
    p.rx = { id: p.id, l: p.l, r: p.products, type: p.kind === 'sr' ? 'SR' : 'DR' };
    p.coefs = Chem.balance(p.rx);
    return p;
  }

  /* '2 Al + 3 CuCl₂ → 2 AlCl₃ + 3 Cu' (a single replacement has no state symbols),
     'Pb(NO₃)₂(aq) + 2 KI(aq) → PbI₂(s) + 2 KNO₃(aq)', or '... → no reaction' */
  function equation(p, withCoefs) {
    function side(list, off) {
      return list.map(function (f, j) {
        var c = withCoefs && p.reacts ? p.coefs[off + j] : 1;
        return (c > 1 ? c + ' ' : '') + pretty(f) + stateOf(p, f);
      }).join(' + ');
    }
    return side(p.l, 0) + ' → ' + (p.reacts ? side(p.products, 2) : 'no reaction');
  }
  /* '(aq)' or '(s)' after a formula in a double replacement, nothing in a single replacement */
  function stateOf(p, f) { return p.kind === 'dr' ? '(' + p.states[f] + ')' : ''; }

  /* ---- every reactant pair the graded set can draw from */
  var poolCache = null;
  function pools() {
    if (poolCache) return poolCache;
    var out = { metalYes: [], metalNo: [], acidYes: [], acidNo: [], waterYes: [], waterNo: [], halYes: [], halNo: [], drYes: [], drNo: [] };
    METALS.forEach(function (m) {
      METALS.forEach(function (n) {
        if (m === n) return;
        SALT_ANIONS.forEach(function (an) {
          if (!aq(n, an) || !aq(m, an)) return;
          var p = make(m, Ions.formula(n, an));
          if (Math.max.apply(null, p.coefs) <= 6) (p.reacts ? out.metalYes : out.metalNo).push(p);
        });
      });
      ACID_ANIONS.forEach(function (an) {
        if (!aq(m, an)) return;
        var p = make(m, Ions.formula('H', an));
        (p.reacts ? out.acidYes : out.acidNo).push(p);
      });
    });
    METALS.concat(WATER_NO).forEach(function (m) {
      var p = make(m, 'HOH');
      if (p.reacts && !aq(m, 'OH')) return;      /* the hydroxide it makes must be clearly soluble */
      var list = p.reacts ? out.waterYes : out.waterNo;
      if (!list.some(function (q) { return q.id === p.id; }) && (p.reacts || WATER_NO.indexOf(m) >= 0)) list.push(p);
    });
    HALS.forEach(function (x) {
      HALS.forEach(function (y) {
        if (x === y) return;
        ['Na', 'K'].forEach(function (c) {
          var p = make(Ions.elementOf(x), Ions.formula(c, y));
          (p.reacts ? out.halYes : out.halNo).push(p);
        });
      });
    });
    var comps = [];
    DR_CATS.forEach(function (c) { DR_ANS.forEach(function (a) { if (aq(c, a)) comps.push([c, a]); }); });
    comps.forEach(function (x, i) {
      comps.forEach(function (y, j) {
        if (j <= i || x[0] === y[0] || x[1] === y[1]) return;
        if (!ok(x[0], y[1]) || !ok(y[0], x[1])) return;
        var p = make(Ions.formula(x[0], x[1]), Ions.formula(y[0], y[1]));
        if (Math.max.apply(null, p.coefs) > 6) return;
        (p.reacts ? out.drYes : out.drNo).push(p);
      });
    });
    return (poolCache = out);
  }

  var setCache = {};
  function set(seed) {
    if (setCache[seed]) return setCache[seed];
    var rand = UI.rng(seed ^ 0x5bd1e995), P = pools();
    function take(list, n, used) {
      var got = [], all = UI.shuffle(list, rand);
      all.forEach(function (p) {
        if (got.length >= n) return;
        /* no element or compound twice in a student's set of this kind */
        var keys = p.l.concat(p.products);
        if (keys.some(function (k) { return used[k]; })) return;
        keys.forEach(function (k) { used[k] = 1; });
        got.push(p);
      });
      all.forEach(function (p) { if (got.length < n && got.indexOf(p) < 0) got.push(p); });
      return got;
    }
    var usedS = {}, usedD = {};
    var first = take(P.metalYes, 1, usedS)[0];
    /* the fourth single replacement replaces hydrogen: from an acid, or from water */
    var acidReacts = rand() < 0.5, water = rand() < 0.4;
    var hyd = water ? (acidReacts ? P.waterYes : P.waterNo) : (acidReacts ? P.acidYes : P.acidNo);
    var rest = take(P.metalYes, 1, usedS).concat(take(P.metalNo, 1, usedS),
      take(hyd, 1, usedS), take(acidReacts ? P.halNo : P.halYes, 1, usedS),
      take(P.drYes, 4, usedD), take(P.drNo, 1, usedD));
    var out = [first].concat(UI.shuffle(rest, rand));
    return (setCache[seed] = out);
  }

  /* ------------------------------------------------------- choice questions */

  function finish(q, right, wrong, rand) {
    var all = UI.shuffle([{ t: right, ok: 1 }].concat(wrong.map(function (t) { return { t: t }; })), rand);
    q.choices = all.map(function (c) { return c.t; });
    q.right = all.map(function (c) { return !!c.ok; }).indexOf(true);
    return q;
  }
  function quiz(seed) {
    var rand = UI.rng(seed ^ 0x2545f491), out = [], P = pools();
    /* which metal replaces N? exactly one of the four is above it */
    var n = pick(['Al', 'Zn', 'Fe'], rand);
    var above = pick(METALS.filter(function (m) { return Ions.replaces(m, n); }), rand);
    var below = UI.shuffle(METALS.filter(function (m) { return m !== n && !Ions.replaces(m, n); }), rand).slice(0, 3);
    out.push(finish({ id: 'q-series', kind: 'series', target: n,
      stem: 'Which of these metals will replace ' + elName(n) + ' from a solution of one of its compounds?',
      why: cap(elName(above)) + ' is above ' + elName(n) + ' in the activity series. ' + below.map(function (m) { return cap(elName(m)); }).join(', ') + ' are below it.'
    }, cap(elName(above)), below.map(function (m) { return cap(elName(m)); }), rand));
    /* which metal does not react with an acid? */
    var inert = pick(['Cu', 'Ag'], rand);
    var active = UI.shuffle(METALS.filter(function (m) { return Ions.replaces(m, 'H') && m !== 'Pb'; }), rand).slice(0, 3);
    out.push(finish({ id: 'q-acid', kind: 'acid',
      stem: 'Which of these metals will NOT react with hydrochloric acid, HCl?',
      why: cap(elName(inert)) + ' is below hydrogen in the activity series, so it cannot replace the hydrogen of an acid. The others are above hydrogen.'
    }, cap(elName(inert)), active.map(function (m) { return cap(elName(m)); }), rand));
    /* which compound is insoluble? */
    var all = Object.keys(Ions.BY).filter(function (f) { return Ions.BY[f].cat !== 'H' && DR_CATS.indexOf(Ions.BY[f].cat) >= 0; });
    var solid = pick(all.filter(function (f) { return Ions.state(f) === 's'; }), rand);
    var sol = UI.shuffle(all.filter(function (f) { return Ions.state(f) === 'aq' && Ions.BY[f].cat !== Ions.BY[solid].cat && Ions.BY[f].an !== Ions.BY[solid].an; }), rand).slice(0, 3);
    out.push(finish({ id: 'q-insoluble', kind: 'insoluble',
      stem: 'Which of these compounds is insoluble in water, so that it would form as a solid?',
      why: cap(Ions.name(solid)) + ', ' + pretty(solid) + ', is insoluble by the solubility table. The other three are soluble.'
    }, pretty(solid), sol.map(pretty), rand));
    /* which pair gives no reaction? */
    function pair(p) { return pretty(p.l[0]) + ' and ' + pretty(p.l[1]); }
    var nr = pick(P.drNo, rand), yes = UI.shuffle(P.drYes, rand).slice(0, 3);
    out.push(finish({ id: 'q-noreaction', kind: 'noreaction',
      stem: 'Which pair of solutions gives NO reaction when they are mixed?',
      why: 'Trade the partners: ' + nr.products.map(pretty).join(' and ') + ' are both soluble, so nothing forms. Each other pair makes a solid: ' +
           yes.map(function (p) { return p.solids.map(pretty).join(' and '); }).join('; ') + '.'
    }, pair(nr), yes.map(pair), rand));
    return out;
  }

  return { QUIZ: QUIZ, COUNT: 10, WATER_NO: WATER_NO, METALS: METALS, HALS: HALS, DR_CATS: DR_CATS, DR_ANS: DR_ANS, make: make, equation: equation, stateOf: stateOf,
           pools: pools, set: set, quiz: quiz };
})();

if (typeof module !== 'undefined') module.exports = Gen;

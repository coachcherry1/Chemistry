/* problems.js: one student's graded work, from a seed.
 *
 *   Gen.set(seed)    the graded equations: 3 easy, 4 medium, 3 hard, easiest
 *                    first, never a lesson reaction
 *   Gen.quiz(seed)   the six graded choice questions
 *
 * Every answer comes from Chem: the coefficients from Chem.balance, the
 * counts from Chem.parse, "is it conserved" from Chem.tally. Nothing is
 * typed twice. A choice question is
 *   { id, kind, stem, fig: { rx, coefs } or null, choices: [text], right: index, why }
 * with the choices already shuffled.
 */
var Gen = (function () {
  'use strict';

  var PLAN = [[1, 3], [2, 4], [3, 3]];          /* [level, how many] */
  var QUIZ = 6;

  function pick(list, rand) { return list[Math.floor(rand() * list.length)]; }
  function pool(level) {
    return Rx.REACTIONS.filter(function (r) { return r.level === level && !r.lesson && !r.big; });
  }
  function sig(r) { return r.l.length + '>' + r.r.length + ':' + Chem.balance(r).join(','); }

  var setCache = {};
  function set(seed) {
    if (setCache[seed]) return setCache[seed];
    var rand = UI.rng(seed ^ 0x5bd1e995), out = [];
    PLAN.forEach(function (pl) {
      var list = UI.shuffle(pool(pl[0]), rand), seen = {}, got = [];
      /* two equations with the same shape and the same answer teach nothing new */
      list.forEach(function (r) { if (got.length < pl[1] && !seen[sig(r)]) { seen[sig(r)] = 1; got.push(r); } });
      list.forEach(function (r) { if (got.length < pl[1] && got.indexOf(r) < 0) got.push(r); });
      got.forEach(function (r) { out.push({ id: r.id, rx: r, coefs: Chem.balance(r), level: pl[0] }); });
    });
    return (setCache[seed] = out);
  }

  /* ------------------------------------------------------- choice questions */

  /* shuffle, keeping track of the right one */
  function finish(q, right, wrong, rand) {
    var all = [{ t: right, ok: 1 }].concat(wrong.map(function (t) { return { t: t }; }));
    all = UI.shuffle(all, rand);
    q.choices = all.map(function (c) { return c.t; });
    q.right = all.map(function (c) { return !!c.ok; }).indexOf(true);
    return q;
  }

  var ELNAME = function (el) { return Particles.EL[el][0]; };

  /* [coefficient, formula, element] */
  var COUNT_PLAIN = [[3, 'CO2', 'O'], [4, 'NH3', 'H'], [5, 'H2O', 'H'], [3, 'CH4', 'H'], [2, 'SO3', 'O'], [4, 'AlCl3', 'Cl'], [3, 'N2O5', 'O'], [5, 'C2H6', 'H']];
  var COUNT_BRACKET = [[2, 'Ca(NO3)2', 'O'], [3, 'Ca(OH)2', 'H'], [2, 'Al(OH)3', 'O'], [2, 'Al2(SO4)3', 'O'], [3, 'Pb(NO3)2', 'N'], [2, 'Ca3(PO4)2', 'O'], [4, 'Al(OH)3', 'H']];

  function countQ(id, item, rand) {
    var n = item[0], f = item[1], el = item[2];
    var per = Chem.parse(f)[el], right = n * per;
    var m = new RegExp(el + '(\\d*)').exec(f), inner = m && m[1] ? +m[1] : 1;
    var wrong = [];
    [per, n * inner, inner, n + per, n, right + n, right + per, right * 2].forEach(function (x) {
      if (x > 0 && x !== right && wrong.indexOf(x) < 0 && wrong.length < 3) wrong.push(x);
    });
    return finish({
      id: id, kind: 'count', fig: null,
      stem: 'How many ' + ELNAME(el) + ' atoms are in ' + n + ' ' + Chem.pretty(f) + '?',
      why: 'One ' + Chem.pretty(f) + ' has ' + per + ' ' + el + ' atom' + (per > 1 ? 's' : '') +
           (inner !== per ? ' (the subscript outside the brackets multiplies everything inside them)' : '') +
           '. The coefficient says there are ' + n + ' of them: ' + n + ' × ' + per + ' = ' + right + '.'
    }, String(right), wrong.map(String), rand);
  }

  /* reactions small enough to draw clearly in a question */
  function small() {
    return Rx.REACTIONS.filter(function (r) {
      var c = Chem.balance(r);
      return !r.big && r.level < 3 && c.reduce(function (a, b) { return a + b; }, 0) <= 7 && Chem.elements(r).length <= 3;
    });
  }

  /* is this picture conserved? want: true (a conserved picture, sometimes doubled) or false (one element off) */
  function balQ(id, want, rand, avoid) {
    var list = UI.shuffle(small().filter(function (r) { return avoid.indexOf(r.id) < 0; }), rand), r, coefs, i;
    for (i = 0; i < list.length && !coefs; i++) {
      r = list[i];
      var base = Chem.balance(r);
      if (want) {
        coefs = rand() < 0.5 && base.reduce(function (a, b) { return a + b; }, 0) <= 4 ? base.map(function (c) { return c * 2; }) : base;
      } else {
        /* one coefficient changed by one, so that exactly one element is off */
        var tries = [];
        base.forEach(function (c, j) {
          [1, -1].forEach(function (d) {
            if (c + d < 1) return;
            var t = base.slice(); t[j] = c + d;
            if (Chem.tally(r, t).filter(function (x) { return !x.ok; }).length === 1) tries.push(t);
          });
        });
        if (tries.length) coefs = pick(tries, rand);
      }
    }
    var tal = Chem.tally(r, coefs), off = tal.filter(function (x) { return !x.ok; })[0];
    var yes = 'Yes: every atom is conserved';
    var nos = tal.map(function (x) { return { el: x.el, t: 'No: the number of ' + ELNAME(x.el) + ' atoms changes' }; });
    var right = off ? nos.filter(function (x) { return x.el === off.el; })[0].t : yes;
    var wrong = (off ? [yes] : []).concat(nos.filter(function (x) { return !off || x.el !== off.el; }).map(function (x) { return x.t; })).slice(0, 3);
    var counts = tal.map(function (x) { return x.el + ': ' + x.left + ' before, ' + x.right + ' after'; }).join('; ');
    return finish({
      id: id, kind: 'conserved', fig: { rx: r, coefs: coefs }, rxid: r.id,
      stem: 'Count the atoms in the picture. Does it obey the law of conservation of mass?',
      why: counts + '. ' + (off ? 'Atoms cannot ' + (off.right > off.left ? 'appear from nowhere' : 'vanish') + ', so this picture cannot be right.'
                                : 'Every atom in the reactants is in the products, so the mass is the same before and after.')
    }, right, wrong, rand);
  }

  /* the inventory of an equation as written: how many of a polyatomic ion on each side? */
  function ionList() {
    var out = [];
    Rx.REACTIONS.forEach(function (r) {
      if (r.lesson || r.big) return;
      var ones = Chem.species(r).map(function () { return 1; });
      Chem.inventory(r, ones).forEach(function (row) { if (row.ion && row.left !== row.right) out.push({ rx: r, row: row }); });
    });
    return out;
  }
  function invQ(id, rand) {
    var it = pick(ionList(), rand), r = it.rx, row = it.row, atoms = Chem.parse(row.ion), big = Math.max.apply(null, Object.keys(atoms).map(function (k) { return atoms[k]; }));
    function say(a, b) { return a + ' in the reactants, ' + b + ' in the products'; }
    var right = say(row.left, row.right), wrong = [];
    [say(1, 1), say(row.right, row.left), say(row.left * big, row.right * big), say(row.left + 1, row.right + 1), say(row.left, row.left)].forEach(function (t) {
      if (t !== right && wrong.indexOf(t) < 0 && wrong.length < 3) wrong.push(t);
    });
    return finish({
      id: id, kind: 'inventory', fig: null, rxid: r.id, ion: row.ion,
      stem: 'Start an inventory for ' + Chem.equation(r) + ' as it is written, before any coefficients. How many ' + row.name + ' ions, ' + row.label + ', are on each side?',
      why: row.label + ' is on both sides, so it is kept together as one row of the inventory. A subscript outside the brackets counts the ions: ' +
           right + '.'
    }, right, wrong, rand);
  }

  /* fixed wording; the right answer is first here and never the longest */
  var RULES = [
    { id: 'r-subscript', stem: 'To balance H₂ + O₂ → H₂O, a student changes H₂O to H₂O₂. Why is that not allowed?',
      c: ['H₂O₂ is a different substance', 'A subscript can only be made smaller, never bigger', 'It puts too many hydrogen atoms in the products',
          'Coefficients must be changed before subscripts are'],
      why: 'A subscript is part of what the substance is: H₂O is water, H₂O₂ is hydrogen peroxide. Only coefficients, the number of particles, may change.' },
    { id: 'r-coefficient', stem: 'What does the coefficient 3 in 3 CO₂ tell you?',
      c: ['There are 3 CO₂ molecules', 'Each molecule has 3 carbon atoms in it', 'Each molecule has 3 oxygen atoms in it',
          'The molecule is 3 times as heavy as usual'],
      why: 'A coefficient counts whole particles: 3 CO₂ is three molecules, each one still 1 C and 2 O.' },
    { id: 'r-mass', stem: 'A reaction runs in a sealed jar. How does the mass in the jar afterwards compare with the mass before?',
      c: ['The same: no atoms enter or leave', 'Less: the reactants are used up as it runs', 'More: new product particles have been made',
          'It depends on how many product molecules form'],
      why: 'The law of conservation of mass: a reaction only rearranges atoms. The same atoms are there before and after, so the mass is the same.' },
    { id: 'r-same', stem: 'When an equation is balanced, what is the same on both sides of the arrow?',
      c: ['The number of atoms of each element', 'The number of molecules of each substance', 'The coefficients in front of the formulas',
          'The subscripts inside every one of the formulas'],
      why: 'Atoms are conserved, element by element. The number of molecules can change: 2 H₂ + O₂ (3 molecules) makes 2 H₂O (2 molecules).' },
    { id: 'r-ion', stem: 'In P₄O₁₀ + H₂O → H₃PO₄, why can PO₄ not be a row of the inventory?',
      c: ['PO₄ is on only one side', 'A polyatomic ion is never counted as one piece', 'P₄O₁₀ has too many oxygen atoms to count them',
          'Only an ion written inside brackets is kept together'],
      why: 'An ion is kept together only when it is in the reactants and in the products. Here the reactants have no PO₄, so P and O are counted atom by atom.' },
    { id: 'r-lowest', stem: 'A student balances an equation as 4 H₂ + 2 O₂ → 4 H₂O. What should be done with it?',
      c: ['Divide every coefficient by 2', 'Nothing: every atom is conserved', 'Change the subscripts so that it reads 4, 2, 4',
          'Add one more O₂ so the reactants are even'],
      why: 'Every atom is conserved, but an equation is written with the lowest whole-number coefficients: 2 H₂ + O₂ → 2 H₂O.' }
  ];
  function ruleQ(id, rand) {
    var r = pick(RULES, rand);
    return finish({ id: r.id, kind: 'rule', fig: null, stem: r.stem, why: r.why }, r.c[0], r.c.slice(1), rand);
  }

  var quizCache = {};
  function quiz(seed) {
    if (quizCache[seed]) return quizCache[seed];
    var rand = UI.rng(seed ^ 0x2545f491);
    var out = [];
    out.push(countQ('q-count', pick(COUNT_PLAIN, rand), rand));
    out.push(ruleQ('q-rule', rand));
    out.push(balQ('q-bal-a', rand() < 0.5, rand, []));
    out.push(countQ('q-bracket', pick(COUNT_BRACKET, rand), rand));
    out.push(balQ('q-bal-b', !(out[2].choices[out[2].right].slice(0, 3) === 'Yes'), rand, [out[2].rxid]));
    out.push(invQ('q-inventory', rand));
    return (quizCache[seed] = out);
  }

  return { PLAN: PLAN, QUIZ: QUIZ, COUNT: PLAN.reduce(function (t, p) { return t + p[1]; }, 0), set: set, quiz: quiz, pool: pool,
           RULES: RULES, ionList: ionList, COUNT_PLAIN: COUNT_PLAIN, COUNT_BRACKET: COUNT_BRACKET, countQ: countQ, small: small };
})();

if (typeof module !== 'undefined') module.exports = Gen;

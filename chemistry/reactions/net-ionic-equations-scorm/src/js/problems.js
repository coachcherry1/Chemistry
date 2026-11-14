/* problems.js: the lesson's reactions, the graded problems and the graded
 * questions, all made by net.js from a seed. No DOM.
 *
 *   Gen.LESSON          every reaction and compound the lesson shows; none is
 *                       ever graded (the teacher: meeting a worked example
 *                       again teaches nothing)
 *   Gen.pools()         every allowed pair of solutions: solid, water, none
 *   Gen.set(seed)       the 8 graded problems: 3 that make a solid, 2 that make
 *                       water (one of them has to be reduced to lowest terms),
 *                       2 with no reaction, and last the challenge, barium
 *                       hydroxide and sulfuric acid (a solid and water at once)
 *   Gen.quiz(seed)      the 4 graded questions, one of each kind
 */
var Gen = (function () {
  'use strict';

  var COUNT = 8, QUIZ = 4;
  var RUNGS = ['balance', 'states', 'ionic', 'spectators', 'net'];

  var LESSON = {
    aq: ['Na2SO4', 'CaCl2', 'AgCl'],
    split: [['Na2SO4', 1], ['MgCl2', 1], ['KNO3', 2], ['Al(NO3)3', 1], ['K3PO4', 2], ['H2SO4', 1], ['BaSO4', 2], ['H2O', 2]],
    solid: ['AgNO3', 'NaCl'], water: ['HCl', 'NaOH'], none: ['KCl', 'NaNO3'],
    exSolid: ['Pb(NO3)2', 'KI'], exWater: ['H2SO4', 'KOH'], exNone: ['CuSO4', 'NaNO3']
  };
  function key(l) { return l.slice().sort().join('+'); }
  var SEEN = {};
  ['solid', 'water', 'none', 'exSolid', 'exWater', 'exNone'].forEach(function (k) { SEEN[key(LESSON[k])] = 1; });
  var CHALLENGE = ['Ba(OH)2', 'H2SO4'];

  /* every compound that can be a reactant */
  var REACTANTS = (function () {
    var out = [];
    Net.CATS.concat(['H']).forEach(function (c) {
      Net.ANS.forEach(function (a) {
        if (c === 'H' && a === 'OH') return;
        var f = Net.compound(c, a);
        if (Ions.parts(f) && Net.reactantOK(f) && out.indexOf(f) < 0) out.push(f);
      });
    });
    return out;
  })();

  /* may these two be mixed? */
  function allowed(f1, f2) {
    var A = Net.partsOf(f1), B = Net.partsOf(f2);
    if (A.cat === B.cat || A.an === B.an) return false;
    /* an acid only meets an anion whose acid is strong too (no weak acid, no gas), or a hydroxide */
    if (A.cat === 'H' && Net.ACID_ANS.indexOf(B.an) < 0 && B.an !== 'OH') return false;
    if (B.cat === 'H' && Net.ACID_ANS.indexOf(A.an) < 0 && A.an !== 'OH') return false;
    var p1 = Net.compound(A.cat, B.an), p2 = Net.compound(B.cat, A.an);
    return [p1, p2].every(function (f) { return f === 'H2O' || (Ions.parts(f) && Net.usable(Net.partsOf(f).cat, Net.partsOf(f).an)); });
  }

  var cache = null;
  function pools() {
    if (cache) return cache;
    var out = { solid: [], water: [], none: [] };
    REACTANTS.forEach(function (f1, i) {
      REACTANTS.forEach(function (f2, j) {
        if (j <= i || !allowed(f1, f2)) return;
        if (SEEN[key([f1, f2])] || key([f1, f2]) === key(CHALLENGE)) return;
        var p = Net.make(f1, f2);
        if (!p.coefs || Math.max.apply(null, p.coefs) > 6) return;
        if (p.kind === 'both' || p.solids.length > 1) return;          /* only the challenge has two at once */
        out[p.kind].push(p);
      });
    });
    cache = out;
    return out;
  }

  function order(p, rand) { return rand() < 0.5 ? p : Net.make(p.l[1], p.l[0]); }
  function reduces(p) { return p.net && p.net.k > 1; }

  function set(seed) {
    var rand = UI.rng(seed), P = pools(), out = [];
    /* three solids, each a different kind of solid (by its negative ion) */
    var anions = {};
    UI.shuffle(P.solid, rand).forEach(function (p) {
      var an = Net.partsOf(p.solids[0]).an;
      if (out.length < 3 && !anions[an]) { anions[an] = 1; out.push(p); }
    });
    var w = UI.shuffle(P.water, rand);
    out.push(w.filter(reduces)[0]);
    out.push(w.filter(function (p) { return !reduces(p); })[0]);
    UI.shuffle(P.none, rand).slice(0, 2).forEach(function (p) { out.push(p); });
    out = UI.shuffle(out, rand);
    /* never open with a no-reaction problem */
    while (out[0].kind === 'none') out.push(out.shift());
    out.push(Net.make(CHALLENGE[0], CHALLENGE[1]));
    return out.map(function (p) { var q = order(p, rand); q.rungs = RUNGS.slice(); return q; });
  }

  /* --------------------------------------------------------------- questions */
  /* each: { id, kind, stem, pic (what beaker.js draws, or null), choices: [text], pics: [picture or null], right, why } */
  function quiz(seed) {
    var rand = UI.rng(seed ^ 0x5bd1e995), P = pools();
    var used = {};
    set(seed).forEach(function (p) { used[key(p.l)] = 1; });
    function fresh(list) { return UI.shuffle(list.filter(function (p) { return !used[key(p.l)]; }), rand); }
    function shuffled(right, wrong, extra) {
      var all = UI.shuffle([right].concat(wrong), rand);
      return { choices: all.map(function (c) { return c.t; }), pics: all.map(function (c) { return c.pic || null; }), right: all.indexOf(right), why: extra };
    }
    var qs = [];

    /* 1. Which picture shows this solution? */
    var skip = LESSON.aq.concat(LESSON.split.map(function (s) { return s[0]; }));
    var cands = REACTANTS.filter(function (f) {
      var pr = Net.partsOf(f), r = pr.cat === 'H' ? [Chem.parse(f).H, 1] : Ions.ratio(pr.cat, pr.an);
      return skip.indexOf(f) < 0 && r[0] !== r[1];
    });
    var f = UI.shuffle(cands, rand)[0], units = 2;
    var ions = Net.solution(f, units), pr = Net.partsOf(f);
    var rt = ions.map(function (t) { return t.n; });
    var r1 = { t: 'Picture with the ions apart, ' + rt[0] + ' and ' + rt[1], pic: { free: ions } };
    var w1 = { t: 'Picture with the ions apart, the same number of each', pic: { free: ions.map(function (t) { return { key: t.key, q: t.q, n: units }; }) } };
    var w2 = { t: 'Picture with the ions still joined as ' + Net.pretty(f), pic: { units: { f: f, n: units } } };
    var w3 = { t: 'Picture with a solid on the bottom', pic: { solid: { f: f, n: units } } };
    var q1 = shuffled(r1, [w1, w2, w3], Net.pretty(f) + '(aq) is dissolved: its ions move apart. Each ' + Net.pretty(f) + ' gives ' +
      rt[0] / units + ' ' + Net.ionText(pr.cat, Net.charge(pr.cat, true)) + ' and ' + rt[1] / units + ' ' + Net.ionText(pr.an, Net.charge(pr.an, false)) +
      ', so ' + units + ' of them give ' + rt[0] + ' and ' + rt[1] + '. Joined ions or a solid on the bottom would be (s).');
    q1.id = 'pic-' + f; q1.kind = 'pic'; q1.stem = 'Which picture shows ' + units + ' ' + Net.pretty(f) + '(aq), ' + Net.name(f) + ' dissolved in water? (Water molecules are not drawn.)';
    qs.push(q1);

    /* 2. Which ions are the spectators in this beaker? */
    var ps = fresh(P.solid)[0];
    var sl = ps.ionic.left.filter(function (t) { return ps.spect.indexOf(t.key) < 0; });
    var txt = Net.ionsText;
    var q2 = shuffled({ t: Net.spectText(ps) }, [{ t: txt(sl) }, { t: txt(ps.ionic.left) }, { t: 'None: every ion reacted' }],
      Net.spectText(ps) + ' are still moving about in the solution, as they were before mixing: the spectators. ' + txt(sl) + ' are in the solid, ' + Net.pretty(ps.solids[0]) + '.');
    q2.id = 'spect-' + ps.id; q2.kind = 'spect'; q2.pic = { after: ps.l };
    q2.stem = 'Solutions of ' + Net.name(ps.l[0]) + ' and ' + Net.name(ps.l[1]) + ' were mixed. This is the beaker afterwards. Which ions are the spectators?';
    qs.push(q2);

    /* 3. The net ionic equation */
    var pn = fresh(rand() < 0.5 ? P.water.filter(reduces) : P.solid)[0];
    var wrongs = [{ t: Net.ionicText(pn) }, { t: Net.molecularText(pn) }, { t: 'No reaction: every ion is a spectator.' }];
    /* for a reaction that reduces, the net ionic equation not in lowest terms */
    if (reduces(pn)) {
      var times = function (list) { return list.map(function (t) { var c = Net.merge([t])[0]; c.n = t.n * pn.net.k; return c; }); };
      wrongs[1] = { t: Net.sideText(times(pn.net.left)) + ' → ' + Net.sideText(times(pn.net.right)) };
    }
    var q3 = shuffled({ t: Net.netText(pn) }, wrongs, 'Write the complete ionic equation, strike out the spectators (' + Net.spectText(pn) + ') and write what is left in lowest terms: ' + Net.netText(pn));
    q3.id = 'net-' + pn.id; q3.kind = 'net'; q3.pic = { before: pn.l };
    q3.stem = 'Solutions of ' + Net.name(pn.l[0]) + ', ' + Net.pretty(pn.l[0]) + ', and ' + Net.name(pn.l[1]) + ', ' + Net.pretty(pn.l[1]) + ', are mixed. What is the net ionic equation?';
    qs.push(q3);

    /* 4. What happens? */
    var kind = ['solid', 'water', 'none'][Math.floor(rand() * 3)];
    var pw = fresh(P[kind].filter(function (p) { return p.id !== pn.id && p.id !== ps.id; }))[0];
    var C = { solid: { t: 'A solid forms' }, water: { t: 'Water, HOH, forms' }, none: { t: 'No reaction: every ion stays in the solution' }, both: { t: 'A solid and water both form' } };
    var q4 = shuffled(C[kind], ['solid', 'water', 'none', 'both'].filter(function (k) { return k !== kind; }).map(function (k) { return C[k]; }), Net.why(pw));
    q4.id = 'what-' + pw.id; q4.kind = 'what'; q4.pic = { before: pw.l };
    q4.stem = 'Solutions of ' + Net.name(pw.l[0]) + ', ' + Net.pretty(pw.l[0]) + ', and ' + Net.name(pw.l[1]) + ', ' + Net.pretty(pw.l[1]) + ', are mixed. What happens?';
    qs.push(q4);
    return qs;
  }

  return { COUNT: COUNT, QUIZ: QUIZ, RUNGS: RUNGS, LESSON: LESSON, SEEN: SEEN, CHALLENGE: CHALLENGE, REACTANTS: REACTANTS, key: key,
           allowed: allowed, pools: pools, set: set, quiz: quiz, reduces: reduces };
})();

if (typeof module !== 'undefined') module.exports = Gen;

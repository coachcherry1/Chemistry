/* app.js: the steps, their order, saving, scoring, and the pieces every
 * step is built from. The steps themselves are drawn by steps1.js (Parts 1
 * and 2), steps2.js (Parts 3 and 4) and steps3.js (Part 5).
 *
 * Part 1  Who's who: substrate, leaving group, α and β carbons, the function
 *         of the reagent
 * Part 2  Substitution: SN2 (back-side attack, inversion), SN1 (the
 *         carbocation, either face), carbocation rearrangements
 * Part 3  Elimination: E2 (anti-coplanar; regioselective, stereoselective,
 *         stereospecific), E1
 * Part 4  E2 in rings: trans-diaxial, regiospecific, locked chairs
 * Part 5  Predicting the products: Klein's three steps
 *
 * Only the five checkpoints are graded (first answer counts). Arrows,
 * sorts, predictions and builds must be finished to move on but are never
 * scored: a wrong one gets an explanation and another try.
 */

var App = (function () {
  'use strict';

  /* Bump whenever the step list, a quiz pool or a molecule changes: a save
     from an older build is then discarded and the student starts fresh. */
  var SCHEMA = 1;

  var PARTS = [
    { n: 1, name: 'Who’s who' },
    { n: 2, name: 'Substitution' },
    { n: 3, name: 'Elimination' },
    { n: 4, name: 'E2 in rings' },
    { n: 5, name: 'Predicting products' },
    { n: 6, name: 'Results' }
  ];

  var STEPS = [
    { id: 'players', part: 1, kind: 'players', title: 'Substitution or elimination?',
      mols: ['bromomethane', 'bromobutane1', 'bromopentane2', 'ccmb'],
      text: 'In substitution, a nucleophile replaces the leaving group. In elimination, a base removes a proton and the ' +
            'leaving group leaves, making a C=C bond. Predict first.' },
    { id: 'function', part: 1, kind: 'sortfn', title: 'The function of the reagent',
      text: 'Klein’s first step: decide what the reagent can do. Sort every reagent into its group. Na⁺ and K⁺ are ' +
            'spectator ions: the function belongs to the anion.' },
    { id: 'quiz-A', part: 1, kind: 'quiz', quiz: 'A', title: 'Checkpoint 1', text: '' },

    { id: 'sn2arrows', part: 2, kind: 'arrows', mech: 'sn2', title: 'SN2: draw the arrows',
      text: 'SN2 is concerted: nucleophilic attack and loss of the leaving group happen in one step. Draw both curved ' +
            'arrows, from the electrons to where they go.' },
    { id: 'backside', part: 2, kind: 'backside', title: 'Back-side attack', mol: 'bbR', ring: 'cisBrMe',
      text: 'Predict, then drag the slider (or press Play) to run the reaction. Turn the 3D model by dragging it.' },
    { id: 'sterics', part: 2, kind: 'sterics', title: 'Crowding the back side',
      mols: ['bromomethane', 'bromopropane1', 'bromopropane2', 'tBuBr'],
      text: 'The nucleophile must reach the back side of the α carbon. Predict, then send HS⁻ in toward each substrate.' },
    { id: 'sn1arrows', part: 2, kind: 'sn1steps', title: 'SN1, step by step', mol: 'tBuBr',
      text: 'In ethanol, a 3° substrate reacts in steps. Draw the arrows for each step; the energy diagram follows.' },
    { id: 'sn1stereo', part: 2, kind: 'sn1stereo', title: 'Either face', mol: 'bmhR',
      text: 'The carbocation is flat. Predict, run the first step, then let ethanol attack from each face.' },
    { id: 'shift', part: 2, kind: 'shift', title: 'Carbocation rearrangements', mols: ['b3mb', 'b22dmb'],
      text: 'A carbocation can rearrange to a more stable one before the nucleophile arrives. Predict, then draw the ' +
            'arrow for the shift.' },
    { id: 'quiz-B', part: 2, kind: 'quiz', quiz: 'B', title: 'Checkpoint 2', text: '' },

    { id: 'e2arrows', part: 3, kind: 'arrows', mech: 'e2', title: 'E2: draw the arrows',
      text: 'E2 is concerted: proton transfer and loss of the leaving group happen in one step. Draw all three curved arrows.' },
    { id: 'anti', part: 3, kind: 'newman', mode: 'anti', mol: 'bmb', title: 'Anti-coplanar',
      text: 'Predict, then turn the back carbon until an H is anti-coplanar to the Br. Then eliminate.' },
    { id: 'regio', part: 3, kind: 'regio', mols: ['ccmh', 'bmb'], title: 'Regioselective: Zaitsev or Hofmann',
      text: 'Klein’s four steps for the regiochemistry of an E2. Work through them in order.' },
    { id: 'stereosel', part: 3, kind: 'newman', mode: 'selective', mol: 'bp3', title: 'Stereoselective',
      text: 'The β carbon of 3-bromopentane has two H atoms. Turn the back carbon to put each one anti-coplanar to the ' +
            'Br, and eliminate from both.' },
    { id: 'stereospec', part: 3, kind: 'newman', mode: 'specific', mols: ['bmpRR', 'bmpRS'], title: 'Stereospecific',
      text: 'Here the β carbon (C3) has only one H. Turn the back carbon until it is anti-coplanar to the Br, and eliminate.' },
    { id: 'e1', part: 3, kind: 'e1', mol: 'bmb', title: 'E1',
      text: 'In ethanol, a 3° substrate also eliminates, in two steps. Predict, then draw the arrows for each step.' },
    { id: 'quiz-C', part: 3, kind: 'quiz', quiz: 'C', title: 'Checkpoint 3', text: '' },

    { id: 'ringanti', part: 4, kind: 'ringanti', mol: 'chloroch', title: 'Anti-coplanar in a chair',
      text: 'On a ring, anti-coplanar means trans-diaxial: the leaving group and the H both axial, on opposite faces. ' +
            'Predict, then find the H atoms that can leave.' },
    { id: 'ringregio', part: 4, kind: 'ringregio', mols: ['cisClMe', 'transClMe'], title: 'Which H can leave?',
      text: 'For each ring: flip it until the Cl is axial, click every H that is anti-coplanar to the Cl, then predict the products.' },
    { id: 'locked', part: 4, kind: 'locked', mols: ['cisBrTb', 'transBrTb'], title: 'Locked chairs',
      text: 'A tert-butyl group is far too big to sit axial. Predict, then flip each ring and compare.' },
    { id: 'sortsel', part: 4, kind: 'sortsel', title: 'Selective or specific?',
      text: 'Sort each reaction by what it shows: a regiochemical or a stereochemical outcome, a preference or the only possible product.' },
    { id: 'quiz-D', part: 4, kind: 'quiz', quiz: 'D', title: 'Checkpoint 4', text: '' },

    { id: 'table', part: 5, kind: 'table', title: 'Klein’s decision table',
      text: 'Klein’s second step: the substrate decides which mechanisms are possible. Fill in the table: choose a ' +
            'result, then a cell (or drag it there).' },
    { id: 'predict', part: 5, kind: 'predict', title: 'Predict the products',
      problems: [['cpR', 'NaOEt'], ['bromobutane1', 'NaOMe'], ['bromobutane1', 'tBuOK'], ['bbR', 'NaCN'], ['bmb', 'EtOH']],
      text: 'Klein’s three steps for each problem: the function of the reagent, the mechanism, then the products.' },
    { id: 'quiz-E', part: 5, kind: 'quiz', quiz: 'E', title: 'Checkpoint 5', text: '' },

    { id: 'results', part: 6, kind: 'results', title: 'Results', text: '' }
  ];

  /* Every prediction the steps ask, with its key: the choice the model says
     is right. Predictions are never graded; tools/validate.js checks every
     key against the model. */
  var PREDICT = {
    bond: { q: 'SN1, SN2, E1 and E2 all happen to an alkyl halide. Which bond breaks in every one of them?',
      choices: ['The bond from carbon to the leaving group', 'A C–H bond', 'A C–C bond'], answer: 0 },
    base: { q: 'Which is the stronger base: HO⁻ or I⁻?', choices: ['HO⁻', 'I⁻', 'They are equally strong'], answer: 0, compact: true },
    backside: { q: 'Where does HS⁻ attack the α carbon of 2-bromobutane?',
      choices: ['From the back side, opposite the Br', 'From the front, on the same side as the Br', 'From either side, equally'], answer: 0 },
    ringsn2: { q: 'cis-1-Bromo-4-methylcyclohexane reacts with NaSH by SN2. Is the product cis or trans?',
      choices: ['Trans', 'Cis', 'A mixture of cis and trans'], answer: 0, compact: true },
    fastest: { q: 'Which of these reacts fastest by SN2?',
      choices: ['Bromomethane', '1-Bromopropane (1°)', '2-Bromopropane (2°)', '2-Bromo-2-methylpropane (3°)'], answer: 0 },
    flat: { q: 'The carbocation is flat. Ethanol attacks it. What do you get from (R)-3-bromo-3-methylhexane?',
      choices: ['Both configurations, in equal amounts: a racemic mixture', 'Only inversion of configuration, as in SN2',
                'Only retention: ethanol takes the place the Br left'], answer: 0 },
    shift: { q: 'The 2° carbocation from 2-bromo-3-methylbutane sits next to a carbon carrying an H and two CH₃ groups. What happens before ethanol attacks?',
      choices: ['A hydride shift makes a 3° carbocation', 'Nothing: ethanol attacks the 2° carbocation', 'A methyl shift makes a 3° carbocation'], answer: 0 },
    e2rds: { q: 'In the E2 of 2-bromo-2-methylpropane, how many steps are there?', choices: ['One', 'Two', 'Three'], answer: 0, compact: true },
    anti: { q: 'For E2, where must the H being removed sit, compared with the leaving group?',
      choices: ['Anti-coplanar: opposite it, in the same plane', 'Syn-coplanar: on the same side, eclipsed', 'Anywhere on a β carbon'], answer: 0 },
    selective: { q: 'You made (E)- and (Z)-pent-2-ene. Which one is the major product?',
      choices: ['(E)-pent-2-ene', '(Z)-pent-2-ene', 'Equal amounts of each'], answer: 0 },
    specific: { q: '(2R,3S)-2-Bromo-3-methylpentane is a diastereomer of the one you just used. Does its E2 give the same alkene?',
      choices: ['No: it gives the other stereoisomer', 'Yes: the same alkene', 'Both stereoisomers, in equal amounts'], answer: 0 },
    e1major: { q: '2-Bromo-2-methylbutane in ethanol. Ethanol can attack the carbocation or take one of its β H atoms. Which product is major?',
      choices: ['The SN1 product, 2-ethoxy-2-methylbutane', 'The E1 product, 2-methylbut-2-ene', 'Equal amounts of each'], answer: 0 },
    ringanti: { q: 'In this chair the Cl is axial, pointing up. Which H on C2 is anti-coplanar to it?',
      choices: ['The axial H, pointing down', 'The equatorial H', 'Neither of them'], answer: 0 },
    locked: { q: 'Which reacts much faster by E2 with NaOEt?',
      choices: ['cis-1-Bromo-4-tert-butylcyclohexane', 'trans-1-Bromo-4-tert-butylcyclohexane', 'Both react equally fast'], answer: 0 },
    k718: { q: 'Klein problem 7.18: which of these undergoes E2 more rapidly?',
      choices: ['trans-1-tert-Butyl-3-chlorocyclohexane', 'cis-1-tert-Butyl-3-chlorocyclohexane'], answer: 0 }
  };

  var QZ = QUIZZES;
  var GRADED = Object.keys(QZ).reduce(function (s, k) { return s + QZ[k].draw; }, 0);

  var el = {};
  var state = null;
  var ctl = null;
  var preview = false;
  var RENDER = {};
  var reduceMotion = Viewer3D.reduceMotion;

  /* ---------------------------------------------------------------- helpers */

  function $(id) { return document.getElementById(id); }

  function h(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  function say(text, kind) {
    el.feedback.textContent = text || '';
    el.feedback.className = 'feedback' + (kind ? ' ' + kind : '');
  }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) {
    var x = 2166136261;
    for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  function shuffle(arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function stepIndex(id) {
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === id) return i;
    return -1;
  }

  /* ------------------------------------------------------------------ state */

  function newState() {
    var seed = Math.floor(Math.random() * 1e9);
    var rand = rng(seed);
    var draws = {};
    Object.keys(QZ).forEach(function (k) {
      var Q = QZ[k];
      var core = Q.core.slice();
      var rest = shuffle(Q.pool.map(function (q) { return q.id; }).filter(function (id) { return core.indexOf(id) < 0; }), rand);
      var ids = core.concat(rest.slice(0, Q.draw - core.length));
      draws[k] = Q.pool.map(function (q) { return q.id; }).filter(function (id) { return ids.indexOf(id) >= 0; });
    });
    return { v: SCHEMA, seed: seed, step: 0, max: 0, draws: draws, ans: {}, pick: {}, pr: {}, done: {}, fin: 0, best: 0, att: 1 };
  }

  function restore(saved) {
    if (!saved || !saved.draws || saved.v !== SCHEMA) return null;
    var ok = Object.keys(QZ).every(function (k) {
      return (saved.draws[k] || []).length === QZ[k].draw && saved.draws[k].every(function (id) {
        return QZ[k].pool.some(function (q) { return q.id === id; });
      });
    });
    return ok ? saved : null;
  }

  function persist() { if (!preview) SCORM.saveState(state); }

  function correctCount() {
    return Object.keys(state.ans).reduce(function (s, k) { return s + (state.ans[k] ? 1 : 0); }, 0);
  }
  function attemptPercent() { return 100 * correctCount() / GRADED; }

  /* The gradebook gets the better of this attempt and the best finished
     one, so a new attempt can never lower a student's grade. */
  function reportScore() {
    if (preview) return;
    SCORM.setScore(Math.max(state.best || 0, attemptPercent()));
  }

  function newAttempt() {
    var keep = { best: Math.max(state.best || 0, state.fin ? attemptPercent() : 0), att: (state.att || 1) + 1, max: state.max };
    state = newState();
    state.best = keep.best;
    state.att = keep.att;
    state.max = keep.max;
    persist();
    reportScore();
    goTo(0);
  }

  function nav(name, prop, value) { el[name][prop] = value; el[name + 'Top'][prop] = value; }

  function complete(msg, kind) {
    var s = STEPS[state.step];
    state.done[s.id] = 1;
    if (state.step + 1 > state.max) state.max = state.step + 1;
    persist();
    nav('next', 'disabled', false);
    paintParts();
    if (msg) say(msg, kind || 'good');
  }

  function progress(id) {
    if (!state.pr[id]) state.pr[id] = {};
    return state.pr[id];
  }

  /* --------------------------------------------------------------- chrome */

  function paintParts() {
    el.parts.innerHTML = '';
    var cur = STEPS[state.step].part;
    PARTS.forEach(function (p) {
      var first = -1;
      for (var i = 0; i < STEPS.length; i++) if (STEPS[i].part === p.n) { first = i; break; }
      var open = first <= state.max;
      el.parts.appendChild(h('button', {
        type: 'button', class: 'tab' + (p.n === cur ? ' current' : '') + (open ? '' : ' locked'),
        disabled: !open, 'aria-current': p.n === cur ? 'step' : null,
        onclick: function () { if (open) goTo(first); }
      }, [p.n < 6 ? p.n + '  ' + p.name : p.name]));
    });
    el.score.textContent = 'Checkpoint score: ' + correctCount() + ' / ' + GRADED +
      (state.att > 1 ? '  ·  best ' + Math.round(state.best || 0) + '%' : '');
  }

  function goTo(i) {
    if (i < 0 || i >= STEPS.length || i > state.max) return;
    if (ctl && ctl.destroy) ctl.destroy();
    ctl = null;
    state.step = i;
    persist();
    var s = STEPS[i];
    el.stepTitle.textContent = s.title;
    el.counter.textContent = 'Step ' + (i + 1) + ' of ' + STEPS.length;
    var text = s.kind === 'quiz' ? 'Graded: your first answer to each question counts. Read the explanation after each one.' : s.text;
    el.instructions.textContent = text;
    el.instructions.hidden = !text;
    el.stage.innerHTML = '';
    el.stage.className = 'stage stage-' + s.kind;
    say('');
    nav('next', 'disabled', !(state.done[s.id] || i < state.max));
    nav('next', 'hidden', s.kind === 'results');
    nav('next', 'textContent', STEPS[i + 1] && STEPS[i + 1].kind === 'results' ? 'See results →' : 'Next →');
    nav('back', 'hidden', i === 0);
    paintParts();
    ctl = RENDER[s.kind](s) || null;
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------- shared pieces */

  function panel(title, hint, kids, cls) {
    return h('section', { class: 'panel ' + (cls || '') }, [
      h('div', { class: 'panel-head' }, [h('h3', { text: title }), hint ? h('span', { class: 'hint', text: hint }) : null])
    ].concat(kids || []));
  }

  function showArea(node) {
    try { node.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' }); }
    catch (e) { node.scrollIntoView(false); }
  }

  function predictCard(p, chosen, onPick) {
    var box = h('div', { class: 'predict' }, [
      h('p', { class: 'predict-kicker', text: 'Predict (not graded)' }),
      h('p', { class: 'q-text', text: p.q })
    ]);
    var row = h('div', { class: 'q-choices' + (p.compact ? ' compact' : '') });
    p.choices.forEach(function (c, i) {
      var b = h('button', { type: 'button', class: 'choice' + (chosen === i ? ' picked' : ''), disabled: chosen != null },
        [h('span', { class: 'choice-text', text: c })]);
      b.addEventListener('click', function () { onPick(i); });
      row.appendChild(b);
    });
    box.appendChild(row);
    return box;
  }

  function reveal(lines) {
    return h('div', { class: 'reveal' }, lines.filter(Boolean).map(function (t) { return typeof t === 'string' ? h('p', { text: t }) : t; }));
  }

  function verdict(p, chosen) {
    if (chosen == null) return '';
    return chosen === p.answer ? 'Your prediction was right. ' : 'You predicted “' + p.choices[chosen] + '”. ';
  }

  function chipRow(label, items, cur, isDone, isOpen, onPick) {
    return h('div', { class: 'chips' }, [label ? h('span', { class: 'chips-label', text: label }) : null].concat(items.map(function (it, k) {
      return h('button', { type: 'button', class: 'chip' + (k === cur ? ' current' : '') + (isDone(k) ? ' done' : ''),
        disabled: !isOpen(k), 'aria-pressed': k === cur ? 'true' : 'false',
        onclick: function () { onPick(k); } }, [(isDone(k) ? '✓ ' : '') + it]);
    })));
  }

  /* A carbon by its locant, or, off the parent chain, by where it hangs:
     "C2", or "the CH₃ on C2". */
  function carbonName(m, i) {
    var num = Name.numbers(m);
    if (num[i]) return 'C' + num[i];
    var on = m.carbonsOn(i).filter(function (x) { return num[x.j]; })[0];
    return 'the ' + Draw.groupText(m, on ? on.j : -1, i) + (on ? ' on C' + num[on.j] : '');
  }
  function capFirst(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  function def(term, text) { return h('p', { class: 'def' }, [h('b', { text: term + ': ' }), text]); }

  /* A molecule's bond-line formula with its name underneath. */
  function molCard(m, opts) {
    opts = opts || {};
    var nm = opts.name != null ? opts.name : molName(m);
    var svg = Draw.mol(m, Object.assign({ label: 'Bond-line formula of ' + nm }, opts.draw || {}));
    return h('figure', { class: 'mol-card' + (opts.cls ? ' ' + opts.cls : '') }, [svg,
      h('figcaption', null, [h('span', { class: 'name', text: nm }), opts.note ? h('span', { class: 'muted', text: ' ' + opts.note }) : null])]);
  }

  /* substrate + reagent → products (any of them may be left out) */
  function rxn(sub, reagentText, products, o) {
    o = o || {};
    var kids = [molCard(sub, { draw: o.subDraw })];
    var arrow = h('div', { class: 'yields' }, [h('span', { class: 'reagent-text', text: reagentText })]);
    kids.push(arrow);
    (products || []).forEach(function (p, i) {
      if (i) kids.push(h('span', { class: 'plus', text: '+' }));
      kids.push(p.nodeType ? p : molCard(p));
    });
    return h('div', { class: 'rxn' }, kids);
  }

  /* A progress slider with a Play button. onInput(p) for every move. */
  function slider(onInput, o) {
    o = o || {};
    var range = h('input', { type: 'range', min: 0, max: 100, value: Math.round((o.p || 0) * 100), class: 'prog-range',
      'aria-label': o.label || 'Reaction progress' });
    var play = h('button', { type: 'button', class: 'mini play', text: '▶ Play' });
    var anim = null;
    range.addEventListener('input', function () { stop(); onInput(+range.value / 100); });
    function stop() { if (anim) { cancelAnimationFrame(anim); anim = null; play.textContent = '▶ Play'; } }
    play.addEventListener('click', function () {
      if (anim) { stop(); return; }
      if (+range.value >= 100) range.value = 0;
      if (reduceMotion) {
        /* no motion: five still frames, one per press */
        var next = Math.min(100, (Math.floor(+range.value / 25) + 1) * 25);
        range.value = next; onInput(next / 100); return;
      }
      var start = null, from = +range.value, dur = o.ms || 3200;
      play.textContent = '❚❚ Pause';
      function step(ts) {
        if (start == null) start = ts;
        var v = Math.min(100, from + (ts - start) / dur * 100);
        range.value = v;
        onInput(v / 100);
        if (v < 100) anim = requestAnimationFrame(step); else stop();
      }
      anim = requestAnimationFrame(step);
    });
    var node = h('div', { class: 'range-row' }, [h('span', { text: o.from || 'Reactants' }), range, h('span', { text: o.to || 'Products' }), play]);
    return { node: node, set: function (p) { range.value = Math.round(p * 100); onInput(p); }, value: function () { return +range.value / 100; },
             stop: stop, range: range, play: play };
  }

  /* A 3D viewer in a panel. */
  function viewerBox(opts) {
    opts = opts || {};
    var canvas = h('canvas', { class: 'c3d', tabindex: 0, 'aria-label': opts.label || '3D model. Drag or use the arrow keys to turn it.' });
    var wrap = h('div', { class: 'c3d-wrap' }, [canvas]);
    var v = null;
    return {
      node: wrap,
      start: function () { v = new Viewer3D(canvas, { radius: opts.radius || 4.2, span: opts.span, R: opts.R, center: opts.center, ortho: opts.ortho }); return v; },
      viewer: function () { return v; }
    };
  }

  /* An energy diagram that can be redrawn at a new progress. */
  function energyBox(points, o) {
    o = o || {};
    var host = h('div', { class: 'graph-host' });
    function draw(p, upto) {
      host.innerHTML = '';
      host.appendChild(Draw.energy(points, { marker: p, upto: upto, bands: o.bands, label: o.label }));
    }
    draw(o.p == null ? 0 : o.p, o.upto);
    return { node: host, draw: draw };
  }

  /* An arrow-drawing exercise on one mechanism scene. done() is called once
     the arrows are right (now or on a revisit). */
  function arrowBox(scene, pr, key, done, o) {
    o = o || {};
    var tool = Arrows.Tool(scene, { say: say, onCheck: check });
    var legend = h('ol', { class: 'pattern-list', hidden: true });
    var help = h('button', { type: 'button', class: 'ghostbtn', text: 'Show me', hidden: true });
    var node = h('div', null, [tool.node, h('div', { class: 'btnrow' }, [help]), legend]);
    function finish(fresh) {
      tool.done();
      legend.innerHTML = '';
      tool.legend().forEach(function (t) { legend.appendChild(h('li', { text: t.replace(/^\d+\s+/, '') })); });
      legend.hidden = false;
      help.hidden = true;
      if (done) done(fresh);
    }
    function check(r) {
      if (r.ok) {
        pr[key] = 1; persist();
        say(r.msg, 'good');
        finish(true);
        return;
      }
      pr[key + 'm'] = (pr[key + 'm'] || 0) + 1;
      persist();
      say(r.msg, 'bad');
      if (pr[key + 'm'] >= (o.misses || 3)) help.hidden = false;
    }
    help.addEventListener('click', function () {
      tool.show(true);
      pr[key] = 1; persist();
      say('These are the arrows. Each one is numbered; the list underneath names its pattern.', '');
      finish(true);
    });
    if (pr[key]) { tool.show(true); finish(false); }
    else if (pr[key + 'm'] >= (o.misses || 3)) help.hidden = false;
    return { node: node, tool: tool };
  }

  /* Choice buttons that stay on screen once answered (ungraded). */
  function choiceRow(options, answer, chosen, onPick, why) {
    var row = h('div', { class: 'choice-row' });
    options.forEach(function (t, i) {
      var b = h('button', { type: 'button', class: 'ghostbtn' + (chosen != null && i === answer && chosen === answer ? ' right' : '') +
        (chosen === i && i !== answer ? ' wrong' : ''), text: t, disabled: chosen === answer });
      b.addEventListener('click', function () { onPick(i); });
      row.appendChild(b);
    });
    return row;
  }

  /* ------------------------------------------------------------- figures */

  /* Question figures: { mol: id } a bond-line formula; { rxn: [id, reagent] }
     a reaction; { mech: name, arrows: 'right' | a wrong set } a mechanism
     with arrows; { pair: [fig, fig], captions }; { smiles } or { ring }.
     A choice can be a figure too. */
  function figMol(spec) {
    if (spec.mol) return mol(spec.mol);
    if (spec.smiles) return Mol.parse(spec.smiles);
    if (spec.ring) return Mol.fromRing(spec.ring, spec.ene);
    if (spec.product) return productOf(spec.product);
    return null;
  }

  /* A product by role from React.predict: { of: [id, reagent], pick: n } */
  function productOf(p) {
    var r = React.predict(mol(p.of[0]), p.of[1]);
    var x = r.products[p.pick];
    return x.mol;
  }

  function figure(spec, cls) {
    if (spec.pair) {
      return h('div', { class: 'pair-row' }, spec.pair.map(function (p, i) {
        return h('figure', null, [figure(p, cls), h('figcaption', { text: (spec.captions || [])[i] || '' })]);
      }));
    }
    if (spec.rxn) {
      var sub = mol(spec.rxn[0]);
      return h('div', { class: 'rxn fig-rxn' }, [molCard(sub), h('div', { class: 'yields' }, [h('span', { class: 'reagent-text', text: React.REAGENTS[spec.rxn[1]].text })])]);
    }
    if (spec.mech) {
      var sc = MECHFIG[spec.mech]();
      var arrows = spec.arrows || 'right';
      var list = arrows === 'right' ? sc.arrows.map(function (a) { return { from: a.from[0], to: a.to[0] }; }) : sc.wrongSets[arrows];
      return Arrows.figure(sc, list, { label: spec.label });
    }
    if (spec.text) return h('div', { class: 'fig-text', text: spec.text });
    var m = figMol(spec);
    var nm = spec.noName ? '' : molName(m);
    var s = Draw.mol(m, { label: 'Bond-line formula' + (nm ? ' of ' + nm : ''), numbers: spec.numbers, cls: cls });
    if (spec.noName) return s;
    return h('figure', { class: 'mol-card' }, [s, h('figcaption', { class: 'name', text: nm })]);
  }

  function figureText(spec) {
    if (spec.pair) return spec.pair.map(figureText).join(' Beside it: ');
    if (spec.text) return spec.text;
    if (spec.mech) return spec.label || 'a mechanism with curved arrows';
    var m = figMol(spec);
    return m ? 'the bond-line formula of ' + molName(m) : '';
  }

  /* The mechanisms questions show, with their right arrows and the usual
     wrong ones. */
  var MECHFIG = {
    sn2: function () {
      var sc = Mech.sn2(mol('bbR'), 'NaSH'), K = Mech.keys, L = React.lg(sc.species[1].mol);
      var r = sc.arrows;
      sc.wrongSets = {
        reversed: [{ from: K.ak(1, L.a), to: K.lk(0, sc.arrows[0].from[0].split(':')[2] * 1) }, { from: r[1].from[0], to: r[1].to[0] }],
        noLG: [{ from: r[0].from[0], to: r[0].to[0] }],
        toBr: [{ from: r[0].from[0], to: K.ak(1, L.x) }, { from: r[1].from[0], to: r[1].to[0] }]
      };
      return sc;
    },
    e2: function () {
      var sc = Mech.e2(mol('tBuBr'), 'NaOEt'), K = Mech.keys, L = React.lg(sc.species[0].mol);
      var r = sc.arrows;
      sc.wrongSets = {
        toC: [{ from: r[0].from[0], to: K.ak(0, L.a) }, { from: r[2].from[0], to: r[2].to[0] }],
        noPi: [{ from: r[0].from[0], to: r[0].to[0] }, { from: r[2].from[0], to: r[2].to[0] }],
        lgWrong: [{ from: r[0].from[0], to: r[0].to[0] }, { from: r[1].from[0], to: r[1].to[0] }, { from: r[2].from[0], to: K.ak(0, L.a) }]
      };
      return sc;
    },
    sn1loss: function () {
      var sc = Mech.loss(mol('tBuBr')), K = Mech.keys, L = React.lg(sc.species[0].mol);
      sc.wrongSets = { toC: [{ from: sc.arrows[0].from[0], to: K.ak(0, L.a) }] };
      return sc;
    },
    shiftH: function () {
      var c = React.cation(mol('b3mb'));
      var sc = Mech.shift(c, c.plus, React.bestShift(c, c.plus));
      sc.wrongSets = {
        away: [{ from: sc.arrows[0].from[0], to: Mech.keys.ak(0, React.bestShift(c, c.plus).from) }],
        fromC: [{ from: Mech.keys.ak(0, c.plus), to: Mech.keys.ak(0, sc.h) }]
      };
      return sc;
    }
  };

  /* ------------------------------------------------------------- quizzes */

  function question(id) {
    for (var k in QZ) {
      var pool = QZ[k].pool;
      for (var i = 0; i < pool.length; i++) if (pool[i].id === id) return pool[i];
    }
    return null;
  }

  RENDER.quiz = function (s) {
    var Q = QZ[s.quiz];
    var ids = state.draws[s.quiz];
    var box = h('div', { class: 'quiz' });
    el.stage.appendChild(h('div', { class: 'quiz-grid single' }, [panel(Q.title, null, [box])]));

    function summary() {
      box.innerHTML = '';
      var right = ids.filter(function (id) { return state.ans[id]; }).length;
      box.appendChild(h('p', { class: 'q-summary', text: 'You answered ' + right + ' of ' + ids.length + ' correctly on the first try.' }));
      var ul = h('ul', { class: 'q-review' });
      ids.forEach(function (id) {
        var q = question(id);
        ul.appendChild(h('li', { class: state.ans[id] ? 'right' : 'wrong' }, [
          h('span', { class: 'mark', 'aria-hidden': 'true', text: state.ans[id] ? '✓' : '✗' }),
          h('span', { class: 'sr', text: state.ans[id] ? 'Correct: ' : 'Incorrect: ' }),
          q.q
        ]));
      });
      box.appendChild(ul);
      if (!state.done[s.id]) complete('Checkpoint finished: ' + right + ' / ' + ids.length + '.', 'good');
      else say('Checkpoint finished: ' + right + ' / ' + ids.length + '.', 'good');
    }

    function ask(n) {
      var id = ids[n];
      if (id == null) { summary(); return; }
      if (state.ans[id] != null) { ask(n + 1); return; }
      var q = question(id);
      var order = shuffle(q.choices.map(function (c, i) { return i; }), rng(state.seed ^ hash(id)));
      box.innerHTML = '';
      box.setAttribute('data-qid', id);
      say('');
      box.appendChild(h('p', { class: 'q-count', text: 'Question ' + (n + 1) + ' of ' + ids.length }));
      box.appendChild(h('p', { class: 'q-text', text: q.q }));
      if (q.fig) box.appendChild(h('div', { class: 'q-fig' }, [figure(q.fig)]));
      var figs = typeof q.choices[0] !== 'string';
      var row = h('div', { class: 'q-choices' + (figs ? ' figs' : q.compact ? ' compact' : '') });
      var why = h('p', { class: 'q-why', hidden: true });
      var next = h('button', { type: 'button', class: 'primary', hidden: true, text: n + 1 < ids.length ? 'Next question →' : 'Finish checkpoint' });
      order.forEach(function (ci, pos) {
        var c = q.choices[ci];
        var letter = String.fromCharCode(65 + pos);
        var b = h('button', { type: 'button', class: 'choice', 'data-choice': ci }, [
          h('span', { class: 'choice-letter', text: letter }),
          typeof c === 'string' ? h('span', { class: 'choice-text', text: c }) : figure(Object.assign({ noName: c.noName }, c), 'choice-fig')
        ]);
        if (typeof c !== 'string') b.setAttribute('aria-label', 'Choice ' + letter + ': ' + figureText(c));
        b.addEventListener('click', function () { answer(ci); });
        row.appendChild(b);
      });
      box.appendChild(row);
      box.appendChild(why);
      box.appendChild(h('div', { class: 'btnrow' }, [next]));

      function answer(ci) {
        if (state.ans[id] != null) return;
        var right = ci === 0;
        state.ans[id] = right ? 1 : 0;
        state.pick[id] = ci;
        persist();
        reportScore();
        if (!preview) SCORM.recordAnswer(id, String.fromCharCode(97 + ci), 'a', right);
        var nodes = row.querySelectorAll('.choice');
        for (var i = 0; i < nodes.length; i++) {
          var c = +nodes[i].getAttribute('data-choice');
          nodes[i].disabled = true;
          if (c === 0) nodes[i].classList.add('right');
          else if (c === ci) nodes[i].classList.add('wrong');
        }
        why.hidden = false;
        why.textContent = q.why;
        say(right ? 'Correct.' : 'Not quite. The correct answer is highlighted.', right ? 'good' : 'bad');
        paintParts();
        next.hidden = false;
        next.focus({ preventScroll: true });
      }
      next.addEventListener('click', function () { ask(n + 1); });
    }
    ask(0);
  };

  /* ---------------------------------------------------------------- results */

  var BIG_IDEAS = [
    'Klein’s three steps: the function of the reagent, then the substrate (methyl, 1°, 2°, 3°), then the regiochemistry and stereochemistry of the products.',
    'SN2 is concerted: nucleophilic attack and loss of the leaving group in one step, by back-side attack, with inversion of configuration. Crowding stops it at a 3° carbon.',
    'SN1 goes through a flat carbocation: loss of the leaving group, then nucleophilic attack from either face (and a proton transfer for a neutral nucleophile). A carbocation can rearrange first.',
    'E2 is concerted: proton transfer and loss of the leaving group in one step. The H and the leaving group must be anti-coplanar; on a ring, trans-diaxial.',
    'Regioselective: one regiochemical product is major (Zaitsev with an ordinary base, Hofmann with t-BuOK). Regiospecific: only one can form.',
    'Stereoselective: one stereoisomer is major (the β carbon has two H atoms). Stereospecific: the substrate’s configuration decides the only stereoisomer (one H; and SN2).',
    'E1 goes through the same carbocation as SN1 and gives the Zaitsev product. A chair locked by a tert-butyl group with the leaving group equatorial can hardly do E2 at all.'
  ];

  RENDER.results = function () {
    if (!state.fin) {
      state.fin = 1;
      state.done.results = 1;
      state.best = Math.max(state.best || 0, attemptPercent());
      persist();
      if (!preview) { reportScore(); SCORM.markComplete(); }
      paintParts();
    }
    var right = correctCount();
    var pct = Math.round(100 * right / GRADED);
    var best = Math.round(state.best || 0);
    var rows = Object.keys(QZ).map(function (k) {
      var ids = state.draws[k];
      var r = ids.filter(function (id) { return state.ans[id]; }).length;
      return h('tr', null, [h('td', { text: QZ[k].title }), h('td', { class: 'num', text: r + ' / ' + ids.length })]);
    });
    var box = panel(state.att > 1 ? 'Attempt ' + state.att : 'Your score', null, [
      h('p', { class: 'big-score', text: right + ' / ' + GRADED + '  (' + pct + '%)' }),
      h('table', { class: 'ref-table' }, rows),
      state.att > 1 ? h('p', { class: 'best-line', text: 'Best attempt: ' + best + '%' + (best > pct ? '. That is the score the gradebook keeps.' : '') }) : null,
      h('p', { class: 'muted', text: SCORM.isConnected()
        ? 'Your ' + (state.att > 1 ? 'best ' : '') + 'score has been sent to the gradebook and the activity is marked complete.'
        : 'Standalone mode: nothing was sent to a gradebook.' })
    ]);
    var ideas = panel('Big ideas', null, [h('ul', { class: 'keylist' }, BIG_IDEAS.map(function (t) { return h('li', { text: t }); }))]);
    el.stage.appendChild(h('div', { class: 'grid2' }, [box, ideas]));
    var again = h('button', { type: 'button', class: 'primary', text: 'Start a new attempt' });
    var sure = h('div', { class: 'confirm', hidden: true }, [
      h('p', { text: 'This clears all your answers, arrows and predictions and gives you a new set of checkpoint questions. ' +
                     'Your best score so far (' + Math.max(best, pct) + '%) stays in the gradebook.' }),
      h('div', { class: 'btnrow' }, [
        h('button', { type: 'button', class: 'primary', text: 'Yes, start again', onclick: newAttempt }),
        h('button', { type: 'button', class: 'ghostbtn', text: 'Cancel', onclick: function () { sure.hidden = true; again.hidden = false; again.focus(); } })
      ])
    ]);
    again.addEventListener('click', function () { again.hidden = true; sure.hidden = false; sure.querySelector('.primary').focus(); });
    el.stage.appendChild(panel('Try it again?', null, [
      h('p', { class: 'muted', text: 'You can redo the whole activity with new checkpoint questions. Parts you have already ' +
                                     'reached stay open, so you can jump straight to any of them.' }),
      h('div', { class: 'btnrow' }, [again]),
      sure
    ]));
    say('Activity complete.', 'good');
  };

  /* --------------------------------------------------------- references */

  var VOCAB = [
    ['Substrate', 'The compound the reagent attacks: here an alkyl halide.'],
    ['Leaving group', 'The group that leaves with the pair of electrons from its bond to carbon: here a halide.'],
    ['α carbon, β carbon', 'The α carbon carries the leaving group. A β carbon is bonded to the α carbon.'],
    ['Nucleophile', 'Attacks a carbon with a lone pair. Strong when it is negatively charged or large and polarizable.'],
    ['Base', 'Removes a proton. Strong when its conjugate acid is weak.'],
    ['Sterically hindered', 'Crowded. A hindered base (t-BuO⁻, DBU) reaches an H more easily than a carbon.'],
    ['Concerted', 'All in one step: SN2 and E2.'],
    ['Back-side attack', 'In SN2 the nucleophile attacks the side of the α carbon opposite the leaving group.'],
    ['Inversion of configuration', 'The three other groups turn inside out, like an umbrella in the wind. SN2 always inverts.'],
    ['Carbocation', 'A carbon with only three bonds and a positive charge: flat, with an empty p orbital. 3° is more stable than 2°, 2° than 1°.'],
    ['Carbocation rearrangement', 'An H (hydride shift) or a CH₃ (methyl shift) moves with its bonding electrons to the next carbon, making a more stable carbocation.'],
    ['Solvolysis', 'Substitution in which the solvent (water, an alcohol) is the nucleophile.'],
    ['Racemic mixture', 'Equal amounts of a pair of enantiomers, from attack on both faces of a flat carbocation.'],
    ['Anti-coplanar', 'The H and the leaving group on opposite sides of the C–C bond, in one plane (staggered). Syn-coplanar is the same side (eclipsed).'],
    ['Trans-diaxial', 'Anti-coplanar on a ring: the leaving group and the H both axial, on opposite faces.'],
    ['Zaitsev product', 'The more substituted alkene. Major with an ordinary base.'],
    ['Hofmann product', 'The less substituted alkene. Major with a sterically hindered base such as t-BuOK.'],
    ['Regioselective', 'More than one regiochemical product can form, and one of them is major.'],
    ['Regiospecific', 'Only one regiochemical product can form: in a ring, only one β H is anti-coplanar to the leaving group.'],
    ['Stereoselective', 'Two stereoisomers can form and one is major: the β carbon has two H atoms, and the larger groups end up trans.'],
    ['Stereospecific', 'The configuration of the substrate decides which single stereoisomer forms: E2 from a β carbon with one H, and every SN2.'],
    ['Locked chair', 'A ring held in one chair by a group too big to be axial (tert-butyl). If that chair has the leaving group equatorial, E2 is drastically slower.']
  ];

  function buildReference() {
    var mechs = [
      ['SN2', 'One step: nucleophilic attack and loss of the leaving group together (concerted). Back-side attack, inversion of configuration. Methyl > 1° > 2°; never 3°.'],
      ['SN1', 'Loss of the leaving group (the slow step), then nucleophilic attack on the carbocation from either face, then a proton transfer if the nucleophile was neutral. 3°; watch for rearrangements.'],
      ['E2', 'One step: proton transfer and loss of the leaving group together (concerted). The H and the leaving group anti-coplanar.'],
      ['E1', 'Loss of the leaving group, then a proton transfer from a β carbon of the carbocation. 3°; the Zaitsev product.']
    ];
    var dl = h('dl', { class: 'vocab' });
    mechs.forEach(function (p) { dl.appendChild(h('dt', { text: p[0] })); dl.appendChild(h('dd', { text: p[1] })); });
    el.mechBody.appendChild(dl);
    el.howBody.appendChild(h('ol', { class: 'ref-steps' }, [
      'Determine the function of the reagent: nucleophile only, strong nucleophile and strong base, base only, or weak nucleophile and weak base.',
      'Analyze the substrate (methyl, 1°, 2° or 3°) and decide which mechanisms are possible, as in Klein’s table.',
      'Consider the regiochemical and stereochemical requirements, and decide the major and minor products.'
    ].map(function (t) { return h('li', { text: t }); })));
    var dl2 = h('dl', { class: 'vocab' });
    VOCAB.forEach(function (p) { dl2.appendChild(h('dt', { text: p[0] })); dl2.appendChild(h('dd', { text: p[1] })); });
    el.vocabBody.appendChild(dl2);
  }

  /* ------------------------------------------------------------------ boot */

  function showIntro() {
    var box = h('div', { class: 'screen-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'introTitle' }, [
      h('h2', { id: 'introTitle', text: 'SN1, SN2, E1 and E2' }),
      h('p', { text: 'An alkyl halide and a reagent: substitution or elimination, in one step or two? By the end you will ' +
                     'predict the major and minor products the way Klein does, in three steps.' }),
      h('ul', { class: 'screen-list' }, [
        h('li', { text: 'Part 1, Who’s who: the substrate, and the function of the reagent.' }),
        h('li', { text: 'Part 2, Substitution: SN2, SN1 and carbocation rearrangements.' }),
        h('li', { text: 'Part 3, Elimination: E2 and E1; regioselective, stereoselective and stereospecific.' }),
        h('li', { text: 'Part 4, E2 in rings: chairs, trans-diaxial H atoms and locked chairs.' }),
        h('li', { text: 'Part 5, Predicting the products.' })
      ]),
      h('p', { text: 'Arrows, sorts and predictions are never graded, so try things. The five checkpoints are graded: your ' +
                     'first answer to each question counts. About 45 minutes. Your progress is saved if you leave.' }),
      h('p', { class: 'screen-note', text: 'Everything works with a mouse, a touch screen or the keyboard (Tab and Enter; the ' +
                                            'arrow keys turn a 3D model).' })
    ]);
    var go = h('button', { type: 'button', class: 'primary', text: state.max > 0 ? 'Continue where you left off' : 'Start' });
    box.appendChild(go);
    el.screen.innerHTML = '';
    el.screen.appendChild(box);
    el.screen.hidden = false;
    go.addEventListener('click', function () { el.screen.hidden = true; goTo(state.step); });
    go.focus();
  }

  function start() {
    ['parts', 'stepTitle', 'counter', 'instructions', 'stage', 'feedback', 'next', 'back', 'nextTop', 'backTop',
     'score', 'lms', 'screen', 'mechBody', 'howBody', 'vocabBody'].forEach(function (id) { el[id] = $(id); });
    buildReference();

    var connected = SCORM.init();
    el.lms.textContent = connected ? 'Connected to the LMS' : 'Standalone: no LMS detected';
    el.lms.className = 'lms ' + (connected ? 'on' : 'off');

    var params = new URLSearchParams(location.search);
    var jump = params.get('step');
    if (jump != null) {
      preview = true;
      state = newState();
      state.max = STEPS.length - 1;
      var idx = /^\d+$/.test(jump) ? +jump - 1 : stepIndex(jump);
      state.step = Math.max(0, Math.min(STEPS.length - 1, idx < 0 ? 0 : idx));
    } else {
      state = restore(SCORM.loadState()) || newState();
      persist();
    }

    [el.next, el.nextTop].forEach(function (b) { b.addEventListener('click', function () { goTo(state.step + 1); }); });
    [el.back, el.backTop].forEach(function (b) { b.addEventListener('click', function () { goTo(state.step - 1); }); });

    if (preview) { goTo(state.step); return; }
    paintParts();
    showIntro();
  }

  /* Everything the step files need. */
  var U = {
    h: h, say: say, panel: panel, carbonName: carbonName, capFirst: capFirst, predictCard: predictCard, reveal: reveal, verdict: verdict, chipRow: chipRow, def: def,
    molCard: molCard, rxn: rxn, slider: slider, viewerBox: viewerBox, energyBox: energyBox, arrowBox: arrowBox,
    choiceRow: choiceRow, showArea: showArea, shuffle: shuffle, rng: rng, hash: hash, figure: figure,
    complete: complete, progress: progress, persist: persist,
    stage: function () { return el.stage; },
    seed: function () { return state.seed; },
    isDone: function (id) { return !!state.done[id]; },
    reduceMotion: reduceMotion
  };

  return { start: start, SCHEMA: SCHEMA, STEPS: STEPS, GRADED: GRADED, QZ: QZ, PREDICT: PREDICT, RENDER: RENDER, U: U,
           BIG_IDEAS: BIG_IDEAS, VOCAB: VOCAB, figure: figure, MECHFIG: MECHFIG, productOf: productOf };
})();

document.addEventListener('DOMContentLoaded', App.start);

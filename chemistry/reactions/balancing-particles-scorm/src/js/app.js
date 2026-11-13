/* app.js: the steps, their order, saving, scoring.
 *
 * Parts 1 to 4 are the lesson (nothing graded): reading a particle picture,
 * checking that atoms are conserved, balancing on the workbench with the
 * inventory between the boxes, and polyatomic ions: kept together as one row
 * of the inventory when they are on both sides, counted atom by atom when
 * they are not. Part 5 is graded:
 * six choice questions (select, then Submit answer) and ten equations to
 * balance on the workbench, where the first Check counts.
 *
 * With CONFIG.classify (the classifying package, balancing-reaction-types-scorm)
 * the same code gives a different activity: a short recap of the inventory,
 * the six types of reaction, and then reactions that are balanced AND
 * classified together on one workbench. Its graded part is four questions on
 * the types and ten reactions, each worth two items (the coefficients and the
 * type, both judged by the first Check).
 *
 * Score = graded items right the first time / all graded items, sent as
 * cmi.core.score.raw (0 to 100) after every item, with one cmi.interactions
 * record each. Retakes give new questions and equations; the gradebook keeps
 * the best.
 */
var App = (function () {
  'use strict';

  /* Bump whenever the steps, the pools or a reaction change: a save from an
     older release is then discarded. */
  var SCHEMA = 4;

  var h = UI.h;

  var TIPS = [
    'Count every element on both sides first.',
    'Start with an element that is in only one particle on each side.',
    'Leave a lone element (like O₂ or Fe) for last: its coefficient changes nothing else.',
    'An odd number on one side and an even number on the other? Double the odd one.',
    'A polyatomic ion that is on both sides, like SO₄ or NO₃, is counted as one piece.',
    'In a neutralization write water as HOH: a hydroxide and a hydrogen.',
    'Never touch a subscript.'
  ];

  var CL = !!CONFIG.classify;

  var PARTS = ['Reading the picture', 'Is it conserved?', 'Balancing', 'Polyatomic ions', 'Graded', 'Results'];
  var STEPS = [
    { id: 'count', part: 1, kind: 'count', title: 'Subscripts and coefficients',
      text: 'Each picture shows the particles a formula stands for. The big number in front (the coefficient) says how many particles; the small ' +
            'number (the subscript) says how many of that atom are in ONE particle. Count the atoms of each element. Not graded.' },
    { id: 'change', part: 1, kind: 'change', title: 'What may you change?',
      text: 'Hydrogen and oxygen make water, but this picture cannot be right: an oxygen atom is missing from the products. Make a prediction.' },
    { id: 'conserved', part: 2, kind: 'conserved', title: 'Is it conserved?',
      text: 'The law of conservation of mass: in a chemical reaction atoms are not made and not destroyed, only rearranged. So every atom in the ' +
            'reactants box must be in the products box. Four pictures: decide for each.' },
    { id: 'first', part: 3, kind: 'bench', rx: 'water', title: 'Balance it: water',
      text: 'Now fix the water picture. The inventory runs down the middle, under the arrow: atoms in the reactants on its left, atoms in the ' +
            'products on its right. Use + and − (or type) to change the coefficients until every row matches, then Check. Not graded.' },
    { id: 'second', part: 3, kind: 'bench', rx: 'ammonia', title: 'Balance it: ammonia',
      text: 'Nitrogen and hydrogen make ammonia. Watch the inventory and the boxes as you add particles. Not graded.' },
    { id: 'third', part: 3, kind: 'bench', rx: 'methane', title: 'Balance it: burning methane',
      text: 'Four substances this time. Oxygen is in both products, so leave it for last. Not graded.' },
    { id: 'strategy', part: 3, kind: 'bench', rx: 'rust', typed: true, tips: true, title: 'Start the inventory yourself',
      text: 'On paper you write the inventory yourself. Type the count of each element in the reactants (left) and in the products (right) for ' +
            'the equation as it is written. Then balance it: the inventory updates as you go. The tips help. Not graded.' },
    { id: 'ions', part: 4, kind: 'bench', rx: 'acetate', typed: true, title: 'Keep the ion together',
      ask: { q: 'PO₄ and C₂H₃O₂ are polyatomic ions, and each is in the reactants and in the products. Which inventory is quicker to keep?',
        c: [{ t: 'Na, PO₄, Ca, C₂H₃O₂', ok: 1, fb: 'Yes. An ion that stays together on both sides is counted as one piece: four rows.' },
            { t: 'Na, P, O, Ca, C, H', fb: 'That works, but it is six rows and oxygen is in every substance. Both ions stay together on both sides, so count each as one piece: Na, PO₄, Ca, C₂H₃O₂.' }] },
      text: 'Sodium phosphate and calcium acetate trade partners. Decide how to keep the inventory, type it for the equation as written (mind the ' +
            'subscripts outside the brackets), then balance. Not graded.' },
    { id: 'split', part: 4, kind: 'bench', rx: 'h3po4', typed: true, title: 'When the ion is on one side only',
      ask: { q: 'H₃PO₄ has a PO₄ in it. Can PO₄ be a row of the inventory here?',
        c: [{ t: 'Yes: P₄O₁₀ has P and O', fb: 'P₄O₁₀ is not made of PO₄ ions, and there is no PO₄ in the reactants. An ion is kept together only when it is on both sides. Here count P, O and H atom by atom.' },
            { t: 'No: PO₄ is only in the products', ok: 1, fb: 'Right. No PO₄ in the reactants, so the inventory goes atom by atom: P, O and H. Oxygen is in both reactants: add them.' }] },
      text: 'Tetraphosphorus decoxide and water make phosphoric acid. Decide how to keep the inventory, type it, then balance. Not graded.' },
    { id: 'mixed', part: 4, kind: 'bench', rx: 'naohh2so4', typed: true, title: 'Water is HOH',
      ask: { q: 'An acid and a base make a salt and water. Written H₂O, the OH of the base seems to vanish. How do you keep the hydroxide together?',
        c: [{ t: 'Write water as HOH', ok: 1, fb: 'Yes. HOH is one hydroxide, OH, and one hydrogen. Now OH is on both sides and stays one row: Na, OH, H, SO₄.' },
            { t: 'Count O and H atom by atom', fb: 'That works, but there is a quicker way: write water as HOH, one hydroxide and one hydrogen. Then OH is on both sides and stays one row: Na, OH, H, SO₄.' }] },
      text: 'Sodium hydroxide and sulfuric acid: a neutralization. Water is written HOH. The H row counts only the hydrogen that is not in ' +
            'an OH: the H of the acid, and the H of HOH. Not graded.' },
    { id: 'quiz', part: 5, kind: 'quiz', title: 'Graded questions',
      text: Gen.QUIZ + ' questions. Click a choice to select it (you can change it), then press Submit answer. Your first Submit counts.' },
    { id: 'set', part: 5, kind: 'set', title: 'Graded equations',
      text: Gen.COUNT + ' equations. The inventory follows your coefficients, but nothing is marked right or wrong until you Check, and your ' +
            'first Check of each equation counts: compare the two columns row by row first. After a miss, keep going until it is balanced.' },
    { id: 'results', part: 6, kind: 'results', title: 'Results', text: '' }
  ];
  if (CL) {
    var byId = {};
    STEPS.forEach(function (s) { byId[s.id] = s; });
    var at = function (id, part, more) {
      var o = {}, src = byId[id];
      Object.keys(src).forEach(function (k) { o[k] = src[k]; });
      Object.keys(more || {}).forEach(function (k) { o[k] = more[k]; });
      o.part = part;
      return o;
    };
    PARTS = ['Balancing recap', 'The six types', 'Balance and classify', 'Graded', 'Results'];
    STEPS = [
      at('strategy', 1, { id: 'recap', title: 'Recap: the inventory',
        text: 'A quick recap of balancing. Type the inventory for the equation as it is written (reactants on the left, products on the ' +
              'right), then change the coefficients until every row matches. Not graded.' }),
      at('mixed', 1, { id: 'hoh', title: 'Recap: polyatomic ions and HOH' }),
      { id: 'types', part: 2, kind: 'types', title: 'The six types of reaction',
        text: 'Chemists sort reactions by what the reactants and products look like. Tap each of the six types to see its general form, ' +
              'what gives it away, and an example as particles.' },
      { id: 'sort', part: 2, kind: 'sort', title: 'Which type?',
        text: 'Eight reactions, not balanced yet: the type does not depend on the coefficients. Classify each one. Count the reactants ' +
              'and the products first. Not graded.' },
      { id: 'both1', part: 3, kind: 'bench', rx: 'h3po4', classify: true, title: 'Balance and classify',
        text: 'Now both at once, as in the graded part. Balance the equation and choose its type, in either order, then Check: it judges ' +
              'the coefficients and the type together. Not graded.' },
      { id: 'both2', part: 3, kind: 'bench', rx: 'methane', classify: true, title: 'Balance and classify: one more',
        text: 'Methane and oxygen. Balance it and choose the type, then Check. Not graded.' },
      { id: 'quiz', part: 4, kind: 'quiz', title: 'Graded questions',
        text: Gen.QUIZ + ' questions on the six types. Click a choice to select it (you can change it), then press Submit answer. Your first Submit counts.' },
      { id: 'set', part: 4, kind: 'set', title: 'Graded reactions',
        text: Gen.COUNT + ' reactions. Balance each one AND choose its type, then Check. Your first Check counts for both: one point for ' +
              'the coefficients, one for the type. After a miss, keep going until both are right.' },
      { id: 'results', part: 5, kind: 'results', title: 'Results', text: '' }
    ];
  }
  var ITEMS = Gen.QUIZ + Gen.COUNT * (CL ? 2 : 1);

  var el = {};
  var state = null;
  var ctl = null;
  var preview = false;

  function $(id) { return document.getElementById(id); }
  function say(text, kind) {
    el.feedback.textContent = text || '';
    el.feedback.className = 'feedback' + (kind ? ' ' + kind : '');
  }
  function stepIndex(id) { for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === id) return i; return -1; }
  function panel(title, hint, kids) {
    return h('section', { class: 'panel' }, [
      h('div', { class: 'panel-head' }, [h('h3', { text: title }), hint ? h('span', { class: 'hint', text: hint }) : null])
    ].concat(kids || []));
  }

  /* ------------------------------------------------------------------ state */

  function newState() {
    return { v: SCHEMA, seed: Math.floor(Math.random() * 1e9), step: 0, max: 0, done: {}, d: {}, q: { a: [] }, p: [], view: 0, fin: 0, best: 0, att: 1 };
  }
  function restore(saved) {
    if (!saved || saved.v !== SCHEMA || typeof saved.seed !== 'number' || !Array.isArray(saved.p) || !saved.q || !Array.isArray(saved.q.a)) return null;
    saved.done = saved.done || {}; saved.d = saved.d || {};
    return saved;
  }
  function problems() { return Gen.set(state.seed); }
  function questions() { return Gen.quiz(state.seed); }

  function persist() { if (!preview) SCORM.saveState(state); }

  function rightQuiz() { return state.q.a.filter(function (a) { return a && a.ok; }).length; }
  function rightSet() { return state.p.filter(function (w) { return w && w.g === 1; }).length; }
  function rightTypes() { return CL ? state.p.filter(function (w) { return w && w.k === 1; }).length : 0; }
  /* every graded part of this reaction right on the first Check */
  function clean(w) { return !!w && w.g === 1 && (!CL || w.k === 1); }
  function rightItems() { return rightQuiz() + rightSet() + rightTypes(); }
  function quizDone() { for (var i = 0; i < Gen.QUIZ; i++) if (!state.q.a[i]) return false; return true; }
  function solvedCount() { var n = 0; for (var i = 0; i < Gen.COUNT; i++) if (state.p[i] && state.p[i].r) n++; return n; }
  function current() { for (var i = 0; i < Gen.COUNT; i++) if (!(state.p[i] && state.p[i].r)) return i; return Gen.COUNT; }
  function attemptPercent() { return 100 * rightItems() / ITEMS; }
  function reportScore() { if (!preview) SCORM.setScore(Math.max(state.best || 0, attemptPercent())); }

  function newAttempt() {
    var keep = { best: Math.max(state.best || 0, state.fin ? attemptPercent() : 0), att: (state.att || 1) + 1, max: state.max };
    state = newState();
    state.best = keep.best; state.att = keep.att; state.max = keep.max;
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
    nav('next', 'disabled', state.step >= STEPS.length - 1);
    paintParts();
    if (msg) say(msg, kind || 'good');
  }

  /* ----------------------------------------------------------------- chrome */

  function paintParts() {
    el.parts.innerHTML = '';
    var cur = STEPS[state.step].part;
    PARTS.forEach(function (name, k) {
      var n = k + 1, first = -1;
      for (var i = 0; i < STEPS.length; i++) if (STEPS[i].part === n) { first = i; break; }
      var open = first >= 0 && first <= state.max;
      el.parts.appendChild(h('button', {
        type: 'button', class: 'tab' + (n === cur ? ' current' : '') + (open ? '' : ' locked'), disabled: !open,
        'aria-current': n === cur ? 'step' : null, onclick: function () { if (open) goTo(first); }
      }, [n < PARTS.length ? n + '  ' + name : name]));
    });
    el.score.textContent = 'Score: ' + rightItems() + ' / ' + ITEMS + (state.att > 1 ? '  ·  best ' + Math.round(state.best || 0) + '%' : '');
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
    el.instructions.textContent = s.text || '';
    el.instructions.hidden = !s.text;
    el.stage.innerHTML = '';
    say('');
    nav('back', 'disabled', i === 0);
    nav('next', 'disabled', !(state.done[s.id] || i < state.max) || i >= STEPS.length - 1);
    paintParts();
    RENDER[s.kind](s);
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------ renderers */

  var RENDER = {};
  function cbFor() { return { save: persist, say: say, complete: function (msg, kind) { complete(msg, kind); } }; }
  function lesson(name) {
    RENDER[name] = function (s) {
      var st = state.d[s.id] || (state.d[s.id] = {});
      var r = Steps[name](el.stage, st, cbFor());
      if (r && r.done && !state.done[s.id]) complete();
      if (state.done[s.id]) nav('next', 'disabled', false);
    };
  }
  ['count', 'change', 'conserved', 'types', 'sort'].forEach(lesson);

  /* ---- a lesson workbench: one reaction, not graded. s.ask: a prediction
     (answered on the click) that must be made before the bench opens. */
  RENDER.bench = function (s) {
    var work = state.d[s.id] || (state.d[s.id] = {});
    var host = el.stage;
    function open() {
      if (s.tips) {
        var main = h('div', { class: 'side-main' });
        host.appendChild(h('div', { class: 'with-side' }, [main,
          panel('Tips', null, [h('ol', { class: 'tips' }, TIPS.map(function (t) { return h('li', { text: t }); }))])]));
        host = main;
      }
      ctl = Bench.create(host, Rx.get(s.rx), work, {
        marks: 'live', typed: s.typed, classify: s.classify, onSave: persist,
        onResolve: function () { complete(s.classify ? 'Balanced and classified. Press Next.' : 'Balanced. Press Next.'); }
      });
    }
    if (s.ask) {
      var fb = h('p', { class: 'fb' });
      var tiles = h('div', { class: 'tiles', role: 'group', 'aria-label': 'Prediction' }, s.ask.c.map(function (c, i) {
        return h('button', { type: 'button', class: 'tile', text: c.t, onclick: function (ev) {
          if (work.a != null) return;
          work.a = i;
          answered(ev.currentTarget, c);
          persist();
          open();
        } });
      }));
      var answered = function (btn, c) {
        Array.prototype.forEach.call(tiles.children, function (b) { b.disabled = true; });
        btn.classList.add(c.ok ? 'on' : 'wrong');
        fb.textContent = c.fb;
        fb.className = 'fb show ' + (c.ok ? 'good' : 'bad');
      };
      el.stage.appendChild(h('section', { class: 'panel ask' }, [
        h('p', { class: 'pic-eq', text: s.id === 'mixed' ? 'NaOH + H₂SO₄ → Na₂SO₄ + H₂O' : Chem.equation(Rx.get(s.rx)) }),
        h('p', { class: 'prompt', text: s.ask.q }), tiles, fb]));
      if (work.a != null) { answered(tiles.children[work.a], s.ask.c[work.a]); open(); }
    } else open();
    if (state.done[s.id]) nav('next', 'disabled', false);
  };

  /* ---- graded choice questions */
  RENDER.quiz = function () {
    var qs = questions();
    ctl = Steps.quiz(el.stage, qs, state.q, {
      answer: function (i, ok, q, picked) {
        if (!preview) SCORM.recordAnswer(q.id, picked, q.choices[q.right], !!ok);
        persist();
        reportScore();
        paintParts();
        if (quizDone()) complete();
      },
      finish: function () { if (quizDone()) goTo(state.step + 1); }
    });
    if (quizDone()) nav('next', 'disabled', false);
  };

  /* ---- graded equations */
  function mark(w) { return w && w.r ? (clean(w) ? '★' : '✓') : ''; }
  var THING = CL ? 'Reaction' : 'Equation';
  RENDER.set = function () {
    var list = problems();
    var cur = current();
    var view = Math.min(state.view != null ? state.view : cur, cur, Gen.COUNT - 1);
    state.view = view;
    var strip = h('nav', { class: 'pstrip', 'aria-label': THING + 's' });
    list.forEach(function (p, i) {
      var w = state.p[i], r = w && w.r;
      var what = r ? (clean(w) ? 'right on the first Check' : 'finished after a miss') : i === cur ? 'current' : 'not reached';
      strip.appendChild(h('button', {
        type: 'button', class: 'pnum' + (r ? (clean(w) ? ' first' : ' right') : '') + (i === view ? ' on' : ''),
        disabled: i > cur, 'aria-label': THING + ' ' + (i + 1) + ': ' + what, 'aria-current': i === view ? 'true' : null,
        title: what, onclick: function () { state.view = i; goTo(state.step); }
      }, [String(i + 1) + mark(w)]));
    });
    el.stage.appendChild(strip);
    el.counter.textContent = THING + ' ' + (view + 1) + ' of ' + Gen.COUNT + '  ·  step ' + (state.step + 1) + ' of ' + STEPS.length;
    var p = list[view];
    var work = state.p[view] || (state.p[view] = {});
    var last = view === Gen.COUNT - 1;
    ctl = Bench.create(el.stage, p.rx, work, {
      marks: 'check', graded: true, classify: CL, onSave: persist,
      onFirst: function (right, typed, want, typeRight, typePicked, typeWant) {
        if (!preview) {
          SCORM.recordAnswer('eq-' + p.id, typed, want, right);
          if (CL) SCORM.recordAnswer('type-' + p.id, typePicked, typeWant, typeRight);
        }
        reportScore();
        paintParts();
      },
      onResolve: function () {
        persist();
        var m = strip.children[view];
        if (m) { m.className = 'pnum on' + (clean(work) ? ' first' : ' right'); m.textContent = String(view + 1) + mark(work); }
        if (strip.children[view + 1]) strip.children[view + 1].disabled = false;
        if (solvedCount() >= Gen.COUNT) complete();
      },
      next: { label: last ? 'See your results →' : 'Next ' + THING.toLowerCase() + ' →', onClick: function () {
        if (last) { if (solvedCount() >= Gen.COUNT) goTo(state.step + 1); return; }
        state.view = view + 1;
        goTo(state.step);
      } }
    });
    if (solvedCount() >= Gen.COUNT) nav('next', 'disabled', false);
  };

  /* ---- results */
  RENDER.results = function () {
    if (!state.fin) {
      state.fin = 1;
      state.done.results = 1;
      state.best = Math.max(state.best || 0, attemptPercent());
      persist();
      if (!preview) { reportScore(); SCORM.markComplete(); }
      paintParts();
    }
    var list = problems(), qs = questions();
    var right = rightItems(), pct = Math.round(100 * right / ITEMS), best = Math.round(state.best || 0);
    var box = panel(state.att > 1 ? 'Attempt ' + state.att : 'Your score', null, [
      h('p', { class: 'big-score', text: right + ' / ' + ITEMS + '  (' + pct + '%)' }),
      h('table', { class: 'ref-table' }, [
        h('tr', null, [h('td', { text: 'Questions right on the first Submit' }), h('td', { class: 'num', text: rightQuiz() + ' / ' + Gen.QUIZ })]),
        h('tr', null, [h('td', { text: 'Equations balanced on the first Check' }), h('td', { class: 'num', text: rightSet() + ' / ' + Gen.COUNT })]),
        CL ? h('tr', null, [h('td', { text: 'Reactions classified on the first Check' }), h('td', { class: 'num', text: rightTypes() + ' / ' + Gen.COUNT })]) : null
      ]),
      state.att > 1 ? h('p', { class: 'best-line', text: 'Best attempt: ' + best + '%' + (best > pct ? '. That is the score the gradebook keeps.' : '') }) : null,
      h('p', { class: 'muted', text: SCORM.isConnected()
        ? 'Your ' + (state.att > 1 ? 'best ' : '') + 'score has been sent to the gradebook and the activity is marked complete.'
        : 'Standalone mode: nothing was sent to a gradebook.' })
    ]);
    var ideas = [
      'The law of conservation of mass: a reaction rearranges atoms. None are made, none are destroyed.',
      'Balanced means every element has the same number of atoms in the reactants and in the products.',
      'A coefficient says how many particles. Atoms of an element = coefficient × subscript.',
      'Only coefficients may change. A different subscript is a different substance.',
      'Keep an inventory: a row for each element, or for a polyatomic ion when it is on both sides. If the ion is on one side only, count its atoms.',
      'In a neutralization write water as HOH, so the hydroxide stays together.',
      'Write the lowest whole-number coefficients.'
    ];
    if (CL) {
      ideas = ideas.slice(0, 2).concat(Chem.TYPE_ORDER.map(function (t) { return Chem.TYPES[t].name + ' (' + Chem.TYPES[t].form + '): ' + Chem.TYPES[t].clue; }))
        .concat(['Close calls: one product is a synthesis and one reactant a decomposition, whatever else is true. Acid + base is a neutralization.']);
    }
    el.stage.appendChild(h('div', { class: 'grid2' }, [box, panel('Big ideas', null, [h('ul', { class: 'keylist' }, ideas.map(function (t) { return h('li', { text: t }); }))])]));
    el.stage.appendChild(panel('Your ' + THING.toLowerCase() + 's', '★ right on the first Check', [h('ol', { class: 'q-review' }, list.map(function (p, i) {
      var w = state.p[i] || {};
      return h('li', { class: clean(w) ? 'right' : 'wrong' }, [
        h('span', { class: 'mark', text: clean(w) ? '★' : '✓' }),
        h('div', { class: 'review-body' }, [h('b', { class: 'eq-line', text: Chem.equation(p.rx, p.coefs) }),
          CL ? h('span', { class: 'muted', text: '  ' + Chem.TYPES[p.type].name + '  (coefficients ' + (w.g === 1 ? '★' : '✓') + ', type ' + (w.k === 1 ? '★' : '✓') + ')' }) : null])
      ]);
    }))]));
    el.stage.appendChild(panel('Your questions', null, [h('ol', { class: 'q-review' }, qs.map(function (q, i) {
      var a = state.q.a[i] || {};
      return h('li', { class: a.ok ? 'right' : 'wrong' }, [
        h('span', { class: 'mark', text: a.ok ? '★' : '✗' }),
        h('div', { class: 'review-body' }, [
          h('span', null, [q.stem + ' ', h('b', { text: q.choices[q.right] })]),
          h('details', null, [h('summary', { text: 'Why' }), h('p', { class: 'muted', text: q.why })])
        ])
      ]);
    }))]));
    var again = h('button', { type: 'button', class: 'primary', text: 'Start a new attempt' });
    var sure = h('div', { class: 'confirm', hidden: true }, [
      h('p', { text: 'This gives you new questions and ' + Gen.COUNT + ' ' + THING.toLowerCase() + 's (mostly new ones). Your best score so far (' + Math.max(best, pct) + '%) stays in the gradebook.' }),
      h('div', { class: 'btnrow' }, [
        h('button', { type: 'button', class: 'primary', text: 'Yes, start again', onclick: newAttempt }),
        h('button', { type: 'button', class: 'ghostbtn', text: 'Cancel', onclick: function () { sure.hidden = true; again.hidden = false; again.focus(); } })
      ])
    ]);
    again.addEventListener('click', function () { again.hidden = true; sure.hidden = false; sure.querySelector('.primary').focus(); });
    el.stage.appendChild(panel('Try it again?', null, [
      h('p', { class: 'muted', text: 'You can redo the activity with new ' + THING.toLowerCase() + 's. Parts you have already reached stay open.' }),
      h('div', { class: 'btnrow' }, [again]), sure]));
    say('Activity complete.', 'good');
  };

  /* ------------------------------------------------------------------ boot */

  function showIntro() {
    var box = h('div', { class: 'screen-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'introTitle' }, CL ? [
      h('h2', { id: 'introTitle', text: document.title }),
      h('p', { text: 'You can balance an equation. Now you will also say what type of reaction it is: synthesis, decomposition, single ' +
                     'replacement, double replacement, combustion or neutralization.' }),
      h('p', { text: 'After a short recap and a look at the six types, every reaction is balanced and classified together on one workbench.' }),
      h('p', { text: 'The lesson comes first and is not graded. Then ' + Gen.QUIZ + ' graded questions and ' + Gen.COUNT + ' graded reactions, each ' +
                     'worth two points (coefficients and type): your first answer to each counts. About ' + CONFIG.minutes + ' minutes. Your progress is saved if you leave.' }),
      h('p', { class: 'screen-note', text: 'Everything works with a mouse, a touch screen or the keyboard (Tab between boxes, arrow keys to change a ' +
                     'coefficient, Enter to check).' })
    ] : [
      h('h2', { id: 'introTitle', text: document.title }),
      h('p', { text: 'In a chemical reaction the atoms of the reactants are rearranged into the products. No atom is made and none is destroyed: ' +
                     'that is the law of conservation of mass, and it is why equations have to be balanced.' }),
      h('p', { text: 'You will see every reaction as particles: a box of reactants and a box of products, with the inventory between them. Change ' +
                     'the coefficients and watch the particles and the counts until every atom is accounted for.' }),
      h('p', { text: 'The lesson comes first and is not graded. Then ' + Gen.QUIZ + ' graded questions and ' + Gen.COUNT + ' graded equations: your first ' +
                     'answer to each counts. About ' + CONFIG.minutes + ' minutes. Your progress is saved if you leave.' }),
      h('p', { class: 'screen-note', text: 'Everything works with a mouse, a touch screen or the keyboard (Tab between boxes, arrow keys to change a ' +
                     'coefficient, Enter to check).' })
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
     'score', 'lms', 'screen'].forEach(function (id) { el[id] = $(id); });
    var connected = SCORM.init();
    el.lms.textContent = connected ? 'Connected to the LMS' : 'Standalone: no LMS detected';
    el.lms.className = 'lms ' + (connected ? 'on' : 'off');
    var params = new URLSearchParams(location.search);
    var jump = params.get('step');
    if (jump != null) {
      preview = true;
      state = newState();
      if (params.get('seed')) state.seed = +params.get('seed');
      state.max = STEPS.length - 1;
      var idx = /^\d+$/.test(jump) ? +jump - 1 : stepIndex(jump);
      state.step = Math.max(0, Math.min(STEPS.length - 1, idx < 0 ? 0 : idx));
      if (params.get('problem')) {
        state.view = Math.max(0, Math.min(Gen.COUNT - 1, +params.get('problem') - 1));
        for (var k = 0; k < state.view; k++) state.p[k] = { r: 1, g: 1, k: 1, n: 1, c: problems()[k].coefs.slice(), y: problems()[k].rx.type };
      }
    } else {
      state = restore(SCORM.loadState()) || newState();
      state.view = null;
      persist();
    }
    [el.next, el.nextTop].forEach(function (b) { b.addEventListener('click', function () { goTo(state.step + 1); }); });
    [el.back, el.backTop].forEach(function (b) { b.addEventListener('click', function () { goTo(state.step - 1); }); });
    if (preview) { goTo(state.step); return; }
    paintParts();
    showIntro();
  }

  return { start: start, SCHEMA: SCHEMA, STEPS: STEPS, PARTS: PARTS, ITEMS: ITEMS, TIPS: TIPS,
           problems: function () { return problems(); }, questions: function () { return questions(); },
           state: function () { return state; }, ctl: function () { return ctl; }, rightItems: rightItems, CLASSIFY: CL };
})();

document.addEventListener('DOMContentLoaded', App.start);

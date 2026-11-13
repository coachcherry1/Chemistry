/* app.js: the steps, their order, saving, scoring.
 *
 * Parts 1 and 2 are the lesson (nothing graded): single replacement with the
 * activity series, double replacement with the solubility table. Each has a
 * drill on reading the reference, a particle animation with a prediction,
 * and two problems worked on the ladder. Part 3 is graded: four choice
 * questions (select, then Submit answer) and ten problems. In a problem
 * every rung is one graded item: the first answer to it counts.
 *
 * Score = graded items right the first time / all graded items, sent as
 * cmi.core.score.raw (0 to 100) after every item, with one cmi.interactions
 * record each. Retakes give new questions and problems; the gradebook keeps
 * the best.
 */
var App = (function () {
  'use strict';

  /* Bump whenever the steps, the pools or the handout data change: a save
     from an older release is then discarded. */
  var SCHEMA = 3;

  var h = UI.h;

  var PARTS = ['Single replacement', 'Double replacement', 'Graded', 'Results'];
  var STEPS = [
    { id: 'willit', part: 1, kind: 'willit', title: 'Reading the activity series',
      text: 'In a single replacement a lone element takes the place of an element like it in a compound: a metal replaces a metal (or the ' +
            'hydrogen of an acid or of water, HOH), a halogen replaces a halogen. It only happens if the lone element comes BEFORE the other ' +
            'on the series. Not graded.' },
    { id: 'plate', part: 1, kind: 'plate', title: 'What it looks like',
      text: 'Predict first, then press Play on each picture.' },
    { id: 'sr1', part: 1, kind: 'ladder', l: ['Al', 'CuCl2'], title: 'Predict the products: a metal and a salt',
      text: 'Work down the steps: will it react, what forms, and balance. The new compound is made of ions, so its formula comes from their ' +
            'charges, not from the old formula. (No state symbols here: they do not matter in a single replacement.) Not graded.' },
    { id: 'sr2', part: 1, kind: 'ladder', l: ['Mg', 'HCl'], title: 'Predict the products: a metal and an acid',
      text: 'A metal above hydrogen replaces the hydrogen of an acid. Hydrogen on its own is a diatomic gas. Not graded.' },
    { id: 'sol', part: 2, kind: 'sol', title: 'Reading the solubility rules',
      text: 'In a double replacement the states matter. A dissolved compound is written (aq); one that does not dissolve is a solid, (s). Find the negative ion in the rules, then check ' +
            'whether the positive ion is listed as an exception. Not graded.' },
    { id: 'mix', part: 2, kind: 'mix', title: 'What it looks like',
      text: 'In a double replacement two dissolved compounds trade partners. Predict first, then press Play on each picture.' },
    { id: 'dr1', part: 2, kind: 'ladder', l: ['Pb(NO3)2', 'KI'], title: 'Predict the products: a solid forms',
      text: 'Trade the partners and build both possible products, look up their states, then decide whether anything happens. Not graded.' },
    { id: 'dr2', part: 2, kind: 'ladder', l: ['NaCl', 'KNO3'], title: 'Predict the products: or does it?',
      text: 'Same steps. Be ready for either answer. Not graded.' },
    { id: 'quiz', part: 3, kind: 'quiz', title: 'Graded questions',
      text: Gen.QUIZ + ' questions. Click a choice to select it (you can change it), then press Submit answer. Your first Submit counts.' },
    { id: 'set', part: 3, kind: 'set', title: 'Graded problems',
      text: Gen.COUNT + ' problems, single and double replacement mixed. Every step of a problem is worth a point, and your first answer to ' +
            'it counts. Some problems have no reaction: then deciding that is the whole problem.' },
    { id: 'results', part: 4, kind: 'results', title: 'Results', text: '' }
  ];

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

  /* a finished problem keeps only its marks */
  function persist() {
    if (preview) return;
    state.p = state.p.map(function (w) { return w && w.r ? { r: 1, i: w.i, g: w.g } : w; });
    SCORM.saveState(state);
  }

  function totalItems() { return Gen.QUIZ + problems().reduce(function (t, p) { return t + p.rungs.length; }, 0); }
  function rightQuiz() { return state.q.a.filter(function (a) { return a && a.ok; }).length; }
  function rightRungs() {
    var n = 0;
    problems().forEach(function (p, i) { var w = state.p[i]; if (w && w.g) p.rungs.forEach(function (r) { if (w.g[r] === 1) n++; }); });
    return n;
  }
  function rightItems() { return rightQuiz() + rightRungs(); }
  function quizDone() { for (var i = 0; i < Gen.QUIZ; i++) if (!state.q.a[i]) return false; return true; }
  function solvedCount() { var n = 0; for (var i = 0; i < Gen.COUNT; i++) if (state.p[i] && state.p[i].r) n++; return n; }
  function current() { for (var i = 0; i < Gen.COUNT; i++) if (!(state.p[i] && state.p[i].r)) return i; return Gen.COUNT; }
  function clean(i) { var w = state.p[i], p = problems()[i]; return !!w && !!w.g && p.rungs.every(function (r) { return w.g[r] === 1; }); }
  function attemptPercent() { return 100 * rightItems() / totalItems(); }
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
    el.score.textContent = 'Score: ' + rightItems() + ' / ' + totalItems() + (state.att > 1 ? '  ·  best ' + Math.round(state.best || 0) + '%' : '');
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
  ['willit', 'plate', 'sol', 'mix'].forEach(function (name) {
    RENDER[name] = function (s) {
      var st = state.d[s.id] || (state.d[s.id] = {});
      var r = Steps[name](el.stage, st, cbFor());
      if (r && r.done && !state.done[s.id]) complete();
      if (state.done[s.id]) nav('next', 'disabled', false);
    };
  });

  /* ---- a lesson problem on the ladder, not graded */
  RENDER.ladder = function (s) {
    var work = state.d[s.id] || (state.d[s.id] = {});
    if (work.r && !state.done[s.id]) work = state.d[s.id] = {};
    ctl = Ladder.create(el.stage, Gen.make(s.l[0], s.l[1]), work, {
      graded: false, onSave: persist,
      onDone: function () { complete('Done. Press Next.'); }
    });
    if (state.done[s.id]) nav('next', 'disabled', false);
  };

  /* ---- graded choice questions */
  RENDER.quiz = function () {
    ctl = Steps.quiz(el.stage, questions(), state.q, {
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

  /* ---- graded problems */
  function mark(i) { var w = state.p[i]; return w && w.r ? (clean(i) ? '★' : '✓') : ''; }
  RENDER.set = function () {
    var list = problems();
    var cur = current();
    var view = Math.min(state.view != null ? state.view : cur, cur, Gen.COUNT - 1);
    state.view = view;
    var strip = h('nav', { class: 'pstrip', 'aria-label': 'Problems' });
    list.forEach(function (p, i) {
      var w = state.p[i], r = w && w.r;
      var what = r ? (clean(i) ? 'every step right the first time' : 'finished after a miss') : i === cur ? 'current' : 'not reached';
      strip.appendChild(h('button', {
        type: 'button', class: 'pnum' + (r ? (clean(i) ? ' first' : ' right') : '') + (i === view ? ' on' : ''),
        disabled: i > cur, 'aria-label': 'Problem ' + (i + 1) + ': ' + what, 'aria-current': i === view ? 'true' : null,
        title: what, onclick: function () { state.view = i; goTo(state.step); }
      }, [String(i + 1) + mark(i)]));
    });
    el.stage.appendChild(strip);
    el.counter.textContent = 'Problem ' + (view + 1) + ' of ' + Gen.COUNT + '  ·  step ' + (state.step + 1) + ' of ' + STEPS.length;
    var p = list[view];
    var work = state.p[view] || (state.p[view] = {});
    var last = view === Gen.COUNT - 1;
    if (work.r) work = { r: 1, i: p.rungs.length, g: work.g, n: {}, v: {} };
    ctl = Ladder.create(el.stage, p, work, {
      graded: true, onSave: persist,
      onRung: function (rung, right, typed, want) {
        if (!preview) SCORM.recordAnswer('p' + (view + 1) + '-' + rung, typed, want, right);
        persist();
        reportScore();
        paintParts();
      },
      onDone: function () {
        persist();
        var m = strip.children[view];
        if (m) { m.className = 'pnum on' + (clean(view) ? ' first' : ' right'); m.textContent = String(view + 1) + mark(view); }
        if (strip.children[view + 1]) strip.children[view + 1].disabled = false;
        if (solvedCount() >= Gen.COUNT) complete();
      },
      next: { label: last ? 'See your results →' : 'Next problem →', onClick: function () {
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
    var list = problems(), qs = questions(), total = totalItems();
    var right = rightItems(), pct = Math.round(100 * right / total), best = Math.round(state.best || 0);
    var byRung = ['react', 'products', 'states', 'balance'].map(function (r) {
      var have = 0, ok = 0;
      list.forEach(function (p, i) { if (p.rungs.indexOf(r) >= 0) { have++; if (state.p[i] && state.p[i].g && state.p[i].g[r] === 1) ok++; } });
      return h('tr', null, [h('td', { text: Ladder.NAMES[r] }), h('td', { class: 'num', text: ok + ' / ' + have })]);
    });
    var box = panel(state.att > 1 ? 'Attempt ' + state.att : 'Your score', null, [
      h('p', { class: 'big-score', text: right + ' / ' + total + '  (' + pct + '%)' }),
      h('table', { class: 'ref-table' }, [
        h('tr', null, [h('td', { text: 'Questions right on the first Submit' }), h('td', { class: 'num', text: rightQuiz() + ' / ' + Gen.QUIZ })])
      ].concat(byRung)),
      state.att > 1 ? h('p', { class: 'best-line', text: 'Best attempt: ' + best + '%' + (best > pct ? '. That is the score the gradebook keeps.' : '') }) : null,
      h('p', { class: 'muted', text: SCORM.isConnected()
        ? 'Your ' + (state.att > 1 ? 'best ' : '') + 'score has been sent to the gradebook and the activity is marked complete.'
        : 'Standalone mode: nothing was sent to a gradebook.' })
    ]);
    var ideas = [
      'Single replacement: a lone element replaces an element like it only if it comes BEFORE it on the activity series. Otherwise: no reaction.',
      'A metal before hydrogen replaces the hydrogen of an acid, and H₂ forms. Only the metals from lithium to sodium do the same with cold water, HOH.',
      'Double replacement: the positive ions trade partners. Look up both products in the solubility rules.',
      'If a product is insoluble, a solid forms and there is a reaction. If both products are soluble: no reaction.',
      'A new compound\'s formula comes from the charges of its ions, never from the subscripts of the old one.',
      'On its own a metal is written as single atoms; hydrogen and the halogens are diatomic: H₂, Cl₂, Br₂, I₂.'
    ];
    el.stage.appendChild(h('div', { class: 'grid2' }, [box, panel('Big ideas', null, [h('ul', { class: 'keylist' }, ideas.map(function (t) { return h('li', { text: t }); }))])]));
    el.stage.appendChild(panel('Your problems', '★ every step right the first time', [h('ol', { class: 'q-review' }, list.map(function (p, i) {
      var w = state.p[i] || {};
      return h('li', { class: clean(i) ? 'right' : 'wrong' }, [
        h('span', { class: 'mark', text: clean(i) ? '★' : '✓' }),
        h('div', { class: 'review-body' }, [h('b', { class: 'eq-line', text: Gen.equation(p, true) }),
          h('span', { class: 'muted', text: '  ' + p.rungs.map(function (r) { return Ladder.NAMES[r] + ' ' + (w.g && w.g[r] === 1 ? '★' : '✓'); }).join(', ') }),
          h('p', { class: 'muted', text: p.why })])
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
      h('p', { text: 'This gives you new questions and ' + Gen.COUNT + ' new problems. Your best score so far (' + Math.max(best, pct) + '%) stays in the gradebook.' }),
      h('div', { class: 'btnrow' }, [
        h('button', { type: 'button', class: 'primary', text: 'Yes, start again', onclick: newAttempt }),
        h('button', { type: 'button', class: 'ghostbtn', text: 'Cancel', onclick: function () { sure.hidden = true; again.hidden = false; again.focus(); } })
      ])
    ]);
    again.addEventListener('click', function () { again.hidden = true; sure.hidden = false; sure.querySelector('.primary').focus(); });
    el.stage.appendChild(panel('Try it again?', null, [
      h('p', { class: 'muted', text: 'You can redo the activity with new problems. Parts you have already reached stay open.' }),
      h('div', { class: 'btnrow' }, [again]), sure]));
    say('Activity complete.', 'good');
  };

  /* ------------------------------------------------------------------ boot */

  function showIntro() {
    var box = h('div', { class: 'screen-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'introTitle' }, [
      h('h2', { id: 'introTitle', text: document.title }),
      h('p', { text: 'Given only the reactants, you will predict what forms, or that nothing does. Two kinds of reaction, two reference tables:' }),
      h('ul', { class: 'screen-list' }, [
        h('li', null, [h('b', { text: 'Single replacement: ' }), 'the activity series says whether a lone element can take another\'s place.']),
        h('li', null, [h('b', { text: 'Double replacement: ' }), 'the solubility rules say whether trading partners makes a solid.'])
      ]),
      h('p', { text: 'Both tables stay beside your work the whole time. The lesson comes first and is not graded. Then ' + Gen.QUIZ +
                     ' graded questions and ' + Gen.COUNT + ' graded problems: your first answer to each step counts. About ' + CONFIG.minutes +
                     ' minutes. Your progress is saved if you leave.' }),
      h('p', { class: 'screen-note', text: 'Everything works with a mouse, a touch screen or the keyboard (Tab between buttons, Enter or Space to press).' })
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
        for (var k = 0; k < state.view; k++) {
          var pk = problems()[k], g = {};
          pk.rungs.forEach(function (r) { g[r] = 1; });
          state.p[k] = { r: 1, i: pk.rungs.length, g: g };
        }
        /* ?rung=n opens that problem at its nth step */
        if (params.get('rung')) {
          var pv = problems()[state.view], gi = {}, n = Math.max(0, Math.min(pv.rungs.length - 1, +params.get('rung') - 1));
          pv.rungs.slice(0, n).forEach(function (r) { gi[r] = 1; });
          state.p[state.view] = { i: n, g: gi, n: {}, v: {} };
        }
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

  return { start: start, SCHEMA: SCHEMA, STEPS: STEPS, PARTS: PARTS,
           problems: function () { return problems(); }, questions: function () { return questions(); }, totalItems: totalItems,
           state: function () { return state; }, ctl: function () { return ctl; }, rightItems: rightItems };
})();

document.addEventListener('DOMContentLoaded', App.start);

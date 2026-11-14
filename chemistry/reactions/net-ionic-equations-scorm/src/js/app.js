/* app.js: the steps, their order, saving, scoring.
 *
 * Parts 1 to 4 are the lesson (nothing graded): what (aq) looks like and how
 * a dissolved substance is written as ions; then a solid forms, water forms,
 * and nothing happens, each with a prediction, the beaker, and one problem
 * worked on the ladder. Part 5 is graded: four choice questions (select,
 * then Submit answer) and eight problems. In a problem every rung is one
 * graded item: the first answer to it counts.
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
  var SCHEMA = 1;

  var h = UI.h;

  var PARTS = ['Dissolved ions', 'A solid forms', 'Water forms', 'No reaction', 'Graded', 'Results'];
  var STEPS = [
    { id: 'aq', part: 1, kind: 'aq', title: 'What (aq) looks like',
      text: 'A dissolved salt, a strong acid or a strong base is not molecules floating about: its ions come apart in the water. Pick the picture that matches. Not graded.' },
    { id: 'split', part: 1, kind: 'split', title: 'Writing a substance as its ions',
      text: 'Each (aq) substance is written as its ions: how many of each (the coefficient counts) and the charge. A solid (s) and water (l) stay together. Not graded.' },
    { id: 'mixsolid', part: 2, kind: 'watchSolid', title: 'Watch a solid form',
      text: 'A spectator ion is in the solution, unchanged, before and after mixing: it watches but takes no part. Predict first, then press Pour. Tap any ion to name it.' },
    { id: 'exsolid', part: 2, kind: 'ladder', l: Gen.LESSON.exSolid, title: 'Net ionic equation: a solid forms',
      text: 'The five steps every problem has: balance, states, the complete ionic equation, strike out the spectators, and what is left is the net ionic equation. Not graded.' },
    { id: 'mixwater', part: 3, kind: 'watchWater', title: 'Watch water form',
      text: 'An acid and a base. Predict first, then press Pour.' },
    { id: 'exwater', part: 3, kind: 'ladder', l: Gen.LESSON.exWater, title: 'Net ionic equation: water forms',
      text: 'The same five steps. At the end, write the net ionic equation in the lowest whole numbers. Not graded.' },
    { id: 'mixnone', part: 4, kind: 'watchNone', title: 'Watch nothing happen',
      text: 'Predict first, then press Pour.' },
    { id: 'exnone', part: 4, kind: 'ladder', l: Gen.LESSON.exNone, title: 'Net ionic equation: or is there one?',
      text: 'The same five steps. Be ready for either answer. Not graded.' },
    { id: 'quiz', part: 5, kind: 'quiz', title: 'Graded questions',
      text: Gen.QUIZ + ' questions. Click a choice to select it (you can change it), then press Submit answer. Your first Submit counts.' },
    { id: 'set', part: 5, kind: 'set', title: 'Graded problems',
      text: Gen.COUNT + ' problems, none from the lesson; some have no reaction, and the last is a challenge. Every step is a point: your first answer counts.' },
    { id: 'results', part: 6, kind: 'results', title: 'Results', text: '' }
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
  ['aq', 'split', 'watchSolid', 'watchWater', 'watchNone'].forEach(function (name) {
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
    var p = Net.make(s.l[0], s.l[1]);
    p.rungs = Gen.RUNGS.slice();
    ctl = Ladder.create(el.stage, p, work, {
      graded: false, hints: true, onSave: persist,
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
    var byRung = Gen.RUNGS.map(function (r) {
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
      'A dissolved salt, strong acid or strong base is its ions, apart, in the ratio of the formula: (aq). A solid (s) and water (l) stay together.',
      'Complete ionic equation: write every (aq) substance as its ions. The coefficient counts: 3 CaCl₂(aq) is 3 Ca²⁺ + 6 Cl⁻.',
      'A spectator is an ion that is in the solution, unchanged, on both sides. Strike it out on both sides.',
      'The net ionic equation is what is left, in the lowest whole numbers, with states.',
      'Every strong acid with every strong base: H⁺(aq) + OH⁻(aq) → HOH(l).',
      'If no solid and no water form, every ion is a spectator: no reaction.'
    ];
    el.stage.appendChild(h('div', { class: 'grid2' }, [box, panel('Big ideas', null, [h('ul', { class: 'keylist' }, ideas.map(function (t) { return h('li', { text: t }); }))])]));
    el.stage.appendChild(panel('Your problems', '★ every step right the first time', [h('ol', { class: 'q-review' }, list.map(function (p, i) {
      var w = state.p[i] || {};
      return h('li', { class: clean(i) ? 'right' : 'wrong' }, [
        h('span', { class: 'mark', text: clean(i) ? '★' : '✓' }),
        h('div', { class: 'review-body' }, [h('b', { class: 'eq-line', text: Net.netText(p) }), h('span', { class: 'muted', text: '  (' + Net.molecularText(p) + ')' }),
          h('span', { class: 'muted', text: '  ' + p.rungs.map(function (r) { return Ladder.NAMES[r] + ' ' + (w.g && w.g[r] === 1 ? '★' : '✓'); }).join(', ') }),
          h('p', { class: 'muted', text: Net.why(p) })])
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
      h('p', { text: 'When two solutions are mixed, some ions may come together and some just keep moving. You will see it in a beaker drawn to scale, then write it the chemist\'s way:' }),
      h('ul', { class: 'screen-list' }, [
        h('li', null, [h('b', { text: 'Complete ionic equation: ' }), 'every dissolved substance written as its ions.']),
        h('li', null, [h('b', { text: 'Net ionic equation: ' }), 'only what changes: a solid forms, water forms, or no reaction.'])
      ]),
      h('p', { text: 'The solubility rules and the strong acids and bases stay beside your work. The lesson comes first and is not graded. Then ' + Gen.QUIZ +
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
        /* ?done opens that problem finished, with its picture; ?rung=n opens it at its nth step */
        if (params.get('done') != null) {
          var pd = problems()[state.view], gd = {};
          pd.rungs.forEach(function (r) { gd[r] = 1; });
          state.p[state.view] = { r: 1, i: pd.rungs.length, g: gd };
        }
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

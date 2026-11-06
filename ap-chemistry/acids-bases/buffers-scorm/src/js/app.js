/* app.js: the steps, their order, saving, scoring, the checkpoint screen, results.
 * The lesson steps (flasks, sorts, sliders) are in steps.js, which registers its
 * renderers here through App.RENDER.
 *
 * Part 1  The idea: why the pH barely moves, what is in a buffer, buffer or not
 * Part 2  Adding a strong acid: particle walk, which particle takes the H+
 * Part 3  Adding a strong base: the same, then the whole range and where a buffer stops
 * Part 4  The equation: the ratio sets the pH, when it works and when it does not, using it
 * Part 5  A base buffer (NH3 and NH4+) and a review
 *
 * Only the five checkpoints are graded (first answer counts). Predictions,
 * walks, sorts and clicks must be finished to move on but are never scored.
 */

var App = (function () {
  'use strict';

  /* Bump whenever the step list, a quiz pool or the particle counts change: a save
     from an older release is then discarded and the student starts fresh. */
  var SCHEMA = 1;

  var h = UI.h;

  var PARTS = [
    { n: 1, name: 'The idea' },
    { n: 2, name: 'Adding acid' },
    { n: 3, name: 'Adding base' },
    { n: 4, name: 'The equation' },
    { n: 5, name: 'Base buffers' },
    { n: 6, name: 'Results' }
  ];

  var STEPS = [
    { id: 'problem', part: 1, kind: 'problem', title: 'Why does the pH barely move?',
      text: 'Two flasks get the same few drops of strong acid. Predict first, then add it.' },
    { id: 'members', part: 1, kind: 'members', title: 'What is inside a buffer?',
      text: 'Look inside the buffer. Switch between the two kinds and see what they have in common.' },
    { id: 'sort', part: 1, kind: 'sort', title: 'Buffer or not?',
      text: 'Each card is a mixture in water. Sort it: could it be a buffer?' },
    { id: 'quiz-A', part: 1, kind: 'quiz', quiz: 'A', title: 'Checkpoint 1' },

    { id: 'acid-walk', part: 2, kind: 'walk', dir: 'acid', title: 'Adding a strong acid to the buffer',
      text: 'HCl is added to a buffer of acetic acid (HAc) and acetate (Ac⁻). At five points, predict what is in the flask. The particle diagram changes as you go.' },
    { id: 'acid-click', part: 2, kind: 'click', dir: 'acid', title: 'Which particle takes the H⁺?',
      text: 'Click the particle in the buffer that reacts with added H⁺.' },
    { id: 'quiz-B', part: 2, kind: 'quiz', quiz: 'B', title: 'Checkpoint 2' },

    { id: 'base-walk', part: 3, kind: 'walk', dir: 'base', title: 'Adding a strong base to the buffer',
      text: 'NaOH is added to the same buffer. The same five points. Watch which particle changes this time.' },
    { id: 'base-click', part: 3, kind: 'click', dir: 'base', title: 'Which particle takes the OH⁻?',
      text: 'Click the particle in the buffer that reacts with added OH⁻.' },
    { id: 'range', part: 3, kind: 'range', pair: 'AC', title: 'The whole range',
      text: 'Add acid or base all the way to the ends. Where does the buffer work, and where does it stop?' },
    { id: 'quiz-C', part: 3, kind: 'quiz', quiz: 'C', title: 'Checkpoint 3' },

    { id: 'ratio', part: 4, kind: 'ratio', title: 'The ratio sets the pH',
      text: 'Change how much of each member the buffer has and watch the pH. Then meet the equation.' },
    { id: 'when', part: 4, kind: 'when', title: 'Does the equation work here?',
      text: 'The equation is only for buffers. Six flasks: decide for each one.' },
    { id: 'use', part: 4, kind: 'use', title: 'Use the equation after adding acid or base',
      text: 'The reaction first (it changes the amounts), then the equation.' },
    { id: 'quiz-D', part: 4, kind: 'quiz', quiz: 'D', title: 'Checkpoint 4' },

    { id: 'base-buffer', part: 5, kind: 'range', pair: 'NH', title: 'A base buffer: the roles swap',
      text: 'NH₃ is a weak base and NH₄⁺ is its conjugate acid. Same idea, swapped roles.' },
    { id: 'quiz-E', part: 5, kind: 'quiz', quiz: 'E', title: 'Checkpoint 5: Review' },

    { id: 'results', part: 6, kind: 'results', title: 'Results', text: '' }
  ];

  var GRADED = Object.keys(QUIZZES).reduce(function (s, k) { return s + QUIZZES[k].draw; }, 0);

  var el = {};
  var state = null;
  var ctl = null;
  var preview = false;
  var RENDER = {};

  /* ---------------------------------------------------------------- helpers */

  function $(id) { return document.getElementById(id); }

  function say(text, kind) {
    el.feedback.textContent = text || '';
    el.feedback.className = 'feedback' + (kind ? ' ' + kind : '');
  }

  function stepIndex(id) {
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === id) return i;
    return -1;
  }

  function rngFor(key) { return UI.rng(state.seed ^ UI.hash(key)); }

  /* ------------------------------------------------------------------ state */

  function newState() {
    var seed = Math.floor(Math.random() * 1e9);
    var rand = UI.rng(seed);
    var draws = {};
    Object.keys(QUIZZES).forEach(function (k) {
      var Q = QUIZZES[k];
      var core = Q.core.slice();
      var rest = UI.shuffle(Q.pool.map(function (q) { return q.id; }).filter(function (id) { return core.indexOf(id) < 0; }), rand);
      var ids = core.concat(rest.slice(0, Q.draw - core.length));
      draws[k] = Q.pool.map(function (q) { return q.id; }).filter(function (id) { return ids.indexOf(id) >= 0; });
    });
    return { v: SCHEMA, seed: seed, step: 0, max: 0, draws: draws, ans: {}, pick: {}, done: {}, wk: {}, seen: {}, fin: 0,
             best: 0, att: 1 };
  }

  function restore(saved) {
    if (!saved || !saved.draws || saved.v !== SCHEMA) return null;
    var ok = Object.keys(QUIZZES).every(function (k) {
      return (saved.draws[k] || []).length === QUIZZES[k].draw && saved.draws[k].every(function (id) {
        return QUIZZES[k].pool.some(function (q) { return q.id === id; });
      });
    });
    if (ok) { saved.wk = saved.wk || {}; saved.seen = saved.seen || {}; }
    return ok ? saved : null;
  }

  function persist() { if (!preview) SCORM.saveState(state); }

  function correctCount() {
    return Object.keys(state.ans).reduce(function (s, k) { return s + (state.ans[k] ? 1 : 0); }, 0);
  }
  function attemptPercent() { return 100 * correctCount() / GRADED; }
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
    nav('next', 'disabled', false);
    paintParts();
    if (msg) say(msg, kind || 'good');
  }

  /* ----------------------------------------------------------------- chrome */

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
      }, [p.n < PARTS.length ? p.n + '  ' + p.name : p.name]));
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
    var text = s.kind === 'quiz'
      ? (s.text ? s.text + ' ' : '') + 'Graded: your first answer to each question counts. Read the explanation after each one. ' +
        'The reference is open beside the questions.'
      : s.text;
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

  function panel(title, hint, kids, cls) {
    return h('section', { class: 'panel ' + (cls || '') }, [
      h('div', { class: 'panel-head' }, [h('h3', { text: title }), hint ? h('span', { class: 'hint', text: hint }) : null])
    ].concat(kids || []));
  }

  function reveal(lines) {
    return h('div', { class: 'reveal' }, lines.filter(Boolean).map(function (t) { return h('p', { text: t }); }));
  }

  /* An ungraded question: pick once, the right answer is marked at once.
     opts: kicker, q, choices, answer, chosen (a pick already made), onPick(i) */
  function ask(opts) {
    var box = h('div', { class: 'predict' }, [
      h('p', { class: 'predict-kicker', text: opts.kicker || 'Predict (not graded)' }),
      h('p', { class: 'q-text', text: opts.q })
    ]);
    var row = h('div', { class: 'q-choices' });
    var buttons = [];
    function mark(chosen) {
      buttons.forEach(function (b, i) {
        b.disabled = true;
        if (i === opts.answer) b.classList.add('right'); else if (i === chosen) b.classList.add('wrong');
      });
    }
    opts.choices.forEach(function (c, i) {
      var b = h('button', { type: 'button', class: 'choice', 'data-choice': i }, [h('span', { class: 'choice-text', text: c })]);
      b.addEventListener('click', function () { mark(i); opts.onPick(i); });
      buttons.push(b);
      row.appendChild(b);
    });
    box.appendChild(row);
    if (opts.chosen != null) mark(opts.chosen);
    return box;
  }

  /* right answer first in `list`; returns the choices shuffled and where the right one went */
  function shuffled(list, rand) {
    var order = UI.shuffle(list.map(function (x, i) { return i; }), rand);
    return { choices: order.map(function (i) { return list[i]; }), answer: order.indexOf(0) };
  }

  /* ----------------------------------------------------------------- quiz */

  function question(id) {
    for (var k in QUIZZES) {
      var pool = QUIZZES[k].pool;
      for (var i = 0; i < pool.length; i++) if (pool[i].id === id) return pool[i];
    }
    return null;
  }

  function fmtKa(x) {
    var e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    var sup = String(e).replace('-', '⁻').replace(/\d/g, function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'.charAt(+d); });
    return m.toFixed(1) + ' × 10' + sup;
  }

  function pairTable() {
    var rows = [['CH₃COOH / CH₃COO⁻', 'HAc / Ac⁻', fmtKa(Buf.PAIRS.AC.ka), Buf.pKa('AC').toFixed(2)],
                ['NH₄⁺ / NH₃', 'NH₄⁺ / NH₃', fmtKa(Buf.PAIRS.NH.ka), Buf.pKa('NH').toFixed(2)]];
    return h('div', null, [h('table', { class: 'ref-table', 'aria-label': 'The conjugate pairs in this activity' }, [
      h('tr', null, ['Acid member / base member', 'Short form', 'Ka of the acid', 'pKa'].map(function (t) { return h('th', { text: t }); }))
    ].concat(rows.map(function (r) {
      return h('tr', null, r.map(function (t, i) { return h('td', { class: i > 1 ? 'num' : '', text: t }); }));
    }))), h('p', { class: 'ref-foot', text: 'pH values are at 25 °C. One particle in a diagram stands for 0.010 M. The few drops that are added change the volume too little to matter.' })]);
  }

  function hhWarning() {
    return h('div', { class: 'hh-warn', role: 'note' }, [
      h('p', { class: 'hh-eq', text: 'pH = pKa + log( [base member] / [acid member] )' }),
      h('p', { class: 'hh-rule' }, [h('b', { text: 'Only for a buffer. ' }),
        'Use it only when the solution holds appreciable amounts of BOTH the weak acid and its conjugate base (or the weak base and its conjugate acid). ' +
        'It does not work for a weak acid alone, a weak base alone, a conjugate base alone, or a strong acid or base.'])
    ]);
  }

  function particleKey() {
    return h('ul', { class: 'pkey' }, [
      ['p-ha', 'HAc, NH₄⁺', 'the acid member of the pair'], ['p-a', 'Ac⁻, NH₃', 'the base member of the pair'],
      ['p-na', 'Na⁺', 'sodium ion (a spectator)'], ['p-cl', 'Cl⁻', 'chloride ion (a spectator)'],
      ['p-h', 'H⁺', 'free hydrogen ion'], ['p-oh', 'OH⁻', 'free hydroxide ion']
    ].map(function (r) {
      return h('li', null, [h('span', { class: 'pkey-sw ' + r[0], 'aria-hidden': 'true' }), h('b', { text: r[1] }), ' ' + r[2]]);
    }).concat([h('li', { class: 'muted', text: 'Water is in the flask but is not drawn. HAc stands for CH₃COOH and Ac⁻ for CH₃COO⁻.' })]));
  }

  RENDER.quiz = function (s) {
    var Q = QUIZZES[s.quiz];
    var ids = state.draws[s.quiz];
    var box = h('div', { class: 'quiz' });
    var kids = [h('summary', { text: 'Reference' }), pairTable()];
    if (s.quiz === 'D' || s.quiz === 'E') kids.push(hhWarning());
    kids.push(particleKey());
    var side = h('details', { class: 'reference quiz-table', open: true }, kids);
    el.stage.appendChild(h('div', { class: 'quiz-grid' }, [panel(Q.title, null, [box]), side]));

    function summary() {
      box.innerHTML = '';
      var right = ids.filter(function (id) { return state.ans[id]; }).length;
      box.appendChild(h('p', { class: 'q-summary', text: 'You answered ' + right + ' of ' + ids.length + ' correctly on the first try.' }));
      var ul = h('ul', { class: 'q-review' });
      ids.forEach(function (id) {
        ul.appendChild(h('li', { class: state.ans[id] ? 'right' : 'wrong' }, [
          h('span', { class: 'mark', 'aria-hidden': 'true', text: state.ans[id] ? '✓' : '✗' }),
          h('span', { class: 'sr', text: state.ans[id] ? 'Correct: ' : 'Incorrect: ' }), question(id).q]));
      });
      box.appendChild(ul);
      if (!state.done[s.id]) complete('Checkpoint finished: ' + right + ' / ' + ids.length + '.', 'good');
      else say('Checkpoint finished: ' + right + ' / ' + ids.length + '.', 'good');
    }

    function figure(q) {
      if (q.diagram) {
        var d = Flask.create(q.diagram.pair);
        d.set(q.diagram.ha, q.diagram.a, q.diagram.x);
        var P = Buf.PAIRS[q.diagram.pair];
        var cap = (q.diagram.x > 0 ? q.diagram.x + ' HCl added' : (q.diagram.x < 0 ? -q.diagram.x + ' NaOH added' : 'nothing added')) +
          ' to ' + q.diagram.ha + ' ' + P.ha + (q.diagram.a ? ' and ' + q.diagram.a + ' ' + P.a : '');
        return h('figure', { class: 'q-fig q-flask' }, [d.node, h('figcaption', { text: cap })]);
      }
      if (q.curve) {
        var c = PHCurve.create({ series: q.curve.series });
        return h('figure', { class: 'q-fig q-curve' }, [c.node]);
      }
      return null;
    }

    function next(n) {
      var id = ids[n];
      if (id == null) { summary(); return; }
      if (state.ans[id] != null) { next(n + 1); return; }
      var q = question(id);
      var order = UI.shuffle(q.choices.map(function (c, i) { return i; }), UI.rng(state.seed ^ UI.hash(id)));
      box.innerHTML = '';
      say('');
      box.appendChild(h('p', { class: 'q-count', text: 'Question ' + (n + 1) + ' of ' + ids.length }));
      var fig = figure(q);
      var qtext = h('p', { class: 'q-text', text: q.q });
      box.appendChild(h('div', { class: 'q-top' }, [fig ? fig : null, qtext]));
      var rowN = h('div', { class: 'q-choices' });
      var why = h('p', { class: 'q-why', hidden: true });
      var nextBtn = h('button', { type: 'button', class: 'primary', hidden: true, text: n + 1 < ids.length ? 'Next question →' : 'Finish checkpoint' });
      order.forEach(function (ci, pos) {
        var letter = String.fromCharCode(65 + pos);
        var b = h('button', { type: 'button', class: 'choice', 'data-choice': ci }, [
          h('span', { class: 'choice-letter', text: letter }), h('span', { class: 'choice-text', text: q.choices[ci] })]);
        b.addEventListener('click', function () { answer(ci); });
        rowN.appendChild(b);
      });
      box.appendChild(rowN);
      box.appendChild(why);
      box.appendChild(h('div', { class: 'btnrow' }, [nextBtn]));
      function answer(ci) {
        if (state.ans[id] != null) return;
        var right = ci === 0;
        state.ans[id] = right ? 1 : 0;
        state.pick[id] = ci;
        persist();
        reportScore();
        if (!preview) SCORM.recordAnswer(id, String.fromCharCode(97 + ci), 'a', right);
        var nodes = rowN.querySelectorAll('.choice');
        for (var i = 0; i < nodes.length; i++) {
          var c = +nodes[i].getAttribute('data-choice');
          nodes[i].disabled = true;
          if (c === 0) nodes[i].classList.add('right'); else if (c === ci) nodes[i].classList.add('wrong');
        }
        why.hidden = false;
        why.textContent = q.why;
        say(right ? 'Correct.' : 'Not quite. The correct answer is highlighted.', right ? 'good' : 'bad');
        paintParts();
        nextBtn.hidden = false;
        nextBtn.focus({ preventScroll: true });
      }
      nextBtn.addEventListener('click', function () { next(n + 1); });
    }
    next(0);
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
    var right = correctCount(), pct = Math.round(100 * right / GRADED), best = Math.round(state.best || 0);
    var rows = Object.keys(QUIZZES).map(function (k) {
      var ids = state.draws[k], r = ids.filter(function (id) { return state.ans[id]; }).length;
      return h('tr', null, [h('td', { text: QUIZZES[k].title }), h('td', { class: 'num', text: r + ' / ' + ids.length })]);
    });
    var box = panel(state.att > 1 ? 'Attempt ' + state.att : 'Your score', null, [
      h('p', { class: 'big-score', text: right + ' / ' + GRADED + '  (' + pct + '%)' }),
      h('table', { class: 'ref-table' }, rows),
      state.att > 1 ? h('p', { class: 'best-line', text: 'Best attempt: ' + best + '%' + (best > pct ? '. That is the score the gradebook keeps.' : '') }) : null,
      h('p', { class: 'muted', text: SCORM.isConnected()
        ? 'Your ' + (state.att > 1 ? 'best ' : '') + 'score has been sent to the gradebook and the activity is marked complete.'
        : 'Standalone mode: nothing was sent to a gradebook.' })
    ]);
    var ideas = panel('Big ideas', null, [h('ul', { class: 'keylist' }, [
      'A buffer is a weak acid with its conjugate base, or a weak base with its conjugate acid, with appreciable amounts of both.',
      'Added strong acid reacts with the base member: H⁺ + Ac⁻ → HAc. Added strong base reacts with the acid member: OH⁻ + HAc → Ac⁻ + H₂O.',
      'The added H⁺ or OH⁻ is used up, so almost none stays free. The ratio of base member to acid member changes only a little, so the pH changes only a little.',
      'A buffer has a limit. When one member is used up, nothing is left to absorb more, and the pH changes sharply.',
      'pH = pKa + log([base member] / [acid member]). Equal amounts give pH = pKa.',
      'The equation is only for a buffer. It needs appreciable amounts of BOTH members. It does not work for a weak acid alone, a conjugate base alone, or a strong acid.',
      'When acid or base is added, do the reaction first (it changes the amounts), then use the equation with the new amounts.'
    ].map(function (t) { return h('li', { text: t }); }))]);
    el.stage.appendChild(h('div', { class: 'grid2' }, [box, ideas]));
    var again = h('button', { type: 'button', class: 'primary', text: 'Start a new attempt' });
    var sure = h('div', { class: 'confirm', hidden: true }, [
      h('p', { text: 'This clears all your answers and predictions and gives you a new set of checkpoint questions. Your ' +
                     'best score so far (' + Math.max(best, pct) + '%) stays in the gradebook.' }),
      h('div', { class: 'btnrow' }, [
        h('button', { type: 'button', class: 'primary', text: 'Yes, start again', onclick: newAttempt }),
        h('button', { type: 'button', class: 'ghostbtn', text: 'Cancel', onclick: function () { sure.hidden = true; again.hidden = false; again.focus(); } })
      ])
    ]);
    again.addEventListener('click', function () { again.hidden = true; sure.hidden = false; sure.querySelector('.primary').focus(); });
    el.stage.appendChild(panel('Try it again?', null, [
      h('p', { class: 'muted', text: 'You can redo the whole activity with new checkpoint questions. Parts you have already reached stay open.' }),
      h('div', { class: 'btnrow' }, [again]), sure]));
    say('Activity complete.', 'good');
  };

  /* --------------------------------------------------------- references */

  function buildReference() {
    el.pairBody.appendChild(pairTable());
    el.keyBody.appendChild(particleKey());
    var dl = h('dl', { class: 'vocab' });
    [
      ['Buffer', 'A solution that resists a change in pH when a small amount of strong acid or strong base is added. It holds a weak acid and its conjugate base (or a weak base and its conjugate acid), with appreciable amounts of both.'],
      ['Conjugate pair', 'An acid and the base that is left when it gives away one H⁺: HAc and Ac⁻, or NH₄⁺ and NH₃. In this activity they are called the acid member and the base member.'],
      ['Acid member, base member', 'The two halves of a buffer. The base member takes added H⁺. The acid member takes added OH⁻.'],
      ['Spectator ion', 'An ion that is in the flask but takes no part in the reaction, such as Na⁺ and Cl⁻.'],
      ['Buffer capacity', 'How much strong acid or base a buffer can absorb before one member is used up. More of each member means more capacity.'],
      ['pKa', 'A number that measures how weak an acid is. The larger the pKa, the weaker the acid. When the acid member and the base member are equal in amount, pH = pKa.'],
      ['Henderson-Hasselbalch equation', 'pH = pKa + log([base member] / [acid member]). Only for a buffer: it needs appreciable amounts of BOTH members.']
    ].forEach(function (p) { dl.appendChild(h('dt', { text: p[0] })); dl.appendChild(h('dd', { text: p[1] })); });
    el.vocabBody.appendChild(dl);
    el.vocabBody.appendChild(hhWarning());
  }

  /* ------------------------------------------------------------------ boot */

  function showIntro() {
    var box = h('div', { class: 'screen-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'introTitle' }, [
      h('h2', { id: 'introTitle', text: 'Buffer Solution Visualization' }),
      h('p', { text: 'Add a few drops of strong acid to pure water and the pH crashes. Add the same drops to a buffer and the pH hardly moves. ' +
                     'You will watch the particles to see why.' }),
      h('ul', { class: 'screen-list' }, [
        h('li', { text: 'Part 1, The idea: what a buffer is made of.' }),
        h('li', { text: 'Part 2, Adding acid: which particle takes the H⁺.' }),
        h('li', { text: 'Part 3, Adding base, and where a buffer stops working.' }),
        h('li', { text: 'Part 4, The Henderson-Hasselbalch equation, and when it can be used.' }),
        h('li', { text: 'Part 5, A base buffer, and a review.' })
      ]),
      h('p', { text: 'Predictions are never graded, so try things. The five checkpoints are graded: your first answer to each ' +
                     'question counts. Your progress is saved if you leave.' }),
      h('p', { class: 'screen-note', text: 'Everything works with a mouse, a touch screen or the keyboard (Tab, Enter, and the arrow keys on a slider).' })
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
     'score', 'lms', 'screen', 'pairBody', 'keyBody', 'vocabBody'].forEach(function (id) { el[id] = $(id); });
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
      /* ?all: a checkpoint shows every question of its pool, to preview the whole bank */
      if (params.has('all')) Object.keys(QUIZZES).forEach(function (k) { state.draws[k] = QUIZZES[k].pool.map(function (q) { return q.id; }); });
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

  /* what steps.js needs; read lazily so a restored or reset state is always the current one */
  var ctx = {
    el: function () { return el; }, state: function () { return state; }, say: say, panel: panel, reveal: reveal, ask: ask,
    shuffled: shuffled, complete: complete, persist: persist, rngFor: rngFor, hhWarning: hhWarning, h: h
  };

  return { start: start, SCHEMA: SCHEMA, STEPS: STEPS, GRADED: GRADED, PARTS: PARTS, RENDER: RENDER, ctx: ctx,
           state: function () { return state; }, ctl: function () { return ctl; } };
})();

document.addEventListener('DOMContentLoaded', App.start);

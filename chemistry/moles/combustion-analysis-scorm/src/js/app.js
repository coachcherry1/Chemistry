/* app.js: the steps, their order, saving, scoring.
 *
 * Three packages share this file; config.js names the mode:
 *   empirical   empirical formulas from percents and grams, then molecular
 *               formulas from a molar mass (8 graded problems)
 *   hydrate     the formula and name of a hydrate (6 graded problems)
 *   combustion  a hydrocarbon's empirical and molecular formula from the CO2
 *               and H2O it makes, C and H only (6 graded problems)
 * Every one: the teacher's four steps shown as a worked example, ungraded
 * warm-ups, the fraction finder and three drills for Multiply if not whole,
 * then the graded set and the results.
 *
 * Grading (the teacher's choice): the first Check of every step of every
 * graded problem counts. The score is the steps right on the first check out
 * of all the steps (4 per problem, 5 with a molecular formula or a hydrate's
 * name), sent as cmi.core.score.raw (0 to 100) after every step, with one
 * cmi.interactions record per step. Retakes give new problems; the gradebook
 * keeps the best.
 */
var App = (function () {
  'use strict';

  /* Bump whenever the steps, the plan, a compound or an atomic mass changes:
     a save from an older release is then discarded. */
  var SCHEMA = 1;

  var h = UI.h;
  var MODE = CONFIG.mode;
  var EX = Gen.example();

  var WHAT = {
    empirical: { part1: 'The four steps', thing: 'compound', one: 'empirical formula' },
    hydrate: { part1: 'Hydrates', thing: 'hydrate', one: 'hydrate formula' },
    combustion: { part1: 'Combustion', thing: 'hydrocarbon', one: 'empirical formula' }
  }[MODE];

  function exampleText() {
    if (MODE === 'empirical') return 'Four steps find every empirical formula. Press Show step to watch each column of the table fill in, one step at a time.';
    if (MODE === 'hydrate') return 'The same four steps work for a hydrate: the two parts are the anhydrous salt and the water. ' +
      'Press Show step to watch each column fill in.';
    return 'The same four steps work for combustion analysis: the grams of CO₂ and H₂O give the moles of C and H. Press Show step to watch.';
  }

  var DRILLS = [
    { id: 'finder', kind: 'finder', title: 'The fraction finder',
      text: 'Multiply if not whole: when a quotient is not within 0.1 of a whole number, its decimal part is a fraction, and the fraction ' +
            'says what to multiply by. Put each quotient on the fraction finder. Not graded.' },
    { id: 'd-frac', kind: 'dfrac', title: 'Name the fraction',
      text: 'For each quotient: the fraction its decimal part is, the number to multiply by, and the whole number it gives. Not graded.' },
    { id: 'd-whole', kind: 'dwhole', title: 'Whole or not?',
      text: 'Within 0.1 of a whole number: round it. Otherwise: multiply. Choose for every card, then Check. Not graded.' },
    { id: 'd-all', kind: 'dall', title: 'Multiply them all',
      text: 'One number for every row: if one quotient needs × 3, every row is multiplied by 3, even the ones already whole. Not graded.' }
  ];

  function warmStep(id, part, title, text) { return { id: id, part: part, kind: 'warm', title: title, text: text + ' Not graded.' }; }
  var NSTEP = { id: 'nmean', part: 3, kind: 'nmean', title: 'Molecular formulas',
    text: 'One empirical formula can belong to several molecules. The molar mass tells which: n = molar mass ÷ empirical formula mass, ' +
          'then every subscript × n.' };

  var PARTS, STEPS;
  if (MODE === 'empirical') {
    PARTS = ['The four steps', 'Multiply if not whole', 'Molecular formulas', 'Graded problems', 'Results'];
    STEPS = [
      { id: 'four', part: 1, kind: 'example', title: 'The four steps', text: exampleText() },
      warmStep('w-whole', 1, 'Warm-up: from percents', 'Your turn. Every quotient will come out whole in this one.'),
      warmStep('w-grams', 1, 'Warm-up: from grams', 'This one gives grams, not percents: Step 1 keeps the grams.'),
      DRILLS[0], DRILLS[1], DRILLS[2], DRILLS[3],
      warmStep('w-mult', 2, 'Warm-up: multiply if not whole', 'A whole problem where Step 4 needs a multiplier.'),
      NSTEP,
      warmStep('w-mol', 3, 'Warm-up: a molecular formula', 'The four steps give the empirical formula; Step 5 the molecular formula.')
    ];
  } else if (MODE === 'hydrate') {
    PARTS = ['Hydrates', 'Multiply if not whole', 'Graded problems', 'Results'];
    STEPS = [
      { id: 'heat', part: 1, kind: 'heat', title: 'What is a hydrate?', text: 'Heat a hydrate and weigh it. Make the prediction first.' },
      { id: 'four', part: 1, kind: 'example', title: 'The four steps for a hydrate', text: exampleText() },
      warmStep('w-pct', 1, 'Warm-up: percent water', 'Percents again: assume 100 g of the hydrate.'),
      warmStep('w-heat', 1, 'Warm-up: before and after heating', 'Grams this time: the water is the mass lost.'),
      DRILLS[0], DRILLS[1], DRILLS[2], DRILLS[3],
      warmStep('w-lab', 2, 'Warm-up: crucible data', 'Lab data: subtract to find each part’s grams.')
    ];
  } else {
    PARTS = ['Combustion', 'Multiply if not whole', 'Molecular formulas', 'Graded problems', 'Results'];
    STEPS = [
      { id: 'burn', part: 1, kind: 'burn', title: 'What burning does', text: 'Burn a molecule of propane and count where its atoms go.' },
      { id: 'four', part: 1, kind: 'example', title: 'The four steps for combustion', text: exampleText() },
      warmStep('w-whole', 1, 'Warm-up: a combustion problem', 'Your turn. Every quotient will come out whole in this one.'),
      DRILLS[0], DRILLS[1], DRILLS[2], DRILLS[3],
      warmStep('w-mult', 2, 'Warm-up: multiply if not whole', 'A whole problem where Step 4 needs a multiplier.'),
      NSTEP,
      warmStep('w-mol', 3, 'Warm-up: a molecular formula', 'The four steps give the empirical formula; Step 5 the molecular formula.')
    ];
  }
  var SET_PART = PARTS.length - 1;
  STEPS.push({ id: 'set', part: SET_PART, kind: 'set', title: 'Graded problems',
    text: Gen.PLAN.length + ' problems. The first Check of every step counts, so work each step out before you check it. Hints are free; ' +
          'an empty box or a number rounded too far is not marked wrong.' });
  STEPS.push({ id: 'results', part: PARTS.length, kind: 'results', title: 'Results', text: '' });

  var GRADED = Gen.PLAN.length;

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
    return { v: SCHEMA, seed: Math.floor(Math.random() * 1e9), step: 0, max: 0, done: {}, w: {}, d: {}, p: [], view: 0, fin: 0, best: 0, att: 1 };
  }
  function restore(saved) {
    if (!saved || saved.v !== SCHEMA || typeof saved.seed !== 'number' || !Array.isArray(saved.p)) return null;
    try { Gen.set(saved.seed); } catch (e) { return null; }
    saved.done = saved.done || {}; saved.w = saved.w || {}; saved.d = saved.d || {};
    return saved;
  }
  function problems() { return Gen.set(state.seed); }

  /* A finished problem keeps only what the score and the results need. */
  function compact(work) { return work && work.r ? { r: 1, s: work.s, g: work.g } : work; }
  function persist() {
    if (preview) return;
    state.p = state.p.map(compact);
    /* a warm-up done before keeps only that, unless it is open right now */
    var here = STEPS[state.step] && STEPS[state.step].id;
    Object.keys(state.w).forEach(function (k) {
      var w = state.w[k];
      if (w && (w.r || (state.done[k] && k !== here))) state.w[k] = { r: 1 };
    });
    SCORM.saveState(state);
  }

  function totalSteps() { return problems().reduce(function (t, p) { return t + p.steps.length; }, 0); }
  function rightSteps() {
    var list = problems(), n = 0;
    list.forEach(function (p, i) {
      var w = state.p[i];
      if (!w) return;
      p.steps.forEach(function (s, j) { if (j < (w.s || 0) && w.g && w.g[s] === 1) n++; });
    });
    return n;
  }
  function solvedCount() { var n = 0; for (var i = 0; i < GRADED; i++) if (state.p[i] && state.p[i].r) n++; return n; }
  function current() { for (var i = 0; i < GRADED; i++) if (!(state.p[i] && state.p[i].r)) return i; return GRADED; }
  function attemptPercent() { return 100 * rightSteps() / totalSteps(); }
  function reportScore() { if (!preview) SCORM.setScore(Math.max(state.best || 0, attemptPercent())); }
  function perfect(i) {
    var w = state.p[i], p = problems()[i];
    return !!(w && w.r && p.steps.every(function (s) { return w.g[s] === 1; }));
  }

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
    var tot = totalSteps();
    el.score.textContent = 'Score: ' + rightSteps() + ' / ' + tot + ' steps' + (state.att > 1 ? '  ·  best ' + Math.round(state.best || 0) + '%' : '');
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
  function cbFor() {
    return { save: persist, say: say, complete: function (msg) { complete(msg); } };
  }
  RENDER.finder = function (s) { var st = state.d[s.id] || (state.d[s.id] = {}); after(s, Drills.finderStep(el.stage, st, cbFor(s.id))); };
  RENDER.dfrac = function (s) { var st = state.d[s.id] || (state.d[s.id] = {}); after(s, Drills.fracDrill(el.stage, st, state.seed, cbFor(s.id))); };
  RENDER.dwhole = function (s) { var st = state.d[s.id] || (state.d[s.id] = {}); after(s, Drills.wholeDrill(el.stage, st, state.seed, cbFor(s.id))); };
  RENDER.dall = function (s) { var st = state.d[s.id] || (state.d[s.id] = {}); after(s, Drills.allDrill(el.stage, st, state.seed, cbFor(s.id))); };
  RENDER.heat = function (s) { var st = state.d[s.id] || (state.d[s.id] = {}); after(s, Scenes.heat(el.stage, st, cbFor(s.id))); };
  RENDER.burn = function (s) { var st = state.d[s.id] || (state.d[s.id] = {}); after(s, Scenes.burn(el.stage, st, cbFor(s.id))); };
  RENDER.nmean = function (s) { var st = state.d[s.id] || (state.d[s.id] = {}); after(s, Scenes.nmean(el.stage, st, cbFor(s.id))); };
  function after(s, r) {
    if (r && r.done && !state.done[s.id]) complete();
    if (state.done[s.id]) nav('next', 'disabled', false);
  }

  /* ---- the worked example: the same table, filled one step at a time */

  RENDER.example = function (s) {
    ctl = Work.create(el.stage, EX, {}, { demo: true, onSave: function () {}, onResolve: function () {
      complete('That is the whole routine: percents to grams, grams to moles, divide by small, multiply if not whole.');
    } });
    if (state.done.four) nav('next', 'disabled', false);
  };

  /* ---- warm-ups: one problem each, ungraded */

  RENDER.warm = function (s) {
    var p = Gen.warm(state.seed, s.id);
    /* a finished warm-up keeps only that it was done; it opens fresh to try again */
    var work = state.w[s.id];
    if (!work || work.r) work = state.w[s.id] = {};
    var wasDone = state.done[s.id];
    ctl = Work.create(el.stage, p, work, {
      graded: false,
      onSave: function () { persist(); },
      onResolve: function () { complete('Done. Press Next.'); }
    });
    if (wasDone) { nav('next', 'disabled', false); say('Done already: you can work it again, or press Next.', null); }
  };

  /* ---- the graded set */

  RENDER.set = function () {
    var list = problems();
    var cur = current();
    var view = Math.min(state.view != null ? state.view : cur, cur, GRADED - 1);
    if (cur < GRADED && !(state.p[view] && state.p[view].r)) view = cur;
    state.view = view;
    var strip = h('nav', { class: 'pstrip', 'aria-label': 'Problems' });
    list.forEach(function (p, i) {
      var w = state.p[i], r = w && w.r;
      var star = perfect(i);
      var what = r ? (star ? 'every step right on the first check' : 'done') : i === cur ? 'current' : 'not reached';
      strip.appendChild(h('button', {
        type: 'button', class: 'pnum' + (r ? (star ? ' first' : ' right') : '') + (i === view ? ' on' : ''),
        disabled: i > cur, 'aria-label': 'Problem ' + (i + 1) + ': ' + what, 'aria-current': i === view ? 'true' : null,
        title: what, onclick: function () { state.view = i; goTo(state.step); }
      }, [String(i + 1) + (r ? (star ? '★' : '✓') : '')]));
    });
    el.stage.appendChild(strip);
    el.counter.textContent = 'Problem ' + (view + 1) + ' of ' + GRADED + '  ·  step ' + (state.step + 1) + ' of ' + STEPS.length;
    var p = list[view];
    var work = state.p[view] || (state.p[view] = {});
    if (work.r && !work.v) {
      /* a finished problem: show its answer and solution */
      el.stage.appendChild(reviewCard(p, work, view));
      if (solvedCount() >= GRADED) nav('next', 'disabled', false);
      return;
    }
    var last = view === GRADED - 1;
    ctl = Work.create(el.stage, p, work, {
      graded: true,
      onSave: function () { persist(); },
      onStep: function (stepName, right, sum) {
        if (!preview) SCORM.recordAnswer(p.id + '_' + (p.steps.indexOf(stepName) + 1) + stepName, sum.typed, sum.want, right);
        reportScore();
        paintParts();
      },
      onResolve: function () {
        reportScore();
        persist();
        paintParts();
        var mark = strip.children[view];
        if (mark) { var star = perfect(view); mark.className = 'pnum on' + (star ? ' first' : ' right'); mark.textContent = String(view + 1) + (star ? '★' : '✓'); }
        if (strip.children[view + 1]) strip.children[view + 1].disabled = false;
        if (solvedCount() >= GRADED) complete();
      },
      next: { label: last ? 'See your results →' : 'Next problem →', onClick: function () {
        if (last) { if (solvedCount() >= GRADED) goTo(state.step + 1); return; }
        state.view = view + 1;
        goTo(state.step);
      } }
    });
    if (solvedCount() >= GRADED) nav('next', 'disabled', false);
  };

  function stepMarks(p, w) {
    return p.steps.map(function (s, j) {
      var ok = w && w.g && w.g[s] === 1 && j < (w.s || 0);
      return h('span', { class: 'smark' + (ok ? ' ok' : ''), title: Work.STEP_NAMES[s] + (ok ? ': right on the first check' : ': fixed after a miss') },
        [(j + 1) + (ok ? '★' : '✓')]);
    });
  }
  function reviewCard(p, w, i) {
    var how = h('div', { class: 'review-solution' });
    how.innerHTML = Work.solutionHTML(p);
    var last = i === GRADED - 1;
    return panel('Problem ' + (i + 1), 'done', [
      h('p', { class: 'prompt' }, [p.promptText]),
      h('p', null, [h('b', { text: p.answerText + '. ' }), h('span', { class: 'steps-row' }, stepMarks(p, w))]),
      h('details', { open: true }, [h('summary', { text: 'Worked solution' }), how]),
      h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary', text: last ? 'See your results →' : 'Next problem →', onclick: function () {
        if (last) { if (solvedCount() >= GRADED) goTo(state.step + 1); return; }
        state.view = i + 1; goTo(state.step);
      } })])
    ]);
  }

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
    var list = problems();
    var right = rightSteps(), tot = totalSteps(), pct = Math.round(100 * right / tot), best = Math.round(state.best || 0);
    var names = ['grams', 'moles', 'divide', 'multiply', 'molecular', 'name'];
    var bySteps = names.map(function (s) {
      var idx = list.map(function (p, i) { return p.steps.indexOf(s) >= 0 ? i : -1; }).filter(function (i) { return i >= 0; });
      if (!idx.length) return null;
      var r = idx.filter(function (i) { return state.p[i] && state.p[i].g && state.p[i].g[s] === 1; }).length;
      return h('tr', null, [h('td', { text: 'Step ' + (names.indexOf(s) < 4 ? names.indexOf(s) + 1 : 5) + ': ' + Work.STEP_NAMES[s] }),
        h('td', { class: 'num', text: r + ' / ' + idx.length })]);
    }).filter(Boolean);
    var box = panel(state.att > 1 ? 'Attempt ' + state.att : 'Your score', null, [
      h('p', { class: 'big-score', text: right + ' / ' + tot + ' steps  (' + pct + '%)' }),
      h('p', { class: 'muted', text: 'Steps right on the first check, by step:' }),
      h('table', { class: 'ref-table' }, bySteps),
      state.att > 1 ? h('p', { class: 'best-line', text: 'Best attempt: ' + best + '%' + (best > pct ? '. That is the score the gradebook keeps.' : '') }) : null,
      h('p', { class: 'muted', text: SCORM.isConnected()
        ? 'Your ' + (state.att > 1 ? 'best ' : '') + 'score has been sent to the gradebook and the activity is marked complete.'
        : 'Standalone mode: nothing was sent to a gradebook.' })
    ]);
    var review = h('ol', { class: 'q-review' }, list.map(function (p, i) {
      var w = state.p[i] || {};
      var how = h('div', { class: 'review-solution' });
      how.innerHTML = Work.solutionHTML(p);
      return h('li', { class: perfect(i) ? 'right' : 'wrong' }, [
        h('span', { class: 'mark', text: perfect(i) ? '★' : '✓' }),
        h('div', { class: 'review-body' }, [
          h('span', null, [p.promptText + ' ', h('b', { text: p.answerText })]),
          h('div', { class: 'steps-row' }, stepMarks(p, w)),
          h('details', null, [h('summary', { text: 'Worked solution' }), how])
        ])
      ]);
    }));
    var ideas = [
      'Percents to grams: given percents, assume a 100 g sample, so 40.0% is 40.0 g.',
      'Grams to moles: grams ÷ molar mass (to the tenths place). Keep at least 3 significant figures.',
      'Divide by small: every mole value ÷ the smallest one, to two decimal places.',
      'Multiply if not whole: within 0.1 of a whole number, round. Otherwise the decimal is a fraction: .50 × 2; .33 .67 × 3; .25 .75 × 4; ' +
        '.20 .40 .60 .80 × 5. Multiply EVERY row by the same number.'
    ];
    if (MODE === 'hydrate') {
      ideas.push('A hydrate’s two parts are the anhydrous salt and the water; the water is the mass lost on heating. Heat to constant mass.');
      ideas.push('The name counts the waters: mono, di, tri, tetra, penta, hexa, hepta, octa, nona, deca + hydrate.');
    } else {
      if (MODE === 'combustion') ideas.push('Combustion: every C ends up in a CO₂ (mol C = mol CO₂ × 1) and every H in an H₂O (mol H = mol H₂O × 2).');
      ideas.push('Molecular formula: n = molar mass ÷ empirical formula mass; every subscript × n.');
    }
    el.stage.appendChild(h('div', { class: 'grid2' }, [box, panel('Big ideas', null, [h('ul', { class: 'keylist' }, ideas.map(function (t) { return h('li', { text: t }); }))])]));
    el.stage.appendChild(panel('Your problems', '★ every step right on the first check; the step marks show which steps were', [review]));
    var again = h('button', { type: 'button', class: 'primary', text: 'Start a new attempt' });
    var sure = h('div', { class: 'confirm', hidden: true }, [
      h('p', { text: 'This gives you ' + GRADED + ' new problems and new warm-ups. Your best score so far (' + Math.max(best, pct) + '%) stays in the gradebook.' }),
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
    var lead = {
      empirical: 'Find the empirical formula of a compound from its percent composition or from grams, and then its molecular formula from its molar mass.',
      hydrate: 'Find the formula of a hydrate, a salt with water in its crystal, from percent water or from masses before and after heating, and name it.',
      combustion: 'Burn an unknown hydrocarbon (only C and H) and use the grams of CO₂ and H₂O to find its empirical formula, and then its molecular formula.'
    }[MODE];
    var box = h('div', { class: 'screen-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'introTitle' }, [
      h('h2', { id: 'introTitle', text: document.title }),
      h('p', { text: lead + ' Every problem uses the same four steps:' }),
      h('ol', { class: 'screen-list' }, [
        h('li', null, [h('b', { text: 'Percents to grams: ' }), 'given percents, assume a 100 g sample.']),
        h('li', null, [h('b', { text: 'Grams to moles: ' }), 'divide by the molar mass (to the tenths place).']),
        h('li', null, [h('b', { text: 'Divide by small: ' }), 'divide every mole value by the smallest one.']),
        h('li', null, [h('b', { text: 'Multiply if not whole: ' }), 'read the decimal as a fraction and multiply every value until all are whole.'])
      ]),
      h('p', { text: 'Warm-ups and drills come first and are not graded. Then ' + GRADED + ' graded problems: the first Check of every step counts. ' +
                     'About ' + CONFIG.minutes + ' minutes. Your progress is saved if you leave.' }),
      h('p', { class: 'screen-note', text: 'Everything works with a mouse, a touch screen or the keyboard (Tab between boxes, Enter to check).' })
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
     'score', 'lms', 'screen', 'ptTop'].forEach(function (id) { el[id] = $(id); });
    var connected = SCORM.init();
    el.lms.textContent = connected ? 'Connected to the LMS' : 'Standalone: no LMS detected';
    el.lms.className = 'lms ' + (connected ? 'on' : 'off');
    el.ptTop.addEventListener('click', function () { Ptable.toggle(el.ptTop); });
    Ptable.onChange(function (open) {
      el.ptTop.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open && ctl && ctl.reveal) ctl.reveal();
    });
    var params = new URLSearchParams(location.search);
    var jump = params.get('step');
    if (jump != null) {
      preview = true;
      state = newState();
      if (params.get('seed')) state.seed = +params.get('seed');
      state.max = STEPS.length - 1;
      var idx = /^\d+$/.test(jump) ? +jump - 1 : stepIndex(jump);
      state.step = Math.max(0, Math.min(STEPS.length - 1, idx < 0 ? 0 : idx));
      if (params.get('problem')) state.view = Math.max(0, Math.min(GRADED - 1, +params.get('problem') - 1));
      if (state.view && STEPS[state.step].kind === 'set') {
        for (var k = 0; k < state.view; k++) state.p[k] = { r: 1, s: problems()[k].steps.length, g: {} };
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

  return { start: start, SCHEMA: SCHEMA, STEPS: STEPS, PARTS: PARTS, GRADED: GRADED, problems: function () { return problems(); },
           state: function () { return state; }, ctl: function () { return ctl; }, totalSteps: totalSteps, rightSteps: rightSteps };
})();

document.addEventListener('DOMContentLoaded', App.start);

/* app.js: the steps, their order, saving, scoring.
 *
 * Mole conversions by dimensional analysis, for honors chemistry. Part 1 is
 * Mole Town (the map and its four roads) and four ungraded warm-ups, one per
 * road. Part 2 is the graded set: 12 problems of 1 to 3 steps in a mixed
 * order. A problem counts when it is right before Show solution is pressed
 * (as in the dimensional analysis mixed challenge); hints and checking again
 * are free. Part 3 is the results.
 */

var App = (function () {
  'use strict';

  /* Bump whenever the steps, the problem plan, a substance or an atomic mass
     changes: a save from an older release is then discarded and the student
     starts fresh. */
  var SCHEMA = 1;

  var h = UI.h;

  var PARTS = [
    { n: 1, name: 'Mole Town warm-up' },
    { n: 2, name: 'Mixed problems' },
    { n: 3, name: 'Results' }
  ];

  var STEPS = [
    { id: 'map', part: 1, kind: 'map', title: 'Mole Town',
      text: 'Every road in Mole Town goes through moles. Tap each of the four roads around moles of CO₂ to see the ' +
            'equality it stands for. Those equalities are the conversion factors you will use.' },
    { id: 'w-mass', part: 1, kind: 'warm', title: 'The mass road',
      text: 'Mass and moles: ___ g = 1 mol, where the blank is the molar mass. Tap the equality to put it in the chain, flip it ' +
            'if g does not cancel, then type the molar mass in its blank: the atomic masses added up, each to the tenths place ' +
            '(Periodic table button). Then work out the number. Not graded.' },
    { id: 'w-part', part: 1, kind: 'warm', title: 'The particle road',
      text: 'Particles and moles: 6.022 × 10²³ particles = 1 mol. Atoms for an element like Fe, molecules for O₂ or a ' +
            'molecular compound like H₂O. For a big number press ×10ⁿ and type the power. Not graded.' },
    { id: 'w-stp', part: 1, kind: 'warm', title: 'The 22.4 L road',
      text: 'Volume and moles: 22.4 L = 1 mol, for a gas at STP (0 °C and 1 atm) only. Not graded.' },
    { id: 'w-ratio', part: 1, kind: 'warm', title: 'The ratio road',
      text: 'Moles of a compound and moles of an element in it: the formula gives the ratio. SBr₂ has 2 Br atoms, so ' +
            '1 mol SBr₂ = 2 mol Br. Type the number from the formula in the blank. Units of different substances never ' +
            'cancel: mol SBr₂ is not mol Br. Not graded.' },
    { id: 'set', part: 2, kind: 'set', title: 'Mixed problems',
      text: '12 problems of 1, 2 and 3 steps, in a mixed order. A problem counts if you get it right before you press Show ' +
            'solution. Hints are free, and so is checking again.' },
    { id: 'results', part: 3, kind: 'results', title: 'Results', text: '' }
  ];

  var GRADED = Gen.SET_PLAN.length;
  var ROAD_GOAL = ['A:mm', 'A:av', 'A:stp', 'ratio'];

  var el = {};
  var state = null;
  var ctl = null;
  var preview = false;
  var setCache = null;

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

  function panel(title, hint, kids) {
    return h('section', { class: 'panel' }, [
      h('div', { class: 'panel-head' }, [h('h3', { text: title }), hint ? h('span', { class: 'hint', text: hint }) : null])
    ].concat(kids || []));
  }

  /* ------------------------------------------------------------------ state */

  function newState() {
    return { v: SCHEMA, seed: Math.floor(Math.random() * 1e9), step: 0, max: 0, done: {}, seen: {}, w: {}, p: [], view: 0,
             fin: 0, best: 0, att: 1 };
  }

  function restore(saved) {
    if (!saved || saved.v !== SCHEMA || typeof saved.seed !== 'number' || !Array.isArray(saved.p)) return null;
    try { Gen.set(saved.seed); } catch (e) { return null; }
    saved.done = saved.done || {};
    saved.seen = saved.seen || {};
    saved.w = saved.w || {};
    return saved;
  }

  function problems() {
    if (!setCache || setCache.seed !== state.seed) setCache = { seed: state.seed, list: Gen.set(state.seed) };
    return setCache.list;
  }

  /* A finished problem keeps only what the results and a reload need. */
  function compact(work) {
    return work.r ? { r: work.r, a: work.a, k: work.k, b: work.b } : work;
  }
  function persist() {
    if (preview) return;
    state.p = state.p.map(function (w) { return w ? compact(w) : w; });
    Object.keys(state.w).forEach(function (k) { state.w[k] = compact(state.w[k]); });
    SCORM.saveState(state);
  }

  function solved(i) { var w = state.p[i]; return !!w && (w.r === 1 || w.r === 2); }
  function correctCount() {
    var n = 0;
    for (var i = 0; i < GRADED; i++) if (solved(i)) n++;
    return n;
  }
  function firstTryCount() {
    return state.p.filter(function (w) { return w && w.r === 2; }).length;
  }
  function resolvedCount() {
    var n = 0;
    for (var i = 0; i < GRADED; i++) if (state.p[i] && state.p[i].r) n++;
    return n;
  }
  function current() {
    for (var i = 0; i < GRADED; i++) if (!(state.p[i] && state.p[i].r)) return i;
    return GRADED;
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
    nav('next', 'disabled', state.step >= STEPS.length - 1);
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
    el.score.textContent = 'Score: ' + correctCount() + ' / ' + GRADED +
      (firstTryCount() ? '  ·  first try ' + firstTryCount() : '') +
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

  /* ---- Mole Town: tap each road */

  RENDER.map = function () {
    var A = 'CO2', B = 'O';
    var EQ = {
      'A:mm': ['44.0 g CO₂ = 1 mol CO₂', 'The periodic table road. The molar mass is the atomic masses added up, each to the tenths place: ' +
               '12.0 + 2(16.0) = 44.0. In the problems this number is a blank that you fill in.'],
      'A:av': [Chem.AV_TEXT + ' molecules CO₂ = 1 mol CO₂', 'Avogadro’s number road. 1 mol of anything is 6.022 × 10²³ of its ' +
               'particles: molecules of CO₂, atoms of O.'],
      'A:stp': ['22.4 L CO₂ = 1 mol CO₂', 'The 22.4 L road. 1 mol of any gas at STP (0 °C and 1 atm) takes up 22.4 L. Only a gas ' +
                'has this road.'],
      'ratio': ['1 mol CO₂ = 2 mol O', 'The ratio road. The formula CO₂ has 2 O atoms, so 1 mol CO₂ holds 2 mol O. In the ' +
                'problems this number is a blank that you fill in.'],
      'B:mm': ['16.0 g O = 1 mol O', 'The periodic table road again, for the element: the atomic mass of O to the tenths place.'],
      'B:av': [Chem.AV_TEXT + ' atoms O = 1 mol O', 'Avogadro’s number again: 1 mol of O atoms.']
    };
    var list = h('ul', { class: 'roadlist' });
    var map = MoleMap.create({ A: A, B: B, interactive: true, onRoad: function (id) {
      if (!EQ[id]) return;
      state.seen[id] = 1;
      paint();
      say(EQ[id][0] + '.  ' + EQ[id][1], 'good');
      var left = ROAD_GOAL.filter(function (r) { return !state.seen[r]; });
      if (!left.length && !state.done.map) complete();
      persist();
    } });
    function paint() {
      map.update({ seen: state.seen });
      list.innerHTML = '';
      Object.keys(EQ).forEach(function (id) {
        if (!state.seen[id]) return;
        list.appendChild(h('li', null, [h('b', { text: EQ[id][0] })]));
      });
      var left = ROAD_GOAL.filter(function (r) { return !state.seen[r]; }).length;
      count.textContent = left ? left + ' of the four roads around moles of CO₂ still to tap.' :
        'All four roads found. Every conversion today is a trip along these roads, one factor per road.';
    }
    var count = h('p', { class: 'muted' });
    el.stage.appendChild(h('div', { class: 'mapstep' }, [
      panel('The map', 'A is CO₂, B is O, an element in it', [map.el]),
      panel('Equalities found', null, [count, list, h('p', { class: 'muted', text: 'Each road is one conversion factor. To get anywhere ' +
        'you go through moles: mass to particles is two roads, mass of a compound to atoms of an element in it is three.' })])
    ]));
    paint();
    if (state.done.map) nav('next', 'disabled', false);
  };

  /* ---- warm-ups: one problem each, ungraded */

  RENDER.warm = function (s) {
    var p = Gen.warm(state.seed, s.id);
    var work = state.w[s.id] || (state.w[s.id] = {});
    if (work.r && !work.c) work.c = p.path.map(function (t) { return [t.e, t.f]; });
    ctl = Work.create(el.stage, p, work, {
      graded: false,
      onSave: function () { persist(); },
      onResolve: function (r) {
        complete(r === 3 ? 'Read the worked solution, then press Next.' : 'Right. Press Next for the next road.', r === 3 ? null : 'good');
      }
    });
    if (work.r) nav('next', 'disabled', false);
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
      var what = r === 2 ? 'right on the first check' : r === 1 ? 'right' : r === 3 ? 'solution shown' : i === cur ? 'current' : 'not reached';
      strip.appendChild(h('button', {
        type: 'button', class: 'pnum' + (r === 2 ? ' first' : r === 1 ? ' right' : r === 3 ? ' shown' : '') + (i === view ? ' on' : ''),
        disabled: i > cur, 'aria-label': 'Problem ' + (i + 1) + ': ' + what, 'aria-current': i === view ? 'true' : null,
        title: what, onclick: function () { state.view = i; goTo(state.step); }
      }, [String(i + 1) + (r === 2 ? '★' : r === 1 ? '✓' : r === 3 ? '–' : '')]));
    });
    el.stage.appendChild(strip);
    el.counter.textContent = 'Problem ' + (view + 1) + ' of ' + GRADED + '  ·  step ' + (state.step + 1) + ' of ' + STEPS.length;
    var p = list[view];
    var work = state.p[view] || (state.p[view] = {});
    if (work.r && !work.c) work.c = p.path.map(function (t) { return [t.e, t.f]; });
    var last = view === GRADED - 1;
    ctl = Work.create(el.stage, p, work, {
      graded: true,
      onSave: function () { persist(); },
      onResolve: function (r) {
        if (!preview) SCORM.recordAnswer(p.id, r === 3 ? 'solution shown' : work.a, p.ansAscii, r !== 3);
        reportScore();
        persist();
        paintParts();
        var mark = strip.children[view];
        if (mark) {
          mark.className = 'pnum on' + (r === 2 ? ' first' : r === 1 ? ' right' : ' shown');
          mark.textContent = String(view + 1) + (r === 2 ? '★' : r === 1 ? '✓' : '–');
        }
        if (strip.children[view + 1]) strip.children[view + 1].disabled = false;
        if (resolvedCount() >= GRADED) complete();
      },
      next: { label: last ? 'See your results →' : 'Next problem →', onClick: function () {
        if (last) { if (resolvedCount() >= GRADED) goTo(state.step + 1); return; }
        state.view = view + 1;
        goTo(state.step);
      } }
    });
    if (resolvedCount() >= GRADED) nav('next', 'disabled', false);
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
    var list = problems();
    var right = correctCount(), pct = Math.round(100 * right / GRADED), best = Math.round(state.best || 0);
    var bySteps = [1, 2, 3].map(function (n) {
      var idx = list.map(function (p, i) { return p.steps === n ? i : -1; }).filter(function (i) { return i >= 0; });
      var r = idx.filter(solved).length;
      return h('tr', null, [h('td', { text: n + '-step problems' }), h('td', { class: 'num', text: r + ' / ' + idx.length })]);
    });
    var box = panel(state.att > 1 ? 'Attempt ' + state.att : 'Your score', null, [
      h('p', { class: 'big-score', text: right + ' / ' + GRADED + '  (' + pct + '%)' }),
      h('p', { class: 'muted', text: firstTryCount() + ' right on the first check.' }),
      h('table', { class: 'ref-table' }, bySteps),
      state.att > 1 ? h('p', { class: 'best-line', text: 'Best attempt: ' + best + '%' + (best > pct ? '. That is the score the gradebook keeps.' : '') }) : null,
      h('p', { class: 'muted', text: SCORM.isConnected()
        ? 'Your ' + (state.att > 1 ? 'best ' : '') + 'score has been sent to the gradebook and the activity is marked complete.'
        : 'Standalone mode: nothing was sent to a gradebook.' })
    ]);
    var review = h('ol', { class: 'q-review' }, list.map(function (p, i) {
      var w = state.p[i] || {};
      var ok = w.r === 1 || w.r === 2;
      return h('li', { class: ok ? 'right' : 'wrong' }, [
        h('span', { class: 'mark', text: w.r === 2 ? '★' : ok ? '✓' : '–' }),
        h('span', null, ['Convert ' + p.fromText + ' to ' + p.toText + ': ', h('b', { text: p.ansStr + ' ' + p.toText }),
          ok ? '' : h('span', { class: 'muted', text: '  (solution shown)' })])
      ]);
    }));
    var ideas = panel('Big ideas', null, [h('ul', { class: 'keylist' }, [
      'Moles are the centre of Mole Town: every road goes through moles.',
      'Mass and moles: ___ g = 1 mol, the molar mass, which is the atomic masses added up to the tenths place.',
      'Particles and moles: 6.022 × 10²³ particles = 1 mol (atoms of an element, molecules of a molecular substance).',
      'Volume and moles: 22.4 L = 1 mol, for a gas at STP only.',
      'Moles of a compound and moles of an element in it: the ratio from the formula, 1 mol SBr₂ = 2 mol Br.',
      'Turn each equality so the unit you have is on the bottom; it cancels the same unit on top. Different substances never cancel.',
      'Every equality counts as exact: the quantity you were given decides the significant figures.'
    ].map(function (t) { return h('li', { text: t }); }))]);
    el.stage.appendChild(h('div', { class: 'grid2' }, [box, ideas]));
    el.stage.appendChild(panel('Your problems', '★ right on the first check, ✓ right, – solution shown', [review]));
    var again = h('button', { type: 'button', class: 'primary', text: 'Start a new attempt' });
    var sure = h('div', { class: 'confirm', hidden: true }, [
      h('p', { text: 'This gives you 12 new problems and new warm-ups. Your best score so far (' + Math.max(best, pct) +
                     '%) stays in the gradebook.' }),
      h('div', { class: 'btnrow' }, [
        h('button', { type: 'button', class: 'primary', text: 'Yes, start again', onclick: newAttempt }),
        h('button', { type: 'button', class: 'ghostbtn', text: 'Cancel', onclick: function () { sure.hidden = true; again.hidden = false; again.focus(); } })
      ])
    ]);
    again.addEventListener('click', function () { again.hidden = true; sure.hidden = false; sure.querySelector('.primary').focus(); });
    el.stage.appendChild(panel('Try it again?', null, [
      h('p', { class: 'muted', text: 'You can redo the activity with new numbers and new substances. Parts you have already reached stay open.' }),
      h('div', { class: 'btnrow' }, [again]), sure]));
    say('Activity complete.', 'good');
  };

  /* ------------------------------------------------------------------ boot */

  function showIntro() {
    var box = h('div', { class: 'screen-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'introTitle' }, [
      h('h2', { id: 'introTitle', text: 'Mole conversions: dimensional analysis' }),
      h('p', { text: 'Convert grams, particles and litres of gas at STP to moles and back, and use the ratio from a formula to go ' +
                     'from a compound to an element in it. Build each conversion from equalities: tap one to put it in the chain, ' +
                     'flip it until its units cancel, fill in its blank, then work out the number.' }),
      h('ul', { class: 'screen-list' }, [
        h('li', { text: 'The molar mass equality has a blank: type the molar mass, to the tenths place, from the periodic table.' }),
        h('li', { text: 'The ratio equality has a blank too: the number from the formula (1 mol SBr₂ = 2 mol Br).' }),
        h('li', { text: 'Round your answer to the significant figures of the quantity you were given. The equalities count as exact.' })
      ]),
      h('p', { text: 'The map and four warm-ups are not graded. Then 12 mixed problems are: each counts if you get it right before ' +
                     'pressing Show solution. About 25 minutes. Your progress is saved if you leave.' }),
      h('p', { class: 'screen-note', text: 'Everything works with a mouse, a touch screen or the keyboard (Tab to an equality, Enter to add it).' })
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
    Ptable.onChange(function (open) { el.ptTop.setAttribute('aria-expanded', open ? 'true' : 'false'); });
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
        for (var k = 0; k < state.view; k++) state.p[k] = { r: 3 };
      }
    } else {
      state = restore(SCORM.loadState()) || newState();
      state.view = null;          /* a reload opens the first problem not yet done */
      persist();
    }
    [el.next, el.nextTop].forEach(function (b) { b.addEventListener('click', function () { goTo(state.step + 1); }); });
    [el.back, el.backTop].forEach(function (b) { b.addEventListener('click', function () { goTo(state.step - 1); }); });
    if (preview) { goTo(state.step); return; }
    paintParts();
    showIntro();
  }

  return { start: start, SCHEMA: SCHEMA, STEPS: STEPS, GRADED: GRADED, problems: function () { return problems(); },
           state: function () { return state; }, ctl: function () { return ctl; } };
})();

document.addEventListener('DOMContentLoaded', App.start);

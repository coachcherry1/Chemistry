/* app.js: the steps, their order, saving, scoring.
 *
 * Part 1  Strong acid, strong base: what a titration does, then HCl and NaOH
 *         through five points, with the particle diagram changing at each one
 * Part 2  Weak acid, strong base: how a weak acid differs from the start, then
 *         HF and NaOH through the same five points, then both side by side
 * Part 3  Why the equivalence points differ: which particle decides the pH,
 *         then sorting titrations into "exactly 7" and "above 7"
 * Part 4  Reading the curve: match diagrams to points, find points on a curve
 * Part 5  Review with a different weak acid (acetic acid), checkpoint only
 *
 * Only the five checkpoints are graded (first answer counts). Predictions,
 * walks, sorts and clicks must be finished to move on but are never scored.
 */

var App = (function () {
  'use strict';

  /* Bump whenever the step list, a quiz pool or the points change: a save
     from an older release is then discarded and the student starts fresh. */
  var SCHEMA = 1;

  var h = UI.h, T = Titration;

  var PARTS = [
    { n: 1, name: 'Strong acid' },
    { n: 2, name: 'Weak acid' },
    { n: 3, name: 'Why they differ' },
    { n: 4, name: 'Read the curve' },
    { n: 5, name: 'Review' },
    { n: 6, name: 'Results' }
  ];

  var STEPS = [
    { id: 'setup', part: 1, kind: 'setup', title: 'What a titration does',
      text: 'A titration adds a base, a little at a time, to a flask of acid. Predict first, then look in the flask.' },
    { id: 'ss-walk', part: 1, kind: 'walk', sys: 'SS', title: 'Strong acid, strong base: five points',
      text: 'HCl in the flask, NaOH added from the buret. At five points, predict what is in the flask and what decides the pH. ' +
            'The particle diagram changes as you go.' },
    { id: 'quiz-A', part: 1, kind: 'quiz', quiz: 'A', title: 'Checkpoint 1' },

    { id: 'compare', part: 2, kind: 'compare', title: 'A weak acid is different from the start',
      text: 'Two flasks hold the same amount of acid. One is HCl, a strong acid. One is HF, a weak acid.' },
    { id: 'ws-walk', part: 2, kind: 'walk', sys: 'WS', title: 'Weak acid, strong base: five points',
      text: 'HF in the flask, NaOH added from the buret. The same five points. Watch what is different from the HCl titration.' },
    { id: 'side', part: 2, kind: 'side', title: 'Side by side',
      text: 'Both titrations, one point at a time. Visit all five points and compare the flasks.' },
    { id: 'quiz-B', part: 2, kind: 'quiz', quiz: 'B', title: 'Checkpoint 2' },

    { id: 'why', part: 3, kind: 'why', title: 'Why do the equivalence points differ?',
      text: 'Both flasks are at the equivalence point. In each one, click the particle that decides the pH.' },
    { id: 'pairs', part: 3, kind: 'pairs', title: 'Exactly 7 or above 7?',
      text: 'Each card is an acid titrated with a strong base. Sort it by the pH at its equivalence point.' },
    { id: 'quiz-C', part: 3, kind: 'quiz', quiz: 'C', title: 'Checkpoint 3' },

    { id: 'match', part: 4, kind: 'match', title: 'Match the diagram to the curve',
      text: 'Five particle diagrams of the HF flask. Put each one on its point on the curve.' },
    { id: 'find', part: 4, kind: 'find', title: 'Find the points on the curve',
      text: 'Move the marker along a curve, then press Check.' },
    { id: 'quiz-D', part: 4, kind: 'quiz', quiz: 'D', title: 'Checkpoint 4' },

    { id: 'quiz-E', part: 5, kind: 'quiz', quiz: 'E', title: 'Checkpoint 5: a different weak acid',
      text: 'Acetic acid, CH₃COOH, is a weaker acid than HF. Use what you learned. In the diagram HAc stands for CH₃COOH and Ac⁻ for CH₃COO⁻.' },

    { id: 'results', part: 6, kind: 'results', title: 'Results', text: '' }
  ];

  var GRADED = Object.keys(QUIZZES).reduce(function (s, k) { return s + QUIZZES[k].draw; }, 0);

  var el = {};
  var state = null;
  var ctl = null;
  var preview = false;

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

  function mL(u) { return T.volume(u).toFixed(2); }
  function pHtext(sys, u) { return T.pH(sys, u).toFixed(2); }
  function commas(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
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
        'The acid table is open beside the questions.'
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

  /* the choices for "what is in the flask": the right list and three from other points */
  function flaskChoices(sys, k, rand) {
    var pts = T.POINTS;
    var all = [T.flask(sys, pts[k].u)].concat(UI.shuffle(pts.filter(function (p, i) { return i !== k; })
      .map(function (p) { return T.flask(sys, p.u); }), rand).slice(0, 3));
    var order = UI.shuffle(all.map(function (x, i) { return i; }), rand);
    return { choices: order.map(function (i) { return all[i]; }), answer: order.indexOf(0) };
  }

  /* the choices for "what decides the pH" */
  function setterChoices(sys, u, rand) {
    var right = T.setter(sys, u);
    var kinds = sys === 'SS' ? ['strong-h', 'neutral', 'excess-oh', 'conjugate-base']
                             : ['weak-acid', 'buffer', 'conjugate-base', 'excess-oh', 'neutral'];
    var others = UI.shuffle(kinds.filter(function (k) { return k !== right; }), rand).slice(0, 3);
    var all = [right].concat(others);
    var order = UI.shuffle(all.map(function (x, i) { return i; }), rand);
    return { choices: order.map(function (i) { return T.setterChoice(sys, all[i]); }), answer: order.indexOf(0) };
  }

  /* what happened at a point, from the counts */
  function story(sys, k) {
    var S = T.SYSTEMS[sys], pt = T.POINTS[k], c = T.counts(sys, pt.u);
    if (pt.id === 'start') {
      return S.weak
        ? 'Only ' + c.A + ' of the 24 ' + S.sym + ' have ionized. The other ' + c.HA + ' stay whole: a weak acid ionizes only a little.'
        : 'All 24 HCl have ionized: 24 H⁺ and 24 Cl⁻. A strong acid is all ions.';
    }
    if (pt.id === 'equiv') {
      return S.weak
        ? 'All 24 ' + S.sym + ' have reacted with OH⁻ and become ' + S.asym + '. Only Na⁺ and ' + S.asym + ' (and water) are left.'
        : 'All 24 H⁺ have been used up. Only Na⁺ and Cl⁻ (and water) are left.';
    }
    if (pt.id === 'after') {
      return c.OH + ' extra OH⁻: the NaOH has gone past what the acid needs, and the extra has nothing to react with.';
    }
    if (!S.weak && pt.id === 'half') {
      return c.Na + ' units of NaOH have used up ' + c.Na + ' H⁺ (H⁺ + OH⁻ → H₂O). ' + c.H + ' H⁺ are left. ' +
        'For a strong acid nothing special happens at this point. It is a reference to compare with the weak acid.';
    }
    return S.weak
      ? c.Na + ' units of NaOH have turned ' + c.Na + ' ' + S.sym + ' into ' + S.asym + ' (' + S.sym + ' + OH⁻ → ' + S.asym + ' + H₂O). ' +
        c.HA + ' ' + S.sym + ' and ' + c.A + ' ' + S.asym + ' are left.'
      : c.Na + ' units of NaOH have used up ' + c.Na + ' H⁺ (H⁺ + OH⁻ → H₂O). ' + c.H + ' H⁺ are left.';
  }

  /* what sets the pH, with the numbers */
  function phStory(sys, k) {
    var S = T.SYSTEMS[sys], pt = T.POINTS[k];
    var lines = ['pH ' + pHtext(sys, pt.u) + '. ' + T.setterText(sys, pt.u)];
    if (S.weak && pt.id === 'half') {
      lines.push('HF and F⁻ are equal in number here, so the pH is about the pKa of HF, ' + T.PKA_HF.toFixed(2) + '.');
    }
    if (S.weak && pt.id === 'equiv') {
      lines.push('Only about 1 F⁻ in ' + commas(T.reactingOneIn(sys)) + ' reacts with water, far too few to draw. It is still enough to put the pH above 7.');
    }
    return lines;
  }

  var RENDER = {};

  /* ---- the flask and the curve for a walk, a comparison or a match */

  function sysClass(sys) { return 'cl-' + sys.toLowerCase(); }

  function fmtU(u) { return u + ' units of NaOH (' + mL(u) + ' mL)'; }

  /* ---- setup */

  RENDER.setup = function (s) {
    var chosen = state.seen.setup;
    var box = Particles.create('SS');
    box.blank();
    var q = h('div');
    var p = {
      q: 'The flask holds 25.00 mL of 0.100 M HCl. How much 0.100 M NaOH must be added to reach the equivalence point?',
      choices: ['25.00 mL: the moles of base must equal the moles of acid', '12.50 mL: half as much, because the base is stronger',
                '50.00 mL: twice as much, because each acid needs two bases', 'It cannot be known until the pH is measured'],
      answer: 0
    };
    var after = h('div', { class: 'after-q' });
    function showAfter() {
      box.set(0);
      after.innerHTML = '';
      after.appendChild(reveal([
        'Right: HCl and NaOH react one to one (H⁺ + OH⁻ → H₂O), both are 0.100 M, so equal volumes have equal moles: 25.00 mL.',
        'The equivalence point is where the moles of base added equal the moles of acid in the flask. How the pH looks there is what ' +
        'this activity is about.'
      ]));
      after.appendChild(h('p', { class: 'muted', text: 'The diagram shows the flask at the start: 24 H⁺ and 24 Cl⁻. Each particle stands for the same ' +
        'number of ions. Water is there but is not drawn. Next, you will add NaOH and watch the particles change.' }));
      if (!state.done[s.id]) { state.seen.setup = 1; complete(); }
    }
    q.appendChild(ask({ q: p.q, choices: p.choices, answer: p.answer, chosen: chosen ? 0 : null,
      onPick: function (i) { state.seen.setup = 1; showAfter(); } }));
    q.appendChild(after);
    if (chosen || state.done[s.id]) showAfter();

    var apparatus = h('div', { class: 'apparatus', 'aria-hidden': 'true' }, []);
    apparatus.innerHTML =
      '<svg viewBox="0 0 220 250" class="app-svg">' +
      '<rect x="92" y="10" width="36" height="110" rx="4" class="app-glass"/>' +
      '<rect x="95" y="36" width="30" height="80" class="app-liquid"/>' +
      '<rect x="104" y="120" width="12" height="14" class="app-glass"/>' +
      '<circle cx="110" cy="142" r="3" class="app-drop"/>' +
      '<path d="M78 156 L142 156 L190 236 L30 236 Z" class="app-glass"/>' +
      '<path d="M66 196 L154 196 L184 236 L36 236 Z" class="app-acid"/>' +
      '<text x="136" y="64" class="app-label">NaOH</text>' +
      '<text x="136" y="78" class="app-label small">in the buret</text>' +
      '<text x="110" y="226" class="app-label mid">HCl in the flask</text>' +
      '</svg>';
    el.stage.appendChild(h('div', { class: 'work-row row-setup' }, [
      panel('The question', null, [q]),
      panel('The set-up', null, [apparatus]),
      panel('The flask', 'water is not drawn', [box.node])
    ]));
  };

  /* ---- a walk through the five points of one titration */

  RENDER.walk = function (s) {
    var sys = s.sys, S = T.SYSTEMS[sys], cls = sysClass(sys);
    var box = Particles.create(sys);
    var cv = Curve.create({ systems: [{ sys: sys, cls: cls }], marks: true, live: true });
    var phRead = h('p', { class: 'ph-read' });
    var chipRow = h('div', { class: 'walk-chips', 'aria-label': 'The five points' });
    var qHost = h('div', { class: 'walk-q' });
    var flaskNote = h('div', { class: 'note-host' });
    var phNote = h('div', { class: 'note-host' });
    var k = Math.min(state.wk[s.id] || 0, 5);

    function paintChips(current) {
      chipRow.innerHTML = '';
      T.POINTS.forEach(function (pt, i) {
        var done = i < (state.wk[s.id] || 0);
        var jump = k >= 5;
        chipRow.appendChild(h('button', { type: 'button', class: 'chip num' + (i === current ? ' on' : '') + (done ? ' done' : ''),
          disabled: !jump, 'data-point': pt.id, title: pt.name, 'aria-label': 'Point ' + (i + 1) + ', ' + pt.name,
          onclick: function () { if (jump) setSlider(pt.u); }, text: String(i + 1) }));
      });
    }

    function show(u, withPH) {
      if (u == null) { box.blank(); cv.setU(null); phRead.textContent = 'pH: ?'; return; }
      box.set(u);
      if (withPH) { cv.setU(u); phRead.textContent = 'pH ' + pHtext(sys, u) + ' after ' + mL(u) + ' mL of NaOH'; }
    }

    /* an answered question shrinks to one line, so the next one has room */
    function oneLine(text, ok) {
      return h('p', { class: 'walk-done' + (ok ? ' right' : ' wrong'), text: (ok ? '✓ ' : '✗ ') + text });
    }

    function flaskQuestion() {
      var pt = T.POINTS[k], rand = rngFor(s.id + ':f:' + k);
      var fc = flaskChoices(sys, k, rand);
      paintChips(k);
      flaskNote.innerHTML = ''; phNote.innerHTML = '';
      qHost.innerHTML = '';
      qHost.appendChild(h('p', { class: 'walk-where', text: 'Point ' + (k + 1) + ' of 5: ' + pt.name }));
      var q1 = ask({
        q: pt.id === 'start' ? 'Before any NaOH is added, which list shows what is in the flask?'
                             : 'Now ' + fmtU(pt.u) + ' have been added. Which list shows what is in the flask?',
        choices: fc.choices, answer: fc.answer,
        onPick: function (i) {
          box.set(pt.u);
          flaskNote.appendChild(reveal([(i === fc.answer ? 'Right. ' : 'Not quite. ') + 'The flask holds ' + T.flask(sys, pt.u) + '.', story(sys, k)]));
          q1.replaceWith(oneLine('In the flask: ' + T.flask(sys, pt.u), i === fc.answer));
          phQuestion();
        }
      });
      qHost.appendChild(q1);
    }

    function phQuestion() {
      var pt = T.POINTS[k], rand = rngFor(s.id + ':p:' + k);
      var sc = setterChoices(sys, pt.u, rand);
      var host = h('div', { class: 'walk-q2' });
      qHost.appendChild(host);
      host.appendChild(ask({
        kicker: 'Predict again (not graded)', q: 'What decides the pH of the flask at this point?',
        choices: sc.choices, answer: sc.answer,
        onPick: function (i) {
          cv.setU(pt.u);
          cv.reach(k + 1);
          phRead.textContent = 'pH ' + pHtext(sys, pt.u) + ' after ' + mL(pt.u) + ' mL of NaOH';
          var lines = phStory(sys, k);
          phNote.appendChild(reveal([(i === sc.answer ? 'Right. ' : 'Not quite. ') + lines[0]].concat(lines.slice(1))));
          state.wk[s.id] = k + 1;
          persist();
          var last = k === 4;
          host.appendChild(h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary', 'data-walk-next': '1',
            text: last ? 'Explore the whole curve →' : 'Next point →',
            onclick: function () { k += 1; if (k >= 5) { complete('You have been through all five points. Drag the slider to explore the whole curve.'); explore(); } else flaskQuestion(); } })]));
        }
      }));
    }

    var slider = null;
    function setSlider(u) {
      if (!slider) return;
      slider.value = String(u);
      slider.dispatchEvent(new Event('input'));
    }

    function explore() {
      paintChips(-1);
      cv.reach(5);
      flaskNote.innerHTML = ''; phNote.innerHTML = '';
      qHost.innerHTML = '';
      var read = h('p', { class: 'readout' });
      slider = h('input', { type: 'range', min: '0', max: String(T.MAX_U), step: '1', value: '24', class: 'thermo-range', 'aria-label': 'NaOH added, in units' });
      function upd() {
        var u = +slider.value;
        show(u, true);
        read.textContent = 'NaOH added: ' + fmtU(u);
        slider.setAttribute('aria-valuetext', fmtU(u) + ', pH ' + pHtext(sys, u));
      }
      slider.addEventListener('input', upd);
      qHost.appendChild(h('p', { class: 'walk-where', text: 'Explore the whole curve' }));
      qHost.appendChild(h('p', { class: 'muted', text: 'Drag the slider, or press a point number above. Watch the particles and the dot on the curve move together.' }));
      qHost.appendChild(read);
      qHost.appendChild(slider);
      upd();
    }

    el.stage.appendChild(h('div', { class: 'work-row row-walk' }, [
      panel(S.acid + ' with NaOH', 'five points', [chipRow, qHost], 'pwalk'),
      panel('The flask', 'water is not drawn', [box.node, flaskNote], 'pflask'),
      panel('The curve', null, [phRead, cv.node, phNote], 'pcurve')
    ]));

    if (k >= 5) { paintChips(-1); explore(); }
    else {
      if (k === 0) show(null); else { show(T.POINTS[k - 1].u, true); cv.reach(k); }
      flaskQuestion();
    }
  };

  /* ---- compare: the same amount of strong and weak acid */

  RENDER.compare = function (s) {
    var done = !!state.done[s.id];
    var boxes = h('div', { class: 'compare-boxes' });
    var host = h('div', { class: 'compare-q' });
    function shown() {
      boxes.innerHTML = '';
      ['SS', 'WS'].forEach(function (sys) {
        var d = Particles.create(sys);
        d.set(0);
        boxes.appendChild(h('div', { class: 'cmp-col' }, [h('h4', { text: T.SYSTEMS[sys].acid + ' (' + (T.SYSTEMS[sys].weak ? 'weak' : 'strong') + ' acid)' }),
          d.node, h('p', { class: 'readout', text: 'pH ' + pHtext(sys, 0) })]));
      });
      host.appendChild(reveal([
        'HCl is a strong acid: all 24 units are ions, so 24 H⁺. HF is a weak acid: only ' + T.counts('WS', 0).A +
        ' of the 24 have ionized, about 8%.',
        'The same amount of acid, but much less free H⁺ in the HF flask. That is why its pH starts higher: ' + pHtext('WS', 0) + ' against ' + pHtext('SS', 0) + '.',
        'Both flasks need the same amount of NaOH to reach the equivalence point, because every HF molecule can still give its H⁺ to a base.'
      ]));
      if (!done) { done = true; complete(); }
    }
    host.appendChild(ask({
      q: 'Each flask holds 24 acid units in water. Which flask has more H⁺ in it?',
      choices: ['The HCl flask', 'The HF flask', 'They have the same amount of H⁺'], answer: 0,
      chosen: done ? 0 : null,
      onPick: function () { shown(); }
    }));
    el.stage.appendChild(panel('Same amount of acid', null, [host, boxes], 'pcompare'));
    if (done) {
      host.querySelectorAll('.choice').forEach(function (b) { b.disabled = true; });
      shown();
    }
  };

  /* ---- side by side: both titrations at one point */

  var CONTRAST = {
    start: 'HCl is all ions. HF is mostly whole molecules, so its flask has far less H⁺ and a higher pH.',
    half: 'The HCl flask still has H⁺ to be used up. The HF flask has become a buffer of HF and F⁻ in equal numbers, so its pH sits at the pKa.',
    before: 'The HCl flask is nearly neutralized but its pH is still low. The HF flask is still a buffer, so its pH rises slowly.',
    equiv: 'HCl: only spectator ions are left, so the pH is exactly 7. HF: the F⁻ that is left is a base, so the pH is above 7.',
    after: 'Both flasks now have the same extra OH⁻, and it sets the pH. The two curves meet.'
  };

  RENDER.side = function (s) {
    var seen = state.seen['side:' + s.id] || {};
    var ss = Particles.create('SS'), ws = Particles.create('WS');
    var cv = Curve.create({ systems: [{ sys: 'WS', cls: 'cl-ws', label: 'HF' }, { sys: 'SS', cls: 'cl-ss', label: 'HCl' }], live: true });
    var info = h('div', { class: 'side-info' });
    var chipRow = h('div', { class: 'walk-chips' });
    var current = -1;
    function paint() {
      chipRow.innerHTML = '';
      T.POINTS.forEach(function (pt, i) {
        chipRow.appendChild(h('button', { type: 'button', class: 'chip num' + (i === current ? ' on' : '') + (seen[pt.id] ? ' done' : ''),
          'data-point': pt.id, title: pt.name, 'aria-label': 'Point ' + (i + 1) + ', ' + pt.name, onclick: function () { go(i); }, text: String(i + 1) }));
      });
    }
    function go(i) {
      var pt = T.POINTS[i];
      current = i;
      ss.set(pt.u); ws.set(pt.u); cv.setU(pt.u);
      seen[pt.id] = 1;
      state.seen['side:' + s.id] = seen;
      info.innerHTML = '';
      info.appendChild(h('p', { class: 'walk-where', text: 'Point ' + (i + 1) + ': ' + pt.name + ' (' + mL(pt.u) + ' mL)' }));
      info.appendChild(reveal([
        'HCl flask: ' + T.flask('SS', pt.u) + '. pH ' + pHtext('SS', pt.u) + '.',
        'HF flask: ' + T.flask('WS', pt.u) + '. pH ' + pHtext('WS', pt.u) + '.',
        CONTRAST[pt.id]
      ]));
      paint();
      persist();
      if (T.POINTS.every(function (p) { return seen[p.id]; }) && !state.done[s.id]) complete('You have compared all five points.');
    }
    el.stage.appendChild(h('div', { class: 'work-row row-side' }, [
      panel('Compare', null, [chipRow, info], 'pwalk'),
      panel('HCl flask', 'strong acid', [ss.node], 'pflask'),
      panel('HF flask', 'weak acid', [ws.node], 'pflask'),
      panel('The curves', null, [cv.node], 'pcurve')
    ]));
    paint();
    if (state.done[s.id]) go(3);
    else info.appendChild(h('p', { class: 'muted', text: 'Press a point to see both flasks at that point.' }));
  };

  /* ---- why: click the particle that decides the pH */

  RENDER.why = function (s) {
    var got = { SS: !!state.done[s.id], WS: !!state.done[s.id] };
    var reactHost = h('div', { class: 'why-react' });
    var panels = {};

    var NA_TEXT = 'Na⁺ comes from a strong base. It does not take H⁺ from water or give H⁺ to it, so it does not change the pH.';
    function wrongText(sys, id) {
      var S = T.SYSTEMS[sys], c = T.counts(sys, 24);
      if (id === 'Na') return NA_TEXT;
      if (c[id] === 0) {
        if (id === 'H') return 'There is no H⁺ left from the acid: the NaOH has used it all up.';
        if (id === 'OH') return 'There is no extra OH⁻: exactly enough NaOH was added, so none is left over.';
        return 'There is no ' + S.sym + ' left: every ' + S.sym + ' has reacted with OH⁻.';
      }
      if (id === 'A' && !S.weak) return 'Cl⁻ is the conjugate base of HCl, a strong acid, so it is far too weak a base to take H⁺ from water. It does nothing to the pH.';
      return null;
    }
    function pickParticle(sys, id) {
      if (got[sys]) return;
      var S = T.SYSTEMS[sys];
      if (sys === 'WS' && id === 'A') {
        got.WS = true;
        say('Right. ' + S.asym + ' is the conjugate base of a weak acid, so it takes H⁺ from water and leaves OH⁻.', 'good');
      } else {
        var t = wrongText(sys, id);
        say(t || 'Not that one. Look at which particle in this flask can react with water.', 'bad');
        return;
      }
      afterPick();
    }
    function pickNothing(sys) {
      if (got[sys]) return;
      if (sys === 'SS') {
        got.SS = true;
        say('Right. Na⁺ and Cl⁻ do not react with water, so nothing but water’s own H⁺ and OH⁻ is left: pH 7.', 'good');
        afterPick();
      } else {
        say('Look again at the ' + T.SYSTEMS.WS.asym + ': it is the conjugate base of a weak acid, and it does react with water a little.', 'bad');
      }
    }
    function afterPick() {
      Object.keys(panels).forEach(function (sys) {
        if (got[sys]) {
          panels[sys].note.innerHTML = '';
          panels[sys].note.appendChild(reveal([sys === 'SS'
            ? 'Nothing decides it. pH ' + pHtext('SS', 24) + '.'
            : T.SYSTEMS.WS.asym + ' decides it. pH ' + pHtext('WS', 24) + '.']));
          panels[sys].box.node.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
          panels[sys].none.disabled = true;
        }
      });
      if (got.SS && got.WS) {
        reactHost.innerHTML = '';
        reactHost.appendChild(panel('What the F⁻ does', 'one sample ion, far bigger than real', [
          Particles.reaction('WS'),
          h('p', { class: 'muted', text: 'F⁻ takes an H⁺ from water and leaves OH⁻. Only about 1 F⁻ in ' + commas(T.reactingOneIn('WS')) +
            ' really reacts, so one is drawn as a sample. The OH⁻ made by those few is enough to push the pH to ' + pHtext('WS', 24) + '. Na⁺ and Cl⁻ have nothing to react with water, so HCl and NaOH stay at pH ' + pHtext('SS', 24) + '.' })
        ]));
        if (!state.done[s.id]) complete('Both flasks done.');
      }
    }
    function build(sys) {
      var d = Particles.create(sys, { pick: function (id) { pickParticle(sys, id); } });
      d.set(24);
      var none = h('button', { type: 'button', class: 'ghostbtn', text: 'None of these: only water’s own ions are left',
        onclick: function () { pickNothing(sys); } });
      var note = h('div');
      panels[sys] = { box: d, none: none, note: note };
      return panel(T.SYSTEMS[sys].acid + ' with NaOH, at the equivalence point',
        T.SYSTEMS[sys].weak ? 'weak acid' : 'strong acid', [
          h('p', { class: 'muted', text: 'Click the particle that decides the pH.' }), d.node, h('div', { class: 'btnrow' }, [none]), note], 'pflask');
    }
    el.stage.appendChild(h('div', { class: 'work-row row-why' }, [build('SS'), build('WS')]));
    el.stage.appendChild(reactHost);
    if (state.done[s.id]) afterPick();
  };

  /* ---- pairs: sort titrations into exactly 7 or above 7 */

  var PAIR_BAD = {
    equal: function (p) { return p.acid + ' is a strong acid and ' + p.base + ' is a strong base. ' + p.cation + ' and ' + p.anion + ' do not react with water, so the pH is exactly 7, not above it.'; },
    above: function (p) { return p.acid + ' is a weak acid, so ' + p.anion + ' is a real base. It reacts with water and makes OH⁻, so the pH is above 7, not exactly 7.'; }
  };

  RENDER.pairs = function (s) {
    var order = UI.shuffle(T.PAIRS.map(function (p) { return p.id; }), rngFor(s.id));
    var placed = state.done[s.id] ? order.slice() : [];
    var tray = h('div', { class: 'tray', 'aria-label': 'Titrations to sort' });
    var bins = { equal: h('div', { class: 'bin-body' }), above: h('div', { class: 'bin-body' }) };
    function bin(key, title, sub) {
      return h('div', { class: 'bin drop', 'data-drop': key, tabindex: '0', role: 'button', 'aria-label': 'Drop here: ' + title }, [
        h('div', { class: 'bin-head', text: title }), h('div', { class: 'muted small', text: sub }), bins[key]]);
    }
    var stage = h('div', { class: 'bins' }, [
      bin('equal', 'Exactly 7', 'only spectator ions left'),
      bin('above', 'Above 7', 'a base is left')
    ]);
    function pair(id) { return T.PAIRS.filter(function (p) { return p.id === id; })[0]; }
    function paint() {
      tray.innerHTML = '';
      order.forEach(function (id) {
        if (placed.indexOf(id) >= 0) return;
        var p = pair(id);
        tray.appendChild(h('button', { type: 'button', class: 'tile term', 'data-tile': id, text: p.acid + ' + ' + p.base }));
      });
      if (!tray.firstChild) tray.appendChild(h('p', { class: 'tray-empty', text: 'All sorted.' }));
      bins.equal.innerHTML = ''; bins.above.innerHTML = '';
      placed.forEach(function (id) {
        var p = pair(id);
        bins[T.pairSide(p)].appendChild(h('span', { class: 'bin-chip', text: p.acid + ' + ' + p.base }));
      });
    }
    var picker = Picker({ tray: tray, stage: stage, say: say,
      prompt: function (key) { return 'Now click “Exactly 7” or “Above 7” for ' + pair(key).acid + ' + ' + pair(key).base + '.'; },
      label: function (key) { return pair(key).acid + ' + ' + pair(key).base; },
      drop: function (target, key) {
        var p = pair(key);
        if (T.pairSide(p) !== target) { say(PAIR_BAD[T.pairSide(p)](p), 'bad'); return; }
        placed.push(key);
        paint();
        if (placed.length === order.length) complete('All sorted. Strong with strong gives exactly 7; a weak acid with a strong base gives above 7.');
        else say('Right. ' + (p.strong ? p.cation + ' and ' + p.anion + ' do not react with water: exactly 7.' : p.anion + ' is a base: above 7.'), 'good');
      } });
    el.stage.appendChild(panel('Sort the titrations', 'drag, or click a card and then a box', [tray, stage], 'ppairs'));
    paint();
    return { destroy: function () { picker.destroy(); } };
  };

  /* ---- match: diagrams to points on the curve */

  RENDER.match = function (s) {
    var sys = 'WS';
    var order = UI.shuffle(T.POINTS.map(function (p) { return p.id; }), rngFor(s.id));
    var placed = state.done[s.id] ? order.slice() : [];
    var tray = h('div', { class: 'tray', 'aria-label': 'Diagrams to place' });
    var cv = Curve.create({ systems: [{ sys: sys, cls: 'cl-ws' }], marks: true, eqLine: false });
    cv.reach(5);
    var slotNodes = {};
    var stage = h('div', { class: 'match-slots' });
    T.POINTS.forEach(function (pt, i) {
      var slot = h('div', { class: 'match-slot drop', 'data-drop': pt.id, tabindex: '0', role: 'button',
        'aria-label': 'Drop here: point ' + (i + 1) + ', ' + pt.name }, []);
      slotNodes[pt.id] = slot;
      stage.appendChild(slot);
    });
    function tileOf(id) {
      var pt = T.point(id), d = Particles.create(sys, { small: true });
      d.set(pt.u);
      var label = 'Diagram: ' + T.flask(sys, pt.u);
      var t = h('button', { type: 'button', class: 'tile match-tile', 'data-tile': id, 'aria-label': label }, [d.node,
        h('span', { class: 'match-tally', text: T.flask(sys, pt.u) })]);
      return t;
    }
    function paint() {
      tray.innerHTML = '';
      order.forEach(function (id) { if (placed.indexOf(id) < 0) tray.appendChild(tileOf(id)); });
      if (!tray.firstChild) tray.appendChild(h('p', { class: 'tray-empty', text: 'All placed.' }));
      T.POINTS.forEach(function (pt, i) {
        var slot = slotNodes[pt.id];
        slot.innerHTML = '';
        slot.classList.toggle('filled', placed.indexOf(pt.id) >= 0);
        slot.appendChild(h('span', { class: 'slot-num', text: String(i + 1) }));
        slot.appendChild(h('span', { class: 'slot-name', text: pt.name + ' (' + mL(pt.u) + ' mL)' }));
        if (placed.indexOf(pt.id) >= 0) slot.appendChild(h('span', { class: 'slot-fill', text: T.flask(sys, pt.u) }));
        else slot.appendChild(h('span', { class: 'slot-empty', text: 'drop a diagram here' }));
      });
    }
    var picker = Picker({ tray: tray, stage: stage, say: say,
      prompt: function () { return 'Now click the point on the curve where this flask belongs.'; },
      label: function () { return 'Diagram'; },
      drop: function (target, key) {
        if (target !== key) {
          var c = T.counts(sys, T.point(key).u), want = T.point(target);
          say('That flask has ' + c.Na + ' Na⁺, so ' + c.Na + ' of the 24 units of NaOH have been added (' + mL(c.Na) + ' mL). ' +
              'Point ' + (T.POINTS.indexOf(want) + 1) + ', ' + want.name.toLowerCase() + ', is at ' + mL(want.u) + ' mL.', 'bad');
          return;
        }
        placed.push(key);
        paint();
        if (placed.length === order.length) complete('Every diagram is on its point.');
        else say('Right: ' + T.point(key).name + '.', 'good');
      } });
    el.stage.appendChild(h('div', { class: 'work-row row-match' }, [
      panel('The diagrams', 'drag, or click a diagram and then a point', [tray], 'pmatch'),
      panel('The points', 'HF with NaOH', [stage], 'pslots'),
      panel('The curve', null, [cv.node], 'pcurve')
    ]));
    paint();
    return { destroy: function () { picker.destroy(); } };
  };

  /* ---- find: move a marker to the right place on a curve */

  RENDER.find = function (s) {
    var rand = rngFor(s.id);
    var weakIsA = rand() < 0.5;
    var A = weakIsA ? 'WS' : 'SS', B = weakIsA ? 'SS' : 'WS';
    var ROUNDS = [
      { kind: 'which' },
      { kind: 'mark', sys: 'WS', want: 12, text: 'Move the marker to the half-equivalence point of the HF curve: the middle of the gently sloping buffer region, where HF and F⁻ are equal in number.' },
      { kind: 'mark', sys: 'WS', want: 24, text: 'Now move it to the equivalence point of the HF curve: the middle of the steep rise.' },
      { kind: 'mark', sys: 'SS', want: 24, text: 'Last, the equivalence point of the HCl curve.' }
    ];
    var r = state.done[s.id] ? ROUNDS.length : 0;
    var cvHost = h('div'), qHost = h('div');
    var cv = null;

    function round() {
      cvHost.innerHTML = ''; qHost.innerHTML = '';
      if (r >= ROUNDS.length) { finish(); return; }
      var R = ROUNDS[r];
      if (R.kind === 'which') {
        cv = Curve.create({ systems: [{ sys: 'WS', cls: 'cl-ws', label: weakIsA ? 'A' : 'B' }, { sys: 'SS', cls: 'cl-ss', label: weakIsA ? 'B' : 'A' }] });
        cvHost.appendChild(cv.node);
        qHost.appendChild(h('p', { class: 'walk-where', text: 'Step ' + (r + 1) + ' of ' + ROUNDS.length }));
        qHost.appendChild(h('p', { class: 'q-text', text: 'These are the titration curves of HCl and HF with NaOH. Which curve is the weak acid, HF?' }));
        var row = h('div', { class: 'btnrow' });
        ['A', 'B'].forEach(function (L) {
          row.appendChild(h('button', { type: 'button', class: 'ghostbtn', 'data-curve': L, text: 'Curve ' + L,
            onclick: function () {
              var isWeak = (L === 'A') === weakIsA;
              if (isWeak) { say('Right. A weak acid ionizes only a little, so there is less H⁺ and it starts at a higher pH.', 'good'); r += 1; round(); }
              else say('Not that one. The strong acid ionizes completely, so it has the most H⁺ at the start and starts at the lower pH.', 'bad');
            } }, []));
        });
        qHost.appendChild(row);
      } else {
        var cls = sysClass(R.sys);
        var read = h('p', { class: 'readout', text: 'Marker: not placed yet' });
        cv = Curve.create({ systems: [{ sys: R.sys, cls: cls }], pick: { sys: R.sys, onMove: function (u) {
          read.textContent = 'Marker: ' + mL(u) + ' mL of NaOH, pH ' + pHtext(R.sys, u);
        } } });
        cvHost.appendChild(cv.node);
        qHost.appendChild(h('p', { class: 'walk-where', text: 'Step ' + (r + 1) + ' of ' + ROUNDS.length }));
        qHost.appendChild(h('p', { class: 'q-text', text: R.text }));
        qHost.appendChild(read);
        qHost.appendChild(h('p', { class: 'muted small', text: 'Click or drag on the graph, or Tab to it and use the arrow keys.' }));
        qHost.appendChild(h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary', text: 'Check', 'data-check': '1',
          onclick: function () { check(R); } })]));
      }
    }
    function check(R) {
      var u = cv.getPick();
      if (u == null) { say('Place the marker on the curve first.', 'bad'); return; }
      if (Math.abs(u - R.want) <= 1) {
        say(R.sys === 'SS' && R.want === 24
          ? 'Right: 25.00 mL, pH ' + pHtext('SS', 24) + '. Both equivalence points are at the same volume. Only the pH is different.'
          : 'Right: ' + mL(R.want) + ' mL, pH ' + pHtext(R.sys, R.want) + '.', 'good');
        r += 1; round();
        return;
      }
      var msg;
      if (R.want === 12) {
        msg = u >= 22 ? 'That is the equivalence point. Half-equivalence is half of the NaOH needed to get there, in the middle of the gentle slope.'
            : (u < 12 ? 'Too early: not yet half of the NaOH needed has been added.' : 'Too late: more than half of the NaOH needed has been added.');
      } else {
        msg = u < 23 ? 'Not yet. The equivalence point is in the middle of the steep rise, where the pH changes fastest.'
                     : 'That is past the steep rise. The equivalence point is in the middle of it.';
      }
      say(msg, 'bad');
    }
    function finish() {
      cv = Curve.create({ systems: [{ sys: 'WS', cls: 'cl-ws', label: 'HF' }, { sys: 'SS', cls: 'cl-ss', label: 'HCl' }], eqLine: true });
      cvHost.appendChild(cv.node);
      qHost.appendChild(reveal([
        'Both curves reach the equivalence point at the same volume, 25.00 mL, because the same moles of acid need the same moles of base.',
        'The pH there is different: ' + pHtext('SS', 24) + ' for HCl and ' + pHtext('WS', 24) + ' for HF.'
      ]));
      if (!state.done[s.id]) complete('All four done.');
    }
    el.stage.appendChild(h('div', { class: 'work-row row-find' }, [panel('The graph', null, [cvHost], 'pcurve'), panel('Your task', null, [qHost], 'pwalk')]));
    round();
  };

  /* ---- quiz */

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

  function acidTable(withAcetic) {
    var rows = [['HCl', 'strong', 'very large', '-'],
                ['HF', 'weak', fmtKa(T.KA_HF), T.PKA_HF.toFixed(2)]];
    if (withAcetic) rows.push(['CH₃COOH', 'weak', fmtKa(T.KA_AC), T.PKA_AC.toFixed(2)]);
    return h('div', null, [h('table', { class: 'ref-table', 'aria-label': 'The acids in this activity' }, [
      h('tr', null, ['Acid', 'Type', 'Ka', 'pKa'].map(function (t) { return h('th', { text: t }); }))
    ].concat(rows.map(function (r) {
      return h('tr', null, r.map(function (t, i) { return h('td', { class: i > 1 ? 'num' : '', text: t }); }));
    }))), h('p', { class: 'ref-foot', text: 'All pH values are at 25 °C. H⁺ stands for H₃O⁺.' })]);
  }

  function particleKey() {
    return h('ul', { class: 'pkey' }, [
      ['p-h', 'H⁺', 'hydrogen ion'], ['p-oh', 'OH⁻', 'hydroxide ion'], ['p-na', 'Na⁺', 'sodium ion'],
      ['p-a', 'Cl⁻, F⁻, Ac⁻', 'the anion of the acid'], ['p-ha', 'HF, HAc', 'a whole acid molecule']
    ].map(function (r) {
      return h('li', null, [h('span', { class: 'pkey-sw ' + r[0], 'aria-hidden': 'true' }), h('b', { text: r[1] }), ' ' + r[2]]);
    }).concat([h('li', { class: 'muted', text: 'Water is in the flask but is not drawn.' })]));
  }

  RENDER.quiz = function (s) {
    var Q = QUIZZES[s.quiz];
    var ids = state.draws[s.quiz];
    var box = h('div', { class: 'quiz' });
    var side = h('details', { class: 'reference quiz-table', open: true }, [h('summary', { text: 'Reference' }), acidTable(s.quiz === 'E'), particleKey()]);
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
        var d = Particles.create(q.diagram.sys);
        d.set(q.diagram.u);
        return h('figure', { class: 'q-fig q-flask' }, [d.node, h('figcaption', { text: T.SYSTEMS[q.diagram.sys].acid + ' flask' +
          (q.diagram.sys === 'AC' ? ' (HAc = CH₃COOH, Ac⁻ = CH₃COO⁻)' : '') })]);
      }
      if (q.curve) {
        var c = Curve.create({ systems: q.curve.systems, live: q.curve.mark != null, eqLine: !!q.curve.eqLine });
        if (q.curve.mark != null) c.setU(q.curve.mark);
        return h('figure', { class: 'q-fig q-curve' }, [c.node]);
      }
      return null;
    }

    function ask(n) {
      var id = ids[n];
      if (id == null) { summary(); return; }
      if (state.ans[id] != null) { ask(n + 1); return; }
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
      var next = h('button', { type: 'button', class: 'primary', hidden: true, text: n + 1 < ids.length ? 'Next question →' : 'Finish checkpoint' });
      order.forEach(function (ci, pos) {
        var letter = String.fromCharCode(65 + pos);
        var b = h('button', { type: 'button', class: 'choice', 'data-choice': ci }, [
          h('span', { class: 'choice-letter', text: letter }), h('span', { class: 'choice-text', text: q.choices[ci] })]);
        b.addEventListener('click', function () { answer(ci); });
        rowN.appendChild(b);
      });
      box.appendChild(rowN);
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
        next.hidden = false;
        next.focus({ preventScroll: true });
      }
      next.addEventListener('click', function () { ask(n + 1); });
    }
    ask(0);
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
      'The equivalence point is where the moles of base added equal the moles of acid. What the pH is there depends on which ions are left in the flask.',
      'Strong acid with a strong base: only spectator ions (Na⁺ and Cl⁻) are left, they do not react with water, and the equivalence point is exactly pH 7.',
      'Weak acid with a strong base: before the equivalence point the flask holds the acid and its conjugate base, a buffer. At the half-equivalence point they are equal in number and pH = pKa.',
      'At the equivalence point of a weak acid only the conjugate base is left. It reacts with water and makes OH⁻, so the pH is above 7. The weaker the acid, the higher that pH.',
      'After the equivalence point, the extra OH⁻ from the NaOH sets the pH, whatever the acid was.',
      'The curve is steepest at the equivalence point. A weak acid starts at a higher pH than a strong acid of the same amount, because it ionizes only a little.'
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
    el.acidBody.appendChild(acidTable(true));
    el.keyBody.appendChild(particleKey());
    var dl = h('dl', { class: 'vocab' });
    [
      ['Titration', 'Adding a solution of known concentration (here NaOH, from a buret) a little at a time to a flask of another until they have reacted completely.'],
      ['Titrant and analyte', 'The titrant is the solution added from the buret (NaOH here). The analyte is the solution in the flask (the acid).'],
      ['Equivalence point', 'The point where the moles of base added equal the moles of acid in the flask. Its pH depends on which ions are left.'],
      ['Half-equivalence point', 'Half of the NaOH needed for the equivalence point has been added. For a weak acid, HA and A⁻ are equal in number here, so pH = pKa.'],
      ['Strong acid', 'An acid that ionizes completely in water. HCl is all H⁺ and Cl⁻.'],
      ['Weak acid', 'An acid that ionizes only a little in water. Most HF stays as whole HF molecules.'],
      ['Conjugate base', 'What is left when an acid gives away an H⁺. F⁻ is the conjugate base of HF. The conjugate base of a weak acid reacts with water and makes OH⁻.'],
      ['Buffer', 'A solution with a large amount of both a weak acid and its conjugate base. The acid reacts with added base and the conjugate base reacts with added acid, so the pH changes only a little.'],
      ['Spectator ion', 'An ion that is in the flask the whole time and takes no part in the reaction, such as Na⁺ and Cl⁻.'],
      ['pKa', 'A number that measures how weak an acid is: the larger the pKa, the weaker the acid. When a weak acid is titrated, the pH at the half-equivalence point is about the pKa.']
    ].forEach(function (p) { dl.appendChild(h('dt', { text: p[0] })); dl.appendChild(h('dd', { text: p[1] })); });
    el.vocabBody.appendChild(dl);
  }

  /* ------------------------------------------------------------------ boot */

  function showIntro() {
    var box = h('div', { class: 'screen-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'introTitle' }, [
      h('h2', { id: 'introTitle', text: 'Titration curves' }),
      h('p', { text: 'When you add a base to an acid, what is happening in the flask? You will watch the particles change at five ' +
                     'points on a titration curve, and see why a strong acid and a weak acid end at different pH values.' }),
      h('ul', { class: 'screen-list' }, [
        h('li', { text: 'Part 1, Strong acid: HCl with NaOH, point by point.' }),
        h('li', { text: 'Part 2, Weak acid: HF with NaOH, and how it differs.' }),
        h('li', { text: 'Part 3, Why the equivalence points differ.' }),
        h('li', { text: 'Part 4, Reading the curve.' }),
        h('li', { text: 'Part 5, Review with a different weak acid.' })
      ]),
      h('p', { text: 'Predictions are never graded, so try things. The five checkpoints are graded: your first answer to each ' +
                     'question counts. About 40 minutes. Your progress is saved if you leave.' }),
      h('p', { class: 'screen-note', text: 'No calculating is needed. Everything works with a mouse, a touch screen or the keyboard ' +
                     '(Tab, Enter, and the arrow keys on a slider or the graph).' })
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
     'score', 'lms', 'screen', 'acidBody', 'keyBody', 'vocabBody'].forEach(function (id) { el[id] = $(id); });
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

  return { start: start, SCHEMA: SCHEMA, STEPS: STEPS, GRADED: GRADED, PARTS: PARTS, CONTRAST: CONTRAST, flaskChoices: flaskChoices,
           setterChoices: setterChoices, story: story, phStory: phStory, state: function () { return state; }, ctl: function () { return ctl; } };
})();

document.addEventListener('DOMContentLoaded', App.start);

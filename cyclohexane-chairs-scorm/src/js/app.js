/* app.js: the steps, their order, saving, scoring.
 *
 * Part 1  The chair: its shape, the boat, axial and equatorial, up and down
 * Part 2  The ring flip: axial swaps with equatorial, up stays up
 * Part 3  Axial crowding: 1,3-diaxial interactions and A-values (the core)
 * Part 4  Two groups: cis and trans, and the more stable chair
 *
 * Only the four checkpoints are graded (first answer counts). Builds, labels,
 * flips and predictions must be finished to move on but are never scored: a
 * wrong build gets an explanation and another try, and a prediction is just
 * compared with what really happens.
 *
 * Every checkpoint question is qualitative (compare, rank, identify,
 * explain). The A-value table sits open beside checkpoints 3 and 4.
 */

var App = (function () {
  'use strict';

  /* Bump whenever the step list, a quiz pool or a molecule changes: a save
     from an older build is then discarded and the student starts fresh. */
  var SCHEMA = 1;

  var PARTS = [
    { n: 1, name: 'The chair' },
    { n: 2, name: 'The ring flip' },
    { n: 3, name: 'Axial crowding' },
    { n: 4, name: 'Two groups' },
    { n: 5, name: 'Results' }
  ];

  var STEPS = [
    { id: 'meet', part: 1, kind: 'meet',
      title: 'Meet the chair',
      text: 'Cyclohexane is a ring of six carbons, each carrying two H atoms. The ring is not flat: it folds into a ' +
            'shape called a chair. Predict first, then turn the 3D model and look at it from three directions.' },
    { id: 'boat', part: 1, kind: 'boat',
      title: 'Chair or boat?',
      text: 'The same ring can also fold into a boat, with both ends pointing up. Predict which shape is more ' +
            'stable, then compare them.' },
    { id: 'label-ax', part: 1, kind: 'labelax',
      title: 'Axial or equatorial?',
      text: 'Each carbon of the chair has two H atoms. One is axial: it points straight up or straight down, ' +
            'parallel to the axis of the ring. The other is equatorial: it points out from the ring, around its ' +
            '“equator”. Choose a word, then click every H it describes.' },
    { id: 'updown', part: 1, kind: 'updown',
      title: 'Up or down?',
      text: 'Every H also points either up, toward the top face of the ring, or down, toward the bottom face. ' +
            'Predict the pattern first.' },
    { id: 'quiz-A', part: 1, kind: 'quiz', quiz: 'A', title: 'Checkpoint 1', text: '' },

    { id: 'flip', part: 2, kind: 'flip', mol: 'tracked',
      title: 'Flip the ring',
      text: 'A chair can turn itself inside out: one end of the ring flips up and the other end flips down. This ' +
            'is a ring flip. Only single bonds turn; no bond breaks. Follow the red H on C1 through a flip.' },
    { id: 'build-flip', part: 2, kind: 'build', mol: 'methyl', source: 'chair', k: 1, slots: ['1t', '1b'],
      title: 'Draw the other chair',
      text: 'Here is methylcyclohexane with its CH₃ axial on C1. After a ring flip, where do the CH₃ and the H on ' +
            'C1 go? Put each one in its place on the second chair, then press Check.' },
    { id: 'quiz-B', part: 2, kind: 'quiz', quiz: 'B', title: 'Checkpoint 2', text: '' },

    { id: 'crowd', part: 3, kind: 'crowd', mol: 'methyl',
      title: 'Who does the axial CH₃ bump into?',
      text: 'In this chair of methylcyclohexane the CH₃ is axial and points up. It crowds two H atoms. Find them: ' +
            'click them in the drawing or in the 3D model. Turn the model as much as you like.' },
    { id: 'compare', part: 3, kind: 'compare', mol: 'methyl',
      title: 'Flip it equatorial',
      text: 'Now flip the ring so the CH₃ becomes equatorial, and compare the two chairs. Predict first.' },
    { id: 'newman', part: 3, kind: 'newman', mol: 'methyl',
      title: 'Down the C1–C2 bond',
      text: 'You have met this kind of crowding before, in Newman projections. Look down the C1–C2 bond of each ' +
            'chair. Predict first.' },
    { id: 'swap', part: 3, kind: 'swap',
      title: 'Bigger groups push harder',
      text: 'An axial group always crowds the two axial H atoms on its face. How much it crowds them depends on ' +
            'the group. For each group, predict how its preference for the equatorial position compares with ' +
            'CH₃’s, then look.' },
    { id: 'quiz-C', part: 3, kind: 'quiz', quiz: 'C', title: 'Checkpoint 3', text: '' },

    { id: 'build-flat', part: 4, kind: 'build', mol: 'trans14', source: 'flat', k: 0, slots: ['1t', '1b', '4t', '4b'],
      title: 'From flat ring to chair',
      text: 'Two groups on one ring can be on the same face (cis) or on opposite faces (trans). In a flat drawing ' +
            'a wedge means the top face and a dash the bottom face. This is trans-1,4-dimethylcyclohexane. Put ' +
            'each group in its place on the chair, then press Check.' },
    { id: 'pair', part: 4, kind: 'pair',
      title: 'Which chair wins?',
      text: 'Compare trans- and cis-1,4-dimethylcyclohexane. Predict what a ring flip does to each one’s energy, ' +
            'then flip both.' },
    { id: 'best', part: 4, kind: 'best',
      title: 'Lock in the better chair',
      text: 'Sometimes both groups cannot be equatorial at once. For each molecule, predict, flip to the more ' +
            'stable chair and lock it in.' },
    { id: 'quiz-D', part: 4, kind: 'quiz', quiz: 'D', title: 'Checkpoint 4', text: '' },

    { id: 'results', part: 5, kind: 'results', title: 'Results', text: '' }
  ];


  /* Every prediction the steps ask, with its key: the choice the model says
     is right. Predictions are never graded, but tools/validate.js checks each
     key against the model so the reveal never contradicts the picture. */
  var PREDICT = {
    flat: { q: 'Suppose the six carbons lay flat, as a regular hexagon. Every C–C–C angle would be 120°, and ' +
      'every C–C bond would be eclipsed. What kinds of strain would a flat ring have?',
      choices: ['Angle strain and torsional strain', 'Only angle strain', 'Only torsional strain', 'Neither'],
      answer: 0 },
    boat: { q: 'Which shape is more stable?', choices: ['The chair', 'The boat', 'They are equally stable'], answer: 0 },
    axialC2: { q: 'The axial H on C1 points up. Which way does the axial H on C2, the next carbon round, point?',
      choices: ['Down', 'Up', 'Out to the side, like an equatorial H'], answer: 0 },
    eqC1: { q: 'Which way does the equatorial H on C1 point?',
      choices: ['Out, and slightly down', 'Out, and slightly up', 'Straight up'], answer: 0 },
    flip: { q: 'The red H on C1 is axial and points up. After the ring flips, where will the red H be?',
      choices: ['Equatorial, still pointing up', 'Axial, pointing down', 'Equatorial, pointing down',
      'Axial, still pointing up'], answer: 0 },
    lower: { q: 'Which chair of methylcyclohexane is lower in energy?',
      choices: ['The chair with the CH₃ equatorial', 'The chair with the CH₃ axial', 'They have the same energy'],
      answer: 0 },
    count: { q: 'In chair 2, how many H atoms does the equatorial CH₃ crowd?', choices: ['None', 'One', 'Two', 'Three'],
      answer: 0, compact: true },
    gauche: { q: 'Look down the C1–C2 bond of chair 1, where the CH₃ is axial. How are the CH₃ on C1 and the ring ' +
      'carbon C3 (attached to C2) arranged?',
      choices: ['Gauche: 60° apart', 'Anti: 180° apart', 'Eclipsed: lined up'], answer: 0 },
    c1c6: { q: 'Now look down the C1–C6 bond of the same chair. Which ring carbon is the axial CH₃ gauche to this time?',
      choices: ['C5', 'C3', 'C4'], answer: 0, compact: true },
    cistrans: { q: 'Can a ring flip turn cis-1,4-dimethylcyclohexane into trans-1,4-dimethylcyclohexane?',
      choices: ['No: a flip never moves a group to the other face, so cis stays cis',
      'Yes: a flip moves every group to the other face',
      'Yes, but only if the ring is heated'], answer: 0 }
  };

  var QZ = QUIZZES;

  var GRADED = Object.keys(QZ).reduce(function (s, k) { return s + QZ[k].draw; }, 0);

  var el = {};
  var state = null;
  var ctl = null;           /* the current step's controller */
  var preview = false;      /* ?step= teacher preview: nothing is saved or reported */
  var fmt = AVAL.fmt;

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }

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

  function label(key) { return GROUPS[key].label; }

  function stepIndex(id) {
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === id) return i;
    return -1;
  }

  function groupAt(mol, pos) { return MOLECULES.groupAt(mol, CHAIR.carbonOf(pos), CHAIR.faceOf(pos)); }

  /* Every atom of the group at `pos`, for glowing a whole group. */
  function groupAtoms(mol, pos) {
    var m = CHAIR.model(mol, 0);
    return m.atoms.filter(function (a) { return a.pos === pos; }).map(function (a) { return a.id; });
  }

  /* The atoms that glow in chair k: the atoms that actually touch in each
     1,3-diaxial interaction (the inward H of an axial CH₃ and the axial H it
     meets, say), or the two heads if nothing touches. */
  function crowdGlow(mol, k) {
    var m = CHAIR.model(mol, k), out = [];
    var touching = CHAIR.contacts(m, 0.05);
    function add(id) { if (out.indexOf(id) < 0) out.push(id); }
    AVAL.chair(mol, k).parts.forEach(function (p) {
      p.pos.forEach(function (pq) {
        var hit = false;
        touching.forEach(function (c) {
          var a = CHAIR.atom(m, c.a), b = CHAIR.atom(m, c.b);
          if ((a.pos === pq[0] && b.pos === pq[1]) || (a.pos === pq[1] && b.pos === pq[0])) { add(a.id); add(b.id); hit = true; }
        });
        if (!hit) { add(pq[0]); add(pq[1]); }
      });
    });
    return out;
  }

  /* ------------------------------------------------------------------ state */

  function newState() {
    var seed = Math.floor(Math.random() * 1e9);
    var rand = rng(seed);
    var draws = {};
    Object.keys(QZ).forEach(function (k) {
      var Q = QZ[k];
      var core = Q.core.slice();
      var rest = shuffle(Q.pool.map(function (q) { return q.id; }).filter(function (id) {
        return core.indexOf(id) < 0;
      }), rand);
      var ids = core.concat(rest.slice(0, Q.draw - core.length));
      /* keep the pool's own order, so related questions sit together */
      draws[k] = Q.pool.map(function (q) { return q.id; }).filter(function (id) { return ids.indexOf(id) >= 0; });
    });
    /* `best` is the best finished attempt's percentage; `att` counts attempts */
    return { v: SCHEMA, seed: seed, step: 0, max: 0, draws: draws, ans: {}, pick: {}, pr: {}, done: {}, fin: 0,
             best: 0, att: 1 };
  }

  function restore(saved) {
    /* a save from any other release is ignored: the student starts fresh */
    if (!saved || !saved.draws || saved.v !== SCHEMA) return null;
    var ok = Object.keys(QZ).every(function (k) {
      return (saved.draws[k] || []).length === QZ[k].draw && saved.draws[k].every(function (id) {
        return QZ[k].pool.some(function (q) { return q.id === id; });
      });
    });
    return ok ? saved : null;
  }

  function persist() {
    if (preview) return;
    SCORM.saveState(state);
  }

  function correctCount() {
    return Object.keys(state.ans).reduce(function (s, k) { return s + (state.ans[k] ? 1 : 0); }, 0);
  }

  function attemptPercent() { return 100 * correctCount() / GRADED; }

  /* The gradebook gets the better of this attempt and the best finished one,
     so starting a new attempt can never lower a student's grade. */
  function reportScore() {
    if (preview) return;
    SCORM.setScore(Math.max(state.best || 0, attemptPercent()));
  }

  /* A fresh attempt: new checkpoint questions, every answer, build and
     prediction cleared. The parts already reached stay open. */
  function newAttempt() {
    var keep = {
      best: Math.max(state.best || 0, state.fin ? attemptPercent() : 0),
      att: (state.att || 1) + 1,
      max: state.max
    };
    state = newState();
    state.best = keep.best;
    state.att = keep.att;
    state.max = keep.max;
    persist();
    reportScore();
    goTo(0);
  }

  function complete(msg, kind) {
    var s = STEPS[state.step];
    state.done[s.id] = 1;
    if (state.step + 1 > state.max) state.max = state.step + 1;
    persist();
    el.next.disabled = false;
    paintParts();
    if (msg) say(msg, kind || 'good');
  }

  /* --------------------------------------------------------------- chrome */

  function paintParts() {
    el.parts.innerHTML = '';
    var cur = STEPS[state.step].part;
    PARTS.forEach(function (p) {
      var first = -1;
      for (var i = 0; i < STEPS.length; i++) if (STEPS[i].part === p.n) { first = i; break; }
      var open = first <= state.max;
      var b = h('button', {
        type: 'button', class: 'tab' + (p.n === cur ? ' current' : '') + (open ? '' : ' locked'),
        disabled: !open, 'aria-current': p.n === cur ? 'step' : null,
        onclick: function () { if (open) goTo(first); }
      }, [p.n < 5 ? p.n + '  ' + p.name : p.name]);
      el.parts.appendChild(b);
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
      ? 'Graded: your first answer to each question counts. Read the explanation after each one.' +
        (s.quiz === 'C' || s.quiz === 'D' ? ' The A-value table is open beside the questions, so use it to ' +
          'compare groups. Nothing needs to be calculated.' : '')
      : s.text;
    el.instructions.textContent = text;
    el.instructions.hidden = !text;
    el.stage.innerHTML = '';
    el.stage.className = 'stage stage-' + s.kind;
    say('');
    el.next.disabled = !(state.done[s.id] || i < state.max);
    el.next.hidden = s.kind === 'results';
    el.next.textContent = STEPS[i + 1] && STEPS[i + 1].kind === 'results' ? 'See results →' : 'Next →';
    el.back.hidden = i === 0;
    paintParts();
    ctl = RENDER[s.kind](s) || null;
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------- shared panels */

  function panel(title, hint, kids, cls) {
    return h('section', { class: 'panel ' + (cls || '') }, [
      h('div', { class: 'panel-head' }, [h('h3', { text: title }), hint ? h('span', { class: 'hint', text: hint }) : null])
    ].concat(kids || []));
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
    return h('div', { class: 'reveal' }, lines.filter(Boolean).map(function (t) { return h('p', { text: t }); }));
  }

  /* "Right." or "You predicted X." in front of a reveal. */
  function verdict(p, chosen) {
    if (chosen == null) return '';
    return chosen === p.answer ? 'Your prediction was right. ' : 'You predicted “' + p.choices[chosen] + '”. ';
  }

  /* 3D model with its view buttons.
     opts.views    [[name, button text, args?]]; default side and top
     opts.t        flip progress to show
     opts.style    'space' to start space-filling
     opts.onView   called with the view's name when a button is pressed */
  function model3D(mol, opts) {
    opts = opts || {};
    var t = opts.t || 0;
    var canvas = h('canvas', { class: 'c3d', role: 'img',
      'aria-label': '3D model of ' + mol.name + '. Drag to turn it.' });
    var views = opts.views || [['side', 'Side view'], ['top', 'Top view']];
    var space = opts.style === 'space';
    var buttons = views.map(function (v) {
      var b = h('button', { type: 'button', class: 'mini', text: v[1] });
      b.addEventListener('click', function () {
        ensure().setView(v[0], v[2]);
        if (opts.onView) opts.onView(v[0], v[2]);
      });
      return b;
    });
    var bFill = h('button', { type: 'button', class: 'mini toggle', 'aria-pressed': space ? 'true' : 'false',
                              text: 'Space-filling' });
    bFill.addEventListener('click', function () {
      var on = bFill.getAttribute('aria-pressed') !== 'true';
      bFill.setAttribute('aria-pressed', on ? 'true' : 'false');
      ensure().setStyle(on ? 'space' : 'ball');
      if (opts.onStyle) opts.onStyle(on);
    });
    var node = panel(opts.title || '3D model', 'drag to turn', [
      h('div', { class: 'c3d-wrap' + (opts.short ? ' short' : '') }, [canvas]),
      h('div', { class: 'btnrow' }, buttons.concat([bFill])),
      opts.note ? h('p', { class: 'view-note', text: opts.note }) : null
    ], 'p3d');
    var viewer = null;
    function ensure() {
      if (!viewer) {
        viewer = new Viewer3D(canvas, CHAIR.model(mol, t), {
          view: opts.view, viewArgs: opts.viewArgs, style: space ? 'space' : 'ball',
          tint: opts.tint, glow: opts.glow, pickable: opts.pickable, onPick: opts.onPick,
          radius: Viewer3DRadius(mol)
        });
      }
      return viewer;
    }
    return {
      node: node,
      /* the canvas must be in the document before it can be sized */
      start: function () { ensure(); viewer.resize(); return viewer; },
      viewer: function () { return ensure(); },
      setT: function (t2) { t = t2; ensure().setModel(CHAIR.model(mol, t2)); },
      setMolecule: function (m, t2) {
        mol = m; t = t2 || 0;
        canvas.setAttribute('aria-label', '3D model of ' + m.name + '. Drag to turn it.');
        var v = ensure();
        v.radius = Viewer3DRadius(m);
        v.setModel(CHAIR.model(m, t));
      }
    };
  }

  /* One scale for a molecule's whole flip, so the model does not breathe. */
  function Viewer3DRadius(mol) {
    var r = 3.2;
    [0, 0.5, 1].forEach(function (t) {
      CHAIR.model(mol, t).atoms.forEach(function (a) { r = Math.max(r, CHAIR.vec.len(a.p) + ELEMENTS[a.el].vdw * 0.75); });
    });
    return r;
  }

  /* The ring-flip control: a slider from chair 1 to chair 2 and a button
     that plays the flip. onChange(t) is called on every change. */
  function flipper(onChange, opts) {
    opts = opts || {};
    var t = opts.t || 0;
    var range = h('input', { type: 'range', min: 0, max: 100, step: 1, value: Math.round(t * 100), class: 'flip-range',
      'aria-label': opts.aria || 'Ring flip, from chair 1 (0) to chair 2 (100)' });
    var btn = h('button', { type: 'button', class: 'primary flip-btn', text: t < 0.5 ? 'Flip to chair 2 ▶' : '◀ Flip to chair 1' });
    var anim = null;
    function valueText() { return t <= 0.02 ? 'Chair 1' : t >= 0.98 ? 'Chair 2' : 'Flipping, ' + Math.round(t * 100) + '%'; }
    function set(v, quiet) {
      t = Math.max(0, Math.min(1, v));
      range.value = Math.round(t * 100);
      range.setAttribute('aria-valuetext', valueText());
      btn.textContent = t < 0.5 ? 'Flip to chair 2 ▶' : '◀ Flip to chair 1';
      if (!quiet) onChange(t);
    }
    range.addEventListener('input', function () {
      if (anim) { cancelAnimationFrame(anim); anim = null; }
      set(+range.value / 100);
    });
    btn.addEventListener('click', function () {
      var from = t, to = t < 0.5 ? 1 : 0;
      if (anim) cancelAnimationFrame(anim);
      if (reduceMotion) { set(to); return; }
      var t0 = null, dur = 1700 * Math.abs(to - from) + 200;
      function step(ts) {
        if (t0 == null) t0 = ts;
        var u = Math.min(1, (ts - t0) / dur);
        set(from + (to - from) * u);
        anim = u < 1 ? requestAnimationFrame(step) : null;
      }
      anim = requestAnimationFrame(step);
    });
    set(t, true);
    var node = h('div', { class: 'flipper' }, [
      h('div', { class: 'flip-row' }, [btn, range]),
      h('div', { class: 'flip-ends', 'aria-hidden': 'true' }, [h('span', { text: 'chair 1' }), h('span', { text: 'chair 2' })])
    ]);
    return {
      node: node,
      t: function () { return t; },
      set: function (v) { set(v); },
      stop: function () { if (anim) cancelAnimationFrame(anim); anim = null; }
    };
  }

  /* The share of molecules in each chair. */
  function shareBox(mol, names) {
    var p2 = AVAL.share(mol, 1), p1 = 1 - p2;
    var big = p2 >= p1 ? 1 : 0;
    var pct = function (p) { return p >= 0.995 ? '>99%' : p <= 0.005 ? '<1%' : Math.round(p * 100) + '%'; };
    var bar = h('div', { class: 'share-bar', role: 'img',
      'aria-label': 'Share of molecules: chair 1 ' + pct(p1) + ', chair 2 ' + pct(p2) + '.' }, [
      h('span', { class: 's1', style: 'width:' + (p1 * 100).toFixed(2) + '%', text: p1 > 0.12 ? 'Chair 1 ' + pct(p1) : '' }),
      h('span', { class: 's2', style: 'width:' + (p2 * 100).toFixed(2) + '%', text: p2 > 0.12 ? 'Chair 2 ' + pct(p2) : '' })
    ]);
    var line = Math.abs(p1 - p2) < 0.02
      ? 'The two chairs are equally stable, so at any moment about half the molecules are in each.'
      : 'At any moment, ' + AVAL.shareText(Math.max(p1, p2)) + ' molecules are in chair ' + (big + 1) +
        (names ? ' (' + names[big] + ')' : '') + '. Each molecule still flips back and forth many times a second; ' +
        'it just spends most of its time in the more stable chair.';
    return h('div', { class: 'share' }, [bar, h('p', { class: 'share-text', text: line })]);
  }

  function flatCard(id) {
    var m = molecule(id);
    return h('figure', { class: 'flat-card' }, [Draw.flat(m), h('figcaption', { text: m.name })]);
  }

  function flatRow(ids) {
    return h('div', { class: 'flat-row' }, ids.map(flatCard));
  }

  function keyRow(items) {
    return h('p', { class: 'key-row' }, items.map(function (it) {
      return h('span', null, [h('span', { class: 'sw ' + it[0], 'aria-hidden': 'true' }), it[1]]);
    }));
  }

  /* Shake a target in a chair drawing after a wrong answer. */
  function shake(host, key) {
    var n = host.querySelector('.drop[data-drop="' + key + '"]');
    if (!n) return;
    n.classList.remove('shake');
    void n.getBoundingClientRect();
    n.classList.add('shake');
  }

  /* Hovering or focusing a target in a drawing rings the same atom in 3D. */
  function linkHover(host, viewer) {
    function hot(ev) {
      var d = ev.target.closest && ev.target.closest('.chdrop');
      viewer.setHot(d ? [d.getAttribute('data-pos')] : []);
    }
    host.addEventListener('pointerover', hot);
    host.addEventListener('focusin', hot);
    host.addEventListener('pointerleave', function () { viewer.setHot([]); });
  }

  function ends(t) { return t <= 0.02 ? 0 : t >= 0.98 ? 1 : -1; }

  /* -------------------------------------------------------------- the steps */

  var RENDER = {};

  /* ---- meet: the chair from three directions */

  RENDER.meet = function (s) {
    var mol = molecule('cyclohexane');
    var pr = state.pr.meet || {};
    pr.v = pr.v || {};
    var P = PREDICT.flat;
    var top = h('div'), area = h('div');
    el.stage.appendChild(top);
    el.stage.appendChild(area);
    function save() { state.pr.meet = pr; persist(); }
    var VIEWS = [['side', 'Side view', 'From the side the ring zigzags up and down: that is the chair.'],
                 ['top', 'Top view', 'From above, the ring looks like a hexagon.'],
                 ['bond', 'Down the C1–C2 bond', 'Down a C–C bond you see a Newman projection, with every bond staggered.']];

    function paintTop() {
      top.innerHTML = '';
      top.appendChild(panel('Your prediction', null, [predictCard(P, pr.p, function (i) {
        pr.p = i; save(); paintTop(); open(); check();
      })]));
      if (pr.p != null) {
        top.appendChild(reveal([verdict(P, pr.p) + 'A flat ring would have both. 120° is far from the 109.5° that ' +
          'a carbon with four single bonds prefers (angle strain), and eclipsed bonds cost torsional strain. So the ' +
          'ring folds into a chair. Look at it from three directions, using the buttons under the model.']));
      }
    }

    var opened = false, list, nmBox;
    function open() {
      if (opened) return;
      opened = true;
      list = h('ul', { class: 'checklist' });
      nmBox = h('div', { class: 'nm-wrap' });
      var m3 = model3D(mol, {
        views: VIEWS.map(function (v) { return [v[0], v[1], v[0] === 'bond' ? [1, 2] : null]; }),
        onView: function (v) { pr.v[v] = 1; save(); paint(); check(); }
      });
      area.appendChild(h('div', { class: 'grid2' }, [m3.node, panel('Look from three directions', null, [list, nmBox])]));
      m3.start();
      paint();
    }

    function paint() {
      list.innerHTML = '';
      VIEWS.forEach(function (v) { list.appendChild(h('li', { class: pr.v[v[0]] ? 'done' : '' }, [v[2]])); });
      nmBox.innerHTML = '';
      if (pr.v.bond) {
        nmBox.appendChild(Draw.newman(CHAIR.newman(mol, 0, 1, 2), { cls: 'big' }));
        nmBox.appendChild(h('p', { class: 'muted', text: 'Looking down C1–C2: each bond on the back carbon (C2) sits ' +
          'exactly between two bonds on the front carbon (C1). Staggered, so no torsional strain. Every ring bond ' +
          'of the chair looks like this.' }));
      }
    }

    function check() {
      if (state.done[s.id] || pr.p == null) return;
      var left = VIEWS.filter(function (v) { return !pr.v[v[0]]; });
      if (!left.length) {
        complete('The chair has bond angles close to 109.5° and every C–C bond staggered: no angle strain and no ' +
                 'torsional strain. That makes it the most stable shape of cyclohexane.');
      } else {
        say('Still to look at: ' + left.map(function (v) { return v[1]; }).join(', ') + '.');
      }
    }

    paintTop();
    if (pr.p != null) open();
    if (state.done[s.id]) say('Turn the model as much as you like, or move on.', '');
  };

  /* ---- boat: the chair beside the boat */

  RENDER.boat = function (s) {
    var cy = molecule('cyclohexane');
    var pr = state.pr.boat || {};
    var P = PREDICT.boat;
    var top = h('div'), area = h('div');
    el.stage.appendChild(top);
    el.stage.appendChild(area);
    function save() { state.pr.boat = pr; persist(); }

    function paintTop() {
      top.innerHTML = '';
      top.appendChild(panel('Your prediction', null, [predictCard(P, pr.p, function (i) {
        pr.p = i; save(); paintTop(); open(); check();
      })]));
    }

    var opened = false, nmBox, why;
    function open() {
      if (opened) return;
      opened = true;
      var views = [['side', 'Side view'], ['bond', 'Down the C2–C3 bond', [2, 3]]];
      var chair = model3D(cy, { title: 'Chair', views: views, view: 'side', short: true });
      var boat = model3D(cy, { title: 'Boat', t: 0.5, views: views, view: 'side', short: true, glow: ['1t', '4t'],
        note: 'The two H atoms glowing red are the boat’s “flagpole” H atoms. Try space-filling to see them overlap.',
        onView: function (v) { if (v === 'bond') { pr.bond = 1; save(); paint(); check(); } } });
      nmBox = h('div');
      why = h('div');
      area.appendChild(h('div', { class: 'grid2' }, [chair.node, boat.node]));
      area.appendChild(nmBox);
      area.appendChild(why);
      chair.start();
      boat.start();
      paint();
    }

    function paint() {
      nmBox.innerHTML = '';
      why.innerHTML = '';
      if (!pr.bond) {
        nmBox.appendChild(h('p', { class: 'muted', text: 'Press “Down the C2–C3 bond” under the boat to look along one of its sides.' }));
        return;
      }
      nmBox.appendChild(panel('Down the C2–C3 bond', null, [h('div', { class: 'chair-pair' }, [
        h('figure', null, [Draw.newman(CHAIR.newman(cy, 0, 2, 3), { cls: 'fig' }), h('figcaption', { text: 'Chair: staggered' })]),
        h('figure', null, [Draw.newman(CHAIR.newman(cy, 0.5, 2, 3), { cls: 'fig', offset: 12 }),
          h('figcaption', { text: 'Boat: eclipsed (drawn slightly turned so you can see the back bonds)' })])
      ])]));
      why.appendChild(reveal([
        verdict(P, pr.p) + 'The chair is more stable.',
        'In the boat, the two flagpole H atoms at the ends point straight at each other and their electron clouds ' +
        'overlap: steric strain. Looking down C2–C3, the boat’s bonds are eclipsed: torsional strain. The chair has ' +
        'neither.',
        'The boat can twist a little to ease this (the twist-boat), but it stays well above the chair. At any ' +
        'moment almost every cyclohexane molecule is a chair, so the rest of this activity is about chairs.'
      ]));
    }

    function check() {
      if (state.done[s.id] || pr.p == null) return;
      if (pr.bond) complete('Chair: no strain. Boat: steric strain from the flagpole H atoms and torsional strain from eclipsed bonds.');
    }

    paintTop();
    if (pr.p != null) open();
    if (state.done[s.id]) say('Done. Move on when you are ready.', 'good');
  };

  /* ---- label: axial or equatorial, for all twelve H atoms */

  RENDER.labelax = function (s) {
    var mol = molecule('cyclohexane');
    var lab = state.pr.lab || {};
    var done = !!state.done[s.id];
    var TERMS = ['axial', 'equatorial'];
    var picker;
    var m3 = model3D(mol, {
      views: [['side', 'Side view'], ['top', 'Top view']],
      pickable: function (a) { return a.head; },
      onPick: function (id) {
        if (picker.selected() != null) tryLabel(id, +picker.selected());
        else say('Choose a word first, then the H it describes.');
      }
    });
    var host = h('div', { class: 'chair-wrap' });
    var tray = h('div', { class: 'tray terms', 'aria-label': 'Words to place' });
    el.stage.appendChild(h('div', { class: 'grid2' }, [m3.node, panel('Chair drawing', 'choose a word, then every H it describes', [
      host, tray, keyRow([['ax', 'axial'], ['eq', 'equatorial']])
    ])]));
    m3.start();
    linkHover(host, m3.viewer());

    function paint() {
      var targets = {}, mark = {}, tint = {};
      CHAIR.POSITIONS.forEach(function (p) {
        var l = lab[p];
        targets[p] = { key: p, cls: l ? (l === 'a' ? 'ax done' : 'eq done') : '', tag: l ? (l === 'a' ? 'ax' : 'eq') : null,
          aria: 'H on C' + CHAIR.carbonOf(p) + (l ? ', labelled ' + (l === 'a' ? 'axial' : 'equatorial') : ', not labelled yet') };
        if (l) { mark[p] = l === 'a' ? 'ax' : 'eq'; tint[p] = mark[p]; }
      });
      host.innerHTML = '';
      host.appendChild(Draw.chair(mol, 0, { show: 'all', targets: targets, mark: mark,
        label: 'Chair drawing of cyclohexane with all twelve H atoms as targets.' }));
      tray.innerHTML = '';
      TERMS.forEach(function (t, i) {
        tray.appendChild(h('button', { type: 'button', class: 'tile term', 'data-tile': i, disabled: done }, [t]));
      });
      m3.viewer().setTint(tint);
    }

    function tryLabel(pos, ti) {
      if (done || lab[pos] || CHAIR.POSITIONS.indexOf(pos) < 0) return;
      var ax = CHAIR.isAxial(pos, 0), up = CHAIR.faceOf(pos) === 't';
      var said = TERMS[ti];
      if ((said === 'axial') === ax) {
        lab[pos] = ax ? 'a' : 'e';
        state.pr.lab = lab;
        persist();
        paint();
        var left = 12 - Object.keys(lab).length;
        if (!left) {
          done = true;
          paint();
          complete('All twelve labelled. Six H atoms are axial (straight up or straight down) and six are ' +
                   'equatorial (out around the ring). Every carbon has one of each.');
        } else {
          say('Yes, that H is ' + said + '. ' + left + ' to go.', 'good');
        }
      } else {
        say(ax ? 'Not equatorial. This H points straight ' + (up ? 'up' : 'down') + ', parallel to the ring’s axis. ' +
                 'That makes it axial.'
               : 'Not axial. This H points out from the ring, around its “equator”, not straight up or down. That ' +
                 'makes it equatorial.', 'bad');
        shake(host, pos);
      }
    }

    picker = Picker({
      tray: tray, stage: host, sticky: true,
      label: function (k) { return TERMS[+k]; },
      prompt: function (k) { return 'Now click every H that is ' + TERMS[+k] + '.'; },
      say: function (t) { say(t); },
      drop: function (dk, tk) { tryLabel(dk, +tk); },
      empty: function () { say('Choose a word first, then the H it describes.'); }
    });
    paint();
    if (done) say('All labelled.', 'good');
    return { destroy: function () { picker.destroy(); } };
  };

  /* ---- up or down */

  RENDER.updown = function (s) {
    var mol = molecule('cyclohexane');
    var pr = state.pr.ud || {};
    pr.f = pr.f || {};
    var done = !!state.done[s.id];
    var P1 = PREDICT.axialC2;
    var P2 = PREDICT.eqC1;
    var top = h('div'), area = h('div');
    el.stage.appendChild(top);
    el.stage.appendChild(area);
    function save() { state.pr.ud = pr; persist(); }

    function paintTop() {
      top.innerHTML = '';
      top.appendChild(h('div', { class: 'grid2' }, [
        panel('Prediction 1', null, [predictCard(P1, pr.a, function (i) { pr.a = i; save(); paintTop(); open(); })]),
        panel('Prediction 2', null, [predictCard(P2, pr.b, function (i) { pr.b = i; save(); paintTop(); open(); })])
      ]));
      if (pr.a != null && pr.b != null) {
        top.appendChild(reveal([
          verdict(P1, pr.a) + 'C2’s axial H points down. Axial positions alternate up, down, up, down all the way ' +
          'round the ring.',
          verdict(P2, pr.b) + 'C1’s equatorial H points out and slightly down: on every carbon, the equatorial ' +
          'position tilts slightly the opposite way to the axial one.'
        ]));
      }
    }

    var opened = false, host, m3, picker;
    function open() {
      if (opened || pr.a == null || pr.b == null) return;
      opened = true;
      host = h('div', { class: 'chair-wrap' });
      m3 = model3D(mol, { views: [['side', 'Side view'], ['top', 'Top view']], pickable: function (a) { return a.head; },
                          onPick: function (id) { click(id); } });
      area.appendChild(h('div', { class: 'grid2' }, [m3.node, panel('Click every H that points up', 'there are six', [
        host, keyRow([['topf', 'up (top face)'], ['botf', 'down (bottom face)']])
      ])]));
      m3.start();
      linkHover(host, m3.viewer());
      picker = Picker({ tray: h('div'), stage: host, label: function () { return ''; }, drop: function () {},
                        empty: function (k) { click(k); } });
      paint();
    }

    function paint() {
      var targets = {}, mark = {}, tint = {};
      CHAIR.POSITIONS.forEach(function (p) {
        var up = CHAIR.faceOf(p) === 't';
        var found = pr.f[p] || (done && up);
        var shown = found ? 'topf' : done ? 'botf' : '';
        targets[p] = { key: p, cls: shown ? shown + ' done' : 'plain', tag: found ? 'up' : done ? 'down' : null,
          aria: 'H on C' + CHAIR.carbonOf(p) + (found ? ', points up' : done ? ', points down' : '') };
        if (shown) { mark[p] = shown; tint[p] = shown; }
      });
      host.innerHTML = '';
      host.appendChild(Draw.chair(mol, 0, { show: 'all', targets: targets, mark: mark,
        label: 'Chair drawing of cyclohexane with all twelve H atoms as targets.' }));
      m3.viewer().setTint(tint);
    }

    function click(pos) {
      if (done || pr.f[pos] || !CHAIR.POSITIONS.some(function (p) { return p === pos; })) return;
      var up = CHAIR.faceOf(pos) === 't', ax = CHAIR.isAxial(pos, 0);
      if (!up) {
        say('That H points down: it is ' + (ax ? 'axial, pointing straight down.' : 'equatorial, pointing out and slightly down.'), 'bad');
        shake(host, pos);
        return;
      }
      pr.f[pos] = 1;
      save();
      var n = Object.keys(pr.f).length;
      if (n === 6) {
        done = true;
        paint();
        complete('All six. Every carbon has one H up and one H down. The three axial H atoms that point up are on ' +
                 'C1, C3 and C5; on C2, C4 and C6 the up H is the equatorial one.');
      } else {
        paint();
        say('Yes: ' + (ax ? 'axial, pointing straight up.' : 'equatorial, pointing out and slightly up.') + ' ' +
            (6 - n) + ' to go.', 'good');
      }
    }

    paintTop();
    open();
    if (done) say('Done. Move on when you are ready.', 'good');
    return { destroy: function () { if (picker) picker.destroy(); } };
  };

  /* ---- flip: follow the red H through a ring flip */

  RENDER.flip = function (s) {
    var mol = molecule(s.mol), cy = molecule('cyclohexane');
    var pr = state.pr.flip || {};
    var P = PREDICT.flip;
    var top = h('div'), area = h('div');
    el.stage.appendChild(top);
    el.stage.appendChild(area);
    function save() { state.pr.flip = pr; persist(); }

    function paintTop() {
      top.innerHTML = '';
      top.appendChild(panel('Your prediction', null, [predictCard(P, pr.p, function (i) {
        pr.p = i; save(); paintTop(); open();
      })]));
    }

    var opened = false;
    function open() {
      if (opened) return;
      opened = true;
      var colour = false;
      var m3 = model3D(mol, { views: [['side', 'Side view'], ['top', 'Top view']] });
      var host = h('div', { class: 'chair-wrap' });
      var read = h('p', { class: 'readout' });
      var tog = h('button', { type: 'button', class: 'mini toggle', 'aria-pressed': 'false',
                              text: 'Colour chair 1’s axial H atoms' });
      var fl = flipper(function (t) { update(t); }, { t: 0 });
      var plotHost = h('div', { class: 'graph-host' });
      var why = h('div');
      area.appendChild(h('div', { class: 'grid2' }, [m3.node, panel('Chair drawing', null, [host, read, fl.node,
        h('div', { class: 'btnrow' }, [tog]), keyRow([['ax', 'axial in chair 1']])])]));
      area.appendChild(panel('Energy during the flip', null, [plotHost,
        h('p', { class: 'muted', text: 'Chair 1 and chair 2 of cyclohexane are the same shape, so they have the same ' +
          'energy. Every shape in between is less stable.' })]));
      area.appendChild(why);
      m3.start();
      var plot = new Draw.FlipPlot(plotHost, { mol: cy });

      function marks() {
        var mk = { '1t': 'red', '1b': 'blue' }, tint = {};
        if (colour) CHAIR.POSITIONS.forEach(function (p) {
          if (CHAIR.isAxial(p, 0) && p !== '1t') { mk[p] = 'ax'; tint[p] = 'ax'; }
        });
        return { mk: mk, tint: tint };
      }
      function update(t) {
        m3.setT(t);
        var mm = marks();
        m3.viewer().setTint(mm.tint);
        host.innerHTML = '';
        host.appendChild(Draw.chair(mol, t, { show: 'all', mark: mm.mk,
          label: 'Chair drawing of cyclohexane, ' + (ends(t) < 0 ? 'part way through a flip' : 'chair ' + (ends(t) + 1)) +
                 '. Red H: ' + CHAIR.describe('1t', t > 0.5 ? 1 : 0) + '. Blue H: ' + CHAIR.describe('1b', t > 0.5 ? 1 : 0) + '.' }));
        var e = ends(t);
        read.textContent = e < 0 ? 'Part way through the flip: the ring is passing through less stable shapes, such as the boat.'
          : 'Chair ' + (e + 1) + '.  Red H: ' + CHAIR.describe('1t', e) + '.  Blue H: ' + CHAIR.describe('1b', e) + '.';
        plot.marker = t;
        plot.render();
        if (e === 1 && !pr.end) { pr.end = 1; save(); paintWhy(); check(); }
      }
      tog.addEventListener('click', function () {
        colour = !colour;
        tog.setAttribute('aria-pressed', colour ? 'true' : 'false');
        update(fl.t());
      });
      function paintWhy() {
        why.innerHTML = '';
        if (!pr.end) return;
        why.appendChild(reveal([
          verdict(P, pr.p) + 'The red H is now equatorial, but it still points up. The blue H went the other way: ' +
          'from equatorial (slightly down) to axial (straight down).',
          'A ring flip turns every axial position into an equatorial one and every equatorial position into an axial ' +
          'one. Nothing changes face: up stays up, and down stays down. Turn on “Colour chair 1’s axial H atoms” and ' +
          'flip again to watch all six change at once.',
          'At room temperature a cyclohexane ring flips roughly 100,000 times every second.'
        ]));
      }
      update(0);
      paintWhy();
    }

    function check() {
      if (!state.done[s.id] && pr.p != null && pr.end) {
        complete('Axial becomes equatorial and equatorial becomes axial. Up stays up; down stays down.');
      }
    }

    paintTop();
    if (pr.p != null) open();
    if (state.done[s.id]) say('Flip it as often as you like, or move on.', 'good');
  };

  /* ---- build: put groups in their places on a chair */

  var TILE_ORDER = ['tBu', 'iPr', 'CH3', 'Cl', 'Br', 'H'];

  /* Judge a build: `got` and `want` map positions to group keys. */
  function judgeBuild(s, mol, got, want) {
    var wrong = s.slots.filter(function (p) { return got[p] !== want[p]; });
    if (!wrong.length) return { ok: true };
    var carbons = [];
    s.slots.forEach(function (p) { var c = CHAIR.carbonOf(p); if (carbons.indexOf(c) < 0) carbons.push(c); });
    function names(c, from) {
      return ['t', 'b'].map(function (f) { return from[c + f]; }).sort().join();
    }
    for (var i = 0; i < carbons.length; i++) {
      var c = carbons[i];
      if (names(c, got) !== names(c, want)) {
        var need = ['t', 'b'].map(function (f) { return GROUPS[want[c + f]].name; }).sort();
        return { kind: 'groups', msg: 'C' + c + ' should carry one ' + need[0] + ' and one ' + need[1] + '. ' +
          (s.source === 'flat' ? 'Check which carbon each group is on in the flat drawing.' : 'Only the groups on C1 move.') };
      }
    }
    for (var j = 0; j < carbons.length; j++) {
      var cc = carbons[j];
      if (got[cc + 't'] === want[cc + 't']) continue;
      var f = want[cc + 't'] !== 'H' ? 't' : 'b';
      var g = GROUPS[want[cc + f]].name;
      var why = s.source === 'flat'
        ? 'It is on a ' + (f === 't' ? 'wedge' : 'dash') + ' in the flat drawing, so it belongs on the ' +
          (f === 't' ? 'top' : 'bottom') + ' face.'
        : 'It pointed ' + (f === 't' ? 'up' : 'down') + ' in chair 1, and a ring flip never changes face.';
      var pos = cc + f;
      return { kind: 'face', pos: pos, msg: 'The ' + g + ' on C' + cc + ' is on the wrong face. ' + why + ' In this ' +
        'chair, C' + cc + '’s ' + (f === 't' ? 'up' : 'down') + ' position is the ' +
        (CHAIR.isAxial(pos, s.k) ? 'axial one, pointing straight ' + (f === 't' ? 'up' : 'down')
                                 : 'equatorial one, pointing out and slightly ' + (f === 't' ? 'up' : 'down')) + '.' };
    }
    return { kind: 'other', msg: 'Not quite. Check each group’s face.' };
  }

  RENDER.build = function (s) {
    var mol = molecule(s.mol);
    var want = {};
    s.slots.forEach(function (p) { want[p] = groupAt(mol, p); });
    var done = !!state.done[s.id];
    var tiles = s.slots.map(function (p) { return want[p]; }).sort(function (a, b) {
      return TILE_ORDER.indexOf(a) - TILE_ORDER.indexOf(b);
    }).map(function (g) { return { g: g, slot: null }; });
    var slots = {};
    var wrong = 0;
    if (done) s.slots.forEach(function (p) {
      for (var t = 0; t < tiles.length; t++) if (tiles[t].g === want[p] && tiles[t].slot == null) { tiles[t].slot = p; slots[p] = t; break; }
    });

    var leftCard;
    if (s.source === 'flat') {
      leftCard = panel('The flat drawing', 'seen from the top face', [
        h('div', { class: 'zz-wrap' }, [Draw.flat(mol, { scale: 1.8 })]),
        h('p', { class: 'legend' }, [
          h('span', { class: 'lg-wedge', 'aria-hidden': 'true' }), ' wedge = top face (up)   ',
          h('span', { class: 'lg-dash', 'aria-hidden': 'true' }), ' dash = bottom face (down)'
        ])
      ]);
    } else {
      leftCard = panel('Chair 1', null, [h('div', { class: 'chair-wrap' }, [Draw.chair(mol, 0, { cls: 'build' })]),
        h('p', { class: 'muted', text: 'The CH₃ on C1 is axial and points up; the H on C1 is equatorial and points ' +
          'slightly down.' })]);
    }
    var tplHost = h('div', { class: 'chair-wrap' });
    var tray = h('div', { class: 'tray', 'aria-label': 'Groups to place' });
    var check = h('button', { type: 'button', class: 'primary', text: 'Check' });
    var reset = h('button', { type: 'button', class: 'ghostbtn', text: 'Clear' });
    var hintBtn = h('button', { type: 'button', class: 'ghostbtn', text: 'Show me in 3D', hidden: true });
    var tip = h('p', { class: 'tip', hidden: true });
    var buildPanel = panel(s.source === 'flat' ? 'Your chair' : 'Chair 2, after the flip', null, [
      tplHost, tray, h('div', { class: 'btnrow' }, [check, reset, hintBtn]), tip
    ], 'p-build');
    var help3D = h('div', { class: 'help3d', hidden: true });
    el.stage.appendChild(h('div', { class: 'grid2' }, [leftCard, buildPanel]));
    el.stage.appendChild(help3D);

    function paint() {
      var targets = {}, text = {};
      s.slots.forEach(function (p) {
        var t = slots[p];
        var g = t == null ? null : tiles[t].g;
        targets[p] = { key: p, g: g, cls: g ? 'filled' : '',
          aria: 'C' + CHAIR.carbonOf(p) + ', ' + CHAIR.describe(p, s.k) + (g ? ', holds ' + GROUPS[g].name + '. Activate to remove it.' : ', empty') };
        text[p] = g ? label(g) : '+';
      });
      tplHost.innerHTML = '';
      tplHost.appendChild(Draw.chair(mol, s.k, { show: s.slots, targets: targets, text: text, cls: 'build',
        label: 'Chair template with empty positions on ' + (s.slots.length > 2 ? 'C1 and C4' : 'C1') + '.' }));
      tray.innerHTML = '';
      var left = 0;
      tiles.forEach(function (t, i) {
        if (t.slot != null) return;
        left++;
        tray.appendChild(h('button', { type: 'button', class: 'tile tone-' + groupTone(t.g), 'data-tile': i,
          'aria-label': 'Group ' + GROUPS[t.g].name }, [label(t.g)]));
      });
      if (!left) tray.appendChild(h('p', { class: 'tray-empty', text: done ? 'Built.' : 'All placed. Press Check.' }));
    }

    var picker = Picker({
      tray: tray, stage: tplHost,
      label: function (k) { return label(tiles[+k].g); },
      prompt: function (k) { return 'Now choose a position for ' + GROUPS[tiles[+k].g].name + '.'; },
      say: function (t) { say(t); },
      drop: function (pos, tk) {
        if (done) return;
        var ti = +tk;
        if (slots[pos] != null) tiles[slots[pos]].slot = null;
        if (tiles[ti].slot != null) delete slots[tiles[ti].slot];
        slots[pos] = ti;
        tiles[ti].slot = pos;
        paint();
        say('');
        var n = tplHost.querySelector('.drop[data-drop="' + pos + '"]');
        if (n) n.focus({ preventScroll: true });
      },
      empty: function (pos) {
        if (done) return;
        if (slots[pos] == null) { say('Choose a group first, then a position.'); return; }
        tiles[slots[pos]].slot = null;
        delete slots[pos];
        paint();
        say('Removed. Pick a group to put there instead.');
      }
    });

    var helper = null;
    function show3D(after) {
      help3D.hidden = false;
      help3D.innerHTML = '';
      var flat = s.source === 'flat';
      helper = model3D(mol, { t: flat ? s.k : 0, view: flat ? 'top' : 'side', views: [['side', 'Side view'], ['top', 'Top view']] });
      var note = h('p', { class: 'help3d-note', text: flat
        ? (after ? 'Here is your molecule in 3D, first seen from the top face like the flat drawing, then swung round to the side like the chair.'
                 : 'This is the molecule in 3D, seen from the top face like the flat drawing. Press “Side view” to see it as a chair.')
        : (after ? 'Watch the ring flip from chair 1 to chair 2. The CH₃ stays on the top face.'
                 : 'This is chair 1 in 3D. Watch it flip to chair 2 and follow the CH₃.') });
      help3D.appendChild(h('div', { class: 'grid2' }, [helper.node, h('div', { class: 'help3d-side' }, [note])]));
      helper.start();
      if (flat) {
        setTimeout(function () { helper.viewer().setView('side'); }, after ? 900 : 1800);
      } else {
        var t0 = null;
        var go = function (ts) {
          if (t0 == null) t0 = ts;
          var u = Math.min(1, (ts - t0) / 1800);
          helper.setT(u);
          if (u < 1) requestAnimationFrame(go);
        };
        if (reduceMotion) helper.setT(1);
        else setTimeout(function () { requestAnimationFrame(go); }, 700);
      }
    }

    check.addEventListener('click', function () {
      if (done) return;
      if (s.slots.some(function (p) { return slots[p] == null; })) { say('Fill every position first.', 'bad'); return; }
      var got = {};
      s.slots.forEach(function (p) { got[p] = tiles[slots[p]].g; });
      var r = judgeBuild(s, mol, got, want);
      if (r.ok) {
        done = true;
        tray.classList.add('locked');
        check.disabled = true; reset.disabled = true; hintBtn.hidden = true; tip.hidden = true;
        paint();
        complete(s.source === 'flat'
          ? 'Correct! In this chair both CH₃ groups are axial: C1’s points up and C4’s points down. That is what ' +
            'trans means: opposite faces.'
          : 'Correct! The CH₃ is now equatorial, and it still points up. The H on C1 is now axial, pointing down.');
        show3D(true);
        return;
      }
      wrong++;
      say(r.msg, 'bad');
      tip.hidden = false;
      tip.textContent = s.source === 'flat'
        ? 'Tip: first decide each group’s face from the drawing (wedge = up, dash = down). Then, on that carbon, find ' +
          'the position that points that way: on C1 of this chair the axial position points up, and on C4 the axial ' +
          'position points down.'
        : 'Tip: in chair 1 the CH₃ is axial and points up. A ring flip turns axial into equatorial, and up stays up.';
      if (wrong >= 2) hintBtn.hidden = false;
    });
    reset.addEventListener('click', function () {
      if (done) return;
      tiles.forEach(function (t) { t.slot = null; });
      slots = {};
      paint();
      say('');
    });
    hintBtn.addEventListener('click', function () { show3D(false); });

    paint();
    if (done) {
      tray.classList.add('locked');
      check.disabled = true; reset.disabled = true;
      say('Built. Move on when you are ready.', 'good');
    }
    return { destroy: function () { picker.destroy(); } };
  };

  /* ---- crowd: find the H atoms an axial CH₃ crowds */

  RENDER.crowd = function (s) {
    var mol = molecule(s.mol);
    var pr = state.pr.crowd || {};
    pr.f = pr.f || {};
    var done = !!state.done[s.id];
    var WANT = CHAIR.synAxial('1t');
    var host = h('div', { class: 'chair-wrap' });
    var status = h('p', { class: 'status' });
    var why = h('div');
    var m3 = model3D(mol, {
      views: [['end', 'End view'], ['side', 'Side view'], ['above', 'From above']], view: 'end',
      pickable: function (a) { return a.head && a.pos !== '1t'; },
      onPick: function (id) { click(id); }
    });
    el.stage.appendChild(h('div', { class: 'grid2' }, [m3.node, panel('Chair drawing', 'click the two H atoms', [host, status,
      keyRow([['crowd', 'crowded by the CH₃']])])]));
    el.stage.appendChild(why);
    m3.start();
    linkHover(host, m3.viewer());
    var picker = Picker({ tray: h('div'), stage: host, label: function () { return ''; }, drop: function () {},
                          empty: function (k) { click(k); } });

    function paint() {
      var targets = {}, mark = {};
      CHAIR.POSITIONS.forEach(function (p) {
        if (p === '1t') return;
        var hit = pr.f[p];
        targets[p] = { key: p, cls: hit ? 'crowd done' : 'plain', aria: 'H on C' + CHAIR.carbonOf(p) + (hit ? ', crowded' : '') };
        if (hit) mark[p] = 'crowd';
      });
      if (done) mark['1t'] = 'crowd';
      host.innerHTML = '';
      host.appendChild(Draw.chair(mol, 0, { show: 'all', targets: targets, mark: mark,
        label: 'Chair drawing of methylcyclohexane with the CH₃ axial on C1. The eleven H atoms are targets.' }));
      var glow = Object.keys(pr.f);
      if (done) glow = glow.concat(groupAtoms(mol, '1t'));
      m3.viewer().setGlow(glow);
      var n = Object.keys(pr.f).length;
      status.textContent = done ? 'Found both.' : 'Found ' + n + ' of 2.';
      why.innerHTML = '';
      if (done) {
        why.appendChild(reveal([
          'The CH₃ on C1 and the axial H atoms on C3 and C5 all point straight up, side by side, on the same face ' +
          'of the ring. Their electron clouds overlap: steric strain.',
          'C1 and C3 are two carbons apart, and so are C1 and C5, and all three groups are axial. That is why these ' +
          'are called 1,3-diaxial interactions. An axial group always has two of them.',
          'Turn on space-filling to see the electron clouds of the CH₃ and the two axial H atoms run into each other.'
        ]));
      }
    }

    function click(pos) {
      if (done || pos === '1t' || pr.f[pos] || CHAIR.POSITIONS.indexOf(pos) < 0) return;
      if (WANT.indexOf(pos) >= 0) {
        pr.f[pos] = 1;
        state.pr.crowd = pr;
        persist();
        if (Object.keys(pr.f).length === 2) {
          done = true;
          paint();
          complete('Found both: the axial H atoms on C3 and C5. These are the 1,3-diaxial interactions.');
        } else {
          paint();
          say('Yes: the axial H on C' + CHAIR.carbonOf(pos) + ' points up, right beside the CH₃. One more.', 'good');
        }
        return;
      }
      var ax = CHAIR.isAxial(pos, 0), up = CHAIR.faceOf(pos) === 't';
      var msg = pos === '1b'
        ? 'That H is on C1 itself, next to the CH₃. It is equatorial and points out, away from the ring.'
        : !ax ? 'That H is equatorial. It points out, away from the ring, nowhere near the CH₃.'
        : !up ? 'That H is axial, but it points down, to the bottom face of the ring. The CH₃ points up.'
        : 'Look again.';
      say(msg, 'bad');
      shake(host, pos);
    }

    paint();
    if (done) say('Found both. Move on when you are ready.', 'good');
    return { destroy: function () { picker.destroy(); } };
  };

  /* ---- compare: flip methylcyclohexane and compare the chairs */

  RENDER.compare = function (s) {
    var mol = molecule(s.mol);
    var pr = state.pr.cmp || {};
    var P = PREDICT.lower;
    var N = PREDICT.count;
    var top = h('div'), area = h('div');
    el.stage.appendChild(top);
    el.stage.appendChild(area);
    function save() { state.pr.cmp = pr; persist(); }

    function paintTop() {
      top.innerHTML = '';
      top.appendChild(panel('Your prediction', null, [predictCard(P, pr.p, function (i) {
        pr.p = i; save(); paintTop(); open();
      })]));
    }

    var opened = false;
    function open() {
      if (opened) return;
      opened = true;
      var m3 = model3D(mol, { views: [['end', 'End view'], ['side', 'Side view']], view: 'end' });
      var host = h('div', { class: 'chair-wrap' });
      var read = h('p', { class: 'readout' });
      var fl = flipper(function (t) { update(t); }, { t: 0 });
      var plotHost = h('div', { class: 'graph-host' });
      var parts = h('div');
      var after = h('div');
      area.appendChild(h('div', { class: 'grid2' }, [m3.node, panel('Chair drawing', null, [host, read, fl.node])]));
      area.appendChild(panel('Energy of the two chairs', null, [plotHost, parts]));
      area.appendChild(after);
      m3.start();
      var plot = new Draw.FlipPlot(plotHost, { mol: mol, captions: ['CH₃ axial', 'CH₃ equatorial'] });
      parts.appendChild(h('p', { class: 'parts', text: 'Chair 1 (CH₃ axial): ' + AVAL.breakdown(mol, 0) }));
      parts.appendChild(h('p', { class: 'parts', text: 'Chair 2 (CH₃ equatorial): ' + AVAL.breakdown(mol, 1) }));

      function update(t) {
        m3.setT(t);
        var e = ends(t);
        m3.viewer().setGlow(e === 0 ? crowdGlow(mol, 0) : []);
        host.innerHTML = '';
        host.appendChild(Draw.chair(mol, t, { show: e === 0 ? ['1t', '1b', '3t', '5t'] : ['1t', '1b'],
          mark: e === 0 ? { '1t': 'crowd', '3t': 'crowd', '5t': 'crowd' } : {} }));
        read.textContent = e < 0 ? 'Flipping…' : e === 0
          ? 'Chair 1: the CH₃ is axial. It crowds the axial H atoms on C3 and C5 (glowing red).'
          : 'Chair 2: the CH₃ is equatorial, pointing out and slightly up, away from the ring.';
        plot.marker = t;
        plot.render();
        if (e === 1 && !pr.end) { pr.end = 1; save(); paintAfter(); }
      }

      function paintAfter() {
        after.innerHTML = '';
        if (!pr.end) return;
        after.appendChild(panel('Look at chair 2', null, [predictCard(N, pr.n, function (i) {
          pr.n = i; save(); paintAfter(); check();
        })]));
        if (pr.n == null) return;
        after.appendChild(reveal([
          verdict(P, pr.p) + (pr.n === 0 ? 'And right: none. ' : 'It crowds none. ') + 'An equatorial group points ' +
          'out, away from the ring, so it has no 1,3-diaxial interactions. Chair 2 is lower in energy.',
          'The gap between the chairs, 7.6 kJ/mol, is the A-value of CH₃: the cost of its two 1,3-diaxial ' +
          'interactions in the axial chair.'
        ]));
        after.appendChild(panel('How many molecules are in each chair?', null, [shareBox(mol, ['CH₃ axial', 'CH₃ equatorial'])]));
      }
      update(0);
      paintAfter();
    }

    function check() {
      if (!state.done[s.id] && pr.p != null && pr.end && pr.n != null) {
        complete('Equatorial CH₃: no 1,3-diaxial interactions, so about 19 in 20 molecules are in that chair.');
      }
    }

    paintTop();
    if (pr.p != null) open();
    if (state.done[s.id]) say('Done. Move on when you are ready.', 'good');
  };

  /* ---- newman: the same crowding seen down a ring bond */

  function newmanFig(mol, k, i, j, other, cap) {
    var nm = CHAIR.newman(mol, k, i, j);
    var all = nm.front.concat(nm.back);
    var g = all.filter(function (q) { return q.pos === '1t'; })[0];
    var r = all.filter(function (q) { return q.ring === other; })[0];
    var gap = CHAIR.gap(g.a, r.a);
    var word = gap === 60 ? 'gauche' : gap === 180 ? 'anti' : gap === 0 ? 'eclipsed' : gap + '°';
    return h('figure', null, [
      Draw.newman(nm, { cls: 'fig', hot: ['1t', 'R' + other], arc: { a: g.a, b: r.a, text: word } }),
      h('figcaption', { text: cap + ': CH₃ and C' + other + ' are ' + word + '.' })
    ]);
  }

  RENDER.newman = function (s) {
    var mol = molecule(s.mol);
    var pr = state.pr.nm || {};
    var P1 = PREDICT.gauche;
    var P2 = PREDICT.c1c6;
    var top = h('div'), area = h('div');
    el.stage.appendChild(top);
    el.stage.appendChild(area);
    function save() { state.pr.nm = pr; persist(); }

    function paint() {
      top.innerHTML = '';
      area.innerHTML = '';
      top.appendChild(panel('Prediction 1', null, [predictCard(P1, pr.a, function (i) { pr.a = i; save(); paint(); })]));
      if (pr.a == null) return;
      var m3 = model3D(mol, { views: [['bond', 'Down the C1–C2 bond', [1, 2]], ['side', 'Side view']], view: 'bond',
                              viewArgs: [1, 2], short: true, title: '3D model: chair 1' });
      var chips = h('div', { class: 'chips' });
      var k3 = 0;
      ['Chair 1: CH₃ axial', 'Chair 2: CH₃ equatorial'].forEach(function (t, k) {
        var b = h('button', { type: 'button', class: 'chip' + (k === 0 ? ' current' : ''), text: t });
        b.addEventListener('click', function () {
          k3 = k;
          var nodes = chips.querySelectorAll('.chip');
          for (var n = 0; n < nodes.length; n++) nodes[n].classList.toggle('current', n === k);
          m3.setT(k);
          m3.viewer().setView('bond', [1, 2]);
        });
        chips.appendChild(b);
      });
      area.appendChild(h('div', { class: 'grid2' }, [
        panel('Down the C1–C2 bond', null, [h('div', { class: 'chair-pair' }, [
          newmanFig(mol, 0, 1, 2, 3, 'Chair 1, CH₃ axial'),
          newmanFig(mol, 1, 1, 2, 3, 'Chair 2, CH₃ equatorial')
        ])]),
        h('div', null, [m3.node, chips])
      ]));
      m3.start();
      area.appendChild(reveal([verdict(P1, pr.a) + 'Axial, the CH₃ is gauche to C3, just like the two CH₃ groups in ' +
        'gauche butane. Equatorial, it is anti to C3, like anti butane.']));
      area.appendChild(panel('Prediction 2', null, [predictCard(P2, pr.b, function (i) { pr.b = i; save(); paint(); check(); })]));
      if (pr.b == null) return;
      area.appendChild(h('div', { class: 'grid2' }, [
        panel('Down the C1–C6 bond, chair 1', null, [h('div', { class: 'nm-wrap' }, [newmanFig(mol, 0, 1, 6, 5, 'Chair 1, CH₃ axial')])]),
        reveal([
          verdict(P2, pr.b) + 'The axial CH₃ is gauche to C5 as well. So an axial CH₃ has two gauche interactions with ' +
          'the ring, one with C3 and one with C5.',
          'These are the same two crowding contacts you found as 1,3-diaxial interactions, seen from a different ' +
          'direction. Each costs about the same as gauche butane, 3.8 kJ/mol, so axial CH₃ costs 2 × 3.8 = 7.6 kJ/mol: ' +
          'its A-value.',
          'Equatorial, the CH₃ is anti to both C3 and C5. Nothing crowds it.'
        ])
      ]));
    }

    function check() {
      if (!state.done[s.id] && pr.a != null && pr.b != null) {
        complete('An axial CH₃ is gauche to two ring carbons: the same steric strain as two gauche-butane interactions.');
      }
    }

    paint();
    if (state.done[s.id]) say('Done. Move on when you are ready.', 'good');
  };

  /* ---- swap: other groups on C1 */

  var SWAP_NOTES = {
    Cl: 'Cl is a big atom, but the C–Cl bond is long (1.78 Å) and holds it away from the axial H atoms. It prefers ' +
        'equatorial much less strongly than CH₃: only about 7 in 10 molecules have it equatorial.',
    Br: 'Br is bigger still, but its bond is longer still (1.94 Å). It crowds the axial H atoms no more than Cl does: ' +
        'the same long-bond effect you met in Newman projections.',
    iPr: 'CH(CH₃)₂ is only a little worse than CH₃. When it is axial it turns so that its small H points in over the ' +
         'ring, keeping its two CH₃ groups away from the axial H atoms. Look at the 3D model.',
    tBu: 'C(CH₃)₃ cannot do that: however it turns, one of its three CH₃ groups points straight at the axial H atoms. ' +
         'All but about 1 in 10,000 molecules keep it equatorial, so it locks the ring in one chair.'
  };

  function swapAnswer(x) {
    var a = AVAL.aValue(x), m = AVAL.aValue('CH3');
    return a < m ? 0 : a - m < 5 ? 1 : 2;
  }

  RENDER.swap = function (s) {
    var order = MOLECULES.SWAP_ORDER;
    var got = state.pr.swap || {};
    var done = !!state.done[s.id];
    var cur = 0;
    while (cur < order.length - 1 && got[order[cur]] != null) cur++;
    var chips = h('div', { class: 'chips' });
    var card = h('div');
    var m3 = model3D(molecule('chloro'), { views: [['end', 'End view'], ['side', 'Side view']], view: 'end',
                                           title: '3D model' });
    var axBtn = h('button', { type: 'button', class: 'mini toggle', 'aria-pressed': 'true', text: 'Group axial' });
    var eqBtn = h('button', { type: 'button', class: 'mini toggle', 'aria-pressed': 'false', text: 'Group equatorial' });
    var plotHost = h('div', { class: 'graph-host' });
    var below = h('div');
    var table = h('table', { class: 'ref-table swap-table' });
    el.stage.appendChild(h('div', { class: 'grid2' }, [
      panel('Group on C1', null, [chips, card]),
      h('div', null, [m3.node, h('div', { class: 'btnrow' }, [axBtn, eqBtn])])
    ]));
    el.stage.appendChild(below);
    el.stage.appendChild(panel('What you found', null, [table]));
    m3.start();
    var showK = 0, plot = null;

    function opts(x) {
      var n = label(x);
      return ['Less strongly than CH₃', 'A little more strongly than CH₃', 'Far more strongly than CH₃']
        .map(function (t) { return n + ' prefers equatorial ' + t.charAt(0).toLowerCase() + t.slice(1); });
    }

    function setK(k) {
      showK = k;
      var x = order[cur], mol = molecule(MOLECULES.BY_GROUP[x]);
      axBtn.setAttribute('aria-pressed', k ? 'false' : 'true');
      eqBtn.setAttribute('aria-pressed', k ? 'true' : 'false');
      m3.setMolecule(mol, k);
      m3.viewer().setGlow(k === 0 && got[x] != null ? crowdGlow(mol, 0) : []);
    }
    axBtn.addEventListener('click', function () { setK(0); });
    eqBtn.addEventListener('click', function () { setK(1); });

    function paint() {
      var x = order[cur], mol = molecule(MOLECULES.BY_GROUP[x]);
      chips.innerHTML = '';
      order.forEach(function (k, i) {
        var b = h('button', { type: 'button', class: 'chip' + (i === cur ? ' current' : '') + (got[k] != null ? ' done' : ''),
          disabled: got[k] == null && i !== cur, text: label(k) });
        b.addEventListener('click', function () { cur = i; paint(); });
        chips.appendChild(b);
      });
      card.innerHTML = '';
      card.appendChild(h('p', { class: 'swap-name', text: mol.name }));
      card.appendChild(flatRow([mol.id]));
      var answered = got[x] != null;
      card.appendChild(predictCard({ q: 'Compared with CH₃, how strongly does ' + label(x) + ' prefer the equatorial position?',
        choices: opts(x) }, got[x], function (i) {
        got[x] = i;
        state.pr.swap = got;
        persist();
        paint();
      }));
      if (answered) {
        card.appendChild(reveal([(got[x] === swapAnswer(x) ? 'Right. ' : 'Not quite: ' + opts(x)[swapAnswer(x)].toLowerCase() + '. ') +
          SWAP_NOTES[x]]));
        if (cur < order.length - 1) {
          var nb = h('button', { type: 'button', class: 'primary', text: 'Next group →' });
          nb.addEventListener('click', function () { cur++; paint(); });
          card.appendChild(h('div', { class: 'btnrow' }, [nb]));
        }
      }
      setK(0);
      below.innerHTML = '';
      if (answered) {
        var ph = h('div', { class: 'graph-host' });
        below.appendChild(panel('Energy of the two chairs: ' + mol.name, null, [ph,
          h('p', { class: 'parts', text: 'Chair 1 (' + label(x) + ' axial): ' + AVAL.breakdown(mol, 0) }),
          shareBox(mol, [label(x) + ' axial', label(x) + ' equatorial'])]));
        plot = new Draw.FlipPlot(ph, { mol: mol, captions: [label(x) + ' axial', label(x) + ' equatorial'] });
        plot.render();
      } else {
        below.appendChild(h('p', { class: 'muted', text: 'Make your prediction to see the energies.' }));
      }
      paintTable();
      var all = order.every(function (k) { return got[k] != null; });
      if (all && !done) {
        done = true;
        complete('From weakest to strongest preference for equatorial: Cl and Br, then CH₃, then CH(CH₃)₂, then ' +
                 'C(CH₃)₃. The bigger the A-value, the more the group crowds the axial H atoms.');
      }
    }

    function paintTable() {
      table.innerHTML = '';
      table.appendChild(h('tr', null, ['Group on C1', 'A-value (kJ/mol)', 'Molecules with the group equatorial']
        .map(function (t) { return h('th', { text: t }); })));
      ['CH3'].concat(order).forEach(function (x) {
        if (x !== 'CH3' && got[x] == null) return;
        var mol = molecule(MOLECULES.BY_GROUP[x]);
        table.appendChild(h('tr', null, [
          h('td', { text: label(x) }),
          h('td', { class: 'num', text: fmt(AVAL.aValue(x)) }),
          h('td', { text: AVAL.shareText(AVAL.share(mol, 1)) })
        ]));
      });
    }

    paint();
    if (done) say('All groups compared.', 'good');
  };

  /* ---- pair: trans- and cis-1,4-dimethylcyclohexane */

  RENDER.pair = function (s) {
    var IDS = ['trans14', 'cis14'];
    var pr = state.pr.pair || {};
    var done = !!state.done[s.id];
    var CH = ['Go down', 'Go up', 'Stay the same'];
    function answer(id) { var b = AVAL.better(molecule(id)); return b === 1 ? 0 : b === 0 ? 1 : 2; }
    var Q = PREDICT.cistrans;
    function save() { state.pr.pair = pr; persist(); }

    var cols = {}, fls = {}, hosts = {}, reads = {};
    var plotHost = h('div', { class: 'graph-host' });
    var plotPanel = panel('Energy during the flip', null, [plotHost, h('p', { class: 'legend-row' }, [
      h('span', { class: 'key main', 'aria-hidden': 'true' }), ' trans   ',
      h('span', { class: 'key alt', 'aria-hidden': 'true' }), ' cis'
    ])]);
    var after = h('div');
    el.stage.appendChild(h('div', { class: 'grid2' }, IDS.map(function (id) {
      var m = molecule(id);
      hosts[id] = h('div', { class: 'chair-wrap' });
      reads[id] = h('p', { class: 'parts' });
      cols[id] = h('div');
      return panel(m.name, m.rel === 'cis' ? 'cis: same face' : 'trans: opposite faces', [
        flatRow([id]), hosts[id], reads[id], cols[id]
      ]);
    })));
    el.stage.appendChild(plotPanel);
    el.stage.appendChild(after);
    var plot = new Draw.FlipPlot(plotHost, { mols: IDS.map(molecule) });

    function t(id) { return fls[id] ? fls[id].t() : pr['e' + id] ? 1 : 0; }

    function paintCol(id) {
      var m = molecule(id);
      cols[id].innerHTML = '';
      if (pr[id] == null) {
        cols[id].appendChild(predictCard({ q: 'This is chair 1. When it flips to chair 2, its energy will…', choices: CH,
          compact: true }, pr[id], function (i) { pr[id] = i; save(); paintCol(id); paintAfter(); }));
        return;
      }
      cols[id].appendChild(h('p', { class: 'muted', text: 'You predicted: ' + CH[pr[id]].toLowerCase() + '.' }));
      fls[id] = flipper(function (v) { update(id, v); }, { t: t(id), aria: 'Ring flip of ' + m.name });
      cols[id].appendChild(fls[id].node);
    }

    function update(id, v) {
      var m = molecule(id), e = ends(v);
      hosts[id].innerHTML = '';
      hosts[id].appendChild(Draw.chair(m, v, { cls: 'small', mark: e < 0 ? {} : markAxial(m, e) }));
      reads[id].textContent = e < 0 ? 'Flipping…' : 'Chair ' + (e + 1) + ': ' + axialText(m, e) + '  ' + AVAL.breakdown(m, e);
      plot.markers = IDS.map(function (k, i) { return { t: t(k), mol: molecule(k), label: i ? 'cis' : 'trans' }; });
      plot.render();
      if (e === 1 && !pr['e' + id]) { pr['e' + id] = 1; save(); paintAfter(); }
    }

    function paintAfter() {
      after.innerHTML = '';
      if (pr.trans14 == null || pr.cis14 == null) {
        after.appendChild(h('p', { class: 'muted', text: 'Make both predictions, then flip both molecules all the way to chair 2.' }));
        return;
      }
      if (!pr.etrans14 || !pr.ecis14) {
        after.appendChild(h('p', { class: 'muted', text: 'Flip both molecules all the way to chair 2.' }));
        return;
      }
      var tr = molecule('trans14');
      after.appendChild(reveal([
        'trans: ' + (pr.trans14 === answer('trans14') ? 'as you predicted, ' : 'you predicted “' + CH[pr.trans14].toLowerCase() + '”, but ') +
        'the energy goes down. Chair 1 has both CH₃ groups axial (four 1,3-diaxial interactions); chair 2 has both ' +
        'equatorial (none). At any moment ' + AVAL.shareText(AVAL.share(tr, 1)) + ' molecules are in chair 2.',
        'cis: ' + (pr.cis14 === answer('cis14') ? 'as you predicted, ' : 'you predicted “' + CH[pr.cis14].toLowerCase() + '”, but ') +
        'the energy stays the same. One CH₃ is axial in either chair, so the two chairs are equally stable and half ' +
        'the molecules are in each.'
      ]));
      after.appendChild(panel('One more question', null, [predictCard(Q, pr.q, function (i) {
        pr.q = i; save(); paintAfter(); check();
      })]));
      if (pr.q != null) {
        after.appendChild(reveal([verdict(Q, pr.q) + 'No. A ring flip only swaps axial and equatorial; every group ' +
          'stays on its face. To turn cis into trans you would have to move a group from one face to the other, ' +
          'which means breaking a bond. Cis and trans isomers are different compounds.']));
      }
    }

    function check() {
      if (!state.done[s.id] && pr.etrans14 && pr.ecis14 && pr.q != null) {
        done = true;
        complete('trans-1,4: both equatorial in one chair, so that chair wins. cis-1,4: one axial either way, so the chairs tie.');
      }
    }

    IDS.forEach(function (id) { paintCol(id); update(id, t(id)); });
    paintAfter();
    if (done) say('Done. Move on when you are ready.', 'good');
    return { destroy: function () { IDS.forEach(function (id) { if (fls[id]) fls[id].stop(); }); } };
  };

  function markAxial(m, k) {
    var mk = {};
    MOLECULES.groups(m).forEach(function (g) { mk[g.pos] = CHAIR.isAxial(g.pos, k) ? 'ax' : 'eq'; });
    return mk;
  }

  function axialText(m, k) {
    return MOLECULES.groups(m).map(function (g) {
      return (GROUPS[g.g].tint ? GROUPS[g.g].name : label(g.g)) + ' on C' + g.c + ' ' + (CHAIR.isAxial(g.pos, k) ? 'axial' : 'equatorial');
    }).join(', ') + '.';
  }

  /* ---- best: lock in the more stable chair */

  var BEST = [
    { id: 'cisTM',
      q: 'In the more stable chair of cis-1-tert-butyl-4-methylcyclohexane…',
      choices: ['The C(CH₃)₃ is equatorial and the CH₃ is axial', 'The CH₃ is equatorial and the C(CH₃)₃ is axial',
                'Both groups are equatorial'],
      note: 'The two groups are cis, so one of them must be axial. The C(CH₃)₃ group is far too big to go axial ' +
            '(A-value 22.8 kJ/mol, against 7.6 for CH₃), so it takes the equatorial position and the CH₃ goes axial. ' +
            'When only one group can be equatorial, the bigger group gets it.' },
    { id: 'cis13',
      q: 'In the more stable chair of cis-1,3-dimethylcyclohexane, the two CH₃ groups are…',
      choices: ['Both equatorial', 'Both axial', 'One axial and one equatorial'],
      note: 'Both equatorial. In the other chair both CH₃ groups are axial on the same face, two carbons apart, so ' +
            'they crowd each other directly: a CH₃/CH₃ 1,3-diaxial interaction, much worse than one with an H. Flip ' +
            'back to chair 1 in space-filling to see them collide.' }
  ];

  /* Which choice in BEST is right, from the model. */
  function bestAnswer(b) {
    var m = molecule(b.id), k = AVAL.better(m);
    var gs = MOLECULES.groups(m);
    var eq = gs.filter(function (g) { return !CHAIR.isAxial(g.pos, k); });
    if (b.id === 'cisTM') {
      var tbuEq = eq.some(function (g) { return g.g === 'tBu'; }), meEq = eq.some(function (g) { return g.g === 'CH3'; });
      return tbuEq && meEq ? 2 : tbuEq ? 0 : 1;
    }
    return eq.length === 2 ? 0 : eq.length === 0 ? 1 : 2;
  }

  RENDER.best = function (s) {
    var pr = state.pr.best || {};
    var done = !!state.done[s.id];
    var cur = 0;
    while (cur < BEST.length - 1 && pr[BEST[cur].id] && pr[BEST[cur].id].l) cur++;
    var chips = h('div', { class: 'chips' });
    var card = h('div');
    var area = h('div');
    el.stage.appendChild(panel('Molecule', null, [chips, card]));
    el.stage.appendChild(area);
    var fl = null;
    function save() { state.pr.best = pr; persist(); }
    function locked(i) { return !!(pr[BEST[i].id] && pr[BEST[i].id].l); }

    function paintChips() {
      chips.innerHTML = '';
      BEST.forEach(function (x, i) {
        var open = locked(i) || i === cur || (i > 0 && locked(i - 1));
        var bt = h('button', { type: 'button', class: 'chip' + (i === cur ? ' current' : '') + (locked(i) ? ' done' : ''),
          disabled: !open, text: molecule(x.id).name });
        bt.addEventListener('click', function () { cur = i; paint(); });
        chips.appendChild(bt);
      });
    }

    function paint() {
      var b = BEST[cur], m = molecule(b.id);
      var me = pr[b.id] = pr[b.id] || {};
      if (fl) fl.stop();
      paintChips();
      card.innerHTML = '';
      area.innerHTML = '';
      card.appendChild(h('div', { class: 'grid2' }, [flatRow([b.id]),
        predictCard({ q: b.q, choices: b.choices }, me.p, function (i) { me.p = i; save(); paint(); })]));
      if (me.p == null) return;
      var host = h('div', { class: 'chair-wrap' });
      var read = h('p', { class: 'parts' });
      var lock = h('button', { type: 'button', class: 'primary', text: 'Lock in this chair', hidden: !!me.l });
      var why = h('div');
      var m3 = model3D(m, { views: [['end', 'End view'], ['side', 'Side view']], view: 'end', short: true });
      fl = flipper(function (t) { update(t); }, { t: me.l ? AVAL.better(m) : 0, aria: 'Ring flip of ' + m.name });
      area.appendChild(h('div', { class: 'grid2' }, [m3.node,
        panel('Chair drawing', null, [host, read, fl.node, h('div', { class: 'btnrow' }, [lock])])]));
      area.appendChild(why);
      m3.start();

      function update(t) {
        var e = ends(t);
        m3.setT(t);
        m3.viewer().setGlow(e < 0 ? [] : crowdGlow(m, e));
        host.innerHTML = '';
        host.appendChild(Draw.chair(m, t, { cls: 'small', mark: e < 0 ? {} : markAxial(m, e) }));
        read.textContent = e < 0 ? 'Flipping…' : 'Chair ' + (e + 1) + ': ' + axialText(m, e) + '  ' + AVAL.breakdown(m, e);
      }
      function paintWhy() {
        why.innerHTML = '';
        if (!me.l) return;
        why.appendChild(reveal([verdict({ choices: b.choices, answer: bestAnswer(b) }, me.p) + b.note]));
        if (cur < BEST.length - 1) {
          var nb = h('button', { type: 'button', class: 'primary', text: 'Next molecule →' });
          nb.addEventListener('click', function () { cur++; paint(); });
          why.appendChild(h('div', { class: 'btnrow' }, [nb]));
        }
      }
      lock.addEventListener('click', function () {
        var e = ends(fl.t());
        if (e < 0) { say('Flip all the way to one of the chairs first.', 'bad'); return; }
        if (e !== AVAL.better(m)) {
          say('Not this one. ' + AVAL.breakdown(m, e) + '. Is the other chair lower?', 'bad');
          return;
        }
        me.l = 1;
        save();
        lock.hidden = true;
        paintChips();
        paintWhy();
        if (!done && BEST.every(function (x, i) { return locked(i); })) {
          done = true;
          complete('Locked in both. Put as many groups as you can equatorial; if only one fits, the bigger one gets it.');
        } else {
          say('Locked in. ' + AVAL.breakdown(m, e) + '.', 'good');
        }
      });
      update(fl.t());
      paintWhy();
    }

    paint();
    if (done) say('Both locked in.', 'good');
    return { destroy: function () { if (fl) fl.stop(); } };
  };

  /* ---- quiz */

  function question(id) {
    for (var k in QZ) {
      var pool = QZ[k].pool;
      for (var i = 0; i < pool.length; i++) if (pool[i].id === id) return pool[i];
    }
    return null;
  }

  /* A question's figure: a chair, a flat ring, a Newman projection or the boat. */
  function figure(spec, cls) {
    if (spec.chair) {
      return Draw.chair(molecule(spec.chair), spec.k || 0, { show: spec.show, letters: spec.letters, mark: spec.mark,
        cls: cls || 'fig' });
    }
    if (spec.flat) return Draw.flat(molecule(spec.flat), { cls: cls, scale: 1.6 });
    if (spec.newman) {
      return Draw.newman(CHAIR.newman(molecule(spec.newman), spec.k || 0, spec.bond[0], spec.bond[1]),
        { cls: cls || 'fig', offset: spec.offset, hot: spec.hot });
    }
    if (spec.boat) return Draw.chair(molecule('cyclohexane'), 0.5, { show: 'all', cls: cls || 'fig' });
    return h('span');
  }

  function figureText(spec) {
    var n = figure(spec);
    return n.getAttribute ? n.getAttribute('aria-label') || '' : '';
  }

  function aTable() {
    var wrap = h('div');
    var t = h('table', { class: 'ref-table' });
    t.appendChild(h('tr', null, ['Group', 'A-value (kJ/mol)', 'Each 1,3-diaxial interaction'].map(function (x) {
      return h('th', { text: x });
    })));
    AVAL.ROWS.forEach(function (r) {
      t.appendChild(h('tr', null, [
        h('td', { text: AVAL.NAMES[r[0]] }),
        h('td', { class: 'num', text: fmt(r[1]) }),
        h('td', { class: 'num', text: AVAL.NAMES[r[0]] + '/H ' + fmt(r[1] / 2) })
      ]));
    });
    AVAL.PAIRS.forEach(function (p) {
      t.appendChild(h('tr', null, [
        h('td', { text: 'Two axial ' + AVAL.NAMES[p[0]] + ' on one face' }),
        h('td', { class: 'num', text: '' }),
        h('td', { class: 'num', text: AVAL.NAMES[p[0]] + '/' + AVAL.NAMES[p[1]] + ' ' + fmt(p[2]) + ' *' })
      ]));
    });
    wrap.appendChild(t);
    wrap.appendChild(h('p', { class: 'ref-foot', text: 'The A-value is how much higher in energy the chair with the ' +
      'group axial is than the chair with it equatorial. An axial group has two 1,3-diaxial interactions, so each ' +
      'costs half the A-value. A bigger A-value means a stronger preference for equatorial. * Not in the textbook: a ' +
      'measured value.' }));
    return wrap;
  }

  RENDER.quiz = function (s) {
    var Q = QZ[s.quiz];
    var ids = state.draws[s.quiz];
    var box = h('div', { class: 'quiz' });
    var side = s.quiz === 'C' || s.quiz === 'D'
      ? h('details', { class: 'reference quiz-table', open: true }, [h('summary', { text: 'A-values' }), aTable()])
      : null;
    el.stage.appendChild(h('div', { class: 'quiz-grid' + (side ? '' : ' single') }, [panel(Q.title, null, [box]), side]));

    function summary() {
      box.innerHTML = '';
      var right = ids.filter(function (id) { return state.ans[id]; }).length;
      box.appendChild(h('p', { class: 'q-summary', text: 'You answered ' + right + ' of ' + ids.length +
        ' correctly on the first try.' }));
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
      say('');
      box.appendChild(h('p', { class: 'q-count', text: 'Question ' + (n + 1) + ' of ' + ids.length }));
      box.appendChild(h('p', { class: 'q-text', text: q.q }));
      if (q.struct) box.appendChild(flatRow(q.struct));
      if (q.fig) box.appendChild(h('div', { class: 'q-fig' }, [figure(q.fig)]));
      var figs = typeof q.choices[0] !== 'string';
      var row = h('div', { class: 'q-choices' + (figs ? ' figs' : '') });
      var why = h('p', { class: 'q-why', hidden: true });
      var next = h('button', { type: 'button', class: 'primary', hidden: true,
        text: n + 1 < ids.length ? 'Next question →' : 'Finish checkpoint' });
      order.forEach(function (ci, pos) {
        var c = q.choices[ci];
        var letter = String.fromCharCode(65 + pos);
        var b = h('button', { type: 'button', class: 'choice', 'data-choice': ci }, [
          h('span', { class: 'choice-letter', text: letter }),
          typeof c === 'string' ? h('span', { class: 'choice-text', text: c }) : figure(c, 'choice-fig')
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
      state.att > 1 ? h('p', { class: 'best-line', text: 'Best attempt: ' + best + '%' +
        (best > pct ? '. That is the score the gradebook keeps.' : '') }) : null,
      h('p', { class: 'muted', text: SCORM.isConnected()
        ? 'Your ' + (state.att > 1 ? 'best ' : '') + 'score has been sent to the gradebook and the activity is marked complete.'
        : 'Standalone mode: nothing was sent to a gradebook.' })
    ]);
    var ideas = panel('Big ideas', null, [h('ul', { class: 'keylist' }, [
      'The chair is the most stable shape of cyclohexane: its bond angles are close to 109.5° and every C–C bond is staggered.',
      'Each carbon has one axial position (straight up or down) and one equatorial position (out around the ring); one points up and one points down.',
      'A ring flip turns every axial position into an equatorial one and back again, but up stays up and down stays down.',
      'An axial group crowds the two axial H atoms on its face, two carbons away: 1,3-diaxial interactions, a kind of steric strain. An equatorial group avoids them.',
      'The bigger the group, the bigger its A-value and the more strongly it prefers equatorial. A C(CH₃)₃ group locks the ring.',
      'With two groups, the more stable chair has as many groups as possible equatorial, and the bigger group equatorial first. A flip never turns cis into trans.'
    ].map(function (t) { return h('li', { text: t }); }))]);
    el.stage.appendChild(h('div', { class: 'grid2' }, [box, ideas]));
    /* Two clicks, so nobody wipes their work by accident. */
    var again = h('button', { type: 'button', class: 'primary', text: 'Start a new attempt' });
    var sure = h('div', { class: 'confirm', hidden: true }, [
      h('p', { text: 'This clears all your answers, builds and predictions and gives you a new set of checkpoint ' +
                     'questions. Your best score so far (' + Math.max(best, pct) + '%) stays in the gradebook.' }),
      h('div', { class: 'btnrow' }, [
        h('button', { type: 'button', class: 'primary', text: 'Yes, start again', onclick: newAttempt }),
        h('button', { type: 'button', class: 'ghostbtn', text: 'Cancel',
          onclick: function () { sure.hidden = true; again.hidden = false; again.focus(); } })
      ])
    ]);
    again.addEventListener('click', function () { again.hidden = true; sure.hidden = false; sure.querySelector('.primary').focus(); });
    el.stage.appendChild(panel('Try it again?', null, [
      h('p', { class: 'muted', text: 'You can redo the whole activity with new checkpoint questions. Parts you have ' +
                                     'already reached stay open, so you can jump straight to any of them.' }),
      h('div', { class: 'btnrow' }, [again]),
      sure
    ]));
    say('Activity complete.', 'good');
  };

  /* ---- explore (teacher demo): ?explore or ?explore=cisTM */

  function explore(id) {
    var ids = Object.keys(MOLECULES);
    var mol = molecule(ids.indexOf(id) >= 0 ? id : 'methyl');
    el.parts.hidden = true;
    el.next.hidden = true;
    el.back.hidden = true;
    el.score.hidden = true;
    el.stepTitle.textContent = 'Explore';
    el.counter.textContent = 'Teacher demo: nothing is saved';
    el.instructions.textContent = 'Pick any molecule and flip it. Nothing here is saved or graded.';
    var sel = h('select', { class: 'select', 'aria-label': 'Molecule' }, ids.map(function (k) {
      return h('option', { value: k, selected: k === mol.id, text: MOLECULES[k].name + (k === 'tracked' ? ' (red and blue H)' : '') });
    }));
    var m3 = model3D(mol, { views: [['side', 'Side view'], ['end', 'End view'], ['top', 'Top view'],
                                    ['bond', 'Down C1–C2', [1, 2]]] });
    var host = h('div', { class: 'chair-wrap' });
    var read = h('p', { class: 'parts' });
    var fl = flipper(function (t) { update(t); });
    var plotHost = h('div', { class: 'graph-host' });
    el.stage.appendChild(h('div', { class: 'btnrow' }, [sel]));
    el.stage.appendChild(h('div', { class: 'grid2' }, [m3.node, panel('Chair drawing', null, [host, read, fl.node])]));
    el.stage.appendChild(panel('Energy during the flip', null, [plotHost]));
    var plot = new Draw.FlipPlot(plotHost, { mol: mol });
    m3.start();
    function update(t) {
      var e = ends(t);
      m3.setT(t);
      m3.viewer().setGlow(e < 0 ? [] : crowdGlow(mol, e));
      host.innerHTML = '';
      host.appendChild(Draw.chair(mol, t, { show: MOLECULES.groups(mol).length ? null : 'all',
        mark: e < 0 ? {} : markAxial(mol, e) }));
      read.textContent = e < 0 ? 'Flipping…' : 'Chair ' + (e + 1) + (MOLECULES.groups(mol).length ? ': ' + axialText(mol, e) : '.') +
        '  ' + AVAL.breakdown(mol, e);
      plot.marker = t;
      plot.render();
    }
    sel.addEventListener('change', function () {
      mol = molecule(sel.value);
      plot.setMols([mol]);
      m3.setMolecule(mol, fl.t());
      update(fl.t());
    });
    update(0);
  }

  /* --------------------------------------------------------- references */

  function buildReference() {
    el.strainBody.appendChild(aTable());
    var dl = h('dl', { class: 'vocab' });
    [
      ['Chair', 'The most stable shape of cyclohexane: no angle strain and no torsional strain.'],
      ['Boat', 'A less stable shape with both ends of the ring pointing up. Its two flagpole H atoms crowd each other and some of its bonds are eclipsed.'],
      ['Axial', 'A position that points straight up or straight down, parallel to the axis of the ring. Each carbon has one.'],
      ['Equatorial', 'A position that points out from the ring, around its equator, tilted slightly up or down. Each carbon has one.'],
      ['Top face, bottom face', 'The two sides of the ring. Every carbon has one position pointing up (top face) and one pointing down (bottom face).'],
      ['Ring flip', 'The change from one chair to the other by turning about single bonds. Axial positions become equatorial and equatorial become axial; up stays up.'],
      ['1,3-diaxial interaction', 'The steric strain between an axial group and an axial atom on the same face two carbons away (C1 and C3, C1 and C5).'],
      ['Steric strain', 'The extra energy when two groups are forced so close that their electron clouds repel.'],
      ['Torsional strain', 'The extra energy of eclipsed bonds.'],
      ['Angle strain', 'The extra energy when bond angles are forced away from the ideal 109.5°.'],
      ['A-value', 'How much higher in energy the chair with a group axial is than the chair with it equatorial. Bigger group, bigger A-value.'],
      ['cis', 'Two groups on the same face of the ring (both wedges, or both dashes).'],
      ['trans', 'Two groups on opposite faces of the ring (one wedge, one dash).']
    ].forEach(function (p) {
      dl.appendChild(h('dt', { text: p[0] }));
      dl.appendChild(h('dd', { text: p[1] }));
    });
    el.vocabBody.appendChild(dl);
  }

  /* ------------------------------------------------------------------ boot */

  function showIntro() {
    var box = h('div', { class: 'screen-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'introTitle' }, [
      h('h2', { id: 'introTitle', text: 'Cyclohexane chairs and ring flips' }),
      h('p', { text: 'You will turn cyclohexane rings in 3D, flip them from one chair to the other, and find out why ' +
                     'big groups avoid the axial positions.' }),
      h('ul', { class: 'screen-list' }, [
        h('li', { text: 'Part 1, The chair: its shape, axial and equatorial, up and down.' }),
        h('li', { text: 'Part 2, The ring flip: what moves and what stays put.' }),
        h('li', { text: 'Part 3, Axial crowding: 1,3-diaxial interactions and A-values.' }),
        h('li', { text: 'Part 4, Two groups: cis and trans, and the more stable chair.' })
      ]),
      h('p', { text: 'Predictions and builds are never graded, so try things. The four checkpoints are graded: your ' +
                     'first answer to each question counts. About 35 to 40 minutes. Your progress is saved if you leave.' }),
      h('p', { text: 'The checkpoint questions ask you to compare, rank and explain. Nothing needs to be calculated.' }),
      h('p', { class: 'screen-note', text: 'Everything works with a mouse, a touch screen or the keyboard (Tab and Enter).' })
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
    ['parts', 'stepTitle', 'counter', 'instructions', 'stage', 'feedback', 'next', 'back', 'score', 'lms',
     'screen', 'strainBody', 'vocabBody'].forEach(function (id) { el[id] = $(id); });
    buildReference();

    var connected = SCORM.init();
    el.lms.textContent = connected ? 'Connected to the LMS' : 'Standalone: no LMS detected';
    el.lms.className = 'lms ' + (connected ? 'on' : 'off');

    var params = new URLSearchParams(location.search);
    if (params.has('explore')) { explore(params.get('explore')); return; }

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

    el.next.addEventListener('click', function () { goTo(state.step + 1); });
    el.back.addEventListener('click', function () { goTo(state.step - 1); });

    if (preview) { goTo(state.step); return; }
    paintParts();
    showIntro();
  }

  return { start: start, SCHEMA: SCHEMA, STEPS: STEPS, GRADED: GRADED, QZ: QZ, judgeBuild: judgeBuild,
           swapAnswer: swapAnswer, bestAnswer: bestAnswer, BEST: BEST, SWAP_NOTES: SWAP_NOTES, PREDICT: PREDICT,
           figure: figure };
})();

document.addEventListener('DOMContentLoaded', App.start);

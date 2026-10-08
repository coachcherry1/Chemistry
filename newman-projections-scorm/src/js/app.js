/* app.js — the steps, their order, saving, scoring.
 *
 * Part 1  Ethane: look down the bond, build, predict, rotate, label, quiz
 * Part 2  Butane: the same loop, now with gauche and totally eclipsed
 * Part 3  Substituted butanes: halogens and branched groups, best staggered
 * Part 4  Wedges and dashes: two 2,3-dibromobutanes that differ only in one
 *         wedge, and therefore in their best conformation
 *
 * Only the four checkpoints are graded (first answer counts). Builds, graphs
 * and predictions must be finished to move on but are never scored: a wrong
 * build gets an explanation and another try, a prediction is just compared
 * with what really happens.
 */

var App = (function () {
  'use strict';

  /* Bump whenever the step list, the quiz draw or a molecule changes: a save
     from an older build is then discarded rather than resumed. */
  var SCHEMA = 1;

  var PARTS = [
    { n: 1, name: 'Ethane' },
    { n: 2, name: 'Butane' },
    { n: 3, name: 'Substituted butanes' },
    { n: 4, name: 'Wedges & dashes' },
    { n: 5, name: 'Results' }
  ];

  var STEPS = [
    { id: 'meet', part: 1, kind: 'meet', mol: 'ethane',
      title: 'Looking down a C–C bond',
      text: 'A Newman projection is what you see when you look straight down one carbon–carbon bond. ' +
            'Drag the 3D model to turn it, then press “Down the C1–C2 bond” to line your view up with the bond.' },
    { id: 'build-ethane', part: 1, kind: 'build', mol: 'ethane',
      title: 'Build ethane’s Newman projection',
      text: 'The drawing shows ethane with every hydrogen. One H on each carbon is coloured so you can track it. ' +
            'Look along the C1–C2 bond from the eye: C1 is in front. Put every H in its place, then press Check.' },
    { id: 'sketch-ethane', part: 1, kind: 'sketch', mol: 'ethane',
      title: 'Predict: how does the energy change?',
      text: 'Next you will turn the back carbon all the way around. First, predict. Drag the dots up or down to ' +
            'show where you think the energy is high and where it is low. The pictures under the graph show each ' +
            'conformation. Any prediction is fine — it is not graded.' },
    { id: 'trace-ethane', part: 1, kind: 'trace', mol: 'ethane', sketch: 'sketch-ethane',
      title: 'Turn the back carbon a full circle',
      text: 'Drag around the Newman projection, use the slider, or use the arrow keys. The graph fills in as you ' +
            'go — fill in the whole curve. Stop on a peak or a valley to see where its energy comes from.' },
    { id: 'label-ethane', part: 1, kind: 'label', mol: 'ethane', terms: ['staggered', 'eclipsed'],
      title: 'Name the peaks and valleys',
      text: 'Put a word on every point. Choose a word, then the point it describes; a word can be used more ' +
            'than once. The Newman projections under the graph will help.' },
    { id: 'quiz-A', part: 1, kind: 'quiz', quiz: 'A',
      title: 'Checkpoint 1',
      text: 'Graded: your first answer to each question counts. Read the explanation after each one.' },

    { id: 'build-butane', part: 2, kind: 'build', mol: 'butane',
      title: 'Build butane’s Newman projection',
      text: 'Look along the C2–C3 bond from the eye: C2 is in front. The two CH₃ groups are C1 and C4, the ends ' +
            'of the chain. Place every group, then press Check.' },
    { id: 'sketch-butane', part: 2, kind: 'sketch', mol: 'butane',
      title: 'Predict butane’s energy curve',
      text: 'Butane has two CH₃ groups that can crowd each other. Sketch how you think the energy changes as the ' +
            'back carbon turns. Which conformation will be highest? Which lowest? Not graded.' },
    { id: 'trace-butane', part: 2, kind: 'trace', mol: 'butane', sketch: 'sketch-butane',
      title: 'Turn butane a full circle',
      text: 'Fill in the whole curve. On each peak and valley, read the breakdown under the slider: every ' +
            'eclipsed or gauche pair adds its cost from the strain table.' },
    { id: 'label-butane', part: 2, kind: 'label', mol: 'butane',
      terms: ['anti', 'gauche', 'eclipsed', 'totally eclipsed'],
      title: 'Name butane’s conformations',
      text: 'Put a word on every point. Choose a word, then the point it describes; a word can be used more ' +
            'than once.' },
    { id: 'quiz-B', part: 2, kind: 'quiz', quiz: 'B',
      title: 'Checkpoint 2',
      text: 'Graded: your first answer to each question counts. Open the strain table below if you need it.' },

    { id: 'build-bromo', part: 3, kind: 'build', mol: 'bromobutane',
      title: 'Build 2-bromobutane',
      text: 'Now the wedge and the dash matter. C2 carries three different groups, and swapping any two of them ' +
            'makes a different molecule. Check which group is on the wedge and which is on the dash.' },
    { id: 'find-bromo', part: 3, kind: 'find', mol: 'bromobutane',
      title: 'Find the lowest-energy conformation',
      text: 'Predict first. Then turn the back carbon until you reach the lowest energy, and press “Lock in”.',
      predict: {
        q: 'Br is a much bigger atom than C. In the lowest-energy conformation, which group on C2 will be anti ' +
           'to the CH₃ on C3?',
        choices: ['Br', 'CH₃', 'H'],
        answer: 1,
        reveal: 'The CH₃ goes anti, not the Br. A Br/CH₃ gauche interaction costs only about 1 kJ/mol — less ' +
                'than a third of a CH₃/CH₃ gauche interaction (3.8). The C–Br bond is 1.94 Å long, so the Br ' +
                'sits well away from its neighbours. Switch the 3D model to space-filling to see it.'
      } },
    { id: 'swap', part: 3, kind: 'swap',
      title: 'Swap the group on C2',
      text: 'What if the Br were a different group? For each one, predict which group ends up anti to the CH₃ on ' +
            'the back carbon. Then compare its curve with 2-bromobutane’s.' },
    { id: 'quiz-C', part: 3, kind: 'quiz', quiz: 'C',
      title: 'Checkpoint 3',
      text: 'Graded: your first answer to each question counts.' },
    { id: 'build-dmb', part: 3, kind: 'build', mol: 'dimethylbutane',
      title: 'Build 2,3-dimethylbutane',
      text: 'Each central carbon carries two CH₃ groups and an H. Build the conformation shown in the drawing.' },
    { id: 'find-dmb', part: 3, kind: 'find', mol: 'dimethylbutane',
      title: 'Find the best staggered conformation',
      text: 'Predict first. Then turn the back carbon to the lowest-energy conformation and lock it in.',
      predict: {
        q: 'How many CH₃/CH₃ gauche interactions will the lowest-energy staggered conformation have?',
        choices: ['0', '1', '2', '3'],
        answer: 2,
        reveal: 'Two. With four CH₃ groups on two neighbouring carbons, some CH₃ has to be gauche to another. ' +
                'The best you can do is put the two H atoms anti, which leaves two gauche interactions ' +
                '(7.6 kJ/mol). The drawing showed the worst staggered conformation: three (11.4).'
      } },

    { id: 'build-A', part: 4, kind: 'build', mol: 'pairA_Br',
      title: 'Build Molecule A',
      text: 'Molecules A and B are both 2,3-dibromobutane: the same atoms, joined in the same order. Look closely ' +
            'at the wedges and dashes. Build A first.' },
    { id: 'build-B', part: 4, kind: 'build', mol: 'pairB_Br',
      title: 'Build Molecule B',
      text: 'Compare B’s drawing with A’s — one wedge and dash on C3 are the other way round. Build B.' },
    { id: 'pair', part: 4, kind: 'pair',
      title: 'Put the bromines anti',
      text: 'Predict first. Then turn each molecule until its two Br atoms are anti, and compare.' },
    { id: 'quiz-D', part: 4, kind: 'quiz', quiz: 'D',
      title: 'Checkpoint 4',
      text: 'Graded: your first answer to each question counts.' },

    { id: 'results', part: 5, kind: 'results',
      title: 'Results',
      text: '' }
  ];

  var GRADED = Object.keys(QUIZZES).reduce(function (s, k) { return s + QUIZZES[k].draw; }, 0);

  var el = {};
  var state = null;
  var ctl = null;           /* the current step's controller */
  var preview = false;      /* ?step= teacher preview: nothing is saved or reported */
  var fmt = STRAIN.fmt;

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

  /* ------------------------------------------------------------------ state */

  function newState() {
    var seed = Math.floor(Math.random() * 1e9);
    var rand = rng(seed);
    var draws = {};
    Object.keys(QUIZZES).forEach(function (k) {
      var Q = QUIZZES[k];
      var core = Q.core.slice();
      var rest = shuffle(Q.pool.map(function (q) { return q.id; }).filter(function (id) {
        return core.indexOf(id) < 0;
      }), rand);
      var ids = core.concat(rest.slice(0, Q.draw - core.length));
      /* keep the pool's own order, so related questions sit together */
      draws[k] = Q.pool.map(function (q) { return q.id; }).filter(function (id) { return ids.indexOf(id) >= 0; });
    });
    return { v: SCHEMA, seed: seed, step: 0, max: 0, draws: draws, ans: {}, pick: {}, sk: {}, pr: {}, done: {}, fin: 0, flip: 0 };
  }

  function restore(saved) {
    if (!saved || saved.v !== SCHEMA || !saved.draws) return null;
    return saved;
  }

  function persist() {
    if (preview) return;
    SCORM.saveState(state);
  }

  function correctCount() {
    return Object.keys(state.ans).reduce(function (s, k) { return s + (state.ans[k] ? 1 : 0); }, 0);
  }

  function answeredCount() { return Object.keys(state.ans).length; }

  function reportScore() {
    if (preview) return;
    SCORM.setScore(100 * correctCount() / GRADED);
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
    el.score.textContent = 'Checkpoint score: ' + correctCount() + ' / ' + GRADED;
  }

  function goTo(i) {
    if (i < 0 || i >= STEPS.length || i > state.max) return;
    if (ctl && ctl.destroy) ctl.destroy();
    ctl = null;
    viewHooks = [];
    state.step = i;
    persist();
    var s = STEPS[i];
    el.stepTitle.textContent = s.title;
    el.counter.textContent = 'Step ' + (i + 1) + ' of ' + STEPS.length;
    el.instructions.textContent = s.text;
    el.instructions.hidden = !s.text;
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

  /* ------------------------------------------------------ view turning */

  /* Drawings on the current step that must redraw when the student turns
     the view 180°. Cleared on every step change. */
  var viewHooks = [];

  function flipButton() {
    var b = h('button', { type: 'button', class: 'mini toggle', 'aria-pressed': Draw.getFlip() ? 'true' : 'false',
      title: 'Turn the Newman projection upside down. It is the same projection, seen from the other way up.',
      text: '↻ Turn view 180°' });
    b.addEventListener('click', function () {
      Draw.setFlip(Draw.getFlip() ? 0 : 180);
      if (state) { state.flip = Draw.getFlip(); persist(); }
      var nodes = document.querySelectorAll('.flip-btn');
      for (var i = 0; i < nodes.length; i++) nodes[i].setAttribute('aria-pressed', Draw.getFlip() ? 'true' : 'false');
      viewHooks.forEach(function (fn) { fn(); });
    });
    b.classList.add('flip-btn');
    return b;
  }

  /* ------------------------------------------------------- shared panels */

  function panel(title, hint, kids, cls) {
    return h('section', { class: 'panel ' + (cls || '') }, [
      h('div', { class: 'panel-head' }, [h('h3', { text: title }), hint ? h('span', { class: 'hint', text: hint }) : null])
    ].concat(kids || []));
  }

  /* 3D model with its view buttons. */
  function model3D(mol, opts) {
    opts = opts || {};
    var canvas = h('canvas', { class: 'c3d', role: 'img',
      'aria-label': '3D ball-and-stick model of ' + mol.name + '. Drag to turn it.' });
    var bond = mol.carbons[0] + '–' + mol.carbons[1];
    var bPage = h('button', { type: 'button', class: 'mini', text: 'As drawn' });
    var bDown = h('button', { type: 'button', class: 'mini', text: 'Down the ' + bond + ' bond' });
    var bFill = h('button', { type: 'button', class: 'mini toggle', 'aria-pressed': 'false', text: 'Space-filling' });
    var node = panel('3D model', 'drag to turn', [
      h('div', { class: 'c3d-wrap' }, [canvas]),
      h('div', { class: 'btnrow' }, [bPage, bDown, bFill])
    ], 'p3d');
    var viewer = null;
    function ensure() {
      if (!viewer) viewer = new Viewer3D(canvas, mol, { view: opts.view, onView: opts.onView });
      return viewer;
    }
    bPage.addEventListener('click', function () { ensure().setView('page'); if (opts.onView) opts.onView('page'); });
    bDown.addEventListener('click', function () { ensure().setView('newman'); if (opts.onView) opts.onView('newman'); });
    bFill.addEventListener('click', function () {
      var on = bFill.getAttribute('aria-pressed') !== 'true';
      bFill.setAttribute('aria-pressed', on ? 'true' : 'false');
      ensure().setStyle(on ? 'space' : 'ball');
    });
    return {
      node: node,
      /* the canvas must be in the document before it can be sized */
      start: function (phi) { ensure(); if (phi != null) viewer.setPhi(phi); viewer.resize(); return viewer; },
      viewer: function () { return ensure(); },
      setMolecule: function (m, phi) {
        mol = m;
        canvas.setAttribute('aria-label', '3D ball-and-stick model of ' + m.name + '. Drag to turn it.');
        ensure().setMolecule(m, phi);
      }
    };
  }

  /* Named-angle text, energy and the sum that produced it. */
  function partsText(mol, phi) {
    var parts = GEOM.breakdownAt(mol, phi);
    if (!parts.length) return 'Nothing eclipsed, no gauche interactions: 0 kJ/mol.';
    return parts.map(function (p) {
      return p.label + ' ' + p.kind + ' ' + (p.n > 1 ? p.n + ' × ' + fmt(p.cost) : fmt(p.cost));
    }).join('  +  ') + '  =  ' + fmt(STRAIN.sum(parts)) + ' kJ/mol';
  }

  function readoutText(mol, phi) {
    var e = GEOM.energyAt(mol, phi);
    var name = conformationName(mol, phi);
    var rel = mol.vocab === 'ethane' ? null : refRelation(mol, phi);
    var bits = ['Dihedral angle ' + Math.round(phi) + '°', fmt(e) + ' kJ/mol'];
    if (name) bits.push(name + (rel && mol.vocab !== 'butane' ? ' (' + rel + ')' : ''));
    return bits.join('  ·  ');
  }

  /* The rotatable Newman projection, its slider and readout. */
  function rotator(mol, onChange, opts) {
    opts = opts || {};
    var host = h('div', { class: 'rotor-host' });
    var range = h('input', { type: 'range', min: 0, max: 355, step: 5, class: 'rotor-range',
      'aria-label': 'Turn the back carbon (dihedral angle)' });
    var read = h('p', { class: 'readout' });
    var parts = opts.parts === false ? null : h('p', { class: 'parts' });
    var node = panel(opts.title || 'Newman projection', 'drag around it to turn the back carbon', [
      host,
      h('label', { class: 'range-row' }, [h('span', { text: 'Back carbon' }), range]),
      read, parts,
      h('div', { class: 'btnrow' }, [flipButton()])
    ], 'prot');
    var rotor = new Draw.Rotor(host, mol, function (phi, prev) { update(phi, prev); });
    viewHooks.push(function () { rotor.paint(); });

    function paintText(phi) {
      read.textContent = readoutText(rotor.mol, phi);
      if (parts) {
        var named = conformationName(rotor.mol, phi);
        parts.textContent = named ? partsText(rotor.mol, phi) : '';
        parts.hidden = !named;
      }
      range.setAttribute('aria-valuetext', read.textContent);
    }
    function update(phi, prev) {
      range.value = Math.round(phi / 5) * 5 % 360;
      paintText(phi);
      onChange(phi, prev);
    }
    range.addEventListener('input', function () {
      var prev = rotor.phi;
      rotor.set(+range.value, false);
      paintText(rotor.phi);
      onChange(rotor.phi, prev);
    });
    /* let the arrow keys keep turning past 355° → 0° */
    range.addEventListener('keydown', function (ev) {
      var up = ev.key === 'ArrowRight' || ev.key === 'ArrowUp';
      var down = ev.key === 'ArrowLeft' || ev.key === 'ArrowDown';
      if (up && +range.value >= 355) { ev.preventDefault(); range.value = 0; range.dispatchEvent(new Event('input')); }
      if (down && +range.value <= 0) { ev.preventDefault(); range.value = 355; range.dispatchEvent(new Event('input')); }
    });
    range.value = Math.round(rotor.phi / 5) * 5 % 360;
    paintText(rotor.phi);
    return {
      node: node,
      rotor: rotor,
      set: function (phi) { rotor.set(phi, false); range.value = Math.round(phi / 5) * 5 % 360; paintText(phi); },
      setMolecule: function (m) { rotor.setMolecule(m); paintText(rotor.phi); },
      refresh: function () { paintText(rotor.phi); }
    };
  }

  /* Which 5° bins of the circle the student has turned through. */
  function Coverage(full) {
    this.bins = [];
    for (var i = 0; i < 72; i++) this.bins.push(full ? 1 : 0);
  }
  Coverage.prototype.mark = function (from, to) {
    var d = GEOM.wrap(to - from);
    if (d > 180) d -= 360;
    var n = Math.abs(Math.round(d)), s = d < 0 ? -1 : 1;
    for (var i = 0; i <= n; i++) this.bins[Math.floor(GEOM.wrap(from + s * i) / 5) % 72] = 1;
  };
  Coverage.prototype.fraction = function () {
    return this.bins.reduce(function (a, b) { return a + b; }, 0) / 72;
  };
  Coverage.prototype.degrees = function () {
    var b = this.bins, out = [];
    for (var d = 0; d < 360; d++) {
      out.push(!!(b[Math.floor(d / 5)] || (d % 5 === 0 && b[(d / 5 + 71) % 72])));
    }
    return out;
  };

  /* --------------------------------------------------------------- figures */

  function figure(spec, cls) {
    if (spec.newman) {
      var m = molecule(spec.newman);
      var nm = GEOM.newmanAt(m, spec.phi);
      return Draw.newman(nm, { offset: spec.phi % 120 === 0 ? Draw.ECLIPSE_OFFSET : 0, cls: cls || 'fig' });
    }
    if (spec.zigzag) return Draw.zigzag(molecule(spec.zigzag));
    if (spec.graph) {
      var host = h('div', { class: 'fig-graph' });
      var mg = molecule(spec.graph);
      var g = new EnergyGraph(host, { mol: mg });
      g.curves = [{ mol: mg }];
      g.letters = Object.keys(spec.letters).map(function (k) { return { letter: k, phi: spec.letters[k] }; });
      g.render();
      return host;
    }
    return h('span');
  }

  /* -------------------------------------------------------------- the steps */

  var RENDER = {};

  /* ---- meet: the 3D model swings round to the Newman view */

  RENDER.meet = function (s) {
    var mol = molecule(s.mol);
    var done = !!state.done[s.id];
    var m3 = model3D(mol, {
      onView: function (v) {
        if (v !== 'newman') return;
        complete('That is the Newman view. The front carbon (' + mol.carbons[0] + ') hides the back carbon (' +
                 mol.carbons[1] + '). The three bonds meeting in the middle belong to the front carbon; the three ' +
                 'that start at the circle belong to the back carbon.');
      }
    });
    var nm = Draw.newman(GEOM.newmanOf(mol), { cls: 'big' });
    var right = panel('Newman projection', null, [
      h('div', { class: 'nm-wrap' }, [nm]),
      h('ul', { class: 'keylist' }, [
        h('li', null, ['The ', h('b', { text: 'front carbon' }), ' (C1) is the point where three bonds meet.']),
        h('li', null, ['The ', h('b', { text: 'back carbon' }), ' (C2) hides directly behind it. It is drawn as ' +
          'a circle, and its three bonds start at the circle’s edge.']),
        h('li', null, ['The red H is on C1 and the blue H is on C2, in both pictures.'])
      ])
    ]);
    el.stage.appendChild(h('div', { class: 'grid2' }, [m3.node, right]));
    m3.start();
    if (done) say('Turn the model as much as you like, or move on.', '');
  };

  /* ---- build: wedge/dash drawing → Newman template */

  var TILE_ORDER = ['Hr', 'Hb', 'CH3', 'iPr', 'tBu', 'Cl', 'Br', 'I', 'H'];

  function targetSlots(mol) {
    var nm = GEOM.newmanOf(mol), t = [];
    Draw.SLOTS.forEach(function (sl) {
      var list = nm[sl.side];
      for (var i = 0; i < list.length; i++) if (list[i].a === sl.a) t.push(list[i].g);
    });
    return t;
  }

  function rotated(arr, k) {
    return [arr[k % 3], arr[(k + 1) % 3], arr[(k + 2) % 3]];
  }

  function sameMultiset(a, b) { return a.slice().sort().join() === b.slice().sort().join(); }

  /* Judge a build. `got` and `want` are six group keys in slot order. */
  function judgeBuild(mol, got, want) {
    var gf = got.slice(0, 3), gb = got.slice(3), wf = want.slice(0, 3), wb = want.slice(3);
    var F = mol.carbons[0], B = mol.carbons[1];
    for (var k = 0; k < 3; k++) {
      if (rotated(gf, k).join() === wf.join() && rotated(gb, k).join() === wb.join()) {
        return { ok: true, turned: k !== 0 };
      }
    }
    function list(keys) {
      var names = keys.map(function (g) { return GROUPS[g].name; }).sort();
      return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    }
    if (!sameMultiset(gf, wf) || !sameMultiset(gb, wb)) {
      if (sameMultiset(gf, wb) && sameMultiset(gb, wf)) {
        return { kind: 'swapped', msg: 'Front and back are the wrong way round. The front carbon is ' + F +
          ', the one nearest the eye — its groups go on the bonds that meet in the centre.' };
      }
      var which = !sameMultiset(gf, wf) ? 'front carbon (' + F + ')' : 'back carbon (' + B + ')';
      return { kind: 'groups', msg: 'The ' + which + ' has the wrong groups. In the drawing, ' + F + ' carries ' +
        list(wf) + ', and ' + B + ' carries ' + list(wb) + '.' };
    }
    function configOK(g, w) {
      for (var j = 0; j < 3; j++) if (rotated(g, j).join() === w.join()) return true;
      return false;
    }
    var wedgeNote = 'Swapping two groups on one carbon makes a different molecule, not a different view. ' +
      'Check which group is on the wedge (toward you) and which is on the dash (away from you).';
    if (!configOK(gf, wf)) {
      return { kind: 'config', msg: 'The front carbon (' + F + ') has the right groups, but two of them are ' +
        'swapped. ' + wedgeNote };
    }
    if (!configOK(gb, wb)) {
      return { kind: 'config', msg: 'The back carbon (' + B + ') has the right groups, but two of them are ' +
        'swapped. ' + wedgeNote };
    }
    var fa = GROUPS[mol.front.anchor].name, ba = GROUPS[mol.back.anchor].name;
    return { kind: 'conformation', msg: 'Both carbons are right, but the back carbon is turned 120° away from ' +
      'the drawing. In the zigzag, the ' + fa + ' on ' + F + ' and the ' + ba + ' on ' + B + ' both lie in the ' +
      'page, pointing opposite ways — so in the Newman projection they must be anti, 180° apart.' };
  }

  RENDER.build = function (s) {
    var mol = molecule(s.mol);
    var want = targetSlots(mol);
    var done = !!state.done[s.id];
    var tiles = want.slice().sort(function (a, b) {
      return TILE_ORDER.indexOf(a) - TILE_ORDER.indexOf(b);
    }).map(function (g) { return { g: g, slot: null }; });
    var slots = [null, null, null, null, null, null];
    var wrong = 0;
    if (done) want.forEach(function (g, i) {
      for (var t = 0; t < tiles.length; t++) if (tiles[t].g === g && tiles[t].slot == null) { tiles[t].slot = i; slots[i] = t; break; }
    });

    var drawingCard = panel(mol.tag ? mol.tag + ': ' + mol.name : mol.name, null, [
      h('div', { class: 'zz-wrap' }, [Draw.zigzag(mol)]),
      h('p', { class: 'legend' }, [
        h('span', { class: 'lg-wedge', 'aria-hidden': 'true' }), ' wedge = toward you   ',
        h('span', { class: 'lg-dash', 'aria-hidden': 'true' }), ' dash = away from you   ',
        h('span', { class: 'lg-line', 'aria-hidden': 'true' }), ' line = in the page'
      ])
    ], 'p-draw');
    var tplHost = h('div', { class: 'tpl-host' });
    var tray = h('div', { class: 'tray', 'aria-label': 'Groups to place' });
    var check = h('button', { type: 'button', class: 'primary', text: 'Check' });
    var reset = h('button', { type: 'button', class: 'ghostbtn', text: 'Clear' });
    var hintBtn = h('button', { type: 'button', class: 'ghostbtn', text: 'Show me in 3D', hidden: true });
    var tip = h('p', { class: 'tip', hidden: true });
    var buildPanel = panel('Your Newman projection', 'looking from the eye', [
      tplHost,
      tray,
      h('div', { class: 'btnrow' }, [check, reset, hintBtn, flipButton()]),
      tip
    ], 'p-build');
    var help3D = h('div', { class: 'help3d', hidden: true });
    el.stage.appendChild(h('div', { class: 'grid2' }, [drawingCard, buildPanel]));
    el.stage.appendChild(help3D);

    function paint() {
      tplHost.innerHTML = '';
      tplHost.appendChild(Draw.template(slots.map(function (t) { return t == null ? null : tiles[t].g; }), mol.carbons));
      tray.innerHTML = '';
      var left = 0;
      tiles.forEach(function (t, i) {
        if (t.slot != null) return;
        left++;
        tray.appendChild(h('button', {
          type: 'button', class: 'tile tone-' + groupTone(t.g), 'data-tile': i,
          'aria-label': 'Group ' + GROUPS[t.g].name
        }, [label(t.g)]));
      });
      if (!left) tray.appendChild(h('p', { class: 'tray-empty', text: done ? 'Built.' : 'All placed — press Check.' }));
    }

    viewHooks.push(function () { paint(); if (wrong >= 2) tip.textContent = sideTip(); });
    var picker = Picker({
      tray: tray, stage: tplHost,
      label: function (k) { return label(tiles[+k].g); },
      prompt: function (k) { return 'Now choose a position for ' + GROUPS[tiles[+k].g].name + '.'; },
      say: function (t) { say(t); },
      drop: function (slotKey, tileKey) {
        if (done) return;
        var si = +slotKey, ti = +tileKey;
        if (slots[si] != null) tiles[slots[si]].slot = null;
        slots[si] = ti;
        tiles[ti].slot = si;
        paint();
        say('');
        var n = tplHost.querySelector('.drop[data-drop="' + si + '"]');
        if (n) n.focus({ preventScroll: true });
      },
      empty: function (slotKey) {
        if (done) return;
        var si = +slotKey;
        if (slots[si] == null) { say('Choose a group first, then a position.'); return; }
        tiles[slots[si]].slot = null;
        slots[si] = null;
        paint();
        say('Removed. Pick a group to put there instead.');
      }
    });

    var helper = null;
    function show3D(after) {
      help3D.hidden = false;
      help3D.innerHTML = '';
      helper = model3D(mol);
      var note = h('p', { class: 'help3d-note', text: after
        ? 'Here is your molecule in 3D. Watch it swing round to the view from the eye.'
        : 'This is the drawing in 3D. Turn it, or press “Down the ' + mol.carbons[0] + '–' + mol.carbons[1] +
          ' bond” to see it from the eye.' });
      help3D.appendChild(h('div', { class: 'grid2' }, [helper.node, h('div', { class: 'help3d-side' }, [note])]));
      helper.start();
      if (after) setTimeout(function () { helper.viewer().setView('newman'); }, 650);
    }

    /* With the view turned 180° the front chain group points down, and the
       wedge/dash sides swap with it. */
    function sideTip() {
      var up = !Draw.getFlip();
      return 'Tip: picture yourself at the eye, with the ' + GROUPS[mol.front.anchor].name + ' on ' +
        mol.carbons[0] + ' pointing straight ' + (up ? 'up' : 'down') + '. A wedge comes out of the page ' +
        'toward you — from where you stand, that is your ' + (up ? 'LEFT' : 'RIGHT') + '. A dash goes into ' +
        'the page — your ' + (up ? 'RIGHT' : 'LEFT') + '.';
    }

    check.addEventListener('click', function () {
      if (done) return;
      if (slots.some(function (x) { return x == null; })) { say('Fill all six positions first.', 'bad'); return; }
      var got = slots.map(function (t) { return tiles[t].g; });
      var r = judgeBuild(mol, got, want);
      if (r.ok) {
        done = true;
        tray.classList.add('locked');
        check.disabled = true; reset.disabled = true; hintBtn.hidden = true; tip.hidden = true;
        paint();
        complete('Correct!' + (r.turned ? ' You drew it turned as a whole — that is the same projection, ' +
          'just seen with your head tilted.' : '') + ' This is the conformation in the drawing.');
        show3D(true);
        return;
      }
      wrong++;
      say(r.msg, 'bad');
      if (wrong >= 1) {
        tip.hidden = false;
        tip.textContent = wrong === 1
          ? 'Tip: the front carbon is the one nearest the eye (' + mol.carbons[0] + '). Its groups go on the ' +
            'bonds that meet in the centre; the back carbon’s groups go on the bonds that start at the circle.'
          : sideTip();
      }
      if (wrong >= 2) hintBtn.hidden = false;
    });
    reset.addEventListener('click', function () {
      if (done) return;
      tiles.forEach(function (t) { t.slot = null; });
      slots = [null, null, null, null, null, null];
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

  /* ---- sketch: predict the curve */

  RENDER.sketch = function (s) {
    var mol = molecule(s.mol);
    var saved = state.sk[s.id];
    var host = h('div', { class: 'graph-host' });
    var lock = h('button', { type: 'button', class: 'primary', text: 'Lock in my prediction', disabled: true });
    var p = panel('Your prediction', 'drag the dots up and down', [host, h('div', { class: 'btnrow' }, [lock])]);
    el.stage.appendChild(p);
    var g = new EnergyGraph(host, { mol: mol, thumbs: true, hideNumbers: true });
    g.sketch = saved ? saved.slice() : [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    g.sketchEditable = !saved;
    g.onSketch = function () { lock.disabled = false; };
    g.render();
    if (saved) {
      lock.hidden = true;
      say('Prediction saved. Next, turn the molecule and compare.', 'good');
    }
    lock.addEventListener('click', function () {
      state.sk[s.id] = g.sketch.slice();
      g.sketchEditable = false;
      g.render();
      lock.hidden = true;
      complete('Prediction saved. Now turn the molecule and see how close you were.');
    });
  };

  /* Compare a sketch with the real curve at the six named angles. */
  function compareSketch(mol, sk) {
    var real = NAMED_ANGLES.map(function (a) { return GEOM.energyAt(mol, a); });
    var span = Math.max.apply(null, sk) - Math.min.apply(null, sk);
    if (span < 0.05) return 'You left the line flat, but the energy does change as the molecule turns — look at the peaks.';
    function peaks(v, tol) {
      var n = 0;
      for (var i = 0; i < 6; i++) {
        var a = v[(i + 5) % 6], b = v[i], c = v[(i + 1) % 6];
        if (b > a + tol && b > c + tol) n++;
      }
      return n;
    }
    function where(v, best) {
      var m = best === 'max' ? Math.max.apply(null, v) : Math.min.apply(null, v);
      return v.map(function (x, i) { return Math.abs(x - m) < 1e-6 + (v === real ? 0.3 : 0.02) ? NAMED_ANGLES[i] : null; })
        .filter(function (x) { return x != null; });
    }
    var out = [];
    var pp = peaks(sk, 0.02), rp = peaks(real, 0.3);
    out.push(pp === rp ? 'You drew ' + rp + ' peak' + (rp === 1 ? '' : 's') + ' — the real curve has ' + rp + '. ✓'
                       : 'You drew ' + pp + ' peak' + (pp === 1 ? '' : 's') + '; the real curve has ' + rp + '.');
    /* A sketch that ties four or more points has not really picked a
       highest or lowest point, so it gets no tick for it. */
    function verdict(word, r, p) {
      var where = r.length > 1 ? r.join('°, ') + '° (tied)' : r[0] + '°';
      if (p.length > 3) return word + ': ' + where + ' — your sketch did not single one out.';
      var hit = p.some(function (a) { return r.indexOf(a) >= 0; });
      return word + ': ' + where + (hit ? ' — you had that. ✓' : ' — you had ' + p.join('°, ') + '°.');
    }
    out.push(verdict('Highest', where(real, 'max'), where(sk, 'max')));
    out.push(verdict('Lowest', where(real, 'min'), where(sk, 'min')));
    return 'Your prediction (dashed) vs. the real curve: ' + out.join('  ');
  }

  /* ---- trace: rotate through 360° and fill in the curve */

  RENDER.trace = function (s) {
    var mol = molecule(s.mol);
    var done = !!state.done[s.id];
    var cov = new Coverage(done);
    var m3 = model3D(mol);
    var host = h('div', { class: 'graph-host' });
    var meter = h('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, [h('span')]);
    var meterText = h('span', { class: 'meter-text' });
    var g;
    var rot = rotator(mol, function (phi, prev) {
      m3.viewer().setPhi(phi);
      cov.mark(prev == null ? phi : prev, phi);
      paintGraph(phi);
    });
    el.stage.appendChild(h('div', { class: 'grid2' }, [m3.node, rot.node]));
    el.stage.appendChild(panel('Energy vs. dihedral angle', null, [host, h('div', { class: 'meter-row' }, [meter, meterText])]));
    g = new EnergyGraph(host, { mol: mol });
    if (state.sk[s.sketch]) g.sketch = state.sk[s.sketch];
    m3.start(rot.rotor.phi);
    cov.mark(rot.rotor.phi, rot.rotor.phi);

    function paintGraph(phi) {
      g.curves = [{ mol: mol, visited: cov.degrees() }];
      g.marker = phi;
      g.render();
      var f = cov.fraction();
      meter.firstChild.style.width = Math.round(f * 100) + '%';
      meter.setAttribute('aria-valuenow', Math.round(f * 100));
      meterText.textContent = f >= 1 ? 'Whole curve filled in' : 'Curve filled in: ' + Math.round(f * 100) + '%';
      if (f >= 1 && !done) {
        done = true;
        complete(g.sketch ? compareSketch(mol, g.sketch) : 'Curve complete.', 'good');
      }
    }
    paintGraph(rot.rotor.phi);
    if (done && g.sketch) say(compareSketch(mol, g.sketch), 'good');
  };

  /* ---- label: put the vocabulary on the curve */

  function termAt(mol, phi) { return conformationName(mol, phi); }

  function termWhy(mol, phi, wrongTerm) {
    var right = termAt(mol, phi);
    var shape = phi % 120 === 0 ? 'eclipsed — the back bonds line up behind the front bonds' :
                                  'staggered — every back bond sits between two front bonds';
    var rel = mol.vocab === 'ethane' ? '' : ', with ' + refRelation(mol, phi);
    return 'Not “' + wrongTerm + '”. At ' + phi + '° the molecule is ' + shape + rel + '. That point is “' + right + '”.';
  }

  RENDER.label = function (s) {
    var mol = molecule(s.mol);
    var done = !!state.done[s.id];
    var host = h('div', { class: 'graph-host' });
    var tray = h('div', { class: 'tray terms', 'aria-label': 'Words to place' });
    el.stage.appendChild(panel('Energy vs. dihedral angle', null, [host, tray]));
    var g = new EnergyGraph(host, { mol: mol, thumbs: true });
    g.curves = [{ mol: mol }];
    g.drops = NAMED_ANGLES.map(function (a) { return { phi: a, text: done ? termAt(mol, a) : null }; });
    function paint() {
      g.render();
      tray.innerHTML = '';
      s.terms.forEach(function (t, i) {
        tray.appendChild(h('button', { type: 'button', class: 'tile term', 'data-tile': i, disabled: done }, [t]));
      });
    }
    var picker = Picker({
      tray: tray, stage: host,
      label: function (k) { return s.terms[+k]; },
      prompt: function (k) { return 'Now choose a point that is “' + s.terms[+k] + '”.'; },
      say: function (t) { say(t); },
      drop: function (dk, tk) {
        var d = g.drops[+dk], term = s.terms[+tk];
        if (d.text) return;
        if (termAt(mol, d.phi) === term) {
          d.text = term;
          paint();
          var left = g.drops.filter(function (x) { return !x.text; }).length;
          if (!left) {
            done = true;
            paint();
            complete(mol.vocab === 'ethane'
              ? 'All labelled. Staggered conformations are the valleys; eclipsed ones are the peaks, 12 kJ/mol higher.'
              : 'All labelled. Anti is lowest, gauche is 3.8 kJ/mol higher, and totally eclipsed is the highest peak.');
          } else {
            say('Yes — ' + d.phi + '° is ' + term + '. ' + left + ' to go.', 'good');
          }
        } else {
          say(termWhy(mol, d.phi, term), 'bad');
          var n = host.querySelector('.drop[data-drop="' + dk + '"]');
          if (n) { n.classList.remove('shake'); void n.getBoundingClientRect(); n.classList.add('shake'); }
        }
      },
      empty: function () { say('Choose a word first, then the point it describes.'); }
    });
    paint();
    if (done) say('All labelled.', 'good');
    return { destroy: function () { picker.destroy(); } };
  };

  /* ---- quiz */

  function question(id) {
    for (var k in QUIZZES) {
      var pool = QUIZZES[k].pool;
      for (var i = 0; i < pool.length; i++) if (pool[i].id === id) return pool[i];
    }
    return null;
  }

  RENDER.quiz = function (s) {
    var Q = QUIZZES[s.quiz];
    var ids = state.draws[s.quiz];
    var box = h('div', { class: 'quiz' });
    el.stage.appendChild(panel(Q.title, null, [box]));

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
          typeof c === 'string' ? h('span', { class: 'choice-text', text: c }) : figure(c, 'fig choice-fig')
        ]);
        if (typeof c !== 'string') b.setAttribute('aria-label', 'Choice ' + letter + ': ' + Draw.describe(GEOM.newmanAt(molecule(c.newman), c.phi)));
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
        say(right ? 'Correct.' : 'Not quite — the correct answer is highlighted.', right ? 'good' : 'bad');
        paintParts();
        next.hidden = false;
        next.focus({ preventScroll: true });
      }
      next.addEventListener('click', function () { ask(n + 1); });
    }
    ask(0);
  };

  /* ---- find: predict, then rotate to the minimum and lock it in */

  function lowestAngles(mol) {
    var best = bestStaggered(mol);
    return namedEnergies(mol).filter(function (n) {
      return n.phi % 120 !== 0 && Math.abs(n.e - best.e) < 0.05;
    }).map(function (n) { return n.phi; });
  }

  function predictCard(p, chosen, onPick) {
    var box = h('div', { class: 'predict' }, [
      h('p', { class: 'predict-kicker', text: 'Predict — not graded' }),
      h('p', { class: 'q-text', text: p.q })
    ]);
    var row = h('div', { class: 'q-choices compact' });
    p.choices.forEach(function (c, i) {
      var b = h('button', { type: 'button', class: 'choice' + (chosen === i ? ' picked' : ''), disabled: chosen != null },
        [h('span', { class: 'choice-text', text: c })]);
      b.addEventListener('click', function () { onPick(i); });
      row.appendChild(b);
    });
    box.appendChild(row);
    return box;
  }

  RENDER.find = function (s) {
    var mol = molecule(s.mol);
    var done = !!state.done[s.id];
    var p = s.predict;
    var top = h('div');
    var area = h('div', { class: 'find-area' });
    el.stage.appendChild(top);
    el.stage.appendChild(area);

    function paintPredict() {
      top.innerHTML = '';
      top.appendChild(panel('Your prediction', null, [predictCard(p, state.pr[s.id], function (i) {
        state.pr[s.id] = i;
        persist();
        paintPredict();
        openArea();
      })]));
    }

    var opened = false;
    function openArea() {
      if (opened) return;
      opened = true;
      var cov = new Coverage(false);
      var m3 = model3D(mol);
      var host = h('div', { class: 'graph-host' });
      var lockBtn = h('button', { type: 'button', class: 'primary', text: 'Lock in this conformation' });
      var g;
      var rot = rotator(mol, function (phi, prev) {
        m3.viewer().setPhi(phi);
        cov.mark(prev == null ? phi : prev, phi);
        paint(phi);
      });
      area.appendChild(h('div', { class: 'grid2' }, [m3.node, rot.node]));
      area.appendChild(panel('Energy vs. dihedral angle', 'fills in as you turn', [host, h('div', { class: 'btnrow' }, [lockBtn])]));
      g = new EnergyGraph(host, { mol: mol });
      m3.start(rot.rotor.phi);
      cov.mark(rot.rotor.phi, rot.rotor.phi);
      function paint(phi) {
        g.curves = [{ mol: mol, visited: done ? null : cov.degrees() }];
        g.marker = phi;
        g.render();
      }
      paint(rot.rotor.phi);
      var lows = lowestAngles(mol);
      if (done) { rot.set(lows[0]); m3.viewer().setPhi(lows[0]); paint(lows[0]); lockBtn.hidden = true; reveal(); }

      lockBtn.addEventListener('click', function () {
        var phi = rot.rotor.phi;
        var hit = lows.filter(function (a) { return STRAIN.gap(phi, a) <= 8; })[0];
        if (hit != null) {
          rot.set(hit);
          m3.viewer().setPhi(hit);
          done = true;
          paint(hit);
          lockBtn.hidden = true;
          complete('Locked in: ' + fmt(GEOM.energyAt(mol, hit)) + ' kJ/mol — the lowest conformation.');
          reveal();
          return;
        }
        var named = conformationName(mol, phi);
        var stag = named && phi % 120 !== 0;
        if (!named || !stag) {
          say('Not this one. Eclipsed conformations are never the lowest — turn to a staggered conformation first.', 'bad');
        } else {
          say('This is staggered, but not the lowest: ' + partsText(mol, phi) + ' Is there a staggered ' +
              'conformation with less strain?', 'bad');
        }
      });
    }

    function reveal() {
      var chosen = state.pr[s.id];
      var best = bestStaggered(mol);
      var line = (chosen === p.answer ? 'Your prediction was right. ' :
                  chosen != null ? 'You predicted “' + p.choices[chosen] + '”. ' : '') + p.reveal;
      var box = h('div', { class: 'reveal' }, [
        h('p', { text: line }),
        h('p', { class: 'parts', text: 'Lowest: ' + partsText(mol, best.phi) })
      ]);
      area.appendChild(box);
    }

    paintPredict();
    if (state.pr[s.id] != null) openArea();
  };

  /* ---- swap: the same frame with different groups on the front carbon */

  var SWAP_NOTES = {
    Cl: 'Same as Br. Cl is a smaller atom than Br, but its bond is shorter too (1.78 Å), so it crowds a CH₃ about as little.',
    I: 'Even iodine, the biggest atom here, costs only about 1 kJ/mol gauche to a CH₃: the C–I bond is 2.14 Å long.',
    CH3: 'Now both groups are CH₃, so either one anti gives 3.8 kJ/mol. Putting the H anti would leave the back CH₃ ' +
         'gauche to both: 7.6.',
    iPr: 'Branching makes a group bulky. CH(CH₃)₂ gauche to CH₃ costs 4.6 kJ/mol — more than CH₃’s 3.8 — so the ' +
         'isopropyl group takes the anti position. A close call: 0.8 kJ/mol.',
    tBu: 'C(CH₃)₃ is huge: 11.4 kJ/mol gauche to a CH₃. It goes anti, no contest.'
  };

  function swapMol(x) { return molecule({ Br: 'bromobutane', Cl: 'chlorobutane', I: 'iodobutane', CH3: 'methylbutane',
    iPr: 'dimethylpentane', tBu: 'trimethylpentane' }[x]); }

  /* The front group anti to the back chain CH₃ at the best conformation. */
  function antiGroup(mol) {
    var best = bestStaggered(mol);
    var nm = GEOM.newmanAt(mol, best.phi);
    var backCH3 = nm.back.filter(function (q) { return q.role === 'anchor'; })[0];
    var opp = GEOM.wrap(backCH3.a + 180);
    return nm.front.filter(function (q) { return q.a === opp; })[0].g;
  }

  RENDER.swap = function (s) {
    var order = MOLECULES.SWAP_ORDER.filter(function (x) { return x !== 'Br'; });
    var got = state.pr.swap || {};
    var done = !!state.done[s.id];
    var ref = swapMol('Br');
    var yMax = EnergyGraph.niceMax(EnergyGraph.maxEnergy(order.map(swapMol).concat([ref])));
    var cur = 0;
    while (cur < order.length - 1 && got[order[cur]] != null) cur++;

    var chips = h('div', { class: 'chips' });
    var card = h('div', { class: 'swap-card' });
    var nmHost = h('div', { class: 'nm-wrap' });
    var host = h('div', { class: 'graph-host' });
    var table = h('table', { class: 'ref-table swap-table' });
    el.stage.appendChild(h('div', { class: 'grid2 swap-top' }, [
      panel('Group on the front carbon', null, [chips, card]),
      panel('Lowest-energy conformation', null, [nmHost])
    ]));
    el.stage.appendChild(panel('Energy vs. dihedral angle', null, [host]));
    el.stage.appendChild(panel('What you found', null, [table]));
    var g = new EnergyGraph(host, { mol: ref, yMax: yMax });

    function options(x) {
      return x === 'CH3' ? ['A CH₃ (either one — they are identical)', 'H'] : [label(x), 'CH₃', 'H'];
    }
    function answerIndex(x) {
      var a = antiGroup(swapMol(x));
      if (x === 'CH3') return a === 'H' ? 1 : 0;
      return a === x ? 0 : a === 'CH3' ? 1 : 2;
    }

    function paint() {
      var x = order[cur], mol = swapMol(x);
      chips.innerHTML = '';
      order.forEach(function (k, i) {
        var b = h('button', { type: 'button', class: 'chip' + (i === cur ? ' current' : '') + (got[k] != null ? ' done' : ''),
          disabled: got[k] == null && i !== cur, text: label(k) });
        b.addEventListener('click', function () { cur = i; paint(); });
        chips.appendChild(b);
      });
      card.innerHTML = '';
      card.appendChild(h('p', { class: 'swap-name', text: mol.name + ' — looking down ' + mol.carbons[0] + '–' + mol.carbons[1] }));
      card.appendChild(h('p', { class: 'swap-frame', text: mol.carbons[0] + ' carries CH₃, H and ' + label(x) +
        '; ' + mol.carbons[1] + ' carries CH₃ and two H.' }));
      var q = 'In the lowest-energy conformation, which group on ' + mol.carbons[0] + ' is anti to the CH₃ on ' +
              mol.carbons[1] + '?';
      card.appendChild(predictCard({ q: q, choices: options(x) }, got[x], function (i) {
        got[x] = i;
        state.pr.swap = got;
        persist();
        paint();
      }));
      var answered = got[x] != null;
      nmHost.innerHTML = '';
      if (answered) {
        var best = bestStaggered(mol);
        nmHost.appendChild(Draw.newman(GEOM.newmanAt(mol, best.phi), { cls: 'big' }));
        nmHost.appendChild(h('p', { class: 'parts', text: partsText(mol, best.phi) }));
        var right = got[x] === answerIndex(x);
        card.appendChild(h('div', { class: 'reveal' }, [
          h('p', { text: (right ? 'Right. ' : 'Not quite. ') + SWAP_NOTES[x] })
        ]));
        if (cur < order.length - 1) {
          var nb = h('button', { type: 'button', class: 'primary', text: 'Next group →' });
          nb.addEventListener('click', function () { cur++; paint(); });
          card.appendChild(h('div', { class: 'btnrow' }, [nb]));
        }
        g.curves = [{ mol: ref, cls: 'ref', label: '2-bromobutane', labelAt: 200 },
                    { mol: mol, cls: 'main', label: mol.name, labelAt: 20 }];
      } else {
        nmHost.appendChild(h('p', { class: 'muted', text: 'Make your prediction to see it.' }));
        g.curves = [{ mol: ref, cls: 'ref', label: '2-bromobutane', labelAt: 200 }];
      }
      g.mol = mol;
      g.render();
      paintTable();
      var all = order.every(function (k) { return got[k] != null; });
      if (all && !done) {
        done = true;
        complete('Ranked by gauche cost with CH₃: halogens about 1, CH₃ 3.8, CH(CH₃)₂ 4.6, C(CH₃)₃ 11.4 kJ/mol. ' +
                 'Size of the ATOM is not what matters — crowding is.');
      }
    }

    function paintTable() {
      table.innerHTML = '';
      table.appendChild(h('tr', null, ['Group X', 'X/CH₃ gauche (kJ/mol)', 'Anti to the back CH₃', 'Best energy (kJ/mol)']
        .map(function (t) { return h('th', { text: t }); })));
      ['Br'].concat(order).forEach(function (x) {
        if (x !== 'Br' && got[x] == null) return;
        var mol = swapMol(x);
        var a = antiGroup(mol);
        table.appendChild(h('tr', null, [
          h('td', { text: label(x) }),
          h('td', { class: 'num', text: fmt(STRAIN.pair(x, 'CH3').gau) }),
          h('td', { text: x === 'CH3' ? 'a CH₃' : label(a) }),
          h('td', { class: 'num', text: fmt(bestStaggered(mol).e) })
        ]));
      });
    }

    viewHooks.push(paint);
    paint();
    if (done) say('All groups compared.', 'good');
  };

  /* ---- pair: Molecules A and B, rotated to put the halogens anti */

  RENDER.pair = function (s) {
    var done = !!state.done[s.id];
    var pr = state.pr.pair || {};
    var X = pr.x || 'Br';
    var reached = { A: done, B: done };
    var top = h('div');
    var area = h('div');
    el.stage.appendChild(top);
    el.stage.appendChild(area);
    var choices = ['Anti', 'Gauche'];

    function paintPredict() {
      top.innerHTML = '';
      var cols = ['A', 'B'].map(function (k) {
        var mol = molecule('pair' + k + '_Br');
        return panel('Molecule ' + k, null, [
          h('div', { class: 'zz-wrap small' }, [Draw.zigzag(mol)]),
          predictCard({ q: 'When the two Br atoms are anti, the two CH₃ groups will be…', choices: choices },
            pr[k], function (i) {
              pr[k] = i;
              state.pr.pair = pr;
              persist();
              paintPredict();
              if (pr.A != null && pr.B != null) openArea();
            })
        ]);
      });
      top.appendChild(h('div', { class: 'grid2' }, cols));
    }

    var opened = false, rots = {}, g, status, haloBox;
    function mols() { return { A: molecule('pairA_' + X), B: molecule('pairB_' + X) }; }

    function openArea() {
      if (opened) return;
      opened = true;
      var m = mols();
      var host = h('div', { class: 'graph-host' });
      status = h('p', { class: 'status' });
      ['A', 'B'].forEach(function (k) {
        rots[k] = rotator(m[k], function (phi) {
          if (STRAIN.gap(phi, 180) < 3 && !reached[k]) { reached[k] = true; }
          paintGraph();
        }, { title: 'Molecule ' + k, parts: true });
      });
      area.appendChild(h('div', { class: 'grid2' }, [rots.A.node, rots.B.node]));
      var legend = h('p', { class: 'legend-row' }, [
        h('span', { class: 'key main', 'aria-hidden': 'true' }), ' Molecule A   ',
        h('span', { class: 'key alt', 'aria-hidden': 'true' }), ' Molecule B'
      ]);
      area.appendChild(panel('Energy vs. dihedral angle', null, [host, legend, status]));
      haloBox = h('div');
      area.appendChild(haloBox);
      var yMax = EnergyGraph.niceMax(EnergyGraph.maxEnergy(['Cl', 'Br', 'I'].reduce(function (acc, x) {
        return acc.concat([molecule('pairA_' + x), molecule('pairB_' + x)]);
      }, [])));
      g = new EnergyGraph(host, { mol: m.A, yMax: yMax });
      if (done) { rots.A.set(180); rots.B.set(180); }
      paintGraph();
      paintHalo();
    }

    function paintGraph() {
      var m = mols();
      g.mol = m.A;
      g.curves = [{ mol: m.A, cls: 'main' }, { mol: m.B, cls: 'alt' }];
      g.marker = null;
      g.render();
      ['A', 'B'].forEach(function (k) {
        var phi = rots[k].rotor.phi;
        var x = g.X(phi), y = g.Y(GEOM.energyAt(m[k], phi));
        Draw.el('circle', { cx: x, cy: y, r: 7, class: 'g-dot ' + (k === 'A' ? 'main' : 'alt') }, g.svg);
        Draw.el('text', { x: x + 10, y: y + 4, class: 'g-letter small' }, g.svg, k);
      });
      if (reached.A && reached.B) {
        status.textContent = '';
        if (!state.done[s.id] && pr.halo != null && pr.saw) complete('Done. Same atoms, same bonds — but the wedges and dashes decide which groups can be anti together.');
        paintReveal();
      } else {
        status.textContent = 'Turn each molecule until its two ' + X + ' atoms are anti (180°). ' +
          (reached.A ? 'A ✓ ' : '') + (reached.B ? 'B ✓' : '');
      }
    }

    var revealed = false;
    function paintReveal() {
      if (revealed) return;
      revealed = true;
      var lines = [];
      ['A', 'B'].forEach(function (k) {
        var right = k === 'A' ? 0 : 1;
        lines.push('Molecule ' + k + ': with the Br atoms anti, the CH₃ groups are ' + choices[right].toLowerCase() +
          (pr[k] === right ? ' — as you predicted.' : ' — you predicted ' + choices[pr[k]].toLowerCase() + '.'));
      });
      var a = bestStaggered(molecule('pairA_Br')), b = bestStaggered(molecule('pairB_Br'));
      lines.push('So A’s best conformation (' + fmt(a.e) + ' kJ/mol) puts both pairs anti, while B can never manage ' +
        'that: its best is ' + fmt(b.e) + ' kJ/mol. No rotation turns A into B — they are different molecules, and ' +
        'you will learn their names in the next unit.');
      area.insertBefore(h('div', { class: 'reveal' }, lines.map(function (t) { return h('p', { text: t }); })), haloBox);
      paintHalo();
    }

    function paintHalo() {
      haloBox.innerHTML = '';
      if (!revealed) return;
      var card = panel('Change the halogen', null, []);
      card.appendChild(predictCard({
        q: 'Replace both Br atoms with I. The conformations where the two halogens are GAUCHE will…',
        choices: ['Go up in energy', 'Go down in energy', 'Stay the same']
      }, pr.halo, function (i) {
        pr.halo = i;
        state.pr.pair = pr;
        persist();
        paintHalo();
      }));
      if (pr.halo != null) {
        var row = h('div', { class: 'chips', role: 'group', 'aria-label': 'Halogen' }, [h('span', { class: 'chips-label', text: 'Halogen:' })]);
        ['Cl', 'Br', 'I'].forEach(function (x) {
          var b = h('button', { type: 'button', class: 'chip' + (x === X ? ' current' : ''), text: x });
          b.addEventListener('click', function () {
            X = x;
            pr.x = x;
            if (x !== 'Br') pr.saw = 1;
            state.pr.pair = pr;
            persist();
            var m = mols();
            rots.A.setMolecule(m.A);
            rots.B.setMolecule(m.B);
            paintHalo();
            paintGraph();
          });
          row.appendChild(b);
        });
        card.appendChild(row);
        var gx = STRAIN.pair(X, X).gau;
        card.appendChild(h('p', { class: 'reveal-inline', text: (pr.halo === 0 ? 'Right: they go up. ' : 'They go up. ') +
          'Halogen/halogen gauche costs Cl 5, Br 7, I 9 kJ/mol: both atoms are big and both carry a partial ' +
          'negative charge. Switch between Cl, Br and I and watch both curves at 60° and 300°, where the ' +
          'halogens are gauche (' + X + '/' + X + ' gauche: ' + fmt(gx) + ' kJ/mol). At 180° nothing changes — ' +
          'with the halogens anti, they never touch.' }));
        if (!pr.saw) card.appendChild(h('p', { class: 'muted', text: 'Try Cl or I to finish this step.' }));
      }
      haloBox.appendChild(card);
      if (reached.A && reached.B && pr.halo != null && pr.saw && !state.done[s.id]) {
        done = true;
        complete('Done. Same atoms, same bonds — but the wedges and dashes decide which groups can be anti together.');
      }
    }

    paintPredict();
    if (pr.A != null && pr.B != null) openArea();
    if (done) say('Done. Same atoms, same bonds — but the wedges and dashes decide which groups can be anti together.', 'good');
  };

  /* ---- results */

  RENDER.results = function () {
    if (!state.fin) {
      state.fin = 1;
      state.done.results = 1;
      persist();
      if (!preview) { reportScore(); SCORM.markComplete(); }
    }
    var right = correctCount();
    var pct = Math.round(100 * right / GRADED);
    var rows = Object.keys(QUIZZES).map(function (k) {
      var ids = state.draws[k];
      var r = ids.filter(function (id) { return state.ans[id]; }).length;
      return h('tr', null, [h('td', { text: QUIZZES[k].title }), h('td', { class: 'num', text: r + ' / ' + ids.length })]);
    });
    var box = panel('Your score', null, [
      h('p', { class: 'big-score', text: right + ' / ' + GRADED + '  (' + pct + '%)' }),
      h('table', { class: 'ref-table' }, rows),
      h('p', { class: 'muted', text: SCORM.isConnected()
        ? 'Your score has been sent to the gradebook and the activity is marked complete.'
        : 'Standalone mode — nothing was sent to a gradebook.' })
    ]);
    var ideas = panel('Big ideas', null, [h('ul', { class: 'keylist' }, [
      'Staggered conformations are always lower than eclipsed ones: eclipsing costs torsional strain.',
      'Among staggered conformations, the one with the fewest and smallest gauche interactions wins (steric strain).',
      'Add up the table: every eclipsed or gauche pair contributes its cost.',
      'Big atoms on long bonds (Cl, Br, I) crowd a neighbour less than a CH₃ does; branched groups crowd it more.',
      'Wedges and dashes decide which groups can be anti together — and rotation can never change a wedge into a dash.'
    ].map(function (t) { return h('li', { text: t }); }))]);
    el.stage.appendChild(h('div', { class: 'grid2' }, [box, ideas]));
    if (!SCORM.isConnected() && !preview) {
      var again = h('button', { type: 'button', class: 'ghostbtn', text: 'Start over (clears saved progress)' });
      again.addEventListener('click', function () {
        SCORM.clearLocal();
        state = newState();
        persist();
        goTo(0);
      });
      el.stage.appendChild(h('div', { class: 'btnrow' }, [again]));
    }
    say('Activity complete.', 'good');
  };

  /* ---- explore (teacher demo): ?explore or ?explore=butane */

  function explore(id) {
    var ids = Object.keys(MOLECULES).filter(function (k) { return MOLECULES[k].front; });
    var mol = molecule(ids.indexOf(id) >= 0 ? id : 'butane');
    el.parts.hidden = true;
    el.next.hidden = true;
    el.back.hidden = true;
    el.score.hidden = true;
    el.stepTitle.textContent = 'Explore';
    el.counter.textContent = 'Teacher demo — nothing is saved';
    el.instructions.textContent = 'Pick any molecule and turn it. Nothing here is saved or graded.';
    var sel = h('select', { class: 'select', 'aria-label': 'Molecule' }, ids.map(function (k) {
      var m = MOLECULES[k];
      return h('option', { value: k, selected: k === mol.id, text: (m.tag ? m.tag + ' — ' : '') + m.name });
    }));
    var m3 = model3D(mol);
    var host = h('div', { class: 'graph-host' });
    var g;
    var rot = rotator(mol, function (phi) { m3.viewer().setPhi(phi); g.marker = phi; g.render(); });
    el.stage.appendChild(h('div', { class: 'btnrow' }, [sel]));
    el.stage.appendChild(h('div', { class: 'grid2' }, [m3.node, rot.node]));
    el.stage.appendChild(panel('Energy vs. dihedral angle', null, [host]));
    g = new EnergyGraph(host, { mol: mol });
    g.curves = [{ mol: mol }];
    g.marker = rot.rotor.phi;
    g.render();
    m3.start(rot.rotor.phi);
    sel.addEventListener('change', function () {
      mol = molecule(sel.value);
      host.innerHTML = '';
      g = new EnergyGraph(host, { mol: mol });
      g.curves = [{ mol: mol }];
      rot.setMolecule(mol);
      rot.set(GEOM.phi0(mol));
      m3.setMolecule(mol, GEOM.phi0(mol));
      g.marker = rot.rotor.phi;
      g.render();
    });
  }

  /* --------------------------------------------------------- references */

  function buildReference() {
    var t = h('table', { class: 'ref-table' });
    t.appendChild(h('tr', null, ['Interaction', 'Eclipsed (kJ/mol)', 'Gauche (kJ/mol)', ''].map(function (x) {
      return h('th', { text: x });
    })));
    STRAIN.ROWS.forEach(function (r, i) {
      if (i === 3) {
        t.appendChild(h('tr', { class: 'ref-sub' }, [h('td', { colspan: 4, text: 'Halogens and branched groups (parts 3 and 4)' })]));
      }
      var est = r[4] !== 'klein' || (r[5] !== 'klein' && r[5] !== 'zero');
      t.appendChild(h('tr', null, [
        h('td', { text: STRAIN.NAMES[r[0]] + ' / ' + STRAIN.NAMES[r[1]] }),
        h('td', { class: 'num', text: fmt(r[2]) + (r[4] === 'klein' ? '' : ' *') }),
        h('td', { class: 'num', text: r[3] ? fmt(r[3]) + (r[5] === 'klein' ? '' : ' *') : '0' }),
        h('td', { class: 'note', text: est ? '' : 'Klein' })
      ]));
    });
    el.strainBody.appendChild(t);
    el.strainBody.appendChild(h('p', { class: 'ref-foot', text: 'Rows marked Klein are the textbook values. Values ' +
      'marked * are not in the textbook: they are estimates built from measured data. Gauche interactions with H ' +
      'are counted as 0. Anti (180°) and 120° cost nothing.' }));

    var dl = h('dl', { class: 'vocab' });
    [
      ['Conformation', 'One particular shape of a molecule, reached by turning about single bonds. Two conformations of one molecule are not different compounds.'],
      ['Newman projection', 'The view straight down one C–C bond. The front carbon is the point where three bonds meet; the back carbon is the circle.'],
      ['Dihedral angle', 'The angle between a bond on the front carbon and a bond on the back carbon, seen in a Newman projection.'],
      ['Staggered', 'Every back bond sits exactly between two front bonds (dihedral angles 60°, 180°, 300°).'],
      ['Eclipsed', 'Every back bond sits directly behind a front bond (dihedral angles 0°, 120°, 240°).'],
      ['Anti', 'Two groups 180° apart in a staggered conformation.'],
      ['Gauche', 'Two groups 60° apart in a staggered conformation.'],
      ['Totally eclipsed', 'The eclipsed conformation in which the two largest groups eclipse each other — for butane, CH₃ behind CH₃. The highest point on the curve.'],
      ['Torsional strain', 'The extra energy of an eclipsed conformation, from bonds lining up one behind another. Ethane’s 12 kJ/mol is all torsional strain.'],
      ['Steric strain', 'The extra energy when two groups are forced too close together, so their electron clouds repel.'],
      ['Gauche interaction', 'The steric strain between two groups that are gauche: 3.8 kJ/mol for CH₃/CH₃.'],
      ['Energy barrier', 'The energy needed to turn past the highest eclipsed conformation.']
    ].forEach(function (p) {
      dl.appendChild(h('dt', { text: p[0] }));
      dl.appendChild(h('dd', { text: p[1] }));
    });
    el.vocabBody.appendChild(dl);
  }

  /* ------------------------------------------------------------------ boot */

  function showIntro() {
    var box = h('div', { class: 'screen-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'introTitle' }, [
      h('h2', { id: 'introTitle', text: 'Newman projections and conformational analysis' }),
      h('p', { text: 'You will build Newman projections from wedge-and-dash drawings, turn molecules in 3D, and watch ' +
                     'how their energy changes as they rotate.' }),
      h('ul', { class: 'screen-list' }, [
        h('li', { text: 'Part 1 — Ethane: staggered and eclipsed, torsional strain.' }),
        h('li', { text: 'Part 2 — Butane: anti, gauche, totally eclipsed, steric strain.' }),
        h('li', { text: 'Part 3 — Substituted butanes: halogens, branched groups, the best staggered conformation.' }),
        h('li', { text: 'Part 4 — Two molecules that differ only in a wedge and a dash.' })
      ]),
      h('p', { text: 'Predictions and builds are never graded — try things. The four checkpoints are graded: your ' +
                     'first answer to each question counts. About 30–40 minutes. Your progress is saved if you leave.' }),
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
    el.lms.textContent = connected ? 'Connected to the LMS' : 'Standalone — no LMS detected';
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

    Draw.setFlip(state.flip);
    el.next.addEventListener('click', function () { goTo(state.step + 1); });
    el.back.addEventListener('click', function () { goTo(state.step - 1); });

    if (preview) { goTo(state.step); return; }
    paintParts();
    showIntro();
  }

  return { start: start, STEPS: STEPS, judgeBuild: judgeBuild, targetSlots: targetSlots, GRADED: GRADED };
})();

document.addEventListener('DOMContentLoaded', App.start);

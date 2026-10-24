/* app.js: the steps, their order, saving, scoring.
 *
 * Part 1  Chirality: mirror images, chirality centres
 * Part 2  Priorities: atomic number, the first point of difference
 * Part 3  R and S: if 4 is not on the dash, rotate the molecule
 * Part 4  Two centres: enantiomers, diastereomers, meso compounds, rings
 *
 * Only the four checkpoints are graded (first answer counts). Builds,
 * rankings, readings and predictions must be finished to move on but are
 * never scored: a wrong one gets an explanation and another try, and a
 * prediction is just compared with what really happens.
 *
 * R and S are read with 4 away: on the dash or down the C-to-4 bond. Every drawing that has to
 * be read is turned there first, by rotating the molecule; nothing in the
 * activity moves one group by itself, because that draws a different
 * molecule. tools/validate.js holds the activity to that.
 */

var App = (function () {
  'use strict';

  var G = GEOM;

  /* Bump whenever the step list, a quiz pool or a molecule changes: a save
     from an older build is then discarded and the student starts fresh. */
  var SCHEMA = 2;

  var PARTS = [
    { n: 1, name: 'Chirality' },
    { n: 2, name: 'Priorities' },
    { n: 3, name: 'R and S' },
    { n: 4, name: 'Two centres' },
    { n: 5, name: 'Results' }
  ];

  var STEPS = [
    { id: 'mirror', part: 1, kind: 'mirror', mols: ['chbrclf', 'ch2brcl'],
      title: 'Mirror, mirror',
      text: 'Your two hands are mirror images: alike in every way, yet you cannot lay one exactly on top of the other. ' +
            'Molecules can be like that too. For each molecule, predict, then try to make its mirror image fit onto it.' },
    { id: 'drawmirror', part: 1, kind: 'drawmirror', mol: 'chbrclf',
      title: 'Draw the mirror image',
      text: 'Draw what the mirror shows. First the mirror stands beside the molecule; then it lies flat behind the ' +
            'page. Put each atom in its place, then press Check.' },
    { id: 'centres', part: 1, kind: 'centres', mols: ['butanol_line', 'methylpentane', 'dimethylpentane', 'bcb_line'],
      title: 'Find the chirality centres',
      text: 'A carbon carrying four different groups is a chirality centre (also called a stereocentre). In a ' +
            'bond-line drawing every corner and every end is a carbon, with enough hidden H atoms to make four bonds. ' +
            'Click every chirality centre in each molecule.' },
    { id: 'quiz-A', part: 1, kind: 'quiz', quiz: 'A', title: 'Checkpoint 1', text: '' },

    { id: 'rank', part: 2, kind: 'rank', mols: ['chbrclf', 'bcfe'],
      title: 'Highest atomic number first',
      text: 'To name a chirality centre, first rank its four groups from 1 (highest priority) to 4 (lowest). Look ' +
            'at the atom attached directly to the centre: the higher its atomic number, the higher the priority. The ' +
            'atomic numbers are in the table at the bottom of the page. Predict first.' },
    { id: 'ties', part: 2, kind: 'rank', mols: ['butanol', 'tmb', 'glyceraldehyde'],
      title: 'Ties: the first point of difference',
      text: 'When two groups are attached through the same kind of atom, list the atoms on that atom, highest first, ' +
            'and compare the two lists one atom at a time. The first difference decides; the totals never do. A ' +
            'double bond counts twice.' },
    { id: 'quiz-B', part: 2, kind: 'quiz', quiz: 'B', title: 'Checkpoint 2', text: '' },

    { id: 'wheel', part: 3, kind: 'wheel', mols: ['bromobutane', 'butanol_S'],
      title: 'Read the steering wheel',
      text: 'Look at the centre with 4 pointing away from you, on the dash. Then follow 1 → 2 → 3: clockwise is R and ' +
            'counterclockwise is S. Click 1, then 2, then 3, and decide.' },
    { id: 'rotate', part: 3, kind: 'rotate', mols: ['alanine_w', 'bcfe_plane'],
      title: 'If 4 is not on the dash, rotate',
      text: 'Here 4 is not on the dash, so rotate the molecule until it is: drag the 3D model, use the arrow keys, or ' +
            'use the turn buttons. Or choose Steering-wheel view: look from the chirality carbon down its bond toward priority 4. ' +
            'Priority 4 goes away from your eye and hides behind the carbon. Read 1 → 2 → 3 in that view.' },
    { id: 'hidden', part: 3, kind: 'hidden', mol: 'butanol_hidden',
      title: 'The hidden H',
      text: 'Bond-line drawings leave out the H on a chirality centre. Find where it points, rotate the molecule until ' +
            'it is on the dash, redraw it that way, and name the centre.' },
    { id: 'enant', part: 3, kind: 'enant', mol: 'butanol_R',
      title: 'Mirror images have opposite labels',
      text: 'Enantiomers are mirror images that cannot be laid on each other. What does a mirror do to R and S? ' +
            'Predict first.' },
    { id: 'quiz-C', part: 3, kind: 'quiz', quiz: 'C', title: 'Checkpoint 3', text: '' },

    { id: 'four', part: 4, kind: 'four', mols: ['bcb_wd', 'bcb_dw', 'bcb_ww', 'bcb_dd'],
      title: 'Two centres, four stereoisomers',
      text: '2-Bromo-3-chlorobutane has two chirality centres, C2 and C3, and each can be R or S. Predict how many ' +
            'stereoisomers it has, then name both centres of one of them.' },
    { id: 'mesocoach', part: 4, kind: 'mesocoach', title: 'Two centres: meso or chiral?',
      text: 'Both compounds have two chirality centres. Follow the same mirror test on each: does the whole molecule fit its reflection?' },
    { id: 'meso', part: 4, kind: 'meso', mols: ['dbb_A', 'dbb_B'],
      title: 'Meso: Molecules A and B again',
      text: '2,3-Dibromobutane has two chirality centres too. You met two of its stereoisomers in the Newman activity: ' +
            'Molecule A and Molecule B. Predict first.' },
    { id: 'rings', part: 4, kind: 'rings', mols: ['cis13', 'trans13', 'cis14', 'trans14'],
      title: 'Rings',
      text: 'Rings follow the same rules. Sort these dimethylcyclohexanes from the chairs activity: meso, chiral, or ' +
            'no chirality centres at all.' },
    { id: 'quiz-D', part: 4, kind: 'quiz', quiz: 'D', title: 'Checkpoint 4', text: '' },

    { id: 'results', part: 5, kind: 'results', title: 'Results', text: '' }
  ];

  /* Every prediction the steps ask, with its key: the choice the model says
     is right. Predictions are never graded, but tools/validate.js checks each
     key against the model so the reveal never contradicts the picture. */
  var PREDICT = {
    fit1: { q: 'Can the mirror image of CHBrClF be turned so that it lies exactly on the original, every atom on its partner?',
      choices: ['No, never', 'Yes, if you turn it the right way'], answer: 0 },
    fit2: { q: 'CH₂BrCl has two H atoms where CHBrClF had an H and an F. Can its mirror image be turned to fit exactly?',
      choices: ['Yes', 'No'], answer: 0 },
    top: { q: 'Which atom of CHBrClF gets priority 1?',
      choices: ['Br: it has the highest atomic number', 'F: it is the most electronegative', 'H: it is the smallest'],
      answer: 0 },
    bigger: { q: 'On this chirality centre, which group ranks higher: CH₂OH or C(CH₃)₃?',
      choices: ['CH₂OH', 'C(CH₃)₃, the bigger group', 'They tie'], answer: 0 },
    asis: { q: '4 (the H) is on the wedge, pointing toward you. Can you read R or S from this drawing as it is?',
      choices: ['No: first rotate the molecule until 4 is on the dash', 'Yes: read 1 → 2 → 3 as it is drawn'], answer: 0 },
    hiddenH: { q: 'The OH on C2 is on a dash. Where does the H on C2, the one the drawing leaves out, point?',
      choices: ['Toward you, on a wedge', 'Away from you, on a dash', 'In the plane of the page'], answer: 0 },
    mirrorLabel: { q: 'This is (R)-2-butanol. What is the configuration of its mirror image?',
      choices: ['S', 'R', 'It depends on how you turn it'], answer: 0, compact: true },
    count4: { q: 'How many stereoisomers does 2-bromo-3-chlorobutane have?',
      choices: ['4', '2', '3', '8'], answer: 0, compact: true },
    count3: { q: 'How many stereoisomers does 2,3-dibromobutane have?',
      choices: ['3', '4', '2', '6'], answer: 0, compact: true },
    cis13: { q: 'cis-1,3-Dimethylcyclohexane has two chirality centres, C1 and C3. Is it chiral?',
      choices: ['No: it has a mirror plane, so it is achiral', 'Yes: it has chirality centres, so it must be chiral'], answer: 0 }
  };

  var QZ = QUIZZES;

  var GRADED = Object.keys(QZ).reduce(function (s, k) { return s + QZ[k].draw; }, 0);

  var el = {};
  var state = null;
  var ctl = null;           /* the current step's controller */
  var preview = false;      /* ?step= teacher preview: nothing is saved or reported */

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

  /* What a group is called in a sentence. */
  function groupName(m, c, j) {
    var a = m.atoms[j];
    if (a.group && a.head) return GROUPS[a.group].name;
    return MOLECULES.condensed(m, c, j);
  }

  function centreName(m, c) { return m.kind === 'centre' ? 'the chirality centre' : 'C' + m.atoms[c].num; }

  /* Configurations of every centre, as (2R,3S) or R. */
  function configText(m) {
    var cs = CIP.centres(m);
    if (!cs.length) return '';
    if (m.kind === 'centre') return CIP.label(m, cs[0]);
    return '(' + cs.map(function (c) { return m.atoms[c].num + CIP.label(m, c); }).join(',') + ')';
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

  /* Back and Next appear above the step and below it: set both copies. */
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

  /* Each step keeps its own progress here (predictions, molecules done). */
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
        (s.quiz !== 'A' ? ' The atomic numbers are open beside the questions.' : '')
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

  /* ------------------------------------------------------- shared panels */

  function panel(title, hint, kids, cls) {
    return h('section', { class: 'panel ' + (cls || '') }, [
      h('div', { class: 'panel-head' }, [h('h3', { text: title }), hint ? h('span', { class: 'hint', text: hint }) : null])
    ].concat(kids || []));
  }

  /* Bring a newly opened work area on screen, scrolling no further than it
     takes, so the prediction above it stays in view as far as it can. */
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
    return h('div', { class: 'reveal' }, lines.filter(Boolean).map(function (t) { return h('p', { text: t }); }));
  }

  /* "Right." or "You predicted X." in front of a reveal. */
  function verdict(p, chosen) {
    if (chosen == null) return '';
    return chosen === p.answer ? 'Your prediction was right. ' : 'You predicted “' + p.choices[chosen] + '”. ';
  }

  /* A row of chips, one per molecule or part of a step. */
  function chipRow(label, items, cur, isDone, isOpen, onPick) {
    return h('div', { class: 'chips' }, [label ? h('span', { class: 'chips-label', text: label }) : null].concat(items.map(function (it, k) {
      return h('button', { type: 'button', class: 'chip' + (k === cur ? ' current' : '') + (isDone(k) ? ' done' : ''),
        disabled: !isOpen(k), 'aria-pressed': k === cur ? 'true' : 'false',
        onclick: function () { onPick(k); } }, [(isDone(k) ? '✓ ' : '') + it]);
    })));
  }

  function molWrap(node, big) { return h('div', { class: 'mol-wrap' + (big ? ' big' : '') }, [node]); }

  /* A shake on a target that was the wrong one. */
  function shake(host, key) {
    var n = host.querySelector('.drop[data-drop="' + key + '"]');
    if (!n) return;
    n.classList.remove('shake');
    void n.getBoundingClientRect();
    n.classList.add('shake');
  }

  /* How far the 3D model must reach, so it is drawn at one size. */
  function radiusOf(models) {
    var r = 1.8;
    [].concat(models).forEach(function (m) {
      m.atoms.forEach(function (a) { r = Math.max(r, G.dist(a.p, m.pivot) + ELEMENTS[a.el].ball + 0.15); });
    });
    return r;
  }

  /* The turn that looks at centre c of model m (already turned) with 4
     straight behind the carbon and 1 at the top: the steering wheel. */
  function wheelTurn(m, c) {
    var o = CIP.rank(m, c).order, p = m.atoms[c].p;
    var z = G.mul(G.unit(G.sub(m.atoms[o[3]].p, p)), -1);
    var v1 = G.sub(m.atoms[o[0]].p, p);
    var y = G.unit(G.sub(v1, G.mul(z, G.dot(v1, z))));
    return [G.cross(y, z), y, z];
  }

  /* ---------------------------------------------- rotate and read a centre */

  /* A molecule to rotate and read: the 3D model and the drawing of it as it
     now lies, side by side, with the turn buttons and (opts.read) the tools
     to read R or S: click 1, 2, 3, then choose. Reading only opens once 4 is
     on the dash.
       opts.centres    centres a student may pick between (a zigzag)
       opts.turns      false to hide the turn buttons
       opts.read       true to ask for R or S
       opts.answers    { centreIndex: 'R' } already read correctly
       opts.onRead(c, label)   a centre read correctly
       opts.onTurn()   the molecule settled into a new position
       opts.drawOpts   extra options for the drawing (showH) */
  function rotator(m, opts) {
    opts = opts || {};
    var R = opts.R || G.ident();
    var centres = opts.centres || CIP.centres(m).slice(0, 1);
    var centre = centres[0];
    var answers = opts.answers || {};
    var clicks = [], chose = null, wheelOn = false, busy = false;

    function cur() { return STEREO.apply(m, R); }
    function order() { return CIP.rank(m, centre).order; }
    function onDash() { return STEREO.fourOnDash(cur(), centre); }

    var canvas = h('canvas', { class: 'c3d', tabindex: 0, role: 'img',
      'aria-label': '3D model of ' + m.name + '. Drag it, or use the arrow keys, to rotate it.' });
    var turnbar = h('div', { class: 'turnbar' });
    var wheelBtn = h('button', { type: 'button', class: 'mini', text: 'Steering-wheel view: look down C–4', disabled: false });
    var bondRead = h('div', { class: 'btnrow bond-read' });
    var p3 = panel(opts.title3 || '3D model', 'drag or arrow keys to rotate', [h('div', { class: 'c3d-wrap' }, [canvas]), turnbar,
      h('div', { class: 'btnrow' }, [wheelBtn]), bondRead]);
    var chipsHost = h('div');
    var drawHost = h('div', { class: 'mol-wrap big' });
    var rule = h('p', { class: 'rule' });
    var rsRow = h('div', { class: 'rs-row' });
    var after = h('div');
    var p2 = panel(opts.title2 || 'The drawing', opts.read ? 'click 1, 2, 3' : null, [chipsHost, drawHost, rule, rsRow, after]);
    var node = h('div', { class: 'work' + (opts.third ? ' work-3' : '') }, [p3, p2, opts.third || null]);
    var viewer = null;

    function badges() { return CIP.priorities(m, centre); }

    function start() {
      viewer = new Viewer3D(canvas, { objects: [{ model: m, R: R, badges: badges() }], radius: radiusOf(m),
        onRelease: settle, onTurn: function () { if (wheelOn) { wheelOn = false; wheelBtn.textContent = 'Steering-wheel view: look down C–4'; } } });
      paint();
    }

    function settle() {
      if (!viewer) return;
      var o = viewer.get(0);
      var target = STEREO.nearest(m, o.R);
      busy = true;
      viewer.set(0, { wheel: null });
      viewer.slide(0, [0, 0, 0], 300);
      viewer.animate(0, target, 320, function () { busy = false; land(target); });
    }

    function land(target) {
      var moved = G.gap(target, R) > 1;
      R = target;
      if (moved) { clicks = []; chose = null; }
      paint();
      if (moved && opts.onTurn) opts.onTurn(R);
    }

    function turn(L) {
      if (busy || !viewer) return;
      var target = G.mmul(L, R);
      busy = true;
      wheelOn = false;
      wheelBtn.textContent = 'Steering-wheel view: look down C–4';
      viewer.set(0, { wheel: null });
      viewer.slide(0, [0, 0, 0], 300);
      viewer.animate(0, target, 650, function () { busy = false; land(target); });
    }

    /* the turn buttons: turning over always; a third of a turn about any
       group's bond for one centre; upside down for a zigzag */
    function paintTurns() {
      turnbar.innerHTML = '';
      if (opts.turns === false) return;
      turnbar.appendChild(h('span', { class: 'lbl', text: 'Turn:' }));
      turnbar.appendChild(h('button', { type: 'button', class: 'mini', text: 'Turn it over ⟲',
        title: 'Half a turn about the up–down line of the page: wedges become dashes and left becomes right',
        onclick: function () { turn(STEREO.OVER); } }));
      if (m.kind === 'chain') {
        turnbar.appendChild(h('button', { type: 'button', class: 'mini', text: 'Upside down',
          title: 'Half a turn about the left–right line of the page', onclick: function () { turn(STEREO.UPSIDE); } }));
        return;
      }
      turnbar.appendChild(h('span', { class: 'lbl', text: 'Spin around:' }));
      Object.keys(m.slots).forEach(function (s) {
        var j = m.slots[s];
        var label = GROUPS[m.atoms[j].group].label;
        turnbar.appendChild(h('button', { type: 'button', class: 'mini', text: label,
          'aria-label': 'Spin the other three groups a third of a turn around the bond to ' + GROUPS[m.atoms[j].group].name,
          onclick: function () {
            var c = cur();
            var axis = G.sub(c.atoms[j].p, c.atoms[c.centre].p);
            turn(G.rot(axis, 120));
          } }));
      });
    }

    function paintChips() {
      chipsHost.innerHTML = '';
      if (centres.length < 2) return;
      chipsHost.appendChild(chipRow('Read:', centres.map(function (c) { return 'C' + m.atoms[c].num; }),
        centres.indexOf(centre), function (k) { return !!answers[centres[k]]; }, function () { return true; },
        function (k) {
          centre = centres[k]; clicks = []; chose = null; wheelOn = false;
          wheelBtn.textContent = 'Steering-wheel view: look down C–4';
          if (viewer) { viewer.slide(0, [0, 0, 0], 300); viewer.animate(0, R, 300); }
          if (viewer) viewer.set(0, { badges: badges(), wheel: null });
          paint();
        }));
    }

    function paint() {
      paintChips();
      var c = cur();
      var dash = onDash();
      var ord = order();
      var targets = {};
      if (opts.read) {
        MOLECULES.neighbours(m)[centre].forEach(function (x) {
          var n = ord.indexOf(x.j) + 1;
          targets[x.j] = { key: String(x.j), from: centre,
            cls: (clicks.indexOf(x.j) >= 0 ? 'done' : '') + (dash && !answers[centre] ? '' : ' off'),
            aria: 'Group ' + n + ', ' + groupName(m, centre, x.j) };
        });
      }
      drawHost.innerHTML = '';
      var full = clicks.length === 3 || !!answers[centre];
      drawHost.appendChild(Draw.mol(c, Object.assign({ badges: [centre], targets: targets,
        arrow: full && dash ? centre : null }, opts.drawOpts || {})));
      if (viewer) viewer.set(0, { badges: badges(), wheel: full && (dash || wheelOn) ? { c: centre, order: ord } : null });
      wheelBtn.disabled = false;
      bondRead.innerHTML = '';
      if (wheelOn && opts.read) {
        ord.slice(0, 3).forEach(function (j, i) {
          bondRead.appendChild(h('button', { type: 'button', class: 'mini',
            text: 'Trace ' + (i + 1) + ': ' + groupName(m, centre, j), disabled: !!answers[centre] || clicks.indexOf(j) >= 0,
            onclick: function () { click(String(j)); } }));
        });
      }
      /* the rule, always in view */
      rule.className = 'rule ' + (dash ? 'ok' : 'wait');
      rule.textContent = wheelOn
        ? 'Looking from the carbon toward priority 4: 4 is behind the carbon. Trace 1, 2, 3 here, then read R or S.'
        : dash
        ? (answers[centre] ? centreName(m, centre).charAt(0).toUpperCase() + centreName(m, centre).slice(1) + ' is ' + answers[centre] + '.'
          : '4 is on the dash.' + (opts.read ? (clicks.length < 3 ? ' Click ' + (clicks.length + 1) + (clicks.length ? ' next.' : ' first.')
            : ' Which way does 1 → 2 → 3 run?') : ''))
        : '4 is not on the dash. Rotate the molecule.';
      paintRS(dash || wheelOn);
      paintTurns();
    }

    function paintRS(dash) {
      rsRow.innerHTML = '';
      if (!opts.read) return;
      var ready = dash && clicks.length === 3 && !answers[centre];
      var right = CIP.label(m, centre);
      [['R', 'Clockwise: R'], ['S', 'Counterclockwise: S']].forEach(function (o) {
        var cls = 'ghostbtn' + (answers[centre] === o[0] ? ' right' : chose === o[0] && o[0] !== right ? ' wrong' : '');
        rsRow.appendChild(h('button', { type: 'button', class: cls, disabled: !ready, text: o[1],
          onclick: function () { pick(o[0]); } }));
      });
    }

    function pick(label) {
      var right = CIP.label(m, centre);
      chose = label;
      if (label === right) {
        answers[centre] = label;
        paint();
        if (opts.onRead) opts.onRead(centre, label);
        return;
      }
      var L = drawHost.querySelector('svg')._layout;
      var cw = wheelOn ? CIP.label(m, centre) === 'R' : Draw.drawnClockwise(L, centre, order());
      paint();
      say('Not quite. Follow the arrow from 1 to 2 to 3: it turns ' + (cw ? 'clockwise, the way a clock’s hands move, so this ' +
        'centre is R.' : 'counterclockwise, against a clock’s hands, so this centre is S.'), 'bad');
    }

    function click(key) {
      if (!opts.read || answers[centre]) return;
      var j = +key, ord = order();
      if (!onDash() && !wheelOn) { say('4 is not on the dash yet, so 1 → 2 → 3 tells you nothing. Rotate the molecule first.', 'bad'); return; }
      if (clicks.indexOf(j) >= 0) return;
      var want = ord[clicks.length];
      if (j === want) {
        clicks.push(j);
        say(clicks.length < 3 ? 'Yes, that is ' + clicks.length + '.' : 'That is 1 → 2 → 3. Clockwise or counterclockwise?', 'good');
        paint();
        return;
      }
      var n = ord.indexOf(j) + 1;
      say(n === 4 ? 'Skip 4: it points away from you. Follow 1, 2 and 3 only.'
        : 'That is ' + n + '. Click ' + (clicks.length + 1) + (clicks.length ? ' next.' : ' first.'), 'bad');
      shake(drawHost, key);
    }

    wheelBtn.addEventListener('click', function () {
      if (!viewer || busy) return;
      if (wheelOn) {
        wheelOn = false;
        wheelBtn.textContent = 'Steering-wheel view: look down C–4';
        viewer.slide(0, [0, 0, 0], 400);
        viewer.animate(0, R, 600);
        paint();
        return;
      }
      wheelOn = true;
      wheelBtn.textContent = 'Back to the page view';
      var W = wheelTurn(cur(), centre);
      /* straight down the bond to 4, allowing for the camera's slant */
      var target = G.mmul(G.transpose(viewer.cam), G.mmul(W, R));
      var off = G.mul(G.mvec(target, G.sub(m.atoms[centre].p, m.pivot)), -1);
      viewer.slide(0, off, 600);
      viewer.animate(0, target, 600);
      viewer.set(0, { wheel: { c: centre, order: order() } });
      paint();
    });

    var picker = Picker({ tray: h('div'), stage: drawHost, label: function () { return ''; }, drop: function () {},
                          empty: function (k) { click(k); } });

    return {
      node: node, after: after, start: start,
      R: function () { return R; }, model: cur, centre: function () { return centre; },
      setCentre: function (c) { centre = c; clicks = []; chose = null; if (viewer) viewer.set(0, { badges: badges() }); paint(); },
      repaint: paint,
      destroy: function () { picker.destroy(); }
    };
  }

  /* ------------------------------------------------------- the mirror scene */

  /* A molecule and its mirror image, with a mirror between them. Rotate the
     molecule and the image turns as a reflection does; rotate the image on
     its own to try to make it fit, then slide them together.
       opts.onTry()     the image was turned on its own
       opts.onSlide(n)  the two were slid together; n atoms line up */
  function mirrorScene(m, opts) {
    opts = opts || {};
    var img = STEREO.mirror(m, 'beside');
    var r = radiusOf(m);
    var off = r + 0.4;
    var linked = true, together = false, busy = false;
    var canvas = h('canvas', { class: 'c3d', tabindex: 0, role: 'img',
      'aria-label': m.name + ' on the left and its mirror image on the right, with a mirror between them. Drag either one to rotate it.' });
    var wrap = h('div', { class: 'c3d-wrap wide' }, [canvas, h('span', { class: 'side-tag l', text: 'molecule' }),
      h('span', { class: 'mirror-tag', text: 'mirror' }), h('span', { class: 'side-tag r', text: 'mirror image' })]);
    var meter = h('div', { class: 'meter' }, [h('span')]);
    var meterText = h('span', { class: 'meter-text' });
    var turnbar = h('div', { class: 'turnbar' });
    var slideBtn = h('button', { type: 'button', class: 'primary', text: 'Slide them together' });
    var resetBtn = h('button', { type: 'button', class: 'ghostbtn', text: 'Back to the mirror' });
    var status = h('p', { class: 'status' });
    var viewer = null;
    var tried = 0;

    function models() {
      var o = viewer.objects;
      return { a: STEREO.apply(m, o[0].R), b: STEREO.apply(img, o[1].R) };
    }
    function count() { var x = models(); return STEREO.matchCount(x.b, x.a); }

    function paintMeter() {
      if (!viewer) return;
      var c = count();
      meter.firstChild.style.width = (100 * c.n / c.total) + '%';
      meter.classList.toggle('full', c.n === c.total);
      meterText.textContent = c.n + ' of ' + c.total + ' atoms line up';
    }

    function start() {
      viewer = new Viewer3D(canvas, {
        objects: [{ model: m, offset: [-off, 0, 0] }, { model: img, offset: [off, 0, 0] }],
        radius: r, pane: true, linked: true,
        onTurn: function (i) { if (i === 1) { linked = false; viewer.linked = false; } paintMeter(); },
        onRelease: function (i) { settle(i); }
      });
      viewer.keyTarget = 1;
      paintMeter();
      paintTurns();
      if (opts.needTry) slideBtn.disabled = true;
    }

    function settle(i) {
      var o = viewer.get(i);
      var target = STEREO.nearest(i ? img : m, o.R);
      busy = true;
      viewer.animate(i, target, 300, function () {
        busy = false;
        if (i === 1) { tried++; slideBtn.disabled = together; if (opts.onTry) opts.onTry(); }
        paintMeter();
      });
    }

    function turnImage(L) {
      if (busy || !viewer || together) return;
      linked = false; viewer.linked = false;
      var target = G.mmul(L, viewer.get(1).R);
      busy = true;
      viewer.animate(1, target, 600, function () {
        busy = false; tried++; slideBtn.disabled = together; paintMeter();
        if (opts.onTry) opts.onTry();
      });
    }

    function paintTurns() {
      turnbar.innerHTML = '';
      turnbar.appendChild(h('span', { class: 'lbl', text: 'Turn the image:' }));
      turnbar.appendChild(h('button', { type: 'button', class: 'mini', text: 'Turn it over ⟲', onclick: function () { turnImage(STEREO.OVER); } }));
      if (m.kind === 'chain') {
        turnbar.appendChild(h('button', { type: 'button', class: 'mini', text: 'Upside down', onclick: function () { turnImage(STEREO.UPSIDE); } }));
        return;
      }
      turnbar.appendChild(h('span', { class: 'lbl', text: 'Spin around:' }));
      Object.keys(img.slots).forEach(function (s) {
        var j = img.slots[s];
        turnbar.appendChild(h('button', { type: 'button', class: 'mini', text: GROUPS[img.atoms[j].group].label,
          onclick: function () {
            var b = STEREO.apply(img, viewer.get(1).R);
            turnImage(G.rot(G.sub(b.atoms[j].p, b.atoms[b.centre].p), 120));
          } }));
      });
    }

    slideBtn.addEventListener('click', function () {
      if (!viewer || busy) return;
      if (together) return;
      together = true;
      busy = true;
      var x = models();
      var miss = STEREO.mismatched(x.b, x.a);
      viewer.pane = false;
      viewer.set(1, { alpha: 0.5 });
      viewer.slide(0, [0, 0, 0], 700);
      viewer.slide(1, [0, 0, 0], 700, function () {
        busy = false;
        viewer.set(1, { glow: miss });
        viewer.set(0, { glow: STEREO.mismatched(x.a, x.b) });
        var c = count();
        status.textContent = c.n === c.total ? 'Every atom lies on its partner: a perfect fit.'
          : c.n + ' of ' + c.total + ' atoms line up. The atoms ringed in red have no partner.';
        if (opts.onSlide) opts.onSlide(c.n, c.total);
      });
      slideBtn.disabled = true;
      resetBtn.disabled = false;
    });

    resetBtn.addEventListener('click', function () {
      if (!viewer || busy) return;
      together = false;
      viewer.pane = true;
      viewer.set(0, { glow: [] });
      viewer.set(1, { glow: [], alpha: 1 });
      viewer.slide(0, [-off, 0, 0], 500);
      viewer.slide(1, [off, 0, 0], 500);
      slideBtn.disabled = false;
      resetBtn.disabled = true;
      status.textContent = '';
    });
    resetBtn.disabled = true;

    var node = panel('Molecule and mirror image', 'drag either one', [wrap, turnbar,
      h('div', { class: 'meter-row' }, [meter, meterText]), h('div', { class: 'btnrow' }, [slideBtn, resetBtn]), status], 'p3d');
    return {
      node: node, start: start, tried: function () { return tried; }, count: count,
      viewer: function () { return viewer; },
      /* show a plane in the molecule, turned so it is seen at a slant */
      showPlane: function (plane) {
        var T = G.mmul(G.rot([1, 0, 0], 12), G.rot([0, 1, 0], 58));
        viewer.set(0, { plane: plane });
        viewer.animate(0, G.mmul(T, viewer.get(0).R), 700);
        if (together) viewer.animate(1, G.mmul(T, viewer.get(1).R), 700);
      }
    };
  }

  /* -------------------------------------------------------------- the steps */

  var RENDER = {};

  /* ---- mirror: does the mirror image fit? */

  RENDER.mirror = function (s) {
    var pr = progress('mirror');
    pr.p = pr.p || {}; pr.ok = pr.ok || {};
    var k = pr.k || 0;
    var KEYS = ['fit1', 'fit2'], NAMES = ['CHBrClF', 'CH₂BrCl'];
    var top = h('div'), area = h('div');
    el.stage.appendChild(top);
    el.stage.appendChild(area);
    function save() { pr.k = k; state.pr.mirror = pr; persist(); }
    function isOpen(i) { return i === 0 || !!pr.ok[s.mols[i - 1]]; }

    function paint() {
      top.innerHTML = '';
      top.appendChild(chipRow('Molecule:', NAMES, k, function (i) { return !!pr.ok[s.mols[i]]; }, isOpen,
        function (i) { k = i; save(); paint(); }));
      var P = PREDICT[KEYS[k]];
      top.appendChild(panel('Your prediction', null, [predictCard(P, pr.p[k], function (i) {
        pr.p[k] = i; save(); paint(); showArea(area);
      })]));
      area.innerHTML = '';
      if (pr.p[k] == null) return;
      var m = molecule(s.mols[k]);
      var side = h('div');
      var sc = mirrorScene(m, { needTry: true, onTry: function () { say(''); }, onSlide: function (n, total) { slid(n, total); } });
      area.appendChild(h('div', { class: 'work work-wide' }, [sc.node,
        panel('The drawing', null, [molWrap(Draw.mol(m, {})), side])]));
      sc.start();
      function paintSide() {
        side.innerHTML = '';
        if (!pr.ok[m.id]) {
          side.appendChild(h('p', { class: 'muted', text: 'Turning the molecule on the left turns its reflection, as a real mirror ' +
            'would. Now pick up the mirror image: drag it, or use the buttons under it, and try to make every atom line up ' +
            'with its partner. Then slide them together.' }));
          return;
        }
        if (k === 0) {
          side.appendChild(reveal([verdict(PREDICT.fit1, pr.p[0]) + 'However you turn it, at most two atoms line up and the ' +
            'other two trade places. The mirror image is a different molecule: CHBrClF is chiral, like a hand.',
            'Its carbon carries four different atoms: Br, Cl, F and H.']));
          if (!pr.ok.ch2brcl) {
            side.appendChild(h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary', text: 'Next molecule →',
              onclick: function () { k = 1; save(); paint(); } })]));
          }
        } else {
          var plane = STEREO.centrePlane(m);
          side.appendChild(reveal([verdict(PREDICT.fit2, pr.p[1]) + 'Every atom lines up: the mirror image is the same ' +
            'molecule. CH₂BrCl is achiral.', 'It has a mirror plane: the plane through Br, C and Cl cuts it into two halves ' +
            'that are mirror images of each other, one H on each side. Here that plane is the page itself.']));
          side.appendChild(h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'ghostbtn', text: 'Show the mirror plane',
            onclick: function () { sc.showPlane({ o: plane.o, n: plane.n, size: 3.4 }); } })]));
        }
      }
      function slid(n, total) {
        if (k === 0) {
          if (!pr.ok[m.id]) { pr.ok[m.id] = 1; save(); }
          say(n + ' of ' + total + ' atoms line up. Try other turns if you like: two is the most that ever will.', 'good');
          paintSide();
          paint2();
        } else if (n === total) {
          if (!pr.ok[m.id]) { pr.ok[m.id] = 1; save(); }
          paintSide();
          paint2();
        } else {
          say('Only ' + n + ' of ' + total + ' line up so far. Go back to the mirror, turn the image some more and slide again. ' +
              'Try Turn it over.', 'bad');
        }
      }
      paintSide();
    }

    function paint2() {
      top.firstChild.replaceWith(chipRow('Molecule:', NAMES, k, function (i) { return !!pr.ok[s.mols[i]]; }, isOpen,
        function (i) { k = i; save(); paint(); }));
      if (pr.ok.chbrclf && pr.ok.ch2brcl && !state.done[s.id]) {
        complete('CHBrClF is chiral: its mirror image never fits. CH₂BrCl is achiral: its mirror image fits, and it has a ' +
                 'mirror plane.');
      } else if (pr.ok.chbrclf && k === 0) {
        say('Now try CH₂BrCl.', 'good');
      }
    }

    paint();
    if (state.done[s.id]) say('Done. Turn the models as much as you like, or move on.', 'good');
  };

  /* ---- drawmirror: draw what a mirror shows */

  var MIRROR_WORDS = {
    beside: 'A mirror beside the molecule turns left into right. Nothing moves toward you or away: a wedge stays a ' +
            'wedge and a dash stays a dash.',
    behind: 'A mirror behind the page turns toward you into away from you: a wedge becomes a dash and a dash becomes a ' +
            'wedge. Left and right stay where they are.'
  };

  /* Judge a drawn mirror image: `got` maps slots to groups. */
  function judgeMirror(m, where, got) {
    function same(a, b) { return Object.keys(b).every(function (x) { return a[x] === b[x]; }); }
    var want = STEREO.arrangement(STEREO.mirror(m, where));
    if (same(got, want)) return { ok: true };
    var orig = STEREO.arrangement(m);
    if (same(got, orig)) return { kind: 'copy', msg: 'That is the molecule just as it is drawn. ' + MIRROR_WORDS[where] };
    var otherWhere = where === 'beside' ? 'behind' : 'beside';
    if (same(got, STEREO.arrangement(STEREO.mirror(m, otherWhere)))) {
      return { kind: 'other', msg: 'That is a mirror image, but the one a mirror ' + (otherWhere === 'beside' ? 'beside the molecule' :
        'behind the page') + ' would show. ' + MIRROR_WORDS[where] };
    }
    var built = STEREO.fromSlots(m.tpl, got);
    if (STEREO.relation(built, m) === 'identical') {
      var over = same(got, STEREO.arrangement(STEREO.apply(m, STEREO.OVER)));
      return { kind: 'turned', msg: (over ? 'You moved every group from left to right and changed the wedge and the dash: ' +
        'that is the original molecule turned over. ' : 'That drawing is the original molecule, only turned. ') +
        'It would fit the original exactly, so it is not the mirror image. ' + MIRROR_WORDS[where] };
    }
    var slots = MOLECULES.SLOT_ORDER[m.tpl];
    for (var i = 0; i < slots.length; i++) {
      var sl = slots[i];
      if (got[sl] === want[sl]) continue;
      var g = want[sl], from = slots.filter(function (t) { return orig[t] === g; })[0];
      return { kind: 'slot', slot: sl, msg: GROUPS[g].name + ' is ' + Draw.SLOT_WORDS[from] + ' in the molecule, so its image is ' +
        Draw.SLOT_WORDS[sl] + '. ' + MIRROR_WORDS[where] };
    }
    return { kind: 'other', msg: 'Not quite. ' + MIRROR_WORDS[where] };
  }

  RENDER.drawmirror = function (s) {
    var m = molecule(s.mol);
    var pr = progress('drawmirror');
    pr.ok = pr.ok || {};
    var WHERE = ['beside', 'behind'];
    var k = pr.k || 0;
    var host = h('div');
    el.stage.appendChild(host);
    var picker = null, fill = {}, wrong = 0;
    function save() { pr.k = k; state.pr.drawmirror = pr; persist(); }

    function paint() {
      if (picker) picker.destroy();
      host.innerHTML = '';
      var where = WHERE[k];
      var done = !!pr.ok[where];
      if (done) fill = STEREO.arrangement(STEREO.mirror(m, where));
      host.appendChild(chipRow('Mirror:', ['Beside the molecule', 'Behind the page'], k,
        function (i) { return !!pr.ok[WHERE[i]]; }, function (i) { return i === 0 || !!pr.ok.beside; },
        function (i) { k = i; fill = {}; wrong = 0; save(); paint(); }));
      var tplHost = h('div', { class: 'mol-wrap big' });
      var tray = h('div', { class: 'tray', 'aria-label': 'Atoms to place' });
      var check = h('button', { type: 'button', class: 'primary', text: 'Check' });
      var clear = h('button', { type: 'button', class: 'ghostbtn', text: 'Clear' });
      var show = h('button', { type: 'button', class: 'ghostbtn', text: 'Show me in 3D', hidden: true });
      var tip = h('p', { class: 'tip', hidden: true });
      var help = h('div');
      var orig = h('figure', null, [molWrap(Draw.mol(m, {}), true), h('figcaption', { text: 'The molecule' })]);
      var mine = h('figure', null, [tplHost, h('figcaption', { text: 'Its mirror image' })]);
      var row = where === 'beside'
        ? h('div', { class: 'mirror-row' }, [orig, h('div', { class: 'mirror-bar', 'aria-hidden': 'true' }, [h('div', { class: 'glass' }),
            h('span', { text: 'mirror' }), h('div', { class: 'glass' })]), mine])
        : h('div', null, [h('p', { class: 'behind-note' }, [h('span', { class: 'glass', 'aria-hidden': 'true' }),
            'The mirror lies flat behind the page. Draw the image you would see in it, looking through the molecule from the front.']),
            h('div', { class: 'pair-row' }, [orig, mine])]);
      host.appendChild(panel(where === 'beside' ? 'A mirror beside the molecule' : 'A mirror behind the page', null,
        [row, tray, h('div', { class: 'btnrow' }, [check, clear, show]), tip]));
      host.appendChild(help);

      function paintTpl() {
        tplHost.innerHTML = '';
        tplHost.appendChild(Draw.template(m.tpl, fill, { targets: !done, wedgeRight: true,
          label: 'Template for the mirror image: two bonds in the page, one wedge and one dash.' }));
        tray.innerHTML = '';
        var left = Object.keys(m.slots).map(function (sl) { return m.atoms[m.slots[sl]].group; }).filter(function (g) {
          return !Object.keys(fill).some(function (x) { return fill[x] === g; });
        });
        left.forEach(function (g) {
          tray.appendChild(h('button', { type: 'button', class: 'tile tone-' + groupTone(g), 'data-tile': g,
            'aria-label': 'Atom ' + GROUPS[g].name }, [GROUPS[g].label]));
        });
        if (!left.length) tray.appendChild(h('p', { class: 'tray-empty', text: done ? 'Drawn.' : 'All placed. Press Check.' }));
      }

      picker = Picker({
        tray: tray, stage: tplHost,
        label: function (g) { return GROUPS[g].label; },
        prompt: function (g) { return 'Now choose a position for ' + GROUPS[g].name + '.'; },
        say: function (t) { say(t); },
        drop: function (slot, g) {
          if (done) return;
          Object.keys(fill).forEach(function (x) { if (fill[x] === g) delete fill[x]; });
          fill[slot] = g;
          paintTpl();
          say('');
        },
        empty: function (slot) {
          if (done) return;
          if (!fill[slot]) { say('Choose an atom first, then a position.'); return; }
          delete fill[slot];
          paintTpl();
          say('Removed. Pick an atom to put there instead.');
        }
      });

      check.addEventListener('click', function () {
        if (done) return;
        if (Object.keys(fill).length < 4) { say('Fill every position first.', 'bad'); return; }
        var r = judgeMirror(m, where, fill);
        if (r.ok) {
          pr.ok[where] = 1;
          done = true;
          save();
          paintTpl();
          check.disabled = true; clear.disabled = true; tip.hidden = true; show.hidden = true;
          help.innerHTML = '';
          if (pr.ok.beside && pr.ok.behind) {
            complete('Both mirror images drawn. They are the same molecule, just turned: the one mirror image of CHBrClF.');
          } else {
            k = pr.ok.beside ? 1 : 0;
            fill = {}; wrong = 0;
            save();
            paint();
            say('Correct! Now the mirror lies flat behind the page.', 'good');
          }
          return;
        }
        wrong++;
        say(r.msg, 'bad');
        if (r.slot) shake(tplHost, r.slot);
        tip.hidden = false;
        tip.textContent = where === 'beside'
          ? 'Tip: stand each atom in front of the mirror and find its reflection. An atom on the upper left appears on the ' +
            'upper right, as far behind the mirror as the atom is in front of it.'
          : 'Tip: an atom on the wedge sticks out of the page toward you, so in a mirror behind the page its image is as far ' +
            'behind the page: on the dash. Atoms in the page stay put.';
        if (wrong >= 2) show.hidden = false;
      });
      clear.addEventListener('click', function () { if (!done) { fill = {}; paintTpl(); say(''); } });
      show.addEventListener('click', function () {
        help.innerHTML = '';
        var sc = mirrorScene(m, {});
        help.appendChild(h('div', { class: 'work work-wide' }, [sc.node, panel('In 3D', null, [h('p', { class: 'muted', text: where === 'beside'
          ? 'The mirror stands between the molecule and its image. Turn the molecule and watch the image: every atom keeps its ' +
            'height and its distance from the page; only left and right change.'
          : 'Here the mirror stands beside the molecule, but the image is the same molecule as the one a mirror behind the page ' +
            'shows, just turned. Use Turn it over on the image to see the drawing you need.' })])]));
        sc.start();
        showArea(help);
      });
      paintTpl();
      if (done) { check.disabled = true; clear.disabled = true; }
    }

    paint();
    if (state.done[s.id]) say('Drawn. Move on when you are ready.', 'good');
    return { destroy: function () { if (picker) picker.destroy(); } };
  };

  /* ---- centres: find the chirality centres */

  /* "H, CH₃ and two CH₂CH₃ groups": the groups on carbon c. */
  function groupsOn(m, c) {
    var names = MOLECULES.neighbours(m)[c].map(function (x) { return MOLECULES.condensed(m, c, x.j); });
    var count = {};
    names.forEach(function (n) { count[n] = (count[n] || 0) + 1; });
    var NUM = { 2: 'two', 3: 'three', 4: 'four' };
    var parts = Object.keys(count).map(function (n) {
      return count[n] === 1 ? n : NUM[count[n]] + ' ' + (n === 'H' ? 'H atoms' : n + ' groups');
    });
    return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0];
  }

  function whyNotCentre(m, num) {
    var c = m.carbonAt[num];
    var hs = MOLECULES.neighbours(m)[c].filter(function (x) { return m.atoms[x.j].el === 'H'; }).length;
    if (hs >= 2) return 'C' + num + ' carries ' + groupsOn(m, c) + '. With ' + (hs === 3 ? 'three' : 'two') + ' H atoms, ' +
      'its groups cannot all be different, so it is not a chirality centre.';
    return 'C' + num + ' carries ' + groupsOn(m, c) + '. Two of its groups are the same, so it is not a chirality centre.';
  }

  var TINTS = ['g1', 'g2', 'g3', 'g4'];

  RENDER.centres = function (s) {
    var pr = progress('centres');
    pr.f = pr.f || {}; pr.ok = pr.ok || {};
    var k = pr.k || 0;
    var host = h('div');
    el.stage.appendChild(host);
    var picker = null, viewer = null;
    function save() { pr.k = k; state.pr.centres = pr; persist(); }
    function isOpen(i) { return i === 0 || !!pr.ok[s.mols[i - 1]]; }

    function paint() {
      if (picker) picker.destroy();
      host.innerHTML = '';
      var id = s.mols[k], m = molecule(id);
      var want = CIP.centres(m).map(function (c) { return m.atoms[c].num; });
      var found = pr.f[id] = pr.f[id] || [];
      host.appendChild(chipRow('Molecule:', s.mols.map(function (x) { return MOLECULES[x].name; }), k,
        function (i) { return !!pr.ok[s.mols[i]]; }, isOpen, function (i) { k = i; save(); paint(); }));
      var drawHost = h('div', { class: 'mol-wrap big' });
      var none = h('button', { type: 'button', class: 'ghostbtn', text: 'It has no chirality centres' });
      var status = h('p', { class: 'status' });
      var canvas = h('canvas', { class: 'c3d', tabindex: 0, role: 'img',
        'aria-label': '3D model of ' + m.name + '. Click a carbon in the drawing to colour its four groups here.' });
      var key = h('p', { class: 'view-note', text: 'Click a carbon in the drawing: its four groups light up here, one colour ' +
        'each. Two groups in the same colour are the same group.' });
      host.appendChild(h('div', { class: 'work' }, [
        panel('Bond-line drawing', 'click the chirality centres', [drawHost, h('div', { class: 'btnrow' }, [none]), status]),
        panel('3D model', 'drag to rotate', [h('div', { class: 'c3d-wrap' }, [canvas]), key])]));
      viewer = new Viewer3D(canvas, { objects: [{ model: m, R: G.mmul(G.rot([1, 0, 0], 18), G.rot([0, 1, 0], -20)) }],
        radius: radiusOf(m) * 0.92 });

      function paintDrawing() {
        var carbons = {};
        m.backbone.forEach(function (i) {
          var num = m.atoms[i].num, hit = found.indexOf(num) >= 0;
          carbons[num] = { key: String(num), cls: hit ? 'found' : '', text: hit ? '*' : null,
            aria: 'C' + num + (hit ? ', a chirality centre' : '') };
        });
        drawHost.innerHTML = '';
        drawHost.appendChild(Draw.mol(m, { numbers: true, carbons: carbons }));
        status.textContent = pr.ok[id] ? (want.length ? 'Found ' + (want.length === 1 ? 'it' : 'both') + '.' : 'None: right.')
          : 'Found ' + found.length + '.';
        none.disabled = !!pr.ok[id];
      }

      /* colour carbon c's four groups in 3D; identical groups share a colour */
      function tintGroups(c) {
        var r = CIP.rank(m, c), tint = {}, colourOf = {}, next = 0;
        r.order.forEach(function (j, idx) {
          var tie = r.ties.filter(function (t) { return t[1] === j; })[0];
          colourOf[j] = tie ? colourOf[tie[0]] : TINTS[next++];
          STEREO.side(m, c, j).forEach(function (a) { tint[a] = colourOf[j]; });
        });
        viewer.set(0, { tint: tint, glow: [c] });
      }

      function click(key) {
        if (pr.ok[id]) return;
        var num = +key, c = m.carbonAt[num];
        tintGroups(c);
        if (found.indexOf(num) >= 0) return;
        if (want.indexOf(num) >= 0) {
          found.push(num);
          save();
          paintDrawing();
          var msg = 'Yes: C' + num + ' carries four different groups: ' + groupsOn(m, c) + '.';
          if (want.every(function (x) { return found.indexOf(x) >= 0; })) { done(msg); return; }
          say(msg + ' Is there another?', 'good');
          return;
        }
        say(whyNotCentre(m, num), 'bad');
        shake(drawHost, key);
      }

      function done(msg) {
        pr.ok[id] = 1;
        save();
        paintDrawing();
        if (s.mols.every(function (x) { return pr.ok[x]; })) {
          if (!state.done[s.id]) complete(msg + ' All four molecules done: a chirality centre is a carbon with four different groups.');
          else say(msg, 'good');
          return;
        }
        say(msg + ' On to the next molecule.', 'good');
        k = Math.min(k + 1, s.mols.length - 1);
        save();
        setTimeout(paint, reduceMotion ? 0 : 900);
      }

      none.addEventListener('click', function () {
        if (pr.ok[id]) return;
        if (!want.length) { done('Right: no carbon here carries four different groups. 3-Methylpentane is achiral.'); return; }
        say('Look again: ' + (want.length - found.length === 1 ? 'one carbon here does' : 'some carbons here do') +
            ' carry four different groups.', 'bad');
      });

      picker = Picker({ tray: h('div'), stage: drawHost, label: function () { return ''; }, drop: function () {},
                        empty: function (key) { click(key); } });
      paintDrawing();
    }

    paint();
    if (state.done[s.id]) say('Done. Move on when you are ready.', 'good');
    return { destroy: function () { if (picker) picker.destroy(); } };
  };

  /* ---- rank: priorities 1 to 4 */

  var RANK_PREDICT = { chbrclf: 'top', tmb: 'bigger' };

  RENDER.rank = function (s) {
    var pr = progress(s.id);
    pr.p = pr.p || {}; pr.ok = pr.ok || {};
    var k = pr.k || 0;
    var top = h('div'), area = h('div');
    el.stage.appendChild(top);
    el.stage.appendChild(area);
    var picker = null;
    function save() { pr.k = k; state.pr[s.id] = pr; persist(); }
    function isOpen(i) { return i === 0 || !!pr.ok[s.mols[i - 1]]; }

    function paint() {
      if (picker) { picker.destroy(); picker = null; }
      top.innerHTML = '';
      area.innerHTML = '';
      var id = s.mols[k], m = molecule(id), c = m.centre;
      top.appendChild(chipRow('Molecule:', s.mols.map(function (x) { return MOLECULES[x].name; }), k,
        function (i) { return !!pr.ok[s.mols[i]]; }, isOpen, function (i) { k = i; save(); paint(); }));
      var pk = RANK_PREDICT[id];
      if (pk) {
        top.appendChild(panel('Your prediction', null, [predictCard(PREDICT[pk], pr.p[id], function (i) {
          pr.p[id] = i; save(); paint(); showArea(area);
        })]));
        if (pr.p[id] == null) return;
      }
      var want = CIP.priorities(m, c);
      var done = !!pr.ok[id];
      var got = done ? Object.assign({}, want) : {};
      var drawHost = h('div', { class: 'mol-wrap' });
      var tray = h('div', { class: 'tray', 'aria-label': 'Priority numbers' });
      var check = h('button', { type: 'button', class: 'primary', text: 'Check' });
      var clear = h('button', { type: 'button', class: 'ghostbtn', text: 'Clear' });
      var closer = h('button', { type: 'button', class: 'ghostbtn', text: 'Look closer', 'aria-pressed': 'false' });
      var sets = h('ul', { class: 'sets', hidden: true });
      var after = h('div');
      var canvas = h('canvas', { class: 'c3d', tabindex: 0, role: 'img', 'aria-label': '3D model of ' + m.name + '. Drag to rotate it.' });
      area.appendChild(h('div', { class: 'work' }, [
        panel('Rank the groups', 'put 1 to 4 on the groups', [drawHost, tray, h('div', { class: 'btnrow' }, [check, clear, closer]), sets]),
        panel('3D model', 'drag to rotate', [h('div', { class: 'c3d-wrap' }, [canvas]), after])]));
      var viewer = new Viewer3D(canvas, { objects: [{ model: m, R: G.mmul(G.rot([1, 0, 0], 15), G.rot([0, 1, 0], -25)) }],
        radius: radiusOf(m) });

      MOLECULES.neighbours(m)[c].forEach(function (x) {
        var a = m.atoms[x.j], txt;
        var single = GROUPS[a.group].label === a.el;
        if (single) txt = 'atomic number ' + ELEMENTS[a.el].z;
        else if (a.el === 'C') txt = 'through C (atomic number 6), which carries ' + CIP.setOf(m, c, x.j);
        else txt = 'through ' + a.el + ' (atomic number ' + ELEMENTS[a.el].z + ')';
        sets.appendChild(h('li', null, [h('b', { text: GROUPS[a.group].label }), txt]));
      });
      closer.addEventListener('click', function () {
        var on = sets.hidden;
        sets.hidden = !on;
        closer.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      function paintBoard() {
        var targets = {};
        MOLECULES.neighbours(m)[c].forEach(function (x) {
          targets[x.j] = { key: String(x.j), cls: got[x.j] ? 'done' : '',
            aria: GROUPS[m.atoms[x.j].group].name + (got[x.j] ? ', priority ' + got[x.j] : ', no number yet') };
        });
        var badges = {};
        Object.keys(got).forEach(function (j) { badges[j] = got[j]; });
        drawHost.innerHTML = '';
        var svgNode = Draw.mol(m, { targets: done ? {} : targets });
        drawHost.appendChild(svgNode);
        /* the student's numbers, drawn where the badges go */
        var L = svgNode._layout;
        Object.keys(got).forEach(function (j) {
          var at = Draw.badgeAt(L, +j, c), x = at[0], y = at[1];
          var g = Draw.el('g', { class: 'badge' + (got[j] === 4 ? ' four' : ''), 'aria-hidden': 'true' }, svgNode);
          Draw.el('circle', { cx: x, cy: y, r: 9.5, class: 'badge-bg' }, g);
          Draw.el('text', { x: x, y: y + 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'badge-text' }, g, String(got[j]));
        });
        refit(svgNode);
        viewer.set(0, { badges: badges });
        tray.innerHTML = '';
        var used = Object.keys(got).map(function (j) { return got[j]; });
        [1, 2, 3, 4].forEach(function (n) {
          if (used.indexOf(n) >= 0) return;
          tray.appendChild(h('button', { type: 'button', class: 'tile num', 'data-tile': String(n), 'aria-label': 'Priority ' + n }, [String(n)]));
        });
        if (used.length === 4) tray.appendChild(h('p', { class: 'tray-empty', text: done ? 'Ranked.' : 'All placed. Press Check.' }));
      }

      picker = Picker({
        tray: tray, stage: drawHost,
        label: function (n) { return n; },
        prompt: function (n) { return 'Now click the group that gets priority ' + n + '.'; },
        say: function (t) { say(t); },
        drop: function (key, n) {
          if (done) return;
          Object.keys(got).forEach(function (j) { if (got[j] === +n) delete got[j]; });
          got[key] = +n;
          paintBoard();
          say('');
        },
        empty: function (key) {
          if (done) return;
          if (got[key] == null) { say('Choose a number first, then a group.'); return; }
          delete got[key];
          paintBoard();
        }
      });

      check.addEventListener('click', function () {
        if (done) return;
        if (Object.keys(got).length < 4) { say('Give every group a number first.', 'bad'); return; }
        var ord = CIP.rank(m, c).order;
        var bad = null;
        for (var i = 0; i < 4 && !bad; i++) for (var j2 = i + 1; j2 < 4 && !bad; j2++) {
          if (got[ord[i]] > got[ord[j2]]) bad = [ord[i], ord[j2]];
        }
        if (!bad) {
          done = true;
          pr.ok[id] = 1;
          save();
          paintBoard();
          check.disabled = true; clear.disabled = true;
          after.appendChild(reveal([pk ? verdict(PREDICT[pk], pr.p[id]) : null].concat([0, 1, 2].map(function (q) {
            return (q + 1) + ' beats ' + (q + 2) + ': ' + CIP.explain(m, c, ord[q], ord[q + 1]);
          }))));
          var last = s.mols.every(function (x) { return pr.ok[x]; });
          if (last) {
            if (!state.done[s.id]) complete(s.id === 'rank' ? 'Ranked by atomic number. The lowest-ranked group is 4, whatever it is.'
              : 'At a tie, compare the lists atom by atom: the first difference decides, and a double bond counts twice.');
          } else {
            say('Correct! Read why, then go on to the next molecule.', 'good');
            top.firstChild.replaceWith(chipRow('Molecule:', s.mols.map(function (x) { return MOLECULES[x].name; }), k,
              function (i) { return !!pr.ok[s.mols[i]]; }, isOpen, function (i) { k = i; save(); paint(); }));
            after.appendChild(h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary', text: 'Next molecule →',
              onclick: function () { k++; save(); paint(); } })]));
          }
          return;
        }
        say('Not quite. ' + CIP.explain(m, c, bad[0], bad[1]), 'bad');
      });
      clear.addEventListener('click', function () { if (!done) { got = {}; paintBoard(); say(''); } });
      paintBoard();
      if (done) {
        check.disabled = true; clear.disabled = true;
        var ord0 = CIP.rank(m, c).order;
        after.appendChild(reveal([0, 1, 2].map(function (q) { return (q + 1) + ' beats ' + (q + 2) + ': ' + CIP.explain(m, c, ord0[q], ord0[q + 1]); })));
      }
    }

    /* grow a drawing's box to take in anything added after it was drawn */
    function refit(svgNode) {
      try {
        var b = svgNode.getBBox();
        if (b.width) {
          svgNode.setAttribute('viewBox', [b.x - 8, b.y - 8, b.width + 16, b.height + 16].map(function (v) { return v.toFixed(1); }).join(' '));
          svgNode.setAttribute('width', Math.round(b.width + 16));
          svgNode.setAttribute('height', Math.round(b.height + 16));
        }
      } catch (e) { /* not in the document yet */ }
    }

    paint();
    if (state.done[s.id]) say('Done. Move on when you are ready.', 'good');
    return { destroy: function () { if (picker) picker.destroy(); } };
  };

  /* ---- wheel: read R or S with 4 already on the dash */

  /* A step that reads one molecule after another with the rotator.
     extra(k, m, pr) returns the reveal lines once molecule k is read. */
  function readingStep(s, cfg) {
    var pr = progress(s.id);
    pr.ok = pr.ok || {}; pr.p = pr.p || {};
    var k = pr.k || 0;
    var top = h('div'), area = h('div');
    el.stage.appendChild(top);
    el.stage.appendChild(area);
    var rot = null;
    function save() { pr.k = k; state.pr[s.id] = pr; persist(); }
    function isOpen(i) { return i === 0 || !!pr.ok[s.mols[i - 1]]; }
    function chips() {
      return chipRow('Molecule:', s.mols.map(function (x) { return MOLECULES[x].name; }), k,
        function (i) { return !!pr.ok[s.mols[i]]; }, isOpen, function (i) { k = i; save(); paint(); });
    }

    function paint() {
      if (rot) { rot.destroy(); rot = null; }
      top.innerHTML = '';
      area.innerHTML = '';
      top.appendChild(chips());
      var id = s.mols[k], m = molecule(id);
      var pk = cfg.predict && cfg.predict[id];
      if (pk) {
        top.appendChild(panel('Your prediction', null, [predictCard(PREDICT[pk], pr.p[id], function (i) {
          pr.p[id] = i; save(); paint(); showArea(area);
        })]));
        if (pr.p[id] == null) return;
      }
      var c = CIP.centres(m)[0];
      var answers = {};
      if (pr.ok[id]) answers[c] = pr.ok[id];
      rot = rotator(m, { read: true, answers: answers, onRead: function (cc, label) {
        pr.ok[id] = label;
        save();
        top.firstChild.replaceWith(chips());
        after(true);
      } });
      area.appendChild(rot.node);
      rot.start();
      after(false);
    }

    function after(fresh) {
      rot.after.innerHTML = '';
      var id = s.mols[k], m = molecule(id);
      if (!pr.ok[id]) return;
      var pk = cfg.predict && cfg.predict[id];
      rot.after.appendChild(reveal([pk ? verdict(PREDICT[pk], pr.p[id]) : null].concat(cfg.extra(k, m, pr))));
      var last = s.mols.every(function (x) { return pr.ok[x]; });
      if (last) {
        if (!state.done[s.id]) complete(cfg.doneMsg);
        else if (fresh) say(cfg.doneMsg, 'good');
      } else {
        if (fresh) say('Correct! ' + m.name + ' is ' + pr.ok[id] + '.', 'good');
        rot.after.appendChild(h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary', text: 'Next molecule →',
          onclick: function () { k++; save(); paint(); } })]));
      }
    }

    paint();
    if (state.done[s.id]) say('Done. Move on when you are ready.', 'good');
    return { destroy: function () { if (rot) rot.destroy(); } };
  }

  RENDER.wheel = function (s) {
    return readingStep(s, {
      extra: function (k, m) {
        if (k === 0) {
          return ['1 → 2 → 3 runs clockwise, so this is (R)-2-bromobutane: the same drawing you turned into a Newman ' +
            'projection in the Newman activity.',
            'R comes from rectus, Latin for right, and S from sinister, left. As your teacher puts it: R is rockwise and S is ' +
            'sountersockwise.',
            'Press Steering-wheel view to see why it works: with 4 pointing straight away from you, hidden behind the carbon ' +
            'like a steering column, 1, 2 and 3 sit round the wheel.'];
        }
        return ['1 → 2 → 3 runs counterclockwise, so this is (S)-2-butanol.'];
      },
      doneMsg: 'With 4 on the dash, clockwise is R and counterclockwise is S.'
    });
  };

  /* ---- rotate: 4 is not on the dash, so rotate the molecule */

  RENDER.rotate = function (s) {
    return readingStep(s, {
      predict: { alanine_w: 'asis' },
      extra: function (k, m, pr) {
        if (k === 0) {
          return ['With the H turned onto the dash, NH₂ → COOH → CH₃ runs counterclockwise: (S)-alanine. It is the alanine ' +
            'in the proteins of every living thing.',
            'Turning the molecule over did not change it: the drawing changed because you are looking at the molecule from ' +
            'the other side.'];
        }
        return ['Here 4 was the CH₃, lying in the page. Turning the molecule over leaves a group in the page in the page, so ' +
          'it took a spin around a bond (or a drag) to put 4 on the dash.',
          'Priority 4 is just the lowest-ranked group: it is not always H. This centre is ' + pr.ok[m.id] + '.'];
      },
      doneMsg: 'If 4 is not on the dash, rotate the molecule. Then read 1 → 2 → 3.'
    });
  };

  /* ---- hidden: the H a bond-line drawing leaves out */

  /* The hidden-H molecule drawn in the template students redraw it in:
     C2's chain bonds in the page (CH₃ lower left, CH₂CH₃ lower right), the
     H on the wedge and the OH on the dash. */
  var HIDDEN_AS_DRAWN = { ll: 'CH3', lr: 'Et', w: 'H', d: 'OH' };

  function judgeRedraw(m, got) {
    var built = STEREO.fromSlots('A', got);
    var rel = STEREO.relation(built, m);
    var dash = STEREO.fourOnDash(built, built.centre);
    if (rel === 'identical' && dash) return { ok: true, built: built };
    if (rel === 'identical') {
      return { msg: 'That is the right molecule, but the H (4) is not on the dash yet. Keep rotating: the H has to end up on the dash.' };
    }
    var moved = ['ll', 'lr'].every(function (x) { return got[x] === HIDDEN_AS_DRAWN[x]; }) && got.w === 'OH' && got.d === 'H';
    if (moved) {
      return { msg: 'You moved the H to the dash and the OH to the wedge, and nothing else moved. That drawing is the mirror ' +
        'image of the molecule. When the molecule really turns over, the CH₃ and the CH₂CH₃ change sides too: press Turn it ' +
        'over and watch the drawing.' };
    }
    return { msg: 'That drawing is the mirror image of the molecule, not the molecule turned. Rotate the 3D model until the ' +
      'H is on the dash, then copy what you see.' + (dash ? '' : ' (The H is not on the dash either.)') };
  }

  RENDER.hidden = function (s) {
    var m = molecule(s.mol);
    var pr = progress('hidden');
    var P = PREDICT.hiddenH;
    var top = h('div'), area = h('div');
    el.stage.appendChild(top);
    el.stage.appendChild(area);
    var rot = null, picker = null;
    function save() { state.pr.hidden = pr; persist(); }
    function stop() { if (rot) { rot.destroy(); rot = null; } if (picker) { picker.destroy(); picker = null; } }

    function paintTop() {
      top.innerHTML = '';
      top.appendChild(panel('Your prediction', null, [h('div', { class: 'grid2' }, [
        predictCard(P, pr.p, function (i) { pr.p = i; save(); paintTop(); paint(); showArea(area); }),
        molWrap(Draw.mol(m, { numbers: true }))])]));
      if (pr.p != null) {
        top.appendChild(reveal([verdict(P, pr.p) + 'The hidden H points toward you, on a wedge. At a carbon in the zigzag the ' +
          'two bonds out of the page always point opposite ways: if the drawn group is on a dash, the H is on a wedge, and the ' +
          'other way round.', 'So here 4 is on the wedge, and the molecule has to be rotated before it can be read.']));
      }
    }

    function paint() {
      stop();
      area.innerHTML = '';
      if (pr.p == null) return;
      if (pr.built) { paintRead(); return; }
      var fill = {}, wrong = 0;
      var tplHost = h('div', { class: 'mol-wrap' });
      var tray = h('div', { class: 'tray', 'aria-label': 'Groups to place' });
      var check = h('button', { type: 'button', class: 'primary', text: 'Check' });
      var clear = h('button', { type: 'button', class: 'ghostbtn', text: 'Clear' });
      var tip = h('p', { class: 'tip', hidden: true });
      var build = panel('Your drawing, with 4 on the dash', 'drag groups in', [tplHost, tray, h('div', { class: 'btnrow' }, [check, clear]), tip]);
      rot = rotator(m, { read: false, drawOpts: { showH: [2], numbers: true }, third: build, title2: 'The molecule as it lies' });
      area.appendChild(rot.node);
      rot.start();
      var TILES = ['OH', 'CH3', 'Et', 'H'];
      function paintTpl() {
        tplHost.innerHTML = '';
        tplHost.appendChild(Draw.template('A', fill, { targets: true,
          label: 'Template: C2 with two bonds in the page going down, a wedge and a dash going up.' }));
        tray.innerHTML = '';
        TILES.filter(function (g) { return !Object.keys(fill).some(function (x) { return fill[x] === g; }); }).forEach(function (g) {
          tray.appendChild(h('button', { type: 'button', class: 'tile tone-' + groupTone(g), 'data-tile': g,
            'aria-label': 'Group ' + GROUPS[g].name }, [GROUPS[g].label]));
        });
        if (Object.keys(fill).length === 4) tray.appendChild(h('p', { class: 'tray-empty', text: 'All placed. Press Check.' }));
      }
      picker = Picker({
        tray: tray, stage: tplHost,
        label: function (g) { return GROUPS[g].label; },
        prompt: function (g) { return 'Now choose a position for ' + GROUPS[g].name + '.'; },
        say: function (t) { say(t); },
        drop: function (slot, g) {
          Object.keys(fill).forEach(function (x) { if (fill[x] === g) delete fill[x]; });
          fill[slot] = g;
          paintTpl();
          say('');
        },
        empty: function (slot) {
          if (!fill[slot]) { say('Choose a group first, then a position.'); return; }
          delete fill[slot];
          paintTpl();
        }
      });
      check.addEventListener('click', function () {
        if (Object.keys(fill).length < 4) { say('Fill every position first.', 'bad'); return; }
        var r = judgeRedraw(m, fill);
        if (r.ok) {
          pr.built = fill;
          save();
          say('Correct! That is the same molecule, turned so the H is on the dash. Now read it.', 'good');
          paint();
          return;
        }
        wrong++;
        say(r.msg, 'bad');
        tip.hidden = false;
        tip.textContent = 'Tip: press Turn it over under the 3D model. The H moves to the dash, and look where the CH₃ and ' +
          'the CH₂CH₃ go. Your drawing can show the molecule from any side, as long as the H is on the dash.';
      });
      clear.addEventListener('click', function () { fill = {}; paintTpl(); say(''); });
      paintTpl();
    }

    function paintRead() {
      var b = STEREO.fromSlots('A', pr.built, m.name);
      var answers = {};
      if (pr.label) answers[b.centre] = pr.label;
      rot = rotator(b, { read: true, turns: false, answers: answers, title3: '3D model of your drawing', title2: 'Your drawing',
        onRead: function (c, label) { pr.label = label; save(); fin(true); } });
      area.appendChild(rot.node);
      rot.start();
      fin(false);
    }

    function fin(fresh) {
      if (!pr.label) return;
      rot.after.innerHTML = '';
      rot.after.appendChild(reveal(['OH → CH₂CH₃ → CH₃ runs ' + (pr.label === 'R' ? 'clockwise' : 'counterclockwise') + ': (' +
        pr.label + ')-2-butanol. It is the same answer you would get from any drawing of this molecule, once 4 is on the dash.']));
      if (!state.done[s.id]) complete('Find the hidden H first. If it is not on the dash, rotate the molecule, then read it.');
      else if (fresh) say('(' + pr.label + ')-2-butanol.', 'good');
    }

    paintTop();
    paint();
    if (state.done[s.id]) say('Done. Move on when you are ready.', 'good');
    return { destroy: stop };
  };

  /* ---- enant: a mirror turns R into S */

  RENDER.enant = function (s) {
    var m = molecule(s.mol);
    var img = STEREO.mirror(m, 'behind');
    var pr = progress('enant');
    var P = PREDICT.mirrorLabel;
    var top = h('div'), area = h('div');
    el.stage.appendChild(top);
    el.stage.appendChild(area);
    var rot = null;
    var orig = CIP.label(m, m.centre);
    function save() { state.pr.enant = pr; persist(); }

    function paintTop() {
      top.innerHTML = '';
      var mark = {};
      mark[m.centre] = orig;
      top.appendChild(panel('Your prediction', null, [h('div', { class: 'grid2' }, [
        predictCard(P, pr.p, function (i) { pr.p = i; save(); paintTop(); paint(); showArea(area); }),
        h('figure', { class: 'fig-card' }, [molWrap(Draw.mol(m, { mark: mark })), h('figcaption', { text: '(R)-2-butanol' })])])]));
    }

    function paint() {
      if (rot) { rot.destroy(); rot = null; }
      area.innerHTML = '';
      if (pr.p == null) return;
      if (!pr.read) {
        area.appendChild(h('p', { class: 'behind-note' }, [h('span', { class: 'glass', 'aria-hidden': 'true' }),
          'Here is its mirror image in a mirror behind the page: every wedge became a dash and every dash a wedge. So the H ' +
          'is now on the wedge.']));
        rot = rotator(img, { read: true, title3: '3D model of the mirror image', title2: 'The mirror image',
          onRead: function (c, label) { pr.read = label; save(); say('Correct! The mirror image is ' + label + '.', 'good'); paint(); } });
        area.appendChild(rot.node);
        rot.start();
        return;
      }
      var mark = {};
      mark[m.centre] = orig;
      rot = rotator(m, { read: false, title3: '3D model of (R)-2-butanol', title2: '(R)-2-butanol, as it now lies', drawOpts: { mark: mark },
        onTurn: function () { pr.turns = (pr.turns || 0) + 1; save(); fin(true); } });
      area.appendChild(reveal([verdict(P, pr.p) + 'The mirror image of (R)-2-butanol is (S)-2-butanol. A mirror turns every ' +
        'clockwise into counterclockwise.', 'Now rotate (R)-2-butanol any way you like: drag it or use the buttons. Watch its label.']));
      area.appendChild(rot.node);
      rot.start();
      fin(false);
    }

    function fin(fresh) {
      if (!rot) return;
      rot.after.innerHTML = '';
      if (!pr.turns) return;
      rot.after.appendChild(reveal(['Still R, in every position: rotating a molecule never changes R or S. Only a reflection ' +
        'does, and that makes the other molecule of the pair.',
        'The two are enantiomers: mirror images that cannot be laid on each other. They have the same boiling point and the ' +
        'same energy, but your nose can tell some pairs apart: (R)-carvone smells of spearmint and (S)-carvone of caraway.']));
      if (!state.done[s.id]) complete('Enantiomers: every chirality centre is opposite, R in one and S in the other.');
      else if (fresh) say('Still R.', 'good');
    }

    paintTop();
    paint();
    if (state.done[s.id]) say('Done. Move on when you are ready.', 'good');
    return { destroy: function () { if (rot) rot.destroy(); } };
  };

  /* ---- four: two centres, four stereoisomers */

  var LETTERS = ['A', 'B', 'C', 'D'];

  RENDER.four = function (s) {
    var pr = progress('four');
    pr.ans = pr.ans || {}; pr.rel = pr.rel || {};
    var P = PREDICT.count4;
    var mols = s.mols.map(molecule);
    var A = mols[0], cs = CIP.centres(A);
    var top = h('div'), area = h('div'), table = h('div');
    el.stage.appendChild(top);
    el.stage.appendChild(area);
    el.stage.appendChild(table);
    var rot = null, picker = null;
    function save() { state.pr.four = pr; persist(); }
    function stop() { if (rot) { rot.destroy(); rot = null; } if (picker) { picker.destroy(); picker = null; } }
    function bothRead() { return cs.every(function (c) { return pr.ans[c]; }); }

    function paintTop() {
      top.innerHTML = '';
      top.appendChild(panel('Your prediction', null, [predictCard(P, pr.p, function (i) {
        pr.p = i; save(); paintTop(); paint(); showArea(area);
      })]));
      if (pr.p != null) {
        top.appendChild(reveal([verdict(P, pr.p) + 'Four. Each centre can be R or S, so there are four combinations: (2R,3R), ' +
          '(2S,3S), (2R,3S) and (2S,3R). Molecule A is one of them. Name both of its centres: pick C2 or C3 above the drawing.']));
      }
    }

    function paint() {
      stop();
      area.innerHTML = '';
      table.innerHTML = '';
      if (pr.p == null) return;
      rot = rotator(A, { read: true, centres: cs, answers: pr.ans, title2: 'Molecule A', drawOpts: { numbers: true },
        onRead: function (c, label) {
          pr.ans[c] = label;
          save();
          var other = cs.filter(function (x) { return !pr.ans[x]; })[0];
          if (other != null) { say('Correct! C' + A.atoms[c].num + ' is ' + label + '. Now C' + A.atoms[other].num + ': pick it above the drawing.', 'good'); rot.setCentre(other); }
          else { say('Correct! Molecule A is ' + configText(A) + '.', 'good'); paintTable(); showArea(table); }
        } });
      area.appendChild(rot.node);
      rot.start();
      if (bothRead()) paintTable();
    }

    function pairs() {
      var out = [];
      for (var i = 0; i < 4; i++) for (var j = i + 1; j < 4; j++) out.push([i, j]);
      return out;
    }

    function paintTable() {
      if (picker) { picker.destroy(); picker = null; }
      table.innerHTML = '';
      var cards = h('div', { class: 'cards' }, mols.map(function (m, i) {
        return h('figure', { class: 'card' }, [molWrap(Draw.mol(m, { cls: 'fig' })),
          h('figcaption', null, [h('span', { class: 'iso-tag', text: LETTERS[i] + ' ' }), configText(m)])]);
      }));
      var tbody = h('tbody');
      var tray = h('div', { class: 'tray', 'aria-label': 'Relationships' }, ['enantiomers', 'diastereomers'].map(function (w) {
        return h('button', { type: 'button', class: 'tile term', 'data-tile': w, 'aria-label': w }, [w]);
      }));
      var check = h('button', { type: 'button', class: 'primary', text: 'Check' });
      var done = !!pr.relOk;
      var rows = h('table', { class: 'rel-table' }, [h('thead', null, [h('tr', null, [h('th', { text: 'Pair' }), h('th', { text: 'Their centres' }),
        h('th', { text: 'Relationship' })])]), tbody]);
      table.appendChild(panel('How are they related?', 'put a word on each pair', [cards, h('div', { class: 'grid2' }, [rows,
        h('div', null, [tray, h('div', { class: 'btnrow' }, [check]), h('p', { class: 'muted', text: 'Enantiomers are mirror ' +
          'images: every centre opposite. Diastereomers are stereoisomers that are not mirror images: some centres the same, ' +
          'some opposite.' })])])]));
      function paintRows(marks) {
        tbody.innerHTML = '';
        pairs().forEach(function (pq) {
          var key = LETTERS[pq[0]] + LETTERS[pq[1]];
          var w = pr.rel[key];
          var cls = 'rel-slot drop' + (w ? ' filled' : '') + (marks && marks[key] ? ' ' + marks[key] : '');
          tbody.appendChild(h('tr', null, [h('td', { text: LETTERS[pq[0]] + ' and ' + LETTERS[pq[1]] }),
            h('td', { text: configText(mols[pq[0]]) + ' and ' + configText(mols[pq[1]]) }),
            h('td', null, [h('span', { class: cls, 'data-drop': key, tabindex: 0, role: 'button',
              'aria-label': LETTERS[pq[0]] + ' and ' + LETTERS[pq[1]] + ': ' + (w || 'empty') }, [w || 'drop a word'])])]));
        });
      }
      function answer(pq) { return STEREO.relation(mols[pq[0]], mols[pq[1]]); }
      picker = Picker({
        tray: tray, stage: tbody, sticky: true,
        label: function (w) { return w; },
        prompt: function (w) { return 'Now click each pair that is ' + w + '.'; },
        say: function (t) { say(t); },
        drop: function (key, w) { if (done) return; pr.rel[key] = w; save(); paintRows(); },
        empty: function () { say('Choose a word first, then a pair.'); }
      });
      check.addEventListener('click', function () {
        if (done) return;
        var ps = pairs();
        if (ps.some(function (pq) { return !pr.rel[LETTERS[pq[0]] + LETTERS[pq[1]]]; })) { say('Put a word on every pair first.', 'bad'); return; }
        var marks = {}, first = null;
        ps.forEach(function (pq) {
          var key = LETTERS[pq[0]] + LETTERS[pq[1]], ok = pr.rel[key] === answer(pq);
          marks[key] = ok ? 'right' : 'wrong';
          if (!ok && !first) first = pq;
        });
        paintRows(marks);
        if (!first) {
          done = true; pr.relOk = 1; save();
          tray.classList.add('locked');
          check.disabled = true;
          complete('Mirror images (every centre opposite) are enantiomers; every other pair is diastereomers. Four ' +
                   'stereoisomers: two pairs of enantiomers.');
          return;
        }
        var a = mols[first[0]], b = mols[first[1]];
        var diff = CIP.centres(a).filter(function (c, i) { return CIP.label(a, c) !== CIP.label(b, CIP.centres(b)[i]); }).length;
        say(LETTERS[first[0]] + ' ' + configText(a) + ' and ' + LETTERS[first[1]] + ' ' + configText(b) + ': ' +
          (diff === 2 ? 'both centres are opposite, so they are mirror images: enantiomers.'
                      : 'one centre is the same and one is opposite, so they are not mirror images: diastereomers.'), 'bad');
      });
      paintRows(done ? (function () { var mk = {}; pairs().forEach(function (pq) { mk[LETTERS[pq[0]] + LETTERS[pq[1]]] = 'right'; }); return mk; })() : null);
      if (done) { tray.classList.add('locked'); check.disabled = true; }
    }

    paintTop();
    paint();
    if (state.done[s.id]) say('Done. Move on when you are ready.', 'good');
    return { destroy: stop };
  };

  /* ---- meso: Molecules A and B again */

  /* Looking at a two-carbon zigzag from the side: C2–C3 across the page and
     C2's CH₃ straight up, so the meso mirror plane stands upright. */
  function sideTurn(m) {
    var p2 = m.atoms[m.carbonAt[2]].p, p3 = m.atoms[m.carbonAt[3]].p, p1 = m.atoms[m.carbonAt[1]].p;
    var x = G.unit(G.sub(p3, p2));
    var v = G.sub(p1, p2);
    var y = G.unit(G.sub(v, G.mul(x, G.dot(v, x))));
    return [x, y, G.cross(x, y)];
  }

  /* A guided, simultaneous mirror test: identical operations, different outcomes. */
  RENDER.mesocoach = function (s) {
    var pr = progress(s.id), phase = pr.phase || 0;
    var host = h('div', { class: 'meso-coach' });
    el.stage.appendChild(host);
    var titles = ['Inspect both molecules', 'Turn both mirror images upside down', 'Lay each image on its original'];
    function paint() {
      host.innerHTML = '';
      var grid = h('div', { class: 'work' });
      host.appendChild(grid);
      ['dbb_A', 'dbb_B'].forEach(function (id, i) {
        var m = molecule(id), img = STEREO.mirror(m);
        var R = phase >= 1 ? STEREO.UPSIDE : G.ident();
        var fit = STEREO.matchCount(STEREO.apply(img, R), m);
        var canvas = h('canvas', { class: 'c3d', tabindex: 0, role: 'img',
          'aria-label': (i ? 'Chiral B' : 'Meso A') + ': original and mirror image. Use the guided buttons below.' });
        var note = h('p', { class: 'coach-result', 'aria-live': 'polite', text: phase >= 2
          ? fit.n + ' of ' + fit.total + ' atoms line up. ' + (fit.n === fit.total ? 'Every atom fits: the same molecule.' : 'They do not fit: different molecules.')
          : 'Two chirality centres: ' + configText(m) + '. Its mirror image is ' + configText(img) + '.' });
        grid.appendChild(panel(i ? 'B: two chirality centres' : 'A: two chirality centres', null,
          [h('div', { class: 'c3d-wrap' }, [canvas]), note]));
        var offset = radiusOf(m) + 0.4;
        var v = new Viewer3D(canvas, { objects: [
          { model: m, offset: phase >= 2 ? [0, 0, 0] : [-offset, 0, 0], draggable: false },
          { model: img, R: phase === 1 ? G.ident() : R,
            offset: [offset, 0, 0], draggable: false, alpha: phase >= 2 ? 0.65 : 1 }],
          radius: radiusOf(m) * (phase >= 2 ? 0.8 : 1.3) });
        v.pane = phase < 2;
        if (phase === 1) v.animate(1, R, 650);
        if (phase >= 2) v.slide(1, [0, 0, 0], 650);
      });
      var messages = [
        'A and B each have two chirality centres. A centre describes one carbon; chirality describes the whole molecule. Compare each molecule with its own mirror image.',
        'We made the same real rotation of each mirror image. Rotation preserves every centre’s configuration. Watch A’s (2S,3R) image line up with A numbered from the other end.',
        'A fits its mirror image exactly, so it is achiral despite its two chirality centres: meso. No rotation can make every atom of B fit its mirror image; B is chiral.'
      ];
      host.appendChild(h('p', { class: 'rule', text: messages[Math.min(phase, 2)] }));
      if (phase < 2) {
        var next = h('button', { type: 'button', class: 'primary', text: titles[phase + 1],
          onclick: function () { phase++; pr.phase = phase; persist(); paint(); } });
        host.appendChild(next);
        if (phase === 1) { next.disabled = true; setTimeout(function () { next.disabled = false; }, 700); }
      } else {
        host.appendChild(h('p', { text: 'Why is A meso while B is chiral?' }));
        var row = h('div', { class: 'btnrow' });
        [['Both have two centres, so both must be chiral', false],
         ['A fits its own mirror image; B cannot', true]].forEach(function (choice) {
          row.appendChild(h('button', { type: 'button', class: 'ghostbtn', text: choice[0], onclick: function () {
            if (!choice[1]) { say('Two chirality centres do not guarantee a chiral molecule. Judge the whole molecule by its mirror image.', 'bad'); return; }
            pr.phase = 3; persist();
            complete('Yes. Meso means chirality centres in an achiral molecule. Next, find A’s internal mirror plane. R,S labels alone are not a meso test: the whole structure must have the required symmetry.');
          } }));
        });
        host.appendChild(row);
      }
    }
    paint();
  };

  RENDER.meso = function (s) {
    var pr = progress('meso');
    pr.fit = pr.fit || {};
    var P = PREDICT.count3;
    var k = pr.k || 0;
    var NAMES = ['Molecule A', 'Molecule B'];
    var top = h('div'), area = h('div'), plane = h('div');
    el.stage.appendChild(top);
    el.stage.appendChild(area);
    el.stage.appendChild(plane);
    function save() { pr.k = k; state.pr.meso = pr; persist(); }
    function okA() { return pr.fit.dbb_A === 'full'; }
    function okB() { return !!pr.fit.dbb_B; }

    function paintTop() {
      top.innerHTML = '';
      top.appendChild(panel('Your prediction', null, [predictCard(P, pr.p, function (i) {
        pr.p = i; save(); paintTop(); paint(); showArea(area);
      })]));
    }

    function paint() {
      area.innerHTML = '';
      if (pr.p == null) return;
      area.appendChild(chipRow('Try the mirror:', NAMES, k, function (i) { return i ? okB() : okA(); }, function () { return true; },
        function (i) { k = i; save(); paint(); }));
      var m = molecule(s.mols[k]);
      var side = h('div');
      var sc = mirrorScene(m, { needTry: true, onSlide: function (n, total) {
        if (k === 0) {
          if (n === total) { pr.fit.dbb_A = 'full'; save(); say('A fits its mirror image exactly.', 'good'); }
          else say(n + ' of ' + total + ' line up. Go back to the mirror and try Upside down on the image.', 'bad');
        } else {
          pr.fit.dbb_B = pr.fit.dbb_B || 1;
          save();
          say(n + ' of ' + total + ' line up. Try other turns: B never fits.', 'good');
        }
        paintSide();
        area.firstChild.replaceWith(chipRow('Try the mirror:', NAMES, k, function (i) { return i ? okB() : okA(); },
          function () { return true; }, function (i) { k = i; save(); paint(); }));
        paintPlane();
      } });
      var mark = {};
      CIP.centres(m).forEach(function (c) { mark[c] = CIP.label(m, c); });
      area.appendChild(h('div', { class: 'work work-wide' }, [sc.node,
        panel(NAMES[k] + ', as in the Newman activity', null, [molWrap(Draw.mol(m, { mark: mark })),
          h('p', { class: 'mol-name', text: '2,3-Dibromobutane ' + configText(m) }), side])]));
      sc.start();
      function paintSide() {
        side.innerHTML = '';
        var lines = [];
        if (k === 0 && okA()) {
          lines.push('Molecule A is (2R,3S). Its mirror image is (2S,3R), and that turned upside down is A again: one ' +
            'molecule, not two. A has two chirality centres but is achiral. That makes it a meso compound.');
        }
        if (k === 1 && okB()) {
          lines.push('Molecule B is (2R,3R). Its mirror image, (2S,3S), never fits on it: B is chiral, and (2S,3S) is its ' +
            'enantiomer.');
        }
        if (lines.length) side.appendChild(reveal(lines));
        else side.appendChild(h('p', { class: 'muted', text: 'Turn the mirror image with the buttons (or drag it), then slide ' +
          'the two together.' }));
      }
      paintSide();
      paintPlane();
    }

    var twist = 0, which = 0;
    function paintPlane() {
      plane.innerHTML = '';
      if (!(okA() && okB())) return;
      var mols = [molecule('dbb_A'), molecule('dbb_B')];
      var S = sideTurn(mols[0]);
      var canvas = h('canvas', { class: 'c3d', tabindex: 0, role: 'img', 'aria-label': 'Side view of the molecule. Drag to rotate it.' });
      var range = h('input', { type: 'range', min: 0, max: 360, step: 1, value: twist, class: 'turn-range',
        'aria-label': 'Turn C3 about the C2–C3 bond, in degrees' });
      var read = h('p', { class: 'readout' });
      var nmHost = h('div');
      var drawHost = h('div', { class: 'mol-wrap' });
      var info = h('div');
      plane.appendChild(panel('Look for a mirror plane', 'turn the C2–C3 bond', [
        chipRow('Molecule:', NAMES, which, function (i) { return i === 0 && !!pr.plane; }, function () { return true; },
          function (i) { which = i; twist = 0; paintPlane(); }),
        h('div', { class: 'work-3 work' }, [
          h('div', null, [h('div', { class: 'c3d-wrap' }, [canvas])]),
          h('div', null, [nmHost, h('div', { class: 'range-row' }, [h('span', { text: 'Turn C3' }), range]), read]),
          h('div', null, [drawHost, info])])]));
      var viewer = new Viewer3D(canvas, { objects: [{ model: mols[which], R: S }], radius: radiusOf(mols[which]) });
      function update() {
        var t = twist;
        /* close to eclipsed, A settles exactly there, so its mirror plane shows */
        if (which === 0) {
          var dih = STEREO.subDihedral(STEREO.twisted(mols[0], t));
          if (Math.abs(dih) < 5) {
            [t - dih, t + dih].some(function (tt) {
              if (Math.abs(STEREO.subDihedral(STEREO.twisted(mols[0], tt))) < 0.5) { t = tt; return true; }
              return false;
            });
          }
        }
        var mt = STEREO.twisted(mols[which], t);
        var pl = STEREO.mesoPlane(mt);
        viewer.set(0, { model: mt, plane: pl ? { o: pl.o, n: pl.n, size: 4.2 } : null });
        nmHost.innerHTML = '';
        nmHost.appendChild(Draw.newman(mt));
        var side = STEREO.apply(mt, S);
        var sp = STEREO.mesoPlane(side);
        drawHost.innerHTML = '';
        drawHost.appendChild(Draw.mol(side, { plane: sp, wedgeOut: true }));
        var dih = Math.round(STEREO.subDihedral(mt));
        var a = Math.abs(dih);
        read.textContent = 'Br–C2–C3–Br: ' + a + '°' + (a < 3 ? ' (eclipsed)' : Math.abs(a - 180) < 3 ? ' (anti)' : Math.abs(a - 60) < 3 ? ' (gauche)' : '');
        info.innerHTML = '';
        if (pl) {
          info.appendChild(reveal(['A mirror plane! With the two Br atoms eclipsed, the plane between C2 and C3 cuts Molecule A ' +
            'into two halves that are mirror images of each other. That is why A is meso.']));
          if (!pr.plane) { pr.plane = 1; save(); finish(); }
        } else if (which === 1) {
          info.appendChild(h('p', { class: 'muted', text: 'Turn B all the way round: no angle gives it a mirror plane. When B’s ' +
            'Br atoms line up, its CH₃ groups do not.' }));
        } else {
          info.appendChild(h('p', { class: 'muted', text: 'Turn the bond until the two halves of A look like mirror images.' }));
        }
      }
      range.addEventListener('input', function () { twist = +range.value; update(); });
      update();
    }

    function finish() {
      if (state.done[s.id] || !(okA() && okB() && pr.plane)) return;
      plane.appendChild(reveal([verdict(P, pr.p) + '2,3-Dibromobutane has three stereoisomers, not four: the meso compound A ' +
        '(2R,3S), and the pair of enantiomers (2R,3R) (Molecule B) and (2S,3S). The name (2S,3R) is just A again, numbered ' +
        'from the other end.',
        'A and B are diastereomers: stereoisomers that are not mirror images. Diastereomers are different molecules with ' +
        'different energies, which is why A and B had different energy curves in the Newman activity. Enantiomers have the ' +
        'same energy.']));
      complete('A molecule with chirality centres and a mirror plane is meso: achiral.');
    }

    paintTop();
    paint();
    if (state.done[s.id]) say('Done. Move on when you are ready.', 'good');
  };

  /* ---- rings: meso, chiral, or no chirality centres */

  var RING_WORDS = ['meso', 'chiral', 'no chirality centres'];

  function ringAnswer(m) {
    if (!CIP.centres(m).length) return 'no chirality centres';
    return STEREO.chiral(m) ? 'chiral' : 'meso';
  }

  function ringWhy(m, got) {
    var want = ringAnswer(m), n = CIP.centres(m).length, plane = STEREO.ringPlane(m);
    if (want === 'no chirality centres') {
      return m.name + ': going round the ring from C1 either way meets exactly the same atoms, so two of C1’s groups are the ' +
        'same, and the same holds at C4. No chirality centres' + (got === 'meso' ? ', so it cannot be meso (meso needs ' +
        'chirality centres), even though it is achiral.' : ', and it is achiral.');
    }
    if (want === 'meso') {
      return m.name + ' has ' + n + ' chirality centres, C1 and C3, but also a mirror plane through C2 and C5, with one CH₃ ' +
        'on each side. Its mirror image is itself: meso.';
    }
    return m.name + ' has ' + n + ' chirality centres and no mirror plane: one CH₃ points up and the other down. Its mirror ' +
      'image does not fit on it, so it is chiral.' + (plane ? '' : '');
  }

  RENDER.rings = function (s) {
    var pr = progress('rings');
    pr.ans = pr.ans || {};
    var P = PREDICT.cis13;
    var mols = s.mols.map(molecule);
    var sel = pr.sel || 0;
    var top = h('div'), area = h('div');
    el.stage.appendChild(top);
    el.stage.appendChild(area);
    var picker = null;
    function save() { pr.sel = sel; state.pr.rings = pr; persist(); }

    function paintTop() {
      top.innerHTML = '';
      top.appendChild(panel('Your prediction', null, [predictCard(P, pr.p, function (i) {
        pr.p = i; save(); paintTop(); paint(); showArea(area);
      })]));
    }

    function paint() {
      if (picker) { picker.destroy(); picker = null; }
      area.innerHTML = '';
      if (pr.p == null) return;
      var done = !!pr.ok;
      var cardsHost = h('div', { class: 'cards' });
      var tray = h('div', { class: 'tray', 'aria-label': 'Words' }, RING_WORDS.map(function (w) {
        return h('button', { type: 'button', class: 'tile term', 'data-tile': w, 'aria-label': w }, [w]);
      }));
      var check = h('button', { type: 'button', class: 'primary', text: 'Check' });
      var canvas = h('canvas', { class: 'c3d', tabindex: 0, role: 'img', 'aria-label': '3D model of the chosen ring. Drag to rotate it.' });
      var planeBtn = h('button', { type: 'button', class: 'mini', text: 'Look for a mirror plane' });
      var starBtn = h('button', { type: 'button', class: 'mini', text: 'Show the chirality centres', 'aria-pressed': 'false' });
      var note = h('p', { class: 'view-note' });
      area.appendChild(h('div', { class: 'work work-wide' }, [
        panel('Sort the rings', 'put a word on each', [cardsHost, tray, h('div', { class: 'btnrow' }, [check])]),
        panel('3D model', 'the more stable chair', [h('div', { class: 'c3d-wrap' }, [canvas]), h('div', { class: 'btnrow' }, [planeBtn, starBtn]), note])]));
      var viewer = new Viewer3D(canvas, { objects: [{ model: mols[sel], R: G.mmul(G.rot([1, 0, 0], -62), G.rot([0, 0, 1], 15)) }],
        radius: radiusOf(mols) });
      var stars = false, marks = {};

      function paintCards() {
        cardsHost.innerHTML = '';
        mols.forEach(function (m, i) {
          var w = pr.ans[m.id];
          var mk = {};
          if (stars) CIP.centres(m).forEach(function (c) { mk[m.atoms[c].num] = '*'; });
          var card = h('figure', { class: 'card' + (i === sel ? ' current' : ''), tabindex: 0, role: 'button',
            'aria-label': m.name + (w ? ', marked ' + w : '') + '. Activate to show it in 3D.' }, [
            molWrap(Draw.flat(m, { mark: mk, scale: 1 })), h('figcaption', { text: m.name }),
            h('div', { class: 'drop-word drop' + (w ? ' filled' : ''), 'data-drop': m.id, tabindex: 0, role: 'button',
              'aria-label': 'Word for ' + m.name + ': ' + (w || 'empty') }, [w || 'drop a word']),
            h('div', { class: 'verdict ' + (marks[m.id] || ''), text: marks[m.id] === 'good' ? '✓ right' : marks[m.id] === 'bad' ? '✗ not quite' : '' })]);
          function choose(ev) {
            if (ev.target.closest('.drop-word')) return;
            sel = i; save(); viewer.set(0, { model: m, plane: null }); note.textContent = ''; paintCards();
            var again = cardsHost.querySelectorAll('.card')[i];
            if (again && ev.type === 'keydown') again.focus();
          }
          card.addEventListener('click', choose);
          card.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); choose(ev); }
          });
          cardsHost.appendChild(card);
        });
      }

      planeBtn.addEventListener('click', function () {
        var m = mols[sel], pl = STEREO.ringPlane(m);
        viewer.set(0, { plane: pl ? { o: pl.o, n: pl.n, size: 5 } : null });
        note.textContent = pl ? 'A mirror plane through C' + pl.through[0] + ' and C' + pl.through[1] + ': the two halves are mirror ' +
          'images.' : 'No mirror plane: no plane cuts this ring into two mirror-image halves.';
      });
      starBtn.addEventListener('click', function () {
        stars = !stars;
        starBtn.setAttribute('aria-pressed', stars ? 'true' : 'false');
        paintCards();
      });

      picker = Picker({
        tray: tray, stage: cardsHost, sticky: true,
        label: function (w) { return w; },
        prompt: function (w) { return 'Now click each ring that is ' + w + '.'; },
        say: function (t) { say(t); },
        drop: function (key, w) { if (done) return; pr.ans[key] = w; marks = {}; save(); paintCards(); },
        empty: function () { say('Choose a word first, then a ring.'); }
      });

      check.addEventListener('click', function () {
        if (done) return;
        if (mols.some(function (m) { return !pr.ans[m.id]; })) { say('Put a word on every ring first.', 'bad'); return; }
        marks = {};
        var first = null;
        mols.forEach(function (m) {
          var ok = pr.ans[m.id] === ringAnswer(m);
          marks[m.id] = ok ? 'good' : 'bad';
          if (!ok && !first) first = m;
        });
        paintCards();
        if (!first) {
          done = true; pr.ok = 1; save();
          tray.classList.add('locked'); check.disabled = true;
          area.appendChild(reveal([verdict(P, pr.p) + 'cis-1,3-Dimethylcyclohexane is meso: two chirality centres and a ' +
            'mirror plane. The trans isomer is chiral. Neither 1,4 isomer has a chirality centre at all, yet cis- and ' +
            'trans-1,4 are still stereoisomers: diastereomers, like every cis and trans pair.']));
          complete('Rings follow the same rules: chirality centres, then look for a mirror plane.');
          return;
        }
        say(ringWhy(first, pr.ans[first.id]), 'bad');
      });
      paintCards();
      if (done) {
        mols.forEach(function (m) { marks[m.id] = 'good'; });
        paintCards();
        tray.classList.add('locked'); check.disabled = true;
      }
    }

    paintTop();
    paint();
    if (state.done[s.id]) say('Done. Move on when you are ready.', 'good');
    return { destroy: function () { if (picker) picker.destroy(); } };
  };

  /* -------------------------------------------------------- checkpoints */

  function question(id) {
    for (var k in QZ) {
      var pool = QZ[k].pool;
      for (var i = 0; i < pool.length; i++) if (pool[i].id === id) return pool[i];
    }
    return null;
  }

  var TURNS = { over: STEREO.OVER, upside: STEREO.UPSIDE, inpage: STEREO.INPAGE };

  /* The model a figure shows: a molecule, maybe reflected, maybe turned. */
  function figModel(spec) {
    var m = molecule(spec.mol);
    if (spec.mirror) m = STEREO.mirror(m, spec.mirror);
    if (spec.turn != null) m = STEREO.apply(m, typeof spec.turn === 'number' ? STEREO.orientations(m)[spec.turn] : TURNS[spec.turn]);
    if (spec.twist) m = STEREO.twisted(m, spec.twist);
    return m;
  }

  /* A question's figure: a wedge/dash drawing, a flat ring, two drawings
     side by side, or a Newman projection. */
  function figure(spec, cls) {
    if (spec.pair) {
      return h('div', { class: 'pair-row' }, spec.pair.map(function (p, i) {
        return h('figure', null, [figure(p, cls), h('figcaption', { text: (spec.captions || ['', ''])[i] })]);
      }));
    }
    if (spec.flat) {
      var r = molecule(spec.flat);
      return Draw.flat(r, { cls: cls, scale: 1.1, plane: spec.plane ? STEREO.ringPlane(r) : null });
    }
    if (spec.newman) return Draw.newman(figModel({ mol: spec.newman, twist: spec.twist }), { cls: cls });
    var m = figModel(spec);
    return Draw.mol(m, { cls: cls || 'fig', badges: spec.badges ? true : null, numbers: spec.numbers, showH: spec.showH,
      style: spec.style, plane: spec.plane ? STEREO.mesoPlane(m) : null });
  }

  function figureText(spec) {
    if (spec.pair) return spec.pair.map(figureText).join(' Beside it: ');
    var n = figure(spec);
    return n.getAttribute ? n.getAttribute('aria-label') || '' : '';
  }

  /* The atomic numbers, open beside checkpoints 2 to 4. */
  function zTable() {
    var t = h('table', { class: 'ref-table' });
    t.appendChild(h('tr', null, ['Element', 'Symbol', 'Atomic number'].map(function (x) { return h('th', { text: x }); })));
    ELEMENT_ORDER.forEach(function (e) {
      t.appendChild(h('tr', null, [h('td', { text: ELEMENTS[e].name }), h('td', { text: e }),
        h('td', { class: 'num', text: String(ELEMENTS[e].z) })]));
    });
    return h('div', null, [t, h('p', { class: 'ref-foot', text: 'Higher atomic number, higher priority. At a tie, list the atoms ' +
      'on each tied atom, highest first, and compare at the first point of difference. A double bond counts twice.' })]);
  }

  RENDER.quiz = function (s) {
    var Q = QZ[s.quiz];
    var ids = state.draws[s.quiz];
    var box = h('div', { class: 'quiz' });
    var side = s.quiz !== 'A'
      ? h('details', { class: 'reference quiz-table', open: true }, [h('summary', { text: 'Atomic numbers' }), zTable()])
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
      box.setAttribute('data-qid', id);
      say('');
      box.appendChild(h('p', { class: 'q-count', text: 'Question ' + (n + 1) + ' of ' + ids.length }));
      box.appendChild(h('p', { class: 'q-text', text: q.q }));
      if (q.fig) box.appendChild(h('div', { class: 'q-fig' }, [figure(q.fig)]));
      var figs = typeof q.choices[0] !== 'string';
      var row = h('div', { class: 'q-choices' + (figs ? ' figs' : q.compact ? ' compact' : '') });
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

  var BIG_IDEAS = [
    'A chiral molecule cannot be turned to fit onto its mirror image, like a hand. An achiral one can, and it often has a ' +
      'mirror plane.',
    'A chirality centre is a carbon with four different groups.',
    'Rank the groups by atomic number. Break a tie at the first point of difference, counting a double bond twice.',
    'If 4 is not on the dash, rotate the molecule. With 4 on the dash, clockwise is R and counterclockwise is S: rockwise ' +
      'and sountersockwise.',
    'Rotating a molecule never changes R or S. A mirror changes every centre: enantiomers are opposite at every centre.',
    'Stereoisomers that are not mirror images are diastereomers. A molecule with chirality centres and a mirror plane is ' +
      'meso, and it is achiral.'
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
      state.att > 1 ? h('p', { class: 'best-line', text: 'Best attempt: ' + best + '%' +
        (best > pct ? '. That is the score the gradebook keeps.' : '') }) : null,
      h('p', { class: 'muted', text: SCORM.isConnected()
        ? 'Your ' + (state.att > 1 ? 'best ' : '') + 'score has been sent to the gradebook and the activity is marked complete.'
        : 'Standalone mode: nothing was sent to a gradebook.' })
    ]);
    var ideas = panel('Big ideas', null, [h('ul', { class: 'keylist' }, BIG_IDEAS.map(function (t) { return h('li', { text: t }); }))]);
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

  /* ---- explore (teacher demo): ?explore or ?explore=alanine */

  function explore(id) {
    var ids = Object.keys(MOLECULES).filter(function (k) { return !MOLECULES[k].ring; });
    var cur = ids.indexOf(id) >= 0 ? id : 'alanine';
    var mirrored = false;
    el.parts.hidden = true;
    nav('next', 'hidden', true);
    nav('back', 'hidden', true);
    el.score.hidden = true;
    el.stepTitle.textContent = 'Explore';
    el.counter.textContent = 'Teacher demo: nothing is saved';
    el.instructions.textContent = 'Pick any molecule. Rotate it, reflect it and read each chirality centre. Nothing here is saved or graded.';
    var sel = h('select', { class: 'select', 'aria-label': 'Molecule' }, ids.map(function (k) {
      return h('option', { value: k, selected: k === cur, text: MOLECULES[k].name + ' (' + k + ')' });
    }));
    var mir = h('button', { type: 'button', class: 'ghostbtn', text: 'Show the mirror image' });
    var host = h('div');
    el.stage.appendChild(h('div', { class: 'btnrow' }, [sel, mir]));
    el.stage.appendChild(host);
    var rot = null;
    function show() {
      if (rot) rot.destroy();
      host.innerHTML = '';
      var m = molecule(cur);
      if (mirrored) m = STEREO.mirror(m, 'beside');
      var cs = CIP.centres(m);
      if (!cs.length) {
        host.appendChild(panel(m.name, null, [molWrap(Draw.mol(m, {})), h('p', { class: 'muted', text: 'No chirality centres.' })]));
        return;
      }
      rot = rotator(m, { read: true, centres: cs, title2: m.name + (mirrored ? ', mirror image' : ''), drawOpts: { numbers: m.kind === 'chain' } });
      host.appendChild(rot.node);
      rot.start();
    }
    sel.addEventListener('change', function () { cur = sel.value; mirrored = false; mir.textContent = 'Show the mirror image'; show(); });
    mir.addEventListener('click', function () { mirrored = !mirrored; mir.textContent = mirrored ? 'Back to the molecule' : 'Show the mirror image'; show(); });
    show();
  }

  /* --------------------------------------------------------- references */

  var VOCAB = [
    ['Chiral', 'Cannot be turned to fit exactly onto its mirror image, like a hand.'],
    ['Achiral', 'Can be turned to fit onto its mirror image. A molecule with a mirror plane is achiral.'],
    ['Chirality centre (stereocentre)', 'A carbon carrying four different groups.'],
    ['Mirror plane', 'A plane that cuts a molecule into two halves that are mirror images of each other.'],
    ['Priority', 'The rank of a group on a chirality centre, from 1 (highest) to 4 (lowest), by atomic number first.'],
    ['First point of difference', 'Comparing two groups atom by atom, the first place their lists of atoms differ. That place decides; the totals do not.'],
    ['R', 'With 4 on the dash, 1 → 2 → 3 runs clockwise. Rockwise, if you like.'],
    ['S', 'With 4 on the dash, 1 → 2 → 3 runs counterclockwise. Sountersockwise.'],
    ['Stereoisomers', 'Molecules with the same atoms bonded in the same order, arranged differently in space.'],
    ['Enantiomers', 'Stereoisomers that are mirror images of each other. Every chirality centre is opposite: R in one, S in the other.'],
    ['Diastereomers', 'Stereoisomers that are not mirror images: some centres the same, some opposite. Cis and trans rings are diastereomers too.'],
    ['Meso compound', 'A molecule that has chirality centres but is achiral, because it has a mirror plane.'],
    ['Constitutional isomers', 'The same formula, with the atoms bonded in a different order.']
  ];

  function buildReference() {
    el.zBody.appendChild(zTable());
    el.howBody.appendChild(h('ol', { class: 'ref-steps' }, [
      'Find the four groups on the chirality centre and rank them 1 to 4 by atomic number.',
      'Break a tie at the first point of difference. A double bond counts twice.',
      'If 4 is not on the dash, rotate the molecule until it is.',
      'Follow 1 → 2 → 3: clockwise is R, counterclockwise is S.'
    ].map(function (t) { return h('li', { text: t }); })));
    var dl = h('dl', { class: 'vocab' });
    VOCAB.forEach(function (p) {
      dl.appendChild(h('dt', { text: p[0] }));
      dl.appendChild(h('dd', { text: p[1] }));
    });
    el.vocabBody.appendChild(dl);
  }

  /* ------------------------------------------------------------------ boot */

  function showIntro() {
    var box = h('div', { class: 'screen-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'introTitle' }, [
      h('h2', { id: 'introTitle', text: 'Chirality: R and S' }),
      h('p', { text: 'In the Newman activity, Molecules A and B had the same atoms and the same bonds, yet no rotation turned ' +
                     'one into the other. By the end of this activity you will be able to name them.' }),
      h('ul', { class: 'screen-list' }, [
        h('li', { text: 'Part 1, Chirality: mirror images, and the carbons that make a molecule chiral.' }),
        h('li', { text: 'Part 2, Priorities: ranking the four groups on a chirality centre.' }),
        h('li', { text: 'Part 3, R and S: if 4 is not on the dash, rotate the molecule.' }),
        h('li', { text: 'Part 4, Two centres: enantiomers, diastereomers and meso compounds.' })
      ]),
      h('p', { text: 'Predictions, drawings and rankings are never graded, so try things. The four checkpoints are graded: ' +
                     'your first answer to each question counts. About 30 minutes. Your progress is saved if you leave.' }),
      h('p', { class: 'screen-note', text: 'Everything works with a mouse, a touch screen or the keyboard (Tab and Enter; the ' +
                                            'arrow keys rotate a 3D model).' })
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
     'score', 'lms', 'screen', 'zBody', 'howBody', 'vocabBody'].forEach(function (id) { el[id] = $(id); });
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

    [el.next, el.nextTop].forEach(function (b) { b.addEventListener('click', function () { goTo(state.step + 1); }); });
    [el.back, el.backTop].forEach(function (b) { b.addEventListener('click', function () { goTo(state.step - 1); }); });

    if (preview) { goTo(state.step); return; }
    paintParts();
    showIntro();
  }

  return { start: start, SCHEMA: SCHEMA, STEPS: STEPS, GRADED: GRADED, QZ: QZ, PREDICT: PREDICT, figure: figure, figModel: figModel,
           judgeMirror: judgeMirror, judgeRedraw: judgeRedraw, HIDDEN_AS_DRAWN: HIDDEN_AS_DRAWN, ringAnswer: ringAnswer,
           whyNotCentre: whyNotCentre, groupsOn: groupsOn, BIG_IDEAS: BIG_IDEAS, VOCAB: VOCAB, configText: configText,
           sideTurn: sideTurn, wheelTurn: wheelTurn };
})();

document.addEventListener('DOMContentLoaded', App.start);

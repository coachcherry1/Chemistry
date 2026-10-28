/* app.js: the steps, their order, saving, scoring.
 *
 * Part 1  From Lewis structure to 3D: a Lewis structure is flat and a molecule
 *         is not; build H2O, CO2 and BF3 by the 5 rules while the 3D window
 *         beside the drawing follows, then count the electron domains
 * Part 2  Molecular geometry: 2 to 6 domains, lone pairs push harder
 *         (109.5°, <109.5°, <<109.5°), naming a geometry by its atoms
 * Part 3  Polarity: radial symmetry and the two charge centres, different
 *         outer atoms, the electric field test
 *
 * Only the three checkpoints are graded (first answer counts). Builds,
 * counts, namings, sorts and predictions must be finished to move on but are
 * never scored.
 */

var App = (function () {
  'use strict';

  /* Bump whenever the step list, a quiz pool or a molecule changes: a save
     from an older release is then discarded and the student starts fresh. */
  var SCHEMA = 3;

  var h = UI.h;

  var PARTS = [
    { n: 1, name: 'Lewis to 3D' },
    { n: 2, name: 'Molecular geometry' },
    { n: 3, name: 'Polarity' },
    { n: 4, name: 'Results' }
  ];

  var STEPS = [
    { id: 'flat', part: 1, kind: 'flat', sp: 'CH4', title: 'A Lewis structure is flat. A molecule is not.',
      text: 'The Lewis structure of methane, CH₄, on the left, and the molecule itself on the right. Predict first, ' +
            'then let the electron domains spread out.' },
    { id: 'b-H2O', part: 1, kind: 'build', sp: 'H2O',
      text: 'Build water with the 5 rules. The 3D window follows your drawing. When the structure is finished, ' +
            'count the electron domains around O.',
      after: 'Four domains point to the corners of a tetrahedron, but two of them are lone pairs. The atoms make a ' +
             'bent shape. Part 2 looks at what lone pairs do to the angle.' },
    { id: 'b-CO2', part: 1, kind: 'build', sp: 'CO2',
      text: 'Build carbon dioxide. Watch what Rule 5 does, then count the domains around C.',
      after: 'Each double bond is ONE domain: it fills the same space between C and its O that a single bond or a ' +
             'lone pair would. Two domains get as far apart as they can: a straight line.' },
    { id: 'b-BF3', part: 1, kind: 'build', sp: 'BF3',
      text: 'Build boron trifluoride, one of the exceptions. Then count the domains around B.',
      after: 'Three domains spread out in a flat triangle, 120° apart. BF₃ really is flat: the Lewis structure ' +
             'only had the angles wrong.' },
    { id: 'quiz-A', part: 1, kind: 'quiz', quiz: 'A', title: 'Checkpoint 1' },

    { id: 'gallery', part: 2, kind: 'gallery', title: 'From 2 to 6 electron domains',
      set: ['BeF2', 'BF3', 'CH4', 'PCl5', 'SF6'],
      text: 'None of these has a lone pair on its central atom. Look at each one in 3D, then drag each name onto ' +
            'its molecule (or click a name, then a molecule).' },
    { id: 'squeeze', part: 2, kind: 'squeeze', title: 'Lone pairs push harder', set: ['CH4', 'NH3', 'H2O'],
      text: 'CH₄, NH₃ and H₂O all have 4 electron domains. Predict what each lone pair does to the bond angle.' },
    { id: 'sort', part: 2, kind: 'sort', title: 'Name the geometry by its atoms',
      look: ['CH4', 'NH3', 'H2O'],
      cards: ['CCl4', 'PCl3', 'OF2', 'NH4', 'ClO3', 'H2S', 'SO4', 'H3O', 'ClO2'],
      bins: ['tetrahedral', 'trigonal pyramidal', 'bent'],
      text: 'With 4 domains, the domains always point to the corners of a tetrahedron. The molecular geometry names ' +
            'only where the atoms are. Hide the lone pairs to see it, then sort the Lewis structures.' },
    { id: 'quiz-B', part: 2, kind: 'quiz', quiz: 'B', title: 'Checkpoint 2' },

    { id: 'symmetry', part: 3, kind: 'charges', title: 'Radial symmetry', predict: 'co2', first: 'CO2',
      set: ['CO2', 'BF3', 'CH4', 'SF6', 'H2O', 'NH3'],
      text: 'A molecule is radially symmetric when it looks the same in every direction from its central atom: no ' +
            'lone pair on the central atom, and every outer atom the same. Then the pulls of its polar bonds cancel ' +
            'each other out. For each molecule: is it radially symmetric? Then: polar or nonpolar?' },
    { id: 'outer', part: 3, kind: 'charges', title: 'Same shape: is it radially symmetric?', hidden: true,
      set: ['CH4', 'CH3Cl', 'CH2Cl2', 'CHCl3', 'CCl4'],
      text: 'All five are tetrahedral with no lone pair on C. The shape is the same, so what decides polarity? Radial ' +
            'symmetry. Decide for each one, then see its charges.' },
    { id: 'field', part: 3, kind: 'field', title: 'The electric field test', predict: 'field',
      set: ['H2O', 'CO2', 'NH3', 'CCl4', 'CH2Cl2', 'BF3'],
      text: 'Molecules tumble between two charged plates. Predict, then switch the field on.' },
    { id: 'quiz-C', part: 3, kind: 'quiz', quiz: 'C', title: 'Checkpoint 3' },

    { id: 'results', part: 4, kind: 'results', title: 'Results', text: '' }
  ];

  /* Every prediction the steps ask, with its key. Predictions are never
     graded; tools/validate.js checks each key against the model so the
     reveal never contradicts the picture. */
  var PREDICT = {
    flat: { q: 'In the Lewis structure, the H–C–H angle looks like 90°. In a real CH₄ molecule, how big is it?',
      choices: ['109.5°: the four bonds spread out in 3D', '90°, just as it is drawn', '120°: the bonds spread out, but stay flat',
                '180°'], answer: 0, fact: ['angle', 'CH4', 0] },
    nh3: { q: 'NH₃ also has 4 electron domains, but one of them is a lone pair. Compared with CH₄’s 109.5°, the ' +
      'H–N–H angle will be:', choices: ['Smaller than 109.5°', 'Exactly 109.5°', 'Bigger than 109.5°'], answer: 0,
      fact: ['angle', 'NH3', '<109.5°'] },
    h2o: { q: 'H₂O has two lone pairs. Compared with NH₃, the H–O–H angle will be:',
      choices: ['Smaller still', 'The same as in NH₃', 'Bigger, back to 109.5°'], answer: 0,
      fact: ['angle', 'H2O', '<<109.5°'] },
    co2: { q: 'CO₂ has two polar C=O bonds (O is more electronegative than C). Is the CO₂ molecule polar?',
      choices: ['No: it is radially symmetric, so its polar bonds cancel each other out', 'Yes: its bonds are polar', 'You can’t tell'], answer: 0,
      fact: ['polar', 'CO2', false] },
    field: { q: 'When the field is switched on, which molecules will turn to line up with it?',
      choices: null, answer: 0 }
  };

  /* the field prediction's choices come from the model: the polar ones, the
     nonpolar ones, all, none */
  function fieldChoices(set) {
    var pol = set.filter(function (id) { return VSEPR.polar(id); });
    var non = set.filter(function (id) { return !VSEPR.polar(id); });
    function names(ids) { return ids.map(function (id) { return Lewis.species(id).text; }).join(', '); }
    return ['Only ' + names(pol), 'All six: every one of them has polar bonds', 'Only ' + names(non),
            'None of them: a molecule has no overall charge'];
  }

  var GRADED = Object.keys(QUIZZES).reduce(function (s, k) { return s + QUIZZES[k].draw; }, 0);

  var el = {};
  var state = null;
  var ctl = null;           /* the current step's controller */
  var preview = false;      /* ?step= teacher preview: nothing is saved or reported */
  var snarks = 0;           /* expanded-octet attempts, this page load only; never saved or reported */

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }

  /* ---------------------------------------------------------------- helpers */

  function $(id) { return document.getElementById(id); }

  function say(text, kind) {
    el.feedback.textContent = text || '';
    el.feedback.className = 'feedback' + (kind ? ' ' + kind : '');
  }

  /* During a build the feedback line sits inside the builder, under its
     buttons, so it appears next to what was just clicked. */
  function feedbackInto(node) {
    var work = node && node.querySelector('.work');
    if (work) work.appendChild(el.feedback);
    else el.fbHome.parent.insertBefore(el.feedback, el.fbHome.next);
  }

  function stepIndex(id) {
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === id) return i;
    return -1;
  }

  function sp(id) { return Lewis.species(id); }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  function stepTitle(s) {
    if (s.kind !== 'build') return s.title;
    var x = sp(s.sp);
    return 'Build ' + x.text + ', ' + x.name;
  }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  /* The anti-AI message, as in the Lewis structures activity. None of the
     builds here has a period-3 central atom, so it should never be needed,
     but the builder knows how to ask for it. */
  function hasO(x) { return x.parts.some(function (p) { return p.el === 'O'; }); }
  function snarkText(x, e) {
    snarks++;
    var vars = { X: x ? x.center : '', F: x ? x.text : '', e: e != null ? e : 8, n: snarks };
    var lines = snarks > 1 ? SNARK.again : hasO(x) ? SNARK.first.concat(SNARK.firstOxy) : SNARK.first;
    return UI.fill(pick(lines), vars) + ' ' + UI.fill(SNARK.fix, vars) + pick(SNARK.cheer);
  }

  /* ------------------------------------------------------------------ state */

  function newState() {
    var seed = Math.floor(Math.random() * 1e9);
    var rand = UI.rng(seed);
    var draws = {};
    Object.keys(QUIZZES).forEach(function (k) {
      var Q = QUIZZES[k];
      var core = Q.core.slice();
      var rest = UI.shuffle(Q.pool.map(function (q) { return q.id; }).filter(function (id) {
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
    var ok = Object.keys(QUIZZES).every(function (k) {
      return (saved.draws[k] || []).length === QUIZZES[k].draw && saved.draws[k].every(function (id) {
        return QUIZZES[k].pool.some(function (q) { return q.id === id; });
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

  function newAttempt() {
    var keep = { best: Math.max(state.best || 0, state.fin ? attemptPercent() : 0), att: (state.att || 1) + 1,
                 max: state.max };
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
    el.stepTitle.textContent = stepTitle(s);
    el.counter.textContent = 'Step ' + (i + 1) + ' of ' + STEPS.length;
    var text = s.kind === 'quiz'
      ? 'Graded: your first answer to each question counts. Read the explanation after each one.' +
        (s.quiz === 'C' ? ' The electronegativity table is open beside the questions.' : '')
      : s.text;
    el.instructions.textContent = text;
    el.instructions.hidden = !text;
    feedbackInto(null);
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

  function showArea(node) {
    try { node.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' }); }
    catch (e) { node.scrollIntoView(false); }
  }

  function predictCard(p, chosen, onPick, choices) {
    var box = h('div', { class: 'predict' }, [
      h('p', { class: 'predict-kicker', text: 'Predict (not graded)' }),
      h('p', { class: 'q-text', text: p.q })
    ]);
    var row = h('div', { class: 'q-choices' });
    (choices || p.choices).forEach(function (c, i) {
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

  function verdict(p, chosen, choices) {
    if (chosen == null) return '';
    return chosen === p.answer ? 'Your prediction was right. ' : 'You predicted “' + (choices || p.choices)[chosen] + '”. ';
  }

  /* The 3D window: a canvas, and a line on how to turn it. */
  function m3Panel(title, opts) {
    opts = opts || {};
    var canvas = h('canvas', { class: 'v3d' });
    var wrap = h('div', { class: 'v3d-wrap' + (opts.small ? ' small' : '') }, [canvas]);
    var note = h('p', { class: 'v3d-note', text: 'Drag to turn it, or Tab to it and use the arrow keys.' });
    var node = panel(title || '3D', opts.hint || null, [wrap, note], 'p3d');
    var viewer = new Viewer3D(canvas, opts);
    return { node: node, viewer: viewer, canvas: canvas, note: note };
  }

  function describe3D(id) {
    var i = VSEPR.info(id);
    var outer = Lewis.DIRS.filter(function (d) { return Lewis.has(i.s, d); }).map(function (d) { return i.s.at[d]; });
    return '3D model of ' + i.sp.text + ': ' + i.geometry + '. ' + i.sp.center + ' bonded to ' + outer.join(', ') +
      (i.lp ? ', with ' + Lewis.pairs(i.lp) : ', no lone pairs') + '. Bond angle ' + i.angle + '.';
  }

  function lewisFig(id, scale, cls) {
    return Draw.structure(VSEPR.finished(id), { frame: 'fit', scale: scale || 1, cls: cls || 'fig' });
  }

  function lewisPanel(id) {
    var host = h('div', { class: 'lewis-host' }, [lewisFig(id, 1.1, 'big')]);
    return { node: panel('Lewis structure', null, [host], 'plewis'), set: function (x) {
      host.innerHTML = '';
      host.appendChild(lewisFig(x, 1.1, 'big'));
    } };
  }

  /* three side-by-side cells that stack on a narrow screen */
  function row(kind, cells) {
    return h('div', { class: 'work-row row-' + kind }, cells.filter(Boolean));
  }

  var RENDER = {};

  /* ---- a Lewis structure is flat */

  RENDER.flat = function (s) {
    var p = PREDICT.flat, id = s.sp;
    var lp = lewisPanel(id);
    var m3 = m3Panel('The molecule', { model: VSEPR.modelFlat(VSEPR.finished(id)), flat: true });
    m3.canvas.setAttribute('aria-label', 'CH₄ drawn flat, exactly like its Lewis structure, seen straight on.');
    var side = h('div', { class: 'predict-host' });
    el.stage.appendChild(row('flat', [lp.node, m3.node, panel('Your turn', null, [side])]));
    var spreadBtn = h('button', { type: 'button', class: 'primary', text: 'Let the domains spread out' });
    var again = h('button', { type: 'button', class: 'ghostbtn', text: 'Replay', hidden: true });
    function play() {
      spreadBtn.disabled = true;
      m3.viewer.spread(VSEPR.modelFlat(VSEPR.finished(id)), VSEPR.model3D(id), function () {
        m3.canvas.setAttribute('aria-label', describe3D(id));
        spreadBtn.hidden = true;
        again.hidden = false;
        side.appendChild(reveal([
          verdict(p, state.pr.flat) + 'Electron domains are negative, so they push each other as far apart as ' +
            'they can. Flat on paper, the four bonds can only get 90° apart. In 3D they get 109.5° apart: the ' +
            'H atoms sit at the corners of a tetrahedron.',
          'A Lewis structure shows what is bonded to what, and where the lone pairs are. It does not show the ' +
            'shape. VSEPR (valence shell electron pair repulsion) does.'
        ]));
        if (!state.done[s.id]) complete('Turn the molecule to see the tetrahedron from every side.');
      });
    }
    spreadBtn.addEventListener('click', play);
    again.addEventListener('click', function () {
      side.querySelectorAll('.reveal').forEach(function (r) { r.remove(); });
      again.hidden = true;
      spreadBtn.hidden = false;
      m3.viewer.setModel(VSEPR.modelFlat(VSEPR.finished(id)));
      play();
    });
    function draw() {
      side.innerHTML = '';
      side.appendChild(predictCard(p, state.pr.flat, function (i) {
        state.pr.flat = i;
        persist();
        draw();
      }));
      if (state.pr.flat != null) side.appendChild(h('div', { class: 'btnrow' }, [spreadBtn, again]));
    }
    draw();
    if (state.done[s.id]) play();
    return { destroy: function () { m3.viewer.destroy(); } };
  };

  /* ---- build with the 5 rules, the 3D window beside it */

  RENDER.build = function (s) {
    var x = sp(s.sp), id = s.sp, X = x.center;
    var info = VSEPR.info(id);
    var m3 = m3Panel('3D window', { flat: true });
    var count = h('div', { class: 'count-box' });
    m3.node.appendChild(count);
    var spread = false, flatNow = null, finalS = null, misses = 0;

    function follow(st) {
      if (spread) return;
      if (!st.s.at.C) {
        m3.viewer.setModel({ atoms: [], bonds: [], lps: [], arcs: [], flat: true });
        m3.canvas.setAttribute('aria-label', 'Empty: the molecule appears here as you build it.');
        m3.note.textContent = 'Your molecule appears here as you build it, seen straight on, as flat as the drawing.';
        return;
      }
      var first = !flatNow;
      flatNow = VSEPR.modelFlat(st.s);
      m3.viewer.setModel(flatNow, !first);
      m3.canvas.setAttribute('aria-label', 'The structure so far, drawn flat in 3D: ' + Lewis.describe(st.s));
      m3.note.textContent = 'Still as flat as the drawing. Drag to turn it, or Tab to it and use the arrow keys.';
      if (st.finished) finalS = Lewis.clone(st.s);
    }

    function askCount() {
      count.innerHTML = '';
      var q = h('p', { class: 'q-text', text: 'How many electron domains are around ' + X + '?' });
      var btns = h('div', { class: 'count-row' }, [2, 3, 4, 5, 6].map(function (n) {
        return h('button', { type: 'button', class: 'choice count', text: String(n), onclick: function () { answer(n); } });
      }));
      count.appendChild(h('div', { class: 'predict' }, [h('p', { class: 'predict-kicker', text: 'Count (not graded)' }), q, btns]));
      showArea(count);
    }

    function answer(n) {
      var d = VSEPR.domains(finalS || VSEPR.finished(id));
      if (n !== d.total) {
        misses++;
        var orders = Lewis.DIRS.filter(function (k) { return Lewis.has(finalS, k); })
          .reduce(function (a, k) { return a + (finalS.bo[k] || 1); }, 0);
        var msg;
        if (d.lp && n === d.bonds) msg = 'Count the lone pairs on ' + X + ' too: each lone pair is one domain.';
        else if (orders > d.bonds && n === orders + d.lp) msg = 'A double or triple bond is ONE domain: it fills the ' +
          'same space a single bond or a lone pair would. Count each atom bonded to ' + X + ' once.';
        else msg = 'Count each atom bonded to ' + X + ' once, whatever kind of bond it is, then add the lone pairs on ' + X + '.';
        if (misses >= 2) msg += ' Here: ' + d.bonds + ' bonded atom' + (d.bonds > 1 ? 's' : '') + (d.lp ? ' + ' + Lewis.pairs(d.lp) : '') +
          ' = ' + d.total + '.';
        say(msg, 'bad');
        return;
      }
      count.innerHTML = '';
      say('Yes: ' + d.total + ' electron domains. Watch them spread out.', 'good');
      solid(true);
    }

    function solid(animate) {
      spread = true;
      var fin = finalS || VSEPR.finished(id);
      var to = VSEPR.model(fin, { id: id });
      function after() {
        m3.canvas.setAttribute('aria-label', describe3D(id));
        m3.note.textContent = 'Drag to turn it, or Tab to it and use the arrow keys.';
        count.innerHTML = '';
        count.appendChild(reveal([
          info.domains + ' electron domains, ' + Lewis.pairs(info.lp) + ' on ' + X + ': ' + info.geometry + ', ' +
            info.angle + '.',
          s.after
        ]));
        if (!state.done[s.id]) complete();
      }
      if (animate) m3.viewer.spread(VSEPR.modelFlat(fin), to, after);
      else { m3.viewer.setModel(to); after(); }
    }

    var b = Builder({
      sp: x, table: false, showAfter: 2, done: !!state.done[s.id], say: say, snark: snarkText,
      onChange: follow,
      onDone: function () { askCount(); }
    });
    b.node.classList.add('with-3d');
    b.node.appendChild(m3.node);
    el.stage.appendChild(b.node);
    feedbackInto(b.node);
    if (state.done[s.id]) { solid(false); say('Already built. Press Next to go on.', 'good'); }
    return { destroy: function () { b.destroy(); m3.viewer.destroy(); }, builder: b };
  };

  /* ---- 2 to 6 domains: look, then name */

  RENDER.gallery = function (s) {
    /* shuffled for each student: not 2, then 3, then 4 domains */
    var set = mixed(s);
    var cur = set[0];
    var named = {};
    if (state.done[s.id]) set.forEach(function (id) { named[id] = VSEPR.info(id).geometry; });
    var lp = lewisPanel(cur);
    var m3 = m3Panel('3D', { model: VSEPR.model3D(cur) });
    var title = h('p', { class: 'readout' });
    m3.node.insertBefore(title, m3.node.children[1]);
    var tray = h('div', { class: 'tray names' });
    var cards = h('div', { class: 'cards' });
    var namePanel = panel('Name each geometry', null, [tray, cards], 'pnames');
    el.stage.appendChild(row('gallery', [lp.node, m3.node, namePanel]));

    function show(id) {
      cur = id;
      lp.set(id);
      m3.viewer.setModel(VSEPR.model3D(id));
      var i = VSEPR.info(id);
      title.textContent = i.sp.text + ': ' + i.domains + ' electron domains, no lone pairs on ' + i.sp.center;
      m3.canvas.setAttribute('aria-label', describe3D(id).replace(/: [a-z ]+\./, '.'));
      paint();
    }

    var names = UI.shuffle(set.map(function (id) { return VSEPR.info(id).geometry; }), UI.rng(state.seed ^ UI.hash('names')));
    function paint() {
      tray.innerHTML = '';
      names.forEach(function (n, k) {
        var used = Object.keys(named).some(function (id) { return named[id] === n; });
        if (!used) tray.appendChild(h('button', { type: 'button', class: 'tile term', 'data-tile': String(k), text: n }));
      });
      if (!tray.children.length) tray.appendChild(h('p', { class: 'tray-empty', text: 'Every molecule is named.' }));
      cards.innerHTML = '';
      set.forEach(function (id) {
        var i = VSEPR.info(id);
        var look = h('button', { type: 'button', class: 'mini' + (id === cur ? ' on' : ''), 'aria-pressed': id === cur ? 'true' : 'false',
          text: 'Show ' + i.sp.text, onclick: function () { show(id); } });
        var slot = named[id]
          ? h('span', { class: 'name-slot filled', text: named[id] })
          : h('button', { type: 'button', class: 'drop name-slot', 'data-drop': id, 'aria-label': 'Name for ' + i.sp.text, text: 'drop a name' });
        cards.appendChild(h('div', { class: 'card' + (id === cur ? ' current' : '') }, [
          h('div', { class: 'card-head' }, [h('b', { text: i.sp.text }), h('span', { class: 'muted', text: i.domains + ' domains' })]),
          slot, look
        ]));
      });
    }

    var picker = Picker({
      tray: tray, stage: cards,
      label: function (k) { return names[+k]; },
      prompt: function (k) { return 'Now click the molecule that is ' + names[+k] + '.'; },
      say: function (t) { say(t); },
      drop: function (id, k) {
        var n = names[+k], i = VSEPR.info(id);
        if (named[id]) return;
        if (i.geometry === n) {
          named[id] = n;
          say('Yes: ' + i.sp.text + ' is ' + n + ', ' + i.angle + '.', 'good');
          show(id);
          if (Object.keys(named).length === set.length && !state.done[s.id]) {
            complete('All five named. Every one is radially even: no lone pairs, so the outer atoms spread out ' +
                     'as far as they can.');
          }
          return;
        }
        var other = set.filter(function (x) { return VSEPR.info(x).geometry === n; })[0];
        say('Not ' + n + ': ' + i.sp.text + ' has ' + i.domains + ' domains, and ' + n + ' is the geometry for ' +
            VSEPR.info(other).domains + '. Look at it in 3D and count the atoms around ' + i.sp.center + '.', 'bad');
        show(id);
      }
    });
    show(cur);
    return { destroy: function () { picker.destroy(); m3.viewer.destroy(); } };
  };

  /* ---- lone pairs squeeze the angle */

  RENDER.squeeze = function (s) {
    var order = s.set, at = state.done[s.id] ? 2 : state.pr.h2o != null ? 2 : state.pr.nh3 != null ? 1 : 0;
    var lp = lewisPanel(order[at]);
    var m3 = m3Panel('3D, with the bond angle', { model: VSEPR.model3D(order[at]) });
    var tabs = h('div', { class: 'chips' });
    var side = h('div', { class: 'predict-host' });
    el.stage.appendChild(row('squeeze', [lp.node, m3.node, panel('What the lone pairs do', null, [tabs, side])]));

    var NOTES = {
      CH4: 'CH₄: 4 domains, all bonds. They spread out evenly: 109.5°.',
      NH3: 'NH₃: one lone pair. A lone pair is held by only one nucleus, so it spreads out wider and repels ' +
           'more strongly than a bonding pair. It pushes the three bonds closer together: less than 109.5° (<109.5°).',
      H2O: 'H₂O: two lone pairs, each repelling more strongly than a bond. They squeeze the two bonds closer ' +
           'still: much less than 109.5° (<<109.5°).'
    };

    function show(k) {
      var id = order[k];
      lp.set(id);
      m3.viewer.setModel(VSEPR.model3D(id));
      m3.canvas.setAttribute('aria-label', describe3D(id));
      tabs.innerHTML = '';
      order.forEach(function (x, j) {
        if (j > at) return;
        tabs.appendChild(h('button', { type: 'button', class: 'chip' + (j === k ? ' on' : ''), text: sp(x).text,
          'aria-pressed': j === k ? 'true' : 'false', onclick: function () { show(j); } }));
      });
    }

    function draw() {
      side.innerHTML = '';
      var lines = [NOTES.CH4];
      if (state.pr.nh3 != null) lines.push(verdict(PREDICT.nh3, state.pr.nh3) + NOTES.NH3);
      if (state.pr.h2o != null) lines.push(verdict(PREDICT.h2o, state.pr.h2o) + NOTES.H2O);
      side.appendChild(reveal(lines));
      if (state.pr.nh3 == null) {
        side.appendChild(predictCard(PREDICT.nh3, null, function (i) {
          state.pr.nh3 = i; at = 1; persist(); draw(); show(1);
        }));
      } else if (state.pr.h2o == null) {
        side.appendChild(predictCard(PREDICT.h2o, null, function (i) {
          state.pr.h2o = i; at = 2; persist(); draw(); show(2);
        }));
      } else {
        side.appendChild(reveal(['The rule: 4 domains with no lone pairs, 109.5°; one lone pair, <109.5°; two lone ' +
          'pairs, <<109.5°. Lone pairs repel more strongly than shared pairs.']));
        if (!state.done[s.id]) complete('Click CH₄, NH₃ and H₂O to compare them.');
      }
    }
    draw();
    show(at);
    return { destroy: function () { m3.viewer.destroy(); } };
  };

  /* ---- name the geometry by its atoms: hide the lone pairs, then sort */

  RENDER.sort = function (s) {
    /* the structures in a different order for each student */
    var mix = {};
    Object.keys(s).forEach(function (k) { mix[k] = s[k]; });
    mix.cards = UI.shuffle(s.cards, UI.rng(state.seed ^ UI.hash(s.id)));
    s = mix;
    var cur = s.look[1];
    var m3 = m3Panel('Domains or atoms?', { model: VSEPR.model3D(cur), small: true });
    var chips = h('div', { class: 'chips' });
    var hide = h('button', { type: 'button', class: 'mini', 'aria-pressed': 'false', text: 'Hide the lone pairs' });
    var read = h('p', { class: 'readout' });
    m3.node.insertBefore(h('div', { class: 'btnrow tight' }, [chips, hide]), m3.node.children[1]);
    m3.node.appendChild(read);
    var hidden = false;
    function look(id) {
      cur = id;
      m3.viewer.setModel(VSEPR.model3D(id), true);
      m3.viewer.setLP(!hidden);
      var i = VSEPR.info(id);
      read.textContent = hidden ? 'Atoms only: ' + i.geometry + '.'
        : i.sp.text + ': 4 domains pointing to the corners of a tetrahedron, ' + Lewis.pairs(i.lp) + '.';
      m3.canvas.setAttribute('aria-label', describe3D(id) + (hidden ? ' Lone pairs hidden.' : ''));
      chips.innerHTML = '';
      s.look.forEach(function (x) {
        chips.appendChild(h('button', { type: 'button', class: 'chip' + (x === id ? ' on' : ''), text: sp(x).text,
          'aria-pressed': x === id ? 'true' : 'false', onclick: function () { look(x); } }));
      });
    }
    hide.addEventListener('click', function () {
      hidden = !hidden;
      hide.setAttribute('aria-pressed', hidden ? 'true' : 'false');
      hide.textContent = hidden ? 'Show the lone pairs' : 'Hide the lone pairs';
      look(cur);
    });

    var placed = {};
    if (state.done[s.id]) s.cards.forEach(function (id) { placed[id] = VSEPR.info(id).geometry; });
    var tray = h('div', { class: 'tray cards-tray' });
    var bins = h('div', { class: 'bins' });
    el.stage.appendChild(row('sort', [m3.node, panel('Sort by molecular geometry', 'drag, or click a structure and then a box',
      [tray, bins], 'psort')]));

    function paint() {
      tray.innerHTML = '';
      s.cards.forEach(function (id, k) {
        if (placed[id]) return;
        tray.appendChild(h('button', { type: 'button', class: 'tile lewis-tile', 'data-tile': String(k),
          'aria-label': sp(id).text + ', ' + sp(id).name + '. ' + Lewis.describe(VSEPR.finished(id)) }, [lewisFig(id, 0.6, 'tile-fig')]));
      });
      if (!tray.children.length) tray.appendChild(h('p', { class: 'tray-empty', text: 'All sorted.' }));
      bins.innerHTML = '';
      s.bins.forEach(function (name) {
        var inside = s.cards.filter(function (id) { return placed[id] === name; });
        bins.appendChild(h('div', { class: 'bin drop', 'data-drop': name, tabindex: '0', role: 'button',
          'aria-label': name + ' box' + (inside.length ? ', holding ' + inside.map(function (id) { return sp(id).text; }).join(', ') : '') }, [
          h('div', { class: 'bin-head', text: cap(name) }),
          h('div', { class: 'bin-body' }, inside.map(function (id) { return h('span', { class: 'bin-chip', text: sp(id).text }); }))
        ]));
      });
    }

    var picker = Picker({
      tray: tray, stage: bins,
      label: function (k) { return sp(s.cards[+k]).text; },
      prompt: function (k) { return 'Now click the box for ' + sp(s.cards[+k]).text + '.'; },
      say: function (t) { say(t); },
      drop: function (name, k) {
        var id = s.cards[+k], i = VSEPR.info(id);
        if (placed[id]) return;
        if (i.geometry === name) {
          placed[id] = name;
          paint();
          say(i.sp.text + ': ' + i.sp.center + ' has ' + Lewis.pairs(i.lp) + ', so it is ' + name + '.', 'good');
          if (Object.keys(placed).length === s.cards.length && !state.done[s.id]) {
            complete('All nine sorted. Ions get their geometry the same way as molecules.');
          }
          return;
        }
        var why = i.lp === 0 ? 'no lone pairs on ' + i.sp.center + ', so all four domains are atoms'
          : Lewis.pairs(i.lp) + ' on ' + i.sp.center + ', so ' + (4 - i.lp) + ' of the 4 domains are atoms';
        say('Not ' + name + '. ' + i.sp.text + ' has ' + why + '. Count the lone pairs on the central atom.', 'bad');
      }
    });
    paint();
    look(cur);
    return { destroy: function () { picker.destroy(); m3.viewer.destroy(); } };
  };

  /* ---- polarity: charges and the two centres */

  function enTable(els) {
    var t = h('table', { class: 'ref-table en-table' });
    t.appendChild(h('tr', null, [h('th', { text: 'Element' }), h('th', { text: 'Electronegativity' })]));
    els.forEach(function (e) {
      t.appendChild(h('tr', null, [h('td', { class: 'el-' + e.toLowerCase(), text: e }), h('td', { class: 'num', text: ELEMENTS[e].en.toFixed(2) })]));
    });
    return t;
  }

  function elementsOf(ids) {
    var seen = [];
    ids.forEach(function (id) { sp(id).parts.forEach(function (p) { if (seen.indexOf(p.el) < 0) seen.push(p.el); }); });
    return seen.sort(function (a, b) { return ELEMENTS[a].en - ELEMENTS[b].en; });
  }

  /* the step's molecules in a fixed random order for this student, so the
     nonpolar ones do not all come first; a step's `first` stays first */
  function mixed(s) {
    var rest = s.set.filter(function (id) { return id !== s.first; });
    rest = UI.shuffle(rest, UI.rng(state.seed ^ UI.hash(s.id)));
    return s.first ? [s.first].concat(rest) : rest;
  }

  /* the radial symmetry test for one molecule, as two checks */
  function symmetryBox(id) {
    var y = VSEPR.symmetry(id);
    function line(ok, text) {
      return h('li', { class: ok ? 'ok' : 'no' }, [h('span', { class: 'mark', 'aria-hidden': 'true', text: ok ? '✓' : '✗' }),
        h('span', { class: 'sr', text: ok ? 'Yes: ' : 'No: ' }), text]);
    }
    return h('div', { class: 'symbox' + (y.symmetric ? ' sym' : ' asym') }, [
      h('p', { class: 'symbox-head', text: 'Radial symmetry test for ' + y.text }),
      h('ul', { class: 'symlist' }, [
        line(y.lpFree, y.lpFree ? 'No lone pair on ' + y.centre : Lewis.pairs(y.lp) + ' on ' + y.centre),
        line(y.sameOuter, y.sameOuter ? 'Every outer atom the same (' + VSEPR.outerList(y.outer) + ')'
          : 'Outer atoms not all the same (' + VSEPR.outerList(y.outer) + ')')
      ]),
      h('p', { class: 'symbox-foot', text: y.symmetric ? 'Radially symmetric: the pulls of its polar bonds cancel each other out.'
        : 'Not radially symmetric: the pulls of its polar bonds do not cancel.' })
    ]);
  }

  RENDER.charges = function (s) {
    var order = mixed(s);
    var symOk = {};      /* id → 1 once "radially symmetric?" is answered right */
    var marks = {};      /* id → 'polar' | 'nonpolar' once "polar?" is answered right */
    if (state.done[s.id]) order.forEach(function (id) { symOk[id] = 1; marks[id] = VSEPR.polar(id) ? 'polar' : 'nonpolar'; });
    var cur = order[0];
    var lp = lewisPanel(cur);
    var m3 = m3Panel('Charges', { model: VSEPR.model3D(cur), charges: false, centres: false, arcs: false });
    var legend = h('p', { class: 'key-row' }, [
      h('span', null, [h('span', { class: 'sw neg' }), 'δ−']), h('span', null, [h('span', { class: 'sw pos' }), 'δ+']),
      h('span', null, [h('span', { class: 'mk pos', text: '+' }), 'centre of positive charge']),
      h('span', null, [h('span', { class: 'mk neg', text: '−' }), 'centre of negative charge'])
    ]);
    m3.node.appendChild(legend);
    var chips = h('div', { class: 'chips' });
    var side = h('div', { class: 'predict-host' });
    var tableBox = h('details', { class: 'reference en-ref', open: true }, [h('summary', { text: 'Electronegativity' }),
      enTable(elementsOf(s.set))]);
    el.stage.appendChild(row('charges', [h('div', { class: 'col' }, [lp.node, tableBox]), m3.node,
      panel('Radially symmetric?', null, [chips, side])]));

    /* step 10 shows the charges as soon as its prediction is made; step 11
       (hidden) waits until the symmetry question is answered */
    function open(id) {
      if (s.predict && state.pr[s.predict] == null) return false;
      return !s.hidden || !!symOk[id];
    }

    function show(id) {
      cur = id;
      lp.set(id);
      m3.viewer.setModel(VSEPR.model3D(id));
      var o = open(id);
      m3.viewer.setCharges(o);
      m3.viewer.setCentres(o);
      m3.canvas.setAttribute('aria-label', describe3D(id).replace(/ Bond angle.*$/, '').replace(/: [a-z ]+\./, '.') +
        (o ? ' Charges shown.' : ' Charges hidden until you answer.') + (marks[id] ? ' ' + VSEPR.polarReason(id) : ''));
      paint();
    }

    function paint() {
      chips.innerHTML = '';
      order.forEach(function (id) {
        chips.appendChild(h('button', { type: 'button', class: 'chip' + (id === cur ? ' on' : '') + (marks[id] ? ' done' : ''),
          'aria-pressed': id === cur ? 'true' : 'false', text: sp(id).text + (marks[id] ? ' ✓' : ''), onclick: function () { show(id); } }));
      });
      side.innerHTML = '';
      if (s.predict && state.pr[s.predict] == null) {
        side.appendChild(predictCard(PREDICT[s.predict], null, function (i) {
          state.pr[s.predict] = i; persist(); show(cur);
        }));
        return;
      }
      if (s.predict) side.appendChild(reveal([verdict(PREDICT[s.predict], state.pr[s.predict]) +
        'Polar bonds are not enough. What decides it is radial symmetry: in a radially symmetric molecule the ' +
        'pulls of the polar bonds cancel each other out.']));
      var id = cur, y = VSEPR.symmetry(id);
      if (!symOk[id]) {
        side.appendChild(h('p', { class: 'q-text', text: 'Is ' + y.text + ' radially symmetric?' }));
        side.appendChild(h('p', { class: 'muted small', text: 'Check the Lewis structure: is there a lone pair on ' + y.centre +
          '? Are all the outer atoms the same?' }));
        side.appendChild(h('div', { class: 'q-choices two' }, [['yes', 'Yes, radially symmetric'], ['no', 'No, not radially symmetric']].map(function (c) {
          return h('button', { type: 'button', class: 'choice', text: c[1], onclick: function () { decideSym(id, c[0] === 'yes'); } });
        })));
      } else {
        side.appendChild(symmetryBox(id));
        if (!marks[id]) {
          side.appendChild(h('p', { class: 'q-text', text: 'So is ' + y.text + ' polar or nonpolar?' }));
          side.appendChild(h('div', { class: 'q-choices two' }, ['polar', 'nonpolar'].map(function (w) {
            return h('button', { type: 'button', class: 'choice', text: cap(w), onclick: function () { decidePolar(id, w); } });
          })));
        } else {
          side.appendChild(reveal([VSEPR.polarReason(id)]));
        }
      }
      var left = order.filter(function (x) { return !marks[x]; });
      if (!left.length) {
        if (!state.done[s.id]) complete(s.hidden
          ? 'All five are tetrahedral, yet only the radially symmetric ones (CH₄ and CCl₄) are nonpolar. The shape alone does not decide it: radial symmetry does.'
          : 'Radially symmetric: the bond pulls cancel, nonpolar. Not radially symmetric: they do not cancel, polar.');
      } else if (marks[id]) {
        var nxt = left[0];
        side.appendChild(h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary', text: 'Next molecule: ' + sp(nxt).text,
          onclick: function () { show(nxt); } })]));
      }
    }

    function decideSym(id, said) {
      var y = VSEPR.symmetry(id);
      if (said === y.symmetric) {
        symOk[id] = 1;
        say(y.symmetric ? 'Yes: radially symmetric. No lone pair on ' + y.centre + ' and every outer atom is ' + y.outer[0] + '.'
          : 'Yes: not radially symmetric. ' + (!y.lpFree ? 'The lone pair' + (y.lp > 1 ? 's' : '') + ' on ' + y.centre +
            ' break' + (y.lp > 1 ? '' : 's') + ' the symmetry.' : 'The outer atoms are not all the same.'), 'good');
        show(id);
        return;
      }
      if (y.symmetric) {
        say('Look again: ' + y.centre + ' has no lone pair, and every outer atom is ' + y.outer[0] + ', spread evenly around ' +
            y.centre + '. Whichever way you look from ' + y.centre + ', it is the same: radially symmetric.', 'bad');
      } else if (!y.lpFree) {
        say('Look at the central atom: ' + y.centre + ' has ' + Lewis.pairs(y.lp) + '. A lone pair takes up a side of ' + y.centre +
            ' where there is no atom, so it does not look the same in every direction: not radially symmetric.', 'bad');
      } else {
        say('Look at the outer atoms: ' + VSEPR.outerList(y.outer) + '. They are not all the same, so the pull is not the ' +
            'same in every direction around ' + y.centre + ': not radially symmetric.', 'bad');
      }
    }

    function decidePolar(id, w) {
      var y = VSEPR.symmetry(id), truth = VSEPR.polar(id) ? 'polar' : 'nonpolar';
      if (w === truth) {
        marks[id] = truth;
        say('Right: ' + (y.symmetric ? 'radially symmetric, so the bond pulls cancel: nonpolar.' : 'not radially symmetric, so the bond pulls do not cancel: polar.'), 'good');
        show(id);
      } else {
        say(y.symmetric ? 'Radially symmetric means its polar bonds pull equally in every direction, so they cancel each ' +
              'other out: no ends, nonpolar.'
            : 'Not radially symmetric means the pulls of its polar bonds do not cancel: one end is δ+ and the other δ−. ' +
              'That is polar.', 'bad');
      }
    }

    show(cur);
    return { destroy: function () { m3.viewer.destroy(); } };
  };

  /* ---- the electric field test */

  RENDER.field = function (s) {
    var p = PREDICT.field, choices = fieldChoices(s.set);
    var host = h('div', { class: 'field-host' });
    var btn = h('button', { type: 'button', class: 'primary', text: 'Switch the field on', disabled: true });
    var side = h('div', { class: 'predict-host' });
    el.stage.appendChild(row('field', [panel('Between the plates', null, [host, h('div', { class: 'btnrow' }, [btn])], 'pfield'),
      panel('Predict', null, [side])]));
    var sim = FieldSim(host, s.set);
    var timer = null;

    function draw() {
      side.innerHTML = '';
      side.appendChild(predictCard(p, state.pr.field, function (i) { state.pr.field = i; persist(); draw(); }, choices));
      btn.disabled = state.pr.field == null;
      if (state.done[s.id]) results();
    }
    function results() {
      var lined = sim.lined();
      var yes = s.set.filter(function (id) { return lined[id]; }), no = s.set.filter(function (id) { return !lined[id]; });
      var names = function (ids) { return ids.map(function (id) { return sp(id).text; }).join(', '); };
      side.appendChild(reveal([
        verdict(p, state.pr.field, choices) + names(yes) + ' turned to line up, δ− end toward the + plate. ' + names(no) +
          ' kept tumbling.',
        'Every one of these molecules has polar bonds. Only the ones that are not radially symmetric have a δ+ end ' +
          'and a δ− end for the plates to pull: they are polar. The radially symmetric ones spread their charge ' +
          'evenly, have no ends, and keep tumbling: nonpolar.'
      ]));
    }
    btn.addEventListener('click', function () {
      var on = !sim.isOn();
      sim.setField(on);
      btn.textContent = on ? 'Switch the field off' : 'Switch the field on';
      if (on && !state.done[s.id]) {
        say('Watch which molecules turn.');
        clearInterval(timer);
        timer = setInterval(function () {
          if (!sim.isOn()) return;
          if (sim.settled()) {
            clearInterval(timer);
            complete();
            draw();
          }
        }, 250);
      }
    });
    draw();
    if (state.done[s.id]) { sim.setField(true); btn.textContent = 'Switch the field off'; }
    return { destroy: function () { clearInterval(timer); sim.destroy(); } };
  };

  /* ---- quiz */

  function question(id) {
    for (var k in QUIZZES) {
      var pool = QUIZZES[k].pool;
      for (var i = 0; i < pool.length; i++) if (pool[i].id === id) return pool[i];
    }
    return null;
  }

  function figure(spec, cls) { return lewisFig(spec.lewis, 1, cls || 'fig'); }

  RENDER.quiz = function (s) {
    var Q = QUIZZES[s.quiz];
    var ids = state.draws[s.quiz];
    var box = h('div', { class: 'quiz' });
    var side = s.quiz === 'C'
      ? h('details', { class: 'reference quiz-table', open: true }, [h('summary', { text: 'Electronegativity' }),
        enTable(['Be', 'B', 'P', 'H', 'C', 'S', 'I', 'Br', 'N', 'Cl', 'O', 'F']),
        h('p', { class: 'ref-foot', text: 'Pauling values. The bigger the difference across a bond, the more polar the bond.' })])
      : null;
    el.stage.appendChild(h('div', { class: 'quiz-grid' + (side ? '' : ' single') }, [panel(Q.title, null, [box]), side]));

    function summary() {
      box.innerHTML = '';
      var right = ids.filter(function (id) { return state.ans[id]; }).length;
      box.appendChild(h('p', { class: 'q-summary', text: 'You answered ' + right + ' of ' + ids.length + ' correctly on the first try.' }));
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
      var order = UI.shuffle(q.choices.map(function (c, i) { return i; }), UI.rng(state.seed ^ UI.hash(id)));
      box.innerHTML = '';
      say('');
      box.appendChild(h('p', { class: 'q-count', text: 'Question ' + (n + 1) + ' of ' + ids.length }));
      box.appendChild(h('p', { class: 'q-text', text: q.q }));
      if (q.fig) box.appendChild(h('div', { class: 'q-fig' }, [figure(q.fig)]));
      var figs = typeof q.choices[0] !== 'string';
      var rowN = h('div', { class: 'q-choices' + (figs ? ' figs' : '') });
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
        if (typeof c !== 'string') b.setAttribute('aria-label', 'Choice ' + letter + ': ' + sp(c.lewis).text + ', ' +
          Lewis.describe(VSEPR.finished(c.lewis)));
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
    var rows = Object.keys(QUIZZES).map(function (k) {
      var ids = state.draws[k];
      var r = ids.filter(function (id) { return state.ans[id]; }).length;
      return h('tr', null, [h('td', { text: QUIZZES[k].title }), h('td', { class: 'num', text: r + ' / ' + ids.length })]);
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
      'Count the electron domains around the central atom: every bonded atom is one (single, double or triple), and every lone pair is one.',
      'Domains repel and get as far apart as they can: 2 linear (180°), 3 trigonal planar (120°), 4 tetrahedral (109.5°), 5 trigonal bipyramidal (90° and 120°), 6 octahedral (90°).',
      'The molecular geometry names only where the atoms are. With 4 domains: no lone pairs, tetrahedral; one lone pair, trigonal pyramidal; two lone pairs, bent.',
      'Lone pairs repel more strongly than shared pairs, so they squeeze the bond angle: 109.5°, then <109.5°, then <<109.5°.',
      'A radially symmetric molecule (no lone pairs on the central atom, all outer atoms the same) spreads its charge evenly: no ends, nonpolar, even if its bonds are polar.',
      'A molecule that is not radially symmetric (a lone pair on the central atom, or outer atoms that differ) has a δ+ end and a δ− end: polar. Polar molecules line up in an electric field.',
      'The shape name alone does not decide polarity: CH₄ and CH₃Cl are both tetrahedral. Radial symmetry decides it.'
    ].map(function (t) { return h('li', { text: t }); }))]);
    el.stage.appendChild(h('div', { class: 'grid2' }, [box, ideas]));
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

  /* ---- explore (teacher demo): ?explore or ?explore=NH3 */

  function explore(id) {
    var ids = Object.keys(SPECIES).filter(function (k) { return !VSEPR.info(k).lp || MEASURED_ANGLE[k]; });
    if (ids.indexOf(id) < 0) id = 'CH4';
    el.parts.hidden = true;
    nav('next', 'hidden', true);
    nav('back', 'hidden', true);
    el.score.hidden = true;
    el.stepTitle.textContent = 'Explore';
    el.counter.textContent = 'Teacher demo: nothing is saved';
    el.instructions.textContent = 'Pick any molecule. Nothing here is saved or graded.';
    var sel = h('select', { class: 'select', 'aria-label': 'Molecule' }, ids.map(function (k) {
      return h('option', { value: k, selected: k === id, text: sp(k).text + ', ' + sp(k).name });
    }));
    var charge = h('input', { type: 'checkbox' });
    var lp = lewisPanel(id);
    var m3 = m3Panel('3D', { model: VSEPR.model3D(id) });
    var read = h('p', { class: 'readout' });
    var spreadBtn = h('button', { type: 'button', class: 'ghostbtn', text: 'Spread from flat' });
    el.stage.appendChild(h('div', { class: 'btnrow' }, [sel, h('label', { class: 'check-label' }, [charge, ' Charges']), spreadBtn]));
    el.stage.appendChild(row('flat', [lp.node, m3.node, panel('About it', null, [read])]));
    function load() {
      var k = sel.value, i = VSEPR.info(k);
      lp.set(k);
      m3.viewer.setModel(VSEPR.model3D(k));
      m3.viewer.setCharges(charge.checked);
      m3.viewer.setCentres(charge.checked);
      read.textContent = i.domains + ' domains, ' + Lewis.pairs(i.lp) + ': ' + i.geometry + ', ' + i.angle + '. ' +
        (sp(k).charge ? '' : VSEPR.polarReason(k));
    }
    sel.addEventListener('change', load);
    charge.addEventListener('change', load);
    spreadBtn.addEventListener('click', function () {
      var k = sel.value;
      m3.viewer.spread(VSEPR.modelFlat(VSEPR.finished(k)), VSEPR.model3D(k));
    });
    load();
  }

  /* --------------------------------------------------------- references */

  function buildReference() {
    el.rulesBody.appendChild(Builder.rulesList(0, 0));
    el.enBody.appendChild(enTable(['Be', 'B', 'P', 'H', 'C', 'S', 'I', 'Br', 'N', 'Cl', 'O', 'F']));
    var dl = h('dl', { class: 'vocab' });
    [
      ['Electron domain', 'A region around the central atom where electrons sit: each bonded atom (single, double or triple bond) is one, and each lone pair is one.'],
      ['Lone pair', 'Two electrons that belong to one atom and are not shared. On the central atom it counts as a domain.'],
      ['VSEPR', 'Valence shell electron pair repulsion: electron domains repel each other and spread as far apart as they can. That spreading gives the molecule its shape.'],
      ['Molecular geometry', 'The shape the atoms make. It names only where the atoms are, not the lone pairs.'],
      ['Bond angle', 'The angle between two bonds on the same central atom.'],
      ['Electronegativity', 'How strongly an atom pulls on the electrons in a bond.'],
      ['δ+ and δ−', 'Partial charges. In a polar bond the more electronegative atom is δ− and the other is δ+.'],
      ['Radially symmetric', 'Evenly arranged all the way around the centre: no lone pairs on the central atom and every outer atom the same.'],
      ['Polar molecule', 'A molecule with a δ+ end and a δ− end: its centre of positive charge and centre of negative charge are in different places.'],
      ['Nonpolar molecule', 'A molecule with no ends: its charge is spread so evenly that the two centres are in the same place.']
    ].forEach(function (p) {
      dl.appendChild(h('dt', { text: p[0] }));
      dl.appendChild(h('dd', { text: p[1] }));
    });
    el.vocabBody.appendChild(dl);
  }

  /* ------------------------------------------------------------------ boot */

  function showIntro() {
    var box = h('div', { class: 'screen-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'introTitle' }, [
      h('h2', { id: 'introTitle', text: 'VSEPR: molecular geometry and polarity' }),
      h('p', { text: 'You will build Lewis structures with the 5 rules, watch them turn into 3D molecules, name ' +
                     'their shapes and angles, and find out which molecules are polar.' }),
      h('ul', { class: 'screen-list' }, [
        h('li', { text: 'Part 1, Lewis to 3D: electron domains spread out.' }),
        h('li', { text: 'Part 2, Molecular geometry: 2 to 6 domains, and what lone pairs do.' }),
        h('li', { text: 'Part 3, Polarity: is it radially symmetric?' })
      ]),
      h('p', { text: 'Predictions and builds are never graded, so try things. The three checkpoints are graded: your ' +
                     'first answer to each question counts. About 25 minutes. Your progress is saved if you leave.' }),
      h('p', { class: 'screen-note', text: 'Everything works with a mouse, a touch screen or the keyboard (Tab and Enter; ' +
                     'arrow keys turn a 3D molecule).' })
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
     'score', 'lms', 'screen', 'rulesBody', 'enBody', 'vocabBody'].forEach(function (id) { el[id] = $(id); });
    el.fbHome = { parent: el.feedback.parentNode, next: el.feedback.nextSibling };
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

  return { start: start, SCHEMA: SCHEMA, STEPS: STEPS, GRADED: GRADED, PREDICT: PREDICT, fieldChoices: fieldChoices,
           ctl: function () { return ctl; } };
})();

document.addEventListener('DOMContentLoaded', App.start);

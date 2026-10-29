/* app.js: the steps, their order, saving, scoring, and the pieces every
 * step is built from. The steps themselves are drawn by steps1.js (Parts 1
 * and 2) and steps2.js (Parts 3 and 4).
 *
 * Part 1  Energy and bonds: bond breaking is endothermic and bond making
 *         exothermic; homolytic and heterolytic; entropy; thermodynamically
 *         favorable; reading an energy diagram
 * Part 2  Nucleophiles and electrophiles
 * Part 3  The four patterns: nucleophilic attack, loss of a leaving group,
 *         proton transfer, carbocation rearrangement
 * Part 4  Combining the patterns: sequences, concerted steps, ⇌ or →
 *
 * Only the four checkpoints are graded (first answer counts; a graded
 * arrow drawing counts on its first Check). Arrows, sorts and predictions
 * must be finished to move on but are never scored: a wrong one gets an
 * explanation and another try.
 */

var App = (function () {
  'use strict';

  /* Bump whenever the step list, a quiz pool or a scene changes: a save
     from an older build is then discarded and the student starts fresh. */
  var SCHEMA = 1;

  var PARTS = [
    { n: 1, name: 'Energy and bonds' },
    { n: 2, name: 'Nucleophiles and electrophiles' },
    { n: 3, name: 'The four patterns' },
    { n: 4, name: 'Putting them together' },
    { n: 5, name: 'Results' }
  ];

  var STEPS = [
    { id: 'break', part: 1, kind: 'break', title: 'Breaking a bond takes energy',
      text: 'Bonding electrons sit low in energy. Predict first, then pull the H and the Cl apart with the slider, and let them bond again.' },
    { id: 'cleave', part: 1, kind: 'cleave', title: 'Homolytic or heterolytic?',
      text: 'A bond can break two ways. Play each one and watch where the two electrons of the bond go.' },
    { id: 'bonds', part: 1, kind: 'bonds', title: 'Bonds broken, bonds formed',
      text: 'Every bond broken takes energy in; every bond formed gives energy out. Click every bond that breaks, then every bond that forms.' },
    { id: 'entropy', part: 1, kind: 'entropy', title: 'Entropy: more ways to arrange',
      text: 'Entropy measures how many ways a system can be arranged. Play the expansion, then sort the reactions by the sign of ΔS for the system.' },
    { id: 'favor', part: 1, kind: 'favor', title: 'Thermodynamically favorable',
      text: 'ΔG = ΔH − TΔS. A reaction with ΔG < 0 is thermodynamically favorable. Fill in the table for each combination of signs.' },
    { id: 'diagram', part: 1, kind: 'diagram', title: 'Reading an energy diagram',
      text: 'Play each reaction and watch the dot on its energy diagram. Then click every transition state and every intermediate.' },
    { id: 'quiz-A', part: 1, kind: 'quiz', quiz: 'A', title: 'Checkpoint 1', text: '' },

    { id: 'rich', part: 2, kind: 'rich', title: 'Electron-rich, electron-poor',
      text: 'Ionic reactions happen when an electron-rich atom meets an electron-poor one. Predict first, then compare two compounds.' },
    { id: 'sort', part: 2, kind: 'sort', title: 'Nucleophile or electrophile?',
      text: 'Sort every compound or ion by how it will react (Klein Table 6.3 and Problem 6.8). Na⁺, Li⁺ and K⁺ are spectator ions.' },
    { id: 'centres', part: 2, kind: 'centres', title: 'Find the centres',
      text: 'One molecule can have both kinds of centre. Click every nucleophilic centre, then every electrophilic centre.' },
    { id: 'quiz-B', part: 2, kind: 'quiz', quiz: 'B', title: 'Checkpoint 2', text: '' },

    { id: 'read', part: 3, kind: 'read', title: 'Reading a curved arrow',
      text: 'The tail of a curved arrow is where the electrons are; the head is where they go. Play it, then judge five drawings by Klein’s rules.' },
    { id: 'nuc', part: 3, kind: 'draw', scenes: ['brAttack', 'acylAttack'], title: 'Pattern 1: nucleophilic attack',
      text: 'A nucleophile attacks an electrophile. Draw the curved arrows, check them, and watch the step happen.' },
    { id: 'lg', part: 3, kind: 'draw', scenes: ['brLoss', 'tetLoss'], title: 'Pattern 2: loss of a leaving group',
      text: 'A bond breaks and its pair leaves with the leaving group. Draw the curved arrows, check them, and watch.' },
    { id: 'pt', part: 3, kind: 'draw', scenes: ['protKetone', 'deprotKetone', 'alkeneH3O'], title: 'Pattern 3: proton transfer',
      text: 'A proton moves from one atom to another, leaving its electrons behind. Draw both curved arrows, check them, and watch.' },
    { id: 'stable', part: 3, kind: 'stable', title: 'Carbocation stability',
      text: 'Before the fourth pattern: which carbocations are most stable, and why? Put the four in order, from least to most stable.' },
    { id: 'shift', part: 3, kind: 'draw', scenes: ['shiftH', 'shiftMe'], hole: true, title: 'Pattern 4: carbocation rearrangement',
      text: 'An H or a CH₃ next door moves over, with its pair of electrons, to make a more stable carbocation. Draw the arrow, check it, and watch.' },
    { id: 'rearrange', part: 3, kind: 'rearrange', mols: ['r1', 'r3', 'r6', 'r4', 'r5', 'r7'], title: 'Will it rearrange?',
      text: 'Klein’s steps: find the carbons next to the C⁺, look at the H and CH₃ groups on them, and ask whether moving one makes a more stable carbocation.' },
    { id: 'name', part: 3, kind: 'name',
      scenes: ['nAllylLoss', 'nAllylWater', 'nArenium', 'nTbuClLoss', 'nPhShift', 'nCyclize', 'nAllylShift', 'nOxDeprot'],
      title: 'Name the pattern', text: 'Read the curved arrows in each step and name its pattern (Klein 6.11 and 6.27).' },
    { id: 'quiz-C', part: 3, kind: 'quiz', quiz: 'C', title: 'Checkpoint 3', text: '' },

    { id: 'sequence', part: 4, kind: 'sequence', chain: 'f631', title: 'One mechanism, four patterns',
      text: 'Klein Figure 6.31: four steps, one of each pattern. For each step, name the pattern, then draw its arrows.' },
    { id: 'concerted', part: 4, kind: 'concerted', title: 'Two patterns at once',
      text: 'Sometimes one step does two patterns at the same time. Draw it, then read a three-step mechanism and name its sequence.' },
    { id: 'reverse', part: 4, kind: 'reverse', title: '⇌ or →?',
      text: 'Klein 6.12: some steps are drawn with an equilibrium arrow, some with a one-way arrow. Sort each step by Klein’s rules.' },
    { id: 'quiz-D', part: 4, kind: 'quiz', quiz: 'D', title: 'Checkpoint 4', text: '' },

    { id: 'results', part: 5, kind: 'results', title: 'Results', text: '' }
  ];

  /* Every prediction the steps ask, with its key. Predictions are never
     graded; tools/validate.js checks every key against the model. */
  var PREDICT = {
    breakE: { q: 'Pulling the two atoms of a bond apart is:', choices: ['Endothermic: the system takes in energy', 'Exothermic: the system gives out energy', 'Neither: no energy changes hands'], answer: 0 },
    spread: { q: 'Open the valve. Will the gas stay on one side, or spread into both?', choices: ['Spread into both, and stay spread', 'Stay on its side', 'Spread, then gather back on one side'], answer: 0 },
    poor: { q: 'Which carbon is electron-poor (δ+)?', choices: ['The C of chloromethane, CH₃Cl', 'The C of methyllithium, CH₃Li', 'Both equally'], answer: 0 },
    order3: { q: 'Which carbocation do you expect to be the most stable?', choices: ['Tertiary (3°)', 'Primary (1°)', 'Methyl', 'They are all the same'], answer: 0, compact: true },
    peak: { q: 'In the reaction of 2-bromo-2-methylpropane with Cl⁻, where does the carbocation sit on the energy diagram?',
      choices: ['In a valley: an intermediate', 'On a peak: a transition state', 'At the start, with the reactants'], answer: 0 }
  };

  var QZ = QUIZZES;
  var GRADED = Object.keys(QZ).reduce(function (s, k) { return s + QZ[k].draw; }, 0);

  var el = {};
  var state = null;
  var ctl = null;
  var preview = false;
  var RENDER = {};
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }

  var SC = SCENES.S;

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

  /* ------------------------------------------------------------------ state */

  /* A checkpoint's questions: the core, one from each pick group, then a
     random fill from the rest (never another member of a pick group). */
  function drawQuiz(Q, rand) {
    var ids = Q.core.slice();
    var grouped = [];
    (Q.pick || []).forEach(function (g) { grouped = grouped.concat(g); ids.push(g[Math.floor(rand() * g.length)]); });
    var rest = shuffle(Q.pool.map(function (q) { return q.id; }).filter(function (id) {
      return ids.indexOf(id) < 0 && grouped.indexOf(id) < 0;
    }), rand);
    ids = ids.concat(rest.slice(0, Q.draw - ids.length));
    return Q.pool.map(function (q) { return q.id; }).filter(function (id) { return ids.indexOf(id) >= 0; });
  }

  function newState() {
    var seed = Math.floor(Math.random() * 1e9);
    var rand = rng(seed);
    var draws = {};
    Object.keys(QZ).forEach(function (k) { draws[k] = drawQuiz(QZ[k], rand); });
    return { v: SCHEMA, seed: seed, step: 0, max: 0, draws: draws, ans: {}, pick: {}, pr: {}, done: {}, fin: 0, best: 0, att: 1 };
  }

  function restore(saved) {
    if (!saved || !saved.draws || saved.v !== SCHEMA) return null;
    var ok = Object.keys(QZ).every(function (k) {
      return (saved.draws[k] || []).length === QZ[k].draw && saved.draws[k].every(function (id) {
        return QZ[k].pool.some(function (q) { return q.id === id; });
      });
    });
    return ok ? saved : null;
  }

  function persist() { if (!preview) SCORM.saveState(state); }

  function correctCount() {
    return Object.keys(state.ans).reduce(function (s, k) { return s + (state.ans[k] ? 1 : 0); }, 0);
  }
  function attemptPercent() { return 100 * correctCount() / GRADED; }

  /* The gradebook gets the better of this attempt and the best finished
     one, so a new attempt can never lower a student's grade. */
  function reportScore() {
    if (preview) return;
    SCORM.setScore(Math.max(state.best || 0, attemptPercent()));
  }

  function newAttempt() {
    var keep = { best: Math.max(state.best || 0, state.fin ? attemptPercent() : 0), att: (state.att || 1) + 1, max: state.max };
    state = newState();
    state.best = keep.best;
    state.att = keep.att;
    state.max = keep.max;
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
      el.parts.appendChild(h('button', {
        type: 'button', class: 'tab' + (p.n === cur ? ' current' : '') + (open ? '' : ' locked'),
        disabled: !open, 'aria-current': p.n === cur ? 'step' : null,
        onclick: function () { if (open) goTo(first); }
      }, [p.n < 5 ? p.n + '  ' + p.name : p.name]));
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
    var text = s.kind === 'quiz' ? 'Graded: your first answer to each question counts, and a drawing counts on its first Check. Read the explanation after each one.' : s.text;
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

  /* ------------------------------------------------------- shared pieces */

  function panel(title, hint, kids, cls) {
    return h('section', { class: 'panel ' + (cls || '') }, [
      h('div', { class: 'panel-head' }, [h('h3', { text: title }), hint ? h('span', { class: 'hint', text: hint }) : null])
    ].concat(kids || []));
  }

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
    return h('div', { class: 'reveal' }, lines.filter(Boolean).map(function (t) { return typeof t === 'string' ? h('p', { text: t }) : t; }));
  }

  function verdict(p, chosen) {
    if (chosen == null) return '';
    return chosen === p.answer ? 'Your prediction was right. ' : 'You predicted “' + p.choices[chosen] + '”. ';
  }

  /* A prediction in its panel, and the reveal after it. */
  function predictBox(p, pr, keyName, revealText, then) {
    var box = h('div');
    function paint() {
      box.innerHTML = '';
      box.appendChild(panel('Your prediction', null, [predictCard(p, pr[keyName], function (i) {
        pr[keyName] = i; persist(); paint(); if (then) then();
      })]));
      if (pr[keyName] != null) box.appendChild(reveal([verdict(p, pr[keyName]) + revealText]));
    }
    paint();
    return box;
  }

  function chipRow(label, items, cur, isDone, isOpen, onPick) {
    return h('div', { class: 'chips' }, [label ? h('span', { class: 'chips-label', text: label }) : null].concat(items.map(function (it, k) {
      return h('button', { type: 'button', class: 'chip' + (k === cur ? ' current' : '') + (isDone(k) ? ' done' : ''),
        disabled: !isOpen(k), 'aria-pressed': k === cur ? 'true' : 'false',
        onclick: function () { onPick(k); } }, [(isDone(k) ? '✓ ' : '') + it]);
    })));
  }

  function capFirst(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function def(term, text) { return h('p', { class: 'def' }, [h('b', { text: term + ': ' }), text]); }

  /* A progress slider with a Play button. onInput(p) for every move. */
  function slider(onInput, o) {
    o = o || {};
    var range = h('input', { type: 'range', min: 0, max: 100, value: Math.round((o.p || 0) * 100), class: 'prog-range',
      'aria-label': o.label || 'Reaction progress' });
    var play = h('button', { type: 'button', class: 'mini play', text: '▶ Play' });
    var anim = null;
    range.addEventListener('input', function () { stop(); onInput(+range.value / 100); });
    function stop() { if (anim) { cancelAnimationFrame(anim); anim = null; play.textContent = '▶ Play'; } }
    play.addEventListener('click', function () {
      if (anim) { stop(); return; }
      if (+range.value >= 100) { range.value = 0; onInput(0); }
      if (reduceMotion) {
        /* no motion: still frames, one per press */
        var stepN = o.frames || 4;
        var next = Math.min(100, (Math.floor(+range.value * stepN / 100 + 1e-6) + 1) * 100 / stepN);
        range.value = next; onInput(next / 100);
        if (next >= 100 && o.done) o.done();
        return;
      }
      var start = null, from = +range.value, dur = o.ms || 3600;
      play.textContent = '❚❚ Pause';
      function step(ts) {
        if (start == null) start = ts;
        var v = Math.min(100, from + (ts - start) / dur * 100);
        range.value = v;
        onInput(v / 100);
        if (v < 100) anim = requestAnimationFrame(step);
        else { stop(); if (o.done) o.done(); }
      }
      anim = requestAnimationFrame(step);
    });
    var node = h('div', { class: 'range-row' }, [h('span', { text: o.from || 'Start' }), range, h('span', { text: o.to || 'Products' }), play]);
    return { node: node, set: function (p) { range.value = Math.round(p * 100); onInput(p); }, value: function () { return +range.value / 100; },
             stop: stop, range: range, play: play };
  }

  /* Names for bonds in the energy ledger: "C–Br", "C=O pi". */
  function bondName(st, b) {
    var A = Chem.atom(st, b.a), B = Chem.atom(st, b.b);
    /* C first (C–Br, C–H), else H first (H–Cl, H–O), as Klein writes them */
    var pair = [A.el, B.el];
    if (pair[1] === 'C' || (pair[1] === 'H' && pair[0] !== 'C')) pair.reverse();
    return pair.join(b.pi ? '=' : '–') + (b.pi ? ' pi bond' : ' bond');
  }

  /* The bonds a step breaks and makes, each with its energy, filled in as
     the animation reaches it. Returns { node, set(p) }. */
  function ledgerBox(sc, after) {
    var L = Chem.ledger(sc.before, after || sc.after);
    var rows = [];
    var list = h('ul', { class: 'ledger' });
    L.broken.forEach(function (b) {
      var li = h('li', { class: 'in' }, [h('span', { class: 'ledger-tag', text: 'energy in' }), bondName(sc.before, b) + ' broken: endothermic']);
      rows.push({ li: li, at: 0.3 }); list.appendChild(li);
    });
    L.formed.forEach(function (b) {
      var li = h('li', { class: 'out' }, [h('span', { class: 'ledger-tag', text: 'energy out' }), bondName(after || sc.after, b) + ' formed: exothermic']);
      rows.push({ li: li, at: 0.7 }); list.appendChild(li);
    });
    function set(p) { rows.forEach(function (r) { r.li.classList.toggle('on', p >= r.at); }); }
    set(0);
    return { node: h('div', { class: 'ledger-box' }, [h('p', { class: 'ledger-head', text: 'Bonds broken and bonds made' }), list]), set: set };
  }

  /* A step's animation, its slider and its energy ledger. */
  function playerBox(sc, o) {
    o = o || {};
    var pl = Render.Player(sc, { scale: o.scale, ts: o.ts, arrows: o.arrows, picks: o.picks, after: o.after });
    var led = o.noLedger ? null : ledgerBox(sc, o.after);
    var sl = slider(function (p) { pl.set(p); if (led) led.set(p); if (o.onInput) o.onInput(p); }, { from: 'Arrows', to: 'Products', ms: o.ms || 3600, done: o.done });
    var node = h('div', { class: 'player-box' }, [h('div', { class: 'mol-wrap anim' }, [pl.node]), sl.node, led ? led.node : null]);
    return { node: node, player: pl, slider: sl, ledger: led };
  }

  /* An arrow-drawing exercise on one scene. done(fresh) is called once
     the arrows are right (now, or on a revisit). */
  function arrowBox(sc, pr, key, done, o) {
    o = o || {};
    var tool = Arrows.Tool(sc, { say: say, onCheck: check, scale: o.scale });
    var help = h('button', { type: 'button', class: 'ghostbtn', text: 'Show me', hidden: true });
    var yours = h('div', { class: 'yours', hidden: true });
    var legend = h('ol', { class: 'pattern-list', hidden: true });
    var node = h('div', null, [tool.node, h('div', { class: 'btnrow' }, [help]), yours, legend]);
    function finish(fresh) {
      tool.lock();
      yours.hidden = true;
      legend.innerHTML = '';
      tool.legend().forEach(function (t) { if (t) legend.appendChild(h('li', { text: capFirst(t) + '.' })); });
      legend.hidden = false;
      help.hidden = true;
      if (done) done(fresh);
    }
    function check(r) {
      if (r.ok) {
        pr[key] = 1; persist();
        say(r.msg, 'good');
        finish(true);
        return;
      }
      pr[key + 'm'] = (pr[key + 'm'] || 0) + 1;
      persist();
      say(r.msg, 'bad');
      /* arrows that obey the rules but make something else: show it */
      yours.innerHTML = '';
      if (r.state) {
        yours.appendChild(h('p', { class: 'muted', text: 'Your arrows would make this instead:' }));
        yours.appendChild(h('div', { class: 'mol-wrap small' }, [Render.draw(r.state, { scale: 30, label: 'What your arrows would make' })]));
        yours.hidden = false;
      } else yours.hidden = true;
      if (pr[key + 'm'] >= (o.misses || 3)) help.hidden = false;
    }
    help.addEventListener('click', function () {
      tool.show();
      pr[key] = 1; persist();
      say('These are the arrows. The list underneath says what each one does.', '');
      finish(true);
    });
    if (pr[key]) { tool.show(); finish(false); }
    else if (pr[key + 'm'] >= (o.misses || 3)) help.hidden = false;
    return { node: node, tool: tool };
  }

  /* Choice buttons that stay on screen once answered (ungraded). */
  function choiceRow(options, answer, chosen, onPick) {
    var row = h('div', { class: 'choice-row' });
    options.forEach(function (t, i) {
      var b = h('button', { type: 'button', class: 'ghostbtn' + (chosen != null && i === answer && chosen === answer ? ' right' : '') +
        (chosen === i && i !== answer ? ' wrong' : ''), text: t, disabled: chosen === answer });
      b.addEventListener('click', function () { onPick(i); });
      row.appendChild(b);
    });
    return row;
  }

  /* ------------------------------------------------------------- figures */

  /* Question figures: { mol: id } a drawing; { mech: id, rule } a step with
     its arrows (or a rule-breaking set from SCENES.RULES); { energy:
     profile, dG }; { chain: id } every step of a chain with its arrows. */
  function figure(spec) {
    if (spec.mech) {
      var sc = SC[spec.mech];
      var arrows = sc.arrows;
      if (spec.rule) arrows = SCENES.RULES.filter(function (r) { return r.id === spec.rule; })[0].arrows;
      return Arrows.figure(sc, arrows, { label: spec.label || sc.title + ' with curved arrows' });
    }
    if (spec.energy) {
      return Energy.draw(SCENES.PROFILES[spec.energy], { dG: spec.dG ? (SCENES.PROFILES[spec.energy].slice(-1)[0].E < SCENES.PROFILES[spec.energy][0].E ? 'Exergonic' : 'Endergonic') : null,
        label: 'An energy diagram' });
    }
    if (spec.chain) {
      return h('div', { class: 'chain-fig' }, SC[spec.chain].map(function (sc, k) {
        return h('figure', null, [Arrows.figure(sc, sc.arrows, { scale: 30, label: 'Step ' + (k + 1) + ' with curved arrows' }), h('figcaption', { text: 'Step ' + (k + 1) })]);
      }));
    }
    if (spec.mol) {
      var m = SC[spec.mol];
      return h('figure', { class: 'mol-card' }, [Render.draw(m.before, { scale: 36, label: m.label || m.title }), h('figcaption', { text: m.label || m.title })]);
    }
    return h('div');
  }

  function figureText(spec) {
    if (spec.mech) return (SC[spec.mech].title || 'a step') + ', with curved arrows';
    if (spec.mol) return SC[spec.mol].title;
    return 'a drawing';
  }

  /* ------------------------------------------------------------- quizzes */

  function question(id) {
    for (var k in QZ) {
      var pool = QZ[k].pool;
      for (var i = 0; i < pool.length; i++) if (pool[i].id === id) return pool[i];
    }
    return null;
  }

  /* The reference beside a checkpoint (qualitative: no calculations). */
  function quizSide(k) {
    if (k === 'A') {
      return panel('Energy words', null, [h('dl', { class: 'vocab' }, [
        ['Bond breaking', 'Endothermic: energy in.'], ['Bond making', 'Exothermic: energy out.'],
        ['ΔG < 0', 'Exergonic, thermodynamically favorable, K > 1.'], ['ΔG > 0', 'Endergonic, not thermodynamically favorable, K < 1.'],
        ['ΔG = ΔH − TΔS', 'ΔS > 0: more molecules, or a ring opening.'],
        ['Peak', 'A transition state. Valley: an intermediate.'], ['Eₐ', 'The climb to the first peak: how fast.']
      ].reduce(function (acc, p) { acc.push(h('dt', { text: p[0] })); acc.push(h('dd', { text: p[1] })); return acc; }, []))], 'side');
    }
    return panel('Klein Table 6.3 and the four patterns', null, [tableNode(), k === 'B' ? null : patternsNode()], 'side');
  }

  function tableNode() {
    var rows = [['Hydroxide', 'NaOH'], ['Alkoxide ions', 'NaOR'], ['Halide ions', 'NaX (Cl, Br, I)'], ['Thiolate', 'NaSH'],
      ['Alkene', 'R₂C=CR₂'], ['Alcohol', 'ROH (weak)'], ['Water', 'H₂O (weak)']];
    var er = [['Alkyl halides', 'R–X (Cl, Br, I)'], ['Carbocations', 'C⁺'], ['Carbonyl groups', 'C=O']];
    return h('div', { class: 'grid2 tight' }, [
      h('table', { class: 'ref-table' }, [h('tr', null, [h('th', { text: 'Nucleophiles' }), h('th', { text: '' })])].concat(rows.map(function (r) {
        return h('tr', null, [h('td', { text: r[0] }), h('td', { text: r[1] })]);
      }))),
      h('table', { class: 'ref-table' }, [h('tr', null, [h('th', { text: 'Electrophiles' }), h('th', { text: '' })])].concat(er.map(function (r) {
        return h('tr', null, [h('td', { text: r[0] }), h('td', { text: r[1] })]);
      })))
    ]);
  }
  function patternsNode() {
    return h('dl', { class: 'vocab' }, [
      ['Nucleophilic attack', 'A lone pair or pi bond makes a new bond to an electrophile.'],
      ['Loss of a leaving group', 'A bond breaks; its pair leaves with the leaving group.'],
      ['Proton transfer', 'An H moves without its electrons: two arrows.'],
      ['Carbocation rearrangement', 'An H or CH₃ next door moves to the C⁺ with its pair.']
    ].reduce(function (acc, p) { acc.push(h('dt', { text: p[0] })); acc.push(h('dd', { text: p[1] })); return acc; }, []));
  }

  RENDER.quiz = function (s) {
    var Q = QZ[s.quiz];
    var ids = state.draws[s.quiz];
    var box = h('div', { class: 'quiz' });
    el.stage.appendChild(h('div', { class: 'quiz-grid' }, [panel(Q.title, null, [box]), quizSide(s.quiz)]));

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

    function record(id, right, letter) {
      state.ans[id] = right ? 1 : 0;
      persist();
      reportScore();
      if (!preview) SCORM.recordAnswer(id, letter, 'a', right);
      paintParts();
    }

    function ask(n) {
      var id = ids[n];
      if (id == null) { summary(); return; }
      if (state.ans[id] != null) { ask(n + 1); return; }
      var q = question(id);
      box.innerHTML = '';
      box.setAttribute('data-qid', id);
      say('');
      box.appendChild(h('p', { class: 'q-count', text: 'Question ' + (n + 1) + ' of ' + ids.length }));
      box.appendChild(h('p', { class: 'q-text', text: q.q }));
      var why = h('p', { class: 'q-why', hidden: true });
      var next = h('button', { type: 'button', class: 'primary', hidden: true, text: n + 1 < ids.length ? 'Next question →' : 'Finish checkpoint' });
      next.addEventListener('click', function () { ask(n + 1); });

      if (q.draw) {
        /* a graded drawing: the first Check counts */
        var sc = SC[q.draw];
        var tool = Arrows.Tool(sc, { say: say, checkText: 'Check (graded)', onCheck: function (r) {
          if (state.ans[id] != null) return;
          if (!tool.drawn().length) { say(r.msg, 'bad'); return; }   /* nothing drawn yet: not an answer */
          record(id, r.ok, r.ok ? 'a' : 'b');
          if (!r.ok) { tool.show(); say('Not quite: ' + r.msg + ' The right arrows are drawn now.', 'bad'); }
          else { tool.lock(); say('Correct. ' + r.msg, 'good'); }
          why.hidden = false;
          why.textContent = q.why;
          next.hidden = false;
          next.focus({ preventScroll: true });
        } });
        box.appendChild(h('div', { class: 'q-draw' }, [tool.node]));
        box.appendChild(why);
        box.appendChild(h('div', { class: 'btnrow' }, [next]));
        return;
      }

      var order = shuffle(q.choices.map(function (c, i) { return i; }), rng(state.seed ^ hash(id)));
      if (q.fig) box.appendChild(h('div', { class: 'q-fig' }, [figure(q.fig)]));
      var figs = typeof q.choices[0] !== 'string';
      var row = h('div', { class: 'q-choices' + (figs ? ' figs' : q.compact ? ' compact' : '') });
      order.forEach(function (ci, pos) {
        var c = q.choices[ci];
        var letter = String.fromCharCode(65 + pos);
        var b = h('button', { type: 'button', class: 'choice', 'data-choice': ci }, [
          h('span', { class: 'choice-letter', text: letter }),
          typeof c === 'string' ? h('span', { class: 'choice-text', text: c }) : figure(c)
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
        state.pick[id] = ci;
        record(id, right, String.fromCharCode(97 + ci));
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
        next.hidden = false;
        next.focus({ preventScroll: true });
      }
    }
    ask(0);
  };

  /* ---------------------------------------------------------------- results */

  var BIG_IDEAS = [
    'Bond breaking is endothermic (energy in) and bond making is exothermic (energy out). A step goes uphill or downhill depending on which wins.',
    'A reaction with ΔG < 0 is exergonic and thermodynamically favorable (K > 1); with ΔG > 0 it is endergonic and not thermodynamically favorable.',
    'On an energy diagram every peak is a transition state (partial bonds, never isolated) and every valley between peaks is an intermediate.',
    'Ionic reactions: an electron-rich nucleophile (a Lewis base) gives a pair of electrons to an electron-poor electrophile (a Lewis acid).',
    'A curved arrow moves one pair of electrons: the tail on a lone pair or a bond, never on a positive charge; the head on a new bond or a new lone pair; never a fifth bond to C, N or O.',
    'Every ionic mechanism combines four patterns: nucleophilic attack, loss of a leaving group, proton transfer and carbocation rearrangement.',
    'A carbocation rearranges (hydride or methyl shift) only when that makes a more stable carbocation: 3° > 2° > 1° > methyl, by hyperconjugation.',
    'Two patterns in one step make a concerted step. Klein draws ⇌ for most steps, and → when the reverse hardly happens.'
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
      state.att > 1 ? h('p', { class: 'best-line', text: 'Best attempt: ' + best + '%' + (best > pct ? '. That is the score the gradebook keeps.' : '') }) : null,
      h('p', { class: 'muted', text: SCORM.isConnected()
        ? 'Your ' + (state.att > 1 ? 'best ' : '') + 'score has been sent to the gradebook and the activity is marked complete.'
        : 'Standalone mode: nothing was sent to a gradebook.' })
    ]);
    var ideas = panel('Big ideas', null, [h('ul', { class: 'keylist' }, BIG_IDEAS.map(function (t) { return h('li', { text: t }); }))]);
    el.stage.appendChild(h('div', { class: 'grid2' }, [box, ideas]));
    var again = h('button', { type: 'button', class: 'primary', text: 'Start a new attempt' });
    var sure = h('div', { class: 'confirm', hidden: true }, [
      h('p', { text: 'This clears all your answers, arrows and predictions and gives you a new set of checkpoint questions. ' +
                     'Your best score so far (' + Math.max(best, pct) + '%) stays in the gradebook.' }),
      h('div', { class: 'btnrow' }, [
        h('button', { type: 'button', class: 'primary', text: 'Yes, start again', onclick: newAttempt }),
        h('button', { type: 'button', class: 'ghostbtn', text: 'Cancel', onclick: function () { sure.hidden = true; again.hidden = false; again.focus(); } })
      ])
    ]);
    again.addEventListener('click', function () { again.hidden = true; sure.hidden = false; sure.querySelector('.primary').focus(); });
    el.stage.appendChild(panel('Try it again?', null, [
      h('p', { class: 'muted', text: 'You can redo the whole activity with new checkpoint questions. Parts you have already ' +
                                     'reached stay open, so you can jump straight to any of them.' }),
      h('div', { class: 'btnrow' }, [again]),
      sure
    ]));
    say('Activity complete.', 'good');
  };

  /* --------------------------------------------------------- references */

  var VOCAB = [
    ['Enthalpy (ΔH)', 'The heat exchanged with the surroundings. ΔH < 0 is exothermic (energy out); ΔH > 0 is endothermic (energy in).'],
    ['Bond dissociation energy', 'The energy it takes to break a bond homolytically. Breaking a bond is always endothermic; making it gives the same energy back out.'],
    ['Homolytic cleavage', 'A bond breaks evenly, one electron to each atom (two fish-hook arrows), making two radicals.'],
    ['Heterolytic cleavage', 'A bond breaks unevenly, both electrons to one atom (one curved arrow), making ions.'],
    ['Radical', 'An atom or molecule with an unpaired electron.'],
    ['Entropy (ΔS)', 'How many ways a system can be arranged. More molecules, or a ring opening, means ΔS > 0.'],
    ['Gibbs free energy (ΔG)', 'ΔG = ΔH − TΔS. ΔG < 0: thermodynamically favorable.'],
    ['Thermodynamically favorable', 'ΔG < 0: the products are favored at equilibrium (K > 1). Not thermodynamically favorable: ΔG > 0, K < 1.'],
    ['Exergonic, endergonic', 'Exergonic: ΔG < 0, products lower in free energy. Endergonic: ΔG > 0.'],
    ['Thermodynamics, kinetics', 'Thermodynamics (ΔG): which side is favored. Kinetics (Eₐ): how fast.'],
    ['Activation energy (Eₐ)', 'The climb from the reactants to the transition state.'],
    ['Transition state', 'A peak on an energy diagram: bonds partly broken and partly formed. It cannot be isolated. Drawn in brackets with ‡.'],
    ['Intermediate', 'A valley between peaks: a real species with a short lifetime, such as a carbocation.'],
    ['Ionic (polar) reaction', 'A reaction in which an electron-rich site meets an electron-poor one, through ions or polar bonds.'],
    ['Nucleophile', '“Nucleus lover”: electron-rich, gives a pair of electrons. A Lewis base.'],
    ['Electrophile', '“Electron lover”: electron-poor, accepts a pair of electrons. A Lewis acid.'],
    ['Polarizability', 'How easily an atom’s electron cloud shifts. Large atoms (I, S) are polarizable: strong nucleophiles.'],
    ['Carbocation', 'A carbon with three bonds, a positive charge and an empty p orbital. 3° > 2° > 1° > methyl.'],
    ['Hyperconjugation', 'A neighbouring C–H or C–C bond sharing electron density with the empty p orbital of a carbocation.'],
    ['Curved arrow', 'Moves one pair of electrons: tail on a lone pair or a bond, head on a new bond or lone pair.'],
    ['Fish-hook arrow', 'A curved arrow with half a head: moves one electron.'],
    ['Mechanism', 'The steps of a reaction, drawn with curved arrows.'],
    ['Nucleophilic attack', 'A nucleophile’s pair makes a new bond to an electrophile.'],
    ['Leaving group', 'The group that leaves with the pair of electrons of its bond.'],
    ['Loss of a leaving group', 'A bond breaks and its pair goes with the leaving group.'],
    ['Proton transfer', 'An H moves from one atom to another without its electrons. Two curved arrows.'],
    ['Carbocation rearrangement', 'A hydride shift (H) or methyl shift (CH₃) moves a group with its pair to the C⁺, making a more stable carbocation.'],
    ['Concerted', 'Two patterns at the same time, in one step.']
  ];

  function buildReference() {
    el.patternsBody.appendChild(patternsNode());
    el.tableBody.appendChild(tableNode());
    var dl = h('dl', { class: 'vocab' });
    VOCAB.forEach(function (p) { dl.appendChild(h('dt', { text: p[0] })); dl.appendChild(h('dd', { text: p[1] })); });
    el.vocabBody.appendChild(dl);
  }

  /* ------------------------------------------------------------------ boot */

  function showIntro() {
    var box = h('div', { class: 'screen-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'introTitle' }, [
      h('h2', { id: 'introTitle', text: 'Reactivity and Arrow Pushing' }),
      h('p', { text: 'Every ionic mechanism in this course is built from four patterns of curved arrows. By the end you will ' +
                     'draw the arrows for each one and name the pattern in any step you read (Klein, chapter 6).' }),
      h('ul', { class: 'screen-list' }, [
        h('li', { text: 'Part 1, Energy and bonds: breaking and making bonds, ΔG, energy diagrams.' }),
        h('li', { text: 'Part 2, Nucleophiles and electrophiles.' }),
        h('li', { text: 'Part 3, The four patterns, with curved arrows.' }),
        h('li', { text: 'Part 4, Putting the patterns together.' })
      ]),
      h('p', { text: 'Arrows, sorts and predictions are never graded, so try things. The four checkpoints are graded: your ' +
                     'first answer to each question counts, and a drawing counts on its first Check. About 45 minutes. Your progress is saved if you leave.' }),
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
    ['parts', 'stepTitle', 'counter', 'instructions', 'stage', 'feedback', 'next', 'back', 'nextTop', 'backTop',
     'score', 'lms', 'screen', 'patternsBody', 'tableBody', 'vocabBody'].forEach(function (id) { el[id] = $(id); });
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

  /* Everything the step files need. */
  var U = {
    h: h, say: say, panel: panel, capFirst: capFirst, predictCard: predictCard, predictBox: predictBox, reveal: reveal, verdict: verdict,
    chipRow: chipRow, def: def, slider: slider, playerBox: playerBox, ledgerBox: ledgerBox, arrowBox: arrowBox, bondName: bondName,
    choiceRow: choiceRow, showArea: showArea, shuffle: shuffle, rng: rng, hash: hash, figure: figure,
    complete: complete, progress: progress, persist: persist,
    stage: function () { return el.stage; },
    seed: function () { return state.seed; },
    isDone: function (id) { return !!state.done[id]; },
    reduceMotion: reduceMotion
  };

  return { start: start, SCHEMA: SCHEMA, STEPS: STEPS, GRADED: GRADED, QZ: QZ, PREDICT: PREDICT, RENDER: RENDER, U: U,
           BIG_IDEAS: BIG_IDEAS, VOCAB: VOCAB, figure: figure, drawQuiz: drawQuiz };
})();

document.addEventListener('DOMContentLoaded', App.start);

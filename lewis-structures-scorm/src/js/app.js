/* app.js — the steps, their order, saving, scoring.
 *
 * Part 1  Molecules: a worked example (NH₃), then PCl₃, CH₂O, HCN
 * Part 2  Polyatomic ions: NH₄⁺, ClO₃⁻, SO₄²⁻
 * Part 3  Oxyacids: H₂SO₄, HNO₂
 * Part 4  On your own: one oxyanion, one oxyacid, one multiple-bond species,
 *         drawn at random per student
 *
 * Only the four checkpoints are graded (first answer counts). Builds must be
 * finished to move on but are never scored.
 */

var App = (function () {
  'use strict';

  /* Bump whenever the step list, a quiz pool or a Part 4 pool changes: a save
     from an older version is then discarded rather than resumed. */
  var SCHEMA = 1;

  var h = UI.h;

  var PARTS = [
    { n: 1, name: 'Molecules' },
    { n: 2, name: 'Polyatomic ions' },
    { n: 3, name: 'Oxyacids' },
    { n: 4, name: 'On your own' },
    { n: 5, name: 'Results' }
  ];

  var STEPS = [
    { id: 'demo', part: 1, kind: 'demo', sp: 'NH3',
      title: 'How the 5 rules work: ammonia, NH₃',
      text: 'Watch the 5 rules build ammonia one rule at a time. Press “Next rule” to step through, and keep an ' +
            'eye on the electron bookkeeping on the left.' },
    { id: 'b-PCl3', part: 1, kind: 'build', sp: 'PCl3', table: true,
      text: 'Your turn. Work through the rules in order — each one unlocks when the one before it checks out. ' +
            'The 5 rules stay on the left the whole time.' },
    { id: 'b-CH2O', part: 1, kind: 'build', sp: 'CH2O', table: true,
      text: 'Keep an eye on the central atom when you reach Rule 5.' },
    { id: 'b-HCN', part: 1, kind: 'build', sp: 'HCN', table: true,
      text: 'Rule 5 can run more than once.' },
    { id: 'quiz-A', part: 1, kind: 'quiz', quiz: 'A', title: 'Checkpoint 1',
      text: 'Graded: your first answer to each question counts. Read the explanation after each one.' },

    { id: 'b-NH4', part: 2, kind: 'build', sp: 'NH4', table: true,
      text: 'Your first polyatomic ion. A + charge means the ion has LOST electrons.' },
    { id: 'b-ClO3', part: 2, kind: 'build', sp: 'ClO3', table: true,
      text: 'A − charge means the ion has GAINED electrons.' },
    { id: 'b-SO4', part: 2, kind: 'build', sp: 'SO4', table: false,
      text: 'S is in period 3. Follow the rules exactly, and only do what they tell you to. From here on, ' +
            'Rule 1 is just the total.' },
    { id: 'quiz-B', part: 2, kind: 'quiz', quiz: 'B', title: 'Checkpoint 2',
      text: 'Graded: your first answer to each question counts.' },

    { id: 'b-H2SO4', part: 3, kind: 'build', sp: 'H2SO4', table: false,
      text: 'An oxyacid: every H bonds to an O, and that O bonds to the central atom.' },
    { id: 'b-HNO2', part: 3, kind: 'build', sp: 'HNO2', table: false,
      text: 'Another oxyacid — this time the central atom is in period 2.' },
    { id: 'quiz-C', part: 3, kind: 'quiz', quiz: 'C', title: 'Checkpoint 3',
      text: 'Graded: your first answer to each question counts.' },

    { id: 'b-ion', part: 4, kind: 'build', pool: 'ion', table: false, solo: true,
      text: 'On your own: same 5 rules, fewer hints.' },
    { id: 'b-acid', part: 4, kind: 'build', pool: 'acid', table: false, solo: true,
      text: 'On your own: an oxyacid.' },
    { id: 'b-multi', part: 4, kind: 'build', pool: 'multi', table: false, solo: true,
      text: 'On your own: watch for an electron-deficient central atom.' },
    { id: 'quiz-D', part: 4, kind: 'quiz', quiz: 'D', title: 'Checkpoint 4',
      text: 'Graded: your first answer to each question counts.' },

    { id: 'results', part: 5, kind: 'results', title: 'Results', text: '' }
  ];

  var GRADED = Object.keys(QUIZZES).reduce(function (s, k) { return s + QUIZZES[k].draw; }, 0);

  var el = {};
  var state = null;
  var ctl = null;           /* the current step's controller */
  var preview = false;      /* ?step= teacher preview: nothing is saved or reported */
  var snarks = 0;           /* expanded-octet attempts, this page load only — never saved or reported */

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

  function stepSpecies(s) { return Lewis.species(s.sp || state.pool[s.pool]); }

  function stepTitle(s) {
    if (s.kind !== 'build') return s.title;
    var sp = stepSpecies(s);
    return (s.pool ? 'On your own: ' : 'Build ') + sp.text + ' — ' + sp.name;
  }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  /* The anti-AI message. In a build there is a central atom to name and a
     fix to give; in a checkpoint the explanation underneath does that. */
  function snarkText(sp) {
    snarks++;
    var vars = { X: sp ? sp.center : '', F: sp ? sp.text : '', n: snarks };
    var line = snarks === 1 ? (sp ? pick(SNARK.first) : pick(SNARK.quiz)) : pick(SNARK.again);
    return UI.fill(line, vars) + ' ' + (sp ? UI.fill(SNARK.fix, vars) : '') + pick(SNARK.cheer);
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
    var pool = {};
    Object.keys(POOLS).forEach(function (k) { pool[k] = POOLS[k].ids[Math.floor(rand() * POOLS[k].ids.length)]; });
    return { v: SCHEMA, seed: seed, step: 0, max: 0, draws: draws, pool: pool, ans: {}, pick: {}, done: {}, fin: 0 };
  }

  function restore(saved) {
    if (!saved || saved.v !== SCHEMA || !saved.draws || !saved.pool) return null;
    return saved;
  }

  function persist() {
    if (preview) return;
    SCORM.saveState(state);
  }

  function correctCount() {
    return Object.keys(state.ans).reduce(function (s, k) { return s + (state.ans[k] ? 1 : 0); }, 0);
  }

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
      }, [p.n < 5 ? p.n + '  ' + p.name : p.name]));
    });
    el.score.textContent = 'Checkpoint score: ' + correctCount() + ' / ' + GRADED;
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

  function panel(title, hint, kids, cls) {
    return h('section', { class: 'panel ' + (cls || '') }, [
      h('div', { class: 'panel-head' }, [h('h3', { text: title }), hint ? h('span', { class: 'hint', text: hint }) : null])
    ].concat(kids || []));
  }

  var RENDER = {};

  /* ---- the worked example */

  RENDER.demo = function (s) {
    var sp = Lewis.species(s.sp), r = Lewis.solve(sp), X = sp.center;
    var v = r.valence;
    var stage = state.done[s.id] ? 5 : 0;
    var STAGES = [
      { s: Lewis.empty(sp.charge), text: sp.name.charAt(0).toUpperCase() + sp.name.slice(1) + ', ' + sp.text +
          '. Press “Next rule” to apply Rule 1.' },
      { s: Lewis.empty(sp.charge), text: v.rows.map(function (row) {
          return row.el + ' is in group ' + ELEMENTS[row.el].group + ': ' + row.each + ' valence electron' +
            (row.each === 1 ? '' : 's') + (row.n > 1 ? ' each' : '');
        }).join('. ') + '. Total: ' + v.rows.map(function (row) { return row.n > 1 ? row.n + ' × ' + row.each : row.each; }).join(' + ') +
          ' = ' + r.total + ' valence electrons.' },
      { s: r.s2, text: X + ' is the first atom written that is not H, so it goes in the center. Every H gets a single ' +
          'bond to it: ' + r.bonds + ' bonds × 2 = ' + r.used2 + ' electrons. ' + r.total + ' − ' + r.used2 + ' = ' + r.left2 + ' left.' },
      { s: r.s3, text: 'Fill the outer atoms. Here they are all H, and each H already has its doublet from its bond — ' +
          'so Rule 3 adds nothing. Still ' + r.left3 + ' left.' },
      { s: r.s4, text: 'Rule 4: the ' + r.left3 + ' leftover electrons go on ' + X + ' as ' + Lewis.pairs(r.centerLP) + '.' },
      { s: r.s5, text: 'Count around ' + X + ': ' + Lewis.bondSum(r.s5, 'C') + ' bonds (' + 2 * Lewis.bondSum(r.s5, 'C') +
          ') + ' + Lewis.pairs(r.s5.lp.C) + ' (' + 2 * r.s5.lp.C + ') = ' + Lewis.electrons(r.s5, 'C') + '. ' + X +
          ' is not electron deficient, so Rule 5 has nothing to do. That is the Lewis structure of ammonia.' }
    ];

    var side = h('aside', { class: 'side panel' });
    var head = h('div', { class: 'rule-head' });
    var text = h('p', { class: 'howto demo-text', 'aria-live': 'polite' });
    var canvas = h('div', { class: 'canvas' });
    var prev = h('button', { type: 'button', class: 'ghostbtn', text: '← Previous rule' });
    var nxt = h('button', { type: 'button', class: 'primary', text: 'Next rule →' });
    var work = h('section', { class: 'work panel' }, [head, text, canvas, h('div', { class: 'btnrow' }, [prev, nxt])]);
    el.stage.appendChild(h('div', { class: 'builder' }, [side, work]));

    function paint() {
      side.innerHTML = '';
      side.appendChild(h('div', { class: 'panel-head' }, [h('h3', { text: 'The 5 rules' })]));
      side.appendChild(Builder.rulesList(stage < 5 ? stage + 1 : 0, stage));
      side.appendChild(h('div', { class: 'panel-head tally-head' }, [h('h3', { text: 'Electron bookkeeping' })]));
      var rows = [];
      if (stage >= 1) rows.push(['Rule 1', 'valence electrons', String(r.total)]);
      if (stage >= 2) rows.push(['Rule 2', 'used in bonds', '− ' + r.used2], ['', 'left', String(r.left2)]);
      if (stage >= 3) rows.push(['Rule 3', 'outer lone pairs', '− ' + 2 * r.outerLP], ['', 'left', String(r.left3)]);
      if (stage >= 4) rows.push(['Rule 4', 'on the central atom', '− ' + 2 * r.centerLP], ['', 'left', '0']);
      var t = h('table', { class: 'tally-table' });
      rows.forEach(function (row) {
        t.appendChild(h('tr', { class: row[1] === 'left' ? 'left' : '' }, [
          h('td', { class: 'tr-rule', text: row[0] }), h('td', { text: row[1] }), h('td', { class: 'num', text: row[2] })]));
      });
      side.appendChild(rows.length ? t : h('p', { class: 'muted small', text: 'Fills in as the rules run.' }));

      head.innerHTML = '';
      head.appendChild(h('span', { class: 'rule-num', text: stage ? 'Rule ' + stage : sp.text }));
      head.appendChild(h('span', { class: 'rule-title', text: stage ? RULES[stage - 1].title : 'Start' }));
      text.textContent = STAGES[stage].text;
      canvas.innerHTML = '';
      canvas.appendChild(stage < 2 ? Builder.formulaBig(sp)
        : Draw.structure(STAGES[stage].s, { frame: 'fit', scale: 1.3, title: Lewis.describe(STAGES[stage].s) }));
      prev.disabled = stage === 0;
      nxt.hidden = stage === 5;
      if (stage === 5 && !state.done[s.id]) complete('That is all five rules. Next, you build one yourself.');
    }
    prev.addEventListener('click', function () { if (stage > 0) { stage--; paint(); } });
    nxt.addEventListener('click', function () { if (stage < 5) { stage++; paint(); } });
    paint();
  };

  /* ---- a build */

  RENDER.build = function (s) {
    var sp = stepSpecies(s);
    var b = Builder({
      sp: sp, table: s.table, showAfter: s.solo ? 3 : 2, done: !!state.done[s.id],
      say: say, snark: snarkText,
      onDone: function () { complete(null); }
    });
    el.stage.appendChild(b.node);
    if (state.done[s.id]) say('Already built. Press Next to go on.', 'good');
    return b;
  };

  /* ---- quiz */

  function question(id) {
    for (var k in QUIZZES) {
      var pool = QUIZZES[k].pool;
      for (var i = 0; i < pool.length; i++) if (pool[i].id === id) return pool[i];
    }
    return null;
  }

  function drawingOf(c) { return Lewis.variant(Lewis.species(c.lewis), c.mod); }

  function isSnark(q, ci) {
    if (q.snark && q.snark.indexOf(ci) >= 0) return true;
    var c = q.choices[ci];
    return typeof c !== 'string' && Lewis.expanded(drawingOf(c));
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
      var order = UI.shuffle(q.choices.map(function (c, i) { return i; }), UI.rng(state.seed ^ UI.hash(id)));
      box.innerHTML = '';
      say('');
      box.appendChild(h('p', { class: 'q-count', text: 'Question ' + (n + 1) + ' of ' + ids.length }));
      box.appendChild(h('p', { class: 'q-text', text: q.q }));
      if (q.fig) box.appendChild(h('div', { class: 'q-fig' }, [Draw.figure(drawingOf(q.fig))]));
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
          typeof c === 'string' ? h('span', { class: 'choice-text', text: c }) : Draw.figure(drawingOf(c), 'choice-fig')
        ]);
        if (typeof c !== 'string') b.setAttribute('aria-label', 'Choice ' + letter + ': ' + Lewis.describe(drawingOf(c)));
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
        if (right) say('Correct.', 'good');
        else if (isSnark(q, ci)) say(snarkText(null), 'snark');
        else say('Not quite — the correct answer is highlighted.', 'bad');
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
    var ideas = panel('The 5 rules, in one line each', null, [h('ul', { class: 'keylist' }, [
      'Rule 1: valence electrons come from the group number. A − charge adds electrons; a + charge takes them away.',
      'Rule 2: the least electronegative atom (first written, not H) goes in the center. H is never central, and in an oxyacid every H bonds to an O.',
      'Rule 3: every outer atom gets an octet — except H, which is stable with a doublet.',
      'Rule 4: anything left goes on the central atom.',
      'Rule 5: only if the central atom is electron deficient do lone pairs become double or triple bonds. If it already has 8 — even S, P or Cl — you are done.'
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

  /* ---- board mode (teacher demo): ?build or ?build=H2SO4 */

  function board(id) {
    var ids = Object.keys(SPECIES);
    if (ids.indexOf(id) < 0) id = 'H2SO4';
    el.parts.hidden = true;
    el.next.hidden = true;
    el.back.hidden = true;
    el.score.hidden = true;
    el.counter.textContent = 'Teacher demo — nothing is saved or graded';
    el.instructions.textContent = 'Pick any molecule or ion and build it with the class.';
    var sel = h('select', { class: 'select', 'aria-label': 'Molecule or ion' }, ids.map(function (k) {
      var sp = Lewis.species(k);
      return h('option', { value: k, selected: k === id, text: sp.text + ' — ' + sp.name });
    }));
    var table = h('input', { type: 'checkbox', checked: true });
    var host = h('div');
    var b = null;
    function load() {
      if (b) b.destroy();
      host.innerHTML = '';
      say('');
      var sp = Lewis.species(sel.value);
      el.stepTitle.textContent = 'Build ' + sp.text + ' — ' + sp.name;
      b = Builder({ sp: sp, table: table.checked, showAfter: 1, say: say, snark: snarkText, onDone: function () {} });
      host.appendChild(b.node);
    }
    sel.addEventListener('change', load);
    table.addEventListener('change', load);
    var restart = h('button', { type: 'button', class: 'ghostbtn', text: 'Start over', onclick: load });
    el.stage.appendChild(h('div', { class: 'btnrow board-bar' }, [sel,
      h('label', { class: 'check-label' }, [table, ' Rule 1 table']), restart]));
    el.stage.appendChild(host);
    load();
  }

  /* --------------------------------------------------------- references */

  function buildReference() {
    el.rulesBody.appendChild(Builder.rulesList(0, 0));
    el.ptBody.appendChild(Builder.periodicTable());
    var dl = h('dl', { class: 'vocab' });
    [
      ['Valence electrons', 'The electrons in an atom’s outer shell — the ones that form bonds. For these elements: the group number (1, 2) or its last digit (13–18), which is the same as the “A” group number.'],
      ['Bond (bonding pair)', 'Two electrons shared between two atoms, drawn as a line. A double bond is 2 shared pairs (=), a triple bond 3 (≡).'],
      ['Lone pair', 'Two electrons that belong to one atom and are not shared, drawn as two dots.'],
      ['Octet', '8 electrons around an atom — count 2 for every bond line touching it and 2 for every lone pair on it.'],
      ['Doublet', '2 electrons. All H needs: one single bond gives it that.'],
      ['Central atom', 'The atom the others bond to: the least electronegative, which is the first one written, not counting H.'],
      ['Electron deficient', 'A central atom with fewer than 8 electrons after Rule 4. Rule 5 fixes it.'],
      ['Polyatomic ion', 'A group of bonded atoms with an overall charge, drawn in square brackets with the charge outside.'],
      ['Oxyacid', 'An acid made of H, O and one other element, such as H₂SO₄ or HNO₂. Each H is bonded to an O.']
    ].forEach(function (p) {
      dl.appendChild(h('dt', { text: p[0] }));
      dl.appendChild(h('dd', { text: p[1] }));
    });
    el.vocabBody.appendChild(dl);
  }

  /* ------------------------------------------------------------------ boot */

  function showIntro() {
    var box = h('div', { class: 'screen-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'introTitle' }, [
      h('h2', { id: 'introTitle', text: 'Lewis structures — the 5 rules' }),
      h('p', { text: 'You will build Lewis structures one rule at a time. Each rule unlocks when the one before it is right.' }),
      h('ul', { class: 'screen-list' }, [
        h('li', { text: 'Part 1 — Molecules: a worked example, then PCl₃, CH₂O and HCN.' }),
        h('li', { text: 'Part 2 — Polyatomic ions: what a charge does to the electron count.' }),
        h('li', { text: 'Part 3 — Oxyacids: where the H atoms go.' }),
        h('li', { text: 'Part 4 — On your own: three more, with fewer hints.' })
      ]),
      h('p', { text: 'Builds are practice: you get feedback and as many tries as you need. The four checkpoints are ' +
                     'graded — your first answer to each question counts. About 25–30 minutes. Your progress is saved ' +
                     'if you leave.' }),
      h('p', { class: 'screen-warn' }, [
        h('b', { text: 'Do your own work. ' }),
        'Everything you need is on the screen: the 5 rules and a periodic table. Answers from AI chatbots and ' +
        'websites often use a college-level shortcut that is wrong for this class — and this activity can tell.'
      ]),
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
     'screen', 'rulesBody', 'ptBody', 'vocabBody'].forEach(function (id) { el[id] = $(id); });
    buildReference();

    var connected = SCORM.init();
    el.lms.textContent = connected ? 'Connected to the LMS' : 'Standalone — no LMS detected';
    el.lms.className = 'lms ' + (connected ? 'on' : 'off');

    var params = new URLSearchParams(location.search);
    if (params.has('build')) { board(params.get('build')); return; }

    var jump = params.get('step');
    if (jump != null) {
      preview = true;
      state = newState();
      state.max = STEPS.length - 1;
      var idx = /^\d+$/.test(jump) ? +jump - 1 : stepIndex(jump);
      state.step = Math.max(0, Math.min(STEPS.length - 1, idx < 0 ? 0 : idx));
      var forced = params.get('pick');            /* ?step=b-ion&pick=PO4 */
      if (forced && SPECIES[forced]) Object.keys(POOLS).forEach(function (k) {
        if (POOLS[k].ids.indexOf(forced) >= 0) state.pool[k] = forced;
      });
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

  return { start: start, STEPS: STEPS, GRADED: GRADED, isSnark: isSnark, drawingOf: drawingOf,
           state: function () { return state; } };
})();

document.addEventListener('DOMContentLoaded', App.start);

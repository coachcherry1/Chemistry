/* app.js — the steps, their order, saving, scoring.
 *
 * Part 1  Ozone: build O₃ with the 5 rules; two students' answers (both
 *         right, neither the real thing); the hybrid and the evidence; how
 *         strong ozone's bonds are next to H–O–O–H and O=O (no resonance)
 * Part 2  Nitrite and nitrate: build NO₂⁻, find its resonance structures,
 *         its hybrid; then nitrate's three structures and its hybrid
 * Part 3  Carbonate: build, find all three, the hybrid
 * Part 4  On your own: SO₂, SO₃ or formate, at random
 *
 * Step kinds: build (the 5-rule builder from the Lewis activity), compare
 * (ozone's two answers), res (find every resonance structure), hybrid (the
 * averaging animation, a bond-order prediction and the bond-length ruler),
 * strength (ranking bond strength against molecules with no resonance),
 * quiz, results.
 *
 * Only the four checkpoints are graded (first answer counts). Everything
 * else must be finished to move on but is never scored.
 */

var App = (function () {
  'use strict';

  /* Bump whenever the step list, a quiz pool or the Part 4 pool changes: a
     save from an older version is then discarded rather than resumed. */
  var SCHEMA = 3;

  var h = UI.h;

  var PARTS = [
    { n: 1, name: 'Ozone' },
    { n: 2, name: 'Nitrite & nitrate' },
    { n: 3, name: 'Carbonate' },
    { n: 4, name: 'On your own' },
    { n: 5, name: 'Results' }
  ];

  var STEPS = [
    { id: 'b-O3', part: 1, kind: 'build', sp: 'O3', table: true,
      text: 'Start with the 5 rules you already know. Build ozone, O₃ — all three atoms are O, so the first one written ' +
            'is the central atom.' },
    { id: 'cmp-O3', part: 1, kind: 'compare', sp: 'O3', title: 'Two students, two answers',
      text: 'Two students followed the 5 rules for ozone and got these. Which one is right?' },
    { id: 'h-O3', part: 1, kind: 'hybrid', sp: 'O3', mule: true, title: 'The real ozone: the resonance hybrid',
      text: 'Neither drawing is the real molecule on its own. Predict first, then average the two structures.' },
    { id: 'st-O3', part: 1, kind: 'strength', sp: 'O3', title: 'How strong are ozone’s bonds?',
      text: 'Hydrogen peroxide and oxygen gas each have just one Lewis structure — no resonance. How do ozone’s O–O ' +
            'bonds compare with theirs?' },
    { id: 'quiz-A', part: 1, kind: 'quiz', quiz: 'A', title: 'Checkpoint 1',
      text: 'Graded: your first answer to each question counts. Read the explanation after each one.' },

    { id: 'b-NO2', part: 2, kind: 'build', sp: 'NO2', table: true,
      text: 'The nitrite ion. Watch Rule 5 — does it give you a choice?' },
    { id: 'r-NO2', part: 2, kind: 'res', sp: 'NO2', title: 'Find every resonance structure of NO₂⁻',
      text: 'Structure A is your answer from the build, turned if needed so the atoms sit in standard positions. Is there ' +
            'another way?' },
    { id: 'h-NO2', part: 2, kind: 'hybrid', sp: 'NO2', title: 'The nitrite hybrid',
      text: 'Predict the bond order, then average the structures and check the evidence.' },
    { id: 'r-NO3', part: 2, kind: 'res', sp: 'NO3', given: true, title: 'Find every resonance structure of NO₃⁻',
      text: 'The nitrate ion: 5 + 3 × 6 + 1 = 24 valence electrons. Rules 1–4 give the structure below, and N is 2 short — ' +
            'so Rule 5 has a choice to make. Structure A is one answer. Find the rest.' },
    { id: 'h-NO3', part: 2, kind: 'hybrid', sp: 'NO3', title: 'The nitrate hybrid',
      text: 'Three structures this time. Predict the bond order, then average them.' },
    { id: 'quiz-B', part: 2, kind: 'quiz', quiz: 'B', title: 'Checkpoint 2',
      text: 'Graded: your first answer to each question counts.' },

    { id: 'b-CO3', part: 3, kind: 'build', sp: 'CO3', table: false,
      text: 'The carbonate ion. From here on, Rule 1 is just the total.' },
    { id: 'r-CO3', part: 3, kind: 'res', sp: 'CO3', title: 'Find every resonance structure of CO₃²⁻',
      text: 'Structure A is your answer from the build (turned, if needed, to match). Find the others.' },
    { id: 'h-CO3', part: 3, kind: 'hybrid', sp: 'CO3', title: 'The carbonate hybrid',
      text: 'Predict, average, and check the evidence.' },
    { id: 'quiz-C', part: 3, kind: 'quiz', quiz: 'C', title: 'Checkpoint 3',
      text: 'Graded: your first answer to each question counts.' },

    { id: 'b-own', part: 4, kind: 'build', pool: 'own', table: false, solo: true,
      text: 'On your own: same 5 rules, fewer hints.' },
    { id: 'r-own', part: 4, kind: 'res', pool: 'own',
      text: 'Structure A is your answer from the build (turned, if needed, to match). Find every other resonance structure.' },
    { id: 'h-own', part: 4, kind: 'hybrid', pool: 'own',
      text: 'Predict the bond order, then average the structures.' },
    { id: 'quiz-D', part: 4, kind: 'quiz', quiz: 'D', title: 'Checkpoint 4',
      text: 'Graded: your first answer to each question counts.' },

    { id: 'results', part: 5, kind: 'results', title: 'Results', text: '' }
  ];

  var GRADED = Object.keys(QUIZZES).reduce(function (s, k) { return s + QUIZZES[k].draw; }, 0);

  var el = {};
  var state = null;
  var ctl = null;           /* the current step's controller */
  var preview = false;      /* ?step= teacher preview: nothing is saved or reported */
  var snarks = 0;           /* extra-double-bond attempts, this page load only — never saved or reported */

  /* ---------------------------------------------------------------- helpers */

  function $(id) { return document.getElementById(id); }

  function say(text, kind) {
    el.feedback.textContent = text || '';
    el.feedback.className = 'feedback' + (kind ? ' ' + kind : '');
  }

  /* During a build or a search the feedback line lives inside the work panel,
     under its buttons, so on a phone a message appears next to what was just
     clicked. Every other step puts it back. */
  function feedbackInto(node) {
    var work = node && node.querySelector('.work');
    if (work) work.appendChild(el.feedback);
    else el.fbHome.parent.insertBefore(el.feedback, el.fbHome.next);
  }

  function stepIndex(id) {
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === id) return i;
    return -1;
  }

  function stepSpecies(s) { return Lewis.species(s.sp || state.pool[s.pool]); }

  function stepTitle(s) {
    var sp = s.sp || s.pool ? stepSpecies(s) : null;
    if (s.kind === 'build') return (s.pool ? 'On your own: ' : 'Build ') + sp.text + ' — ' + sp.name;
    if (s.kind === 'res' && s.pool) return 'Find every resonance structure of ' + sp.text;
    if (s.kind === 'hybrid' && s.pool) return 'The ' + sp.name.replace(/ ion$/, '') + ' hybrid';
    return s.title;
  }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  /* after a control disables or hides itself the keyboard focus falls to the
     page: send it on to `target` */
  function keepFocus(target) {
    var a = document.activeElement;
    if (!a || a === document.body || a.disabled || a.closest('[hidden]')) target.focus({ preventScroll: true });
  }

  /* The anti-AI message (see snark.js). The lines that say a chatbot draws
     it that way are only used for species with O in it, where it is true. */
  function hasO(sp) { return sp.parts.some(function (p) { return p.el === 'O'; }); }

  function snarkText(sp, e, quizSp) {
    snarks++;
    var vars = { X: sp ? sp.center : '', F: sp ? sp.text : '', e: e != null ? e : 8, n: snarks };
    var lines;
    if (snarks > 1) lines = SNARK.again;
    else if (sp) lines = hasO(sp) ? SNARK.first.concat(SNARK.firstOxy) : SNARK.first;
    else lines = !quizSp || hasO(quizSp) ? SNARK.quiz.concat(SNARK.quizOxy) : SNARK.quiz;
    return UI.fill(pick(lines), vars) + ' ' + (sp ? UI.fill(SNARK.fix, vars) : '') + pick(SNARK.cheer);
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
      }, [p.n < PARTS.length ? p.n + '  ' + p.name : p.name]));
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
    feedbackInto(null);
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

  /* An ungraded question: pick a choice, see the right one and the reason. */
  function predict(q, choices, answer, reveal, onDone, done) {
    var box = h('div', { class: 'predict' }, [h('p', { class: 'predict-kicker', text: 'Predict — not graded' }),
      h('p', { class: 'q-text', text: q })]);
    var row = h('div', { class: 'q-choices compact' });
    var why = h('div', { class: 'reveal', hidden: true });
    choices.forEach(function (c, i) {
      var b = h('button', { type: 'button', class: 'choice', 'data-choice': i }, [h('span', { class: 'choice-text', text: c })]);
      b.addEventListener('click', function () { answer_(i); });
      row.appendChild(b);
    });
    box.appendChild(row);
    box.appendChild(why);
    function answer_(i) {
      var nodes = row.querySelectorAll('.choice');
      for (var j = 0; j < nodes.length; j++) {
        nodes[j].disabled = true;
        if (j === answer) nodes[j].classList.add('right');
        else if (j === i) nodes[j].classList.add('picked');
      }
      why.hidden = false;
      why.innerHTML = '';
      (Array.isArray(reveal) ? reveal : [reveal]).forEach(function (t) {
        why.appendChild(typeof t === 'string' ? h('p', { text: t }) : t);
      });
      if (onDone) onDone(i === answer);
    }
    if (done) answer_(answer);
    return box;
  }

  var RENDER = {};

  /* ---- a build (the 5-rule builder, unchanged from the Lewis activity) */

  RENDER.build = function (s) {
    var sp = stepSpecies(s);
    var b = Builder({
      sp: sp, table: s.table, showAfter: s.solo ? 3 : 2, done: !!state.done[s.id],
      say: say, snark: snarkText,
      onDone: function () { complete(null); }
    });
    el.stage.appendChild(b.node);
    feedbackInto(b.node);
    if (state.done[s.id]) say('Already built. Press Next to go on.', 'good');
    return b;
  };

  /* ---- ozone: two students, two answers */

  RENDER.compare = function (s) {
    var sp = stepSpecies(s), r = Hybrid.compute(sp);
    var cards = h('div', { class: 'res-row compare-row' }, r.structures.map(function (st, i) {
      return h('figure', { class: 'res-card' }, [
        Draw.structure(st, { scale: 1.05, title: 'Student ' + 'AB'[i] + '’s answer: ' + Lewis.describe(st) }),
        h('figcaption', { text: 'Student ' + 'AB'[i] })
      ]);
    }));
    el.stage.appendChild(panel('Two answers for O₃', null, [cards]));
    var reveal = [
      'Both are right — and both are incomplete. Each follows every one of the 5 rules: 18 valence electrons, an octet ' +
        'on every atom. The only difference is which end O shared its pair in Rule 5, and the rules don’t say which.',
      'But real ozone has two IDENTICAL O–O bonds. One drawing can’t show that: it always has one double and one single ' +
        'bond. So chemists draw every possibility, with a double-headed arrow between them. These are RESONANCE ' +
        'STRUCTURES:',
      Hybrid.row(sp),
      'Only electrons move between resonance structures — never atoms. Next: what ozone really looks like.'
    ];
    el.stage.appendChild(panel('Which one is right?', 'Predict', [
      predict('Which answer is right?', ['Only student A', 'Only student B', 'Both follow the rules equally well',
        'Neither follows the rules'], 2, reveal, function () { if (!state.done[s.id]) complete(null); }, !!state.done[s.id])
    ]));
    if (state.done[s.id]) say('Press Next to see the hybrid.', 'good');
  };

  /* ---- find every resonance structure */

  RENDER.res = function (s) {
    var sp = stepSpecies(s);
    var f = ResonanceFinder({ sp: sp, say: say, snark: snarkText, done: !!state.done[s.id],
      onDone: function () { complete(null); keepFocus(el.next); } });
    el.stage.appendChild(f.node);
    feedbackInto(f.node);
    if (state.done[s.id]) say('All found. Press Next to see the hybrid.', 'good');
    return f;
  };

  /* ---- the hybrid: predict the bond order, average, check the evidence */

  RENDER.hybrid = function (s) {
    var sp = stepSpecies(s), r = Hybrid.compute(sp), done = !!state.done[s.id];
    var pair = Hybrid.pairName(sp), k = r.cloud.length;
    el.stage.appendChild(panel('The resonance structures', null, [Hybrid.row(sp)]));

    /* 1 — predict the bond order */
    var other = r.order === '1½' ? '1⅓' : '1½';
    var choices = UI.shuffle([r.order, '1', '2', other], UI.rng(state.seed ^ UI.hash(s.id)))
      .concat([k === 2 ? 'One bond is 2 and the other is 1' : 'One bond is 2 and the others are 1']);
    var orderCount = r.structures.length;
    var reveal = 'Each ' + pair + ' bond is a double bond in ONE of the ' + orderCount + ' structures and a single bond in the ' +
      'other' + (orderCount > 2 ? 's' : '') + ': (2' + new Array(orderCount).join(' + 1') + ') ÷ ' + orderCount + ' = ' +
      r.order + '. ' + (k === 2 ? 'Both bonds are' : 'All ' + k + ' bonds are') + ' the same: a bond order of ' + r.order +
      ' — more than a single bond, less than a double.';

    /* 2 — average them */
    var ov = Hybrid.overlay(sp);
    var avg = h('button', { type: 'button', class: 'primary', text: 'Average them', disabled: !done });
    var key = h('ul', { class: 'hyb-key', hidden: !done }, [
      h('li', null, [h('span', { class: 'k-bond', 'aria-hidden': 'true' }), ' a solid line plus a dashed line: a partial double ' +
        'bond — bond order ' + r.order]),
      h('li', null, [h('span', { class: 'k-cloud', 'aria-hidden': 'true' }), ' shaded: where the shared electrons spread out, ' +
        (k === 2 ? 'over both bonds at once' : 'over all ' + k + ' bonds at once')]),
      h('li', { class: 'muted', text: 'Lone pairs are left out of the hybrid to keep the picture clear.' })
    ]);
    var mule = s.mule ? h('div', { class: 'callout', hidden: !done }, [
      h('p', null, [h('b', { text: 'The hybrid does NOT flip back and forth. ' }),
        'Ozone is not structure A for a while and then structure B. Every ozone molecule, all the time, is the hybrid. ' +
        'Think of a mule: it is not a horse half the time and a donkey the other half — it is always a mule, a ' +
        'mix of both. The resonance structures are just the drawings we need, because one Lewis drawing can’t show ' +
        'a bond and a half.'])
    ]) : null;
    var hybPanel = panel('The resonance hybrid', 'what ' + sp.text + ' really is', [
      ov.node, h('div', { class: 'btnrow' }, [avg]), key, mule]);

    /* 3 — the evidence */
    var rul = Hybrid.ruler(sp, { done: done, predicted: state.pick[s.id], onLocked: function (p) {
      if (done) return;
      state.pick[s.id] = p;                  /* so a revisit shows the student's own prediction */
      complete('That is the hybrid. On to the next one.');
    } });
    var evPanel = rul ? panel('The evidence: bond length', 'predict, then check', [
      h('p', { class: 'muted', text: 'Where do you think the real ' + pair + ' bonds in ' + sp.text + ' fall? Slide the marker, ' +
        'then lock it in.' }), rul.node]) : null;
    if (evPanel && !done) evPanel.hidden = true;

    var pred = predict('In the real ' + sp.name + ', what is the bond order of each ' + pair + ' bond?', choices,
      choices.indexOf(r.order), reveal,
      function () {
        avg.disabled = false;
        say('Now press “Average them”.');
        avg.focus({ preventScroll: true });
      }, done);
    el.stage.appendChild(panel('Predict', null, [pred]));
    el.stage.appendChild(hybPanel);
    if (evPanel) el.stage.appendChild(evPanel);

    avg.addEventListener('click', function () {
      avg.disabled = true;
      ov.play(function () {
        key.hidden = false;
        if (mule) mule.hidden = false;
        avg.textContent = 'Play it again';
        avg.disabled = false;
        keepFocus(avg);
        if (evPanel) {
          evPanel.hidden = false;
          if (!state.done[s.id]) say('One more: the evidence. Make your prediction on the ruler.');
        } else if (!state.done[s.id]) complete('That is the hybrid.');
      });
    });
    if (done) { ov.play(); avg.textContent = 'Play it again'; say('Done. Press Next to go on.', 'good'); }
    return { destroy: function () { ov.stop(); } };
  };

  /* ---- bond strength: the resonance species next to molecules with no resonance */

  RENDER.strength = function (s) {
    var data = STRENGTH[s.sp], done = !!state.done[s.id];
    var rows = data.rows.map(function (row) { return Object.assign({ sp: Lewis.species(row.id) }, row); });
    var cards = h('div', { class: 'res-row strength-row' }, rows.map(function (row) {
      var hyb = Hybrid.compute(row.sp).n > 1;
      return h('figure', { class: 'res-card' }, [
        hyb ? Hybrid.draw(row.sp, { scale: 0.9 })
            : Draw.structure(Lewis.canonical(row.sp), { scale: 0.9, cls: 'res-fig' }),
        h('figcaption', { class: 'cap-name', text: row.sp.name + ', ' + row.sp.text + (hyb ? ' — the hybrid' : '') })
      ]);
    }));
    el.stage.appendChild(panel('Three ' + data.pair + ' bonds', null, [cards]));

    /* the evidence: a small table, with bars for the energy */
    var top = Math.max.apply(null, rows.map(function (r) { return r.energy; }));
    var table = h('table', { class: 'strength-table' }, [
      h('thead', null, [h('tr', null, [h('th', { text: '' }), h('th', { text: data.pair + ' bond order' }),
        h('th', { text: 'Length' }), h('th', { text: 'Energy to break it' })])]),
      h('tbody', null, rows.map(function (r) {
        return h('tr', { class: Hybrid.compute(r.sp).n > 1 ? 'is-hybrid' : '' }, [
          h('th', { scope: 'row', text: r.sp.text }),
          h('td', { class: 'num', text: r.order }),
          h('td', { class: 'num', text: r.length + ' pm' }),
          h('td', null, [h('span', { class: 'e-cell' }, [
            h('span', { class: 'e-track', 'aria-hidden': 'true' }, [
              h('span', { class: 'e-bar', style: 'width:' + Math.round(100 * r.energy / top) + '%' })]),
            h('span', { class: 'e-val', text: 'about ' + r.energy + ' kJ/mol' + (r.average ? ' *' : '') })])])
        ]);
      }))
    ]);
    var names = rows.map(function (r) { return r.sp.text; });
    var hybName = rows.filter(function (r) { return Hybrid.compute(r.sp).n > 1; })[0].sp;
    var reveal = [
      'Bond strength follows bond order. ' + names[0] + ' has a single bond (1) and ' + names[2] + ' a double bond (2); ' +
        'each of ' + hybName.name + '’s bonds is a bond and a half (' + rows[1].order + '). So ' + hybName.name + ' lands in ' +
        'between: stronger than the single bond, weaker than the double.',
      table,
      'More shared electrons between two atoms hold them together more tightly: a higher bond order means a SHORTER and ' +
        'STRONGER bond. Either resonance structure alone would give ' + hybName.name + ' one weak bond and one strong one. ' +
        'Really both are the same, in between — the hybrid again.',
      h('p', { class: 'small muted', text: '* For ozone, the average energy per bond to pull the molecule apart into atoms.' })
    ];
    /* weakest → strongest; three orders that are wrong, then "all the same" */
    var right = names.join(', then ');
    var wrong = [[2, 1, 0], [1, 0, 2]].map(function (o) { return o.map(function (i) { return names[i]; }).join(', then '); });
    var choices = UI.shuffle([right].concat(wrong), UI.rng(state.seed ^ UI.hash(s.id)))
      .concat(['All the same — they are all ' + data.pair + ' bonds']);
    el.stage.appendChild(panel('Weakest to strongest', 'Predict', [
      predict('Rank the ' + data.pair + ' bonds from WEAKEST to STRONGEST.', choices, choices.indexOf(right), reveal,
        function () { if (!state.done[s.id]) complete('Higher bond order: shorter and stronger.'); }, done)
    ]));
    if (done) say('Press Next for the checkpoint.', 'good');
  };

  /* ---- checkpoints */

  function question(id) {
    for (var k in QUIZZES) {
      var pool = QUIZZES[k].pool;
      for (var i = 0; i < pool.length; i++) if (pool[i].id === id) return pool[i];
    }
    return null;
  }

  function figureOf(c, cls) {
    if (c.hybrid) return Hybrid.draw(Lewis.species(c.hybrid), { variant: c.variant, labels: false, neutral: true,
      cls: 'fig ' + (cls || '') });
    return Draw.figure(Lewis.variant(Lewis.species(c.lewis), c.mod), cls);
  }

  function describeChoice(c) {
    if (c.hybrid) return Hybrid.drawingText(Lewis.species(c.hybrid), c.variant);
    return Lewis.describe(Lewis.variant(Lewis.species(c.lewis), c.mod));
  }

  /* a drawing that gives a period-3 central atom more double bonds than Rule 5
     does: a Lewis drawing (checked by the engine), or a choice listed in
     q.snark (text, or a hybrid drawn with every bond double) */
  function isSnark(q, ci) {
    if (q.snark && q.snark.indexOf(ci) >= 0) return true;
    var c = q.choices[ci];
    if (typeof c === 'string' || !c.lewis) return false;
    var sp = Lewis.species(c.lewis);
    return Lewis.expanded(Lewis.variant(sp, c.mod), sp);
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
          typeof c === 'string' ? h('span', { class: 'choice-text', text: c }) : figureOf(c, 'choice-fig')
        ]);
        if (typeof c !== 'string') b.setAttribute('aria-label', 'Choice ' + letter + ': ' + describeChoice(c));
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
        else if (isSnark(q, ci)) {
          var c = q.choices[ci];
          say(snarkText(null, null, typeof c !== 'string' && c.lewis ? Lewis.species(c.lewis) : null), 'snark');
        } else say('Not quite — the correct answer is highlighted.', 'bad');
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
    }
    /* every visit: both calls are idempotent, and a resumed attempt must still
       end up with its score and status */
    if (!preview) { reportScore(); SCORM.markComplete(); }
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
    var ideas = panel('Resonance in five lines', null, [h('ul', { class: 'keylist' }, [
      'Resonance shows up when Rule 5 has a choice: the double bond could go to more than one identical atom.',
      'Resonance structures differ only in where electrons are. The atoms never move.',
      'Draw every structure, with a double-headed arrow (↔) between them.',
      'The real molecule or ion is the hybrid — the average of the structures. It never flips between them.',
      'In the hybrid every shared bond is identical: bond order 1½ (two structures) or 1⅓ (three), between a single ' +
        'and a double bond, in length and in strength.'
    ].map(function (t) { return h('li', { text: t }); }))]);
    var gallery = panel('The hybrids you met', null, [h('div', { class: 'hyb-gallery' },
      ['O3', 'NO2', 'NO3', 'CO3', state.pool.own].map(function (id) {
        var sp = Lewis.species(id);
        return h('figure', { class: 'res-card' }, [Hybrid.draw(sp, { scale: 0.8 }),
          h('figcaption', { text: sp.text + ' · ' + Hybrid.compute(sp).order })]);
      }))]);
    el.stage.appendChild(h('div', { class: 'grid2' }, [box, ideas]));
    el.stage.appendChild(gallery);
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

  /* ---- board mode (teacher demo): ?build or ?build=CO3 */

  function board(id) {
    var ids = Object.keys(SPECIES);
    if (ids.indexOf(id) < 0) id = 'CO3';
    el.parts.hidden = true;
    el.next.hidden = true;
    el.back.hidden = true;
    el.score.hidden = true;
    el.counter.textContent = 'Teacher demo — nothing is saved or graded';
    el.instructions.textContent = 'Pick a molecule or ion, then build it, find its resonance structures, or show its hybrid.';
    var sel = h('select', { class: 'select', 'aria-label': 'Molecule or ion' }, ids.map(function (k) {
      var sp = Lewis.species(k);
      var n = Hybrid.compute(sp).n;
      return h('option', { value: k, selected: k === id, text: sp.text + ' — ' + sp.name + (n > 1 ? ' (' + n + ' structures)' : ' (no resonance)') });
    }));
    var host = h('div', { class: 'stage' });
    var cur = null;
    var modeBtns = {};
    function show(mode) {
      if (cur && cur.destroy) cur.destroy();
      cur = null;
      feedbackInto(null);
      host.innerHTML = '';
      say('');
      var sp = Lewis.species(sel.value), n = Hybrid.compute(sp).n;
      Object.keys(modeBtns).forEach(function (m) { modeBtns[m].setAttribute('aria-pressed', m === mode ? 'true' : 'false'); });
      el.stepTitle.textContent = sp.text + ' — ' + sp.name;
      if (mode !== 'build' && n < 2) {
        host.appendChild(panel('No resonance', null, [h('p', { text: sp.text + ' has only one structure: Rule 5 has no choice ' +
          'to make. Build it instead.' })]));
        return;
      }
      if (mode === 'build') {
        cur = Builder({ sp: sp, table: true, showAfter: 1, say: say, snark: snarkText, onDone: function () {} });
        host.appendChild(cur.node);
        feedbackInto(cur.node);
      } else if (mode === 'res') {
        cur = ResonanceFinder({ sp: sp, say: say, snark: snarkText, onDone: function () {} });
        host.appendChild(cur.node);
        feedbackInto(cur.node);
      } else {
        host.appendChild(panel('Resonance structures', null, [Hybrid.row(sp)]));
        var ov = Hybrid.overlay(sp);
        var play = h('button', { type: 'button', class: 'primary', text: 'Average them' });
        play.addEventListener('click', function () { ov.play(); });
        host.appendChild(panel('Resonance hybrid', null, [ov.node, h('div', { class: 'btnrow' }, [play])]));
        var rul = Hybrid.ruler(sp, {});
        if (rul) host.appendChild(panel('The evidence: bond length', null, [rul.node]));
        cur = { destroy: function () { ov.stop(); } };
      }
    }
    [['build', 'Build it'], ['res', 'Resonance structures'], ['hybrid', 'Hybrid']].forEach(function (m) {
      modeBtns[m[0]] = h('button', { type: 'button', class: 'mini', 'aria-pressed': 'false', text: m[1],
        onclick: function () { show(m[0]); } });
    });
    sel.addEventListener('change', function () { show('hybrid'); });
    el.stage.appendChild(h('div', { class: 'btnrow board-bar' }, [sel, modeBtns.build, modeBtns.res, modeBtns.hybrid]));
    el.stage.appendChild(host);
    show(Hybrid.compute(Lewis.species(id)).n > 1 ? 'hybrid' : 'build');
  }

  /* --------------------------------------------------------- references */

  function buildReference() {
    el.rulesBody.appendChild(Builder.rulesList(0, 0));
    el.ptBody.appendChild(Builder.periodicTable());
    var dl = h('dl', { class: 'vocab' });
    [
      ['Resonance structures', 'Two or more Lewis structures for the same molecule or ion that follow all the rules and differ ONLY in where the electrons are (a double bond and lone pairs). The atoms are in the same places in all of them.'],
      ['Equivalent resonance structures', 'Resonance structures that are the same structure turned around — like ozone’s two, or carbonate’s three. These are the only kind in this class.'],
      ['Double-headed arrow (↔)', 'Goes between resonance structures. It does NOT mean the molecule switches back and forth.'],
      ['Resonance hybrid', 'The one real structure: the average of all the resonance structures. Drawn with a solid line plus a dashed line for each partial double bond.'],
      ['Bond order', 'How many bonds there are between two atoms: 1 for single, 2 for double. In a hybrid it can be a fraction — 1½ for ozone and nitrite, 1⅓ for nitrate and carbonate.'],
      ['Delocalized electrons', 'Electrons spread over several atoms at once instead of sitting in one bond — the shaded cloud in the hybrid.'],
      ['Bond length', 'The distance between two bonded atoms, in picometers (pm). Higher bond order means a shorter bond.'],
      ['Bond strength', 'How much energy it takes to break a bond, in kJ/mol. Higher bond order means a stronger bond.']
    ].forEach(function (p) {
      dl.appendChild(h('dt', { text: p[0] }));
      dl.appendChild(h('dd', { text: p[1] }));
    });
    el.vocabBody.appendChild(dl);
  }

  /* ------------------------------------------------------------------ boot */

  function showIntro() {
    var box = h('div', { class: 'screen-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'introTitle' }, [
      h('h2', { id: 'introTitle', text: 'Resonance — when one Lewis structure isn’t enough' }),
      h('p', { text: 'Sometimes the 5 rules give you a choice. This activity is about what that choice means, and what the ' +
                     'molecule really looks like.' }),
      h('ul', { class: 'screen-list' }, [
        h('li', { text: 'Part 1 — Ozone: two right answers, the real molecule, and how strong its bonds are.' }),
        h('li', { text: 'Part 2 — Nitrite and nitrate: find every resonance structure, then the hybrid.' }),
        h('li', { text: 'Part 3 — Carbonate: three structures, one hybrid, and the evidence.' }),
        h('li', { text: 'Part 4 — On your own: one more, with fewer hints.' })
      ]),
      h('p', { text: 'Builds and predictions are practice: try things. The four checkpoints are graded — your first ' +
                     'answer to each question counts. About 25–30 minutes. Your progress is saved if you leave.' }),
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
    /* a real modal: nothing behind the dialog can be tabbed to or clicked */
    var behind = [document.querySelector('.topbar'), el.parts, document.querySelector('main')];
    behind.forEach(function (n) { if (n) n.setAttribute('inert', ''); });
    go.addEventListener('click', function () {
      behind.forEach(function (n) { if (n) n.removeAttribute('inert'); });
      el.screen.hidden = true;
      goTo(state.step);
    });
    go.focus();
  }

  function start() {
    ['parts', 'stepTitle', 'counter', 'instructions', 'stage', 'feedback', 'next', 'back', 'score', 'lms',
     'screen', 'rulesBody', 'ptBody', 'vocabBody'].forEach(function (id) { el[id] = $(id); });
    el.fbHome = { parent: el.feedback.parentNode, next: el.feedback.nextSibling };
    el.back.hidden = true;           /* until a step is open there is nothing to go back to */
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
      var forced = params.get('pick');            /* ?step=b-own&pick=SO3 */
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

  return { start: start, STEPS: STEPS, GRADED: GRADED, isSnark: isSnark, state: function () { return state; } };
})();

document.addEventListener('DOMContentLoaded', App.start);

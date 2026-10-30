/* app.js: the steps, their order, saving, scoring.
 *
 * Properties of liquids, on its own: the part 6 of the intermolecular forces
 * and properties of liquids activity. Surface tension, viscosity and
 * evaporation rate of bigger molecules, at one temperature (the liquid
 * bench). Each step: name the IMFs of each liquid, rank them, predict, test.
 *
 * Only the checkpoint is graded (first answer counts). Namings, rankings and
 * predictions must be finished to move on but are never scored.
 */

var App = (function () {
  'use strict';

  /* Bump whenever the step list, a quiz pool or a substance changes: a save
     from an older release is then discarded and the student starts fresh. */
  var SCHEMA = 2;

  var h = UI.h;

  var PARTS = [
    { n: 1, name: 'Properties of liquids' },
    { n: 2, name: 'Results' }
  ];

  var STEPS = [
    { id: 'liquids', part: 1, kind: 'props', title: 'Three properties of liquids', ids: ['pentane', 'butanol'],
      props: [['st', true], ['visc', true], ['evap', true]],
      text: 'Three properties of a liquid, all compared at the same temperature. Surface tension: how strongly the ' +
            'molecules at the surface are pulled in by their neighbours (drops bead up). Viscosity: how strongly a liquid ' +
            'resists flowing (it pours slowly). Evaporation rate: how fast molecules escape from the surface. Stronger ' +
            'IMFs: higher surface tension, higher viscosity, slower evaporation.' },
    { id: 'hydrocarbons', part: 1, kind: 'props', title: 'Bigger hydrocarbons', ids: ['pentane', 'heptane', 'octane', 'decane'],
      props: [['visc', true], ['st', false], ['evap', false]],
      text: 'Chains of 5 to 10 carbon atoms with only C–C and C–H bonds. A hydrocarbon like these is nonpolar, so it ' +
            'has only LDF. Name the IMFs of each, rank them, then predict.' },
    { id: 'forty-two', part: 1, kind: 'props', title: 'About 40 electrons, three forces', ids: ['pentane', 'butanone', 'butanol'],
      props: [['visc', true], ['st', false], ['evap', true]],
      text: 'Pentane, 2-butanone and 1-butanol have 42, 40 and 42 electrons: about the same LDF. Name the IMFs of each, ' +
            'rank them, then predict.' },
    { id: 'fifty-eight', part: 1, kind: 'props', title: '58 electrons each', ids: ['heptane', 'hexanol', 'pentanediol'], count: true,
      props: [['visc', true], ['st', true], ['evap', false]],
      text: 'Heptane, 1-hexanol and 1,5-pentanediol all have 58 electrons. Name the IMFs of each and count its hydrogen ' +
            'bonds, rank them, then predict.' },
    { id: 'quiz-E', part: 1, kind: 'quiz', quiz: 'E', title: 'Checkpoint' },

    { id: 'results', part: 2, kind: 'results', title: 'Results', text: '' }
  ];

  var GRADED = Object.keys(QUIZZES).reduce(function (s, k) { return s + QUIZZES[k].draw; }, 0);

  var el = {};
  var state = null;
  var ctl = null;
  var preview = false;

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }

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

  function sub(id) { return Chem.sub(id); }

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
    return { v: SCHEMA, seed: seed, step: 0, max: 0, draws: draws, ans: {}, pick: {}, pr: {}, done: {}, as: {}, pp: {}, fin: 0,
             best: 0, att: 1 };
  }

  function restore(saved) {
    if (!saved || !saved.draws || saved.v !== SCHEMA) return null;
    var ok = Object.keys(QUIZZES).every(function (k) {
      return (saved.draws[k] || []).length === QUIZZES[k].draw && saved.draws[k].every(function (id) {
        return QUIZZES[k].pool.some(function (q) { return q.id === id; });
      });
    });
    if (ok && !saved.as) saved.as = {};
    if (ok && !saved.pp) saved.pp = {};
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
      ? 'Graded: your first answer to each question counts. Read the explanation after each one. The periodic table' +
        (s.quiz === 'C' ? ' and the electronegativity table are' : ' is') + ' open beside the questions.'
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
    ctl = RENDER[s.kind](mixed(s)) || null;
    window.scrollTo(0, 0);
  }

  /* The substances of a race, a count, a ranking or the halogens in a
     different order for each student (the same one every visit), never
     lowest boiling point to highest when there are three or more. */
  function mixed(s) {
    if (['race', 'count', 'rank', 'phases', 'props'].indexOf(s.kind) < 0 || !s.ids || s.ids.length < 2) return s;
    var ids = UI.shuffle(s.ids.slice(), UI.rng(state.seed ^ UI.hash(s.id)));
    var rising = ids.every(function (id, k) { return !k || sub(ids[k - 1]).bp < sub(id).bp; });
    if (rising && ids.length > 2) ids.push(ids.shift());
    var copy = {};
    Object.keys(s).forEach(function (k) { copy[k] = s[k]; });
    copy.ids = ids;
    return copy;
  }

  function panel(title, hint, kids, cls) {
    return h('section', { class: 'panel ' + (cls || '') }, [
      h('div', { class: 'panel-head' }, [h('h3', { text: title }), hint ? h('span', { class: 'hint', text: hint }) : null])
    ].concat(kids || []));
  }

  function row(kind, cells) { return h('div', { class: 'work-row row-' + kind }, cells.filter(Boolean)); }

  var RENDER = {};

  /* ---- name the IMFs of each substance, from its Lewis structure

     The habit the class builds before every comparison: for each substance,
     switch on every force it has (LDF, dipole-dipole, hydrogen bonding) and
     check. A wrong choice gets the specific reason (Chem.forcesFeedback).
     opts.onDone runs once every substance is right and returns what to do
     next; opts.extra(id) adds more to a card once its forces are right (the
     hydrogen-bond count). */

  var FORCES = [['ldf', 'London dispersion'], ['dipole', 'Dipole-dipole'], ['hbond', 'Hydrogen bonding']];

  function assignBlock(s, opts) {
    opts = opts || {};
    var got = state.as[s.id] || (state.as[s.id] = {});
    if (state.done[s.id]) s.ids.forEach(function (id) { got[id] = 1; });
    var picks = {};
    var wrap = h('div', { class: 'assign n' + s.ids.length });
    /* part 6 goes by IUPAC names: the name leads, and feedback uses it */
    var byName = s.kind === 'props';
    function label(id) { return byName ? sub(id).name : sub(id).text; }
    function words(id, t) { return byName ? Chem.cap(t.split(sub(id).text).join(sub(id).name)) : t; }
    function done() { return s.ids.every(function (id) { return got[id]; }); }

    function card(id) {
      var x = sub(id), right = !!got[id];
      var kids = [
        h('div', { class: 'card-head' }, byName ? [h('b', { text: x.name }), h('span', { class: 'muted', text: x.text })]
          : [h('b', { text: x.text }), h('span', { class: 'muted', text: x.name + (x.everyday ? ' (' + x.everyday + ')' : '') })]),
        h('div', { class: 'assign-fig' }, [Mol2D.figure(id, { cls: 'fig' })]),
        h('p', { class: 'assign-e', text: x.electrons + ' electrons' })
      ];
      if (right) {
        var f = Chem.forces(id);
        kids.push(h('div', { class: 'imf-chips', 'aria-label': x.name + ' has ' + Chem.forcesText(id) },
          FORCES.filter(function (k) { return f[k[0]]; }).map(function (k) { return h('span', { class: 'imf-chip ' + k[0], text: k[1] }); })));
        if (opts.extra) { var ex = opts.extra(id); if (ex) kids.push(ex); }
      } else {
        var p = picks[id] || (picks[id] = { ldf: false, dipole: false, hbond: false });
        kids.push(h('p', { class: 'assign-q', text: 'Which IMFs does ' + label(id) + ' have?' }));
        kids.push(h('div', { class: 'imf-toggles' }, FORCES.map(function (k) {
          return h('button', { type: 'button', class: 'mini toggle' + (p[k[0]] ? ' on' : ''), 'aria-pressed': p[k[0]] ? 'true' : 'false',
            'data-force': k[0], text: k[1], onclick: function () { p[k[0]] = !p[k[0]]; paint(id); } });
        })));
        kids.push(h('div', { class: 'btnrow tight' }, [h('button', { type: 'button', class: 'primary small-btn', text: 'Check',
          onclick: function () { check(id); } })]));
      }
      return h('div', { class: 'assign-card' + (opts.cardCls ? ' ' + opts.cardCls : '') + (right ? ' right' : ''), 'data-id': id }, kids);
    }

    function check(id) {
      var x = sub(id), fb = Chem.forcesFeedback(id, picks[id] || {});
      if (fb) { say(words(id, fb), 'bad'); return; }
      got[id] = 1;
      persist();
      paint();
      var next = done() && opts.onDone ? opts.onDone() : '';
      say('Right: ' + label(id) + ' has ' + Chem.forcesText(id) + '.' + (next ? ' ' + next : ''), 'good');
    }

    /* a whole repaint, or just one card (so focus stays on its toggles) */
    function paint(only) {
      if (only != null) {
        var old = wrap.querySelector('.assign-card[data-id="' + only + '"]');
        var focus = document.activeElement && old && old.contains(document.activeElement) ? document.activeElement.getAttribute('data-force') : null;
        var fresh = card(only);
        if (old) wrap.replaceChild(fresh, old);
        if (focus) { var b = fresh.querySelector('[data-force="' + focus + '"]'); if (b) b.focus(); }
        return;
      }
      var was = document.activeElement && wrap.contains(document.activeElement) ? document.activeElement.getAttribute('aria-label') : null;
      wrap.innerHTML = '';
      s.ids.forEach(function (id) { wrap.appendChild(card(id)); });
      if (was) {
        var back = [].filter.call(wrap.querySelectorAll('button'), function (b) { return b.getAttribute('aria-label') === was && !b.disabled; })[0];
        if (back) back.focus();
      }
    }
    paint();
    return { node: wrap, done: done, repaint: function () { paint(); } };
  }

  function assignPanel(a) {
    return panel('Name the IMFs of each', 'from its Lewis structure: pick every force it has, rule out the rest', [a.node], 'passign');
  }

  /* ---- properties of liquids

     Name the IMFs of each liquid (and count its hydrogen bonds where
     s.count), rank the liquids by IMF strength, predict each property in
     s.props ([prop, most]), then run the liquid bench. Every answer comes
     from the class's rule (Chem.compare, Chem.propBest); the validator
     checks each one against the real data. */

  RENDER.props = function (s) {
    var pp = state.pp[s.id] || (state.pp[s.id] = {});
    pp.q = pp.q || {};
    pp.c = pp.c || {};
    if (state.done[s.id]) { pp.r = 1; s.props.forEach(function (x, k) { pp.q[k] = 1; }); }
    var strongest = s.ids.slice().sort(function (a, b) {
      var c = Chem.compare(a, b);
      return c.winner === a ? -1 : c.winner === b ? 1 : 0;
    });
    var ranked = pp.r ? strongest.slice() : [];
    var rankHost = h('div', { class: 'rank-cards' });
    var propHost = h('div', { class: 'prop-qs' });
    var benchHost = h('div', { class: 'bench-host' });
    var runBtn = h('button', { type: 'button', class: 'primary', text: 'Run the tests' });

    function countLine(id) {
      var x = sub(id);
      if (!s.count) return null;
      var right = pp.c[id] === x.pairs;
      return h('div', { class: 'count-lines' }, [h('div', { class: 'count-line' }, [h('span', { class: 'count-q', text: 'Hydrogen bonds it can make' }),
        h('span', { class: 'count-btns' }, [0, 1, 2, 3, 4].map(function (n) {
          return h('button', { type: 'button', class: 'mini' + (pp.c[id] === n ? (right ? ' on good' : ' on') : ''), text: String(n),
            'aria-label': 'Hydrogen bonds ' + x.name + ' can make: ' + n, disabled: right, onclick: function () { count(id, n); } });
        }))])]);
    }
    function counted() { return !s.count || s.ids.every(function (id) { return pp.c[id] === sub(id).pairs; }); }
    function count(id, n) {
      var x = sub(id);
      pp.c[id] = n;
      if (n === x.pairs) {
        persist();
        say(x.name + ' can make ' + n + ' hydrogen bond' + (n === 1 ? '' : 's') + ' per molecule' + (x.pairs ? ': ' + x.donors.length +
          ' H on O and ' + x.receivers.length + ' lone pairs on O, and the smaller number counts.' : ': it has no H on N, O or F.') +
          (counted() ? ' Now rank them.' : ''), 'good');
      } else {
        say(x.pairs ? 'Count the H atoms on O (' + x.donors.length + ') and the lone pairs on O (' + x.receivers.length +
          '): the smaller number is how many hydrogen bonds it can make.' : x.name + ' has no H on N, O or F, so it cannot donate: 0.', 'bad');
      }
      a.repaint();
      paint();
    }

    var a = assignBlock(s, { extra: countLine, onDone: function () { paint(); return s.count ? 'Now count the hydrogen bonds of each.' : 'Now rank them.'; } });
    el.stage.appendChild(assignPanel(a));
    el.stage.appendChild(row('props', [
      panel(s.ids.length === 2 ? 'Which has the stronger IMFs?' : 'Rank the IMFs', s.ids.length === 2 ? null : 'strongest first',
        [rankHost], 'prank'),
      panel('Predict the properties', 'all at the same temperature', [propHost], 'pprops')]));
    el.stage.appendChild(panel('The liquid bench', 'the same three tests on every liquid', [benchHost,
      h('div', { class: 'btnrow' }, [runBtn])], 'pbench'));

    function paintRank() {
      rankHost.innerHTML = '';
      if (!a.done() || !counted()) {
        rankHost.appendChild(h('p', { class: 'muted', text: 'First name the IMFs of each (above)' + (s.count ? ' and count its hydrogen bonds' : '') + '.' }));
        return;
      }
      s.ids.forEach(function (id) {
        var x = sub(id), at = ranked.indexOf(id);
        rankHost.appendChild(h('button', { type: 'button', class: 'rank-card' + (at >= 0 ? ' placed' : ''), disabled: at >= 0,
          'aria-label': x.name + ', ' + x.electrons + ' electrons, ' + Chem.forcesText(id) + (at >= 0 ? ', placed ' + (at + 1) : ''),
          onclick: function () { place(id); } }, [
          h('span', { class: 'rank-num', text: at >= 0 ? (s.ids.length === 2 ? 'stronger' : String(at + 1)) : '?' }),
          h('span', { class: 'rank-label' }, [h('b', { text: x.name }), h('br'),
            h('span', { class: 'muted', text: x.electrons + ' electrons, ' + Chem.forcesText(id) + (x.pairs ? ', ' + x.pairs + ' H-bond' + (x.pairs > 1 ? 's' : '') : '') })])
        ]));
      });
    }
    function place(id) {
      var want = strongest[ranked.length];
      if (id === want) {
        ranked.push(id);
        if (s.ids.length === 2) ranked.push(strongest[1]);
        if (ranked.length === s.ids.length) {
          pp.r = 1; persist();
          say('Right: ' + Chem.cap(strongest.map(function (x) { return sub(x).name; }).join(' > ')) + '. Now predict the properties.', 'good');
        } else say('Right. Which is next strongest?', 'good');
      } else {
        say('Not yet: ' + Chem.cap(Chem.reason(want, id).split(sub(want).text).join(sub(want).name).split(sub(id).text).join(sub(id).name)), 'bad');
      }
      paint();
    }

    function paintProps() {
      propHost.innerHTML = '';
      if (!pp.r) { propHost.appendChild(h('p', { class: 'muted', text: 'Rank the IMFs first. Then predict.' })); return; }
      propHost.appendChild(h('p', { class: 'prop-rule', text: 'Stronger IMFs: higher surface tension, higher viscosity, slower evaporation.' }));
      s.props.forEach(function (q, k) {
        var best = Chem.propBest(q[0], s.ids, q[1]);
        var line = h('div', { class: 'prop-q' + (pp.q[k] ? ' right' : '') }, [h('p', { class: 'prop-ask', text: 'Which ' + Chem.propAsk(q[0], q[1], s.ids.length) + '?' })]);
        line.appendChild(h('div', { class: 'prop-btns' }, s.ids.map(function (id) {
          return h('button', { type: 'button', class: 'mini' + (pp.q[k] && id === best ? ' on good' : ''), text: sub(id).name,
            disabled: !!pp.q[k], onclick: function () { pick(k, q, best, id); } });
        })));
        propHost.appendChild(line);
      });
    }
    function pick(k, q, best, id) {
      if (id === best) {
        pp.q[k] = 1; persist();
        var left = s.props.some(function (x, j) { return !pp.q[j]; });
        say('Right. ' + (s.ids.length === 2 ? Chem.propReason(q[0], s.ids[0], s.ids[1]) : sub(best).name + ' ' + Chem.propAsk(q[0], q[1], s.ids.length) + '.') +
          (left ? '' : ' Now run the tests on the bench.'), 'good');
      } else {
        say('Not quite. ' + Chem.propReason(q[0], id, best), 'bad');
      }
      paint();
    }

    var bench = null;
    function paintBench() {
      var ready = pp.r && s.props.every(function (x, k) { return pp.q[k]; });
      runBtn.disabled = !ready;
      runBtn.textContent = state.done[s.id] ? 'Run the tests again' : 'Run the tests';
      if (!bench) {
        benchHost.innerHTML = '';
        if (!ready) { benchHost.appendChild(h('p', { class: 'muted', text: 'The bench opens once you have ranked and predicted.' })); return; }
        bench = LiquidBench(benchHost, { ids: s.ids, ran: !!state.done[s.id], onDone: function () {
          if (!state.done[s.id]) complete('The tests agree with the rule: stronger IMFs, higher surface tension, higher viscosity, slower evaporation.');
          runBtn.textContent = 'Run the tests again';
        } });
      }
    }
    runBtn.addEventListener('click', function () { if (bench) { bench.run(); say('Watch all three tests.'); } });

    function paint() { paintRank(); paintProps(); paintBench(); }
    paint();
    return { destroy: function () { if (bench) bench.destroy(); } };
  };

  /* ---- quiz */

  function question(id) {
    for (var k in QUIZZES) {
      var pool = QUIZZES[k].pool;
      for (var i = 0; i < pool.length; i++) if (pool[i].id === id) return pool[i];
    }
    return null;
  }

  function periodicTable() {
    /* only the columns this activity uses: groups 1, 14, 15, 16, 17 and 18 */
    var rows = [['H', '', '', '', '', 'He'], ['', 'C', 'N', 'O', 'F', 'Ne'], ['', '', '', '', 'Cl', 'Ar'],
                ['', '', '', '', 'Br', 'Kr'], ['', '', '', '', 'I', 'Xe']];
    var t = h('table', { class: 'ptable', 'aria-label': 'Atomic numbers of the elements in this activity' });
    rows.forEach(function (r) {
      t.appendChild(h('tr', null, r.map(function (sym) {
        return h('td', { class: 'pt-cell' + (sym ? '' : ' empty') }, sym ? [h('span', { class: 'pt-z', text: String(ELEMENTS[sym].z) }), sym] : []);
      })));
    });
    return h('div', { class: 'ptable-wrap' }, [t, h('p', { class: 'ref-foot', text: 'The atomic number is the number of electrons in a neutral atom. ' +
      'Add them up for a molecule.' })]);
  }

  function enTable() {
    return h('table', { class: 'ref-table en-table' }, [h('tr', null, [h('th', { text: 'Element' }), h('th', { text: 'Electronegativity' })])]
      .concat(['H', 'C', 'N', 'O', 'F', 'Cl'].map(function (x) {
        return h('tr', null, [h('td', { text: x }), h('td', { class: 'num', text: ELEMENTS[x].en.toFixed(2) })]);
      })));
  }

  function propRule() {
    return h('div', { class: 'ref-rule' }, [h('p', { class: 'ref-foot', text: 'At the same temperature, stronger IMFs mean:' }),
      h('ul', { class: 'keylist' }, ['higher surface tension', 'higher viscosity', 'slower evaporation'].map(function (t) { return h('li', { text: t }); }))]);
  }

  RENDER.quiz = function (s) {
    var Q = QUIZZES[s.quiz];
    var ids = state.draws[s.quiz];
    var box = h('div', { class: 'quiz' });
    var side = h('details', { class: 'reference quiz-table', open: true }, [h('summary', { text: 'Reference' }), periodicTable(),
      s.quiz === 'C' ? enTable() : null, s.quiz === 'E' ? propRule() : null]);
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
      if (q.figs) box.appendChild(h('div', { class: 'q-figs' }, q.figs.map(function (fid) {
        var x = sub(fid);
        return h('figure', { class: 'q-mol' }, [Mol2D.figure(fid, { cls: 'fig' }),
          h('figcaption', { text: x.text + (x.name.toLowerCase() !== x.text.toLowerCase() ? ' ' + x.name : '') })]);
      })));
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
      'Every substance has London dispersion forces (LDF). More electrons, more polarizable, stronger LDF.',
      'Polar molecules add dipole-dipole forces: the δ+ end of one attracts the δ− end of another.',
      'An H bonded to N, O or F (the donor) is drawn to a lone pair on N, O or F of another molecule (the receiver): a hydrogen bond. Count how many each molecule can make: the smaller of its donors and its lone pairs on N, O or F.',
      'With about the same number of electrons: LDF < dipole-dipole < hydrogen bonding. A hydrocarbon of only C–C and C–H bonds is nonpolar: LDF only.',
      'Liquids at the same temperature: stronger IMFs, higher surface tension, higher viscosity and slower evaporation.'
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
    el.ptBody.appendChild(periodicTable());
    el.enBody.appendChild(enTable());
    var dl = h('dl', { class: 'vocab' });
    [
      ['Intermolecular forces (IMFs)', 'Attractions BETWEEN molecules (or atoms). They hold liquids and solids together. They are much weaker than the bonds inside a molecule.'],
      ['London dispersion forces (LDF)', 'Attractions between temporary dipoles: a shifting electron cloud makes a momentary δ− side and δ+ side, which shifts the cloud of its neighbour. Every substance has them.'],
      ['Polarizability', 'How easily an electron cloud is pushed out of shape. More electrons, farther from the nucleus: more polarizable, stronger LDF.'],
      ['Dipole-dipole forces', 'The attraction between the δ+ end of one polar molecule and the δ− end of another.'],
      ['Hydrogen bond', 'The attraction between an H bonded to N, O or F (the donor) and a lone pair on N, O or F of another molecule (the receiver).'],
      ['H-bond donor', 'An H bonded to N, O or F. The big electronegativity difference leaves it strongly δ+.'],
      ['H-bond receiver', 'A lone pair on an N, O or F atom, which the δ+ H of another molecule is drawn to.'],
      ['Melting point, boiling point', 'The temperatures at which a substance melts and boils at normal pressure. Stronger IMFs, higher melting and boiling points.'],
      ['Surface tension', 'How strongly the molecules at the surface of a liquid are pulled in by their neighbours. Stronger IMFs, higher surface tension: drops bead up.'],
      ['Viscosity', 'How strongly a liquid resists flowing. Stronger IMFs, higher viscosity: it pours slowly.'],
      ['Evaporation rate', 'How fast molecules escape from the surface of a liquid into the air. Stronger IMFs, slower evaporation.']
    ].forEach(function (p) { dl.appendChild(h('dt', { text: p[0] })); dl.appendChild(h('dd', { text: p[1] })); });
    el.vocabBody.appendChild(dl);
  }

  /* ------------------------------------------------------------------ boot */

  function showIntro() {
    var box = h('div', { class: 'screen-box', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'introTitle' }, [
      h('h2', { id: 'introTitle', text: 'Properties of liquids' }),
      h('p', { text: 'Why does one liquid bead up, pour slowly and hardly evaporate, while another spreads, splashes ' +
                     'and disappears? You will name the intermolecular forces (IMFs) of bigger molecules, rank them, and ' +
                     'predict their surface tension, viscosity and evaporation rate, then test them on the liquid bench.' }),
      h('p', { text: 'Rankings and predictions are never graded, so try things. The checkpoint at the end is graded: ' +
                     'your first answer to each question counts. About 15 minutes. Your progress is saved if you leave.' }),
      h('p', { class: 'screen-note', text: 'Every liquid is compared at the same temperature, and every comparison here ' +
                     'agrees with real measurements. Everything works with a mouse, a touch screen or the keyboard.' })
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
     'score', 'lms', 'screen', 'ptBody', 'enBody', 'vocabBody'].forEach(function (id) { el[id] = $(id); });
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

  return { start: start, SCHEMA: SCHEMA, STEPS: STEPS, GRADED: GRADED, mixed: mixed,
           ctl: function () { return ctl; } };
})();

document.addEventListener('DOMContentLoaded', App.start);

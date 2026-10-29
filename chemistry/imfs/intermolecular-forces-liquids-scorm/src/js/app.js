/* app.js: the steps, their order, saving, scoring.
 *
 * Part 1  Melting and boiling: what boiling separates, and what temperature
 *         does to the particles (the heating stage, argon)
 * Part 2  London dispersion forces: helium and neon, the electron cloud and
 *         polarizability, the noble gas race, the halogens at 25 °C
 * Part 3  Dipole-dipole forces: permanent ends, HCl against F₂, two more
 *         pairs with (nearly) the same electrons
 * Part 4  Hydrogen bonding: donor and receiver, which H can be donated (the
 *         electronegativity difference), drawing hydrogen bonds between
 *         ethanol, water and acetone, counting hydrogen bonds
 * Part 5  All together: three 18-electron substances, three forces
 * Part 6  Properties of liquids: surface tension, viscosity and evaporation
 *         rate of bigger molecules, at one temperature (the liquid bench)
 *
 * Only the five checkpoints are graded (first answer counts). Predictions,
 * races, clicks, drawings and counts must be finished to move on but are
 * never scored.
 */

var App = (function () {
  'use strict';

  /* Bump whenever the step list, a quiz pool or a substance changes: a save
     from an older release is then discarded and the student starts fresh. */
  var SCHEMA = 1;

  var h = UI.h;
  var C = function (c) { return c + 273.15; };

  var PARTS = [
    { n: 1, name: 'Melting and boiling' },
    { n: 2, name: 'London dispersion' },
    { n: 3, name: 'Dipole-dipole' },
    { n: 4, name: 'Hydrogen bonding' },
    { n: 5, name: 'All together' },
    { n: 6, name: 'Properties of liquids' },
    { n: 7, name: 'Results' }
  ];

  var STEPS = [
    { id: 'bubbles', part: 1, kind: 'bubbles', title: 'What does boiling pull apart?', ids: ['H2O'],
      minK: C(80), maxK: C(120), startK: C(85),
      text: 'Predict first. Then warm the water past its boiling point and watch what leaves the liquid.' },
    { id: 'argon', part: 1, kind: 'race', title: 'Temperature and speed', ids: ['Ar'], predict: 'speed',
      minK: C(-200), maxK: C(-170), startK: C(-200),
      text: 'Argon atoms attract each other. Drag the thermometer from −200 °C up to −170 °C and watch the atoms.' },

    { id: 'he-ne', part: 2, kind: 'race', title: 'Helium and neon', ids: ['He', 'Ne'], predict: 'heNe',
      minK: 2, maxK: 32, startK: 2, assign: true,
      text: 'The two smallest noble gases: helium has 2 electrons, neon 10. Name the IMFs of each, predict, then warm them both.' },
    { id: 'clouds', part: 2, kind: 'cloud', title: 'Why more electrons attract more', ids: ['He', 'Ne', 'Ar', 'Kr', 'Xe'],
      predict: 'polar',
      text: 'Each atom is a nucleus in a cloud of moving electrons. Watch two atoms side by side, then try every noble gas.' },
    { id: 'noble', part: 2, kind: 'race', title: 'The noble gas race', ids: ['Ne', 'Ar', 'Kr', 'Xe'], predict: 'noble',
      minK: C(-252), maxK: C(-100), startK: C(-252), assign: true,
      text: 'Four noble gases, one thermometer. Name the IMFs of each, predict, then warm them all from −252 °C.' },
    { id: 'halogens', part: 2, kind: 'phases', title: 'The halogens at room temperature', ids: ['F2', 'Cl2', 'Br2', 'I2'],
      K: C(25), text: 'Name the IMFs of each from its Lewis structure, then predict each one’s phase at 25 °C.' },
    { id: 'quiz-A', part: 2, kind: 'quiz', quiz: 'A', title: 'Checkpoint 1' },

    { id: 'ends', part: 3, kind: 'ends', title: 'Polar molecules have ends', predict: 'ends',
      text: 'A polar molecule has a δ+ end and a δ− end that never go away. Predict how two HCl molecules hold on to each other.' },
    { id: 'hcl-f2', part: 3, kind: 'race', title: 'HCl and F₂: 18 electrons each', ids: ['F2', 'HCl'], predict: 'hclF2',
      minK: C(-200), maxK: C(-70), startK: C(-200), assign: true,
      text: 'Same number of electrons, so about the same London dispersion forces. Name the IMFs of each from its Lewis ' +
            'structure, then predict, then warm them.' },
    { id: 'ethane', part: 3, kind: 'race', title: 'Ethane and fluoromethane: 18 electrons each', ids: ['C2H6', 'CH3F'],
      predict: 'ethane', minK: C(-130), maxK: C(-60), startK: C(-130), assign: true,
      text: 'Another pair with 18 electrons each. Name the IMFs of each from its Lewis structure, then predict, then warm them.' },
    { id: 'acetone', part: 3, kind: 'race', title: 'Butane and acetone', ids: ['C4H10', 'acetone'], predict: 'acetone',
      minK: C(-30), maxK: C(70), startK: C(-30), assign: true,
      text: 'Butane has 34 electrons; acetone (nail polish remover) has 32. Name the IMFs of each from its Lewis structure, ' +
            'then predict, then warm them.' },
    { id: 'quiz-B', part: 3, kind: 'quiz', quiz: 'B', title: 'Checkpoint 2' },

    { id: 'donor', part: 4, kind: 'draw', title: 'Donor and receiver',
      mols: [{ id: 'H2O', x: 0, y: 0, rot: -37, name: 'water' }, { id: 'H2O', x: 2.6, y: 0, rot: -45, name: 'water' }],
      tasks: [{ text: 'Click an H on the left water molecule (the donor), then a lone pair on the right one (the receiver).',
                donor: [0], receiver: [1] }],
      text: 'An H bonded to O is strongly δ+ (O 3.44 − H 2.20 = 1.24). It is drawn to a lone pair on the O of the next ' +
            'molecule: a hydrogen bond.' },
    { id: 'which-h', part: 4, kind: 'whichH', title: 'Which H can be donated?',
      mols: [{ id: 'CH3OH', x: 0, y: 0 }, { id: 'acetone', x: 4.2, y: 0.4 }, { id: 'NH3', x: 8.9, y: 0.2 },
             { id: 'CH3F', x: 12.1, y: 0.2 }, { id: 'HF', x: 15.4, y: 0.2 }],
      text: 'Only an H bonded to N, O or F is δ+ enough to be donated. Click every H that can be an H-bond donor.' },
    { id: 'draw-ethanol', part: 4, kind: 'draw', title: 'Draw hydrogen bonds: ethanol and water',
      mols: [{ id: 'ethanol', x: 0, y: 0, name: 'ethanol' }, { id: 'ethanol', x: 6.4, y: 2.3, flip: true, name: 'ethanol' },
             { id: 'H2O', x: 5.7, y: -0.7, name: 'water' }],
      tasks: [{ text: 'Draw a hydrogen bond between the two ethanol molecules.', donor: [0, 1], receiver: [0, 1] },
              { text: 'Now draw one with water as the donor and an ethanol as the receiver.', donor: [2], receiver: [0, 1] },
              { text: 'And one with an ethanol as the donor and water as the receiver.', donor: [0, 1], receiver: [2] }],
      text: 'Click the H that is donated, then the lone pair that receives it. Ethanol is in hand sanitizer.' },
    { id: 'draw-acetone', part: 4, kind: 'draw', title: 'Draw hydrogen bonds: water and acetone', predict: 'acetoneSelf',
      mols: [{ id: 'acetone', x: 0, y: 0.6, name: 'acetone' }, { id: 'H2O', x: 1.3, y: -2.1, rot: 0, name: 'water' }],
      tasks: [{ text: 'Draw a hydrogen bond between water and acetone.', donor: [1], receiver: [0] }],
      text: 'Acetone mixes with water. Find the hydrogen bond that holds them together.' },
    { id: 'count', part: 4, kind: 'count', title: 'Count the hydrogen bonds', ids: ['ethanol', 'glycol'], full: true,
      predict: 'glycol', minK: C(60), maxK: C(210), startK: C(60),
      text: 'Name the IMFs of each first. Each hydrogen bond needs one H to donate and one lone pair to receive: count both, ' +
            'and the smaller number is how many hydrogen bonds one molecule can make with its neighbours.' },
    { id: 'ten', part: 4, kind: 'count', title: 'Ten electrons each', ids: ['CH4', 'NH3', 'H2O'], predict: 'ten',
      minK: C(-170), maxK: C(110), startK: C(-170),
      text: 'Methane, ammonia and water all have 10 electrons. Name the IMFs of each, count its hydrogen bonds, predict, then warm them.' },
    { id: 'quiz-C', part: 4, kind: 'quiz', quiz: 'C', title: 'Checkpoint 3' },

    { id: 'ladder', part: 5, kind: 'rank', title: 'Three forces, 18 electrons each', ids: ['F2', 'HCl', 'CH3OH'],
      minK: C(-200), maxK: C(75), startK: C(-200),
      text: 'Same electrons, so about the same LDF. Name the IMFs of each, put them in order of boiling point, lowest first, ' +
            'then warm them.' },
    { id: 'quiz-D', part: 5, kind: 'quiz', quiz: 'D', title: 'Checkpoint 4' },

    { id: 'liquids', part: 6, kind: 'props', title: 'Three properties of liquids', ids: ['pentane', 'butanol'],
      props: [['st', true], ['visc', true], ['evap', true]],
      text: 'Three properties of a liquid, all compared at the same temperature. Surface tension: how strongly the ' +
            'molecules at the surface are pulled in by their neighbours (drops bead up). Viscosity: how strongly a liquid ' +
            'resists flowing (it pours slowly). Evaporation rate: how fast molecules escape from the surface. Stronger ' +
            'IMFs: higher surface tension, higher viscosity, slower evaporation.' },
    { id: 'hydrocarbons', part: 6, kind: 'props', title: 'Bigger hydrocarbons', ids: ['pentane', 'heptane', 'octane', 'decane'],
      props: [['visc', true], ['st', false], ['evap', false]],
      text: 'Chains of 5 to 10 carbon atoms with only C–C and C–H bonds. A hydrocarbon like these is nonpolar, so it ' +
            'has only LDF. Name the IMFs of each, rank them, then predict.' },
    { id: 'forty-two', part: 6, kind: 'props', title: 'About 40 electrons, three forces', ids: ['pentane', 'butanone', 'butanol'],
      props: [['visc', true], ['st', false], ['evap', true]],
      text: 'Pentane, 2-butanone and 1-butanol have 42, 40 and 42 electrons: about the same LDF. Name the IMFs of each, ' +
            'rank them, then predict.' },
    { id: 'fifty-eight', part: 6, kind: 'props', title: '58 electrons each', ids: ['heptane', 'hexanol', 'pentanediol'], count: true,
      props: [['visc', true], ['st', true], ['evap', false]],
      text: 'Heptane, 1-hexanol and 1,5-pentanediol all have 58 electrons. Name the IMFs of each and count its hydrogen ' +
            'bonds, rank them, then predict.' },
    { id: 'quiz-E', part: 6, kind: 'quiz', quiz: 'E', title: 'Checkpoint 5' },

    { id: 'results', part: 7, kind: 'results', title: 'Results', text: '' }
  ];

  /* The predictions. A key written as `who` is worked out from the data:
     the substance that boils first, or the one with the stronger forces. */
  var PREDICT = {
    bubbles: { q: 'When water boils, what is inside the bubbles?',
      choices: ['Water molecules that have broken away from each other', 'Hydrogen gas and oxygen gas', 'Air', 'Heat'], answer: 0 },
    speed: { q: 'As the argon warms up, what happens to its atoms?',
      choices: ['They move faster', 'They get bigger', 'They attract each other more strongly', 'Nothing changes until it boils'],
      answer: 0 },
    heNe: { q: 'Which boils at the lower temperature?', who: 'first' },
    polar: { q: 'Which atom’s electron cloud will be easier to push out of shape?',
      choices: ['Xenon’s: 54 electrons, far from the nucleus', 'Helium’s: only 2 electrons', 'They are all the same'], answer: 0 },
    noble: { q: 'As you warm all four from −252 °C, which one boils first?', who: 'first' },
    ends: { q: 'Two HCl molecules attract each other most strongly when…',
      choices: ['the δ+ H of one is next to the δ− Cl of the other', 'the two Cl atoms touch', 'the two H atoms touch',
                'they point in random directions'], answer: 0 },
    hclF2: { q: 'Which one has the stronger intermolecular forces?', who: 'stronger' },
    ethane: { q: 'Which one has the stronger intermolecular forces?', who: 'stronger' },
    acetone: { q: 'Butane has 2 more electrons. Which one has the stronger intermolecular forces?', who: 'stronger' },
    acetoneSelf: { q: 'Can two acetone molecules hydrogen bond with EACH OTHER?',
      choices: ['No: acetone has no H on N, O or F to donate', 'Yes: acetone’s O has lone pairs', 'Yes: acetone has six H atoms'],
      answer: 0 },
    glycol: { q: 'Which has the higher boiling point?', who: 'stronger' },
    ten: { q: 'Which has the highest boiling point?', who: 'strongest' }
  };

  /* a prediction's choices and key, from the data where it says `who` */
  function predictionFor(key, ids) {
    var p = PREDICT[key];
    if (!p.who) return p;
    var order = ids.slice().sort(function (a, b) { return Chem.sub(a).bp - Chem.sub(b).bp; });
    var answerId = p.who === 'first' ? order[0] : order[order.length - 1];
    var choices = ids.map(function (id) { return Chem.sub(id).text + ', ' + Chem.sub(id).name; });
    if (p.who === 'stronger' || p.who === 'first') choices.push('They are the same');
    return { q: p.q, choices: choices, answer: ids.indexOf(answerId), answerId: answerId };
  }

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

  function predictCard(p, chosen, onPick) {
    var box = h('div', { class: 'predict' }, [
      h('p', { class: 'predict-kicker', text: 'Predict (not graded)' }),
      h('p', { class: 'q-text', text: p.q })
    ]);
    var row = h('div', { class: 'q-choices' });
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

  function verdict(p, chosen) {
    if (chosen == null) return '';
    return chosen === p.answer ? 'Your prediction was right. ' : 'You predicted “' + p.choices[chosen] + '”. ';
  }

  function row(kind, cells) { return h('div', { class: 'work-row row-' + kind }, cells.filter(Boolean)); }

  /* What happened in a race, in order of boiling point, from the data. */
  function raceStory(ids) {
    var order = ids.slice().sort(function (a, b) { return sub(a).bp - sub(b).bp; });
    if (order.length === 1) return '';
    var lines = [order.map(function (id) { return sub(id).text + ' boils at ' + Chem.fmtT(sub(id).bp); }).join('; ') + '.'];
    for (var i = 0; i + 1 < order.length; i++) lines.push(Chem.reason(order[i], order[i + 1]));
    return lines.join(' ');
  }

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

  /* ---- a race on the heating stage (one box is a race too) */

  RENDER.race = function (s) {
    var p = predictionFor(s.predict, s.ids);
    var host = h('div', { class: 'heat-host' });
    var side = h('div', { class: 'predict-host' });
    var a = s.assign ? assignBlock(s, { onDone: function () { draw(); return 'Now predict.'; } }) : null;
    if (a) el.stage.appendChild(assignPanel(a));
    el.stage.appendChild(row('race n' + s.ids.length, [panel('The heating stage', 'drag the thermometer', [host], 'pheat'),
      panel('Predict, then watch', null, [side], 'pside')]));
    var top = Math.max.apply(null, s.ids.map(function (id) { return sub(id).bp; }));
    var stage = HeatStage(host, { ids: s.ids, minK: s.minK, maxK: s.maxK, startK: s.startK, onChange: check });
    stage.range.disabled = state.pr[s.id] == null && !state.done[s.id];

    function check(K, maxSeen) {
      if (state.done[s.id] || state.pr[s.id] == null) return;
      if (maxSeen >= top + 0.5) {
        complete();
        draw();
      } else say(s.ids.length === 1 ? 'Keep going: past ' + Chem.fmtT(top) + '.' : 'Keep warming until every one has boiled.');
    }

    function draw() {
      side.innerHTML = '';
      if (a && !a.done()) {
        side.appendChild(h('p', { class: 'muted', text: 'First name the IMFs of each substance (above). Then predict.' }));
        return;
      }
      side.appendChild(predictCard(p, state.pr[s.id], function (i) {
        state.pr[s.id] = i;
        persist();
        stage.range.disabled = false;
        draw();
        say('Now drag the thermometer.');
        stage.range.focus();
      }));
      if (state.done[s.id]) {
        var lines = [verdict(p, state.pr[s.id])];
        if (s.id === 'argon') {
          lines[0] += 'The dashed lines are the attractions between neighbouring atoms: intermolecular forces (IMFs). ' +
            'Cold, the atoms are held still in a network of them: a solid. Warmer, they move a little, and the ' +
            'attractions keep breaking and re-forming as the atoms slide past each other: a liquid. Hot enough, the ' +
            'atoms move fast enough to break free of every attraction: a gas.';
          lines.push('Argon melts at ' + Chem.fmtT(sub('Ar').mp) + ' and boils at ' + Chem.fmtT(sub('Ar').bp) + '.');
        } else {
          lines.push(raceStory(s.ids));
        }
        if (s.id === 'he-ne') lines.push('Helium never freezes at normal pressure, so only the boiling points are compared.');
        side.appendChild(reveal(lines));
      }
    }
    draw();
    if (state.done[s.id]) stage.setK(top + 3);
    return { destroy: function () { stage.destroy(); }, stage: stage };
  };

  /* ---- what boiling pulls apart */

  RENDER.bubbles = function (s) {
    var p = PREDICT.bubbles;
    var host = h('div', { class: 'heat-host' });
    var side = h('div', { class: 'predict-host' });
    el.stage.appendChild(row('race n1', [panel('Water on the heating stage', 'drag the thermometer', [host], 'pheat'),
      panel('Predict, then watch', null, [side], 'pside')]));
    var stage = HeatStage(host, { ids: s.ids, minK: s.minK, maxK: s.maxK, startK: s.startK, onChange: function (K, maxSeen) {
      if (!state.done[s.id] && state.pr.bubbles != null && maxSeen >= sub('H2O').bp + 5) { complete(); draw(); }
    } });
    stage.range.disabled = state.pr.bubbles == null && !state.done[s.id];
    function draw() {
      side.innerHTML = '';
      side.appendChild(predictCard(p, state.pr.bubbles, function (i) {
        state.pr.bubbles = i; persist(); stage.range.disabled = false; draw(); say('Now warm the water past 100 °C.');
      }));
      if (state.done[s.id]) {
        side.appendChild(reveal([verdict(p, state.pr.bubbles) + 'Every particle that leaves is still a whole H₂O ' +
          'molecule. Boiling pulls molecules away from EACH OTHER: it overcomes the attractions between molecules, ' +
          'the intermolecular forces (IMFs). The bonds inside each molecule are untouched.',
          'The stronger the IMFs, the hotter a substance must be before its particles break free: a higher boiling ' +
          'point (and melting point).']));
      }
    }
    draw();
    if (state.done[s.id]) stage.setK(C(110));
    return { destroy: function () { stage.destroy(); } };
  };

  /* ---- the electron clouds */

  RENDER.cloud = function (s) {
    var p = PREDICT.polar;
    var host = h('div', { class: 'cloud-host' });
    var side = h('div', { class: 'predict-host' });
    el.stage.appendChild(row('cloud', [panel('Two atoms, side by side', null, [host], 'pcloud'), panel('Predict, then look', null, [side])]));
    var sim = null;
    function draw() {
      side.innerHTML = '';
      side.appendChild(predictCard(p, state.pr.polar, function (i) {
        state.pr.polar = i; persist(); draw(); if (!sim) start();
      }));
      if (state.pr.polar == null) return;
      var seen = sim ? sim.seen() : {};
      var left = s.ids.filter(function (id) { return !seen[id]; });
      side.appendChild(reveal([
        verdict(p, state.pr.polar) + 'The electrons are always moving. For an instant the cloud bunches on one side: ' +
          'that side is δ− and the other δ+, a temporary dipole. It pushes the neighbour’s electrons the same way, ' +
          'so δ− faces δ+ and the atoms attract. These are London dispersion forces (LDF).',
        'More electrons, in a bigger cloud farther from the nucleus, are easier to push out of shape: the atom is ' +
          'more polarizable. Greater polarizability, stronger LDF.',
        left.length && !state.done[s.id] ? 'Still to look at: ' + left.join(', ') + '.' : ''
      ]));
    }
    function start() {
      sim = CloudSim(host, { ids: s.ids, start: 'He', onShow: function (id, seen) {
        if (!state.done[s.id] && s.ids.every(function (x) { return seen[x]; })) complete('Helium hardly shifts; xenon shifts a lot.');
        if (state.pr.polar != null) draw();
      } });
    }
    if (state.pr.polar != null || state.done[s.id]) start();
    else host.appendChild(h('p', { class: 'muted', text: 'Make your prediction to start.' }));
    draw();
    return { destroy: function () { if (sim) sim.destroy(); } };
  };

  /* ---- the halogens at 25 °C */

  RENDER.phases = function (s) {
    var guesses = state.pr.halogens || {};
    var host = h('div', { class: 'heat-host' });
    var side = h('div', { class: 'predict-host' });
    var a = assignBlock(s, { onDone: function () { draw(); return 'All four have only LDF. Now predict each phase.'; } });
    el.stage.appendChild(assignPanel(a));
    el.stage.appendChild(row('phases', [panel('Your predictions', null, [side], 'pside'), panel('At 25 °C', null, [host], 'pheat')]));
    var stage = null;
    function draw() {
      side.innerHTML = '';
      if (!a.done()) { side.appendChild(h('p', { class: 'muted', text: 'First name the IMFs of each (above).' })); return; }
      side.appendChild(h('p', { class: 'predict-kicker', text: 'Predict (not graded)' }));
      s.ids.forEach(function (id) {
        var x = sub(id);
        side.appendChild(h('div', { class: 'phase-row' }, [
          h('span', { class: 'phase-name' }, [h('b', { text: x.text }), ' ' + x.electrons + ' electrons']),
          h('span', { class: 'phase-btns' }, ['solid', 'liquid', 'gas'].map(function (ph) {
            return h('button', { type: 'button', class: 'mini' + (guesses[id] === ph ? ' on' : ''), text: ph,
              'aria-pressed': guesses[id] === ph ? 'true' : 'false', disabled: !!state.done[s.id],
              onclick: function () { guesses[id] = ph; draw(); } });
          }))
        ]));
      });
      var all = s.ids.every(function (id) { return guesses[id]; });
      if (!state.done[s.id]) {
        side.appendChild(h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary', text: 'Show me',
          disabled: !all, onclick: function () {
            state.pr.halogens = guesses; persist(); complete(); draw(); show();
          } })]));
      } else {
        var right = s.ids.filter(function (id) { return guesses[id] === Chem.phaseAt(id, s.K); }).length;
        side.appendChild(reveal([right + ' of ' + s.ids.length + ' right. ' + s.ids.map(function (id) {
          return sub(id).text + ' is a ' + Chem.phaseAt(id, s.K);
        }).join(', ') + ' at 25 °C.',
          'All four have only LDF, so electrons decide: 18, 34, 70, 106. The more electrons, the more polarizable ' +
          'the molecule and the stronger its LDF, so the higher its melting and boiling points.']));
      }
    }
    function show() {
      if (stage) return;
      host.innerHTML = '';
      stage = HeatStage(host, { ids: s.ids, minK: s.K, maxK: s.K, startK: s.K, fixed: true });
    }
    draw();
    if (state.done[s.id]) show();
    else host.appendChild(h('p', { class: 'muted', text: 'Predict all four, then press Show me.' }));
    return { destroy: function () { if (stage) stage.destroy(); } };
  };

  /* ---- permanent ends: HCl beside F2 */

  RENDER.ends = function (s) {
    var p = PREDICT.ends;
    var hcl = Mol2D.scene([
      { id: 'HCl', x: 0, y: 0 }, { id: 'HCl', x: 2.6, y: 0 }, { id: 'HCl', x: 5.2, y: 0 },
      { id: 'HCl', x: 1, y: 1.7, rot: 180 }, { id: 'HCl', x: 3.6, y: 1.7, rot: 180 }, { id: 'HCl', x: 6.2, y: 1.7, rot: 180 }
    ], { charges: true, names: false, title: 'Six HCl molecules, lined up so the δ+ H of each is next to the δ− Cl of another.' });
    var f2 = Mol2D.scene([
      { id: 'F2', x: 0, y: 0 }, { id: 'F2', x: 2.5, y: 0.2, rot: 30 }, { id: 'F2', x: 0.6, y: 1.8, rot: 100 },
      { id: 'F2', x: 3, y: 1.8, rot: 160 }
    ], { charges: true, names: false, title: 'Four F₂ molecules: no partial charges, no ends.' });
    var side = h('div', { class: 'predict-host' });
    var wait = h('p', { class: 'muted', hidden: state.pr.ends != null, text: 'Make your prediction to see the molecules.' });
    var pics = h('div', { class: 'ends-pics', hidden: state.pr.ends == null }, [
      h('figure', null, [hcl.svg, h('figcaption', { text: 'HCl: polar. δ+ next to δ−.' })]),
      h('figure', null, [f2.svg, h('figcaption', { text: 'F₂: nonpolar. No ends to line up.' })])
    ]);
    el.stage.appendChild(row('ends', [panel('Molecules up close', null, [wait, pics], 'pends'), panel('Predict', null, [side])]));
    function draw() {
      side.innerHTML = '';
      side.appendChild(predictCard(p, state.pr.ends, function (i) {
        state.pr.ends = i; persist(); pics.hidden = false; wait.hidden = true; complete(); draw();
      }));
      if (state.pr.ends != null) {
        side.appendChild(reveal([verdict(p, state.pr.ends) + 'Cl is more electronegative than H, so HCl has a δ− Cl end ' +
          'and a δ+ H end, all the time. Neighbouring molecules turn so δ+ sits next to δ−: dipole-dipole forces.',
          'HCl still has LDF too, like every molecule. F₂ has only LDF. With the same number of electrons (18 each), ' +
          'which do you think boils higher? The next step finds out.']));
      }
    }
    draw();
  };

  /* ---- draw hydrogen bonds */

  function hbHelpers(scene) {
    function molOf(m) { return scene.mols[m]; }
    function isDonor(m, a) { return molOf(m).info.donors.indexOf(a) >= 0; }
    function bondedTo(m, a) { var s = molOf(m).s; return s.atoms[Chem.neighbours(s, a)[0]][0]; }
    function dEN(x) { return Math.abs(ELEMENTS[x].en - ELEMENTS.H.en).toFixed(2); }
    return { molOf: molOf, isDonor: isDonor, bondedTo: bondedTo, dEN: dEN };
  }

  RENDER.draw = function (s) {
    var drawn = [], task = 0, sel = null;
    if (state.done[s.id]) task = s.tasks.length;
    var host = h('div', { class: 'scene-host' });
    var taskBox = h('div', { class: 'tasks' });
    var side = h('div', { class: 'predict-host' });
    el.stage.appendChild(row('draw', [panel('Click an H, then a lone pair', 'Tab and Enter work too', [host], 'pscene'),
      panel('Your task', null, [taskBox, side])]));
    var scene, hp;

    function build() {
      host.innerHTML = '';
      var hb = drawn.map(function (d) { return { from: d.from, to: d.to, cls: 'made' }; });
      if (state.done[s.id] && !drawn.length) hb = solution();
      scene = Mol2D.scene(s.mols, { pickH: task < s.tasks.length, pickLP: task < s.tasks.length, charges: false, hb: hb,
        mark: sel ? (function () { var m = {}; m[sel[0] + ':' + sel[1]] = 'sel'; return m; })() : null,
        title: 'Lewis structures of ' + s.mols.map(function (m) { return m.name; }).join(', ') + '. ' + hb.length +
          ' hydrogen bond' + (hb.length === 1 ? '' : 's') + ' drawn.' });
      hp = hbHelpers(scene);
      host.appendChild(scene.svg);
    }

    /* the drawings a finished step shows again: one valid bond per task */
    function solution() {
      var sc = Mol2D.scene(s.mols, {});
      var out = [];
      s.tasks.forEach(function (t) {
        var done = false;
        t.donor.forEach(function (dm) {
          sc.mols[dm].info.donors.forEach(function (a) {
            if (done) return;
            t.receiver.forEach(function (rm) {
              if (done || rm === dm) return;
              var r = sc.mols[rm].info.receivers[0];
              out.push({ from: [dm, a], to: [rm, r[0], r[1]], cls: 'made' });
              done = true;
            });
          });
        });
      });
      return out;
    }

    function paintTask() {
      taskBox.innerHTML = '';
      s.tasks.forEach(function (t, i) {
        taskBox.appendChild(h('p', { class: 'task' + (i < task ? ' done' : i === task ? ' now' : '') }, [
          h('span', { class: 'task-mark', 'aria-hidden': 'true', text: i < task ? '✓' : String(i + 1) }), t.text]));
      });
      side.innerHTML = '';
      if (task >= s.tasks.length && s.predict) {
        var p = PREDICT[s.predict];
        side.appendChild(predictCard(p, state.pr[s.predict], function (i) {
          state.pr[s.predict] = i; persist(); complete(); paintTask();
        }));
        if (state.pr[s.predict] != null) side.appendChild(reveal([verdict(p, state.pr[s.predict]) + 'Acetone has lone ' +
          'pairs on its O to receive a hydrogen bond, but every one of its H atoms is bonded to C. With nothing to ' +
          'donate, acetone molecules cannot hydrogen bond with each other: between themselves they have dipole-dipole ' +
          'forces and LDF. With water, water does the donating.']));
      } else if (task >= s.tasks.length) {
        side.appendChild(reveal([s.id === 'donor'
          ? 'That dashed line is a hydrogen bond. The H is the H-bond donor: bonded to O, it is strongly δ+. The lone ' +
            'pair is the H-bond receiver. Water molecules can do this on every side, which is why water boils at 100 °C.'
          : 'Each hydrogen bond joins an H on O of one molecule to a lone pair on O of another. Ethanol and water can ' +
            'each give and each receive, which is why they mix so well.']));
      }
    }

    function onH(m, a) {
      if (task >= s.tasks.length) return;
      if (!hp.isDonor(m, a)) {
        var on = hp.bondedTo(m, a);
        say('That H is bonded to ' + on + '. ' + on + ' and H have nearly the same electronegativity (a difference of ' +
            hp.dEN(on) + '), so the H is barely δ+: it cannot be donated. Pick an H bonded to N, O or F.', 'bad');
        return;
      }
      sel = [m, a];
      build();
      say('Now click a lone pair on another molecule.');
      var lp = host.querySelector('.lp.pick');
      if (lp && document.activeElement && document.activeElement.closest && document.activeElement.closest('.scene-host')) lp.focus();
    }

    function onLP(m, a, k) {
      if (task >= s.tasks.length) return;
      if (!sel) { say('Start with the H that is donated, then click the lone pair that receives it.', 'bad'); return; }
      var t = s.tasks[task];
      if (m === sel[0]) { say('A hydrogen bond is BETWEEN molecules: pick a lone pair on a different molecule.', 'bad'); return; }
      if (t.donor.indexOf(sel[0]) < 0) {
        say('This time the donor should be ' + s.mols[t.donor[0]].name + '. Click one of its H atoms on O.', 'bad');
        sel = null; build(); return;
      }
      if (t.receiver.indexOf(m) < 0) {
        say('This time the receiver should be ' + s.mols[t.receiver[0]].name + '. Click a lone pair on its O.', 'bad'); return;
      }
      drawn.push({ from: sel, to: [m, a, k] });
      sel = null;
      task++;
      build();
      paintTask();
      if (task >= s.tasks.length) {
        if (!s.predict) complete('Hydrogen bond drawn.');
        else say('Hydrogen bond drawn. One more question.', 'good');
      } else say('Hydrogen bond drawn. Next task.', 'good');
    }

    function act(ev) {
      if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
      var t = ev.target.closest ? ev.target.closest('.pick') : null;
      if (!t) return;
      if (ev.type === 'keydown') ev.preventDefault();
      var m = +t.getAttribute('data-m'), a = +t.getAttribute('data-a');
      if (t.classList.contains('lp')) onLP(m, a, +t.getAttribute('data-k')); else onH(m, a);
    }
    host.addEventListener('click', act);
    host.addEventListener('keydown', act);
    build();
    paintTask();
  };

  /* ---- which H can be donated */

  RENDER.whichH = function (s) {
    var found = {};
    var host = h('div', { class: 'scene-host wide' });
    var side = h('div', { class: 'predict-host' });
    var t = h('table', { class: 'ref-table en-table' }, [h('tr', null, [h('th', { text: 'Bond' }), h('th', { text: 'Electronegativity difference' })])]
      .concat(['F', 'O', 'N', 'C'].map(function (x) {
        return h('tr', null, [h('td', { text: 'H–' + x }), h('td', { class: 'num', text: (ELEMENTS[x].en - ELEMENTS.H.en).toFixed(2) })]);
      })));
    el.stage.appendChild(h('div', { class: 'col' }, [panel('Click every H that can be donated', null, [host], 'pscene'),
      row('which', [panel('Electronegativity differences', 'Pauling values', [t]), panel('Found so far', null, [side])])]));
    var scene, all = [];
    function build() {
      host.innerHTML = '';
      var mark = {};
      Object.keys(found).forEach(function (k) { mark[k] = found[k]; });
      scene = Mol2D.scene(s.mols, { pickH: true, mark: mark, names: true });
      host.appendChild(scene.svg);
      all = [];
      scene.mols.forEach(function (mol) { mol.info.donors.forEach(function (a) { all.push(mol.m + ':' + a); }); });
      if (state.done[s.id]) all.forEach(function (k) { found[k] = 'good'; });
    }
    function paint() {
      side.innerHTML = '';
      var good = all.filter(function (k) { return found[k] === 'good'; }).length;
      side.appendChild(h('p', { class: 'readout', text: good + ' of ' + all.length + ' donors found.' }));
      if (good === all.length) side.appendChild(reveal(['Only the H on O in methanol, the three H on N in ammonia and ' +
        'the H on F in hydrogen fluoride. Acetone and fluoromethane have lone pairs to receive with, but every H they ' +
        'have is on C (a difference of 0.35): nothing to donate.']));
    }
    host.addEventListener('click', function (ev) {
      var g = ev.target.closest ? ev.target.closest('.atom.pick') : null;
      if (g) pick(g);
    });
    host.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      var g = ev.target.closest ? ev.target.closest('.atom.pick') : null;
      if (g) { ev.preventDefault(); pick(g); }
    });
    function pick(g) {
      var m = +g.getAttribute('data-m'), a = +g.getAttribute('data-a'), key = m + ':' + a;
      var mol = scene.mols[m], on = mol.s.atoms[Chem.neighbours(mol.s, a)[0]][0];
      var diff = (ELEMENTS[on].en - ELEMENTS.H.en).toFixed(2);
      if (mol.info.donors.indexOf(a) >= 0) {
        found[key] = 'good';
        say('Yes: an H on ' + on + ' (difference ' + diff + '), strongly δ+.', 'good');
      } else {
        found[key] = 'bad';
        say('Not that one: it is on ' + on + ', a difference of only ' + diff + '. That H is barely δ+.', 'bad');
      }
      build();
      paint();
      var again = host.querySelector('.atom[data-m="' + m + '"][data-a="' + a + '"]');
      if (again && g === document.activeElement) again.focus();
      if (all.every(function (k) { return found[k] === 'good'; }) && !state.done[s.id]) complete('All the donors found.');
    }
    build();
    paint();
  };

  /* ---- count hydrogen bonds, then race */

  RENDER.count = function (s) {
    var answers = {};
    var heatHost = h('div', { class: 'heat-host' });
    var side = h('div', { class: 'predict-host' });
    var fields = s.full ? [['donors', 'H atoms on N, O or F'], ['receivers', 'Lone pairs on N, O or F'], ['pairs', 'Hydrogen bonds it can make']]
      : [['pairs', 'Hydrogen bonds it can make']];
    function truth(id, f) { var x = sub(id); return f === 'donors' ? x.donors.length : f === 'receivers' ? x.receivers.length : x.pairs; }
    if (state.done[s.id] || state.pr[s.id] != null) s.ids.forEach(function (id) { fields.forEach(function (f) { answers[id + f[0]] = truth(id, f[0]); }); });

    /* the counting lines join each card once its IMFs are named */
    function countLines(id) {
      var x = sub(id);
      return h('div', { class: 'count-lines' }, fields.map(function (f) {
        var right = answers[id + f[0]] === truth(id, f[0]);
        return h('div', { class: 'count-line' }, [h('span', { class: 'count-q', text: f[1] }),
          h('span', { class: 'count-btns' }, [0, 1, 2, 3, 4].map(function (n) {
            return h('button', { type: 'button', class: 'mini' + (answers[id + f[0]] === n ? (right ? ' on good' : ' on') : ''),
              text: String(n), 'aria-label': f[1] + ' in ' + x.name + ': ' + n, disabled: right,
              onclick: function () { answer(id, f[0], n); } });
          }))]);
      }));
    }
    var a = assignBlock(s, { extra: countLines, cardCls: 'count-card', onDone: function () {
      paintSide();
      return 'Now count the hydrogen bonds each one can make.';
    } });
    el.stage.appendChild(h('div', { class: 'col' }, [panel('Name the IMFs, then count', s.full ? 'H on N, O or F; lone pairs on N, O or F' :
      'from each Lewis structure', [a.node], 'pcount'),
      row('race n' + s.ids.length, [panel('The heating stage', 'drag the thermometer', [heatHost], 'pheat'),
        panel('Predict, then watch', null, [side], 'pside')])]));
    var p = predictionFor(s.predict, s.ids);
    var stage = null;
    var top = Math.max.apply(null, s.ids.map(function (id) { return sub(id).bp; }));

    function counted() {
      return a.done() && s.ids.every(function (id) { return fields.every(function (f) { return answers[id + f[0]] === truth(id, f[0]); }); });
    }

    function answer(id, f, n) {
      var x = sub(id), want = truth(id, f);
      answers[id + f] = n;
      if (n === want) {
        say(f === 'pairs' ? x.text + ' can make ' + want + ' hydrogen bond' + (want === 1 ? '' : 's') + ' per molecule' +
          (x.pairs ? ': ' + x.donors.length + ' H to donate, ' + x.receivers.length + ' lone pair' + (x.receivers.length === 1 ? '' : 's') +
            ' to receive, and the smaller number counts.' : ': it has no H on N, O or F.') : 'Right.', 'good');
      } else if (f === 'pairs' && x.pairs && n === Math.max(x.donors.length, x.receivers.length)) {
        say('Each hydrogen bond needs one H AND one lone pair. With ' + x.donors.length + ' H and ' + x.receivers.length +
            ' lone pair' + (x.receivers.length === 1 ? '' : 's') + ', the smaller number is the limit.', 'bad');
      } else if (f === 'donors') {
        say('Count only the H atoms bonded to O (or N or F). The H atoms on C do not count.', 'bad');
      } else if (f === 'receivers') {
        say('Count the lone pairs (pairs of dots) on every O.', 'bad');
      } else {
        say(x.pairs ? 'Count the H atoms on N, O or F and the lone pairs on N, O or F; the smaller number is the answer.'
          : x.text + ' has no H on N, O or F, so it cannot donate: 0 hydrogen bonds.', 'bad');
      }
      a.repaint();
      paintSide();
    }

    function paintSide() {
      side.innerHTML = '';
      if (!a.done()) { side.appendChild(h('p', { class: 'muted', text: 'First name the IMFs of each (above). Then count, then predict.' })); return; }
      if (!counted()) { side.appendChild(h('p', { class: 'muted', text: 'Count first; then predict.' })); return; }
      side.appendChild(predictCard(p, state.pr[s.id], function (i) {
        state.pr[s.id] = i; persist(); paintSide(); startStage(); say('Now drag the thermometer.');
      }));
      if (state.done[s.id]) side.appendChild(reveal([verdict(p, state.pr[s.id]), raceStory(s.ids)]));
    }

    function startStage() {
      if (stage) { stage.range.disabled = false; return; }
      heatHost.innerHTML = '';
      stage = HeatStage(heatHost, { ids: s.ids, minK: s.minK, maxK: s.maxK, startK: s.startK, onChange: function (K, maxSeen) {
        if (!state.done[s.id] && maxSeen >= top + 0.5) { complete(); paintSide(); }
      } });
      if (state.done[s.id]) stage.setK(top + 3);
    }
    paintSide();
    if (state.pr[s.id] != null || state.done[s.id]) startStage();
    else heatHost.appendChild(h('p', { class: 'muted', text: 'The heating stage opens once you have named, counted and predicted.' }));
    return { destroy: function () { if (stage) stage.destroy(); } };
  };

  /* ---- name the IMFs, rank, then race */

  RENDER.rank = function (s) {
    var order = state.done[s.id] ? correctOrder() : [];
    var cards = h('div', { class: 'rank-cards' });
    var heatHost = h('div', { class: 'heat-host' });
    var side = h('div', { class: 'predict-host' });
    var a = assignBlock(s, { onDone: function () { paint(); return 'Now put them in order of boiling point, lowest first.'; } });
    el.stage.appendChild(assignPanel(a));
    el.stage.appendChild(h('div', { class: 'col' }, [panel('Lowest boiling point first', 'click them in order', [cards], 'prank'),
      row('race n' + s.ids.length, [panel('The heating stage', 'drag the thermometer', [heatHost], 'pheat'), panel('Why', null, [side], 'pside')])]));
    var stage = null;
    var top = Math.max.apply(null, s.ids.map(function (id) { return sub(id).bp; }));
    function correctOrder() { return s.ids.slice().sort(function (a, b) { return sub(a).bp - sub(b).bp; }); }
    function paint() {
      cards.innerHTML = '';
      if (!a.done()) { cards.appendChild(h('p', { class: 'muted', text: 'First name the IMFs of each (above). Then rank them.' })); return; }
      s.ids.forEach(function (id) {
        var x = sub(id), at = order.indexOf(id);
        cards.appendChild(h('button', { type: 'button', class: 'rank-card' + (at >= 0 ? ' placed' : ''), disabled: at >= 0,
          'aria-label': x.name + ', ' + x.text + ', ' + x.electrons + ' electrons, ' + Chem.forcesText(id) + (at >= 0 ? ', placed ' + (at + 1) : ''),
          onclick: function () { place(id); } }, [
          h('span', { class: 'rank-num', text: at >= 0 ? String(at + 1) : '?' }),
          h('span', { class: 'rank-label' }, [h('b', { text: x.text }), ' ' + x.name, h('br'), h('span', { class: 'muted', text: Chem.forcesText(id) })])
        ]));
      });
    }
    function place(id) {
      var want = correctOrder();
      if (want[order.length] === id) {
        order.push(id);
        say(order.length === s.ids.length ? 'Right order. Now warm them and check it against the real boiling points.' :
          sub(id).text + ' is next. Which comes after it?', 'good');
        if (order.length === s.ids.length) startStage();
      } else {
        var x = sub(id);
        say('Not yet: ' + x.text + ' has ' + Chem.forcesText(id) + '. Start with the weakest forces: same electrons, so ' +
            'the strongest force each one has decides it.', 'bad');
      }
      paint();
      paintSide();
    }
    function paintSide() {
      side.innerHTML = '';
      if (order.length < s.ids.length) return;
      side.appendChild(reveal([s.ids.map(function (id) { return sub(id).text + ': ' + Chem.forcesText(id); }).join('. ') + '.',
        state.done[s.id] ? raceStory(s.ids) : '']));
    }
    function startStage() {
      if (stage) return;
      heatHost.innerHTML = '';
      stage = HeatStage(heatHost, { ids: s.ids, minK: s.minK, maxK: s.maxK, startK: s.startK, onChange: function (K, maxSeen) {
        if (!state.done[s.id] && maxSeen >= top + 0.5) { complete(); paintSide(); }
      } });
      if (state.done[s.id]) stage.setK(top + 3);
    }
    paint();
    paintSide();
    if (order.length === s.ids.length) startStage();
    else heatHost.appendChild(h('p', { class: 'muted', text: 'The heating stage opens once they are in order.' }));
    return { destroy: function () { if (stage) stage.destroy(); } };
  };

  /* ---- part 6: properties of liquids

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
      'Melting and boiling pull molecules away from each other. They overcome intermolecular forces (IMFs); the bonds inside the molecules stay whole.',
      'Temperature is how fast the particles move. They break free once they move fast enough to overcome the attractions holding them.',
      'Every substance has London dispersion forces (LDF). More electrons, more polarizable, stronger LDF.',
      'Polar molecules add dipole-dipole forces: the δ+ end of one attracts the δ− end of another.',
      'An H bonded to N, O or F (the donor) is drawn to a lone pair on N, O or F of another molecule (the receiver): a hydrogen bond. Count how many each molecule can make: the smaller of its donors and its lone pairs on N, O or F.',
      'With about the same number of electrons: LDF < dipole-dipole < hydrogen bonding. Stronger IMFs, higher melting and boiling points.',
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

  /* ---- explore (teacher demo): ?explore=H2O,NH3,CH4 */

  function explore(param) {
    var ids = (param || 'Ne,Ar,Kr,Xe').split(',').filter(function (id) { return SUBSTANCES[id]; }).slice(0, 4);
    if (!ids.length) ids = ['Ne', 'Ar', 'Kr', 'Xe'];
    el.parts.hidden = true;
    nav('next', 'hidden', true);
    nav('back', 'hidden', true);
    el.score.hidden = true;
    el.stepTitle.textContent = 'Explore';
    el.counter.textContent = 'Teacher demo: nothing is saved';
    el.instructions.textContent = 'Up to four substances on one thermometer: ?explore=' + Object.keys(SUBSTANCES).join(',');
    var lo = Math.min.apply(null, ids.map(function (id) { return SUBSTANCES[id].mp || SUBSTANCES[id].bp; })) - 10;
    var hi = Math.max.apply(null, ids.map(function (id) { return SUBSTANCES[id].bp; })) + 20;
    var host = h('div', { class: 'heat-host' });
    el.stage.appendChild(panel('The heating stage', null, [host], 'pheat'));
    HeatStage(host, { ids: ids, minK: Math.max(1, lo), maxK: hi, startK: Math.max(1, lo) });
  }

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
      h('h2', { id: 'introTitle', text: 'Intermolecular forces' }),
      h('p', { text: 'Why do some substances boil at −250 °C and others at 200 °C? You will warm real substances on a ' +
                     'heating stage, watch electron clouds wobble, and draw hydrogen bonds.' }),
      h('ul', { class: 'screen-list' }, [
        h('li', { text: 'Part 1, Melting and boiling: what they pull apart.' }),
        h('li', { text: 'Part 2, London dispersion forces and polarizability.' }),
        h('li', { text: 'Part 3, Dipole-dipole forces.' }),
        h('li', { text: 'Part 4, Hydrogen bonding: donors, receivers and how many.' }),
        h('li', { text: 'Part 5, All three together.' }),
        h('li', { text: 'Part 6, Properties of liquids: surface tension, viscosity and evaporation.' })
      ]),
      h('p', { text: 'Predictions are never graded, so try things. The five checkpoints are graded: your first answer to ' +
                     'each question counts. About 40 minutes. Your progress is saved if you leave.' }),
      h('p', { class: 'screen-note', text: 'Every melting and boiling point here is real. Everything works with a mouse, ' +
                     'a touch screen or the keyboard (Tab, Enter, and the arrow keys on the thermometer).' })
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

  return { start: start, SCHEMA: SCHEMA, STEPS: STEPS, GRADED: GRADED, PREDICT: PREDICT, predictionFor: predictionFor, mixed: mixed,
           raceStory: raceStory, ctl: function () { return ctl; } };
})();

document.addEventListener('DOMContentLoaded', App.start);

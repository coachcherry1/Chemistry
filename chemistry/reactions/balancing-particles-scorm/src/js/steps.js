/* steps.js: the lesson steps that are not a plain workbench, and the screen
 * for the graded choice questions.
 *
 *   Steps.count      subscripts and coefficients: count the atoms in a picture
 *   Steps.change     what may be changed: a subscript or a coefficient?
 *   Steps.conserved  four pictures: are the atoms conserved?
 *   Steps.types      the six types of reaction, a card each (package 2)
 *   Steps.sort       classify eight reactions (package 2)
 *   Steps.quiz       graded choice questions, one at a time, Submit answer
 *
 * Each takes (host, st, cb): st is this step's saved state; cb.save(),
 * cb.complete(msg), cb.say(msg, kind). None of the lesson steps is graded.
 */
var Steps = (function () {
  'use strict';
  var h = UI.h;

  function panel(title, hint, kids, cls) {
    return h('section', { class: 'panel' + (cls ? ' ' + cls : '') }, [
      h('div', { class: 'panel-head' }, [h('h3', { text: title }), hint ? h('span', { class: 'hint', text: hint }) : null])
    ].concat(kids || []));
  }
  function note(text, kind) { return h('p', { class: 'fb show ' + (kind || 'tip'), text: text }); }
  function elName(el) { return Particles.EL[el][0]; }

  /* ------------------------------------------------------------------ count */

  var COUNT = [[3, 'H2O'], [2, 'Al2O3'], [2, 'Ca(OH)2']];

  function count(host, st, cb) {
    st.v = st.v || {};
    var cards = [], boxes = [];
    COUNT.forEach(function (item, k) {
      var n = item[0], f = item[1], per = Chem.parse(f);
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'pbox-svg');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', n + ' particles of ' + Chem.pretty(f));
      Particles.fill(svg, [{ f: f, n: n }], { w: 300, h: 120, max: 1.6 });
      var fb = h('p', { class: 'fb' });
      var rows = Object.keys(per).map(function (el) {
        var id = k + '-' + el;
        var inp = h('input', { class: 'coef wide', type: 'text', inputmode: 'numeric', maxlength: '2', autocomplete: 'off', value: st.v[id] || '',
          'aria-label': elName(el) + ' atoms in ' + n + ' ' + Chem.pretty(f) });
        inp.addEventListener('input', function () { st.v[id] = inp.value.trim(); inp.classList.remove('ok', 'wrong'); cb.save(); });
        inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') check(); });
        boxes.push({ k: k, el: el, inp: inp, right: n * per[el], per: per[el], n: n, f: f, fb: fb });
        return h('label', { class: 'count-row' }, [h('b', { text: el }), ' atoms ', inp]);
      });
      cards.push(panel(Rx.name(f), null, [h('p', { class: 'pic-eq', text: n + ' ' + Chem.pretty(f) }), h('figure', { class: 'pbox' }, [svg]), h('div', { class: 'count-rows' }, rows), fb]));
    });
    function check() {
      var allOk = true, blank = false, said = {};
      boxes.forEach(function (b) { b.fb.className = 'fb'; b.fb.textContent = ''; });
      boxes.forEach(function (b) {
        var v = b.inp.value.trim();
        if (v === '') { blank = true; allOk = false; return; }
        var ok = +v === b.right;
        b.inp.classList.toggle('ok', ok);
        b.inp.classList.toggle('wrong', !ok);
        if (ok) return;
        allOk = false;
        if (said[b.k]) return;
        said[b.k] = 1;
        var msg;
        if (+v === b.per) msg = 'That is the ' + b.el + ' in ONE ' + Chem.pretty(b.f) + '. The coefficient ' + b.n + ' says there are ' + b.n + ' of them: ' + b.n + ' × ' + b.per + '.';
        else if (+v === b.n) msg = b.n + ' is the number of particles. How many ' + b.el + ' atoms are in each one?';
        else if (/\(/.test(b.f) && +v * 2 === b.right) msg = 'The subscript outside the brackets multiplies everything inside them: (OH)₂ is 2 O and 2 H.';
        else msg = 'Count the ' + b.el + ' circles in the picture.';
        b.fb.textContent = msg;
        b.fb.className = 'fb show bad';
      });
      if (blank) { cb.say('Fill in every box, then Check.', null); return; }
      if (allOk) {
        st.r = 1;
        cb.complete('Right. Atoms of an element = coefficient × subscript. The coefficient counts particles; the subscript counts atoms inside one particle.');
      } else cb.say('Not yet: look at the boxes marked in red.', 'bad');
    }
    host.appendChild(h('div', { class: 'grid3' }, cards));
    host.appendChild(h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary', text: 'Check', onclick: check })]));
    if (st.r) check();
    return { done: !!st.r };
  }

  /* ----------------------------------------------------------------- change */

  function change(host, st, cb) {
    var before = { l: [{ f: 'H2', n: 1 }, { f: 'O2', n: 1 }], r: [{ f: 'H2O', n: 1 }] };
    var CHOICES = [
      { t: 'Change H₂O to H₂O₂', fb: 'That makes the atoms match, but H₂O₂ is hydrogen peroxide, not water. Changing a subscript changes the substance.' },
      { t: 'Write 2 H₂O', ok: 1, fb: 'Yes. A coefficient changes how many water molecules there are. They are still water.' },
      { t: 'Change O₂ to O', fb: 'Oxygen gas is made of O₂ molecules. Changing a subscript changes the substance, so that is not allowed.' }
    ];
    var out = h('div');
    function reveal() {
      out.innerHTML = '';
      out.appendChild(h('div', { class: 'grid2' }, [
        panel('A subscript changed', 'not allowed', [
          Bench.picture({ l: before.l, r: [{ f: 'H2O2', n: 1 }] }, { tally: true, h: 110, w: 300, eq: 'H₂ + O₂ → H₂O₂' }),
          note('The atoms match, but the product is no longer water. This is a different reaction.', 'bad')
        ]),
        panel('A coefficient changed', 'allowed', [
          Bench.picture({ l: before.l, r: [{ f: 'H2O', n: 2 }] }, { tally: true, h: 110, w: 300, eq: 'H₂ + O₂ → 2 H₂O' }),
          note('Two water molecules: still water. Oxygen now matches. Hydrogen does not yet; another coefficient will fix it.', 'good')
        ])
      ]));
    }
    var tiles = h('div', { class: 'tiles', role: 'group', 'aria-label': 'Which change is allowed?' }, CHOICES.map(function (c, i) {
      return h('button', { type: 'button', class: 'tile' + (st.pick === i ? ' on' : ''), text: c.t, onclick: function (ev) {
        st.pick = i;
        Array.prototype.forEach.call(tiles.children, function (b) { b.classList.remove('on', 'wrong'); });
        ev.currentTarget.classList.add(c.ok ? 'on' : 'wrong');
        reveal();
        st.r = 1;
        cb.complete(c.fb, c.ok ? 'good' : 'bad');
      } });
    }));
    host.appendChild(panel('Water from its elements', 'a prediction, not graded', [
      Bench.picture(before, { tally: true, h: 120, eq: 'H₂ + O₂ → H₂O' }),
      h('p', { class: 'prompt', text: 'There are 2 O atoms in the reactants and only 1 in the products. Which change is allowed?' }),
      tiles
    ]));
    host.appendChild(out);
    if (st.r) reveal();
    return { done: !!st.r };
  }

  /* -------------------------------------------------------------- conserved */

  var CARDS = [
    { rx: 'hcl', c: [1, 1, 2] }, { rx: 'mgo', c: [1, 1, 1] }, { rx: 'peroxide', c: [2, 2, 1] }, { rx: 'znhcl', c: [1, 1, 1, 1] }
  ];

  function conserved(host, st, cb) {
    st.a = st.a || [];
    var box = h('div');
    host.appendChild(box);
    function show(i) {
      box.innerHTML = '';
      var card = CARDS[i], rx = Rx.get(card.rx), items = Bench.items(rx, card.c);
      var tal = Chem.tally(rx, card.c), ok = tal.every(function (t) { return t.ok; });
      var answered = st.a[i] != null;
      var fb = h('p', { class: 'fb' });
      var nextBtn = h('button', { type: 'button', class: 'primary', hidden: true, text: i < CARDS.length - 1 ? 'Next picture →' : 'Done', onclick: function () {
        if (i < CARDS.length - 1) show(i + 1);
      } });
      var pic = h('div');
      function draw(withTally) {
        pic.innerHTML = '';
        pic.appendChild(Bench.picture(items, { tally: withTally, h: 150, w: 480 }));
      }
      function explain(pickedOk) {
        var off = tal.filter(function (t) { return !t.ok; });
        var text;
        if (ok) text = 'Every element has the same number of atoms before and after, so the atoms, and the mass, are conserved.';
        else {
          var o = off[0];
          text = elName(o.el).charAt(0).toUpperCase() + elName(o.el).slice(1) + ': ' + o.left + ' before, ' + o.right + ' after. ' +
            (o.right > o.left ? 'Atoms cannot appear from nowhere' : 'An atom cannot vanish') + ', so this picture breaks the law of conservation of mass.';
        }
        fb.textContent = (pickedOk ? 'Right. ' : 'Look again. ') + text;
        fb.className = 'fb show ' + (pickedOk ? 'good' : 'bad');
      }
      var tiles = h('div', { class: 'tiles', role: 'group', 'aria-label': 'Are the atoms conserved?' }, [true, false].map(function (v) {
        return h('button', { type: 'button', class: 'tile', disabled: answered, text: v ? 'Atoms conserved' : 'Not conserved', onclick: function (ev) {
          st.a[i] = v === ok ? 1 : 0;
          Array.prototype.forEach.call(tiles.children, function (b) { b.disabled = true; });
          ev.currentTarget.classList.add(v === ok ? 'on' : 'wrong');
          draw(true);
          explain(v === ok);
          cb.save();
          if (i === CARDS.length - 1) { st.r = 1; cb.complete('A reaction only rearranges atoms. That is why the mass before equals the mass after.'); }
          else { nextBtn.hidden = false; nextBtn.focus(); }
        } });
      }));
      draw(answered);
      if (answered) { explain(true); fb.textContent = fb.textContent.replace('Right. ', ''); nextBtn.hidden = i === CARDS.length - 1; }
      box.appendChild(panel('Picture ' + (i + 1) + ' of ' + CARDS.length, 'count each element in both boxes; not graded', [pic, tiles, fb, h('div', { class: 'btnrow' }, [nextBtn])]));
    }
    var first = 0;
    while (first < CARDS.length - 1 && st.a[first] != null) first++;
    show(first);
    return { done: !!st.r };
  }

  /* ------------------------------------------------- the six types (package 2) */

  var EXAMPLES = { S: 'mgo', D: 'electrolysis', SR: 'znhcl', DR: 'pbi2', C: 'methane', N: 'caoh2hcl' };
  var RULES3 = [
    'One product: synthesis. One reactant: decomposition. Count the substances first.',
    'An acid with a base makes a salt and water (HOH). The partners trade, but it is called a neutralization, not a double replacement.',
    'Combustion is kept for a compound of carbon and hydrogen reacting with O₂ to make CO₂ and H₂O. A metal burning in O₂ makes one product: a synthesis.'
  ];

  /* a card for each type: tap all six */
  function types(host, st, cb) {
    st.seen = st.seen || {};
    var card = h('div', { class: 'type-card' });
    var tabs = h('div', { class: 'type-tabs', role: 'group', 'aria-label': 'The six types' });
    var btns = {};
    function show(t) {
      st.seen[t] = 1;
      var T = Chem.TYPES[t], r = Rx.get(EXAMPLES[t]), c = Chem.balance(r);
      Chem.TYPE_ORDER.forEach(function (x) {
        btns[x].classList.toggle('selected', x === t);
        btns[x].setAttribute('aria-pressed', x === t ? 'true' : 'false');
        btns[x].lastChild.textContent = st.seen[x] ? ' ✓' : '';
      });
      card.innerHTML = '';
      card.appendChild(h('h4', { text: T.name }));
      card.appendChild(h('p', { class: 'type-form', text: T.form }));
      card.appendChild(h('p', { class: 'prompt', text: T.clue }));
      card.appendChild(Bench.picture(Bench.items(r, c), { tally: false, h: 130, w: 440, eq: Chem.equation(r, c) }));
      cb.save();
      var left = Chem.TYPE_ORDER.filter(function (x) { return !st.seen[x]; }).length;
      if (!left) { st.r = 1; cb.complete('Those are the six types. The three rules beside the cards settle the close calls.'); }
      else cb.say(left + ' more to look at.', null);
    }
    Chem.TYPE_ORDER.forEach(function (t) {
      btns[t] = h('button', { type: 'button', class: 'type-btn', 'aria-pressed': 'false', 'data-type': t, onclick: function () { show(t); } },
        [Chem.TYPES[t].name, h('span', { class: 'type-seen', text: st.seen[t] ? ' ✓' : '' })]);
      tabs.appendChild(btns[t]);
    });
    host.appendChild(h('div', { class: 'with-side' }, [
      panel('The six types', 'tap each one', [tabs, card]),
      panel('Three rules for close calls', null, [h('ol', { class: 'rules3' }, RULES3.map(function (t) { return h('li', { text: t }); }))])
    ]));
    show(Chem.TYPE_ORDER.filter(function (x) { return !st.seen[x]; })[0] || 'S');
    return { done: !!st.r };
  }

  /* classify eight reactions, one at a time; answered on the click, not graded.
     The equations are shown without coefficients: the type does not depend on
     them, and nitroglycerin is still to be balanced in the graded part. */
  var SORT = ['kclo3', 'cl2ki', 'cuo', 'baso4', 'propane', 'h3po4naoh', 'hno3', 'nitroglycerin'];

  function sort(host, st, cb) {
    st.a = st.a || [];
    var box = h('div');
    host.appendChild(box);
    function show(i) {
      box.innerHTML = '';
      var r = Rx.get(SORT[i]), last = i === SORT.length - 1, answered = st.a[i] != null;
      var fb = h('p', { class: 'fb' });
      var nextBtn = h('button', { type: 'button', class: 'primary', hidden: true, text: 'Next reaction →', onclick: function () { show(i + 1); } });
      function explain(ok) {
        fb.textContent = (ok ? 'Right. ' : 'Not that one. ') + Chem.TYPES[r.type].name + ': ' + Chem.TYPES[r.type].clue;
        fb.className = 'fb show ' + (ok ? 'good' : 'bad');
      }
      var tiles = h('div', { class: 'types', role: 'group', 'aria-label': 'Type of reaction' }, Chem.TYPE_ORDER.map(function (t) {
        return h('button', { type: 'button', class: 'type-btn', 'data-type': t, disabled: answered, text: Chem.TYPES[t].name, onclick: function (ev) {
          st.a[i] = t === r.type ? 1 : 0;
          Array.prototype.forEach.call(tiles.children, function (b) { b.disabled = true; if (b.getAttribute('data-type') === r.type) b.classList.add('right'); });
          if (t !== r.type) ev.currentTarget.classList.add('wrong');
          explain(t === r.type);
          cb.save();
          if (last) { st.r = 1; cb.complete('Count the reactants and products first, then look at what kind of substances they are.'); }
          else { nextBtn.hidden = false; nextBtn.focus(); }
        } });
      }));
      if (answered) {
        Array.prototype.forEach.call(tiles.children, function (b) { if (b.getAttribute('data-type') === r.type) b.classList.add('right'); });
        explain(true); fb.textContent = fb.textContent.replace('Right. ', ''); nextBtn.hidden = last;
      }
      box.appendChild(panel('Reaction ' + (i + 1) + ' of ' + SORT.length, 'not graded', [
        h('p', { class: 'pic-eq', text: Chem.equation(r) }),
        h('p', { class: 'prompt', text: 'What type of reaction is this?' }), tiles, fb, h('div', { class: 'btnrow' }, [nextBtn])]));
    }
    var first = 0;
    while (first < SORT.length - 1 && st.a[first] != null) first++;
    show(first);
    return { done: !!st.r };
  }

  /* ------------------------------------------------------------------- quiz */

  /* st.a: [{ p: index picked, ok: 1 or 0 }]. Clicking a choice only selects it;
     Submit answer grades it, once. */
  function quiz(host, questions, st, cb) {
    st.a = st.a || [];
    var box = h('div', { class: 'quiz' });
    host.appendChild(box);
    function show(i) {
      box.innerHTML = '';
      var q = questions[i], done = st.a[i], sel = done ? done.p : -1, last = i === questions.length - 1;
      var fb = h('p', { class: 'fb', role: 'status' });
      var nextBtn = h('button', { type: 'button', class: 'primary quiz-next', hidden: true, text: last ? (CONFIG.classify ? 'On to the reactions →' : 'On to the equations →') : 'Next question →', onclick: function () {
        if (last) cb.finish(); else show(i + 1);
      } });
      var submit = h('button', { type: 'button', class: 'primary submit-answer', disabled: true, text: 'Submit answer', onclick: function () {
        if (sel < 0 || st.a[i]) return;
        var ok = sel === q.right ? 1 : 0;
        st.a[i] = { p: sel, ok: ok };
        cb.answer(i, ok, q, q.choices[sel]);
        mark();
      } });
      var buttons = q.choices.map(function (text, k) {
        return h('button', { type: 'button', class: 'choice', 'aria-pressed': 'false', text: text, onclick: function () {
          if (st.a[i]) return;
          sel = k;
          buttons.forEach(function (b, j) { b.classList.toggle('selected', j === k); b.setAttribute('aria-pressed', j === k ? 'true' : 'false'); });
          submit.disabled = false;
        } });
      });
      function mark() {
        var a = st.a[i];
        buttons.forEach(function (b, j) {
          b.disabled = true;
          b.classList.remove('selected');
          if (j === q.right) b.classList.add('right');
          else if (j === a.p) b.classList.add('wrong');
          if (j === a.p) b.setAttribute('aria-pressed', 'true');
        });
        if (submit.parentNode) submit.parentNode.removeChild(submit);
        fb.textContent = (a.ok ? 'Right. ' : 'Not this time. ') + q.why;
        fb.className = 'fb show ' + (a.ok ? 'good' : 'bad');
        nextBtn.hidden = false;
        if (q.fig) { fig.innerHTML = ''; fig.appendChild(Bench.picture(Bench.items(q.fig.rx, q.fig.coefs), { tally: true, h: 140, w: 480 })); }
      }
      var fig = h('div');
      if (q.fig) fig.appendChild(Bench.picture(Bench.items(q.fig.rx, q.fig.coefs), { tally: false, h: 140, w: 480 }));
      box.appendChild(panel('Question ' + (i + 1) + ' of ' + questions.length, 'graded: your first Submit counts', [
        q.fig ? fig : null,
        h('p', { class: 'prompt', text: q.stem }),
        h('div', { class: 'choices', role: 'group', 'aria-label': 'Choices' }, buttons),
        h('div', { class: 'btnrow' }, [submit, nextBtn]),
        fb
      ]));
      if (done) mark();
    }
    var at = 0;
    while (at < questions.length - 1 && st.a[at]) at++;
    show(at);
    return { show: show };
  }

  return { count: count, change: change, conserved: conserved, types: types, sort: sort, quiz: quiz, CARDS: CARDS, COUNT: COUNT, EXAMPLES: EXAMPLES, SORT: SORT, RULES3: RULES3 };
})();

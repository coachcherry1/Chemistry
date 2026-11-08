/* scenes.js: the opening steps that are not a problem table.
 *   heat    (hydrate) what a hydrate is: heat CuSO4.5H2O in a crucible, the
 *           water leaves, the mass drops; heat again to constant mass
 *   burn    (combustion) a hydrocarbon burns: every C ends up in a CO2,
 *           every H in an H2O, two to a molecule (particle view)
 *   nmean   (empirical, combustion) one empirical formula, several
 *           molecules: n = molar mass / empirical formula mass
 * Each takes (host, st, cb) like the drills: st is saved in suspend_data;
 * cb.save(), cb.complete(msg), cb.say(msg, kind). Motion follows the
 * reduced-motion setting: the end state is drawn at once.
 */
var Scenes = (function () {
  'use strict';
  var h = UI.h;
  var NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] != null) n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function panel(title, hint, kids) {
    return h('section', { class: 'panel' }, [
      h('div', { class: 'panel-head' }, [h('h3', { text: title }), hint ? h('span', { class: 'hint', text: hint }) : null])
    ].concat(kids || []));
  }
  function choices(list, onPick, label) {
    return h('div', { class: 'tiles', role: 'group', 'aria-label': label }, list.map(function (x) {
      return h('button', { type: 'button', class: 'tile', text: x.t, onclick: function (ev) { onPick(x.v, ev.currentTarget); } });
    }));
  }
  function animate(ms, step, end) {
    if (reduced()) { step(1); if (end) end(); return; }
    var t0 = null;
    function frame(t) {
      if (t0 == null) t0 = t;
      var k = Math.min(1, (t - t0) / ms);
      step(k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
      if (k < 1) requestAnimationFrame(frame); else if (end) end();
    }
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------ heat */

  /* The CuSO4.5H2O of the worked example: 2.500 g of hydrate leaves 1.598 g. */
  var HEAT = { crucible: 23.112, hydrate: 2.500 };
  function heatScene(host, st, cb) {
    var Ms = Chem.mmStd('CuSO4'), Mw = Chem.mmStd('H2O');
    var after = Chem.roundTo(HEAT.hydrate * Ms / (Ms + 5 * Mw), 3);
    var m0 = Chem.roundTo(HEAT.crucible + HEAT.hydrate, 3), m1 = Chem.roundTo(HEAT.crucible + after, 3);
    var svg = s('svg', { viewBox: '0 28 360 200', class: 'scene', role: 'img', 'aria-label': 'A crucible of copper(II) sulfate crystals over a burner, with a balance reading' });
    var flame = s('path', { d: 'M151 184 C141 166 156 160 160 145 C164 160 179 166 169 184 Z', class: 'flame', opacity: 0 });
    /* the burner: barrel, collar and base */
    svg.appendChild(s('rect', { x: 151, y: 184, width: 18, height: 30, class: 'burner' }));
    svg.appendChild(s('rect', { x: 147, y: 200, width: 26, height: 6, rx: 2, class: 'burner' }));
    svg.appendChild(s('rect', { x: 132, y: 214, width: 56, height: 8, rx: 3, class: 'burner' }));
    svg.appendChild(flame);
    /* the ring stand's clay triangle under the crucible */
    svg.appendChild(s('path', { d: 'M104 130 L216 130', class: 'triangle' }));
    svg.appendChild(s('path', { d: 'M104 130 L104 222 M216 130 L216 222', class: 'stand' }));
    svg.appendChild(s('path', { d: 'M118 96 L202 96 L190 142 L130 142 Z', class: 'crucible' }));
    var crystals = s('g', { class: 'crystals' });
    for (var i = 0; i < 14; i++) {
      var cx = 132 + (i % 7) * 9.5 + (i >= 7 ? 4 : 0), cy = i >= 7 ? 126 : 116;
      crystals.appendChild(s('path', { d: 'M' + cx + ' ' + (cy - 5) + ' l5 5 l-5 5 l-5 -5 Z', class: 'xtal' }));
    }
    svg.appendChild(crystals);
    var steam = s('g', { class: 'steam', opacity: 0 });
    [[140, 80], [160, 66], [180, 82], [150, 50], [172, 44]].forEach(function (p) {
      steam.appendChild(s('g', { transform: 'translate(' + p[0] + ',' + p[1] + ')' }, [
        s('circle', { cx: 0, cy: 0, r: 5, class: 'atom-o' }), s('circle', { cx: -6, cy: 5, r: 3, class: 'atom-h' }), s('circle', { cx: 6, cy: 5, r: 3, class: 'atom-h' })]));
    });
    svg.appendChild(steam);
    var read = s('text', { x: 300, y: 70, class: 'bal-t', 'text-anchor': 'middle' }, ['']);
    svg.appendChild(s('rect', { x: 246, y: 44, width: 108, height: 40, rx: 6, class: 'balance' }));
    svg.appendChild(read);
    svg.appendChild(s('text', { x: 300, y: 100, class: 'bal-l', 'text-anchor': 'middle' }, ['crucible + contents']));
    var label = s('text', { x: 300, y: 130, class: 'xt-l', 'text-anchor': 'middle' }, ['']);
    svg.appendChild(label);

    function paint(k) {
      /* k: 0 the hydrate, 1 the anhydrous salt */
      var mass = m0 + (m1 - m0) * k;
      read.textContent = Chem.fmtDec(mass, 3) + ' g';
      crystals.setAttribute('class', 'crystals' + (k >= 1 ? ' dry' : ''));
      crystals.style.opacity = 1;
      crystals.querySelectorAll('.xtal').forEach(function (x) { x.style.fillOpacity = String(1 - 0.75 * k); });
      label.textContent = k >= 1 ? 'anhydrous CuSO₄ (white)' : k > 0 ? '' : 'CuSO₄·5H₂O (blue)';
    }
    var info = h('div');
    var q = h('div');
    var btns = h('div', { class: 'btnrow' });
    function heat(first) {
      flame.setAttribute('opacity', 1);
      btns.innerHTML = '';
      if (first) {
        animate(2600, function (k) { paint(k); steam.setAttribute('opacity', String(Math.sin(Math.PI * Math.min(1, k * 1.15)))); steam.setAttribute('transform', 'translate(0,' + (-24 * k) + ')'); },
          function () { flame.setAttribute('opacity', 0); steam.setAttribute('opacity', 0); st.heated = 1; cb.save(); stage(); });
      } else {
        animate(1400, function () { paint(1); }, function () { flame.setAttribute('opacity', 0); st.again = 1; cb.save(); stage(); });
      }
    }
    function stage() {
      q.innerHTML = '';
      btns.innerHTML = '';
      info.innerHTML = '';
      paint(st.heated ? 1 : 0);
      if (!st.pred) {
        q.appendChild(h('p', { class: 'drill-q', text: 'Predict: when the crystals are heated, the mass of the crucible and its contents will' }));
        q.appendChild(choices([{ v: 'up', t: 'go up' }, { v: 'down', t: 'go down' }, { v: 'same', t: 'stay the same' }], function (v) {
          st.pred = v; cb.save();
          cb.say(v === 'down' ? 'Yes: heating drives the water out of the crystal, and the water vapor leaves the crucible.' :
            'Watch: the water in the crystal leaves as vapor, so the mass goes down.', v === 'down' ? 'good' : null);
          stage();
        }, 'prediction'));
        return;
      }
      if (!st.heated) {
        btns.appendChild(h('button', { type: 'button', class: 'primary', text: 'Heat', onclick: function () { heat(true); } }));
        return;
      }
      if (!st.what) {
        q.appendChild(h('p', { class: 'drill-q', text: 'The mass went from ' + Chem.fmtDec(m0, 3) + ' g to ' + Chem.fmtDec(m1, 3) + ' g. What left the crucible?' }));
        q.appendChild(choices([{ v: 'water', t: 'water (as vapor)' }, { v: 'salt', t: 'copper(II) sulfate' }, { v: 'o2', t: 'oxygen' }], function (v, btn) {
          if (v !== 'water') { btn.classList.add('wrong'); cb.say('The copper(II) sulfate stays in the crucible: only the water, the 5H₂O of the formula, is driven off.', 'bad'); return; }
          st.what = 1; cb.save(); cb.say('Right: the mass lost is the water. ' + Chem.fmtDec(m0, 3) + ' − ' + Chem.fmtDec(m1, 3) + ' = ' +
            Chem.fmtDec(m0 - m1, 3) + ' g of water.', 'good');
          stage();
        }, 'what left'));
        return;
      }
      if (!st.again) {
        q.appendChild(h('p', { class: 'drill-q', text: 'Is all the water gone? Heat it again and weigh it.' }));
        btns.appendChild(h('button', { type: 'button', class: 'primary', text: 'Heat again', onclick: function () { heat(false); } }));
        return;
      }
      info.appendChild(h('p', { class: 'drill-q', text: 'Same mass, ' + Chem.fmtDec(m1, 3) + ' g: heated to constant mass, so all the water is gone.' }));
      cb.complete('A hydrate is a salt with water in its crystal. Heat drives the water off; the mass lost is the water.');
    }
    host.appendChild(h('div', { class: 'grid2 scene-step' }, [
      panel('Heating a hydrate', 'CuSO₄·5H₂O', [svg]),
      panel('What a hydrate is', null, [
        h('p', { text: 'A hydrate is an ionic compound with water locked in its crystal. CuSO₄·5H₂O, copper(II) sulfate pentahydrate, has 5 H₂O for ' +
          'every CuSO₄. The dot means the water is part of the crystal; the anhydrous salt is the compound without its water.' }),
        h('p', { class: 'prefix-list', 'aria-label': 'Prefixes for the number of waters' }, PREFIXES.map(function (px, i) { return h('span', { text: (i + 1) + ' ' + px }); })),
        q, btns, info
      ])
    ]));
    stage();
    return { done: !!st.again };
  }

  /* ------------------------------------------------------------ burn */

  /* C3H8 + 5 O2 -> 3 CO2 + 4 H2O, every atom from its place before to its place after. */
  function burnLayout() {
    var atoms = [];
    var C = [[44, 62], [70, 62], [96, 62]];
    var Hb = [[44, 40], [44, 84], [26, 62], [70, 40], [70, 84], [96, 40], [96, 84], [114, 62]];
    var O2 = [[160, 34], [210, 34], [260, 34], [185, 86], [235, 86]];
    var CO2 = [[60, 166], [140, 166], [220, 166]];
    var H2O = [[44, 210], [104, 210], [164, 210], [224, 210]];
    C.forEach(function (p, i) { atoms.push({ el: 'C', a: p, b: CO2[i] }); });
    var Ob = [];
    CO2.forEach(function (c) { Ob.push([c[0] - 20, c[1]], [c[0] + 20, c[1]]); });
    H2O.forEach(function (w) { Ob.push(w); });
    O2.forEach(function (p, i) {
      atoms.push({ el: 'O', a: [p[0] - 9, p[1]], b: Ob[2 * i] });
      atoms.push({ el: 'O', a: [p[0] + 9, p[1]], b: Ob[2 * i + 1] });
    });
    Hb.forEach(function (p, i) { var w = H2O[Math.floor(i / 2)]; atoms.push({ el: 'H', a: p, b: [w[0] + (i % 2 ? 13 : -13), w[1] + 11] }); });
    return atoms;
  }
  function burnScene(host, st, cb) {
    var svg = s('svg', { viewBox: '0 0 300 236', class: 'scene', role: 'img', 'aria-label': 'Propane and oxygen molecules turning into carbon dioxide and water' });
    svg.appendChild(s('text', { x: 6, y: 14, class: 'sc-l' }, ['C₃H₈ + 5 O₂']));
    svg.appendChild(s('text', { x: 6, y: 138, class: 'sc-l' }, ['→ 3 CO₂ + 4 H₂O']));
    var dots = burnLayout().map(function (a) {
      var c = s('circle', { r: a.el === 'H' ? 6 : 10, class: 'atom-' + a.el.toLowerCase(), cx: a.a[0], cy: a.a[1] });
      svg.appendChild(c);
      return { c: c, a: a };
    });
    function paint(k) {
      dots.forEach(function (d) {
        d.c.setAttribute('cx', d.a.a[0] + (d.a.b[0] - d.a.a[0]) * k);
        d.c.setAttribute('cy', d.a.a[1] + (d.a.b[1] - d.a.a[1]) * k);
      });
    }
    var key = h('p', { class: 'muted key-line' }, [h('span', { class: 'kdot c' }), ' C  ', h('span', { class: 'kdot h' }), ' H  ', h('span', { class: 'kdot o' }), ' O']);
    var q = h('div'), btns = h('div', { class: 'btnrow' });
    function ask(text, want, done, wrongMsg) {
      var inp = h('input', { type: 'text', inputmode: 'numeric', class: 'blank w-w', 'aria-label': text });
      var go = function () {
        var v = Chem.parseNum(inp.value);
        if (isNaN(v)) { cb.say('Type a whole number.', null); return; }
        if (v !== want) { inp.classList.add('wrong'); cb.say(wrongMsg, 'bad'); return; }
        done();
      };
      inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); go(); } });
      q.appendChild(h('p', { class: 'drill-q' }, [text + ' ', inp, ' ', h('button', { type: 'button', class: 'primary', text: 'Check', onclick: go })]));
      inp.focus({ preventScroll: true });
    }
    function stage() {
      q.innerHTML = ''; btns.innerHTML = '';
      paint(st.burned ? 1 : 0);
      if (!st.burned) {
        btns.appendChild(h('button', { type: 'button', class: 'primary', text: 'Burn it', onclick: function () {
          btns.innerHTML = '';
          animate(2200, paint, function () { st.burned = 1; cb.save(); stage(); });
        } }));
        return;
      }
      if (!st.c) {
        ask('Propane has 3 C atoms. How many CO₂ molecules hold them?', 3, function () {
          st.c = 1; cb.save(); cb.say('Right: each CO₂ holds 1 C. So moles of C = moles of CO₂ × 1.', 'good'); stage();
        }, 'Count the black C atoms after burning: each is in its own CO₂.');
        return;
      }
      if (!st.h) {
        ask('The 8 H atoms make how many H₂O molecules?', 4, function () {
          st.h = 1; cb.save(); cb.say('Right: each H₂O holds 2 H. So moles of H = moles of H₂O × 2. Forgetting the × 2 is the most common slip.', 'good'); stage();
        }, 'Each H₂O takes 2 of the white H atoms.');
        return;
      }
      q.appendChild(h('p', { class: 'drill-q', text: 'In the lab, the H₂O and the CO₂ are caught in two tubes and weighed. Their grams give the moles of C and H; ' +
        'the oxygen came from the air, so it tells nothing about the hydrocarbon.' }));
      cb.complete('Every C ends up in a CO₂ (× 1), every H in an H₂O (× 2).');
    }
    var train = s('svg', { viewBox: '0 0 300 64', class: 'train', role: 'img', 'aria-label': 'Combustion analysis: oxygen in, a furnace burning the sample, a tube that catches water, a tube that catches carbon dioxide' });
    [['O₂ in', 4], ['furnace', 70], ['H₂O tube', 152], ['CO₂ tube', 232]].forEach(function (b, i) {
      if (i) train.appendChild(s('rect', { x: b[1], y: 18, width: 64, height: 26, rx: 5, class: i === 1 ? 'furnace' : 'tube' }));
      train.appendChild(s('text', { x: i ? b[1] + 32 : 20, y: 36, class: 'sc-s', 'text-anchor': 'middle' }, [b[0]]));
      if (i < 3) train.appendChild(s('path', { d: 'M' + (i ? b[1] + 64 : 38) + ' 31 l' + (i ? 18 : 30) + ' 0', class: 'arrow' }));
    });
    host.appendChild(h('div', { class: 'grid2 scene-step' }, [
      panel('Burning a hydrocarbon', 'propane, C₃H₈', [svg, key]),
      panel('Combustion analysis', null, [
        h('p', { text: 'A hydrocarbon has only C and H. Burned completely in oxygen, every C atom ends up in a CO₂ and every H atom in an H₂O.' }),
        train, q, btns
      ])
    ]));
    stage();
    return { done: !!st.h };
  }

  /* ----------------------------------------------------------- nmean */

  var NSETS = {
    empirical: { ef: 'CH2O', list: [['formaldehyde', 'CH2O'], ['acetic acid', 'C2H4O2'], ['lactic acid', 'C3H6O3'], ['glucose', 'C6H12O6']] },
    combustion: { ef: 'CH2', list: [['ethene', 'C2H4'], ['propene', 'C3H6'], ['cyclopentane', 'C5H10'], ['cyclohexane', 'C6H12']] }
  };
  function nScene(host, st, cb) {
    var set = NSETS[Gen.MODE] || NSETS.empirical;
    st.a = st.a || {};
    var efm = Chem.mmValue(set.ef);
    var marks = {};
    var rows = set.list.map(function (x) {
      return { name: x[0], f: x[1], M: Chem.fmtDec(Chem.mmStd(x[1]), 1), n: Chem.empirical(x[1]).n };
    });
    var body = h('tbody');
    function paint() {
      body.innerHTML = '';
      rows.forEach(function (r, i) {
        var inp = h('input', { type: 'text', inputmode: 'numeric', class: 'blank w-w' + (marks[i] ? ' ' + marks[i] : ''), 'aria-label': 'n for ' + r.name, value: st.a[i] || '' });
        inp.addEventListener('input', function () { st.a[i] = inp.value; delete marks[i]; cb.save(); });
        inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); check(); } });
        body.appendChild(h('tr', null, [h('td', { text: r.name }), h('td', { class: 'num', text: r.M + ' g/mol' }),
          h('td', null, [r.M + ' ÷ ' + Chem.mmText(set.ef) + ' = ', inp]),
          h('td', { class: 'formula', text: st.done || marks[i] === 'ok' ? Chem.subs('(' + set.ef + ')') + Chem.subs(String(r.n)) + ' = ' + Chem.subs(r.f) : '' })]));
      });
    }
    function check() {
      var msgs = [], empty = false;
      rows.forEach(function (r, i) {
        var j = Chem.judgeN(st.a[i], parseFloat(r.M), efm, r.n);
        if (j.empty) { empty = true; return; }
        marks[i] = j.ok ? 'ok' : 'wrong';
        if (!j.ok && msgs.indexOf(j.msg) < 0) msgs.push(j.msg);
      });
      paint();
      if (empty) { cb.say('Find n for every row.', null); return; }
      if (msgs.length) { cb.say(msgs[0], 'bad'); return; }
      st.done = 1; cb.save(); paint();
      cb.complete('Same empirical formula, ' + Chem.subs(set.ef) + ', different molecules: the molar mass tells which one.');
    }
    host.appendChild(h('div', { class: 'grid2 scene-step' }, [
      panel('One empirical formula, many molecules', Chem.subs(set.ef) + ': ' + Chem.mmWork(set.ef) + ' g/mol', [
        h('table', { class: 'ref-table nmean' }, [h('thead', null, [h('tr', null, ['Compound', 'Molar mass', 'n = molar mass ÷ empirical formula mass', 'Molecular formula']
          .map(function (x) { return h('th', { scope: 'col', text: x }); }))]), body]),
        h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary', text: 'Check', onclick: check })])
      ]),
      panel('The molecular formula', null, [h('ul', { class: 'keylist' }, [
        h('li', { text: 'The empirical formula is the simplest whole-number ratio. The molecular formula is the real molecule: the empirical formula × n.' }),
        h('li', { text: 'n = molar mass ÷ empirical formula mass, a whole number (1, 2, 3 ...).' }),
        h('li', { text: 'Multiply EVERY subscript by n: (' + Chem.subs(set.ef) + ')₃ is ' + Chem.subs(Chem.formulaOf(Chem.info(set.ef).order,
          (function () { var c = {}; var I = Chem.info(set.ef); I.order.forEach(function (x) { c[x] = I.counts[x] * 3; }); return c; })())) + '.' }),
        h('li', { text: 'n can be 1: then the molecular formula is the empirical formula.' })
      ])])
    ]));
    paint();
    return { done: !!st.done };
  }

  return { heat: heatScene, burn: burnScene, nmean: nScene, HEAT: HEAT };
})();

/* steps.js: the lesson steps. Each renderer draws one kind of step and is
 * registered in App.RENDER. Every number comes from Buf (buffer.js); nothing
 * here is typed twice.
 */

(function () {
  'use strict';

  var C = App.ctx, h = UI.h, R = App.RENDER;

  function pHt(v) { return v.toFixed(2); }
  function sgn(n) { return n > 0 ? '+' + n : (n < 0 ? '−' + (-n) : '0'); }
  function addedText(x) { return x === 0 ? 'nothing added' : (x > 0 ? x + ' HCl added' : (-x) + ' NaOH added'); }
  function where(text) { return h('p', { class: 'walk-where', text: text }); }
  function oneLine(text, ok) { return h('p', { class: 'walk-done' + (ok ? ' right' : ' wrong'), text: (ok ? '✓ ' : '✗ ') + text }); }

  var SERIES_BW = [{ pair: 'AC', ha: 10, a: 10, cls: 'cl-buf', label: 'Buffer' }, { pair: 'AC', ha: 0, a: 0, cls: 'cl-wtr', label: 'Pure water' }];

  /* ------------------------------------------------------------ problem */

  R.problem = function (s) {
    var st = C.state(), el = C.el();
    var buf = Flask.create('AC', { tally: false }), wtr = Flask.create('AC', { tally: false });
    buf.set(10, 10, 0); wtr.set(0, 0, 0);
    var bRead = h('p', { class: 'meter', text: 'pH ' + pHt(Buf.pH('AC', 10, 10, 0)) }),
        wRead = h('p', { class: 'meter', text: 'pH ' + pHt(Buf.pHWater(0)) });
    var after = h('div', { class: 'after-q' });
    var addHost = h('div');
    function added() {
      buf.set(10, 10, 4); wtr.set(0, 0, 4);
      var b0 = Buf.pH('AC', 10, 10, 0), b1 = Buf.pH('AC', 10, 10, 4), w0 = Buf.pHWater(0), w1 = Buf.pHWater(4);
      bRead.textContent = 'pH ' + pHt(b0) + ' → ' + pHt(b1) + '  (change ' + pHt(b0 - b1) + ')';
      wRead.textContent = 'pH ' + pHt(w0) + ' → ' + pHt(w1) + '  (change ' + pHt(w0 - w1) + ')';
      after.innerHTML = '';
      after.appendChild(C.reveal([
        'The same 4 particles of HCl went into both flasks. The pure water has nothing to react with the H⁺, so its pH crashes from ' +
          pHt(w0) + ' to ' + pHt(w1) + '. The buffer’s pH moves only from ' + pHt(b0) + ' to ' + pHt(b1) + '.',
        'Look at the buffer: the 4 H⁺ are not drawn as free H⁺. Something in the flask used them up. The rest of this activity is about what, and how.'
      ]));
      if (!st.done[s.id]) C.complete();
    }
    function offerAdd() {
      addHost.innerHTML = '';
      addHost.appendChild(h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary', 'data-add': '1', text: 'Add 4 HCl to both flasks', onclick: function () {
        addHost.innerHTML = ''; st.seen.problem = 2; added(); } })]));
    }
    var rand = C.rngFor('problem');
    var ch = C.shuffled(['The pure water: its pH changes much more', 'The buffer: it has acid in it already, so it changes more',
                         'Both change by the same amount, because the same acid is added', 'Neither changes, because 4 particles is so few'], rand);
    var q = C.ask({ q: 'The same 4 particles of strong acid (HCl, a few drops) go into each flask. Which pH will change more?',
      choices: ch.choices, answer: ch.answer, chosen: st.seen.problem ? ch.answer : null,
      onPick: function () { st.seen.problem = 1; C.persist(); offerAdd(); } });
    var left = C.panel('The question', null, [q, addHost, after]);
    var right = C.panel('Two flasks', 'water is not drawn', [h('div', { class: 'compare-boxes' }, [
      h('div', { class: 'cmp-col' }, [h('h4', { text: 'Pure water' }), wtr.node, wRead]),
      h('div', { class: 'cmp-col' }, [h('h4', { text: 'A buffer: HAc, Ac⁻ and Na⁺' }), buf.node, bRead])])]);
    el.stage.appendChild(h('div', { class: 'work-row row-two' }, [left, right]));
    if (st.done[s.id] || st.seen.problem === 2) { st.seen.problem = 2; added(); }
    else if (st.seen.problem) offerAdd();
  };

  /* ------------------------------------------------------------ members */

  R.members = function (s) {
    var st = C.state(), el = C.el();
    st.seen.members = st.seen.members || {};
    var flasks = { AC: Flask.create('AC'), NH: Flask.create('NH') };
    flasks.AC.set(10, 10, 0); flasks.NH.set(10, 10, 0);
    var host = h('div'), card = h('div', { class: 'note-host' }), chips = h('div', { class: 'chips' });
    var CARD = {
      AC: ['Acid member: CH₃COOH, written HAc, a weak acid.', 'Base member: CH₃COO⁻, written Ac⁻, the conjugate base of HAc. It comes from the salt sodium acetate, so each Ac⁻ arrives with an Na⁺ (a spectator).'],
      NH: ['Base member: NH₃, a weak base.', 'Acid member: NH₄⁺, the conjugate acid of NH₃. It comes from the salt ammonium chloride, so each NH₄⁺ arrives with a Cl⁻ (a spectator).']
    };
    var cur = null;
    function view(pair) {
      cur = pair;
      st.seen.members[pair] = 1;
      host.innerHTML = '';
      host.appendChild(flasks[pair].node);
      card.innerHTML = '';
      card.appendChild(C.reveal(CARD[pair]));
      paint();
      check();
    }
    function paint() {
      chips.innerHTML = '';
      [['AC', 'Acetic acid and acetate'], ['NH', 'Ammonia and ammonium']].forEach(function (p) {
        chips.appendChild(h('button', { type: 'button', class: 'mini' + (cur === p[0] ? ' on' : ''), 'aria-pressed': cur === p[0] ? 'true' : 'false',
          'data-pair': p[0], text: p[1], onclick: function () { view(p[0]); } }));
      });
    }
    var asked = !!st.seen.membersQ;
    function check() {
      if (!st.done[s.id] && asked && st.seen.members.AC && st.seen.members.NH) C.complete('Two kinds of buffer, one idea: a weak partner and its conjugate partner, both present.');
    }
    var rand = C.rngFor('members');
    var ch = C.shuffled(['They differ by one H⁺: the acid member has it and the base member does not', 'They differ by one OH⁻',
                         'They are two different weak acids', 'They are the same particle in two different charges of the solution'], rand);
    var q = C.ask({ q: 'How are the acid member and the base member of a pair related?', choices: ch.choices, answer: ch.answer,
      chosen: asked ? ch.answer : null,
      onPick: function () { asked = true; st.seen.membersQ = 1; C.persist(); check(); } });
    var rules = h('div', { class: 'reveal' }, [h('p', { class: 'predict-kicker', text: 'What makes a buffer' }),
      h('p', { text: '1. A weak acid with its conjugate base, or a weak base with its conjugate acid.' }),
      h('p', { text: '2. Appreciable amounts of both, in the same flask.' })]);
    el.stage.appendChild(h('div', { class: 'work-row row-two' }, [
      C.panel('The buffer', 'switch between the two kinds', [chips, host, card], 'pflask'),
      C.panel('The question', null, [q, rules])]));
    view('AC');
    if (st.seen.members.NH && st.seen.members.AC) check();
  };

  /* ------------------------------------------------------------ sort */

  var SORT = [
    { id: 'hac-naac', text: 'CH₃COOH + CH₃COONa', buf: true, why: 'a weak acid and its conjugate base (the CH₃COO⁻ from the salt)' },
    { id: 'nh3-nh4cl', text: 'NH₃ + NH₄Cl', buf: true, why: 'a weak base and its conjugate acid (the NH₄⁺ from the salt)' },
    { id: 'hf-naf', text: 'HF + NaF', buf: true, why: 'a weak acid, HF, and its conjugate base, F⁻ (from the salt NaF)' },
    { id: 'hcn-kcn', text: 'HCN + KCN', buf: true, why: 'a weak acid, HCN, and its conjugate base, CN⁻ (from the salt KCN)' },
    { id: 'hcl-nacl', text: 'HCl + NaCl', buf: false, why: 'HCl is a strong acid, so Cl⁻ is not a base that takes H⁺: there is no weak conjugate pair' },
    { id: 'hac-nacl', text: 'CH₃COOH + NaCl', buf: false, why: 'Cl⁻ is not the conjugate base of acetic acid: there is no CH₃COO⁻ to take added acid' },
    { id: 'naoh-nacl', text: 'NaOH + NaCl', buf: false, why: 'NaOH is a strong base and Na⁺ and Cl⁻ are spectators: there is no weak pair' },
    { id: 'nh3-naoh', text: 'NH₃ + NaOH', buf: false, why: 'a weak base with a strong base: there is no NH₄⁺ (its conjugate acid) to take added OH⁻' }
  ];

  R.sort = function (s) {
    var st = C.state(), el = C.el();
    var order = UI.shuffle(SORT.map(function (p) { return p.id; }), C.rngFor(s.id));
    var placed = st.done[s.id] ? order.slice() : [];
    var tray = h('div', { class: 'tray', 'aria-label': 'Mixtures to sort' });
    var bins = { yes: h('div', { class: 'bin-body' }), no: h('div', { class: 'bin-body' }) };
    function bin(key, title, sub) {
      return h('div', { class: 'bin drop', 'data-drop': key, tabindex: '0', role: 'button', 'aria-label': 'Drop here: ' + title }, [
        h('div', { class: 'bin-head', text: title }), h('div', { class: 'muted small', text: sub }), bins[key]]);
    }
    var stage = h('div', { class: 'bins' }, [bin('yes', 'Could be a buffer', 'a conjugate pair, both there'), bin('no', 'Not a buffer', 'no weak conjugate pair')]);
    function item(id) { return SORT.filter(function (p) { return p.id === id; })[0]; }
    function paint() {
      tray.innerHTML = '';
      order.forEach(function (id) {
        if (placed.indexOf(id) >= 0) return;
        tray.appendChild(h('button', { type: 'button', class: 'tile term', 'data-tile': id, text: item(id).text }));
      });
      if (!tray.firstChild) tray.appendChild(h('p', { class: 'tray-empty', text: 'All sorted.' }));
      bins.yes.innerHTML = ''; bins.no.innerHTML = '';
      placed.forEach(function (id) { bins[item(id).buf ? 'yes' : 'no'].appendChild(h('span', { class: 'bin-chip', text: item(id).text })); });
    }
    var picker = Picker({ tray: tray, stage: stage, say: C.say,
      prompt: function (key) { return 'Now click “Could be a buffer” or “Not a buffer” for ' + item(key).text + '.'; },
      label: function (key) { return item(key).text; },
      drop: function (target, key) {
        var p = item(key);
        if ((target === 'yes') !== p.buf) {
          C.say((p.buf ? 'It can be a buffer: ' : 'Not a buffer: ') + p.why + '.', 'bad');
          return;
        }
        placed.push(key);
        paint();
        if (placed.length === order.length) C.complete('All sorted. A buffer is a weak acid with its conjugate base, or a weak base with its conjugate acid.');
        else C.say('Right: ' + p.why + '.', 'good');
      } });
    el.stage.appendChild(C.panel('Sort the mixtures', 'drag, or click a card and then a box', [tray, stage], 'ppairs'));
    paint();
    return { destroy: function () { picker.destroy(); } };
  };

  /* ------------------------------------------------------------ walk */

  function story(dir, x) {
    var n = Math.abs(x);
    return dir === 'acid'
      ? 'Each of the ' + n + ' H⁺ reacted at once with an Ac⁻: H⁺ + Ac⁻ → HAc. So ' + n + ' Ac⁻ became ' + n + ' HAc. The ' + n +
        ' Cl⁻ that came with the acid are spectators, and almost no H⁺ is left free.'
      : 'Each of the ' + n + ' OH⁻ took an H⁺ from an HAc: OH⁻ + HAc → Ac⁻ + H₂O. So ' + n + ' HAc became ' + n + ' Ac⁻. The ' + n +
        ' Na⁺ that came with the base are spectators, and almost no OH⁻ is left free.';
  }

  R.walk = function (s) {
    var st = C.state(), el = C.el();
    var dir = s.dir, sign = dir === 'acid' ? 1 : -1, strong = dir === 'acid' ? 'HCl' : 'NaOH';
    var XS = [0, 2, 4, 6, 8].map(function (v) { return v * sign; });
    var box = Flask.create('AC');
    var cv = PHCurve.create({ series: SERIES_BW, live: true, pka: 'AC' });
    var strip = Flask.reaction('AC', dir);
    var read = h('p', { class: 'ph-read' });
    var chipRow = h('div', { class: 'walk-chips', 'aria-label': 'The five points' });
    var qHost = h('div', { class: 'walk-q' }), flaskNote = h('div', { class: 'note-host' }), phNote = h('div', { class: 'note-host' });
    var k = Math.min(st.wk[s.id] || 0, 5);
    var slider = null;

    function paintChips(cur) {
      chipRow.innerHTML = '';
      XS.forEach(function (x, i) {
        var jump = k >= 5;
        chipRow.appendChild(h('button', { type: 'button', class: 'chip num' + (i === cur ? ' on' : '') + (i < (st.wk[s.id] || 0) ? ' done' : ''),
          disabled: !jump, 'data-point': i, title: addedText(x), 'aria-label': 'Point ' + (i + 1) + ', ' + addedText(x),
          onclick: function () { if (jump) setSlider(Math.abs(x)); }, text: String(i + 1) }));
      });
    }
    function show(x) {
      box.set(10, 10, x); cv.setX(x);
      read.textContent = 'Buffer pH ' + pHt(Buf.pH('AC', 10, 10, x)) + '   ·   pure water with the same ' + strong + ': pH ' + pHt(Buf.pHWater(x));
    }

    function point() {
      var x = XS[k];
      paintChips(k);
      flaskNote.innerHTML = ''; phNote.innerHTML = ''; qHost.innerHTML = '';
      show(k === 0 ? 0 : XS[k - 1]);
      var rand = C.rngFor(s.id + ':' + k);
      var q, host = h('div');
      qHost.appendChild(where(k === 0 ? 'Point 1 of 5: the buffer, before anything is added' : 'Point ' + (k + 1) + ' of 5: ' + Math.abs(x) + ' ' + strong + ' added'));
      qHost.appendChild(host);
      if (k === 0) {
        var right = dir === 'acid' ? 'Ac⁻, the base member' : 'HAc, the acid member';
        var wrong = dir === 'acid' ? ['HAc, the acid member', 'Na⁺, the spectator ion', 'Cl⁻, which comes with the HCl'] : ['Ac⁻, the base member', 'Na⁺, the spectator ion', 'Free H⁺, which the buffer has plenty of'];
        var ch = C.shuffled([right].concat(wrong), rand);
        q = C.ask({ q: strong + ' is about to be added. Which particle in this buffer will react with the ' + (dir === 'acid' ? 'H⁺' : 'OH⁻') + '?',
          choices: ch.choices, answer: ch.answer,
          onPick: function (i) {
            flaskNote.appendChild(C.reveal([(i === ch.answer ? 'Right. ' : 'Not quite. ') + (dir === 'acid'
              ? 'The base member takes the H⁺: H⁺ + Ac⁻ → HAc.' : 'The acid member gives an H⁺ to the OH⁻: OH⁻ + HAc → Ac⁻ + H₂O.'),
              'A buffer works because it has a particle ready for added acid AND a particle ready for added base.']));
            q.replaceWith(oneLine('Reacts with the ' + (dir === 'acid' ? 'H⁺: Ac⁻' : 'OH⁻: HAc'), i === ch.answer));
            finish();
          } });
      } else {
        var right2 = Buf.flaskList('AC', 10, 10, x);
        var mis = dir === 'acid' ? (10 + ' HAc, ' + 10 + ' Ac⁻, ' + 10 + ' Na⁺, ' + Math.abs(x) + ' Cl⁻, ' + Math.abs(x) + ' H⁺')
                                 : (10 + ' HAc, ' + 10 + ' Ac⁻, ' + (10 + Math.abs(x)) + ' Na⁺, ' + Math.abs(x) + ' OH⁻');
        var others = XS.filter(function (v, i) { return i !== k; }).map(function (v) { return Buf.flaskList('AC', 10, 10, v); });
        var wrongs = [mis].concat(UI.shuffle(others, rand)).filter(function (t, i, a) { return t !== right2 && a.indexOf(t) === i; }).slice(0, 3);
        var ch2 = C.shuffled([right2].concat(wrongs), rand);
        q = C.ask({ q: 'Now ' + Math.abs(x) + ' particles of ' + strong + ' have been added. Which list shows what is in the flask?',
          choices: ch2.choices, answer: ch2.answer,
          onPick: function (i) {
            show(x);
            flaskNote.appendChild(C.reveal([(i === ch2.answer ? 'Right. ' : 'Not quite. ') + 'The flask holds ' + right2 + '.', story(dir, x)]));
            var a = Buf.counts('AC', 10, 10, x);
            phNote.appendChild(C.reveal(['The pH has moved only ' + pHt(Math.abs(Buf.pH('AC', 10, 10, x) - Buf.pH('AC', 10, 10, 0))) + ' units. The amounts of the two members changed, ' +
              'but both are still there: Ac⁻ : HAc is now ' + a.A + ' : ' + a.HA + '.']));
            q.replaceWith(oneLine('In the flask: ' + right2, i === ch2.answer));
            finish();
          } });
      }
      host.appendChild(q);
      function finish() {
        st.wk[s.id] = Math.max(st.wk[s.id] || 0, k + 1);
        C.persist();
        var last = k === 4;
        host.appendChild(h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary', 'data-walk-next': '1',
          text: last ? 'Explore the range →' : 'Next point →',
          onclick: function () { k += 1; if (k >= 5) { C.complete('You have been through all five points. Drag the slider to explore.'); explore(); } else point(); } })]));
      }
    }

    function setSlider(v) { if (!slider) return; slider.value = String(v); slider.dispatchEvent(new Event('input')); }

    function explore() {
      paintChips(-1);
      flaskNote.innerHTML = ''; phNote.innerHTML = ''; qHost.innerHTML = '';
      var info = h('p', { class: 'readout' });
      slider = h('input', { type: 'range', min: '0', max: '8', step: '1', value: '4', class: 'thermo-range', 'aria-label': strong + ' added, in particles' });
      function upd() {
        var n = +slider.value, x = n * sign;
        show(x);
        info.textContent = n + ' ' + strong + ' added: ' + Buf.flaskList('AC', 10, 10, x);
        slider.setAttribute('aria-valuetext', n + ' ' + strong + ', buffer pH ' + pHt(Buf.pH('AC', 10, 10, x)));
      }
      slider.addEventListener('input', upd);
      qHost.appendChild(where('Explore'));
      qHost.appendChild(h('p', { class: 'muted', text: 'Drag the slider, or press a point number above. Watch the particles that flash (they just changed form) and the dots on the curve.' }));
      qHost.appendChild(info);
      qHost.appendChild(slider);
      upd();
    }

    el.stage.appendChild(h('div', { class: 'work-row row-walk' }, [
      C.panel(strong + ' added to the buffer', 'five points', [chipRow, qHost], 'pwalk'),
      C.panel('The flask', 'water is not drawn', [box.node, strip, flaskNote], 'pflask'),
      C.panel('The pH', null, [read, cv.node, phNote], 'pcurve')
    ]));
    if (k >= 5) { explore(); } else point();
  };

  /* ------------------------------------------------------------ click */

  R.click = function (s) {
    var st = C.state(), el = C.el();
    var dir = s.dir, rightId = dir === 'acid' ? 'A' : 'HA', done = !!st.done[s.id];
    var REASON = {
      acid: { HA: 'HAc is an acid. It gives H⁺ away. It does not take H⁺.', Na: 'Na⁺ is a spectator ion. It does not react with H⁺.',
              Cl: 'There is no Cl⁻ in the flask yet. When HCl is added, Cl⁻ comes in with the H⁺ and only watches.',
              H: 'Free H⁺ is what is being added. The buffer has almost none of its own.', OH: 'The buffer has almost no OH⁻, and OH⁻ is a base, but it is not what stands ready to take H⁺ in this flask.' },
      base: { A: 'Ac⁻ is a base. It takes H⁺. It does not give an H⁺ to OH⁻.', Na: 'Na⁺ is a spectator ion. It does not react with OH⁻.',
              Cl: 'There is no Cl⁻ in this flask, and Cl⁻ never reacts with OH⁻.',
              H: 'The buffer has almost no free H⁺, so there is nothing there for the OH⁻ to react with.', OH: 'OH⁻ is what is being added. The buffer has almost none of its own.' }
    };
    var box = Flask.create('AC', { pick: onPick });
    var strip = Flask.reaction('AC', dir);
    var note = h('div', { class: 'note-host' });
    function lock() { Object.keys(box.chips).forEach(function (id) { box.chips[id].node.disabled = true; }); }
    function good() {
      box.set(10, 10, dir === 'acid' ? 4 : -4);
      lock();
      note.innerHTML = '';
      note.appendChild(C.reveal([
        'Right. ' + (dir === 'acid' ? Buf.reactAcid('AC') : Buf.reactBase('AC')) + '.',
        dir === 'acid' ? 'The diagram now shows 4 HCl added: 4 Ac⁻ became 4 HAc, and the 4 Cl⁻ that came in are only spectators.'
                       : 'The diagram now shows 4 NaOH added: 4 HAc became 4 Ac⁻, and the 4 Na⁺ that came in are only spectators.']));
      if (!st.done[s.id]) C.complete();
    }
    function onPick(id) {
      if (done || st.done[s.id]) return;
      if (id === rightId) { good(); return; }
      C.say(REASON[dir][id] || 'Try another particle.', 'bad');
    }
    box.set(10, 10, 0);
    el.stage.appendChild(h('div', { class: 'work-row row-two' }, [
      C.panel('The buffer', dir === 'acid' ? 'click the particle that takes H⁺' : 'click the particle that takes OH⁻', [box.node,
        h('p', { class: 'muted small', text: 'The counts below the flask are buttons. Click the kind of particle that reacts.' })], 'pflask'),
      C.panel('The reaction', null, [strip, note])]));
    if (done) good();
  };

  /* ------------------------------------------------------------ range */

  R.range = function (s) {
    var st = C.state(), el = C.el();
    var pair = s.pair, isNH = pair === 'NH';
    var series = [{ pair: pair, ha: 10, a: 10, cls: 'cl-buf', label: 'Buffer' }, { pair: pair, ha: 0, a: 0, cls: 'cl-wtr', label: 'Pure water' }];
    if (!isNH) series.push({ pair: 'AC', ha: 10, a: 0, cls: 'cl-acid', label: 'HAc alone' });
    var box = Flask.create(pair);
    var cv = PHCurve.create({ series: series, live: true, pka: pair });
    st.seen[s.id] = st.seen[s.id] || { l: 0, r: 0, q: 0 };
    var seen = st.seen[s.id];
    var info = h('p', { class: 'readout' }), eq = h('p', { class: 'hh-line' }), reads = h('div', { class: 'meters' });
    var slider = h('input', { type: 'range', min: String(-Buf.MAXX), max: String(Buf.MAXX), step: '1', value: '0', class: 'thermo-range',
      'aria-label': 'Strong base added (left) or strong acid added (right), in particles' });
    var note = h('div', { class: 'note-host' });

    function meterRow(lab, v) { return h('span', { class: 'meter-item' }, [lab + ' ', h('b', { text: pHt(v) })]); }
    function upd() {
      var x = +slider.value;
      box.set(10, 10, x);
      cv.setX(x);
      info.textContent = addedText(x) + (x === 0 ? '' : ': ' + Buf.flaskList(pair, 10, 10, x));
      reads.innerHTML = '';
      reads.appendChild(meterRow('Buffer pH', Buf.pH(pair, 10, 10, x)));
      reads.appendChild(meterRow('Pure water pH', Buf.pH(pair, 0, 0, x)));
      if (!isNH) reads.appendChild(meterRow('HAc alone pH', Buf.pH('AC', 10, 0, x)));
      if (isNH) {
        var c = Buf.counts(pair, 10, 10, x);
        eq.textContent = Buf.appreciable(c.HA, c.A)
          ? 'Equation: pH = ' + Buf.pKa(pair).toFixed(2) + ' + log(' + c.A + ' / ' + c.HA + ') = ' + pHt(Buf.hh(pair, c.HA, c.A)) + ' (matches)'
          : 'The equation does not apply: one member is nearly gone, so this is not a buffer now.';
      }
      slider.setAttribute('aria-valuetext', addedText(x) + ', buffer pH ' + pHt(Buf.pH(pair, 10, 10, x)));
      if (x <= -11) seen.l = 1;
      if (x >= 11) seen.r = 1;
      check();
    }
    function check() {
      if (st.done[s.id] || !(seen.l && seen.r && seen.q)) return;
      C.persist();
      note.innerHTML = '';
      note.appendChild(C.reveal(['A buffer works while BOTH members are present. Near 10 particles of acid the base member is gone, and near 10 of base the acid member is gone. ' +
        'After that the extra strong acid or base has nothing to react with, and the pH changes sharply.']));
      C.complete('You have seen both ends: the flat middle, and the cliffs where a member runs out.');
    }
    slider.addEventListener('input', upd);

    var rand = C.rngFor(s.id);
    var ch = isNH
      ? C.shuffled(['NH₃, the base member: H⁺ + NH₃ → NH₄⁺', 'NH₄⁺, the acid member: H⁺ + NH₄⁺ → no reaction', 'Cl⁻, the spectator, which takes the H⁺', 'No particle: the H⁺ stays free'], rand)
      : C.shuffled(['The base member takes added acid and the acid member takes added base, so the ratio hardly changes', 'The buffer is neutral, so its pH cannot change',
                    'Water absorbs the acid and the base', 'Strong acids and bases are weak inside a buffer'], rand);
    var DONE = isNH ? 'NH₃ takes the added H⁺ (H⁺ + NH₃ → NH₄⁺); NH₄⁺ takes the added OH⁻' : 'Each member takes one kind of addition, so the ratio hardly changes';
    var qHost = h('div', { class: 'walk-q' });
    function question() {
      var q = C.ask({
        q: isNH ? 'This buffer is NH₃ and NH₄⁺. When strong acid is added, which particle reacts with the H⁺?'
                : 'The buffer’s curve is nearly flat in the middle. Why does the pH hardly change there?',
        choices: ch.choices, answer: ch.answer,
        onPick: function (i) { seen.q = 1; C.persist(); q.replaceWith(oneLine(DONE, i === ch.answer)); check(); } });
      return q;
    }
    qHost.appendChild(seen.q ? oneLine(DONE, true) : question());
    var rangeText = h('div', null, [qHost, h('p', { class: 'walk-where', text: 'Add acid or base' }),
      h('p', { class: 'muted small', text: 'Left is NaOH, right is HCl. Go to both ends (11 or more).' }), info, slider, reads, isNH ? eq : null, note]);
    el.stage.appendChild(h('div', { class: 'work-row row-walk' }, [
      C.panel(isNH ? 'A base buffer' : 'The whole range', null, [rangeText], 'pwalk'),
      C.panel('The flask', 'water is not drawn', [box.node], 'pflask'),
      C.panel('The pH', null, [cv.node], 'pcurve')]));
    upd();
  };

  /* ------------------------------------------------------------ ratio */

  R.ratio = function (s) {
    var st = C.state(), el = C.el();
    var TOT = 22;
    st.seen.ratio = st.seen.ratio || { lo: 0, hi: 0, q1: 0, q2: 0 };
    var seen = st.seen.ratio;
    var box = Flask.create('AC');
    var slider = h('input', { type: 'range', min: '2', max: '20', step: '1', value: '11', class: 'thermo-range', 'aria-label': 'Number of Ac⁻ (the rest are HAc)' });
    var table = h('div', { class: 'ratio-table' }), eqBox = h('p', { class: 'hh-line' }), qHost = h('div', { class: 'walk-q' }), note = h('div', { class: 'note-host' });
    function upd() {
      var a = +slider.value, ha = TOT - a;
      box.set(ha, a, 0);
      var exact = Buf.pH('AC', ha, a, 0), eqv = Buf.hh('AC', ha, a), ratio = a / ha;
      table.innerHTML = '';
      [['HAc', String(ha)], ['Ac⁻', String(a)], ['Ac⁻ ÷ HAc', ratio.toFixed(2)], ['log of that', Math.log10(ratio).toFixed(2)], ['pH', pHt(exact)]].forEach(function (r) {
        table.appendChild(h('span', { class: 'ratio-cell' }, [r[0] + ' ', h('b', { text: r[1] })]));
      });
      eqBox.textContent = 'pH = ' + Buf.pKa('AC').toFixed(2) + ' + log(' + a + ' / ' + ha + ') = ' + pHt(eqv);
      slider.setAttribute('aria-valuetext', ha + ' HAc and ' + a + ' Ac⁻, pH ' + pHt(exact));
      if (a <= 3) seen.lo = 1;
      if (a >= 19) seen.hi = 1;
      check();
    }
    function check() {
      if (!st.done[s.id] && seen.lo && seen.hi && seen.q1 && seen.q2) {
        C.persist();
        C.complete('The ratio of base member to acid member sets the pH. Equal amounts give pH = pKa.');
      }
    }
    slider.addEventListener('input', upd);
    var L1 = 'Equal amounts: pH = pKa = 4.74', L2 = 'Ac⁻ 10 times HAc: pH = pKa + 1 = 5.74';

    function q1() {
      var ch = C.shuffled(['4.74, the pKa of HAc', '7.00', '2.88', '9.26'], C.rngFor('ratio:1'));
      var q = C.ask({ q: 'Set the slider to 11 Ac⁻ (so 11 HAc, equal amounts). What is the pH?', choices: ch.choices, answer: ch.answer,
        onPick: function (i) {
          seen.q1 = 1; C.persist();
          q.replaceWith(oneLine(L1, i === ch.answer));
          note.appendChild(C.reveal(['Equal amounts: the ratio is 1, log(1) = 0, so pH = pKa = 4.74.']));
          qHost.appendChild(q2()); check();
        } });
      return q;
    }
    function q2() {
      var ch = C.shuffled(['It goes up by 1 pH unit (to 5.74)', 'It goes up by 10 pH units', 'It goes down by 1 pH unit (to 3.74)', 'It stays at 4.74'], C.rngFor('ratio:2'));
      var q = C.ask({ kicker: 'Predict again (not graded)', q: 'Now make Ac⁻ about 10 times HAc (20 Ac⁻ and 2 HAc). What happens to the pH?', choices: ch.choices, answer: ch.answer,
        onPick: function (i) {
          seen.q2 = 1; C.persist();
          q.replaceWith(oneLine(L2, i === ch.answer));
          note.innerHTML = '';
          note.appendChild(C.reveal(['A ratio of 10 gives log(10) = 1, so pH = 4.74 + 1 = 5.74. More base member, higher pH. Now go to both ends of the slider.']));
          check();
        } });
      return q;
    }
    if (!seen.q1) qHost.appendChild(q1());
    else { qHost.appendChild(oneLine(L1, true)); if (!seen.q2) qHost.appendChild(q2()); else qHost.appendChild(oneLine(L2, true)); }
    var eqPanel = C.panel('The equation', 'buffers only', [eqBox, C.hhWarning(), note]);
    el.stage.appendChild(h('div', { class: 'work-row row-walk' }, [
      C.panel('Change the buffer', '22 particles in all', [slider, table, qHost], 'pwalk'),
      C.panel('The flask', 'water is not drawn', [box.node], 'pflask'),
      eqPanel]));
    upd();
  };

  /* ------------------------------------------------------------ when */

  var WHEN = [
    { id: 'w1', pair: 'AC', ha: 10, a: 10, x: 0, ok: true, name: '10 HAc and 10 Ac⁻' },
    { id: 'w2', pair: 'AC', ha: 14, a: 6, x: 0, ok: true, name: '14 HAc and 6 Ac⁻' },
    { id: 'w3', pair: 'AC', ha: 10, a: 0, x: 0, ok: false, name: 'HAc alone',
      why: 'Only the weak acid. Almost no Ac⁻ (it forms only when a little HAc ionizes, far too few to draw). It is not a buffer, and a ratio with almost nothing on the bottom or top is meaningless. The pH of 0.10 M acetic acid, 2.88, needs an equilibrium calculation.' },
    { id: 'w4', pair: 'AC', ha: 0, a: 10, x: 0, ok: false, name: 'Ac⁻ alone (sodium acetate)',
      why: 'Only the conjugate base. There is almost no HAc, so there is no acid member to take added base. It is not a buffer, so the equation does not apply.' },
    { id: 'w5', pair: 'AC', ha: 0, a: 0, x: 10, ok: false, name: 'HCl in water',
      why: 'Only H⁺ and Cl⁻. There is no weak acid and conjugate base at all, so there is nothing for the equation to use. The pH here is just −log of the H⁺ concentration.' },
    { id: 'w6', pair: 'NH', ha: 8, a: 12, x: 0, ok: true, name: '8 NH₄⁺ and 12 NH₃' }
  ];

  R.when = function (s) {
    var st = C.state(), el = C.el();
    var order = UI.shuffle(WHEN.map(function (w) { return w.id; }), C.rngFor('when'));
    var n = Math.min(st.wk.when || 0, order.length);
    var host = h('div'), flaskHost = h('div'), prog = h('p', { class: 'muted small' });
    function item(id) { return WHEN.filter(function (w) { return w.id === id; })[0]; }
    function round() {
      host.innerHTML = ''; flaskHost.innerHTML = '';
      if (n >= order.length) { finish(); return; }
      var w = item(order[n]);
      var f = Flask.create(w.pair);
      f.set(w.ha, w.a, w.x);
      flaskHost.appendChild(f.node);
      prog.textContent = 'Flask ' + (n + 1) + ' of ' + order.length;
      host.appendChild(h('p', { class: 'q-text', text: 'Can pH = pKa + log([base member] / [acid member]) be used for this flask?' }));
      host.appendChild(h('p', { class: 'muted', text: w.name }));
      var row = h('div', { class: 'q-choices two' });
      var out = h('div', { class: 'note-host' });
      [['yes', 'The equation works'], ['no', 'The equation does not work']].forEach(function (b) {
        var btn = h('button', { type: 'button', class: 'choice', 'data-answer': b[0] }, [h('span', { class: 'choice-text', text: b[1] })]);
        btn.addEventListener('click', function () {
          var right = (b[0] === 'yes') === w.ok;
          Array.prototype.forEach.call(row.querySelectorAll('.choice'), function (x) { x.disabled = true; });
          btn.classList.add(right ? 'right' : 'wrong');
          var expl = w.ok
            ? 'Both members are there in appreciable amounts, so this is a buffer: pH = ' + Buf.pKa(w.pair).toFixed(2) + ' + log(' + w.a + ' / ' + w.ha + ') = ' + pHt(Buf.hh(w.pair, w.ha, w.a)) + '.'
            : w.why;
          out.appendChild(C.reveal([(right ? 'Right. ' : 'Not quite. ') + expl]));
          st.wk.when = n + 1;
          C.persist();
          out.appendChild(h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary', 'data-when-next': '1',
            text: n + 1 < order.length ? 'Next flask →' : 'Finish', onclick: function () { n += 1; round(); } })]));
        });
        row.appendChild(btn);
      });
      host.appendChild(row);
      host.appendChild(out);
    }
    function finish() {
      host.innerHTML = ''; flaskHost.innerHTML = '';
      host.appendChild(C.reveal(['The equation needs a buffer: appreciable amounts of BOTH the acid member and the base member. ' +
        'For a weak acid alone, a conjugate base alone or a strong acid, it does not apply.']));
      prog.textContent = 'All six done.';
      if (!st.done[s.id]) C.complete();
    }
    el.stage.appendChild(h('div', { class: 'work-row row-two' }, [
      C.panel('The flask', 'water is not drawn', [flaskHost, prog], 'pflask'),
      C.panel('Does the equation work?', null, [host, C.hhWarning()])]));
    round();
  };

  /* ------------------------------------------------------------ use */

  var USE = [
    { x: 4, ha: 10, a: 10, text: 'The buffer has 10 HAc and 10 Ac⁻. Then 4 particles of HCl are added. Find the pH.' },
    { x: -3, ha: 10, a: 10, text: 'A fresh buffer has 10 HAc and 10 Ac⁻. This time 3 particles of NaOH are added. Find the pH.' }
  ];

  R.use = function (s) {
    var st = C.state(), el = C.el();
    st.wk.use = st.wk.use || 0;
    var host = h('div', { class: 'walk-q' }), box = Flask.create('AC'), bca = h('div', { class: 'bca' }), calc = h('div', { class: 'note-host' });
    var i = Math.min(st.wk.use, USE.length);
    function tableFor(p, after) {
      bca.innerHTML = '';
      var rows = [['', 'HAc', 'Ac⁻'], ['Before', String(p.ha), String(p.a)], ['Change', sgn(p.x), sgn(-p.x)], ['After', String(after.ha), String(after.a)]];
      bca.appendChild(h('table', { class: 'ref-table bca-table', 'aria-label': 'Before, change, after' }, rows.map(function (r, ri) {
        return h('tr', null, r.map(function (c, ci) { return h(ri === 0 || ci === 0 ? 'th' : 'td', { class: ci ? 'num' : '', text: c }); }));
      })));
    }
    function problem() {
      host.innerHTML = ''; calc.innerHTML = '';
      if (i >= USE.length) { finish(); return; }
      var p = USE[i], dir = p.x > 0 ? 'acid' : 'base', n = Math.abs(p.x), strong = dir === 'acid' ? 'HCl' : 'NaOH';
      var aft = Buf.after(p.ha, p.a, p.x);
      box.set(p.ha, p.a, 0); bca.innerHTML = '';
      host.appendChild(where('Problem ' + (i + 1) + ' of ' + USE.length));
      host.appendChild(h('p', { class: 'muted', text: p.text }));
      var rand = C.rngFor('use:' + i);
      var ch1 = C.shuffled([aft.ha + ' HAc, ' + aft.a + ' Ac⁻', p.ha + ' HAc, ' + p.a + ' Ac⁻ (no change)', (p.ha - p.x) + ' HAc, ' + (p.a + p.x) + ' Ac⁻', (p.ha + n) + ' HAc, ' + p.a + ' Ac⁻'], rand);
      var q1 = C.ask({ q: 'Step 1, the reaction: ' + (dir === 'acid' ? Buf.reactAcid('AC') : Buf.reactBase('AC')) + '. After it, how many of each member?',
        choices: ch1.choices, answer: ch1.answer,
        onPick: function (k) {
          box.set(p.ha, p.a, p.x);
          tableFor(p, aft);
          q1.replaceWith(oneLine('After the reaction: ' + aft.ha + ' HAc, ' + aft.a + ' Ac⁻', k === ch1.answer));
          host.appendChild(step2());
        } });
      host.appendChild(q1);
      function step2() {
        var eqv = Buf.hh('AC', aft.ha, aft.a), inv = Buf.hh('AC', aft.a, aft.ha);
        var cand = [pHt(eqv), pHt(inv), pHt(Buf.pKa('AC')), pHt(Buf.pHWater(p.x))].filter(function (t, k, arr) { return arr.indexOf(t) === k; });
        var ch2 = C.shuffled(cand, C.rngFor('use2:' + i));
        var wrap = h('div');
        var q = C.ask({ kicker: 'Step 2, the equation (not graded)', q: 'Both members are still there, so the equation applies. Use the NEW amounts. What is the pH?', choices: ch2.choices, answer: ch2.answer,
          onPick: function (k) {
            q.replaceWith(oneLine('pH = ' + pHt(eqv), k === ch2.answer));
            calc.appendChild(C.reveal(['pH = ' + Buf.pKa('AC').toFixed(2) + ' + log(' + aft.a + ' / ' + aft.ha + ') = ' + pHt(eqv) + '. The pH moved from ' + pHt(Buf.pKa('AC')) + ' to ' + pHt(eqv) +
              ' (pure water with the same ' + n + ' ' + strong + ' would be at ' + pHt(Buf.pHWater(p.x)) + ').',
              'Reaction first, equation second: use the amounts AFTER the strong acid or base has reacted.']));
            st.wk.use = i + 1; C.persist();
            wrap.appendChild(h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary', 'data-use-next': '1',
              text: i + 1 < USE.length ? 'Next problem →' : 'Finish', onclick: function () { i += 1; problem(); } })]));
          } });
        wrap.appendChild(q);
        return wrap;
      }
    }
    function finish() {
      host.innerHTML = ''; calc.innerHTML = '';
      calc.appendChild(C.reveal(['Do the reaction first, then use the equation with the new amounts. Both members must still be present: if one is used up, the solution is no longer a buffer and the equation does not apply.']));
      if (!st.done[s.id]) C.complete();
    }
    el.stage.appendChild(h('div', { class: 'work-row row-walk' }, [
      C.panel('Use the equation', null, [host], 'pwalk'),
      C.panel('The flask', 'water is not drawn', [box.node], 'pflask'),
      C.panel('Before, change, after', null, [bca, C.hhWarning(), calc])]));
    problem();
  };

})();

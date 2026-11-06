/* app.js: the teacher's beaker (a weak acid HA and its conjugate base A-). A beaker of buffer on the left; on the right two sliders
 * for the acid member and the base member, buttons that add drops of HCl or NaOH, the
 * pH, and two charts (pH against drops, and "same drops, stronger buffer").
 * No checkpoints and no score. Every number comes from Buf.
 */

var App = (function () {
  'use strict';

  var h = UI.h;
  var state = { pair: 'HA', ha: 10, a: 10, up: 0, dn: 0 };
  var el = {}, beaker, graph, strength, busy = false, tab = 'graph', showEq = false, baseSpeed = 1;

  function f2(v) { return v.toFixed(2); }
  function P() { return Buf.PAIRS[state.pair]; }
  function molar(units) { return (units * Buf.U).toFixed(2) + ' M'; }

  /* ------------------------------------------------------------------ build */

  function slider(which) {
    var out = h('output', { class: 'sl-out' });
    var input = h('input', { type: 'range', min: '0', max: String(Buf.MAXC), step: '1', value: String(state[which]), class: 'sl' });
    var name = h('span', { class: 'sl-name' });
    var row = h('div', { class: 'sl-row sl-' + which }, [h('div', { class: 'sl-head' }, [h('i', { class: 'sw sw-' + which, 'aria-hidden': 'true' }), name, out]), input]);
    input.addEventListener('input', function () {
      if (busy) { input.value = String(state[which]); return; }
      state[which] = +input.value;
      state.up = 0; state.dn = 0;
      setReaction(null);
      paint(false);
    });
    return { row: row, input: input, out: out, name: name };
  }

  function build() {
    el.app = document.getElementById('app');
    el.pairs = document.getElementById('pairs');
    beaker = Beaker.create();
    graph = Charts.graph();
    strength = Charts.strength();
    el.reaction = h('div', { class: 'reaction', role: 'status', 'aria-live': 'polite' });
    el.sHA = slider('ha');
    el.sA = slider('a');

    function dropBtn(dir, n) {
      var strong = dir === 'acid' ? 'HCl' : 'NaOH';
      return h('button', { type: 'button', class: 'drop-btn drop-' + dir, 'data-dir': dir, 'data-n': String(n), onclick: function () { addDrops(dir, n); } },
        [h('b', { text: n === 1 ? 'Add 1 drop' : 'Add ' + n + ' drops' }), h('span', { text: strong })]);
    }
    el.btns = [dropBtn('acid', 1), dropBtn('acid', 5), dropBtn('base', 1), dropBtn('base', 5)];
    el.count = h('p', { class: 'drop-count' });
    el.reset = h('button', { type: 'button', class: 'ghostbtn', text: 'Reset drops', onclick: function () {
      if (busy) return;
      state.up = 0; state.dn = 0; setReaction(null); paint(false); } });

    el.ph = h('p', { class: 'ph-big' });
    el.phSub = h('p', { class: 'ph-sub' });
    el.phWater = h('p', { class: 'ph-water' });
    el.marker = h('i', { class: 'marker', 'aria-hidden': 'true' });
    var bar = h('div', { class: 'phbar', 'aria-hidden': 'true' }, [el.marker]);
    el.eq = h('div', { class: 'eqbox' });
    var eqToggle = h('label', { class: 'eqtoggle' }, [h('input', { type: 'checkbox', id: 'showEq', onchange: function (e) { showEq = e.target.checked; paintEq(); } }), ' Show the equation']);

    el.tabBtns = {
      graph: h('button', { type: 'button', class: 'tab on', 'data-tab': 'graph', text: 'pH vs drops', onclick: function () { setTab('graph'); } }),
      strength: h('button', { type: 'button', class: 'tab', 'data-tab': 'strength', text: 'Same drops, stronger buffer', onclick: function () { setTab('strength'); } })
    };
    el.tabBody = h('div', { class: 'tab-body' });

    var left = h('section', { class: 'left' }, [h('div', { class: 'beaker-wrap' }, [beaker.node]), el.reaction]);
    var right = h('section', { class: 'right' }, [
      h('div', { class: 'panel sliders' }, [el.sHA.row, el.sA.row]),
      h('div', { class: 'panel drops' }, [h('div', { class: 'drop-grid' }, el.btns), h('div', { class: 'drop-foot' }, [el.count, el.reset])]),
      h('div', { class: 'panel meter' }, [el.ph, bar, el.phSub, el.phWater, eqToggle, el.eq]),
      h('div', { class: 'panel charts' }, [h('div', { class: 'tabs' }, [el.tabBtns.graph, el.tabBtns.strength]), el.tabBody])
    ]);
    el.app.appendChild(left);
    el.app.appendChild(right);
    paintPairs();
    setTab('graph');
    beaker.build(state.pair);
    paint(false);
  }

  function paintPairs() {
    el.pairs.innerHTML = '';
    el.pairs.appendChild(h('span', { class: 'pair-label', text: P().name + '   (pKa ' + Buf.pKa(state.pair).toFixed(2) + ')' }));
  }

  function setTab(t) {
    tab = t;
    Object.keys(el.tabBtns).forEach(function (k) { el.tabBtns[k].classList.toggle('on', k === t); el.tabBtns[k].setAttribute('aria-pressed', k === t ? 'true' : 'false'); });
    el.tabBody.innerHTML = '';
    el.tabBody.appendChild(t === 'graph' ? graph.node : strength.node);
    paintCharts();
  }

  /* ------------------------------------------------------------------ paint */

  function paintCharts() {
    graph.update(state.pair, state.ha, state.a, state.up, state.dn);
    strength.update(state.pair, state.ha, state.a);
  }

  function paintEq() {
    el.eq.innerHTML = '';
    el.eq.hidden = !showEq;
    if (!showEq) return;
    var c = Buf.counts(state.pair, state.ha, state.a, state.up, state.dn), p = P();
    var body = Buf.appreciable(c.HA, c.A)
      ? 'pH = ' + f2(Buf.pKa(state.pair)) + ' + log(' + c.A + ' / ' + c.HA + ') = ' + f2(Buf.hh(state.pair, c.HA, c.A))
      : 'This is not a buffer right now (one member is nearly gone), so the equation does not apply.';
    el.eq.appendChild(h('p', { class: 'hh-eq', text: 'pH = pKa + log( [' + p.a + '] / [' + p.ha + '] )' }));
    el.eq.appendChild(h('p', { class: 'hh-line', text: body }));
    el.eq.appendChild(h('p', { class: 'hh-rule' }, [h('b', { text: 'Only for a buffer. ' }),
      'It needs appreciable amounts of BOTH the acid member and the base member. It does not work for a weak acid alone, a conjugate base alone, or a strong acid.']));
  }

  /* what the beaker, the meter and the buttons show; flash is false for a slider move or reset */
  function paint(skipBeaker) {
    var p = P(), c;
    el.sHA.name.textContent = p.ha + '  (acid member)';
    el.sA.name.textContent = p.a + '  (base member)';
    el.sHA.input.value = String(state.ha); el.sA.input.value = String(state.a);
    el.sHA.out.textContent = molar(state.ha); el.sA.out.textContent = molar(state.a);
    el.sHA.input.setAttribute('aria-valuetext', p.ha + ' ' + molar(state.ha)); el.sA.input.setAttribute('aria-valuetext', p.a + ' ' + molar(state.a));
    if (!skipBeaker) beaker.render(state.pair, state.ha, state.a, state.up, state.dn, false);
    var now = Buf.pH(state.pair, state.ha, state.a, state.up, state.dn), start = Buf.pH(state.pair, state.ha, state.a, 0, 0);
    el.ph.textContent = 'pH ' + f2(now);
    el.marker.style.left = (Math.max(0, Math.min(14, now)) / 14 * 100) + '%';
    var drops = state.up + state.dn;
    if (drops === 0) {
      el.phSub.textContent = 'Start. Add a drop of HCl or NaOH.';
      el.phWater.textContent = '';
    } else {
      var d = now - start;
      el.phSub.textContent = 'Change since the start: ' + (d < 0 ? '−' : '+') + f2(Math.abs(d)) + '  (' + f2(start) + ' → ' + f2(now) + ')';
      el.phWater.textContent = 'Pure water with the same drops: pH ' + f2(Buf.pH(state.pair, 0, 0, state.up, state.dn));
    }
    el.count.textContent = 'HCl: ' + state.up + ' drops   NaOH: ' + state.dn + ' drops';
    el.btns.forEach(function (b) {
      var dir = b.getAttribute('data-dir'), used = dir === 'acid' ? state.up : state.dn;
      b.disabled = busy || used >= Buf.MAXD;
    });
    paintEq();
    paintCharts();
  }

  function setReaction(info) {
    var p = P();
    el.reaction.innerHTML = '';
    if (!info) {
      el.reaction.appendChild(h('p', { class: 'rx-idle', text: 'Add a drop of HCl or NaOH and watch which particles react.' }));
      return;
    }
    if (info.target) {
      el.reaction.appendChild(h('p', { class: 'rx rx-' + info.dir, text: info.dir === 'acid' ? Buf.reactAcid(state.pair) : Buf.reactBase(state.pair) }));
      el.reaction.appendChild(h('p', { class: 'rx-note', text: info.dir === 'acid'
        ? 'The added H⁺ is used up by the base member (' + p.a + ').'
        : 'The added OH⁻ is used up by the acid member (' + p.ha + '). Water forms.' }));
    } else {
      el.reaction.appendChild(h('p', { class: 'rx rx-free', text: info.dir === 'acid' ? 'No ' + p.a + ' left to react: the H⁺ stays free' : 'No ' + p.ha + ' left to react: the OH⁻ stays free' }));
      el.reaction.appendChild(h('p', { class: 'rx-note', text: 'Nothing is left to absorb it, so the pH changes sharply.' }));
    }
  }

  /* ------------------------------------------------------------------ drops */

  function addDrops(dir, n) {
    if (busy) return;
    var left = Buf.MAXD - (dir === 'acid' ? state.up : state.dn);
    n = Math.min(n, left);
    if (n <= 0) return;
    busy = true;
    beaker.setSpeed(n > 1 ? baseSpeed * 0.45 : baseSpeed);
    paint(true);
    var i = 0, last = null;
    function step() {
      if (i >= n) { busy = false; beaker.setSpeed(baseSpeed); paint(true); if (last) setReaction(last); return Promise.resolve(); }
      var before = { ha: state.ha, a: state.a, up: state.up, dn: state.dn };
      if (dir === 'acid') state.up += 1; else state.dn += 1;
      var after = { ha: state.ha, a: state.a, up: state.up, dn: state.dn };
      return beaker.drop(dir, state.pair, before, after).then(function (r) {
        last = { dir: dir, target: r.target };
        setReaction(last);
        paint(true);
        i += 1;
        return step();
      });
    }
    return step();
  }

  /* ------------------------------------------------------------------ boot */

  function start() {
    var connected = SCORM.init();
    var lms = document.getElementById('lms');
    lms.textContent = connected ? 'Connected to the LMS' : '';
    lms.className = 'lms ' + (connected ? 'on' : 'off');
    var params = new URLSearchParams(location.search);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    baseSpeed = params.has('speed') ? Math.max(0, +params.get('speed')) : (reduce ? 0 : 1);
    build();
    beaker.setSpeed(baseSpeed);
    setReaction(null);
    if (params.has('tab')) setTab(params.get('tab') === 'strength' ? 'strength' : 'graph');
  }

  return { start: start, state: function () { return state; }, busy: function () { return busy; }, addDrops: addDrops, setTab: setTab, strength: function () { return strength; } };
})();

document.addEventListener('DOMContentLoaded', App.start);

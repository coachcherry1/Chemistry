/* app.js: the teacher's beaker (a weak acid HA and its conjugate base A-). A beaker of buffer on the left; on the right two sliders
 * for the acid member and the base member, buttons that add drops of HCl or NaOH, the
 * pH, and the graph of pH against drops.
 * No checkpoints and no score. Every number comes from Buf.
 */

var App = (function () {
  'use strict';

  var h = UI.h;
  var state = { pair: 'HA', ha: 10, a: 10, up: 0, dn: 0 };
  var el = {}, beaker, graph, busy = false, showEq = false, log = [], showWater = true, baseSpeed = 1;

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
    input.addEventListener('change', function () {
      if (busy) return;
      logRow('Set [' + (which === 'ha' ? P().ha : P().a) + '] to ' + molar(state[which]), 'drops back to 0');
    });
    return { row: row, input: input, out: out, name: name };
  }

  function build() {
    el.app = document.getElementById('app');
    el.pairs = document.getElementById('pairs');
    beaker = Beaker.create();
    graph = Charts.graph();
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
      state.up = 0; state.dn = 0; setReaction(null); paint(false); logRow('Reset drops', 'back to the start of this beaker'); } });

    el.ph = h('p', { class: 'ph-big' });
    el.phSub = h('p', { class: 'ph-sub' });
    el.phWater = h('p', { class: 'ph-water' });
    el.marker = h('i', { class: 'marker', 'aria-hidden': 'true' });
    var bar = h('div', { class: 'phbar', 'aria-hidden': 'true' }, [el.marker]);
    el.eq = h('div', { class: 'eqbox' });
    var eqToggle = h('div', { class: 'toggles' }, [
      h('label', { class: 'eqtoggle' }, [h('input', { type: 'checkbox', id: 'showWater', checked: true, onchange: function (e) { showWater = e.target.checked; paint(true); } }), ' Show pure water']),
      h('label', { class: 'eqtoggle' }, [h('input', { type: 'checkbox', id: 'showEq', onchange: function (e) { showEq = e.target.checked; paintEq(); } }), ' Show the equation'])]);

    el.chartBody = h('div', { class: 'tab-body' }, [graph.node]);
    el.logBody = h('tbody');
    el.logWrap = h('div', { class: 'log-wrap' }, [h('table', { class: 'log', 'aria-label': 'Data table of every action' }, [
      h('thead', null, [h('tr', null, [h('th', { text: 'Action' }), h('th', { class: 'num', text: 'pH after' }), h('th', { class: 'num', text: 'Change' }),
        h('th', { class: 'num', text: '[HA]' }), h('th', { class: 'num', text: '[A⁻]' })])]), el.logBody])]);
    el.clearLog = h('button', { type: 'button', class: 'ghostbtn small', text: 'Clear table', onclick: function () { log = []; el.logBody.innerHTML = ''; logRow('Start', 'this beaker now'); } });

    var left = h('section', { class: 'left' }, [h('div', { class: 'beaker-wrap' }, [beaker.node]), el.reaction]);
    var right = h('section', { class: 'right' }, [
      h('div', { class: 'panel sliders' }, [el.sHA.row, el.sA.row]),
      h('div', { class: 'panel drops' }, [h('div', { class: 'drop-grid' }, el.btns), h('div', { class: 'drop-foot' }, [el.count, el.reset])]),
      h('div', { class: 'panel meter' }, [h('div', { class: 'meter-top' }, [el.ph, h('div', { class: 'ph-info' }, [el.phSub, el.phWater])]), bar, eqToggle, el.eq]),
      h('div', { class: 'panel charts' }, [h('div', { class: 'chart-split' }, [
        h('div', { class: 'chart-col' }, [h('h2', { class: 'chart-title', text: 'pH vs drops' }), el.chartBody]),
        h('div', { class: 'data-col' }, [h('div', { class: 'data-head' }, [h('h2', { class: 'chart-title', text: 'Data table' }), el.clearLog]), el.logWrap])])])
    ]);
    el.app.appendChild(left);
    el.app.appendChild(right);
    paintPairs();
    beaker.build(state.pair);
    paint(false);
    logRow('Start', 'this beaker');
  }

  function paintPairs() {
    el.pairs.innerHTML = '';
    el.pairs.appendChild(h('span', { class: 'pair-label', text: P().name + '   (pKa ' + Buf.pKa(state.pair).toFixed(2) + ')' }));
  }

  /* ------------------------------------------------------------------ the data table */

  function conc(v) { return v.toFixed(3); }

  /* add a row: what was done, the pH after, the change from the previous row's pH, and [HA] and [A-] */
  function logRow(action, sub) {
    var now = Buf.pH(state.pair, state.ha, state.a, state.up, state.dn);
    var c = Buf.concentrations(state.pair, state.ha, state.a, state.up, state.dn);
    var prev = log.length ? log[log.length - 1].pH : null;
    var row = { action: action, sub: sub || '', pH: now, delta: prev == null ? null : now - prev, HA: c.HA, A: c.A };
    log.push(row);
    var dtext = row.delta == null ? '' : (Math.abs(row.delta) < 0.005 ? '0.00' : (row.delta < 0 ? '−' : '+') + f2(Math.abs(row.delta)));
    var tr = h('tr', { class: 'log-new' }, [
      h('td', { class: 'act' }, [h('span', { text: action }), sub ? h('small', { text: sub }) : null]),
      h('td', { class: 'num', text: f2(now) }),
      h('td', { class: 'num chg ' + (row.delta == null ? '' : (row.delta < -0.004 ? 'down' : (row.delta > 0.004 ? 'up' : ''))), text: row.delta == null ? '–' : (row.delta < -0.004 ? '▼ ' : (row.delta > 0.004 ? '▲ ' : '')) + dtext }),
      h('td', { class: 'num', text: conc(c.HA) }), h('td', { class: 'num', text: conc(c.A) })]);
    el.logBody.appendChild(tr);
    el.logWrap.scrollTop = el.logWrap.scrollHeight;
    return row;
  }

  /* ------------------------------------------------------------------ paint */

  function paintCharts() {
    graph.update(state.pair, state.ha, state.a, state.up, state.dn, showWater);
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
      el.phWater.textContent = showWater ? 'Pure water with the same drops: pH ' + f2(Buf.pH(state.pair, 0, 0, state.up, state.dn)) : '';
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
        logRow('1 drop of ' + (dir === 'acid' ? 'HCl' : 'NaOH'), state.up + ' HCl, ' + state.dn + ' NaOH in total');
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
    if (params.get('water') === '0') { showWater = false; document.getElementById('showWater').checked = false; paint(true); }
  }

  return { start: start, log: function () { return log; }, state: function () { return state; }, busy: function () { return busy; }, addDrops: addDrops };
})();

document.addEventListener('DOMContentLoaded', App.start);

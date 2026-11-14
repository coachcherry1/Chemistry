/* ladder.js: one problem, worked rung by rung beside the reference.
 *
 *   Ladder.create(host, problem, work, opts) -> { work, destroy }
 *
 * Every problem has the same five rungs (so the strip never gives away that a
 * problem has no reaction):
 *   balance     the balancing packages' workbench, with the inventory down the centre
 *   states      (aq), (s) or (l) for each product, from the solubility rules
 *   ionic       the complete ionic equation: for each substance, split into ions
 *               or keep together; how many of each ion and its charge
 *   spectators  tap the ions that are the same on both sides (or: there are none)
 *   net         build what is left from the terms, with coefficients and states,
 *               or say no reaction
 *
 * work (saved): { i: rung index, g: { rung: 1 or 0, the first answer }, n: { rung: checks }, v: { the student's
 * choices }, bench: { ... }, r: 1 when done }
 * opts: graded (the first answer of every rung counts: opts.onRung(rung, right, typed, wanted)), onSave, onDone,
 * next: { label, onClick }, hints (the lesson: a line of help on each rung). Not an answer: a Check with something
 * left unchosen. Show me after three misses. A finished problem plays its reaction in the beaker.
 */
var Ladder = (function () {
  'use strict';
  var h = UI.h;
  var NAMES = { balance: 'Balance', states: 'States', ionic: 'Complete ionic', spectators: 'Spectators', net: 'Net ionic' };
  var STATE_WORD = { s: 'solid', aq: 'aqueous (dissolved)', l: 'liquid' };
  var pretty = Net.pretty;

  /* ------------------------------------------------- splitting one substance */
  /* c f(st) -> splits into ions or stays together; v (saved): { sp: 'split' | 'keep', n: [a, b], q: [a, b] }.
     Used by the ionic rung and by the lesson's split drill. */
  function splitRow(f, c, st, v, save) {
    v.n = v.n || [0, 0]; v.q = v.q || [0, 0];
    var pr = Net.partsOf(f), syms = [Net.ionSym(pr.cat, true), Net.ionSym(pr.an, false)];
    var head = (c > 1 ? c + ' ' : '') + pretty(f) + '(' + st + ')';
    function stepper(k, kind, label) {
      var val = h('span', { class: 'sub-n' });
      function text() {
        if (kind === 'n') return v.n[k] ? String(v.n[k]) : '?';
        return v.q[k] ? (Math.abs(v.q[k]) > 1 ? Math.abs(v.q[k]) : '') + (k ? '−' : '+') : '?';
      }
      function bump(d) {
        if (kind === 'n') v.n[k] = Math.max(1, Math.min(12, (v.n[k] || (d > 0 ? 0 : 2)) + d));
        else { var a = Math.max(1, Math.min(3, (Math.abs(v.q[k]) || (d > 0 ? 0 : 2)) + d)); v.q[k] = k ? -a : a; }
        val.textContent = text(); el.classList.remove('wrong'); save();
      }
      val.textContent = text();
      return h('span', { class: 'stepper sub ' + kind, role: 'group', 'aria-label': label }, [
        h('button', { type: 'button', class: 'stp dec', 'aria-label': label + ': less', text: '−', onclick: function () { bump(-1); } }), val,
        h('button', { type: 'button', class: 'stp inc', 'aria-label': label + ': more', text: '+', onclick: function () { bump(1); } })]);
    }
    var ionsBox = h('span', { class: 'io-ions' });
    var keepBox = h('span', { class: 'io-keep', text: head });
    [0, 1].forEach(function (k) {
      if (k) ionsBox.appendChild(h('span', { class: 'io-plus', text: '+' }));
      ionsBox.appendChild(h('span', { class: 'io-ion' }, [
        stepper(k, 'n', 'How many ' + Chem.pretty(syms[k]) + ' ions'),
        h('b', { class: 'io-sym', text: Chem.pretty(syms[k]) }),
        stepper(k, 'q', 'Charge on ' + Chem.pretty(syms[k]))]));
    });
    var btns = [['split', 'Splits into ions'], ['keep', 'Stays together']].map(function (b) {
      return h('button', { type: 'button', class: 'state-btn io-btn', 'data-sp': b[0], 'aria-pressed': 'false', text: b[1], onclick: function () { v.sp = b[0]; paint(); el.classList.remove('wrong'); save(); } });
    });
    function paint() {
      ionsBox.hidden = v.sp !== 'split'; keepBox.hidden = v.sp !== 'keep';
      btns.forEach(function (b) { var on = b.getAttribute('data-sp') === v.sp; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    }
    var el = h('div', { class: 'io-row', 'data-f': f }, [h('b', { class: 'io-f', text: head }), h('span', { class: 'io-arrow', text: '→' }),
      h('span', { class: 'ion-pick', role: 'group', 'aria-label': head }, btns), ionsBox, keepBox]);
    paint();
    /* fill in the right answer (a worked example) */
    function solve() {
      if (st !== 'aq') v.sp = 'keep';
      else { var w = Net.split(f, c, 'aq'); v.sp = 'split'; v.n = [w[0].n, w[1].n]; v.q = [w[0].q, w[1].q]; }
    }
    return { el: el, solve: solve };
  }
  /* why a row is wrong: '' if right, 'empty' if unfinished */
  function judgeSplit(f, c, st, v) {
    if (!v || !v.sp) return 'empty';
    if (st !== 'aq') return v.sp === 'keep' ? '' : f === 'H2O' ? 'HOH is water, a liquid: it stays together. Only dissolved (aq) compounds of ions split.' :
      pretty(f) + ' is a solid, (s): its ions are locked together, so it stays together.';
    if (v.sp === 'keep') return pretty(f) + ' is (aq): it is dissolved, so it is written as its separate ions.';
    if (!v.n[0] || !v.n[1] || !v.q[0] || !v.q[1]) return 'empty';
    var want = Net.split(f, c, 'aq'), one = Net.split(f, 1, 'aq');
    for (var k = 0; k < 2; k++) {
      var t = want[k];
      if (v.q[k] !== t.q) return Net.ionName(t.key, t.q).replace(/^./, function (x) { return x.toUpperCase(); }) + ' is ' + Net.ionText(t.key, t.q) + ': a charge of ' + Math.abs(t.q) + (t.q > 0 ? '+' : '−') + '.';
      if (v.n[k] !== t.n) {
        if (v.n[k] === one[k].n && c > 1) return 'Multiply by the coefficient: ' + c + ' ' + pretty(f) + ' gives ' + c + ' × ' + one[k].n + ' = ' + t.n + ' ' + Net.ionText(t.key, t.q) + '.';
        return 'Count again: each ' + pretty(f) + ' has ' + one[k].n + ' ' + Net.ionText(t.key, t.q) + (c > 1 ? ', and there are ' + c + ' of them' : '') + '.';
      }
    }
    return '';
  }

  function create(host, p, work, opts) {
    opts = opts || {};
    work.i = work.i || 0; work.g = work.g || {}; work.n = work.n || {}; work.v = work.v || {};
    var ref = Ref.panel('table');
    var strip = h('ol', { class: 'rungs' });
    var done = h('div', { class: 'rung-done' });
    var area = h('div', { class: 'rung-area' });
    var given = h('p', { class: 'given', 'aria-label': 'The unbalanced molecular equation' }, [p.unbalanced]);
    var main = h('div', { class: 'ladder-main panel' }, [
      h('p', { class: 'prompt small' }, [p.prompt]),
      given, strip, done, area
    ]);
    var root = h('div', { class: 'ladder' }, [main, ref.el]);
    host.appendChild(root);
    var fresh = false, player = null;

    function save() { if (opts.onSave) opts.onSave(); }
    function fbEl() { return h('p', { class: 'fb', role: 'status', 'aria-live': 'polite' }); }
    function tell(fb, text, kind) { fb.textContent = text || ''; fb.className = 'fb' + (text ? ' show ' + (kind || '') : ''); }
    function count(rung) { work.n[rung] = (work.n[rung] || 0) + 1; return work.n[rung] === 1; }
    function first(rung, right, typed, want) {
      work.g[rung] = right ? 1 : 0;
      if (opts.graded && opts.onRung) opts.onRung(rung, right, typed, want);
    }
    function hint(text) { return opts.hints ? h('p', { class: 'rung-hint', text: text }) : null; }
    function checkRow(check, rung) {
      var showBtn = h('button', { type: 'button', class: 'ghostbtn showme', hidden: (work.n[rung] || 0) < 3, text: 'Show me', onclick: function () { work.s = 1; advance(); } });
      return { row: h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary rung-check', text: 'Check', onclick: check }), showBtn]), show: showBtn };
    }
    function miss(rung, fb, text, show) { tell(fb, text, 'bad'); if (work.n[rung] >= 3) show.hidden = false; save(); }

    function paintStrip() {
      strip.innerHTML = '';
      p.rungs.forEach(function (r, n) {
        var st = '', mark = '';
        if (n < work.i || work.r) { st = work.g[r] === 1 ? 'right' : 'fixed'; mark = work.g[r] === 1 ? ' ★' : ' ✓'; }
        else if (n === work.i) st = 'now';
        strip.appendChild(h('li', { class: 'rung ' + st, 'aria-current': st === 'now' ? 'step' : null }, [h('span', { class: 'rung-n', text: String(n + 1) }), NAMES[r] + mark]));
      });
    }
    /* what is settled so far, on one line: the molecular equation, balanced, then with states */
    function paintDone() {
      done.innerHTML = '';
      var upto = work.r ? p.rungs.length : work.i;
      if (!upto) return;
      done.appendChild(h('p', { class: 'done-line', text: (upto > 1 ? 'Molecular: ' + Net.molecularText(p) : 'Balanced: ' + Net.molecularText(p, false)) }));
    }
    function advance() {
      work.i++;
      if (work.i >= p.rungs.length) { work.r = 1; fresh = true; }
      save();
      render();
      if (work.r && opts.onDone) opts.onDone();
    }

    /* -------------------------------------------------------------- balance */
    function rungBalance() {
      root.classList.add('wide');
      work.bench = work.bench || {};
      area.appendChild(h('p', { class: 'rung-q', text: 'First balance the molecular equation. Change the coefficients until every row of the inventory matches.' }));
      var hb = hint('Count each side in the inventory down the centre. Keep a polyatomic ion together when it is on both sides; water is HOH: one H and one OH.');
      if (hb) area.appendChild(hb);
      Bench.create(area, p.rx, work.bench, {
        marks: 'check', graded: opts.graded, onSave: save,
        onFirst: function (right, typed, want) { work.n.balance = 1; first('balance', right, typed, want); },
        onResolve: function () { if (!opts.graded) work.g.balance = work.bench.n === 1 ? 1 : 0; advance(); }
      });
    }

    /* --------------------------------------------------------------- states */
    function rungStates() {
      var fb = fbEl();
      work.v.st = work.v.st || {};
      ref.show('table');
      var rows = p.r.map(function (f) {
        var btns = ['aq', 's', 'l'].map(function (st) {
          return h('button', { type: 'button', class: 'state-btn' + (work.v.st[f] === st ? ' selected' : ''), 'aria-pressed': work.v.st[f] === st ? 'true' : 'false',
            'data-state': st, 'aria-label': pretty(f) + ' ' + STATE_WORD[st], text: '(' + st + ')', onclick: function () {
              work.v.st[f] = st;
              btns.forEach(function (b) { var on = b.getAttribute('data-state') === st; b.classList.toggle('selected', on); b.classList.remove('wrong'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
              save();
            } });
        });
        return { f: f, btns: btns, el: h('div', { class: 'state-row', 'data-f': f }, [h('b', { class: 'formula', text: pretty(f) }), h('span', { class: 'ion-pick', role: 'group', 'aria-label': 'State of ' + pretty(f) }, btns)]) };
      });
      var cr;
      function check() {
        if (p.r.some(function (f) { return !work.v.st[f]; })) { tell(fb, 'Give every product a state, then Check. (This Check was not counted.)', 'tip'); return; }
        var wrong = p.r.filter(function (f) { return work.v.st[f] !== p.states[f]; });
        if (count('states')) first('states', !wrong.length, p.r.map(function (f) { return f + '(' + work.v.st[f] + ')'; }).join(', '), p.r.map(function (f) { return f + '(' + p.states[f] + ')'; }).join(', '));
        if (!wrong.length) { advance(); return; }
        rows.forEach(function (r) { r.btns.forEach(function (b) { b.classList.toggle('wrong', wrong.indexOf(r.f) >= 0 && b.getAttribute('data-state') === work.v.st[r.f]); }); });
        var f = wrong[0], pr = Net.partsOf(f);
        miss('states', fb, f === 'H2O' ? 'HOH is water: a liquid, (l). It is not a compound of ions that dissolves.'
          : work.v.st[f] === 'l' ? pretty(f) + ' is a compound of ions, not water. It either dissolves, (aq), or is a solid, (s): look it up.'
          : 'Look up ' + pretty(f) + ' in the solubility rules: find ' + Ions.ANIONS[pr.an][2] + ', then see whether ' + Ions.CATIONS[pr.cat][2].replace(/\(.*/, '') + ' is an exception.', cr.show);
      }
      cr = checkRow(check, 'states');
      area.appendChild(h('div', { class: 'rung-states' }, [
        h('p', { class: 'rung-q', text: 'Give each product its state: dissolved (aq), a solid (s), or water, a liquid (l). The reactants are both (aq).' }),
        hint('Use the solubility rules beside you: find the negative ion first, then check the exceptions.'),
        h('div', { class: 'state-rows' }, rows.map(function (r) { return r.el; })), cr.row, fb]));
    }

    /* ---------------------------------------------------------------- ionic */
    function rungIonic() {
      var fb = fbEl();
      work.v.io = work.v.io || p.sp.map(function () { return {}; });
      var rows = p.sp.map(function (f, j) { return splitRow(f, p.coefs[j], j < 2 ? 'aq' : p.states[f], work.v.io[j], save); });
      var cr;
      function check() {
        var msgs = p.sp.map(function (f, j) { return judgeSplit(f, p.coefs[j], j < 2 ? 'aq' : p.states[f], work.v.io[j]); });
        if (msgs.indexOf('empty') >= 0) { tell(fb, 'Decide for every substance whether it splits, and set every number and charge (?), then Check. (This Check was not counted.)', 'tip'); return; }
        var bad = msgs.filter(Boolean)[0];
        if (count('ionic')) first('ionic', !bad, work.v.io.map(function (v, j) { return p.sp[j] + ':' + v.sp + (v.sp === 'split' ? ' ' + v.n.join('/') + ' ' + v.q.join('/') : ''); }).join('; '), Net.ionicText(p));
        rows.forEach(function (r, j) { r.el.classList.toggle('wrong', !!msgs[j]); });
        if (!bad) { advance(); return; }
        miss('ionic', fb, bad, cr.show);
      }
      cr = checkRow(check, 'ionic');
      ref.show('strong');
      area.appendChild(h('div', { class: 'rung-ionic' }, [
        h('p', { class: 'rung-q', text: 'Write the complete ionic equation. Every dissolved (aq) substance splits into its ions; a solid (s) and water (l) stay together. Set how many of each ion and its charge.' }),
        hint('The coefficient counts too: 3 CaCl₂(aq) is 3 Ca²⁺ and 6 Cl⁻. Polyatomic ions such as SO₄²⁻ stay in one piece.'),
        h('div', { class: 'io-side' }, [h('span', { class: 'io-head', text: 'Reactants' })].concat(rows.slice(0, 2).map(function (r) { return r.el; }))),
        h('div', { class: 'io-side' }, [h('span', { class: 'io-head', text: 'Products' })].concat(rows.slice(2).map(function (r) { return r.el; }))),
        cr.row, fb]));
    }

    /* the complete ionic equation as terms; ion terms can be struck out */
    function ionicLine(struck, onTap) {
      function side(terms, k) {
        var out = [];
        terms.forEach(function (t, j) {
          if (j) out.push(h('span', { class: 'eq-plus', text: ' + ' }));
          var txt = Net.termText(t);
          if (t.t === 'ion' && onTap) {
            out.push(h('button', { type: 'button', class: 'term' + (struck[t.key] ? ' struck' : ''), 'data-key': t.key, 'data-side': k, 'aria-pressed': struck[t.key] ? 'true' : 'false',
              'aria-label': txt + (struck[t.key] ? ', struck out' : ''), text: txt, onclick: function () { onTap(t.key); } }));
          } else out.push(h('span', { class: 'term plain' + (t.t === 'ion' && struck[t.key] ? ' struck' : ''), text: txt }));
        });
        return out;
      }
      return h('p', { class: 'ionic-line' }, side(p.ionic.left, 0).concat([h('span', { class: 'eq-arrow', text: ' → ' })], side(p.ionic.right, 1)));
    }

    /* ----------------------------------------------------------- spectators */
    function rungSpectators() {
      var fb = fbEl();
      work.v.sp = work.v.sp || {};
      var lineBox = h('div');
      var noneBtn = h('button', { type: 'button', class: 'state-btn none-btn', 'aria-pressed': work.v.none ? 'true' : 'false', text: 'There are no spectators', onclick: function () {
        work.v.none = !work.v.none; if (work.v.none) work.v.sp = {}; paint(); save();
      } });
      function tap(k) { work.v.sp[k] = !work.v.sp[k]; if (work.v.sp[k]) work.v.none = false; paint(); save(); }
      function paint() {
        lineBox.innerHTML = '';
        lineBox.appendChild(ionicLine(work.v.sp, tap));
        noneBtn.classList.toggle('selected', !!work.v.none); noneBtn.setAttribute('aria-pressed', work.v.none ? 'true' : 'false');
      }
      paint();
      var cr;
      function check() {
        var picked = Object.keys(work.v.sp).filter(function (k) { return work.v.sp[k]; });
        if (!picked.length && !work.v.none) { tell(fb, 'Tap every spectator ion to strike it out on both sides (or choose "There are no spectators"), then Check. (This Check was not counted.)', 'tip'); return; }
        var extra = picked.filter(function (k) { return p.spect.indexOf(k) < 0; });
        var missed = p.spect.filter(function (k) { return picked.indexOf(k) < 0; });
        var right = !extra.length && !missed.length;
        if (count('spectators')) first('spectators', right, picked.length ? picked.join(', ') : 'none', p.spect.length ? p.spect.join(', ') : 'none');
        if (right) { advance(); return; }
        var t, where;
        if (extra.length) {
          t = p.ionic.left.filter(function (x) { return x.key === extra[0]; })[0];
          where = p.ionic.right.filter(function (x) { if (x.t !== 'cmp') return false; var pr = Net.partsOf(x.f); return pr.cat === t.key || pr.an === t.key; })[0];
          miss('spectators', fb, Net.ionText(t.key, t.q) + ' is not a spectator: on the product side it is part of ' + pretty(where.f) + '(' + where.s + '). A spectator is in the solution, unchanged, on both sides.', cr.show);
        } else {
          t = p.ionic.left.filter(function (x) { return x.key === missed[0]; })[0];
          miss('spectators', fb, (work.v.none ? 'Look again: ' : '') + Net.termText(t) + ' is on both sides, unchanged: it is a spectator' + (picked.length ? ' too' : '') + '.', cr.show);
        }
      }
      cr = checkRow(check, 'spectators');
      area.appendChild(h('div', { class: 'rung-spect' }, [
        h('p', { class: 'rung-q', text: 'Strike out the spectators: tap each ion that is in the solution, unchanged, on both sides. It is struck out on both sides at once.' }),
        hint('An ion inside the solid (s) or inside HOH(l) has changed: it is not a spectator.'),
        lineBox, cr.row, fb]));
      cr.row.insertBefore(noneBtn, cr.row.children[1]);
    }

    /* ------------------------------------------------------------------ net */
    function rungNet() {
      var fb = fbEl();
      work.v.net = work.v.net || { inc: {}, no: false };
      var V = work.v.net;
      var preview = h('span', { class: 'net-preview' });
      var struck = {};
      p.spect.forEach(function (k) { struck[k] = 1; });
      function id(t, k) { return k + ':' + Net.termKey(t); }
      var cand = [p.ionic.left, p.ionic.right];
      var noBtn = h('button', { type: 'button', class: 'state-btn none-btn', 'aria-pressed': 'false', text: 'No reaction: everything cancels', onclick: function () {
        V.no = !V.no; if (V.no) V.inc = {}; paintAll(); save();
      } });
      var cols = h('div', { class: 'net-cols' });
      function built(k) {
        return cand[k].filter(function (t) { return V.inc[id(t, k)]; }).map(function (t) { var c = V.inc[id(t, k)]; return { t: t.t, key: t.key, q: t.q, f: t.f, s: c.s, n: c.n, real: t }; });
      }
      function paintPreview() {
        if (V.no) { preview.textContent = 'No reaction'; return; }
        var L = built(0), R = built(1);
        function txt(list) { return list.map(function (t) { return (t.n > 1 ? t.n + ' ' : '') + (t.t === 'ion' ? Net.ionText(t.key, t.q) : pretty(t.f)) + (t.s ? '(' + t.s + ')' : '(?)'); }).join(' + ') || '…'; }
        preview.textContent = txt(L) + ' → ' + txt(R);
      }
      function card(t, k) {
        var key = id(t, k), c = V.inc[key];
        var name = t.t === 'ion' ? Net.ionText(t.key, t.q) : pretty(t.f);
        var inBtn = h('button', { type: 'button', class: 'ion-btn net-in' + (c ? ' selected' : ''), 'aria-pressed': c ? 'true' : 'false', 'data-id': key, text: name, onclick: function () {
          if (V.inc[key]) delete V.inc[key]; else { V.inc[key] = { n: 1, s: null }; V.no = false; }
          paintAll(); save();
        } });
        var kids = [inBtn];
        if (c) {
          var val = h('span', { class: 'sub-n', text: String(c.n) });
          kids.push(h('span', { class: 'stepper sub', role: 'group', 'aria-label': 'Coefficient of ' + name }, [
            h('button', { type: 'button', class: 'stp dec', 'aria-label': 'Coefficient of ' + name + ': less', text: '−', onclick: function () { c.n = Math.max(1, c.n - 1); val.textContent = c.n; paintPreview(); save(); } }), val,
            h('button', { type: 'button', class: 'stp inc', 'aria-label': 'Coefficient of ' + name + ': more', text: '+', onclick: function () { c.n = Math.min(12, c.n + 1); val.textContent = c.n; paintPreview(); save(); } })]));
          var sb = ['aq', 's', 'l'].map(function (st) {
            return h('button', { type: 'button', class: 'state-btn mini' + (c.s === st ? ' selected' : ''), 'aria-pressed': c.s === st ? 'true' : 'false', 'aria-label': name + ' ' + STATE_WORD[st], text: '(' + st + ')',
              onclick: function () { c.s = st; paintAll(); save(); } });
          });
          kids.push(h('span', { class: 'ion-pick', role: 'group', 'aria-label': 'State of ' + name }, sb));
        }
        return h('div', { class: 'net-card' + (c ? ' on' : '') + (t.t === 'ion' && struck[t.key] ? ' was-struck' : '') }, kids);
      }
      function paintAll() {
        cols.innerHTML = '';
        ['Reactant side', 'Product side'].forEach(function (title, k) {
          cols.appendChild(h('div', { class: 'net-col' }, [h('span', { class: 'io-head', text: title })].concat(cand[k].map(function (t) { return card(t, k); }))));
        });
        noBtn.classList.toggle('selected', !!V.no); noBtn.setAttribute('aria-pressed', V.no ? 'true' : 'false');
        paintPreview();
      }
      paintAll();
      var cr;
      function typed() { return V.no ? 'no reaction' : preview.textContent; }
      function judge() {
        if (V.no) return p.net ? 'Not everything cancels here: ' + (p.kind === 'water' ? 'H⁺ and OH⁻ become HOH.' : p.kind === 'both' ? 'a solid and water form.' : pretty(p.solids[0]) + ' forms as a solid.') : '';
        var L = built(0), R = built(1);
        if (!p.net) return 'Every ion here is a spectator: they all cancel and nothing is left. Choose "No reaction".';
        var want = [p.net.left, p.net.right], got = [L, R];
        for (var k = 0; k < 2; k++) {
          var extra = got[k].filter(function (t) { return !want[k].some(function (w) { return Net.termKey(w) === Net.termKey(t); }); })[0];
          if (extra) return (extra.t === 'ion' ? Net.ionText(extra.key, extra.q) : pretty(extra.f)) + ' is a spectator: it cancels, so it is not in the net ionic equation.';
          var lack = want[k].filter(function (w) { return !got[k].some(function (t) { return Net.termKey(w) === Net.termKey(t); }); })[0];
          if (lack) return 'Something that changes is missing on the ' + (k ? 'product' : 'reactant') + ' side: ' + (lack.t === 'ion' ? Net.ionText(lack.key, lack.q) : pretty(lack.f)) + '.';
        }
        /* the same terms: now the coefficients, then the states */
        var all = L.concat(R), wantAll = want[0].concat(want[1]);
        var ratio = null, same = true;
        all.forEach(function (t) {
          var w = wantAll.filter(function (x) { return Net.termKey(x) === Net.termKey(t); })[0];
          if (ratio == null) ratio = t.n / w.n;
          if (Math.abs(t.n / w.n - ratio) > 1e-9) same = false;
        });
        if (same && ratio > 1 && Math.round(ratio) === ratio) return 'The right particles in the right ratio, but use the lowest whole numbers: divide every coefficient by ' + ratio + '.';
        if (!same || ratio !== 1) {
          var qL = L.reduce(function (s, t) { return s + (t.t === 'ion' ? t.q * t.n : 0); }, 0);
          return 'Check the coefficients: the charges on the left add up to ' + (qL > 0 ? '+' : '') + qL + ', and what forms must use exactly those ions' + (p.kind !== 'water' ? ' in the ratio of the formula.' : '.');
        }
        var badS = all.filter(function (t) { return t.s !== (t.t === 'ion' ? 'aq' : t.real.s); })[0];
        if (badS) return badS.t === 'ion' ? 'Ions in solution are (aq).' : pretty(badS.f) === 'HOH' ? 'Water is a liquid: HOH(l).' : pretty(badS.f) + ' is the solid: (s).';
        return '';
      }
      function check() {
        if (!V.no) {
          var L = built(0), R = built(1);
          if (!L.length || !R.length || L.concat(R).some(function (t) { return !t.s; })) {
            tell(fb, 'Choose what is on each side and give every term a state, or choose "No reaction", then Check. (This Check was not counted.)', 'tip'); return;
          }
        }
        var bad = judge();
        if (count('net')) first('net', !bad, typed(), Net.netText(p));
        if (!bad) { advance(); return; }
        miss('net', fb, bad, cr.show);
      }
      cr = checkRow(check, 'net');
      ref.show('table');
      area.appendChild(h('div', { class: 'rung-net' }, [
        h('p', { class: 'rung-q', text: 'Write the net ionic equation: only what changes, in the lowest whole numbers, with states. If everything cancelled, there is no reaction.' }),
        ionicLine(struck, null),
        hint('Leave out every struck-out spectator. Then divide by any number that goes into every coefficient.'),
        cols, h('p', { class: 'net-built' }, [h('span', { class: 'io-head', text: 'Your net ionic equation: ' }), preview]),
        cr.row, fb]));
      cr.row.insertBefore(noBtn, cr.row.children[1]);
    }

    /* ----------------------------------------------------------------- done */
    function render() {
      if (player) { player.destroy(); player = null; }
      area.innerHTML = '';
      root.classList.remove('wide');
      paintStrip();
      paintDone();
      given.textContent = work.r ? Net.molecularText(p) : p.unbalanced;
      strip.hidden = done.hidden = !!work.r;
      if (work.r) {
        /* the equations beside the same reaction in the beaker: it plays by itself the first time */
        root.classList.add('wide');
        var struck = {};
        p.spect.forEach(function (k) { struck[k] = 1; });
        var words = h('div', { class: 'final' }, [
          h('p', { class: 'final-l', text: 'Complete ionic' }), ionicLine(struck, null),
          h('p', { class: 'final-l', text: 'Net ionic' }), h('p', { class: 'final-eq', text: Net.netText(p) }),
          h('p', { class: 'final-why', text: Net.why(p) }),
          opts.next ? h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary ladder-next', text: opts.next.label, onclick: opts.next.onClick })]) : null]);
        var pic = h('div', { class: 'final-pic' });
        area.appendChild(h('div', { class: 'final-grid' }, [words, pic]));
        player = Beaker.show(pic, p, { auto: fresh, highlight: true });
        fresh = false;
        return;
      }
      var r = p.rungs[work.i];
      ({ balance: rungBalance, states: rungStates, ionic: rungIonic, spectators: rungSpectators, net: rungNet })[r]();
    }
    render();

    return { work: work, root: root, problem: p, destroy: function () { if (player) player.destroy(); } };
  }

  return { create: create, NAMES: NAMES, splitRow: splitRow, judgeSplit: judgeSplit };
})();

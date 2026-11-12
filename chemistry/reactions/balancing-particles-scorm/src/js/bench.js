/* bench.js: the workbench. An equation with a stepper on every coefficient,
 * a box of reactant particles and a box of product particles that redraw as
 * the coefficients change, and a tally of the atoms of each element.
 *
 *   Bench.create(host, rx, work, opts) -> { work, destroy, set(coefs), check() }
 *
 * work (saved): { c: [coefficients], n: checks so far, g: 1 or 0 (the first
 * check, graded benches only), r: 1 when balanced, s: 1 if Show me was used }
 *
 * opts:
 *   tally    'live'   the tally follows the coefficients (the lesson)
 *            'check'  the student counts; the tally appears with the first
 *                     Check and is live from then on (the graded set)
 *   graded   the first Check counts: opts.onFirst(right, typed, wanted)
 *   picture  [coefficients]: the boxes show this fixed picture and the
 *            steppers only write the equation (picture to equation)
 *   onSave, onResolve, next: { label, onClick }
 *
 * A Check with an empty box is not an answer. Coefficients that conserve
 * every atom but are not the lowest whole numbers are told so, and are not
 * right. Show me is offered after three misses.
 */
var Bench = (function () {
  'use strict';
  var h = UI.h;
  var NS = 'http://www.w3.org/2000/svg';
  var MAXC = 20, BOXW = 560, BOXH = 190;

  function elName(el) { return Particles.EL[el][0]; }

  function create(host, rx, work, opts) {
    opts = opts || {};
    var sp = Chem.species(rx), nl = rx.l.length, want = Chem.balance(rx);
    if (!Array.isArray(work.c) || work.c.length !== sp.length) work.c = sp.map(function () { return 1; });
    work.n = work.n || 0;
    var tallyOn = opts.tally !== 'check' || work.n > 0 || work.r;
    var inputs = [], was = { l: null, r: null };

    var fb = h('p', { class: 'fb', role: 'status', 'aria-live': 'polite' });
    function tell(text, kind) { fb.textContent = text || ''; fb.className = 'fb' + (text ? ' show ' + (kind || '') : ''); }

    function coefs() {
      return inputs.map(function (inp) { var v = inp.value.trim(); return /^\d+$/.test(v) ? +v : NaN; });
    }
    function drawn() { return opts.picture || coefs().map(function (c) { return isNaN(c) || c < 1 ? 0 : Math.min(c, MAXC); }); }

    /* ---- the equation */
    var eq = h('div', { class: 'eq', role: 'group', 'aria-label': 'The equation: set each coefficient' });
    sp.forEach(function (f, j) {
      if (j === nl) eq.appendChild(h('span', { class: 'eq-op arrow', text: '→' }));
      else if (j > 0) eq.appendChild(h('span', { class: 'eq-op', text: '+' }));
      var inp = h('input', { class: 'coef', type: 'text', inputmode: 'numeric', maxlength: '2', autocomplete: 'off',
        'aria-label': 'Coefficient of ' + Chem.pretty(f) + ' (' + Rx.name(f) + ')', value: String(work.c[j] || '') });
      function bump(d) {
        if (work.r) return;
        var v = /^\d+$/.test(inp.value.trim()) ? +inp.value : 0;
        inp.value = String(Math.max(1, Math.min(MAXC, v + d)));
        changed();
      }
      inp.addEventListener('input', changed);
      inp.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowUp') { ev.preventDefault(); bump(1); }
        else if (ev.key === 'ArrowDown') { ev.preventDefault(); bump(-1); }
        else if (ev.key === 'Enter') { ev.preventDefault(); check(); }
      });
      inp.addEventListener('focus', function () { inp.select(); });
      inputs.push(inp);
      eq.appendChild(h('span', { class: 'term' }, [
        h('span', { class: 'stepper' }, [
          h('button', { type: 'button', class: 'stp dec', 'aria-label': 'One fewer ' + Chem.pretty(f), text: '−', onclick: function () { bump(-1); } }),
          inp,
          h('button', { type: 'button', class: 'stp inc', 'aria-label': 'One more ' + Chem.pretty(f), text: '+', onclick: function () { bump(1); } })
        ]),
        h('span', { class: 'formula', title: Rx.name(f), text: Chem.pretty(f) })
      ]));
    });

    /* ---- the two boxes */
    function box(title) {
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'pbox-svg');
      svg.setAttribute('role', 'img');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      return { svg: svg, el: h('figure', { class: 'pbox' }, [h('figcaption', { text: title }), svg]) };
    }
    var left = box('Reactants'), right = box('Products');
    var boxes = h('div', { class: 'boxes' }, [left.el, h('div', { class: 'boxes-arrow', 'aria-hidden': 'true', text: '→' }), right.el]);

    /* ---- the tally */
    var tallyBox = h('div', { class: 'tally', role: 'group', 'aria-label': 'Atoms of each element' });

    function describe(list, cs, off) {
      return list.map(function (f, j) { return cs[off + j] + ' ' + Chem.pretty(f); }).join(', ');
    }
    function paint() {
      var d = drawn();
      var li = rx.l.map(function (f, j) { return { f: f, n: d[j] }; });
      var ri = rx.r.map(function (f, j) { return { f: f, n: d[nl + j] }; });
      Particles.pair(left.svg, li, right.svg, ri, { w: BOXW, h: BOXH, wasL: was.l, wasR: was.r });
      was.l = li.map(function (x) { return x.n; });
      was.r = ri.map(function (x) { return x.n; });
      left.svg.setAttribute('aria-label', 'Reactants: ' + describe(rx.l, d, 0));
      right.svg.setAttribute('aria-label', 'Products: ' + describe(rx.r, d, nl));
      tallyBox.innerHTML = '';
      if (opts.picture) {
        tallyBox.appendChild(h('span', { class: 'tally-note', text: 'The picture does not change here: the steppers only write its equation.' }));
        return;
      }
      if (!tallyOn) {
        tallyBox.appendChild(h('span', { class: 'tally-note', text: 'Count the atoms of each element in both boxes. Check shows the tally.' }));
        return;
      }
      tallyBox.appendChild(h('span', { class: 'tally-head', text: 'Atoms: reactants | products' }));
      Chem.tally(rx, d).forEach(function (t) {
        tallyBox.appendChild(h('span', { class: 'chip ' + (t.ok ? 'ok' : 'off'),
          'aria-label': elName(t.el) + ': ' + t.left + ' in the reactants, ' + t.right + ' in the products, ' + (t.ok ? 'the same' : 'not the same') }, [
          h('b', { text: t.el }), ' ' + t.left + ' | ' + t.right + ' ', h('span', { class: 'chip-m', text: t.ok ? '✓' : '≠' })
        ]));
      });
    }

    function changed() {
      if (work.r) return;
      work.c = coefs().map(function (c) { return isNaN(c) ? 0 : c; });
      checkBtn.disabled = false;
      paint();
      if (opts.onSave) opts.onSave();
    }

    /* ---- judging */
    function offText(j) {
      var more = j.bad.length > 1 ? ' (' + (j.bad.length - 1) + ' more element' + (j.bad.length > 2 ? 's do' : ' does') + ' not match either.)' : '';
      return 'Not balanced yet. ' + elName(j.el).charAt(0).toUpperCase() + elName(j.el).slice(1) + ': ' + j.left + ' atom' + (j.left === 1 ? '' : 's') +
        ' in the reactants, ' + j.right + ' in the products.' + more + ' Change a coefficient, never a subscript.';
    }
    function lock() {
      inputs.forEach(function (inp) { inp.readOnly = true; });
      Array.prototype.forEach.call(eq.querySelectorAll('.stp'), function (b) { b.disabled = true; });
      checkBtn.hidden = true; resetBtn.hidden = true; showBtn.hidden = true;
      root.classList.add('done');
      if (nextBtn) nextBtn.hidden = false;
    }
    function resolve(shown) {
      work.r = 1;
      if (shown) work.s = 1;
      tallyOn = true;
      paint();
      lock();
      tell((shown ? 'Here it is: ' : 'Balanced: ') + Chem.equation(rx, want) + '. Every atom in the reactants box is in the products box.', 'good');
      if (opts.onSave) opts.onSave();
      if (opts.onResolve) opts.onResolve();
    }
    function check() {
      if (work.r) return;
      var cs = coefs(), j = Chem.judge(rx, cs);
      if (j.kind === 'empty') {
        tell('Every coefficient needs a whole number, 1 or more. (This Check was not counted.)', 'tip');
        inputs[j.at].focus();
        return;
      }
      var first = work.n === 0;
      work.n++;
      if (opts.graded && first) {
        work.g = j.kind === 'right' ? 1 : 0;
        if (opts.onFirst) opts.onFirst(j.kind === 'right', cs.join(', '), want.join(', '));
      }
      if (j.kind === 'right') { resolve(false); return; }
      if (!opts.picture) tallyOn = true;
      paint();
      if (j.kind === 'multiple') {
        tell((opts.picture ? 'That matches the picture, but' : 'Every atom is conserved, but') + ' an equation is written with the lowest whole numbers. ' +
          'Every coefficient can be divided by ' + j.k + '.', 'bad');
      } else if (opts.picture) {
        tell('Those coefficients do not match the picture. Count the particles of each kind in each box, then divide by the number they share.', 'bad');
      } else {
        tell(offText(j), 'bad');
      }
      if (work.n >= 3) showBtn.hidden = false;
      if (opts.onSave) opts.onSave();
    }

    var checkBtn = h('button', { type: 'button', class: 'primary bench-check', text: 'Check', onclick: check });
    var resetBtn = h('button', { type: 'button', class: 'ghostbtn', text: 'Back to all 1s', onclick: function () {
      inputs.forEach(function (inp) { inp.value = '1'; });
      changed();
      tell('');
    } });
    var showBtn = h('button', { type: 'button', class: 'ghostbtn showme', text: 'Show me', hidden: true, onclick: function () {
      inputs.forEach(function (inp, j) { inp.value = String(want[j]); });
      work.c = want.slice();
      resolve(true);
    } });
    var nextBtn = opts.next ? h('button', { type: 'button', class: 'primary bench-next', text: opts.next.label, hidden: true, onclick: opts.next.onClick }) : null;
    var key = Particles.key(Chem.elements(rx));

    var root = h('section', { class: 'bench' + (opts.picture ? ' picture' : '') }, [
      eq, boxes,
      h('div', { class: 'bench-foot' }, [tallyBox, key]),
      h('div', { class: 'btnrow' }, [checkBtn, resetBtn, showBtn, nextBtn]),
      fb
    ]);
    host.appendChild(root);
    paint();
    if (work.r) {
      inputs.forEach(function (inp, j) { inp.value = String(want[j]); });
      paint();
      lock();
      tell('Balanced: ' + Chem.equation(rx, want) + '.', 'good');
    } else if (work.n >= 3) showBtn.hidden = false;

    return {
      work: work, root: root, want: want,
      set: function (cs) { inputs.forEach(function (inp, j) { inp.value = String(cs[j]); }); changed(); },
      check: check,
      destroy: function () {}
    };
  }

  /* ---- a still picture: two boxes and, if asked, the tally.
     items: { l: [{ f, n }], r: [{ f, n }] }; o: { tally, h, eq (text above) } */
  function items(rx, coefs) {
    var nl = rx.l.length;
    return { l: rx.l.map(function (f, j) { return { f: f, n: coefs[j] }; }), r: rx.r.map(function (f, j) { return { f: f, n: coefs[nl + j] }; }) };
  }
  function count(list) {
    var out = {};
    list.forEach(function (it) {
      var c = Chem.parse(it.f);
      Object.keys(c).forEach(function (el) { out[el] = (out[el] || 0) + c[el] * it.n; });
    });
    return out;
  }
  function tallyOf(it) {
    var a = count(it.l), b = count(it.r), els = [];
    Object.keys(a).concat(Object.keys(b)).forEach(function (el) { if (els.indexOf(el) < 0) els.push(el); });
    return els.map(function (el) { return { el: el, left: a[el] || 0, right: b[el] || 0, ok: (a[el] || 0) === (b[el] || 0) }; });
  }
  function picture(it, o) {
    o = o || {};
    function box(title, list) {
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'pbox-svg');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', title + ': ' + list.map(function (x) { return x.n + ' ' + Chem.pretty(x.f); }).join(', '));
      return { svg: svg, el: h('figure', { class: 'pbox' }, [h('figcaption', { text: title }), svg]) };
    }
    var L = box(o.left || 'Reactants', it.l), R = box(o.right || 'Products', it.r);
    Particles.pair(L.svg, it.l, R.svg, it.r, { w: o.w || 420, h: o.h || 150, max: o.max });
    var kids = [];
    if (o.eq) kids.push(h('p', { class: 'pic-eq', text: o.eq }));
    kids.push(h('div', { class: 'boxes' }, [L.el, h('div', { class: 'boxes-arrow', 'aria-hidden': 'true', text: '→' }), R.el]));
    var foot = h('div', { class: 'bench-foot' });
    var t = h('div', { class: 'tally' });
    if (o.tally) {
      t.appendChild(h('span', { class: 'tally-head', text: 'Atoms: reactants | products' }));
      tallyOf(it).forEach(function (x) {
        t.appendChild(h('span', { class: 'chip ' + (x.ok ? 'ok' : 'off') }, [h('b', { text: x.el }), ' ' + x.left + ' | ' + x.right + ' ', h('span', { class: 'chip-m', text: x.ok ? '✓' : '≠' })]));
      });
    }
    foot.appendChild(t);
    var els = [];
    it.l.concat(it.r).forEach(function (x) { Object.keys(Chem.parse(x.f)).forEach(function (el) { if (els.indexOf(el) < 0) els.push(el); }); });
    foot.appendChild(Particles.key(els));
    kids.push(foot);
    return h('div', { class: 'bench still' }, kids);
  }

  return { create: create, picture: picture, items: items, tallyOf: tallyOf, BOXW: BOXW, BOXH: BOXH };
})();

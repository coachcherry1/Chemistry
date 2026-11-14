/* bench.js: the workbench. An equation with a stepper on every coefficient,
 * a box of reactant particles and a box of product particles that redraw as
 * the coefficients change, and between the boxes, under the arrow, the
 * inventory: one row per element (or per polyatomic ion that stays together
 * on both sides), the count in the reactants on its left and the count in
 * the products on its right, as the teacher writes it on paper.
 *
 *   Bench.create(host, rx, work, opts) -> { work, destroy, set(coefs), check() }
 *
 * work (saved): { c: [coefficients], n: checks so far, g: 1 or 0 (the first
 * check, graded benches only), r: 1 when balanced, s: 1 if Show me was used,
 * t: 1 once a typed inventory is right }
 *
 * opts:
 *   marks    'live'   the inventory rows turn green or red as the counts
 *                     change (the lesson)
 *            'check'  the counts still follow the coefficients, but nothing
 *                     is marked until the first Check (the graded set): the
 *                     student compares the two columns
 *   typed    the student first types the inventory for the equation as
 *            written (every coefficient 1); the steppers open once it is right
 *   graded   the first Check counts: opts.onFirst(right, typed, wanted, and
 *            with classify: typeRight, typePicked, typeWanted)
 *   classify the student also chooses the type of reaction (six buttons; a
 *            click only selects), and Check judges both together: the
 *            classifying package. work.y is the type picked, work.k 1 or 0
 *            for the type on the first Check. A Check with no type chosen is
 *            not an answer.
 *   onSave, onResolve, onTyped, next: { label, onClick }
 *
 * A Check with an empty box is not an answer. Coefficients that conserve
 * every atom but are not the lowest whole numbers are told so, and are not
 * right. Show me is offered after three misses.
 */
var Bench = (function () {
  'use strict';
  var h = UI.h;
  var NS = 'http://www.w3.org/2000/svg';
  var MAXC = 20, BOXW = 520, BOXH = 200;

  function elName(el) { return Particles.EL[el][0]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* what a row of the inventory counts, in words */
  function rowName(r) {
    if (r.ion) return r.name + ' ions (' + r.label + ')';
    if (r.other && r.other.length) return elName(r.key) + ' atoms outside ' + r.other.map(Chem.pretty).join(' and ');
    return elName(r.key) + ' atoms';
  }

  function svgBox(title) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'pbox-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    return { svg: svg, el: h('figure', { class: 'pbox' }, [h('figcaption', { text: title }), svg]) };
  }

  /* one row of the inventory: left count, what is counted, right count.
     marks: colour the row by whether the two counts match */
  function invRow(r, marks, tint) {
    return h('div', { class: 'inv-row' + (marks ? (r.ok ? ' ok' : ' off') : '') + (tint >= 0 ? ' ion tint' + tint : ''), role: 'row',
      'aria-label': cap(rowName(r)) + ': ' + r.left + ' in the reactants, ' + r.right + ' in the products' + (marks ? (r.ok ? ', the same' : ', not the same') : '') }, [
      h('span', { class: 'inv-n', text: String(r.left) }),
      h('span', { class: 'inv-l' }, [h('b', { text: r.label }), r.other && r.other.length ? h('small', { text: 'not in ' + r.other.map(Chem.pretty).join(', ') }) : null]),
      h('span', { class: 'inv-n', text: String(r.right) })
    ]);
  }
  function invHead() { return h('div', { class: 'inv-head', 'aria-hidden': 'true', text: 'Inventory' }); }

  function create(host, rx, work, opts) {
    opts = opts || {};
    var sp = Chem.species(rx), nl = rx.l.length, want = Chem.balance(rx);
    if (!Array.isArray(work.c) || work.c.length !== sp.length) work.c = sp.map(function () { return 1; });
    work.n = work.n || 0;
    var typing = !!opts.typed && !work.t && !work.r;
    var marksOn = opts.marks !== 'check' || work.n > 0 || work.r;
    var inputs = [], was = { l: null, r: null };
    work.i = work.i || {};
    /* the ions kept together: outlined in the boxes, tinted the same in the inventory */
    var info = Chem.rows(rx);
    var ions = info.kept.map(function (ion, k) { return { ion: ion, tint: k % 3, hoh: info.hoh }; });
    function tintOf(r) { return r.ion ? info.kept.indexOf(r.ion) % 3 : -1; }

    var fb = h('p', { class: 'fb', role: 'status', 'aria-live': 'polite' });
    function tell(text, kind) { fb.textContent = text || ''; fb.className = 'fb' + (text ? ' show ' + (kind || '') : ''); }

    function coefs() {
      return inputs.map(function (inp) { var v = inp.value.trim(); return /^\d+$/.test(v) ? +v : NaN; });
    }
    function drawn() { return coefs().map(function (c) { return isNaN(c) || c < 1 ? 0 : Math.min(c, MAXC); }); }

    /* ---- the equation: reactants over their box, the arrow over the inventory, products over theirs */
    function term(f, j) {
      var inp = h('input', { class: 'coef', type: 'text', inputmode: 'numeric', maxlength: '2', autocomplete: 'off',
        'aria-label': 'Coefficient of ' + Chem.show(rx, f) + ' (' + Rx.name(f) + ')', value: String(work.c[j] || '') });
      function bump(d) {
        if (work.r || typing) return;
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
      inputs[j] = inp;
      return h('span', { class: 'term' }, [
        h('span', { class: 'stepper' }, [
          h('button', { type: 'button', class: 'stp dec', 'aria-label': 'One fewer ' + Chem.show(rx, f), text: '−', onclick: function () { bump(-1); } }),
          inp,
          h('button', { type: 'button', class: 'stp inc', 'aria-label': 'One more ' + Chem.show(rx, f), text: '+', onclick: function () { bump(1); } })
        ]),
        h('span', { class: 'formula', title: Rx.name(f), text: Chem.show(rx, f) })
      ]);
    }
    function side(list, off) {
      var kids = [];
      list.forEach(function (f, j) {
        if (j) kids.push(h('span', { class: 'eq-op', text: '+' }));
        kids.push(term(f, off + j));
      });
      return h('div', { class: 'eq-side' + (list.length > 3 ? ' tight' : '') }, kids);
    }
    var eq = h('div', { class: 'eq', role: 'group', 'aria-label': 'The equation: set each coefficient' },
      [side(rx.l, 0), h('span', { class: 'eq-op arrow', text: '→' }), side(rx.r, nl)]);

    /* ---- the boxes and, between them, the inventory */
    var left = svgBox('Reactants'), right = svgBox('Products');
    var inv = h('div', { class: 'inv', role: 'table', 'aria-label': 'Inventory: reactants, what is counted, products' });
    var boxes = h('div', { class: 'boxes' }, [left.el, inv, right.el]);
    var typedInputs = [];

    function describe(list, cs, off) {
      return list.map(function (f, j) { return cs[off + j] + ' ' + Chem.show(rx, f); }).join(', ');
    }
    function paintInv(d) {
      inv.innerHTML = '';
      inv.appendChild(invHead());
      if (typing) {
        typedInputs = [];
        Chem.inventory(rx, sp.map(function () { return 1; })).forEach(function (r) {
          function cell(sideName, wantN) {
            var id = r.key + '-' + sideName;
            var inp = h('input', { class: 'coef inv-in', type: 'text', inputmode: 'numeric', maxlength: '2', autocomplete: 'off', value: work.i[id] || '',
              'aria-label': cap(rowName(r)) + ' in the ' + (sideName === 'l' ? 'reactants' : 'products') });
            inp.addEventListener('input', function () { work.i[id] = inp.value.trim(); inp.classList.remove('ok', 'wrong'); if (opts.onSave) opts.onSave(); });
            inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); checkTyped(); } });
            typedInputs.push({ inp: inp, want: wantN, row: r, side: sideName });
            return inp;
          }
          inv.appendChild(h('div', { class: 'inv-row typing' + (r.ion ? ' ion tint' + tintOf(r) : ''), role: 'row' }, [
            cell('l', r.left),
            h('span', { class: 'inv-l' }, [h('b', { text: r.label }), r.other && r.other.length ? h('small', { text: 'not in ' + r.other.map(Chem.pretty).join(', ') }) : null]),
            cell('r', r.right)
          ]));
        });
        return;
      }
      Chem.inventory(rx, d).forEach(function (r) { inv.appendChild(invRow(r, marksOn, tintOf(r))); });
    }
    function paint() {
      var d = drawn();
      var li = rx.l.map(function (f, j) { return { f: f, n: d[j] }; });
      var ri = rx.r.map(function (f, j) { return { f: f, n: d[nl + j] }; });
      Particles.pair(left.svg, li, right.svg, ri, { w: BOXW, h: BOXH, wasL: was.l, wasR: was.r, ions: ions });
      was.l = li.map(function (x) { return x.n; });
      was.r = ri.map(function (x) { return x.n; });
      left.svg.setAttribute('aria-label', 'Reactants: ' + describe(rx.l, d, 0));
      right.svg.setAttribute('aria-label', 'Products: ' + describe(rx.r, d, nl));
      paintInv(d);
    }

    function changed() {
      if (work.r || typing) return;
      work.c = coefs().map(function (c) { return isNaN(c) ? 0 : c; });
      paint();
      if (opts.onSave) opts.onSave();
    }

    /* ---- a typed inventory: every box must match the equation as written */
    function slip(t, v) {
      var f = (t.side === 'l' ? rx.l : rx.r), where = t.side === 'l' ? 'reactants' : 'products';
      var what = t.row.ion ? t.row.label : t.row.key;
      if (t.row.ion === 'OH' && info.hoh && t.side === (rx.l.indexOf('H2O') >= 0 ? 'l' : 'r') && v < t.want) return 'Water is written HOH here: one hydroxide, OH, and one hydrogen.';
      var bracket = f.filter(function (x) { return new RegExp('\\(' + (t.row.ion || '[^)]*' + t.row.key + '[^)]*') + '\\)\\d').test(x); })[0];
      if (bracket && v < t.want) return 'Look at ' + Chem.pretty(bracket) + ': the subscript outside the brackets multiplies everything inside them.';
      if (!t.row.ion && f.filter(function (x) { return Chem.parse(x)[t.row.key]; }).length > 1) {
        return cap(elName(t.row.key)) + ' is in more than one substance in the ' + where + '. Add them all: the ' + where + ' have ' + t.want + '.';
      }
      return 'Count the ' + what + ' in the ' + where + ' box again.';
    }
    function checkTyped() {
      var blank = false, firstBad = null;
      typedInputs.forEach(function (t) {
        var v = t.inp.value.trim();
        if (!/^\d+$/.test(v)) { blank = true; return; }
        var ok = +v === t.want;
        t.inp.classList.toggle('ok', ok);
        t.inp.classList.toggle('wrong', !ok);
        if (!ok && !firstBad) firstBad = { t: t, v: +v };
      });
      if (blank) { tell('Fill in both columns of the inventory, then Check.', 'tip'); return; }
      if (firstBad) { tell(slip(firstBad.t, firstBad.v), 'bad'); firstBad.t.inp.focus(); return; }
      work.t = 1;
      work.i = {};
      typing = false;
      root.classList.remove('typing');
      setLocked(false);
      checkBtn.textContent = 'Check';
      resetBtn.hidden = false;
      paint();
      tell('That is the inventory. Now change the coefficients: the inventory and the boxes follow. Balance it, then Check.', 'good');
      if (opts.onSave) opts.onSave();
      if (opts.onTyped) opts.onTyped();
    }

    /* ---- judging */
    function offText(j) {
      var r = j.rows[0];
      var more = j.rows.length > 1 ? ' (' + (j.rows.length - 1) + ' more row' + (j.rows.length > 2 ? 's do' : ' does') + ' not match either.)' : '';
      return 'Not balanced yet. ' + cap(rowName(r)) + ': ' + r.left + ' in the reactants, ' + r.right + ' in the products.' + more +
        ' Change a coefficient, never a subscript.';
    }
    /* ---- the type of reaction (the classifying package) */
    var typeBtns = [], typeRow = null;
    if (opts.classify) {
      typeRow = h('div', { class: 'types', role: 'group', 'aria-label': 'Type of reaction' }, [h('span', { class: 'types-l', text: 'Type of reaction:' })]);
      Chem.TYPE_ORDER.forEach(function (t) {
        var b = h('button', { type: 'button', class: 'type-btn' + (work.y === t ? ' selected' : ''), 'aria-pressed': work.y === t ? 'true' : 'false',
          'data-type': t, text: Chem.TYPES[t].name, onclick: function () {
            if (work.r) return;
            work.y = t;
            typeBtns.forEach(function (x) {
              var on = x === b;
              x.classList.toggle('selected', on); x.classList.remove('wrong');
              x.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
            if (opts.onSave) opts.onSave();
          } });
        typeBtns.push(b);
        typeRow.appendChild(b);
      });
    }
    function lockTypes() {
      typeBtns.forEach(function (b) {
        b.disabled = true;
        var right = b.getAttribute('data-type') === rx.type;
        b.classList.remove('selected', 'wrong');
        b.classList.toggle('right', right);
        b.setAttribute('aria-pressed', right ? 'true' : 'false');
      });
    }

    function setLocked(on) {
      inputs.forEach(function (inp) { inp.readOnly = on; });
      Array.prototype.forEach.call(eq.querySelectorAll('.stp'), function (b) { b.disabled = on; });
    }
    function lock() {
      setLocked(true);
      checkBtn.hidden = true; resetBtn.hidden = true; showBtn.hidden = true;
      lockTypes();
      root.classList.add('done');
      if (nextBtn) nextBtn.hidden = false;
    }
    function resolve(shown) {
      work.r = 1;
      if (shown) work.s = 1;
      marksOn = true;
      paint();
      lock();
      tell((shown ? 'Here it is: ' : 'Balanced: ') + Chem.equation(rx, want) + '. Every row of the inventory matches.' +
        (opts.classify ? ' ' + Chem.TYPES[rx.type].name + ': ' + Chem.TYPES[rx.type].clue : ''), 'good');
      if (opts.onSave) opts.onSave();
      if (opts.onResolve) opts.onResolve();
    }
    function check() {
      if (work.r) return;
      if (typing) { checkTyped(); return; }
      var cs = coefs(), j = Chem.judge(rx, cs);
      if (j.kind === 'empty') {
        tell('Every coefficient needs a whole number, 1 or more. (This Check was not counted.)', 'tip');
        inputs[j.at].focus();
        return;
      }
      if (opts.classify && !work.y) {
        tell('Choose the type of reaction as well, then Check. (This Check was not counted.)', 'tip');
        return;
      }
      var first = work.n === 0;
      work.n++;
      var balOk = j.kind === 'right', typeOk = !opts.classify || work.y === rx.type;
      if (opts.graded && first) {
        work.g = balOk ? 1 : 0;
        if (opts.classify) work.k = typeOk ? 1 : 0;
        if (opts.onFirst) {
          opts.onFirst(balOk, cs.join(', '), want.join(', '), typeOk, opts.classify ? Chem.TYPES[work.y].name : '', opts.classify ? Chem.TYPES[rx.type].name : '');
        }
      }
      if (balOk && typeOk) { resolve(false); return; }
      marksOn = true;
      paint();
      var msg;
      if (balOk) msg = 'The equation is balanced.';
      else if (j.kind === 'multiple') msg = 'Every row matches, but an equation is written with the lowest whole numbers. Every coefficient can be divided by ' + j.k + '.';
      else msg = offText(j);
      if (opts.classify) {
        typeBtns.forEach(function (b) { b.classList.toggle('wrong', !typeOk && b.getAttribute('data-type') === work.y); });
        msg += typeOk ? ' The type is right: ' + Chem.TYPES[rx.type].name.toLowerCase() + '.'
                      : ' The type is not ' + Chem.TYPES[work.y].name.toLowerCase() + '. ' + Chem.TYPES[rx.type].look;
      }
      tell(msg, 'bad');
      if (work.n >= 3) showBtn.hidden = false;
      if (opts.onSave) opts.onSave();
    }

    var checkBtn = h('button', { type: 'button', class: 'primary bench-check', text: typing ? 'Check inventory' : 'Check', onclick: check });
    var resetBtn = h('button', { type: 'button', class: 'ghostbtn', text: 'Back to all 1s', hidden: typing, onclick: function () {
      inputs.forEach(function (inp) { inp.value = '1'; });
      changed();
      tell('');
    } });
    var showBtn = h('button', { type: 'button', class: 'ghostbtn showme', text: 'Show me', hidden: true, onclick: function () {
      inputs.forEach(function (inp, j) { inp.value = String(want[j]); });
      work.c = want.slice();
      if (opts.classify) work.y = rx.type;
      resolve(true);
    } });
    var nextBtn = opts.next ? h('button', { type: 'button', class: 'primary bench-next', text: opts.next.label, hidden: true, onclick: opts.next.onClick }) : null;
    var key = Particles.key(Chem.elements(rx));
    ions.forEach(function (it) {
      key.appendChild(h('span', { class: 'pkey-i' }, [h('span', { class: 'pkey-halo tint' + it.tint }), ' ' + Chem.pretty(it.ion) + ' kept together']));
    });

    var root = h('section', { class: 'bench' + (typing ? ' typing' : '') }, [
      eq, boxes, typeRow,
      h('div', { class: 'bench-foot' }, [h('div', { class: 'btnrow' }, [checkBtn, resetBtn, showBtn, nextBtn]), key]),
      fb
    ]);
    host.appendChild(root);
    if (typing) setLocked(true);
    paint();
    if (work.r) {
      inputs.forEach(function (inp, j) { inp.value = String(want[j]); });
      paint();
      lock();
      tell('Balanced: ' + Chem.equation(rx, want) + '.' + (opts.classify ? ' ' + Chem.TYPES[rx.type].name + '.' : ''), 'good');
    } else if (work.n >= 3) showBtn.hidden = false;

    return {
      work: work, root: root, want: want,
      set: function (cs) { inputs.forEach(function (inp, j) { inp.value = String(cs[j]); }); changed(); },
      type: rx.type,
      check: check,
      destroy: function () {}
    };
  }

  /* ---- a still picture: two boxes and, if asked, the inventory between them.
     items: { l: [{ f, n }], r: [{ f, n }] }; o: { tally, h, w, eq (text above) }.
     The inventory of a still picture is always atom by atom. */
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
    return els.map(function (el) { return { el: el, key: el, label: el, left: a[el] || 0, right: b[el] || 0, ok: (a[el] || 0) === (b[el] || 0) }; });
  }
  function picture(it, o) {
    o = o || {};
    function box(title, list) {
      var b = svgBox(title);
      b.svg.setAttribute('aria-label', title + ': ' + list.map(function (x) { return x.n + ' ' + Chem.pretty(x.f); }).join(', '));
      return b;
    }
    var L = box(o.left || 'Reactants', it.l), R = box(o.right || 'Products', it.r);
    Particles.pair(L.svg, it.l, R.svg, it.r, { w: o.w || 420, h: o.h || 150, max: o.max });
    var mid;
    if (o.tally) {
      mid = h('div', { class: 'inv', role: 'table', 'aria-label': 'Inventory' }, [invHead()].concat(tallyOf(it).map(function (r) { return invRow(r, true); })));
    } else {
      mid = h('div', { class: 'boxes-arrow', 'aria-hidden': 'true', text: '→' });
    }
    var kids = [];
    if (o.eq) kids.push(h('p', { class: 'pic-eq', text: o.eq }));
    kids.push(h('div', { class: 'boxes' + (o.tally ? '' : ' plain') }, [L.el, mid, R.el]));
    var els = [];
    it.l.concat(it.r).forEach(function (x) { Object.keys(Chem.parse(x.f)).forEach(function (el) { if (els.indexOf(el) < 0) els.push(el); }); });
    kids.push(h('div', { class: 'bench-foot' }, [h('span'), Particles.key(els)]));
    return h('div', { class: 'bench still' }, kids);
  }

  return { create: create, picture: picture, items: items, tallyOf: tallyOf, rowName: rowName, BOXW: BOXW, BOXH: BOXH };
})();

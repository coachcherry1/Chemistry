/* ladder.js: one problem, worked rung by rung beside the reference.
 *
 *   Ladder.create(host, problem, work, opts) -> { work, destroy }
 *
 * Rungs (problem.rungs, from problems.js):
 *   react     reaction or no reaction: a choice, then Submit answer
 *   products  build the products from the ions: pick a positive and a negative
 *             ion for each compound and set the subscripts so the charges
 *             cancel; in a single replacement also pick the element set free
 *   states    (s), (l), (g) or (aq) for each product
 *   balance   the workbench of the balancing packages, with the inventory
 *
 * work (saved): { i: rung index, g: { rung: 1 or 0, the first answer }, n: { rung: checks }, v: { ... the
 * student's choices }, bench: { ... }, r: 1 when done }
 * opts: graded (the first answer of every rung counts: opts.onRung(rung, right, typed, wanted)), onSave, onDone,
 * next: { label, onClick }. Not an answer: a Check with something left unchosen. Show me after three misses.
 */
var Ladder = (function () {
  'use strict';
  var h = UI.h;
  var NAMES = { react: 'Will it react?', products: 'Products', states: 'States', balance: 'Balance' };
  var STATE_WORD = { s: 'solid', l: 'liquid', g: 'gas', aq: 'aqueous (dissolved)' };

  function pretty(f) { return Chem.pretty(f); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function ionEl(key, isCat) {
    var t = isCat ? Ions.CATIONS[key] : Ions.ANIONS[key];
    return Ref.ion(t[0], t[1], isCat ? '+' : '−');
  }
  function ionText(key, isCat) {
    var t = isCat ? Ions.CATIONS[key] : Ions.ANIONS[key];
    return pretty(t[0]) + (t[1] > 1 ? t[1] : '') + (isCat ? '+' : '−');
  }

  function create(host, p, work, opts) {
    opts = opts || {};
    work.i = work.i || 0; work.g = work.g || {}; work.n = work.n || {}; work.v = work.v || {};
    var ref = Ref.panel(p.kind === 'sr' ? 'series' : 'table');
    var strip = h('ol', { class: 'rungs' });
    var done = h('div', { class: 'rung-done' });
    var area = h('div', { class: 'rung-area' });
    var main = h('div', { class: 'ladder-main panel' }, [
      h('p', { class: 'prompt', text: p.prompt }),
      h('p', { class: 'given', 'aria-label': 'The reactants' }, [p.l.map(function (f) { return pretty(f) + '(' + Gen.stateOf(p, f) + ')'; }).join(' + ') + ' → ?']),
      strip, done, area
    ]);
    var root = h('div', { class: 'ladder' }, [main, ref.el]);
    host.appendChild(root);
    var bench = null;

    function save() { if (opts.onSave) opts.onSave(); }
    function fbEl() { return h('p', { class: 'fb', role: 'status', 'aria-live': 'polite' }); }
    function tell(fb, text, kind) { fb.textContent = text || ''; fb.className = 'fb' + (text ? ' show ' + (kind || '') : ''); }
    function count(rung) { work.n[rung] = (work.n[rung] || 0) + 1; return work.n[rung] === 1; }
    function first(rung, right, typed, want) {
      work.g[rung] = right ? 1 : 0;
      if (opts.graded && opts.onRung) opts.onRung(rung, right, typed, want);
    }

    function paintStrip() {
      strip.innerHTML = '';
      p.rungs.forEach(function (r, k) {
        var st = k < work.i ? (work.g[r] === 1 ? 'right' : 'fixed') : k === work.i && !work.r ? 'now' : '';
        strip.appendChild(h('li', { class: 'rung ' + st, 'aria-current': st === 'now' ? 'step' : null }, [
          h('span', { class: 'rung-n', text: String(k + 1) }), NAMES[r] + (k < work.i ? (work.g[r] === 1 ? ' ★' : ' ✓') : '')]));
      });
    }
    /* what has been settled so far, one line per finished rung */
    function paintDone() {
      done.innerHTML = '';
      var upto = work.r ? p.rungs.length : work.i;
      p.rungs.slice(0, upto).forEach(function (r) {
        var text;
        if (r === 'react') text = p.why;
        else if (r === 'products') text = 'Products: ' + p.products.map(pretty).join(' and ') + '.';
        else if (r === 'states') text = 'States: ' + p.products.map(function (f) { return pretty(f) + '(' + p.states[f] + ')'; }).join(', ') + '.';
        else text = 'Balanced: ' + Gen.equation(p, true);
        done.appendChild(h('p', { class: 'done-line', text: text }));
      });
    }
    function advance() {
      work.i++;
      if (work.i >= p.rungs.length) { work.r = 1; }
      save();
      render();
      if (work.r && opts.onDone) opts.onDone();
    }

    /* ---------------------------------------------------------------- react */
    function rungReact() {
      var isSr = p.kind === 'sr';
      var choices = isSr ? [{ t: 'A reaction happens', v: true }, { t: 'No reaction', v: false }]
                         : [{ t: 'A solid forms: there is a reaction', v: true }, { t: 'Nothing is a solid: no reaction', v: false }];
      var sel = -1, fb = fbEl();
      var q = isSr ? 'Use the ' + (p.sub === 'halogen' ? 'halogens under the activity series' : 'activity series') + '. Will ' + Ions.name(p.l[0]) + ' react?'
                   : 'Look at the states you just gave the products. Is there a reaction?';
      var nextBtn = h('button', { type: 'button', class: 'primary rung-next', hidden: true, text: 'Continue →', onclick: advance });
      var submit = h('button', { type: 'button', class: 'primary submit-answer', disabled: true, text: 'Submit answer', onclick: function () {
        if (sel < 0 || work.n.react) return;
        count('react');
        var right = choices[sel].v === p.reacts;
        first('react', right, choices[sel].t, choices[p.reacts ? 0 : 1].t);
        btns.forEach(function (b, k) {
          b.disabled = true; b.classList.remove('selected');
          if (choices[k].v === p.reacts) b.classList.add('right'); else if (k === sel) b.classList.add('wrong');
        });
        submit.parentNode.removeChild(submit);
        tell(fb, (right ? 'Right. ' : 'Not this time. ') + p.why, right ? 'good' : 'bad');
        nextBtn.hidden = false;
        if (p.rungs.length === 1 || p.rungs[p.rungs.length - 1] === 'react') nextBtn.textContent = 'Finish →';
        save();
        nextBtn.focus();
      } });
      var btns = choices.map(function (c, k) {
        return h('button', { type: 'button', class: 'choice', 'aria-pressed': 'false', text: c.t, onclick: function () {
          if (work.n.react) return;
          sel = k;
          btns.forEach(function (b, j) { b.classList.toggle('selected', j === k); b.setAttribute('aria-pressed', j === k ? 'true' : 'false'); });
          submit.disabled = false;
        } });
      });
      area.appendChild(h('div', { class: 'quiz' }, [h('p', { class: 'rung-q', text: q }), h('div', { class: 'choices' }, btns), h('div', { class: 'btnrow' }, [submit, nextBtn]), fb]));
      if (work.n.react) {           /* reloaded after answering */
        btns.forEach(function (b, k) { b.disabled = true; if (choices[k].v === p.reacts) b.classList.add('right'); });
        submit.parentNode.removeChild(submit);
        tell(fb, p.why, work.g.react ? 'good' : 'bad');
        nextBtn.hidden = false;
      }
    }

    /* ------------------------------------------------------------- products */
    /* one compound: a positive ion, a negative ion and two subscripts */
    function builder(id, pos, neg) {
      var v = work.v[id] || (work.v[id] = { c: pos.length === 1 ? pos[0] : null, a: neg.length === 1 ? neg[0] : null, x: 1, y: 1 });
      var out = h('span', { class: 'built' });
      function paint() {
        out.textContent = v.c && v.a ? pretty(Ions.written(v.c, v.a, v.x, v.y)) : '?';
        save();
      }
      function picker(list, isCat, key) {
        var btns = list.map(function (k) {
          return h('button', { type: 'button', class: 'ion-btn' + (v[key] === k ? ' selected' : ''), 'aria-pressed': v[key] === k ? 'true' : 'false',
            'aria-label': (isCat ? 'positive ion ' : 'negative ion ') + ionText(k, isCat), 'data-ion': k, onclick: function () {
              v[key] = k;
              btns.forEach(function (b) { var on = b.getAttribute('data-ion') === k; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
              paint();
            } }, [ionEl(k, isCat)]);
        });
        return h('span', { class: 'ion-pick', role: 'group', 'aria-label': isCat ? 'Positive ion' : 'Negative ion' }, btns);
      }
      function stepper(key, label) {
        var val = h('span', { class: 'sub-n', text: String(v[key]) });
        function bump(d) { v[key] = Math.max(1, Math.min(6, v[key] + d)); val.textContent = String(v[key]); paint(); }
        return h('span', { class: 'stepper sub', role: 'group', 'aria-label': label }, [
          h('button', { type: 'button', class: 'stp dec', 'aria-label': label + ': one fewer', text: '−', onclick: function () { bump(-1); } }), val,
          h('button', { type: 'button', class: 'stp inc', 'aria-label': label + ': one more', text: '+', onclick: function () { bump(1); } })]);
      }
      var el = h('div', { class: 'builder', 'data-id': id }, [
        h('div', { class: 'b-col' }, [h('span', { class: 'b-l', text: 'positive ion' }), picker(pos, true, 'c'), h('span', { class: 'b-l', text: 'how many' }), stepper('x', 'Number of positive ions')]),
        h('div', { class: 'b-col' }, [h('span', { class: 'b-l', text: 'negative ion' }), picker(neg, false, 'a'), h('span', { class: 'b-l', text: 'how many' }), stepper('y', 'Number of negative ions')]),
        h('div', { class: 'b-out' }, [h('span', { class: 'b-l', text: 'formula' }), out])
      ]);
      paint();
      return { el: el, v: v, formula: function () { return v.c && v.a ? Ions.written(v.c, v.a, v.x, v.y) : ''; } };
    }
    /* why a built compound is wrong ('' if it is one of the wanted ones) */
    function judgeCompound(v, wanted) {
      if (!v.c || !v.a) return 'empty';
      var f = Ions.written(v.c, v.a, v.x, v.y);
      if (wanted.indexOf(f) >= 0) return '';
      var right = Ions.formula(v.c, v.a);
      if (wanted.indexOf(right) >= 0) {
        var qc = Ions.CATIONS[v.c][1], qa = Ions.ANIONS[v.a][1], r = Ions.ratio(v.c, v.a);
        if (v.x * qc === v.y * qa) return 'The charges cancel in ' + pretty(f) + ', but a formula uses the lowest whole-number ratio: ' + r[0] + ' to ' + r[1] + '.';
        return 'The charges must cancel. ' + ionText(v.c, true) + ' and ' + ionText(v.a, false) + ': ' + v.x + ' × ' + qc + '+ is ' + (v.x * qc) + '+, and ' +
               v.y + ' × ' + qa + '− is ' + (v.y * qa) + '−. Do not copy the subscripts of the reactant.';
      }
      if (p.l.indexOf(right) >= 0 || p.l.indexOf(f) >= 0) {
        return p.kind === 'dr' ? 'That is one of the reactants. The positive ions trade partners: each ends up with the OTHER negative ion.'
                               : 'That is the compound you started with. The lone element takes the place of the element like it.';
      }
      return p.kind === 'dr' ? 'The positive ions trade partners: each ends up with the other negative ion.'
                             : 'The lone element takes the place of the element like it in the compound.';
    }
    function rungProducts() {
      var fb = fbEl(), builders = [], elemBtns = [], isSr = p.kind === 'sr';
      var a = Ions.parts(isSr ? p.l[1] : p.l[0]), b = isSr ? null : Ions.parts(p.l[1]);
      var kids = [];
      if (isSr) {
        var isHal = p.sub === 'halogen';
        builders.push(builder('c0', isHal ? [a.cat] : [p.el, a.cat], isHal ? [p.el, a.an] : [a.an]));
        kids.push(h('div', { class: 'prod' }, [h('h4', { text: 'The new compound' }), builders[0].el]));
        var opts4 = [];
        [p.out, p.el].forEach(function (sym) { opts4.push(sym); opts4.push(sym + '2'); });
        work.v.e = work.v.e || null;
        elemBtns = opts4.map(function (f) {
          return h('button', { type: 'button', class: 'ion-btn' + (work.v.e === f ? ' selected' : ''), 'aria-pressed': work.v.e === f ? 'true' : 'false', 'data-el': f,
            text: pretty(f), onclick: function () {
              work.v.e = f;
              elemBtns.forEach(function (x) { var on = x.getAttribute('data-el') === f; x.classList.toggle('selected', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
              save();
            } });
        });
        kids.push(h('div', { class: 'prod' }, [h('h4', { text: 'The element set free' }), h('div', { class: 'ion-pick', role: 'group', 'aria-label': 'Element set free' }, elemBtns)]));
      } else {
        builders.push(builder('c0', [a.cat, b.cat], [a.an, b.an]));
        builders.push(builder('c1', [a.cat, b.cat], [a.an, b.an]));
        kids.push(h('div', { class: 'prod' }, [h('h4', { text: 'One product' }), builders[0].el]));
        kids.push(h('div', { class: 'prod' }, [h('h4', { text: 'The other product' }), builders[1].el]));
      }
      var compounds = isSr ? [p.products[0]] : p.products;
      function typed() { return builders.map(function (x) { return x.formula() || '?'; }).concat(isSr ? [work.v.e || '?'] : []).join(' + '); }
      var showBtn = h('button', { type: 'button', class: 'ghostbtn showme', hidden: (work.n.products || 0) < 3, text: 'Show me', onclick: function () { work.s = 1; advance(); } });
      function check() {
        var msgs = builders.map(function (x) { return judgeCompound(x.v, compounds); });
        if (msgs.indexOf('empty') >= 0 || (isSr && !work.v.e)) {
          tell(fb, 'Choose ' + (isSr ? 'the ions of the new compound and the element set free' : 'a positive and a negative ion for both products') + ', then Check. (This Check was not counted.)', 'tip');
          return;
        }
        var bad = msgs.filter(Boolean)[0];
        if (!bad && !isSr && builders[0].formula() === builders[1].formula()) bad = 'Those are the same compound twice. There are two products: each positive ion with the other negative ion.';
        if (!bad && isSr && work.v.e !== p.products[1]) {
          var e = work.v.e, sym = Ions.symOf(e);
          bad = sym !== p.out ? cap(Ions.name(Ions.elementOf(p.out))) + ' is the element pushed out of the compound, so it is the one set free.'
              : /2$/.test(p.products[1]) ? cap(Ions.name(p.products[1])) + ' is one of the diatomic elements: on its own it is ' + pretty(p.products[1]) + '.'
              : 'A metal on its own is written as single atoms: ' + pretty(p.products[1]) + ', with no subscript.';
        }
        var isFirst = count('products');
        if (isFirst) first('products', !bad, typed(), p.products.join(' + '));
        if (!bad) { advance(); return; }
        tell(fb, bad, 'bad');
        if (work.n.products >= 3) showBtn.hidden = false;
        save();
      }
      var q = isSr ? 'Build the products. The new compound is made of ions, so its subscripts come from the charges.'
                   : 'Trade the partners and build both possible products. The subscripts come from the charges.';
      area.appendChild(h('div', { class: 'rung-products' }, [h('p', { class: 'rung-q', text: q }), h('div', { class: 'prods' }, kids),
        h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary rung-check', text: 'Check', onclick: check }), showBtn]), fb]));
    }

    /* --------------------------------------------------------------- states */
    function whyState(f) {
      var s = p.states[f], parts = Ions.parts(f);
      if (parts) return cap(Ions.name(f)) + ', ' + pretty(f) + ', is ' + (s === 'aq' ? 'soluble' : 'insoluble') + ' by the solubility table: (' + s + ').';
      return cap(Ions.name(f)) + ', ' + pretty(f) + ', is a ' + STATE_WORD[s] + ' at room temperature: (' + s + ').';
    }
    function rungStates() {
      var fb = fbEl();
      work.v.st = work.v.st || {};
      ref.show('table');
      var rows = p.products.map(function (f) {
        var btns = ['s', 'l', 'g', 'aq'].map(function (s) {
          return h('button', { type: 'button', class: 'state-btn' + (work.v.st[f] === s ? ' selected' : ''), 'aria-pressed': work.v.st[f] === s ? 'true' : 'false',
            'data-state': s, 'aria-label': pretty(f) + ' ' + STATE_WORD[s], text: '(' + s + ')', onclick: function () {
              work.v.st[f] = s;
              btns.forEach(function (b) { var on = b.getAttribute('data-state') === s; b.classList.toggle('selected', on); b.classList.remove('wrong'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
              save();
            } });
        });
        return { f: f, btns: btns, el: h('div', { class: 'state-row', 'data-f': f }, [h('b', { class: 'formula', text: pretty(f) }), h('span', { class: 'ion-pick', role: 'group', 'aria-label': 'State of ' + pretty(f) }, btns)]) };
      });
      var showBtn = h('button', { type: 'button', class: 'ghostbtn showme', hidden: (work.n.states || 0) < 3, text: 'Show me', onclick: function () { work.s = 1; advance(); } });
      function check() {
        if (p.products.some(function (f) { return !work.v.st[f]; })) { tell(fb, 'Give every product a state, then Check. (This Check was not counted.)', 'tip'); return; }
        var wrong = p.products.filter(function (f) { return work.v.st[f] !== p.states[f]; });
        var isFirst = count('states');
        if (isFirst) first('states', !wrong.length, p.products.map(function (f) { return f + '(' + work.v.st[f] + ')'; }).join(', '), p.products.map(function (f) { return f + '(' + p.states[f] + ')'; }).join(', '));
        if (!wrong.length) { advance(); return; }
        rows.forEach(function (r) { r.btns.forEach(function (b) { b.classList.toggle('wrong', wrong.indexOf(r.f) >= 0 && b.getAttribute('data-state') === work.v.st[r.f]); }); });
        var f = wrong[0], parts = Ions.parts(f);
        tell(fb, parts ? 'Look up ' + pretty(f) + ' in the solubility table: find ' + Ions.ANIONS[parts.an][2] + ', then see whether ' + Ions.CATIONS[parts.cat][2].replace(/\(.*/, '') + ' is an exception.'
                       : 'Think about ' + Ions.name(f) + ' on its own at room temperature: a metal is a solid, and H₂ and Cl₂ are gases, Br₂ a liquid, I₂ a solid.', 'bad');
        if (work.n.states >= 3) showBtn.hidden = false;
        save();
      }
      area.appendChild(h('div', { class: 'rung-states' }, [
        h('p', { class: 'rung-q', text: 'Give each product its state. A compound that dissolves is (aq); one that does not is a solid, (s).' }),
        h('div', { class: 'state-rows' }, rows.map(function (r) { return r.el; })),
        h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary rung-check', text: 'Check', onclick: check }), showBtn]), fb]));
    }

    /* -------------------------------------------------------------- balance */
    function rungBalance() {
      root.classList.add('wide');
      work.bench = work.bench || {};
      area.appendChild(h('p', { class: 'rung-q', text: 'Last: balance it. Change the coefficients until every row of the inventory matches. It may already be balanced.' }));
      bench = Bench.create(area, p.rx, work.bench, {
        marks: 'check', graded: opts.graded, onSave: save,
        onFirst: function (right, typed, want) { work.n.balance = 1; first('balance', right, typed, want); },
        onResolve: function () { if (!opts.graded) work.g.balance = work.bench.n === 1 ? 1 : 0; advance(); }
      });
    }

    function render() {
      area.innerHTML = '';
      root.classList.remove('wide');
      paintStrip();
      paintDone();
      if (work.r) {
        area.appendChild(h('p', { class: 'final-eq', text: Gen.equation(p, true) }));
        if (opts.next) area.appendChild(h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary ladder-next', text: opts.next.label, onclick: opts.next.onClick })]));
        return;
      }
      var r = p.rungs[work.i];
      if (r === 'react') rungReact(); else if (r === 'products') rungProducts(); else if (r === 'states') rungStates(); else rungBalance();
    }
    render();

    return { work: work, root: root, problem: p, destroy: function () {} };
  }

  return { create: create, NAMES: NAMES };
})();

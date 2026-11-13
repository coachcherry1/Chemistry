/* steps.js: the lesson steps that are not a ladder, and the screen for the
 * graded choice questions.
 *
 *   Steps.willit   eight pairs: will the lone element replace the other? (the series)
 *   Steps.plate    predict, then watch zinc in copper(II) sulfate; then copper in zinc sulfate
 *   Steps.sol      eight compounds: soluble or insoluble? (the table)
 *   Steps.mix      predict, then watch AgNO3 + NaCl; then NaCl + KNO3
 *   Steps.quiz     graded choice questions, one at a time, Submit answer
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
  function beside(main, which) { return h('div', { class: 'ladder' }, [main, Ref.panel(which).el]); }

  /* cards answered on the click, one at a time: list of { q, big, choices: [{ t, ok }], why } */
  function cards(host, st, cb, list, title, which, doneMsg) {
    st.a = st.a || [];
    var box = h('div');
    host.appendChild(beside(box, which));
    function show(i) {
      box.innerHTML = '';
      var c = list[i], last = i === list.length - 1, answered = st.a[i] != null;
      var fb = h('p', { class: 'fb' });
      var nextBtn = h('button', { type: 'button', class: 'primary', hidden: true, text: 'Next one →', onclick: function () { show(i + 1); } });
      var tiles = h('div', { class: 'tiles', role: 'group', 'aria-label': 'Your answer' }, c.choices.map(function (ch) {
        return h('button', { type: 'button', class: 'tile' + (answered && ch.ok ? ' on' : ''), disabled: answered, text: ch.t, onclick: function (ev) {
          st.a[i] = ch.ok ? 1 : 0;
          Array.prototype.forEach.call(tiles.children, function (b) { b.disabled = true; });
          ev.currentTarget.classList.add(ch.ok ? 'on' : 'wrong');
          fb.textContent = (ch.ok ? 'Right. ' : 'Not this time. ') + c.why;
          fb.className = 'fb show ' + (ch.ok ? 'good' : 'bad');
          cb.save();
          if (last) { st.r = 1; cb.complete(doneMsg); } else { nextBtn.hidden = false; nextBtn.focus(); }
        } });
      }));
      if (answered) { fb.textContent = c.why; fb.className = 'fb show good'; nextBtn.hidden = last; }
      box.appendChild(panel(title + ' ' + (i + 1) + ' of ' + list.length, 'not graded', [
        h('p', { class: 'pic-eq', text: c.big }), h('p', { class: 'prompt', text: c.q }), tiles, fb, h('div', { class: 'btnrow' }, [nextBtn])]));
    }
    var first = 0;
    while (first < list.length - 1 && st.a[first] != null) first++;
    show(first);
    return { done: !!st.r };
  }

  var WILLIT = [['Zn', 'CuSO4'], ['Cu', 'MgCl2'], ['Mg', 'HCl'], ['Ag', 'HCl'], ['Na', 'HOH'], ['Zn', 'HOH'], ['Cl2', 'NaBr'], ['I2', 'KCl']];
  function willit(host, st, cb) {
    var list = WILLIT.map(function (w) {
      var p = Gen.make(w[0], w[1]);
      return { big: Chem.pretty(w[0]) + ' + ' + Chem.pretty(w[1]) + ' → ?', q: p.prompt + ' Will there be a reaction?',
        choices: [{ t: 'A reaction happens', ok: p.reacts }, { t: 'No reaction', ok: !p.reacts }], why: p.why };
    });
    return cards(host, st, cb, list, 'Pair', 'series', 'An element only replaces one that comes AFTER it on the series. For cold water, only the metals from lithium to sodium react.');
  }

  var SOL = ['NaNO3', 'AgCl', 'BaSO4', 'K2CO3', 'CaCO3', 'Cu(OH)2', '(NH4)3PO4', 'Ba(OH)2'];
  function sol(host, st, cb) {
    var list = SOL.map(function (f) {
      var pr = Ions.parts(f), s = Ions.soluble(pr.cat, pr.an);
      var x = Ions.row(pr.an), exc = (x.soluble ? x.r.not : x.r.but).indexOf(pr.cat) >= 0;
      var always = Ions.TABLE.always.indexOf(pr.cat) >= 0;
      var why = always ? 'Compounds of ' + Ions.CATIONS[pr.cat][2] + ' are always soluble: (aq).'
        : 'The rules list ' + Ions.ANIONS[pr.an][2] + ' as ' + (x.soluble ? 'soluble' : 'insoluble') + ', and ' + Ions.CATIONS[pr.cat][2].replace(/\(.*/, '') +
          (exc ? ' IS one of its exceptions' : ' is not one of its exceptions') + ': ' + (s ? 'soluble, (aq).' : 'insoluble, a solid, (s).');
      return { big: Chem.pretty(f), q: 'Is ' + Ions.name(f) + ' soluble in water?', choices: [{ t: 'Soluble: (aq)', ok: s }, { t: 'Insoluble: (s)', ok: !s }], why: why };
    });
    return cards(host, st, cb, list, 'Compound', 'table', 'Find the negative ion in the rules first, then check whether the positive ion is one of its exceptions.');
  }

  /* predict, then two animations */
  function watch(host, st, cb, o) {
    var sceneBox = h('div');
    var fb = h('p', { class: 'fb' });
    function scenes() {
      sceneBox.innerHTML = '';
      st.seen = st.seen || {};
      var grid = h('div', { class: 'grid2' });
      o.scenes.forEach(function (sc, k) {
        var box = h('div');
        grid.appendChild(panel(sc.title, 'press Play', [h('p', { class: 'pic-eq', text: Gen.equation(sc.p, true) }), box]));
        Scene[o.kind](box, sc.p, function () {
          st.seen[k] = 1; cb.save();
          if (o.scenes.every(function (x, j) { return st.seen[j]; })) { st.r = 1; cb.complete(o.done); }
        });
      });
      sceneBox.appendChild(grid);
    }
    var tiles = h('div', { class: 'tiles', role: 'group', 'aria-label': 'Prediction' }, o.choices.map(function (c, i) {
      return h('button', { type: 'button', class: 'tile' + (st.pick === i ? (c.ok ? ' on' : ' wrong') : ''), disabled: st.pick != null, text: c.t, onclick: function (ev) {
        st.pick = i;
        Array.prototype.forEach.call(tiles.children, function (b) { b.disabled = true; });
        ev.currentTarget.classList.add(c.ok ? 'on' : 'wrong');
        fb.textContent = c.fb; fb.className = 'fb show ' + (c.ok ? 'good' : 'bad');
        cb.save();
        scenes();
      } });
    }));
    host.appendChild(panel('Predict first', 'not graded', [h('p', { class: 'prompt', text: o.q }), tiles, fb]));
    host.appendChild(sceneBox);
    if (st.pick != null) { fb.textContent = o.choices[st.pick].fb; fb.className = 'fb show ' + (o.choices[st.pick].ok ? 'good' : 'bad'); scenes(); }
    return { done: !!st.r };
  }
  function plate(host, st, cb) {
    return watch(host, st, cb, { kind: 'plate',
      q: 'A strip of zinc sits in a blue solution of copper(II) sulfate. Zinc is above copper in the activity series. What will you see at the particle level?',
      choices: [
        { t: 'Copper ions become copper atoms on the strip; zinc atoms leave as ions', ok: 1, fb: 'Yes. Zinc takes copper\'s place in the compound, so copper is set free as the metal.' },
        { t: 'Nothing: a solid metal cannot react with a solution', fb: 'It can. Zinc is above copper, so zinc atoms go into solution as ions and copper ions come out as copper metal.' },
        { t: 'Sulfate ions stick to the zinc strip', fb: 'The sulfate ions do nothing here. Zinc is above copper, so zinc replaces the copper: copper metal forms on the strip.' }],
      scenes: [{ title: 'Zinc in copper(II) sulfate', p: Gen.make('Zn', 'CuSO4') }, { title: 'Copper in zinc sulfate', p: Gen.make('Cu', 'ZnSO4') }],
      done: 'It only goes one way: the more active metal ends up in the compound, the less active one as the metal.' });
  }
  function mix(host, st, cb) {
    return watch(host, st, cb, { kind: 'mix',
      q: 'Solutions of silver nitrate and sodium chloride are mixed. The positive ions trade partners. Which two ions come together as a solid? (Use the solubility rules.)',
      choices: [
        { t: 'Ag⁺ and Cl⁻', ok: 1, fb: 'Yes. Silver chloride is insoluble (chloride is soluble except with Ag⁺ and Pb²⁺), so it forms as a solid.' },
        { t: 'Na⁺ and NO₃⁻', fb: 'Sodium compounds and nitrates are always soluble, so those two stay dissolved. Silver chloride, AgCl, is the insoluble one.' },
        { t: 'Ag⁺ and Na⁺', fb: 'Two positive ions repel each other. A compound needs a positive and a negative ion: Ag⁺ with Cl⁻ makes insoluble AgCl.' }],
      scenes: [{ title: 'Silver nitrate + sodium chloride', p: Gen.make('AgNO3', 'NaCl') }, { title: 'Sodium chloride + potassium nitrate', p: Gen.make('NaCl', 'KNO3') }],
      done: 'A double replacement only happens if a product leaves the solution. Here that means a solid. No solid: no reaction.' });
  }

  /* ------------------------------------------------------------------- quiz */
  /* st.a: [{ p: index picked, ok: 1 or 0 }]. Clicking a choice only selects it; Submit answer grades it, once. */
  function quiz(host, questions, st, cb) {
    st.a = st.a || [];
    var box = h('div', { class: 'quiz' });
    host.appendChild(beside(box, 'series'));
    function show(i) {
      box.innerHTML = '';
      var q = questions[i], done = st.a[i], sel = done ? done.p : -1, last = i === questions.length - 1;
      var fb = h('p', { class: 'fb', role: 'status' });
      var nextBtn = h('button', { type: 'button', class: 'primary quiz-next', hidden: true, text: last ? 'On to the problems →' : 'Next question →', onclick: function () {
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
          b.disabled = true; b.classList.remove('selected');
          if (j === q.right) b.classList.add('right'); else if (j === a.p) b.classList.add('wrong');
        });
        if (submit.parentNode) submit.parentNode.removeChild(submit);
        fb.textContent = (a.ok ? 'Right. ' : 'Not this time. ') + q.why;
        fb.className = 'fb show ' + (a.ok ? 'good' : 'bad');
        nextBtn.hidden = false;
      }
      box.appendChild(panel('Question ' + (i + 1) + ' of ' + questions.length, 'graded: your first Submit counts', [
        h('p', { class: 'prompt', text: q.stem }),
        h('div', { class: 'choices', role: 'group', 'aria-label': 'Choices' }, buttons),
        h('div', { class: 'btnrow' }, [submit, nextBtn]), fb]));
      if (done) mark();
    }
    var at = 0;
    while (at < questions.length - 1 && st.a[at]) at++;
    show(at);
    return { show: show };
  }

  return { willit: willit, sol: sol, plate: plate, mix: mix, quiz: quiz, WILLIT: WILLIT, SOL: SOL };
})();

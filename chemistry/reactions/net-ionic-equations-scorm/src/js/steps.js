/* steps.js: the lesson steps that are not a ladder, and the screen for the
 * graded choice questions.
 *
 *   Steps.aq       three cards: which picture shows this substance? (words to picture)
 *   Steps.split    write a substance as its ions, reading the picture (picture to
 *                  words); the first is a worked example, the pictures fade to after
 *                  the answer for the last four
 *   Steps.watch    predict, then pour two solutions together (a solid, water, or nothing)
 *   Steps.quiz     graded choice questions, one at a time, Submit answer
 *
 * Each lesson step takes (host, st, cb): st is this step's saved state; cb.save(),
 * cb.complete(msg), cb.say(msg, kind). None of the lesson steps is graded.
 */
var Steps = (function () {
  'use strict';
  var h = UI.h;
  var pretty = Net.pretty;

  function panel(title, hint, kids, cls) {
    return h('section', { class: 'panel' + (cls ? ' ' + cls : '') }, [
      h('div', { class: 'panel-head' }, [h('h3', { text: title }), hint ? h('span', { class: 'hint', text: hint }) : null])
    ].concat(kids || []));
  }
  function beside(main, which) { return h('div', { class: 'ladder' }, [main, Ref.panel(which).el]); }
  var LETTERS = ['A', 'B', 'C', 'D'];

  /* a choice button holding a picture and a letter */
  function picChoice(pic, k, label) {
    return [h('span', { class: 'pic-letter', text: LETTERS[k] }), Beaker.picture(pic), h('span', { class: 'sr-only', text: label })];
  }

  /* ------------------------------------------------------------ aq: pictures */
  function aqCards() {
    return Gen.LESSON.aq.map(function (f) {
      var st = Net.state(f), n = 2;
      var ions = Net.solution(f, n), pr = Net.partsOf(f);
      var free = { t: 'the ions apart', pic: { free: ions } };
      var same = { t: 'the ions apart, one of each', pic: { free: ions.map(function (t) { return { key: t.key, q: t.q, n: n }; }) } };
      var joined = { t: 'the ions still joined', pic: { units: { f: f, n: n } } };
      var solid = { t: 'a solid on the bottom', pic: { solid: { f: f, n: n } } };
      var c1 = Net.ionText(pr.cat, Net.charge(pr.cat, true)), a1 = Net.ionText(pr.an, Net.charge(pr.an, false));
      var r1 = Ions.ratio(pr.cat, pr.an);
      if (st === 'aq') {
        return { q: 'Which picture shows ' + n + ' ' + pretty(f) + '(aq), ' + Net.name(f) + ' dissolved in water?', big: n + ' ' + pretty(f) + '(aq)',
          choices: [free, same, joined, solid], right: 0,
          why: ['Yes. Dissolved, (aq), means the ions have come apart and move about on their own. Each ' + pretty(f) + ' gives ' + r1[0] + ' ' + c1 + ' and ' + r1[1] + ' ' + a1 + ', so ' + n + ' of them give ' + ions[0].n + ' and ' + ions[1].n + '.',
            'The ions are apart, but count them: each ' + pretty(f) + ' gives ' + r1[0] + ' ' + c1 + ' and ' + r1[1] + ' ' + a1 + '. The formula sets the ratio.',
            'In water the ions of a soluble compound come apart. Joined ions are not dissolved.',
            'A solid on the bottom would be written (s). (aq) means dissolved: the ions apart, moving about.'] };
      }
      return { q: 'Which picture shows ' + pretty(f) + '(s), solid ' + Net.name(f) + ', in water?', big: pretty(f) + '(s)',
        choices: [solid, free, joined], right: 0,
        why: ['Yes. ' + pretty(f) + ' is insoluble: its ions stay locked together as a solid and sink to the bottom. In an equation it stays together: ' + pretty(f) + '(s).',
          'That would be (aq), dissolved. ' + pretty(f) + ' does not dissolve: its ions stay together as a solid on the bottom.',
          'A solid is a crystal of many ions locked together, and it sinks. Single pairs floating about are not how a solid looks.'] };
    });
  }
  function aq(host, st, cb) {
    var list = aqCards();
    st.a = st.a || [];
    /* the card names the state, so no table is needed here: the pictures get the whole width */
    var box = h('div', { class: 'aq-cards' });
    host.appendChild(box);
    function show(i) {
      box.innerHTML = '';
      var c = list[i], last = i === list.length - 1, answered = st.a[i] != null;
      var fb = h('p', { class: 'fb' });
      var nextBtn = h('button', { type: 'button', class: 'primary card-next', hidden: true, text: 'Next one →', onclick: function () { show(i + 1); } });
      var order = UI.shuffle(c.choices.map(function (x, k) { return k; }), UI.rng(UI.hash(c.big)));
      var btns = order.map(function (k, pos) {
        return h('button', { type: 'button', class: 'choice pic-choice' + (answered && k === c.right ? ' right' : ''), disabled: answered, 'aria-label': 'Picture ' + LETTERS[pos] + ': ' + c.choices[k].t, onclick: function (ev) {
          st.a[i] = k === c.right ? 1 : 0;
          btns.forEach(function (b) { b.disabled = true; });
          ev.currentTarget.classList.add(k === c.right ? 'right' : 'wrong');
          fb.textContent = (k === c.right ? '' : 'Not this one. ') + c.why[k];
          fb.className = 'fb show ' + (k === c.right ? 'good' : 'bad');
          cb.save();
          if (last) { st.r = 1; cb.complete('A dissolved compound is its ions, apart, in the ratio of the formula. A solid stays together.'); } else { nextBtn.hidden = false; nextBtn.focus(); }
        } }, picChoice(c.choices[k].pic, pos, c.choices[k].t));
      });
      if (answered) { fb.textContent = c.why[c.right]; fb.className = 'fb show good'; nextBtn.hidden = last; }
      box.appendChild(panel('Picture ' + (i + 1) + ' of ' + list.length, 'not graded', [
        h('p', { class: 'prompt', text: c.q + ' (Water molecules are not drawn.)' }),
        h('div', { class: 'pic-choices n' + btns.length }, btns), fb, h('div', { class: 'btnrow' }, [nextBtn])]));
    }
    var at = 0;
    while (at < list.length - 1 && st.a[at] != null) at++;
    show(at);
    return { done: !!st.r };
  }

  /* --------------------------------------------------------- split: the ions */
  /* Splits into ions or stays together? The substance is then written that way, and drawn in water
     (words to picture). The first card is a worked example. */
  function split(host, st, cb) {
    var list = Gen.LESSON.split;
    st.v = st.v || list.map(function () { return {}; });
    st.ok = st.ok || [];
    var box = h('div');
    host.appendChild(beside(box, 'table'));
    function show(i) {
      box.innerHTML = '';
      var f = list[i][0], c = list[i][1], s = Net.state(f), last = i === list.length - 1, worked = i === 0;
      var fb = h('p', { class: 'fb' });
      var v = st.v[i];
      var row = Ladder.splitRow(f, c, s, v, cb.save);
      if (worked && !st.ok[0]) { row.solve(); st.ok[0] = 1; cb.save(); }
      var pic = s === 'aq' ? { free: Net.solution(f, c) } : f === 'H2O' ? { free: [{ key: 'HOH', q: 0, n: c + 1 }] } : { solid: { f: f, n: c * 3 } };
      var picBox = h('div', { class: 'split-pic' });
      function showPic() { if (!picBox.firstChild) picBox.appendChild(Beaker.picture(pic)); }
      if (st.ok[i]) showPic();
      function said() {
        return s === 'aq' ? (c > 1 ? c + ' ' : '') + pretty(f) + '(aq) is ' + Net.sideText(Net.split(f, c, 'aq')) + ': the ions are apart in the water.'
          : f === 'H2O' ? 'HOH is water, a covalent molecule: it stays together as molecules.'
          : pretty(f) + '(s) is a solid: its ions stay locked together on the bottom.';
      }
      var nextBtn = h('button', { type: 'button', class: 'primary card-next', hidden: !st.ok[i] || last, text: 'Next one →', onclick: function () { show(i + 1); } });
      var check = h('button', { type: 'button', class: 'primary rung-check', hidden: !!st.ok[i], text: 'Check', onclick: function () {
        var bad = Ladder.judgeSplit(f, c, s, v);
        if (bad === 'empty') { fb.textContent = 'Choose splits into ions or stays together, then Check.'; fb.className = 'fb show tip'; return; }
        if (bad) { fb.textContent = bad; fb.className = 'fb show bad'; row.el.classList.add('wrong'); return; }
        st.ok[i] = 1; cb.save();
        fb.textContent = 'Right. ' + said();
        fb.className = 'fb show good';
        check.hidden = true; showPic();
        if (last) { st.r = 1; cb.complete('Dissolved compounds of ions and the strong acids and bases split into ions; solids and water stay together.'); } else { nextBtn.hidden = false; nextBtn.focus(); }
      } });
      var kids = [h('p', { class: 'prompt', text: worked ? 'A worked example: ' + pretty(f) + '(aq) is dissolved, so it splits into its ions, 2 Na⁺ and 1 SO₄²⁻. The sulfate ion stays in one piece. Count them in the picture.'
        : 'Does it split into ions in water, or stay together? Then see it in the water.' }),
        h('div', { class: 'split-work' }, [h('div', null, [row.el, h('div', { class: 'btnrow' }, [check, nextBtn]), fb]), picBox])];
      if (worked) { fb.textContent = said() + ' Press Next one to try it yourself.'; fb.className = 'fb show tip'; nextBtn.hidden = false; check.hidden = true; }
      box.appendChild(panel('Substance ' + (i + 1) + ' of ' + list.length, worked ? 'worked example' : 'not graded', kids));
    }
    var at = 0;
    while (at < list.length - 1 && st.ok[at]) at++;
    show(at);
    return { done: !!st.r };
  }

  /* ------------------------------------------------- watch: predict, then pour */
  var WATCH = {
    solid: { l: Gen.LESSON.solid, title: 'Silver nitrate + sodium chloride',
      q: 'Silver nitrate solution is poured into sodium chloride solution. AgCl is insoluble. After mixing, which ions will still be moving about on their own?',
      choices: [
        { t: 'Na⁺ and NO₃⁻', ok: 1, fb: 'Yes. Ag⁺ and Cl⁻ come together as solid AgCl and sink. Na⁺ and NO₃⁻ do nothing: they are the spectators.' },
        { t: 'Ag⁺ and Cl⁻', fb: 'Those two make AgCl, which is insoluble: they come together as a solid. It is Na⁺ and NO₃⁻ that keep moving.' },
        { t: 'All four ions', fb: 'If all four kept moving there would be no reaction. AgCl is insoluble, so Ag⁺ and Cl⁻ leave the solution as a solid.' },
        { t: 'None of them', fb: 'NaNO₃ is soluble (nitrates always are), so Na⁺ and NO₃⁻ stay in the solution.' }],
      done: 'The spectators are in the solution before and after. The net ionic equation is what is left: Ag⁺(aq) + Cl⁻(aq) → AgCl(s).' },
    water: { l: Gen.LESSON.water, title: 'Hydrochloric acid + sodium hydroxide',
      q: 'Hydrochloric acid, HCl (H⁺ and Cl⁻), is poured into sodium hydroxide, NaOH (Na⁺ and OH⁻). What do H⁺ and OH⁻ become?',
      choices: [
        { t: 'Water, HOH', ok: 1, fb: 'Yes. A hydrogen ion and a hydroxide ion make HOH, water: H⁺(aq) + OH⁻(aq) → HOH(l).' },
        { t: 'A solid that sinks', fb: 'NaCl is soluble, so no solid forms. H⁺ and OH⁻ become water, HOH.' },
        { t: 'Nothing: they stay ions', fb: 'H⁺ and OH⁻ do not stay apart: they make water, HOH, a liquid.' }],
      done: 'Every strong acid with every strong base: H⁺(aq) + OH⁻(aq) → HOH(l). Na⁺ and Cl⁻ are spectators.' },
    none: { l: Gen.LESSON.none, title: 'Potassium chloride + sodium nitrate',
      q: 'Potassium chloride solution is poured into sodium nitrate solution. Trading partners would make NaCl and KNO₃. What will you see?',
      choices: [
        { t: 'Nothing happens: all four ions keep moving', ok: 1, fb: 'Yes. NaCl and KNO₃ are both soluble, so nothing leaves the solution. Every ion is a spectator: no reaction.' },
        { t: 'Solid NaCl forms', fb: 'Sodium compounds are always soluble. NaCl stays dissolved, as Na⁺ and Cl⁻.' },
        { t: 'Water forms', fb: 'Water needs H⁺ and OH⁻, and there are none here. Nothing happens.' }],
      done: 'If no solid and no water form, every ion is a spectator. Everything cancels: no reaction.' }
  };
  /* the beaker first (the first solution already moving); Pour opens once the prediction is made */
  function watch(kind) {
    return function (host, st, cb) {
      var o = WATCH[kind], p = Net.make(o.l[0], o.l[1]);
      var fb = h('p', { class: 'fb' });
      var box = h('div');
      var left = panel(o.title, 'predict, then Pour', [h('p', { class: 'pic-eq', text: Net.molecularText(p) }), box]);
      var tiles = h('div', { class: 'tiles stack', role: 'group', 'aria-label': 'Prediction' }, o.choices.map(function (c, i) {
        return h('button', { type: 'button', class: 'tile' + (st.pick === i ? (c.ok ? ' on' : ' wrong') : ''), disabled: st.pick != null, text: c.t, onclick: function (ev) {
          st.pick = i;
          Array.prototype.forEach.call(tiles.children, function (b) { b.disabled = true; });
          ev.currentTarget.classList.add(c.ok ? 'on' : 'wrong');
          fb.textContent = c.fb; fb.className = 'fb show ' + (c.ok ? 'good' : 'bad');
          cb.save();
          player.unlock();
        } });
      }));
      var side = h('div', { class: 'side-col' }, [panel('Predict first', 'not graded', [h('p', { class: 'prompt small', text: o.q }), tiles, fb]), Ref.panel(kind === 'water' ? 'strong' : 'table').el]);
      host.appendChild(h('div', { class: 'ladder watch' }, [left, side]));
      var player = Beaker.show(box, p, { highlight: true, locked: st.pick == null, onDone: function () { st.seen = 1; st.r = 1; cb.save(); cb.complete(o.done); } });
      if (st.pick != null) { fb.textContent = o.choices[st.pick].fb; fb.className = 'fb show ' + (o.choices[st.pick].ok ? 'good' : 'bad'); }
      return { done: !!st.r };
    };
  }

  /* ------------------------------------------------------------------- quiz */
  /* st.a: [{ p: index picked, ok: 1 or 0 }]. Clicking a choice only selects it; Submit answer grades it, once. */
  function quiz(host, questions, st, cb) {
    st.a = st.a || [];
    var box = h('div', { class: 'quiz' });
    host.appendChild(beside(box, 'table'));
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
      var pics = q.pics && q.pics.some(Boolean);
      var buttons = q.choices.map(function (text, k) {
        return h('button', { type: 'button', class: 'choice' + (pics ? ' pic-choice' : ''), 'aria-pressed': 'false', 'aria-label': pics ? 'Picture ' + LETTERS[k] + ': ' + text : null,
          text: pics ? null : text, onclick: function () {
            if (st.a[i]) return;
            sel = k;
            buttons.forEach(function (b, j) { b.classList.toggle('selected', j === k); b.setAttribute('aria-pressed', j === k ? 'true' : 'false'); });
            submit.disabled = false;
          } }, pics ? picChoice(q.pics[k], k, text) : null);
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
      var stemPic = q.pic ? h('div', { class: 'q-pic' }, [Beaker.picture(q.pic)]) : null;
      box.appendChild(panel('Question ' + (i + 1) + ' of ' + questions.length, 'graded: your first Submit counts', [
        h('p', { class: 'prompt', text: q.stem }), stemPic,
        h('div', { class: pics ? 'pic-choices n' + buttons.length : 'choices', role: 'group', 'aria-label': 'Choices' }, buttons),
        h('div', { class: 'btnrow' }, [submit, nextBtn]), fb]));
      if (done) mark();
    }
    var at = 0;
    while (at < questions.length - 1 && st.a[at]) at++;
    show(at);
    return { show: show };
  }

  return { aq: aq, split: split, watchSolid: watch('solid'), watchWater: watch('water'), watchNone: watch('none'), quiz: quiz, WATCH: WATCH, aqCards: aqCards };
})();

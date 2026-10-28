/* game.js — items, steps, feedback and progression.
 *
 * Every item is a short list of steps. Naming a compound in Level 2 runs the
 * conditional out loud:
 *   1. Is the positive ion a transition metal?          (the IF)
 *   2. how many of the polyatomic ion?                  (only when in parentheses)
 *   3. YES branch: total negative charge, then charge on each metal
 *   4. build the name from tiles, Roman numeral row included - "none" is a
 *      choice the student has to make, not a default
 * Writing a formula in Level 2 runs: cation charge, anion charge, build the
 * formula with counts and a parentheses switch per ion. Names and formulas
 * are interleaved. Level 3 is the same mix, typed, with no scaffolds.
 *
 * Build and typed answers go through Chem.checkName / Chem.checkFormula, so a
 * mistake made with tiles gets the same explanation as the same mistake typed.
 */

var Game = (function () {
  'use strict';

  var LEVELS = Plan.LEVELS;
  var U = Chem.uni, R = Chem.ROMAN;

  /* Bump whenever the level list, the draw or the item codes change. A save
     written by an older build is then discarded rather than resumed. */
  var SCHEMA = 2;

  /* A build or typed step shows the answer after this many wrong tries, so
     nobody is stuck on one compound for the rest of the period. */
  var REVEAL_AFTER = 3;

  /* Most follow-up questions a level will add after missed checks. */
  var MAX_FOLLOWUPS = 4;

  var el = {};
  var state = null;
  var item = null;
  var focusKey = null;

  /* ---------------------------------------------------------------- helpers */

  function $(id) { return document.getElementById(id); }

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function button(cls, text, data) {
    var b = make('button', cls, text);
    b.type = 'button';
    Object.keys(data || {}).forEach(function (k) { b.dataset[k] = String(data[k]); });
    return b;
  }

  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function flagsOf(raw) { return /^[!+]*/.exec(raw)[0]; }

  function say(text, kind) {
    el.feedback.className = 'feedback ' + (kind || '');
    el.feedback.textContent = text || '';
  }

  /* --------------------------------------------------------------- the run */

  function newRun() {
    var seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    return {
      seed: seed, unlocked: 1, level: 1, index: 0, plan: Plan.newPlan(seed),
      stats: { items: 0, clean: 0, checks: 0, checksRight: 0 }
    };
  }

  /* A finished item saves the NEXT index, so closing the window before
     pressing Next does not repeat it on return. */
  function persist() {
    if (state.preview) return;
    SCORM.saveState({
      v: SCHEMA, s: state.seed, u: state.unlocked, l: state.level,
      i: state.index + (item && item.done ? 1 : 0),
      p: state.plan, st: state.stats
    });
  }

  function restore(saved) {
    if (!saved || saved.v !== SCHEMA || !saved.p) return null;
    var ok = LEVELS.every(function (L) {
      var list = saved.p[L.n];
      return list && list.length && list.every(Plan.valid);
    });
    if (!ok) return null;
    return {
      seed: saved.s, unlocked: saved.u || 1, level: saved.l || 1, index: saved.i || 0,
      plan: saved.p,
      stats: saved.st || { items: 0, clean: 0, checks: 0, checksRight: 0 }
    };
  }

  /* ------------------------------------------------------------ step makers */

  function choice(q, right, wrongs, rand, extra) {
    var seen = {};
    var options = [{ label: right, correct: true }].concat(wrongs).filter(function (o) {
      if (seen[o.label]) return false;
      seen[o.label] = true;
      return true;
    });
    if (!(extra && extra.keepOrder)) options = Plan.shuffle(options, rand);
    var s = { type: 'choice', q: q, options: options };
    Object.keys(extra || {}).forEach(function (k) { s[k] = extra[k]; });
    return s;
  }

  function chargeChoice(q, right, sign, values, why, extra) {
    var wrongs = values.filter(function (v) { return v !== right; }).sort(function (a, b) { return a - b; })
      .map(function (v) { return { label: v + sign, why: why }; });
    var all = [{ label: right + sign, correct: true }].concat(wrongs)
      .sort(function (a, b) { return parseInt(a.label, 10) - parseInt(b.label, 10); });
    var s = { type: 'choice', q: q, options: all, rightMsg: why };
    Object.keys(extra || {}).forEach(function (k) { s[k] = extra[k]; });
    return s;
  }

  function tmWhy(c) {
    var ions = c.charges.map(function (q) { return Chem.catIon(c, q); });
    if (c.tm && c.notD) {
      return c.t + ' is not in the d-block, but in this class it counts as a transition metal: it can be ' +
             ions.join(' or ') + ', so its name needs a Roman numeral.';
    }
    if (c.tm && ions.length > 1) {
      return c.t + ' is a transition metal — it can be ' + ions.join(' or ') +
             ', so its name needs a Roman numeral.';
    }
    if (c.tm) {
      return c.t + ' is a transition metal, so its name always carries a Roman numeral. ' +
             'Here it is always ' + ions[0] + ': mercury(II).';
    }
    if (c.poly) return c.why;
    if (c.dblock) {
      return c.t + ' sits in the d-block, but it is not a transition metal in this class: it only ' +
             'ever forms ' + ions[0] + ', so no Roman numeral.';
    }
    return c.t + ' is in Group ' + c.group + ', not a transition metal. ' + c.why + ' No Roman numeral.';
  }

  function tmStep(c, label) {
    var why = tmWhy(c);
    return {
      type: 'choice', node: 'tm', q: 'Is ' + label + ' a transition metal?', rightMsg: why,
      options: [
        { label: 'Yes — its name needs a Roman numeral', correct: !!c.tm, why: why },
        { label: 'No — it has only one charge', correct: !c.tm, why: why }
      ],
      onRight: function (it) { it.path = c.tm ? 'yes' : 'no'; }
    };
  }

  function groupWhy(a) {
    return a.t + ' is in Group ' + a.group + ': it gains ' + a.charge + ' electron' +
           (a.charge > 1 ? 's' : '') + ' to form ' + Chem.anIon(a) + '.';
  }

  function nameOptionsFor(list, right, need, rand, pool) {
    var seen = {}, out = [];
    [right].concat(list).forEach(function (x) { if (x && !seen[x]) { seen[x] = true; out.push(x); } });
    Plan.shuffle(pool, rand).forEach(function (x) {
      if (out.length < need && !seen[x]) { seen[x] = true; out.push(x); }
    });
    return Plan.shuffle(out.slice(0, need), rand);
  }

  /* ------------------------------------------------------------ item kinds */

  function buildMetal(it, sym) {
    var c = Chem.CAT[sym];
    it.kicker = 'Transition metal or not?';
    it.prompt = sym;
    it.promptClass = 'symbol';
    it.highlight = sym;

    var wrongNames = c.near.map(function (t) { return Chem.CAT[t]; }).filter(Boolean).map(function (x) {
      return { label: x.name, why: Chem.cap(x.name) + ' is ' + x.t + '. Which name goes with ' + sym + '?' };
    });
    it.steps.push(choice('What is the name of ' + sym + '?', c.name, wrongNames, it.rand));
    it.steps.push(tmStep(c, sym));
    if (!c.tm) {
      it.steps.push(chargeChoice('What charge does ' + c.name + ' always form?', c.charges[0], '+',
                                 [1, 2, 3], tmWhy(c)));
    }
  }

  function buildNonmetal(it, sym) {
    var a = Chem.AN[sym];
    it.kicker = 'Nonmetal ions';
    it.prompt = sym;
    it.promptClass = 'symbol';
    it.highlight = sym;

    var others = Plan.shuffle(DATA.ANIONS.filter(function (x) { return x.el && x !== a; }), it.rand).slice(0, 2);
    it.steps.push(choice('What is the name of ' + sym + '?', a.el, others.map(function (x) {
      return { label: x.el, why: Chem.cap(x.el) + ' is ' + x.t + '.' };
    }), it.rand));

    var why = groupWhy(a);
    var ionWrongs = [1, 2, 3].filter(function (k) { return k !== a.charge; }).map(function (k) {
      return { label: U(sym) + Chem.sup(k, '⁻'), why: why };
    }).concat([{ label: U(sym) + Chem.sup(a.charge, '⁺'),
                 why: 'Nonmetals gain electrons, so their ions are negative. ' + why }]);
    it.steps.push(choice('Which ion does ' + a.el + ' form?', Chem.anIon(a), ionWrongs, it.rand,
                         { rightMsg: why }));

    var nameWrongs = [{ label: a.el, why: Chem.cap(a.el) + ' is the element. Its ion takes the -ide ending: ' + a.name + '.' }]
      .concat(a.near.map(function (t) {
        var y = Chem.AN[t];
        return { label: y.name, why: Chem.cap(y.name) + ' is ' + Chem.anIon(y) +
                 (y.poly ? ' — a polyatomic ion.' : '.') };
      }));
    it.steps.push(choice('What is the ' + Chem.anIon(a) + ' ion called?', a.name, nameWrongs, it.rand,
                         { rightMsg: 'One-element negative ions end in -ide: ' + a.el + ' → ' + a.name + '.' }));
  }

  function countStep(text, count, F) {
    var why = 'The ' + count + ' after the parentheses multiplies everything inside them: ' +
              count + ' ' + U(text) + ' ions.';
    var values = [1, 2, 3, 4];
    if (values.indexOf(count) < 0) values.push(count);
    var s = chargeChoice('How many ' + U(text) + ' ions are in ' + F + '?', count, '', values, why);
    s.options.forEach(function (o) { if (!o.correct) o.why = 'Look at the number right after the closing parenthesis.'; });
    s.node = 'charge';
    return s;
  }

  function buildNameItem(it, cpd) {
    var c = cpd.c, a = cpd.a, L = it.level;
    var F = U(Chem.formula(cpd));
    it.cpd = cpd;
    it.flow = 'name';
    it.prompt = F;
    it.promptClass = 'formula';

    if (L >= 3) {
      it.kicker = 'Type the name';
      it.steps.push({ type: 'typeName', q: 'Type the name of this compound.' });
      return;
    }
    it.kicker = 'Name this compound';
    it.steps.push(tmStep(c, c.poly ? Chem.catIon(c, 1) : c.t));

    if (c.poly && cpd.m > 1) it.steps.push(countStep(c.t, cpd.m, F));
    if (a.poly && cpd.n > 1) it.steps.push(countStep(a.t, cpd.n, F));

    if (c.tm) {
      var tot = cpd.n * a.charge;
      var whyTot = 'Each ' + U(a.t) + ' is ' + a.charge + '−' +
                   (a.group ? ' (Group ' + a.group + ')' : '') +
                   (cpd.n > 1 ? ', and there are ' + cpd.n + ': ' + cpd.n + ' × ' + a.charge + '− = ' + tot + '−.' : '.');
      var totVals = [tot, a.charge, cpd.n, tot + 1, tot > 1 ? tot - 1 : tot + 2, tot + 2]
        .filter(function (v, i, arr) { return v > 0 && arr.indexOf(v) === i; }).slice(0, 4);
      var sTot = chargeChoice('What is the total negative charge from ' +
                              (cpd.n > 1 ? 'the ' + cpd.n + ' ' + U(a.t) + ' ions' : 'the ' + U(a.t) + ' ion') + '?',
                              tot, '−', totVals, whyTot);
      sTot.node = 'charge';
      it.steps.push(sTot);

      var whyQ = tot + '− ÷ ' + cpd.m + ' ' + c.t + ' = ' + cpd.q + '+ each. That is the Roman numeral: (' +
                 R[cpd.q] + ').';
      var qVals = [1, 2, 3, 4];
      if (tot > 4) qVals.push(tot);
      var sQ = chargeChoice('That ' + tot + '− is balanced by ' +
                            (cpd.m > 1 ? cpd.m + ' ' + c.t + ' ions' : 'one ' + c.t + ' ion') +
                            '. What is the charge on ' + (cpd.m > 1 ? 'each ' : 'the ') + c.t + '?',
                            cpd.q, '+', qVals, whyQ);
      sQ.node = 'charge';
      it.steps.push(sQ);
    }

    var catNames = nameOptionsFor(
      c.near.map(function (t) { return Chem.CAT[t] && Chem.CAT[t].name; }).concat(c.traps || []),
      c.name, 3, it.rand, DATA.CATIONS.map(function (x) { return x.name; }));
    var anNames = nameOptionsFor(
      (a.el ? [a.el] : []).concat(a.near.map(function (t) { return Chem.AN[t].name; })),
      a.name, 4, it.rand, DATA.ANIONS.map(function (x) { return x.name; }));
    it.steps.push({
      type: 'buildName', q: 'Build the name.',
      rows: { cat: catNames, num: ['none', 'I', 'II', 'III', 'IV'], an: anNames },
      sel: { cat: null, num: null, an: null }, tries: 0
    });
  }

  function buildFormulaItem(it, cpd) {
    var c = cpd.c, a = cpd.a, L = it.level;
    it.cpd = cpd;
    it.flow = 'formula';
    it.prompt = Chem.name(cpd);
    it.promptClass = 'name';

    if (L >= 3) {
      it.kicker = 'Type the formula';
      it.steps.push({ type: 'typeFormula', q: 'Type the formula for this compound.' });
      return;
    }
    it.kicker = 'Write the formula';

    var whyC = c.tm
      ? 'The Roman numeral (' + R[cpd.q] + ') is the charge: ' + Chem.catIon(c, cpd.q) + '.'
      : c.why;
    var s1 = chargeChoice('What is the charge on the ' + c.name + ' ion?', cpd.q, '+', [1, 2, 3, 4], whyC);
    s1.node = 'fcat';
    it.steps.push(s1);

    var whyA = a.poly
      ? Chem.cap(a.name) + ' is ' + Chem.anIon(a) + ' — from your polyatomic ion list.'
      : a.t + ' is in Group ' + a.group + ', so ' + a.name + ' is ' + Chem.anIon(a) + '.';
    var s2 = chargeChoice('What is the charge on the ' + a.name + ' ion?', a.charge, '−', [1, 2, 3], whyA);
    s2.node = 'fan';
    it.steps.push(s2);

    var cats = nameOptionsFor(c.near, c.t, 3, it.rand, DATA.CATIONS.map(function (x) { return x.t; }));
    var ans = nameOptionsFor(a.near, a.t, 4, it.rand, DATA.ANIONS.map(function (x) { return x.t; }));
    it.steps.push({
      type: 'buildFormula',
      q: 'Build the formula: choose the ions, set how many of each, and add parentheses only where they are needed.',
      rows: { cat: cats, an: ans },
      sel: { cat: null, an: null, cn: 1, ann: 1, cp: false, ap: false }, tries: 0
    });
  }

  function buildCheck(it, code) {
    var q = CFU.build(code);
    it.isCheck = true;
    it.tag = q.tag;
    it.kicker = it.checkpoint ? 'Checkpoint' : it.followup ? 'Check for understanding — another try'
                                                          : 'Check for understanding';
    var right = q.a[0];
    it.steps.push({
      type: 'check', q: q.q, why: q.why, right: right,
      options: Plan.shuffle(q.a, it.rand).map(function (label) { return { label: label, correct: label === right }; })
    });
  }

  function buildItem() {
    var raw = state.plan[state.level][state.index];
    var flags = flagsOf(raw);
    var code = Plan.strip(raw);
    var it = {
      raw: raw, code: code, level: state.level,
      checkpoint: flags.indexOf('!') >= 0, followup: flags.indexOf('+') >= 0,
      rand: Plan.rng((hash(code) ^ state.seed) >>> 0),
      steps: [], stepIdx: 0, clean: true, done: false, path: null
    };
    var p = code.split(':');
    if (p[0] === 'm') buildMetal(it, p[1]);
    else if (p[0] === 'a') buildNonmetal(it, p[1]);
    else if (p[0] === 'n') buildNameItem(it, Chem.fromCode(p[1]));
    else if (p[0] === 'f') buildFormulaItem(it, Chem.fromCode(p[1]));
    else buildCheck(it, code);
    return it;
  }

  /* ---------------------------------------------------------------- painting */

  function paintHeader() {
    var L = LEVELS[state.level - 1];
    el.levelName.textContent = 'Level ' + L.n + ' — ' + L.name;
    el.blurb.textContent = L.blurb;
    el.counter.textContent = (state.index + 1) + ' of ' + state.plan[state.level].length;

    el.tabs.innerHTML = '';
    LEVELS.forEach(function (x) {
      var tab = button('tab' + (x.n === state.level ? ' current' : '') + (x.n > state.unlocked ? ' locked' : ''),
                       x.n + '. ' + x.name, { level: x.n });
      tab.disabled = x.n > state.unlocked;
      if (x.n === state.level) tab.setAttribute('aria-current', 'step');
      el.tabs.appendChild(tab);
    });
  }

  function stepNodes(s) {
    if (s.type === 'buildName') return [item.cpd.c.tm ? 'nameY' : 'nameN', 'anion'];
    if (s.type === 'buildFormula') return ['fbal', 'fpar'];
    return s.node ? [s.node] : [];
  }

  function paintFlow(flow) {
    var active = {}, done = {};
    if (!item.isCheck) {
      item.steps.forEach(function (s, i) {
        stepNodes(s).forEach(function (n) {
          if (i < item.stepIdx) done[n] = true;
          else if (i === item.stepIdx) active[n] = true;
        });
      });
    }
    flow.dataset.path = (!item.isCheck && item.path) || '';
    var nodes = flow.querySelectorAll('[data-node]');
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].dataset.node;
      nodes[i].classList.toggle('active', !!active[k]);
      nodes[i].classList.toggle('done', !!done[k] && !active[k]);
    }
  }

  /* Level 1 shows the periodic table; Level 2 shows whichever flowchart
     fits the question on screen, naming or formula; Level 3 shows neither. */
  function paintSide() {
    var n = state.level;
    var formula = item.flow === 'formula';
    el.ptInline.hidden = n !== 1;
    el.flowName.hidden = n !== 2 || formula;
    el.flowFormula.hidden = n !== 2 || !formula;
    el.stage.classList.toggle('solo', n >= 3);
    if (n === 1) PTable.highlight(el.ptInline, item.highlight || null);
    if (n === 2) paintFlow(formula ? el.flowFormula : el.flowName);
  }

  function renderDone(s) {
    var row = make('div', 'step done' + (s.missed ? ' missed' : ''));
    row.appendChild(make('span', 'step-q', s.q));
    row.appendChild(make('span', 'step-a', (s.missed ? 'Answer: ' : '✓ ') + s.answer));
    return row;
  }

  function renderChoice(s) {
    var box = make('div', 'step current');
    box.appendChild(make('p', 'step-q', s.q));
    var opts = make('div', 'opts');
    s.options.forEach(function (o, i) {
      var b = button('opt' + (o.tried ? ' wrong' : ''), o.label, { act: 'opt', i: i, fk: 'opt:' + i });
      b.disabled = !!o.tried;
      opts.appendChild(b);
    });
    box.appendChild(opts);
    return box;
  }

  function renderCheck(s) {
    var box = make('div', 'step current check');
    box.appendChild(make('p', 'check-q', s.q));
    var opts = make('div', 'opts opts-col');
    s.options.forEach(function (o, i) {
      var cls = 'opt';
      if (item.done && o.correct) cls += ' right';
      else if (item.done && s.chosen === i) cls += ' wrong';
      var b = button(cls, o.label, { act: 'check', i: i, fk: 'check:' + i });
      b.disabled = item.done;
      opts.appendChild(b);
    });
    box.appendChild(opts);
    return box;
  }

  function chipRow(label, key, values, selected, fmt) {
    var row = make('div', 'brow');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', label);
    row.appendChild(make('span', 'brow-label', label));
    var chips = make('div', 'chips');
    values.forEach(function (v, i) {
      var b = button('chip', fmt ? fmt(v) : v, { act: 'chip', row: key, val: v, fk: 'chip:' + key + ':' + i });
      b.setAttribute('aria-pressed', String(v === selected));
      chips.appendChild(b);
    });
    row.appendChild(chips);
    return row;
  }

  function composedName(sel) {
    if (!sel.cat || !sel.num || !sel.an) return '';
    return sel.cat + (sel.num === 'none' ? '' : '(' + sel.num + ')') + ' ' + sel.an;
  }

  function composedFormula(sel) {
    if (!sel.cat || !sel.an) return '';
    return Chem.block(sel.cat, sel.cn, sel.cp) + Chem.block(sel.an, sel.ann, sel.ap);
  }

  function renderBuildName(s) {
    var box = make('div', 'step current');
    box.appendChild(make('p', 'step-q', s.q));
    var b = make('div', 'builder');
    b.appendChild(chipRow('Positive ion', 'cat', s.rows.cat, s.sel.cat));
    b.appendChild(chipRow('Roman numeral', 'num', s.rows.num, s.sel.num,
                          function (v) { return v === 'none' ? 'none' : '(' + v + ')'; }));
    b.appendChild(chipRow('Negative ion', 'an', s.rows.an, s.sel.an));
    box.appendChild(b);
    var name = composedName(s.sel);
    var prev = make('p', 'preview');
    prev.appendChild(make('span', 'preview-label', 'Your name: '));
    prev.appendChild(make('span', 'preview-value', name || 'choose one tile from each row'));
    box.appendChild(prev);
    var go = button('primary', 'Check name', { act: 'submit-name', fk: 'submit' });
    go.disabled = !name;
    box.appendChild(go);
    return box;
  }

  function countLine(label, countKey, parenKey, s) {
    var line = make('div', 'count-line');
    line.appendChild(make('span', 'count-ion', label));
    var stepper = make('span', 'stepper');
    var minus = button('step-btn', '−', { act: 'count', row: countKey, d: -1, fk: 'count:' + countKey + ':-' });
    minus.setAttribute('aria-label', 'Fewer ' + label);
    minus.disabled = s.sel[countKey] <= 1;
    var val = make('span', 'step-val', String(s.sel[countKey]));
    val.setAttribute('aria-live', 'polite');
    var plus = button('step-btn', '+', { act: 'count', row: countKey, d: 1, fk: 'count:' + countKey + ':+' });
    plus.setAttribute('aria-label', 'More ' + label);
    plus.disabled = s.sel[countKey] >= 6;
    stepper.appendChild(minus);
    stepper.appendChild(val);
    stepper.appendChild(plus);
    line.appendChild(stepper);
    var lab = make('label', 'paren');
    var box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = !!s.sel[parenKey];
    box.dataset.act = 'paren';
    box.dataset.row = parenKey;
    box.dataset.fk = 'paren:' + parenKey;
    lab.appendChild(box);
    lab.appendChild(document.createTextNode(' ( ) around it'));
    line.appendChild(lab);
    return line;
  }

  function renderBuildFormula(s) {
    var box = make('div', 'step current');
    box.appendChild(make('p', 'step-q', s.q));
    var b = make('div', 'builder');
    b.appendChild(chipRow('Positive ion', 'cat', s.rows.cat, s.sel.cat, U));
    b.appendChild(chipRow('Negative ion', 'an', s.rows.an, s.sel.an, U));
    var counts = make('div', 'brow');
    counts.appendChild(make('span', 'brow-label', 'How many of each'));
    var lines = make('div', 'counts');
    lines.appendChild(countLine(s.sel.cat ? U(s.sel.cat) : 'positive ion', 'cn', 'cp', s));
    lines.appendChild(countLine(s.sel.an ? U(s.sel.an) : 'negative ion', 'ann', 'ap', s));
    counts.appendChild(lines);
    b.appendChild(counts);
    box.appendChild(b);
    var f = composedFormula(s.sel);
    var prev = make('p', 'preview');
    prev.appendChild(make('span', 'preview-label', 'Your formula: '));
    prev.appendChild(make('span', 'preview-value formula', f ? U(f) : 'choose a positive and a negative ion'));
    box.appendChild(prev);
    var go = button('primary', 'Check formula', { act: 'submit-formula', fk: 'submit' });
    go.disabled = !f;
    box.appendChild(go);
    return box;
  }

  function renderTyped(s) {
    var isName = s.type === 'typeName';
    var box = make('div', 'step current');
    box.appendChild(make('p', 'step-q', s.q));
    var form = make('form', 'type-form');
    form.dataset.act = 'typed';
    form.setAttribute('autocomplete', 'off');
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'type-input' + (isName ? '' : ' formula');
    input.id = 'answer';
    input.value = s.value || '';
    input.dataset.fk = 'input';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('aria-label', isName ? 'Name of the compound' : 'Formula of the compound');
    input.placeholder = isName ? 'e.g. iron(III) oxide' : 'e.g. Fe2(SO4)3';
    form.appendChild(input);
    var go = make('button', 'primary', 'Check');
    go.type = 'submit';
    form.appendChild(go);
    box.appendChild(form);
    box.appendChild(make('p', 'type-hint', isName
      ? 'Put a Roman numeral in parentheses right after a transition metal. Capital letters don’t matter here.'
      : 'Type subscripts as ordinary numbers and leave the charges out. Capital letters DO matter: Co is cobalt, CO is not.'));
    return box;
  }

  function paintCard() {
    el.card.innerHTML = '';
    el.card.appendChild(make('p', 'card-kicker' + (item.checkpoint ? ' checkpoint' : ''), item.kicker));
    if (item.prompt) el.card.appendChild(make('p', 'prompt ' + (item.promptClass || ''), item.prompt));

    var list = make('div', 'steps');
    item.steps.forEach(function (s, i) {
      if (s.type === 'check') { list.appendChild(renderCheck(s)); return; }
      if (i < item.stepIdx) { list.appendChild(renderDone(s)); return; }
      if (i > item.stepIdx) return;
      if (s.type === 'choice') list.appendChild(renderChoice(s));
      else if (s.type === 'buildName') list.appendChild(renderBuildName(s));
      else if (s.type === 'buildFormula') list.appendChild(renderBuildFormula(s));
      else list.appendChild(renderTyped(s));
    });
    el.card.appendChild(list);

    if (item.done && item.cpd) {
      el.card.appendChild(make('p', 'card-answer',
        U(Chem.formula(item.cpd)) + '  =  ' + Chem.name(item.cpd)));
    }
    restoreFocus();
  }

  /* Keep keyboard focus where the student was: on the same tile after a
     re-render, on the first control of a new step, or on Next when done. */
  function restoreFocus() {
    if (item.done) return;
    var target = focusKey ? el.card.querySelector('[data-fk="' + focusKey + '"]') : null;
    if (!target || target.disabled) {
      target = el.card.querySelector('.step.current input:not([disabled]), .step.current button:not([disabled])');
    }
    if (target && el.screen.hidden && el.ptModal.hidden) {
      try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    }
  }

  function render() {
    paintHeader();
    paintSide();
    paintCard();
    el.next.hidden = !item.done;
  }

  /* ------------------------------------------------------------- answering */

  function advance() {
    item.stepIdx++;
    focusKey = null;
    if (item.stepIdx >= item.steps.length) finishItem();
    paintSide();
    paintCard();
    if (item.done) showNext();
  }

  function showNext() {
    el.next.hidden = false;
    el.next.focus();
  }

  function answerChoice(s, i) {
    var o = s.options[i];
    if (!o || o.tried) return;
    if (o.correct) {
      s.answer = o.label;
      say(s.rightMsg ? 'Correct. ' + s.rightMsg : 'Correct.', 'good');
      if (s.onRight) s.onRight(item);
      advance();
      return;
    }
    o.tried = true;
    item.clean = false;
    say(o.why || s.rightMsg || 'Not that one — try again.', 'bad');
    paintCard();
  }

  function answerCheck(s, i) {
    if (item.done) return;
    var o = s.options[i];
    s.chosen = i;
    if (o.correct) {
      say('Correct. ' + s.why, 'good');
    } else {
      item.clean = false;
      say('Not quite — the answer is “' + s.right + '.” ' + s.why, 'bad');
    }
    finishItem();
    paintCard();
    showNext();
  }

  function grade(s, res, correctText) {
    if (res.ok) {
      s.answer = correctText;
      say('Correct — ' + correctText + '.', 'good');
      advance();
      return;
    }
    s.tries = (s.tries || 0) + 1;
    item.clean = false;
    if (s.tries >= REVEAL_AFTER) {
      s.answer = correctText;
      s.missed = true;
      say(res.msg + ' The answer is ' + correctText + ' — read it through, then carry on.', 'bad');
      advance();
      return;
    }
    say(res.msg, 'bad');
    paintCard();
  }

  function submitName(s) {
    var composed = composedName(s.sel);
    if (composed) grade(s, Chem.checkName(item.cpd, composed), Chem.name(item.cpd));
  }

  function submitFormula(s) {
    var composed = composedFormula(s.sel);
    if (composed) grade(s, Chem.checkFormula(item.cpd, composed), U(Chem.formula(item.cpd)));
  }

  function submitTyped(s, value) {
    s.value = value;
    focusKey = 'input';
    if (s.type === 'typeName') grade(s, Chem.checkName(item.cpd, value), Chem.name(item.cpd));
    else grade(s, Chem.checkFormula(item.cpd, value), U(Chem.formula(item.cpd)));
  }

  function finishItem() {
    item.done = true;
    if (item.isCheck) {
      state.stats.checks++;
      if (item.clean) state.stats.checksRight++;
      else scheduleFollowUp();
    } else {
      state.stats.items++;
      if (item.clean) state.stats.clean++;
    }
    persist();
  }

  /* A missed check earns a different question on the same idea a little
     later in the level - or, for a checkpoint, at the end of it. */
  function scheduleFollowUp() {
    var list = state.plan[state.level];
    var extras = list.filter(function (c) { return flagsOf(c).indexOf('+') >= 0; }).length;
    if (extras >= MAX_FOLLOWUPS || !item.tag) return;
    var q = Plan.followUp(state.level, item.tag, state.plan, (state.seed ^ hash(item.code) ^ state.index) >>> 0);
    if (!q) return;
    if (item.checkpoint) {
      list.push('!+' + q);
      return;
    }
    var cp = list.length;
    for (var i = state.index + 1; i < list.length; i++) {
      if (flagsOf(list[i]).indexOf('!') >= 0) { cp = i; break; }
    }
    list.splice(Math.min(state.index + 3, cp), 0, '+' + q);
  }

  /* ------------------------------------------------------------ progression */

  function startItem() {
    item = buildItem();
    focusKey = null;
    say('');
    render();
  }

  function nextItem() {
    var list = state.plan[state.level];
    state.index++;
    if (state.index >= list.length) {
      completeLevel();
      return;
    }
    item = null;
    persist();
    startItem();
  }

  function completeLevel() {
    var finished = LEVELS[state.level - 1];
    if (state.level < LEVELS.length) {
      state.unlocked = Math.max(state.unlocked, state.level + 1);
      state.level++;
      state.index = 0;
      item = null;
      persist();
      showScreen('level', finished);
      return;
    }
    state.index = state.plan[state.level].length - 1;
    persist();
    SCORM.markComplete();
    showScreen('finish');
  }

  function goToLevel(n) {
    if (n > state.unlocked || n === state.level) return;
    state.level = n;
    state.index = 0;
    item = null;
    persist();
    startItem();
  }

  /* ---------------------------------------------------------------- screens */

  function hideScreen() {
    el.screen.hidden = true;
    el.screen.innerHTML = '';
  }

  function statsLine() {
    var st = state.stats;
    if (!st.items && !st.checks) return 'No answers recorded yet.';
    return st.clean + ' of ' + st.items + ' questions done with no mistakes, and ' +
           st.checksRight + ' of ' + st.checks + ' checks right the first time.';
  }

  function showScreen(kind, finished) {
    var s = el.screen;
    s.innerHTML = '';
    s.hidden = false;
    var box = make('div', 'screen-box');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');

    if (kind === 'intro') {
      box.appendChild(make('h2', null, 'Naming ionic compounds'));
      box.appendChild(make('p', null, 'Every name and formula in this activity follows one if/then rule:'));
      var rule = make('div', 'rule');
      rule.appendChild(make('p', null, 'IF the positive ion is a transition metal → metal name, then its charge as a Roman numeral, then the negative ion. Example: iron(III) oxide.'));
      rule.appendChild(make('p', null, 'OTHERWISE → the positive ion’s name, then the negative ion. Example: sodium chloride.'));
      box.appendChild(rule);
      box.appendChild(make('p', null, 'In this class the transition metals are the d-block metals on your list plus Sn and Pb. Ag and Zn are NOT transition metals — each only ever forms one charge (Ag⁺, Zn²⁺).'));
      var ul = make('ul', 'screen-list');
      LEVELS.forEach(function (L) {
        var li = make('li', null);
        li.appendChild(make('strong', null, 'Level ' + L.n + ' — ' + L.name + ': '));
        li.appendChild(document.createTextNode(L.blurb));
        ul.appendChild(li);
      });
      box.appendChild(ul);
      box.appendChild(make('p', 'screen-note',
        'Only elements 1–20, Element List 2 and your polyatomic ion list appear. Wrong answers are not ' +
        'penalised — read the explanation and try again. Your progress saves as you go.'));
      var resumed = state.index > 0 || state.level > 1;
      var start = button('primary', resumed ? 'Continue' : 'Start');
      start.addEventListener('click', function () { hideScreen(); restoreFocus(); });
      box.appendChild(start);
      s.appendChild(box);
      start.focus();
      return;
    }

    if (kind === 'level') {
      box.appendChild(make('h2', null, 'Level ' + finished.n + ' complete'));
      box.appendChild(make('p', null, statsLine()));
      var L = LEVELS[state.level - 1];
      box.appendChild(make('p', 'screen-note', 'Next — Level ' + L.n + ', ' + L.name + ': ' + L.blurb));
      var go = button('primary', 'Start Level ' + L.n);
      go.addEventListener('click', function () { hideScreen(); startItem(); });
      box.appendChild(go);
      s.appendChild(box);
      go.focus();
      return;
    }

    box.appendChild(make('h2', null, 'All levels complete'));
    box.appendChild(make('p', null, statsLine()));
    box.appendChild(make('p', 'screen-note', state.preview
      ? 'Teacher preview — nothing was saved or reported.'
      : SCORM.isConnected()
        ? 'Your completion has been sent to the gradebook. You may close this window.'
        : 'Running outside an LMS — nothing was reported.'));
    var again = button('primary', 'Play again with new compounds');
    again.addEventListener('click', function () {
      var preview = state.preview;
      state = newRun();
      state.preview = preview;
      if (preview) state.unlocked = LEVELS.length;
      item = null;
      persist();
      hideScreen();
      startItem();
    });
    box.appendChild(again);
    s.appendChild(box);
    again.focus();
  }

  /* ---------------------------------------------------------- periodic table */

  function openTable() {
    el.ptModal.hidden = false;
    el.ptClose.focus();
  }

  function closeTable() {
    el.ptModal.hidden = true;
    el.ptButton.focus();
  }

  /* ----------------------------------------------------------- interaction */

  function onCardClick(ev) {
    var t = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!t || t.disabled || !item) return;
    var act = t.dataset.act;
    if (act === 'paren' || act === 'typed') return;
    var s = item.steps[item.stepIdx];
    focusKey = t.dataset.fk || null;
    if (act === 'opt') answerChoice(s, +t.dataset.i);
    else if (act === 'check') answerCheck(item.steps[0], +t.dataset.i);
    else if (act === 'chip') { s.sel[t.dataset.row] = t.dataset.val; say(''); paintCard(); }
    else if (act === 'count') {
      var k = t.dataset.row;
      s.sel[k] = Math.max(1, Math.min(6, s.sel[k] + (+t.dataset.d)));
      paintCard();
    }
    else if (act === 'submit-name') submitName(s);
    else if (act === 'submit-formula') submitFormula(s);
  }

  function onCardChange(ev) {
    var t = ev.target;
    if (!t.dataset || t.dataset.act !== 'paren' || !item) return;
    var s = item.steps[item.stepIdx];
    s.sel[t.dataset.row] = t.checked;
    focusKey = t.dataset.fk;
    paintCard();
  }

  function onCardSubmit(ev) {
    ev.preventDefault();
    if (!item || item.done) return;
    var s = item.steps[item.stepIdx];
    var input = el.card.querySelector('#answer');
    if (input && input.value.trim()) submitTyped(s, input.value);
  }

  /* ------------------------------------------------------------------ boot */

  function cacheDom() {
    ['card', 'feedback', 'next', 'tabs', 'levelName', 'blurb', 'counter', 'screen', 'stage',
     'lms', 'ptInline', 'flowName', 'flowFormula', 'ptButton', 'ptModal', 'ptClose',
     'ptModalBody', 'ptLink'].forEach(function (id) { el[id] = $(id); });
  }

  function start() {
    cacheDom();
    PTable.render(el.ptInline);
    PTable.render(el.ptModalBody);
    el.ptLink.href = PTable.OFFICIAL;

    var connected = SCORM.init();
    var params = new URLSearchParams(location.search);
    var preview = parseInt(params.get('level'), 10);

    if (preview >= 1 && preview <= LEVELS.length) {
      state = newRun();
      state.preview = true;
      state.unlocked = LEVELS.length;
      state.level = preview;
      el.lms.textContent = 'Teacher preview — nothing saved';
      el.lms.className = 'lms off';
    } else {
      state = restore(SCORM.loadState()) || newRun();
      el.lms.textContent = connected ? 'Connected to the LMS' : 'Standalone — no LMS detected';
      el.lms.className = 'lms ' + (connected ? 'on' : 'off');
    }

    /* A save taken after the last item of a level was finished points one
       past the end: move on to the next level. */
    if (state.index >= state.plan[state.level].length) {
      if (state.level < LEVELS.length) {
        state.unlocked = Math.max(state.unlocked, state.level + 1);
        state.level++;
        state.index = 0;
      } else {
        state.index = state.plan[state.level].length - 1;
      }
    }

    /* Write the run out before the first answer, so a student who opens and
       closes the activity comes back to the same compounds. */
    persist();

    item = buildItem();
    render();

    el.card.addEventListener('click', onCardClick);
    el.card.addEventListener('change', onCardChange);
    el.card.addEventListener('submit', onCardSubmit);
    el.next.addEventListener('click', nextItem);
    el.tabs.addEventListener('click', function (ev) {
      var tab = ev.target.closest('.tab');
      if (tab && !tab.disabled) goToLevel(+tab.dataset.level);
    });
    el.ptButton.addEventListener('click', openTable);
    el.ptClose.addEventListener('click', closeTable);
    el.ptModal.addEventListener('click', function (ev) { if (ev.target === el.ptModal) closeTable(); });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !el.ptModal.hidden) closeTable();
    });

    showScreen('intro');
  }

  return { start: start };
})();

document.addEventListener('DOMContentLoaded', Game.start);

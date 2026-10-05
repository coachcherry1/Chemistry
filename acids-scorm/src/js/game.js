/* game.js — items, steps, feedback and progression.
 *
 *   Level 1  acids only. Naming: which acid rule (no oxygen -> hydro-...-ic,
 *            -ate -> -ic, -ite -> -ous), then the acid builder
 *            [hydro- / none] [root] [-ic / -ous] acid. Formulas: which ion
 *            does the name point to, how many H, then the formula builder.
 *   Level 2  all four types mixed. Every question opens with the four-way
 *            decision (acid / ionic / ionic + numeral / covalent), then that
 *            branch's steps and builder.
 *   Level 3  the same mix, builders only. The name builder starts with a
 *            choice between the acid builder and the ionic-or-covalent one,
 *            so the decision is still part of every answer.
 * There is no typing anywhere.
 *
 * Builds go through Chem.checkName / Chem.checkFormula, which explain the
 * specific mistake - hydro- on an oxyacid, -ous for an -ate ion, prefixes on
 * an ionic name, a numeral on a covalent one, a reduced covalent formula.
 */

var Game = (function () {
  'use strict';

  var LEVELS = Plan.LEVELS;
  var U = Chem.uni, R = Chem.ROMAN;

  /* Bump whenever the level list, the draw or the item codes change. A save
     written by an older build is then discarded rather than resumed. */
  var SCHEMA = 1;

  /* A build step shows the answer after this many wrong tries, so
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

  /* The three-way decision every question in this activity turns on. */
  function ruleStep(cpd) {
    var r = Chem.rule(cpd), why = Chem.ruleWhy(cpd);
    return {
      type: 'choice', node: 'q', q: 'Which naming rules apply?', rightMsg: why, keepOrder: true,
      options: ['acid', 'ion', 'tm', 'cov'].map(function (k) {
        return { label: Chem.RULES[k], correct: k === r, why: why };
      }),
      onRight: function (it) { it.path = r; }
    };
  }

  function nameOptionsFor(list, right, need, rand, pool) {
    var seen = {}, out = [];
    [right].concat(list).forEach(function (x) { if (x && !seen[x]) { seen[x] = true; out.push(x); } });
    Plan.shuffle(pool, rand).forEach(function (x) {
      if (out.length < need && !seen[x]) { seen[x] = true; out.push(x); }
    });
    return Plan.shuffle(out.slice(0, need), rand);
  }

  var EL = Chem.EL;
  var COV_FIRSTS = DATA.COVALENT.map(function (f) { return Chem.fromCode('v.' + f).e1; })
    .filter(function (x, i, arr) { return arr.indexOf(x) === i; });
  var SINGLE_ANIONS = DATA.ANIONS.filter(function (a) { return !a.poly; });

  /* Covalent first elements that look like this metal (C for Co, S for Sn),
     so an ionic question offers the covalent look-alike as a wrong tile. */
  function covLookAlikes(sym) {
    return COV_FIRSTS.filter(function (e) { return (DATA.COV_NEAR[e] || []).indexOf(sym) >= 0; });
  }

  function countStep(text, count, F) {
    var why = 'The ' + count + ' after the parentheses multiplies everything inside them: ' +
              count + ' ' + U(text) + ' ions.';
    var values = [1, 2, 3, 4];
    if (values.indexOf(count) < 0) values.push(count);
    var s = chargeChoice('How many ' + U(text) + ' ions are in ' + F + '?', count, '', values, why);
    s.options.forEach(function (o) { if (!o.correct) o.why = 'Look at the number right after the closing parenthesis.'; });
    s.node = 'count';
    return s;
  }

  function metalChargeSteps(it, cpd) {
    var c = cpd.c, a = cpd.a;
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

  /* One name builder for every compound: prefix, first part, Roman numeral,
     prefix, second part. Choosing "none" in the rows that do not belong IS
     the ionic-or-covalent decision. */
  var ALL_ROOTS = Object.keys(DATA.ACIDS).map(function (t) { return DATA.ACIDS[t]; })
    .filter(function (x, i, arr) { return arr.indexOf(x) === i; });

  /* Root tiles for an acid name: the right root, its per-/hypo- relatives,
     the sulf/phosph slips, and roots of look-alike ions. */
  function acidRoots(it, cpd) {
    var right = cpd.kind === 'acid' ? cpd.root : (DATA.ACIDS[cpd.kind === 'ion' ? cpd.a.t : cpd.e2] || 'hydrogen');
    var near = [];
    if (/chlor$/.test(right)) near = ['hypochlor', 'chlor', 'perchlor'];
    if (right === 'sulfur') near = ['sulf'];
    if (right === 'phosphor') near = ['phosph'];
    if (cpd.kind === 'acid') {
      cpd.a.near.forEach(function (t) { if (DATA.ACIDS[t]) near.push(DATA.ACIDS[t]); });
    }
    return nameOptionsFor(near, right, 4, it.rand, ALL_ROOTS);
  }

  function compoundRows(it, cpd) {
    var first, second;
    if (cpd.kind === 'cov') {
      var a2 = Chem.AN[cpd.e2];
      first = nameOptionsFor((DATA.COV_NEAR[cpd.e1] || []).map(function (sym) {
        return Chem.CAT[sym] ? Chem.CAT[sym].name : EL[sym];
      }), EL[cpd.e1], 3, it.rand, COV_FIRSTS.map(function (e) { return EL[e]; }));
      second = nameOptionsFor([a2.el].concat(a2.near.map(function (t) { return Chem.AN[t].name; })),
                              a2.name, 4, it.rand, SINGLE_ANIONS.map(function (x) { return x.name; }));
    } else if (cpd.kind === 'acid') {
      first = nameOptionsFor(['sodium'], 'hydrogen', 3, it.rand, DATA.CATIONS.map(function (x) { return x.name; }));
      second = nameOptionsFor(cpd.a.near.map(function (t) { return Chem.AN[t].name; }), cpd.a.name, 4, it.rand,
                              DATA.ANIONS.map(function (x) { return x.name; }));
    } else {
      var c = cpd.c, a = cpd.a;
      first = nameOptionsFor(
        covLookAlikes(c.t).map(function (e) { return EL[e]; }).slice(0, 1)
          .concat(c.near.map(function (t) { return Chem.CAT[t] && Chem.CAT[t].name; }))
          .concat(c.traps || []),
        c.name, 3, it.rand, DATA.CATIONS.map(function (x) { return x.name; }));
      second = nameOptionsFor(
        (a.el ? [a.el] : []).concat(a.near.map(function (t) { return Chem.AN[t].name; })),
        a.name, 4, it.rand, DATA.ANIONS.map(function (x) { return x.name; }));
    }
    return {
      p1: ['none', 'mono', 'di', 'tri', 'tetra'],
      first: first,
      num: ['none', 'I', 'II', 'III', 'IV'],
      p2: ['none'].concat(Chem.PREFIXES.slice(1)),
      second: second
    };
  }

  /* Name builder. mode 'acid' -> [hydro- / none] [root] [-ic / -ous] acid;
     mode 'compound' -> [prefix] [first] [numeral] [prefix] [second].
     With no mode (Level 3) the student picks the builder first, which IS the
     acid-or-not decision. */
  function nameBuilder(it, cpd, mode) {
    return {
      type: 'buildName', mode: mode || null,
      q: mode === 'acid' ? 'Build the acid’s name.'
       : mode ? 'Build the name — use only the rows your rules call for.'
       : 'Choose the builder that fits, then build the name.',
      acidRows: { pre: ['none', 'hydro'], root: acidRoots(it, cpd), end: ['ic', 'ous'] },
      rows: compoundRows(it, cpd),
      sel: { mode: mode || null, pre: null, root: null, end: null,
             p1: null, first: null, num: null, p2: null, second: null },
      tries: 0
    };
  }

  function formulaBuilder(it, cpd) {
    var first, second;
    if (cpd.kind === 'cov') {
      var hCov = DATA.ACIDS[cpd.e2] && it.level >= 2;
      first = nameOptionsFor(DATA.COV_NEAR[cpd.e1] || [], cpd.e1, hCov ? 2 : 3, it.rand, COV_FIRSTS);
      if (hCov) first.push('H');
      second = nameOptionsFor(Chem.AN[cpd.e2].near, cpd.e2, 4, it.rand,
                              SINGLE_ANIONS.map(function (x) { return x.t; }));
    } else if (cpd.kind === 'acid') {
      first = nameOptionsFor(['Na', 'NH4'], 'H', 3, it.rand, DATA.CATIONS.map(function (x) { return x.t; }));
      second = nameOptionsFor(cpd.a.near, cpd.a.t, 4, it.rand, DATA.ANIONS.map(function (x) { return x.t; }));
    } else {
      /* an H tile tempts the student to turn the compound into the acid */
      var hIon = DATA.ACIDS[cpd.a.t] && it.level >= 2;
      first = nameOptionsFor(covLookAlikes(cpd.c.t).slice(0, 1).concat(cpd.c.near), cpd.c.t, hIon ? 2 : 3, it.rand,
                             DATA.CATIONS.map(function (x) { return x.t; }));
      if (hIon) first.push('H');
      second = nameOptionsFor(cpd.a.near, cpd.a.t, 4, it.rand, DATA.ANIONS.map(function (x) { return x.t; }));
    }
    return {
      type: 'buildFormula',
      q: 'Build the formula: choose the two parts, set how many of each, and add parentheses only where they belong.',
      rows: { cat: Plan.shuffle(first, it.rand), an: second },
      sel: { cat: null, an: null, cn: 1, ann: 1, cp: false, ap: false }, tries: 0
    };
  }

  function acidTypeStep(cpd) {
    var why = Chem.acidWhy(cpd);
    return {
      type: 'choice', node: 'atype', q: 'Which acid rule applies?', rightMsg: why, keepOrder: true,
      options: ['bin', 'ic', 'ous'].map(function (k) {
        return { label: Chem.ACID_TYPES[k], correct: k === cpd.type, why: why };
      }),
      onRight: function (it) { it.atype = cpd.type; }
    };
  }

  /* Writing an acid's formula: which ion does the name point to, then how
     many H balance it. */
  function acidFormulaSteps(it, cpd) {
    var a = cpd.a, name = Chem.name(cpd);
    var whyIon = cpd.type === 'bin'
      ? 'Hydro-…-ic means no oxygen: the ion is ' + a.name + ', ' + Chem.anIon(a) + '.'
      : '-' + (cpd.type === 'ic' ? 'ic comes from -ate' : 'ous comes from -ite') + ': the ion is ' + a.name +
        ', ' + Chem.anIon(a) + '.';
    var wrongs = a.near.map(function (t) {
      var y = Chem.AN[t];
      return { label: Chem.anIon(y), why: Chem.anIon(y) + ' is ' + y.name + '. ' + whyIon };
    });
    var s1 = choice('Which negative ion is in ' + name + '?', Chem.anIon(a), wrongs, it.rand, { rightMsg: whyIon });
    s1.node = 'aform';
    it.steps.push(s1);
    var whyH = 'Each H is 1+, and ' + Chem.anIon(a) + ' is ' + a.charge + '−: ' +
               (a.charge > 1 ? a.charge + ' H.' : 'one H.');
    var s2 = chargeChoice('How many H does it take to balance ' + Chem.anIon(a) + '?', a.charge, '', [1, 2, 3], whyH);
    s2.node = 'aform';
    it.steps.push(s2);
  }

  function promptFormula(it, cpd) {
    if (cpd.kind === 'acid' && cpd.alt && it.rand() < 0.5) return U(cpd.alt);
    return U(Chem.formula(cpd));
  }

  function buildNameItem(it, cpd) {
    it.cpd = cpd;
    it.flow = true;
    it.kicker = 'Name this compound';
    it.prompt = promptFormula(it, cpd);
    it.promptClass = 'formula';
    var acid = cpd.kind === 'acid';
    if (it.level === 1) {
      it.steps.push(acidTypeStep(cpd));
      it.steps.push(nameBuilder(it, cpd, 'acid'));
      return;
    }
    if (it.level === 2) {
      it.steps.push(ruleStep(cpd));
      if (acid) it.steps.push(acidTypeStep(cpd));
      if (cpd.kind === 'ion') {
        if (cpd.c.poly && cpd.m > 1) it.steps.push(countStep(cpd.c.t, cpd.m, it.prompt));
        if (cpd.a.poly && cpd.n > 1) it.steps.push(countStep(cpd.a.t, cpd.n, it.prompt));
        if (cpd.c.tm) metalChargeSteps(it, cpd);
      }
      it.steps.push(nameBuilder(it, cpd, acid ? 'acid' : 'compound'));
      return;
    }
    it.steps.push(nameBuilder(it, cpd, null));
  }

  function buildFormulaItem(it, cpd) {
    it.cpd = cpd;
    it.flow = true;
    it.kicker = 'Write the formula';
    it.prompt = Chem.name(cpd);
    it.promptClass = 'name';
    if (it.level === 2) it.steps.push(ruleStep(cpd));
    if (it.level <= 2 && cpd.kind === 'acid') acidFormulaSteps(it, cpd);
    if (it.level === 2 && cpd.kind === 'ion') {
      var c = cpd.c, a = cpd.a;
      var whyC = c.tm
        ? 'The Roman numeral (' + R[cpd.q] + ') is the charge: ' + Chem.catIon(c, cpd.q) + '.'
        : c.why;
      var s1 = chargeChoice('What is the charge on the ' + c.name + ' ion?', cpd.q, '+', [1, 2, 3, 4], whyC);
      s1.node = 'fion';
      it.steps.push(s1);
      var whyA = a.poly
        ? Chem.cap(a.name) + ' is ' + Chem.anIon(a) + ' — from your polyatomic ion list.'
        : a.t + ' is in Group ' + a.group + ', so ' + a.name + ' is ' + Chem.anIon(a) + '.';
      var s2 = chargeChoice('What is the charge on the ' + a.name + ' ion?', a.charge, '−', [1, 2, 3], whyA);
      s2.node = 'fion';
      it.steps.push(s2);
    }
    it.steps.push(formulaBuilder(it, cpd));
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
    if (p[0] === 'n') buildNameItem(it, Chem.fromCode(p[1]));
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

  /* Which flowchart boxes a step belongs to. The build steps light up the
     branch the compound actually follows. */
  function stepNodes(s) {
    var acid = item.cpd.kind === 'acid';
    if (item.level === 1) {
      if (s.type === 'buildName') return ['a' + item.cpd.type];
      if (s.type === 'buildFormula') return ['aform'];
      return s.node ? [s.node] : [];
    }
    var r = Chem.rule(item.cpd);
    if (s.node === 'q') return ['q0', 'q1', 'q2'];
    if (acid) return ['acid'];
    if (s.type === 'buildName') return [r];
    if (s.type === 'buildFormula') return [r === 'cov' ? 'fcov' : 'fion'];
    if (s.node === 'count') return [r];
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
    flow.dataset.path = (!item.isCheck && (item.level === 1 ? item.atype : item.path)) || '';
    var nodes = flow.querySelectorAll('[data-node]');
    for (var i = 0; i < nodes.length; i++) {
      var k = nodes[i].dataset.node;
      nodes[i].classList.toggle('active', !!active[k]);
      nodes[i].classList.toggle('done', !!done[k] && !active[k]);
    }
  }

  /* Level 1 shows the periodic table, Level 2 the decision flowchart,
     Level 3 neither. */
  function paintSide() {
    var n = state.level;
    el.flowAcid.hidden = n !== 1;
    el.flow.hidden = n !== 2;
    el.stage.classList.toggle('solo', n >= 3);
    if (n === 1) paintFlow(el.flowAcid);
    if (n === 2) paintFlow(el.flow);
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
    if (sel.mode === 'acid') {
      if (!sel.pre || !sel.root || !sel.end) return '';
      return (sel.pre === 'hydro' ? 'hydro' : '') + sel.root + sel.end + ' acid';
    }
    if (!sel.mode || !sel.p1 || !sel.first || !sel.num || !sel.p2 || !sel.second) return '';
    var p1 = sel.p1 === 'none' ? '' : sel.p1, p2 = sel.p2 === 'none' ? '' : sel.p2;
    return p1 + sel.first + (sel.num === 'none' ? '' : '(' + sel.num + ')') + ' ' + Chem.elide(p2, sel.second);
  }

  /* The name so far, with a gap for each row still to choose. */
  function partialName(sel) {
    var gap = '___';
    if (!sel.mode) return 'choose a builder';
    if (sel.mode === 'acid') {
      return (sel.pre === 'hydro' ? 'hydro' : '') + (sel.root || gap) + (sel.end || '__') + ' acid';
    }
    var p1 = sel.p1 && sel.p1 !== 'none' ? sel.p1 : '';
    var num = sel.num && sel.num !== 'none' ? '(' + sel.num + ')' : '';
    var p2 = sel.p2 && sel.p2 !== 'none' ? sel.p2 : '';
    return p1 + (sel.first || gap) + num + ' ' + (sel.second ? Chem.elide(p2, sel.second) : p2 + gap);
  }

  function composedFormula(sel) {
    if (!sel.cat || !sel.an) return '';
    return Chem.block(sel.cat, sel.cn, sel.cp) + Chem.block(sel.an, sel.ann, sel.ap);
  }

  function renderBuildName(s) {
    var box = make('div', 'step current');
    box.appendChild(make('p', 'step-q', s.q));
    var b = make('div', 'builder');
    var none = function (fmt) { return function (v) { return v === 'none' ? 'none' : fmt(v); }; };
    if (!s.mode) {
      b.appendChild(chipRow('Builder', 'mode', ['acid', 'compound'], s.sel.mode, function (v) {
        return v === 'acid' ? 'Acid name' : 'Ionic or covalent name';
      }));
    }
    if (s.sel.mode === 'acid') {
      b.appendChild(chipRow('Start', 'pre', s.acidRows.pre, s.sel.pre, none(function (v) { return v + '-'; })));
      b.appendChild(chipRow('Root', 'root', s.acidRows.root, s.sel.root, function (v) { return v + '-'; }));
      b.appendChild(chipRow('Ending', 'end', s.acidRows.end, s.sel.end, function (v) { return '-' + v + ' acid'; }));
    } else if (s.sel.mode === 'compound') {
      b.appendChild(chipRow('Prefix', 'p1', s.rows.p1, s.sel.p1, none(function (v) { return v + '-'; })));
      b.appendChild(chipRow('First part', 'first', s.rows.first, s.sel.first));
      b.appendChild(chipRow('Roman numeral', 'num', s.rows.num, s.sel.num, none(function (v) { return '(' + v + ')'; })));
      b.appendChild(chipRow('Prefix', 'p2', s.rows.p2, s.sel.p2, none(function (v) { return v + '-'; })));
      b.appendChild(chipRow('Second part', 'second', s.rows.second, s.sel.second));
    }
    box.appendChild(b);
    var name = composedName(s.sel);
    var prev = make('p', 'preview');
    prev.appendChild(make('span', 'preview-label', 'Your name: '));
    prev.appendChild(make('span', 'preview-value', partialName(s.sel)));
    box.appendChild(prev);
    var go = button('primary', 'Check name', { act: 'submit-name', fk: 'submit' });
    go.disabled = !name;
    box.appendChild(go);
    if (!name && s.sel.mode) box.appendChild(make('p', 'type-hint', 'Choose one tile in every row — “none” counts.'));
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
    plus.disabled = s.sel[countKey] >= 10;
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
    b.appendChild(chipRow('First part', 'cat', s.rows.cat, s.sel.cat, U));
    b.appendChild(chipRow('Second part', 'an', s.rows.an, s.sel.an, U));
    var counts = make('div', 'brow');
    counts.appendChild(make('span', 'brow-label', 'How many of each'));
    var lines = make('div', 'counts');
    lines.appendChild(countLine(s.sel.cat ? U(s.sel.cat) : 'first part', 'cn', 'cp', s));
    lines.appendChild(countLine(s.sel.an ? U(s.sel.an) : 'second part', 'ann', 'ap', s));
    counts.appendChild(lines);
    b.appendChild(counts);
    box.appendChild(b);
    var f = composedFormula(s.sel);
    var prev = make('p', 'preview');
    prev.appendChild(make('span', 'preview-label', 'Your formula: '));
    prev.appendChild(make('span', 'preview-value formula', f ? U(f) : 'choose both parts'));
    box.appendChild(prev);
    var go = button('primary', 'Check formula', { act: 'submit-formula', fk: 'submit' });
    go.disabled = !f;
    box.appendChild(go);
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
      else list.appendChild(renderBuildFormula(s));
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
    if (composed) grade(s, Chem.checkName(item.cpd, composed, s.sel), Chem.name(item.cpd));
  }

  function submitFormula(s) {
    var composed = composedFormula(s.sel);
    if (composed) grade(s, Chem.checkFormula(item.cpd, composed), U(Chem.formula(item.cpd)));
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
      box.appendChild(make('h2', null, 'Acids, ionic and covalent'));
      box.appendChild(make('p', null, 'Before you name anything, decide which rules it follows:'));
      var rule = make('div', 'rule');
      rule.appendChild(make('p', null, 'Starts with H → ACID. Look at the negative ion:'));
      rule.appendChild(make('p', 'sub', 'no oxygen → hydro- + root + -ic acid (HCl, hydrochloric acid)'));
      rule.appendChild(make('p', 'sub', '-ate ion → root + -ic acid (H₂SO₄, sulfuric acid)'));
      rule.appendChild(make('p', 'sub', '-ite ion → root + -ous acid (H₂SO₃, sulfurous acid)'));
      rule.appendChild(make('p', null, 'Starts with a METAL (or NH₄⁺) → IONIC: Roman numeral only for a transition metal.'));
      rule.appendChild(make('p', null, 'TWO NONMETALS → COVALENT: prefixes count the atoms; never reduce.'));
      box.appendChild(rule);
      box.appendChild(make('p', null, 'In an acid formula the number of H equals the negative ion’s charge, and there are never parentheses. Sn and Pb count as transition metals; Ag and Zn do not.'));
      var ul = make('ul', 'screen-list');
      LEVELS.forEach(function (L) {
        var li = make('li', null);
        li.appendChild(make('strong', null, 'Level ' + L.n + ' — ' + L.name + ': '));
        li.appendChild(document.createTextNode(L.blurb));
        ul.appendChild(li);
      });
      box.appendChild(ul);
      box.appendChild(make('p', 'screen-note',
        'Only elements 1–20, Element List 2 and your polyatomic ion list appear. Nothing is typed — ' +
        'you build every answer from tiles. Wrong answers are not penalised: read the explanation and ' +
        'try again. Your progress saves as you go.'));
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
    if (act === 'paren') return;
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

  /* ------------------------------------------------------------------ boot */

  function cacheDom() {
    ['card', 'feedback', 'next', 'tabs', 'levelName', 'blurb', 'counter', 'screen', 'stage',
     'lms', 'flowAcid', 'flow', 'ptButton', 'ptModal', 'ptClose',
     'ptModalBody', 'ptLink'].forEach(function (id) { el[id] = $(id); });
  }

  function start() {
    cacheDom();
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

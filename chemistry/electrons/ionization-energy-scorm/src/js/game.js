/* game.js: painting, answering and progression.
 *
 * Part 1 strips one atom, predicting each cost before it is revealed.
 * Part 2 reads mystery data the way Part 5 of the packet does.
 * Part 3 is a three-question checkpoint.
 * The questions themselves are built in items.js.
 */

var Game = (function () {
  'use strict';

  var PARTS = Plan.PARTS;

  /* Bump whenever the parts, the draw or the item codes change. A save
     written by an older build is then discarded rather than resumed. */
  var SCHEMA = 1;

  /* Most follow-up questions a part will add after missed checks. */
  var MAX_FOLLOWUPS = 2;

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

  var hash = Items.hash, flagsOf = Items.flagsOf, plural = Items.plural;
  var STRIP_SHOWN = Items.STRIP_SHOWN, levelsFor = Items.levelsFor;

  function say(text, kind) {
    el.feedback.className = 'feedback ' + (kind || '');
    el.feedback.textContent = text || '';
  }

  /* --------------------------------------------------------------- the run */

  function newRun(opts) {
    var seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    return {
      seed: seed, unlocked: 1, part: 1, index: 0, plan: Plan.newPlan(seed, opts),
      stats: { items: 0, clean: 0, checks: 0, checksRight: 0 }
    };
  }

  /* A finished item saves the NEXT index, so closing the window before
     pressing Next does not repeat it on return. */
  function persist() {
    if (state.preview) return;
    SCORM.saveState({
      v: SCHEMA, s: state.seed, u: state.unlocked, l: state.part,
      i: state.index + (item && item.done ? 1 : 0),
      p: state.plan, st: state.stats
    });
  }

  function restore(saved) {
    if (!saved || saved.v !== SCHEMA || !saved.p) return null;
    var ok = PARTS.every(function (P) {
      var list = saved.p[P.n];
      return list && list.length && list.every(Plan.valid);
    });
    if (!ok) return null;
    return {
      seed: saved.s, unlocked: saved.u || 1, part: saved.l || 1, index: saved.i || 0,
      plan: saved.p,
      stats: saved.st || { items: 0, clean: 0, checks: 0, checksRight: 0 }
    };
  }

  /* -------------------------------------------------------------- painting */

  function paintHeader() {
    var P = PARTS[state.part - 1];
    el.tabs.innerHTML = '';
    PARTS.forEach(function (x) {
      var t = button('tab' + (x.n === state.part ? ' current' : '') + (x.n > state.unlocked ? ' locked' : ''),
                     'Part ' + x.n + ': ' + x.name, { part: x.n });
      t.disabled = x.n > state.unlocked;
      if (x.n === state.part) t.setAttribute('aria-current', 'step');
      el.tabs.appendChild(t);
    });
    el.partName.textContent = 'Part ' + P.n + ': ' + P.name;
    el.blurb.textContent = P.blurb;
    var list = state.plan[state.part];
    el.counter.textContent = (state.index + 1) + ' of ' + list.length;
  }

  function stepNodes(s) {
    if (!s) return [];
    return [].concat(s.node || []);
  }

  function paintSide() {
    var flow = item.flow;
    el.flowRule.hidden = flow !== 'rule';
    el.flowData.hidden = flow !== 'data';
    var cur = item.steps[item.stepIdx];
    el.ptSide.hidden = flow !== 'data' || (cur && cur.type === 'pick' && !item.done);
    if (!el.ptSide.hidden) {
      el.ptSide.innerHTML = '';
      el.ptSide.appendChild(Draw.ptable({ highlight: item.done || item.stepIdx > 3 ? item.sym : null }));
    }
    el.stage.classList.toggle('solo', !flow);

    [el.flowRule, el.flowData].forEach(function (f) {
      var nodes = f.querySelectorAll('.fnode');
      for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('active', 'done');
    });
    var box = flow === 'rule' ? el.flowRule : flow === 'data' ? el.flowData : null;
    if (!box) return;
    function mark(key, cls) {
      var n = box.querySelector('[data-node="' + key + '"]');
      if (n) n.classList.add(cls);
    }
    item.steps.forEach(function (s, i) {
      if (i < item.stepIdx) {
        stepNodes(s).forEach(function (k) { mark(k, 'done'); });
        if (s.doneNode) mark(s.doneNode, 'done');
      }
    });
    if (!item.done) stepNodes(cur).forEach(function (k) { mark(k, 'active'); });
  }

  function paintViz() {
    var box = make('div', 'viz');
    var k = item.kind;
    if (k === 'strip') {
      var sym = item.sym, q = item.charge, Z = DATA.z(sym), ies = DATA.IE[sym].ie.slice(0, STRIP_SHOWN);
      var atom = make('div', 'atom');
      atom.appendChild(Draw.shells(sym, q));
      var info = make('div', 'atom-info');
      info.appendChild(make('p', 'particle', Atom.ion(sym, q)));
      info.appendChild(make('p', 'atom-line', Z + ' protons, ' + (Z - q) + ' electrons'));
      info.appendChild(make('p', 'atom-line cfg', Atom.configText(sym, q)));
      var occ = Atom.occupied(sym, q);
      info.appendChild(make('p', 'atom-line strong', plural(occ, 'occupied energy level')));
      info.appendChild(Draw.shellLegend(sym, q));
      atom.appendChild(info);
      box.appendChild(atom);
      var lv = levelsFor(sym, STRIP_SHOWN).map(function (l, i) { return i < item.revealed ? l : null; });
      box.appendChild(Draw.bars(ies, {
        shown: item.revealed, levels: lv,
        label: 'Ionization energies of ' + DATA.name(sym) + ' so far: ' +
          (ies.slice(0, item.revealed).join(', ') || 'none yet') + ' kJ/mol'
      }));
      return box;
    }
    if (k === 't' || k === 'g' || k === 'h') {
      var sym2 = item.sym, o = Atom.outer(sym2);
      var vals = k === 'h' && !item.full ? item.values.slice(0, DATA.HIDDEN_SHOWN) : item.values;
      var opts = {
        jumpAt: item.jumpFound || item.done ? o : null,
        levels: item.done ? levelsFor(sym2, vals.length) : null,
        outerLevel: item.done ? Atom.row(sym2) : null,
        innerLevel: item.done ? Atom.row(sym2) - 1 : null,
        label: 'Ionization energies of element X: ' + vals.join(', ') + ' kJ/mol'
      };
      box.appendChild(k === 'g' ? Draw.bars(vals, opts) : Draw.table(vals, opts));
      return box;
    }
    if (k === 'c') {
      var cl = make('div', 'cfg-lines');
      item.lines.forEach(function (l) { cl.appendChild(make('p', 'cfg', l)); });
      box.appendChild(cl);
      return box;
    }
    return null;
  }

  function renderDone(s) {
    var row = make('div', 'step done' + (s.missed ? ' missed' : ''));
    row.appendChild(make('span', 'step-q', s.short || s.q));
    row.appendChild(make('span', 'step-a', s.answer || ''));
    return row;
  }

  function renderChoice(s) {
    var box = make('div', 'step current');
    box.appendChild(make('p', 'step-q', s.q));
    var long = s.options.some(function (o) { return o.label.length > 28; });
    var opts = make('div', 'opts' + (long ? ' opts-col' : ''));
    s.options.forEach(function (o, i) {
      var b = button('opt' + (o.tried ? ' wrong' : ''), o.label, { act: 'opt', i: i, fk: 'opt:' + i });
      b.disabled = !!o.tried;
      opts.appendChild(b);
    });
    box.appendChild(opts);
    return box;
  }

  function renderAction(s) {
    var box = make('div', 'step current');
    box.appendChild(button('primary', s.label, { act: 'do', fk: 'do' }));
    return box;
  }

  function renderPick(s) {
    var box = make('div', 'step current');
    box.appendChild(make('p', 'step-q', s.q));
    box.appendChild(Draw.ptable({ pick: true, tried: s.tried }));
    return box;
  }

  function renderCheck(s) {
    var box = make('div', 'step current');
    box.appendChild(make('p', 'check-q', s.q));
    var opts = make('div', 'opts opts-col');
    s.options.forEach(function (o, i) {
      var cls = 'opt';
      if (s.chosen != null) {
        if (o.correct) cls += ' right';
        else if (i === s.chosen) cls += ' wrong';
      }
      var b = button(cls, o.label, { act: 'check', i: i, fk: 'check:' + i });
      b.disabled = s.chosen != null;
      opts.appendChild(b);
    });
    box.appendChild(opts);
    return box;
  }

  function paintCard() {
    el.card.innerHTML = '';
    el.card.appendChild(make('p', 'card-kicker' + (item.checkpoint ? ' checkpoint' : ''), item.kicker));
    if (item.prompt) el.card.appendChild(make('p', 'prompt', item.prompt));
    if (item.lines && item.kind === 'strip') item.lines.forEach(function (l) { el.card.appendChild(make('p', 'sub', l)); });
    var viz = paintViz();
    if (viz) el.card.appendChild(viz);

    var list = make('div', 'steps');
    item.steps.forEach(function (s, i) {
      if (s.type === 'check') { list.appendChild(renderCheck(s)); return; }
      if (i < item.stepIdx) { list.appendChild(renderDone(s)); return; }
      if (i > item.stepIdx) return;
      if (s.type === 'choice') list.appendChild(renderChoice(s));
      else if (s.type === 'action') list.appendChild(renderAction(s));
      else if (s.type === 'pick') list.appendChild(renderPick(s));
    });
    el.card.appendChild(list);

    if (item.done && item.answer) el.card.appendChild(make('p', 'card-answer', item.answer));
    restoreFocus();
  }

  /* Keep keyboard focus where the student was: on the same option after a
     re-render, on the first control of a new step, or on Next when done. */
  function restoreFocus() {
    if (item.done) return;
    var target = focusKey ? el.card.querySelector('[data-fk="' + focusKey + '"]') : null;
    if (!target || target.disabled) {
      target = el.card.querySelector('.step.current button:not([disabled])');
    }
    if (target && el.screen.hidden) {
      try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
      if (target.scrollIntoView) target.scrollIntoView({ block: 'nearest' });
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
      s.answer = o.summary || o.label;
      if (s.onRight) s.onRight(item, s);
      say(s.rightMsg ? 'Correct. ' + s.rightMsg : 'Correct.', 'good');
      advance();
      return;
    }
    o.tried = true;
    s.missed = true;
    item.clean = false;
    say(o.why || 'Not that one. Try again.', 'bad');
    paintCard();
  }

  function answerAction(s) {
    if (s.onRight) s.onRight(item, s);
    say(s.rightMsg || '', 'good');
    advance();
  }

  function answerPick(s, sym) {
    if (sym === s.right) {
      s.answer = sym;
      say('Correct. ' + s.rightMsg, 'good');
      advance();
      return;
    }
    s.tried[sym] = true;
    s.missed = true;
    item.clean = false;
    say(sym + ' is in group ' + Atom.group(sym) + ', row ' + Atom.row(sym) + '. You are looking for group ' +
        Atom.group(s.right) + ', row ' + Atom.row(s.right) + '.', 'bad');
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
      say('Not quite. The answer is “' + s.right + '.” ' + s.why, 'bad');
    }
    finishItem();
    paintCard();
    showNext();
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

  /* A missed check earns a different question on the same idea: two items
     later in Part 2, or at the end of the checkpoint. */
  function scheduleFollowUp() {
    var list = state.plan[state.part];
    var extras = list.filter(function (c) { return flagsOf(c).indexOf('+') >= 0; }).length;
    if (extras >= MAX_FOLLOWUPS || !item.tag) return;
    var q = Plan.followUp(item.tag, state.plan, (state.seed ^ hash(item.code) ^ state.index) >>> 0);
    if (!q) return;
    if (item.checkpoint) list.push('!+' + q);
    else list.splice(Math.min(state.index + 3, list.length), 0, '+' + q);
  }

  /* ------------------------------------------------------------ progression */

  function buildItem() {
    return Items.build(state.plan[state.part][state.index], state.seed, state.index);
  }

  function startItem() {
    item = buildItem();
    focusKey = null;
    say('');
    render();
  }

  function nextItem() {
    var list = state.plan[state.part];
    state.index++;
    if (state.index >= list.length) {
      completePart();
      return;
    }
    item = null;
    persist();
    startItem();
  }

  function completePart() {
    var finished = PARTS[state.part - 1];
    if (state.part < PARTS.length) {
      state.unlocked = Math.max(state.unlocked, state.part + 1);
      state.part++;
      state.index = 0;
      item = null;
      persist();
      showScreen('part', finished);
      return;
    }
    state.index = state.plan[state.part].length - 1;
    persist();
    SCORM.markComplete();
    showScreen('finish');
  }

  function goToPart(n) {
    if (n > state.unlocked || n === state.part) return;
    state.part = n;
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
    return st.clean + ' of ' + st.items + ' data questions done with no mistakes, and ' +
           st.checksRight + ' of ' + st.checks + ' checks right the first time.';
  }

  function ruleBox() {
    var rule = make('div', 'rule');
    rule.appendChild(make('p', null, 'Step 1. Count the OCCUPIED energy levels. If they are different, that settles it: fewer occupied levels means the electron is closer and held more tightly.'));
    rule.appendChild(make('p', null, 'Step 2. Only if the occupied levels are the same do the protons decide: more protons, a stronger pull.'));
    return rule;
  }

  function showScreen(kind, finished) {
    var s = el.screen;
    s.innerHTML = '';
    s.hidden = false;
    var box = make('div', 'screen-box');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');

    if (kind === 'intro') {
      box.setAttribute('aria-labelledby', 'introTitle');
      var h = make('h2', null, 'Successive ionization energies');
      h.id = 'introTitle';
      box.appendChild(h);
      box.appendChild(make('p', null, 'You can keep pulling electrons off the same atom. Each one costs more than the last, and at one point the cost explodes. Every answer here comes from the two-step rule in your packet:'));
      box.appendChild(ruleBox());
      box.appendChild(make('p', 'law', 'The attraction is directly proportional to the nuclear charge. The attraction is inversely proportional to the distance squared.'));
      var ul = make('ul', 'screen-list');
      PARTS.forEach(function (P) {
        var li = make('li', null);
        li.appendChild(make('strong', null, 'Part ' + P.n + ', ' + P.name + ': '));
        li.appendChild(document.createTextNode(P.blurb));
        ul.appendChild(li);
      });
      box.appendChild(ul);
      box.appendChild(make('p', 'screen-note',
        'About 10 minutes. Wrong answers are not penalised: read the explanation and try again. Your progress saves as you go.'));
      var resumed = state.index > 0 || state.part > 1;
      var start = button('primary', resumed ? 'Continue' : 'Start');
      start.addEventListener('click', function () { hideScreen(); restoreFocus(); });
      box.appendChild(start);
      s.appendChild(box);
      start.focus();
      return;
    }

    if (kind === 'part') {
      box.appendChild(make('h2', null, 'Part ' + finished.n + ' complete'));
      box.appendChild(make('p', null, statsLine()));
      var P = PARTS[state.part - 1];
      box.appendChild(make('p', 'screen-note', 'Next, Part ' + P.n + ', ' + P.name + ': ' + P.blurb));
      var go = button('primary', 'Start Part ' + P.n);
      go.addEventListener('click', function () { hideScreen(); startItem(); });
      box.appendChild(go);
      s.appendChild(box);
      go.focus();
      return;
    }

    box.appendChild(make('h2', null, 'All parts complete'));
    box.appendChild(make('p', null, statsLine()));
    box.appendChild(make('p', null, 'The whole activity was one idea. Each ionization energy is a little larger than the last because the particle is more positive each time. The huge jump comes when the outer level is empty and the next electron has to come from the occupied level underneath, closer to the nucleus.'));
    box.appendChild(make('p', 'screen-note', state.preview
      ? 'Teacher preview: nothing was saved or reported.'
      : SCORM.isConnected()
        ? 'Your completion has been sent to the gradebook. You may close this window.'
        : 'Running outside an LMS: nothing was reported.'));
    var again = button('primary', 'Try again with new elements');
    again.addEventListener('click', function () {
      var preview = state.preview;
      state = newRun();
      state.preview = preview;
      if (preview) state.unlocked = PARTS.length;
      item = null;
      persist();
      hideScreen();
      startItem();
    });
    box.appendChild(again);
    s.appendChild(box);
    again.focus();
  }

  /* ----------------------------------------------------------- interaction */

  function onCardClick(ev) {
    var t = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!t || t.disabled || !item) return;
    var act = t.dataset.act;
    var s = item.steps[item.stepIdx];
    focusKey = t.dataset.fk || null;
    if (act === 'opt') answerChoice(s, +t.dataset.i);
    else if (act === 'do') answerAction(s);
    else if (act === 'pick') answerPick(s, t.dataset.sym);
    else if (act === 'check') answerCheck(item.steps[0], +t.dataset.i);
  }

  /* ------------------------------------------------------------------ boot */

  function cacheDom() {
    ['card', 'feedback', 'next', 'tabs', 'partName', 'blurb', 'counter', 'screen', 'stage',
     'lms', 'flowRule', 'flowData', 'ptSide'].forEach(function (id) { el[id] = $(id); });
  }

  function start() {
    cacheDom();

    var connected = SCORM.init();
    var params = new URLSearchParams(location.search);
    var preview = parseInt(params.get('part'), 10);
    var element = params.get('element');

    if (preview >= 1 && preview <= PARTS.length) {
      state = newRun({ strip: element });
      state.preview = true;
      state.unlocked = PARTS.length;
      state.part = preview;
      el.lms.textContent = 'Teacher preview: nothing saved';
      el.lms.className = 'lms off';
    } else {
      state = restore(SCORM.loadState()) || newRun();
      el.lms.textContent = connected ? 'Connected to the LMS' : 'Standalone: no LMS detected';
      el.lms.className = 'lms ' + (connected ? 'on' : 'off');
    }

    /* A save taken after the last item of a part was finished points one
       past the end: move on to the next part. */
    if (state.index >= state.plan[state.part].length) {
      if (state.part < PARTS.length) {
        state.unlocked = Math.max(state.unlocked, state.part + 1);
        state.part++;
        state.index = 0;
      } else {
        state.index = state.plan[state.part].length - 1;
      }
    }

    /* Write the run out before the first answer, so a student who opens and
       closes the activity comes back to the same elements. */
    persist();

    item = buildItem();
    render();

    el.card.addEventListener('click', onCardClick);
    el.next.addEventListener('click', nextItem);
    el.tabs.addEventListener('click', function (ev) {
      var tab = ev.target.closest('.tab');
      if (tab && !tab.disabled) goToPart(+tab.dataset.part);
    });

    showScreen('intro');
  }

  return { start: start };
})();

document.addEventListener('DOMContentLoaded', Game.start);

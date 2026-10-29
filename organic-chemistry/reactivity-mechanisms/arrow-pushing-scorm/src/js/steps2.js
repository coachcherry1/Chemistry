/* steps2.js: Parts 3 and 4.
 *
 *   read        a curved arrow played; five drawings judged by Klein's rules
 *   draw        draw the arrows of each scene; when they are right the step
 *               plays (electrons riding the arrows, bonds breaking and
 *               forming, the energy ledger), then a sentence in words
 *   stable      methyl < 1° < 2° < 3°, and hyperconjugation
 *   rearrange   will this carbocation rearrange? (Klein SkillBuilder 6.6)
 *   name        read the arrows and name the pattern
 *   sequence    Klein Figure 6.31: name and draw each of four steps while
 *               the energy diagram grows, then play the whole mechanism
 *   concerted   two patterns in one step; a three-step sequence read
 */

(function () {
  'use strict';

  var U = App.U, h = U.h, R = App.RENDER, P = App.PREDICT;
  var SC = SCENES.S;
  var el = Render.el;
  var PN = Chem.PATTERN;
  var NAMES = ['nuc', 'lg', 'pt', 'shift'];

  function stage() { return U.stage(); }
  function f1(v) { return (+v).toFixed(1); }

  /* ======================================================= say it in words */

  /* After a step plays: one sentence, its blanks filled from word tiles.
     Each sentence's words are the vocabulary of its pattern. */
  var SAY = {
    brAttack: ['Bromide is the ', 0, '; the carbocation is the ', 1, '.', ['nucleophile', 'electrophile', 'leaving group', 'intermediate']],
    acylAttack: ['The O of methanol is the ', 0, '. The pi bond’s pair moves onto O, so the carbon never has a ', 1, '.', ['nucleophile', 'fifth bond', 'electrophile', 'lone pair']],
    brLoss: ['The C–Br bond breaks ', 0, ': Br⁻ leaves with both electrons as the ', 1, '.', ['heterolytically', 'leaving group', 'homolytically', 'nucleophile']],
    tetLoss: ['The O⁻ pushes a pair down to re-form the C=O, which pushes out Cl⁻, the ', 0, '. One pattern: loss of a leaving group, drawn with ', 1, ' arrows.', ['leaving group', 'two', 'nucleophile', 'three']],
    protKetone: ['Acetone acts as a ', 0, ' and takes a ', 1, ' from H₃O⁺.', ['base', 'proton', 'nucleophile', 'hydride']],
    deprotKetone: ['Water acts as a ', 0, '. The O–H pair stays behind on O: a proton moves ', 1, ' its electrons.', ['base', 'without', 'leaving group', 'with']],
    alkeneH3O: ['The ', 0, ' is the base. The new carbocation is ', 1, ', the more stable one.', ['pi bond', 'tertiary', 'lone pair', 'primary']],
    shiftH: ['A ', 0, ': the H moves with its pair, and a 2° carbocation becomes a more stable ', 1, ' one.', ['hydride shift', '3°', 'methyl shift', '1°']],
    shiftMe: ['A ', 0, ': the CH₃ moves with its pair to the C⁺. That is a carbocation ', 1, '.', ['methyl shift', 'rearrangement', 'hydride shift', 'proton transfer']],
    sn2: ['Two patterns at the same time, in one step: a ', 0, ' step, with one ', 1, ' and no intermediate.', ['concerted', 'transition state', 'stepwise', 'carbocation']]
  };

  function sayIt(id, pr, done) {
    var sp = SAY[id];
    if (!sp) { done(); return h('div'); }
    var parts = sp.slice(0, -1), words = sp[sp.length - 1];
    var answers = parts.filter(function (x) { return typeof x === 'number'; }).map(function (n) { return words[n]; });
    var got = pr['say' + id] = pr['say' + id] || [];
    var box = h('div', { class: 'say-it' });
    var picker = null;
    function paint() {
      box.innerHTML = '';
      if (picker) { picker.destroy(); picker = null; }
      var line = h('p', { class: 'say-line' });
      var blank = 0;
      parts.forEach(function (x) {
        if (typeof x === 'string') { line.appendChild(document.createTextNode(x)); return; }
        var b = blank++;
        line.appendChild(h('span', { class: 'drop say-blank' + (got[b] ? ' filled' : ''), 'data-drop': String(b), tabindex: 0, role: 'button',
          'aria-label': got[b] ? 'Filled: ' + got[b] : 'Blank ' + (b + 1) }, [got[b] || '      ']));
      });
      var tray = h('div', { class: 'tray small' });
      U.shuffle(words, U.rng(U.hash(id))).forEach(function (w) {
        if (got.indexOf(w) >= 0) return;
        tray.appendChild(h('button', { type: 'button', class: 'tile term', 'data-tile': w, text: w }));
      });
      box.appendChild(h('p', { class: 'say-kicker', text: 'Say it in words' }));
      box.appendChild(line);
      if (got.filter(Boolean).length < answers.length) box.appendChild(tray);
      picker = new Picker({
        tray: tray, stage: line,
        label: function (w) { return w; },
        prompt: function (w) { return 'Now choose the blank for “' + w + '”.'; },
        say: function (t) { U.say(t, ''); },
        drop: function (b, w) {
          b = +b;
          if (got[b]) return;
          if (answers[b] === w) {
            got[b] = w; U.persist();
            if (got.filter(Boolean).length === answers.length) { U.say('Said in words.', 'good'); paint(); done(); return; }
            paint();
          } else U.say('“' + w + '” does not fit there. Read the sentence again with the animation in mind.', 'bad');
        }
      });
    }
    paint();
    if (got.filter(Boolean).length === answers.length) setTimeout(done, 0);
    box.destroy = function () { if (picker) picker.destroy(); };
    return box;
  }

  /* ============================================================== read */

  function rulesList() {
    return h('ul', { class: 'keylist' }, [
      h('li', { text: 'The tail goes on a lone pair or on a bond: the only places electrons are. Never on a positive charge.' }),
      h('li', { text: 'The head shows a new bond, or a new lone pair.' }),
      h('li', { text: 'Never give C, N or O more than four orbitals: no fifth bond.' }),
      h('li', { text: 'Every arrow you draw should be part of one of the four patterns.' })
    ]);
  }

  R.read = function (s) {
    var pr = U.progress(s.id);
    pr.c = pr.c || {};
    var demo = U.playerBox(SC.demoPT, { scale: 44 });
    stage().appendChild(h('div', { class: 'work' }, [
      U.panel('A curved arrow, played', 'Klein 6.8', [demo.node]),
      U.panel('Klein’s rules for curved arrows', '6.10', [h('p', { class: 'muted', text: 'Each curved arrow moves one pair of electrons: from the tail (where they are) to the head (where they go).' }), rulesList()])
    ]));
    var box = h('div', { class: 'cards' });
    stage().appendChild(U.panel('Follows the rules, or breaks one?', null, [box]));
    function verdictOf(r) { return Chem.apply(SC[r.scene].before, r.arrows).err ? 1 : 0; }
    function paint() {
      box.innerHTML = '';
      SCENES.RULES.forEach(function (r) {
        var sc = SC[r.scene], ans = verdictOf(r);
        var row = U.choiceRow(['Follows the rules', 'Breaks a rule'], ans, pr.c[r.id], function (i) {
          pr.c[r.id] = i; U.persist();
          var res = Chem.apply(sc.before, r.arrows);
          var why = res.err ? Judge.ruleText(sc, sc.before, res) : 'These arrows follow every rule: a nucleophile’s lone pair makes a new bond as the C–Cl pair leaves onto Cl, so carbon never has five bonds.';
          if (i === ans) {
            if (SCENES.RULES.every(function (x) { return pr.c[x.id] === verdictOf(x); })) U.complete(why + ' All five judged.');
            else U.say(why, 'good');
          } else U.say('Check the tail first (lone pair or bond?), then count the bonds and lone pairs on the atom the head points at.', 'bad');
          paint();
        });
        box.appendChild(h('div', { class: 'card' }, [h('div', { class: 'mol-wrap' }, [Arrows.figure(sc, r.arrows, { scale: 32, label: r.label })]),
          h('p', { class: 'muted', text: r.label }), row]));
      });
    }
    paint();
    return { destroy: function () { demo.slider.stop(); } };
  };

  /* ============================================================== draw */

  /* Klein's hole analogy (6.8): digging a new hole fills the old one. */
  function holePic() {
    var s = Render.svg('hole', 'The hole analogy for a carbocation rearrangement');
    s.setAttribute('viewBox', '0 0 300 110');
    function set(p) {
      s.innerHTML = '';
      var m = Render.seg(p, 0.15, 0.85);
      el('path', { d: 'M10 60 H290', class: 'ground' }, s);
      /* hole 1 fills, hole 2 opens */
      el('path', { d: 'M70 60 Q100 ' + f1(60 + 30 * (1 - m)) + ' 130 60', class: 'hole' }, s);
      el('path', { d: 'M170 60 Q200 ' + f1(60 + 30 * m) + ' 230 60', class: 'hole' }, s);
      var x = 200 - 100 * m, y = 52 - Math.sin(m * Math.PI) * 30;
      el('circle', { cx: f1(x), cy: f1(y), r: 8, class: 'dirt' }, s);
      el('text', { x: 100, y: 100, 'text-anchor': 'middle', class: 'pic-note' }, s, m < 0.5 ? 'C⁺: the hole' : 'filled');
      el('text', { x: 200, y: 100, 'text-anchor': 'middle', class: 'pic-note' }, s, m < 0.5 ? 'H and its pair' : 'the new C⁺');
    }
    set(0);
    return { node: s, set: set };
  }

  R.draw = function (s) {
    var pr = U.progress(s.id);
    var ids = s.scenes;
    var k = pr.k || 0;
    var left = h('div'), right = h('div');
    var top = h('div');
    stage().appendChild(top);
    stage().appendChild(h('div', { class: 'work work-wide' }, [left, right]));
    var live = [];
    if (s.hole) {
      var hp = holePic(), hs = U.slider(hp.set, { from: '', to: '', ms: 2600 });
      live.push(hs);
      top.appendChild(U.panel('Klein’s analogy', 'a hole in the ground', [h('div', { class: 'work' }, [h('div', { class: 'mol-wrap' }, [hp.node]),
        h('p', { class: 'muted', text: 'A carbocation is a hole: a place where electron density is missing. Digging a new hole next door, and using its dirt to fill the first, leaves a new hole. In a hydride shift the H moves over with its pair of electrons and fills the empty p orbital; the carbon it left becomes the new C⁺. It only happens when the new carbocation is more stable.' })]), hs.node]));
    }
    function isDone(i) { return !!pr['a' + i] && !!pr['w' + i]; }
    function paint() {
      left.innerHTML = ''; right.innerHTML = '';
      live.slice(s.hole ? 1 : 0).forEach(function (x) { if (x.stop) x.stop(); if (x.destroy) x.destroy(); });
      live = live.slice(0, s.hole ? 1 : 0);
      var sc = SC[ids[k]];
      var chips = U.chipRow('Step', ids.map(function (id) { return SC[id].title; }), k, isDone, function (i) { return i === 0 || isDone(i - 1); },
        function (i) { k = i; pr.k = i; U.persist(); paint(); });
      var ab = U.arrowBox(sc, pr, 'a' + k, function (fresh) { showAfter(sc, fresh); });
      left.appendChild(U.panel(sc.title, 'draw the arrows', [chips, ab.node]));
      if (!pr['a' + k]) right.appendChild(U.panel('Then watch it happen', null, [h('p', { class: 'muted', text: 'Draw the curved arrows and press Check. When they are right, the step plays here: the electrons ride your arrows, bonds break and form, and the charges move.' }),
        rulesList()]));
    }
    function showAfter(sc, fresh) {
      right.innerHTML = '';
      var pb = U.playerBox(sc, { scale: 40 });
      live.push(pb.slider);
      var say = sayIt(sc.id, pr, function () {
        if (!pr['w' + k]) { pr['w' + k] = 1; U.persist(); }
        if (ids.every(function (x, i) { return isDone(i); })) { if (!U.isDone(s.id)) U.complete('All ' + ids.length + ' drawings done: every one is ' + Chem.PATTERN[sc.patterns[0]].toLowerCase() + '.'); }
        else if (fresh && k < ids.length - 1) {
          var nx = h('button', { type: 'button', class: 'primary', text: 'Next drawing →', onclick: function () { k++; pr.k = k; U.persist(); paint(); } });
          right.appendChild(h('div', { class: 'btnrow' }, [nx]));
        }
      });
      live.push(say);
      right.appendChild(U.panel('Watch it happen', Chem.PATTERN[sc.patterns[0]] + (sc.patterns.length > 1 ? ' + ' + Chem.PATTERN[sc.patterns[1]].toLowerCase() : ''), [pb.node, say]));
      if (fresh && !U.reduceMotion) setTimeout(function () { pb.slider.play.click(); }, 300);
    }
    paint();
    return { destroy: function () { live.forEach(function (x) { if (x.stop) x.stop(); if (x.destroy) x.destroy(); }); } };
  };

  /* ============================================================ stable */

  function hyperPic() {
    var s = Render.svg('hyper', 'Hyperconjugation: a neighbouring C–H bond shares electron density with the empty p orbital');
    s.setAttribute('viewBox', '0 0 300 170');
    el('ellipse', { cx: 190, cy: 50, rx: 16, ry: 38, class: 'lobe empty' }, s);
    el('ellipse', { cx: 190, cy: 122, rx: 16, ry: 38, class: 'lobe empty' }, s);
    el('ellipse', { cx: 140, cy: 56, rx: 14, ry: 30, class: 'lobe full', transform: 'rotate(-12 140 56)' }, s);
    el('ellipse', { cx: 166, cy: 52, rx: 26, ry: 14, class: 'share' }, s);
    el('line', { x1: 140, y1: 86, x2: 190, y2: 86, class: 'm-bond' }, s);
    el('line', { x1: 140, y1: 86, x2: 140, y2: 40, class: 'm-bond' }, s);
    el('line', { x1: 140, y1: 86, x2: 104, y2: 118, class: 'm-bond' }, s);
    el('line', { x1: 140, y1: 86, x2: 112, y2: 70, class: 'm-bond' }, s);
    el('line', { x1: 190, y1: 86, x2: 232, y2: 110, class: 'm-bond' }, s);
    el('line', { x1: 190, y1: 86, x2: 232, y2: 66, class: 'm-bond' }, s);
    [[140, 34, 'H'], [100, 126, 'H'], [106, 70, 'H'], [240, 116, 'H'], [240, 66, 'H']].forEach(function (q) {
      el('text', { x: q[0], y: q[1], 'text-anchor': 'middle', class: 'm-label tone-h' }, s, q[2]);
    });
    el('circle', { cx: 208, cy: 92, r: 6.2, class: 'm-charge-ring' }, s);
    el('text', { x: 208, y: 96, class: 'm-charge', 'text-anchor': 'middle' }, s, '+');
    el('text', { x: 150, y: 162, 'text-anchor': 'middle', class: 'pic-note' }, s, 'the C–H bond leans its electron density into the empty p orbital');
    return s;
  }

  R.stable = function (s) {
    var pr = U.progress(s.id);
    var area = h('div');
    stage().appendChild(U.predictBox(P.order3, pr, 'p',
      'Tertiary. Each alkyl group on the C⁺ shares a little electron density with its empty p orbital, which stabilizes it (hyperconjugation). ' +
      'More alkyl groups, more help: methyl < primary < secondary < tertiary.', function () { paint(); U.showArea(area); }));
    stage().appendChild(area);
    var ORDER = ['cat0', 'cat1', 'cat2', 'cat3'];
    function paint() {
      area.innerHTML = '';
      if (pr.p == null) return;
      var got = pr.o = pr.o || [];
      var cards = h('div', { class: 'cards' });
      U.shuffle(ORDER, U.rng(U.seed() ^ 3)).forEach(function (id) {
        var n = got.indexOf(id);
        var b = h('button', { type: 'button', class: 'card rank' + (n >= 0 ? ' done' : ''), disabled: n >= 0 }, [
          h('div', { class: 'mol-wrap' }, [Render.draw(SC[id].before, { scale: 40, label: SC[id].title + ' carbocation' })]),
          h('span', { class: 'rank-no', text: n >= 0 ? String(n + 1) : '' }),
          h('p', { class: 'muted', text: n >= 0 ? SC[id].title : 'carbocation' })
        ]);
        b.addEventListener('click', function () {
          var want = ORDER[got.length];
          var c = SC[id].before;
          var plus = c.atoms.filter(function (a) { return Chem.isCation(c, a.id); })[0].id;
          if (id === want) {
            got.push(id); U.persist();
            if (got.length === 4) U.complete('Methyl < 1° < 2° < 3°: the more carbons on the C⁺, the more hyperconjugation, the more stable.');
            else U.say('Right: ' + Chem.degree(c, plus) + ' carbon' + (Chem.degree(c, plus) === 1 ? '' : 's') + ' on the C⁺. Next least stable?', 'good');
            paint();
          } else U.say('Not yet: count the carbons bonded to the C⁺ (here ' + Chem.degree(c, plus) + '). Fewer carbons, less stable: start with the fewest.', 'bad');
        });
        cards.appendChild(b);
      });
      area.appendChild(h('div', { class: 'work' }, [U.panel('Least stable first', 'tap them in order', [cards]),
        U.panel('Hyperconjugation', 'Klein Figure 6.29', [h('div', { class: 'mol-wrap' }, [hyperPic()])])]));
    }
    paint();
  };

  /* ========================================================= rearrange */

  function shiftAnswer(id) {
    var st = SC[id].before;
    var plus = st.atoms.filter(function (a) { return Chem.isCation(st, a.id); })[0].id;
    var b = Chem.bestShift(st, plus);
    return b ? (b.kind === 'H' ? 0 : 1) : 2;
  }

  R.rearrange = function (s) {
    var pr = U.progress(s.id);
    var ids = s.mols;
    var k = pr.k || 0;
    var area = h('div');
    stage().appendChild(area);
    var live = null, playNow = false;
    function S(i) { pr['m' + i] = pr['m' + i] || { nb: [], ans: null }; return pr['m' + i]; }
    function plusOf(st) { return st.atoms.filter(function (a) { return Chem.isCation(st, a.id); })[0].id; }
    function nbs(i) { var st = SC[ids[i]].before; return Chem.neighbours(st, plusOf(st)).map(function (n) { return n.id; }); }
    function isDone(i) { return S(i).ans === shiftAnswer(ids[i]); }
    function paint() {
      area.innerHTML = '';
      if (live) { live.stop(); live = null; }
      var id = ids[k], sc = SC[id], st = sc.before, m = S(k), want = nbs(k), plus = plusOf(st);
      var svg = Render.draw(st, { scale: 44, label: sc.title, hot: (function () { var o = {}; o[plus] = 'plus'; return o; })() });
      var labels = {};
      st.atoms.forEach(function (a) { if (a.id !== plus) labels[a.id] = Judge.name({}, st, a.id); });
      var mark = null;
      if (m.nb.length < want.length) {
        mark = (function () {
          var g = el('g', { class: 'm-picks' }, svg);
          Object.keys(labels).forEach(function (a) {
            var p = svg._geo.P[a];
            var t = el('g', { class: 'drop m-pick' + (m.nb.indexOf(a) >= 0 ? ' found' : ''), 'data-drop': a, tabindex: 0, role: 'button', 'aria-label': labels[a] }, g);
            el('circle', { cx: f1(p[0]), cy: f1(p[1]), r: 13, class: 'slot-box' }, t);
          });
          function go(ev) {
            var d = ev.target.closest && ev.target.closest('.m-pick');
            if (!d) return;
            var a = d.getAttribute('data-drop');
            if (want.indexOf(a) >= 0 && m.nb.indexOf(a) < 0) { m.nb.push(a); U.persist(); U.say('A neighbour of the C⁺. What does it carry: H atoms, CH₃ groups?', 'good'); paint(); }
            else if (want.indexOf(a) < 0) U.say('That carbon is not bonded to the C⁺. Step 1: only the carbons right next to it.', 'bad');
          }
          svg.addEventListener('click', go);
          svg.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(ev); } });
          return true;
        })();
      } else {
        var g2 = el('g', { class: 'm-picks' }, svg);
        want.forEach(function (a) { var p = svg._geo.P[a]; var t = el('g', { class: 'm-pick found' }, g2); el('circle', { cx: f1(p[0]), cy: f1(p[1]), r: 13, class: 'slot-box' }, t); });
      }
      void mark;
      var chips = U.chipRow('Carbocation', ids.map(function (x, i) { return String(i + 1); }), k, isDone, function (i) { return i === 0 || isDone(i - 1); },
        function (i) { k = i; pr.k = i; U.persist(); paint(); });
      var ans = shiftAnswer(id);
      var side = h('div');
      side.appendChild(h('ul', { class: 'checklist' }, [
        h('li', { class: m.nb.length === want.length ? 'done' : '', text: '1. Click every carbon next to the C⁺ (' + m.nb.length + ' of ' + want.length + ')' }),
        h('li', { class: m.ans === ans ? 'done' : '', text: '2. Would moving an H or a CH₃ from one of them make a more stable carbocation?' })
      ]));
      if (m.nb.length === want.length) {
        side.appendChild(U.choiceRow(['Yes: a hydride shift', 'Yes: a methyl shift', 'No: it stays as it is'], ans, m.ans, function (c) {
          m.ans = c; U.persist();
          var deg = Chem.degree(st, plus);
          var why = ans === 2 ? 'No shift: ' + (deg === 3 ? 'it is already 3°.' : 'moving an H or a CH₃ from either neighbour gives a carbocation that is no more stable than this ' + deg + '° one.')
                              : (ans === 0 ? 'A hydride shift: the H moves with its pair and the ' + deg + '° carbocation becomes 3°.'
                                           : 'A methyl shift: the CH₃ moves with its pair and the ' + deg + '° carbocation becomes 3°.');
          if (c === ans) {
            playNow = ans !== 2;
            if (ids.every(function (x, i) { return isDone(i); })) U.complete(why + ' All six decided.');
            else U.say(why, 'good');
          } else U.say('For each neighbour: if its H (or CH₃) moved to the C⁺, the neighbour would become the new C⁺. How many carbons would it carry?', 'bad');
          paint();
        }));
      }
      var anim = h('div');
      if (m.ans === ans && ans !== 2) {
        var shs = SCENES.shiftScene(id);
        var pl = Render.Player(shs, { scale: 40 });
        live = U.slider(pl.set, { ms: 2600 });
        anim.appendChild(h('div', { class: 'mol-wrap anim' }, [pl.node]));
        anim.appendChild(live.node);
        /* it starts from the cation; it plays by itself right after a right answer */
        if (playNow && !U.reduceMotion) { var go = live.play; setTimeout(function () { go.click(); }, 300); }
      }
      playNow = false;
      area.appendChild(U.panel(sc.title, 'Klein SkillBuilder 6.6', [chips, h('div', { class: 'work' }, [h('div', { class: 'mol-wrap big' }, [svg]), h('div', null, [side, anim])])]));
    }
    paint();
    return { destroy: function () { if (live) live.stop(); } };
  };

  /* ============================================================== name */

  R.name = function (s) {
    var pr = U.progress(s.id);
    pr.c = pr.c || {};
    var box = h('div', { class: 'cards wide' });
    stage().appendChild(U.panel('Read the arrows', 'name each pattern', [box]));
    function ans(id) { return NAMES.indexOf(SC[id].patterns[0]); }
    function paint() {
      box.innerHTML = '';
      U.shuffle(s.scenes, U.rng(U.seed() ^ 23)).forEach(function (id) {
        var sc = SC[id];
        var row = U.choiceRow(NAMES.map(function (x) { return PN[x]; }), ans(id), pr.c[id], function (i) {
          pr.c[id] = i; U.persist();
          var what = sc.picks.map(function (m) { return Judge.describe(sc, sc.before, m); }).join('; ');
          if (i === ans(id)) {
            var msg = U.capFirst(what) + '. ' + PN[sc.patterns[0]] + '.';
            if (s.scenes.every(function (x) { return pr.c[x] === ans(x); })) U.complete(msg + ' All named.');
            else U.say(msg, 'good');
          } else U.say('Read each arrow: ' + what + '. Does an H move (and without its electrons)? Does a bond to a group break? Does a new bond form to an electrophile? Does a group shift to a C⁺?', 'bad');
          paint();
        });
        box.appendChild(h('div', { class: 'card' }, [h('div', { class: 'mol-wrap' }, [Arrows.figure(sc, sc.arrows, { scale: 30 })]),
          h('p', { class: 'muted', text: sc.title }), row]));
      });
    }
    paint();
  };

  /* ========================================================== sequence */

  R.sequence = function (s) {
    var pr = U.progress(s.id);
    var steps = SC[s.chain];
    var k = 0;
    while (k < steps.length - 1 && pr['a' + k]) k++;
    var fig = h('div'), left = h('div'), right = h('div'), bottom = h('div');
    stage().appendChild(fig);
    stage().appendChild(h('div', { class: 'work work-wide' }, [left, right]));
    stage().appendChild(bottom);
    var live = [];
    function doneCount() { var n = 0; steps.forEach(function (x, i) { if (pr['a' + i]) n++; }); return n; }
    /* Klein's Figure 6.31: every structure in a row; each step's curved arrows and
       the name of its pattern appear once the student has drawn it */
    function paintFigure() {
      fig.innerHTML = '';
      var row = h('div', { class: 'fig-row' });
      steps.forEach(function (x, i) {
        var done = !!pr['a' + i];
        row.appendChild(h('div', { class: 'fig-mol' }, [Render.draw(x.before, { scale: 24, arrows: done ? x.arrows : null,
          label: i ? 'Intermediate ' + i : '3,3-Dimethylbutan-2-ol and HBr' })]));
        row.appendChild(h('div', { class: 'fig-step' + (done ? ' done' : '') }, [h('span', { class: 'fig-name', text: done ? PN[x.patterns[0]] : 'Step ' + (i + 1) }),
          h('span', { class: 'fig-arrow', 'aria-hidden': 'true', text: '⟶' })]));
      });
      row.appendChild(h('div', { class: 'fig-mol' }, [Render.draw(steps[steps.length - 1].after, { scale: 24, label: '2-Bromo-2,3-dimethylbutane and water' })]));
      fig.appendChild(U.panel('Klein Figure 6.31', 'all four patterns in one mechanism', [row,
        h('p', { class: 'muted', text: 'The overall reaction: 3,3-dimethylbutan-2-ol and HBr give 2-bromo-2,3-dimethylbutane. Each curved arrow and pattern name appears here once you have drawn that step.' })]));
    }
    function paint() {
      left.innerHTML = '';
      live.forEach(function (x) { x.stop(); }); live = [];
      var chips = U.chipRow('Step', steps.map(function (x, i) { return String(i + 1); }), k, function (i) { return !!pr['a' + i]; },
        function (i) { return i === 0 || !!pr['a' + (i - 1)]; }, function (i) { k = i; paint(); });
      var sc = steps[k];
      var ans = NAMES.indexOf(sc.patterns[0]);
      var body = [chips];
      body.push(h('p', { class: 'q-text', text: 'Step ' + (k + 1) + ': which pattern comes next?' }));
      body.push(U.choiceRow(NAMES.map(function (x) { return PN[x]; }), ans, pr['n' + k], function (i) {
        pr['n' + k] = i; U.persist();
        U.say(i === ans ? PN[sc.patterns[0]] + '. Now draw its arrows.' : ['Look at what has to happen first: the OH is a poor leaving group until it is protonated.',
          'The O now carries a + charge: water is a good leaving group.', 'A 2° carbocation sits next to a carbon with three CH₃ groups.',
          'The carbocation is now 3°, and Br⁻ is waiting.'][k], i === ans ? 'good' : 'bad');
        paint();
      }));
      if (pr['n' + k] === ans) {
        var ab = U.arrowBox(sc, pr, 'a' + k, function (fresh) {
          paintFigure();
          paintRight();
          if (doneCount() === steps.length) { if (!U.isDone(s.id)) U.complete('All four patterns in one mechanism. Play the whole thing below.'); paintBottom(); }
          else if (fresh) { k++; paint(); U.say(PN[sc.patterns[0]] + ': done. On to step ' + (k + 1) + '.', 'good'); }
        });
        body.push(ab.node);
      }
      left.appendChild(U.panel('Step ' + (k + 1) + ' of 4', '3,3-dimethylbutan-2-ol and HBr', body));
      paintFigure();
      paintRight();
      if (doneCount() === steps.length) paintBottom();
    }
    function paintRight() {
      right.innerHTML = '';
      var n = doneCount();
      var prof = SCENES.PROFILES.f631;
      right.appendChild(U.panel('Energy diagram', 'one hill per step', [Energy.draw(prof, { upto: n / steps.length, marker: n / steps.length, axis: 'Potential energy' }),
        h('ol', { class: 'pattern-list' }, steps.map(function (x, i) { return h('li', { text: pr['a' + i] ? PN[x.patterns[0]] : '…' }); })),
        h('p', { class: 'muted', text: 'Four steps, four transition states (peaks) and three intermediates (valleys): the oxonium ion, the 2° carbocation and the 3° carbocation.' })]));
    }
    function paintBottom() {
      bottom.innerHTML = '';
      var cp = Render.ChainPlayer(steps, { scale: 34 });
      var host = h('div', { class: 'graph-host' });
      function drawE(p) { host.innerHTML = ''; host.appendChild(Energy.draw(SCENES.PROFILES.f631, { marker: p, axis: 'Potential energy' })); }
      drawE(0);
      var sl = U.slider(function (p) { var kk = cp.set(p); drawE(p); stepNote.textContent = 'Step ' + (kk + 1) + ': ' + PN[steps[kk].patterns[0]]; }, { ms: 10000, frames: 8 });
      live.push(sl);
      var stepNote = h('p', { class: 'step-note', text: 'Step 1: ' + PN[steps[0].patterns[0]] });
      bottom.appendChild(U.panel('The whole mechanism', 'play it', [h('div', { class: 'work' }, [h('div', null, [h('div', { class: 'mol-wrap anim' }, [cp.node]), stepNote]), host]), sl.node]));
    }
    paint();
    return { destroy: function () { live.forEach(function (x) { x.stop(); }); } };
  };

  /* ========================================================= concerted */

  R.concerted = function (s) {
    var pr = U.progress(s.id);
    pr.q = pr.q || [null, null, null];
    var left = h('div'), right = h('div'), bottom = h('div');
    stage().appendChild(h('div', { class: 'work work-wide' }, [left, right]));
    stage().appendChild(bottom);
    var live = [];
    function check() { if (pr.a0 && pr.wsn && seqDone() && !U.isDone(s.id)) U.complete('One step can hold two patterns (concerted); a mechanism is a sequence of them. Klein: fewer than a dozen sequences cover more than 100 mechanisms.'); }
    function seqDone() { return SC.ester.every(function (x, i) { return pr.q[i] === NAMES.indexOf(x.patterns[0]); }); }
    var ab = U.arrowBox(SC.sn2, pr, 'a0', function (fresh) {
      right.innerHTML = '';
      var pb = U.playerBox(SC.sn2, { scale: 38, ts: { partial: ['O', 'Cl'] } });
      live.push(pb.slider);
      var e = Energy.draw(SCENES.PROFILES.sn2, { axis: 'Potential energy', label: 'One step: one transition state' });
      var say = sayIt('sn2', pr, function () { pr.wsn = 1; U.persist(); check(); paintSeq(); });
      live.push(say);
      right.appendChild(U.panel('One step, two patterns', 'concerted', [pb.node, e, say]));
      if (fresh && !U.reduceMotion) setTimeout(function () { pb.slider.play.click(); }, 300);
    });
    left.appendChild(U.panel(SC.sn2.title, 'draw both arrows', [ab.node]));
    if (!pr.a0) right.appendChild(U.panel('Concerted', null, [h('p', { class: 'muted', text: 'Hydroxide attacks the carbon as chloride leaves. Draw both arrows: one for each pattern.' })]));
    function paintSeq() {
      bottom.innerHTML = '';
      if (!pr.wsn) return;
      var rows = SC.ester.map(function (x, i) {
        var ans = NAMES.indexOf(x.patterns[0]);
        return h('div', { class: 'seq-row' }, [h('figure', null, [Arrows.figure(x, x.arrows, { scale: 28, label: 'Step ' + (i + 1) }), h('figcaption', { text: 'Step ' + (i + 1) })]),
          U.choiceRow(NAMES.map(function (n) { return PN[n]; }), ans, pr.q[i], function (c) {
            pr.q[i] = c; U.persist();
            U.say(c === ans ? 'Step ' + (i + 1) + ': ' + PN[x.patterns[0]].toLowerCase() + '.' : 'Read the arrows of step ' + (i + 1) + ' again: what forms, what breaks, what moves?', c === ans ? 'good' : 'bad');
            check(); paintSeq();
          })]);
      });
      bottom.appendChild(U.panel('A sequence of patterns', 'Klein SkillBuilder 6.4: an ester and hydroxide', rows));
    }
    paintSeq();
    return { destroy: function () { live.forEach(function (x) { if (x.stop) x.stop(); if (x.destroy) x.destroy(); }); } };
  };

  App.SAY = SAY;
  App.shiftAnswer = shiftAnswer;
})();

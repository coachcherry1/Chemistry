/* game.js — levels, interaction, feedback and progression.
 *
 * Level 1  Equivalent H     colour the equivalent groups alike; sets = signals
 * Level 2  Chemical shift   drag each lettered set of H onto its signal
 * Level 3  Integration      compound hidden; integrals + formula -> H per signal
 * Level 4  Splitting        predict each set's multiplicity with n + 1, then see
 *                           the spectrum to check
 * Level 5  Solve it         read shift, integration and splitting together and
 *                           pick the compound
 *
 * Every placement works three ways so it survives a Chromebook trackpad, a
 * touch screen and a keyboard: pointer drag, click-then-click, and Tab +
 * Enter, which takes the same path as a click.
 */

var Game = (function () {
  'use strict';

  /* Bumped whenever the shape of a saved run changes - the level list, the
     draw, or the bank's ids. A save from an older build is discarded rather
     than resumed, otherwise a student carries an out-of-date lineup forward. */
  var SCHEMA = 1;

  var LETTERS = ['a', 'b', 'c', 'd', 'e', 'f'];

  var el = {};
  var state = null;
  var item = null;          /* the item on screen right now */
  var selectedTile = null;  /* click-to-select fallback */
  var drag = null;
  var suppressClick = false; /* a completed drag must not also count as a click */

  /* ---------------------------------------------------------------- helpers */

  function $(id) { return document.getElementById(id); }

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function shuffle(arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function byId(id) {
    for (var i = 0; i < MOLECULES.length; i++) if (MOLECULES[i].id === id) return MOLECULES[i];
    return null;
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* the shift a set is actually drawn at, so messages quote what is on screen */
  function drawnShift(set) {
    var sigs = item.spec.signals;
    for (var i = 0; i < sigs.length; i++) if (sigs[i].set.id === set.id) return sigs[i].d;
    return set.d;
  }
  function at(set) { return 'δ ' + drawnShift(set).toFixed(2); }

  function lineWord(n) { return n === 1 ? '1 line' : n + ' lines'; }

  function half(x) {
    var v = Math.round(x * 2) / 2;
    return v % 1 ? v.toFixed(1) : String(v);
  }

  /* ------------------------------------------------------------- the draw */

  function pickMolecules(cfg, rand, used) {
    var pool = MOLECULES.filter(function (m) { return m.levels.indexOf(cfg.n) >= 0; });
    var chosen = [];

    function take(list) {
      list = list.filter(function (m) { return chosen.indexOf(m) < 0; });
      if (!list.length) return null;
      var fresh = list.filter(function (m) { return used.indexOf(m.id) < 0; });
      if (fresh.length) list = fresh;
      var newFamily = list.filter(function (m) {
        return !chosen.some(function (c) { return c.family === m.family; });
      });
      return shuffle(newFamily.length ? newFamily : list, rand)[0];
    }

    (cfg.needs || []).forEach(function (need) {
      if (chosen.length >= cfg.items || chosen.some(need)) return;
      var pick = take(pool.filter(need));
      if (pick) chosen.push(pick);
    });
    while (chosen.length < cfg.items) {
      var pick = take(pool);
      if (!pick) break;
      chosen.push(pick);
    }
    return shuffle(chosen, rand);
  }

  /* Decoys should force a decision. They are ranked by how alike their
     spectra would be - same number of signals, same integrations, same
     splitting - so ethyl acetate comes up against methyl propanoate and
     2-butanone, where only the shifts decide it. A decoy whose spectrum could
     not be told apart at this level is never offered. */
  function pickDecoys(answer, count, rand) {
    return MOLECULES.filter(function (m) {
      return m.id !== answer.id && !Chem.indistinguishable(m, answer);
    }).map(function (m) {
      return { m: m, score: Chem.similarity(answer, m) + rand() * 2 };
    }).sort(function (a, b) { return b.score - a.score; })
      .slice(0, count).map(function (x) { return x.m; });
  }

  function newRun() {
    var seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    var rand = NMR.rng(seed);
    var plan = {}, used = [];
    LEVELS.forEach(function (L) {
      var ids = pickMolecules(L, rand, used).map(function (m) { return m.id; });
      plan[L.n] = ids;
      used = used.concat(ids);
    });
    return {
      seed: seed, unlocked: 1, level: 1, index: 0, done: [],
      stats: { attempts: 0, firstTry: 0, slots: 0 },
      plan: plan
    };
  }

  function persist() {
    if (state.pin) return;
    SCORM.saveState({
      v: SCHEMA,
      s: state.seed, u: state.unlocked, l: state.level, i: state.index,
      d: state.done, st: state.stats, p: state.plan
    });
  }

  function restore(saved) {
    if (!saved || !saved.p || saved.v !== SCHEMA) return null;
    return {
      seed: saved.s, unlocked: saved.u || 1, level: saved.l || 1, index: saved.i || 0,
      done: saved.d || [], stats: saved.st || { attempts: 0, firstTry: 0, slots: 0 },
      plan: saved.p
    };
  }

  function planIsValid(plan) {
    return LEVELS.every(function (L) {
      return plan[L.n] && plan[L.n].length && plan[L.n].every(function (id) { return byId(id); });
    });
  }

  /* ------------------------------------------------------------- item build */

  /* A pinned compound (?molecule=ethylacetate) is a one-item level, so the
     teacher can put a single named compound on the board during a lesson. */
  function itemCount(level) {
    return state.pin ? 1 : state.plan[level].length;
  }

  function buildItem() {
    var cfg = LEVELS[state.level - 1];
    var mol = state.pin ? byId(state.pin) : byId(state.plan[state.level][state.index]);
    var seed = (state.seed + state.level * 7919 + state.index * 104729) >>> 0;
    var rand = NMR.rng(seed ^ 0x51ed2701);
    var it = { cfg: cfg, mol: mol, sets: Chem.sets(mol), spec: NMR.build(mol, seed),
               phase: 'work', slots: [], tiles: [] };

    if (cfg.key === 'equiv') {
      it.paint = {};     /* atom index -> colour index */
      it.brush = 0;
      it.flags = [];
      it.checks = 0;

    } else if (cfg.key === 'shift' || cfg.key === 'integ') {
      it.slots = it.spec.signals.map(function (sig, i) {
        return { i: i, sig: sig, set: sig.set, filled: false, tries: 0,
                 key: cfg.key === 'shift' ? sig.set.id : String(sig.nH) };
      });
      if (cfg.key === 'shift') {
        it.tiles = it.sets.map(function (s) {
          return { key: s.id, badge: s.id, cls: 'c' + s.index, label: s.text };
        });
      } else {
        var wanted = it.slots.map(function (s) { return s.key; });
        var extra = shuffle(['1', '2', '3', '4', '6', '9'].filter(function (k) {
          return wanted.indexOf(k) < 0;
        }), rand).slice(0, 2);
        it.tiles = wanted.concat(extra).map(function (k) {
          return { key: k, label: k + 'H', distractor: wanted.indexOf(k) < 0 };
        });
      }
      it.tiles = shuffle(it.tiles, rand);

    } else if (cfg.key === 'split') {
      it.slots = it.sets.map(function (s) {
        return { i: s.index, set: s, key: s.mult, filled: false, tries: 0 };
      });
      var need = it.slots.map(function (s) { return s.key; });
      /* distractors one line either side of a real answer: the off-by-one
         slip (n lines instead of n + 1) is the mistake worth catching */
      var near = MULTIPLICITY.slice(0, 7).filter(function (m) {
        return need.indexOf(m) < 0;
      }).map(function (m) {
        var lines = MULTIPLICITY.indexOf(m);
        var gap = Math.min.apply(null, need.map(function (x) {
          return Math.abs(MULTIPLICITY.indexOf(x) - lines);
        }));
        return { m: m, gap: gap + rand() * 0.5 };
      }).sort(function (a, b) { return a.gap - b.gap; }).slice(0, 2).map(function (x) { return x.m; });
      it.tiles = shuffle(need.concat(near).map(function (m) {
        return { key: m, label: m, sub: lineWord(MULTIPLICITY.indexOf(m) + 1),
                 distractor: need.indexOf(m) < 0 };
      }), rand);

    } else {
      it.choices = shuffle([mol].concat(pickDecoys(mol, 2, rand)), rand);
      it.wrong = 0;
    }
    return it;
  }

  /* ---------------------------------------------------------------- painting */

  function setPill(mol) {
    return function (i, a) {
      var s = Chem.setById(mol, a.s);
      return { cls: 'c' + s.index, badge: s.id };
    };
  }

  function paintMol() {
    var key = item.cfg.key, mol = item.mol;
    el.molview.innerHTML = '';
    var show = key === 'equiv' || key === 'shift' || key === 'split';
    el.molview.hidden = !show;
    if (!show) return;

    var pill;
    if (key === 'equiv') {
      pill = function (i, a) {
        var c = item.paint[i];
        return {
          cls: c == null ? 'blank' : 'c' + c,
          badge: c == null ? null : LETTERS[c],
          target: item.phase === 'work',
          flag: item.flags.indexOf(i) >= 0,
          label: a.t + ' group, ' + (c == null ? 'no colour yet' : 'colour ' + LETTERS[c])
        };
      };
    } else if (key === 'split') {
      pill = function (i, a) {
        var s = Chem.setById(mol, a.s), slot = item.slots[s.index];
        return {
          cls: 'c' + s.index, badge: s.id, slot: s.index,
          target: item.phase === 'work' && !slot.filled,
          sub: slot.filled ? s.mult : null,
          label: 'Set ' + s.id + ', ' + a.t + (slot.filled ? ', ' + s.mult
                                                   : ': drop a splitting pattern here')
        };
      };
    } else {
      pill = setPill(mol);
    }

    el.molview.appendChild(Structure.render(mol, {
      alt: 'Structure of ' + mol.name, zoom: 1.15, pill: pill, reserveSub: key === 'split'
    }));
  }

  function paintTray() {
    el.tray.innerHTML = '';
    var key = item.cfg.key;
    el.tray.hidden = key === 'solve';
    if (key === 'solve') return;

    if (key === 'equiv') {
      el.tray.appendChild(make('p', 'tray-title', 'Colours'));
      var row = make('div', 'swatches');
      LETTERS.forEach(function (L, c) {
        var b = make('button', 'swatch c' + c + (item.brush === c ? ' selected' : ''));
        b.type = 'button';
        b.dataset.swatch = String(c);
        b.setAttribute('aria-pressed', item.brush === c ? 'true' : 'false');
        b.setAttribute('aria-label', 'Colour ' + L);
        b.textContent = L;
        row.appendChild(b);
      });
      el.tray.appendChild(row);
      el.tray.appendChild(make('p', 'tray-note', item.phase === 'work'
        ? 'Pick a colour, then click groups on the structure. Click a group again to clear it.'
        : 'Grouping checked.'));
      return;
    }

    if (item.phase !== 'work') {
      el.tray.appendChild(make('p', 'tray-empty', item.tiles.some(function (t) { return t.distractor; })
        ? 'All placed — the labels left over were distractors.'
        : 'All placed.'));
      return;
    }
    var remaining = item.tiles.filter(function (t) { return !t.used; });
    remaining.forEach(function (t) {
      var node = make('button', 'tile' + (t.cls ? ' ' + t.cls : ''));
      node.type = 'button';
      node.dataset.tile = String(item.tiles.indexOf(t));
      var line = make('span', 'tile-line');
      if (t.badge) line.appendChild(make('span', 'tile-badge', t.badge));
      line.appendChild(make('span', 'tile-label', t.label));
      node.appendChild(line);
      if (t.sub) node.appendChild(make('span', 'tile-sub', t.sub));
      el.tray.appendChild(node);
    });
  }

  function paintCard() {
    el.card.innerHTML = '';
    var key = item.cfg.key, mol = item.mol, done = item.phase === 'done';
    if ((key === 'integ' || key === 'solve') && !done) {
      el.card.appendChild(make('p', 'card-kicker', 'Unknown compound'));
      if (key === 'integ') {
        el.card.appendChild(make('p', 'card-formula-big', mol.formula));
        el.card.appendChild(make('p', 'card-note',
          'Count the H in the formula, then share them out using the integrals under the spectrum.'));
      } else {
        el.card.appendChild(make('p', 'card-hidden', '?'));
        el.card.appendChild(make('p', 'card-note',
          'The number of H in each signal is printed under it.'));
      }
      return;
    }
    el.card.appendChild(make('p', 'card-kicker', FAMILIES[mol.family] || ''));
    el.card.appendChild(make('h3', 'card-name', mol.name));
    el.card.appendChild(make('p', 'card-formula', mol.formula));
    if (key === 'integ' || key === 'solve') {
      el.card.appendChild(Structure.render(mol, { alt: 'Structure of ' + mol.name, zoom: 0.8,
                                                  pill: setPill(mol) }));
      return;
    }
    if (done) return;
    var note = {
      equiv: 'How many signals will it give? Colour each set of equivalent hydrogens.',
      shift: 'Drag each lettered set of hydrogens onto the signal it produces.',
      split: 'For each set, count the H on the neighbouring atoms, then add one.'
    }[key];
    el.card.appendChild(make('p', 'card-note', note));
  }

  function paintSpectrum() {
    var key = item.cfg.key;
    var show = !((key === 'equiv' || key === 'split') && item.phase !== 'done');
    el.plotwrap.hidden = !show;
    if (!show) { el.overlay.innerHTML = ''; el.plotnote.hidden = true; return; }
    var opts = {};
    if (key === 'integ') {
      opts.integral = true;
      opts.under = function (sig) { return sig.rel.toFixed(2); };
    } else if (key === 'solve' || key === 'split') {
      opts.under = function (sig) { return sig.nH + 'H'; };
    }
    /* about 60 px per ppm keeps the 0.12 ppm between multiplet lines at
       seven pixels or more, so the lines can be counted */
    var span = item.spec.hi - item.spec.lo;
    el.plotinner.style.minWidth = Math.ceil(span * 60 + 24) + 'px';
    var geo = NMR.draw(el.plot, item.spec, opts);
    if (geo) layoutOverlay(geo);
    el.plotnote.hidden = el.plotwrap.scrollWidth <= el.plotwrap.clientWidth + 1;
  }

  /* Drop targets (Levels 2 and 3) and answer chips (once an item is done) sit
     above their signal, clear of the trace and of each other. Nodes are built
     and measured first, because a filled chip is wider than an empty circle.
     Each then takes the first candidate height - stepping up from its peak -
     that overlaps nothing; if every one collides it takes the least bad. */
  function layoutOverlay(geo) {
    el.overlay.innerHTML = '';
    var key = item.cfg.key, done = item.phase === 'done';

    var specs = geo.signals.map(function (g, i) {
      var sig = g.sig, s = sig.set;
      var where = 'signal at ' + sig.d.toFixed(2) + ' ppm';
      if (key === 'shift' || key === 'integ') {
        var slot = item.slots[i];
        if (slot.filled) {
          var answer = key === 'shift' ? s.id : sig.nH + 'H';
          return { g: g, tag: 'button', slot: i, text: answer,
                   cls: 'slot ok' + (key === 'shift' ? ' c' + s.index : ''),
                   label: cap(where) + ': ' + (key === 'shift' ? 'set ' + s.id : answer) };
        }
        return { g: g, tag: 'button', slot: i, text: String(i + 1), cls: 'slot',
                 label: 'Signal ' + (i + 1) + ', at ' + sig.d.toFixed(2) + ' ppm' };
      }
      if (!done) return null;
      if (key === 'equiv') {
        var c = item.paint[s.atoms[0]];
        return { g: g, tag: 'span', text: LETTERS[c], cls: 'chip c' + c,
                 label: cap(where) + ': your colour ' + LETTERS[c] };
      }
      if (key === 'split') {
        return { g: g, tag: 'span', text: s.id + ' · ' + s.mult, cls: 'chip c' + s.index,
                 label: cap(where) + ': set ' + s.id + ', ' + s.mult };
      }
      return { g: g, tag: 'span', text: s.id, cls: 'chip c' + s.index,
               label: cap(where) + ': set ' + s.id };
    }).filter(Boolean);

    var nodes = specs.map(function (sp) {
      var node = make(sp.tag, sp.cls, sp.text);
      if (sp.tag === 'button') {
        node.type = 'button';
        node.dataset.slot = String(sp.slot);
      }
      node.setAttribute('aria-label', sp.label);
      node.style.visibility = 'hidden';
      el.overlay.appendChild(node);
      return node;
    });

    function penetration(a, b) {
      var ox = Math.min(a.r, b.r) - Math.max(a.l, b.l);
      var oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      return (ox > 0 && oy > 0) ? Math.min(ox, oy) : 0;
    }

    var rect = geo.rect, placed = [];
    specs.forEach(function (sp, i) {
      var node = nodes[i];
      var w = node.offsetWidth || 40, h = node.offsetHeight || 40;
      var x = Math.max(rect.x + w / 2, Math.min(rect.x + rect.w - w / 2, sp.g.x));
      var step = h + 6, first = sp.g.top - h / 2 - 6;
      var offsets = [];
      for (var k = 0; k < 7; k++) offsets.push(first - k * step);

      var best = null, bestCost = Infinity;
      offsets.some(function (cy) {
        cy = Math.max(rect.y + h / 2 + 2, cy);
        var box = { l: x - w / 2, r: x + w / 2, t: cy - h / 2, b: cy + h / 2 };
        var cost = 0;
        placed.forEach(function (p) { cost += penetration(box, p); });
        if (cost < bestCost) { bestCost = cost; best = cy; }
        return cost === 0;
      });

      placed.push({ l: x - w / 2, r: x + w / 2, t: best - h / 2, b: best + h / 2 });
      node.style.left = x + 'px';
      node.style.top = best + 'px';
      node.style.visibility = '';
    });
  }

  function paintChoices() {
    el.choices.hidden = item.cfg.key !== 'solve';
    el.choices.innerHTML = '';
    if (item.cfg.key !== 'solve') return;
    el.choices.appendChild(make('p', 'choices-q', 'Which compound produced this spectrum?'));
    var row = make('div', 'choices-row');
    item.choices.forEach(function (m) {
      var b = make('button', 'choice');
      b.type = 'button';
      b.dataset.mol = m.id;
      b.appendChild(Structure.render(m, { alt: m.name, zoom: 0.85 }));
      b.appendChild(make('span', 'choice-name', m.name));
      if (item.phase === 'done' && m.id === item.mol.id) b.classList.add('right');
      if (item.phase === 'done') b.disabled = true;
      row.appendChild(b);
    });
    el.choices.appendChild(row);
  }

  function paintHeader() {
    var cfg = LEVELS[state.level - 1];
    el.levelName.textContent = 'Level ' + cfg.n + ' — ' + cfg.name;
    el.blurb.textContent = cfg.blurb;
    el.counter.textContent = state.pin
      ? 'Pinned compound'
      : 'Compound ' + (state.index + 1) + ' of ' + itemCount(cfg.n);

    el.tabs.innerHTML = '';
    LEVELS.forEach(function (L) {
      var tab = make('button', 'tab' + (L.n === state.level ? ' current' : '') +
                                (L.n > state.unlocked ? ' locked' : ''));
      tab.type = 'button';
      tab.dataset.level = String(L.n);
      tab.disabled = L.n > state.unlocked;
      tab.textContent = L.n + '. ' + L.name;
      el.tabs.appendChild(tab);
    });

    el.refsummary.textContent = cfg.refTitle;
    var sections = el.refbody.querySelectorAll('[data-ref]');
    for (var i = 0; i < sections.length; i++) {
      sections[i].hidden = cfg.ref.indexOf(sections[i].dataset.ref) < 0;
    }
  }

  function say(text, kind, list) {
    el.feedback.className = 'feedback ' + (kind || '');
    el.feedback.innerHTML = '';
    if (text) el.feedback.appendChild(make('p', null, text));
    if (list && list.length) {
      var ul = make('ul');
      list.forEach(function (t) { ul.appendChild(make('li', null, t)); });
      el.feedback.appendChild(ul);
    }
  }

  function render() {
    paintHeader();
    el.stage.className = 'stage mode-' + item.cfg.key;
    el.check.hidden = item.cfg.key !== 'equiv' || item.phase !== 'work';
    paintCard();
    paintMol();
    paintTray();
    paintSpectrum();
    paintChoices();
    el.next.hidden = item.phase !== 'done';
  }

  function finishItem(message, kind, list) {
    item.phase = 'done';
    clearSelection();
    render();
    say(message, kind || 'good', list);
    el.next.hidden = false;
    el.next.focus();
  }

  /* ------------------------------------------------- Level 1: equivalence */

  function paintNode(i, colour) {
    if (item.phase !== 'work' || !(item.mol.atoms[i] && item.mol.atoms[i].h > 0)) return;
    if (colour != null) item.brush = colour;
    var b = item.brush;
    var hadFocus = el.molview.contains(document.activeElement);
    item.paint[i] = item.paint[i] === b ? null : b;   /* same colour again clears it */
    if (item.paint[i] == null) delete item.paint[i];
    item.flags = [];
    paintMol();
    paintTray();
    /* the structure was redrawn, so put keyboard focus back on the same group */
    if (hadFocus) {
      var again = el.molview.querySelector('[data-node="' + i + '"]');
      if (again) again.focus();
    }
  }

  function setBrush(c) {
    item.brush = c;
    paintTray();
    say('Colour ' + LETTERS[c] + ' selected — now click the groups that belong in this set.');
  }

  function checkGrouping() {
    if (item.phase !== 'work') return;
    var mol = item.mol;
    var groups = [];
    mol.atoms.forEach(function (a, i) { if (a.h > 0) groups.push(i); });

    var bare = groups.filter(function (i) { return item.paint[i] == null; });
    if (bare.length) {
      item.flags = bare;
      paintMol();
      say('Colour every group first — ' + Chem.plural(bare.length, 'group') +
          ' still ' + (bare.length === 1 ? 'has' : 'have') + ' no colour (outlined).', 'bad');
      return;
    }

    item.checks++;
    state.stats.attempts++;

    var i, j, a, b;
    /* same colour, different environment */
    for (i = 0; i < groups.length; i++) {
      for (j = i + 1; j < groups.length; j++) {
        a = mol.atoms[groups[i]]; b = mol.atoms[groups[j]];
        if (item.paint[groups[i]] === item.paint[groups[j]] && a.s !== b.s) {
          item.flags = [groups[i], groups[j]];
          paintMol();
          say('The outlined groups are not equivalent: one is ' + mol.sets[a.s].env +
              ', the other is ' + mol.sets[b.s].env + '. Give them different colours.', 'bad');
          persist();
          return;
        }
      }
    }
    /* same environment, different colours */
    for (i = 0; i < groups.length; i++) {
      for (j = i + 1; j < groups.length; j++) {
        a = mol.atoms[groups[i]]; b = mol.atoms[groups[j]];
        if (a.s === b.s && item.paint[groups[i]] !== item.paint[groups[j]]) {
          item.flags = [groups[i], groups[j]];
          paintMol();
          say('The outlined groups are equivalent — ' + mol.sets[a.s].why +
              '. Give them the same colour.', 'bad');
          persist();
          return;
        }
      }
    }

    state.stats.slots++;
    if (item.checks === 1) state.stats.firstTry++;
    item.flags = [];
    var k = item.sets.length;
    finishItem('Correct — ' + Chem.plural(k, 'set') + ' of equivalent hydrogens, so ' +
               Chem.plural(k, 'signal') + '. ' + (k > 1
                 ? 'The spectrum below labels each signal with your colour.'
                 : 'Every hydrogen in the molecule shares one environment, so the spectrum below ' +
                   'has a single signal (plus TMS at 0).'));
    persist();
  }

  /* ---------------------------------------------- Levels 2-4: placements */

  function rightNote(slot) {
    var key = item.cfg.key, s = slot.set;
    if (key === 'shift') {
      return 'Yes — ' + s.id + ' at ' + at(s) + ': ' + s.all + '. ' + REGIONS[s.r].hint;
    }
    if (key === 'integ') {
      return 'Yes — ' + slot.sig.nH + 'H at ' + at(s) + '.';
    }
    if (s.oh) {
      return 'Yes — the O–H is a singlet. Its H exchanges between molecules, so it is ' +
             'not split and does not split anything else.';
    }
    if (s.n === 0) {
      return 'Yes — ' + s.id + ' is a singlet: its group is bonded to ' +
             Chem.neighbourText(item.mol, s) + ', none of which split it.';
    }
    return 'Yes — ' + s.id + ' is a ' + s.mult + ': ' + s.n + ' neighbouring H, so ' +
           s.n + ' + 1 = ' + lineWord(s.n + 1) + '.';
  }

  function wrongNote(slot, tile) {
    var key = item.cfg.key, s = slot.set;

    if (key === 'shift') {
      var t = Chem.setById(item.mol, tile.key);
      var rt = REGIONS[t.r];
      if (t.r === 'alcohol') {
        return 'Not at ' + at(s) + '. ' + t.id + ' is the O–H: its shift wanders, so find it ' +
               'by elimination — a broad singlet in a place none of the C–H signals explain.';
      }
      if (t.r !== s.r) {
        return 'Not at ' + at(s) + '. ' + t.id + ' is ' + t.all + ', so look in the range for ' +
               rt.where + ' (' + rangeText(rt) + ' ppm).';
      }
      return 'Close: ' + t.id + ' and ' + s.id + ' both sit in the range for ' + rt.where + '. ' +
             cap(t.id) + ' is ' + t.all + '; ' + s.id + ' is ' + s.all + '. The nearer an H is to ' +
             'an electronegative atom or a C=O, the further downfield (larger δ) it appears.';
    }

    if (key === 'integ') {
      var sigs = item.spec.signals;
      var ratios = sigs.map(function (g) { return Math.round(g.rel * 2) / 2; });
      var sum = ratios.reduce(function (x, y) { return x + y; }, 0);
      var total = sigs.reduce(function (x, g) { return x + g.nH; }, 0);
      return 'Not ' + tile.label + '. Divided by the smallest, the integrals are about ' +
             ratios.map(half).join(' : ') + ', which add up to ' + half(sum) + '. ' +
             item.mol.formula + ' has ' + total + ' H, so each 1.0 of integral is worth ' +
             half(total / sum) + ' H.';
    }

    var lines = MULTIPLICITY.indexOf(tile.key) + 1;
    if (s.oh) {
      return 'Not a ' + tile.key + '. O–H hydrogens exchange between molecules, so they ' +
             'are not split by their neighbours.';
    }
    if (s.n > 0 && lines === s.n) {
      return 'Not a ' + tile.key + ' — ' + s.n + ' is the number of neighbouring H. ' +
             'The rule is n + 1.';
    }
    var who = s.atoms.length > 1 ? 'Each ' + s.text + ' in set ' + s.id
                                  : 'Set ' + s.id + ' (' + s.text + ')';
    return 'Not a ' + tile.key + '. ' + who + ' is bonded to ' + Chem.neighbourText(item.mol, s) +
           '. Add up the H that split it, then add one.';
  }

  function attempt(slotIndex, tileIndex) {
    if (item.phase !== 'work') return;
    var slot = item.slots[slotIndex], tile = item.tiles[tileIndex];
    if (!slot || !tile || slot.filled || tile.used) return;

    slot.tries++;
    state.stats.attempts++;

    if (tile.key === slot.key) {
      if (slot.tries === 1) state.stats.firstTry++;
      state.stats.slots++;
      slot.filled = true;
      tile.used = true;
      if (item.slots.every(function (s) { return s.filled; })) {
        finishSlots(rightNote(slot));
      } else {
        /* the target is about to be redrawn; a keyboard user goes back to
           the tray for the next label rather than being dropped on <body> */
        var hadFocus = el.stage.contains(document.activeElement) &&
                       !el.tray.contains(document.activeElement);
        say(rightNote(slot), 'good');
        paintTray();
        if (item.cfg.key === 'split') paintMol(); else paintSpectrum();
        if (hadFocus) {
          var nextTile = el.tray.querySelector('.tile');
          if (nextTile) nextTile.focus();
        }
      }
    } else {
      say(wrongNote(slot, tile), 'bad');
      flash(slotIndex);
    }
    persist();
  }

  function finishSlots(last) {
    var key = item.cfg.key, mol = item.mol;
    if (key === 'shift') {
      finishItem(last + ' Every signal is assigned.');
    } else if (key === 'integ') {
      var counts = item.spec.signals.map(function (g) { return g.nH; });
      var total = counts.reduce(function (x, y) { return x + y; }, 0);
      finishItem('Done: ' + counts.join(' + ') + ' = ' + total + ' H, matching ' + mol.formula +
                 '. The compound was ' + mol.name + ' — its structure is now shown.');
    } else {
      finishItem('Every prediction is in. Here is the spectrum: each signal is labelled with ' +
                 'its set, so you can check that its lines match what you predicted.');
    }
  }

  function flash(slotIndex) {
    var nodes = document.querySelectorAll('[data-slot="' + slotIndex + '"]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.remove('shake');
      void nodes[i].getBoundingClientRect();   /* restart the animation */
      nodes[i].classList.add('shake');
    }
  }

  /* -------------------------------------------------- Level 5: identify */

  function signalLine(set) {
    var why = set.oh ? 'exchanges, so it is not split'
                     : set.n === 0 ? 'no neighbouring H' : Chem.neighbourPhrase(set.n);
    return at(set) + ' · ' + set.nH + 'H · ' + set.mult + ' — ' + set.id + ', ' +
           set.all + ' (' + why + ')';
  }

  function chooseCompound(id, node) {
    if (item.cfg.key !== 'solve' || item.phase !== 'work') return;
    state.stats.attempts++;
    if (id === item.mol.id) {
      state.stats.slots++;
      if (!item.wrong) state.stats.firstTry++;
      var lines = item.spec.signals.map(function (g) { return signalLine(g.set); });
      finishItem('Yes — ' + item.mol.name + '. Every signal is accounted for:', 'good', lines);
    } else {
      item.wrong++;
      node.classList.add('wrong');
      node.disabled = true;
      var dec = byId(id);
      say('Not ' + dec.name + '. ' + Chem.contrast(item.mol, dec, drawnShift), 'bad');
    }
    persist();
  }

  /* ------------------------------------------------------------ progression */

  function nextItem() {
    var cfg = LEVELS[state.level - 1];
    state.index++;
    if (state.index >= itemCount(cfg.n)) {
      if (state.done.indexOf(state.level) < 0) state.done.push(state.level);
      if (state.pin) {
        state.index = 0;
        showScreen('pinned');
        return;
      }
      if (state.level < LEVELS.length) {
        state.unlocked = Math.max(state.unlocked, state.level + 1);
        state.level++;
        state.index = 0;
        persist();
        showScreen('level', cfg);
        return;
      }
      state.index = itemCount(cfg.n) - 1;
      persist();
      SCORM.markComplete();
      showScreen('finish');
      return;
    }
    persist();
    item = buildItem();
    render();
    say('');
  }

  function goToLevel(n) {
    if (n > state.unlocked) return;
    state.level = n;
    state.index = 0;
    persist();
    item = buildItem();
    render();
    say('');
  }

  /* ---------------------------------------------------------------- screens */

  /* Emptying the overlay on the way out keeps stale headings out of the
     accessibility tree and out of anything that queries the DOM. */
  function hideScreen() {
    el.screen.hidden = true;
    el.screen.innerHTML = '';
  }

  function lessonInto(box, cfg) {
    cfg.lesson.forEach(function (p) { box.appendChild(make('p', null, p)); });
    var how = make('p', 'screen-how');
    how.appendChild(make('strong', null, 'How to play: '));
    how.appendChild(document.createTextNode(cfg.how));
    box.appendChild(how);
  }

  function button(text, onClick) {
    var b = make('button', 'primary', text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  function showScreen(kind, cfg) {
    var s = el.screen;
    s.innerHTML = '';
    s.hidden = false;
    var box = make('div', 'screen-box');
    var go;

    if (kind === 'intro') {
      box.appendChild(make('h2', null, 'Reading a ¹H NMR spectrum'));
      box.appendChild(make('p', null,
        'A proton NMR spectrum answers four questions about the hydrogens in a molecule:'));
      var q = make('ul', 'screen-list');
      [['How many signals?', 'how many sets of equivalent hydrogens there are'],
       ['Where? (chemical shift)', 'what each hydrogen is near'],
       ['How big? (integration)', 'how many hydrogens are in each set'],
       ['How split? (splitting)', 'how many hydrogens sit on the neighbouring atoms']
      ].forEach(function (pair) {
        var li = make('li');
        li.appendChild(make('strong', null, pair[0] + ' '));
        li.appendChild(document.createTextNode('→ ' + pair[1]));
        q.appendChild(li);
      });
      box.appendChild(q);
      box.appendChild(make('p', null, 'Five short levels take these one at a time, then put them together:'));
      var ol = make('ol', 'screen-list');
      LEVELS.forEach(function (L) {
        var li = make('li');
        li.appendChild(make('strong', null, L.name + ': '));
        li.appendChild(document.createTextNode(L.blurb));
        ol.appendChild(li);
      });
      box.appendChild(ol);
      box.appendChild(make('p', 'screen-note',
        'Drag a label onto its target, or click the label and then the target. Wrong answers ' +
        'are not penalised — read the explanation and try again.'));

      var fresh = state.level === 1 && state.index === 0 && !state.done.length && !state.stats.attempts;
      if (fresh || state.pin) {
        go = button('Start', function () { showScreen('lesson', LEVELS[state.level - 1]); });
      } else {
        box.appendChild(make('p', 'screen-note', 'Welcome back — you are on Level ' + state.level +
          ', compound ' + (state.index + 1) + ' of ' + itemCount(state.level) + '.'));
        go = button('Continue', function () { hideScreen(); });
      }
      box.appendChild(go);

    } else if (kind === 'lesson') {
      box.appendChild(make('h2', null, 'Level ' + cfg.n + ' — ' + cfg.name));
      lessonInto(box, cfg);
      go = button('Start Level ' + cfg.n, function () { hideScreen(); });
      box.appendChild(go);

    } else if (kind === 'level') {
      var next = LEVELS[state.level - 1];
      box.appendChild(make('h2', null, 'Level ' + cfg.n + ' complete'));
      box.appendChild(make('p', 'screen-note', accuracyLine()));
      box.appendChild(make('h3', null, 'Next: Level ' + next.n + ' — ' + next.name));
      lessonInto(box, next);
      go = button('Start Level ' + next.n, function () {
        hideScreen();
        item = buildItem();
        render();
        say('');
      });
      box.appendChild(go);

    } else if (kind === 'pinned') {
      box.appendChild(make('h2', null, 'Done'));
      box.appendChild(make('p', null, 'That was the pinned compound. Reload the page to show it again, ' +
        'or change the level in the address bar.'));
      go = button('Show it again', function () {
        hideScreen();
        item = buildItem();
        render();
        say('');
      });
      box.appendChild(go);

    } else {
      box.appendChild(make('h2', null, 'All five levels complete'));
      box.appendChild(make('p', null, accuracyLine()));
      box.appendChild(make('p', 'screen-note', SCORM.isConnected()
        ? 'Your completion has been sent to the gradebook. You may close this window.'
        : 'Running outside an LMS — nothing was reported.'));
      go = button('Play again with new compounds', function () {
        state = newRun();
        persist();
        hideScreen();
        item = buildItem();
        render();
        say('');
      });
      box.appendChild(go);
    }

    s.appendChild(box);
    if (go) go.focus();
  }

  function accuracyLine() {
    var st = state.stats;
    if (!st.slots) return 'No answers recorded yet.';
    var pct = Math.round(st.firstTry / st.slots * 100);
    return st.firstTry + ' of ' + st.slots + ' answers right on the first try (' + pct + '%), across ' +
           st.attempts + ' attempts.';
  }

  /* ----------------------------------------------------------- interaction */

  function tileIndexOf(node) {
    var t = node.closest ? node.closest('.tile') : null;
    return t ? +t.dataset.tile : -1;
  }

  /* What is under the pointer: a drop slot (on the plot, or a set on the
     structure), or - on Level 1 - a group to colour. */
  function targetAt(x, y) {
    var node = document.elementFromPoint(x, y);
    if (!node || !node.closest) return null;
    if (item.cfg.key === 'equiv') {
      var g = node.closest('[data-node]');
      return g && el.molview.contains(g) ? { kind: 'node', index: +g.getAttribute('data-node'), node: g } : null;
    }
    var hit = node.closest('[data-slot]');
    if (!hit || !el.stage.contains(hit)) return null;
    if (hit.classList.contains('pill') && !hit.classList.contains('target')) return null;
    return { kind: 'slot', index: +hit.getAttribute('data-slot'), node: hit };
  }

  function clearHover() {
    var nodes = el.stage.querySelectorAll('.hover');
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('hover');
  }

  function clearSelection() {
    if (selectedTile == null) return;
    var nodes = el.tray.querySelectorAll('.tile.selected');
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('selected');
    selectedTile = null;
    el.stage.classList.remove('picking');
  }

  function startDrag(ev) {
    if (ev.button != null && ev.button !== 0) return;
    var from = ev.target.closest && ev.target.closest('.tile, .swatch');
    if (!from) return;
    drag = { from: from, moved: false, node: null, x0: ev.clientX, y0: ev.clientY,
             tile: from.classList.contains('tile') ? +from.dataset.tile : -1,
             swatch: from.classList.contains('swatch') ? +from.dataset.swatch : -1 };
    try { from.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
  }

  function moveDrag(ev) {
    if (!drag) return;
    if (!drag.moved) {
      /* movementX is unreliable on touch, so measure from the press point */
      if (Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < 6) return;
      drag.moved = true;
      var text = drag.tile >= 0 ? ghostText(item.tiles[drag.tile]) : 'Colour ' + LETTERS[drag.swatch];
      var ghost = make('div', 'ghost' + (drag.swatch >= 0 ? ' c' + drag.swatch : ''), text);
      document.body.appendChild(ghost);
      drag.node = ghost;
      drag.from.classList.add('dragging');
    }
    drag.node.style.left = ev.clientX + 'px';
    drag.node.style.top = ev.clientY + 'px';
    clearHover();
    var over = targetAt(ev.clientX, ev.clientY);
    if (over) over.node.classList.add('hover');
  }

  function endDrag(ev) {
    if (!drag) return;
    var d = drag;
    drag = null;
    if (d.node) d.node.remove();
    d.from.classList.remove('dragging');
    clearHover();

    /* A tap without movement is left to the click handler, so that a keyboard
       Enter - which fires click and no pointer events at all - takes exactly
       the same path. */
    if (!d.moved) return;

    /* swallow the click this pointerup is about to fire, and only that one */
    suppressClick = true;
    setTimeout(function () { suppressClick = false; }, 0);
    var over = targetAt(ev.clientX, ev.clientY);
    if (!over) return;
    if (over.kind === 'node' && d.swatch >= 0) {
      paintNode(over.index, d.swatch);
      paintTray();
    } else if (over.kind === 'slot' && d.tile >= 0) {
      clearSelection();
      attempt(over.index, d.tile);
    }
  }

  function ghostText(tile) {
    return (tile.badge ? tile.badge + ' · ' : '') + tile.label;
  }

  function selectTile(index) {
    var wasSelected = selectedTile === index;
    clearSelection();
    if (wasSelected) { say(''); return; }
    selectedTile = index;
    var nodes = el.tray.querySelectorAll('.tile');
    for (var i = 0; i < nodes.length; i++) {
      if (+nodes[i].dataset.tile === index) nodes[i].classList.add('selected');
    }
    el.stage.classList.add('picking');
    var where = item.cfg.key === 'split' ? 'the set of hydrogens' : 'the signal';
    say('Now choose ' + where + ' that is ' + ghostText(item.tiles[index]) + '.');
  }

  function onTrayClick(ev) {
    if (suppressClick) { suppressClick = false; return; }
    var sw = ev.target.closest && ev.target.closest('.swatch');
    if (sw) { setBrush(+sw.dataset.swatch); return; }
    var idx = tileIndexOf(ev.target);
    if (idx >= 0) selectTile(idx);
  }

  /* a click - or Enter / Space - on a slot, a capsule or a compound choice */
  function activate(target) {
    if (!target || !target.closest) return;
    var node = target.closest('[data-node]');
    if (node && item.cfg.key === 'equiv') {
      paintNode(+node.getAttribute('data-node'));
      return;
    }
    var slot = target.closest('[data-slot]');
    if (slot && selectedTile != null) {
      if (slot.classList.contains('pill') && !slot.classList.contains('target')) return;
      var tileIdx = selectedTile;
      clearSelection();
      attempt(+slot.getAttribute('data-slot'), tileIdx);
      return;
    }
    if (slot && selectedTile == null && item.phase === 'work' &&
        !slot.classList.contains('ok') && !(slot.classList.contains('pill') && !slot.classList.contains('target'))) {
      say('Choose a label from the tray first, then this target.');
      return;
    }
    var choice = target.closest('.choice');
    if (choice && !choice.disabled) chooseCompound(choice.dataset.mol, choice);
  }

  function onStageClick(ev) {
    if (suppressClick) { suppressClick = false; return; }
    activate(ev.target);
  }

  function onStageKey(ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var node = ev.target.closest && ev.target.closest('.pill.target');
    if (!node) return;
    ev.preventDefault();
    activate(node);
  }

  /* ------------------------------------------------------------------ boot */

  function cacheDom() {
    ['plot', 'plotwrap', 'plotinner', 'plotnote', 'overlay', 'molview', 'tray', 'card', 'feedback', 'next', 'check', 'tabs',
     'levelName', 'blurb', 'counter', 'screen', 'choices', 'stage', 'reference',
     'refsummary', 'refbody', 'lms'].forEach(function (id) { el[id] = $(id); });
  }

  function refSection(key, title) {
    var sec = make('section', 'ref-section');
    sec.dataset.ref = key;
    if (title) sec.appendChild(make('h3', 'ref-h', title));
    el.refbody.appendChild(sec);
    return sec;
  }

  function list(tag, items) {
    var l = make(tag, 'ref-list');
    items.forEach(function (t) { l.appendChild(make('li', null, t)); });
    return l;
  }

  function buildReference() {
    var eq = refSection('equiv');
    eq.appendChild(list('ul', [
      'The three H on a CH₃ are always equivalent — the group spins freely. So are the ' +
      'two H on any CH₂ in this activity.',
      'Two groups are equivalent if a mirror plane or a rotation of the whole molecule turns one ' +
      'into the other.',
      'To test a pair, compare what each is bonded to, then what those atoms are bonded to. ' +
      'Identical all the way out means equivalent.',
      'The number of sets is the number of signals.'
    ]));

    var sh = refSection('shift', 'Chemical shifts (δ, ppm)');
    var table = make('table', 'ref-table');
    var head = make('tr');
    ['Hydrogen', 'δ (ppm)', 'Why'].forEach(function (h) { head.appendChild(make('th', null, h)); });
    table.appendChild(head);
    Object.keys(REGIONS).forEach(function (k) {
      var r = REGIONS[k];
      var tr = make('tr');
      tr.appendChild(make('td', null, r.label));
      tr.appendChild(make('td', 'num', rangeText(r) + (r.broad ? ' (broad)' : '')));
      tr.appendChild(make('td', 'note', r.hint));
      table.appendChild(tr);
    });
    sh.appendChild(table);
    sh.appendChild(make('p', 'ref-foot',
      'TMS, the reference, is at 0 ppm. Left is downfield (deshielded, larger δ); right is ' +
      'upfield (shielded).'));

    var ig = refSection('integ');
    ig.appendChild(list('ol', [
      'Divide every integral by the smallest one. That gives the ratio.',
      'Add the ratio up.',
      'Divide the number of H in the molecular formula by that total: that is how many H each ' +
      '1.0 of integral is worth.',
      'Multiply each ratio by it. Each answer is the number of H in that signal.'
    ]));
    ig.appendChild(make('p', 'ref-foot',
      'Example: 1.50 : 1.00 : 1.50 adds up to 4. C₄H₈O₂ has 8 H, so each 1.0 is ' +
      'worth 2 H — the signals are 3H, 2H and 3H.'));

    var sp = refSection('split', 'Splitting (the n + 1 rule)');
    var st = make('table', 'ref-table');
    var sh2 = make('tr');
    ['Neighbouring H (n)', 'Lines (n + 1)', 'Name', 'Line heights'].forEach(function (h) {
      sh2.appendChild(make('th', null, h));
    });
    st.appendChild(sh2);
    for (var n = 0; n <= 6; n++) {
      var tr = make('tr');
      tr.appendChild(make('td', 'num', String(n)));
      tr.appendChild(make('td', 'num', String(n + 1)));
      tr.appendChild(make('td', null, MULTIPLICITY[n]));
      tr.appendChild(make('td', 'num', NMR.pascal(n).join(' : ')));
      st.appendChild(tr);
    }
    sp.appendChild(st);
    sp.appendChild(make('h3', 'ref-h', 'Patterns worth knowing'));
    sp.appendChild(list('ul', [
      'Ethyl group, CH₃CH₂–: a 3H triplet and a 2H quartet.',
      'Isopropyl group, (CH₃)₂CH–: a 6H doublet and a 1H septet.',
      'tert-Butyl group, (CH₃)₃C–: a 9H singlet.',
      'A CH₃ on a C=O, an O or a ring carbon: a 3H singlet — no neighbouring H.',
      'O–H: a singlet, often broad. It does not split its neighbours.'
    ]));
    sp.appendChild(make('p', 'ref-foot',
      'Only H on directly bonded atoms count, and equivalent H do not split each other.'));
  }

  function start() {
    cacheDom();
    buildReference();

    var connected = SCORM.init();
    el.lms.textContent = connected ? 'Connected to the LMS' : 'Standalone — no LMS detected';
    el.lms.className = 'lms ' + (connected ? 'on' : 'off');

    var params = new URLSearchParams(location.search);
    var pin = params.get('molecule');
    var startLevel = parseInt(params.get('level'), 10);

    if (pin && byId(pin)) {
      state = newRun();
      state.pin = pin;
      state.unlocked = LEVELS.length;
      state.level = (startLevel >= 1 && startLevel <= LEVELS.length) ? startLevel : 5;
    } else {
      state = restore(SCORM.loadState());
      if (!state || !planIsValid(state.plan)) state = newRun();
      if (state.level > LEVELS.length || state.index >= itemCount(state.level)) {
        state.level = Math.min(state.level, LEVELS.length);
        state.index = 0;
      }
    }

    /* Write the run out before the first answer. Without this a discarded
       older save survives in storage until a student answers something, and a
       student who opens the activity and closes it again comes back to a
       different set of compounds. */
    persist();

    item = buildItem();
    render();

    el.tray.addEventListener('pointerdown', startDrag);
    el.tray.addEventListener('pointermove', moveDrag);
    el.tray.addEventListener('pointerup', endDrag);
    el.tray.addEventListener('pointercancel', endDrag);
    el.tray.addEventListener('click', onTrayClick);

    el.stage.addEventListener('click', onStageClick);
    el.stage.addEventListener('keydown', onStageKey);
    el.choices.addEventListener('click', onStageClick);
    el.check.addEventListener('click', checkGrouping);

    el.next.addEventListener('click', nextItem);
    el.tabs.addEventListener('click', function (ev) {
      var tab = ev.target.closest('.tab');
      if (tab && !tab.disabled) goToLevel(+tab.dataset.level);
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') clearSelection();
    });

    var ro = new ResizeObserver(function () { if (item) paintSpectrum(); });
    ro.observe(el.plotinner);

    showScreen('intro');
  }

  return { start: start };
})();

document.addEventListener('DOMContentLoaded', Game.start);

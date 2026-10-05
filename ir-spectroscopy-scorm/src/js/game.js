/* game.js — levels, drag-and-drop, feedback and progression.
 *
 * Level 1  identify bands by family, compound named:  "there is a C=O here"
 * Level 2  identify bands by specific group, compound hidden, then name it
 * Level 3  the same as Level 2 with the wavenumber ranges stripped off the
 *          tiles, so the student supplies them from memory rather than reading
 *          them off the label and matching
 *
 * The four C-H groups are asked for by name at BOTH levels (see `atomic` in
 * groups.js): "C-H" alone would make the sp2 and sp3 peaks interchangeable,
 * and telling them apart across the 3000 line is the point.
 *
 * Only bands above 1500 cm-1 are ever drop targets. The fingerprint region is
 * drawn and discussed but never scored.
 *
 * Every drop works three ways so it survives a Chromebook trackpad, a touch
 * screen and a keyboard: pointer drag, click-tile-then-click-peak, and tab +
 * Enter, which uses the same click path.
 */

var Game = (function () {
  'use strict';

  /* One molecule is drawn per theme, so a run always contains an alcohol, an
     acid, a carbonyl, an N-H compound, a hydrocarbon and a triple bond instead
     of whatever chance produces. The last slot is a free draw. */
  var CORE_THEMES = ['oh', 'acid', 'co', 'nh', 'hc', 'triple'];

  var LEVELS = [
    { n: 1, name: 'Find the band', tag: 'find', mode: 'family', items: 7, reference: true,
      blurb: 'The compound is named for you. Drag each bond onto the peak it produced.' },
    { n: 2, name: 'Name the group', tag: 'name', mode: 'group', items: 7, identify: true,
      blurb: 'The compound is hidden. Label every marked peak with the specific functional group, then name the compound.' },
    { n: 3, name: 'From memory', tag: 'name', mode: 'group', items: 7, identify: true,
      hideRanges: true,
      blurb: 'Same task, but the labels no longer carry their wavenumbers. You supply those.' }
  ];

  /* Bumped whenever the shape of a saved run changes - the level list, the
     draw, or the group vocabulary. A save from an older build is discarded
     rather than resumed, otherwise a student carries an out-of-date lineup of
     spectra forward and never sees the new one. */
  var SCHEMA = 4;

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

  /* ------------------------------------------------------- compound choices
   *
   * A student decides the compound question from the peaks they just labelled,
   * so those peaks are the only fair evidence. SIG is that set per molecule.
   *
   * DIST drops sp3 C-H from the comparison: nearly every compound here has it,
   * so sharing it says nothing about how alike two spectra look.
   */
  var SIG = {}, DIST = {};

  function indexSignatures() {
    MOLECULES.forEach(function (m) {
      var set = {};
      m.bands.forEach(function (b) { if (b.t) set[b.g] = true; });
      SIG[m.id] = Object.keys(set).sort();
      DIST[m.id] = SIG[m.id].filter(function (g) { return g !== 'ch_sp3'; });
    });
  }

  /* Decoys should force a decision, not be dismissed at a glance: the best one
   * shares the compound's headline group and differs by a single band the
   * student labelled. An alcohol therefore offers phenol against 1-butanol -
   * aromatic against aliphatic, separated by the ring bands and the sp2 C-H -
   * rather than something carrying no O-H at all.
   *
   * A decoy whose scored peaks match the answer's exactly is excluded: now
   * that every carbonyl carries one label, ethyl acetate and 2-butanone look
   * identical in everything this activity asks about, so offering one against
   * the other is a coin toss rather than a question.
   */
  function pickDecoys(answer, count, rand) {
    var aSig = SIG[answer.id].join(',');
    var aDist = DIST[answer.id];

    var ranked = MOLECULES.filter(function (m) {
      return m.id !== answer.id && SIG[m.id].join(',') !== aSig;
    }).map(function (m) {
      var d = DIST[m.id];
      var shared = d.filter(function (g) { return aDist.indexOf(g) >= 0; }).length;
      var apart = d.length + aDist.length - 2 * shared;
      var score = shared * 2 - apart
        + (m.theme === answer.theme ? 4 : 0)      /* same headline group */
        + (m.formula === answer.formula ? 3 : 0)  /* an isomer is the sharpest decoy */
        + rand() * 2;                             /* break ties differently each run */
      return { m: m, score: score };
    });

    ranked.sort(function (a, b) { return b.score - a.score; });
    return ranked.slice(0, count).map(function (x) { return x.m; });
  }

  /* ------------------------------------------------------------ item set-up */

  function pickMolecules(tag, count, rand, used) {
    var pool = MOLECULES.filter(function (m) { return m.tags.indexOf(tag) >= 0; });
    var chosen = [];

    /* Levels 2 and 3 share a pool, so prefer compounds the earlier level did
       not already use. Falls back to reusing one rather than leaving a theme
       unrepresented - the theme guarantee matters more than the repeat. */
    function take(candidates) {
      var fresh = candidates.filter(function (m) { return !used || used.indexOf(m.id) < 0; });
      var from = fresh.length ? fresh : candidates;
      return from.length ? shuffle(from, rand)[0] : null;
    }

    CORE_THEMES.forEach(function (theme) {
      if (chosen.length >= count) return;
      var pick = take(pool.filter(function (m) {
        return m.theme === theme && chosen.indexOf(m) < 0;
      }));
      if (pick) chosen.push(pick);
    });

    /* fill any remaining places from whatever is left, unused ones first */
    var rest = shuffle(pool.filter(function (m) { return chosen.indexOf(m) < 0; }), rand);
    rest.sort(function (a, b) {
      var au = used && used.indexOf(a.id) >= 0 ? 1 : 0;
      var bu = used && used.indexOf(b.id) >= 0 ? 1 : 0;
      return au - bu;
    });
    while (chosen.length < count && rest.length) chosen.push(rest.shift());

    return shuffle(chosen, rand);
  }

  function newRun() {
    var seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    var rand = IR.rng(seed);
    var plan = {};
    var usedByTag = {};
    LEVELS.forEach(function (L) {
      var used = usedByTag[L.tag] || (usedByTag[L.tag] = []);
      var ids = pickMolecules(L.tag, L.items, rand, used).map(function (m) { return m.id; });
      plan[L.n] = ids;
      usedByTag[L.tag] = used.concat(ids);
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

  /* ------------------------------------------------------------- item build */

  /* A pinned spectrum (?molecule=ethylacetate) is a one-item level, so the
     teacher can put a single named compound on the board during a lesson. */
  function itemCount(level) {
    return state.pin ? 1 : LEVELS[level - 1].items;
  }

  function buildItem() {
    var cfg = LEVELS[state.level - 1];
    var molecule = state.pin ? byId(state.pin) : byId(state.plan[state.level][state.index]);
    var seed = (state.seed + state.level * 7919 + state.index * 104729) >>> 0;
    var spec = IR.build(molecule, seed);
    var rand = IR.rng(seed ^ 0x51ed2701);

    var targets = spec.bands.filter(function (b) { return b.t; });
    targets.sort(function (a, b) { return b.c - a.c; });

    var slots = targets.map(function (b, i) {
      /* Sharp bands are anchored at the deepest point of their window. Broad
         ones are anchored at the envelope centre instead: the lowest point
         inside a carboxylic acid's 2500-3300 O-H is the C-H spike riding on
         top of it, which is not what the label is pointing at. */
      var peak = b.s === 'g'
        ? { v: b.c, t: IR.tAt(spec, b.c) }
        : IR.depthAt(spec, b.tol[0], b.tol[1]);
      return {
        key: levelKey(b.g, cfg.mode), group: b.g,
        v: peak.v, t: peak.t, band: b, filled: false, tries: 0, i: i
      };
    });

    /* One tile per SLOT, not per distinct answer: a molecule can legitimately
       need the same label twice. */
    var needed = {};
    slots.forEach(function (s) { needed[s.key] = (needed[s.key] || 0) + 1; });

    var wanted = [];
    Object.keys(needed).forEach(function (k) {
      for (var i = 0; i < needed[k]; i++) wanted.push(k);
    });

    var distractors = shuffle(UNIVERSE[cfg.mode].filter(function (k) { return !needed[k]; }), rand)
      .slice(0, cfg.mode === 'family' ? 2 : 3);

    var tiles = shuffle(wanted.concat(distractors), rand).map(function (k) {
      return {
        key: k, label: keyLabel(k),
        sub: cfg.hideRanges ? '' : keySub(k),
        used: false, distractor: !needed[k]
      };
    });

    /* the multiple-choice compound question that closes out Levels 2 and 3 */
    var choices = null;
    if (cfg.identify) {
      choices = shuffle([molecule].concat(pickDecoys(molecule, 2, rand)), rand);
    }

    return { cfg: cfg, molecule: molecule, spec: spec, slots: slots, tiles: tiles,
             choices: choices, phase: 'label' };
  }

  /* ---------------------------------------------------------------- painting */

  function paintSpectrum() {
    var rect = IR.draw(el.plot, item.spec);
    if (rect) layoutSlots(rect);
  }

  /* Place each marker clear of the trace and clear of the markers already
     placed. The nodes are built and measured first, because a filled chip is
     several times wider than an unfilled 40px circle and guessing a width gets
     the collision test wrong. Each marker then takes the first candidate slot -
     stepping away from its peak, preferred direction first - that is inside the
     plot and overlaps nothing; if every candidate collides it takes the least
     bad one rather than leaving the marker off the plot. */
  function layoutSlots(rect) {
    el.overlay.innerHTML = '';

    var nodes = item.slots.map(function (s) {
      var node = make('button', 'slot' + (s.filled ? ' ok' : ''));
      node.type = 'button';
      node.dataset.slot = String(s.i);
      node.setAttribute('aria-label', s.filled
        ? s.filledLabel + ' at ' + Math.round(s.v) + ' wavenumbers'
        : 'Unlabelled peak at ' + Math.round(s.v) + ' wavenumbers');
      node.textContent = s.filled ? s.filledLabel : String(s.i + 1);
      node.style.visibility = 'hidden';
      el.overlay.appendChild(node);
      return node;
    });

    function penetration(a, b) {
      var ox = Math.min(a.r, b.r) - Math.max(a.l, b.l);
      var oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      return (ox > 0 && oy > 0) ? Math.min(ox, oy) : 0;
    }

    var placed = [];

    item.slots.forEach(function (s, i) {
      var node = nodes[i];
      var w = node.offsetWidth || 40;
      var h = node.offsetHeight || 40;
      var x = IR.xOfV(s.v, rect);
      var yPeak = IR.yOfT(s.t, rect);
      var step = h + 6;

      /* below the trough first when there is room, otherwise above */
      var prefer = yPeak + h / 2 + 10 < rect.y + rect.h - 4 ? 1 : -1;
      var offsets = [];
      for (var k = 0; k < 6; k++) offsets.push(prefer * (h / 2 + 10 + k * step));
      for (var k2 = 0; k2 < 6; k2++) offsets.push(-prefer * (h / 2 + 10 + k2 * step));

      var best = null, bestCost = Infinity;
      offsets.forEach(function (dy) {
        var cy = yPeak + dy;
        if (cy - h / 2 < rect.y + 3 || cy + h / 2 > rect.y + rect.h - 3) return;
        var box = { l: x - w / 2, r: x + w / 2, t: cy - h / 2, b: cy + h / 2 };
        var cost = 0;
        placed.forEach(function (p) { cost += penetration(box, p); });
        if (cost < bestCost) { bestCost = cost; best = cy; }
        return cost === 0;
      });

      if (best === null) {
        best = Math.max(rect.y + h / 2 + 3,
                        Math.min(rect.y + rect.h - h / 2 - 3, yPeak + prefer * (h / 2 + 10)));
      }

      placed.push({ l: x - w / 2, r: x + w / 2, t: best - h / 2, b: best + h / 2 });
      node.style.left = x + 'px';
      node.style.top = best + 'px';
      node.style.visibility = '';
    });
  }

  function paintTray() {
    el.tray.innerHTML = '';
    /* Once the labelling phase is over the leftovers are distractors nobody
       should still be poking at. */
    if (item.phase !== 'label') {
      el.tray.appendChild(make('p', 'tray-empty',
        'Labelling finished — the labels left over belong to other compounds.'));
      return;
    }
    var remaining = item.tiles.filter(function (t) { return !t.used; });
    if (!remaining.length) {
      el.tray.appendChild(make('p', 'tray-empty', 'All labels placed.'));
      return;
    }
    remaining.forEach(function (t) {
      var node = make('button', 'tile');
      node.type = 'button';
      node.dataset.tile = String(item.tiles.indexOf(t));
      node.appendChild(make('span', 'tile-label', t.label));
      if (t.sub) node.appendChild(make('span', 'tile-sub', t.sub));
      el.tray.appendChild(node);
    });
  }

  function paintCard() {
    el.card.innerHTML = '';
    if (item.cfg.mode === 'group') {
      el.card.appendChild(make('p', 'card-kicker', 'Unknown compound'));
      el.card.appendChild(make('p', 'card-hidden', '?'));
      el.card.appendChild(make('p', 'card-note',
        'Label every numbered peak, then identify the compound.'));
      return;
    }
    el.card.appendChild(make('p', 'card-kicker', item.molecule.cls));
    el.card.appendChild(make('h3', 'card-name', item.molecule.name));
    el.card.appendChild(Structure.render(item.molecule.structure,
      { alt: 'Skeletal structure of ' + item.molecule.name }));
    el.card.appendChild(make('p', 'card-formula', item.molecule.formula));
  }

  function paintHeader() {
    var cfg = LEVELS[state.level - 1];
    el.levelName.textContent = 'Level ' + cfg.n + ' — ' + cfg.name;
    el.blurb.textContent = cfg.blurb;
    el.counter.textContent = state.pin
      ? 'Pinned spectrum'
      : 'Spectrum ' + (state.index + 1) + ' of ' + itemCount(cfg.n);

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

    el.reference.hidden = !cfg.reference;
  }

  function say(text, kind) {
    el.feedback.className = 'feedback ' + (kind || '');
    el.feedback.textContent = text;
  }

  function render() {
    paintHeader();
    paintCard();
    paintTray();
    paintSpectrum();
    el.choices.hidden = true;
    el.next.hidden = true;
  }

  /* ------------------------------------------------------------- answering */

  function attempt(slotIndex, tileIndex) {
    if (item.phase !== 'label') return;
    var slot = item.slots[slotIndex], tile = item.tiles[tileIndex];
    if (!slot || !tile || slot.filled || tile.used) return;

    slot.tries++;
    state.stats.attempts++;

    if (tile.key === slot.key) {
      if (slot.tries === 1) state.stats.firstTry++;
      state.stats.slots++;
      slot.filled = true;
      slot.filledLabel = tile.label;
      tile.used = true;
      say('Correct — ' + Math.round(slot.v) + ' cm⁻¹. ' + GROUPS[slot.group].hint, 'good');
      paintTray();
      paintSpectrum();
      if (item.slots.every(function (s) { return s.filled; })) finishLabels();
    } else {
      say(wrongNote(slot, tile), 'bad');
      flash(slotIndex);
    }
    persist();
  }

  function wrongNote(slot, tile) {
    if (tile.distractor) {
      var g = GROUPS[tile.key];
      if (item.cfg.hideRanges) {
        return 'This compound has no ' + tile.label + ' — work out where that band would ' +
               'fall, look there, and you will find nothing.';
      }
      var where = g ? 'at ' + g.range + ' cm⁻¹' : 'anywhere in this spectrum';
      return 'This compound has no ' + tile.label + ' — you would be looking for it ' +
             where + ', and nothing is there.';
    }
    return 'Not at ' + Math.round(slot.v) + ' cm⁻¹. ' + GROUPS[slot.group].hint;
  }

  function flash(slotIndex) {
    var nodes = el.overlay.querySelectorAll('.slot');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].dataset.slot === String(slotIndex)) {
        nodes[i].classList.remove('shake');
        void nodes[i].offsetWidth;   /* restart the animation */
        nodes[i].classList.add('shake');
      }
    }
  }

  function finishLabels() {
    if (item.cfg.identify) {
      item.phase = 'identify';
      clearSelection();
      paintTray();
      say('Every peak is labelled. Now — which compound is this?', 'good');
      paintChoices();
    } else {
      item.phase = 'done';
      clearSelection();
      paintTray();
      say('Spectrum complete.', 'good');
      el.next.hidden = false;
      el.next.focus();
    }
  }

  function paintChoices() {
    el.choices.hidden = false;
    el.choices.innerHTML = '';
    el.choices.appendChild(make('p', 'choices-q', 'Which compound produced this spectrum?'));
    var row = make('div', 'choices-row');
    item.choices.forEach(function (m) {
      var b = make('button', 'choice');
      b.type = 'button';
      b.dataset.mol = m.id;
      b.appendChild(Structure.render(m.structure, { alt: m.name, scale: 28 }));
      b.appendChild(make('span', 'choice-name', m.name));
      row.appendChild(b);
    });
    el.choices.appendChild(row);
  }

  function chooseCompound(id, node) {
    if (item.phase !== 'identify') return;
    state.stats.attempts++;
    if (id === item.molecule.id) {
      state.stats.slots++;
      state.stats.firstTry++;
      item.phase = 'done';
      node.classList.add('right');
      say(item.molecule.name + ' — ' + item.molecule.cls.toLowerCase() + '. ' +
          'The band pattern you labelled is the evidence.', 'good');
      el.next.hidden = false;
      el.next.focus();
    } else {
      node.classList.add('wrong');
      node.disabled = true;
      say('No. Every option here fits some of what you labelled — find the one band ' +
          'that rules this structure out, then check the others the same way.', 'bad');
    }
    persist();
  }

  /* ------------------------------------------------------------ progression */

  function nextItem() {
    var cfg = LEVELS[state.level - 1];
    state.index++;
    if (state.index >= itemCount(cfg.n)) {
      state.done.push(state.level);
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

  function showScreen(kind, cfg) {
    var s = el.screen;
    s.innerHTML = '';
    s.hidden = false;
    var box = make('div', 'screen-box');

    if (kind === 'intro') {
      box.appendChild(make('h2', null, 'Reading the diagnostic region'));
      box.appendChild(make('p', null,
        'Below 1500 cm⁻¹ an IR spectrum is a fingerprint — unique, but hard to ' +
        'read. Above 1500 is the diagnostic region, where individual bonds announce ' +
        'themselves at predictable wavenumbers. Every peak you are asked to label is in ' +
        'that region; both dotted lines on the plot are there to help you place it.'));
      var ul = make('ul', 'screen-list');
      LEVELS.forEach(function (L) {
        var li = make('li', null);
        li.appendChild(make('strong', null, 'Level ' + L.n + ' — ' + L.name + ': '));
        li.appendChild(document.createTextNode(L.blurb));
        ul.appendChild(li);
      });
      box.appendChild(ul);
      box.appendChild(make('p', 'screen-note',
        'Drag a label onto a peak, or click the label and then click the peak. ' +
        'Wrong answers are not penalised — read the explanation and try again.'));
      var start = make('button', 'primary', 'Start');
      start.type = 'button';
      start.addEventListener('click', function () { hideScreen(); el.tray.focus(); });
      box.appendChild(start);

    } else if (kind === 'level') {
      box.appendChild(make('h2', null, 'Level ' + cfg.n + ' complete'));
      box.appendChild(make('p', null, accuracyLine()));
      box.appendChild(make('p', 'screen-note', LEVELS[state.level - 1].blurb));
      var go = make('button', 'primary', 'Start Level ' + state.level);
      go.type = 'button';
      go.addEventListener('click', function () {
        hideScreen();
        item = buildItem();
        render();
        say('');
      });
      box.appendChild(go);

    } else {
      box.appendChild(make('h2', null, 'All three levels complete'));
      box.appendChild(make('p', null, accuracyLine()));
      box.appendChild(make('p', 'screen-note', SCORM.isConnected()
        ? 'Your completion has been sent to the gradebook. You may close this window.'
        : 'Running outside an LMS — nothing was reported.'));
      var again = make('button', 'primary', 'Play again with new spectra');
      again.type = 'button';
      again.addEventListener('click', function () {
        state = newRun();
        persist();
        hideScreen();
        item = buildItem();
        render();
        say('');
      });
      box.appendChild(again);
    }

    s.appendChild(box);
  }

  function accuracyLine() {
    var st = state.stats;
    if (!st.slots) return 'No answers recorded yet.';
    var pct = Math.round(st.firstTry / st.slots * 100);
    return st.firstTry + ' of ' + st.slots + ' labels placed correctly on the first try (' +
           pct + '%), across ' + st.attempts + ' attempts.';
  }

  /* ----------------------------------------------------------- interaction */

  function tileIndexOf(node) {
    var t = node.closest ? node.closest('.tile') : null;
    return t ? +t.dataset.tile : -1;
  }

  function slotIndexAt(clientX, clientY) {
    var node = document.elementFromPoint(clientX, clientY);
    if (!node || !node.closest) return -1;
    var hit = node.closest('.slot');
    return hit ? +hit.dataset.slot : -1;
  }

  function clearSelection() {
    if (selectedTile == null) return;
    var nodes = el.tray.querySelectorAll('.tile.selected');
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('selected');
    selectedTile = null;
    el.stage.classList.remove('picking');
  }

  function startDrag(ev) {
    var idx = tileIndexOf(ev.target);
    if (idx < 0) return;
    var tileNode = ev.target.closest('.tile');
    drag = { index: idx, moved: false, node: null, pointerId: ev.pointerId,
             from: tileNode, x0: ev.clientX, y0: ev.clientY };
    try { tileNode.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
  }

  function moveDrag(ev) {
    if (!drag) return;
    if (!drag.moved) {
      /* movementX is unreliable on touch, so measure from the press point */
      if (Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < 6) return;
      drag.moved = true;
      var ghost = make('div', 'ghost', item.tiles[drag.index].label);
      document.body.appendChild(ghost);
      drag.node = ghost;
      drag.from.classList.add('dragging');
    }
    drag.node.style.left = ev.clientX + 'px';
    drag.node.style.top = ev.clientY + 'px';

    var over = slotIndexAt(ev.clientX, ev.clientY);
    var nodes = el.overlay.querySelectorAll('.slot');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle('hover', over >= 0 && nodes[i].dataset.slot === String(over));
    }
  }

  function endDrag(ev) {
    if (!drag) return;
    var d = drag;
    drag = null;
    if (d.node) d.node.remove();
    d.from.classList.remove('dragging');
    var nodes = el.overlay.querySelectorAll('.slot');
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('hover');

    /* A tap without movement is left to the click handler below, so that a
       keyboard Enter - which fires click and no pointer events at all - takes
       exactly the same path. */
    if (!d.moved) return;

    suppressClick = true;
    var slot = slotIndexAt(ev.clientX, ev.clientY);
    if (slot >= 0) attempt(slot, d.index);
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
    say('Now choose the peak that belongs to ' + item.tiles[index].label + '.');
  }

  function onTrayClick(ev) {
    if (suppressClick) { suppressClick = false; return; }
    var idx = tileIndexOf(ev.target);
    if (idx >= 0) selectTile(idx);
  }

  function onStageClick(ev) {
    var hit = ev.target.closest && ev.target.closest('.slot');
    if (hit && selectedTile != null) {
      var tileIdx = selectedTile;
      clearSelection();
      attempt(+hit.dataset.slot, tileIdx);
      return;
    }
    var choice = ev.target.closest && ev.target.closest('.choice');
    if (choice) chooseCompound(choice.dataset.mol, choice);
  }

  /* ------------------------------------------------------------------ boot */

  function cacheDom() {
    ['plot', 'overlay', 'tray', 'card', 'feedback', 'next', 'tabs',
     'levelName', 'blurb', 'counter', 'screen', 'choices', 'stage', 'reference',
     'refbody', 'lms'].forEach(function (id) { el[id] = $(id); });
  }

  function buildReference() {
    var table = make('table', 'ref-table');
    var head = make('tr');
    ['Bond', 'Wavenumber (cm⁻¹)', 'Look for'].forEach(function (h) {
      head.appendChild(make('th', null, h));
    });
    table.appendChild(head);
    Object.keys(GROUPS).forEach(function (k) {
      var g = GROUPS[k];
      var tr = make('tr', g.fingerprint ? 'fingerprint-row' : null);
      tr.appendChild(make('td', null, g.label + (g.fingerprint ? ' †' : '')));
      tr.appendChild(make('td', 'num', g.range));
      tr.appendChild(make('td', 'note', g.hint));
      table.appendChild(tr);
    });
    el.refbody.appendChild(table);
    el.refbody.appendChild(make('p', 'ref-foot',
      '† Below 1500 cm⁻¹, in the fingerprint region. Worth knowing, and worth ' +
      'using as corroboration, but never one of the peaks you are asked to label here.'));
  }

  function start() {
    cacheDom();
    indexSignatures();
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
      state.level = (startLevel >= 1 && startLevel <= LEVELS.length) ? startLevel : 3;
    } else {
      state = restore(SCORM.loadState()) || newRun();
      if (!state.plan || !state.plan[1] || !byId(state.plan[1][0])) state = newRun();
    }

    /* Write the run out before the first answer. Without this a discarded
       older save survives in storage until a student answers something, and a
       student who opens the activity and closes it again comes back to a
       different set of spectra. */
    persist();

    item = buildItem();
    render();

    el.tray.addEventListener('pointerdown', startDrag);
    el.tray.addEventListener('pointermove', moveDrag);
    el.tray.addEventListener('pointerup', endDrag);
    el.tray.addEventListener('pointercancel', endDrag);
    el.tray.addEventListener('click', onTrayClick);

    el.stage.addEventListener('click', onStageClick);
    el.choices.addEventListener('click', onStageClick);

    el.next.addEventListener('click', nextItem);
    el.tabs.addEventListener('click', function (ev) {
      var tab = ev.target.closest('.tab');
      if (tab && !tab.disabled) goToLevel(+tab.dataset.level);
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') clearSelection();
    });

    var ro = new ResizeObserver(function () { paintSpectrum(); });
    ro.observe(el.plot.parentNode);

    showScreen('intro');
  }

  return { start: start };
})();

document.addEventListener('DOMContentLoaded', Game.start);

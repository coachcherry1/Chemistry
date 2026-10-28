/* game.js — levels, drag-and-drop, feedback and progression.
 *
 * Level 1  READ THE LOSSES      compound named. Label each marked peak with
 *                               what was lost from the molecular ion: -15,
 *                               -18, -29, -43. Arithmetic first.
 * Level 2  NAME THE FRAGMENT    compound hidden. Label each marked peak with
 *                               the FRAGMENT it is, then identify the
 *                               compound. Tiles carry formulas, never m/z
 *                               values, so a student adds up the formula and
 *                               matches it to a mass on the plot.
 * Level 3  PREDICT THE BASE PEAK  spectrum hidden. From the structure alone,
 *                               choose which cleavage gives the most stable
 *                               cation, then say where it lands. The spectrum
 *                               is revealed afterwards as the answer.
 *
 * IGNORING NOISE is not a level, it is a property of every item. Each
 * spectrum draws 15-25 peaks and asks about 2-4 of them. Every other peak is
 * clickable and explains why it is not an answer - too small to read, or big
 * enough but not diagnostic, or a rearrangement this unit does not cover.
 *
 * Every drop works three ways so it survives a Chromebook trackpad, a touch
 * screen and a keyboard: pointer drag, click-tile-then-click-peak, and tab +
 * Enter, which takes the same path as the click.
 */

var Game = (function () {
  'use strict';

  /* One compound per theme, so a run always contains an alcohol, a carbonyl,
     an arene, a branched chain, a heteroatom compound and a halide rather
     than whatever chance produces. Level 3 draws no halide: a C-X bond simply
     breaks, with no second route to weigh it against. */
  var THEMES = {
    loss:    ['alcohol', 'carbonyl', 'arene', 'branch', 'hetero', 'halide'],
    /* Level 3 guarantees neither an arene nor a halide. A halide simply
       snaps its C–X bond, and every alkylbenzene but cumene gives m/z 91 and
       nothing that competes with it — so there is no second route to weigh.
       Cumene can still be drawn into a free slot; it just is not forced,
       which would mean repeating it after Levels 1–2 had already used it. */
    predict: ['alcohol', 'carbonyl', 'branch', 'hetero']
  };

  /* Levels 1 and 2 ask the SAME question — what did the molecular ion lose?
     Only the scaffolding changes: Level 1 names the compound, Level 2 puts
     three candidate structures on the bench and makes the student work out
     which one they are holding. Both draw from the same pool, because both
     need a molecular ion you can actually subtract from. */
  var LEVELS = [
    { n: 1, name: 'Read the losses', tag: 'loss', mode: 'loss', items: 7,
      reference: true, distractors: 2,
      blurb: 'The compound is named for you. Label each marked peak with what the molecule LOST to make it.' },
    { n: 2, name: 'Which compound is it?', tag: 'loss', mode: 'loss', items: 7,
      reference: true, distractors: 3, identify: true, candidates: true,
      blurb: 'Same job — label what was lost — but the compound is one of three. Read the molecular ion off the plot, work out the mass of each candidate, and see which one fits.' },
    { n: 3, name: 'Predict the base peak', tag: 'predict', mode: 'predict', items: 7,
      blurb: 'No spectrum yet. From the structure alone, work out which break leaves the most stable fragment, and where it lands.' }
  ];

  /* Bumped whenever the shape of a saved run changes - the level list, the
     draw, or the vocabulary. A save from an older build is discarded rather
     than resumed, otherwise a student carries a stale lineup of spectra
     forward and never sees the new one. */
  var SCHEMA = 4;

  var el = {};
  var state = null;
  var item = null;
  var selectedTile = null;
  var drag = null;
  var suppressClick = false;
  var resumed = false;          /* opened onto a save rather than a fresh run */

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
    for (var i = 0; i < COMPOUNDS.length; i++) if (COMPOUNDS[i].id === id) return COMPOUNDS[i];
    return null;
  }

  /* --------------------------------------------------- compound choices
   *
   * A student decides the identify question from the peaks they just
   * labelled, so those peaks are the only fair evidence. SIG is that set.
   * Two compounds with the same SIG are indistinguishable here however
   * different they are on paper - acetophenone and cumene both put peaks at
   * 77, 105 and 120 - so one is never offered against the other.
   */
  var SIG = {};

  function indexSignatures() {
    COMPOUNDS.forEach(function (c) {
      var mol = MS.parseFormula(c.f), M = MS.massOf(mol);
      SIG[c.id] = c.peaks.filter(function (p) { return p.role === 'key' || p.role === 'mplus'; })
                         .map(function (p) { return p.mz; })
                         .sort(function (a, b) { return a - b; });
      SIG[c.id].M = M;
    });
  }

  /* Decoys should force a decision, not be dismissed at a glance. The best
     one shares most of the answer's peaks and differs by one the student
     labelled - so 1-butanol is offered against 2-butanol, separated only by
     31 against 45, which is exactly the primary/secondary distinction. */
  function halogenOf(c) {
    var m = MS.parseFormula(c.f) || {};
    return m.Br ? 'Br' : m.Cl ? 'Cl' : null;
  }

  function pickDecoys(answer, count, rand) {
    var aSig = SIG[answer.id], aKey = aSig.join(',');
    var aHal = halogenOf(answer);

    var ranked = COMPOUNDS.filter(function (c) {
      return c.id !== answer.id && SIG[c.id].join(',') !== aKey;
    }).map(function (c) {
      var s = SIG[c.id];
      var shared = s.filter(function (mz) { return aSig.indexOf(mz) >= 0; }).length;
      var apart = s.length + aSig.length - 2 * shared;
      var score = shared * 3 - apart
        + (c.theme === answer.theme ? 4 : 0)
        + (c.f === answer.f ? 5 : 0)                    /* an isomer is the sharpest decoy */
        + (SIG[c.id].M === aSig.M ? 3 : 0)              /* same molecular weight is sharper still */
        + (aHal && halogenOf(c) ? (halogenOf(c) === aHal ? 9 : 6) : 0)
        + rand() * 2;
      return { c: c, score: score };
    });

    ranked.sort(function (a, b) { return b.score - a.score; });
    var picked = ranked.slice(0, count).map(function (x) { return x.c; });

    /* An M+2 doublet is visible from across the room. If the answer is a
       halide and none of its rivals is, the question answers itself without
       any chemistry — so force at least one halide rival in, preferring the
       SAME halogen, which makes the student read the 3:1 against the 1:1
       rather than just spotting that a doublet is there at all. */
    if (aHal && !picked.some(halogenOf)) {
      var rival = ranked.filter(function (x) { return halogenOf(x.c); })[0];
      if (rival) picked[picked.length - 1] = rival.c;
    }
    return picked;
  }

  /* ------------------------------------------------------------ the draw */

  function pickCompounds(tag, count, rand, used) {
    var pool = COMPOUNDS.filter(function (c) { return c.tags.indexOf(tag) >= 0; });
    var chosen = [];

    function take(candidates) {
      var fresh = candidates.filter(function (c) { return !used || used.indexOf(c.id) < 0; });
      var from = fresh.length ? fresh : candidates;
      return from.length ? shuffle(from, rand)[0] : null;
    }

    THEMES[tag].forEach(function (theme) {
      if (chosen.length >= count) return;
      var pick = take(pool.filter(function (c) {
        return c.theme === theme && chosen.indexOf(c) < 0;
      }));
      if (pick) chosen.push(pick);
    });

    var rest = shuffle(pool.filter(function (c) { return chosen.indexOf(c) < 0; }), rand);
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
    var rand = MS.rng(seed);
    var plan = {}, used = [];
    /* ONE used-list for the whole run, not one per pool. Keying it by tag
       meant a compound tagged for two different levels could be drawn twice
       in the same sitting — a student would meet the same spectrum in Level 1
       and again in Level 3 and reasonably wonder what they were missing. */
    LEVELS.forEach(function (L) {
      var ids = pickCompounds(L.tag, L.items, rand, used).map(function (c) { return c.id; });
      plan[L.n] = ids;
      used = used.concat(ids);
    });
    return {
      seed: seed, unlocked: 1, level: 1, index: 0, done: [],
      stats: { attempts: 0, firstTry: 0, slots: 0 },
      plan: plan
    };
  }

  /* Returns where the save landed — 'lms', 'local' or 'none' — so the Save
     progress button can report it. Progress is written after every answer
     anyway; the button exists so a student leaving mid-activity gets told, in
     so many words, that it is safe to close the window. */
  function persist() {
    if (state.pin) return 'none';
    return SCORM.saveState({
      v: SCHEMA, s: state.seed, u: state.unlocked, l: state.level, i: state.index,
      d: state.done, st: state.stats, p: state.plan
    });
  }

  var saveTimer = null;

  function saveNow() {
    if (state.pin) {
      say('This is a pinned demo spectrum, so nothing is saved. Open the activity normally ' +
          'to keep progress.', 'quiet');
      return;
    }
    var where = persist();
    if (where === 'lms') {
      say('Progress saved. You can close this window — it will open again at Level ' +
          state.level + ', spectrum ' + (state.index + 1) + '.', 'good');
    } else if (where === 'local') {
      say('Progress saved in this browser. It will reopen at Level ' + state.level +
          ', spectrum ' + (state.index + 1) + ' — but on this computer only, since no LMS ' +
          'was detected.', 'good');
    } else {
      say('Could not save. Your browser may be blocking storage — keep this window open ' +
          'until you have finished.', 'bad');
    }

    el.saveNote.textContent = where === 'none' ? '' : 'Saved';
    el.saveNote.className = 'save-note ' + (where === 'none' ? 'bad' : 'ok');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      el.saveNote.textContent = '';
      el.saveNote.className = 'save-note';
    }, 4000);
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

  function itemCount(level) {
    return state.pin ? 1 : LEVELS[level - 1].items;
  }

  function buildItem() {
    var cfg = LEVELS[state.level - 1];
    var compound = state.pin ? byId(state.pin) : byId(state.plan[state.level][state.index]);
    var seed = (state.seed + state.level * 7919 + state.index * 104729) >>> 0;
    var spec = MS.build(compound, seed);
    var rand = MS.rng(seed ^ 0x51ed2701);

    return cfg.mode === 'predict'
      ? buildPredictItem(cfg, compound, spec, rand)
      : buildLabelItem(cfg, compound, spec, rand);
  }

  function buildLabelItem(cfg, compound, spec, rand) {
    var targets = spec.peaks.filter(function (p) { return p.target; });
    targets.sort(function (a, b) { return b.mz - a.mz; });

    var slots = targets.map(function (p, i) {
      return { key: keyOf(p, spec.M, cfg.mode), peak: p, filled: false, tries: 0, i: i };
    });

    var needed = {};
    slots.forEach(function (s) { needed[s.key] = (needed[s.key] || 0) + 1; });

    var wanted = [];
    Object.keys(needed).forEach(function (k) {
      for (var i = 0; i < needed[k]; i++) wanted.push(k);
    });

    var tiles = shuffle(wanted.concat(distractorsFor(needed, cfg, rand)), rand)
      .map(function (k) {
        return { key: k, label: keyLabel(k), sub: keySub(k), used: false, distractor: !needed[k] };
      });

    var choices = null;
    if (cfg.identify) choices = shuffle([compound].concat(pickDecoys(compound, 2, rand)), rand);

    return { cfg: cfg, compound: compound, spec: spec, slots: slots, tiles: tiles,
             choices: choices, phase: 'label' };
  }

  /* The wrong tile offered against a m/z 43 acylium is the m/z 43 propyl
     cation, not something absurd. Distractors are drawn twin first, then from
     the same stability class, then at random - so a Level 2 tray is a set of
     genuine alternatives rather than a lineup of obvious rejects. */
  function distractorsFor(needed, cfg, rand) {
    var want = cfg.distractors || 2;
    var picked = [];

    function add(k) {
      if (k && !needed[k] && picked.indexOf(k) < 0 && picked.length < want) picked.push(k);
    }

    /* The four losses this unit is built around are the fairest wrong
       answers: a student should be checking for all of them every time. */
    shuffle(['loss_15', 'loss_18', 'loss_29', 'loss_43'], rand).forEach(add);
    shuffle(UNIVERSE.loss, rand).forEach(add);
    return picked;
  }

  /* ---------------------------------------------------------- Level 3 build */

  function buildPredictItem(cfg, compound, spec, rand) {
    var routes = spec.peaks.filter(function (p) {
      return p.role === 'key' && p.ion && IONS[p.ion];
    }).map(function (p) {
      return { peak: p, ion: IONS[p.ion], winner: p.declared === 100 };
    });

    /* m/z decoys: the masses of the routes that lost, then the obvious
       losses off the molecular ion. Every option is a number a student could
       genuinely have arrived at. */
    var winner = routes.filter(function (r) { return r.winner; })[0];
    var mzOptions = [winner.peak.mz];
    routes.forEach(function (r) {
      if (mzOptions.indexOf(r.peak.mz) < 0 && mzOptions.length < 4) mzOptions.push(r.peak.mz);
    });
    shuffle([15, 18, 29, 43], rand).forEach(function (n) {
      var v = spec.M - n;
      if (v > 12 && mzOptions.indexOf(v) < 0 && mzOptions.length < 4) mzOptions.push(v);
    });

    return {
      cfg: cfg, compound: compound, spec: spec, phase: 'predict',
      routes: shuffle(routes, rand), winner: winner,
      mzOptions: shuffle(mzOptions, rand), mzTries: 0, routeTries: 0,
      slots: [], tiles: [], choices: null
    };
  }

  /* ---------------------------------------------------------------- painting */

  function paintSpectrum() {
    if (item.phase === 'predict') {
      el.overlay.innerHTML = '';
      var ctx = el.plot.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, el.plot.width, el.plot.height);
      el.plotwrap.classList.add('hidden-spectrum');
      return;
    }
    el.plotwrap.classList.remove('hidden-spectrum');
    var rect = MS.draw(el.plot, item.spec);
    if (rect) { item.rect = rect; layoutMarkers(rect); }
  }

  /* Place each marker above its stick, stepping up and sideways until it
     overlaps nothing already placed. Nodes are built and measured first,
     because a filled chip is several times wider than an empty circle and
     guessing its width gets the collision test wrong. */
  function layoutMarkers(rect) {
    el.overlay.innerHTML = '';
    if (!item.slots.length) return;

    var nodes = item.slots.map(function (s) {
      var node = make('button', 'slot' + (s.filled ? ' ok' : ''));
      node.type = 'button';
      node.dataset.slot = String(s.i);
      node.setAttribute('aria-label', s.filled
        ? s.filledLabel + ' at m/z ' + s.peak.mz
        : 'Unlabelled peak at m/z ' + s.peak.mz + ', ' + Math.round(s.peak.ab) + ' percent');
      /* The plot prints every readable peak's mass, so the marker does not
         need to repeat it — and must not, because once filled it carries the
         answer instead and the mass would be lost. "?" just says "this is
         one of the ones being asked about". */
      node.textContent = s.filled ? s.filledLabel : '?';
      node.style.visibility = 'hidden';
      el.overlay.appendChild(node);
      return node;
    });

    function overlap(a, b) {
      var ox = Math.min(a.r, b.r) - Math.max(a.l, b.l);
      var oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      return (ox > 0 && oy > 0) ? Math.min(ox, oy) : 0;
    }

    /* Seed the collision test with the masses the plot has already printed,
       so a marker is never placed over the number it belongs to. */
    var placed = (rect.labels || []).slice(), leaders = [];

    item.slots.forEach(function (s, i) {
      var node = nodes[i];
      var w = node.offsetWidth || 36;
      var h = node.offsetHeight || 36;
      var x0 = MS.xOfMz(s.peak.mz, rect, item.spec);
      /* Start above the peak's printed m/z, not above the stick, so the
         marker never sits on top of the number it belongs to. */
      var yTop = MS.yOfAb(s.peak.ab, rect) - MS.LABEL_H;

      /* Candidates in order of preference: stacked above the printed mass,
         centre first and then either side. Failing all of those — which is
         what happens to the base peak, since a 100% stick has no room above
         it — beside the peak instead, offset far enough to clear its label.
         Sitting on top of the label is never an option: the mass is the one
         thing the student must be able to read. */
      var cands = [];
      for (var up = 0; up < 7; up++) {
        var cy = yTop - h / 2 - 9 - up * (h + 4);
        cands.push({ x: x0, y: cy });
        cands.push({ x: x0 + w * 0.62, y: cy });
        cands.push({ x: x0 - w * 0.62, y: cy });
      }
      for (var d = 0; d < 3; d++) {
        var by = yTop + MS.LABEL_H + h / 2 + d * (h + 4);
        cands.push({ x: x0 + w / 2 + 22, y: by });
        cands.push({ x: x0 - w / 2 - 22, y: by });
      }

      var best = null, bestCost = Infinity;
      for (var ci = 0; ci < cands.length && bestCost > 0; ci++) {
        var cx = cands[ci].x, cyy = cands[ci].y;
        if (cyy - h / 2 < rect.y + 2 || cyy + h / 2 > rect.y + rect.h - 2) continue;
        if (cx - w / 2 < rect.x + 2 || cx + w / 2 > rect.x + rect.w - 2) continue;
        var box = { l: cx - w / 2, r: cx + w / 2, t: cyy - h / 2, b: cyy + h / 2 };
        var cost = 0;
        placed.forEach(function (p) { cost += overlap(box, p); });
        if (cost < bestCost) { bestCost = cost; best = box; }
      }

      if (!best) {
        var fy = Math.max(rect.y + h / 2 + 2, yTop - h / 2 - 9);
        best = { l: x0 - w / 2, r: x0 + w / 2, t: fy - h / 2, b: fy + h / 2 };
      }

      placed.push(best);
      leaders.push({ x: x0, y0: yTop, y1: best.b });
      node.style.left = ((best.l + best.r) / 2) + 'px';
      node.style.top = ((best.t + best.b) / 2) + 'px';
      node.style.visibility = '';
    });

    MS.drawLeaders(el.plot, leaders);
  }

  function paintTray() {
    el.tray.innerHTML = '';
    if (item.cfg.mode === 'predict') {
      el.tray.appendChild(make('p', 'tray-empty',
        'Nothing to place yet — answer both questions and the spectrum appears.'));
      return;
    }
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

  /* A picture of what is left after each loss, built up as the student goes.
   *
   * Seeing the ethyl walk off and the charge land on the carbon next to the
   * C=O is the thing that makes Level 3 answerable later — the stability
   * argument is about a structure, not a number, and until now the structure
   * was never drawn.
   *
   * At Level 2 it waits until the compound has been identified: drawing the
   * right skeleton mid-item would answer the question the level is asking.
   */
  function paintFragments() {
    var slots = (item.slots || []).filter(function (s) { return s.filled; });
    var allowed = item.cfg.mode !== 'predict' &&
                  (!item.cfg.candidates || item.phase === 'done');

    if (!allowed || !slots.length) {
      el.fragments.hidden = true;
      el.fragments.innerHTML = '';
      return;
    }

    el.fragments.hidden = false;
    el.fragments.innerHTML = '';
    el.fragments.appendChild(make('p', 'frag-head',
      'What each labelled peak actually is. The solid part kept the charge; anything ' +
      'dashed walked off as a neutral.'));

    var row = make('div', 'frag-row');
    slots.slice().sort(function (a, b) { return b.peak.mz - a.peak.mz; }).forEach(function (s) {
      var view = MS.fragmentView(item.compound, s.peak);
      var cell = make('div', 'frag-cell');
      cell.appendChild(make('span', 'frag-mz', 'm/z ' + s.peak.mz));
      if (view) {
        cell.appendChild(Structure.render(item.compound.structure, {
          keeps: view.keeps, charge: view.charge, scale: 22,
          highlight: view.kind === 'isotope' && view.heavy >= 0 ? view.heavy : null,
          alt: view.kind === 'isotope'
            ? 'The same molecule at m/z ' + s.peak.mz + ', carrying a heavier isotope'
            : 'The fragment at m/z ' + s.peak.mz + ', with the lost piece dashed'
        }));
      }
      var neutral;
      if (view && view.kind === 'isotope') {
        /* Nothing was lost, so "lost ?" is the wrong sentence entirely. */
        neutral = view.note;
      } else if (view && view.kind === 'whole') {
        neutral = 'the whole molecule';
      } else {
        neutral = 'lost ' + (MS.neutralOf(item.spec, s.peak) || '?');
        /* Only the O or the halogen can be drawn leaving; the hydrogen that
           goes with it comes off a neighbouring carbon, and a skeletal
           drawing has no hydrogens to ghost. Say so rather than let the
           picture imply the OH left on its own. */
        if (view && view.kind === 'ghost') neutral += ' — the H comes off the carbon next door';
        if (view && view.kind === 'hydrogen') neutral += ' — nothing heavy left, so nothing is dashed';
      }
      cell.appendChild(make('span', 'frag-lost', neutral));
      row.appendChild(cell);
    });
    el.fragments.appendChild(row);
  }

  function paintCard() {
    el.card.innerHTML = '';
    if (item.cfg.candidates) {
      el.card.appendChild(make('p', 'card-kicker', 'Unknown compound'));
      el.card.appendChild(make('p', 'card-hidden', '?'));
      el.card.appendChild(make('p', 'card-note',
        'It is one of the three below the plot. Start with the molecular ion — the ' +
        'rightmost real peak, ignoring the isotope peaks just past it — and work out which ' +
        'candidate weighs that much.'));
      return;
    }
    el.card.appendChild(make('p', 'card-kicker', item.compound.cls));
    el.card.appendChild(make('h3', 'card-name', item.compound.name));
    el.card.appendChild(Structure.render(item.compound.structure,
      { alt: 'Skeletal structure of ' + item.compound.name }));
    el.card.appendChild(make('p', 'card-formula', item.compound.formula));
    el.card.appendChild(make('p', 'card-mass', 'M = ' + item.spec.M));
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
    /* Exposed so the item under test can be inspected from the console, and
       so tools/drive can play the activity without scraping the DOM. */
    window.__item = item;
    paintHeader();
    paintCard();
    paintTray();
    paintSpectrum();
    paintFragments();
    el.choices.hidden = true;
    el.next.hidden = true;
    if (item.phase === 'predict') paintRoutes();
    else if (item.cfg.candidates) paintChoices(false);
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
      say('Correct — m/z ' + slot.peak.mz + '. ' + keyHint(slot.key), 'good');
      paintTray();
      paintSpectrum();
      paintFragments();
      if (item.slots.every(function (s) { return s.filled; })) finishLabels();
    } else {
      say(wrongNote(slot, tile), 'bad');
      flash(slotIndex);
    }
    persist();
  }

  function wrongNote(slot, tile) {
    var M = item.spec.M;
    if (tile.distractor) {
      if (item.cfg.mode === 'loss') {
        var n = tile.key.indexOf('loss_') === 0 ? +tile.key.slice(5) : null;
        if (n != null) {
          return 'This compound shows no ' + tile.label + '. That would put a peak at m/z ' +
                 (M - n) + ' — look there, and there is nothing worth reading.';
        }
      } else if (IONS[tile.key] && IONS[tile.key].mz) {
        return 'There is no ' + IONS[tile.key].label + ' here — that ion would sit at m/z ' +
               IONS[tile.key].mz + '. ' + IONS[tile.key].hint;
      }
      return 'This compound cannot make ' + tile.label + '. ' + keyHint(tile.key);
    }
    return 'Not at m/z ' + slot.peak.mz + '. ' + keyHint(slot.key);
  }

  /* Every peak that is NOT an answer still teaches something when a student
     pokes at it - which is how "ignore the noise" gets practised rather than
     just stated. */
  function noiseNote(peak) {
    var pct = Math.round(peak.ab);
    /* A peak may carry its own note where the generic wording would mislead —
       CH2=OH+ turning up in a SECONDARY alcohol, say, where the stock hint
       "m/z 31 is the flag for a primary alcohol" would be actively wrong. */
    if (peak.note) return 'm/z ' + peak.mz + ' is ' + pct + '%. ' + peak.note;
    switch (peak.role) {
      case 'miso1':
        return 'm/z ' + peak.mz + ' is the M+1 isotope peak — one ¹³C in place of a ¹²C. ' +
               'It is about 1.1% of M⁺ for every carbon in the molecule, so its height COUNTS ' +
               'THE CARBONS. It is not a fragment.';
      case 'miso2':
        return 'm/z ' + peak.mz + ' is the M+2 isotope peak, not a fragment. Compare it with M⁺: ' +
               'about a third as tall means chlorine, about equal means bromine.';
      case 'sat':
        return 'm/z ' + peak.mz + ' is the ¹³C satellite of the peak one mass unit below it. ' +
               'Every carbon-containing peak carries one. Not a fragment.';
      case 'mcl':
        return 'm/z ' + peak.mz + ' is real, but it comes from a REARRANGEMENT rather than a ' +
               'simple cleavage — the molecule folds over and passes a hydrogen across before ' +
               'it breaks. That is not part of this unit, so leave it alone for now.';
      case 'cluster':
        return clusterNote(peak, pct);
      default:
        return 'm/z ' + peak.mz + ' is only ' + (peak.ab < 1 ? 'about 1' : pct) +
               '% of the base peak — below the reading line. Not worth your attention.';
    }
  }

  /* A peak above the threshold that is still not an answer comes in two
     kinds, and telling a student the wrong one teaches them something false.
     Chatter is chatter: m/z 41 turns up under any chain and narrows nothing
     down. But a resonance-stabilised or tertiary cation sitting at 20% is a
     real diagnostic ion that simply is not the peak being asked about here,
     and saying "that means nothing" about benzaldehyde's formyl cation would
     be a lie. */
  function clusterNote(peak, pct) {
    var ion = peak.ion ? IONS[peak.ion] : null;
    var diagnostic = ion && (ion.cls === 'resonance' || ion.cls === 'tertiary');

    if (diagnostic) {
      return 'm/z ' + peak.mz + ' is ' + pct + '%, and it really is ' + ion.label + '. ' +
             'It is genuine chemistry — just not one of the peaks marked for you here, ' +
             'because a bigger peak makes the same point. ' + ion.hint;
    }
    var source = ion && ion.cls === 'aryl'
      ? 'it is what is left when a ring fragment breaks up further'
      : 'almost every chain of this length throws one off';
    return 'm/z ' + peak.mz + ' is ' + pct + '% — well above the line, so it is a real peak. ' +
           'But it narrows nothing down: ' + source + '.' +
           (ion ? ' (' + ion.label + ')' : '');
  }

  function flash(slotIndex) {
    var nodes = el.overlay.querySelectorAll('.slot');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].dataset.slot === String(slotIndex)) {
        nodes[i].classList.remove('shake');
        void nodes[i].offsetWidth;
        nodes[i].classList.add('shake');
      }
    }
  }

  function finishLabels() {
    if (item.cfg.identify) {
      item.phase = 'identify';
      clearSelection();
      paintTray();
      say('Every marked peak is labelled. Now — which compound is this?', 'good');
      window.__item = item;
      paintChoices(true);
    } else {
      item.phase = 'done';
      clearSelection();
      paintTray();
      say('Spectrum complete.', 'good');
      el.next.hidden = false;
      el.next.focus();
    }
  }

  /* Shown from the moment the item opens, not sprung once the labelling is
     done. Three structures on the bench are the scaffolding: they turn "what
     is this?" into "which of these three is this?", and a student can check a
     candidate's mass against the molecular ion before touching a tile. */
  function paintChoices(asking) {
    el.choices.hidden = false;
    el.choices.innerHTML = '';
    el.choices.appendChild(make('p', 'choices-q', asking
      ? 'Which compound produced this spectrum?'
      : 'The compound is one of these three. Work out what each one weighs, and check it ' +
        'against the molecular ion.'));
    var row = make('div', 'choices-row' + (asking ? '' : ' preview'));
    item.choices.forEach(function (c) {
      var b = make('button', 'choice');
      b.type = 'button';
      b.dataset.mol = c.id;
      b.appendChild(Structure.render(c.structure, { alt: c.name, scale: 26 }));
      b.appendChild(make('span', 'choice-name', c.name));
      b.appendChild(make('span', 'choice-formula', c.formula));
      row.appendChild(b);
    });
    el.choices.appendChild(row);
  }

  function chooseCompound(id, node) {
    if (item.phase === 'label') {
      say('Label the marked peaks first — the losses are what tell you which of these three ' +
          'it is.', 'quiet');
      return;
    }
    if (item.phase !== 'identify') return;
    state.stats.attempts++;
    if (id === item.compound.id) {
      state.stats.slots++;
      state.stats.firstTry++;
      item.phase = 'done';
      node.classList.add('right');
      say(item.compound.name + ' — ' + item.compound.cls.toLowerCase() + ', M = ' +
          item.spec.M + '. The losses you labelled are the evidence.', 'good');
      paintFragments();
      el.next.hidden = false;
      el.next.focus();
    } else {
      node.classList.add('wrong');
      node.disabled = true;
      say('No. Work out the molecular mass of each structure offered and check it against the ' +
          'molecular ion, then look at which fragment each one could actually make.', 'bad');
    }
    persist();
  }

  /* ------------------------------------------------------- Level 3: predict */

  function paintRoutes() {
    el.choices.hidden = false;
    el.choices.innerHTML = '';
    el.choices.appendChild(make('p', 'choices-q',
      'Every one of these losses happens. Which one leaves the most stable fragment — which ' +
      'peak will be the TALLEST?'));
    var row = make('div', 'choices-row routes');
    item.routes.forEach(function (r, i) {
      var b = make('button', 'choice route');
      b.type = 'button';
      b.dataset.route = String(i);
      /* Led by the loss, the way the rest of the package frames it. */
      var neutral = MS.neutralOf(item.spec, r.peak);
      b.appendChild(make('span', 'route-loss',
        'Lose ' + (neutral || '?') + '   (M − ' + (item.spec.M - r.peak.mz) + ')'));
      var view = MS.fragmentView(item.compound, r.peak);
      if (view) {
        b.appendChild(Structure.render(item.compound.structure, {
          keeps: view.keeps, charge: view.charge, scale: 25,
          alt: 'what is left after losing ' + (MS.neutralOf(item.spec, r.peak) || 'the fragment')
        }));
      }
      b.appendChild(make('span', 'route-ion', 'leaves ' + r.ion.label));
      /* "Lose H2O" already says how it broke, so a whole-molecule loss does
         not repeat the mechanism underneath itself. */
      b.appendChild(make('span', 'route-mech', r.ion.cls === 'radical'
        ? r.ion.name
        : r.ion.name + ' · ' + (MECH[r.ion.mech] || r.ion.mech)));
      row.appendChild(b);
    });
    el.choices.appendChild(row);
  }

  var MECH = {
    alpha: 'breaks next to the O or N (α-cleavage)',
    branch: 'breaks at the branch point',
    benzylic: 'breaks next to the ring',
    dehydr: 'loses water',
    sigma: 'plain C–C break'
  };

  function chooseRoute(index, node) {
    if (item.phase !== 'predict') return;
    var r = item.routes[index];
    item.routeTries++;
    state.stats.attempts++;

    if (!r.winner) {
      node.classList.add('wrong');
      node.disabled = true;
      say(r.ion.label + ' is ' + STABILITY[r.ion.cls] + ', and it does form — but something ' +
          'here is better stabilised than that. ' + r.ion.hint, 'bad');
      return;
    }

    if (item.routeTries === 1) state.stats.firstTry++;
    state.stats.slots++;
    node.classList.add('right');
    item.phase = 'mz';
    say('Right — ' + r.ion.label + ', ' + STABILITY[r.ion.cls] + '. ' + r.peak.why, 'good');
    paintMzQuestion();
    persist();
  }

  function paintMzQuestion() {
    el.choices.innerHTML = '';
    el.choices.appendChild(make('p', 'choices-q',
      'Now the arithmetic: ' + item.compound.formula + ' has M = ' + item.spec.M +
      '. At what m/z does ' + item.winner.ion.label + ' appear?'));
    var row = make('div', 'choices-row mzrow');
    item.mzOptions.forEach(function (mz) {
      var b = make('button', 'choice mz');
      b.type = 'button';
      b.dataset.mz = String(mz);
      b.appendChild(make('span', 'mz-value', String(mz)));
      b.appendChild(make('span', 'mz-sub', 'M − ' + (item.spec.M - mz)));
      row.appendChild(b);
    });
    el.choices.appendChild(row);
  }

  function chooseMz(mz, node) {
    if (item.phase !== 'mz') return;
    item.mzTries++;
    state.stats.attempts++;

    if (mz !== item.winner.peak.mz) {
      node.classList.add('wrong');
      node.disabled = true;
      say('Not m/z ' + mz + '. Write out what leaves: ' + item.winner.ion.label +
          ' is what remains once that neutral is gone, so subtract the neutral’s mass from ' +
          item.spec.M + '.', 'bad');
      return;
    }

    if (item.mzTries === 1) state.stats.firstTry++;
    state.stats.slots++;
    node.classList.add('right');
    item.phase = 'done';
    revealSpectrum();
    persist();
  }

  /* The reveal is the answer key: the spectrum they predicted, with the full
     ordering of routes spelled out underneath it. */
  function revealSpectrum() {
    item.slots = [{
      key: item.winner.peak.ion, peak: item.winner.peak, filled: true,
      filledLabel: item.winner.ion.label, tries: 0, i: 0
    }];
    paintSpectrum();
    paintTray();

    el.choices.innerHTML = '';
    el.choices.appendChild(make('p', 'choices-q',
      'Here is the spectrum. Base peak m/z ' + item.winner.peak.mz + ', exactly as predicted.'));
    var list = make('ul', 'route-summary');
    item.routes.slice().sort(function (a, b) { return b.peak.declared - a.peak.declared; })
      .forEach(function (r) {
        var li = make('li', r.winner ? 'won' : null);
        li.appendChild(make('strong', null,
          r.ion.label + ' at m/z ' + r.peak.mz + ' — ' + Math.round(r.peak.declared) + '% '));
        li.appendChild(document.createTextNode(r.peak.why));
        list.appendChild(li);
      });
    el.choices.appendChild(list);

    el.next.hidden = false;
    el.next.focus();
  }

  var STABILITY = {
    resonance: 'held together by the O, N or ring next to it sharing the charge',
    tertiary:  'a tertiary carbocation — three groups propping up the charge',
    secondary: 'a secondary carbocation',
    primary:   'a primary carbocation, with only one group helping',
    allylic:   'helped by the double bond next to it',
    methyl:    'a bare methyl cation, the least stable there is',
    aryl:      'a bare ring, which cannot help the charge at all',
    radical:   'what is left of the molecule after a small neutral walked off'
  };

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

  /* While a screen is up, the activity behind it must not be reachable. Without
     this a keyboard user can tab straight past the intro into the tray and
     start answering a spectrum they were never shown the instructions for. */
  function setBackgroundInert(on) {
    ['main', 'nav', 'header'].forEach(function (sel) {
      var node = document.querySelector(sel);
      if (!node) return;
      if (on) { node.setAttribute('inert', ''); node.setAttribute('aria-hidden', 'true'); }
      else { node.removeAttribute('inert'); node.removeAttribute('aria-hidden'); }
    });
  }

  function hideScreen() {
    el.screen.hidden = true;
    el.screen.innerHTML = '';
    setBackgroundInert(false);
  }

  function showScreen(kind, cfg) {
    var s = el.screen;
    s.innerHTML = '';
    s.hidden = false;
    var box = make('div', 'screen-box');

    if (kind === 'intro') {
      box.appendChild(make('h2', null, 'Reading a mass spectrum'));
      box.appendChild(make('p', null,
        'A molecule is hit with an electron beam, loses one electron, and the wreckage is ' +
        'sorted by mass. Most of the peaks are wreckage of no interest. The tall ones are ' +
        'where the molecule broke to leave the MOST STABLE CARBOCATION it could make — and ' +
        'carbocation stability is something you already know: 3° beats 2° beats 1°, and a ' +
        'nearby O, N or ring beats all of them.'));
      box.appendChild(make('p', null,
        'You read it by SUBTRACTION. Find the molecular ion on the far right, then ask what ' +
        'each tall peak below it is missing: 15 is a methyl gone, 18 is water, 29 and 43 could ' +
        'be either of two things. Every peak worth reading has its mass printed above it, so ' +
        'the arithmetic is right there.'));
      box.appendChild(make('p', null,
        'A dotted line is drawn across every spectrum at 5% of the base peak: below it, do not ' +
        'read anything. Above it, a peak still has to be diagnostic to be worth your time — ' +
        'click any peak that is not one of the answers and it will tell you why it is not.'));
      var ul = make('ul', 'screen-list');
      LEVELS.forEach(function (L) {
        var li = make('li', null);
        li.appendChild(make('strong', null, 'Level ' + L.n + ' — ' + L.name + ': '));
        li.appendChild(document.createTextNode(L.blurb));
        ul.appendChild(li);
      });
      box.appendChild(ul);
      box.appendChild(make('p', 'screen-note',
        'Drag a label onto a peak, or click the label and then click the peak. Wrong answers ' +
        'are not penalised — read the explanation and try again.'));
      if (resumed) {
        box.appendChild(make('p', 'screen-resume',
          'Welcome back — your progress was saved. You are on Level ' + state.level +
          ', spectrum ' + (state.index + 1) + ' of ' + itemCount(state.level) + '.'));
      }
      var start = make('button', 'primary', resumed ? 'Carry on' : 'Start');
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
        hideScreen(); item = buildItem(); render(); say('');
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
        state = newRun(); persist(); hideScreen(); item = buildItem(); render(); say('');
      });
      box.appendChild(again);
    }

    s.appendChild(box);
    setBackgroundInert(true);
    /* The screen's own button is the only thing that should have focus, so
       Enter works the moment a screen appears. */
    var primary = box.querySelector('.primary');
    if (primary) primary.focus();
  }

  function accuracyLine() {
    var st = state.stats;
    if (!st.slots) return 'No answers recorded yet.';
    var pct = Math.round(st.firstTry / st.slots * 100);
    return st.firstTry + ' of ' + st.slots + ' answered correctly on the first try (' +
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

  /* Which stick is under this point? Used so a student can interrogate the
     noise, not only the answers. */
  function peakAtPoint(clientX, clientY) {
    if (!item.rect || item.phase === 'predict') return null;
    var box = el.plot.getBoundingClientRect();
    var px = clientX - box.left, py = clientY - box.top;
    var r = item.rect;
    if (px < r.x - 6 || px > r.x + r.w + 6 || py < r.y - 6 || py > r.y + r.h + 10) return null;
    var mz = Math.round(MS.mzOfX(px, r, item.spec));
    var best = null, bestDx = 9;
    item.spec.peaks.forEach(function (p) {
      var dx = Math.abs(p.mz - mz);
      var dpx = Math.abs(MS.xOfMz(p.mz, r, item.spec) - px);
      if (dpx <= 7 && dx < bestDx) { bestDx = dx; best = p; }
    });
    return best;
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
    drag = { index: idx, moved: false, node: null, from: tileNode,
             x0: ev.clientX, y0: ev.clientY };
    try { tileNode.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
  }

  function moveDrag(ev) {
    if (!drag) return;
    if (!drag.moved) {
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

    /* A tap without movement is left to the click handler, so a keyboard
       Enter - which fires click and no pointer events at all - takes exactly
       the same path. */
    if (!d.moved) return;

    suppressClick = true;
    var slot = slotIndexAt(ev.clientX, ev.clientY);
    if (slot >= 0) { attempt(slot, d.index); return; }

    /* dropped on the plot but not on a marked peak */
    var peak = peakAtPoint(ev.clientX, ev.clientY);
    if (peak && !peak.target) say(noiseNote(peak), 'quiet');
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
    if (hit) return;

    var route = ev.target.closest && ev.target.closest('.route');
    if (route) { chooseRoute(+route.dataset.route, route); return; }

    var mzBtn = ev.target.closest && ev.target.closest('.mz');
    if (mzBtn) { chooseMz(+mzBtn.dataset.mz, mzBtn); return; }

    var choice = ev.target.closest && ev.target.closest('.choice');
    if (choice) { chooseCompound(choice.dataset.mol, choice); return; }

    /* Clicking anywhere else on the plot interrogates whatever stick is
       there. This is the whole "ignore the noise" lesson, made clickable. */
    var peak = peakAtPoint(ev.clientX, ev.clientY);
    if (!peak) return;
    if (peak.target) {
      if (item.phase === 'label') {
        say('That peak is one of the ones to label — choose a label first, then click it again.',
            'quiet');
      }
      return;
    }
    say(noiseNote(peak), 'quiet');
  }

  /* ------------------------------------------------------------------ boot */

  function cacheDom() {
    ['plot', 'plotwrap', 'overlay', 'tray', 'card', 'feedback', 'next', 'tabs',
     'levelName', 'blurb', 'counter', 'screen', 'choices', 'stage', 'reference',
     'refbody', 'fragments', 'save', 'saveNote', 'lms'].forEach(function (id) {
       el[id] = $(id);
     });
  }

  function buildReference() {
    var lossTable = make('table', 'ref-table');
    var h1 = make('tr');
    ['Loss', 'Neutral', 'What it means'].forEach(function (h) {
      h1.appendChild(make('th', null, h));
    });
    lossTable.appendChild(h1);
    Object.keys(LOSSES).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
      var L = LOSSES[n];
      var tr = make('tr');
      tr.appendChild(make('td', 'num', '− ' + n));
      tr.appendChild(make('td', null, L.neutral + (L.also ? '  or  ' + L.also : '')));
      tr.appendChild(make('td', 'note', L.hint));
      lossTable.appendChild(tr);
    });
    el.refbody.appendChild(make('h4', 'ref-head', 'Common losses'));
    el.refbody.appendChild(lossTable);

    var ionTable = make('table', 'ref-table');
    var h2 = make('tr');
    ['m/z', 'Fragment', 'Why it survived'].forEach(function (h) {
      h2.appendChild(make('th', null, h));
    });
    ionTable.appendChild(h2);
    ION_IDS.filter(function (k) { return IONS[k].mz; })
      .sort(function (a, b) { return IONS[a].mz - IONS[b].mz; })
      .forEach(function (k) {
        var g = IONS[k];
        var tr = make('tr');
        tr.appendChild(make('td', 'num', String(g.mz)));
        tr.appendChild(make('td', null, g.label + ' — ' + g.name));
        tr.appendChild(make('td', 'note', g.hint));
        ionTable.appendChild(tr);
      });
    /* The alkyl series is a pattern, not a list to memorise: once a student
       sees that 15, 29, 43, 57, 71 are each one CH2 apart, a whole family of
       peaks stops being noise. */
    el.refbody.appendChild(make('h4', 'ref-head', 'The alkyl series — each one 14 more than the last'));
    var alkyl = make('table', 'ref-table');
    var h0 = make('tr');
    ['m/z', 'Fragment', 'Carbons'].forEach(function (h) { h0.appendChild(make('th', null, h)); });
    alkyl.appendChild(h0);
    [[15, 'CH₃⁺', 1], [29, 'C₂H₅⁺', 2], [43, 'C₃H₇⁺', 3], [57, 'C₄H₉⁺', 4], [71, 'C₅H₁₁⁺', 5]]
      .forEach(function (row) {
        var tr = make('tr');
        tr.appendChild(make('td', 'num', String(row[0])));
        tr.appendChild(make('td', null, row[1]));
        tr.appendChild(make('td', 'note', String(row[2])));
        alkyl.appendChild(tr);
      });
    el.refbody.appendChild(alkyl);
    el.refbody.appendChild(make('p', 'ref-foot',
      'A run of peaks 14 apart means a chain breaking up at every C–C bond. Which one is ' +
      'TALLEST is the useful part: the tallest is the most stable carbocation, so a big m/z 57 ' +
      'usually means a tert-butyl and a branch point, while an even run with no clear winner ' +
      'means a straight chain. Watch out — 29, 43, 57 and 71 each share their mass with a ' +
      'fragment that kept a C=O, so check the structure for an oxygen before you commit.'));

    el.refbody.appendChild(make('h4', 'ref-head', 'Fragments worth knowing on sight'));
    el.refbody.appendChild(ionTable);
    el.refbody.appendChild(make('p', 'ref-foot',
      'The reading threshold is 5% of the base peak. Below it, leave a peak alone. Above it, ' +
      'a peak still has to be diagnostic — m/z 27, 29, 39, 41, 43, 55 and 57 turn up in almost ' +
      'every spectrum of a compound with a chain, and on their own they narrow nothing down.'));
  }

  function start() {
    cacheDom();
    indexSignatures();
    buildReference();

    var connected = SCORM.init();
    el.lms.textContent = connected ? 'Connected to the LMS' : 'Standalone — no LMS detected';
    el.lms.className = 'lms ' + (connected ? 'on' : 'off');

    var params = new URLSearchParams(location.search);
    var pin = params.get('compound');
    var startLevel = parseInt(params.get('level'), 10);

    if (pin && byId(pin)) {
      state = newRun();
      state.pin = pin;
      state.unlocked = LEVELS.length;
      state.level = (startLevel >= 1 && startLevel <= LEVELS.length) ? startLevel : 2;
      /* a pinned compound has to be legal for the level it is pinned at */
      var want = LEVELS[state.level - 1].tag;
      if (byId(pin).tags.indexOf(want) < 0) {
        for (var i = 0; i < LEVELS.length; i++) {
          if (byId(pin).tags.indexOf(LEVELS[i].tag) >= 0) { state.level = LEVELS[i].n; break; }
        }
      }
    } else {
      var saved = restore(SCORM.loadState());
      if (saved && saved.plan && saved.plan[1] && byId(saved.plan[1][0])) {
        state = saved;
        resumed = state.level > 1 || state.index > 0 ||
                  !!(state.stats && state.stats.attempts);
      } else {
        state = newRun();
      }
    }

    /* Write the run out before the first answer, so a student who opens the
       activity and closes it again comes back to the same set of spectra. */
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
    el.save.addEventListener('click', saveNow);
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

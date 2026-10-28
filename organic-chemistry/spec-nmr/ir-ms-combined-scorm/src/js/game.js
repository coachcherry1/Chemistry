/* game.js — levels, drag-and-drop, the case file and progression.
 *
 * Two spectra of one compound sit on the screen together: the mass spectrum
 * on top, because the routine starts there, and the IR below. Each level
 * takes one piece of help away:
 *
 * Level 1  READ BOTH SPECTRA   compound named. Label the marked peaks in both;
 *                              the case file fills itself in as you go.
 * Level 2  ONE OF THREE        compound hidden, three candidates shown from the
 *                              start. One wrong option needs the IR to rule
 *                              out, the other needs the mass spectrum.
 * Level 3  BUILD THE CASE      no reference tables, no ranges on the labels.
 *                              Label both spectra, fill in the case file
 *                              yourself, then choose from four.
 * Level 4  UNKNOWN             nothing is marked. Put each label on the peak
 *                              it belongs to, or in the "not in this
 *                              spectrum" box — absence is evidence too.
 *
 * Every drop works three ways, as in the IR and mass spec packages: pointer
 * drag, click-the-label-then-click-the-peak, and keyboard. At Level 4, where
 * there are no markers to tab to, a focused plot takes the arrow keys: left
 * and right step between peaks, Enter drops the chosen label there.
 */

var Game = (function () {
  'use strict';

  /* Across a run every theme appears at least twice. With four compounds a
     level cannot hold all six, so each level takes the four themes used least
     so far — which spreads them evenly over the sixteen. */
  var THEMES = ['alcohol', 'carbonyl', 'acid', 'nitrogen', 'hydrocarbon', 'halide'];

  var LEVELS = [
    { n: 1, name: 'Read both spectra', items: 4, irMode: 'family', needM: true,
      named: true, reference: true, subs: true, ask: false, markers: true,
      candidates: 0, irD: 2, msD: 2,
      blurb: 'The compound is named for you. Label the marked peaks in BOTH spectra, and watch the case file fill itself in.' },
    { n: 2, name: 'One of three', items: 4, irMode: 'group', needM: true,
      named: false, reference: true, subs: true, ask: false, markers: true,
      candidates: 3, upfront: true, irD: 3, msD: 3,
      blurb: 'The compound is one of the three shown. Label both spectra, then pick it — and notice which spectrum rules out each wrong option.' },
    { n: 3, name: 'Build the case', items: 4, irMode: 'group', needM: false,
      named: false, reference: false, subs: false, ask: true, markers: true,
      candidates: 4, hints: true, irD: 3, msD: 3,
      blurb: 'No reference tables, and the labels no longer carry their ranges. Label both spectra, fill in the case file yourself, then choose from four.' },
    { n: 4, name: 'Unknown', items: 4, irMode: 'group', needM: false,
      named: false, reference: false, subs: false, ask: true, markers: false, bin: true,
      candidates: 4, hints: true, irD: 2, msD: 2,
      blurb: 'Nothing is marked. Put every label on the peak it belongs to — or in the “not in this spectrum” box. Then fill in the case file and choose from four.' }
  ];

  /* Bump whenever the shape of a saved run changes — the level list, the draw
     or the vocabulary — so an older save is discarded rather than resumed. */
  var SCHEMA = 1;

  var el = {};
  var state = null;
  var item = null;
  var selectedTile = null;
  var drag = null;
  var suppressClick = false;
  var resumed = false;
  var tour = null;

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

  function cfg() { return LEVELS[state.level - 1]; }

  /* ------------------------------------------------------------------ draw */

  /* One compound per chosen theme, the least-used themes first. Levels 1 and
     2 can only draw compounds with a readable molecular ion. Levels 3 and 4
     each take at least one WITHOUT, when the chosen themes allow it: a
     missing M+ is a clue in its own right, and a student should meet it. */
  function newRun() {
    var seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    var rand = MS.rng(seed);
    var counts = {}, used = [], plan = {};
    THEMES.forEach(function (t) { counts[t] = 0; });

    LEVELS.forEach(function (L) {
      var pool = COMPOUNDS.filter(function (c) {
        return used.indexOf(c.id) < 0 && (!L.needM || Evidence.readableM(c));
      });
      var themes = shuffle(THEMES, rand).filter(function (t) {
        return pool.some(function (c) { return c.theme === t; });
      }).sort(function (a, b) { return counts[a] - counts[b]; }).slice(0, L.items);

      var noM = !L.needM ? shuffle(themes.filter(function (t) {
        return pool.some(function (c) { return c.theme === t && !Evidence.readableM(c); });
      }), rand)[0] : null;

      var ids = themes.map(function (t) {
        var from = pool.filter(function (c) {
          return c.theme === t && used.indexOf(c.id) < 0 &&
                 (t !== noM || !Evidence.readableM(c));
        });
        var pick = shuffle(from, rand)[0];
        counts[t]++;
        used.push(pick.id);
        return pick.id;
      });
      plan[L.n] = shuffle(ids, rand);
    });

    return {
      seed: seed, unlocked: 1, level: 1, index: 0, done: [],
      stats: { attempts: 0, firstTry: 0, slots: 0, hints: 0 },
      plan: plan
    };
  }

  /* ----------------------------------------------------------- persistence */

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
      say('This is a pinned demo compound, so nothing is saved. Open the activity normally ' +
          'to keep progress.', 'quiet');
      return;
    }
    var where = persist();
    if (where === 'lms') {
      say('Progress saved. You can close this window — it will open again at Level ' +
          state.level + ', compound ' + (state.index + 1) + '.', 'good');
    } else if (where === 'local') {
      say('Progress saved in this browser. It will reopen at Level ' + state.level +
          ', compound ' + (state.index + 1) + ' — but on this computer only, since no LMS ' +
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
      done: saved.d || [], stats: saved.st || { attempts: 0, firstTry: 0, slots: 0, hints: 0 },
      plan: saved.p
    };
  }

  /* ------------------------------------------------------------- item build */

  function itemCount(level) { return state.pin ? 1 : LEVELS[level - 1].items; }

  function buildItem() {
    var L = cfg();
    var compound = state.pin ? byId(state.pin) : byId(state.plan[state.level][state.index]);
    var seed = (state.seed + state.level * 7919 + state.index * 104729) >>> 0;
    var rand = MS.rng(seed ^ 0x51ed2701);
    var ms = MS.build(compound, seed);
    var ir = IR.build(compound, (seed ^ 0x2545f491) >>> 0);
    var M = Evidence.readableM(compound);

    /* Every mass spectrum label is a loss from M. With no readable M there is
       nothing to subtract from, so nothing in that spectrum is marked. */
    if (!M) ms.peaks.forEach(function (p) { p.target = false; });

    var slots = [];
    ms.peaks.filter(function (p) { return p.target; })
      .sort(function (a, b) { return b.mz - a.mz; })
      .forEach(function (p) {
        slots.push({ spec: 'ms', key: msKey(p, ms.M), peak: p, mz: p.mz,
                     filled: false, tries: 0 });
      });
    ir.bands.filter(function (b) { return b.t; })
      .sort(function (a, b) { return b.c - a.c; })
      .forEach(function (b) {
        /* Sharp bands are anchored at the deepest point of their window, broad
           ones at the envelope centre: the lowest point inside an acid's O-H
           is the C-H spike riding on top of it. */
        var peak = b.s === 'g' ? { v: b.c, t: IR.tAt(ir, b.c) } : IR.depthAt(ir, b.tol[0], b.tol[1]);
        slots.push({ spec: 'ir', key: irKey(b.g, L.irMode), group: b.g, band: b,
                     v: peak.v, t: peak.t, filled: false, tries: 0 });
      });
    slots.forEach(function (s, i) { s.i = i; });

    var rivals = Evidence.pickDecoys(compound, Math.max(2, (L.candidates || 3) - 1), rand);
    var choices = L.candidates
      ? shuffle([compound].concat(rivals.slice(0, L.candidates - 1)), rand) : null;

    var tiles = [];
    function addTile(spec, key, where, distractor) {
      tiles.push({
        spec: spec, key: key, where: where, distractor: distractor, used: false, tries: 0,
        label: spec === 'ms' ? msLabel(key) : irLabel(key),
        sub: !L.subs ? '' : spec === 'ms' ? msSub(key) : irSub(key)
      });
    }
    slots.forEach(function (s) { addTile(s.spec, s.key, 'peak', false); });
    msDistractors(compound, ms, slots, rivals, L, rand).forEach(function (k) {
      addTile('ms', k, 'bin', true);
    });
    irDistractors(compound, slots, rivals, L, rand).forEach(function (k) {
      addTile('ir', k, 'bin', true);
    });
    tiles = shuffle(tiles, rand);
    tiles.forEach(function (t, i) { t.i = i; });

    var cf = Evidence.caseFile(compound);
    return {
      cfg: L, compound: compound, ms: ms, ir: ir, M: M, slots: slots, tiles: tiles,
      rivals: rivals, choices: choices, cf: cf, phase: 'label',
      caseQs: ['mass', 'halogen', 'nitrogen', 'irclass'], caseStep: 0, caseAns: {},
      massOptions: massOptions(compound, ms, M, rand),
      classOptions: classOptions(compound, rivals, rand),
      cursor: { ms: null, ir: null }, seen: {}
    };
  }

  /* Wrong mass spectrum labels. Losses a rival compound shows come first —
     those are the absences that decide the compound question — then the four
     losses this unit is built around. A loss is never offered if there is a
     real peak at M − n, because "this compound shows no M − 15" has to be
     true when the student goes and looks. */
  function msDistractors(compound, ms, slots, rivals, L, rand) {
    var M = Evidence.readableM(compound);
    var hal = Evidence.halogen(compound);
    if (!M) {
      /* No molecular ion: at Level 4 the M+ label itself goes in the box,
         and with it the M+2 — there is nothing for it to sit next to. */
      return L.bin ? ['mplus', 'miso2'] : [];
    }
    var needed = {};
    slots.forEach(function (s) { if (s.spec === 'ms') needed[s.key] = true; });
    var out = [];
    function ok(k) {
      if (!k || needed[k] || out.indexOf(k) >= 0 || k === 'miso1' || k === 'mplus') return false;
      if (k === 'miso2') return !hal;
      var n = lossNumber(k);
      if (n == null || !LOSSES[n]) return false;
      return !compound.peaks.some(function (p) { return p.mz === M - n && p.ab >= 4; });
    }
    function add(k) { if (out.length < L.msD && ok(k)) out.push(k); }

    rivals.forEach(function (r) {
      var rM = Evidence.readableM(r);
      if (!rM) return;
      if (Evidence.halogen(r)) add('miso2');
      shuffle(r.peaks.filter(function (p) { return p.role === 'key'; }), rand)
        .forEach(function (p) { add('loss_' + (rM - p.mz)); });
    });
    shuffle(['loss_15', 'loss_18', 'loss_29', 'loss_43'], rand).forEach(add);
    shuffle(MS_UNIVERSE, rand).forEach(add);
    return out;
  }

  /* Wrong IR labels: groups a rival has and this compound does not, first.
     A group the STRUCTURE has is never offered, scored or not — benzoic acid
     is never told it has no aromatic C–H just because that band is buried. */
  function irDistractors(compound, slots, rivals, L, rand) {
    var present = Evidence.present(compound);
    var banned = {};
    present.forEach(function (g) { if (GROUPS[g]) banned[irKey(g, L.irMode)] = true; });
    slots.forEach(function (s) { if (s.spec === 'ir') banned[s.key] = true; });
    var out = [];
    function add(k) {
      if (out.length < L.irD && !banned[k] && out.indexOf(k) < 0 &&
          IR_UNIVERSE[L.irMode].indexOf(k) >= 0) out.push(k);
    }
    rivals.forEach(function (r) {
      shuffle(Evidence.scoredGroups(r), rand).forEach(function (g) { add(irKey(g, L.irMode)); });
    });
    shuffle(IR_UNIVERSE[L.irMode], rand).forEach(add);
    return out;
  }

  /* The case file's mass question. Every wrong option is a number a student
     could genuinely have arrived at: the M+1 peak, the tallest fragment, the
     rightmost peak when there is no molecular ion at all. Nothing below the
     reading line is offered — 1-butanol's M+ really is at 74, at about 1%, and
     a student who chose it would be right and marked wrong. */
  function massOptions(compound, ms, M, rand) {
    var printed = ms.peaks.filter(function (p) {
      return p.ab >= MS.THRESHOLD && p.role !== 'miso1' && p.role !== 'miso2' && p.role !== 'sat';
    }).map(function (p) { return p.mz; }).sort(function (a, b) { return b - a; });
    /* "No readable M+" is on offer every time — it is the option this
       question exists to make a student consider. */
    var opts = M ? [M, 'none'] : ['none'];
    function add(v) { if (v != null && opts.indexOf(v) < 0 && opts.length < 4) opts.push(v); }
    if (M) {
      add(M + 1);
      add(printed.filter(function (mz) { return mz < M; })[0]);
      add(Evidence.basePeak(compound) !== M ? Evidence.basePeak(compound) : null);
    } else {
      printed.slice(0, 2).forEach(add);
      add(Evidence.basePeak(compound));
      add(printed[2]);
    }
    var nums = shuffle(opts.filter(function (v) { return v !== 'none'; }), rand)
      .sort(function (a, b) { return b - a; });
    return opts.indexOf('none') >= 0 ? nums.concat(['none']) : nums;
  }

  var CONFUSED = {
    alcohol: ['acid', 'plain', 'amine'], acid: ['alcohol', 'carbonyl', 'amide'],
    carbonyl: ['acid', 'alcohol', 'amide'], amide: ['amine', 'carbonyl', 'acid'],
    amine: ['amide', 'alcohol', 'nitrile'], nitrile: ['alkyne', 'amine', 'carbonyl'],
    nitro: ['amine', 'arene', 'carbonyl'], alkyne: ['nitrile', 'alkene', 'plain'],
    alkene: ['arene', 'alkyne', 'plain'], arene: ['alkene', 'plain', 'carbonyl'],
    plain: ['alcohol', 'alkene', 'arene']
  };

  function classOptions(compound, rivals, rand) {
    var right = Evidence.irClass(compound);
    var opts = [right];
    function add(k) { if (opts.indexOf(k) < 0 && opts.length < 4) opts.push(k); }
    rivals.forEach(function (r) { add(Evidence.irClass(r)); });
    CONFUSED[right].forEach(add);
    return shuffle(opts, rand);
  }

  /* ---------------------------------------------------------------- painting */

  function slotsOf(spec) { return item.slots.filter(function (s) { return s.spec === spec; }); }

  function paintPlots() { paintMS(); paintIR(); }

  function paintMS() {
    var rect = MS.draw(el.msPlot, item.ms);
    if (!rect) return;
    item.msRect = rect;
    layoutMsMarkers(rect);
    paintGuide('ms');
  }

  function paintIR() {
    var rect = IR.draw(el.irPlot, item.ir);
    if (!rect) return;
    item.irRect = rect;
    layoutIrMarkers(rect);
    paintGuide('ir');
  }

  /* Only the slots that should show: every slot while markers are on, and at
     Level 4 only the ones already answered, as chips on their peaks. */
  function visible(s) { return item.cfg.markers || s.filled; }

  function slotNode(s, text, aria) {
    var node = make('button', 'slot ' + s.spec + (s.filled ? ' ok' : ''));
    node.type = 'button';
    node.dataset.slot = String(s.i);
    node.setAttribute('aria-label', aria);
    node.textContent = text;
    node.style.visibility = 'hidden';
    if (s.filled) node.tabIndex = -1;
    return node;
  }

  function overlapArea(a, b) {
    var ox = Math.min(a.r, b.r) - Math.max(a.l, b.l);
    var oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    return (ox > 0 && oy > 0) ? Math.min(ox, oy) : 0;
  }

  /* Mass spectrum markers sit above their peak's printed mass, stepping up and
     sideways until they overlap nothing — the mass spec package's layout. */
  function layoutMsMarkers(rect) {
    var ov = el.msOverlay;
    ov.querySelectorAll('.slot').forEach(function (n) { n.remove(); });
    var list = slotsOf('ms').filter(visible);
    var nodes = list.map(function (s) {
      var node = slotNode(s, s.filled ? s.filledLabel : '?', s.filled
        ? s.filledLabel + ' at m/z ' + s.mz
        : 'Unlabelled peak at m/z ' + s.mz + ', ' + Math.round(s.peak.ab) + ' percent');
      ov.appendChild(node);
      return node;
    });

    var placed = (rect.labels || []).slice(), leaders = [];
    list.forEach(function (s, i) {
      var node = nodes[i];
      var w = node.offsetWidth || 32, h = node.offsetHeight || 32;
      var x0 = MS.xOfMz(s.mz, rect, item.ms);
      var yTop = MS.yOfAb(s.peak.ab, rect) - MS.LABEL_H;
      var cands = [];
      for (var up = 0; up < 7; up++) {
        var cy = yTop - h / 2 - 7 - up * (h + 4);
        cands.push({ x: x0, y: cy }, { x: x0 + w * 0.62, y: cy }, { x: x0 - w * 0.62, y: cy });
      }
      for (var d = 0; d < 3; d++) {
        var by = yTop + MS.LABEL_H + h / 2 + d * (h + 4);
        cands.push({ x: x0 + w / 2 + 20, y: by }, { x: x0 - w / 2 - 20, y: by });
      }
      var best = null, bestCost = Infinity;
      for (var ci = 0; ci < cands.length && bestCost > 0; ci++) {
        var cx = cands[ci].x, cyy = cands[ci].y;
        if (cyy - h / 2 < rect.y + 2 || cyy + h / 2 > rect.y + rect.h - 2) continue;
        if (cx - w / 2 < rect.x + 2 || cx + w / 2 > rect.x + rect.w - 2) continue;
        var box = { l: cx - w / 2, r: cx + w / 2, t: cyy - h / 2, b: cyy + h / 2 };
        var cost = 0;
        placed.forEach(function (p) { cost += overlapArea(box, p); });
        if (cost < bestCost) { bestCost = cost; best = box; }
      }
      if (!best) {
        var fy = Math.max(rect.y + h / 2 + 2, yTop - h / 2 - 7);
        var fx = Math.max(rect.x + w / 2 + 2, Math.min(rect.x + rect.w - w / 2 - 2, x0));
        best = { l: fx - w / 2, r: fx + w / 2, t: fy - h / 2, b: fy + h / 2 };
      }
      placed.push(best);
      leaders.push({ x: x0, y0: yTop, y1: best.b });
      node.style.left = ((best.l + best.r) / 2) + 'px';
      node.style.top = ((best.t + best.b) / 2) + 'px';
      node.style.visibility = '';
    });
    MS.drawLeaders(el.msPlot, leaders);
  }

  /* IR markers sit clear of the trace, below the trough when there is room —
     the IR package's layout. */
  function layoutIrMarkers(rect) {
    var ov = el.irOverlay;
    ov.querySelectorAll('.slot').forEach(function (n) { n.remove(); });
    var list = slotsOf('ir').filter(visible);
    var nodes = list.map(function (s) {
      var node = slotNode(s, s.filled ? s.filledLabel : '?', s.filled
        ? s.filledLabel + ' at ' + Math.round(s.v) + ' wavenumbers'
        : 'Unlabelled IR band at ' + Math.round(s.v) + ' wavenumbers');
      ov.appendChild(node);
      return node;
    });
    var placed = [];
    list.forEach(function (s, i) {
      var node = nodes[i];
      var w = node.offsetWidth || 32, h = node.offsetHeight || 32;
      var x = Math.max(rect.x + w / 2 + 2, Math.min(rect.x + rect.w - w / 2 - 2, IR.xOfV(s.v, rect)));
      var yPeak = IR.yOfT(s.t, rect);
      var step = h + 5;
      var prefer = yPeak + h / 2 + 10 < rect.y + rect.h - 4 ? 1 : -1;
      var offsets = [], k;
      for (k = 0; k < 6; k++) offsets.push(prefer * (h / 2 + 8 + k * step));
      for (k = 0; k < 6; k++) offsets.push(-prefer * (h / 2 + 8 + k * step));
      var best = null, bestCost = Infinity;
      offsets.forEach(function (dy) {
        var cy = yPeak + dy;
        if (cy - h / 2 < rect.y + 3 || cy + h / 2 > rect.y + rect.h - 3) return;
        var box = { l: x - w / 2, r: x + w / 2, t: cy - h / 2, b: cy + h / 2 };
        var cost = 0;
        placed.forEach(function (p) { cost += overlapArea(box, p); });
        if (cost < bestCost) { bestCost = cost; best = cy; }
      });
      if (best === null) {
        best = Math.max(rect.y + h / 2 + 3, Math.min(rect.y + rect.h - h / 2 - 3, yPeak + prefer * (h / 2 + 8)));
      }
      placed.push({ l: x - w / 2, r: x + w / 2, t: best - h / 2, b: best + h / 2 });
      node.style.left = x + 'px';
      node.style.top = best + 'px';
      node.style.visibility = '';
    });
  }

  /* ---------------------------------------------- Level 4 cursor and guide
   *
   * With nothing marked, a student needs to see exactly where a label will
   * land. A hairline follows the pointer — or the arrow keys — and a readout
   * names the position: the m/z of the stick it has snapped to, or the
   * wavenumber. The stops the arrow keys visit are EVERY readable peak and
   * every drawn band, not just the answers, so the keyboard gives nothing
   * away that the mouse would not.
   */
  function stops(spec) {
    if (spec === 'ms') {
      return item.ms.peaks.filter(function (p) { return p.ab >= MS.THRESHOLD; })
        .map(function (p) { return { mz: p.mz }; });
    }
    var seen = [];
    return item.ir.bands.filter(function (b) { return b.d >= 0.2; })
      .map(function (b) { return { v: Math.round(b.c) }; })
      .sort(function (a, b) { return b.v - a.v; })
      .filter(function (s) {
        if (seen.some(function (v) { return Math.abs(v - s.v) < 12; })) return false;
        seen.push(s.v);
        return true;
      })
      .sort(function (a, b) { return b.v - a.v; });
  }

  function posX(spec, pos) {
    return spec === 'ms' ? MS.xOfMz(pos.mz, item.msRect, item.ms) : IR.xOfV(pos.v, item.irRect);
  }

  function posText(spec, pos) {
    return spec === 'ms' ? 'm/z ' + pos.mz : '≈ ' + Math.round(pos.v / 5) * 5 + ' cm⁻¹';
  }

  function paintGuide(spec) {
    var ov = spec === 'ms' ? el.msOverlay : el.irOverlay;
    var old = ov.querySelector('.guide');
    if (old) old.remove();
    var pos = item.cursor[spec];
    var rect = spec === 'ms' ? item.msRect : item.irRect;
    if (!pos || !rect) return;
    var g = make('div', 'guide');
    g.style.left = posX(spec, pos) + 'px';
    g.style.top = rect.y + 'px';
    g.style.height = rect.h + 'px';
    g.appendChild(make('span', 'guide-read', posText(spec, pos)));
    ov.appendChild(g);
  }

  function setCursor(spec, pos) {
    item.cursor[spec] = pos;
    paintGuide(spec);
  }

  /* Where on a plot a client point is, as a spectrum position. A mass
     spectrum position snaps to the nearest stick within 8px. */
  function posAt(spec, clientX, clientY) {
    var canvas = spec === 'ms' ? el.msPlot : el.irPlot;
    var rect = spec === 'ms' ? item.msRect : item.irRect;
    if (!rect) return null;
    var box = canvas.getBoundingClientRect();
    var px = clientX - box.left, py = clientY - box.top;
    if (px < rect.x - 6 || px > rect.x + rect.w + 6 || py < rect.y - 6 || py > rect.y + rect.h + 12) return null;
    if (spec === 'ir') return { v: Math.max(IR.V_MIN, Math.min(IR.V_MAX, IR.vOfX(px, rect))) };
    var best = null, bestD = 9;
    item.ms.peaks.forEach(function (p) {
      var d = Math.abs(MS.xOfMz(p.mz, rect, item.ms) - px);
      if (d < bestD || (d === bestD && best && p.ab > best.ab)) { bestD = d; best = p; }
    });
    return best ? { mz: best.mz } : { mz: Math.round(MS.mzOfX(px, rect, item.ms)), empty: true };
  }

  function specAt(clientX, clientY) {
    var node = document.elementFromPoint(clientX, clientY);
    var wrap = node && node.closest ? node.closest('.plotwrap') : null;
    return wrap ? wrap.dataset.spec : null;
  }

  /* ------------------------------------------------------------------ tray */

  function paintTray() {
    el.tray.innerHTML = '';
    if (item.phase !== 'label') {
      el.tray.appendChild(make('p', 'tray-empty', item.cfg.bin
        ? 'Every label is placed.'
        : 'Labelling finished — the labels left over belong to other compounds.'));
      return;
    }
    [['ms', 'Mass spectrum labels'], ['ir', 'IR labels']].forEach(function (pair) {
      var spec = pair[0];
      var group = make('div', 'tray-group ' + spec);
      group.appendChild(make('p', 'tray-head', pair[1]));
      var mine = item.tiles.filter(function (t) { return t.spec === spec; });
      var left = mine.filter(function (t) { return !t.used; });
      var row = make('div', 'tray-row');
      if (!mine.length) {
        row.appendChild(make('p', 'tray-empty', spec === 'ms'
          ? 'Nothing to label in this mass spectrum. The case file will ask what that tells you.'
          : 'Nothing to label.'));
      } else if (!left.length) {
        row.appendChild(make('p', 'tray-empty', 'All placed.'));
      }
      left.forEach(function (t) {
        var node = make('button', 'tile ' + spec + (selectedTile === t.i ? ' selected' : ''));
        node.type = 'button';
        node.dataset.tile = String(t.i);
        node.appendChild(make('span', 'tile-label', t.label));
        if (t.sub) node.appendChild(make('span', 'tile-sub', t.sub));
        row.appendChild(node);
      });
      group.appendChild(row);
      el.tray.appendChild(group);
    });

    if (item.cfg.bin) {
      var bin = make('button', 'bin');
      bin.type = 'button';
      bin.appendChild(make('span', 'bin-title', 'Not in these spectra'));
      var binned = item.tiles.filter(function (t) { return t.binned; });
      bin.appendChild(make('span', 'bin-sub', binned.length
        ? binned.map(function (t) { return t.label; }).join(' · ')
        : 'Drop a label here if the compound does not have it.'));
      el.tray.appendChild(bin);
    }
  }

  /* ------------------------------------------------------------------ card */

  function paintCard() {
    el.card.innerHTML = '';
    var L = item.cfg, c = item.compound;
    if (L.named) {
      el.card.appendChild(make('p', 'card-kicker', c.cls));
      el.card.appendChild(make('h3', 'card-name', c.name));
      el.card.appendChild(Structure.render(c.structure, { alt: 'Skeletal structure of ' + c.name }));
      el.card.appendChild(make('p', 'card-formula', c.formula + ' · M = ' + Evidence.massOf(c)));
      return;
    }
    var showChoices = L.upfront || item.phase === 'identify' || item.phase === 'done';
    if (!showChoices) {
      el.card.appendChild(make('p', 'card-kicker', 'Unknown compound'));
      el.card.appendChild(make('p', 'card-hidden', '?'));
      el.card.appendChild(make('p', 'card-note', L.bin
        ? 'Place every label, fill in the case file, and four candidates will appear.'
        : 'Label both spectra and fill in the case file. Four candidates appear after that.'));
      return;
    }
    var asking = item.phase === 'identify';
    el.card.appendChild(make('p', 'card-kicker', item.phase === 'done' ? 'Identified'
      : asking ? 'Which one is it?' : 'It is one of these three'));
    var grid = make('div', 'cands n' + item.choices.length);
    item.choices.forEach(function (m) {
      var b = make('button', 'cand');
      b.type = 'button';
      b.dataset.mol = m.id;
      if (item.phase === 'done') {
        b.classList.add(m.id === c.id ? 'right' : 'out');
        b.disabled = true;
      } else if (item.picked && item.picked.indexOf(m.id) >= 0) {
        b.classList.add('wrong');
        b.disabled = true;
      } else if (!asking) {
        b.classList.add('preview');
      }
      b.appendChild(Structure.render(m.structure, { alt: m.name, scale: 22 }));
      b.appendChild(make('span', 'cand-name', m.name));
      b.appendChild(make('span', 'cand-formula', m.formula));
      grid.appendChild(b);
    });
    el.card.appendChild(grid);
    if (!asking && item.phase === 'label') {
      el.card.appendChild(make('p', 'card-note',
        'Work out what each weighs and which bonds it has. Then label the spectra and see which fits.'));
    }
  }

  /* ------------------------------------------------------------- case file
   *
   * One row per step of the routine. At Levels 1 and 2 it fills itself in as
   * the labels go on — the point is to SEE the reasoning happen. At Levels 3
   * and 4 the student fills in the mass, halogen, nitrogen and IR rows
   * themselves once the labelling is done.
   */
  function paintBoard() {
    var b = el.board, cf = item.cf, L = item.cfg;
    b.innerHTML = '';
    b.appendChild(make('h3', 'board-title', 'Case file'));
    var list = make('ol', 'board-list');

    var msSlots = slotsOf('ms'), irSlots = slotsOf('ir');
    var mplus = msSlots.filter(function (s) { return s.key === 'mplus'; })[0];
    var iso = msSlots.filter(function (s) { return s.key === 'miso2'; })[0];
    var mDone = mplus && mplus.filled;
    var labelsDone = item.phase !== 'label';

    function auto(q) {
      if (q === 'mass') return mDone ? cf.massText : null;
      if (q === 'halogen') {
        if (iso ? !iso.filled : !mDone) return null;
        var t = Evidence.HALOGEN_TEXT[cf.halogen];
        return cf.halogen !== 'none' && !iso ? t + ' (faint here, because M⁺ itself is small)' : t;
      }
      if (q === 'nitrogen') return mDone ? Evidence.NITROGEN_TEXT[cf.nitrogen] : null;
      if (q === 'irclass') {
        return irSlots.every(function (s) { return s.filled; }) ? classText() : null;
      }
      return null;
    }

    /* The class on one line, the reason it is that class underneath. */
    function classText() {
      var k = Evidence.IR_CLASSES[cf.irclass];
      return k.label + '\n~' + k.why.charAt(0).toUpperCase() + k.why.slice(1);
    }

    function asked(q) {
      var v = item.caseAns[q];
      if (v == null) return null;
      if (q === 'mass') return cf.massText;
      if (q === 'halogen') return Evidence.HALOGEN_TEXT[cf.halogen];
      if (q === 'nitrogen') return Evidence.NITROGEN_TEXT[cf.nitrogen];
      return classText();
    }

    var ROWS = [
      { q: 'mass', spec: 'ms', label: 'Molecular ion' },
      { q: 'halogen', spec: 'ms', label: 'Chlorine or bromine?' },
      { q: 'nitrogen', spec: 'ms', label: 'Nitrogen?' },
      { q: 'bonds', spec: 'ir', label: 'Bonds labelled' },
      { q: 'irclass', spec: 'ir', label: 'What the IR says' },
      { q: 'base', spec: 'ms', label: 'Base peak' },
      { q: 'answer', spec: 'both', label: 'The compound' }
    ];

    var current = item.phase === 'case' ? item.caseQs[item.caseStep] : null;

    ROWS.forEach(function (r) {
      var li = make('li', 'board-row ' + r.spec);
      var head = make('div', 'board-head');
      head.appendChild(make('span', 'spec-tag', r.spec === 'both' ? 'MS + IR' : r.spec.toUpperCase()));
      head.appendChild(make('span', 'board-label', r.label));
      li.appendChild(head);

      var value = null;
      if (r.q === 'bonds') {
        var done = irSlots.filter(function (s) { return s.filled; });
        value = done.length ? done.map(function (s) {
          return s.filledLabel + ' · ' + Math.round(s.v) + ' cm⁻¹';
        }).join('\n') : null;
      } else if (r.q === 'base') {
        value = (L.ask ? labelsDone : msSlots.length && msSlots.every(function (s) { return s.filled; }))
          ? cf.baseText : null;
      } else if (r.q === 'answer') {
        value = item.phase === 'done'
          ? item.compound.name + ', ' + item.compound.formula + '\n~It fits every line above.' : null;
      } else {
        value = L.ask ? asked(r.q) : auto(r.q);
      }

      if (r.q === current) {
        li.classList.add('asking');
        li.appendChild(questionNode(r.q));
      } else if (value) {
        li.classList.add('filled');
        if (item.seen[r.q] !== value) { li.classList.add('fresh'); item.seen[r.q] = value; }
        value.split('\n').forEach(function (line) {
          li.appendChild(line.charAt(0) === '~' ? make('p', 'board-why', line.slice(1))
                                                : make('p', 'board-value', line));
        });
      } else {
        li.appendChild(make('p', 'board-value empty', '—'));
      }
      list.appendChild(li);
    });
    b.appendChild(list);
  }

  function questionNode(q) {
    var box = make('div', 'board-q');
    var prompts = {
      mass: 'Where is the molecular ion?',
      halogen: 'Look two mass units past M⁺. Chlorine or bromine?',
      nitrogen: 'Odd or even molecular mass?',
      irclass: 'From the bands you labelled, what kind of compound is it?'
    };
    box.appendChild(make('p', 'board-prompt', prompts[q]));
    var opts;
    if (q === 'mass') {
      opts = item.massOptions.map(function (v) {
        return { v: v, t: v === 'none' ? 'No readable M⁺' : 'm/z ' + v };
      });
    } else if (q === 'halogen') {
      opts = [{ v: 'none', t: 'Neither — no M+2 pair' },
              { v: 'Cl', t: 'Chlorine — M+2 a third of M⁺' },
              { v: 'Br', t: 'Bromine — M+2 as tall as M⁺' }];
    } else if (q === 'nitrogen') {
      opts = [{ v: 'odd', t: 'Odd — one nitrogen' }, { v: 'even', t: 'Even — no nitrogen' }];
    } else {
      opts = item.classOptions.map(function (k) { return { v: k, t: Evidence.IR_CLASSES[k].label }; });
    }
    var row = make('div', 'board-opts');
    var tried = (item.caseTried && item.caseTried[q]) || [];
    opts.forEach(function (o) {
      var btn = make('button', 'opt', o.t);
      btn.type = 'button';
      btn.dataset.q = q;
      btn.dataset.v = String(o.v);
      if (tried.indexOf(String(o.v)) >= 0) { btn.disabled = true; btn.classList.add('wrong'); }
      row.appendChild(btn);
    });
    box.appendChild(row);
    return box;
  }

  /* --------------------------------------------------- after the answer */

  /* How each wrong option was ruled out, and by which spectrum. This is the
     payoff of the whole activity: a line that says "IR could not tell these
     apart — the mass spectrum did". */
  function paintExplain() {
    var box = el.explain;
    box.innerHTML = '';
    if (item.phase !== 'done' || !item.choices) { box.hidden = true; return; }
    box.hidden = false;
    box.appendChild(make('h3', 'explain-title', 'How you could tell'));
    var ul = make('ul', 'explain-list');
    var needIR = [], needMS = [];
    item.choices.filter(function (m) { return m.id !== item.compound.id; }).forEach(function (d) {
      var v = Evidence.whyNot(item.compound, d);
      if (!v.ir) needMS.push(d.name);
      else if (!v.msMass) needIR.push(d.name);
      var li = make('li', null);
      li.appendChild(make('strong', null, 'Not ' + d.name + '. '));
      li.appendChild(v.ir ? verdictLine('ir', cap(v.ir))
        : make('p', 'verdict none', 'IR: no help — its bands are the same as the answer’s.'));
      if (v.msMass) {
        li.appendChild(verdictLine('ms', cap(v.msMass) + (v.msFrag ? '; ' + v.msFrag : '') + '.'));
      } else if (v.msFrag) {
        li.appendChild(verdictLine('ms', 'The molecular ion cannot separate them — but ' + v.msFrag +
                                         '. That takes the fragment reasoning, not just the mass.'));
      } else {
        li.appendChild(make('p', 'verdict none', 'MS: no help — its mass spectrum reads the same.'));
      }
      ul.appendChild(li);
    });
    box.appendChild(ul);
    box.appendChild(make('p', 'explain-foot', summary(needIR, needMS)));
  }

  function verdictLine(spec, text) {
    var p = make('p', 'verdict ' + spec);
    p.appendChild(make('span', 'spec-tag', spec.toUpperCase()));
    p.appendChild(document.createTextNode(' ' + text));
    return p;
  }

  /* Says exactly what was true for THIS set of options — never that both
     spectra were needed when one would have done. */
  function summary(needIR, needMS) {
    function names(a) { return a.join(' or '); }
    if (needIR.length && needMS.length) {
      return 'You needed both: the IR alone could not rule out ' + names(needMS) +
             ', and the molecular ion alone could not rule out ' + names(needIR) + '.';
    }
    if (needMS.length) {
      return 'The IR alone could not have settled this — it cannot tell ' + names(needMS) +
             ' from the answer. The mass spectrum could.';
    }
    if (needIR.length) {
      return 'The molecular ion alone could not have settled this — ' + names(needIR) +
             ' weighs the same. The IR could.';
    }
    return 'Either spectrum could have ruled these out on its own — but when both agree, you know.';
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* What each labelled mass spectrum peak actually is — the mass spec
     package's panel. At Level 1 it builds as the student goes; above that it
     waits until the compound is identified, since the right skeleton drawn
     mid-item would answer the question. */
  function paintFragments() {
    var slots = slotsOf('ms').filter(function (s) { return s.filled; });
    var allowed = item.cfg.named || item.phase === 'done';
    if (!allowed || !slots.length) {
      el.fragments.hidden = true;
      el.fragments.innerHTML = '';
      return;
    }
    el.fragments.hidden = false;
    el.fragments.innerHTML = '';
    el.fragments.appendChild(make('p', 'frag-head',
      'What each labelled mass spectrum peak actually is. The solid part kept the charge; ' +
      'anything dashed walked off as a neutral.'));
    var row = make('div', 'frag-row');
    slots.slice().sort(function (a, b) { return b.mz - a.mz; }).forEach(function (s) {
      var view = MS.fragmentView(item.compound, s.peak);
      var cell = make('div', 'frag-cell');
      cell.appendChild(make('span', 'frag-mz', 'm/z ' + s.mz));
      if (view) {
        cell.appendChild(Structure.render(item.compound.structure, {
          keeps: view.keeps, charge: view.charge, scale: 22,
          highlight: view.kind === 'isotope' && view.heavy >= 0 ? view.heavy : null,
          alt: view.kind === 'isotope'
            ? 'The same molecule at m/z ' + s.mz + ', carrying a heavier isotope'
            : 'The fragment at m/z ' + s.mz + ', with the lost piece dashed'
        }));
      }
      var neutral;
      if (view && view.kind === 'isotope') neutral = view.note;
      else if (view && view.kind === 'whole') neutral = 'the whole molecule';
      else {
        neutral = 'lost ' + (MS.neutralOf(item.ms, s.peak) || '?');
        if (view && view.kind === 'ghost') neutral += ' — the H comes off the carbon next door';
        if (view && view.kind === 'hydrogen') neutral += ' — nothing heavy left, so nothing is dashed';
      }
      cell.appendChild(make('span', 'frag-lost', neutral));
      row.appendChild(cell);
    });
    el.fragments.appendChild(row);
  }

  /* ---------------------------------------------------------------- header */

  function paintHeader() {
    var L = cfg();
    el.levelName.textContent = 'Level ' + L.n + ' — ' + L.name;
    el.blurb.textContent = L.blurb;
    el.counter.textContent = state.pin ? 'Pinned compound'
      : 'Compound ' + (state.index + 1) + ' of ' + itemCount(L.n);
    el.tabs.innerHTML = '';
    LEVELS.forEach(function (x) {
      var tab = make('button', 'tab' + (x.n === state.level ? ' current' : '') +
                               (x.n > state.unlocked ? ' locked' : ''));
      tab.type = 'button';
      tab.dataset.level = String(x.n);
      tab.disabled = x.n > state.unlocked;
      tab.textContent = x.n + '. ' + x.name;
      el.tabs.appendChild(tab);
    });
    el.reference.hidden = !L.reference;
    el.hint.hidden = !L.hints;
    document.body.classList.toggle('no-markers', !L.markers);
    [el.msWrap, el.irWrap].forEach(function (w) { w.tabIndex = L.markers ? -1 : 0; });
  }

  function say(text, kind) {
    el.feedback.className = 'feedback ' + (kind || '');
    el.feedback.textContent = text;
  }

  function render() {
    window.__item = item;
    paintHeader();
    paintCard();
    paintTray();
    paintBoard();
    paintPlots();
    paintExplain();
    paintFragments();
    el.next.hidden = item.phase !== 'done';
  }

  function repaintAfterAnswer() {
    paintCard();
    paintTray();
    paintBoard();
    paintPlots();
    paintExplain();
    paintFragments();
    el.next.hidden = item.phase !== 'done';
    window.__item = item;
  }

  /* ------------------------------------------------------------- answering */

  function credit(firstTry) {
    state.stats.slots++;
    if (firstTry) state.stats.firstTry++;
  }

  /* Every answer, right or wrong, is one attempt: fill() and miss() each
     count their own, so no caller touches the counter. */
  function fill(slot, tile) {
    var first = slot.tries === 0 && tile.tries === 0;
    state.stats.attempts++;
    credit(first);
    slot.filled = true;
    /* On the plot, a mass spectrum chip reads short — "M⁺", not "M⁺·
       molecular ion" — so it can sit right over its stick on a narrow screen. */
    slot.filledLabel = slot.spec === 'ms' ? SHORT[slot.key] || tile.label : tile.label;
    tile.used = true;
    say(slot.spec === 'ms'
      ? 'Correct — m/z ' + slot.mz + '. ' + msHint(slot.key)
      : 'Correct — ' + Math.round(slot.v) + ' cm⁻¹. ' + GROUPS[slot.group].hint, 'good');
    afterPlacement();
  }

  function miss(slot, tile, text) {
    if (slot) slot.tries++;
    tile.tries++;
    state.stats.attempts++;
    say(text, 'bad');
    if (slot) flash(slot.i);
    persist();
  }

  var SHORT = { mplus: 'M⁺', miso1: 'M+1', miso2: 'M+2' };

  function crossNote(tile) {
    return tile.spec === 'ms'
      ? '“' + tile.label + '” is a mass spectrum label — it says what mass the molecule ' +
        'lost or weighs. The IR spectrum shows bonds, not masses. It belongs on the mass spectrum.'
      : '“' + tile.label + '” is an IR label — a bond vibrating. The mass spectrum shows ' +
        'masses, not bonds. It belongs on the IR spectrum.';
  }

  /* A marked slot, or at Level 4 the peak a drop landed nearest. */
  function attemptSlot(slotIndex, tileIndex) {
    if (item.phase !== 'label') return;
    var slot = item.slots[slotIndex], tile = item.tiles[tileIndex];
    if (!slot || !tile || slot.filled || tile.used) return;
    if (tile.spec !== slot.spec) { miss(slot, tile, crossNote(tile)); return; }
    if (tile.key === slot.key) { fill(slot, tile); return; }
    miss(slot, tile, wrongNote(slot, tile));
  }

  function wrongNote(slot, tile) {
    if (tile.distractor) return absentNote(tile);
    return slot.spec === 'ms'
      ? 'Not at m/z ' + slot.mz + '. ' + msHint(slot.key)
      : 'Not at ' + Math.round(slot.v) + ' cm⁻¹. ' + GROUPS[slot.group].hint;
  }

  /* What to say about a label the compound does not have. At Levels 3 and 4
     the wavenumber is never quoted, so a wrong drop cannot hand it back. */
  function absentNote(tile) {
    if (tile.spec === 'ms') {
      if (tile.key === 'mplus') return 'There is no readable molecular ion in this spectrum.';
      if (tile.key === 'miso2') {
        return item.M ? 'There is no M+2 pair here — nothing two mass units past M⁺ worth ' +
                        'reading, so no chlorine or bromine.'
                      : 'With no molecular ion, there is no M+2 to see either.';
      }
      var n = lossNumber(tile.key);
      return 'This compound shows no ' + tile.label + '. That would put a peak at m/z ' +
             (item.ms.M - n) + ' — look there, and there is nothing worth reading.';
    }
    var g = GROUPS[tile.key];
    if (!item.cfg.subs) {
      return 'This compound has no ' + tile.label + ' — work out where that band would fall, ' +
             'look there, and you will find nothing.';
    }
    return 'This compound has no ' + tile.label + ' — you would be looking for it ' +
           (g ? 'at ' + g.range + ' cm⁻¹' : 'in its usual place') + ', and nothing is there.';
  }

  /* Level 4: a drop anywhere on a plot. */
  function attemptAt(spec, pos, tileIndex) {
    if (item.phase !== 'label' || !pos) return;
    var tile = item.tiles[tileIndex];
    if (!tile || tile.used) return;
    if (tile.spec !== spec) { miss(null, tile, crossNote(tile)); return; }

    if (spec === 'ms') {
      if (pos.empty) { say('No peak there — drop the label right on a stick.', 'quiet'); return; }
      var peak = MS.peakAt(item.ms, pos.mz);
      var slot = item.slots.filter(function (s) { return s.spec === 'ms' && s.mz === pos.mz; })[0];
      if (slot) {
        if (slot.filled) { say('m/z ' + slot.mz + ' already carries ' + slot.filledLabel + '.', 'quiet'); return; }
        if (slot.key === tile.key) { fill(slot, tile); return; }
        miss(slot, tile, wrongNote(slot, tile));
        return;
      }
      miss(null, tile, tile.distractor ? absentNote(tile)
        : 'Not that peak. ' + noiseNote(peak));
      return;
    }

    var v = pos.v;
    var inside = item.slots.filter(function (s) {
      return s.spec === 'ir' && v >= s.band.tol[0] && v <= s.band.tol[1];
    });
    var match = inside.filter(function (s) { return s.key === tile.key; })[0];
    if (match && !match.filled) { fill(match, tile); return; }
    if (match && match.filled) {
      say('That band already carries ' + match.filledLabel + '.', 'quiet');
      return;
    }
    if (inside.length) {
      inside.sort(function (a, b) { return Math.abs(a.v - v) - Math.abs(b.v - v); });
      miss(inside[0], tile, wrongNote(inside[0], tile));
      return;
    }
    if (v < 1500) {
      miss(null, tile, 'Below 1500 cm⁻¹ is the fingerprint region. Nothing down there is ' +
                       'labelled in this activity — every answer is in the diagnostic region, left of the line.');
      return;
    }
    miss(null, tile, tile.distractor ? absentNote(tile)
      : 'Nothing to label at ' + posText('ir', pos) + '. ' + (item.cfg.subs
        ? 'Look for ' + tile.label + ' at ' + irSub(tile.key) + '.'
        : 'Work out where ' + tile.label + ' absorbs and look there.'));
  }

  function attemptBin(tileIndex) {
    if (item.phase !== 'label') return;
    var tile = item.tiles[tileIndex];
    if (!tile || tile.used) return;
    if (tile.where === 'bin') {
      state.stats.attempts++;
      credit(tile.tries === 0);
      tile.used = true;
      tile.binned = true;
      say('Right — ' + binNote(tile), 'good');
      afterPlacement();
      return;
    }
    miss(null, tile, 'It is in there. ' + (tile.spec === 'ms'
      ? (tile.key === 'mplus'
        ? 'There is a molecular ion: the rightmost real peak above the dotted line.'
        : tile.key === 'miso2' ? 'Look two mass units past M⁺.'
        : 'Subtract ' + lossNumber(tile.key) + ' from M⁺ and look for a peak there.')
      : 'Look again for ' + tile.label + '.'));
  }

  function binNote(tile) {
    if (tile.spec === 'ir') {
      var g = GROUPS[tile.key];
      return 'there is no ' + tile.label + ' here.' + (g ? ' ' + g.hint : '');
    }
    if (tile.key === 'mplus') {
      return 'there is no readable molecular ion. The molecule falls apart as soon as it ' +
             'forms, which usually means a very stable fragment is on offer — a tertiary carbon, ' +
             'or an O or N next door. Without M⁺ you cannot read the mass, a halogen or a nitrogen, ' +
             'so the IR and the base peak have to carry the case.';
    }
    if (tile.key === 'miso2') {
      return item.M ? 'no M+2 pair, so no chlorine or bromine.'
                    : 'with no molecular ion there is no M+2 either.';
    }
    var n = lossNumber(tile.key);
    return 'no ' + tile.label + '. It would put a peak at m/z ' + (item.ms.M - n) +
           ', and there is nothing worth reading there.';
  }

  function flash(slotIndex) {
    document.querySelectorAll('.slot').forEach(function (n) {
      if (n.dataset.slot === String(slotIndex)) {
        n.classList.remove('shake');
        void n.offsetWidth;
        n.classList.add('shake');
      }
    });
  }

  function afterPlacement() {
    clearSelection();
    var done = item.slots.every(function (s) { return s.filled; }) &&
               (!item.cfg.bin || item.tiles.every(function (t) { return t.used; }));
    if (done) finishLabels();
    repaintAfterAnswer();
    persist();
  }

  function finishLabels() {
    var L = item.cfg;
    if (L.ask) {
      item.phase = 'case';
      item.caseStep = 0;
      item.caseTried = {};
      say('Every label is placed. Now fill in the case file — the questions are on the right.', 'good');
    } else if (L.candidates) {
      item.phase = 'identify';
      say('Both spectra are labelled. Now — which of the three is it?', 'good');
    } else {
      item.phase = 'done';
      say('Both spectra labelled. Read down the case file: every line came from one spectrum ' +
          'or the other, and together they pin down ' + item.compound.name + '.', 'good');
    }
  }

  /* ------------------------------------------------------------- case file */

  function answerCase(q, raw) {
    if (item.phase !== 'case' || item.caseQs[item.caseStep] !== q) return;
    var cf = item.cf;
    var right = String(q === 'mass' ? cf.mass : q === 'irclass' ? cf.irclass : cf[q]);
    item.caseTried[q] = item.caseTried[q] || [];
    state.stats.attempts++;

    if (raw !== right) {
      item.caseTried[q].push(raw);
      say(caseWrong(q, raw), 'bad');
      paintBoard();
      persist();
      return;
    }
    credit(item.caseTried[q].length === 0);
    item.caseAns[q] = raw;
    say(caseRight(q), 'good');

    /* No molecular ion: the halogen and nitrogen rows cannot be read, and
       asking them would be asking for a guess. */
    if (q === 'mass' && cf.mass === 'none') {
      item.caseAns.halogen = 'unknown';
      item.caseAns.nitrogen = 'unknown';
    }
    do { item.caseStep++; }
    while (item.caseStep < item.caseQs.length && item.caseAns[item.caseQs[item.caseStep]] != null);

    if (item.caseStep >= item.caseQs.length) {
      item.phase = 'identify';
      say('The case file is complete. Four candidates are on the right — which one fits every line?', 'good');
    }
    repaintAfterAnswer();
    persist();
  }

  function caseRight(q) {
    var cf = item.cf;
    if (q === 'mass') {
      return cf.mass === 'none'
        ? 'Right — there is no molecular ion above the line. Without it, the mass spectrum cannot ' +
          'tell you the mass, a halogen or a nitrogen, so those rows stay blank. The IR and the base ' +
          'peak will have to carry this one.'
        : 'Right — M⁺ is at m/z ' + cf.mass + ', so the molecule weighs ' + cf.mass + '.';
    }
    if (q === 'halogen') {
      return cf.halogen === 'none' ? 'Right — nothing two past M⁺ worth reading: no Cl, no Br.'
        : cf.halogen === 'Cl' ? 'Right — a peak two past M⁺ about a third as tall: ³⁵Cl and ³⁷Cl, 3:1.'
        : 'Right — a peak two past M⁺ about as tall: ⁷⁹Br and ⁸¹Br, 1:1.';
    }
    if (q === 'nitrogen') {
      return cf.nitrogen === 'odd' ? 'Right — ' + cf.mass + ' is odd, so there is one nitrogen.'
        : 'Right — ' + cf.mass + ' is even, so no nitrogen (or two, which none of these has).';
    }
    return 'Right — ' + Evidence.IR_CLASSES[cf.irclass].why + '.';
  }

  function caseWrong(q, raw) {
    var cf = item.cf, M = item.M;
    if (q === 'mass') {
      if (raw === 'none') {
        return 'There is one. Look at the right-hand end of the mass spectrum for the rightmost ' +
               'real peak above the dotted line.';
      }
      var v = +raw;
      if (M && v === M + 1) {
        return 'm/z ' + v + ' is the M+1 peak — the same molecule with one ¹³C in it. The ' +
               'molecular ion is the taller peak one unit to its left.';
      }
      if (M) {
        return 'm/z ' + v + ' is a fragment: there are real peaks further right. The molecular ' +
               'ion is the rightmost real peak, ignoring the small M+1 just past it.';
      }
      return 'Could m/z ' + v + ' be the whole molecule? ' + (v % 2
        ? 'Its mass is odd, which would mean a nitrogen — and nothing in the IR looks like N–H, ' +
          'C≡N or N–O. '
        : 'Check whether every peak in the spectrum could come from it. ') +
        'Alcohols, ethers and branched alkanes often lose the molecular ion completely; what is ' +
        'left at the right-hand end is a fragment.';
    }
    if (q === 'halogen') {
      if (cf.halogen === 'none') {
        return 'Nothing two past M⁺ is worth reading. The small peak ONE past M⁺ is M+1, from ¹³C — ' +
               'every carbon compound has it.';
      }
      if (cf.halogen === 'Cl') {
        return raw === 'Br'
          ? 'Compare the heights: the peak two past M⁺ is only about a third as tall — ³⁵Cl : ³⁷Cl is 3:1.'
          : 'Look again two past M⁺, at m/z ' + (M + 2) + ': there is a peak about a third as tall as ' +
            'M⁺. It can be faint when M⁺ itself is small.';
      }
      return raw === 'Cl'
        ? 'Compare the heights: the peak two past M⁺ is about as tall as M⁺ — ⁷⁹Br : ⁸¹Br is 1:1.'
        : 'Look again two past M⁺, at m/z ' + (M + 2) + ': there is a peak about as tall as M⁺.';
    }
    if (q === 'nitrogen') {
      return 'M⁺ is at ' + M + ', which is ' + (M % 2 ? 'odd' : 'even') + '. ' +
             'An odd molecular mass means one nitrogen; an even one means none (or two).';
    }
    var labelled = slotsOf('ir').map(function (s) { return s.filledLabel; }).join(', ');
    return 'No — ' + Evidence.IR_CLASSES[raw].label.toLowerCase() + ' would need ' +
           Evidence.IR_CLASSES[raw].why + '. You labelled: ' + labelled + '.';
  }

  /* ------------------------------------------------------------ identify */

  function chooseCompound(id) {
    if (item.phase === 'label' || item.phase === 'case') {
      say(item.phase === 'label'
        ? 'Label both spectra first — the labels are the evidence.'
        : 'Finish the case file first.', 'quiet');
      return;
    }
    if (item.phase !== 'identify') return;
    state.stats.attempts++;
    if (id === item.compound.id) {
      credit(!item.picked || !item.picked.length);
      item.phase = 'done';
      say(item.compound.name + ' — right. Below: which spectrum ruled out each wrong option.', 'good');
      repaintAfterAnswer();
      el.next.focus();
    } else {
      item.picked = (item.picked || []).concat([id]);
      var d = byId(id), v = Evidence.whyNot(item.compound, d);
      say('Not ' + d.name + '. ' + [v.ir && 'IR: ' + v.ir, v.ms && 'MS: ' + v.ms]
        .filter(Boolean).join(' '), 'bad');
      paintCard();
    }
    persist();
  }

  /* ----------------------------------------------------------------- hints */

  function hint() {
    if (!item.cfg.hints) return;
    var text = nextHint();
    state.stats.hints = (state.stats.hints || 0) + 1;
    say('Hint — ' + text, 'hint');
    persist();
  }

  function nextHint() {
    var L = item.cfg, M = item.M;
    if (item.phase === 'label') {
      var ms = slotsOf('ms').filter(function (s) { return !s.filled; });
      var ir = slotsOf('ir').filter(function (s) { return !s.filled; });
      var mplusTile = item.tiles.filter(function (t) { return t.key === 'mplus' && !t.used; })[0];
      if (!M && mplusTile) {
        return 'Start at the right-hand end of the mass spectrum. Is there any peak above the ' +
               'dotted line that could be the whole molecule? If the rightmost real peak has an odd ' +
               'mass and the IR shows no nitrogen, it is a fragment.';
      }
      if (ms.length) {
        var s = ms[0];
        if (s.key === 'mplus') {
          return 'Mass spectrum first. The molecular ion is the rightmost real peak above the dotted ' +
                 'line — ignore the small one just to its right, which is M+1.';
        }
        if (s.key === 'miso2') {
          return 'Look two mass units past M⁺, at m/z ' + s.mz + '. How tall is it compared with M⁺?';
        }
        return (L.markers ? '' : 'There is a peak worth labelling at m/z ' + s.mz + '. ') +
               'Subtract m/z ' + s.mz + ' from M⁺ (' + item.ms.M + '): what did the molecule lose?';
      }
      if (ir.length) {
        return (L.markers ? '' : 'There is a band worth labelling near ' +
                Math.round(ir[0].v / 10) * 10 + ' cm⁻¹. ') + Evidence.irAsk(ir[0].group, ir[0].v);
      }
      return 'Some of the labels left describe something these spectra do not have. Check each one ' +
             'against its spectrum — anything you cannot find goes in the box.';
    }
    if (item.phase === 'case') {
      var q = item.caseQs[item.caseStep];
      if (q === 'mass') {
        return M ? 'The molecular ion is the rightmost real peak above the dotted line. You labelled it already.'
                 : 'Is there a molecular ion at all? The rightmost peak above the line might be a fragment — ' +
                   'if its mass is odd, the molecule would need a nitrogen. Does the IR show one?';
      }
      if (q === 'halogen') return 'Compare the peak at m/z ' + (M + 2) + ' with M⁺. None, a third, or equal?';
      if (q === 'nitrogen') return 'Is ' + M + ' odd or even? Odd means nitrogen.';
      return 'Read the IR labels you placed, top to bottom. Is there an O–H or N–H? A C=O? A triple bond? ' +
             'The first of those you find decides the class.';
    }
    if (item.phase === 'identify') {
      return 'Check each candidate against the case file, one line at a time: its molecular mass from ' +
             'its formula, any Cl or Br, any N, and which bands its IR would show. A single mismatch ' +
             'rules it out.';
    }
    return 'This compound is done — go on to the next one.';
  }

  /* ------------------------------------------------------------ progression */

  function nextItem() {
    var L = cfg();
    state.index++;
    if (state.index >= itemCount(L.n)) {
      if (state.done.indexOf(state.level) < 0) state.done.push(state.level);
      if (state.level < LEVELS.length) {
        state.unlocked = Math.max(state.unlocked, state.level + 1);
        state.level++;
        state.index = 0;
        persist();
        showScreen('level', L);
        return;
      }
      state.index = itemCount(L.n) - 1;
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
    tour = null;
    setBackgroundInert(false);
    /* the plots may have been laid out while hidden behind the screen */
    paintPlots();
  }

  function openScreen() {
    var s = el.screen;
    s.innerHTML = '';
    s.hidden = false;
    setBackgroundInert(true);
    var box = make('div', 'screen-box');
    s.appendChild(box);
    return box;
  }

  function focusPrimary(box) {
    var primary = box.querySelector('.primary');
    if (primary) primary.focus();
  }

  function showScreen(kind, doneCfg) {
    var box = openScreen();

    if (kind === 'intro') {
      box.appendChild(make('h2', null, 'Two spectra, one compound'));
      box.appendChild(make('p', null,
        'A mass spectrum weighs the molecule and the pieces it breaks into. An IR spectrum shows ' +
        'which bonds are there. Neither is usually enough on its own — the IR cannot tell 1-butanol ' +
        'from 2-butanol, and the mass spectrum cannot tell acetophenone from cumene — but together ' +
        'they nearly always leave one answer.'));
      box.appendChild(make('p', null,
        'Every compound is read with the same routine: find M⁺, look for an M+2, check odd or ' +
        'even, then read the IR left of 3000 and down to the C=O region, and finally the base peak. ' +
        'The case file on the right keeps track.'));
      var ul = make('ul', 'screen-list');
      LEVELS.forEach(function (L) {
        var li = make('li', null);
        li.appendChild(make('strong', null, 'Level ' + L.n + ' — ' + L.name + ': '));
        li.appendChild(document.createTextNode(L.blurb));
        ul.appendChild(li);
      });
      box.appendChild(ul);
      box.appendChild(make('p', 'screen-note',
        'Drag a label onto a peak, or click the label and then the peak. Wrong answers are not ' +
        'penalised — read the explanation and try again.'));
      if (resumed) {
        box.appendChild(make('p', 'screen-resume',
          'Welcome back — your progress was saved. You are on Level ' + state.level +
          ', compound ' + (state.index + 1) + ' of ' + itemCount(state.level) + '.'));
      }
      var row = make('div', 'screen-buttons');
      var show = make('button', resumed ? 'secondary' : 'primary', 'Show me how — one worked example');
      show.type = 'button';
      show.addEventListener('click', function () { showTour(0); });
      var go = make('button', resumed ? 'primary' : 'secondary', resumed ? 'Carry on' : 'Skip to Level 1');
      go.type = 'button';
      go.addEventListener('click', function () { hideScreen(); el.tray.focus(); });
      row.appendChild(resumed ? go : show);
      row.appendChild(resumed ? show : go);
      box.appendChild(row);

    } else if (kind === 'level') {
      box.appendChild(make('h2', null, 'Level ' + doneCfg.n + ' complete'));
      box.appendChild(make('p', null, accuracyLine()));
      var nextL = LEVELS[state.level - 1];
      box.appendChild(make('p', null, 'Next: Level ' + nextL.n + ' — ' + nextL.name + '.'));
      box.appendChild(make('p', 'screen-note', nextL.blurb));
      var goL = make('button', 'primary', 'Start Level ' + state.level);
      goL.type = 'button';
      goL.addEventListener('click', function () {
        hideScreen(); item = buildItem(); render(); say('');
      });
      box.appendChild(goL);

    } else {
      box.appendChild(make('h2', null, 'All four levels complete'));
      box.appendChild(make('p', null, accuracyLine()));
      box.appendChild(make('p', 'screen-note', SCORM.isConnected()
        ? 'Your completion has been sent to the gradebook. You may close this window.'
        : 'Running outside an LMS — nothing was reported.'));
      var again = make('button', 'primary', 'Play again with new compounds');
      again.type = 'button';
      again.addEventListener('click', function () {
        state = newRun(); persist(); hideScreen(); item = buildItem(); render(); say('');
      });
      box.appendChild(again);
    }
    focusPrimary(box);
  }

  function accuracyLine() {
    var st = state.stats;
    if (!st.slots) return 'No answers recorded yet.';
    var pct = Math.round(st.firstTry / st.slots * 100);
    return st.firstTry + ' of ' + st.slots + ' answered correctly on the first try (' + pct +
           '%), across ' + st.attempts + ' attempts' +
           (st.hints ? ', with ' + st.hints + ' hint' + (st.hints === 1 ? '' : 's') : '') + '.';
  }

  /* --------------------------------------------------------- the walkthrough
   *
   * One compound, 2-butanone, worked through the routine a step at a time,
   * with the part of each spectrum that step reads picked out. It runs before
   * Level 1 and can be replayed from "How to read these" at any time.
   */
  var TOUR = [
    { t: 'Two spectra, two different questions',
      p: 'The mass spectrum (top) weighs the molecule and the pieces it breaks into. The IR ' +
         '(bottom) shows which bonds are there. This is 2-butanone, read with the routine you will ' +
         'use on every compound.' },
    { t: 'Step 1 · MS — find the molecular ion', spec: 'ms', lo: 70.5, hi: 73.5,
      p: 'The molecular ion, M⁺, is the rightmost real peak above the dotted line. Ignore the tiny ' +
         'one just past it — that is M+1, from ¹³C. Here M⁺ is at m/z 72: the molecule weighs 72.' },
    { t: 'Step 2 · MS — look two past M⁺', spec: 'ms', lo: 73.3, hi: 74.7,
      p: 'A chlorine would put a peak at 74 about a third as tall as M⁺; a bromine one about as ' +
         'tall. There is nothing there worth reading: no Cl, no Br.' },
    { t: 'Step 3 · MS — odd or even?', spec: 'ms', lo: 70.5, hi: 73.5,
      p: '72 is even. An odd molecular mass means one nitrogen; even means none. No nitrogen.' },
    { t: 'Step 4 · IR — anything left of 3000?', spec: 'ir', lo: 2800, hi: 3700,
      p: 'No broad, rounded O–H between 3200 and 3600. No N–H spikes. Nothing left of the dotted ' +
         '3000 line at all — the only C–H is sp³, just to its right.' },
    { t: 'Step 5 · IR — C=O, triple bond or C=C?', spec: 'ir', lo: 1640, hi: 1790,
      p: 'One strong, sharp band near 1715 cm⁻¹: a C=O. With no O–H it is not an acid; with no ' +
         'weak pair near 2720 it is not an aldehyde. A ketone or an ester.' },
    { t: 'Step 6 · MS — base peak and the big losses', spec: 'ms', lo: 25, hi: 46,
      p: 'The base peak is m/z 43: 72 − 43 = 29, so an ethyl walked off. m/z 29 is that ethyl. ' +
         'What stayed, CH₃C≡O⁺, kept the C=O — the C=O helps hold the charge, so it wins.' },
    { t: 'Step 7 · Put it together',
      p: 'Mass 72, no halogen, no nitrogen, a C=O and nothing else, a CH₃–C=O on one side and an ' +
         'ethyl on the other. C₄H₈O: 2-butanone. An ester would need a second oxygen — and M = 88.',
      structure: true }
  ];

  function showTour(step) {
    var c = byId('butanone');
    if (!tour) tour = { ms: MS.build(c, 20240901), ir: IR.build(c, 811) };
    tour.step = step;
    var box = openScreen();
    box.classList.add('tour');
    var s = TOUR[step];
    box.appendChild(make('p', 'tour-count', 'Worked example · ' + (step + 1) + ' of ' + TOUR.length));
    box.appendChild(make('h2', null, s.t));

    var plots = make('div', 'tour-plots');
    ['ms', 'ir'].forEach(function (spec) {
      var wrap = make('div', 'tour-plot ' + spec + (s.spec && s.spec !== spec ? ' dim' : ''));
      wrap.appendChild(make('span', 'tour-tag', spec === 'ms' ? 'Mass spectrum' : 'IR spectrum'));
      var cv = make('canvas', null);
      cv.setAttribute('aria-hidden', 'true');
      wrap.appendChild(cv);
      var hl = make('div', 'tour-hl');
      hl.hidden = true;
      wrap.appendChild(hl);
      plots.appendChild(wrap);
    });
    box.appendChild(plots);

    var text = make('div', 'tour-text');
    text.appendChild(make('p', null, s.p));
    if (s.structure) {
      text.appendChild(Structure.render(c.structure, { alt: 'Skeletal structure of 2-butanone', scale: 30 }));
    }
    box.appendChild(text);

    var nav = make('div', 'screen-buttons');
    if (step > 0) {
      var back = make('button', 'secondary', '← Back');
      back.type = 'button';
      back.addEventListener('click', function () { showTour(step - 1); });
      nav.appendChild(back);
    }
    var last = step === TOUR.length - 1;
    var fwd = make('button', 'primary', last ? 'Start' : 'Next →');
    fwd.type = 'button';
    fwd.addEventListener('click', function () {
      if (last) { hideScreen(); el.tray.focus(); } else showTour(step + 1);
    });
    nav.appendChild(fwd);
    if (!last) {
      var skip = make('button', 'linkish', 'Skip');
      skip.type = 'button';
      skip.addEventListener('click', function () { hideScreen(); });
      nav.appendChild(skip);
    }
    box.appendChild(nav);
    drawTour();
    focusPrimary(box);
  }

  function drawTour() {
    if (!tour || el.screen.hidden) return;
    var s = TOUR[tour.step];
    el.screen.querySelectorAll('.tour-plot').forEach(function (wrap) {
      var spec = wrap.classList.contains('ms') ? 'ms' : 'ir';
      var cv = wrap.querySelector('canvas');
      var rect = spec === 'ms' ? MS.draw(cv, tour.ms) : IR.draw(cv, tour.ir);
      var hl = wrap.querySelector('.tour-hl');
      if (!rect || s.spec !== spec) { hl.hidden = true; return; }
      var x0 = spec === 'ms' ? MS.xOfMz(s.lo, rect, tour.ms) : IR.xOfV(s.hi, rect);
      var x1 = spec === 'ms' ? MS.xOfMz(s.hi, rect, tour.ms) : IR.xOfV(s.lo, rect);
      hl.hidden = false;
      hl.style.left = (cv.offsetLeft + x0) + 'px';
      hl.style.width = Math.max(6, x1 - x0) + 'px';
      hl.style.top = (cv.offsetTop + rect.y) + 'px';
      hl.style.height = rect.h + 'px';
    });
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
    return hit && !hit.classList.contains('ok') ? +hit.dataset.slot : -1;
  }

  function binAt(clientX, clientY) {
    var node = document.elementFromPoint(clientX, clientY);
    return !!(node && node.closest && node.closest('.bin'));
  }

  function clearSelection() {
    selectedTile = null;
    el.tray.querySelectorAll('.tile.selected').forEach(function (n) { n.classList.remove('selected'); });
    el.stage.classList.remove('picking');
    if (item) { item.cursor = { ms: null, ir: null }; paintGuide('ms'); paintGuide('ir'); }
  }

  function startDrag(ev) {
    var idx = tileIndexOf(ev.target);
    if (idx < 0) return;
    var tileNode = ev.target.closest('.tile');
    drag = { index: idx, moved: false, node: null, from: tileNode, x0: ev.clientX, y0: ev.clientY };
    try { tileNode.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
  }

  function moveDrag(ev) {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < 6) return;
      drag.moved = true;
      var t = item.tiles[drag.index];
      drag.node = make('div', 'ghost ' + t.spec, t.label);
      document.body.appendChild(drag.node);
      drag.from.classList.add('dragging');
    }
    drag.node.style.left = ev.clientX + 'px';
    drag.node.style.top = ev.clientY + 'px';

    var over = slotIndexAt(ev.clientX, ev.clientY);
    document.querySelectorAll('.slot').forEach(function (n) {
      n.classList.toggle('hover', over >= 0 && n.dataset.slot === String(over));
    });
    var bin = el.tray.querySelector('.bin');
    if (bin) bin.classList.toggle('hover', binAt(ev.clientX, ev.clientY));
    if (!item.cfg.markers) {
      var spec = specAt(ev.clientX, ev.clientY);
      ['ms', 'ir'].forEach(function (sp) {
        setCursor(sp, sp === spec ? posAt(sp, ev.clientX, ev.clientY) : null);
      });
    }
  }

  function endDrag(ev) {
    if (!drag) return;
    var d = drag;
    drag = null;
    if (d.node) d.node.remove();
    d.from.classList.remove('dragging');
    document.querySelectorAll('.slot.hover, .bin.hover').forEach(function (n) { n.classList.remove('hover'); });
    if (!d.moved) return;          /* a tap is left to the click handler */

    suppressClick = true;
    if (item.cfg.bin && binAt(ev.clientX, ev.clientY)) { attemptBin(d.index); return; }
    var slot = slotIndexAt(ev.clientX, ev.clientY);
    if (slot >= 0) { attemptSlot(slot, d.index); return; }
    var spec = specAt(ev.clientX, ev.clientY);
    if (!spec) return;
    if (!item.cfg.markers) {
      attemptAt(spec, posAt(spec, ev.clientX, ev.clientY), d.index);
      item.cursor = { ms: null, ir: null };
      paintGuide('ms'); paintGuide('ir');
      return;
    }
    if (spec === 'ms') {
      var pos = posAt('ms', ev.clientX, ev.clientY);
      var peak = pos && !pos.empty ? MS.peakAt(item.ms, pos.mz) : null;
      if (peak && !peak.target) say(noiseNote(peak), 'quiet');
    }
  }

  function selectTile(index) {
    var was = selectedTile === index;
    clearSelection();
    if (was) { say(''); return; }
    selectedTile = index;
    el.tray.querySelectorAll('.tile').forEach(function (n) {
      if (+n.dataset.tile === index) n.classList.add('selected');
    });
    el.stage.classList.add('picking');
    var t = item.tiles[index];
    say(item.cfg.markers
      ? 'Now choose the peak that belongs to ' + t.label + '.'
      : 'Now click where ' + t.label + ' belongs on the ' + (t.spec === 'ms' ? 'mass' : 'IR') +
        ' spectrum' + (item.cfg.bin ? ' — or on the “not in these spectra” box.' : '.') +
        ' With the keyboard: tab to the plot, use ← → to move, Enter to drop.', 'quiet');
  }

  function onTrayClick(ev) {
    if (suppressClick) { suppressClick = false; return; }
    if (ev.target.closest && ev.target.closest('.bin')) {
      if (selectedTile != null) { var t = selectedTile; clearSelection(); attemptBin(t); }
      else say('Choose a label first, then the box.', 'quiet');
      return;
    }
    var idx = tileIndexOf(ev.target);
    if (idx >= 0) selectTile(idx);
  }

  function onStageClick(ev) {
    if (suppressClick) { suppressClick = false; return; }
    var hit = ev.target.closest && ev.target.closest('.slot');
    if (hit && selectedTile != null && !hit.classList.contains('ok')) {
      var tileIdx = selectedTile;
      clearSelection();
      attemptSlot(+hit.dataset.slot, tileIdx);
      return;
    }
    if (hit) return;

    var spec = specAt(ev.clientX, ev.clientY);
    if (!spec) return;
    var pos = posAt(spec, ev.clientX, ev.clientY);
    if (!pos) return;
    if (!item.cfg.markers && selectedTile != null) {
      var ti = selectedTile;
      clearSelection();
      attemptAt(spec, pos, ti);
      return;
    }
    interrogate(spec, pos);
  }

  /* Clicking a plot with no label chosen asks it a question. On the mass
     spectrum every stick explains itself — the "ignore the noise" lesson from
     the mass spec package. On the IR, the fingerprint region says why it is
     never asked about. */
  function interrogate(spec, pos) {
    if (spec === 'ms') {
      if (pos.empty) return;
      var peak = MS.peakAt(item.ms, pos.mz);
      if (!peak) return;
      if (peak.target && item.phase === 'label') {
        say(item.cfg.markers
          ? 'That peak is one of the ones to label — choose a label first, then click it.'
          : 'm/z ' + peak.mz + ' — ' + Math.round(peak.ab) + '% of the base peak.', 'quiet');
        return;
      }
      say(noiseNote(peak), 'quiet');
      return;
    }
    if (pos.v < 1500) {
      say('Below 1500 cm⁻¹ is the fingerprint region: unique to each compound, but too crowded to ' +
          'read band by band. Nothing down here is asked about.', 'quiet');
    } else if (!item.cfg.markers) {
      say(posText('ir', pos) + '.', 'quiet');
    }
  }

  function noiseNote(peak) {
    var pct = Math.round(peak.ab);
    if (peak.note) return 'm/z ' + peak.mz + ' is ' + pct + '%. ' + peak.note;
    if (peak.role === 'key' && peak.why) {
      return 'm/z ' + peak.mz + ' is ' + pct + '%. ' + peak.why +
             (item.M ? '' : ' (With no molecular ion, you could not have worked out the loss from ' +
                            'this spectrum alone.)');
    }
    switch (peak.role) {
      case 'mplus':
        return 'm/z ' + peak.mz + ' is the molecular ion — the whole molecule, minus one electron.';
      case 'miso1':
        return 'm/z ' + peak.mz + ' is the M+1 isotope peak — one ¹³C in place of a ¹²C. It is about ' +
               '1.1% of M⁺ for every carbon, so its height COUNTS THE CARBONS. Not a fragment.';
      case 'miso2':
        return 'm/z ' + peak.mz + ' is the M+2 isotope peak, not a fragment. About a third of M⁺ ' +
               'means chlorine; about equal means bromine.';
      case 'sat':
        return 'm/z ' + peak.mz + ' is the ¹³C satellite of the peak one mass unit below it. Not a fragment.';
      case 'mcl':
        return 'm/z ' + peak.mz + ' is real, but it comes from a REARRANGEMENT rather than a simple ' +
               'break. That is not part of this unit, so leave it alone.';
      case 'cluster':
        var ion = peak.ion ? IONS[peak.ion] : null;
        if (ion && (ion.cls === 'resonance' || ion.cls === 'tertiary')) {
          return 'm/z ' + peak.mz + ' is ' + pct + '%, and it really is ' + ion.label + '. Genuine ' +
                 'chemistry — just not one of the peaks asked about here. ' + ion.hint;
        }
        return 'm/z ' + peak.mz + ' is ' + pct + '% — above the line, so a real peak. But it narrows ' +
               'nothing down: ' + (ion && ion.cls === 'aryl'
                 ? 'it is what is left when a ring fragment breaks up further.'
                 : 'almost every chain of this length throws one off.');
      default:
        return 'm/z ' + peak.mz + ' is only ' + (peak.ab < 1 ? 'about 1' : pct) +
               '% of the base peak — below the reading line. Not worth your attention.';
    }
  }

  function onBoardClick(ev) {
    var btn = ev.target.closest && ev.target.closest('.opt');
    if (btn && !btn.disabled) answerCase(btn.dataset.q, btn.dataset.v);
  }

  function onCardClick(ev) {
    var b = ev.target.closest && ev.target.closest('.cand');
    if (b && !b.disabled) chooseCompound(b.dataset.mol);
  }

  /* Level 4 keyboard: a focused plot steps between peaks with the arrow
     keys, and Enter drops the chosen label where the guide is. */
  function onPlotKey(ev) {
    if (item.cfg.markers) return;
    var spec = ev.currentTarget.dataset.spec;
    /* Stops in screen order, left to right: m/z rises that way, and the IR
       axis runs from 4000 down, which stops() already gives. */
    var list = stops(spec);
    if (spec === 'ms') list.sort(function (a, b) { return a.mz - b.mz; });
    if (!list.length) return;
    var cur = item.cursor[spec];
    var idx = -1;
    if (cur) {
      list.forEach(function (st, i) {
        if (spec === 'ms' ? st.mz === cur.mz : Math.abs(st.v - cur.v) < 1) idx = i;
      });
    }
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      idx = idx < 0 ? 0 : Math.max(0, Math.min(list.length - 1, idx + (ev.key === 'ArrowRight' ? 1 : -1)));
      setCursor(spec, list[idx]);
      say(posText(spec, list[idx]) + (selectedTile != null ? ' — press Enter to drop ' +
          item.tiles[selectedTile].label + ' here.' : ''), 'quiet');
    } else if ((ev.key === 'Enter' || ev.key === ' ') && cur) {
      ev.preventDefault();
      if (selectedTile != null) {
        var ti = selectedTile;
        clearSelection();
        attemptAt(spec, cur, ti);
      } else {
        interrogate(spec, cur);
      }
    }
  }

  function onPlotHover(ev) {
    if (item.cfg.markers || drag || selectedTile == null) return;
    var spec = ev.currentTarget.dataset.spec;
    setCursor(spec, posAt(spec, ev.clientX, ev.clientY));
  }

  function onPlotLeave(ev) {
    if (item.cfg.markers || drag) return;
    setCursor(ev.currentTarget.dataset.spec, null);
  }

  /* ------------------------------------------------------------- reference */

  function buildReference() {
    var body = el.refbody;
    body.appendChild(make('h4', 'ref-head', 'IR — the diagnostic region'));
    var t1 = make('table', 'ref-table');
    var h = make('tr');
    ['Bond', 'Wavenumber (cm⁻¹)', 'Look for'].forEach(function (x) { h.appendChild(make('th', null, x)); });
    t1.appendChild(h);
    Object.keys(GROUPS).forEach(function (k) {
      var g = GROUPS[k];
      var tr = make('tr', g.fingerprint ? 'fingerprint-row' : null);
      tr.appendChild(make('td', null, g.label + (g.fingerprint ? ' †' : '')));
      tr.appendChild(make('td', 'num', g.range));
      tr.appendChild(make('td', 'note', g.hint));
      t1.appendChild(tr);
    });
    body.appendChild(t1);
    body.appendChild(make('p', 'ref-foot',
      '† Below 1500 cm⁻¹, in the fingerprint region. Worth knowing, but never one of the bands ' +
      'you are asked to label.'));

    body.appendChild(make('h4', 'ref-head', 'Mass spectrum — common losses from M⁺'));
    var t2 = make('table', 'ref-table');
    var h2 = make('tr');
    ['Loss', 'Neutral', 'What it means'].forEach(function (x) { h2.appendChild(make('th', null, x)); });
    t2.appendChild(h2);
    Object.keys(LOSSES).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
      var L = LOSSES[n];
      var tr = make('tr');
      tr.appendChild(make('td', 'num', '− ' + n));
      tr.appendChild(make('td', null, L.neutral + (L.also ? '  or  ' + L.also : '')));
      tr.appendChild(make('td', 'note', L.hint));
      t2.appendChild(tr);
    });
    body.appendChild(t2);

    body.appendChild(make('h4', 'ref-head', 'Mass spectrum — landmarks'));
    var t3 = make('table', 'ref-table');
    ['mplus', 'miso1', 'miso2'].forEach(function (k) {
      var tr = make('tr');
      tr.appendChild(make('td', 'num', LANDMARKS[k].label));
      tr.appendChild(make('td', 'note', LANDMARKS[k].hint));
      t3.appendChild(tr);
    });
    body.appendChild(t3);
    body.appendChild(make('p', 'ref-foot',
      'The dotted line across the mass spectrum is 5% of the base peak: below it, leave a peak ' +
      'alone. An odd molecular mass means one nitrogen.'));
  }

  /* ------------------------------------------------------------------ boot */

  function cacheDom() {
    ['msPlot', 'irPlot', 'msOverlay', 'irOverlay', 'msWrap', 'irWrap', 'tray', 'card', 'board',
     'feedback', 'next', 'tabs', 'levelName', 'blurb', 'counter', 'screen', 'stage', 'reference',
     'refbody', 'explain', 'fragments', 'save', 'saveNote', 'lms', 'hint', 'howto'
    ].forEach(function (id) { el[id] = $(id); });
  }

  function start() {
    cacheDom();
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
      /* a compound with no readable M+ cannot be asked at Levels 1-2 */
      if (!Evidence.readableM(byId(pin)) && LEVELS[state.level - 1].needM) state.level = 3;
    } else {
      var saved = restore(SCORM.loadState());
      if (saved && saved.plan && saved.plan[1] && byId(saved.plan[1][0])) {
        state = saved;
        resumed = state.level > 1 || state.index > 0 || !!(state.stats && state.stats.attempts);
      } else {
        state = newRun();
      }
    }
    persist();

    item = buildItem();
    render();

    el.tray.addEventListener('pointerdown', startDrag);
    el.tray.addEventListener('pointermove', moveDrag);
    el.tray.addEventListener('pointerup', endDrag);
    el.tray.addEventListener('pointercancel', endDrag);
    el.tray.addEventListener('click', onTrayClick);
    el.stage.addEventListener('click', onStageClick);
    el.board.addEventListener('click', onBoardClick);
    el.card.addEventListener('click', onCardClick);
    [el.msWrap, el.irWrap].forEach(function (w) {
      w.addEventListener('keydown', onPlotKey);
      w.addEventListener('pointermove', onPlotHover);
      w.addEventListener('pointerleave', onPlotLeave);
    });

    el.next.addEventListener('click', nextItem);
    el.save.addEventListener('click', saveNow);
    el.hint.addEventListener('click', hint);
    el.howto.addEventListener('click', function () { showTour(0); });
    el.tabs.addEventListener('click', function (ev) {
      var tab = ev.target.closest('.tab');
      if (tab && !tab.disabled) goToLevel(+tab.dataset.level);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { clearSelection(); say(''); }
    });

    var ro = new ResizeObserver(function () { paintPlots(); drawTour(); });
    ro.observe(el.msWrap);
    ro.observe(el.irWrap);
    ro.observe(el.screen);

    showScreen('intro');
  }

  return { start: start };
})();

document.addEventListener('DOMContentLoaded', Game.start);

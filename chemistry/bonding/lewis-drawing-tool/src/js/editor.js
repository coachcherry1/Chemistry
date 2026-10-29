/* editor.js — drawing on the grid.
 *
 * Tools (one at a time):
 *   Atom       tap an empty spot: a new atom of the chosen element — bonded to
 *              the selected atom if there is one (the selection stays put, so
 *              tapping round a C gives it its H atoms). Tap an atom to select it.
 *   Bond       tap two atoms: a single bond between them (tap the same pair
 *              again, or tap a bond: single → double → triple → single). Tap
 *              an atom, then an empty spot: a new bonded atom there.
 *   Lone pair  tap an atom: one more lone pair (back to none when it is full)
 *   Arrow      tap an empty spot: ↔ (tap the arrow to change it to → or ⇌)
 *   Erase      tap an atom, bond or arrow to remove it
 * In every tool: drag an atom or arrow to move it (hold Shift, or use the
 * arrow buttons in the panel, to move the whole molecule); the panel on the
 * left edits whatever is selected.
 *
 * Every change goes through commit(), which keeps the undo history, redraws,
 * and tells app.js to save.
 */

var Editor = (function () {
  'use strict';
  var h = UI.h;
  var W = 18, H = 11, SNAP = 0.5, LIMIT = 200;

  var S = {
    doc: Model.blank(), tool: 'atom', el: 'C', arrowKind: 'res', selected: null, pending: null,
    opts: { lonePairs: true, formal: false, brackets: true, color: true, bg: 'white', size: 3 },
    undo: [], redo: []
  };
  var host, inspector, statusEl, onChange = function () {};

  /* ------------------------------------------------------------ history */

  function snapshot() { return JSON.stringify(S.doc); }

  /* run `fn` on the drawing as one undoable step */
  function commit(fn) {
    var before = snapshot();
    fn(S.doc);
    if (snapshot() === before) { paint(); return; }
    S.undo.push(before);
    if (S.undo.length > LIMIT) S.undo.shift();
    S.redo = [];
    afterChange();
  }

  function afterChange() {
    if (S.selected && !Model.find(S.doc, S.selected)) S.selected = null;
    if (S.pending && !Model.atom(S.doc, S.pending)) S.pending = null;
    paint();
    onChange();
  }

  function undo() {
    if (!S.undo.length) return;
    S.redo.push(snapshot());
    S.doc = JSON.parse(S.undo.pop());
    afterChange();
  }
  function redo() {
    if (!S.redo.length) return;
    S.undo.push(snapshot());
    S.doc = JSON.parse(S.redo.pop());
    afterChange();
  }

  /* --------------------------------------------------------------- paint */

  function theme() { return S.opts.bg === 'dark' ? 'dark' : 'light'; }

  function renderOpts() {
    return { theme: theme(), color: S.opts.color, lonePairs: S.opts.lonePairs, formal: S.opts.formal,
             brackets: S.opts.brackets };
  }

  function paint() {
    var fresh = Render.svg(S.doc, Object.assign(renderOpts(), {
      editor: { w: W, h: H, selected: S.selected, pending: S.pending }
    }));
    host.setAttribute('viewBox', fresh.getAttribute('viewBox'));
    host.setAttribute('aria-label', fresh.getAttribute('aria-label'));
    host.parentNode.className = 'canvas ' + (S.opts.bg === 'dark' ? 'bg-dark' : 'bg-white') +
      (S.tool ? ' tool-' + S.tool : '');
    while (host.firstChild) host.removeChild(host.firstChild);
    while (fresh.firstChild) host.appendChild(fresh.firstChild);
    paintStatus();
    paintInspector();
  }

  function paintStatus() {
    var parts = Model.summary(S.doc).map(function (c) {
      /* the net charge only once it is finished — a half-built skeleton's would mislead */
      var name = c.formula + (c.charge && Model.finished(S.doc, c.ids) ? Lewis.chargeSup(c.charge) : '');
      var single = c.ids.length === 1 && !Model.bondsOf(S.doc, c.ids[0]).length;
      if (single) return name + ': ' + c.electrons + ' electron' + (c.electrons === 1 ? '' : 's') + ' shown';
      var check = c.off.length ? c.off.map(function (x) {
        return x.el + ' has ' + x.e + (x.e < x.want ? ' (short)' : x.e > x.want ? ' (more than ' + x.want + ')' : '');
      }).join(', ') : 'every atom has its octet (H its duet)';
      return name + ': ' + c.electrons + ' valence electrons · ' + check;
    });
    statusEl.textContent = parts.length ? parts.join('   |   ') : 'Empty. Start from a formula, pick a common molecule, or tap the grid to place atoms.';
  }

  /* ---------------------------------------------------------- the panel */

  function btn(text, fn, attrs) {
    return h('button', Object.assign({ type: 'button', class: 'mini', text: text, onclick: fn }, attrs || {}));
  }

  function stepper(label, value, dec, inc, canInc) {
    return h('div', { class: 'stepper' }, [
      h('span', { class: 'st-label', text: label }),
      btn('−', dec, { 'aria-label': 'One fewer ' + label.toLowerCase(), disabled: value <= 0 }),
      h('span', { class: 'st-val', text: String(value) }),
      btn('+', inc, { 'aria-label': 'One more ' + label.toLowerCase(), disabled: !canInc })
    ]);
  }

  function nudgeRow(label, fn, step) {
    return h('div', { class: 'nudge' }, [h('span', { class: 'st-label', text: label })].concat(
      [['◀', -step, 0, 'left'], ['▲', 0, -step, 'up'], ['▼', 0, step, 'down'], ['▶', step, 0, 'right']].map(function (m) {
        return btn(m[0], function () { fn(m[1], m[2]); }, { 'aria-label': label + ' ' + m[3] });
      })));
  }

  var TIPS = {
    atom: 'Tap the grid to place a ' + '{el}. Tap an atom to select it — then every new atom you place is bonded to it.',
    bond: 'Tap two atoms to bond them. Tap a bond to make it double, then triple. Tap an atom, then an empty spot, ' +
          'for a new bonded atom.',
    lp: 'Tap an atom to add a lone pair. When it is full, the next tap clears its lone pairs.',
    arrow: 'Tap an empty spot for a ↔ arrow. Tap an arrow to change it to → or ⇌.',
    erase: 'Tap an atom, bond or arrow to remove it.'
  };

  function paintInspector() {
    inspector.innerHTML = '';
    var id = S.selected, a = id && Model.atom(S.doc, id), b = id && Model.bond(S.doc, id), r = id && Model.arrow(S.doc, id);
    if (a) {
      var fc = Model.formalCharge(S.doc, a.id), room = Model.sitesFree(S.doc, a.id) - a.lp - a.e1;
      var sel = h('select', { class: 'select', 'aria-label': 'Element of the selected atom' }, Object.keys(ELEMENTS).map(function (e) {
        return h('option', { value: e, text: e, selected: e === a.el });
      }));
      sel.addEventListener('change', function () { commit(function (d) { Model.atom(d, id).el = sel.value; }); });
      inspector.appendChild(h('div', { class: 'insp-head' }, [h('b', { text: 'Atom ' }), sel,
        h('span', { class: 'hint', text: Model.electrons(S.doc, id) + ' e⁻' + (fc != null ? ' · formal charge ' +
          (fc > 0 ? '+' : fc < 0 ? '−' : '') + Math.abs(fc) : '') })]));
      inspector.appendChild(stepper('Lone pairs', a.lp,
        function () { commit(function (d) { Model.atom(d, id).lp -= 1; }); },
        function () { commit(function (d) { Model.atom(d, id).lp += 1; }); }, room > 0));
      inspector.appendChild(stepper('Single electrons', a.e1,
        function () { commit(function (d) { Model.atom(d, id).e1 -= 1; }); },
        function () { commit(function (d) { Model.atom(d, id).e1 += 1; }); }, room > 0));
      inspector.appendChild(nudgeRow('Move molecule', function (dx, dy) { moveComponent(id, dx, dy); }, 1));
      inspector.appendChild(h('div', { class: 'btnrow' }, [
        btn('Duplicate → (for resonance)', function () { duplicate(id); }),
        btn('Delete atom', function () { commit(function (d) { Model.remove(d, id); }); }, { class: 'mini danger' })
      ]));
    } else if (b) {
      var orders = [[1, 'Single'], [2, 'Double'], [3, 'Triple'], [1.5, 'Partial (┄)']];
      inspector.appendChild(h('div', { class: 'insp-head' }, [h('b', { text: 'Bond' }),
        h('span', { class: 'hint', text: Model.atom(S.doc, b.a).el + '–' + Model.atom(S.doc, b.b).el })]));
      inspector.appendChild(h('div', { class: 'seg', role: 'group', 'aria-label': 'Bond order' }, orders.map(function (o) {
        return btn(o[1], function () { commit(function (d) { Model.bond(d, id).order = o[0]; }); },
          { 'aria-pressed': b.order === o[0] ? 'true' : 'false' });
      })));
      inspector.appendChild(h('p', { class: 'hint', text: 'Partial: a solid line plus a dashed line, for a resonance hybrid.' }));
      inspector.appendChild(h('div', { class: 'btnrow' }, [
        btn('Delete bond', function () { commit(function (d) { Model.remove(d, id); }); }, { class: 'mini danger' })]));
    } else if (r) {
      var kinds = [['res', '↔ Resonance'], ['rxn', '→ Reaction'], ['eq', '⇌ Equilibrium']];
      inspector.appendChild(h('div', { class: 'insp-head' }, [h('b', { text: 'Arrow' })]));
      inspector.appendChild(h('div', { class: 'seg', role: 'group', 'aria-label': 'Arrow kind' }, kinds.map(function (k) {
        return btn(k[1], function () { S.arrowKind = k[0]; commit(function (d) { Model.arrow(d, id).kind = k[0]; }); },
          { 'aria-pressed': r.kind === k[0] ? 'true' : 'false' });
      })));
      inspector.appendChild(nudgeRow('Move', function (dx, dy) {
        commit(function (d) { var x = Model.arrow(d, id); x.x = clampX(x.x + dx); x.y = clampY(x.y + dy); });
      }, SNAP));
      inspector.appendChild(h('div', { class: 'btnrow' }, [
        btn('Delete arrow', function () { commit(function (d) { Model.remove(d, id); }); }, { class: 'mini danger' })]));
    } else {
      inspector.appendChild(h('p', { class: 'hint', text: TIPS[S.tool].replace('{el}', S.el) }));
    }
  }

  /* ---------------------------------------------------------- operations */

  function clampX(x) { return Math.max(SNAP, Math.min(W - SNAP, x)); }
  function clampY(y) { return Math.max(SNAP, Math.min(H - SNAP, y)); }
  function snap(v) { return Math.round(v / SNAP) * SNAP; }

  function moveComponent(id, dx, dy) {
    var ids = Model.componentOf(S.doc, id), bb = Model.bounds(S.doc, ids);
    dx = Math.max(SNAP - bb.x0, Math.min(W - SNAP - bb.x1, dx));
    dy = Math.max(SNAP - bb.y0, Math.min(H - SNAP - bb.y1, dy));
    commit(function (d) { Model.move(d, ids, dx, dy); });
  }

  /* a copy of the molecule beside it, with ↔ between: draw the next resonance structure from it */
  function duplicate(id) {
    var ids = Model.componentOf(S.doc, id), bb = Model.bounds(S.doc, ids);
    var part = { atoms: [], bonds: [] };
    ids.forEach(function (x) { part.atoms.push(Model.atom(S.doc, x)); });
    S.doc.bonds.forEach(function (b) { if (ids.indexOf(b.a) >= 0) part.bonds.push(b); });
    var width = bb.x1 - bb.x0, gap = 3;
    commit(function (d) {
      if (bb.x1 + gap + width <= W - SNAP) {
        Model.merge(d, part, width + gap, 0);
        Model.addArrow(d, snap(bb.x1 + gap / 2), snap((bb.y0 + bb.y1) / 2), 'res');
      } else {
        var dy = Math.min(bb.y1 - bb.y0 + 2, H - SNAP - bb.y1);
        Model.merge(d, part, 0, dy > 0 ? dy : 0);
      }
    });
  }

  /* place a drawing from the formula starter or the library */
  function place(part, replace) {
    var bb = Model.bounds(part, null);
    if (!bb) return;
    commit(function (d) {
      if (replace) { d.atoms = []; d.bonds = []; d.arrows = []; }
      var here = Model.bounds(d, null), dx, dy;
      var w = bb.x1 - bb.x0, hgt = bb.y1 - bb.y0;
      if (!here) { dx = snap(W / 2 - (bb.x0 + w / 2)); dy = snap(H / 2 - (bb.y0 + hgt / 2)); }
      else if (here.x1 + 3 + w <= W - 1) { dx = snap(here.x1 + 3 - bb.x0); dy = snap((here.y0 + here.y1) / 2 - (bb.y0 + hgt / 2)); }
      else if (here.y1 + 3 + hgt <= H - 1) { dx = snap(here.x0 - bb.x0); dy = snap(here.y1 + 3 - bb.y0); }
      else { dx = snap(W / 2 - (bb.x0 + w / 2)); dy = snap(H / 2 - (bb.y0 + hgt / 2)); }
      Model.merge(d, part, dx, dy);
    });
    S.selected = null;
    S.pending = null;
    paint();
  }

  function center() {
    var bb = Model.bounds(S.doc, null);
    if (!bb) return;
    var dx = snap(W / 2 - (bb.x0 + bb.x1) / 2), dy = snap(H / 2 - (bb.y0 + bb.y1) / 2);
    commit(function (d) {
      d.atoms.forEach(function (a) { a.x += dx; a.y += dy; });
      d.arrows.forEach(function (r) { r.x += dx; r.y += dy; });
    });
  }

  function clear() {
    commit(function (d) { d.atoms = []; d.bonds = []; d.arrows = []; });
  }

  function fill() { commit(function (d) { Model.fill(d); }); }

  /* -------------------------------------------------------------- input */

  function world(ev) {
    var pt = host.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    var p = pt.matrixTransform(host.getScreenCTM().inverse());
    return { x: p.x / Render.U, y: p.y / Render.U };
  }

  function freeAt(x, y, except) {
    return !S.doc.atoms.some(function (a) { return a.id !== except && Math.abs(a.x - x) < 0.6 && Math.abs(a.y - y) < 0.6; });
  }

  function tap(id, p) {
    var doc = S.doc;
    var a = id && Model.atom(doc, id), b = id && Model.bond(doc, id), r = id && Model.arrow(doc, id);
    var x = clampX(snap(p.x)), y = clampY(snap(p.y));
    var tool = S.tool;

    if (tool === 'erase') {
      if (id) commit(function (d) { Model.remove(d, id); });
      return;
    }
    if (b) {
      S.selected = id;
      if (tool === 'bond') commit(function (d) { var x2 = Model.bond(d, id); x2.order = x2.order === 1 ? 2 : x2.order === 2 ? 3 : 1; });
      else paint();
      return;
    }
    if (r) {
      S.selected = id;
      if (tool === 'arrow') {
        var next = { res: 'rxn', rxn: 'eq', eq: 'res' }[r.kind];
        S.arrowKind = next;
        commit(function (d) { Model.arrow(d, id).kind = next; });
      } else paint();
      return;
    }
    if (a) {
      if (tool === 'bond') {
        if (!S.pending) { S.pending = id; S.selected = id; paint(); return; }
        if (S.pending === id) { S.pending = null; paint(); return; }
        var from = S.pending;
        S.pending = null;
        S.selected = id;
        commit(function (d) {
          var e = Model.bondBetween(d, from, id);
          if (e) e.order = e.order === 1 ? 2 : e.order === 2 ? 3 : 1;
          else Model.addBond(d, from, id, 1);
        });
        return;
      }
      if (tool === 'lp') {
        S.selected = id;
        commit(function (d) {
          var t = Model.atom(d, id);
          if (t.lp + t.e1 < Model.sitesFree(d, id)) t.lp += 1; else t.lp = 0;
        });
        return;
      }
      S.selected = S.selected === id ? null : id;
      paint();
      return;
    }
    /* an empty spot */
    if (tool === 'arrow') {
      commit(function (d) { S.selected = Model.addArrow(d, x, y, S.arrowKind).id; });
      return;
    }
    if (tool === 'atom' || (tool === 'bond' && S.pending)) {
      if (!freeAt(x, y)) return;
      var anchor = tool === 'bond' ? S.pending : (S.selected && Model.atom(doc, S.selected) ? S.selected : null);
      commit(function (d) {
        var n = Model.addAtom(d, S.el, x, y);
        if (anchor) Model.addBond(d, anchor, n.id, 1);
        if (tool === 'bond') { S.pending = null; S.selected = n.id; }
        else if (!anchor) S.selected = n.id;
      });
      return;
    }
    S.selected = null;
    S.pending = null;
    paint();
  }

  /* pointer: a tap, or a drag of an atom / arrow */
  var drag = null;
  function onDown(ev) {
    if (ev.button > 0) return;
    var t = ev.target.closest ? ev.target.closest('[data-id]') : null;
    drag = { id: t ? t.getAttribute('data-id') : null, sx: ev.clientX, sy: ev.clientY, moved: false,
             p: world(ev), before: null, shift: ev.shiftKey };
    host.setPointerCapture && host.setPointerCapture(ev.pointerId);
  }
  function onMove(ev) {
    if (!drag) return;
    if (!drag.moved && Math.abs(ev.clientX - drag.sx) + Math.abs(ev.clientY - drag.sy) < 6) return;
    var item = drag.id && (Model.atom(S.doc, drag.id) || Model.arrow(S.doc, drag.id));
    if (!item || S.tool === 'erase') return;
    if (!drag.moved) {
      drag.moved = true;
      drag.before = snapshot();
      drag.ids = Model.atom(S.doc, drag.id) && drag.shift ? Model.componentOf(S.doc, drag.id) : null;
      drag.origin = { x: item.x, y: item.y };
      S.selected = drag.id;
    }
    var p = world(ev);
    var nx = clampX(snap(drag.origin.x + p.x - drag.p.x)), ny = clampY(snap(drag.origin.y + p.y - drag.p.y));
    if (drag.ids) {
      var bb = Model.bounds(S.doc, drag.ids);
      var dx = nx - item.x, dy = ny - item.y;
      dx = Math.max(SNAP - bb.x0, Math.min(W - SNAP - bb.x1, dx));
      dy = Math.max(SNAP - bb.y0, Math.min(H - SNAP - bb.y1, dy));
      Model.move(S.doc, drag.ids, dx, dy);
    } else if (Model.arrow(S.doc, drag.id) || freeAt(nx, ny, drag.id)) {
      item.x = nx; item.y = ny;
    }
    paint();
  }
  function onUp(ev) {
    if (!drag) return;
    var d = drag;
    drag = null;
    if (d.moved) {
      if (snapshot() !== d.before) { S.undo.push(d.before); S.redo = []; onChange(); }
      paint();
      return;
    }
    tap(d.id, world(ev));
  }

  function onKey(ev) {
    var t = ev.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    var k = ev.key, mod = ev.ctrlKey || ev.metaKey;
    if (mod && (k === 'z' || k === 'Z')) { ev.preventDefault(); if (ev.shiftKey) redo(); else undo(); return; }
    if (mod && (k === 'y' || k === 'Y')) { ev.preventDefault(); redo(); return; }
    if (mod) return;
    if ((k === 'Delete' || k === 'Backspace') && S.selected) {
      ev.preventDefault();
      var id = S.selected;
      commit(function (d) { Model.remove(d, id); });
      return;
    }
    if (k === 'Escape') { if (S.selected || S.pending) { S.selected = null; S.pending = null; paint(); } return; }
    var b = S.selected && Model.bond(S.doc, S.selected);
    if (b && /^[123]$/.test(k)) { var o = +k; var bid = b.id; commit(function (d) { Model.bond(d, bid).order = o; }); return; }
    var arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[k] && S.selected && document.activeElement === host) {
      ev.preventDefault();
      var v = arrows[k], sel = S.selected, a = Model.atom(S.doc, sel), r = Model.arrow(S.doc, sel);
      if (a && ev.shiftKey) moveComponent(sel, v[0], v[1]);
      else if (a || r) {
        var it = a || r, nx = clampX(it.x + v[0] * SNAP), ny = clampY(it.y + v[1] * SNAP);
        if (r || freeAt(nx, ny, sel)) commit(function (d) { var x = Model.find(d, sel); x.x = nx; x.y = ny; });
      }
    }
  }

  /* ------------------------------------------------------------- set-up */

  function mount(canvasEl, inspectorEl, statusNode, changed) {
    inspector = inspectorEl;
    statusEl = statusNode;
    onChange = changed || onChange;
    host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    host.setAttribute('class', 'board');
    host.setAttribute('role', 'img');
    host.setAttribute('tabindex', '0');
    canvasEl.appendChild(host);
    host.addEventListener('pointerdown', onDown);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerup', onUp);
    host.addEventListener('pointercancel', function () { drag = null; paint(); });
    document.addEventListener('keydown', onKey);
    paint();
  }

  function setTool(t) { S.tool = t; S.pending = null; paint(); }
  function setElement(e) { S.el = e; paint(); }
  function setOpt(k, v) { S.opts[k] = v; paint(); onChange(); }

  function load(doc, opts) {
    S.doc = doc;
    if (opts) Object.keys(S.opts).forEach(function (k) { if (opts[k] != null) S.opts[k] = opts[k]; });
    S.undo = []; S.redo = []; S.selected = null; S.pending = null;
    paint();
  }

  return {
    mount: mount, state: S, commit: commit, undo: undo, redo: redo, place: place, center: center, clear: clear,
    fill: fill, setTool: setTool, setElement: setElement, setOpt: setOpt, load: load, renderOpts: renderOpts,
    paint: paint, W: W, H: H
  };
})();

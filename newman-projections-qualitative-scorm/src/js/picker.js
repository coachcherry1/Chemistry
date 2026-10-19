/* picker.js — put a tile on a target, three ways.
 *
 * Every drop in the activity (groups onto the Newman template, vocabulary onto
 * the graph) goes through here, so all of them work with a mouse, a touch
 * screen, a Chromebook trackpad and a keyboard:
 *
 *   drag      press a tile, drag it, release over a target
 *   click     click a tile, then click a target
 *   keyboard  Tab to a tile, Enter; Tab to a target, Enter
 *
 * Tiles are `.tile[data-tile]` inside `tray`; targets are `.drop[data-drop]`
 * inside `stage`. Both containers may be re-rendered freely: everything is
 * delegated and looked up at the moment of use.
 */

function Picker(opts) {
  'use strict';
  var tray = opts.tray, stage = opts.stage;
  var selected = null, drag = null, suppressClick = false;

  function tileKey(node) {
    var t = node && node.closest ? node.closest('.tile') : null;
    return t && !t.disabled ? t.getAttribute('data-tile') : null;
  }

  function dropAt(x, y) {
    var n = document.elementFromPoint(x, y);
    var d = n && n.closest ? n.closest('.drop') : null;
    return d && stage.contains(d) ? d.getAttribute('data-drop') : null;
  }

  function highlight(key) {
    var nodes = stage.querySelectorAll('.drop');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle('hover', key != null && nodes[i].getAttribute('data-drop') === key);
    }
  }

  function clear() {
    if (selected == null) return;
    selected = null;
    var nodes = tray.querySelectorAll('.tile.selected');
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('selected');
    stage.classList.remove('picking');
  }

  function select(key) {
    var was = selected === key;
    clear();
    if (was) { if (opts.say) opts.say(''); return; }
    selected = key;
    var nodes = tray.querySelectorAll('.tile');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute('data-tile') === key) nodes[i].classList.add('selected');
    }
    stage.classList.add('picking');
    if (opts.say && opts.prompt) opts.say(opts.prompt(key));
  }

  function onDown(ev) {
    var key = tileKey(ev.target);
    if (key == null) return;
    var node = ev.target.closest('.tile');
    drag = { key: key, from: node, x0: ev.clientX, y0: ev.clientY, ghost: null };
    try { node.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
  }

  function onMove(ev) {
    if (!drag) return;
    if (!drag.ghost) {
      if (Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < 6) return;
      var g = document.createElement('div');
      g.className = 'ghost';
      g.textContent = opts.label(drag.key);
      document.body.appendChild(g);
      drag.ghost = g;
      drag.from.classList.add('dragging');
    }
    drag.ghost.style.left = ev.clientX + 'px';
    drag.ghost.style.top = ev.clientY + 'px';
    highlight(dropAt(ev.clientX, ev.clientY));
  }

  function onUp(ev) {
    if (!drag) return;
    var d = drag;
    drag = null;
    highlight(null);
    if (!d.ghost) return;            /* a tap: the click handler takes it */
    d.ghost.remove();
    d.from.classList.remove('dragging');
    suppressClick = true;
    var target = dropAt(ev.clientX, ev.clientY);
    clear();
    if (target != null) opts.drop(target, d.key);
  }

  function onTrayClick(ev) {
    if (suppressClick) { suppressClick = false; return; }
    var key = tileKey(ev.target);
    if (key != null) select(key);
  }

  function activate(target) {
    var key = target.getAttribute('data-drop');
    if (selected != null) {
      var t = selected;
      clear();
      opts.drop(key, t);
    } else if (opts.empty) {
      opts.empty(key);
    }
  }

  function onStageClick(ev) {
    var d = ev.target.closest && ev.target.closest('.drop');
    if (d && stage.contains(d)) activate(d);
  }

  /* SVG targets do not turn Enter into a click the way buttons do. */
  function onStageKey(ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    var d = ev.target.closest && ev.target.closest('.drop');
    if (d && stage.contains(d) && d.tagName.toLowerCase() !== 'button') {
      ev.preventDefault();
      activate(d);
    }
  }

  function onKey(ev) { if (ev.key === 'Escape') clear(); }

  tray.addEventListener('pointerdown', onDown);
  tray.addEventListener('pointermove', onMove);
  tray.addEventListener('pointerup', onUp);
  tray.addEventListener('pointercancel', onUp);
  tray.addEventListener('click', onTrayClick);
  stage.addEventListener('click', onStageClick);
  stage.addEventListener('keydown', onStageKey);
  document.addEventListener('keydown', onKey);

  return {
    clear: clear,
    selected: function () { return selected; },
    destroy: function () {
      tray.removeEventListener('pointerdown', onDown);
      tray.removeEventListener('pointermove', onMove);
      tray.removeEventListener('pointerup', onUp);
      tray.removeEventListener('pointercancel', onUp);
      tray.removeEventListener('click', onTrayClick);
      stage.removeEventListener('click', onStageClick);
      stage.removeEventListener('keydown', onStageKey);
      document.removeEventListener('keydown', onKey);
    }
  };
}

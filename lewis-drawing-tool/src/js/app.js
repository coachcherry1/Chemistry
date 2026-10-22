/* app.js — the page: the formula starter, the tool and element pickers, the
 * display options, export buttons, and saving.
 *
 * Saving is in this browser only (localStorage): the drawing you are working
 * on is kept automatically, and "My drawings" keeps named copies. Nothing is
 * sent to the LMS.
 */

var App = (function () {
  'use strict';
  var h = UI.h;
  var KEY = 'lewis-draw:';
  var COMMON = ['H', 'C', 'N', 'O', 'F', 'P', 'S', 'Cl', 'Br', 'I', 'B', 'Be', 'Xe', 'Si', 'Na'];

  function $(id) { return document.getElementById(id); }

  function store(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function fetch(k) { try { return JSON.parse(localStorage.getItem(KEY + k)); } catch (e) { return null; } }

  var msgTimer = null;
  function say(text, kind) {
    var m = $('msg');
    m.textContent = text || '';
    m.className = 'msg' + (kind ? ' ' + kind : '');
    clearTimeout(msgTimer);
    if (text && kind !== 'bad') msgTimer = setTimeout(function () { m.textContent = ''; m.className = 'msg'; }, 7000);
  }

  /* ------------------------------------------------------ formula starter */

  function preview() {
    var t = $('formula').value, out = $('readAs');
    if (!t.trim()) { out.textContent = 'Charges: SO4 2-, NH4+, NO3-. Ionic: NaCl, MgCl2. Odd electrons: NO2.'; out.className = 'hint'; return; }
    var r = Generate.read(t);
    out.textContent = r.error ? r.error : 'Reading this as ' + r.text;
    out.className = 'hint' + (r.error ? ' bad' : '');
  }

  function draw(replace) {
    var res = Generate.generate($('formula').value);
    if (res.error) { say(res.error, 'bad'); return; }
    Editor.place(res.doc, replace);
    if (res.brackets && !Editor.state.opts.brackets) setOpt('brackets', true);
    say(res.label + (res.note ? ' — ' + res.note : ''), 'good');
  }

  /* -------------------------------------------------------- pickers */

  function paintTools() {
    var t = Editor.state.tool;
    [].forEach.call(document.querySelectorAll('[data-tool]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-tool') === t ? 'true' : 'false');
    });
    var e = Editor.state.el;
    [].forEach.call(document.querySelectorAll('[data-el]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-el') === e ? 'true' : 'false');
    });
    $('moreEl').value = COMMON.indexOf(e) >= 0 ? '' : e;
  }

  function pickElement(e) {
    Editor.setElement(e);
    if (Editor.state.tool !== 'atom' && Editor.state.tool !== 'bond') Editor.setTool('atom');
    paintTools();
  }

  function buildPickers() {
    $('palette').appendChild(h('div', { class: 'el-grid' }, COMMON.map(function (e) {
      return h('button', { type: 'button', class: 'el-btn el-' + e.toLowerCase(), 'data-el': e, text: e,
        'aria-label': 'Element ' + e, onclick: function () { pickElement(e); } });
    })));
    var more = $('moreEl');
    more.appendChild(h('option', { value: '', text: 'Other…' }));
    PERIODIC.rows.forEach(function (row) {
      row.forEach(function (e) { if (e && COMMON.indexOf(e) < 0) more.appendChild(h('option', { value: e, text: e })); });
    });
    more.addEventListener('change', function () { if (more.value) pickElement(more.value); });
    [].forEach.call(document.querySelectorAll('[data-tool]'), function (b) {
      b.addEventListener('click', function () { Editor.setTool(b.getAttribute('data-tool')); paintTools(); });
    });
    var tpl = $('templates');
    tpl.appendChild(h('option', { value: '', text: 'Common molecules…' }));
    Generate.templates().forEach(function (t) { tpl.appendChild(h('option', { value: t.f, text: t.name + '  ' + t.text })); });
    tpl.addEventListener('change', function () {
      if (!tpl.value) return;
      $('formula').value = tpl.value;
      preview();
      draw(true);
      tpl.value = '';
    });
  }

  /* -------------------------------------------------------- options */

  function setOpt(k, v) { Editor.setOpt(k, v); paintOptions(); }

  function paintOptions() {
    var o = Editor.state.opts;
    $('optLP').checked = o.lonePairs;
    $('optFC').checked = o.formal;
    $('optBr').checked = o.brackets;
    $('optColor').checked = o.color;
    $('optBg').value = o.bg;
    $('optSize').value = String(o.size);
  }

  function bindOptions() {
    [['optLP', 'lonePairs'], ['optFC', 'formal'], ['optBr', 'brackets'], ['optColor', 'color']].forEach(function (p) {
      $(p[0]).addEventListener('change', function () { setOpt(p[1], $(p[0]).checked); });
    });
    $('optBg').addEventListener('change', function () { setOpt('bg', $('optBg').value); });
    $('optSize').addEventListener('change', function () { setOpt('size', +$('optSize').value); });
  }

  /* ------------------------------------------------------- my drawings */

  function library() { return fetch('library') || []; }

  function paintLibrary() {
    var list = $('libList'), items = library();
    list.innerHTML = '';
    if (!items.length) { list.appendChild(h('li', { class: 'hint', text: 'Nothing saved yet.' })); return; }
    items.forEach(function (it, i) {
      list.appendChild(h('li', null, [
        h('span', { class: 'lib-name', text: it.name }),
        h('button', { type: 'button', class: 'mini', text: 'Open', onclick: function () {
          var doc = Model.valid(JSON.parse(JSON.stringify(it.doc)));
          if (!doc) { say('That saved drawing could not be read.', 'bad'); return; }
          Editor.commit(function (d) { d.atoms = doc.atoms; d.bonds = doc.bonds; d.arrows = doc.arrows; d.next = doc.next; });
          say('Opened “' + it.name + '”. (Undo brings back what was there.)', 'good');
        } }),
        h('button', { type: 'button', class: 'mini danger', text: 'Delete', 'aria-label': 'Delete ' + it.name, onclick: function () {
          var all = library();
          all.splice(i, 1);
          store('library', all);
          paintLibrary();
        } })
      ]));
    });
  }

  function saveToLibrary() {
    var doc = Editor.state.doc;
    if (!doc.atoms.length) { say('Nothing to save yet.', 'bad'); return; }
    var name = $('libName').value.trim() || Model.summary(doc).map(function (c) { return c.formula; }).join(' + ');
    var all = library().filter(function (it) { return it.name !== name; });
    all.unshift({ name: name, doc: JSON.parse(JSON.stringify(doc)), t: Date.now() });
    if (!store('library', all.slice(0, 60))) { say('This browser won’t save here (private window?).', 'bad'); return; }
    $('libName').value = '';
    paintLibrary();
    say('Saved “' + name + '” in My drawings (this browser only).', 'good');
  }

  /* ------------------------------------------------------------- start */

  function start() {
    var connected = SCORM.init();
    $('lms').textContent = connected ? 'Opened from the LMS (no score)' : 'Standalone';
    $('lms').className = 'lms ' + (connected ? 'on' : 'off');

    buildPickers();
    bindOptions();
    var saved = fetch('current');
    Editor.mount($('canvas'), $('inspector'), $('status'), function () {
      store('current', { doc: Editor.state.doc, opts: Editor.state.opts });
    });
    if (saved && Model.valid(saved.doc)) Editor.load(saved.doc, saved.opts);
    paintTools();
    paintOptions();
    paintLibrary();
    preview();

    $('formula').addEventListener('input', preview);
    $('formula').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); draw(true); } });
    $('btnDraw').addEventListener('click', function () { draw(true); });
    $('btnAdd').addEventListener('click', function () { draw(false); });
    $('undo').addEventListener('click', Editor.undo);
    $('redo').addEventListener('click', Editor.redo);
    $('fill').addEventListener('click', function () { Editor.fill(); say('Every bonded atom now has its octet (H its duet); a lone atom shows its valence electrons.'); });
    $('center').addEventListener('click', Editor.center);
    $('clear').addEventListener('click', function () { Editor.clear(); say('Cleared. Undo brings it back.'); });
    $('copyBtn').addEventListener('click', function () { Export.copy(say); });
    $('pngBtn').addEventListener('click', function () { Export.downloadPNG(say); });
    $('svgBtn').addEventListener('click', function () { Export.downloadSVG(say); });
    $('libSave').addEventListener('click', saveToLibrary);

    var layer = $('snip');
    function closeSnip() {
      layer.hidden = true;
      layer.innerHTML = '';
      document.documentElement.style.overflow = '';
      $('snipBtn').focus();
    }
    $('snipBtn').addEventListener('click', function () {
      if (!Export.snip(layer)) { say('Draw something first.', 'bad'); return; }
      document.documentElement.style.overflow = 'hidden';
    });
    layer.addEventListener('click', closeSnip);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !layer.hidden) closeSnip(); });
  }

  return { start: start };
})();

document.addEventListener('DOMContentLoaded', App.start);

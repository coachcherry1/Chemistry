/* export.js — getting the picture out.
 *
 *   Snip view     the drawing alone, big, on a plain background: use the
 *                 computer's snipping tool (Windows: Win+Shift+S; Chromebook:
 *                 Ctrl+Shift+Show windows; Mac: Cmd+Shift+4)
 *   Copy image    a PNG on the clipboard, ready to paste into slides or a doc
 *   Download      PNG (at the chosen size) or SVG (sharp at any size)
 *
 * Copying and downloading can be blocked when the page runs inside an LMS
 * frame; then the message says so and Snip view still works.
 */

var Export = (function () {
  'use strict';

  /* the background behind the picture: 'white' → white, 'clear' → none, 'dark' → none (light ink) */
  function background(bg) { return bg === 'white' ? '#ffffff' : null; }

  function options(scale) {
    var S = Editor.state;
    return Object.assign(Editor.renderOpts(), { background: background(S.opts.bg), scale: scale || S.opts.size, pad: 18 });
  }

  function fileName() {
    var parts = Model.summary(Editor.state.doc).map(function (c) {
      return c.formula.replace(/[₀-₉]/g, function (d) { return String('₀₁₂₃₄₅₆₇₈₉'.indexOf(d)); }) +
        (c.charge ? '_' + Math.abs(c.charge) + (c.charge < 0 ? 'minus' : 'plus') : '');
    });
    return (parts.slice(0, 3).join('_') || 'lewis-structure').replace(/[^A-Za-z0-9_-]/g, '');
  }

  function empty() { return !Editor.state.doc.atoms.length && !Editor.state.doc.arrows.length; }

  /* PNG of the drawing, as a Blob */
  function png(scale) {
    var text = Render.markup(Editor.state.doc, options(scale));
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml;charset=utf-8' }));
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { if (b) resolve(b); else reject(new Error('no PNG')); }, 'image/png');
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('could not draw')); };
      img.src = url;
    });
  }

  function save(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  function downloadPNG(say) {
    if (empty()) { say('Nothing to save yet.', 'bad'); return; }
    png().then(function (b) { save(b, fileName() + '.png'); say('Saved ' + fileName() + '.png. (If nothing downloaded, ' +
      'this page is in a frame that blocks downloads — use Snip view.)'); },
      function () { say('Could not make the PNG here — use Snip view.', 'bad'); });
  }

  function downloadSVG(say) {
    if (empty()) { say('Nothing to save yet.', 'bad'); return; }
    var text = Render.markup(Editor.state.doc, options(1));
    save(new Blob([text], { type: 'image/svg+xml;charset=utf-8' }), fileName() + '.svg');
    say('Saved ' + fileName() + '.svg — it stays sharp at any size in PowerPoint, Google Slides or Word.');
  }

  function copy(say) {
    if (empty()) { say('Nothing to copy yet.', 'bad'); return; }
    if (!navigator.clipboard || !window.ClipboardItem) {
      say('This browser can’t copy images — use Download PNG or Snip view.', 'bad');
      return;
    }
    try {
      /* hand the clipboard a promise, so the copy still counts as part of the click */
      navigator.clipboard.write([new window.ClipboardItem({ 'image/png': png() })]).then(
        function () { say('Copied. Paste it into your slides or document (Ctrl+V).', 'good'); },
        function () { say('Copying is blocked here (often inside an LMS) — use Download PNG or Snip view.', 'bad'); });
    } catch (e) {
      say('Copying is blocked here — use Download PNG or Snip view.', 'bad');
    }
  }

  /* the drawing alone, as large as the window allows */
  function snip(layer) {
    if (empty()) return false;
    var S = Editor.state;
    var dark = S.opts.bg === 'dark';
    var node = Render.svg(S.doc, Object.assign(Editor.renderOpts(), { fit: true, pad: 18, editor: null,
      background: dark ? '#0d1b2a' : '#ffffff', scale: 1 }));
    var vb = node.getAttribute('viewBox').split(' ').map(Number);
    var k = Math.min((window.innerWidth * 0.86) / vb[2], (window.innerHeight * 0.78) / vb[3], 4);
    node.setAttribute('width', Math.round(vb[2] * k));
    node.setAttribute('height', Math.round(vb[3] * k));
    layer.innerHTML = '';
    layer.className = 'snip' + (dark ? ' dark' : '');
    layer.appendChild(node);
    layer.appendChild(UI.h('p', { class: 'snip-hint', text: 'Snip the structure (Windows: Win+Shift+S · Chromebook: ' +
      'Ctrl+Shift+Show windows · Mac: Cmd+Shift+4). Press Esc or click anywhere to go back.' }));
    layer.hidden = false;
    return true;
  }

  return { png: png, copy: copy, downloadPNG: downloadPNG, downloadSVG: downloadSVG, snip: snip, fileName: fileName };
})();

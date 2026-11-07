/* ptable.js: the periodic table, docked along the bottom of the window so
 * the chain stays in view while a molar mass is typed. Every mass is
 * rounded to the tenths place, the class's standard. It is not modal:
 * Escape or the close button hides it, and the page leaves room for it
 * underneath so nothing is ever covered for good.
 */
var Ptable = (function () {
  'use strict';
  var h = UI.h;
  var panel = null, opener = null, listeners = [];

  function build() {
    var grid = h('div', { class: 'pt-grid', role: 'table', 'aria-label': 'Periodic table, atomic masses to the tenths place' });
    var at = {};
    Object.keys(ELEMENTS).forEach(function (k) { var e = ELEMENTS[k]; at[e.period + ':' + e.group] = e; });
    for (var p = 1; p <= 6; p++) {
      var row = h('div', { class: 'pt-row', role: 'row' });
      for (var g = 1; g <= 18; g++) {
        var e = at[p + ':' + g];
        row.appendChild(e
          ? h('div', { class: 'pt-el' + (Chem.radioactive(e.sym) ? ' radio' : ''), role: 'cell', title: e.name,
                       'aria-label': e.name + ', ' + e.sym + ', atomic number ' + e.z + ', atomic mass ' + Chem.tableMass(e.sym) }, [
              h('span', { class: 'pt-z', text: String(e.z) }),
              h('b', { class: 'pt-sym', text: e.sym }),
              h('span', { class: 'pt-m', text: Chem.tableMass(e.sym) })
            ])
          : h('div', { class: 'pt-el empty', role: 'cell' }));
      }
      grid.appendChild(row);
    }
    var close = h('button', { type: 'button', class: 'ghostbtn pt-close', text: 'Close', onclick: hide });
    panel = h('section', { class: 'pt-panel', id: 'ptPanel', 'aria-label': 'Periodic table', hidden: true }, [
      h('div', { class: 'pt-head' }, [
        h('b', { text: 'Periodic table' }),
        h('span', { class: 'muted', text: 'Atomic masses rounded to the tenths place. Periods 1 to 6.' }),
        close
      ]),
      h('div', { class: 'pt-scroll' }, [grid])
    ]);
    panel.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { ev.preventDefault(); hide(); } });
    document.body.appendChild(panel);
  }

  function room() {
    document.body.style.paddingBottom = panel && !panel.hidden ? (panel.offsetHeight + 16) + 'px' : '';
  }

  function show(from) {
    if (!panel) build();
    opener = from || document.activeElement;
    panel.hidden = false;
    room();
    listeners.forEach(function (f) { f(true); });
    var c = panel.querySelector('.pt-close');
    if (c) c.focus({ preventScroll: true });
  }
  function hide() {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    room();
    listeners.forEach(function (f) { f(false); });
    if (opener && opener.focus && document.body.contains(opener)) opener.focus({ preventScroll: true });
  }
  function toggle(from) { if (panel && !panel.hidden) hide(); else show(from); }
  function isOpen() { return !!panel && !panel.hidden; }

  window.addEventListener('resize', function () { if (isOpen()) room(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && isOpen()) hide(); });

  return { show: show, hide: hide, toggle: toggle, isOpen: isOpen, onChange: function (f) { listeners.push(f); } };
})();

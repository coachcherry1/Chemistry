/* ref.js: the class reference, drawn from the data in ions.js (the same
 * solubility rules as package 3 and the printed sheet in ../reference-sheet/)
 * and net.js (the strong acids and bases this package uses). It sits beside
 * every problem: Ref.panel(which) returns the side panel with 'table' (the
 * solubility rules) or 'strong' (strong acids and bases) showing, and tabs
 * to switch.
 */
var Ref = (function () {
  'use strict';
  var h = UI.h;
  var SUP = { 1: '', 2: '2', 3: '3' };

  function info(key, isCat) { return (isCat ? Ions.CATIONS[key] : Ions.ANIONS[key]) || Ions.SHEET_IONS[key]; }
  /* 'Cu', 2, '+' -> Cu²⁺ as text with a real superscript */
  function ion(sym, q, sign) {
    return h('span', { class: 'ion' }, [Chem.pretty(sym), h('sup', { text: SUP[q] + sign })]);
  }

  /* the strong acids and bases (how each splits is for the student to work out) */
  function strong() {
    function rowsFor(list) {
      return list.map(function (f) {
        return h('tr', null, [h('td', null, [h('b', { text: Chem.pretty(f) })]), h('td', { class: 'muted', text: Net.name(f) })]);
      });
    }
    return h('div', { class: 'ref-strong' }, [
      h('p', { class: 'ref-note', text: 'These split completely into ions in water, like every dissolved salt. Any other acid or base is not used here.' }),
      h('table', { class: 'sol-table' }, [h('thead', null, [h('tr', null, [h('th', { text: 'Strong acids' }), h('th', { text: '' })])]),
        h('tbody', null, rowsFor(Net.STRONG_ACIDS))]),
      h('table', { class: 'sol-table' }, [h('thead', null, [h('tr', null, [h('th', { text: 'Strong bases' }), h('th', { text: '' })])]),
        h('tbody', null, rowsFor(Net.STRONG_BASES))]),
      h('p', { class: 'ref-note', text: 'H⁺ + OH⁻ always become water, HOH(l).' })
    ]);
  }

  /* a list of positive ions, the five of group 1 written as "group 1" */
  function cations(list) {
    if (!list.length) return ['none'];
    var g1 = Ions.G1.every(function (k) { return list.indexOf(k) >= 0; });
    var rest = g1 ? list.filter(function (k) { return Ions.G1.indexOf(k) < 0; }) : list, kids = g1 ? ['group 1'] : [];
    rest.forEach(function (k) {
      if (kids.length) kids.push(', ');
      kids.push(ion(info(k, true)[0], info(k, true)[1], '+'));
    });
    return kids;
  }
  function rows(list, head, key, all) {
    return h('table', { class: 'sol-table' }, [
      h('thead', null, [h('tr', null, [h('th', { text: head[0] }), h('th', { text: head[1] })])]),
      h('tbody', null, list.filter(function (r) { return all || !r.sheet; }).map(function (r) {
        var a = info(r.an, false);
        return h('tr', null, [
          h('td', null, [h('span', { class: 'sol-name', text: a[2] + ' ' }), ion(a[0], a[1], '−')]),
          h('td', null, cations(r[key]))
        ]);
      }))
    ]);
  }
  function table(all) {
    return h('div', { class: 'ref-table2' }, [
      h('p', { class: 'ref-note' }, [h('b', { text: 'Always soluble: ' }), 'compounds of group 1 (Li⁺, Na⁺, K⁺ ...) and of NH₄⁺.']),
      rows(Ions.TABLE.soluble, ['Soluble (aq)', 'except with'], 'not', all),
      rows(Ions.TABLE.insoluble, ['Insoluble (s)', 'except with'], 'but', all)
    ]);
  }

  function panel(which) {
    var body = h('div', { class: 'ref-body' });
    var tabs = {};
    function show(k) {
      body.innerHTML = '';
      body.appendChild(k === 'strong' ? strong() : table(false));
      Object.keys(tabs).forEach(function (x) { tabs[x].setAttribute('aria-pressed', x === k ? 'true' : 'false'); tabs[x].classList.toggle('selected', x === k); });
    }
    tabs.table = h('button', { type: 'button', class: 'ref-tab', text: 'Solubility rules', onclick: function () { show('table'); } });
    tabs.strong = h('button', { type: 'button', class: 'ref-tab', text: 'Strong acids and bases', onclick: function () { show('strong'); } });
    var box = h('aside', { class: 'panel ref', 'aria-label': 'Reference' }, [h('div', { class: 'ref-tabs', role: 'group', 'aria-label': 'Reference' }, [tabs.table, tabs.strong]), body]);
    show(which || 'table');
    return { el: box, show: show };
  }

  return { ion: ion, strong: strong, table: table, panel: panel, cations: cations };
})();

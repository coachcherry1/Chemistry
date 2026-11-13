/* ref.js: the class handout, drawn from the data in ions.js: the activity
 * series (with the halogens) and the solubility table. It sits beside every
 * problem. Ref.panel(which) returns the side panel with one of the two
 * showing ('series' or 'table') and tabs to switch.
 */
var Ref = (function () {
  'use strict';
  var h = UI.h;
  var SUP = { 1: '', 2: '2', 3: '3' };

  /* 'Cu', 2, '+' -> Cu²⁺ as text with a real superscript */
  function ion(sym, q, sign) {
    return h('span', { class: 'ion' }, [Chem.pretty(sym), h('sup', { text: SUP[q] + sign })]);
  }

  function series() {
    var list = h('ol', { class: 'series' }, Ions.SERIES.map(function (m, i) {
      return h('li', { class: m[0] === 'H' ? 'hyd' : null, title: m[1] }, [
        h('b', { text: m[0] === 'H' ? 'H₂' : m[0] }), h('span', { class: 'series-n', text: ' ' + m[1] }), h('span', { class: 'series-i' }, [ion(m[0], m[2], '+')])
      ]);
    }));
    return h('div', { class: 'ref-series' }, [
      h('p', { class: 'ref-note', text: 'Most active first: read down the left column, then down the right. An element replaces any element AFTER it. Metals before H₂ replace the hydrogen of an acid.' }),
      list,
      h('p', { class: 'ref-hal' }, [h('b', { text: 'Halogens: ' }), 'F₂ > Cl₂ > Br₂ > I₂ (most active first)'])
    ]);
  }

  function ionList(list, sign, table) {
    var kids = [];
    list.forEach(function (k, i) {
      if (i) kids.push(', ');
      kids.push(ion(k, table[k][1], sign));
    });
    return kids;
  }
  function rows(list, head1, head2) {
    return h('table', { class: 'sol-table' }, [
      h('thead', null, [h('tr', null, [h('th', { text: head1 }), h('th', { text: head2 })])]),
      h('tbody', null, list.map(function (r) {
        return h('tr', null, [
          h('td', null, [h('span', { class: 'sol-name', text: Ions.ANIONS[r[0]][2] + ' ' }), ion(r[0], Ions.ANIONS[r[0]][1], '−')]),
          h('td', null, r[1].length ? ionList(r[1], '+', Ions.CATIONS) : ['none'])
        ]);
      }))
    ]);
  }
  function table() {
    return h('div', { class: 'ref-table2' }, [
      h('p', { class: 'ref-note' }, [h('b', { text: 'Always soluble: ' }), 'compounds of '].concat(ionList(Ions.TABLE.always, '+', Ions.CATIONS))),
      rows(Ions.TABLE.soluble, 'Soluble (aq) ...', '... unless with'),
      rows(Ions.TABLE.insoluble, 'Insoluble (s) ...', '... unless with')
    ]);
  }

  function panel(which) {
    var body = h('div', { class: 'ref-body' });
    var tabs = {};
    function show(k) {
      body.innerHTML = '';
      body.appendChild(k === 'series' ? series() : table());
      Object.keys(tabs).forEach(function (x) { tabs[x].setAttribute('aria-pressed', x === k ? 'true' : 'false'); tabs[x].classList.toggle('selected', x === k); });
    }
    tabs.series = h('button', { type: 'button', class: 'ref-tab', text: 'Activity series', onclick: function () { show('series'); } });
    tabs.table = h('button', { type: 'button', class: 'ref-tab', text: 'Solubility table', onclick: function () { show('table'); } });
    var box = h('aside', { class: 'panel ref', 'aria-label': 'Reference' }, [h('div', { class: 'ref-tabs', role: 'group', 'aria-label': 'Reference' }, [tabs.series, tabs.table]), body]);
    show(which || 'series');
    return { el: box, show: show };
  }

  return { ion: ion, series: series, table: table, panel: panel };
})();

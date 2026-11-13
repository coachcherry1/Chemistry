/* ref.js: the class reference, drawn from the data in ions.js: the activity
 * series (with what each metal replaces hydrogen from, and the halogens) and
 * the solubility rules. It sits beside every problem. Ref.panel(which)
 * returns the side panel with one of the two showing ('series' or 'table')
 * and tabs to switch. The printed sheet in ../reference-sheet/ is made from
 * the same data and has a few more rows.
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

  function series() {
    var list = h('ol', { class: 'series' }, Ions.SERIES.map(function (m) {
      return h('li', { class: (m[0] === 'H' ? 'hyd' : 'tier-' + Ions.tier(m[0])), title: m[1] }, [
        h('b', { text: m[0] === 'H' ? 'H₂' : m[0] }), h('span', { class: 'series-n', text: ' ' + m[1] }), h('span', { class: 'series-i' }, [ion(m[0], m[2], '+')])
      ]);
    }));
    return h('div', { class: 'ref-series' }, [
      h('p', { class: 'ref-note', text: 'Most active first: read down the left column, then down the right. An element replaces any element AFTER it.' }),
      list,
      h('ul', { class: 'tier-key' }, Ions.TIERS.map(function (t) {
        var first = t.key === 'water' ? 'Li' : Ions.SERIES[Ions.rank(Ions.TIERS[Ions.TIERS.indexOf(t) - 1].last) + (t.key === 'none' ? 2 : 1)][0];
        return h('li', { class: 'tier-' + t.key }, [h('b', { text: first + ' to ' + t.last + ': ' }), t.label]);
      })),
      h('p', { class: 'ref-hal' }, [h('b', { text: 'Halogens: ' }), 'F₂ > Cl₂ > Br₂ > I₂ (most active first)'])
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
      h('thead', null, [h('tr', null, [h('th', { text: head[0] }), h('th', { text: head[1] }), h('th', { text: 'slightly', title: 'only slightly soluble with these ions' })])]),
      h('tbody', null, list.filter(function (r) { return all || !r.sheet; }).map(function (r) {
        var a = info(r.an, false);
        return h('tr', null, [
          h('td', null, [h('span', { class: 'sol-name', text: a[2] + ' ' }), ion(a[0], a[1], '−')]),
          h('td', null, cations(r[key])),
          h('td', { class: 'sol-slight' }, r.slight.length ? cations(r.slight) : [''])
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
      body.appendChild(k === 'series' ? series() : table(false));
      Object.keys(tabs).forEach(function (x) { tabs[x].setAttribute('aria-pressed', x === k ? 'true' : 'false'); tabs[x].classList.toggle('selected', x === k); });
    }
    tabs.series = h('button', { type: 'button', class: 'ref-tab', text: 'Activity series', onclick: function () { show('series'); } });
    tabs.table = h('button', { type: 'button', class: 'ref-tab', text: 'Solubility rules', onclick: function () { show('table'); } });
    var box = h('aside', { class: 'panel ref', 'aria-label': 'Reference' }, [h('div', { class: 'ref-tabs', role: 'group', 'aria-label': 'Reference' }, [tabs.series, tabs.table]), body]);
    show(which || 'series');
    return { el: box, show: show };
  }

  return { ion: ion, series: series, table: table, panel: panel, cations: cations };
})();

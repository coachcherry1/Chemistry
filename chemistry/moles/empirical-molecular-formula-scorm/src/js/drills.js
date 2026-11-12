/* drills.js: Multiply if not whole, the hurdle the teacher named: reading
 * a decimal as a fraction. Four ungraded steps, the same in all three
 * packages:
 *   frac    Name the fraction (three cards): a quotient, its fraction, the multiplier and
 *           the whole number it gives (2.67 is 2 2/3, x 3, 8)
 *   whole   Whole or not? round it (within 0.1) or multiply
 *   all     Multiply them all: a real compound's ratio, one multiplier for
 *           every row (1 : 1.33 : 1 is x 3); once the multiplier is right the
 *           whole numbers fill in (3 : 4 : 3), the teacher's choice
 * Each gets its state object (saved in suspend_data) and callbacks:
 * cb.save(), cb.complete(msg), cb.say(msg, kind).
 */
var Drills = (function () {
  'use strict';
  var h = UI.h;

  function panel(title, hint, kids) {
    return h('section', { class: 'panel' }, [
      h('div', { class: 'panel-head' }, [h('h3', { text: title }), hint ? h('span', { class: 'hint', text: hint }) : null])
    ].concat(kids || []));
  }
  function tiles(list, chosen, onPick, label, wrong) {
    return h('div', { class: 'tiles', role: 'group', 'aria-label': label }, list.map(function (x) {
      var on = chosen === x.v;
      return h('button', { type: 'button', class: 'tile' + (on ? ' on' : '') + (on && wrong ? ' wrong' : ''), 'aria-pressed': on ? 'true' : 'false',
        text: x.t, onclick: function () { onPick(x.v); } });
    }));
  }

  /* --------------------------------------------------- Name the fraction */

  var FR_TILES = Chem.FRACS.map(function (f) { return { v: f.num + '/' + f.den, t: f.uni }; });
  var K_TILES = [2, 3, 4, 5].map(function (k) { return { v: k, t: '× ' + k }; });

  function fracDrill(host, st, seed, cb) {
    var cards = Gen.fracCards(seed);
    st.i = st.i || 0;
    st.a = st.a || {};
    var finder = Finder.create({ interactive: true, compact: true });
    var box = h('div');
    host.appendChild(h('div', { class: 'grid2 drill' }, [box, panel('Fraction finder', null, [finder.el, Finder.chart()])]));
    var bad = {};
    function paint() {
      box.innerHTML = '';
      if (st.i >= cards.length) {
        box.appendChild(panel('Name the fraction', null, [h('p', { class: 'big-ok', text: 'All ' + cards.length + ' cards done.' }),
          h('p', { class: 'muted', text: 'Read the decimal part as a fraction; its bottom number is the multiplier.' })]));
        return;
      }
      var c = cards[st.i];
      var a = st.a;
      var input = h('input', { type: 'text', inputmode: 'numeric', class: 'blank w-w' + (bad.w ? ' wrong' : ''), 'aria-label': 'whole number', value: a.w || '' });
      input.addEventListener('input', function () { a.w = input.value; bad.w = 0; cb.save(); });
      input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); check(); } });
      var k = a.k ? a.k : '?';
      box.appendChild(panel('Name the fraction', 'card ' + (st.i + 1) + ' of ' + cards.length, [
        h('p', { class: 'bigq', text: c.str }),
        h('p', { class: 'drill-q', text: 'Its decimal part, .' + c.str.split('.')[1] + ', is about which fraction?' }),
        tiles(FR_TILES, a.fr, function (v) { a.fr = v; bad.fr = 0; cb.save(); paint(); }, 'fraction', bad.fr),
        h('p', { class: 'drill-q', text: 'So multiply by:' }),
        tiles(K_TILES, a.k, function (v) { a.k = v; bad.k = 0; cb.save(); paint(); }, 'multiplier', bad.k),
        h('p', { class: 'drill-q' }, [c.str + ' × ' + k + ' = ', input, ' (a whole number)']),
        h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary', text: 'Check', onclick: check }),
          h('button', { type: 'button', class: 'ghostbtn', text: 'Put it on the finder', onclick: function () { finder.place(c.q); } })])
      ]));
    }
    function check() {
      var c = cards[st.i], a = st.a;
      if (!a.fr || !a.k || !String(a.w || '').trim()) { cb.say('Pick the fraction and the multiplier, and type the whole number.', null); return; }
      var want = c.num + '/' + c.den;
      if (a.fr !== want) {
        bad.fr = 1; paint();
        finder.place(c.q);
        cb.say('Not that one: look where ' + c.str + ' sits on the finder. Its decimal part is closest to ' + c.uni + '.', 'bad');
        return;
      }
      if (a.k !== c.den) {
        bad.k = 1; paint();
        cb.say(c.uni + ' is ' + c.num + ' part' + (c.num > 1 ? 's' : '') + ' of ' + c.den + ': multiply by the bottom number, ' + c.den + '.', 'bad');
        return;
      }
      var w = Chem.parseNum(a.w);
      if (w !== c.whole) {
        bad.w = 1; paint();
        cb.say(c.str + ' × ' + c.den + ' = ' + Chem.fmtQ(c.q * c.den) + '. Round it to the nearest whole number.', 'bad');
        return;
      }
      cb.say(c.str + ' is ' + c.w + c.uni + ' = ' + (c.w * c.den + c.num) + '/' + c.den + ', so × ' + c.den + ' gives ' + c.whole + '.', 'good');
      st.i++;
      st.a = {};
      bad = {};
      cb.save();
      finder.clear();
      paint();
      if (st.i >= cards.length) cb.complete('All ' + cards.length + ' fractions named.');
      else { var b = box.querySelector('.tile'); if (b) b.focus({ preventScroll: true }); }
    }
    paint();
    return { done: st.i >= cards.length };
  }

  /* -------------------------------------------------------- Whole or not? */

  function wholeDrill(host, st, seed, cb) {
    var cards = Gen.wholeCards(seed);
    st.sel = st.sel || {};
    var grid = h('div', { class: 'wcards' });
    var marks = {};
    function paint() {
      grid.innerHTML = '';
      cards.forEach(function (c, i) {
        var sel = st.sel[i];
        var opts = [{ v: 'round', t: 'Round it' }, { v: 'mult', t: 'Multiply' }];
        grid.appendChild(h('div', { class: 'wcard' + (marks[i] ? ' ' + marks[i] : '') }, [
          h('p', { class: 'bigq small', text: c.str }),
          tiles(opts, sel, function (v) { st.sel[i] = v; delete marks[i]; cb.save(); paint(); }, c.str + ': round or multiply', marks[i] === 'wrong'),
          st.done || marks[i] === 'ok' ? h('p', { class: 'muted wnote', text: c.round ? 'round to ' + c.n : c.uni + ': × ' + c.mult }) : null
        ]));
      });
    }
    function check() {
      if (cards.some(function (c, i) { return !st.sel[i]; })) { cb.say('Choose for every card first.', null); return; }
      var wrong = [];
      cards.forEach(function (c, i) {
        var ok = (st.sel[i] === 'round') === c.round;
        marks[i] = ok ? 'ok' : 'wrong';
        if (!ok) wrong.push(c.round ? c.str + ' is within 0.1 of ' + c.n + ': round it.' :
          c.str + ' is ' + Chem.fmtDec(Math.abs(c.q - Math.round(c.q)), 2) + ' from a whole number, more than 0.1: it is about ' + Math.floor(c.q) + c.uni + ', so multiply.');
      });
      paint();
      if (wrong.length) { cb.say(wrong.slice(0, 2).join(' '), 'bad'); return; }
      st.done = 1;
      cb.save();
      paint();
      cb.complete('All right. Within 0.1 of a whole number: round. Otherwise: multiply.');
    }
    host.appendChild(h('div', { class: 'grid2 drill' }, [
      panel('Whole or not?', 'within 0.1 of a whole number: round', [grid,
        h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary', text: 'Check', onclick: check })])]),
      panel('The rule', null, [h('ul', { class: 'keylist' }, [
        h('li', { text: 'Within 0.1 of a whole number (1.92 to 2.08 for 2): that is experimental scatter, round it.' }),
        h('li', { text: 'Anything else is a fraction: 1.50, 1.33, 1.25 and 1.20 are 1½, 1⅓, 1¼ and 1⅕. Never round those: multiply.' }),
        h('li', { text: 'Rounding 1.33 down to 1 or 1.5 up to 2 gives the wrong formula.' })
      ]), Finder.chart()])
    ]));
    paint();
    return { done: !!st.done };
  }

  /* ---------------------------------------------------- Multiply them all */

  function allDrill(host, st, seed, cb) {
    var list = Gen.allRatios(seed);
    st.i = st.i || 0;
    st.a = st.a || {};
    var box = h('div');
    var finder = Finder.create({ interactive: true, compact: true });
    host.appendChild(h('div', { class: 'grid2 drill' }, [box, panel('Fraction finder', null, [finder.el, Finder.chart()])]));
    var marks = {};
    function paint() {
      box.innerHTML = '';
      if (st.i >= list.length) {
        box.appendChild(panel('Multiply them all', null, [h('p', { class: 'big-ok', text: 'All ' + list.length + ' formulas found.' }),
          h('p', { class: 'muted', text: 'One multiplier for every row, even the rows that were already whole.' })]));
        return;
      }
      var r = list[st.i], a = st.a, shown = !!st.shown;
      var inp = function (key, label, cls) {
        var x = h('input', { type: 'text', inputmode: 'numeric', class: 'blank ' + cls + (marks[key] ? ' ' + marks[key] : ''), 'aria-label': label, value: a[key] || '' });
        x.addEventListener('input', function () { a[key] = x.value; delete marks[key]; x.classList.remove('ok', 'wrong'); cb.save(); });
        x.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); check(); } });
        return x;
      };
      var rows = r.rows.map(function (row, j) {
        return h('tr', null, [h('th', { scope: 'row', class: 'sym', text: row.sym }),
          h('td', null, [h('button', { type: 'button', class: 'qbtn', text: row.str, 'aria-label': row.str + ': put it on the fraction finder',
            onclick: function () { finder.place(row.q); } })]),
          h('td', { class: 'muted', text: '× ' + (shown ? r.mult : '?') + ' →' }),
          h('td', { class: 'whole-out', text: shown ? String(row.sub) : '…' })]);
      });
      box.appendChild(panel('Multiply them all', 'ratio ' + (st.i + 1) + ' of ' + list.length, [
        h('p', { class: 'drill-q', text: 'After Divide by small, a compound gives ' + r.rows.map(function (x) { return x.sym + ' ' + x.str; }).join(' : ') + '.' }),
        h('p', { class: 'drill-q' }, ['Multiply every row by ', inp('k', 'multiply every row by', 'w-k'), ' (1 if they are all whole already)']),
        h('table', { class: 'ratio' }, rows),
        h('div', { class: 'btnrow' }, shown ? [h('button', { type: 'button', class: 'primary', text: st.i + 1 < list.length ? 'Next ratio' : 'Done',
          onclick: nextRatio })] : [h('button', { type: 'button', class: 'primary', text: 'Check', onclick: check })])
      ]));
    }
    function nextRatio() {
      st.i++;
      st.a = {};
      st.shown = 0;
      marks = {};
      cb.save();
      finder.clear();
      paint();
      if (st.i >= list.length) cb.complete('All ' + list.length + ' done. Every row gets the same multiplier.');
      else { var f = box.querySelector('input'); if (f) f.focus({ preventScroll: true }); }
    }
    function check() {
      var r = list[st.i], a = st.a;
      var qs = r.rows.map(function (x) { return x.q; });
      var jk = Chem.judgeMultiplier(a.k, qs, r.mult);
      if (jk.empty) { cb.say('Type the number to multiply by first.', null); return; }
      if (!jk.ok) { marks.k = 'wrong'; paint(); cb.say(jk.msg, 'bad'); return; }
      marks.k = 'ok';
      st.shown = 1;
      cb.save();
      paint();
      cb.say('Right: × ' + r.mult + ' gives ' + r.efDisp + (r.f !== r.ef ? ' (the empirical formula of ' + r.name + ', ' + Chem.subs(r.f) + ')' : ', ' + r.name) + '.', 'good');
      var nb = box.querySelector('.btnrow .primary'); if (nb) nb.focus({ preventScroll: true });
    }
    paint();
    return { done: st.i >= list.length };
  }

  return { fracDrill: fracDrill, wholeDrill: wholeDrill, allDrill: allDrill };
})();

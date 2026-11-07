/* lens.js: the magnifier. A sample of 36 magnesium atoms, drawn as a 6 by 6 grid, and what happens to each one.
 *   start      all 36 are magnesium metal
 *   burned     30 joined oxygen (MgO); 6 joined nitrogen from the air (Mg3N2: two clusters of 3 Mg)
 *   water      each drop turns one nitride magnesium into Mg(OH)2 and frees NH3 gas (3 drops per cluster)
 *   dried      heat drives the water off: every Mg is in MgO
 * The numbers come from Lab (NITRIDE_FRACTION, DROPS_TO_FINISH), so the magnifier and the balance agree.
 */

var Lens = (function () {
  'use strict';

  var N = 36;
  function nitrideCount() { return Math.round(Lab.NITRIDE_FRACTION * N); }       /* 6 */

  /* the kind of atom i (0..35) in a phase; the last six are the nitride ones */
  function kind(i, phase, drops) {
    var firstN = N - nitrideCount();
    if (phase === 'start') return 'mg';
    if (i < firstN) return 'mgo';
    if (phase === 'dried') return (i - firstN) < drops ? 'mgo' : 'nitride';
    if (phase === 'burned') return 'nitride';
    return (i - firstN) < drops ? 'oh' : 'nitride';
  }

  function atom(i, k) {
    var col = i % 6, row = Math.floor(i / 6), x = 22 + col * 40, y = 20 + row * 30;
    var s = '<g class="lens-atom lk-' + k + '" transform="translate(' + x + ' ' + y + ')"><circle r="10" class="lens-mg"/>';
    if (k === 'mgo') s += '<circle cx="12" r="6" class="lens-o"/>';
    if (k === 'nitride') s += '<circle cx="12" r="6" class="lens-n"/>';
    if (k === 'oh') s += '<circle cx="12" cy="-3" r="5" class="lens-o"/><circle cx="12" cy="6" r="5" class="lens-o"/>';
    return s + '</g>';
  }

  var KEY = '<g class="lens-key" transform="translate(272 14)">' +
    '<g><circle cx="0" cy="0" r="8" class="lens-mg"/><text x="16" y="5">Mg</text></g>' +
    '<g transform="translate(0 28)"><circle cx="0" r="6" class="lens-o"/><text x="16" y="5">O</text></g>' +
    '<g transform="translate(0 56)"><circle cx="0" r="6" class="lens-n"/><text x="16" y="5">N</text></g></g>';

  var CAPTION = {
    start: 'A sample of 36 magnesium atoms (Mg).',
    burning: 'The magnesium is joining oxygen from the air.',
    burned: '30 Mg joined oxygen (MgO). 6 Mg joined nitrogen (Mg₃N₂, two clusters of 3).',
    water: 'Each drop of water turns one Mg of the nitride into Mg(OH)₂ and frees NH₃ gas.',
    dried: 'Heat drives off the water: Mg(OH)₂ becomes MgO. All 36 Mg are in MgO.'
  };

  function create() {
    var holder = document.createElement('figure');
    holder.className = 'lens';
    var cap = document.createElement('figcaption');
    cap.className = 'lens-cap';
    var svgHolder = document.createElement('div');
    svgHolder.className = 'lens-svg-wrap';
    holder.appendChild(svgHolder); holder.appendChild(cap);

    function set(phase, drops, note) {
      var firstN = N - nitrideCount(), body = '', nLeft = 0, i;
      for (i = 0; i < N; i++) { var k = kind(i, phase === 'burning' ? 'start' : phase, drops || 0); if (k === 'nitride') nLeft++; body += atom(i, k); }
      svgHolder.innerHTML = '<svg viewBox="0 0 340 190" class="lens-svg" role="img" aria-label="Magnifier: ' + (CAPTION[phase] || '') + '">' +
        '<rect x="2" y="2" width="336" height="186" rx="14" class="lens-bg"/>' + body + KEY + '</svg>';
      var text = note || CAPTION[phase] || '';
      if (phase === 'water' && !note) text += ' (' + nLeft + ' of 6 still nitride.)';
      if (phase === 'dried' && !note && nLeft > 0) text = 'Heat drives off the water. ' + nLeft + ' Mg are still Mg₃N₂, which weighs less than MgO.';
      cap.textContent = text;
    }
    set('start', 0);
    return { node: holder, set: set, nitrideLeft: function (phase, drops) { var n = 0; for (var i = 0; i < N; i++) if (kind(i, phase, drops) === 'nitride') n++; return n; } };
  }

  return { create: create, CAPTION: CAPTION };
})();

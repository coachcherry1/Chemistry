/* ptable.js — a periodic table laid out like the College Board AP Chemistry
 * table: atomic number, symbol and atomic mass, group numbers across the top,
 * La and Ac in Group 3 with the lanthanoid and actinoid rows below.
 *
 * Deliberately NO element names and NO ion charges: students use it to locate
 * an element (which group, which block) without it handing them what they
 * were asked to memorize. The official PDF is linked, not bundled.
 */

var PTable = (function () {
  'use strict';

  var OFFICIAL = 'https://apcentral.collegeboard.org/media/pdf/chemistry-periodic-table-2020.pdf';

  /* [symbol, atomic mass] by atomic number. Masses in parentheses are the
     mass number of the longest-lived isotope. */
  var E = [
    ['H', '1.008'], ['He', '4.00'], ['Li', '6.94'], ['Be', '9.01'], ['B', '10.81'],
    ['C', '12.01'], ['N', '14.01'], ['O', '16.00'], ['F', '19.00'], ['Ne', '20.18'],
    ['Na', '22.99'], ['Mg', '24.30'], ['Al', '26.98'], ['Si', '28.09'], ['P', '30.97'],
    ['S', '32.06'], ['Cl', '35.45'], ['Ar', '39.95'], ['K', '39.10'], ['Ca', '40.08'],
    ['Sc', '44.96'], ['Ti', '47.87'], ['V', '50.94'], ['Cr', '52.00'], ['Mn', '54.94'],
    ['Fe', '55.85'], ['Co', '58.93'], ['Ni', '58.69'], ['Cu', '63.55'], ['Zn', '65.38'],
    ['Ga', '69.72'], ['Ge', '72.63'], ['As', '74.92'], ['Se', '78.97'], ['Br', '79.90'],
    ['Kr', '83.80'], ['Rb', '85.47'], ['Sr', '87.62'], ['Y', '88.91'], ['Zr', '91.22'],
    ['Nb', '92.91'], ['Mo', '95.95'], ['Tc', '(97)'], ['Ru', '101.07'], ['Rh', '102.91'],
    ['Pd', '106.42'], ['Ag', '107.87'], ['Cd', '112.41'], ['In', '114.82'], ['Sn', '118.71'],
    ['Sb', '121.76'], ['Te', '127.60'], ['I', '126.90'], ['Xe', '131.29'], ['Cs', '132.91'],
    ['Ba', '137.33'], ['La', '138.91'], ['Ce', '140.12'], ['Pr', '140.91'], ['Nd', '144.24'],
    ['Pm', '(145)'], ['Sm', '150.36'], ['Eu', '151.96'], ['Gd', '157.25'], ['Tb', '158.93'],
    ['Dy', '162.50'], ['Ho', '164.93'], ['Er', '167.26'], ['Tm', '168.93'], ['Yb', '173.05'],
    ['Lu', '174.97'], ['Hf', '178.49'], ['Ta', '180.95'], ['W', '183.84'], ['Re', '186.21'],
    ['Os', '190.23'], ['Ir', '192.22'], ['Pt', '195.08'], ['Au', '196.97'], ['Hg', '200.59'],
    ['Tl', '204.38'], ['Pb', '207.2'], ['Bi', '208.98'], ['Po', '(209)'], ['At', '(210)'],
    ['Rn', '(222)'], ['Fr', '(223)'], ['Ra', '(226)'], ['Ac', '(227)'], ['Th', '232.04'],
    ['Pa', '231.04'], ['U', '238.03'], ['Np', '(237)'], ['Pu', '(244)'], ['Am', '(243)'],
    ['Cm', '(247)'], ['Bk', '(247)'], ['Cf', '(251)'], ['Es', '(252)'], ['Fm', '(257)'],
    ['Md', '(258)'], ['No', '(259)'], ['Lr', '(266)'], ['Rf', '(267)'], ['Db', '(268)'],
    ['Sg', '(269)'], ['Bh', '(270)'], ['Hs', '(269)'], ['Mt', '(278)'], ['Ds', '(281)'],
    ['Rg', '(282)'], ['Cn', '(285)'], ['Nh', '(286)'], ['Fl', '(289)'], ['Mc', '(290)'],
    ['Lv', '(293)'], ['Ts', '(294)'], ['Og', '(294)']
  ];

  /* Grid position. Row 1 is the group-number header; periods 1-7 are rows
     2-8; row 9 is a spacer; the lanthanoids and actinoids are rows 10-11. */
  function position(z) {
    if (z === 1) return [2, 1];
    if (z === 2) return [2, 18];
    if (z <= 4) return [3, z - 2];
    if (z <= 10) return [3, z + 8];
    if (z <= 12) return [4, z - 10];
    if (z <= 18) return [4, z];
    if (z <= 36) return [5, z - 18];
    if (z <= 54) return [6, z - 36];
    if (z <= 56) return [7, z - 54];
    if (z === 57) return [7, 3];
    if (z <= 71) return [10, z - 54];
    if (z <= 86) return [7, z - 68];
    if (z <= 88) return [8, z - 86];
    if (z === 89) return [8, 3];
    if (z <= 103) return [11, z - 86];
    return [8, z - 100];
  }

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function place(node, row, col, span) {
    node.style.gridRow = String(row);
    node.style.gridColumn = span ? col + ' / span ' + span : String(col);
  }

  function render(container) {
    container.innerHTML = '';
    var wrap = make('div', 'pt-scroll');
    var grid = make('div', 'pt-grid');
    grid.setAttribute('role', 'img');
    grid.setAttribute('aria-label', 'Periodic table of the elements');

    for (var g = 1; g <= 18; g++) {
      var h = make('span', 'pt-group', String(g));
      place(h, 1, g);
      grid.appendChild(h);
    }

    E.forEach(function (e, i) {
      var z = i + 1, pos = position(z);
      var cell = make('div', 'pt-cell');
      cell.dataset.sym = e[0];
      cell.title = e[0] + ' — atomic number ' + z + ', atomic mass ' + e[1];
      cell.appendChild(make('span', 'pt-z', String(z) + (z === 57 ? '*' : z === 89 ? '†' : '')));
      cell.appendChild(make('span', 'pt-sym', e[0]));
      cell.appendChild(make('span', 'pt-m', e[1]));
      place(cell, pos[0], pos[1]);
      grid.appendChild(cell);
    });

    var lan = make('span', 'pt-series', '*Lanthanoid Series');
    place(lan, 10, 1, 3);
    grid.appendChild(lan);
    var act = make('span', 'pt-series', '†Actinoid Series');
    place(act, 11, 1, 3);
    grid.appendChild(act);

    wrap.appendChild(grid);
    container.appendChild(wrap);
  }

  function highlight(container, sym) {
    var cells = container.querySelectorAll('.pt-cell');
    for (var i = 0; i < cells.length; i++) {
      cells[i].classList.toggle('hl', !!sym && cells[i].dataset.sym === sym);
    }
  }

  return { OFFICIAL: OFFICIAL, render: render, highlight: highlight };
})();

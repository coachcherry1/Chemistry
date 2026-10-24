/* draw.js: the bar graph, the energy-level diagram, the data table and the
 * small periodic table. Browser only; everything returns a DOM node.
 *
 * Colour is never the only signal: every bar carries its value as text, a
 * level that has been emptied is drawn dashed AND labelled "empty", and the
 * bars before and after the jump are bracketed with words.
 */

var Draw = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  function svg(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* 1, 2, 2.5 or 5 times a power of ten, just above v. */
  function niceMax(v) {
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var steps = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < steps.length; i++) if (steps[i] * p >= v * 1.08) return steps[i] * p;
    return 10 * p;
  }

  /* Gridlines on round numbers: 2 splits into quarters, 1, 2.5 and 5 into fifths. */
  function ticksFor(max) {
    var m = max / Math.pow(10, Math.floor(Math.log10(max)));
    var n = m === 2 ? 4 : 5;
    var out = [];
    for (var i = 0; i <= n; i++) out.push(max * i / n);
    return out;
  }

  /* opts
       shown    how many bars are revealed (default all); the rest draw as
                dashed boxes with a question mark
       levels   occupied level each electron came from, labelled under the
                revealed bars ("level 3")
       jumpAt   draw the jump between bar jumpAt and jumpAt + 1, and bracket
                the bars on each side
       outerLevel, innerLevel  the level numbers for the brackets
       label    accessible description */
  function bars(values, opts) {
    opts = opts || {};
    var n = values.length;
    var shown = opts.shown == null ? n : opts.shown;
    var slot = 78, L = 76, R = 12, T = 30;
    var B = 34 + (opts.levels ? 16 : 0) + (opts.jumpAt ? 26 : 0);
    var W = L + R + slot * n, H = 250 + (B - 34);
    var plotH = H - T - B;

    var visible = values.slice(0, Math.max(shown, 1));
    var max = niceMax(Math.max.apply(null, visible));
    function y(v) { return T + plotH - (v / max) * plotH; }

    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'bars', role: 'img' });
    root.setAttribute('aria-label', opts.label || 'Bar graph of ionization energies');
    root.style.maxWidth = Math.round(W * 1.3) + 'px';

    ticksFor(max).forEach(function (t) {
      root.appendChild(svg('line', { x1: L, x2: W - R, y1: y(t), y2: y(t), class: 'grid' }));
      root.appendChild(svg('text', { x: L - 8, y: y(t) + 4, class: 'tick', 'text-anchor': 'end' }, String(t)));
    });
    root.appendChild(svg('text', {
      x: 14, y: T + plotH / 2, class: 'axis-title', 'text-anchor': 'middle',
      transform: 'rotate(-90 14 ' + (T + plotH / 2) + ')'
    }, 'kJ/mol'));

    var baseY = T + plotH;
    values.forEach(function (v, i) {
      var x = L + slot * i + slot * 0.18, w = slot * 0.64, cx = x + w / 2;
      if (i < shown) {
        var top = y(v), h = Math.max(baseY - top, 2);
        var cls = 'bar' + (opts.jumpAt && i >= opts.jumpAt ? ' inner' : '');
        root.appendChild(svg('rect', { x: x, y: baseY - h, width: w, height: h, rx: 2, class: cls }));
        root.appendChild(svg('text', { x: cx, y: baseY - h - 6, class: 'val', 'text-anchor': 'middle' }, String(v)));
        if (opts.levels && opts.levels[i]) {
          root.appendChild(svg('text', { x: cx, y: baseY + 32, class: 'lvl', 'text-anchor': 'middle' },
                               'level ' + opts.levels[i]));
        }
      } else {
        root.appendChild(svg('rect', { x: x, y: baseY - 34, width: w, height: 34, rx: 2, class: 'bar-hidden' }));
        root.appendChild(svg('text', { x: cx, y: baseY - 12, class: 'q', 'text-anchor': 'middle' }, '?'));
      }
      root.appendChild(svg('text', { x: cx, y: baseY + 17, class: 'xl', 'text-anchor': 'middle' }, Atom.ordinal(i + 1)));
    });
    root.appendChild(svg('line', { x1: L, x2: W - R, y1: baseY, y2: baseY, class: 'axis' }));

    if (opts.jumpAt) {
      var gx = L + slot * opts.jumpAt;
      root.appendChild(svg('line', { x1: gx, x2: gx, y1: T - 6, y2: baseY, class: 'jump-line' }));
      root.appendChild(svg('text', { x: gx, y: T - 12, class: 'jump-text', 'text-anchor': 'middle' },
        'huge jump, ' + Atom.times(values[opts.jumpAt - 1], values[opts.jumpAt])));
      var by = H - 18;
      bracket(root, L + 6, gx - 6, by, W - R,
              ['outer level' + (opts.outerLevel ? ' (level ' + opts.outerLevel + ')' : ''),
               opts.outerLevel ? 'level ' + opts.outerLevel : 'outer level']);
      if (opts.jumpAt < n) {
        bracket(root, gx + 6, W - R - 6, by, W - R,
                ['level underneath' + (opts.innerLevel ? ' (level ' + opts.innerLevel + ')' : ''),
                 opts.innerLevel ? 'level ' + opts.innerLevel : 'underneath']);
      }
    }
    return root;
  }

  /* A bracket under a run of bars. Takes the longer label when it fits under
     the bracket, and never lets the text run past the edge of the graph. */
  function bracket(root, x1, x2, yy, edge, labels) {
    var span = x2 - x1, charW = 6.6;
    var text = labels[0].length * charW <= span + 40 ? labels[0] : labels[1];
    var half = text.length * charW / 2;
    var cx = Math.min(Math.max((x1 + x2) / 2, half + 4), edge - half);
    root.appendChild(svg('path', { d: 'M' + x1 + ' ' + (yy - 6) + ' V' + yy + ' H' + x2 + ' V' + (yy - 6), class: 'brace' }));
    root.appendChild(svg('text', { x: cx, y: yy + 14, class: 'brace-text', 'text-anchor': 'middle' }, text));
  }

  /* The packet's table: one row per ionization energy. After the jump is
     found the row past it is marked, and when the item is finished each row
     says which occupied level the electron came from. */
  function table(values, opts) {
    opts = opts || {};
    var t = make('table', 'ie-table');
    var cap = make('caption', 'sr-only', opts.label || 'Ionization energies');
    t.appendChild(cap);
    var head = make('tr');
    head.appendChild(make('th', null, 'Ionization'));
    head.appendChild(make('th', null, 'kJ/mol'));
    if (opts.levels) head.appendChild(make('th', null, 'Comes from'));
    head.querySelectorAll('th').forEach(function (th) { th.scope = 'col'; });
    var thead = make('thead');
    thead.appendChild(head);
    t.appendChild(thead);
    var body = make('tbody');
    values.forEach(function (v, i) {
      var tr = make('tr', opts.jumpAt && i === opts.jumpAt ? 'jump-row' : null);
      var th = make('th', null, Atom.ordinal(i + 1));
      th.scope = 'row';
      tr.appendChild(th);
      var td = make('td', 'num', String(v));
      if (opts.jumpAt && i === opts.jumpAt) {
        td.appendChild(make('span', 'jump-tag', 'huge jump, ' + Atom.times(values[i - 1], v)));
      }
      tr.appendChild(td);
      if (opts.levels) tr.appendChild(make('td', null, 'level ' + opts.levels[i]));
      body.appendChild(tr);
    });
    t.appendChild(body);
    return t;
  }

  /* Concentric occupied levels around the nucleus, electrons as dots. A level
     the ion has emptied stays on the picture, dashed and labelled empty. */
  function shells(sym, charge) {
    var counts = Atom.shells(sym, charge);
    var z = DATA.z(sym);
    var size = 200, c = size / 2;
    var radii = counts.length === 4 ? [30, 50, 70, 90] : counts.length === 3 ? [34, 58, 84] : [40, 72];
    var occ = Atom.occupied(sym, charge);

    var root = svg('svg', { viewBox: '0 0 ' + size + ' ' + size, class: 'shells', role: 'img' });
    root.setAttribute('aria-label', Atom.ion(sym, charge) + ': ' + z + ' protons, ' + (z - charge) +
      ' electrons, ' + occ + ' occupied energy level' + (occ === 1 ? '' : 's') +
      (occ < counts.length ? '. Level ' + counts.length + ' is empty.' : '.'));

    counts.forEach(function (count, i) {
      var r = radii[i];
      root.appendChild(svg('circle', { cx: c, cy: c, r: r, class: count ? 'ring' : 'ring empty' }));
      for (var k = 0; k < count; k++) {
        var a = -Math.PI / 2 + (2 * Math.PI * k) / count + (i % 2 ? Math.PI / count : 0);
        root.appendChild(svg('circle', { cx: c + r * Math.cos(a), cy: c + r * Math.sin(a), r: 5, class: 'e' }));
      }
    });
    root.appendChild(svg('circle', { cx: c, cy: c, r: 17, class: 'nucleus' }));
    root.appendChild(svg('text', { x: c, y: c + 5, class: 'nucleus-text', 'text-anchor': 'middle' }, z + '+'));
    return root;
  }

  /* Level-by-level counts beside the diagram, in words. */
  function shellLegend(sym, charge) {
    var counts = Atom.shells(sym, charge);
    var ul = make('ul', 'legend');
    for (var i = counts.length - 1; i >= 0; i--) {
      var li = make('li', counts[i] ? null : 'empty');
      li.textContent = 'Level ' + (i + 1) + ': ' + (counts[i] ? counts[i] + ' electron' + (counts[i] === 1 ? '' : 's') : 'empty');
      ul.appendChild(li);
    }
    return ul;
  }

  /* Rows 1 to 4 of the periodic table, elements 1 to 20: the same set as
     the packet's data. Symbols and atomic numbers only, no names. Rows 1 to
     4 hold no transition metals, so groups 3 to 12 collapse to a thin gap and
     the cells stay big enough to tap. With `pick` set, every element is a
     button. */
  function column(grp) { return grp <= 2 ? grp + 1 : grp - 8; }

  function ptable(opts) {
    opts = opts || {};
    var outer = make('div', 'mini-pt-wrap');
    outer.appendChild(make('p', 'mini-pt-cap', 'Group numbers across the top, rows down the side.'));
    var wrap = make('div', 'mini-pt');
    wrap.setAttribute('role', opts.pick ? 'group' : 'img');
    wrap.setAttribute('aria-label', 'Periodic table, rows 1 to 4');
    [1, 2, 13, 14, 15, 16, 17, 18].forEach(function (g) {
      var h = make('span', 'mpt-group', String(g));
      h.style.gridRow = '1';
      h.style.gridColumn = String(column(g));
      wrap.appendChild(h);
    });
    var gap = make('span', 'mpt-gap', '3 to 12');
    gap.style.gridRow = '1 / span 5';
    gap.style.gridColumn = '4';
    wrap.appendChild(gap);
    for (var r = 1; r <= 4; r++) {
      var rl = make('span', 'mpt-row', String(r));
      rl.style.gridRow = String(r + 1);
      rl.style.gridColumn = '1';
      wrap.appendChild(rl);
    }
    DATA.SYMBOLS.forEach(function (sym, i) {
      var z = i + 1, row = Atom.row(sym), grp = Atom.group(sym);
      var cell = make(opts.pick ? 'button' : 'div', 'mpt-cell');
      if (opts.pick) {
        cell.type = 'button';
        cell.dataset.act = 'pick';
        cell.dataset.sym = sym;
        cell.dataset.fk = 'pick:' + sym;
        cell.setAttribute('aria-label', sym + ', atomic number ' + z + ', group ' + grp + ', row ' + row);
        if (opts.tried && opts.tried[sym]) { cell.classList.add('wrong'); cell.disabled = true; }
      }
      if (opts.highlight === sym) cell.classList.add('hl');
      cell.appendChild(make('span', 'mpt-z', String(z)));
      cell.appendChild(make('span', 'mpt-sym', sym));
      cell.style.gridRow = String(row + 1);
      cell.style.gridColumn = String(column(grp));
      wrap.appendChild(cell);
    });
    outer.appendChild(wrap);
    return outer;
  }

  return { bars: bars, table: table, shells: shells, shellLegend: shellLegend, ptable: ptable };
})();

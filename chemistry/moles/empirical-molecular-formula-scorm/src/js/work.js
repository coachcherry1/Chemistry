/* work.js: one problem, worked in the teacher's four steps.
 *
 * The problem sits above a table: one row per element (or the anhydrous salt
 * and the water, or C from CO2 and H from H2O), one column per step. A
 * strip names the steps in the teacher's words and lights the one being
 * worked. Each step is a column of boxes with its own Check: the next column
 * opens only when this one is right, and every box is judged against the
 * student's own earlier boxes (Chem.judge*), so a slip is named once.
 *
 *   1 Percents to grams      say what the problem gives, then the grams
 *   2 Grams to moles         a dimensional analysis setup: g x (1 mol over
 *                            the molar mass, a blank) = mol; combustion adds
 *                            the mole ratio (a blank on top: 1 C per CO2, 2 H
 *                            per H2O)
 *   3 Divide by small        tap the smallest moles, type each quotient
 *   4 Multiply if not whole  one multiplier for every row, the whole numbers
 *   5 Molecular formula      the empirical formula mass, n, the subscripts
 *     or Name the hydrate    the Greek prefix for the waters
 *
 * Grading (the teacher's choice): the first Check of each step counts. A
 * Check with an empty box, or with the right number rounded too far (moles
 * to fewer than 3 significant figures, a quotient to fewer than 2 decimals),
 * is not an answer: the student is told and checks again. Hints are free;
 * Show me (after two misses in a step) fills the step in.
 */
var Work = (function () {
  'use strict';
  var h = UI.h;

  var STEP_NAMES = {
    grams: 'Percents to grams', moles: 'Grams to moles', divide: 'Divide by small', multiply: 'Multiply if not whole',
    molecular: 'Molecular formula', name: 'Name the hydrate'
  };
  var SHOW_AFTER = 2;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sub(f) { return Chem.subs(f); }

  /* The worked solution, typeset (Gen.solution writes it as LaTeX). */
  function solutionHTML(p) {
    return '<div class="solution">' + Gen.solution(p).map(function (s) {
      return '<div class="sol-step"><b>Step ' + s.step + ': ' + esc(s.title) + '</b>' +
        s.notes.map(function (n) { return '<p class="note">' + esc(n) + '</p>'; }).join('') +
        s.lines.map(function (l) { return '<div class="eq">' + Tex.toMathML(l, true) + '</div>'; }).join('') + '</div>';
    }).join('') + '</div>';
  }

  function rowName(p, r) {
    if (p.mode === 'hydrate') return r.key === 'salt' ? 'anhydrous salt' : 'water';
    if (p.mode === 'combustion') return 'from ' + sub(r.molecule);
    return Chem.el(r.atom).name;
  }
  /* what a row counts, for units: mol C, mol CuSO4 */
  function rowUnit(r) { return r.per ? r.atom : r.mmF; }

  function create(host, p, work, opts) {
    opts = opts || {};
    work.s = work.s || 0;
    work.v = work.v || {};
    work.k = work.k || {};
    work.g = work.g || {};
    work.n = work.n || {};
    var steps = p.steps;
    var m = Gen.model(p);
    var marks = {};
    var focusKey = null;

    var root = h('div', { class: 'work' });
    var main = h('div', { class: 'work-main' });
    var side = h('aside', { class: 'work-side', 'aria-label': 'Fraction finder' });
    root.appendChild(main);
    root.appendChild(side);
    host.appendChild(root);

    var finder = Finder.create({ interactive: !opts.graded, compact: true });
    side.appendChild(h('h3', { text: 'Fraction finder' }));
    side.appendChild(finder.el);
    side.appendChild(Finder.chart());

    function cur() { return steps[work.s]; }
    function done() { return work.s >= steps.length; }
    function save() { if (opts.onSave) opts.onSave(); }

    /* ------------------------------------------------------------ fields */

    function field(key, cls, label, ph) {
      var inp = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false',
        class: 'blank ' + (cls || '') + (marks[key] ? ' ' + marks[key] : ''), 'data-key': key, 'aria-label': label, placeholder: ph || '' });
      inp.value = work.v[key] != null ? work.v[key] : '';
      if (opts.demo) inp.readOnly = true;
      inp.addEventListener('input', function () {
        work.v[key] = inp.value;
        if (marks[key]) { delete marks[key]; inp.classList.remove('ok', 'wrong'); }
        save();
      });
      inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); check(); } });
      return inp;
    }
    function val(key) { return work.v[key] != null ? String(work.v[key]) : ''; }
    function t(text, cls) { return h('span', { class: cls || 'val', text: text }); }
    function num(v, d) { return d != null ? Chem.fmtDec(v, d) : String(v); }

    /* ------------------------------------------------------------- prompt */

    var head = h('div', { class: 'prob-head' });
    head.appendChild(h('p', { class: 'prompt' }, [p.prompt + ' ', h('b', { class: 'ask', text: p.ask })]));
    if (p.lab) {
      head.appendChild(h('table', { class: 'labdata' }, p.lab.map(function (d) {
        return h('tr', null, [h('td', { text: d.label }), h('td', { class: 'num', text: d.value })]);
      })));
    }
    main.appendChild(head);

    var strip = h('ol', { class: 'steps4', 'aria-label': 'The steps' });
    main.appendChild(strip);
    var tableWrap = h('div', { class: 'table-wrap' });
    main.appendChild(tableWrap);
    var extra = h('div', { class: 'extra' });
    main.appendChild(extra);
    var panel = h('div', { class: 'step-panel' });
    main.appendChild(panel);
    var fb = h('div', { class: 'fb', role: 'status', 'aria-live': 'polite' });

    function say(kind, html) { fb.className = 'fb show ' + kind; fb.innerHTML = html; }
    function clearSay() { fb.className = 'fb'; fb.innerHTML = ''; }

    /* ------------------------------------------------------------- strip */

    function paintStrip() {
      strip.innerHTML = '';
      steps.forEach(function (s, i) {
        var g = work.g[s];
        var state = i < work.s ? (g === 0 ? ' fixed' : ' right') : i === work.s ? ' now' : '';
        strip.appendChild(h('li', { class: 'st' + state, 'aria-current': i === work.s ? 'step' : null }, [
          h('span', { class: 'st-n', text: i < work.s ? (g === 0 ? '✓' : '★') : String(i + 1) }),
          h('span', { class: 'st-t', text: STEP_NAMES[s] })
        ]));
      });
    }

    /* ------------------------------------------------------------- table */

    function colState(name) {
      var i = steps.indexOf(name);
      return i < work.s ? 'done' : i === work.s ? 'now' : 'later';
    }

    function gShown(i) { var r = p.rows[i]; return r.typed ? (val('g' + i) || r.gStr) : r.gStr; }

    function gramsCell(r, i) {
      var st = colState('grams');
      if (st === 'later') return [t('…', 'muted')];
      var pre = r.how === 'pct' ? [t(r.pct + '% → ', 'muted')] : r.how === 'rest' ? [t('100 − ' + r.pct + ' → ', 'muted')] : [];
      if (st === 'done') return pre.concat([t(gShown(i) + ' g')]);
      if (!work.c1 || work.c1 !== p.choice) return [t('?', 'muted')];
      if (!r.typed) return [t(r.gStr + ' g')];
      return pre.concat([field('g' + i, 'w-g', 'grams of ' + r.label, 'g'), t(' g', 'unit')]);
    }

    /* Step 2 as a dimensional analysis setup, the way the class writes it:
         40.0 g C x (1 mol C / ___ g C) = ___ mol C
         5.704 g CO2 x (1 mol CO2 / ___ g CO2) x (___ mol C / 1 mol CO2) = ___ mol C
       The molar mass is the blank on the bottom, the mole ratio the blank on
       top; the units that cancel are struck through. */
    function unit(text, cancels) { return h('span', { class: 'tok' + (cancels ? ' cx' : '') }, [sub(text)]); }
    function frac(top, bottom) {
      return h('span', { class: 'da-frac' }, [h('span', { class: 'da-num' }, top), h('span', { class: 'da-den' }, bottom)]);
    }
    function op(x) { return h('span', { class: 'da-op', 'aria-hidden': 'true', text: x }); }
    function molesCell(r, i) {
      var st = colState('moles');
      if (st === 'later') return [t('…', 'muted')];
      var done = st === 'done';
      var X = r.mmF, to = r.per ? r.atom : X;
      var mmBox = done ? t(Chem.fmtDec(work.n.mm[i], 1)) : field('mm' + i, 'w-mm', 'molar mass of ' + r.label + ': grams of 1 mol', 'molar mass');
      /* pieces that never split; a long setup (a hydrate's long formula, a narrow window) wraps between them */
      var piece = function (kids) { return h('span', { class: 'da-piece' }, kids); };
      var parts = [piece([t(gShown(i)), ' ', unit('g ' + X, true)]),
        piece([op('×'), frac(['1 ', unit('mol ' + X, !!r.per)], [mmBox, ' ', unit('g ' + X, true)])])];
      if (r.per) {
        var perBox = done ? t(String(r.per)) : field('per' + i, 'w-per', 'mol ' + r.atom + ' in 1 mol ' + r.label + ', from the formula', '');
        parts.push(piece([op('×'), frac([perBox, ' ', unit('mol ' + r.atom)], ['1 ', unit('mol ' + X, true)])]));
      }
      parts.push(piece([op('='), done ? t(Chem.fmtMol(work.n.mol[i])) : field('mol' + i, 'w-mol', 'moles of ' + to, ''), ' ', unit('mol ' + to)]));
      return [h('span', { class: 'da' + (done ? ' small' : '') }, parts)];
    }

    function divideCell(r, i) {
      var st = colState('divide');
      if (st === 'later') return [t('…', 'muted')];
      var mol = work.n.mol[i];
      if (st === 'done') return [t(Chem.fmtMol(mol) + ' ÷ ' + Chem.fmtMol(work.n.mol[work.n.sm]) + ' = ', 'muted'), t(val('q' + i) || Chem.fmtQ(work.n.q[i]))];
      var chosen = work.sm === i;
      var pickBtn = h('button', { type: 'button', class: 'pickbtn' + (chosen ? ' on' : ''), 'aria-pressed': chosen ? 'true' : 'false',
        'aria-label': 'Divide by ' + Chem.fmtMol(mol) + ' mol ' + rowUnit(r) + (chosen ? ' (chosen as the smallest)' : ''),
        text: chosen ? 'smallest ✓' : 'smallest?', onclick: function () { work.sm = i; delete marks.sm; save(); render('q' + i); } });
      if (work.sm == null) return [pickBtn];
      return [pickBtn, t(' ' + Chem.fmtMol(mol) + ' ÷ ' + Chem.fmtMol(work.n.mol[work.sm]) + ' = ', 'muted'), field('q' + i, 'w-q', 'quotient for ' + r.label, '0.00')];
    }

    function multiplyCell(r, i) {
      var st = colState('multiply');
      if (st === 'later') return [t('…', 'muted')];
      var q = work.n.q[i];
      var k = st === 'done' ? work.n.mult : val('mult') || '?';
      if (st === 'done') return [t(Chem.fmtQ(q) + ' × ' + k + ' → ', 'muted'), t(String(work.n.w[i]), 'val big')];
      var qb = opts.graded ? t(Chem.fmtQ(q)) : h('button', { type: 'button', class: 'qbtn', title: 'Put ' + Chem.fmtQ(q) + ' on the fraction finder',
        text: Chem.fmtQ(q), 'aria-label': Chem.fmtQ(q) + ': put it on the fraction finder', onclick: function () { finder.place(q); } });
      return [qb, t(' × ' + k + ' → ', 'muted'), field('w' + i, 'w-w', 'whole number for ' + r.label, '')];
    }

    function paintTable() {
      tableWrap.innerHTML = '';
      var cols = ['grams', 'moles', 'divide', 'multiply'];
      var headRow = h('tr', null, [h('th', { scope: 'col', class: 'rowhead', text: p.mode === 'hydrate' ? 'Part' : p.mode === 'combustion' ? 'Atom' : 'Element' })]
        .concat(cols.map(function (c, j) {
          var cell = h('th', { scope: 'col', class: 'c-' + colState(c) }, [h('span', { class: 'th-n', text: String(j + 1) }), ' ' + STEP_NAMES[c]]);
          if (c === 'multiply' && colState(c) === 'now') {
            cell.appendChild(h('span', { class: 'multbox' }, [t(' × ', 'unit'), field('mult', 'w-k', 'multiply every row by', '')]));
          }
          return cell;
        })));
      var body = p.rows.map(function (r, i) {
        var cells = [gramsCell(r, i), molesCell(r, i), divideCell(r, i), multiplyCell(r, i)];
        return h('tr', null, [h('th', { scope: 'row', class: 'rowhead' }, [h('b', { class: 'sym', text: r.label }), h('span', { class: 'rname', text: rowName(p, r) })])]
          .concat(cells.map(function (c, j) { return h('td', { class: 'c-' + colState(cols[j]) }, c); })));
      });
      tableWrap.appendChild(h('table', { class: 'four' }, [h('thead', null, [headRow]), h('tbody', null, body)]));
    }

    /* the formula, once Step 4 is done; then Step 5 */
    function formulaText() {
      if (p.mode === 'hydrate') {
        var n = work.n.w[1] / work.n.w[0];
        return Chem.hydrateDisp(p.salt, n);
      }
      var c = {};
      p.order.forEach(function (x, i) { c[x] = work.n.w[i]; });
      return sub(Chem.formulaOf(p.order, c));
    }
    function paintExtra() {
      extra.innerHTML = '';
      if (steps.indexOf('multiply') >= work.s) return;
      extra.appendChild(h('p', { class: 'formula-line' }, [p.mode === 'hydrate' ? 'Formula of the hydrate: ' : 'Empirical formula: ',
        h('b', { class: 'formula', text: formulaText() })]));
      if (p.mol) {
        var st = colState('molecular');
        var efD = p.efDisp;
        if (st === 'now') {
          var subsRow = [t('Molecular formula: ', 'muted')];
          p.order.forEach(function (x, i) { subsRow.push(h('b', { class: 'sym', text: x }), field('ms' + i, 'w-s', 'subscript of ' + x, '')); });
          extra.appendChild(h('div', { class: 'molbox' }, [
            h('div', { class: 'cline' }, [t('Empirical formula mass of ' + efD + ': ', 'muted'), field('efm', 'w-mm', 'empirical formula mass', 'g/mol'), t(' g/mol', 'unit')]),
            h('div', { class: 'cline' }, [t('n = molar mass ÷ empirical formula mass = ' + p.mol.Mstr + ' ÷ ' + (val('efm') || '___') + ' = ', 'muted'), field('n', 'w-k', 'n', '')]),
            h('div', { class: 'cline' }, subsRow)
          ]));
        } else if (st === 'done') {
          extra.appendChild(h('p', { class: 'formula-line' }, ['n = ' + p.mol.Mstr + ' ÷ ' + Chem.fmtDec(work.n.efm, 1) + ' = ' + work.n.nv + '. Molecular formula: ',
            h('b', { class: 'formula', text: p.mol.disp })]));
        }
      }
      if (p.mode === 'hydrate') {
        var sn = colState('name');
        var tiles = h('div', { class: 'prefixes', role: 'group', 'aria-label': 'Prefix for the water' }, PREFIXES.map(function (px) {
          var on = work.pre === px;
          return h('button', { type: 'button', class: 'tile' + (on ? ' on' : '') + (marks.pre && on ? ' ' + marks.pre : ''), 'aria-pressed': on ? 'true' : 'false',
            disabled: sn !== 'now', text: px, onclick: function () { work.pre = px; delete marks.pre; save(); render(); } });
        }));
        extra.appendChild(h('div', { class: 'namebox' }, [
          h('p', { class: 'cline' }, [t('Name: ', 'muted'), h('b', { text: p.name + ' ' + (work.pre || '___') + 'hydrate' })]),
          sn === 'done' ? null : tiles
        ]));
      }
    }

    /* ------------------------------------------------------- step panel */

    function stepText(s) {
      if (s === 'grams') {
        if (work.c1 !== p.choice) return 'What does the problem give? Percents: assume a 100 g sample. Grams: use the grams.';
        if (p.choice === 'pct') {
          return p.mode === 'hydrate' ? 'Assume a 100 g sample of the hydrate: the percent water is the grams of water, the rest of the 100 g is the anhydrous salt.' :
            'Assume a 100 g sample: each percent becomes that many grams. Type the grams.';
        }
        if (p.kind === 'heat') return 'The anhydrous salt is what is left. Find the grams of water lost: subtract.';
        if (p.kind === 'lab') return 'Find the grams of each part from the crucible masses: subtract.';
        return 'The grams are given.';
      }
      if (s === 'moles') {
        return p.mode === 'combustion' ? 'Dimensional analysis: type the molar mass on the bottom of the first fraction (to the tenths place) so g cancels, ' +
            'and the mole ratio from the formula on top of the second (mol C per mol CO₂, mol H per mol H₂O). Then the moles, to 3 significant figures.' :
          'Dimensional analysis: type the molar mass on the bottom of the fraction (to the tenths place) so g cancels, then the moles, to 3 significant figures.';
      }
      if (s === 'divide') return work.sm == null ? 'Tap the smallest mole value.' : 'Divide every row by the smallest moles, to two decimal places.';
      if (s === 'multiply') {
        return 'All within 0.1 of a whole number? Multiply by 1 and round. If not, read the decimal as a fraction (fraction finder) and multiply EVERY row by the same number.';
      }
      if (s === 'molecular') return 'Add up the empirical formula mass, divide the molar mass by it (n), and multiply every subscript by n.';
      if (s === 'name') return 'Name it: the Greek prefix says how many waters.';
      return '';
    }

    function paintDemo() {
      var sol = Gen.solution(p);
      if (work.s > 0) {
        var last = sol[work.s - 1];
        var box = h('div', { class: 'fb show tip demo-ex' });
        box.innerHTML = '<b>Step ' + last.step + ': ' + esc(last.title) + '.</b> ' + last.notes.map(esc).join(' ') +
          last.lines.map(function (l) { return '<div class="eq">' + Tex.toMathML(l, true) + '</div>'; }).join('');
        panel.appendChild(box);
      }
      if (!done()) {
        var nx = h('button', { type: 'button', class: 'primary', text: 'Show step ' + (work.s + 1) + ': ' + STEP_NAMES[cur()],
          onclick: function () { demoStep(); var b = panel.querySelector('.primary'); if (b) b.focus({ preventScroll: true }); } });
        panel.appendChild(h('div', { class: 'btnrow' }, [nx]));
      } else {
        panel.appendChild(h('p', { class: 'muted', text: 'That is the whole routine. Every problem today goes through the same four steps.' }));
      }
    }
    function demoStep() {
      var s = cur();
      fillStep(s);
      if (s === 'grams') {
        work.c1 = p.choice;
        work.n.g = p.rows.map(function (r, i) { return r.typed ? Chem.parseNum(val('g' + i)) : r.g; });
        advance(s);
        return;
      }
      var res = JUDGE[s]();
      res.accept();
      advance(s);
    }

    function paintPanel() {
      panel.innerHTML = '';
      if (opts.demo) { paintDemo(); return; }
      if (done()) { paintDone(); return; }
      var s = cur();
      panel.appendChild(h('p', { class: 'step-q' }, [h('b', { text: 'Step ' + (work.s + 1) + ': ' + STEP_NAMES[s] + '. ' }), stepText(s)]));
      var row = h('div', { class: 'btnrow' });
      if (s === 'grams' && work.c1 !== p.choice) {
        [['pct', 'Percents: assume 100 g'], ['g', 'Grams: use the grams']].forEach(function (o) {
          row.appendChild(h('button', { type: 'button', class: 'ghostbtn choice' + (work.c1 === o[0] ? ' wrong' : ''), text: o[1],
            onclick: function () { choose(o[0]); } }));
        });
      } else {
        row.appendChild(h('button', { type: 'button', class: 'primary', text: 'Check', onclick: check }));
      }
      row.appendChild(h('button', { type: 'button', class: 'ghostbtn', text: 'Hint', onclick: hint }));
      if ((work.k[s] || 0) >= SHOW_AFTER) row.appendChild(h('button', { type: 'button', class: 'ghostbtn showme', text: 'Show me', onclick: showMe }));
      panel.appendChild(row);
      panel.appendChild(fb);
    }

    function paintDone() {
      var right = steps.filter(function (s) { return work.g[s] === 1; }).length;
      var answer = p.mode === 'hydrate' ? p.fDisp + ', ' + p.name + ' ' + p.prefix + 'hydrate' :
        'Empirical formula ' + p.efDisp + (p.mol ? ', molecular formula ' + p.mol.disp : '');
      var who = p.mode === 'hydrate' ? (p.note || '') : 'This is ' + p.name + (p.mol || p.mode === 'combustion' ? ', ' + sub(p.f) : '') + '. ' + (p.note || '');
      panel.appendChild(h('div', { class: 'fb show good' }, [
        h('b', { text: answer + '. ' }),
        who + ' ',
        opts.graded ? h('span', { class: 'muted', text: right + ' of ' + steps.length + ' steps right on the first check.' }) : null
      ]));
      var how = h('details', { class: 'sol-details' }, [h('summary', { text: 'Worked solution' })]);
      var box = h('div');
      box.innerHTML = solutionHTML(p);
      how.appendChild(box);
      panel.appendChild(how);
      if (opts.next) {
        panel.appendChild(h('div', { class: 'btnrow' }, [h('button', { type: 'button', class: 'primary nextbtn', text: opts.next.label, onclick: opts.next.onClick })]));
      }
    }

    function render(focus) {
      root.classList.toggle('done', done());
      paintStrip();
      paintTable();
      paintExtra();
      paintPanel();
      var target = focus || focusKey;
      focusKey = null;
      var inputs = main.querySelectorAll('input.blank');
      var el = null;
      if (target) el = main.querySelector('input[data-key="' + target + '"]');
      if (!el) for (var i = 0; i < inputs.length; i++) if (!inputs[i].value || inputs[i].classList.contains('wrong')) { el = inputs[i]; break; }
      if (el && opts.autofocus !== false && !opts.demo) el.focus({ preventScroll: true });
    }

    /* ------------------------------------------------------------ judging */

    /* A counted wrong answer in this step: the step is no longer right on
       the first check. */
    function miss(s) {
      work.g[s] = 0;
      work.k[s] = (work.k[s] || 0) + 1;
    }

    function choose(c) {
      var s = 'grams';
      work.c1 = c;
      if (c !== p.choice) {
        miss(s);
        save();
        render();
        say('bad', p.choice === 'pct' ? 'Look again: the problem gives <b>percents</b>, not grams. Percents to grams: assume a 100 g sample.' :
          'Look again: the problem gives <b>grams</b>' + (p.kind === 'lab' ? ' (balance readings)' : '') + ', not percents. Use the grams.');
        return;
      }
      save();
      if (!p.rows.some(function (r) { return r.typed; })) {
        /* nothing to type: the grams are given */
        work.n.g = p.rows.map(function (r) { return r.g; });
        advance(s, 'Right: no percents here, so the grams are used as they are.');
        return;
      }
      render();
      say('tip', p.choice === 'pct' ? 'Right: percents. Assume a 100 g sample' + (p.mode === 'hydrate' ? ' of the hydrate' : '') + '.' :
        'Right: grams. Now find each part’s grams from the masses.');
    }

    /* judge a list of [key, judgement]; returns {state: 'empty'|'fmt'|'wrong'|'ok', msgs} */
    function tally(list) {
      var out = { empty: false, fmt: false, wrong: false, msgs: [] };
      list.forEach(function (x) {
        var key = x[0], j = x[1];
        if (j.ok) { marks[key] = 'ok'; return; }
        if (j.neutral) return;
        if (j.empty) { out.empty = true; return; }
        marks[key] = 'wrong';
        if (j.fmt) out.fmt = true; else out.wrong = true;
        if (j.msg && out.msgs.indexOf(j.msg) < 0) out.msgs.push(j.msg);
      });
      return out;
    }

    function check() {
      if (done()) return;
      var s = cur();
      if (s === 'grams' && work.c1 !== p.choice) { say('tip', 'First say what the problem gives: percents or grams.'); return; }
      var res = JUDGE[s]();
      if (res.empty && !res.wrong) {
        paintTable(); paintExtra();
        say('tip', esc(res.what || 'Fill in every box of this step first.') + ' Nothing was marked.');
        return;
      }
      if (res.wrong) {
        miss(s);
        save();
        render();
        say('bad', res.msgs.slice(0, 2).map(esc).join('<br>') || 'Not yet.');
        return;
      }
      if (res.fmt) {
        save();
        render();
        say('tip', res.msgs.slice(0, 2).map(esc).join('<br>') + ' <span class="muted">(Not marked wrong: fix it and check again.)</span>');
        return;
      }
      res.accept();
      advance(s, res.good);
    }

    function advance(s, msg) {
      if (work.g[s] == null) work.g[s] = 1;
      Object.keys(marks).forEach(function (k) { delete marks[k]; });
      work.s++;
      if (opts.onStep) opts.onStep(s, work.g[s] === 1, summary(s));
      if (done()) { work.r = 1; save(); render(); if (opts.onResolve) opts.onResolve(); return; }
      save();
      render();
      if (msg && !opts.demo) say('good', esc(msg));
    }

    /* what the student gave in a step, and what was expected, for the LMS */
    function summary(s) {
      var rows = p.rows.map(function (r) { return r.label; });
      var join = function (arr) { return arr.map(function (v, i) { return Chem.subs(p.rows[i].key === 'salt' ? p.salt : rows[i]) + ' ' + v; }).join(', '); };
      if (s === 'grams') return { typed: join(work.n.g.map(String)), want: join(p.rows.map(function (r) { return r.gStr; })) };
      if (s === 'moles') return { typed: join(work.n.mol.map(Chem.fmtMol)), want: join(m.rows.map(function (x) { return Chem.fmtMol(x.mol); })) };
      if (s === 'divide') return { typed: join(work.n.q.map(Chem.fmtQ)), want: join(m.rows.map(function (x) { return Chem.fmtQ(x.q); })) };
      if (s === 'multiply') return { typed: 'x' + work.n.mult + ': ' + join(work.n.w.map(String)), want: 'x' + p.mult + ': ' + join(p.rows.map(function (r) { return String(r.sub); })) };
      if (s === 'molecular') return { typed: 'n ' + work.n.nv, want: p.mol.f + ' (n ' + p.mol.n + ')' };
      if (s === 'name') return { typed: work.pre + 'hydrate', want: p.prefix + 'hydrate' };
      return { typed: '', want: '' };
    }

    function num0(key) { var v = Chem.parseNum(val(key)); return isNaN(v) ? null : v; }

    var JUDGE = {
      grams: function () {
        var list = [];
        p.rows.forEach(function (r, i) {
          if (!r.typed) return;
          list.push(['g' + i, Chem.judgeGrams(val('g' + i), r.g, r.how, { pct: r.pct, a: r.ctx && r.ctx.a, b: r.ctx && r.ctx.b, dp: r.dp,
            other: r.ctx && r.ctx.other, how: r.ctx && r.ctx.how })]);
        });
        var res = tally(list);
        res.accept = function () { work.n.g = p.rows.map(function (r, i) { return r.typed ? num0('g' + i) : r.g; }); };
        res.good = p.choice === 'pct' ? 'Right: the percents are now grams.' : 'Right: those are the grams of each part.';
        return res;
      },
      moles: function () {
        var list = [];
        p.rows.forEach(function (r, i) {
          var g = work.n.g[i];
          var jm = Chem.judgeMM(r.mmF, val('mm' + i));
          list.push(['mm' + i, jm]);
          var typedMM = jm.ok ? jm.v : null;
          var cls = Chem.mmValue(r.mmF);
          var jp = null;
          if (r.per) { jp = Chem.judgePer(val('per' + i), r.atom, r.molecule); list.push(['per' + i, jp]); }
          /* a wrong molar mass or ratio is named; the moles from it are not marked again */
          var blocked = (typedMM == null && !jm.empty) || (jp && !jp.ok && !jp.empty);
          list.push(['mol' + i, blocked ? (val('mol' + i) ? { neutral: true } : { empty: true }) :
            Chem.judgeMoles(val('mol' + i), g, typedMM || cls, cls, r.atom, r.per, r.molecule)]);
        });
        var res = tally(list);
        res.accept = function () {
          work.n.mm = p.rows.map(function (r, i) { return num0('mm' + i); });
          work.n.mol = p.rows.map(function (r, i) { return num0('mol' + i); });
        };
        res.good = p.mode === 'combustion' ? 'Right: g cancels, mol CO₂ and mol H₂O cancel, and moles of C and of H are left.' : 'Right: g cancels and moles are left.';
        return res;
      },
      divide: function () {
        if (work.sm == null) return { empty: true, msgs: [], what: 'Tap the smallest mole value first.' };
        var mol = work.n.mol;
        if (!Chem.smallestOK(mol, work.sm)) {
          marks.sm = 'wrong';
          return { wrong: true, msgs: ['That is not the smallest mole value. Divide by small: every row is divided by the smallest number in the moles column.'] };
        }
        var small = mol[work.sm], big = Math.max.apply(null, mol);
        var list = p.rows.map(function (r, i) {
          return ['q' + i, Chem.judgeQuotient(val('q' + i), mol[i] / small, m.rows[i].q, { big: big, small: small, mol: mol[i] })];
        });
        var res = tally(list);
        res.accept = function () { work.n.sm = work.sm; work.n.q = p.rows.map(function (r, i) { return num0('q' + i); }); };
        res.good = 'Right: divided by small.';
        return res;
      },
      multiply: function () {
        var qs = work.n.q;
        var jk = Chem.judgeMultiplier(val('mult'), qs, p.mult);
        var list = [['mult', jk]];
        p.rows.forEach(function (r, i) {
          list.push(['w' + i, jk.ok ? Chem.judgeWhole(val('w' + i), qs[i], jk.v, r.sub) : (val('w' + i) || jk.empty ? { neutral: true } : { empty: true })]);
        });
        var res = tally(list);
        res.accept = function () { work.n.mult = num0('mult'); work.n.w = p.rows.map(function (r, i) { return num0('w' + i); }); };
        res.good = p.mult === 1 ? 'Right: all whole already, so multiply by 1.' : 'Right: ×' + p.mult + ' makes every row whole.';
        return res;
      },
      molecular: function () {
        var je = Chem.judgeMM(p.ef, val('efm'));
        var list = [['efm', je]];
        var efm = je.ok ? je.v : null;
        list.push(['n', efm == null ? (val('n') ? { neutral: true } : { empty: true }) : Chem.judgeN(val('n'), p.mol.M, efm, p.mol.n)]);
        var nOK = list[1][1].ok;
        p.order.forEach(function (x, i) {
          list.push(['ms' + i, nOK ? Chem.judgeSub(val('ms' + i), p.mol.counts[x], p.efCounts[x], p.mol.n, x) : (val('ms' + i) ? { neutral: true } : { empty: true })]);
        });
        var res = tally(list);
        res.accept = function () { work.n.efm = efm; work.n.nv = num0('n'); };
        res.good = 'Right: the molecular formula is ' + p.mol.disp + '.';
        return res;
      },
      name: function () {
        if (!work.pre) return { empty: true, msgs: [], what: 'Tap a prefix first.' };
        if (work.pre === p.prefix) return { accept: function () {}, good: 'Right: ' + p.name + ' ' + p.prefix + 'hydrate.' };
        marks.pre = 'wrong';
        return { wrong: true, msgs: ['Count the waters in the formula: ' + p.n + '. The prefixes: 1 mono, 2 di, 3 tri, 4 tetra, 5 penta, 6 hexa, 7 hepta, 8 octa, ' +
          '9 nona, 10 deca.'] };
      }
    };

    /* --------------------------------------------------- hint and show */

    function hint() {
      var s = cur();
      var r0 = p.rows[0];
      var text = {
        grams: work.c1 !== p.choice ? 'Read the problem: does it give % (percents) or g (grams)?' :
          p.choice === 'pct' ? (p.mode === 'hydrate' ? 'In 100 g of the hydrate there are ' + p.rows[1].pct + ' g of water. The anhydrous salt is the rest: 100 − ' + p.rows[1].pct + '.' :
            'In 100 g of the compound there are ' + r0.pct + ' g of ' + Chem.el(r0.atom).name + '. Do the same for every row.') :
          (p.rows.filter(function (r) { return r.typed; })[0] || {}).ctx ? p.rows.filter(function (r) { return r.typed; })[0].ctx.how : 'The grams are given.',
        moles: (p.mode === 'combustion' ? 'The grams of 1 mol go on the bottom so g cancels: CO₂ is 12.0 + 2(16.0), H₂O is 2(1.0) + 16.0. The mole ratio ' +
            'comes from the formula: one CO₂ holds 1 C, one H₂O holds 2 H, so mol CO₂ and mol H₂O cancel.' :
          p.mode === 'hydrate' ? 'The grams of 1 mol go on the bottom so g cancels: add up the atoms of ' + p.saltDisp + ' (Periodic table button); water is 2(1.0) + 16.0.' :
          'The grams of 1 mol go on the bottom so g cancels. For one element that is its atomic mass from the periodic table, to the tenths place (' +
            r0.atom + ' is ' + Chem.tableMass(r0.atom) + ').') + ' Then multiply across the top and divide by the bottom.',
        divide: 'Look down the moles column: tap the smallest one. Then every row’s moles ÷ that number. The smallest row comes out 1.00.',
        multiply: 'Is every quotient within 0.1 of a whole number? Then type 1. If one is not, put it on the Fraction finder: its decimal is a fraction, and the bottom number of the fraction is what to multiply EVERY row by.',
        molecular: 'Empirical formula mass of ' + p.efDisp + ': ' + (p.mol ? Chem.mmWork(p.ef).replace(/ = .*$/, '') : '') + '. n = ' + (p.mol ? p.mol.Mstr : '') + ' ÷ that. Then each subscript × n.',
        name: 'The number in front of H₂O is ' + (work.n.w ? work.n.w[1] : p.n) + '. 1 mono, 2 di, 3 tri, 4 tetra, 5 penta, 6 hexa, 7 hepta, 8 octa, 9 nona, 10 deca.'
      }[s];
      say('tip', esc(text));
    }

    /* Fill the step in from the student's own earlier numbers. */
    function fillStep(s) {
      if (s === 'grams') {
        work.c1 = p.choice;
        p.rows.forEach(function (r, i) { if (r.typed) work.v['g' + i] = r.gStr; });
      } else if (s === 'moles') {
        p.rows.forEach(function (r, i) {
          var mm = Chem.mmValue(r.mmF);
          work.v['mm' + i] = Chem.fmtDec(mm, 1);
          if (r.per) work.v['per' + i] = String(r.per);
          work.v['mol' + i] = Chem.fmtMol(work.n.g[i] * (r.per || 1) / mm);
        });
      } else if (s === 'divide') {
        var mol = work.n.mol, min = Math.min.apply(null, mol);
        work.sm = mol.indexOf(min);
        p.rows.forEach(function (r, i) { work.v['q' + i] = Chem.fmtQ(mol[i] / min); });
      } else if (s === 'multiply') {
        work.v.mult = String(p.mult);
        p.rows.forEach(function (r, i) { work.v['w' + i] = String(r.sub); });
      } else if (s === 'molecular') {
        work.v.efm = Chem.mmText(p.ef);
        work.v.n = String(p.mol.n);
        p.order.forEach(function (x, i) { work.v['ms' + i] = String(p.mol.counts[x]); });
      } else if (s === 'name') work.pre = p.prefix;
    }
    function showMe() {
      var s = cur();
      fillStep(s);
      if (s === 'grams' && !p.rows.some(function (r) { return r.typed; })) { choose(p.choice); return; }
      save();
      render();
      check();
    }

    /* Everything filled in (tools/layout.js and the walkthrough). */
    function fillSolution() {
      while (!done()) { var s = cur(); fillStep(s); if (s === 'grams' && !p.rows.some(function (r) { return r.typed; })) choose(p.choice); else check(); }
    }
    /* Fill the current step and leave it unchecked (tools/layout.js). */
    function fillCurrent() { if (!done()) { fillStep(cur()); render(); } }

    /* The periodic table docks along the bottom: scroll the table up above it. */
    function reveal() {
      var pt = document.querySelector('.pt-panel');
      if (!pt || pt.hidden || !document.body.contains(root)) return;
      var top = pt.getBoundingClientRect().top, r = tableWrap.getBoundingClientRect();
      var down = r.bottom - (top - 8);
      if (down > 0) window.scrollBy(0, Math.min(down, r.top - 4));
    }

    render();
    return {
      el: root, reveal: reveal, check: check, hint: hint, choose: choose, fillSolution: fillSolution, fillCurrent: fillCurrent, fillStep: function () { fillStep(cur()); render(); },
      step: function () { return cur(); }, work: work,
      destroy: function () { }
    };
  }

  return { create: create, solutionHTML: solutionHTML, STEP_NAMES: STEP_NAMES };
})();

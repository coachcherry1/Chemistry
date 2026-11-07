/* work.js: one problem on screen, worked the way the dimensional analysis
 * mixed challenge works: tap (or drag) an equality to bring it into the chain
 * as a fraction, left side on top; press flip if its units do not cancel;
 * cancelled units are struck through; the readout says what is left over.
 *
 * What is new here: the molar-mass equality has a blank where the student
 * types the molar mass (to the tenths place), and the ratio equality has a
 * blank for the number from the formula. Each placed copy of an equality
 * shares its blank. Check looks at the units first, then each blank, then
 * the number and its significant figures, and says what went wrong.
 *
 * work (saved): { c: [[edge id, flipped]], b: {edge id: typed}, a: answer,
 *                 k: checks marked, r: 0 open, 1 solved, 2 solved on the
 *                 first check, 3 solution shown }
 */
var Work = (function () {
  'use strict';
  var h = UI.h;
  var T = Chem.TIMES;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  /* A worked solution, typeset: the chain as fractions with the cancelled
     units struck through, then how each blank was found. vals: the typed
     values of the blanks by edge id (the model's own when left out). */
  function solutionHTML(p, tiles, vals) {
    vals = vals || {};
    var exact = Chem.chainValue(p.given.v, tiles, vals);
    var rounded = Chem.fmtSig(exact, p.given.sig);
    /* a long chain gets its answer on a line of its own */
    var long = tiles.length >= 3;
    var answerTex = '= ' + Chem.texNum(rounded) + '\\ ' + Chem.texUnit(p.toTok);
    var out = '<div class="solution"><div class="eq">' +
      Tex.toMathML(Chem.texChain(p.given.str, p.fromTok, tiles, vals, long ? {} : { answer: rounded, toTok: p.toTok }), true) + '</div>' +
      (long ? '<div class="eq answer">' + Tex.toMathML(answerTex, true) + '</div>' : '');
    var notes = [];
    if (rounded !== Chem.fmtLong(exact)) {
      notes.push('The calculator shows ' + Chem.fmtLong(exact) + '. Rounded to ' + plural(p.given.sig, 'significant figure') +
        ', from ' + p.given.str + (p.M ? ' and ' + p.M.str + ' mol/L' : '') + '.');
    }
    var seen = {};
    tiles.forEach(function (t) {
      if (seen[t.e]) return;
      seen[t.e] = 1;
      var e = Chem.edge(t.e);
      if (e.type === 'mm') {
        out += '<div class="eq small">' + Tex.toMathML(Chem.texMM(e.s), true) + '</div>';
        var typed = vals[t.e] != null ? Number(vals[t.e]).toFixed(1) : Chem.mmText(e.s);
        if (typed !== Chem.mmText(e.s)) {
          notes.push('You used ' + typed + ' g/mol for ' + Chem.disp(e.s) + '; the class value is ' + Chem.mmText(e.s) +
            '. Within ' + Chem.TOL_TEXT + ', so it counts (periodic tables differ a little).');
        }
      } else if (e.type === 'ratio') {
        notes.push('1 ' + Chem.disp(e.a) + ' holds ' + Chem.hasText(e.a) + ', so 1 mol ' + Chem.disp(e.a) + ' = ' + e.R.v + ' mol ' + e.b + '.');
      } else if (e.type === 'sol') {
        notes.push(e.M + ' mol/L means 1 L ' + Chem.disp(e.s) + ' solution = ' + e.M + ' mol ' + Chem.disp(e.s) + '.');
      }
    });
    return out + notes.map(function (n) { return '<p class="note">' + esc(n) + '</p>'; }).join('') + '</div>';
  }

  function create(host, p, work, opts) {
    opts = opts || {};
    work.c = work.c || [];
    work.b = work.b || {};
    if (work.a == null) work.a = '';
    work.k = work.k || 0;
    work.r = work.r || 0;
    var chain = work.c.map(function (x) { return { e: x[0], f: x[1] }; });
    var marks = {};
    var sureShow = false;
    var focusAfter = null;
    var dead = false;
    var U = Chem.unitText;

    /* ---------------------------------------------------------- the page */

    var prompt = h('p', { class: 'prompt' }, p.prompt.map(function (x) {
      return typeof x === 'string' ? x : h('span', { class: 'q', text: x.q });
    }).concat([h('span', { class: 'badge', text: p.steps + '-step' })]));
    var sfnote = h('p', { class: 'sfnote', text: 'Molar masses to the tenths place. Round the answer to the significant figures of the quantity you were given.' });
    var chainEl = h('div', { class: 'chain', 'aria-label': 'Your conversion factors' });
    var chainScroll = h('div', { class: 'chain-scroll' }, [chainEl]);
    var ans = h('input', { type: 'text', class: 'ans', inputmode: 'text', autocomplete: 'off', spellcheck: 'false',
      placeholder: 'answer', 'aria-label': 'Answer, in ' + p.toText });
    ans.value = work.a;
    var sci = h('button', { type: 'button', class: 'mini sci', text: T + '10ⁿ',
      title: 'Insert ' + T + ' 10^ for scientific notation, then type the power', 'aria-label': 'Insert times ten to the power' });
    var leftPill = h('span', { class: 'pill' });
    var targetPill = h('span', { class: 'pill', text: p.toText });
    var eqRow = h('div', { class: 'eqrow' }, [
      h('span', { class: 'sign', text: '=' }), ans, h('span', { class: 'units', text: p.toText }), sci,
      h('span', { class: 'readout' }, [h('span', { class: 'muted', text: 'Left over:' }), leftPill,
        h('span', { class: 'muted', text: 'Target:' }), targetPill])
    ]);
    var bCheck = h('button', { type: 'button', class: 'primary', text: 'Check answer' });
    var bHint = h('button', { type: 'button', class: 'ghostbtn', text: 'Hint' });
    var bShow = h('button', { type: 'button', class: 'ghostbtn', text: 'Show solution' });
    var bClear = h('button', { type: 'button', class: 'ghostbtn', text: 'Clear factors' });
    var bTable = h('button', { type: 'button', class: 'ghostbtn pt-open-btn', text: 'Periodic table', 'aria-controls': 'ptPanel',
      'aria-expanded': Ptable.isOpen() ? 'true' : 'false' });
    var bNext = opts.next ? h('button', { type: 'button', class: 'primary next-problem', text: opts.next.label, hidden: true }) : null;
    var btnRow = h('div', { class: 'btnrow' }, [bCheck, bHint, bShow, bClear, bTable, bNext]);
    var fb = h('div', { class: 'fb', role: 'status', 'aria-live': 'polite' });
    var poolEl = h('div', { class: 'pool' });
    var poolCard = h('div', { class: 'poolcard' }, [
      h('h3', { text: 'Equalities: tap one to add it, flip it if its units do not cancel. Each can be used more than once.' }),
      poolEl
    ]);
    var map = MoleMap.create({ A: p.A, B: p.B, solution: CONFIG.molarity, sol: !!p.M });
    var side = h('div', { class: 'work-side' }, [
      h('h3', { text: 'Mole map' }), map.el,
      h('p', { class: 'map-key' }, [h('span', { class: 'key start' }), 'start ', h('span', { class: 'key target' }), 'target ',
        h('span', { class: 'key here' }), 'reached so far'])
    ]);
    var main = h('div', { class: 'work-main' }, [prompt, sfnote, chainScroll, eqRow, btnRow, fb, poolCard]);
    var root = h('div', { class: 'work' }, [main, side]);
    host.appendChild(root);

    /* -------------------------------------------------------- helpers */

    function say(kind, html) {
      fb.className = 'fb show ' + kind;
      fb.innerHTML = html;
    }
    function clearSay() { fb.className = 'fb'; fb.innerHTML = ''; }
    function resolved() { return work.r > 0; }
    function save() {
      work.c = chain.map(function (t) { return [t.e, t.f]; });
      if (opts.onSave) opts.onSave(work);
    }
    function analyse() { return Chem.cancel(p.fromTok, chain); }
    function reached(an) { return Chem.unitsReach(an, p.toTok); }
    function blankIds() {
      var seen = {};
      return chain.map(function (t) { return t.e; }).filter(function (id) {
        if (seen[id] || !(Chem.edge(id).L.blank || Chem.edge(id).R.blank)) return false;
        seen[id] = 1;
        return true;
      });
    }
    function blankLabel(id) {
      var e = Chem.edge(id);
      return e.type === 'mm' ? 'molar mass of ' + Chem.disp(e.s) + ', in g per mol' : 'mol ' + e.b + ' in 1 mol ' + Chem.disp(e.a);
    }
    function road(id) { return Chem.ROAD_NAME[Chem.edge(id).type]; }
    function b(t) { return '<b>' + esc(t) + '</b>'; }

    /* ------------------------------------------------------ rendering */

    function sideEl(side, tile, cell, where, struck) {
      var e = Chem.edge(tile.e);
      var kids = [];
      if (side.blank) {
        var inp = h('input', { type: 'text', class: 'blank ' + side.blank + (marks[tile.e] ? ' ' + marks[tile.e] : ''),
          inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'data-edge': tile.e,
          'aria-label': blankLabel(tile.e), placeholder: side.blank === 'mm' ? 'molar mass' : '#' });
        inp.value = work.b[tile.e] || '';
        if (resolved()) inp.readOnly = true;
        inp.addEventListener('input', function () {
          work.b[tile.e] = inp.value;
          delete marks[tile.e];
          chainEl.querySelectorAll('input.blank').forEach(function (o) {
            if (o !== inp && o.getAttribute('data-edge') === tile.e) o.value = inp.value;
            if (o.getAttribute('data-edge') === tile.e) o.classList.remove('ok', 'wrong');
          });
        });
        inp.addEventListener('change', save);
        inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); check(); } });
        kids.push(inp);
      } else {
        kids.push(h('span', { class: 'val', text: Chem.valueText(side.v, side) }));
      }
      kids.push(' ');
      kids.push(h('span', { class: 'tok' + (struck[cell + ':' + where] ? ' cx' : ''), text: U(side.t) }));
      return h('div', { class: where === 'top' ? 'num' : 'den' }, kids);
    }

    function render() {
      var an = analyse();
      chainEl.innerHTML = '';
      chainEl.appendChild(h('div', { class: 'cell start' }, [
        h('div', { class: 'num' }, [h('span', { class: 'val', text: p.given.str }), ' ',
          h('span', { class: 'tok' + (an.struck['0:top'] ? ' cx' : ''), text: U(p.fromTok) })])
      ]));
      chain.forEach(function (tile, i) {
        chainEl.appendChild(h('div', { class: 'op', text: T, 'aria-hidden': 'true' }));
        var top = Chem.top(tile), bot = Chem.bottom(tile);
        var flip = h('button', { type: 'button', class: 'fl', text: '⇅ flip', disabled: resolved(),
          'aria-label': 'Flip factor ' + (i + 1) });
        var rm = h('button', { type: 'button', class: 'rm', text: '×', disabled: resolved(),
          'aria-label': 'Remove factor ' + (i + 1) });
        flip.addEventListener('click', function (ev) {
          ev.stopPropagation();
          chain[i] = { e: tile.e, f: tile.f ? 0 : 1 };
          focusAfter = { flip: i };
          changed();
        });
        rm.addEventListener('click', function (ev) {
          ev.stopPropagation();
          chain.splice(i, 1);
          focusAfter = { cell: Math.min(i, chain.length - 1) };
          changed();
        });
        var cell = h('div', { class: 'cell factor', tabindex: '0', 'data-i': String(i),
          'aria-label': 'Factor ' + (i + 1) + ': ' + Chem.sideText(top) + ' over ' + Chem.sideText(bot) +
            '. Arrow keys move it, Delete removes it.' }, [
          h('div', { class: 'tools' }, [flip, rm]),
          sideEl(top, tile, i + 1, 'top', an.struck),
          h('div', { class: 'bar' }),
          sideEl(bot, tile, i + 1, 'bottom', an.struck)
        ]);
        cell.addEventListener('keydown', function (ev) {
          if (ev.target !== cell || resolved()) return;
          if (ev.key === 'ArrowLeft' && i > 0) { ev.preventDefault(); move(i, i - 1); }
          else if (ev.key === 'ArrowRight' && i < chain.length - 1) { ev.preventDefault(); move(i, i + 1); }
          else if (ev.key === 'Delete' || ev.key === 'Backspace') {
            ev.preventDefault(); chain.splice(i, 1); focusAfter = { cell: Math.min(i, chain.length - 1) }; changed();
          }
        });
        chainEl.appendChild(cell);
      });
      if (!resolved()) {
        chainEl.appendChild(h('div', { class: 'op', text: T, 'aria-hidden': 'true' }));
        chainEl.appendChild(h('div', { class: 'slot-empty', id: 'emptySlot',
          text: chain.length ? 'add another equality' : 'tap an equality below to start' }));
      }

      var ok = reached(an);
      leftPill.textContent = chain.length ? Chem.leftText(an) : 'nothing placed yet';
      leftPill.className = 'pill' + (chain.length ? (ok ? ' ok' : ' no') : '');
      targetPill.className = 'pill' + (ok ? ' ok' : '');

      var used = {};
      chain.forEach(function (t) { used[t.e] = 1; });
      poolEl.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('used', !!used[c.getAttribute('data-edge')]); });

      map.update({
        start: p.fromTok, target: p.toTok, lit: chain.map(function (t) { return t.e; }),
        here: an.top.length === 1 && !an.bottom.length ? an.top[0] : null
      });

      if (focusAfter) {
        var f = focusAfter; focusAfter = null;
        var target = null;
        if (f.flip != null) target = chainEl.querySelectorAll('.factor')[f.flip] && chainEl.querySelectorAll('.factor')[f.flip].querySelector('.fl');
        else if (f.cell != null && f.cell >= 0) target = chainEl.querySelectorAll('.factor')[f.cell];
        else if (f.blank) target = chainEl.querySelector('input.blank[data-edge="' + f.blank + '"]');
        else if (f.chip != null) target = poolEl.querySelectorAll('.chip')[f.chip];
        if (target) target.focus({ preventScroll: true });
      }
    }

    function renderPool() {
      poolEl.innerHTML = '';
      p.pool.forEach(function (id, k) {
        var e = Chem.edge(id);
        var chip = h('div', { class: 'chip', role: 'button', tabindex: '0', 'data-edge': id, 'data-k': String(k),
          'aria-label': 'Equality ' + Chem.edgeText(id) + '. Press Enter to add it to the chain.' }, [
          h('span', { class: 'side', text: Chem.sideText(e.L) }), h('span', { class: 'eqs', text: '=' }),
          h('span', { class: 'side', text: Chem.sideText(e.R) })
        ]);
        chip.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); add(id, null, { chip: k }); }
        });
        /* a tap arrives as a click (a drag never does: see onUp), and so does
           a screen reader's activation */
        chip.addEventListener('click', function () { if (Date.now() - draggedAt > 300) add(id); });
        poolEl.appendChild(chip);
      });
    }

    function changed() {
      clearSay();
      sureShow = false;
      bShow.textContent = 'Show solution';
      render();
      save();
    }
    function add(id, at, focus) {
      if (resolved()) return;
      var tile = { e: id, f: 0 };
      if (at == null) chain.push(tile); else chain.splice(at, 0, tile);
      var e = Chem.edge(id);
      focusAfter = (e.L.blank || e.R.blank) && !work.b[id] ? { blank: id } : (focus || null);
      changed();
    }
    function move(from, to) {
      var t = chain.splice(from, 1)[0];
      chain.splice(to, 0, t);
      focusAfter = { cell: to };
      changed();
    }

    /* --------------------------------------------------------- feedback */

    function flipWouldFix() {
      for (var i = 0; i < chain.length; i++) {
        var keep = chain[i];
        chain[i] = { e: keep.e, f: keep.f ? 0 : 1 };
        var ok = reached(analyse());
        chain[i] = keep;
        if (ok) return i + 1;
      }
      return 0;
    }

    function unitsMessage(an) {
      var flipAt = flipWouldFix();
      var left = Chem.leftText(an);
      var msg = '<b>Not yet: the units don’t come out right.</b> After cancelling you are left with ' + b(left) +
        ', but you need ' + b(p.toText) + '.';
      if (flipAt) return msg + '<br>You picked the right equalities. <b>Factor ' + flipAt + ' is upside down</b>: press ' +
        '<b>⇅ flip</b> on it so its units land on the other level.';
      if (an.top.length === 1 && !an.bottom.length) {
        var here = Chem.untok(an.top[0]), want = Chem.untok(p.toTok);
        if (here.key !== want.key && here.node === want.node) {
          return msg + '<br>' + b(U(an.top[0])) + ' and ' + b(p.toText) + ' are different substances, so they never cancel. ' +
            'On the map, the only way between them is the <b>ratio</b> road, through moles.';
        }
        if (here.key !== want.key && here.node === 'part' && want.node === 'part') {
          return msg + '<br>Particles never jump straight from one substance to another: go through moles.';
        }
        if (here.key === want.key && /^m?Lsol$/.test(here.node) && /^m?Lsol$/.test(want.node)) {
          return msg + '<br>' + b(U(an.top[0])) + ' and ' + b(p.toText) + ' are different units: use <b>1000 mL = 1 L</b>.';
        }
        return msg + '<br>That is a stop on the way. Keep going from ' + b(U(an.top[0])) + '.';
      }
      var strayTop = an.top.filter(function (t) { return t !== p.toTok; });
      if (strayTop.length) return msg + '<br>' + b(U(strayTop[0])) + ' is still on top with nothing underneath to cancel it.';
      if (an.bottom.length) return msg + '<br>' + b(U(an.bottom[0])) + ' is still on the bottom with nothing on top to cancel it.';
      return msg;
    }

    function sigMessage(raw, given, exact) {
      var need = p.given.sig;
      var m = '<b>Your arithmetic is right; the precision isn’t.</b> ';
      if (given > need) m += 'You wrote ' + b(raw.trim()) + ', which shows ' + plural(given, 'significant figure') + '. An answer can’t be more precise than the measurement it came from.';
      else m += 'You wrote ' + b(raw.trim()) + ', which shows only ' + plural(given, 'significant figure') + '. Rounding away a figure you measured throws away real precision.';
      m += '<br><b>The rule.</b> When you multiply and divide, the answer keeps as many significant figures as the measurement with ' +
        'the fewest. ' + (p.M
          ? 'Here the measurements are the ' + b(p.fromText) + ' you were given and the molarity, ' + b(p.M.str + ' mol/L') + ': ' +
            plural(need, 'significant figure') + ' each. The other equalities (molar mass, 6.02 ' + T + ' 10²³, 1000 mL = 1 L, the ratio) ' +
            'count as exact and never limit you.'
          : 'Here the only measurement is the ' + b(p.fromText) + ' you were given: ' + plural(need, 'significant figure') +
            '. The equalities (molar mass, 6.02 ' + T + ' 10²³, 22.4 L, the ratio) count as exact and never limit you.');
      m += '<br>Rounded to ' + plural(need, 'significant figure') + ', your answer is ' + b(Chem.fmtSig(exact, need) + ' ' + p.toText) +
        '. Enter that and check again.';
      return m;
    }

    function answerMessage(j, exact) {
      var hasAv = chain.some(function (t) { return Chem.edge(t.e).type === 'av'; });
      switch (j.kind) {
        case 'close':
          return '<b>Close, but more than ' + Chem.TOL_TEXT + ' from the answer.</b> Check the numbers you typed into the calculator, especially the molar ' +
            'mass, and round only once, at the end: do the whole chain in one go, then round to ' + plural(p.given.sig, 'significant figure') + '.';
        case 'sigfigs': return sigMessage(work.a, j.given, exact);
        case 'reciprocal':
          return '<b>Units are right, but your number looks upside down.</b> Multiply by every number on top and divide by every number on the bottom.';
        case 'ratio':
          return '<b>Units are right, but your number is off by the ratio.</b> Did the ' + p.ratioN + ' from the ratio make it into the arithmetic?';
        case 'power':
          if (hasAv) {
            return '<b>Units are right, but you are off by a factor of 10' + Chem.sup(j.k) + '.</b> Check how 6.02 ' + T + ' 10²³ went ' +
              'into the calculator: use the EE (or ' + T + '10ˣ) key, as 6.02E23, or put it in brackets. And check the power you typed in your answer.';
          }
          return '<b>Units are right, but you are off by a factor of 10' + Chem.sup(j.k) + '.</b> Check the decimal point and any power of ten you typed.';
        default:
          return '<b>Units are right, but the arithmetic is off.</b> Multiply every number on top together, then divide by every number on the bottom.';
      }
    }

    function currentValues() {
      var vals = {};
      blankIds().forEach(function (id) {
        var e = Chem.edge(id);
        var j = e.type === 'mm' ? Chem.judgeMM(e.s, work.b[id]) : Chem.judgeRatio(e.a, e.b, work.b[id]);
        if (j.ok) vals[id] = j.v;
      });
      return vals;
    }

    function workText(vals) { return solutionHTML(p, chain, vals); }

    /* ------------------------------------------------------------ check */

    function mark() { work.k++; save(); }

    function check() {
      if (resolved()) return;
      if (!chain.length) return say('bad', 'Nothing placed yet. Tap one of the equalities below to bring it in as a conversion factor.');
      var an = analyse();
      if (!reached(an)) { mark(); return say('bad', unitsMessage(an)); }
      var ids = blankIds(), vals = {};
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i], e = Chem.edge(id);
        var j = e.type === 'mm' ? Chem.judgeMM(e.s, work.b[id]) : Chem.judgeRatio(e.a, e.b, work.b[id]);
        var inputs = chainEl.querySelectorAll('input.blank[data-edge="' + id + '"]');
        if (!j.ok) {
          if (j.kind !== 'empty') { mark(); marks[id] = 'wrong'; }
          inputs.forEach(function (x) { x.classList.toggle('wrong', j.kind !== 'empty'); });
          if (inputs[0]) inputs[0].focus({ preventScroll: true });
          var head = j.kind === 'empty' ? '<b>Your units cancel.</b> ' :
            (e.type === 'mm' ? '<b>Check the molar mass of ' + esc(Chem.disp(e.s)) + '.</b> ' : '<b>Check the ratio.</b> ');
          return say(j.kind === 'empty' ? 'tip' : 'bad', head + esc(j.msg) +
            (e.type === 'mm' && j.kind !== 'empty' ? ' The <b>Periodic table</b> button shows every atomic mass to the tenths place.' : ''));
        }
        marks[id] = 'ok';
        inputs.forEach(function (x) { x.classList.remove('wrong'); x.classList.add('ok'); });
        vals[id] = j.v;
      }
      var raw = String(work.a || '').trim();
      if (!raw) {
        ans.focus({ preventScroll: true });
        return say('tip', '<b>Your units cancel' + (ids.length ? ' and every blank is right' : '') + '.</b> That’s the hard part. ' +
          'Now multiply the numbers on top, divide by the numbers on the bottom, and type the answer.');
      }
      if (isNaN(Chem.parseNum(raw))) {
        return say('bad', 'I couldn’t read ' + b(raw) + ' as a number. Plain numbers are fine: <b>0.357</b> or <b>125</b>. For ' +
          'scientific notation press <b>' + T + '10ⁿ</b> and type the power after it, or write it as <b>5.86e22</b> or <b>5.86 x 10^22</b>.');
      }
      var exact = Chem.chainValue(p.given.v, chain, vals);
      var verdict = Chem.judgeAnswer(raw, exact, p.given.sig, { also: Chem.chainValue(p.given.v, chain, {}),
        ratio: chain.some(function (t) { return Chem.edge(t.e).type === 'ratio'; }) ? p.ratioN : 0 });
      mark();
      if (verdict.ok) {
        var longer = chain.length > p.steps ? ' You got there in ' + chain.length + ' factors; the shortest route is ' + p.steps + '.' : '';
        resolve(work.k === 1 ? 2 : 1);
        return say('good', '<b>Correct.</b> ' + esc(Chem.fmtSig(exact, p.given.sig)) + ' ' + esc(p.toText) + '.' + longer +
          workText(vals));
      }
      say('bad', answerMessage(verdict, exact));
    }

    /* ------------------------------------------------------------- hint */

    function hint() {
      if (resolved()) return;
      var an = analyse();
      if (reached(an)) {
        var empty = blankIds().filter(function (id) {
          var e = Chem.edge(id);
          return !(e.type === 'mm' ? Chem.judgeMM(e.s, work.b[id]) : Chem.judgeRatio(e.a, e.b, work.b[id])).ok;
        });
        if (empty.length) {
          var e = Chem.edge(empty[0]);
          return say('tip', e.type === 'mm'
            ? 'Your units are right. Now the blank: the molar mass of ' + b(Chem.disp(e.s)) + ' is the atomic masses of ' +
              esc(Chem.hasText(e.s)) + ' added up, each to the tenths place. Open the <b>Periodic table</b>.'
            : 'Your units are right. Now the blank: how many ' + b(e.b) + ' atoms are in one ' + b(Chem.disp(e.a)) + '? Read the subscript.');
        }
        return say('tip', 'Your units and blanks are right. Multiply the numbers on top, divide by the numbers on the bottom, and round ' +
          'to ' + plural(p.given.sig, 'significant figure') + '.');
      }
      var flipAt = flipWouldFix();
      if (flipAt) return say('tip', 'Factor ' + flipAt + ' is upside down. Press <b>⇅ flip</b> on it.');
      var here = !chain.length ? p.fromTok : (an.top.length === 1 && !an.bottom.length ? an.top[0] : null);
      if (here) {
        var rest = Chem.route(here, p.toTok, p.pool);
        if (rest && rest.length) {
          var t = rest[0], next = Chem.top(t).t;
          if (Chem.edge(t.e).type === 'ml') {
            return say('tip', 'You are at ' + b(U(here)) + '. mL is not on the map: first change it to L with <b>1000 mL = 1 L</b>, ' +
              'turned so ' + b(U(here)) + ' is on the bottom.');
          }
          return say('tip', 'You are at ' + b(U(here)) + '. On the map, take the <b>' + esc(road(t.e)) + '</b> road next, to ' + b(U(next)) +
            ': use the equality with ' + esc(U(here)) + ' and ' + esc(U(next)) + ', turned so ' + b(U(here)) + ' is on the bottom.');
        }
      }
      var stray = an.top.filter(function (x) { return x !== p.toTok; });
      if (stray.length) return say('tip', b(U(stray[0])) + ' is still on top. Bring in an equality with ' + esc(U(stray[0])) +
        ' and turn it so ' + esc(U(stray[0])) + ' is on the bottom; or remove the factor that put it there.');
      if (an.bottom.length) return say('tip', b(U(an.bottom[0])) + ' is still on the bottom. Turn the factor that put it there, or remove it.');
    }

    /* --------------------------------------------------------- solution */

    function fillSolution() {
      chain = p.path.map(function (t) { return { e: t.e, f: t.f }; });
      chain.forEach(function (t) {
        var e = Chem.edge(t.e);
        if (e.type === 'mm') work.b[t.e] = Chem.mmText(e.s);
        if (e.type === 'ratio') work.b[t.e] = String(e.R.v);
      });
      work.a = p.ansStr;
      ans.value = work.a;
    }

    function showSolution() {
      if (resolved()) return;
      if (opts.graded && !sureShow) {
        sureShow = true;
        bShow.textContent = 'Show it (no credit)?';
        return say('tip', 'Showing the solution means this problem will not count. Press the button again to see it, or press <b>Hint</b> instead.');
      }
      fillSolution();
      resolve(3);
      render();
      say('tip', '<b>Worked solution.</b> Every unit cancels except ' + esc(p.toText) + '.' +
        workText({}) + (opts.graded ? 'This one does not count toward your score.' : ''));
    }

    function resolve(r) {
      work.r = r;
      save();
      lock();
      if (opts.onResolve) opts.onResolve(r);
    }

    function lock() {
      root.classList.add('done');
      [bCheck, bHint, bShow, bClear, sci].forEach(function (x) { x.disabled = true; });
      ans.readOnly = true;
      poolEl.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-disabled', 'true'); c.tabIndex = -1; });
      chainEl.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
      chainEl.querySelectorAll('input').forEach(function (x) { x.readOnly = true; });
      var slot = chainEl.querySelector('.slot-empty');
      if (slot) { slot.previousSibling.remove(); slot.remove(); }
      if (bNext) { bNext.hidden = false; bNext.focus({ preventScroll: true }); }
    }

    /* ------------------------------------------------------ the buttons */

    bCheck.addEventListener('click', check);
    bHint.addEventListener('click', hint);
    bShow.addEventListener('click', showSolution);
    bClear.addEventListener('click', function () { if (!resolved()) { chain = []; changed(); } });
    bTable.addEventListener('click', function () { Ptable.toggle(bTable); });
    Ptable.onChange(function (open) {
      if (dead) return;
      bTable.setAttribute('aria-expanded', open ? 'true' : 'false');
      /* keep the chain (and its blanks) above the docked table */
      if (open) main.scrollIntoView({ block: 'start' });
    });
    if (bNext) bNext.addEventListener('click', function () { if (opts.next.onClick) opts.next.onClick(); });
    ans.addEventListener('input', function () { work.a = ans.value; });
    ans.addEventListener('change', save);
    ans.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); check(); } });
    sci.addEventListener('click', function () {
      var s = ans.selectionStart != null ? ans.selectionStart : ans.value.length;
      var e2 = ans.selectionEnd != null ? ans.selectionEnd : s;
      var ins = ' ' + T + ' 10^';
      ans.value = ans.value.slice(0, s) + ins + ans.value.slice(e2);
      work.a = ans.value;
      ans.focus();
      ans.setSelectionRange(s + ins.length, s + ins.length);
    });

    /* ------------------------------------------- drag (mouse, touch, pen) */

    var drag = null, draggedAt = 0;
    function onDown(ev) {
      if (resolved() || ev.target.closest('button, input')) return;
      var it = ev.target.closest('.chip, .factor');
      if (!it || !root.contains(it)) return;
      if (ev.button !== undefined && ev.button !== 0) return;
      var r = it.getBoundingClientRect();
      drag = { el: it, chip: it.classList.contains('chip'), id: it.getAttribute('data-edge'), i: +it.getAttribute('data-i'),
        sx: ev.clientX, sy: ev.clientY, ox: ev.clientX - r.left, oy: ev.clientY - r.top, w: r.width, moved: false, ghost: null, at: null };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    }
    function insertAt(x) {
      var n = 0;
      chainEl.querySelectorAll('.factor').forEach(function (c) { var r = c.getBoundingClientRect(); if (x > r.left + r.width / 2) n++; });
      return n;
    }
    function showBar(at) {
      var old = chainEl.querySelector('.ins-bar'); if (old) old.remove();
      if (at == null) return;
      var cells = chainEl.querySelectorAll('.factor');
      var bar = h('div', { class: 'ins-bar' });
      if (at < cells.length) chainEl.insertBefore(bar, cells[at].previousSibling);
      else chainEl.insertBefore(bar, chainEl.querySelector('.slot-empty') ? chainEl.querySelector('.slot-empty').previousSibling : null);
    }
    function onMove(ev) {
      if (!drag) return;
      if (!drag.moved) {
        if (Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) < 6) return;
        drag.moved = true;
        var g = drag.el.cloneNode(true);
        g.classList.add('ghost');
        g.classList.remove('used');
        var tools = g.querySelector('.tools'); if (tools) tools.remove();
        g.style.width = drag.w + 'px';
        document.body.appendChild(g);
        drag.ghost = g;
        document.body.style.userSelect = 'none';
      }
      ev.preventDefault();
      drag.ghost.style.left = (ev.clientX - drag.ox) + 'px';
      drag.ghost.style.top = (ev.clientY - drag.oy) + 'px';
      var box = chainScroll.getBoundingClientRect();
      var over = ev.clientX >= box.left - 30 && ev.clientX <= box.right + 30 && ev.clientY >= box.top - 30 && ev.clientY <= box.bottom + 30;
      chainScroll.classList.toggle('drop-active', over);
      drag.at = over ? insertAt(ev.clientX) : null;
      showBar(drag.at);
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (!drag) return;
      var d = drag; drag = null;
      document.body.style.userSelect = '';
      if (d.ghost) d.ghost.remove();
      chainScroll.classList.remove('drop-active');
      showBar(null);
      if (!d.moved) return;
      draggedAt = Date.now();
      if (d.chip) { if (d.at != null) add(d.id, d.at); return; }
      var t = chain.splice(d.i, 1)[0];
      if (d.at != null) chain.splice(Math.max(0, Math.min(chain.length, d.at > d.i ? d.at - 1 : d.at)), 0, t);
      changed();
    }
    root.addEventListener('pointerdown', onDown);

    /* ------------------------------------------------------------ start */

    renderPool();
    render();
    if (resolved()) {
      lock();
      var vals = currentValues();
      if (work.r === 3) say('tip', '<b>Worked solution.</b>' + workText({}) +
        (opts.graded ? 'This one does not count toward your score.' : ''));
      else say('good', '<b>Correct.</b> ' + esc(Chem.fmtSig(Chem.chainValue(p.given.v, chain, vals), p.given.sig)) + ' ' + esc(p.toText) +
        '.' + workText(vals));
    }

    return {
      el: root, problem: p, work: work,
      check: check, hint: hint, showSolution: showSolution,
      /* for the tools: the chain a student would build, blanks and answer typed */
      fillSolution: function () { fillSolution(); render(); },
      setChain: function (tiles) { chain = tiles.map(function (t) { return { e: t.e, f: t.f }; }); changed(); },
      setBlank: function (id, v) { work.b[id] = v; render(); },
      setAnswer: function (v) { work.a = v; ans.value = v; },
      feedback: function () { return fb.textContent; },
      feedbackKind: function () { return fb.className; },
      destroy: function () {
        dead = true;
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
      }
    };
  }

  return { create: create, solutionHTML: solutionHTML };
})();

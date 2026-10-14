/* builder.js — build one Lewis structure, one rule at a time.
 *
 *   Rule 1  type the valence electrons (a table, or just the total)
 *   Rule 2  drop the central atom on the center spot, then the other atoms
 *           around it (every placement is a single bond); then the bookkeeping
 *   Rule 3  click outer atoms to add lone pairs; type what is left
 *   Rule 4  click the central atom to place what is left
 *   Rule 5  type how many electrons the central atom has; if it is short,
 *           click outer lone pairs to share them as bonds ("Undo last bond"
 *           takes one back); press Done
 *
 * A rule unlocks only when the one before it checks out. Nothing in a build
 * is graded: a mistake gets specific feedback, and after a few misses on the
 * same rule a "Show me" button fills in that rule.
 *
 * Any finished structure where every atom has its octet (H its doublet) is
 * accepted — in HNO₂, H₂CO₃ and CO₂ Rule 5 can take its pair from more than
 * one oxygen. What is never accepted is a central atom with more than 8: a
 * period-2 atom gets told it can't; a period-3-or-below atom gets SNARK.
 */

var RULES = [
  { n: 1, title: 'Sum the valence electrons.' },
  { n: 2, title: 'Place the least electronegative atom (the first written, excluding H) in the center ' +
                 'and connect all atoms with single bonds.',
    note: 'Oxyacid? Each H bonds to an O, not to the central atom.' },
  { n: 3, title: 'Fill the octets of the external atoms — not H, which is stable with a doublet.' },
  { n: 4, title: 'Place ANY remaining electrons on the central atom.' },
  { n: 5, title: 'If the central atom is electron deficient, use lone pairs of electrons to create double ' +
                 'and triple bonds.' }
];

function Builder(o) {
  'use strict';
  var h = UI.h;
  var sp = o.sp, sol = Lewis.solve(sp), X = sp.center, V = Lewis.valence(sp);
  var showAfter = o.showAfter || 2;

  var rule = 1, phase = '1';
  var s = Lewis.empty(sp.charge);
  var after4 = null;                 /* the structure as Rule 5 found it */
  var shared = [];                   /* outer atoms whose lone pair Rule 5 has shared, in order — for "Undo last bond" */
  var undoBtn = null;
  var tally = {};
  var misses = {};
  var flags = {}, pulse = null;
  var finished = false;

  /* one tile per atom in the formula */
  var atoms = [];
  sp.parts.forEach(function (p) { for (var i = 0; i < p.n; i++) atoms.push({ el: p.el, slot: null }); });

  /* ------------------------------------------------------------- the DOM */

  var rulesBox = h('ol', { class: 'rules' });
  var tallyBox = h('div', { class: 'tally', 'aria-live': 'off' });
  var side = h('aside', { class: 'side panel' }, [
    h('div', { class: 'panel-head' }, [h('h3', { text: 'The 5 rules' })]),
    rulesBox,
    h('div', { class: 'panel-head tally-head' }, [h('h3', { text: 'Electron bookkeeping' })]),
    tallyBox
  ]);

  var ruleNum = h('span', { class: 'rule-num' });
  var ruleTitle = h('span', { class: 'rule-title' });
  var howTo = h('p', { class: 'howto' });
  var form = h('div', { class: 'rule-form' });
  var canvas = h('div', { class: 'canvas' });
  var tray = h('div', { class: 'tray', hidden: true });
  var checkBtn = h('button', { type: 'button', class: 'primary', text: 'Check' });
  var extraBtns = h('span', { class: 'extra' });
  var showBtn = h('button', { type: 'button', class: 'ghostbtn showme', hidden: true, text: 'Show me' });
  var work = h('section', { class: 'work panel' }, [
    h('div', { class: 'rule-head' }, [ruleNum, ruleTitle]),
    howTo,
    canvas,
    tray,
    form,
    h('div', { class: 'btnrow' }, [checkBtn, extraBtns, showBtn])
  ]);
  var node = h('div', { class: 'builder' }, [side, work]);

  /* ------------------------------------------------------------ helpers */

  function say(t, kind) { o.say(t, kind); }

  function left() { return sol.total - Lewis.totalElectrons(s); }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function where(k) {
    if (k === 'C') return 'in the center';
    return Lewis.WHERE[k[0]] + (k.length === 1 ? ' the central atom' : ' the ' + s.at[k[0]]);
  }

  function miss(key) { misses[key] = (misses[key] || 0) + 1; paintShow(); return misses[key]; }

  function paintShow() { showBtn.hidden = finished || (misses[phase] || 0) < showAfter; }

  function input(label, cls) {
    var i = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', class: 'num-in' + (cls ? ' ' + cls : ''),
      'aria-label': label, size: 4 });
    i.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); check(); } });
    return i;
  }

  function bad(inp) {
    if (!inp) return;
    inp.classList.add('wrong');
    inp.focus();
    inp.select && inp.select();
  }

  function clearBad() {
    var n = form.querySelectorAll('.wrong');
    for (var i = 0; i < n.length; i++) n[i].classList.remove('wrong');
  }

  /* ------------------------------------------------------- side panel */

  function paintSide() {
    rulesBox.innerHTML = '';
    RULES.forEach(function (r) {
      var st = finished || r.n < rule ? 'done' : r.n === rule ? 'current' : 'todo';
      var li = h('li', { class: 'rule ' + st, 'aria-current': st === 'current' ? 'step' : null }, [
        h('span', { class: 'rule-badge', 'aria-hidden': 'true', text: st === 'done' ? '✓' : String(r.n) }),
        h('span', { class: 'sr', text: 'Rule ' + r.n + (st === 'done' ? ' (done)' : st === 'current' ? ' (now)' : '') + ': ' }),
        h('span', { class: 'rule-text' }, [r.title, r.note ? h('span', { class: 'rule-note', text: r.note }) : null])
      ]);
      rulesBox.appendChild(li);
    });

    tallyBox.innerHTML = '';
    var rows = [];
    if (tally.total != null) rows.push(['Rule 1', 'valence electrons', String(tally.total)]);
    if (tally.used2 != null) rows.push(['Rule 2', 'used in bonds', '− ' + tally.used2], ['', 'left', String(tally.left2)]);
    if (tally.outer != null) rows.push(['Rule 3', 'outer lone pairs', '− ' + tally.outer], ['', 'left', String(tally.left3)]);
    if (tally.center != null) rows.push(['Rule 4', 'on the central atom', '− ' + tally.center], ['', 'left', '0']);
    if (!rows.length) { tallyBox.appendChild(h('p', { class: 'muted small', text: 'Fills in as you go.' })); return; }
    var t = h('table', { class: 'tally-table' });
    rows.forEach(function (r) {
      t.appendChild(h('tr', { class: r[1] === 'left' ? 'left' : '' }, [
        h('td', { class: 'tr-rule', text: r[0] }), h('td', { text: r[1] }), h('td', { class: 'num', text: r[2] })
      ]));
    });
    tallyBox.appendChild(t);
  }

  /* ------------------------------------------------------------ drawing */

  function dropSlots() {
    if (!s.at.C) return ['C'];
    var out = Lewis.DIRS.filter(function (d) { return !s.at[d]; });
    Lewis.DIRS.forEach(function (d) { if (s.at[d] && s.at[d] !== 'H' && !s.at[d + d]) out.push(d + d); });
    return out;
  }

  function atomLabel(k) {
    var el = s.at[k];
    if (rule === 2) return el + ' ' + where(k) + '. Press Enter to send it back to the tray.';
    if (rule === 3 && k === 'C') return 'Central atom ' + el + ' — it waits for Rule 4.';
    var e = Lewis.electrons(s, k);
    return el + ' ' + where(k) + ', ' + plural(s.lp[k] || 0, 'lone pair') + ', ' + e + ' electrons around it. ' +
      'Press Enter to add a lone pair.';
  }

  function lpLabel(k) {
    if (rule === 5) {
      return k === 'C' ? 'Lone pair on the central atom ' + X
        : 'Lone pair on ' + s.at[k] + ' ' + where(k) + '. Press Enter to share it with ' + X + ' as a bond.';
    }
    return 'Lone pair on ' + s.at[k] + ' ' + where(k) + '. Press Enter to take it back.';
  }

  function paintDrawing() {
    var all = Lewis.filled(s);
    var d = { frame: phase === '2a' || phase === '2b' ? 'full' : 'fit', scale: 1.3, flags: flags, pulse: pulse,
      atomLabel: atomLabel, lpLabel: lpLabel };
    if (!finished) {
      if (phase === '2a' || phase === '2b') { d.drops = dropSlots(); d.dropFilled = phase === '2b'; }
      if (phase === '3') { d.atoms = all; d.lps = all.filter(function (k) { return k !== 'C'; }); }
      if (phase === '4') { d.atoms = ['C']; d.lps = ['C']; }
      /* every lone pair can be clicked in Rule 5, but they only light up when
         the central atom actually needs one — an honest student is not
         invited to expand an octet */
      if (phase === '5b') { d.lps = all; if (Lewis.electrons(s, 'C') < 8) d.cls = 'share'; }
    }
    canvas.innerHTML = '';
    canvas.appendChild(phase === '1' ? Builder.formulaBig(sp) : Draw.structure(s, d));
    pulse = null;
    paintTray();
  }

  function paintTray() {
    tray.hidden = !(phase === '2a' || phase === '2b') || finished;
    tray.innerHTML = '';
    var any = false;
    atoms.forEach(function (t, i) {
      if (t.slot) return;
      any = true;
      tray.appendChild(h('button', { type: 'button', class: 'tile el-' + t.el.toLowerCase(), 'data-tile': i,
        'aria-label': 'Atom ' + t.el, text: t.el }));
    });
    if (!any) tray.appendChild(h('p', { class: 'tray-empty', text: 'Every atom is placed. Press Check.' }));
  }

  function paint() {
    paintSide();
    paintDrawing();
    paintShow();
    if (undoBtn) undoBtn.disabled = finished || phase !== '5b' || !shared.length;
  }

  /* ------------------------------------------------------------- Rule 2 */

  function place(t, k) {
    t.slot = k;
    s.at[k] = t.el;
    s.lp[k] = 0;
    if (k !== 'C') s.bo[k] = 1;
  }

  function unplace(k) {
    [k, k.length === 1 ? k + k : null].forEach(function (x) {
      if (!x || !s.at[x]) return;
      atoms.forEach(function (t) { if (t.slot === x) t.slot = null; });
      delete s.at[x]; delete s.lp[x]; delete s.bo[x];
    });
  }

  var picker = new Picker({
    tray: tray, stage: canvas,
    label: function (k) { return atoms[+k].el; },
    prompt: function (k) { return 'Now choose a spot for ' + atoms[+k].el + '.'; },
    say: function (t) { say(t); },
    drop: function (slot, key) {
      if (finished || (phase !== '2a' && phase !== '2b')) return;
      var t = atoms[+key];
      if (!t || t.slot) return;
      flags = {};
      if (slot === 'C') {
        if (s.at.C) return;
        if (t.el === X) {
          place(t, 'C');
          phase = '2b';
          setHow();
          buildForm();
          say('Yes — ' + X + ' is the central atom. Now place every other atom around it.', 'good');
        } else if (t.el === 'H') {
          miss('2a');
          say('H can make only one bond (it is stable with a doublet), so it can never be the central atom.', 'bad');
        } else {
          miss('2a');
          say('Not ' + t.el + '. Rule 2: the central atom is the least electronegative one — the first atom ' +
              'written in ' + sp.text + ', not counting H.', 'bad');
        }
        paint();
        return;
      }
      if (!s.at.C) { say('Start with the central atom: drop it on the center spot.'); return; }
      if (s.at[slot]) { say('That spot is taken. Click the atom there to send it back first.'); return; }
      if (slot.length === 2 && !s.at[slot[0]]) return;
      place(t, slot);
      say('');
      paint();
    },
    empty: function (slot) {
      if (finished || phase !== '2b') return;
      if (slot !== 'C' && s.at[slot]) { flags = {}; unplace(slot); say(''); paint(); }
      else if (!s.at[slot]) say('Choose an atom in the tray first, then a spot.');
    }
  });

  function check2b() {
    var waiting = atoms.filter(function (t) { return !t.slot; }).length;
    if (waiting) { say('Place every atom first — ' + plural(waiting, 'atom') + ' still in the tray.', 'bad'); return; }
    if (Lewis.signature(s) === Lewis.signature(sol.s2)) {
      phase = '2t';
      flags = {};
      setHow();
      buildForm();
      say('Skeleton correct. Now the bookkeeping.', 'good');
      paint();
      return;
    }
    flags = {};
    var outerNonH = ['NN', 'EE', 'SS', 'WW'].filter(function (k) { return s.at[k] && s.at[k] !== 'H'; });
    var outerH = ['NN', 'EE', 'SS', 'WW'].filter(function (k) { return s.at[k] === 'H'; });
    var innerH = Lewis.DIRS.filter(function (d) { return s.at[d] === 'H'; });
    miss('2b');
    if (outerNonH.length) {
      outerNonH.forEach(function (k) { flags[k] = 'bad'; });
      say('Only an H can hang off an outer atom, and only in an oxyacid. Every other atom bonds straight to ' +
          'the central atom, ' + X + '.', 'bad');
    } else if (sp.acid && innerH.length) {
      innerH.forEach(function (k) { flags[k] = 'bad'; });
      say(sp.text + ' is an oxyacid: every H bonds to an O, not to the central atom. Send the H back and ' +
          'put it on the outside of an O.', 'bad');
    } else if (!sp.acid && outerH.length) {
      outerH.forEach(function (k) { flags[k] = 'bad'; });
      say(sp.text + ' is not an oxyacid, so every atom — H included — bonds straight to the central atom, ' +
          X + '.', 'bad');
    } else {
      say('Something is bonded to the wrong atom. Rule 2: every atom bonds to ' + X +
          (sp.acid ? ', except that each H bonds to an O.' : '.'), 'bad');
    }
    paint();
  }

  /* ------------------------------------------------------- Rules 3 – 5 */

  function onAtom(k) {
    if (finished) return;
    if (phase === '3') {
      if (k === 'C') { say('Rule 3 is only for the outer atoms. The central atom waits for Rule 4.'); return; }
      addPair(k);
    } else if (phase === '4') {
      addPair(k);
    }
  }

  function addPair(k) {
    flags = {};
    if (left() <= 0) {
      say(phase === '4' ? 'Nothing left to place — press Check.'
        : 'You are out of electrons: you only have ' + tally.left2 + ' to place in Rule 3. Check for lone ' +
          'pairs that do not belong.', 'bad');
      paint();
      return;
    }
    if (Lewis.roomFor(s, k) <= 0) { say('No room for another lone pair on that ' + s.at[k] + '.'); return; }
    s.lp[k] = (s.lp[k] || 0) + 1;
    say('');
    paint();
    if (phase === '4') say(left() ? plural(left(), 'electron') + ' still to place.' : 'Every electron is placed. Press Check.');
  }

  function onPair(k) {
    if (finished) return;
    if (phase === '3' || phase === '4') {
      flags = {};
      s.lp[k] = Math.max(0, (s.lp[k] || 0) - 1);
      say('');
      paint();
      if (phase === '4') say(plural(left(), 'electron') + ' still to place.');
      return;
    }
    if (phase === '5b') share(k);
  }

  function share(k) {
    flags = {};
    if (k === 'C') {
      say('Rule 5 shares a lone pair from an OUTER atom. ' + X + '’s own lone pairs stay where they are.');
      return;
    }
    if (k.length === 2) { say('Only an atom bonded straight to ' + X + ' can share a pair with it.'); return; }
    var e = Lewis.electrons(s, 'C');
    if (e + 2 > 8) {
      miss('5b');
      if (ELEMENTS[X].period >= 3) say(o.snark(sp), 'snark');
      else say('That would give ' + X + ' ' + (e + 2) + ' electrons. ' + X + ' is in period 2 and can never have ' +
               'more than 8.', 'bad');
      return;
    }
    s.lp[k] -= 1;
    s.bo[k] += 1;
    shared.push(k);
    pulse = k;
    paint();
    /* not finished automatically: the student looks at the result, then
       presses Done — or takes the bond back to try a different lone pair */
    if (Lewis.electrons(s, 'C') >= 8) {
      say(X + ' now has 8 — no longer electron deficient. Press Done, or “Undo last bond” to try a different lone pair.', 'good');
    } else {
      say(X + ' now has ' + Lewis.electrons(s, 'C') + '. Still short — share another pair.', '');
    }
  }

  function undoShare() {
    if (finished || phase !== '5b' || !shared.length) return;
    var k = shared.pop();
    s.lp[k] += 1;
    s.bo[k] -= 1;
    flags = {};
    paint();
    say('Took back one ' + X + '–' + s.at[k] + ' bond: that pair is a lone pair on ' + s.at[k] + ' again. ' + X +
        ' has ' + Lewis.electrons(s, 'C') + '.');
  }

  function delegate(ev) {
    if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
    var t = ev.target.closest ? ev.target.closest('.lp.active, .atom.active') : null;
    if (!t || !canvas.contains(t)) return;
    if (ev.type === 'keydown') ev.preventDefault();
    var k = t.getAttribute('data-slot');
    var focusSel = t.classList.contains('lp') ? null : '.atom[data-slot="' + k + '"]';
    if (t.classList.contains('lp')) onPair(k); else onAtom(k);
    if (ev.type === 'keydown') {
      var again = focusSel ? canvas.querySelector(focusSel) : canvas.querySelector('.lp.active[data-slot="' + k + '"]') ||
        canvas.querySelector('.atom[data-slot="' + k + '"]');
      if (again && again.focus) again.focus();
    }
  }
  canvas.addEventListener('click', delegate);
  canvas.addEventListener('keydown', delegate);

  /* ---------------------------------------------------------- the forms */

  var inputs = {};

  function periodicTable() { return Builder.periodicTable(sp.parts.map(function (p) { return p.el; })); }

  function buildForm() {
    form.innerHTML = '';
    inputs = {};
    extraBtns.innerHTML = '';
    undoBtn = null;
    checkBtn.hidden = false;
    checkBtn.textContent = 'Check';

    if (finished) { checkBtn.hidden = true; return; }

    if (phase === '1') {
      if (o.table) {
        var t = h('table', { class: 'v-table' });
        t.appendChild(h('tr', null, ['Element', 'Atoms', 'Valence e⁻ each', 'Total'].map(function (x) { return h('th', { text: x }); })));
        inputs.each = [];
        V.rows.forEach(function (r, i) {
          var inp = input('Valence electrons of one ' + r.el + ' atom');
          var out = h('output', { class: 'prod', text: '' });
          inp.addEventListener('input', function () {
            var v = UI.num(inp.value);
            out.textContent = isNaN(v) ? '' : String(v * r.n);
          });
          inputs.each.push(inp);
          t.appendChild(h('tr', null, [
            h('td', { class: 'el-cell el-' + r.el.toLowerCase(), text: r.el }),
            h('td', { class: 'num', text: '× ' + r.n }),
            h('td', null, [inp]),
            h('td', { class: 'num' }, ['= ', out])
          ]));
        });
        if (sp.charge) {
          inputs.charge = input('Electrons to add or remove for the charge', 'charge-in');
          t.appendChild(h('tr', { class: 'charge-row' }, [
            h('td', { colspan: 3 }, ['Charge ', h('b', { text: Lewis.chargeText(sp.charge) }),
              ': electrons to add (+) or remove (−)']),
            h('td', null, [inputs.charge])
          ]));
        }
        inputs.total = input('Total valence electrons');
        t.appendChild(h('tr', { class: 'sum-row' }, [
          h('td', { colspan: 3, text: 'Total valence electrons' }), h('td', null, [inputs.total])
        ]));
        form.appendChild(t);
      } else {
        inputs.total = input('Total valence electrons');
        form.appendChild(h('label', { class: 'inline-field' }, ['Total valence electrons in ' + sp.text + ': ', inputs.total]));
      }
      form.appendChild(periodicTable());
      return;
    }

    if (phase === '2a' || phase === '2b') {
      checkBtn.hidden = phase === '2a';
      checkBtn.textContent = 'Check the skeleton';
      return;
    }

    if (phase === '2t') {
      inputs.used = input('Electrons used in the bonds');
      inputs.left = input('Electrons left after Rule 2');
      form.appendChild(h('div', { class: 'fields' }, [
        h('label', { class: 'inline-field' }, ['Electrons used in bonds: ', inputs.used]),
        h('label', { class: 'inline-field' }, ['Electrons left: ' + tally.total + ' − (bonds) = ', inputs.left])
      ]));
      setTimeout(function () { inputs.used.focus(); }, 0);
      return;
    }

    if (phase === '3') {
      inputs.left = input('Electrons left after Rule 3');
      form.appendChild(h('div', { class: 'fields' }, [
        h('label', { class: 'inline-field' }, ['When the outer atoms are full — electrons left: ', inputs.left])
      ]));
      return;
    }

    if (phase === '4') {
      checkBtn.textContent = 'Check';
      return;
    }

    if (phase === '5a') {
      inputs.count = input('Electrons around the central atom');
      form.appendChild(h('div', { class: 'fields' }, [
        h('label', { class: 'inline-field' }, ['Electrons around ' + X + ': ', inputs.count])
      ]));
      setTimeout(function () { inputs.count.focus(); }, 0);
      return;
    }

    if (phase === '5b') {
      checkBtn.textContent = 'Done';
      undoBtn = h('button', { type: 'button', class: 'ghostbtn', text: '↶ Undo last bond',
        title: 'Turn the last bond you made in Rule 5 back into a lone pair' });
      undoBtn.addEventListener('click', undoShare);
      extraBtns.appendChild(undoBtn);
    }
  }

  function setHow() {
    ruleNum.textContent = finished ? '✓' : 'Rule ' + rule;
    ruleTitle.textContent = finished ? 'Finished' : RULES[rule - 1].title;
    var t = '';
    if (finished) t = 'All five rules done.';
    else if (phase === '1') t = o.table
      ? 'Fill in the valence electrons for one atom of each element (the periodic table shows the groups). ' +
        (sp.charge ? 'Then adjust for the charge and add it all up.' : 'Then add it all up.')
      : 'Add up the valence electrons of every atom' + (sp.charge ? ', then adjust for the charge.' : '.');
    else if (phase === '2a') t = 'Drag the central atom from the tray onto the center spot — or click the atom, then the spot.';
    else if (phase === '2b') t = 'Place every other atom. Each spot you fill gets a single bond. An atom placed beyond an ' +
      'outer atom bonds to that outer atom. Click a placed atom to send it back.';
    else if (phase === '2t') t = 'Count the bonds in your drawing. Each single bond is a shared pair: 2 electrons.';
    else if (phase === '3') t = 'Click an outer atom to give it a lone pair; click a lone pair to take it back. Count 2 ' +
      'for every bond and 2 for every lone pair. Then type how many electrons you have left.';
    else if (phase === '4') t = 'Click the central atom to give it the ' + plural(tally.left3, 'leftover electron') +
      (tally.left3 ? ' as lone pairs.' : '. Nothing left? Then Rule 4 has nothing to do — press Check.');
    else if (phase === '5a') t = 'Count the electrons around ' + X + ': 2 for every bond line touching it, 2 for every lone pair on it.';
    else if (phase === '5b') t = Lewis.electrons(after4, 'C') < 8
      ? 'Click a lone pair on an outer atom to share it with ' + X + ' as a bond. Each pair you share gives ' + X +
        ' 2 more electrons. Changed your mind? “Undo last bond” takes the last one back. Press Done when ' + X +
        ' has 8.'
      : X + ' has its octet. If there is nothing to fix, press Done.';
    howTo.textContent = t;
  }

  function advance(n) {
    rule = n;
    phase = n === 2 ? '2a' : n === 5 ? '5a' : String(n);
    flags = {};
    if (n === 5) { after4 = Lewis.clone(s); shared = []; }
    setHow();
    buildForm();
    paint();
  }

  /* ------------------------------------------------------------ checking */

  function check() {
    if (finished) return;
    clearBad();
    if (phase === '1') return check1();
    if (phase === '2b') return check2b();
    if (phase === '2t') return check2t();
    if (phase === '3') return check3();
    if (phase === '4') return check4();
    if (phase === '5a') return check5a();
    if (phase === '5b') return check5b();
  }
  checkBtn.addEventListener('click', check);

  function sumText() {
    return V.rows.map(function (r) { return r.n > 1 ? r.n + ' × ' + r.each : String(r.each); }).join(' + ') +
      (V.adjust ? (V.adjust > 0 ? ' + ' : ' − ') + Math.abs(V.adjust) : '');
  }

  function chargeWords() {
    var n = Math.abs(sp.charge);
    return sp.charge < 0
      ? 'A ' + Lewis.chargeText(sp.charge) + ' charge means the ion has GAINED ' + plural(n, 'electron') + ': add ' + n + '.'
      : 'A ' + Lewis.chargeText(sp.charge) + ' charge means the ion has LOST ' + plural(n, 'electron') + ': take away ' + n + '.';
  }

  function check1() {
    if (o.table) {
      for (var i = 0; i < V.rows.length; i++) {
        var r = V.rows[i], v = UI.num(inputs.each[i].value);
        if (v !== r.each) {
          miss('1');
          bad(inputs.each[i]);
          var E = ELEMENTS[r.el];
          say('Check ' + r.el + ': it is in group ' + E.group + ' (' + PERIODIC.groupsA[PERIODIC.groups.indexOf(E.group)] +
              '). How many valence electrons does that give one ' + r.el + ' atom?', 'bad');
          return;
        }
      }
      if (sp.charge) {
        var c = UI.num(inputs.charge.value);
        if (c !== V.adjust) {
          miss('1');
          bad(inputs.charge);
          say((c === -V.adjust ? 'Other way round. ' : '') + chargeWords() + ' Type it as ' +
              (V.adjust > 0 ? '+' : '−') + '(number).', 'bad');
          return;
        }
      }
    }
    var t = UI.num(inputs.total.value);
    if (t === V.total) {
      tally.total = V.total;
      say('Right: ' + sumText() + ' = ' + V.total + ' valence electrons.', 'good');
      advance(2);
      return;
    }
    miss('1');
    bad(inputs.total);
    var forgotSubs = V.rows.reduce(function (a, r) { return a + r.each; }, 0) + V.adjust;
    if (isNaN(t)) say('Type a whole number.', 'bad');
    else if (sp.charge && t === V.neutral) say('That is the count for the neutral atoms. ' + chargeWords(), 'bad');
    else if (sp.charge && t === V.neutral - V.adjust) say('Other way round with the charge. ' + chargeWords(), 'bad');
    else if (t === forgotSubs && forgotSubs !== V.total) {
      var many = V.rows.filter(function (r) { return r.n > 1; })[0];
      say('Multiply by the subscripts: ' + sp.text + ' has ' + many.n + ' ' + many.el + ' atoms.', 'bad');
    } else if (o.table) say('Add up the last column' + (sp.charge ? ' and the charge' : '') + ' again.', 'bad');
    else say('Not quite. Add the valence electrons of EVERY atom (multiply by the subscripts)' +
             (sp.charge ? ', then adjust for the ' + Lewis.chargeText(sp.charge) + ' charge.' : '.'), 'bad');
  }

  function check2t() {
    var nb = Lewis.bonds(s).length;
    var u = UI.num(inputs.used.value), l = UI.num(inputs.left.value);
    if (u !== 2 * nb) {
      miss('2t');
      bad(inputs.used);
      say(u === nb ? 'Each bond is a PAIR of electrons — count 2 for every bond.'
        : 'Count the bond lines in your drawing. Each single bond uses 2 electrons.', 'bad');
      return;
    }
    if (l !== tally.total - 2 * nb) {
      miss('2t');
      bad(inputs.left);
      say('Subtract: ' + tally.total + ' − ' + 2 * nb + ' = ?', 'bad');
      return;
    }
    tally.used2 = 2 * nb;
    tally.left2 = tally.total - 2 * nb;
    say(plural(nb, 'single bond') + ' use ' + 2 * nb + ' electrons; ' + tally.left2 + ' left for Rules 3 and 4.', 'good');
    advance(3);
  }

  function check3() {
    flags = {};
    var outer = Lewis.filled(s).filter(function (k) { return k !== 'C'; });
    var hl = outer.filter(function (k) { return s.at[k] === 'H' && s.lp[k] > 0; });
    if (hl.length) {
      miss('3');
      hl.forEach(function (k) { flags[k] = 'bad'; });
      say('H is stable with a doublet — its bond already gives it 2 electrons. Take the lone pair off the H.', 'bad');
      paint();
      return;
    }
    var off = outer.filter(function (k) { return s.at[k] !== 'H' && Lewis.electrons(s, k) !== 8; });
    if (off.length) {
      miss('3');
      off.forEach(function (k) { flags[k] = 'bad'; });
      var k = off[0];
      say('The ' + s.at[k] + ' ' + where(k) + ' has ' + Lewis.electrons(s, k) + ' electrons around it. Every outer ' +
          'atom except H needs 8: count 2 for each bond and 2 for each lone pair.', 'bad');
      paint();
      return;
    }
    var l = UI.num(inputs.left.value);
    var placed = tally.left2 - left();
    if (l !== left()) {
      miss('3');
      bad(inputs.left);
      say('You had ' + tally.left2 + ' and put ' + plural(placed / 2, 'lone pair') + ' (' + placed + ' electrons) on the ' +
          'outer atoms: ' + tally.left2 + ' − ' + placed + ' = ?', 'bad');
      paint();
      return;
    }
    tally.outer = placed;
    tally.left3 = left();
    say('Outer octets done. ' + (tally.left3 ? plural(tally.left3, 'electron') + ' left for Rule 4.' : 'Nothing left over.'), 'good');
    advance(4);
  }

  function check4() {
    if (left() > 0) {
      miss('4');
      say('You still have ' + plural(left(), 'electron') + ' to place. Rule 4: ANY remaining electrons go on the central atom.', 'bad');
      return;
    }
    tally.center = 2 * (s.lp.C || 0);
    say(tally.center ? X + ' gets ' + plural(s.lp.C, 'lone pair') + '. Every electron is placed.'
      : 'Nothing was left for ' + X + '. Every electron is placed.', 'good');
    advance(5);
  }

  function check5a() {
    var e = Lewis.electrons(s, 'C'), n = UI.num(inputs.count.value);
    if (n !== e) {
      var m = miss('5a');
      bad(inputs.count);
      var b = Lewis.bondSum(s, 'C'), p = s.lp.C || 0;
      say(m < 2 ? 'Count again: 2 electrons for every bond line touching ' + X + ' and 2 for every lone pair on it.'
        : X + ' has ' + plural(b, 'bond line') + ' (' + 2 * b + ' electrons) and ' + plural(p, 'lone pair') + ' (' + 2 * p +
          '): ' + e + ' in all.', 'bad');
      return;
    }
    phase = '5b';
    setHow();
    buildForm();
    paint();
    if (e === 8) say('Right — ' + X + ' has 8. It is not electron deficient.', 'good');
    else say('Right — ' + X + ' has only ' + e + ', so it is electron deficient: it needs ' + (8 - e) + ' more.', 'good');
  }

  function check5b() {
    var e = Lewis.electrons(s, 'C');
    if (e < 8) {
      miss('5b');
      say(X + ' still has only ' + e + ' electrons — it is electron deficient. Rule 5: click a lone pair on an outer ' +
          'atom to share it as a bond.', 'bad');
      return;
    }
    finish();
  }

  /* ------------------------------------------------------------- show me */

  showBtn.addEventListener('click', function () {
    flags = {};
    var r = sol;
    if (phase === '1') {
      if (o.table) {
        V.rows.forEach(function (row, i) { inputs.each[i].value = row.each; inputs.each[i].dispatchEvent(new Event('input')); });
        if (sp.charge) inputs.charge.value = (V.adjust > 0 ? '+' : '−') + Math.abs(V.adjust);
      }
      inputs.total.value = V.total;
      say('Here it is: ' + sumText() + ' = ' + V.total + '. Press Check.');
    } else if (phase === '2a') {
      var c = atoms.filter(function (t) { return t.el === X && !t.slot; })[0];
      place(c, 'C');
      phase = '2b';
      setHow();
      buildForm();
      say(X + ' goes in the center: it is the first atom written in ' + sp.text + ', not counting H.');
    } else if (phase === '2b') {
      Lewis.filled(s).forEach(function (k) { if (k !== 'C') unplace(k); });
      Lewis.filled(r.s2).forEach(function (k) {
        if (k === 'C') return;
        var t = atoms.filter(function (a) { return a.el === r.s2.at[k] && !a.slot; })[0];
        place(t, k);
      });
      say('Here is the skeleton: every atom bonds to ' + X + (sp.acid ? ', and each H bonds to an O.' : '.') + ' Press Check.');
    } else if (phase === '2t') {
      inputs.used.value = r.used2;
      inputs.left.value = r.left2;
      say(plural(r.bonds, 'bond') + ' × 2 = ' + r.used2 + ', and ' + tally.total + ' − ' + r.used2 + ' = ' + r.left2 + '. Press Check.');
    } else if (phase === '3') {
      /* worked out on the student's own drawing, wherever they put each atom */
      Lewis.filled(s).forEach(function (k) {
        if (k === 'C') return;
        s.lp[k] = 0;
        s.lp[k] = Math.max(0, (Lewis.target(s.at[k]) - Lewis.electrons(s, k)) / 2);
      });
      inputs.left.value = r.left3;
      say('Every outer atom now has 8 (H stays at 2). That used ' + 2 * r.outerLP + ', leaving ' + r.left3 + '. Press Check.');
    } else if (phase === '4') {
      s.lp.C = r.s4.lp.C;
      say('The ' + plural(r.left3, 'leftover electron') + ' go' + (r.left3 === 1 ? 'es' : '') + ' on ' + X + '. Press Check.');
    } else if (phase === '5a') {
      inputs.count.value = Lewis.electrons(s, 'C');
      say(X + ' has ' + Lewis.electrons(s, 'C') + ' electrons around it. Press Check.');
    } else if (phase === '5b') {
      s = Lewis.clone(after4);
      shared = [];
      for (var d = Lewis.pickCanonical(s); d && Lewis.electrons(s, 'C') < 8; d = Lewis.pickCanonical(s)) {
        s.lp[d] -= 1;
        s.bo[d] += 1;
        shared.push(d);
      }
      say(r.moves.length ? 'Lone pairs from the outer atoms became bonds until ' + X + ' had 8. Press Done.'
        : X + ' already had 8, so there is nothing to change. Press Done.');
    }
    paint();
  });

  /* -------------------------------------------------------------- finish */

  function bondSummary() {
    var multi = Lewis.DIRS.filter(function (d) { return s.at[d] && s.bo[d] > 1; }).map(function (d) { return s.bo[d]; });
    if (!multi.length) return X + ' had its octet after Rule 4, so Rule 5 had nothing to do.';
    var words = multi.map(function (b) { return b === 2 ? 'a double bond' : 'a triple bond'; });
    if (multi.length === 2 && multi[0] === multi[1]) words = [multi[0] === 2 ? 'two double bonds' : 'two triple bonds'];
    return 'Rule 5 made ' + words.join(' and ') + ', and ' + X + ' has 8.';
  }

  function finish(quiet) {
    finished = true;
    rule = 6;
    phase = 'done';
    flags = {};
    setHow();
    buildForm();
    paint();
    if (!quiet) say('Done! That is ' + (/ion$/.test(sp.name) ? 'the ' : '') + sp.name + ', ' + sp.text + '. ' +
                    (sp.note || bondSummary()), 'good');
    if (o.onDone && !quiet) o.onDone();
  }

  /* --------------------------------------------------------------- start */

  if (o.done) {
    s = Lewis.clone(sol.s5);
    atoms.forEach(function (t) { t.slot = 'x'; });
    tally = { total: sol.total, used2: sol.used2, left2: sol.left2, outer: 2 * sol.outerLP, left3: sol.left3, center: 2 * sol.centerLP };
    finish(true);
  } else {
    advance(1);
  }

  return {
    node: node,
    destroy: function () { picker.destroy(); },
    /* for the walkthrough test */
    _state: function () { return { rule: rule, phase: phase, s: s, finished: finished }; }
  };
}

/* The formula, big, while nothing is drawn yet. */
Builder.formulaBig = function (sp) {
  return UI.h('div', { class: 'formula-big', 'aria-label': sp.name + ', ' + sp.formula +
    (sp.charge ? ', charge ' + Lewis.chargeText(sp.charge) : '') }, [
    UI.h('span', { class: 'fb-formula', text: sp.text }),
    UI.h('span', { class: 'fb-name', text: sp.name })
  ]);
};

/* The rules on their own (the reference panel and the worked example). */
Builder.rulesList = function (current, doneUpTo) {
  var h = UI.h;
  return h('ol', { class: 'rules' }, RULES.map(function (r) {
    var st = r.n <= doneUpTo ? 'done' : r.n === current ? 'current' : 'todo';
    return h('li', { class: 'rule ' + st }, [
      h('span', { class: 'rule-badge', 'aria-hidden': 'true', text: st === 'done' ? '✓' : String(r.n) }),
      h('span', { class: 'sr', text: 'Rule ' + r.n + ': ' }),
      h('span', { class: 'rule-text' }, [r.title, r.note ? h('span', { class: 'rule-note', text: r.note }) : null])
    ]);
  }));
};

/* Main-group periodic table with group numbers; `mark` lists symbols to
   outline (the ones in the formula being built). */
Builder.periodicTable = function (mark) {
  var h = UI.h;
  mark = mark || [];
  var t = h('table', { class: 'ptable', 'aria-label': 'Periodic table, main-group elements, with group numbers' });
  t.appendChild(h('tr', null, [h('th', { class: 'pt-corner', text: 'Group' })].concat(PERIODIC.groups.map(function (g, i) {
    return h('th', { class: 'pt-group' }, [String(g), h('span', { class: 'pt-a', text: PERIODIC.groupsA[i] })]);
  }))));
  PERIODIC.rows.forEach(function (row, p) {
    t.appendChild(h('tr', null, [h('th', { class: 'pt-period', text: String(p + 1) })].concat(row.map(function (sym) {
      return h('td', { class: 'pt-cell' + (sym ? '' : ' empty') + (mark.indexOf(sym) >= 0 ? ' here' : '') }, [sym]);
    }))));
  });
  return h('div', { class: 'ptable-wrap' }, [t,
    h('p', { class: 'pt-foot', text: 'Rows are periods 1–5. The transition metals (groups 3–12) sit between groups 2 and 13 and are not shown.' })]);
};

/* resonance.js — find every resonance structure.
 *
 * The student starts from the structure after Rule 4 (drawn in the answer's
 * layout) with structure A already found — the one the 5 rules gave them.
 * Each round they redo Rule 5 a different way: click a lone pair on an outer
 * atom to share it, "Add this structure", and it joins the row. When they
 * think they have them all they press "I've found them all".
 *
 *   - a structure they already have: told which one it repeats
 *   - "found them all" too early: told there is still an atom that has not
 *     had the double bond
 *   - sharing a pair when the central atom already has 8: the same messages
 *     as the Lewis builder (period 2: can't; period 3 or below: SNARK)
 *
 * Nothing here is graded.
 */

function ResonanceFinder(o) {
  'use strict';
  var h = UI.h;
  var sp = o.sp, X = sp.center;
  var all = Hybrid.structures(sp), total = all.length;
  var start = Lewis.solve(sp).s4;
  var found = [all[0]];
  var s = Lewis.clone(start), shared = [];
  var finished = false;

  function key(t) { return JSON.stringify([t.lp, t.bo]); }
  function say(t, kind) { o.say(t, kind); }

  var gallery = h('div', { class: 'gallery' });
  var count = h('span', { class: 'hint' });
  var canvas = h('div', { class: 'canvas' });
  var addBtn = h('button', { type: 'button', class: 'primary', text: 'Add this structure' });
  var undoBtn = h('button', { type: 'button', class: 'ghostbtn', text: '↶ Undo last bond' });
  var doneBtn = h('button', { type: 'button', class: 'ghostbtn found-all', text: 'I’ve found them all' });
  var howTo = h('p', { class: 'howto' });
  var title = h('span', { class: 'rule-title', text: 'again — a different way' });
  var btns = h('div', { class: 'btnrow' }, [addBtn, undoBtn, doneBtn]);
  var work = h('section', { class: 'work panel' }, [
    h('div', { class: 'rule-head' }, [h('span', { class: 'rule-num', text: 'Rule 5' }), title]),
    howTo, canvas, btns
  ]);
  var side = h('section', { class: 'panel found-panel' }, [
    h('div', { class: 'panel-head' }, [h('h3', { text: 'Your resonance structures' }), count]),
    gallery
  ]);
  var node = h('div', { class: 'finder' }, [side, work]);

  function paintGallery() {
    gallery.innerHTML = '';
    gallery.appendChild(Hybrid.row(sp, { structures: found, scale: 0.8 }));
    count.textContent = found.length === 1 ? '1 so far' : found.length + ' so far';
  }

  function paint(pulse) {
    canvas.innerHTML = '';
    var e = Lewis.electrons(s, 'C');
    canvas.appendChild(Draw.structure(s, {
      scale: 1.25, lps: finished ? [] : Lewis.filled(s), cls: e < 8 && !finished ? 'share' : '', pulse: pulse,
      lpLabel: function (k) {
        return k === 'C' ? 'Lone pair on the central atom ' + X
          : 'Lone pair on ' + s.at[k] + ' ' + Lewis.WHERE[Lewis.dirOf(k)] + ' the central atom. Press Enter to share it with ' + X + '.';
      }
    }));
    undoBtn.disabled = finished || !shared.length;
    addBtn.disabled = finished;
    doneBtn.disabled = finished;
  }

  function reset() { s = Lewis.clone(start); shared = []; }

  function share(k) {
    if (finished) return;
    if (k === 'C') { say('Rule 5 shares a lone pair from an OUTER atom. ' + X + '’s own lone pairs stay put.'); return; }
    if (Lewis.isOuter(k)) { say('Only an atom bonded straight to ' + X + ' can share a pair with it.'); return; }
    var e = Lewis.electrons(s, 'C');
    if (e >= 8) {
      if (ELEMENTS[X].period >= 3) say(o.snark(sp, e), 'snark');
      else say('That would give ' + X + ' ' + (e + 2) + ' electrons. ' + X + ' is in period 2 and can never have more than 8.', 'bad');
      return;
    }
    s.lp[k] -= 1;
    s.bo[k] += 1;
    shared.push(k);
    paint(k);
    say(Lewis.electrons(s, 'C') >= 8 ? X + ' has 8 again. Press “Add this structure”.' : X + ' still needs more.', '');
  }

  undoBtn.addEventListener('click', function () {
    if (!shared.length || finished) return;
    var k = shared.pop();
    s.lp[k] += 1;
    s.bo[k] -= 1;
    paint();
    say('Took that bond back.');
  });

  addBtn.addEventListener('click', function () {
    if (finished) return;
    var e = Lewis.electrons(s, 'C');
    if (e < 8) {
      say(X + ' has only ' + e + ' electrons — this is the structure after Rule 4. Do Rule 5: click a lone pair on an ' +
          'outer atom to share it with ' + X + '.', 'bad');
      return;
    }
    var k = key(s);
    for (var i = 0; i < found.length; i++) {
      if (key(found[i]) === k) {
        say('You already have that one — it is the same as structure ' + String.fromCharCode(65 + i) + ': the double ' +
            'bond goes to the same ' + s.at[shared[0]] + '. Take it back and pick a different one.', 'bad');
        return;
      }
    }
    found.push(Lewis.clone(s));
    reset();
    paintGallery();
    paint();
    say('Structure ' + String.fromCharCode(64 + found.length) + ' added. Is there another way?', 'good');
  });

  doneBtn.addEventListener('click', function () {
    if (finished) return;
    if (found.length < total) {
      var used = {};
      found.forEach(function (t) { Lewis.DIRS.forEach(function (d) { if (t.at[d] && t.bo[d] > 1) used[d] = 1; }); });
      var unused = Lewis.DIRS.filter(function (d) { return start.at[d] && start.at[d] !== 'H' && !used[d]; });
      var el = start.at[unused[0]];
      say('Not yet: ' + (unused.length === 1 ? 'one ' + el + ' has' : unused.length + ' ' + el + ' atoms have') +
          ' not had the double bond yet.', 'bad');
      return;
    }
    finish(false);
  });

  function finish(quiet) {
    finished = true;
    found = all.slice();
    paintGallery();
    reset();
    paint();
    /* nothing left to do in the work area: just the message */
    canvas.hidden = true;
    btns.hidden = true;
    title.textContent = '— every way found';
    howTo.textContent = 'All ' + total + ' found. That is how chemists write resonance: every structure, with a double-headed ' +
      'arrow (↔) between them. The atoms never move — only electrons do.';
    if (!quiet) {
      say('That’s all ' + total + '. Each one follows all 5 rules, and each one is the same structure turned around — ' +
          'equivalent resonance structures. Next: what the real ' + sp.name + ' looks like.', 'good');
      if (o.onDone) o.onDone();
    }
  }

  function delegate(ev) {
    if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
    var t = ev.target.closest ? ev.target.closest('.lp.active') : null;
    if (!t || !canvas.contains(t)) return;
    if (ev.type === 'keydown') ev.preventDefault();
    share(t.getAttribute('data-slot'));
  }
  canvas.addEventListener('click', delegate);
  canvas.addEventListener('keydown', delegate);

  howTo.textContent = 'Structure A is the one the 5 rules gave you. Below is the structure after Rule 4 again. Do Rule 5 a ' +
    'DIFFERENT way: click a lone pair on a different outer atom, then “Add this structure”. Keep going until there are no ' +
    'new ways left.';
  paintGallery();
  paint();
  if (o.done) finish(true);

  return { node: node, destroy: function () {}, _found: function () { return found.length; } };
}

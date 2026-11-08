/* app.js: the virtual hydrate lab. One bench (scene.js), one magnifier (lens.js) and a short list of steps; steps 5 to 7
 * (heat, cool, mass) repeat until the mass is constant (at least 3 heatings, at most 5). The data tables and
 * calculations are on the paper lab sheet, so nothing here asks for a typed answer and no score is sent: the activity
 * marks itself completed when the student reaches the last step.
 *
 * The state `st` holds everything that happened; paint() draws the bench and the magnifier from it, so Back and Next
 * always show the right scene. The numbers on the balance come from Lab (data.js), from a seed (saved).
 */

var App = (function () {
  'use strict';

  var h = UI.h;
  var SCHEMA = 1;
  var q = new URLSearchParams(location.search);
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || q.get('speed') === '0';
  /* the teaching motions (crystals falling, water leaving) stay on even with reduced motion, only a little quicker. ?speed=0 skips them (for the tools). */
  var motion = q.get('speed') === '0' ? 0 : (reduced ? 0.7 : 1);

  var seed, d, scene, lens, picker, runMemo = null;
  var st = {
    step: 0, w1: false, back1: false, boatOnPan: false, clicks: 0, bottleOver: false, poured: false, powder: false, w2: false, lidLift: false, seated: false,
    k: 1, v: 0, T: 0, heatP: 0, heatDone: false, cooled: false, clock: 0, wk: false, ret: false
  };
  var el = {}, busy = false, tickN = 0;

  var STEPS = [
    { id: 'intro', name: 'Start' },
    { id: 'weigh1', name: 'Mass the crucible' },
    { id: 'dispense', name: 'Measure out the hydrate' },
    { id: 'pour', name: 'Put the hydrate in the crucible' },
    { id: 'setup', name: 'Set up the heating' },
    { id: 'heat', name: 'Heat' },
    { id: 'cool', name: 'Cool' },
    { id: 'weigh', name: 'Mass the crucible' },
    { id: 'done', name: 'Finished' }
  ];
  var last = STEPS.length - 1;

  var TILES = { cruc: 'Crucible and lid', boat: 'Weigh boat', hbottle: 'Bottle of hydrate' };

  /* ------------------------------------------------------------ helpers */

  /* the end of the scale is the perfect height: the tip of the flame just touches the bottom of the crucible, never inside it */
  function flameH() { return st.v < 0.02 ? 0 : 30 + st.v * (Scene.FLAME_TOUCH - 30); }
  function touching() { return st.v >= 0.9; }
  function say(text, kind) { if (!el.say) return; el.say.textContent = text || ''; el.say.className = 'say' + (kind ? ' ' + kind : ''); }
  function save() { SCORM.saveState({ schema: SCHEMA, seed: seed }); }

  function mh() { return Lab.inCrucible(d, st.clicks); }                      /* the hydrate that went into the crucible */
  function R() { var m = mh(); if (!runMemo || runMemo.m !== m) runMemo = { m: m, r: Lab.run(d, m) }; return runMemo.r; }
  function crystalsFor(c) { var n = 0; for (var i = 0; i < c; i++) n += Math.round(d.amounts[i] * 60); return n; }
  function stepName() { var id = STEPS[st.step].id; return id === 'heat' ? 'Heating ' + st.k : (id === 'cool' ? 'Cool after heating ' + st.k : (id === 'weigh' ? 'Mass after heating ' + st.k : STEPS[st.step].name)); }
  function final() { return st.k >= R().K; }                                    /* the mass is constant after this weighing */

  function reading() {
    var id = STEPS[st.step].id;
    if (id === 'weigh1') return st.w1 && !st.back1 ? d.cruc : 0;
    if (id === 'dispense') return st.boatOnPan ? Lab.dispensed(d, st.clicks) : 0;
    if (id === 'pour') return !st.poured ? (st.boatOnPan ? Lab.dispensed(d, st.clicks) : 0) : (st.w2 ? Lab.r4(d.cruc + mh()) : 0);
    if (id === 'setup') return st.seated ? 0 : Lab.r4(d.cruc + mh());
    if (id === 'weigh') return st.wk && !st.ret ? Lab.reading(d, mh(), st.k) : 0;
    if (id === 'done') return Lab.reading(d, mh(), R().K);
    return 0;
  }

  function canNext() {
    switch (STEPS[st.step].id) {
      case 'weigh1': return st.back1;
      case 'dispense': return Lab.dispensed(d, st.clicks) >= Lab.MIN_SOLID;
      case 'pour': return st.w2;
      case 'setup': return st.seated;
      case 'heat': return st.heatDone;
      case 'cool': return st.cooled;
      case 'weigh': return st.wk && (final() || st.ret);
      case 'done': return false;
      default: return true;
    }
  }

  /* how hydrated the solid is now (1 = blue crystals with all their water, 0 = white) */
  function hydration() {
    if (!st.poured) return 1;
    var id = STEPS[st.step].id, hy = R().hyd;
    if (id === 'heat') return hy[st.k - 1] + (hy[st.k] - hy[st.k - 1]) * (st.heatDone ? 1 : st.heatP);
    if (id === 'cool' || id === 'weigh') return hy[st.k];
    if (id === 'done') return hy[R().K];
    return 1;
  }

  /* ------------------------------------------------------------ the bench and the magnifier, from the state */

  function syncPile() {
    if (busy) return;
    var id = STEPS[st.step].id;
    var want = (id === 'dispense' || (id === 'pour' && !st.poured)) ? crystalsFor(st.clicks) : 0;
    if (scene.pileCount() !== want) { scene.clearPile(); if (want) scene.addCrystals(want, null, true); }
  }

  function paint() {
    var n = st.step, id = STEPS[n].id;
    scene.setPlaced('stand', true);
    scene.setPlaced('tri', true);
    scene.setPlaced('burner', n >= 4);
    scene.setReading(Lab.fmt(reading()));
    scene.turnHint(id === 'heat' && st.v < 0.02 && !st.heatDone);
    scene.setCollar(st.v);
    scene.setFlame(flameH());
    scene.setHot(st.T);

    var cloc = 'padloc';
    if (id === 'weigh1') cloc = st.w1 && !st.back1 ? 'pan' : 'padloc';
    else if (id === 'pour') cloc = st.w2 ? 'pan' : 'padloc';
    else if (id === 'setup') cloc = st.seated ? 'tri' : 'pan';
    else if (id === 'heat' || id === 'cool') cloc = 'tri';
    else if (id === 'weigh') cloc = st.wk && !st.ret ? 'pan' : 'tri';
    else if (id === 'done') cloc = 'pan';
    scene.place(cloc);
    scene.setLid(st.lidLift ? 'lift' : ((id === 'heat' || id === 'cool' || (id === 'setup' && st.seated)) ? 'crack' : 'closed'));
    scene.setPowder(st.powder ? 1 : 0, hydration());

    scene.placeBoat(id === 'dispense' ? (st.boatOnPan ? 'pan' : 'bench') : (id === 'pour' && !st.poured && st.boatOnPan ? 'pan' : 'bench'));
    scene.bottle(id === 'dispense' && st.bottleOver);
    syncPile();
    lens.node.style.display = n >= 5 ? '' : 'none';

    var targets = {
      weigh1: [st.w1 ? 'pad' : 'pan'],
      dispense: !st.boatOnPan ? ['pan'] : (!st.bottleOver ? ['over'] : []),
      pour: !st.poured ? ['cruc'] : (!st.w2 ? ['pan'] : []),
      setup: ['seat'],
      weigh: !st.wk ? ['pan'] : (!final() && !st.ret ? ['seat'] : [])
    }[id] || [];
    scene.showTargets(targets);
  }

  function lensSync() {
    var n = st.step;
    if (n >= 5) lens.show(hydration()); else lens.show(1);
  }

  function p(t) { return h('p', { text: t }); }

  function burnerControl() {
    var out = h('output', { class: 'flame-out', 'aria-live': 'polite' });
    var rng = h('input', { type: 'range', min: 0, max: 100, value: Math.round(st.v * 100), id: 'collar', 'aria-label': 'Turn the bottom of the burner to change the flame height' });
    function upd() {
      st.v = rng.value / 100;
      out.textContent = flameH() === 0 ? 'Burner off' : (touching() ? 'The tip of the flame touches the bottom of the crucible' : 'The flame is too short to reach the crucible');
      scene.setCollar(st.v); scene.setFlame(flameH()); scene.turnHint(st.v < 0.02);
    }
    rng.addEventListener('input', upd);
    var box = h('div', { class: 'ctl' }, [h('label', { for: 'collar', text: 'Turn the bottom of the burner (flame height)' }), rng, out]);
    el.rng = rng; el.flameOut = out; upd();
    return box;
  }

  function shakeControl() {
    var b = h('button', { type: 'button', class: 'btn primary', id: 'shake', text: 'Shake out some solid' });
    b.disabled = !(st.boatOnPan && st.bottleOver);
    b.addEventListener('click', shake);
    var out = h('output', { class: 'drops', 'aria-live': 'polite', text: st.clicks + (st.clicks === 1 ? ' shake' : ' shakes') });
    el.shakes = out;
    return h('div', { class: 'ctl' }, [b, out]);
  }

  function clockControl() {
    var out = h('output', { class: 'clock', 'aria-live': 'polite' });
    var b = h('button', { type: 'button', class: 'btn primary', id: 'skip', text: 'Skip ahead 5 minutes' });
    function show() { out.textContent = Math.floor(st.clock) + ':' + (('0' + Math.floor((st.clock % 1) * 60)).slice(-2)) + ' of 5:00'; }
    b.addEventListener('click', function () {
      if (st.cooled || busy) return;
      busy = true; b.disabled = true;
      var run = function () {
        st.clock = Math.min(5, st.clock + (reduced ? 5 : 0.1));
        st.T = Math.max(0, 1 - st.clock / 5) * 0.8; scene.setHot(st.T); show();
        if (st.clock >= 5) { st.cooled = true; busy = false; say('The crucible has cooled to room temperature.', 'good'); setNav(); return; }
        setTimeout(run, 100);
      };
      run();
    });
    show();
    if (st.cooled) b.disabled = true;
    el.clockShow = show;
    return h('div', { class: 'ctl' }, [b, out]);
  }

  var BODY = {
    intro: function () {
      return [
        p('Some solids trap water inside their crystals. They are called hydrates, and the water is part of the crystal structure. This blue solid is copper(II) sulfate hydrate.'),
        p('Heating drives the water off as a gas and leaves a white solid with no water. You will heat, cool and mass the crucible until the mass stops changing, then use the masses to find how many water molecules go with each CuSO₄.'),
        p('Keep your lab sheet beside you. Every number goes on the paper: this lab only shows what you would do and see.')
      ];
    },
    weigh1: function () { return [p(!st.w1 ? 'Put the crucible and its lid on the balance. Write the reading in Box 1 on your sheet.' : 'Now take the crucible and lid off the balance and set them back on the ceramic pad.')]; },
    dispense: function () {
      return [p(!st.boatOnPan ? 'Put the weigh boat on the balance. The balance is set to zero with the boat on it.' :
        (!st.bottleOver ? 'Now bring the bottle of hydrate, mouth down, right above the weigh boat.' :
          'Click the bottle to shake out some solid. Keep going until you have about 2 g (at least 1.5 g), then press Next.')), shakeControl()];
    },
    pour: function () {
      return [p(!st.poured ? 'Pick up the weigh boat and pour the solid into the crucible.' : (!st.w2 ? 'Put the crucible, lid and solid on the balance. Write the reading in Box 2 on your sheet.' : 'Write the reading in Box 2 on your sheet.'))];
    },
    setup: function () {
      return [p('The ring stand, clay triangle and burner are set up for you. Lift the crucible off the balance and set it, with its lid, in the clay triangle.')];
    },
    heat: function () {
      return [p('Turn the bottom of the burner up to the end of the scale. That puts the tip of the flame just on the bottom of the crucible. The lid is on with a small crack so the water can escape. Heat until the water stops leaving.'), burnerControl()];
    },
    cool: function () {
      return [p('Turn the burner off and let the crucible cool for 5 minutes (a hot crucible would make the balance drift). Here the 5 minutes can be skipped.'), clockControl()];
    },
    weigh: function () {
      return [p(!st.wk ? 'Put the crucible, lid and solid on the balance. Write the reading in the Heating ' + st.k + ' row of your table.' :
        (final() ? 'Write the reading in the Heating ' + st.k + ' row of your table.' : 'Write the reading in the Heating ' + st.k + ' row of your table, then put the crucible back in the clay triangle.'))];
    },
    done: function () {
      return [p('All the readings are on your sheet. Use them to do the calculations.'),
        h('ul', { class: 'recap' }, [
          h('li', { text: 'The blue hydrate lost its water as a gas when it was heated. The white solid left is CuSO₄ with no water.' }),
          h('li', { text: 'You heated, cooled and massed until the last two masses agreed. If the mass is still dropping, there is still water in the solid.' }),
          h('li', { text: 'The water lost is the mass before heating minus the mass after the last heating. Real data are never exact, so your ratio will be near a whole number, not exactly one.' })
        ])];
    }
  };

  function tilesFor(id) {
    if (id === 'weigh1') return st.back1 ? [] : ['cruc'];
    if (id === 'dispense') return !st.boatOnPan ? ['boat'] : (!st.bottleOver ? ['hbottle'] : []);
    if (id === 'pour') return !st.poured ? ['boat'] : (!st.w2 ? ['cruc'] : []);
    if (id === 'setup') return !st.seated ? ['cruc'] : [];
    if (id === 'weigh') return !st.wk ? ['cruc'] : (!final() && !st.ret ? ['cruc'] : []);
    return [];
  }

  /* ------------------------------------------------------------ actions */

  function drop(target, key) {
    var id = STEPS[st.step].id;
    if (busy) return;
    if (id === 'weigh1' && key === 'cruc') {
      if (!st.w1) {
        if (target !== 'pan') { say('The balance pan is on the right. Put the crucible there.', 'bad'); return; }
        st.w1 = true; say('Write this reading in Box 1. Then set the crucible back on the ceramic pad.', 'good');
      } else {
        if (target !== 'pad') { say('Set the crucible back on the ceramic pad, the oval on the wire gauze.', 'bad'); return; }
        st.back1 = true; say('Good. The crucible is back on the pad.', 'good');
      }
    } else if (id === 'dispense') {
      if (key === 'boat') {
        if (target !== 'pan') { say('Put the weigh boat on the balance pan.', 'bad'); return; }
        st.boatOnPan = true; say('The balance reads zero with the boat on it.', 'good');
      } else if (key === 'hbottle') {
        if (target !== 'over') { say('Hold the bottle, mouth down, right above the weigh boat.', 'bad'); return; }
        st.bottleOver = true; say('Click the bottle (or press the button) to shake some solid into the boat.', 'good');
      }
    } else if (id === 'pour') {
      if (key === 'boat') {
        if (target !== 'cruc') { say('Pour it into the crucible on the ceramic pad.', 'bad'); return; }
        st.poured = true; st.lidLift = true; busy = true;
        scene.clearPile(); scene.setPowder(0, 1);
        say('The solid is in the crucible. Now put the crucible, lid and solid on the balance.', 'good');
        render();
        scene.pourFall(function () { st.powder = true; st.lidLift = false; busy = false; paint(); setNav(); });
        return;
      } else if (key === 'cruc') {
        if (target !== 'pan') { say('Put it on the balance pan.', 'bad'); return; }
        st.w2 = true; say('Write this reading in Box 2. It is the crucible, lid and hydrate together.', 'good');
      }
    } else if (id === 'setup') {
      if (key !== 'cruc' || target !== 'seat') { say('The crucible goes in the clay triangle.', 'bad'); return; }
      st.seated = true; say('The crucible sits in the triangle with its lid on, a small crack open.', 'good');
    } else if (id === 'weigh' && key === 'cruc') {
      if (!st.wk) {
        if (target !== 'pan') { say('Put it on the balance pan.', 'bad'); return; }
        st.wk = true;
        say(final() ? 'The last two readings agree within 0.01 g: the mass is constant, so the water is all gone. Do the calculations on your sheet.' :
          'The mass is still dropping, so there is still water in the solid. Heat again.', final() ? 'good' : '');
      } else {
        if (target !== 'seat') { say('Put the crucible back in the clay triangle.', 'bad'); return; }
        st.ret = true; say('Good. The crucible is back in the triangle.', 'good');
      }
    }
    render();
  }

  /* one shake: crystals fall from the bottle's mouth into the boat */
  function shake() {
    if (busy || STEPS[st.step].id !== 'dispense' || !st.boatOnPan || !st.bottleOver) return;
    if (Lab.dispensed(d, st.clicks) >= Lab.MAX_SOLID || st.clicks >= Lab.CLICKS) { say('That is plenty. You do not need more than about 3 g.', ''); return; }
    busy = true;
    var n = Math.round(d.amounts[st.clicks] * 60);
    scene.addCrystals(n, function () {
      st.clicks++;
      busy = false;
      var m = Lab.dispensed(d, st.clicks);
      say(m < Lab.MIN_SOLID ? 'Keep going: you need about 2 g.' : (m < 2.6 ? 'That is enough. Press Next, or add a little more.' : 'That is plenty. Press Next.'), m < Lab.MIN_SOLID ? '' : 'good');
      if (el.shakes) el.shakes.textContent = st.clicks + (st.clicks === 1 ? ' shake' : ' shakes');
      paint(); setNav();
    });
  }

  /* the heat model: 10 ticks a second */
  function tick(n) {
    for (var i = 0; i < (n || 1); i++) {
      var id = STEPS[st.step].id, hgt = flameH(), touch = touching();
      if (hgt > 0) st.T = Math.min(touch ? 1 : 0.45, st.T + (touch ? 0.025 : 0.004)); else if (id !== 'cool') st.T = Math.max(0, st.T - 0.012);
      scene.setHot(st.T);
      if (id === 'heat' && !st.heatDone && touch && st.T > 0.6) {
        st.heatP = Math.min(1, st.heatP + 0.011);
        var hy = hydration();
        var left = lens.heat(hy);
        scene.setPowder(1, hy);
        if (left > 0 && tickN % 3 === 0) scene.wisps(1, 'H₂O');
        else if (tickN % 14 === 0 && st.heatP < 0.9) scene.wisps(1, 'H₂O');
        if (tickN % 5 === 0 && st.heatP < 0.97) scene.puff('steam', 1);
        if (st.heatP >= 1) { st.heatDone = true; say('The water has stopped leaving. Turn the burner off and let it cool.', 'good'); setNav(); }
      }
      tickN++;
    }
  }

  /* ------------------------------------------------------------ the page */

  /* the big summary on the bench: what to do right now */
  function goalText() {
    switch (STEPS[st.step].id) {
      case 'intro': return 'Read the plan, then press Begin.';
      case 'weigh1': return !st.w1 ? 'Drag the crucible and lid onto the balance.' : 'Drag the crucible back to the ceramic pad.';
      case 'dispense': return !st.boatOnPan ? 'Drag the weigh boat onto the balance.' : (!st.bottleOver ? 'Drag the bottle, mouth down, above the boat.' : 'Click the bottle to shake out about 2 g.');
      case 'pour': return !st.poured ? 'Drag the weigh boat over the crucible to pour.' : 'Drag the crucible onto the balance.';
      case 'setup': return 'Drag the crucible into the clay triangle.';
      case 'heat': return st.heatDone ? 'Heating ' + st.k + ' is done.' : 'Heating ' + st.k + ': raise the flame to the end of the scale.';
      case 'cool': return st.cooled ? 'The crucible has cooled.' : 'Skip ahead 5 minutes while it cools.';
      case 'weigh': return !st.wk ? 'Drag the crucible onto the balance.' : (final() ? 'The mass is constant.' : 'Still dropping: drag the crucible back to the triangle.');
      default: return 'Finished: do the calculations on your sheet.';
    }
  }

  /* when a step's job is done, move on by itself after a pause (long enough to read the balance or watch the result) */
  function autoMs() {
    switch (STEPS[st.step].id) {
      case 'weigh1': return 900;
      case 'pour': return 1600;
      case 'setup': return 900;
      case 'heat': return 2500;
      case 'cool': return 1500;
      case 'weigh': return final() ? 3000 : 900;
      default: return null;
    }
  }
  var advTimer = null;
  function checkAdvance() {
    var at = st.step, ms = autoMs();
    if (advTimer || ms == null || !canNext()) return;
    advTimer = setTimeout(function () {
      advTimer = null;
      if (st.step === at && canNext()) next();
    }, ms);
  }

  function canBack() { var id = STEPS[st.step].id; return st.step > 0 && !(id === 'pour' && st.poured) && !(id === 'heat' && st.k > 1); }

  function setNav() {
    var id = STEPS[st.step].id;
    el.navs.forEach(function (n) {
      n.back.disabled = !canBack();
      n.next.disabled = !canNext();
      n.next.textContent = id === 'intro' ? 'Begin' : (id === 'done' ? 'Done' : 'Next');
      n.next.hidden = id === 'done';
      n.pos.textContent = id === 'heat' || id === 'cool' || id === 'weigh' ? 'Heating ' + st.k : (st.step + 1) + ' of ' + STEPS.length;
    });
    el.stepname.textContent = stepName();
    if (el.goal) el.goal.textContent = goalText();
    checkAdvance();
  }

  /* Next: from the weighing, heat again (a new round) unless the mass is constant */
  function next() {
    if (!canNext()) return;
    if (STEPS[st.step].id === 'weigh' && !final()) { st.k++; st.heatP = 0; st.heatDone = false; st.cooled = false; st.clock = 0; st.wk = false; st.ret = false; go(5); return; }
    go(st.step + 1);
  }

  function navBar() {
    var back = h('button', { type: 'button', class: 'btn', text: 'Back' }), nextB = h('button', { type: 'button', class: 'btn primary', text: 'Next' });
    var pos = h('span', { class: 'pos' });
    back.addEventListener('click', function () { if (canBack()) go(st.step - 1); });
    nextB.addEventListener('click', next);
    var node = h('div', { class: 'nav' }, [back, pos, nextB]);
    return { node: node, back: back, next: nextB, pos: pos };
  }

  function go(n) {
    n = Math.max(0, Math.min(last, n));
    st.step = n;
    if (advTimer) { clearTimeout(advTimer); advTimer = null; }
    /* a jump forward (Back and Next, or ?step=) leaves everything before it done */
    if (n > 1) { st.w1 = true; st.back1 = true; }
    if (n > 2) { if (st.clicks === 0) { var c = 0; while (Lab.dispensed(d, c) < 2.0) c++; st.clicks = c; } st.boatOnPan = true; st.bottleOver = true; }
    if (n > 3) { st.poured = true; st.powder = true; st.w2 = true; }
    if (n > 4) { st.seated = true; }
    if (n === 6 || n === 7) { st.heatDone = true; st.heatP = 1; }
    if (n === 7) { st.cooled = true; st.T = 0; }
    if (n === 8) { st.k = R().K; st.heatDone = true; st.heatP = 1; st.cooled = true; st.wk = true; st.T = 0; }
    if (n === 5) { st.v = 0; st.T = Math.min(st.T, 0.2); }
    if (n === 6) { st.v = 0; if (!st.cooled) st.clock = 0; }
    if (n < 3) { st.poured = n > 3; }
    if (n === 8) SCORM.markComplete();
    save();
    render();
  }

  function render() {
    var id = STEPS[st.step].id;
    if (picker) picker.destroy();
    el.body.innerHTML = '';
    BODY[id]().forEach(function (nd) { el.body.appendChild(nd); });
    el.tray.innerHTML = '';
    var tl = tilesFor(id);
    tl.forEach(function (k) { el.tray.appendChild(h('button', { type: 'button', class: 'tile', 'data-tile': k, text: TILES[k] })); });
    el.tray.hidden = !el.tray.firstChild;
    /* the pieces on the bench can be picked up directly, as well as from the tray */
    [['cruc', tl.indexOf('cruc') >= 0 ? 'cruc' : null], ['boat', tl.indexOf('boat') >= 0 ? 'boat' : null], ['bottle', tl.indexOf('hbottle') >= 0 ? 'hbottle' : null]].forEach(function (a) {
      var nd = scene.nodes[a[0]];
      if (a[1]) nd.setAttribute('data-tile', a[1]); else nd.removeAttribute('data-tile');
      nd.classList.toggle('grab', !!a[1]);
    });
    scene.nodes.bottle.classList.toggle('press', id === 'dispense' && st.bottleOver);
    picker = Picker({ tray: el.tray, stage: scene.node, can: function (k) { return tilesFor(STEPS[st.step].id).indexOf(k) >= 0; }, ghost: function (k) { return scene.ghost(k === 'hbottle' ? 'hbottle' : k); },
      prompt: function (key) { return 'Now click the highlighted place for the ' + TILES[key].toLowerCase() + '.'; },
      label: function (key) { return TILES[key]; }, drop: drop });
    if (!el.say.textContent || st.step !== el.lastStep) say('');
    el.lastStep = st.step;
    lensSync(); paint(); setNav();
  }

  function init() {
    var app = document.getElementById('app');
    var connected = SCORM.init();
    var saved = SCORM.loadState();
    seed = q.get('seed') ? parseInt(q.get('seed'), 10) : (saved && saved.schema === SCHEMA && saved.seed ? saved.seed : (Math.floor(Math.random() * 2147483646) + 1));
    d = Lab.make(seed);
    var lms = document.getElementById('lms');
    lms.textContent = connected ? 'Connected to your class' : 'Not connected to a class (practice mode)';
    lms.className = 'lms ' + (connected ? 'on' : 'off');
    save();

    scene = Scene.create({ speed: motion });
    lens = Lens.create({ speed: motion });
    el.stepname = document.getElementById('stepname');
    el.navs = [navBar(), navBar()];
    el.body = h('div', { class: 'body' });
    el.tray = h('div', { class: 'tray', 'aria-label': 'Equipment to place' });
    el.say = h('p', { class: 'say', role: 'status', 'aria-live': 'polite' });
    el.goal = h('div', { class: 'goal', 'aria-live': 'polite' });
    var left = h('div', { class: 'left' }, [h('div', { class: 'scenewrap' }, [h('div', { class: 'scenebox' }, [scene.node, el.goal, lens.node])])]);
    document.getElementById('topnav').appendChild(el.navs[0].node);
    var right = h('div', { class: 'right' }, [el.body, el.tray, el.say, el.navs[1].node]);
    app.appendChild(left); app.appendChild(right);

    /* clicking the bottle shakes out solid (the picker takes over while it can still be dragged) */
    scene.nodes.bottle.addEventListener('click', function () { if (STEPS[st.step].id === 'dispense' && st.bottleOver) shake(); });

    var start = parseInt(q.get('step'), 10);
    var kk = parseInt(q.get('k'), 10);
    setInterval(function () { tick(1); }, 100);
    if (!isNaN(start) && start >= 5 && !isNaN(kk)) { go(4); st.k = kk; }
    go(isNaN(start) ? 0 : start);
  }

  document.addEventListener('DOMContentLoaded', init);

  /* for the tools */
  return {
    state: st, go: go, tick: tick, drop: drop, shake: shake, next: next, data: function () { return d; }, run: R, steps: STEPS, scene: function () { return scene; }, lens: function () { return lens; },
    canNext: canNext, setFlame: function (v) { st.v = v; if (el.rng) el.rng.value = Math.round(v * 100); paint(); }, busy: function () { return busy; }
  };
})();

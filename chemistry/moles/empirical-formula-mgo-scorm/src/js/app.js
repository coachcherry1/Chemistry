/* app.js: the virtual lab. One bench (scene.js), one magnifier (lens.js) and a short list of steps. The data tables
 * and calculations are on the paper lab sheet, so nothing here asks for a typed answer and no score is sent: the
 * activity marks itself completed when the student reaches the last step.
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

  var seed, d, scene, lens, picker;
  var st = {
    step: 0, w1: false, mgOnPan: false, mgInCruc: false, placed: { burner: false }, seated: false, lidOff: false, bottleOver: false,
    v: 0, T: 0, ignited: false, burn: 0, burnDone: false, glow: 0, drops: 0, wetness: 0, dried: false, cooled: false, clock: 0, w8: false
  };
  var el = {}, busy = false, tickN = 0;

  var STEPS = [
    { id: 'intro', name: 'Start' },
    { id: 'weigh1', name: 'Mass the crucible' },
    { id: 'weigh2', name: 'Mass the magnesium' },
    { id: 'setup', name: 'Set up the heating' },
    { id: 'burn', name: 'Burn the magnesium' },
    { id: 'water', name: 'Add water' },
    { id: 'dry', name: 'Heat again' },
    { id: 'cool', name: 'Cool' },
    { id: 'weigh3', name: 'Mass the product' },
    { id: 'done', name: 'Finished' }
  ];
  var last = STEPS.length - 1;

  var TILES = {
    cruc: 'Crucible and lid', mg: 'Piece of magnesium', mgcruc: 'Crucible and lid, with the magnesium in it',
    burner: 'Bunsen burner', lid: 'Crucible lid', bottle: 'DI water bottle'
  };

  /* ------------------------------------------------------------ helpers */

  /* the end of the scale is the perfect height: the tip of the flame just touches the bottom of the crucible, never inside it */
  function flameH() { return st.v < 0.02 ? 0 : 30 + st.v * (Scene.FLAME_TOUCH - 30); }
  function touching() { return st.v >= 0.9; }
  function say(text, kind) { if (!el.say) return; el.say.textContent = text || ''; el.say.className = 'say' + (kind ? ' ' + kind : ''); }
  function save() { SCORM.saveState({ schema: SCHEMA, seed: seed }); }

  function reading() {
    if (st.step === 1) return st.w1 ? d.cruc : 0;
    if (st.step === 2) return st.mgInCruc ? Lab.r4(d.cruc + d.mg) : (st.mgOnPan ? d.mg : 0);
    if (st.step === 8) return st.w8 ? Lab.finalTotal(d, st.drops) : 0;
    return 0;
  }

  function canNext() {
    switch (STEPS[st.step].id) {
      case 'weigh1': return st.w1;
      case 'weigh2': return st.mgInCruc;
      case 'setup': return st.seated;
      case 'burn': return st.burnDone;
      case 'water': return st.drops > 0;
      case 'dry': return st.dried;
      case 'cool': return st.cooled;
      case 'weigh3': return st.w8;
      case 'done': return false;
      default: return true;
    }
  }

  /* ------------------------------------------------------------ the bench and the magnifier, from the state */

  function paint() {
    var n = st.step, id = STEPS[n].id;
    var early = n <= 2, heating = n >= 3;
    scene.setPlaced('stand', true);
    scene.setPlaced('tri', true);
    scene.setPlaced('burner', st.placed.burner || n > 3);
    scene.setReading(Lab.fmt(reading()));
    scene.turnHint((id === 'burn' || id === 'dry') && st.v < 0.02);
    scene.setCollar(st.v);
    scene.setFlame(flameH());
    scene.setHot(st.T);

    if (early) {
      scene.setMg(id === 'weigh2' ? (st.mgInCruc ? 'cruc' : (st.mgOnPan ? 'pan' : 'bench')) : 'bench');
      scene.place(id === 'weigh1' && st.w1 ? 'pan' : (id === 'weigh2' && st.mgInCruc ? 'pan' : 'bench'));
      scene.setLid('closed');
      scene.setAsh(0); scene.setNitride(0);
    } else {
      scene.place((n === 3 && !st.seated) ? 'bench' : (n === 8 && st.w8 ? 'pan' : (n === 8 || n === 9 ? (st.w8 ? 'pan' : 'tri') : 'tri')));
      if (n === 3 && !st.seated) scene.setLid('closed');
      else if (n >= 8) scene.setLid('closed');
      else if (id === 'water' && st.lidOff) scene.setLid('pad');
      else scene.setLid('crack');
      scene.setMg(st.burn > 0.3 || n > 4 ? 'hidden' : 'cruc');
      scene.setAsh(st.burn > 0 ? Math.min(1, st.burn * 1.2) : 0, st.drops > 0 && !st.dried);
      var left = lens.nitrideLeft('water', st.drops);
      scene.setNitride(st.burnDone && !st.dried ? 0.8 * (left / 6) : 0);
    }
    scene.bottle(id === 'water' && st.bottleOver);
    scene.setGlow(st.glow);

    var targets = { weigh1: ['pan'], weigh2: ['pan'], setup: ['seat', 'burner'], weigh3: ['pan'], water: !st.lidOff ? ['pad'] : (!st.bottleOver ? ['over'] : []) }[id] || [];
    scene.showTargets(targets);
  }

  /* the magnifier jumps to the right state when a step is entered; during play it animates (burn, water, dry) */
  function lensSync() {
    var n = st.step;
    if (n <= 3) lens.show('start', 0);
    else if (n === 4) lens.show(st.burnDone ? 'burned' : 'burn', st.burn);
    else if (n === 5) lens.show('water', st.drops);
    else lens.show(st.dried ? 'dried' : 'water', st.drops);
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

  function waterControl() {
    var count = h('output', { class: 'drops', 'aria-live': 'polite', text: st.drops + ' drops' });
    var b = h('button', { type: 'button', class: 'btn primary', id: 'drop', text: 'Add 1 drop of DI water' });
    b.disabled = !st.bottleOver;
    b.addEventListener('click', addDrop);
    return h('div', { class: 'ctl' }, [b, count]);
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
        p('Magnesium burns in air. Most of the magnesium joins oxygen and makes MgO, but a little joins nitrogen from the air and makes magnesium nitride, Mg₃N₂.'),
        p('A few drops of water fix that: Mg₃N₂ + 6 H₂O → 3 Mg(OH)₂ + 2 NH₃. Heating then turns the Mg(OH)₂ into MgO.'),
        p('Keep your lab sheet beside you. Every number goes on the paper: this lab only shows what you would do and see.')
      ];
    },
    weigh1: function () { return [p('Put the crucible and its lid on the balance pan. Write the reading in Box 1 on your sheet.')]; },
    weigh2: function () {
      return [p(st.mgInCruc ? 'The magnesium is in the crucible. Write the reading in Box 3 on your sheet.' :
        (st.mgOnPan ? 'Write the mass of the magnesium in Box 2. Then put the magnesium in the crucible and weigh them together.' :
          'Put the piece of magnesium on the balance. Write its mass in Box 2 on your sheet.'))];
    },
    setup: function () {
      return [p('Set up the heating. Put the ring stand, the clay triangle and the burner in place. Then set the crucible in the clay triangle.')];
    },
    burn: function () {
      return [p('Turn the bottom of the burner up to the end of the scale. That puts the tip of the flame just on the bottom of the crucible. The lid is on with a small crack so air can get in.'), burnerControl()];
    },
    water: function () {
      return [p(!st.lidOff ? 'Let the crucible cool. Take the lid off and set it on the ceramic pad.' : (!st.bottleOver ? 'Now bring the DI water bottle right above the open crucible.' : 'Add 6 to 7 drops of DI water, one at a time. Watch the gas rise.')), waterControl()];
    },
    dry: function () {
      return [p('The lid goes back on with a small crack. Heat again to drive off the water: raise the flame to the end of the scale until the steam stops.'), burnerControl()];
    },
    cool: function () {
      return [p('Turn the burner off and let the crucible cool for 5 minutes. Here the 5 minutes can be skipped.'), clockControl()];
    },
    weigh3: function () { return [p('Put the crucible, lid and product on the balance. Write the reading in Box 4 on your sheet, then do the calculations in Box 5.')]; },
    done: function () {
      return [p('All the readings are on your sheet. Use them to do the calculations in Box 5.'),
        h('ul', { class: 'recap' }, [
          h('li', { text: 'Mg + O₂ made MgO. Some Mg also joined N₂ and made Mg₃N₂.' }),
          h('li', { text: 'Water turned the Mg₃N₂ into Mg(OH)₂ and NH₃ gas. Heating turned the Mg(OH)₂ into MgO.' }),
          h('li', { text: 'A lid that is too wide lets MgO escape as smoke; too tight starves the magnesium of air; skipping the water leaves Mg₃N₂, so the product is wrong.' })
        ])];
    }
  };

  function tilesFor(id) {
    if (id === 'weigh1') return st.w1 ? [] : ['cruc'];
    if (id === 'weigh2') return st.mgInCruc ? [] : (st.mgOnPan ? ['mgcruc'] : ['mg']);
    if (id === 'setup') return !st.placed.burner ? ['burner'] : (!st.seated ? ['cruc'] : []);
    if (id === 'water') return !st.lidOff ? ['lid'] : (!st.bottleOver ? ['bottle'] : []);
    if (id === 'weigh3') return st.w8 ? [] : ['cruc'];
    return [];
  }

  /* ------------------------------------------------------------ actions */

  function drop(target, key) {
    var id = STEPS[st.step].id;
    if (id === 'weigh1' && key === 'cruc') {
      if (target !== 'pan') { say('The balance pan is on the right. Put the crucible there.', 'bad'); return; }
      st.w1 = true; say('Write this reading in Box 1.', 'good');
    } else if (id === 'weigh2') {
      if (target !== 'pan') { say('Put it on the balance pan.', 'bad'); return; }
      if (key === 'mg') { st.mgOnPan = true; say('Write the mass of the magnesium in Box 2.', 'good'); }
      else if (key === 'mgcruc') { st.mgInCruc = true; say('Write this reading in Box 3. It is the crucible, lid and magnesium together.', 'good'); }
    } else if (id === 'setup') {
      var map = { burner: ['burner'], cruc: ['seat'] };
      if (map[key].indexOf(target) < 0) { say(key === 'burner' ? 'The burner goes under the ring, on the bench.' : 'The crucible goes in the clay triangle.', 'bad'); return; }
      if (key === 'cruc') { st.seated = true; say('The crucible sits in the triangle with its lid on, a small crack open.', 'good'); }
      else { st.placed.burner = true; say('Good. Now set the crucible in the clay triangle.', 'good'); }
    } else if (id === 'water') {
      if (key === 'lid' && target === 'pad') { st.lidOff = true; say('The lid is on the ceramic pad, so the crucible is open.', 'good'); }
      else if (key === 'bottle' && target === 'over') { st.bottleOver = true; say('The bottle is above the open crucible. Press Add 1 drop.', 'good'); }
      else { say(key === 'lid' ? 'Set the lid on the ceramic pad, the oval on the wire gauze.' : 'Hold the bottle right above the open crucible.', 'bad'); return; }
    } else if (id === 'weigh3' && key === 'cruc') {
      if (target !== 'pan') { say('Put it on the balance pan.', 'bad'); return; }
      st.w8 = true; say('Write this reading in Box 4, then do Box 5 on your sheet.', 'good');
    }
    render();
  }

  function addDrop() {
    if (busy || st.drops >= 12 || !st.bottleOver) return;
    busy = true;
    var finished = false;
    scene.bottle(true);
    scene.dropWater(function () {
      if (finished) return; finished = true;
      st.drops++;
      scene.puff('steam', 2);
      var gas = lens.water(st.drops);
      if (gas) { scene.wisps(2); say('Hiss! NH₃ gas rises as the nitride changes to Mg(OH)₂.', 'good'); }
      else say(st.drops <= 6 ? 'Steam rises. The nitride keeps changing to Mg(OH)₂.' : 'The nitride is all used up: more water gives only steam and will take longer to dry.', st.drops <= 6 ? 'good' : '');
      st.wetness = 1;
      if (el.drops) el.drops.textContent = st.drops + (st.drops === 1 ? ' drop' : ' drops');
      var dropsOut = document.querySelector('.drops'); if (dropsOut) dropsOut.textContent = st.drops + (st.drops === 1 ? ' drop' : ' drops');
      busy = false; paint(); setNav();
    });
  }

  /* the heat model: 10 ticks a second */
  function tick(n) {
    for (var i = 0; i < (n || 1); i++) {
      var id = STEPS[st.step].id, hgt = flameH(), touch = touching();
      if (hgt > 0) st.T = Math.min(touch ? 1 : 0.45, st.T + (touch ? 0.025 : 0.004)); else if (id !== 'cool') st.T = Math.max(0, st.T - 0.012);
      scene.setHot(st.T);
      if (id === 'burn' && !st.burnDone) {
        if (st.T >= 0.8 && touch) st.ignited = true;
        var burning = st.ignited && st.T > 0.5 && touch;
        if (burning) {
          st.burn = Math.min(1, st.burn + 0.012);
          st.glow = 0.55 + 0.45 * Math.sin(Date.now() / 140);
          if (tickN % 8 === 0) scene.puff('smoke', 1);
          if (st.burn >= 1) { st.burnDone = true; say('The glow has died away: the magnesium has burned. Look through the magnifier.', 'good'); setNav(); }
          scene.setAsh(Math.min(1, st.burn * 1.2), false);
          scene.setMg(st.burn > 0.3 ? 'hidden' : 'cruc');
          scene.setGlow(st.glow);
          lens.burn(st.burn);
        } else if (st.glow > 0.01) { st.glow *= 0.85; scene.setGlow(st.glow); }
      } else if (st.glow > 0.01) { st.glow *= 0.8; scene.setGlow(st.glow); }
      if (id === 'dry' && !st.dried && touch && st.T > 0.6) {
        st.wetness = Math.max(0, st.wetness - 0.02);
        lens.dry(1 - st.wetness);
        if (tickN % 6 === 0) scene.puff('steam', 1);
        if (st.wetness <= 0) { st.dried = true; scene.setAsh(1, false); scene.setNitride(0); say('Dry. The Mg(OH)₂ has become MgO.', 'good'); paint(); setNav(); }
      }
      tickN++;
    }
  }

  /* ------------------------------------------------------------ the page */

  function setNav() {
    var id = STEPS[st.step].id;
    el.navs.forEach(function (n) {
      n.back.disabled = st.step === 0;
      n.next.disabled = !canNext();
      n.next.textContent = id === 'intro' ? 'Begin' : (id === 'done' ? 'Done' : 'Next');
      n.next.hidden = id === 'done';
      n.pos.textContent = (st.step + 1) + ' of ' + STEPS.length;
    });
    el.stepname.textContent = STEPS[st.step].name;
  }

  function navBar() {
    var back = h('button', { type: 'button', class: 'btn', text: 'Back' }), next = h('button', { type: 'button', class: 'btn primary', text: 'Next' });
    var pos = h('span', { class: 'pos' });
    back.addEventListener('click', function () { go(st.step - 1); });
    next.addEventListener('click', function () { if (canNext()) go(st.step + 1); });
    var node = h('div', { class: 'nav' }, [back, pos, next]);
    return { node: node, back: back, next: next, pos: pos };
  }

  function go(n) {
    n = Math.max(0, Math.min(last, n));
    var prev = st.step;
    st.step = n;
    if (n === 5) { st.v = 0; st.T = Math.min(st.T, 0.2); }
    if (n === 6 && st.step !== prev) st.v = 0;
    if (n === 7) { st.v = 0; if (!st.cooled) st.clock = 0; }
    if (n === 4 && !st.burnDone) st.v = st.v;
    if (n === 9) SCORM.markComplete();
    if (n > 3 && !st.seated) { st.placed = { burner: true }; st.seated = true; }
    if (n === 5) { st.lidOff = st.drops > 0; st.bottleOver = st.drops > 0; } else { st.lidOff = false; st.bottleOver = false; }
    if (n >= 1 && !st.w1 && n > 1) st.w1 = true;
    if (n > 2) { st.mgOnPan = true; st.mgInCruc = true; }
    if (n > 4 && !st.burnDone) { st.burnDone = true; st.burn = 1; }
    if (n > 5 && st.drops === 0) st.drops = 6;
    if (n > 6 && !st.dried) { st.dried = true; st.wetness = 0; }
    if (n > 7 && !st.cooled) { st.cooled = true; st.T = 0; }
    if (n > 8 && !st.w8) st.w8 = true;
    save();
    render();
  }

  function render() {
    var id = STEPS[st.step].id;
    if (picker) picker.destroy();
    el.body.innerHTML = '';
    BODY[id]().forEach(function (n) { el.body.appendChild(n); });
    el.tray.innerHTML = '';
    tilesFor(id).forEach(function (k) { el.tray.appendChild(h('button', { type: 'button', class: 'tile', 'data-tile': k, text: TILES[k] })); });
    el.tray.hidden = !el.tray.firstChild;
    el.drops = null;
    var tl = tilesFor(id), ck = tl.indexOf('cruc') >= 0 ? 'cruc' : (tl.indexOf('mgcruc') >= 0 ? 'mgcruc' : null);
    /* the pieces on the bench can be picked up directly, as well as from the tray */
    [['cruc', ck], ['mg', tl.indexOf('mg') >= 0 ? 'mg' : null], ['lid', tl.indexOf('lid') >= 0 ? 'lid' : null], ['bottle', tl.indexOf('bottle') >= 0 ? 'bottle' : null]].forEach(function (a) {
      var nd = scene.nodes[a[0]];
      if (a[1]) nd.setAttribute('data-tile', a[1]); else nd.removeAttribute('data-tile');
      nd.classList.toggle('grab', !!a[1]);
    });
    picker = Picker({ tray: el.tray, stage: scene.node, can: function (k) { return tilesFor(STEPS[st.step].id).indexOf(k) >= 0; }, ghost: function (k) { return scene.ghost(k); },
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

    scene = Scene.create({ speed: reduced ? 0 : 1 });
    lens = Lens.create({ speed: reduced ? 0 : 1 });
    el.stepname = document.getElementById('stepname');
    el.navs = [navBar(), navBar()];
    el.body = h('div', { class: 'body' });
    el.tray = h('div', { class: 'tray', 'aria-label': 'Equipment to place' });
    el.say = h('p', { class: 'say', role: 'status', 'aria-live': 'polite' });
    var left = h('div', { class: 'left' }, [h('div', { class: 'scenewrap' }, [h('div', { class: 'scenebox' }, [scene.node, lens.node])])]);
    document.getElementById('topnav').appendChild(el.navs[0].node);
    var right = h('div', { class: 'right' }, [el.body, el.tray, el.say, el.navs[1].node]);
    app.appendChild(left); app.appendChild(right);

    var start = parseInt(q.get('step'), 10);
    setInterval(function () { tick(1); }, 100);
    go(isNaN(start) ? 0 : start);
  }

  document.addEventListener('DOMContentLoaded', init);

  /* for the tools */
  return {
    state: st, go: go, tick: tick, drop: drop, addDrop: addDrop, data: function () { return d; }, steps: STEPS, scene: function () { return scene; }, lens: function () { return lens; },
    canNext: canNext, setFlame: function (v) { st.v = v; if (el.rng) el.rng.value = Math.round(v * 100); paint(); }, busy: function () { return busy; }
  };
})();

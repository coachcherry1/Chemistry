/* lens.js: the magnifier above the balance. A sample of 36 magnesium atoms on the left (a 6 by 6 block) and the air
 * on the right. While the magnesium burns, O2 and N2 molecules fly in and join the atoms; each drop of water turns one
 * magnesium of the nitride into Mg(OH)2 and frees NH3; heating turns Mg(OH)2 back into MgO and sends the water off.
 *
 *   show(phase, a)   jump to a state: 'start', 'burn' (a = progress 0..1), 'burned', 'water' (a = drops), 'dried' (a = drops)
 *   burn(p)          play the reactions up to progress p (0..1) of the burn
 *   water(drops)     play the drops added so far; returns true when NH3 is freed by the newest drop
 *   dry(frac)        play Mg(OH)2 turning into MgO, frac 0..1 of the drying
 *
 * The 36 atoms follow Lab: 30 become MgO, the last 6 (Lab.NITRIDE_FRACTION) become two Mg3N2 clusters; one drop
 * converts one of those six, so Lab.DROPS_TO_FINISH drops finish the job.
 */

var Lens = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var N = 36, SP = 30, X0 = 40, Y0 = 28;
  var NIT0 = 30;                                  /* the first of the six nitride atoms */
  function pos(i) { return { x: X0 + (i % 6) * SP, y: Y0 + Math.floor(i / 6) * SP }; }

  /* the reactions of the burn, in order: 15 O2 (two Mg each) and 2 N2 (three Mg each) */
  var EVENTS = (function () {
    var e = [], o = 0;
    for (var i = 0; i < 17; i++) {
      if (i === 5) e.push({ t: 'N', c: 0 });
      else if (i === 12) e.push({ t: 'N', c: 1 });
      else e.push({ t: 'O', p: o++ });
    }
    return e;
  })();

  var CAPTION = {
    start: 'A sample of 36 magnesium atoms. Air is mostly N₂ with some O₂.',
    burn: 'Mg joins O from O₂ (MgO). A few Mg join N from N₂ (Mg₃N₂).',
    burned: '30 Mg joined oxygen (MgO). 6 Mg joined nitrogen (Mg₃N₂, two clusters of 3).',
    water: 'Each drop of water turns one Mg of the nitride into Mg(OH)₂ and frees NH₃ gas.',
    dried: 'Heat turns Mg(OH)₂ into MgO and the water leaves as steam. All 36 Mg are in MgO.'
  };

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  /* a molecule drawn at (x, y); kind: O2, N2, H2O, NH3 */
  function mol(kind, x, y, label) {
    var g = el('g', { transform: 'translate(' + x + ' ' + y + ')' });
    if (kind === 'O2') { el('circle', { cx: -7, r: 7, class: 'lens-o' }, g); el('circle', { cx: 7, r: 7, class: 'lens-o' }, g); }
    if (kind === 'N2') { el('circle', { cx: -7, r: 7, class: 'lens-n' }, g); el('circle', { cx: 7, r: 7, class: 'lens-n' }, g); }
    if (kind === 'H2O') { el('circle', { r: 7, class: 'lens-o' }, g); el('circle', { cx: -9, cy: 7, r: 4.5, class: 'lens-h' }, g); el('circle', { cx: 9, cy: 7, r: 4.5, class: 'lens-h' }, g); }
    if (kind === 'NH3') { el('circle', { r: 7, class: 'lens-n' }, g); el('circle', { cx: -10, cy: 7, r: 4.5, class: 'lens-h' }, g); el('circle', { cx: 0, cy: 11, r: 4.5, class: 'lens-h' }, g); el('circle', { cx: 10, cy: 7, r: 4.5, class: 'lens-h' }, g); }
    if (label) el('text', { y: -12, 'text-anchor': 'middle', class: 'lens-lab', text: label }, g);
    return g;
  }

  function create(opts) {
    opts = opts || {};
    var speed = opts.speed == null ? 1 : opts.speed;
    var holder = document.createElement('figure');
    holder.className = 'lens';
    var wrap = document.createElement('div'); wrap.className = 'lens-svg-wrap';
    var cap = document.createElement('figcaption'); cap.className = 'lens-cap';
    holder.appendChild(wrap); holder.appendChild(cap);

    var svg = el('svg', { viewBox: '0 0 500 215', class: 'lens-svg', role: 'img', 'aria-label': 'Magnifier: the atoms and molecules in the crucible' });
    el('rect', { x: 2, y: 2, width: 496, height: 211, rx: 14, class: 'lens-bg' }, svg);
    el('text', { x: 24, y: 17, class: 'lens-title', text: 'Magnesium atoms (Mg)' }, svg);
    var title2 = el('text', { x: 250, y: 17, class: 'lens-title' }, svg);
    var gClus = el('g', {}, svg), gAtoms = el('g', {}, svg), gAmb = el('g', {}, svg), gFly = el('g', {}, svg);
    var atomG = [], clusG = [el('g', {}, gClus), el('g', {}, gClus)];
    for (var i = 0; i < N; i++) atomG.push(el('g', { transform: 'translate(' + pos(i).x + ' ' + pos(i).y + ')' }, gAtoms));
    wrap.appendChild(svg);

    var kinds = [], nN = [0, 0], phase = 'start', evDone = 0, drops = 0, dryTotal = null, dryDone = 0, epoch = 0, noteText = null;

    function drawAtom(i) {
      var k = kinds[i], s = '<circle r="11" class="lens-mg"/>';
      if (k === 'mgo') s += '<circle cx="13" r="6" class="lens-o"/>';
      if (k === 'oh') s += '<circle cx="13" cy="-5" r="4.5" class="lens-o"/><circle cx="13" cy="5" r="4.5" class="lens-o"/><circle cx="19" cy="-5" r="2.4" class="lens-h"/><circle cx="19" cy="5" r="2.4" class="lens-h"/>';
      atomG[i].innerHTML = s;
    }
    function drawCluster(c) {
      var g = clusG[c];
      while (g.firstChild) g.removeChild(g.firstChild);
      var any = false;
      for (var j = 0; j < 3; j++) if (kinds[NIT0 + 3 * c + j] === 'nit') any = true;
      if (!any) return;
      var ax = X0 + 3 * c * SP, y = Y0 + 5 * SP;
      el('rect', { x: ax - 17, y: y - 17, width: 2 * SP + 34, height: 50, rx: 12, class: 'lens-clus' }, g);
      var xs = [ax + SP / 2, ax + SP * 1.5];
      xs.slice(2 - nN[c]).forEach(function (x) { el('circle', { cx: x, cy: y + 15, r: 6, class: 'lens-n' }, g); });
    }
    function redraw() {
      for (var i = 0; i < N; i++) drawAtom(i);
      drawCluster(0); drawCluster(1);
    }

    function ambient() {
      while (gAmb.firstChild) gAmb.removeChild(gAmb.firstChild);
      var spots = [[270, 62], [345, 128], [440, 50], [400, 176], [300, 170], [455, 118]];
      var kind = phase === 'water' ? ['H2O', 'H2O', 'H2O', 'H2O', 'H2O', 'H2O'] : (phase === 'dried' ? [] : ['O2', 'N2', 'O2', 'N2', 'N2', 'O2']);
      if (phase === 'burned' || (phase === 'burn' && evDone >= EVENTS.length)) kind = ['O2', 'N2', 'N2', 'O2', 'N2', 'N2'];
      kind.forEach(function (k, idx) {
        var m = mol(k, spots[idx][0], spots[idx][1], k === 'O2' ? 'O₂' : (k === 'N2' ? 'N₂' : 'H₂O'));
        var j = el('g', { class: 'lens-jig', style: 'animation-delay:' + (-idx * 0.7) + 's' }, gAmb);
        j.appendChild(m);
      });
      title2.textContent = phase === 'water' ? 'Water (H₂O) and the gas it frees' : (phase === 'dried' ? 'The water leaves as steam' : 'Air: O₂ and N₂');
    }

    function captionNow() {
      if (noteText) { cap.textContent = noteText; return; }
      var left = 0, i;
      for (i = 0; i < N; i++) if (kinds[i] === 'nit') left++;
      var key = phase === 'burn' && evDone >= EVENTS.length ? 'burned' : phase;
      var t = CAPTION[key] || '';
      if (phase === 'water') t += ' (' + (6 - Math.min(6, drops)) + ' of 6 still nitride.)';
      if (phase === 'dried' && left > 0) t = 'Heat turns Mg(OH)₂ into MgO. ' + (6 - Math.min(6, drops)) + ' Mg are still Mg₃N₂, which weighs less than MgO.';
      cap.textContent = t;
    }

    function clearFly() { while (gFly.firstChild) gFly.removeChild(gFly.firstChild); }

    function fly(kind, from, to, ms, done, o) {
      o = o || {};
      if (speed === 0) { if (done) done(); return; }
      var outer = el('g', {}, gFly);
      outer.appendChild(mol(kind, from.x, from.y, o.label));
      if (!outer.animate) { outer.parentNode.removeChild(outer); if (done) done(); return; }
      var a = outer.animate([{ transform: 'translate(0px,0px)', opacity: 1 }, { transform: 'translate(' + (to.x - from.x) + 'px,' + (to.y - from.y) + 'px)', opacity: o.fade ? 0 : 1 }],
        { duration: ms * speed, easing: 'ease-in-out', fill: 'forwards' });
      a.onfinish = function () { if (outer.parentNode) outer.parentNode.removeChild(outer); if (done) done(); };
    }
    function flash(p) {
      if (speed === 0) return;
      var c = el('circle', { cx: p.x, cy: p.y, r: 8, class: 'lens-flash' }, gFly);
      if (!c.animate) { gFly.removeChild(c); return; }
      var a = c.animate([{ opacity: 0.9, transform: 'scale(1)', transformOrigin: p.x + 'px ' + p.y + 'px' }, { opacity: 0, transform: 'scale(3)', transformOrigin: p.x + 'px ' + p.y + 'px' }], { duration: 600 * speed });
      a.onfinish = function () { if (c.parentNode) c.parentNode.removeChild(c); };
    }

    function applyEvent(e) {
      if (e.t === 'O') { kinds[2 * e.p] = kinds[2 * e.p + 1] = 'mgo'; }
      else { for (var j = 0; j < 3; j++) kinds[NIT0 + 3 * e.c + j] = 'nit'; nN[e.c] = 2; }
    }
    function runEvent(e) {
      var ep = epoch, target, from;
      if (e.t === 'O') {
        var pa = pos(2 * e.p), pb = pos(2 * e.p + 1);
        target = { x: (pa.x + pb.x) / 2 + 6, y: pa.y };
        from = { x: 470, y: Math.max(26, Math.min(190, pa.y + (Math.random() - 0.5) * 24)) };
        fly('O2', from, target, 1000, function () {
          if (ep !== epoch) return;
          applyEvent(e); drawAtom(2 * e.p); drawAtom(2 * e.p + 1); flash(target);
        });
      } else {
        target = { x: X0 + (3 * e.c + 1) * SP, y: Y0 + 5 * SP + 8 };
        from = { x: 470, y: 150 };
        fly('N2', from, target, 1200, function () {
          if (ep !== epoch) return;
          applyEvent(e);
          for (var j = 0; j < 3; j++) drawAtom(NIT0 + 3 * e.c + j);
          drawCluster(e.c); flash(target);
        });
      }
    }

    function show(ph, a) {
      epoch++; clearFly(); noteText = null;
      phase = ph; drops = 0; dryTotal = null; dryDone = 0; evDone = 0;
      var i;
      for (i = 0; i < N; i++) kinds[i] = 'mg';
      nN = [0, 0];
      var evs = ph === 'start' ? 0 : (ph === 'burn' ? Math.floor((a || 0) * EVENTS.length) : EVENTS.length);
      for (i = 0; i < evs; i++) applyEvent(EVENTS[i]);
      evDone = evs;
      if (ph === 'water' || ph === 'dried') {
        drops = a || 0;
        for (i = 0; i < Math.min(6, drops); i++) {
          kinds[NIT0 + i] = ph === 'dried' ? 'mgo' : 'oh';
        }
        for (var c = 0; c < 2; c++) nN[c] = 2 - Math.min(2, Math.max(0, drops - 3 * c));
      }
      redraw(); ambient(); captionNow();
    }

    function burn(p) {
      if (phase !== 'burn') { phase = 'burn'; }
      var want = p >= 1 ? EVENTS.length : Math.floor(p * EVENTS.length);
      while (evDone < want) runEvent(EVENTS[evDone++]);
      ambient(); captionNow();
    }

    function water(d) {
      if (phase !== 'water') { phase = 'water'; ambient(); }
      var gas = false;
      for (var j = drops; j < d && j < 6; j++) {
        (function (j) {
          var ep = epoch, a = NIT0 + j, pa = pos(a), c = Math.floor(j / 3), k = j % 3;
          if (k < 2) gas = true;
          fly('H2O', { x: 470, y: pa.y - 12 }, { x: pa.x + 8, y: pa.y }, 900, function () {
            if (ep !== epoch) return;
            kinds[a] = 'oh'; drawAtom(a); flash(pa);
            if (k < 2) {
              nN[c] = Math.max(0, nN[c] - 1); drawCluster(c);
              fly('NH3', { x: pa.x, y: pa.y + 14 }, { x: pa.x + 200, y: pa.y - 100 }, 1800, null, { fade: true, label: 'NH₃' });
            }
          });
        })(j);
      }
      drops = Math.max(drops, d);
      captionNow();
      return gas;
    }

    function dry(frac) {
      if (phase !== 'dried') { phase = 'dried'; ambient(); }
      if (dryTotal == null) { dryTotal = 0; for (var i = 0; i < N; i++) if (kinds[i] === 'oh') dryTotal++; }
      var want = Math.round(frac * dryTotal);
      while (dryDone < want) {
        for (var i = NIT0; i < N; i++) {
          if (kinds[i] === 'oh') {
            kinds[i] = 'mgo'; drawAtom(i);
            var p = pos(i);
            fly('H2O', { x: p.x + 8, y: p.y }, { x: p.x + 160, y: p.y - 110 }, 1500, null, { fade: true, label: 'H₂O' });
            break;
          }
        }
        dryDone++;
      }
      captionNow();
    }

    function note(t) { noteText = t || null; captionNow(); }
    function nitrideLeft(ph, d) { return ph === 'water' || ph === 'dried' ? 6 - Math.min(6, d || 0) : 6; }

    show('start', 0);
    return { node: holder, show: show, burn: burn, water: water, dry: dry, note: note, nitrideLeft: nitrideLeft, setSpeed: function (v) { speed = v; } };
  }

  return { create: create, CAPTION: CAPTION, EVENTS: EVENTS };
})();

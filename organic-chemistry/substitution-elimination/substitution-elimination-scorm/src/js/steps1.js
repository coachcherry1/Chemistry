/* steps1.js: Parts 1 and 2.
 *
 *   players    substitution or elimination; the α and β carbons; methyl to 3°
 *   sortfn     the function of the reagent: every reagent into Klein's four groups
 *   arrows     SN2 (and, in Part 3, E2): draw the curved arrows
 *   backside   SN2 in 3D: back-side attack and inversion; then a ring, cis to trans
 *   sterics    the nucleophile heading for the back side of methyl to 3°
 *   sn1steps   tert-butyl bromide in ethanol, arrow by arrow, with Klein's
 *              energy diagram (Figure 7.15)
 *   sn1stereo  the flat carbocation attacked from either face
 *   shift      hydride and methyl shifts
 */

(function () {
  'use strict';

  var U = App.U, h = U.h, R = App.RENDER, P = App.PREDICT;
  var G = GEOM;

  function stage() { return U.stage(); }
  function rot(a, b) { return G.mmul(Viewer3D.rotX(a), Viewer3D.rotY(b)); }
  var HALO = { F: 'F', Cl: 'Cl', Br: 'Br', I: 'I' };

  /* The major product of substrate id with reagent key, as a molecule. */
  function major(id, key) {
    return React.predict(mol(id), key).products.filter(function (p) { return p.role === 'major'; })[0].mol;
  }

  /* An ion or small molecule written as text beside the drawings. */
  function textSpecies(t) { return h('span', { class: 'reagent-text', text: t }); }

  /* =========================================================== players */

  R.players = function (s) {
    var pr = U.progress(s.id);
    pr.st = pr.st || s.mols.map(function () { return 0; });
    pr.bm = pr.bm || s.mols.map(function () { return 0; });
    var top = h('div'), area = h('div');
    stage().appendChild(top);
    stage().appendChild(area);
    function save() { U.persist(); }

    var sub = mol('bbR'), el1 = mol('tBuBr');
    top.appendChild(h('div', { class: 'grid2' }, [
      U.panel('Substitution', 'SN2 here', [U.rxn(sub, 'NaSH', [major('bbR', 'NaSH')]),
        h('p', { class: 'muted', text: 'The nucleophile (HS⁻) takes the place of the leaving group (Br⁻).' })]),
      U.panel('Elimination', 'E2 here', [U.rxn(el1, 'NaOEt', [major('tBuBr', 'NaOEt')]),
        h('p', { class: 'muted', text: 'The base (EtO⁻) removes an H; the leaving group leaves; a C=C bond forms.' })])
    ]));
    top.appendChild(U.panel('Reading the names', null, [h('ul', { class: 'keylist' }, [
      h('li', { text: 'S is substitution, E is elimination, N is nucleophilic.' }),
      h('li', { text: 'The number is how many species take part in the rate-determining step: 2 for SN2 and E2 (the substrate and the reagent), 1 for SN1 and E1 (the substrate alone).' }),
      h('li', { text: 'The α carbon carries the leaving group. The β carbons are the carbons bonded to it.' })
    ])]));
    var pbox = h('div');
    top.appendChild(pbox);
    function paintPredict() {
      pbox.innerHTML = '';
      pbox.appendChild(U.panel('Your prediction', null, [U.predictCard(P.bond, pr.p, function (i) {
        pr.p = i; save(); paintPredict(); paint(); U.showArea(area);
      })]));
      if (pr.p != null) pbox.appendChild(U.reveal([U.verdict(P.bond, pr.p) +
        'Every one of the four reactions breaks the bond to the leaving group. The eliminations also break a C–H bond on a β carbon.']));
    }
    paintPredict();

    var k = pr.k || 0;
    function isDone(i) { return pr.st[i] >= 3; }
    function isOpen(i) { return i === 0 || isDone(i - 1); }

    function paint() {
      area.innerHTML = '';
      if (pr.p == null) return;
      var m = mol(s.mols[k]);
      var L = React.lg(m);
      var betas = React.betas(m, L.a).map(function (b) { return b.b; });
      var X = m.atoms[L.x].el;
      var picks = {};
      var num = Name.numbers(m);
      m.atoms.forEach(function (a, i) { if (a.el === 'C') picks[i] = U.carbonName(m, i); });
      function cn(i) { return U.carbonName(m, i); }
      var card = h('div', { class: 'mol-wrap big' });
      var svg = Draw.mol(m, { pick: picks, numbers: true, scale: 60 });
      card.appendChild(svg);
      function mark() {
        var nodes = svg.querySelectorAll('.m-pick');
        for (var q = 0; q < nodes.length; q++) {
          var i = +nodes[q].getAttribute('data-drop');
          nodes[q].classList.toggle('alpha', pr.st[k] >= 1 && i === L.a);
          var bi = betas.indexOf(i);
          nodes[q].classList.toggle('found', bi >= 0 && !!(pr.bm[k] & (1 << bi)));
        }
      }
      mark();
      var found = 0;
      betas.forEach(function (b, bi) { if (pr.bm[k] & (1 << bi)) found++; });
      var list = h('ul', { class: 'checklist' }, [
        h('li', { class: pr.st[k] >= 1 ? 'done' : '', text: 'Click the α carbon' + (pr.st[k] >= 1 ? ': C' + num[L.a] : '') }),
        h('li', { class: pr.st[k] >= 2 ? 'done' : '', text: betas.length ? 'Click every β carbon (' + found + ' of ' + betas.length + ')' : 'β carbons: none' }),
        h('li', { class: pr.st[k] >= 3 ? 'done' : '', text: 'Methyl, 1°, 2° or 3°?' })
      ]);
      var cls = null;
      if (pr.st[k] >= 2) {
        var deg = Mol.degree(m, L.a);
        cls = U.choiceRow(['Methyl', '1° (primary)', '2° (secondary)', '3° (tertiary)'], deg, pr.st[k] >= 3 ? deg : null, function (i) {
          if (i === deg) {
            pr.st[k] = 3; save();
            U.say('Right: the α carbon carries ' + (deg === 0 ? 'no other carbons, so it is a methyl halide' : deg + ' carbon' + (deg > 1 ? 's' : '') + ', so it is ' + React.DEGREE_WORD[deg]) + '.', 'good');
            if (s.mols.every(function (x, j) { return pr.st[j] >= 3; })) U.complete('All four classified. Next: the reagents.');
            else { k = Math.min(s.mols.length - 1, k + 1); pr.k = k; save(); }
            paint();
          } else {
            U.say('Count the carbons bonded to the α carbon (C' + num[L.a] + '): there ' + (deg === 1 ? 'is 1' : 'are ' + deg) + '.', 'bad');
          }
        });
      }
      var chips = U.chipRow('Alkyl halide', s.mols.map(function (id) { return molName(mol(id)); }), k, isDone, isOpen, function (i) {
        k = i; pr.k = k; save(); paint();
      });
      area.appendChild(U.panel('Find the carbons', 'click them in the drawing', [chips,
        h('div', { class: 'work' }, [h('div', null, [card, h('p', { class: 'name', style: 'text-align:center', text: molName(m) })]),
          h('div', null, [list, cls])])]));
      svg.addEventListener('click', function (ev) { var d = ev.target.closest('.m-pick'); if (d) pick(+d.getAttribute('data-drop')); });
      svg.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        var d = ev.target.closest('.m-pick'); if (d) { ev.preventDefault(); pick(+d.getAttribute('data-drop')); }
      });

      function pick(i) {
        var st = pr.st[k];
        var bi = betas.indexOf(i);
        if (st === 0) {
          if (i === L.a) {
            pr.st[k] = betas.length ? 1 : 2; save();
            U.say('Right: C' + num[i] + ' carries the ' + X + ', so it is the α carbon.' +
              (betas.length ? ' Now the β carbons: every carbon bonded to it.' : ' It has no carbons on it, so there are no β carbons: bromomethane cannot undergo elimination.'), 'good');
          } else if (bi >= 0) U.say(U.capFirst(cn(i)) + ' is next to the carbon that carries the ' + X + ': a β carbon. First click the α carbon, the one bonded to the ' + X + '.', 'bad');
          else U.say(U.capFirst(cn(i)) + ' is not bonded to the ' + X + '. The α carbon is the one that carries the leaving group.', 'bad');
        } else if (st === 1) {
          if (bi >= 0) {
            pr.bm[k] |= (1 << bi);
            var n = 0; betas.forEach(function (b, q) { if (pr.bm[k] & (1 << q)) n++; });
            if (n === betas.length) { pr.st[k] = 2; U.say('All the β carbons: ' + betas.map(cn).join(', ') + '. Each one carries H atoms an elimination could remove.', 'good'); }
            else U.say(U.capFirst(cn(i)) + ' is a β carbon (' + n + ' of ' + betas.length + ').', 'good');
            save();
          } else if (i === L.a) U.say('That is the α carbon. The β carbons are the carbons bonded to it.', 'bad');
          else U.say(U.capFirst(cn(i)) + ' is not bonded to the α carbon, so it is not a β carbon.', 'bad');
        } else return;
        paint();
      }
    }
    paint();
  };

  /* ============================================================ sortfn */

  R.sortfn = function (s) {
    var pr = U.progress(s.id);
    var placed = pr.ok ? pr.ok.split(',').filter(Boolean) : [];
    var top = h('div'), area = h('div');
    stage().appendChild(top);
    stage().appendChild(area);
    top.appendChild(U.panel('What makes a reagent', null, [h('ul', { class: 'keylist' }, [
      h('li', { text: 'A strong nucleophile has a negative charge, or a large, polarizable atom (S, I, Br).' }),
      h('li', { text: 'A strong base is one whose conjugate acid is weak (HO⁻: water is a weak acid). The conjugate base of a strong acid (I⁻, from HI) is a weak base.' }),
      h('li', { text: 'A crowded (sterically hindered) base cannot reach a carbon easily: it reacts as a base. t-BuO⁻ is still a strong nucleophile, but it prefers E2, even at a 1° carbon.' })
    ])]));
    var pbox = h('div');
    top.appendChild(pbox);
    function paintPredict() {
      pbox.innerHTML = '';
      pbox.appendChild(U.panel('Your prediction', null, [U.predictCard(P.base, pr.p, function (i) {
        pr.p = i; U.persist(); paintPredict(); paint(); U.showArea(area);
      })]));
      if (pr.p != null) pbox.appendChild(U.reveal([U.verdict(P.base, pr.p) +
        'HO⁻ is the stronger base: its conjugate acid, water, is a weak acid. I⁻ is the conjugate base of HI, a strong acid, so it is a very weak base. ' +
        'Both are strong nucleophiles: HO⁻ for its charge, I⁻ for its charge and its size.']));
    }
    paintPredict();
    var picker = null;
    function paint() {
      area.innerHTML = '';
      if (picker) { picker.destroy(); picker = null; }
      if (pr.p == null) return;
      var keys = U.shuffle(React.REAGENT_ORDER, U.rng(U.seed() ^ 77));
      var tray = h('div', { class: 'tray' });
      keys.forEach(function (key) {
        if (placed.indexOf(key) >= 0) return;
        tray.appendChild(h('button', { type: 'button', class: 'tile', 'data-tile': key, text: React.REAGENTS[key].text }));
      });
      if (!tray.children.length) tray.appendChild(h('p', { class: 'tray-empty', text: 'Every reagent is sorted.' }));
      var bins = h('div', { class: 'bins' });
      React.FN_ORDER.forEach(function (fn) {
        var F = React.FUNCTIONS[fn];
        var items = h('div', { class: 'bin-items' });
        React.REAGENT_ORDER.forEach(function (key) {
          if (placed.indexOf(key) >= 0 && React.REAGENTS[key].fn === fn) items.appendChild(h('span', { class: 'bin-item', text: React.REAGENTS[key].text }));
        });
        bins.appendChild(h('div', { class: 'bin drop', 'data-drop': fn, tabindex: 0, role: 'button', 'aria-label': F.short + (F.klein ? ' (' + F.klein + ')' : '') }, [
          h('p', { class: 'bin-head', text: F.short }), F.klein ? h('p', { class: 'bin-sub', text: F.klein }) : null, items]));
      });
      area.appendChild(U.panel('Sort the reagents', placed.length + ' of ' + keys.length + ' sorted', [bins, tray]));
      picker = new Picker({
        tray: tray, stage: bins,
        label: function (key) { return React.REAGENTS[key].text; },
        prompt: function (key) { return 'Now choose the group for ' + React.REAGENTS[key].text + '.'; },
        say: function (t) { U.say(t, ''); },
        drop: function (fn, key) {
          var r = React.REAGENTS[key];
          if (r.fn === fn) {
            placed.push(key);
            pr.ok = placed.join(','); U.persist();
            U.say(r.text + ': ' + React.FUNCTIONS[fn].short.toLowerCase() + '. ' + r.why, 'good');
            if (placed.length === React.REAGENT_ORDER.length) U.complete('Every reagent sorted. Klein’s first step is done for all of them.');
            paint();
          } else {
            U.say('Not ' + React.FUNCTIONS[fn].short.toLowerCase() + '. ' + r.why, 'bad');
          }
        }
      });
    }
    paint();
    return { destroy: function () { if (picker) picker.destroy(); } };
  };

  /* ============================================================ arrows */

  R.arrows = function (s) {
    var pr = U.progress(s.id);
    var sc, sub, key, products, profile;
    if (s.mech === 'sn2') {
      sub = mol('bbR'); key = 'NaSH';
      sc = Mech.sn2(sub, key);
      products = [major('bbR', key), textSpecies('Br⁻')];
      profile = Anim.PROFILES.sn2;
    } else {
      sub = mol('tBuBr'); key = 'NaOEt';
      sc = Mech.e2(sub, key);
      products = [major('tBuBr', key), textSpecies('EtOH'), textSpecies('Br⁻')];
      profile = Anim.PROFILES.e2;
    }
    var after = h('div');
    var ab = U.arrowBox(sc, pr, 'a', function () { paintAfter(); if (!U.isDone(s.id)) U.complete(); });
    stage().appendChild(h('div', { class: 'work work-wide' }, [
      U.panel(sc.title + ' mechanism', 'arrows from electrons', [ab.node]),
      U.panel('The reaction', null, [U.rxn(sub, React.REAGENTS[key].text, []), after])
    ]));
    function paintAfter() {
      after.innerHTML = '';
      var prodRow = h('div', { class: 'rxn' }, products.map(function (p, i) {
        return p.nodeType ? p : U.molCard(p);
      }).reduce(function (acc, n, i) { if (i) acc.push(h('span', { class: 'plus', text: '+' })); acc.push(n); return acc; }, []));
      after.appendChild(h('p', { class: 'muted', text: 'Products:' }));
      after.appendChild(prodRow);
      after.appendChild(U.energyBox(profile, { p: 1 }).node);
      after.appendChild(U.reveal([s.mech === 'sn2'
        ? 'One step, one transition state: the S–C bond forms as the C–Br bond breaks. Both the substrate and HS⁻ are in that step, so SN2 is bimolecular.'
        : 'One step, one transition state: EtO⁻ takes the H, the C–H electrons become the π bond, and Br⁻ leaves, all at once. E2 is bimolecular.']));
    }
  };

  /* ========================================================== backside */

  R.backside = function (s) {
    var pr = U.progress(s.id);
    var m = mol(s.mol);
    var prod = major(s.mol, 'NaSH');
    var top = h('div'), area = h('div'), ringArea = h('div');
    stage().appendChild(top); stage().appendChild(area); stage().appendChild(ringArea);
    function paintTop() {
      top.innerHTML = '';
      top.appendChild(U.panel('Your prediction', null, [U.predictCard(P.backside, pr.p, function (i) {
        pr.p = i; U.persist(); paintTop(); open(); U.showArea(area);
      })]));
    }
    paintTop();
    var vb = null, opened = false;
    function open() {
      if (opened || pr.p == null) return;
      opened = true;
      var frame = Anim.sn2(m, 'NaSH');
      vb = U.viewerBox({ span: [5.9, 2.4], R: rot(0.3, -0.25), label: '3D model of HS⁻ attacking 2-bromobutane. Drag or use the arrow keys to turn it.' });
      var eb = U.energyBox(Anim.PROFILES.sn2, { p: 0 });
      var read = h('p', { class: 'readout' });
      var sl = U.slider(update, { p: pr.end ? 1 : 0 });
      var pics = h('div', { class: 'pair-row' }, [
        h('figure', null, [U.molCard(m)]), h('figure', null, [U.molCard(prod)])
      ]);
      area.appendChild(h('div', { class: 'work work-3' }, [
        U.panel('In 3D', 'drag to turn', [vb.node, sl.node]),
        U.panel('Energy', null, [eb.node, read]),
        U.panel('Before and after', null, [pics, h('p', { class: 'muted', text: 'The Br was on a wedge, toward you. The SH ends up on a dash: inversion of configuration.' })])
      ]));
      vb.start();
      function update(p) {
        vb.viewer().setFrame(frame(p));
        eb.draw(p);
        read.textContent = p < 0.3 ? 'HS⁻ comes in on the back side of C2, opposite the Br.'
          : p < 0.7 ? 'Transition state: the S–C and C–Br bonds are both half made (dashed), and the other three groups lie flat.'
          : 'The other three groups have turned inside out, like an umbrella in the wind: inversion of configuration. (R) became (S).';
        if (p >= 0.98 && !pr.end) { pr.end = 1; U.persist(); paintRing(); }
      }
      update(sl.value());
      paintRing();
    }
    function paintRing() {
      ringArea.innerHTML = '';
      if (!pr.end) return;
      var rm = mol(s.ring), rp = React.substitute(rm, 'NaSH', 'inv');
      var Pq = Object.assign({}, P.ringsn2);
      ringArea.appendChild(U.panel('On a ring', null, [U.predictCard(Pq, pr.rp, function (i) {
        pr.rp = i; U.persist(); paintRing(); U.complete();
      })]));
      if (pr.rp != null) {
        ringArea.appendChild(U.panel('Cis in, trans out', null, [
          U.rxn(rm, 'NaSH', [rp]),
          U.reveal([U.verdict(P.ringsn2, pr.rp) + 'The Br is on the top face (a wedge). HS⁻ attacks from the bottom face, so the SH ends up on a dash: ' +
            'the CH₃ and the SH are now on opposite faces. Cis has become trans.']),
          U.def('Stereospecific', 'the configuration of the substrate decides the configuration of the product. SN2 is stereospecific: it always inverts.')
        ]));
      }
    }
    open();
  };

  /* =========================================================== sterics */

  R.sterics = function (s) {
    var pr = U.progress(s.id);
    pr.seen = pr.seen || 0;
    var top = h('div'), area = h('div');
    stage().appendChild(top); stage().appendChild(area);
    function paintTop() {
      top.innerHTML = '';
      top.appendChild(U.panel('Your prediction', null, [U.predictCard(P.fastest, pr.p, function (i) {
        pr.p = i; U.persist(); paintTop(); paint(); U.showArea(area);
      })]));
    }
    paintTop();
    var k = pr.k || 0, vb = null, anim = null;
    function paint() {
      area.innerHTML = '';
      if (pr.p == null) return;
      var m = mol(s.mols[k]);
      var ap = Anim.approach(m, 'NaSH');
      vb = U.viewerBox({ radius: 2.9, R: G.mmul(Viewer3D.rotX(0.16), Viewer3D.rotY(Math.PI / 2 - 0.22)), center: [-0.5, 0, 0],
        label: '3D model of ' + molName(m) + ' seen from the back side, with HS⁻ coming in. Drag or use the arrow keys to turn it.' });
      var go = h('button', { type: 'button', class: 'primary', text: 'Send in HS⁻' });
      var read = h('p', { class: 'readout' });
      var chips = U.chipRow('Substrate', s.mols.map(function (id) { return molName(mol(id)); }), k,
        function (i) { return !!(pr.seen & (1 << i)); }, function () { return true; }, function (i) { k = i; pr.k = k; U.persist(); paint(); });
      area.appendChild(U.panel('The back side', 'the α carbon is blue', [chips, h('div', { class: 'work' }, [
        h('div', null, [vb.node, h('div', { class: 'btnrow' }, [go])]),
        h('div', null, [U.molCard(m), read, h('div', { class: 'ranking' })])
      ])]));
      vb.start();
      vb.viewer().setFrame(ap.frame(0));
      function text() {
        var n = ap.crowd;
        if (ap.blocked) return 'Three CH₃ groups surround the back side. HS⁻ cannot get near the α carbon: no SN2 at a 3° carbon.';
        if (n === 0) return 'Nothing is in the way: HS⁻ reaches the back of the α carbon easily. Fastest.';
        return (n === 1 ? 'One β carbon puts an H in the way (red): a little crowded. Fast.' : 'Two β carbons put H atoms in the way (red): crowded. Slower.');
      }
      go.addEventListener('click', function () {
        if (anim) cancelAnimationFrame(anim);
        var t0 = null;
        function step(ts) {
          if (t0 == null) t0 = ts;
          var p = U.reduceMotion ? 1 : Math.min(1, (ts - t0) / 1500);
          vb.viewer().setFrame(ap.frame(p));
          if (p < 1) anim = requestAnimationFrame(step);
          else {
            read.textContent = text();
            pr.seen |= (1 << k); U.persist();
            if (pr.seen === (1 << s.mols.length) - 1) finish();
            else U.say('Now try another substrate.', '');
          }
        }
        anim = requestAnimationFrame(step);
      });
      if (pr.seen & (1 << k)) { vb.viewer().setFrame(ap.frame(1)); read.textContent = text(); }
      if (pr.seen === (1 << s.mols.length) - 1) finish(true);
    }
    function finish(quiet) {
      var box = area.querySelector('.ranking');
      if (box && !box.children.length) box.appendChild(U.reveal([U.verdict(P.fastest, pr.p) +
        'SN2 rate: methyl > 1° > 2°, and a 3° substrate does not react by SN2 at all. Every carbon on the α carbon crowds the back side.']));
      if (!quiet || !U.isDone(s.id)) U.complete();
    }
    paint();
    return { destroy: function () { if (anim) cancelAnimationFrame(anim); } };
  };

  /* ========================================================== sn1steps */

  R.sn1steps = function (s) {
    var pr = U.progress(s.id);
    var sub = mol(s.mol);
    var cat = React.cation(sub);
    var ox = React.oxonium(cat, cat.plus, 'EtOH');
    var scenes = [Mech.loss(sub), Mech.attack(cat, cat.plus, 'EtOH'), Mech.protonOff(ox.mol, ox.o, ox.h, 'EtOH')];
    var names = ['1  Loss of a leaving group', '2  Nucleophilic attack', '3  Proton transfer'];
    var k = 0;
    while (k < 2 && pr['a' + k]) k++;
    var left = h('div'), right = h('div');
    stage().appendChild(h('div', { class: 'work work-wide' }, [left, right]));
    var NOTES = [
      'The slow, rate-determining step. Only the substrate is in it, so SN1 is unimolecular: the 1 in SN1. The carbocation is flat. A 3° carbocation is the most stable: 3° > 2° > 1°.',
      'Ethanol’s O attacks the carbocation. The product of this step is an oxonium ion: an O carrying a positive charge.',
      'A second ethanol takes the proton. The solvent was the nucleophile all along: a solvolysis.'
    ];
    function doneCount() { var n = 0; for (var i = 0; i < 3; i++) if (pr['a' + i]) n++; return n; }
    function paint() {
      left.innerHTML = '';
      var chips = U.chipRow('Step', names, k, function (i) { return !!pr['a' + i]; }, function (i) { return i === 0 || !!pr['a' + (i - 1)]; },
        function (i) { k = i; paint(); });
      var ab = U.arrowBox(scenes[k], pr, 'a' + k, function (fresh) {
        if (doneCount() === 3 && !U.isDone(s.id)) U.complete('All three steps. ' + NOTES[2]);
        if (fresh && k < 2) {
          /* straight on to the next step, with this one's lesson */
          var note = NOTES[k] + ' On to step ' + (k + 2) + '.';
          k++; paint(); U.say(note, 'good');
          return;
        }
        paintRight();
      });
      left.appendChild(U.panel('SN1 of 2-bromo-2-methylpropane in ethanol', null, [chips, ab.node]));
      paintRight();
    }
    function paintRight() {
      right.innerHTML = '';
      var n = doneCount();
      var eb = U.energyBox(Anim.PROFILES.sn1, { p: [0, 0.33, 0.67, 1][n], upto: [0, 0.34, 0.67, 1][n],
        bands: [{ from: 0, to: 0.67, text: 'Substitution', cls: 'sub' }, { from: 0.67, to: 1, text: 'Proton transfer', cls: 'pt' }] });
      var notes = [];
      for (var i = 0; i < n; i++) notes.push(NOTES[i]);
      var prod = n === 3 ? h('div', null, [h('p', { class: 'muted', text: 'Substitution product:' }), U.molCard(major(s.mol, 'EtOH'))]) : null;
      right.appendChild(U.panel('Energy diagram', 'Klein, Figure 7.15', [eb.node, notes.length ? U.reveal(notes) : null, prod]));
    }
    paint();
  };

  /* ========================================================= sn1stereo */

  R.sn1stereo = function (s) {
    var pr = U.progress(s.id);
    pr.f = pr.f || 0;
    var m = mol(s.mol);
    var inv = React.substitute(m, 'EtOH', 'inv'), ret = React.substitute(m, 'EtOH', 'ret');
    var top = h('div'), area = h('div');
    stage().appendChild(top); stage().appendChild(area);
    function paintTop() {
      top.innerHTML = '';
      top.appendChild(U.panel('Your prediction', null, [U.predictCard(P.flat, pr.p, function (i) {
        pr.p = i; U.persist(); paintTop(); open(); U.showArea(area);
      })]));
    }
    paintTop();
    var opened = false;
    function open() {
      if (opened || pr.p == null) return;
      opened = true;
      var face = -1;
      var frames = { '-1': Anim.sn1(m, 'EtOH', -1), '1': Anim.sn1(m, 'EtOH', 1) };
      var vb = U.viewerBox({ span: [5.8, 3.6], R: rot(0.3, -0.3), label: '3D model of the SN1 of (R)-3-bromo-3-methylhexane. Drag or use the arrow keys to turn it.' });
      var read = h('p', { class: 'readout' });
      var sl = U.slider(update, { p: 0 });
      var fb = h('div', { class: 'view-row' });
      var bL = h('button', { type: 'button', class: 'mini', 'aria-pressed': 'true', text: 'Attack from the left (the back face)' });
      var bR = h('button', { type: 'button', class: 'mini', 'aria-pressed': 'false', text: 'Attack from the right (where the Br was)' });
      fb.appendChild(bL); fb.appendChild(bR);
      [bL, bR].forEach(function (b, i) {
        b.addEventListener('click', function () {
          face = i ? 1 : -1;
          bL.setAttribute('aria-pressed', face < 0 ? 'true' : 'false');
          bR.setAttribute('aria-pressed', face > 0 ? 'true' : 'false');
          update(Math.max(0.5, sl.value()));
          sl.range.value = Math.max(50, +sl.range.value);
        });
      });
      var pics = h('div');
      area.appendChild(h('div', { class: 'work work-3' }, [
        U.panel('In 3D', 'drag to turn', [vb.node, sl.node, fb]),
        U.panel('What forms', null, [read, pics]),
        U.panel('The substrate', null, [U.molCard(m)])
      ]));
      vb.start();
      function update(p) {
        vb.viewer().setFrame(frames[face](p));
        read.textContent = p < 0.45 ? 'Loss of the leaving group: Br⁻ leaves and the three groups flatten.'
          : p < 0.6 ? 'The carbocation is flat. Its empty p orbital (blue) can be reached from either face.'
          : 'Ethanol attacks from the ' + (face < 0 ? 'left, the face away from where the Br was' : 'right, the face the Br left') + '.';
        if (p >= 0.95) {
          var bit = face < 0 ? 1 : 2;
          if (!(pr.f & bit)) { pr.f |= bit; U.persist(); }
          paintPics();
        }
      }
      function paintPics() {
        pics.innerHTML = '';
        var list = [];
        if (pr.f & 1) list.push(U.molCard(inv, { note: '(from the left)' }));
        if (pr.f & 2) list.push(U.molCard(ret, { note: '(from the right)' }));
        pics.appendChild(h('div', { class: 'pair-row' }, list));
        if (pr.f === 3) {
          pics.appendChild(U.reveal([U.verdict(P.flat, pr.p) + 'Attack from the two faces is equally likely, so the two enantiomers form in equal amounts: a racemic mixture. ' +
            'Then a proton transfer to the solvent gives the ether.',
            'SN1 is not stereospecific: the carbocation is flat, so the substrate’s configuration is lost.']));
          if (!U.isDone(s.id)) U.complete();
        } else U.say('Now let ethanol attack from the other face.', '');
      }
      update(0);
      if (pr.f) paintPics();
    }
    open();
  };

  /* ============================================================= shift */

  R.shift = function (s) {
    var pr = U.progress(s.id);
    var top = h('div'), area = h('div');
    stage().appendChild(top); stage().appendChild(area);
    function paintTop() {
      top.innerHTML = '';
      top.appendChild(U.panel('Your prediction', null, [U.predictCard(P.shift, pr.p, function (i) {
        pr.p = i; U.persist(); paintTop(); paint(); U.showArea(area);
      })]));
      if (pr.p != null) top.appendChild(U.reveal([U.verdict(P.shift, pr.p) +
        'A hydride shift: the H on the next carbon moves over with its pair of electrons, and the positive charge moves to that carbon, which is 3°. ' +
        'Klein’s table marks 2° substrates with a weak nucleophile ✗, because they react this way only slowly; when a 2° carbocation does form, look for a shift.']));
    }
    paintTop();
    var k = pr.a0 ? 1 : 0;
    function paint() {
      area.innerHTML = '';
      if (pr.p == null) return;
      var m = mol(s.mols[k]);
      var cp = React.cationPath(m);
      var sc = Mech.shift(cp.first, cp.c, cp.shift);
      var after = h('div');
      var chips = U.chipRow('Substrate', s.mols.map(function (id) { return molName(mol(id)); }), k,
        function (i) { return !!pr['a' + i]; }, function (i) { return i === 0 || !!pr.a0; }, function (i) { k = i; paint(); });
      var ab = U.arrowBox(sc, pr, 'a' + k, function (fresh) {
        paintAfter();
        if (pr.a0 && pr.a1 && !U.isDone(s.id)) U.complete();
        else if (fresh && k === 0) {
          var t = 'Right: a ' + (cp.shift.kind === 'H' ? 'hydride' : 'methyl') + ' shift. Now the other substrate.';
          setTimeout(function () { k = 1; paint(); U.say(t, 'good'); }, U.reduceMotion ? 0 : 1600);
        }
      });
      area.appendChild(h('div', { class: 'work work-wide' }, [
        U.panel('Draw the shift', molName(m) + ' in ethanol', [chips, ab.node]),
        U.panel('Energy and products', null, [U.energyBox(Anim.PROFILES.shift, { p: pr['a' + k] ? 1 : 0.4, upto: pr['a' + k] ? 1 : 0.34 }).node, after])
      ]));
      function paintAfter() {
        after.innerHTML = '';
        var shifted = React.capture(cp.final, cp.at, 'EtOH', 0);
        var plain = React.capture(cp.first, cp.c, 'EtOH', 0);
        after.appendChild(h('div', { class: 'pair-row' }, [U.molCard(shifted, { note: '(major)' }), U.molCard(plain, { note: '(minor)' })]));
        after.appendChild(U.reveal([cp.shift.kind === 'H'
          ? 'The hydride shift turns the 2° carbocation into a 3° one, which is more stable (lower in energy). Ethanol attacks it there, so the major product has the OEt on the other carbon.'
          : 'No H can shift to make a 3° carbocation here, but a CH₃ can: a methyl shift. The new 3° carbocation is attacked by ethanol.']));
      }
      if (pr['a' + k]) paintAfter();
    }
    paint();
  };
})();

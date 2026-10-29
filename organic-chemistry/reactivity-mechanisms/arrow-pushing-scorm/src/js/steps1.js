/* steps1.js: Parts 1 and 2.
 *
 *   break     pull H and Cl apart beside the energy curve: energy in; let
 *             them bond again: energy out
 *   cleave    homolytic (two fish-hooks, radicals) and heterolytic (one
 *             curved arrow, ions), animated
 *   bonds     click the bonds broken and formed; the energy bars (Klein's
 *             Table 6.1, to scale, never added up) say exo- or endothermic
 *   entropy   a gas spreading into two flasks; sort reactions by ΔS
 *   favor     exergonic and endergonic; the signs of ΔH and ΔS
 *   diagram   two reactions run beside their energy diagrams; find every
 *             transition state and intermediate
 *   rich      CH3Cl and CH3Li: electron-poor and electron-rich carbon
 *   sort      nucleophile or electrophile (Klein Table 6.3, 6.8)
 *   centres   every nucleophilic and electrophilic centre in a molecule
 */

(function () {
  'use strict';

  var U = App.U, h = U.h, R = App.RENDER, P = App.PREDICT;
  var SC = SCENES.S;
  var el = Render.el;
  var seg = Render.seg;

  function stage() { return U.stage(); }
  function f1(v) { return (+v).toFixed(1); }

  /* Clickable atoms on a drawing: ids -> aria label. onPick(id). */
  function pickAtoms(svg, geo, labels, onPick) {
    var g = el('g', { class: 'm-picks' }, svg);
    Object.keys(labels).forEach(function (id) {
      var p = geo.P[id];
      var t = el('g', { class: 'drop m-pick', 'data-drop': id, tabindex: 0, role: 'button', 'aria-label': labels[id] }, g);
      el('circle', { cx: f1(p[0]), cy: f1(p[1]), r: 13, class: 'slot-box' }, t);
    });
    function go(ev) { var d = ev.target.closest && ev.target.closest('.m-pick'); if (d) onPick(d.getAttribute('data-drop')); }
    svg.addEventListener('click', go);
    svg.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(ev); } });
    return function mark(id, cls, on) {
      var n = g.querySelector('[data-drop="' + id + '"]');
      if (n) n.classList.toggle(cls, on !== false);
    };
  }

  /* Clickable bonds on a drawing. onPick(pairKey). */
  function pickBonds(svg, geo, st, onPick) {
    var g = el('g', { class: 'b-picks' }, svg);
    st.bonds.forEach(function (b) {
      var A = geo.P[b.a], B = geo.P[b.b], k = Chem.keys.pair(b.a, b.b);
      var t = el('g', { class: 'drop b-pick', 'data-drop': k, tabindex: 0, role: 'button',
        'aria-label': U.bondName(st, { a: b.a, b: b.b }) + ' between ' + Judge.name({}, st, b.a) + ' and ' + Judge.name({}, st, b.b) }, g);
      el('line', { x1: f1(A[0]), y1: f1(A[1]), x2: f1(B[0]), y2: f1(B[1]), class: 'b-pick-line' }, t);
    });
    function go(ev) { var d = ev.target.closest && ev.target.closest('.b-pick'); if (d) onPick(d.getAttribute('data-drop')); }
    svg.addEventListener('click', go);
    svg.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(ev); } });
    return function mark(k, cls) { var n = g.querySelector('[data-drop="' + k + '"]'); if (n) n.classList.add(cls); };
  }

  /* ============================================================= break */

  R.break = function (s) {
    var pr = U.progress(s.id);
    var area = h('div');
    stage().appendChild(U.predictBox(P.breakE, pr, 'p',
      'Breaking a bond is endothermic: the bonding electrons sit low in energy, so the surroundings must put energy in to pull the atoms apart. ' +
      'Making the bond gives the same energy back out: exothermic.', function () { paint(); U.showArea(area); }));
    stage().appendChild(area);

    /* Morse-like curve, in bond lengths */
    function E(r) { var x = 1 - Math.exp(-1.7 * (r - 1)); return x * x; }
    var r = 1, anim = null;
    function stopAll() { if (anim) { cancelAnimationFrame(anim); anim = null; } }
    function paint() {
      area.innerHTML = '';
      if (pr.p == null) return;
      var pic = Render.svg('bond-pull', 'H and Cl, pulled apart');
      pic.setAttribute('viewBox', '0 0 330 120');
      var plot = Render.svg('energy', 'Energy against the distance between H and Cl');
      plot.setAttribute('viewBox', '0 0 330 200');
      var meter = h('p', { class: 'energy-word' });
      function draw() {
        pic.innerHTML = '';
        var d = 96 + (r - 1) * 64, cx = 160;
        var xH = cx - d / 2, xC = cx + d / 2;
        var bondOp = Math.max(0, 1 - (r - 1) / 1.4);
        if (bondOp > 0.02) el('line', { x1: f1(xH + 14), y1: 60, x2: f1(xC - 20), y2: 60, class: 'm-bond' + (bondOp < 0.98 ? ' partial' : ''), opacity: bondOp.toFixed(2) }, pic);
        el('circle', { cx: f1(xH), cy: 60, r: 14, class: 'atom-ball h' }, pic);
        el('circle', { cx: f1(xC), cy: 60, r: 20, class: 'atom-ball cl' }, pic);
        el('text', { x: f1(xH), y: 65, class: 'ball-text', 'text-anchor': 'middle' }, pic, 'H');
        el('text', { x: f1(xC), y: 66, class: 'ball-text', 'text-anchor': 'middle' }, pic, 'Cl');
        /* the bonding pair: shared, then one electron each */
        var split = seg(r, 1.6, 2.6);
        var mid = (xH + xC) / 2;
        var e1 = mid - 5 - split * (mid - xH - 22), e2 = mid + 5 + split * (xC - mid - 28);
        el('circle', { cx: f1(e1), cy: 60, r: 3.4, class: 'e-dot' }, pic);
        el('circle', { cx: f1(e2), cy: 60, r: 3.4, class: 'e-dot' }, pic);
        if (r > 2.5) el('text', { x: 165, y: 108, 'text-anchor': 'middle', class: 'pic-note' }, pic, 'Broken: H• and Cl•, one electron each');
        /* the plot */
        plot.innerHTML = '';
        var X = function (q) { return 40 + (q - 0.75) / (3.2 - 0.75) * 270; }, Y = function (e) { return 170 - Math.min(e, 1.5) / 1.3 * 140; };
        el('line', { x1: 40, y1: 172, x2: 318, y2: 172, class: 'en-axis' }, plot);
        el('line', { x1: 40, y1: 172, x2: 40, y2: 14, class: 'en-axis' }, plot);
        el('text', { x: 14, y: 95, class: 'en-axis-text', transform: 'rotate(-90 14 95)', 'text-anchor': 'middle' }, plot, 'Potential energy');
        el('text', { x: 180, y: 192, class: 'en-axis-text', 'text-anchor': 'middle' }, plot, 'Distance between H and Cl');
        var dd = '';
        for (var q = 0.8; q <= 3.2; q += 0.04) dd += (dd ? ' L' : 'M') + f1(X(q)) + ' ' + f1(Y(E(q)));
        el('path', { d: dd, class: 'en-curve' }, plot);
        el('line', { x1: X(1), y1: Y(0), x2: X(3.2), y2: Y(0), class: 'en-guide' }, plot);
        el('line', { x1: X(3.05), y1: Y(0) - 2, x2: X(3.05), y2: Y(E(3.05)) + 2, class: 'en-bracket' }, plot);
        el('text', { x: f1(X(2.95)), y: f1(Y(0.3)), class: 'en-dg-word', 'text-anchor': 'end' }, plot, 'bond dissociation energy');
        el('circle', { cx: f1(X(r)), cy: f1(Y(E(r))), r: 6.5, class: 'en-marker' }, plot);
      }
      var last = 1;
      var sl = h('input', { type: 'range', min: 100, max: 300, value: Math.round(r * 100), class: 'prog-range', 'aria-label': 'Distance between H and Cl' });
      sl.addEventListener('input', function () {
        stop();
        var v = +sl.value / 100;
        meter.textContent = v > last + 1e-3 ? 'Energy in: the surroundings give energy to the system. Endothermic.' : v < last - 1e-3 ? 'Energy out: the system gives energy to the surroundings. Exothermic.' : meter.textContent;
        meter.className = 'energy-word ' + (v > last ? 'in' : 'out');
        last = v; r = v; draw();
        if (r >= 2.95 && !pr.pulled) { pr.pulled = 1; U.persist(); U.say('Broken. Now let them bond again.', 'good'); letGo.disabled = false; }
      });
      var letGo = h('button', { type: 'button', class: 'mini play', text: '▶ Let them bond again', disabled: !pr.pulled });
      function stop() { if (anim) { cancelAnimationFrame(anim); anim = null; } }
      function done() {
        meter.textContent = 'The bond formed again and gave its energy back to the surroundings: bond making is exothermic.';
        meter.className = 'energy-word out';
        if (!pr.back) { pr.back = 1; U.persist(); }
        if (!U.isDone(s.id)) U.complete('Bond breaking is endothermic; bond making is exothermic. Every mechanism step does some of each.');
      }
      letGo.addEventListener('click', function () {
        stop();
        meter.textContent = 'Energy out: the system gives energy to the surroundings. Exothermic.';
        meter.className = 'energy-word out';
        if (U.reduceMotion) { r = 1; sl.value = 100; last = 1; draw(); done(); return; }
        var from = r, t0 = null;
        function step(ts) {
          if (t0 == null) t0 = ts;
          var u = Math.min(1, (ts - t0) / 1600);
          r = from + (1 - from) * Render.smooth(u);
          sl.value = Math.round(r * 100); last = r;
          draw();
          if (u < 1) anim = requestAnimationFrame(step); else { anim = null; done(); }
        }
        anim = requestAnimationFrame(step);
      });
      draw();
      area.appendChild(h('div', { class: 'work' }, [
        U.panel('Pull them apart', 'slider', [h('div', { class: 'mol-wrap' }, [pic]), h('div', { class: 'range-row' }, [h('span', { text: 'Bonded' }), sl, h('span', { text: 'Apart' })]),
          h('div', { class: 'btnrow' }, [letGo]), meter]),
        U.panel('Energy', null, [plot, U.reveal(['The bottom of the curve is the bond. The climb to the flat part is the bond dissociation energy: the energy that breaking the bond homolytically (one electron to each atom) takes in. Klein’s Table 6.1 gives 431 kJ/mol for H–Cl.'])])
      ]));
    }
    paint();
    return { destroy: stopAll };
  };

  /* ============================================================ cleave */

  /* H–Cl splitting: kind 'homo' (two fish-hooks, H• and Cl•) or 'hetero'
     (one curved arrow, H⁺ and Cl⁻). Returns { node, set(p) }. */
  function splitPic(kind) {
    var s = Render.svg('mol split', kind === 'homo' ? 'Homolytic cleavage of H–Cl' : 'Heterolytic cleavage of H–Cl');
    s.setAttribute('viewBox', '0 0 260 130');
    function set(p) {
      s.innerHTML = '';
      var m = seg(p, 0.5, 1);
      var xH = 95 - 40 * m, xC = 160 + 40 * m, y = 75;
      var bop = 1 - seg(p, 0.25, 0.55);
      if (bop > 0.02) el('line', { x1: f1(xH + 8), y1: y - 5, x2: f1(xC - 12), y2: y - 5, class: 'm-bond' + (bop < 0.98 ? ' partial' : ''), opacity: bop.toFixed(2) }, s);
      el('text', { x: f1(xH), y: y, class: 'm-label tone-h', 'text-anchor': 'middle' }, s, 'H');
      el('text', { x: f1(xC), y: y, class: 'm-label tone-cl', 'text-anchor': 'middle' }, s, 'Cl');
      /* Cl's three lone pairs */
      [[0, -22], [0, 14], [22, -5]].forEach(function (d) {
        var cx = xC + d[0], cy = y - 5 + d[1];
        var hz = d[0] === 0;
        el('circle', { cx: f1(cx + (hz ? -3.4 : 0)), cy: f1(cy + (hz ? 0 : -3.4)), r: 2.1, class: 'm-lp-dot' }, s);
        el('circle', { cx: f1(cx + (hz ? 3.4 : 0)), cy: f1(cy + (hz ? 0 : 3.4)), r: 2.1, class: 'm-lp-dot' }, s);
      });
      var mid = (xH + xC) / 2, u = seg(p, 0.05, 0.5);
      /* the two electrons of the bond */
      var a0 = [mid - 4, y - 5], b0 = [mid + 4, y - 5];
      var a1, b1;
      if (kind === 'homo') { a1 = [xH + 12, y - 5]; b1 = [xC - 16, y - 5]; }
      else { a1 = [xC - 17, y - 9]; b1 = [xC - 17, y - 1]; }
      var ea = [a0[0] + (a1[0] - a0[0]) * u, a0[1] + (a1[1] - a0[1]) * u - Math.sin(u * Math.PI) * 16];
      var eb = [b0[0] + (b1[0] - b0[0]) * u, b0[1] + (b1[1] - b0[1]) * u - Math.sin(u * Math.PI) * (kind === 'homo' ? 16 : 22)];
      el('circle', { cx: f1(ea[0]), cy: f1(ea[1]), r: 2.6, class: 'e-dot' }, s);
      el('circle', { cx: f1(eb[0]), cy: f1(eb[1]), r: 2.6, class: 'e-dot' }, s);
      /* the arrows, until the electrons arrive */
      var aop = 1 - seg(p, 0.42, 0.6);
      if (aop > 0.02) {
        var g = el('g', { class: 'arrows', opacity: aop.toFixed(2) }, s);
        if (kind === 'homo') {
          el('path', { d: 'M' + f1(mid) + ' ' + (y - 12) + ' Q' + f1((mid + xH) / 2) + ' ' + (y - 40) + ' ' + f1(xH + 6) + ' ' + (y - 18), class: 'arw' }, g);
          el('polygon', { points: f1(xH + 4) + ',' + (y - 16) + ' ' + f1(xH + 14) + ',' + (y - 22) + ' ' + f1(xH + 12) + ',' + (y - 14), class: 'arw-head' }, g);
          el('path', { d: 'M' + f1(mid) + ' ' + (y - 12) + ' Q' + f1((mid + xC) / 2) + ' ' + (y - 40) + ' ' + f1(xC - 10) + ' ' + (y - 20), class: 'arw' }, g);
          el('polygon', { points: f1(xC - 8) + ',' + (y - 18) + ' ' + f1(xC - 18) + ',' + (y - 24) + ' ' + f1(xC - 16) + ',' + (y - 16), class: 'arw-head' }, g);
        } else {
          el('path', { d: 'M' + f1(mid) + ' ' + (y - 12) + ' Q' + f1((mid + xC) / 2) + ' ' + (y - 46) + ' ' + f1(xC - 10) + ' ' + (y - 22), class: 'arw' }, g);
          el('polygon', { points: f1(xC - 6) + ',' + (y - 17) + ' ' + f1(xC - 18) + ',' + (y - 24) + ' ' + f1(xC - 9) + ',' + (y - 30), class: 'arw-head' }, g);
        }
      }
      /* the products */
      if (p > 0.75) {
        var g2 = el('g', { opacity: seg(p, 0.75, 0.95).toFixed(2) }, s);
        if (kind === 'homo') {
          el('text', { x: f1(xH), y: 118, 'text-anchor': 'middle', class: 'pic-note' }, g2, 'radical');
          el('text', { x: f1(xC), y: 118, 'text-anchor': 'middle', class: 'pic-note' }, g2, 'radical');
        } else {
          [[xH + 12, y - 20, '+'], [xC + 16, y - 24, '−']].forEach(function (q) {
            el('circle', { cx: f1(q[0]), cy: f1(q[1]), r: 6.2, class: 'm-charge-ring' }, g2);
            el('text', { x: f1(q[0]), y: f1(q[1] + 4), class: 'm-charge', 'text-anchor': 'middle' }, g2, q[2]);
          });
          el('text', { x: f1(xH), y: 118, 'text-anchor': 'middle', class: 'pic-note' }, g2, 'cation');
          el('text', { x: f1(xC), y: 118, 'text-anchor': 'middle', class: 'pic-note' }, g2, 'anion');
        }
      }
    }
    set(0);
    return { node: s, set: set };
  }

  R.cleave = function (s) {
    var pr = U.progress(s.id);
    pr.q = pr.q || [null, null, null];
    var homo = splitPic('homo'), het = splitPic('hetero');
    var sh = U.slider(homo.set, { from: 'Bond', to: 'Broken' }), st = U.slider(het.set, { from: 'Bond', to: 'Broken' });
    stage().appendChild(h('div', { class: 'grid2' }, [
      U.panel('Homolytic cleavage', 'two fish-hook arrows', [h('div', { class: 'mol-wrap' }, [homo.node]), sh.node,
        h('p', { class: 'muted', text: 'A fish-hook arrow has half a head: it moves one electron.' })]),
      U.panel('Heterolytic cleavage', 'one curved arrow', [h('div', { class: 'mol-wrap' }, [het.node]), st.node,
        h('p', { class: 'muted', text: 'A curved arrow with a full head moves a pair of electrons.' })])
    ]));
    var Q = [
      ['One electron to each atom (two fish-hooks) makes:', ['Two radicals', 'Two ions'], 0,
        'Radicals: each atom keeps one electron of the bond, an unpaired electron, and neither is charged.'],
      ['Both electrons to Cl (one curved arrow) makes:', ['Two ions', 'Two radicals'], 0,
        'Ions: Cl gets both electrons (Cl⁻, an anion) and H is left with none (H⁺, a cation).'],
      ['Ionic mechanisms, everything in the rest of this activity, use:', ['Heterolytic steps, with curved arrows', 'Homolytic steps, with fish-hooks'], 0,
        'Ionic reactions move electrons in pairs: every arrow from here on is a curved arrow with a full head. Radicals come later (Klein chapter 10).']
    ];
    var box = h('div');
    stage().appendChild(U.panel('What did you see?', null, [box]));
    function paint() {
      box.innerHTML = '';
      Q.forEach(function (q, i) {
        box.appendChild(h('p', { class: 'q-text', text: q[0] }));
        box.appendChild(U.choiceRow(q[1], q[2], pr.q[i], function (c) {
          pr.q[i] = c; U.persist();
          U.say(c === q[2] ? q[3] : 'Look again at where the two electrons of the H–Cl bond go.', c === q[2] ? 'good' : 'bad');
          if (pr.q.every(function (x, k) { return x === Q[k][2]; })) U.complete(q[3] + ' Next: which bonds break and form in a reaction.');
          paint();
        }));
      });
    }
    paint();
    return { destroy: function () { sh.stop(); st.stop(); } };
  };

  /* ============================================================= bonds */

  R.bonds = function (s) {
    var pr = U.progress(s.id);
    var ids = ['bdeA', 'bdeB'];
    var k = pr.k || 0;
    var area = h('div');
    stage().appendChild(area);
    function st(i) { pr['s' + i] = pr['s' + i] || { br: [], fo: [], ans: null }; return pr['s' + i]; }
    function isDone(i) { return st(i).ans === exo(i); }
    function exo(i) {
      var sc = SC[ids[i]], L = Chem.ledger(sc.before, sc.after);
      var inE = L.broken.reduce(function (t, b) { return t + bde(sc, b); }, 0), outE = L.formed.reduce(function (t, b) { return t + bde(sc, b); }, 0);
      return outE > inE ? 0 : 1;
    }
    function bde(sc, b) { return sc.bde[Chem.keys.pair(b.a, b.b)]; }
    function paint() {
      area.innerHTML = '';
      var sc = SC[ids[k]], S = st(k);
      var L = Chem.ledger(sc.before, sc.after);
      var brK = L.broken.map(function (b) { return Chem.keys.pair(b.a, b.b); }), foK = L.formed.map(function (b) { return Chem.keys.pair(b.a, b.b); });
      var chips = U.chipRow('Reaction', ids.map(function (id) { return SC[id].title; }), k, isDone, function (i) { return i === 0 || isDone(i - 1); },
        function (i) { k = i; pr.k = i; U.persist(); paint(); });
      var left = Render.draw(sc.before, { scale: 40, label: 'Reactants' }), right = Render.draw(sc.after, { scale: 40, label: 'Products' });
      var phase = S.br.length < brK.length ? 0 : S.fo.length < foK.length ? 1 : 2;
      var markL = pickBonds(left, left._geo, sc.before, function (key) {
        if (phase !== 0) { U.say(phase === 1 ? 'Now the products: click every bond that forms.' : 'All found.', ''); return; }
        if (brK.indexOf(key) >= 0 && S.br.indexOf(key) < 0) { S.br.push(key); U.persist(); U.say('Broken: energy in (endothermic).', 'good'); paint(); }
        else if (S.br.indexOf(key) >= 0) U.say('Already found.', '');
        else U.say('That bond is still there in the products. Which bonds are gone?', 'bad');
      });
      var markR = pickBonds(right, right._geo, sc.after, function (key) {
        if (phase === 0) { U.say('First the reactants: click every bond that breaks.', ''); return; }
        if (phase !== 1) return;
        if (foK.indexOf(key) >= 0 && S.fo.indexOf(key) < 0) { S.fo.push(key); U.persist(); U.say('Formed: energy out (exothermic).', 'good'); paint(); }
        else if (S.fo.indexOf(key) >= 0) U.say('Already found.', '');
        else U.say('That bond was there before the reaction. Which bonds are new?', 'bad');
      });
      S.br.forEach(function (x) { markL(x, 'broken'); });
      S.fo.forEach(function (x) { markR(x, 'formed'); });
      var list = h('ul', { class: 'checklist' }, [
        h('li', { class: phase > 0 ? 'done' : '', text: 'Bonds broken: ' + S.br.length + ' of ' + brK.length }),
        h('li', { class: phase > 1 ? 'done' : '', text: 'Bonds formed: ' + S.fo.length + ' of ' + foK.length })
      ]);
      var bars = h('div');
      if (phase === 2) bars.appendChild(barsBox(sc, L, S));
      area.appendChild(U.panel(sc.title, 'click the bonds', [chips, h('div', { class: 'rxn' }, [h('div', { class: 'mol-wrap' }, [left]),
        h('div', { class: 'yields' }), h('div', { class: 'mol-wrap' }, [right])]), list]));
      area.appendChild(bars);
    }
    function barsBox(sc, L, S) {
      var svg = Render.svg('bars', 'Energy taken in by the bonds broken and given out by the bonds formed');
      svg.setAttribute('viewBox', '0 0 330 190');
      var all = L.broken.concat(L.formed).map(function (b) { return bde(sc, b); });
      var max = all.reduce(function (t, v) { return t + v; }, 0) / 2 + 200;
      function draw(p) {
        svg.innerHTML = '';
        var base = 160, sc2 = 140 / max;
        [[L.broken, 70, 'in', 'Energy in: bonds broken'], [L.formed, 230, 'out', 'Energy out: bonds formed']].forEach(function (col) {
          var y = base;
          col[0].forEach(function (b, n) {
            var v = bde(sc, b) * sc2 * seg(p, n * 0.25 + (col[2] === 'out' ? 0.5 : 0), n * 0.25 + 0.25 + (col[2] === 'out' ? 0.5 : 0));
            el('rect', { x: col[1] - 34, y: f1(y - v), width: 68, height: f1(Math.max(0, v)), class: 'bar ' + col[2] }, svg);
            if (v > 14) el('text', { x: col[1], y: f1(y - v / 2 + 4), 'text-anchor': 'middle', class: 'bar-text' }, svg, U.bondName(col[2] === 'in' ? sc.before : sc.after, b).replace(' bond', ''));
            y -= v;
          });
          el('text', { x: col[1], y: 180, 'text-anchor': 'middle', class: 'en-axis-text' }, svg, col[3]);
        });
        el('line', { x1: 20, y1: base, x2: 310, y2: base, class: 'en-axis' }, svg);
        /* the top of each stack, carried across, so the gap shows */
        if (p > 0.98) {
          var tin = L.broken.reduce(function (t, b) { return t + bde(sc, b); }, 0) * sc2, tout = L.formed.reduce(function (t, b) { return t + bde(sc, b); }, 0) * sc2;
          el('line', { x1: 36, y1: f1(base - tin), x2: 290, y2: f1(base - tin), class: 'en-guide' }, svg);
          el('line', { x1: 36, y1: f1(base - tout), x2: 290, y2: f1(base - tout), class: 'en-guide' }, svg);
          el('line', { x1: 300, y1: f1(base - tin), x2: 300, y2: f1(base - tout), class: 'en-bracket' }, svg);
        }
      }
      var sl = U.slider(draw, { from: '', to: '', label: 'Build the energy bars' });
      draw(S.ans != null ? 1 : 0);
      if (S.ans != null) sl.range.value = 100;
      var i = ids.indexOf(sc.id), ans = exo(i);
      var q = h('div');
      function paintQ() {
        q.innerHTML = '';
        q.appendChild(h('p', { class: 'q-text', text: 'Compare the two stacks. This reaction is:' }));
        q.appendChild(U.choiceRow(['Exothermic: more energy comes out', 'Endothermic: more energy goes in'], ans, S.ans, function (c) {
          S.ans = c; U.persist();
          if (c === ans) {
            var msg = ans === 0 ? 'Exothermic: the bonds formed are stronger than the bonds broken, so more energy comes out than goes in. Klein: ΔH° = −' + Math.abs(sc.kleinH) + ' kJ/mol.'
                                : 'Endothermic: the bonds broken are stronger than the bonds formed, so more energy goes in than comes out. Klein: ΔH° = +' + sc.kleinH + ' kJ/mol.';
            if (ids.every(function (x, j) { return isDone(j); })) U.complete(msg);
            else { U.say(msg + ' On to the next reaction.', 'good'); k = Math.min(ids.length - 1, k + 1); pr.k = k; U.persist(); }
            paint();
          } else { U.say('Not this time. Play the bars and compare the height of the two stacks.', 'bad'); paintQ(); }
        }));
      }
      paintQ();
      return U.panel('Energy in, energy out', 'bar heights from Klein Table 6.1', [svg, sl.node, q]);
    }
    paint();
  };

  /* =========================================================== entropy */

  function gasPic(n) {
    var s = Render.svg('gas', 'Gas molecules in two flasks');
    s.setAttribute('viewBox', '0 0 320 140');
    var rand = U.rng(7), dots = [];
    for (var i = 0; i < n; i++) {
      var a = [40 + rand() * 80, 30 + rand() * 80];
      var right = i % 2 === 1 || rand() < 0.1;
      var b = right ? [200 + rand() * 80, 30 + rand() * 80] : [40 + rand() * 80, 30 + rand() * 80];
      dots.push({ a: a, b: b, ph: rand() * 6.28, d: right ? rand() * 0.25 : 0 });
    }
    function set(p) {
      s.innerHTML = '';
      el('circle', { cx: 80, cy: 70, r: 58, class: 'flask' }, s);
      el('circle', { cx: 240, cy: 70, r: 58, class: 'flask' }, s);
      el('rect', { x: 136, y: 62, width: 48, height: 16, class: 'flask-neck' }, s);
      el('rect', { x: 154, y: 52, width: 12, height: 36, class: 'valve' + (p > 0.02 ? ' open' : '') }, s);
      dots.forEach(function (d) {
        var u = seg(p, 0.05 + d.d, 0.75 + d.d);
        var x = d.a[0] + (d.b[0] - d.a[0]) * u, y = d.a[1] + (d.b[1] - d.a[1]) * u;
        if (u > 0 && u < 1 && d.b[0] > 150) y = 70 + (y - 70) * Math.abs(Math.cos(u * Math.PI)) * 0.9;
        x += Math.sin(p * 30 + d.ph) * 3; y += Math.cos(p * 26 + d.ph) * 3;
        el('circle', { cx: f1(x), cy: f1(y), r: 3.6, class: 'gas-dot' }, s);
      });
    }
    set(0);
    return { node: s, set: set };
  }

  /* ΔS of the system from the drawings: more pieces, or fewer rings */
  function dS(before, after) {
    var p0 = Chem.pieces(before).length, p1 = Chem.pieces(after).length;
    if (p1 !== p0) return p1 > p0 ? 1 : -1;
    var r0 = before.bonds.length - before.atoms.length + p0, r1 = after.bonds.length - after.atoms.length + p1;
    return r1 < r0 ? 1 : r1 > r0 ? -1 : 0;
  }
  var DS_CARDS = [
    { id: 's1', before: function () { return SC.brLoss.before; }, after: function () { return SC.brLoss.after; }, text: 'A C–Br bond breaks: one molecule becomes two ions.' },
    { id: 's2', before: function () { return SC.nWaterTbu.before; }, after: function () { return SC.nWaterTbu.after; }, text: 'Water and a carbocation join into one ion.' },
    { id: 's3', before: function () { return SC.da.before; }, after: function () { return SC.da.after; }, text: 'Two molecules join and close a ring (Klein 6.3a).' },
    { id: 's4', before: function () { return SC.da.after; }, after: function () { return SC.da.before; }, text: 'A ring opens and splits into two molecules (Klein 6.3c).' },
    { id: 's5', before: function () { return SC.nCyclize.before; }, after: function () { return SC.nCyclize.after; }, text: 'An open chain closes into a ring.' }
  ];

  R.entropy = function (s) {
    var pr = U.progress(s.id);
    pr.c = pr.c || {};
    var gas = gasPic(40);
    var area = h('div');
    var sl = null;
    stage().appendChild(U.predictBox(P.spread, pr, 'p',
      'The gas spreads into both flasks and never gathers back on one side: there are vastly more ways to arrange the molecules over two flasks than in one. ' +
      'More possible arrangements means higher entropy. Free expansion happens by itself.', function () { paint(); U.showArea(area); }));
    stage().appendChild(area);
    function paint() {
      area.innerHTML = '';
      if (pr.p == null) return;
      sl = U.slider(gas.set, { from: 'Valve shut', to: 'Open', ms: 4200 });
      var cards = h('div', { class: 'cards wide' });
      U.shuffle(DS_CARDS, U.rng(U.seed() ^ 31)).forEach(function (c) {
        var b = c.before(), a = c.after(), ans = dS(b, a) > 0 ? 0 : 1;
        var row = U.choiceRow(['ΔS > 0', 'ΔS < 0'], ans, pr.c[c.id], function (i) {
          pr.c[c.id] = i; U.persist();
          var why = ans === 0 ? 'ΔS > 0: ' + (Chem.pieces(a).length > Chem.pieces(b).length ? 'more molecules (or ions) afterwards, more ways to arrange them.' : 'an open chain has more freedom than a ring.')
                              : 'ΔS < 0: ' + (Chem.pieces(a).length < Chem.pieces(b).length ? 'fewer molecules afterwards, fewer ways to arrange them.' : 'a ring has less freedom than an open chain.');
          if (i === ans) {
            if (DS_CARDS.every(function (x) { return pr.c[x.id] === (dS(x.before(), x.after()) > 0 ? 0 : 1); })) U.complete(why + ' All sorted.');
            else U.say(why, 'good');
          } else U.say('Count the separate molecules and ions before and after, and look for a ring forming or opening.', 'bad');
          paint();
        });
        cards.appendChild(h('div', { class: 'card' }, [h('div', { class: 'rxn small' }, [Render.draw(b, { scale: 24, label: 'Before' }), h('div', { class: 'yields' }),
          Render.draw(a, { scale: 24, label: 'After' })]), h('p', { class: 'muted', text: c.text }), row]));
      });
      area.appendChild(h('div', { class: 'work' }, [
        U.panel('Free expansion', 'Klein Figure 6.6', [h('div', { class: 'mol-wrap' }, [gas.node]), sl.node]),
        U.panel('The sign of ΔS for the system', 'Klein Figure 6.7', [cards])
      ]));
    }
    paint();
    return { destroy: function () { if (sl) sl.stop(); } };
  };

  /* ============================================================= favor */

  /* ΔG = ΔH − TΔS: when is each combination thermodynamically favorable? */
  var SIGNS = [[-1, 1], [1, -1], [-1, -1], [1, 1]];
  var WHEN = ['At every temperature', 'At no temperature', 'Only at low temperature', 'Only at high temperature'];
  function when(dH, dS) { return dH < 0 && dS > 0 ? 0 : dH > 0 && dS < 0 ? 1 : dH < 0 ? 2 : 3; }

  R.favor = function (s) {
    var pr = U.progress(s.id);
    pr.t = pr.t || [null, null, null, null];
    var P2 = SCENES.PROFILES;
    stage().appendChild(h('div', { class: 'grid2' }, [
      U.panel('Exergonic', 'ΔG < 0', [Energy.draw(P2.exo, { dG: 'Exergonic', label: 'An exergonic reaction' }),
        h('p', { class: 'muted', text: 'Products lower in free energy: thermodynamically favorable. At equilibrium, products are favored: K > 1.' })]),
      U.panel('Endergonic', 'ΔG > 0', [Energy.draw(P2.endo, { dG: 'Endergonic', label: 'An endergonic reaction' }),
        h('p', { class: 'muted', text: 'Products higher in free energy: not thermodynamically favorable. Reactants are favored: K < 1.' })])
    ]));
    var box = h('div');
    stage().appendChild(U.panel('ΔG = ΔH − TΔS', 'when is it thermodynamically favorable?', [box]));
    function paint() {
      box.innerHTML = '';
      var t = h('table', { class: 'rel-table' }, [h('tr', null, [h('th', { text: 'ΔH' }), h('th', { text: 'ΔS' }), h('th', { text: 'Thermodynamically favorable…' })])]);
      SIGNS.forEach(function (sg, i) {
        var ans = when(sg[0], sg[1]);
        t.appendChild(h('tr', null, [h('td', { text: sg[0] < 0 ? '− (exothermic)' : '+ (endothermic)' }), h('td', { text: sg[1] > 0 ? '+' : '−' }),
          h('td', null, [U.choiceRow(WHEN, ans, pr.t[i], function (c) {
            pr.t[i] = c; U.persist();
            var why = ['Both terms help: ΔH is negative and −TΔS is negative, so ΔG < 0 at any temperature.',
                       'Both terms hurt: ΔH is positive and −TΔS is positive, so ΔG > 0 at any temperature.',
                       'ΔH helps and −TΔS hurts. At low T the −TΔS term is small, so ΔH wins: favorable only at low temperature. (Klein’s diene and alkene making a ring.)',
                       'ΔH hurts and −TΔS helps. At high T the −TΔS term is large enough to win: favorable only at high temperature.'][ans];
            if (c === ans) {
              if (SIGNS.every(function (x, j) { return pr.t[j] === when(x[0], x[1]); })) U.complete(why + ' Table done.');
              else U.say(why, 'good');
            } else U.say('Look at the signs of the two terms in ΔG = ΔH + (−TΔS). Which one gets bigger as T rises?', 'bad');
            paint();
          })])]));
      });
      box.appendChild(t);
    }
    paint();
  };

  /* =========================================================== diagram */

  R.diagram = function (s) {
    var pr = U.progress(s.id);
    pr.f = pr.f || {};
    var area = h('div');
    var sliders = [];
    stage().appendChild(U.predictBox(P.peak, pr, 'p',
      'In a valley: the carbocation is an intermediate. It is a real species with a short lifetime, made in one step and used up in the next. ' +
      'The peaks on either side are transition states, where bonds are partly broken and partly formed.', function () { paint(); U.showArea(area); }));
    stage().appendChild(area);
    var RXN = [
      { key: 'f623', title: 'Two steps: 2-bromo-2-methylpropane and Cl⁻', hint: 'Klein Figure 6.23', chain: SC.f623 },
      { key: 'f622', title: 'One step: bromomethane and Cl⁻', hint: 'Klein Figure 6.22', scene: SC.f622 }
    ];
    function need(r) { return Energy.kinds(SCENES.PROFILES[r.key]); }
    function doneAll() { return RXN.every(function (r) { var n = need(r); return Object.keys(n).every(function (i) { return pr.f[r.key + i]; }); }); }
    function paint() {
      area.innerHTML = '';
      sliders.forEach(function (x) { x.stop(); });
      sliders = [];
      if (pr.p == null) return;
      RXN.forEach(function (r) {
        var prof = SCENES.PROFILES[r.key];
        var kinds = need(r);
        var host = h('div', { class: 'graph-host' });
        var picks = {};
        for (var i = 1; i < prof.length - 1; i++) picks[i] = 'Point ' + i + ' on the curve';
        var found = {};
        Object.keys(kinds).forEach(function (i) { if (pr.f[r.key + i]) found[i] = kinds[i]; });
        var pl = r.chain ? Render.ChainPlayer(r.chain, { scale: 34 }) : Render.Player(r.scene, { scale: 34, ts: { partial: ['Br', 'Cl'] } });
        var mark = 0;
        function drawDiagram() {
          host.innerHTML = '';
          var svg = Energy.draw(prof, { marker: mark, pick: picks, found: found, axis: 'Potential energy', Ea: true, label: r.title + ': energy diagram' });
          host.appendChild(svg);
          function go(ev) {
            var d = ev.target.closest && ev.target.closest('.en-pick');
            if (!d) return;
            var i = +d.getAttribute('data-drop');
            var kind = kinds[i];
            if (!kind) { U.say('That point is on a slope, between a peak and a valley.', 'bad'); return; }
            if (pr.f[r.key + i]) return;
            pr.f[r.key + i] = 1; U.persist(); found[i] = kind;
            U.say(kind === 'ts' ? 'A peak: a transition state. Bonds are partly broken and partly formed here; it cannot be isolated.'
                                : 'A valley: an intermediate (here the carbocation). It lives for a short time and can be isolated in principle.', 'good');
            if (doneAll()) U.complete('Every transition state and intermediate found. Eₐ, the climb to the first peak, decides how fast; ΔG, reactants to products, decides which side is favored.');
            drawDiagram();
          }
          svg.addEventListener('click', go);
          svg.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(ev); } });
        }
        drawDiagram();
        var sl = U.slider(function (p) { pl.set(p); mark = p; drawDiagram(); }, { ms: r.chain ? 6000 : 3600, frames: r.chain ? 8 : 4 });
        sliders.push(sl);
        var n = need(r), nt = 0, ni = 0;
        Object.keys(n).forEach(function (i) { if (n[i] === 'ts') nt++; else ni++; });
        area.appendChild(U.panel(r.title, r.hint, [h('div', { class: 'work' }, [h('div', null, [h('div', { class: 'mol-wrap anim' }, [pl.node]), sl.node]),
          h('div', null, [host, h('p', { class: 'muted', text: 'Click each transition state (' + nt + ') and each intermediate (' + ni + ').' })])])]));
      });
    }
    paint();
    return { destroy: function () { sliders.forEach(function (x) { x.stop(); }); } };
  };

  /* ============================================================== rich */

  R.rich = function (s) {
    var pr = U.progress(s.id);
    var area = h('div');
    stage().appendChild(U.predictBox(P.poor, pr, 'p',
      'Cl is more electronegative than C, so it pulls electron density away: the carbon of CH₃Cl is δ+, electron-poor. Li is less electronegative than C, ' +
      'so the carbon of CH₃Li is δ−, electron-rich. Opposite charges attract: these two react with each other (Klein Figure 6.26).',
      function () { paint(); if (!U.isDone(s.id)) U.complete(); U.showArea(area); }));
    stage().appendChild(area);
    function card(id) {
      var sc = SC[id], st = sc.before;
      var part = Chem.partials(st, 'C', 'X');
      var svg = Render.draw(st, { scale: 46, partial: part, label: sc.title + ', with partial charges' });
      /* the electron cloud: rich atoms glow, poor ones fade */
      var g = el('g', { class: 'cloud' }, null);
      ['C', 'X'].forEach(function (a) {
        var p = svg._geo.P[a];
        el('circle', { cx: f1(p[0]), cy: f1(p[1]), r: part[a] === '-' ? 30 : 20, class: 'dens ' + (part[a] === '-' ? 'rich' : 'poor') }, g);
      });
      svg.insertBefore(g, svg.firstChild);
      var cw = Chem.charge(st, 'C');
      void cw;
      return U.panel(sc.title, part.C === '+' ? 'the carbon is electron-poor' : 'the carbon is electron-rich', [h('div', { class: 'mol-wrap' }, [svg]),
        h('p', { class: 'muted', text: part.C === '+' ? 'δ+ carbon: an electrophile ("electron lover"), a Lewis acid. It can accept a pair of electrons.'
                                                     : 'δ− carbon: a nucleophile ("nucleus lover"), a Lewis base. It can give a pair of electrons.' })]);
    }
    function paint() {
      area.innerHTML = '';
      if (pr.p == null) return;
      area.appendChild(h('div', { class: 'grid2' }, [card('ch3cl'), card('ch3li')]));
      area.appendChild(U.panel('The two players', null, [h('ul', { class: 'keylist' }, [
        h('li', { text: 'A nucleophile is electron-rich and gives a pair of electrons: a Lewis base. Nucleophiles are attracted to positive charge.' }),
        h('li', { text: 'An electrophile is electron-poor and accepts a pair of electrons: a Lewis acid. Electrophiles are attracted to negative charge.' }),
        h('li', { text: 'Ionic (polar) reactions, about 95% of the reactions in this course, happen when the two meet. Being able to spot them is the skill behind every mechanism.' })
      ])]));
    }
    paint();
  };

  /* ============================================================== sort */

  var SORT_IDS = ['k8a', 'k8b', 'k8c', 'k8d', 'k8e', 'k8f', 'k8g', 'k8h', 'k8i', 'k8j', 'kWater', 'kMeOH', 'kHS', 'kAcetone'];
  function roleOf(id) { var c = Chem.centres(SC[id].before); return c.elec.length ? 'elec' : 'nuc'; }
  function roleWhy(id) {
    var st = SC[id].before, c = Chem.centres(st);
    if (c.elec.length) {
      var e = c.elec[0];
      if (Chem.charge(st, e) > 0) return 'A carbocation: its empty p orbital accepts a pair of electrons. Electrophile.';
      if (Chem.neighbours(st, e).some(function (n) { return n.o === 2; })) return 'A carbonyl group: the C of the C=O is δ+ by induction and by resonance. Electrophile.';
      return 'An alkyl halide: the halogen pulls electron density from its carbon, which is δ+. Electrophile.';
    }
    if (c.pi.length) return 'An alkene: its pi bond is a region of high electron density. Nucleophile.';
    var n = c.nuc[0], a = Chem.atom(st, n);
    if (Chem.charge(st, n) < 0) return 'A negative charge on ' + a.el + ', with lone pairs: a strong nucleophile.' + (a.el === 'Br' || a.el === 'S' || a.el === 'I' ? ' Large and polarizable too.' : '');
    return 'Lone pairs on O but no charge: a weak nucleophile.';
  }

  R.sort = function (s) {
    var pr = U.progress(s.id);
    pr.c = pr.c || {};
    var box = h('div', { class: 'cards' });
    stage().appendChild(U.panel('Nucleophile or electrophile?', 'Klein 6.8 and Table 6.3', [box]));
    function paint() {
      box.innerHTML = '';
      U.shuffle(SORT_IDS, U.rng(U.seed() ^ 19)).forEach(function (id) {
        var sc = SC[id], ans = roleOf(id) === 'nuc' ? 0 : 1;
        var row = U.choiceRow(['Nucleophile', 'Electrophile'], ans, pr.c[id], function (i) {
          pr.c[id] = i; U.persist();
          if (i === ans) {
            if (SORT_IDS.every(function (x) { return pr.c[x] === (roleOf(x) === 'nuc' ? 0 : 1); })) U.complete(roleWhy(id) + ' All sorted.');
            else U.say(roleWhy(id), 'good');
          } else U.say('Look for a negative charge, lone pairs or a pi bond (electron-rich), or a positive charge or a δ+ carbon (electron-poor).', 'bad');
          paint();
        });
        box.appendChild(h('div', { class: 'card' }, [h('div', { class: 'mol-wrap' }, [Render.draw(sc.before, { scale: 30, label: sc.label || sc.title })]),
          h('p', { class: 'muted', text: sc.label || sc.title }), row]));
      });
    }
    paint();
  };

  /* =========================================================== centres */

  R.centres = function (s) {
    var pr = U.progress(s.id);
    var ids = ['sb62', 'p69', 'bromobutene'];
    var k = pr.k || 0;
    var area = h('div');
    stage().appendChild(area);
    function S(i) { pr['m' + i] = pr['m' + i] || { nuc: [], elec: [] }; return pr['m' + i]; }
    function needs(i) {
      var c = Chem.centres(SC[ids[i]].before);
      return { nuc: c.nuc.map(function (x) { return [x]; }).concat(c.pi), elec: c.elec.map(function (x) { return [x]; }) };
    }
    function hit(list, id) { for (var j = 0; j < list.length; j++) if (list[j].indexOf(id) >= 0) return j; return -1; }
    function isDone(i) { var n = needs(i), m = S(i); return m.nuc.length === n.nuc.length && m.elec.length === n.elec.length; }
    function paint() {
      area.innerHTML = '';
      var sc = SC[ids[k]], st = sc.before, m = S(k), n = needs(k);
      var phase = m.nuc.length < n.nuc.length ? 'nuc' : 'elec';
      var svg = Render.draw(st, { scale: 42, label: sc.title });
      var labels = {};
      st.atoms.forEach(function (a) { if (a.el !== 'H') labels[a.id] = Judge.name({}, st, a.id); });
      var mark = pickAtoms(svg, svg._geo, labels, function (id) {
        if (isDone(k)) return;
        var list = n[phase], j = hit(list, id);
        var done = m[phase];
        if (j >= 0 && done.indexOf(j) < 0) {
          done.push(j); U.persist();
          var a = Chem.atom(st, id);
          var msg = phase === 'nuc'
            ? (list[j].length === 2 ? 'The pi bond: a region of high electron density. Nucleophilic.' : 'The O of the OH: lone pairs. A nucleophilic centre (a weak one).')
            : (Chem.neighbours(st, id).some(function (x) { return x.o === 2; }) ? 'The C of the C=O: δ+. Electrophilic.' : 'The C bonded to ' + Chem.neighbours(st, id).map(function (x) { return Chem.atom(st, x.id).el; }).filter(function (e) { return Chem.HALOGEN.indexOf(e) >= 0; })[0] + ': δ+. Electrophilic.');
          void a;
          if (ids.every(function (x, q) { return isDone(q); })) U.complete(msg + ' Every centre found.');
          else if (isDone(k)) { U.say(msg + ' This molecule is done.', 'good'); k = Math.min(ids.length - 1, k + 1); pr.k = k; U.persist(); }
          else U.say(msg, 'good');
          paint();
          return;
        }
        if (j >= 0) { U.say('Already found.', ''); return; }
        var other = phase === 'nuc' ? n.elec : n.nuc;
        var at = Chem.atom(st, id);
        if (hit(other, id) >= 0) U.say(phase === 'nuc' ? 'That is an electrophilic centre. First the nucleophilic ones.' : 'That one is nucleophilic; you found it already.', 'bad');
        else if (at.el === 'O' && Chem.neighbours(st, id).some(function (x) { return x.o === 2; })) U.say('Klein does not count the O of a C=O as a nucleophile in this course: a carbonyl group reacts as an electrophile, at its carbon.', 'bad');
        else if (Chem.HALOGEN.indexOf(at.el) >= 0) U.say('The halogen of an alkyl halide is not the reactive centre. It makes the carbon it is bonded to δ+: click that carbon as an electrophilic centre.', 'bad');
        else U.say('That atom is neither: no charge, no lone pair, no pi bond and no polar bond to Cl, Br or O.', 'bad');
      });
      n.nuc.forEach(function (g, j) { if (m.nuc.indexOf(j) >= 0) g.forEach(function (id) { mark(id, 'found'); }); });
      n.elec.forEach(function (g, j) { if (m.elec.indexOf(j) >= 0) g.forEach(function (id) { mark(id, 'alpha'); }); });
      var chips = U.chipRow('Molecule', ids.map(function (id) { return SC[id].title; }), k, isDone, function (i) { return i === 0 || isDone(i - 1); },
        function (i) { k = i; pr.k = i; U.persist(); paint(); });
      var list = h('ul', { class: 'checklist' }, [
        h('li', { class: m.nuc.length === n.nuc.length ? 'done' : '', text: 'Nucleophilic centres: ' + m.nuc.length + ' of ' + n.nuc.length + (n.nuc.length ? '' : ' (none)') }),
        h('li', { class: isDone(k) ? 'done' : '', text: 'Electrophilic centres: ' + m.elec.length + ' of ' + n.elec.length })
      ]);
      area.appendChild(U.panel('Find the centres', phase === 'nuc' && !isDone(k) ? 'now: nucleophilic' : 'now: electrophilic', [chips,
        h('div', { class: 'work' }, [h('div', { class: 'mol-wrap big' }, [svg]), h('div', null, [list, h('p', { class: 'muted', text: 'Green: nucleophilic. Orange: electrophilic.' })])])]));
    }
    paint();
  };

  App.dS = dS;
  App.SORT_IDS = SORT_IDS;
  App.roleOf = roleOf;
  App.when = when;
  App.SIGNS = SIGNS;
})();

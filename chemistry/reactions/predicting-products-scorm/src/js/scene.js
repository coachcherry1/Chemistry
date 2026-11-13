/* scene.js: two small particle animations, drawn from a problem of
 * problems.js so the particles always match the chemistry.
 *
 *   Scene.plate(host, problem, onDone)   a metal strip in a solution: if the
 *        metal is above the dissolved one, ions arrive at the strip and become
 *        atoms while atoms of the strip leave as ions; if not, nothing changes
 *   Scene.mix(host, problem, onDone)     two solutions poured together: the
 *        ions of an insoluble product meet and settle as a solid on the
 *        bottom; the others keep floating. With no solid, nothing settles
 *
 * Each has a Play button (and Play again). Reduced motion shows the end at
 * once. Water is not drawn. Sizes are only roughly to scale here; the net
 * ionic package draws ions to scale.
 */
var Scene = (function () {
  'use strict';
  var h = UI.h;
  var NS = 'http://www.w3.org/2000/svg';
  var SUP = { 1: '', 2: '²', 3: '³' };
  var CENTRE = { NO3: 'N', SO4: 'S', CO3: 'C', PO4: 'P', OH: 'O', C2H3O2: 'C', NH4: 'N' };

  function s(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] == null) return; if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function animate(ms, step, end) {
    if (reduced()) { step(1); if (end) end(); return function () {}; }
    var t0 = null, stop = false;
    function frame(t) {
      if (stop) return;
      if (t0 == null) t0 = t;
      var k = Math.min(1, (t - t0) / ms);
      step(k);
      if (k < 1) requestAnimationFrame(frame); else if (end) end();
    }
    requestAnimationFrame(frame);
    return function () { stop = true; };
  }
  function ease(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
  function clamp(k) { return Math.max(0, Math.min(1, k)); }

  function look(key) {
    var el = CENTRE[key] || key, E = Particles.EL[el];
    return { fill: E[2], ink: E[3], r: CENTRE[key] ? 16 : Math.max(13, Math.min(16, Particles.radius(el) * 0.9)) };
  }
  /* a particle: a circle and its label; charge 0 for an atom */
  function dot(key, q, sign) {
    var L = look(key), label = Chem.pretty(key === 'C2H3O2' ? 'C2H3O2' : key);
    var g = s('g', { class: 'sc-ion' });
    var c = s('circle', { r: L.r, cx: 0, cy: 0, fill: L.fill, class: 'atom' });
    var t = s('text', { x: 0, y: 3.5, fill: L.ink, class: 'atom-t', 'font-size': label.length > 3 ? 7.5 : label.length > 2 ? 9.5 : 11 });
    g.appendChild(c); g.appendChild(t);
    function setCharge(qq) { t.textContent = label + (qq ? SUP[qq] + (sign === '+' ? '⁺' : '⁻') : ''); }
    setCharge(q);
    return { g: g, set: setCharge, at: function (x, y) { g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')'); }, r: L.r };
  }
  function frame(host, title, w, hgt) {
    var svg = s('svg', { viewBox: '0 0 ' + w + ' ' + hgt, class: 'scene-svg', role: 'img', 'aria-label': title });
    var cap = h('p', { class: 'scene-cap', role: 'status', 'aria-live': 'polite' });
    var btn = h('button', { type: 'button', class: 'primary scene-play', text: 'Play' });
    host.appendChild(h('div', { class: 'scene-box' }, [svg, h('div', { class: 'btnrow' }, [btn]), cap]));
    return { svg: svg, cap: cap, btn: btn };
  }
  /* spread n points in a box, deterministic */
  function scatter(n, x0, y0, x1, y1, seed) {
    var rand = UI.rng(seed), cols = Math.ceil(Math.sqrt(n * (x1 - x0) / (y1 - y0))), rows = Math.ceil(n / cols), cells = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      cells.push({ x: x0 + (c + 0.5) * (x1 - x0) / cols + (rand() - 0.5) * 12, y: y0 + (r + 0.5) * (y1 - y0) / rows + (rand() - 0.5) * 10 });
    }
    return UI.shuffle(cells, rand).slice(0, n);
  }

  /* ------------------------------------------------------------------ plate */
  function plate(host, p, onDone) {
    var W = 520, H = 250, f = frame(host, p.prompt, W, H);
    var salt = Ions.parts(p.l[1]), metal = p.el, out = p.out;
    var qm = Ions.CATIONS[metal][1], qo = Ions.CATIONS[out][1], qa = Ions.ANIONS[salt.an][1];
    /* whole numbers of everything: nOut ions of the dissolved metal arrive, nMet atoms leave the strip */
    function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
    var base = qm * qo / gcd(qm, qo), k = Math.ceil(4 / (base / qo));
    var nOut = base / qo * k, nMet = base / qm * k;
    if ((nOut * qo) % qa) { nOut *= qa; nMet *= qa; }
    var nAn = nOut * qo / qa;
    f.svg.appendChild(s('rect', { x: 8, y: 34, width: W - 16, height: H - 42, rx: 10, class: 'sc-water' }));
    f.svg.appendChild(s('text', { x: W - 16, y: 26, class: 'sc-label', 'text-anchor': 'end', text: 'solution of ' + Ions.name(p.l[1]) }));
    f.svg.appendChild(s('text', { x: 20, y: 26, class: 'sc-label', text: Ions.name(metal) + ' strip' }));
    var strip = [], cols = 3, rowsN = 8, r0 = look(metal).r;
    for (var c = 0; c < cols; c++) for (var r = 0; r < rowsN; r++) {
      var d = dot(metal, 0, '+');
      d.x0 = 34 + c * (2 * r0 - 1); d.y0 = 20 + r * (2 * r0 - 1) + (c % 2 ? r0 - 1 : 0);
      d.at(d.x0, d.y0); f.svg.appendChild(d.g); strip.push(d);
    }
    var edge = strip.filter(function (d) { return d.x0 > 34 + (cols - 2) * (2 * r0 - 1) + 1 && d.y0 > 70; });
    var spots = scatter(nOut + nAn, 150, 60, W - 30, H - 30, 11 + nOut);
    var outs = [], ans = [], i;
    for (i = 0; i < nOut; i++) { var o = dot(out, qo, '+'); o.x0 = spots[i].x; o.y0 = spots[i].y; o.at(o.x0, o.y0); f.svg.appendChild(o.g); outs.push(o); }
    for (i = 0; i < nAn; i++) { var a = dot(salt.an, qa, '−'); a.x0 = spots[nOut + i].x; a.y0 = spots[nOut + i].y; a.at(a.x0, a.y0); f.svg.appendChild(a.g); ans.push(a); }
    var leaving = edge.slice(0, nMet);
    var land = outs.map(function (o, k) { return { x: 34 + (cols - 1) * (2 * r0 - 1) + r0 + o.r - 3, y: 78 + k * (H - 116) / Math.max(1, nOut - 1) }; });
    /* the atoms that leave go where the arriving ions were, as far as there are places */
    var spare = scatter(nMet, 190, 70, W - 50, H - 40, 5);
    var free = spare.map(function (pt, k) { return outs[k] ? { x: outs[k].x0, y: outs[k].y0 } : pt; });
    var stop = null, played = false;
    function reset() {
      outs.forEach(function (o) { o.at(o.x0, o.y0); o.set(qo); });
      strip.forEach(function (d) { d.at(d.x0, d.y0); d.set(0); });
    }
    function play() {
      if (stop) stop();
      reset();
      f.btn.disabled = true;
      f.cap.textContent = p.reacts ? 'Watch the ' + Ions.name(out).replace(/\(.*/, '') + ' ions and the atoms at the edge of the strip.' : 'Watch the strip.';
      stop = animate(p.reacts ? 3600 : 2200, function (k) {
        if (!p.reacts) {
          outs.forEach(function (o, j) { var w = Math.sin(k * Math.PI * 2 + j) * 14 * Math.sin(k * Math.PI); o.at(o.x0 - w, o.y0 + w * 0.4); });
          return;
        }
        outs.forEach(function (o, j) {
          var e = ease(clamp(k * 1.6 - j * 0.08));
          o.at(o.x0 + (land[j].x - o.x0) * e, o.y0 + (land[j].y - o.y0) * e);
          o.set(e >= 1 ? 0 : qo);
        });
        leaving.forEach(function (d, j) {
          var e = ease(clamp(k * 1.6 - 0.45 - j * 0.08));
          d.at(d.x0 + (free[j].x - d.x0) * e, d.y0 + (free[j].y - d.y0) * e);
          d.set(e > 0.25 ? qm : 0);
        });
      }, function () {
        f.btn.disabled = false; f.btn.textContent = 'Play again';
        f.cap.textContent = p.reacts
          ? cap(Ions.name(out).replace(/\(.*/, '')) + ' ions have become ' + Ions.name(Ions.elementOf(out)) + ' atoms on the strip, and ' + Ions.name(metal).replace(/\(.*/, '') +
            ' atoms have gone into the solution as ions. The ' + Ions.ANIONS[salt.an][2] + ' ions did nothing.'
          : 'Nothing happens: ' + Ions.name(metal).replace(/\(.*/, '') + ' is below ' + Ions.name(out).replace(/\(.*/, '') + ' in the activity series.';
        if (!played) { played = true; if (onDone) onDone(); }
      });
    }
    function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
    f.btn.addEventListener('click', play);
    return { play: play };
  }

  /* -------------------------------------------------------------------- mix */
  function mix(host, p, onDone) {
    var W = 520, H = 250, f = frame(host, p.prompt, W, H);
    /* enough formula units to see a pattern, few enough to count */
    var per = 0;
    p.l.forEach(function (fm, side) { var pr = Ions.parts(fm), r = Ions.ratio(pr.cat, pr.an); per += p.coefs[side] * (r[0] + r[1]); });
    var K = Math.max(1, Math.min(4, Math.floor(24 / per)));
    f.svg.appendChild(s('rect', { x: 8, y: 8, width: W - 16, height: H - 16, rx: 10, class: 'sc-water' }));
    var divider = s('line', { x1: W / 2, y1: 14, x2: W / 2, y2: H - 14, class: 'sc-divider' });
    f.svg.appendChild(divider);
    var ions = [];
    p.l.forEach(function (fm, side) {
      var parts = Ions.parts(fm), r = Ions.ratio(parts.cat, parts.an), units = p.coefs[side] * K, list = [], i;
      for (i = 0; i < units * r[0]; i++) list.push({ key: parts.cat, q: Ions.CATIONS[parts.cat][1], sign: '+' });
      for (i = 0; i < units * r[1]; i++) list.push({ key: parts.an, q: Ions.ANIONS[parts.an][1], sign: '−' });
      var start = scatter(list.length, side ? W / 2 + 16 : 20, 22, side ? W - 20 : W / 2 - 16, H - 60, 3 + side);
      list.forEach(function (it, k) { it.x0 = start[k].x; it.y0 = start[k].y; it.side = side; ions.push(it); });
    });
    var mixed = scatter(ions.length, 24, 22, W - 24, H - 78, 29);
    ions.forEach(function (it, k) { it.d = dot(it.key, it.q, it.sign); it.x1 = mixed[k].x; it.y1 = mixed[k].y; it.d.at(it.x0, it.y0); f.svg.appendChild(it.d.g); });
    /* the ions of a solid settle in a row on the bottom, positive and negative alternating */
    var solidKeys = {};
    p.solids.forEach(function (fm) { var pr = Ions.parts(fm); solidKeys[pr.cat] = 1; solidKeys[pr.an] = 1; });
    var settling = ions.filter(function (it) { return solidKeys[it.key]; });
    settling.sort(function (a, b) { return (a.sign === b.sign ? 0 : a.sign === '+' ? -1 : 1); });
    var pos = settling.filter(function (it) { return it.sign === '+'; }), neg = settling.filter(function (it) { return it.sign === '−'; }), order = [];
    while (pos.length || neg.length) { if (pos.length) order.push(pos.shift()); if (neg.length) order.push(neg.shift()); }
    var perRow = Math.ceil(order.length / 2), step = Math.min(30, (W - 60) / Math.max(1, perRow));
    order.forEach(function (it, k) {
      var row = k < perRow ? 0 : 1, col = row ? k - perRow : k;
      it.x2 = W / 2 - (perRow - 1) * step / 2 + col * step + (row ? step / 2 : 0); it.y2 = H - 26 - row * 24; it.solid = true;
    });
    var stop = null, played = false;
    function play() {
      if (stop) stop();
      f.btn.disabled = true;
      divider.setAttribute('visibility', 'hidden');
      f.cap.textContent = 'The two solutions mix.';
      stop = animate(p.reacts ? 4200 : 2600, function (k) {
        var a = ease(clamp(k / (p.reacts ? 0.45 : 0.9))), b = p.reacts ? ease(clamp((k - 0.5) / 0.5)) : 0;
        ions.forEach(function (it) {
          var x = it.x0 + (it.x1 - it.x0) * a, y = it.y0 + (it.y1 - it.y0) * a;
          if (it.solid) { x += (it.x2 - x) * b; y += (it.y2 - y) * b; it.d.set(b >= 1 ? 0 : it.q); }
          it.d.at(x, y);
        });
      }, function () {
        f.btn.disabled = false; f.btn.textContent = 'Play again';
        f.cap.textContent = p.reacts
          ? p.solids.map(function (fm) { return Chem.pretty(fm); }).join(' and ') + ' is insoluble: its ions met and settled as a solid. The other ions are still floating: they did nothing.'
          : 'Every ion is still floating. No pair is insoluble, so nothing forms: no reaction.';
        if (!played) { played = true; if (onDone) onDone(); }
      });
    }
    f.btn.addEventListener('click', play);
    return { play: play };
  }

  return { plate: plate, mix: mix };
})();

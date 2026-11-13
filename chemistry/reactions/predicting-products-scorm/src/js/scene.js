/* scene.js: the particle animations, drawn from a problem of problems.js so
 * the particles always match the chemistry.
 *
 *   Scene.show(host, problem, opts)   picks the picture for the problem:
 *     a metal in a salt solution   ions arrive at the strip and become atoms
 *                                  while atoms of the strip leave as ions
 *     a metal in an acid           H+ ions arrive, H2 leaves as bubbles, atoms
 *                                  of the strip leave as ions
 *     a metal in cold water        HOH arrives, leaves an OH- behind and H2
 *                                  bubbles away; atoms of the strip leave as ions
 *     a halogen and a halide       each halogen molecule meets two halide
 *                                  ions: it becomes two halide ions, and they
 *                                  become a molecule
 *     two solutions mixed          the ions of an insoluble product meet and
 *                                  settle as a solid; the others keep floating
 *   When there is no reaction, the particles move about and nothing changes.
 *   opts: onDone (first time it has played), auto (play at once).
 *
 * Each has a Play button (then Play again). Reduced motion shows the end at
 * once. Water is not drawn, except as the reactant HOH. Sizes are only
 * roughly to scale here; the net ionic package draws ions to scale.
 */
var Scene = (function () {
  'use strict';
  var h = UI.h;
  var NS = 'http://www.w3.org/2000/svg';
  var SUP = { 1: '', 2: '²', 3: '³' };
  var CENTRE = { NO3: 'N', SO4: 'S', CO3: 'C', PO4: 'P', OH: 'O', C2H3O2: 'C', NH4: 'N', HOH: 'O' };
  var W = 520, H = 250;

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
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function plain(name) { return name.replace(/\(.*/, ''); }
  function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }

  /* a particle: a circle and its label. key: an element, an ion or a molecule
     (H2, Cl2, HOH); q and sign: its charge, 0 for an atom or a molecule */
  function dot(key, q, sign) {
    var g = s('g', { class: 'sc-ion' });
    var c = s('circle', { cx: 0, cy: 0, class: 'atom' });
    var t = s('text', { x: 0, y: 3.5, class: 'atom-t' });
    g.appendChild(c); g.appendChild(t);
    var d = { g: g, key: key, q: q, sign: sign };
    d.as = function (k, qq, sg) {
      d.key = k; d.q = qq; d.sign = sg || d.sign;
      var base = k.replace(/2$/, ''), el = CENTRE[k] || base, E = Particles.EL[el];
      var mol = /2$/.test(k) || k === 'HOH';
      d.r = CENTRE[k] || mol ? 16 : Math.max(13, Math.min(16, Particles.radius(el) * 0.9));
      var label = Chem.pretty(k) + (qq ? SUP[qq] + (d.sign === '+' ? '⁺' : '⁻') : '');
      c.setAttribute('r', d.r); c.setAttribute('fill', E[2]);
      t.setAttribute('fill', E[3]);
      t.setAttribute('font-size', label.length > 4 ? 7.5 : label.length > 3 ? 8.5 : label.length > 2 ? 9.5 : 11);
      t.textContent = label;
      g.setAttribute('data-key', k + (qq ? d.sign : ''));
      return d;
    };
    d.set = function (qq) { return d.as(d.key, qq); };
    d.at = function (x, y) { g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')'); return d; };
    d.show = function (on) { g.setAttribute('visibility', on ? 'visible' : 'hidden'); return d; };
    return d.as(key, q, sign);
  }
  function frame(host, title) {
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'scene-svg', role: 'img', 'aria-label': title });
    var capEl = h('p', { class: 'scene-cap', role: 'status', 'aria-live': 'polite' });
    var btn = h('button', { type: 'button', class: 'primary scene-play', text: 'Play' });
    var row = h('div', { class: 'btnrow scene-row' }, [btn]);
    host.appendChild(h('div', { class: 'scene-box' }, [svg, row, capEl]));
    return { svg: svg, cap: capEl, btn: btn, row: row };
  }
  /* spread n points in a box, deterministic */
  function scatter(n, x0, y0, x1, y1, seed) {
    var rand = UI.rng(seed), cols = Math.max(1, Math.ceil(Math.sqrt(n * (x1 - x0) / (y1 - y0)))), rows = Math.max(1, Math.ceil(n / cols)), cells = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      cells.push({ x: x0 + (c + 0.5) * (x1 - x0) / cols + (rand() - 0.5) * 12, y: y0 + (r + 0.5) * (y1 - y0) / rows + (rand() - 0.5) * 10 });
    }
    return UI.shuffle(cells, rand).slice(0, n);
  }
  /* the Play button, the caption and "has played": the same for every picture */
  function player(f, o, ms, reset, step, before, after) {
    var stop = null, played = false;
    function play() {
      if (stop) stop();
      reset();
      f.btn.disabled = true;
      f.cap.textContent = before;
      stop = animate(ms, step, function () {
        f.btn.disabled = false; f.btn.textContent = 'Play again';
        f.cap.textContent = after;
        if (!played) { played = true; if (o && o.onDone) o.onDone(); }
      });
    }
    f.btn.addEventListener('click', play);
    reset();
    if (o && o.auto) play();
    return { play: play, row: f.row };
  }

  /* ------------------------------------------- a metal strip in a liquid */
  function plate(host, p, o) {
    var f = frame(host, p.prompt);
    var comp = Ions.parts(p.l[1]), metal = p.el, kind = p.sub, hyd = kind !== 'metal';
    var qm = Ions.CATIONS[metal][1], qo = hyd ? 1 : Ions.CATIONS[p.out][1];
    /* whole numbers of everything: nIn particles arrive, nMet atoms leave the strip */
    var base = qm * qo / gcd(qm, qo), k = Math.ceil(4 / (base / qo));
    var nIn = base / qo * k, nMet = base / qm * k;
    if (hyd && nIn % 2) { nIn *= 2; nMet *= 2; }                      /* H2 comes in pairs */
    var qa = kind === 'water' ? 1 : Ions.ANIONS[comp.an][1];
    if (kind !== 'water' && (nIn * qo) % qa) { nIn *= qa; nMet *= qa; }
    var nAn = kind === 'water' ? 0 : nIn * qo / qa;
    f.svg.appendChild(s('rect', { x: 8, y: 34, width: W - 16, height: H - 42, rx: 10, class: 'sc-water' }));
    f.svg.appendChild(s('text', { x: W - 16, y: 26, class: 'sc-label', 'text-anchor': 'end',
      text: kind === 'water' ? 'cold water, HOH' : kind === 'acid' ? Ions.name(p.l[1]) : 'solution of ' + Ions.name(p.l[1]) }));
    f.svg.appendChild(s('text', { x: 20, y: 26, class: 'sc-label', text: plain(Ions.name(metal)) + ' strip' }));
    var strip = [], cols = 3, rowsN = 8, r0 = dot(metal, 0, '+').r, c, r, i;
    for (c = 0; c < cols; c++) for (r = 0; r < rowsN; r++) {
      var d = dot(metal, 0, '+');
      d.x0 = 34 + c * (2 * r0 - 1); d.y0 = 20 + r * (2 * r0 - 1) + (c % 2 ? r0 - 1 : 0);
      f.svg.appendChild(d.g); strip.push(d);
    }
    var edgeX = 34 + (cols - 1) * (2 * r0 - 1) + r0;
    var leaving = strip.filter(function (x) { return x.x0 > 34 + (cols - 2) * (2 * r0 - 1) + 1 && x.y0 > 70; }).slice(0, nMet);
    var spots = scatter(nIn + nAn, 150, 60, W - 30, H - 30, 11 + nIn);
    var inKey = kind === 'water' ? 'HOH' : hyd ? 'H' : p.out, ins = [], ans = [], bubbles = [];
    for (i = 0; i < nIn; i++) { var a = dot(inKey, kind === 'water' ? 0 : qo, '+'); a.x0 = spots[i].x; a.y0 = spots[i].y; f.svg.appendChild(a.g); ins.push(a); }
    for (i = 0; i < nAn; i++) { var b = dot(comp.an, qa, '−'); b.x0 = spots[nIn + i].x; b.y0 = spots[nIn + i].y; b.at(b.x0, b.y0); f.svg.appendChild(b.g); ans.push(b); }
    ins.forEach(function (x, j) { x.lx = edgeX + x.r - 3; x.ly = 78 + j * (H - 116) / Math.max(1, nIn - 1); });
    if (hyd) for (i = 0; i < nIn / 2; i++) { var hb = dot('H2', 0, '+'); hb.x0 = edgeX + 20; hb.y0 = 90 + i * 60; hb.x1 = 150 + i * 70; hb.y1 = 14; f.svg.appendChild(hb.g); bubbles.push(hb); }
    /* the atoms that leave go where the arriving particles were, as far as there are places */
    var spare = scatter(nMet, 190, 70, W - 50, H - 40, 5);
    /* (in water the hydroxide ions go back to those places, so the metal ions stop just beside them) */
    leaving.forEach(function (x, j) {
      x.fx = ins[j] ? ins[j].x0 + (kind === 'water' ? 36 : 0) : spare[j].x;
      x.fy = ins[j] ? ins[j].y0 + (kind === 'water' ? 8 : 0) : spare[j].y;
    });

    function reset() {
      ins.forEach(function (x) { x.as(inKey, kind === 'water' ? 0 : qo, '+').show(true).at(x.x0, x.y0); });
      strip.forEach(function (x) { x.as(metal, 0, '+').at(x.x0, x.y0); });
      bubbles.forEach(function (x) { x.show(false).at(x.x0, x.y0); });
    }
    function step(t) {
      if (!p.reacts) {
        ins.forEach(function (x, j) { var w = Math.sin(t * Math.PI * 2 + j) * 14 * Math.sin(t * Math.PI); x.at(x.x0 - w, x.y0 + w * 0.4); });
        return;
      }
      ins.forEach(function (x, j) {
        var e = ease(clamp(t * 1.8 - j * 0.07));
        if (kind === 'water') {
          /* HOH reaches the strip, leaves its H there and goes back as OH- */
          var back = ease(clamp(t * 1.8 - 1 - j * 0.07) / 0.8);
          x.at(x.x0 + (x.lx - x.x0) * (e - back), x.y0 + (x.ly - x.y0) * (e - back));
          if (e >= 1) x.as('OH', 1, '−'); else x.as('HOH', 0, '+');
        } else {
          x.at(x.x0 + (x.lx - x.x0) * e, x.y0 + (x.ly - x.y0) * e);
          if (hyd) x.show(e < 1); else x.set(e >= 1 ? 0 : qo);
        }
      });
      bubbles.forEach(function (x, j) {
        var e = ease(clamp((t - 0.58 - j * 0.05) / 0.4));
        x.show(t > 0.58 + j * 0.05).at(x.x0 + (x.x1 - x.x0) * e, x.y0 + (x.y1 - x.y0) * e);
      });
      leaving.forEach(function (x, j) {
        var e = ease(clamp(t * 1.8 - 0.5 - j * 0.07));
        x.at(x.x0 + (x.fx - x.x0) * e, x.y0 + (x.fy - x.y0) * e);
        x.set(e > 0.25 ? qm : 0);
      });
    }
    var m = plain(Ions.name(metal)), after;
    if (!p.reacts) after = 'Nothing happens: ' + (kind === 'water' ? m + ' does not react with cold water.' : m + ' is below ' + plain(Ions.name(Ions.elementOf(p.out))) + ' in the activity series.');
    else if (kind === 'metal') after = cap(plain(Ions.name(p.out))) + ' ions have become ' + Ions.name(p.out).replace(/\(.*/, '') + ' atoms on the strip, and ' + m + ' atoms have gone into the solution as ions. The ' + Ions.ANIONS[comp.an][2] + ' ions did nothing.';
    else if (kind === 'acid') after = 'Hydrogen ions took electrons at the strip and left as H₂ gas. ' + cap(m) + ' atoms have gone into the solution as ions. The ' + Ions.ANIONS[comp.an][2] + ' ions did nothing.';
    else after = 'Each HOH gave up a hydrogen at the strip: H₂ gas left, hydroxide ions stayed, and ' + m + ' atoms have gone into the water as ions.';
    return player(f, o, p.reacts ? 3800 : 2200, reset, step, p.reacts ? 'Watch the edge of the strip.' : 'Watch the strip.', after);
  }

  /* --------------------------------------------- a halogen and a halide */
  function halogen(host, p, o) {
    var f = frame(host, p.prompt), comp = Ions.parts(p.l[1]), x2 = p.l[0], xs = p.el, ys = p.out, N = 2;
    f.svg.appendChild(s('rect', { x: 8, y: 8, width: W - 16, height: H - 16, rx: 10, class: 'sc-water' }));
    var mols = [], halides = [], extra = [], cats = [], i;
    /* the positive ions take no part: they sit along the top, out of the way */
    var cx0 = [52, 248, 284, 468];
    for (i = 0; i < 2 * N; i++) { var c = dot(comp.cat, 1, '+').at(cx0[i], 34 + (i % 2) * 6); f.svg.appendChild(c.g); cats.push(c); }
    for (i = 0; i < N; i++) {
      var cx = 150 + i * 220, cy = 125;
      var a = dot(ys, 1, '−'), b = dot(ys, 1, '−'), m = dot(x2, 0, '−'), e = dot(xs, 1, '−');
      a.x0 = cx - 50; a.y0 = cy + 55; b.x0 = cx + 50; b.y0 = cy + 55;
      m.x0 = cx; m.y0 = cy - 70; m.x1 = cx; m.y1 = cy + 30;
      [a, b, m, e].forEach(function (d) { f.svg.appendChild(d.g); });
      halides.push([a, b]); mols.push(m); extra.push(e);
    }
    function reset() {
      mols.forEach(function (m, j) { m.as(x2, 0, '−').at(m.x0, m.y0); extra[j].show(false); });
      halides.forEach(function (pr) { pr[0].as(ys, 1, '−').show(true).at(pr[0].x0, pr[0].y0); pr[1].as(ys, 1, '−').show(true).at(pr[1].x0, pr[1].y0); });
    }
    function step(t) {
      mols.forEach(function (m, j) {
        var pr = halides[j], e = ease(clamp(t / 0.45));
        if (!p.reacts) { var w = Math.sin(t * Math.PI); m.at(m.x0, m.y0 + (m.y1 - 28 - m.y0) * w); return; }
        var done = t > 0.5, apart = ease(clamp((t - 0.5) / 0.5));
        if (!done) { m.as(x2, 0, '−').at(m.x0, m.y0 + (m.y1 - m.y0) * e); extra[j].show(false); return; }
        /* the molecule has taken an electron from each halide: two halide ions of its own, and the others pair up */
        m.as(xs, 1, '−').at(m.x1 - 22 - 40 * apart, m.y1 - 50 * apart);
        extra[j].show(true).at(m.x1 + 22 + 40 * apart, m.y1 - 50 * apart);
        pr[0].as(ys + '2', 0, '−').at(pr[0].x0 + 50 * apart, pr[0].y0);
        pr[1].show(false);
      });
    }
    var X = Ions.name(x2), Y = Ions.name(Ions.elementOf(ys));
    var after = p.reacts ? 'Each ' + X + ' molecule became two ' + Ions.ANIONS[xs][2] + ' ions, and the ' + Ions.ANIONS[ys][2] + ' ions it met became ' + Y + ', ' + Chem.pretty(Ions.elementOf(ys)) +
        '. The ' + plain(Ions.CATIONS[comp.cat][2]) + ' ions did nothing.'
      : 'Nothing happens: ' + X + ' is below ' + Y + ' in the halogens.';
    return player(f, o, p.reacts ? 3600 : 2200, reset, step, 'Watch the ' + X + ' molecules.', after);
  }

  /* --------------------------------------------------- two solutions mixed */
  function mix(host, p, o) {
    var f = frame(host, p.prompt);
    f.svg.appendChild(s('rect', { x: 8, y: 8, width: W - 16, height: H - 16, rx: 10, class: 'sc-water' }));
    var divider = s('line', { x1: W / 2, y1: 14, x2: W / 2, y2: H - 14, class: 'sc-divider' });
    f.svg.appendChild(divider);
    /* enough formula units to see a pattern, few enough to count */
    var per = 0;
    p.l.forEach(function (fm, side) { var pr = Ions.parts(fm), r = Ions.ratio(pr.cat, pr.an); per += p.coefs[side] * (r[0] + r[1]); });
    var K = Math.max(1, Math.min(4, Math.floor(24 / per))), ions = [];
    p.l.forEach(function (fm, side) {
      var parts = Ions.parts(fm), r = Ions.ratio(parts.cat, parts.an), units = p.coefs[side] * K, list = [], i;
      for (i = 0; i < units * r[0]; i++) list.push({ key: parts.cat, q: Ions.CATIONS[parts.cat][1], sign: '+' });
      for (i = 0; i < units * r[1]; i++) list.push({ key: parts.an, q: Ions.ANIONS[parts.an][1], sign: '−' });
      var start = scatter(list.length, side ? W / 2 + 16 : 20, 22, side ? W - 20 : W / 2 - 16, H - 60, 3 + side);
      list.forEach(function (it, k) { it.x0 = start[k].x; it.y0 = start[k].y; ions.push(it); });
    });
    var mixed = scatter(ions.length, 24, 22, W - 24, H - 78, 29);
    ions.forEach(function (it, k) { it.d = dot(it.key, it.q, it.sign); it.x1 = mixed[k].x; it.y1 = mixed[k].y; f.svg.appendChild(it.d.g); });
    /* the ions of a solid settle in rows on the bottom, positive and negative alternating */
    var solidKeys = {};
    p.solids.forEach(function (fm) { var pr = Ions.parts(fm); solidKeys[pr.cat] = 1; solidKeys[pr.an] = 1; });
    var settling = ions.filter(function (it) { return solidKeys[it.key]; });
    var pos = settling.filter(function (it) { return it.sign === '+'; }), neg = settling.filter(function (it) { return it.sign === '−'; }), order = [];
    while (pos.length || neg.length) { if (pos.length) order.push(pos.shift()); if (neg.length) order.push(neg.shift()); }
    var perRow = Math.ceil(order.length / 2), gap = Math.min(30, (W - 60) / Math.max(1, perRow));
    order.forEach(function (it, k) {
      var row = k < perRow ? 0 : 1, col = row ? k - perRow : k;
      it.x2 = W / 2 - (perRow - 1) * gap / 2 + col * gap + (row ? gap / 2 : 0); it.y2 = H - 26 - row * 24; it.solid = true;
    });
    function reset() { divider.setAttribute('visibility', 'visible'); ions.forEach(function (it) { it.d.set(it.q).at(it.x0, it.y0); }); }
    function step(t) {
      divider.setAttribute('visibility', 'hidden');
      var a = ease(clamp(t / (p.reacts ? 0.45 : 0.9))), b = p.reacts ? ease(clamp((t - 0.5) / 0.5)) : 0;
      ions.forEach(function (it) {
        var x = it.x0 + (it.x1 - it.x0) * a, y = it.y0 + (it.y1 - it.y0) * a;
        if (it.solid) { x += (it.x2 - x) * b; y += (it.y2 - y) * b; it.d.set(b >= 1 ? 0 : it.q); }
        it.d.at(x, y);
      });
    }
    var after = p.reacts
      ? p.solids.map(function (fm) { return Chem.pretty(fm); }).join(' and ') + (p.solids.length > 1 ? ' are' : ' is') + ' insoluble: the ions met and settled as a solid. ' +
        (p.solids.length > 1 ? 'No ions are left floating.' : 'The other ions are still floating: they did nothing.')
      : 'Every ion is still floating. No pair is insoluble, so nothing forms: no reaction.';
    return player(f, o, p.reacts ? 4200 : 2600, reset, step, 'The two solutions mix.', after);
  }

  function show(host, p, o) {
    return p.kind === 'dr' ? mix(host, p, o) : p.sub === 'halogen' ? halogen(host, p, o) : plate(host, p, o);
  }

  return { show: show, plate: plate, halogen: halogen, mix: mix };
})();

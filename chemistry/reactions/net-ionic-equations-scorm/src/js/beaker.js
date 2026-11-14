/* beaker.js: two solutions poured together, drawn to scale.
 *
 *   Beaker.show(host, problem, { auto, onDone, highlight }) -> { play, destroy }
 *   Beaker.picture(spec) -> a still <svg> for a question or a card:
 *       { free: [{ key, q, n }] }        a solution: the ions apart
 *       { units: { f, n } }               the ions still joined (a wrong picture)
 *       { solid: { f, n } }               the compound as a solid on the bottom
 *       { before: [f1, f2] }              the two solutions before mixing
 *       { after: [f1, f2] }               the beaker once everything has happened
 *
 * Every ion is drawn at its real size (data.js, one scale for everything).
 * The ions drift and bounce the whole time. Solution B is poured into
 * solution A; the ions that react find each other, come together in the
 * solid's ratio and sink, stacking on the bottom; H+ joins OH- as a water
 * molecule, HOH, which keeps moving. The spectators keep moving the whole
 * time. With no reaction everything just keeps moving. The solvent's own
 * water molecules are not drawn.
 *
 * Tap (or Tab to and press Enter on) any ion to name it. Highlight
 * spectators rings them. Pour again starts over; the slider sets the speed.
 * Reduced motion: nothing moves; Before and After show the two stills.
 */
var Beaker = (function () {
  'use strict';
  var h = UI.h;
  var NS = 'http://www.w3.org/2000/svg';
  var W = 600, H = 300, L = 14, R = W - 14, TOP = 46, BOT = H - 10, START_TOP = 150;
  var T_POUR = 0.3, POUR_LEN = 1.8, T_REACT = 3.6, GAP = 0.32, MEET = 1.7, SINK = 1.9;

  function s(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] != null) { if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); } });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function colour(el) { return Particles.EL[el] ? Particles.EL[el][2] : '#ccc'; }

  /* ------------------------------------------------------------- one particle */
  function label(key, q) { return key === 'HOH' ? 'HOH' : Net.ionText(key, q); }
  function particle(key, q) {
    var g = s('g', { class: 'bk-p', tabindex: '0', role: 'button' });
    var spin = s('g');
    var ring = s('circle', { class: 'bk-ring', cx: 0, cy: 0 });
    var txt = s('text', { class: 'bk-t', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    g.appendChild(ring); g.appendChild(spin); g.appendChild(txt);
    var me = { g: g, x: 0, y: 0, a: 0, va: 0, vx: 0, vy: 0, shown: true };
    me.as = function (k, qq) {
      me.key = k; me.q = qq;
      var sh = Data.shape(k);
      me.r = sh.r * Data.SCALE;
      spin.innerHTML = '';
      sh.atoms.forEach(function (t) {
        spin.appendChild(s('circle', { cx: (t.x * Data.SCALE).toFixed(2), cy: (t.y * Data.SCALE).toFixed(2), r: (t.r * Data.SCALE).toFixed(2),
          fill: colour(t.el), class: 'bk-atom' + (t.el === 'H' ? ' bk-h' : '') }));
      });
      ring.setAttribute('r', (me.r + 3).toFixed(1));
      var mono = sh.atoms.length === 1 && k !== 'H';
      txt.textContent = label(k, qq);
      txt.setAttribute('class', 'bk-t' + (mono ? ' in' : ' over'));
      txt.setAttribute('font-size', mono ? Math.max(7, Math.min(13, me.r * 0.62)).toFixed(1) : '11');
      txt.setAttribute('y', k === 'H' ? -me.r - 7 : 0);
      if (mono && Particles.EL[k]) txt.setAttribute('fill', Particles.EL[k][3]);
      else txt.removeAttribute('fill');
      g.setAttribute('data-key', k);
      g.setAttribute('aria-label', k === 'HOH' ? 'HOH, a water molecule' : label(k, qq) + ', ' + Net.ionName(k, qq));
      return me;
    };
    me.at = function (x, y) {
      me.x = x; me.y = y;
      g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
      spin.setAttribute('transform', 'rotate(' + me.a.toFixed(1) + ')');
      return me;
    };
    me.show = function (on) { me.shown = on; g.style.display = on ? '' : 'none'; return me; };
    me.as(key, q);
    return me;
  }

  /* places for n particles of these radii, spread out in a box, by a seeded throw */
  function scatter(list, box, rand) {
    list.forEach(function (p, i) {
      var best = null, bestD = -Infinity;
      for (var k = 0; k < 40; k++) {
        var x = box.x0 + p.r + rand() * Math.max(1, box.x1 - box.x0 - 2 * p.r);
        var y = box.y0 + p.r + rand() * Math.max(1, box.y1 - box.y0 - 2 * p.r);
        var d = 1e9;
        for (var j = 0; j < i; j++) d = Math.min(d, Math.hypot(list[j].x - x, list[j].y - y) - list[j].r - p.r);
        if (d > bestD) { bestD = d; best = [x, y]; }
        if (d > 6) break;
      }
      p.at(best[0], best[1]);
    });
  }

  /* places on the bottom for the solid, unit by unit, ions alternating, rows from the bottom up */
  function lattice(solidParts, x0, x1, bot, fill) {
    bot = bot || BOT;
    var rows = [[]], wrow = 0, maxW = (x1 - x0) * (fill || 0.72);
    solidParts.forEach(function (unit) {
      var w = unit.reduce(function (t, p) { return t + 2 * p.r * 0.9; }, 0);
      if (wrow + w > maxW && rows[rows.length - 1].length) { rows.push([]); wrow = 0; }
      rows[rows.length - 1] = rows[rows.length - 1].concat(unit);
      wrow += w;
    });
    var y = bot;
    rows.forEach(function (row, k) {
      var hgt = Math.max.apply(null, row.map(function (p) { return 2 * p.r; })) * (k ? 0.82 : 1);
      var w = row.reduce(function (t, p) { return t + 2 * p.r * 0.9; }, 0), x = (x0 + x1) / 2 - w / 2 + (k % 2 ? 6 : 0);
      var cy = y - hgt / 2;
      row.forEach(function (p) { p.sx = x + p.r * 0.9; p.sy = Math.min(cy, bot - p.r); x += 2 * p.r * 0.9; });
      y -= hgt * 0.95;
    });
  }

  /* ------------------------------------------------------------- the world */
  /* build the particles of a mix; nothing drawn on screen yet */
  function world(p, svg, seed) {
    var bk = Net.beaker(p), rand = UI.rng(seed), all = [], A = [], B = [];
    function make(list, into, from) {
      list.forEach(function (t) { for (var i = 0; i < t.n; i++) { var x = particle(t.key, t.q); x.from = from; x.role = 'spec'; into.push(x); all.push(x); } });
    }
    make(bk.a, A, 'a'); make(bk.b, B, 'b');
    /* who reacts with whom */
    var groups = [];
    function take(key, n) {
      var out = [];
      all.forEach(function (x) { if (out.length < n && x.key === key && x.role === 'spec') { x.role = 'react'; out.push(x); } });
      return out;
    }
    var nW = bk.water;
    for (var w = 0; w < nW; w++) groups.push({ kind: 'water', h: take('H', 1)[0], oh: take('OH', 1)[0] });
    var units = [];
    bk.solids.forEach(function (sd) {
      for (var u = 0; u < sd.units; u++) {
        var cats = take(sd.cat, sd.nc), ans = take(sd.an, sd.na), mem = [];
        /* alternate positive and negative so a unit reads like the solid */
        var big = ans.length >= cats.length ? ans : cats, small = big === ans ? cats : ans;
        big.forEach(function (x, k) { mem.push(x); if (small[k]) mem.push(small[k]); });
        var gr = { kind: 'solid', f: sd.f, mem: mem };
        groups.push(gr); units.push(mem);
      }
    });
    /* interleave water and solid so both happen together in the challenge */
    groups = UI.shuffle(groups, rand);
    lattice(units, L, R);
    all.forEach(function (x) {
      var ang = rand() * Math.PI * 2, sp = 18 + rand() * 18;
      x.vx = Math.cos(ang) * sp; x.vy = Math.sin(ang) * sp; x.a = rand() * 360; x.va = (rand() - 0.5) * 40;
      svg.appendChild(x.g);
    });
    return { p: p, all: all, A: A, B: B, groups: groups, rand: rand, bk: bk };
  }

  /* place everything as it is before mixing */
  function setup(wd) {
    scatter(wd.A, { x0: L, y0: START_TOP, x1: R, y1: BOT }, wd.rand);
    wd.B.forEach(function (x, i) { x.at(40 + (i % 5) * 18, -40 - x.r); x.show(false); x.pour = T_POUR + POUR_LEN * i / Math.max(1, wd.B.length); x.state = 'pour'; });
    wd.A.forEach(function (x) { x.state = 'free'; x.show(true); });
    wd.all.forEach(function (x) { x.made = false; x.g.classList.remove('bk-made'); if (x.key === 'HOH') x.as('OH', -1); x.a = x.a || 0; });
    wd.groups.forEach(function (g, k) { g.t0 = T_REACT + k * GAP; g.on = false; });
  }

  /* move the world from time t to t + dt */
  function stepWorld(wd, t, dt) {
    var top = START_TOP + (TOP - START_TOP) * ease((t - T_POUR) / (POUR_LEN + 0.4));
    var rand = wd.rand;
    /* pouring in from the top left */
    wd.B.forEach(function (x) {
      if (x.state !== 'pour') return;
      if (t < x.pour) return;
      if (!x.shown) { x.show(true); x.at(48 + rand() * 50, top - x.r - 4); x.vx = 40 + rand() * 50; x.vy = 60; }
      x.vy += 260 * dt;
      x.at(x.x + x.vx * dt, x.y + x.vy * dt);
      if (x.y > top + x.r + 10) { x.state = 'free'; x.vy *= 0.25; }
    });
    /* reactions */
    wd.groups.forEach(function (g) {
      if (t < g.t0) return;
      if (g.kind === 'water') {
        if (!g.on) { g.on = true; g.h.state = 'seek'; }
        if (g.h.state === 'seek') {
          var dx = g.oh.x - g.h.x, dy = g.oh.y - g.h.y, d = Math.hypot(dx, dy);
          var sp = 120 * clamp((t - g.t0) / 0.6, 0.2, 1);
          if (d < g.oh.r * 0.8 || t > g.t0 + MEET * 1.6) {
            g.h.show(false); g.h.state = 'gone';
            g.oh.as('HOH', 0); g.oh.made = true; g.oh.g.classList.add('bk-made');
          } else g.h.at(g.h.x + dx / d * sp * dt, g.h.y + dy / d * sp * dt);
        }
        return;
      }
      /* a unit of the solid: gather in its own shape, then sink to its place */
      if (!g.on) {
        g.on = true;
        var cx = 0, cy = 0, sx = 0, sy = 0;
        g.mem.forEach(function (x) { cx += x.x; cy += x.y; sx += x.sx; sy += x.sy; x.state = 'join'; x.fx = x.x; x.fy = x.y; });
        var n = g.mem.length;
        g.cx = clamp(cx / n, L + 40, R - 40); g.cy = clamp(cy / n, top + 40, BOT - 80);
        g.mem.forEach(function (x) { x.ox = x.sx - sx / n; x.oy = x.sy - sy / n; });
      }
      var u = (t - g.t0) / MEET, v = (t - g.t0 - MEET) / SINK;
      g.mem.forEach(function (x) {
        if (x.state === 'sunk') return;
        var mx = g.cx + x.ox, my = g.cy + x.oy;
        if (u < 1) { var e = ease(u); x.at(x.fx + (mx - x.fx) * e, x.fy + (my - x.fy) * e); }
        else if (v < 1) { var e2 = ease(v); x.a *= 0.9; x.at(mx + (x.sx - mx) * e2, my + (x.sy - my) * e2); }
        else { x.state = 'sunk'; x.a = 0; x.at(x.sx, x.sy); }
      });
    });
    /* the free ones drift, get nudged and bounce */
    var free = wd.all.filter(function (x) { return x.state === 'free' && x.shown; });
    free.forEach(function (x) {
      x.vx += (rand() - 0.5) * 90 * dt; x.vy += (rand() - 0.5) * 90 * dt;
      var sp = Math.hypot(x.vx, x.vy), want = 26;
      if (sp > 0) { var k = 1 + (want / sp - 1) * Math.min(1, dt * 1.5); x.vx *= k; x.vy *= k; }
      x.a += x.va * dt;
      var nx = x.x + x.vx * dt, ny = x.y + x.vy * dt;
      if (nx < L + x.r) { nx = L + x.r; x.vx = Math.abs(x.vx); }
      if (nx > R - x.r) { nx = R - x.r; x.vx = -Math.abs(x.vx); }
      if (ny < top + x.r) { ny = top + x.r; x.vy = Math.abs(x.vy); }
      if (ny > BOT - x.r) { ny = BOT - x.r; x.vy = -Math.abs(x.vy); }
      x.at(nx, ny);
    });
    /* soft collisions: free particles are pushed out of each other and off the solid */
    var solid = wd.all.filter(function (x) { return x.shown && (x.state === 'sunk' || x.state === 'join'); });
    free.forEach(function (x, i) {
      free.slice(i + 1).concat(solid).forEach(function (y) {
        var dx = y.x - x.x, dy = y.y - x.y, d = Math.hypot(dx, dy) || 0.01, o = x.r + y.r - d;
        if (o <= 0) return;
        var fixed = y.state !== 'free', ux = dx / d, uy = dy / d;
        var mx = fixed ? o : o / 2;
        x.at(x.x - ux * mx * 0.5, x.y - uy * mx * 0.5);
        if (!fixed) y.at(y.x + ux * mx * 0.5, y.y + uy * mx * 0.5);
        var rel = (x.vx - (fixed ? 0 : y.vx)) * ux + (x.vy - (fixed ? 0 : y.vy)) * uy;
        if (rel > 0) { x.vx -= rel * ux; x.vy -= rel * uy; if (!fixed) { y.vx += rel * ux; y.vy += rel * uy; } }
      });
    });
    return top;
  }
  function endTime(wd) { return wd.groups.length ? T_REACT + (wd.groups.length - 1) * GAP + MEET + SINK + 0.4 : T_POUR + POUR_LEN + 1.6; }

  /* --------------------------------------------------------------- drawing */
  /* an empty beaker; g: { w, h, l, r, top, bot } (the player's size if left out) */
  function frameSvg(cls, g) {
    g = g || { w: W, h: H, l: L, r: R, top: TOP, bot: BOT };
    var svg = s('svg', { viewBox: '0 0 ' + g.w + ' ' + g.h, class: 'bk-svg' + (cls ? ' ' + cls : ''), role: 'img', preserveAspectRatio: 'xMidYMid meet' });
    var water = s('rect', { x: g.l, y: g.top, width: g.r - g.l, height: g.bot - g.top, class: 'bk-water' });
    svg.appendChild(water);
    svg.appendChild(s('path', { d: 'M' + (g.l - 6) + ' ' + (g.top - 24) + ' L' + (g.l - 6) + ' ' + (g.bot + 6) + ' L' + (g.r + 6) + ' ' + (g.bot + 6) + ' L' + (g.r + 6) + ' ' + (g.top - 24), class: 'bk-glass' }));
    /* scale bar */
    var bar = 200 * Data.SCALE, by = Math.max(12, g.top - 14);
    svg.appendChild(s('g', { class: 'bk-scale' }, [
      s('line', { x1: g.r - 10 - bar, y1: by, x2: g.r - 10, y2: by }),
      s('line', { x1: g.r - 10 - bar, y1: by - 4, x2: g.r - 10 - bar, y2: by + 4 }), s('line', { x1: g.r - 10, y1: by - 4, x2: g.r - 10, y2: by + 4 }),
      s('text', { x: g.r - 14 - bar, y: by + 4, 'text-anchor': 'end', text: '200 pm' })]));
    return { svg: svg, water: water, g: g };
  }
  function note(p) {
    var bits = ['Every ion is drawn to the same scale.', 'The water molecules of the solution are not drawn.'];
    var hasH = p && Net.beaker(p).a.concat(Net.beaker(p).b).some(function (t) { return t.key === 'H'; });
    if (hasH) bits.push('H⁺ has no electrons and is far smaller than any atom: it is drawn as a dot the size of an H atom.');
    return bits.join(' ');
  }

  /* ------------------------------------------------------------- the player */
  function show(host, p, o) {
    o = o || {};
    var f = frameSvg();
    var seed = UI.hash(p.id);
    var wd = world(p, f.svg, seed);
    var still = reduced();
    var cap = h('p', { class: 'bk-cap', role: 'status', 'aria-live': 'polite' });
    var named = h('p', { class: 'bk-named', 'aria-live': 'polite', text: 'Tap any ion to name it. ' + note(p) });
    var speed = 1, t = 0, last = 0, raf = 0, finished = false, alive = true, playing = false;
    var hiBtn = h('button', { type: 'button', class: 'ghostbtn bk-hi', 'aria-pressed': 'false', hidden: !o.highlight || !!o.locked, text: 'Highlight spectators', onclick: function () {
      var on = hiBtn.getAttribute('aria-pressed') !== 'true';
      hiBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); hiBtn.classList.toggle('selected', on);
      f.svg.classList.toggle('hi', on);
    } });
    var playBtn = h('button', { type: 'button', class: 'primary bk-play', disabled: !!o.locked, text: o.auto ? 'Pour again' : 'Pour', onclick: function () { play(); } });
    var slider = h('input', { type: 'range', min: '0.25', max: '2', step: '0.25', value: '1', class: 'bk-speed', 'aria-label': 'Speed' });
    slider.addEventListener('input', function () { speed = +slider.value; });
    var beforeBtn = h('button', { type: 'button', class: 'ghostbtn', text: 'Before mixing', onclick: function () { stillAt(false); } });
    var afterBtn = h('button', { type: 'button', class: 'primary bk-play', disabled: !!o.locked, text: 'After mixing', onclick: function () { stillAt(true); } });
    var row = h('div', { class: 'btnrow bk-row' }, still ? [beforeBtn, afterBtn, hiBtn] :
      [playBtn, h('label', { class: 'bk-speed-l' }, ['Speed ', slider]), hiBtn]);
    var box = h('figure', { class: 'bk' }, [row, f.svg, h('figcaption', null, [cap, named])]);
    host.appendChild(box);

    wd.all.forEach(function (x) {
      function name() {
        var what = x.key === 'HOH' ? 'HOH: a water molecule made when H⁺ joined OH⁻.'
          : label(x.key, x.q) + ': ' + Net.ionName(x.key, x.q) + '. ' + (x.role === 'spec' ? 'A spectator: free in the solution before and after mixing.'
          : x.state === 'sunk' || x.state === 'join' ? 'Part of the solid now.' : 'This one reacts.');
        named.textContent = what;
      }
      x.g.addEventListener('click', name);
      x.g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); name(); } });
      if (x.role === 'spec') x.g.classList.add('bk-spec');
    });

    function caption() {
      var bk = wd.bk;
      if (t < T_POUR + POUR_LEN) return 'Pouring ' + Net.name(p.l[1]) + ' into ' + Net.name(p.l[0]) + '.';
      if (!finished && t < T_REACT) return 'The ions mix. Watch which ones find each other.';
      if (!finished) return p.reacts ? (p.kind === 'water' ? 'H⁺ meets OH⁻: they become water, HOH.' : p.kind === 'both' ? 'Ba²⁺ and SO₄²⁻ form a solid; H⁺ and OH⁻ become water.' :
        'The ions of ' + Net.pretty(p.solids[0]) + ' come together and sink: a solid.') : 'Nothing pairs up.';
      return Net.why(p);
    }
    function frame(now) {
      if (!alive) return;
      if (!box.isConnected) { alive = false; return; }
      var dt = Math.max(0, Math.min(0.05, (now - last) / 1000)) * speed;
      last = now;
      if (!document.hidden) {
        t += dt;
        var top = stepWorld(wd, t, dt);
        f.water.setAttribute('y', top.toFixed(1)); f.water.setAttribute('height', (BOT - top).toFixed(1));
        if (!finished && t >= endTime(wd)) {
          finished = true;
          box.setAttribute('data-done', '1');
          hiBtn.hidden = false;
          if (o.onDone) o.onDone();
        }
        cap.textContent = caption();
      }
      raf = requestAnimationFrame(frame);
    }
    function play() {
      playing = true;
      cancelAnimationFrame(raf);
      t = 0; finished = false;
      box.removeAttribute('data-done');
      setup(wd);
      playBtn.textContent = 'Pour again';
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    /* reduced motion: run it out of sight, show the end (or the start) */
    function stillAt(after) {
      setup(wd);
      t = 0;
      var top = START_TOP;
      if (after) { var end = endTime(wd) + 2; while (t < end) { t += 1 / 30; top = stepWorld(wd, t, 1 / 30); } }
      f.water.setAttribute('y', top.toFixed(1)); f.water.setAttribute('height', (BOT - top).toFixed(1));
      if (!after) wd.B.forEach(function (x) { x.show(false); });
      cap.textContent = after ? Net.why(p) : 'Before mixing: ' + Net.name(p.l[0]) + ' in the beaker; ' + Net.name(p.l[1]) + ' is about to be poured in.';
      beforeBtn.classList.toggle('selected', !after); afterBtn.classList.toggle('selected', after);
      if (after) box.setAttribute('data-done', '1'); else box.removeAttribute('data-done');
      if (after && !finished) { finished = true; hiBtn.hidden = false; if (o.onDone) o.onDone(); }
    }

    if (still) { stillAt(!!o.auto); if (!o.auto) cap.textContent = 'Press After mixing to see what happens.'; }
    else {
      setup(wd);
      f.water.setAttribute('y', START_TOP); f.water.setAttribute('height', BOT - START_TOP);
      if (o.auto) play();
      else {
        cap.textContent = o.locked ? 'Make your prediction first; then press Pour.' : 'Press Pour to mix the two solutions.';
        /* the first solution already moves before anything is poured */
        var idleLast = performance.now();
        var idle = function (now) {
          if (!alive || !box.isConnected || playing) return;
          var dt = Math.max(0, Math.min(0.05, (now - idleLast) / 1000)); idleLast = now;
          wd.A.forEach(function (x) { x.a += x.va * dt; var nx = clamp(x.x + x.vx * dt, L + x.r, R - x.r), ny = clamp(x.y + x.vy * dt, START_TOP + x.r, BOT - x.r);
            if (nx === L + x.r || nx === R - x.r) x.vx *= -1; if (ny === START_TOP + x.r || ny === BOT - x.r) x.vy *= -1; x.at(nx, ny); });
          requestAnimationFrame(idle);
        };
        requestAnimationFrame(idle);
      }
    }
    function unlock() { playBtn.disabled = false; afterBtn.disabled = false; hiBtn.hidden = !o.highlight; cap.textContent = still ? 'Press After mixing to see what happens.' : 'Press Pour to mix the two solutions.'; }
    return { play: play, unlock: unlock, el: box, world: wd, destroy: function () { alive = false; cancelAnimationFrame(raf); } };
  }

  /* --------------------------------------------------------------- stills */
  var SMALL = { w: 340, h: 176, l: 12, r: 328, top: 36, bot: 168 };
  function picture(spec) {
    var small = spec.free || spec.units || spec.solid;
    var f = frameSvg('still' + (small ? ' small' : ''), small ? SMALL : null), G = f.g;
    var rand = UI.rng(UI.hash(JSON.stringify(spec)));
    var list = [];
    function add(key, q) { var x = particle(key, q); x.g.removeAttribute('tabindex'); x.g.removeAttribute('role'); f.svg.appendChild(x.g); list.push(x); return x; }
    if (spec.free) {
      spec.free.forEach(function (t) { for (var i = 0; i < t.n; i++) add(t.key, t.q); });
      list.forEach(function (x) { x.a = rand() * 360; });
      scatter(list, { x0: G.l, y0: G.top, x1: G.r, y1: G.bot }, rand);
    } else if (spec.units || spec.solid) {
      var sp = spec.units || spec.solid, units = [];
      for (var u = 0; u < sp.n; u++) {
        var mem = [];
        Net.solution(sp.f, 1).forEach(function (t) { for (var i = 0; i < t.n; i++) mem.push(add(t.key, t.q)); });
        units.push(mem);
      }
      if (spec.solid) { lattice(units, G.l, G.r, G.bot, 0.62); list.forEach(function (x) { x.at(x.sx, x.sy); }); }
      else {
        /* each unit joined together, the units apart */
        lattice(units, G.l, G.r, G.bot);
        /* one unit in each of n columns, alternately high and low */
        var centres = units.map(function (mem, k) {
          return { x: G.l + (k + 0.5) * (G.r - G.l) / units.length, y: G.top + (G.bot - G.top) * (k % 2 ? 0.66 : 0.36) };
        });
        units.forEach(function (mem, k) {
          var cx = 0, cy = 0;
          mem.forEach(function (x) { cx += x.sx; cy += x.sy; });
          cx /= mem.length; cy /= mem.length;
          mem.forEach(function (x) { x.at(centres[k].x + x.sx - cx, centres[k].y + x.sy - cy); });
        });
      }
    } else if (spec.before) {
      /* two beakers: each solution on its own, the same amounts as the mix */
      var p = Net.make(spec.before[0], spec.before[1]), bk = Net.beaker(p), top = 44, bot = 230;
      f.svg.setAttribute('viewBox', '0 0 ' + W + ' 240');
      f.svg.setAttribute('class', 'bk-svg still before');
      f.svg.innerHTML = '';
      [bk.a, bk.b].forEach(function (ions, k) {
        var x0 = k ? W / 2 + 12 : 8, x1 = k ? W - 8 : W / 2 - 12;
        f.svg.appendChild(s('rect', { x: x0, y: top, width: x1 - x0, height: bot - top, class: 'bk-water' }));
        f.svg.appendChild(s('path', { d: 'M' + (x0 - 4) + ' ' + (top - 6) + ' L' + (x0 - 4) + ' ' + (bot + 4) + ' L' + (x1 + 4) + ' ' + (bot + 4) + ' L' + (x1 + 4) + ' ' + (top - 6), class: 'bk-glass' }));
        f.svg.appendChild(s('text', { x: (x0 + x1) / 2, y: 28, 'text-anchor': 'middle', class: 'bk-lbl big', text: Net.pretty(p.l[k]) + '(aq)' }));
        var mine = [];
        ions.forEach(function (t) { for (var i = 0; i < t.n; i++) mine.push(add(t.key, t.q)); });
        scatter(mine, { x0: x0, y0: top, x1: x1, y1: bot }, rand);
      });
    } else if (spec.after) {
      var pa = Net.make(spec.after[0], spec.after[1]);
      var wd = world(pa, f.svg, UI.hash(pa.id) ^ 7);
      setup(wd);
      var tt = 0, end = endTime(wd) + 2, top = TOP;
      while (tt < end) { tt += 1 / 30; top = stepWorld(wd, tt, 1 / 30); }
      f.water.setAttribute('y', top); f.water.setAttribute('height', BOT - top);
      wd.all.forEach(function (x) { x.g.removeAttribute('tabindex'); x.g.removeAttribute('role'); });
    }
    return f.svg;
  }

  return { show: show, picture: picture, particle: particle, world: world, setup: setup, stepWorld: stepWorld, endTime: endTime, W: W, H: H };
})();

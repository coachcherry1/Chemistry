/* bench.js: the liquid bench (part 6). Three quick tests, run on every
 * liquid at once, all at the same temperature:
 *
 *   Surface tension  a drop placed on a plastic sheet. The higher the
 *                    surface tension, the more the surface pulls the drop
 *                    into a tall bead; a low one lets it spread flat.
 *   Viscosity        a pipet of the liquid draining. The higher the
 *                    viscosity, the longer it takes to empty.
 *   Evaporation      a small drop left out in the air. The faster it
 *                    evaporates, the sooner it disappears.
 *
 * The pictures are paced by the real measurements in LIQUID (data.js), so
 * the order things happen in is the real order, ties included. No number is
 * ever shown. The scales are squeezed (a logarithm for viscosity and
 * evaporation) so every liquid finishes within a few seconds, except the
 * slowest evaporators, which visibly hardly shrink.
 */

function LiquidBench(host, opts) {
  'use strict';
  var h = UI.h;
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }

  var ids = opts.ids;
  var RUN = 14;                      /* seconds of animation */
  var canvas = h('canvas', { class: 'bench-canvas', role: 'img' });
  var result = h('p', { class: 'bench-result', 'aria-live': 'polite' });
  var node = h('div', { class: 'bench' }, [canvas, result]);
  host.appendChild(node);
  var ctx = canvas.getContext('2d');

  /* the real data, squeezed onto the screen */
  function angle(id) { var st = LIQUID[id].st; return Math.max(10, Math.min(110, 15 + 80 * (st - 16) / (43.3 - 16))) * Math.PI / 180; }
  function drainTime(id) { return 1.2 + 3 * Math.log(LIQUID[id].visc / 0.2) / Math.LN10; }
  function evapTime(id) { return 2 + 4 * Math.log(60 / LIQUID[id].vp) / Math.LN10; }

  function cssVar(name, fallback) {
    try { var v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim(); return v || fallback; }
    catch (e) { return fallback; }
  }

  var t = 0, running = false, ran = false, anim = null, last = null;

  /* a drop of fixed area resting on the sheet with contact angle th:
     a circular cap. Returns its base half-width and height. */
  function cap(area, th) {
    var R = Math.sqrt(area / (th - Math.sin(th) * Math.cos(th)));
    return { R: R, a: R * Math.sin(th), h: R * (1 - Math.cos(th)) };
  }
  function drawCap(cx, base, area, th, fill, line) {
    var c = cap(area, th);
    var cy = base + c.R * Math.cos(th);   /* the circle's centre */
    ctx.beginPath();
    /* from where the drop meets the sheet on the left, over the top, to the right */
    ctx.arc(cx, cy, c.R, Math.atan2(-Math.cos(th), -Math.sin(th)), Math.atan2(-Math.cos(th), Math.sin(th)), false);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = line; ctx.lineWidth = 1.5; ctx.stroke();
  }

  function draw() {
    var r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    var W = Math.max(10, Math.round(r.width * dpr)), H = Math.max(10, Math.round(r.height * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var w = W / dpr, hh = H / dpr;
    ctx.clearRect(0, 0, w, hh);
    var ink = cssVar('ink', '#12212e'), muted = cssVar('muted', '#5d7283'), line = cssVar('line', '#dde5ec');
    var liquid = cssVar('liquid', 'rgba(70,150,220,0.35)'), edge = cssVar('accent', '#0f5d8f');
    var labelW = Math.min(150, w * 0.2), colW = (w - labelW) / ids.length;
    var head = 22, rowH = (hh - head) / 3;
    ctx.textAlign = 'center';
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillStyle = ink;
    ids.forEach(function (id, k) { ctx.fillText(Chem.sub(id).name, labelW + colW * (k + 0.5), 15); });
    ['Surface tension', 'Viscosity', 'Evaporation'].forEach(function (name, row) {
      var y0 = head + rowH * row;
      ctx.textAlign = 'left';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillStyle = ink;
      ctx.fillText(name, 6, y0 + rowH / 2 - 4);
      ctx.font = '500 11px system-ui, sans-serif';
      ctx.fillStyle = muted;
      ctx.fillText(['a drop on plastic', 'a pipet draining', 'a drop left out'][row], 6, y0 + rowH / 2 + 11);
      ctx.strokeStyle = line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y0 + rowH); ctx.lineTo(w, y0 + rowH); ctx.stroke();
    });
    ctx.textAlign = 'center';
    ids.forEach(function (id, k) {
      var cx = labelW + colW * (k + 0.5);
      /* surface tension: the drop lands round and settles to its bead */
      var base = head + rowH - 10, area = Math.min(colW * colW * 0.05, rowH * rowH * 0.32);
      ctx.strokeStyle = muted; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - colW * 0.42, base); ctx.lineTo(cx + colW * 0.42, base); ctx.stroke();
      var settle = ran || running ? Math.min(1, t / 1.5) : 0;
      var th = (1 - settle) * (150 * Math.PI / 180) + settle * angle(id);
      drawCap(cx, base, area, th, liquid, edge);
      /* viscosity: a pipet emptying */
      var y1 = head + rowH, tubeH = rowH * 0.72, tubeW = Math.min(16, colW * 0.12), top = y1 + rowH * 0.1;
      var frac = ran || running ? Math.max(0, 1 - t / drainTime(id)) : 1;
      ctx.fillStyle = liquid;
      ctx.fillRect(cx - tubeW / 2, top + tubeH * (1 - frac), tubeW, tubeH * frac);
      ctx.strokeStyle = edge; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - tubeW / 2, top); ctx.lineTo(cx - tubeW / 2, top + tubeH); ctx.lineTo(cx - 2, top + tubeH + 7);
      ctx.lineTo(cx + 2, top + tubeH + 7); ctx.lineTo(cx + tubeW / 2, top + tubeH); ctx.lineTo(cx + tubeW / 2, top);
      ctx.stroke();
      if (frac > 0 && (running || ran) && t < drainTime(id)) {
        var drip = (t * 2.2) % 1;
        ctx.fillStyle = edge;
        ctx.beginPath(); ctx.arc(cx, top + tubeH + 9 + drip * (rowH * 0.12), 2, 0, Math.PI * 2); ctx.fill();
      }
      if ((running || ran) && frac === 0) { ctx.fillStyle = muted; ctx.font = '600 11px system-ui, sans-serif'; ctx.fillText('empty', cx + tubeW + 18, top + tubeH); }
      /* evaporation: a drop shrinking */
      var y2 = head + rowH * 2, b2 = y2 + rowH - 12;
      ctx.strokeStyle = muted; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - colW * 0.3, b2); ctx.lineTo(cx + colW * 0.3, b2); ctx.stroke();
      var left = ran || running ? Math.max(0, 1 - t / evapTime(id)) : 1;
      if (left > 0.01) drawCap(cx, b2, area * 0.5 * left, 70 * Math.PI / 180, liquid, edge);
      else { ctx.fillStyle = muted; ctx.font = '600 11px system-ui, sans-serif'; ctx.fillText('gone', cx, b2 - 6); }
    });
  }

  /* the result in words, from the same data */
  function order(f) { return ids.slice().sort(function (a, b) { return f(a) - f(b); }); }
  function names(list) { return list.map(function (id) { return Chem.sub(id).name; }).join(', then '); }
  function describe() {
    var beads = order(function (id) { return -angle(id); });
    result.textContent = 'Tallest bead first: ' + names(beads) + '. Emptied first: ' + names(order(drainTime)) +
      '. Gone first: ' + names(order(evapTime)) + '.';
    canvas.setAttribute('aria-label', 'Three tests on ' + names(ids).replace(/, then /g, ', ') + '. ' + result.textContent);
  }

  function frame(ts) {
    if (last == null) last = ts;
    t += Math.min(0.05, (ts - last) / 1000);
    last = ts;
    draw();
    if (t >= RUN) { running = false; ran = true; anim = null; describe(); if (opts.onDone) opts.onDone(); return; }
    anim = requestAnimationFrame(frame);
  }

  function run() {
    if (anim) cancelAnimationFrame(anim);
    t = 0; last = null; running = true;
    result.textContent = '';
    if (reduceMotion) {
      /* a still picture partway through: beads settled, pipets and drops on their way */
      t = 4; running = false; ran = true; draw(); describe();
      if (opts.onDone) opts.onDone();
      return;
    }
    anim = requestAnimationFrame(frame);
  }

  var ro = window.ResizeObserver ? new ResizeObserver(draw) : null;
  if (ro) ro.observe(canvas);
  canvas.setAttribute('aria-label', 'The liquid bench: ' + names(ids).replace(/, then /g, ', ') + ', ready to test.');
  if (opts.ran) { t = reduceMotion ? 4 : RUN; ran = true; describe(); }
  draw();

  return {
    node: node, run: run, running: function () { return running; },
    destroy: function () { if (anim) cancelAnimationFrame(anim); anim = null; if (ro) ro.disconnect(); }
  };
}

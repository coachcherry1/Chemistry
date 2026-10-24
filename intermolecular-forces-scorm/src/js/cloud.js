/* cloud.js: where London dispersion forces come from.
 *
 * Two atoms of one noble gas, side by side. Each is a nucleus inside an
 * electron cloud. The electrons are always moving, so for an instant the
 * left atom's cloud sits a little to one side: that side is δ−, the other
 * δ+ (a temporary dipole). Its δ− side pushes the neighbour's electrons
 * away, so the neighbour's cloud shifts the same way, and for that instant
 * the δ− of one faces the δ+ of the other: they attract.
 *
 * Picking a different noble gas changes two things, both real: the size of
 * the cloud (van der Waals radius, data.js) and how far it shifts
 * (polarizability, data.js). More electrons, held farther from the nucleus:
 * a bigger cloud that is easier to push around, so a stronger attraction.
 * The "attraction right now" bar is the product of the two shifts, a picture
 * of the idea rather than a measured force.
 */

function CloudSim(host, opts) {
  'use strict';
  var h = UI.h;
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }

  var ids = opts.ids, cur = opts.start || ids[0], seen = {};
  var canvas = h('canvas', { class: 'cloud-canvas', role: 'img' });
  var chips = h('div', { class: 'chips' });
  var facts = h('div', { class: 'cloud-facts' });
  var node = h('div', { class: 'cloud' }, [chips, canvas, facts]);
  host.appendChild(node);
  var ctx = canvas.getContext('2d');

  var maxR = Math.max.apply(null, ids.map(function (id) { return ATOM_SIZE[id].vdw; }));
  var maxA = Math.max.apply(null, ids.map(function (id) { return ATOM_SIZE[id].alpha; }));
  var d1 = 0, v1 = 0, d2 = 0, t = 0, peak = 0;

  function cssVar(name, fallback) {
    try { var v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim(); return v || fallback; }
    catch (e) { return fallback; }
  }

  function paintChips() {
    chips.innerHTML = '';
    ids.forEach(function (id) {
      chips.appendChild(h('button', { type: 'button', class: 'chip' + (id === cur ? ' on' : '') + (seen[id] ? ' done' : ''),
        'aria-pressed': id === cur ? 'true' : 'false', text: id, onclick: function () { show(id); } }));
    });
  }

  function paintFacts() {
    var x = Chem.sub(cur), a = ATOM_SIZE[cur];
    facts.innerHTML = '';
    function bar(label, frac, text) {
      return h('div', { class: 'bar-row' }, [
        h('span', { class: 'bar-label', text: label }),
        h('span', { class: 'bar' }, [h('span', { class: 'bar-fill', style: 'width:' + Math.max(2, Math.round(frac * 100)) + '%' })]),
        h('span', { class: 'bar-num', text: text })
      ]);
    }
    facts.appendChild(bar('Electrons', x.electrons / 54, String(x.electrons)));
    facts.appendChild(bar('Size of the cloud', a.vdw / maxR, a.vdw + ' pm'));
    facts.appendChild(bar('Polarizability', a.alpha / maxA, a.alpha.toFixed(2) + ' Å³'));
    canvas.setAttribute('aria-label', 'Two ' + x.name + ' atoms side by side. ' + x.electrons + ' electrons each. ' +
      'The electron cloud of the left atom shifts to one side for an instant, and the right atom’s cloud shifts the ' +
      'same way, so a δ− side faces a δ+ side and the atoms attract. ' +
      (a.alpha / maxA > 0.5 ? 'The clouds are big and shift a lot: very polarizable.' : a.alpha / maxA > 0.2 ?
        'The clouds shift a fair amount.' : 'The clouds are small and hardly shift: not very polarizable.'));
  }

  function show(id) {
    cur = id;
    seen[id] = 1;
    d1 = 0; v1 = 0; d2 = 0; peak = 0;
    paintChips();
    paintFacts();
    if (reduceMotion) { d1 = 1; d2 = 1; draw(); }
    if (opts.onShow) opts.onShow(id, seen);
  }

  function draw() {
    var r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    var W = Math.max(10, Math.round(r.width * dpr)), H = Math.max(10, Math.round(r.height * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.clearRect(0, 0, W, H);
    var a = ATOM_SIZE[cur];
    var R = Math.min(W / 5, H / 2.6) * (a.vdw / maxR);
    var gap = Math.min(W / 5, H / 2.6) * 2.15;
    var cx1 = W / 2 - gap / 2, cx2 = W / 2 + gap / 2, cy = H * 0.5;
    var amp = 0.33 * R * Math.sqrt(a.alpha / maxA);
    var s1 = d1 * amp, s2 = d2 * amp;
    var cloud = cssVar('lobe', '#a879c4'), ink = cssVar('ink', '#12212e');
    var neg = cssVar('dneg', '#d1382f'), pos = cssVar('dpos', '#2f62cc'), panel = cssVar('panel', '#ffffff');
    [[cx1, s1], [cx2, s2]].forEach(function (p) {
      var g = ctx.createRadialGradient(p[0] + p[1], cy, R * 0.05, p[0] + p[1], cy, R);
      g.addColorStop(0, cloud);
      g.addColorStop(1, 'rgba(168,121,196,0.05)');
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p[0] + p[1], cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(p[0], cy, Math.max(3 * dpr, R * 0.07), 0, Math.PI * 2); ctx.fill();
      ctx.font = '700 ' + Math.round(13 * dpr) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cur, p[0], cy + R + 16 * dpr);
      /* temporary charges, once the shift is big enough to see */
      if (Math.abs(p[1]) > R * 0.08) {
        var right = p[1] > 0;
        ctx.font = '800 ' + Math.round(16 * dpr) + 'px system-ui, sans-serif';
        ctx.lineWidth = 4 * dpr; ctx.strokeStyle = panel;
        [[right ? 1 : -1, 'δ−', neg], [right ? -1 : 1, 'δ+', pos]].forEach(function (q) {
          var x = p[0] + q[0] * R * 0.62, y = cy - R * 0.55;
          ctx.strokeText(q[1], x, y);
          ctx.fillStyle = q[2];
          ctx.fillText(q[1], x, y);
        });
      }
    });
    /* the attraction right now */
    var pull = Math.max(0, s1 * s2) / (0.33 * 0.33 * Math.pow(Math.min(W / 5, H / 2.6), 2));
    peak = Math.max(peak * 0.995, pull);
    var bw = W * 0.5, bx = (W - bw) / 2, by = H - 14 * dpr;
    ctx.fillStyle = cssVar('line', '#dde5ec');
    ctx.fillRect(bx, by, bw, 6 * dpr);
    ctx.fillStyle = cssVar('accent', '#0f5d8f');
    ctx.fillRect(bx, by, bw * Math.min(1, pull), 6 * dpr);
    ctx.fillStyle = cssVar('muted', '#5d7283');
    ctx.font = '600 ' + Math.round(11 * dpr) + 'px system-ui, sans-serif';
    ctx.fillText('attraction right now', W / 2, by - 6 * dpr);
  }

  var anim = null, last = null;
  function frame(ts) {
    if (last == null) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    t += dt;
    /* the left cloud wanders (a damped random push); the right one follows it */
    v1 += (-6 * d1 - 1.5 * v1) * dt + (Math.random() - 0.5) * 14 * Math.sqrt(dt);
    d1 += v1 * dt;
    d1 = Math.max(-1, Math.min(1, d1));
    d2 += (0.85 * d1 - d2) * Math.min(1, dt * 10);
    draw();
    anim = requestAnimationFrame(frame);
  }

  var ro = window.ResizeObserver ? new ResizeObserver(draw) : null;
  if (ro) ro.observe(canvas);
  show(cur);
  if (!reduceMotion) anim = requestAnimationFrame(frame);

  return {
    node: node, show: show, seen: function () { return seen; },
    destroy: function () { if (anim) cancelAnimationFrame(anim); anim = null; if (ro) ro.disconnect(); }
  };
}

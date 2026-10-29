/* cloud.js: where London dispersion forces come from.
 *
 * Two atoms of one noble gas, side by side. Each is a nucleus inside an
 * electron cloud. The electrons are always moving, so for an instant the
 * left atom's cloud sits a little to one side: that side is δ−, the other
 * δ+ (a temporary dipole). Its δ− side pushes the neighbour's electrons
 * away, so the neighbour's cloud shifts the same way, and for that instant
 * the δ− of one faces the δ+ of the other: they attract.
 *
 * While both clouds are shifted, the δ+ and δ− appear and a dashed line
 * labelled LDF pops up between the facing sides: the attraction.
 *
 * Picking a different noble gas changes two things, both real: the size of
 * the cloud (van der Waals radius, data.js) and how far it shifts
 * (polarizability, data.js; the shifts keep the real proportions between
 * the gases, magnified so they can be seen). More electrons, held farther
 * from the nucleus: a bigger cloud that is easier to push around, so a
 * stronger attraction. The electrons are drawn as specks (up to 40) that
 * drift around inside the cloud; the sloshing and the ripples of the outline
 * are a picture of the idea. The "attraction right now" bar and the line's
 * thickness are the product of the two shifts and the polarizability, a
 * picture rather than a measured force.
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
  var d1 = 0, v1 = 0, d2 = 0, t = 0;

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
    d1 = 0; v1 = 0; d2 = 0; hold = 0; ldf = 0;
    makeSpecks();
    paintChips();
    paintFacts();
    if (reduceMotion) { d1 = 1; d2 = 0.9; draw(); ldf = 1; draw(); }
    if (opts.onShow) opts.onShow(id, seen);
  }

  /* the electrons, drawn as specks that drift around inside the cloud */
  var specks = [];
  function makeSpecks() {
    specks = [];
    var n = Math.min(40, Chem.sub(cur).electrons);
    for (var k = 0; k < 2; k++) {
      var list = [];
      for (var i = 0; i < n; i++) {
        list.push({ ang: Math.random() * Math.PI * 2, rho: 0.2 + 0.7 * Math.sqrt(Math.random()),
          w: (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 1.6) });
      }
      specks.push(list);
    }
  }

  /* how the outline wobbles: three slow ripples, so the cloud looks fluid */
  var ripples = [[2, 0, 0.9], [3, 1.7, -1.3], [4, 3.1, 1.7]];
  function edge(th, e) {
    var r = 1 + 0.32 * e * Math.cos(th);
    ripples.forEach(function (q) { r += 0.035 * Math.sin(q[0] * th + q[1] + q[2] * t); });
    return r;
  }

  var ldf = 0; /* how far the dashed LDF line has popped up, 0 to 1 */

  function draw() {
    var r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    var W = Math.max(10, Math.round(r.width * dpr)), H = Math.max(10, Math.round(r.height * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.clearRect(0, 0, W, H);
    var a = ATOM_SIZE[cur];
    var foot = 34 * dpr;
    var unit = Math.min(W / 5.4, (H - foot) / 2.3);
    var R = unit * (a.vdw / maxR);
    var gap = unit * 2.7;
    var cx1 = W / 2 - gap / 2, cx2 = W / 2 + gap / 2, cy = (H - foot) * 0.52;
    /* how far a cloud can be pushed: the real polarizabilities, in proportion */
    var amp = 0.6 * R * Math.sqrt(a.alpha / maxA);
    var cloud = cssVar('lobe', '#a879c4'), ink = cssVar('ink', '#12212e');
    var neg = cssVar('dneg', '#d1382f'), pos = cssVar('dpos', '#2f62cc'), panel = cssVar('panel', '#ffffff');
    var charged = Math.abs(d1 * amp) > R * 0.1 && Math.abs(d2 * amp) > R * 0.1;
    var atoms = [[cx1, d1], [cx2, d2]];
    var charges = [];
    atoms.forEach(function (p, k) {
      var e = p[1], sx = e * amp, c = p[0] + sx * 0.5;
      /* the outline, stretched toward the side the electrons bunch on */
      ctx.beginPath();
      for (var i = 0; i <= 64; i++) {
        var th = i / 64 * Math.PI * 2, rr = R * edge(th, e * Math.sqrt(a.alpha / maxA));
        var x = c + rr * Math.cos(th), y = cy + rr * Math.sin(th) * 0.96;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.closePath();
      var g = ctx.createRadialGradient(p[0] + sx * 1.3, cy, R * 0.05, p[0] + sx * 0.6, cy, R * 1.1);
      g.addColorStop(0, cloud);
      g.addColorStop(1, 'rgba(168,121,196,0.08)');
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = g;
      ctx.fill();
      ctx.globalAlpha = 1;
      /* the electrons, crowding toward the δ− side */
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.55;
      specks[k].forEach(function (q) {
        var x = c + q.rho * R * 0.85 * Math.cos(q.ang) + sx * 0.9 * q.rho;
        var y = cy + q.rho * R * 0.8 * Math.sin(q.ang);
        ctx.beginPath(); ctx.arc(x, y, 1.6 * dpr, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      /* the nucleus stays put */
      ctx.beginPath(); ctx.arc(p[0], cy, Math.max(3 * dpr, R * 0.07), 0, Math.PI * 2); ctx.fill();
      ctx.font = '700 ' + Math.round(13 * dpr) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(cur, p[0], cy + Math.max(R * 0.3, 16 * dpr));
      /* temporary charges, once the shift is big enough to see */
      if (charged) {
        var right = e > 0;
        [[right ? 1 : -1, 'δ−', neg], [right ? -1 : 1, 'δ+', pos]].forEach(function (q) {
          var x = p[0] + q[0] * R * 0.72, y = cy - R * 0.62;
          charges.push({ atom: k, side: q[0], sign: q[1], x: x, y: y });
          ctx.font = '800 ' + Math.round(18 * dpr) + 'px system-ui, sans-serif';
          ctx.lineWidth = 4 * dpr; ctx.strokeStyle = panel;
          ctx.strokeText(q[1], x, y);
          ctx.fillStyle = q[2];
          ctx.fillText(q[1], x, y);
        });
      }
    });

    /* the attraction right now: a dashed line from one atom's facing side to
       the other's (δ− to δ+), popping up while both clouds are shifted */
    var pull = Math.max(0, d1 * d2) * (a.alpha / maxA);
    if (ldf > 0.02) {
      var from = charges.filter(function (q) { return q.atom === 0 && q.side === 1; })[0];
      var to = charges.filter(function (q) { return q.atom === 1 && q.side === -1; })[0];
      var x1 = from ? from.x : cx1 + R * 0.72, x2 = to ? to.x : cx2 - R * 0.72;
      var pop = ldf < 1 ? 1 + 0.25 * Math.sin(ldf * Math.PI) : 1;
      var ly = cy - R * 0.62;
      x1 += 14 * dpr; x2 -= 14 * dpr;
      ctx.save();
      ctx.globalAlpha = Math.min(1, ldf) * (0.45 + 0.55 * Math.min(1, pull * 1.5 + 0.2));
      ctx.strokeStyle = cssVar('accent', '#0f5d8f');
      ctx.lineWidth = (2 + 3 * Math.min(1, pull * 1.5)) * dpr * pop;
      ctx.setLineDash([7 * dpr, 5 * dpr]);
      ctx.beginPath(); ctx.moveTo(x1, ly - 6 * dpr); ctx.lineTo(x2, ly - 6 * dpr); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '800 ' + Math.round(14 * dpr * pop) + 'px system-ui, sans-serif';
      ctx.fillStyle = cssVar('accent', '#0f5d8f');
      ctx.lineWidth = 4 * dpr; ctx.strokeStyle = panel;
      ctx.strokeText('LDF', (x1 + x2) / 2, ly - 14 * dpr);
      ctx.fillText('LDF', (x1 + x2) / 2, ly - 14 * dpr);
      ctx.restore();
    }
    ldfTarget = charged ? 1 : 0;

    var bw = W * 0.5, bx = (W - bw) / 2, by = H - 10 * dpr;
    ctx.fillStyle = cssVar('line', '#dde5ec');
    ctx.fillRect(bx, by, bw, 6 * dpr);
    ctx.fillStyle = cssVar('accent', '#0f5d8f');
    ctx.fillRect(bx, by, bw * Math.min(1, pull), 6 * dpr);
    ctx.fillStyle = cssVar('muted', '#5d7283');
    ctx.font = '600 ' + Math.round(11 * dpr) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('attraction right now', W / 2, by - 6 * dpr);
  }
  var ldfTarget = 0;

  var anim = null, last = null, goal = 0, hold = 0;
  function frame(ts) {
    if (last == null) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    t += dt;
    /* the left cloud sloshes from side to side: every second or so its
       electrons head for a new side and stay a moment; the right cloud
       follows a beat later */
    hold -= dt;
    if (hold <= 0) {
      goal = (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.2 ? 0.2 : 0.7 + 0.3 * Math.random());
      hold = 0.9 + Math.random() * 0.9;
    }
    v1 += (14 * (goal - d1) - 4 * v1) * dt + (Math.random() - 0.5) * 3 * Math.sqrt(dt);
    d1 = Math.max(-1, Math.min(1, d1 + v1 * dt));
    d2 += (0.9 * d1 - d2) * Math.min(1, dt * 6);
    specks.forEach(function (list) { list.forEach(function (q) { q.ang += q.w * dt; }); });
    ldf += (ldfTarget - ldf) * Math.min(1, dt * (ldfTarget ? 9 : 5));
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

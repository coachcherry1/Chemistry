/* field.js: the electric field test.
 *
 * Molecules of several substances tumble between two charged plates (+ on
 * the left, − on the right). Switch the field on and each molecule feels a
 * turning push from the plates on its charged ends: a polar molecule, with a
 * δ+ end and a δ− end, turns until its δ− end faces the + plate; a nonpolar
 * molecule has no ends, feels no turn, and keeps tumbling.
 *
 * Nothing is scripted: each molecule's turn comes from its own charge model
 * (VSEPR.centres(model).dipole), the same one the charge view shows, and the
 * "lined up" label under each substance is read off the motion itself (the
 * average of cos θ between each molecule's δ−-to-δ+ direction and the
 * field). With reduced motion the molecules jump straight to where they end
 * up instead of turning.
 */

function FieldSim(host, ids) {
  'use strict';
  var V = VSEPR.V;
  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }

  var canvas = document.createElement('canvas');
  canvas.className = 'field-canvas';
  canvas.setAttribute('role', 'img');
  host.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var PER = 5;
  var on = false, anim = null, last = null, sinceOn = 0;
  var rand = Math.random;

  function randomRot() {
    /* a random rotation from a random unit quaternion */
    var u1 = rand(), u2 = rand(), u3 = rand();
    var a = Math.sqrt(1 - u1), b = Math.sqrt(u1);
    var w = a * Math.sin(2 * Math.PI * u2), x = a * Math.cos(2 * Math.PI * u2);
    var y = b * Math.sin(2 * Math.PI * u3), z = b * Math.cos(2 * Math.PI * u3);
    return [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]];
  }
  function apply(M, v) { return [V.dot(M[0], v), V.dot(M[1], v), V.dot(M[2], v)]; }
  function axisRot(axis, ang) {
    var l = V.len(axis);
    if (l < 1e-12 || Math.abs(ang) < 1e-12) return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    var k = V.mul(axis, 1 / l), c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
    var x = k[0], y = k[1], z = k[2];
    return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y],
            [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
            [t * x * z - s * y, t * y * z + s * x, t * z * z + c]];
  }
  function matMul(a, b) {
    var out = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
      out[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
    }
    return out;
  }
  function reortho(m) {
    var x = V.unit(m[0]);
    var y = V.unit(V.sub(m[1], V.mul(x, V.dot(m[1], x))));
    return [x, y, V.cross(x, y)];
  }

  var subs = ids.map(function (id) {
    var model = VSEPR.model3D ? modelFor(id) : null;
    var q = VSEPR.charges(model);
    /* only the direction matters: every polar molecule gets the same turn, so
       the test says polar or nonpolar and never "how polar" */
    var dip = VSEPR.centres(model, q).dipole;
    dip = V.len(dip) > 1e-6 ? V.mul(V.unit(dip), 1.5) : [0, 0, 0];
    var reach = 0;
    model.atoms.forEach(function (a) { reach = Math.max(reach, V.len(a.p)); });
    var mols = [];
    for (var i = 0; i < PER; i++) {
      mols.push({ O: randomRot(), w: [rand() - 0.5, rand() - 0.5, rand() - 0.5].map(function (v) { return v * 4; }),
                  jx: rand() * 6.28, jy: rand() * 6.28 });
    }
    return { id: id, sp: Lewis.species(id), model: model, q: q, dip: dip, mols: mols, reach: reach };
  });

  /* a molecule with lone pairs and no measured angle keeps the ideal
     directions: enough to place its charged ends */
  function modelFor(id) { return VSEPR.model(VSEPR.finished(id), { id: id, ideal: true }); }

  var E = [1, 0, 0];         /* the field points from the + plate to the − plate */
  var TORQUE = 60, DAMP = 4, KICK = 7;

  function step(dt) {
    subs.forEach(function (sb) {
      sb.mols.forEach(function (mo) {
        var d = apply(mo.O, sb.dip);
        var tau = on ? V.mul(V.cross(d, E), TORQUE) : [0, 0, 0];
        var kick = [rand() - 0.5, rand() - 0.5, rand() - 0.5].map(function (v) { return v * KICK * Math.sqrt(dt) * 6; });
        mo.w = V.add(mo.w, V.add(V.mul(V.sub(tau, V.mul(mo.w, DAMP)), dt), kick));
        var sp = V.len(mo.w);
        if (sp > 9) mo.w = V.mul(mo.w, 9 / sp);
        mo.O = reortho(matMul(axisRot(mo.w, V.len(mo.w) * dt), mo.O));
      });
    });
  }

  /* reduced motion: jump to where the molecules end up */
  function settle() {
    subs.forEach(function (sb) {
      sb.mols.forEach(function (mo) {
        mo.O = randomRot();
        var l = V.len(sb.dip);
        if (!on || l < 1e-6) return;
        /* turn the dipole onto the field, keeping a random roll about it */
        var d = V.unit(apply(mo.O, sb.dip));
        var axis = V.cross(d, E), ang = Math.acos(Math.max(-1, Math.min(1, V.dot(d, E))));
        mo.O = matMul(axisRot(axis, ang), mo.O);
      });
    });
  }

  function alignment(sb) {
    if (V.len(sb.dip) < 1e-6) return 0;
    var sum = 0;
    sb.mols.forEach(function (mo) { sum += V.dot(V.unit(apply(mo.O, sb.dip)), E); });
    return sum / sb.mols.length;
  }

  function cssVar(name, fallback) {
    try { var v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim(); return v || fallback; }
    catch (e) { return fallback; }
  }

  function resize() {
    var r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    var w = Math.max(10, Math.round(r.width * dpr)), h = Math.max(10, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    draw();
  }

  function draw() {
    var W = canvas.width, H = canvas.height;
    if (!W || !H) return;
    var dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, W, H);
    var ink = cssVar('ink', '#12212e'), muted = cssVar('muted', '#5d7283'), line = cssVar('line', '#dde5ec');
    var neg = cssVar('dneg', '#d1382f'), pos = cssVar('dpos', '#2f62cc'), neutral = cssVar('neutral', '#b9c4cd');
    var plateW = 22 * dpr;
    /* the plates */
    [[0, pos, '+'], [W - plateW, neg, '−']].forEach(function (p) {
      ctx.fillStyle = on ? p[1] : line;
      ctx.fillRect(p[0], 0, plateW, H);
      ctx.fillStyle = on ? '#ffffff' : muted;
      ctx.font = '800 ' + Math.round(18 * dpr) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (var y = H * 0.12; y < H; y += H * 0.25) ctx.fillText(p[2], p[0] + plateW / 2, y);
    });
    var cols = subs.length > 3 ? 3 : subs.length, rows = Math.ceil(subs.length / cols);
    var x0 = plateW + 8 * dpr, cw = (W - 2 * x0) / cols, ch = H / rows;
    var fs = Math.round(13 * dpr);
    subs.forEach(function (sb, k) {
      var c = k % cols, r = Math.floor(k / cols);
      var bx = x0 + c * cw, by = r * ch;
      ctx.strokeStyle = line;
      ctx.lineWidth = dpr;
      ctx.strokeRect(bx + 2 * dpr, by + 2 * dpr, cw - 4 * dpr, ch - 4 * dpr);
      ctx.fillStyle = ink;
      ctx.font = '700 ' + fs + 'px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(sb.sp.text, bx + 8 * dpr, by + 6 * dpr);
      var a = alignment(sb), lined = on && a > 0.6;
      ctx.font = '600 ' + Math.round(12 * dpr) + 'px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = lined ? cssVar('good', '#0f7a52') : muted;
      ctx.fillText(on ? (lined ? 'lined up' : 'still tumbling') : 'tumbling', bx + cw - 8 * dpr, by + 6 * dpr);
      /* every molecule fills the same room, whatever its size */
      var size = Math.min(cw / 3.6, (ch - 26 * dpr) / 2.3);
      var scale = size / (2 * (sb.reach + 0.45));
      sb.mols.forEach(function (mo, i) {
        var gx = bx + cw * (0.2 + 0.3 * (i % 3)) + (i >= 3 ? cw * 0.15 : 0);
        var gy = by + 22 * dpr + (ch - 26 * dpr) * (i < 3 ? 0.3 : 0.75);
        var pts = sb.model.atoms.map(function (at) {
          var p = apply(mo.O, at.p);
          return { x: gx + p[0] * scale, y: gy - p[1] * scale, z: p[2] };
        });
        ctx.lineWidth = Math.max(1.5 * dpr, scale * 0.12);
        ctx.strokeStyle = muted;
        sb.model.bonds.forEach(function (b) {
          ctx.beginPath(); ctx.moveTo(pts[b[0]].x, pts[b[0]].y); ctx.lineTo(pts[b[1]].x, pts[b[1]].y); ctx.stroke();
        });
        pts.map(function (p, j) { return { p: p, j: j }; }).sort(function (u, v) { return u.p.z - v.p.z; }).forEach(function (o) {
          var qq = sb.q[o.j];
          ctx.fillStyle = Math.abs(qq) < 0.05 ? neutral : qq < 0 ? neg : pos;
          var rr = (sb.model.atoms[o.j].el === 'H' ? 0.3 : 0.45) * scale;
          ctx.beginPath(); ctx.arc(o.p.x, o.p.y, rr, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = dpr; ctx.strokeStyle = ink; ctx.stroke();
        });
      });
    });
  }

  function loop(ts) {
    if (last == null) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    for (var k = 0; k < 3; k++) step(dt / 3);
    if (on) sinceOn += dt;
    draw();
    anim = requestAnimationFrame(loop);
  }

  function label() {
    canvas.setAttribute('aria-label', 'Molecules of ' + subs.map(function (s) { return s.sp.text; }).join(', ') +
      ' between a + plate on the left and a − plate on the right. The field is ' + (on ? 'on. ' : 'off; every molecule tumbles. ') +
      (on ? subs.map(function (s) { return s.sp.text + (alignment(s) > 0.6 ? ' lined up' : ' still tumbling'); }).join(', ') + '.' : ''));
  }

  var ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas);
  resize();
  if (reduceMotion) { settle(); draw(); } else anim = requestAnimationFrame(loop);
  label();

  return {
    node: canvas,
    setField: function (v) {
      on = !!v;
      sinceOn = 0;
      if (reduceMotion) { settle(); draw(); }
      label();
    },
    isOn: function () { return on; },
    /* seconds since the field was switched on (reduced motion: settled at once) */
    settled: function () { return reduceMotion || sinceOn > 2.5; },
    lined: function () {
      var out = {};
      subs.forEach(function (s) { out[s.id] = on && alignment(s) > 0.6; });
      label();
      return out;
    },
    destroy: function () { if (anim) cancelAnimationFrame(anim); anim = null; if (ro) ro.disconnect(); }
  };
}

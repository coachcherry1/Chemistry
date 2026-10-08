/* viewer3d.js — a small ball-and-stick renderer on a 2D canvas.
 *
 * No WebGL and no library: a dozen to thirty atoms sorted back to front is
 * well within what a Chromebook draws at full frame rate, and it cannot fail
 * to load inside a locked-down LMS iframe.
 *
 * Drag to tumble. Two preset views: "as drawn" (the page, matching the
 * wedge/dash drawing) and "down the bond" (exactly the Newman projection).
 * Space-filling mode swaps ball radii for van der Waals radii, which is the
 * picture to look at when asking why two groups crowd each other.
 */

var Viewer3D = (function () {
  'use strict';

  var V = GEOM.vec;

  function matMul(a, b) {
    var out = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
      out[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
    }
    return out;
  }

  function orthonormal(m) {
    var x = V.unit(m[0]);
    var y = V.unit(V.sub(m[1], V.mul(x, V.dot(m[1], x))));
    return [x, y, V.cross(x, y)];
  }

  /* rotation matrix <-> quaternion, for smooth turns between preset views */
  function toQuat(m) {
    var t = m[0][0] + m[1][1] + m[2][2], q;
    if (t > 0) {
      var s = Math.sqrt(t + 1) * 2;
      q = [0.25 * s, (m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s];
    } else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
      var s1 = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2;
      q = [(m[2][1] - m[1][2]) / s1, 0.25 * s1, (m[0][1] + m[1][0]) / s1, (m[0][2] + m[2][0]) / s1];
    } else if (m[1][1] > m[2][2]) {
      var s2 = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2;
      q = [(m[0][2] - m[2][0]) / s2, (m[0][1] + m[1][0]) / s2, 0.25 * s2, (m[1][2] + m[2][1]) / s2];
    } else {
      var s3 = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;
      q = [(m[1][0] - m[0][1]) / s3, (m[0][2] + m[2][0]) / s3, (m[1][2] + m[2][1]) / s3, 0.25 * s3];
    }
    return q;
  }

  function fromQuat(q) {
    var w = q[0], x = q[1], y = q[2], z = q[3];
    return [
      [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
      [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
      [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]
    ];
  }

  function slerp(a, b, t) {
    var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = b.map(function (v) { return -v; }); d = -d; }
    if (d > 0.9995) {
      var r = a.map(function (v, i) { return v + (b[i] - v) * t; });
      var l = Math.sqrt(r.reduce(function (s, v) { return s + v * v; }, 0));
      return r.map(function (v) { return v / l; });
    }
    var th = Math.acos(d), s = Math.sin(th);
    var wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return a.map(function (v, i) { return v * wa + b[i] * wb; });
  }

  function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; }
  function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }

  /* A slight three-quarter turn from the page, so the first look already
     reads as 3D rather than as a flat copy of the drawing. */
  var START = matMul(rotX(-0.32), matMul(rotY(0.5), GEOM.VIEWS.page));

  function Viewer(canvas, mol, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mol = mol;
    this.phi = GEOM.phi0(mol);
    this.R = opts.view === 'newman' ? (Draw.getFlip() ? GEOM.VIEWS.newmanFlip : GEOM.VIEWS.newman) : START;
    this.style = 'ball';
    this.anim = null;
    this.onView = opts.onView || null;
    this.build();
    this.attach();
    this.resize();
  }

  Viewer.prototype.build = function () {
    this.model = GEOM.atoms(this.mol, this.phi);
    var c = this.model.center, r = 0;
    this.model.atoms.forEach(function (a) {
      var d = V.sub(a.p, c);
      r = Math.max(r, Math.sqrt(V.dot(d, d)) + ELEMENTS[a.el].vdw * 0.8);
    });
    this.radius = r;
  };

  Viewer.prototype.setMolecule = function (mol, phi) {
    this.mol = mol;
    this.phi = phi == null ? GEOM.phi0(mol) : phi;
    this.build();
    this.draw();
  };

  Viewer.prototype.setPhi = function (phi) {
    this.phi = phi;
    this.model = GEOM.atoms(this.mol, phi);
    this.draw();
  };

  Viewer.prototype.setStyle = function (style) { this.style = style; this.draw(); };

  Viewer.prototype.setView = function (name) {
    var down = Draw.getFlip() ? GEOM.VIEWS.newmanFlip : GEOM.VIEWS.newman;
    var target = name === 'newman' ? down : START;
    var self = this;
    if (reduceMotion) { this.R = target; this.draw(); return; }
    var qa = toQuat(this.R), qb = toQuat(target), t0 = null;
    if (this.anim) cancelAnimationFrame(this.anim);
    function step(ts) {
      if (t0 == null) t0 = ts;
      var t = Math.min(1, (ts - t0) / 700);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      self.R = fromQuat(slerp(qa, qb, e));
      self.draw();
      if (t < 1) self.anim = requestAnimationFrame(step);
      else { self.R = target; self.anim = null; self.draw(); }
    }
    this.anim = requestAnimationFrame(step);
  };

  Viewer.prototype.attach = function () {
    var self = this, drag = null;
    this.canvas.addEventListener('pointerdown', function (ev) {
      drag = { x: ev.clientX, y: ev.clientY };
      try { self.canvas.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
      if (self.anim) { cancelAnimationFrame(self.anim); self.anim = null; }
      self.canvas.classList.add('grabbing');
    });
    this.canvas.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
      drag.x = ev.clientX; drag.y = ev.clientY;
      self.R = orthonormal(matMul(rotX(dy * 0.01), matMul(rotY(dx * 0.01), self.R)));
      self.draw();
      if (self.onView) self.onView('free');
    });
    function end() { drag = null; self.canvas.classList.remove('grabbing'); }
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
    if (window.ResizeObserver) {
      new ResizeObserver(function () { self.resize(); }).observe(this.canvas);
    }
  };

  Viewer.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var w = Math.max(10, Math.round(r.width * dpr)), h = Math.max(10, Math.round(r.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.draw();
  };

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function m(c) { return Math.max(0, Math.min(255, Math.round(f > 0 ? c + (255 - c) * f : c * (1 + f)))); }
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }

  Viewer.prototype.draw = function () {
    var ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    var R = this.R, c = this.model.center;
    var scale = Math.min(W, H) / (2.15 * this.radius);
    var D = this.radius * 2.8;      /* camera distance: enough perspective that front groups read as nearer */
    var cx = W / 2, cy = H / 2;
    var space = this.style === 'space';

    var pts = this.model.atoms.map(function (a) {
      var p = V.sub(a.p, c);
      var x = V.dot(R[0], p), y = V.dot(R[1], p), z = V.dot(R[2], p);
      var k = D / (D - z);
      return { x: cx + x * scale * k, y: cy - y * scale * k, z: z, k: k, a: a };
    });

    var items = pts.map(function (p, i) { return { type: 'atom', z: p.z, i: i }; });
    if (!space) {
      this.model.bonds.forEach(function (b) {
        items.push({ type: 'bond', z: (pts[b[0]].z + pts[b[1]].z) / 2 - 0.25, b: b });
      });
    }
    items.sort(function (p, q) { return p.z - q.z; });

    items.forEach(function (it) {
      if (it.type === 'bond') {
        var p = pts[it.b[0]], q = pts[it.b[1]];
        var mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
        var w = 0.15 * scale * (p.k + q.k) / 2;
        ctx.lineCap = 'round';
        ctx.lineWidth = w + 2;
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        ctx.lineWidth = w;
        ctx.strokeStyle = shade(ELEMENTS[p.a.el].color, -0.12);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mx, my); ctx.stroke();
        ctx.strokeStyle = shade(ELEMENTS[q.a.el].color, -0.12);
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(q.x, q.y); ctx.stroke();
        return;
      }
      var at = pts[it.i], e = ELEMENTS[at.a.el];
      var r = (space ? e.vdw * 0.92 : e.ball) * scale * at.k;
      var gr = ctx.createRadialGradient(at.x - r * 0.35, at.y - r * 0.4, r * 0.1, at.x, at.y, r);
      gr.addColorStop(0, shade(e.color, 0.55));
      gr.addColorStop(0.55, e.color);
      gr.addColorStop(1, shade(e.color, -0.35));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(at.x, at.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = Math.max(1, scale * 0.02);
      ctx.strokeStyle = e.edge;
      ctx.stroke();
    });
  };

  return Viewer;
})();

/* viewer3d.js: a small ball-and-stick renderer on a 2D canvas.
 *
 * No WebGL and no library: forty-odd atoms sorted back to front is well
 * within what a Chromebook draws at full frame rate, and it cannot fail to
 * load inside a locked-down LMS iframe.
 *
 * Drag to tumble. Preset views come from chair.js: 'side' (the same camera
 * as the chair drawings), 'top' (the flat drawing's view) and 'bond' (down a
 * ring bond, exactly the Newman projection). Space-filling mode swaps ball
 * radii for van der Waals radii, which is the picture to look at when asking
 * which atoms crowd each other.
 *
 * The molecule itself is handed in as a model (CHAIR.model), so a ring flip
 * is just a sequence of models. Atoms can be tinted (axial, equatorial, the
 * red and blue tracking H atoms), made to glow (crowded atoms), and picked
 * with a click.
 */

var Viewer3D = (function () {
  'use strict';

  var V = CHAIR.vec;

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

  /* A slight turn from the drawing's view, so the first look already reads
     as 3D rather than as a flat copy of the chair drawing. */
  var START = matMul(rotY(0.38), CHAIR.sideCam(0, 30 * Math.PI / 180));

  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }

  function Viewer(canvas, model, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.model = model;
    this.view = opts.view || 'start';
    this.viewArgs = opts.viewArgs || null;
    this.R = opts.view ? this.cameraFor(opts.view, opts.viewArgs) : START;
    this.focus = opts.view ? CHAIR.focus(opts.view, model, opts.viewArgs && opts.viewArgs[0], opts.viewArgs && opts.viewArgs[1]) : [0, 0, 0];
    this.style = opts.style || 'ball';
    this.tint = opts.tint || {};
    this.glow = opts.glow || [];
    this.hot = [];
    this.numbers = opts.numbers !== false;
    this.pickable = opts.pickable || null;
    this.onPick = opts.onPick || null;
    this.onView = opts.onView || null;
    this.anim = null;
    this.radius = opts.radius || this.measure(model);
    this.pts = [];
    this.attach();
    this.resize();
  }

  Viewer.prototype.measure = function (m) {
    var r = 0;
    m.atoms.forEach(function (a) { r = Math.max(r, V.len(a.p) + ELEMENTS[a.el].vdw * 0.75); });
    return Math.max(r, 3.2);
  };

  Viewer.prototype.cameraFor = function (name, args) {
    if (name === 'start') return START;
    return CHAIR.camera(name, this.model, args && args[0], args && args[1]);
  };

  /* A new model of the same molecule (a flip step) keeps the scale, so the
     picture does not breathe; a new molecule may rescale. */
  Viewer.prototype.setModel = function (m, rescale) {
    this.model = m;
    if (rescale) this.radius = Math.max(this.radius, this.measure(m));
    this.draw();
  };

  Viewer.prototype.setStyle = function (style) { this.style = style; this.draw(); };
  Viewer.prototype.setTint = function (t) { this.tint = t || {}; this.draw(); };
  Viewer.prototype.setGlow = function (g) { this.glow = g || []; this.draw(); };
  Viewer.prototype.setHot = function (g) { this.hot = g || []; this.draw(); };

  Viewer.prototype.setView = function (name, args) {
    var target = this.cameraFor(name, args);
    var f0 = this.focus, f1 = CHAIR.focus(name, this.model, args && args[0], args && args[1]);
    this.view = name;
    var self = this;
    if (reduceMotion) { this.R = target; this.focus = f1; this.draw(); return; }
    var qa = toQuat(this.R), qb = toQuat(target), t0 = null;
    if (this.anim) cancelAnimationFrame(this.anim);
    function step(ts) {
      if (t0 == null) t0 = ts;
      var t = Math.min(1, (ts - t0) / 700);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      self.R = fromQuat(slerp(qa, qb, e));
      self.focus = V.add(f0, V.mul(V.sub(f1, f0), e));
      self.draw();
      if (t < 1) self.anim = requestAnimationFrame(step);
      else { self.R = target; self.focus = f1; self.anim = null; self.draw(); }
    }
    this.anim = requestAnimationFrame(step);
  };

  Viewer.prototype.attach = function () {
    var self = this, drag = null;
    this.canvas.addEventListener('pointerdown', function (ev) {
      drag = { x: ev.clientX, y: ev.clientY, x0: ev.clientX, y0: ev.clientY, moved: 0 };
      try { self.canvas.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
      if (self.anim) { cancelAnimationFrame(self.anim); self.anim = null; }
      self.canvas.classList.add('grabbing');
    });
    this.canvas.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
      drag.x = ev.clientX; drag.y = ev.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved < 4) return;
      self.R = orthonormal(matMul(rotX(dy * 0.01), matMul(rotY(dx * 0.01), self.R)));
      self.view = 'free';
      self.draw();
      if (self.onView) self.onView('free');
    });
    function end(ev) {
      var d = drag;
      drag = null;
      self.canvas.classList.remove('grabbing');
      if (d && d.moved < 4 && ev && ev.type === 'pointerup' && self.onPick) self.pick(ev);
    }
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
    if (window.ResizeObserver) {
      new ResizeObserver(function () { self.resize(); }).observe(this.canvas);
    }
  };

  /* The front-most pickable atom under the pointer. */
  Viewer.prototype.pick = function (ev) {
    var r = this.canvas.getBoundingClientRect();
    var dpr = this.canvas.width / Math.max(1, r.width);
    var x = (ev.clientX - r.left) * dpr, y = (ev.clientY - r.top) * dpr;
    var hit = null;
    for (var i = 0; i < this.pts.length; i++) {
      var p = this.pts[i];
      if ((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) <= (p.r + 3 * dpr) * (p.r + 3 * dpr)) {
        if (!hit || p.z > hit.z) hit = p;
      }
    }
    if (hit && (!this.pickable || this.pickable(hit.a))) this.onPick(hit.a.id);
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

  function hex(c) { return /^#[0-9a-f]{6}$/i.test(c) ? c : '#888888'; }

  Viewer.prototype.draw = function () {
    var ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    var R = this.R;
    var scale = Math.min(W, H) / (1.8 * this.radius);
    var D = this.radius * 2.8;      /* camera distance: enough perspective that front atoms read as nearer */
    var cx = W / 2, cy = H / 2;
    var space = this.style === 'space';
    var tint = this.tint, glow = this.glow, hot = this.hot;
    var crowd = hex(cssVar('crowd', '#d1382f')), accent = cssVar('accent', '#0f5d8f');
    var ink = cssVar('ink', '#12212e'), panel = cssVar('panel', '#ffffff');
    var colors = {};
    function colorOf(a) {
      var t = tint[a.id];
      if (t) { if (!colors[t]) colors[t] = hex(cssVar(t, '#888888')); return colors[t]; }
      return ELEMENTS[a.el].color;
    }

    var f = this.focus;
    var pts = this.model.atoms.map(function (a) {
      var p = V.sub(a.p, f);
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
        ctx.strokeStyle = shade(colorOf(p.a), -0.12);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mx, my); ctx.stroke();
        ctx.strokeStyle = shade(colorOf(q.a), -0.12);
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(q.x, q.y); ctx.stroke();
        return;
      }
      var at = pts[it.i], e = ELEMENTS[at.a.el];
      var col = colorOf(at.a);
      var r = (space ? e.vdw * 0.92 : e.ball * (tint[at.a.id] ? 1.12 : 1)) * scale * at.k;
      at.r = r;
      var gr = ctx.createRadialGradient(at.x - r * 0.35, at.y - r * 0.4, r * 0.1, at.x, at.y, r);
      gr.addColorStop(0, shade(col, 0.55));
      gr.addColorStop(0.55, col);
      gr.addColorStop(1, shade(col, -0.35));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(at.x, at.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = Math.max(1, scale * 0.02);
      ctx.strokeStyle = tint[at.a.id] ? shade(col, -0.4) : e.edge;
      ctx.stroke();
      if (glow.indexOf(at.a.id) >= 0) {
        ctx.fillStyle = 'rgba(209,56,47,0.38)';
        ctx.beginPath(); ctx.arc(at.x, at.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = Math.max(2, scale * 0.06);
        ctx.strokeStyle = crowd;
        ctx.beginPath(); ctx.arc(at.x, at.y, r + ctx.lineWidth / 2, 0, Math.PI * 2); ctx.stroke();
      }
      if (hot.indexOf(at.a.id) >= 0) {
        ctx.lineWidth = Math.max(3, scale * 0.08);
        ctx.strokeStyle = accent;
        ctx.beginPath(); ctx.arc(at.x, at.y, r + ctx.lineWidth, 0, Math.PI * 2); ctx.stroke();
      }
    });
    this.pts = pts;

    if (this.numbers) {
      var fs = Math.max(11, Math.round(scale * 0.3));
      ctx.font = '700 ' + fs + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var ring = pts.filter(function (p) { return p.a.ring; });
      var mx = 0, my = 0;
      ring.forEach(function (p) { mx += p.x / 6; my += p.y / 6; });
      var placed = [];
      ring.slice().sort(function (p, q) { return q.z - p.z; }).forEach(function (p) {
        if (placed.some(function (q) { return Math.abs(q.x - p.x) + Math.abs(q.y - p.y) < fs; })) return;
        placed.push(p);
        var dx = p.x - mx, dy = p.y - my, l = Math.sqrt(dx * dx + dy * dy) || 1;
        var off = (space ? 0.2 : 0.42) * scale;
        var x = p.x - dx / l * off, y = p.y - dy / l * off;
        ctx.lineWidth = 4;
        ctx.strokeStyle = panel;
        ctx.strokeText(String(p.a.carbon), x, y);
        ctx.fillStyle = ink;
        ctx.fillText(String(p.a.carbon), x, y);
      });
    }
  };

  return Viewer;
})();

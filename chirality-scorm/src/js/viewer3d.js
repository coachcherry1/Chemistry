/* viewer3d.js: a small ball-and-stick renderer on a 2D canvas.
 *
 * No WebGL and no library: a few dozen atoms sorted back to front is well
 * within what a Chromebook draws at full frame rate, and it cannot fail to
 * load inside a locked-down LMS iframe. Same look as the Newman and chairs
 * activities.
 *
 * A scene holds one or two molecules ("objects"). Each has its own turn (a
 * rotation matrix about the molecule's pivot) and a sideways offset, so the
 * mirror scene can show a molecule and its reflection with a mirror pane
 * between them. With `linked`, turning the first molecule turns the second
 * as its reflection really would turn. Drag (mouse, touch, trackpad) or use
 * the arrow keys to turn whichever molecule is draggable; letting go calls
 * onRelease, which the activity uses to settle the molecule into the nearest
 * position that can be drawn on paper.
 *
 * Extras: tinted atoms, glowing atoms, priority badges (1 to 4) beside
 * atoms, element letters on the coloured atoms, a see-through plane (a
 * mirror plane inside a molecule), a ghosted copy laid over the original,
 * and the 1 → 2 → 3 arrow round a chirality centre.
 */

var Viewer3D = (function () {
  'use strict';

  var G = GEOM;
  var MIRROR = [[-1, 0, 0], [0, 1, 0], [0, 0, 1]];

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* old browser */ }

  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function m(c) { return Math.max(0, Math.min(255, Math.round(f > 0 ? c + (255 - c) * f : c * (1 + f)))); }
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }
  function hex(c) { return /^#[0-9a-f]{6}$/i.test(c) ? c : '#888888'; }

  function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }
  function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; }

  function Viewer(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.objects = (opts.objects || []).map(function (o) { return defaults(o); });
    this.radius = opts.radius || 3.2;
    this.linked = !!opts.linked;
    this.pane = !!opts.pane;
    this.labels = opts.labels !== false;
    this.onRelease = opts.onRelease || null;
    this.onTurn = opts.onTurn || null;
    /* the camera looks at the page from a little above and to one side, so a
       wedge and a dash that line up on paper show apart in 3D */
    this.cam = opts.cam || (this.objects.length > 1 ? Viewer.CAM_MIRROR : Viewer.CAM);
    this.anims = {};
    this.attach();
    this.resize();
  }

  function defaults(o) {
    o.R = o.R || G.ident();
    o.offset = o.offset || [0, 0, 0];
    o.tint = o.tint || {};
    o.glow = o.glow || [];
    o.badges = o.badges || {};
    o.alpha = o.alpha == null ? 1 : o.alpha;
    o.draggable = o.draggable !== false;
    return o;
  }

  Viewer.prototype.set = function (i, props) {
    var o = this.objects[i];
    if (!o) { o = this.objects[i] = defaults({}); }
    Object.keys(props).forEach(function (k) { o[k] = props[k]; });
    if (this.linked && i === 0 && props.R && this.objects[1]) this.objects[1].R = G.mmul(MIRROR, G.mmul(props.R, MIRROR));
    this.draw();
  };

  Viewer.prototype.get = function (i) { return this.objects[i]; };

  /* Turn object i smoothly to rotation R. */
  Viewer.prototype.animate = function (i, R, ms, done) {
    var self = this, o = this.objects[i];
    if (this.anims[i]) cancelAnimationFrame(this.anims[i]);
    if (reduceMotion || !ms) { this.set(i, { R: R }); if (done) done(); return; }
    var from = o.R, t0 = null;
    function step(ts) {
      if (t0 == null) t0 = ts;
      var t = Math.min(1, (ts - t0) / ms);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      self.set(i, { R: t < 1 ? G.between(from, R, e) : R });
      if (t < 1) self.anims[i] = requestAnimationFrame(step);
      else { self.anims[i] = null; if (done) done(); }
    }
    this.anims[i] = requestAnimationFrame(step);
  };

  /* Slide object i to a new offset (laying a copy over the original). */
  Viewer.prototype.slide = function (i, offset, ms, done) {
    var self = this, o = this.objects[i], from = o.offset.slice(), t0 = null;
    if (reduceMotion || !ms) { this.set(i, { offset: offset }); if (done) done(); return; }
    function step(ts) {
      if (t0 == null) t0 = ts;
      var t = Math.min(1, (ts - t0) / ms);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      self.set(i, { offset: G.add(from, G.mul(G.sub(offset, from), e)) });
      if (t < 1) requestAnimationFrame(step); else if (done) done();
    }
    requestAnimationFrame(step);
  };

  Viewer.prototype.turning = function () { return this.grab != null; };

  /* Which object a pointer at canvas x picks up. */
  Viewer.prototype.objectAt = function (x) {
    var n = this.objects.length, r = this.canvas.getBoundingClientRect();
    var drag = this.objects.map(function (o, i) { return o.draggable ? i : -1; }).filter(function (i) { return i >= 0; });
    if (!drag.length) return null;
    if (drag.length === 1 || n === 1) return drag[0];
    var frac = (x - r.left) / Math.max(1, r.width);
    var best = drag[0], bd = Infinity, self = this;
    drag.forEach(function (i) {
      var cx = 0.5 + self.objects[i].offset[0] / (3.6 * self.radius);
      var d = Math.abs(frac - cx);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  };

  /* Turn object i by R, a turn of the picture on screen. */
  Viewer.prototype.turnBy = function (i, R) {
    var o = this.objects[i];
    var world = G.mmul(G.transpose(this.cam), G.mmul(R, this.cam));
    this.set(i, { R: G.orthonormal(G.mmul(world, o.R)) });
    if (this.onTurn) this.onTurn(i);
  };

  Viewer.prototype.attach = function () {
    var self = this, drag = null;
    var c = this.canvas;
    c.addEventListener('pointerdown', function (ev) {
      var i = self.objectAt(ev.clientX);
      if (i == null) return;
      drag = { i: i, x: ev.clientX, y: ev.clientY, moved: 0 };
      self.grab = i;
      if (self.anims[i]) { cancelAnimationFrame(self.anims[i]); self.anims[i] = null; }
      try { c.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
      c.classList.add('grabbing');
    });
    c.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
      drag.x = ev.clientX; drag.y = ev.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved < 3) return;
      self.turnBy(drag.i, G.mmul(rotX(dy * 0.012), rotY(dx * 0.012)));
    });
    function end() {
      if (!drag) return;
      var d = drag;
      drag = null;
      self.grab = null;
      c.classList.remove('grabbing');
      if (d.moved >= 3 && self.onRelease) self.onRelease(d.i);
    }
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    /* arrow keys turn the molecule; letting go of the key settles it */
    var keyTurn = null;
    c.addEventListener('keydown', function (ev) {
      var k = ev.key, a = 12 * Math.PI / 180;
      var R = k === 'ArrowLeft' ? rotY(-a) : k === 'ArrowRight' ? rotY(a) : k === 'ArrowUp' ? rotX(-a) : k === 'ArrowDown' ? rotX(a) : null;
      if (!R) return;
      ev.preventDefault();
      var i = self.objectAt(c.getBoundingClientRect().left + c.getBoundingClientRect().width * (self.keyTarget === 1 ? 0.8 : 0.2));
      if (self.keyTarget != null && self.objects[self.keyTarget] && self.objects[self.keyTarget].draggable) i = self.keyTarget;
      if (i == null) return;
      keyTurn = i;
      self.turnBy(i, R);
    });
    c.addEventListener('keyup', function (ev) {
      if (keyTurn == null || !/^Arrow/.test(ev.key)) return;
      var i = keyTurn;
      keyTurn = null;
      if (self.onRelease) self.onRelease(i);
    });
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(c);
  };

  Viewer.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var w = Math.max(10, Math.round(r.width * dpr)), h = Math.max(10, Math.round(r.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.draw();
  };

  /* A see-through square in the plane (point o, normal n), side `size` Å,
     as tiles, so it sorts correctly among the atoms. */
  function planeTiles(o, n, size, steps) {
    var u = G.unit(Math.abs(n[2]) < 0.9 ? G.cross(n, [0, 0, 1]) : G.cross(n, [1, 0, 0]));
    var v = G.cross(n, u);
    var out = [];
    for (var i = 0; i < steps; i++) for (var j = 0; j < steps; j++) {
      var a = (i / steps - 0.5) * size, b = ((i + 1) / steps - 0.5) * size;
      var c = (j / steps - 0.5) * size, d = ((j + 1) / steps - 0.5) * size;
      out.push([[a, c], [b, c], [b, d], [a, d]].map(function (q) { return G.add(o, G.add(G.mul(u, q[0]), G.mul(v, q[1]))); }));
    }
    return out;
  }

  Viewer.prototype.draw = function () {
    var ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    var n = this.objects.length;
    var spanX = n > 1 ? 4.1 : 2.15;
    var scale = Math.min(W / (spanX * this.radius), H / (2.15 * this.radius));
    var D = this.radius * 5;
    var cx = W / 2, cy = H / 2;
    var ink = cssVar('ink', '#12212e'), panel = cssVar('panel', '#ffffff');
    var accent = hex(cssVar('accent', '#0f5d8f')), crowd = hex(cssVar('crowd', '#d1382f'));
    var paneCol = hex(cssVar('mirror', '#7fb7d9'));
    var colors = {};
    function tintColor(t) { if (!colors[t]) colors[t] = hex(cssVar(t, '#888888')); return colors[t]; }
    var cam = this.cam;
    function project(w0) {
      var w = G.mvec(cam, w0);
      var k = D / (D - w[2]);
      return { x: cx + w[0] * scale * k, y: cy - w[1] * scale * k, z: w[2], k: k };
    }
    var items = [];
    var all = [];
    var self = this;
    this.objects.forEach(function (o, oi) {
      if (!o.model) return;
      var m = o.model, piv = m.pivot;
      var pts = m.atoms.map(function (a) {
        var w = G.add(o.offset, G.mvec(o.R, G.sub(a.p, piv)));
        var p = project(w);
        p.a = a; p.o = o; p.oi = oi; p.w = w;
        return p;
      });
      o.pts = pts;
      pts.forEach(function (p, i) { items.push({ type: 'atom', z: p.z, p: p, i: i }); });
      m.bonds.forEach(function (b) {
        items.push({ type: 'bond', z: (pts[b[0]].z + pts[b[1]].z) / 2 - 0.2, p: pts[b[0]], q: pts[b[1]], order: b[2], o: o });
      });
      if (o.plane) {
        planeTiles(o.plane.o, o.plane.n, o.plane.size || 3.4, 6).forEach(function (tile) {
          var ws = tile.map(function (q) { return G.add(o.offset, G.mvec(o.R, G.sub(q, piv))); });
          var z = ws.reduce(function (s, w) { return s + w[2]; }, 0) / 4;
          items.push({ type: 'tile', z: z, pts: ws.map(project), color: tintColor('plane') });
        });
      }
      all = all.concat(pts);
    });
    items.sort(function (p, q) { return p.z - q.z; });
    var letters = [];
    /* the mirror between two molecules is seen edge-on: a band of glass */
    if (this.pane && n > 1) {
      var bw = Math.max(6, scale * 0.12);
      var grd = ctx.createLinearGradient(cx - bw, 0, cx + bw, 0);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(0.5, paneCol);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = grd;
      ctx.fillRect(cx - bw, H * 0.1, bw * 2, H * 0.86);
      ctx.globalAlpha = 1;
    }

    items.forEach(function (it) {
      if (it.type === 'tile') {
        ctx.beginPath();
        it.pts.forEach(function (p, k) { if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); });
        ctx.closePath();
        ctx.globalAlpha = it.pane ? 0.18 : 0.22;
        ctx.fillStyle = it.color;
        ctx.fill();
        ctx.globalAlpha = 1;
        return;
      }
      var o = it.type === 'bond' ? it.o : it.p.o;
      ctx.globalAlpha = o.alpha;
      if (it.type === 'bond') {
        var p = it.p, q = it.q;
        var w = 0.15 * scale * (p.k + q.k) / 2;
        var mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
        var offs = it.order === 2 ? [-0.55, 0.55] : [0];
        var dx = q.x - p.x, dy = q.y - p.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
        var nx = -dy / l, ny = dx / l;
        offs.forEach(function (f) {
          var ox = nx * w * f * 1.6, oy = ny * w * f * 1.6;
          var lw = it.order === 2 ? w * 0.62 : w;
          ctx.lineCap = 'round';
          ctx.lineWidth = lw + 2;
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.beginPath(); ctx.moveTo(p.x + ox, p.y + oy); ctx.lineTo(q.x + ox, q.y + oy); ctx.stroke();
          ctx.lineWidth = lw;
          ctx.strokeStyle = shade(colorOf(p), -0.12);
          ctx.beginPath(); ctx.moveTo(p.x + ox, p.y + oy); ctx.lineTo(mx + ox, my + oy); ctx.stroke();
          ctx.strokeStyle = shade(colorOf(q), -0.12);
          ctx.beginPath(); ctx.moveTo(mx + ox, my + oy); ctx.lineTo(q.x + ox, q.y + oy); ctx.stroke();
        });
        ctx.globalAlpha = 1;
        return;
      }
      var at = it.p, e = ELEMENTS[at.a.el];
      var col = colorOf(at);
      var r = e.ball * (o.tint[at.a.i] ? 1.14 : 1) * scale * at.k;
      at.r = r;
      var gr = ctx.createRadialGradient(at.x - r * 0.35, at.y - r * 0.4, r * 0.1, at.x, at.y, r);
      gr.addColorStop(0, shade(col, 0.55));
      gr.addColorStop(0.55, col);
      gr.addColorStop(1, shade(col, -0.35));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(at.x, at.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = Math.max(1, scale * 0.02);
      ctx.strokeStyle = o.tint[at.a.i] ? shade(col, -0.4) : e.edge;
      ctx.stroke();
      if (o.glow.indexOf(at.a.i) >= 0) {
        ctx.lineWidth = Math.max(2.5, scale * 0.07);
        ctx.strokeStyle = crowd;
        ctx.beginPath(); ctx.arc(at.x, at.y, r + ctx.lineWidth / 2, 0, Math.PI * 2); ctx.stroke();
      }
      if (self.labels && at.a.el !== 'C' && at.a.el !== 'H' && o.alpha > 0.6) letters.push(at);
      ctx.globalAlpha = 1;
    });

    /* element letters last, so no bond is drawn across one */
    letters.forEach(function (at) {
      var fs = Math.max(10, Math.round(at.r * 0.95));
      ctx.font = '700 ' + fs + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.strokeText(at.a.el, at.x, at.y + 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(at.a.el, at.x, at.y + 1);
    });

    function colorOf(p) {
      var t = p.o.tint[p.a.i];
      return t ? tintColor(t) : ELEMENTS[p.a.el].color;
    }

    /* priority badges and the 1 → 2 → 3 arrow, always on top */
    this.objects.forEach(function (o) {
      if (!o.pts) return;
      var fs = Math.max(11, Math.round(scale * 0.24));
      Object.keys(o.badges).forEach(function (i) {
        var p = o.pts[i];
        if (!p) return;
        var cen = o.pts[o.model.atoms[i].parent != null ? o.model.atoms[i].parent : i];
        var dx = p.x - cen.x, dy = p.y - cen.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
        var off = (p.r || 8) + fs * 0.95;
        var bx = p.x + dx / l * off, by = p.y + dy / l * off;
        ctx.beginPath(); ctx.arc(bx, by, fs * 0.78, 0, Math.PI * 2);
        ctx.fillStyle = o.badges[i] === 4 ? cssVar('panel', '#ffffff') : accent;
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = accent;
        ctx.stroke();
        ctx.font = '700 ' + fs + 'px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = o.badges[i] === 4 ? accent : cssVar('on-accent', '#ffffff');
        ctx.fillText(String(o.badges[i]), bx, by + 1);
      });
      if (o.wheel) drawWheel(o, o.wheel.c, o.wheel.order);
    });

    function drawWheel(o, c, order) {
      var pc = o.pts[c];
      var ps = order.slice(0, 3).map(function (j) { return o.pts[j]; });
      var th = ps.map(function (p) { return Math.atan2(p.y - pc.y, p.x - pc.x); });
      var r = ps.reduce(function (s, p) { return s + Math.hypot(p.x - pc.x, p.y - pc.y); }, 0) / 3 * 0.62;
      var cr = (ps[1].x - ps[0].x) * (ps[2].y - ps[0].y) - (ps[1].y - ps[0].y) * (ps[2].x - ps[0].x);
      var sgn = cr > 0 ? 1 : -1;
      function step(a, b) { return (((b - a) * sgn) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); }
      var total = step(th[0], th[1]) + step(th[1], th[2]);
      var start = th[0] + sgn * 0.2, span = total - 0.5;
      ctx.lineWidth = Math.max(3, scale * 0.06);
      ctx.strokeStyle = accent;
      ctx.beginPath();
      for (var k = 0; k <= 60; k++) {
        var a = start + sgn * span * k / 60;
        var x = pc.x + r * Math.cos(a), y = pc.y + r * Math.sin(a);
        if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
      var ea = start + sgn * span;
      var tip = [pc.x + r * Math.cos(ea), pc.y + r * Math.sin(ea)];
      var tan = [-Math.sin(ea) * sgn, Math.cos(ea) * sgn], nrm = [Math.cos(ea), Math.sin(ea)];
      var hs = Math.max(8, scale * 0.16);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(tip[0] + tan[0] * hs, tip[1] + tan[1] * hs);
      ctx.lineTo(tip[0] + nrm[0] * hs * 0.6, tip[1] + nrm[1] * hs * 0.6);
      ctx.lineTo(tip[0] - nrm[0] * hs * 0.6, tip[1] - nrm[1] * hs * 0.6);
      ctx.closePath();
      ctx.fill();
    }
  };

  Viewer.MIRROR = MIRROR;
  Viewer.CAM = G.mmul(rotX(14 * Math.PI / 180), rotY(-22 * Math.PI / 180));
  Viewer.CAM_MIRROR = rotX(16 * Math.PI / 180);
  Viewer.reduceMotion = reduceMotion;
  return Viewer;
})();

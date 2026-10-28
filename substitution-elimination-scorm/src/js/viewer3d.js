/* viewer3d.js: a small ball-and-stick renderer on a 2D canvas.
 *
 * No WebGL and no library, as in the Newman, chairs and chirality
 * activities: a few dozen atoms sorted back to front draw at full frame
 * rate on a Chromebook and cannot fail to load in an LMS frame.
 *
 * The viewer draws a frame it is handed:
 *   { atoms: [{ p, el, alpha, glow, tint, label, r }],
 *     bonds: [{ a, b, order, partial, alpha }],     partial: drawn dashed
 *     lobes: [{ p, dir, len, alpha }],               a p orbital's two lobes
 *     tags:  [{ p, text, cls }] }                    text beside a point
 * and the student turns it by dragging or with the arrow keys. The reaction
 * animations (anim.js) compute every frame from the molecules' 3D models.
 */

var Viewer3D = (function () {
  'use strict';

  var G = GEOM;
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
    this.R = opts.R || G.ident();
    this.radius = opts.radius || 4;
    /* a wide scene (a nucleophile coming in from one side, the leaving
       group going out the other) fits its width and height separately */
    this.span = opts.span || null;
    this.center = opts.center || [0, 0, 0];
    this.frame = null;
    this.onTurn = opts.onTurn || null;
    this.ortho = !!opts.ortho;
    this.attach();
    this.resize();
  }

  Viewer.prototype.setFrame = function (f) { this.frame = f; this.draw(); };
  Viewer.prototype.setRotation = function (R) { this.R = R; this.draw(); };

  /* Turn smoothly to rotation R. */
  Viewer.prototype.turnTo = function (R, ms, done) {
    var self = this;
    if (this.anim) cancelAnimationFrame(this.anim);
    if (reduceMotion || !ms) { this.setRotation(R); if (done) done(); return; }
    var from = this.R, t0 = null;
    function step(ts) {
      if (t0 == null) t0 = ts;
      var t = Math.min(1, (ts - t0) / ms);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      self.setRotation(t < 1 ? G.between(from, R, e) : R);
      if (t < 1) self.anim = requestAnimationFrame(step); else { self.anim = null; if (done) done(); }
    }
    this.anim = requestAnimationFrame(step);
  };

  Viewer.prototype.attach = function () {
    var self = this, drag = null, c = this.canvas;
    c.addEventListener('pointerdown', function (ev) {
      drag = { x: ev.clientX, y: ev.clientY };
      if (self.anim) { cancelAnimationFrame(self.anim); self.anim = null; }
      try { c.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
      c.classList.add('grabbing');
    });
    c.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
      drag.x = ev.clientX; drag.y = ev.clientY;
      self.turnBy(G.mmul(rotX(dy * 0.012), rotY(dx * 0.012)));
    });
    function end() { drag = null; c.classList.remove('grabbing'); }
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('keydown', function (ev) {
      var k = ev.key, a = 12 * Math.PI / 180;
      var R = k === 'ArrowLeft' ? rotY(-a) : k === 'ArrowRight' ? rotY(a) : k === 'ArrowUp' ? rotX(-a) : k === 'ArrowDown' ? rotX(a) : null;
      if (!R) return;
      ev.preventDefault();
      self.turnBy(R);
    });
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(c);
  };

  Viewer.prototype.turnBy = function (R) {
    this.R = G.orthonormal(G.mmul(R, this.R));
    this.draw();
    if (this.onTurn) this.onTurn();
  };

  Viewer.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    var w = Math.max(10, Math.round(r.width * dpr)), h = Math.max(10, Math.round(r.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.draw();
  };

  Viewer.prototype.draw = function () {
    var f = this.frame, ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    if (!f) return;
    var scale = this.span ? Math.min(W / (2.1 * this.span[0]), H / (2.1 * this.span[1])) : Math.min(W, H) / (2.1 * this.radius);
    var D = this.radius * 6;
    var cx = W / 2, cy = H / 2;
    var R = this.R, C = this.center, ortho = this.ortho;
    var ink = cssVar('ink', '#12212e'), accent = hex(cssVar('accent', '#0f5d8f')), crowd = hex(cssVar('crowd', '#d1382f'));
    var lobeCol = hex(cssVar('lobe', '#6aa8d4'));
    function project(w0) {
      var w = G.mvec(R, G.sub(w0, C));
      var k = ortho ? 1 : D / (D - w[2]);
      return { x: cx + w[0] * scale * k, y: cy - w[1] * scale * k, z: w[2], k: k };
    }
    var pts = f.atoms.map(function (a) { var p = project(a.p); p.a = a; return p; });
    var items = [];
    pts.forEach(function (p, i) { items.push({ type: 'atom', z: p.z, p: p, i: i }); });
    (f.bonds || []).forEach(function (b) {
      if (!pts[b.a] || !pts[b.b]) return;
      items.push({ type: 'bond', z: (pts[b.a].z + pts[b.b].z) / 2 - 0.2, p: pts[b.a], q: pts[b.b], b: b });
    });
    (f.lobes || []).forEach(function (l) {
      [1, -1].forEach(function (s) {
        var tip = G.add(l.p, G.mul(G.unit(l.dir), s * l.len));
        var mid = G.add(l.p, G.mul(G.unit(l.dir), s * l.len * 0.5));
        items.push({ type: 'lobe', z: project(mid).z, base: project(l.p), tip: project(tip), mid: project(mid), l: l, s: s });
      });
    });
    items.sort(function (p, q) { return p.z - q.z; });
    var letters = [];
    items.forEach(function (it) {
      if (it.type === 'lobe') {
        var dx = it.tip.x - it.base.x, dy = it.tip.y - it.base.y, L = Math.hypot(dx, dy);
        var w = (it.l.w || 0.42) * scale * it.mid.k;
        ctx.save();
        ctx.globalAlpha = (it.l.alpha == null ? 0.5 : it.l.alpha) * (it.s > 0 ? 1 : 0.8);
        ctx.translate((it.base.x + it.tip.x) / 2, (it.base.y + it.tip.y) / 2);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(2, L / 2), Math.max(2, w), 0, 0, Math.PI * 2);
        ctx.fillStyle = it.s > 0 ? lobeCol : shade(lobeCol, -0.25);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = shade(lobeCol, -0.45);
        ctx.stroke();
        ctx.restore();
        return;
      }
      if (it.type === 'bond') {
        var p = it.p, q = it.q, b = it.b;
        var alpha = Math.min(p.a.alpha == null ? 1 : p.a.alpha, q.a.alpha == null ? 1 : q.a.alpha, b.alpha == null ? 1 : b.alpha);
        if (alpha <= 0.02) return;
        ctx.globalAlpha = alpha;
        var lw = 0.15 * scale * (p.k + q.k) / 2;
        var ddx = q.x - p.x, ddy = q.y - p.y, l2 = Math.hypot(ddx, ddy) || 1;
        var nx = -ddy / l2, ny = ddx / l2;
        var offs = b.order === 2 ? [-0.55, 0.55] : b.order === 3 ? [-1, 0, 1] : [0];
        offs.forEach(function (o) {
          var ox = nx * lw * o * 1.6, oy = ny * lw * o * 1.6;
          var w2 = b.order >= 2 ? lw * 0.6 : lw;
          ctx.lineCap = 'round';
          if (b.partial) ctx.setLineDash([lw * 0.9, lw * 1.1]);
          ctx.lineWidth = w2 + 2;
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath(); ctx.moveTo(p.x + ox, p.y + oy); ctx.lineTo(q.x + ox, q.y + oy); ctx.stroke();
          ctx.lineWidth = w2;
          var mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
          ctx.strokeStyle = shade(colorOf(p.a), -0.12);
          ctx.beginPath(); ctx.moveTo(p.x + ox, p.y + oy); ctx.lineTo(mx + ox, my + oy); ctx.stroke();
          ctx.strokeStyle = shade(colorOf(q.a), -0.12);
          ctx.beginPath(); ctx.moveTo(mx + ox, my + oy); ctx.lineTo(q.x + ox, q.y + oy); ctx.stroke();
          ctx.setLineDash([]);
        });
        ctx.globalAlpha = 1;
        return;
      }
      var at = it.p, a = at.a, e = ELEMENTS[a.el] || ELEMENTS.C;
      var al = a.alpha == null ? 1 : a.alpha;
      if (al <= 0.02) return;
      ctx.globalAlpha = al;
      var col = colorOf(a);
      var r = (a.r || e.ball) * scale * at.k;
      at.r = r;
      var gr = ctx.createRadialGradient(at.x - r * 0.35, at.y - r * 0.4, r * 0.1, at.x, at.y, r);
      gr.addColorStop(0, shade(col, 0.55));
      gr.addColorStop(0.55, col);
      gr.addColorStop(1, shade(col, -0.35));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(at.x, at.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = Math.max(1, scale * 0.02);
      ctx.strokeStyle = e.edge;
      ctx.stroke();
      if (a.glow) {
        ctx.lineWidth = Math.max(2.5, scale * 0.07);
        ctx.strokeStyle = a.glow === 'good' ? hex(cssVar('good', '#0f7a52')) : a.glow === 'accent' ? accent : crowd;
        ctx.beginPath(); ctx.arc(at.x, at.y, r + ctx.lineWidth / 2, 0, Math.PI * 2); ctx.stroke();
      }
      if (a.el !== 'C' && a.el !== 'H' && al > 0.6) letters.push(at);
      ctx.globalAlpha = 1;
    });
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
    (f.tags || []).forEach(function (t) {
      var p = project(t.p);
      var fs = Math.max(11, Math.round(scale * 0.3));
      ctx.font = '700 ' + fs + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = cssVar('panel', '#ffffff');
      ctx.strokeText(t.text, p.x, p.y);
      ctx.fillStyle = t.cls === 'bad' ? crowd : t.cls === 'accent' ? accent : ink;
      ctx.fillText(t.text, p.x, p.y);
    });
    function colorOf(a) { return a.tint ? hex(cssVar(a.tint, '#888888')) : (ELEMENTS[a.el] || ELEMENTS.C).color; }
  };

  Viewer.reduceMotion = reduceMotion;
  Viewer.rotX = rotX;
  Viewer.rotY = rotY;
  return Viewer;
})();

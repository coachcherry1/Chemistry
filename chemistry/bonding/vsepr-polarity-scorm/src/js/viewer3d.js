/* viewer3d.js: a small ball-and-stick renderer on a 2D canvas.
 *
 * No WebGL and no library: a dozen atoms sorted back to front is easy for a
 * Chromebook, and it cannot fail to load inside a locked-down LMS iframe.
 *
 * It draws a model from vsepr.js: atoms, bonds (single, double, triple),
 * lone pairs as fat lobes on the central atom (a lone pair is held by one
 * nucleus, so it spreads wider than a bond), and angle arcs with their
 * labels. In the charge view every atom is tinted by its partial charge (δ−
 * red, δ+ blue) and two markers show the centre of negative charge and the
 * centre of positive charge.
 *
 * Drag to turn it; with the keyboard, Tab to the canvas and use the arrow
 * keys (Home goes back to the starting view). spread() plays the move from
 * the flat Lewis drawing (seen straight on) to the 3D molecule.
 */

var Viewer3D = (function () {
  'use strict';

  var V = VSEPR.V;

  var COLOR = { H: '#e9eef2', Be: '#a3d16b', B: '#eda070', C: '#505c66', N: '#3d6fd8', O: '#d6392f', F: '#86c84a',
                P: '#e8862c', S: '#e2c23a', Cl: '#2ea84f', Br: '#9a3326', I: '#7d3fa1', Xe: '#3fb6c4' };
  var EDGE = { H: '#8a99a6' };
  var BALL = { H: 0.24, Be: 0.36, B: 0.36, C: 0.36, N: 0.35, O: 0.34, F: 0.32, P: 0.44, S: 0.44, Cl: 0.44,
               Br: 0.48, I: 0.52, Xe: 0.52 };

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
  function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; }
  function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }
  var IDENT = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  /* turned enough that depth reads at once, not so far that the Lewis
     drawing it came from is lost */
  var START = matMul(rotX(0.22), rotY(-0.4));

  function toQuat(m) {
    var t = m[0][0] + m[1][1] + m[2][2], q, s;
    if (t > 0) { s = Math.sqrt(t + 1) * 2; q = [0.25 * s, (m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s]; }
    else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
      s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2;
      q = [(m[2][1] - m[1][2]) / s, 0.25 * s, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s];
    } else if (m[1][1] > m[2][2]) {
      s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2;
      q = [(m[0][2] - m[2][0]) / s, (m[0][1] + m[1][0]) / s, 0.25 * s, (m[1][2] + m[2][1]) / s];
    } else {
      s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;
      q = [(m[1][0] - m[0][1]) / s, (m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, 0.25 * s];
    }
    return q;
  }
  function fromQuat(q) {
    var w = q[0], x = q[1], y = q[2], z = q[3];
    return [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]];
  }
  function qslerp(a, b, t) {
    var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = b.map(function (v) { return -v; }); d = -d; }
    if (d > 0.9995) {
      var r = a.map(function (v, i) { return v + (b[i] - v) * t; });
      var l = Math.sqrt(r.reduce(function (s, v) { return s + v * v; }, 0));
      return r.map(function (v) { return v / l; });
    }
    var th = Math.acos(d), s = Math.sin(th);
    return a.map(function (v, i) { return v * Math.sin((1 - t) * th) / s + b[i] * Math.sin(t * th) / s; });
  }

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
  function mix(a, b, t) {
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    var r = Math.round(((x >> 16) & 255) * (1 - t) + ((y >> 16) & 255) * t);
    var g = Math.round(((x >> 8) & 255) * (1 - t) + ((y >> 8) & 255) * t);
    var bl = Math.round((x & 255) * (1 - t) + (y & 255) * t);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }
  function hex(c, f) { return /^#[0-9a-f]{6}$/i.test(c) ? c : f; }

  /* opts: model, flat (start looking straight on), charges, lp (default true),
     arcs (default true), centres, label (text for screen readers) */
  function Viewer(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.model = opts.model || { atoms: [], bonds: [], lps: [], arcs: [] };
    this.R = opts.flat ? IDENT : START;
    this.showCharges = !!opts.charges;
    this.showLP = opts.lp !== false;
    this.showArcs = opts.arcs !== false;
    this.showCentres = !!opts.centres;
    this.anim = null;
    this.radius = 2.2;
    this.fit(this.model);
    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute('role', 'img');
    this.attach();
    this.resize();
  }

  Viewer.prototype.fit = function (m) {
    var r = 1.6;
    m.atoms.forEach(function (a) { r = Math.max(r, V.len(a.p) + (BALL[a.el] || 0.4)); });
    if (m.lps.length) r = Math.max(r, 1.45);
    this.radius = r;
  };

  Viewer.prototype.setModel = function (m, keepView) {
    if (this.anim) { cancelAnimationFrame(this.anim); this.anim = null; }
    this.model = m;
    this.fit(m);
    if (!keepView) this.R = m.flat ? IDENT : START;
    this.draw();
  };
  Viewer.prototype.setCharges = function (on) { this.showCharges = !!on; this.draw(); };
  Viewer.prototype.setLP = function (on) { this.showLP = !!on; this.draw(); };
  Viewer.prototype.setArcs = function (on) { this.showArcs = !!on; this.draw(); };
  Viewer.prototype.setCentres = function (on) { this.showCentres = !!on; this.draw(); };
  Viewer.prototype.reset = function () { this.turnTo(this.model.flat ? IDENT : START); };

  Viewer.prototype.turnTo = function (target, ms) {
    var self = this;
    if (this.anim) cancelAnimationFrame(this.anim);
    if (reduceMotion) { this.R = target; this.draw(); return; }
    var qa = toQuat(this.R), qb = toQuat(target), t0 = null;
    function step(ts) {
      if (t0 == null) t0 = ts;
      var t = Math.min(1, (ts - t0) / (ms || 600));
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      self.R = fromQuat(qslerp(qa, qb, e));
      self.draw();
      if (t < 1) self.anim = requestAnimationFrame(step); else { self.anim = null; self.R = target; self.draw(); }
    }
    this.anim = requestAnimationFrame(step);
  };

  /* From the flat Lewis drawing to the molecule: the domains swing apart
     while the view turns from straight on to the 3D view. */
  Viewer.prototype.spread = function (flat, solid, done) {
    var self = this;
    if (this.anim) cancelAnimationFrame(this.anim);
    this.fit(solid);
    if (reduceMotion) {
      this.model = solid; this.R = START; this.draw();
      if (done) done();
      return;
    }
    var qa = toQuat(IDENT), qb = toQuat(START), t0 = null, MS = 1800;
    this.R = IDENT;
    function step(ts) {
      if (t0 == null) t0 = ts;
      var t = Math.min(1, (ts - t0) / MS);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      self.model = VSEPR.morph(flat, solid, e);
      self.R = fromQuat(qslerp(qa, qb, Math.min(1, e * 1.15)));
      self.draw();
      if (t < 1) { self.anim = requestAnimationFrame(step); return; }
      self.anim = null;
      self.model = solid;
      self.R = START;
      self.draw();
      if (done) done();
    }
    this.anim = requestAnimationFrame(step);
  };

  Viewer.prototype.attach = function () {
    var self = this, drag = null;
    var c = this.canvas;
    c.addEventListener('pointerdown', function (ev) {
      drag = { x: ev.clientX, y: ev.clientY };
      try { c.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
      if (self.anim) { cancelAnimationFrame(self.anim); self.anim = null; }
      c.classList.add('grabbing');
    });
    c.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
      drag.x = ev.clientX; drag.y = ev.clientY;
      self.R = orthonormal(matMul(rotX(dy * 0.01), matMul(rotY(dx * 0.01), self.R)));
      self.draw();
    });
    function end() { drag = null; c.classList.remove('grabbing'); }
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('keydown', function (ev) {
      var a = 0.17, m = null;
      if (ev.key === 'ArrowLeft') m = rotY(-a);
      else if (ev.key === 'ArrowRight') m = rotY(a);
      else if (ev.key === 'ArrowUp') m = rotX(-a);
      else if (ev.key === 'ArrowDown') m = rotX(a);
      else if (ev.key === 'Home') { ev.preventDefault(); self.reset(); return; }
      if (!m) return;
      ev.preventDefault();
      if (self.anim) { cancelAnimationFrame(self.anim); self.anim = null; }
      self.R = orthonormal(matMul(m, self.R));
      self.draw();
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

  Viewer.prototype.destroy = function () { if (this.anim) cancelAnimationFrame(this.anim); this.anim = null; };

  Viewer.prototype.draw = function () {
    var ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    var m = this.model, R = this.R;
    var dpr = window.devicePixelRatio || 1;
    var scale = Math.min(W, H) / (2.05 * this.radius);
    var D = this.radius * 4;
    var cx = W / 2, cy = H / 2;
    var ink = cssVar('ink', '#12212e'), panel = hex(cssVar('panel', '#ffffff'), '#ffffff');
    var neg = hex(cssVar('dneg', '#d1382f'), '#d1382f'), pos = hex(cssVar('dpos', '#2f62cc'), '#2f62cc');
    var lpCol = hex(cssVar('lobe', '#a879c4'), '#a879c4'), arcCol = cssVar('accent', '#0f5d8f');
    var neutral = hex(cssVar('neutral', '#b9c4cd'), '#b9c4cd');
    var q = this.showCharges ? VSEPR.charges(m) : null;
    var qmax = q ? Math.max.apply(null, q.map(Math.abs).concat([0.5])) : 1;

    function proj(p) {
      var x = V.dot(R[0], p), y = V.dot(R[1], p), z = V.dot(R[2], p);
      var k = D / (D - z);
      return { x: cx + x * scale * k, y: cy - y * scale * k, z: z, k: k };
    }
    function colorOf(i) {
      var a = m.atoms[i];
      if (!q) return COLOR[a.el] || '#888888';
      var t = Math.min(1, Math.abs(q[i]) / qmax);
      if (Math.abs(q[i]) < 0.05) return neutral;
      return mix(neutral, q[i] < 0 ? neg : pos, 0.35 + 0.65 * t);
    }

    var pts = m.atoms.map(function (a) { return proj(a.p); });
    var items = pts.map(function (p, i) { return { type: 'atom', z: p.z, i: i }; });
    /* a bond goes behind both its atoms: its ends are hidden inside them */
    m.bonds.forEach(function (b) { items.push({ type: 'bond', z: Math.min(pts[b[0]].z, pts[b[1]].z) - 0.01, b: b }); });
    if (this.showLP) {
      m.lps.forEach(function (l) {
        var c = V.mul(l.dir, 0.86);
        items.push({ type: 'lp', z: proj(c).z, l: l });
      });
    }
    items.sort(function (a, b) { return a.z - b.z; });

    items.forEach(function (it) {
      if (it.type === 'bond') {
        var p = pts[it.b[0]], r = pts[it.b[1]], order = it.b[2];
        var w = Math.max(2, 0.11 * scale * (p.k + r.k) / 2);
        var dx = r.x - p.x, dy = r.y - p.y, L = Math.sqrt(dx * dx + dy * dy) || 1;
        var nx = -dy / L, ny = dx / L;
        var offs = order === 1 ? [0] : order === 2 ? [-0.75, 0.75] : [-1.4, 0, 1.4];
        var thin = order === 1 ? w : w * 0.62;
        offs.forEach(function (o) {
          var ox = nx * o * thin * 1.25, oy = ny * o * thin * 1.25;
          ctx.lineCap = 'round';
          ctx.lineWidth = thin + 2 * dpr;
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.beginPath(); ctx.moveTo(p.x + ox, p.y + oy); ctx.lineTo(r.x + ox, r.y + oy); ctx.stroke();
          ctx.lineWidth = thin;
          ctx.strokeStyle = shade(colorOf(it.b[0]), -0.1);
          ctx.beginPath(); ctx.moveTo(p.x + ox, p.y + oy); ctx.lineTo((p.x + r.x) / 2 + ox, (p.y + r.y) / 2 + oy); ctx.stroke();
          ctx.strokeStyle = shade(colorOf(it.b[1]), -0.1);
          ctx.beginPath(); ctx.moveTo((p.x + r.x) / 2 + ox, (p.y + r.y) / 2 + oy); ctx.lineTo(r.x + ox, r.y + oy); ctx.stroke();
        });
        return;
      }
      if (it.type === 'lp') {
        /* a spheroid along the lone pair's direction, projected: one axis
           stays its width, the other shortens as it turns toward the viewer */
        var u = it.l.dir, A = 0.58, B = 0.4, c3 = V.mul(u, 0.86);
        var pc = proj(c3);
        var ux = V.dot(R[0], u), uy = V.dot(R[1], u), uz = V.dot(R[2], u);
        var major = Math.sqrt(A * A * (1 - uz * uz) + B * B * uz * uz) * scale * pc.k;
        var minor = B * scale * pc.k;
        var ang = Math.atan2(-uy, ux);
        ctx.save();
        ctx.translate(pc.x, pc.y);
        ctx.rotate(ang);
        var gr = ctx.createRadialGradient(-major * 0.3, -minor * 0.3, minor * 0.1, 0, 0, major);
        gr.addColorStop(0, shade(lpCol, 0.45));
        gr.addColorStop(1, lpCol);
        ctx.globalAlpha = 0.62;
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.ellipse(0, 0, major, minor, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = Math.max(1, dpr);
        ctx.strokeStyle = shade(lpCol, -0.3);
        ctx.stroke();
        ctx.fillStyle = ink;
        var dr = Math.max(2.2 * dpr, scale * 0.045);
        [-1, 1].forEach(function (sgn) {
          ctx.beginPath(); ctx.arc(major * 0.15, sgn * minor * 0.35, dr, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
        return;
      }
      var at = pts[it.i], a = m.atoms[it.i];
      var col = colorOf(it.i);
      var rad = (BALL[a.el] || 0.4) * scale * at.k;
      at.r = rad;
      var g2 = ctx.createRadialGradient(at.x - rad * 0.35, at.y - rad * 0.4, rad * 0.1, at.x, at.y, rad);
      g2.addColorStop(0, shade(col, 0.55));
      g2.addColorStop(0.55, col);
      g2.addColorStop(1, shade(col, -0.35));
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(at.x, at.y, rad, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = Math.max(1, scale * 0.02);
      ctx.strokeStyle = EDGE[a.el] || shade(col, -0.45);
      ctx.stroke();
      /* the symbol, so colour is never the only signal */
      var fs = Math.max(10 * dpr, Math.round(rad * 0.95));
      ctx.font = '700 ' + fs + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var light = a.el === 'H' || (q && Math.abs(q[it.i]) < 0.05) || a.el === 'F' || a.el === 'S' || a.el === 'Be';
      ctx.fillStyle = light ? '#12212e' : '#ffffff';
      ctx.fillText(a.el, at.x, at.y + fs * 0.04);
      if (q && Math.abs(q[it.i]) >= 0.05) {
        var tag = q[it.i] < 0 ? 'δ−' : 'δ+';
        var fs2 = Math.max(11 * dpr, Math.round(scale * 0.22));
        ctx.font = '700 ' + fs2 + 'px system-ui, sans-serif';
        var tx = at.x + rad * 0.85, ty = at.y - rad * 0.85;
        ctx.lineWidth = 4 * dpr;
        ctx.strokeStyle = panel;
        ctx.strokeText(tag, tx, ty);
        ctx.fillStyle = q[it.i] < 0 ? neg : pos;
        ctx.fillText(tag, tx, ty);
      }
    });

    /* the central atom's symbol again, so a lone pair in front never hides it */
    if (pts.length && pts[0].r) {
      var a0 = m.atoms[0], fsc = Math.max(10 * dpr, Math.round(pts[0].r * 0.95));
      ctx.font = '700 ' + fsc + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.strokeText(a0.el, pts[0].x, pts[0].y + fsc * 0.04);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(a0.el, pts[0].x, pts[0].y + fsc * 0.04);
    }

    /* angle arcs, on top so their labels can be read: in each group of equal
       angles, the pair of bonds that looks most open from here */
    if (this.showArcs && m.arcs && m.arcs.length) {
      var fs3 = Math.max(12 * dpr, Math.round(scale * 0.24));
      var bestOf = {};
      m.arcs.forEach(function (arc) {
        /* how far the middle of the arc sits from the central atom on screen:
           an arc that bulges toward the student hides behind the atom */
        var ua0 = V.unit(m.atoms[arc.i].p), ub0 = V.unit(m.atoms[arc.j].p);
        var pm = proj(VSEPR.slerp(ua0, ub0, 0.5)), p0 = proj([0, 0, 0]);
        var pa = pts[arc.i], pb = pts[arc.j];
        var open = Math.hypot(pm.x - p0.x, pm.y - p0.y) + 0.25 * Math.hypot(pa.x - pb.x, pa.y - pb.y);
        if (!bestOf[arc.group] || open > bestOf[arc.group].open) bestOf[arc.group] = { arc: arc, open: open };
      });
      Object.keys(bestOf).map(function (k) { return bestOf[k].arc; }).forEach(function (arc) {
        var ua = V.unit(m.atoms[arc.i].p), ub = V.unit(m.atoms[arc.j].p);
        var rr = Math.max(0.62 * Math.min(V.len(m.atoms[arc.i].p), V.len(m.atoms[arc.j].p)), (BALL[m.atoms[0].el] || 0.4) + 0.24);
        ctx.lineWidth = Math.max(2, 2 * dpr);
        ctx.strokeStyle = arcCol;
        ctx.setLineDash([]);
        ctx.beginPath();
        for (var k = 0; k <= 24; k++) {
          var pp = proj(V.mul(VSEPR.slerp(ua, ub, k / 24), rr));
          if (k) ctx.lineTo(pp.x, pp.y); else ctx.moveTo(pp.x, pp.y);
        }
        ctx.stroke();
        var mid3 = proj(V.mul(VSEPR.slerp(ua, ub, 0.5), rr));
        /* the label sits just outside the arc, pushed away from the central atom on screen */
        var c0 = pts[0], ddx = mid3.x - c0.x, ddy = mid3.y - c0.y, dl = Math.hypot(ddx, ddy) || 1;
        var push = fs3 * 1.3;
        var mid = { x: mid3.x + ddx / dl * push, y: mid3.y + ddy / dl * push };
        ctx.font = '700 ' + fs3 + 'px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var tw = ctx.measureText(arc.label).width;
        ctx.fillStyle = panel;
        ctx.globalAlpha = 0.9;
        ctx.fillRect(mid.x - tw / 2 - 4 * dpr, mid.y - fs3 / 2 - 3 * dpr, tw + 8 * dpr, fs3 + 6 * dpr);
        ctx.globalAlpha = 1;
        ctx.fillStyle = arcCol;
        ctx.fillText(arc.label, mid.x, mid.y);
      });
    }

    /* the two charge centres */
    if (q && this.showCentres) {
      var cc = VSEPR.centres(m, q);
      var pp1 = proj(cc.pos), pn = proj(cc.neg);
      var rad2 = Math.max(9 * dpr, scale * 0.16);
      var same = cc.gap <= VSEPR.POLAR_GAP;
      function marker(p, col, sign, dxl) {
        ctx.lineWidth = 3 * dpr;
        ctx.fillStyle = panel;
        ctx.strokeStyle = col;
        ctx.beginPath(); ctx.arc(p.x + dxl, p.y, rad2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = col;
        ctx.font = '800 ' + Math.round(rad2 * 1.5) + 'px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sign, p.x + dxl, p.y + rad2 * 0.05);
      }
      if (same) {
        marker(pp1, pos, '+', -rad2 * 0.75);
        marker(pn, neg, '−', rad2 * 0.75);
      } else {
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.lineWidth = 2 * dpr;
        ctx.strokeStyle = ink;
        ctx.beginPath(); ctx.moveTo(pp1.x, pp1.y); ctx.lineTo(pn.x, pn.y); ctx.stroke();
        ctx.setLineDash([]);
        marker(pp1, pos, '+', 0);
        marker(pn, neg, '−', 0);
      }
    }
  };

  Viewer.START = START;
  Viewer.COLOR = COLOR;
  return Viewer;
})();

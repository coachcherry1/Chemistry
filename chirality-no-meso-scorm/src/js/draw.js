/* draw.js: the 2D drawings.
 *
 * A wedge/dash drawing here is not hand-placed: it is the 3D model
 * (molecules.js) seen from the front, as the reader of the page sees it.
 * Each bond is drawn plain, as a wedge or as a dash from where it really
 * points (stereo.js, bondStyle), so a turned or reflected model draws itself
 * correctly and the drawing can never disagree with the 3D model beside it.
 * Two things are adjusted for legibility, as in any textbook:
 *   - every bond to a group is drawn the same length;
 *   - a wedge and a dash that point the same way in projection are fanned
 *     apart, the wedge to the left, as in the Newman activity's drawings.
 * Neither changes which way 1 → 2 → 3 runs; tools/validate.js checks that
 * reading R or S off every drawing gives the model's answer.
 *
 * Also here: the empty template students build on, flat ring drawings (as
 * in the chairs activity), and a Newman projection down C2–C3.
 *
 * Everything is SVG, so it stays sharp at any size and every part a student
 * can act on is a real, focusable element.
 */

var Draw = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var RAD = Math.PI / 180;
  var G = GEOM;
  var S = 62;           /* px per ångström along the zigzag */
  var BOND = 58;        /* drawn length of a bond to a group, px */
  var SPREAD = 30;      /* degrees a wedge and dash sharing one direction are fanned apart */

  function el(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  function svg(cls, label) {
    var s = el('svg', { viewBox: '0 0 10 10', class: cls || '', role: 'img' });
    if (label) s.setAttribute('aria-label', label);
    return s;
  }

  function fit(s, pts, pad, scale) {
    pad = pad == null ? 10 : pad;
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs) - pad, x1 = Math.max.apply(null, xs) + pad;
    var y0 = Math.min.apply(null, ys) - pad, y1 = Math.max.apply(null, ys) + pad;
    s.setAttribute('viewBox', [x0, y0, x1 - x0, y1 - y0].map(function (v) { return v.toFixed(1); }).join(' '));
    if (scale) {
      s.setAttribute('width', Math.round((x1 - x0) * scale));
      s.setAttribute('height', Math.round((y1 - y0) * scale));
    }
    return { w: x1 - x0, h: y1 - y0 };
  }

  /* Rough width of a label in px at the drawings' 16px font (subscripts are
     narrower). */
  function textW(t) {
    var w = 2;
    for (var i = 0; i < t.length; i++) {
      var ch = t[i];
      w += /[₀-₉]/.test(ch) ? 6.6 : /[()]/.test(ch) ? 6 : ch === '=' ? 9.5 : /[A-Z]/.test(ch) ? 11.6 : 8.8;
    }
    return w;
  }

  function anchorFor(dx) { return dx > 0.35 ? 'start' : dx < -0.35 ? 'end' : 'middle'; }

  /* Plain words for a direction on the page (x right, y down). */
  function where(d) {
    var a = Math.atan2(-d[1], d[0]) / RAD;            /* counterclockwise from right */
    a = (a + 360) % 360;
    var names = ['right', 'upper right', 'top', 'upper left', 'left', 'lower left', 'bottom', 'lower right'];
    return names[Math.round(a / 45) % 8];
  }

  /* ------------------------------------------------- laying out a model */

  function proj(p) { return [p[0] * S, -p[1] * S]; }
  function dir2(from, to) {
    var v = G.sub(to, from), l = Math.sqrt(v[0] * v[0] + v[1] * v[1]) || 1;
    return [v[0] / l, -v[1] / l];
  }
  function rotate2(d, deg) {
    var a = deg * RAD, c = Math.cos(a), s = Math.sin(a);
    /* screen coordinates (y down): positive deg turns clockwise on screen */
    return [d[0] * c - d[1] * s, d[0] * s + d[1] * c];
  }
  function ang2(d) { return Math.atan2(d[1], d[0]) / RAD; }

  /* Fan apart each wedge and dash that share a direction: the wedge to the
     left (or, for a sideways pair, lower), the dash to the other side. */
  function splay(bonds, wedgeRight) {
    for (var i = 0; i < bonds.length; i++) for (var j = i + 1; j < bonds.length; j++) {
      var a = bonds[i], b = bonds[j];
      if (a.style === 'plain' || b.style === 'plain' || a.style === b.style) continue;
      var gap = Math.abs(((ang2(a.d) - ang2(b.d) + 540) % 360) - 180);
      if (gap > 25) continue;
      var w = a.style === 'wedge' ? a : b, dsh = w === a ? b : a;
      var mid = [(w.d[0] + dsh.d[0]) / 2, (w.d[1] + dsh.d[1]) / 2];
      var l = Math.sqrt(mid[0] * mid[0] + mid[1] * mid[1]) || 1;
      mid = [mid[0] / l, mid[1] / l];
      var plus = rotate2(mid, SPREAD), minus = rotate2(mid, -SPREAD);
      var vertical = Math.abs(mid[1]) >= Math.abs(mid[0]);
      var plusIsWedge = vertical ? plus[0] < minus[0] : plus[1] > minus[1];
      if (wedgeRight) plusIsWedge = !plusIsWedge;
      w.d = plusIsWedge ? plus : minus;
      dsh.d = plusIsWedge ? minus : plus;
    }
  }

  /* Fan apart two plain bonds that share a direction (a carbon with two
     groups drawn without wedges, such as the C(CH₃)₂ of 2,2-dimethylbutane). */
  function splayPlain(bonds) {
    for (var i = 0; i < bonds.length; i++) for (var j = i + 1; j < bonds.length; j++) {
      var a = bonds[i], b = bonds[j];
      if (!a.forcePlain || !b.forcePlain) continue;
      var mid = [(a.d[0] + b.d[0]) / 2, (a.d[1] + b.d[1]) / 2];
      var l = Math.sqrt(mid[0] * mid[0] + mid[1] * mid[1]) || 1;
      mid = [mid[0] / l, mid[1] / l];
      a.d = rotate2(mid, 35); b.d = rotate2(mid, -35);
    }
  }

  function groupLabel(m, i, d) {
    var a = m.atoms[i];
    var g = GROUPS[a.group];
    if (!g) return a.el;
    return d[0] < -0.35 && g.left ? g.left : g.label;
  }

  /* Is this H drawn? Only when the drawing names it. */
  function hShown(m, a, opts) {
    if (a.el !== 'H') return true;
    if (opts.showH === 'all') return true;
    if (opts.showH === 'none') return false;
    if (m.kind === 'centre') return true;
    var sub = (m.spec.chain.subs || {})[m.atoms[a.owner].num] || {};
    return sub[a.slot] === 'H' || (opts.showH && opts.showH.indexOf(m.atoms[a.owner].num) >= 0);
  }

  /* Everything needed to draw a centre or chain model: vertices, bonds,
     labels, in screen coordinates. */
  function layout(m, opts) {
    opts = opts || {};
    var out = { verts: {}, bonds: [], groups: {}, ends: {} };
    var labelAll = opts.style === 'labels' || (opts.style !== 'skeletal' && (m.kind === 'centre' || !!m.spec.chain.ends));
    var origin = m.kind === 'centre' ? m.atoms[m.centre].p : [0, 0, 0];
    function P(p) { return proj(G.sub(p, origin)); }
    var vertices = m.kind === 'centre' ? [m.centre] : m.backbone.slice();
    vertices.forEach(function (i) { out.verts[i] = P(m.atoms[i].p); });
    if (m.kind === 'chain') {
      for (var k = 0; k + 1 < m.backbone.length; k++) {
        out.bonds.push({ a: m.backbone[k], b: m.backbone[k + 1], style: 'plain', chain: true,
          from: out.verts[m.backbone[k]], to: out.verts[m.backbone[k + 1]] });
      }
    }
    var nb = MOLECULES.neighbours(m);
    vertices.forEach(function (v) {
      var here = [];
      nb[v].forEach(function (x) {
        var a = m.atoms[x.j];
        if (a.backbone) return;
        if (!a.head || !hShown(m, a, opts)) return;
        var style = a.plain ? 'plain' : (a.end != null || a.terminal) ? 'plain' : STEREO.bondStyle(m.atoms[v].p, a.p);
        here.push({ a: v, b: x.j, style: style, d: dir2(m.atoms[v].p, a.p), forcePlain: !!a.plain,
                    end: a.end != null, terminal: !!a.terminal });
      });
      /* wedgeOut: each wedge fanned away from the middle of the molecule, so a
         drawing with a mirror plane looks mirror-symmetric */
      var right = opts.wedgeOut ? out.verts[v][0] > P(m.pivot)[0] : opts.wedgeRight;
      splay(here, right);
      splayPlain(here);
      here.forEach(function (b) {
        var a = m.atoms[b.b];
        var labelled = labelAll || a.el !== 'C';
        if (a.terminal && !labelled) return;                       /* a CH₃ end is just the line */
        var len = b.end ? 1.54 * S * 0.82 : BOND;
        b.from = out.verts[v];
        b.to = [b.from[0] + b.d[0] * len, b.from[1] + b.d[1] * len];
        b.labelled = labelled;
        out.bonds.push(b);
        out.groups[b.b] = b;
        if (labelled) {
          b.text = a.group ? groupLabel(m, b.b, b.d) : a.el;
          b.tone = toneOf(a.el);
          b.anchor = anchorFor(b.d[0]);
          b.lx = b.to[0] + b.d[0] * 4;
          b.ly = b.to[1] + b.d[1] * (b.anchor === 'middle' ? 12 : 5);
        }
      });
    });
    /* the CH₃ ends of a bond-line zigzag are its last vertices */
    if (m.kind === 'chain') {
      [m.backbone[0], m.backbone[m.backbone.length - 1]].forEach(function (i) {
        if (!out.ends[i]) out.ends[i] = out.verts[i];
      });
    }
    return out;
  }

  /* The box a label covers. */
  function labelBox(b) {
    var w = textW(b.text), x0 = b.anchor === 'end' ? b.lx - w : b.anchor === 'start' ? b.lx : b.lx - w / 2;
    return { x0: x0, x1: x0 + w, y0: b.ly - 10, y1: b.ly + 10 };
  }

  /* Where a group's priority badge goes: beyond its label, or beside the
     bond when the group is a bare line (a carbon of the zigzag). */
  function badgeAt(L, j, v) {
    var b = L.groups[j];
    if (b && b.labelled) {
      var box = labelBox(b);
      if (b.anchor === 'start') return [box.x1 + 12, b.ly];
      if (b.anchor === 'end') return [box.x0 - 12, b.ly];
      return [b.lx, b.d[1] > 0 ? box.y1 + 11 : box.y0 - 11];
    }
    /* a zigzag neighbour: halfway along the bond, off to one side */
    var from = L.verts[v], to = b ? b.to : L.verts[j];
    var mid = [from[0] + (to[0] - from[0]) * 0.55, from[1] + (to[1] - from[1]) * 0.55];
    var d = [to[0] - from[0], to[1] - from[1]], l = Math.sqrt(d[0] * d[0] + d[1] * d[1]) || 1;
    var n = [-d[1] / l, d[0] / l];
    var c1 = [mid[0] + n[0] * 15, mid[1] + n[1] * 15], c2 = [mid[0] - n[0] * 15, mid[1] - n[1] * 15];
    function crowd(c) {
      var s = 0;
      L.bonds.forEach(function (bb) {
        var mx = (bb.from[0] + bb.to[0]) / 2, my = (bb.from[1] + bb.to[1]) / 2;
        s += 1 / (1 + Math.hypot(c[0] - mx, c[1] - my));
      });
      return s;
    }
    return crowd(c1) < crowd(c2) ? c1 : c2;
  }

  /* Direction of each group from centre v, as drawn (after fanning). */
  function drawnDir(L, v, j) {
    var b = L.groups[j];
    if (b) return b.d;
    var f = L.verts[v], t = L.verts[j];
    var d = [t[0] - f[0], t[1] - f[1]], l = Math.sqrt(d[0] * d[0] + d[1] * d[1]) || 1;
    return [d[0] / l, d[1] / l];
  }

  /* Does 1 → 2 → 3 run clockwise in the drawing, around centre v? Reads
     the drawing the way a student does: the three drawn directions. */
  function drawnClockwise(L, v, order) {
    var p = order.slice(0, 3).map(function (j) { return drawnDir(L, v, j); });
    var cr = (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) - (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]);
    return cr > 0;                                  /* screen y points down */
  }

  /* --------------------------------------------------------- drawing */

  function bondEl(b, g, cls) {
    var stop = b.labelled ? 0.8 : 1;
    var a = b.from, e = [a[0] + (b.to[0] - a[0]) * stop, a[1] + (b.to[1] - a[1]) * stop];
    var dx = e[0] - a[0], dy = e[1] - a[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len;
    if (b.style === 'wedge') {
      var w = 6.5;
      el('polygon', { points: [a[0], a[1], e[0] + nx * w, e[1] + ny * w, e[0] - nx * w, e[1] - ny * w].join(' '),
                      class: 'zz-wedge' + (cls ? ' ' + cls : '') }, g);
    } else if (b.style === 'dash') {
      for (var i = 1; i <= 6; i++) {
        var t = i / 6.4, hw = 6.5 * t;
        var cx = a[0] + dx * t, cy = a[1] + dy * t;
        el('line', { x1: cx + nx * hw, y1: cy + ny * hw, x2: cx - nx * hw, y2: cy - ny * hw,
                     class: 'zz-hash' + (cls ? ' ' + cls : '') }, g);
      }
    } else {
      el('line', { x1: a[0], y1: a[1], x2: e[0], y2: e[1], class: 'zz-bond' + (cls ? ' ' + cls : '') }, g);
    }
  }

  /* The 1 → 2 → 3 arrow: an arc round centre v through the three groups. */
  function arrow(L, v, order, g, pts) {
    var c = L.verts[v], r = 27;
    var th = order.slice(0, 3).map(function (j) { var d = drawnDir(L, v, j); return ang2(d); });
    var cw = drawnClockwise(L, v, order);
    var sgn = cw ? 1 : -1;
    function step(a, b) { var d = ((b - a) * sgn + 720) % 360; return d; }
    var total = step(th[0], th[1]) + step(th[1], th[2]);
    var start = th[0] + sgn * 10, span = total - 26;
    var path = [];
    for (var k = 0; k <= 48; k++) {
      var a = (start + sgn * span * k / 48) * RAD;
      path.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
    }
    el('path', { d: 'M' + path.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L'),
                 class: 'rs-arrow' }, g);
    var endA = (start + sgn * span) * RAD;
    var tip = [c[0] + r * Math.cos(endA), c[1] + r * Math.sin(endA)];
    var tan = [-Math.sin(endA) * sgn, Math.cos(endA) * sgn];
    var nrm = [Math.cos(endA), Math.sin(endA)];
    var head = [[tip[0] + tan[0] * 9, tip[1] + tan[1] * 9],
                [tip[0] + nrm[0] * 5.5, tip[1] + nrm[1] * 5.5], [tip[0] - nrm[0] * 5.5, tip[1] - nrm[1] * 5.5]];
    el('polygon', { points: head.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '),
                    class: 'rs-arrow-head' }, g);
    path.forEach(function (p) { pts.push(p); });
    return cw;
  }

  function badge(x, y, n, g, extra) {
    var b = el('g', { class: 'badge' + (n === 4 ? ' four' : '') + (extra ? ' ' + extra : ''), 'aria-hidden': 'true' }, g);
    el('circle', { cx: x, cy: y, r: 9.5, class: 'badge-bg' }, b);
    el('text', { x: x, y: y + 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'badge-text' }, b, String(n));
  }

  function describe(m, L) {
    var bits = [];
    var centres = m.kind === 'centre' ? [m.centre] : m.backbone;
    centres.forEach(function (v) {
      var parts = [];
      Object.keys(L.groups).forEach(function (j) {
        var b = L.groups[j];
        if (b.a !== v || b.end) return;
        var a = m.atoms[j];
        var name = a.group ? GROUPS[a.group].name : a.el;
        parts.push(name + (b.style === 'wedge' ? ' on a wedge (toward you)' : b.style === 'dash' ? ' on a dash (away from you)'
          : ' in the page, ' + where(b.d)));
      });
      if (!parts.length) return;
      bits.push((m.kind === 'centre' ? 'The centre carbon carries ' : 'C' + m.atoms[v].num + ' carries ') + parts.join(', '));
    });
    var head = m.kind === 'centre' ? 'Wedge and dash drawing of ' + m.name : 'Bond-line drawing of ' + m.name;
    return head + '. ' + bits.join('. ') + '.';
  }

  /* A centre or chain molecule, drawn as the model now lies.
     opts.badges     true (every centre) or [centre]: priority numbers 1–4
     opts.arrow      a centre: draw 1 → 2 → 3 round it
     opts.targets    { atomIndex: { key, cls, aria } }: groups as targets
     opts.carbons    { num: { key, cls, aria } }: zigzag carbons as targets
     opts.numbers    carbon numbers on a zigzag
     opts.plane      a meso zigzag's mirror plane, as stereo.mesoPlane gives it
     opts.planeText  its label ('mirror plane'; '' for none)
     opts.planeCls   'test' (a plane being tried) or 'cut' (where the halves meet)
     opts.planeLen   half its length (80)
     opts.hot        atom indices whose bonds are highlighted
     opts.style      'skeletal' or 'labels'
     opts.showH      'all', 'none' or a list of carbon numbers
     opts.mark       { centreAtomIndex: text } a tag by a centre (R, S, *)
     opts.wedgeRight fan a wedge and dash with the wedge to the right
     opts.wedgeOut   fan each wedge away from the middle of the molecule */
  function mol(m, opts) {
    opts = opts || {};
    if (m.kind === 'ring') return flat(m, opts);
    var L = layout(m, opts);
    var s = svg('mol ' + (opts.cls || ''), opts.label || describe(m, L));
    var g = el('g', null, s);
    var pts = [];
    Object.keys(L.verts).forEach(function (i) { pts.push(L.verts[i]); });
    var hot = opts.hot || [];
    L.bonds.forEach(function (b) {
      bondEl(b, g, (hot.indexOf(b.b) >= 0 || hot.indexOf(b.a) >= 0 && b.chain && hot.indexOf(b.b) >= 0) ? 'hot' : '');
      pts.push(b.to);
    });
    /* a mirror plane seen edge-on: a dashed line */
    if (opts.plane) {
      var o = proj(opts.plane.o), n = [opts.plane.n[0], -opts.plane.n[1]];
      var t = [-n[1], n[0]], l = Math.sqrt(t[0] * t[0] + t[1] * t[1]) || 1;
      t = [t[0] / l, t[1] / l];
      var pl = opts.planeLen || 80, ptext = opts.planeText == null ? 'mirror plane' : opts.planeText;
      el('line', { x1: o[0] - t[0] * pl, y1: o[1] - t[1] * pl, x2: o[0] + t[0] * pl, y2: o[1] + t[1] * pl,
                   class: 'plane-line' + (opts.planeCls ? ' ' + opts.planeCls : '') }, g);
      if (ptext) {
        el('text', { x: o[0] + t[0] * (pl + 4), y: o[1] + t[1] * (pl + 4) + (t[1] > 0 ? 12 : -6), 'text-anchor': 'middle',
                     class: 'plane-text' + (opts.planeCls ? ' ' + opts.planeCls : '') }, g, ptext);
      }
      pts.push([o[0] - t[0] * pl, o[1] - t[1] * pl], [o[0] + t[0] * (pl + (ptext ? 16 : 0)), o[1] + t[1] * (pl + (ptext ? 16 : 0))]);
    }
    /* labels */
    Object.keys(L.groups).forEach(function (j) {
      var b = L.groups[j];
      if (!b.labelled) return;
      el('text', { x: b.lx, y: b.ly, 'text-anchor': b.anchor, 'dominant-baseline': 'central',
                   class: 'zz-label tone-' + b.tone + (hot.indexOf(+j) >= 0 ? ' hot' : '') }, g, b.text);
      var box = labelBox(b);
      pts.push([box.x0, box.y0], [box.x1, box.y1]);
    });
    /* carbon numbers, in the open angle of each zigzag vertex */
    if (opts.numbers && m.kind === 'chain') {
      m.backbone.forEach(function (i) {
        var a = m.atoms[i], v = L.verts[i];
        var y = v[1] + (a.up ? 20 : -14);
        el('text', { x: v[0], y: y, 'text-anchor': 'middle', class: 'zz-num' }, g, String(a.num));
        pts.push([v[0], y]);
      });
    }
    /* centre tags (R, S), in the widest open angle round the centre */
    Object.keys(opts.mark || {}).forEach(function (i) {
      var v = L.verts[i];
      if (!v) return;
      var dirs = MOLECULES.neighbours(m)[i].map(function (x) {
        if (L.groups[x.j]) return ang2(L.groups[x.j].d);
        if (L.verts[x.j]) return ang2([L.verts[x.j][0] - v[0], L.verts[x.j][1] - v[1]]);
        return null;
      }).filter(function (a) { return a != null; }).sort(function (a, b) { return a - b; });
      var best = 90, gapMax = -1;
      dirs.forEach(function (a, k) {
        var b = k + 1 < dirs.length ? dirs[k + 1] : dirs[0] + 360;
        if (b - a > gapMax) { gapMax = b - a; best = a + (b - a) / 2; }
      });
      var x = v[0] + Math.cos(best * RAD) * 24, y = v[1] + Math.sin(best * RAD) * 24;
      var tg = el('g', { class: 'ctag' }, g);
      el('rect', { x: x - 11, y: y - 10, width: 22, height: 19, rx: 5, class: 'ctag-bg' }, tg);
      el('text', { x: x, y: y, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'ctag-text' }, tg, opts.mark[i]);
      pts.push([x - 12, y - 11], [x + 12, y + 11]);
    });
    /* the 1 → 2 → 3 arrow */
    if (opts.arrow != null) arrow(L, opts.arrow, CIP.rank(m, opts.arrow).order, g, pts);
    /* priority badges */
    var bc = opts.badges === true ? CIP.centres(m) : (opts.badges || []);
    bc.forEach(function (c) {
      var pr = CIP.priorities(m, c);
      Object.keys(pr).forEach(function (j) {
        if (!L.groups[j] && !L.verts[j]) return;
        if (L.groups[j] && !L.groups[j].labelled && m.atoms[j].el === 'H') return;
        var at = badgeAt(L, +j, c);
        badge(at[0], at[1], pr[j], g);
        pts.push([at[0] - 10, at[1] - 10], [at[0] + 10, at[1] + 10]);
      });
    });
    /* targets: groups */
    Object.keys(opts.targets || {}).forEach(function (j) {
      var t = opts.targets[j], b = L.groups[j];
      var node = el('g', { class: 'drop gdrop ' + (t.cls || ''), 'data-drop': t.key, tabindex: 0, role: 'button',
                           'aria-label': t.aria || '' }, g);
      if (b && b.labelled) {
        var box = labelBox(b);
        el('rect', { x: box.x0 - 5, y: box.y0 - 3, width: box.x1 - box.x0 + 10, height: box.y1 - box.y0 + 6, rx: 6,
                     class: 'slot-box' }, node);
      } else {
        var at = b ? b.to : L.verts[j];
        var v0 = L.verts[t.from != null ? t.from : (b ? b.a : j)];
        if (!b && v0) at = [v0[0] + (L.verts[j][0] - v0[0]) * 0.7, v0[1] + (L.verts[j][1] - v0[1]) * 0.7];
        el('circle', { cx: at[0], cy: at[1], r: 13, class: 'slot-box' }, node);
      }
      g.appendChild(node);
    });
    /* targets: zigzag carbons */
    Object.keys(opts.carbons || {}).forEach(function (num) {
      var t = opts.carbons[num], i = m.carbonAt[num], v = L.verts[i];
      if (!v) return;
      var node = el('g', { class: 'drop cdrop ' + (t.cls || ''), 'data-drop': t.key, tabindex: 0, role: 'button',
                           'aria-label': t.aria || ('C' + num) }, g);
      el('circle', { cx: v[0], cy: v[1], r: 12, class: 'slot-box' }, node);
      if (t.text) el('text', { x: v[0], y: v[1] + 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'cdrop-text' }, node, t.text);
    });
    fit(s, pts, 12, opts.scale || 1);
    s._layout = L;
    return s;
  }

  /* --------------------------------------------------- the empty template */

  var SLOT_WORDS = {
    ul: 'in the page, upper left', ur: 'in the page, upper right', ll: 'in the page, lower left',
    lr: 'in the page, lower right', w: 'on the wedge, toward you', d: 'on the dash, away from you'
  };

  /* Where each slot of a template is drawn. */
  function slotLayout(tpl, wedgeRight) {
    var T = MOLECULES.TEMPLATES[tpl], out = [];
    MOLECULES.SLOT_ORDER[tpl].forEach(function (s) {
      var v = T[s];
      out.push({ slot: s, style: v[2] > 0.3 ? 'wedge' : v[2] < -0.3 ? 'dash' : 'plain', d: [v[0], -v[1]].map(function (x, k, arr) {
        var l = Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1]); return x / l; }) });
    });
    splay(out, wedgeRight);
    return out;
  }

  /* A template to build on: four bonds and four slots.
     fill    { slot: groupKey or null }
     opts.targets     true to make the slots targets (data-drop = slot)
     opts.wedgeRight  fan the wedge to the right: a mirror image of the
                      usual drawing, so a reflected molecule looks reflected */
  function template(tpl, fill, opts) {
    opts = opts || {};
    var s = svg('mol template ' + (opts.cls || ''), opts.label || 'Template: a centre with two bonds in the page, one wedge and one dash.');
    var g = el('g', null, s), pts = [[0, 0]];
    slotLayout(tpl, opts.wedgeRight).forEach(function (b) {
      b.from = [0, 0];
      b.to = [b.d[0] * BOND * 1.12, b.d[1] * BOND * 1.12];
      b.labelled = true;
      bondEl(b, g, '');
      var gk = fill[b.slot];
      var text = gk ? (b.d[0] < -0.35 && GROUPS[gk].left ? GROUPS[gk].left : GROUPS[gk].label) : '+';
      var anchor = anchorFor(b.d[0]);
      var lx = b.to[0] + b.d[0] * 4, ly = b.to[1] + b.d[1] * (anchor === 'middle' ? 12 : 5);
      var w = Math.max(textW(text), 30);
      var x0 = anchor === 'end' ? lx - w : anchor === 'start' ? lx : lx - w / 2;
      var node = el('g', { class: 'slot' + (gk ? ' filled' : '') + (opts.targets ? ' drop' : ''),
                           'data-drop': opts.targets ? b.slot : null, tabindex: opts.targets ? 0 : null,
                           role: opts.targets ? 'button' : null,
                           'aria-label': 'Position ' + SLOT_WORDS[b.slot] + (gk ? ', holds ' + GROUPS[gk].name + '. Activate to remove it.' : ', empty') }, g);
      el('rect', { x: x0 - 6, y: ly - 14, width: w + 12, height: 28, rx: 6, class: 'slot-box' }, node);
      el('text', { x: x0 + w / 2, y: ly, 'text-anchor': 'middle', 'dominant-baseline': 'central',
                   class: gk ? 'zz-label tone-' + groupTone(gk) : 'slot-plus' }, node, text);
      pts.push([x0 - 8, ly - 16], [x0 + w + 8, ly + 16]);
    });
    fit(s, pts, 8, opts.scale || 1);
    return s;
  }

  /* ----------------------------------------------------------- flat ring */

  /* A ring drawn flat, seen from its top face: a wedge is the top face, a
     dash the bottom face, as in the chairs activity. */
  function flat(m, opts) {
    opts = opts || {};
    var R = 40, Lb = 30;
    var spec = m.spec.ring;
    var s = svg('flat ' + (opts.cls || ''), opts.label || flatText(m));
    var g = el('g', null, s), pts = [];
    function vtx(k) { var a = (k - 1) * 60 * RAD; return [R * Math.cos(a), -R * Math.sin(a)]; }
    for (var k = 1; k <= 6; k++) {
      var a = vtx(k), b = vtx(k % 6 + 1);
      el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'fl-bond' }, g);
      pts.push(a);
    }
    if (opts.plane) {
      var p = vtx(opts.plane.through[0]), q = vtx(opts.plane.through[1]);
      var ux = (q[0] - p[0]) / (2 * R), uy = (q[1] - p[1]) / (2 * R);
      el('line', { x1: p[0] - ux * 34, y1: p[1] - uy * 34, x2: q[0] + ux * 34, y2: q[1] + uy * 34, class: 'plane-line' }, g);
    }
    var subs = [];
    Object.keys(spec).forEach(function (c) { ['t', 'b'].forEach(function (f) { if (spec[c][f]) subs.push({ c: +c, f: f, g: spec[c][f] }); }); });
    subs.forEach(function (sub) {
      var v = vtx(sub.c), u = [v[0] / R, v[1] / R];
      var e = [v[0] + u[0] * Lb, v[1] + u[1] * Lb];
      var nx = -u[1], ny = u[0];
      if (subs.length === 1) {
        el('line', { x1: v[0], y1: v[1], x2: e[0], y2: e[1], class: 'fl-bond' }, g);
      } else if (sub.f === 't') {
        var w = 6.5;
        el('polygon', { points: [v[0], v[1], e[0] + nx * w, e[1] + ny * w, e[0] - nx * w, e[1] - ny * w].join(' '),
                        class: 'fl-wedge' }, g);
      } else {
        for (var i = 1; i <= 6; i++) {
          var tt = i / 6.3, hw = 6.5 * tt;
          var cx = v[0] + (e[0] - v[0]) * tt, cy = v[1] + (e[1] - v[1]) * tt;
          el('line', { x1: cx + nx * hw, y1: cy + ny * hw, x2: cx - nx * hw, y2: cy - ny * hw, class: 'fl-hash' }, g);
        }
      }
      var lab = GROUPS[sub.g].label;
      var anchor = anchorFor(u[0]);
      var lx = e[0] + u[0] * 6, ly = e[1] + u[1] * 9;
      el('text', { x: lx, y: ly, 'text-anchor': anchor, 'dominant-baseline': 'central',
                   class: 'fl-label tone-' + groupTone(sub.g) }, g, lab);
      var w2 = textW(lab);
      pts.push([anchor === 'end' ? lx - w2 : anchor === 'start' ? lx + w2 : lx - w2 / 2, ly - 10],
               [anchor === 'middle' ? lx + w2 / 2 : lx, ly + 10]);
    });
    if (opts.numbers !== false) {
      for (var n = 1; n <= 6; n++) {
        var pp = vtx(n);
        el('text', { x: pp[0] * 0.7, y: pp[1] * 0.7, 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'fl-num' }, g, String(n));
      }
    }
    Object.keys(opts.mark || {}).forEach(function (c) {
      var v = vtx(+c);
      el('text', { x: v[0] * 1.32, y: v[1] * 1.32 + (v[1] > 0 ? 6 : -2), 'text-anchor': 'middle', class: 'fl-star' }, g, opts.mark[c]);
    });
    if (opts.plane) pts.push([-R - 40, -R - 10], [R + 40, R + 10]);
    /* the same box for every ring, so rings side by side are drawn alike */
    pts.push([-R - Lb - 36, -R - Lb - 8], [R + Lb + 36, R + Lb + 8]);
    fit(s, pts, 10, opts.scale || 1.2);
    return s;
  }

  function flatText(m) {
    var spec = m.spec.ring, bits = [];
    Object.keys(spec).forEach(function (c) {
      ['t', 'b'].forEach(function (f) {
        if (spec[c][f]) bits.push(GROUPS[spec[c][f]].name + ' on C' + c + (f === 't' ? ' on a wedge (top face)' : ' on a dash (bottom face)'));
      });
    });
    return 'Flat ring drawing of ' + m.name + ', seen from the top face: ' + bits.join('; ') + '.';
  }

  /* --------------------------------------------------------- Newman */

  var NR = 26, FRONT = 70, BACK = 46;

  /* Newman projection of a two-carbon zigzag, looking down C2–C3: C2 in
     front, C3 the circle. The front CH₃ points straight up. */
  function newman(m, opts) {
    opts = opts || {};
    var c2 = m.carbonAt[2], c3 = m.carbonAt[3];
    var p2 = m.atoms[c2].p, p3 = m.atoms[c3].p;
    var W = G.unit(G.sub(p3, p2));
    var nb = MOLECULES.neighbours(m);
    function groupsOn(c, other) {
      return nb[c].filter(function (x) { return x.j !== other; }).map(function (x) { return x.j; });
    }
    var front = groupsOn(c2, c3), back = groupsOn(c3, c2);
    var ch3 = front.filter(function (j) { return m.atoms[j].end != null; })[0];
    var up0 = G.sub(m.atoms[ch3].p, p2);
    var UP = G.unit(G.sub(up0, G.mul(W, G.dot(up0, W))));
    var RIGHT = G.cross(W, UP);
    function angle(c, j) {
      var v = G.sub(m.atoms[j].p, m.atoms[c].p);
      return Math.atan2(G.dot(v, RIGHT), G.dot(v, UP)) / RAD;
    }
    function at(r, a) { return [r * Math.sin(a * RAD), -r * Math.cos(a * RAD)]; }
    var s = svg('newman ' + (opts.cls || ''), opts.label || 'Newman projection of ' + m.name + ', looking down the C2–C3 bond. C2 is in front.');
    el('rect', { x: -118, y: -110, width: 236, height: 220, fill: 'none' }, s);
    function lab(j) { var a = m.atoms[j]; return a.group ? GROUPS[a.group].label : a.el; }
    var bg = el('g', null, s);
    var backA = back.map(function (j) { return angle(c3, j); });
    var frontA = front.map(function (j) { return angle(c2, j); });
    /* an eclipsed back bond is nudged round so it still shows, as textbooks print it */
    function near(a) { return frontA.some(function (b) { return Math.abs(((a - b + 540) % 360) - 180) < 30; }); }
    var nudge = backA.some(function (a) { return frontA.some(function (b) { return Math.abs(((a - b + 540) % 360) - 180) < 8; }); }) ? 14 : 0;
    back.forEach(function (j, k) {
      var a = backA[k] + nudge, p1 = at(NR, a), p2b = at(BACK, a);
      el('line', { x1: p1[0], y1: p1[1], x2: p2b[0], y2: p2b[1], class: 'nm-bond-back' }, bg);
      /* a back label that would run into a front label goes further round */
      var t = at(BACK + 14, near(backA[k]) ? a + 24 : a);
      el('text', { x: t[0], y: t[1], 'text-anchor': Math.sin(a * RAD) > 0.3 ? 'start' : Math.sin(a * RAD) < -0.3 ? 'end' : 'middle',
                   'dominant-baseline': 'central', class: 'nm-label small tone-' + toneOf(m.atoms[j].el) }, bg, lab(j));
    });
    el('circle', { cx: 0, cy: 0, r: NR, class: 'nm-circle' }, s);
    front.forEach(function (j, k) {
      var a = frontA[k], p = at(FRONT - 14, a);
      el('line', { x1: 0, y1: 0, x2: p[0], y2: p[1], class: 'nm-bond-front' }, s);
      var t = at(FRONT + 2, a);
      el('text', { x: t[0], y: t[1], 'text-anchor': Math.sin(a * RAD) > 0.3 ? 'start' : Math.sin(a * RAD) < -0.3 ? 'end' : 'middle',
                   'dominant-baseline': 'central', class: 'nm-label tone-' + toneOf(m.atoms[j].el) }, s, lab(j));
    });
    s.setAttribute('viewBox', '-118 -104 236 208');
    return s;
  }

  return {
    mol: mol, template: template, flat: flat, newman: newman, layout: layout, drawnClockwise: drawnClockwise, badgeAt: badgeAt,
    slotLayout: slotLayout, SLOT_WORDS: SLOT_WORDS, where: where, describe: describe, el: el, svg: svg, fit: fit
  };
})();

/* draw.js: the 2D drawings. Chair drawings, flat ring drawings with wedges
 * and dashes, Newman projections down a ring bond, and the ring-flip energy
 * diagram.
 *
 * A chair drawing is not hand-placed: it is the 3D model (chair.js) seen
 * through one fixed camera, a little above the ring and a little round from
 * side-on. Because the projection keeps parallel lines parallel, the axial
 * bonds come out vertical and each equatorial bond parallel to two ring
 * bonds, exactly the rules students learn for drawing chairs by hand. Bonds
 * are drawn back to front with a halo, so where one passes behind another it
 * shows a gap, as in a textbook.
 *
 * Everything is SVG, so it stays sharp at any size and every part a student
 * can act on is a real, focusable element.
 */

var Draw = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var RAD = Math.PI / 180;
  var V = CHAIR.vec;

  function el(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  function svg(viewBox, cls, label) {
    var s = el('svg', { viewBox: viewBox, class: cls || '', role: 'img' });
    if (label) s.setAttribute('aria-label', label);
    return s;
  }

  function fit(s, pts, pad) {
    pad = pad == null ? 10 : pad;
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
    var x0 = Math.min.apply(null, xs) - pad, x1 = Math.max.apply(null, xs) + pad;
    var y0 = Math.min.apply(null, ys) - pad, y1 = Math.max.apply(null, ys) + pad;
    s.setAttribute('viewBox', [x0, y0, x1 - x0, y1 - y0].map(function (v) { return v.toFixed(1); }).join(' '));
    return { w: x1 - x0, h: y1 - y0 };
  }

  function anchorFor(dx) { return dx > 0.35 ? 'start' : dx < -0.35 ? 'end' : 'middle'; }

  /* Rough width of a label in px at the drawings' 16px font. */
  function textW(t) { return 9.2 * t.length + 2; }

  /* ------------------------------------------------------------ chair */

  var S = 60;           /* px per ångström */
  var SUB = 0.95;       /* drawn length of every substituent bond, Å */

  /* Which positions a chair drawing shows when not told: every non-H group,
     and the H on the same carbon. */
  function defaultShow(mol) {
    var out = [];
    MOLECULES.groups(mol).forEach(function (g) {
      [g.c + 't', g.c + 'b'].forEach(function (p) { if (out.indexOf(p) < 0) out.push(p); });
    });
    return out;
  }

  function chairText(mol, t, show) {
    var k = t >= 0.5 ? 1 : 0;
    var bits = MOLECULES.groups(mol).map(function (g) {
      return GROUPS[g.g].name + ' on C' + g.c + ', ' + CHAIR.describe(g.pos, k);
    });
    var shownH = show.filter(function (p) { return MOLECULES.groupAt(mol, CHAIR.carbonOf(p), CHAIR.faceOf(p)) === 'H'; });
    return 'Chair drawing of ' + mol.name + (bits.length ? ': ' + bits.join('; ') : '') +
      (shownH.length === 12 ? '. All twelve H atoms are drawn.' : '.');
  }

  /* Chair drawing of `mol` at flip progress t.
     opts.show     positions to draw ('all' for all twelve); default: the groups
     opts.targets  { pos: { key, aria } } positions drawn as focusable targets
                   (class `drop`, attribute data-drop = key)
     opts.mark     { pos: class } extra classes for a position's bond and label
     opts.text     { pos: text } replace a position's label
     opts.letters  { pos: 'A' } lettered positions (quiz figures)
     opts.numbers  false hides the carbon numbers */
  function chair(mol, t, opts) {
    opts = opts || {};
    t = t || 0;
    var m = CHAIR.model(mol, t);
    var cam = CHAIR.sideCam(t);
    function P3(p) { return [V.dot(cam[0], p) * S, -V.dot(cam[1], p) * S, V.dot(cam[2], p)]; }
    var show = opts.show === 'all' ? CHAIR.POSITIONS.slice() : (opts.show || defaultShow(mol));
    var targets = opts.targets || {}, mark = opts.mark || {}, letters = opts.letters || {}, text = opts.text || {};
    var s = svg('0 0 10 10', 'chair ' + (opts.cls || ''), opts.label || chairText(mol, t, show));
    var pts = [];
    var C = {};
    for (var i = 1; i <= 6; i++) C[i] = P3(CHAIR.atom(m, 'C' + i).p);

    var items = [];
    for (var j = 1; j <= 6; j++) {
      var a = C[j], b = C[j % 6 + 1];
      items.push({ ring: true, a: a, b: b, z: (a[2] + b[2]) / 2 });
    }
    var subs = {};
    show.forEach(function (pos) {
      var c = CHAIR.carbonOf(pos);
      var cp = CHAIR.atom(m, 'C' + c).p, hp = CHAIR.atom(m, pos).p;
      var dir = V.unit(V.sub(hp, cp));
      var end = P3(V.add(cp, V.mul(dir, SUB)));
      var d2 = [end[0] - C[c][0], end[1] - C[c][1]], l2 = Math.sqrt(d2[0] * d2[0] + d2[1] * d2[1]) || 1;
      var u = [d2[0] / l2, d2[1] / l2];
      subs[pos] = { c: c, from: C[c], end: end, u: u, g: CHAIR.atom(m, pos).group };
      items.push({ ring: false, pos: pos, a: C[c], b: end, z: (C[c][2] + end[2]) / 2 });
    });
    items.sort(function (p, q) { return p.z - q.z; });

    var gb = el('g', { class: 'ch-bonds' }, s);
    items.forEach(function (it) {
      var cls = it.ring ? 'ch-ring' : 'ch-sub ' + (mark[it.pos] || '');
      var line = { x1: it.a[0].toFixed(1), y1: it.a[1].toFixed(1), x2: it.b[0].toFixed(1), y2: it.b[1].toFixed(1) };
      el('line', Object.assign({ class: 'ch-halo' }, line), gb);
      el('line', Object.assign({ class: cls }, line), gb);
      pts.push([it.a[0], it.a[1]], [it.b[0], it.b[1]]);
    });

    /* carbon numbers, in the widest open angle round each carbon */
    if (opts.numbers !== false) {
      var gn = el('g', { class: 'ch-nums' }, s);
      for (var n = 1; n <= 6; n++) {
        var dirs = [C[n % 6 + 1], C[(n + 4) % 6 + 1]].map(function (q) { return Math.atan2(q[1] - C[n][1], q[0] - C[n][0]); });
        show.forEach(function (pos) {
          if (CHAIR.carbonOf(pos) === n) dirs.push(Math.atan2(subs[pos].u[1], subs[pos].u[0]));
        });
        dirs.sort(function (x, y) { return x - y; });
        var best = 0, at = 0;
        for (var q = 0; q < dirs.length; q++) {
          var a0 = dirs[q], a1 = q + 1 < dirs.length ? dirs[q + 1] : dirs[0] + 2 * Math.PI;
          if (a1 - a0 > best) { best = a1 - a0; at = (a0 + a1) / 2; }
        }
        var nx = C[n][0] + Math.cos(at) * 13, ny = C[n][1] + Math.sin(at) * 13;
        el('text', { x: nx.toFixed(1), y: ny.toFixed(1), 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'ch-num' + (opts.hotC === n ? ' hot' : '') }, gn, String(n));
        pts.push([nx - 6, ny - 6], [nx + 6, ny + 6]);
      }
    }

    /* labels and targets on top */
    var gl = el('g', { class: 'ch-labels' }, s);
    show.forEach(function (pos) {
      var sb = subs[pos];
      var lab = text[pos] != null ? text[pos] : GROUPS[sb.g].label;
      var gap = 11;
      var lx = sb.end[0] + sb.u[0] * gap, ly = sb.end[1] + sb.u[1] * gap;
      var anchor = anchorFor(sb.u[0]);
      var w = textW(lab);
      /* centre of the label's box, for targets */
      var bx = anchor === 'start' ? lx + w / 2 - 2 : anchor === 'end' ? lx - w / 2 + 2 : lx;
      if (anchor === 'middle') ly += sb.u[1] > 0 ? 3 : -3;
      var tg = targets[pos];
      var parent = gl;
      if (tg) {
        parent = el('g', { class: 'drop chdrop ' + (tg.cls || '') + ' ' + (mark[pos] || ''), 'data-drop': tg.key,
                           'data-pos': pos, tabindex: 0, role: 'button', 'aria-label': tg.aria || pos }, gl);
        var bw = Math.max(30, w + 12);
        el('rect', { x: (bx - bw / 2).toFixed(1), y: (ly - 14).toFixed(1), width: bw.toFixed(1), height: 28, rx: 14,
                     class: 'slot-box' }, parent);
        pts.push([bx - bw / 2, ly - 14], [bx + bw / 2, ly + 14]);
        if (tg.tag) {
          el('text', { x: (bx + bw / 2 - 2).toFixed(1), y: (ly - 13).toFixed(1), 'text-anchor': 'middle',
                       'dominant-baseline': 'central', class: 'ch-tag' }, parent, tg.tag);
        }
        var tone = lab === '+' ? 'slot-plus' : 'tone-' + groupTone(tg.g || sb.g);
        el('text', { x: bx.toFixed(1), y: ly.toFixed(1), 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'ch-label ' + tone }, parent, lab);
      } else if (lab) {
        el('text', { x: bx.toFixed(1), y: ly.toFixed(1), 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'ch-label tone-' + groupTone(sb.g) + ' ' + (mark[pos] || '') }, parent, lab);
        pts.push([bx - w / 2, ly - 10], [bx + w / 2, ly + 10]);
      }
      if (letters[pos]) {
        var lx2 = bx + (anchor === 'end' ? -w / 2 - 12 : w / 2 + 12), ly2 = ly - 12;
        if (anchor === 'middle') { lx2 = bx + 16; ly2 = ly; }
        el('circle', { cx: lx2.toFixed(1), cy: ly2.toFixed(1), r: 10, class: 'ch-letter-bg' }, gl);
        el('text', { x: lx2.toFixed(1), y: ly2.toFixed(1), 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'ch-letter' }, gl, letters[pos]);
        pts.push([lx2 - 12, ly2 - 12], [lx2 + 12, ly2 + 12]);
      }
    });
    fit(s, pts, opts.pad == null ? 8 : opts.pad);
    return s;
  }

  /* ------------------------------------------------------- flat ring */

  /* The ring seen from the top face: a regular hexagon, C1 at the right,
     numbered anticlockwise (the same ring as the chair drawings, seen from
     above). A wedge is a group on the top face, a dash one on the bottom
     face. With only one group the face does not matter, so it gets a plain
     line. */
  function flat(mol, opts) {
    opts = opts || {};
    var R = 40, L = 30;
    var gs = MOLECULES.groups(mol);
    var s = svg('0 0 10 10', 'flat ' + (opts.cls || ''), opts.label || flatText(mol));
    var g = el('g', null, s), pts = [];
    function vtx(k) { var a = (k - 1) * 60 * RAD; return [R * Math.cos(a), -R * Math.sin(a)]; }
    for (var k = 1; k <= 6; k++) {
      var a = vtx(k), b = vtx(k % 6 + 1);
      el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'fl-bond' }, g);
      pts.push(a);
    }
    gs.forEach(function (sub) {
      var v = vtx(sub.c), u = [v[0] / R, v[1] / R];
      var e = [v[0] + u[0] * L, v[1] + u[1] * L];
      var nx = -u[1], ny = u[0];
      if (gs.length === 1) {
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
        var p = vtx(n);
        el('text', { x: p[0] * 0.7, y: p[1] * 0.7, 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'fl-num' }, g, String(n));
      }
    }
    var box = fit(s, pts, 8);
    s.setAttribute('width', Math.round(box.w * (opts.scale || 1.2)));
    return s;
  }

  function flatText(mol) {
    var gs = MOLECULES.groups(mol);
    if (!gs.length) return 'Flat drawing of ' + mol.name + '.';
    return 'Flat ring drawing of ' + mol.name + ', seen from the top face: ' + gs.map(function (g) {
      return GROUPS[g.g].name + ' on C' + g.c + (gs.length > 1 ? (g.f === 't' ? ' on a wedge (top face)' : ' on a dash (bottom face)') : '');
    }).join('; ') + '.';
  }

  /* --------------------------------------------------------- Newman */

  var NR = 30, FRONT = 84, BACK = 54, FRONT_LABEL = 100, BACK_LABEL = 66;
  var POS = { 0: 'top', 60: 'upper right', 120: 'lower right', 180: 'bottom', 240: 'lower left', 300: 'upper left' };

  function at(r, a) { return [r * Math.sin(a * RAD), -r * Math.cos(a * RAD)]; }
  function anchorAt(a) { var sx = Math.sin(a * RAD); return sx > 0.3 ? 'start' : sx < -0.3 ? 'end' : 'middle'; }

  /* Static Newman projection of `nm` (CHAIR.newman). opts.hot lists
     positions ('1t') or ring carbons ('R3') to highlight; opts.arc =
     { a, b, text } marks the angle between two groups. An eclipsed
     projection is printed with the back carbon nudged round a few degrees
     (opts.offset), the way textbooks print it, so its bonds still show. */
  function newman(nm, opts) {
    opts = opts || {};
    if (opts.offset) {
      nm = { front: nm.front, carbons: nm.carbons,
             back: nm.back.map(function (q) { return Object.assign({}, q, { a: q.a + opts.offset }); }) };
    }
    var s = svg('-125 -118 250 236', 'newman ' + (opts.cls || ''), opts.label || newmanText(nm));
    var hot = opts.hot || [];
    function isHot(q) { return hot.indexOf(q.pos) >= 0 || (q.ring && hot.indexOf('R' + q.ring) >= 0); }
    var back = el('g', null, s);
    nm.back.forEach(function (q) {
      var p1 = at(NR, q.a), p2 = at(BACK, q.a);
      el('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], class: 'nm-bond-back' + (q.ring ? ' ring' : '') + (isHot(q) ? ' hot' : '') }, back);
    });
    el('circle', { cx: 0, cy: 0, r: NR, class: 'nm-circle' }, s);
    nm.front.forEach(function (q) {
      var p = at(FRONT, q.a);
      el('line', { x1: 0, y1: 0, x2: p[0], y2: p[1], class: 'nm-bond-front' + (q.ring ? ' ring' : '') + (isHot(q) ? ' hot' : '') }, s);
    });
    if (opts.arc) {
      var r = 112, a1 = opts.arc.a, a2 = opts.arc.b;
      var d = ((a2 - a1) % 360 + 360) % 360;
      if (d > 180) { var tmp = a1; a1 = a2; a2 = tmp; d = 360 - d; }
      var p1 = at(r, a1), p2 = at(r, a2);
      el('path', { d: 'M' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 0 1 ' +
                      p2[0].toFixed(1) + ' ' + p2[1].toFixed(1), class: 'nm-arc' }, s);
      var mid = at(r + 10, a1 + d / 2);
      el('text', { x: mid[0].toFixed(1), y: mid[1].toFixed(1), 'text-anchor': anchorAt(a1 + d / 2),
                   'dominant-baseline': 'central', class: 'nm-arc-text' }, s, opts.arc.text);
    }
    var labels = el('g', null, s);
    var boxes = opts.box || [];
    function label(q, rr, cls) {
      var p = at(rr, q.a);
      if (boxes.indexOf(q.pos) >= 0) labelBox(labels, p, anchorAt(q.a), GROUPS[q.g].label);
      el('text', { x: p[0].toFixed(1), y: p[1].toFixed(1), 'text-anchor': anchorAt(q.a), 'dominant-baseline': 'central',
                   class: 'nm-label tone-' + groupTone(q.g) + (cls ? ' ' + cls : '') + (isHot(q) ? ' hot' : '') }, labels,
         GROUPS[q.g].label);
    }
    nm.back.forEach(function (q) { label(q, BACK_LABEL, 'nm-back-label'); });
    nm.front.forEach(function (q) { label(q, FRONT_LABEL); });
    return s;
  }

  /* Klein's green highlight behind a label at p with the given anchor. */
  function labelBox(parent, p, anchor, text) {
    var w = textW(text) + 10, x = anchor === 'start' ? p[0] - 5 : anchor === 'end' ? p[0] - w + 5 : p[0] - w / 2;
    return el('rect', { x: x.toFixed(1), y: (p[1] - 14).toFixed(1), width: w.toFixed(1), height: 28, rx: 6, class: 'kn-box' }, parent);
  }

  function newmanText(nm) {
    function side(list) {
      return list.map(function (q) { return GROUPS[q.g].name + ' ' + (POS[q.a] || q.a + '°'); }).join(', ');
    }
    return 'Newman projection looking down the ' + nm.carbons[0] + '–' + nm.carbons[1] + ' bond. Front carbon (' +
      nm.carbons[0] + '): ' + side(nm.front) + '. Back carbon (' + nm.carbons[1] + '): ' + side(nm.back) + '.';
  }

  /* ------------------------------------- the chair as Newman projections */

  /* Klein's way of drawing a chair as Newman projections: look down the
     C1–C2 and C5–C4 bonds at once (they are parallel in a chair) and the
     chair becomes two Newman projections side by side. C1 and C5 are the
     front carbons (where three bonds meet), C2 and C4 the back carbons (the
     circles); C3 joins the two circles and C6 the two front carbons.

     It is an exact projection of the 3D model (CHAIR.camera 'newman'), so
     the same drawing of chair 1 and chair 2 shows what a ring flip does:
     every bond on a front carbon turns 60° one way and every bond on a back
     carbon 60° the other way, the kind of turn students made in the Newman
     activity. Axial bonds point straight up or down; C3 and C6 each have an
     equatorial H pointing straight along the line of sight, which, like
     Klein, is drawn as the second arm of a V.

     opts.show     positions to draw (default: all but C6's two H atoms)
     opts.targets  { pos: { key, aria, g, cls } } focusable slots
     opts.text     { pos: text } replace a label
     opts.letters  { pos: 'A' }
     opts.box      positions, or 'C3', to highlight with a green box, as Klein does
     opts.red      positions whose bonds are drawn red, and ring bonds 'C1C6', 'C2C3'
     opts.track    positions to follow from chair `opts.from` (0 or 1): their old
                   bond is drawn faint, with an arrow round to the new one
     opts.numbers  false hides the carbon numbers */
  var KS = 62;
  var KF = 72, KF_LABEL = 88, KB = 50, KB_LABEL = 62, KV = 36;

  function clock(a) { var hr = Math.round(a / 30) % 12; return (hr === 0 ? 12 : hr) + ' o’clock'; }

  function kleinLayout(mol, k) {
    var m = CHAIR.model(mol, k);
    var cam = CHAIR.camera('newman', m);
    function P(p) { return [V.dot(cam[0], p) * KS, -V.dot(cam[1], p) * KS]; }
    var pt = {};
    m.atoms.forEach(function (a) { pt[a.id] = P(a.p); });
    function ang(from, to) {
      var dx = to[0] - from[0], dy = to[1] - from[1];
      return ((Math.atan2(dx, -dy) / RAD) % 360 + 360) % 360;
    }
    var centre = { 1: pt.C1, 2: pt.C1, 4: pt.C5, 5: pt.C5 };
    var pos = {};
    CHAIR.POSITIONS.forEach(function (p) {
      var c = CHAIR.carbonOf(p), a = CHAIR.atom(m, p);
      if (centre[c]) pos[p] = { c: c, a: ang(centre[c], pt[p]), front: c === 1 || c === 5, g: a.group };
      else {
        /* C3 and C6: the axial H is vertical, the equatorial one points at the eye */
        var ax = CHAIR.isAxial(p, k), down = pt['C' + c][1] > 0;
        var axA = down ? 180 : 0;
        pos[p] = { c: c, bridge: true, g: a.group, ax: ax, a: ax ? axA + (down ? -25 : 25) : axA + (down ? 25 : -25) };
      }
    });
    return { m: m, pt: pt, pos: pos, cR: pt.C1, cL: pt.C5, p3: pt.C3, p6: pt.C6,
             a23: ang(pt.C1, pt.C3), a43: ang(pt.C5, pt.C3), a16: ang(pt.C1, pt.C6), a56: ang(pt.C5, pt.C6) };
  }

  function klein(mol, k, opts) {
    opts = opts || {};
    var L = kleinLayout(mol, k);
    var show = opts.show === 'all' ? CHAIR.POSITIONS.slice()
      : (opts.show || CHAIR.POSITIONS.filter(function (p) { return CHAIR.carbonOf(p) !== 6; }));
    var targets = opts.targets || {}, text = opts.text || {}, letters = opts.letters || {};
    var boxes = opts.box || [], red = opts.red || [];
    var s = svg('0 0 10 10', 'klein ' + (opts.cls || ''), opts.label || kleinText(mol, k, L));
    var pts = [];
    function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
    function line(p1, p2, cls, parent) {
      el('line', { x1: p1[0].toFixed(1), y1: p1[1].toFixed(1), x2: p2[0].toFixed(1), y2: p2[1].toFixed(1), class: cls }, parent);
      pts.push(p1, p2);
    }
    /* the red and blue tracking H atoms keep their colour on the bond too */
    function tintOf(q) { return GROUPS[q.g].tint ? ' t-' + GROUPS[q.g].tint : ''; }
    function centreOf(q) { return q.bridge ? (q.c === 3 ? L.p3 : L.p6) : q.c === 1 || q.c === 2 ? L.cR : L.cL; }
    function bondEnds(q) {
      var c = centreOf(q);
      if (q.bridge) return [c, add(c, at(KV, q.a))];
      return q.front ? [c, add(c, at(KF, q.a))] : [add(c, at(NR, q.a)), add(c, at(KB, q.a))];
    }
    function labelAt(q) {
      var c = centreOf(q);
      return add(c, at(q.bridge ? KV + 12 : q.front ? KF_LABEL : KB_LABEL, q.a));
    }

    /* green highlight round C3 and its H atoms, under everything */
    if (boxes.indexOf('C3') >= 0) {
      var up3 = L.p3[1] < 0;
      var top = up3 ? L.p3[1] - KV - 26 : L.p3[1] - 18, hh = KV + 44;
      el('rect', { x: (L.p3[0] - 34).toFixed(1), y: top.toFixed(1), width: 68, height: hh, rx: 6, class: 'kn-box' }, s);
    }

    /* back: C2 and C4 bonds, the C3 bridge and its H atoms */
    var gBack = el('g', { class: 'kn-back' }, s);
    show.forEach(function (p) {
      var q = L.pos[p];
      if (q.front || (q.bridge && q.c === 6)) return;
      var e = bondEnds(q);
      line(e[0], e[1], (q.bridge ? 'kn-bond-v' : 'nm-bond-back') + (red.indexOf(p) >= 0 ? ' red' : '') + tintOf(q), gBack);
    });
    line(add(L.cR, at(NR, L.a23)), L.p3, 'nm-bond-back ring kn-ring' + (red.indexOf('C2C3') >= 0 ? ' red' : ''), gBack);
    line(add(L.cL, at(NR, L.a43)), L.p3, 'nm-bond-back ring kn-ring', gBack);
    el('circle', { cx: L.cR[0].toFixed(1), cy: L.cR[1].toFixed(1), r: NR, class: 'nm-circle' }, s);
    el('circle', { cx: L.cL[0].toFixed(1), cy: L.cL[1].toFixed(1), r: NR, class: 'nm-circle' }, s);

    /* ghosts: where tracked groups were in the other chair */
    if (opts.track && opts.from != null && opts.from !== k) {
      var G = kleinLayout(mol, opts.from);
      var gG = el('g', { class: 'kn-ghosts' }, s);
      opts.track.forEach(function (p) {
        var q0 = G.pos[p], q1 = L.pos[p];
        if (!q0 || q0.bridge) return;
        var e = bondEnds(q0);
        line(e[0], e[1], 'kn-ghost', gG);
        var c = centreOf(q1), r = q1.front ? KF - 14 : KB + 8;
        var d = ((q1.a - q0.a) % 360 + 360) % 360, sweep = d <= 180 ? 1 : 0;
        if (d > 180) d = 360 - d;
        var a0 = q0.a + (sweep ? 8 : -8), a1 = q1.a + (sweep ? -8 : 8);
        var p0 = add(c, at(r, a0)), p1 = add(c, at(r, a1));
        el('path', { d: 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 0 ' + sweep + ' ' +
                        p1[0].toFixed(1) + ' ' + p1[1].toFixed(1), class: 'kn-move', 'marker-end': 'url(#kn-arrow)' }, gG);
      });
      var defs = el('defs', null, s);
      var mk = el('marker', { id: 'kn-arrow', viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 5, markerHeight: 5,
                              orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M0 0 L10 5 L0 10 Z', class: 'kn-move-head' }, mk);
    }

    /* front: C1 and C5 bonds, the C6 bridge (and its H atoms if shown) */
    var gFront = el('g', { class: 'kn-front' }, s);
    line(L.cR, L.p6, 'nm-bond-front ring kn-ring' + (red.indexOf('C1C6') >= 0 ? ' red' : ''), gFront);
    line(L.cL, L.p6, 'nm-bond-front ring kn-ring', gFront);
    show.forEach(function (p) {
      var q = L.pos[p];
      if (!(q.front || (q.bridge && q.c === 6))) return;
      var e = bondEnds(q);
      line(e[0], e[1], (q.bridge ? 'kn-bond-v' : 'nm-bond-front') + (red.indexOf(p) >= 0 ? ' red' : '') + tintOf(q), gFront);
    });

    var gl = el('g', { class: 'kn-labels' }, s);

    show.forEach(function (p) {
      var q = L.pos[p], lp = labelAt(q);
      var lab = text[p] != null ? text[p] : GROUPS[q.g].label;
      var anchor = q.bridge ? 'middle' : anchorAt(q.a);
      var w = textW(lab);
      var bx = anchor === 'start' ? lp[0] + w / 2 - 2 : anchor === 'end' ? lp[0] - w / 2 + 2 : lp[0];
      var tg = targets[p];
      if (tg) {
        var g = el('g', { class: 'drop chdrop ' + (tg.cls || ''), 'data-drop': tg.key, 'data-pos': p, tabindex: 0,
                          role: 'button', 'aria-label': tg.aria || p }, gl);
        var bw = Math.max(30, w + 12);
        el('rect', { x: (bx - bw / 2).toFixed(1), y: (lp[1] - 14).toFixed(1), width: bw.toFixed(1), height: 28, rx: 14,
                     class: 'slot-box' }, g);
        el('text', { x: bx.toFixed(1), y: lp[1].toFixed(1), 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'nm-label ' + (lab === '+' ? 'slot-plus' : 'tone-' + groupTone(tg.g || q.g)) }, g, lab);
        pts.push([bx - bw / 2, lp[1] - 14], [bx + bw / 2, lp[1] + 14]);
      } else {
        if (boxes.indexOf(p) >= 0) labelBox(gl, [bx, lp[1]], 'middle', lab);
        el('text', { x: bx.toFixed(1), y: lp[1].toFixed(1), 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'nm-label kn-label tone-' + groupTone(q.g) + (red.indexOf(p) >= 0 ? ' red' : '') }, gl, lab);
        pts.push([bx - w / 2, lp[1] - 12], [bx + w / 2, lp[1] + 12]);
      }
      if (letters[p]) {
        /* on the side the bond points, so two letters on a V never sit between the two labels */
        var left = Math.sin(q.a * RAD) < -0.05;
        var lx = left ? bx - w / 2 - 12 : bx + w / 2 + 12, ly = lp[1] - 12;
        el('circle', { cx: lx.toFixed(1), cy: ly.toFixed(1), r: 10, class: 'ch-letter-bg' }, gl);
        el('text', { x: lx.toFixed(1), y: ly.toFixed(1), 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'ch-letter' }, gl, letters[p]);
        pts.push([lx - 12, ly - 12], [lx + 12, ly + 12]);
      }
    });

    /* carbon numbers: front ones inside the circle, back ones just outside it */
    if (opts.numbers !== false) {
      var gn = el('g', { class: 'kn-nums' }, s);
      function num(n, p) {
        el('text', { x: p[0].toFixed(1), y: p[1].toFixed(1), 'text-anchor': 'middle', 'dominant-baseline': 'central',
                     class: 'kn-num' }, gn, String(n));
      }
      function frontAngles(c) {
        var list = show.filter(function (p) { return CHAIR.carbonOf(p) === c; }).map(function (p) { return L.pos[p].a; });
        return list.concat([c === 1 ? L.a16 : L.a56]);
      }
      [[1, L.cR, 90], [5, L.cL, 270]].forEach(function (f) {
        var best = null;
        [30, 90, 150, 210, 270, 330].forEach(function (a) {
          var clear = Math.min.apply(null, frontAngles(f[0]).map(function (b) { return CHAIR.gap(a, b); }));
          var score = clear * 10 - CHAIR.gap(a, f[2]);
          if (best == null || score > best.s) best = { a: a, s: score };
        });
        num(f[0], add(f[1], at(15, best.a)));
      });
      [[2, L.cR, L.a23], [4, L.cL, L.a43]].forEach(function (b) {
        var others = show.filter(function (p) { return CHAIR.carbonOf(p) === (b[0] === 2 ? 1 : 5) ||
                                                        CHAIR.carbonOf(p) === b[0]; })
          .map(function (p) { return L.pos[p].a; }).concat(b[0] === 2 ? [L.a16] : [L.a56]);
        var cands = [b[2] - 30, b[2] + 30];
        var pick = cands.map(function (a) {
          return { a: a, clear: Math.min.apply(null, others.map(function (o) { return CHAIR.gap(a, o); })) };
        }).sort(function (x, y) { return y.clear - x.clear; })[0];
        num(b[0], add(b[1], at(NR + 9, pick.a)));
      });
      num(3, [L.p3[0], L.p3[1] + (L.p3[1] < 0 ? 14 : -14)]);
      num(6, [L.p6[0], L.p6[1] + (L.p6[1] < 0 ? 14 : -14)]);
    }
    [L.cR, L.cL].forEach(function (c) { pts.push([c[0] - NR - 4, c[1] - NR - 4], [c[0] + NR + 4, c[1] + NR + 4]); });
    fit(s, pts, opts.pad == null ? 8 : opts.pad);
    return s;
  }

  function kleinText(mol, k, L) {
    L = L || kleinLayout(mol, k);
    function side(c) {
      return CHAIR.POSITIONS.filter(function (p) { return CHAIR.carbonOf(p) === c; }).map(function (p) {
        return GROUPS[L.pos[p].g].name + ' at ' + clock(L.pos[p].a) + ' (' + (CHAIR.isAxial(p, k) ? 'axial' : 'equatorial') + ')';
      }).join(', ');
    }
    return 'Chair ' + (k + 1) + ' of ' + mol.name + ' drawn as two Newman projections, looking down the C1–C2 and ' +
      'C5–C4 bonds. Right: front carbon C1 with ' + side(1) + '; back carbon C2 with ' + side(2) + '. Left: front ' +
      'carbon C5 with ' + side(5) + '; back carbon C4 with ' + side(4) + '. C3 joins the two back carbons at the ' +
      (L.p3[1] < 0 ? 'top' : 'bottom') + ' and C6 the two front carbons at the ' + (L.p6[1] < 0 ? 'top' : 'bottom') + '.';
  }

  /* ------------------------------------------------- ring-flip diagram */

  /* Energy along the flip, from chair 1 (left) to chair 2 (right). The two
     chairs sit at their real relative energies; the hump between them is
     drawn, not computed: it only says that every in-between shape is less
     stable than either chair. There are no numbers on the energy axis. */
  function FlipPlot(host, opts) {
    opts = opts || {};
    this.host = host;
    this.mols = opts.mols || [opts.mol];
    this.captions = opts.captions || null;
    var w = host.clientWidth || 560;
    this.W = Math.max(320, Math.min(720, w));
    this.H = 250;
    this.box = { x0: 44, x1: this.W - 112, y0: 26, y1: this.H - 58 };
    this.marker = null;
    this.markers = null;
    this.svg = svg('0 0 ' + this.W + ' ' + this.H, 'flipplot');
    this.svg.setAttribute('aria-hidden', 'true');
    host.appendChild(this.svg);
    this.setMols(this.mols);
  }

  FlipPlot.prototype.setMols = function (mols) {
    this.mols = mols;
    var lo = Infinity, hi = 0;
    mols.forEach(function (m) {
      [0, 1].forEach(function (k) { var e = AVAL.energy(m, k); lo = Math.min(lo, e); hi = Math.max(hi, e); });
    });
    this.top = Math.max(lo + 45, hi + 15);
    this.yMax = this.top + 6;
  };

  FlipPlot.energyAt = function (mol, t, top) {
    var ea = AVAL.energy(mol, 0), eb = AVAL.energy(mol, 1);
    var s = t * t * (3 - 2 * t);
    var base = ea + (eb - ea) * s;
    var amp = top - (ea + eb) / 2;
    var b = Math.sin(Math.PI * t);
    return base + amp * b * b;
  };

  FlipPlot.prototype.X = function (t) { return this.box.x0 + t * (this.box.x1 - this.box.x0); };
  FlipPlot.prototype.Y = function (e) { return this.box.y1 - (e / this.yMax) * (this.box.y1 - this.box.y0); };

  FlipPlot.prototype.render = function () {
    var s = this.svg, b = this.box, self = this;
    while (s.firstChild) s.removeChild(s.firstChild);
    el('line', { x1: b.x0, y1: b.y1 + 4, x2: b.x0, y2: b.y0 - 10, class: 'g-axis' }, s);
    el('path', { d: 'M' + (b.x0 - 5) + ' ' + (b.y0 - 4) + ' L' + b.x0 + ' ' + (b.y0 - 13) + ' L' + (b.x0 + 5) + ' ' + (b.y0 - 4), class: 'g-axis g-arrow' }, s);
    el('text', { x: b.x0 - 12, y: (b.y0 + b.y1) / 2, 'text-anchor': 'middle', class: 'g-title',
                 transform: 'rotate(-90 ' + (b.x0 - 12) + ' ' + ((b.y0 + b.y1) / 2) + ')' }, s, 'Energy');
    el('line', { x1: b.x0, y1: b.y1 + 4, x2: b.x1 + 4, y2: b.y1 + 4, class: 'g-axis' }, s);
    el('text', { x: (b.x0 + b.x1) / 2, y: this.H - 8, 'text-anchor': 'middle', class: 'g-title' }, s, 'Ring flip');

    this.mols.forEach(function (mol, i) {
      var cls = i === 0 ? '' : ' alt';
      var d = '';
      for (var k = 0; k <= 100; k++) {
        var t = k / 100;
        d += (k ? ' L' : 'M') + self.X(t).toFixed(1) + ' ' + self.Y(FlipPlot.energyAt(mol, t, self.top)).toFixed(1);
      }
      el('path', { d: d, class: 'g-curve' + cls }, s);
      [0, 1].forEach(function (kk) {
        var y = self.Y(AVAL.energy(mol, kk)), x = self.X(kk);
        el('line', { x1: x - 16, y1: y, x2: x + 16, y2: y, class: 'g-level' + cls }, s);
      });
    });

    el('text', { x: this.X(0.5), y: this.Y(this.top) - 9, 'text-anchor': 'middle', class: 'g-note' }, s,
       b.x1 - b.x0 < 260 ? 'less stable shapes' : 'in-between shapes: all less stable');

    /* chair names under the ends */
    ['Chair 1', 'Chair 2'].forEach(function (n, k) {
      el('text', { x: self.X(k), y: b.y1 + 22, 'text-anchor': 'middle', class: 'g-tick strong' }, s, n);
      if (self.captions) {
        el('text', { x: self.X(k), y: b.y1 + 37, 'text-anchor': k ? 'end' : 'start', class: 'g-tick',
                     dx: k ? 16 : -16 }, s, self.captions[k]);
      }
    });

    /* the gap between the chairs, for a single molecule */
    if (this.mols.length === 1) {
      var m = this.mols[0];
      var ea = AVAL.energy(m, 0), eb = AVAL.energy(m, 1);
      if (Math.abs(ea - eb) > 0.05) {
        var x = this.X(1) + 30, y1 = this.Y(ea), y2 = this.Y(eb);
        el('line', { x1: this.X(0) + 16, y1: y1, x2: x + 6, y2: y1, class: 'g-guide' }, s);
        el('line', { x1: x, y1: y1, x2: x, y2: y2, class: 'g-gap' }, s);
        var up = y1 < y2 ? 1 : -1;
        if (Math.abs(y2 - y1) > 16) {
          el('path', { d: 'M' + (x - 4) + ' ' + (y1 + up * 7) + ' L' + x + ' ' + y1 + ' L' + (x + 4) + ' ' + (y1 + up * 7), class: 'g-gap' }, s);
          el('path', { d: 'M' + (x - 4) + ' ' + (y2 - up * 7) + ' L' + x + ' ' + y2 + ' L' + (x + 4) + ' ' + (y2 - up * 7), class: 'g-gap' }, s);
        } else {
          el('line', { x1: x - 4, y1: y1, x2: x + 4, y2: y1, class: 'g-gap' }, s);
          el('line', { x1: x - 4, y1: y2, x2: x + 4, y2: y2, class: 'g-gap' }, s);
        }
        el('text', { x: x + 7, y: (y1 + y2) / 2, 'dominant-baseline': 'central', class: 'g-gap-text' }, s,
           AVAL.fmt(Math.abs(ea - eb)) + ' kJ/mol');
      } else {
        el('text', { x: this.X(1) + 22, y: this.Y(ea) - 12, 'text-anchor': 'start', class: 'g-gap-text' }, s, 'same');
        el('text', { x: this.X(1) + 22, y: this.Y(ea) + 4, 'text-anchor': 'start', class: 'g-gap-text' }, s, 'energy');
      }
    }

    var marks = this.markers || (this.marker != null ? [{ t: this.marker, mol: this.mols[0] }] : []);
    marks.forEach(function (mk, i) {
      var x = self.X(mk.t), y = self.Y(FlipPlot.energyAt(mk.mol, mk.t, self.top));
      el('circle', { cx: x, cy: y, r: 7, class: 'g-dot' + (i ? ' alt' : '') }, s);
      if (mk.label) el('text', { x: x + 10, y: y - 8, class: 'g-letter small' }, s, mk.label);
    });
  };

  return {
    el: el,
    svg: svg,
    chair: chair,
    flat: flat,
    newman: newman,
    newmanText: newmanText,
    klein: klein,
    kleinLayout: kleinLayout,
    kleinText: kleinText,
    clock: clock,
    FlipPlot: FlipPlot,
    defaultShow: defaultShow
  };
})();

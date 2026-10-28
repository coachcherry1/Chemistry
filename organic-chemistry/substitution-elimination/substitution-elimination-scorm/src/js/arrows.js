/* arrows.js: drawing curved arrows on a mechanism (mech.js), three ways.
 *
 *   tap or click   the electrons (a lone pair or a bond), then where they go
 *                  (an atom, or a bond for a new π bond)
 *   drag           from the electrons to where they go
 *   keyboard       Tab to the electrons, Enter; Tab to the target, Enter
 *
 * Escape lets go of a chosen tail. Tapping an arrow removes it; Undo and
 * Clear do the same. Check asks mech.js whether the arrows are the step's:
 * every arrow drawn must be one the mechanism has, and none may be missing.
 * Order does not matter, as in Klein.
 */

var Arrows = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var S = Draw.S;

  function el(tag, attrs, parent, text) { return Draw.el(tag, attrs, parent, text); }

  /* Lay out a scene's species, the anchored ones placed beside the atom
     they react with. Returns { svg, geos }. */
  function compose(scene) {
    var root = Draw.svg('mol scene arrow-svg', scene.label || (scene.title + ' mechanism: draw the curved arrows'));
    var geos = [];
    var x = 0;
    var box = [Infinity, Infinity, -Infinity, -Infinity];
    var order = scene.species.map(function (sp, i) { return i; }).sort(function (a, b) {
      return (scene.species[a].anchor ? 1 : 0) - (scene.species[b].anchor ? 1 : 0);
    });
    var gs = scene.species.map(function () { return null; });
    order.forEach(function (i) {
      var sp = scene.species[i];
      var g = el('g', { class: 'sp', 'data-sp': i }, root);
      gs[i] = g;
      var geo = Draw.mol(sp.mol, Object.assign({}, sp.opts || {}, { g: g, at: [0, 0] }));
      var dx, dy;
      if (sp.anchor) {
        var A = sp.anchor, base = geos[A.sp];
        var tp = base.P[A.atom], target;
        if (A.out != null) {
          var from = base.P[A.out];
          var ux = tp[0] - from[0], uy = tp[1] - from[1], l = Math.hypot(ux, uy) || 1;
          target = [tp[0] + ux / l * A.dist * S, tp[1] + uy / l * A.dist * S];
        } else target = [tp[0] + A.dx * S, tp[1] - A.dy * S];
        var me = geo.P[A.me];
        dx = target[0] - me[0]; dy = target[1] - me[1];
      } else {
        dx = x - geo.box[0]; dy = -((geo.box[1] + geo.box[3]) / 2);
      }
      g.setAttribute('transform', 'translate(' + dx.toFixed(1) + ',' + dy.toFixed(1) + ')');
      Draw.shiftGeo(geo, dx, dy);
      geos[i] = geo;
      box = [Math.min(box[0], geo.box[0]), Math.min(box[1], geo.box[1]), Math.max(box[2], geo.box[2]), Math.max(box[3], geo.box[3])];
      if (!sp.anchor) x = geo.box[2] + 40;
    });
    /* room for arrows to curve above and below */
    box = [box[0] - 14, box[1] - 26, box[2] + 14, box[3] + 26];
    Draw.fit(root, box, 6);
    return { svg: root, geos: geos, box: box };
  }

  /* Where an arrow key sits on the drawing. */
  function pointOf(geos, key, toward) {
    var p = key.split(':'), s = +p[1], geo = geos[s];
    if (p[0] === 'lp') {
      var list = geo.lp[p[2]];
      if (!list || !list.length) return geo.P[p[2]];
      if (!toward) return [list[0][0], list[0][1]];
      var best = list[0], bd = Infinity;
      list.forEach(function (q) { var d = Math.hypot(q[0] - toward[0], q[1] - toward[1]); if (d < bd) { bd = d; best = q; } });
      return [best[0], best[1]];
    }
    if (p[0] === 'bond') {
      var ij = p[2].split('-').map(Number);
      var a = geo.P[ij[0]], b = geo.P[ij[1]];
      return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    }
    return geo.P[p[2]];
  }

  function centroid(geos) {
    var x = 0, y = 0, n = 0;
    geos.forEach(function (g) { Object.keys(g.P).forEach(function (i) { x += g.P[i][0]; y += g.P[i][1]; n++; }); });
    return [x / n, y / n];
  }

  function bondEnds(key) { var p = key.split(':'); return { s: +p[1], ij: p[2].split('-').map(Number) }; }
  function unit(v) { var l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }
  function speciesCentre(geo) {
    var x = 0, y = 0, n = 0;
    Object.keys(geo.P).forEach(function (i) { x += geo.P[i][0]; y += geo.P[i][1]; n++; });
    return [x / n, y / n];
  }

  function headOf(H, C) {
    var tx = H[0] - C[0], ty = H[1] - C[1], tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    var hs = 9, hw = 4.6;
    return [[H[0] + tx * 2, H[1] + ty * 2], [H[0] - tx * hs - ty * hw, H[1] - ty * hs + tx * hw], [H[0] - tx * hs + ty * hw, H[1] - ty * hs - tx * hw]]
      .map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ');
  }
  function pathOf(T, C, H) {
    return 'M' + T[0].toFixed(1) + ' ' + T[1].toFixed(1) + ' Q' + C[0].toFixed(1) + ' ' + C[1].toFixed(1) + ' ' + H[0].toFixed(1) + ' ' + H[1].toFixed(1);
  }

  /* The path of an arrow from key f to key t: { d, head (polygon points), mid } */
  function geometry(geos, f, t, centre) {
    /* a bond's electrons going to one of its own atoms (loss of a leaving
       group, O–H to O): a short hook over the bond onto the atom */
    if (/^bond:/.test(f) && /^atom:/.test(t)) {
      var B = bondEnds(f), tp = t.split(':'), X = +tp[2];
      if (+tp[1] === B.s && B.ij.indexOf(X) >= 0) {
        var geo = geos[B.s], A = B.ij[0] === X ? B.ij[1] : B.ij[0];
        var PX = geo.P[X], PA = geo.P[A];
        var u = unit([PX[0] - PA[0], PX[1] - PA[1]]), n = [-u[1], u[0]];
        var sc = speciesCentre(geo), mid = [(PX[0] + PA[0]) / 2, (PX[1] + PA[1]) / 2];
        if ((mid[0] - sc[0]) * n[0] + (mid[1] - sc[1]) * n[1] < 0) n = [-n[0], -n[1]];
        if (Math.abs(n[1]) > 0.5 && n[1] > 0 && Math.abs(u[1]) < 0.5) n = [-n[0], -n[1]];
        var T1 = [mid[0] + n[0] * 5, mid[1] + n[1] * 5];
        var H1 = [PX[0] + n[0] * 13 - u[0] * 2, PX[1] + n[1] * 13 - u[1] * 2];
        var C1 = [(T1[0] + H1[0]) / 2 + n[0] * 16 + u[0] * 2, (T1[1] + H1[1]) / 2 + n[1] * 16 + u[1] * 2];
        return { d: pathOf(T1, C1, H1), head: headOf(H1, C1), mid: C1 };
      }
    }
    /* a bond's electrons moving over to the next bond (C–H to C=C) */
    if (/^bond:/.test(f) && /^bond:/.test(t)) {
      var F = bondEnds(f), Tt = bondEnds(t);
      var shared = F.s === Tt.s ? F.ij.filter(function (i) { return Tt.ij.indexOf(i) >= 0; })[0] : null;
      if (shared != null) {
        var g2 = geos[F.s], S0 = g2.P[shared];
        var e1 = g2.P[F.ij[0] === shared ? F.ij[1] : F.ij[0]], e2 = g2.P[Tt.ij[0] === shared ? Tt.ij[1] : Tt.ij[0]];
        var inside = unit([(e1[0] - S0[0]) + (e2[0] - S0[0]), (e1[1] - S0[1]) + (e2[1] - S0[1])]);
        var out = [-inside[0], -inside[1]];
        var m1 = [(e1[0] + S0[0]) / 2, (e1[1] + S0[1]) / 2], m2 = [(e2[0] + S0[0]) / 2, (e2[1] + S0[1]) / 2];
        var T2 = [m1[0] + out[0] * 3, m1[1] + out[1] * 3], H2 = [m2[0] + out[0] * 5, m2[1] + out[1] * 5];
        var C2 = [(T2[0] + H2[0]) / 2 + out[0] * 20, (T2[1] + H2[1]) / 2 + out[1] * 20];
        return { d: pathOf(T2, C2, H2), head: headOf(H2, C2), mid: C2 };
      }
    }
    var headAt = pointOf(geos, t);
    var T = pointOf(geos, f, headAt);
    var H = headAt.slice();
    var dx = H[0] - T[0], dy = H[1] - T[1], L = Math.hypot(dx, dy) || 1;
    /* stop short of an atom's label; reach right onto a bond */
    var stopAt = /^atom:/.test(t) ? 11 : 4;
    H = [H[0] - dx / L * stopAt, H[1] - dy / L * stopAt];
    var startAt = /^lp:/.test(f) ? 5 : 2;
    T = [T[0] + dx / L * startAt, T[1] + dy / L * startAt];
    dx = H[0] - T[0]; dy = H[1] - T[1]; L = Math.hypot(dx, dy) || 1;
    var nx = -dy / L, ny = dx / L;
    var mid2 = [(T[0] + H[0]) / 2, (T[1] + H[1]) / 2];
    /* bulge away from the middle of the picture, or the way a lone pair faces */
    var side = ((mid2[0] + nx - centre[0]) * nx + (mid2[1] + ny - centre[1]) * ny) > 0 ? 1 : -1;
    if (/^lp:/.test(f)) {
      var p = f.split(':');
      var tail = pointOf(geos, f, headAt);
      (geos[+p[1]].lp[p[2]] || []).forEach(function (q) {
        if (Math.abs(q[0] - tail[0]) < 0.5 && Math.abs(q[1] - tail[1]) < 0.5) side = (q[2][0] * nx + q[2][1] * ny) > 0 ? 1 : -1;
      });
    }
    var bulge = Math.max(16, Math.min(46, 0.42 * L));
    var C = [mid2[0] + nx * bulge * side, mid2[1] + ny * bulge * side];
    return { d: pathOf(T, C, H), head: headOf(H, C), mid: C };
  }

  /* Names for the aria labels. */
  function atomName(sp, i, num) {
    var a = sp.mol.atoms[i];
    var who = sp.who ? ' of ' + sp.who : '';
    if (a.el === 'C') return (num[i] ? 'C' + num[i] : 'carbon') + (a.charge > 0 ? ' (the carbocation)' : '') + who;
    return a.el + who;
  }

  function Tool(scene, opts) {
    opts = opts || {};
    var built = compose(scene);
    var svgEl = built.svg, geos = built.geos;
    var centre = centroid(geos);
    var drawn = [];
    var chosen = null, locked = false, labels = false;
    var nums = scene.species.map(function (sp) {
      try { return Name.numbers(sp.mol); } catch (e) { return {}; }
    });
    /* drawn arrows sit under the targets, so an arrow never hides an atom
       or a bond a student wants to tap; tapping the open part of an arrow
       removes it */
    var arrowsG = el('g', { class: 'arrows' }, svgEl);
    var layer = el('g', { class: 'hits' }, svgEl);
    var live = el('path', { class: 'arw live', d: '' }, svgEl);

    function hit(key, cls, label, draw) {
      var g = el('g', { class: cls, 'data-key': key, tabindex: 0, role: 'button', 'aria-label': label }, layer);
      draw(g);
      return g;
    }
    /* bonds first, then atoms, then lone pairs on top */
    scene.species.forEach(function (sp, s) {
      var geo = geos[s];
      sp.mol.bonds.forEach(function (b, k) {
        if (!geo.P[b.a] || !geo.P[b.b]) return;
        var key = Mech.keys.bk(s, b.a, b.b);
        var nm = atomName(sp, b.a, nums[s]).replace(/ \(.*\)/, '') + '–' + atomName(sp, b.b, nums[s]).replace(/ \(.*\)/, '') + ' bond';
        hit(key, 'src tgt bond', nm, function (g) {
          var A = geo.P[b.a], B = geo.P[b.b];
          el('line', { x1: A[0].toFixed(1), y1: A[1].toFixed(1), x2: B[0].toFixed(1), y2: B[1].toFixed(1), class: 'bond-hit' }, g);
        });
      });
    });
    scene.species.forEach(function (sp, s) {
      var geo = geos[s];
      Object.keys(geo.P).forEach(function (i) {
        var key = Mech.keys.ak(s, +i);
        hit(key, 'tgt atom', atomName(sp, +i, nums[s]), function (g) {
          el('circle', { cx: geo.P[i][0].toFixed(1), cy: geo.P[i][1].toFixed(1), r: 11, class: 'hit' }, g);
        });
      });
    });
    scene.species.forEach(function (sp, s) {
      var geo = geos[s];
      Object.keys(geo.lp).forEach(function (i) {
        var key = Mech.keys.lk(s, +i);
        geo.lp[i].forEach(function (q, n) {
          hit(key, 'src lp', 'lone pair ' + (n + 1) + ' on ' + atomName(sp, +i, nums[s]), function (g) {
            el('circle', { cx: q[0].toFixed(1), cy: q[1].toFixed(1), r: 8.5, class: 'hit' }, g);
          });
        });
      });
    });

    function keyOf(node) {
      var g = node && node.closest ? node.closest('[data-key]') : null;
      return g && svgEl.contains(g) ? g : null;
    }

    function paint() {
      arrowsG.innerHTML = '';
      drawn.forEach(function (a, k) {
        var gm = geometry(geos, a.from, a.to, centre);
        var g = el('g', { class: 'arw-g', 'data-arrow': k }, arrowsG);
        el('path', { d: gm.d, class: 'arw' + (a.bad ? ' bad' : '') }, g);
        el('polygon', { points: gm.head, class: 'arw-head' }, g);
        el('path', { d: gm.d, class: 'arw-hit', 'aria-hidden': 'true' }, g);
        if (labels && a.pattern) {
          /* a numbered badge; the step lists what each number is */
          el('circle', { cx: gm.mid[0].toFixed(1), cy: gm.mid[1].toFixed(1), r: 8, class: 'arw-badge' }, g);
          el('text', { x: gm.mid[0].toFixed(1), y: (gm.mid[1] + 4).toFixed(1), class: 'arw-num', 'text-anchor': 'middle' }, g, String(k + 1));
        }
      });
      var nodes = layer.querySelectorAll('.src');
      for (var i = 0; i < nodes.length; i++) nodes[i].classList.toggle('chosen', !!chosen && nodes[i].getAttribute('data-key') === chosen);
      count.textContent = drawn.length === 1 ? '1 arrow' : drawn.length + ' arrows';
      if (opts.onChange) opts.onChange(drawn.length);
    }

    function choose(key, node) {
      if (locked) return;
      if (chosen == null) {
        if (/^atom:/.test(key)) { say(Mech.judge(scene, [{ from: key, to: key + 'x' }]).msg, 'bad'); return; }
        chosen = key;
        say('Now choose where those electrons go: an atom, or a bond. (Escape to let go.)', '');
        paint();
        return;
      }
      if (key === chosen) { chosen = null; say('', ''); paint(); return; }
      if (/^lp:/.test(key)) { chosen = key; paint(); return; }
      drawn.push({ from: chosen, to: key });
      chosen = null;
      say('', '');
      paint();
    }

    function say(t, k) { if (opts.say) opts.say(t, k); }

    /* tap or click */
    var press = null;
    svgEl.addEventListener('pointerdown', function (ev) {
      if (locked) return;
      var arr = ev.target.closest && ev.target.closest('.arw-g');
      if (arr) { drawn.splice(+arr.getAttribute('data-arrow'), 1); paint(); ev.preventDefault(); return; }
      var g = keyOf(ev.target);
      if (!g) return;
      press = { key: g.getAttribute('data-key'), x: ev.clientX, y: ev.clientY, moved: false };
      try { svgEl.setPointerCapture(ev.pointerId); } catch (e) { /* fine */ }
    });
    svgEl.addEventListener('pointermove', function (ev) {
      if (!press || locked) return;
      if (!press.moved && Math.hypot(ev.clientX - press.x, ev.clientY - press.y) < 7) return;
      press.moved = true;
      if (/^atom:/.test(press.key)) return;
      var pt = svgEl.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      var loc = pt.matrixTransform(svgEl.getScreenCTM().inverse());
      var T = pointOf(geos, press.key, [loc.x, loc.y]);
      live.setAttribute('d', 'M' + T[0].toFixed(1) + ' ' + T[1].toFixed(1) + ' L' + loc.x.toFixed(1) + ' ' + loc.y.toFixed(1));
      var over = document.elementFromPoint(ev.clientX, ev.clientY);
      var g = keyOf(over);
      var ns = layer.querySelectorAll('.tgt');
      for (var i = 0; i < ns.length; i++) ns[i].classList.toggle('hover', ns[i] === g);
    });
    function up(ev) {
      if (!press) return;
      var p = press;
      press = null;
      live.setAttribute('d', '');
      var ns = layer.querySelectorAll('.tgt.hover');
      for (var i = 0; i < ns.length; i++) ns[i].classList.remove('hover');
      if (locked) return;
      if (!p.moved) { choose(p.key); return; }
      if (/^atom:/.test(p.key)) { say(Mech.judge(scene, [{ from: p.key, to: p.key + 'x' }]).msg, 'bad'); return; }
      var over = document.elementFromPoint(ev.clientX, ev.clientY);
      var g = keyOf(over);
      if (!g) return;
      var to = g.getAttribute('data-key');
      if (to === p.key) return;
      drawn.push({ from: p.key, to: to });
      chosen = null;
      paint();
    }
    svgEl.addEventListener('pointerup', up);
    svgEl.addEventListener('pointercancel', function () { press = null; live.setAttribute('d', ''); });
    /* keyboard */
    svgEl.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { chosen = null; paint(); say('', ''); return; }
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      var g = keyOf(ev.target);
      if (!g) return;
      ev.preventDefault();
      choose(g.getAttribute('data-key'));
    });

    var count = document.createElement('span');
    count.className = 'count';
    var undo = btn('Undo last arrow', function () { if (!locked && drawn.length) { drawn.pop(); paint(); } });
    var clear = btn('Clear', function () { if (!locked) { drawn = []; chosen = null; paint(); } });
    var check = btn('Check', function () { if (opts.onCheck) opts.onCheck(result()); }, 'primary');
    function btn(t, f, cls) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = cls || 'ghostbtn'; b.textContent = t;
      b.addEventListener('click', f);
      return b;
    }
    var tools = document.createElement('div');
    tools.className = 'arrow-tools';
    [check, undo, clear, count].forEach(function (n) { tools.appendChild(n); });
    var node = document.createElement('div');
    node.className = 'arrow-tool';
    node.__scene = scene;      /* for tools/walkthrough.js */
    node.appendChild(svgEl);
    node.appendChild(tools);
    paint();

    function result() {
      var r = Mech.judge(scene, drawn);
      drawn.forEach(function (d, k) { d.bad = r.bad === k; });
      paint();
      return r;
    }

    /* the mechanism's own arrows, each named for its pattern */
    function show(withLabels) {
      drawn = scene.arrows.map(function (a) { return { from: a.from[0], to: a.to[0], pattern: a.pattern }; });
      labels = withLabels !== false;
      locked = true;
      chosen = null;
      tools.hidden = true;
      paint();
    }
    function done() {
      var r = Mech.judge(scene, drawn);
      drawn.forEach(function (d, k) { if (r.matched[k] >= 0) d.pattern = scene.arrows[r.matched[k]].pattern; });
      labels = true; locked = true; tools.hidden = true;
      paint();
    }

    return { node: node, svg: svgEl, drawn: function () { return drawn.slice(); }, set: function (list) { drawn = list.slice(); paint(); },
             show: show, done: done, check: result, scene: scene, geos: geos,
             legend: function () { return drawn.map(function (a, k) { return (k + 1) + '  ' + (a.pattern || ''); }); } };
  }

  /* A static picture of a mechanism with given arrows (for questions). */
  function figure(scene, arrows, o) {
    var built = compose(scene);
    var centre = centroid(built.geos);
    var g = el('g', { class: 'arrows' }, built.svg);
    arrows.forEach(function (a) {
      var gm = geometry(built.geos, a.from, a.to, centre);
      el('path', { d: gm.d, class: 'arw' }, g);
      el('polygon', { points: gm.head, class: 'arw-head' }, g);
    });
    built.svg.setAttribute('aria-label', (o && o.label) || scene.title + ' with curved arrows');
    return built.svg;
  }

  return { Tool: Tool, figure: figure, compose: compose };
})();

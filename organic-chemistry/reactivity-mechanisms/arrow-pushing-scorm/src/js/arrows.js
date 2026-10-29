/* arrows.js: drawing curved arrows on a scene, three ways (as in the SN1,
 * SN2, E1 and E2 activity).
 *
 *   tap or click   the electrons (a lone pair or a bond), then where they go
 *                  (an atom, or a bond for a new pi bond)
 *   drag           from the electrons to where they go
 *   keyboard       Tab to the electrons, Enter; Tab to the target, Enter
 *
 * Escape lets go of a chosen tail. Tapping an arrow removes it; Undo and
 * Clear do the same. Check asks judge.js. Order never matters.
 */

var Arrows = (function () {
  'use strict';

  var el = Render.el;

  function Tool(sc, opts) {
    opts = opts || {};
    var st = sc.before;
    var root = Render.svg('arrow-svg', opts.label || (sc.title || 'Mechanism') + ': draw the curved arrows');
    var geo = Render.draw(st, { g: root, scale: opts.scale });
    /* room for arrows to curve above and below */
    var box = [geo.box[0] - 18, geo.box[1] - 30, geo.box[2] + 18, geo.box[3] + 30];
    Render.fit(root, box, 6);
    var drawn = [], chosen = null, locked = false, numbers = false, pats = null;
    var arrowsG = el('g', { class: 'arrows' }, root);
    var layer = el('g', { class: 'hits' }, root);
    var live = el('path', { class: 'arw live', d: '' }, root);
    var who = function (id) { return Judge.name(sc, st, id); };

    function hit(key, cls, label, draw) {
      var g = el('g', { class: cls, 'data-key': key, tabindex: 0, role: 'button', 'aria-label': label }, layer);
      draw(g);
      return g;
    }
    st.bonds.forEach(function (b) {
      var A = geo.P[b.a], B = geo.P[b.b];
      hit(Chem.keys.bond(b.a, b.b), 'src tgt bond', (b.o === 2 ? 'double bond' : b.o === 3 ? 'triple bond' : 'bond') + ' between ' + who(b.a) + ' and ' + who(b.b), function (g) {
        el('line', { x1: A[0].toFixed(1), y1: A[1].toFixed(1), x2: B[0].toFixed(1), y2: B[1].toFixed(1), class: 'bond-hit' }, g);
      });
    });
    st.atoms.forEach(function (a) {
      var p = geo.P[a.id];
      hit(Chem.keys.atom(a.id), 'tgt atom', who(a.id), function (g) {
        el('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 11, class: 'hit' }, g);
      });
    });
    st.atoms.forEach(function (a) {
      (geo.lp[a.id] || []).forEach(function (q, n) {
        hit(Chem.keys.lp(a.id), 'src lp', 'lone pair ' + (n + 1) + ' on ' + who(a.id), function (g) {
          el('circle', { cx: q[0].toFixed(1), cy: q[1].toFixed(1), r: 8.5, class: 'hit' }, g);
        });
      });
    });

    function keyOf(node) {
      var g = node && node.closest ? node.closest('[data-key]') : null;
      return g && root.contains(g) ? g : null;
    }

    var badge = { pt: 'Proton transfer', nuc: 'Nucleophilic attack', lg: 'Loss of a leaving group', shift: 'Carbocation rearrangement' };
    function paint() {
      arrowsG.innerHTML = '';
      drawn.forEach(function (a, k) {
        var A = Render.arrowPath(geo, st, a.from, a.to);
        var g = el('g', { class: 'arw-g' + (a.bad ? ' bad' : ''), 'data-arrow': k }, arrowsG);
        el('path', { d: A.d, class: 'arw' }, g);
        el('polygon', { points: A.head, class: 'arw-head' }, g);
        el('path', { d: A.d, class: 'arw-hit', 'aria-hidden': 'true' }, g);
        if (numbers) {
          el('circle', { cx: A.C[0].toFixed(1), cy: A.C[1].toFixed(1), r: 8, class: 'arw-badge' }, g);
          el('text', { x: A.C[0].toFixed(1), y: (A.C[1] + 4).toFixed(1), class: 'arw-num', 'text-anchor': 'middle' }, g, String(k + 1));
        }
      });
      var nodes = layer.querySelectorAll('.src');
      for (var i = 0; i < nodes.length; i++) nodes[i].classList.toggle('chosen', !!chosen && nodes[i].getAttribute('data-key') === chosen);
      count.textContent = drawn.length === 1 ? '1 arrow' : drawn.length + ' arrows';
      if (opts.onChange) opts.onChange(drawn.length);
    }

    function say(t, k) { if (opts.say) opts.say(t, k); }

    function choose(key) {
      if (locked) return;
      if (chosen == null) {
        if (/^atom:/.test(key)) { say(Judge.judge(sc, [{ from: key, to: key }]).msg, 'bad'); return; }
        chosen = key;
        say('Now choose where those electrons go: an atom, or a bond. (Escape lets go.)', '');
        paint();
        return;
      }
      if (key === chosen) { chosen = null; say('', ''); paint(); return; }
      if (/^lp:/.test(key)) { chosen = key; paint(); return; }
      add(chosen, key);
    }
    function add(f, t) {
      drawn.forEach(function (d) { d.bad = false; });
      drawn.push({ from: f, to: t });
      chosen = null;
      say('', '');
      paint();
    }

    var press = null;
    root.addEventListener('pointerdown', function (ev) {
      if (locked) return;
      var arr = ev.target.closest && ev.target.closest('.arw-g');
      if (arr) { drawn.splice(+arr.getAttribute('data-arrow'), 1); paint(); ev.preventDefault(); return; }
      var g = keyOf(ev.target);
      if (!g) return;
      press = { key: g.getAttribute('data-key'), x: ev.clientX, y: ev.clientY, moved: false };
      try { root.setPointerCapture(ev.pointerId); } catch (e) { /* fine */ }
    });
    root.addEventListener('pointermove', function (ev) {
      if (!press || locked) return;
      if (!press.moved && Math.hypot(ev.clientX - press.x, ev.clientY - press.y) < 7) return;
      press.moved = true;
      if (/^atom:/.test(press.key)) return;
      var pt = root.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      var loc = pt.matrixTransform(root.getScreenCTM().inverse());
      var T = Render.pointOf(geo, press.key, [loc.x, loc.y]);
      live.setAttribute('d', 'M' + T[0].toFixed(1) + ' ' + T[1].toFixed(1) + ' L' + loc.x.toFixed(1) + ' ' + loc.y.toFixed(1));
      var g = keyOf(document.elementFromPoint(ev.clientX, ev.clientY));
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
      if (/^atom:/.test(p.key)) { say(Judge.judge(sc, [{ from: p.key, to: p.key }]).msg, 'bad'); return; }
      var g = keyOf(document.elementFromPoint(ev.clientX, ev.clientY));
      if (!g) return;
      var to = g.getAttribute('data-key');
      if (to === p.key) return;
      add(p.key, to);
    }
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', function () { press = null; live.setAttribute('d', ''); });
    root.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') { chosen = null; paint(); say('', ''); return; }
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      var g = keyOf(ev.target);
      if (!g) return;
      ev.preventDefault();
      choose(g.getAttribute('data-key'));
    });

    function btn(t, f, cls) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = cls || 'ghostbtn'; b.textContent = t;
      b.addEventListener('click', f);
      return b;
    }
    var count = document.createElement('span');
    count.className = 'count';
    var check = btn(opts.checkText || 'Check', function () { if (!locked && opts.onCheck) opts.onCheck(result()); }, 'primary');
    var undo = btn('Undo last arrow', function () { if (!locked && drawn.length) { drawn.pop(); paint(); } });
    var clear = btn('Clear', function () { if (!locked) { drawn = []; chosen = null; paint(); } });
    var tools = document.createElement('div');
    tools.className = 'arrow-tools';
    [check, undo, clear, count].forEach(function (n) { tools.appendChild(n); });
    var node = document.createElement('div');
    node.className = 'arrow-tool';
    node.__scene = sc;          /* for tools/walkthrough.js */
    node.appendChild(root);
    node.appendChild(tools);
    paint();

    function result() {
      var r = Judge.judge(sc, drawn);
      drawn.forEach(function (d, k) { d.bad = r.bad === k; });
      paint();
      return r;
    }
    /* the step's own arrows, numbered */
    function show() {
      drawn = sc.arrows.map(function (a) { return { from: a.from, to: a.to }; });
      lock();
    }
    function lock() {
      numbers = drawn.length > 1;
      locked = true; chosen = null; tools.hidden = true;
      root.classList.add('locked');
      paint();
    }
    function legend() {
      if (!pats) pats = Judge.arrowPatterns(sc);
      return drawn.map(function (a, k) {
        var r = Judge.judge(sc, drawn);
        var m = r.matched && r.matched[k] >= 0 ? sc.picks[r.matched[k]] : null;
        return m ? Judge.describe(sc, st, m) : '';
      });
    }
    return { node: node, svg: root, geo: geo, drawn: function () { return drawn.slice(); },
             set: function (list) { drawn = list.map(function (a) { return { from: a.from, to: a.to }; }); paint(); },
             show: show, lock: lock, check: result, legend: legend, scene: sc };
  }

  /* A still picture of a scene with arrows (for questions and cards). */
  function figure(sc, arrows, o) {
    o = o || {};
    var s = Render.draw(sc.before, { arrows: arrows || sc.arrows, scale: o.scale || 38, label: o.label || (sc.title + ' with curved arrows'), pad: 10 });
    return s;
  }

  return { Tool: Tool, figure: figure };
})();

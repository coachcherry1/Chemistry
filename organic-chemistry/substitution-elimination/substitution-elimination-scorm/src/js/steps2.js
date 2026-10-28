/* steps2.js: Parts 3 and 4.
 *
 *   newman     E2 in a Newman projection, looking from the α carbon down to a
 *              β carbon: turn the back carbon until an H is anti-coplanar to
 *              the leaving group, then eliminate (mode anti, selective,
 *              specific)
 *   regio      Klein's four steps for the regiochemical outcome of an E2
 *   e1         E1 in two steps, and the SN1 that competes with it
 *   ringanti   trans-diaxial: the H atoms anti-coplanar to an axial Cl
 *   ringregio  cis- and trans-1-chloro-2-methylcyclohexane: regioselective
 *              and regiospecific
 *   locked     a tert-butyl group locks the chair
 *   sortsel    regioselective, regiospecific, stereoselective or stereospecific?
 */

(function () {
  'use strict';

  var U = App.U, h = U.h, R = App.RENDER, P = App.PREDICT;
  var G = GEOM;
  function stage() { return U.stage(); }
  function smooth(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

  /* ------------------------------------------------ the Newman E2 widget */

  /* Angles (clockwise from the top, as the eye sees them looking from a to
     b) of every atom bonded to a or b in the model, at positions `atoms`. */
  function anglesIn(md, atoms, a, b) {
    var A = atoms[a].p, B = atoms[b].p;
    var W = G.unit(G.sub(B, A));
    var UP = G.unit(G.sub([0, 1, 0], G.mul(W, W[1])));
    var RIGHT = G.cross(W, UP);
    function ang(from, to) {
      var d = G.sub(to, from), p = G.sub(d, G.mul(W, G.dot(d, W)));
      var t = Math.atan2(G.dot(p, RIGHT), G.dot(p, UP)) * 180 / Math.PI;
      return ((t % 360) + 360) % 360;
    }
    function list(c, other) {
      var out = [];
      md.bonds.forEach(function (bd) {
        var j = bd.a === c ? bd.b : bd.b === c ? bd.a : -1;
        if (j < 0 || j === other) return;
        out.push({ i: j, a: ang(atoms[c].p, atoms[j].p) });
      });
      return out;
    }
    return { front: list(a, b), back: list(b, a) };
  }

  /* The alkene a conformer gives: the group at 120° on the front carbon and
     the one at 60° on the back carbon end up cis. */
  function conformerAlkene(m, L, beta, md, nm) {
    function gOf(i) { return md.atoms[i].h ? -1 : md.atoms[i].g; }
    function near(list, a) { return list.filter(function (x) { return Math.abs(((x.a - a + 540) % 360) - 180) < 20; })[0]; }
    var f120 = near(nm.front, 120), f240 = near(nm.front, 240), b60 = near(nm.back, 60), b300 = near(nm.back, 300);
    if (!f120 || !b60) return React.alkene(m, L.a, beta, L.x, null);
    var na = gOf(f120.i), nb = gOf(b60.i), cfg;
    if (na >= 0 && nb >= 0) cfg = { na: na, nb: nb, rel: 'cis' };
    else if (na >= 0) cfg = { na: na, nb: gOf(b300.i), rel: 'trans' };
    else if (nb >= 0) cfg = { na: gOf(f240.i), nb: nb, rel: 'trans' };
    else cfg = { na: gOf(f240.i), nb: gOf(b300.i), rel: 'cis' };
    return React.alkene(m, L.a, beta, L.x, cfg);
  }

  function NewmanE2(m, beta, o) {
    o = o || {};
    var L = React.lg(m);
    var twist = o.twist || 0;
    var e = null, elim = false, prog = 0;
    var host = h('div', { class: 'newman-host' });
    var vb = U.viewerBox({ span: [3.0, 3.0], R: G.mmul(Viewer3D.rotX(0.12), Viewer3D.rotY(Math.PI / 2 - 0.45)), center: [0.77, 0, 0],
      label: '3D model looking down the C–C bond. Drag or use the arrow keys to turn it.' });
    var status = h('p', { class: 'rule' });
    var left = h('button', { type: 'button', class: 'mini', text: '↺ Turn the back carbon 60°' });
    var right = h('button', { type: 'button', class: 'mini', text: '↻ Turn it 60° the other way' });
    var go = h('button', { type: 'button', class: 'primary', text: 'Eliminate', disabled: true });
    var again = h('button', { type: 'button', class: 'ghostbtn', text: 'Back to the substrate', hidden: true });
    var sl = U.slider(function (p) { prog = p; paint(); if (p >= 0.98 && o.onDone) o.onDone(product(), twist); }, { from: 'Anti-coplanar', to: 'Alkene' });
    sl.node.hidden = true;
    var turns = h('div', { class: 'turnbar' }, [left, right]);
    var node = h('div', { class: 'work' }, [
      h('div', null, [host, turns]),
      h('div', null, [vb.node, status, h('div', { class: 'btnrow' }, [go, again]), sl.node])
    ]);

    function rebuild() { e = Anim.e2(m, beta, twist, 'NaOEt'); }
    function gOf(i) { return e.model.atoms[i].h ? -1 : e.model.atoms[i].g; }
    function label(i, from) {
      var g = gOf(i);
      return { text: Draw.groupText(m, from, g), el: g < 0 ? 'H' : m.atoms[g].el };
    }
    function staggered() { return Math.round(((twist % 120) + 120) % 120) === 0; }
    function product() { return conformerAlkene(m, L, beta, e.model, Build3D.newman(e.model, e.a, e.b)); }
    function info() {
      var nm = Build3D.newman(e.model, e.a, e.b);
      var anti = nm.back.filter(function (x) { return Math.abs(x.a - 180) < 3; })[0];
      var syn = nm.back.filter(function (x) { return x.a < 3 || x.a > 357; })[0];
      return { nm: nm, anti: anti, syn: syn };
    }

    function paint() {
      var frame = e.ok && elim ? e.frame(prog) : { atoms: e.model.atoms, bonds: e.model.bonds };
      var nm = anglesIn(e.model, frame.atoms, e.a, e.b);
      var it = info();
      var off = staggered() ? 0 : 12;
      var fade = elim ? 1 - smooth((prog - 0.35) / 0.4) : 1;
      /* end on, the alkene's groups line up; as Klein draws it, the front
         carbon's sit just above the line and the back carbon's just below */
      var spread = elim ? 12 * smooth((prog - 0.25) / 0.6) : 0;
      function lift(a, front) { return a + (a < 180 ? -1 : 1) * (front ? spread : -spread); }
      /* carbon groups gauche to each other across the bond: crowded */
      var crowded = {};
      if (o.crowd) nm.front.forEach(function (f) {
        nm.back.forEach(function (b) {
          var gf = gOf(f.i), gb = gOf(b.i);
          if (gf < 0 || gb < 0 || m.atoms[gf].el !== 'C' || m.atoms[gb].el !== 'C') return;
          var d = Math.abs(((f.a - b.a) % 360 + 540) % 360 - 180);
          if (d < 75) { crowded[f.i] = 1; crowded[b.i] = 1; }
        });
      });
      var front = nm.front.map(function (x) {
        var g = gOf(x.i), lb = label(x.i, L.a);
        var cls = g === L.x ? 'lg' : (crowded[x.i] ? 'crowd' : '');
        return { a: g === L.x ? x.a : lift(x.a, true), text: lb.text, el: lb.el, cls: cls, alpha: g === L.x ? fade : null };
      });
      var back = nm.back.map(function (x) {
        var g = gOf(x.i), lb = label(x.i, beta);
        var isAnti = staggered() && it.anti && it.anti.i === x.i && e.model.atoms[x.i].el === 'H';
        var cls = isAnti ? 'hh' : (crowded[x.i] ? 'crowd' : '');
        return { a: isAnti ? x.a + off : lift(x.a + off, false), text: lb.text, el: lb.el, cls: cls, alpha: isAnti && elim ? fade : null };
      });
      host.innerHTML = '';
      var svg = Draw.newman({ front: front, back: back }, { flat: elim ? smooth((prog - 0.6) / 0.35) : 0,
        label: o.label ? o.label(front, back) : null });
      host.appendChild(svg);
      if (vb.viewer()) vb.viewer().setFrame(frame);
      var ok = staggered() && it.anti && e.model.atoms[it.anti.i].el === 'H';
      if (!elim) {
        go.disabled = !ok;
        var X = m.atoms[L.x].el;
        if (ok) { status.className = 'rule ok'; status.textContent = 'Anti-coplanar: the H at the bottom is opposite the ' + X + ', in the same plane. E2 can happen.'; }
        else if (!staggered() && it.syn && e.model.atoms[it.syn.i].el === 'H') { status.className = 'rule wait'; status.textContent = 'Syn-coplanar: this H is eclipsed with the ' + X + '. Eclipsed is high in energy, so E2 almost never goes this way.'; }
        else if (!staggered()) { status.className = 'rule wait'; status.textContent = 'Eclipsed: high in energy. Turn on to a staggered conformation.'; }
        else { status.className = 'rule wait'; status.textContent = 'No H is anti-coplanar to the ' + X + ': a ' + Draw.groupText(m, beta, gOf(it.anti.i)) + ' is. Turn the back carbon.'; }
      }
    }

    function turnTo(target) {
      if (elim) return;
      var from = twist;
      if (U.reduceMotion) { twist = target; rebuild(); paint(); after(); return; }
      var t0 = null;
      function step(ts) {
        if (t0 == null) t0 = ts;
        var f = Math.min(1, (ts - t0) / 320);
        twist = from + (target - from) * smooth(f);
        rebuild(); paint();
        if (f < 1) requestAnimationFrame(step); else { twist = target; rebuild(); paint(); after(); }
      }
      requestAnimationFrame(step);
    }
    function after() { if (o.onTurn) o.onTurn(twist, info()); }
    left.addEventListener('click', function () { turnTo(Math.round(twist / 60) * 60 - 60); });
    right.addEventListener('click', function () { turnTo(Math.round(twist / 60) * 60 + 60); });
    /* drag round the Newman projection to turn the back carbon */
    var drag = null;
    host.addEventListener('pointerdown', function (ev) {
      if (elim) return;
      var r = host.getBoundingClientRect();
      drag = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, a0: Math.atan2(ev.clientX - (r.left + r.width / 2), -(ev.clientY - (r.top + r.height / 2))), t0: twist };
      try { host.setPointerCapture(ev.pointerId); } catch (e2) { /* fine */ }
    });
    host.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      var a = Math.atan2(ev.clientX - drag.cx, -(ev.clientY - drag.cy));
      twist = drag.t0 + (a - drag.a0) * 180 / Math.PI;
      rebuild(); paint();
    });
    function endDrag() { if (!drag) return; drag = null; turnTo(Math.round(twist / 60) * 60); }
    host.addEventListener('pointerup', endDrag);
    host.addEventListener('pointercancel', endDrag);
    go.addEventListener('click', function () {
      elim = true; prog = 0;
      go.hidden = true; turns.hidden = true; sl.node.hidden = false; again.hidden = false;
      status.className = 'rule ok';
      status.textContent = 'EtO⁻ takes the anti-coplanar H as the ' + m.atoms[L.x].el + '⁻ leaves. Both carbons flatten and their p orbitals line up into the π bond.';
      paint();
      if (o.onStart) o.onStart();
      if (!U.reduceMotion) sl.play.click();
    });
    function reset() { sl.stop(); elim = false; prog = 0; go.hidden = false; turns.hidden = false; sl.node.hidden = true; again.hidden = true; sl.range.value = 0; rebuild(); paint(); after(); }
    again.addEventListener('click', reset);
    rebuild();
    return {
      node: node,
      start: function () { vb.start(); paint(); after(); },
      reset: reset,
      product: product, twist: function () { return twist; }
    };
  }

  /* ============================================================ newman */

  R.newman = function (s) {
    var pr = U.progress(s.id);
    var top = h('div'), area = h('div'), out = h('div');
    stage().appendChild(top); stage().appendChild(area); stage().appendChild(out);
    var Pq = s.mode === 'anti' ? P.anti : null;
    var ids = s.mols || [s.mol];
    var k = pr.k || 0;
    pr.got = pr.got || {};

    function paintTop() {
      top.innerHTML = '';
      if (!Pq) return;
      top.appendChild(U.panel('Your prediction', null, [U.predictCard(Pq, pr.p, function (i) {
        pr.p = i; U.persist(); paintTop(); paint(); U.showArea(area);
      })]));
      if (pr.p != null) top.appendChild(U.reveal([U.verdict(Pq, pr.p) + 'Anti-coplanar: the H and the leaving group on opposite sides of the C–C bond, all in one plane. ' +
        'Looking down the bond, that is a staggered conformation with the H straight across from the leaving group. Syn-coplanar (eclipsed) is possible but high in energy.']));
    }
    paintTop();

    function betaOf(m) {
      var L = React.lg(m);
      var bs = React.betas(m, L.a).filter(function (b) { return b.h; });
      if (s.mode === 'specific') return bs.filter(function (b) { return b.h === 1; })[0].b;
      if (s.mode === 'selective') return bs.filter(function (b) { return b.h === 2; })[0].b;
      /* anti: the CH₂ */
      return bs.filter(function (b) { return b.h === 2; })[0].b;
    }

    var w = null;
    function paint() {
      area.innerHTML = '';
      if (Pq && pr.p == null) return;
      var m = mol(ids[k]);
      var L = React.lg(m), beta = betaOf(m);
      var num = Name.numbers(m);
      /* start where no H is anti-coplanar, so the student has to turn it */
      var start = [0, 120, 240].filter(function (tw) { return !Anim.e2(m, beta, tw, 'NaOEt').ok; })[0];
      w = NewmanE2(m, beta, {
        twist: start != null ? start : 60,
        crowd: s.mode === 'selective',
        onTurn: function () {},
        onDone: function (prod) {
          var n = Name.name(prod);
          if (!pr.got[n]) { pr.got[n] = 1; U.persist(); }
          showOut(m, prod);
        }
      });
      var chips = ids.length > 1 ? U.chipRow('Substrate', ids.map(function (id) { return molName(mol(id)); }), k,
        function (i) { return doneFor(i); }, function (i) { return i === 0 || doneFor(0) && pr.p2 != null; }, function (i) { k = i; pr.k = k; U.persist(); paint(); }) : null;
      area.appendChild(U.panel('Looking down C' + num[L.a] + '–C' + num[beta], molName(m) + ' and NaOEt', [chips,
        h('div', { class: 'work' }, [h('div', null, [U.molCard(m, { draw: { numbers: true } })]), h('div', { class: 'muted', text:
          'Front carbon: C' + num[L.a] + ', with the ' + m.atoms[L.x].el + ' at the top. Back carbon: C' + num[beta] + ' (the circle). Drag round the projection or use the buttons to turn the back carbon.' })]),
        w.node]));
      w.start();
      showOut(m, null);
    }

    function doneFor(i) {
      var m = mol(ids[i]);
      var names = React.e2From(m, React.lg(m).a, betaOf(m), React.lg(m).x).map(function (p) { return Name.name(p.mol); });
      return names.every(function (n) { return pr.got[n]; });
    }

    function showOut(m, prod) {
      out.innerHTML = '';
      var L = React.lg(m), beta = betaOf(m);
      var all = React.e2From(m, L.a, beta, L.x);
      var made = all.filter(function (p) { return pr.got[Name.name(p.mol)]; });
      if (!made.length) return;
      var cards = made.map(function (p) { return U.molCard(p.mol); });
      var lines = [];
      if (s.mode === 'anti') {
        lines.push('The base took the H anti-coplanar to the Br: proton transfer and loss of the leaving group in one step. The alkene’s two carbons and the four groups on them now lie in one plane.');
        if (!U.isDone(s.id)) U.complete();
      }
      if (s.mode === 'selective') {
        if (made.length < 2) lines.push('Now press Back to the substrate, turn the back carbon so the other H is anti-coplanar, and eliminate again.');
        else {
          lines.push('Each H gives a different stereoisomer. With the H that gives the (Z) alkene anti, the CH₃ on the back carbon is gauche to the CH₂CH₃ on the front carbon: crowded. With the other H, the CH₃ sits next to a front H.');
          var maj = all.filter(function (p) { return p.how === 'selective-major'; })[0];
          var Pp = Object.assign({}, P.selective, { choices: [Name.name(maj.mol), Name.name(all.filter(function (p) { return p !== maj; })[0].mol), 'Equal amounts of each'] });
          out.appendChild(U.panel('Products', null, [h('div', { class: 'pair-row' }, cards), U.reveal(lines)]));
          out.appendChild(U.panel('Which is major?', null, [U.predictCard(Pp, pr.p, function (i) { pr.p = i; U.persist(); showOut(m, prod); })]));
          if (pr.p != null) {
            out.appendChild(U.reveal([U.verdict(Pp, pr.p) + 'The less crowded transition state wins: ' + Name.name(maj.mol) + ', with the larger groups trans, is the major product, and the other is minor.']));
            out.appendChild(U.def('Stereoselective', 'two stereoisomers can form and one is major. The E2 of a substrate whose β carbon has two H atoms is stereoselective.'));
            if (!U.isDone(s.id)) U.complete();
          }
          return;
        }
      }
      if (s.mode === 'specific') {
        var other = React.e2From(m, L.a, beta, L.x);
        lines.push('C3 has only one H, so only one conformation puts an H anti-coplanar to the Br, and only one stereoisomer can form: ' + Name.name(other[0].mol) + '.');
        out.appendChild(U.panel('Product', null, [h('div', { class: 'pair-row' }, cards), U.reveal(lines)]));
        if (k === 0) {
          var Ps = P.specific;
          out.appendChild(U.panel('The diastereomer', null, [U.predictCard(Ps, pr.p2, function (i) { pr.p2 = i; U.persist(); k = 1; pr.k = 1; paint(); })]));
        } else {
          out.appendChild(U.reveal([U.verdict(P.specific, pr.p2) + 'The other diastereomer gives the other alkene. The configuration of the substrate decides which stereoisomer forms.']));
          out.appendChild(U.def('Stereospecific', 'the configuration of the substrate decides which single stereoisomer forms. The E2 of a substrate whose β carbon has only one H is stereospecific.'));
          if (doneFor(1) && !U.isDone(s.id)) U.complete();
        }
        return;
      }
      out.appendChild(U.panel('Product', null, [h('div', { class: 'pair-row' }, cards), U.reveal(lines)]));
    }
    paint();
  };

  /* ============================================================= regio */

  R.regio = function (s) {
    var pr = U.progress(s.id);
    pr.st = pr.st || [0, 0];
    var area = h('div');
    stage().appendChild(area);
    var k = pr.k || 0;
    function paint() {
      area.innerHTML = '';
      var m = mol(s.mols[k]);
      var L = React.lg(m);
      var num = Name.numbers(m);
      var prods = React.e2Products(m, 'NaOEt');
      var hind = React.e2Products(m, 'tBuOK');
      var zait = prods.filter(function (p) { return p.regio === 'Zaitsev'; })[0], hof = prods.filter(function (p) { return p.regio === 'Hofmann'; })[0];
      var st = pr.st[k];
      var chips = U.chipRow('Substrate', s.mols.map(function (id) { return molName(mol(id)); }), k, function (i) { return pr.st[i] >= 4; },
        function (i) { return i === 0 || pr.st[0] >= 4; }, function (i) { k = i; pr.k = k; U.persist(); paint(); });
      var list = h('div', { class: 'step-list' });
      area.appendChild(U.panel('Klein’s four steps', molName(m), [chips, h('div', { class: 'work work-wide' }, [list, h('div', null, [klein()])])]));
      function sub(n, title, body) {
        list.appendChild(h('div', { class: 'substep' + (st === n ? ' open' : st > n ? ' done' : '') }, [h('h4', { text: (n + 1) + '. ' + title })].concat(st >= n ? body : [])));
      }
      /* 1: the β positions bearing protons */
      var betas = React.betas(m, L.a).filter(function (b) { return b.h; }).map(function (b) { return b.b; });
      pr.b = pr.b || [0, 0];
      var picks = {};
      m.atoms.forEach(function (a, i) { if (a.el === 'C') picks[i] = U.carbonName(m, i); });
      var svg = Draw.mol(m, { pick: st === 0 ? picks : null, scale: 52 });
      if (st === 0) {
        var nodes = svg.querySelectorAll('.m-pick');
        for (var q = 0; q < nodes.length; q++) {
          var i0 = +nodes[q].getAttribute('data-drop'), bi0 = betas.indexOf(i0);
          if (bi0 >= 0 && (pr.b[k] & (1 << bi0))) nodes[q].classList.add('found');
        }
        svg.addEventListener('click', function (ev) { var d = ev.target.closest('.m-pick'); if (d) pickBeta(+d.getAttribute('data-drop')); });
        svg.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { var d = ev.target.closest('.m-pick'); if (d) { ev.preventDefault(); pickBeta(+d.getAttribute('data-drop')); } } });
      }
      var skip = k === 1;
      if (skip && st < 2) { pr.st[1] = st = 2; U.persist(); }
      sub(0, 'Identify all β positions bearing protons', skip ? [h('p', { class: 'muted', text: 'Done for you this time.' })] : [h('div', { class: 'mol-wrap' }, [svg])]);
      /* 2: every regiochemical outcome */
      var cands = prods.map(function (p) { return { mol: p.mol, ok: true }; });
      if (k === 0) cands.push({ mol: Mol.fromRing({ 3: { t: 'CH3' } }, [1, 2]), ok: false, why: 'The C=C must form between the α carbon and a β carbon. Here it does not include the α carbon (the one that had the Cl).' });
      cands = U.shuffle(cands, U.rng(U.seed() ^ 31 + k));
      var row2 = h('div', { class: 'prod-cards' });
      pr.c = pr.c || {};
      cands.forEach(function (c, ci) {
        var nm = Name.name(c.mol);
        var key = k + nm;
        var chosen = pr.c[key];
        var card = h('div', { class: 'prod-card' + (chosen != null && st === 1 ? (chosen === c.ok ? '' : '') : '') }, [
          Draw.mol(c.mol, { label: 'Bond-line formula of ' + nm }), h('span', { class: 'name', text: nm }),
          h('div', { class: 'seg' }, [
            h('button', { type: 'button', class: 'mini', 'aria-pressed': chosen === true ? 'true' : 'false', text: 'Can form', onclick: function () { pr.c[key] = true; U.persist(); paint(); } }),
            h('button', { type: 'button', class: 'mini', 'aria-pressed': chosen === false ? 'true' : 'false', text: 'Cannot', onclick: function () { pr.c[key] = false; U.persist(); paint(); } })
          ])]);
        row2.appendChild(card);
      });
      var chk2 = h('button', { type: 'button', class: 'primary', text: 'Check', onclick: function () {
        for (var q2 = 0; q2 < cands.length; q2++) {
          var c = cands[q2], v = pr.c[k + Name.name(c.mol)];
          if (v == null) { U.say('Decide for every alkene: can it form or not?', 'bad'); return; }
          if (v !== c.ok) { U.say(c.ok ? Name.name(c.mol) + ' can form: remove an H from one of the β carbons, and the C=C forms between it and the α carbon.' : c.why, 'bad'); return; }
        }
        pr.st[k] = 2; U.persist(); U.say('Right: one alkene for each kind of β position.', 'good'); paint();
      } });
      sub(1, 'Draw all possible regiochemical outcomes', [row2, st === 1 ? h('div', { class: 'btnrow' }, [chk2]) : null]);
      /* 3: Zaitsev or Hofmann */
      var row3 = h('div', { class: 'prod-cards' });
      pr.z = pr.z || {};
      [zait, hof].forEach(function (p) {
        var nm = Name.name(p.mol), key = k + nm;
        var right = p.regio;
        row3.appendChild(h('div', { class: 'prod-card' }, [Draw.mol(p.mol, { label: 'Bond-line formula of ' + nm }), h('span', { class: 'name', text: nm }),
          U.choiceRow(['Zaitsev', 'Hofmann'], right === 'Zaitsev' ? 0 : 1, pr.z[key], function (i) {
            pr.z[key] = i; U.persist();
            if ((i === 0) === (right === 'Zaitsev')) U.say(nm + ' is the ' + right + ' product: the ' + (right === 'Zaitsev' ? 'more' : 'less') + ' substituted alkene (' + React.substitution(p.mol) + ' carbons on the C=C).', 'good');
            else U.say('Count the carbons on the two alkene carbons: ' + nm + ' has ' + React.substitution(p.mol) + '. The Zaitsev product is the more substituted alkene, the Hofmann product the less substituted.', 'bad');
            if (pr.z[k + Name.name(zait.mol)] === 0 && pr.z[k + Name.name(hof.mol)] === 1) { pr.st[k] = Math.max(pr.st[k], 3); U.persist(); }
            paint();
          })]));
      });
      sub(2, 'Identify the Zaitsev and Hofmann products', [row3]);
      /* 4: the base decides */
      pr.q = pr.q || {};
      var bodies = [];
      [['NaOEt', prods, 'not sterically hindered'], ['tBuOK', hind, 'sterically hindered']].forEach(function (x, xi) {
        var maj = x[1].filter(function (p) { return p.role === 'major'; })[0];
        var opts = [Name.name(zait.mol), Name.name(hof.mol)];
        var ans = opts.indexOf(Name.name(maj.mol));
        var key = k + x[0];
        bodies.push(h('p', { class: 'q-text', text: 'With ' + React.REAGENTS[x[0]].text + ' (' + x[2] + '), which is the major product?' }));
        bodies.push(U.choiceRow(opts, ans, pr.q[key], function (i) {
          pr.q[key] = i; U.persist();
          U.say(i === ans ? (xi ? 't-BuO⁻ is too crowded to reach the H atoms on the inner β carbon; it takes the more accessible H on the outer one: Hofmann.' :
            'EtO⁻ is small: it reaches every β H, and the more stable, more substituted alkene forms faster: Zaitsev.') : 'Look at Klein’s table: an ordinary base gives the Zaitsev product as major, a sterically hindered base the Hofmann product.', i === ans ? 'good' : 'bad');
          if (pr.q[k + 'NaOEt'] === opts.indexOf(Name.name(prods.filter(function (p) { return p.role === 'major'; })[0].mol)) &&
              pr.q[k + 'tBuOK'] === opts.indexOf(Name.name(hind.filter(function (p) { return p.role === 'major'; })[0].mol))) {
            pr.st[k] = 4; U.persist();
            if (pr.st[0] >= 4 && pr.st[1] >= 4) U.complete('Both substrates done.');
          }
          paint();
        }));
      });
      if (st >= 4) bodies.push(U.def('Regioselective', 'more than one regiochemical product can form, and one is major. Which one depends on the base.'));
      sub(3, 'Analyze the base to determine which product predominates', bodies);

      function pickBeta(i) {
        var bi = betas.indexOf(i);
        if (i === L.a) { U.say('That is the α carbon, the one carrying the ' + m.atoms[L.x].el + '. The β positions are the carbons next to it.', 'bad'); return; }
        if (bi < 0) { U.say('That carbon is not bonded to the α carbon, so it is not a β position.', 'bad'); return; }
        pr.b[k] |= (1 << bi);
        var n = 0; betas.forEach(function (b, q3) { if (pr.b[k] & (1 << q3)) n++; });
        U.say(n === betas.length ? 'All ' + n + ' β positions found. The two on the ring are equivalent: they give the same alkene.' : 'A β position (' + n + ' of ' + betas.length + ').', 'good');
        if (n === betas.length) pr.st[k] = 1;
        U.persist(); paint();
      }
    }
    /* Klein's table for step 4 */
    function klein() {
      var t = h('table', { class: 'ref-table' }, [
        h('tr', null, [h('th', { text: '' }), h('th', { text: 'Zaitsev' }), h('th', { text: 'Hofmann' })]),
        h('tr', null, [h('td', { text: 'Not sterically hindered (EtO⁻)' }), h('td', { text: 'Major' }), h('td', { text: 'Minor' })]),
        h('tr', null, [h('td', { text: 'Sterically hindered (t-BuO⁻)' }), h('td', { text: 'Minor' }), h('td', { text: 'Major' })])
      ]);
      return U.panel('Step 4: the base', 'Klein', [t, h('p', { class: 'muted', text: 'Zaitsev: the more substituted alkene. Hofmann: the less substituted alkene.' })]);
    }
    paint();
  };

  /* ================================================================ e1 */

  R.e1 = function (s) {
    var pr = U.progress(s.id);
    var m = mol(s.mol);
    var cat = React.cation(m);
    var zb = cat.carbonsOn(cat.plus).filter(function (x) { return cat.hCount(x.j) === 2; })[0].j;
    var scenes = [Mech.loss(m), Mech.e1(cat, cat.plus, zb, 'EtOH')];
    var top = h('div'), area = h('div');
    stage().appendChild(top); stage().appendChild(area);
    function paintTop() {
      top.innerHTML = '';
      top.appendChild(U.panel('Your prediction', null, [U.predictCard(P.e1major, pr.p, function (i) { pr.p = i; U.persist(); paintTop(); paint(); U.showArea(area); })]));
    }
    paintTop();
    var k = pr.a0 ? 1 : 0;
    function paint() {
      area.innerHTML = '';
      if (pr.p == null) return;
      var chips = U.chipRow('Step', ['1  Loss of a leaving group', '2  Proton transfer'], k, function (i) { return !!pr['a' + i]; },
        function (i) { return i === 0 || !!pr.a0; }, function (i) { k = i; paint(); });
      var right = h('div');
      var ab = U.arrowBox(scenes[k], pr, 'a' + k, function (fresh) {
        if (k === 0 && fresh) { U.say('Right: the same slow first step as SN1. Now ethanol acts as a base on the carbocation.', 'good'); k = 1; paint(); return; }
        paintRight();
        if (pr.a0 && pr.a1 && !U.isDone(s.id)) U.complete();
      });
      area.appendChild(h('div', { class: 'work work-wide' }, [U.panel('E1 of ' + molName(m) + ' in ethanol', null, [chips, ab.node]), right]));
      function paintRight() {
        right.innerHTML = '';
        var n = (pr.a0 ? 1 : 0) + (pr.a1 ? 1 : 0);
        var eb = U.energyBox(Anim.PROFILES.e1, { p: [0, 0.5, 1][n], upto: [0, 0.5, 1][n] });
        var kids = [eb.node];
        if (n === 2) {
          var res = React.predict(m, 'EtOH');
          var row = h('div', { class: 'prod-cards' }, res.products.map(function (p) {
            return h('div', { class: 'prod-card' }, [Draw.mol(p.mol, { label: 'Bond-line formula of ' + p.name }), h('span', { class: 'name', text: p.name }),
              h('span', { class: 'tagline', text: p.mech + ', ' + p.role + (p.regio ? ' (' + p.regio + ')' : '') })]);
          }));
          kids.push(row);
          kids.push(U.reveal([U.verdict(P.e1major, pr.p) + 'The carbocation is attacked by ethanol (SN1, the major product) more often than it loses a proton (E1, minor).',
            'E1 is regioselective: the Zaitsev product is the major alkene. A hindered base cannot change that, because the base is not in the rate-determining step.',
            'E1 is not stereospecific: the carbocation is flat, so where a C=C can be E or Z, the more stable E is favoured (stereoselective).']));
        }
        right.appendChild(U.panel('Energy and products', null, kids));
      }
      paintRight();
    }
    paint();
  };

  /* ----------------------------------------------------- chair helpers */

  /* The chair spec of a ring molecule and which carbon has the leaving group
     (the activity's ring molecules all have it on C1). */
  function specOf(m) { return m.ringSpec; }

  function chairNewman(spec, t) {
    var nm = CHAIR.newman(spec, t, 1, 2);
    function conv(list) {
      return list.map(function (q) {
        var g = q.ring ? null : CGROUPS[q.g];
        return { a: q.a, text: q.ring ? 'C' + q.ring : g.label, el: q.ring ? 'C' : g.el, pos: q.pos };
      });
    }
    return { front: conv(nm.front), back: conv(nm.back) };
  }

  /* A flip slider and the chair drawing it moves. */
  function chairFlip(spec, opts) {
    opts = opts || {};
    var host = h('div', { class: 'chair-host' });
    var nmHost = h('div');
    var t = opts.t || 0;
    var sl = U.slider(function (p) { t = p; paint(); if (opts.onFlip) opts.onFlip(t); }, { from: 'Chair 1', to: 'Chair 2', label: 'Ring flip', ms: 1600, p: t });
    function chairOf() { return t < 0.02 ? 0 : t > 0.98 ? 1 : -1; }
    function paint() {
      host.innerHTML = '';
      var k = chairOf();
      var mark = opts.mark ? opts.mark(k) : {};
      host.appendChild(Draw.chair(spec, t, { show: opts.show || 'all', mark: mark, targets: opts.targets ? opts.targets(k) : null }));
      nmHost.innerHTML = '';
      if (k >= 0 && opts.newman !== false) {
        var nm = chairNewman(spec, k);
        nm.front.forEach(function (q) { if (q.pos && mark[q.pos]) q.cls = mark[q.pos]; });
        nm.back.forEach(function (q) { if (q.pos && mark[q.pos]) q.cls = mark[q.pos]; });
        nmHost.appendChild(h('figure', { class: 'fig-card' }, [Draw.newman(nm, { label: 'Newman projection down C1–C2 of chair ' + (k + 1) }),
          h('figcaption', { text: 'Looking down C1–C2' })]));
      }
      if (opts.onPaint) opts.onPaint(k, host);
    }
    /* the caller paints it once it is on the page */
    return { node: host, newman: nmHost, slider: sl, chair: chairOf, set: function (p) { sl.set(p); }, paint: paint };
  }

  /* the position of the group on carbon c, face f, axial in chair k? */
  function ax(pos, k) { return CHAIR.isAxial(pos, k); }

  /* ========================================================= ringanti */

  R.ringanti = function (s) {
    var pr = U.progress(s.id);
    pr.f = pr.f || 0;
    var m = mol(s.mol), spec = specOf(m);
    var top = h('div'), area = h('div');
    stage().appendChild(top); stage().appendChild(area);
    function paintTop() {
      top.innerHTML = '';
      top.appendChild(U.panel('Your prediction', null, [U.predictCard(P.ringanti, pr.p, function (i) { pr.p = i; U.persist(); paintTop(); paint(); U.showArea(area); })]));
    }
    paintTop();
    /* the H atoms anti-coplanar to the axial Cl: axial, on C2 and C6, other face */
    var lgPos = '1t';
    function antiIn(k) {
      if (!ax(lgPos, k)) return [];
      return ['2b', '6b'].filter(function (p) { return ax(p, k) && CHAIR.groupAt(spec, CHAIR.carbonOf(p), 'b') === 'H'; });
    }
    function paint() {
      area.innerHTML = '';
      if (pr.p == null) return;
      var anti = antiIn(0);
      var read = h('div');
      var cf = chairFlip(spec, {
        t: pr.f & 1 ? (pr.c2 != null ? 1 : 0) : 0,
        show: ['1t', '1b', '2t', '2b', '6t', '6b'],
        mark: function (k) {
          var mk = { '1t': 'lg' };
          if (k === 0) anti.forEach(function (p, i) { if (pr.f & (2 << i)) mk[p] = 'anti'; });
          return mk;
        },
        targets: function (k) {
          if (k !== 0 || pr.f & 1) return null;
          var tg = {};
          ['2t', '2b', '6t', '6b'].forEach(function (p) { tg[p] = { key: p, aria: 'H on C' + CHAIR.carbonOf(p) + ', ' + CHAIR.describe(p, 0) }; });
          return tg;
        },
        onPaint: function (k, host) {
          var nodes = host.querySelectorAll('.chdrop');
          for (var i = 0; i < nodes.length; i++) {
            (function (n) {
              n.addEventListener('click', function () { pick(n.getAttribute('data-drop')); });
              n.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(n.getAttribute('data-drop')); } });
            })(nodes[i]);
          }
          paintRead(k);
        },
        onFlip: function (t) { if (m3) m3.update(t); }
      });
      var m3 = chair3d(spec, cf);
      area.appendChild(h('div', { class: 'work work-3' }, [
        U.panel('Chair drawing', 'flip with the slider', [cf.node, cf.slider.node]),
        U.panel('Newman projection', null, [cf.newman]),
        U.panel('What can leave', null, [m3.node, read])
      ]));
      m3.start();
      cf.paint();
      function pick(pos) {
        if (pr.f & 1) return;
        var i = anti.indexOf(pos);
        if (i >= 0) {
          pr.f |= (2 << i);
          var all = anti.every(function (p, j) { return pr.f & (2 << j); });
          if (all) { pr.f |= 1; U.say('Both: the axial H atoms on C2 and C6, pointing down, opposite the axial Cl. Trans-diaxial. Now flip the ring.', 'good'); }
          else U.say('Right: the axial H on C' + CHAIR.carbonOf(pos) + ' points straight down, opposite the Cl. There is one more.', 'good');
          U.persist(); cf.paint();
        } else {
          U.say('That H is equatorial: it points out from the ring, not opposite the Cl. Anti-coplanar to an axial Cl means the axial H on the next carbon, on the other face.', 'bad');
        }
      }
      function paintRead(k) {
        read.innerHTML = '';
        if (!(pr.f & 1)) { read.appendChild(h('p', { class: 'muted', text: 'Chair 1 has the Cl axial. Click every H that is anti-coplanar to it.' })); return; }
        if (k !== 1 && pr.c2 == null) { read.appendChild(h('p', { class: 'muted', text: 'Now drag the slider to flip to chair 2.' })); return; }
        if (k === 1 || pr.c2 != null) {
          read.appendChild(h('p', { class: 'q-text', text: 'In chair 2 the Cl is equatorial. How many H atoms are anti-coplanar to it?' }));
          read.appendChild(U.choiceRow(['None', 'One', 'Two'], 0, pr.c2, function (i) {
            pr.c2 = i; U.persist();
            if (i === 0) { U.complete('Right: none.'); }
            else U.say('Look down C1–C2: anti to an equatorial Cl is a ring bond (C2–C3), not an H.', 'bad');
            paintRead(k);
          }));
          if (pr.c2 === 0) read.appendChild(U.reveal([U.verdict(P.ringanti, pr.p) + 'Anti to an equatorial leaving group are ring bonds, so no H is anti-coplanar. ' +
            'E2 on a ring happens only from the chair with the leaving group axial: the H and the leaving group must be trans-diaxial.']));
        }
      }
    }
    paint();
  };

  /* A 3D chair beside the drawing, following the flip slider. */
  function chair3d(spec, cf) {
    var vb = U.viewerBox({ radius: 3.4, label: '3D model of the chair. Drag or use the arrow keys to turn it.' });
    var started = false;
    function frameAt(t) {
      var md = CHAIR.model(spec, t);
      return { atoms: md.atoms.map(function (a) { return { el: a.el, p: a.p, tint: CGROUPS[a.group] && CGROUPS[a.group].tint ? CGROUPS[a.group].tint : null }; }),
               bonds: md.bonds.map(function (b) { return { a: b[0], b: b[1], order: 1 }; }) };
    }
    var orig = cf.slider.range;
    return {
      node: vb.node,
      start: function () { vb.start(); started = true; vb.viewer().setRotation(CHAIR.SIDE); vb.viewer().setFrame(frameAt(+orig.value / 100)); },
      update: function (t) { if (started) vb.viewer().setFrame(frameAt(t)); }
    };
  }

  /* ========================================================= ringregio */

  R.ringregio = function (s) {
    var pr = U.progress(s.id);
    pr.st = pr.st || [0, 0];
    pr.h = pr.h || [0, 0];
    var area = h('div');
    stage().appendChild(area);
    var k = pr.k || 0;
    function paint() {
      area.innerHTML = '';
      var m = mol(s.mols[k]), spec = specOf(m);
      var ch = React.chairs(m);
      /* chair 1 or 2 with the Cl (on 1t) axial: 1t is axial in chair 1 */
      var reactiveK = ax('1t', 0) ? 0 : 1;
      var stableK = ch.gap <= 0 ? reactiveK : 1 - reactiveK;
      var anti = ['2', '6'].map(function (c) { return c + 'b'; }).filter(function (p) {
        return CHAIR.groupAt(spec, CHAIR.carbonOf(p), 'b') === 'H' && ax(p, reactiveK);
      });
      var st = pr.st[k];
      var read = h('div');
      var cf = chairFlip(spec, {
        t: st >= 1 ? reactiveK : stableK,
        show: ['1t', '1b', '2t', '2b', '6t', '6b'],
        mark: function (kk) {
          var mk = { '1t': 'lg' };
          if (kk === reactiveK) anti.forEach(function (p, i) { if (pr.h[k] & (1 << i)) mk[p] = 'anti'; });
          return mk;
        },
        targets: function (kk) {
          if (kk !== reactiveK || st !== 1) return null;
          var tg = {};
          ['2t', '2b', '6t', '6b'].forEach(function (p) {
            if (CHAIR.groupAt(spec, CHAIR.carbonOf(p), CHAIR.faceOf(p)) === 'H') tg[p] = { key: p, aria: 'H on C' + CHAIR.carbonOf(p) + ', ' + CHAIR.describe(p, kk) };
          });
          return tg;
        },
        onPaint: function (kk, host) {
          var nodes = host.querySelectorAll('.chdrop');
          for (var i = 0; i < nodes.length; i++) (function (n) {
            n.addEventListener('click', function () { pick(n.getAttribute('data-drop')); });
            n.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(n.getAttribute('data-drop')); } });
          })(nodes[i]);
          if (kk === reactiveK && st === 0) { pr.st[k] = st = 1; U.persist(); U.say('The Cl is axial now. Click every H anti-coplanar to it.', ''); setTimeout(function () { cf.paint(); }, 0); return; }
          paintRead(kk);
        }
      });
      var chips = U.chipRow('Substrate', s.mols.map(function (id) { return molName(mol(id)); }), k, function (i) { return pr.st[i] >= 3; },
        function (i) { return i === 0 || pr.st[0] >= 3; }, function (i) { k = i; pr.k = k; U.persist(); paint(); });
      area.appendChild(U.panel(molName(m), null, [chips, h('div', { class: 'work work-3' }, [
        h('div', null, [U.molCard(m), cf.node, cf.slider.node]),
        h('div', null, [cf.newman]),
        read
      ])]));
      cf.paint();
      function pick(pos) {
        if (st !== 1) return;
        var i = anti.indexOf(pos);
        if (i >= 0) {
          pr.h[k] |= (1 << i);
          if (anti.every(function (p, j) { return pr.h[k] & (1 << j); })) { pr.st[k] = 2; U.say(anti.length === 1 ? 'Only one H is anti-coplanar: the axial H on C' + CHAIR.carbonOf(anti[0]) + '. The other β carbon has its CH₃ axial there instead.' : 'Both: the axial H atoms on C2 and C6.', 'good'); }
          else U.say('Right. There is another one.', 'good');
          U.persist(); paint();
        } else U.say(CHAIR.isAxial(pos, reactiveK) ? 'That H is axial but on the same face as the Cl: it is not opposite it.' : 'That H is equatorial, so it is not anti-coplanar to the axial Cl.', 'bad');
      }
      function paintRead(kk) {
        read.innerHTML = '';
        if (st === 0) { read.appendChild(h('p', { class: 'muted', text: 'This is the more stable chair. The Cl is ' + (kk === reactiveK ? 'axial' : 'equatorial') + '. Flip the ring until the Cl is axial.' })); return; }
        if (st === 1) { read.appendChild(h('p', { class: 'muted', text: 'Click every H that is anti-coplanar (trans-diaxial) to the Cl.' })); return; }
        var res = React.predict(m, 'NaOEt').products.filter(function (p) { return p.mech === 'E2'; });
        var cands = [Mol.fromRing({ 1: { t: 'CH3' } }, [1, 2]), Mol.fromRing({ 3: { t: 'CH3' } }, [1, 2])];
        pr.r = pr.r || {};
        var row = h('div', { class: 'prod-cards' });
        cands.forEach(function (c) {
          var nm = Name.name(c);
          var model = res.filter(function (p) { return Name.name(p.mol) === nm; })[0];
          var want = model ? model.role : 'none';
          var key = k + nm;
          row.appendChild(h('div', { class: 'prod-card' }, [Draw.mol(c, { label: 'Bond-line formula of ' + nm }), h('span', { class: 'name', text: nm }),
            U.choiceRow(['Major', 'Minor', 'Not formed'], ['major', 'minor', 'none'].indexOf(want), pr.r[key], function (i) {
              pr.r[key] = i; U.persist();
              var ok = ['major', 'minor', 'none'][i] === want;
              if (ok) U.say(want === 'none' ? nm + ' cannot form: its C=C would need an H on C2 anti-coplanar to the Cl, and there is none.' :
                nm + ': ' + want + '.', 'good');
              else U.say(want === 'none' ? 'Which H atoms are anti-coplanar to the Cl? ' + nm + ' needs the H on C2.' :
                'Both alkenes can form here, so it is a question of Zaitsev or Hofmann: the more substituted alkene is major.', 'bad');
              if (cands.every(function (c2) { var n2 = Name.name(c2); var m2 = res.filter(function (p) { return Name.name(p.mol) === n2; })[0];
                return pr.r[k + n2] === ['major', 'minor', 'none'].indexOf(m2 ? m2.role : 'none'); })) {
                pr.st[k] = 3; U.persist();
                if (pr.st[0] >= 3 && pr.st[1] >= 3) U.complete();
                paint();
                return;
              }
              paintRead(kk);
            })]));
        });
        read.appendChild(h('p', { class: 'q-text', text: 'With NaOEt, which alkenes form?' }));
        read.appendChild(row);
        if (pr.st[k] >= 3) {
          var lines = anti.length === 2
            ? ['Two H atoms are anti-coplanar, so two alkenes can form, and the more substituted (Zaitsev) one is major.', U.def('Regioselective', 'more than one regiochemical product, one of them major.')]
            : ['Only one H is anti-coplanar, so only one alkene can form, even though it is the less substituted one.', U.def('Regiospecific', 'only one regiochemical product can form: here, only one β H is anti-coplanar to the leaving group.'),
               'It is also slower: the Cl is axial only in the chair with both groups axial, the less stable chair, so few molecules are ever ready to react.'];
          read.appendChild(U.reveal(lines));
        }
      }
    }
    paint();
  };

  /* ============================================================ locked */

  R.locked = function (s) {
    var pr = U.progress(s.id);
    pr.f = pr.f || 0;
    var top = h('div'), area = h('div'), tail = h('div');
    stage().appendChild(top); stage().appendChild(area); stage().appendChild(tail);
    function paintTop() {
      top.innerHTML = '';
      top.appendChild(U.panel('Your prediction', null, [U.predictCard(P.locked, pr.p, function (i) { pr.p = i; U.persist(); paintTop(); paint(); U.showArea(area); })]));
    }
    paintTop();
    var k = pr.k || 0;
    function paint() {
      area.innerHTML = '';
      tail.innerHTML = '';
      if (pr.p == null) return;
      var m = mol(s.mols[k]), spec = specOf(m), ch = React.chairs(m);
      var reactiveK = ax('1t', 0) ? 0 : 1;
      var bars = h('div', { class: 'race' });
      var read = h('p', { class: 'readout' });
      var stableK = ch.gap <= 0 ? reactiveK : 1 - reactiveK;
      var cf = chairFlip(spec, {
        t: stableK,
        show: ['1t', '1b', '4t', '4b'],
        mark: function (kk) { return { '1t': 'lg' }; },
        newman: false,
        onPaint: function (kk) {
          if (kk >= 0) {
            var brAx = kk === reactiveK;
            read.textContent = 'Chair ' + (kk + 1) + ': the Br is ' + (brAx ? 'axial' : 'equatorial') + ' and the tert-butyl group is ' +
              (CHAIR.isAxial(spec[4] && spec[4].t ? '4t' : '4b', kk) ? 'axial (crowded: two 1,3-diaxial clashes with a huge group)' : 'equatorial') + '. ' +
              (brAx ? 'This chair can do E2.' : 'No H is anti-coplanar to an equatorial Br: this chair cannot do E2.');
            if (kk !== stableK && !(pr.f & (1 << k))) { pr.f |= (1 << k); U.persist(); paintTail(); }
          }
        }
      });
      /* energy bars for the two chairs (A-values, no numbers shown) */
      var top2 = Math.max(ch.reactive, ch.other, 1);
      [['Chair with the Br axial (can react)', ch.reactive], ['Chair with the Br equatorial', ch.other]].forEach(function (x) {
        bars.appendChild(h('span', { text: x[0] }));
        var bar = h('div', { class: 'bar' }, [h('span', { style: 'width:' + Math.max(3, 100 * x[1] / top2).toFixed(0) + '%' })]);
        bars.appendChild(bar);
      });
      var chips = U.chipRow('Substrate', s.mols.map(function (id) { return molName(mol(id)); }), k, function (i) { return !!(pr.f & (1 << i)); },
        function () { return true; }, function (i) { k = i; pr.k = k; U.persist(); paint(); });
      area.appendChild(U.panel('Flip the ring', molName(m), [chips, h('div', { class: 'work' }, [
        h('div', null, [U.molCard(m), cf.node, cf.slider.node, read]),
        U.panel('Strain in each chair', 'longer bar: less stable', [bars, h('p', { class: 'muted', text: 'An axial tert-butyl group bumps into the axial H atoms two carbons away so hard that the ring almost never sits that way. The ring is locked.' })])
      ])]));
      cf.paint();
      paintTail();
    }
    function paintTail() {
      tail.innerHTML = '';
      if ((pr.f & 3) !== 3) return;
      var mc = mol(s.mols[0]), mt = mol(s.mols[1]);
      var race = h('div', { class: 'race' });
      var fills = [];
      [mc, mt].forEach(function (m) {
        race.appendChild(h('span', { text: molName(m) }));
        var sp = h('span');
        race.appendChild(h('div', { class: 'bar' }, [sp]));
        fills.push({ sp: sp, gap: React.chairs(m).gap });
      });
      /* how much of each has reacted in the same time: the fraction of
         molecules in the reactive chair sets the pace */
      function frac(gap) { return 1 / (1 + Math.exp(gap / 2.48)); }
      var t0 = null;
      function step(ts) {
        if (t0 == null) t0 = ts;
        var f = U.reduceMotion ? 1 : Math.min(1, (ts - t0) / 2000);
        fills.forEach(function (x) { x.sp.style.width = (100 * Math.min(1, f * frac(x.gap) * 1.02)).toFixed(1) + '%'; });
        if (f < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
      tail.appendChild(U.panel('The same time, the same base', 'how much has reacted', [race, U.reveal([U.verdict(P.locked, pr.p) +
        'The cis isomer sits with its Br axial (tert-butyl equatorial), ready for E2. The trans isomer is locked with its Br equatorial; to react it would have to put the tert-butyl group axial, ' +
        'and almost no molecules ever do. Its E2 is drastically slower.'])]));
      var pick = pr.q;
      var Pq = P.k718;
      var opts = [{ ring: MOLS.transTbCl.ring }, { ring: MOLS.cisTbCl.ring }];
      tail.appendChild(U.panel('Klein problem 7.18', null, [U.predictCard(Pq, pick, function (i) { pr.q = i; U.persist(); paintTail(); if (!U.isDone(s.id)) U.complete(); }),
        h('div', { class: 'pair-row' }, opts.map(function (o, i) { return U.molCard(Mol.fromRing(o.ring)); }))]));
      if (pick != null) tail.appendChild(U.reveal([U.verdict(Pq, pick) + 'The tert-butyl group stays equatorial. In the trans isomer that puts the Cl axial, with axial H atoms anti to it on C2 and C4: fast E2. ' +
        'In the cis isomer the Cl is equatorial and locked there: very slow.']));
    }
    paint();
  };

  /* =========================================================== sortsel */

  /* Each card is a reaction; its bin is read from the model by validate.js. */
  var SEL_CARDS = [
    { id: 's1', sub: 'bp3', key: 'NaOEt', bin: 'stereosel' },
    { id: 's2', sub: 'bmpRR', key: 'NaOEt', bin: 'stereospec' },
    { id: 's3', sub: 'bbR', key: 'NaSH', bin: 'stereospec' },
    { id: 's4', sub: 'bmb', key: 'tBuOK', bin: 'regiosel' },
    { id: 's5', sub: 'ccmh', key: 'NaOEt', bin: 'regiosel' },
    { id: 's6', sub: 'transClMe', key: 'NaOEt', bin: 'regiospec' },
    { id: 's7', sub: 'transBrMe2', key: 'NaOEt', bin: 'regiospec' },
    { id: 's8', sub: 'bbR', key: 'NaOEt', bin: 'stereosel' }
  ];
  var BINS = [
    ['regiosel', 'Regioselective', 'more than one regiochemical product; one is major'],
    ['regiospec', 'Regiospecific', 'only one regiochemical product can form'],
    ['stereosel', 'Stereoselective', 'two stereoisomers can form; one is major'],
    ['stereospec', 'Stereospecific', 'the substrate’s configuration decides the only stereoisomer']
  ];

  function cardText(c) {
    var m = mol(c.sub), r = React.predict(m, c.key);
    var rk = React.REAGENTS[c.key].text;
    var mainMech = r.mechs[0][0];
    var list = r.products.filter(function (p) { return p.mech === mainMech; });
    var maj = list.filter(function (p) { return p.role === 'major'; })[0];
    var name = molName(m);
    if (c.bin === 'stereospec' && mainMech === 'SN2') return name + ' + ' + rk + ' gives only ' + maj.name + '.';
    if (c.bin === 'stereospec') return name + ' + ' + rk + ' gives ' + maj.name + ' and never its stereoisomer.';
    if (c.bin === 'stereosel') {
      var mn = list.filter(function (p) { return p.how === 'selective-minor'; })[0];
      return name + ' + ' + rk + ': ' + maj.name + ' major, ' + mn.name + ' minor.';
    }
    if (c.bin === 'regiospec') return name + ' + ' + rk + ' gives ' + maj.name + ' as its only alkene.';
    var other = list.filter(function (p) { return p !== maj && p.regio && p.regio !== maj.regio; })[0];
    return name + ' + ' + rk + ': mostly ' + maj.name + ', some ' + other.name + '.';
  }

  R.sortsel = function (s) {
    var pr = U.progress(s.id);
    var placed = pr.ok ? pr.ok.split(',').filter(Boolean) : [];
    var area = h('div');
    stage().appendChild(area);
    var picker = null;
    function paint() {
      area.innerHTML = '';
      if (picker) { picker.destroy(); picker = null; }
      var tray = h('div', { class: 'tray' });
      U.shuffle(SEL_CARDS, U.rng(U.seed() ^ 5)).forEach(function (c) {
        if (placed.indexOf(c.id) >= 0) return;
        tray.appendChild(h('button', { type: 'button', class: 'tile card-tile', 'data-tile': c.id, text: cardText(c) }));
      });
      if (!tray.children.length) tray.appendChild(h('p', { class: 'tray-empty', text: 'Every reaction is sorted.' }));
      var bins = h('div', { class: 'bins' });
      BINS.forEach(function (b) {
        var items = h('div', { class: 'bin-items' });
        SEL_CARDS.forEach(function (c) { if (placed.indexOf(c.id) >= 0 && c.bin === b[0]) items.appendChild(h('span', { class: 'bin-item', text: molName(mol(c.sub)) + ' + ' + React.REAGENTS[c.key].text })); });
        bins.appendChild(h('div', { class: 'bin drop', 'data-drop': b[0], tabindex: 0, role: 'button', 'aria-label': b[1] + ': ' + b[2] }, [
          h('p', { class: 'bin-head', text: b[1] }), h('p', { class: 'bin-sub', text: b[2] }), items]));
      });
      area.appendChild(U.panel('Sort the reactions', placed.length + ' of ' + SEL_CARDS.length + ' sorted', [bins, tray]));
      picker = new Picker({
        tray: tray, stage: bins,
        label: function (id) { return cardText(SEL_CARDS.filter(function (c) { return c.id === id; })[0]).slice(0, 40) + '…'; },
        prompt: function () { return 'Now choose a bin for that reaction.'; },
        say: function (t) { U.say(t, ''); },
        drop: function (bin, id) {
          var c = SEL_CARDS.filter(function (x) { return x.id === id; })[0];
          if (c.bin === bin) {
            placed.push(id); pr.ok = placed.join(','); U.persist();
            U.say(WHY[bin], 'good');
            if (placed.length === SEL_CARDS.length) U.complete('All sorted.');
            paint();
          } else U.say(MISS[c.bin], 'bad');
        }
      });
    }
    var WHY = {
      regiosel: 'Regioselective: two alkenes in different places can form, and one is major.',
      regiospec: 'Regiospecific: only one β H is anti-coplanar to the leaving group, so only one alkene can form.',
      stereosel: 'Stereoselective: the β carbon has two H atoms, so both stereoisomers can form; the one with the larger groups trans is major.',
      stereospec: 'Stereospecific: the substrate’s configuration decides the only stereoisomer that forms.'
    };
    var MISS = {
      regiosel: 'Look again: here two alkenes with the C=C in different places both form, one major and one minor.',
      regiospec: 'Look again: only one alkene can form at all here, because only one β H is anti-coplanar to the leaving group.',
      stereosel: 'Look again: here both stereoisomers of the same alkene form, one major and one minor.',
      stereospec: 'Look again: only one stereoisomer forms, and the substrate’s configuration decides which.'
    };
    paint();
    return { destroy: function () { if (picker) picker.destroy(); } };
  };

  App.SEL_CARDS = SEL_CARDS;
  App.conformerAlkene = conformerAlkene;
})();

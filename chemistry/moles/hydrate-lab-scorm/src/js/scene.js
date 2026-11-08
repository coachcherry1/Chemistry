/* scene.js: the 2D lab bench of the hydrate lab, drawn in code (the same bench as the previous lab, with an
 * open balance, a weigh boat and a bottle of blue copper(II) sulfate crystals instead of the DI water bottle).
 *
 * One SVG. The pieces the student places (ring stand, clay triangle, burner, crucible) are hidden until they are
 * placed; the balance, the DI water bottle and the wire gauze pad are always there. The crucible and its lid are
 * one group that moves between three places: the bench, the balance pan and the clay triangle. The flame, the
 * glow, the steam, the smoke, the ammonia gas and the drop are effects drawn on top.
 *
 *   Scene.create() -> { node, place, setLid, setReading, setFlame, setHot, setPowder, placeBoat, addCrystals, pourFall,
 *                       setCollar, puff, wisps, bottle, ... }
 *
 * Coordinates are the sketch's (a 1280 x 700 box). The crucible's base sits at y = 284 in the triangle, so a
 * flame whose tip reaches y = 284 touches its bottom (FLAME_TOUCH).
 */

var Scene = (function () {
  'use strict';

  var TRI = { x: 322, y: 284 };               /* the crucible's base centre in the clay triangle */
  var PAN = { x: 962, y: 466 };               /* on the balance pan */
  var BENCH = { x: 740, y: 598 };
  var PADLOC = { x: 519, y: 656 };            /* on the ceramic pad, on the wire gauze */
  var BURNER_TOP = 428;                       /* the top of the barrel, where the flame starts */
  var FLAME_TOUCH = BURNER_TOP - TRI.y;       /* flame height (px) at which the tip touches the crucible's bottom: 144 */
  var FLAME_MAX = 232;
  var CRUC_SCALE = 0.7;                       /* a crucible is small next to the balance and the ring stand */
  var NS = 'http://www.w3.org/2000/svg';

  var MARKUP = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 700" class="scene-svg" role="img" aria-label="The lab bench">',
    '<defs>',
    '<linearGradient id="sc-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3f7fa"/><stop offset="1" stop-color="#dfe7ee"/></linearGradient>',
    '<linearGradient id="sc-bench" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa6b0"/><stop offset="0.08" stop-color="#b7c1c9"/><stop offset="1" stop-color="#a7b2bb"/></linearGradient>',
    '<linearGradient id="sc-steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8e99a2"/><stop offset="0.45" stop-color="#eef2f5"/><stop offset="1" stop-color="#8794a0"/></linearGradient>',
    '<linearGradient id="sc-steelH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef2f5"/><stop offset="1" stop-color="#8794a0"/></linearGradient>',
    '<linearGradient id="sc-porc" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#f6f6f6"/><stop offset="1" stop-color="#e2e2e2"/></linearGradient>',
    '<radialGradient id="sc-rimIn" cx="0.5" cy="0.35" r="0.8"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9d9d9"/></radialGradient>',
    '<linearGradient id="sc-clay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e6dcc8"/></linearGradient>',
    '<linearGradient id="sc-iron" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#59636d"/><stop offset="1" stop-color="#2f3740"/></linearGradient>',
    '<linearGradient id="sc-glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfe6f3" stop-opacity="0.55"/><stop offset="0.5" stop-color="#eef8fd" stop-opacity="0.25"/><stop offset="1" stop-color="#bcd9ea" stop-opacity="0.55"/></linearGradient>',
    '<linearGradient id="sc-bal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfcfd"/><stop offset="1" stop-color="#d3dbe1"/></linearGradient>',
    '<linearGradient id="sc-plastic" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8eef2"/><stop offset="0.4" stop-color="#ffffff"/><stop offset="1" stop-color="#d7e0e6"/></linearGradient>',
    '<linearGradient id="sc-flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#2f6bd8" stop-opacity="0.9"/><stop offset="0.6" stop-color="#78b4ff" stop-opacity="0.7"/><stop offset="1" stop-color="#cfe6ff" stop-opacity="0.15"/></linearGradient>',
    '<linearGradient id="sc-hot" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff2d12" stop-opacity="1"/><stop offset="0.45" stop-color="#ff4a14" stop-opacity="0.7"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0.05"/></linearGradient>',
    '<radialGradient id="sc-glow"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#fffbe6" stop-opacity="0.95"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient>',
    '<filter id="sc-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>',
    '<filter id="sc-blur6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>',
    '<clipPath id="sc-ringBack"><rect x="0" y="0" width="1280" height="335"/></clipPath>',
    '<clipPath id="sc-ringFront"><rect x="0" y="335" width="1280" height="200"/></clipPath>',
    '</defs>',
    '<rect width="1280" height="700" fill="url(#sc-wall)"/>',
    '<rect x="0" y="592" width="1280" height="108" fill="url(#sc-bench)"/><rect x="0" y="592" width="1280" height="4" fill="#fff" opacity="0.6"/>',

    /* ---- always there: the wire gauze pad, the DI water bottle, the balance ---- */
    '<g id="sc-gauze"><path d="M428 676 L598 676 L598 681 L428 681 Z" fill="#6f7a84" stroke="#4d5963"/><path d="M440 640 L610 640 L598 676 L428 676 Z" fill="#dfe5ea" stroke="#5f6b75" stroke-width="1.5"/>',
    '<g stroke="#6f7a84" stroke-width="0.9" id="sc-mesh"></g><ellipse cx="519" cy="658" rx="40" ry="11" fill="#efe7d6" stroke="#9a8f78" stroke-width="1.4"/></g>',

    '<g id="sc-balance">',
    '<ellipse cx="960" cy="598" rx="150" ry="9" fill="#000" opacity="0.16" filter="url(#sc-soft)"/>',
    '<path d="M820 596 L820 506 Q820 496 832 496 L1088 496 Q1100 496 1100 506 L1100 596 Q1100 602 1094 602 L826 602 Q820 602 820 596 Z" fill="url(#sc-bal)" stroke="#8795a1" stroke-width="2"/>',
    '<rect x="850" y="516" width="190" height="56" rx="7" fill="#1b2a2f" stroke="#5f6f79" stroke-width="2"/>',
    '<text id="sc-reading" x="1030" y="556" text-anchor="end" font-family="Consolas, Menlo, monospace" font-size="34" font-weight="700" fill="#7dffb0">0.0000 g</text>',
    '<circle cx="1068" cy="534" r="14" fill="#f0f3f5" stroke="#8795a1" stroke-width="2"/><text x="1068" y="538" text-anchor="middle" font-size="9" font-weight="700" fill="#4d5c67">TARE</text>',
    '<circle cx="1068" cy="568" r="9" fill="#f0f3f5" stroke="#8795a1" stroke-width="2"/>',
    '<rect x="955" y="470" width="14" height="26" fill="url(#sc-steel)"/><ellipse cx="962" cy="470" rx="68" ry="9" fill="url(#sc-steel)" stroke="#6b7782" stroke-width="1.5"/>',
    '<g id="sc-pan-slot"></g>',
    '</g>',

    '<g id="sc-di"><g id="sc-di-body" transform="translate(130 488)">',
    '<ellipse cx="0" cy="110" rx="42" ry="5" fill="#000" opacity="0.16" filter="url(#sc-soft)"/>',
    '<path d="M-17 14 Q-38 20 -38 44 L-38 104 Q-38 110 -32 110 L32 110 Q38 110 38 104 L38 44 Q38 20 17 14 Z" fill="#dcebf3" fill-opacity="0.85" stroke="#7f8f9a" stroke-width="1.8"/>',
    '<g id="sc-hb-cry"></g>',
    '<path d="M-17 14 L-17 2 L17 2 L17 14 Z" fill="#f4f7f9" stroke="#7f8f9a" stroke-width="1.8"/><rect x="-21" y="-3" width="42" height="7" rx="3" fill="#ffffff" stroke="#7f8f9a" stroke-width="1.6"/>',
    '<rect x="-31" y="60" width="62" height="38" rx="3" fill="#ffffff" stroke="#9aa8b3" stroke-width="1"/><text x="0" y="73" text-anchor="middle" font-size="7.4" font-weight="700" fill="#243746">copper(II) sulfate</text><text x="0" y="85" text-anchor="middle" font-size="10" font-weight="800" fill="#1b4f95">CuSO₄·xH₂O</text><text x="0" y="94" text-anchor="middle" font-size="7" fill="#4d6273">hydrate</text>',
    '<path d="M-33 44 L-33 100" stroke="#fff" stroke-width="3" opacity="0.45" stroke-linecap="round"/>',
    '<rect x="-40" y="-8" width="80" height="124" fill="transparent"/>',
    '</g></g>',

    /* ---- the ring stand (hidden until placed) ---- */
    '<g id="sc-stand" opacity="0">',
    '<ellipse cx="560" cy="592" rx="110" ry="9" fill="#000" opacity="0.18" filter="url(#sc-soft)"/>',
    '<path d="M462 586 Q462 574 478 574 L642 574 Q658 574 658 586 L658 596 Q658 602 650 602 L470 602 Q462 602 462 596 Z" fill="url(#sc-iron)" stroke="#262d34" stroke-width="1.5"/><rect x="466" y="576" width="188" height="4" rx="2" fill="#fff" opacity="0.25"/>',
    '<rect x="553" y="60" width="14" height="518" rx="3" fill="url(#sc-steel)" stroke="#6b7782"/>',
    '<g transform="translate(0,-62)"><g clip-path="url(#sc-ringBack)"><ellipse cx="322" cy="334" rx="108" ry="23" fill="none" stroke="#7f8b95" stroke-width="8"/><ellipse cx="322" cy="332" rx="108" ry="23" fill="none" stroke="#dfe6eb" stroke-width="3"/></g></g>',
    '</g>',

    /* ---- the clay triangle, back bar (hidden until placed) ---- */
    '<g id="sc-tri-back" opacity="0" transform="translate(0,-62)"><line x1="232" y1="322" x2="412" y2="322" stroke="#a89e8a" stroke-width="15" stroke-linecap="round"/><line x1="232" y1="322" x2="412" y2="322" stroke="url(#sc-clay)" stroke-width="12" stroke-linecap="round"/><line x1="238" y1="319" x2="406" y2="319" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/></g>',

    '<g id="sc-layer-tri"></g>',

    '<g id="sc-tri-front" opacity="0" transform="translate(0,-62)"><g stroke-linecap="round"><line x1="238" y1="322" x2="322" y2="356" stroke="#a89e8a" stroke-width="15"/><line x1="238" y1="322" x2="322" y2="356" stroke="url(#sc-clay)" stroke-width="12"/>',
    '<line x1="406" y1="322" x2="322" y2="356" stroke="#a89e8a" stroke-width="15"/><line x1="406" y1="322" x2="322" y2="356" stroke="url(#sc-clay)" stroke-width="12"/>',
    '<line x1="236" y1="321" x2="320" y2="354" stroke="#fff" stroke-width="2.5" opacity="0.8"/><line x1="408" y1="321" x2="324" y2="354" stroke="#fff" stroke-width="2.5" opacity="0.8"/></g>',
    '<g stroke="#8a95a0" stroke-width="2" fill="none" stroke-linecap="round"><path d="M232 322 L214 316 M230 320 L211 322 M231 324 L213 330"/><path d="M412 322 L430 316 M414 320 L433 322 M413 324 L431 330"/><path d="M322 362 L322 372 M318 362 L316 374 M326 362 L328 374"/></g></g>',

    '<g id="sc-ring-front" opacity="0" transform="translate(0,-62)"><g clip-path="url(#sc-ringFront)"><ellipse cx="322" cy="334" rx="108" ry="23" fill="none" stroke="#7f8b95" stroke-width="8"/><ellipse cx="322" cy="332" rx="108" ry="23" fill="none" stroke="#dfe6eb" stroke-width="3"/></g>',
    '<rect x="428" y="327" width="132" height="9" rx="3" fill="url(#sc-steelH)" stroke="#6b7782"/><rect x="538" y="318" width="44" height="28" rx="5" fill="url(#sc-iron)" stroke="#262d34" stroke-width="1.5"/><circle cx="560" cy="332" r="5" fill="#8794a0" stroke="#262d34"/></g>',

    /* ---- the Bunsen burner (hidden until placed): hose, base, barrel, air collar, the turning collar, the flame ---- */
    '<g id="sc-burner" opacity="0">',
    '<g id="sc-flame-g" opacity="0"><g id="sc-flame-shape"><path d="M322 428 C 296 392, 302 340, 316 314 C 319 306, 321 298, 322 288 C 323 298, 325 306, 328 314 C 342 340, 348 392, 322 428 Z" fill="url(#sc-flame)"/>',
    '<path d="M322 428 C 310 408, 312 384, 322 358 C 332 384, 334 408, 322 428 Z" fill="#2f6bd8" opacity="0.85"/></g></g>',
    '<path d="M256 578 C 210 586, 160 604, 100 628 C 60 644, 30 670, 0 700" fill="none" stroke="#2b3138" stroke-width="12" stroke-linecap="round"/>',
    '<ellipse cx="322" cy="590" rx="78" ry="9" fill="#000" opacity="0.18" filter="url(#sc-soft)"/>',
    '<path d="M250 580 Q250 566 268 562 L376 562 Q394 566 394 580 L394 586 Q394 594 380 594 L264 594 Q250 594 250 586 Z" fill="url(#sc-iron)" stroke="#262d34" stroke-width="1.5"/><rect x="262" y="565" width="112" height="3" rx="1.5" fill="#fff" opacity="0.25"/>',
    '<rect x="309" y="428" width="26" height="136" rx="3" fill="url(#sc-steel)" stroke="#6b7782"/><rect x="306" y="424" width="32" height="8" rx="2" fill="url(#sc-steelH)" stroke="#6b7782"/>',
    '<rect x="301" y="494" width="42" height="26" rx="3" fill="url(#sc-iron)" stroke="#262d34" stroke-width="1.5"/><ellipse cx="311" cy="507" rx="4" ry="6" fill="#0e1318"/><ellipse cx="322" cy="507" rx="4" ry="6" fill="#0e1318"/><ellipse cx="333" cy="507" rx="4" ry="6" fill="#0e1318"/>',
    '<g id="sc-collar"><rect x="302" y="538" width="40" height="24" rx="3" fill="url(#sc-steel)" stroke="#59636d" stroke-width="1.5"/><g id="sc-grooves" stroke="#59636d" stroke-width="1.4" opacity="0.8"></g></g>',
    '<g id="sc-turn-hint" opacity="0"><path d="M296 574 Q322 588 348 574" fill="none" stroke="#2f6bd8" stroke-width="2.5" stroke-linecap="round"/><path d="M296 574 l2 -9 l7 6 z" fill="#2f6bd8"/><path d="M348 574 l-2 -9 l-7 6 z" fill="#2f6bd8"/></g>',
    '</g>',

    '<g id="sc-layer-bench"></g>',
    '<g id="sc-fx"></g>',
    '<g id="sc-bottle-over" opacity="0"></g>',
    '<g id="sc-targets"></g>',
    '</svg>'
  ].join('');

  /* the crucible, drawn with its base at (0, 0); the lid and what is inside are part of the group */
  function crucibleMarkup() {
    return [
      '<g class="cruc" id="sc-cruc"><g class="cruc-in" transform="translate(-322 -330)">',
      '<ellipse cx="322" cy="331" rx="30" ry="6" fill="#000" opacity="0.18"/>',
      '<path d="M270 220 C 274 262, 284 306, 298 330 L 346 330 C 360 306, 370 262, 374 220" fill="url(#sc-porc)" stroke="#5f5f5f" stroke-width="2" stroke-linejoin="round"/>',
      '<path id="sc-hotbody" d="M270 220 C 274 262, 284 306, 298 330 L 346 330 C 360 306, 370 262, 374 220" fill="url(#sc-hot)" opacity="0"/>',
      '<ellipse cx="322" cy="220" rx="52" ry="11" fill="url(#sc-rimIn)" stroke="#5f5f5f" stroke-width="2"/>',
      '<ellipse cx="322" cy="222" rx="42" ry="7" fill="#d4d4d4" opacity="0.55"/>',
      '<ellipse id="sc-ash" cx="322" cy="223" rx="40" ry="6.5" fill="#f5f5f1" opacity="0"/>',
      '<g id="sc-cry" opacity="0"></g>',
      '<g id="sc-glow-g" opacity="0"><ellipse cx="322" cy="222" rx="34" ry="6" fill="url(#sc-glow)"/><ellipse cx="322" cy="222" rx="16" ry="3.5" fill="#ffffff"/></g>',
      '<g id="sc-lid" class="lid"><g id="sc-lid-t"><path d="M268 211 Q268 200 322 198 Q376 200 376 211 L376 215 Q376 224 322 226 Q268 224 268 215 Z" fill="url(#sc-porc)" stroke="#5f5f5f" stroke-width="2"/>',
      '<ellipse cx="322" cy="203" rx="50" ry="6.5" fill="#f4f4f4" stroke="#8a8a8a" stroke-width="1.2"/><ellipse cx="322" cy="201" rx="7" ry="3" fill="#e6e6e6" stroke="#8a8a8a"/></g></g>',
      '</g></g>'
    ].join('');
  }

  var LID_STATES = {
    off: { t: 'translate(-60,-130) rotate(-30 322 200)', o: 0 },
    closed: { t: '', o: 1 },
    crack: { t: 'translate(-20,3) rotate(5 280 214)', o: 1 },
    wide: { t: 'translate(-44,9) rotate(12 280 214)', o: 1 },
    lift: { t: 'translate(-86,-46) rotate(-28 322 205)', o: 1 },   /* held up and to the side for a moment */
    pad: { t: '', o: 0 }                       /* the lid is on the ceramic pad, not on the crucible */
  };

  function svg(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function create(opts) {
    opts = opts || {};
    var speed = opts.speed == null ? 1 : opts.speed;
    var holder = document.createElement('div');
    holder.className = 'scene';
    holder.innerHTML = MARKUP;
    var root = holder.firstChild;
    var $ = function (id) { return root.querySelector('#' + id); };
    var layerTri = $('sc-layer-tri'), layerBench = $('sc-layer-bench'), fx = $('sc-fx'), targets = $('sc-targets');

    /* wire gauze mesh */
    (function () {
      var tl = [440, 640], tr = [610, 640], br = [598, 676], bl = [428, 676], mesh = $('sc-mesh'), n = 9;
      function lerp(p, q, t) { return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; }
      for (var i = 0; i <= n; i++) {
        var t = i / n, a = lerp(tl, tr, t), b = lerp(bl, br, t), c = lerp(tl, bl, t), d = lerp(tr, br, t);
        mesh.appendChild(svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }));
        mesh.appendChild(svg('line', { x1: c[0], y1: c[1], x2: d[0], y2: d[1] }));
      }
    })();

    /* the crucible and lid */
    var holderC = document.createElementNS(NS, 'g');
    holderC.innerHTML = crucibleMarkup();
    var cruc = holderC.firstChild;
    layerBench.appendChild(cruc);
    var where = 'bench', lidState = 'closed', hasLid = true;
    var lidT = $('sc-lid-t'), lidG = $('sc-lid');

    function place(loc) {
      where = loc;
      var p = loc === 'tri' ? TRI : (loc === 'pan' ? PAN : (loc === 'padloc' ? PADLOC : BENCH));
      var target = loc === 'tri' ? layerTri : layerBench;
      if (cruc.parentNode !== target) target.appendChild(cruc);
      cruc.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ') scale(' + CRUC_SCALE + ')');
    }
    place('bench');

    /* the lid set down on the ceramic pad (the oval on the wire gauze) */
    var padLid = svg('g', { transform: 'translate(519 650) scale(0.7) translate(-322 -212)', opacity: 0 });
    (function () {
      var c = lidT.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
      c.removeAttribute('id'); c.setAttribute('transform', '');
      padLid.appendChild(c);
      layerBench.appendChild(padLid);
    })();

    function setLid(state) {
      lidState = state;
      padLid.setAttribute('opacity', state === 'pad' ? 1 : 0);
      var s = LID_STATES[state] || LID_STATES.closed;
      lidT.setAttribute('transform', s.t);
      lidG.style.transition = speed === 0 ? 'none' : 'opacity 0.5s ease';
      lidG.style.opacity = String(s.o);
    }
    setLid('closed');

    /* ---- colours: blue copper(II) sulfate pentahydrate crystals, white anhydrous powder ---- */
    var BLUES = ['#2a73d1', '#3b86e0', '#1f5fb8', '#5aa0ee'], EDGE = '#164b93', WHITE = ['#f2f4f4', '#e6eaeb', '#dde3e5', '#fafbfb'], WHITE_EDGE = '#aab6bc';
    function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
    function blend(c1, c2, t) {          /* t = 0 gives c1, t = 1 gives c2 */
      var a = hex(c1), b = hex(c2);
      return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }).join(',') + ')';
    }
    function rnd(i, salt) { var x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); }
    function crystalPoints(r, i) {       /* an irregular little crystal: 6 corners */
      var pts = [];
      for (var k = 0; k < 6; k++) {
        var a = k / 6 * Math.PI * 2 + rnd(i, 3) * 1.2, rr = r * (0.68 + rnd(i * 7 + k, 5) * 0.5);
        pts.push((Math.cos(a) * rr).toFixed(1) + ',' + (Math.sin(a) * rr * 0.82).toFixed(1));
      }
      return pts.join(' ');
    }
    function crystalEl(i, r, h) {         /* h: 1 = blue hydrate, 0 = white anhydrous */
      var shade = Math.floor(rnd(i, 9) * 4);
      var poly = svg('polygon', { points: crystalPoints(r, i), 'stroke-width': 0.9, 'stroke-linejoin': 'round' });
      poly.setAttribute('fill', blend(WHITE[shade], BLUES[shade], h));
      poly.setAttribute('stroke', blend(WHITE_EDGE, EDGE, h));
      poly._shade = shade;
      return poly;
    }
    function tintCrystal(poly, h) {
      poly.setAttribute('fill', blend(WHITE[poly._shade], BLUES[poly._shade], h));
      poly.setAttribute('stroke', blend(WHITE_EDGE, EDGE, h));
    }

    /* the solid in the bottle */
    (function () {
      var g = $('sc-hb-cry');
      g.appendChild(svg('rect', { x: -35, y: 26, width: 70, height: 80, rx: 7, fill: '#2766c0', opacity: 0.92 }));
      for (var i = 0; i < 80; i++) {
        var c = crystalEl(i, 5.5, 1), x = -31 + rnd(i, 1) * 62, y = 30 + rnd(i, 2) * 72;
        var w = svg('g', { transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + Math.round(rnd(i, 4) * 180) + ')' });
        w.appendChild(c); g.appendChild(w);
      }
    })();

    /* the powder in the crucible: a layer and a few crystals at its mouth */
    var cryG = $('sc-cry'), cryPolys = [];
    (function () {
      for (var i = 0; i < 22; i++) {
        var c = crystalEl(100 + i, 5.2, 1), x = 322 - 34 + rnd(i, 11) * 68, y = 223 - 3 + rnd(i, 12) * 6;
        var w = svg('g', { transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + Math.round(rnd(i, 14) * 180) + ')' });
        w.appendChild(c); cryG.appendChild(w); cryPolys.push(c);
      }
    })();
    function setPowder(amount, h) {       /* amount 0..1 is how much is in the crucible; h 1 = blue, 0 = white */
      var ash = $('sc-ash');
      ash.setAttribute('opacity', amount > 0 ? 1 : 0);
      ash.setAttribute('fill', blend('#f1f3f3', '#2c76d2', h));
      cryG.setAttribute('opacity', amount > 0 ? 1 : 0);
      cryPolys.forEach(function (c) { tintCrystal(c, h); });
    }
    setPowder(0, 1);

    /* ---- the weigh boat, and the pile of crystals in it ---- */
    var BOAT = { bench: { x: 802, y: 652 }, pan: { x: 962, y: 467 } };
    var boat = svg('g', { id: 'sc-boat' });
    boat.innerHTML = '<ellipse cx="0" cy="1" rx="38" ry="4" fill="#000" opacity="0.16"/>' +
      '<path d="M-34 -15 L34 -15 L27 0 L-27 0 Z" fill="#f6f9fb" stroke="#97a6b1" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M-31 -14 L31 -14 L25.5 -3 L-25.5 -3 Z" fill="#dfe7ec"/><g id="sc-pile" transform="translate(0 -3)"></g>' +
      '<path d="M-34 -15 L34 -15" stroke="#ffffff" stroke-width="2.4" opacity="0.8"/>' +
      '<rect x="-44" y="-34" width="88" height="44" fill="transparent"/>';
    layerBench.appendChild(boat);
    var pile = $('sc-pile'), pileN = 0, boatAt = 'bench';
    function placeBoat(loc) { boatAt = loc; var p = BOAT[loc]; boat.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ') scale(1.15)'); }
    placeBoat('bench');
    function clearPile() { while (pile.firstChild) pile.removeChild(pile.firstChild); pileN = 0; }
    /* n more crystals fall from the bottle's mouth into the boat and settle in the heap */
    function addCrystals(n, done, instant) {
      var pending = n, total0 = pileN;
      function settle() { if (--pending <= 0 && done) done(); }
      for (var j = 0; j < n; j++) {
        (function (j) {
          var i = total0 + j, hMax = Math.min(1, (i + 1) / 170) * 19 + 2;
          var x = (rnd(i, 21) - 0.5) * 2 * 25, hh = hMax * (1 - Math.pow(Math.abs(x) / 27, 1.5)), y = -rnd(i, 22) * hh;
          var outer = svg('g', { transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')' }), inner = svg('g'), c = crystalEl(i, 4.6, 1);
          inner.setAttribute('transform', 'rotate(' + Math.round(rnd(i, 23) * 180) + ')');
          inner.appendChild(c); outer.appendChild(inner); pile.appendChild(outer); pileN++;
          if (speed === 0 || instant || !outer.animate) { settle(); return; }
          outer.style.opacity = 0;
          var delay = j / n * 380 * speed, fall = (480 + rnd(i, 24) * 260) * speed, dx = (rnd(i, 25) - 0.5) * 10 - x * 0.9, dy = -60 - y;
          var a = outer.animate([{ transform: 'translate(' + (x + dx) + 'px,' + (y + dy) + 'px)', opacity: 1 }, { transform: 'translate(' + x + 'px,' + y + 'px)', opacity: 1 }],
            { duration: fall, delay: delay, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'both' });
          a.onfinish = function () { outer.style.opacity = 1; settle(); };
        })(j);
      }
      if (n === 0 && done) done();
    }
    /* the boat is poured into the crucible: crystals fall from above the crucible's mouth, then rest in it */
    function pourFall(done) {
      var cx = PADLOC.x, mouth = PADLOC.y - 78;
      var left = 14;
      function one() { if (--left <= 0 && done) done(); }
      for (var j = 0; j < 14; j++) {
        (function (j) {
          var c = crystalEl(300 + j, 4.4, 1), g = svg('g', { transform: 'translate(' + (cx + (rnd(j, 31) - 0.5) * 36).toFixed(1) + ' ' + mouth + ')' }), inner = svg('g');
          inner.appendChild(c); g.appendChild(inner); fx.appendChild(g);
          if (speed === 0 || !inner.animate) { g.parentNode.removeChild(g); one(); return; }
          var a = inner.animate([{ transform: 'translate(' + ((rnd(j, 32) - 0.5) * 30) + 'px,-70px)', opacity: 1 }, { transform: 'translate(0px,0px)', opacity: 1 }],
            { duration: (380 + rnd(j, 33) * 250) * speed, delay: j * 40 * speed, easing: 'ease-in', fill: 'both' });
          a.onfinish = function () { if (g.parentNode) g.parentNode.removeChild(g); one(); };
        })(j);
      }
    }

    function setPlaced(name, on) {
      var ids = { stand: ['sc-stand', 'sc-ring-front'], tri: ['sc-tri-back', 'sc-tri-front'], burner: ['sc-burner'] }[name];
      ids.forEach(function (id) {
        var n = $(id); n.style.transition = speed === 0 ? 'none' : 'opacity 0.5s ease'; n.setAttribute('opacity', on ? 1 : 0); n.style.opacity = on ? 1 : 0;
      });
    }

    function setReading(text) { $('sc-reading').textContent = text; }

    /* ---- the burner: the flame's height, and the turning collar ---- */
    var grooves = $('sc-grooves');
    for (var gi = 0; gi < 7; gi++) grooves.appendChild(svg('line', { x1: 306 + gi * 5.4, y1: 540, x2: 306 + gi * 5.4, y2: 560 }));
    function setCollar(v) {       /* v 0..1: the grooves slide round as the collar turns */
      var off = (v * 40) % 5.4;
      grooves.setAttribute('transform', 'translate(' + off.toFixed(2) + ' 0)');
    }
    setCollar(0);
    function setFlame(h) {        /* h: flame height in px (0 is off) */
      var g = $('sc-flame-g');
      g.setAttribute('opacity', h > 1 ? 1 : 0);
      if (h > 1) $('sc-flame-shape').setAttribute('transform', 'translate(322 428) scale(' + (0.82 + Math.min(h, FLAME_MAX) / 700).toFixed(3) + ' ' + (h / 140).toFixed(3) + ') translate(-322 -428)');
    }
    function turnHint(on) { $('sc-turn-hint').setAttribute('opacity', on ? 1 : 0); }

    /* ---- the crucible's glow, heat and contents ---- */
    function setGlow(a) { $('sc-glow-g').setAttribute('opacity', a); }
    function setHot(t) { $('sc-hotbody').setAttribute('opacity', Math.max(0, Math.min(1, t)) * 0.9); }

    /* ---- effects: steam puffs, white smoke, ammonia wisps, a drop ---- */
    function tipPoint() { return { x: TRI.x, y: TRI.y - 84 }; }
    function animate(el, frames, ms, done) {
      if (speed === 0 || !el.animate) { if (done) done(); return; }
      var a = el.animate(frames, { duration: ms * speed, fill: 'forwards', easing: 'ease-out' });
      a.onfinish = function () { if (done) done(); };
    }
    function puff(kind, n) {
      var base = tipPoint();
      for (var i = 0; i < (n || 1); i++) {
        (function (i) {
          var c = svg('circle', { cx: base.x + (Math.random() - 0.5) * 50, cy: base.y + 8, r: kind === 'smoke' ? 9 : 7, class: 'fx-' + kind });
          fx.appendChild(c);
          var dx = (Math.random() - 0.5) * 40 + (kind === 'smoke' ? 36 : 0), dy = -(70 + Math.random() * 60);
          animate(c, [{ transform: 'translate(0px,0px) scale(1)', opacity: 0.85 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + (kind === 'smoke' ? 3.2 : 2.4) + ')', opacity: 0 }],
            (kind === 'smoke' ? 2600 : 1800) + i * 120, function () { if (c.parentNode) c.parentNode.removeChild(c); });
        })(i);
      }
    }
    /* a gas leaving: small pale wisps that rise and drift, with the gas's name (H2O here: steam is a gas, so it is drawn as wisps) */
    function wisps(n, label) {
      var base = tipPoint(), water = label === 'H₂O';
      for (var i = 0; i < (n || 1); i++) {
        var outer = svg('g', { class: 'fx-gas' }), g = svg('g');
        g.appendChild(svg('path', { d: 'M0 0 q8 -12 0 -24 q-8 -12 0 -24', fill: 'none', stroke: water ? '#8fbbe6' : '#6fbf9a', 'stroke-width': 5, 'stroke-linecap': 'round' }));
        var t = svg('text', { x: 10, y: -30, 'font-size': 16, 'font-weight': 700, fill: water ? '#1f5f9f' : '#1f6b4b' }); t.textContent = label || 'NH₃'; g.appendChild(t);
        g.setAttribute('transform', 'translate(' + (base.x + (Math.random() - 0.5) * 50) + ' ' + (base.y + 6) + ')');
        outer.appendChild(g);
        fx.appendChild(outer);
        animate(outer, [{ opacity: 1, transform: 'translate(0px,0px)' }, { opacity: 0, transform: 'translate(' + ((Math.random() - 0.3) * 50) + 'px,-120px)' }], 2800 + i * 200,
          (function (gg) { return function () { if (gg.parentNode) gg.parentNode.removeChild(gg); }; })(outer));
      }
    }
    function clearFx() { while (fx.firstChild) fx.removeChild(fx.firstChild); }

    /* ---- the bottle of hydrate: upright on the bench, or upside down with its mouth just above the boat on the balance ---- */
    var diBody = $('sc-di-body');
    var BOTTLE = { bench: 'translate(132 466) scale(1.2)', over: 'translate(962 392) rotate(180) scale(1.2)' };
    function bottle(over) { diBody.setAttribute('transform', over ? BOTTLE.over : BOTTLE.bench); }

    /* ---- drop targets (invisible until the student is carrying something) ---- */
    var TARGETS = {
      pan: [872, 392, 180, 96], seat: [236, 150, 170, 150], over: [900, 250, 124, 150], pad: [430, 610, 190, 80], cruc: [466, 548, 106, 118],
      burner: [236, 410, 180, 195], bench: [640, 520, 160, 90]
    };
    Object.keys(TARGETS).forEach(function (k) {
      var t = TARGETS[k], r = svg('rect', { x: t[0], y: t[1], width: t[2], height: t[3], rx: 12, class: 'drop', 'data-drop': k, tabindex: 0, role: 'button', 'aria-label': 'Drop here: ' + k });
      targets.appendChild(r);
    });
    function showTargets(keys) {
      Array.prototype.forEach.call(targets.children, function (r) { r.style.display = keys.indexOf(r.getAttribute('data-drop')) >= 0 ? '' : 'none'; });
    }
    showTargets([]);


    /* a picture of the thing being carried, for the drag (the real drawing, cut out of the bench) */
    function ghost(key) {
      var map = { cruc: [cruc], boat: [boat], hbottle: [diBody], stand: [$('sc-stand'), $('sc-ring-front')], tri: [$('sc-tri-back'), $('sc-tri-front')], burner: [$('sc-burner')], lid: [lidT] };
      var els = map[key];
      if (!els) return null;
      var wrap = svg('g');
      els.forEach(function (e) {
        var c = e.cloneNode(true);
        Array.prototype.forEach.call(c.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
        c.removeAttribute('id'); c.setAttribute('opacity', 1); c.style.opacity = 1;
        if (e === cruc) c.setAttribute('transform', 'scale(' + CRUC_SCALE + ')');
        else if (e === boat) c.setAttribute('transform', '');
        else if (e === lidT) c.setAttribute('transform', 'scale(' + CRUC_SCALE + ')');
        else if (e === diBody) c.setAttribute('transform', '');
        c.removeAttribute('data-tile');
        wrap.appendChild(c);
      });
      fx.appendChild(wrap);
      var b = wrap.getBBox();
      fx.removeChild(wrap);
      var k = (root.getScreenCTM() ? root.getScreenCTM().a : 0.7) || 0.7, pad = 6;
      var g = svg('svg', { viewBox: (b.x - pad) + ' ' + (b.y - pad) + ' ' + (b.width + 2 * pad) + ' ' + (b.height + 2 * pad), width: Math.max(24, (b.width + 2 * pad) * k), height: Math.max(24, (b.height + 2 * pad) * k) });
      g.setAttribute('overflow', 'visible');
      g.appendChild(wrap);
      return g;
    }

    /* hot crucible: red glow of the whole group when very hot */
    function setSpeed(v) { speed = v; }

    return {
      node: holder, root: root, place: place, where: function () { return where; }, setLid: setLid, lid: function () { return lidState; },
      setPlaced: setPlaced, setReading: setReading, setCollar: setCollar, setFlame: setFlame, turnHint: turnHint, setGlow: setGlow, setHot: setHot,
      setPowder: setPowder, placeBoat: placeBoat, boatAt: function () { return boatAt; }, addCrystals: addCrystals, clearPile: clearPile, pileCount: function () { return pileN; }, pourFall: pourFall,
      puff: puff, wisps: wisps, clearFx: clearFx, bottle: bottle, showTargets: showTargets,
      setSpeed: setSpeed, ghost: ghost, nodes: { cruc: cruc, boat: boat, lid: lidG, bottle: diBody }, TRI: TRI, PAN: PAN, FLAME_TOUCH: FLAME_TOUCH, FLAME_MAX: FLAME_MAX, BURNER_TOP: BURNER_TOP
    };
  }

  return { create: create, TRI: TRI, FLAME_TOUCH: FLAME_TOUCH, FLAME_MAX: FLAME_MAX, BURNER_TOP: BURNER_TOP };
})();

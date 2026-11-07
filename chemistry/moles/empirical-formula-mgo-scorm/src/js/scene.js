/* scene.js: the 2D lab bench, drawn in code (the teacher's sketch, in design/bench-sketch.svg).
 *
 * One SVG. The pieces the student places (ring stand, clay triangle, burner, crucible) are hidden until they are
 * placed; the balance, the DI water bottle and the wire gauze pad are always there. The crucible and its lid are
 * one group that moves between three places: the bench, the balance pan and the clay triangle. The flame, the
 * glow, the steam, the smoke, the ammonia gas and the drop are effects drawn on top.
 *
 *   Scene.create() -> { node, el, setPlaced, setCrucible, setLid, setMg, setReading, setFlame, setGlow, setHot,
 *                       setAsh, setNitride, setCollar, puff, smoke, wisps, drop, bottle, ... }
 *
 * Coordinates are the sketch's (a 1280 x 700 box). The crucible's base sits at y = 284 in the triangle, so a
 * flame whose tip reaches y = 284 touches its bottom (FLAME_TOUCH).
 */

var Scene = (function () {
  'use strict';

  var TRI = { x: 322, y: 284 };               /* the crucible's base centre in the clay triangle */
  var PAN = { x: 962, y: 466 };               /* on the balance pan */
  var BENCH = { x: 740, y: 598 };             /* on the bench, beside the balance */
  var BURNER_TOP = 428;                       /* the top of the barrel, where the flame starts */
  var FLAME_TOUCH = BURNER_TOP - TRI.y;       /* flame height (px) at which the tip touches the crucible's bottom: 144 */
  var FLAME_MAX = 232;
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
    '<linearGradient id="sc-mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset="0.5" stop-color="#aeb8c0"/><stop offset="1" stop-color="#e3e8ec"/></linearGradient>',
    '<linearGradient id="sc-hot" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff7a1a" stop-opacity="0.95"/><stop offset="0.55" stop-color="#ff5a1a" stop-opacity="0.35"/><stop offset="1" stop-color="#ff5a1a" stop-opacity="0"/></linearGradient>',
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
    '<rect x="836" y="330" width="248" height="166" rx="6" fill="#eaf4fa" fill-opacity="0.35" stroke="#8fa8b8" stroke-width="2"/><rect x="846" y="340" width="228" height="8" rx="3" fill="#fff" opacity="0.45"/>',
    '<polygon points="1084,330 1148,352 1148,476 1084,496" fill="url(#sc-glass)" stroke="#8fa8b8" stroke-width="2"/><polygon points="1084,330 1148,352 1148,360 1084,338" fill="#fff" opacity="0.4"/><rect x="1138" y="396" width="6" height="44" rx="2" fill="#8fa8b8"/>',
    '<rect x="955" y="470" width="14" height="26" fill="url(#sc-steel)"/><ellipse cx="962" cy="470" rx="68" ry="9" fill="url(#sc-steel)" stroke="#6b7782" stroke-width="1.5"/>',
    '<g id="sc-paper" opacity="0"><path d="M930 468 L994 468 L1002 476 L922 476 Z" fill="#fff" stroke="#b8c3cc" stroke-width="1.2"/></g>',
    '<g id="sc-pan-slot"></g>',
    '</g>',

    '<g id="sc-di"><g id="sc-di-body" transform="translate(-75,0)">',
    '<ellipse cx="170" cy="598" rx="34" ry="5" fill="#000" opacity="0.16" filter="url(#sc-soft)"/>',
    '<path d="M148 592 L148 520 Q148 500 160 494 L160 484 L180 484 L180 494 Q192 500 192 520 L192 592 Q192 598 186 598 L154 598 Q148 598 148 592 Z" fill="url(#sc-plastic)" stroke="#7f8f9a" stroke-width="1.6"/>',
    '<path d="M162 484 L162 462 L178 462 L178 484 Z" fill="#fff" stroke="#7f8f9a" stroke-width="1.6"/><path d="M165 462 L170 440 L175 462 Z" fill="#f5f5f5" stroke="#7f8f9a" stroke-width="1.6"/>',
    '<rect x="150" y="530" width="40" height="34" rx="3" fill="#2f6bd8"/><text x="170" y="545" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">DI</text><text x="170" y="558" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">H₂O</text>',
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
      '<path id="sc-hot" d="M270 220 C 274 262, 284 306, 298 330 L 346 330 C 360 306, 370 262, 374 220" fill="url(#sc-hot)" opacity="0"/>',
      '<ellipse cx="322" cy="220" rx="52" ry="11" fill="url(#sc-rimIn)" stroke="#5f5f5f" stroke-width="2"/>',
      '<ellipse cx="322" cy="222" rx="42" ry="7" fill="#d4d4d4" opacity="0.55"/>',
      '<ellipse id="sc-ash" cx="322" cy="223" rx="40" ry="6.5" fill="#f5f5f1" opacity="0"/>',
      '<g id="sc-nitride" opacity="0"><circle cx="304" cy="224" r="3" fill="#b7c23f"/><circle cx="311" cy="222" r="2.2" fill="#c4cf4a"/><circle cx="338" cy="224" r="3.2" fill="#b7c23f"/><circle cx="330" cy="226" r="2.2" fill="#a9b535"/><circle cx="322" cy="222" r="2" fill="#c4cf4a"/></g>',
      '<g id="sc-mg-in" opacity="0"><path d="M300 224 q8 -7 14 -1 q6 6 12 -1 q6 -6 12 0" fill="none" stroke="#6f7a83" stroke-width="3.4" stroke-linecap="round"/><path d="M300 223.4 q8 -7 14 -1 q6 6 12 -1 q6 -6 12 0" fill="none" stroke="url(#sc-mg)" stroke-width="1.8" stroke-linecap="round"/></g>',
      '<g id="sc-glow-g" opacity="0"><ellipse cx="322" cy="214" rx="110" ry="70" fill="url(#sc-glow)" filter="url(#sc-blur6)"/><circle cx="322" cy="222" r="22" fill="url(#sc-glow)"/></g>',
      '<g id="sc-lid" class="lid"><g id="sc-lid-t"><path d="M268 211 Q268 200 322 198 Q376 200 376 211 L376 215 Q376 224 322 226 Q268 224 268 215 Z" fill="url(#sc-porc)" stroke="#5f5f5f" stroke-width="2"/>',
      '<ellipse cx="322" cy="203" rx="50" ry="6.5" fill="#f4f4f4" stroke="#8a8a8a" stroke-width="1.2"/><ellipse cx="322" cy="201" rx="7" ry="3" fill="#e6e6e6" stroke="#8a8a8a"/></g></g>',
      '</g></g>'
    ].join('');
  }

  var LID_STATES = {
    off: { t: 'translate(-60,-130) rotate(-30 322 200)', o: 0 },
    closed: { t: '', o: 1 },
    crack: { t: 'translate(-20,3) rotate(5 280 214)', o: 1 },
    wide: { t: 'translate(-44,9) rotate(12 280 214)', o: 1 }
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
      var p = loc === 'tri' ? TRI : (loc === 'pan' ? PAN : BENCH);
      var target = loc === 'tri' ? layerTri : layerBench;
      if (cruc.parentNode !== target) target.appendChild(cruc);
      cruc.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
    }
    place('bench');

    function setLid(state) {
      lidState = state;
      var s = LID_STATES[state] || LID_STATES.closed;
      lidT.setAttribute('transform', s.t);
      lidG.style.transition = speed === 0 ? 'none' : 'opacity 0.5s ease';
      lidG.style.opacity = String(s.o);
    }
    setLid('closed');

    /* the magnesium piece: on the bench, on the balance paper, in the crucible */
    var mgLoose = svg('g', { id: 'sc-mg-loose' });
    mgLoose.innerHTML = '<path d="M-16 0 q6 -9 12 -2 q6 8 12 -2 q6 -8 12 -1 q4 4 8 1" fill="none" stroke="#6f7a83" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M-16 -1.5 q6 -9 12 -2 q6 8 12 -2 q6 -8 12 -1 q4 4 8 1" fill="none" stroke="url(#sc-mg)" stroke-width="2.6" stroke-linecap="round"/>';
    var mgSlot = { bench: [672, 590], pan: [962, 466], hidden: null };
    layerBench.appendChild(mgLoose);
    function setMg(where_) {
      var inCruc = where_ === 'cruc';
      $('sc-mg-in').setAttribute('opacity', inCruc ? 1 : 0);
      $('sc-paper').setAttribute('opacity', where_ === 'pan' ? 1 : 0);
      var s = mgSlot[where_];
      if (s) { mgLoose.setAttribute('transform', 'translate(' + s[0] + ' ' + s[1] + ')'); mgLoose.setAttribute('opacity', 1); }
      else mgLoose.setAttribute('opacity', 0);
      if (where_ === 'bench') { /* a little weighing paper under it on the bench */ }
    }
    setMg('bench');

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
    function setHot(t) { $('sc-hot').setAttribute('opacity', Math.max(0, Math.min(1, t)) * 0.7); }
    function setAsh(a, wet) { var e = $('sc-ash'); e.setAttribute('opacity', a); e.setAttribute('fill', wet ? '#d3d8d4' : '#f5f5f1'); }
    function setNitride(a) { $('sc-nitride').setAttribute('opacity', a); }

    /* ---- effects: steam puffs, white smoke, ammonia wisps, a drop ---- */
    function tipPoint() { return { x: TRI.x, y: TRI.y - 118 }; }
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
    /* ammonia: small pale wisps that rise and drift, with the gas's name, NH3 */
    function wisps(n) {
      var base = tipPoint();
      for (var i = 0; i < (n || 1); i++) {
        var outer = svg('g', { class: 'fx-nh3' }), g = svg('g');
        g.appendChild(svg('path', { d: 'M0 0 q8 -12 0 -24 q-8 -12 0 -24', fill: 'none', stroke: '#6fbf9a', 'stroke-width': 5, 'stroke-linecap': 'round' }));
        var t = svg('text', { x: 10, y: -30, 'font-size': 16, 'font-weight': 700, fill: '#1f6b4b' }); t.textContent = 'NH₃'; g.appendChild(t);
        g.setAttribute('transform', 'translate(' + (base.x + (Math.random() - 0.5) * 60) + ' ' + (base.y + 6) + ')');
        outer.appendChild(g);
        fx.appendChild(outer);
        animate(outer, [{ opacity: 1, transform: 'translate(0px,0px)' }, { opacity: 0, transform: 'translate(' + ((Math.random() - 0.3) * 50) + 'px,-120px)' }], 2800 + i * 200,
          (function (gg) { return function () { if (gg.parentNode) gg.parentNode.removeChild(gg); }; })(outer));
      }
    }
    function clearFx() { while (fx.firstChild) fx.removeChild(fx.firstChild); }

    /* ---- the DI water bottle: over the crucible, inverted, and a drop that falls ---- */
    var diBody = $('sc-di-body');
    var OVER = 'translate(322 150) scale(0.8) rotate(180) translate(-95 -440)';
    function bottle(over) {
      diBody.style.transition = speed === 0 ? 'none' : 'opacity 0.3s';
      if (over) { diBody.setAttribute('transform', OVER); }
      else diBody.setAttribute('transform', 'translate(-75,0)');
    }
    function dropWater(done) {
      var d = svg('path', { d: 'M0 -9 C6 0 7 5 0 7 C-7 5 -6 0 0 -9 Z', fill: '#3a8ee8', stroke: '#1d5fae', 'stroke-width': 1 });
      d.setAttribute('transform', 'translate(322 154)');
      fx.appendChild(d);
      animate(d, [{ transform: 'translate(322px,156px)' }, { transform: 'translate(322px,' + (TRI.y - 112) + 'px)' }], 420, function () { if (d.parentNode) d.parentNode.removeChild(d); if (done) done(); });
      if (speed === 0 && done) done();
    }

    /* ---- drop targets (invisible until the student is carrying something) ---- */
    var TARGETS = {
      pan: [836, 330, 248, 166], stand: [440, 40, 250, 570], tri: [190, 190, 270, 140], seat: [236, 120, 170, 190],
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

    /* hot crucible: red glow of the whole group when very hot */
    function setSpeed(v) { speed = v; }

    return {
      node: holder, root: root, place: place, where: function () { return where; }, setLid: setLid, lid: function () { return lidState; }, setMg: setMg,
      setPlaced: setPlaced, setReading: setReading, setCollar: setCollar, setFlame: setFlame, turnHint: turnHint, setGlow: setGlow, setHot: setHot,
      setAsh: setAsh, setNitride: setNitride, puff: puff, wisps: wisps, clearFx: clearFx, bottle: bottle, dropWater: dropWater, showTargets: showTargets,
      setSpeed: setSpeed, TRI: TRI, PAN: PAN, FLAME_TOUCH: FLAME_TOUCH, FLAME_MAX: FLAME_MAX, BURNER_TOP: BURNER_TOP
    };
  }

  return { create: create, TRI: TRI, FLAME_TOUCH: FLAME_TOUCH, FLAME_MAX: FLAME_MAX, BURNER_TOP: BURNER_TOP };
})();

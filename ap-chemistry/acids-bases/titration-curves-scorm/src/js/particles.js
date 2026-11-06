/* particles.js: the particle diagram of the flask.
 *
 * Every particle has a place of its own in a jittered grid of 96 cells, shuffled
 * once so the kinds are mixed. As the titration moves, particles fade in and
 * out in the same places, so the eye can follow what changes:
 *   acid unit i (24 of them)  is an intact acid molecule or its anion
 *   H+ j (up to 24)           Na+ j (up to 36)         OH- j (up to 12)
 * The counts come from Titration.counts, never from here. Water is not drawn.
 * Every kind of particle is also labelled with its symbol, so colour is never
 * the only signal.
 */

var Particles = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var W = 600, H = 300, COLS = 12, ROWS = 8;
  var ACID0 = 0, H0 = 24, NA0 = 48, OH0 = 84;      /* where each kind starts in the shuffled cells */

  function s(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  /* 96 cells, jittered a little, in a fixed shuffled order */
  var CELLS = (function () {
    var rand = UI.rng(20240611), cells = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        cells.push({ x: (c + 0.5) * W / COLS + (rand() - 0.5) * 8, y: (r + 0.5) * H / ROWS + (rand() - 0.5) * 8 });
      }
    }
    return UI.shuffle(cells, rand);
  })();

  function ion(cls, label, cell) {
    var inner = s('g', { class: 'p ' + cls + ' off' }, [
      s('circle', { r: 12, cx: 0, cy: 0 }),
      s('text', { x: 0, y: 0, text: label })
    ]);
    return { outer: s('g', { transform: 'translate(' + cell.x.toFixed(1) + ' ' + cell.y.toFixed(1) + ')' }, [inner]), el: inner };
  }

  function molecule(cls, label, cell) {
    var inner = s('g', { class: 'p ' + cls + ' off' }, [
      s('rect', { x: -19, y: -12, width: 38, height: 24, rx: 8 }),
      s('text', { x: 0, y: 0, text: label })
    ]);
    return { outer: s('g', { transform: 'translate(' + cell.x.toFixed(1) + ' ' + cell.y.toFixed(1) + ')' }, [inner]), el: inner };
  }

  /* create(sys, { small, tally, pick }) -> { node, set(u), counts() }
     small   a thumbnail: no tally
     tally   a row of counts under the box (default true unless small)
     pick    a function(speciesId): the tally becomes buttons ("click the particle that...") */
  function create(sys, opts) {
    opts = opts || {};
    var S = Titration.SYSTEMS[sys];
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'pbox-svg', role: 'img', 'aria-label': 'Particle diagram of the flask' });
    svg.appendChild(s('rect', { x: 1, y: 1, width: W - 2, height: H - 2, rx: 12, class: 'pframe' }));
    var el = { HA: [], A: [], H: [], Na: [], OH: [] };
    var layer = s('g');
    svg.appendChild(layer);
    function put(list, made) { layer.appendChild(made.outer); list.push(made.el); }
    var i;
    for (i = 0; i < 24; i++) {
      if (S.weak) put(el.HA, molecule('p-ha', S.sym, CELLS[ACID0 + i]));
      put(el.A, ion('p-a', S.asym, CELLS[ACID0 + i]));
    }
    for (i = 0; i < 24; i++) put(el.H, ion('p-h', 'H⁺', CELLS[H0 + i]));
    for (i = 0; i < 36; i++) put(el.Na, ion('p-na', 'Na⁺', CELLS[NA0 + i]));
    for (i = 0; i < 12; i++) put(el.OH, ion('p-oh', 'OH⁻', CELLS[OH0 + i]));

    var node = document.createElement('figure');
    node.className = 'pbox' + (opts.small ? ' small' : '');
    node.appendChild(svg);

    var chips = {}, tally = null;
    if (!opts.small && opts.tally !== false) {
      tally = document.createElement('div');
      tally.className = 'ptally';
      Titration.species(sys).forEach(function (sp) {
        var chip = document.createElement(opts.pick ? 'button' : 'span');
        chip.className = 'ptc ptc-' + sp.id + (opts.pick ? ' pickable' : '');
        if (opts.pick) {
          chip.type = 'button';
          chip.addEventListener('click', function () { opts.pick(sp.id); });
        }
        var num = document.createElement('b');
        chip.appendChild(document.createTextNode(sp.label + ' '));
        chip.appendChild(num);
        chips[sp.id] = { node: chip, num: num, label: sp.label };
        tally.appendChild(chip);
      });
      node.appendChild(tally);
    }

    var last = null;
    function toggle(g, on) { g.classList.toggle('off', !on); }
    function showFirst(list, n) { for (var k = 0; k < list.length; k++) toggle(list[k], k < n); }
    function set(u) {
      var c = Titration.counts(sys, u);
      last = c;
      /* the acid units: the first c.A are the anion, the rest are intact molecules */
      if (S.weak) {
        for (var k = 0; k < 24; k++) {
          toggle(el.A[k], k < c.A);
          toggle(el.HA[k], k >= c.A);
        }
      } else {
        showFirst(el.A, 24);
      }
      showFirst(el.H, c.H); showFirst(el.Na, c.Na); showFirst(el.OH, c.OH);
      svg.setAttribute('aria-label', 'Particle diagram of the flask: ' + Titration.flask(sys, u));
      Object.keys(chips).forEach(function (id) {
        chips[id].num.textContent = c[id];
        chips[id].node.classList.toggle('zero', c[id] === 0);
      });
    }

    /* an empty flask, before the student has predicted what is in it */
    function blank() {
      last = null;
      ['HA', 'A', 'H', 'Na', 'OH'].forEach(function (k) { el[k].forEach(function (g) { toggle(g, false); }); });
      svg.setAttribute('aria-label', 'Particle diagram of the flask: empty until you predict what is in it');
      Object.keys(chips).forEach(function (id) { chips[id].num.textContent = '?'; chips[id].node.classList.remove('zero'); });
    }

    return { node: node, set: set, blank: blank, counts: function () { return last; }, chips: chips };
  }

  /* the reaction of the anion with water, drawn with the same shapes:
     F- + H2O -> HF + OH-  (one sample ion; the real fraction is far smaller) */
  function reaction(sys) {
    var S = Titration.SYSTEMS[sys];
    var svg = s('svg', { viewBox: '0 0 420 70', class: 'preact', role: 'img',
      'aria-label': S.anion + ' + H₂O → ' + S.acid + ' + OH⁻' });
    function ionAt(x, cls, label) {
      return s('g', { transform: 'translate(' + x + ' 35)', class: 'p ' + cls }, [s('circle', { r: 15 }), s('text', { x: 0, y: 0, text: label })]);
    }
    function boxAt(x, cls, label, w) {
      return s('g', { transform: 'translate(' + x + ' 35)', class: 'p ' + cls }, [s('rect', { x: -w / 2, y: -14, width: w, height: 28, rx: 9 }), s('text', { x: 0, y: 0, text: label })]);
    }
    function sign(x, t) { return s('text', { x: x, y: 35, class: 'psign', text: t }); }
    [ionAt(34, 'p-a', S.asym), sign(66, '+'), boxAt(106, 'p-water', 'H₂O', 50), s('text', { x: 170, y: 35, class: 'parrow', text: '→' }),
     boxAt(232, 'p-ha', S.sym, 44), sign(274, '+'), ionAt(312, 'p-oh', 'OH⁻')].forEach(function (n) { svg.appendChild(n); });
    return svg;
  }

  return { create: create, reaction: reaction };
})();

/* flask.js: the particle diagram of a buffer flask.
 *
 * Every particle has a place of its own in a jittered grid of 96 cells, shuffled
 * once so the kinds are mixed. As acid or base is added, particles fade in and
 * out in the same places, so the eye can follow what changes:
 *   family unit i (22)   is the acid member or the base member of the pair; when a
 *                        unit changes from one to the other it flashes
 *   Na+ (22)  Cl- (22)   the spectator ions
 *   H+ (12)   OH- (12)   free H+ and OH-
 * The counts come from Buf.counts, never from here. Water is not drawn.
 * Every kind of particle is also labelled with its symbol, so colour is never
 * the only signal.
 */

var Flask = (function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var W = 600, H = 300, COLS = 12, ROWS = 8;
  var FAM0 = 0, NA0 = 22, CL0 = 44, H0 = 66, OH0 = 78;      /* where each kind starts in the shuffled cells */

  function s(tag, attrs, kids) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null) return;
      if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  var CELLS = (function () {
    var rand = UI.rng(20241105), cells = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        cells.push({ x: (c + 0.5) * W / COLS + (rand() - 0.5) * 8, y: (r + 0.5) * H / ROWS + (rand() - 0.5) * 8 });
      }
    }
    return UI.shuffle(cells, rand);
  })();

  function label(txt) { return s('text', { x: 0, y: 0, text: txt, class: txt.length > 3 ? 'long' : null }); }

  function ion(cls, txt, cell) {
    var inner = s('g', { class: 'p ' + cls + ' off' }, [s('circle', { r: 13, cx: 0, cy: 0 }), label(txt)]);
    return { outer: s('g', { transform: 'translate(' + cell.x.toFixed(1) + ' ' + cell.y.toFixed(1) + ')' }, [inner]), el: inner };
  }

  function molecule(cls, txt, cell) {
    var inner = s('g', { class: 'p ' + cls + ' off' }, [s('rect', { x: -19, y: -12, width: 38, height: 24, rx: 8 }), label(txt)]);
    return { outer: s('g', { transform: 'translate(' + cell.x.toFixed(1) + ' ' + cell.y.toFixed(1) + ')' }, [inner]), el: inner };
  }

  /* the acid member and the base member: a whole molecule is a box, an ion is a circle */
  function member(pair, which, cell) {
    var P = Buf.PAIRS[pair];
    var isAcid = which === 'ha';
    var ionic = P.type === 'acid' ? !isAcid : isAcid;
    var cls = isAcid ? 'p-ha' : 'p-a', txt = isAcid ? P.ha : P.a;
    return ionic ? ion(cls, txt, cell) : molecule(cls, txt, cell);
  }

  /* create(pair, { small, tally, pick }) -> { node, set(ha, a, x), blank(), counts(), chips }
     small  a thumbnail: no tally
     tally  a row of counts under the box (default true unless small)
     pick   a function(speciesId): the tally becomes buttons ("click the particle that...") */
  function create(pair, opts) {
    opts = opts || {};
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'pbox-svg', role: 'img', 'aria-label': 'Particle diagram of the flask' });
    svg.appendChild(s('rect', { x: 1, y: 1, width: W - 2, height: H - 2, rx: 12, class: 'pframe' }));
    var el = { HA: [], A: [], H: [], Na: [], Cl: [], OH: [] };
    var layer = s('g');
    svg.appendChild(layer);
    function put(list, made) { layer.appendChild(made.outer); list.push(made.el); }
    var i;
    for (i = 0; i < Buf.FAM; i++) {
      put(el.HA, member(pair, 'ha', CELLS[FAM0 + i]));
      put(el.A, member(pair, 'a', CELLS[FAM0 + i]));
    }
    for (i = 0; i < 22; i++) put(el.Na, ion('p-na', 'Na⁺', CELLS[NA0 + i]));
    for (i = 0; i < 22; i++) put(el.Cl, ion('p-cl', 'Cl⁻', CELLS[CL0 + i]));
    for (i = 0; i < 12; i++) put(el.H, ion('p-h', 'H⁺', CELLS[H0 + i]));
    for (i = 0; i < 12; i++) put(el.OH, ion('p-oh', 'OH⁻', CELLS[OH0 + i]));

    var node = document.createElement('figure');
    node.className = 'pbox' + (opts.small ? ' small' : '');
    node.appendChild(svg);

    var P = Buf.PAIRS[pair], chips = {}, tally = null;
    if (!opts.small && opts.tally !== false) {
      tally = document.createElement('div');
      tally.className = 'ptally';
      [{ id: 'HA', label: P.ha }, { id: 'A', label: P.a }, { id: 'Na', label: 'Na⁺' }, { id: 'Cl', label: 'Cl⁻' },
       { id: 'H', label: 'H⁺' }, { id: 'OH', label: 'OH⁻' }].forEach(function (sp) {
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

    var last = null, prevForm = null;
    function toggle(g, on) { g.classList.toggle('off', !on); }
    function showFirst(list, n) { for (var k = 0; k < list.length; k++) toggle(list[k], k < n); }

    function set(ha, a, x) {
      var c = Buf.counts(pair, ha, a, x), T = ha + a;
      last = c;
      var form = [];
      for (var k = 0; k < Buf.FAM; k++) {
        var f = k >= T ? null : (k < c.A ? 'a' : 'ha');
        form.push(f);
        toggle(el.A[k], f === 'a');
        toggle(el.HA[k], f === 'ha');
        if (prevForm && f && prevForm[k] && prevForm[k] !== f) {
          var g = f === 'a' ? el.A[k] : el.HA[k];
          g.classList.remove('flash'); void g.getBoundingClientRect(); g.classList.add('flash');
        }
      }
      prevForm = form;
      showFirst(el.Na, c.Na); showFirst(el.Cl, c.Cl); showFirst(el.H, c.H); showFirst(el.OH, c.OH);
      svg.setAttribute('aria-label', 'Particle diagram of the flask: ' + Buf.flaskList(pair, ha, a, x));
      Object.keys(chips).forEach(function (id) {
        chips[id].num.textContent = c[id];
        chips[id].node.classList.toggle('zero', c[id] === 0);
      });
    }

    /* an empty flask, before the student has predicted what is in it */
    function blank() {
      last = null; prevForm = null;
      Object.keys(el).forEach(function (k) { el[k].forEach(function (g) { toggle(g, false); }); });
      svg.setAttribute('aria-label', 'Particle diagram of the flask: empty until you predict what is in it');
      Object.keys(chips).forEach(function (id) { chips[id].num.textContent = '?'; chips[id].node.classList.remove('zero'); });
    }

    return { node: node, set: set, blank: blank, counts: function () { return last; }, chips: chips };
  }

  /* the reaction of added acid or base, drawn with the same shapes:
       dir 'acid':  H+ + base member -> acid member
       dir 'base':  OH- + acid member -> base member + H2O */
  function reaction(pair, dir) {
    var P = Buf.PAIRS[pair];
    var svg = s('svg', { viewBox: '0 0 460 70', class: 'preact', role: 'img',
      'aria-label': dir === 'acid' ? Buf.reactAcid(pair) : Buf.reactBase(pair) });
    function at(x, made) { var g = made.el; g.classList.remove('off'); return s('g', { transform: 'translate(' + x + ' 35)' }, [g]); }
    function plain(cls, txt, x, w) {
      return s('g', { transform: 'translate(' + x + ' 35)', class: 'p ' + cls }, [s('rect', { x: -w / 2, y: -14, width: w, height: 28, rx: 9 }), s('text', { x: 0, y: 0, text: txt })]);
    }
    function sign(x, t) { return s('text', { x: x, y: 35, class: 'psign', text: t }); }
    var z = { x: 0, y: 0 };
    var parts;
    if (dir === 'acid') {
      parts = [at(40, ion('p-h', 'H⁺', z)), sign(78, '+'), at(124, member(pair, 'a', z)), s('text', { x: 190, y: 35, class: 'parrow', text: '→' }),
               at(252, member(pair, 'ha', z))];
    } else {
      parts = [at(40, ion('p-oh', 'OH⁻', z)), sign(78, '+'), at(124, member(pair, 'ha', z)), s('text', { x: 190, y: 35, class: 'parrow', text: '→' }),
               at(252, member(pair, 'a', z)), sign(296, '+'), plain('p-water', 'H₂O', 344, 50)];
    }
    parts.forEach(function (n) { svg.appendChild(n); });
    return svg;
  }

  return { create: create, reaction: reaction };
})();

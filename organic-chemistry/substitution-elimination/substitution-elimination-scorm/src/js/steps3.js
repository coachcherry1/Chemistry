/* steps3.js: Part 5.
 *
 *   table    Klein's decision table (Figure 7.18): which mechanisms each substrate
 *            and each kind of reagent give
 *   predict  Klein's three steps on five problems: the function of the
 *            reagent, the mechanism(s), then every product major, minor or
 *            not formed; the first problem ends with its arrows
 */

(function () {
  'use strict';

  var U = App.U, h = U.h, R = App.RENDER;
  function stage() { return U.stage(); }

  /* The results a cell of the table can hold, in the order of the chips. */
  var RESULTS = ['E2', 'SN2', 'SN1', 'SN2, some E2', 'E2, some SN2', 'SN1 and E1', 'No reaction'];

  function resultOf(list) {
    if (!list.length) return 'No reaction';
    if (list.length === 1) return list[0][0];
    /* which of SN1 and E1 is major depends on the alkene (Klein), so the table names both */
    if (/1$/.test(list[0][0])) return 'SN1 and E1';
    return list[0][0] + ', some ' + list[1][0];
  }

  /* Why a result does not belong in a cell. */
  function reason(deg, fn, got) {
    var sn2 = /SN2/.test(got), sn1 = /SN1/.test(got), e2 = /E2/.test(got);
    if (deg === 3 && sn2) return 'At a 3° carbon, steric hindrance blocks back-side attack: never SN2.';
    if (fn === 'weak' && deg < 3) return 'A weak nucleophile and weak base cannot do SN2 or E2, and a 1° or 2° carbocation is too unstable to form readily. Klein marks these ✗.';
    if (fn === 'weak') return 'A weak nucleophile and weak base waits for the carbocation: SN1 and E1 together.';
    if (fn === 'base' && (sn2 || sn1)) return 'A base only is a weak nucleophile, so it cannot substitute. It eliminates: E2.';
    if (fn === 'nuc' && e2) return 'A nucleophile only is a weak base, so it substitutes.' + (deg === 3 ? ' At a 3° carbon it cannot do SN2, so it waits for the carbocation: SN1.' : '');
    if (fn === 'nuc' && deg < 3 && sn1) return 'A strong nucleophile at a 1° or 2° carbon attacks the back side directly: SN2.';
    if (fn === 'nuc' && deg === 3) return 'A nucleophile only cannot do SN2 at a 3° carbon, and it is too weak a base for E2: it waits for the carbocation, SN1.';
    if (fn === 'both' && deg === 1) return 'At a 1° carbon there is little steric hindrance, so a strong nucleophile and strong base mostly substitutes: SN2, with some E2. (t-BuOK is the exception: sterically hindered, it mostly eliminates.)';
    if (fn === 'both' && deg === 2) return 'At a 2° carbon, steric hindrance at the back side favours acting as a base: E2 is major, SN2 minor.';
    if (fn === 'both' && deg === 3) return 'No SN2 at a 3° carbon, and a strong base does not wait for a carbocation: E2.';
    if (got === 'No reaction') return 'This reagent can react here. What can it do (its function), and what does the carbon allow?';
    return 'Not this one. What can the reagent do, and does the carbon allow back-side attack or a stable carbocation?';
  }

  /* ============================================================= table */

  R.table = function (s) {
    var pr = U.progress(s.id);
    pr.c = pr.c || '';
    var area = h('div');
    stage().appendChild(area);
    var picker = null;
    function filled() { var o = {}; pr.c.split(',').filter(Boolean).forEach(function (x) { o[x] = 1; }); return o; }
    function paint() {
      area.innerHTML = '';
      if (picker) { picker.destroy(); picker = null; }
      var got = filled();
      var tray = h('div', { class: 'tray' }, RESULTS.map(function (r, i) {
        return h('button', { type: 'button', class: 'tile', 'data-tile': String(i), text: r });
      }));
      var t = h('table', { class: 'dtable' });
      t.appendChild(h('tr', null, [h('th', { text: '' })].concat(React.FN_ORDER.map(function (fn) {
        return h('th', null, [React.FUNCTIONS[fn].short].concat(React.FUNCTIONS[fn].klein ? [h('br'), h('span', { class: 'bin-sub', text: React.FUNCTIONS[fn].klein })] : []));
      }))));
      [1, 2, 3].forEach(function (deg) {
        var row = h('tr', null, [h('th', { text: deg + '°' })]);
        React.FN_ORDER.forEach(function (fn) {
          var key = deg + fn;
          var ans = resultOf(React.TABLE[deg][fn]);
          var td = h('td', { class: 'cell drop' + (got[key] ? ' filled right' : ''), 'data-drop': key, tabindex: 0, role: 'button',
            'aria-label': deg + '° substrate, ' + React.FUNCTIONS[fn].short + (got[key] ? ': ' + ans : ': empty') }, [got[key] ? ans : '']);
          row.appendChild(td);
        });
        t.appendChild(row);
      });
      var n = Object.keys(got).length;
      area.appendChild(U.panel('Step 2: the substrate', n + ' of 12 cells filled', [t, tray,
        h('p', { class: 'muted', text: 't-BuOK is a strong nucleophile and a strong base, but sterically hindered: unlike the others, at a 1° carbon it gives mostly E2.' })]));
      picker = new Picker({
        tray: tray, stage: t, sticky: true,
        label: function (i) { return RESULTS[+i]; },
        prompt: function (i) { return 'Now choose every cell where “' + RESULTS[+i] + '” belongs.'; },
        say: function (x) { U.say(x, ''); },
        drop: function (key, i) {
          var deg = +key.charAt(0), fn = key.slice(1);
          var ans = resultOf(React.TABLE[deg][fn]);
          if (RESULTS[+i] === ans) {
            var g = filled(); g[key] = 1; pr.c = Object.keys(g).join(','); U.persist();
            U.say(deg + '°, ' + React.FUNCTIONS[fn].short.toLowerCase() + ': ' + ans + '.', 'good');
            if (Object.keys(g).length === 12) U.complete('Klein’s table is complete. It is in the reference drawer below.');
            paint();
            picker && picker.clear();
          } else U.say(reason(deg, fn, RESULTS[+i]), 'bad');
        }
      });
    }
    paint();
    return { destroy: function () { if (picker) picker.destroy(); } };
  };

  /* =========================================================== predict */

  /* The cards of step 3: every product the model gives, then the usual
     wrong guesses, with why they do not form. */
  function cardsFor(id, key) {
    var m = mol(id);
    var r = React.predict(m, key);
    var cards = [];
    var seen = {};
    r.products.forEach(function (p) {
      if (seen[p.name]) return;
      seen[p.name] = 1;
      cards.push({ mol: p.mol, name: p.name, role: p.role, mech: p.mech, regio: p.regio, how: p.how });
    });
    function add(mm, why) {
      var n = Name.name(mm);
      if (seen[n]) return;
      seen[n] = 1;
      cards.push({ mol: mm, name: n, role: 'none', why: why });
    }
    var hasSub = r.products.some(function (p) { return p.mech === 'SN2' || p.mech === 'SN1'; });
    var hasEl = r.products.some(function (p) { return p.mech === 'E2' || p.mech === 'E1'; });
    var sn2 = r.products.filter(function (p) { return p.mech === 'SN2'; })[0];
    if (sn2 && sn2.mol.atoms.some(function (a, i) { return a.parity && Mol.rs(sn2.mol, i); })) {
      add(React.substitute(m, key, 'ret'), 'SN2 is back-side attack, so the configuration inverts. The product with the same arrangement as the substrate does not form.');
    }
    if (!hasSub && React.REAGENTS[key].species) add(React.substitute(m, key, 'inv'), r.deg === 3 ? 'Steric hindrance: a 3° carbon cannot be attacked from the back side, and a strong base does not wait for a carbocation: no substitution.' : 'This reagent is a weak nucleophile: no substitution.');
    if (!hasEl) {
      var z = React.e2Products(m, 'NaOEt').filter(function (p) { return p.role === 'major'; })[0];
      if (z) add(z.mol, 'This reagent is a weak base, so there is no elimination.');
    }
    if (hasEl && !r.products.some(function (p) { return p.mech === 'E2' && p.how === 'selective-minor'; })) {
      /* an alkene the β H atoms cannot give: the C=C one carbon too far */
      var L = React.lg(m);
      var far = null;
      React.betas(m, L.a).forEach(function (b) {
        m.carbonsOn(b.b).forEach(function (g) {
          if (far || g.j === L.a || !m.hCount(g.j)) return;
          var alt = m.clone();
          var kk = alt.bondBetween(b.b, g.j);
          alt.bonds[kk].order = 2; alt.atoms[b.b].h--; alt.atoms[g.j].h--;
          alt.atoms[L.x].el = 'H';
          var x2 = alt.without([L.x]);
          x2.atoms[x2.map[L.a]].h++;
          x2.atoms.forEach(function (a) { a.parity = null; });
          if (!Mol.isStereoAlkene(x2, x2.bondBetween(x2.map[b.b], x2.map[g.j]))) far = x2;
        });
      });
      if (far) add(far, 'The C=C always forms between the α carbon (the one that had the leaving group) and a β carbon. This alkene does not include the α carbon.');
    }
    return U.shuffle(cards, U.rng(U.seed() ^ U.hash(id + key)));
  }

  function roleWhy(c, key) {
    if (c.role === 'none') return c.why;
    if (c.mech === 'SN2' && c.role === 'major') return c.name + ' is the SN2 product, with inversion of configuration: the major product here.';
    if (c.mech === 'SN2') return c.name + ' is the SN2 product. Here SN2 is the minor pathway.';
    if (c.mech === 'SN1' && c.role === 'major') return c.name + ' is the SN1 product: ethanol attacks the flat carbocation. No alkene here is tri- or tetrasubstituted, so substitution is major.';
    if (c.mech === 'SN1') return c.name + ' is the SN1 product. It forms, but as a minor product: the E1 alkene here is trisubstituted or tetrasubstituted, so elimination is favoured.';
    if (c.mech === 'E1' && c.role === 'major') return c.name + ' is the E1 Zaitsev product, a tri- or tetrasubstituted alkene: with an alkene that stable, E1 is favoured over SN1.';
    if (c.mech === 'E1') return c.name + ' comes from E1 too, but as a minor product' + (c.regio === 'Hofmann' ? ': E1 always favours the Zaitsev product.' : '.');
    if (c.role === 'major') return c.name + ' is the ' + (c.regio ? c.regio + ' product' : 'E2 product') + (c.how === 'selective-major' ? ' with the larger groups trans' : '') +
      (React.REAGENTS[key].hindered ? ': the hindered base takes the most accessible H.' : ': the major product.');
    if (c.how === 'selective-minor') return c.name + ' forms too, but less: its larger groups are cis (stereoselective).';
    return c.name + ' is the ' + (c.regio || 'E2') + ' product: it forms, but as a minor product.';
  }

  R.predict = function (s) {
    var pr = U.progress(s.id);
    pr.s = pr.s || s.problems.map(function () { return 0; });
    pr.r = pr.r || s.problems.map(function () { return ''; });
    var area = h('div');
    stage().appendChild(area);
    var k = pr.k || 0;
    var playNext = false;
    function allDone() { return pr.s.every(function (x) { return x >= 4; }); }
    function paint() {
      area.innerHTML = '';
      var id = s.problems[k][0], key = s.problems[k][1];
      var m = mol(id), r = React.predict(m, key), rg = React.REAGENTS[key];
      var st = pr.s[k];
      var chips = U.chipRow('Problem', s.problems.map(function (p, i) { return String(i + 1); }), k, function (i) { return pr.s[i] >= 4; },
        function (i) { return i === 0 || pr.s[i - 1] >= 4; }, function (i) { k = i; pr.k = k; U.persist(); paint(); });
      var list = h('div', { class: 'step-list' });
      area.appendChild(U.panel('Predict the products', null, [chips, U.rxn(m, rg.text, []), list]));
      function sub(n, title, body) {
        list.appendChild(h('div', { class: 'substep' + (st === n ? ' open' : st > n ? ' done' : '') }, [h('h4', { text: title })].concat(st >= n ? body : [])));
      }
      /* 1 */
      var fns = React.FN_ORDER;
      sub(0, 'Step 1: the function of ' + rg.text, [U.choiceRow(fns.map(function (f) { return React.FUNCTIONS[f].short; }), fns.indexOf(rg.fn),
        st > 0 ? fns.indexOf(rg.fn) : null, function (i) {
          if (fns[i] === rg.fn) { pr.s[k] = Math.max(pr.s[k], 1); U.persist(); U.say(rg.why, 'good'); paint(); }
          else U.say('Not quite. ' + rg.why, 'bad');
        })]);
      /* 2 */
      var ans = resultOf(r.mechs);
      sub(1, 'Step 2: the substrate is ' + React.DEGREE_WORD[r.deg] + '. Which mechanisms?', [U.choiceRow(RESULTS, RESULTS.indexOf(ans), st > 1 ? RESULTS.indexOf(ans) : null, function (i) {
        if (RESULTS[i] === ans) { pr.s[k] = Math.max(pr.s[k], 2); U.persist(); U.say(React.DEGREE_WORD[r.deg].replace(/ \(.*\)/, '') + ' substrate, ' + React.FUNCTIONS[rg.fn].short.toLowerCase() + ': ' + ans + '.', 'good'); paint(); }
        else U.say(reason(r.deg, rg.fn, RESULTS[i]) + (rg.hindered && r.deg === 1 ? '' : ''), 'bad');
      })]);
      /* 3 */
      var cards = cardsFor(id, key);
      var choice = (pr.r[k] || '').split('');
      var row = h('div', { class: 'prod-cards' });
      var ROLES = ['major', 'minor', 'none'];
      cards.forEach(function (c, ci) {
        var v = choice[ci] != null && choice[ci] !== '-' ? +choice[ci] : null;
        var card = h('div', { class: 'prod-card' + (st > 2 ? ' right' : '') }, [Draw.mol(c.mol, { label: 'Bond-line formula of ' + c.name }),
          h('span', { class: 'name', text: c.name }),
          h('div', { class: 'seg' }, ['Major', 'Minor', 'Not formed'].map(function (t, ti) {
            return h('button', { type: 'button', class: 'mini', 'aria-pressed': v === ti ? 'true' : 'false', text: t, disabled: st > 2, onclick: function () {
              while (choice.length < cards.length) choice.push('-');
              choice[ci] = String(ti); pr.r[k] = choice.join(''); U.persist(); paint();
            } });
          }))]);
        row.appendChild(card);
      });
      var chk = h('button', { type: 'button', class: 'primary', text: 'Check the products', onclick: function () {
        for (var ci = 0; ci < cards.length; ci++) {
          var v = choice[ci] != null && choice[ci] !== '-' ? +choice[ci] : null;
          if (v == null) { U.say('Mark every product: major, minor or not formed.', 'bad'); return; }
          if (ROLES[v] !== cards[ci].role) { U.say(roleWhy(cards[ci], key), 'bad'); return; }
        }
        pr.s[k] = Math.max(pr.s[k], k === 0 ? 3 : 4); U.persist();
        U.say(k === 0 ? 'All right. Last part: draw the mechanism of the major product.' : 'All right. Watch the major product form.', 'good');
        if (allDone()) U.complete('All five problems done.');
        playNext = k > 0; paint(); playNext = false;
      } });
      sub(2, 'Step 3: the products. Mark each one major, minor, or not formed.', [row, st === 2 ? h('div', { class: 'btnrow' }, [chk]) : null]);
      /* 4: arrows for the first problem's major product */
      if (k === 0) {
        var maj = r.products.filter(function (p) { return p.role === 'major'; })[0];
        var L = React.lg(m);
        var beta = null;
        React.betas(m, L.a).forEach(function (b) {
          if (beta != null) return;
          var made = React.e2From(m, L.a, b.b, L.x).map(function (p) { return Name.name(p.mol); });
          if (made.indexOf(maj.name) >= 0) beta = b.b;
        });
        var body = [];
        if (st >= 3) {
          pr.a = pr.a || {};
          var ab = U.arrowBox(Mech.e2(m, key, beta), pr.a, 'x', function (fresh) {
            if (pr.s[0] < 4) { pr.s[0] = 4; U.persist(); }
            if (allDone()) U.complete('All five problems done.');
            /* the next problem opens; this one plays */
            if (fresh) setTimeout(function () { playNext = true; paint(); playNext = false; }, 0);
          }, { autoplay: playNext });
          body.push(ab.node);
        }
        sub(3, 'The mechanism of the major product, ' + maj.name, body);
      } else if (st >= 4) {
        /* the other problems: watch the major product form */
        var mj = r.products.filter(function (p) { return p.role === 'major'; })[0];
        var cb = U.chainBox(U.scenesFor(m, key, mj));
        sub(3, 'Watch it happen: ' + mj.mech + ', the major product, ' + mj.name, [cb.node]);
        if (playNext) setTimeout(cb.play, 450);
      }
    }
    paint();
  };

  /* Every mechanism the activity plays, with the product its last step
     must make (tools/validate.js and tools/walkthrough.js check them). */
  App.playedScenes = function () {
    var out = [];
    function major(m, key) { return React.predict(m, key).products.filter(function (p) { return p.role === 'major'; })[0]; }
    function add(label, scenes, want) { out.push({ label: label, scenes: scenes, want: want }); }
    var bbR = mol('bbR'), tb = mol('tBuBr');
    add('sn2arrows', [Mech.sn2(bbR, 'NaSH')], Name.name(React.substitute(bbR, 'NaSH', 'inv')));
    add('e2arrows', [Mech.e2(tb, 'NaOEt')], major(tb, 'NaOEt').name);
    var cat = React.cation(tb), ox = React.oxonium(cat, cat.plus, 'EtOH');
    add('sn1arrows', [Mech.loss(tb), Mech.attack(cat, cat.plus, 'EtOH'), Mech.protonOff(ox.mol, ox.o, ox.h, 'EtOH')], major(tb, 'EtOH').name);
    ['b3mb', 'b22dmb'].forEach(function (id) {
      var cp = React.cationPath(mol(id));
      add('shift ' + id, [Mech.shift(cp.first, cp.c, cp.shift)], null);
    });
    var bmb = mol('bmb'), c2 = React.cation(bmb);
    var zb = c2.carbonsOn(c2.plus).filter(function (x) { return c2.hCount(x.j) === 2; })[0].j;
    var e1 = React.e1Products(bmb).filter(function (p) { return p.role === 'major'; })[0];
    add('e1', [Mech.loss(bmb), Mech.e1(c2, c2.plus, zb, 'EtOH')], Name.name(e1.mol));
    App.STEPS.filter(function (st) { return st.kind === 'regio'; })[0].mols.forEach(function (id) {
      App.regioPlays(mol(id)).forEach(function (x) {
        if (x.sc.title !== 'E2') out.push({ label: 'regio ' + id + ' ' + x.key + ' is not an E2', scenes: [x.sc], want: '(an E2)' });
        add('regio ' + id + ' ' + x.key, [x.sc], x.want);
      });
    });
    App.STEPS.filter(function (st) { return st.kind === 'predict'; })[0].problems.forEach(function (pb, i) {
      var mm = mol(pb[0]), mj = major(mm, pb[1]);
      add('predict ' + (i + 1), U.scenesFor(mm, pb[1], mj), mj.name);
    });
    return out;
  };

  App.RESULTS = RESULTS;
  App.resultOf = resultOf;
  App.cardsFor = cardsFor;
})();

/* mech.js: the mechanisms students draw with curved arrows.
 *
 * Each scene is the species of one step, drawn by draw.js, and the arrows
 * the step needs, in Klein's four patterns: nucleophilic attack, loss of a
 * leaving group, proton transfer, carbocation rearrangement. The species and
 * every atom the arrows use come from react.js, so the scene is always the
 * reaction the step is about.
 *
 * Keys: 'lp:s:i' a lone pair on atom i of species s (any of its pairs),
 * 'bond:s:i-j' a bond (i < j), 'atom:s:i' an atom. An arrow is { from, to }
 * with lists of the keys that count.
 *
 * Wrong arrows get Klein's reasons: an arrow starts on electrons (a lone
 * pair or a bond), never on an atom; the electrons of the C–X bond go to X;
 * the nucleophile attacks the α carbon; the base takes an H from a β carbon.
 */

var Mech = (function () {
  'use strict';

  function bk(s, i, j) { return 'bond:' + s + ':' + Math.min(i, j) + '-' + Math.max(i, j); }
  function lk(s, i) { return 'lp:' + s + ':' + i; }
  function ak(s, i) { return 'atom:' + s + ':' + i; }

  var PATTERN = {
    nuc: 'Nucleophilic attack',
    lg: 'Loss of a leaving group',
    pt: 'Proton transfer',
    shift: 'Carbocation rearrangement'
  };

  /* The species a reagent key stands for, with its attacking atom. */
  function reagent(key) {
    var sp = Mol.parse(React.REAGENTS[key].species);
    var nu = React.nucAtom(sp);
    /* the H on the attacking atom is drawn, so its bond can carry an arrow */
    var h = sp.atoms[nu].h ? sp.explicitH(nu) : null;
    return { mol: sp, nu: nu, h: h };
  }

  /* ------------------------------------------------------------ scenes */

  /* SN2: the nucleophile on the back side, the leaving group on the right. */
  function sn2(sub, key) {
    var m = sub.clone(), L = React.lg(m);
    var r = reagent(key);
    return {
      title: 'SN2',
      species: [
        { mol: r.mol, opts: { lp: [r.nu], mech: true, orient: r.h != null ? [r.nu, r.h, 180] : null }, anchor: { sp: 1, atom: L.a, dx: -2.6, dy: 0, me: r.nu } },
        { mol: m, opts: { lp: [L.x], orient: [L.a, L.x, 0], mech: true } }
      ],
      arrows: [
        { from: [lk(0, r.nu)], to: [ak(1, L.a)], pattern: PATTERN.nuc },
        { from: [bk(1, L.a, L.x)], to: [ak(1, L.x)], pattern: PATTERN.lg }
      ],
      wrong: function (f, t) {
        if (f === lk(0, r.nu) && t === ak(1, L.x)) return 'The nucleophile attacks the α carbon, the one carrying the leaving group, not the leaving group itself.';
        if (f === lk(0, r.nu) && /^atom:1:/.test(t)) return 'The nucleophile attacks the α carbon: the carbon bonded to the leaving group.';
        if (f === bk(1, L.a, L.x) && t === ak(1, L.a)) return 'The electrons of the C–' + m.atoms[L.x].el + ' bond go to ' + m.atoms[L.x].el + ', the more electronegative atom. That is loss of a leaving group.';
        if (f === lk(1, L.x)) return 'The ' + m.atoms[L.x].el + ' lone pairs stay where they are. The bond to the leaving group is what breaks.';
        return null;
      },
      missing: { 'Nucleophilic attack': 'SN2 is concerted: the nucleophile attacks as the leaving group leaves. Add the arrow for nucleophilic attack.',
                 'Loss of a leaving group': 'SN2 is concerted: the leaving group leaves as the nucleophile attacks. Add the arrow for loss of the leaving group.' }
    };
  }

  /* SN1 or E1, step 1: loss of the leaving group. */
  function loss(sub) {
    var m = sub.clone(), L = React.lg(m);
    return {
      title: 'Loss of a leaving group',
      species: [{ mol: m, opts: { lp: [L.x], orient: [L.a, L.x, 0], mech: true } }],
      arrows: [{ from: [bk(0, L.a, L.x)], to: [ak(0, L.x)], pattern: PATTERN.lg }],
      wrong: function (f, t) {
        if (f === bk(0, L.a, L.x) && t === ak(0, L.a)) return 'The electrons of the C–' + m.atoms[L.x].el + ' bond go to ' + m.atoms[L.x].el + ', the more electronegative atom, which leaves as ' + m.atoms[L.x].el + '⁻.';
        return null;
      },
      missing: {}
    };
  }

  /* SN1, step 2: the solvent attacks the carbocation. */
  function attack(cat, c, key) {
    var r = reagent(key);
    return {
      title: 'Nucleophilic attack',
      species: [
        { mol: cat, opts: { mech: true } },
        { mol: r.mol, opts: { lp: [r.nu], mech: true }, anchor: { sp: 0, atom: c, dx: 2.4, dy: 0, me: r.nu } }
      ],
      arrows: [{ from: [lk(1, r.nu)], to: [ak(0, c)], pattern: PATTERN.nuc }],
      wrong: function (f, t) {
        if (f === lk(1, r.nu) && /^atom:0:/.test(t)) return 'Ethanol attacks the carbon with the positive charge, the carbocation.';
        if (/^bond:1:/.test(f)) return 'The O–H bond stays. A lone pair on the O attacks the carbocation.';
        return null;
      },
      missing: {}
    };
  }

  /* SN1, step 3: a second solvent molecule takes the proton. */
  function protonOff(ox, o, h, key) {
    var r = reagent(key);
    return {
      title: 'Proton transfer',
      species: [
        { mol: ox, opts: { lp: [o], mech: true } },
        { mol: r.mol, opts: { lp: [r.nu], mech: true }, anchor: { sp: 0, atom: h, dx: 1.9, dy: 0.9, me: r.nu } }
      ],
      arrows: [
        { from: [lk(1, r.nu)], to: [ak(0, h)], pattern: PATTERN.pt },
        { from: [bk(0, o, h)], to: [ak(0, o)], pattern: PATTERN.pt }
      ],
      wrong: function (f, t) {
        if (f === bk(0, o, h) && t === ak(0, h)) return 'The electrons of the O–H bond stay on the O, which loses its positive charge.';
        if (f === lk(1, r.nu) && t !== ak(0, h)) return 'The second ethanol is acting as a base: its lone pair takes the H on the O⁺.';
        return null;
      },
      missing: { 'Proton transfer': 'A proton transfer takes two arrows: the base takes the H, and the O–H bond’s electrons stay on the O.' }
    };
  }

  /* A 1,2-shift: the C–H or C–CH₃ bond moves to the carbocation. */
  function shift(cat, c, s) {
    var m = cat.clone();
    var hIdx = null;
    var from;
    if (s.kind === 'H') { hIdx = m.explicitH(s.from); from = [bk(0, s.from, hIdx)]; }
    else {
      from = m.carbonsOn(s.from).filter(function (x) {
        return x.j !== c && m.atoms[x.j].h === 3;
      }).map(function (x) { return bk(0, s.from, x.j); });
    }
    return {
      title: 'Carbocation rearrangement',
      species: [{ mol: m, opts: { mech: true, up: c } }],
      arrows: [{ from: from, to: [ak(0, c)], pattern: PATTERN.shift }],
      h: hIdx,
      wrong: function (f, t) {
        if (from.indexOf(f) >= 0 && t !== ak(0, c)) return 'The group moves, with its pair of electrons, to the neighbouring carbon that has the positive charge.';
        if (/^bond:/.test(f) && t === ak(0, c)) return s.kind === 'H' ? 'Only an H on the carbon next to the carbocation can shift (a 1,2-hydride shift). It moves with the electrons of its C–H bond.'
          : 'Only a group on the carbon next to the carbocation can shift. Here a CH₃ moves, with the electrons of its C–C bond (a methyl shift).';
        return null;
      },
      missing: {}
    };
  }

  /* E2: the base takes a β H as the leaving group leaves. */
  function e2(sub, key, beta) {
    var m = sub.clone(), L = React.lg(m);
    var b = beta != null ? beta : React.betas(m, L.a).filter(function (x) { return x.h; })[0].b;
    var hIdx = m.explicitH(b);
    var r = reagent(key);
    return {
      title: 'E2',
      species: [
        { mol: m, opts: { lp: [L.x], orient: [L.a, L.x, 0], mech: true, prefer: [b, hIdx] } },
        { mol: r.mol, opts: { lp: [r.nu], mech: true }, anchor: { sp: 0, atom: hIdx, out: b, dist: 2.1, me: r.nu } }
      ],
      arrows: [
        { from: [lk(1, r.nu)], to: [ak(0, hIdx)], pattern: PATTERN.pt },
        { from: [bk(0, b, hIdx)], to: [bk(0, L.a, b)], pattern: PATTERN.pt },
        { from: [bk(0, L.a, L.x)], to: [ak(0, L.x)], pattern: PATTERN.lg }
      ],
      h: hIdx, beta: b,
      wrong: function (f, t) {
        if (f === lk(1, r.nu) && t === ak(0, L.a)) return 'Attacking the α carbon would be substitution. In E2 the base takes a proton from the β carbon.';
        if (f === lk(1, r.nu) && t === ak(0, b)) return 'The base does not attack the carbon. It takes the H on the β carbon: a proton transfer.';
        if (f === bk(0, b, hIdx) && t === ak(0, hIdx)) return 'The C–H bond’s electrons do not go to the H (it leaves as H⁺ with the base). They move over to form the C=C π bond between the α and β carbons.';
        if (f === bk(0, b, hIdx) && (t === ak(0, L.a) || t === ak(0, b))) return 'Point this arrow at the bond between the α and β carbons: its electrons become the new π bond there.';
        if (f === bk(0, L.a, L.x) && t === ak(0, L.a)) return 'The electrons of the C–' + m.atoms[L.x].el + ' bond go to ' + m.atoms[L.x].el + ': loss of a leaving group.';
        return null;
      },
      missing: { 'Proton transfer': 'E2 is concerted: proton transfer and loss of the leaving group happen in one step. The proton transfer takes two arrows: base to H, and C–H bond to the C–C bond.',
                 'Loss of a leaving group': 'E2 is concerted: the leaving group leaves as the base takes the proton. Add the arrow for loss of the leaving group.' }
    };
  }

  /* E1, step 2: the solvent takes a β H from the carbocation. */
  function e1(cat, c, b, key) {
    var m = cat.clone();
    var hIdx = m.explicitH(b);
    var r = reagent(key);
    return {
      title: 'Proton transfer',
      species: [
        { mol: m, opts: { mech: true, prefer: [b, hIdx], up: c } },
        { mol: r.mol, opts: { lp: [r.nu], mech: true }, anchor: { sp: 0, atom: hIdx, out: b, dist: 2.1, me: r.nu } }
      ],
      arrows: [
        { from: [lk(1, r.nu)], to: [ak(0, hIdx)], pattern: PATTERN.pt },
        { from: [bk(0, b, hIdx)], to: [bk(0, c, b)], pattern: PATTERN.pt }
      ],
      h: hIdx,
      wrong: function (f, t) {
        if (f === lk(1, r.nu) && t === ak(0, c)) return 'Attacking the carbocation is the SN1 step. In E1, ethanol acts as a base and takes a β H.';
        if (f === bk(0, b, hIdx) && t === ak(0, c)) return 'Point this arrow at the bond between the two carbons: its electrons become the new π bond.';
        if (f === bk(0, b, hIdx) && t === ak(0, hIdx)) return 'The C–H electrons move over to form the C=C π bond; the H leaves with the base.';
        return null;
      },
      missing: { 'Proton transfer': 'This proton transfer takes two arrows: ethanol takes the H, and the C–H bond’s electrons form the π bond.' }
    };
  }

  /* --------------------------------------------------------- judging */

  function same(list, key) { return list.indexOf(key) >= 0; }

  /* drawn: [{ from, to }]. Returns { ok, msg, matched: [index of the
     required arrow each drawn arrow is, or -1] }. */
  function judge(scene, drawn) {
    var used = scene.arrows.map(function () { return false; });
    var matched = drawn.map(function (d) {
      for (var k = 0; k < scene.arrows.length; k++) {
        var a = scene.arrows[k];
        if (!used[k] && same(a.from, d.from) && same(a.to, d.to)) { used[k] = true; return k; }
      }
      return -1;
    });
    for (var i = 0; i < drawn.length; i++) {
      if (matched[i] >= 0) continue;
      var d = drawn[i];
      return { ok: false, matched: matched, bad: i, msg: wrongText(scene, d) };
    }
    var miss = scene.arrows.filter(function (a, k) { return !used[k]; });
    if (miss.length) {
      var m = scene.missing[miss[0].pattern];
      return { ok: false, matched: matched, msg: m || ('Not finished: ' + scene.arrows.length + ' arrows are needed here, and ' +
        (drawn.length === 0 ? 'none are drawn yet.' : 'you have ' + drawn.length + ' right so far. What is still missing: ' + miss[0].pattern.toLowerCase() + '.')) };
    }
    return { ok: true, matched: matched, msg: 'Right: ' + scene.arrows.map(function (a) { return a.pattern.toLowerCase(); })
      .filter(function (t, k, all) { return all.indexOf(t) === k; }).join(' and ') + '.' };
  }

  function wrongText(scene, d) {
    if (/^atom:/.test(d.from)) return 'An arrow starts where the electrons are: on a lone pair or on a bond, never on an atom.';
    if (d.from === d.to) return 'An arrow has to go somewhere: from the electrons to where they end up.';
    var t = scene.wrong(d.from, d.to);
    if (t) return t;
    /* the right electrons with the wrong head, or a tail no arrow uses */
    var tailOk = scene.arrows.some(function (a) { return same(a.from, d.from); });
    if (tailOk) return 'Those electrons are part of this step, but they go somewhere else. Where do they end up?';
    return 'That arrow is not part of this step. Which electrons move? Start on a lone pair or a bond that breaks.';
  }

  return { sn2: sn2, loss: loss, attack: attack, protonOff: protonOff, shift: shift, e2: e2, e1: e1, judge: judge,
           PATTERN: PATTERN, keys: { bk: bk, lk: lk, ak: ak }, reagent: reagent };
})();

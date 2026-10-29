/* judge.js: is a student's set of curved arrows the step's?
 *
 * The arrows are read by chem.js. First Klein's rules (6.10): a tail on a
 * lone pair or a bond, never an atom or a positive charge; a head that makes
 * a bond or a lone pair; no fifth bond to C, N or O; an H with exactly one
 * bond. Then each arrow is compared with the step's own arrows by what it
 * does with its pair of electrons, so a head on the C=O bond and a head on
 * its O count the same when they mean the same move. Order never matters.
 *
 * When the arrows obey the rules but are not the step's, the result carries
 * the product they would make, so the student can see it.
 */

var Judge = (function () {
  'use strict';

  var EL = { H: 'H', C: 'C', N: 'N', O: 'O', F: 'F', S: 'S', Cl: 'Cl', Br: 'Br', I: 'I', Li: 'Li' };

  function name(sc, st, id) {
    if (sc.who && sc.who[id]) return sc.who[id];
    var a = Chem.atom(st, id);
    if (!a) return id;
    if (a.el === 'C') return Chem.charge(st, id) > 0 ? 'the carbocation' : 'that carbon';
    return a.el === 'H' ? 'that H' : 'the ' + EL[a.el];
  }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  function moveKey(m) {
    var s = m.src.lp != null ? 'lp:' + m.src.lp : 'b:' + Chem.keys.pair(m.src.bond[0], m.src.bond[1]);
    var d = m.dst.lp != null ? 'lp:' + m.dst.lp : 'b:' + Chem.keys.pair(m.dst.bond[0], m.dst.bond[1]);
    return s + '>' + d;
  }

  /* In words: what one arrow does. */
  function describe(sc, st, m) {
    var n = function (id) { return name(sc, st, id); };
    if (m.src.lp != null) {
      var a = m.src.lp, d = m.dst.bond[0] === a ? m.dst.bond[1] : m.dst.bond[0];
      return Chem.order(st, a, d) ? 'a lone pair on ' + n(a) + ' becomes a pi bond to ' + n(d)
                                  : 'a lone pair on ' + n(a) + ' makes a new bond to ' + n(d);
    }
    var b0 = m.src.bond[0], b1 = m.src.bond[1];
    var pi = Chem.order(st, b0, b1) > 1;
    var e = [Chem.atom(st, b0).el, Chem.atom(st, b1).el];
    if (e[1] === 'C' || (e[1] === 'H' && e[0] !== 'C')) e.reverse();
    var what = 'the ' + e.join(pi ? '=' : '–') + (pi ? ' pi bond' : ' bond');
    if (m.dst.lp != null) return what + ' breaks, and its pair becomes a lone pair on ' + n(m.dst.lp);
    var x = m.dst.bond[0], y = m.dst.bond[1];
    return what + ' gives its pair to a new ' + (Chem.order(st, x, y) ? 'pi ' : '') + 'bond between ' + n(x) + ' and ' + n(y);
  }

  var RULE = {
    tailAtom: 'An arrow starts where the electrons are: on a lone pair or on a bond, never on an atom.',
    tailPlus: 'Never start an arrow on a positive charge: it has no electrons to give. The tail goes on a lone pair or a bond.',
    nowhere: 'An arrow has to go somewhere: from the electrons to where they end up.',
    reach: 'The head of an arrow shows a new bond or a new lone pair. Those electrons cannot make that bond: point the head at an atom, or at a bond next to the electrons.',
    headLp: 'The head goes on an atom (a new bond or lone pair) or on a bond (a new pi bond), not on a lone pair.',
    noBond: 'That bond is already used by another arrow. Each arrow moves its own pair of electrons.',
    quad: 'No bond can be more than triple.'
  };

  function ruleText(sc, st, r) {
    var who = r.atom != null ? name(sc, st, r.atom) : '';
    var a = r.atom != null ? Chem.atom(st, r.atom) : null;
    switch (r.err) {
      case 'octet':
        return cap(who) + (a && a.lp === 0 && a.el === 'C' ? ' would end up with a fifth bond.' : ' would end up with more than four orbitals: its bonds and lone pairs would add up to five.') +
          ' Never give C, N or O more than four. If one of its bonds breaks at the same time, draw that arrow too; if not, the head goes somewhere else.';
      case 'h2':
        return cap(who) + ' would have two bonds, and an H only ever has one. Draw the second arrow: the pair of the bond ' +
          'the H leaves behind goes onto the atom it leaves.';
      case 'bareH':
        return cap(who) + ' would be left with no bond at all. An H never floats off on its own: something has to take it, so draw the arrow that makes its new bond.';
      case 'noLp':
        return cap(who) + ' has no lone pair to give.';
      default:
        return RULE[r.err] || 'Those arrows do not work. Start each one on a lone pair or a bond.';
    }
  }

  /* drawn: [{ from, to }]. Returns { ok, msg, bad (index of an arrow to mark),
     state (what valid but different arrows make), patterns } */
  function judge(sc, drawn) {
    var st = sc.before;
    if (!drawn.length) return { ok: false, msg: 'Draw the curved arrows first: from the electrons that move to where they go.' };
    for (var i = 0; i < drawn.length; i++) {
      var r = Chem.readings(st, drawn[i]);
      if (r.err) return { ok: false, bad: i, msg: ruleText(sc, st, { err: r.err, atom: r.atom }) };
    }
    var res = Chem.apply(st, drawn);
    var keyMoves = sc.picks.map(moveKey);
    /* match each drawn arrow to one of the step's by what it does */
    var used = keyMoves.map(function () { return false; });
    var matched = drawn.map(function (d) {
      var ms = Chem.readings(st, d).map(moveKey);
      for (var k = 0; k < keyMoves.length; k++) if (!used[k] && ms.indexOf(keyMoves[k]) >= 0) { used[k] = true; return k; }
      return -1;
    });
    var allMatched = matched.every(function (k) { return k >= 0; });
    if (allMatched && drawn.length === keyMoves.length) {
      return { ok: true, matched: matched, patterns: sc.patterns, msg: rightText(sc) };
    }
    if (res.err) return { ok: false, bad: res.arrow, msg: ruleText(sc, st, res) };
    var bad = matched.indexOf(-1);
    if (bad >= 0) {
      var d = drawn[bad];
      var F = Chem.keys.parse(d.from), T = Chem.keys.parse(d.to);
      var tailAtoms = F.kind === 'bond' ? [F.a, F.b] : [F.a];
      var reversed = sc.picks.some(function (m) {
        var kt = m.src.lp != null ? [m.src.lp] : m.src.bond;
        var kh = m.dst.lp != null ? [m.dst.lp] : m.dst.bond;
        return T.kind === 'atom' && kt.indexOf(T.a) >= 0 && tailAtoms.some(function (x) { return kh.indexOf(x) >= 0 && kt.indexOf(x) < 0; });
      });
      var sameTail = sc.picks.some(function (m) {
        var s = m.src.lp != null ? 'lp:' + m.src.lp : Chem.keys.bond(m.src.bond[0], m.src.bond[1]);
        return s === d.from;
      });
      var msg = reversed ? 'That arrow points the wrong way. Arrows show where electrons go: the tail on the electrons (the nucleophile, or the bond that breaks), the head where they end up.'
        : sameTail ? 'Those electrons do move in this step, but they go somewhere else. Where do they end up?'
        : 'That arrow is not part of this step. Which electrons move? Start on a lone pair or on a bond that breaks.';
      if (sc.hint && !reversed) msg += ' ' + sc.hint;
      return { ok: false, bad: bad, msg: msg, state: res.state, matched: matched };
    }
    /* every arrow drawn is right, but some are missing */
    var missing = sc.picks.filter(function (m, k) { return !used[k]; });
    return { ok: false, matched: matched, state: res.state,
      msg: 'Not finished: this step takes ' + sc.picks.length + ' arrows and you have ' + drawn.length + ' of them. Still missing: ' +
        describe(sc, st, missing[0]) + '.' };
  }

  function rightText(sc) {
    var names = sc.patterns.map(function (k) { return Chem.PATTERN[k].toLowerCase(); });
    if (names.length > 1) return 'Right: ' + names.join(' and ') + ' at the same time, in one step. That is a concerted step.';
    return 'Right: ' + (names[0] || 'those are the arrows') + '.';
  }

  /* The pattern each of the step's arrows belongs to (for the numbered list). */
  function arrowPatterns(sc) {
    var st = sc.before, pats = sc.patterns;
    return sc.picks.map(function (m) {
      if (pats.length < 2) return pats[0];
      if (m.dst.bond && !Chem.order(st, m.dst.bond[0], m.dst.bond[1]) && pats.indexOf('nuc') >= 0) return 'nuc';
      if (m.dst.bond && !Chem.order(st, m.dst.bond[0], m.dst.bond[1]) && pats.indexOf('pt') >= 0) return 'pt';
      if (m.src.bond && Chem.order(st, m.src.bond[0], m.src.bond[1]) === 1 && pats.indexOf('lg') >= 0) {
        var other = m.dst.lp != null;
        if (other) return 'lg';
      }
      return pats[pats.length - 1];
    });
  }

  return { judge: judge, describe: describe, moveKey: moveKey, ruleText: ruleText, arrowPatterns: arrowPatterns, name: name };
})();

if (typeof module !== 'undefined') module.exports = Judge;

/* items.js: builds one item, as a list of steps, from its code. No DOM.
 *
 * Every step is answered with the two-step rule from the class packet:
 *   Step 1  count the OCCUPIED energy levels; if they differ, that settles it
 *   Step 2  only if they are the same do the protons decide
 * Inside one element the protons never change, so Step 2 always ties. That
 * leaves two cases for the next electron:
 *   same occupied level   a small step up, because the particle left behind
 *                         is more positive each time
 *   lower occupied level  a huge jump, because the electron now comes from
 *                         the level underneath, closer to the nucleus
 *
 * A step is { type, q, options: [{ label, correct, why, summary }], rightMsg,
 * node, short, onRight }. type is choice, action, pick or check. node names
 * the flowchart box the step lights up.
 */

var Items = (function () {
  'use strict';

  /* Ionization energies shown while stripping the atom. */
  var STRIP_SHOWN = 4;

  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function flagsOf(raw) { return /^[!+]*/.exec(raw)[0]; }

  var O = Atom.ordinal, cap = Atom.cap;

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  /* "the 1st", "the 1st and 2nd", "the 1st, 2nd and 3rd" */
  function ordinals(n) {
    var list = [];
    for (var i = 1; i <= n; i++) list.push(O(i));
    if (list.length === 1) return 'the ' + list[0];
    return 'the ' + list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
  }

  /* ------------------------------------------------------------ step makers */

  /* options: [{ label, correct, why }]. Shuffled unless keepOrder. */
  function choice(it, q, options, extra) {
    extra = extra || {};
    var s = { type: 'choice', q: q, options: extra.keepOrder ? options : Plan.shuffle(options, it.rand) };
    Object.keys(extra).forEach(function (k) { s[k] = extra[k]; });
    return s;
  }

  function opt(label, correct, why, summary) { return { label: label, correct: !!correct, why: why, summary: summary }; }

  /* ---------------------------------------------------- Part 1: strip it */

  function levelsStep(it, sym, k) {
    var P = Atom.ion(sym, k - 1), L = Atom.occupied(sym, k - 1), row = Atom.row(sym);
    var cfg = Atom.configText(sym, k - 1);
    var options = [];
    for (var n = 1; n <= row; n++) {
      var why = (n === row && L < row)
        ? 'Level ' + row + ' still exists, but it has nothing in it any more. Only occupied levels count. ' +
          P + ' is ' + cfg + '.'
        : 'Read the largest n in the configuration: ' + P + ' is ' + cfg + '.';
      options.push(opt(String(n), n === L, why));
    }
    return choice(it, 'How many occupied energy levels does ' + P + ' have?', options, {
      keepOrder: true, node: 's1', short: 'Occupied levels in ' + P,
      rightMsg: P + ' is ' + cfg + '. ' + (L < row
        ? 'Level ' + row + ' still exists, but it is empty now, so the ' + O(k) +
          ' electron has to come from level ' + L + '.'
        : 'Its outermost occupied level is still level ' + L + ', so the ' + O(k) +
          ' electron comes from level ' + L + ' too.')
    });
  }

  function predictStep(it, sym, k, jump) {
    var ies = DATA.IE[sym].ie, prev = ies[k - 2], v = ies[k - 1];
    var L = Atom.levelOf(sym, k), prevL = Atom.levelOf(sym, k - 1);
    return choice(it, 'Predict the ' + O(k) + ' ionization energy. Compared with the ' + O(k - 1) +
      ' (' + prev + ' kJ/mol), it will be…', [
        opt('Lower', false, 'Every ionization energy is higher than the one before it. Each removal leaves a more positive particle.'),
        opt('A small step up', !jump, 'Look at the occupied levels. The ' + O(k - 1) + ' electron came from level ' + prevL +
            '. Which occupied level does the ' + O(k) + ' one come from?'),
        opt('A huge jump', jump, 'The ' + O(k) + ' electron comes from level ' + L + ', the same occupied level as the ' +
            O(k - 1) + '. Step 1 is a tie, so there is nothing to cause a huge jump.')
      ], {
        keepOrder: true, node: 's1', doneNode: jump ? 'jump' : 'small',
        short: O(k) + ' ionization energy',
        rightMsg: 'It is ' + v + ' kJ/mol, ' + Atom.times(prev, v) + ' the ' + O(k - 1) + '.',
        onRight: function (x, st) { x.revealed = k; x.charge = k; st.answer += ', ' + v + ' kJ/mol'; }
      });
  }

  function whySmall(it, sym, k) {
    var Z = DATA.z(sym), P = Atom.ion(sym, k - 1), Q = Atom.ion(sym, k - 2);
    var L = Atom.levelOf(sym, k), left = Z - (k - 1);
    return choice(it, 'The ' + O(k - 1) + ' and ' + O(k) + ' electrons both came from occupied level ' + L +
      ', and the nucleus still has ' + Z + ' protons. So why did the ' + O(k) + ' cost more?', [
        opt(P + ' is more positive than ' + Q + '. The same ' + Z + ' protons now hold only ' + left +
            ' electrons, so each one left is pulled harder.', true, null, P + ' is more positive than ' + Q),
        opt(P + ' has more protons than ' + Q + '.', false,
            'Removing an electron never touches the nucleus. ' + Q + ' and ' + P + ' both have ' + Z +
            ' protons, so Step 2 is a tie.'),
        opt(P + ' is smaller than ' + Q + ', so the electron is closer.', false,
            'That uses the size as the cause. Distance means the number of occupied energy levels, and that did not change: both electrons came from level ' +
            L + '. The size is a result, not a reason.'),
        opt(P + ' wants to hold on to its electrons.', false,
            'Atoms and ions do not want anything. Explain it with attraction: what changed about the particle?')
      ], {
        node: ['s2', 'small'], short: 'Why a small step',
        rightMsg: 'Both steps of the rule tie, so the only change is the particle itself. Each removal leaves it more positive, so the next electron costs a little more. A small step, not a jump.'
      });
  }

  function whyJump(it, sym, k) {
    var Z = DATA.z(sym), P = Atom.ion(sym, k - 1), ies = DATA.IE[sym].ie;
    var L = Atom.levelOf(sym, k), prevL = Atom.levelOf(sym, k - 1);
    return choice(it, 'Why is the ' + O(k) + ' ionization energy so much bigger (' + ies[k - 1] + ' against ' +
      ies[k - 2] + ')?', [
        opt('The ' + O(k) + ' electron comes from occupied level ' + L + ', much closer to the nucleus than level ' +
            prevL + '. The occupied levels changed, so Step 1 decides.', true, null,
            'From level ' + L + ', closer in: Step 1 decides'),
        opt(P + ' has a full outer shell and wants to keep it.', false,
            'Atoms and ions do not want anything. Say it with attraction: which occupied level is this electron in, and how close is that?'),
        opt(P + ' has more protons pulling on the ' + O(k) + ' electron.', false,
            'Still ' + Z + ' protons. Step 2 is a tie. What changed is the occupied level the electron comes from.'),
        opt(P + ' is a much smaller particle, so the pull is stronger.', false,
            'Careful: that uses the size as the cause. ' + P + ' is small because its outermost occupied level is now level ' +
            L + '. Say it with occupied energy levels.')
      ], {
        node: ['s1', 'jump'], short: 'Why a huge jump',
        rightMsg: 'The attraction is inversely proportional to the distance squared, so moving in by a whole occupied level makes the cost jump.'
      });
  }

  function outerStep(it, sym) {
    var o = Atom.outer(sym), name = DATA.name(sym), row = Atom.row(sym);
    var options = [];
    for (var n = 1; n <= STRIP_SHOWN - 1; n++) {
      options.push(opt(String(n), n === o, n === o + 1
        ? 'The ' + O(o + 1) + ' electron is the first one past the huge jump. It came from the level underneath. Count only the ones before it.'
        : 'Count the ionization energies before the huge jump.'));
    }
    return choice(it, 'So how many electrons were in ' + name + '’s outer level?', options, {
      keepOrder: true, short: 'Electrons in the outer level',
      rightMsg: cap(ordinals(o)) + (o === 1 ? ' came' : o === 2 ? ' both came' : ' all came') + ' off before the huge jump, so ' +
        plural(o, 'electron') + (o === 1 ? ' was' : ' were') + ' in occupied level ' + row + '.'
    });
  }

  function ionStep(it, sym) {
    var o = Atom.outer(sym), name = DATA.name(sym), ies = DATA.IE[sym].ie;
    var options = [1, 2, 3].map(function (q) {
      var why = q > o
        ? 'The ' + O(o + 1) + ' electron sits past the huge jump. It costs ' + ies[o] + ' kJ/mol, ' +
          Atom.times(ies[o - 1], ies[o]) + ' the ' + O(o) + '.'
        : 'The ' + O(q + 1) + ' electron is still in the outer level, and it costs only a small step more. ' +
          cap(name) + ' loses it too.';
      return opt(Atom.ion(sym, q), q === o, why);
    });
    return choice(it, 'So which ion does ' + name + ' form?', options, {
      keepOrder: true, short: 'Ion formed',
      rightMsg: cap(name) + ' loses the ' + (o === 1 ? 'electron' : o + ' electrons') +
        ' in its outer level and stops, because the next one is past the huge jump.'
    });
  }

  function buildStrip(it, sym) {
    var ies = DATA.IE[sym].ie, name = DATA.name(sym), Z = DATA.z(sym);
    it.kind = 'strip';
    it.sym = sym;
    it.flow = 'rule';
    it.revealed = 0;
    it.charge = 0;
    it.kicker = 'Strip the atom';
    it.prompt = cap(name) + ', ' + sym;
    it.lines = [Atom.configText(sym, 0) + '   ·   ' + Z + ' protons'];

    it.steps.push({
      type: 'action', label: 'Pull off the 1st electron', short: '1st ionization energy',
      answer: ies[0] + ' kJ/mol',
      rightMsg: 'That took ' + ies[0] + ' kJ/mol:  ' + Atom.equation(sym, 1),
      onRight: function (x) { x.revealed = 1; x.charge = 1; }
    });

    var askedSmall = false;
    for (var k = 2; k <= STRIP_SHOWN; k++) {
      var jump = Atom.levelOf(sym, k) < Atom.levelOf(sym, k - 1);
      if (k === 2 || jump) it.steps.push(levelsStep(it, sym, k));
      it.steps.push(predictStep(it, sym, k, jump));
      if (jump) it.steps.push(whyJump(it, sym, k));
      else if (!askedSmall) { it.steps.push(whySmall(it, sym, k)); askedSmall = true; }
    }
    it.steps.push(outerStep(it, sym));
    it.steps.push(ionStep(it, sym));

    var o = Atom.outer(sym);
    it.answer = cap(name) + ' has ' + plural(o, 'electron') + ' in its outer level, so it forms ' +
      Atom.ion(sym, o) + '. Every step up comes from a more positive particle; the huge jump comes from a lower occupied level.';
  }

  /* ------------------------------------------------- Part 2: mystery data */

  function jumpStep(it, values, o) {
    var options = [];
    for (var i = 1; i < values.length; i++) {
      options.push(opt('Between the ' + O(i) + ' and ' + O(i + 1), i === o,
        'From ' + values[i - 1] + ' to ' + values[i] + ' is ' + Atom.times(values[i - 1], values[i]) +
        '. Is there a step bigger than that?'));
    }
    return choice(it, 'Where is the huge jump?', options, {
      keepOrder: true, node: 'jump', short: 'Huge jump',
      rightMsg: 'From ' + values[o - 1] + ' to ' + values[o] + ' is ' + Atom.times(values[o - 1], values[o]) +
        '. Every other step is far smaller.',
      onRight: function (x) { x.jumpFound = true; }
    });
  }

  function countStep(it, values, o) {
    var options = [];
    for (var n = 1; n < values.length; n++) {
      options.push(opt(String(n), n === o, n === o + 1
        ? 'The ' + O(o + 1) + ' ionization energy is the first one past the jump. It pulls an electron from the level underneath. Count only the ones before it.'
        : 'Count the ionization energies before the huge jump.'));
    }
    return choice(it, 'How many electrons were in its outer level?', options, {
      keepOrder: true, node: 'count', short: 'Electrons in the outer level',
      rightMsg: cap(ordinals(o)) + (o === 1 ? ' came' : o === 2 ? ' both came' : ' all came') + ' off before the jump, so ' +
        plural(o, 'electron') + (o === 1 ? ' was' : ' were') + ' in the outer level.'
    });
  }

  function groupStep(it, sym, groups, q) {
    var o = Atom.outer(sym), g = Atom.group(sym);
    var options = groups.map(function (n) {
      var why = (n === 3 && o === 3)
        ? 'Group 3 is in the middle of the table, among the transition metals. ' + Atom.groupHint()
        : Atom.groupHint();
      return opt('Group ' + n, n === g, why);
    });
    return choice(it, q || 'Which group is it in?', options, {
      keepOrder: true, node: 'group', short: 'Group',
      rightMsg: plural(o, 'electron') + ' in the outer level: group ' + g + '.'
    });
  }

  function pickStep(it, sym) {
    var g = Atom.group(sym), row = Atom.row(sym);
    return {
      type: 'pick', q: 'It is in group ' + g + ', row ' + row + '. Pick it on the periodic table.',
      right: sym, tried: {}, node: 'elem', short: 'Element',
      rightMsg: 'Element X is ' + DATA.name(sym) + ', ' + sym + '.'
    };
  }

  function configStep(it, sym) {
    var z = DATA.z(sym), o = Atom.outer(sym), row = Atom.row(sym), name = DATA.name(sym);
    var others = [z - 1, z + 1, z - 8, z + 8].filter(function (n) { return n >= 3 && n <= 20; })
      .map(function (n) { return DATA.SYMBOLS[n - 1]; });
    others = Plan.shuffle(others, it.rand).slice(0, 3);
    var options = [opt(Atom.configText(sym, 0), true)].concat(others.map(function (s) {
      return opt(Atom.configText(s, 0), false, 'That is ' + DATA.name(s) + '. Element X needs ' +
        plural(o, 'electron') + ' in its outermost occupied level, level ' + row + '.');
    }));
    return choice(it, 'Which is the electron configuration of ' + name + '?', options, {
      node: 'config', short: 'Configuration',
      rightMsg: Atom.configText(sym, 0) + ': ' + plural(o, 'electron') + ' in occupied level ' + row +
        ', which matches the jump after the ' + O(o) + '.'
    });
  }

  function levelsFor(sym, n) {
    var out = [];
    for (var k = 1; k <= n; k++) out.push(Atom.levelOf(sym, k));
    return out;
  }

  function buildMystery(it, sym, kind) {
    var ies = DATA.IE[sym].ie, o = Atom.outer(sym), row = Atom.row(sym);
    it.kind = kind;
    it.sym = sym;
    it.flow = 'data';
    it.kicker = 'Mystery element';
    it.prompt = 'Element X is in row ' + row + '. Here are its first ' + Atom.word(ies.length) +
      ' ionization energies' + (kind === 'g' ? ', as a bar graph.' : '.');
    it.values = ies;
    it.steps.push(jumpStep(it, ies, o));
    it.steps.push(countStep(it, ies, o));
    it.steps.push(groupStep(it, sym, [1, 2, 3, 13, 14, 15]));
    it.steps.push(pickStep(it, sym));
    it.steps.push(configStep(it, sym));
    it.answer = 'Element X is ' + DATA.name(sym) + ' (' + sym + '), ' + Atom.configText(sym, 0) +
      '. Group ' + Atom.group(sym) + '.' +
      (DATA.METALS.indexOf(sym) >= 0 ? ' It forms ' + Atom.ion(sym, o) + '.' : '');
  }

  function buildHidden(it, sym) {
    var ies = DATA.IE[sym].ie, o = Atom.outer(sym), row = Atom.row(sym), n = DATA.HIDDEN_SHOWN;
    var shown = ies.slice(0, n);
    it.kind = 'h';
    it.sym = sym;
    it.flow = 'data';
    it.kicker = 'Mystery element';
    it.prompt = 'Element X is in row ' + row + '. Here are its first ' + Atom.word(n) + ' ionization energies.';
    it.values = ies;
    it.full = false;

    var jumpOpts = [];
    for (var i = 1; i < n; i++) {
      jumpOpts.push(opt('Between the ' + O(i) + ' and ' + O(i + 1), false,
        'From ' + shown[i - 1] + ' to ' + shown[i] + ' is only ' + Atom.times(shown[i - 1], shown[i]) +
        '. That is a step, not a jump: the jumps in Part 5 of your packet were about 4 to 9 times.'));
    }
    jumpOpts.push(opt('It is not in this data', true));
    it.steps.push(choice(it, 'Where is the huge jump?', jumpOpts, {
      keepOrder: true, node: 'jump', short: 'Huge jump',
      rightMsg: 'Every step here is small. The huge jump has not happened yet.'
    }));

    it.steps.push(choice(it, 'So what can you say about the electrons in its outer level?', [
      opt('There are at least ' + n, true),
      opt('There are exactly ' + n, false, 'Maybe, but the data cannot tell you. With ' + n + ', the jump would come between the ' +
          O(n) + ' and ' + O(n + 1) + ', which is not shown. With more, it would come even later.'),
      opt('There are exactly ' + (n - 1), false, 'With ' + (n - 1) + ', the ' + O(n) +
          ' electron would come from the level underneath, and one of these steps would be the huge jump.'),
      opt('There are fewer than ' + (n - 1), false, 'With that few, one of these steps would already be the huge jump.')
    ], {
      keepOrder: true, node: 'count', short: 'Electrons in the outer level',
      rightMsg: 'All ' + Atom.word(n) + ' came from the outer level, so it holds at least ' + n + '. It could hold more.'
    }));

    it.steps.push(choice(it, 'Which data would settle it?', [
      opt('The ' + O(n + 1) + ' and later ionization energies', true),
      opt('The atomic radius of element X', false,
          'A radius cannot count the electrons in the outer level. You need to see where the huge jump falls.'),
      opt('The 1st ionization energy of the next element', false,
          'Another element’s data says nothing about where element X’s jump falls.'),
      opt('Nothing. It must have exactly ' + n, false, 'The data only shows that there are at least ' + n + '.')
    ], {
      node: 'jump', short: 'What would settle it',
      rightMsg: 'Here they are: the rest of the data is now in the table.',
      onRight: function (x) { x.full = true; }
    }));

    it.steps.push(groupStep(it, sym, [13, 14, 15, 16], 'With all the data, which group is element X in?'));
    it.steps[it.steps.length - 1].rightMsg = 'The jump is between the ' + O(o) + ' and ' + O(o + 1) + ' (' +
      Atom.times(ies[o - 1], ies[o]) + '), so there are ' + o + ' electrons in the outer level: group ' +
      Atom.group(sym) + '.';

    it.answer = 'Element X is ' + DATA.name(sym) + ' (' + sym + '), ' + Atom.configText(sym, 0) +
      '. Group ' + Atom.group(sym) + '.';
  }

  function buildCompare(it, a, b, k) {
    var PA = Atom.ion(a, k - 1), PB = Atom.ion(b, k - 1);
    var LA = Atom.occupied(a, k - 1), LB = Atom.occupied(b, k - 1);
    var nameA = DATA.name(a), nameB = DATA.name(b);
    var cfgA = Atom.configText(a, k - 1), cfgB = Atom.configText(b, k - 1);
    it.kind = 'c';
    it.flow = 'rule';
    it.kicker = 'Head to head';
    it.prompt = 'Which has the larger ' + O(k) + ' ionization energy, ' + nameA + ' or ' + nameB + '?';
    it.lines = [a + ':  ' + Atom.configText(a, 0), b + ':  ' + Atom.configText(b, 0)];

    it.steps.push(choice(it, 'The ' + O(k) + ' ionization energy pulls an electron off which particles?', [
      opt(PA + ' and ' + PB, true),
      opt(a + ' and ' + b, false, 'Only the 1st ionization energy starts from the neutral atom. The ' + O(k) +
          ' starts after ' + (k === 2 ? 'one electron is' : Atom.word(k - 1) + ' electrons are') + ' gone: ' +
          Atom.equation(a, k) + '.'),
      opt(Atom.ion(a, k) + ' and ' + Atom.ion(b, k), false, 'Those are what is left after the ' + O(k) +
          ' electron is gone. It starts from ' + PA + ' and ' + PB + '.')
    ], {
      short: 'Particles', rightMsg: Atom.equation(a, k) + '   and   ' + Atom.equation(b, k)
    }));

    var combos = [[LA, LB], [LB, LB], [LA, LA], [LB, LA]];
    it.steps.push(choice(it, 'How many occupied energy levels do ' + PA + ' and ' + PB + ' have?',
      combos.map(function (c, i) {
        return opt(c[0] + ' and ' + c[1], i === 0, 'Count the largest n in each: ' + PA + ' is ' + cfgA + ', and ' +
          PB + ' is ' + cfgB + '.');
      }), {
        node: 's1', short: 'Occupied levels',
        rightMsg: PA + ' is ' + cfgA + ' and ' + PB + ' is ' + cfgB + '. ' + cap(nameA) +
          ' has already emptied its outer level.'
      }));

    it.steps.push(choice(it, 'Which step of the rule decides it?', [
      opt('Step 1: the occupied levels are different, so that settles it', true),
      opt('Step 2: the occupied levels are the same, so the protons decide', false,
          PA + ' has ' + LA + ' occupied levels and ' + PB + ' has ' + LB + '. They are different, so Step 1 settles it.')
    ], {
      keepOrder: true, node: 's1', short: 'Which step',
      rightMsg: 'Different occupied levels, so Step 1 settles it and the protons never get a vote.'
    }));

    it.steps.push(choice(it, 'So which has the larger ' + O(k) + ' ionization energy?', [
      opt(cap(nameA), true),
      opt(cap(nameB), false, cap(nameB) + ' does have more protons, ' + DATA.z(b) + ' against ' + DATA.z(a) +
          '. But Step 1 already settled it, so the protons never get a vote. Which particle’s next electron is closer to the nucleus?')
    ], {
      keepOrder: true, node: 'jump', short: 'Larger',
      rightMsg: PA + '’s next electron comes from occupied level ' + LA + ', closer to the nucleus than ' + PB +
        '’s level ' + LB + '. The attraction is inversely proportional to the distance squared.'
    }));

    it.answer = O(k) + ' ionization energy:  ' + cap(nameA) + ' ' + DATA.IE[a].ie[k - 1] + ' kJ/mol,  ' +
      nameB + ' ' + DATA.IE[b].ie[k - 1] + ' kJ/mol.';
  }

  /* ---------------------------------------------------------------- checks */

  function buildCheck(it, id) {
    var q = Checks.get(id);
    it.isCheck = true;
    it.tag = q.tag;
    it.kicker = it.checkpoint ? 'Checkpoint' : 'Check for understanding';
    it.steps.push({
      type: 'check', q: q.q, why: q.why, right: q.a[0], chosen: null,
      options: Plan.shuffle(q.a, it.rand).map(function (label) { return { label: label, correct: label === q.a[0] }; })
    });
  }

  /* One item from its code. The seed and position fix the option order, so
     the same run shows the same question the same way after a reload. */
  function build(raw, seed, index) {
    var code = Plan.bare(raw), flags = flagsOf(raw);
    var it = {
      code: raw, steps: [], stepIdx: 0, done: false, clean: true,
      checkpoint: flags.indexOf('!') >= 0, followUp: flags.indexOf('+') >= 0,
      rand: Plan.rng((seed ^ hash(raw) ^ (index * 7919)) >>> 0)
    };
    var kind = code.charAt(0), rest = code.slice(2);
    if (kind === 's') buildStrip(it, rest);
    else if (kind === 't' || kind === 'g') buildMystery(it, rest, kind);
    else if (kind === 'h') buildHidden(it, rest);
    else if (kind === 'c') {
      var parts = rest.split('.');
      buildCompare(it, parts[0], parts[1], +parts[2]);
    }
    else buildCheck(it, rest);
    if (it.followUp) it.kicker += ' · another try';
    return it;
  }

  return {
    STRIP_SHOWN: STRIP_SHOWN, build: build, levelsFor: levelsFor, flagsOf: flagsOf, hash: hash,
    plural: plural
  };
})();

/* evidence.js — where the two spectra meet.
 *
 * Everything here is worked out from the bank rather than typed into it, so
 * the game and tools/validate.js reach the same conclusions from the same
 * data:
 *
 *   present(c)      which IR groups the STRUCTURE says must be there
 *   irClass(c)      what kind of compound the scored IR bands say it is
 *   caseFile(c)     the answers to the routine: mass, halogen, nitrogen,
 *                   IR class, base peak
 *   whyNot(a, d)    how IR and MS each rule out a wrong option d
 *   pickDecoys()    wrong options that make a student use BOTH spectra
 *
 * THE ROUTINE. The same seven steps, in the same order, at every level:
 *
 *   1  MS  find M+                        -> molecular mass
 *   2  MS  look two past M+ for an M+2    -> chlorine or bromine?
 *   3  MS  odd or even M+                 -> nitrogen?
 *   4  IR  anything left of 3000?         -> O-H, N-H, sp2 or sp C-H
 *   5  IR  C=O, triple bond, C=C?         -> the functional group
 *   6  MS  base peak and the big losses   -> how the carbons are joined
 *   7  pick the structure that fits all of it
 */

var Evidence = (function () {
  'use strict';

  /* ------------------------------------------------------ molecular facts */

  function formulaCounts(c) { return MS.parseFormula(c.f); }

  function massOf(c) { return MS.massOf(formulaCounts(c)); }

  /* The molecular ion counts as readable only if the bank calls it 'mplus'.
     tools/validate.js makes sure every 'mplus' clears the 5% line with room
     to spare, and that anything fainter is not called 'mplus'. */
  function readableM(c) {
    var M = massOf(c);
    return c.peaks.some(function (p) { return p.role === 'mplus' && p.mz === M; }) ? M : null;
  }

  function halogen(c) {
    var m = formulaCounts(c);
    return m.Br ? 'Br' : m.Cl ? 'Cl' : null;
  }

  function hasNitrogen(c) { return !!formulaCounts(c).N; }

  function basePeak(c) {
    return c.peaks.reduce(function (a, b) { return b.ab > a.ab ? b : a; }).mz;
  }

  function scoredGroups(c) {
    var set = {};
    c.bands.forEach(function (b) { if (b.t) set[b.g] = true; });
    return Object.keys(set).sort();
  }

  /* The m/z values a student labels in this compound's mass spectrum. Only a
     compound with a readable M+ has any: every label is a loss from M. */
  function scoredMz(c) {
    if (!readableM(c)) return [];
    return c.peaks.filter(function (p) {
      return p.role === 'key' || p.role === 'mplus';
    }).map(function (p) { return p.mz; }).sort(function (a, b) { return a - b; });
  }

  /* ---------------------------------------------- groups the structure has
   *
   * Read straight off the skeletal drawing: which carbons carry hydrogens,
   * and what each is bonded to. The validator compares this with the scored
   * bands, so an IR table that forgets a C=O — or scores an O-H the
   * structure does not have — fails the build. The game uses it to keep
   * distractors honest: benzoic acid is never told it "has no sp2 C-H".
   */
  function present(c) {
    var st = c.structure, labels = st.labels || {};
    var atoms = MS.atomsOf(st);
    var ring = {}, out = {};
    (st.rings || []).forEach(function (r) { r.forEach(function (i) { ring[i] = true; }); });
    if ((st.rings || []).length) out.cc_arene = true;

    var nb = st.pts.map(function () { return []; });
    st.bonds.forEach(function (b) {
      nb[b[0]].push({ v: b[1], o: b[2] || 1 });
      nb[b[1]].push({ v: b[0], o: b[2] || 1 });
    });

    function el(v) { return atoms[v] ? atoms[v].el : null; }
    function carbonylCarbon(v) {
      return el(v) === 'C' && nb[v].some(function (n) { return n.o === 2 && el(n.v) === 'O'; });
    }

    st.pts.forEach(function (_, v) {
      if (el(v) !== 'C') return;
      var dbC = nb[v].some(function (n) { return n.o === 2 && el(n.v) === 'C'; });
      var tbC = nb[v].some(function (n) { return n.o === 3 && el(n.v) === 'C'; });
      var tbN = nb[v].some(function (n) { return n.o === 3 && el(n.v) === 'N'; });
      var co = carbonylCarbon(v);
      var explicitH = nb[v].some(function (n) { return el(n.v) === 'H'; });

      if (co) out.co_carbonyl = true;
      if (dbC && !ring[v]) out.cc_alkene = true;
      if (tbC) out.cc_alkyne = true;
      if (tbN) out.cn_nitrile = true;

      if (atoms[v].h > 0 || explicitH) {
        if (ring[v] || dbC) out.ch_sp2 = true;
        else if (tbC) out.ch_sp = true;
        else if (co) out.ch_aldehyde = true;
        else out.ch_sp3 = true;
      }
    });

    Object.keys(labels).forEach(function (k) {
      var v = +k, L = labels[k];
      var onCarbonyl = nb[v].some(function (n) { return carbonylCarbon(n.v); });
      if (L === 'OH') out[onCarbonyl ? 'oh_acid' : 'oh_alcohol'] = true;
      if (L === 'NH₂') out[onCarbonyl ? 'nh_amide' : 'nh_amine1'] = true;
      if (L === 'NH') out[onCarbonyl ? 'nh_amide' : 'nh_amine2'] = true;
      if (L === 'NO₂') out.no2_group = true;
    });

    return Object.keys(out).sort();
  }

  /* ------------------------------------------------------------- IR class */

  /* What the IR alone says a compound IS. First match wins, so the order
     matters: an acid has a C=O too, an amide has an N-H too. */
  var IR_CLASSES = {
    acid:     { label: 'Carboxylic acid',
                why: 'an enormous O–H envelope from about 2500 to 3300 AND a C=O' },
    amide:    { label: 'Amide',
                why: 'an N–H stretch AND a C=O' },
    alcohol:  { label: 'Alcohol or phenol',
                why: 'a broad, rounded O–H between 3200 and 3600, and no C=O' },
    amine:    { label: 'Amine',
                why: 'N–H above 3200 — two spikes or one — and no C=O' },
    carbonyl: { label: 'Ketone, aldehyde or ester',
                why: 'a strong, sharp C=O, with no O–H or N–H' },
    nitrile:  { label: 'Nitrile',
                why: 'a sharp C≡N near 2250' },
    nitro:    { label: 'Nitro compound',
                why: 'a very strong N–O band near 1520' },
    alkyne:   { label: 'Alkyne',
                why: 'a sharp ≡C–H spike near 3300 and a weak C≡C near 2120' },
    alkene:   { label: 'Alkene',
                why: 'sp² C–H just left of 3000 and a lone C=C near 1640' },
    arene:    { label: 'Benzene ring, nothing else',
                why: 'sp² C–H just left of 3000 and ring C=C bands near 1600 — and nothing more' },
    plain:    { label: 'Only C–H: alkane, ether or alkyl halide',
                why: 'nothing but sp³ C–H — no O–H, N–H, C=O or multiple bond. An ether’s C–O and a halide’s C–X are both down in the fingerprint region' }
  };
  var IR_CLASS_IDS = Object.keys(IR_CLASSES);

  function irClass(c) {
    var g = {};
    scoredGroups(c).forEach(function (k) { g[k] = true; });
    if (g.oh_acid) return 'acid';
    if (g.nh_amide) return 'amide';
    if (g.oh_alcohol) return 'alcohol';
    if (g.nh_amine1 || g.nh_amine2) return 'amine';
    if (g.co_carbonyl) return 'carbonyl';
    if (g.cn_nitrile) return 'nitrile';
    if (g.no2_group) return 'nitro';
    if (g.cc_alkyne || g.ch_sp) return 'alkyne';
    if (g.cc_alkene) return 'alkene';
    if (g.cc_arene) return 'arene';
    return 'plain';
  }

  /* ------------------------------------------------------------ case file */

  var HALOGEN_TEXT = {
    none: 'No M+2 pair — no Cl or Br',
    Cl:   'M+2 a third of M⁺ — chlorine',
    Br:   'M+2 as tall as M⁺ — bromine',
    unknown: 'No M⁺ to compare — can’t tell'
  };
  var NITROGEN_TEXT = {
    odd:  'Odd mass — one nitrogen',
    even: 'Even mass — no nitrogen',
    unknown: 'No M⁺ — can’t tell'
  };

  function caseFile(c) {
    var M = readableM(c), hal = halogen(c), base = basePeak(c);
    return {
      mass: M || 'none',
      massText: M ? 'm/z ' + M + ' — the molecule weighs ' + M
                  : 'None above the line — it falls apart as it forms',
      halogen: !M ? 'unknown' : (hal || 'none'),
      nitrogen: !M ? 'unknown' : (M % 2 ? 'odd' : 'even'),
      irclass: irClass(c),
      base: base,
      baseText: 'm/z ' + base + (M && base !== M ? ' (M − ' + (M - base) + ')' :
                                M && base === M ? ' — the molecular ion itself' : '')
    };
  }

  /* ------------------------------------------------------ what rules it out
   *
   * Two spectra, two separate verdicts. A wrong option that only one of them
   * can reject is exactly the one worth offering, and saying WHICH spectrum
   * did the work is the lesson.
   */
  function rangeText(g) { return GROUPS[g].range + ' cm⁻¹'; }

  function irVerdict(a, d) {
    var A = scoredGroups(a), D = scoredGroups(d);
    var extra = D.filter(function (g) { return A.indexOf(g) < 0; });
    var missing = A.filter(function (g) { return D.indexOf(g) < 0; });
    if (!extra.length && !missing.length) return null;
    var bits = [];
    if (extra.length) {
      bits.push('it would show ' + extra.map(function (g) {
        return GROUPS[g].label + ' at ' + rangeText(g);
      }).join(' and ') + ', and there is none');
    }
    if (missing.length) {
      bits.push('it has no ' + missing.map(function (g) {
        return GROUPS[g].label;
      }).join(' or ') + ', but this spectrum does');
    }
    return bits.join('; ') + '.';
  }

  /* The mass spectrum rules things out at two levels. The MOLECULAR ION —
     its mass, an M+2 pair, whether it is there at all — is arithmetic any
     student can do against a candidate's formula. The FRAGMENTS — which peak
     is tallest — take the stability reasoning from the mass spec unit. They
     are kept apart so the feedback can say which one did the work. */
  function msVerdict(a, d) {
    var aM = readableM(a), dM = readableM(d);
    var aH = aM ? halogen(a) : null, dH = dM ? halogen(d) : null;
    var aB = basePeak(a), dB = basePeak(d);
    var mass = [];
    if (aM && dM && aM !== dM) mass.push('it weighs ' + dM + ', but M⁺ is at ' + aM);
    else if (aM && !dM) mass.push('its molecular ion is too weak to read, yet this spectrum shows one at ' + aM);
    else if (!aM && dM) mass.push('it would show a clear molecular ion at ' + dM + ', and this spectrum has none');
    if (aM && dM && aH !== dH) {
      mass.push(dH ? 'it would show an M+2 pair for ' + (dH === 'Cl' ? 'chlorine' : 'bromine')
                   : 'it has no halogen, so no M+2 pair');
    }
    var frag = aB !== dB ? 'its base peak would be m/z ' + dB + ', not ' + aB : null;
    return { mass: mass.length ? mass.join('; ') : null, frag: frag };
  }

  function whyNot(a, d) {
    var m = msVerdict(a, d);
    var ms = [m.mass, m.frag].filter(Boolean).join('; ');
    return { ir: irVerdict(a, d), ms: ms ? ms + '.' : null, msMass: m.mass, msFrag: m.frag };
  }

  /* A pair neither spectrum can separate — in the terms this activity reads —
     is never offered against each other. */
  function decidable(a, d) {
    var v = whyNot(a, d);
    return !!(v.ir || v.ms);
  }

  /* -------------------------------------------------------- wrong options
   *
   * The best wrong options make a student use BOTH spectra:
   *
   *   an IR twin    — same scored IR bands, so only the mass spectrum can
   *                   reject it (1-butanol against 2-butanol)
   *   an MS twin    — the molecular ion cannot reject it (same mass, or no
   *                   readable M+ in either), but the IR does it in one look
   *                   (acetone against propanal, propanamide against
   *                   1-butanamine)
   *
   * One of each is taken first when the bank has them; any remaining places
   * go to the closest compounds by theme, formula and shared bands. A small
   * random term keeps a compound from always drawing the same rivals.
   *
   * An M+2 pair is visible from across the room, so a halide answer always
   * faces at least one halide rival, preferring the same halogen — the same
   * rule the mass spec package uses.
   */
  function pickDecoys(answer, count, rand) {
    var aIR = scoredGroups(answer).join(','), aM = readableM(answer);
    var aHal = aM ? halogen(answer) : null;

    var pool = COMPOUNDS.filter(function (d) {
      return d.id !== answer.id && decidable(answer, d);
    }).map(function (d) {
      var dIR = scoredGroups(d);
      var shared = dIR.filter(function (g) {
        return g !== 'ch_sp3' && scoredGroups(answer).indexOf(g) >= 0;
      }).length;
      var dM = readableM(d);
      return {
        c: d,
        irTwin: dIR.join(',') === aIR,
        msTwin: dIR.join(',') !== aIR && !msVerdict(answer, d).mass,
        score: shared * 2 +
               (d.theme === answer.theme ? 3 : 0) +
               (d.f === answer.f ? 4 : 0) +
               (aM && dM === aM ? 3 : 0) +
               (aHal && halogen(d) ? (halogen(d) === aHal ? 6 : 4) : 0) +
               rand() * 2.5
      };
    });
    pool.sort(function (x, y) { return y.score - x.score; });

    var picked = [];
    function take(x) { if (x && picked.indexOf(x) < 0 && picked.length < count) picked.push(x); }
    take(pool.filter(function (x) { return x.irTwin; })[0]);
    take(pool.filter(function (x) { return x.msTwin; })[0]);
    pool.forEach(take);

    if (aHal && !picked.some(function (x) { return readableM(x.c) && halogen(x.c); })) {
      var rival = pool.filter(function (x) {
        return readableM(x.c) && halogen(x.c) && picked.indexOf(x) < 0;
      })[0];
      if (rival) picked[picked.length - 1] = rival;
    }
    return picked.map(function (x) { return x.c; });
  }

  /* ---------------------------------------------------------------- hints
   *
   * The hint button walks the routine one step at a time, pointed at THIS
   * compound's spectra but never naming a label. Each call returns the next
   * step that is still useful, given what the student has already done.
   */
  var IR_ASK = {
    oh: 'The broad band near {v} cm⁻¹: does it stop before about 3100, or is it enormous, running under the C–H peaks and down past 2600?',
    nh: 'The band near {v} cm⁻¹: count its spikes, then check whether there is a C=O in the spectrum as well.',
    ch: 'The band near {v} cm⁻¹: which side of the dotted 3000 line is it on? A weak pair near 2820 and 2720, or a sharp spike near 3300, are special cases.',
    triple: 'The band near {v} cm⁻¹ is in the triple-bond region. Medium and near 2250, or weak and near 2120?',
    carbonyl: 'The band near {v} cm⁻¹ is strong and sharp. Which bond absorbs that hard, there?',
    cc: 'The band near {v} cm⁻¹: a lone band near 1640, or one of a pair near 1600 and 1500?',
    no2: 'The very strong band near {v} cm⁻¹ has a partner down near 1350. Which group absorbs as a pair like that?'
  };

  function irAsk(group, v) {
    return IR_ASK[GROUPS[group].family].replace('{v}', String(Math.round(v / 10) * 10));
  }

  return {
    present: present, scoredGroups: scoredGroups, scoredMz: scoredMz,
    readableM: readableM, halogen: halogen, hasNitrogen: hasNitrogen, basePeak: basePeak,
    massOf: massOf, irClass: irClass, IR_CLASSES: IR_CLASSES, IR_CLASS_IDS: IR_CLASS_IDS,
    caseFile: caseFile, HALOGEN_TEXT: HALOGEN_TEXT, NITROGEN_TEXT: NITROGEN_TEXT,
    whyNot: whyNot, decidable: decidable, pickDecoys: pickDecoys, irAsk: irAsk
  };
})();

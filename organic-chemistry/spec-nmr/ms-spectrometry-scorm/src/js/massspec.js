/* massspec.js — turns a peak table into a drawn EI mass spectrum.
 *
 * Unlike an IR band, a mass spectral peak sits at an INTEGER m/z. Nothing is
 * jittered sideways: 43 is 43. What varies from draw to draw is the
 * abundances, which wobble the way real ion statistics do, plus a fresh
 * scatter of low-level noise. A student therefore cannot memorise a picture,
 * but the chemistry stays exactly where it should be.
 *
 * Three things are ADDED to whatever compounds.js declares:
 *
 *   isotope peaks   M+1 from the carbon count (1.1% per carbon) and M+2 from
 *                   any chlorine (32%) or bromine (97%). These are computed
 *                   from the molecular formula rather than typed into the
 *                   bank, so they cannot be entered wrong — and the M+1
 *                   height really does count the carbons.
 *
 *   satellites      a small +1 on every substantial fragment, which is the
 *                   same 13C effect one level down.
 *
 *   noise           a seeded scatter of sticks at 0.4-3% and the +/-1 H
 *                   chatter around big peaks. Real spectra are full of this
 *                   and learning to look straight past it is half the skill.
 *
 * THRESHOLD is the line drawn across the plot. Below it, a peak is not worth
 * reading. It is the direct analogue of the 1500 cm-1 line in the IR package.
 */

var MS = (function () {
  var THRESHOLD = 5;                 /* % of base peak */
  var HEAD = 18;                     /* px of clear air above a 100% peak, for its label */
  var LABEL_H = 13;                  /* px a peak's m/z label occupies above the stick */
  var MASS = { C: 12, H: 1, N: 14, O: 16, F: 19, S: 32, Cl: 35, Br: 79, I: 127 };

  /* Deterministic PRNG (mulberry32), so a seed always redraws the same. */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------ formula arithmetic
   * Shared with tools/validate.js, which evals this file, so the bank is
   * checked against the same arithmetic the renderer uses. */

  function parseFormula(f) {
    var out = {}, re = /([A-Z][a-z]?)(\d*)/g, m, consumed = 0;
    while ((m = re.exec(f)) !== null) {
      if (m[0] === '') break;
      consumed += m[0].length;
      if (!(m[1] in MASS)) return null;
      out[m[1]] = (out[m[1]] || 0) + (m[2] === '' ? 1 : +m[2]);
    }
    return consumed === f.length ? out : null;
  }

  function massOf(counts) {
    var s = 0;
    for (var el in counts) s += MASS[el] * counts[el];
    return s;
  }

  /* ------------------------------------------------------------ the spectrum */

  function build(compound, seed) {
    var r = rng(seed);
    var mol = parseFormula(compound.f);
    var M = massOf(mol);
    var byMz = {};
    var peaks = [];

    function put(p) {
      if (byMz[p.mz]) return byMz[p.mz];
      byMz[p.mz] = p;
      peaks.push(p);
      return p;
    }

    /* --- the declared peaks, with their abundances wobbled ---
       The base peak never moves. Benzaldehyde declares M+ at 100 and M−1 at
       95, so an unclamped +12% wobble on the 95 would overtake it and change
       which peak is the base peak — and the base peak is what Level 3 asks a
       student to predict and what ANSWER_KEY.md states. Everything else is
       held just below it. */
    compound.peaks.forEach(function (p) {
      var wobble = p.ab === 100 ? 1 : (0.88 + r() * 0.24);
      var ab = Math.min(p.ab * wobble, p.ab === 100 ? 100 : 97);
      put({
        mz: p.mz,
        ab: Math.max(0.3, ab),
        declared: p.ab,
        ion: p.ion || null,
        role: p.role,
        why: p.why || null,
        note: p.note || null
      });
    });

    var mplus = byMz[M] || null;

    /* --- isotope peaks, computed from the formula --- */
    /* An M+1 needs an M+ to sit next to. Where the molecular ion is absent
       (tert-butanol, isooctane) there is nothing to be one mass unit above,
       and that absence is itself part of what the student reads. */
    if (mplus) {
      var m1 = mplus.ab * 0.011 * (mol.C || 0);
      if (m1 > 0.15) {
        put({ mz: M + 1, ab: m1, role: 'miso1', ion: null,
              carbons: mol.C || 0, why: null });
      }
      var heavy = (mol.Cl || 0) * 0.320 + (mol.Br || 0) * 0.973 + (mol.S || 0) * 0.044;
      if (heavy > 0.02) {
        put({ mz: M + 2, ab: mplus.ab * heavy, role: 'miso2', ion: null,
              halogen: mol.Br ? 'Br' : mol.Cl ? 'Cl' : 'S', why: null });
      }
    }

    /* A fragment that kept the halogen carries the doublet too. Only peaks
       whose formula we actually know are treated this way — guessing would
       put a 3:1 pair somewhere it does not belong. */
    peaks.slice().forEach(function (p) {
      if (p.role === 'miso1' || p.role === 'miso2' || !p.ion) return;
      var ion = IONS[p.ion];
      var c = ion && ion.f ? parseFormula(ion.f) : null;
      if (!c) return;
      var h = (c.Cl || 0) * 0.320 + (c.Br || 0) * 0.973;
      if (h > 0.02 && p.ab * h > 0.4) {
        put({ mz: p.mz + 2, ab: p.ab * h, role: 'sat', ion: null, why: null });
      }
      if ((c.C || 0) >= 2 && p.ab > 12) {
        put({ mz: p.mz + 1, ab: p.ab * 0.011 * c.C, role: 'sat', ion: null, why: null });
      }
    });

    /* --- satellites on anything substantial that has no formula of its own --- */
    peaks.slice().forEach(function (p) {
      if (p.role === 'miso1' || p.role === 'miso2' || p.role === 'sat') return;
      if (p.ion || p.ab < 15 || p.mz >= M) return;
      /* roughly one carbon per 14 mass units of hydrocarbon fragment */
      put({ mz: p.mz + 1, ab: p.ab * 0.011 * Math.round(p.mz / 14), role: 'sat',
            ion: null, why: null });
    });

    /* --- noise: the low scatter every real spectrum carries --- */
    var lo = 26, hi = M - 1;
    var wanted = Math.min(16, Math.max(6, Math.round((hi - lo) / 9)));
    for (var i = 0; i < wanted * 3 && countNoise() < wanted; i++) {
      var mz = lo + Math.floor(r() * (hi - lo + 1));
      if (byMz[mz]) continue;
      put({ mz: mz, ab: 0.4 + r() * 2.6, role: 'noise', ion: null, why: null });
    }
    function countNoise() {
      var n = 0;
      for (var k = 0; k < peaks.length; k++) if (peaks[k].role === 'noise') n++;
      return n;
    }

    peaks.sort(function (a, b) { return a.mz - b.mz; });

    /* Renormalise so the tallest peak is exactly 100 after the wobble. */
    var max = peaks.reduce(function (m2, p) { return Math.max(m2, p.ab); }, 1);
    peaks.forEach(function (p) { p.ab = p.ab / max * 100; });

    /* A peak a student is asked to label. The molecular ion always counts;
       the M+2 doublet counts for the halides, where reading it is the lesson —
       but only when it clears the reading threshold. Marking a peak that the
       same plot captions "don't read it" would contradict the rule the whole
       activity is teaching. Where M+ is faint the M+2 is fainter still, and
       that compound simply carries the lesson without the isotope drop. */
    peaks.forEach(function (p, i) {
      p.i = i;
      p.target = p.role === 'key' || p.role === 'mplus' ||
                 (p.role === 'miso2' && !!compound.isotopeTarget && p.ab >= THRESHOLD);
    });

    return {
      compound: compound, M: M, mol: mol, peaks: peaks, seed: seed,
      base: peaks.reduce(function (a, b) { return b.ab > a.ab ? b : a; }, peaks[0]),
      mzMin: 10, mzMax: M + 8
    };
  }

  var SUB = '\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089';

  /* What actually walked off, worked out from the formulas rather than looked
     up. The lookup table cannot be trusted here: LOSSES[43] offers "•C3H7 or
     CH3CO•", and for acetophenone only the second is true. Subtracting the
     fragment from the molecule settles it every time. */
  function neutralOf(spec, peak) {
    var ion = peak.ion ? IONS[peak.ion] : null;
    if (!ion) return null;
    var counts;
    if (ion.f) {
      var mol = parseFormula(spec.compound.f), frag = parseFormula(ion.f);
      if (!mol || !frag) return null;
      counts = {};
      for (var el in mol) {
        var n = mol[el] - (frag[el] || 0);
        if (n < 0) return null;
        if (n > 0) counts[el] = n;
      }
    } else if (ion.lost) {
      counts = ion.lost === 'X' || ion.lost === 'HX'
        ? (function () {
            var m = parseFormula(spec.compound.f), c = {};
            ['Cl', 'Br', 'F', 'I'].some(function (h) { if (m[h]) { c[h] = 1; return true; } });
            if (ion.lost === 'HX') c.H = 1;
            return c;
          })()
        : parseFormula(ion.lost);
    }
    if (!counts) return null;

    /* C and H first, the way a formula is written. */
    var order = Object.keys(counts).sort(function (a, b) {
      if (a === 'C') return -1;
      if (b === 'C') return 1;
      if (a === 'H') return -1;
      if (b === 'H') return 1;
      return a < b ? -1 : 1;
    });
    var text = order.map(function (el) {
      return el + (counts[el] > 1 ? String(counts[el]).replace(/\d/g, function (d) {
        return SUB[+d];
      }) : '');
    }).join('');

    /* Hill order is correct but unfamiliar: a student reading "•C2H3O" will
       not connect it to the "CH3CO•" in the correlation table. These four are
       spelled the conventional way. Only aliases that are unambiguous
       throughout this bank are listed — •C2H5O is deliberately absent,
       because in 1-phenylethanol it is CH3CHOH• rather than an ethoxy. */
    var ALIAS = {
      'C2H3O': 'CH\u2083CO\u2022',
      'C3H5O': 'CH\u2083CH\u2082CO\u2022',
      'CH3O': '\u2022OCH\u2083',
      'HO': '\u2022OH'
    };
    var plain = order.map(function (el) {
      return el + (counts[el] > 1 ? counts[el] : '');
    }).join('');
    if (ALIAS[plain]) return ALIAS[plain];

    /* A radical cation was left by a whole molecule walking off; anything
       else was left by a radical, which carries the dot. */
    return (ion.cls === 'radical' ? '' : '\u2022') + text;
  }

  /* ------------------------------------------- which atoms the fragment keeps
   *
   * A skeletal structure carries no hydrogens, so they are counted back from
   * the bonds: a carbon has 4 minus the bond orders around it, and a vertex
   * inside an aromatic ring carries one more bond order than its drawn bonds
   * show. Heteroatom labels state their own hydrogens.
   *
   * With per-vertex counts in hand, a simple cleavage is found by trying each
   * bond in turn: cut it, and if one of the two pieces has exactly the
   * fragment's formula, that piece is what the student sees keep the charge.
   * Hydrogen counts come from the INTACT structure — when R–R' breaks, the
   * carbon that lost the bond becomes a carbocation with an empty orbital, it
   * does not pick up an extra hydrogen.
   */

  var LABEL_ATOM = {
    'O': { el: 'O', h: 0 }, 'OH': { el: 'O', h: 1 },
    'N': { el: 'N', h: 0 }, 'NH': { el: 'N', h: 1 }, 'NH₂': { el: 'N', h: 2 },
    'Cl': { el: 'Cl', h: 0 }, 'Br': { el: 'Br', h: 0 },
    'F': { el: 'F', h: 0 }, 'I': { el: 'I', h: 0 }, 'S': { el: 'S', h: 0 }
  };

  function atomsOf(structure) {
    var n = structure.pts.length;
    var labels = structure.labels || {};
    var inRing = {};
    (structure.rings || []).forEach(function (r) {
      r.forEach(function (i) { inRing[i] = true; });
    });

    var order = new Array(n);
    for (var i = 0; i < n; i++) order[i] = inRing[i] ? 1 : 0;
    structure.bonds.forEach(function (b) {
      var o = b[2] || 1;
      order[b[0]] += o;
      order[b[1]] += o;
    });

    var atoms = [];
    for (var v = 0; v < n; v++) {
      if (labels[v]) {
        var L = LABEL_ATOM[labels[v]];
        atoms.push(L ? { el: L.el, h: L.h } : null);
      } else {
        atoms.push({ el: 'C', h: Math.max(0, 4 - order[v]) });
      }
    }
    return atoms;
  }

  function countsOf(atoms, members) {
    var c = {};
    members.forEach(function (v) {
      var a = atoms[v];
      if (!a) return;
      c[a.el] = (c[a.el] || 0) + 1;
      if (a.h) c.H = (c.H || 0) + a.h;
    });
    return c;
  }

  function sameCounts(a, b) {
    var keys = {};
    for (var k in a) keys[k] = 1;
    for (var k2 in b) keys[k2] = 1;
    for (var el in keys) if ((a[el] || 0) !== (b[el] || 0)) return false;
    return true;
  }

  /* The vertices reachable from `start` once `skip` (a bond index) is gone. */
  function component(structure, start, skip) {
    var adj = {};
    structure.bonds.forEach(function (b, i) {
      if (i === skip) return;
      (adj[b[0]] = adj[b[0]] || []).push(b[1]);
      (adj[b[1]] = adj[b[1]] || []).push(b[0]);
    });
    var seen = {}, stack = [start], out = [];
    while (stack.length) {
      var v = stack.pop();
      if (seen[v]) continue;
      seen[v] = true;
      out.push(v);
      (adj[v] || []).forEach(function (w) { if (!seen[w]) stack.push(w); });
    }
    return out.sort(function (x, y) { return x - y; });
  }

  function labelledVertex(structure, els) {
    var labels = structure.labels || {};
    for (var k in labels) {
      var L = LABEL_ATOM[labels[k]];
      if (L && els.indexOf(L.el) >= 0) return +k;
    }
    return -1;
  }

  /* What the student should see for one peak:
       kind 'whole'  the intact molecule (the molecular ion)
       kind 'cut'    one bond broken; `keeps` stay, the rest is ghosted
       kind 'ghost'  a small neutral walked off from a named atom (water, HCl)
       kind 'hydrogen' only a hydrogen left, so nothing can be ghosted
       null          no honest picture available */
  function fragmentView(compound, peak) {
    var st = compound.structure;
    if (!st || !st.pts) return null;
    var atoms = atomsOf(st);
    var all = st.pts.map(function (_, i) { return i; });

    if (peak.role === 'mplus') {
      return { kind: 'whole', keeps: all, charge: -1, lost: null };
    }

    /* An isotope peak is not a fragment: nothing broke, nothing left. It is
       the SAME molecule carrying one heavier atom, which is exactly the point
       worth making — so it is drawn whole, with the heavy atom picked out. */
    if (peak.role === 'miso1') {
      return { kind: 'isotope', keeps: all, charge: -1, lost: null,
               isotope: '¹³C', heavy: -1,
               note: 'the same molecule, with one ¹³C in place of a ¹²C' };
    }
    if (peak.role === 'miso2') {
      var hv = labelledVertex(st, ['Cl', 'Br', 'S']);
      var swap = peak.halogen === 'Br' ? '⁸¹Br in place of ⁷⁹Br'
               : peak.halogen === 'Cl' ? '³⁷Cl in place of ³⁵Cl'
               : peak.halogen === 'S' ? '³⁴S in place of ³²S'
               : 'a heavier isotope';
      return { kind: 'isotope', keeps: all, charge: -1, lost: null,
               isotope: peak.halogen, heavy: hv,
               note: 'the same molecule, with ' + swap };
    }

    var ion = peak.ion ? IONS[peak.ion] : null;
    if (!ion) return null;

    if (ion.lost === 'H2O' || ion.lost === 'HX') {
      var v = ion.lost === 'H2O'
        ? labelledVertex(st, ['O'])
        : labelledVertex(st, ['Cl', 'Br', 'F', 'I']);
      if (v < 0) return null;
      return {
        kind: 'ghost', charge: -1, lost: ion.lost === 'H2O' ? 'H₂O' : 'HX',
        keeps: all.filter(function (i) { return i !== v; })
      };
    }
    if (!ion.f) return null;

    var want = parseFormula(ion.f);
    if (!want) return null;

    /* a loss of one hydrogen shows no missing heavy atom */
    var whole = countsOf(atoms, all);
    if (sameCounts(want, Object.keys(whole).reduce(function (o, el) {
      o[el] = whole[el] - (el === 'H' ? 1 : 0);
      return o;
    }, {}))) {
      return { kind: 'hydrogen', keeps: all, charge: -1, lost: '•H' };
    }

    var matches = [];
    st.bonds.forEach(function (b, bi) {
      [0, 1].forEach(function (endIdx) {
        var keep = component(st, b[endIdx], bi);
        if (keep.indexOf(b[1 - endIdx]) >= 0) return;      /* ring bond: still joined */
        if (!sameCounts(countsOf(atoms, keep), want)) return;
        matches.push({ keeps: keep, charge: b[endIdx], bond: bi });
      });
    });
    if (!matches.length) return null;

    /* Where more than one bond gives a piece of the right formula, prefer the
       cut the mechanism actually describes: α-cleavage keeps the heteroatom,
       benzylic keeps the ring. Anything still tied is a symmetry twin — either
       picture is the same molecule seen from the other end. */
    var ringV = {};
    (st.rings || []).forEach(function (r) { r.forEach(function (i) { ringV[i] = true; }); });

    /* heavy-atom neighbours of each vertex — how substituted a carbon is */
    var degree = {};
    st.bonds.forEach(function (b) {
      degree[b[0]] = (degree[b[0]] || 0) + 1;
      degree[b[1]] = (degree[b[1]] || 0) + 1;
    });

    matches.forEach(function (m) {
      var kept = {};
      m.keeps.forEach(function (v4) { kept[v4] = true; });
      /* α-cleavage: the charge should land next to the O or N it is sharing with */
      var nextToHetero = st.bonds.some(function (b) {
        var other = b[0] === m.charge ? b[1] : b[1] === m.charge ? b[0] : -1;
        return other >= 0 && kept[other] && atoms[other] && atoms[other].el !== 'C';
      });
      m.score = (ion.mech === 'alpha' && nextToHetero ? 8 : 0) +
                (ion.mech === 'benzylic' && ringV[m.charge] === undefined &&
                 m.keeps.some(function (v5) { return ringV[v5]; }) ? 8 : 0) +
                /* a break at a branch point leaves the MOST substituted carbon
                   holding the charge — 3° over 2° over 1°, which is the whole
                   lesson, so the picture must not show the other one */
                (degree[m.charge] || 0);
    });
    matches.sort(function (a, b) { return b.score - a.score; });

    return {
      kind: 'cut', keeps: matches[0].keeps, charge: matches[0].charge,
      bond: matches[0].bond, lost: null,
      ambiguous: matches.filter(function (m) { return m.score === matches[0].score; }).length > 1
    };
  }

  function peakAt(spec, mz) {
    for (var i = 0; i < spec.peaks.length; i++) if (spec.peaks[i].mz === mz) return spec.peaks[i];
    return null;
  }

  /* --------------------------------------------------------------- geometry */

  function plotRect(w, h) {
    return { x: 54, y: 16, w: Math.max(40, w - 54 - 16), h: Math.max(40, h - 16 - 34) };
  }

  function xOfMz(mz, rect, spec) {
    return rect.x + rect.w * (mz - spec.mzMin) / (spec.mzMax - spec.mzMin);
  }

  function mzOfX(px, rect, spec) {
    return spec.mzMin + (px - rect.x) / rect.w * (spec.mzMax - spec.mzMin);
  }

  /* The top of the plot is held back by HEAD so the tallest peak still has
     room for its m/z label above it. */
  function yOfAb(ab, rect) {
    return rect.y + HEAD + (rect.h - HEAD) * (1 - ab / 100);
  }

  /* A round tick spacing. Denser than the default would be, because on a
     stick plot the axis is how you place a peak, and 100-unit gaps make a
     stick at 57 indistinguishable from one at 63. */
  function tickStep(span, width) {
    var room = Math.max(4, Math.floor((width || 600) / 46));
    var steps = [5, 10, 20, 25, 50, 100];
    for (var i = 0; i < steps.length; i++) if (span / steps[i] <= room) return steps[i];
    return 200;
  }

  function tone(name, fallback) {
    var c = getComputedStyle(document.documentElement).getPropertyValue(name);
    return c && c.trim() ? c.trim() : fallback;
  }

  /* ----------------------------------------------------------------- drawing */

  function draw(canvas, spec, opts) {
    opts = opts || {};
    var dpr = window.devicePixelRatio || 1;
    var cssW = canvas.clientWidth, cssH = canvas.clientHeight;
    if (!cssW || !cssH) return null;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    var rect = plotRect(cssW, cssH);
    var grid = tone('--grid', '#d8e2ea');
    var muted = tone('--muted', '#5d7283');
    var stick = tone('--stick', '#0f5d8f');
    var quiet = tone('--quiet', '#a9bdcb');

    ctx.fillStyle = tone('--paper', '#ffffff');
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    /* horizontal gridlines and the abundance axis */
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = muted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var a = 0; a <= 100; a += 20) {
      var y = Math.round(yOfAb(a, rect)) + 0.5;
      ctx.beginPath(); ctx.moveTo(rect.x, y); ctx.lineTo(rect.x + rect.w, y); ctx.stroke();
      ctx.fillText(String(a), rect.x - 7, y);
    }

    /* the m/z axis — minor ticks to count along, major ticks labelled, and a
       faint vertical gridline at each label so a stick can be traced down to
       a number instead of guessed at */
    var step = tickStep(spec.mzMax - spec.mzMin, rect.w);
    var minor = step / (step % 4 === 0 ? 4 : 5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.strokeStyle = grid;
    for (var mzm = Math.ceil(spec.mzMin / minor) * minor; mzm <= spec.mzMax; mzm += minor) {
      var xm = Math.round(xOfMz(mzm, rect, spec)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(xm, rect.y + rect.h); ctx.lineTo(xm, rect.y + rect.h + 3);
      ctx.stroke();
    }

    for (var mz = Math.ceil(spec.mzMin / step) * step; mz <= spec.mzMax; mz += step) {
      var x = Math.round(xOfMz(mz, rect, spec)) + 0.5;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = grid;
      ctx.beginPath();
      ctx.moveTo(x, rect.y); ctx.lineTo(x, rect.y + rect.h);
      ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = muted;
      ctx.beginPath();
      ctx.moveTo(x, rect.y + rect.h); ctx.lineTo(x, rect.y + rect.h + 6);
      ctx.stroke();
      ctx.fillStyle = muted;
      ctx.fillText(String(mz), x, rect.y + rect.h + 9);
    }

    /* axis titles */
    ctx.save();
    ctx.translate(14, rect.y + rect.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = muted;
    ctx.fillText('Relative abundance (%)', 0, 0);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('m/z', rect.x + rect.w / 2, cssH - 4);

    ctx.strokeStyle = grid;
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);

    /* --- the sticks --- */
    /* Peaks below the threshold are drawn in a lighter ink. Colour is never
       the only signal: the line is there, the caption says what it means, and
       every quiet peak explains itself when clicked. */
    var baseY = rect.y + rect.h;
    spec.peaks.forEach(function (p) {
      var x = Math.round(xOfMz(p.mz, rect, spec)) + 0.5;
      var top = yOfAb(p.ab, rect);
      ctx.strokeStyle = p.ab < THRESHOLD ? quiet : stick;
      ctx.lineWidth = p.ab < THRESHOLD ? 1 : 1.6;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x, top);
      ctx.stroke();
    });

    /* --- the mass, printed above every peak worth reading ---
       This is what makes a stick plot readable: you should never have to
       trace a line down to the axis and estimate. Crowded regions (41, 43,
       45 sitting together) are resolved tallest-first, so the peaks that
       matter keep their labels and the chatter loses its. */
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    /* Crowded neighbours STAGGER onto a second or third row rather than
       losing their label. Dropping one would be worst exactly where it
       matters most — an M/M+2 halogen pair sits two mass units apart, and
       reading 122 against 124 is the entire lesson for those compounds. */
    var boxes = [];
    function clashes(box) {
      for (var i = 0; i < boxes.length; i++) {
        var o = boxes[i];
        if (box.l < o.r && box.r > o.l && box.t < o.b && box.b > o.t) return true;
      }
      return false;
    }

    spec.peaks.slice()
      .sort(function (a, b) { return b.ab - a.ab; })
      .forEach(function (p) {
        if (p.ab < THRESHOLD) return;
        var text = String(p.mz);
        var x = xOfMz(p.mz, rect, spec);
        var half = ctx.measureText(text).width / 2 + 3;
        if (x - half < rect.x || x + half > rect.x + rect.w) return;

        var top = yOfAb(p.ab, rect) - LABEL_H;
        for (var row = 0; row < 3; row++) {
          var t = top - row * LABEL_H;
          if (t < rect.y) break;
          var box = { l: x - half, r: x + half, t: t, b: t + LABEL_H };
          if (clashes(box)) continue;
          boxes.push(box);
          ctx.fillStyle = p.target ? stick : muted;
          ctx.fillText(text, x, t + LABEL_H - 3);
          break;
        }
      });

    /* Handed back so the drop markers can be laid out around the numbers
       instead of on top of them. */
    rect.labels = boxes;

    /* the baseline itself, over the foot of the sticks */
    ctx.strokeStyle = muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rect.x, baseY + 0.5); ctx.lineTo(rect.x + rect.w, baseY + 0.5);
    ctx.stroke();

    /* --- the reading threshold --- */
    var ty = Math.round(yOfAb(THRESHOLD, rect)) + 0.5;
    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = tone('--divider', '#b48ac8');
    ctx.beginPath(); ctx.moveTo(rect.x, ty); ctx.lineTo(rect.x + rect.w, ty); ctx.stroke();
    ctx.restore();

    ctx.font = '10px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    /* The caption sits at the low-m/z end, which is always empty — nothing
       fragments below about m/z 26 — so it can never cover a peak. At the
       high end it would sit on top of the molecular ion. */
    var cap = 'below this line — don’t read it';
    var tw = ctx.measureText(cap).width;
    if (tw + 12 <= rect.w) {            /* on a very narrow plot, the line speaks for itself */
      ctx.fillStyle = tone('--paper', '#ffffff');
      ctx.globalAlpha = 0.9;
      ctx.fillRect(rect.x + 2, ty - 8, tw + 6, 15);
      ctx.globalAlpha = 1;
      ctx.fillStyle = muted;
      ctx.fillText(cap, rect.x + 5, ty);
    }
    ctx.textBaseline = 'alphabetic';

    return rect;
  }

  /* A marker for a short peak can end up a long way above it once collision
     avoidance has pushed it clear, and then it is not obvious which stick it
     belongs to. A hairline from the marker down to the top of its peak
     settles that. Drawn after layout, because only then are the marker
     positions known — and it does not disturb the plot already on the canvas. */
  function drawLeaders(canvas, leaders) {
    var ctx = canvas.getContext('2d');
    ctx.save();
    ctx.strokeStyle = tone('--quiet', '#a9bdcb');
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    leaders.forEach(function (l) {
      if (l.y1 >= l.y0 - 3) return;          /* marker already sits on the peak */
      ctx.beginPath();
      ctx.moveTo(Math.round(l.x) + 0.5, l.y0 - 2);
      ctx.lineTo(Math.round(l.x) + 0.5, l.y1);
      ctx.stroke();
    });
    ctx.restore();
  }

  return {
    THRESHOLD: THRESHOLD, LABEL_H: LABEL_H,
    build: build, draw: draw, drawLeaders: drawLeaders, peakAt: peakAt, rng: rng,
    neutralOf: neutralOf, fragmentView: fragmentView,
    atomsOf: atomsOf, countsOf: countsOf, sameCounts: sameCounts,
    parseFormula: parseFormula, massOf: massOf,
    plotRect: plotRect, xOfMz: xOfMz, mzOfX: mzOfX, yOfAb: yOfAb
  };
})();

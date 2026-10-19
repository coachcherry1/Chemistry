/* strain.js — the strain table and the energy curve built from it.
 *
 * Every curve in the activity is the sum of pairwise interactions between a
 * group on the front carbon and a group on the back carbon, using the same
 * additive table students use by hand. That way a student who adds up
 * "11 + 4 + 4" gets exactly the 19 kJ/mol the graph shows.
 *
 * Each pair has two numbers:
 *   ecl  cost when the two groups are eclipsed (0° apart)
 *   gau  cost when they are gauche (60° apart)
 * Anything 120° or 180° apart costs nothing.
 *
 * Klein's table gives the four values for H and CH₃. Nothing in an introductory
 * text covers the halogens or branched groups, so those rows are estimates
 * built from measured data, and the `src` column says which. Every number here
 * is meant to be edited: change it, run `node tools/validate.js`, rebuild.
 *
 * Between the tabulated angles the curve is the smoothest one through them: a
 * short cosine series whose value at 0°, 60°, 120° and 180° is exactly the
 * table entry. Summed over a molecule that gives the familiar textbook curve
 * — ethane comes out as 6(1 + cos 3φ) — with minima at the staggered angles.
 */

var STRAIN = (function () {
  'use strict';

  var SOURCES = {
    klein:   'Klein, Organic Chemistry (table of interaction costs)',
    zero:    'Taken as zero, as Klein does for any gauche pair involving H',
    barrier: 'Measured rotation barrier of the haloethane CH₃–CH₂X, minus two H/H eclipsing costs',
    aval:    'Half the axial–equatorial energy difference of the substituted cyclohexane, ' +
             'the same reasoning that makes axial methylcyclohexane cost two gauche interactions (7.6)',
    dihalo:  'Measured gauche − anti energy difference of the 1,2-dihaloethane (gas phase)',
    est:     'Estimate for this activity; no textbook value exists'
  };

  /* [group, group, eclipsed, gauche, source of eclipsed, source of gauche]
     kJ/mol throughout. */
  var ROWS = [
    ['H',   'H',    4.0,  0,    'klein',   'zero'],
    ['H',   'CH3',  6.0,  0,    'klein',   'zero'],
    ['CH3', 'CH3', 11,    3.8,  'klein',   'klein'],

    ['H',   'Cl',   7.5,  0,    'barrier', 'zero'],
    ['H',   'Br',   7.5,  0,    'barrier', 'zero'],
    ['H',   'I',    5.5,  0,    'barrier', 'zero'],
    ['CH3', 'Cl',  10,    1.0,  'est',     'aval'],
    ['CH3', 'Br',  10,    1.0,  'est',     'aval'],
    ['CH3', 'I',    9,    1.0,  'est',     'aval'],
    ['Cl',  'Cl',  15,    5.0,  'est',     'dihalo'],
    ['Br',  'Br',  17,    7.0,  'est',     'dihalo'],
    ['I',   'I',   19,    9.0,  'est',     'est'],

    ['H',   'iPr',  6.5,  0,    'est',     'zero'],
    ['CH3', 'iPr', 13,    4.6,  'est',     'aval'],
    ['H',   'tBu',  8.0,  0,    'est',     'zero'],
    ['CH3', 'tBu', 20,   11.4,  'est',     'aval']
  ];

  var NAMES = { H: 'H', CH3: 'CH₃', Cl: 'Cl', Br: 'Br', I: 'I',
                iPr: 'CH(CH₃)₂', tBu: 'C(CH₃)₃' };

  var TABLE = {};
  ROWS.forEach(function (r) {
    TABLE[key(r[0], r[1])] = { a: r[0], b: r[1], ecl: r[2], gau: r[3], eclSrc: r[4], gauSrc: r[5] };
  });

  function key(a, b) { return a < b ? a + '|' + b : b + '|' + a; }

  function strainKey(g) { return GROUPS[g] ? GROUPS[g].strain : g; }

  function pair(ga, gb) {
    var row = TABLE[key(strainKey(ga), strainKey(gb))];
    if (!row) throw new Error('No strain entry for ' + ga + '/' + gb);
    return row;
  }

  /* Basis functions: f is 1 at 0° and 0 at 60/120/180; g is 1 at 60° and 0 at
     0/120/180. Both are even, so the sign of the angle never matters. */
  var RAD = Math.PI / 180;
  function f(t) {
    t *= RAD;
    return 1 / 6 + Math.cos(t) / 3 + Math.cos(2 * t) / 3 + Math.cos(3 * t) / 6;
  }
  function g(t) {
    t *= RAD;
    return 1 / 3 + Math.cos(t) / 3 - Math.cos(2 * t) / 3 - Math.cos(3 * t) / 3;
  }

  function wrap(a) { return ((a % 360) + 360) % 360; }

  /* Angle between two Newman directions, folded into 0–180. */
  function gap(a, b) {
    var d = Math.abs(wrap(a - b));
    return d > 180 ? 360 - d : d;
  }

  /* `nm` is a Newman description: { front: [{g, a}], back: [{g, a}] } with
     angles in degrees, clockwise from straight up. `delta` turns the back
     carbon clockwise. */
  function energy(nm, delta) {
    var e = 0;
    nm.front.forEach(function (p) {
      nm.back.forEach(function (q) {
        var row = pair(p.g, q.g);
        var t = gap(q.a + delta, p.a);
        e += row.ecl * f(t) + row.gau * g(t);
      });
    });
    return e;
  }

  /* The interactions present at a staggered or eclipsed angle, merged by kind,
     for the "where does the number come from" breakdown. Returns [] between
     the named angles. */
  function breakdown(nm, delta) {
    var out = {}, order = [];
    var ok = true;
    nm.front.forEach(function (p) {
      nm.back.forEach(function (q) {
        var t = gap(q.a + delta, p.a);
        var kind = t < 1 ? 'eclipsed' : Math.abs(t - 60) < 1 ? 'gauche' : null;
        if (t >= 1 && Math.abs(t - 60) >= 1 && Math.abs(t - 120) >= 1 && Math.abs(t - 180) >= 1) ok = false;
        if (!kind) return;
        var row = pair(p.g, q.g);
        var cost = kind === 'eclipsed' ? row.ecl : row.gau;
        if (!cost) return;
        var a = strainKey(p.g), b = strainKey(q.g);
        var names = [NAMES[a], NAMES[b]];
        /* H last, then CH₃, so the pair reads the way Klein writes it */
        var rank = { H: 9, CH3: 5 };
        if ((rank[a] || 0) < (rank[b] || 0)) names.reverse();
        var k = kind + ':' + key(a, b);
        if (!out[k]) { out[k] = { kind: kind, label: names.join('/'), cost: cost, n: 0 }; order.push(k); }
        out[k].n++;
      });
    });
    if (!ok) return [];
    return order.map(function (k) { return out[k]; })
      .sort(function (x, y) { return y.cost - x.cost; });
  }

  function sum(items) {
    return items.reduce(function (s, it) { return s + it.cost * it.n; }, 0);
  }

  /* Tidy numbers for display: 3.8, 12, 4.8 — never 3.8000000001. */
  function fmt(x) {
    var r = Math.round(x * 10) / 10;
    if (Math.abs(r) < 0.05) r = 0;
    return r % 1 === 0 ? String(r) : r.toFixed(1);
  }

  return {
    SOURCES: SOURCES,
    ROWS: ROWS,
    NAMES: NAMES,
    pair: pair,
    energy: energy,
    breakdown: breakdown,
    sum: sum,
    fmt: fmt,
    gap: gap,
    wrap: wrap
  };
})();

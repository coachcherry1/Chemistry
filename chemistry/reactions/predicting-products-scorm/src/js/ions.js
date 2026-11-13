/* ions.js: the chemistry of this package. No DOM.
 *
 * The class handout, as data: the reactivity series of the metals (most
 * active first, each with the ion it forms) with hydrogen in its place, the
 * halogens, and the solubility table. Everything else is worked out from
 * them:
 *
 *   Ions.formula(cat, an)       'Al' + 'SO4' -> 'Al2(SO4)3' (charges crossed, lowest ratio)
 *   Ions.name(formula)          'aluminum sulfate'
 *   Ions.soluble(cat, an)       by the handout's rules
 *   Ions.replaces(a, b)         is a above b in its series?
 *   Ions.single(el, compound)   products of a single replacement, or none
 *   Ions.double(f1, f2)         products of a double replacement and which are solids
 *
 * Rx (name, tree) is what bench.js and particles.js ask for: every formula
 * that can appear gets a name and a particle drawing built from its ions.
 *
 * The handout was corrected at the teacher's request (November 2026): the
 * series follows the standard reduction potentials and says which metals
 * react with cold water, with steam and with acids; the solubility rules name
 * the group 1 ions, bromide, iodide and the mercury(I) exceptions, and mark
 * the slightly soluble compounds. The halogens are F2 > Cl2 > Br2 > I2. The
 * printed sheet (../reference-sheet/) is drawn from this same data.
 */
var Ions = (function () {
  'use strict';

  /* key: [symbol or formula, charge, name] */
  var CATIONS = {
    H: ['H', 1, 'hydrogen'], Li: ['Li', 1, 'lithium'], Na: ['Na', 1, 'sodium'], K: ['K', 1, 'potassium'], NH4: ['NH4', 1, 'ammonium'], Ag: ['Ag', 1, 'silver'],
    Mg: ['Mg', 2, 'magnesium'], Ca: ['Ca', 2, 'calcium'], Sr: ['Sr', 2, 'strontium'], Ba: ['Ba', 2, 'barium'], Zn: ['Zn', 2, 'zinc'],
    Fe: ['Fe', 2, 'iron(II)'], Pb: ['Pb', 2, 'lead(II)'], Cu: ['Cu', 2, 'copper(II)'], Al: ['Al', 3, 'aluminum']
  };
  var ANIONS = {
    Cl: ['Cl', 1, 'chloride'], Br: ['Br', 1, 'bromide'], I: ['I', 1, 'iodide'], NO3: ['NO3', 1, 'nitrate'], OH: ['OH', 1, 'hydroxide'],
    C2H3O2: ['C2H3O2', 1, 'acetate'], SO4: ['SO4', 2, 'sulfate'], CO3: ['CO3', 2, 'carbonate'], S: ['S', 2, 'sulfide'], PO4: ['PO4', 3, 'phosphate']
  };
  /* compounds of H+: the acids, and water written HOH (a hydrogen and a hydroxide, as the teacher writes it) */
  var ACIDS = { Cl: 'hydrochloric acid', Br: 'hydrobromic acid', SO4: 'sulfuric acid', NO3: 'nitric acid', OH: 'water' };

  /* The activity series, most active first: [symbol, name, charge of its ion].
     The class handout's series in the order of the standard reduction
     potentials (the handout had Rb, K, Cs; by the data it is Cs, Rb, K), with
     what each metal replaces hydrogen from:
       cold water   Li to Na      (and steam, and acids)
       steam        Mg to Cd      (and acids)
       acids        Co to Pb
       nothing      Cu to Au */
  var SERIES = [['Li', 'lithium', 1], ['Cs', 'cesium', 1], ['Rb', 'rubidium', 1], ['K', 'potassium', 1], ['Ba', 'barium', 2], ['Sr', 'strontium', 2],
    ['Ca', 'calcium', 2], ['Na', 'sodium', 1], ['Mg', 'magnesium', 2], ['Al', 'aluminum', 3], ['Mn', 'manganese', 2], ['Zn', 'zinc', 2], ['Cr', 'chromium', 3],
    ['Fe', 'iron', 2], ['Cd', 'cadmium', 2], ['Co', 'cobalt', 2], ['Ni', 'nickel', 2], ['Sn', 'tin', 2], ['Pb', 'lead', 2], ['H', 'hydrogen', 1],
    ['Cu', 'copper', 2], ['Ag', 'silver', 1], ['Hg', 'mercury', 2], ['Pt', 'platinum', 2], ['Au', 'gold', 3]];
  var TIERS = [
    { key: 'water', last: 'Na', label: 'react with cold water, with steam and with acids' },
    { key: 'steam', last: 'Cd', label: 'react with steam and with acids' },
    { key: 'acid', last: 'Pb', label: 'react with acids' },
    { key: 'none', last: 'Au', label: 'do not replace hydrogen' }
  ];
  var HALOGENS = [['F', 'fluorine'], ['Cl', 'chlorine'], ['Br', 'bromine'], ['I', 'iodine']];
  var HALIDE = { F: 'F', Cl: 'Cl', Br: 'Br', I: 'I' };
  /* elements as they are written alone, with their state at room temperature */
  var ELEMENT = { H: ['H2', 'g', 'hydrogen'], F: ['F2', 'g', 'fluorine'], Cl: ['Cl2', 'g', 'chlorine'], Br: ['Br2', 'l', 'bromine'], I: ['I2', 's', 'iodine'] };

  /* The solubility rules. G1: the group 1 ions. Each row: the negative ion,
     the positive ions that are the exception, and the positive ions whose
     compound is only SLIGHTLY soluble (neither clearly dissolved nor clearly a
     solid: those compounds are never used in a problem). Rows marked sheet
     are for the printed reference only: no problem uses those ions. */
  var G1 = ['Li', 'Na', 'K', 'Rb', 'Cs'];
  var TABLE = {
    always: G1.concat(['NH4']),
    soluble: [
      { an: 'NO3', not: [], slight: [] },
      { an: 'C2H3O2', not: [], slight: ['Ag'] },
      { an: 'ClO3', not: [], slight: [], sheet: true },
      { an: 'Cl', not: ['Ag', 'Hg2'], slight: ['Pb'] },
      { an: 'Br', not: ['Ag', 'Hg2'], slight: ['Pb'] },
      { an: 'I', not: ['Ag', 'Hg2', 'Pb'], slight: [] },
      { an: 'SO4', not: ['Ba', 'Sr', 'Pb', 'Hg2'], slight: ['Ca', 'Ag'] }
    ],
    insoluble: [
      { an: 'CO3', but: G1.concat(['NH4']), slight: [] },
      { an: 'PO4', but: G1.concat(['NH4']), slight: [] },
      { an: 'OH', but: G1.concat(['Ba']), slight: ['Ca', 'Sr'] },
      { an: 'S', but: G1.concat(['NH4', 'Ca', 'Sr', 'Ba']), slight: [] },
      { an: 'SO3', but: G1.concat(['NH4']), slight: [], sheet: true },
      { an: 'CrO4', but: G1.concat(['NH4', 'Mg']), slight: ['Ca'], sheet: true },
      { an: 'SiO3', but: G1, slight: [], sheet: true },
      { an: 'O', but: G1.concat(['Ca', 'Sr', 'Ba']), slight: [], sheet: true, note: 'these oxides react with water and form hydroxides' }
    ]
  };
  /* ions that are only on the reference: [formula, charge, name] */
  var SHEET_IONS = { Hg2: ['Hg2', 2, 'mercury(I)'], Rb: ['Rb', 1, 'rubidium'], Cs: ['Cs', 1, 'cesium'], ClO3: ['ClO3', 1, 'chlorate'], SO3: ['SO3', 2, 'sulfite'],
    CrO4: ['CrO4', 2, 'chromate'], SiO3: ['SiO3', 2, 'silicate'], O: ['O', 2, 'oxide'] };
  function row(an) {
    var i;
    for (i = 0; i < TABLE.soluble.length; i++) if (TABLE.soluble[i].an === an) return { r: TABLE.soluble[i], soluble: true };
    for (i = 0; i < TABLE.insoluble.length; i++) if (TABLE.insoluble[i].an === an) return { r: TABLE.insoluble[i], soluble: false };
    throw new Error('no solubility rule for ' + an);
  }
  /* Pairs never used, as a reactant or as a product: the compound is slightly
     soluble (the rules give no clear answer), reacts with water, or does not
     exist. H is handled apart (acids and water). */
  var AVOID = ['Ca SO4', 'Ag SO4', 'Ca OH', 'Sr OH', 'Ag OH', 'NH4 OH', 'Pb Cl', 'Pb Br', 'Cu I', 'Al CO3', 'Al S', 'Mg S', 'Ca S', 'Ba S', 'Sr S',
    'Ag C2H3O2', 'Mg C2H3O2', 'Sr C2H3O2', 'Al C2H3O2', 'Zn C2H3O2', 'Fe C2H3O2', 'Cu C2H3O2', 'Li CO3', 'Li PO4', 'Li OH', 'Li S', 'Li C2H3O2'];

  function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
  function usable(cat, an) { return AVOID.indexOf(cat + ' ' + an) < 0; }

  /* how many of each ion: charges crossed, lowest ratio */
  function ratio(cat, an) {
    var qc = CATIONS[cat][1], qa = ANIONS[an][1], g = gcd(qc, qa);
    return [qa / g, qc / g];
  }
  function part(sym, n) {
    var poly = /[A-Z].*[A-Z]|\d/.test(sym);
    return n === 1 ? sym : poly ? '(' + sym + ')' + n : sym + n;
  }
  function formula(cat, an) {
    var r = ratio(cat, an);
    return part(CATIONS[cat][0], r[0]) + part(ANIONS[an][0], r[1]);
  }
  /* any formula with these subscripts, right or wrong (for what a student builds) */
  function written(cat, an, a, b) { return part(CATIONS[cat][0], a) + part(ANIONS[an][0], b); }

  function soluble(cat, an) {
    if (cat === 'H') return true;
    if (TABLE.always.indexOf(cat) >= 0) return true;
    var x = row(an);
    return x.soluble ? x.r.not.indexOf(cat) < 0 : x.r.but.indexOf(cat) >= 0;
  }
  function slight(cat, an) { return row(an).r.slight.indexOf(cat) >= 0; }

  /* ---- every compound that can appear: formula -> { cat, an } */
  var BY = {};
  Object.keys(CATIONS).forEach(function (c) {
    Object.keys(ANIONS).forEach(function (a) {
      if (c === 'H' ? !ACIDS[a] : !usable(c, a)) return;
      BY[formula(c, a)] = { cat: c, an: a };
    });
  });
  function parts(f) { return BY[f] || null; }

  function elementOf(sym) { return ELEMENT[sym] ? ELEMENT[sym][0] : sym; }
  function isElement(f) { return !BY[f]; }
  function symOf(f) { return f.replace(/2$/, ''); }

  function name(f) {
    var p = BY[f];
    if (p) return p.cat === 'H' ? ACIDS[p.an] : CATIONS[p.cat][2] + ' ' + ANIONS[p.an][2];
    var sym = symOf(f);
    if (ELEMENT[sym]) return ELEMENT[sym][2];
    var row = SERIES.filter(function (x) { return x[0] === sym; })[0];
    return row ? row[1] : f;
  }
  function state(f) {
    var p = BY[f];
    if (f === 'HOH') return 'l';
    if (p) return soluble(p.cat, p.an) ? 'aq' : 's';
    var sym = symOf(f);
    return ELEMENT[sym] ? ELEMENT[sym][1] : 's';
  }

  /* ---- the series */
  function rank(sym) { for (var i = 0; i < SERIES.length; i++) if (SERIES[i][0] === sym) return i; return -1; }
  function tier(sym) {
    var r = rank(sym);
    for (var i = 0; i < TIERS.length; i++) if (r <= rank(TIERS[i].last)) return TIERS[i].key;
    return 'none';
  }
  function hrank(sym) { for (var i = 0; i < HALOGENS.length; i++) if (HALOGENS[i][0] === sym) return i; return -1; }
  /* does element a replace element b from a compound? null if they are not in the same series */
  function replaces(a, b) {
    if (rank(a) >= 0 && rank(b) >= 0) return rank(a) < rank(b);
    if (hrank(a) >= 0 && hrank(b) >= 0) return hrank(a) < hrank(b);
    return null;
  }

  /* ---- single replacement: el is the lone element's symbol ('Zn', 'Cl'), f the compound.
     { kind: 'metal' | 'acid' | 'halogen', out: symbol pushed out, reacts, products: [compound, element] } */
  function single(el, f) {
    var p = BY[f], kind, out, comp, reacts;
    if (hrank(el) >= 0) { kind = 'halogen'; out = p.an; comp = formula(p.cat, HALIDE[el]); reacts = replaces(el, out); }
    else {
      kind = p.cat !== 'H' ? 'metal' : p.an === 'OH' ? 'water' : 'acid';
      out = p.cat; comp = formula(el, p.an);
      /* only the metals down to sodium replace the hydrogen of cold water */
      reacts = kind === 'water' ? tier(el) === 'water' : replaces(el, out);
    }
    return { kind: kind, el: el, out: out, reacts: reacts, products: [comp, elementOf(out)] };
  }
  /* ---- double replacement: the positive ions trade partners */
  function double(f1, f2) {
    var a = BY[f1], b = BY[f2];
    var prods = [formula(a.cat, b.an), formula(b.cat, a.an)];
    var solids = prods.filter(function (f) { return state(f) === 's'; });
    return { products: prods, solids: solids, reacts: solids.length > 0 };
  }

  /* ---- particle drawings: a tree (which atom touches which) built from the ions */
  function ionGraph(key, isCat, nodes) {
    function add(el) { nodes.push({ el: el, nb: [] }); return nodes.length - 1; }
    function bond(i, j) { nodes[i].nb.push(j); nodes[j].nb.push(i); }
    var c, k, hs, os = [];
    if (key === 'NH4') {
      c = add('N'); hs = [];
      for (k = 0; k < 4; k++) { hs.push(add('H')); bond(c, hs[k]); }
      return function () { return hs[0]; };
    }
    if (key === 'OH') { c = add('O'); k = add('H'); bond(c, k); return function () { return c; }; }
    if (key === 'C2H3O2') {
      c = add('C'); var m = add('C'); bond(c, m);
      for (k = 0; k < 3; k++) bond(m, add('H'));
      os = [add('O'), add('O')]; bond(c, os[0]); bond(c, os[1]);
      return function () { return os[1]; };
    }
    var oxy = /^([A-Z][a-z]?)O(\d)$/.exec(key);
    if (oxy && !isCat) {
      c = add(oxy[1]);
      for (k = 0; k < +oxy[2]; k++) { os.push(add('O')); bond(c, os[k]); }
      return function (i) { return os[i % os.length]; };
    }
    c = add(key);
    return function () { return c; };
  }
  function tree(f) {
    var p = BY[f];
    if (!p) { var sym = symOf(f); return /2$/.test(f) ? sym + '(' + sym + ')' : sym; }
    var r = ratio(p.cat, p.an), a = r[0], b = r[1], nodes = [], i;
    function bond(x, y) { nodes[x].nb.push(y); nodes[y].nb.push(x); }
    var cats = [], ans = [];
    for (i = 0; i < a; i++) cats.push({ at: ionGraph(p.cat, true, nodes), n: 0 });
    for (i = 0; i < b; i++) ans.push({ at: ionGraph(p.an, false, nodes), n: 0 });
    function join(c, x) { bond(c.at(c.n++), x.at(x.n++)); }
    if (b === 1) cats.forEach(function (c) { join(c, ans[0]); });
    else if (a === 1) ans.forEach(function (x) { join(cats[0], x); });
    else {
      /* a chain, the more numerous ion at both ends */
      var big = a > b ? cats : ans, small = a > b ? ans : cats;
      small.forEach(function (s, k) { if (a > b) { join(big[k], s); join(big[k + 1], s); } else { join(s, big[k]); join(s, big[k + 1]); } });
    }
    /* write it out from the heaviest ion's first atom */
    var seen = {};
    function out(n) {
      seen[n] = 1;
      return nodes[n].el + nodes[n].nb.filter(function (m) { return !seen[m]; }).map(function (m) { return seen[m] ? '' : '(' + out(m) + ')'; }).join('');
    }
    var root = 0;
    nodes.forEach(function (nd, k) { if (nd.nb.length > nodes[root].nb.length) root = k; });
    return out(root);
  }

  return { G1: G1, TIERS: TIERS, tier: tier, SHEET_IONS: SHEET_IONS, row: row, slight: slight, CATIONS: CATIONS, ANIONS: ANIONS, ACIDS: ACIDS, SERIES: SERIES, HALOGENS: HALOGENS, ELEMENT: ELEMENT, TABLE: TABLE, AVOID: AVOID, BY: BY,
           usable: usable, ratio: ratio, formula: formula, written: written, soluble: soluble, parts: parts, name: name, state: state, tree: tree,
           isElement: isElement, elementOf: elementOf, symOf: symOf, rank: rank, hrank: hrank, replaces: replaces, single: single, double: double };
})();

/* what bench.js and particles.js ask for */
var Rx = {
  name: function (f) { return Ions.name(f); },
  tree: function (f) { return Ions.tree(f); },
  get: function () { return null; }
};

if (typeof module !== 'undefined') module.exports = { Ions: Ions, Rx: Rx };

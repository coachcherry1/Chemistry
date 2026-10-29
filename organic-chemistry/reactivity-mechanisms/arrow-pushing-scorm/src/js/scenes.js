/* scenes.js: every reaction step in the activity, written down once.
 *
 * A scene is the drawing before a step (atoms placed as in Klein, the
 * electrons counted by chem.js from each atom's charge), the curved arrows
 * that make the step happen, and where the atoms sit afterwards (drawing
 * only). The product is never written here: it is what the arrows make
 * (Chem.apply). Two things are written for tools/validate.js to check
 * against: the product as SMILES, and Klein's name for the pattern.
 *
 * Arrow shorthand: 'lp:X' a lone pair on X, 'b:X-Y' the X-Y bond, a bare
 * id an atom.
 *
 * Steps that follow one another (Klein's Figure 6.31, a hydrolysis) are a
 * chain: each step starts from the drawing the step before ended with.
 */

var SCENES = (function () {
  'use strict';

  var K = Chem.keys;
  var S = {};

  function key(s) {
    if (s.indexOf('lp:') === 0) return s;
    if (s.indexOf('b:') === 0) { var p = s.slice(2).split('-'); return K.bond(p[0], p[1]); }
    return K.atom(s);
  }
  function arrowsOf(list) { return (list || []).map(function (a) { return { from: key(a[0]), to: key(a[1]) }; }); }

  /* Finish a scene from its before-state and step spec. */
  function finish(id, before, sp) {
    var arrows = arrowsOf(sp.arrows);
    var sc = { id: id, title: sp.title || '', before: before, arrows: arrows, smiles: sp.product, klein: sp.klein,
               who: sp.who || {}, note: sp.note || '', role: sp.role || null, hint: sp.hint || null, label: sp.label || '' };
    if (arrows.length) {
      var r = Chem.apply(before, arrows);
      if (r.err) throw new Error('Scene ' + id + ': its own arrows break a rule (' + r.err + ')');
      var pick = r.all[0];
      if (sp.product) {
        var hit = r.all.filter(function (x) { return Chem.matches(x.state, sp.product); })[0];
        if (hit) pick = hit;
      }
      sc.picks = pick.picks;
      sc.after = Chem.arrange(pick.state, sp.moves, sp.after);
      sc.patterns = Chem.classify(before, pick.state);
    } else {
      sc.after = before;
      sc.patterns = [];
    }
    S[id] = sc;
    return sc;
  }

  function def(id, sp) { return finish(id, Chem.build(sp), sp); }

  /* A chain of steps: ids id1, id2, ... */
  function chain(id, first, steps) {
    var st = Chem.build(first);
    var out = [];
    steps.forEach(function (sp, k) {
      if (k === 0) sp.who = Object.assign({}, first.who || {}, sp.who || {});
      else sp.who = Object.assign({}, out[k - 1].who, sp.who || {});
      var sc = finish(id + (k + 1), st, sp);
      sc.chain = id; sc.n = k + 1;
      out.push(sc);
      st = sc.after;
    });
    S[id] = out;
    return out;
  }

  /* A before and after with no arrows (Part 1: bonds broken and formed).
     set: [[a, b, order]] the bonds afterwards; the lone pairs follow so
     that every atom stays neutral. */
  function swap(id, sp) {
    var before = Chem.build(sp);
    var after = Chem.clone(before);
    sp.set.forEach(function (x) {
      var b = Chem.bond(after, x[0], x[1]);
      if (b) b.o = x[2];
      else after.bonds.push({ a: x[0], b: x[1], o: x[2] });
    });
    after.bonds = after.bonds.filter(function (b) { return b.o > 0; });
    after.atoms.forEach(function (a) {
      var s = Chem.neighbours(after, a.id).reduce(function (t, n) { return t + n.o; }, 0);
      a.lp = (Chem.VE[a.el] - s - a.h) / 2;
    });
    after = Chem.arrange(after, sp.moves, sp.after);
    S[id] = { id: id, before: before, after: after, smiles: sp.product, bde: sp.bde, title: sp.title, who: sp.who || {}, kleinH: sp.kleinH };
    return S[id];
  }

  /* Hexagon and pentagon corners, side 1, first corner at angle a0. */
  function ringAt(cx, cy, n, a0) {
    var r = 1 / (2 * Math.sin(Math.PI / n));
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = (a0 + i * 360 / n) * Math.PI / 180;
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return out;
  }

  var HEX = ringAt(0, 0, 6, 90);
  var PENT = ringAt(0, 0, 5, 90);

  /* =========================================================== Part 1 */

  /* Klein SkillBuilder 6.1: (CH3)3C-H + Cl2 -> (CH3)3C-Cl + HCl, ΔH° = -138 kJ/mol */
  swap('bdeA', {
    title: '2-Methylpropane and chlorine',
    atoms: [['C', 'C', [0, 0]], ['M1', 'C', ['C', 180]], ['M2', 'C', ['C', 0]], ['M3', 'C', ['C', 270]], ['H', 'H', ['C', 90]],
            ['Cl1', 'Cl', [1.9, 1.6]], ['Cl2', 'Cl', ['Cl1', 0]]],
    set: [['C', 'H', 0], ['Cl1', 'Cl2', 0], ['C', 'Cl1', 1], ['H', 'Cl2', 1]],
    after: { Cl1: ['C', 90], H: [2.2, 0.5], Cl2: ['H', 0] },
    product: 'CC(C)(C)Cl.Cl',
    bde: { 'C-H': 381, 'Cl1-Cl2': 243, 'C-Cl1': 331, 'Cl2-H': 431 },
    kleinH: -138
  });

  /* Klein Practice 6.1(b): (CH3)3C-Cl + H2O -> (CH3)3C-OH + HCl, ΔH° = +17 kJ/mol */
  swap('bdeB', {
    title: '2-Chloro-2-methylpropane and water',
    atoms: [['C', 'C', [0, 0]], ['M1', 'C', ['C', 180]], ['M2', 'C', ['C', 0]], ['M3', 'C', ['C', 270]], ['Cl', 'Cl', ['C', 90]],
            ['O', 'O', [2.2, 1.4]], ['H1', 'H', ['O', 150]], ['H2', 'H', ['O', 30]]],
    set: [['C', 'Cl', 0], ['O', 'H1', 0], ['C', 'O', 1], ['Cl', 'H1', 1]],
    after: { O: ['C', 90], H2: ['O', 30], H1: [2.3, 0.6], Cl: ['H1', 0] },
    product: 'CC(C)(C)O.Cl',
    bde: { 'C-Cl': 331, 'H1-O': 498, 'C-O': 381, 'Cl-H1': 431 },
    kleinH: 17
  });

  /* Klein 6.3(a): a diene and an alkene make a ring (two molecules, one) */
  swap('da', {
    title: 'Butadiene and ethylene make cyclohexene',
    atoms: [['C1', 'C', HEX[0]], ['C2', 'C', HEX[1]], ['C3', 'C', HEX[2]], ['C4', 'C', HEX[3]],
            ['C5', 'C', [HEX[4][0] + 1.3, HEX[4][1]]], ['C6', 'C', [HEX[5][0] + 1.3, HEX[5][1]]]],
    bonds: [['C1', 'C2', 2], ['C2', 'C3'], ['C3', 'C4', 2], ['C5', 'C6', 2]],
    set: [['C1', 'C2', 1], ['C2', 'C3', 2], ['C3', 'C4', 1], ['C5', 'C6', 1], ['C4', 'C5', 1], ['C6', 'C1', 1]],
    after: { C5: HEX[4], C6: HEX[5] },
    product: 'C1=CCCCC1'
  });

  /* Klein Figure 6.22: Cl⁻ + CH3Br, one step */
  def('f622', {
    title: 'Chloride and bromomethane',
    atoms: [['C', 'C', [0, 0], { label: 'C', h: 1 }], ['Br', 'Br', ['C', 180]], ['H1', 'H', ['C', 70]], ['H2', 'H', ['C', 290]],
            ['Cl', 'Cl', [2.5, 0], { c: -1 }]],
    arrows: [['lp:Cl', 'C'], ['b:Br-C', 'Br']],
    moves: [['Br', -1.3, 0]],
    after: { Cl: ['C', 0], H1: ['C', 110], H2: ['C', 250] },
    product: 'CCl.[Br-]', klein: ['nuc', 'lg'],
    who: { Cl: 'chloride', C: 'the carbon', Br: 'Br' }
  });

  /* Klein Figure 6.23: (CH3)3C-Br + Cl⁻, two steps through a carbocation */
  chain('f623', {
    atoms: [['C', 'C', [0, 0]], ['Br', 'Br', ['C', 90]], ['M1', 'C', ['C', 180]], ['M2', 'C', ['C', 0]], ['M3', 'C', ['C', 270]],
            ['Cl', 'Cl', [-2.4, 1.3], { c: -1 }]],
    who: { Cl: 'chloride', C: 'the carbon', Br: 'Br' }
  }, [
    { title: 'Loss of a leaving group', arrows: [['b:Br-C', 'Br']], after: { Br: [2.5, 1.2], M1: ['C', 150], M2: ['C', 30] },
      product: 'C[C+](C)C.[Br-].[Cl-]', klein: ['lg'] },
    { title: 'Nucleophilic attack', arrows: [['lp:Cl', 'C']], after: { Cl: ['C', 90] },
      product: 'CC(C)(C)Cl.[Br-]', klein: ['nuc'] }
  ]);

  /* =========================================================== Part 2 */

  def('ch3cl', { title: 'Chloromethane', atoms: [['C', 'C', [0, 0], { label: 'C' }], ['X', 'Cl', ['C', 90]],
    ['H1', 'H', ['C', 210]], ['H2', 'H', ['C', 330]], ['H3', 'H', ['C', 270]]] });
  def('ch3li', { title: 'Methyllithium', atoms: [['C', 'C', [0, 0], { label: 'C' }], ['X', 'Li', ['C', 90]],
    ['H1', 'H', ['C', 210]], ['H2', 'H', ['C', 330]], ['H3', 'H', ['C', 270]]] });

  /* Klein SkillBuilder 6.2: one nucleophilic centre, two electrophilic */
  def('sb62', {
    title: '7-Chloro-1-hydroxy-4,4-dimethylheptan-3-one',
    atoms: [['O1', 'O', [0, 0], { label: 'HO' }], ['C1', 'C', ['O1', 330]], ['C2', 'C', ['C1', 30]], ['C3', 'C', ['C2', 330]],
            ['O2', 'O', ['C3', 270], { o: 2 }], ['C4', 'C', ['C3', 30]], ['M1', 'C', ['C4', 120]], ['M2', 'C', ['C4', 60]],
            ['C5', 'C', ['C4', 330]], ['C6', 'C', ['C5', 30]], ['C7', 'C', ['C6', 330]], ['Cl', 'Cl', ['C7', 30]]],
  });

  /* Klein 6.9: reacts with itself */
  def('p69', {
    title: '5-Bromopentan-1-ol',
    atoms: [['O', 'O', [0, 0], { label: 'HO' }], ['C1', 'C', ['O', 330]], ['C2', 'C', ['C1', 30]], ['C3', 'C', ['C2', 330]],
            ['C4', 'C', ['C3', 30]], ['C5', 'C', ['C4', 330]], ['Br', 'Br', ['C5', 30]]]
  });

  /* An alkene and an alkyl halide in one */
  def('bromobutene', {
    title: '4-Bromobut-1-ene',
    atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 330], { o: 2 }], ['C3', 'C', ['C2', 30]], ['C4', 'C', ['C3', 330]], ['Br', 'Br', ['C4', 30]]]
  });

  /* Klein 6.8 and Table 6.3: cards to sort */
  def('k8a', { title: '2-Bromopropane', atoms: [['C2', 'C', [0, 0]], ['C1', 'C', ['C2', 210]], ['C3', 'C', ['C2', 330]], ['Br', 'Br', ['C2', 90]]] });
  def('k8b', { title: 'Cyclopentanol', atoms: PENT.map(function (p, i) { return ['R' + i, 'C', p]; }).concat([['O', 'O', ['R0', 90], { label: 'OH' }]]),
    bonds: [['R0', 'R1'], ['R1', 'R2'], ['R2', 'R3'], ['R3', 'R4'], ['R4', 'R0']] });
  def('k8c', { title: 'Cyclopentanone', atoms: PENT.map(function (p, i) { return ['R' + i, 'C', p]; }).concat([['O', 'O', ['R0', 90], { o: 2 }]]),
    bonds: [['R0', 'R1'], ['R1', 'R2'], ['R2', 'R3'], ['R3', 'R4'], ['R4', 'R0']] });
  def('k8d', { title: 'Cyclohexene', atoms: HEX.map(function (p, i) { return ['R' + i, 'C', p]; }),
    bonds: [['R0', 'R1', 2], ['R1', 'R2'], ['R2', 'R3'], ['R3', 'R4'], ['R4', 'R5'], ['R5', 'R0']] });
  def('k8e', { title: 'A carbocation', atoms: [['C2', 'C', [0, 0], { c: 1 }], ['C1', 'C', ['C2', 210]], ['C3', 'C', ['C2', 330]]] });
  def('k8f', { title: 'An alkoxide ion', atoms: [['C2', 'C', [0, 0]], ['C1', 'C', ['C2', 210]], ['C3', 'C', ['C2', 330]], ['O', 'O', ['C2', 90], { c: -1 }]] });
  def('k8g', { title: 'NaBr', label: 'NaBr: the bromide ion, Br⁻', atoms: [['X', 'Br', [0, 0], { c: -1 }]] });
  def('k8h', { title: 'LiOH', label: 'LiOH: the hydroxide ion, HO⁻', atoms: [['O', 'O', [0, 0], { c: -1, label: 'HO' }]] });
  def('k8i', { title: 'CH₃I', atoms: [['C', 'C', [0, 0], { label: 'H₃C' }], ['X', 'I', ['C', 0]]] });
  def('k8j', { title: 'KOC(CH₃)₃', label: 'KOC(CH₃)₃: the tert-butoxide ion', atoms: [['C', 'C', [0, 0]], ['M1', 'C', ['C', 180]], ['M2', 'C', ['C', 0]],
    ['M3', 'C', ['C', 270]], ['O', 'O', ['C', 90], { c: -1 }]] });
  def('kWater', { title: 'Water', atoms: [['O', 'O', [0, 0]], ['H1', 'H', ['O', 210]], ['H2', 'H', ['O', 330]]] });
  def('kMeOH', { title: 'Methanol', atoms: [['C', 'C', [0, 0], { label: 'H₃C' }], ['O', 'O', ['C', 0], { label: 'OH' }]] });
  def('kHS', { title: 'NaSH', label: 'NaSH: the hydrosulfide ion, HS⁻', atoms: [['S', 'S', [0, 0], { c: -1, label: 'HS' }]] });
  def('kAcetone', { title: 'Acetone', atoms: [['C', 'C', [0, 0]], ['O', 'O', ['C', 90], { o: 2 }], ['M1', 'C', ['C', 210]], ['M2', 'C', ['C', 330]]] });

  /* the four carbocations, least to most stable */
  def('cat0', { title: 'Methyl', atoms: [['C', 'C', [0, 0], { c: 1, label: 'CH₃' }]] });
  def('cat1', { title: 'Primary (1°)', atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 30], { c: 1 }]] });
  def('cat2', { title: 'Secondary (2°)', atoms: [['C2', 'C', [0, 0], { c: 1 }], ['C1', 'C', ['C2', 210]], ['C3', 'C', ['C2', 330]]] });
  def('cat3', { title: 'Tertiary (3°)', atoms: [['C', 'C', [0, 0], { c: 1 }], ['M1', 'C', ['C', 90]], ['M2', 'C', ['C', 210]], ['M3', 'C', ['C', 330]]] });

  /* =========================================================== Part 3 */

  /* Klein 6.8: B⁻ + H-A, read the arrows */
  def('demoPT', {
    title: 'Hydroxide and HCl',
    atoms: [['H', 'H', [0, 0]], ['Cl', 'Cl', ['H', 0]], ['O', 'O', [-2.0, 0.3], { c: -1, label: 'HO' }]],
    arrows: [['lp:O', 'H'], ['b:Cl-H', 'Cl']],
    moves: [['Cl', 0.7, 0]],
    after: { H: ['O', 0] },
    product: 'O.[Cl-]', klein: ['pt'],
    who: { O: 'the O of hydroxide', H: 'the H of HCl', Cl: 'Cl' }
  });

  /* Nucleophilic attack (Klein 6.8) */
  def('brAttack', {
    title: 'Bromide and a carbocation',
    atoms: [['C', 'C', [0, 0], { c: 1 }], ['M1', 'C', ['C', 90]], ['M2', 'C', ['C', 210]], ['M3', 'C', ['C', 330]],
            ['Br', 'Br', [-2.6, 0.3], { c: -1 }]],
    arrows: [['lp:Br', 'C']],
    after: { Br: ['C', 180], M3: ['C', 0], M2: ['C', 270] },
    product: 'CC(C)(C)Br', klein: ['nuc'],
    who: { C: 'the carbocation', Br: 'bromide' },
    role: { nuc: 'Br', elec: 'C' }
  });

  def('acylAttack', {
    title: 'Methanol and acetyl chloride',
    atoms: [['C', 'C', [0, 0]], ['O', 'O', ['C', 90], { o: 2 }], ['Me', 'C', ['C', 210]], ['Cl', 'Cl', ['C', 330]],
            ['Om', 'O', [-2.2, -1.5]], ['Rm', 'C', ['Om', 180], { label: 'H₃C' }], ['Hm', 'H', ['Om', 0]]],
    arrows: [['lp:Om', 'C'], ['b:C-O', 'O']],
    after: { Me: ['C', 180], Cl: ['C', 0], Om: ['C', 270], Rm: ['Om', 210], Hm: ['Om', 330] },
    product: 'CC([O-])(Cl)[OH+]C', klein: ['nuc'],
    who: { Om: 'the O of methanol', C: 'the C of the C=O', O: 'the O of the C=O' },
    role: { nuc: 'Om', elec: 'C' },
    hint: 'Two arrows: the O of methanol attacks the C of the C=O, and the pi bond’s pair moves up onto the O, so that carbon never has five bonds.'
  });

  /* Loss of a leaving group */
  def('brLoss', {
    title: '2-Bromo-2-methylpropane',
    atoms: [['C', 'C', [0, 0]], ['Br', 'Br', ['C', 90]], ['M1', 'C', ['C', 180]], ['M2', 'C', ['C', 0]], ['M3', 'C', ['C', 270]]],
    arrows: [['b:Br-C', 'Br']],
    after: { Br: [2.5, 1.2], M1: ['C', 150], M2: ['C', 30] },
    product: 'C[C+](C)C.[Br-]', klein: ['lg'],
    who: { C: 'the carbon', Br: 'Br' }
  });

  def('tetLoss', {
    title: 'A tetrahedral intermediate',
    atoms: [['C', 'C', [0, 0]], ['O', 'O', ['C', 90], { c: -1 }], ['Me', 'C', ['C', 180]], ['Cl', 'Cl', ['C', 0]],
            ['Oh', 'O', ['C', 270], { label: 'OH' }]],
    arrows: [['lp:O', 'b:C-O'], ['b:C-Cl', 'Cl']],
    after: { Cl: [2.6, 0.4], Me: ['C', 210], Oh: ['C', 330] },
    product: 'CC(=O)O.[Cl-]', klein: ['lg'],
    who: { O: 'the O⁻', C: 'the central carbon', Cl: 'Cl' },
    hint: 'Two arrows: a lone pair of the O⁻ comes down to make the C=O pi bond, and that pushes out the leaving group: the C–Cl pair goes onto Cl.'
  });

  /* Proton transfers */
  def('protKetone', {
    title: 'Acetone and H₃O⁺',
    atoms: [['C', 'C', [0, 0]], ['O', 'O', ['C', 90], { o: 2 }], ['M1', 'C', ['C', 210]], ['M2', 'C', ['C', 330]],
            ['Ow', 'O', [2.6, 1.1], { c: 1 }], ['H1', 'H', ['Ow', 180]], ['H2', 'H', ['Ow', 60]], ['H3', 'H', ['Ow', 300]]],
    arrows: [['lp:O', 'H1'], ['b:H1-Ow', 'Ow']],
    moves: [['Ow H2 H3', 0.9, 0.1]],
    after: { H1: ['O', 30] },
    product: 'CC(C)=[OH+].O', klein: ['pt'],
    who: { O: 'the O of acetone', H1: 'the H of H₃O⁺', Ow: 'the O of H₃O⁺' },
    hint: 'A proton transfer takes two arrows: one to the H, and one for the pair of the O–H bond the H leaves behind.'
  });

  def('deprotKetone', {
    title: 'Protonated acetone and water',
    atoms: [['C', 'C', [0, 0]], ['O', 'O', ['C', 90], { o: 2, c: 1 }], ['H1', 'H', ['O', 30]], ['M1', 'C', ['C', 210]], ['M2', 'C', ['C', 330]],
            ['Ow', 'O', [2.3, 1.3]], ['H2', 'H', ['Ow', 60]], ['H3', 'H', ['Ow', 300]]],
    arrows: [['lp:Ow', 'H1'], ['b:H1-O', 'O']],
    moves: [['Ow H2 H3', 0.6, 0.2]],
    after: { H1: ['Ow', 180] },
    product: 'CC(C)=O.[OH3+]', klein: ['pt'],
    who: { Ow: 'the O of water', H1: 'the H on the O⁺', O: 'the O of acetone' }
  });

  /* Klein SkillBuilder 6.5: the pi bond takes the proton */
  def('alkeneH3O', {
    title: '2-Methylbut-2-ene and H₃O⁺',
    atoms: [['C2', 'C', [0, 0]], ['C3', 'C', ['C2', 0], { o: 2 }], ['C1', 'C', ['C2', 150]], ['C5', 'C', ['C2', 210]], ['C4', 'C', ['C3', 300]],
            ['Ow', 'O', [2.0, 2.2], { c: 1 }], ['H1', 'H', ['Ow', 225]], ['H2', 'H', ['Ow', 90]], ['H3', 'H', ['Ow', 0]]],
    arrows: [['b:C2-C3', 'H1'], ['b:H1-Ow', 'Ow']],
    moves: [['Ow H2 H3', 0.8, 0.6]],
    after: { H1: ['C3', 60] },
    product: 'C[C+](C)CC.O', klein: ['pt'],
    who: { C2: 'C2', C3: 'C3', H1: 'the H of H₃O⁺', Ow: 'the O of H₃O⁺' },
    hint: 'The pi bond is the base here: its pair takes the H, which bonds to C3. The second arrow takes the O–H pair onto the O.'
  });

  /* Carbocation rearrangements (Klein Figure 6.32) */
  def('shiftH', {
    title: 'A hydride shift',
    atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 30], { c: 1 }], ['C3', 'C', ['C2', 330]], ['C4', 'C', ['C3', 30]],
            ['C5', 'C', ['C3', 270]], ['H', 'H', ['C3', 90]]],
    arrows: [['b:C3-H', 'C2']],
    after: { H: ['C2', 90] },
    product: 'CC[C+](C)C', klein: ['shift'],
    who: { C2: 'the carbocation (C2)', C3: 'C3', H: 'the H on C3' },
    hint: 'The H moves over with its bonding pair: the arrow starts on the C3–H bond and points at the carbocation.'
  });

  def('shiftMe', {
    title: 'A methyl shift',
    atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 30], { c: 1 }], ['C3', 'C', ['C2', 330]], ['C4', 'C', ['C3', 30]],
            ['C5', 'C', ['C3', 270]], ['C6', 'C', ['C3', 90], { label: 'CH₃' }]],
    arrows: [['b:C3-C6', 'C2']],
    after: { C6: ['C2', 90] },
    product: 'CC(C)[C+](C)C', klein: ['shift'],
    who: { C2: 'the carbocation (C2)', C3: 'C3', C6: 'the CH₃ on C3' },
    hint: 'The CH₃ moves over with its bonding pair: the arrow starts on the C3–CH₃ bond and points at the carbocation.'
  });

  /* Will it rearrange? (Klein SkillBuilder 6.6 and Practice 6.17) */
  def('r1', { title: '3-Methylbutan-2-yl cation', atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 30], { c: 1 }], ['C3', 'C', ['C2', 330]],
    ['C4', 'C', ['C3', 30]], ['C5', 'C', ['C3', 270]]] });
  def('r2', { title: '3,3-Dimethylbutan-2-yl cation', atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 30], { c: 1 }], ['C3', 'C', ['C2', 330]],
    ['C4', 'C', ['C3', 30]], ['C5', 'C', ['C3', 270]], ['C6', 'C', ['C3', 90], { label: 'CH₃' }]] });
  def('r3', { title: 'Pentan-2-yl cation', atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 30], { c: 1 }], ['C3', 'C', ['C2', 330]],
    ['C4', 'C', ['C3', 30]], ['C5', 'C', ['C4', 330]]] });
  def('r4', { title: 'tert-Butyl cation', atoms: [['C', 'C', [0, 0], { c: 1 }], ['M1', 'C', ['C', 90]], ['M2', 'C', ['C', 210]], ['M3', 'C', ['C', 330]]] });
  def('r5', { title: '2-Methylcyclohexyl cation', atoms: HEX.map(function (p, i) { return ['R' + i, 'C', p, i === 0 ? { c: 1 } : {}]; })
    .concat([['Me', 'C', ['R5', 30]]]),
    bonds: [['R0', 'R1'], ['R1', 'R2'], ['R2', 'R3'], ['R3', 'R4'], ['R4', 'R5'], ['R5', 'R0']] });
  def('r6', { title: '2,2-Dimethylcyclohexyl cation', atoms: HEX.map(function (p, i) { return ['R' + i, 'C', p, i === 0 ? { c: 1 } : {}]; })
    .concat([['Me1', 'C', ['R5', 60], { label: 'CH₃' }], ['Me2', 'C', ['R5', 0]]]),
    bonds: [['R0', 'R1'], ['R1', 'R2'], ['R2', 'R3'], ['R3', 'R4'], ['R4', 'R5'], ['R5', 'R0']] });
  def('r7', { title: 'Cyclohexyl cation', atoms: HEX.map(function (p, i) { return ['R' + i, 'C', p, i === 0 ? { c: 1 } : {}]; }),
    bonds: [['R0', 'R1'], ['R1', 'R2'], ['R2', 'R3'], ['R3', 'R4'], ['R4', 'R5'], ['R5', 'R0']] });
  /* Klein's answers (SkillBuilder 6.6, Practice 6.17): which shift, if any */
  var SHIFT_KLEIN = { r1: 'H', r2: 'CH3', r3: null, r4: null, r5: 'H', r6: 'CH3', r7: null };

  /* The shift a cation makes, as a scene to animate (null if none). */
  function shiftScene(id) {
    var base = S[id].before;
    var plus = base.atoms.filter(function (a) { return Chem.isCation(base, a.id); })[0].id;
    var b = Chem.bestShift(base, plus);
    if (!b) return null;
    var st = base, g = b.group;
    var from = Chem.atom(base, b.from), c = Chem.atom(base, plus);
    if (!g) {
      /* draw the H that moves, on the side away from the ring or chain */
      var nb = Chem.neighbours(base, b.from).map(function (n) { var a = Chem.atom(base, n.id); return Math.atan2(a.y - from.y, a.x - from.x); });
      var best = 0, bd = -1;
      for (var t = 0; t < 360; t += 15) {
        var r = t * Math.PI / 180;
        var d = Math.min.apply(null, nb.map(function (u) { var x = Math.abs(r - u) % (2 * Math.PI); return x > Math.PI ? 2 * Math.PI - x : x; }));
        if (d > bd + 1e-6) { bd = d; best = t; }
      }
      st = Chem.showH(base, b.from, 'Hs', best);
      g = 'Hs';
    }
    var ga = Chem.atom(st, g);
    var after = {};
    after[g] = [c.x + (ga.x - from.x), c.y + (ga.y - from.y)];
    return finish(id + 'shift', st, { title: S[id].title, arrows: [['b:' + b.from + '-' + g, plus]], after: after,
      klein: ['shift'], who: { } });
  }

  /* Read the arrows: name the pattern (Klein 6.11, 6.27, 6.15) */
  def('nAllylLoss', {
    title: 'An allylic chloride',
    atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 30]], ['C3', 'C', ['C2', 330], { o: 2 }], ['C4', 'C', ['C3', 30]], ['C5', 'C', ['C4', 330]],
            ['Cl', 'Cl', ['C4', 90]]],
    arrows: [['b:C4-Cl', 'Cl']], after: { Cl: [4.4, 1.2] },
    product: 'CC=C[CH+]C.[Cl-]', klein: ['lg'], who: { Cl: 'Cl', C4: 'C4' }
  });
  def('nAllylWater', {
    title: 'An allylic carbocation and water',
    atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 30]], ['C3', 'C', ['C2', 330], { o: 2 }], ['C4', 'C', ['C3', 30], { c: 1 }], ['C5', 'C', ['C4', 330]],
            ['O', 'O', ['C4', 90, 2.0], { nob: true }], ['H1', 'H', ['O', 30]], ['H2', 'H', ['O', 150]]],
    arrows: [['lp:O', 'C4']], moves: [['O H1 H2', 0, -1.0]],
    product: 'CC=CC(C)[OH2+]', klein: ['nuc'], who: { O: 'the O of water', C4: 'the carbocation' }
  });
  def('nAllylShift', {
    title: 'A carbocation next to a CH₂',
    atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 30], { c: 1 }], ['C3', 'C', ['C2', 330]], ['C4', 'C', ['C3', 30]], ['C5', 'C', ['C4', 330], { o: 2 }],
            ['C6', 'C', ['C5', 30]], ['H', 'H', ['C3', 270]]],
    arrows: [['b:C3-H', 'C2']], after: { H: ['C2', 90] },
    product: 'CC[CH+]C=CC', klein: ['shift'], who: { H: 'the H on C3', C2: 'the carbocation (C2)', C3: 'C3' }
  });
  def('nArenium', {
    title: 'An arenium ion and water',
    atoms: HEX.map(function (p, i) { return ['R' + i, 'C', p, i === 5 ? { c: 1 } : {}]; })
      .concat([['Hr', 'H', ['R0', 90]], ['O', 'O', [1.6, 2.4]], ['H1', 'H', ['O', 0]], ['H2', 'H', ['O', 90]]]),
    bonds: [['R0', 'R1'], ['R1', 'R2', 2], ['R2', 'R3'], ['R3', 'R4', 2], ['R4', 'R5'], ['R5', 'R0']],
    arrows: [['lp:O', 'Hr'], ['b:Hr-R0', 'b:R0-R5']], moves: [['O H1 H2', 0.5, 0.2]], after: { Hr: ['O', 180] },
    product: 'C1=CC=CC=C1.[OH3+]', klein: ['pt'], who: { O: 'the O of water', Hr: 'the H on the ring', R0: 'its carbon', R5: 'the carbocation' }
  });
  def('nCyclize', {
    title: 'An OH and a carbocation in one molecule',
    atoms: [['O', 'O', [0, 0]], ['Ho', 'H', ['O', 150]], ['Ca', 'C', ['O', 330]], ['Cb', 'C', ['Ca', 30]], ['Cc', 'C', ['Cb', 330]],
            ['Cd', 'C', ['Cc', 30]], ['Ce', 'C', ['Cd', 330], { c: 1 }], ['M1', 'C', ['Ce', 30]], ['M2', 'C', ['Ce', 270]]],
    arrows: [['lp:O', 'Ce']],
    /* afterwards the chain is drawn as the ring it has become: O at the left, the C(CH3)2 at the top */
    after: { O: [HEX[1][0] + 2.1, HEX[1][1]], Ca: [HEX[2][0] + 2.1, HEX[2][1]], Cb: [HEX[3][0] + 2.1, HEX[3][1]],
             Cc: [HEX[4][0] + 2.1, HEX[4][1]], Cd: [HEX[5][0] + 2.1, HEX[5][1]], Ce: [HEX[0][0] + 2.1, HEX[0][1]],
             Ho: ['O', 150], M1: ['Ce', 45], M2: ['Ce', 135] },
    product: 'CC1(C)CCCC[OH+]1', klein: ['nuc'], who: { O: 'the O of the OH', Ce: 'the carbocation' }
  });
  def('nTbuClLoss', {
    title: '2-Chloro-2-methylpropane',
    atoms: [['C', 'C', [0, 0]], ['Cl', 'Cl', ['C', 90]], ['M1', 'C', ['C', 180]], ['M2', 'C', ['C', 0]], ['M3', 'C', ['C', 270]]],
    arrows: [['b:C-Cl', 'Cl']], after: { Cl: [2.5, 1.2], M1: ['C', 150], M2: ['C', 30] },
    product: 'C[C+](C)C.[Cl-]', klein: ['lg'], who: { C: 'the carbon', Cl: 'Cl' }
  });
  def('nPhShift', {
    title: 'A carbocation beside a benzene ring',
    atoms: [['Ca', 'C', [0, 0], { c: 1 }], ['P1', 'C', ['Ca', 180]], ['P2', 'C', ['P1', 120], { o: 2 }], ['P3', 'C', ['P2', 180]],
            ['P4', 'C', ['P3', 240], { o: 2 }], ['P5', 'C', ['P4', 300]], ['P6', 'C', ['P5', 0], { o: 2 }],
            ['Cb', 'C', ['Ca', 60]], ['M1', 'C', ['Cb', 330], { label: 'CH₃' }], ['M2', 'C', ['Cb', 60]], ['M3', 'C', ['Cb', 150]]],
    bonds: [['P6', 'P1']],
    arrows: [['b:Cb-M1', 'Ca']], after: { M1: ['Ca', 300] },
    product: 'C[C+](C)C(C)C1=CC=CC=C1', klein: ['shift'], who: { M1: 'the CH₃', Ca: 'the carbocation', Cb: 'the carbon next to it' }
  });
  def('nWaterTbu', {
    title: 'A carbocation and water',
    atoms: [['C', 'C', [0, 0], { c: 1 }], ['M1', 'C', ['C', 90]], ['M2', 'C', ['C', 210]], ['M3', 'C', ['C', 330]],
            ['O', 'O', [-2.4, 0.4]], ['H1', 'H', ['O', 150]], ['H2', 'H', ['O', 210]]],
    arrows: [['lp:O', 'C']],
    after: { O: ['C', 180], H1: ['O', 120], H2: ['O', 240], M3: ['C', 0], M2: ['C', 270] },
    product: 'CC(C)(C)[OH2+]', klein: ['nuc'],
    who: { O: 'the O of water', C: 'the carbocation' }, role: { nuc: 'O', elec: 'C' }
  });
  def('nOxLoss', {
    title: 'A protonated alcohol',
    atoms: [['C', 'C', [0, 0]], ['O', 'O', ['C', 90], { c: 1 }], ['H1', 'H', ['O', 30]], ['H2', 'H', ['O', 150]],
            ['M1', 'C', ['C', 180]], ['M2', 'C', ['C', 0]], ['M3', 'C', ['C', 270]]],
    arrows: [['b:C-O', 'O']],
    moves: [['O H1 H2', 1.6, 0.6]], after: { M1: ['C', 150], M2: ['C', 30] },
    product: 'C[C+](C)C.O', klein: ['lg'],
    who: { O: 'the O⁺', C: 'the carbon' }
  });
  def('nOxDeprot', {
    title: 'A protonated alcohol and water',
    atoms: [['C', 'C', [0, 0]], ['O', 'O', ['C', 90], { c: 1 }], ['H1', 'H', ['O', 30]], ['H2', 'H', ['O', 150]],
            ['M1', 'C', ['C', 180]], ['M2', 'C', ['C', 0]], ['M3', 'C', ['C', 270]],
            ['Ow', 'O', [2.4, 2.2]], ['Hw1', 'H', ['Ow', 30]], ['Hw2', 'H', ['Ow', 90]]],
    arrows: [['lp:Ow', 'H1'], ['b:H1-O', 'O']],
    moves: [['Ow Hw1 Hw2', 0.5, 0.1]], after: { H1: ['Ow', 210] },
    product: 'CC(C)(C)O.[OH3+]', klein: ['pt'],
    who: { Ow: 'the O of water', H1: 'an H on the O⁺', O: 'the O⁺' }
  });

  /* Klein 6.10: which arrows break a rule? */
  def('wEthoxide', {
    title: 'Ethoxide and chloroethane',
    atoms: [['Oe', 'O', [0, 0], { c: -1 }], ['E1', 'C', ['Oe', 210]], ['E2', 'C', ['E1', 150]],
            ['C1', 'C', [1.9, 0.2]], ['C2', 'C', ['C1', 30]], ['Cl', 'Cl', ['C1', 270]]]
  });
  def('wPentene', {
    title: 'Pent-2-ene',
    atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 30]], ['C3', 'C', ['C2', 330], { o: 2 }], ['C4', 'C', ['C3', 30]], ['C5', 'C', ['C4', 330]]]
  });
  var RULES = [
    { id: 'rPlus', scene: 'brAttack', arrows: [['C', 'Br']], label: 'An arrow from the carbocation to bromide' },
    { id: 'rFive', scene: 'wEthoxide', arrows: [['lp:Oe', 'C1']], label: 'Ethoxide attacks the carbon of chloroethane' },
    { id: 'rGood', scene: 'wEthoxide', arrows: [['lp:Oe', 'C1'], ['b:C1-Cl', 'Cl']], label: 'Ethoxide attacks as chloride leaves' },
    { id: 'rWild', scene: 'wPentene', arrows: [['b:C2-C3', 'C4']], label: 'The pi bond swings to the next carbon' },
    { id: 'rHalf', scene: 'protKetone', arrows: [['lp:O', 'H1']], label: 'Acetone takes the H of H₃O⁺, one arrow' }
  ].map(function (r) { r.arrows = arrowsOf(r.arrows); return r; });

  /* =========================================================== Part 4 */

  /* Klein Figure 6.31: 3,3-dimethylbutan-2-ol and HBr, all four patterns */
  chain('f631', {
    atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 30]], ['C3', 'C', ['C2', 330]], ['C4', 'C', ['C3', 0]], ['C5', 'C', ['C3', 90], { label: 'CH₃' }],
            ['C6', 'C', ['C3', 270]], ['O', 'O', ['C2', 110]], ['Ho', 'H', ['O', 180]],
            ['Hb', 'H', [1.9, 2.4]], ['Br', 'Br', ['Hb', 0]]],
    who: { O: 'the O', Hb: 'the H of HBr', Br: 'Br', C2: 'C2', C3: 'C3', C5: 'the CH₃ on C3' }
  }, [
    { title: 'Proton transfer', arrows: [['lp:O', 'Hb'], ['b:Br-Hb', 'Br']], moves: [['Br', 0.6, 0]], after: { Hb: ['O', 30] },
      product: 'CC([OH2+])C(C)(C)C.[Br-]', klein: ['pt'] },
    { title: 'Loss of a leaving group', arrows: [['b:C2-O', 'O']], moves: [['O Ho Hb', -0.5, 1.1]],
      product: 'C[CH+]C(C)(C)C.O.[Br-]', klein: ['lg'] },
    { title: 'Carbocation rearrangement', arrows: [['b:C3-C5', 'C2']], moves: [['Br', -0.6, -1.1]], after: { C5: ['C2', 90], C4: ['C3', 330] },
      product: 'CC(C)[C+](C)C.O.[Br-]', klein: ['shift'] },
    { title: 'Nucleophilic attack', arrows: [['lp:Br', 'C3']], after: { Br: ['C3', 30] },
      product: 'CC(C)C(C)(C)Br.O', klein: ['nuc'] }
  ]);

  /* Klein 6.9: concerted, two patterns at once */
  def('sn2', {
    title: '1-Chlorobutane and hydroxide',
    atoms: [['C4', 'C', [0, 0]], ['C3', 'C', ['C4', 30]], ['C2', 'C', ['C3', 330]], ['C1', 'C', ['C2', 30]], ['Cl', 'Cl', ['C1', 330]],
            ['O', 'O', [2.5, 2.2], { c: -1, label: 'HO' }]],
    arrows: [['lp:O', 'C1'], ['b:C1-Cl', 'Cl']],
    after: { Cl: [5.0, 0.2], O: ['C1', 330] },
    product: 'CCCCO.[Cl-]', klein: ['nuc', 'lg'],
    who: { O: 'the O of hydroxide', C1: 'C1', Cl: 'Cl' }
  });

  /* Klein SkillBuilder 6.4: an ester and hydroxide, three steps */
  chain('ester', {
    atoms: [['C', 'C', [0, 0]], ['O', 'O', ['C', 90], { o: 2 }], ['Me', 'C', ['C', 210]], ['Oe', 'O', ['C', 330]], ['Mr', 'C', ['Oe', 30]],
            ['Oh', 'O', [1.6, 1.5], { c: -1 }], ['Hh', 'H', ['Oh', 30]]],
    who: { Oh: 'the O of hydroxide', C: 'the C of the C=O', O: 'the O of the C=O', Oe: 'the O of the OCH₃ group', Hh: 'the H' }
  }, [
    { title: 'Nucleophilic attack', arrows: [['lp:Oh', 'C'], ['b:C-O', 'O']],
      after: { Oh: ['C', 270], Hh: ['Oh', 330], Me: ['C', 180], Oe: ['C', 0], Mr: ['Oe', 30] }, product: 'CC([O-])(O)OC', klein: ['nuc'] },
    { title: 'Loss of a leaving group', arrows: [['lp:O', 'b:C-O'], ['b:C-Oe', 'Oe']],
      after: { Oe: [2.4, -0.9], Mr: ['Oe', 30], Me: ['C', 210], Oh: ['C', 330], Hh: ['Oh', 270] }, product: 'CC(=O)O.C[O-]', klein: ['lg'] },
    { title: 'Proton transfer', arrows: [['lp:Oe', 'Hh'], ['b:Hh-Oh', 'Oh']], after: { Hh: ['Oe', 210] },
      product: 'CC(=O)[O-].CO', klein: ['pt'] }
  ]);

  /* a methyl anion and a C=O (a graded drawing in Checkpoint 4) */
  def('cMeAttack', {
    title: 'Acetone and a methyl anion',
    atoms: [['C', 'C', [0, 0]], ['O', 'O', ['C', 90], { o: 2 }], ['M1', 'C', ['C', 210]], ['M2', 'C', ['C', 330]],
            ['Mn', 'C', [-2.2, 0.8], { c: -1, label: 'H₃C' }]],
    arrows: [['lp:Mn', 'C'], ['b:C-O', 'O']],
    after: { Mn: ['C', 180], M1: ['C', 270], M2: ['C', 0] },
    product: 'CC(C)(C)[O-]', klein: ['nuc'], who: { Mn: 'the CH₃⁻', C: 'the C of the C=O', O: 'the O of the C=O' }
  });
  /* ============================================== checkpoint drawings */

  def('dIsobuteneHBr', {
    title: '2-Methylpropene and HBr',
    atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 0], { o: 2 }], ['M1', 'C', ['C1', 150]], ['M2', 'C', ['C1', 210]],
            ['H', 'H', [1.5, 1.4]], ['Br', 'Br', ['H', 0]]],
    arrows: [['b:C1-C2', 'H'], ['b:Br-H', 'Br']],
    moves: [['Br', 0.8, 0.2]], after: { H: ['C2', 60] },
    product: 'C[C+](C)C.[Br-]', klein: ['pt'],
    who: { H: 'the H of HBr', Br: 'Br', C1: 'C1', C2: 'C2' }
  });
  def('dShift2', {
    title: '2-Methylpentan-3-yl cation',
    atoms: [['C5', 'C', [0, 0]], ['C4', 'C', ['C5', 30]], ['C3', 'C', ['C4', 330], { c: 1 }], ['C2', 'C', ['C3', 30]],
            ['C1', 'C', ['C2', 330]], ['M', 'C', ['C2', 90]], ['H', 'H', ['C2', 270]]],
    arrows: [['b:C2-H', 'C3']], after: { H: ['C3', 270] },
    product: 'CCC[C+](C)C', klein: ['shift'],
    who: { C3: 'the carbocation (C3)', C2: 'C2', H: 'the H on C2' }
  });
  def('dSN2', {
    title: 'Bromomethane and HS⁻',
    atoms: [['C', 'C', [0, 0], { label: 'H₃C' }], ['Br', 'Br', ['C', 0]], ['S', 'S', [-2.3, 0], { c: -1, label: 'HS' }]],
    arrows: [['lp:S', 'C'], ['b:Br-C', 'Br']],
    moves: [['Br', 1.3, 0]], after: { S: ['C', 180] },
    product: 'CS.[Br-]', klein: ['nuc', 'lg'],
    who: { S: 'the S of HS⁻', C: 'the carbon', Br: 'Br' }
  });
  def('dAcylOH', {
    title: 'Acetyl chloride and hydroxide',
    atoms: [['C', 'C', [0, 0]], ['O', 'O', ['C', 90], { o: 2 }], ['Me', 'C', ['C', 210]], ['Cl', 'Cl', ['C', 330]],
            ['Oh', 'O', [-2.0, 1.3], { c: -1, label: 'HO' }]],
    arrows: [['lp:Oh', 'C'], ['b:C-O', 'O']],
    after: { Oh: ['C', 270], Me: ['C', 180], Cl: ['C', 0] },
    product: 'CC([O-])(O)Cl', klein: ['nuc'],
    who: { Oh: 'the O of hydroxide', C: 'the C of the C=O', O: 'the O of the C=O' }
  });

  /* =============================================== energy diagrams */

  /* Energies are for the shape of the drawing only (no numbers are ever shown). */
  var PROFILES = {
    f622: [{ E: 0, t: 'Reactants' }, { E: 1, t: 'Transition state', ts: true }, { E: -0.35, t: 'Products' }],
    f623: [{ E: 0, t: 'Reactants' }, { E: 1, t: '', ts: true }, { E: 0.6, t: 'Intermediate' }, { E: 0.78, t: '', ts: true }, { E: -0.3, t: 'Products' }],
    f631: [{ E: 0, t: 'Reactants' }, { E: 0.35, t: '', ts: true }, { E: 0.12, t: '' }, { E: 0.95, t: '', ts: true }, { E: 0.62, t: '2°' },
           { E: 0.7, t: '', ts: true }, { E: 0.38, t: '3°' }, { E: 0.5, t: '', ts: true }, { E: -0.25, t: 'Product' }],
    sn2: [{ E: 0, t: 'Reactants' }, { E: 1, t: 'Transition state', ts: true }, { E: -0.35, t: 'Products' }],
    exo: [{ E: 0.45, t: 'Reactants' }, { E: 1, t: '', ts: true }, { E: 0, t: 'Products' }],
    endo: [{ E: 0, t: 'Reactants' }, { E: 1, t: '', ts: true }, { E: 0.45, t: 'Products' }]
  };

  return { S: S, RULES: RULES, SHIFT_KLEIN: SHIFT_KLEIN, PROFILES: PROFILES, shiftScene: shiftScene,
           arrowsOf: arrowsOf, key: key };
})();

if (typeof module !== 'undefined') module.exports = SCENES;

/* extra-scenes.js: scenes the study guide adds to the arrow-pushing activity's
 * scenes. Runs in the browser page after scenes.js, through window.__SG (the
 * helpers scenes.js keeps private). Nothing in the activity itself changes.
 */
(function () {
  'use strict';
  var SG = window.__SG, def = SG.def, chain = SG.chain, HEX = SG.HEX, PENT = SG.PENT;
  var ringBonds = function (n) { var b = []; for (var i = 0; i < n; i++) b.push(['R' + i, 'R' + ((i + 1) % n)]); return b; };
  function ring(pts, cation) { return pts.map(function (p, i) { return ['R' + i, 'C', p, cation && i === 0 ? { c: 1 } : {}]; }); }

  /* ---- carbocations to rank */
  def('gMeCy', { title: '1-Methylcyclohexyl cation', atoms: ring(HEX, true).concat([['Me', 'C', ['R0', 90]]]), bonds: ringBonds(6) });
  def('gCyMe', { title: 'Cyclohexylmethyl cation', atoms: ring(HEX).concat([['Cp', 'C', ['R0', 90], { c: 1 }]]), bonds: ringBonds(6) });
  def('gBenzyl', { title: '1-Phenylethyl cation',
    atoms: [['Ca', 'C', [0, 0], { c: 1 }], ['P1', 'C', ['Ca', 180]], ['P2', 'C', ['P1', 120], { o: 2 }], ['P3', 'C', ['P2', 180]],
            ['P4', 'C', ['P3', 240], { o: 2 }], ['P5', 'C', ['P4', 300]], ['P6', 'C', ['P5', 0], { o: 2 }], ['Me', 'C', ['Ca', 60]]],
    bonds: [['P6', 'P1']] });
  def('gBu2', { title: 'Butan-2-yl cation', atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 30], { c: 1 }], ['C3', 'C', ['C2', 330]], ['C4', 'C', ['C3', 30]]] });

  def('gR3', { title: '3-Methylpentan-2-yl cation', atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 30], { c: 1 }], ['C3', 'C', ['C2', 330]],
    ['C4', 'C', ['C3', 30]], ['C5', 'C', ['C3', 270]], ['C6', 'C', ['C4', 330]]] });

  /* ---- electrophilic centres (a second one comes from resonance) */
  def('gEnone', { title: 'Pent-3-en-2-one',
    atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 30]], ['O', 'O', ['C2', 90], { o: 2 }], ['C3', 'C', ['C2', 330]], ['C4', 'C', ['C3', 30], { o: 2 }], ['C5', 'C', ['C4', 330]]] });
  def('gRingEnone', { title: 'Cyclohex-2-en-1-one',
    atoms: ring(HEX).concat([['O', 'O', ['R0', 90], { o: 2 }]]),
    bonds: [['R0', 'R1'], ['R1', 'R2', 2], ['R2', 'R3'], ['R3', 'R4'], ['R4', 'R5'], ['R5', 'R0']] });
  def('gEnoate', { title: 'Methyl but-2-enoate',
    atoms: [['C4', 'C', [0, 0]], ['C3', 'C', ['C4', 30], { o: 2 }], ['C2', 'C', ['C3', 330]], ['C1', 'C', ['C2', 30]], ['O1', 'O', ['C1', 90], { o: 2 }],
            ['O2', 'O', ['C1', 330]], ['Me', 'C', ['O2', 30]]] });
  def('gEnal', { title: 'Pent-2-enal',
    atoms: [['C5', 'C', [0, 0]], ['C4', 'C', ['C5', 30]], ['C3', 'C', ['C4', 330]], ['C2', 'C', ['C3', 30], { o: 2 }], ['C1', 'C', ['C2', 330]], ['O', 'O', ['C1', 270], { o: 2 }]] });

  /* ---- 2-methylpropan-2-ol and H3O+ : the first two steps of E1 dehydration, then water takes an H */
  chain('gDehyd', {
    atoms: [['C', 'C', [0, 0]], ['M1', 'C', ['C', 180]], ['M2', 'C', ['C', 0]], ['M3', 'C', ['C', 270]], ['O', 'O', ['C', 90]],
            ['Ho', 'H', ['O', 150]], ['Hm', 'H', ['M2', 330]],
            ['Ow', 'O', [2.9, 2.2], { c: 1 }], ['Hw1', 'H', ['Ow', 200]], ['Hw2', 'H', ['Ow', 90]], ['Hw3', 'H', ['Ow', 0]]],
    who: { O: 'the O of the alcohol', Hw1: 'the H of H₃O⁺', Ow: 'the O of H₃O⁺', C: 'the central carbon' }
  }, [
    { title: 'Proton transfer', arrows: [['lp:O', 'Hw1'], ['b:Hw1-Ow', 'Ow']], moves: [['Ow Hw2 Hw3', 0.9, -0.2]], after: { Hw1: ['O', 30] },
      product: 'CC(C)(C)[OH2+].O', klein: ['pt'] },
    { title: 'Loss of a leaving group', arrows: [['b:C-O', 'O']], moves: [['O Ho Hw1', -1.6, 0.8], ['Ow Hw2 Hw3', 0, -1.1]], after: { M1: ['C', 150], M2: ['C', 30], Hm: ['M2', 0] },
      product: 'C[C+](C)C.O.O', klein: ['lg'] },
    { title: 'Proton transfer', arrows: [['lp:Ow', 'Hm'], ['b:M2-Hm', 'b:C-M2']], after: { M2: ['C', 30], Hm: ['Ow', 150] },
      product: 'CC(C)=C.[OH3+].O', klein: ['pt'] }
  ]);
  /* ---- 2-methylpropene and H3O+ : alkene hydration, three steps (pt, nuc, pt) */
  chain('gHydr', {
    atoms: [['C1', 'C', [0, 0]], ['C2', 'C', ['C1', 0], { o: 2 }], ['M1', 'C', ['C1', 150]], ['M2', 'C', ['C1', 210]],
            ['Ow', 'O', [2.4, 1.9], { c: 1 }], ['Hw1', 'H', ['Ow', 225]], ['Hw2', 'H', ['Ow', 90]], ['Hw3', 'H', ['Ow', 0]],
            ['Ox', 'O', [-2.6, 2.6]], ['Hx1', 'H', ['Ox', 330]], ['Hx2', 'H', ['Ox', 210]]],
    who: { C2: 'the CH₂ carbon', C1: 'the other carbon of the C=C', Hw1: 'the H of H₃O⁺', Ow: 'the O of H₃O⁺' }
  }, [
    { title: 'Proton transfer', arrows: [['b:C1-C2', 'Hw1'], ['b:Hw1-Ow', 'Ow']], moves: [['Ow Hw2 Hw3', -2.4, 0]], after: { Hw1: ['C2', 60] },
      product: 'C[C+](C)C.O.O', klein: ['pt'] },
    { title: 'Nucleophilic attack', arrows: [['lp:Ow', 'C1']], after: { Ow: ['C1', 90], Hw2: ['Ow', 150], Hw3: ['Ow', 30], Ox: [-1.7, 2.6], Hx1: ['Ox', 330], Hx2: ['Ox', 210] },
      product: 'CC(C)(C)[OH2+].O', klein: ['nuc'] },
    { title: 'Proton transfer', arrows: [['lp:Ox', 'Hw2'], ['b:Hw2-Ow', 'Ow']], moves: [['Ox Hx1 Hx2', 0.3, 0]], after: { Hw2: ['Ox', 330] },
      product: 'CC(C)(C)O.[OH3+]', klein: ['pt'] }
  ]);
})();

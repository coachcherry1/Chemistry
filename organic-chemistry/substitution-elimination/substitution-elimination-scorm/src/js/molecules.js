/* molecules.js: every substrate in the activity, written once.
 *
 * `smiles` (or `ring`, the chairs activity's flat-ring spec, top face t and
 * bottom face b) is the molecule. `name` is the name written out by hand
 * from the textbook: it is never shown (students see the name name.js
 * computes), but tools/validate.js fails if the two ever differ, so a
 * wrong SMILES or a wrong wedge cannot slip through.
 *
 * mol(id) returns a fresh copy, so a step can draw H atoms on it or react it
 * without touching anyone else's.
 */

var MOLS = {
  /* Part 1 */
  bromomethane:  { smiles: 'CBr', name: 'bromomethane' },
  bromobutane1:  { smiles: 'BrCCCC', name: '1-bromobutane' },
  bromopentane2: { smiles: 'CC(Br)CCC', name: '2-bromopentane' },
  ccmb:          { smiles: 'CCC(C)(C)Cl', name: '2-chloro-2-methylbutane' },

  /* Part 2 */
  bbR:           { smiles: 'C[C@@H](Br)CC', name: '(R)-2-bromobutane' },
  bbS:           { smiles: 'C[C@H](Br)CC', name: '(S)-2-bromobutane' },
  cisBrMe:       { ring: { 1: { t: 'Br' }, 4: { t: 'CH3' } }, name: 'cis-1-bromo-4-methylcyclohexane' },
  transBrMe:     { ring: { 1: { t: 'Br' }, 4: { b: 'CH3' } }, name: 'trans-1-bromo-4-methylcyclohexane' },
  bromopropane1: { smiles: 'BrCCC', name: '1-bromopropane' },
  bromopropane2: { smiles: 'CC(C)Br', name: '2-bromopropane' },
  tBuBr:         { smiles: 'CC(C)(C)Br', name: '2-bromo-2-methylpropane' },
  bmhR:          { smiles: 'CC[C@@](C)(Br)CCC', name: '(R)-3-bromo-3-methylhexane' },
  b3mb:          { smiles: 'CC(Br)C(C)C', name: '2-bromo-3-methylbutane' },
  b22dmb:        { smiles: 'CC(Br)C(C)(C)C', name: '3-bromo-2,2-dimethylbutane' },

  /* Part 3 */
  bmb:           { smiles: 'CCC(C)(C)Br', name: '2-bromo-2-methylbutane' },
  ccmh:          { ring: { 1: { t: 'Cl', b: 'CH3' } }, name: '1-chloro-1-methylcyclohexane' },
  bp3:           { smiles: 'CCC(Br)CC', name: '3-bromopentane' },
  bmpRR:         { smiles: 'C[C@@H](Br)[C@H](C)CC', name: '(2R,3R)-2-bromo-3-methylpentane' },
  bmpRS:         { smiles: 'C[C@@H](Br)[C@@H](C)CC', name: '(2R,3S)-2-bromo-3-methylpentane' },

  /* Part 4 */
  chloroch:      { ring: { 1: { t: 'Cl' } }, name: 'chlorocyclohexane' },
  cisClMe:       { ring: { 1: { t: 'Cl' }, 2: { t: 'CH3' } }, name: 'cis-1-chloro-2-methylcyclohexane' },
  transClMe:     { ring: { 1: { t: 'Cl' }, 2: { b: 'CH3' } }, name: 'trans-1-chloro-2-methylcyclohexane' },
  transBrMe2:    { ring: { 1: { t: 'Br' }, 2: { b: 'CH3' } }, name: 'trans-1-bromo-2-methylcyclohexane' },
  cisBrTb:       { ring: { 1: { t: 'Br' }, 4: { t: 'tBu' } }, name: 'cis-1-bromo-4-tert-butylcyclohexane' },
  transBrTb:     { ring: { 1: { t: 'Br' }, 4: { b: 'tBu' } }, name: 'trans-1-bromo-4-tert-butylcyclohexane' },
  /* Klein problem 7.18 */
  transTbCl:     { ring: { 1: { t: 'tBu' }, 3: { b: 'Cl' } }, name: 'trans-1-tert-butyl-3-chlorocyclohexane' },
  cisTbCl:       { ring: { 1: { t: 'tBu' }, 3: { t: 'Cl' } }, name: 'cis-1-tert-butyl-3-chlorocyclohexane' },
  /* the textbook's menthyl and neomenthyl chlorides (stretch questions) */
  menthylCl:     { ring: { 1: { b: 'Cl' }, 2: { t: 'iPr' }, 5: { b: 'CH3' } }, common: 'menthyl chloride',
                   name: '2-chloro-1-isopropyl-4-methylcyclohexane' },
  neomenthylCl:  { ring: { 1: { t: 'Cl' }, 2: { t: 'iPr' }, 5: { b: 'CH3' } }, common: 'neomenthyl chloride',
                   name: '2-chloro-1-isopropyl-4-methylcyclohexane' },

  /* Part 5 (Klein's worked example 7.7 is 2-chloropentane with NaOEt) */
  cpR:           { smiles: 'C[C@@H](Cl)CCC', name: '(R)-2-chloropentane' },
  bromoethane:   { smiles: 'CCBr', name: 'bromoethane' },
  iodopropane2:  { smiles: 'CC(C)I', name: '2-iodopropane' },
  bromocyclohexane: { ring: { 1: { t: 'Br' } }, name: 'bromocyclohexane' },
  bmhxR:         { smiles: 'CCC[C@@H](C)Br', name: '(R)-2-bromopentane' },
  chloromethylpropane: { smiles: 'CC(C)CCl', name: '1-chloro-2-methylpropane' },
  bromo2mp:      { smiles: 'CC(C)C(C)(C)Br', name: '2-bromo-2,3-dimethylbutane' }
};

function mol(id) {
  var spec = MOLS[id];
  if (!spec) throw new Error('Unknown molecule ' + id);
  if (!spec._m) spec._m = spec.ring ? Mol.fromRing(spec.ring) : Mol.parse(spec.smiles);
  var m = spec._m.clone();
  m.key = id;
  return m;
}

/* The name students see: computed, or the textbook's common name. */
function molName(m) {
  var spec = m.key && MOLS[m.key];
  if (spec && spec.common) return spec.common;
  return Name.name(m);
}

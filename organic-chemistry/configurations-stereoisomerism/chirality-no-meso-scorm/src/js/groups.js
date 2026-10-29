/* groups.js: the elements, and the groups that sit on a chirality centre.
 *
 * `z` is the atomic number. It is the only thing the priority rules look at
 * (cip.js), so it lives here beside the colours rather than in a table typed
 * out a second time. The reference table students see beside the
 * checkpoints is built from these numbers.
 *
 * Each group is a small tree of atoms: `el` is its first atom (the one bonded
 * to the chirality centre) and `kids` are the groups hanging from it, with
 * every H written out, so the 3D model shows real atoms and the priority
 * rules can look one atom further out, then another. `order: 2` marks a
 * double bond to the parent; `flat: true` an atom whose bonds lie in a plane
 * (the carbon of C=O or C=C).
 *
 * `label` is how the group is written in a drawing when its bond points to
 * the right, `left` when it points to the left (HO rather than OH, as Klein
 * writes it), so the atom bonded to the centre always sits next to the bond.
 */

var ELEMENTS = {
  H:  { z: 1,  name: 'hydrogen', color: '#f3f4f5', edge: '#8e979f', ball: 0.27, vdw: 1.10 },
  C:  { z: 6,  name: 'carbon',   color: '#5a6168', edge: '#2b2f33', ball: 0.40, vdw: 1.70 },
  N:  { z: 7,  name: 'nitrogen', color: '#3f6fd8', edge: '#1c3a80', ball: 0.40, vdw: 1.55 },
  O:  { z: 8,  name: 'oxygen',   color: '#e5352b', edge: '#7e1712', ball: 0.40, vdw: 1.52 },
  F:  { z: 9,  name: 'fluorine', color: '#a6d65c', edge: '#557a25', ball: 0.38, vdw: 1.47 },
  Cl: { z: 17, name: 'chlorine', color: '#36b14c', edge: '#1d6e2c', ball: 0.56, vdw: 1.75 },
  Br: { z: 35, name: 'bromine',  color: '#9a4a24', edge: '#4f220c', ball: 0.64, vdw: 1.85 },
  I:  { z: 53, name: 'iodine',   color: '#8043a6', edge: '#46205e', ball: 0.74, vdw: 1.98 }
};

/* The elements in the order of the reference table. */
var ELEMENT_ORDER = ['H', 'C', 'N', 'O', 'F', 'Cl', 'Br', 'I'];

/* Bond lengths in ångströms. */
function bondLength(a, b, order) {
  var k = [a, b].sort().join('-') + (order === 2 ? '=' : '');
  var L = {
    'C-C': 1.54, 'C-C=': 1.34, 'C-H': 1.09, 'C-O': 1.43, 'C-O=': 1.21, 'H-O': 0.96, 'C-N': 1.47,
    'H-N': 1.01, 'C-F': 1.35, 'C-Cl': 1.78, 'Br-C': 1.94, 'C-I': 2.14
  };
  return L[k] || 1.5;
}

var GROUPS = {
  H:     { el: 'H',  label: 'H',  name: 'H' },
  F:     { el: 'F',  label: 'F',  name: 'F' },
  Cl:    { el: 'Cl', label: 'Cl', name: 'Cl' },
  Br:    { el: 'Br', label: 'Br', name: 'Br' },
  I:     { el: 'I',  label: 'I',  name: 'I' },
  OH:    { el: 'O',  kids: ['H'], label: 'OH', left: 'HO', name: 'OH' },
  NH2:   { el: 'N',  kids: ['H', 'H'], label: 'NH₂', left: 'H₂N', name: 'NH₂' },
  CH3:   { el: 'C',  kids: ['H', 'H', 'H'], label: 'CH₃', left: 'H₃C', name: 'CH₃' },
  Et:    { el: 'C',  kids: ['CH3', 'H', 'H'], label: 'CH₂CH₃', left: 'CH₃CH₂', name: 'CH₂CH₃' },
  Pr:    { el: 'C',  kids: ['Et', 'H', 'H'], label: 'CH₂CH₂CH₃', left: 'CH₃CH₂CH₂', name: 'CH₂CH₂CH₃' },
  iPr:   { el: 'C',  kids: ['CH3', 'CH3', 'H'], label: 'CH(CH₃)₂', left: '(CH₃)₂CH', name: 'CH(CH₃)₂' },
  tBu:   { el: 'C',  kids: ['CH3', 'CH3', 'CH3'], label: 'C(CH₃)₃', left: '(CH₃)₃C', name: 'C(CH₃)₃' },
  CH2OH: { el: 'C',  kids: ['OH', 'H', 'H'], label: 'CH₂OH', left: 'HOCH₂', name: 'CH₂OH' },
  CH2Br: { el: 'C',  kids: ['Br', 'H', 'H'], label: 'CH₂Br', left: 'BrCH₂', name: 'CH₂Br' },
  CHO:   { el: 'C',  kids: ['Oxo', 'H'], flat: true, label: 'CHO', left: 'OHC', name: 'CHO' },
  COOH:  { el: 'C',  kids: ['Oxo', 'OH'], flat: true, label: 'COOH', left: 'HOOC', name: 'COOH' },
  Vinyl: { el: 'C',  kids: ['Methylene', 'H'], flat: true, label: 'CH=CH₂', left: 'H₂C=CH', name: 'CH=CH₂' },
  /* parts of the groups above, never on a chirality centre themselves */
  Oxo:       { el: 'O', order: 2, label: 'O', name: '=O' },
  Methylene: { el: 'C', order: 2, kids: ['H', 'H'], flat: true, label: 'CH₂', name: '=CH₂' }
};

/* Text colour for a label in the 2D drawings: hydrogen and carbon use the
   page's ink so they follow the theme; the other elements keep their 3D
   colours so the two views read as the same molecule. */
function toneOf(el) {
  return { H: 'h', C: 'c', N: 'n', O: 'o', F: 'f', Cl: 'cl', Br: 'br', I: 'i' }[el] || 'c';
}

function groupTone(key) { return toneOf(GROUPS[key] ? GROUPS[key].el : key); }

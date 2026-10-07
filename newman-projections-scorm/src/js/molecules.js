/* molecules.js — every molecule in the activity, authored as its wedge/dash
 * drawing.
 *
 * Looking down the central bond, `front` is the carbon nearest the eye and
 * `back` the one behind it. Each carries three groups:
 *   anchor  the group in the plane of the page, continuing the zigzag chain
 *   wedge   the group on a solid wedge, toward the reader
 *   dash    the group on a hashed wedge, away from the reader
 *
 * The chain is drawn anti (a zigzag), so the two anchors are always 180° apart
 * in the drawn conformation. geometry.js turns this into the Newman projection
 * and the 3D model; nothing about the answer is typed in twice.
 *
 * `ref` names the two groups whose dihedral angle is the graph's x axis.
 */

var MOLECULES = (function () {
  'use strict';

  var M = {};

  M.ethane = {
    id: 'ethane', name: 'Ethane', formula: 'C₂H₆',
    carbons: ['C1', 'C2'],
    front: { anchor: 'Hr', wedge: 'H', dash: 'H' },
    back:  { anchor: 'Hb', wedge: 'H', dash: 'H' },
    ref: ['anchor', 'anchor'],
    axis: 'Dihedral angle, red H to blue H',
    vocab: 'ethane'
  };

  M.butane = {
    id: 'butane', name: 'Butane', formula: 'C₄H₁₀',
    carbons: ['C2', 'C3'], ends: ['C1', 'C4'],
    front: { anchor: 'CH3', wedge: 'H', dash: 'H' },
    back:  { anchor: 'CH3', wedge: 'H', dash: 'H' },
    ref: ['anchor', 'anchor'],
    axis: 'Dihedral angle, CH₃–C2–C3–CH₃',
    vocab: 'butane'
  };

  /* One frame, six molecules: the front carbon carries CH₃, H and a group X,
     the back carbon CH₃ and two H. Swapping X is how students compare the
     halogens with each other and with growing alkyl groups. */
  var SUBST = {
    Br:  { id: 'bromobutane',      name: '2-Bromobutane',          formula: 'C₄H₉Br' },
    Cl:  { id: 'chlorobutane',     name: '2-Chlorobutane',         formula: 'C₄H₉Cl' },
    I:   { id: 'iodobutane',       name: '2-Iodobutane',           formula: 'C₄H₉I' },
    CH3: { id: 'methylbutane',     name: '2-Methylbutane',         formula: 'C₅H₁₂' },
    iPr: { id: 'dimethylpentane',  name: '2,3-Dimethylpentane',    formula: 'C₇H₁₆',
           carbons: ['C3', 'C4'] },
    tBu: { id: 'trimethylpentane', name: '2,2,3-Trimethylpentane', formula: 'C₈H₁₈',
           carbons: ['C3', 'C4'] }
  };
  M.SWAP_ORDER = ['Br', 'Cl', 'I', 'CH3', 'iPr', 'tBu'];

  Object.keys(SUBST).forEach(function (x) {
    var s = SUBST[x];
    var carbons = s.carbons || ['C2', 'C3'];
    M[s.id] = {
      id: s.id, name: s.name, formula: s.formula, x: x,
      carbons: carbons, ends: s.carbons ? null : ['C1', 'C4'],
      front: { anchor: 'CH3', wedge: x, dash: 'H' },
      back:  { anchor: 'CH3', wedge: 'H', dash: 'H' },
      ref: ['anchor', 'anchor'],
      axis: 'Dihedral angle, CH₃–' + carbons[0] + '–' + carbons[1] + '–CH₃',
      vocab: 'generic'
    };
  });

  /* Drawn in its worse staggered conformation (both extra CH₃ on wedges), so
     the student has to rotate to find the better one. */
  M.dimethylbutane = {
    id: 'dimethylbutane', name: '2,3-Dimethylbutane', formula: 'C₆H₁₄',
    carbons: ['C2', 'C3'], ends: ['C1', 'C4'],
    front: { anchor: 'CH3', wedge: 'CH3', dash: 'H' },
    back:  { anchor: 'CH3', wedge: 'CH3', dash: 'H' },
    ref: ['anchor', 'anchor'],
    axis: 'Dihedral angle, CH₃–C2–C3–CH₃',
    vocab: 'generic'
  };

  /* The two 2,3-dihalobutanes. Same atoms, same connections, different wedges.
     A has one halogen on a wedge and one on a dash; B has both on wedges.
     Students have not met stereoisomers yet, so they are only ever called
     "Molecule A" and "Molecule B" (A is the meso compound, B is chiral). */
  var HALO = { Cl: 'chloro', Br: 'bromo', I: 'iodo' };
  M.HALOGENS = ['Cl', 'Br', 'I'];
  M.HALOGENS.forEach(function (x) {
    var nm = '2,3-Di' + HALO[x] + 'butane';
    var axis = 'Dihedral angle, ' + x + '–C2–C3–' + x;
    M['pairA_' + x] = {
      id: 'pairA_' + x, name: nm, tag: 'Molecule A', formula: 'C₄H₈' + x + '₂', x: x,
      carbons: ['C2', 'C3'], ends: ['C1', 'C4'],
      front: { anchor: 'CH3', wedge: x, dash: 'H' },
      back:  { anchor: 'CH3', wedge: 'H', dash: x },
      ref: ['wedge', 'dash'], axis: axis, vocab: 'generic'
    };
    M['pairB_' + x] = {
      id: 'pairB_' + x, name: nm, tag: 'Molecule B', formula: 'C₄H₈' + x + '₂', x: x,
      carbons: ['C2', 'C3'], ends: ['C1', 'C4'],
      front: { anchor: 'CH3', wedge: x, dash: 'H' },
      back:  { anchor: 'CH3', wedge: x, dash: 'H' },
      ref: ['wedge', 'wedge'], axis: axis, vocab: 'generic'
    };
  });

  return M;
})();

function molecule(id) {
  var m = MOLECULES[id];
  if (!m || !m.front) throw new Error('Unknown molecule ' + id);
  return m;
}

/* The six named conformations, every 60°. */
var NAMED_ANGLES = [0, 60, 120, 180, 240, 300];

/* What a student should call the conformation at reference dihedral `phi`,
   or null between the named angles. */
function conformationName(mol, phi) {
  var p = GEOM.wrap(Math.round(phi));
  var near = Math.round(p / 60) * 60 % 360;
  if (STRAIN.gap(p, near) > 2) return null;
  var eclipsed = near % 120 === 0;
  if (mol.vocab === 'ethane') return eclipsed ? 'eclipsed' : 'staggered';
  if (mol.vocab === 'butane') {
    return { 0: 'totally eclipsed', 60: 'gauche', 120: 'eclipsed',
             180: 'anti', 240: 'eclipsed', 300: 'gauche' }[near];
  }
  return eclipsed ? 'eclipsed' : 'staggered';
}

/* A short phrase about the reference groups, e.g. "CH₃ anti to CH₃". */
function refRelation(mol, phi) {
  var p = GEOM.wrap(Math.round(phi));
  var g = STRAIN.gap(p, 0);
  var front = GROUPS[mol.front[mol.ref[0]]].label;
  var back = GROUPS[mol.back[mol.ref[1]]].label;
  var word = g < 3 ? 'eclipsing' : Math.abs(g - 60) < 3 ? 'gauche to' :
             Math.abs(g - 120) < 3 ? '120° from' : Math.abs(g - 180) < 3 ? 'anti to' : null;
  return word ? front + ' ' + word + ' ' + back : null;
}

/* Energies at the six named angles, and the lowest staggered one. */
function namedEnergies(mol) {
  return NAMED_ANGLES.map(function (phi) {
    return { phi: phi, e: GEOM.energyAt(mol, phi), parts: GEOM.breakdownAt(mol, phi) };
  });
}

function bestStaggered(mol) {
  var best = null;
  namedEnergies(mol).forEach(function (n) {
    if (n.phi % 120 === 0) return;
    if (!best || n.e < best.e - 1e-9) best = n;
  });
  return best;
}

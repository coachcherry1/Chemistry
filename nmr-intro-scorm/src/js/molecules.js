/* molecules.js — the compound bank.
 *
 * Every spectrum in this activity is GENERATED from the numbers below, not
 * scanned from a database. A compound is a small graph:
 *
 *   atoms   x, y   position in bond lengths, y up
 *           t      the label drawn: 'CH₃', 'C', 'O', 'OH', 'Br' ... or '' for
 *                  a bare ring vertex
 *           h      hydrogens on this atom (0 or absent for none)
 *           s      the set of equivalent hydrogens it belongs to (a, b, c ...)
 *           oh     true for an O-H: it exchanges, so it neither splits nor is
 *                  split
 *   bonds   [i, j, order]  order defaults to 1
 *   rings   [[vertex ...]] drawn with an inner circle (aromatic)
 *   sets    one entry per set of equivalent hydrogens
 *           d      chemical shift, ppm (CDCl₃, literature)
 *           r      region id from shifts.js; d must fall inside its range
 *           env    one group of the set, in words: 'the CH₂ bonded to the O'
 *           all    the whole set, when it has more than one group
 *           why    why the groups of a multi-group set are equivalent
 *           br     a broad singlet (O-H)
 *
 * Integration and splitting are NOT typed in: the number of H in a set and
 * the number of neighbouring H that split it are counted from the graph by
 * analysis.js, so they cannot disagree with the structure. Equivalence IS
 * typed in (the `s` on each atom) - that is the thing Level 1 asks about, and
 * tools/validate.js checks that every group in a set has the same H count and
 * the same neighbours.
 *
 * `levels` lists the levels that may draw a compound. `family` drives variety
 * within a level; `kind` drives the Level 1 draw (sym, branch, ring, trap -
 * two groups that look alike but are not equivalent - and chain).
 */

/* A flat-topped hexagon of radius one bond, vertex 0 at the right. */
function hexAt(i) {
  var a = Math.PI / 3 * i;
  return { x: Math.round(Math.cos(a) * 1000) / 1000, y: Math.round(Math.sin(a) * 1000) / 1000 };
}
function ringAtom(i, extra) {
  var p = hexAt(i), out = { x: p.x, y: p.y, t: '' };
  for (var k in extra) out[k] = extra[k];
  return out;
}
var HEX_BONDS = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]];

var MOLECULES = [

  /* ----------------------------------------------------------- one signal */

  {
    id: 'acetone', name: 'Acetone', formula: 'C₃H₆O', family: 'ketone', kind: 'sym',
    levels: [1],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'C' },
      { x: 2, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 1, t: 'O' }
    ],
    bonds: [[0, 1], [1, 2], [1, 3, 2]],
    sets: {
      a: { d: 2.17, r: 'carbonyl', env: 'a CH₃ bonded to the C=O',
           all: 'the two CH₃ groups, both bonded to the C=O',
           why: 'the C=O sits in the middle, so the two CH₃ groups are mirror images' }
    }
  },

  {
    id: 'dichloroethane', name: '1,2-Dichloroethane', formula: 'C₂H₄Cl₂', family: 'halide',
    kind: 'sym', levels: [1],
    atoms: [
      { x: 0, y: 0, t: 'Cl' },
      { x: 1, y: 0, t: 'CH₂', h: 2, s: 'a' },
      { x: 2, y: 0, t: 'CH₂', h: 2, s: 'a' },
      { x: 3, y: 0, t: 'Cl' }
    ],
    bonds: [[0, 1], [1, 2], [2, 3]],
    sets: {
      a: { d: 3.73, r: 'halide', env: 'a CH₂ bonded to a Cl', all: 'the two CH₂ groups',
           why: 'the molecule is the same from either end: each CH₂ carries one Cl and one CH₂' }
    }
  },

  {
    id: 'cyclohexane', name: 'Cyclohexane', formula: 'C₆H₁₂', family: 'alkane', kind: 'ring',
    levels: [1],
    atoms: [0, 1, 2, 3, 4, 5].map(function (i) {
      return ringAtom(i, { t: 'CH₂', h: 2, s: 'a' });
    }),
    bonds: HEX_BONDS,
    sets: {
      a: { d: 1.43, r: 'alkyl', env: 'a CH₂ in the ring', all: 'the six ring CH₂ groups',
           why: 'every CH₂ has the same neighbours, and turning the ring moves each one onto the next' }
    }
  },

  /* ------------------------------------------------------------- alcohols */

  {
    id: 'ethanol', name: 'Ethanol', formula: 'C₂H₆O', family: 'alcohol', kind: 'chain',
    levels: [2, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'CH₂', h: 2, s: 'b' },
      { x: 2, y: 0, t: 'OH', h: 1, s: 'c', oh: true }
    ],
    bonds: [[0, 1], [1, 2]],
    sets: {
      a: { d: 1.22, r: 'alkyl', env: 'the CH₃ at the end of the chain' },
      b: { d: 3.69, r: 'oxygen', env: 'the CH₂ bonded to the O' },
      c: { d: 2.61, r: 'alcohol', env: 'the O–H', br: true }
    }
  },

  {
    id: 'propanol', name: '1-Propanol', formula: 'C₃H₈O', family: 'alcohol', kind: 'chain',
    levels: [1, 2, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'CH₂', h: 2, s: 'b' },
      { x: 2, y: 0, t: 'CH₂', h: 2, s: 'c' },
      { x: 3, y: 0, t: 'OH', h: 1, s: 'd', oh: true }
    ],
    bonds: [[0, 1], [1, 2], [2, 3]],
    sets: {
      a: { d: 0.93, r: 'alkyl', env: 'the CH₃ at the end of the chain, two carbons from the O' },
      b: { d: 1.57, r: 'alkyl', env: 'the middle CH₂, one carbon from the O' },
      c: { d: 3.58, r: 'oxygen', env: 'the CH₂ bonded to the O' },
      d: { d: 2.26, r: 'alcohol', env: 'the O–H', br: true }
    }
  },

  {
    id: 'isopropanol', name: '2-Propanol', formula: 'C₃H₈O', family: 'alcohol', kind: 'branch',
    levels: [1, 2, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'CH', h: 1, s: 'b' },
      { x: 2, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 1, t: 'OH', h: 1, s: 'c', oh: true }
    ],
    bonds: [[0, 1], [1, 2], [1, 3]],
    sets: {
      a: { d: 1.20, r: 'alkyl', env: 'a CH₃ on the central CH',
           all: 'the two CH₃ groups on the central CH',
           why: 'both CH₃ groups hang off the same CH, so they are mirror images' },
      b: { d: 4.02, r: 'oxygen', env: 'the CH bonded to the O' },
      c: { d: 2.16, r: 'alcohol', env: 'the O–H', br: true }
    }
  },

  {
    id: 'tbutanol', name: 'tert-Butyl alcohol', formula: 'C₄H₁₀O', family: 'alcohol',
    kind: 'branch', levels: [1, 3, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'C' },
      { x: 2, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: -1, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 1, t: 'OH', h: 1, s: 'b', oh: true }
    ],
    bonds: [[0, 1], [1, 2], [1, 3], [1, 4]],
    sets: {
      a: { d: 1.28, r: 'alkyl', env: 'a CH₃ on the central carbon',
           all: 'the three CH₃ groups on the central carbon',
           why: 'all three CH₃ groups hang off the same carbon, and turning the molecule swaps them' },
      b: { d: 1.95, r: 'alcohol', env: 'the O–H', br: true }
    }
  },

  /* --------------------------------------------------------------- ethers */

  {
    id: 'diethylether', name: 'Diethyl ether', formula: 'C₄H₁₀O', family: 'ether', kind: 'sym',
    levels: [1, 2, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'CH₂', h: 2, s: 'b' },
      { x: 2, y: 0, t: 'O' },
      { x: 3, y: 0, t: 'CH₂', h: 2, s: 'b' },
      { x: 4, y: 0, t: 'CH₃', h: 3, s: 'a' }
    ],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4]],
    sets: {
      a: { d: 1.21, r: 'alkyl', env: 'a CH₃ at the end of an ethyl group',
           all: 'the two CH₃ groups at the ends',
           why: 'the O sits in the middle, so the two ethyl groups are mirror images' },
      b: { d: 3.48, r: 'oxygen', env: 'a CH₂ bonded to the O',
           all: 'the two CH₂ groups bonded to the O',
           why: 'the O sits in the middle, so the two ethyl groups are mirror images' }
    }
  },

  {
    id: 'mtbe', name: 'tert-Butyl methyl ether', formula: 'C₅H₁₂O', family: 'ether', kind: 'trap',
    levels: [1, 2, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'O' },
      { x: 2, y: 0, t: 'C' },
      { x: 3, y: 0, t: 'CH₃', h: 3, s: 'b' },
      { x: 2, y: 1, t: 'CH₃', h: 3, s: 'b' },
      { x: 2, y: -1, t: 'CH₃', h: 3, s: 'b' }
    ],
    bonds: [[0, 1], [1, 2], [2, 3], [2, 4], [2, 5]],
    sets: {
      a: { d: 3.22, r: 'oxygen', env: 'the CH₃ bonded to the O' },
      b: { d: 1.20, r: 'alkyl', env: 'a CH₃ of the tert-butyl group',
           all: 'the three CH₃ groups of the tert-butyl group',
           why: 'all three hang off the same carbon, and turning the molecule swaps them' }
    }
  },

  /* --------------------------------------------------------------- esters */

  {
    id: 'ethylacetate', name: 'Ethyl acetate', formula: 'C₄H₈O₂', family: 'ester', kind: 'trap',
    levels: [1, 2, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'C' },
      { x: 1, y: 1, t: 'O' },
      { x: 2, y: 0, t: 'O' },
      { x: 3, y: 0, t: 'CH₂', h: 2, s: 'b' },
      { x: 4, y: 0, t: 'CH₃', h: 3, s: 'c' }
    ],
    bonds: [[0, 1], [1, 2, 2], [1, 3], [3, 4], [4, 5]],
    sets: {
      a: { d: 2.05, r: 'carbonyl', env: 'the CH₃ bonded to the C=O' },
      b: { d: 4.12, r: 'oxygen', env: 'the CH₂ bonded to the ester O' },
      c: { d: 1.26, r: 'alkyl', env: 'the CH₃ at the end of the ethyl group' }
    }
  },

  {
    id: 'methylacetate', name: 'Methyl acetate', formula: 'C₃H₆O₂', family: 'ester', kind: 'trap',
    levels: [1, 2, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'C' },
      { x: 1, y: 1, t: 'O' },
      { x: 2, y: 0, t: 'O' },
      { x: 3, y: 0, t: 'CH₃', h: 3, s: 'b' }
    ],
    bonds: [[0, 1], [1, 2, 2], [1, 3], [3, 4]],
    sets: {
      a: { d: 2.06, r: 'carbonyl', env: 'the CH₃ bonded to the C=O' },
      b: { d: 3.67, r: 'oxygen', env: 'the CH₃ bonded to the ester O' }
    }
  },

  {
    id: 'methylpropanoate', name: 'Methyl propanoate', formula: 'C₄H₈O₂', family: 'ester',
    kind: 'trap', levels: [1, 2, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'CH₂', h: 2, s: 'b' },
      { x: 2, y: 0, t: 'C' },
      { x: 2, y: 1, t: 'O' },
      { x: 3, y: 0, t: 'O' },
      { x: 4, y: 0, t: 'CH₃', h: 3, s: 'c' }
    ],
    bonds: [[0, 1], [1, 2], [2, 3, 2], [2, 4], [4, 5]],
    sets: {
      a: { d: 1.14, r: 'alkyl', env: 'the CH₃ at the end of the ethyl group' },
      b: { d: 2.33, r: 'carbonyl', env: 'the CH₂ bonded to the C=O' },
      c: { d: 3.67, r: 'oxygen', env: 'the CH₃ bonded to the ester O' }
    }
  },

  {
    id: 'isopropylacetate', name: 'Isopropyl acetate', formula: 'C₅H₁₀O₂', family: 'ester',
    kind: 'branch', levels: [1, 2, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'C' },
      { x: 1, y: 1, t: 'O' },
      { x: 2, y: 0, t: 'O' },
      { x: 3, y: 0, t: 'CH', h: 1, s: 'b' },
      { x: 4, y: 0, t: 'CH₃', h: 3, s: 'c' },
      { x: 3, y: -1, t: 'CH₃', h: 3, s: 'c' }
    ],
    bonds: [[0, 1], [1, 2, 2], [1, 3], [3, 4], [4, 5], [4, 6]],
    sets: {
      a: { d: 2.02, r: 'carbonyl', env: 'the CH₃ bonded to the C=O' },
      b: { d: 4.99, r: 'oxygen', env: 'the CH bonded to the ester O' },
      c: { d: 1.23, r: 'alkyl', env: 'a CH₃ on the O–CH', all: 'the two CH₃ groups on the O–CH',
           why: 'both hang off the same CH, so they are mirror images' }
    }
  },

  /* ------------------------------------------------- ketones and aldehyde */

  {
    id: 'butanone', name: '2-Butanone', formula: 'C₄H₈O', family: 'ketone', kind: 'trap',
    levels: [1, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'C' },
      { x: 1, y: 1, t: 'O' },
      { x: 2, y: 0, t: 'CH₂', h: 2, s: 'b' },
      { x: 3, y: 0, t: 'CH₃', h: 3, s: 'c' }
    ],
    bonds: [[0, 1], [1, 2, 2], [1, 3], [3, 4]],
    sets: {
      a: { d: 2.14, r: 'carbonyl', env: 'the CH₃ bonded to the C=O' },
      b: { d: 2.44, r: 'carbonyl', env: 'the CH₂ bonded to the C=O' },
      c: { d: 1.06, r: 'alkyl', env: 'the CH₃ at the end of the ethyl group' }
    }
  },

  {
    id: 'pentanone', name: '3-Pentanone', formula: 'C₅H₁₀O', family: 'ketone', kind: 'sym',
    levels: [1, 2, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'CH₂', h: 2, s: 'b' },
      { x: 2, y: 0, t: 'C' },
      { x: 2, y: 1, t: 'O' },
      { x: 3, y: 0, t: 'CH₂', h: 2, s: 'b' },
      { x: 4, y: 0, t: 'CH₃', h: 3, s: 'a' }
    ],
    bonds: [[0, 1], [1, 2], [2, 3, 2], [2, 4], [4, 5]],
    sets: {
      a: { d: 1.06, r: 'alkyl', env: 'a CH₃ at the end of an ethyl group',
           all: 'the two CH₃ groups at the ends',
           why: 'the C=O sits in the middle, so the two ethyl groups are mirror images' },
      b: { d: 2.44, r: 'carbonyl', env: 'a CH₂ bonded to the C=O',
           all: 'the two CH₂ groups bonded to the C=O',
           why: 'the C=O sits in the middle, so the two ethyl groups are mirror images' }
    }
  },

  {
    id: 'pivaldehyde', name: '2,2-Dimethylpropanal', formula: 'C₅H₁₀O', family: 'aldehyde',
    kind: 'branch', levels: [1, 2, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'C' },
      { x: 1, y: 1, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: -1, t: 'CH₃', h: 3, s: 'a' },
      { x: 2, y: 0, t: 'CH', h: 1, s: 'b' },
      { x: 3, y: 0, t: 'O' }
    ],
    bonds: [[0, 1], [1, 2], [1, 3], [1, 4], [4, 5, 2]],
    sets: {
      a: { d: 1.08, r: 'alkyl', env: 'a CH₃ on the central carbon',
           all: 'the three CH₃ groups on the central carbon',
           why: 'all three hang off the same carbon, and turning the molecule swaps them' },
      b: { d: 9.47, r: 'aldehyde', env: 'the aldehyde H, on the C=O carbon' }
    }
  },

  /* --------------------------------------------------------------- alkene */

  {
    id: 'isobutylene', name: '2-Methylpropene', formula: 'C₄H₈', family: 'alkene', kind: 'branch',
    levels: [1, 2, 3, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'C' },
      { x: 2, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 1, t: 'CH₂', h: 2, s: 'b' }
    ],
    bonds: [[0, 1], [1, 2], [1, 3, 2]],
    sets: {
      a: { d: 1.73, r: 'allylic', env: 'a CH₃ on the C=C', all: 'the two CH₃ groups on the C=C',
           why: 'both sit on the same carbon of the C=C, so they are mirror images' },
      b: { d: 4.66, r: 'vinyl', env: 'the =CH₂ at the end of the C=C' }
    }
  },

  /* -------------------------------------------------------- alkyl halides */

  {
    id: 'bromoethane', name: 'Bromoethane', formula: 'C₂H₅Br', family: 'halide', kind: 'chain',
    levels: [2, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'CH₂', h: 2, s: 'b' },
      { x: 2, y: 0, t: 'Br' }
    ],
    bonds: [[0, 1], [1, 2]],
    sets: {
      a: { d: 1.67, r: 'alkyl', env: 'the CH₃ at the end of the chain' },
      b: { d: 3.43, r: 'halide', env: 'the CH₂ bonded to the Br' }
    }
  },

  {
    id: 'bromopropane', name: '1-Bromopropane', formula: 'C₃H₇Br', family: 'halide', kind: 'chain',
    levels: [1, 2, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'CH₂', h: 2, s: 'b' },
      { x: 2, y: 0, t: 'CH₂', h: 2, s: 'c' },
      { x: 3, y: 0, t: 'Br' }
    ],
    bonds: [[0, 1], [1, 2], [2, 3]],
    sets: {
      a: { d: 1.03, r: 'alkyl', env: 'the CH₃ at the end of the chain, two carbons from the Br' },
      b: { d: 1.89, r: 'alkyl', env: 'the middle CH₂, one carbon from the Br' },
      c: { d: 3.40, r: 'halide', env: 'the CH₂ bonded to the Br' }
    }
  },

  {
    id: 'bromopropane2', name: '2-Bromopropane', formula: 'C₃H₇Br', family: 'halide',
    kind: 'branch', levels: [1, 2, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'CH', h: 1, s: 'b' },
      { x: 2, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 1, t: 'Br' }
    ],
    bonds: [[0, 1], [1, 2], [1, 3]],
    sets: {
      a: { d: 1.71, r: 'alkyl', env: 'a CH₃ on the central CH',
           all: 'the two CH₃ groups on the central CH',
           why: 'both hang off the same CH, so they are mirror images' },
      b: { d: 4.21, r: 'halide', env: 'the CH bonded to the Br' }
    }
  },

  /* ----------------------------------------------------- carboxylic acids */

  {
    id: 'aceticacid', name: 'Acetic acid', formula: 'C₂H₄O₂', family: 'acid', kind: 'chain',
    levels: [2, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'C' },
      { x: 1, y: 1, t: 'O' },
      { x: 2, y: 0, t: 'OH', h: 1, s: 'b', oh: true }
    ],
    bonds: [[0, 1], [1, 2, 2], [1, 3]],
    sets: {
      a: { d: 2.10, r: 'carbonyl', env: 'the CH₃ bonded to the C=O' },
      b: { d: 11.40, r: 'acid', env: 'the carboxylic acid O–H', br: true }
    }
  },

  {
    id: 'propanoicacid', name: 'Propanoic acid', formula: 'C₃H₆O₂', family: 'acid', kind: 'chain',
    levels: [2, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'CH₂', h: 2, s: 'b' },
      { x: 2, y: 0, t: 'C' },
      { x: 2, y: 1, t: 'O' },
      { x: 3, y: 0, t: 'OH', h: 1, s: 'c', oh: true }
    ],
    bonds: [[0, 1], [1, 2], [2, 3, 2], [2, 4]],
    sets: {
      a: { d: 1.16, r: 'alkyl', env: 'the CH₃ at the end of the chain' },
      b: { d: 2.38, r: 'carbonyl', env: 'the CH₂ bonded to the C=O' },
      c: { d: 11.70, r: 'acid', env: 'the carboxylic acid O–H', br: true }
    }
  },

  {
    id: 'butanoicacid', name: 'Butanoic acid', formula: 'C₄H₈O₂', family: 'acid', kind: 'chain',
    levels: [2, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'CH₂', h: 2, s: 'b' },
      { x: 2, y: 0, t: 'CH₂', h: 2, s: 'c' },
      { x: 3, y: 0, t: 'C' },
      { x: 3, y: 1, t: 'O' },
      { x: 4, y: 0, t: 'OH', h: 1, s: 'd', oh: true }
    ],
    bonds: [[0, 1], [1, 2], [2, 3], [3, 4, 2], [3, 5]],
    sets: {
      a: { d: 0.99, r: 'alkyl', env: 'the CH₃ at the end of the chain, two carbons from the C=O' },
      b: { d: 1.68, r: 'alkyl', env: 'the middle CH₂, one carbon from the C=O' },
      c: { d: 2.35, r: 'carbonyl', env: 'the CH₂ bonded to the C=O' },
      d: { d: 11.80, r: 'acid', env: 'the carboxylic acid O–H', br: true }
    }
  },

  {
    id: 'isobutyricacid', name: '2-Methylpropanoic acid', formula: 'C₄H₈O₂', family: 'acid',
    kind: 'branch', levels: [1, 2, 3, 4, 5],
    atoms: [
      { x: 0, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: 1, y: 0, t: 'CH', h: 1, s: 'b' },
      { x: 1, y: -1, t: 'CH₃', h: 3, s: 'a' },
      { x: 2, y: 0, t: 'C' },
      { x: 2, y: 1, t: 'O' },
      { x: 3, y: 0, t: 'OH', h: 1, s: 'c', oh: true }
    ],
    bonds: [[0, 1], [1, 2], [1, 3], [3, 4, 2], [3, 5]],
    sets: {
      a: { d: 1.21, r: 'alkyl', env: 'a CH₃ on the CH', all: 'the two CH₃ groups on the CH',
           why: 'both hang off the same CH, so they are mirror images' },
      b: { d: 2.58, r: 'carbonyl', env: 'the CH bonded to the C=O' },
      c: { d: 11.90, r: 'acid', env: 'the carboxylic acid O–H', br: true }
    }
  },

  /* ------------------------------------------------------------- aromatic */

  {
    id: 'pxylene', name: '1,4-Dimethylbenzene', formula: 'C₈H₁₀', family: 'arene', kind: 'ring',
    levels: [1, 2, 3, 4, 5],
    atoms: [
      ringAtom(0),
      ringAtom(1, { t: 'CH', h: 1, s: 'b' }),
      ringAtom(2, { t: 'CH', h: 1, s: 'b' }),
      ringAtom(3),
      ringAtom(4, { t: 'CH', h: 1, s: 'b' }),
      ringAtom(5, { t: 'CH', h: 1, s: 'b' }),
      { x: 2, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: -2, y: 0, t: 'CH₃', h: 3, s: 'a' }
    ],
    bonds: HEX_BONDS.concat([[0, 6], [3, 7]]),
    rings: [[0, 1, 2, 3, 4, 5]],
    sets: {
      a: { d: 2.30, r: 'benzylic', env: 'a CH₃ on the ring', all: 'the two CH₃ groups on the ring',
           why: 'they sit at opposite corners of the ring, so the molecule’s symmetry swaps them' },
      b: { d: 7.05, r: 'aromatic', env: 'an H on the ring', all: 'the four ring H',
           why: 'with identical groups at opposite corners, every ring H has the same neighbours: ' +
                'one CH and one carbon carrying a CH₃' }
    }
  },

  {
    id: 'mesitylene', name: '1,3,5-Trimethylbenzene', formula: 'C₉H₁₂', family: 'arene',
    kind: 'ring', levels: [1, 2, 3, 5],
    atoms: [
      ringAtom(0),
      ringAtom(1, { t: 'CH', h: 1, s: 'b' }),
      ringAtom(2),
      ringAtom(3, { t: 'CH', h: 1, s: 'b' }),
      ringAtom(4),
      ringAtom(5, { t: 'CH', h: 1, s: 'b' }),
      { x: 2, y: 0, t: 'CH₃', h: 3, s: 'a' },
      { x: -1, y: 1.732, t: 'CH₃', h: 3, s: 'a' },
      { x: -1, y: -1.732, t: 'CH₃', h: 3, s: 'a' }
    ],
    bonds: HEX_BONDS.concat([[0, 6], [2, 7], [4, 8]]),
    rings: [[0, 1, 2, 3, 4, 5]],
    sets: {
      a: { d: 2.26, r: 'benzylic', env: 'a CH₃ on the ring', all: 'the three CH₃ groups on the ring',
           why: 'they are spaced evenly around the ring, so turning it by a third swaps them' },
      b: { d: 6.78, r: 'aromatic', env: 'an H on the ring', all: 'the three ring H',
           why: 'each ring H sits between two carbons carrying a CH₃, so all three have the same surroundings' }
    }
  }
];

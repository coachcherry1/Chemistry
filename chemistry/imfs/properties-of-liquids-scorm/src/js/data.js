/* data.js: the elements and substances in the activity.
 *
 * Melting and boiling points are real, at 1 atm, from the CRC Handbook of
 * Chemistry and Physics (97th ed.), stored in kelvin. They are never shown;
 * the validator uses the boiling points to check every ranking.
 *
 * Everything else a step or a question says about a substance (its electron
 * count, whether it is polar, which intermolecular forces it has, how many
 * hydrogen bonds it can make) is worked out from its structure in chem.js,
 * never typed here.
 *
 * Structures are drawn on a grid (x right, y down, one bond length = 1),
 * every atom and bond shown, as Lewis structures. Lone pairs are added by
 * chem.js (each atom gets an octet; H a doublet).
 *
 *   atoms  [element, x, y]
 *   bonds  [i, j, order]
 */

var ELEMENTS = {
  H:  { z: 1,  mass: 1.008,  en: 2.20, name: 'hydrogen' },
  He: { z: 2,  mass: 4.0026, en: null, name: 'helium' },
  C:  { z: 6,  mass: 12.011, en: 2.55, name: 'carbon' },
  N:  { z: 7,  mass: 14.007, en: 3.04, name: 'nitrogen' },
  O:  { z: 8,  mass: 15.999, en: 3.44, name: 'oxygen' },
  F:  { z: 9,  mass: 18.998, en: 3.98, name: 'fluorine' },
  Ne: { z: 10, mass: 20.180, en: null, name: 'neon' },
  Cl: { z: 17, mass: 35.45,  en: 3.16, name: 'chlorine' },
  Ar: { z: 18, mass: 39.948, en: null, name: 'argon' },
  Br: { z: 35, mass: 79.904, en: 2.96, name: 'bromine' },
  Kr: { z: 36, mass: 83.798, en: null, name: 'krypton' },
  I:  { z: 53, mass: 126.90, en: 2.66, name: 'iodine' },
  Xe: { z: 54, mass: 131.29, en: null, name: 'xenon' }
};

var SUBSTANCES = {};

/* The liquids, straight chains of 5 to 10 carbon atoms (none of
   them in the class's paper prelab). straightChain() lays them out like
   butane: carbons along a row, two H on each, an H or an O–H at each
   end, and a C=O in place of two H where `oxygenAt` says. Their melting and
   boiling points are real (CRC Handbook, 97th ed.). Names are IUPAC, in the
   style the class uses (2-propanone, 1,2,3-propanetriol). */
function straightChain(name, formula, mp, bp, n, opt) {
  opt = opt || {};
  var atoms = [], bonds = [], C = [];
  var x0 = opt.ohStart ? 1 : 0;
  if (opt.ohStart) { atoms.push(['O', 0, 0], ['H', -0.7, 0.7]); bonds.push([0, 1, 1]); }
  for (var i = 0; i < n; i++) {
    C.push(atoms.length);
    atoms.push(['C', x0 + i, 0]);
    if (i) bonds.push([C[i - 1], C[i], 1]);
  }
  if (opt.ohStart) bonds.push([0, C[0], 1]);
  C.forEach(function (c, i) {
    var x = x0 + i;
    if (i === opt.oxygenAt) { atoms.push(['O', x, -1]); bonds.push([c, atoms.length - 1, 2]); return; }
    [[x, -1], [x, 1]].forEach(function (q) { atoms.push(['H', q[0], q[1]]); bonds.push([c, atoms.length - 1, 1]); });
  });
  if (!opt.ohStart) { atoms.push(['H', x0 - 1, 0]); bonds.push([C[0], atoms.length - 1, 1]); }
  if (opt.ohEnd) {
    atoms.push(['O', x0 + n, 0]); bonds.push([C[n - 1], atoms.length - 1, 1]);
    atoms.push(['H', x0 + n + 0.7, -0.7]); bonds.push([atoms.length - 2, atoms.length - 1, 1]);
  } else { atoms.push(['H', x0 + n, 0]); bonds.push([C[n - 1], atoms.length - 1, 1]); }
  return { name: name, formula: formula, mp: mp, bp: bp, atoms: atoms, bonds: bonds };
}

SUBSTANCES.pentane = straightChain('pentane', 'C5H12', 143.45, 309.21, 5);
SUBSTANCES.heptane = straightChain('heptane', 'C7H16', 182.55, 371.53, 7);
SUBSTANCES.octane = straightChain('octane', 'C8H18', 216.35, 398.79, 8);
SUBSTANCES.decane = straightChain('decane', 'C10H22', 243.45, 447.25, 10);
SUBSTANCES.butanone = straightChain('2-butanone', 'C4H8O', 186.45, 352.75, 4, { oxygenAt: 1 });
SUBSTANCES.butanol = straightChain('1-butanol', 'C4H9OH', 183.35, 390.85, 4, { ohEnd: true });
SUBSTANCES.hexanol = straightChain('1-hexanol', 'C6H13OH', 228.55, 430.65, 6, { ohEnd: true });
SUBSTANCES.pentanediol = straightChain('1,5-pentanediol', 'C5H10(OH)2', 255.15, 512.15, 5, { ohStart: true, ohEnd: true });

/* The properties of those liquids, all at the same temperature (20 °C), for
   the validator and for the pace of the liquid bench only: students never
   see a number. Surface tension in mN/m, viscosity in mPa·s, vapour pressure
   (how readily it evaporates) in kPa; CRC Handbook and Yaws' handbook values,
   rounded. A comparison is only ever asked when the class's rule picks a
   winner AND these agree by a clear margin (tools/validate.js), so a small
   error in any value cannot flip an answer. */
var LIQUID = {
  pentane:     { st: 16.0, visc: 0.24, vp: 57.9 },
  heptane:     { st: 20.1, visc: 0.41, vp: 4.7 },
  octane:      { st: 21.6, visc: 0.54, vp: 1.4 },
  decane:      { st: 23.8, visc: 0.92, vp: 0.17 },
  butanone:    { st: 24.6, visc: 0.42, vp: 10.5 },
  butanol:     { st: 24.6, visc: 2.95, vp: 0.6 },
  hexanol:     { st: 25.8, visc: 5.4, vp: 0.11 },
  pentanediol: { st: 43.3, visc: 128, vp: 0.001 }
};

/* No everyday uses here: only organic class names are banned, and none is used. */
var EVERYDAY = {};

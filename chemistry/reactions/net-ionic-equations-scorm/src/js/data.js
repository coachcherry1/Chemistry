/* data.js: the sizes the beaker draws. No DOM.
 *
 * Every particle in the beaker is drawn to one scale, SCALE pixels per
 * picometre (pm), from these radii:
 *
 *   IONIC     Shannon effective ionic radii, six-coordinate, high-spin where
 *             that matters (Fe2+): R. D. Shannon, Acta Cryst. A32 (1976) 751.
 *             OH- (137 pm) and O2- (140 pm) are from the same table.
 *   COVALENT  Covalent radii of the atom at the centre of a polyatomic ion, and
 *             of H: B. Cordero et al., Dalton Trans. (2008) 2832 (C is the sp2
 *             value, as in carbonate).
 *   BOND      Bond lengths inside the polyatomic ions (typical values in
 *             crystals): N-O 126 in nitrate, C-O 129 in carbonate, S-O 149 in
 *             sulfate, P-O 154 in phosphate, O-H 97 in hydroxide, 96 in water.
 *
 * A polyatomic ion is drawn as a space-filling model: each oxygen at the
 * radius of the oxide ion (140 pm) at the real bond length from the centre,
 * the centre atom drawn over them at its covalent radius so it can be seen.
 * Sulfate and phosphate are tetrahedra seen along a two-fold axis (four
 * oxygens at 0.816 of the bond length); nitrate and carbonate are flat
 * triangles. The H of OH- and of water is drawn over the oxygen at its
 * covalent radius and the O-H bond length.
 *
 * One exception, said on screen: a bare H+ is a proton, with no electrons,
 * far smaller than any atom. It is drawn as a dot the size of a hydrogen
 * atom (31 pm) so that it can be seen.
 *
 * The validator checks every drawn sphere against these tables.
 */
var Data = (function () {
  'use strict';

  var IONIC = { Li: 76, Na: 102, K: 138, Ag: 115, Mg: 72, Ca: 100, Sr: 118, Ba: 135, Zn: 74, Fe: 78, Pb: 119, Cu: 73, Al: 53.5,
                Cl: 181, Br: 196, I: 220, OH: 137, O: 140 };
  var COVALENT = { H: 31, C: 73, N: 71, S: 105, P: 107 };
  var BOND = { NO3: 126, CO3: 129, SO4: 149, PO4: 154, OH: 97, HOH: 96 };
  var SCALE = 0.14;            /* px per pm */
  var SOURCE = 'Sizes to scale: Shannon ionic radii (1976); in polyatomic ions each O at 140 pm, the centre atom at its covalent radius.';

  /* the spheres of one particle, in pm, centred on 0,0: { r: outer radius, atoms: [{ el, r, x, y }] }
     key: an ion ('Na', 'Cl', 'SO4', 'OH', 'H' for H+) or 'HOH' (a water molecule) */
  function shape(key) {
    var atoms = [], i, a;
    function add(el, r, x, y) { atoms.push({ el: el, r: r, x: x, y: y }); }
    if (key === 'H') add('H', COVALENT.H, 0, 0);
    else if (key === 'OH') { add('O', IONIC.OH, 0, 0); add('H', COVALENT.H, BOND.OH * 0.71, -BOND.OH * 0.71); }
    else if (key === 'HOH') {
      add('O', IONIC.O, 0, 0);
      a = 104.5 * Math.PI / 360;
      add('H', COVALENT.H, -BOND.HOH * Math.sin(a), -BOND.HOH * Math.cos(a));
      add('H', COVALENT.H, BOND.HOH * Math.sin(a), -BOND.HOH * Math.cos(a));
    } else if (key === 'NO3' || key === 'CO3') {
      for (i = 0; i < 3; i++) { a = -Math.PI / 2 + i * 2 * Math.PI / 3; add('O', IONIC.O, BOND[key] * Math.cos(a), BOND[key] * Math.sin(a)); }
      add(key.charAt(0), COVALENT[key.charAt(0)], 0, 0);
    } else if (key === 'SO4' || key === 'PO4') {
      for (i = 0; i < 4; i++) { a = Math.PI / 4 + i * Math.PI / 2; add('O', IONIC.O, BOND[key] * 0.816 * Math.cos(a), BOND[key] * 0.816 * Math.sin(a)); }
      add(key.charAt(0), COVALENT[key.charAt(0)], 0, 0);
    } else if (IONIC[key]) add(key, IONIC[key], 0, 0);
    else throw new Error('no size for ' + key);
    var r = 0;
    atoms.forEach(function (t) { r = Math.max(r, Math.sqrt(t.x * t.x + t.y * t.y) + t.r); });
    return { r: r, atoms: atoms };
  }

  return { IONIC: IONIC, COVALENT: COVALENT, BOND: BOND, SCALE: SCALE, SOURCE: SOURCE, shape: shape };
})();

if (typeof module !== 'undefined') module.exports = Data;

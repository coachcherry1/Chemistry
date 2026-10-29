/* groups.js: the substituents that can sit on the ring, and the elements they
 * are drawn from.
 *
 * `bond` is the C–X bond length in ångströms. It is not decoration: the long
 * C–Cl and C–Br bonds are the reason those big atoms crowd the axial H atoms
 * so little, and the 3D model shows it.
 *
 * `kids` builds a group out of atoms for the 3D model: a methyl carbon carries
 * three H, an isopropyl carbon an H and two methyls, and so on. The first kid
 * is placed anti to the other group on the same ring carbon, which for an
 * axial group means pointing in over the ring. That is why an axial
 * isopropyl group turns its H toward the ring and an axial tert-butyl group
 * cannot avoid pointing a CH₃ there.
 *
 * The red and blue hydrogens let students track two positions through a ring
 * flip; for energy purposes they are ordinary H.
 *
 * R1 to R6 are the ring carbons themselves, used only as labels in the
 * Newman projections that look down a ring bond.
 */

var ELEMENTS = {
  H:  { color: '#f3f4f5', edge: '#8e979f', ball: 0.27, vdw: 1.10 },
  Hr: { color: '#e5473f', edge: '#8c1f19', ball: 0.31, vdw: 1.10 },
  Hb: { color: '#3d74e0', edge: '#1b3f8a', ball: 0.31, vdw: 1.10 },
  C:  { color: '#5a6168', edge: '#2b2f33', ball: 0.40, vdw: 1.70 },
  Cl: { color: '#36b14c', edge: '#1d6e2c', ball: 0.56, vdw: 1.75 },
  Br: { color: '#a8382c', edge: '#5e1b14', ball: 0.64, vdw: 1.85 }
};

var GROUPS = {
  H:   { label: 'H', name: 'H', el: 'H', bond: 1.09, strain: 'H' },
  Hr:  { label: 'H', name: 'red H', el: 'Hr', bond: 1.09, strain: 'H', tint: 'red' },
  Hb:  { label: 'H', name: 'blue H', el: 'Hb', bond: 1.09, strain: 'H', tint: 'blue' },
  CH3: { label: 'CH₃', name: 'CH₃', el: 'C', bond: 1.54, strain: 'CH3', kids: ['H', 'H', 'H'] },
  Cl:  { label: 'Cl', name: 'Cl', el: 'Cl', bond: 1.78, strain: 'Cl' },
  Br:  { label: 'Br', name: 'Br', el: 'Br', bond: 1.94, strain: 'Br' },
  iPr: { label: 'CH(CH₃)₂', name: 'isopropyl, CH(CH₃)₂', el: 'C', bond: 1.54, strain: 'iPr',
         kids: ['H', 'CH3', 'CH3'] },
  tBu: { label: 'C(CH₃)₃', name: 'tert-butyl, C(CH₃)₃', el: 'C', bond: 1.54, strain: 'tBu',
         kids: ['CH3', 'CH3', 'CH3'] }
};

[1, 2, 3, 4, 5, 6].forEach(function (n) {
  GROUPS['R' + n] = { label: 'C' + n, name: 'ring carbon C' + n, el: 'C', bond: 1.54, strain: 'ring', ring: n };
});

/* Text colour for a group's label in the 2D drawings. Hydrogen and carbon use
   the page's ink so they follow the theme; the halogens keep their 3D colours
   so the two views read as the same molecule. */
function groupTone(key) {
  if (key === 'Hr') return 'red';
  if (key === 'Hb') return 'blue';
  if (GROUPS[key] && GROUPS[key].ring) return 'ring';
  var el = GROUPS[key] && GROUPS[key].el;
  if (el === 'Cl' || el === 'Br') return el.toLowerCase();
  if (el === 'H') return 'h';
  return 'c';
}

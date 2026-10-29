/* molecules.js: every molecule in the activity, authored the way a student
 * sees it in a flat drawing of the ring: which carbon carries a group, and
 * whether it is on a wedge (top face, 't') or a dash (bottom face, 'b').
 * Every other position is H.
 *
 * Where each group sits in either chair (axial or equatorial) is then
 * COMPUTED by chair.js, never typed in. With the top face up, C1 is axial-up
 * in chair 1, so a group on C1's top face starts out axial.
 *
 * `shortName` is what the chips and figure captions use.
 */

var MOLECULES = (function () {
  'use strict';

  var M = {};

  function def(id, name, subs, extra) {
    M[id] = { id: id, name: name, subs: subs };
    Object.keys(extra || {}).forEach(function (k) { M[id][k] = extra[k]; });
  }

  def('cyclohexane', 'Cyclohexane', {});
  def('tracked', 'Cyclohexane', { 1: { t: 'Hr', b: 'Hb' } }, { note: 'red H on the top face of C1, blue H on its bottom face' });

  /* one group on C1, on the top face: axial in chair 1, equatorial in chair 2 */
  def('methyl', 'Methylcyclohexane', { 1: { t: 'CH3' } }, { group: 'CH3' });
  def('chloro', 'Chlorocyclohexane', { 1: { t: 'Cl' } }, { group: 'Cl' });
  def('bromo', 'Bromocyclohexane', { 1: { t: 'Br' } }, { group: 'Br' });
  def('isopropyl', 'Isopropylcyclohexane', { 1: { t: 'iPr' } }, { group: 'iPr' });
  def('tertbutyl', 'tert-Butylcyclohexane', { 1: { t: 'tBu' } }, { group: 'tBu' });

  /* two groups: cis = same face, trans = opposite faces */
  def('trans14', 'trans-1,4-Dimethylcyclohexane', { 1: { t: 'CH3' }, 4: { b: 'CH3' } }, { rel: 'trans' });
  def('cis14', 'cis-1,4-Dimethylcyclohexane', { 1: { t: 'CH3' }, 4: { t: 'CH3' } }, { rel: 'cis' });
  def('cis13', 'cis-1,3-Dimethylcyclohexane', { 1: { t: 'CH3' }, 3: { t: 'CH3' } }, { rel: 'cis' });
  def('trans13', 'trans-1,3-Dimethylcyclohexane', { 1: { t: 'CH3' }, 3: { b: 'CH3' } }, { rel: 'trans' });
  def('cisTM', 'cis-1-tert-Butyl-4-methylcyclohexane', { 1: { t: 'tBu' }, 4: { t: 'CH3' } }, { rel: 'cis' });
  def('transTM', 'trans-1-tert-Butyl-4-methylcyclohexane', { 1: { t: 'tBu' }, 4: { b: 'CH3' } }, { rel: 'trans' });

  /* the groups compared in Part 3, in the order students meet them */
  var SWAP_ORDER = ['Cl', 'Br', 'iPr', 'tBu'];
  var BY_GROUP = { CH3: 'methyl', Cl: 'chloro', Br: 'bromo', iPr: 'isopropyl', tBu: 'tertbutyl' };

  function groupAt(mol, c, f) {
    var s = mol.subs[c];
    return (s && s[f]) || 'H';
  }

  /* The non-H groups, as [{pos, g}], in carbon order. */
  function groups(mol) {
    var out = [];
    for (var c = 1; c <= 6; c++) ['t', 'b'].forEach(function (f) {
      var g = groupAt(mol, c, f);
      if (g !== 'H') out.push({ pos: c + f, g: g, c: c, f: f });
    });
    return out;
  }

  Object.defineProperty(M, 'SWAP_ORDER', { value: SWAP_ORDER });
  Object.defineProperty(M, 'BY_GROUP', { value: BY_GROUP });
  Object.defineProperty(M, 'groupAt', { value: groupAt });
  Object.defineProperty(M, 'groups', { value: groups });
  return M;
})();

function molecule(id) {
  var m = MOLECULES[id];
  if (!m) throw new Error('Unknown molecule ' + id);
  return m;
}

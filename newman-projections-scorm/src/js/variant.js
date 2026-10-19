/* variant.js — which of the two packages this is.
 *
 *   quantitative  checkpoint questions include calculations from the strain
 *                 table ("what is the energy of this conformation?")
 *   qualitative   the same activity, but every checkpoint question asks the
 *                 student to compare, rank or explain. The strain table sits
 *                 open beside the questions; no arithmetic is needed.
 *
 * build.sh writes this line for each package it builds. When index.html is
 * opened straight from disk, ?variant=qualitative previews the other one.
 */

var VARIANT = 'quantitative';

(function () {
  try {
    var v = new URLSearchParams(location.search).get('variant');
    if (v === 'qualitative' || v === 'quantitative') VARIANT = v;
  } catch (e) { /* no location (node tools) or an old browser */ }
})();

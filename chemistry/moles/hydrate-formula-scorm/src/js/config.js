/* config.js: the one script that differs between the three formula
 * packages. Everything else in src/js, src/css and tools/ is the same file in
 * empirical-molecular-formula-scorm/, hydrate-formula-scorm/ and
 * combustion-analysis-scorm/, and each validator checks that it still is: a
 * fix goes into all three.
 */
var CONFIG = {
  mode: 'hydrate',                              /* empirical, hydrate or combustion */
  store: 'hydrate-formula-state',               /* localStorage key, used only outside an LMS */
  minutes: 25
};

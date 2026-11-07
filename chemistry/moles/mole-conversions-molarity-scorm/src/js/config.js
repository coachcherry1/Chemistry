/* config.js: the one script that differs between the two mole conversion
 * packages. Everything else in src/js, src/css and tools/ is the same file in
 * mole-conversions-scorm/ and mole-conversions-molarity-scorm/, and each
 * validator checks that it still is: a fix goes into both.
 */
var CONFIG = {
  molarity: true,                               /* the L of solution road, mL and molarity problems */
  store: 'mole-conversions-molarity-state',     /* localStorage key, used only outside an LMS */
  minutes: 30
};

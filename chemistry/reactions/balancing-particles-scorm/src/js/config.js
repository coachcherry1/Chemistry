/* config.js: the one script that differs between the two balancing packages.
 * Every other file in src/js, src/css and tools/ is the same file in
 * balancing-particles-scorm/ and balancing-reaction-types-scorm/, and each
 * validator checks that it still is: a fix goes into both.
 */
var CONFIG = {
  classify: false,                              /* true: every graded reaction is also classified */
  store: 'balancing-particles-state',           /* localStorage key, used only outside an LMS */
  minutes: 30
};

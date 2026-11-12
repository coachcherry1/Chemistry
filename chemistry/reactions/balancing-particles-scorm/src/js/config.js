/* config.js: the one script that differs between the two balancing packages.
 * Everything else in src/js, src/css and tools/ is written to be shared with
 * the classifying package (balancing-reaction-types-scorm/, not built yet):
 * when it exists, a fix goes into both.
 */
var CONFIG = {
  classify: false,                              /* true: every graded reaction is also classified */
  store: 'balancing-particles-state',           /* localStorage key, used only outside an LMS */
  minutes: 25
};

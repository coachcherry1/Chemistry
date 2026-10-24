/* scorm.js — SCORM 1.2, the minimum.
 *
 * This is a drawing tool, not an assignment: it reports NO score and no
 * answers. When it opens inside an LMS it marks itself "completed" (so it
 * never shows as unfinished in a gradebook) and closes the session cleanly
 * when the page goes away. Opened straight from the files it does nothing.
 */

var SCORM = (function () {
  var api = null, connected = false, finished = false;

  function findAPI(win, depth) {
    while (win && depth-- > 0) {
      if (win.API) return win.API;
      if (win.parent === win) break;
      win = win.parent;
    }
    return null;
  }

  function init() {
    try {
      api = findAPI(window, 12);
      if (!api && window.opener && !window.opener.closed) api = findAPI(window.opener, 12);
    } catch (e) { api = null; }
    if (!api) return false;
    try {
      connected = api.LMSInitialize('') === 'true';
      if (connected && api.LMSGetValue('cmi.core.lesson_status') !== 'completed') {
        api.LMSSetValue('cmi.core.lesson_status', 'completed');
        api.LMSCommit('');
      }
    } catch (e) { connected = false; }
    return connected;
  }

  function finish() {
    if (!connected || finished) return;
    finished = true;
    try { api.LMSCommit(''); api.LMSFinish(''); } catch (e) { /* the LMS already closed it */ }
  }

  window.addEventListener('beforeunload', finish);
  window.addEventListener('pagehide', finish);

  return { init: init, finish: finish, isConnected: function () { return connected; } };
})();

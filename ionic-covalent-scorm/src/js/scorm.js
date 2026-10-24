/* scorm.js — minimal SCORM 1.2 run-time wrapper.
 *
 * This package reports COMPLETION ONLY: lesson_status becomes "completed" once
 * a student finishes the last level. No numeric grade is written, so the
 * Schoology column reads as complete / incomplete rather than a percent.
 *
 * If no LMS API is found the wrapper switches to a local no-op mode so the
 * activity still runs when index.html is opened straight from disk.
 */

var SCORM = (function () {
  var api = null, connected = false, finished = false;
  var started = Date.now();

  function findAPI(win, depth) {
    while (win && depth-- > 0) {
      if (win.API) return win.API;
      if (win.parent === win) break;
      win = win.parent;
    }
    return null;
  }

  function locate() {
    var found = findAPI(window, 12);
    if (!found && window.opener && !window.opener.closed) found = findAPI(window.opener, 12);
    return found;
  }

  function init() {
    try { api = locate(); } catch (e) { api = null; }
    if (!api) return false;
    try {
      connected = api.LMSInitialize('') === 'true';
      if (connected) {
        var status = api.LMSGetValue('cmi.core.lesson_status');
        if (!status || status === 'not attempted' || status === '') {
          api.LMSSetValue('cmi.core.lesson_status', 'incomplete');
          api.LMSCommit('');
        }
      }
    } catch (e) { connected = false; }
    return connected;
  }

  function get(key) {
    if (!connected) return '';
    try { return api.LMSGetValue(key) || ''; } catch (e) { return ''; }
  }

  function set(key, value) {
    if (!connected) return false;
    try { return api.LMSSetValue(key, String(value)) === 'true'; } catch (e) { return false; }
  }

  function commit() {
    if (!connected) return false;
    try { return api.LMSCommit('') === 'true'; } catch (e) { return false; }
  }

  /* HHHH:MM:SS.SS as SCORM 1.2 requires. */
  function sessionTime() {
    var total = Math.floor((Date.now() - started) / 1000);
    var hh = Math.floor(total / 3600);
    var mm = Math.floor(total % 3600 / 60);
    var ss = total % 60;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return pad(hh) + ':' + pad(mm) + ':' + pad(ss) + '.00';
  }

  /* suspend_data is capped at 4096 characters in SCORM 1.2.

     Inside the LMS, progress lives ONLY in cmi.suspend_data, which belongs to
     one learner's one attempt. localStorage belongs to the browser, so using
     it there would hand a reset attempt, or the next student on the same
     Chromebook, somebody else's progress. It is used only when there is no
     LMS (index.html opened straight from disk). */
  function saveState(obj) {
    var json;
    try { json = JSON.stringify(obj); } catch (e) { return false; }
    if (json.length > 4000) return false;
    if (!connected) {
      try { localStorage.setItem('ionic-covalent-state', json); } catch (e) { /* private mode */ }
      return false;
    }
    var ok = set('cmi.suspend_data', json);
    commit();
    return ok;
  }

  function loadState() {
    var json = '';
    if (connected) json = get('cmi.suspend_data');
    else {
      try { json = localStorage.getItem('ionic-covalent-state') || ''; } catch (e) { json = ''; }
    }
    if (!json) return null;
    try { return JSON.parse(json); } catch (e) { return null; }
  }

  function markComplete() {
    if (!connected) return false;
    set('cmi.core.lesson_status', 'completed');
    commit();
    return true;
  }

  function finish() {
    if (!connected || finished) return;
    finished = true;
    set('cmi.core.session_time', sessionTime());
    commit();
    try { api.LMSFinish(''); } catch (e) { /* LMS already tore the API down */ }
  }

  window.addEventListener('beforeunload', finish);
  window.addEventListener('pagehide', finish);

  return {
    init: init,
    isConnected: function () { return connected; },
    saveState: saveState,
    loadState: loadState,
    markComplete: markComplete,
    finish: finish,
    learnerName: function () { return get('cmi.core.student_name'); }
  };
})();

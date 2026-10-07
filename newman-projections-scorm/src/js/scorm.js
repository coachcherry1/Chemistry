/* scorm.js — minimal SCORM 1.2 run-time wrapper.
 *
 * This package reports a SCORE: the percentage of checkpoint questions the
 * student answered correctly on the first try, out of every graded question
 * in the activity. It is written after each answer, so a student who stops
 * halfway shows the credit they have earned so far. lesson_status becomes
 * "completed" when the student reaches the results screen.
 *
 * Each graded answer is also written as a cmi.interactions record (question
 * id, the letter chosen, right or wrong), for LMS reports that show them.
 *
 * If no LMS API is found the wrapper switches to a local no-op mode so the
 * activity still runs when index.html is opened straight from disk.
 */

var SCORM = (function () {
  var api = null, connected = false, finished = false;
  var started = Date.now();
  var STORE = 'newman-state';

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

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* HHHH:MM:SS.SS as SCORM 1.2 requires. */
  function sessionTime() {
    var total = Math.floor((Date.now() - started) / 1000);
    return pad(Math.floor(total / 3600)) + ':' + pad(Math.floor(total % 3600 / 60)) + ':' + pad(total % 60) + '.00';
  }

  /* suspend_data is capped at 4096 characters in SCORM 1.2. */
  function saveState(obj) {
    var json;
    try { json = JSON.stringify(obj); } catch (e) { return false; }
    if (json.length > 4000) return false;
    try { localStorage.setItem(STORE, json); } catch (e) { /* private mode */ }
    if (!connected) return false;
    var ok = set('cmi.suspend_data', json);
    commit();
    return ok;
  }

  function loadState() {
    var json = get('cmi.suspend_data');
    if (!json) {
      try { json = localStorage.getItem(STORE) || ''; } catch (e) { json = ''; }
    }
    if (!json) return null;
    try { return JSON.parse(json); } catch (e) { return null; }
  }

  function clearLocal() {
    try { localStorage.removeItem(STORE); } catch (e) { /* private mode */ }
  }

  /* raw is 0–100. */
  function setScore(raw) {
    if (!connected) return false;
    set('cmi.core.score.min', '0');
    set('cmi.core.score.max', '100');
    var ok = set('cmi.core.score.raw', Math.max(0, Math.min(100, Math.round(raw))));
    commit();
    return ok;
  }

  function recordAnswer(id, chosen, correctLetter, right) {
    if (!connected) return false;
    var n = parseInt(get('cmi.interactions._count'), 10);
    if (isNaN(n)) n = 0;
    var p = 'cmi.interactions.' + n + '.';
    var now = new Date();
    set(p + 'id', id);
    set(p + 'type', 'choice');
    set(p + 'time', pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()));
    set(p + 'correct_responses.0.pattern', correctLetter);
    set(p + 'student_response', chosen);
    set(p + 'result', right ? 'correct' : 'wrong');
    return commit();
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
    clearLocal: clearLocal,
    setScore: setScore,
    recordAnswer: recordAnswer,
    markComplete: markComplete,
    finish: finish,
    learnerName: function () { return get('cmi.core.student_name'); }
  };
})();

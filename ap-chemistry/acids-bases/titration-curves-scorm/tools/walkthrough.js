/* tools/walkthrough.js: plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *   DARK=1 ...                           # the same in dark mode
 *
 * It answers every prediction (some wrong on purpose) and checks that the
 * particle diagram on screen matches the model at every point, walks both
 * titrations and explores them with the slider, compares them side by side,
 * clicks the wrong particle before the right one, sorts and matches wrongly
 * first, moves the marker to the wrong place before the right one, answers
 * one core question per checkpoint wrongly on purpose, reloads halfway, and
 * finally checks what reached the "LMS": the score, the completion status and
 * the interaction records. Before all that it checks that a save from another
 * release, or one the browser kept, is ignored; at the end it starts a second
 * attempt and checks the gradebook keeps the best.
 */
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
  catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); }
}

const URL = 'file://' + path.join(__dirname, '..', 'src', 'index.html');
const STORE = 'titration-curves-state';
const SHOTS = process.env.SHOTS;
const WRONG = new Set(['a-equiv-def', 'b-half-pka', 'c-which-particle', 'd-curve-is', 'e-eq-side']);

/* The fake LMS keeps its data in sessionStorage and reads and writes it on
   every call, never from a copy in the page. */
const fakeLMS = () => {
  const read = () => JSON.parse(sessionStorage.getItem('lms') || '{}');
  window.API = {
    LMSInitialize: () => 'true',
    LMSFinish: () => 'true',
    LMSGetValue: (k) => {
      const data = read();
      if (k === 'cmi.interactions._count') {
        return String(Object.keys(data).filter((x) => /^cmi\.interactions\.\d+\.id$/.test(x)).length);
      }
      return data[k] || '';
    },
    LMSSetValue: (k, v) => { const data = read(); data[k] = v; sessionStorage.setItem('lms', JSON.stringify(data)); return 'true'; },
    LMSCommit: () => 'true',
    LMSGetLastError: () => '0'
  };
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, colorScheme: process.env.DARK ? 'dark' : 'light' });
  const problems = [];
  page.on('pageerror', (e) => problems.push('page error: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  await page.addInitScript(fakeLMS);
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const expect = (cond, msg) => { if (!cond) problems.push(msg); };
  const feedback = () => page.textContent('#feedback');
  const fbClass = () => page.getAttribute('#feedback', 'class');
  const stepId = () => page.evaluate(() => App.STEPS[+document.getElementById('counter').textContent.match(/\d+/)[0] - 1].id);
  let shot = 0;
  async function snap(name) {
    if (!SHOTS) return;
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(SHOTS, String(++shot).padStart(2, '0') + '-' + name + '.png'), fullPage: true });
  }
  let nexts = 0;
  async function next() {
    const id = await stepId();
    const ok = await page.waitForFunction(() => !document.getElementById('next').disabled, null, { timeout: 8000 })
      .then(() => true, () => false);
    if (!ok) {
      console.error('Stopped: Next is still disabled on ' + id + '. Feedback: ' + (await feedback()));
      if (problems.length) console.error(problems.join('\n'));
      await browser.close();
      process.exit(1);
    }
    await snap(id);
    await page.click(++nexts % 2 ? '#nextTop' : '#next');
    const [bottom, top] = [await page.isDisabled('#next'), await page.isDisabled('#nextTop')];
    expect(bottom === top, 'top and bottom Next disagree on ' + (await stepId()));
  }
  const saved = () => page.evaluate(() => JSON.parse(JSON.parse(sessionStorage.getItem('lms'))['cmi.suspend_data']));

  /* what the diagram on screen shows, counted from the page */
  const diagram = (selector) => page.evaluate((sel) => {
    const root = document.querySelector(sel) || document;
    const n = (c) => root.querySelectorAll('.pbox-svg .' + c + ':not(.off)').length;
    return { H: n('p-h'), Na: n('p-na'), OH: n('p-oh'), A: n('p-a'), HA: n('p-ha') };
  }, selector);
  async function diagramMatches(sys, u, selector, what) {
    const want = await page.evaluate(([s, x]) => Titration.counts(s, x), [sys, u]);
    const got = await diagram(selector);
    ['H', 'Na', 'OH', 'A', 'HA'].forEach((k) => {
      if (sys === 'SS' && k === 'HA') return;
      expect(got[k] === want[k], `${what}: ${k} drawn ${got[k]}, model ${want[k]}`);
    });
  }

  /* ---- fresh start */
  async function startsFresh(lmsVersion, browserVersion, what) {
    await page.evaluate((a) => {
      const draws = {};
      Object.keys(QUIZZES).forEach((k) => { draws[k] = QUIZZES[k].pool.slice(0, QUIZZES[k].draw).map((q) => q.id); });
      const old = (v) => JSON.stringify({ v: v, seed: 1, step: 7, max: 9, draws: draws, ans: { 'a-equiv-def': 1 }, pick: {},
                                          done: { setup: 1 }, wk: {}, seen: {}, fin: 0, best: 61, att: 1 });
      const lms = { 'cmi.core.score.raw': '61', 'cmi.core.lesson_status': 'incomplete' };
      if (a.lms != null) lms['cmi.suspend_data'] = old(a.lms);
      window.API.LMSSetValue = () => 'true';
      sessionStorage.setItem('lms', JSON.stringify(lms));
      localStorage.clear();
      if (a.browser != null) localStorage.setItem(a.key, old(a.browser));
    }, { lms: lmsVersion, browser: browserVersion, key: STORE });
    await page.reload();
    await page.click('.screen .primary');
    expect((await stepId()) === 'setup', what + ' was resumed at ' + (await stepId()));
    const clean = await saved();
    expect(Object.keys(clean.ans).length === 0 && Object.keys(clean.done).length === 0, what + ': old answers carried over');
  }
  await startsFresh(99, null, 'a save from another release');
  await startsFresh(null, await page.evaluate(() => App.SCHEMA), 'a browser save inside the LMS');

  /* ---- Part 1: setup */
  expect(await page.isDisabled('#next'), 'setup: Next enabled before the prediction');
  await page.click('.predict .choice >> nth=1');
  expect(!!(await page.$('.after-q .reveal')), 'setup: no explanation after the prediction');
  expect((await page.$$('.predict .choice.right')).length === 1, 'setup: the right answer is not marked');
  await diagramMatches('SS', 0, '.pflask', 'setup diagram');
  await next();

  /* ---- a walk through five points */
  async function walk(sys, wrongAt) {
    const id = await stepId();
    expect(await page.isDisabled('#next'), `${id}: Next enabled before the walk`);
    for (let k = 0; k < 5; k++) {
      const pt = await page.evaluate((i) => Titration.POINTS[i], k);
      expect((await page.textContent('.walk-where')).includes(`Point ${k + 1} of 5`), `${id}: not on point ${k + 1}`);
      if (k === 0) {
        const blank = await diagram('.pflask');
        expect(blank.H + blank.Na + blank.OH + blank.A + blank.HA === 0, `${id}: the flask is not empty before the first prediction`);
      } else {
        await diagramMatches(sys, (await page.evaluate((i) => Titration.POINTS[i], k - 1)).u, '.pflask', `${id} before point ${k + 1}`);
      }
      /* what is in the flask: the right choice is the one that matches the model's list */
      const want = await page.evaluate(([s, u]) => Titration.flask(s, u), [sys, pt.u]);
      const texts = await page.$$eval('.walk-q > .predict .choice-text', (n) => n.map((x) => x.textContent));
      expect(texts.includes(want), `${id} point ${k + 1}: the right list is not offered`);
      const idx = texts.indexOf(want) + (wrongAt === k ? 1 : 0);
      await page.click(`.walk-q > .predict .choice >> nth=${wrongAt === k ? (texts.indexOf(want) + 1) % texts.length : idx}`);
      await diagramMatches(sys, pt.u, '.pflask', `${id} point ${k + 1}`);
      expect(!!(await page.$('.walk-q .walk-done')) && !!(await page.$('.pflask .reveal')), `${id} point ${k + 1}: no summary line or no story under the flask`);
      /* what decides the pH */
      const kind = await page.evaluate(([s, u]) => Titration.setter(s, u), [sys, pt.u]);
      const rightText = await page.evaluate(([s, kd]) => Titration.setterChoice(s, kd), [sys, kind]);
      const t2 = await page.$$eval('.walk-q2 .choice-text', (n) => n.map((x) => x.textContent));
      expect(t2.includes(rightText), `${id} point ${k + 1}: the right setter is not offered`);
      expect(await page.textContent('.ph-read') !== `pH ${(await page.evaluate(([s, u]) => Titration.pH(s, u).toFixed(2), [sys, pt.u]))} after ${(await page.evaluate((u) => Titration.volume(u).toFixed(2), pt.u))} mL of NaOH`,
        `${id} point ${k + 1}: the pH was shown before the second prediction`);
      await page.click(`.walk-q2 .choice >> nth=${t2.indexOf(rightText)}`);
      const phNow = await page.evaluate(([s, u]) => Titration.pH(s, u).toFixed(2), [sys, pt.u]);
      expect((await page.textContent('.ph-read')).includes('pH ' + phNow), `${id} point ${k + 1}: pH reading is not ${phNow}`);
      if (sys === 'WS' && k === 3) expect(/1 F⁻ in 57,917/.test(await page.textContent('.pcurve .reveal')), `${id}: no 1-in-57,917 note at equivalence`);
      if (sys === 'WS' && k === 1) expect(/pKa of HF, 3\.17/.test(await page.textContent('.pcurve .reveal')), `${id}: half-equivalence does not name the pKa`);
      if (sys === 'WS' && k === 2) {
        /* a reload here comes back to the next point */
        await page.reload();
        await page.click('.screen .primary');
        expect((await stepId()) === id, 'reload mid-walk: resumed at ' + (await stepId()));
        expect((await page.textContent('.walk-where')).includes('Point 4 of 5'), 'reload mid-walk: not on point 4: ' + (await page.textContent('.walk-where')));
        await diagramMatches(sys, 18, '.pflask', 'reload mid-walk diagram');
        continue;
      }
      await page.click('[data-walk-next]');
    }
    expect(!!(await page.$('.thermo-range')), `${id}: no slider after the five points`);
    /* explore */
    for (const u of [0, 12, 24, 36]) {
      await page.$eval('.thermo-range', (el, v) => { el.value = v; el.dispatchEvent(new Event('input')); }, String(u));
      await diagramMatches(sys, u, '.pflask', `${id} slider at ${u}`);
    }
    expect(!(await page.isDisabled('#next')), `${id}: Next still disabled after the walk`);
  }
  await walk('SS', 1);
  await next();

  async function quiz() {
    const id = await stepId();
    for (;;) {
      const q = await page.$('.quiz .choice');
      if (!q) break;
      const qid = await page.evaluate(() => {
        const t = document.querySelector('.quiz .q-text').textContent;
        for (const k in QUIZZES) for (const q of QUIZZES[k].pool) if (q.q === t) return q.id;
        return null;
      });
      expect(qid, `${id}: question not found in the bank`);
      await page.click(`.quiz .choice[data-choice="${WRONG.has(qid) ? 1 : 0}"]`);
      await page.click('.quiz .btnrow .primary');
    }
    expect(/Checkpoint finished/.test(await feedback()), `${id}: checkpoint did not finish`);
  }
  await quiz();
  await page.reload();
  await page.click('.screen .primary');
  expect((await stepId()) === 'quiz-A', 'reload: resumed at ' + (await stepId()));
  await next();

  /* ---- Part 2 */
  expect(await page.isDisabled('#next'), 'compare: Next enabled before the prediction');
  await page.click('.predict .choice >> nth=1');
  expect((await page.$$('.cmp-col')).length === 2, 'compare: both flasks not shown');
  await diagramMatches('WS', 0, '.cmp-col:nth-child(2)', 'compare HF flask');
  await next();
  await walk('WS', 3);
  await next();

  /* side by side */
  const chips = await page.$$eval('.walk-chips .chip', (n) => n.length);
  expect(chips === 5, 'side: five point buttons expected');
  for (let i = 0; i < 5; i++) {
    expect(await page.isDisabled('#next'), `side: finished after only ${i} points`);
    await page.click(`.walk-chips .chip >> nth=${i}`);
    const u = await page.evaluate((k) => Titration.POINTS[k].u, i);
    await diagramMatches('SS', u, '.row-side .pflask:nth-of-type(2)', `side HCl at point ${i + 1}`);
  }
  await next();
  await quiz();
  await next();

  /* ---- Part 3 */
  const col = (n) => `.row-why .pflask:nth-child(${n})`;
  await page.click(`${col(1)} .ptc-Na`);
  expect((await fbClass()).includes('bad') && /strong base/.test(await feedback()), 'why: Na+ accepted, or no reason given');
  await page.click(`${col(1)} .ptc-H`);
  expect(/no H⁺ left/.test(await feedback()), 'why: an empty H+ was not explained');
  await page.click(`${col(1)} .ptc-A`);
  expect(/too weak a base/.test(await feedback()), 'why: Cl- was not explained');
  await page.click(`${col(2)} button:has-text("None of these")`);
  expect((await fbClass()).includes('bad') && /conjugate base of a weak acid/.test(await feedback()), 'why: "none" accepted for HF');
  expect(await page.isDisabled('#next'), 'why: finished too early');
  await page.click(`${col(1)} button:has-text("None of these")`);
  expect((await fbClass()).includes('good'), 'why: "none" refused for HCl');
  await page.click(`${col(2)} .ptc-A`);
  expect((await fbClass()).includes('good'), 'why: F- refused for HF');
  expect(!!(await page.$('.why-react .preact')), 'why: no reaction shown at the end');
  await next();

  /* pairs: a wrong sort first */
  await page.click('.tile[data-tile="hf-naoh"]');
  await page.click('.bin[data-drop="equal"]');
  expect((await fbClass()).includes('bad') && /weak acid/.test(await feedback()), 'pairs: a weak acid in "exactly 7" was accepted');
  await page.click('.tile[data-tile="hbr-koh"]');
  await page.click('.bin[data-drop="above"]');
  expect((await fbClass()).includes('bad') && /strong acid/.test(await feedback()), 'pairs: a strong acid in "above 7" was accepted');
  const pairs = await page.evaluate(() => Titration.PAIRS.map((p) => [p.id, Titration.pairSide(p)]));
  for (const [id, side] of pairs) {
    await page.click(`.tile[data-tile="${id}"]`);
    await page.click(`.bin[data-drop="${side}"]`);
  }
  await next();
  await quiz();
  await next();

  /* ---- Part 4: match */
  const pts = await page.evaluate(() => Titration.POINTS.map((p) => p.id));
  await page.click('.tile[data-tile="after"]');
  await page.click('.match-slot[data-drop="start"]');
  expect((await fbClass()).includes('bad') && /30 Na⁺/.test(await feedback()), 'match: a wrong drop was accepted, or not explained');
  for (const id of pts) {
    await page.click(`.tile[data-tile="${id}"]`);
    await page.click(`.match-slot[data-drop="${id}"]`);
  }
  await next();

  /* find the points on the curves */
  const weakLetter = await page.$eval('.clabel-curve.cl-ws', (n) => n.textContent);
  await page.click(`[data-curve="${weakLetter === 'A' ? 'B' : 'A'}"]`);
  expect((await fbClass()).includes('bad'), 'find: the strong curve was accepted as the weak acid');
  await page.click(`[data-curve="${weakLetter}"]`);
  const press = async (key, n) => { await page.focus('.chit'); for (let i = 0; i < n; i++) await page.keyboard.press(key); };
  await page.click('[data-check]');
  expect((await fbClass()).includes('bad') && /Place the marker/.test(await feedback()), 'find: checked with no marker');
  await press('ArrowRight', 20);
  await page.click('[data-check]');
  expect((await fbClass()).includes('bad') && /Too late|equivalence point/.test(await feedback()), 'find: the wrong half-equivalence point was accepted');
  await press('ArrowLeft', 8);
  await page.click('[data-check]');
  expect((await fbClass()).includes('good'), 'find: the right half-equivalence point was refused: ' + (await feedback()));
  /* each round starts with a fresh marker */
  await press('ArrowRight', 24);
  await page.click('[data-check]');
  expect((await fbClass()).includes('good'), 'find: equivalence point (HF) refused: ' + (await feedback()));
  await press('ArrowRight', 24);
  await page.click('[data-check]');
  expect((await fbClass()).includes('good'), 'find: equivalence point (HCl) refused: ' + (await feedback()));
  expect(!!(await page.$('.row-find .reveal')), 'find: no closing note');
  await next();
  await quiz();
  await next();

  /* ---- Part 5 */
  expect((await stepId()) === 'quiz-E', 'not at the review: ' + (await stepId()));
  expect(/Ka|pKa/.test(await page.textContent('.quiz-table')) && /4\.74/.test(await page.textContent('.quiz-table')), 'review: the acetic acid row is missing from the table');
  await quiz();
  await next();

  /* ---- results */
  expect((await stepId()) === 'results', 'did not reach results');
  const lms = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lms')));
  const graded = await page.evaluate(() => App.GRADED);
  const expected = Math.round(100 * (graded - WRONG.size) / graded);
  expect(lms['cmi.core.lesson_status'] === 'completed', 'LMS status ' + lms['cmi.core.lesson_status']);
  expect(+lms['cmi.core.score.raw'] === expected, `LMS score ${lms['cmi.core.score.raw']}, expected ${expected}`);
  const nInt = Object.keys(lms).filter((k) => /^cmi\.interactions\.\d+\.id$/.test(k)).length;
  expect(nInt === graded, `${nInt} interaction records, expected ${graded}`);
  expect(lms['cmi.suspend_data'].length < 2000, 'suspend_data is ' + lms['cmi.suspend_data'].length + ' characters');
  console.log(`Results screen: ${(await page.textContent('.big-score')).trim()}`);
  console.log(`LMS: status=${lms['cmi.core.lesson_status']} score.raw=${lms['cmi.core.score.raw']} interactions=${nInt} suspend_data=${lms['cmi.suspend_data'].length} chars`);

  await page.click('button:has-text("Start a new attempt")');
  await page.click('button:has-text("Yes, start again")');
  expect((await stepId()) === 'setup', 'retry: did not restart at step 1');
  const s2 = await saved();
  expect(Object.keys(s2.ans).length === 0 && s2.att === 2, 'retry: attempt not cleared');
  const lms2 = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lms')));
  expect(+lms2['cmi.core.score.raw'] === expected, 'retry: gradebook score dropped to ' + lms2['cmi.core.score.raw']);
  console.log(`Retry: attempt ${s2.att} started clean; gradebook kept ${lms2['cmi.core.score.raw']}%`);

  await browser.close();
  if (problems.length) {
    console.error(problems.length + ' problem(s):\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  console.log('Walkthrough passed.');
})();

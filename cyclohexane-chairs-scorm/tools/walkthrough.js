/* tools/walkthrough.js: plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *   DARK=1 ...                           # the same in dark mode
 *
 * It answers some checkpoint questions wrongly on purpose, makes wrong
 * labels, wrong builds, wrong clicks and a wrong lock-in, reloads the page
 * halfway to check that progress resumes, and finally checks what reached
 * the "LMS": the score, the completion status and the interaction records.
 * Before all that it checks that a save from another release, or one the
 * browser kept from another copy of the package, is ignored and the student
 * starts fresh. At the end it starts a second attempt and checks that the
 * gradebook keeps the best score.
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
const STORE = 'chairs-state';
const SHOTS = process.env.SHOTS;
/* answered wrongly on purpose: one core question per checkpoint */
const WRONG = new Set(['a-spot-axial', 'b-up-stays', 'c-rank', 'd-match']);

const fakeLMS = () => {
  /* What the LMS should hold for the next load is staged in 'lms-next': writing
     'lms' directly is undone by the page being unloaded, whose finish() saves
     its own copy on the way out. */
  const staged = sessionStorage.getItem('lms-next');
  if (staged != null) { sessionStorage.setItem('lms', staged); sessionStorage.removeItem('lms-next'); }
  const data = JSON.parse(sessionStorage.getItem('lms') || '{}');
  const save = () => sessionStorage.setItem('lms', JSON.stringify(data));
  window.API = {
    LMSInitialize: () => 'true',
    LMSFinish: () => 'true',
    LMSGetValue: (k) => {
      if (k === 'cmi.interactions._count') {
        return String(Object.keys(data).filter((x) => /^cmi\.interactions\.\d+\.id$/.test(x)).length);
      }
      return data[k] || '';
    },
    LMSSetValue: (k, v) => { data[k] = v; save(); return 'true'; },
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
  const stepId = () => page.evaluate(() => App.STEPS[+document.getElementById('counter').textContent.match(/\d+/)[0] - 1].id);
  let shot = 0;
  async function snap(name) {
    if (!SHOTS) return;
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(SHOTS, String(++shot).padStart(2, '0') + '-' + name + '.png'), fullPage: true });
  }
  async function next() {
    const id = await stepId();
    expect(!(await page.isDisabled('#next')), 'Next is still disabled on ' + id);
    await snap(id);
    await page.click('#next');
  }
  async function setRange(sel, v) {
    await page.$eval(sel, (el, val) => { el.value = val; el.dispatchEvent(new Event('input')); }, v);
  }
  async function fb(re, what) {
    const t = await feedback();
    expect(re.test(t), what + ': ' + t);
  }
  const saved = () => page.evaluate(() => JSON.parse(JSON.parse(sessionStorage.getItem('lms'))['cmi.suspend_data']));
  const target = (pos) => `.chdrop[data-drop="${pos}"]`;

  /* ---- fresh start: a save from another release in the LMS, then a current
     save the browser kept from another copy of the package; neither may be resumed */
  async function startsFresh(lmsVersion, browserVersion, what) {
    await page.evaluate((a) => {
      const draws = {};
      Object.keys(QUIZZES).forEach((k) => { draws[k] = QUIZZES[k].pool.slice(0, QUIZZES[k].draw).map((q) => q.id); });
      const ans = {};
      ans[draws[Object.keys(draws)[0]][0]] = 0;
      const old = (v) => JSON.stringify({ v: v, seed: 1, step: 9, max: 12, draws: draws, ans: ans, pick: {},
                                          pr: {}, done: { meet: 1 }, fin: 0, best: 61, att: 1 });
      const lms = { 'cmi.core.score.raw': '61', 'cmi.core.lesson_status': 'incomplete' };
      if (a.lms != null) lms['cmi.suspend_data'] = old(a.lms);
      sessionStorage.setItem('lms-next', JSON.stringify(lms));
      localStorage.clear();
      if (a.browser != null) localStorage.setItem(a.key, old(a.browser));
    }, { lms: lmsVersion, browser: browserVersion, key: STORE });
    await page.reload();
    await page.click('.screen .primary');
    expect((await stepId()) === 'meet', what + ' was resumed at ' + (await stepId()));
    const clean = await saved();
    expect(clean.v === (await page.evaluate(() => App.SCHEMA)), what + ': save not rewritten with the current schema');
    expect(Object.keys(clean.ans).length === 0 && Object.keys(clean.done).length === 0, what + ': old answers carried over');
    expect(clean.best === 0 && clean.att === 1 && clean.max === 0, what + ': old score or progress carried over');
  }
  const schema = await page.evaluate(() => App.SCHEMA);
  await startsFresh(schema + 1, null, 'a save from another release in the LMS');
  await startsFresh(null, schema, 'a save left in the browser by another copy');
  console.log('Fresh start: another release\'s LMS save and a leftover browser save are both ignored');
  await page.evaluate(() => { sessionStorage.setItem('lms-next', '{}'); localStorage.clear(); });
  await page.reload();
  await page.click('.screen .primary');

  async function quiz(sideTable) {
    expect(!!(await page.$('.quiz-table[open] table')) === sideTable,
      'checkpoint ' + (sideTable ? 'has no' : 'should not have an') + ' A-value table beside it');
    for (;;) {
      const btn = await page.$('.quiz .choice');
      if (!btn) break;
      const id = await page.evaluate(() => {
        const t = document.querySelector('.q-text').textContent;
        for (const k in App.QZ) for (const q of App.QZ[k].pool) if (q.q === t) return q.id;
        return null;
      });
      const pick = WRONG.has(id) ? 1 : 0;
      await page.click(`.quiz .choice[data-choice="${pick}"]`);
      expect(!(await page.isHidden('.q-why')), 'no explanation after answering ' + id);
      await page.click('.quiz .btnrow .primary');
    }
    await fb(/Checkpoint finished/, 'checkpoint did not finish');
  }

  async function place(groupName, pos) {
    await page.click(`.tray .tile[aria-label="Group ${groupName}"] >> nth=0`);
    await page.click(target(pos));
  }

  /* ---- Part 1 */
  await page.click('.predict .choice >> nth=0');
  for (const b of ['Side view', 'Top view', 'Down the C1–C2 bond']) await page.click(`button:has-text("${b}")`);
  await page.waitForTimeout(800);
  await fb(/most stable shape/, 'meet did not complete');
  await next();

  await page.click('.predict .choice >> nth=1');
  await page.click('button:has-text("Down the C2–C3 bond") >> nth=1');
  await page.waitForTimeout(800);
  await fb(/flagpole/, 'boat did not complete');
  expect(/twist-boat/.test(await page.textContent('.reveal')), 'boat reveal does not name the twist-boat');
  await next();

  /* label: one wrong, then every H */
  const axialPos = await page.evaluate(() => CHAIR.POSITIONS.filter((p) => CHAIR.isAxial(p, 0)));
  const eqPos = await page.evaluate(() => CHAIR.POSITIONS.filter((p) => !CHAIR.isAxial(p, 0)));
  await page.click('.tray .tile[data-tile="1"]');
  await page.click(target(axialPos[0]));
  await fb(/Not equatorial/, 'wrong label not explained');
  await page.click('.tray .tile[data-tile="0"]');
  for (const p of axialPos) await page.click(target(p));
  await page.click('.tray .tile[data-tile="1"]');
  for (const p of eqPos) await page.click(target(p));
  await fb(/All twelve/, 'labels not completed');
  await next();

  /* up or down: two predictions, one wrong click, six right ones */
  await page.click('.predict >> nth=0 >> .choice >> nth=1');
  await page.click('.predict >> nth=1 >> .choice >> nth=0');
  await page.click(target('2b'));
  await fb(/points down/, 'wrong up/down click not explained');
  for (const p of ['1t', '2t', '3t', '4t', '5t', '6t']) await page.click(target(p));
  await fb(/All six/, 'up/down not completed');
  await next();

  await quiz(false); await next();

  /* ---- Part 2 */
  await page.click('.predict .choice >> nth=1');
  await setRange('.flip-range', 50);
  expect(/Part way/.test(await page.textContent('.readout')), 'flip readout does not describe the in-between shapes');
  await setRange('.flip-range', 100);
  await fb(/Axial becomes equatorial/, 'flip did not complete');
  expect(/Chair 2.*Red H: equatorial, pointing slightly up/.test(await page.textContent('.readout')), 'flip readout wrong at chair 2');
  expect(/You predicted/.test(await page.textContent('.reveal')), 'flip reveal does not mention the prediction');
  await next();

  await place('CH₃', '1b'); await place('H', '1t');
  await page.click('button:has-text("Check")');
  await fb(/wrong face/, 'wrong flip build not explained');
  await page.click('button:has-text("Clear")');
  await place('CH₃', '1t'); await place('H', '1b');
  await page.click('button:has-text("Check")');
  await fb(/Correct/, 'correct flip build not accepted');
  await next();

  await quiz(false); await next();

  /* ---- resume: reload in the middle and make sure we come back here */
  const before = await stepId();
  await page.reload();
  await page.click('.screen .primary');
  expect((await stepId()) === before, 'resume went to ' + (await stepId()) + ' instead of ' + before);

  /* ---- Part 3 */
  await page.click(target('2t'));
  await fb(/equatorial/, 'wrong crowd click not explained');
  await page.click(target('4b'));
  await fb(/points down/, 'wrong crowd click (axial, down) not explained');
  await page.click(target('3t'));
  await page.click(target('5t'));
  await fb(/1,3-diaxial/, 'crowd step did not complete');
  await next();

  await page.click('.predict .choice >> nth=0');
  await setRange('.flip-range', 100);
  await page.click('.predict >> nth=1 >> .choice >> nth=0');
  await fb(/19 in 20/, 'compare step did not complete');
  expect(await page.$('.share-bar'), 'compare step shows no share bar');
  await next();

  await page.click('.predict .choice >> nth=0');
  await page.click('.predict >> nth=1 >> .choice >> nth=1');
  await fb(/two ring carbons/, 'newman step did not complete');
  expect((await page.$$('.newman')).length === 3, 'newman step should show three Newman projections');
  await next();

  for (let i = 0; i < 4; i++) {
    await page.click('.predict .choice >> nth=0');
    if (i < 3) await page.click('button:has-text("Next group")');
  }
  await fb(/weakest to strongest/, 'swap step did not complete');
  const rows = await page.$$eval('.swap-table tr', (r) => r.length);
  expect(rows === 6, 'swap table has ' + rows + ' rows');
  await next();

  await quiz(true); await next();

  /* ---- Part 4 */
  await place('CH₃', '1b'); await place('H', '1t'); await place('CH₃', '4b'); await place('H', '4t');
  await page.click('button:has-text("Check")');
  await fb(/wrong face.*wedge/, 'wrong flat build not explained');
  await page.click('button:has-text("Clear")');
  await place('CH₃', '1t'); await place('H', '1b'); await place('H', '4t'); await place('CH₃', '4b');
  await page.click('button:has-text("Check")');
  await fb(/Correct/, 'correct flat build not accepted');
  await next();

  await page.click('.predict >> nth=0 >> .choice >> nth=0');
  await page.click('.predict >> nth=0 >> .choice >> nth=0');
  const ranges = await page.$$('.flip-range');
  expect(ranges.length === 2, 'pair step should have two flip sliders');
  await setRange('.flip-range >> nth=0', 100);
  await setRange('.flip-range >> nth=1', 100);
  await page.click('.predict .choice >> nth=0');
  await fb(/cis-1,4: one axial either way/, 'pair step did not complete');
  await next();

  await page.click('.predict .choice >> nth=1');
  await page.click('button:has-text("Lock in this chair")');
  await fb(/Not this one/, 'wrong lock-in accepted');
  await setRange('.flip-range', 100);
  await page.click('button:has-text("Lock in this chair")');
  await fb(/Locked in/, 'better chair not accepted');
  await page.click('button:has-text("Next molecule")');
  await page.click('.predict .choice >> nth=0');
  await setRange('.flip-range', 100);
  await page.click('button:has-text("Lock in this chair")');
  await fb(/Locked in both/, 'best step did not complete');
  await next();

  await quiz(true); await next();
  await snap('results');

  /* ---- what reached the LMS */
  const lms = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lms')));
  const graded = await page.evaluate(() => App.GRADED);
  const wrongDrawn = Object.keys((await saved()).ans).filter((k) => WRONG.has(k)).length;
  const expected = Math.round(100 * (graded - wrongDrawn) / graded);
  expect(lms['cmi.core.lesson_status'] === 'completed', 'status is ' + lms['cmi.core.lesson_status']);
  expect(+lms['cmi.core.score.raw'] === expected, 'score.raw ' + lms['cmi.core.score.raw'] + ', expected ' + expected);
  const nInteractions = Object.keys(lms).filter((k) => /^cmi\.interactions\.\d+\.id$/.test(k)).length;
  expect(nInteractions === graded, nInteractions + ' interactions recorded, expected ' + graded);
  expect((lms['cmi.suspend_data'] || '').length < 4000, 'suspend_data too long');
  const big = await page.textContent('.big-score');

  /* ---- a second attempt: everything cleared, best score kept */
  await page.click('button:has-text("Start a new attempt")');
  await page.click('button:has-text("Yes, start again")');
  const fresh = await saved();
  expect(fresh.att === 2, 'attempt counter is ' + fresh.att);
  expect(Object.keys(fresh.ans).length === 0, 'old answers survived the new attempt');
  expect(Object.keys(fresh.done).length === 0, 'old builds/steps survived the new attempt');
  expect(Math.round(fresh.best) === expected, 'best score not kept: ' + fresh.best);
  expect((await stepId()) === 'meet', 'new attempt did not start at step 1');
  /* parts stay open: jump to checkpoint 1 with Next, answer it all correctly */
  while ((await stepId()) !== 'quiz-A') await page.click('#next');
  for (;;) {
    if (!(await page.$('.quiz .choice'))) break;
    await page.click('.quiz .choice[data-choice="0"]');
    await page.click('.quiz .btnrow .primary');
  }
  const lms2 = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lms')));
  expect(+lms2['cmi.core.score.raw'] === expected, 'retry lowered the gradebook score to ' + lms2['cmi.core.score.raw']);
  expect(lms2['cmi.core.lesson_status'] === 'completed', 'retry changed the status to ' + lms2['cmi.core.lesson_status']);
  expect(/best \d+%/.test(await page.textContent('#score')), 'header does not show the best score');
  console.log('Retry: attempt 2 started clean; gradebook kept ' + lms2['cmi.core.score.raw'] + '%');

  console.log('Results screen: ' + big.trim());
  console.log('LMS: status=' + lms['cmi.core.lesson_status'] + ' score.raw=' + lms['cmi.core.score.raw'] +
              ' interactions=' + nInteractions + ' suspend_data=' + (lms['cmi.suspend_data'] || '').length + ' chars');
  console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'Walkthrough passed.');
  await browser.close();
  process.exit(problems.length ? 1 : 0);
})();

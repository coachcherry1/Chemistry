/* tools/walkthrough.js: plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *   DARK=1 ...                           # the same in dark mode
 *
 * It makes every prediction, drags every thermometer past every boiling
 * point (checking the thermometer is locked until the prediction is made),
 * looks at every noble gas's electron cloud, predicts the halogens' phases
 * (one wrong), clicks a C–H as a donor, draws hydrogen bonds the wrong ways
 * first (a lone pair first, on the same molecule, the wrong donor), counts
 * hydrogen bonds (wrong first), ranks the 18-electron ladder (wrong first),
 * answers one core question per checkpoint wrongly on purpose, reloads
 * halfway, and finally checks what reached the "LMS": the score, the
 * completion status and the interaction records. Before all that it checks
 * that a save from another release, or one the browser kept, is ignored; at
 * the end it starts a second attempt and checks the gradebook keeps the best.
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
const STORE = 'intermolecular-forces-state';
const SHOTS = process.env.SHOTS;
const WRONG = new Set(['a-escape', 'b-dd-what', 'c-donor', 'd-order']);

/* The fake LMS keeps its data in sessionStorage and reads and writes it on
   every call, never from a copy in the page. To give the next load different
   LMS data, a test first switches off the current page's writes (so its
   unload handler cannot put its own data back), then writes the data. */
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
  const step = () => page.evaluate(() => App.STEPS[+document.getElementById('counter').textContent.match(/\d+/)[0] - 1]);
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
  async function fb(re, what) { const t = await feedback(); expect(re.test(t), what + ': ' + t); }
  const saved = () => page.evaluate(() => JSON.parse(JSON.parse(sessionStorage.getItem('lms'))['cmi.suspend_data']));
  async function thermo(K) {
    await page.$eval('.thermo-range', (el, v) => { el.value = v; el.dispatchEvent(new Event('input')); }, String(Math.round(K)));
  }
  async function race(prefer) {
    const s = await step();
    const id = s.id;
    const t0 = await page.$('.thermo-range');
    expect(!t0 || await t0.isDisabled(), `${id}: thermometer works before the prediction`);
    expect(await page.isDisabled('#next'), `${id}: Next enabled before the race`);
    await page.click(`.pside .predict .choice >> nth=${prefer || 0}`);
    await thermo(s.minK + (s.maxK - s.minK) * 0.4);
    expect(await page.isDisabled('#next'), `${id}: finished before every substance boiled`);
    await thermo(s.maxK);
    await page.waitForTimeout(200);
    expect(!!(await page.$('.pside .reveal')), `${id}: no reveal after the race`);
  }

  /* ---- fresh start */
  async function startsFresh(lmsVersion, browserVersion, what) {
    await page.evaluate((a) => {
      const draws = {};
      Object.keys(QUIZZES).forEach((k) => { draws[k] = QUIZZES[k].pool.slice(0, QUIZZES[k].draw).map((q) => q.id); });
      const old = (v) => JSON.stringify({ v: v, seed: 1, step: 7, max: 9, draws: draws, ans: { 'a-ne-xe': 1 }, pick: {},
                                          pr: {}, done: { bubbles: 1 }, fin: 0, best: 61, att: 1 });
      const lms = { 'cmi.core.score.raw': '61', 'cmi.core.lesson_status': 'incomplete' };
      if (a.lms != null) lms['cmi.suspend_data'] = old(a.lms);
      window.API.LMSSetValue = () => 'true';
      sessionStorage.setItem('lms', JSON.stringify(lms));
      localStorage.clear();
      if (a.browser != null) localStorage.setItem(a.key, old(a.browser));
    }, { lms: lmsVersion, browser: browserVersion, key: STORE });
    await page.reload();
    await page.click('.screen .primary');
    expect((await stepId()) === 'bubbles', what + ' was resumed at ' + (await stepId()));
    const clean = await saved();
    expect(Object.keys(clean.ans).length === 0 && Object.keys(clean.done).length === 0, what + ': old answers carried over');
  }
  await startsFresh(99, null, 'a save from another release');
  await startsFresh(null, await page.evaluate(() => App.SCHEMA), 'a browser save inside the LMS');

  /* ---- Part 1 */
  expect(await page.isDisabled('.thermo-range'), 'bubbles: thermometer works before the prediction');
  await page.click('.pside .predict .choice >> nth=1');
  await thermo(273.15 + 120);
  await page.waitForTimeout(200);
  expect(/whole H₂O/.test(await page.textContent('.pside')), 'bubbles: no reveal');
  await next();
  await race(0);
  expect(/Argon melts at −189 °C/.test(await page.textContent('.pside')), 'argon: no melting and boiling in the reveal');
  await next();

  /* ---- Part 2 */
  await race(1);
  expect(/Helium never freezes/.test(await page.textContent('.pside')), 'he-ne: no note that helium never freezes');
  await next();
  await page.click('.predict .choice >> nth=0');
  for (const g of ['Ne', 'Ar', 'Kr']) await page.click(`.cloud .chip:text-is("${g}")`);
  expect(await page.isDisabled('#next'), 'clouds: finished before every gas was seen');
  await page.click('.cloud .chip:text-is("Xe")');
  await next();
  await race(1);
  await next();
  /* halogens: one wrong */
  for (const [f, ph] of [['F₂', 'gas'], ['Cl₂', 'liquid'], ['Br₂', 'liquid'], ['I₂', 'solid']]) {
    await page.click(`.phase-row:has-text("${f}") .mini:text-is("${ph}")`);
  }
  await page.click('button:has-text("Show me")');
  expect(/3 of 4 right/.test(await page.textContent('.pside')), 'halogens: score of the phase predictions');
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

  /* ---- Part 3 */
  await page.click('.predict .choice >> nth=2');
  expect(!(await page.isHidden('.ends-pics')), 'ends: molecules not shown after predicting');
  await next();
  await race(1);
  await next();
  await race(0);
  await next();
  await race(0);
  await next();
  await quiz();
  await next();

  /* ---- Part 4: donor and receiver */
  const sel = (m, a) => `.scene-host .atom.pick[data-m="${m}"][data-a="${a}"]`;
  const lp = (m, a, k) => `.scene-host .lp.pick[data-m="${m}"][data-a="${a}"][data-k="${k}"]`;
  await page.click(lp(1, 0, 0));
  await fb(/Start with the H/, 'donor: lone pair first');
  await page.click(sel(0, 1));
  await page.click(lp(0, 0, 0));
  await fb(/BETWEEN molecules/, 'donor: same molecule');
  await page.click(sel(0, 1));
  await page.click(lp(1, 0, 0));
  expect((await page.$$('.scene-host .hb')).length === 1, 'donor: no hydrogen bond drawn');
  await next();

  /* which H */
  await page.click(sel(0, 3));
  expect((await fbClass()).includes('bad') && /0\.35/.test(await feedback()), 'which-h: a C–H was accepted, or no difference quoted');
  const donors = await page.evaluate(() => App.STEPS.find((s) => s.id === 'which-h').mols.map((m, i) => Chem.sub(m.id).donors.map((a) => [i, a])).flat());
  for (const [m, a] of donors) await page.click(sel(m, a));
  await fb(/All the donors found/, 'which-h completion');
  await next();

  /* draw: ethanol and water */
  const eth = await page.evaluate(() => ({ e: Chem.sub('ethanol'), w: Chem.sub('H2O') }));
  await page.click(sel(0, eth.e.donors[0]));
  await page.click(lp(1, eth.e.receivers[0][0], 0));
  await page.click(sel(0, eth.e.donors[0]));
  await page.click(lp(1, eth.e.receivers[0][0], 1));
  await fb(/water as the donor|should be water/, 'draw-ethanol: wrong donor for task 2');
  await page.click(sel(2, eth.w.donors[0]));
  await page.click(lp(0, eth.e.receivers[0][0], 1));
  await page.click(sel(1, eth.e.donors[0]));
  await page.click(lp(2, eth.w.receivers[0][0], 0));
  expect((await page.$$('.scene-host .hb')).length === 3, 'draw-ethanol: three hydrogen bonds not drawn');
  await next();

  /* draw: water and acetone */
  const ac = await page.evaluate(() => Chem.sub('acetone'));
  await page.click(sel(0, 4));
  await fb(/bonded to C/, 'draw-acetone: acetone H accepted');
  await page.click(sel(1, eth.w.donors[0]));
  await page.click(lp(0, ac.receivers[0][0], 0));
  expect(await page.isDisabled('#next'), 'draw-acetone: finished before the prediction');
  await page.click('.predict .choice >> nth=1');
  await next();

  /* count */
  async function count() {
    const s = await step();
    for (const id of s.ids) {
      const x = await page.evaluate((i) => Chem.sub(i), id);
      const card = `.count-card:has(b:text-is("${x.text}"))`;
      const nLines = (await page.$$(card + ' .count-line')).length;
      const want = nLines === 3 ? [x.donors.length, x.receivers.length, x.pairs] : [x.pairs];
      const btn = (i, n) => page.locator(card + ' .count-line').nth(i).locator(`.mini:text-is("${n}")`);
      for (let i = 0; i < nLines; i++) {
        if (i === nLines - 1) {
          await btn(i, want[i] === 4 ? 3 : want[i] + 1).click();
          expect((await fbClass()).includes('bad'), `${s.id}: a wrong count for ${id} was accepted`);
        }
        await btn(i, want[i]).click();
      }
    }
    await race(0);
  }
  await count();
  await next();
  await count();
  await next();
  await quiz();
  await next();

  /* ---- Part 5: rank */
  await page.click('.rank-card:has-text("methanol")');
  expect((await fbClass()).includes('bad'), 'ladder: methanol accepted as the lowest');
  for (const n of ['fluorine', 'hydrogen chloride', 'methanol']) await page.click(`.rank-card:has-text("${n}")`);
  await thermo(273.15 + 75);
  await next();
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
  console.log(`Results screen: ${(await page.textContent('.big-score')).trim()}`);
  console.log(`LMS: status=${lms['cmi.core.lesson_status']} score.raw=${lms['cmi.core.score.raw']} interactions=${nInt} suspend_data=${lms['cmi.suspend_data'].length} chars`);

  await page.click('button:has-text("Start a new attempt")');
  await page.click('button:has-text("Yes, start again")');
  expect((await stepId()) === 'bubbles', 'retry: did not restart at step 1');
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

/* tools/walkthrough.js: plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *   DARK=1 ...                           # the same in dark mode
 *
 * For each liquid step it names the IMFs (one wrong set first), counts
 * hydrogen bonds (wrong first), ranks the liquids (the weakest first, which
 * is refused), predicts each property (one wrong first, which must get a
 * reason), checks the bench is locked until then, and runs the bench. It
 * reloads after the first step, answers one core checkpoint question wrongly
 * on purpose, and finally checks what reached the "LMS": the score, the
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
const STORE = 'properties-of-liquids-state';
const SHOTS = process.env.SHOTS;
const WRONG = new Set(['e-rule']);

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
  /* name the IMFs of each: the first card gets a wrong set first */
  async function assign() {
    const s = await step();
    expect(!(await page.$('.pside .predict .choice')) && !(await page.$('.phase-row')) && !(await page.$('.rank-card')),
      `${s.id}: the prediction opened before the IMFs were named`);
    let first = true;
    for (const id of s.ids) {
      const f = await page.evaluate((i) => Chem.forces(i), id);
      const card = `.assign-card[data-id="${id}"]`;
      if (first) {
        /* LDF alone where more is needed; LDF and hydrogen bonding where LDF is enough */
        const wrong = f.dipole || f.hbond ? ['ldf'] : ['ldf', 'hbond'];
        for (const k of wrong) await page.click(card + ` .toggle[data-force="${k}"]`);
        await page.click(card + ' button:text-is("Check")');
        expect((await fbClass()).includes('bad'), `${s.id}: a wrong set of IMFs for ${id} was accepted`);
        for (const k of wrong) await page.click(card + ` .toggle[data-force="${k}"]`);
        first = false;
      }
      for (const k of ['ldf', 'dipole', 'hbond']) if (f[k]) await page.click(card + ` .toggle[data-force="${k}"]`);
      await page.click(card + ' button:text-is("Check")');
      expect((await fbClass()).includes('good'), `${s.id}: the right IMFs for ${id} were refused: ${await feedback()}`);
    }
    expect((await page.$$('.assign-card.right')).length === s.ids.length, `${s.id}: not every card shows its IMFs`);
  }
  /* ---- fresh start */
  async function startsFresh(lmsVersion, browserVersion, what) {
    await page.evaluate((a) => {
      const draws = {};
      Object.keys(QUIZZES).forEach((k) => { draws[k] = QUIZZES[k].pool.slice(0, QUIZZES[k].draw).map((q) => q.id); });
      const old = (v) => JSON.stringify({ v: v, seed: 1, step: 3, max: 4, draws: draws, ans: { 'e-rule': 1 }, pick: {},
                                          pr: {}, done: { liquids: 1 }, fin: 0, best: 61, att: 1 });
      const lms = { 'cmi.core.score.raw': '61', 'cmi.core.lesson_status': 'incomplete' };
      if (a.lms != null) lms['cmi.suspend_data'] = old(a.lms);
      window.API.LMSSetValue = () => 'true';
      sessionStorage.setItem('lms', JSON.stringify(lms));
      localStorage.clear();
      if (a.browser != null) localStorage.setItem(a.key, old(a.browser));
    }, { lms: lmsVersion, browser: browserVersion, key: STORE });
    await page.reload();
    await page.click('.screen .primary');
    expect((await stepId()) === 'liquids', what + ' was resumed at ' + (await stepId()));
    const clean = await saved();
    expect(Object.keys(clean.ans).length === 0 && Object.keys(clean.done).length === 0, what + ': old answers carried over');
  }
  await startsFresh(99, null, 'a save from another release');
  await startsFresh(null, await page.evaluate(() => App.SCHEMA), 'a browser save inside the LMS');

  /* ---- the liquids, in reduced motion so the bench gives its result at once */
  await page.emulateMedia({ reducedMotion: 'reduce' });
  async function props() {
    const s = await step();
    await assign();
    if (s.count) {
      for (const id of s.ids) {
        const n = await page.evaluate((i) => Chem.sub(i).pairs, id);
        const card = `.assign-card[data-id="${id}"]`;
        await page.click(`${card} .count-btns .mini:text-is("${n === 4 ? 3 : n + 1}")`);
        expect((await fbClass()).includes('bad'), `${s.id}: a wrong hydrogen-bond count for ${id} was accepted`);
        await page.click(`${card} .count-btns .mini:text-is("${n}")`);
      }
    }
    expect(await page.isDisabled('.pbench .primary'), `${s.id}: the bench runs before the predictions`);
    const order = await page.evaluate((ids) => ids.slice().sort((a, b) => Chem.compare(a, b).winner === a ? -1 : 1)
      .map((id) => Chem.sub(id).name), s.ids);
    await page.click(`.rank-card:has(b:text-is("${order[order.length - 1]}"))`);
    expect((await fbClass()).includes('bad'), `${s.id}: the weakest was accepted as the strongest`);
    for (const n of order) {
      const c = await page.$(`.rank-card:not([disabled]):has(b:text-is("${n}"))`);
      if (c) await c.click();
    }
    const answers = await page.evaluate((st) => st.props.map((q) => Chem.sub(Chem.propBest(q[0], st.ids, q[1])).name), s);
    for (let k = 0; k < answers.length; k++) {
      const row = page.locator('.prop-q').nth(k);
      if (k === 0) {
        const wrong = await page.evaluate((a) => [...document.querySelectorAll('.prop-q')[0].querySelectorAll('.mini')]
          .map((m) => m.textContent).find((t) => t !== a), answers[0]);
        await row.locator(`.mini:text-is("${wrong}")`).click();
        expect((await fbClass()).includes('bad') && /IMFs|LDF|hydrogen/.test(await feedback()), `${s.id}: a wrong property prediction got no reason`);
      }
      await row.locator(`.mini:text-is("${answers[k]}")`).click();
    }
    expect(await page.isDisabled('#next'), `${s.id}: finished before the bench ran`);
    await page.click('.pbench .primary');
    await page.waitForTimeout(150);
    expect(/Emptied first/.test(await page.textContent('.bench-result')), `${s.id}: the bench gave no result`);
  }
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
  await props();
  await page.reload();
  await page.click('.screen .primary');
  expect((await stepId()) === 'liquids', 'reload: resumed at ' + (await stepId()));
  await next();
  for (let k = 0; k < 3; k++) { await props(); await next(); }
  await quiz();
  await next();
  await page.emulateMedia({ reducedMotion: 'no-preference' });

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
  expect((await stepId()) === 'liquids', 'retry: did not restart at step 1');
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

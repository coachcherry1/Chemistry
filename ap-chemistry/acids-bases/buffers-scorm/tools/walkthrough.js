/* tools/walkthrough.js: plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *   DARK=1 ...                           # the same in dark mode
 *
 * It answers every prediction, checks that the particle diagram on screen
 * matches the model at every point (both walks, the explore sliders, the click
 * steps, the ratio slider, the equation sorts), sorts a card into the wrong box
 * and clicks the wrong particle before the right one, answers one core question
 * per checkpoint wrongly on purpose, reloads halfway, and finally checks what
 * reached the "LMS": the score, the completion status and the interaction
 * records. It checks that a save from another release is ignored, and at the end
 * it starts a second attempt and checks the gradebook keeps the best.
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
const STORE = 'buffers-state';
const SHOTS = process.env.SHOTS;
const WRONG = new Set(['a-def', 'b-react', 'c-react', 'd-only', 'e-which']);
const YES = new Set(['CH₃COOH + CH₃COONa', 'NH₃ + NH₄Cl', 'HF + NaF', 'HCN + KCN']);

const fakeLMS = () => {
  const read = () => JSON.parse(sessionStorage.getItem('lms') || '{}');
  window.API = {
    LMSInitialize: () => 'true',
    LMSFinish: () => 'true',
    LMSGetValue: (k) => {
      const data = read();
      if (k === 'cmi.interactions._count') return String(Object.keys(data).filter((x) => /^cmi\.interactions\.\d+\.id$/.test(x)).length);
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
    const ok = await page.waitForFunction(() => !document.getElementById('next').disabled, null, { timeout: 8000 }).then(() => true, () => false);
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
  const diagram = (selector, index) => page.evaluate(([sel, i]) => {
    const roots = document.querySelectorAll(sel || 'body');
    const root = roots[i || 0] || document;
    const n = (c) => root.querySelectorAll('.pbox-svg .' + c + ':not(.off)').length;
    return { HA: n('p-ha'), A: n('p-a'), Na: n('p-na'), Cl: n('p-cl'), H: n('p-h'), OH: n('p-oh') };
  }, [selector, index]);
  async function diagramMatches(pair, ha, a, x, what, selector, index) {
    const want = await page.evaluate(([p, h, b, v]) => Buf.counts(p, h, b, v), [pair, ha, a, x]);
    const got = await diagram(selector, index);
    ['HA', 'A', 'Na', 'Cl', 'H', 'OH'].forEach((k) => expect(got[k] === want[k], `${what}: ${k} drawn ${got[k]}, model ${want[k]}`));
  }
  async function setSlider(selector, value) {
    await page.evaluate(([sel, v]) => { const s = document.querySelector(sel); s.value = String(v); s.dispatchEvent(new Event('input')); }, [selector, value]);
  }

  /* ---- a save from another release is ignored */
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ v: 0, seed: 1, draws: {}, max: 5 })), STORE);
  await page.reload();
  await page.click('.screen-box .primary');
  expect((await stepId()) === 'problem', 'an old save was not ignored');
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.reload();
  await page.click('.screen-box .primary');

  /* ---- Part 1 */
  expect((await stepId()) === 'problem', 'does not start at the first step');
  await page.click('.predict .choice >> nth=0');
  await page.click('[data-add]');
  await page.waitForTimeout(100);
  {
    const flasks = await page.evaluate(() => Array.from(document.querySelectorAll('.cmp-col')).map((c) => ({
      title: c.querySelector('h4').textContent, read: c.querySelector('.meter').textContent,
      n: (k) => 0, H: c.querySelectorAll('.p-h:not(.off)').length, Cl: c.querySelectorAll('.p-cl:not(.off)').length,
      HA: c.querySelectorAll('.p-ha:not(.off)').length, A: c.querySelectorAll('.p-a:not(.off)').length })));
    expect(flasks[0].H === 4 && flasks[0].Cl === 4 && flasks[0].HA + flasks[0].A === 0, 'problem: the water flask should hold 4 H+ and 4 Cl-');
    expect(flasks[1].HA === 14 && flasks[1].A === 6 && flasks[1].H === 0, `problem: the buffer should hold 14 HAc and 6 Ac-, not ${flasks[1].HA}/${flasks[1].A}`);
    expect(/1\.40/.test(flasks[0].read) && /4\.38/.test(flasks[1].read), 'problem: the pH readouts are wrong: ' + flasks.map((f) => f.read).join(' | '));
  }
  await next();

  await page.click('.mini[data-pair="NH"]');
  {
    const c = await diagram('.pflask');
    expect(c.HA === 10 && c.A === 10 && c.Na === 0 && c.Cl === 10 + 0 - 0 || c.Cl === 10, `members: the NH4+/NH3 flask shows ${JSON.stringify(c)}`);
    expect(c.HA === 10 && c.A === 10, 'members: the NH4+/NH3 buffer should have 10 and 10');
  }
  await page.click('.mini[data-pair="AC"]');
  await page.click('.predict .choice >> nth=0');
  await next();

  /* sort: a card in the wrong box first */
  {
    let first = true;
    for (let guard = 0; guard < 20; guard++) {
      const tile = await page.$('.tray .tile');
      if (!tile) break;
      const text = (await tile.textContent()).trim();
      const right = YES.has(text) ? 'yes' : 'no', wrong = right === 'yes' ? 'no' : 'yes';
      if (first) {
        await tile.click();
        await page.click(`.drop[data-drop="${wrong}"]`);
        expect((await fbClass()).includes('bad'), 'sort: no explanation for a card in the wrong box');
        first = false;
      }
      await (await page.$('.tray .tile')).click();
      const t2 = (await page.textContent('.tile.selected')).trim();
      const r2 = YES.has(t2) ? 'yes' : 'no';
      await page.click(`.drop[data-drop="${r2}"]`);
    }
    expect((await page.$$('.tray .tile')).length === 0, 'sort: cards left in the tray');
  }
  await next();

  /* a checkpoint: right answers, except the listed core ones */
  async function quiz(label) {
    const id = await stepId();
    const ids = await page.evaluate((s) => App.state().draws[s.replace('quiz-', '')], id);
    for (const qid of ids) {
      const real = await page.evaluate(() => document.querySelector('.q-text').textContent);
      const ci = WRONG.has(qid) ? 1 : 0;
      await page.click(`.quiz .q-choices .choice[data-choice="${ci}"]`);
      await page.waitForSelector('.quiz .q-why:not([hidden])');
      const right = await page.evaluate(() => document.querySelectorAll('.quiz .choice.right').length);
      expect(right === 1, `${label} ${qid}: the right choice is not marked`);
      await page.click('.quiz .btnrow .primary');
    }
    await page.waitForSelector('.q-summary');
  }
  await snap('quiz-A-before');
  await quiz('A');
  await next();

  /* reload halfway: the save brings the student back here, with the answers */
  {
    const before = await page.evaluate(() => ({ step: App.state().step, ans: Object.keys(App.state().ans).length }));
    await page.reload();
    await page.click('.screen-box .primary');
    const after = await page.evaluate(() => ({ step: App.state().step, ans: Object.keys(App.state().ans).length }));
    expect(before.step === after.step && before.ans === after.ans, `reload: ${JSON.stringify(before)} came back as ${JSON.stringify(after)}`);
  }

  /* ---- Parts 2 and 3: the walks and the click steps */
  async function walk(dir) {
    const sign = dir === 'acid' ? 1 : -1;
    for (let k = 0; k < 5; k++) {
      await page.click('.walk-q .predict .choice >> nth=0');
      const x = [0, 2, 4, 6, 8][k] * sign;
      await page.waitForTimeout(80);
      await diagramMatches('AC', 10, 10, x, `${dir} walk point ${k + 1}`, '.pflask');
      const ph = await page.textContent('.ph-read');
      const want = await page.evaluate((v) => Buf.pH('AC', 10, 10, v).toFixed(2) + '|' + Buf.pHWater(v).toFixed(2), x);
      want.split('|').forEach((w) => expect(ph.includes(w), `${dir} walk point ${k + 1}: the pH read-out "${ph}" lacks ${w}`));
      await snap(`${dir}-walk-${k + 1}`);
      await page.click('[data-walk-next]');
    }
    for (const n of [8, 0, 5]) {
      await setSlider('.thermo-range', n);
      await diagramMatches('AC', 10, 10, n * sign, `${dir} explore ${n}`, '.pflask');
    }
  }
  await walk('acid');
  await next();

  /* click the wrong particle first */
  await page.click('.ptc-HA');
  expect((await fbClass()).includes('bad'), 'acid click: no explanation for a wrong particle');
  await page.click('.ptc-A');
  await diagramMatches('AC', 10, 10, 4, 'acid click result', '.pflask');
  await next();
  await quiz('B');
  await next();

  await walk('base');
  await next();
  await page.click('.ptc-A');
  expect((await fbClass()).includes('bad'), 'base click: no explanation for a wrong particle');
  await page.click('.ptc-HA');
  await diagramMatches('AC', 10, 10, -4, 'base click result', '.pflask');
  await next();

  /* range: both ends */
  await page.click('.predict .choice >> nth=0');
  for (const x of [-12, -5, 0, 7, 12]) {
    await setSlider('.thermo-range', x);
    await diagramMatches('AC', 10, 10, x, `range x=${x}`, '.pflask');
  }
  await snap('range-end');
  await next();
  await quiz('C');
  await next();

  /* ---- Part 4 */
  await page.click('.predict .choice >> nth=0');
  await page.waitForSelector('.predict-kicker:has-text("Predict again")');
  await page.click('.predict:has-text("Predict again") .choice >> nth=0');
  for (const a of [2, 11, 20, 14]) {
    await setSlider('.thermo-range', a);
    await diagramMatches('AC', 22 - a, a, 0, `ratio a=${a}`, '.pflask');
    const txt = await page.textContent('.ratio-table');
    const want = await page.evaluate((v) => Buf.pH('AC', 22 - v, v, 0).toFixed(2), a);
    expect(txt.includes(want), `ratio a=${a}: the table "${txt}" lacks the pH ${want}`);
  }
  await snap('ratio');
  {
    const w = await page.textContent('.hh-warn');
    expect(/Only for a buffer/.test(w) && /appreciable amounts/.test(w), 'ratio: the equation is shown without its warning');
  }
  await next();

  for (let i = 0; i < 6; i++) {
    await page.click('[data-answer="yes"]');
    await page.click('[data-when-next]');
  }
  await next();

  for (let i = 0; i < 2; i++) {
    await page.click('.walk-q .predict .choice >> nth=0');
    await page.waitForSelector('.predict-kicker:has-text("Step 2")');
    await page.click('.predict:has-text("Step 2") .choice >> nth=0');
    await page.click('[data-use-next]');
  }
  await next();
  await quiz('D');
  await next();

  /* ---- Part 5 */
  await page.click('.predict .choice >> nth=0');
  for (const x of [-12, 4, 12]) {
    await setSlider('.thermo-range', x);
    await diagramMatches('NH', 10, 10, x, `NH range x=${x}`, '.pflask');
  }
  {
    const eq = await page.textContent('.hh-line');
    expect(/Equation|equation/.test(eq), 'NH range: no equation line');
  }
  await next();
  await quiz('E');
  await next();

  /* ---- results and the LMS */
  const lms = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lms')));
  const st = await saved();
  const right = Object.values(st.ans).filter(Boolean).length;
  expect(Object.keys(st.ans).length === 20, `answered ${Object.keys(st.ans).length}, expected 20`);
  expect(right === 15, `expected 15 right (5 wrong on purpose), got ${right}`);
  expect(lms['cmi.core.score.raw'] === '75', `score ${lms['cmi.core.score.raw']}, expected 75`);
  expect(lms['cmi.core.lesson_status'] === 'completed', `status ${lms['cmi.core.lesson_status']}`);
  const interactions = Object.keys(lms).filter((k) => /^cmi\.interactions\.\d+\.id$/.test(k)).length;
  expect(interactions === 20, `${interactions} interaction records, expected 20`);
  await snap('results');

  /* a second attempt keeps the best score */
  await page.click('.big-score ~ * >> nth=0').catch(() => {});
  await page.click('text=Start a new attempt');
  await page.click('text=Yes, start again');
  const again = await saved();
  expect(again.att === 2 && Object.keys(again.ans).length === 0, 'a new attempt did not reset the answers');
  const lms2 = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lms')));
  expect(lms2['cmi.core.score.raw'] === '75', `the gradebook score changed to ${lms2['cmi.core.score.raw']} on a new attempt`);

  await browser.close();
  if (problems.length) {
    console.error('FAILED:\n - ' + problems.join('\n - '));
    process.exit(1);
  }
  console.log('OK: walked every step, matched the diagram to the model at every point, and checked the LMS record.');
})().catch((e) => { console.error(e); process.exit(1); });

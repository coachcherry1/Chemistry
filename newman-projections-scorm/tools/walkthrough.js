/* tools/walkthrough.js — plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *
 * It answers some checkpoint questions wrongly on purpose, makes one wrong
 * build, one wrong label and one wrong lock-in, reloads the page halfway to
 * check that progress resumes, and finally checks what reached the "LMS":
 * the score, the completion status and the interaction records.
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
const SHOTS = process.env.SHOTS;
const WRONG = new Set(['a-front', 'b-steric', 'c-bond', 'd-B']);   /* answered wrongly on purpose */

const fakeLMS = () => {
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
  window.__lms = data;
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1180, height: 860 } });
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
    await page.screenshot({ path: path.join(SHOTS, String(++shot).padStart(2, '0') + '-' + name + '.png'), fullPage: true });
  }
  async function next() {
    expect(!(await page.isDisabled('#next')), 'Next is still disabled on ' + (await stepId()));
    await snap(await stepId());
    await page.click('#next');
  }
  async function setRange(sel, v) {
    await page.$eval(sel, (el, val) => { el.value = val; el.dispatchEvent(new Event('input')); }, v);
  }

  await page.click('.screen .primary');

  /* ---- meet */
  await page.click('button:has-text("Down the C1–C2 bond")');
  await page.waitForTimeout(800);
  await next();

  /* ---- build helper: place every group, optionally after one wrong try */
  async function build(molId, wrongFirst) {
    const want = await page.evaluate((id) => App.targetSlots(molecule(id)), molId);
    const names = await page.evaluate((w) => w.map((g) => GROUPS[g].name), want);
    let order = want.map((_, i) => i);
    if (wrongFirst) {
      /* swap two groups on the front carbon if they differ (a different
         molecule), otherwise turn the back carbon 120° (a different
         conformation) */
      const placed = names.slice();
      if (placed[1] !== placed[2]) { const t = placed[1]; placed[1] = placed[2]; placed[2] = t; }
      else { const b = placed.slice(3); placed[3] = b[1]; placed[4] = b[2]; placed[5] = b[0]; }
      for (let i = 0; i < 6; i++) {
        await page.click(`.tray .tile[aria-label="Group ${placed[i]}"] >> nth=0`);
        await page.click(`.template .drop[data-drop="${i}"]`);
      }
      await page.click('button:has-text("Check")');
      const fb = await feedback();
      expect(/swapped|turned|wrong/.test(fb), molId + ': wrong build gave no useful feedback: ' + fb);
      await page.click('button:has-text("Clear")');
    }
    for (const i of order) {
      await page.click(`.tray .tile[aria-label="Group ${names[i]}"] >> nth=0`);
      await page.click(`.template .drop[data-drop="${i}"]`);
    }
    await page.click('button:has-text("Check")');
    const fb = await feedback();
    expect(/Correct/.test(fb), molId + ': correct build not accepted: ' + fb);
  }

  async function sketch() {
    await page.focus('.g-handle[data-handle="0"]');
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowUp');
    await page.click('button:has-text("Lock in my prediction")');
  }

  async function trace() {
    await page.focus('.rotor-range');
    for (let i = 0; i < 75; i++) await page.keyboard.press('ArrowRight');
    const fb = await feedback();
    expect(/prediction/.test(fb), 'trace did not compare the prediction: ' + fb);
    expect(/Whole curve/.test(await page.textContent('.meter-text')), 'trace meter not full');
  }

  async function label(wrongFirst) {
    const plan = await page.evaluate(() => {
      const s = App.STEPS.filter((x) => x.kind === 'label')
        .find((x) => document.getElementById('stepTitle').textContent === x.title);
      return NAMED_ANGLES.map((a) => s.terms.indexOf(conformationName(molecule(s.mol), a)));
    });
    if (wrongFirst) {
      await page.click(`.tray .tile[data-tile="${(plan[0] + 1) % 2}"]`);
      await page.click(`.gdrop[data-drop="0"]`);
      expect(/Not “/.test(await feedback()), 'wrong label not explained');
    }
    for (let i = 0; i < 6; i++) {
      await page.click(`.tray .tile[data-tile="${plan[i]}"]`);
      await page.click(`.gdrop[data-drop="${i}"]`);
    }
    expect(/All labelled/.test(await feedback()), 'labels not completed');
  }

  async function quiz() {
    for (;;) {
      const btn = await page.$('.quiz .choice');
      if (!btn) break;
      const id = await page.evaluate(() => {
        const t = document.querySelector('.q-text').textContent;
        for (const k in QUIZZES) for (const q of QUIZZES[k].pool) if (q.q === t) return q.id;
        return null;
      });
      const pick = WRONG.has(id) ? 1 : 0;
      await page.click(`.quiz .choice[data-choice="${pick}"]`);
      expect(!(await page.isHidden('.q-why')), 'no explanation after answering ' + id);
      await page.click('.quiz .btnrow .primary');
    }
    expect(/Checkpoint finished/.test(await feedback()), 'checkpoint did not finish');
  }

  async function find(predict, wrongPhi) {
    await page.click(`.predict .choice >> nth=${predict}`);
    await setRange('.rotor-range', wrongPhi);
    await page.click('button:has-text("Lock in")');
    expect(/not the lowest|Not this one/.test(await feedback()), 'wrong lock-in accepted');
    const best = await page.evaluate(() => {
      const s = App.STEPS.find((x) => document.getElementById('stepTitle').textContent === x.title);
      return bestStaggered(molecule(s.mol)).phi;
    });
    await setRange('.rotor-range', best);
    await page.click('button:has-text("Lock in")');
    expect(/Locked in/.test(await feedback()), 'best conformation not accepted');
    expect(await page.$('.reveal'), 'no reveal after lock-in');
  }

  await build('ethane', true); await next();
  await sketch(); await next();
  await trace(); await next();
  await label(true); await next();
  await quiz(); await next();

  /* ---- resume: reload in the middle and make sure we come back here */
  const before = await stepId();
  await page.reload();
  await page.click('.screen .primary');
  expect((await stepId()) === before, 'resume went to ' + (await stepId()) + ' instead of ' + before);

  await build('butane', true); await next();
  await sketch(); await next();
  await trace(); await next();
  await label(false); await next();
  await quiz(); await next();

  await build('bromobutane', true); await next();
  await find(0, 60); await next();

  /* ---- swap: five groups */
  for (let i = 0; i < 5; i++) {
    await page.click('.swap-card .predict .choice >> nth=0');
    if (i < 4) await page.click('button:has-text("Next group")');
  }
  expect(/Ranked by gauche cost/.test(await feedback()), 'swap step did not complete');
  const rows = await page.$$eval('.swap-table tr', (r) => r.length);
  expect(rows === 7, 'swap table has ' + rows + ' rows');
  await next();

  await quiz(); await next();
  await build('dimethylbutane', false); await next();
  await find(1, 180); await next();
  await build('pairA_Br', true); await next();
  await build('pairB_Br', false); await next();

  /* ---- pair */
  await page.click('.predict .choice >> nth=0');
  await page.click('.predict >> nth=1 >> .choice >> nth=0');
  const ranges = await page.$$('.rotor-range');
  expect(ranges.length === 2, 'pair step should have two rotors');
  await setRange('.rotor-range >> nth=0', 180);
  await setRange('.rotor-range >> nth=1', 180);
  await page.click('.predict >> nth=2 >> .choice >> nth=0');
  await page.click('.chip:has-text("I")');
  expect(/Same atoms, same bonds/.test(await feedback()), 'pair step did not complete: ' + (await feedback()));
  await next();

  await quiz(); await next();
  await snap('results');

  /* ---- what reached the LMS */
  const lms = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lms')));
  const graded = await page.evaluate(() => App.GRADED);
  const wrongDrawn = await page.evaluate((w) => {
    const st = JSON.parse(localStorage.getItem('newman-state'));
    return Object.keys(st.ans).filter((k) => w.includes(k)).length;
  }, [...WRONG]);
  const expected = Math.round(100 * (graded - wrongDrawn) / graded);
  expect(lms['cmi.core.lesson_status'] === 'completed', 'status is ' + lms['cmi.core.lesson_status']);
  expect(+lms['cmi.core.score.raw'] === expected, 'score.raw ' + lms['cmi.core.score.raw'] + ', expected ' + expected);
  const nInteractions = Object.keys(lms).filter((k) => /^cmi\.interactions\.\d+\.id$/.test(k)).length;
  expect(nInteractions === graded, nInteractions + ' interactions recorded, expected ' + graded);
  expect((lms['cmi.suspend_data'] || '').length < 4000, 'suspend_data too long');
  const big = await page.textContent('.big-score');

  console.log('Results screen: ' + big.trim());
  console.log('LMS: status=' + lms['cmi.core.lesson_status'] + ' score.raw=' + lms['cmi.core.score.raw'] +
              ' interactions=' + nInteractions + ' suspend_data=' + (lms['cmi.suspend_data'] || '').length + ' chars');
  console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'Walkthrough passed.');
  await browser.close();
  process.exit(problems.length ? 1 : 0);
})();

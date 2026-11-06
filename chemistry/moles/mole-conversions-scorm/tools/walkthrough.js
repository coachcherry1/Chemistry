/* tools/walkthrough.js: plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *   DARK=1 ...                           # the same in dark mode
 *
 * It checks that a save from another release, or one the browser kept, is
 * ignored inside the LMS; taps the four roads of Mole Town; and in each
 * warm-up makes the usual mistakes first (Check with nothing placed, a factor
 * upside down, a molar mass or ratio slip, too many significant figures) and
 * reads the feedback each gets. It reloads in the middle of a warm-up and of
 * the set and checks the work comes back. In the graded set it misses one
 * problem first, builds one with the keyboard and one by dragging, asks for a
 * hint, shows one solution (after the confirmation) and solves the rest,
 * then checks what reached the "LMS": the score, the completion status and
 * the interaction records. Finally it starts a second attempt and checks the
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
const STORE = 'mole-conversions-state';
const SHOTS = process.env.SHOTS;

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
  const expect = (cond, msg) => { if (!cond) problems.push(msg); };
  const lms = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('lms') || '{}'));
  async function setLMS(data) {
    await page.evaluate((d) => { window.API.LMSSetValue = () => 'true'; sessionStorage.setItem('lms', JSON.stringify(d)); }, data);
    await page.reload();
  }
  let shot = 0;
  async function snap(name) {
    if (!SHOTS) return;
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(SHOTS, String(++shot).padStart(2, '0') + '-' + name + '.png') });
  }
  const stepId = () => page.evaluate(() => App.STEPS[App.state().step].id);
  const fb = () => page.textContent('.work .fb');
  async function next() {
    const id = await stepId();
    const ok = await page.waitForFunction(() => !document.getElementById('next').disabled, null, { timeout: 5000 }).then(() => true, () => false);
    if (!ok) {
      console.error('Stopped: Next is still disabled on ' + id + '.');
      if (problems.length) console.error(problems.join('\n'));
      await browser.close();
      process.exit(1);
    }
    await snap(id);
    await page.click('#nextTop');
  }

  /* ------------------------------------------------ stale saves ignored */

  await page.goto(URL);
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ v: 1, seed: 5, step: 4, max: 5, p: [] })), STORE);
  await setLMS({ 'cmi.suspend_data': JSON.stringify({ v: 0, seed: 9, step: 3, max: 6, p: [] }) });
  expect((await page.textContent('.screen-box .primary')) === 'Start', 'a stale or browser save was resumed inside the LMS');
  expect((await lms())['cmi.core.lesson_status'] === 'incomplete', 'lesson_status is not set to incomplete at the start');
  await snap('intro');
  await page.click('.screen-box .primary');

  /* -------------------------------------------------------- Mole Town */

  expect(await page.isDisabled('#next'), 'Next is open before the roads are tapped');
  const roads = page.locator('.molemap .road[role="button"]');
  const nRoads = await roads.count();
  for (let i = 0; i < nRoads; i++) {
    const r = roads.nth(i);
    const id = await r.getAttribute('data-road');
    if (i % 2) { await r.focus(); await page.keyboard.press('Enter'); } else await r.click();
    if (['A:mm', 'A:av', 'A:stp', 'ratio'].includes(id)) expect(/=/.test(await page.textContent('#feedback')), 'tapping ' + id + ' shows no equality');
  }
  await next();

  /* ---------------------------------------------------------- helpers */

  const problem = () => page.evaluate(() => App.ctl().problem);
  async function place(t, how) {
    const sel = '.chip[data-edge="' + t.e + '"]';
    const before = await page.locator('.cell.factor').count();
    if (how === 'key') { await page.focus(sel); await page.keyboard.press('Enter'); }
    else if (how === 'drag') {
      const a = await page.locator(sel).boundingBox(), c = await page.locator('.chain-scroll').boundingBox();
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(a.x + a.width / 2 + 20, a.y - 10, { steps: 4 });
      await page.mouse.move(c.x + c.width - 40, c.y + c.height / 2, { steps: 8 });
      await page.mouse.up();
    } else await page.click(sel);
    const after = await page.locator('.cell.factor').count();
    expect(after === before + 1, 'placing ' + t.e + ' by ' + (how || 'tap') + ' did not add a factor');
    const f = page.locator('.cell.factor').nth(after - 1);
    if (t.f) {
      if (how === 'key') { await f.locator('.fl').focus(); await page.keyboard.press('Enter'); }
      else await f.locator('.fl').click();
    }
    return f;
  }
  async function fillBlanks(p) {
    for (const t of p.path) {
      const kind = t.e.split(':')[0];
      if (kind !== 'mm' && kind !== 'ratio') continue;
      const v = await page.evaluate((id) => {
        const e = Chem.edge(id);
        return e.type === 'mm' ? Chem.mmText(e.s) : String(e.R.v);
      }, t.e);
      await page.locator('input.blank[data-edge="' + t.e + '"]').first().fill(v);
    }
  }
  async function solve(how) {
    const p = await problem();
    for (const t of p.path) await place(t, how);
    await fillBlanks(p);
    await page.fill('input.ans', p.ansAscii);
    await page.click('.work .primary');
    expect(/^Correct/.test(await fb()), p.id + ': not marked correct: ' + (await fb()));
    return p;
  }

  /* ----------------------------------------------------------- warm-ups */

  for (const id of ['w-mass', 'w-part', 'w-stp', 'w-ratio']) {
    expect((await stepId()) === id, 'expected the ' + id + ' step, got ' + (await stepId()));
    expect(await page.isDisabled('#next'), id + ': Next is open before the problem is done');
    const p = await problem();
    await page.click('.work .primary');
    expect(/Nothing placed/.test(await fb()), id + ': Check with nothing placed says ' + (await fb()));
    const t = p.path[0];
    await place({ e: t.e, f: 0 });
    if (t.f) {
      await page.click('.work .primary');
      expect(/upside down/.test(await fb()), id + ': an upside-down factor says ' + (await fb()));
      await page.locator('.cell.factor .fl').first().click();
    }
    const kind = t.e.split(':')[0];
    if (id === 'w-ratio') {
      /* a reload in the middle: the factor and the blank come back */
      await page.locator('input.blank').first().fill('7');
      await page.locator('input.blank').first().dispatchEvent('change');
      await page.reload();
      expect((await page.textContent('.screen-box .primary')) === 'Continue where you left off', 'the intro does not offer to continue');
      await page.click('.screen-box .primary');
      expect((await stepId()) === 'w-ratio', 'did not resume on the ratio warm-up');
      expect((await page.locator('.cell.factor').count()) === 1, 'the placed factor did not come back after a reload');
      expect((await page.inputValue('input.blank')) === '7', 'the typed ratio did not come back after a reload');
    }
    if (kind === 'mm') {
      const slip = await page.evaluate((s) => (Chem.mmSlips(s)[0].v10 / 10).toFixed(1), t.e.split(':')[1]);
      await page.locator('input.blank').first().fill(slip);
      await page.click('.work .primary');
      expect(/Check the molar mass/.test(await fb()), id + ': a molar mass slip says ' + (await fb()));
      expect(await page.locator('input.blank.wrong').count() === 1, id + ': the wrong molar mass is not marked');
    }
    if (kind === 'ratio') {
      await page.click('.work .primary');
      expect(/Check the ratio/.test(await fb()), id + ': a wrong ratio says ' + (await fb()));
    }
    await fillBlanks(p);
    await page.fill('input.ans', await page.evaluate((x) => Chem.fmtSig(x.ans, x.given.sig + 1, true), p));
    await page.click('.work .primary');
    expect(/precision/.test(await fb()), id + ': too many significant figures says ' + (await fb()));
    if (id === 'w-part') {
      /* the scientific notation button */
      const [m, e] = p.ansAscii.split('e');
      await page.fill('input.ans', m);
      await page.click('.work .sci');
      await page.keyboard.type(e);
      expect(/× 10\^/.test(await page.inputValue('input.ans')), 'the ×10ⁿ button did not insert × 10^');
    } else await page.fill('input.ans', p.ansAscii);
    await page.click('.work .primary');
    expect(/^Correct/.test(await fb()), id + ': the right answer says ' + (await fb()));
    expect(await page.isDisabled('.work .primary'), id + ': Check is still open after a right answer');
    await next();
  }

  /* -------------------------------------------------------- the graded set */

  expect((await stepId()) === 'set', 'the graded set does not follow the warm-ups');
  expect((await page.locator('.pnum').count()) === 12, 'the problem strip does not show 12 problems');
  for (let i = 0; i < 12; i++) {
    const p = await problem();
    expect(p.id === (await page.evaluate((k) => App.problems()[k].id, i)), 'problem ' + (i + 1) + ' is not the one in the strip');
    if (i === 0) {
      for (const t of p.path) await place(t);
      await fillBlanks(p);
      await page.fill('input.ans', String(1 / p.ans));
      await page.click('.work .primary');
      expect(/upside down|arithmetic|off/.test(await fb()), 'a wrong number says ' + (await fb()));
      await page.fill('input.ans', p.ansAscii);
      await page.click('.work .primary');
      expect(/^Correct/.test(await fb()), 'problem 1: not correct on the second check');
    } else if (i === 1) await solve('key');
    else if (i === 2) await solve('drag');
    else if (i === 3) {
      await page.click('.work >> text=Hint');
      expect(/You are at/.test(await fb()), 'the first hint says ' + (await fb()));
      await solve();
    } else if (i === 4) {
      await page.click('.work >> text=Show solution');
      expect(/will not count/.test(await fb()), 'Show solution does not ask first: ' + (await fb()));
      await page.click('.work >> text=Show it (no credit)?');
      expect(/Worked solution/.test(await fb()), 'the worked solution is not shown');
    } else await solve();
    if (i === 5) {
      /* a reload in the set: six done, the seventh comes up */
      await page.reload();
      await page.click('.screen-box .primary');
      expect((await stepId()) === 'set', 'did not resume in the set');
      const done = await page.locator('.pnum.first, .pnum.right, .pnum.shown').count();
      expect(done === 6, 'after a reload the strip shows ' + done + ' problems done, not 6');
      continue;
    }
    await snap('set-' + (i + 1));
    await page.click('.next-problem');
  }

  /* ------------------------------------------------------------- results */

  expect((await stepId()) === 'results', 'the last problem does not lead to the results');
  const data = await lms();
  expect(data['cmi.core.lesson_status'] === 'completed', 'lesson_status is ' + data['cmi.core.lesson_status']);
  expect(data['cmi.core.score.raw'] === '92', 'score.raw is ' + data['cmi.core.score.raw'] + ', expected 92 (11 of 12)');
  const n = Object.keys(data).filter((k) => /^cmi\.interactions\.\d+\.id$/.test(k)).length;
  expect(n === 12, n + ' interaction records, expected 12');
  const wrong = Object.keys(data).filter((k) => /\.result$/.test(k) && data[k] === 'wrong').length;
  expect(wrong === 1, wrong + ' interactions marked wrong, expected 1 (the solution shown)');
  expect(/11 \/ 12/.test(await page.textContent('.big-score')), 'the results do not say 11 / 12');
  expect(/10 right on the first check/.test(await page.textContent('#stage')), 'the first-try count is not 10');
  expect((data['cmi.suspend_data'] || '').length < 4000, 'suspend_data is ' + (data['cmi.suspend_data'] || '').length + ' characters');
  await snap('results');

  /* ----------------------------------------------- a second attempt */

  const seed1 = await page.evaluate(() => App.state().seed);
  await page.click('text=Start a new attempt');
  await page.click('text=Yes, start again');
  expect((await page.evaluate(() => App.state().seed)) !== seed1, 'a new attempt kept the same problems');
  expect((await lms())['cmi.core.score.raw'] === '92', 'a new attempt lowered the gradebook score');
  expect((await page.locator('.tab:not(.locked)').count()) === 3, 'parts reached are not kept open on a new attempt');

  await browser.close();
  if (problems.length) {
    console.error('walkthrough: ' + problems.length + ' problem(s)\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  console.log('walkthrough: ok (stale saves ignored, Mole Town, 4 warm-ups with their slips, reloads, 12 graded problems by tap, ' +
    'keyboard and drag, hint, a solution shown, score 92 and 12 interactions, a second attempt keeps the best)');
})();

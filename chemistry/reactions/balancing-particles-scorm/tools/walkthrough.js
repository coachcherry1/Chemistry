/* tools/walkthrough.js: plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *   DARK=1 ...                           # the same in dark mode
 *
 * It checks that a save from another release, or one the browser kept, is
 * ignored inside the LMS; plays every lesson step with a mistake first and
 * reads the feedback; balances with the + and - buttons, the arrow keys and
 * typed numbers; reloads in the middle of the questions and of the equations
 * to check the work comes back. In the graded part it checks that clicking a
 * choice grades nothing until Submit answer, misses one question on
 * purpose, misses the first Check of two equations (one with doubled
 * coefficients), checks that an empty box is not counted, and uses Show me.
 * Then it checks what reached the "LMS": the score, the completion status
 * and one interaction per graded item. Finally it starts a second attempt
 * and checks the gradebook keeps the best score, and opens the page with no
 * LMS at all.
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
const STORE = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'config.js'), 'utf8').match(/store: '([^']+)'/)[1];
const SHOTS = process.env.SHOTS;

/* The fake LMS keeps its data in sessionStorage and reads and writes it on
   every call, never from a copy in the page. */
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
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const problems = [];
  page.on('pageerror', (e) => problems.push('page error: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  await page.addInitScript(fakeLMS);
  const expect = (cond, msg) => { if (!cond) problems.push(msg); };
  const lms = () => page.evaluate(() => JSON.parse(sessionStorage.getItem('lms') || '{}'));
  let shot = 0;
  async function snap(name) {
    if (!SHOTS) return;
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.waitForTimeout(80);
    await page.screenshot({ path: path.join(SHOTS, String(++shot).padStart(2, '0') + '-' + name + '.png') });
  }
  const stepId = () => page.evaluate(() => App.STEPS[App.state().step].id);
  const say = () => page.textContent('#feedback');
  const fb = (sel) => page.evaluate((s) => { const all = document.querySelectorAll((s || '') + ' .fb.show'); return all.length ? all[all.length - 1].textContent : ''; }, sel);
  async function next() {
    const id = await stepId();
    const ok = await page.waitForFunction(() => !document.getElementById('next').disabled, null, { timeout: 4000 }).then(() => true, () => false);
    expect(ok, 'Next stays disabled on ' + id);
    await page.click('#next');
    await page.waitForTimeout(30);
  }
  const nextDisabled = () => page.evaluate(() => document.getElementById('next').disabled);
  /* set the coefficients of the bench on screen */
  async function setCoefs(cs, how) {
    const n = await page.locator('.bench:not(.still) input.coef').count();
    expect(n === cs.length, 'the bench has ' + n + ' coefficients, wanted ' + cs.length);
    for (let j = 0; j < n; j++) {
      const inp = page.locator('.bench:not(.still) input.coef').nth(j);
      const cur = +(await inp.inputValue()) || 0;
      if (how === 'buttons') {
        const term = page.locator('.bench:not(.still) .term').nth(j);
        for (let k = cur; k < cs[j]; k++) await term.locator('.inc').click();
        for (let k = cur; k > cs[j]; k--) await term.locator('.dec').click();
      } else if (how === 'keys') {
        await inp.focus();
        for (let k = cur; k < cs[j]; k++) await page.keyboard.press('ArrowUp');
        for (let k = cur; k > cs[j]; k--) await page.keyboard.press('ArrowDown');
      } else await inp.fill(String(cs[j]));
    }
  }
  const check = () => page.click('.bench:not(.still) .bench-check');
  const answer = (id) => page.evaluate((i) => Chem.balance(Rx.get(i)), id);
  const chips = () => page.evaluate(() => Array.from(document.querySelectorAll('.bench:not(.still) .chip')).map((c) => c.textContent.trim()));

  /* ---- a save from another release, and one the browser kept, are ignored inside the LMS */
  await page.goto(URL);
  await page.evaluate(([store]) => {
    sessionStorage.setItem('lms', JSON.stringify({ 'cmi.suspend_data': JSON.stringify({ v: 999, seed: 5, step: 7, max: 9, p: [], q: { a: [] } }) }));
    localStorage.setItem(store, JSON.stringify({ v: App.SCHEMA, seed: 5, step: 6, max: 9, done: {}, d: {}, q: { a: [] }, p: [] }));
  }, [STORE]);
  await page.reload();
  let st = await page.evaluate(() => App.state());
  expect(st.step === 0 && st.max === 0, 'a save from another release or from the browser was resumed inside the LMS');
  expect((await page.textContent('#lms')).indexOf('Connected') >= 0, 'the LMS badge');
  expect((await lms())['cmi.core.lesson_status'] === 'incomplete', 'status should start as incomplete');
  await snap('intro');
  await page.click('.screen-box .primary');

  /* ---- count */
  expect(await stepId() === 'count', 'first step');
  const boxes = page.locator('input.coef.wide');
  const rights = [6, 3, 4, 6, 2, 4, 4];
  expect(await boxes.count() === rights.length, 'count boxes: ' + await boxes.count());
  await page.click('.btnrow .primary');
  expect(/every box/.test(await say()), 'count: empty boxes should be asked for');
  for (let i = 0; i < rights.length; i++) await boxes.nth(i).fill(String(i === 0 ? 2 : rights[i]));
  await page.click('.btnrow .primary');
  expect(/ONE H₂O/.test(await fb()), 'count: the subscript-only slip should be named: ' + await fb());
  expect(await nextDisabled(), 'count: Next before it is right');
  await boxes.nth(0).fill('6');
  await page.click('.btnrow .primary');
  await snap('count');
  await next();

  /* ---- change */
  await page.click('.tile:has-text("H₂O₂")');
  expect(/hydrogen peroxide/.test(await say()), 'change: the subscript answer should be explained');
  expect(await page.locator('.panel .bench.still').count() === 3, 'change: both outcomes should be drawn');
  await snap('change');
  await next();

  /* ---- conserved */
  const cards = await page.evaluate(() => Steps.CARDS.map((c) => Chem.conserved(Rx.get(c.rx), c.c)));
  for (let i = 0; i < cards.length; i++) {
    expect(await page.locator('.chip').count() === 0, 'conserved ' + i + ': the tally shows before the answer');
    const wrongFirst = i === 1;
    await page.click('.tile:has-text("' + ((cards[i] !== wrongFirst) ? 'Atoms conserved' : 'Not conserved') + '")');
    expect(await page.locator('.chip').count() > 0, 'conserved ' + i + ': no tally after the answer');
    expect(new RegExp(wrongFirst ? 'Look again' : 'Right').test(await fb()), 'conserved ' + i + ': feedback ' + await fb());
    if (i === 1) await snap('conserved');
    if (i < cards.length - 1) await page.click('.panel .btnrow .primary');
  }
  await next();

  /* ---- the lesson benches */
  const hows = ['buttons', 'keys', 'type', 'type'];
  for (let b = 0; b < 4; b++) {
    const id = await stepId();
    const rxid = await page.evaluate(() => App.STEPS[App.state().step].rx);
    const want = await answer(rxid);
    if (b < 3) expect((await chips()).length > 0, id + ': the live tally is missing');
    else expect((await chips()).length === 0, id + ': the tally should be hidden until Check');
    await check();
    expect(/Not balanced yet/.test(await fb('.bench')), id + ': all 1s should not be balanced: ' + await fb('.bench'));
    expect((await chips()).length > 0, id + ': Check should show the tally');
    if (b === 0) {
      await setCoefs(want.map((c) => c * 2), 'type');
      await check();
      expect(/divided by 2/.test(await fb('.bench')), id + ': doubled coefficients should be told to reduce');
      await page.locator('.bench input.coef').first().fill('');
      await check();
      expect(/not counted/.test(await fb('.bench')), id + ': an empty box');
    }
    await setCoefs(want, hows[b]);
    if (b === 1) await page.keyboard.press('Enter'); else await check();
    expect(/Balanced/.test(await fb('.bench')), id + ': the right coefficients were not accepted: ' + await fb('.bench'));
    expect((await chips()).every((c) => /✓/.test(c)), id + ': every chip should match');
    await snap(id);
    await next();
  }

  /* ---- picture to equation */
  for (let i = 0; i < 2; i++) {
    const card = await page.evaluate((k) => Steps.LOWEST[k], i);
    const want = await answer(card.rx);
    const before = await page.evaluate(() => document.querySelectorAll('.bench .particle').length);
    await setCoefs(card.c, 'type');
    expect(before === await page.evaluate(() => document.querySelectorAll('.bench .particle').length), 'lowest: the picture changed');
    await check();
    expect(/matches the picture/.test(await fb('.bench')), 'lowest ' + i + ': the unreduced equation should be explained: ' + await fb('.bench'));
    await setCoefs(want, 'type');
    await check();
    if (i === 0) { await snap('lowest'); await page.click('.bench-next'); }
  }
  await next();

  /* ---- graded questions: select, then Submit answer */
  expect(await stepId() === 'quiz', 'the questions should follow the lesson');
  const qs = await page.evaluate(() => App.questions().map((q) => ({ right: q.right, n: q.choices.length, id: q.id })));
  let wantRight = 0;
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i], wrong = (q.right + 1) % q.n, miss = i === 1;
    expect(await page.isDisabled('.quiz .submit-answer'), 'q' + i + ': Submit answer should wait for a choice');
    await page.locator('.quiz .choice').nth(wrong).click();
    expect(await page.locator('.quiz .choice.selected').count() === 1 && (await page.evaluate(() => App.state().q.a.length)) === i, 'q' + i + ': a click must only select');
    expect(await page.locator('.quiz .choice').nth(wrong).getAttribute('aria-pressed') === 'true', 'q' + i + ': aria-pressed');
    if (!miss) await page.locator('.quiz .choice').nth(q.right).click();
    if (i === 2) await snap('question');
    await page.click('.quiz .submit-answer');
    expect(await page.locator('.quiz .submit-answer').count() === 0, 'q' + i + ': Submit answer should go away once used');
    expect(new RegExp(miss ? 'Not this time' : 'Right').test(await fb('.quiz')), 'q' + i + ': feedback');
    if (!miss) wantRight++;
    if (i === 2) {
      await page.reload();
      await page.click('.screen-box .primary');
      expect(await stepId() === 'quiz' && (await page.evaluate(() => App.state().q.a.length)) === 3, 'reload in the questions: the answers did not come back');
      expect(/Question 4 of 6/i.test(await page.textContent('.quiz .panel-head')), 'reload: should resume at the next unanswered question');
      continue;
    }
    await page.click('.quiz .quiz-next');
  }
  expect((await lms())['cmi.core.score.raw'] === String(Math.round(100 * wantRight / 16)), 'score after the questions: ' + (await lms())['cmi.core.score.raw']);

  /* ---- graded equations */
  expect(await stepId() === 'set', 'the equations should follow the questions');
  const set = await page.evaluate(() => App.problems().map((p) => ({ id: p.id, coefs: p.coefs })));
  for (let i = 0; i < set.length; i++) {
    const want = set[i].coefs;
    expect((await chips()).length === 0, 'equation ' + (i + 1) + ': the tally should be hidden before the first Check');
    if (i === 0) {
      await page.locator('.bench input.coef').first().fill('');
      await check();
      expect((await page.evaluate(() => App.ctl().work.n)) === 0, 'an empty box was counted as a Check');
      await page.locator('.bench input.coef').first().fill('1');
      await check();                                  /* all 1s: a counted miss */
      expect((await chips()).length > 0, 'a miss should show the tally');
      await snap('equation-miss');
    } else if (i === 1) {
      await setCoefs(want.map((c) => c * 2), 'type');
      await check();                                  /* doubled: a counted miss */
      expect(/divided by 2/.test(await fb('.bench')), 'doubled coefficients in a graded equation');
    } else if (i === 2) {
      await check(); await check(); await check();
      expect(await page.isVisible('.showme'), 'Show me should appear after three misses');
      await page.click('.showme');
    } else wantRight++;
    if (i !== 2) { await setCoefs(want, i % 2 ? 'buttons' : 'type'); await check(); }
    expect(/Balanced|Here it is/.test(await fb('.bench')), 'equation ' + (i + 1) + ' (' + set[i].id + ') not accepted: ' + await fb('.bench'));
    if (i === 4) {
      await page.reload();
      await page.click('.screen-box .primary');
      expect(await stepId() === 'set' && (await page.evaluate(() => App.state().p.filter((w) => w && w.r).length)) === 5, 'reload in the equations: the work did not come back');
      expect((await page.evaluate(() => App.state().view)) === 5, 'reload: should open the next unsolved equation');
      continue;
    }
    if (i === 9) await snap('equation-last');
    await page.click('.bench-next');
  }

  /* ---- results and what reached the LMS */
  expect(await stepId() === 'results', 'results should follow the equations');
  await snap('results');
  let data = await lms();
  const pct = String(Math.round(100 * wantRight / 16));
  expect(wantRight === 12, 'the walkthrough should score 12 of 16, got ' + wantRight);
  expect(data['cmi.core.score.raw'] === pct, 'score ' + data['cmi.core.score.raw'] + ', wanted ' + pct);
  expect(data['cmi.core.lesson_status'] === 'completed', 'status ' + data['cmi.core.lesson_status']);
  const inter = Object.keys(data).filter((k) => /^cmi\.interactions\.\d+\.id$/.test(k));
  expect(inter.length === 16, inter.length + ' interactions, wanted 16');
  expect(Object.keys(data).filter((k) => /\.result$/.test(k) && data[k] === 'correct').length === 12, 'interactions marked correct');
  expect((data['cmi.suspend_data'] || '').length < 4000, 'suspend_data too long: ' + (data['cmi.suspend_data'] || '').length);
  expect((await page.textContent('.big-score')).indexOf('12 / 16') >= 0, 'the results screen score');

  /* ---- a second attempt keeps the best score */
  await page.click('.panel .btnrow .primary:has-text("Start a new attempt")');
  await page.click('.confirm .primary');
  st = await page.evaluate(() => App.state());
  expect(st.att === 2 && st.step === 0 && st.q.a.length === 0 && Math.round(st.best) === +pct, 'the new attempt');
  expect((await lms())['cmi.core.score.raw'] === pct, 'the best score should stay in the gradebook');
  expect(set.map((p) => p.id).join() !== (await page.evaluate(() => App.problems().map((p) => p.id).join())), 'a new attempt should bring new equations');

  /* ---- no LMS at all: the page still runs and saves to the browser */
  const page2 = await browser.newPage({ viewport: { width: 1366, height: 650 } });
  page2.on('pageerror', (e) => problems.push('standalone page error: ' + e.message));
  await page2.goto(URL);
  expect((await page2.textContent('#lms')).indexOf('Standalone') >= 0, 'standalone badge');
  await page2.click('.screen-box .primary');
  expect(!!(await page2.evaluate((s) => localStorage.getItem(s), STORE)), 'standalone: no save in localStorage');
  await page2.close();

  await browser.close();
  if (problems.length) { console.error(problems.join('\n')); console.error(problems.length + ' problem(s)'); process.exit(1); }
  console.log('Walkthrough passed: lesson, 6 questions, 10 equations, score ' + pct + '% (12 of 16) and completion reached the LMS, best score kept.');
})();

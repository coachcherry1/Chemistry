/* tools/walkthrough.js — plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   ALL=1 node tools/walkthrough.js      # first builds every species once (slower)
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *
 * It makes a wrong Rule 1 answer and a wrong central atom in every build,
 * tries to expand the octet of every period-3 central atom (and checks the
 * anti-AI message appears and the build refuses it) and to add a double bond
 * to B and Be (and checks they are refused as exceptions), makes and then undoes
 * every Rule 5 bond in the builds that need one, answers some checkpoint
 * questions wrongly on purpose — three of them with the extra-double-bond choice —
 * reloads the page halfway to check that progress resumes, opens a fresh
 * attempt in the same browser to check it does NOT resume, and finally checks
 * what reached the "LMS": the score, the completion status, the interaction
 * records, and that nothing about the anti-AI messages was sent.
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
/* answered wrongly on purpose; the 'expand' ones and e-spot pick the extra-double-bond choice */
const WRONG = { 'a-nf3-total': 1, 'c-h-where': 1, 'b-clo4-struct': 'expand', 'd-bf3-rule5': 1, 'd-sf6-struct': 'expand',
  'e-spot': 1 };
const SNARKY = new Set(['b-clo4-struct', 'd-sf6-struct', 'e-spot']);

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
  const context = await browser.newContext({ viewport: { width: 1180, height: 900 } });
  const page = await context.newPage();
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
  const stepId = () => page.evaluate(() => App.STEPS[App.state().step].id);
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

  /* ALL=1: first build every species once, in board mode (?build=ID, which
     uses the Rule 1 table), so a problem with any one of them shows up
     rather than only when the random Part 5 pick happens to land on it */
  if (process.env.ALL) {
    const ids = await page.evaluate(() => Object.keys(SPECIES));
    for (const sid of ids) {
      await page.goto(URL + '?build=' + sid);
      await build(sid);
    }
    await page.goto(URL);
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.reload();
  }

  await page.click('.screen .primary');

  /* ---- the worked example */
  for (let i = 0; i < 5; i++) await page.click('button:has-text("Next rule")');
  expect(/all five rules/i.test(await feedback()), 'demo did not finish');
  await next();

  /* ---- one build, start to finish */
  /* `only` = a species id: build it in the teacher's board mode (?build=ID)
     instead of the current step, and do not press Next */
  async function build(only) {
    const id = only || await stepId();
    const info = await page.evaluate((only) => {
      const s = only ? null : App.STEPS[App.state().step];
      const sp = Lewis.species(only || s.sp || App.state().pool[s.pool]);
      const r = Lewis.solve(sp);
      return { sp, r: { total: r.total, neutral: r.valence.neutral, rows: r.valence.rows, adjust: r.valence.adjust,
        used2: r.used2, left2: r.left2, left3: r.left3, s2: r.s2, s3: r.s3, s4: r.s4, moves: r.moves, after4: r.centerAfter4,
        target: r.centerTarget }, period: ELEMENTS[sp.center].period, stable: !!ELEMENTS[sp.center].stable };
    }, only || null);
    const { sp, r } = info;
    const check = (label) => page.click(`.work button:has-text("${label || 'Check'}")`);

    /* Rule 1 — wrong, then right */
    const table = await page.$('.v-table');
    if (table) {
      const ins = await page.$$('.v-table input');
      let i = 0;
      for (const row of r.rows) await ins[i++].fill(String(row.each));
      if (sp.charge) await ins[i++].fill((r.adjust > 0 ? '+' : '-') + Math.abs(r.adjust));
    }
    await page.fill('.rule-form input >> nth=-1', String(r.total + 2));
    await check();
    expect((await fbClass()).includes('bad'), `${id}: a wrong Rule 1 total was accepted`);
    await page.fill('.rule-form input >> nth=-1', String(r.total));
    await check();
    expect(/Right/.test(await feedback()), `${id}: right Rule 1 total refused: ${await feedback()}`);

    /* Rule 2 — the wrong central atom, then the right one, then every atom */
    const wrong = sp.parts.find((p) => p.el !== sp.center).el;
    await page.click(`.tray .tile[aria-label="Atom ${wrong}"] >> nth=0`);
    await page.click('.drop[data-drop="C"]');
    expect((await fbClass()).includes('bad'), `${id}: ${wrong} accepted as the central atom`);
    await page.click(`.tray .tile[aria-label="Atom ${sp.center}"] >> nth=0`);
    await page.click('.drop[data-drop="C"]');
    const slots = Object.keys(r.s2.at).filter((k) => k !== 'C').sort((a, b) => a.endsWith('2') - b.endsWith('2'));
    for (const k of slots) {
      await page.click(`.tray .tile[aria-label="Atom ${r.s2.at[k]}"] >> nth=0`);
      await page.click(`.drop[data-drop="${k}"]`);
    }
    await check('Check the skeleton');
    expect(/Skeleton correct/.test(await feedback()), `${id}: skeleton refused: ${await feedback()}`);
    await page.fill('.rule-form input >> nth=0', String(r.used2));
    await page.fill('.rule-form input >> nth=1', String(r.left2));
    await check();
    expect(/left for Rules 3 and 4/.test(await feedback()), `${id}: Rule 2 tally refused: ${await feedback()}`);

    /* Rule 3 */
    for (const k of Object.keys(r.s3.lp)) {
      if (k === 'C') continue;
      for (let i = 0; i < r.s3.lp[k]; i++) await page.click(`.atom[data-slot="${k}"]`);
    }
    await page.fill('.rule-form input', String(r.left3));
    await check();
    expect(/Outer octets done/.test(await feedback()), `${id}: Rule 3 refused: ${await feedback()}`);

    /* Rule 4 */
    for (let i = 0; i < r.s4.lp.C; i++) await page.click('.atom[data-slot="C"]');
    await check();
    expect(/Every electron is placed/.test(await feedback()), `${id}: Rule 4 refused: ${await feedback()}`);

    /* Rule 5 */
    await page.fill('.rule-form input', String(r.after4));
    await check();
    if (r.after4 >= r.target) {
      const k = Object.keys(r.s4.at).find((x) => x !== 'C' && !x.endsWith('2') && r.s4.lp[x] > 0);
      if (k) {
        await page.click(`.lp.active[data-slot="${k}"] >> nth=0`);
        const cls = await fbClass();
        if (info.stable) expect(cls.includes('bad') && /exception/.test(await feedback()), `${id}: a double bond to ${sp.center} was not refused as an exception`);
        else if (info.period >= 3) expect(cls.includes('snark'), `${id}: a double bond on full ${sp.center} got no anti-AI message`);
        else expect(cls.includes('bad') && /never have more than 8/.test(await feedback()), `${id}: a period-2 octet was expanded`);
        const allSingle = await page.evaluate(() =>
          [...document.querySelectorAll('.work .bond')].every((b) => b.querySelectorAll('line').length === 1));
        expect(allSingle, `${id}: the refused double bond was drawn anyway`);
      }
      expect(!(await page.$('button:has-text("Undo last bond")')), `${id}: Undo shown where no bond can ever be made`);
      await check('Done');
    } else {
      const bonds = () => page.evaluate(() =>
        [...document.querySelectorAll('.work .bond')].map((b) => b.querySelectorAll('line').length).join(''));
      expect(await page.isDisabled('button:has-text("Undo last bond")'), `${id}: Undo enabled before any bond was made`);
      await check('Done');
      expect(/electron deficient/.test(await feedback()), `${id}: Done accepted with ${sp.center} short`);
      /* make every bond, take them all back one at a time, then make them again */
      const before = await bonds();
      for (const k of r.moves) await page.click(`.lp.active[data-slot="${k}"] >> nth=0`);
      expect(!/^Done!/.test((await feedback()).trim()), `${id}: finished before Done was pressed`);
      expect(!(await page.isDisabled('button:has-text("Undo last bond")')), `${id}: Undo disabled after making a bond`);
      for (let i = 0; i < r.moves.length; i++) await page.click('button:has-text("Undo last bond")');
      expect((await bonds()) === before, `${id}: Undo did not restore the structure (${await bonds()} vs ${before})`);
      expect(await page.isDisabled('button:has-text("Undo last bond")'), `${id}: Undo still enabled with nothing left to undo`);
      for (const k of r.moves) await page.click(`.lp.active[data-slot="${k}"] >> nth=0`);
      await check('Done');
    }
    expect(/^Done!/.test((await feedback()).trim()), `${id}: build did not finish: ${await feedback()}`);
    if (!only) await next();
  }

  /* ---- a checkpoint */
  async function quiz() {
    for (;;) {
      const q = await page.$('.q-text');
      if (!q) break;
      const id = await page.evaluate(() => {
        const n = +document.querySelector('.q-count').textContent.match(/\d+/)[0];
        const k = App.STEPS[App.state().step].quiz;
        return App.state().draws[k][n - 1];
      });
      let pick = 0;
      if (WRONG[id] === 'expand') {
        pick = await page.evaluate((qid) => {
          for (const k in QUIZZES) for (const q of QUIZZES[k].pool) if (q.id === qid) {
            return q.choices.findIndex((c, i) => i > 0 && App.isSnark(q, i));
          }
          return 1;
        }, id);
      } else if (WRONG[id]) pick = WRONG[id];
      await page.click(`.choice[data-choice="${pick}"]`);
      const cls = await fbClass();
      if (pick === 0) expect(cls.includes('good'), `${id}: right answer not marked right`);
      else if (SNARKY.has(id)) expect(cls.includes('snark'), `${id}: expanded-octet choice got no anti-AI message`);
      else expect(cls.includes('bad'), `${id}: wrong answer not marked wrong`);
      await page.click('.quiz .btnrow .primary');
    }
    expect(/Checkpoint finished/.test(await feedback()), 'checkpoint did not finish');
    await next();
  }

  /* Part 1 */
  for (let i = 0; i < 3; i++) await build();
  await quiz();

  /* Part 2, with a reload in the middle of it */
  await build();
  await page.reload();
  await page.click('.screen .primary');
  expect((await stepId()) === 'b-SO4', 'did not resume at the step after the reload: ' + (await stepId()));
  await build();
  await quiz();

  /* Part 3: oxyacids; Part 4: octet exceptions; Part 5: on your own */
  for (let i = 0; i < 2; i++) await build();
  await quiz();
  for (let i = 0; i < 4; i++) await build();
  await quiz();
  for (let i = 0; i < 2; i++) await build();
  await quiz();

  /* results */
  await snap('results');
  const lms = await page.evaluate(() => window.__lms);
  const answered = Object.keys(lms).filter((k) => /^cmi\.interactions\.\d+\.id$/.test(k)).length;
  const wrongDrawn = await page.evaluate((w) => {
    const st = App.state();
    return Object.values(st.draws).flat().filter((id) => w.includes(id)).length;
  }, Object.keys(WRONG));
  const want = Math.round(100 * (16 - wrongDrawn) / 16);
  expect(lms['cmi.core.lesson_status'] === 'completed', 'status is ' + lms['cmi.core.lesson_status']);
  expect(+lms['cmi.core.score.raw'] === want, `score is ${lms['cmi.core.score.raw']}, expected ${want}`);
  expect(answered === 16, `${answered} interaction records, expected 16`);
  const leaks = Object.keys(lms).filter((k) => /snark|chatbot/i.test(k + ' ' + lms[k]));
  expect(leaks.length === 0, 'something about the anti-AI messages reached the LMS: ' + leaks.join(', '));

  /* a reset attempt (or the next student on the same Chromebook): a new tab
     in the same browser has the same localStorage but an empty LMS, and must
     start from the beginning, not resume this student's finished attempt */
  const fresh = await context.newPage();
  await fresh.addInitScript(fakeLMS);
  await fresh.goto(URL);
  const startText = (await fresh.textContent('.screen .primary')).trim();
  expect(startText === 'Start', `a fresh attempt offered "${startText}" instead of starting over`);
  expect(/: 0 \/ 16/.test(await fresh.textContent('#score')), 'a fresh attempt showed an old score');

  await browser.close();
  if (problems.length) {
    console.error(problems.map((p) => '✗ ' + p).join('\n'));
    process.exit(1);
  }
  console.log(`✓ walkthrough passed: ${process.env.ALL ? 'every species in board mode, then ' : ''}13 builds, ` +
    `16 checkpoint answers, score ${lms['cmi.core.score.raw']}, a reset attempt starts fresh, ` +
    `status ${lms['cmi.core.lesson_status']}, resumed after a reload, no anti-AI reporting.`);
})();

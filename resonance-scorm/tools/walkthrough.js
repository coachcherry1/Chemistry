/* tools/walkthrough.js — plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   POOL=SO3 node tools/walkthrough.js   # force the Part 4 species
 *   ALL=1 node tools/walkthrough.js      # first builds every species once (slower)
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *
 * Builds: a wrong Rule 1 total and a wrong central atom every time, Rule 5
 * made, undone and made again. Finding resonance structures: "found them all"
 * too early, "Add" before Rule 5, a structure that repeats one already found,
 * an undo, a second double bond (refused — and the anti-AI message for S in
 * the teacher demo), then every structure. Hybrids: a wrong prediction first,
 * the averaging animation, the bond-length ruler. Some checkpoint questions are
 * answered wrongly on purpose, one with the extra-double-bond drawing. The page
 * is reloaded halfway to check that progress resumes, Back is used to check a
 * finished step reopens finished, a fresh attempt in the same browser must NOT
 * resume, and at the end it checks what reached the "LMS": the score, the
 * completion status, the interaction records, and that nothing about the
 * anti-AI messages was sent.
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
/* answered wrongly on purpose; 'expand' picks the extra-double-bond drawing */
const WRONG = { 'a-o3-order': 1, 'b-no2-charge': 1, 'c-co3-hybrid': 1, 'd-so2-rules': 'expand', 'd-which': 3 };
const SNARKY = new Set(['d-so2-rules']);

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

  const expect = (cond, msg) => { if (!cond) problems.push(msg); };
  const feedback = () => page.textContent('#feedback');
  const fbClass = () => page.getAttribute('#feedback', 'class');
  const stepId = () => page.evaluate(() => App.STEPS[App.state().step].id);
  const speciesId = () => page.evaluate(() => {
    const s = App.STEPS[App.state().step];
    return s.sp || App.state().pool[s.pool];
  });
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

  /* ---- one build, start to finish (the Lewis activity's builder) */
  /* `only` = a species id: build it in the teacher's board mode instead of
     the current step, and do not press Next */
  async function build(only) {
    const id = only || await speciesId();
    const info = await page.evaluate((sid) => {
      const sp = Lewis.species(sid);
      const r = Lewis.solve(sp);
      return { sp, r: { total: r.total, rows: r.valence.rows, adjust: r.valence.adjust, used2: r.used2, left2: r.left2,
        left3: r.left3, s2: r.s2, s3: r.s3, s4: r.s4, moves: r.moves, after4: r.centerAfter4, target: r.centerTarget } };
    }, id);
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

    /* Rule 2 — the wrong central atom (if there is one), then the right one */
    const wrong = sp.parts.find((p) => p.el !== sp.center);
    if (wrong) {
      await page.click(`.tray .tile[aria-label="Atom ${wrong.el}"] >> nth=0`);
      await page.click('.drop[data-drop="C"]');
      expect((await fbClass()).includes('bad'), `${id}: ${wrong.el} accepted as the central atom`);
    }
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

    /* Rule 5 — every species here is short, so: Done too early, then make,
       undo and remake the bond */
    await page.fill('.rule-form input', String(r.after4));
    await check();
    expect(r.after4 < r.target, `${id}: the central atom is not short after Rule 4 — no resonance`);
    const bonds = () => page.evaluate(() =>
      [...document.querySelectorAll('.work .bond')].map((b) => b.querySelectorAll('line').length).join(''));
    await check('Done');
    expect(/electron deficient/.test(await feedback()), `${id}: Done accepted with ${sp.center} short`);
    const before = await bonds();
    for (const k of r.moves) await page.click(`.lp.active[data-slot="${k}"] >> nth=0`);
    for (let i = 0; i < r.moves.length; i++) await page.click('button:has-text("Undo last bond")');
    expect((await bonds()) === before, `${id}: Undo did not restore the structure`);
    for (const k of r.moves) await page.click(`.lp.active[data-slot="${k}"] >> nth=0`);
    await check('Done');
    expect(/^Done!/.test((await feedback()).trim()), `${id}: build did not finish: ${await feedback()}`);
    if (!only) await next();
  }

  /* ---- find every resonance structure */
  async function finder(only) {
    const id = only || await speciesId();
    const info = await page.evaluate((sid) => {
      const sp = Lewis.species(sid);
      return { period: ELEMENTS[sp.center].period, structs: Hybrid.structures(sp).map((s) =>
        Lewis.DIRS.filter((d) => s.at[d] && s.bo[d] > 1)) };
    }, id);
    const n = info.structs.length;
    const share = (k) => page.click(`.finder .work .lp.active[data-slot="${k}"] >> nth=0`);
    const count = () => page.evaluate(() => document.querySelectorAll('.finder .found-panel .res-card').length);
    const doubles = () => page.evaluate(() =>
      [...document.querySelectorAll('.finder .work .bond')].filter((b) => b.querySelectorAll('line').length > 1).length);

    expect((await count()) === 1, `${id}: the finder does not start with structure A`);
    await page.click('button:has-text("found them all")');
    expect((await fbClass()).includes('bad') && /Not yet/.test(await feedback()), `${id}: "found them all" accepted too early`);
    await page.click('button:has-text("Add this structure")');
    expect((await fbClass()).includes('bad') && /Rule 5/.test(await feedback()), `${id}: a structure after Rule 4 was added`);

    /* structure A again: refused as a repeat, then undone */
    await share(info.structs[0][0]);
    await page.click('button:has-text("Add this structure")');
    expect(/already have/.test(await feedback()), `${id}: a repeat of structure A was not refused`);
    await page.click('.finder button:has-text("Undo last bond")');
    expect((await doubles()) === 0, `${id}: Undo did not take the bond back`);
    expect(await page.isDisabled('.finder button:has-text("Undo last bond")'), `${id}: Undo enabled with nothing to undo`);

    for (let i = 1; i < n; i++) {
      for (const k of info.structs[i]) await share(k);
      if (i === n - 1) {
        /* a second double bond: the central atom already has 8 */
        const other = info.structs[0][0];
        await share(other);
        const cls = await fbClass();
        if (info.period >= 3) expect(cls.includes('snark'), `${id}: a second double bond on full S got no anti-AI message`);
        else expect(cls.includes('bad') && /never have more than 8/.test(await feedback()), `${id}: a period-2 octet was expanded`);
        expect((await doubles()) === 1, `${id}: the refused double bond was drawn anyway`);
      }
      await page.click('button:has-text("Add this structure")');
      expect((await fbClass()).includes('good'), `${id}: structure ${i + 1} refused: ${await feedback()}`);
      expect((await count()) === i + 1, `${id}: the gallery shows ${await count()} structures, expected ${i + 1}`);
    }
    if (only) return;
    expect(await page.isDisabled('#next'), `${id}: Next enabled before "found them all"`);
    await page.click('button:has-text("found them all")');
    expect((await fbClass()).includes('good'), `${id}: "found them all" refused with all ${n}`);
    expect((await page.$$('.finder .res-arrow')).length === n - 1, `${id}: the finished row has no ↔ arrows`);
    await next();
  }

  /* ---- the hybrid: predict, average, ruler */
  async function hybrid() {
    const id = await speciesId();
    const info = await page.evaluate((sid) => ({ order: Hybrid.compute(Lewis.species(sid)).order, ruler: !!BONDS[sid] }), id);
    expect(await page.isDisabled('button:has-text("Average them")'), `${id}: Average enabled before the prediction`);
    expect(await page.isDisabled('#next'), `${id}: Next enabled before the hybrid`);
    /* a wrong prediction: the plain "2" */
    const wrongIdx = await page.evaluate(() =>
      [...document.querySelectorAll('.predict .choice')].findIndex((b) => b.textContent.trim() === '2'));
    await page.click(`.predict .choice >> nth=${wrongIdx}`);
    const right = await page.textContent('.predict .choice.right');
    expect(right.trim() === info.order, `${id}: the prediction marks "${right}" right, not ${info.order}`);
    expect(await page.isVisible('.predict .reveal'), `${id}: no explanation after the prediction`);
    await page.click('button:has-text("Average them")');
    await page.waitForSelector('.hyb-key', { state: 'visible', timeout: 8000 });
    expect(await page.isVisible('.layer-hybrid'), `${id}: the hybrid did not appear`);
    const op = await page.evaluate(() => getComputedStyle(document.querySelector('.layer-hybrid')).opacity);
    expect(+op > 0.5, `${id}: the hybrid layer is still transparent (${op})`);
    if (info.ruler) {
      expect(await page.isDisabled('#next'), `${id}: Next enabled before the bond-length prediction`);
      await page.waitForSelector('.ruler-box', { state: 'visible' });
      await page.fill('.r-range', '135');
      await page.click('button:has-text("Lock in my prediction")');
      expect(await page.isVisible('.r-mark.actual'), `${id}: the measured length was not shown`);
      expect(/You predicted 135 pm/.test(await page.textContent('.ruler-box .reveal')), `${id}: the ruler did not echo the prediction`);
    } else {
      expect(!(await page.$('.ruler-box')), `${id}: a bond-length ruler for a species with no data`);
    }
    await page.waitForFunction(() => !document.getElementById('next').disabled, null, { timeout: 8000 });
    await next();
  }

  /* ---- ozone's two students */
  async function compare() {
    expect(await page.isDisabled('#next'), 'compare: Next enabled before answering');
    await page.click('.predict .choice[data-choice="0"]');
    expect(await page.isVisible('.predict .reveal .res-row'), 'compare: the reveal does not show the resonance structures');
    expect(/both/i.test(await page.textContent('.predict .choice.right')), 'compare: "both" is not the marked answer');
    await next();
  }

  /* ---- a checkpoint */
  async function quiz() {
    for (;;) {
      const q = await page.$('.q-text');
      if (!q || !(await page.$('.quiz .q-count'))) break;
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
      else if (SNARKY.has(id)) expect(cls.includes('snark'), `${id}: the extra-double-bond choice got no anti-AI message`);
      else expect(cls.includes('bad'), `${id}: wrong answer not marked wrong`);
      await page.click('.quiz .btnrow .primary');
    }
    expect(/Checkpoint finished/.test(await feedback()), 'checkpoint did not finish');
    await next();
  }

  /* ---- the teacher demo first: the anti-AI message for S, every species if ALL */
  await page.goto(URL + '?build=SO3');
  await page.click('button:has-text("Resonance structures")');
  await finder('SO3');
  if (process.env.ALL) {
    const ids = await page.evaluate(() => Object.keys(SPECIES).filter((id) => Hybrid.compute(Lewis.species(id)).n > 1));
    for (const sid of ids) {
      await page.goto(URL + '?build=' + sid);
      await page.click('button:has-text("Build it")');
      await build(sid);
      await page.click('button:has-text("Resonance structures")');
      await finder(sid);
    }
  }

  /* ---- the student's attempt */
  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
  if (process.env.POOL) await page.evaluate((p) => { App.state().pool.own = p; }, process.env.POOL);
  const pool = await page.evaluate(() => App.state().pool.own);
  await page.click('.screen .primary');

  /* Part 1 */
  await build();
  await compare();
  await hybrid();
  await quiz();

  /* Part 2, with a reload and a step back in the middle */
  await build();
  await finder();
  await page.reload();
  await page.click('.screen .primary');
  expect((await stepId()) === 'h-NO2', 'did not resume at the step after the reload: ' + (await stepId()));
  await page.click('#back');
  expect((await stepId()) === 'r-NO2', 'Back did not go back');
  expect((await page.$$('.finder .found-panel .res-card')).length === 2, 'a finished search did not reopen finished');
  expect(!(await page.isDisabled('#next')), 'Next disabled on a finished step');
  await page.click('#next');
  await hybrid();
  await finder();
  await hybrid();
  await quiz();

  /* Part 3, Part 4 */
  for (const f of [build, finder, hybrid, quiz]) await f();
  for (const f of [build, finder, hybrid, quiz]) await f();

  /* results */
  await snap('results');
  expect((await page.$$('.hyb-gallery .res-card')).length === 5, 'the results page does not show 5 hybrids');
  const lms = await page.evaluate(() => window.__lms);
  const answered = Object.keys(lms).filter((k) => /^cmi\.interactions\.\d+\.id$/.test(k)).length;
  const graded = await page.evaluate(() => App.GRADED);
  const wrongDrawn = await page.evaluate((w) => Object.values(App.state().draws).flat().filter((id) => w.includes(id)).length,
    Object.keys(WRONG));
  const want = Math.round(100 * (graded - wrongDrawn) / graded);
  expect(lms['cmi.core.lesson_status'] === 'completed', 'status is ' + lms['cmi.core.lesson_status']);
  expect(Math.round(+lms['cmi.core.score.raw']) === want, `score is ${lms['cmi.core.score.raw']}, expected ${want}`);
  expect(answered === graded, `${answered} interaction records, expected ${graded}`);
  const leaks = Object.keys(lms).filter((k) => /snark|chatbot/i.test(k + ' ' + lms[k]));
  expect(leaks.length === 0, 'something about the anti-AI messages reached the LMS: ' + leaks.join(', '));

  /* a fresh attempt in the same browser (the next student on the same
     Chromebook) must start from the beginning */
  const fresh = await context.newPage();
  await fresh.addInitScript(fakeLMS);
  await fresh.goto(URL);
  const startText = (await fresh.textContent('.screen .primary')).trim();
  expect(startText === 'Start', `a fresh attempt offered "${startText}" instead of starting over`);
  expect(new RegExp(`: 0 / ${graded}`).test(await fresh.textContent('#score')), 'a fresh attempt showed an old score');

  await browser.close();
  if (problems.length) {
    console.error(problems.map((p) => '✗ ' + p).join('\n'));
    process.exit(1);
  }
  console.log(`✓ walkthrough passed: ${process.env.ALL ? 'every resonance species in board mode, then ' : ''}` +
    `4 builds (Part 4: ${pool}), 5 resonance searches, 5 hybrids, ${graded} checkpoint answers, score ` +
    `${lms['cmi.core.score.raw']}, status ${lms['cmi.core.lesson_status']}, resumed after a reload, a fresh attempt ` +
    `starts over, no anti-AI reporting.`);
})();

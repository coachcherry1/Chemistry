/* tools/walkthrough.js: plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *   DARK=1 ...                           # the same in dark mode
 *
 * It builds H2O, CO2 and BF3 with the 5 rules (a wrong total first, the wrong
 * central atom first), checks that the 3D window follows the drawing and
 * spreads into 3D only after the domains are counted (a wrong count first),
 * names the geometries (a wrong name first, one by dragging), sorts the Lewis
 * structures (a wrong box first), decides polar or nonpolar (a wrong call
 * first), runs the field test, answers one core question per checkpoint
 * wrongly on purpose, reloads halfway, and finally checks what reached the
 * "LMS": the score, the completion status and the interaction records.
 * Before all that it checks that a save from another release, or one the
 * browser kept, is ignored and the student starts fresh; at the end it starts
 * a second attempt and checks that the gradebook keeps the best score.
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
const STORE = 'vsepr-polarity-state';
const SHOTS = process.env.SHOTS;
/* answered wrongly on purpose: one core question per checkpoint */
const WRONG = new Set(['a-why-double', 'b-why-lp', 'c-co2']);

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
  const label3D = (sel) => page.getAttribute((sel || '') + ' canvas.v3d', 'aria-label');
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
    await page.waitForFunction(() => !document.getElementById('next').disabled, null, { timeout: 15000 })
      .catch(() => problems.push('Next is still disabled on ' + id));
    await snap(id);
    await page.click(++nexts % 2 ? '#nextTop' : '#next');
    const [bottom, top] = [await page.isDisabled('#next'), await page.isDisabled('#nextTop')];
    expect(bottom === top, 'top and bottom Next disagree on ' + (await stepId()));
  }
  async function fb(re, what) {
    const t = await feedback();
    expect(re.test(t), what + ': ' + t);
  }
  const saved = () => page.evaluate(() => JSON.parse(JSON.parse(sessionStorage.getItem('lms'))['cmi.suspend_data']));
  const nextEnabled = () => page.waitForFunction(() => !document.getElementById('next').disabled, null, { timeout: 15000 });

  /* ---- fresh start: neither an old LMS save nor a browser save may be resumed */
  async function startsFresh(lmsVersion, browserVersion, what) {
    await page.evaluate((a) => {
      const draws = {};
      Object.keys(QUIZZES).forEach((k) => { draws[k] = QUIZZES[k].pool.slice(0, QUIZZES[k].draw).map((q) => q.id); });
      const old = (v) => JSON.stringify({ v: v, seed: 1, step: 7, max: 9, draws: draws, ans: { 'a-co2': 1 }, pick: {},
                                          pr: {}, done: { flat: 1 }, fin: 0, best: 61, att: 1 });
      const lms = { 'cmi.core.score.raw': '61', 'cmi.core.lesson_status': 'incomplete' };
      if (a.lms != null) lms['cmi.suspend_data'] = old(a.lms);
      window.API.LMSSetValue = () => 'true';
      sessionStorage.setItem('lms', JSON.stringify(lms));
      localStorage.clear();
      if (a.browser != null) localStorage.setItem(a.key, old(a.browser));
    }, { lms: lmsVersion, browser: browserVersion, key: STORE });
    await page.reload();
    await page.click('.screen .primary');
    expect((await stepId()) === 'flat', what + ' was resumed at ' + (await stepId()));
    const clean = await saved();
    expect(clean.v === (await page.evaluate(() => App.SCHEMA)), what + ': save not rewritten with the current schema');
    expect(Object.keys(clean.ans).length === 0 && Object.keys(clean.done).length === 0, what + ': old answers carried over');
  }
  await startsFresh(99, null, 'a save from another release');
  await startsFresh(null, await page.evaluate(() => App.SCHEMA), 'a browser save inside the LMS');

  /* ---- step 1: flat to 3D */
  await page.click('.predict .choice >> nth=1');
  expect(/flat/.test(await label3D()), 'flat: the 3D window does not start flat');
  await page.click('button:has-text("Let the domains spread out")');
  await nextEnabled();
  expect(/^3D model of CH₄: tetrahedral/.test(await label3D()), 'flat: no 3D CH4 after spreading: ' + await label3D());
  await fb(/Turn the molecule/, 'flat completion');
  await next();

  /* ---- the builds */
  async function build(count) {
    const id = await stepId();
    const info = await page.evaluate(() => {
      const s = App.STEPS[+document.getElementById('counter').textContent.match(/\d+/)[0] - 1];
      const sp = Lewis.species(s.sp), r = Lewis.solve(sp);
      return { sp, r: { total: r.total, used2: r.used2, left2: r.left2, left3: r.left3, s2: r.s2, s3: r.s3, s4: r.s4,
        moves: r.moves, after4: r.centerAfter4, target: r.centerTarget }, d: VSEPR.info(s.sp).domains };
    });
    const { sp, r } = info;
    const check = (lbl) => page.click(`.work button:has-text("${lbl || 'Check'}")`);
    expect(/Empty/.test(await label3D('.builder')), `${id}: the 3D window is not empty before Rule 2`);
    await page.fill('.rule-form input >> nth=-1', String(r.total + 2));
    await check();
    expect((await fbClass()).includes('bad'), `${id}: a wrong Rule 1 total was accepted`);
    await page.fill('.rule-form input >> nth=-1', String(r.total));
    await check();
    const wrong = sp.parts.find((p) => p.el !== sp.center).el;
    await page.click(`.tray .tile[aria-label="Atom ${wrong}"] >> nth=0`);
    await page.click('.drop[data-drop="C"]');
    expect((await fbClass()).includes('bad'), `${id}: ${wrong} accepted as the central atom`);
    await page.click(`.tray .tile[aria-label="Atom ${sp.center}"] >> nth=0`);
    await page.click('.drop[data-drop="C"]');
    for (const k of Object.keys(r.s2.at).filter((k) => k !== 'C')) {
      await page.click(`.tray .tile[aria-label="Atom ${r.s2.at[k]}"] >> nth=0`);
      await page.click(`.drop[data-drop="${k}"]`);
    }
    expect(/drawn flat/.test(await label3D('.builder')), `${id}: the 3D window did not follow Rule 2`);
    await check('Check the skeleton');
    await page.fill('.rule-form input >> nth=0', String(r.used2));
    await page.fill('.rule-form input >> nth=1', String(r.left2));
    await check();
    for (const k of Object.keys(r.s3.lp)) {
      if (k === 'C') continue;
      for (let i = 0; i < r.s3.lp[k]; i++) await page.click(`.atom[data-slot="${k}"]`);
    }
    await page.fill('.rule-form input', String(r.left3));
    await check();
    for (let i = 0; i < r.s4.lp.C; i++) await page.click('.atom[data-slot="C"]');
    await check();
    await page.fill('.rule-form input', String(r.after4));
    await check();
    if (r.after4 < r.target) for (const k of r.moves) await page.click(`.lp.active[data-slot="${k}"] >> nth=0`);
    await check('Done');
    await fb(/^Done!/, `${id}: build not finished`);
    expect(await page.isDisabled('#next'), `${id}: Next enabled before the domains were counted`);
    expect(/drawn flat/.test(await label3D('.builder')), `${id}: spread into 3D before counting`);
    await page.click(`.count-row button:text-is("${count.wrong}")`);
    expect((await fbClass()).includes('bad'), `${id}: a wrong count (${count.wrong}) was accepted`);
    await fb(count.why, `${id}: wrong-count feedback`);
    await page.click(`.count-row button:text-is("${info.d}")`);
    await nextEnabled();
    expect(/^3D model of/.test(await label3D('.builder')), `${id}: no 3D model after counting`);
    expect(/electron domains/.test(await page.textContent('.count-box')), `${id}: no geometry reveal`);
  }
  await build({ wrong: 2, why: /lone pairs/ });
  await next();
  await build({ wrong: 4, why: /ONE domain/ });
  await next();
  await build({ wrong: 4, why: /once/ });
  await next();

  /* ---- checkpoints */
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
      expect(!!(await page.$('.q-why:not([hidden])')), `${id}: no explanation after answering`);
      await page.click('.quiz .btnrow .primary');
    }
    expect(/Checkpoint finished/.test(await feedback()), `${id}: checkpoint did not finish`);
  }
  await quiz();

  /* ---- reload halfway: progress resumes */
  await page.reload();
  await page.click('.screen .primary');
  expect((await stepId()) === 'quiz-A', 'reload: resumed at ' + (await stepId()));
  await next();

  /* ---- gallery: a wrong name, one name by dragging, the rest by clicking */
  const names = await page.evaluate(() => App.STEPS.find((s) => s.id === 'gallery').set.map((id) => [id, VSEPR.info(id).geometry]));
  await page.click('.tray.names .tile:text-is("tetrahedral")');
  await page.click('.name-slot.drop[data-drop="PCl5"]');
  expect((await fbClass()).includes('bad'), 'gallery: tetrahedral accepted for PCl5');
  await fb(/5 domains/, 'gallery wrong-name feedback');
  const [dragId, dragName] = names[0];
  const from = await (await page.$(`.tray.names .tile:text-is("${dragName}")`)).boundingBox();
  const to = await (await page.$(`.name-slot.drop[data-drop="${dragId}"]`)).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(from.x + (to.x - from.x) * i / 8 + 10, from.y + (to.y - from.y) * i / 8 + 10);
  await page.mouse.up();
  expect(!(await page.$(`.name-slot.drop[data-drop="${dragId}"]`)), 'gallery: dragging a name did not place it');
  for (const [id, n] of names.slice(1)) {
    await page.click(`.tray.names .tile:text-is("${n}")`);
    await page.click(`.name-slot.drop[data-drop="${id}"]`);
  }
  await next();

  /* ---- lone pairs squeeze */
  expect(/109\.5°/.test(await label3D()), 'squeeze: CH4 angle not described');
  await page.click('.predict .choice >> nth=0');
  expect(/<109\.5°/.test(await label3D()), 'squeeze: NH3 not shown after the first prediction');
  await page.click('.predict .choice >> nth=1');
  expect(/<<109\.5°/.test(await label3D()), 'squeeze: H2O not shown after the second prediction');
  await next();

  /* ---- sort */
  await page.click('button:has-text("Hide the lone pairs")');
  expect(/Lone pairs hidden/.test(await label3D()), 'sort: hiding the lone pairs did nothing');
  const cards = await page.evaluate(() => App.STEPS.find((s) => s.id === 'sort').cards.map((id) => [Lewis.species(id).text, VSEPR.info(id).geometry]));
  await page.click('.lewis-tile[aria-label^="PCl₃,"]');
  await page.click('.bin[data-drop="tetrahedral"]');
  expect((await fbClass()).includes('bad'), 'sort: PCl3 accepted as tetrahedral');
  await fb(/lone pair/, 'sort wrong-box feedback');
  for (const [t, g] of cards) {
    await page.click(`.lewis-tile[aria-label^="${t},"]`);
    await page.click(`.bin[data-drop="${g}"]`);
  }
  await next();
  await quiz();
  await next();

  /* ---- radial symmetry */
  expect(!/δ/.test(await label3D()) || /hidden/.test(await label3D()) || !(await page.$('.q-choices.two')),
    'symmetry: charges shown before the prediction');
  await page.click('.predict .choice >> nth=1');
  await page.click('.q-choices.two .choice:text-is("Polar")');
  expect((await fbClass()).includes('bad'), 'symmetry: CO2 accepted as polar');
  for (;;) {
    const cur = await page.evaluate(() => document.querySelector('.chips .chip.on').textContent.replace(' ✓', ''));
    const polar = await page.evaluate((t) => VSEPR.polar(Object.keys(SPECIES).find((k) => Lewis.species(k).text === t)), cur);
    await page.click(`.q-choices.two .choice:text-is("${polar ? 'Polar' : 'Nonpolar'}")`);
    const more = await page.$('button:has-text("Next molecule")');
    if (!more) break;
    await more.click();
  }
  await next();

  /* ---- different outer atoms: predictions, some wrong */
  for (let n = 0; ; n++) {
    await page.click(`.q-choices.two .choice >> nth=${n % 2}`);
    expect(/δ/.test(await label3D()) || /polar/.test(await label3D()), 'outer: charges not shown after predicting');
    const more = await page.$('button:has-text("Next molecule")');
    if (!more) break;
    await more.click();
  }
  await next();

  /* ---- the field test */
  await page.click('.predict .choice >> nth=0');
  await page.click('.pfield .primary');
  await nextEnabled();
  const lined = await page.textContent('.reveal');
  expect(/H₂O, NH₃, CH₂Cl₂ turned to line up/.test(lined), 'field: the polar molecules did not all line up: ' + lined);
  expect(/CO₂, CCl₄, BF₃ kept tumbling/.test(lined), 'field: a nonpolar molecule lined up: ' + lined);
  await next();
  await quiz();
  await next();

  /* ---- results and the LMS */
  expect((await stepId()) === 'results', 'did not reach results');
  const lms = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lms')));
  const graded = await page.evaluate(() => App.GRADED);
  const expected = Math.round(100 * (graded - WRONG.size) / graded);
  expect(lms['cmi.core.lesson_status'] === 'completed', 'LMS status ' + lms['cmi.core.lesson_status']);
  expect(+lms['cmi.core.score.raw'] === expected, `LMS score ${lms['cmi.core.score.raw']}, expected ${expected}`);
  const nInt = Object.keys(lms).filter((k) => /^cmi\.interactions\.\d+\.id$/.test(k)).length;
  expect(nInt === graded, `${nInt} interaction records, expected ${graded}`);
  const wrongRecorded = Object.keys(lms).filter((k) => /\.result$/.test(k) && lms[k] === 'wrong').length;
  expect(wrongRecorded === WRONG.size, `${wrongRecorded} wrong answers recorded, expected ${WRONG.size}`);
  expect(!(await saved()).hasOwnProperty('snark'), 'anti-AI count saved');
  console.log(`Results screen: ${(await page.textContent('.big-score')).trim()}`);
  console.log(`LMS: status=${lms['cmi.core.lesson_status']} score.raw=${lms['cmi.core.score.raw']} interactions=${nInt} suspend_data=${lms['cmi.suspend_data'].length} chars`);

  /* ---- a second attempt keeps the best score */
  await page.click('button:has-text("Start a new attempt")');
  await page.click('button:has-text("Yes, start again")');
  expect((await stepId()) === 'flat', 'retry: did not restart at step 1');
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

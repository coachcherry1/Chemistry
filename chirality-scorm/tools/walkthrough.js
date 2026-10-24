/* tools/walkthrough.js: plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *   DARK=1 ...                           # the same in dark mode
 *
 * It answers some checkpoint questions wrongly on purpose, makes wrong
 * drawings, wrong rankings, wrong clicks and wrong readings, tries to read a
 * centre before 4 is on the dash, reloads the page halfway to check that
 * progress resumes, and finally checks what reached the "LMS": the score, the
 * completion status and the interaction records. Before all that it checks
 * that a save from another release, or one the browser kept from another
 * copy of the package, is ignored and the student starts fresh. At the end
 * it starts a second attempt and checks that the gradebook keeps the best
 * score.
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
const STORE = 'chirality-state';
const SHOTS = process.env.SHOTS;
/* answered wrongly on purpose: one core question per checkpoint */
const WRONG = new Set(['a-chiral', 'b-top', 'c-read-wedge', 'd-A-B']);

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
  const wait = (ms) => page.waitForTimeout(ms);
  let shot = 0;
  async function snap(name) {
    if (!SHOTS) return;
    fs.mkdirSync(SHOTS, { recursive: true });
    await wait(150);
    await page.screenshot({ path: path.join(SHOTS, String(++shot).padStart(2, '0') + '-' + name + '.png'), fullPage: true });
  }
  /* Next appears above the step and below it: use each in turn, and check
     the two always agree */
  let nexts = 0;
  async function next() {
    const id = await stepId();
    expect(!(await page.isDisabled('#next')), 'Next is still disabled on ' + id);
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
  const predict = (n) => page.click(`.predict .choice >> nth=${n || 0}`);
  async function place(tile, target) {
    await page.click(`.tray .tile[data-tile="${tile}"]`);
    await page.click(target);
  }
  /* the atoms of a centre's groups in priority order, read from the page's
     own model of whatever molecule is shown */
  const ranks = (expr, centre) => page.evaluate(([e, c]) => {
    const m = (0, eval)(e);
    const cc = c == null ? CIP.centres(m)[0] : m.carbonAt[c];
    return CIP.rank(m, cc).order;
  }, [expr, centre]);
  async function read123(order) {
    for (let k = 0; k < 3; k++) await page.click(`.gdrop[data-drop="${order[k]}"]`);
  }
  const rule = () => page.textContent('.rule');
  async function turn(label) { await page.click(`.turnbar button:has-text("${label}")`); await wait(900); }

  /* ---- fresh start: a save from another release in the LMS, then a current
     save the browser kept from another copy of the package; neither may be resumed */
  async function startsFresh(lmsVersion, browserVersion, what) {
    await page.evaluate((a) => {
      const draws = {};
      Object.keys(QUIZZES).forEach((k) => { draws[k] = QUIZZES[k].pool.slice(0, QUIZZES[k].draw).map((q) => q.id); });
      const ans = {};
      ans[draws[Object.keys(draws)[0]][0]] = 0;
      const old = (v) => JSON.stringify({ v: v, seed: 1, step: 9, max: 12, draws: draws, ans: ans, pick: {},
                                          pr: {}, done: { mirror: 1 }, fin: 0, best: 61, att: 1 });
      const lms = { 'cmi.core.score.raw': '61', 'cmi.core.lesson_status': 'incomplete' };
      if (a.lms != null) lms['cmi.suspend_data'] = old(a.lms);
      sessionStorage.setItem('lms-next', JSON.stringify(lms));
      localStorage.clear();
      if (a.browser != null) localStorage.setItem(a.key, old(a.browser));
    }, { lms: lmsVersion, browser: browserVersion, key: STORE });
    await page.reload();
    await page.click('.screen .primary');
    expect((await stepId()) === 'mirror', what + ' was resumed at ' + (await stepId()));
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
      'checkpoint ' + (sideTable ? 'has no' : 'should not have an') + ' atomic-number table beside it');
    for (;;) {
      const btn = await page.$('.quiz .choice');
      if (!btn) break;
      const id = await page.getAttribute('.quiz', 'data-qid');
      expect(!!id, 'a question on screen is not in the bank');
      const pick = WRONG.has(id) ? 1 : 0;
      await page.click(`.quiz .choice[data-choice="${pick}"]`);
      expect(!(await page.isHidden('.q-why')), 'no explanation after answering ' + id);
      await page.click('.quiz .btnrow .primary');
    }
    await fb(/Checkpoint finished/, 'checkpoint did not finish');
  }

  /* ---- Part 1 */
  await predict(1);
  expect(await page.isDisabled('button:has-text("Slide them together")'), 'mirror: sliding allowed before trying');
  await page.click('.turnbar button:has-text("Turn it over")');
  await wait(900);
  await page.click('button:has-text("Slide them together")');
  await wait(1000);
  expect(/You predicted/.test(await page.textContent('.reveal')), 'mirror: reveal does not mention the wrong prediction');
  expect(/2 of 4/.test(await page.textContent('.meter-text')), 'mirror: CHBrClF should line up 2 of 4 atoms');
  await page.click('button:has-text("Next molecule")');
  await predict(0);
  await page.click('.turnbar button:has-text("Turn it over")');
  await wait(900);
  await page.click('button:has-text("Slide them together")');
  await wait(1000);
  await fb(/CH₂BrCl is achiral/, 'mirror step did not complete');
  await page.click('button:has-text("Show the mirror plane")');
  await next();

  /* drawmirror: the turned-over molecule first (wrong), then both mirrors */
  await place('Cl', '.slot[data-drop="ul"]'); await place('Br', '.slot[data-drop="ur"]');
  await place('H', '.slot[data-drop="w"]'); await place('F', '.slot[data-drop="d"]');
  await page.click('button:has-text("Check")');
  await fb(/turned over|only turned/, 'turned-over drawing not explained');
  await page.click('button:has-text("Clear")');
  await place('Cl', '.slot[data-drop="ul"]'); await place('Br', '.slot[data-drop="ur"]');
  await place('F', '.slot[data-drop="w"]'); await place('H', '.slot[data-drop="d"]');
  await page.click('button:has-text("Check")');
  await fb(/Correct! Now the mirror lies flat behind the page/, 'mirror beside not accepted');
  await place('Br', '.slot[data-drop="ul"]'); await place('Cl', '.slot[data-drop="ur"]');
  await place('H', '.slot[data-drop="w"]'); await place('F', '.slot[data-drop="d"]');
  await page.click('button:has-text("Check")');
  await fb(/Both mirror images drawn/, 'mirror behind not accepted');
  await next();

  /* centres: one wrong click per molecule where there is one to make */
  await page.click('.cdrop[data-drop="3"]');
  await fb(/two H atoms|not a chirality centre/, 'wrong carbon not explained');
  await page.click('.cdrop[data-drop="2"]');
  await wait(1200);
  await page.click('.cdrop[data-drop="3"]');
  await fb(/two CH₂CH₃ groups/, '3-methylpentane C3 not explained');
  await page.click('button:has-text("It has no chirality centres")');
  await wait(1200);
  await page.click('button:has-text("It has no chirality centres")');
  await fb(/Look again/, 'wrong "no chirality centres" accepted');
  await page.click('.cdrop[data-drop="2"]');
  await fb(/two CH₃ groups/, '2,3-dimethylpentane C2 not explained');
  await page.click('.cdrop[data-drop="3"]');
  await wait(1200);
  await page.click('.cdrop[data-drop="2"]');
  await page.click('.cdrop[data-drop="3"]');
  await fb(/All four molecules done/, 'centres step did not complete');
  await next();

  await quiz(false); await next();

  /* ---- Part 2: rank, then ties */
  async function rankRight(expr) {
    const o = await page.evaluate((e) => { const m = (0, eval)(e); return CIP.rank(m, m.centre).order; }, expr);
    for (let k = 0; k < 4; k++) await place(String(k + 1), `.gdrop[data-drop="${o[k]}"]`);
    await page.click('button:has-text("Check")');
  }
  await predict(1);
  {
    const o = await page.evaluate(() => { const m = molecule('chbrclf'); return CIP.rank(m, m.centre).order; });
    await place('1', `.gdrop[data-drop="${o[1]}"]`); await place('2', `.gdrop[data-drop="${o[0]}"]`);
    await place('3', `.gdrop[data-drop="${o[2]}"]`); await place('4', `.gdrop[data-drop="${o[3]}"]`);
    await page.click('button:has-text("Check")');
    await fb(/Br \(atomic number 35\) outranks Cl/, 'wrong ranking not explained');
    await page.click('button:has-text("Clear")');
  }
  await rankRight("molecule('chbrclf')");
  await fb(/Correct/, 'right ranking not accepted');
  await page.click('button:has-text("Next molecule")');
  await rankRight("molecule('bcfe')");
  await fb(/lowest-ranked group is 4/, 'rank step did not complete');
  await next();

  await rankRight("molecule('butanol')");
  await page.click('button:has-text("Next molecule")');
  await predict(1);
  {
    const o = await page.evaluate(() => { const m = molecule('tmb'); return CIP.rank(m, m.centre).order; });
    await place('1', `.gdrop[data-drop="${o[1]}"]`); await place('2', `.gdrop[data-drop="${o[0]}"]`);
    await place('3', `.gdrop[data-drop="${o[2]}"]`); await place('4', `.gdrop[data-drop="${o[3]}"]`);
    await page.click('button:has-text("Check")');
    await fb(/\(O, H, H\).*\(C, C, C\).*O beats C/, 'CH₂OH against C(CH₃)₃ not explained');
    await page.click('button:has-text("Clear")');
  }
  await rankRight("molecule('tmb')");
  await page.click('button:has-text("Next molecule")');
  await rankRight("molecule('glyceraldehyde')");
  await fb(/first difference decides/, 'ties step did not complete');
  expect(/counts twice/.test(await page.textContent('.reveal')), 'glyceraldehyde reveal does not explain the double bond');
  await next();

  await quiz(true); await next();

  /* ---- resume: reload in the middle and make sure we come back here */
  const before = await stepId();
  await page.reload();
  await page.click('.screen .primary');
  expect((await stepId()) === before, 'resume went to ' + (await stepId()) + ' instead of ' + before);

  /* ---- Part 3 */
  /* wheel: a wrong first click, a wrong reading, then right */
  {
    const o = await ranks("molecule('bromobutane')", 2);
    await page.click(`.gdrop[data-drop="${o[1]}"]`);
    await fb(/That is 2\. Click 1 first/, 'wrong first click not explained');
    await read123(o);
    await page.click('button:has-text("Counterclockwise: S")');
    await fb(/clockwise, the way a clock/, 'wrong reading not explained');
    await page.click('button:has-text("Clockwise: R")');
    expect(/rockwise and S is sountersockwise/.test(await page.textContent('.reveal')), 'rockwise is not introduced');
    await page.click('button:has-text("Steering-wheel view")');
    await wait(800);
    await page.click('button:has-text("Next molecule")');
    const o2 = await ranks("molecule('butanol_S')");
    await read123(o2);
    await page.click('button:has-text("Counterclockwise: S")');
    await fb(/clockwise is R and counterclockwise is S/, 'wheel step did not complete');
  }
  await next();

  /* rotate: reading is locked until 4 is on the dash */
  await predict(0);
  expect(/4 is not on the dash\. Rotate the molecule\./.test(await rule()), 'rotate: the rule is not shown');
  expect(await page.isDisabled('button:has-text("Clockwise: R")'), 'rotate: R/S open before 4 is on the dash');
  {
    const o = await ranks("molecule('alanine_w')");
    await page.dispatchEvent(`.gdrop[data-drop="${o[0]}"]`, 'click');
    await fb(/Rotate the molecule first/, 'reading before rotating not stopped');
    await turn('Turn it over');
    expect(/4 is on the dash/.test(await rule()), 'rotate: Turn it over did not put 4 on the dash');
    await read123(o);
    await page.click('button:has-text("Counterclockwise: S")');
    await page.click('button:has-text("Next molecule")');
    await turn('Turn it over');
    expect(/not on the dash/.test(await rule()), 'rotate: Turn it over should leave CH₃ in the page');
    let onDash = false;
    for (let n = 0; n < 8 && !onDash; n++) {
      /* the buttons are drawn afresh after every turn: Turn it over, then one spin per group */
      await page.click(`.turnbar button >> nth=${1 + (n % 4)}`);
      await wait(900);
      onDash = /4 is on the dash/.test(await rule());
    }
    expect(onDash, 'rotate: no spin put CH₃ on the dash');
    const o2 = await ranks("molecule('bcfe_plane')");
    await read123(o2);
    await page.click('button:has-text("Clockwise: R")');
    await fb(/If 4 is not on the dash, rotate the molecule/, 'rotate step did not complete');
  }
  await next();

  /* hidden: predict, then a mirror-image redraw, then the right one, then read */
  await predict(0);
  await turn('Turn it over');
  await place('OH', '.slot[data-drop="w"]'); await place('H', '.slot[data-drop="d"]');
  await place('CH3', '.slot[data-drop="ll"]'); await place('Et', '.slot[data-drop="lr"]');
  await page.click('button:has-text("Check")');
  await fb(/nothing else moved\. That drawing is the mirror image/, 'mirror-image redraw not explained');
  await page.click('button:has-text("Clear")');
  await place('OH', '.slot[data-drop="w"]'); await place('H', '.slot[data-drop="d"]');
  await place('Et', '.slot[data-drop="ll"]'); await place('CH3', '.slot[data-drop="lr"]');
  await page.click('button:has-text("Check")');
  await fb(/Correct! That is the same molecule/, 'right redraw not accepted');
  {
    const o = await page.evaluate(() => {
      const b = STEREO.fromSlots('A', { w: 'OH', d: 'H', ll: 'Et', lr: 'CH3' });
      return CIP.rank(b, b.centre).order;
    });
    await read123(o);
    await page.click('button:has-text("Counterclockwise: S")');
    await fb(/Find the hidden H first/, 'hidden step did not complete');
  }
  await next();

  /* enant: the mirror image (H on the wedge) is turned over and read */
  await predict(1);
  await turn('Turn it over');
  {
    const o = await page.evaluate(() => { const m = STEREO.mirror(molecule('butanol_R'), 'behind'); return CIP.rank(m, m.centre).order; });
    await read123(o);
    await page.click('button:has-text("Counterclockwise: S")');
    await turn('Turn it over');
    await fb(/Enantiomers: every chirality centre is opposite/, 'enant step did not complete');
    expect(/Still R/.test(await page.textContent('.reveal:last-of-type, .panel .reveal')), 'enant: the label does not stay R');
  }
  await next();

  await quiz(true); await next();

  /* ---- Part 4 */
  /* four: read C2 as drawn, C3 after turning over; then the relationships */
  await predict(0);
  {
    const o2 = await ranks("molecule('bcb_wd')", 2);
    await read123(o2);
    await page.click('button:has-text("Clockwise: R")');
    await fb(/Now C3/, 'C2 of molecule A not accepted');
    expect(/not on the dash/.test(await rule()), 'four: C3 of molecule A should need a rotation');
    await turn('Turn it over');
    const o3 = await ranks("molecule('bcb_wd')", 3);
    await read123(o3);
    await page.click('button:has-text("Counterclockwise: S")');
    await fb(/Molecule A is \(2R,3S\)/, 'molecule A not named');
    const rel = await page.evaluate(() => {
      const ms = App.STEPS.find((s) => s.id === 'four').mols.map(molecule), L = 'ABCD', out = {};
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) out[L[i] + L[j]] = STEREO.relation(ms[i], ms[j]);
      return out;
    });
    const keys = Object.keys(rel);
    await page.click('.tray .tile[data-tile="diastereomers"]');
    for (const k of keys) await page.click(`.rel-slot[data-drop="${k}"]`);
    await page.click('button:has-text("Check")');
    await fb(/both centres are opposite/, 'wrong relationship not explained');
    await page.click('.tray .tile[data-tile="enantiomers"]');
    for (const k of keys) if (rel[k] === 'enantiomers') await page.click(`.rel-slot[data-drop="${k}"]`);
    await page.click('button:has-text("Check")');
    await fb(/two pairs of enantiomers/, 'four step did not complete');
  }
  await next();

  /* Guided juxtaposition: the same rotation gives full overlap only for A. */
  await page.getByRole('button', { name: 'Turn both mirror images upside down', exact: true }).click();
  await page.getByRole('button', { name: 'Lay each image on its original', exact: true }).click();
  await wait(800);
  const comparison = await page.locator('.coach-result').allTextContents();
  expect(comparison[0].includes('Every atom fits') && comparison[1].includes('do not fit'), 'guided meso comparison has wrong overlap');
  await page.getByRole('button', { name: 'Both have two centres, so both must be chiral', exact: true }).click();
  await fb(/Two chirality centres do not guarantee/, 'meso misconception not coached');
  await page.getByRole('button', { name: 'A fits its own mirror image; B cannot', exact: true }).click();
  await fb(/whole structure must have the required symmetry/, 'meso comparison not completed');
  await next();

  /* meso: A fits its mirror image upside down; B never fits; A's mirror plane */
  await predict(1);
  await page.click('.turnbar button:has-text("Upside down")');
  await wait(900);
  await page.click('button:has-text("Slide them together")');
  await wait(1000);
  await fb(/A fits its mirror image exactly/, 'meso: A did not fit its mirror image');
  await page.click('.chips button:has-text("Molecule B")');
  await page.click('.turnbar button:has-text("Turn it over")');
  await wait(900);
  await page.click('button:has-text("Slide them together")');
  await wait(1000);
  await fb(/B never fits/, 'meso: B slide not reported');
  expect(await page.$('.turn-range'), 'meso: no slider for the mirror plane');
  await page.$eval('.turn-range', (el) => { el.value = 179; el.dispatchEvent(new Event('input')); });
  await fb(/meso: achiral/, 'meso step did not complete');
  expect(/eclipsed/.test(await page.textContent('.readout')), 'meso: the readout does not say eclipsed');
  await next();

  /* rings: everything "meso" first (wrong), then right */
  await predict(1);
  {
    const want = await page.evaluate(() => {
      const out = {};
      App.STEPS.find((s) => s.id === 'rings').mols.forEach((id) => { out[id] = App.ringAnswer(molecule(id)); });
      return out;
    });
    await page.click('.tray .tile[data-tile="meso"]');
    for (const id of Object.keys(want)) await page.click(`.drop-word[data-drop="${id}"]`);
    await page.click('button:has-text("Check")');
    await fb(/no mirror plane|cannot be meso/, 'wrong ring answer not explained');
    for (const w of ['meso', 'chiral', 'no chirality centres']) {
      await page.click(`.tray .tile[data-tile="${w}"]`);
      for (const id of Object.keys(want)) if (want[id] === w) await page.click(`.drop-word[data-drop="${id}"]`);
    }
    await page.click('.card >> nth=1');
    await page.click('button:has-text("Look for a mirror plane")');
    expect(/No mirror plane/.test(await page.textContent('.view-note')), 'rings: trans-1,3 should have no mirror plane');
    await page.click('button:has-text("Check")');
    await fb(/Rings follow the same rules/, 'rings step did not complete');
  }
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
  expect(/sountersockwise/.test(await page.textContent('.keylist')), 'results: the big ideas do not end with rockwise');
  const big = await page.textContent('.big-score');

  /* ---- a second attempt: everything cleared, best score kept */
  await page.click('button:has-text("Start a new attempt")');
  await page.click('button:has-text("Yes, start again")');
  const fresh = await saved();
  expect(fresh.att === 2, 'attempt counter is ' + fresh.att);
  expect(Object.keys(fresh.ans).length === 0, 'old answers survived the new attempt');
  expect(Object.keys(fresh.done).length === 0, 'old builds/steps survived the new attempt');
  expect(Math.round(fresh.best) === expected, 'best score not kept: ' + fresh.best);
  expect((await stepId()) === 'mirror', 'new attempt did not start at step 1');
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

  /* Alternate R/S strategy: read down C-to-4 before putting 4 on a dash. */
  const bondPage = await browser.newPage({ viewport: { width: 1366, height: 520 } });
  await bondPage.goto(URL + '?step=rotate');
  await bondPage.locator('.predict .choice').first().click();
  for (const label of ['S', 'R']) {
    await bondPage.getByRole('button', { name: /Steering-wheel view/ }).click();
    for (let n = 1; n <= 3; n++) await bondPage.getByRole('button', { name: new RegExp('^Trace ' + n + ':') }).click();
    await bondPage.getByRole('button', { name: label === 'S' ? 'Counterclockwise: S' : 'Clockwise: R', exact: true }).click();
    if (label === 'S') await bondPage.getByRole('button', { name: /Next molecule/ }).click();
  }
  expect((await bondPage.locator('#feedback').innerText()).includes('rotate the molecule'), 'C-to-4 strategy did not complete the two readings');
  await bondPage.close();

  console.log('Results screen: ' + big.trim());
  console.log('LMS: status=' + lms['cmi.core.lesson_status'] + ' score.raw=' + lms['cmi.core.score.raw'] +
              ' interactions=' + nInteractions + ' suspend_data=' + (lms['cmi.suspend_data'] || '').length + ' chars');
  console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'Walkthrough passed.');
  await browser.close();
  process.exit(problems.length ? 1 : 0);
})();

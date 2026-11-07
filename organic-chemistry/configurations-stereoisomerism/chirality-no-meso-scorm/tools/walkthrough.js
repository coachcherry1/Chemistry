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
const STORE = 'chirality-no-meso-state';
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
  /* Klein's spears, four ways: on the drawing, by keyboard, its button, or the rod in the 3D model */
  async function spear(id, via) {
    if (via === 'button') await page.click(`.spearbar button[data-spear="${id}"]`);
    else if (via === 'key') { await page.focus(`.mol-wrap .spear[data-spear="${id}"]`); await page.keyboard.press('Enter'); }
    else if (via === 'rod') {
      await page.evaluate((sid) => {
        const c = [...document.querySelectorAll('canvas.c3d')].filter((x) => x._viewer && x._viewer.rods.some((r) => r.id === sid))[0];
        c.scrollIntoView({ block: 'center' });
      }, id);
      await wait(150);
      const at = await page.evaluate((sid) => {
        const c = [...document.querySelectorAll('canvas.c3d')].filter((x) => x._viewer && x._viewer.rods.some((r) => r.id === sid))[0];
        const rs = c._viewer.rods.filter((x) => x.id === sid), r = rs[Math.floor(rs.length * 0.8)];
        const b = c.getBoundingClientRect(), k = b.width / c.width;
        return { x: b.left + (r.ax + r.bx) / 2 * k, y: b.top + (r.ay + r.by) / 2 * k };
      }, id);
      await page.mouse.click(at.x, at.y);
    } else {
      /* a point on the shaft, partway out from the carbon (a vertical line has no width to aim at) */
      await page.locator(`.mol-wrap .spear[data-spear="${id}"]`).scrollIntoViewIfNeeded();
      const at = await page.$eval(`.mol-wrap .spear[data-spear="${id}"] .spear-shaft`, (l) => {
        const sv = l.ownerSVGElement, pt = sv.createSVGPoint(), t = 0.62;
        pt.x = +l.getAttribute('x1') + (l.getAttribute('x2') - l.getAttribute('x1')) * t;
        pt.y = +l.getAttribute('y1') + (l.getAttribute('y2') - l.getAttribute('y1')) * t;
        const q = pt.matrixTransform(sv.getScreenCTM());
        return { x: q.x, y: q.y };
      });
      await page.mouse.click(at.x, at.y);
    }
    await wait(2300);
  }


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
    const chart = !!(await page.$('.quiz-table .isomer-chart'));
    const isD = await page.evaluate(() => /Checkpoint 4/.test(document.querySelector('.quiz-grid h3') ? document.querySelector('.quiz-grid h3').textContent : ''));
    expect(chart === isD, 'Klein\'s chart of isomers should sit beside checkpoint 4 only');
    expect(!!(await page.$('.quiz-table details[open] table')) === sideTable,
      'checkpoint ' + (sideTable ? 'has no' : 'should not have an') + ' atomic-number table beside it');
    for (;;) {
      const btn = await page.$('.quiz .choice');
      if (!btn) break;
      const id = await page.getAttribute('.quiz', 'data-qid');
      expect(!!id, 'a question on screen is not in the bank');
      const pick = WRONG.has(id) ? 1 : 0;
      await page.click(`.quiz .choice[data-choice="${pick}"]`);
      await page.click('.quiz .submit-answer:not([hidden])');
      expect(!(await page.isHidden('.q-why')), 'no explanation after answering ' + id);
      await page.click('.quiz .btnrow .primary');
    }
    await fb(/Checkpoint finished/, 'checkpoint did not finish');
  }

  /* ---- Part 1 */
  /* each mirror prediction shows the molecule's drawing beside the question */
  const predictFig = async (name) => {
    expect(await page.locator('.predict-fig svg.mol').count() === 1, 'mirror: no drawing beside the ' + name + ' prediction');
    expect((await page.textContent('.predict-fig figcaption')) === name, 'mirror: the prediction drawing is not ' + name);
  };
  await predictFig('Bromochlorofluoromethane');
  await predict(1);
  expect(await page.isDisabled('button:has-text("Slide them together")'), 'mirror: sliding allowed before trying');
  expect(await page.$$eval('canvas.c3d', (cs) => cs.every((c) => c.classList.contains('nodrag'))), 'mirror: a 3D model can still be dragged');
  await spear('v180', 'rod');
  await page.click('button:has-text("Slide them together")');
  await wait(1000);
  expect(/You predicted/.test(await page.textContent('.reveal')), 'mirror: reveal does not mention the wrong prediction');
  expect(/2 of 4/.test(await page.textContent('.meter-text')), 'mirror: CHBrClF should line up 2 of 4 atoms');
  await fb(/A carbon with four different groups makes a molecule chiral/, 'mirror step did not complete');
  expect(/four different groups/.test(await page.textContent('.reveal')), 'mirror: the reveal should point to four different groups');
  await next();

  /* drawmirror: Klein's three mirrors with amphetamine. Next to: first the
     rotated drawing (wrong), then the right one; behind: first the image a
     mirror next to it shows (wrong); beneath: right first time */
  async function mirrorBuild(flip, bond) {
    await page.click(`.choice-row button:has-text("${flip}")`);
    await page.click(`.choice-row button:has-text("${bond}")`);
    expect(await page.$('.mirror-build .glass-image'), 'drawmirror: the glass does not show the chosen drawing');
    await page.click('.mirror-build button:has-text("Check")');
  }
  expect((await page.$$('.mirror-build .pane-glass')).length === 1, 'drawmirror: no glass pane');
  await mirrorBuild('Left and right traded', 'Dash');
  await fb(/rotated 180° on the vertical spear/, 'drawmirror: the rotated drawing not explained');
  await mirrorBuild('Left and right traded', 'Wedge');
  await fb(/Correct! A mirror next to the molecule/, 'drawmirror: next to not accepted');
  await mirrorBuild('Left and right traded', 'Wedge');
  await fb(/the mirror next to the molecule shows it/, 'drawmirror: another mirror\'s image not explained');
  await mirrorBuild('As it is', 'Dash');
  await fb(/Correct! A mirror behind the molecule/, 'drawmirror: behind not accepted');
  await mirrorBuild('Top and bottom traded', 'Wedge');
  await fb(/All three mirrors show the same molecule/, 'drawmirror step did not complete');
  expect(/four different groups/.test((await page.$$eval('.reveal', (els) => els.map((e) => e.textContent))).join(' ')),
    'drawmirror: the end should point to four different groups');
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
  /* 3-chloropentane: two CH₂CH₃ groups; 3-bromohexane: CH₂CH₃ and CH₂CH₂CH₃ differ */
  await page.click('.cdrop[data-drop="3"]');
  await fb(/two CH₂CH₃ groups/, '3-chloropentane C3 not explained');
  await page.click('button:has-text("It has no chirality centres")');
  await wait(1200);
  await page.click('button:has-text("It has no chirality centres")');
  await fb(/Look again/, 'wrong "no chirality centres" accepted');
  await page.click('.cdrop[data-drop="3"]');
  await wait(1200);
  await page.click('button:has-text("It has no chirality centres")');
  await fb(/Look again/, 'wrong "no chirality centres" accepted');
  await page.click('.cdrop[data-drop="2"]');
  await fb(/two CH₃ groups/, '2,3-dimethylpentane C2 not explained');
  await page.click('.cdrop[data-drop="3"]');
  await wait(1200);
  await page.click('.cdrop[data-drop="2"]');
  await page.click('.cdrop[data-drop="3"]');
  await fb(/All done: a chirality centre is a carbon with four different groups/, 'centres step did not complete');
  await next();

  /* chiral: find the centre (or none), then chiral or achiral; one wrong verdict */
  {
    const ids = await page.evaluate(() => App.STEPS.find((x) => x.id === 'chiral').mols);
    let wrongDone = false;
    for (const id of ids) {
      const cs = await page.evaluate((x) => { const m = molecule(x); return CIP.centres(m).map((c) => m.atoms[c].num); }, id);
      if (cs.length) for (const n of cs) await page.click(`.cdrop[data-drop="${n}"]`);
      else await page.click('button:has-text("It has no chirality centres")');
      await wait(300);
      const right = cs.length ? 'Chiral' : 'Achiral', wrong = cs.length ? 'Achiral' : 'Chiral';
      if (!wrongDone) {
        await page.click(`.btnrow button:text-is("${wrong}")`);
        await fb(cs.length ? /one chirality centre makes a molecule chiral/ : /no chirality centre: the molecule is achiral/,
          'chiral: a wrong verdict not explained');
        wrongDone = true;
      }
      await page.click(`.btnrow button:text-is("${right}")`);
      await wait(1200);
    }
    await fb(/find a carbon with four different groups, and you know the molecule is chiral/, 'chiral step did not complete');
  }
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
  expect(/4 is not on the dash: it is on the wedge\. Rotate the molecule 180° on the vertical spear\./.test(await rule()), 'rotate: the rule is not shown');
  expect((await page.$$('.mol-wrap .spear[role="button"]')).length === 2, 'rotate: the spear should carry two turns, 180° and 90°');
  expect(await page.isDisabled('button:has-text("Clockwise: R")'), 'rotate: R/S open before 4 is on the dash');
  {
    const o = await ranks("molecule('alanine_w')");
    await page.dispatchEvent(`.gdrop[data-drop="${o[0]}"]`, 'click');
    await fb(/Spear the molecule and rotate it first/, 'reading before rotating not stopped');
    await spear('v180');
    expect(/4 is on the dash/.test(await rule()), 'rotate: the vertical spear did not put 4 on the dash');
    await read123(o);
    await page.click('button:has-text("Counterclockwise: S")');
    await page.click('button:has-text("Next molecule")');
    expect(/it is in the page\. Rotate the molecule 90° on the side spear\./.test(await rule()),
      'rotate: the sideways molecule should be speared from the side, 90°');
    await spear('s180', 'button');
    expect(/it is in the page/.test(await rule()), 'rotate: 180° should leave CH₃ in the page');
    await spear('s90', 'key');
    expect(/4 is on the dash/.test(await rule()), 'rotate: 90° on the side spear did not put CH₃ on the dash');
    const o2 = await ranks("molecule('bcfe_plane')");
    await read123(o2);
    await page.click('button:has-text("Clockwise: R")');
    await fb(/If 4 is not on the dash, rotate the molecule/, 'rotate step did not complete');
  }
  await next();

  /* hidden: predict, then a mirror-image redraw, then the right one, then read */
  await predict(0);
  await spear('v180');
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
  await spear('v180');
  {
    const o = await page.evaluate(() => { const m = STEREO.mirror(molecule('butanol_R'), 'behind'); return CIP.rank(m, m.centre).order; });
    await read123(o);
    await page.click('button:has-text("Counterclockwise: S")');
    await spear('v180');
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
    await spear('v180');
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
    await page.click('.rel-mirror >> nth=2');
    expect(await page.$('.mirror-check .pane-glass'), 'four: Mirror does not show the pair in a mirror');
    await page.click('.tray .tile[data-tile="enantiomers"]');
    for (const k of keys) if (rel[k] === 'enantiomers') await page.click(`.rel-slot[data-drop="${k}"]`);
    await page.click('button:has-text("Check")');
    await fb(/two pairs of enantiomers/, 'four step did not complete');
  }
  await next();

  /* rings: everything "chiral" first (wrong), then right */
  await predict(1);
  {
    const want = await page.evaluate(() => {
      const out = {};
      App.STEPS.find((s) => s.id === 'rings').mols.forEach((id) => { out[id] = App.ringAnswer(molecule(id)); });
      return out;
    });
    expect(!Object.values(want).includes('achiral'), 'rings: every ring should be chiral or have no chirality centres');
    await page.click('.tray .tile[data-tile="chiral"]');
    for (const id of Object.keys(want)) await page.click(`.drop-word[data-drop="${id}"]`);
    await page.click('button:has-text("Check")');
    await fb(/No chirality centres, and it is achiral/, 'wrong ring answer not explained');
    for (const w of ['chiral', 'no chirality centres']) {
      await page.click(`.tray .tile[data-tile="${w}"]`);
      for (const id of Object.keys(want)) if (want[id] === w) await page.click(`.drop-word[data-drop="${id}"]`);
    }
    await page.click('.card >> nth=0');
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
    await page.click('.quiz .submit-answer:not([hidden])');
    await page.click('.quiz .btnrow .primary');
  }
  const lms2 = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lms')));
  expect(+lms2['cmi.core.score.raw'] === expected, 'retry lowered the gradebook score to ' + lms2['cmi.core.score.raw']);
  expect(lms2['cmi.core.lesson_status'] === 'completed', 'retry changed the status to ' + lms2['cmi.core.lesson_status']);
  expect(/best \d+%/.test(await page.textContent('#score')), 'header does not show the best score');
  console.log('Retry: attempt 2 started clean; gradebook kept ' + lms2['cmi.core.score.raw'] + '%');

  console.log('Results screen: ' + big.trim());
  console.log('LMS: status=' + lms['cmi.core.lesson_status'] + ' score.raw=' + lms['cmi.core.score.raw'] +
              ' interactions=' + nInteractions + ' suspend_data=' + (lms['cmi.suspend_data'] || '').length + ' chars');
  console.log(problems.length ? 'PROBLEMS:\n  ' + problems.join('\n  ') : 'Walkthrough passed.');
  await browser.close();
  process.exit(problems.length ? 1 : 0);
})();

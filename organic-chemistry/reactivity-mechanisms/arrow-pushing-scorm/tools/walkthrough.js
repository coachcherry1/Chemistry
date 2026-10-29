/* tools/walkthrough.js: plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *   DARK=1 ...                           # the same in dark mode
 *
 * It makes every prediction, pulls the bond apart, plays every animation,
 * clicks every bond broken and formed, sorts every card (a wrong answer
 * first where it matters), finds every transition state, intermediate and
 * reactive centre, draws every mechanism's arrows (an arrow from an atom and
 * a wrong arrow first, then the right ones), fills every word sentence,
 * answers one core question per checkpoint wrongly on purpose and gets one
 * graded drawing wrong, reloads halfway, and finally checks what reached the
 * "LMS": the score, the completion status and the interaction records.
 * Before all that it checks that a save from another release, or one the
 * browser kept, is ignored; at the end it starts a second attempt and checks
 * the gradebook keeps the best.
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
const STORE = 'arrow-pushing-state';
const SHOTS = process.env.SHOTS;
/* answered wrongly on purpose: two core questions and one graded drawing */
const WRONG = new Set(['a-break', 'b-nuc']);
const WRONG_DRAW = 'D';

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
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(SHOTS, String(++shot).padStart(2, '0') + '-' + name + '.png'), fullPage: true });
  }
  let nexts = 0;
  async function next() {
    const id = await stepId();
    const ok = await page.waitForFunction(() => !document.getElementById('next').disabled, null, { timeout: 8000 }).then(() => true, () => false);
    if (!ok) {
      console.error('Stopped: Next is still disabled on ' + id + '. Feedback: ' + (await feedback()));
      if (problems.length) console.error(problems.join('\n'));
      await snap('stuck-' + id);
      await browser.close();
      process.exit(1);
    }
    await snap(id);
    await page.click(++nexts % 2 ? '#nextTop' : '#next');
    const [bottom, top] = [await page.isDisabled('#next'), await page.isDisabled('#nextTop')];
    expect(bottom === top, 'top and bottom Next disagree on ' + (await stepId()));
  }
  async function good(what) { const c = await fbClass(); expect(c.includes('good'), what + ': ' + (await feedback())); }
  async function bad(what) { const c = await fbClass(); expect(c.includes('bad'), what + ' was accepted: ' + (await feedback())); }
  const predict = (n) => page.click(`.predict .choice >> nth=${n || 0}`);
  const setRange = (sel, v) => page.$eval(sel, (el, x) => { el.value = x; el.dispatchEvent(new Event('input')); }, String(v));
  const saved = () => page.evaluate(() => JSON.parse(JSON.parse(sessionStorage.getItem('lms'))['cmi.suspend_data']));
  /* answer every card: the right choice index for each, from the page's own model */
  async function cards(sel, answers, wrongFirst) {
    for (let i = 0; i < answers.length; i++) {
      const card = page.locator(sel).nth(i);
      if (wrongFirst && i === 0) { await card.locator('.choice-row .ghostbtn').nth(answers[i] === 0 ? 1 : 0).click(); await bad('a wrong card answer'); }
      await page.locator(sel).nth(i).locator('.choice-row .ghostbtn').nth(answers[i]).click();
    }
  }

  /* draw the arrows of the tool on screen: optionally wrong ones first */
  async function arrows(wrongFirst, root) {
    root = root || '.arrow-tool';
    const want = await page.evaluate((s) => { const t = document.querySelector(s); return t && t.__scene ? t.__scene.arrows : null; }, root);
    expect(want, 'no arrow scene on ' + (await stepId()));
    if (!want) return;
    const click = (k) => page.click(`${root} [data-key="${k}"] >> nth=0`, { force: true });
    if (wrongFirst) {
      const atom = await page.$eval(`${root} .tgt.atom`, (n) => n.getAttribute('data-key'));
      await click(atom);
      await bad('an arrow from an atom');
      if (want.length > 1) {
        /* only the first of two arrows: a rule must catch it, or it is incomplete */
        await click(want[0].from); await click(want[0].to);
        await page.click(`${root} .arrow-tools .primary`);
        await bad('half the arrows');
        await page.click(`${root} button:text-is("Clear")`);
      }
    }
    for (const a of want) { await click(a.from); await click(a.to); }
    await page.click(`${root} .arrow-tools .primary`);
    await good('right arrows');
  }
  /* fill the word sentence on screen */
  async function sayIt() {
    for (let g = 0; g < 4; g++) {
      const left = await page.evaluate(() => {
        const box = document.querySelector('.say-it');
        if (!box) return null;
        const blanks = [...box.querySelectorAll('.say-blank')];
        const i = blanks.findIndex((b) => !b.classList.contains('filled'));
        if (i < 0) return null;
        return { i };
      });
      if (!left) return;
      const answer = await page.evaluate((i) => {
        const box = document.querySelector('.say-it');
        const line = box.querySelector('.say-line').textContent;
        for (const k of Object.keys(App.SAY)) {
          const sp = App.SAY[k];
          if (sp.slice(0, -1).every((x) => typeof x === 'number' || line.indexOf(x.trim()) >= 0)) {
            const nums = sp.slice(0, -1).filter((x) => typeof x === 'number');
            return sp[sp.length - 1][nums[i]];
          }
        }
        return null;
      }, left.i);
      expect(answer, 'say it: no sentence matched on ' + (await stepId()));
      if (!answer) return;
      await page.click(`.say-it .tile[data-tile="${answer}"]`);
      await page.click(`.say-it .say-blank[data-drop="${left.i}"]`);
    }
  }

  /* ---- fresh start */
  async function startsFresh(lmsVersion, browserVersion, what) {
    await page.evaluate((a) => {
      const draws = {};
      Object.keys(QUIZZES).forEach((k) => { draws[k] = QUIZZES[k].pool.slice(0, QUIZZES[k].draw).map((q) => q.id); });
      const old = (v) => JSON.stringify({ v: v, seed: 1, step: 7, max: 9, draws: draws, ans: { 'a-break': 1 }, pick: {}, pr: {}, done: { break: 1 }, fin: 0, best: 61, att: 1 });
      const lms = { 'cmi.core.score.raw': '61', 'cmi.core.lesson_status': 'incomplete' };
      if (a.lms != null) lms['cmi.suspend_data'] = old(a.lms);
      window.API.LMSSetValue = () => 'true';
      sessionStorage.setItem('lms', JSON.stringify(lms));
      localStorage.clear();
      if (a.browser != null) localStorage.setItem(a.key, old(a.browser));
    }, { lms: lmsVersion, browser: browserVersion, key: STORE });
    await page.reload();
    await page.click('.screen .primary');
    expect((await stepId()) === 'break', what + ' was resumed at ' + (await stepId()));
    const clean = await saved();
    expect(Object.keys(clean.ans).length === 0 && Object.keys(clean.done).length === 0, what + ': old answers carried over');
  }
  await startsFresh(99, null, 'a save from another release');
  await startsFresh(null, await page.evaluate(() => App.SCHEMA), 'a browser save inside the LMS');

  async function quiz() {
    const id = await stepId();
    for (let guard = 0; guard < 12; guard++) {
      const qid = await page.getAttribute('.quiz', 'data-qid');
      if (await page.$('.quiz .q-draw')) {
        if (id === 'quiz-' + WRONG_DRAW) {
          /* Check with nothing drawn is not an answer; then one wrong arrow is */
          await page.click('.quiz .arrow-tools .primary');
          await bad('a graded drawing with no arrows');
          expect(await page.evaluate((q) => App.U && !JSON.parse(JSON.parse(sessionStorage.getItem('lms'))['cmi.suspend_data']).ans.hasOwnProperty(q), qid), 'quiz: an empty drawing was graded');
          const w = await page.evaluate(() => document.querySelector('.quiz .arrow-tool').__scene.arrows[0]);
          const other = await page.$$eval('.quiz .arrow-tool .tgt.atom', (ns, to) => ns.map((n) => n.getAttribute('data-key')).find((k) => k !== to && k !== 'atom:' + to.split(':')[1]), w.to);
          await page.click(`.quiz .arrow-tool [data-key="${w.from}"] >> nth=0`, { force: true });
          await page.click(`.quiz .arrow-tool [data-key="${other}"] >> nth=0`, { force: true });
          await page.click('.quiz .arrow-tools .primary');
          await bad('a wrong graded drawing');
        } else await arrows(false, '.quiz .arrow-tool');
        await page.click('.quiz .btnrow .primary');
        continue;
      }
      const q = await page.$('.quiz .choice');
      if (!q) break;
      await page.click(`.quiz .choice[data-choice="${WRONG.has(qid) ? 1 : 0}"]`);
      await page.click('.quiz .btnrow .primary');
    }
    expect(/Checkpoint finished/.test(await feedback()), `${id}: checkpoint did not finish`);
  }

  /* =========================================================== Part 1 */
  /* break */
  expect(!(await page.$('.bond-pull')), 'break: the slider opens before the prediction');
  await predict(0);
  await setRange('.prog-range', 300);
  await page.click('button:has-text("Let them bond again")');
  await next();
  /* cleave */
  for (let q = 0; q < 3; q++) {
    if (q === 0) { await page.locator('.choice-row').nth(0).locator('.ghostbtn').nth(1).click(); await bad('cleave: ions for fish-hooks'); }
    await page.locator('.choice-row').nth(q).locator('.ghostbtn').nth(0).click();
  }
  await next();
  /* bonds broken and formed */
  for (let k = 0; k < 2; k++) {
    const L = await page.evaluate((k) => {
      const sc = SCENES.S[['bdeA', 'bdeB'][k]];
      const led = Chem.ledger(sc.before, sc.after);
      const keep = sc.before.bonds.filter((b) => !led.broken.some((x) => Chem.keys.pair(x.a, x.b) === Chem.keys.pair(b.a, b.b))).map((b) => Chem.keys.pair(b.a, b.b));
      return { br: led.broken.map((b) => Chem.keys.pair(b.a, b.b)), fo: led.formed.map((b) => Chem.keys.pair(b.a, b.b)), keep, exo: k === 0 ? 0 : 1 };
    }, k);
    if (k === 0) { await page.click(`.rxn .mol-wrap >> nth=0 >> .b-pick[data-drop="${L.keep[0]}"]`, { force: true }); await bad('bonds: a kept bond as broken'); }
    for (const x of L.br) await page.click(`.rxn .mol-wrap >> nth=0 >> .b-pick[data-drop="${x}"]`, { force: true });
    for (const x of L.fo) await page.click(`.rxn .mol-wrap >> nth=1 >> .b-pick[data-drop="${x}"]`, { force: true });
    await setRange('.bars + .range-row .prog-range, .panel:has(.bars) .prog-range', 100);
    if (k === 0) { await page.locator('.panel:has(.bars) .choice-row .ghostbtn').nth(1).click(); await bad('bonds: endothermic for an exothermic reaction'); }
    await page.locator('.panel:has(.bars) .choice-row .ghostbtn').nth(L.exo).click();
  }
  await next();
  /* entropy */
  await predict(0);
  await setRange('.prog-range', 100);
  const dS = await page.evaluate(() => [...document.querySelectorAll('.cards .card')].map((c) => {
    const t = c.querySelector('.muted').textContent;
    return /join|closes/.test(t) ? 1 : 0;
  }));
  await cards('.cards .card', dS, true);
  await next();
  /* favor */
  const W = await page.evaluate(() => App.SIGNS.map((s) => App.when(s[0], s[1])));
  for (let i = 0; i < W.length; i++) {
    if (i === 2) { await page.locator('.rel-table tr').nth(i + 1).locator('.ghostbtn').nth(3).click(); await bad('favor: high T for ΔH<0, ΔS<0'); }
    await page.locator('.rel-table tr').nth(i + 1).locator('.ghostbtn').nth(W[i]).click();
  }
  await next();
  /* diagram */
  await predict(0);
  const D = await page.evaluate(() => ['f623', 'f622'].map((k) => Object.keys(Energy.kinds(SCENES.PROFILES[k]))));
  for (let r = 0; r < 2; r++) {
    await setRange(`.panel >> nth=${r + 1} >> .prog-range`, 100);
    for (const i of D[r]) await page.click(`.panel >> nth=${r + 1} >> .en-pick[data-drop="${i}"]`, { force: true });
  }
  await next();
  await quiz();
  await page.reload();
  await page.click('.screen .primary');
  expect((await stepId()) === 'quiz-A', 'reload: resumed at ' + (await stepId()));
  await next();

  /* =========================================================== Part 2 */
  await predict(0);
  await next();
  const roles = await page.evaluate(() => [...document.querySelectorAll('.cards .card')].map((c) => {
    const t = c.querySelector('.muted').textContent;
    const id = App.SORT_IDS.find((x) => (SCENES.S[x].label || SCENES.S[x].title) === t);
    return App.roleOf(id) === 'nuc' ? 0 : 1;
  }));
  await cards('.cards .card', roles, true);
  await next();
  /* centres */
  for (let k = 0; k < 3; k++) {
    const C = await page.evaluate((k) => {
      const st = SCENES.S[['sb62', 'p69', 'bromobutene'][k]].before;
      const c = Chem.centres(st);
      return { nuc: c.nuc.concat(c.pi.map((p) => p[0])), elec: c.elec };
    }, k);
    if (k === 0) { await page.click('.m-pick[data-drop="O2"]', { force: true }); await bad('centres: the carbonyl O as nucleophilic'); }
    for (const id of C.nuc.concat(C.elec)) await page.click(`.m-pick[data-drop="${id}"]`, { force: true });
  }
  await next();
  await quiz();
  await next();

  /* =========================================================== Part 3 */
  /* read */
  await setRange('.prog-range', 100);
  const rules = await page.evaluate(() => SCENES.RULES.map((r) => (Chem.apply(SCENES.S[r.scene].before, r.arrows).err ? 1 : 0)));
  await cards('.cards .card', rules, true);
  await next();
  /* the three drawing steps */
  for (const n of [2, 2, 3]) {
    for (let k = 0; k < n; k++) {
      await arrows(k === 0);
      await page.waitForTimeout(60);
      await sayIt();
      const nx = await page.$('button:text-is("Next drawing →")');
      if (nx) await nx.click();
    }
    await next();
  }
  /* stable */
  await predict(0);
  const order = ['Methyl', 'Primary (1°)', 'Secondary (2°)', 'Tertiary (3°)'];
  const cardOrder = await page.evaluate(() => [...document.querySelectorAll('.card.rank')].map((c) => c.querySelector('svg').getAttribute('aria-label')));
  for (let i = 0; i < 4; i++) {
    const idx = cardOrder.findIndex((t) => t.indexOf(order[i]) === 0);
    if (i === 0) { await page.locator('.card.rank').nth(cardOrder.findIndex((t) => t.indexOf(order[3]) === 0)).click(); await bad('stable: 3° first'); }
    await page.locator('.card.rank').nth(idx).click();
  }
  await next();
  /* shifts */
  for (let k = 0; k < 2; k++) {
    await arrows(k === 0);
    await page.waitForTimeout(60);
    await sayIt();
    const nx = await page.$('button:text-is("Next drawing →")');
    if (nx) await nx.click();
  }
  await next();
  /* rearrange */
  const RA = await page.evaluate(() => App.STEPS.find((s) => s.id === 'rearrange').mols.map((id) => {
    const st = SCENES.S[id].before;
    const plus = st.atoms.find((a) => Chem.isCation(st, a.id)).id;
    return { nb: Chem.neighbours(st, plus).map((n) => n.id), ans: App.shiftAnswer(id) };
  }));
  for (let k = 0; k < RA.length; k++) {
    for (const id of RA[k].nb) await page.click(`.m-pick[data-drop="${id}"]`, { force: true });
    if (k === 0) { await page.locator('.choice-row .ghostbtn').nth(2).click(); await bad('rearrange: no shift for r1'); }
    await page.locator('.choice-row .ghostbtn').nth(RA[k].ans).click();
    if (k + 1 < RA.length) await page.click(`.chips .chip >> nth=${k + 1}`);
  }
  await next();
  /* name */
  const NM = await page.evaluate(() => [...document.querySelectorAll('.cards .card')].map((c) => {
    const t = c.querySelector('.muted').textContent;
    const id = App.STEPS.find((s) => s.id === 'name').scenes.find((x) => SCENES.S[x].title === t);
    return ['nuc', 'lg', 'pt', 'shift'].indexOf(SCENES.S[id].patterns[0]);
  }));
  await cards('.cards .card', NM, true);
  await next();
  await quiz();
  await next();

  /* =========================================================== Part 4 */
  /* sequence */
  const SQ = await page.evaluate(() => SCENES.S.f631.map((x) => ['nuc', 'lg', 'pt', 'shift'].indexOf(x.patterns[0])));
  for (let k = 0; k < 4; k++) {
    if (k === 0) { await page.locator('.choice-row .ghostbtn').nth(1).click(); await bad('sequence: loss of a leaving group first'); }
    await page.locator('.choice-row .ghostbtn').nth(SQ[k]).click();
    await arrows(k === 1);
    await page.waitForTimeout(60);
  }
  await setRange('.panel:has-text("The whole mechanism") .prog-range', 100);
  await next();
  /* concerted */
  await arrows(true);
  await page.waitForTimeout(60);
  await sayIt();
  const ES = await page.evaluate(() => SCENES.S.ester.map((x) => ['nuc', 'lg', 'pt', 'shift'].indexOf(x.patterns[0])));
  for (let i = 0; i < 3; i++) await page.locator('.seq-row').nth(i).locator('.ghostbtn').nth(ES[i]).click();
  await next();
  await quiz();
  await next();

  /* ---- results */
  expect((await stepId()) === 'results', 'did not reach results');
  const lms = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lms')));
  const graded = await page.evaluate(() => App.GRADED);
  const expected = Math.round(100 * (graded - WRONG.size - 1) / graded);
  expect(lms['cmi.core.lesson_status'] === 'completed', 'LMS status ' + lms['cmi.core.lesson_status']);
  expect(Math.round(+lms['cmi.core.score.raw']) === expected, `LMS score ${lms['cmi.core.score.raw']}, expected ${expected}`);
  const nInt = Object.keys(lms).filter((k) => /^cmi\.interactions\.\d+\.id$/.test(k)).length;
  expect(nInt === graded, `${nInt} interaction records, expected ${graded}`);
  console.log(`Results screen: ${(await page.textContent('.big-score')).trim()}`);
  console.log(`LMS: status=${lms['cmi.core.lesson_status']} score.raw=${lms['cmi.core.score.raw']} interactions=${nInt} suspend_data=${lms['cmi.suspend_data'].length} chars`);
  expect(lms['cmi.suspend_data'].length < 4000, 'suspend_data too long: ' + lms['cmi.suspend_data'].length);

  await page.click('button:has-text("Start a new attempt")');
  await page.click('button:has-text("Yes, start again")');
  expect((await stepId()) === 'break', 'retry: did not restart at step 1');
  const s2 = await saved();
  expect(Object.keys(s2.ans).length === 0 && s2.att === 2, 'retry: attempt not cleared');
  const lms2 = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lms')));
  expect(Math.round(+lms2['cmi.core.score.raw']) === expected, 'retry: gradebook score dropped to ' + lms2['cmi.core.score.raw']);
  console.log(`Retry: attempt ${s2.att} started clean; gradebook kept ${lms2['cmi.core.score.raw']}%`);

  await browser.close();
  if (problems.length) {
    console.error(problems.length + ' problem(s):\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  console.log('Walkthrough passed.');
})();

/* tools/walkthrough.js: plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *   DARK=1 ...                           # the same in dark mode
 *
 * It makes every prediction, clicks the α and β carbons (a wrong one first),
 * sorts every reagent (a wrong bin first), draws every mechanism's arrows (a
 * wrong arrow first, then the right ones), runs every animation, turns every
 * Newman projection until an H is anti-coplanar (checking Eliminate stays off
 * until then), flips every chair, fills Klein's table and predicts the
 * products of every problem, answers one core question per checkpoint
 * wrongly on purpose, reloads halfway, and finally checks what reached the
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
const STORE = 'substitution-elimination-state';
const SHOTS = process.env.SHOTS;
const WRONG = new Set(['a-nash', 'b-sn2-product', 'c-e2-major', 'd-locked', 'e-klein']);

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

  /* draw a mechanism's arrows: optionally one wrong arrow first */
  async function arrows(sel, wrongFirst) {
    const want = await page.evaluate((s) => {
      /* the arrows the scene on screen needs */
      const t = document.querySelector(s);
      return t && t.__scene ? t.__scene.arrows.map((a) => ({ from: a.from[0], to: a.to[0] })) : null;
    }, sel || '.arrow-tool');
    expect(want, 'no arrow scene on ' + (await stepId()));
    if (!want) return;
    const click = (k) => page.click(`.arrow-tool [data-key="${k}"] >> nth=0`, { force: true });
    if (wrongFirst) {
      /* an arrow starting on an atom */
      const atom = await page.$eval('.arrow-tool .tgt.atom', (n) => n.getAttribute('data-key'));
      await click(atom);
      await bad('an arrow from an atom');
      /* the right tail to the wrong head */
      await click(want[want.length - 1].from);
      const other = await page.evaluate((w) => {
        const keys = [...document.querySelectorAll('.arrow-tool .tgt.atom')].map((n) => n.getAttribute('data-key'));
        return keys.find((k) => !w.some((a) => a.to === k));
      }, want);
      await click(other);
      await page.click('.arrow-tool button:text-is("Check")');
      await bad('a wrong arrow');
      await page.click('.arrow-tool button:text-is("Clear")');
    }
    for (const a of want) { await click(a.from); await click(a.to); }
    await page.click('.arrow-tool button:text-is("Check")');
    await good('right arrows');
  }

  /* ---- fresh start */
  async function startsFresh(lmsVersion, browserVersion, what) {
    await page.evaluate((a) => {
      const draws = {};
      Object.keys(QUIZZES).forEach((k) => { draws[k] = QUIZZES[k].pool.slice(0, QUIZZES[k].draw).map((q) => q.id); });
      const old = (v) => JSON.stringify({ v: v, seed: 1, step: 7, max: 9, draws: draws, ans: { 'a-nash': 1 }, pick: {}, pr: {}, done: { players: 1 }, fin: 0, best: 61, att: 1 });
      const lms = { 'cmi.core.score.raw': '61', 'cmi.core.lesson_status': 'incomplete' };
      if (a.lms != null) lms['cmi.suspend_data'] = old(a.lms);
      window.API.LMSSetValue = () => 'true';
      sessionStorage.setItem('lms', JSON.stringify(lms));
      localStorage.clear();
      if (a.browser != null) localStorage.setItem(a.key, old(a.browser));
    }, { lms: lmsVersion, browser: browserVersion, key: STORE });
    await page.reload();
    await page.click('.screen .primary');
    expect((await stepId()) === 'players', what + ' was resumed at ' + (await stepId()));
    const clean = await saved();
    expect(Object.keys(clean.ans).length === 0 && Object.keys(clean.done).length === 0, what + ': old answers carried over');
  }
  await startsFresh(99, null, 'a save from another release');
  await startsFresh(null, await page.evaluate(() => App.SCHEMA), 'a browser save inside the LMS');

  /* =========================================================== Part 1 */
  expect(!(await page.$('.m-pick')), 'players: the carbons open before the prediction');
  await predict(0);
  const P1 = await page.evaluate(() => App.STEPS[0].mols.map((id) => {
    const m = mol(id), L = React.lg(m);
    return { a: L.a, b: React.betas(m, L.a).map((x) => x.b), d: Mol.degree(m, L.a), far: m.atoms.map((x, i) => i).filter((i) => m.atoms[i].el === 'C' && i !== L.a && !m.carbonsOn(L.a).some((y) => y.j === i)) };
  }));
  for (let k = 0; k < P1.length; k++) {
    const x = P1[k];
    if (k === 1) { await page.click(`.m-pick[data-drop="${x.b[0]}"]`); await bad('players: a β carbon clicked as α'); }
    await page.click(`.m-pick[data-drop="${x.a}"]`);
    await good('players: α carbon');
    if (x.far.length && k > 1) { await page.click(`.m-pick[data-drop="${x.far[x.far.length - 1]}"]`); await bad('players: a carbon two away accepted as β'); }
    for (const b of x.b) await page.click(`.m-pick[data-drop="${b}"]`);
    if (k === 2) { await page.click(`.choice-row .ghostbtn >> nth=${(x.d + 1) % 4}`); await bad('players: a wrong class'); }
    await page.click(`.choice-row .ghostbtn >> nth=${x.d}`);
    await good('players: class');
  }
  await next();

  /* function of the reagent */
  await predict(0);
  const FN = await page.evaluate(() => React.REAGENT_ORDER.map((k) => [k, React.REAGENTS[k].fn]));
  let first = true;
  for (const [k, fn] of FN) {
    if (first) {
      await page.click(`.tile[data-tile="${k}"]`);
      await page.click(`.bin[data-drop="${fn === 'weak' ? 'nuc' : 'weak'}"]`);
      await bad('sort: a wrong bin');
      first = false;
    }
    await page.click(`.tile[data-tile="${k}"]`);
    await page.click(`.bin[data-drop="${fn}"]`);
  }
  expect(/Every reagent sorted/.test(await feedback()), 'sort: did not finish');
  await next();

  async function quiz() {
    const id = await stepId();
    for (;;) {
      const q = await page.$('.quiz .choice');
      if (!q) break;
      const qid = await page.getAttribute('.quiz', 'data-qid');
      await page.click(`.quiz .choice[data-choice="${WRONG.has(qid) ? 1 : 0}"]`);
      await page.click('.quiz .btnrow .primary');
    }
    expect(/Checkpoint finished/.test(await feedback()), `${id}: checkpoint did not finish`);
  }
  await quiz();
  await page.reload();
  await page.click('.screen .primary');
  expect((await stepId()) === 'quiz-A', 'reload: resumed at ' + (await stepId()));
  await next();

  /* =========================================================== Part 2 */
  await arrows(null, true);
  await next();
  /* back-side attack */
  expect(!(await page.$('.prog-range')), 'backside: animation open before the prediction');
  await predict(0);
  await setRange('.prog-range', 100);
  await page.click('.panel:has-text("On a ring") .predict .choice >> nth=0');
  await next();
  /* sterics */
  await predict(0);
  for (let k = 0; k < 4; k++) {
    await page.click(`.chips .chip >> nth=${k}`);
    await page.click('button:text-is("Send in HS⁻")');
    await page.waitForTimeout(80);
  }
  expect(/methyl > 1° > 2°/.test(await page.textContent('#stage')), 'sterics: no ranking');
  await next();
  /* SN1 step by step */
  for (let k = 0; k < 3; k++) await arrows(null, k === 1);
  await next();
  /* either face */
  await predict(0);
  await setRange('.prog-range', 100);
  await page.click('button:has-text("Attack from the right")');
  await setRange('.prog-range', 100);
  expect(/racemic/.test(await page.textContent('#stage')), 'sn1stereo: no racemic reveal');
  await next();
  /* shifts */
  await predict(0);
  await arrows(null, true);
  await page.waitForTimeout(50);
  await arrows(null, false);
  await next();
  await quiz();
  await next();

  /* =========================================================== Part 3 */
  await arrows(null, true);
  await next();
  async function newman(times) {
    for (let n = 0; n < (times || 1); n++) {
      let guard = 0;
      while (await page.isDisabled('button:text-is("Eliminate")')) {
        await page.click('button:has-text("Turn the back carbon")');
        await page.waitForTimeout(40);
        if (++guard > 7) { problems.push((await stepId()) + ': never anti-coplanar'); return; }
      }
      await page.click('button:text-is("Eliminate")');
      await setRange('.prog-range', 100);
      await page.waitForTimeout(60);
      if (n + 1 < times) {
        await page.click('button:text-is("Back to the substrate")');
        /* turn on to the other H */
        await page.click('button:has-text("Turn the back carbon")');
        await page.click('button:has-text("Turn the back carbon")');
      }
    }
  }
  /* anti */
  await predict(0);
  expect(await page.isDisabled('button:text-is("Eliminate")'), 'anti: Eliminate on before an H is anti-coplanar');
  await newman(1);
  await next();
  /* regio */
  async function regio(k) {
    const R = await page.evaluate((k) => {
      const id = App.STEPS.find((s) => s.id === 'regio').mols[k];
      const m = mol(id), L = React.lg(m);
      return { betas: React.betas(m, L.a).filter((b) => b.h).map((b) => b.b) };
    }, k);
    if (k === 0) for (const b of R.betas) await page.click(`.m-pick[data-drop="${b}"]`);
    if (k === 0) {
      /* "Can form" for every real product, "Cannot" for the distractor */
      const cards = await page.$$eval('.substep.open .prod-card', (ns) => ns.map((n) => n.querySelector('.name').textContent));
      const real = await page.evaluate((k) => { const id = App.STEPS.find((s) => s.id === 'regio').mols[k]; return React.e2Products(mol(id), 'NaOEt').map((p) => Name.name(p.mol)); }, k);
      for (let i = 0; i < cards.length; i++) {
        await page.click(`.substep.open .prod-card >> nth=${i} >> button:text-is("${real.indexOf(cards[i]) >= 0 ? 'Can form' : 'Cannot'}")`);
      }
      await page.click('.substep.open button:text-is("Check")');
      await good('regio: possible products');
    }
    /* Zaitsev and Hofmann */
    const zh = await page.evaluate((k) => {
      const id = App.STEPS.find((s) => s.id === 'regio').mols[k];
      return React.e2Products(mol(id), 'NaOEt').map((p) => [Name.name(p.mol), p.regio]);
    }, k);
    const step3 = page.locator('.substep').nth(2);
    for (const [n, r] of zh) {
      await step3.locator(`.prod-card:has(.name:text-is("${n}")) button:text-is("${r}")`).click();
    }
    const majors = await page.evaluate((k) => {
      const id = App.STEPS.find((s) => s.id === 'regio').mols[k];
      return ['NaOEt', 'tBuOK'].map((key) => Name.name(React.e2Products(mol(id), key).find((p) => p.role === 'major').mol));
    }, k);
    const step4 = page.locator('.substep').nth(3);
    for (let q = 0; q < 2; q++) await step4.locator('.choice-row').nth(q).locator(`button:text-is("${majors[q]}")`).click();
  }
  await regio(0);
  await page.click('.chips .chip >> nth=1');
  await regio(1);
  expect(/Both substrates done/.test(await feedback()), 'regio: not finished');
  await next();
  /* stereoselective: both conformers, then which is major */
  await newman(2);
  await page.waitForTimeout(80);
  await page.click('.panel:has-text("Which is major?") .predict .choice >> nth=0');
  await next();
  /* stereospecific: the RR, then predict, then the RS */
  await newman(1);
  await page.click('.panel:has-text("The diastereomer") .predict .choice >> nth=0');
  await newman(1);
  await next();
  /* E1 */
  await predict(0);
  await arrows(null, false);
  await arrows(null, true);
  expect(/regioselective/.test(await page.textContent('#stage')), 'e1: no notes');
  await next();
  await quiz();
  await next();

  /* =========================================================== Part 4 */
  await predict(0);
  await page.click('.chdrop[data-drop="2t"]');
  await bad('ringanti: an equatorial H');
  await page.click('.chdrop[data-drop="2b"]');
  await page.click('.chdrop[data-drop="6b"]');
  await setRange('.prog-range', 100);
  await page.click('.choice-row button:text-is("Two")');
  await bad('ringanti: two H anti to an equatorial Cl');
  await page.click('.choice-row button:text-is("None")');
  await next();
  /* ring regio: cis then trans */
  async function ringregio(k) {
    const R = await page.evaluate((k) => {
      const id = App.STEPS.find((s) => s.id === 'ringregio').mols[k];
      const m = mol(id), spec = m.ringSpec;
      const anti = ['2b', '6b'].filter((p) => CHAIR.groupAt(spec, CHAIR.carbonOf(p), 'b') === 'H');
      const roles = {};
      React.predict(m, 'NaOEt').products.forEach((p) => { if (p.mech === 'E2') roles[p.name] = p.role; });
      return { anti, roles, gap: React.chairs(m).gap };
    }, k);
    if (R.gap > 0) await setRange('.prog-range', 0);
    for (const p of R.anti) await page.click(`.chdrop[data-drop="${p}"]`);
    for (const n of ['1-methylcyclohexene', '3-methylcyclohexene']) {
      const role = R.roles[n] || 'none';
      await page.click(`.prod-card:has(.name:text-is("${n}")) button:text-is("${{ major: 'Major', minor: 'Minor', none: 'Not formed' }[role]}")`);
    }
  }
  await ringregio(0);
  await page.click('.chips .chip >> nth=1');
  await ringregio(1);
  expect(/Regiospecific/.test(await page.textContent('#stage')), 'ringregio: no regiospecific note');
  await next();
  /* locked */
  await predict(0);
  await setRange('.prog-range', 100);
  await page.click('.chips .chip >> nth=1');
  await setRange('.prog-range', 0);
  await page.waitForTimeout(60);
  await page.click('.panel:has-text("Klein problem 7.18") .predict .choice >> nth=0');
  await next();
  /* sort */
  const cards = await page.evaluate(() => App.SEL_CARDS.map((c) => [c.id, c.bin]));
  await page.click(`.tile[data-tile="${cards[0][0]}"]`);
  await page.click(`.bin[data-drop="${cards[0][1] === 'regiosel' ? 'stereospec' : 'regiosel'}"]`);
  await bad('sortsel: a wrong bin');
  for (const [id, bin] of cards) { await page.click(`.tile[data-tile="${id}"]`); await page.click(`.bin[data-drop="${bin}"]`); }
  await next();
  await quiz();
  await next();

  /* =========================================================== Part 5 */
  const T = await page.evaluate(() => {
    const out = [];
    [1, 2, 3].forEach((d) => React.FN_ORDER.forEach((fn) => out.push([d + fn, App.RESULTS.indexOf(App.resultOf(React.TABLE[d][fn]))])));
    return out;
  });
  await page.click('.tile[data-tile="1"]');
  await page.click('.dtable td[data-drop="3both"]');
  await bad('table: SN2 at a 3° carbon');
  for (const [cell, r] of T) {
    await page.click(`.tile[data-tile="${r}"]`);
    if (!(await page.$(`.tile.selected[data-tile="${r}"]`))) await page.click(`.tile[data-tile="${r}"]`);
    await page.click(`.dtable td[data-drop="${cell}"]`);
  }
  expect(/table is complete/.test(await feedback()), 'table: not finished: ' + (await feedback()));
  await next();
  /* predict */
  const probs = await page.evaluate(() => {
    const s = App.STEPS.find((x) => x.id === 'predict');
    return s.problems.map(([id, key]) => {
      const r = React.predict(mol(id), key);
      return { fn: React.FN_ORDER.indexOf(React.REAGENTS[key].fn), mech: App.RESULTS.indexOf(App.resultOf(r.mechs)),
               roles: App.cardsFor(id, key).map((c) => ['major', 'minor', 'none'].indexOf(c.role)) };
    });
  });
  for (let k = 0; k < probs.length; k++) {
    const x = probs[k];
    if (k) await page.click(`.chips .chip >> nth=${k}`);
    await page.locator('.substep').nth(0).locator('.ghostbtn').nth(x.fn).click();
    if (k === 0) { await page.locator('.substep').nth(1).locator('.ghostbtn').nth((x.mech + 1) % 7).click(); await bad('predict: wrong mechanism'); }
    await page.locator('.substep').nth(1).locator('.ghostbtn').nth(x.mech).click();
    for (let i = 0; i < x.roles.length; i++) {
      const r = k === 0 && i === 0 ? (x.roles[i] + 1) % 3 : x.roles[i];
      await page.locator('.substep').nth(2).locator('.prod-card').nth(i).locator('.mini').nth(r).click();
    }
    await page.click('button:text-is("Check the products")');
    if (k === 0) {
      await bad('predict: a wrong role');
      await page.locator('.substep').nth(2).locator('.prod-card').nth(0).locator('.mini').nth(x.roles[0]).click();
      await page.click('button:text-is("Check the products")');
      await good('predict: products');
      await arrows(null, false);
    }
  }
  expect(/All five problems done/.test(await feedback()), 'predict: not finished: ' + (await feedback()));
  await next();
  await quiz();
  await next();

  /* ---- results */
  expect((await stepId()) === 'results', 'did not reach results');
  const lms = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lms')));
  const graded = await page.evaluate(() => App.GRADED);
  const expected = Math.round(100 * (graded - WRONG.size) / graded);
  expect(lms['cmi.core.lesson_status'] === 'completed', 'LMS status ' + lms['cmi.core.lesson_status']);
  expect(+lms['cmi.core.score.raw'] === expected, `LMS score ${lms['cmi.core.score.raw']}, expected ${expected}`);
  const nInt = Object.keys(lms).filter((k) => /^cmi\.interactions\.\d+\.id$/.test(k)).length;
  expect(nInt === graded, `${nInt} interaction records, expected ${graded}`);
  console.log(`Results screen: ${(await page.textContent('.big-score')).trim()}`);
  console.log(`LMS: status=${lms['cmi.core.lesson_status']} score.raw=${lms['cmi.core.score.raw']} interactions=${nInt} suspend_data=${lms['cmi.suspend_data'].length} chars`);
  expect(lms['cmi.suspend_data'].length < 4000, 'suspend_data too long: ' + lms['cmi.suspend_data'].length);

  await page.click('button:has-text("Start a new attempt")');
  await page.click('button:has-text("Yes, start again")');
  expect((await stepId()) === 'players', 'retry: did not restart at step 1');
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

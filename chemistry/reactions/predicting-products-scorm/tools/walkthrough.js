/* tools/walkthrough.js: plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *   DARK=1 ...                           # the same in dark mode
 *
 * It checks that a save from another release, or one the browser kept, is
 * ignored inside the LMS; answers the two drills (one wrong first); makes
 * both predictions and plays all four animations; works the four lesson
 * problems on the ladder with the usual mistakes (subscripts copied from
 * the reactant, a formula not in lowest terms, the reactants built again, H
 * instead of H2, a wrong state in a double replacement) and reads the
 * feedback each gets; checks that a single replacement has no states step. In the
 * graded part it checks that a choice is only selected until Submit answer,
 * misses one question and several steps on purpose, checks that an
 * unfinished step is not counted, reloads in the middle, and then checks
 * what reached the "LMS": the score, the completion status and one
 * interaction per graded item. Finally it starts a second attempt and opens
 * the page with no LMS at all.
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

/* The fake LMS keeps its data in sessionStorage and reads and writes it on every call. */
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
  const fb = (sel) => page.evaluate((s) => { const all = document.querySelectorAll((s || '') + ' .fb.show'); return all.length ? all[all.length - 1].textContent : ''; }, sel);
  async function next() {
    const id = await stepId();
    const ok = await page.waitForFunction(() => !document.getElementById('next').disabled, null, { timeout: 4000 }).then(() => true, () => false);
    expect(ok, 'Next stays disabled on ' + id);
    await page.click('#next');
    await page.waitForTimeout(30);
  }
  /* the problem on the ladder, with what a builder needs */
  const prob = () => page.evaluate(() => {
    const p = App.ctl().problem;
    const parts = {};
    p.l.concat(p.products).forEach((f) => { const pr = Ions.parts(f); if (pr) parts[f] = { cat: pr.cat, an: pr.an, r: Ions.ratio(pr.cat, pr.an) }; });
    return { id: p.id, kind: p.kind, sub: p.sub, l: p.l, reacts: p.reacts, products: p.products, states: p.states, rungs: p.rungs, coefs: p.coefs, parts };
  });
  const rung = () => page.evaluate(() => { const c = App.ctl(); return c.work.r ? 'done' : c.problem.rungs[c.work.i]; });
  async function build(id, cat, an, x, y) {
    const b = page.locator('.builder[data-id="' + id + '"]');
    await b.locator('.ion-btn[data-ion="' + cat + '"]').click();
    await b.locator('.ion-btn[data-ion="' + an + '"]').click();
    for (const [k, n] of [[0, x], [1, y]]) {
      const st = b.locator('.stepper.sub').nth(k);
      let cur = +(await st.locator('.sub-n').textContent());
      for (; cur < n; cur++) await st.locator('.inc').click();
      for (; cur > n; cur--) await st.locator('.dec').click();
    }
  }
  const check = () => page.click('.rung-check');
  /* do one rung; miss: answer it wrongly first where that is possible. Returns true if the first answer was right. */
  async function doRung(p, miss) {
    const r = await rung();
    if (r === 'react') {
      const right = p.reacts ? 0 : 1;
      expect(await page.isDisabled('.ladder .submit-answer'), p.id + ': Submit answer should wait for a choice');
      await page.locator('.ladder .choice').nth(1 - right).click();
      expect((await page.evaluate(() => App.ctl().work.n.react || 0)) === 0, p.id + ': a click must only select');
      if (!miss) await page.locator('.ladder .choice').nth(right).click();
      await page.click('.ladder .submit-answer');
      expect(new RegExp(miss ? 'Not this time' : 'Right').test(await fb('.ladder')), p.id + ' react: feedback ' + await fb('.ladder'));
      await page.click('.rung-next');
      return !miss;
    }
    if (r === 'products') {
      const comps = p.kind === 'sr' ? [p.products[0]] : p.products;
      if (miss) {
        await check();
        expect(/not counted/.test(await fb('.ladder')), p.id + ' products: an unfinished answer should not count');
        /* the reactant built again (double), or the lone element left as the element (single) */
        if (p.kind === 'dr') {
          for (let k = 0; k < 2; k++) { const q = p.parts[p.l[k]]; await build('c' + k, q.cat, q.an, q.r[0], q.r[1]); }
          await check();
          expect(/reactants|trade partners/.test(await fb('.ladder')), p.id + ': building the reactants again: ' + await fb('.ladder'));
        } else {
          const q = p.parts[comps[0]];
          await build('c0', q.cat, q.an, q.r[0] * 2, q.r[1] * 2);
          await page.click('.ion-btn[data-el="' + p.products[1] + '"]');
          await check();
          expect(/lowest whole-number ratio/.test(await fb('.ladder')), p.id + ': a doubled formula: ' + await fb('.ladder'));
        }
      }
      for (let k = 0; k < comps.length; k++) { const q = p.parts[comps[k]]; await build('c' + k, q.cat, q.an, q.r[0], q.r[1]); }
      if (p.kind === 'sr') await page.click('.ion-btn[data-el="' + p.products[1] + '"]');
      await check();
      return !miss;
    }
    if (r === 'states') {
      for (const f of p.products) {
        const s = miss && f === p.products[0] ? (p.states[f] === 'aq' ? 's' : 'aq') : p.states[f];
        await page.locator('.state-row[data-f="' + f + '"] .state-btn[data-state="' + s + '"]').click();
      }
      await check();
      if (miss) {
        expect(/solubility rules/.test(await fb('.ladder')), p.id + ' states: feedback ' + await fb('.ladder'));
        await page.locator('.state-row[data-f="' + p.products[0] + '"] .state-btn[data-state="' + p.states[p.products[0]] + '"]').click();
        await check();
      }
      return !miss;
    }
    /* balance */
    const inputs = page.locator('.bench input.coef');
    const allOnes = p.coefs.every((c) => c === 1);
    if (miss && !allOnes) await page.click('.bench .bench-check');
    for (let j = 0; j < p.coefs.length; j++) await inputs.nth(j).fill(String(p.coefs[j]));
    await page.click('.bench .bench-check');
    return !(miss && !allOnes);
  }
  /* work a whole problem; misses: the rungs to get wrong first. Returns the number right the first time. */
  async function solve(misses) {
    const p = await prob();
    let right = 0;
    for (const r of p.rungs) {
      expect((await rung()) === r, p.id + ': expected rung ' + r + ', on ' + await rung());
      if (await doRung(p, (misses || []).indexOf(r) >= 0)) right++;
    }
    expect((await rung()) === 'done', p.id + ': not finished');
    const want = await page.evaluate(() => Gen.equation(App.ctl().problem, true));
    expect((await page.textContent('.final-eq')) === want, p.id + ': the final equation');
    return { p, right };
  }

  /* ---- a save from another release, and one the browser kept, are ignored inside the LMS */
  await page.goto(URL);
  await page.evaluate(([store]) => {
    sessionStorage.setItem('lms', JSON.stringify({ 'cmi.suspend_data': JSON.stringify({ v: 999, seed: 5, step: 7, max: 9, p: [], q: { a: [] } }) }));
    localStorage.setItem(store, JSON.stringify({ v: App.SCHEMA, seed: 5, step: 6, max: 9, done: {}, d: {}, q: { a: [] }, p: [] }));
  }, [STORE]);
  await page.reload();
  let st = await page.evaluate(() => App.state());
  expect(st.step === 0 && st.max === 0, 'a save from another release or from the browser was resumed inside the LMS');
  expect((await lms())['cmi.core.lesson_status'] === 'incomplete', 'status should start as incomplete');
  await snap('intro');
  await page.click('.screen-box .primary');

  /* ---- drills: answered on the click, one wrong first */
  async function drill(list, name) {
    for (let i = 0; i < list.length; i++) {
      const wrongFirst = i === 0;
      await page.locator('.tiles .tile').nth(list[i] !== wrongFirst ? 0 : 1).click();
      expect(new RegExp(wrongFirst ? 'Not this time' : 'Right').test(await fb()), name + ' ' + i + ': ' + await fb());
      if (i === 1) await snap(name);
      if (i < list.length - 1) await page.click('.panel .btnrow .primary');
    }
    await next();
  }
  async function watch(name, rightText) {
    expect(await page.locator('.scene-svg').count() === 0, name + ': the animations should wait for the prediction');
    await page.click('.tiles .tile:has-text("' + rightText + '")');
    expect(await page.locator('.scene-svg').count() === 2, name + ': two animations');
    for (let k = 0; k < 2; k++) {
      await page.locator('.scene-play').nth(k).click();
      await page.waitForFunction((n) => document.querySelectorAll('.scene-play')[n].textContent === 'Play again', k);
    }
    const caps = await page.locator('.scene-cap').allTextContents();
    expect(/atoms on the strip|settled as a solid/.test(caps[0]) && /Nothing happens|No pair is insoluble/.test(caps[1]), name + ': captions ' + caps.join(' | '));
    await snap(name);
    await next();
  }

  expect(await stepId() === 'willit', 'first step');
  expect(await page.locator('.ref .series li').count() === 25 && await page.locator('.ref .series li.tier-water').count() === 8 && /cold water/.test(await page.textContent('.ref .tier-key')), 'the activity series, with what reacts with water, should be beside the drill');
  await drill(await page.evaluate(() => Steps.WILLIT.map((w) => Gen.make(w[0], w[1]).reacts)), 'willit');
  await watch('plate', 'Copper ions become copper atoms');
  /* Al + CuCl2: subscripts copied from the reactant, then right */
  let p = await prob();
  expect(p.id === 'Al+CuCl2', 'sr1 should be Al + CuCl2');
  await doRung(p, false);
  await build('c0', 'Al', 'Cl', 1, 2);
  await page.click('.ion-btn[data-el="Cu2"]');
  await check();
  expect(/charges must cancel/.test(await fb('.ladder')), 'sr1: AlCl2 should be told the charges do not cancel: ' + await fb('.ladder'));
  await build('c0', 'Al', 'Cl', 1, 3);
  await check();
  expect(/single atoms/.test(await fb('.ladder')), 'sr1: Cu2 should be corrected: ' + await fb('.ladder'));
  await page.click('.ion-btn[data-el="Cu"]');
  await check();
  expect((await rung()) === 'balance' && !/\((s|aq)\)/.test(await page.textContent('.ladder .given')), 'sr1: a single replacement has no states step and no state symbols');
  expect(await page.locator('.ladder.wide').count() === 1 && await page.locator('.bench .inv-row').count() > 0, 'sr1: the balancing bench with its inventory');
  await doRung(p, true);
  await snap('sr1-done');
  await next();
  /* Mg + HCl: H instead of H2 */
  p = await prob();
  await doRung(p, false);
  await build('c0', 'Mg', 'Cl', 1, 2);
  await page.click('.ion-btn[data-el="H"]');
  await check();
  expect(/diatomic/.test(await fb('.ladder')), 'sr2: H should be corrected to H2: ' + await fb('.ladder'));
  await page.click('.ion-btn[data-el="H2"]');
  await check();
  await doRung(p, false);
  expect(/Mg \+ 2 HCl → MgCl₂ \+ H₂/.test(await page.textContent('.final-eq')), 'sr2: the final equation, without states');
  await next();

  expect(await page.locator('.ref .sol-table').count() === 2 && /slightly/.test(await page.textContent('.ref')), 'the solubility rules should be beside the drill');
  await drill(await page.evaluate(() => Steps.SOL.map((f) => Ions.state(f) === 'aq')), 'sol');
  await watch('mix', 'Ag⁺ and Cl⁻');
  await solve(['products', 'states']);
  await snap('dr1-done');
  await next();
  const nr = await solve([]);
  expect(!nr.p.reacts && /no reaction/.test(await page.textContent('.final-eq')), 'dr2 should end with no reaction');
  await next();

  /* ---- graded questions */
  expect(await stepId() === 'quiz', 'the questions should follow the lesson');
  const qs = await page.evaluate(() => App.questions().map((q) => ({ right: q.right, n: q.choices.length })));
  let wantRight = 0, items = 0;
  const TOTAL = 34;
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i], wrong = (q.right + 1) % q.n, miss = i === 1;
    expect(await page.isDisabled('.quiz .submit-answer'), 'q' + i + ': Submit answer should wait for a choice');
    await page.locator('.quiz .choice').nth(wrong).click();
    expect((await page.evaluate(() => App.state().q.a.length)) === i, 'q' + i + ': a click must only select');
    if (!miss) await page.locator('.quiz .choice').nth(q.right).click();
    await page.click('.quiz .submit-answer');
    expect(await page.locator('.quiz .submit-answer').count() === 0, 'q' + i + ': Submit answer should go away once used');
    if (!miss) wantRight++;
    items++;
    if (i === 2) await snap('question');
    await page.click('.quiz .quiz-next');
  }

  /* ---- graded problems */
  expect(await stepId() === 'set', 'the problems should follow the questions');
  const total = await page.evaluate(() => App.totalItems());
  expect(total === TOTAL, 'the graded items: ' + total);
  for (let i = 0; i < 10; i++) {
    const before = await prob();
    const misses = i === 0 ? ['products', 'balance'] : i === 1 ? before.rungs.slice(0, 1) : i === 2 ? ['states'] : [];
    if (before.kind === 'sr') expect(before.rungs.indexOf('states') < 0 && !/\((s|aq)\)/.test(await page.textContent('.ladder .given')), before.id + ': no states in a single replacement');
    const res = await solve(misses);
    wantRight += res.right; items += res.p.rungs.length;
    if (i === 0) await snap('problem-1');
    if (i === 4) {
      await page.reload();
      await page.click('.screen-box .primary');
      expect(await stepId() === 'set' && (await page.evaluate(() => App.state().p.filter((w) => w && w.r).length)) === 5, 'reload in the problems: the work did not come back');
      continue;
    }
    if (i === 6) {
      /* reload in the middle of a problem: it should open at the same rung */
      await page.click('.ladder-next');
      const mid = await prob();
      let r2 = (await doRung(mid, false)) ? 1 : 0;
      /* (a problem with a single step is finished by now: nothing to reload into) */
      if (mid.rungs.length > 1) {
        const at = await rung();
        await page.reload();
        await page.click('.screen-box .primary');
        expect((await rung()) === at, 'reload inside a problem: opened at ' + (await rung()) + ', was at ' + at);
        for (const r of mid.rungs.slice(1)) { if (await doRung(mid, false)) r2++; }
      }
      wantRight += r2; items += mid.rungs.length;
      i++;
    }
    await page.click('.ladder-next');
  }
  expect(items === TOTAL, 'the walkthrough answered ' + items + ' items');

  /* ---- results and what reached the LMS */
  expect(await stepId() === 'results', 'results should follow the problems');
  await snap('results');
  const data = await lms();
  const pct = String(Math.round(100 * wantRight / TOTAL));
  expect(data['cmi.core.score.raw'] === pct, 'score ' + data['cmi.core.score.raw'] + ', wanted ' + pct + ' (' + wantRight + ' of ' + TOTAL + ')');
  expect(data['cmi.core.lesson_status'] === 'completed', 'status ' + data['cmi.core.lesson_status']);
  const inter = Object.keys(data).filter((k) => /^cmi\.interactions\.\d+\.id$/.test(k));
  expect(inter.length === TOTAL, inter.length + ' interactions, wanted ' + TOTAL);
  expect(Object.keys(data).filter((k) => /\.result$/.test(k) && data[k] === 'correct').length === wantRight, 'interactions marked correct');
  expect((data['cmi.suspend_data'] || '').length < 4000, 'suspend_data too long: ' + (data['cmi.suspend_data'] || '').length);
  expect((await page.textContent('.big-score')).indexOf(wantRight + ' / ' + TOTAL) >= 0, 'the results screen score');

  /* ---- a second attempt keeps the best score */
  const firstSet = await page.evaluate(() => App.problems().map((q) => q.id).join());
  await page.click('.panel .btnrow .primary:has-text("Start a new attempt")');
  await page.click('.confirm .primary');
  st = await page.evaluate(() => App.state());
  expect(st.att === 2 && st.step === 0 && st.q.a.length === 0 && Math.round(st.best) === +pct, 'the new attempt');
  expect((await lms())['cmi.core.score.raw'] === pct, 'the best score should stay in the gradebook');
  expect(firstSet !== (await page.evaluate(() => App.problems().map((q) => q.id).join())), 'a new attempt should bring new problems');

  /* ---- no LMS at all */
  const page2 = await browser.newPage({ viewport: { width: 1366, height: 650 } });
  page2.on('pageerror', (e) => problems.push('standalone page error: ' + e.message));
  await page2.goto(URL);
  expect((await page2.textContent('#lms')).indexOf('Standalone') >= 0, 'standalone badge');
  await page2.click('.screen-box .primary');
  expect(!!(await page2.evaluate((s) => localStorage.getItem(s), STORE)), 'standalone: no save in localStorage');
  await page2.close();

  await browser.close();
  if (problems.length) { console.error(problems.join('\n')); console.error(problems.length + ' problem(s)'); process.exit(1); }
  console.log('Walkthrough passed: lesson, 4 questions, 10 problems, score ' + pct + '% (' + wantRight + ' of ' + TOTAL + ') and completion reached the LMS, best score kept.');
})();

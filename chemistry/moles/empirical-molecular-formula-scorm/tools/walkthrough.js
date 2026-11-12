/* tools/walkthrough.js: plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *   DARK=1 ...                           # the same in dark mode
 *   SEED=2 ...                           # one student's problems (otherwise random)
 *
 * It checks that a save from another release, or one the browser kept, is
 * ignored inside the LMS. It plays the opening scene (heating a hydrate or
 * burning propane), the worked example (Show step to the end), every drill
 * with a mistake first, and the molecular formula step. In the first
 * warm-up it makes the usual mistakes and reads the feedback each gets
 * (grams for percents, a percent as a decimal, moles to 2 significant
 * figures, the mole ratio left out of the setup, the wrong smallest, x 1
 * when not whole), checks Step 2 is a dimensional analysis setup (the molar
 * mass box in the bottom of a fraction, the ratio box on top, the cancelling
 * units struck through), and it reloads in the
 * middle of a warm-up and of the graded set to check the work comes back.
 * In the graded set it misses Step 1 of problem 1 (counted), types moles to
 * 2 significant figures in problem 2 (not counted), checks with Enter,
 * misses a step twice to get Show me, and solves the rest; then it checks
 * what reached the "LMS": the score (steps right on the first check), the
 * completion status and one interaction per step. Finally it starts a
 * second attempt and checks the gradebook keeps the best score.
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
   every call, never from a copy in the page. To give the next load different
   LMS data, a test first switches off the current page's writes, then writes. */
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
  async function setLMS(data) {
    await page.evaluate((d) => { window.API.LMSSetValue = () => 'true'; sessionStorage.setItem('lms', JSON.stringify(d)); }, data);
    await page.reload();
  }
  let shot = 0;
  async function snap(name) {
    if (!SHOTS) return;
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.waitForTimeout(80);
    await page.screenshot({ path: path.join(SHOTS, String(++shot).padStart(2, '0') + '-' + name + '.png') });
  }
  const stepId = () => page.evaluate(() => App.STEPS[App.state().step].id);
  const fb = () => page.evaluate(() => { const f = document.querySelector('.work .fb.show'); return f ? f.textContent : ''; });
  const say = () => page.textContent('#feedback');
  async function next() {
    const id = await stepId();
    const ok = await page.waitForFunction(() => !document.getElementById('next').disabled, null, { timeout: 5000 }).then(() => true, () => false);
    expect(ok, 'Next stays disabled on ' + id);
    await page.click('#next');
    await page.waitForTimeout(30);
  }
  const ctl = (fn, arg) => page.evaluate(([f, a]) => { const c = App.ctl(); return c[f](a); }, [fn, arg]);
  const work = () => page.evaluate(() => JSON.parse(JSON.stringify(App.ctl().work)));
  const prob = (seed, kind, id) => page.evaluate(([s, k, i]) => {
    const p = k === 'warm' ? Gen.warm(s, i) : Gen.set(s)[i];
    return JSON.parse(JSON.stringify({ rows: p.rows, choice: p.choice, mult: p.mult, mol: p.mol, mode: p.mode, steps: p.steps, kind: p.kind }));
  }, [seed, kind, id]);
  async function typeInto(key, value) {
    await page.fill('input[data-key="' + key + '"]', String(value));
  }

  /* ---- a stale save from another release, and one the browser kept, are ignored */
  await page.goto(URL);
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ v: 1, seed: 5, step: 6, max: 6, p: [], w: {}, d: {}, done: {} })), STORE);
  await setLMS({ 'cmi.suspend_data': JSON.stringify({ v: 999, seed: 7, step: 5, max: 5, p: [] }) });
  let st = await page.evaluate(() => App.state());
  expect(st.step === 0 && st.max === 0, 'a stale save was resumed (step ' + st.step + ')');
  await setLMS({});
  st = await page.evaluate(() => App.state());
  expect(st.step === 0 && st.seed !== 5, 'the browser’s save was used inside the LMS');
  /* SEED=n replays one student's problems (a fresh start picks them at random) */
  if (process.env.SEED) await page.evaluate((n) => { App.state().seed = n; }, Number(process.env.SEED));
  const seed = await page.evaluate(() => App.state().seed);
  process.on('exit', (code) => { if (code) console.error('(seed ' + seed + ': replay with SEED=' + seed + ')'); });
  const MODE = await page.evaluate(() => CONFIG.mode);
  await snap('intro');
  await page.click('.screen-box .primary');

  /* ---- the steps before the graded set */
  let guard = 0;
  let warmCount = 0;
  while ((await stepId()) !== 'set' && guard++ < 30) {
    const id = await stepId();
    const kind = await page.evaluate(() => App.STEPS[App.state().step].kind);
    await snap(id);
    if (kind === 'heat') {
      await page.click('.tile:has-text("go up")');
      expect(/mass goes down/.test(await say()), 'heat: a wrong prediction gets no explanation');
      await page.click('button:has-text("Heat")');
      await page.waitForSelector('.tile:has-text("copper(II) sulfate")');
      await page.click('.tile:has-text("copper(II) sulfate")');
      expect(/stays in the crucible/.test(await say()), 'heat: "copper(II) sulfate left" is not answered');
      await page.click('.tile:has-text("water")');
      await page.click('button:has-text("Heat again")');
      await page.waitForTimeout(50);
    } else if (kind === 'burn') {
      await page.click('button:has-text("Burn it")');
      await page.waitForSelector('.scene-step input.blank');
      await page.fill('.scene-step input.blank', '6');
      await page.click('.scene-step .drill-q .primary');
      expect(/Count the black C atoms/.test(await say()), 'burn: a wrong CO2 count is not answered');
      await page.fill('.scene-step input.blank', '3');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(30);
      await page.fill('.scene-step input.blank', '8');
      await page.keyboard.press('Enter');
      expect(/2 of the white H/.test(await say()), 'burn: 8 H2O is not answered');
      await page.fill('.scene-step input.blank', '4');
      await page.keyboard.press('Enter');
    } else if (kind === 'example') {
      let n = 0;
      while (await page.$('.step-panel .primary') && n++ < 8) { await page.click('.step-panel .primary'); await page.waitForTimeout(20); }
      expect(await page.evaluate(() => App.ctl().work.r === 1), 'the worked example does not reach the end');
    } else if (kind === 'dfrac') {
      const cards = await page.evaluate((s) => Gen.fracCards(s), seed);
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        if (i === 0) {
          const wrong = c.uni === '½' ? '⅓' : '½';
          await page.click('.drill .tiles >> nth=0 >> .tile:text-is("' + wrong + '")');
          await page.click('.drill .tiles >> nth=1 >> .tile:text-is("× ' + c.den + '")');
          await page.fill('.drill input.blank', String(c.whole));
          await page.click('.drill .primary:has-text("Check")');
          expect(/Not that one/.test(await say()), 'name the fraction: a wrong fraction is not answered');
        }
        await page.click('.drill .tiles >> nth=0 >> .tile:text-is("' + c.uni + '")');
        await page.click('.drill .tiles >> nth=1 >> .tile:text-is("× ' + c.den + '")');
        await page.fill('.drill input.blank', String(c.whole));
        await page.click('.drill .primary:has-text("Check")');
      }
    } else if (kind === 'dwhole') {
      const cards = await page.evaluate((s) => Gen.wholeCards(s), seed);
      for (let i = 0; i < cards.length; i++) {
        const pickRight = i > 0;
        const want = cards[i].round ? 'Round it' : 'Multiply';
        const other = cards[i].round ? 'Multiply' : 'Round it';
        await page.click('.wcard >> nth=' + i + ' >> .tile:has-text("' + (pickRight ? want : other) + '")');
      }
      await page.click('.drill .primary:has-text("Check")');
      expect(/within 0\.1|more than 0\.1/.test(await say()), 'whole or not: a wrong card is not answered');
      const want0 = cards[0].round ? 'Round it' : 'Multiply';
      await page.click('.wcard >> nth=0 >> .tile:has-text("' + want0 + '")');
      await page.click('.drill .primary:has-text("Check")');
    } else if (kind === 'dall') {
      const list = await page.evaluate((s) => Gen.allRatios(s), seed);
      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        if (i === 0) {
          await page.fill('.drill input[aria-label="multiply every row by"]', '1');
          await page.click('.drill .primary:has-text("Check")');
          expect(/not within 0\.1/.test(await say()), 'multiply them all: x 1 is not answered');
        }
        await page.fill('.drill input[aria-label="multiply every row by"]', String(r.mult));
        await page.click('.drill .primary:has-text("Check")');
        /* the whole numbers fill in themselves once the multiplier is right */
        const shown = await page.$$eval('.drill .whole-out', (els) => els.map((e) => e.textContent));
        expect(shown.join() === r.rows.map((x) => String(x.sub)).join(), 'multiply them all: whole numbers ' + shown.join() + ' did not fill in');
        await page.click('.drill .primary:has-text("' + (i + 1 < list.length ? 'Next ratio' : 'Done') + '")');
      }
    } else if (kind === 'nmean') {
      const ns = await page.evaluate(() => [...document.querySelectorAll('table.nmean tbody tr')].map((tr) => {
        const M = parseFloat(tr.children[1].textContent);
        const efm = parseFloat(tr.children[2].textContent.split('÷')[1]);
        return Math.round(M / efm);
      }));
      await page.fill('table.nmean input >> nth=0', String(ns[0] + 1));
      for (let i = 1; i < ns.length; i++) await page.fill('table.nmean input >> nth=' + i, String(ns[i]));
      await page.click('.scene-step .primary:has-text("Check")');
      expect(/ the molar mass ÷ the empirical formula mass|n = /.test(await say()), 'molecular formulas: a wrong n is not answered');
      await page.fill('table.nmean input >> nth=0', String(ns[0]));
      await page.click('.scene-step .primary:has-text("Check")');
    } else if (kind === 'warm') {
      warmCount++;
      const p = await prob(seed, 'warm', id);
      if (warmCount === 1) {
        /* the usual mistakes, one at a time */
        const wrongChoice = p.choice === 'pct' ? 'Grams: use the grams' : 'Percents: assume 100 g';
        await page.click('.step-panel .choice:has-text("' + wrongChoice + '")');
        expect(/Look again/.test(await fb()), 'warm-up: the wrong Step 1 choice is not answered');
        await page.click('.step-panel .choice:has-text("' + (p.choice === 'pct' ? 'Percents: assume 100 g' : 'Grams: use the grams') + '")');
        if (p.rows.some((r) => r.typed)) {
          const r0 = p.rows.findIndex((r) => r.how === 'pct' || r.how === 'sub');
          if (p.rows[r0].how === 'pct') {
            await typeInto('g' + r0, String(p.rows[r0].g / 100));
            await page.click('.step-panel .primary:has-text("Check")');
            expect(/Assume a 100 g sample/.test(await fb()), 'warm-up: a percent as a decimal is not answered: ' + await fb());
          }
          for (let i = 0; i < p.rows.length; i++) if (p.rows[i].typed) await typeInto('g' + i, p.rows[i].gStr);
          await page.click('.step-panel .primary:has-text("Check")');
        }
        /* Step 2: moles to 2 significant figures is sent back, not marked */
        await ctl('fillStep');
        const molKey = 'mol0';
        const full = await page.inputValue('input[data-key="' + molKey + '"]');
        const short = Number(Number(full).toPrecision(2)).toString();
        if (short !== full) {
          await typeInto(molKey, short);
          const before = (await work()).g.moles;
          await page.click('.step-panel .primary:has-text("Check")');
          expect(/at least 3 significant figures/.test(await fb()), 'warm-up: moles to 2 significant figures not sent back: ' + await fb());
          expect((await work()).g.moles === before, 'warm-up: moles to 2 significant figures were counted');
          await typeInto(molKey, full);
        }
        /* Step 2 is a dimensional analysis setup: the molar mass on the bottom, the ratio on top, units struck */
        const da = await page.evaluate(() => ({ den: document.querySelectorAll('.da-den input.w-mm').length, num: document.querySelectorAll('.da-num input.w-per').length,
          struck: document.querySelectorAll('td.c-now .da .tok.cx').length }));
        expect(da.den === p.rows.length, 'warm-up: ' + da.den + ' molar mass boxes in the bottom of a fraction, expected ' + p.rows.length);
        expect(da.num === (p.mode === 'combustion' ? p.rows.length : 0), 'warm-up: ' + da.num + ' mole ratio boxes on top of a fraction');
        expect(da.struck === p.rows.length * (p.mode === 'combustion' ? 4 : 2), 'warm-up: ' + da.struck + ' units struck through in the setup');
        if (p.mode === 'combustion') {
          const h = p.rows[1];
          const molH2O = Number((h.g / 18.0).toPrecision(3)).toString();
          const right = await page.inputValue('input[data-key="mol1"]');
          await typeInto('mol1', molH2O);
          await page.click('.step-panel .primary:has-text("Check")');
          expect(/mole ratio turns it into mol H/.test(await fb()), 'warm-up: the mole ratio left out is not named: ' + await fb());
          await typeInto('mol1', right);
        }
        await page.locator('input[data-key="mm0"]').press('Enter');
        expect((await work()).s === 2, 'warm-up: Enter did not check Step 2');
        /* reload in the middle: the work comes back */
        await page.reload();
        await page.click('.screen-box .primary');
        expect((await stepId()) === id && (await work()).s === 2, 'warm-up: the work did not come back after a reload');
        /* Step 3: the wrong smallest (unless the rows tie, as C and H do in C8H8: then either is right) */
        const mols = await page.evaluate(() => App.ctl().work.n.mol);
        if (Math.max(...mols) > Math.min(...mols) * 1.01) {
          await page.click('.pickbtn >> nth=' + mols.indexOf(Math.max(...mols)));
          for (let i = 0; i < p.rows.length; i++) await typeInto('q' + i, '1.00');
          await page.click('.step-panel .primary:has-text("Check")');
          expect(/not the smallest/.test(await fb()), 'warm-up: the wrong smallest is not answered');
        }
        await ctl('fillStep'); await ctl('check');
        /* Step 4: x 2 when every quotient is whole (or x 1 when not) */
        await typeInto('mult', p.mult === 1 ? '2' : '1');
        await page.click('.step-panel .primary:has-text("Check")');
        expect(/already within 0\.1|not within 0\.1/.test(await fb()), 'warm-up: a wrong multiplier is not answered: ' + await fb());
        await page.click('.step-panel button:has-text("Hint")');
        expect(/within 0\.1/.test(await fb()), 'warm-up: no Step 4 hint');
        await ctl('fillStep'); await ctl('check');
        expect(JSON.stringify((await work()).n.w) === JSON.stringify(p.rows.map((r) => r.sub)), 'warm-up: Step 4 did not fill in the whole numbers');
        await ctl('fillSolution');
      } else if (p.mol) {
        /* Step 5 by hand: n + the empirical subscripts is answered */
        await page.evaluate(() => { const c = App.ctl(); while (c.step() !== 'molecular') { c.fillStep(); c.check(); } });
        await ctl('fillStep');
        /* adding n to a subscript, on one where adding and multiplying differ (not C2 with n = 2) */
        const subs = await page.$$eval('.molbox input.blank.w-s', (els) => els.map((e) => ({ key: e.dataset.key, v: Number(e.value) })));
        const slip = p.mol.n > 1 ? subs.find((x) => x.v / p.mol.n + p.mol.n !== x.v) : null;
        if (slip) {
          await typeInto(slip.key, String(slip.v / p.mol.n + p.mol.n));
          await page.click('.step-panel .primary:has-text("Check")');
          expect(/do not add n|subscript/.test(await fb()), 'warm-up: adding n is not answered: ' + await fb());
          await typeInto(slip.key, String(slip.v));
        }
        await page.click('.step-panel .primary:has-text("Check")');
      } else {
        await ctl('fillSolution');
      }
      expect(await page.evaluate(() => App.ctl().work.r === 1), 'warm-up ' + id + ' not finished');
    }
    await next();
  }
  expect((await stepId()) === 'set', 'never reached the graded set');

  /* ---- the graded set */
  const n = await page.evaluate(() => App.GRADED);
  for (let i = 0; i < n; i++) {
    const p = await prob(seed, 'set', i);
    await snap('set-' + (i + 1));
    if (i === 0) {
      const wrongChoice = p.choice === 'pct' ? 'Grams: use the grams' : 'Percents: assume 100 g';
      await page.click('.step-panel .choice:has-text("' + wrongChoice + '")');
      expect((await work()).g.grams === 0, 'set: a wrong first Step 1 was not counted');
      await ctl('fillSolution');
    } else if (i === 1) {
      await page.evaluate(() => { const c = App.ctl(); c.fillStep(); c.check(); });
      await ctl('fillStep');
      const key = 'mol0';
      const full = await page.inputValue('input[data-key="' + key + '"]');
      const short = Number(Number(full).toPrecision(2)).toString();
      if (short !== full) {
        await typeInto(key, short);
        await page.click('.step-panel .primary:has-text("Check")');
        await typeInto(key, full);
      }
      await page.click('.step-panel .primary:has-text("Check")');
      expect((await work()).g.moles === 1, 'set: moles to 2 significant figures counted as a miss');
      await ctl('fillSolution');
    } else if (i === 2) {
      /* Show me after two misses */
      await page.evaluate(() => { const c = App.ctl(); while (c.step() !== 'divide') { c.fillStep(); c.check(); } });
      const big = await page.evaluate(() => { const m = App.ctl().work.n.mol; return m.indexOf(Math.max.apply(null, m)); });
      await page.click('.pickbtn >> nth=' + big);
      for (let k = 0; k < 2; k++) {
        for (let r = 0; r < p.rows.length; r++) await typeInto('q' + r, '9.99');
        await page.click('.step-panel .primary:has-text("Check")');
      }
      expect(!!(await page.$('.step-panel .showme')), 'set: no Show me after two misses');
      await page.click('.step-panel .showme');
      expect((await work()).s === 3 && (await work()).g.divide === 0, 'set: Show me did not fill the step in');
      await ctl('fillSolution');
    } else if (i === 3) {
      /* reload in the middle of a graded problem */
      await page.evaluate(() => { const c = App.ctl(); c.fillStep(); c.check(); });
      await page.reload();
      await page.click('.screen-box .primary');
      expect((await work()).s === 1, 'set: the graded work did not come back after a reload');
      await ctl('fillSolution');
    } else {
      await ctl('fillSolution');
    }
    expect(await page.evaluate(() => App.ctl().work.r === 1), 'set problem ' + (i + 1) + ' not finished');
    await page.click('.step-panel .nextbtn');
    await page.waitForTimeout(30);
  }
  expect((await stepId()) === 'results', 'the last problem did not lead to the results');
  await snap('results');

  /* ---- what reached the LMS */
  const data = await lms();
  const want = await page.evaluate(() => Math.round(100 * App.rightSteps() / App.totalSteps()));
  const total = await page.evaluate(() => App.totalSteps());
  expect(data['cmi.core.score.raw'] === String(want), 'score ' + data['cmi.core.score.raw'] + ', expected ' + want);
  expect(want < 100 && want > 70, 'score ' + want + ' is not what the misses should give');
  expect(data['cmi.core.lesson_status'] === 'completed', 'status ' + data['cmi.core.lesson_status']);
  const inter = Object.keys(data).filter((k) => /^cmi\.interactions\.\d+\.id$/.test(k)).length;
  expect(inter === total, inter + ' interaction records, expected ' + total);
  expect(data['cmi.interactions.0.result'] === 'wrong' && /1grams$/.test(data['cmi.interactions.0.id']), 'the first interaction is not the missed Step 1');
  expect(!/masteryscore/.test(JSON.stringify(data)), 'a masteryscore reached the LMS');
  expect((data['cmi.suspend_data'] || '').length < 4000, 'suspend_data is ' + (data['cmi.suspend_data'] || '').length + ' characters');

  /* ---- a second attempt keeps the best score */
  await page.click('button:has-text("Start a new attempt")');
  await page.click('button:has-text("Yes, start again")');
  await page.waitForTimeout(50);
  const d2 = await lms();
  expect(d2['cmi.core.score.raw'] === String(want), 'a new attempt changed the gradebook score to ' + d2['cmi.core.score.raw']);
  st = await page.evaluate(() => App.state());
  expect(st.att === 2 && st.seed !== seed && st.step === 0, 'the new attempt did not start fresh');

  await browser.close();
  if (problems.length) {
    console.error('walkthrough (' + MODE + ', seed ' + seed + '): ' + problems.length + ' problem(s)\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  console.log('walkthrough (' + MODE + ', seed ' + seed + '): ok (score ' + want + '% from ' + total + ' graded steps, ' + inter + ' interactions, reloads, a second attempt)');
})();

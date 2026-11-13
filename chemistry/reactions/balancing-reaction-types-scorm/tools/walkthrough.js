/* tools/walkthrough.js: plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *   DARK=1 ...                           # the same in dark mode
 *
 * It checks that a save from another release, or one the browser kept, is
 * ignored inside the LMS; plays every lesson step with a mistake first and
 * reads the feedback; types the inventory where the step asks for it (one
 * count wrong first) and makes both predictions about polyatomic ions;
 * balances with the + and - buttons, the arrow keys and typed numbers; reloads in the middle of the questions and of the equations
 * to check the work comes back. In the graded part it checks that clicking a
 * choice grades nothing until Submit answer, misses one question on
 * purpose, misses the first Check of two equations (one with doubled
 * coefficients), checks that an empty box is not counted, and uses Show me.
 * In the classifying package it plays the recap, looks at all six types,
 * sorts eight reactions, and in the graded part checks that one Check judges
 * the coefficients and the type together (a Check with no type chosen is
 * not counted; a wrong type does not finish the reaction).
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
  /* the rows of the bench's inventory, and how many of them are marked */
  const rows = () => page.locator('.bench:not(.still) .inv-row').count();
  const marked = () => page.locator('.bench:not(.still) .inv-row.ok, .bench:not(.still) .inv-row.off').count();
  const allOk = async () => (await rows()) > 0 && (await rows()) === (await page.locator('.bench:not(.still) .inv-row.ok').count());

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

  /* fill in a typed inventory with the right counts */
  async function typeInventory(rxid) {
    const inv = await page.evaluate((rid) => { const r = Rx.get(rid); return Chem.inventory(r, Chem.species(r).map(() => 1)).map((x) => [x.left, x.right]); }, rxid);
    const cells = page.locator('.bench .inv-in');
    for (let r = 0; r < inv.length; r++) { await cells.nth(2 * r).fill(String(inv[r][0])); await cells.nth(2 * r + 1).fill(String(inv[r][1])); }
    await check();
  }
  const pickType = (t) => page.click('.bench:not(.still) .type-btn[data-type="' + t + '"]');
  const wrongType = (t) => (t === 'S' ? 'D' : 'S');

  async function playTypes() {
    /* ---- recap: the inventory, then HOH */
    expect(await stepId() === 'recap', 'first step should be the recap');
    await typeInventory('rust');
    await setCoefs(await answer('rust'), 'buttons');
    await check();
    expect(/Balanced/.test(await fb('.bench')) && await page.locator('.bench .type-btn').count() === 0, 'recap: balanced, and no type picker yet');
    await snap('recap');
    await next();
    expect(await stepId() === 'hoh', 'the HOH recap');
    await page.click('.panel.ask .tile:has-text("HOH")');
    await typeInventory('naohh2so4');
    expect(/HOH/.test(await page.textContent('.bench .eq')), 'hoh: water should be written HOH');
    await setCoefs(await answer('naohh2so4'), 'type');
    await check();
    await next();

    /* ---- the six types: every card must be looked at */
    expect(await stepId() === 'types' && await nextDisabled(), 'the six types: Next before all are seen');
    const order = await page.evaluate(() => Chem.TYPE_ORDER);
    for (const t of order) {
      await page.click('.type-tabs .type-btn[data-type="' + t + '"]');
      expect((await page.textContent('.type-card h4')) === (await page.evaluate((x) => Chem.TYPES[x].name, t)), 'types: the card for ' + t);
      expect(await page.locator('.type-card .particle').count() > 1, 'types: ' + t + ' needs its particle picture');
      if (t === 'N') await snap('types');
    }
    await next();

    /* ---- which type? */
    const sort = await page.evaluate(() => Steps.SORT.map((id) => Rx.get(id).type));
    for (let i = 0; i < sort.length; i++) {
      const t = i === 0 ? wrongType(sort[i]) : sort[i];
      await page.click('.panel .types .type-btn[data-type="' + t + '"]');
      expect(new RegExp(i === 0 ? 'Not that one' : 'Right').test(await fb()), 'sort ' + i + ': feedback ' + await fb());
      expect(await page.locator('.panel .types .type-btn.right').count() === 1, 'sort ' + i + ': the right type should be shown');
      if (i === 7) await snap('sort');
      if (i < sort.length - 1) await page.click('.panel .btnrow .primary');
    }
    await next();

    /* ---- balance and classify together, not graded */
    for (const id of ['both1', 'both2']) {
      expect(await stepId() === id, 'expected ' + id);
      const rxid = await page.evaluate(() => App.STEPS[App.state().step].rx), want = await answer(rxid);
      const t = await page.evaluate((r) => Rx.get(r).type, rxid);
      expect(await page.locator('.bench .type-btn').count() === 6, id + ': six types to choose from');
      await setCoefs(want, 'type');
      if (id === 'both1') {
        await check();
        expect(/Choose the type/.test(await fb('.bench')), id + ': a Check without a type should not count');
        await pickType(wrongType(t));
        expect(await page.locator('.bench .type-btn.selected').count() === 1 && !(await page.evaluate(() => App.ctl().work.r)), id + ': a click on a type must only select');
        await check();
        expect(/The equation is balanced\. The type is not/.test(await fb('.bench')), id + ': a wrong type: ' + await fb('.bench'));
        await snap('both-wrong-type');
      }
      await pickType(t);
      await check();
      expect(/Balanced/.test(await fb('.bench')) && await page.locator('.bench .type-btn.right').count() === 1, id + ': both right was not accepted');
      await next();
    }

    /* ---- graded questions */
    expect(await stepId() === 'quiz', 'the questions should follow the lesson');
    const qs = await page.evaluate(() => App.questions().map((q) => ({ right: q.right, n: q.choices.length })));
    expect(qs.length === 4, 'four questions on the types');
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i], wrong = (q.right + 1) % q.n, miss = i === 1;
      await page.locator('.quiz .choice').nth(wrong).click();
      expect((await page.evaluate(() => App.state().q.a.length)) === i, 'q' + i + ': a click must only select');
      if (!miss) await page.locator('.quiz .choice').nth(q.right).click();
      await page.click('.quiz .submit-answer');
      expect(new RegExp(miss ? 'Not this time' : 'Right').test(await fb('.quiz')), 'q' + i + ': feedback');
      if (!miss) wantRight++;
      if (i === 3) await snap('question');
      if (i === 1) {
        await page.reload();
        await page.click('.screen-box .primary');
        expect(await stepId() === 'quiz' && (await page.evaluate(() => App.state().q.a.length)) === 2, 'reload in the questions: the answers did not come back');
        continue;
      }
      await page.click('.quiz .quiz-next');
    }

    /* ---- graded reactions: coefficients and type, judged by one Check */
    expect(await stepId() === 'set', 'the reactions should follow the questions');
    set = await page.evaluate(() => App.problems().map((p) => ({ id: p.id, coefs: p.coefs, type: p.type })));
    expect(set[9].id === 'nitroglycerin', 'nitroglycerin should be last');
    for (let i = 0; i < set.length; i++) {
      const want = set[i].coefs, t = set[i].type;
      expect(await rows() > 0 && (await marked()) === 0, 'reaction ' + (i + 1) + ': nothing should be marked before the first Check');
      if (i === 0) {
        await check();
        expect((await page.evaluate(() => App.ctl().work.n)) === 0, 'a Check without a type was counted');
        await pickType(t);
        await check();                                /* all 1s with the right type: 1 of 2 */
        expect(/The type is right/.test(await fb('.bench')), 'the right type with wrong coefficients: ' + await fb('.bench'));
        wantRight += 1;
        await snap('reaction-miss');
      } else if (i === 1) {
        await setCoefs(want, 'type');
        await pickType(wrongType(t));
        await check();                                /* balanced with the wrong type: 1 of 2 */
        expect(/The type is not/.test(await fb('.bench')) && !(await page.evaluate(() => App.ctl().work.r)), 'a wrong type must not finish the reaction');
        wantRight += 1;
        await pickType(t);
      } else if (i === 2) {
        await pickType(wrongType(t));
        await check(); await check(); await check();
        expect(await page.isVisible('.showme'), 'Show me should appear after three misses');
        await page.click('.showme');
      } else { wantRight += 2; await pickType(t); }
      if (i !== 2) { await setCoefs(want, i === 9 ? 'type' : i % 2 ? 'buttons' : 'type'); await check(); }
      expect(/Balanced|Here it is/.test(await fb('.bench')), 'reaction ' + (i + 1) + ' (' + set[i].id + ') not accepted: ' + await fb('.bench'));
      expect(await page.locator('.bench .type-btn.right[data-type="' + t + '"]').count() === 1, 'reaction ' + (i + 1) + ': the right type should be marked');
      if (i === 4) {
        await page.reload();
        await page.click('.screen-box .primary');
        expect(await stepId() === 'set' && (await page.evaluate(() => App.state().p.filter((w) => w && w.r).length)) === 5, 'reload in the reactions: the work did not come back');
        continue;
      }
      if (i === 9) await snap('nitroglycerin');
      await page.click('.bench-next');
    }
  }

  async function playBalancing() {
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
    expect(await page.locator('.inv-row').count() === 0, 'conserved ' + i + ': the inventory shows before the answer');
    const wrongFirst = i === 1;
    await page.click('.tile:has-text("' + ((cards[i] !== wrongFirst) ? 'Atoms conserved' : 'Not conserved') + '")');
    expect(await page.locator('.inv-row').count() > 0, 'conserved ' + i + ': no inventory after the answer');
    expect(new RegExp(wrongFirst ? 'Look again' : 'Right').test(await fb()), 'conserved ' + i + ': feedback ' + await fb());
    if (i === 1) await snap('conserved');
    if (i < cards.length - 1) await page.click('.panel .btnrow .primary');
  }
  await next();

  /* ---- the lesson benches: Part 3, then polyatomic ions */
  const hows = ['buttons', 'keys', 'type', 'type', 'buttons', 'type', 'type'];
  const benchSteps = await page.evaluate(() => App.STEPS.filter((s) => s.kind === 'bench').map((s) => ({ id: s.id, rx: s.rx, typed: !!s.typed, ask: s.ask ? s.ask.c.map((c) => !!c.ok) : null })));
  expect(benchSteps.map((s) => s.id).join() === 'first,second,third,strategy,ions,split,mixed', 'the lesson benches: ' + benchSteps.map((s) => s.id).join());
  for (let b = 0; b < benchSteps.length; b++) {
    const bs = benchSteps[b], id = await stepId();
    expect(id === bs.id, 'expected step ' + bs.id + ', on ' + id);
    const want = await answer(bs.rx);
    if (bs.ask) {
      expect(await page.locator('.bench:not(.still)').count() === 0, id + ': the bench should wait for the prediction');
      const pickRight = id !== 'ions';             /* one prediction wrong, one right */
      await page.locator('.panel.ask .tile').nth(bs.ask.indexOf(pickRight)).click();
      expect(await page.locator('.panel.ask .fb.show.' + (pickRight ? 'good' : 'bad')).count() === 1, id + ': feedback on the prediction');
      expect(await page.locator('.bench:not(.still)').count() === 1, id + ': the bench should open after the prediction');
    }
    if (bs.typed) {
      const inv = await page.evaluate((rid) => { const r = Rx.get(rid); return Chem.inventory(r, Chem.species(r).map(() => 1)).map((x) => [x.left, x.right, x.label]); }, bs.rx);
      const cells = page.locator('.bench .inv-in');
      expect(await cells.count() === inv.length * 2, id + ': a box for both sides of every row');
      expect(await page.isDisabled('.bench .stp.inc >> nth=0'), id + ': the steppers should wait for the inventory');
      await check();
      expect(/Fill in both columns/.test(await fb('.bench')), id + ': an empty inventory');
      for (let r = 0; r < inv.length; r++) { await cells.nth(2 * r).fill(String(inv[r][0])); await cells.nth(2 * r + 1).fill(String(inv[r][1] + (r === 1 ? 1 : 0))); }
      await check();
      expect(await page.locator('.bench .inv-in.wrong').count() === 1 && (await fb('.bench')).length > 20, id + ': a wrong count should be marked and explained: ' + await fb('.bench'));
      if (id === 'ions') {
        expect(inv.map((x) => x[2]).join() === 'Na,PO₄,Ca,C₂H₃O₂', 'ions: the inventory rows should be Na, PO₄, Ca, C₂H₃O₂');
        await snap('ions-typing');
      }
      await cells.nth(3).fill(String(inv[1][1]));
      await cells.nth(3).press('Enter');
      expect(/That is the inventory/.test(await fb('.bench')), id + ': the right inventory was not accepted: ' + await fb('.bench'));
    }
    expect(await rows() > 0 && (await marked()) === (await rows()), id + ': the live inventory should be marked');
    if (id === 'mixed') {
      expect(/HOH/.test(await page.textContent('.bench .eq')) && /OH/.test(await page.textContent('.bench .inv')), 'mixed: water should be written HOH and OH should be a row');
      expect(await page.locator('.bench .halo[data-ion="OH"]').count() === 2 && await page.locator('.bench .halo[data-ion="SO4"]').count() === 2, 'mixed: OH and SO4 should be outlined on both sides');
    }
    if (id === 'ions') expect(await page.locator('.bench .halo[data-ion="PO4"]').count() === 3 && await page.locator('.bench .halo[data-ion="C2H3O2"]').count() === 3, 'ions: every PO4 and C2H3O2 should be outlined');
    if (id === 'first') expect(await page.locator('.bench .halo').count() === 0, 'first: nothing to outline');
    if (id === 'split') expect(!/PO₄/.test(await page.textContent('.bench .inv')), 'split: PO₄ must not be a row');
    await check();
    expect(/Not balanced yet/.test(await fb('.bench')), id + ': all 1s should not be balanced: ' + await fb('.bench'));
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
    expect(await allOk(), id + ': every row should match');
    await snap(id);
    await next();
  }

  /* ---- graded questions: select, then Submit answer */
  expect(await stepId() === 'quiz', 'the questions should follow the lesson');
  const qs = await page.evaluate(() => App.questions().map((q) => ({ right: q.right, n: q.choices.length, id: q.id })));
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
  set = await page.evaluate(() => App.problems().map((p) => ({ id: p.id, coefs: p.coefs })));
  for (let i = 0; i < set.length; i++) {
    const want = set[i].coefs;
    expect(await rows() > 0 && (await marked()) === 0, 'equation ' + (i + 1) + ': the inventory should show its counts but mark nothing before the first Check');
    if (i === 0) {
      await page.locator('.bench input.coef').first().fill('');
      await check();
      expect((await page.evaluate(() => App.ctl().work.n)) === 0, 'an empty box was counted as a Check');
      await page.locator('.bench input.coef').first().fill('1');
      await check();                                  /* all 1s: a counted miss */
      expect(await marked() > 0, 'a miss should mark the inventory');
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

  }

  let wantRight = 0, set = [];
  const CL = await page.evaluate(() => App.CLASSIFY);
  const TOTAL = CL ? 24 : 16, WANT = CL ? 19 : 12;
  if (CL) await playTypes(); else await playBalancing();

  /* ---- results and what reached the LMS */
  expect(await stepId() === 'results', 'results should follow the equations');
  await snap('results');
  let data = await lms();
  const pct = String(Math.round(100 * wantRight / TOTAL));
  expect(wantRight === WANT, 'the walkthrough should score ' + WANT + ' of ' + TOTAL + ', got ' + wantRight);
  expect(data['cmi.core.score.raw'] === pct, 'score ' + data['cmi.core.score.raw'] + ', wanted ' + pct);
  expect(data['cmi.core.lesson_status'] === 'completed', 'status ' + data['cmi.core.lesson_status']);
  const inter = Object.keys(data).filter((k) => /^cmi\.interactions\.\d+\.id$/.test(k));
  expect(inter.length === TOTAL, inter.length + ' interactions, wanted ' + TOTAL);
  expect(Object.keys(data).filter((k) => /\.result$/.test(k) && data[k] === 'correct').length === WANT, 'interactions marked correct');
  expect((data['cmi.suspend_data'] || '').length < 4000, 'suspend_data too long: ' + (data['cmi.suspend_data'] || '').length);
  expect((await page.textContent('.big-score')).indexOf(WANT + ' / ' + TOTAL) >= 0, 'the results screen score');

  /* ---- a second attempt keeps the best score */
  await page.click('.panel .btnrow .primary:has-text("Start a new attempt")');
  await page.click('.confirm .primary');
  st = await page.evaluate(() => App.state());
  expect(st.att === 2 && st.step === 0 && st.q.a.length === 0 && Math.round(st.best) === +pct, 'the new attempt');
  expect((await lms())['cmi.core.score.raw'] === pct, 'the best score should stay in the gradebook');
  expect(set.map((p) => p.id).join() !== (await page.evaluate(() => App.problems().map((p) => p.id).join())), 'a new attempt should bring a new set');

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
  console.log('Walkthrough passed' + (CL ? ' (classifying package)' : '') + ': lesson, ' + (CL ? '4 questions, 10 reactions balanced and classified' : '6 questions, 10 equations') +
    ', score ' + pct + '% (' + WANT + ' of ' + TOTAL + ') and completion reached the LMS, best score kept.');
})();

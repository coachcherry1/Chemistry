/* tools/walkthrough.js: plays the whole activity as a student would, in a
 * real browser, against a fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per step
 *   DARK=1 ...                           # the same in dark mode
 *   MOTION=1 ...                         # with motion (the beaker plays) instead of reduced motion
 *
 * It checks that a save from another release, or one the browser kept, is
 * ignored inside the LMS; answers the picture cards (one wrong first) and the
 * split drill with the usual slips (the coefficient left out, a wrong charge,
 * a solid split into ions); makes the three predictions (Pour stays locked
 * until then), runs the beaker and checks every drawn sphere against the
 * size table; works the three lesson problems with the usual mistakes (a
 * spectator kept, a non-spectator struck out, a net ionic equation not in
 * lowest terms, something built where nothing reacts) and reads the
 * feedback each gets. In the graded part it checks that a choice is only
 * selected until Submit answer, misses one question and several steps on
 * purpose, checks that an unfinished Check is not counted, reloads in the
 * middle, and then checks what reached the "LMS": the score, the completion
 * status and one interaction per graded item. It also checks that every
 * problem shows the same five steps, that every finished problem plays in
 * the beaker, and that no lesson reaction comes back in the graded set.
 * Finally it starts a second attempt and opens the page with no LMS at all.
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
  if (!process.env.MOTION) await page.emulateMedia({ reducedMotion: 'reduce' });
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
    const ok = await page.waitForFunction(() => !document.getElementById('next').disabled, null, { timeout: 15000 }).then(() => true, () => false);
    expect(ok, 'Next stays disabled on ' + id);
    await page.click('#next');
    await page.waitForTimeout(30);
  }

  /* ---- the beaker: Pour (or After mixing), wait for the end, check every size */
  async function pour(sel, name) {
    await page.click(sel + ' .bk-play');
    const ok = await page.waitForFunction((s) => document.querySelector(s + ' .bk').getAttribute('data-done') === '1' && !document.querySelector(s + ' .bk-hi').hidden, sel, { timeout: 20000 }).then(() => true, () => false);
    expect(ok, name + ': the beaker did not finish');
    const bad = await page.evaluate((s) => {
      const out = [];
      document.querySelectorAll(s + ' .bk-p').forEach((g) => {
        const key = g.getAttribute('data-key'), sh = Data.shape(key);
        g.querySelectorAll('.bk-atom').forEach((c, i) => { if (Math.abs(+c.getAttribute('r') - sh.atoms[i].r * Data.SCALE) > 0.01) out.push(key + ' ' + i); });
      });
      return out;
    }, sel);
    expect(!bad.length, name + ': drawn sizes differ from the table: ' + bad.join(', '));
    await page.click(sel + ' .bk-hi');
    expect(await page.locator(sel + ' .bk-svg.hi').count() === 1, name + ': Highlight spectators');
    await page.click(sel + ' .bk-hi');
  }

  /* ---- one problem on the ladder */
  const prob = () => page.evaluate(() => { const p = App.ctl().problem; return { id: p.id, kind: p.kind, l: p.l, r: p.r, sp: p.sp, coefs: p.coefs, states: p.states, spect: p.spect, rungs: p.rungs,
    net: p.net && { left: p.net.left.map((t) => ({ key: Net.termKey(t), n: t.n, s: t.t === 'ion' ? 'aq' : t.s })), right: p.net.right.map((t) => ({ key: Net.termKey(t), n: t.n, s: t.t === 'ion' ? 'aq' : t.s })) } }; });
  const rung = () => page.evaluate(() => { const c = App.ctl(); return c.work.r ? 'done' : c.problem.rungs[c.work.i]; });
  async function check() { await page.click('.ladder .rung-check'); await page.waitForTimeout(20); }
  /* one row of the ionic rung (or the split drill): splits into ions or stays together */
  async function setRow(row, st, how) {
    const sp = how || (st === 'aq' ? 'split' : 'keep');
    await row.locator('.io-btn[data-sp="' + sp + '"]').click();
  }
  /* the net ionic step: set each coefficient (they start as the complete ionic ones) */
  async function netSet(p, mult) {
    for (const [k, side] of [[0, 'left'], [1, 'right']]) {
      for (const t of p.net[side]) {
        const term = page.locator('.net-term[data-id="' + k + ':' + t.key + '"]');
        const want = t.n * (mult || 1);
        let cur = +(await term.locator('.sub-n').textContent());
        while (cur > want) { await term.locator('.stp.dec').click(); cur = +(await term.locator('.sub-n').textContent()); }
        while (cur < want) { await term.locator('.stp.inc').click(); cur = +(await term.locator('.sub-n').textContent()); }
      }
    }
  }
  /* one rung, right (or, with miss, wrong first); returns whether the first answer was right */
  async function doRung(p, miss) {
    const r = await rung();
    if (r === 'balance') {
      const inputs = page.locator('.bench input.coef');
      const allOnes = p.coefs.every((c) => c === 1);
      if (miss && !allOnes) await page.click('.bench .bench-check');
      for (let j = 0; j < p.coefs.length; j++) await inputs.nth(j).fill(String(p.coefs[j]));
      await page.click('.bench .bench-check');
      return !(miss && !allOnes);
    }
    if (r === 'states') {
      for (const f of p.r) {
        const want = p.states[f], st = miss && f === p.r[0] ? (want === 'aq' ? 's' : 'aq') : want;
        await page.click('.state-row[data-f="' + f + '"] .state-btn[data-state="' + st + '"]');
      }
      await check();
      if (miss) { expect(/solubility rules|liquid|compound of ions/.test(await fb('.ladder')), p.id + ' states: ' + await fb('.ladder')); for (const f of p.r) await page.click('.state-row[data-f="' + f + '"] .state-btn[data-state="' + p.states[f] + '"]'); await check(); }
      return !miss;
    }
    if (r === 'ionic') {
      const rows = page.locator('.io-row');
      for (let j = 0; j < p.sp.length; j++) {
        const st = j < 2 ? 'aq' : p.states[p.sp[j]];
        await setRow(rows.nth(j), st, miss && j === 0 ? 'keep' : null);
      }
      await check();
      if (miss) { expect(/is \(aq\)/.test(await fb('.ladder')), p.id + ' ionic: ' + await fb('.ladder')); await setRow(rows.nth(0), 'aq', null); await check(); }
      expect(!miss || /→/.test(await page.textContent('.ladder .done-line')), p.id + ': past the ionic step');
      return !miss;
    }
    if (r === 'spectators') {
      if (miss) {
        const wrong = await page.evaluate(() => { const p = App.ctl().problem; const t = p.ionic.left.find((x) => p.spect.indexOf(x.key) < 0); return t ? t.key : p.ionic.left[0].key; });
        await page.locator('.term[data-key="' + wrong + '"]').first().click();
        await check();
        expect(/not a spectator|both sides/.test(await fb('.ladder')), p.id + ' spectators: ' + await fb('.ladder'));
        await page.locator('.term[data-key="' + wrong + '"]').first().click();
      }
      if (p.spect.length) for (const k of p.spect) await page.locator('.term[data-key="' + k + '"]').first().click();
      else await page.click('.none-btn');
      await check();
      return !miss;
    }
    if (r === 'net') {
      expect((await page.locator('.net-term').count()) === (p.net ? p.net.left.length + p.net.right.length : 0), p.id + ': the net step should start with what is left');
      if (!p.net) {
        /* nothing is left: a Check without "No reaction" is not an answer; a miss is not possible here */
        await check();
        expect(/not counted/.test(await fb('.ladder')), p.id + ': an empty net ionic Check should not count: ' + await fb('.ladder'));
        await page.click('.none-btn');
        await check();
        return true;
      }
      if (miss) {
        await page.click('.none-btn');
        await check();
        expect(/Not everything cancels/.test(await fb('.ladder')), p.id + ' net: ' + await fb('.ladder'));
        await page.click('.none-btn');
      }
      await netSet(p);
      await check();
      return !miss;
    }
    return true;
  }
  async function solve(misses) {
    const p = await prob();
    let right = 0;
    for (const r of p.rungs) {
      expect((await rung()) === r, p.id + ': expected rung ' + r + ', at ' + (await rung()));
      if (await doRung(p, misses.indexOf(r) >= 0)) right++;
    }
    expect((await rung()) === 'done', p.id + ': not finished');
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

  /* ---- picture cards: one wrong first */
  expect(await stepId() === 'aq', 'first step');
  const cards = await page.evaluate(() => Steps.aqCards().map((c) => ({ right: c.choices[c.right].t, wrong: c.choices[(c.right + 1) % c.choices.length].t })));
  for (let i = 0; i < cards.length; i++) {
    expect(await page.locator('.pic-choice svg').count() >= 3, 'aq ' + i + ': the choices should be pictures');
    await page.click('.pic-choice[aria-label$="' + (i === 0 ? cards[i].wrong : cards[i].right) + '"]');
    expect(new RegExp(i === 0 ? 'Not this one' : '^Yes').test(await fb()), 'aq ' + i + ': ' + await fb());
    if (i === 0) await snap('aq');
    if (i < cards.length - 1) await page.click('.card-next');
  }
  await next();

  /* ---- the split drill */
  expect(await stepId() === 'split', 'the split drill');
  const splits = await page.evaluate(() => Gen.LESSON.split.map(([f, c]) => ({ f, c, st: Net.state(f) })));
  expect(await page.locator('.io-btn[data-sp="split"].selected').count() === 1, 'split: the first card is a worked example, filled in');
  await page.click('.card-next');
  for (let i = 1; i < splits.length; i++) {
    const s = splits[i], row = page.locator('.io-row').first();
    expect(await page.locator('.split-pic svg').count() === 0, 'split ' + i + ': the picture should come after the answer');
    if (i === 1) { await page.click('.rung-check'); expect(/Choose/.test(await fb()), 'split: an empty Check should ask for an answer: ' + await fb()); }
    if (i === 2) { await setRow(row, s.st, 'keep'); await page.click('.rung-check'); expect(/is \(aq\)/.test(await fb()), 'split: an (aq) kept together: ' + await fb()); }
    if (s.st !== 'aq') {
      await setRow(row, s.st, 'split'); await page.click('.rung-check');
      expect(s.f === 'H2O' ? /covalent molecule/.test(await fb()) : /solid/.test(await fb()), 'split: ' + s.f + ' split into ions: ' + await fb());
    }
    await setRow(row, s.st, null);
    expect(s.st !== 'aq' || /→/.test(await row.textContent()), 'split ' + s.f + ': the ions should be written once it splits');
    await page.click('.rung-check');
    expect(/^Right/.test(await fb()), 'split ' + s.f + ': ' + await fb());
    expect(await page.locator('.split-pic svg').count() === 1, 'split ' + i + ': the picture after the answer');
    if (s.f === 'H2O') expect(await page.evaluate(() => document.querySelectorAll('.split-pic .bk-p[data-key="HOH"]').length > 0), 'split: water drawn as HOH molecules');
    if (i === 4) await snap('split');
    if (i < splits.length - 1) await page.click('.card-next');
  }
  await next();

  /* ---- predict, then pour */
  async function watch(id, rightText) {
    expect(await stepId() === id, 'step ' + id);
    expect(await page.isDisabled('.bk-play'), id + ': Pour should wait for the prediction');
    expect(await page.locator('.side-col .ref .ref-body').count() === 1, id + ': the reference beside the prediction');
    await page.click('.side-col .tile:has-text("' + rightText + '")');
    await pour('.ladder.watch', id);
    await snap(id);
    await next();
  }
  /* ---- the three lesson problems */
  async function lesson(id, kind) {
    expect(await stepId() === id, 'step ' + id);
    const p = await prob();
    expect(p.kind === kind, id + ' should be ' + kind + ', is ' + p.kind);
    expect(await page.locator('.ladder .rung').count() === 5, id + ': five steps');
    expect(await page.locator('.rung-hint').count() === 1, id + ': the lesson gives a hint');
    await doRung(p, false);                       /* balance */
    await doRung(p, true);                        /* states, wrong first */
    await doRung(p, kind === 'solid');            /* ionic */
    await doRung(p, kind !== 'none');             /* spectators */
    if (kind === 'water') {
      /* the coefficients carried over are not in lowest terms */
      await check();
      expect(/lowest whole numbers/.test(await fb('.ladder')), id + ': not in lowest terms: ' + await fb('.ladder'));
      await netSet(p);
      await check();
    } else if (kind === 'solid') {
      /* one coefficient changed alone */
      await page.locator('.net-term .stp.inc').first().click();
      await check();
      expect(/same way/.test(await fb('.ladder')), id + ': one coefficient changed alone: ' + await fb('.ladder'));
      await netSet(p);
      await check();
    } else await doRung(p, false);
    expect((await rung()) === 'done', id + ': not finished');
    expect(/No reaction|→/.test(await page.textContent('.final-eq')), id + ': the net ionic equation at the end');
    await pour('.ladder .final-pic', id + ' done');
    await snap(id + '-done');
    await next();
  }
  await watch('mixsolid', 'Na⁺ and NO₃⁻');
  await lesson('exsolid', 'solid');
  await watch('mixwater', 'Water, HOH');
  await lesson('exwater', 'water');
  await watch('mixnone', 'Nothing happens');
  await lesson('exnone', 'none');

  /* ---- graded questions */
  expect(await stepId() === 'quiz', 'the questions should follow the lesson');
  const qs = await page.evaluate(() => App.questions().map((q) => ({ right: q.right, n: q.choices.length, pics: !!(q.pics && q.pics.some(Boolean)), pic: !!q.pic })));
  let wantRight = 0, items = 0;
  const TOTAL = 44;
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i], wrong = (q.right + 1) % q.n, miss = i === 1;
    expect(i !== 0 || q.pics, 'the first question should have pictures as choices');
    expect(i === 0 || q.pic, 'question ' + i + ' should draw its solutions');
    expect(await page.isDisabled('.quiz .submit-answer'), 'q' + i + ': Submit answer should wait for a choice');
    await page.locator('.quiz .choice').nth(wrong).click();
    expect((await page.evaluate(() => App.state().q.a.length)) === i, 'q' + i + ': a click must only select');
    if (!miss) await page.locator('.quiz .choice').nth(q.right).click();
    await page.click('.quiz .submit-answer');
    expect(await page.locator('.quiz .submit-answer').count() === 0, 'q' + i + ': Submit answer should go away once used');
    if (!miss) wantRight++;
    items++;
    if (i === 0 || i === 2) await snap('question-' + (i + 1));
    await page.click('.quiz .quiz-next');
  }

  /* ---- graded problems */
  expect(await stepId() === 'set', 'the problems should follow the questions');
  const total = await page.evaluate(() => App.totalItems());
  expect(total === TOTAL, 'the graded items: ' + total);
  const kinds = {};
  for (let i = 0; i < 8; i++) {
    const before = await prob();
    kinds[before.kind] = (kinds[before.kind] || 0) + 1;
    expect(await page.locator('.ladder .rung').count() === 5, before.id + ': every problem shows the same five steps');
    expect(!/\((aq|s|l)\)[^(]*→[^(]*\((s|l)\)/.test(await page.textContent('.ladder .given')), before.id + ': the given equation should not show the products\' states');
    expect(await page.locator('.rung-hint').count() === 0, before.id + ': no hints in the graded set');
    if (i === 1) {
      /* an unfinished Check is not counted */
      await doRung(before, false);
      await doRung(before, false);
      const n0 = await page.evaluate(() => App.ctl().work.n.ionic || 0);
      await check();
      expect(/not counted/.test(await fb('.ladder')) && (await page.evaluate(() => App.ctl().work.n.ionic || 0)) === n0, 'an unfinished Check should not count');
      /* reload in the middle of a problem: it should open at the same rung */
      await page.reload();
      await page.click('.screen-box .primary');
      expect((await rung()) === 'ionic', 'reload inside a problem: opened at ' + (await rung()));
      let r2 = 2;
      for (const r of ['ionic', 'spectators', 'net']) { if (await doRung(before, r === 'net')) r2++; }
      wantRight += r2; items += 5;
    } else {
      const misses = i === 0 ? ['balance', 'ionic'] : i === 3 ? ['spectators'] : i === 7 ? ['net'] : [];
      const res = await solve(misses);
      wantRight += res.right; items += res.p.rungs.length;
    }
    expect(await page.locator('.ladder .final-pic .bk-svg').count() === 1, before.id + ': the finished problem should play in the beaker');
    if (i === 0) await pour('.ladder .final-pic', before.id);
    if (i === 0 || i === 7) await snap('problem-' + (i + 1));
    if (i === 4) {
      await page.reload();
      await page.click('.screen-box .primary');
      expect(await stepId() === 'set' && (await page.evaluate(() => App.state().p.filter((w) => w && w.r).length)) === 5, 'reload in the problems: the work did not come back');
      await page.click('.pnum:nth-child(6)');
      continue;
    }
    await page.click('.ladder-next');
  }
  expect(kinds.solid === 3 && kinds.water === 2 && kinds.none === 2 && kinds.both === 1, 'the kinds of problem: ' + JSON.stringify(kinds));
  const reused = await page.evaluate(() => App.problems().filter((q) => Gen.SEEN[Gen.key(q.l)]).map((q) => q.id));
  expect(reused.length === 0, 'lesson reactions in the graded set: ' + reused.join(', '));
  expect(items === TOTAL, 'the walkthrough answered ' + items + ' items');

  /* ---- results and what reached the LMS */
  expect(await stepId() === 'results', 'results should follow the problems');
  await snap('results');
  const data = await lms();
  const pct = String(Math.round(100 * wantRight / TOTAL));
  if (process.env.DEBUG) console.log(JSON.stringify(await page.evaluate(() => App.state().p.map((w) => w.g))), JSON.stringify(await page.evaluate(() => App.state().q.a)));
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
  console.log('Walkthrough passed: lesson, 4 questions, 8 problems, score ' + pct + '% (' + wantRight + ' of ' + TOTAL + ') and completion reached the LMS, best score kept.');
})();

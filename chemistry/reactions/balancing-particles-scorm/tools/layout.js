/* tools/layout.js: checks the page fits a school Chromebook. Optional: needs
 * Playwright.
 *
 *   node tools/layout.js                      # the usual window sizes
 *   node tools/layout.js 1366x520,900x600     # just these
 *   SHOTS=dir node tools/layout.js            # also screenshot each checked view
 *
 * What a student works with must be on screen together without zooming. On
 * every workbench (the lesson's, picture to equation, and the graded
 * equations with the most substances and the most particles): after
 * scrolling the workbench to the top of the window, the equation with its
 * steppers, both particle boxes, the tally and the Check button must all be
 * on screen, before a Check and after a miss (with the feedback showing). In
 * the graded questions, the picture, the question, every choice and Submit
 * answer must be. No step may scroll sideways.
 *
 * 1366x650 is a Chromebook's browser tab; 1366x520 and 1280x560 allow for the
 * LMS's own header around the frame. Narrow windows are checked for sideways
 * scrolling only.
 */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
  catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); }
}
const dir = path.join(__dirname, '..');
const sizes = (process.argv[2] || '1366x650,1366x520,1280x560,1100x600,900x600,1536x750,1920x950')
  .split(',').map((s) => s.split('x').map(Number));
const shots = process.env.SHOTS;

(async () => {
  const b = await chromium.launch();
  let bad = 0, checked = 0;
  const page0 = await b.newPage();
  await page0.goto('file://' + dir + '/src/index.html?step=1');
  const steps = await page0.evaluate(() => App.STEPS.map((s) => ({ id: s.id, kind: s.kind })));
  const views = steps.filter((s) => s.kind !== 'set').map((s) => ({ id: s.id, kind: s.kind, q: '&seed=1', name: s.id }));
  for (const seed of [1, 2, 3, 4]) {
    /* the graded equations with the most substances and the most particles */
    const list = await page0.evaluate((s) => Gen.set(s).map((p, i) => ({ i: i + 1, sp: p.coefs.length, n: p.coefs.reduce((a, c) => a + c, 0) })), seed);
    const pick = [list.slice().sort((x, y) => y.sp - x.sp || y.n - x.n)[0], list.slice().sort((x, y) => y.n - x.n)[0]];
    pick.forEach((p) => views.push({ id: 'set', kind: 'set', q: '&seed=' + seed + '&problem=' + p.i, name: 'set-' + seed + '-' + p.i }));
  }
  for (let i = 1; i <= 6; i++) views.push({ id: 'quiz', kind: 'quiz', q: '&seed=2', name: 'quiz-' + i, question: i });
  await page0.close();

  for (const [w, hgt] of sizes) {
    const page = await b.newPage({ viewport: { width: w, height: hgt } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    const out = [];
    const together = w >= 1280;          /* the Chromebook sizes */
    async function fits(v, what, sels, top) {
      const r = await page.evaluate(([list, topSel]) => {
        const t = document.querySelector(topSel);
        if (!t) return { missing: topSel };
        window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY - 4);
        let worst = 0, name = '';
        for (const sel of list) {
          const els = Array.from(document.querySelectorAll(sel)).filter((e) => e.offsetParent !== null);
          if (!els.length) return { missing: sel };
          els.forEach((e) => { const bb = e.getBoundingClientRect(); if (bb.bottom > worst) { worst = bb.bottom; name = sel; } if (bb.top < -1) { worst = 1e6; name = sel + ' (above the window)'; } });
        }
        return { over: Math.round(worst - window.innerHeight), name };
      }, [sels, top]);
      checked++;
      if (r.missing) { bad++; out.push(v.name + ' ' + what + ': ' + r.missing + ' not found'); }
      else if (r.over > 0) { bad++; out.push(v.name + ' ' + what + ': ' + r.name + ' is ' + r.over + ' px below the window'); }
      if (shots && together) { require('fs').mkdirSync(shots, { recursive: true }); await page.screenshot({ path: path.join(shots, w + 'x' + hgt + '-' + v.name + '-' + what + '.png') }); }
    }
    for (const v of views) {
      await page.goto('file://' + dir + '/src/index.html?step=' + v.id + v.q);
      await page.waitForTimeout(40);
      if (v.question) {
        for (let k = 1; k < v.question; k++) {
          await page.locator('.quiz .choice').first().click();
          await page.click('.quiz .submit-answer');
          await page.click('.quiz .quiz-next');
        }
      }
      const side = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      checked++;
      if (side > 1) { bad++; out.push(v.name + ': scrolls sideways by ' + side + ' px'); }
      if (!together) continue;
      const bench = '.bench:not(.still)';
      if (v.kind === 'bench' || v.kind === 'set' || v.kind === 'lowest') {
        const parts = [bench + ' .eq', bench + ' .pbox', bench + ' .bench-foot', bench + ' .bench-check'];
        await fits(v, 'start', parts, bench);
        await page.click(bench + ' .bench-check');
        await fits(v, 'miss', parts.concat([bench + ' .fb.show']), bench);
      } else if (v.kind === 'quiz') {
        await fits(v, 'question', ['.quiz .prompt', '.quiz .choice', '.quiz .submit-answer'].concat(await page.locator('.quiz .pbox').count() ? ['.quiz .pbox'] : []), '.quiz .panel');
      } else if (v.kind === 'conserved') {
        await fits(v, 'picture', ['.panel .pbox', '.panel .tile'], '.stage .panel');
      } else if (v.kind === 'change') {
        await fits(v, 'prediction', ['.panel .pbox', '.panel .tile'], '.stage .panel');
      } else if (v.kind === 'count') {
        await fits(v, 'cards', ['.pbox', 'input.coef.wide', '.stage > .btnrow .primary'], '.stage');
      }
    }
    if (errs.length) { bad++; out.push('page errors: ' + errs.join('; ')); }
    console.log(w + 'x' + hgt + ': ' + (out.length ? out.length + ' problem(s)\n  ' + out.join('\n  ') : 'ok'));
    await page.close();
  }
  await b.close();
  console.log(bad ? bad + ' of ' + checked + ' layout checks FAILED' : 'All ' + checked + ' layout checks passed.');
  process.exit(bad ? 1 : 0);
})();

/* tools/layout.js: checks the page fits a school Chromebook. Optional: needs
 * Playwright.
 *
 *   node tools/layout.js                      # the usual window sizes
 *   node tools/layout.js 1366x520,900x600     # just these
 *   SHOTS=dir node tools/layout.js            # also screenshot each checked view
 *
 * What a student works with must be on screen together without zooming. On
 * every rung of a problem (lesson problems, and graded ones of every kind
 * over a few seeds): after scrolling the problem to the top of the window,
 * the reactants, the rung's controls and its Check or Submit answer button
 * must be on screen together with the reference (the activity series or the
 * solubility table) beside them; on the balancing rung, the equation, both
 * particle boxes, the inventory and Check. The drills and the questions
 * must fit with the reference too (so must each prediction), and each
 * animation with its Play button. A finished problem must show its equation,
 * its picture, Play and the way on together.
 * No step may scroll sideways.
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
  /* graded problems: one of each shape, and the one with the longest formulas, over a few seeds */
  const seenShape = {};
  for (const seed of [1, 2, 3, 4, 5]) {
    const list = await page0.evaluate((s) => Gen.set(s).map((p, i) => ({ i: i + 1, shape: p.kind + p.sub + p.reacts, rungs: p.rungs, len: p.l.concat(p.products).join('').length })), seed);
    const long = list.slice().sort((x, y) => y.len - x.len)[0];
    list.forEach((p) => {
      if (seenShape[p.shape] && p !== long) return;
      seenShape[p.shape] = 1;
      p.rungs.forEach((r, k) => views.push({ id: 'set', kind: 'rung', rung: r, q: '&seed=' + seed + '&problem=' + p.i + '&rung=' + (k + 1), name: 'set-' + seed + '-' + p.i + '-' + r }));
      views.push({ id: 'set', kind: 'done', q: '&seed=' + seed + '&problem=' + p.i + '&done', name: 'set-' + seed + '-' + p.i + '-done' });
    });
  }
  await page0.close();

  for (const [w, hgt] of sizes) {
    const page = await b.newPage({ viewport: { width: w, height: hgt } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    const out = [];
    const together = w >= 1280;
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
      const side = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      checked++;
      if (side > 1) { bad++; out.push(v.name + ': scrolls sideways by ' + side + ' px'); }
      if (!together) continue;
      const rung = v.kind === 'ladder' ? await page.evaluate(() => App.ctl().problem.rungs[0]) : v.rung;
      if (v.kind === 'rung' || v.kind === 'ladder') {
        if (rung === 'balance') {
          const bench = '.ladder .bench';
          await fits(v, 'start', [bench + ' .eq', bench + ' .pbox', bench + ' .inv', bench + ' .bench-check'], bench);
          await page.click(bench + ' .bench-check');
          /* an equation that was already balanced is finished by that Check: nothing more to fit */
          if (await page.locator(bench).count()) await fits(v, 'checked', [bench + ' .eq', bench + ' .pbox', bench + ' .inv'], bench);
        } else {
          const ctl = rung === 'react' ? ['.ladder .choice', '.ladder .submit-answer'] : rung === 'products' ? ['.ladder .builder', '.ladder .rung-check'] : ['.ladder .state-btn', '.ladder .rung-check'];
          await fits(v, 'start', ['.ladder .given', '.ladder .rungs'].concat(ctl, ['.ref .ref-body']), '.ladder');
          /* an unfinished Check brings its message: it must fit too */
          if (rung !== 'react') { await page.click('.ladder .rung-check'); await fits(v, 'message', ctl.concat(['.ladder .fb.show', '.ref .ref-body']), '.ladder'); }
        }
      } else if (v.kind === 'done') {
        /* a finished problem: its equation, its picture, Play and the way on, together */
        await fits(v, 'picture', ['.ladder .final-eq', '.ladder .scene-svg', '.ladder .scene-play', '.ladder .ladder-next'], '.ladder .final-eq');
        await page.click('.ladder .scene-play');
        await fits(v, 'played', ['.ladder .scene-svg', '.ladder .scene-play', '.ladder .scene-cap', '.ladder .ladder-next'], '.ladder .final-eq');
      } else if (v.kind === 'willit' || v.kind === 'sol') {
        await fits(v, 'card', ['.panel .pic-eq', '.panel .tile', '.ref .ref-body'], '.ladder');
      } else if (v.kind === 'quiz') {
        for (let k = 0; k < 4; k++) {
          await fits(v, 'question-' + (k + 1), ['.quiz .prompt', '.quiz .choice', '.quiz .submit-answer', '.ref .ref-body'], '.ladder');
          await page.locator('.quiz .choice').first().click();
          await page.click('.quiz .submit-answer');
          if (k < 3) await page.click('.quiz .quiz-next');
        }
      } else if (v.kind === 'plate' || v.kind === 'mix') {
        await fits(v, 'prediction', ['.panel .prompt', '.panel .tile', '.ref .ref-body'], '.ladder');
        await page.locator('.tiles .tile').first().click();
        await fits(v, 'animations', ['.scene-svg', '.scene-play'], '.grid2');
        await page.locator('.scene-play').first().click();
        await fits(v, 'played', ['.scene-svg', '.scene-play', '.scene-cap'], '.grid2');
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

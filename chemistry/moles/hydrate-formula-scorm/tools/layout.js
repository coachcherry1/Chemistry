/* tools/layout.js: checks the page fits a school Chromebook. Optional:
 * needs Playwright.
 *
 *   node tools/layout.js                      # the usual window sizes
 *   node tools/layout.js 1366x520,900x600     # just these
 *   SHOTS=dir node tools/layout.js            # also screenshot each checked view
 *
 * In every problem (the worked example, the warm-ups and the graded ones
 * with the most rows and a Step 5), at every step: after scrolling the
 * problem to the top of the window, the problem, the step strip, the whole
 * table, the step's Check (or Show step) button and, from 1240 px wide, the
 * fraction finder beside it must all be on screen. In the drills and the
 * opening scenes, both panels (the card and the finder, the scene and its
 * questions) must be. With the periodic table open, the table's molar mass
 * boxes must sit above it. No step may scroll sideways.
 *
 * 1366x650 is a Chromebook's browser tab; 1366x520 and 1280x560 allow for the
 * LMS's own header around the frame.
 */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
  catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); }
}
const fs = require('fs');
const dir = path.join(__dirname, '..');
const sizes = (process.argv[2] || '1366x650,1366x520,1280x560,1100x600,900x600,1536x750,1920x950')
  .split(',').map((s) => s.split('x').map(Number));
const shots = process.env.SHOTS;

(async () => {
  const b = await chromium.launch();
  let bad = 0, checked = 0;
  const views = [];
  const page0 = await b.newPage();
  await page0.goto('file://' + dir + '/src/index.html?step=1');
  const steps = await page0.evaluate(() => App.STEPS.map((s) => ({ id: s.id, kind: s.kind })));
  /* the graded problems with the most rows and the most steps, over a few seeds */
  for (const seed of [1, 2, 3]) {
    const list = await page0.evaluate((s) => Gen.set(s).map((p, i) => ({ i: i + 1, rows: p.rows.length, steps: p.steps.length, kind: p.kind })), seed);
    const pick = list.slice().sort((x, y) => (y.rows - x.rows) || (y.steps - x.steps)).slice(0, 2);
    pick.forEach((p) => views.push({ id: 'set', q: '&seed=' + seed + '&problem=' + p.i, name: 'set-' + seed + '-' + p.i, steps: p.steps, work: true }));
  }
  steps.filter((s) => s.kind !== 'set' && s.kind !== 'results').forEach((s) => {
    views.push({ id: s.id, q: '&seed=1', name: s.id, kind: s.kind, work: s.kind === 'warm' || s.kind === 'example', steps: 5 });
  });
  views.push({ id: 'results', q: '&seed=1', name: 'results', kind: 'results' });
  await page0.close();

  for (const [w, hgt] of sizes) {
    const page = await b.newPage({ viewport: { width: w, height: hgt } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    const out = [];
    for (const v of views) {
      await page.goto('file://' + dir + '/src/index.html?step=' + v.id + v.q);
      await page.waitForTimeout(40);
      const nSteps = v.work ? await page.evaluate(() => (App.ctl() ? App.ctl().work : null) && document.querySelectorAll('.steps4 .st').length) : 0;
      const runs = v.work ? nSteps + 1 : 1;
      for (let k = 0; k < runs; k++) {
        if (v.work && k > 0) {
          /* fill the step in, then move on to the next */
          await page.evaluate((demo) => {
            const c = App.ctl();
            if (demo) { const btn = document.querySelector('.step-panel .primary'); if (btn) btn.click(); return; }
            c.fillStep(); c.check();
          }, v.kind === 'example');
          await page.waitForTimeout(20);
        }
        if (v.work && k < runs - 1 && v.kind !== 'example') await page.evaluate(() => App.ctl().fillCurrent());
        const r = await page.evaluate(({ work, kind, wide }) => {
          const H = innerHeight, W = innerWidth;
          const fails = [];
          const visible = (els, what) => {
            els = els.filter(Boolean);
            if (!els.length) { fails.push(what + ': missing'); return; }
            els.forEach((el) => {
              const r = el.getBoundingClientRect();
              if (r.top < -1 || r.bottom > H + 1 || r.left < -1 || r.right > W + 1) {
                fails.push(what + ': ' + (el.className && el.className.baseVal != null ? el.className.baseVal : el.className) +
                  ' at ' + Math.round(r.top) + '..' + Math.round(r.bottom) + ' of ' + H);
              }
            });
          };
          if (document.documentElement.scrollWidth > W + 1) fails.push('page scrolls sideways (' + document.documentElement.scrollWidth + ' > ' + W + ')');
          if (work) {
            const first = document.querySelector('.pstrip') || document.querySelector('.work-main');
            first.scrollIntoView({ block: 'start' });
            const tw = document.querySelector('.table-wrap');
            if (tw && tw.scrollWidth > tw.clientWidth + 1) fails.push('the table scrolls sideways (' + tw.scrollWidth + ' > ' + tw.clientWidth + ')');
            const btn = document.querySelector('.step-panel .primary');
            visible([document.querySelector('.pstrip'), document.querySelector('.prob-head'), document.querySelector('.steps4'),
              document.querySelector('table.four'), document.querySelector('.extra .molbox'), document.querySelector('.extra .namebox'), btn].filter((x) => x !== null),
              'the problem, its table and its button');
            if (wide) visible([document.querySelector('.work-side .finder')], 'the fraction finder');
            return { fails };
          }
          if (kind === 'results') return { fails };
          const grid = document.querySelector('.stage .grid2');
          if (grid) {
            grid.scrollIntoView({ block: 'start' });
            const panels = [...grid.children];
            panels.forEach((p) => {
              const r = p.getBoundingClientRect();
              /* a panel taller than the window must at least start on screen and fill it */
              if (r.top < -1 || (r.bottom > H + 1 && r.height < H)) fails.push(kind + ': a panel at ' + Math.round(r.top) + '..' + Math.round(r.bottom) + ' of ' + H);
            });
            const keys = [...grid.querySelectorAll('.finder, .scene, .bigq, .wcards, table.ratio, .tiles, .primary')];
            visible(keys.filter((x) => x.getBoundingClientRect().height > 0).slice(0, 12), kind);
          }
          return { fails };
        }, { work: !!v.work, kind: v.kind, wide: w >= 1240 });
        if (v.work && w >= 1000 && k === 1 && v.kind !== 'example') {
          /* the periodic table open at Step 2: the molar mass boxes stay above it */
          await page.click('#ptTop');
          await page.waitForTimeout(30);
          const t = await page.evaluate(() => {
            const panel = document.querySelector('.pt-panel').getBoundingClientRect();
            const f = [];
            [...document.querySelectorAll('input.blank.w-mm')].forEach((x) => {
              const r = x.getBoundingClientRect();
              if (r.bottom > panel.top || r.top < 0) f.push('table open: a molar mass box is hidden');
            });
            if (panel.top < 0) f.push('table open: the table is taller than the window');
            return f;
          });
          r.fails.push(...t);
          await page.keyboard.press('Escape');
        }
        checked++;
        if (shots) {
          fs.mkdirSync(shots, { recursive: true });
          await page.screenshot({ path: path.join(shots, w + 'x' + hgt + '-' + v.name + (v.work ? '-s' + k : '') + '.png') });
        }
        if (r.fails.length) out.push(v.name + (v.work ? ' at step ' + k : '') + ': ' + r.fails.join('; '));
      }
    }
    if (errs.length) out.push('page errors: ' + errs.join('; '));
    console.log((out.length ? 'FAIL ' : 'ok   ') + w + 'x' + hgt + (out.length ? '\n  ' + out.slice(0, 12).join('\n  ') + (out.length > 12 ? '\n  ...' : '') : ''));
    bad += out.length;
    await page.close();
  }
  await b.close();
  console.log(bad ? 'layout: ' + bad + ' problem(s)' : 'layout: ok (' + checked + ' views)');
  process.exit(bad ? 1 : 0);
})();

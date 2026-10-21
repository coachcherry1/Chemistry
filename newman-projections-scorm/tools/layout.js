/* tools/layout.js: checks the page fits a school Chromebook. Optional:
 * needs Playwright.
 *
 *   node tools/layout.js                      # the usual window sizes
 *   node tools/layout.js 1366x520,900x600     # just these
 *   SHOTS=dir node tools/layout.js            # also screenshot each turning step
 *
 * Every step is opened at each window size (answering any prediction). On a
 * step where a molecule turns, the page is scrolled to the turnable Newman
 * projection, and its slider and the whole energy graph must then be on
 * screen together: students should never have to zoom out or scroll to watch
 * the curve while they turn. No step may scroll sideways.
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
const dir = path.join(__dirname, '..');
const sizes = (process.argv[2] || '1366x650,1366x520,1280x560,1100x600,900x600,1536x750,1920x950')
  .split(',').map((s) => s.split('x').map(Number));
const shots = process.env.SHOTS;
(async () => {
  const b = await chromium.launch();
  const page0 = await b.newPage();
  await page0.goto('file://' + dir + '/src/index.html?step=1');
  const ids = await page0.evaluate(() => App.STEPS.map((s) => s.id + ':' + s.kind));
  await page0.close();
  let bad = 0;
  for (const [w, hgt] of sizes) {
    const page = await b.newPage({ viewport: { width: w, height: hgt } });
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    const out = [];
    for (const idk of ids) {
      const [id, kind] = idk.split(':');
      await page.goto('file://' + dir + '/src/index.html?step=' + id);
      await page.waitForTimeout(120);
      if (kind === 'find') await page.click('.predict .choice');
      if (kind === 'pair') {
        await (await page.$$('.predict .choice'))[0].click();
        await (await page.$$('.predict .choice:not([disabled])'))[0].click();
      }
      await page.waitForTimeout(kind === 'find' || kind === 'pair' ? 700 : 100);
      const r = await page.evaluate(async () => {
        const res = { side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
        const graphSvg = document.querySelector('svg.graph');
        const turners = [...document.querySelectorAll('svg.rotor')].map((x) => x.closest('.panel'));
        if (!graphSvg || !turners.length) return res;
        res.fit = turners.map((t) => {
          /* scroll as a student would: the turnable panel's top just on screen */
          const top = t.getBoundingClientRect().top + scrollY;
          window.scrollTo(0, Math.max(0, top - 6));
          const slider = t.querySelector('.rotor-range').getBoundingClientRect();
          const svg = t.querySelector('svg.rotor').getBoundingClientRect();
          const g = graphSvg.getBoundingClientRect();
          const ok = (x) => x.top >= -1 && x.bottom <= innerHeight + 1;
          return ok(slider) && ok(svg) && ok(g) ? 'ok' : `projection ${Math.round(svg.top)}-${Math.round(svg.bottom)}, ` +
            `slider at ${Math.round(slider.bottom)}, graph ${Math.round(g.top)}-${Math.round(g.bottom)}, window ${innerHeight} tall`;
        });
        window.scrollTo(0, 0);
        return res;
      });
      const probs = [];
      if (r.side) probs.push('scrolls sideways');
      if (r.fit) r.fit.forEach((f, i) => { if (f !== 'ok') probs.push('molecule ' + (i + 1) + ' and graph not on screen together: ' + f); });
      if (probs.length) { bad++; out.push(`  ${id}: ${probs.join('; ')}`); }
      if (shots && r.fit) {
        const t = await page.$('svg.rotor');
        await page.evaluate((y) => window.scrollTo(0, y), await t.evaluate((n) => Math.max(0, n.closest('.panel').getBoundingClientRect().top + scrollY - 6)));
        require('fs').mkdirSync(shots, { recursive: true });
        await page.screenshot({ path: path.join(shots, `${w}x${hgt}-${id}.png`) });
      }
    }
    bad += errs.length;
    console.log(`${w}x${hgt}: ${out.length ? '\n' + out.join('\n') : 'all steps fine'}${errs.length ? '\n  errors: ' + errs.join('; ') : ''}`);
    await page.close();
  }
  await b.close();
  console.log(bad ? bad + ' problem(s).' : 'Layout passed.');
  process.exit(bad ? 1 : 0);
})();

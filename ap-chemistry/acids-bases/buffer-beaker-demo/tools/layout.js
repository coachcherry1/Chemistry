/* tools/layout.js: checks the demo fits a smartboard and a classroom laptop. Optional: needs Playwright.
 *
 *   node tools/layout.js                    # the usual window sizes
 *   node tools/layout.js 1366x768,1920x1080 # just these
 *   SHOTS=dir node tools/layout.js          # also screenshot each size
 *
 * At every size the page must not scroll sideways. At 1366x768 and larger (a Chromebook
 * and the usual smartboards) EVERYTHING must be on screen at once without scrolling: the
 * beaker, the reaction line, both sliders, the four drop buttons, the pH meter, and the
 * tabs with the open chart, in both tabs (and with the equation open on 1600x900 and up;
 * on a laptop the right column scrolls when the equation is open). A shorter window
 * (1366x650) may scroll the right-hand column, which must still reach the chart.
 */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
  catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); }
}
const dir = path.join(__dirname, '..');
const sizes = (process.argv[2] || '1280x720,1366x768,1600x900,1920x1080,1366x650,1024x768')
  .split(',').map((s) => s.split('x').map(Number));
const shots = process.env.SHOTS;
const MUST_FIT = (w, h) => w >= 1280 && h >= 720;

(async () => {
  const b = await chromium.launch();
  let bad = 0;
  for (const [w, h] of sizes) {
    const page = await b.newPage({ viewport: { width: w, height: h } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto('file://' + dir + '/src/index.html');
    await page.waitForSelector('.beaker-svg');
    const out = [];
    async function measure(label) {
      await page.waitForTimeout(150);
      const r = await page.evaluate(() => {
        const vis = (n) => n && n.getBoundingClientRect().height > 0;
        const q = (sel) => [...document.querySelectorAll(sel)].filter(vis);
        const groups = {
          'beaker': [q('.beaker-svg')[0]], 'reaction line': [q('.reaction')[0]], 'sliders': q('.sl'),
          'drop buttons': q('.drop-btn'), 'pH meter': [q('.ph-big')[0], q('.phbar')[0], q('.ph-sub')[0]],
          'tabs': q('.tab'), 'chart': [q('.g-svg')[0], q('.bars')[0]].filter(Boolean)
        };
        const res = { side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, off: [] };
        Object.keys(groups).forEach((k) => groups[k].filter(Boolean).forEach((e) => {
          const r = e.getBoundingClientRect();
          if (r.top < -1 || r.bottom > innerHeight + 1 || r.left < -1 || r.right > innerWidth + 1) res.off.push(k + ' (' + Math.round(r.top) + '-' + Math.round(r.bottom) + ')');
        }));
        res.pageScroll = document.documentElement.scrollHeight > innerHeight + 1;
        return res;
      });
      const probs = [];
      if (r.side) probs.push('scrolls sideways');
      if (MUST_FIT(w, h) && r.off.length) probs.push('not on screen: ' + [...new Set(r.off)].join(', '));
      if (MUST_FIT(w, h) && r.pageScroll) probs.push('the page scrolls');
      if (probs.length) { bad++; out.push(`  ${label}: ${probs.join('; ')}`); }
    }
    await measure('start');
    await page.click('.drop-btn[data-dir="acid"][data-n="5"]');
    await measure('after 5 HCl');
    await page.click('.tab[data-tab="strength"]');
    await measure('strength chart');
    if (w >= 1600) {            /* the equation box needs the room of a larger screen; on a laptop the right column scrolls */
      await page.check('#showEq');
      await measure('strength chart with the equation open');
      await page.click('.tab[data-tab="graph"]');
      await measure('graph with the equation open');
    } else {
      await page.click('.tab[data-tab="graph"]');
      await measure('graph');
    }
    if (shots) { require('fs').mkdirSync(shots, { recursive: true }); await page.screenshot({ path: path.join(shots, `${w}x${h}.png`) }); }
    bad += errs.length;
    console.log(`${w}x${h}: ${out.length ? '\n' + out.join('\n') : 'fine'}${errs.length ? '\n  errors: ' + errs.join('; ') : ''}`);
    await page.close();
  }
  await b.close();
  console.log(bad ? bad + ' problem(s).' : 'Layout passed.');
  process.exit(bad ? 1 : 0);
})();

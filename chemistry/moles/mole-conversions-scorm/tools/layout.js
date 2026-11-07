/* tools/layout.js: checks the page fits a school Chromebook. Optional:
 * needs Playwright.
 *
 *   node tools/layout.js                      # the usual window sizes
 *   node tools/layout.js 1366x520,900x600     # just these
 *   SHOTS=dir node tools/layout.js            # also screenshot each checked view
 *
 * Every step is opened at each window size. In a problem, the whole solution
 * is placed first (the longest chain a student builds), then the problem
 * strip, the chain, every equality, the answer box and the Check button must
 * be on screen at once after scrolling the problem to the top of the window;
 * with the periodic table open, the chain (and its blanks) must sit above
 * the table. On the mole map step the whole map must be on screen. No step may
 * scroll sideways.
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

/* which problems of a set to look at: every 3-step one has the longest chain */
const SEEDS = [1, 2, 3];

(async () => {
  const b = await chromium.launch();
  let bad = 0, checked = 0;
  const views = [];
  const page0 = await b.newPage();
  await page0.goto('file://' + dir + '/src/index.html?step=1');
  const steps = await page0.evaluate(() => App.STEPS.map((s) => ({ id: s.id, kind: s.kind })));
  for (const seed of SEEDS) {
    const list = await page0.evaluate((s) => Gen.set(s).map((p, i) => ({ i: i + 1, steps: p.steps, n: p.pool.length })), seed);
    /* the longest chain and the biggest pool of each set */
    const pick = list.filter((p) => p.steps >= 3).sort((x, y) => y.steps - x.steps || y.n - x.n).slice(0, 3).concat(list.filter((p) => p.steps === 1).slice(0, 1));
    pick.forEach((p) => views.push({ id: 'set', q: '&seed=' + seed + '&problem=' + p.i, name: 'set seed ' + seed + ' problem ' + p.i }));
  }
  steps.filter((s) => s.kind !== 'set').forEach((s) => views.push({ id: s.id, q: '&seed=1', name: s.id }));
  await page0.close();

  for (const [w, hgt] of sizes) {
    const page = await b.newPage({ viewport: { width: w, height: hgt } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    const out = [];
    for (const v of views) {
      await page.goto('file://' + dir + '/src/index.html?step=' + v.id + v.q);
      await page.waitForTimeout(60);
      const kind = await page.evaluate(() => App.STEPS[App.state().step].kind);
      if (kind === 'warm' || kind === 'set') await page.evaluate(() => App.ctl().fillSolution());
      const r = await page.evaluate((kind) => {
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
        if (kind === 'warm' || kind === 'set') {
          const first = document.querySelector('.pstrip') || document.querySelector('.work-main');
          first.scrollIntoView({ block: 'start' });
          const main = document.querySelector('.work-main');
          visible([document.querySelector('.pstrip'), document.querySelector('.prompt'), document.querySelector('.chain-scroll'),
            ...document.querySelectorAll('.chip'), document.querySelector('input.ans'), document.querySelector('.work .primary')]
            .filter((x) => x !== null), 'the problem, its chain, every equality and the answer');
          const chain = document.querySelector('.chain');
          const scrollBox = document.querySelector('.chain-scroll');
          if (chain.scrollWidth > scrollBox.clientWidth + 1) fails.push('the chain scrolls sideways (' + chain.scrollWidth + ' > ' + scrollBox.clientWidth + ')');
          return { fails, main: !!main };
        }
        if (kind === 'map') {
          document.querySelector('.molemap').scrollIntoView({ block: 'start' });
          visible([document.querySelector('.molemap')], 'the map');
        }
        return { fails };
      }, kind);
      if ((kind === 'warm' || kind === 'set') && w >= 1000) {
        /* the periodic table open: the chain and its blanks above it */
        await page.click('.pt-open-btn');
        await page.waitForTimeout(40);
        const t = await page.evaluate(() => {
          const panel = document.querySelector('.pt-panel').getBoundingClientRect();
          const chain = document.querySelector('.chain-scroll').getBoundingClientRect();
          const blanks = [...document.querySelectorAll('input.blank')].map((x) => x.getBoundingClientRect());
          const f = [];
          if (chain.bottom > panel.top + 1 || chain.top < -1) f.push('table open: the chain at ' + Math.round(chain.top) + '..' + Math.round(chain.bottom) + ', table from ' + Math.round(panel.top));
          blanks.forEach((r) => { if (r.bottom > panel.top || r.top < 0) f.push('table open: a blank is hidden'); });
          if (panel.top < 0) f.push('table open: the table is taller than the window');
          return f;
        });
        r.fails.push(...t);
        if (shots) {
          fs.mkdirSync(shots, { recursive: true });
          await page.screenshot({ path: path.join(shots, w + 'x' + hgt + '-' + v.name.replace(/\W+/g, '-') + '-table.png') });
        }
        await page.keyboard.press('Escape');
      }
      checked++;
      if (shots) {
        fs.mkdirSync(shots, { recursive: true });
        await page.screenshot({ path: path.join(shots, w + 'x' + hgt + '-' + v.name.replace(/\W+/g, '-') + '.png') });
      }
      if (r.fails.length) out.push(v.name + ': ' + r.fails.join('; '));
    }
    if (errs.length) out.push('page errors: ' + errs.join('; '));
    console.log((out.length ? 'FAIL ' : 'ok   ') + w + 'x' + hgt + (out.length ? '\n  ' + out.join('\n  ') : ''));
    bad += out.length;
    await page.close();
  }
  await b.close();
  console.log(bad ? 'layout: ' + bad + ' problem(s)' : 'layout: ok (' + checked + ' views)');
  process.exit(bad ? 1 : 0);
})();

/* tools/layout.js: checks the page fits a school Chromebook. Optional:
 * needs Playwright.
 *
 *   node tools/layout.js                      # the usual window sizes
 *   node tools/layout.js 1366x520,900x600     # just these
 *   SHOTS=dir node tools/layout.js            # also screenshot each checked view
 *
 * Every step is opened at each window size, answering every prediction. Then
 * whatever a student works with must be on screen at once, after scrolling
 * the first of it to the top of the window:
 *   - each 3D model, its turn buttons, the drawing beside it and the rule and
 *     R/S buttons under that drawing;
 *   - each tray of tiles or words and the drawing or table it fills;
 *   - each drawing whose atoms or carbons are clicked;
 *   - the mirror-plane slider, its 3D model and its Newman projection.
 * Students should never have to zoom out or scroll while they work. No step
 * may scroll sideways.
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

/* Runs in the page: the groups of elements that must be on screen together. */
function groups() {
  const vis = (n) => n && n.getBoundingClientRect().height > 0;
  const out = [];
  document.querySelectorAll('canvas.c3d').forEach((c, i) => {
    if (!vis(c)) return;
    const row = c.closest('.work') || c.closest('.panel');
    const els = [c];
    const own = c.closest('.panel');
    const bar = own && own.querySelector('.turnbar');
    if (bar && vis(bar)) els.push(bar);
    if (own) own.querySelectorAll('.btnrow').forEach(b => { if (vis(b)) els.push(b); });
    if (row) {
      const draw = [...row.querySelectorAll('svg.mol, svg.newman')].filter(vis)[0];
      if (draw) els.push(draw);
      const rule = row.querySelector('.rule');
      if (rule && vis(rule)) els.push(rule);
      const rs = row.querySelector('.rs-row');
      if (rs && vis(rs)) els.push(rs);
      const range = row.querySelector('.turn-range');
      if (range && vis(range)) els.push(range);
    }
    out.push({ name: '3D model ' + (i + 1) + ' and its drawing', els });
  });
  document.querySelectorAll('.tray').forEach((t, i) => {
    if (!vis(t) || t.classList.contains('locked')) return;
    const box = t.closest('.panel');
    const target = box && ([...box.querySelectorAll('svg')].find((s) => s.querySelector('.drop')) ||
      [...box.querySelectorAll('.rel-table, .cards')].find(vis));
    if (target) out.push({ name: 'tray ' + (i + 1), els: [t, target] });
  });
  document.querySelectorAll('svg .drop').forEach((p) => {
    const s = p.closest('svg');
    if (vis(s) && !out.some((g) => g.els.includes(s))) out.push({ name: 'clickable drawing', els: [s] });
  });
  const coach = document.querySelector('.meso-coach');
  if (coach) out.push({ name: 'guided meso comparison and controls', els: [coach] });
  return out;
}

(async () => {
  const b = await chromium.launch();
  const page0 = await b.newPage();
  await page0.goto('file://' + dir + '/src/index.html?step=1');
  const ids = await page0.evaluate(() => App.STEPS.map((s) => s.id));
  await page0.close();
  let bad = 0;
  for (const [w, hgt] of sizes) {
    const page = await b.newPage({ viewport: { width: w, height: hgt } });
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    const out = [];
    for (const id of ids) {
      await page.goto('file://' + dir + '/src/index.html?step=' + id);
      await page.waitForTimeout(120);
      for (let n = 0; n < 8; n++) {
        const c = await page.$('.predict .choice:not([disabled])');
        if (!c) break;
        await c.click();
        await page.waitForTimeout(80);
      }
      await page.waitForTimeout(500);
      const r = await page.evaluate((src) => {
        const res = { side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, fit: [] };
        const gs = (0, eval)('(' + src + ')')();
        gs.forEach((g) => {
          const top = Math.min(...g.els.map((e) => e.getBoundingClientRect().top + scrollY));
          window.scrollTo(0, Math.max(0, top - 6));
          const rs = g.els.map((e) => e.getBoundingClientRect());
          const ok = rs.every((x) => x.top >= -1 && x.bottom <= innerHeight + 1);
          res.fit.push({ name: g.name, y: scrollY, ok, rs: rs.map((x) => Math.round(x.top) + '-' + Math.round(x.bottom)).join(' '),
            span: Math.round(Math.max(...rs.map((x) => x.bottom)) - Math.min(...rs.map((x) => x.top))) });
        });
        window.scrollTo(0, 0);
        return res;
      }, groups.toString());
      const probs = [];
      if (r.side) probs.push('scrolls sideways');
      r.fit.forEach((f) => { if (!f.ok) probs.push(`${f.name} needs ${f.span}px, window ${hgt} (${f.rs})`); });
      if (probs.length) { bad++; out.push(`  ${id}: ${probs.join('; ')}`); }
      if (shots && r.fit.length) {
        require('fs').mkdirSync(shots, { recursive: true });
        for (let i = 0; i < r.fit.length; i++) {
          await page.evaluate((y) => window.scrollTo(0, y), r.fit[i].y);
          await page.screenshot({ path: path.join(shots, `${w}x${hgt}-${id}-${i + 1}.png`) });
        }
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

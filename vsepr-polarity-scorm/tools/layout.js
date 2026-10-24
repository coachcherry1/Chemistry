/* tools/layout.js: checks the page fits a school Chromebook. Optional:
 * needs Playwright.
 *
 *   node tools/layout.js                      # the usual window sizes
 *   node tools/layout.js 1366x520,900x600     # just these
 *   SHOTS=dir node tools/layout.js            # also screenshot each checked view
 *
 * Every step is opened at each window size, answering every prediction; a
 * build is taken to Rule 2, where atoms are dragged onto the drawing. Then
 * whatever a student works with must be on screen at once, after scrolling
 * the first of it to the top of the window:
 *   - each Lewis drawing and the 3D window beside it;
 *   - each tray of atoms, names or structures and the targets they go on;
 *   - the field test, its switch and the prediction.
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
  const v3d = [...document.querySelectorAll('canvas.v3d')].filter(vis)[0];
  const lewis = [...document.querySelectorAll('.lewis-host svg.lewis, .work .canvas svg.lewis')].filter(vis)[0];
  if (v3d && lewis) out.push({ name: 'Lewis drawing and 3D window', els: [lewis, v3d] });
  document.querySelectorAll('.tray').forEach((t, i) => {
    if (!vis(t)) return;
    const box = t.closest('.panel, .work');
    const drops = box ? [...box.querySelectorAll('.drop')].filter(vis) : [];
    if (drops.length) out.push({ name: 'tray ' + (i + 1) + ' and its targets', els: [t, drops[0], drops[drops.length - 1]] });
  });
  const field = [...document.querySelectorAll('canvas.field-canvas')].filter(vis)[0];
  if (field) out.push({ name: 'field test and its switch', els: [field, document.querySelector('.pfield .primary')] });
  const reveal = [...document.querySelectorAll('.row-squeeze .reveal, .row-flat .reveal')].filter(vis).pop();
  if (reveal && v3d) out.push({ name: 'answer and the 3D window', els: [v3d, reveal], nearest: reveal });
  return out;
}

(async () => {
  const b = await chromium.launch();
  const page0 = await b.newPage();
  await page0.goto('file://' + dir + '/src/index.html?step=1');
  const steps = await page0.evaluate(() => App.STEPS.map((s) => ({ id: s.id, kind: s.kind, sp: s.sp })));
  await page0.close();
  let bad = 0;
  for (const [w, hgt] of sizes) {
    const page = await b.newPage({ viewport: { width: w, height: hgt } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    const out = [];
    for (const st of steps) {
      await page.goto('file://' + dir + '/src/index.html?step=' + st.id);
      await page.waitForTimeout(120);
      if (st.kind === 'build') {
        /* to Rule 2: the tray and the drop spots */
        const total = await page.evaluate((id) => Lewis.solve(Lewis.species(id)).total, st.sp);
        await page.fill('.rule-form input >> nth=-1', String(total));
        await page.click('.work button:has-text("Check")');
      }
      for (let n = 0; n < 8; n++) {
        const c = await page.$('.predict .choice:not([disabled])');
        if (!c) break;
        await c.click();
        await page.waitForTimeout(80);
      }
      await page.waitForTimeout(400);
      const r = await page.evaluate((src) => {
        const res = { side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, fit: [] };
        const gs = (0, eval)('(' + src + ')')();
        gs.forEach((g) => {
          const els = g.els.filter(Boolean);
          const top = Math.min(...els.map((e) => e.getBoundingClientRect().top + scrollY));
          window.scrollTo(0, Math.max(0, top - 6));
          if (g.nearest) { window.scrollTo(0, 0); g.nearest.scrollIntoView({ block: 'nearest' }); }
          const rs = els.map((e) => e.getBoundingClientRect());
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
      if (probs.length) { bad++; out.push(`  ${st.id}: ${probs.join('; ')}`); }
      if (shots && r.fit.length) {
        require('fs').mkdirSync(shots, { recursive: true });
        for (let i = 0; i < r.fit.length; i++) {
          await page.evaluate((y) => window.scrollTo(0, y), r.fit[i].y);
          await page.screenshot({ path: path.join(shots, `${w}x${hgt}-${st.id}-${i + 1}.png`) });
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

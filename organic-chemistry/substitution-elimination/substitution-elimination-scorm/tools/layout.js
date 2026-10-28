/* tools/layout.js: checks the page fits a school Chromebook. Optional:
 * needs Playwright.
 *
 *   node tools/layout.js                      # the usual window sizes
 *   node tools/layout.js 1366x520,900x600     # just these
 *   SHOTS=dir node tools/layout.js            # also screenshot each checked view
 *
 * Every step is opened at each window size and taken to where the student
 * works (predictions made). Then whatever a student works with must be on
 * screen at once, after scrolling the first of it to the top of the window:
 *   - a mechanism and its Check button;
 *   - a 3D model, its slider and the energy diagram it moves;
 *   - a Newman projection, its turn buttons, the 3D model and Eliminate;
 *   - a chair drawing, its flip slider and its Newman projection;
 *   - the bins and the tray of a sort; Klein's table and its results.
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

function groups() {
  const vis = (n) => n && n.getBoundingClientRect().height > 0;
  const first = (sel) => [...document.querySelectorAll(sel)].filter(vis)[0];
  const out = [];
  const tool = first('.arrow-tool');
  if (tool) out.push({ name: 'mechanism and Check', els: [tool.querySelector('svg'), tool.querySelector('.arrow-tools') || tool.querySelector('svg')] });
  const nh = first('.newman-host');
  if (nh) {
    const turn = first('.turnbar');
    const go = [...document.querySelectorAll('button')].filter((b) => vis(b) && /^Eliminate$/.test(b.textContent))[0];
    out.push({ name: 'Newman, turns, 3D and Eliminate', els: [nh, turn, first('.c3d-wrap'), go].filter(Boolean) });
  } else if (first('.chair-host')) {
    out.push({ name: 'chair, flip slider and Newman', els: [first('.chair-host'), first('.prog-range'), first('.fig-card .newman')].filter(Boolean) });
  } else if (first('.c3d-wrap') && first('.prog-range')) {
    out.push({ name: '3D, slider and energy', els: [first('.c3d-wrap'), first('.prog-range'), first('.energy')].filter(Boolean) });
  }
  const bins = first('.bins');
  if (bins) out.push({ name: 'bins and tray', els: [bins, first('.tray')] });
  const t = first('.dtable');
  if (t) out.push({ name: 'table and results', els: [t, first('.tray')] });
  return out;
}

(async () => {
  const b = await chromium.launch();
  const page0 = await b.newPage();
  await page0.goto('file://' + dir + '/src/index.html?step=1');
  const steps = await page0.evaluate(() => App.STEPS.map((s) => ({ id: s.id, kind: s.kind })));
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
      for (let n = 0; n < 3; n++) {
        const c = await page.$('.predict .choice:not([disabled])');
        if (!c) break;
        await c.click();
        await page.waitForTimeout(60);
      }
      await page.waitForTimeout(200);
      const r = await page.evaluate((src) => {
        const res = { side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, fit: [] };
        const gs = (0, eval)('(' + src + ')')();
        gs.forEach((g) => {
          const els = g.els.filter(Boolean);
          const top = Math.min(...els.map((e) => e.getBoundingClientRect().top + scrollY));
          window.scrollTo(0, Math.max(0, top - 6));
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

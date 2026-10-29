/* tools/layout.js: checks the page fits a school Chromebook. Optional:
 * needs Playwright.
 *
 *   node tools/layout.js                      # the usual window sizes
 *   node tools/layout.js 1366x520,900x600     # just these
 *   SHOTS=dir node tools/layout.js            # also screenshot each checked view
 *
 * Every step is opened at each window size and taken to where the student
 * works (predictions made, the first arrows drawn so their animation shows). Then whatever a student works with must be on
 * screen at once, after scrolling the first of it to the top of the window:
 *   - every arrow drawing and its Check button (a graded one too);
 *   - every animation, its slider and the energy diagram it moves;
 *   - the H–Cl bond, its slider and the energy curve; the flasks and theirs;
 *   - the energy bars, their slider and the exo- or endothermic question;
 *   - the reactants and products whose bonds are clicked;
 *   - a sentence and its word tiles; a clickable drawing and its checklist.
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
  const all = (sel) => [...document.querySelectorAll(sel)].filter(vis);
  const first = (sel) => all(sel)[0];
  const out = [];
  /* every arrow drawing and its Check button */
  all('.arrow-tool').forEach((tool, i) => {
    const tools = tool.querySelector('.arrow-tools');
    out.push({ name: 'mechanism ' + (i + 1) + ' and Check', els: [tool.querySelector('svg'), vis(tools) ? tools : null] });
  });
  /* every animation and the slider that moves it, and the energy diagram beside it */
  all('.mol-wrap.anim').forEach((m, i) => {
    const box = m.closest('.player-box') || m.closest('.panel');
    const range = box.querySelector('.range-row') || (m.closest('.panel') && m.closest('.panel').querySelector('.range-row'));
    const panel = m.closest('.panel');
    const graph = panel && panel.querySelector('.graph-host .energy');
    out.push({ name: 'animation ' + (i + 1) + ', slider' + (graph ? ' and energy diagram' : ''), els: [m, range, graph].filter(Boolean) });
  });
  const pull = first('.bond-pull');
  if (pull) out.push({ name: 'bond, slider and energy curve', els: [pull, first('.bond-pull') && pull.closest('.panel').querySelector('.range-row'), first('svg.energy')] });
  const gas = first('.gas');
  if (gas) out.push({ name: 'flasks and slider', els: [gas, gas.closest('.panel').querySelector('.range-row')] });
  const bars = first('.bars');
  if (bars) out.push({ name: 'energy bars, slider and question', els: [bars, bars.closest('.panel').querySelector('.range-row'), bars.closest('.panel').querySelector('.choice-row')] });
  const rxn = first('.panel .rxn .b-pick');
  if (rxn) { const r = rxn.closest('.rxn'); out.push({ name: 'reactants and products', els: [r] }); }
  const say = first('.say-it');
  if (say && say.querySelector('.tray')) out.push({ name: 'sentence and its words', els: [say.querySelector('.say-line'), say.querySelector('.tray')] });
  const picks = first('.mol-wrap.big svg');
  if (picks) out.push({ name: 'clickable drawing and its checklist', els: [picks, first('.checklist')] });
  const q = first('.quiz .q-draw');
  if (q) out.push({ name: 'graded drawing and Check', els: [q.querySelector('svg'), q.querySelector('.arrow-tools')] });
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
      /* draw the right arrows, so the animation that follows is checked too */
      if (st.kind !== 'quiz') {
        const want = await page.evaluate(() => { const t = document.querySelector('.arrow-tool'); return t && t.__scene ? t.__scene.arrows : null; });
        if (want) {
          for (const a of want) {
            await page.click(`.arrow-tool [data-key="${a.from}"] >> nth=0`, { force: true });
            await page.click(`.arrow-tool [data-key="${a.to}"] >> nth=0`, { force: true });
          }
          await page.click('.arrow-tool .arrow-tools .primary');
        }
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

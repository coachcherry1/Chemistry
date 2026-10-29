/* tools/layout.js: checks the page fits a school Chromebook. Optional:
 * needs Playwright.
 *
 *   node tools/layout.js                      # the usual window sizes
 *   node tools/layout.js 1366x520,900x600     # just these
 *   SHOTS=dir node tools/layout.js            # also screenshot each checked view
 *
 * Every step is opened at each window size and taken to where the student
 * works: predictions made, hydrogen bonds counted, the ladder ranked, the
 * halogens predicted. Then whatever a student works with must be on screen
 * at once, after scrolling the first of it to the top of the window:
 *   - the thermometer, every box it warms, and the prediction beside them;
 *   - the drawing whose atoms and lone pairs are clicked, and the task list;
 *   - the electron clouds and the buttons that change the atom;
 *   - each card where a substance's IMFs are named (and its hydrogen bonds
 *     counted), with its Lewis structure;
 *   - the ranking cards and the thermometer;
 *   - in part 6, the ranking beside the property predictions, and the liquid
 *     bench with its button.
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
  const out = [];
  const range = [...document.querySelectorAll('.thermo-range')].filter(vis)[0];
  const boxes = [...document.querySelectorAll('.heat-canvas')].filter(vis);
  if (boxes.length) {
    const read = document.querySelector('.thermo-read');
    out.push({ name: 'thermometer and every box', els: [range || read].concat(boxes).filter(Boolean) });
  }
  const pside = [...document.querySelectorAll('.pside .predict')].filter(vis)[0];
  if (pside && range) out.push({ name: 'prediction and the thermometer', els: [pside, range] });
  const scene = [...document.querySelectorAll('.scene-host svg')].filter(vis)[0];
  const tasks = document.querySelector('.tasks');
  if (scene) out.push({ name: 'drawing to click', els: [scene].concat(vis(tasks) ? [tasks] : []) });
  const cloud = document.querySelector('.cloud-canvas');
  if (vis(cloud)) out.push({ name: 'clouds and their buttons', els: [cloud, document.querySelector('.cloud .chips')] });
  document.querySelectorAll('.assign-card').forEach((c, i) => {
    if (vis(c)) out.push({ name: (c.classList.contains('count-card') ? 'count card ' : 'IMF card ') + (i + 1), els: [c] });
  });
  const pr = document.querySelector('.prank'), pq = document.querySelector('.pprops');
  if (vis(pr) && vis(pq)) out.push({ name: 'ranking and property predictions', els: [pr, pq] });
  const bench = document.querySelector('.bench-canvas');
  if (vis(bench)) out.push({ name: 'liquid bench and its button', els: [bench, document.querySelector('.pbench .primary')] });
  const ranks = [...document.querySelectorAll('.rank-card')].filter(vis);
  if (ranks.length && range) out.push({ name: 'rank cards and the thermometer', els: ranks.concat([range]) });
  return out;
}

(async () => {
  const b = await chromium.launch();
  const page0 = await b.newPage();
  await page0.goto('file://' + dir + '/src/index.html?step=1');
  const steps = await page0.evaluate(() => App.STEPS.map((s) => ({ id: s.id, kind: s.kind, ids: s.ids })));
  await page0.close();
  let bad = 0;
  for (const [w, hgt] of sizes) {
    const page = await b.newPage({ viewport: { width: w, height: hgt } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    const out = [];
    for (const st of steps) {
      await page.goto('file://' + dir + '/src/index.html?step=' + st.id);
      await page.waitForTimeout(150);
      /* the IMFs of each named, so the rest of the step opens */
      await page.evaluate(() => {
        [...document.querySelectorAll('.assign-card')].map((c) => c.getAttribute('data-id')).forEach((id) => {
          const f = Chem.forces(id);
          const card = () => document.querySelector(`.assign-card[data-id="${id}"]`);
          ['ldf', 'dipole', 'hbond'].forEach((k) => { if (f[k]) card().querySelector(`.toggle[data-force="${k}"]`).click(); });
          [...card().querySelectorAll('button')].find((b) => b.textContent === 'Check').click();
        });
      });
      if (st.kind === 'count') {
        /* every count answered, so the prediction and the heating stage open */
        await page.evaluate((ids) => {
          ids.forEach((id) => {
            const x = Chem.sub(id);
            const card = [...document.querySelectorAll('.count-card')].find((c) => c.querySelector('b').textContent === x.text);
            const lines = [...card.querySelectorAll('.count-line')];
            const want = lines.length === 3 ? [x.donors.length, x.receivers.length, x.pairs] : [x.pairs];
            want.forEach((n, i) => {
              const l = [...document.querySelectorAll('.count-card')].find((c) => c.querySelector('b').textContent === x.text)
                .querySelectorAll('.count-line')[i];
              [...l.querySelectorAll('.mini')].find((m) => m.textContent === String(n)).click();
            });
          });
        }, st.ids);
      }
      if (st.kind === 'rank') {
        await page.evaluate((ids) => {
          ids.slice().sort((a, b) => Chem.sub(a).bp - Chem.sub(b).bp).forEach((id) => {
            [...document.querySelectorAll('.rank-card')].find((c) => c.getAttribute('aria-label').indexOf(Chem.sub(id).name + ',') === 0).click();
          });
        }, st.ids);
      }
      if (st.kind === 'props') {
        /* counted, ranked and predicted, so the bench opens */
        await page.evaluate((id) => {
          const s = App.STEPS.find((x) => x.id === id);
          document.querySelectorAll('.assign-card').forEach((c) => {
            const b = c.querySelector(`.count-btns .mini[aria-label$=": ${Chem.sub(c.dataset.id).pairs}"]`); if (b) b.click();
          });
          s.ids.slice().sort((a, b) => Chem.compare(a, b).winner === a ? -1 : 1).forEach((x) => {
            const c = [...document.querySelectorAll('.rank-card:not([disabled])')].find((r) => r.querySelector('b').textContent === Chem.sub(x).name);
            if (c) c.click();
          });
          s.props.forEach((q, k) => {
            const best = Chem.sub(Chem.propBest(q[0], s.ids, q[1])).name;
            [...document.querySelectorAll('.prop-q')[k].querySelectorAll('.mini')].find((m) => m.textContent === best).click();
          });
        }, st.id);
      }
      if (st.kind === 'phases') {
        await page.evaluate(() => {
          document.querySelectorAll('.phase-row').forEach((r) => r.querySelector('.mini').click());
          [...document.querySelectorAll('button')].find((x) => x.textContent === 'Show me').click();
        });
      }
      for (let n = 0; n < 4; n++) {
        const c = await page.$('.predict .choice:not([disabled])');
        if (!c) break;
        await c.click();
        await page.waitForTimeout(80);
      }
      await page.waitForTimeout(300);
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

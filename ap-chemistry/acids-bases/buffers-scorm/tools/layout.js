/* tools/layout.js: checks the page fits a school Chromebook. Optional:
 * needs Playwright.
 *
 *   node tools/layout.js                      # the usual window sizes
 *   node tools/layout.js 1366x520,900x600     # just these
 *   SHOTS=dir node tools/layout.js            # also screenshot each checked view
 *
 * Every step is opened at each window size and taken to where the student
 * works: predictions made, a point of the walk reached, the slider moved.
 * Then whatever a student works with must be on screen at once, after
 * scrolling the first of it to the top of the window:
 *   - the question, the particle diagram and the pH graph of a walk or a range;
 *   - both flasks of the first step, with their pH read-outs;
 *   - the flask, its counts and the buttons of a click step;
 *   - the cards to sort and the boxes they go in;
 *   - the equation steps: the ratio slider, the flask and the warning;
 *   - a checkpoint question with its diagram or graph and all its choices.
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

/* the groups of elements that must be visible together, by what is on screen */
function groups() {
  const vis = (n) => n && n.getBoundingClientRect().height > 0;
  const q = (sel) => [...document.querySelectorAll(sel)].filter(vis);
  const out = [];
  const add = (name, els) => { els = els.filter(Boolean); if (els.length) out.push({ name, els }); };
  const walk = q('.row-walk');
  if (walk.length) {
    add('walk: question, flask, graph and what they show',
      [q('.pwalk')[0], q('.row-walk .pbox-svg')[0], q('.row-walk .curve-svg')[0], q('.row-walk .ptally')[0], ...q('.row-walk .note-host .reveal'), ...q('.row-walk .ratio-table'), ...q('.row-walk .meters')]);
  }
  if (q('.compare-boxes .pbox-svg').length) add('problem: the question, both flasks and the pH', [q('.row-two .predict')[0], ...q('.compare-boxes .pbox-svg'), ...q('.cmp-col .meter'), ...q('.row-two .after-q .reveal')]);
  if (q('.row-two .chips').length) add('members: the flask, its counts and the question', [q('.row-two .chips')[0], q('.row-two .pbox-svg')[0], q('.row-two .ptally')[0], q('.row-two .predict')[0]]);
  if (q('.row-two .ptc.pickable').length) add('click: the flask, its buttons and the reaction', [q('.row-two .pbox-svg')[0], q('.row-two .ptally')[0], q('.row-two .preact')[0]]);
  if (q('.row-two [data-answer]').length) add('when: the flask, the buttons and the warning', [q('.row-two .pbox-svg')[0], ...q('.row-two [data-answer]'), q('.row-two .hh-warn')[0]]);
  if (q('.ppairs').length) add('sort: cards and boxes', [q('.ppairs .tray')[0], ...q('.ppairs .bin')]);
  if (q('.quiz .q-choices').length) add('checkpoint: the question, its figure and choices', [q('.quiz .q-top')[0], q('.quiz .q-choices')[0]]);
  return out;
}

async function drive(page, st) {
  const click = async (sel) => { const e = await page.$(sel); if (e) { await e.click(); await page.waitForTimeout(60); return true; } return false; };
  const slide = (v) => page.evaluate((x) => { const s = document.querySelector('.thermo-range'); if (s) { s.value = String(x); s.dispatchEvent(new Event('input')); } }, v);
  if (st.kind === 'problem') { await click('.predict .choice >> nth=0'); await click('[data-add]'); }
  if (st.kind === 'members') await click('.predict .choice >> nth=0');
  if (st.kind === 'walk') {
    /* to point 4, the fullest: the prediction answered and revealed */
    for (let k = 0; k < 4; k++) {
      await click('.walk-q .predict .choice:not([disabled]) >> nth=0');
      if (k < 3) await click('[data-walk-next]');
    }
  }
  if (st.kind === 'click') await click('.ptc-HA');
  if (st.kind === 'range') { await click('.predict .choice >> nth=0'); await slide(-12); await slide(12); }
  if (st.kind === 'ratio') {
    await click('.predict .choice >> nth=0');
    await click('.predict:has-text("Predict again") .choice >> nth=0');
    await slide(20);
  }
  if (st.kind === 'when') await click('[data-answer="yes"]');
  if (st.kind === 'use') { await click('.walk-q .predict .choice >> nth=0'); await click('.predict:has-text("Step 2") .choice >> nth=0'); }
}

(async () => {
  const b = await chromium.launch();
  const page0 = await b.newPage();
  await page0.goto('file://' + dir + '/src/index.html?step=1');
  const steps = await page0.evaluate(() => App.STEPS.map((s) => ({ id: s.id, kind: s.kind, quiz: s.quiz })));
  await page0.close();
  let bad = 0;
  for (const [w, hgt] of sizes) {
    const page = await b.newPage({ viewport: { width: w, height: hgt } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    const out = [];
    async function measure(label, st) {
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
      if (probs.length) { bad++; out.push(`  ${label}: ${probs.join('; ')}`); }
      if (shots && r.fit.length) {
        require('fs').mkdirSync(shots, { recursive: true });
        for (let i = 0; i < r.fit.length; i++) {
          await page.evaluate((y) => window.scrollTo(0, y), r.fit[i].y);
          await page.screenshot({ path: path.join(shots, `${w}x${hgt}-${label.replace(/[^\w-]/g, '_')}-${i + 1}.png`) });
        }
      }
    }
    for (const st of steps) {
      if (st.kind === 'quiz') {
        /* every question of the pool: the choices before answering */
        await page.goto('file://' + dir + '/src/index.html?step=' + st.id + '&all');
        await page.waitForTimeout(100);
        while (await page.$('.quiz .choice:not([disabled])')) {
          const qid = await page.evaluate(() => {
            const t = document.querySelector('.quiz .q-text').textContent;
            for (const k in QUIZZES) for (const q of QUIZZES[k].pool) if (q.q === t) return q.id;
            return '?';
          });
          await measure(`${st.id}/${qid}`, st);
          await page.click('.quiz .choice >> nth=0');
          await page.click('.quiz .submit-answer:not([hidden])');
          await page.click('.quiz .btnrow .primary');
        }
        continue;
      }
      await page.goto('file://' + dir + '/src/index.html?step=' + st.id);
      await page.waitForTimeout(150);
      await drive(page, st);
      await measure(st.id, st);
    }
    bad += errs.length;
    console.log(`${w}x${hgt}: ${out.length ? '\n' + out.join('\n') : 'all steps fine'}${errs.length ? '\n  errors: ' + errs.join('; ') : ''}`);
    await page.close();
  }
  await b.close();
  console.log(bad ? bad + ' problem(s).' : 'Layout passed.');
  process.exit(bad ? 1 : 0);
})();

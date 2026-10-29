/* tools/layout.js: checks the page fits a school Chromebook. Optional:
 * needs Playwright.
 *
 *   node tools/layout.js                      # the usual window sizes
 *   node tools/layout.js 1366x520,900x600     # just these
 *   SHOTS=dir node tools/layout.js            # also screenshot each checked view
 *
 * Every step is opened at each window size and taken to where the student
 * works: predictions made, a point of the walk reached, both flasks clicked.
 * Then whatever a student works with must be on screen at once, after
 * scrolling the first of it to the top of the window:
 *   - the question, the particle diagram and the curve of a walk;
 *   - both flasks and the curves of the side-by-side step;
 *   - both flasks with their particles to click, and the button below them;
 *   - the cards to sort and the boxes they go in;
 *   - the diagrams to match, the points and the curve;
 *   - the graph and the task beside it;
 *   - a checkpoint question with its diagram or curve and all its choices.
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
  if (walk.length) add('walk: question, flask and curve', [q('.pwalk')[0], q('.row-walk .pbox-svg')[0], q('.row-walk .curve-svg')[0], ...q('.row-walk .note-host .reveal')]);
  if (q('.row-side').length) add('side: both flasks and the curves', [q('.row-side .pwalk')[0], ...q('.row-side .pbox-svg'), q('.row-side .curve-svg')[0]]);
  if (q('.compare-boxes .pbox-svg').length) add('compare: both flasks and what they show', [q('.pcompare .reveal')[0], ...q('.compare-boxes .pbox-svg'), ...q('.cmp-col .readout')]);
  if (q('.row-setup').length) add('setup: question and the flask', [q('.row-setup .predict')[0], q('.row-setup .pbox-svg')[0]]);
  if (q('.row-why').length) add('why: both flasks, particles and buttons', [...q('.row-why .pbox-svg'), ...q('.row-why .ptally'), ...q('.row-why .btnrow')]);
  if (q('.ppairs').length) add('pairs: cards and boxes', [q('.ppairs .tray')[0], ...q('.ppairs .bin')]);
  if (q('.row-match').length) add('match: diagrams, points and the curve', [q('.pmatch .tray')[0], q('.pslots')[0], q('.row-match .curve-svg')[0]]);
  if (q('.row-find').length) add('find: the graph and the task', [q('.row-find .curve-svg')[0], q('.row-find .pwalk')[0]]);
  if (q('.quiz .q-choices').length) add('checkpoint: the question, its figure and choices', [q('.quiz .q-top')[0], q('.quiz .q-choices')[0]]);
  return out;
}

async function drive(page, st) {
  const click = async (sel) => { const e = await page.$(sel); if (e) { await e.click(); await page.waitForTimeout(60); return true; } return false; };
  if (st.kind === 'walk') {
    /* to point 4, the fullest: both predictions answered and revealed */
    for (let k = 0; k < 4; k++) {
      await click('.walk-q > .predict .choice:not([disabled]) >> nth=0');
      await click('.walk-q2 .choice:not([disabled]) >> nth=0');
      if (k < 3) await click('[data-walk-next]');
    }
  }
  if (st.kind === 'compare') await click('.predict .choice >> nth=0');
  if (st.kind === 'setup') await click('.predict .choice >> nth=0');
  if (st.kind === 'side') await click('.walk-chips .chip >> nth=3');
  if (st.kind === 'why') {
    await page.evaluate(() => {
      document.querySelectorAll('.row-why .pflask')[0].querySelector('.btnrow button').click();
      document.querySelectorAll('.row-why .pflask')[1].querySelector('.ptc-A').click();
    });
  }
  if (st.kind === 'find') {
    /* round one answered (whichever letter is right), so the marker round opens */
    for (const L of ['A', 'B']) { if (await page.$('[data-curve]')) await click(`[data-curve="${L}"]`); }
  }
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
          await page.click('.quiz .btnrow .primary');
        }
        continue;
      }
      await page.goto('file://' + dir + '/src/index.html?step=' + st.id);
      await page.waitForTimeout(150);
      await drive(page, st);
      await measure(st.id, st);
      if (st.kind === 'find') {
        const mark = await page.$('.chit');
        if (mark) await measure(st.id + '-markers', st);
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

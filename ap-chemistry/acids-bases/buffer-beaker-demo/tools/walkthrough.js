/* tools/walkthrough.js: uses the beaker as a teacher would, in a real browser, against a
 * fake LMS. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js            # headless run, prints a report
 *   SHOTS=dir node tools/walkthrough.js  # also saves a screenshot per moment
 *   DARK=1 ...                           # the same in dark mode
 *
 * It checks that the particles on screen match the model at every moment: the start, after
 * each slider move, after single drops and runs of five (with the real animation, run fast),
 * with both HCl and NaOH, at the limit of 12 drops, and after Reset. It checks the reaction
 * line under the beaker, the pH meter, the pH graph, the "same drops, stronger buffer" chart
 * (numbers and the sentence), the equation (always with its warning, and not applicable when
 * a member is missing), and that the tool reports completion but no score to the "LMS".
 */
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
  catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); }
}

const URL = 'file://' + path.join(__dirname, '..', 'src', 'index.html') + '?speed=0.03';
const SHOTS = process.env.SHOTS;

const fakeLMS = () => {
  const read = () => JSON.parse(sessionStorage.getItem('lms') || '{}');
  window.API = {
    LMSInitialize: () => 'true', LMSFinish: () => 'true', LMSCommit: () => 'true', LMSGetLastError: () => '0',
    LMSGetValue: (k) => read()[k] || '',
    LMSSetValue: (k, v) => { const d = read(); d[k] = v; sessionStorage.setItem('lms', JSON.stringify(d)); return 'true'; }
  };
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, colorScheme: process.env.DARK ? 'dark' : 'light' });
  const problems = [];
  page.on('pageerror', (e) => problems.push('page error: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  await page.addInitScript(fakeLMS);
  await page.goto(URL);
  await page.waitForSelector('.beaker-svg');

  const expect = (cond, msg) => { if (!cond) problems.push(msg); };
  let shot = 0;
  async function snap(name) {
    if (!SHOTS) return;
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, String(++shot).padStart(2, '0') + '-' + name + '.png') });
  }
  const idle = () => page.waitForFunction(() => !App.busy(), null, { timeout: 15000 });
  const drawn = () => page.evaluate(() => {
    const n = (c) => document.querySelectorAll('.beaker-svg .layer .' + c + ':not(.off)').length;
    return { HA: n('p-ha'), A: n('p-a'), Na: n('p-na'), Cl: n('p-cl'), H: n('p-h'), OH: n('p-oh') };
  });
  async function matches(what) {
    const want = await page.evaluate(() => { const s = App.state(); return Buf.counts(s.pair, s.ha, s.a, s.up, s.dn); });
    const got = await drawn();
    ['HA', 'A', 'H', 'OH'].forEach((k) => expect(got[k] === want[k], `${what}: ${k} drawn ${got[k]}, model ${want[k]}`));
    expect(got.Na === 0 && got.Cl === 0, `${what}: sodium or chloride ions are drawn (${got.Na}, ${got.Cl})`);
    const pH = await page.evaluate(() => { const s = App.state(); return Buf.pH(s.pair, s.ha, s.a, s.up, s.dn).toFixed(2); });
    expect((await page.textContent('.ph-big')) === 'pH ' + pH, `${what}: the meter shows "${await page.textContent('.ph-big')}", model pH ${pH}`);
  }
  async function slide(which, v) {
    await page.evaluate(([w, x]) => { const s = document.querySelector('.sl-' + w + ' input'); s.value = String(x); s.dispatchEvent(new Event('input')); }, [which, v]);
  }
  const text = (sel) => page.textContent(sel);

  /* ---- the start */
  await matches('start');
  expect((await drawn()).HA === 10 && (await drawn()).A === 10, 'start: 10 HA and 10 A- expected');
  expect(/HA/.test(await text('.sl-ha .sl-name')) && /A⁻/.test(await text('.sl-a .sl-name')), 'the sliders are not labelled HA and A-');
  expect(!/HAc|Ac⁻/.test(await page.evaluate(() => document.body.textContent)), 'the page still says HAc or Ac-');
  await snap('start');

  /* ---- sliders reset the drops and redraw */
  await slide('ha', 4); await slide('a', 16);
  await matches('sliders 4 and 16');
  expect((await text('.sl-ha .sl-out')) === '0.04 M' && (await text('.sl-a .sl-out')) === '0.16 M', 'slider read-outs wrong');
  await slide('ha', 10); await slide('a', 10);

  /* ---- one drop of HCl, animated */
  await page.click('.drop-btn[data-dir="acid"][data-n="1"]');
  await idle();
  await matches('1 HCl');
  expect(/H⁺ \+ A⁻ → HA/.test(await text('.reaction')), 'reaction line after HCl: ' + (await text('.reaction')));
  expect(!/spectator|Cl⁻|Na⁺/.test(await text('.reaction')), 'the reaction line still mentions spectator ions');
  await snap('one-hcl');

  /* ---- five more, then the strength chart and the graph */
  await page.click('.drop-btn[data-dir="acid"][data-n="5"]');
  await idle();
  await matches('6 HCl');
  expect((await text('.drop-count')).includes('HCl: 6 drops'), 'drop count after 6: ' + (await text('.drop-count')));
  const sub = await text('.ph-sub'), water = await text('.ph-water');
  expect(/Change since the start/.test(sub) && /Pure water with the same drops/.test(water), 'meter lines after drops');
  await page.click('.tab[data-tab="strength"]');
  {
    const data = await page.evaluate(() => { const s = App.state(), st = App.strength().state; return Charts.strengthData(s.pair, s.ha, s.a, st.dir, st.n, st.vary).map((d) => (d.delta < 0 ? '−' : '+') + Math.abs(d.delta).toFixed(2)); });
    const shown = await page.$$eval('.bar-val', (els) => els.map((e) => e.textContent));
    expect(JSON.stringify(data) === JSON.stringify(shown), `strength bars show ${shown} but the model gives ${data}`);
    expect((await page.$$('.bar-col')).length === 4 && (await page.$$('.bar-col.now')).length === 1, 'strength chart needs four bars, one marked now');
    expect(/shrinks the pH change from/.test(await text('.strength-note')) || /use up all/.test(await text('.strength-note')), 'no sentence under the strength chart');
  }
  await snap('strength');
  /* switch what is varied and the drops */
  await page.click('.seg .mini[data-vary="HA"]');
  await page.click('.seg .mini[data-dir="base"]');
  await page.click('.step[aria-label="More drops"]');
  {
    const data = await page.evaluate(() => { const s = App.state(), st = App.strength().state; return Charts.strengthData(s.pair, s.ha, s.a, st.dir, st.n, st.vary).map((d) => (d.delta < 0 ? '−' : '+') + Math.abs(d.delta).toFixed(2)); });
    const shown = await page.$$eval('.bar-val', (els) => els.map((e) => e.textContent));
    expect(JSON.stringify(data) === JSON.stringify(shown), `strength bars (HA, NaOH, 6 drops) show ${shown} but the model gives ${data}`);
    expect(data.every((v) => v[0] === '+'), 'base drops should raise the pH in every bar');
  }
  await page.click('.tab[data-tab="graph"]');
  {
    const dot = await page.evaluate(() => { const d = document.querySelector('.g-svg .cdot.cl-buf'); return [+d.getAttribute('cx'), +d.getAttribute('cy')]; });
    expect(dot[0] > 0 && dot[1] > 0, 'the graph dot is not placed');
  }
  await snap('graph');

  /* ---- NaOH, a run of five, then the limit of 12 */
  await page.click('.drop-btn[data-dir="base"][data-n="5"]');
  await idle();
  await matches('6 HCl and 5 NaOH');
  expect(/OH⁻ \+ HA → A⁻ \+ H₂O/.test(await text('.reaction')), 'reaction line after NaOH: ' + (await text('.reaction')));
  await page.click('.drop-btn[data-dir="base"][data-n="5"]');
  await idle();
  await page.click('.drop-btn[data-dir="base"][data-n="5"]');
  await idle();
  await matches('6 HCl and 12 NaOH');
  expect(await page.isDisabled('.drop-btn[data-dir="base"][data-n="1"]'), 'NaOH buttons should be disabled at 12 drops');
  expect(!(await page.isDisabled('.drop-btn[data-dir="acid"][data-n="1"]')), 'HCl buttons should still work at 6 drops');

  /* ---- reset */
  await page.click('.ghostbtn');
  await matches('after reset');
  expect((await text('.drop-count')) === 'HCl: 0 drops   NaOH: 0 drops', 'drop count after reset');

  /* ---- running a buffer out: the member that reacts is used up */
  await slide('a', 2);
  await page.click('.drop-btn[data-dir="acid"][data-n="5"]');
  await idle();
  await matches('A- used up');
  expect(/stays free|No A⁻ left/.test(await text('.reaction')), 'no "stays free" message once A- is gone: ' + (await text('.reaction')));
  await snap('used-up');

  /* ---- the equation: always with its warning; not applicable without a buffer */
  await page.click('.ghostbtn');
  await slide('a', 10); await slide('ha', 10);
  await page.check('#showEq');
  {
    const eq = await text('.eqbox');
    expect(/Only for a buffer/.test(eq) && /appreciable amounts of BOTH/.test(eq), 'the equation is shown without its warning');
    expect(/pH = 4\.74 \+ log\(10 \/ 10\) = 4\.74/.test(eq), 'equation line for 10/10: ' + eq);
  }
  await slide('ha', 0);
  {
    const eq = await text('.eqbox');
    expect(/does not apply/.test(eq) && /Only for a buffer/.test(eq), 'with no HA the equation must say it does not apply, with the warning: ' + eq);
  }
  await snap('equation');
  await slide('ha', 10);

  /* ---- the strength chart when the species is zero */
  await page.click('.tab[data-tab="strength"]');
  await slide('a', 0);
  await page.click('.seg .mini[data-vary="A"]');
  expect(/slider above 0/.test(await text('.strength')), 'no message when the varied species is 0');

  /* ---- the LMS: completed, no score */
  const lms = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lms') || '{}'));
  expect(lms['cmi.core.lesson_status'] === 'completed', 'status ' + lms['cmi.core.lesson_status']);
  expect(lms['cmi.core.score.raw'] === undefined, 'the tool reported a score: ' + lms['cmi.core.score.raw']);

  await browser.close();
  if (problems.length) { console.error('FAILED:\n - ' + problems.join('\n - ')); process.exit(1); }
  console.log('OK: used every control, matched the beaker to the model at every moment, and checked the LMS record.');
})().catch((e) => { console.error(e); process.exit(1); });

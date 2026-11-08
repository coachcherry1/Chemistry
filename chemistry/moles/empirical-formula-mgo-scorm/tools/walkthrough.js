/* walkthrough.js: plays the whole lab with a fake LMS, using the real controls (click a tile, click the place).
 *   node tools/walkthrough.js        SHOTS=dir to save a picture of each step, DARK=1 for dark mode */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const url = 'file://' + path.join(__dirname, '../src/index.html');
let bad = 0;
function check(c, m) { if (!c) { bad++; console.log('FAIL: ' + m); } else console.log('ok: ' + m); }

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 600 }, colorScheme: process.env.DARK ? 'dark' : 'light' });
  await ctx.addInitScript(() => {
    const store = {};
    try { Object.assign(store, JSON.parse(sessionStorage.getItem('fake') || '{}')); } catch (e) { /* none */ }
    const sync = () => sessionStorage.setItem('fake', JSON.stringify(store));
    window.__sets = [];
    window.API = {
      LMSInitialize: () => 'true', LMSFinish: () => 'true', LMSCommit: () => 'true', LMSGetLastError: () => '0',
      LMSGetValue: k => store[k] || '', LMSSetValue: (k, v) => { store[k] = String(v); window.__sets.push(k); sync(); return 'true'; }
    };
  });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const shot = async n => { if (process.env.SHOTS) await pg.screenshot({ path: path.join(process.env.SHOTS, n + '.png') }); };
  const next = async () => { await pg.locator('.right .nav .btn.primary').click(); };
  const place = async (tile, target) => {
    await pg.click('.tile[data-tile="' + tile + '"]');
    await pg.click('[data-drop="' + target + '"]', { force: true });
  };

  await pg.goto(url + '?seed=12345'); await pg.waitForTimeout(200);
  const d = await pg.evaluate(() => App.data());
  const reading = () => pg.textContent('#sc-reading');
  check((await pg.textContent('#stepname')) === 'Start', 'starts at the first step');
  check(await pg.locator('.topnav .btn.primary').isDisabled() === false, 'Begin is enabled'); await shot('0'); await pg.locator('.topnav .btn.primary').click();

  /* 1 crucible */
  check(await pg.locator('.topnav .btn.primary').isDisabled(), 'Next waits for the weighing');
  await place('cruc', 'pan'); check((await reading()) === d.cruc.toFixed(4) + ' g', 'crucible mass shown: ' + await reading()); await shot('1'); await next();
  /* 2 magnesium */
  await place('mg', 'pan'); check((await reading()) === d.mg.toFixed(4) + ' g', 'magnesium mass shown');
  await place('mgcruc', 'pan'); check((await reading()) === (Math.round((d.cruc + d.mg) * 10000) / 10000).toFixed(4) + ' g', 'crucible and magnesium shown'); await shot('2'); await next();
  /* 3 set up: the ring stand and triangle are already in place */
  check(await pg.locator('.tile[data-tile="burner"]').count() === 0, 'the burner is already in place');
  await place('cruc', 'seat'); await shot('3');
  check(!(await pg.locator('.topnav .btn.primary').isDisabled()), 'set-up complete'); await next();
  /* 4 burn: too small a flame first, and the end of the scale is the perfect height */
  await pg.fill('#collar', '20'); await pg.dispatchEvent('#collar', 'input'); await pg.evaluate(() => App.tick(300));
  check(await pg.evaluate(() => App.state.burn) === 0, 'a short flame does not ignite the magnesium');
  await pg.fill('#collar', '100'); await pg.dispatchEvent('#collar', 'input'); await pg.evaluate(() => App.tick(40)); await shot('4');
  await pg.evaluate(() => App.tick(200));
  check(await pg.evaluate(() => App.state.burnDone), 'the magnesium burns with the flame touching'); await shot('4b');
  await next();
  /* 5 water */
  check(await pg.locator('.topnav .btn.primary').isDisabled(), 'Next waits for a drop');
  check(await pg.locator('#drop').isDisabled(), 'no drops until the lid is off and the bottle is above the crucible');
  await place('lid', 'pad'); check(await pg.evaluate(() => App.scene().lid()) === 'pad', 'the lid is on the ceramic pad');
  await place('bottle', 'over'); check(!(await pg.locator('#drop').isDisabled()), 'the bottle is above the crucible');
  for (let i = 0; i < 6; i++) { await pg.click('#drop'); await pg.waitForFunction(() => !App.busy(), null, { timeout: 5000 }); }
  check((await pg.textContent('.drops')) === '6 drops', 'six drops counted'); await shot('5');
  check(/0 of 6|\(0 of 6/.test(await pg.textContent('.lens-cap')) || /0 of 6/.test(await pg.textContent('.lens-cap')), 'six drops use up the nitride'); await next();
  /* 6 dry */
  await pg.fill('#collar', '100'); await pg.dispatchEvent('#collar', 'input'); await pg.evaluate(() => App.tick(300));
  check(await pg.evaluate(() => App.state.dried), 'the crucible dries'); await shot('6'); await next();
  /* 7 cool */
  await pg.click('#skip'); await pg.waitForFunction(() => App.state.cooled, null, { timeout: 15000 }); await shot('7'); await next();
  /* 8 product */
  await place('cruc', 'pan');
  const fin = await pg.evaluate(() => { const d = App.data(); return Lab.finalTotal(d, App.state.drops); }).catch(() => null);
  const shown = await reading();
  const want = await pg.evaluate(() => { const d = App.data(); const dd = d; return (window.Lab ? Lab : null) && Lab.finalTotal(dd, 6).toFixed(4) + ' g'; });
  check(shown === want, 'product mass shown: ' + shown); await shot('8'); await next();
  /* 9 done */
  check((await pg.textContent('#stepname')) === 'Finished', 'reaches the last step'); await shot('9');
  const sets = await pg.evaluate(() => window.__sets);
  check(sets.indexOf('cmi.core.lesson_status') >= 0, 'marks the lab completed');
  check(sets.indexOf('cmi.core.score.raw') < 0, 'sends no score');
  /* the same masses after a reload */
  await pg.goto(url); await pg.waitForTimeout(200);
  const d2 = await pg.evaluate(() => App.data());
  check(d2.cruc === d.cruc && d2.mg === d.mg, 'a reload gives the same masses');
  check(errs.length === 0, 'no script errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(bad ? bad + ' problem(s)' : 'all good'); process.exit(bad ? 1 : 0);
})();

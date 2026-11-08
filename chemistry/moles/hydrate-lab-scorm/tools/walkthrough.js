/* walkthrough.js: plays the whole lab with a fake LMS, using the real controls (click a tile, click the place).
 *   node tools/walkthrough.js        SHOTS=dir to save a picture of each step, DARK=1 for dark mode */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const url = 'file://' + path.join(__dirname, '../src/index.html');
let bad = 0;
function check(c, m) { if (!c) { bad++; console.log('FAIL: ' + m); } else console.log('ok: ' + m); }

function Lab_d(d, c) { let s = 0; for (let i = 0; i < c; i++) s += d.amounts[i]; return (Math.round(s * 10000) / 10000).toFixed(4); }
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
  const auto = async name => { await pg.waitForFunction(n => document.getElementById('stepname').textContent === n, name, { timeout: 9000 }); };
  const place = async (tile, target) => {
    await pg.click('.tile[data-tile="' + tile + '"]');
    await pg.click('[data-drop="' + target + '"]', { force: true });
  };

  await pg.goto(url + '?seed=12345'); await pg.waitForTimeout(200);
  const d = await pg.evaluate(() => App.data());
  const reading = () => pg.textContent('#sc-reading');
  const nextDisabled = () => pg.locator('.topnav .btn.primary').isDisabled();
  check((await pg.textContent('#stepname')) === 'Start', 'starts at the first step');
  check(!(await nextDisabled()), 'Begin is enabled'); check(!(await pg.locator('.lens').isVisible()), 'no particle diagram before the heating'); await shot('0'); await pg.locator('.topnav .btn.primary').click();

  /* 1 the empty crucible and lid, out and back */
  check(await nextDisabled(), 'Next waits for the weighing');
  await place('cruc', 'pan'); check((await reading()) === d.cruc.toFixed(4) + ' g', 'crucible mass shown: ' + await reading());
  check(await nextDisabled(), 'Next waits until the crucible is back on the pad');
  await place('cruc', 'pad'); check((await reading()) === '0.0000 g', 'the balance is empty again'); await shot('1'); await auto('Measure out the hydrate');

  /* 2 shake out the solid onto the boat on the balance */
  check(!(await pg.locator('.tile[data-tile="cruc"]').count()), 'only the boat is offered');
  await place('boat', 'pan'); check((await reading()) === '0.0000 g', 'the balance is zero with the boat on it');
  check(await pg.locator('#shake').isDisabled(), 'no shaking until the bottle is above the boat');
  await place('hbottle', 'over'); check(!(await pg.locator('#shake').isDisabled()), 'the bottle is above the boat');
  await pg.click('#sc-di-body', { force: true }); await pg.waitForFunction(() => !App.busy(), null, { timeout: 5000 });
  check((await reading()) === Lab_d(d, 1) + ' g', 'clicking the bottle shakes out solid: ' + await reading());
  check(await nextDisabled(), 'Next waits for at least 1.5 g');
  let clicks = 1;
  while (parseFloat(await reading()) < 1.8) { await pg.click('#shake'); await pg.waitForFunction(() => !App.busy(), null, { timeout: 5000 }); clicks++; }
  check(await pg.evaluate(() => App.scene().pileCount()) > 50, 'crystals heap up in the boat'); await shot('2');
  const disp = parseFloat(await reading());
  check(!(await nextDisabled()), 'Next opens once there is enough'); await next();

  /* 3 pour into the crucible and mass it */
  await place('boat', 'cruc'); await pg.waitForFunction(() => !App.busy(), null, { timeout: 5000 });
  check((await reading()) === '0.0000 g', 'the boat is empty and off the balance');
  await place('cruc', 'pan');
  const mh = Math.round((disp - d.loss) * 10000) / 10000, m0 = Math.round((d.cruc + mh) * 10000) / 10000;
  check((await reading()) === m0.toFixed(4) + ' g', 'crucible, lid and hydrate shown: ' + await reading()); await shot('3'); await auto('Set up the heating');

  /* 4 set up */
  check(await pg.locator('.tile[data-tile="burner"]').count() === 0, 'the burner is already in place');
  await place('cruc', 'seat'); await shot('4'); await auto('Heating 1');

  /* 5 to 7, over and over until the mass is constant */
  const run = await pg.evaluate(() => JSON.parse(JSON.stringify(App.run())));
  check(run.K >= 3 && run.K <= 5, 'the run needs ' + run.K + ' heatings (3 to 5)');
  await pg.fill('#collar', '20'); await pg.dispatchEvent('#collar', 'input'); await pg.evaluate(() => App.tick(300));
  check(await pg.evaluate(() => App.state.heatP) === 0, 'a short flame does not heat the crucible');
  for (let k = 1; k <= run.K; k++) {
    await pg.fill('#collar', '100'); await pg.dispatchEvent('#collar', 'input'); await pg.evaluate(() => App.tick(60)); if (k === 1) await shot('5a');
    await pg.evaluate(() => App.tick(200));
    check(await pg.evaluate(() => App.state.heatDone), 'heating ' + k + ' finishes'); if (k === 1) await shot('5');
    await auto('Cool after heating ' + k);
    await pg.click('#skip'); await pg.waitForFunction(() => App.state.cooled, null, { timeout: 15000 });
    await auto('Mass after heating ' + k);
    await place('cruc', 'pan');
    const want = Math.round((d.cruc + run.contents[k - 1]) * 10000) / 10000;
    check((await reading()) === want.toFixed(4) + ' g', 'mass after heating ' + k + ': ' + await reading());
    if (k < run.K) { check(/still dropping/i.test(await pg.textContent('.say')), 'it says the mass is still dropping'); await place('cruc', 'seat'); await auto('Heating ' + (k + 1)); }
    else { check(/constant/i.test(await pg.textContent('.say')), 'it says the mass is constant'); await shot('7'); await auto('Finished'); }
  }
  check((await pg.textContent('#stepname')) === 'Finished', 'reaches the last step'); await shot('8');
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

/* tools/walkthrough.js — uses the drawing tool the way a teacher would, in a
 * real browser. Optional: needs Playwright.
 *
 *   node tools/walkthrough.js
 *   SHOTS=dir node tools/walkthrough.js     # also saves screenshots
 *
 * Draws CH₄ by hand (Atom tool round a selected C), changes a bond to double
 * and triple and back, undoes and redoes, adds and erases a lone-pair-only O,
 * drags an atom and Shift-drags a whole molecule, duplicates a molecule for
 * resonance (with ↔), places and changes an arrow, draws NO₃⁻ from its formula
 * and checks the brackets and formal charges, uses a template, opens Snip
 * view, downloads PNG and SVG (and checks the files), copies to the clipboard,
 * saves to My drawings and opens it again, reloads (the drawing is kept), and
 * uses the keyboard shortcuts.
 */
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  try { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
  catch (e2) { console.error('Playwright is not installed; skipping.'); process.exit(0); }
}

const URL = 'file://' + path.join(__dirname, '..', 'src', 'index.html');
const SHOTS = process.env.SHOTS;

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true,
    permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push('page error: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  const expect = (c, m) => { if (!c) problems.push(m); };
  let shot = 0;
  const snap = async (name) => {
    if (!SHOTS) return;
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, String(++shot).padStart(2, '0') + '-' + name + '.png'), fullPage: true });
  };

  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const doc = () => page.evaluate(() => JSON.parse(JSON.stringify(Editor.state.doc)));
  /* a click on grid point (x, y), in drawing units */
  async function at(x, y, opts) {
    const p = await page.evaluate(([x, y]) => {
      const host = document.querySelector('.board'), pt = host.createSVGPoint();
      pt.x = x * Render.U; pt.y = y * Render.U;
      const s = pt.matrixTransform(host.getScreenCTM());
      return { x: s.x, y: s.y };
    }, [x, y]);
    return p;
  }
  async function tapAt(x, y, mods) {
    const p = await at(x, y);
    if (mods) await page.keyboard.down(mods);
    await page.mouse.click(p.x, p.y);
    if (mods) await page.keyboard.up(mods);
  }
  async function dragFrom(x0, y0, x1, y1, mods) {
    const a = await at(x0, y0), b = await at(x1, y1);
    if (mods) await page.keyboard.down(mods);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
    await page.mouse.move(b.x, b.y, { steps: 4 });
    await page.mouse.up();
    if (mods) await page.keyboard.up(mods);
  }
  const tool = (t) => page.click(`[data-tool="${t}"]`);
  const element = (e) => page.click(`[data-el="${e}"]`);

  expect(/Empty/.test(await page.textContent('#status')), 'an empty page does not say it is empty');

  /* ---- CH₄ by hand */
  await tool('atom');
  await element('C');
  await tapAt(4, 4);
  await element('H');
  for (const [x, y] of [[3, 4], [5, 4], [4, 3], [4, 5]]) await tapAt(x, y);
  let d = await doc();
  expect(d.atoms.length === 5 && d.bonds.length === 4, `CH4 by hand: ${d.atoms.length} atoms, ${d.bonds.length} bonds`);
  expect(/CH₄: 8 valence electrons · every atom has its octet/.test(await page.textContent('#status')),
    'CH4 status: ' + await page.textContent('#status'));
  await snap('ch4');

  /* ---- bond orders, undo, redo */
  await tool('bond');
  const mid = async (x0, y0, x1, y1) => tapAt((x0 + x1) / 2, (y0 + y1) / 2);
  await mid(4, 4, 5, 4);
  d = await doc();
  expect(d.bonds.some((b) => b.order === 2), 'tapping a bond did not make it double');
  await mid(4, 4, 5, 4);
  await mid(4, 4, 5, 4);
  d = await doc();
  expect(d.bonds.every((b) => b.order === 1), 'a bond did not go double → triple → single');
  await page.click('#undo');
  d = await doc();
  expect(d.bonds.some((b) => b.order === 3), 'undo did not bring back the triple bond');
  await page.click('#redo');
  d = await doc();
  expect(d.bonds.every((b) => b.order === 1), 'redo did not redo');

  /* ---- a lone O, its lone pairs, then erase it */
  await page.keyboard.press('Escape');
  await tool('atom');
  await page.evaluate(() => { Editor.state.selected = null; Editor.paint(); });
  await element('O');
  await tapAt(9, 4);
  await tool('lp');
  await tapAt(9, 4);
  await tapAt(9, 4);
  d = await doc();
  const o = d.atoms.find((a) => a.el === 'O');
  expect(o && o.lp === 2 && !d.bonds.some((b) => b.a === o.id || b.b === o.id), 'lone-pair tool: O should have 2 pairs, no bonds');
  await tool('erase');
  await tapAt(9, 4);
  d = await doc();
  expect(!d.atoms.some((a) => a.el === 'O'), 'erase did not remove the O');

  /* ---- drag one atom; Shift-drag the whole molecule */
  await tool('atom');
  await dragFrom(3, 4, 2.5, 3.5);
  d = await doc();
  expect(d.atoms.some((a) => a.x === 2.5 && a.y === 3.5), 'dragging an H did not move it');
  await page.click('#undo');
  await dragFrom(4, 4, 6, 6, 'Shift');
  d = await doc();
  const c = d.atoms.find((a) => a.el === 'C');
  expect(c.x === 6 && c.y === 6 && d.atoms.filter((a) => a.el === 'H').every((a) => Math.abs(a.x - 6) + Math.abs(a.y - 6) === 1),
    'Shift-drag did not move the whole molecule');

  /* ---- duplicate for resonance (the dragged C is selected) */
  expect(/Atom/.test(await page.textContent('#inspector')), 'a dragged atom is not shown in the panel');
  await tapAt(6, 6);
  expect(!/Atom/.test(await page.textContent('#inspector')), 'tapping the selected atom did not deselect it');
  await tapAt(6, 6);
  expect(/Atom/.test(await page.textContent('#inspector')), 'selecting an atom does not show it in the panel');
  await page.click('button:has-text("Duplicate")');
  d = await doc();
  expect(d.atoms.length === 10 && d.arrows.length === 1 && d.arrows[0].kind === 'res', 'Duplicate → did not copy the molecule with ↔');

  /* ---- arrows */
  await tool('arrow');
  await tapAt(9, 9);
  d = await doc();
  expect(d.arrows.length === 2, 'the arrow tool did not place an arrow');
  await tapAt(9, 9);
  d = await doc();
  expect(d.arrows.some((r) => r.kind === 'rxn'), 'tapping an arrow did not change it to →');

  /* ---- from a formula: NO₃⁻, brackets and formal charges */
  await page.fill('#formula', 'NO3-');
  expect(/Reading this as NO₃⁻/.test(await page.textContent('#readAs')), 'the preview does not read NO3- as NO₃⁻');
  await page.click('#btnDraw');
  d = await doc();
  expect(d.atoms.length === 4 && d.bonds.some((b) => b.order === 2), 'NO3- was not drawn');
  await page.check('#optFC');
  const texts = await page.evaluate(() => [...document.querySelectorAll('.board text')].map((t) => t.textContent));
  expect(texts.includes('+1') && texts.filter((t) => t === '−1').length === 2, 'formal charges: ' + texts.join(' '));
  expect(texts.includes('−'), 'NO3- has no bracket charge');
  await page.uncheck('#optFC');
  await snap('no3');

  /* ---- a template, beside it */
  await page.selectOption('#templates', 'C2H4O2');
  d = await doc();
  expect(d.atoms.length === 8 && /acetic acid/.test(await page.textContent('#msg')), 'the acetic acid template was not drawn');
  await page.fill('#formula', 'C3H8O');
  await page.click('#btnDraw');
  expect(/more than one central atom/.test(await page.textContent('#msg')), 'C3H8O was not refused with a reason');
  await page.fill('#formula', 'SO4 2-');
  await page.click('#btnAdd');
  d = await doc();
  expect(d.atoms.length === 13, `“+ Add” did not add SO4 2- beside acetic acid (${d.atoms.length} atoms)`);
  const xs = d.atoms.map((a) => a.x), ys = d.atoms.map((a) => a.y);
  expect(Math.min(...xs) >= 0.5 && Math.max(...xs) <= 17.5 && Math.min(...ys) >= 0.5 && Math.max(...ys) <= 10.5, 'an added structure went off the grid');

  /* ---- Snip view */
  await page.click('#snipBtn');
  expect(await page.isVisible('#snip svg'), 'Snip view did not show the drawing');
  const snipText = await page.evaluate(() => [...document.querySelectorAll('#snip svg [data-ui]')].length);
  expect(snipText === 0, 'Snip view shows the editor grid or selection');
  await snap('snip');
  await page.keyboard.press('Escape');
  expect(!(await page.isVisible('#snip')), 'Esc did not close Snip view');

  /* ---- downloads and the clipboard */
  const [png] = await Promise.all([page.waitForEvent('download'), page.click('#pngBtn')]);
  const pngPath = await png.path();
  const head = fs.readFileSync(pngPath).subarray(0, 24);
  expect(head.subarray(1, 4).toString() === 'PNG', 'the PNG download is not a PNG');
  const w = head.readUInt32BE(16), hgt = head.readUInt32BE(20);
  expect(w > 600 && hgt > 200, `the PNG is ${w}×${hgt}`);
  expect(/\.png$/.test(png.suggestedFilename()), 'PNG file name: ' + png.suggestedFilename());
  const [svg] = await Promise.all([page.waitForEvent('download'), page.click('#svgBtn')]);
  const svgText = fs.readFileSync(await svg.path(), 'utf8');
  expect(/<svg[^>]*xmlns="http:\/\/www.w3.org\/2000\/svg"/.test(svgText) && !/data-ui/.test(svgText) && !/class="hit/.test(svgText),
    'the SVG download is not a clean standalone SVG');
  expect(/font-family="Arial/.test(svgText), 'the SVG relies on page CSS for its font');
  await page.click('#copyBtn');
  await page.waitForTimeout(800);
  const copied = await page.textContent('#msg');
  expect(/Copied|blocked/.test(copied), 'Copy image gave no answer: ' + copied);
  if (/Copied/.test(copied)) {
    const types = await page.evaluate(async () => (await navigator.clipboard.read()).map((i) => i.types).flat());
    expect(types.includes('image/png'), 'the clipboard holds ' + types.join(','));
  }

  /* ---- My drawings, then a reload */
  const before = (await doc()).atoms.length;
  await page.click('summary:has-text("My drawings")');
  await page.fill('#libName', 'test sheet');
  await page.click('#libSave');
  await page.click('#clear');
  expect((await doc()).atoms.length === 0, 'Clear did not clear');
  await page.click('.lib button:has-text("Open")');
  expect((await doc()).atoms.length === before, 'opening a saved drawing did not restore it');
  await page.reload();
  expect((await doc()).atoms.length === before, 'the drawing was not kept across a reload');
  expect(/test sheet/.test(await page.textContent('#libList')), 'My drawings lost its entry on reload');

  /* ---- keyboard */
  await page.click('#clear');
  await page.fill('#formula', 'CO2');
  await page.click('#btnDraw');
  d = await doc();
  const b0 = d.bonds[0], A = d.atoms.find((a) => a.id === b0.a), B = d.atoms.find((a) => a.id === b0.b);
  await tool('atom');
  await tapAt((A.x + B.x) / 2, (A.y + B.y) / 2);
  await page.keyboard.press('1');
  d = await doc();
  expect(d.bonds.find((b) => b.id === b0.id).order === 1, 'key 1 did not make the selected bond single');
  await page.keyboard.press('Delete');
  d = await doc();
  expect(!d.bonds.some((b) => b.id === b0.id), 'Delete did not remove the selected bond');
  await page.keyboard.press('Control+z');
  d = await doc();
  expect(d.bonds.some((b) => b.id === b0.id), 'Ctrl+Z did not bring the bond back');

  /* ---- a dark slide */
  await page.selectOption('#optBg', 'dark');
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector('.canvas')).backgroundColor);
  expect(bg === 'rgb(13, 27, 42)', 'the dark-slide background did not show: ' + bg);
  await snap('dark');

  await browser.close();
  if (problems.length) {
    console.error(problems.map((p) => '✗ ' + p).join('\n'));
    process.exit(1);
  }
  console.log('✓ walkthrough passed: CH4 by hand, bond orders, undo/redo, lone pairs, erase, drag and Shift-drag, ' +
    'duplicate with ↔, arrows, NO3- with brackets and formal charges, a template, + Add, Snip view, PNG/SVG ' +
    'downloads, copy, My drawings, reload, keyboard, dark slide.');
})();

/* figures.js: renders every figure of the study guide to a PNG, from the
 * arrow-pushing activity's own model (chem.js, scenes.js, render.js), in the
 * light theme on white. Returns { name: { file, w, h } } (w, h in CSS pixels)
 * and the computed answers (patterns of each chain, each rearrangement).
 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const PKG = path.resolve(__dirname, '../../arrow-pushing-scorm/src');
const OUT = path.join(__dirname, 'figs');

/* runs in the page */
function pageSide() {
  const S = SCENES.S;
  const css = (el, o) => { Object.assign(el.style, o); return el; };
  const div = (o) => css(document.createElement('div'), o);
  const cell = (label, node, w) => {
    const c = div({ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4px 10px', width: w || 'auto', flex: '0 0 auto' });
    if (label) { const l = div({ font: 'bold 15px Arial, sans-serif', color: '#111', marginBottom: '2px' }); l.textContent = '(' + label + ')'; c.appendChild(l); }
    c.appendChild(node);
    return c;
  };
  const patName = (sc) => sc.patterns.map((p) => Chem.PATTERN[p]).join(' + ');
  const partial = (ids) => { const o = {}; (ids || []).forEach((i) => { o[i] = '+'; }); return o; };
  window.__build = function (spec) {
    const wrap = div({ background: '#fff', padding: '6px', display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', maxWidth: '1000px', fontFamily: 'Arial, sans-serif', color: '#111' });
    const lead = () => { if (!spec.lead) return; const l = div({ font: 'bold 16px Arial, sans-serif', alignSelf: 'flex-start', margin: '4px 6px 0 0' }); l.textContent = spec.lead + ')'; wrap.appendChild(l); };
    lead();
    if (spec.row) {
      wrap.style.alignItems = 'flex-start';
      const n = spec.perRow || spec.row.length;
      wrap.style.width = (n * 270) + 'px';
      spec.row.forEach((c) => {
        let node;
        const scale = c.scale || 36;
        if (c.mol) node = Render.draw(S[c.mol].before, { scale, partial: partial(c.partial), label: c.mol });
        else if (c.arrows) node = Arrows.figure(S[c.arrows], S[c.arrows].arrows, { scale: 32 });
        else if (c.shiftArrow) { const sc = SCENES.shiftScene(c.shiftArrow); node = Arrows.figure(sc, sc.arrows, { scale }); }
        else if (c.shiftProduct) { const sc = SCENES.shiftScene(c.shiftProduct); node = Render.draw(sc.after, { scale }); }
        wrap.appendChild(cell(c.label, node, spec.perRow ? '240px' : null));
      });
    } else if (spec.chain) {
      const steps = [].concat(S[spec.chain]);
      const scale = spec.scale || (steps.length >= 4 ? 25 : 28);
      const fig = (sc, k) => (spec.arrows ? Arrows.figure(sc, sc.arrows, { scale }) : Render.draw(sc.before, { scale }));
      wrap.appendChild(cell(null, fig(steps[0], 0)));
      steps.forEach((sc, k) => {
        /* the arrow and the structure after it stay together on one line */
        const grp = div({ display: 'flex', alignItems: 'center', flexWrap: 'nowrap' });
        const mid = div({ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 2px', maxWidth: '100px' });
        if (spec.names) { const t = div({ font: 'bold 12px Arial, sans-serif', textAlign: 'center', color: '#8a1c12', marginBottom: '1px' }); t.textContent = patName(sc) + (sc.patterns.length > 1 ? ' (concerted)' : ''); mid.appendChild(t); }
        const ar = div({ font: '28px Arial, sans-serif' }); ar.textContent = '\u2192'; mid.appendChild(ar);
        grp.appendChild(mid);
        grp.appendChild(cell(null, k === steps.length - 1 ? Render.draw(sc.after, { scale }) : fig(steps[k + 1], k + 1)));
        wrap.appendChild(grp);
      });
    }
    document.body.appendChild(wrap);
    return wrap;
  };
  window.__answers = function (chainIds, shiftIds, nameIds) {
    const out = { chains: {}, shifts: {}, names: {} };
    (nameIds || []).forEach((id) => { out.names[id] = S[id].patterns.map((p) => Chem.PATTERN[p]).join(' + '); });
    chainIds.forEach((id) => { out.chains[id] = [].concat(S[id]).map((sc) => ({ pat: sc.patterns.map((p) => Chem.PATTERN[p]), concerted: sc.patterns.length > 1 })); });
    shiftIds.forEach((id) => {
      const base = S[id].before, plus = base.atoms.filter((a) => Chem.isCation(base, a.id))[0].id;
      const sc = SCENES.shiftScene(id);
      const here = Chem.neighbours(base, plus).filter((n) => Chem.atom(base, n.id).el === 'C').length;
      if (!sc) { out.shifts[id] = { yes: false, from: here }; return; }
      const np = sc.after.atoms.filter((a) => Chem.isCation(sc.after, a.id))[0].id;
      const there = Chem.neighbours(sc.after, np).filter((n) => Chem.atom(sc.after, n.id).el === 'C').length;
      const b = Chem.bestShift(base, plus);
      out.shifts[id] = { yes: true, kind: b.group ? 'methyl' : 'hydride', from: here, to: there };
    });
    return out;
  };
}

async function open() {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 3 });
  await p.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.route('**/js/scenes.js', async (r) => {
    let s = fs.readFileSync(path.join(PKG, 'js/scenes.js'), 'utf8');
    s = s.replace('  return { S: S, RULES:', '  window.__SG = { def: def, chain: chain, finish: finish, swap: swap, HEX: HEX, PENT: PENT, S: S, shiftScene: shiftScene, arrowsOf: arrowsOf };\n  return { S: S, RULES:');
    await r.fulfill({ contentType: 'application/javascript', body: s });
  });
  await p.goto('file://' + PKG + '/index.html');
  await p.addScriptTag({ path: path.join(__dirname, 'extra-scenes.js') });
  await p.evaluate(pageSide);
  await p.evaluate(() => { document.getElementById('screen') && (document.getElementById('screen').hidden = true); document.body.style.background = '#fff'; });
  return { b, p, errs };
}

async function render(p, name, spec) {
  const h = await p.evaluateHandle((s) => { document.body.innerHTML = ''; return window.__build(s); }, spec);
  const el = h.asElement();
  const box = await el.boundingBox();
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, name + '.png');
  await el.screenshot({ path: file });
  return { file, w: Math.round(box.width), h: Math.round(box.height) };
}

module.exports = { open, render };

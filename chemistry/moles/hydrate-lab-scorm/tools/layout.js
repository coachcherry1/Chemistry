/* layout.js: every step must fit a Chromebook (1366x650, and 1366x520 inside an LMS frame) with no scrolling of
 * the page and everything the student works with on screen at once. node tools/layout.js */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
const url = 'file://' + path.join(__dirname, '../src/index.html');
let bad = 0;
(async () => {
  const b = await chromium.launch();
  for (const [w, hgt] of [[1366, 768], [1366, 650], [1366, 520], [1280, 600]]) {
    const pg = await b.newPage({ viewport: { width: w, height: hgt } });
    for (let s = 0; s <= 8; s++) {
      await pg.goto(url + '?seed=7&step=' + s); await pg.waitForTimeout(150);
      const r = await pg.evaluate(() => {
        const vis = sel => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, right: b.right, h: b.height }; };
        const right = document.querySelector('.right');
        return { page: document.documentElement.scrollHeight - innerHeight, scroll: right.scrollHeight - right.clientHeight,
          scene: vis('.scene-svg'), shape: (function () { const e = document.querySelector('.scenebox').getBoundingClientRect(); return e.width / e.height; })(), lens: vis('.lens'), tray: vis('.tray:not([hidden])'), table: vis('.datatable'), ctl: vis('.ctl'), say: vis('.say'), vh: innerHeight, vw: innerWidth,
          hscroll: document.documentElement.scrollWidth - innerWidth };
      });
      const probs = [];
      if (r.page > 1) probs.push('page scrolls ' + r.page);
      if (r.hscroll > 1) probs.push('sideways scroll');
      if (Math.abs(r.shape - 1280 / 700) > 0.02) probs.push('the bench is not the drawing\'s shape (' + r.shape.toFixed(2) + '), so the overlays would not line up');
      if (r.scene.h < 330) probs.push('scene only ' + Math.round(r.scene.h) + 'px tall');
      ['lens', 'tray', 'ctl', 'table'].forEach(k => { if (r[k] && r[k].bottom > r.vh + 1) probs.push(k + ' below the screen'); });
      if (r.scroll > 1 && hgt >= 650) probs.push('right column scrolls ' + r.scroll);
      console.log((probs.length ? 'FAIL' : 'ok') + ': ' + w + 'x' + hgt + ' step ' + s + (probs.length ? ' ' + probs.join(', ') : ''));
      if (probs.length) bad++;
    }
  }
  await b.close();
  console.log(bad ? bad + ' problem(s)' : 'all good'); process.exit(bad ? 1 : 0);
})();

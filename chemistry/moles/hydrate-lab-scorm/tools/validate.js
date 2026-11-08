/* validate.js: checks the package. Run from the package folder: node tools/validate.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
let bad = 0;
function fail(m) { bad++; console.log('FAIL: ' + m); }
function ok(m) { console.log('ok: ' + m); }
function read(p) { return fs.readFileSync(path.join(root, p), 'utf8'); }

/* 1. the manifest lists every file and each file exists */
const man = read('src/imsmanifest.xml');
const files = [...man.matchAll(/<file href="([^"]+)"/g)].map(m => m[1]);
files.forEach(f => { if (!fs.existsSync(path.join(root, 'src', f))) fail('manifest file missing: ' + f); });
fs.readdirSync(path.join(root, 'src/js')).forEach(f => { if (files.indexOf('js/' + f) < 0) fail('js/' + f + ' is not in the manifest'); });
const html = read('src/index.html');
files.filter(f => f.endsWith('.js')).forEach(f => { if (html.indexOf('src="' + f + '"') < 0) fail(f + ' is not loaded by index.html'); });
if (/masteryscore/i.test(man)) fail('the manifest has a masteryscore (this lab reports no score)');
if (!/HYDRATE_LAB_/.test(man)) fail('own SCORM identifiers expected (HYDRATE_LAB_*)');
if (/MGO_LAB|mgo-lab/.test(man + read('src/js/scorm.js'))) fail('an identifier from the magnesium oxide lab is still here');
if (/cmi\.core\.score\.raw|setScore\(/.test(read('src/js/app.js'))) fail('app.js must not report a score');
ok('manifest, files and ids');

/* 2. house rules on the text */
const texts = ['src/index.html', 'src/css/styles.css', 'README.md', 'src/imsmanifest.xml'].concat(
  fs.readdirSync(path.join(root, 'src/js')).map(f => 'src/js/' + f), fs.readdirSync(path.join(root, 'tools')).filter(f => f !== 'validate.js').map(f => 'tools/' + f));
texts.forEach(f => {
  const t = read(f);
  if (/—/.test(t)) fail('em dash in ' + f);
  if (/https?:\/\/(?!www\.w3\.org|www\.imsproject|www\.adlnet|www\.imsglobal|coachcherry1)/.test(t) && !f.startsWith('tools/')) fail('external address in ' + f);
  if (/6\.022/.test(t)) fail('6.022 in ' + f + ' (the class uses 6.02)');
  if (/Mole Town/i.test(t)) fail('"Mole Town" in ' + f);
  if (f.startsWith('src/js/') && /\bMg\b|magnesium/i.test(t)) fail('magnesium left over from the other lab in ' + f);
});
ok('no em dashes, no external addresses, class wording');

/* 3. the numbers */
const ctx = { window: {}, document: {}, console };
vm.createContext(ctx);
['util', 'data'].forEach(n => vm.runInContext(read('src/js/' + n + '.js') + '\n;this.__' + n + '=' + (n === 'util' ? 'UI' : 'Lab'), ctx));
vm.runInContext('var UI = this.__util; var Lab = this.__data;', ctx);
const Lab = vm.runInContext('Lab', ctx);
const Ks = {}; let n = 0, devLo = 9, devHi = 0, sign = { '-1': 0, '1': 0 };
for (let s = 1; s <= 600; s++) {
  const d = Lab.make(s * 7919);
  if (d.cruc < 25 || d.cruc > 35) fail('crucible mass out of range, seed ' + s);
  if (d.loss < 0.003 || d.loss > 0.008) fail('boat loss out of range, seed ' + s);
  let total = 0;
  d.amounts.forEach(a => { if (a < 0.1 || a > 0.32) fail('a shake out of range, seed ' + s); total += a; });
  if (total < 3.2) fail('the bottle gives too little in all, seed ' + s);
  let c = 0; while (Lab.dispensed(d, c) < Lab.MIN_SOLID) c++;
  for (const extra of [0, 2, 4, 6]) {                    /* 1.5 g up to about 2.4 g of solid */
    const clicks = c + extra, mh = Lab.inCrucible(d, clicks), r = Lab.run(d, mh);
    if (Lab.dispensed(d, clicks) > Lab.MAX_SOLID + 0.01) continue;
    n++; Ks[r.K] = (Ks[r.K] || 0) + 1;
    if (r.K < Lab.MIN_HEATS || r.K > Lab.MAX_HEATS) fail('number of heatings ' + r.K + ', seed ' + s);
    if (r.contents.length !== r.K) fail('a mass for every heating, seed ' + s);
    for (let k = 1; k < r.K; k++) if (r.contents[k] > r.contents[k - 1] + 1e-9) fail('the mass goes up between heatings, seed ' + s);
    const last = r.contents[r.K - 1], prev = r.contents[r.K - 2];
    if (Math.abs(prev - last) > Lab.TOL + 1e-9) fail('the last two masses differ by more than 0.01 g, seed ' + s);
    for (let k = 3; k < r.K; k++) if (Math.abs(r.contents[k - 1] - r.contents[k - 2]) <= Lab.TOL * 0.9 - 0.0002) fail('stopped later than needed, seed ' + s);
    if (r.contents[0] - r.contents[1] < 0.04) fail('the first heating should lose most of the water, seed ' + s);
    const q = Lab.ratio(d, mh), dev = Math.abs(q.x - 5);
    devLo = Math.min(devLo, dev); devHi = Math.max(devHi, dev);
    if (dev < 0.095 || dev > 0.155) fail('the water ratio is ' + q.x.toFixed(3) + ', not 0.10 to 0.15 from 5, seed ' + s);
    sign[q.x > 5 ? 1 : -1]++;
    for (let k = 1; k <= r.K; k++) { const v = Lab.reading(d, mh, k); if (Math.abs(v * 10000 - Math.round(v * 10000)) > 1e-6) fail('a reading is not to 0.0001 g'); }
    if (r.hyd.length !== r.K + 1 || r.hyd[0] !== 1 || r.hyd[r.K] > 0.05) fail('hydration should run from 1 to about 0, seed ' + s);
  }
}
if (!sign[1] || !sign[-1]) fail('the error should go both ways (' + JSON.stringify(sign) + ')');
ok(n + ' runs: heatings ' + JSON.stringify(Ks) + '; ratio error ' + devLo.toFixed(3) + ' to ' + devHi.toFixed(3) + '; above/below 5: ' + sign[1] + '/' + sign[-1]);
if ((Ks[3] || 0) < n * 0.7) fail('most runs should be constant after 3 heatings');

/* 4. the page only asks for ids the scene has */
const scene = read('src/js/scene.js');
[...scene.matchAll(/\$\('([\w-]+)'\)/g)].forEach(m => { if (scene.indexOf('id="' + m[1] + '"') < 0 && scene.indexOf("id: '" + m[1] + "'") < 0) fail('scene id not drawn: ' + m[1]); });
ok('scene ids');

console.log(bad ? bad + ' problem(s)' : 'all good');
process.exit(bad ? 1 : 0);

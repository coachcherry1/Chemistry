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
if (!/MGO_LAB_/.test(man)) fail('own SCORM identifiers expected (MGO_LAB_*)');
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
  if (f.startsWith('src/') && /nitrate/i.test(t)) fail('"nitrate" in ' + f + ' (the product is a nitride)');
});
ok('no em dashes, no external addresses, class wording');

/* 3. the numbers */
const ctx = { window: {}, document: {}, console };
vm.createContext(ctx);
['util', 'data'].forEach(n => vm.runInContext(read('src/js/' + n + '.js') + '\n;this.__' + n + '=' + (n === 'util' ? 'UI' : 'Lab'), ctx));
vm.runInContext('var UI = this.__util; var Lab = this.__data;', ctx);
const Lab = vm.runInContext('Lab', ctx);
let lo = 9, hi = 0, loNo = 9, hiNo = 0;
for (let s = 1; s <= 400; s++) {
  const d = Lab.make(s * 7919);
  if (d.cruc < 25 || d.cruc > 35) fail('crucible mass out of range, seed ' + s);
  if (d.mg < 0.1 || d.mg > 0.2) fail('magnesium mass out of range, seed ' + s);
  [d.cruc, d.mg].forEach(x => { if (Math.abs(x * 10000 - Math.round(x * 10000)) > 1e-6) fail('a mass is not to 0.0001 g, seed ' + s); });
  let prev = -1;
  for (let k = 0; k <= 12; k++) {
    const r = Lab.ratio(d, k).ratio;
    if (r < prev - 0.02) fail('ratio falls as drops are added, seed ' + s);
    prev = r;
    if (k >= 6) { lo = Math.min(lo, r); hi = Math.max(hi, r); }
    if (k === 0) { loNo = Math.min(loNo, r); hiNo = Math.max(hiNo, r); }
    if (Lab.finalTotal(d, k) <= d.cruc + d.mg - 0.0002) fail('product lighter than the magnesium, seed ' + s);
  }
}
if (lo < 0.97 || hi > 1.03) fail('with the water step the O:Mg ratio should be about 1 (got ' + lo.toFixed(3) + ' to ' + hi.toFixed(3) + ')');
if (hiNo > 0.97) fail('without water the O:Mg ratio should be clearly low (up to ' + hiNo.toFixed(3) + ')');
ok('400 seeds: with water O:Mg ' + lo.toFixed(3) + ' to ' + hi.toFixed(3) + '; without water ' + loNo.toFixed(3) + ' to ' + hiNo.toFixed(3));

/* 4. the page only asks for ids the scene has */
const scene = read('src/js/scene.js');
[...read('src/js/scene.js').matchAll(/\$\('([\w-]+)'\)/g)].forEach(m => { if (scene.indexOf('id="' + m[1] + '"') < 0 && scene.indexOf("id: '" + m[1] + "'") < 0) fail('scene id not drawn: ' + m[1]); });
ok('scene ids');

console.log(bad ? bad + ' problem(s)' : 'all good');
process.exit(bad ? 1 : 0);

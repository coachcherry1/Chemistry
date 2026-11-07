/* answer-key.js: what the balance shows for a few seeds, and the sheet's calculation worked with the class's
 * roundings (Mg 24.3, O 16.0). node tools/answer-key.js > ANSWER_KEY.md */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'src/js/util.js'), 'utf8') + '\nthis.UI = UI;', ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'src/js/data.js'), 'utf8') + '\nthis.Lab = Lab;', ctx);
const Lab = ctx.Lab;
const out = [];
out.push('# Empirical Formula of Magnesium Oxide: virtual lab, answer key', '',
  'Each student gets different masses (from a seed, so a reload gives the same ones). Open the lab with `?seed=<number>` to see a particular set.',
  'A student who adds 6 or more drops of water gets an O : Mg mole ratio near 1.0 (the data scatter by up to about 3%). A student who skips the water gets a ratio near 0.93.', '',
  '| Seed | Box 1 crucible + lid | Box 2 Mg | Box 3 crucible + lid + Mg | Box 4 after (6 drops) | O (g) | mol Mg | mol O | O : Mg | O : Mg with no water |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
[1, 2, 3, 4, 5, 12345].forEach(s => {
  const d = Lab.make(s), b3 = Lab.r4(d.cruc + d.mg), b4 = Lab.finalTotal(d, 6), o = Lab.r4(b4 - b3);
  const nMg = d.mg / 24.3, nO = o / 16.0;
  out.push('| ' + [s, d.cruc.toFixed(4), d.mg.toFixed(4), b3.toFixed(4), b4.toFixed(4), o.toFixed(4), nMg.toFixed(5), nO.toFixed(5), (nO / nMg).toFixed(2),
    (Lab.ratio(d, 0).oxy / 16.0 / nMg).toFixed(2)].join(' | ') + ' |');
});
out.push('', 'Empirical formula: divide both mole amounts by the smaller; the data give Mg1O1, so MgO.');
console.log(out.join('\n'));

/* answer-key.js: what the balance shows for a few seeds, and the sheet's calculation worked with the class's
 * roundings (Cu 63.5, S 32.1, O 16.0, H 1.0). node tools/answer-key.js > ANSWER_KEY.md */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'src/js/util.js'), 'utf8') + '\nthis.UI = UI;', ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'src/js/data.js'), 'utf8') + '\nthis.Lab = Lab;', ctx);
const Lab = ctx.Lab;
const out = [];
out.push('# Formula of a Hydrate: virtual lab, answer key', '',
  'The solid is copper(II) sulfate pentahydrate, CuSO4 . 5H2O. Each student gets different masses (from a seed, so a reload gives the same ones) and shakes out about 2 g, so the mass of hydrate is the student\'s own.',
  'Open the lab with `?seed=<number>` to see a particular set. In every row below the student shook out the solid until the boat first passed 2.0 g.',
  'Real data are not perfect: the water : CuSO4 ratio is 0.10 to 0.15 away from 5 (above or below), so it rounds to 5. The mass is constant after 3 heatings (sometimes 4).', '',
  'Class masses: CuSO4 159.6 g/mol, H2O 18.0 g/mol.', '',
  '| Seed | Box 1 crucible + lid | Box 2 + hydrate | Heating 1 | Heating 2 | Heating 3 | Heating 4 | Water lost (g) | CuSO4 (g) | mol H2O | mol CuSO4 | Ratio | Formula |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
[1, 2, 3, 4, 5, 12345].forEach(s => {
  const d = Lab.make(s);
  let c = 0; while (Lab.dispensed(d, c) < 2.0) c++;
  const mh = Lab.inCrucible(d, c), r = Lab.run(d, mh), q = Lab.ratio(d, mh);
  const reads = []; for (let k = 1; k <= 4; k++) reads.push(k <= r.K ? Lab.reading(d, mh, k).toFixed(4) : '');
  out.push('| ' + [s, d.cruc.toFixed(4), Lab.r4(d.cruc + mh).toFixed(4)].concat(reads, [q.water.toFixed(4), q.salt.toFixed(4), q.nWater.toFixed(5), q.nSalt.toFixed(5), q.x.toFixed(2), 'CuSO4 . ' + Math.round(q.x) + 'H2O']).join(' | ') + ' |');
});
out.push('', 'Percent water = water lost / mass of hydrate x 100 (about 36%). Empirical formula: divide both mole amounts by the smaller; the water ratio rounds to 5, so CuSO4 . 5H2O, copper(II) sulfate pentahydrate.');
console.log(out.join('\n'));

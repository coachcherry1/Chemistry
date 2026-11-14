/* tools/load.js: loads the activity's scripts into one sandbox for the
 * validator and the answer key (no browser). The few DOM calls made while
 * the scripts load are stubbed. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'src');

function scripts() {
  const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  const out = [];
  html.replace(/<script src="([^"]+)"><\/script>/g, (m, f) => { out.push(f); return m; });
  return out;
}

function load() {
  const sandbox = {
    console, Math, JSON,
    document: { addEventListener() {}, getElementById() { return null; } },
    window: { addEventListener() {}, matchMedia() { return { matches: false }; } },
    URLSearchParams, location: { search: '' }
  };
  vm.createContext(sandbox);
  let code = '';
  scripts().forEach((f) => { code += fs.readFileSync(path.join(SRC, f), 'utf8') + '\n;'; });
  code += '\nthis.out = { CONFIG, UI, Chem, Ions, Rx, Data, Net, Particles, Gen, Ref, Beaker, Bench, Ladder, Steps, App };';
  vm.runInContext(code, sandbox, { filename: 'activity.js' });
  return sandbox.out;
}

module.exports = { load, scripts, SRC };

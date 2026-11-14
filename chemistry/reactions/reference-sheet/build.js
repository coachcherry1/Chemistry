/* build.js: writes the printable reference sheet, one Letter page, from the
 * same data the predicting-products package uses (its ions.js), so the sheet
 * and the activity can never disagree.
 *
 *   node build.js   ->  Activity_Series_and_Solubility_Rules.pdf        (the full sheet, with how to use the tables)
 *                       Activity_Series_and_Solubility_Rules_Assessment.pdf (the same tables, no rules for using them)
 *                       and the .html each is printed from
 *
 * Needs Playwright (Chromium prints the page). The font is Times New Roman
 * where it is installed, otherwise Liberation Serif, which has the same
 * letter widths; the font is embedded in the PDF.
 */
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const { Ions } = require('../predicting-products-scorm/src/js/ions.js');

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const formula = (f) => esc(f).replace(/\d/g, (d) => '<sub>' + d + '</sub>');
const info = (k, cat) => (cat ? Ions.CATIONS[k] : Ions.ANIONS[k]) || Ions.SHEET_IONS[k];
const ion = (k, cat) => { const t = info(k, cat); return formula(t[0]) + '<sup>' + (t[1] > 1 ? t[1] : '') + (cat ? '+' : '−') + '</sup>'; };
function cations(list) {
  if (!list.length) return '<i>none</i>';
  const g1 = Ions.G1.every((k) => list.indexOf(k) >= 0);
  const rest = (g1 ? list.filter((k) => Ions.G1.indexOf(k) < 0) : list).map((k) => ion(k, true));
  return (g1 ? ['Group 1'] : []).concat(rest).join(', ');
}

/* ---- the activity series: a row per metal, the tiers as bands with a label down the side */
const tierRows = {};
Ions.SERIES.forEach((m) => { if (m[0] !== 'H') { const t = Ions.tier(m[0]); tierRows[t] = (tierRows[t] || 0) + 1; } });
const TIER_TEXT = { water: 'React with cold water,<br>steam and acids', steam: 'React with steam<br>and acids', acid: 'React with<br>acids', none: 'Do not replace<br>hydrogen' };
let seenTier = {};
const seriesRows = Ions.SERIES.map((m) => {
  if (m[0] === 'H') return '<tr class="hyd"><td>Hydrogen</td><td>H<sub>2</sub></td><td>2 H<sup>+</sup> + 2 e<sup>−</sup></td><td class="band hydband">reference</td></tr>';
  const t = Ions.tier(m[0]);
  const band = seenTier[t] ? '' : '<td class="band b-' + t + '" rowspan="' + tierRows[t] + '"><span>' + TIER_TEXT[t] + '</span></td>';
  seenTier[t] = 1;
  const q = m[2];
  return '<tr class="t-' + t + '"><td>' + m[1].charAt(0).toUpperCase() + m[1].slice(1) + '</td><td>' + m[0] + '</td><td>' + m[0] + '<sup>' + (q > 1 ? q : '') + '+</sup> + ' +
    (q > 1 ? q + ' ' : '') + 'e<sup>−</sup></td>' + band + '</tr>';
}).join('\n');

function solRows(list, key) {
  return list.map((r) => {
    const a = info(r.an, false);
    return '<tr><td class="an"><b>' + a[2] + '</b></td><td class="f">' + ion(r.an, false) + '</td><td>' + cations(r[key]) + (r.note ? ' <span class="note">(' + r.note + ')</span>' : '') +
      '</td></tr>';
  }).join('\n');
}

/* assess: the assessment sheet, the same tables without the rules for using them (students are to know those by heart) */
const page = (assess) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Activity Series and Solubility Rules</title>
<style>
  @page { size: Letter; margin: 0.55in 0.6in; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Times New Roman", "Liberation Serif", Tinos, Times, serif; font-size: 11pt; color: #000; line-height: 1.22; }
  h1 { font-size: 19pt; text-align: center; margin: 0 0 2pt; letter-spacing: 0.01em; }
  .sub { text-align: center; font-style: italic; font-size: 10.5pt; margin: 0 0 10pt; }
  .cols { display: grid; grid-template-columns: 3.1in 1fr; gap: 0.3in; align-items: start; }
  h2 { font-size: 13.5pt; margin: 0 0 3pt; border-bottom: 1.5pt solid #000; padding-bottom: 1pt; }
  h3 { font-size: 11.5pt; margin: 9pt 0 2pt; }
  p { margin: 0 0 4pt; }
  .how { font-size: 10pt; }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 1.1pt 5pt; vertical-align: middle; }
  th { text-align: left; font-size: 9.5pt; border-bottom: 1pt solid #000; font-weight: bold; }
  .series td { border-bottom: 0.4pt solid #999; font-size: 10.6pt; }
  .series td:nth-child(2) { font-weight: bold; width: 0.42in; }
  .series tr.hyd td { background: #000; color: #fff; font-weight: bold; border-bottom: 0; }
  .series .band { border-left: 1.2pt solid #000; border-bottom: 1.2pt solid #000; border-top: 1.2pt solid #000; border-right: 1.2pt solid #000; text-align: center; font-size: 9.2pt; font-weight: bold; width: 0.98in; line-height: 1.15; }
  .series .hydband { background: #000; color: #fff; border-color: #000; font-weight: normal; font-style: italic; }
  .b-water { background: #d9d9d9; } .b-steam { background: #ececec; } .b-acid { background: #f6f6f6; } .b-none { background: #fff; }
  .arrow { font-size: 9.5pt; font-style: italic; margin: 2pt 0 3pt; }
  .hal { border: 1pt solid #000; padding: 4pt 7pt; margin-top: 8pt; font-size: 10.6pt; }
  .hal b { font-size: 11.5pt; }
  .sol td { border-bottom: 0.4pt solid #999; font-size: 10.4pt; }
  .sol .an { width: 0.82in; } .sol .f { width: 0.68in; white-space: nowrap; }
  .always { border: 1pt solid #000; padding: 4pt 7pt; margin: 0 0 6pt; font-size: 10.8pt; background: #f1f1f1; }
  .note { font-size: 9pt; font-style: italic; }
  .foot { font-size: 9.3pt; margin-top: 7pt; }
  .foot li { margin-bottom: 1.5pt; }
  ul { margin: 2pt 0 0; padding-left: 13pt; }
  sub, sup { font-size: 0.7em; line-height: 0; }
</style></head><body>
<h1>Activity Series and Solubility Rules</h1>
<p class="sub">Honors Chemistry reference sheet</p>
<div class="cols">
<section>
  <h2>Activity Series of the Metals</h2>
  <p class="arrow">Most active at the top. Each metal is shown with the ion it forms.</p>
  <table class="series">
    <thead><tr><th>Metal</th><th></th><th>Forms</th><th style="text-align:center">Replaces hydrogen?</th></tr></thead>
    <tbody>
${seriesRows}
    </tbody>
  </table>
  <div class="hal"><b>Halogens:</b> &nbsp; F<sub>2</sub> &nbsp;&gt;&nbsp; Cl<sub>2</sub> &nbsp;&gt;&nbsp; Br<sub>2</sub> &nbsp;&gt;&nbsp; I<sub>2</sub><br><span class="note">most active first</span></div>
  ${assess ? '' : `  <h3>Using the series (single replacement)</h3>
  <ul class="how">
    <li>A metal replaces any metal <b>below</b> it from a compound. If it is not below, there is <b>no reaction</b>.</li>
    <li>A metal above H<sub>2</sub> replaces the hydrogen of an acid; H<sub>2</sub> forms.</li>
    <li>Only the metals from Li to Na replace hydrogen from cold water (HOH); a metal hydroxide and H<sub>2</sub> form.</li>
  </ul>`}
</section>
<section>
  <h2>Solubility Rules for Ionic Compounds in Water</h2>
  <div class="always"><b>Always soluble:</b> compounds of the <b>Group 1</b> ions (Li<sup>+</sup>, Na<sup>+</sup>, K<sup>+</sup>, Rb<sup>+</sup>, Cs<sup>+</sup>) and of ammonium, NH<sub>4</sub><sup>+</sup>.</div>
  <h3>Compounds of these ions are soluble (aq) ...</h3>
  <table class="sol">
    <thead><tr><th colspan="2">Negative ion</th><th>... except with (insoluble)</th></tr></thead>
    <tbody>
${solRows(Ions.TABLE.soluble, 'not')}
    </tbody>
  </table>
  <h3>Compounds of these ions are insoluble (s) ...</h3>
  <table class="sol">
    <thead><tr><th colspan="2">Negative ion</th><th>... except with (soluble)</th></tr></thead>
    <tbody>
${solRows(Ions.TABLE.insoluble, 'but')}
    </tbody>
  </table>
  ${assess ? '' : `<h3>Using the rules (double replacement)</h3>
  <ul class="how">
    <li>Trade the partners of the two compounds and look up <b>both</b> products.</li>
    <li>Find the negative ion first, then check whether the positive ion is an exception.</li>
    <li>An insoluble product is a solid, (s): a reaction happens. If both products are soluble, (aq), there is <b>no reaction</b>.</li>
  </ul>`}
  <ul class="foot">
    <li>Hg<sub>2</sub><sup>2+</sup> is the mercury(I) ion.</li>
  </ul>
</section>
</div>
</body></html>`;

(async () => {
  const b = await chromium.launch();
  for (const [assess, name] of [[false, 'Activity_Series_and_Solubility_Rules'], [true, 'Activity_Series_and_Solubility_Rules_Assessment']]) {
    const out = path.join(__dirname, name), html = page(assess);
    fs.writeFileSync(out + '.html', html);
    const pg = await b.newPage();
    await pg.setContent(html, { waitUntil: 'load' });
    const font = await pg.evaluate(() => document.fonts.check('11pt "Times New Roman"'));
    await pg.pdf({ path: out + '.pdf', format: 'Letter', printBackground: true, preferCSSPageSize: true });
    const pages = (fs.readFileSync(out + '.pdf', 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    console.log('wrote ' + name + '.pdf: ' + pages + ' page(s); Times New Roman resolved: ' + font);
    await pg.close();
    if (pages !== 1) { await b.close(); process.exit(1); }
  }
  await b.close();
})();

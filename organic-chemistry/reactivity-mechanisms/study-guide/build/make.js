/* make.js: node build/make.js
 * Renders the figures and writes Reactions_and_Mechanisms_Study_Guide.docx
 * and ..._Answer_Key.docx into the study-guide folder.
 */
const fs = require('fs'), path = require('path');
const D = require('/opt/node22/lib/node_modules/docx');
const { open, render } = require('./figures');
const Q = require('./questions').map((q, i) => Object.assign({ id: i + 1 }, q));
const OUTDIR = path.resolve(__dirname, '..');

const FONT = 'Calibri';
const SCALE = 0.8, MAXW = 720;   /* CSS px to docx px (96 per inch): 7.5 in text width at 0.5 in margins */

const run = (t, o) => new D.TextRun(Object.assign({ text: t, font: FONT, size: 22 }, o || {}));
const para = (kids, o) => new D.Paragraph(Object.assign({ children: kids, keepLines: true }, o || {}));
function img(f) {
  let w = f.w * SCALE, h = f.h * SCALE;
  if (w > MAXW) { h = h * MAXW / w; w = MAXW; }
  return new D.ImageRun({ type: 'png', data: fs.readFileSync(f.file), transformation: { width: Math.round(w), height: Math.round(h) } });
}
const letter = (i) => 'abcdefgh'[i] + ') ';
const LET = (i) => '(' + 'abcdefgh'[i] + ') ';

/* the answer to "will it rearrange" in words */
function shiftText(a, id) {
  if (!a.yes) {
    if (id === 'gBenzyl') return 'No. The carbocation is next to a benzene ring, so resonance already spreads its + charge over the ring. Moving an H from the CH₃ would only make a 1° carbocation, which is much less stable.';
    const o = a.from === 3 ? '3°' : a.from === 2 ? '2°' : '1°';
    return 'No. It is ' + o + ', and moving an H or a CH₃ from a neighbouring carbon would only make another carbocation that is no more stable (' + (a.from === 2 ? '2° or 1°' : '1°') + '). A carbocation rearranges only when the new one is more stable.';
  }
  const ord = (n) => (n === 3 ? '3°' : n === 2 ? '2°' : '1°');
  return 'Yes, a ' + (a.kind === 'hydride' ? 'hydride shift: an H moves' : 'methyl shift: a CH₃ moves') + ' from the next carbon to the C⁺ with its pair of electrons. The ' + ord(a.from) + ' carbocation becomes a more stable ' + ord(a.to) + ' carbocation.';
}

/* the part letter goes inside the picture, so a question can be cut out whole */
function withLead(fig, on, i) {
  if (!on) return fig;
  const f = Object.assign({}, fig, { lead: 'abcdefgh'[i] });
  if (f.row) f.row = f.row.map((c) => Object.assign({}, c, { label: null }));
  return f;
}

(async () => {
  const { b, p, errs } = await open();
  const chainIds = ['k633', 'xTbuOH', 'f631', 'k649', 'gDehyd', 'gHydr', 'f623', 'k629', 'ester', 'acylAttack', 'tetLoss', 'alkeneH3O', 'deprotKetone', 'cMeAttack', 'dIsobuteneHBr'];
  const shiftIds = ['r1', 'r3', 'r6', 'r8', 'r5', 'r7', 'gR3', 'gBu2', 'gBenzyl'];
  const nameIds = [].concat(...Q.filter((q) => q.names).map((q) => q.names));
  const A = await p.evaluate(({ c, s, n }) => window.__answers(c, s, n), { c: chainIds, s: shiftIds, n: nameIds });
  const F = {};      /* figures by name */

  /* ---------------------------------------------------- render figures */
  for (const q of Q) {
    if (q.fig) F['q' + q.id] = await render(p, 'q' + q.id, q.fig);
    (q.parts || []).forEach(() => 0);
    for (let i = 0; i < (q.parts || []).length; i++) {
      const pt = q.parts[i], nm = 'q' + q.id + 'p' + i;
      if (pt.fig && !pt.noFig) F[nm] = await render(p, nm, withLead(pt.fig, !(pt.text || (pt.fig.row && pt.fig.row.length > 1 && !q.parts.some((x) => x.shift))), i));
      if (pt.key) F[nm + 'key'] = await render(p, nm + 'key', { row: [{ label: 'abcd'[i], mol: pt.key.mol, partial: pt.key.partial }] });
      if (pt.fig && pt.fig.chain && (q.chainAnswers || pt.chainAnswers)) F[nm + 'key'] = await render(p, nm + 'key', { chain: pt.fig.chain, arrows: true, names: true, lead: pt.text ? null : 'abcdefgh'[i] });
      if (pt.shift) {
        const a = A.shifts[pt.shift];
        if (a.yes) F[nm + 'key'] = await render(p, nm + 'key', { row: [{ label: null, shiftArrow: pt.shift }, { label: null, shiftProduct: pt.shift }] });
      }
      if (pt.mcChain) F[nm + 'key'] = F[nm];
    }
  }
  if (errs.length) console.error('PAGE ERRORS', errs.join('\n'));
  await b.close();

  /* ---------------------------------------------------- the student guide */
  const kids = [];
  kids.push(para([run('Reactions and Mechanisms Study Guide', { bold: true, size: 28 }), run('\t\tName______________________________')],
    { tabStops: [{ type: D.TabStopType.RIGHT, position: 10800 }], spacing: { after: 60 } }));
  kids.push(para([run('Klein, Chapter 6. Every question stands alone, so you can work them in any order. Answers are in the separate answer key.', { italics: true, size: 20 })], { spacing: { after: 200 } }));

  const stem = (q) => para([run(q.id + ') ', { bold: true }), run(q.stem)], { keepNext: true, spacing: { before: 200, after: 80 } });
  const MCS = (q, pt) => {
    const a = A.chains[pt.mcChain].map((x) => x.pat.join(' + '));
    return mcChoices(a);
  };
  function mcChoices(correct) {
    const P = ['Nucleophilic attack', 'Loss of a leaving group', 'Proton transfer', 'Carbocation rearrangement'];
    const j = (arr) => arr.join(', followed by ').toLowerCase();
    const alts = [];
    const swap = (arr, i, k) => { const c = arr.slice(); [c[i], c[k]] = [c[k], c[i]]; return c; };
    alts.push(swap(correct, 0, 1)); alts.push(swap(correct, correct.length - 2, correct.length - 1));
    const rep = correct.slice(); rep[1] = P.find((x) => x !== correct[1] && x !== 'Carbocation rearrangement' && x !== correct[0]) || P[0]; alts.push(rep);
    const all = [correct, ...alts];
    const uniq = []; const seen = new Set();
    all.forEach((c) => { const k = c.join('|'); if (!seen.has(k)) { seen.add(k); uniq.push(c); } });
    let n = 0; while (uniq.length < 4) { const c = correct.slice(); c[0] = P[(n++) % 4]; const k = c.join('|'); if (!seen.has(k)) { seen.add(k); uniq.push(c); } }
    return uniq.slice(0, 4).map(j);
  }
  const mcOrder = [[2, 0, 3, 1], [1, 3, 0, 2]];   /* where the correct choice sits, per part */

  Q.forEach((q) => {
    kids.push(stem(q));
    if (q.fig) kids.push(para([img(F['q' + q.id])], { keepNext: false, spacing: { after: 120 } }));
    (q.parts || []).forEach((pt, i) => {
      const nm = 'q' + q.id + 'p' + i;
      const last = i === q.parts.length - 1;
      if (pt.noFig) { kids.push(para([run(pt.text)], { keepNext: false, spacing: { after: 360 } })); return; }
      if (pt.fig && pt.fig.row && pt.fig.row.length > 1 && !q.parts.some((x) => x.shift)) { kids.push(para([img(F[nm])], { spacing: { after: 160 } })); return; }
      const lead = pt.text ? pt.text + ' ' : letter(i);
      if (q.mc) {
        kids.push(para([img(F[nm])], { keepNext: true }));
        const ch = MCS(q, pt), order = mcOrder[i];
        const shown = [0, 1, 2, 3].map((k) => (k === order[0] ? 0 : null));
        const rest = ch.slice(1);
        let r = 0;
        const list = [0, 1, 2, 3].map((k) => (k === order[0] ? ch[0] : rest[r++]));
        list.forEach((t, k) => kids.push(para([run('(' + 'abcd'[k] + ') ' + t)], { indent: { left: 360 }, keepNext: k < 3, spacing: { after: 20 } })));
        kids.push(para([run('')], { spacing: { after: 100 } }));
        return;
      }
      kids.push(para(pt.text ? [run(pt.text + ' '), img(F[nm])] : [img(F[nm])], { keepNext: false, spacing: { after: pt.shift ? 900 : 260 } }));
    });
    if (q.short) q.short.forEach((s, i) => kids.push(para([run(letter(i) + s.q)], { spacing: { after: 560 }, keepLines: true })));
  });

  /* ---------------------------------------------------- the answer key */
  const key = [];
  key.push(para([run('Reactions and Mechanisms Study Guide: Answer Key', { bold: true, size: 28 })], { spacing: { after: 200 } }));
  Q.forEach((q) => {
    key.push(para([run(q.id + ') ', { bold: true }), run(q.stem.split(/(?<=[.?]) /)[0], { italics: true, size: 20 })], { keepNext: true, spacing: { before: 200, after: 60 } }));
    (q.parts || []).forEach((pt, i) => {
      const nm = 'q' + q.id + 'p' + i;
      if (q.id === 1 || (q.id === 2)) {
        key.push(para([run(letter(i), { bold: true }), run(pt.ans + (q.id === 1 ? '. ' : ' '), { bold: q.id === 1 }), run(pt.why || '')], { keepNext: !!pt.key }));
        if (pt.key) key.push(para([img(F[nm + 'key'])], { spacing: { after: 80 } }));
      } else if (q.chainAnswers || pt.chainAnswers) {
        const names = A.chains[pt.fig.chain].map((x, k) => (k + 1) + '. ' + x.pat.join(' + ') + (x.concerted ? ' (concerted)' : '')).join('   ');
        if (!pt.fig.chain || !F[nm + 'key'] || q.stem.startsWith('For each mechanism')) key.push(para([run(pt.text ? pt.text.slice(0, 3) : letter(i), { bold: true }), run(names)], { keepNext: false }));
        else key.push(para([img(F[nm + 'key'])], { spacing: { after: 100 } }));
      } else if (pt.shift) {
        const a = A.shifts[pt.shift];
        key.push(para([run(letter(i), { bold: true }), run(shiftText(a, pt.shift))], { keepNext: a.yes }));
        if (a.yes) key.push(para([img(F[nm + 'key'])], { spacing: { after: 100 } }));
      } else if (q.mc) {
        const order = mcOrder[i];
        key.push(para([run(letter(i), { bold: true }), run('(' + 'abcd'[order[0]] + ') ' + MCS(q, pt)[0] + '.')], { keepNext: false }));
      } else if (pt.noFig) {
        key.push(para([run(pt.text.slice(0, 3), { bold: true }), run(pt.ans)]));
      }
    });
    if (q.names) key.push(para(q.names.flatMap((id, i) => [run(letter(i), { bold: true }), run(A.names[id] + (i < q.names.length - 1 ? '     ' : ''))])));
    if (q.ansText) key.push(para([run(q.ansText)]));
    if (q.short) q.short.forEach((s, i) => key.push(para([run(letter(i), { bold: true }), run(s.a)], { spacing: { after: 60 } })));
  });

  const sec = (children) => ({ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children });
  const opt = { styles: { default: { document: { run: { font: FONT, size: 22 } } } } };
  const w = (name, children) => D.Packer.toBuffer(new D.Document(Object.assign({ sections: [sec(children)] }, opt))).then((buf) => { fs.writeFileSync(path.join(OUTDIR, name), buf); console.log('wrote', name); });
  await w('Reactions_and_Mechanisms_Study_Guide.docx', kids);
  await w('Reactions_and_Mechanisms_Study_Guide_Answer_Key.docx', key);
})();

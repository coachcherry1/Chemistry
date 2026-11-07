/* tools/tables.js: other periodic tables, played through the real judges.
 *
 * Students do not all use the class's table (masses to tenths). For each
 * table below, every problem of many sets is worked the way such a student
 * would: the molar mass typed in the blank is their own table's, rounded to
 * tenths (or the class's, read off the screen), the calculator gets their
 * own table's full masses, and the answer is rounded to the right
 * significant figures. Chem.judgeMM and Chem.judgeAnswer then mark it, so
 * this checks the tolerance (Chem.TOL, 1.5%) end to end.
 *
 * Used by tools/validate.js (every table here must always pass) and
 * tools/answer-key.js (the table of results for the teacher).
 */
module.exports = function (ctx) {
  const { ELEMENTS, Chem, Gen } = ctx;
  const std = (x) => parseFloat(ELEMENTS[x].std);
  const round = (v, d) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);

  /* must: every problem must pass with this table (validator) */
  const TABLES = [
    { name: 'Two decimals (H 1.01, C 12.01, Cl 35.45)', must: true, mass: (x) => round(std(x), 2) },
    { name: 'Full masses (H 1.008, C 12.011, Cl 35.45)', must: true, mass: (x) => std(x), av: 6.022e23 },
    { name: 'The class table but H 1.008', must: true, mass: (x) => (x === 'H' ? 1.008 : Chem.t10(x) / 10) },
    { name: 'Whole numbers, Cl 35.5 (Mg 24, Fe 56)', must: true, mass: (x) => (x === 'Cl' ? 35.5 : Math.round(std(x))) },
    { name: 'Whole numbers, Cl 35', must: true, mass: (x) => Math.round(std(x)) }
  ];

  function M(key, t) {
    const c = Chem.sp(key).counts;
    return Object.keys(c).reduce((s, x) => s + c[x] * t.mass(x), 0);
  }

  /* the chain on the student's calculator: their molar masses, their 6.02 */
  function studentValue(p, t) {
    let v = p.given.v;
    p.path.forEach((tl) => {
      const e = Chem.edge(tl.e);
      const val = (side) => (side.blank === 'mm' ? M(e.s, t) : e.type === 'av' && side.v === Chem.AV ? (t.av || Chem.AV) : side.v);
      const top = tl.f ? e.R : e.L, bot = tl.f ? e.L : e.R;
      v = v * val(top) / val(bot);
    });
    return v;
  }

  function problems(seeds) {
    const out = [];
    for (let seed = 1; seed <= seeds; seed++) {
      Gen.set(seed).forEach((p) => out.push(p));
      Gen.WARM.forEach((w) => out.push(Gen.warm(seed, w)));
    }
    return out;
  }

  /* returns, per table: blanks refused, answers refused (typing their own
     molar mass, or the class's), out of how many, and a few examples */
  function run(seeds) {
    const list = problems(seeds);
    return TABLES.map((t) => {
      const r = { name: t.name, must: t.must, blanks: 0, own: 0, cls: 0, n: 0, nBlanks: 0, examples: [] };
      list.forEach((p) => {
        r.n++;
        const vals = {};
        let blankOK = true;
        p.path.forEach((tl) => {
          const e = Chem.edge(tl.e);
          if (e.type !== 'mm') return;
          r.nBlanks++;
          const typed = round(M(e.s, t), 1).toFixed(1);
          const j = Chem.judgeMM(e.s, typed);
          if (!j.ok) {
            blankOK = false;
            r.blanks++;
            if (r.examples.length < 4) r.examples.push('blank ' + Chem.disp(e.s) + ' typed ' + typed + ' (class ' + Chem.mmText(e.s) + ')');
          } else vals[tl.e] = j.v;
        });
        const raw = Chem.fmtSig(studentValue(p, t), p.given.sig, true);
        if (blankOK && !Chem.judgeAnswer(raw, Chem.chainValue(p.given.v, p.path, vals), p.given.sig, { also: p.ans }).ok) {
          r.own++;
          if (r.examples.length < 4) r.examples.push(p.promptText + ' typed ' + raw + ' (expected ' + p.ansAscii + ')');
        }
        if (!Chem.judgeAnswer(raw, p.ans, p.given.sig).ok) {
          r.cls++;
          if (r.examples.length < 4) r.examples.push('(class molar mass in the blank) ' + p.promptText + ' typed ' + raw + ' (expected ' + p.ansAscii + ')');
        }
      });
      return r;
    });
  }

  return { TABLES, M, run };
};

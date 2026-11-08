/* tools/tables.js: other periodic tables, played through the real judges.
 *
 * Students do not all use the class's table (masses to tenths). For each
 * table below, every problem of many sets is worked the way such a student
 * would: the molar masses typed are their own table's, rounded to tenths;
 * the calculator gets their table's full masses; moles are typed to 3
 * significant figures and the quotients to 2 decimal places, from those
 * typed moles. Chem's judges then mark every box, and the quotients must
 * still read as the right fraction (the multiplier and the whole numbers
 * must be the right ones). This checks the tolerances (Chem.TOL 1.5% for
 * molar masses and moles, Chem.QTOL for quotients) and the data end to end.
 *
 * Used by tools/validate.js (every table must always pass) and
 * tools/answer-key.js (the table of results for the teacher).
 */
module.exports = function (ctx) {
  const { ELEMENTS, Chem, Gen } = ctx;
  const std = (x) => parseFloat(ELEMENTS[x].std);
  const round = (v, d) => Math.round(v * Math.pow(10, d)) / Math.pow(10, d);

  const TABLES = [
    { name: 'The class table (tenths)', mass: (x) => Chem.t10(x) / 10 },
    { name: 'Two decimals (H 1.01, C 12.01, Cl 35.45)', mass: (x) => round(std(x), 2) },
    { name: 'Full masses (H 1.008, C 12.011, Cl 35.45)', mass: (x) => std(x) },
    { name: 'The class table but H 1.008', mass: (x) => (x === 'H' ? 1.008 : Chem.t10(x) / 10) },
    { name: 'Whole numbers, Cl 35.5 (Mg 24, Fe 56)', mass: (x) => (x === 'Cl' ? 35.5 : Math.round(std(x))) },
    { name: 'Whole numbers, Cl 35', mass: (x) => Math.round(std(x)) }
  ];

  function M(f, t) {
    const c = Chem.info(f).counts;
    return Object.keys(c).reduce((s, x) => s + c[x] * t.mass(x), 0);
  }

  /* Works one problem with one table; returns a list of what was refused. */
  function work(p, t) {
    const bad = [];
    const need = (j, what) => { if (!j.ok) bad.push(what + ': ' + (j.msg || j.kind || 'refused')); return j; };
    const g = p.rows.map((r) => {
      if (r.typed) need(Chem.judgeGrams(r.gStr, r.g, r.how, { pct: r.pct, dp: r.dp }), 'grams ' + r.key);
      return r.g;
    });
    const mol = p.rows.map((r, i) => {
      const typedMM = round(M(r.mmF, t), 1).toFixed(1);
      const jm = need(Chem.judgeMM(r.mmF, typedMM), 'molar mass of ' + r.mmF + ' typed ' + typedMM);
      const calc = g[i] / M(r.mmF, t);
      const molStr = Chem.fmtSig(calc, 3);
      need(Chem.judgeMoles(molStr, g[i], jm.ok ? jm.v : parseFloat(typedMM), Chem.mmValue(r.mmF), r.atom), 'moles ' + r.key + ' typed ' + molStr);
      if (!r.per) return parseFloat(molStr);
      need(Chem.judgePer(String(r.per), r.atom, r.molecule), 'atoms per ' + r.molecule);
      const atomStr = Chem.fmtSig(parseFloat(molStr) * r.per, 3);
      need(Chem.judgeAtomMoles(atomStr, parseFloat(molStr), r.per, r.atom, r.molecule), 'moles ' + r.atom + ' typed ' + atomStr);
      return parseFloat(atomStr);
    });
    const min = Math.min.apply(null, mol);
    const sm = mol.indexOf(min);
    if (!Chem.smallestOK(mol, sm)) bad.push('smallest');
    const m = Gen.model(p);
    const q = mol.map((v, i) => {
      const s = Chem.fmtQ(v / min);
      need(Chem.judgeQuotient(s, v / min, m.rows[i].q, {}), 'quotient ' + p.rows[i].key + ' typed ' + s);
      return parseFloat(s);
    });
    const k = Chem.multiplierFor(q);
    if (k !== p.mult) bad.push('quotients ' + q.join(', ') + ' read as x' + k + ', not x' + p.mult);
    else {
      need(Chem.judgeMultiplier(String(k), q, p.mult), 'multiplier');
      p.rows.forEach((r, i) => {
        const w = Chem.wholeAfter(q[i], k);
        if (w !== r.sub) bad.push(r.key + ': ' + q[i] + ' x ' + k + ' gives ' + w + ', not ' + r.sub);
        else need(Chem.judgeWhole(String(w), q[i], k, r.sub), 'whole number ' + r.key);
      });
    }
    if (p.mol) {
      const efmStr = round(M(p.ef, t), 1).toFixed(1);
      const je = need(Chem.judgeMM(p.ef, efmStr), 'empirical formula mass typed ' + efmStr);
      const n = Math.round(p.mol.M / parseFloat(efmStr));
      if (n !== p.mol.n) bad.push('n = ' + p.mol.M + ' / ' + efmStr + ' rounds to ' + n);
      else need(Chem.judgeN(String(n), p.mol.M, je.v || parseFloat(efmStr), p.mol.n), 'n');
      p.order.forEach((x) => need(Chem.judgeSub(String(p.mol.counts[x]), p.mol.counts[x], p.efCounts[x], p.mol.n, x), 'subscript ' + x));
    }
    return bad;
  }

  function problems(seeds) {
    const out = [Gen.example()];
    for (let seed = 1; seed <= seeds; seed++) {
      Gen.set(seed).forEach((p) => out.push(p));
      Gen.WARM.forEach((w) => out.push(Gen.warm(seed, w)));
    }
    return out;
  }

  /* per table: problems worked, problems with a refusal, a few examples */
  function run(seeds) {
    const list = problems(seeds);
    return TABLES.map((t) => {
      const r = { name: t.name, n: 0, refused: 0, examples: [] };
      list.forEach((p) => {
        r.n++;
        const bad = work(p, t);
        if (bad.length) {
          r.refused++;
          if (r.examples.length < 4) r.examples.push(p.id + ' ' + p.f + ': ' + bad.slice(0, 2).join('; '));
        }
      });
      return r;
    });
  }

  return { TABLES, M, work, run };
};

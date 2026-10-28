/* groups.js — the IR label vocabulary: functional groups and the feedback
 * wording shown for each.
 *
 * Copied from the IR package. The groups, ranges and hints are unchanged; the
 * helper functions are renamed with an `ir` prefix (irKey, irLabel, irSub,
 * IR_UNIVERSE) because fragments.js defines its own keyLabel, keySub and
 * UNIVERSE for the mass spectrum, and both files now load into one page.
 *
 * Level 1 asks for the FAMILY of a band ("there is a C=O here"); Levels 2-4
 * ask for the specific GROUP ("that O-H is an alcohol, not an acid").
 *
 * Two flags change how a group is used:
 *
 *   atomic      the family label is too coarse to be a fair question, so this
 *               group is asked for by name at EVERY level. The four C-H groups
 *               are atomic because "C-H" alone would make the peaks either side
 *               of 3000 interchangeable; the three N-H groups are atomic so a
 *               student can see 1 amine, 2 amine and amide as separate labels.
 *
 *   fingerprint the band lies below 1500 cm-1, outside the diagnostic region.
 *               It is drawn and it appears in the correlation table, but it is
 *               never a drop target and never a distractor.
 *
 * `hint` is the one-line rationale shown when a student drops the wrong tile,
 * so the feedback teaches the discriminator rather than just saying "no".
 */

var FAMILIES = {
  oh:       { label: 'O–H',            aka: 'O–H stretch' },
  nh:       { label: 'N–H',            aka: 'N–H stretch' },
  ch:       { label: 'C–H',            aka: 'C–H stretch' },
  triple:   { label: 'C≡N or C≡C', aka: 'triple-bond stretch' },
  carbonyl: { label: 'C=O',                 aka: 'carbonyl stretch' },
  cc:       { label: 'C=C',                 aka: 'double-bond stretch' },
  cosingle: { label: 'C–O',            aka: 'C–O single-bond stretch' },
  no2:      { label: 'N–O',            aka: 'nitro stretch' }
};

var GROUPS = {
  /* ---- X–H stretch region, 4000–2500 ---- */
  oh_alcohol: {
    family: 'oh', label: 'O–H (alcohol)', range: '3200–3600',
    hint: 'Broad and rounded, but it ends before 3100 — an alcohol O–H, not an acid.'
  },
  oh_acid: {
    family: 'oh', label: 'O–H (carboxylic acid)', range: '2500–3300',
    hint: 'Enormously broad — it swallows the C–H peaks and runs down past 2600. Only a carboxylic acid does that.'
  },
  nh_amine1: {
    family: 'nh', label: 'N–H (1° amine)', range: '3300–3400', atomic: true,
    hint: 'COUNT THE SPIKES — two of them means two N–H bonds, so a primary amine. Weak and fairly sharp.'
  },
  nh_amine2: {
    family: 'nh', label: 'N–H (2° amine)', range: '3280–3350', atomic: true,
    hint: 'COUNT THE SPIKES — one weak N–H means a single N–H bond, so a secondary amine.'
  },
  nh_amide: {
    family: 'nh', label: 'N–H (amide)', range: '3150–3400', atomic: true,
    hint: 'An N–H stretch sitting above a carbonyl — N–H plus C=O in the same spectrum is an amide.'
  },
  ch_sp3: {
    family: 'ch', label: 'C–H (sp³ alkyl)', range: '2850–3000', atomic: true,
    hint: 'RIGHT of the 3000 line — the hydrogen is on an sp³ carbon. Almost every organic spectrum has this.'
  },
  ch_sp2: {
    family: 'ch', label: 'C–H (sp² vinyl/aryl)', range: '3000–3100', atomic: true,
    hint: 'LEFT of the 3000 line — the hydrogen is on an sp² carbon, an alkene or a ring. That side of 3000 is the whole test.'
  },
  ch_sp: {
    family: 'ch', label: '≡C–H (sp C–H, terminal alkyne)', range: '3290–3320', atomic: true,
    hint: 'A narrow, strong spike near 3300 — an sp hybridised C–H. Far left of 3000, and much sharper than any O–H.'
  },
  ch_aldehyde: {
    family: 'ch', label: 'C–H (aldehyde)', range: '2690–2850', atomic: true,
    hint: 'The two weak peaks near 2820 and 2720 are the aldehyde C–H Fermi doublet — they prove –CHO.'
  },

  /* ---- triple-bond region, 2500–2000 ---- */
  cn_nitrile: {
    family: 'triple', label: 'C≡N (nitrile)', range: '2210–2260',
    hint: 'Sharp and medium-strength near 2250 — nitrile. A C≡C would be much weaker.'
  },
  cc_alkyne: {
    family: 'triple', label: 'C≡C (alkyne)', range: '2100–2260',
    hint: 'Weak and near 2120 — an alkyne. Nitriles sit higher and are stronger.'
  },

  /* ---- carbonyl region ----
     One label for every C=O. The ester / ketone / aldehyde / amide splits are
     separated by only a few tens of wavenumbers, which is not the distinction
     this activity is asking students to make. What matters is recognising the
     band: strong, sharp and unmistakable somewhere in 1630-1830. */
  co_carbonyl: {
    family: 'carbonyl', label: 'C=O (carbonyl)', range: '1630–1830',
    hint: 'Strong, sharp, and by far the deepest thing in the 1630–1830 window — nothing else in a spectrum looks like a carbonyl.'
  },

  /* ---- double-bond region, down to the 1500 line ---- */
  cc_alkene: {
    family: 'cc', label: 'C=C (alkene)', range: '1620–1680',
    hint: 'One weak-to-medium band near 1640 — an isolated alkene.'
  },
  cc_arene: {
    family: 'cc', label: 'C=C (aromatic ring)', range: '1500–1620',
    hint: 'A PAIR of bands near 1600 and 1500 — that is ring breathing, not an isolated alkene.'
  },
  no2_group: {
    family: 'no2', label: 'N–O (nitro)', range: '1500–1560',
    hint: 'A very strong band near 1520, with its partner near 1350 down in the fingerprint region — the two NO₂ stretches.'
  },

  /* ---- below 1500: drawn and taught, but never scored ---- */
  co_single: {
    family: 'cosingle', label: 'C–O (single bond)', range: '1000–1300',
    fingerprint: true,
    hint: 'Strong band in the 1000–1300 window. Useful corroboration, but it sits in the fingerprint region, so it is not one of the peaks you label here.'
  }
};

var GROUP_IDS = Object.keys(GROUPS);

/* A family with only one scorable member adds nothing at Level 1: its tile
   would read a bare "C=O" where the group's own label reads "C=O (carbonyl)"
   and carries a wavenumber range. Such groups label themselves at both levels,
   which keeps this automatic as the bank changes. */
(function () {
  var counts = {};
  GROUP_IDS.forEach(function (k) {
    if (GROUPS[k].fingerprint) return;
    counts[GROUPS[k].family] = (counts[GROUPS[k].family] || 0) + 1;
  });
  GROUP_IDS.forEach(function (k) {
    if (!GROUPS[k].fingerprint && counts[GROUPS[k].family] === 1) GROUPS[k].atomic = true;
  });
})();

/* The key a group answers to at each level. C-H groups stay specific at all four. */
function irKey(groupId, mode) {
  var g = GROUPS[groupId];
  return (mode === 'group' || g.atomic) ? groupId : g.family;
}

/* Text for a key that may be either a family id or a group id. */
function irLabel(key) {
  return FAMILIES[key] ? FAMILIES[key].label : GROUPS[key].label;
}

function irSub(key) {
  return FAMILIES[key] ? FAMILIES[key].aka : GROUPS[key].range + ' cm⁻¹';
}

/* Everything a tile may show, per level. Fingerprint groups are excluded from
   both: they are never the answer, and offering one as a distractor would
   teach that e.g. ethyl acetate has no C-O, which is false. */
var SCORABLE = GROUP_IDS.filter(function (k) { return !GROUPS[k].fingerprint; });

var IR_UNIVERSE = {
  family: Object.keys(FAMILIES).filter(function (f) {
    return SCORABLE.some(function (k) { return GROUPS[k].family === f && !GROUPS[k].atomic; });
  }).concat(SCORABLE.filter(function (k) { return GROUPS[k].atomic; })),
  group: SCORABLE
};

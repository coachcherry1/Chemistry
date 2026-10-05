# Answer key — ¹H NMR: An Introduction

Generated from `src/js/molecules.js` by `node tools/answer-key.js`. Do not hand-edit:
change the bank and regenerate, so the key and the activity stay in step.

**Shifts** are literature values in CDCl₃. Each spectrum is drawn with a seeded jitter of
up to ±0.015 ppm, so a signal moves very slightly between attempts.

**Integration and splitting are not typed in.** The H count of each set and the number of
neighbouring H that split it are counted from the structure by `src/js/analysis.js`, using
the first-order rules the activity teaches: only H on directly bonded atoms split a signal,
equivalent H do not split each other, and O–H hydrogens exchange, so they neither split
nor are split. Longer-range coupling (for example the allylic coupling in 2-methylpropene)
is ignored. Spectra are simulated at 60 MHz with J = 7 Hz throughout.

**Region** is the row of the shift table each set belongs to, with its range in ppm.

## Levels

| Level | Compounds drawn | Every run includes |
| --- | :---: | --- |
| 1 — Equivalent H | 5 | a symmetric molecule, a branched one, a ring, and two look-alike groups that are not equivalent |
| 2 — Chemical shift | 5 | a C–H on a carbon bonded to O, a C–H next to C=O, a far-downfield signal (aromatic, alkene, aldehyde or acid), and a C–H on a carbon bonded to Br |
| 3 — Integration | 4 | a ratio with halves to scale up, a set of 6 H or more, and three or more signals |
| 4 — Splitting | 5 | a sextet or septet, an O–H, a singlet from a group with no neighbouring H, and a quartet |
| 5 — Solve it | 4 | a free draw, preferring a compound family not yet used |

## Contents

- **Ketone** — Acetone, 2-Butanone, 3-Pentanone
- **Alkyl halide** — 1,2-Dichloroethane, Bromoethane, 1-Bromopropane, 2-Bromopropane
- **Cycloalkane** — Cyclohexane
- **Alcohol** — Ethanol, 1-Propanol, 2-Propanol, tert-Butyl alcohol
- **Ether** — Diethyl ether, tert-Butyl methyl ether
- **Ester** — Ethyl acetate, Methyl acetate, Methyl propanoate, Isopropyl acetate
- **Aldehyde** — 2,2-Dimethylpropanal
- **Alkene** — 2-Methylpropene
- **Carboxylic acid** — Acetic acid, Propanoic acid, Butanoic acid, 2-Methylpropanoic acid
- **Aromatic hydrocarbon** — 1,4-Dimethylbenzene, 1,3,5-Trimethylbenzene

## Acetone

`acetone` · Ketone · C₃H₆O · appears in L1 Equivalent H

**1 signal.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| a | CH₃ | 2.17 | 6 | singlet (n = 0) | C–H next to C=O, 2.0–2.7 | the two CH₃ groups, both bonded to the C=O |

Equivalence (Level 1): **a** — the C=O sits in the middle, so the two CH₃ groups are mirror images.

## 1,2-Dichloroethane

`dichloroethane` · Alkyl halide · C₂H₄Cl₂ · appears in L1 Equivalent H

**1 signal.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| a | CH₂ | 3.73 | 4 | singlet (n = 0) | C–H on a carbon bonded to Br or Cl, 2.7–4.5 | the two CH₂ groups |

Equivalence (Level 1): **a** — the molecule is the same from either end: each CH₂ carries one Cl and one CH₂.

## Cyclohexane

`cyclohexane` · Cycloalkane · C₆H₁₂ · appears in L1 Equivalent H

**1 signal.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| a | CH₂ | 1.43 | 12 | singlet (n = 0) | Alkyl C–H, 0.8–2.0 | the six ring CH₂ groups |

Equivalence (Level 1): **a** — every CH₂ has the same neighbours, and turning the ring moves each one onto the next.

## Ethanol

`ethanol` · Alcohol · C₂H₆O · appears in L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**3 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| b | CH₂ | 3.69 | 2 | quartet (n = 3) | C–H on a carbon bonded to O, 3.2–5.2 | the CH₂ bonded to the O |
| c | OH | 2.61 | 1 | singlet (O–H, exchanges) | Alcohol O–H, 1.0–5.5 | the O–H |
| a | CH₃ | 1.22 | 3 | triplet (n = 2) | Alkyl C–H, 0.8–2.0 | the CH₃ at the end of the chain |

Usual Level 5 decoys, and the evidence that rules each out:

- **Propanoic acid** — The 2H quartet at δ 3.69 sits in the range for H on a carbon bonded to O (3.2–5.2 ppm). In Propanoic acid, the 2H quartet comes from the CH₂ bonded to the C=O, which would sit at 2.0–2.7 ppm.
- **Ethyl acetate** — The signal at δ 2.61 integrates to 1H. Ethyl acetate has no hydrogen that sits in a set on its own.
- **1-Propanol** — 1-Propanol has 4 sets of equivalent hydrogens, so it would give 4 signals. This spectrum has 3.

## 1-Propanol

`propanol` · Alcohol · C₃H₈O · appears in L1 Equivalent H, L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**4 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| c | CH₂ | 3.58 | 2 | triplet (n = 2) | C–H on a carbon bonded to O, 3.2–5.2 | the CH₂ bonded to the O |
| d | OH | 2.26 | 1 | singlet (O–H, exchanges) | Alcohol O–H, 1.0–5.5 | the O–H |
| b | CH₂ | 1.57 | 2 | sextet (n = 5) | Alkyl C–H, 0.8–2.0 | the middle CH₂, one carbon from the O |
| a | CH₃ | 0.93 | 3 | triplet (n = 2) | Alkyl C–H, 0.8–2.0 | the CH₃ at the end of the chain, two carbons from the O |

Usual Level 5 decoys, and the evidence that rules each out:

- **Butanoic acid** — The 2H triplet at δ 3.58 sits in the range for H on a carbon bonded to O (3.2–5.2 ppm). In Butanoic acid, the 2H triplet comes from the CH₂ bonded to the C=O, which would sit at 2.0–2.7 ppm.
- **Ethanol** — Ethanol has 3 sets of equivalent hydrogens, so it would give 3 signals. This spectrum has 4.
- **1-Bromopropane** — 1-Bromopropane has 3 sets of equivalent hydrogens, so it would give 3 signals. This spectrum has 4.

## 2-Propanol

`isopropanol` · Alcohol · C₃H₈O · appears in L1 Equivalent H, L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**3 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| b | CH | 4.02 | 1 | septet (n = 6) | C–H on a carbon bonded to O, 3.2–5.2 | the CH bonded to the O |
| c | OH | 2.16 | 1 | singlet (O–H, exchanges) | Alcohol O–H, 1.0–5.5 | the O–H |
| a | CH₃ | 1.20 | 6 | doublet (n = 1) | Alkyl C–H, 0.8–2.0 | the two CH₃ groups on the central CH |

Equivalence (Level 1): **a** — both CH₃ groups hang off the same CH, so they are mirror images.

Usual Level 5 decoys, and the evidence that rules each out:

- **Isopropyl acetate** — This spectrum has two 1H signals, but Isopropyl acetate has only one hydrogen that sits in a set on its own.
- **2-Methylpropanoic acid** — The 1H septet at δ 4.02 sits in the range for H on a carbon bonded to O (3.2–5.2 ppm). In 2-Methylpropanoic acid, the 1H septet comes from the CH bonded to the C=O, which would sit at 2.0–2.7 ppm.
- **Ethanol** — This spectrum has two 1H signals, but Ethanol has only one hydrogen that sits in a set on its own.

## tert-Butyl alcohol

`tbutanol` · Alcohol · C₄H₁₀O · appears in L1 Equivalent H, L3 Integration, L5 Solve it

**2 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| b | OH | 1.95 | 1 | singlet (O–H, exchanges) | Alcohol O–H, 1.0–5.5 | the O–H |
| a | CH₃ | 1.28 | 9 | singlet (n = 0) | Alkyl C–H, 0.8–2.0 | the three CH₃ groups on the central carbon |

Equivalence (Level 1): **a** — all three CH₃ groups hang off the same carbon, and turning the molecule swaps them.

Usual Level 5 decoys, and the evidence that rules each out:

- **2,2-Dimethylpropanal** — The 1H singlet at δ 1.95 sits in the range for an alcohol O–H (1.0–5.5 ppm). In 2,2-Dimethylpropanal, the 1H singlet comes from the aldehyde H, on the C=O carbon, which would sit at 9.0–10.5 ppm.
- **tert-Butyl methyl ether** — The signal at δ 1.95 integrates to 1H. tert-Butyl methyl ether has no hydrogen that sits in a set on its own.
- **Diethyl ether** — The signal at δ 1.95 integrates to 1H. Diethyl ether has no hydrogen that sits in a set on its own.

## Diethyl ether

`diethylether` · Ether · C₄H₁₀O · appears in L1 Equivalent H, L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**2 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| b | CH₂ | 3.48 | 4 | quartet (n = 3) | C–H on a carbon bonded to O, 3.2–5.2 | the two CH₂ groups bonded to the O |
| a | CH₃ | 1.21 | 6 | triplet (n = 2) | Alkyl C–H, 0.8–2.0 | the two CH₃ groups at the ends |

Equivalence (Level 1): **a** — the O sits in the middle, so the two ethyl groups are mirror images. **b** — the O sits in the middle, so the two ethyl groups are mirror images.

Usual Level 5 decoys, and the evidence that rules each out:

- **3-Pentanone** — The 4H quartet at δ 3.48 sits in the range for H on a carbon bonded to O (3.2–5.2 ppm). In 3-Pentanone, the 4H quartet comes from the two CH₂ groups bonded to the C=O, which would sit at 2.0–2.7 ppm.
- **Bromoethane** — The signal at δ 3.48 integrates to 4H. Bromoethane has no set of 4 equivalent hydrogens.
- **tert-Butyl alcohol** — The signal at δ 3.48 integrates to 4H. tert-Butyl alcohol has no set of 4 equivalent hydrogens.

## tert-Butyl methyl ether

`mtbe` · Ether · C₅H₁₂O · appears in L1 Equivalent H, L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**2 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| a | CH₃ | 3.22 | 3 | singlet (n = 0) | C–H on a carbon bonded to O, 3.2–5.2 | the CH₃ bonded to the O |
| b | CH₃ | 1.20 | 9 | singlet (n = 0) | Alkyl C–H, 0.8–2.0 | the three CH₃ groups of the tert-butyl group |

Equivalence (Level 1): **b** — all three hang off the same carbon, and turning the molecule swaps them.

Usual Level 5 decoys, and the evidence that rules each out:

- **tert-Butyl alcohol** — The signal at δ 3.22 integrates to 3H. tert-Butyl alcohol has no set of 3 equivalent hydrogens.
- **Methyl acetate** — The signal at δ 1.20 integrates to 9H. Methyl acetate has no set of 9 equivalent hydrogens.
- **2,2-Dimethylpropanal** — The signal at δ 3.22 integrates to 3H. 2,2-Dimethylpropanal has no set of 3 equivalent hydrogens.

## Ethyl acetate

`ethylacetate` · Ester · C₄H₈O₂ · appears in L1 Equivalent H, L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**3 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| b | CH₂ | 4.12 | 2 | quartet (n = 3) | C–H on a carbon bonded to O, 3.2–5.2 | the CH₂ bonded to the ester O |
| a | CH₃ | 2.05 | 3 | singlet (n = 0) | C–H next to C=O, 2.0–2.7 | the CH₃ bonded to the C=O |
| c | CH₃ | 1.26 | 3 | triplet (n = 2) | Alkyl C–H, 0.8–2.0 | the CH₃ at the end of the ethyl group |

Usual Level 5 decoys, and the evidence that rules each out:

- **Methyl propanoate** — The 2H quartet at δ 4.12 sits in the range for H on a carbon bonded to O (3.2–5.2 ppm). In Methyl propanoate, the 2H quartet comes from the CH₂ bonded to the C=O, which would sit at 2.0–2.7 ppm.
- **2-Butanone** — The 2H quartet at δ 4.12 sits in the range for H on a carbon bonded to O (3.2–5.2 ppm). In 2-Butanone, the 2H quartet comes from the CH₂ bonded to the C=O, which would sit at 2.0–2.7 ppm.
- **Ethanol** — This spectrum has two 3H signals, but Ethanol has only one set of 3 equivalent hydrogens.

## Methyl acetate

`methylacetate` · Ester · C₃H₆O₂ · appears in L1 Equivalent H, L2 Chemical shift, L4 Splitting, L5 Solve it

**2 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| b | CH₃ | 3.67 | 3 | singlet (n = 0) | C–H on a carbon bonded to O, 3.2–5.2 | the CH₃ bonded to the ester O |
| a | CH₃ | 2.06 | 3 | singlet (n = 0) | C–H next to C=O, 2.0–2.7 | the CH₃ bonded to the C=O |

Usual Level 5 decoys, and the evidence that rules each out:

- **tert-Butyl methyl ether** — This spectrum has two 3H signals, but tert-Butyl methyl ether has only one set of 3 equivalent hydrogens.
- **Acetic acid** — This spectrum has two 3H signals, but Acetic acid has only one set of 3 equivalent hydrogens.
- **1,3,5-Trimethylbenzene** — This spectrum has two 3H signals, but 1,3,5-Trimethylbenzene has only one set of 3 equivalent hydrogens.

## Methyl propanoate

`methylpropanoate` · Ester · C₄H₈O₂ · appears in L1 Equivalent H, L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**3 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| c | CH₃ | 3.67 | 3 | singlet (n = 0) | C–H on a carbon bonded to O, 3.2–5.2 | the CH₃ bonded to the ester O |
| b | CH₂ | 2.33 | 2 | quartet (n = 3) | C–H next to C=O, 2.0–2.7 | the CH₂ bonded to the C=O |
| a | CH₃ | 1.14 | 3 | triplet (n = 2) | Alkyl C–H, 0.8–2.0 | the CH₃ at the end of the ethyl group |

Usual Level 5 decoys, and the evidence that rules each out:

- **Ethyl acetate** — The 3H singlet at δ 3.67 sits in the range for H on a carbon bonded to O (3.2–5.2 ppm). In Ethyl acetate, the 3H singlet comes from the CH₃ bonded to the C=O, which would sit at 2.0–2.7 ppm.
- **2-Butanone** — The 3H singlet at δ 3.67 sits in the range for H on a carbon bonded to O (3.2–5.2 ppm). In 2-Butanone, the 3H singlet comes from the CH₃ bonded to the C=O, which would sit at 2.0–2.7 ppm.
- **Propanoic acid** — This spectrum has two 3H signals, but Propanoic acid has only one set of 3 equivalent hydrogens.

## Isopropyl acetate

`isopropylacetate` · Ester · C₅H₁₀O₂ · appears in L1 Equivalent H, L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**3 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| b | CH | 4.99 | 1 | septet (n = 6) | C–H on a carbon bonded to O, 3.2–5.2 | the CH bonded to the ester O |
| a | CH₃ | 2.02 | 3 | singlet (n = 0) | C–H next to C=O, 2.0–2.7 | the CH₃ bonded to the C=O |
| c | CH₃ | 1.23 | 6 | doublet (n = 1) | Alkyl C–H, 0.8–2.0 | the two CH₃ groups on the O–CH |

Equivalence (Level 1): **c** — both hang off the same CH, so they are mirror images.

Usual Level 5 decoys, and the evidence that rules each out:

- **2-Propanol** — The signal at δ 2.02 integrates to 3H. 2-Propanol has no set of 3 equivalent hydrogens.
- **2-Methylpropanoic acid** — The signal at δ 2.02 integrates to 3H. 2-Methylpropanoic acid has no set of 3 equivalent hydrogens.
- **Ethyl acetate** — The signal at δ 4.99 integrates to 1H. Ethyl acetate has no hydrogen that sits in a set on its own.

## 2-Butanone

`butanone` · Ketone · C₄H₈O · appears in L1 Equivalent H, L3 Integration, L4 Splitting, L5 Solve it

**3 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| b | CH₂ | 2.44 | 2 | quartet (n = 3) | C–H next to C=O, 2.0–2.7 | the CH₂ bonded to the C=O |
| a | CH₃ | 2.14 | 3 | singlet (n = 0) | C–H next to C=O, 2.0–2.7 | the CH₃ bonded to the C=O |
| c | CH₃ | 1.06 | 3 | triplet (n = 2) | Alkyl C–H, 0.8–2.0 | the CH₃ at the end of the ethyl group |

Usual Level 5 decoys, and the evidence that rules each out:

- **Ethyl acetate** — The 2H quartet at δ 2.44 sits in the range for H on a carbon next to a C=O (2.0–2.7 ppm). In Ethyl acetate, the 2H quartet comes from the CH₂ bonded to the ester O, which would sit at 3.2–5.2 ppm.
- **Methyl propanoate** — The 3H singlet at δ 2.14 sits in the range for H on a carbon next to a C=O (2.0–2.7 ppm). In Methyl propanoate, the 3H singlet comes from the CH₃ bonded to the ester O, which would sit at 3.2–5.2 ppm.
- **Propanoic acid** — This spectrum has two 3H signals, but Propanoic acid has only one set of 3 equivalent hydrogens.

## 3-Pentanone

`pentanone` · Ketone · C₅H₁₀O · appears in L1 Equivalent H, L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**2 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| b | CH₂ | 2.44 | 4 | quartet (n = 3) | C–H next to C=O, 2.0–2.7 | the two CH₂ groups bonded to the C=O |
| a | CH₃ | 1.06 | 6 | triplet (n = 2) | Alkyl C–H, 0.8–2.0 | the two CH₃ groups at the ends |

Equivalence (Level 1): **a** — the C=O sits in the middle, so the two ethyl groups are mirror images. **b** — the C=O sits in the middle, so the two ethyl groups are mirror images.

Usual Level 5 decoys, and the evidence that rules each out:

- **Diethyl ether** — The 4H quartet at δ 2.44 sits in the range for H on a carbon next to a C=O (2.0–2.7 ppm). In Diethyl ether, the 4H quartet comes from the two CH₂ groups bonded to the O, which would sit at 3.2–5.2 ppm.
- **Bromoethane** — The signal at δ 2.44 integrates to 4H. Bromoethane has no set of 4 equivalent hydrogens.
- **2-Butanone** — 2-Butanone has 3 sets of equivalent hydrogens, so it would give 3 signals. This spectrum has 2.

## 2,2-Dimethylpropanal

`pivaldehyde` · Aldehyde · C₅H₁₀O · appears in L1 Equivalent H, L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**2 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| b | CH | 9.47 | 1 | singlet (n = 0) | Aldehyde H, O=C–H, 9.0–10.5 | the aldehyde H, on the C=O carbon |
| a | CH₃ | 1.08 | 9 | singlet (n = 0) | Alkyl C–H, 0.8–2.0 | the three CH₃ groups on the central carbon |

Equivalence (Level 1): **a** — all three hang off the same carbon, and turning the molecule swaps them.

Usual Level 5 decoys, and the evidence that rules each out:

- **tert-Butyl alcohol** — The 1H singlet at δ 9.47 sits in the range for an aldehyde H (9.0–10.5 ppm). In tert-Butyl alcohol, the 1H singlet comes from the O–H, which would sit at 1.0–5.5 ppm.
- **tert-Butyl methyl ether** — The signal at δ 9.47 integrates to 1H. tert-Butyl methyl ether has no hydrogen that sits in a set on its own.
- **3-Pentanone** — The signal at δ 9.47 integrates to 1H. 3-Pentanone has no hydrogen that sits in a set on its own.

## 2-Methylpropene

`isobutylene` · Alkene · C₄H₈ · appears in L1 Equivalent H, L2 Chemical shift, L3 Integration, L5 Solve it

**2 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| b | CH₂ | 4.66 | 2 | singlet (n = 0) | C=C–H (alkene), 4.5–6.5 | the =CH₂ at the end of the C=C |
| a | CH₃ | 1.73 | 6 | singlet (n = 0) | C–H next to C=C (allylic), 1.6–2.2 | the two CH₃ groups on the C=C |

Equivalence (Level 1): **a** — both sit on the same carbon of the C=C, so they are mirror images.

Usual Level 5 decoys, and the evidence that rules each out:

- **tert-Butyl methyl ether** — The signal at δ 4.66 integrates to 2H. tert-Butyl methyl ether has no set of 2 equivalent hydrogens.
- **Acetic acid** — The signal at δ 4.66 integrates to 2H. Acetic acid has no set of 2 equivalent hydrogens.
- **1,3,5-Trimethylbenzene** — The signal at δ 4.66 integrates to 2H. 1,3,5-Trimethylbenzene has no set of 2 equivalent hydrogens.

## Bromoethane

`bromoethane` · Alkyl halide · C₂H₅Br · appears in L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**2 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| b | CH₂ | 3.43 | 2 | quartet (n = 3) | C–H on a carbon bonded to Br or Cl, 2.7–4.5 | the CH₂ bonded to the Br |
| a | CH₃ | 1.67 | 3 | triplet (n = 2) | Alkyl C–H, 0.8–2.0 | the CH₃ at the end of the chain |

Usual Level 5 decoys, and the evidence that rules each out:

- **Diethyl ether** — The signal at δ 3.43 integrates to 2H. Diethyl ether has no set of 2 equivalent hydrogens.
- **3-Pentanone** — The signal at δ 3.43 integrates to 2H. 3-Pentanone has no set of 2 equivalent hydrogens.
- **1-Bromopropane** — 1-Bromopropane has 3 sets of equivalent hydrogens, so it would give 3 signals. This spectrum has 2.

## 1-Bromopropane

`bromopropane` · Alkyl halide · C₃H₇Br · appears in L1 Equivalent H, L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**3 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| c | CH₂ | 3.40 | 2 | triplet (n = 2) | C–H on a carbon bonded to Br or Cl, 2.7–4.5 | the CH₂ bonded to the Br |
| b | CH₂ | 1.89 | 2 | sextet (n = 5) | Alkyl C–H, 0.8–2.0 | the middle CH₂, one carbon from the Br |
| a | CH₃ | 1.03 | 3 | triplet (n = 2) | Alkyl C–H, 0.8–2.0 | the CH₃ at the end of the chain, two carbons from the Br |

Usual Level 5 decoys, and the evidence that rules each out:

- **Ethyl acetate** — This spectrum has two 2H signals, but Ethyl acetate has only one set of 2 equivalent hydrogens.
- **Methyl propanoate** — This spectrum has two 2H signals, but Methyl propanoate has only one set of 2 equivalent hydrogens.
- **2-Butanone** — This spectrum has two 2H signals, but 2-Butanone has only one set of 2 equivalent hydrogens.

## 2-Bromopropane

`bromopropane2` · Alkyl halide · C₃H₇Br · appears in L1 Equivalent H, L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**2 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| b | CH | 4.21 | 1 | septet (n = 6) | C–H on a carbon bonded to Br or Cl, 2.7–4.5 | the CH bonded to the Br |
| a | CH₃ | 1.71 | 6 | doublet (n = 1) | Alkyl C–H, 0.8–2.0 | the two CH₃ groups on the central CH |

Equivalence (Level 1): **a** — both hang off the same CH, so they are mirror images.

Usual Level 5 decoys, and the evidence that rules each out:

- **Bromoethane** — The signal at δ 4.21 integrates to 1H. Bromoethane has no hydrogen that sits in a set on its own.
- **2-Propanol** — 2-Propanol has 3 sets of equivalent hydrogens, so it would give 3 signals. This spectrum has 2.
- **Isopropyl acetate** — Isopropyl acetate has 3 sets of equivalent hydrogens, so it would give 3 signals. This spectrum has 2.

## Acetic acid

`aceticacid` · Carboxylic acid · C₂H₄O₂ · appears in L2 Chemical shift, L4 Splitting, L5 Solve it

**2 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| b | OH | 11.40 | 1 | singlet (O–H, exchanges) | Carboxylic acid O–H, 10.0–13.0 | the carboxylic acid O–H |
| a | CH₃ | 2.10 | 3 | singlet (n = 0) | C–H next to C=O, 2.0–2.7 | the CH₃ bonded to the C=O |

Usual Level 5 decoys, and the evidence that rules each out:

- **Methyl acetate** — The signal at δ 11.40 integrates to 1H. Methyl acetate has no hydrogen that sits in a set on its own.
- **tert-Butyl methyl ether** — The signal at δ 11.40 integrates to 1H. tert-Butyl methyl ether has no hydrogen that sits in a set on its own.
- **1,3,5-Trimethylbenzene** — The signal at δ 11.40 integrates to 1H. 1,3,5-Trimethylbenzene has no hydrogen that sits in a set on its own.

## Propanoic acid

`propanoicacid` · Carboxylic acid · C₃H₆O₂ · appears in L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**3 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| c | OH | 11.70 | 1 | singlet (O–H, exchanges) | Carboxylic acid O–H, 10.0–13.0 | the carboxylic acid O–H |
| b | CH₂ | 2.38 | 2 | quartet (n = 3) | C–H next to C=O, 2.0–2.7 | the CH₂ bonded to the C=O |
| a | CH₃ | 1.16 | 3 | triplet (n = 2) | Alkyl C–H, 0.8–2.0 | the CH₃ at the end of the chain |

Usual Level 5 decoys, and the evidence that rules each out:

- **Ethanol** — The 1H singlet at δ 11.70 sits in the range for a carboxylic acid O–H (10.0–13.0 ppm). In Ethanol, the 1H singlet comes from the O–H, which would sit at 1.0–5.5 ppm.
- **Methyl propanoate** — The signal at δ 11.70 integrates to 1H. Methyl propanoate has no hydrogen that sits in a set on its own.
- **2-Butanone** — The signal at δ 11.70 integrates to 1H. 2-Butanone has no hydrogen that sits in a set on its own.

## Butanoic acid

`butanoicacid` · Carboxylic acid · C₄H₈O₂ · appears in L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**4 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| d | OH | 11.80 | 1 | singlet (O–H, exchanges) | Carboxylic acid O–H, 10.0–13.0 | the carboxylic acid O–H |
| c | CH₂ | 2.35 | 2 | triplet (n = 2) | C–H next to C=O, 2.0–2.7 | the CH₂ bonded to the C=O |
| b | CH₂ | 1.68 | 2 | sextet (n = 5) | Alkyl C–H, 0.8–2.0 | the middle CH₂, one carbon from the C=O |
| a | CH₃ | 0.99 | 3 | triplet (n = 2) | Alkyl C–H, 0.8–2.0 | the CH₃ at the end of the chain, two carbons from the C=O |

Usual Level 5 decoys, and the evidence that rules each out:

- **1-Propanol** — The 1H singlet at δ 11.80 sits in the range for a carboxylic acid O–H (10.0–13.0 ppm). In 1-Propanol, the 1H singlet comes from the O–H, which would sit at 1.0–5.5 ppm.
- **Propanoic acid** — Propanoic acid has 3 sets of equivalent hydrogens, so it would give 3 signals. This spectrum has 4.
- **1-Bromopropane** — 1-Bromopropane has 3 sets of equivalent hydrogens, so it would give 3 signals. This spectrum has 4.

## 2-Methylpropanoic acid

`isobutyricacid` · Carboxylic acid · C₄H₈O₂ · appears in L1 Equivalent H, L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**3 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| c | OH | 11.90 | 1 | singlet (O–H, exchanges) | Carboxylic acid O–H, 10.0–13.0 | the carboxylic acid O–H |
| b | CH | 2.58 | 1 | septet (n = 6) | C–H next to C=O, 2.0–2.7 | the CH bonded to the C=O |
| a | CH₃ | 1.21 | 6 | doublet (n = 1) | Alkyl C–H, 0.8–2.0 | the two CH₃ groups on the CH |

Equivalence (Level 1): **a** — both hang off the same CH, so they are mirror images.

Usual Level 5 decoys, and the evidence that rules each out:

- **2-Propanol** — The 1H singlet at δ 11.90 sits in the range for a carboxylic acid O–H (10.0–13.0 ppm). In 2-Propanol, the 1H singlet comes from the O–H, which would sit at 1.0–5.5 ppm.
- **Isopropyl acetate** — This spectrum has two 1H signals, but Isopropyl acetate has only one hydrogen that sits in a set on its own.
- **Propanoic acid** — This spectrum has two 1H signals, but Propanoic acid has only one hydrogen that sits in a set on its own.

## 1,4-Dimethylbenzene

`pxylene` · Aromatic hydrocarbon · C₈H₁₀ · appears in L1 Equivalent H, L2 Chemical shift, L3 Integration, L4 Splitting, L5 Solve it

**2 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| b | CH | 7.05 | 4 | singlet (n = 0) | Aromatic C–H (benzene ring), 6.5–8.5 | the four ring H |
| a | CH₃ | 2.30 | 6 | singlet (n = 0) | C–H next to a benzene ring (benzylic), 2.2–2.8 | the two CH₃ groups on the ring |

Equivalence (Level 1): **a** — they sit at opposite corners of the ring, so the molecule’s symmetry swaps them. **b** — with identical groups at opposite corners, every ring H has the same neighbours: one CH and one carbon carrying a CH₃.

Usual Level 5 decoys, and the evidence that rules each out:

- **1,3,5-Trimethylbenzene** — The signal at δ 7.05 integrates to 4H. 1,3,5-Trimethylbenzene has no set of 4 equivalent hydrogens.
- **2-Methylpropene** — The signal at δ 7.05 integrates to 4H. 2-Methylpropene has no set of 4 equivalent hydrogens.
- **tert-Butyl alcohol** — The signal at δ 7.05 integrates to 4H. tert-Butyl alcohol has no set of 4 equivalent hydrogens.

## 1,3,5-Trimethylbenzene

`mesitylene` · Aromatic hydrocarbon · C₉H₁₂ · appears in L1 Equivalent H, L2 Chemical shift, L3 Integration, L5 Solve it

**2 signals.**

| Set | Group | δ (ppm) | H | Splitting | Region | Hydrogens |
| :---: | --- | ---: | ---: | --- | --- | --- |
| b | CH | 6.78 | 3 | singlet (n = 0) | Aromatic C–H (benzene ring), 6.5–8.5 | the three ring H |
| a | CH₃ | 2.26 | 9 | singlet (n = 0) | C–H next to a benzene ring (benzylic), 2.2–2.8 | the three CH₃ groups on the ring |

Equivalence (Level 1): **a** — they are spaced evenly around the ring, so turning it by a third swaps them. **b** — each ring H sits between two carbons carrying a CH₃, so all three have the same surroundings.

Usual Level 5 decoys, and the evidence that rules each out:

- **1,4-Dimethylbenzene** — The signal at δ 6.78 integrates to 3H. 1,4-Dimethylbenzene has no set of 3 equivalent hydrogens.
- **tert-Butyl methyl ether** — The 3H singlet at δ 6.78 sits in the range for H on a benzene ring (6.5–8.5 ppm). In tert-Butyl methyl ether, the 3H singlet comes from the CH₃ bonded to the O, which would sit at 3.2–5.2 ppm.
- **Acetic acid** — The signal at δ 2.26 integrates to 9H. Acetic acid has no set of 9 equivalent hydrogens.


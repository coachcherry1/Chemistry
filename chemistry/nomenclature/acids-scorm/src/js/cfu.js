/* cfu.js — check-for-understanding questions. No DOM.
 *
 * Two sources:
 *   BANK       written questions. a[0] is the right answer; options are
 *              shuffled when shown. `min` is the first level that may ask it.
 *   generators questions built from a compound in the pool, so a run never
 *              runs dry and the numbers change every time:
 *                g:r:<code>  "Which naming rules apply to SnCl4?"
 *                g:c:<code>  "In PbO2, what is the charge on the lead?"   (ionic)
 *                g:f:<code>  "Which formula is iron(III) sulfate?"        (either kind)
 *                g:n:<code>  "What is the name of N2O4?"                  (either kind)
 *
 * Acids: acid (names), acidf (formulas), acidx (acid or not, among all
 * compounds). Generators g:t: "which acid rule?" and acid g:n:, g:f:.
 * Tags. The decision: decide (ionic or covalent?), cross (a rule from one
 * system used on the other). Covalent: prefix (the prefixes and mono-),
 * covred (never reduce). Ionic: tm, fixed, ide, ionic, numeral, charge,
 * reduce, paren, poly.
 */

var CFU = (function () {
  'use strict';

  var BANK = [
    /* ---------------------------------------------------------------- tm */
    { id: 'tm1', tag: 'tm', min: 1, q: 'Which of these metals needs a Roman numeral in its name?',
      a: ['Sn', 'Zn', 'Ag', 'Ca'],
      why: 'Sn counts as a transition metal in this class — it can be Sn²⁺ or Sn⁴⁺. Zn and Ag are not transition metals (one charge each), and Ca is Group 2, always 2+.' },
    { id: 'tm2', tag: 'tm', min: 1, q: 'Which metal does NOT need a Roman numeral?',
      a: ['Zn', 'Fe', 'Cu', 'Pb'],
      why: 'Zinc is not a transition metal in this class — it is always Zn²⁺. Fe, Cu and Pb can each form more than one charge.' },
    { id: 'tm3', tag: 'tm', min: 1, q: 'Which pair of metals BOTH need Roman numerals?',
      a: ['Sn and Pb', 'Ag and Zn', 'Zn and Pb', 'Ag and Sn'],
      why: 'Sn and Pb count as transition metals here — each can be 2+ or 4+. Ag and Zn do not; they have one charge each.' },
    { id: 'tm4', tag: 'tm', min: 1, q: 'Why does a transition metal’s name need a Roman numeral?',
      a: ['It can form more than one charge, and the numeral says which one',
          'It has more than one atom in the formula',
          'Its symbol has two letters',
          'It is heavier than other metals'],
      why: 'Iron can be Fe²⁺ or Fe³⁺. “Iron chloride” could mean either compound, so the numeral names the charge.' },
    { id: 'tm5', tag: 'tm', min: 1, q: 'Which set of metals ALL need Roman numerals?',
      a: ['Fe, Cu, Sn', 'Fe, Zn, Ag', 'Na, Mg, Al', 'Cu, Ag, Au'],
      why: 'Fe, Cu and Sn are all transition metals in this class. Zn and Ag are not, and Na, Mg and Al are main-group metals with one charge each.' },
    { id: 'tm6', tag: 'tm', min: 1, q: 'Which statement is the if/then rule for naming an ionic compound?',
      a: ['If the metal is a transition metal, write its charge as a Roman numeral after its name',
          'If the formula has more than two atoms, add a Roman numeral',
          'If the nonmetal’s charge is bigger than 1−, add a Roman numeral',
          'If the metal is written first, add a Roman numeral'],
      why: 'Only the metal decides. Transition metal → Roman numeral. Anything else → no numeral.' },
    { id: 'tm7', tag: 'tm', min: 1, q: 'Gallium (Ga) sits right below aluminum. Does it need a Roman numeral?',
      a: ['No — like Al, it is always 3+', 'Yes — it is a transition metal',
          'Yes — it is below the d-block', 'Only when it is paired with oxygen'],
      why: 'Ga is in Group 13 with Al, outside the d-block. It always forms Ga³⁺.' },
    { id: 'tm8', tag: 'tm', min: 1, q: 'Mn and Mg look alike. Which one needs a Roman numeral?',
      a: ['Mn (manganese)', 'Mg (magnesium)', 'Both', 'Neither'],
      why: 'Mn is manganese, a transition metal. Mg is magnesium, in Group 2, always 2+.' },
    { id: 'tm9', tag: 'tm', min: 2, q: 'Which name is written correctly?',
      a: ['silver chloride', 'silver(I) chloride', 'silver(II) chloride', 'silver chlorine'],
      why: 'Silver is not a transition metal in this class — it is only ever Ag⁺, so no Roman numeral. And Cl⁻ is chloride, not chlorine.' },
    { id: 'tm10', tag: 'tm', min: 2, q: 'Which name is written correctly?',
      a: ['zinc oxide', 'zinc(II) oxide', 'zinc(I) oxide', 'zinc oxygen'],
      why: 'Zinc is always Zn²⁺, so its name never needs a numeral. O²⁻ is oxide.' },
    { id: 'tm11', tag: 'tm', min: 2, q: 'A student named CaCl₂ “calcium(II) chloride.” What is wrong?',
      a: ['Calcium is not a transition metal, so no Roman numeral',
          'The numeral should be (I)', 'Chloride should be chlorine', 'Nothing — it is correct'],
      why: 'Calcium is in Group 2 and is always 2+. Roman numerals are only for transition metals.' },
    { id: 'tm12', tag: 'tm', min: 2, q: 'A student named CuO “copper oxide.” What is missing?',
      a: ['A Roman numeral: copper(II) oxide', 'Nothing — it is correct',
          'A prefix: copper monoxide', 'The anion should be “oxygen”'],
      why: 'Copper is a transition metal (Cu⁺ or Cu²⁺). O is 2−, so the copper here is 2+: copper(II) oxide.' },
    { id: 'tm13', tag: 'tm', min: 2, q: 'Why do FeCl₂ and FeCl₃ need different names?',
      a: ['The iron has a different charge in each: 2+ and 3+', 'The chloride changes to chlorine',
          'One is ionic and one is not', 'They don’t — both are “iron chloride”'],
      why: 'FeCl₂ is iron(II) chloride and FeCl₃ is iron(III) chloride. Same elements, different iron ion.' },
    { id: 'tm14', tag: 'tm', min: 2, q: 'What is the name of KMnO₄?',
      a: ['potassium permanganate', 'potassium(I) permanganate',
          'potassium manganese(VII) oxide', 'potassium manganate'],
      why: 'The positive ion is K⁺ (Group 1), so no numeral. The Mn is locked inside the permanganate ion, MnO₄⁻, so the transition-metal rule doesn’t apply to it.' },
    { id: 'tm15', tag: 'tm', min: 2, q: 'What is the name of Na₂CrO₄?',
      a: ['sodium chromate', 'sodium chromium(VI) oxide', 'sodium(I) chromate', 'sodium dichromate'],
      why: 'Na⁺ is Group 1, so no numeral. CrO₄²⁻ is chromate — a metal inside a polyatomic ion never gets a numeral.' },
    { id: 'tm16', tag: 'tm', min: 2, q: 'Does ammonium chloride, NH₄Cl, need a Roman numeral?',
      a: ['No — ammonium is not a metal and is always 1+', 'Yes — (I)',
          'Yes — (IV), for the four H atoms', 'Only when it is written as a formula'],
      why: 'NH₄⁺ is a polyatomic ion with one charge. The Roman numeral rule is only for transition metals.' },

    /* ------------------------------------------------------------- fixed */
    { id: 'fx1', tag: 'fixed', min: 1, q: 'What is the charge on a silver ion?',
      a: ['1+', '2+', '3+', 'It depends on the compound'],
      why: 'Silver is always Ag⁺. Its position doesn’t tell you — it is one to memorize.' },
    { id: 'fx2', tag: 'fixed', min: 1, q: 'What is the charge on a zinc ion?',
      a: ['2+', '1+', '3+', 'It depends on the compound'],
      why: 'Zinc is always Zn²⁺ — another one to memorize.' },
    { id: 'fx3', tag: 'fixed', min: 1, q: 'What charge does aluminum always form?',
      a: ['3+', '2+', '3−', '1+'],
      why: 'Al is in Group 13: it loses 3 electrons to form Al³⁺.' },
    { id: 'fx4', tag: 'fixed', min: 1, q: 'Rubidium (Rb) forms which ion?',
      a: ['Rb⁺', 'Rb²⁺', 'Rb⁻', 'Rb³⁺'],
      why: 'Rb is in Group 1 with Na and K: always 1+.' },
    { id: 'fx5', tag: 'fixed', min: 1, q: 'Barium (Ba) forms which ion?',
      a: ['Ba²⁺', 'Ba⁺', 'Ba³⁺', 'Ba²⁻'],
      why: 'Ba is in Group 2 with Mg and Ca: always 2+.' },
    { id: 'fx6', tag: 'fixed', min: 1, q: 'How do you know the charge of a Group 1 or Group 2 metal?',
      a: ['From its group: Group 1 is 1+, Group 2 is 2+', 'From a Roman numeral',
          'From its atomic mass', 'From the number of atoms in the formula'],
      why: 'Main-group metals lose all their outer electrons: 1 for Group 1, 2 for Group 2, 3 for Al and Ga.' },
    { id: 'fx7', tag: 'fixed', min: 1, q: 'Metals form ions by…',
      a: ['losing electrons, so their ions are positive', 'gaining electrons, so their ions are negative',
          'gaining protons', 'sharing electrons'],
      why: 'Metals lose electrons and become positive cations. Nonmetals gain electrons and become negative anions.' },

    /* --------------------------------------------------------------- ide */
    { id: 'id1', tag: 'ide', min: 1, q: 'What is the name of the N³⁻ ion?',
      a: ['nitride', 'nitrogen', 'nitrate', 'nitrite'],
      why: 'A negative ion made of one element takes the -ide ending: nitrogen → nitride. Nitrate and nitrite are polyatomic ions.' },
    { id: 'id2', tag: 'ide', min: 1, q: 'What is the name of S²⁻?',
      a: ['sulfide', 'sulfur', 'sulfate', 'sulfite'],
      why: 'Sulfur → sulfide. Sulfate (SO₄²⁻) and sulfite (SO₃²⁻) are polyatomic ions.' },
    { id: 'id3', tag: 'ide', min: 1, q: 'Which ion does phosphorus form?',
      a: ['P³⁻', 'P³⁺', 'P⁵⁻', 'P⁻'],
      why: 'P is in Group 15: it gains 3 electrons to form P³⁻, phosphide.' },
    { id: 'id4', tag: 'ide', min: 2, q: 'What is the name of KBr?',
      a: ['potassium bromide', 'potassium bromine', 'potassium(I) bromide', 'potassium bromate'],
      why: 'K is Group 1 (no numeral) and Br⁻ is bromide. Bromate is the polyatomic ion BrO₃⁻.' },
    { id: 'id5', tag: 'ide', min: 1, q: 'What charge does iodine take as an ion?',
      a: ['1−', '1+', '2−', '7−'],
      why: 'I is in Group 17 with F, Cl and Br: it gains 1 electron to form I⁻, iodide.' },
    { id: 'id6', tag: 'ide', min: 1, q: 'Why is O²⁻ called “oxide” and not “oxygen”?',
      a: ['Negative ions made of one element end in -ide', '“Oxygen” is only used for gases',
          '“Oxide” means two oxygen atoms', 'It is a polyatomic ion'],
      why: 'The element is oxygen; its ion is oxide. Same pattern: chlorine → chloride, sulfur → sulfide.' },
    { id: 'id7', tag: 'ide', min: 1, q: 'Which of these ions has a 2− charge?',
      a: ['sulfide', 'chloride', 'nitride', 'fluoride'],
      why: 'Group 16 nonmetals (O, S) gain 2 electrons. Group 15 gain 3; Group 17 gain 1.' },

    /* ------------------------------------------------------------- ionic */
    { id: 'io1', tag: 'ionic', min: 1, q: 'Which pair of elements forms an ionic compound?',
      a: ['Mg and Cl', 'Ne and Cl', 'Kr and O', 'He and Na'],
      why: 'An ionic compound needs a metal and a nonmetal that both form ions. Noble gases (He, Ne, Ar, Kr, Xe) don’t form ions.' },
    { id: 'io2', tag: 'ionic', min: 1, q: 'In an ionic formula or name, what comes first?',
      a: ['The positive ion (usually the metal)', 'The negative ion',
          'Whichever has more atoms', 'Whichever is first alphabetically'],
      why: 'Positive ion first, negative ion second — in both the name and the formula.' },
    { id: 'io3', tag: 'ionic', min: 1, q: 'Which element on your list will NOT appear in an ionic compound here?',
      a: ['Ar', 'Br', 'Ba', 'Rb'],
      why: 'Argon is a noble gas — its outer shell is full, so it doesn’t form ions.' },
    { id: 'io4', tag: 'ionic', min: 1, q: 'The total charge of any ionic compound is…',
      a: ['zero', 'positive', 'negative', 'the same as the metal’s charge'],
      why: 'The positive and negative charges cancel exactly. That is how you choose the subscripts.' },
    { id: 'io5', tag: 'ionic', min: 1, q: 'Which element forms a positive ion?',
      a: ['Ca', 'Cl', 'S', 'N'],
      why: 'Calcium is a metal, so it loses electrons: Ca²⁺. Cl, S and N are nonmetals and form negative ions.' },

    /* ----------------------------------------------------------- numeral */
    { id: 'nu1', tag: 'numeral', min: 2, q: 'What does the (III) in iron(III) oxide tell you?',
      a: ['Each iron ion has a 3+ charge', 'There are 3 iron atoms',
          'There are 3 oxygen atoms', 'The compound has 3 ions in total'],
      why: 'The Roman numeral is always the charge on the metal ion. The subscripts come from balancing the charges.' },
    { id: 'nu2', tag: 'numeral', min: 2, q: 'Which formula is iron(III) oxide?',
      a: ['Fe₂O₃', 'Fe₃O', 'FeO₃', 'Fe₃O₂'],
      why: 'Fe³⁺ and O²⁻: two Fe (6+) balance three O (6−). The III is a charge, not a subscript.' },
    { id: 'nu3', tag: 'numeral', min: 2, q: 'Which formula is copper(I) sulfide?',
      a: ['Cu₂S', 'CuS', 'CuS₂', 'Cu₁S'],
      why: 'Cu⁺ and S²⁻: it takes two Cu⁺ to balance one S²⁻.' },
    { id: 'nu4', tag: 'numeral', min: 2, q: 'Which formula is tin(IV) chloride?',
      a: ['SnCl₄', 'Sn₄Cl', 'SnCl₂', 'Sn₄Cl₄'],
      why: 'Sn⁴⁺ and Cl⁻: one Sn⁴⁺ needs four Cl⁻.' },
    { id: 'nu5', tag: 'numeral', min: 2, q: 'A student wrote Fe₃O for iron(III) oxide. What went wrong?',
      a: ['They used the Roman numeral as a subscript', 'They forgot to reduce',
          'They wrote the ions in the wrong order', 'Nothing — it is correct'],
      why: 'The (III) is the charge on each iron. Balance Fe³⁺ against O²⁻ to get Fe₂O₃.' },
    { id: 'nu6', tag: 'numeral', min: 2, q: 'Lead(II) and lead(IV) are…',
      a: ['the same element with two different charges', 'two different elements',
          'lead with 2 atoms and lead with 4 atoms', 'two different polyatomic ions'],
      why: 'Pb²⁺ and Pb⁴⁺. Lead is a transition metal in this class, so its name always says which ion it is.' },

    /* ------------------------------------------------------------ charge */
    { id: 'ch1', tag: 'charge', min: 2, q: 'In PbO₂, what is the charge on the lead?',
      a: ['4+', '2+', '1+', '2−'],
      why: 'Two O²⁻ make 4− in total. One Pb balances it alone, so Pb is 4+: lead(IV) oxide. Swapping the subscripts back gives 2+, which is wrong because PbO₂ was reduced from Pb₂O₄.' },
    { id: 'ch2', tag: 'charge', min: 2, q: 'In Fe₂O₃, what is the charge on each iron?',
      a: ['3+', '2+', '6+', '3−'],
      why: 'Three O²⁻ make 6−. Two Fe share it: 3+ each → iron(III) oxide.' },
    { id: 'ch3', tag: 'charge', min: 2, q: 'In CuCl, what is the charge on the copper?',
      a: ['1+', '2+', '1−', '0'],
      why: 'One Cl⁻ is 1−, so one Cu balances it at 1+ → copper(I) chloride.' },
    { id: 'ch4', tag: 'charge', min: 2, q: 'What is the name of MnO₂?',
      a: ['manganese(IV) oxide', 'manganese(II) oxide', 'manganese oxide', 'magnesium(IV) oxide'],
      why: 'Two O²⁻ = 4−, balanced by one Mn: Mn⁴⁺. And Mn is manganese — Mg is magnesium.' },
    { id: 'ch5', tag: 'charge', min: 2, q: 'To find a transition metal’s charge from a formula, you…',
      a: ['divide the total negative charge by the number of metal atoms',
          'use the metal’s subscript', 'look for the Roman numeral in the formula',
          'look it up on the periodic table'],
      why: 'Formulas never show Roman numerals. Add up the negative charge, then share it among the metal atoms.' },
    { id: 'ch6', tag: 'charge', min: 2, q: 'In SnS₂, why is the tin 4+ and not 2+?',
      a: ['Two S²⁻ make 4−, and one Sn must balance all of it', 'Tin is always 4+',
          'The 2 means there are two tin atoms', 'Sulfur is 1− in this compound'],
      why: 'SnS₂ was reduced from Sn₂S₄, so swapping the subscripts back misleads you. Count the charge: 2 × 2− = 4−.' },
    { id: 'ch7', tag: 'charge', min: 2, q: 'In Fe(NO₃)₃, what is the charge on the iron?',
      a: ['3+', '1+', '9+', '2+'],
      why: 'Three NO₃⁻ ions make 3−. One Fe balances it: Fe³⁺ → iron(III) nitrate.' },
    { id: 'ch8', tag: 'charge', min: 2, q: 'In Sn(SO₄)₂, what is the charge on the tin?',
      a: ['4+', '2+', '1+', '8+'],
      why: 'Two SO₄²⁻ ions make 4−. One Sn balances it: tin(IV) sulfate.' },

    /* ------------------------------------------------------------ reduce */
    { id: 're1', tag: 'reduce', min: 2, q: 'Titanium(IV) ions and oxide ions combine. Which formula is correct?',
      a: ['TiO₂', 'Ti₂O₄', 'Ti₄O₂', 'TiO₄'],
      why: 'Ti⁴⁺ and O²⁻ criss-cross to Ti₂O₄, which reduces to TiO₂.' },
    { id: 're2', tag: 'reduce', min: 2, q: 'Why is Ti₂O₄ not an acceptable formula?',
      a: ['Ionic formulas use the lowest whole-number ratio', 'Titanium can’t be 4+',
          'Its charges don’t balance', 'The oxygen should come first'],
      why: 'The charges do balance, but 2:4 reduces to 1:2 — TiO₂.' },
    { id: 're3', tag: 'reduce', min: 2, q: 'Which formula is written in lowest terms?',
      a: ['CaS', 'Ca₂S₂', 'Mg₂O₂', 'Pb₂O₄'],
      why: 'Ca²⁺ and S²⁻ are already 1:1. The others can all be divided by 2.' },
    { id: 're4', tag: 'reduce', min: 2, q: 'Which is correct for sodium peroxide?',
      a: ['Na₂O₂', 'NaO', 'Na₂O', 'NaO₂'],
      why: 'Peroxide is O₂²⁻ — one ion. Two Na⁺ balance it: Na₂O₂. Never reduce the subscript inside a polyatomic ion.' },
    { id: 're5', tag: 'reduce', min: 2, q: 'Which is correct for tin(IV) sulfate?',
      a: ['Sn(SO₄)₂', 'Sn₂(SO₄)₄', 'SnSO₄', 'Sn₄(SO₄)₂'],
      why: 'Sn⁴⁺ and SO₄²⁻ criss-cross to Sn₂(SO₄)₄, which reduces to Sn(SO₄)₂. Only the numbers outside the ions reduce.' },

    /* ------------------------------------------------------------- paren */
    { id: 'pa1', tag: 'paren', min: 2, q: 'Which formula is correct for calcium nitrate?',
      a: ['Ca(NO₃)₂', 'CaNO₃₂', 'CaNO₃', 'Ca₂NO₃'],
      why: 'Ca²⁺ needs two NO₃⁻. More than one polyatomic ion → parentheses: Ca(NO₃)₂.' },
    { id: 'pa2', tag: 'paren', min: 2, q: 'When do you put parentheses around a polyatomic ion?',
      a: ['When the formula needs more than one of it', 'Always', 'Never',
          'Only when the metal is a transition metal'],
      why: 'Parentheses let a subscript multiply the whole ion. With only one of the ion, leave them off.' },
    { id: 'pa3', tag: 'paren', min: 2, q: 'Which formula uses parentheses correctly?',
      a: ['Al₂(SO₄)₃', 'Ca(SO₄)', 'Na(NO₃)', '(Na)₂O'],
      why: 'Al₂(SO₄)₃ has three sulfates, so they need parentheses. The others have one polyatomic ion or none.' },
    { id: 'pa4', tag: 'paren', min: 2, q: 'How many oxygen atoms are in Fe(NO₃)₃?',
      a: ['9', '3', '4', '6'],
      why: 'The 3 outside the parentheses multiplies everything inside: 3 NO₃ = 3 N and 9 O.' },
    { id: 'pa5', tag: 'paren', min: 2, q: 'Why is MgOH₂ the wrong way to write magnesium hydroxide?',
      a: ['The 2 would multiply only the H, not the whole OH', 'It should be Mg₂OH',
          'Hydroxide is OH²⁻', 'It isn’t wrong'],
      why: 'Mg²⁺ needs two whole OH⁻ ions, so it is Mg(OH)₂.' },
    { id: 'pa6', tag: 'paren', min: 2, q: 'Which is correct for sodium sulfate?',
      a: ['Na₂SO₄', 'Na₂(SO₄)', 'NaSO₄', 'Na(SO₄)₂'],
      why: 'Two Na⁺ balance one SO₄²⁻. There is only one sulfate, so no parentheses.' },
    { id: 'pa7', tag: 'paren', min: 2, q: 'Which is correct for ammonium sulfate?',
      a: ['(NH₄)₂SO₄', 'NH₄₂SO₄', 'NH₄SO₄', '(NH₄)SO₄'],
      why: 'Two NH₄⁺ balance one SO₄²⁻. Two ammoniums → parentheses around NH₄.' },
    { id: 'pa8', tag: 'paren', min: 2, q: 'How many ammonium ions are in (NH₄)₃PO₄?',
      a: ['3', '4', '1', '12'],
      why: 'The 3 outside the parentheses counts the NH₄⁺ ions. The 4 inside belongs to hydrogen.' },
    { id: 'pa9', tag: 'paren', min: 2, q: 'Which is correct for aluminum hydroxide?',
      a: ['Al(OH)₃', 'AlOH₃', 'Al₃OH', 'Al(OH)'],
      why: 'Al³⁺ needs three OH⁻. More than one hydroxide → Al(OH)₃.' },

    /* -------------------------------------------------------------- poly */
    { id: 'po1', tag: 'poly', min: 2, q: 'What is the charge on the sulfate ion?',
      a: ['2−', '1−', '3−', '2+'], why: 'Sulfate is SO₄²⁻.' },
    { id: 'po2', tag: 'poly', min: 2, q: 'NO₂⁻ is called…',
      a: ['nitrite', 'nitrate', 'nitride', 'nitrogen dioxide'],
      why: 'NO₃⁻ is nitrate; one fewer oxygen, NO₂⁻, is nitrite. Nitride is N³⁻.' },
    { id: 'po3', tag: 'poly', min: 2, q: 'Which ion is phosphate?',
      a: ['PO₄³⁻', 'PO₃³⁻', 'PO₄²⁻', 'P³⁻'],
      why: 'Phosphate is PO₄³⁻. PO₃³⁻ is phosphite, and P³⁻ is phosphide.' },
    { id: 'po4', tag: 'poly', min: 2, q: 'ClO₄⁻ is…',
      a: ['perchlorate', 'chlorate', 'chlorite', 'hypochlorite'],
      why: 'ClO₃⁻ is chlorate. One more O is per-…-ate: perchlorate.' },
    { id: 'po5', tag: 'poly', min: 2, q: 'ClO⁻ is…',
      a: ['hypochlorite', 'chlorite', 'chloride', 'perchlorate'],
      why: 'ClO₂⁻ is chlorite. One fewer O is hypo-…-ite: hypochlorite.' },
    { id: 'po6', tag: 'poly', min: 2, q: 'Which is the only positive polyatomic ion on your list?',
      a: ['ammonium, NH₄⁺', 'hydroxide, OH⁻', 'nitrate, NO₃⁻', 'carbonate, CO₃²⁻'],
      why: 'Ammonium is the one polyatomic cation. It takes the metal’s place in a name or formula.' },
    { id: 'po7', tag: 'poly', min: 2, q: 'Which formula is dichromate?',
      a: ['Cr₂O₇²⁻', 'CrO₄²⁻', 'Cr₂O₄²⁻', 'CrO₇²⁻'],
      why: 'Chromate is CrO₄²⁻; dichromate is Cr₂O₇²⁻. Both are 2−.' },
    { id: 'po8', tag: 'poly', min: 2, q: 'What is the difference between oxide and peroxide?',
      a: ['Oxide is O²⁻; peroxide is O₂²⁻', 'They are the same ion',
          'Peroxide is O⁻', 'Peroxide is O₃²⁻'],
      why: 'Oxide is one oxygen atom. Peroxide is a polyatomic ion of two oxygens with a 2− charge overall.' },
    { id: 'po9', tag: 'poly', min: 2, q: 'Which two formulas both mean acetate?',
      a: ['C₂H₃O₂⁻ and CH₃COO⁻', 'C₂H₃O₂⁻ and CO₃²⁻', 'CH₃COO⁻ and CN⁻', 'CO₃²⁻ and CN⁻'],
      why: 'Acetate can be written either way — same atoms, same 1− charge.' },
    { id: 'po10', tag: 'poly', min: 2, q: 'What is the name of Ba(OH)₂?',
      a: ['barium hydroxide', 'barium(II) hydroxide', 'barium oxide hydride', 'barium hydroxide(2)'],
      why: 'Ba is Group 2, so no numeral. OH⁻ is hydroxide, and the name never counts the ions.' },
    { id: 'po11', tag: 'poly', min: 2, q: 'What is the name of Fe(NO₃)₂?',
      a: ['iron(II) nitrate', 'iron(I) nitrate', 'iron(II) nitrite', 'iron nitrate'],
      why: 'Two NO₃⁻ make 2−, so the iron is 2+: iron(II) nitrate.' },
    { id: 'po12', tag: 'poly', min: 2, q: 'An -ate ion and the -ite ion of the same element differ by…',
      a: ['one oxygen: the -ate has one more', 'their charge',
          'one oxygen: the -ite has one more', 'one hydrogen'],
      why: 'Sulfate SO₄²⁻ vs sulfite SO₃²⁻; nitrate NO₃⁻ vs nitrite NO₂⁻. Same charge, one fewer O in the -ite.' },
    { id: 'po13', tag: 'poly', min: 2, q: 'What is the charge on the phosphite ion?',
      a: ['3−', '2−', '1−', '3+'], why: 'Phosphite is PO₃³⁻ — same 3− charge as phosphate, PO₄³⁻.' },
    { id: 'po14', tag: 'poly', min: 2, q: 'CN⁻ is…',
      a: ['cyanide', 'carbonate', 'nitride', 'carbide'],
      why: 'CN⁻ is cyanide. Carbonate is CO₃²⁻, and nitride is N³⁻.' },
    { id: 'po15', tag: 'poly', min: 2, q: 'What is the charge on the carbonate ion?',
      a: ['2−', '1−', '3−', '2+'], why: 'Carbonate is CO₃²⁻.' },

    /* ------------------------------------------------- ionic or covalent? */
    { id: 'dc1', tag: 'decide', min: 1, q: 'Which compound is covalent?',
      a: ['PCl₃', 'CaCl₂', 'CuCl₂', 'NH₄Cl'],
      why: 'P and Cl are both nonmetals, so PCl₃ is covalent. Ca and Cu are metals, and NH₄Cl contains the NH₄⁺ ion — all three are ionic.' },
    { id: 'dc2', tag: 'decide', min: 1, q: 'Which compound is ionic?',
      a: ['NH₄Cl', 'NCl₃', 'CCl₄', 'SCl₂'],
      why: 'Every element in NH₄Cl is a nonmetal, but NH₄⁺ is a positive ion — so it is ionic. The others are two nonmetals sharing electrons.' },
    { id: 'dc3', tag: 'decide', min: 1, q: 'What decides whether a compound uses ionic or covalent naming rules?',
      a: ['Whether it starts with a metal (or NH₄⁺) or is made of two nonmetals',
          'Whether its formula has subscripts', 'How many atoms it has', 'Whether it contains oxygen'],
      why: 'Metal (or NH₄⁺) + nonmetal → ionic. Nonmetal + nonmetal → covalent. Nothing else decides it.' },
    { id: 'dc4', tag: 'decide', min: 1, q: 'SnCl₄ and CCl₄ look alike. What are their names?',
      a: ['tin(IV) chloride and carbon tetrachloride', 'tin tetrachloride and carbon tetrachloride',
          'tin(IV) chloride and carbon(IV) chloride', 'tin chloride and carbon chloride'],
      why: 'Sn is a metal (a transition metal in this class), so SnCl₄ is ionic with a Roman numeral. C is a nonmetal, so CCl₄ is covalent with prefixes.' },
    { id: 'dc5', tag: 'decide', min: 1, q: 'CO and CoO differ by one lowercase letter. What are they?',
      a: ['carbon monoxide and cobalt(II) oxide', 'cobalt oxide and cobalt(II) oxide',
          'carbon monoxide and carbon(II) oxide', 'cobalt monoxide and carbon oxide'],
      why: 'C is carbon, a nonmetal: CO is covalent. Co is cobalt, a transition metal: CoO is ionic, and O²⁻ makes the cobalt 2+.' },
    { id: 'dc6', tag: 'decide', min: 1, q: 'Which element is on the nonmetal side of the staircase?',
      a: ['Si', 'Al', 'Sn', 'Ga'],
      why: 'Silicon sits just right of the staircase and bonds covalently with nonmetals. Al, Ga and Sn are metals.' },
    { id: 'dc7', tag: 'decide', min: 1, q: 'Xe is a noble gas. How is XeF₄ named?',
      a: ['xenon tetrafluoride', 'xenon(IV) fluoride', 'xenon fluoride', 'It can’t exist'],
      why: 'Noble gases never form ions, but xenon can share electrons. Two nonmetals sharing → covalent → prefixes.' },
    { id: 'dc8', tag: 'decide', min: 1, q: 'Which of these is covalent?',
      a: ['SO₃', 'Na₂SO₃', 'CaSO₃', 'Both SO₃ and Na₂SO₃'],
      why: 'SO₃ on its own is sulfur trioxide, a molecule of two nonmetals. In Na₂SO₃ the same atoms form the sulfite ion, held to Na⁺ — that is ionic.' },
    { id: 'dc9', tag: 'decide', min: 1, q: 'Which of these is named with a Roman numeral?',
      a: ['Fe₂O₃', 'N₂O₃', 'B₂O₃', 'Al₂O₃'],
      why: 'Fe is a transition metal → iron(III) oxide. N₂O₃ and B₂O₃ are covalent (prefixes). Al₂O₃ is ionic but Al is always 3+.' },
    { id: 'dc10', tag: 'decide', min: 1, q: 'Which of these is named with prefixes?',
      a: ['N₂O₄', 'Na₂O', 'Ni₂O₃', 'NaNO₃'],
      why: 'N₂O₄ is two nonmetals: dinitrogen tetroxide. The others all start with a metal, so they are ionic.' },
    { id: 'dc11', tag: 'decide', min: 1, q: 'Two nonmetals share electrons instead of forming ions. So their names…',
      a: ['use prefixes to count the atoms', 'use Roman numerals for the charge',
          'use no numbers at all', 'end in -ate'],
      why: 'With no ions there is no charge to balance, so the name has to say how many atoms there are.' },
    { id: 'dc12', tag: 'decide', min: 1, q: 'Which pair is ionic + covalent, in that order?',
      a: ['KF and KrF₂', 'KrF₂ and KF', 'KF and CaF₂', 'XeF₂ and KrF₂'],
      why: 'K is a metal: KF is potassium fluoride (ionic). Kr is a noble gas, a nonmetal: KrF₂ is krypton difluoride (covalent).' },

    /* ------------------------------------------------------------ prefixes */
    { id: 'pr1', tag: 'prefix', min: 1, q: 'What does the prefix penta- mean?',
      a: ['5', '4', '6', '7'], why: 'mono 1, di 2, tri 3, tetra 4, penta 5, hexa 6, hepta 7, octa 8, nona 9, deca 10.' },
    { id: 'pr2', tag: 'prefix', min: 1, q: 'Which prefix means 6?',
      a: ['hexa-', 'hepta-', 'penta-', 'octa-'], why: 'hexa- is 6 (SF₆ is sulfur hexafluoride). hepta- is 7.' },
    { id: 'pr3', tag: 'prefix', min: 1, q: 'Which prefix means 7?',
      a: ['hepta-', 'hexa-', 'octa-', 'nona-'], why: 'hepta- is 7 (IF₇ is iodine heptafluoride).' },
    { id: 'pr4', tag: 'prefix', min: 1, q: 'Why is CO “carbon monoxide” and not “monocarbon monoxide”?',
      a: ['mono- is dropped on the first element', 'Carbon never takes a prefix',
          'mono- is only used with oxygen', 'It is an exception to memorize'],
      why: 'When there is one atom of the first element, it gets no prefix. The second element always keeps its prefix, even mono-.' },
    { id: 'pr5', tag: 'prefix', min: 1, q: 'Which name is spelled correctly?',
      a: ['dinitrogen pentoxide', 'dinitrogen pentaoxide', 'dinitrogen pentoxygen', 'nitrogen(V) oxide'],
      why: 'The a of penta- is dropped before oxide: pentoxide. It is covalent, so no Roman numeral.' },
    { id: 'pr6', tag: 'prefix', min: 1, q: 'What is the name of CO₂?',
      a: ['carbon dioxide', 'monocarbon dioxide', 'carbon(IV) oxide', 'carbon oxide'],
      why: 'One C (no prefix on the first element), two O (di-), and oxygen becomes oxide.' },
    { id: 'pr7', tag: 'prefix', min: 1, q: 'What is the name of PCl₅?',
      a: ['phosphorus pentachloride', 'monophosphorus pentachloride', 'phosphorus(V) chloride', 'phosphorus chloride'],
      why: 'Two nonmetals → prefixes. One P gets no prefix; five Cl is pentachloride.' },
    { id: 'pr8', tag: 'prefix', min: 1, q: 'Does the second element ever drop its mono-?',
      a: ['No — carbon monoxide keeps it', 'Yes, always', 'Only before oxide', 'Only for halogens'],
      why: 'Only the first element drops mono-. The second always shows its count: monoxide, monochloride, monofluoride.' },
    { id: 'pr9', tag: 'prefix', min: 1, q: 'Which prefix means 10?',
      a: ['deca-', 'nona-', 'octa-', 'dodeca-'], why: 'deca- is 10: P₄O₁₀ is tetraphosphorus decoxide.' },
    { id: 'pr10', tag: 'prefix', min: 1, q: 'Which name is spelled correctly?',
      a: ['carbon monoxide', 'carbon monooxide', 'carbon mono-oxide', 'carbon oxide'],
      why: 'The o of mono- is dropped before oxide: monoxide.' },
    { id: 'pr11', tag: 'prefix', min: 1, q: 'Which name is spelled correctly?',
      a: ['dinitrogen tetroxide', 'dinitrogen tetraoxide', 'dinitrogen tetroxygen', 'nitrogen(IV) oxide'],
      why: 'The a of tetra- is dropped before oxide: tetroxide. Dioxide and trioxide keep their i.' },
    { id: 'pr12', tag: 'prefix', min: 1, q: 'What is the formula of disulfur dichloride?',
      a: ['S₂Cl₂', 'SCl', 'SCl₂', 'S₂Cl'],
      why: 'di- and di-: two S and two Cl. Covalent formulas are never reduced — SCl₂ is sulfur dichloride, a different compound.' },

    /* ------------------------------------------ covalent formulas: never reduce */
    { id: 'cr1', tag: 'covred', min: 2, q: 'Why is N₂O₄ not reduced to NO₂?',
      a: ['They are two different molecules — a covalent formula gives the actual atoms',
          'Reducing is optional', 'N₂O₄ is ionic', 'NO₂ is not a real compound'],
      why: 'N₂O₄ (dinitrogen tetroxide) and NO₂ (nitrogen dioxide) are both real, different molecules.' },
    { id: 'cr2', tag: 'covred', min: 2, q: 'What is the formula of dinitrogen tetroxide?',
      a: ['N₂O₄', 'NO₂', 'N₄O₂', 'N₂O₂'], why: 'di- → 2 N, tetr- → 4 O. Never reduce a covalent formula.' },
    { id: 'cr3', tag: 'covred', min: 2, q: 'Which statement is true?',
      a: ['Ionic formulas are reduced to the lowest ratio; covalent formulas never are',
          'Both are always reduced', 'Neither is ever reduced',
          'Covalent formulas are reduced; ionic formulas are not'],
      why: 'An ionic formula is a ratio of ions (TiO₂, not Ti₂O₄). A covalent formula is one real molecule (N₂O₄ stays N₂O₄).' },
    { id: 'cr4', tag: 'covred', min: 2, q: 'What is the formula of tetraphosphorus decoxide?',
      a: ['P₄O₁₀', 'P₂O₅', 'P₁₀O₄', 'PO₁₀'],
      why: 'tetra- → 4 P, dec- → 10 O. P₂O₅ is a different name: diphosphorus pentoxide.' },
    { id: 'cr5', tag: 'covred', min: 2, q: 'Which pair shows the same kind of compound written correctly?',
      a: ['TiO₂ (ionic, reduced) and N₂O₄ (covalent, not reduced)', 'Ti₂O₄ and N₂O₄',
          'TiO₂ and NO₂ for dinitrogen tetroxide', 'Ti₂O₄ and NO₂'],
      why: 'Titanium(IV) oxide reduces from Ti₂O₄ to TiO₂. Dinitrogen tetroxide stays N₂O₄.' },

    /* --------------------------------------------- cross-over mistakes */
    { id: 'cx1', tag: 'cross', min: 1, q: 'A student named CaCl₂ “calcium dichloride.” What is wrong?',
      a: ['CaCl₂ is ionic, and ionic names never use prefixes', 'It should be dicalcium chloride',
          'It should be calcium(II) chloride', 'Nothing — it is correct'],
      why: 'Ca is a metal, so this is ionic: calcium chloride. The charges (Ca²⁺, Cl⁻) already fix the 1 : 2 ratio.' },
    { id: 'cx2', tag: 'cross', min: 1, q: 'A student named FeCl₃ “iron trichloride.” What is wrong?',
      a: ['It is ionic with a transition metal: iron(III) chloride', 'Nothing — it is correct',
          'It should be monoiron trichloride', 'It should be iron chlorine'],
      why: 'Fe is a transition metal, so its charge goes in a Roman numeral. Prefixes are only for two nonmetals.' },
    { id: 'cx3', tag: 'cross', min: 1, q: 'A student named NO₂ “nitrogen(IV) oxide.” What is wrong?',
      a: ['It is covalent, so it uses prefixes: nitrogen dioxide', 'Nothing — it is correct',
          'It should be nitrogen(II) oxide', 'It should be nitrite'],
      why: 'N and O are both nonmetals — no ions, no charges, no Roman numeral.' },
    { id: 'cx4', tag: 'cross', min: 1, q: 'Calcium chloride has no prefixes in its name. How many chloride ions does it have per calcium?',
      a: ['2 — the charges decide', '1', 'You can’t tell', '0'],
      why: 'Ionic names never show counts. Ca²⁺ needs two Cl⁻ to balance: CaCl₂.' },
    { id: 'cx5', tag: 'cross', min: 1, q: 'NO₂ and NO₂⁻ — what is the difference?',
      a: ['NO₂ is the molecule nitrogen dioxide; NO₂⁻ is the nitrite ion', 'They are the same thing',
          'NO₂ is nitrite; NO₂⁻ is nitrogen dioxide', 'Both are covalent compounds'],
      why: 'Without a charge it is a whole molecule (covalent, prefixes). With a charge it is a polyatomic ion inside an ionic compound, like NaNO₂, sodium nitrite.' },
    { id: 'cx6', tag: 'cross', min: 1, q: 'NH₄Cl contains only nonmetals. How is it named?',
      a: ['ammonium chloride — NH₄⁺ makes it ionic', 'nitrogen tetrahydride chloride',
          'monoammonium monochloride', 'ammonium(I) chloride'],
      why: 'NH₄⁺ is a positive ion and takes the metal’s place. Ionic: no prefixes, and ammonium never takes a numeral.' },
    { id: 'cx7', tag: 'cross', min: 1, q: 'Which name mixes up the rules?',
      a: ['sulfur(VI) fluoride', 'sulfur hexafluoride', 'iron(III) fluoride', 'calcium fluoride'],
      why: 'Sulfur and fluorine are both nonmetals, so SF₆ is covalent: sulfur hexafluoride. A Roman numeral never goes on a covalent name.' },

    /* ------------------------------------------------------------ acid names */
    { id: 'ac1', tag: 'acid', min: 1, q: 'When does an acid name start with hydro-?',
      a: ['When the negative ion has no oxygen, like HCl and H₂S', 'Always',
          'When the acid has two or more H', 'When the negative ion is polyatomic'],
      why: 'Hydro- marks a binary acid — no oxygen. Oxyacids (HNO₃, H₂SO₄) never take it.' },
    { id: 'ac2', tag: 'acid', min: 1, q: 'An acid made from an -ate ion is named…',
      a: ['root + -ic acid', 'root + -ous acid', 'hydro- + root + -ic acid', 'root + -ate acid'],
      why: '-ate becomes -ic: sulfate → sulfuric acid, nitrate → nitric acid.' },
    { id: 'ac3', tag: 'acid', min: 1, q: 'An acid made from an -ite ion is named…',
      a: ['root + -ous acid', 'root + -ic acid', 'hydro- + root + -ous acid', 'root + -ite acid'],
      why: '-ite becomes -ous: sulfite → sulfurous acid, nitrite → nitrous acid.' },
    { id: 'ac4', tag: 'acid', min: 1, q: 'What is the name of H₂SO₄?',
      a: ['sulfuric acid', 'hydrosulfuric acid', 'sulfurous acid', 'sulfic acid'],
      why: 'SO₄²⁻ is sulfate: -ate → -ic, no hydro- because it contains oxygen. The root keeps its -ur: sulfuric.' },
    { id: 'ac5', tag: 'acid', min: 1, q: 'What is the name of H₂S?',
      a: ['hydrosulfuric acid', 'sulfuric acid', 'sulfurous acid', 'hydrogen sulfate'],
      why: 'S²⁻ has no oxygen, so it is a binary acid: hydro- + sulfur + -ic.' },
    { id: 'ac6', tag: 'acid', min: 1, q: 'What is the name of HClO?',
      a: ['hypochlorous acid', 'chlorous acid', 'hypochloric acid', 'hydrochloric acid'],
      why: 'ClO⁻ is hypochlorite. Keep the hypo-, and -ite becomes -ous.' },
    { id: 'ac7', tag: 'acid', min: 1, q: 'What is the name of HClO₄?',
      a: ['perchloric acid', 'chloric acid', 'perchlorous acid', 'hydrochloric acid'],
      why: 'ClO₄⁻ is perchlorate. Keep the per-, and -ate becomes -ic.' },
    { id: 'ac8', tag: 'acid', min: 1, q: 'What is the name of HCN?',
      a: ['hydrocyanic acid', 'cyanic acid', 'cyanous acid', 'hydrogen carbonate'],
      why: 'CN⁻ is polyatomic but has no oxygen, so it is named like a binary acid: hydro-…-ic.' },
    { id: 'ac9', tag: 'acid', min: 1, q: 'Why is H₃PO₄ “phosphoric acid” and not “phosphic acid”?',
      a: ['The root of phosphorus acids keeps its -or', 'Phosphic acid is a different acid',
          'Because it has three H', 'Because phosphate is 3−'],
      why: 'Sulfur and phosphorus acids keep the whole root: sulfuric, sulfurous, phosphoric, phosphorous.' },
    { id: 'ac10', tag: 'acid', min: 1, q: 'HNO₃ and HNO₂ are…',
      a: ['nitric acid and nitrous acid', 'nitrous acid and nitric acid',
          'hydronitric acid and nitrous acid', 'both nitric acid'],
      why: 'NO₃⁻ is nitrate (-ate → -ic); NO₂⁻ is nitrite (-ite → -ous).' },
    { id: 'ac11', tag: 'acid', min: 1, q: 'Which two formulas are both acetic acid?',
      a: ['HC₂H₃O₂ and CH₃COOH', 'HC₂H₃O₂ and H₂CO₃', 'CH₃COOH and HCO₃', 'H₂C₂H₃O₂ and CH₃COOH'],
      why: 'Acetate can be written C₂H₃O₂⁻ or CH₃COO⁻, so acetic acid is HC₂H₃O₂ or CH₃COOH.' },
    { id: 'ac12', tag: 'acid', min: 1, q: 'Which acid name is correct for HClO₂?',
      a: ['chlorous acid', 'chloric acid', 'hypochlorous acid', 'hydrochlorous acid'],
      why: 'ClO₂⁻ is chlorite — no per-, no hypo- — and -ite becomes -ous.' },

    /* ---------------------------------------------------------- acid formulas */
    { id: 'af1', tag: 'acidf', min: 1, q: 'What decides how many H are in an acid’s formula?',
      a: ['The charge of the negative ion', 'The number of oxygens', 'A prefix in the name', 'It is always one'],
      why: 'Each H is 1+, so the H count equals the anion’s charge: SO₄²⁻ → H₂SO₄, PO₄³⁻ → H₃PO₄.' },
    { id: 'af2', tag: 'acidf', min: 1, q: 'What is the formula of phosphoric acid?',
      a: ['H₃PO₄', 'HPO₄', 'H₃PO₃', 'H₃(PO₄)'],
      why: 'Phosphoric comes from phosphate, PO₄³⁻: three H. No parentheses — there is only one phosphate.' },
    { id: 'af3', tag: 'acidf', min: 1, q: 'What is the formula of chlorous acid?',
      a: ['HClO₂', 'HClO₃', 'HClO', 'HCl'],
      why: '-ous comes from -ite: chlorite, ClO₂⁻. One H balances 1−.' },
    { id: 'af4', tag: 'acidf', min: 1, q: 'Why does H₂SO₄ have no parentheses?',
      a: ['There is only one sulfate ion', 'Acids are covalent', 'Sulfate is not polyatomic', 'It should be H₂(SO₄)'],
      why: 'Parentheses only show more than one polyatomic ion. An acid always has just one anion.' },
    { id: 'af5', tag: 'acidf', min: 1, q: 'What is the formula of carbonic acid?',
      a: ['H₂CO₃', 'HCO₃', 'H₂CO₂', 'H₂C₂O₃'],
      why: 'Carbonic comes from carbonate, CO₃²⁻: two H.' },
    { id: 'af6', tag: 'acidf', min: 1, q: 'What is the formula of hydrobromic acid?',
      a: ['HBr', 'HBrO₃', 'H₂Br', 'HBrO'],
      why: 'Hydro-…-ic means no oxygen: H + Br⁻. HBrO₃ is bromic acid.' },
    { id: 'af7', tag: 'acidf', min: 1, q: 'What is the formula of sulfurous acid?',
      a: ['H₂SO₃', 'H₂SO₄', 'H₂S', 'HSO₃'],
      why: '-ous comes from -ite: sulfite, SO₃²⁻, so two H.' },

    /* ------------------------------------------- acid or not? (all compounds) */
    { id: 'ax1', tag: 'acidx', min: 2, q: 'HNO₃ and NaNO₃ contain the same ion. What are their names?',
      a: ['nitric acid and sodium nitrate', 'hydrogen nitrate and sodium nitrate',
          'nitric acid and sodium nitric', 'nitrous acid and sodium nitrite'],
      why: 'With H in front it is an acid (-ate → -ic). With a metal in front it is ionic and the ion keeps its name.' },
    { id: 'ax2', tag: 'acidx', min: 2, q: 'Which of these is an acid?',
      a: ['H₂SO₄', 'Na₂SO₄', 'SO₃', 'SF₆'],
      why: 'Only H₂SO₄ starts with H. Na₂SO₄ is ionic; SO₃ and SF₆ are covalent.' },
    { id: 'ax3', tag: 'acidx', min: 2, q: 'SO₃ and H₂SO₃ — what are they?',
      a: ['sulfur trioxide and sulfurous acid', 'sulfite and sulfuric acid',
          'sulfur trioxide and sulfuric acid', 'sulfurous acid and sulfur trioxide'],
      why: 'SO₃ alone is two nonmetals → covalent. H₂SO₃ is H + sulfite → sulfurous acid.' },
    { id: 'ax4', tag: 'acidx', min: 2, q: 'What is the first question to ask when naming any compound?',
      a: ['Does it start with H? Then it is an acid.', 'Does it contain oxygen?',
          'How many atoms does it have?', 'Is it a gas?'],
      why: 'Starts with H → acid. Otherwise: metal or NH₄⁺ → ionic; two nonmetals → covalent.' },
    { id: 'ax5', tag: 'acidx', min: 2, q: 'Which name uses the -ous ending correctly?',
      a: ['HNO₂, nitrous acid', 'NaNO₂, sodium nitrous', 'NO₂, nitrous oxide', 'HNO₃, nitrous acid'],
      why: '-ous only appears in acid names from -ite ions. Ionic compounds keep the ion’s name (sodium nitrite).' },
    { id: 'ax6', tag: 'acidx', min: 2, q: 'HCl and NaCl: which is named with hydro-?',
      a: ['HCl — hydrochloric acid', 'NaCl — sodium hydrochloride', 'Both', 'Neither'],
      why: 'HCl starts with H and chloride has no oxygen → hydrochloric acid. NaCl is ionic: sodium chloride.' }
  ];

  var BY_ID = {};
  BANK.forEach(function (x) { BY_ID[x.id] = x; });

  /* ------------------------------------------------------------ generators */

  var U = Chem.uni, R = Chem.ROMAN, P = Chem.PREFIXES, EL = Chem.EL;

  function unique(list, exclude) {
    var seen = {}, out = [];
    seen[exclude] = true;
    list.forEach(function (x) {
      if (x == null || seen[x]) return;
      seen[x] = true;
      out.push(x);
    });
    return out;
  }

  function ionsCarry(cpd) {
    var tot = cpd.n * cpd.a.charge;
    return (cpd.n > 1 ? 'The ' + cpd.n + ' ' + U(cpd.a.t) + ' ions carry '
                      : 'The ' + U(cpd.a.t) + ' ion carries ') + tot + '− in total. ' +
           (cpd.m > 1 ? cpd.m + ' ' + cpd.c.t + ' share it: ' + cpd.q + '+ each.'
                      : 'One ' + cpd.c.t + ' balances it alone: ' + cpd.q + '+.');
  }

  function genCharge(cpd) {
    var F = U(Chem.formula(cpd));
    var right = cpd.q + '+';
    var wrong = unique([cpd.n + '+', (cpd.n * cpd.a.charge) + '+']
      .concat(cpd.c.charges.map(function (x) { return x + '+'; }))
      .concat(['1+', '2+', '3+', '4+']), right).slice(0, 3);
    return {
      tag: 'charge',
      q: 'In ' + F + ', what is the charge on ' + (cpd.m > 1 ? 'each ' : 'the ') + cpd.c.t + ' ion?',
      a: [right].concat(wrong),
      why: ionsCarry(cpd) + ' → ' + Chem.name(cpd) + '.'
    };
  }

  function formulaWith(cpd, m, n, parens, anion) {
    var a = anion || cpd.a;
    var cp = parens === 'none' ? false : parens === 'all' ? cpd.c.poly : cpd.c.poly && m > 1;
    var ap = parens === 'none' ? false : parens === 'all' ? a.poly : a.poly && n > 1;
    return U(Chem.block(cpd.c.t, m, cp) + Chem.block(a.t, n, ap));
  }

  function genFormula(cpd) {
    var t = Chem.traits(cpd);
    var right = U(Chem.formula(cpd));
    var cands = [];
    if (t.parens) cands.push(formulaWith(cpd, cpd.m, cpd.n, 'none'));
    if (cpd.c.tm && cpd.q !== cpd.m) cands.push(formulaWith(cpd, cpd.q, 1));
    if (t.binary && (cpd.m > 1 || cpd.n > 1)) cands.push(formulaWith(cpd, 1, 1));
    if (t.reduced) cands.push(formulaWith(cpd, cpd.a.charge, cpd.q));
    if (t.poly && !t.parens) cands.push(formulaWith(cpd, cpd.m, cpd.n, 'all'));
    cands.push(formulaWith(cpd, cpd.n, cpd.m));
    var sib = Chem.make(cpd.c.t, cpd.q, cpd.a.near[0]);
    if (sib) cands.push(U(Chem.formula(sib)));
    cands.push(formulaWith(cpd, cpd.m + 1, cpd.n));
    cands.push(formulaWith(cpd, cpd.m, cpd.n + 1));
    var tot = cpd.m * cpd.q;
    return {
      tag: t.parens ? 'paren' : cpd.c.tm ? 'numeral' : 'reduce',
      q: 'Which formula is ' + Chem.name(cpd) + '?',
      a: [right].concat(unique(cands, right).slice(0, 3)),
      why: Chem.catIon(cpd.c, cpd.q) + ' and ' + Chem.anIon(cpd.a) + ': ' +
           cpd.m + ' × ' + cpd.q + '+ = ' + tot + '+ balances ' +
           cpd.n + ' × ' + cpd.a.charge + '− = ' + tot + '−.' +
           (t.reduced ? ' Written in lowest terms.' : '') +
           (t.parens ? ' More than one polyatomic ion, so it goes in parentheses.' : '')
    };
  }

  function genName(cpd) {
    var c = cpd.c, a = cpd.a;
    var right = Chem.name(cpd);
    var cands = [];
    /* the covalent habit applied to an ionic compound: iron trichloride */
    if (!c.poly && !a.poly) {
      cands.push((cpd.m > 1 ? P[cpd.m] : '') + c.name + ' ' + Chem.elide(P[cpd.n], a.name));
    }
    if (c.tm) {
      cands.push(c.name + ' ' + a.name);
      if (cpd.n !== cpd.q) cands.push(c.name + '(' + R[cpd.n] + ') ' + a.name);
      if (cpd.m !== cpd.q) cands.push(c.name + '(' + R[cpd.m] + ') ' + a.name);
      c.charges.forEach(function (x) { if (x !== cpd.q) cands.push(c.name + '(' + R[x] + ') ' + a.name); });
    } else {
      cands.push(c.name + '(' + R[cpd.q] + ') ' + a.name);
    }
    var head = c.tm ? c.name + '(' + R[cpd.q] + ') ' : c.name + ' ';
    if (a.el) cands.push(head + a.el);
    a.near.forEach(function (t) { if (Chem.AN[t]) cands.push(head + Chem.AN[t].name); });
    var nearCat = Chem.CAT[c.near[0]];
    if (nearCat) cands.push(nearCat.name + (c.tm ? '(' + R[cpd.q] + ') ' : ' ') + a.name);
    return {
      tag: 'tm',
      q: 'What is the name of ' + U(Chem.formula(cpd)) + '?',
      a: [right].concat(unique(cands, right).slice(0, 3)),
      why: c.tm
        ? c.t + ' is a transition metal, so the name needs its charge. ' + ionsCarry(cpd) +
          ' → (' + R[cpd.q] + ').'
        : c.why + ' No numeral.'
    };
  }

  /* ---------------------------------------------------- covalent generators */

  function covWith(cpd, x, y) { return U(Chem.block(cpd.e1, x) + Chem.block(cpd.e2, y)); }

  function covNameWith(cpd, x, y, secondWord) {
    return (x > 1 ? P[x] : '') + EL[cpd.e1] + ' ' + Chem.elide(P[y], secondWord || Chem.AN[cpd.e2].name);
  }

  function prefixWhy(cpd) {
    var t = Chem.traits(cpd);
    return 'Two nonmetals → covalent → prefixes count the atoms: ' +
           (cpd.x > 1 ? P[cpd.x] + '- for ' + cpd.x + ' ' + cpd.e1 : 'one ' + cpd.e1 + ', so no prefix on the first element') +
           ', and ' + P[cpd.y] + '- for ' + cpd.y + ' ' + cpd.e2 + '.' +
           (t.reducible ? ' Never reduce a covalent formula.' : '');
  }

  /* The charge a student would invent by treating a covalent compound as ionic. */
  function fakeCharge(cpd) {
    var an = Chem.AN[cpd.e2];
    var q = cpd.y * an.charge / cpd.x;
    return q === Math.floor(q) && q >= 1 && q <= 8 ? q : null;
  }

  function genCovName(cpd) {
    var right = Chem.name(cpd);
    var g = Chem.gcd(cpd.x, cpd.y);
    var cands = [];
    var fq = fakeCharge(cpd);
    if (fq) cands.push(EL[cpd.e1] + '(' + R[fq] + ') ' + Chem.AN[cpd.e2].name);
    if (cpd.x === 1) cands.push('mono' + right);
    if (g > 1) cands.push(covNameWith(cpd, cpd.x / g, cpd.y / g));
    if (cpd.x !== cpd.y) cands.push(covNameWith(cpd, cpd.y, cpd.x));
    cands.push(EL[cpd.e1] + ' ' + Chem.AN[cpd.e2].name);
    cands.push(covNameWith(cpd, cpd.x, cpd.y, EL[cpd.e2]));
    return {
      tag: 'prefix',
      q: 'What is the name of ' + U(cpd.f) + '?',
      a: [right].concat(unique(cands, right).slice(0, 3)),
      why: prefixWhy(cpd)
    };
  }

  function genCovFormula(cpd) {
    var right = U(cpd.f);
    var g = Chem.gcd(cpd.x, cpd.y);
    var cands = [];
    if (g > 1) cands.push(covWith(cpd, cpd.x / g, cpd.y / g));
    if (cpd.x !== cpd.y) cands.push(covWith(cpd, cpd.y, cpd.x));
    if (cpd.x > 1) cands.push(covWith(cpd, 1, cpd.y));
    cands.push(covWith(cpd, cpd.x + 1, cpd.y));
    cands.push(covWith(cpd, cpd.x, cpd.y + 1));
    if (cpd.y > 1) cands.push(covWith(cpd, cpd.x, cpd.y - 1));
    cands.push(covWith(cpd, cpd.x * 2, cpd.y * 2));
    return {
      tag: g > 1 ? 'covred' : 'prefix',
      q: 'What is the formula of ' + Chem.name(cpd) + '?',
      a: [right].concat(unique(cands, right).slice(0, 3)),
      why: prefixWhy(cpd)
    };
  }

  function genRule(cpd) {
    var r = Chem.rule(cpd);
    var others = ['acid', 'ion', 'tm', 'cov'].filter(function (k) { return k !== r; });
    return {
      tag: 'decide',
      q: 'Which naming rules apply to ' + U(Chem.formula(cpd)) + '?',
      a: [Chem.RULES[r]].concat(others.map(function (k) { return Chem.RULES[k]; })),
      why: Chem.ruleWhy(cpd)
    };
  }

  /* ------------------------------------------------------- acid generators */

  var ACID_LIST = Chem.allAcids();

  function acidNameWith(pre, root, end) { return (pre ? 'hydro' : '') + root + end + ' acid'; }

  function genAcidName(cpd) {
    var right = Chem.name(cpd);
    var end = cpd.type === 'ous' ? 'ous' : 'ic', other = end === 'ic' ? 'ous' : 'ic';
    var cands = [
      acidNameWith(cpd.type !== 'bin', cpd.root, end),
      acidNameWith(cpd.type === 'bin', cpd.root, other),
      acidNameWith(false, cpd.root, other)
    ];
    if (/^(sulfur|phosphor)$/.test(cpd.root)) cands.unshift(acidNameWith(cpd.type === 'bin', cpd.root.replace(/(ur|or)$/, ''), end));
    if (cpd.type === 'bin') cands.push('hydrogen ' + cpd.a.name);
    cands.push(cpd.a.name + ' acid');
    if (/chlor$/.test(cpd.root)) {
      ['hypochlor', 'chlor', 'perchlor'].forEach(function (r) { if (r !== cpd.root) cands.push(acidNameWith(false, r, end)); });
    }
    return {
      tag: 'acid',
      q: 'What is the name of ' + U(Chem.formula(cpd)) + '?',
      a: [right].concat(unique(cands, right).slice(0, 3)),
      why: Chem.acidWhy(cpd) + ' → ' + right + '.'
    };
  }

  function genAcidFormula(cpd) {
    var right = U(cpd.f), a = cpd.a, t = a.t;
    var cands = [];
    if (cpd.n > 1) cands.push(U(t.replace(/^/, 'H')));
    cands.push(U(Chem.block('H', cpd.n + 1) + t));
    if (cpd.n > 1) cands.push(U(Chem.block('H', cpd.n) + '(' + t + ')'));
    a.near.forEach(function (x) {
      var other = Chem.fromCode('h.' + x);
      if (other) cands.push(U(other.f));
    });
    cands.push(U(Chem.block('H', cpd.n) + Chem.block(t, 2, a.poly)));
    return {
      tag: 'acidf',
      q: 'What is the formula of ' + Chem.name(cpd) + '?',
      a: [right].concat(unique(cands, right).slice(0, 3)),
      why: 'It comes from ' + Chem.anIon(a) + ' (' + a.name + '). Each H is 1+, so ' +
           (cpd.n > 1 ? cpd.n + ' H balance' : 'one H balances') + ' the ' + a.charge + '− charge: ' + right + '.'
    };
  }

  function genAcidType(cpd) {
    var keys = ['bin', 'ic', 'ous'];
    return {
      tag: 'acid',
      q: 'Which acid rule does ' + U(cpd.f) + ' follow?',
      a: [Chem.ACID_TYPES[cpd.type]].concat(keys.filter(function (k) { return k !== cpd.type; })
        .map(function (k) { return Chem.ACID_TYPES[k]; })),
      why: Chem.acidWhy(cpd)
    };
  }

  /* ------------------------------------------------------------ public API */

  /* code: "q:tm1" for a bank question, "g:c:Fe3.O" etc. for a generated one.
     g:r: is "which rules?"; g:f: and g:n: work for both kinds of compound. */
  function build(code) {
    var parts = code.split(':');
    if (parts[0] === 'q') {
      var b = BY_ID[parts[1]];
      return b ? { tag: b.tag, q: b.q, a: b.a.slice(), why: b.why } : null;
    }
    if (parts[0] === 'g') {
      var cpd = Chem.fromCode(parts.slice(2).join(':'));
      if (!cpd) return null;
      if (parts[1] === 'r') return genRule(cpd);
      if (cpd.kind === 'acid') {
        if (parts[1] === 'n') return genAcidName(cpd);
        if (parts[1] === 'f') return genAcidFormula(cpd);
        if (parts[1] === 't') return genAcidType(cpd);
        return null;
      }
      if (cpd.kind === 'cov') {
        if (parts[1] === 'f') return genCovFormula(cpd);
        if (parts[1] === 'n') return genCovName(cpd);
        return null;
      }
      if (parts[1] === 'c') return genCharge(cpd);
      if (parts[1] === 'f') return genFormula(cpd);
      if (parts[1] === 'n') return genName(cpd);
    }
    return null;
  }

  function tagOf(code) {
    var x = build(code);
    return x ? x.tag : null;
  }

  return { BANK: BANK, build: build, tagOf: tagOf };
})();

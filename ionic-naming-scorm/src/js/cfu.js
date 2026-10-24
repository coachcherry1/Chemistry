/* cfu.js — check-for-understanding questions. No DOM.
 *
 * Two sources:
 *   BANK       written questions. a[0] is the right answer; options are
 *              shuffled when shown. `min` is the first level that may ask
 *              it: 1, or 2 for anything about naming or formulas.
 *   generators questions built from a compound in the pool, so a run never
 *              runs dry and the numbers change every time:
 *                g:c:<code>  "In PbO2, what is the charge on the lead?"
 *                g:f:<code>  "Which formula is iron(III) sulfate?"
 *                g:n:<code>  "What is the name of CuCl2?"
 *
 * Tags: tm (which metals take a numeral), fixed (one-charge metals), ide
 * (single-element anions), ionic (what forms an ionic compound), numeral (what
 * the numeral means), charge (metal charge from a formula), reduce (lowest
 * terms), paren (parentheses rule), poly (polyatomic ion names and charges).
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
      a: ['2−', '1−', '3−', '2+'], why: 'Carbonate is CO₃²⁻.' }
  ];

  var BY_ID = {};
  BANK.forEach(function (x) { BY_ID[x.id] = x; });

  /* ------------------------------------------------------------ generators */

  var U = Chem.uni, R = Chem.ROMAN;

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

  /* ------------------------------------------------------------ public API */

  /* code: "q:tm1" for a bank question, "g:c:Fe3.O" etc. for a generated one */
  function build(code) {
    var parts = code.split(':');
    if (parts[0] === 'q') {
      var b = BY_ID[parts[1]];
      return b ? { tag: b.tag, q: b.q, a: b.a.slice(), why: b.why } : null;
    }
    if (parts[0] === 'g') {
      var cpd = Chem.fromCode(parts.slice(2).join(':'));
      if (!cpd) return null;
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

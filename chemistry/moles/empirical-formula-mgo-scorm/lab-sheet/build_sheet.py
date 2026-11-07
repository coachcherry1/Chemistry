"""Builds the paper lab sheet that goes with the virtual lab: Empirical Formula of Magnesium Oxide.

Student sheet (students write every reading and calculation on paper) and a teacher edition (a worked example with
sample data, how to check the random numbers each student gets in the simulation, and the answers to the rest).
Every number in the teacher edition is computed here (Mg 24.31 g/mol or 24.3, O 16.0, N 14.01, N_A 6.022e23).

Run:  python3 build_sheet.py     (needs python-docx)
"""
import os
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = "Calibri"
MG, O, N, NA = 24.31, 16.00, 14.01, 6.022e23
SPACE = 0.56            # writing space is scaled so the student sheet fits one sheet, front and back

# ------------------------------------------------------------ the worked example (teacher edition)
CRUC, MGM = 28.4127, 0.1523
TOTAL3 = CRUC + MGM
MGO = MGM * (MG + O) / MG
PRODUCT = round(MGO * 0.9985, 4)             # a little scatter, as the simulation gives
FINAL = CRUC + PRODUCT
OXY = FINAL - TOTAL3
N_MG, N_O = MGM / MG, OXY / O
ATOMS = N_MG * NA
RATIO = N_O / N_MG
assert abs(RATIO - 1) < 0.02 and 0.09 < OXY < 0.11
NITRIDE_PER_MG = N * 2 / 3
NITRIDE_RATIO = NITRIDE_PER_MG / O


def f4(x): return "%.4f" % x
def sf(x, n):
    from decimal import Decimal, ROUND_HALF_UP
    import math
    d = n - int(math.floor(math.log10(abs(x)))) - 1
    v = Decimal(repr(x)).quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP)
    return ("%.*f" % (d, v)) if d > 0 else "%d" % v


def sci(x, n=4):
    import math
    e = int(math.floor(math.log10(abs(x)))); m = x / 10 ** e
    return "%s × 10%s" % (sf(m, n), str(e).translate(str.maketrans("-0123456789", "⁻⁰¹²³⁴⁵⁶⁷⁸⁹")))


# ------------------------------------------------------------ docx helpers
def run(p, text, size=10.5, bold=False, italic=False, color=None):
    r = p.add_run(text)
    r.font.name = FONT
    r._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    r.font.size = Pt(size)
    r.bold, r.italic = bold, italic
    if color:
        r.font.color.rgb = RGBColor.from_string(color)
    return r


def rich(p, text, size=10.5, color=None, italic=False):
    for i, seg in enumerate(text.split("**")):
        if seg:
            run(p, seg, size, bold=(i % 2 == 1), color=color, italic=italic)


def fmt(p, before=0, after=0, left=None, hang=None, keep=False, line=None):
    pf = p.paragraph_format
    pf.space_before, pf.space_after = Pt(before), Pt(after)
    if left is not None:
        pf.left_indent = Inches(left)
    if hang is not None:
        pf.first_line_indent = Inches(-hang)
    if keep:
        pf.keep_with_next = True
    if line:
        pf.line_spacing = line
    return p


def shade(p, fill):
    ppr = p._p.get_or_add_pPr(); sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), fill); ppr.append(sh)


def cell_shade(c, fill):
    pr = c._tc.get_or_add_tcPr(); sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), fill); pr.append(sh)


def rule(p):
    ppr = p._p.get_or_add_pPr(); b = OxmlElement("w:pBdr"); bt = OxmlElement("w:bottom")
    bt.set(qn("w:val"), "single"); bt.set(qn("w:sz"), "8"); bt.set(qn("w:space"), "1"); bt.set(qn("w:color"), "000000")
    b.append(bt); ppr.append(b)


def new_doc():
    d = Document()
    st = d.styles["Normal"]; st.font.name = FONT; st.element.rPr.rFonts.set(qn("w:eastAsia"), FONT); st.font.size = Pt(10)
    s = d.sections[0]
    s.page_width, s.page_height = Inches(8.5), Inches(11)
    s.left_margin = s.right_margin = Inches(0.6)
    s.top_margin = Inches(0.5); s.bottom_margin = Inches(0.5)
    return d


def footer(d, text):
    p = d.sections[0].footer.paragraphs[0]
    run(p, text + "  •  page ", 8, color="666666")
    for kind, txt in (("begin", None), (None, "PAGE"), ("end", None)):
        r = p.add_run(); r.font.size = Pt(8)
        if kind:
            fc = OxmlElement("w:fldChar"); fc.set(qn("w:fldCharType"), kind); r._r.append(fc)
        else:
            it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve"); it.text = txt; r._r.append(it)


def heading(d, text, size=11.5, before=5, brk=False):
    p = fmt(d.add_paragraph(), before=before, after=3, keep=True)
    if brk:
        p.paragraph_format.page_break_before = True
    run(p, text, size, bold=True)
    return p


def para(d, text, size=10, before=0, after=3, left=None, hang=None, italic=False, color=None):
    p = fmt(d.add_paragraph(), before=before, after=after, left=left, hang=hang)
    rich(p, text, size, color=color, italic=italic)
    return p


def table(d, rows, widths, size=10, height=None, header=True, bold_first=False):
    t = d.add_table(rows=len(rows), cols=len(widths))
    t.style = "Table Grid"; t.autofit = False; t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for col, w in zip(t.columns, widths):
        col.width = Inches(w)
    for i, r in enumerate(rows):
        for j, txt in enumerate(r):
            c = t.cell(i, j); c.width = Inches(widths[j]); c.text = ""
            p = c.paragraphs[0]; fmt(p, before=2, after=2, keep=(i < len(rows) - 1))
            rich(p, txt, size)
            if header and i == 0:
                cell_shade(c, "D9D9D9")
                for r_ in p.runs: r_.bold = True
            elif bold_first and j == 0:
                for r_ in p.runs: r_.bold = True
        if height and (i > 0 or not header):
            t.rows[i].height = Inches(height)
    fmt(d.add_paragraph(), after=2)
    return t


def ans(d, text, size=10):
    for ln in text.split("\n"):
        p = fmt(d.add_paragraph(), left=0.3, after=0)
        shade(p, "E6E6E6")
        rich(p, ln, size)


def question(d, T, n, text, space, key=None, size=10):
    p = fmt(d.add_paragraph(), before=3, after=1, left=0.3, hang=0.3, keep=True)
    run(p, "%s." % n, size, bold=True); rich(p, "\t" + text, size)
    if T and key:
        ans(d, key)
    elif not T:
        sp = fmt(d.add_paragraph(), after=0)
        sp.paragraph_format.line_spacing = Pt(max(space * 72 * SPACE - 12, 6))
        run(sp, " ", 4)


def box(d, label, lines, fill="EDEDED"):
    t = d.add_table(rows=1, cols=1); t.style = "Table Grid"
    c = t.cell(0, 0); c.width = Inches(7.3); cell_shade(c, fill); c.text = ""
    p = c.paragraphs[0]; fmt(p, before=2, after=2); run(p, label, 9.5, bold=True)
    for ln in lines:
        q = c.add_paragraph(); fmt(q, before=0, after=3, left=0.0)
        rich(q, ln, 9.5)
    fmt(d.add_paragraph(), after=0)


# ------------------------------------------------------------ the sheet
def build(T):
    d = new_doc()
    footer(d, "Regular Chemistry  •  Virtual Lab Pre-Lab: Empirical Formula of Magnesium Oxide" + ("  •  TEACHER EDITION" if T else ""))

    if T:
        p = fmt(d.add_paragraph(), after=2); run(p, "TEACHER EDITION: Virtual Lab Pre-Lab, Empirical Formula of Magnesium Oxide", 15, bold=True)
        p = fmt(d.add_paragraph(), after=4); run(p, "How the simulation and the sheet fit together, how to check each student's random numbers, and the answers. The student sheet follows.", 9.5, color="555555"); rule(p)
        heading(d, "How it works", 11.5, before=2)
        for t in [
            "**Students write everything on this sheet.** The simulation only shows the bench and the action (the balance display, the flame, the glow, the water drops, the steam, the magnifier). It has no data tables, no typed answers and no score. The slim bar across the top of the simulation names each step and says which box to fill in.",
            "**Every student gets different numbers.** The simulation chooses them, so check the math, not the numbers. Ranges used: mass of crucible + lid **25.000 to 35.000 g**, mass of magnesium **0.100 to 0.200 g** (the cap stands in for what fits in a real crucible), all read to 0.0001 g. The product mass is the ideal MgO mass with a small realistic scatter (within about 1%), so the O : Mg ratio comes out between about 0.98 and 1.02.",
            "**Check the math in this order:** Box 1 + Box 2 = Box 3 (within 0.0001 g); Box 5 = Box 4 − Box 3; moles Mg = Box 2 ÷ 24.3 (24.31 accepted); atoms Mg = moles × 6.022 × 10²³; moles O = Box 5 ÷ 16.0; ratio O : Mg = moles O ÷ moles Mg ≈ 1 : 1, so the formula is MgO. Accept answers that follow from the student's own boxes, rounded to 3 or 4 significant figures.",
            "**Nitride, not nitrate.** The side product is magnesium **nitride**, Mg₃N₂ (Mg²⁺ and N³⁻). The water step converts it to magnesium hydroxide and ammonia; the reheating turns the hydroxide into MgO.",
        ]:
            para(d, "•\t" + t, 10, left=0.25, hang=0.25, after=3)
        heading(d, "Worked example (sample data, not the answer for any one student)", 11.5)
        table(d, [["Box", "What was measured", "Sample reading"],
                  ["1", "Mass of crucible + lid", f4(CRUC) + " g"],
                  ["2", "Mass of Mg", f4(MGM) + " g"],
                  ["3", "Mass of crucible + lid + Mg", f4(TOTAL3) + " g"],
                  ["4", "Mass of crucible + lid + product after the reaction", f4(FINAL) + " g"],
                  ["5", "Mass of oxygen added (Box 4 − Box 3)", f4(OXY) + " g"]],
              [0.6, 4.4, 2.1], size=9.5)
        para(d, "While cooling: moles of Mg = %s g ÷ 24.31 g/mol = **%s mol**; atoms of Mg = %s mol × 6.022 × 10²³ = **%s atoms**. The mass will be **larger** (oxygen has been added). "
                "After cooling: moles of O = %s g ÷ 16.0 g/mol = **%s mol**; O : Mg = %s ÷ %s = **%s ≈ 1 : 1**; formula **MgO**." %
             (f4(MGM), sf(N_MG, 4), sf(N_MG, 4), sci(ATOMS, 4), f4(OXY), sf(N_O, 4), sf(N_O, 4), sf(N_MG, 4), sf(RATIO, 3)), 10, after=4)
        d.add_page_break()

    # ---------------- page: title and header
    p = fmt(d.add_paragraph(), after=2); run(p, "Virtual Lab Pre-Lab: Empirical Formula of Magnesium Oxide", 16, bold=True)
    p = fmt(d.add_paragraph(), after=4); run(p, "Name: ______________________________      Date: ______________      Period: ______", 11); rule(p)
    para(d, "**Goal:** Use experimental data to determine the ratio at which two or more elements combine.", 10, before=2)
    para(d, "**Introduction:** In the real lab you will react magnesium metal with the oxygen gas in the air to find the ratio at which magnesium atoms and oxygen atoms combine. "
            "First you will practice the setup and the calculations in a virtual lab. Run the simulation with this sheet beside you and "
            "**write every reading, observation and calculation here.** The simulation tells you which box to fill in.", 10)

    question(d, T, "Question 1", "Write the chemical reaction you expect to happen between magnesium and oxygen gas. Balance it.", 0.5,
             "2 Mg + 1 O₂ → 2 MgO   (magnesium oxide, from Mg²⁺ and O²⁻)")
    if not T:
        p = fmt(d.add_paragraph(), left=0.3, before=0, after=4); run(p, "_____ Mg  +  _____ O₂  →  _________________", 11)

    heading(d, "Data table", 11.5, before=6)
    rows = [["Box", "What you measure", "Your reading"],
            ["1", "Mass of crucible + lid", f4(CRUC) + " g" if T else "                              g"],
            ["2", "Mass of Mg", f4(MGM) + " g" if T else "                              g"],
            ["3", "Mass of crucible + lid + Mg", f4(TOTAL3) + " g" if T else "                              g"],
            ["4", "Mass of crucible + lid + product, after the reaction", f4(FINAL) + " g" if T else "                              g"],
            ["5", "Mass of oxygen added   (Box 4 − Box 3)", f4(OXY) + " g" if T else "                              g"]]
    table(d, rows, [0.55, 4.55, 2.2], size=10, height=0.29)
    para(d, "**Observations** (the flame, the magnesium, the product, what you see when you add water):", 10, after=1)
    if T:
        ans(d, "Bright white glow when the Mg burns; a white powder, sometimes with pale yellow-green bits (magnesium nitride); hissing and steam when the water goes on; gas wisps rising from the crucible (the magnifier shows NH₃; in the real lab there is also a sharp ammonia smell); a white, dry powder at the end.")
    else:
        for _ in range(2):
            para(d, "_" * 104, 10, after=4)

    # ---------------- procedure
    heading(d, "Procedure (what you do in the simulation)", 11.5, before=4)
    steps = [
        ("Set up the bench.", "Place the crucible in the clay triangle on the ring stand, with the Bunsen burner underneath."),
        ("Mass the clean, dry crucible and lid.", "Record it in **Box 1**."),
        ("Mass the piece of magnesium.", "Record it in **Box 2**. Put it in the crucible, then mass the crucible + lid + Mg and record it in **Box 3**. Check: Box 1 + Box 2 should equal Box 3."),
        ("Heat the magnesium with the Bunsen burner.", "Turn the bottom of the burner until the tip of the flame touches the bottom of the crucible. The lid goes on for you, with a slight crack, once the Mg glows. Write what you see in Observations."),
        ("Once the Mg stops glowing, add 6 to 7 drops of DI water", "and reheat to boil the water off. Write what you see. (In the real lab you will also notice a sharp smell.)"),
        ("Once the product is dry, turn the heat off and cool for 5 minutes.", "The simulation speeds up the clock. Do the **While Cooling** questions."),
        ("Mass the crucible + lid + product.", "Record it in **Box 4**. Then calculate **Box 5**."),
    ]
    for i, (a, b) in enumerate(steps, 1):
        p = fmt(d.add_paragraph(), before=0, after=2, left=0.3, hang=0.3)
        run(p, "%d)\t" % i, 10, bold=True); run(p, a + " ", 10, bold=True); rich(p, b, 10)

    # ---------------- while cooling
    heading(d, "While Cooling", 11.5, before=5)
    question(d, T, "1", "Calculate the number of moles of Mg used in this experiment. Show your work with units.", 0.85,
             "%s g Mg × (1 mol Mg / 24.31 g Mg) = **%s mol Mg**   (24.3 g/mol also accepted)" % (f4(MGM), sf(N_MG, 4)))
    question(d, T, "2", "Calculate the number of Mg atoms that were in the ribbon.", 0.85,
             "%s mol Mg × (6.022 × 10²³ atoms / 1 mol) = **%s atoms Mg**" % (sf(N_MG, 4), sci(ATOMS, 4)))
    question(d, T, "3", "Do you expect the mass of the crucible + lid + product to be smaller, larger, or the same as before the reaction? Explain your answer.", 0.9,
             "**Larger.** The magnesium combined with oxygen from the air. The oxygen adds mass, and no mass was lost (conservation of mass).")

    # ---------------- after cooling
    heading(d, "After Cooling", 11.5, before=5)
    question(d, T, "1", "Calculate the moles of oxygen present in the product. (Use 16 g/mol for the molar mass of oxygen, not 32 g/mol.)", 0.85,
             "%s g O × (1 mol O / 16.0 g O) = **%s mol O**" % (f4(OXY), sf(N_O, 4)))
    question(d, T, "2", "Compare the number of moles of magnesium to the moles of oxygen. What do you notice?", 0.75,
             "%s mol Mg and %s mol O are almost equal: O : Mg = %s, about **1 : 1**." % (sf(N_MG, 4), sf(N_O, 4), sf(RATIO, 3)))
    question(d, T, "3", "Based on your data, what formula did the experiment lead to?", 0.5,
             "**MgO**   (1 Mg : 1 O)")

    # ---------------- the nitrogen problem
    heading(d, "Look closer: magnesium and nitrogen (use the magnifier)", 11.5, before=5)
    box(d, "Why do we add water?", [
        "Air is about 78% nitrogen gas, N₂. When magnesium burns it reacts with some nitrogen as well as the oxygen, making a pale yellow-green powder called magnesium **nitride**. "
        "Any nitride left would spoil the result: the product would not be only MgO.",
        "That is why you add water after the Mg stops glowing. The water reacts with magnesium nitride and **converts it to magnesium hydroxide**, Mg(OH)₂, and ammonia gas. "
        "When you reheat, the water boils off and the magnesium hydroxide changes into MgO, so everything left is MgO."])
    question(d, T, "N1", "Magnesium forms Mg²⁺ and nitrogen forms N³⁻. Write the formula for magnesium nitride and explain how the charges decide the subscripts.", 0.7,
             "**Mg₃N₂.** 3 Mg²⁺ gives +6 and 2 N³⁻ gives −6, so the charges cancel.")
    question(d, T, "N2", "Balance the reaction of magnesium with nitrogen gas:    _____ Mg  +  _____ N₂  →  _____ Mg₃N₂", 0.25,
             "3 Mg + 1 N₂ → 1 Mg₃N₂")
    question(d, T, "N3", "Balance the reaction of the water with magnesium nitride:    _____ Mg₃N₂  +  _____ H₂O  →  _____ Mg(OH)₂  +  _____ NH₃", 0.25,
             "1 Mg₃N₂ + 6 H₂O → 3 Mg(OH)₂ + 2 NH₃")
    question(d, T, "N4", "One product in N3 is a gas. Which one is it? (In the real lab you will notice its sharp smell.) Where does it go?", 0.55,
             "**Ammonia, NH₃.** It leaves the crucible as a gas (the simulation shows it rising; in the lab you smell it), so it is not part of the final mass.")
    question(d, T, "N5", "Balance the change that happens when you reheat:    _____ Mg(OH)₂  →  _____ MgO  +  _____ H₂O.   In one sentence, why does the water step let us treat the final product as all MgO?", 0.7,
             "1 Mg(OH)₂ → 1 MgO + 1 H₂O.   The water turns any Mg₃N₂ into Mg(OH)₂, and heating turns the Mg(OH)₂ into MgO, so no nitrogen is left in the product.")

    # ---------------- what if
    heading(d, "What if...? (use the \"what if\" buttons in the simulation)", 11.5, before=5)
    para(d, "For each mistake, circle what would happen to your numbers and explain in one sentence. Assume everything else is done correctly.", 10, after=2).paragraph_format.keep_with_next = True
    wi = [["What goes wrong", "Mass of crucible + lid + product would be:", "The calculated O : Mg ratio would be:", "Why?"],
          ["a) The lid is on **too wide**: white smoke escapes", "too high   /   too low" if not T else "**too low**",
           "too high   /   too low" if not T else "**too low**",
           "" if not T else "White MgO smoke leaves the crucible, so less product is weighed and less \"oxygen\" is found."],
          ["b) The lid is on **too tight**: no gap", "too high   /   too low" if not T else "**too low**",
           "too high   /   too low" if not T else "**too low**",
           "" if not T else "Not enough O₂ gets in, so some Mg never burns; less mass is gained, and less oxygen is found."],
          ["c) You **skip the water** step", "too high   /   too low" if not T else "**too low**",
           "too high   /   too low" if not T else "**too low**",
           "" if not T else "Mg₃N₂ is left. Each Mg in it holds only 2/3 of a nitrogen (about %s g per mol Mg), far less than the 16.0 g of oxygen in MgO, so the mass is low and the ratio would come out near %s." % (sf(NITRIDE_PER_MG, 3), sf(NITRIDE_RATIO, 2))]]
    table(d, wi, [1.9, 1.4, 1.4, 2.6], size=9.5, height=0.62)
    return d


if __name__ == "__main__":
    for T, name in ((False, "STUDENT"), (True, "TEACHER EDITION")):
        path = os.path.join(HERE, "Empirical Formula of MgO - Virtual Lab Pre-Lab Sheet - %s.docx" % name)
        build(T).save(path)
        print(path)
    print("sample: Mg %s g, crucible+lid %s g, final %s g, O %s g, O:Mg %s" % (f4(MGM), f4(CRUC), f4(FINAL), f4(OXY), sf(RATIO, 4)))

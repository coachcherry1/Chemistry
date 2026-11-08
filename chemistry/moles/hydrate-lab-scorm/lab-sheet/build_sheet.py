"""Builds the paper lab sheet that goes with the virtual lab: Formula of a Hydrate.

Student sheet (students write every reading and calculation on paper) and a teacher edition (a worked example
with sample data, how to check the random numbers each student gets in the simulation, and the answers to the rest).
Every number in the teacher edition is computed here (class molar masses: Cu 63.5, S 32.1, O 16.0, H 1.0).

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
CU, S_, O, H = 63.5, 32.1, 16.0, 1.0
M_SALT = CU + S_ + 4 * O                  # CuSO4 159.6
M_WATER = 2 * H + O                       # H2O 18.0
SPACE = 0.8            # writing space is scaled so the student sheet fits one sheet, front and back

# ------------------------------------------------------------ the worked example (teacher edition)
CRUC = 28.4127
MH = 2.0132                                # the hydrate that went into the crucible
X = 5.12                                   # an experimental water : salt ratio, 0.10 to 0.15 away from 5, as in the simulation
A = round(MH * M_SALT / (M_SALT + X * M_WATER), 4)     # the final mass of the white solid
E = [0.1180, 0.0071, 0.0006]               # water still in the solid after each heating (g), more than the final amount
HEATS = [round(CRUC + A + e - E[-1], 4) for e in E]
BOX2 = round(CRUC + MH, 4)
FINAL = HEATS[-1]
SALT = round(FINAL - CRUC, 4)
WATER = round(BOX2 - FINAL, 4)
N_SALT, N_WATER = SALT / M_SALT, WATER / M_WATER
RATIO = N_WATER / N_SALT
PCT = WATER / MH * 100
assert 4.85 <= RATIO <= 5.15 and abs(RATIO - 5) >= 0.09, RATIO
assert abs(HEATS[2] - HEATS[1]) <= 0.01 and abs(HEATS[1] - HEATS[0]) > 0.01


def f4(x): return "%.4f" % x
def sf(x, n):
    from decimal import Decimal, ROUND_HALF_UP
    import math
    d = n - int(math.floor(math.log10(abs(x)))) - 1
    v = Decimal(repr(x)).quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP)
    return ("%.*f" % (d, v)) if d > 0 else "%d" % v


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
    footer(d, "Regular Chemistry  •  Virtual Lab Pre-Lab: Formula of a Hydrate" + ("  •  TEACHER EDITION" if T else ""))

    if T:
        p = fmt(d.add_paragraph(), after=2); run(p, "TEACHER EDITION: Virtual Lab Pre-Lab, Formula of a Hydrate", 15, bold=True)
        p = fmt(d.add_paragraph(), after=4); run(p, "How the simulation and the sheet fit together, how to check each student's random numbers, and the answers. The student sheet follows.", 9.5, color="555555"); rule(p)
        heading(d, "How it works", 11.5, before=2)
        for t in [
            "**Students write everything on this sheet.** The simulation only shows the bench and the action (the balance display, the crystals falling into the weigh boat, the flame, the water leaving as a gas, the magnifier). It has no data tables, no typed answers and no score. The big line at the top of the bench says what to do next.",
            "**The solid is copper(II) sulfate pentahydrate**, CuSO₄·5H₂O (blue crystals, white once the water is gone). The bottle is labelled CuSO₄·xH₂O, so the student finds x. Class molar masses: Cu 63.5, S 32.1, O 16.0, H 1.0, so CuSO₄ is **159.6 g/mol** and H₂O is **18.0 g/mol**.",
            "**Every student gets different numbers.** The student shakes out about 2 g (at least 1.5 g) of solid, so the mass of hydrate is the student's own. Mass of crucible + lid is **25.000 to 35.000 g**, all read to 0.0001 g; a few milligrams of solid stay behind in the weigh boat, as in real life.",
            "**The data are like real data: close, not perfect.** Every student's water : CuSO₄ ratio comes out **0.10 to 0.15 away from 5**, above or below (4.85 to 4.90 or 5.10 to 5.15), so it rounds to 5. Heating removes most of the water the first time and little after that. The mass is constant (two masses in a row within 0.01 g) after **3 heatings** for most students and **4** for some; the simulation says when to stop (at least 3, at most 5).",
            "**Check the math in this order:** mass of hydrate = Box 2 − Box 1; mass of anhydrous solid = last heating − Box 1; mass of water = Box 2 − last heating; moles CuSO₄ = anhydrous mass ÷ 159.6; moles H₂O = water mass ÷ 18.0; ratio = moles H₂O ÷ moles CuSO₄ (4.85 to 5.15); formula CuSO₄·5H₂O, copper(II) sulfate pentahydrate. Accept answers that follow from the student's own boxes, rounded to 3 or 4 significant figures.",
        ]:
            para(d, "•\t" + t, 10, left=0.25, hang=0.25, after=3)
        heading(d, "Worked example (sample data, not the answer for any one student)", 11.5)
        table(d, [["Box", "What was measured", "Sample reading"],
                  ["1", "Mass of crucible + lid", f4(CRUC) + " g"],
                  ["2", "Mass of crucible + lid + hydrate", f4(BOX2) + " g"],
                  ["Heating 1", "Mass of crucible + lid + solid after heating 1", f4(HEATS[0]) + " g"],
                  ["Heating 2", "after heating 2 (changed by %s g: not constant yet)" % f4(HEATS[0] - HEATS[1]), f4(HEATS[1]) + " g"],
                  ["Heating 3", "after heating 3 (changed by %s g: within 0.01 g, constant)" % f4(HEATS[1] - HEATS[2]), f4(HEATS[2]) + " g"]],
              [0.9, 4.2, 2.2], size=9.5)
        para(d, "Mass of hydrate = %s − %s = **%s g**. Mass of CuSO₄ = %s − %s = **%s g**. Mass of water = %s − %s = **%s g**. "
                "Moles of CuSO₄ = %s ÷ 159.6 = **%s mol**; moles of H₂O = %s ÷ 18.0 = **%s mol**; H₂O : CuSO₄ = %s ÷ %s = **%s ≈ 5**; "
                "formula **CuSO₄·5H₂O**; percent water = %s ÷ %s × 100 = **%s%%**." %
             (f4(BOX2), f4(CRUC), f4(MH), f4(FINAL), f4(CRUC), f4(SALT), f4(BOX2), f4(FINAL), f4(WATER), f4(SALT), sf(N_SALT, 4), f4(WATER), sf(N_WATER, 4),
              sf(N_WATER, 4), sf(N_SALT, 4), sf(RATIO, 3), f4(WATER), f4(MH), sf(PCT, 3)), 10, after=4)
        d.add_page_break()

    # ---------------- page: title and header
    p = fmt(d.add_paragraph(), after=2); run(p, "Virtual Lab Pre-Lab: Formula of a Hydrate", 16, bold=True)
    p = fmt(d.add_paragraph(), after=4); run(p, "Name: ______________________________      Date: ______________      Period: ______", 11); rule(p)
    para(d, "**Goal:** Use experimental data to find how many water molecules are held in a hydrate for each formula unit of the salt, and write the formula of the hydrate.", 10, before=2)
    para(d, "**Introduction:** A hydrate is a solid that holds water molecules inside its crystal structure. Heating drives the water off as a gas and leaves the **anhydrous** solid. "
            "In the real lab you will heat a blue copper(II) sulfate hydrate until its mass stops changing. First you will practice the setup and the calculations in a virtual lab. Run the simulation with this sheet beside you and "
            "**write every reading, observation and calculation here.** The simulation tells you what to do next.", 10)

    heading(d, "Data table", 11.5, before=4)
    blank = "                              g"
    rows = [["Box", "What you measure", "Your reading"],
            ["1", "Mass of crucible + lid", f4(CRUC) + " g" if T else blank],
            ["2", "Mass of crucible + lid + hydrate", f4(BOX2) + " g" if T else blank],
            ["Heating 1", "Mass of crucible + lid + solid, after heating 1 and cooling", f4(HEATS[0]) + " g" if T else blank],
            ["Heating 2", "after heating 2 and cooling", f4(HEATS[1]) + " g" if T else blank],
            ["Heating 3", "after heating 3 and cooling", f4(HEATS[2]) + " g" if T else blank],
            ["Heating 4", "after heating 4 (only if you need it)", "" if T else blank],
            ["Heating 5", "after heating 5 (only if you need it)", "" if T else blank]]
    table(d, rows, [0.9, 4.3, 2.1], size=10, height=0.27)
    para(d, "**Observations** (the color of the solid before and after heating, what leaves the crucible, what you see in the magnifier):", 10, after=1)
    if T:
        ans(d, "Blue crystals before; white powder after heating. Water leaves the crucible as a gas (steam) and the lid has a small crack so it can escape. The magnifier shows the water molecules leaving the crystal as it turns white.")
    else:
        para(d, "_" * 104, 10, after=4)
        para(d, "_" * 104, 10, after=4)

    # ---------------- procedure
    heading(d, "Procedure (what you do in the simulation)", 11.5, before=3)
    steps = [
        ("Mass the empty crucible and lid.", "Record it in **Box 1**. Set it back on the ceramic pad."),
        ("Measure out the hydrate.", "Put the weigh boat on the balance (the balance reads zero). Hold the bottle of hydrate, mouth down, above the boat and click the bottle to shake out solid until you have about 2 g."),
        ("Pour the solid into the crucible", "and mass the crucible + lid + hydrate. Record it in **Box 2**. Describe the solid in Observations."),
        ("Set up and heat.", "Put the crucible in the clay triangle. Turn the bottom of the burner until the tip of the flame touches the bottom of the crucible. The lid has a small crack so the water can escape. Heat until the water stops leaving."),
        ("Cool for 5 minutes", "(the simulation speeds up the clock), then mass the crucible + lid + solid. Record it in the next **Heating** row."),
        ("Heat, cool and mass again,", "over and over, until two masses in a row are within **0.01 g** of each other. That is **constant mass**: all the water is gone. (The simulation tells you when to stop. It takes at least 3 heatings and no more than 5.)"),
    ]
    for i, (a, b) in enumerate(steps, 1):
        p = fmt(d.add_paragraph(), before=0, after=2, left=0.3, hang=0.3)
        run(p, "%d)\t" % i, 10, bold=True); run(p, a + " ", 10, bold=True); rich(p, b, 10)

    # ---------------- calculations
    heading(d, "Calculations (use the class molar masses: CuSO₄ = 159.6 g/mol, H₂O = 18.0 g/mol)", 11.5, before=5)
    question(d, T, "1", "Mass of hydrate (Box 2 − Box 1), mass of anhydrous solid (your last Heating − Box 1) and mass of water lost (Box 2 − your last Heating). Show each subtraction.", 0.8,
             "Hydrate: %s − %s = **%s g**.   Anhydrous CuSO₄: %s − %s = **%s g**.   Water lost: %s − %s = **%s g**." % (f4(BOX2), f4(CRUC), f4(MH), f4(FINAL), f4(CRUC), f4(SALT), f4(BOX2), f4(FINAL), f4(WATER)))
    question(d, T, "2", "Calculate the moles of CuSO₄ and the moles of H₂O. Show your work with units.", 0.95,
             "%s g CuSO₄ × (1 mol / 159.6 g) = **%s mol CuSO₄**.   %s g H₂O × (1 mol / 18.0 g) = **%s mol H₂O**." % (f4(SALT), sf(N_SALT, 4), f4(WATER), sf(N_WATER, 4)))
    question(d, T, "3", "Divide both numbers of moles by the smaller one to find the ratio  H₂O : CuSO₄  (to 2 decimal places). Is it exactly a whole number? Round it to a whole number.", 0.8,
             "%s ÷ %s = **%s H₂O** to 1 CuSO₄. Not exactly a whole number (real data never are); rounds to **5**." % (sf(N_WATER, 4), sf(N_SALT, 4), sf(RATIO, 3)))
    question(d, T, "4", "Write the formula of the hydrate, then its name using a Greek prefix (mono, di, tri, tetra, penta, hexa, hepta, octa, nona, deca) for the water.", 0.55,
             "**CuSO₄·5H₂O**, copper(II) sulfate **penta**hydrate.")
    question(d, T, "5", "Calculate the percent water in the hydrate  (mass of water lost ÷ mass of hydrate × 100).", 0.6,
             "%s ÷ %s × 100 = **%s%%** (the formula gives 5 × 18.0 ÷ 249.6 = 36.1%%)" % (f4(WATER), f4(MH), sf(PCT, 3)))
    question(d, T, "6", "Why did you heat, cool and mass again and again instead of just once? Why is the answer not an exact whole number?", 0.8,
             "One heating may leave a little water in the solid, which makes the anhydrous mass too high. Constant mass means all the water is gone. Real measurements have small errors (a little water left, a little solid lost, balance readings), so the ratio is close to a whole number but not exact.")

    # ---------------- look closer
    heading(d, "Look closer (use the magnifier)", 11.5, before=4)
    box(d, "Where does the water go?", [
        "In the blue crystal, water molecules are held in the crystal structure around each CuSO₄. Heat gives them enough energy to break free and leave as a **gas** (steam). "
        "The lid is cracked open so the gas can get out. The blue color goes away with the water, and the white solid left is **anhydrous** CuSO₄."])
    question(d, T, "L1", "Why must the crucible cool before you mass it? (Hint: think about what a hot crucible does to the air around it.)", 0.5,
             "A hot crucible warms the air around it. Rising hot air pushes up on the pan, and the balance reads too low and drifts.")
    question(d, T, "L2", "Anhydrous copper(II) sulfate takes water back from the air. How would that change your data if the crucible sat uncovered?", 0.5,
             "It would regain some water, so the mass after heating is too high and the water lost looks too low.")

    # ---------------- what if
    heading(d, "What if...?", 11.5, before=4)
    para(d, "For each mistake, circle what would happen to your numbers and explain in one sentence. Assume everything else is done correctly.", 10, after=2).paragraph_format.keep_with_next = True
    hi, lo = "too high   /   too low", "too high   /   too low"
    wi = [["What goes wrong", "Mass after heating would be:", "The calculated ratio (H₂O : CuSO₄) would be:", "Why?"],
          ["a) You **stop after one heating**", hi if not T else "**too high**", lo if not T else "**too low**",
           "" if not T else "Water is still in the solid, so the mass after is too high and the water lost looks too small. The ratio is too low."],
          ["b) The anhydrous solid **takes water back** from the air", hi if not T else "**too high**", lo if not T else "**too low**",
           "" if not T else "The extra water adds mass, so the water lost looks too small and the CuSO₄ mass too large. The ratio is too low."],
          ["c) Some solid **spatters out** of the crucible while heating", hi if not T else "**too low**", lo if not T else "**too high**",
           "" if not T else "The solid that is lost makes the mass after too low, so the water lost looks too big and the CuSO₄ mass too small. The ratio is too high."]]
    table(d, wi, [1.9, 1.3, 1.6, 2.5], size=9.5, height=0.55)
    return d


if __name__ == "__main__":
    for T, name in ((False, "STUDENT"), (True, "TEACHER EDITION")):
        path = os.path.join(HERE, "Formula of a Hydrate - Virtual Lab Pre-Lab Sheet - %s.docx" % name)
        build(T).save(path)
        print(path)
    print("sample: crucible %s g, hydrate %s g, heats %s, ratio %s, percent water %s" % (f4(CRUC), f4(MH), [f4(h) for h in HEATS], sf(RATIO, 4), sf(PCT, 3)))

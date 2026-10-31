"""Pull every free-response question (text and diagrams) out of the released AP Chemistry FRQ PDFs, 2015 to 2026 (no 2020 exam).
Writes images/AP{year}F{n}.png (the question as printed, pages stacked) and frqs.json."""
import re, os, sys, json, subprocess, html, tempfile
from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PDFS = os.path.join(ROOT, 'reference', 'frq-pdfs')
IMG = os.path.join(ROOT, 'images')
YEARS = [2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026]
DPI = 110
JUNK = re.compile(r'^Question \d|GO ON TO THE NEXT PAGE|©|Visit College Board|Use a pencil or pen|Unauthorized copying|^-\d+-$|^AP\s*®?\s*Chemistry\s+\d{4}|Free-Response Questions$|^\d+$|STOP|END OF EXAM|^Page \d+')
MARK = re.compile(r'(Begin|Continue) your response to QUESTION (\d)')
LABEL = re.compile(r'^Question (\d)\b')
START = re.compile(r'^([1-7])\.\s')


def read_lines(path):
    out = subprocess.run(['pdftotext', '-bbox-layout', path, '-'], capture_output=True, text=True).stdout
    pages = []
    for m in re.finditer(r'<page width="([\d.]+)" height="([\d.]+)">|<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</line>', out, re.S):
        if m.group(1):
            pages.append({'w': float(m.group(1)), 'h': float(m.group(2)), 'lines': []})
        else:
            t = ' '.join(html.unescape(w) for w in re.findall(r'>([^<]*)</word>', m.group(7)))
            pages[-1]['lines'].append((float(m.group(3)), float(m.group(4)), float(m.group(5)), float(m.group(6)), t))
    return pages


def above_top(ls, ys, top):
    """a figure printed above a question number belongs to the question: start after the last full-width line above it"""
    long_above = [l[3] for l in ls if l[3] < ys - 2 and l[2] - l[0] >= 200 and not JUNK.search(l[4]) and l[1] > top and not MARK.search(l[4])]
    return (max(long_above) - 1) if long_above else top


def first_top(ls, ys, top):
    """question 1 shares its page with the exam directions, which end 'Pay attention to significant figures.'"""
    d = [l[3] for l in ls if l[3] < ys and re.search(r'significant figures\.?$', l[4])]
    return (max(d) - 1) if d else above_top(ls, ys, top)


def segments(pages):
    """[(question, page index, y0, y1)] in reading order"""
    segs, cur = [], None
    for pi, p in enumerate(pages):
        ls = p['lines']
        marks = [int(MARK.search(t).group(2)) for *_, t in ls if MARK.search(t)]
        junk_y = [y0 for x0, y0, x1, y1, t in ls if y0 > p['h'] * 0.8 and JUNK.search(t)]
        bottom = min(junk_y) - 3 if junk_y else p['h'] - 20
        stop = [y0 for x0, y0, x1, y1, t in ls if t.strip() == 'STOP']
        if stop:
            bottom = min(bottom, stop[0] - 6)
        top = max([l[3] for l in ls if l[1] < 60 and re.search('free-response', l[4], re.I)] + [38]) + 1
        if marks:
            st = [l for l in ls if l[0] < 70 and START.match(l[4]) and int(START.match(l[4]).group(1)) == marks[0]]
            y = top
            if st:      # the page also carries the exam directions above the question
                y = first_top(ls, st[0][1], top)
            segs.append((marks[0], pi, y, bottom))
            cur = marks[0]
            continue
        want = 1 if cur is None else cur + 1
        labels = [(y0 - 3, int(LABEL.match(t).group(1))) for x0, y0, x1, y1, t in ls if LABEL.match(t) and int(LABEL.match(t).group(1)) == want]
        if labels:      # 2026 prints a 'Question N' label above each question
            ys, q = labels[0]
            if cur is not None and ys > top:
                segs.append((cur, pi, top, ys))
            segs.append((q, pi, ys, bottom))
            cur = q
            continue
        starts = [(y0, int(START.match(t).group(1))) for x0, y0, x1, y1, t in ls if x0 < 70 and START.match(t) and (cur is None and int(START.match(t).group(1)) == 1 or cur is not None and int(START.match(t).group(1)) == cur + 1)]
        starts = starts[:1]
        if cur is None and not starts:
            continue
        y = top
        for ys, q in starts:
            # a figure printed above the question number belongs to the question: start after the last full-width line above it
            b = first_top(ls, ys, top) if q == 1 else above_top(ls, ys, top)
            if cur is not None and b > y:
                segs.append((cur, pi, y, b))
            y, cur = b, q
        segs.append((cur, pi, y, bottom))
    return segs


def clean(im, whiten=()):
    """drop the answer-box frame and the 'Begin your response' line, squeeze long blank runs"""
    import numpy as np
    a = np.array(im.convert('L'))
    for y0, y1 in whiten:
        a[max(0, y0):max(0, y1), :] = 255
    dark = a < 110
    W, Hh = a.shape[1], a.shape[0]
    edge = int(0.06 * W)
    cols = np.array([c for c in np.where(dark.mean(axis=0) > 0.5)[0] if c < edge or c >= W - edge])       # the answer-box frame sits at the edges
    rows = np.array([r for r in np.where(dark.mean(axis=1) > 0.6)[0] if r < 12 or r >= Hh - 12])         # never touch table rules or graph lines inside
    x0, x1 = 0, a.shape[1]
    left = [c for c in cols if c < edge]
    right = [c for c in cols if c >= W - edge]
    if left:
        x0 = max(left) + 4
    if right:
        x1 = min(right) - 3
    rgb = np.array(im.convert('RGB'))
    for y0, y1 in whiten:
        rgb[max(0, y0):max(0, y1), :, :] = 255
    for r in rows:
        rgb[r, :, :] = 255
    out = Image.fromarray(rgb[:, x0:x1, :])
    out = trim(out)
    g = np.array(out.convert('L')) < 200
    blank = ~g.any(axis=1)
    keep, run = [], 0
    for i, b in enumerate(blank):
        run = run + 1 if b else 0
        if run <= 40:
            keep.append(i)
    return Image.fromarray(np.array(out)[keep, :, :])


def trim(im):
    bg = Image.new(im.mode, im.size, (255, 255, 255))
    box = ImageChops.difference(im, bg).convert('L').point(lambda v: 255 if v > 40 else 0).getbbox()
    return im.crop(box) if box else im


def main():
    os.makedirs(IMG, exist_ok=True)
    items = []
    for yr in YEARS:
        pdf = os.path.join(PDFS, f'ap{yr}-frq-chemistry.pdf')
        pages = read_lines(pdf)
        segs = segments(pages)
        with tempfile.TemporaryDirectory() as td:
            subprocess.run(['pdftoppm', '-r', str(DPI), '-png', pdf, os.path.join(td, 'p')], check=True)
            files = sorted(f for f in os.listdir(td))
            for q in range(1, 8):
                parts, text = [], []
                for sq, pi, y0, y1 in segs:
                    if sq != q:
                        continue
                    ls = [l for l in pages[pi]['lines'] if y0 - 2 <= l[1] <= y1 and not JUNK.search(l[4]) and not MARK.search(l[4])]
                    body = [l for l in ls if l[4].strip()]
                    text += [l[4] for l in sorted(body, key=lambda l: (round(l[1] / 3), l[0]))]
                    f = Image.open(os.path.join(td, files[pi])).convert('RGB')
                    sc = DPI / 72
                    wh = [(int((l[1] - 2 - y0) * sc), int((l[3] + 2 - y0) * sc)) for l in pages[pi]['lines'] if MARK.search(l[4])]
                    c = clean(f.crop((int(20 * sc), int(y0 * sc), int((pages[pi]['w'] - 20) * sc), int(y1 * sc))), wh)
                    if len(body) <= 1 and c.height < 60:
                        continue            # a page that only says "continue your response"
                    parts.append(c)
                if not parts:
                    raise SystemExit(f'{yr} question {q} not found')
                W = max(p.width for p in parts)
                H = sum(p.height for p in parts) + 10 * (len(parts) - 1)
                sheet = Image.new('RGB', (W, H), 'white')
                y = 0
                for p in parts:
                    sheet.paste(p, (0, y))
                    y += p.height + 10
                sheet = sheet.quantize(colors=48, method=Image.Quantize.MEDIANCUT)
                name = f'AP{yr}F{q}'
                sheet.save(os.path.join(IMG, name + '.png'), optimize=True)
                items.append({'id': name, 'year': yr, 'q': q, 'long': q <= 3, 'text': '\n'.join(text).replace('\u2014', ' - '), 'img': f'images/{name}.png', 'pages': len(parts)})
        print(yr, 'ok')
    json.dump(items, open(os.path.join(ROOT, 'frqs.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(items), 'questions')


if __name__ == '__main__':
    main()

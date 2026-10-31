"""Build the master searchable index (index.html) for everything in this repo.

    python3 tools/build_index.py

Every item gets a course, a topic (textbook chapter) and one or more subtopics (textbook sections) from
content/taxonomy.json. Items: questions (multiple choice and free response), molecules, simulations.
Page layout lives in tools/index_template.html. To index a new collection, add a loader that yields items from
make_item() and list it in LOADERS.
"""
import os, re, glob, json, html, urllib.parse
from collections import Counter

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
MOL = 'organic-chemistry/nomenclature/molecule-database/'
SNE = 'organic-chemistry/substitution-elimination/problem-bank/'
QZ = 'organic-chemistry/acids-bases/acids-bases-quiz/'
BANK = 'organic-chemistry/question-bank/'
TAX = json.load(open(os.path.join(ROOT, 'content', 'taxonomy.json'), encoding='utf-8'))['organic']
SEC_LABEL = {s['id']: s['label'] for t in TAX for s in t['sections']}
COURSE_LABEL = {'organic': 'Organic Chemistry', 'honors': 'Honors Chemistry', 'ap': 'AP Chemistry'}
CLASS_DIR = {'organic-chemistry': 'organic', 'chemistry': 'honors', 'ap-chemistry': 'ap'}
GEN_TOPIC = {'imfs': 'Intermolecular Forces'}


def load(rel):
    return json.load(open(os.path.join(ROOT, rel), encoding='utf-8'))


def clean(t):
    return re.sub(r'\s+', ' ', (t or '').replace('\u2014', ' - ')).strip()


def make_item(**kw):
    secs = kw.pop('secs', [])
    bad = [s for s in secs if s not in SEC_LABEL]
    assert not bad, f"unknown section ids {bad} in {kw.get('id')}"
    it = dict(dl=0, id='', k='', f='', c='organic', s=secs, n='', sub='', b='', a='', w='', o=None, oa='', im='', am='', l='', z='', m={}, x='', ed=None, fl=None)
    it.update(kw)
    if not it.get('tp'):
        it['tp'] = sorted({s.split('.')[0] for s in secs}, key=lambda v: (v == 'X', int(v) if v.isdigit() else 99))
    return it


# ----------------------------------------------------------------------------- taxonomy mapping
QUIZ_SECS = {'Atom': ['3.4.1'], 'Resonance': ['3.4.2'], 'Induction': ['3.4.3'], 'Orbitals': ['3.4.4'],
             'Competing factors': ['3.4.5'], 'Equilibrium': ['3.6'], 'Nomenclature': ['4.2']}
QUIZ_EXTRA = {'Q09': ['2.8'], 'Q10': ['2.8'], 'Q28': ['3.2']}
MOL_SECS = {'alkane': ['4.2'], 'alkene': ['8.3'], 'alkyne': ['9.2']}   # other classes: functional-group recognition
SIM_SECS = {'arrow-pushing-scorm': ['6.7', '6.8', '6.9', '6.10'],
            'substitution-elimination-scorm': ['7.3', '7.5', '7.7', '7.8', '7.9'],
            'chirality-scorm': ['5.3', '5.5', '5.6'], 'chirality-no-meso-scorm': ['5.3', '5.5'],
            'newman-projections-scorm': ['4.6', '4.7', '4.8'], 'newman-projections-qualitative-scorm': ['4.6', '4.7', '4.8'],
            'cyclohexane-chairs-scorm': ['4.10', '4.11', '4.12', '4.13', '4.14'],
            'ir-spectroscopy-scorm': ['X.1'], 'ms-spectrometry-scorm': ['X.2'], 'nmr-intro-scorm': ['X.3'],
            'ir-ms-combined-scorm': ['X.1', 'X.2']}


def mech_secs(mech):
    toks = set(re.findall(r'SN1|SN2|E1|E2', mech or ''))
    out = []
    if 'SN2' in toks: out.append('7.3')
    if 'SN1' in toks or 'E1' in toks: out.append('7.8')
    if 'E2' in toks: out.append('7.5')
    return out or ['7.9']


def problem_secs(p):
    t, m = p['type'], p['mechanism']
    fixed = {'Regiochemistry of elimination': ['7.7', '7.6'], 'Carbocation rearrangement': ['7.8', '6.11'],
             'Elimination (E1)': ['7.8'], 'Functional group conversion': ['7.10', '7.11'], 'Synthesis design': ['7.11', '7.3'],
             'Intramolecular substitution': ['7.3'], 'Nucleophile strength': ['7.4'], 'Substrate reactivity': ['7.3', '7.8'],
             'Leaving groups': ['7.1', '7.3'], 'Solvent effects': ['7.12'], 'Classify the substrate': ['7.9'],
             'What went wrong': ['7.9'], 'Compare two conditions': ['7.9'], 'Which reacts faster?': ['7.3', '7.8']}
    if t in fixed:
        return fixed[t]
    if t == 'Stereochemistry':
        return {'SN2': ['7.3', '5.3'], 'SN1': ['7.8', '5.3'], 'E2': ['7.7']}.get(m, mech_secs(m))
    if t == 'Draw the mechanism':
        return mech_secs(m) + ['6.10']
    if t == 'Energy diagrams':
        return ['6.6'] + mech_secs(m)
    return mech_secs(m)


# ----------------------------------------------------------------------------- loaders
def molecules():
    for r in load(MOL + 'molecules.json'):
        secs = list(MOL_SECS.get(r['class'], ['2.3']))
        if r['ez_isomer']:
            secs.append('5.11')
        yield make_item(id=r['id'], k='molecule', f='Molecule', secs=secs, n=r['name'],
                        sub=' · '.join(x for x in (r['name_classic'] if r['name_classic'] != r['name'] else '', r['common_name'], r['formula']) if x),
                        im=MOL + r['image'], m={'Class': r['class'] + (f" ({r['subclass']})" if r['subclass'] else ''), 'SMILES': r['smiles'],
                                               'Formula': r['formula'], 'Mol. weight': r['mol_weight'], 'Carbons': r['carbons'],
                                               'Stereocenters (unspecified)': r['stereocenters']},
                        x=' '.join(str(v) for v in r.values()))


def problems():
    for p in load(SNE + 'problems.json'):
        yield make_item(id=p['id'], k='question', f='Free response', secs=problem_secs(p), n=p['type'], sub=p['mechanism'], dl=int(p['difficulty']),
                        b=p['question'], a=p['answer'], w=p['explanation'], im=SNE + p['question_image'] if p['question_image'] else '',
                        am=SNE + p['answer_image'] if p['answer_image'] else '', m={'Source': p['source']},
                        ed={'question': p['question'], 'answer': p['answer'], 'explanation': p['explanation']},
                        fl=[['question', 'Question'], ['answer', 'Answer'], ['explanation', 'Explanation']],
                        x=' '.join(str(p[k]) for k in ('id', 'type', 'mechanism', 'question', 'answer', 'explanation')))


def quiz():
    for q in load(QZ + 'questions.json'):
        secs = QUIZ_SECS[q['topic']] + QUIZ_EXTRA.get(q['id'], [])
        opts = [dict(t=o['type'], v=(QZ + o['value']) if o['type'] == 'img' else o['value']) for o in q['options']]
        texts = [o['value'] if o['type'] == 'text' else None for o in q['options']]
        yield make_item(id=q['id'], k='question', f='Multiple choice', secs=secs, n=f"{q['topic']} · {q['level']}", b=q['stem'],
                        o=opts, oa=q['answer'], w=q['why'], dl=int(q.get('difficulty', 2)), im=(QZ + q['stem_image']) if q['stem_image'] else '',
                        ed={'stem': q['stem'], 'options': texts, 'why': q['why']},
                        fl=[['stem', 'Question'], ['options', 'Choices'], ['why', 'Explanation']],
                        x=' '.join([q['id'], q['topic'], q['level'], q['stem'], q['why']] + [t for t in texts if t]))


def _title(path):
    m = re.search(r'<title>(.*?)</title>', open(path, encoding='utf-8', errors='ignore').read(8000), re.S | re.I)
    return clean(html.unescape(m.group(1))) if m else ''


def _human(name):
    return GEN_TOPIC.get(name) or re.sub(r'[-_]+', ' ', name).strip().title()


def simulations():
    desc = {}
    cm = os.path.join(ROOT, 'CLAUDE.md')
    if os.path.exists(cm):
        for path, text in re.findall(r'^\| `([^`]+/)` \| (.+?) \|$', open(cm, encoding='utf-8').read(), re.M):
            desc[path] = clean(text)
    for idx in sorted(glob.glob(os.path.join(ROOT, '*', '*', '*', 'src', 'index.html'))):
        rel = os.path.relpath(idx, ROOT).replace(os.sep, '/')
        cls, topic, pkg = rel.split('/')[:3]
        if cls not in CLASS_DIR:
            continue
        course = CLASS_DIR[cls]
        pkgdir = f'{cls}/{topic}/{pkg}/'
        zips = sorted(glob.glob(os.path.join(ROOT, pkgdir, 'dist', '*.zip')))
        title = _title(idx)
        title = title if len(title) > 2 else _human(pkg)
        yield make_item(id=pkg, k='sim', f='Simulation', c=course, secs=SIM_SECS.get(pkg, []) if course == 'organic' else [],
                        tp=None if course == 'organic' else [_human(topic)], n=title, sub=desc.get(pkgdir, ''),
                        l=urllib.parse.quote(rel), z=urllib.parse.quote(os.path.relpath(zips[-1], ROOT).replace(os.sep, '/')) if zips else '',
                        m={'Folder': pkgdir, 'Kind': 'SCORM activity (web version)'}, x=' '.join([pkg, title, desc.get(pkgdir, ''), topic]))
    n = 0
    for f in sorted(glob.glob(os.path.join(ROOT, 'to-merge', '**', '*.html'), recursive=True)):
        rel = os.path.relpath(f, ROOT).replace(os.sep, '/')
        parts = rel.split('/')
        if len(parts) < 4:
            continue
        n += 1
        course_name, topic, act = parts[1], parts[2], parts[3]
        course = {'Honors Chemistry': 'honors', 'AP Chemistry': 'ap', 'Organic Chemistry': 'organic'}.get(course_name, 'honors')
        title = _title(f)
        title = title if len(title) > 2 else _human(os.path.splitext(act)[0])
        secs = ['2.3'] if course == 'organic' and topic == 'Functional Groups' else []
        yield make_item(id=f'TM{n:03d}', k='sim', f='Simulation', c=course, secs=secs, tp=None if course == 'organic' else [topic], n=title,
                        sub='Teacher simulation', l=urllib.parse.quote(rel), m={'Folder': '/'.join(parts[:-1]) + '/', 'File': parts[-1]},
                        x=' '.join([act, title, topic, course_name]))


def bank():
    path = os.path.join(ROOT, BANK, 'questions.json')
    if not os.path.exists(path):
        return
    for q in json.load(open(path, encoding='utf-8')):
        mc = q['fmt'] == 'MC'
        base = dict(id=q['id'], k='question', f='Multiple choice' if mc else 'Free response', secs=q['s'], dl=int(q['d']),
                    n=SEC_LABEL[q['s'][0]], im=BANK + q['im'] if q.get('im') else '')
        if mc:
            opts = [dict(t=o['t'], v=BANK + o['v'] if o['t'] == 'img' else o['v']) for o in q['o']]
            texts = [o['v'] if o['t'] == 'text' else None for o in q['o']]
            yield make_item(**base, b=q['stem'], o=opts, oa=q['a'], w=q['why'], ed={'stem': q['stem'], 'options': texts, 'why': q['why']},
                            fl=[['stem', 'Question'], ['options', 'Choices'], ['why', 'Explanation']],
                            x=' '.join([q['id'], q['stem'], q['why']] + [t for t in texts if t]))
        else:
            yield make_item(**base, b=q['stem'], a=q['a'], w=q['why'], am=BANK + q['am'] if q.get('am') else '',
                            ed={'question': q['stem'], 'answer': q['a'], 'explanation': q['why']},
                            fl=[['question', 'Question'], ['answer', 'Answer'], ['explanation', 'Explanation']],
                            x=' '.join([q['id'], q['stem'], q['a'], q['why']]))


AP_BANK = 'ap-chemistry/question-bank/'


def ap_bank():
    """released AP Chemistry free-response questions, 2015 to 2026, shown as the printed page (image) with a search text"""
    path = os.path.join(ROOT, AP_BANK, 'questions.json')
    if not os.path.exists(path):
        return
    for q in json.load(open(path, encoding='utf-8')):
        yield make_item(id=q['id'], k='question', f='Free response', c='ap', tp=q['units'], dl=int(q['d']), n=q['title'], b='', a=q['a'],
                        im=AP_BANK + q['im'], x=' '.join([q['id'], str(q['year']), 'AP released free response', q['title'], clean(q['text'])] + q['units']))


LOADERS = [problems, quiz, bank, ap_bank, molecules, simulations]
WORD = 'organic-chemistry/word-docs/'


def docs():
    """downloads: one Word question document and one answer key per organic chapter, plus the molecule data"""
    out = []
    folder = os.path.join(ROOT, WORD)
    names = sorted(os.listdir(folder)) if os.path.isdir(folder) else []
    for t in TAX:
        if t['id'] == 'X':
            continue
        pre = 'Ch%02d_' % int(t['id'])
        q = [n for n in names if n.startswith(pre) and n.endswith('_Questions.docx')]
        k = [n for n in names if n.startswith(pre) and n.endswith('_Answer_Key.docx')]
        if q and k:
            out.append(dict(n='Ch. %s %s' % (t['id'], t['short']), g=t['id'], q=WORD + q[0], k=WORD + k[0]))
    for n, p in [('Molecule data (CSV)', MOL + 'molecules.csv')]:
        if os.path.exists(os.path.join(ROOT, p)):
            out.append(dict(n=n, g='', q=p, k=''))
    return out


def main():
    data = [it for loader in LOADERS for it in loader()]
    tax = {'organic': [dict(id=t['id'], label=t['label'], short=t['short'], sections=t['sections']) for t in TAX]}
    for course in ('honors', 'ap'):
        names = sorted({tp for d in data if d['c'] == course for tp in d['tp']})
        tax[course] = [dict(id=n, label=n, short=n, sections=[]) for n in names]
    docs_ = docs()
    missing = []
    for d in data:
        for key in ('im', 'am', 'l', 'z'):
            v = d.get(key)
            if v and not os.path.exists(os.path.join(ROOT, urllib.parse.unquote(v))):
                missing.append((d['id'], v))
        for o in d.get('o') or []:
            if o['t'] == 'img' and not os.path.exists(os.path.join(ROOT, o['v'])):
                missing.append((d['id'], o['v']))
    unplaced = [d['id'] for d in data if d['c'] == 'organic' and not d['s'] and d['k'] != 'sim']
    tpl = open(os.path.join(ROOT, 'tools', 'index_template.html'), encoding='utf-8').read()
    payload = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    out = (tpl.replace('__DATA__', payload(data)).replace('__TAX__', payload(tax)).replace('__DOCS__', payload(docs_))
              .replace('__SECLABEL__', payload(SEC_LABEL)).replace('__COURSES__', payload(COURSE_LABEL)))
    assert '\u2014' not in out, 'em dash in generated page'
    open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(out)
    print(f'{len(data)} items, {len(out) // 1024} KB;', dict(Counter(d['k'] for d in data)), '| missing targets:', len(missing), missing[:3],
          '| organic items without a section:', len(unplaced), unplaced[:5])


if __name__ == '__main__':
    main()

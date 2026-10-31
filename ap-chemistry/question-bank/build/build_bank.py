"""Write questions.json for the AP Chemistry bank from frqs.json (made by frq_extract.py), applying difficulty edits from content/overrides.json.
Difficulty: the three long questions start at 4 (Hard) and the four short ones at 3 (Moderate); the teacher changes any of them in the index."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'organic-chemistry', '_shared'))
sys.path.insert(0, HERE)
import overrides
from ap_meta import UNITS, FRQ_UNITS

NOTE = 'The released question paper has no answer key. The official scoring guidelines are on AP Central.'


def main():
    edits = overrides.load()
    out = []
    for f in json.load(open(os.path.join(ROOT, 'frqs.json'), encoding='utf-8')):
        units = FRQ_UNITS[f['year']][f['q']]
        d = 4 if f['long'] else 3
        e = edits.get(f['id'], {})
        if e.get('difficulty'):
            d = int(e['difficulty'])
        out.append(dict(id=f['id'], year=f['year'], q=f['q'], long=f['long'], fmt='FR', d=d, units=[UNITS[u] for u in units],
                        title=f"{f['year']} AP Chemistry free-response question {f['q']} ({'long, 10 points' if f['long'] else 'short, 4 points'})",
                        text=f['text'], a=NOTE, im=f['img']))
    json.dump(out, open(os.path.join(ROOT, 'questions.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(out), 'AP free-response questions')


if __name__ == '__main__':
    main()

"""Build the question bank: python3 build.py [chapter numbers...]  (default: all chapters present)."""
import os, sys, json, glob, importlib, re, collections
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import qb
import overrides

want = [int(a) for a in sys.argv[1:]]
banks = []
for f in sorted(glob.glob(os.path.join(HERE, 'ch[0-9][0-9].py'))):
    n = int(re.search(r'ch(\d+)\.py', f).group(1))
    if want and n not in want:
        continue
    b = qb.Bank(n)
    importlib.import_module(f'ch{n:02d}').build(b)
    banks.append(b)
data, rep = qb.finish(banks, overrides.load())
if not want:
    json.dump(data, open(os.path.join(qb.ROOT, 'questions.json'), 'w'), indent=0, ensure_ascii=False)
print(len(data), 'questions')
for (ch, fmt), c in sorted(rep.items()):
    print(f'Ch{ch} {fmt}: {sum(c.values())}  by difficulty', dict(sorted(c.items())))

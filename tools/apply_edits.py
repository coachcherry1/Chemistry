"""Apply wording edits made in the index page, then rebuild everything.

    python3 tools/apply_edits.py path/to/chem-index-edits.json    # merge the downloaded edits, rebuild
    python3 tools/apply_edits.py                                  # just rebuild from content/overrides.json

Edits live in content/overrides.json and are applied by the problem and quiz build scripts, so the Word documents,
JSON/CSV data and index.html all show the same wording.
"""
import json, os, subprocess, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.join(ROOT, 'organic-chemistry', '_shared'))
import overrides

if len(sys.argv) > 1:
    data = json.load(open(sys.argv[1], encoding='utf-8'))
    n = overrides.merge(data.get('edits', data))
    print(f'merged edits for {n} item(s) into content/overrides.json')
STEPS = [('organic-chemistry/substitution-elimination/problem-bank/build', ['python3', 'build.py']),
         ('organic-chemistry/acids-bases/acids-bases-quiz/build', ['python3', 'make_quiz.py']),
         ('organic-chemistry/question-bank/build', ['python3', 'build.py']),
         ('ap-chemistry/question-bank/build', ['python3', 'build_bank.py']),
         ('.', ['python3', 'tools/build_index.py'])]
for cwd, cmd in STEPS:
    print('running', ' '.join(cmd), 'in', cwd)
    subprocess.run(cmd, cwd=os.path.join(ROOT, cwd), check=True, stdout=subprocess.DEVNULL if cmd[-1] != 'tools/build_index.py' else None)

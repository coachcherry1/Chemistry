"""Wording edits kept in content/overrides.json (id -> {field: new text}); applied by the build scripts so that
the Word documents, JSON/CSV data and the index all show the same text."""
import json, os


def _path():
    d = os.path.dirname(os.path.abspath(__file__))
    while d != os.path.dirname(d):
        p = os.path.join(d, 'content', 'overrides.json')
        if os.path.exists(p):
            return p
        d = os.path.dirname(d)
    return None


def load():
    p = _path()
    if not p:
        return {}
    data = json.load(open(p, encoding='utf-8'))
    return data.get('edits', data) if isinstance(data, dict) else {}


def merge(new_edits):
    """merge {id: {field: text}} into overrides.json; returns number of ids touched"""
    p = _path()
    cur = load()
    for k, v in new_edits.items():
        cur.setdefault(k, {}).update(v)
    json.dump(cur, open(p, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    return len(new_edits)

"""Question-bank framework: compact authoring, structure drawing, checks, outputs.

Authoring (see ch07.py for a model):
    b.mc(sec, d, stem, right, [wrong1, wrong2, wrong3], why, img=..., oimg=False)
    b.fr(sec, d, question, answer, why, img=..., aimg=...)
sec  = section id from content/taxonomy.json (or a list of ids; the first is the main one)
d    = difficulty 1 Easy, 2 Basic, 3 Moderate, 4 Hard (5 Very hard is not written; it marks Klein's challenge level)
img  = drawing spec: S('CCO') one structure, S('CCO','CC=O', labels='I II'), R(sub, prod, top, bottom) reaction scheme,
       E([...],[...]) equilibrium, H(smiles, {1:'1'}) labeled hydrogens, A(smiles, [arrows]) curved arrows.
       In lists, '@H2O' is plain text instead of a structure.
oimg = True when the answer options are structures (SMILES strings or specs) instead of text.
"""
import os, sys, json, random, re, collections
HERE = os.path.dirname(os.path.abspath(__file__))
_d = HERE
while not os.path.isdir(os.path.join(_d, '_shared')) and _d != os.path.dirname(_d):
    _d = os.path.dirname(_d)
sys.path.insert(0, os.path.join(_d, '_shared'))
REPO = os.path.dirname(_d)
from chemdraw import Struct, Arrow, Text, Plus, Equil, compose
from rdkit import Chem, RDLogger
from rdkit.Chem import rdMolDescriptors, rdCIPLabeler
RDLogger.DisableLog('rdApp.*')
from PIL import Image
import namer as _namer

ROOT = os.path.abspath(os.path.join(HERE, '..'))
IMG = os.path.join(ROOT, 'images')
TAX = json.load(open(os.path.join(REPO, 'content', 'taxonomy.json'), encoding='utf-8'))['organic']
SECS = {s['id'] for t in TAX for s in t['sections']}
LEVELS = {1: 'Easy', 2: 'Basic', 3: 'Moderate', 4: 'Hard', 5: 'Very hard'}


# ------------------------------------------------------------------ drawing specs
def S(*smis, labels=None, **kw):
    return ('S', list(smis), labels.split() if isinstance(labels, str) else labels, kw)


def R(sub, prod=None, top=(), bottom=(), **kw):
    return ('R', sub, prod, list(top), list(bottom), kw)


def E(left, right, **kw):
    return ('E', left, right, kw)


def H(smi, labels, **kw):
    return ('H', smi, labels, kw)


def A(smi, arrows, **kw):
    """curved arrows: arrows = [(from_spec, to_spec, {bend:.., s_off:.., e_off:..}), ...]; atoms by map number"""
    return ('A', smi, arrows, kw)


def _items(x, kw=None):
    """a SMILES, '@text', or list of those -> chemdraw items joined with plus signs"""
    xs = x if isinstance(x, (list, tuple)) else [x]
    out = []
    for k, s in enumerate(xs):
        if k:
            out.append(Plus())
        out.append(Text(s[1:], 22) if isinstance(s, str) and s.startswith('@') else Struct(s, redh=False, **(kw or {})))
    return out


def build_items(spec):
    kind = spec[0]
    if kind == 'S':
        _, smis, labels, kw = spec
        out = []
        for k, s in enumerate(smis):
            if labels:
                out.append(Text(labels[k], 22, True))
            out += _items(s, kw)
        return out, 16
    if kind == 'R':
        _, sub, prod, top, bot, kw = spec
        items = _items(sub, kw) + [Arrow(top, bot)]
        items += _items(prod, kw) if prod is not None else [Text('?', 44, True)]
        return items, 14
    if kind == 'E':
        _, left, right, kw = spec
        return _items(left, kw) + [Equil()] + _items(right, kw), 16
    if kind == 'H':
        _, smi, labels, kw = spec
        return [Struct(smi, hlabels=labels, **kw)], 16
    if kind == 'A':
        _, smi, arrows, kw = spec
        st = Struct(smi, redh=False, **kw)
        for frm, to, ak in arrows:
            st.arrow(frm, to, **ak)
        return [st], 16
    raise ValueError(kind)


def render(spec, name, letter=None):
    items, gap = build_items(spec)
    if letter:
        items = [Text(letter + ')', 22, True)] + items
    path = os.path.join(IMG, name + '.png')
    compose(items, path=path, scale=2, gap=gap)
    im = Image.open(path).convert('RGB')
    im.quantize(colors=32, method=Image.Quantize.MEDIANCUT).save(path, optimize=True)
    return f'images/{name}.png'


# ------------------------------------------------------------------ chemistry helpers used by authors
def nm(smi):
    return _namer.name(smi)[0]


def nmc(smi):
    return _namer.name(smi)[1]


def formula(smi):
    return rdMolDescriptors.CalcMolFormula(Chem.MolFromSmiles(smi))


def cip(smi):
    """CIP labels of every stereo center, in atom order"""
    m = Chem.MolFromSmiles(smi)
    rdCIPLabeler.AssignCIPLabels(m)
    return [a.GetProp('_CIPCode') for a in m.GetAtoms() if a.HasProp('_CIPCode')]


def _counts(smis):
    c = collections.Counter()
    for s in smis:
        m = Chem.AddHs(Chem.MolFromSmiles(s))
        for a in m.GetAtoms():
            c[a.GetSymbol()] += 1
        c['charge'] += Chem.GetFormalCharge(m)
    return c


def wedged(smi):
    """(atom symbol, 'wedge'|'dash') for every wedged/hashed bond RDKit uses when drawing smi"""
    st = Struct(smi, redh=False)
    m = Chem.Mol(st.dm)
    Chem.WedgeMolBonds(m, m.GetConformer())
    out = []
    for b in m.GetBonds():
        if b.GetBondDir() == Chem.BondDir.BEGINWEDGE:
            out.append((b.GetEndAtom().GetSymbol(), 'wedge', b.GetEndAtom().GetDegree()))
        elif b.GetBondDir() == Chem.BondDir.BEGINDASH:
            out.append((b.GetEndAtom().GetSymbol(), 'dash', b.GetEndAtom().GetDegree()))
    return out


def wedge_text(smi):
    """e.g. ('the methyl group', 'wedge') for the one wedged or hashed bond of a simple stereocenter"""
    sym, kind, deg = wedged(smi)[0]
    name = {'O': 'OH group', 'N': 'amino group', 'Cl': 'chlorine atom', 'Br': 'bromine atom', 'F': 'fluorine atom'}.get(sym)
    if sym == 'C':
        name = 'methyl group' if deg == 1 else 'ethyl group'
    return 'the ' + name, kind


def balanced(reactants, products):
    return _counts(reactants) == _counts(products)


# ------------------------------------------------------------------ the bank
class Bank:
    def __init__(self, ch):
        self.ch = ch
        self.items = []
        self.name_checks = []       # (smiles, wrong name) pairs that must NOT name the right structure
        self.nm = {'M': 0, 'F': 0}

    def _secs(self, sec):
        secs = [sec] if isinstance(sec, str) else list(sec)
        for s in secs:
            assert s in SECS, f'unknown section {s}'
            assert s.split('.')[0] == str(self.ch) or s.startswith('X'), f'section {s} outside chapter {self.ch}'
        return secs

    def mc(self, sec, d, stem, right, wrong, why, img=None, oimg=False, bal=None):
        assert len(wrong) == 3 and 1 <= d <= 4, (stem, d)
        self.nm['M'] += 1
        i = self.nm['M']
        if bal:
            assert balanced(*bal), f'unbalanced reaction in {self.ch}M{i}: {bal}'
        self.items.append(dict(id=f'C{self.ch:02d}M{i:02d}', ch=self.ch, s=self._secs(sec), fmt='MC', d=d, stem=stem,
                               opts=[right] + list(wrong), oimg=oimg, why=why, img=img))

    def fr(self, sec, d, q, a, why, img=None, aimg=None, bal=None):
        assert 1 <= d <= 4, (q, d)
        self.nm['F'] += 1
        i = self.nm['F']
        if bal:
            assert balanced(*bal), f'unbalanced reaction in {self.ch}F{i}: {bal}'
        self.items.append(dict(id=f'C{self.ch:02d}F{i:02d}', ch=self.ch, s=self._secs(sec), fmt='FR', d=d, stem=q, ans=a,
                               why=why, img=img, aimg=aimg))

    def mcname(self, sec, d, stem, smi, wrong_names, why, img=None, classic=False):
        """choose the IUPAC name of smi; the right name comes from the verified namer"""
        right = nmc(smi) if classic else nm(smi)
        self.name_checks += [(smi, w) for w in wrong_names]
        self.mc(sec, d, stem, right, wrong_names, why, img=img if img is not None else S(smi))

    def mcstruct(self, sec, d, name_or_stem, smi, wrong_smis, why):
        """choose the structure for a name"""
        self.mc(sec, d, name_or_stem, smi, wrong_smis, why, oimg=True)


def finish(banks, overrides=None):
    """validate, balance answer letters per chapter and format, draw images, return records"""
    from opsin_check import check
    out, report = [], collections.defaultdict(lambda: collections.Counter())
    bad = [c for b in banks for c in b.name_checks]
    mism = {w for (s, w), r in zip(bad, [None] * len(bad))}
    # wrong names must not resolve to the right structure
    import warnings, contextlib
    warnings.filterwarnings('ignore')
    from py2opsin import py2opsin
    names = [w for _, w in bad]
    if names:
        with open(os.devnull, 'w') as dn, contextlib.redirect_stderr(dn):
            back = py2opsin(names)
        for (s, w), b in zip(bad, back):
            if b and Chem.CanonSmiles(b) == Chem.CanonSmiles(s):
                raise AssertionError(f'distractor name {w!r} is actually correct for {s}')
    seen = set()
    for b in banks:
        rng = random.Random(1000 + b.ch)
        mcs = [it for it in b.items if it['fmt'] == 'MC']
        letters = [('ABCD' * (len(mcs) // 4 + 1))[i] for i in range(len(mcs))]
        rng.shuffle(letters)
        for it in b.items:
            key = (it['stem'], repr(it['img']), repr(it.get('opts', '')[:1]))
            assert key not in seen, f"duplicate question {it['id']}"
            seen.add(key)
            rec = dict(id=it['id'], ch=it['ch'], s=it['s'], fmt=it['fmt'], d=it['d'], stem=it['stem'], why=it['why'])
            if it['img'] is not None:
                rec['im'] = render(it['img'], it['id'])
            if it['fmt'] == 'MC':
                L = letters.pop()
                k = 'ABCD'.index(L)
                opts = list(it['opts'][1:])
                opts.insert(k, it['opts'][0])
                rec['a'] = L
                rec['o'] = []
                for j, o in enumerate(opts):
                    if it['oimg']:
                        spec = o if isinstance(o, tuple) else S(o)
                        rec['o'].append(dict(t='img', v=render(spec, f"{it['id']}_{'ABCD'[j]}", 'ABCD'[j])))
                    else:
                        rec['o'].append(dict(t='text', v=o))
                assert len({json.dumps(o['v']) for o in rec['o']}) == 4, f"duplicate options in {it['id']}"
                if it['oimg'] and all(isinstance(o, str) for o in it['opts']):
                    cs = {Chem.CanonSmiles(o) for o in it['opts']}
                    assert len(cs) == 4, f"two options are the same structure in {it['id']}"
            else:
                rec['a'] = it['ans']
                if it['aimg'] is not None:
                    rec['am'] = render(it['aimg'], it['id'] + '_a')
            if overrides and it['id'] in overrides:
                for kk, vv in overrides[it['id']].items():
                    if kk == 'difficulty':
                        rec['d'] = int(vv)
                    elif kk == 'stem' or kk == 'question':
                        rec['stem'] = vv
                    elif kk == 'why' or kk == 'explanation':
                        rec['why'] = vv
                    elif kk == 'answer' and rec['fmt'] == 'FR':
                        rec['a'] = vv
                    elif kk == 'options' and rec['fmt'] == 'MC':
                        for j, t in enumerate(vv):
                            if t is not None and rec['o'][j]['t'] == 'text':
                                rec['o'][j]['v'] = t
            out.append(rec)
            report[(b.ch, it['fmt'])][it['d']] += 1
    return out, report

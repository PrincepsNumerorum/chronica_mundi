#!/usr/bin/env python3
"""events.js = src/events_base.json + src/events_add.tsv (year, month, day, region, text, approx)"""
import json, os, re, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
base = json.load(open(os.path.join(ROOT, 'src', 'events_base.json'), encoding='utf-8'))
def norm(s): return re.sub(r'[\s、。・「」『』（）()〔〕【】○=＝,]', '', unicodedata.normalize('NFKC', s))
seen = {(e['y'], norm(e['t'])) for e in base}
add = []
p = os.path.join(ROOT, 'src', 'events_add.tsv')
for ln in open(p, encoding='utf-8'):
    if not ln.strip() or ln.startswith('#'): continue
    f = ln.rstrip('\n').split('\t')
    y, m, d, r, t = int(f[0]), f[1], f[2], f[3], f[4]
    e = {'y': y, 't': t, 'r': r}
    if m: e['m'] = int(m)
    if d: e['d'] = int(d)
    if len(f) > 5 and f[5] == 'c': e['c'] = 1
    k = (y, norm(t))
    if k in seen: continue
    seen.add(k); add.append(e)
ev = sorted(base + add, key=lambda e: (e['y'], e.get('m') or 0, e.get('d') or 0))
open(os.path.join(ROOT, 'site', 'data', 'events.js'), 'w', encoding='utf-8').write('CM.data.events(' + json.dumps(ev, ensure_ascii=False, separators=(',', ':')) + ');\n')
print('events', len(base), '+', len(add), '=', len(ev))

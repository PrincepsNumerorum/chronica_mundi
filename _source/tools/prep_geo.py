"""Natural Earth -> compact delta-encoded int arrays (lon/lat * 100)."""
import json, sys, os
NE = sys.argv[1]; OUT = sys.argv[2]

def dp(pts, tol):
    if len(pts) < 3: return pts
    import math
    keep = [False]*len(pts); keep[0]=keep[-1]=True
    stack=[(0,len(pts)-1)]
    while stack:
        a,b = stack.pop()
        ax,ay = pts[a]; bx,by = pts[b]
        dx,dy = bx-ax, by-ay; L = dx*dx+dy*dy
        best=-1; bi=-1
        for i in range(a+1,b):
            px,py = pts[i]
            if L==0: d=(px-ax)**2+(py-ay)**2
            else:
                t=((px-ax)*dx+(py-ay)*dy)/L; t=max(0,min(1,t))
                d=(px-ax-t*dx)**2+(py-ay-t*dy)**2
            if d>best: best=d; bi=i
        if best > tol*tol:
            keep[bi]=True; stack.append((a,bi)); stack.append((bi,b))
    return [p for p,k in zip(pts,keep) if k]

def enc(pts, tol=0.02):
    pts = dp(pts, tol)
    out=[]; px=py=0
    for x,y in pts:
        ix,iy = round(x*100), round(y*100)
        out += [ix-px, iy-py]; px,py = ix,iy
    return out

def lines(geom):
    t=geom['type']; c=geom['coordinates']
    if t=='LineString': return [c]
    if t=='MultiLineString': return c
    if t=='Polygon': return c
    if t=='MultiPolygon': return [r for p in c for r in p]
    return []

def load(n): return json.load(open(os.path.join(NE,n+'.geojson')))
res = {}
res['coast'] = [enc(l) for f in load('ne_50m_coastline')['features'] for l in lines(f['geometry']) if len(l)>1]
res['rivers'] = []
for f in load('ne_50m_rivers_lake_centerlines')['features']:
    p=f['properties']
    for l in lines(f['geometry']):
        res['rivers'].append([p.get('scalerank',9), p.get('name') or '', enc(l)])
res['lakes'] = [[f['properties'].get('scalerank',9), enc(r)] for f in load('ne_50m_lakes')['features'] for r in lines(f['geometry'])]
res['shelf'] = [enc(r,0.05) for f in load('ne_10m_bathymetry_K_200')['features'] for r in lines(f['geometry']) if len(r)>8]
js='CM.data.geo(%s);\n' % json.dumps(res,separators=(',',':'))
open(os.path.join(OUT,'base.js'),'w').write(js)
print({k:len(v) for k,v in res.items()}, len(js)/1e6,'MB')
# modern countries (2020-2026 overlay)
ctry=[]
for f in load('ne_50m_admin_0_countries')['features']:
    p=f['properties']
    ctry.append([p.get('NAME_JA') or p.get('NAME'), p.get('ISO_A3'), [enc(r,0.03) for r in lines(f['geometry'])], round(p.get('LABEL_X',0),2), round(p.get('LABEL_Y',0),2)])
js='CM.data.modern(%s);\n' % json.dumps(ctry,separators=(',',':'),ensure_ascii=False)
open(os.path.join(OUT,'modern.js'),'w').write(js)
print('modern', len(ctry), len(js)/1e6,'MB')

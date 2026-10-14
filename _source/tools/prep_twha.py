"""Convert twha5 territory/relief tiles and region data into file://-safe JS data files."""
import os, sys, io, json, base64, re
from PIL import Image

SRC = sys.argv[1]          # path to twha5 dir
OUT = sys.argv[2]          # site/data/map

# canonical class order: 0 water, 1 unclaimed, 2..28 polity colors, 29 black
CLASSES = [
 (57,193,255),(255,255,255),(255,102,255),(255,0,0),(255,153,51),(0,255,255),(0,255,0),(153,153,0),
 (0,0,255),(0,153,0),(255,255,0),(255,0,255),(153,153,255),(0,153,153),(255,153,153),(153,51,0),
 (153,0,153),(255,153,0),(0,102,102),(0,102,0),(102,102,255),(0,255,153),(153,0,0),(153,153,51),
 (153,102,0),(102,0,0),(102,0,102),(255,153,255),(0,0,0),(204,204,0)]
CIDX = {c:i for i,c in enumerate(CLASSES)}
PAL = []
for k in range(256):
    PAL += [min(k*8,255),0,0]

def enc_tile(path):
    im = Image.open(path).convert('RGB')
    w,h = im.size
    src = im.tobytes()
    idx = bytearray(w*h)
    for p in range(w*h):
        c = (src[3*p],src[3*p+1],src[3*p+2])
        idx[p] = CIDX[c]
    out = Image.frombytes('P',(w,h),bytes(idx))
    out.putpalette(PAL)
    b = io.BytesIO(); out.save(b,'PNG',optimize=True)
    return base64.b64encode(b.getvalue()).decode()

total = 0
years_index = {}
tdir = os.path.join(SRC,'t')
for d in sorted(os.listdir(tdir)):
    files = sorted(os.listdir(os.path.join(tdir,d)), key=lambda f:int(f[:-4]))
    data = {}
    for f in files:
        data[f[:-4]] = enc_tile(os.path.join(tdir,d,f))
    years_index[d] = [int(f[:-4]) for f in files]
    js = 'CM.data.terr(%s,%s);\n' % (json.dumps(d), json.dumps(data,separators=(',',':')))
    open(os.path.join(OUT,'terr_%s.js'%d),'w').write(js)
    total += len(js)
    print(d, len(files), len(js)//1024, 'KB', flush=True)
open(os.path.join(OUT,'terr_index.js'),'w').write('CM.data.terrIndex(%s);\n' % json.dumps(years_index,separators=(',',':')))

# relief tiles
rel = {}
for f in sorted(os.listdir(os.path.join(SRC,'sf'))):
    rel[f[:-4]] = base64.b64encode(open(os.path.join(SRC,'sf',f),'rb').read()).decode()
open(os.path.join(OUT,'relief.js'),'w').write('CM.data.relief(%s);\n' % json.dumps(rel,separators=(',',':')))
print('total terr MB', total/1e6)

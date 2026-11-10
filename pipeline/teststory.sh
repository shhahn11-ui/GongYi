#!/bin/bash
# usage: teststory.sh <name>  -> stories/<name>/st/grid.jpg (frame at 60% of each narration line)
cd "$(dirname "$0")"; N=$1; D=stories/$N
TS=$(python3 -c "import json;tl=json.load(open('$D/tl.json'));print(' '.join(str(round(s['start']+s['dur']*.6,2)) for s in tl['segs']))")
rm -rf $D/st && PAGE=story_$N.html TIMES="$(cat $D/times.json)" node capture.js $D/st 0 $TS 2>&1 | grep -E "frames|rror|Uncaught"
python3 - <<PY
from PIL import Image; import glob
fs=sorted(glob.glob('$D/st/f*.png')); n=len(fs); cols=min(5,n); rows=(n+cols-1)//cols
g=Image.new('RGB',(cols*216,rows*384))
for i,f in enumerate(fs): g.paste(Image.open(f).resize((216,384)),((i%cols)*216,(i//cols)*384))
g.save('$D/st/grid.jpg',quality=85)
PY

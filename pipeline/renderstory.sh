#!/bin/bash
cd "$(dirname "$0")"; N=$1; D=stories/$N
DUR=$(python3 -c "import json;print(json.load(open('$D/tl.json'))['dur'])")
rm -rf $D/frames && PAGE=story_$N.html TIMES="$(cat $D/times.json)" node capture.js $D/frames $DUR 2>&1 | grep -E "frames|rror|Uncaught"
python3 compose_story.py $D 2>&1 | tail -2

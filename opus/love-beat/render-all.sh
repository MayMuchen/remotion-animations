#!/bin/bash
# resumable: rerun until ALL-DONE (mirrors to /tmp/lb, needs node_modules there)
P=/sessions/serene-confident-edison/mnt/opus/love-beat; cd /tmp/lb
rsync -a $P/src $P/public $P/tsconfig.json $P/render-chunk.mjs /tmp/lb/; S=$(date +%s)
for s in $(seq 0 150 5294); do e=$((s+149)); [ $e -gt 5294 ] && e=5294; n=$(printf c%04d.mp4 $s)
  [ -f $P/out/chunks8/$n ] && continue; [ $(( $(date +%s)-S )) -gt 100 ] && { echo budget; exit; }
  node render-chunk.mjs $s $e /tmp/$n 2>&1 | grep -E "done|rror" && [ -f /tmp/$n ] && cp /tmp/$n $P/out/chunks8/$n; done
ls $P/out/chunks8/*.mp4 | sed "s/.*/file '&'/" > /tmp/l.txt
ffmpeg -y -v error -f concat -safe 0 -i /tmp/l.txt -i $P/public/song.mp3 -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart /tmp/f.mp4 && cp /tmp/f.mp4 "$P/If I Ain't Got You 卡点.mp4" && echo ALL-DONE

#!/bin/bash
# Resumable chunked render of the beat-sync MV.
# Host copy of this script; runs from /tmp/lb (node_modules lives there).
# Re-run until it prints ALL-DONE.
P=/sessions/gifted-optimistic-ramanujan/mnt/opus/love-beat
cd /tmp/lb || exit 1
mkdir -p $P/out/chunksV2
S=$(date +%s)
for s in $(seq 0 300 5280); do
  e=$((s + 299)); [ $e -gt 5294 ] && e=5294
  n=$(printf c%04d.mp4 $s)
  [ -f $P/out/chunksV2/$n ] && continue
  [ $(( $(date +%s) - S )) -gt 130 ] && { echo "budget: $(ls $P/out/chunksV2 | wc -l) chunks so far"; exit 0; }
  node render-chunk.mjs $s $e /tmp/$n 2>&1 | grep -E "done|rror" | head -3
  [ -f /tmp/$n ] && cp /tmp/$n $P/out/chunksV2/$n && rm -f /tmp/$n
done
ls $P/out/chunksV2/*.mp4 | sed "s/.*/file '&'/" > /tmp/l2.txt
ffmpeg -y -v error -f concat -safe 0 -i /tmp/l2.txt -i $P/public/song.mp3 -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart /tmp/f2.mp4 \
  && cp /tmp/f2.mp4 "$P/If I Ain't Got You 卡点故事 MV.mp4" && echo ALL-DONE
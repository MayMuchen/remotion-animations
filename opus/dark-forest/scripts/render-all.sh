#!/bin/bash
# Resumable chunked render (the sandbox limits each command to ~3 min).
# Re-run until it prints ALL-DONE, then run scripts/concat.sh.
P=/sessions/admiring-charming-hopper/mnt/opus/dark-forest
cd /tmp/df
START=$(date +%s)
# chunk list: "start end"
CHUNKS="0 239"
for s in $(seq 240 120 3359); do
  e=$((s + 119)); [ $e -gt 3359 ] && e=3359
  CHUNKS="$CHUNKS
$s $e"
done
echo "$CHUNKS" > /tmp/chunks.txt
while read s e; do
  name=$(printf "c%04d.mp4" $s)
  [ -f $P/out/chunks/$name ] && continue
  if [ $(( $(date +%s) - START )) -gt 95 ]; then echo "budget reached"; exit 0; fi
  node scripts/render-chunk.mjs $s $e /tmp/$name 2>&1 | grep -E "done|rror" && cp /tmp/$name $P/out/chunks/$name
done < /tmp/chunks.txt
echo ALL-DONE

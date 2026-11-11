#!/bin/bash
# Joins the rendered chunks and muxes in the procedural score.
set -e
P=/sessions/admiring-charming-hopper/mnt/opus/dark-forest
L=/tmp/concat.txt; : > $L
echo "file '$P/out/chunks/c0000.mp4'" >> $L
for s in $(seq 240 120 3359); do echo "file '$P/out/chunks/$(printf c%04d.mp4 $s)'" >> $L; done
ffmpeg -y -v error -f concat -safe 0 -i $L -i $P/public/audio/score.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -shortest -movflags +faststart /tmp/final.mp4
cp /tmp/final.mp4 "$P/黑暗森林法则.mp4"

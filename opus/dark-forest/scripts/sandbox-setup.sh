#!/bin/bash
# Mirrors the project into /tmp/df (fast local disk) and installs deps there.
set -e
SRC=/sessions/admiring-charming-hopper/mnt/opus/dark-forest
mkdir -p /tmp/df
if [ ! -d /tmp/df/node_modules/remotion ]; then
  cp $SRC/package.json /tmp/df/
  (cd /tmp/df && npm i --no-audit --no-fund --loglevel=error)
fi
rsync -a --delete $SRC/src/ /tmp/df/src/
rsync -a $SRC/public/ /tmp/df/public/ 2>/dev/null || cp -r $SRC/public /tmp/df/
cp $SRC/tsconfig.json $SRC/remotion.config.ts /tmp/df/
mkdir -p /tmp/df/scripts && cp $SRC/scripts/*.mjs /tmp/df/scripts/ 2>/dev/null || true
echo setup-ok

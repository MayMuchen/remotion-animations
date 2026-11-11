#!/bin/bash
# Subsets the CJK fonts down to only the characters used in src/ (needs fonttools + brotli).
# Re-run after changing any on-screen text.
set -e
cd "$(dirname "$0")/.."
python3 - <<'PY'
import glob
chars = set(chr(c) for c in range(32, 127))
for f in glob.glob('src/**/*.ts*', recursive=True):
    chars |= set(open(f, encoding='utf8').read())
open('/tmp/chars-love.txt', 'w', encoding='utf8').write(''.join(sorted(chars)))
PY
N=/usr/share/fonts/opentype/noto
mkdir -p public/fonts
pyftsubset $N/NotoSerifCJK-Bold.ttc --font-number=2 --text-file=/tmp/chars-love.txt --output-file=public/fonts/serif-bold.ttf --layout-features='*'
pyftsubset $N/NotoSansCJK-Regular.ttc --font-number=2 --text-file=/tmp/chars-love.txt --output-file=public/fonts/sans-regular.ttf --layout-features='*'
pyftsubset /usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf --text-file=/tmp/chars-love.txt --output-file=public/fonts/mono.ttf
ls -la public/fonts
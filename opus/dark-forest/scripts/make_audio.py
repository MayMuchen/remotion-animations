"""
Procedural score for 《黑暗森林法则》 — numpy only, no samples.
Every hit is aligned to the frame events in src/timeline.ts (30 fps).
Output: public/audio/score.wav (44.1 kHz, 16-bit stereo)
"""
import os
import wave

import numpy as np

SR = 44100
FPS = 30
TOTAL_FRAMES = 3360
N = int(TOTAL_FRAMES / FPS * SR)
rng = np.random.default_rng(1379)
t_all = np.arange(N) / SR

L = np.zeros(N)
R = np.zeros(N)


def fr(f):  # frames -> seconds
    return f / FPS


def idx(sec):
    return int(sec * SR)


def add(sig, at, gain=1.0, pan=0.0):
    """Mix a mono signal into the stereo bus at time `at` (seconds)."""
    i = idx(at)
    if i >= N:
        return
    sig = sig[: N - i]
    lg = np.cos((pan + 1) * np.pi / 4) * gain
    rg = np.sin((pan + 1) * np.pi / 4) * gain
    L[i : i + len(sig)] += sig * lg
    R[i : i + len(sig)] += sig * rg


def bandnoise(n, lo, hi, seed=None):
    """Band-limited noise via FFT masking."""
    g = np.random.default_rng(seed) if seed is not None else rng
    x = g.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    mask = ((f >= lo) & (f <= hi)).astype(float)
    # soft edges
    mask *= np.clip((f - lo * 0.7) / (lo * 0.3 + 1e-9), 0, 1) if lo > 0 else 1
    y = np.fft.irfft(X * mask, n)
    return y / (np.max(np.abs(y)) + 1e-9)


def env_exp(n, decay):
    return np.exp(-np.arange(n) / SR / decay)


def adsr(n, a, r):
    e = np.ones(n)
    ai = max(1, int(a * SR))
    ri = max(1, int(r * SR))
    e[:ai] = np.linspace(0, 1, ai)
    e[-ri:] *= np.linspace(1, 0, ri)
    return e


def sweep(f0, f1, dur, curve=2.0):
    n = int(dur * SR)
    k = np.linspace(0, 1, n) ** curve
    f = f0 + (f1 - f0) * k
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


# ---------------------------------------------------------------- instruments
def impact(size=1.0, dur=4.0):
    n = int(dur * SR)
    sub = sweep(95, 28, dur, 0.35) * env_exp(n, 0.9 * size)
    body = bandnoise(n, 40, 900) * env_exp(n, 0.35 * size)
    crack = bandnoise(n, 1500, 9000) * env_exp(n, 0.05)
    ring = np.sin(2 * np.pi * 311 * np.arange(n) / SR) * np.sin(2 * np.pi * 0.7 * np.arange(n) / SR) * env_exp(n, 1.2) * 0.08
    s = sub * 1.0 + body * 0.55 + crack * 0.35 + ring
    return np.tanh(s * 1.6) * 0.8


def riser(dur, lo=200, hi=6000, gain=1.0):
    n = int(dur * SR)
    x = np.zeros(n)
    steps = 24
    for k in range(steps):
        a, b = k * n // steps, (k + 1) * n // steps
        c = lo + (hi - lo) * (k / steps) ** 2
        x[a:b] = bandnoise(b - a, c * 0.6, c * 1.4, seed=k)
    e = np.linspace(0, 1, n) ** 3
    tone = sweep(lo / 4, hi / 8, dur, 2) * 0.3
    return (x * 0.7 + tone) * e * gain


def whoosh(dur=1.2):
    n = int(dur * SR)
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    return bandnoise(n, 300, 5000) * e


def blip(freq=1400, dur=0.06):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t) * env_exp(n, dur / 4)


def click(dur=0.03):
    n = int(dur * SR)
    return bandnoise(n, 2000, 12000) * env_exp(n, 0.004)


def heartbeat():
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    k1 = np.sin(2 * np.pi * 52 * t) * np.exp(-t / 0.09)
    k2 = np.zeros(n)
    o = int(0.24 * SR)
    k2[o:] = np.sin(2 * np.pi * 46 * t[: n - o]) * np.exp(-t[: n - o] / 0.12)
    return np.tanh((k1 + 0.8 * k2) * 2) * 0.9


def pad(freqs, dur, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for det in (-0.25, 0.0, 0.25):
            ff = f * (1 + det / 100)
            # band-limited saw approximation (first 6 harmonics)
            for h in range(1, 7):
                s += np.sin(2 * np.pi * ff * h * t + h) / h * (bright ** (h - 1))
    s *= 1 + 0.25 * np.sin(2 * np.pi * 0.07 * t)
    return s / (np.max(np.abs(s)) + 1e-9) * adsr(n, dur * 0.25, dur * 0.3)


def data_chatter(dur, density=40):
    n = int(dur * SR)
    out = np.zeros(n)
    for _ in range(int(dur * density)):
        p = rng.integers(0, max(1, n - 3000))
        b = blip(rng.choice([880, 1320, 1760, 2640, 3520]), 0.025 + rng.random() * 0.03)
        out[p : p + len(b)] += b * (0.3 + rng.random() * 0.7)
    return out


# ---------------------------------------------------------------- 0. drone bed (whole film)
def drone_bed():
    t = t_all
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t)
    d = (
        np.sin(2 * np.pi * 36.71 * t) * 0.6
        + np.sin(2 * np.pi * 55.0 * t + 1) * 0.35 * lfo
        + np.sin(2 * np.pi * 73.42 * t + 2) * 0.18
        + np.sin(2 * np.pi * 36.9 * t) * 0.3
    )
    rumble = bandnoise(N, 20, 140, seed=7) * 0.5
    air = bandnoise(N, 3000, 9000, seed=8) * 0.04
    return d * 0.45 + rumble * 0.4 + air


bed = drone_bed()
# per-section level automation (seconds)
auto_t = [0, 6, 9.4, 9.9, 10.6, 18, 35, 54, 59, 72.07, 72.5, 75, 81.87, 89, 102, 108, 112]
auto_v = [0.25, 0.5, 0.6, 0.0, 0.0, 0.55, 0.6, 0.7, 0.55, 0.75, 0.05, 0.5, 0.7, 0.6, 0.35, 0.25, 0.0]
bed *= np.interp(t_all, auto_t, auto_v)
L += bed * 0.8
R += bed * 0.8

# ---------------------------------------------------------------- 1. cold open
add(data_chatter(6.0, 18), fr(24), 0.12, -0.3)
add(data_chatter(3.0, 30), fr(104), 0.14, 0.3)
for k, f in enumerate([188, 220, 250]):
    add(impact(1.0 + k * 0.3, 3.0), fr(f), 0.9 + k * 0.1)
    add(click(0.08), fr(f), 0.6)
add(riser(1.2, 300, 3000, 0.25), fr(188) - 1.2)
# CRT power-off: high whine dropping out
w = sweep(15600, 200, 0.45, 0.5) * env_exp(int(0.45 * SR), 0.15)
add(w, fr(282), 0.18)
add(click(0.05), fr(282) + 0.4, 0.6)

# ---------------------------------------------------------------- 2. title
add(pad([73.42, 110, 146.83, 220, 261.63], 8.5, 0.6), 10.6, 0.22)
add(riser(2.4, 150, 4000, 0.35), fr(396) - 2.4)
add(impact(1.6, 6.0), fr(396), 1.0)
add(riser(1.3, 400, 9000, 0.5), fr(540) - 1.3)
add(whoosh(1.5), fr(520), 0.35)
add(impact(1.2, 3.0), fr(540), 0.9)

# ---------------------------------------------------------------- 3. axioms
add(pad([73.42, 110, 174.61, 220], 8.0, 0.4), fr(560), 0.12)
add(impact(1.0, 3.0), fr(790), 0.6)
# demand climbing tone
add(sweep(110, 880, 7.5, 2.4) * adsr(int(7.5 * SR), 0.5, 0.4) * 0.12, fr(800))
add(data_chatter(8, 10), fr(800), 0.08, 0.4)

# ---------------------------------------------------------------- 4. suspicion
add(impact(1.0, 2.5), fr(1050), 0.7)
for i, f in enumerate([1090, 1142, 1194, 1236]):
    add(heartbeat(), fr(f), 0.5, -0.4 if i % 2 == 0 else 0.4)
    add(blip(1100 if i % 2 == 0 else 1650, 0.12), fr(f), 0.12, -0.6 if i % 2 == 0 else 0.6)
# packet ping-pong accelerating
tt = fr(1236) + 0.3
for i in range(26):
    add(blip(1400 + (i % 2) * 500, 0.04), tt, 0.07, -0.7 if i % 2 else 0.7)
    tt += max(2, 9 - i * 0.4) / FPS
# droste: ever-rising shepard-ish tone
dur = fr(1402) - fr(1268)
n = int(dur * SR)
sh = np.zeros(n)
for o in range(5):
    f0 = 55 * 2 ** o
    sh += sweep(f0, f0 * 2, dur, 1.4) * np.sin(np.linspace(0, np.pi, n)) * (0.6 if o in (1, 2, 3) else 0.25)
add(sh / 3 * adsr(n, 0.5, 0.2), fr(1268), 0.18)
add(riser(dur, 100, 5000, 0.25), fr(1268))
add(impact(1.3, 4.0), fr(1402), 0.9)

# ---------------------------------------------------------------- 5. tech explosion
tt = fr(1486)
gap = 0.5
while tt < fr(1620):
    add(click(0.03), tt, 0.35)
    add(blip(2200, 0.03), tt, 0.05)
    tt += gap
    gap = max(0.04, gap * 0.9)
add(impact(1.8, 5.0), fr(1620), 1.0)
dur = fr(1770) - fr(1620)
n = int(dur * SR)
dist = np.tanh(sweep(60, 1200, dur, 2.2) * 4) * np.linspace(0.2, 1, n) ** 2
add(dist, fr(1620), 0.12)
add(riser(dur, 200, 10000, 0.5), fr(1620))
add(impact(1.4, 3.0), fr(1770), 1.0)

# ---------------------------------------------------------------- 6. dark forest
add(pad([55, 82.41, 110, 130.81, 164.81], 13.0, 0.35), fr(1780), 0.18)
for k in range(10):
    add(heartbeat(), fr(1790) + k * 1.25, 0.45)
for f in [120, 170, 220, 260, 300, 354]:
    add(blip(880, 0.08), fr(1770 + f), 0.12, 0.0)
    add(blip(1760, 0.08), fr(1770 + f) + 0.5, 0.1, 0.0)
add(riser(1.6, 200, 6000, 0.45), fr(2162) - 1.6)
add(impact(2.2, 6.0), fr(2162), 1.15)
add(click(0.1), fr(2162), 0.9)

# ---------------------------------------------------------------- 7. strike
for i in range(9):
    add(blip(990, 0.22), fr(2240) + i * 0.4, 0.1, 0.3)
    add(blip(1980, 0.12), fr(2240) + i * 0.4, 0.03, 0.3)
dur = fr(2456) - fr(2360)
n = int(dur * SR)
whine = sweep(400, 7000, dur, 3) * np.linspace(0.1, 1, n) ** 2
add(whine, fr(2360), 0.13)
add(riser(dur, 300, 12000, 0.45), fr(2360))
add(impact(3.0, 9.0), fr(2456), 1.3)
add(bandnoise(int(8 * SR), 25, 200) * env_exp(int(8 * SR), 2.5), fr(2456), 0.6)
add(pad([36.71, 55, 73.42, 87.31], 7.0, 0.3), fr(2520), 0.16)

# ---------------------------------------------------------------- 8. dual-vector foil
add(impact(1.0, 2.5), fr(2670), 0.7)
n = int(4 * SR)
glass = sum(np.sin(2 * np.pi * f * np.arange(n) / SR) for f in (1318.5, 1975.5, 2637)) * adsr(n, 1.5, 1.5) / 3
add(glass, fr(2670), 0.05)
add(click(0.06), fr(2790), 0.7)
add(impact(1.5, 4.0), fr(2790), 0.8)
dur = fr(3060) - fr(2790)
n = int(dur * SR)
fall = 0
for f0 in (440, 660, 880):
    fall = fall + sweep(f0, f0 / 8, dur, 0.7)
add(fall / 3 * adsr(n, 0.3, 1.5), fr(2790), 0.1)
add(bandnoise(n, 60, 2000) * np.linspace(0.6, 0, n) ** 1.5, fr(2790), 0.25)

# ---------------------------------------------------------------- 9. ending
add(pad([73.42, 110, 146.83, 174.61, 220], 10.0, 0.25), fr(3060), 0.2)
for k in range(5):
    add(click(0.04), fr(3240 + k * 7), 0.4)
    add(blip(2400, 0.02), fr(3240 + k * 7), 0.04)

# ---------------------------------------------------------------- master
st = np.stack([L, R], 1)
# simple stereo widening reverb: a few decaying taps
rev = np.zeros_like(st)
for d, g in [(0.037, 0.35), (0.053, 0.3), (0.071, 0.25), (0.113, 0.2), (0.173, 0.15), (0.241, 0.1)]:
    k = int(d * SR)
    rev[k:, 0] += st[:-k, 1] * g
    rev[k:, 1] += st[:-k, 0] * g
st = st + rev * 0.5
st = np.tanh(st * 1.1)
st /= np.max(np.abs(st)) + 1e-9
st *= 0.89
fade = np.ones(N)
fade[-int(2.5 * SR) :] = np.linspace(1, 0, int(2.5 * SR))
st *= fade[:, None]

out = os.path.join(os.path.dirname(__file__), "..", "public", "audio", "score.wav")
os.makedirs(os.path.dirname(out), exist_ok=True)
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((st * 32767).astype("<i2").tobytes())
print("wrote", out, f"{N / SR:.2f}s")

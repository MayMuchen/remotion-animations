"""An original, voice-free deep-space score on the existing 144 BPM cue grid.

Long evolving drones and modal tension replace the bright arpeggio. A restrained
quarter-note heartbeat and syncopated sub bass preserve the existing picture hits.
No source music, downloaded recordings or speech synthesis are used.
"""
from pathlib import Path
import json
import subprocess
import wave
import numpy as np
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/dark-forest'
GRID = json.loads((ROOT / 'src/dark-forest/rhythm.json').read_text('utf-8'))
SR = 44100
BPM = GRID['bpm']
BEAT = 60 / BPM
BAR = BEAT * 4
DURATION = GRID['durationInFrames'] / GRID['fps']
N = round(DURATION * SR)
RNG = np.random.default_rng(907144)
atmosphere = np.zeros((N, 2), np.float32)
pulse = np.zeros_like(atmosphere)
effects = np.zeros_like(atmosphere)
events = []


def timeline(seconds):
    return np.arange(round(seconds * SR)) / SR


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def low(x, cutoff):
    return sosfilt(butter(2, cutoff, fs=SR, output='sos'), x, axis=0)


def band(x, bottom, top):
    return sosfilt(butter(2, [bottom, top], btype='bandpass', fs=SR, output='sos'), x, axis=0)


def envelope(x, attack=.008, release=.08):
    x = x.copy()
    a, r = min(len(x), round(attack * SR)), min(len(x), round(release * SR))
    if a:
        x[:a] *= np.linspace(0, 1, a)
    if r:
        x[-r:] *= np.linspace(1, 0, r)
    return x


def put(bus, x, seconds, gain=1, pan=0):
    i = round(seconds * SR)
    if i < 0 or i >= N:
        return
    x = x[:N-i] * gain
    angle = (pan + 1) * np.pi / 4
    bus[i:i+len(x), 0] += x * np.cos(angle)
    bus[i:i+len(x), 1] += x * np.sin(angle)


def mark(when, kind):
    events.append({'time': round(when, 6), 'frame': round(when * GRID['fps']), 'kind': kind})


def heartbeat(strong=False):
    t = timeline(.64)
    f = 42 + 88 * np.exp(-t / .018)
    x = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t/.16)
    x += np.sin(2*np.pi*91*t) * np.exp(-t/.035) * .11
    x += low(RNG.normal(0, 1, len(t)), 1600) * np.exp(-t/.006) * .12
    return envelope(np.tanh(x * (1.6 if strong else 1.2)), .001, .1)


def low_drum():
    t = timeline(.8)
    f = 64 + 90*np.exp(-t/.03)
    x = np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.19)
    x += band(RNG.normal(0, 1, len(t)), 350, 2600)*np.exp(-t/.055)*.34
    return envelope(x, .001, .16)


def tick(opened=False):
    t = timeline(.22 if opened else .09)
    x = band(RNG.normal(0, 1, len(t)), 3200, 8500)
    return envelope(x*np.exp(-t/(.045 if opened else .018)), .003, .025)


def sub(note, duration):
    t = timeline(duration)
    f = hz(note)
    x = np.sin(2*np.pi*f*t)*.76 + np.sin(2*np.pi*f*2*t)*.19
    x += np.sin(2*np.pi*f*3*t)*.055
    return envelope(np.tanh(x*1.4)*np.exp(-t*1.4), .012, .065)


def bell(note, duration=2.8):
    t = timeline(duration)
    f = hz(note)
    x = np.sin(2*np.pi*f*t + .42*np.sin(2*np.pi*f*1.501*t)*np.exp(-t/.3))
    x += np.sin(2*np.pi*f*2.003*t)*np.exp(-t/.25)*.12
    return envelope(low(x, 1800)*np.exp(-t/.55), .018, .4)


def impact():
    t = timeline(3.4)
    f = 32 + 95*np.exp(-t/.045)
    x = np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.53)
    x += band(RNG.normal(0, 1, len(t)), 100, 1800)*np.exp(-t/.33)*.32
    return envelope(x, .002, .8)


def sweep(duration):
    t = timeline(duration)
    x = band(RNG.normal(0, 1, len(t)), 150, 1900)
    x *= np.sin(np.pi*t/duration)**2
    return envelope(x, .04, .04)


def cloud(notes, duration, start):
    t = timeline(duration)
    stereo = np.zeros((len(t), 2), np.float32)
    for j, note in enumerate(notes):
        for side in range(2):
            detune = (-.055 if side == 0 else .065) + j*.009
            phase = 2*np.pi*hz(note)*2**(detune/12)*t + RNG.uniform(0, 2*np.pi)
            drift = .3*np.sin(t*.19+j+start*.017)
            tone = np.sin(phase+drift) + np.sin(phase*2)*.12 + np.sin(phase*3)*.035
            breathing = .8+.2*np.sin(t*.31+j*.8)
            stereo[:, side] += tone*breathing*(.12 if j else .2)
    # The bass itself stays mono; the wide cloud is high-passed for translation.
    stereo = band(stereo, 105, 2100)
    e = np.minimum(t/1.7, 1)*np.minimum((duration-t)/2.6, 1)
    return stereo*e[:, None]


starts = [c['startFrame']/GRID['fps'] for c in GRID['chapters']]

# Slow modal harmony and overlapping, gently detuned pads create scale rather
# than repeating a bright little chord on every bar. Root stays grounded in D.
harmonies = [[50, 57, 65, 69], [50, 58, 63, 69], [50, 57, 62, 65], [46, 53, 62, 65]]
for phrase in range(int(np.ceil(DURATION/(BAR*4)))):
    at = phrase*BAR*4
    notes = harmonies[phrase % len(harmonies)]
    x = cloud(notes, BAR*4+3.2, at)
    i = round(at*SR)
    length = min(len(x), N-i)
    atmosphere[i:i+length] += x[:length]*.25

# Continuous, gently shifting pressure under the harmonic bed.
t = np.arange(N)/SR
for side in range(2):
    air = band(RNG.normal(0, 1, N), 180, 1650)
    atmosphere[:, side] += air*(.012+.006*np.sin(t*.16+side))
    atmosphere[:, side] += np.sin(2*np.pi*hz(38)*t + .4*np.sin(t*.11+side))*.011

for bar in range(round(DURATION/BAR)):
    at = bar*BAR
    scene = max(i for i, s in enumerate(starts) if at+1e-6 >= s)
    intense = scene in [5, 7, 8, 9]
    calm = scene in [10, 13]
    for beat in range(4):
        when = at+beat*BEAT
        gain = .4 if beat%2 == 0 else .23
        if calm:
            gain *= .6
        put(pulse, heartbeat(intense), when, gain)
        mark(when, 'heartbeat')
        # Half-time low drum feels weighty, but the underlying 144 BPM beat
        # and offbeat detail still support the existing fast editorial rhythm.
        if beat == 2:
            put(pulse, low_drum(), when, .22 if intense else .14, -.08)
        if not calm:
            put(pulse, tick(beat == 3), when+BEAT*.5, .045 if intense else .027, (-1)**beat*.45)
            if intense and beat in [1, 3]:
                put(pulse, tick(), when+BEAT*.75, .025, .4)
    pattern = [0, .75, 1.5, 2, 2.75, 3.5] if intense else [0, 1.5, 2, 3.5]
    if calm:
        pattern = [0, 2]
    for j, offset in enumerate(pattern):
        note = 26 + (7 if j == len(pattern)-1 and bar%2 else 0)
        put(pulse, sub(note, BEAT*(.9 if offset in [0, 2] else .5)), at+offset*BEAT, .19 if intense else .14)
    # Widely spaced, darker sonar notes leave room for the deep soundstage.
    if bar%2 == 0 and not calm:
        note = [62, 65, 63, 57][(bar//2)%4]
        put(atmosphere, bell(note), at+BEAT, .052, -.5)
        put(atmosphere, bell(note-12), at+BEAT*2.5, .03, .5)
    if intense and bar%2:
        put(pulse, low_drum(), at+BEAT*3.5, .09, .35)

for scene, chapter in enumerate(GRID['chapters']):
    at = starts[scene]
    if scene:
        put(effects, sweep(BEAT*2), at-BEAT*2, .16, -.3)
        put(effects, impact(), at, .24)
        mark(at, 'chapter-impact')
    for cue in chapter['events']:
        when = at+cue['beat']*BEAT
        kind = cue['kind']
        mark(when, kind)
        if kind == 'count':
            put(effects, low_drum(), when, .32)
        elif kind == 'recursion':
            put(effects, bell(74), when, .10, -.45)
        elif kind == 'infinity':
            put(effects, bell(81), when, .08, .4)
        elif kind == 'ping':
            put(effects, bell(76), when, .12, .45 if cue['beat'] == 10 else -.45)
        elif kind == 'condition':
            put(effects, tick(), when, .10)
        elif kind == 'launch':
            put(effects, sweep(BEAT*1.5), when, .36, -.3)
        elif kind == 'impact':
            put(effects, impact(), when, .71)
            put(effects, low_drum(), when, .3)
    if scene == 7:
        for beat in np.arange(12, 19, .5):
            when = at+beat*BEAT
            put(effects, tick(), when, .028+(beat-12)*.004, np.sin(beat)*.5)
            mark(when, 'technology-tick')
    if scene == 9:
        for k in range(12):
            when = at+(3+k*.5)*BEAT
            put(effects, bell(69+k%3*3, 1.8), when, .036, np.sin(k*2.4)*.7)
            mark(when, 'observer')

# Long filtered cross-channel reflections. Keep the sub/kick dry and centered;
# only atmosphere and sparse cues occupy the large imaginary reverberant space.
wet_source = band(atmosphere+effects*.38, 180, 3000).astype(np.float32)
wet = np.zeros_like(wet_source)
for j, delay in enumerate([.137, .281, .47, .79, 1.27, 1.93, 2.81, 3.71]):
    shift = round(delay*SR)
    source = wet_source[:-shift, ::-1] if j%2 == 0 else wet_source[:-shift]
    wet[shift:] += source*(.25*.78**j)

duck = 1-.23*np.exp(-np.mod(t, BEAT)/.09)
mix = (atmosphere+wet)*duck[:, None] + pulse + effects
impact_at = starts[8]+12*BEAT
mix[(t >= impact_at-BEAT*.5) & (t < impact_at)] *= .025
silence_at = starts[10]+6*BEAT
mix[(t >= silence_at) & (t < silence_at+BEAT*.75)] *= .08
mix *= (np.minimum(t/.09, 1)*np.clip((DURATION-t)/1.35, 0, 1)**1.4)[:, None]
mix = np.tanh(mix*1.12)
mix *= .85/np.max(np.abs(mix))
raw = OUT/'abyss-premaster.wav'
final = OUT/'score-abyss.wav'
with wave.open(str(raw), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix*32767).astype('<i2').tobytes())
subprocess.run([
    str(ROOT/'node_modules/ffmpeg-static/ffmpeg.exe'), '-y', '-v', 'error',
    '-i', str(raw), '-af',
    'highpass=f=25,acompressor=threshold=0.32:ratio=1.6:attack=28:release=220:makeup=1.05,loudnorm=I=-16:TP=-1.5:LRA=10',
    '-ar', str(SR), str(final),
], check=True)
with wave.open(str(final), 'rb') as w:
    duration = w.getnframes()/w.getframerate()
    pcm = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32)/32768
report = {
    'version': 'abyss-v1', 'duration': duration, 'bpm': BPM,
    'voiceover': False, 'sampleRate': SR,
    'peakDbFS': round(float(20*np.log10(np.max(np.abs(pcm)))), 2),
    'rmsDbFS': round(float(20*np.log10(np.sqrt(np.mean(pcm**2)))), 2),
    'mastering': 'Target -16 LUFS, -1.5 dBTP',
    'style': 'Deep-space drones, modal tension, mono sub, heartbeat, dark sonar, wide filtered reflections',
    'events': sorted(events, key=lambda e: e['time']),
}
(OUT/'abyss-cues.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), 'utf-8')
print(json.dumps({k: v for k, v in report.items() if k != 'events'}, ensure_ascii=False))

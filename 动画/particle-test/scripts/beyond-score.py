"""BEYOND — original 64-second cinematic electronic score, 120 BPM, D minor.
Pure deterministic synthesis. No external music, samples or downloaded assets.
Run: python scripts/beyond-score.py
"""
from pathlib import Path
import json
import wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
DURATION = 64
N = SR * DURATION
RNG = np.random.default_rng(1711)
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'beyond'
OUT.mkdir(parents=True, exist_ok=True)
drums = np.zeros((N, 2), dtype=np.float32)
music = np.zeros((N, 2), dtype=np.float32)
fx = np.zeros((N, 2), dtype=np.float32)

def times(d): return np.arange(round(d*SR)) / SR
def hz(note): return 440 * 2 ** ((note - 69) / 12)
def lp(x, cutoff): return sosfilt(butter(2, cutoff, fs=SR, output='sos'), x)
def hp(x, cutoff): return sosfilt(butter(2, cutoff, 'high', fs=SR, output='sos'), x)
def env(x, attack=.008, release=.03):
    x = x.copy()
    a, r = min(len(x), round(attack*SR)), min(len(x), round(release*SR))
    if a: x[:a] *= np.linspace(0, 1, a)
    if r: x[-r:] *= np.linspace(1, 0, r)
    return x

def put(bus, x, at, gain=1, pan=0):
    start = round(at*SR)
    if start < 0 or start >= N: return
    x = x[:N-start] * gain
    angle = (pan + 1) * np.pi / 4
    bus[start:start+len(x), 0] += x*np.cos(angle)
    bus[start:start+len(x), 1] += x*np.sin(angle)

def kick(big=False):
    t=times(.65)
    f=43 + 110*np.exp(-t/0.025)
    x=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/(.19 if big else .12))
    x+=hp(RNG.normal(0,1,len(t)),2400)*np.exp(-t/.003)*.16
    return env(np.tanh(x*1.5)*.85,.001,.03)

def snare():
    t=times(.3)
    n=hp(lp(RNG.normal(0,1,len(t)),10000),900)
    x=n*np.exp(-t/.058)*.55+np.sin(2*np.pi*185*t)*np.exp(-t/.03)*.35
    # offset clap transients give the backbeat weight and width
    for delay in [.011,.022]:
        tt=np.maximum(0,t-delay)
        x+=n*np.exp(-tt/.013)*(t>=delay)*.17
    return env(x,.001,.04)

def hat(opened=False):
    t=times(.26 if opened else .08)
    x=hp(RNG.normal(0,1,len(t)),7500)*np.exp(-t/(.065 if opened else .018))
    return env(x,.001,.02)

def bass(note, dur=.4):
    t=times(dur)
    phase=hz(note)*t
    saw=2*(phase-np.floor(phase+.5))
    x=.6*np.sin(2*np.pi*phase)+.25*lp(saw,450)
    return env(np.tanh(x*2.3)*np.exp(-t*2.5),.006,.05)

def pluck(note, bright=1):
    t=times(1.6); f=hz(note)
    x=np.sin(2*np.pi*f*t+1.5*np.sin(2*np.pi*f*2.001*t)*np.exp(-t/.09))
    x+=np.sin(2*np.pi*f*2.003*t)*np.exp(-t/.09)*.2
    return env(x*np.exp(-t/(.21+.12*bright)),.003,.05)

def pad(notes, length):
    t=times(length); left=np.zeros(len(t)); right=np.zeros(len(t))
    for note in notes:
        f=hz(note)
        for j, detune in enumerate([-.12,-.045,.04,.115]):
            ph=2*np.pi*f*2**(detune/12)*t + RNG.uniform(0,6.28)
            sig=np.sin(ph)+.24*np.sin(ph*2)+.09*np.sin(ph*3)
            left+=sig*(.13 if j%2==0 else .08)
            right+=sig*(.08 if j%2==0 else .13)
    e=np.minimum(t/1.2,1)*np.minimum((length-t)/1.4,1)
    left=lp(left,2200)*e*(.9+.1*np.sin(t*.8))
    right=lp(right,2100)*e*(.9+.1*np.cos(t*.7))
    return left,right

def boom():
    t=times(3.4);f=30+70*np.exp(-t/.07)
    body=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.65)
    noise=lp(RNG.normal(0,1,len(t)),1600)*np.exp(-t/.35)
    metal=sum(np.sin(2*np.pi*freq*t)*np.exp(-t/.7) for freq in [294,417,631])*.04
    return env(body*.7+noise*.12+metal,.002,.3)

# Eight chapters with exact shared picture/sound boundaries, one chapter per four bars.
sections=[(0,'signal'),(8,'genesis'),(16,'gravity'),(24,'velocity'),(32,'resonance'),(40,'frontier'),(48,'ascent'),(56,'dawn')]
chords=[[50,57,60,64],[46,53,57,60],[53,60,65,69],[48,55,58,64]]
for bar in range(32):
    at=bar*2
    notes=chords[(bar//2)%4]
    l,r=pad(notes,3.2)
    level=.15 if at<8 else .18
    if 32<=at<40 or at>=56: level=.23
    start=round(at*SR);m=min(len(l),N-start)
    music[start:start+m,0]+=l[:m]*level
    music[start:start+m,1]+=r[:m]*level

for beat in range(128):
    at=beat*.5
    section=beat//16
    heavy=section in [2,3,5,6]
    buildup=section==1
    outro=section==7
    if heavy or (buildup and beat%2==0) or (section==0 and beat%8==0) or (outro and beat<120 and beat%4==0):
        put(drums,kick(heavy),at,.69 if heavy else .37)
    if (heavy or buildup) and beat%4 in [1,3]:
        put(drums,snare(),at,.3 if heavy else .15, -.07 if beat%4==1 else .07)
    if heavy or buildup:
        put(drums,hat(),at+.25,.072 if heavy else .038,.3 if beat%2 else -.3)
        if heavy:
            put(drums,hat(beat%4==2),at,.035,.12)
            if section==6:
                put(drums,hat(),at+.375,.027,-.5)
    if heavy or buildup:
        root=chords[((beat//4)//2)%4][0]-24
        pattern=[0,0,7,0,12,0,7,10]
        note=root+pattern[beat%8]
        put(music,bass(note),at,.29 if heavy else .11)
        if heavy and beat%4 in [0,2]: put(music,bass(note,.17),at+.375,.14)

# Evolving sequence: sparse glass in the opening, octave arpeggios on the drops.
pattern=[0,2,1,3,2,1,3,1]
for step in range(256):
    at=step*.25;section=int(at)//8
    if section==0 and step%4: continue
    if section==4 and step%2: continue
    if section==7 and at>61: continue
    chord=chords[(int(at)//4)%4]
    note=chord[pattern[step%8]]+12+(12 if section in [3,6] and step%4==3 else 0)
    gain=.065 if section in [0,4,7] else .1
    pan=np.sin(step*1.73)*.55
    x=pluck(note)
    put(music,x,at,gain,pan)
    put(music,x,at+.375,gain*.27,-pan)
    put(music,x,at+.75,gain*.14,pan)

# Wide, slowly opening high string/synth swells for the latter half.
for at, note in [(40,74),(44,77),(48,81),(52,79),(56,77)]:
    t=times(5.2);x=np.zeros(len(t))
    for detune in [-.09,0,.09]:
        x+=np.sin(2*np.pi*hz(note)*2**(detune/12)*t)*.18
    x=env(x*np.minimum(t/1.4,1),.5,2.)
    put(music,x,at,.19,-.35)
    put(music,x,at+.031,.19,.35)

for at, name in sections[1:]:
    put(fx,boom(),at,.49 if at in [16,40,48] else .27)
    d=1.9;t=times(d);sweep=hp(lp(RNG.normal(0,1,len(t)),8500),500)
    ramp=(t/d)**2
    shimmer=np.sin(2*np.pi*(700*t+1600*t*t))*np.sin(t*27)*.06
    x=env((sweep*.19+shimmer)*ramp,.08,.025)
    put(fx,x,at-d,.4,-.3)
    put(fx,x,at-d+.014,.4,.3)
    t=times(1.7);whoosh=hp(lp(RNG.normal(0,1,len(t)),6500),700)*np.exp(-t/.33)
    put(fx,env(whoosh,.006,.2),at,.1,.4)

# A sixteenth-note snare acceleration, then a clean breath before the first drop.
for i in range(12):
    put(drums,snare(),14+i*.125,.045+i*.008,(-1 if i%2 else 1)*.2)

t=np.arange(N)/SR
beatphase=np.mod(t,.5)
sidechain=1-.36*np.exp(-beatphase/.085)
heavy_mask=((t>=16)&(t<32))|((t>=40)&(t<56))
music*=np.where(heavy_mask,sidechain,1)[:,None]

# Simple deterministic stereo room: delays of the musical bus, no phase-random plugins.
dry=music.copy()
for seconds,gain in [(.1875,.12),(.375,.10),(.5625,.065),(.75,.04)]:
    shift=round(seconds*SR)
    music[shift:,0]+=dry[:-shift,1]*gain
    music[shift:,1]+=dry[:-shift,0]*gain
mix=music+drums+fx
silence=(t>=15.75)&(t<16)
mix[silence]*=0.08
fadein=np.minimum(t/1.4,1)
fadeout=np.clip((64-t)/2.1,0,1)**1.3
mix*= (fadein*fadeout)[:,None]
mix=np.tanh(mix*1.3)
peak=float(np.max(np.abs(mix)))
mix*=.91/max(peak,.01)
pcm=(np.clip(mix,-1,1)*32767).astype('<i2')
with wave.open(str(OUT/'beyond-score.wav'),'wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
report={'title':'BEYOND / 越过永夜','bpm':120,'key':'D minor','duration':64,'sampleRate':SR,'peakDbFS':round(float(20*np.log10(np.max(np.abs(mix)))),2),'rmsDbFS':round(float(20*np.log10(np.sqrt(np.mean(mix**2)))),2),'chapters':[{'time':at,'frame':at*30,'name':name} for at,name in sections],'authorship':'Original deterministic synthesis; no third-party audio.'}
(OUT/'cue-sheet.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))

"""DARK FOREST / groove revision: 144 BPM, 90 seconds, no narration.
Shared rhythm.json drives the musical bars, picture milestones and edit duration.
"""
from pathlib import Path
import json, wave, subprocess
import numpy as np
from scipy.signal import butter,sosfilt

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/dark-forest'
grid=json.loads((ROOT/'src/dark-forest/rhythm.json').read_text(encoding='utf-8'))
BPM=grid['bpm'];BEAT=60/BPM;BAR=BEAT*4;SR=44100
DUR=grid['durationInFrames']/grid['fps'];N=round(DUR*SR)
rng=np.random.default_rng(14490)
music=np.zeros((N,2),np.float32);drums=np.zeros_like(music);fx=np.zeros_like(music)
events=[]
def T(d):return np.arange(round(d*SR))/SR
def hz(n):return 440*2**((n-69)/12)
def low(x,f):return sosfilt(butter(2,f,fs=SR,output='sos'),x)
def high(x,f):return sosfilt(butter(2,f,'high',fs=SR,output='sos'),x)
def fade(x,a=.004,r=.03):
 x=x.copy();na=min(len(x),round(a*SR));nr=min(len(x),round(r*SR))
 if na:x[:na]*=np.linspace(0,1,na)
 if nr:x[-nr:]*=np.linspace(1,0,nr)
 return x
def put(bus,x,at,gain=1,pan=0):
 i=round(at*SR)
 if i<0 or i>=N:return
 x=x[:N-i]*gain;a=(pan+1)*np.pi/4
 bus[i:i+len(x),0]+=x*np.cos(a);bus[i:i+len(x),1]+=x*np.sin(a)
def mark(at,kind,strength=1):events.append({'time':round(at,6),'frame':round(at*30),'kind':kind,'strength':strength})
def kick():
 t=T(.48);freq=45+125*np.exp(-t/.022)
 x=np.sin(2*np.pi*np.cumsum(freq)/SR)*np.exp(-t/.125)
 x+=np.sin(2*np.pi*109*t)*np.exp(-t/.025)*.13
 x+=high(rng.normal(0,1,len(t)),2600)*np.exp(-t/.0018)*.2
 return fade(np.tanh(x*1.8),.0005,.04)
def snare():
 t=T(.22);noise=high(low(rng.normal(0,1,len(t)),10500),1100)
 x=noise*np.exp(-t/.048)*.63+np.sin(2*np.pi*182*t)*np.exp(-t/.028)*.38
 for offset in [.011,.021,.031]:x+=noise*np.exp(-np.maximum(0,t-offset)/.009)*(t>=offset)*.15
 return fade(x,.001,.035)
def hat(opened=False):
 t=T(.19 if opened else .065)
 n=high(rng.normal(0,1,len(t)),7100)
 metallic=sum(np.sign(np.sin(2*np.pi*f*t)) for f in [4170,5310,7130])*.05
 x=(n*.4+metallic)*np.exp(-t/(.053 if opened else .013))
 return fade(x,.001,.02)
def tom():
 t=T(.55);f=72+90*np.exp(-t/.035)
 x=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.13)
 x+=low(rng.normal(0,1,len(t)),3800)*np.exp(-t/.012)*.17
 return fade(x,.001,.08)
def bass(note,duration):
 t=T(duration);f=hz(note);ph=f*t
 saw=2*(ph-np.floor(ph+.5));x=np.sin(2*np.pi*ph)*.65+low(saw,650)*.33
 x+=low(np.sin(2*np.pi*f*2*t),900)*.12
 return fade(np.tanh(x*2.4)*np.exp(-t*3.),.004,.035)
def pluck(note,bright=False):
 t=T(.8);f=hz(note)
 x=np.sin(2*np.pi*f*t+1.7*np.sin(2*np.pi*f*2.01*t)*np.exp(-t/.06))
 x+=np.sin(2*np.pi*f*2*t)*np.exp(-t/.045)*(.25 if bright else .12)
 return fade(x*np.exp(-t/(.12 if bright else .21)),.002,.08)
def pad(notes):
 t=T(BAR*1.5);l=np.zeros(len(t));r=np.zeros(len(t))
 for note in notes:
  for j,detune in enumerate([-.1,.04,.12]):
   ph=2*np.pi*hz(note)*2**(detune/12)*t+rng.uniform(0,6.28)
   sig=np.sin(ph)+np.sin(ph*2)*.17
   l+=sig*(.12 if j%2 else .08);r+=sig*(.08 if j%2 else .12)
 e=np.minimum(t/.24,1)*np.minimum((len(t)/SR-t)/.6,1)
 return low(l,2400)*e,low(r,2300)*e
def impact():
 t=T(1.5);f=31+115*np.exp(-t/.035)
 x=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/.28)
 x+=low(rng.normal(0,1,len(t)),2600)*np.exp(-t/.11)*.16
 return fade(x,.001,.25)
def whoosh(duration=.5):
 t=T(duration);x=high(low(rng.normal(0,1,len(t)),8500),650)
 return fade(x*np.sin(np.pi*t/duration)**2,.015,.015)

chords=[[50,57,60,64],[46,53,57,60],[53,60,65,69],[48,55,58,64]]
chapter_starts=[c['startFrame']/30 for c in grid['chapters']]

for bar in range(round(DUR/BAR)):
 at=bar*BAR;scene=max(i for i,s in enumerate(chapter_starts) if at+1e-6>=s)
 chord=chords[(bar//2)%4]
 if scene>=12:chord=chords[2 if bar%4<2 else 0]
 l,r=pad(chord);i=round(at*SR);m=min(len(l),N-i)
 music[i:i+m,0]+=l[:m]*.12;music[i:i+m,1]+=r[:m]*.12
 active=scene not in [10,13]
 # A syncopated sixteenth-note bass motif against a solid four-on-the-floor kick.
 for j,(offset,interval) in enumerate(zip([0,.75,1.5,2.,2.5,3.5,3.75],[0,0,7,0,12,7,10])):
  if not active and j not in [0,3]:continue
  dur=BEAT*(.4 if j in [1,5,6] else .62)
  put(music,bass(chord[0]-24+interval,dur),at+offset*BEAT,.25 if scene in [5,7,8,9] else .18)
 # The melodic motif starts immediately; octave changes create a second phrase.
 for j in range(8):
  note=chord[[0,2,1,3,2,1,3,1][j]]+12+(12 if scene==7 and j%4==3 else 0)
  if scene in [6,10,11,13] and j%2:continue
  x=pluck(note,scene in [5,7,9]);when=at+j*BEAT*.5;pan=np.sin(j*1.7)*.5
  gain=.073 if scene in [5,7,9] else .05
  put(music,x,when,gain,pan);put(music,x,when+BEAT*.75,gain*.28,-pan)
 for beat in range(4):
  when=at+beat*BEAT
  calm=scene in [10,13]
  if not calm or beat%2==0:
   put(drums,kick(),when,.62 if scene in [1,5,7,8,9] else .48)
   mark(when,'kick',.85)
  if beat%2==1:
   put(drums,snare(),when,.31 if not calm else .18,-.08 if beat==1 else .08);mark(when,'backbeat',.8)
  if not calm:
   put(drums,hat(beat%2==1),when+BEAT*.5,.14,.3 if beat%2 else -.3)
   put(drums,hat(),when,.045,-.15)
   # Small sixteenth-note timing/velocity differences add groove without moving downbeats.
   if scene in [0,1,3,5,7,8,9,12]:
    put(drums,hat(),when+BEAT*.27,.037,.5)
    put(drums,hat(),when+BEAT*.77,.045,-.5)
  if beat==3 and scene in [1,3,5,7,8,9]:
   put(drums,tom(),when+BEAT*.5,.17,-.4);put(drums,tom(),when+BEAT*.75,.13,.4)

# One source of truth for all large picture and sound events.
for scene,c in enumerate(grid['chapters']):
 at=c['startFrame']/30
 if scene:
  put(fx,impact(),at,.26);put(fx,whoosh(BEAT),at-BEAT,.13,-.25);mark(at,'chapter-impact')
 for event in c['events']:
  when=at+event['beat']*BEAT;kind=event['kind'];mark(when,kind)
  if kind=='count':put(drums,tom(),when,.58)
  elif kind=='recursion':
   x=pluck(86,True);put(fx,x,when,.14,-.5);put(fx,x,when+BEAT*.75,.06,.5)
  elif kind=='infinity':put(fx,pluck(93),when,.12)
  elif kind=='ping':put(fx,pluck(88),when,.16,.4 if event['beat']==10 else -.4)
  elif kind=='condition':put(fx,hat(),when,.13)
  elif kind=='launch':put(fx,whoosh(BEAT*1.5),when,.23,-.2)
  elif kind=='impact':put(fx,impact(),when,.67);put(drums,tom(),when,.45)
 if scene==7:
  for beat in np.arange(12,19,.25):
   when=at+beat*BEAT;put(drums,hat(),when,.06+(beat-12)*.006,np.sin(beat));mark(when,'technology-tick',.4)
 if scene==9:
  for k in range(12):
   when=at+(3+k*.5)*BEAT;put(fx,pluck(81+k%3*3,True),when,.055,np.sin(k*2.4));mark(when,'observer',.5)

t=np.arange(N)/SR
side=1-.53*np.exp(-np.mod(t,BEAT)/.065)
music*=side[:,None]
mix=music+drums+fx
impact_time=chapter_starts[8]+12*BEAT
mix[(t>=impact_time-BEAT*.5)&(t<impact_time)]*=.025
silence_time=chapter_starts[10]+6*BEAT
mix[(t>=silence_time)&(t<silence_time+BEAT*.75)]*=.08
mix*= (np.minimum(t/.06,1)*np.clip((DUR-t)/.8,0,1)**1.4)[:,None]
mix=np.tanh(mix*1.25);mix*=.9/float(np.max(np.abs(mix)))
raw=OUT/'groove-premaster.wav';final=OUT/'score-groove.wav'
with wave.open(str(raw),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((mix*32767).astype('<i2').tobytes())
subprocess.run([str(ROOT/'node_modules/ffmpeg-static/ffmpeg.exe'),'-y','-v','error','-i',str(raw),'-af','acompressor=threshold=0.24:ratio=2:attack=20:release=115:makeup=1.15,loudnorm=I=-14:TP=-1.2:LRA=8','-ar',str(SR),str(final)],check=True)
with wave.open(str(final),'rb') as w:pcm=np.frombuffer(w.readframes(w.getnframes()),'<i2').astype(np.float32)/32768
report={'version':'groove-v2','bpm':BPM,'duration':DUR,'voiceover':False,'key':'D minor','sampleRate':SR,'peakDbFS':round(float(20*np.log10(np.max(np.abs(pcm)))),2),'rmsDbFS':round(float(20*np.log10(np.sqrt(np.mean(pcm**2)))),2),'mastering':'Target -14 LUFS, -1.2 dBTP','chapters':grid['chapters'],'events':sorted(events,key=lambda e:e['time'])}
(OUT/'groove-cues.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ['events','chapters']},ensure_ascii=False))

"""Original wordless soundtrack for DARK FOREST. 120 BPM, 144s, 44.1kHz stereo.
Taiko-like membrane drums, sub bass, glass FM notes, stereo synth pads and designed FX.
The score follows the same chapter and diagram-event grid as the Remotion composition.
"""
from pathlib import Path
import json, wave, subprocess
import numpy as np
from scipy.signal import butter, sosfilt

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/dark-forest';OUT.mkdir(parents=True,exist_ok=True)
SR=44100;DUR=144;N=SR*DUR
rng=np.random.default_rng(915)
music=np.zeros((N,2),np.float32);drums=np.zeros_like(music);fx=np.zeros_like(music)
starts=[0,8,18,28,38,48,60,72,84,94,104,112,124,136]
ends=starts[1:]+[144]
names=['signal','forest','survival','resources','encounter','suspicion','latency','technology','strike','broadcast','silence','limits','science','ending']

def T(d):return np.arange(round(d*SR))/SR
def hz(n):return 440*2**((n-69)/12)
def low(x,f):return sosfilt(butter(2,f,fs=SR,output='sos'),x)
def high(x,f):return sosfilt(butter(2,f,'high',fs=SR,output='sos'),x)
def fade(x,a=.006,r=.04):
 x=x.copy();na=min(len(x),round(a*SR));nr=min(len(x),round(r*SR))
 if na:x[:na]*=np.linspace(0,1,na)
 if nr:x[-nr:]*=np.linspace(1,0,nr)
 return x
def put(bus,x,at,gain=1,pan=0):
 i=round(at*SR)
 if i<0 or i>=N:return
 x=x[:N-i]*gain;a=(pan+1)*np.pi/4
 bus[i:i+len(x),0]+=x*np.cos(a);bus[i:i+len(x),1]+=x*np.sin(a)

def drum(big=False):
 t=T(1.3);freq=48+85*np.exp(-t/.028)
 x=np.sin(2*np.pi*np.cumsum(freq)/SR)*np.exp(-t/(.24 if big else .14))
 for f,g,decay in [(111,.2,.12),(173,.12,.08),(231,.08,.05)]:x+=np.sin(2*np.pi*f*t)*g*np.exp(-t/decay)
 x+=low(high(rng.normal(0,1,len(t)),600),5500)*np.exp(-t/.018)*.26
 return fade(np.tanh(x*1.35),.001,.15)
def tick():
 t=T(.07);x=high(rng.normal(0,1,len(t)),4500)*np.exp(-t/.009)*.45
 x+=np.sin(2*np.pi*1800*t)*np.exp(-t/.008)*.2
 return fade(x,.001,.015)
def bell(note):
 t=T(2.6);f=hz(note);x=np.sin(2*np.pi*f*t+1.2*np.sin(2*np.pi*f*2.01*t)*np.exp(-t/.08))
 x+=.2*np.sin(2*np.pi*f*2.76*t)*np.exp(-t/.2)
 return fade(x*np.exp(-t/.48),.005,.2)
def bass(note):
 t=T(.46);ph=hz(note)*t
 x=np.sin(2*np.pi*ph)*.75+low(2*(ph-np.floor(ph+.5)),380)*.2
 return fade(np.tanh(x*1.8)*np.exp(-t*3.2),.012,.05)
def pad(notes,duration=3.3):
 t=T(duration);l=np.zeros(len(t));r=np.zeros(len(t))
 for note in notes:
  for j,detune in enumerate([-.12,-.04,.045,.125]):
   ph=2*np.pi*hz(note)*2**(detune/12)*t+rng.uniform(0,6.28)
   s=np.sin(ph)+.23*np.sin(ph*2)+.075*np.sin(ph*3)
   l+=s*(.07 if j%2 else .12);r+=s*(.12 if j%2 else .07)
 e=np.minimum(t/.9,1)*np.minimum((duration-t)/1.1,1)
 return low(l,1900)*e,low(r,1750)*e
def impact():
 t=T(3.8);freq=27+95*np.exp(-t/.055)
 x=np.sin(2*np.pi*np.cumsum(freq)/SR)*np.exp(-t/.5)*.8
 x+=low(rng.normal(0,1,len(t)),2400)*np.exp(-t/.25)*.17
 x+=sum(np.sin(2*np.pi*f*t)*np.exp(-t/.65)*.025 for f in [146,219,337,587])
 return fade(x,.002,.5)
def whoosh(duration=1.4):
 t=T(duration);n=high(low(rng.normal(0,1,len(t)),7000),600)
 e=np.sin(np.pi*t/duration)**2
 return fade(n*e,.1,.1)

chords=[[50,57,60,64],[46,53,57,60],[53,60,65,69],[48,55,58,64]]
for bar in range(72):
 at=bar*2;chapter=max(i for i,s in enumerate(starts) if at>=s)
 notes=chords[(bar//3)%4]
 if chapter>=12:notes=([53,60,65,69] if bar%4<2 else [50,57,60,64])
 l,r=pad(notes)
 gain=.17 if chapter in [5,7,8,9] else .14
 if chapter==10:gain=.07
 if chapter==13:gain=.18
 start=round(at*SR);m=min(len(l),N-start)
 music[start:start+m,0]+=l[:m]*gain;music[start:start+m,1]+=r[:m]*gain

for i,(start,end) in enumerate(zip(starts,ends)):
 # The drum itself is the recurring narrative object: sparse → counted → recursive.
 for beat in range((end-start)*2):
  at=start+beat*.5
  energetic=i in [3,5,7,8,9]
  if i==6:
   put(drums,tick(),at,.07,(-1 if beat%2 else 1)*.3)
  elif i==10:
   if beat%2==0 and at<110:put(drums,drum(),at,.22*(1-(at-104)/7))
  elif energetic:
   if beat%2==0:put(drums,drum(i in [7,8]),at,.37 if i in [7,8] else .28)
   if beat%4==3:put(drums,drum(),at,.13,-.25)
   put(drums,tick(),at,.04,.3 if beat%2 else -.3)
  elif beat%4==0:put(drums,drum(),at,.19)
  if i in [3,5,7,8,9] and not (i==8 and at>89.5):
   note=chords[(int(at)//6)%4][0]-24
   put(music,bass(note+(7 if beat%8==5 else 0)),at,.19 if i in [7,8] else .12)
  if i in [7] and beat%2==0:
   put(drums,tick(),at+.25,.035,-.4)
 # A slowly evolving melodic motif, left enough space for reading.
 for j in range(int((end-start)*2)):
  at=start+j*.5
  if i in [0,1,2,4,6,10,11,13] and j%4:continue
  if i==10 and at>108:continue
  chord=chords[(int(at)//6)%4];note=chord[[0,2,1,3,2,1,3,1][j%8]]+12
  gain=.065 if i in [5,7,9] else .045
  x=bell(note);pan=np.sin(j*1.31)*.6
  put(music,x,at,gain,pan);put(music,x,at+.375,gain*.24,-pan);put(music,x,at+.75,gain*.1,pan)

# Explicit picture/sound events. All authored on the half-second (15-frame) grid.
events=[]
def event(at,kind,strength):events.append({'time':at,'frame':round(at*30),'kind':kind,'strength':strength})
for i,at in enumerate(starts):
 if at:
  put(fx,impact(),at,.29 if i in [1,5,7,9] else .17)
  put(fx,whoosh(),at-1.4,.10,-.3);put(fx,whoosh(),at-1.4+.015,.10,.3)
  event(at,'chapter-impact',.7)
for at in [4.5,5.5,6.5]:put(drums,drum(),at,.38);event(at,'opening-count',1)
for at in [48.5,50.5,52.5,54.5]:
 put(fx,bell(81),at,.065,-.35);put(fx,bell(74),at+.375,.035,.35);event(at,'suspicion-recursion',.6)
for at in [61.5,65.5,69.5]:put(fx,bell(86 if at!=65.5 else 81),at,.115,.35 if at==65.5 else -.35);event(at,'light-year-ping',.8)
for at in np.arange(79,83.5,.25):put(drums,tick(),float(at),.05+(at-79)*.012,.3*np.sin(at));event(float(at),'technology-tick',.5)
put(fx,whoosh(1.5),89.5,.24,-.4);event(89.5,'beam-launch',1)
put(fx,impact(),91,.72);put(drums,drum(True),91,.35);event(91,'strike-impact',1)
for at in [97,97.5,98,98.5,99,99.5,100,100.5,101]:put(fx,bell(81),at,.034,np.sin(at));event(at,'observer-awakens',.4)

# A measured breath before impact; silence at the end of the equilibrium chapter.
t=np.arange(N)/SR
side=1-.22*np.exp(-np.mod(t,.5)/.08)
music*=side[:,None]
dry=music.copy()
for delay,gain in [(.1875,.1),(.375,.07),(.5625,.04)]:
 shift=round(delay*SR);music[shift:,0]+=dry[:-shift,1]*gain;music[shift:,1]+=dry[:-shift,0]*gain
mix=music+drums+fx
mix[(t>=90.75)&(t<91)]*=.035
mix[(t>=110.5)&(t<111.75)]*=.08
fadein=np.minimum(t/1.3,1);fadeout=np.clip((144-t)/2.8,0,1)**1.4
mix*=(fadein*fadeout)[:,None]
mix=np.tanh(mix*1.4)
mix*=.89/max(.001,float(np.max(np.abs(mix))))
pcm=(np.clip(mix,-1,1)*32767).astype('<i2')
with wave.open(str(OUT/'score.wav'),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
# Raise perceived loudness without letting isolated drum transients dominate the mix.
master=OUT/'score-master.wav'
subprocess.run([str(ROOT/'node_modules/ffmpeg-static/ffmpeg.exe'),'-y','-hide_banner','-i',str(OUT/'score.wav'),'-af','acompressor=threshold=0.16:ratio=2.5:attack=15:release=180:makeup=1.3,loudnorm=I=-16:TP=-1.2:LRA=10:print_format=json','-ar',str(SR),'-ac','2',str(master)],capture_output=True,text=True,check=True)
master.replace(OUT/'score.wav')
with wave.open(str(OUT/'score.wav'),'rb') as w:
 mastered=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(np.float32)/32768
report={'title':'THE DARK FOREST / 黑暗森林','bpm':120,'duration':144,'key':'D minor','voiceover':False,'sampleRate':SR,'peakDbFS':round(float(20*np.log10(np.max(np.abs(mix)))),2),'rmsDbFS':round(float(20*np.log10(np.sqrt(np.mean(mix**2)))),2),'chapters':[{'name':name,'start':s,'end':e,'frame':s*30} for name,s,e in zip(names,starts,ends)],'events':events,'authorship':'Original deterministic synthesis. No third-party music, no narration.'}
report['peakDbFS']=round(float(20*np.log10(np.max(np.abs(mastered)))),2)
report['rmsDbFS']=round(float(20*np.log10(np.sqrt(np.mean(mastered**2)))),2)
report['mastering']='Gentle compression; loudness target -16 LUFS, true peak ceiling -1.2 dBTP.'
(OUT/'cue-sheet.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ['events','chapters']},ensure_ascii=False))

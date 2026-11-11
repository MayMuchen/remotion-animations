from pathlib import Path
import subprocess, json, re
import numpy as np
from scipy.signal import butter, sosfilt, find_peaks
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[1]
p=root/'out/dark-forest/research'
ff=str(root/'node_modules/ffmpeg-static/ffmpeg.exe')
video=str(p/'reference-study.mp4')
sample_times=[0,2,4,6,8,10,13,16,20,25,34,47]
sheet=Image.new('RGB',(1920,1160),(9,11,15));d=ImageDraw.Draw(sheet)
for i,t in enumerate(sample_times):
    file=p/f'study-{t}.jpg'
    subprocess.run([ff,'-y','-v','error','-ss',str(t),'-i',video,'-frames:v','1',str(file)],check=True)
    im=Image.open(file).resize((640,360))
    x=(i%3)*640;y=(i//3)*290
    sheet.paste(im.resize((640,270)),(x,y));d.text((x+12,y+274),f'{t}s',fill=(180,190,200))
sheet.save(p/'opening-study.jpg',quality=94)
raw=subprocess.check_output([ff,'-v','error','-i',video,'-t','90','-f','f32le','-ac','1','-ar','8000','-'])
x=np.frombuffer(raw,dtype='<f4')
low=sosfilt(butter(3,[35,140],btype='band',fs=8000,output='sos'),x)
blocks=low[:len(low)//160*160].reshape(-1,160)
energy=np.sqrt(np.mean(blocks**2,axis=1))
peaks,_=find_peaks(energy,distance=15,prominence=.012)
cut=subprocess.run([ff,'-hide_banner','-i',video,'-t','90','-vf',"select=gt(scene\\,0.24),showinfo",'-an','-f','null','-'],capture_output=True,text=True)
cut_times=[float(v) for v in re.findall(r'pts_time:([\d.]+)',cut.stderr)]
report={'reference':'BV1VyWw6sEAg','durationSeconds':426.504,'sampledTimes':sample_times,'first90sSceneChanges':cut_times,'first90sLowBandOnsets':(peaks*.02).round(2).tolist(),'note':'Low-frequency onsets also contain speech energy; they are not a definitive BPM estimate.'}
(p/'study.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))

import rhythm from './rhythm.json';
export const BPM=rhythm.bpm;
export const BEAT=60/BPM;
export const chapters=rhythm.chapters.map(c=>({...c,start:c.startFrame/rhythm.fps,duration:c.bars*rhythm.framesPerBar/rhythm.fps}));
export const DURATION=rhythm.durationInFrames/rhythm.fps;

// Map diagram milestones onto musical beats; this preserves the meaning of the
// original animations while allowing the edit to accelerate between key events.
export const narrativeTime=(frame:number,scene:number,fps:number)=>{
 const c=chapters[scene],beat=frame/fps/BEAT;
 const points=[{beat:0,time:0},...c.events,{beat:c.bars*4,time:c.sourceDuration}];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];
  if(beat<=b.beat)return a.time+(b.time-a.time)*Math.max(0,(beat-a.beat)/(b.beat-a.beat));
 }
 return c.sourceDuration+(beat-c.bars*4)*BEAT;
};

export const groove=(seconds:number)=>{
 const beat=seconds/BEAT,phase=beat-Math.floor(beat),index=Math.floor(beat+1e-7)%4;
 return {beat,phase,index,kick:Math.exp(-phase*13),snare:index%2===1?Math.exp(-phase*17):0,bar:Math.floor(beat/4)};
};

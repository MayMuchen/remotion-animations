import React from 'react';
import {AbsoluteFill,interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import {BEAT,chapters} from './timing';

const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const fract=(n:number)=>n-Math.floor(n);
const seed=(n:number)=>fract(Math.sin(n*127.1+311.7)*43758.5453);

// Restrained close dust lives behind the lettering. Its depth is visible in the
// parallax and varying focus, with no CSS animation or runtime randomness.
export const ForegroundDust:React.FC<{scene:number}>=({scene})=>{
 const frame=useCurrentFrame();const {fps}=useVideoConfig();
 const seconds=frame/fps+chapters[scene].start;
 if(![0,1,2,7,9,10,13].includes(scene))return null;
 return <svg viewBox="0 0 1920 1080" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
  {Array.from({length:22},(_,i)=>{
   const depth=.3+seed(i+4)*.7;
   const x=fract(seed(i+8)+seconds*(.002+depth*.004))*2200-140;
   const y=fract(seed(i+50)+seconds*.0013*depth)*1080;
   const opacity=(scene===10?.055:.13)*Math.sin(Math.PI*(x+140)/2200)**2;
   return <circle key={i} cx={x} cy={y} r={.6+depth*2.1} fill={i%4===0?'#e6b684':'#b9dcea'} opacity={opacity} style={{filter:`blur(${depth>0.85?1.8:0}px)`}}/>;
  })}
 </svg>;
};

export const EventLight:React.FC<{scene:number}>=({scene})=>{
 const frame=useCurrentFrame();const{fps}=useVideoConfig();const seconds=frame/fps;
 const event=chapters[scene].events.find(e=>seconds>=e.beat*BEAT&&seconds<e.beat*BEAT+.6);
 if(!event)return null;
 const age=seconds-event.beat*BEAT;
 const hit=Math.exp(-age*9);
 const strong=event.kind==='impact';
 const blue=['ping','recursion','count'].includes(event.kind);
 const color=blue?'96,179,231':'246,172,87';
 const left=scene===8?'74.5%':scene===6?(event.beat===10?'74.5%':'25.5%'):'50%';
 return <AbsoluteFill style={{pointerEvents:'none',mixBlendMode:'screen',background:`radial-gradient(ellipse at ${left} 55%,rgba(${color},${hit*(strong?.28:.065)}),transparent ${strong?'65%':'36%'})`}}/>;
};

// Optical sweeps straddle the existing edit points; they never move the music
// or chapter boundaries. The central words stay readable during the transition.
export const EditLight:React.FC=()=>{
 const frame=useCurrentFrame();const {fps}=useVideoConfig();const seconds=frame/fps;
 const next=chapters.find(c=>c.start>0&&Math.abs(seconds-c.start)<.24);
 if(!next)return null;
 const local=seconds-next.start;
 const p=interpolate(local,[-.24,.24],[0,1],clamp);
 const alpha=Math.sin(p*Math.PI)**2;
 const amber=['strike','broadcast','technology'].includes(next.id);
 const color=amber?'234,155,77':'103,173,220';
 return <AbsoluteFill style={{pointerEvents:'none',mixBlendMode:'screen',opacity:alpha*.2,background:`linear-gradient(112deg,transparent ${p*130-35}%,rgba(${color},.5) ${p*130-19}%,rgba(${color},.95) ${p*130-17}%,transparent ${p*130-13}%)`}}/>;
};

// The two existing six-frame scene overlaps now crossfade the entire scene,
// including its diagrams. Text exits before the next title becomes visible.
export const SceneEnvelope:React.FC<{children:React.ReactNode;scene:number}>=({children,scene})=>{
 const frame=useCurrentFrame();const{fps}=useVideoConfig();
 const seconds=frame/fps;
 const age=scene===8?seconds-12*BEAT:-1;
 const recoil=age>=0?Math.exp(-age*13):0;
 return <AbsoluteFill style={{opacity:interpolate(seconds,[0,.16],[0,1],clamp),scale:1+recoil*.012,translate:`${Math.sin(age*75)*recoil*7}px ${Math.cos(age*57)*recoil*3}px`}}>{children}</AbsoluteFill>;
};

export const TypeEnvelope:React.FC<{children:React.ReactNode;scene:number}>=({children,scene})=>{
 const frame=useCurrentFrame();const{fps}=useVideoConfig();
 const duration=chapters[scene].duration;
 return <AbsoluteFill style={{opacity:scene===13?1:interpolate(frame/fps,[duration-.16,duration],[1,0],clamp)}}>{children}</AbsoluteFill>;
};

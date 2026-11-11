import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, Sequence, interpolate, Easing, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {fragment, vertex} from './shaders';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(.16, 1, .3, 1);
const labels = ['THE FIRST SIGNAL', 'MATTER IN MOTION', 'EVENT HORIZON', 'BREAK THE LIMIT', 'A NEW ORDER', 'UNCHARTED WORLDS', 'CIVILIZATION RISING', 'BEYOND THE NIGHT'];

type GLState = {gl: WebGLRenderingContext; program: WebGLProgram; buffer: WebGLBuffer; uniforms: Record<string, WebGLUniformLocation | null>};

const World: React.FC<{scene: number}> = ({scene}) => {
 const frame = useCurrentFrame();
 const {fps} = useVideoConfig();
 const ref = useRef<HTMLCanvasElement>(null);
 const state = useRef<GLState | null>(null);
 const [error, setError] = useState('');
 useLayoutEffect(() => {
  const canvas = ref.current!;
  const gl = canvas.getContext('webgl', {alpha: false, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
  if (!gl) {setError('WebGL unavailable — please enable browser hardware acceleration.'); return;}
  const compile = (type: number, source: string) => {
   const shader = gl.createShader(type)!; gl.shaderSource(shader, source); gl.compileShader(shader);
   if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Shader compile failed');
   return shader;
  };
  try {
   const vs=compile(gl.VERTEX_SHADER,vertex), fs=compile(gl.FRAGMENT_SHADER,fragment);
   const program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
   gl.deleteShader(vs);gl.deleteShader(fs);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Shader link failed');
   gl.useProgram(program);const buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const loc=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
   const uniforms: GLState['uniforms']={};
   for(const name of ['uTime','uProgress','uPulse','uEnergy','uScene','uResolution']) uniforms[name]=gl.getUniformLocation(program,name);
   state.current={gl,program,buffer,uniforms};
  } catch(e) {setError(String(e));}
  return () => {if(state.current){gl.deleteBuffer(state.current.buffer);gl.deleteProgram(state.current.program);state.current=null;} gl.getExtension('WEBGL_lose_context')?.loseContext();};
 },[]);
 useLayoutEffect(() => {
  const s=state.current;if(!s)return;
  const {gl,program,buffer,uniforms:u}=s;
  const time=frame/fps, globalTime=scene*8+time;
  const beat=globalTime*2;
  gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  const loc=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  gl.viewport(0,0,1440,810);
  gl.uniform2f(u.uResolution,1440,810);gl.uniform1f(u.uTime,time);
  gl.uniform1f(u.uProgress,Math.min(1,time/8));
  gl.uniform1f(u.uPulse,Math.exp(-(beat%1)*8));
  gl.uniform1f(u.uEnergy,scene===2||scene===3||scene===6?1:.35);
  gl.uniform1i(u.uScene,scene);gl.drawArrays(gl.TRIANGLES,0,6);gl.finish();
 },[frame,fps,scene]);
 return <><canvas ref={ref} width={1440} height={810} style={{width:'100%',height:'100%',display:'block'}}/>{error?<AbsoluteFill style={{color:'white',background:'#150d11',padding:100,fontSize:32}}>{error}</AbsoluteFill>:null}</>;
};

const Scene: React.FC<{scene:number}> = ({scene}) => {
 const frame=useCurrentFrame();const {fps}=useVideoConfig();
 const entry=interpolate(frame,[0,fps*.6],[0,1],{...clamp,easing:Easing.bezier(.18,.75,.2,1)});
 const departure=interpolate(frame,[fps*7.55,fps*8.6],[0,1],{...clamp,easing:Easing.in(Easing.cubic)});
 const iris=scene===2||scene===7;
 const whip=scene===3||scene===6;
 const zoom=scene===2?1+departure*2.4:1+departure*.15;
 return <AbsoluteFill style={{
  opacity:scene===0?interpolate(frame,[0,fps*.6],[0,1],clamp):iris?1:interpolate(frame,[0,fps*.4],[0,1],{...clamp,easing:Easing.inOut(Easing.cubic)}),
  clipPath:iris?`circle(${entry*150}% at 53% 48%)`:scene===5?`inset(0 ${(1-entry)*100}% 0 0)`:undefined,
  filter:`blur(${(scene===0?0:(1-entry)*(whip?16:6))+departure*(scene===2?12:4)}px)`,
  scale:(scene===0?1:1+(1-entry)*(whip?.5:.08))*zoom,
  rotate:scene===3?`${(1-entry)*-9}deg`:undefined,
 }}><World scene={scene}/></AbsoluteFill>;
};

const ChapterType: React.FC<{scene:number;kicker:string;title:string;sub:string;side?:'left'|'right'}> = ({scene,kicker,title,sub,side='left'}) => {
 const frame=useCurrentFrame();const {fps}=useVideoConfig();
 const entry=interpolate(frame,[fps*.8,fps*1.65],[0,1],{...clamp,easing:ease});
 const leave=interpolate(frame,[fps*6.4,fps*7.35],[1,0],clamp);
 return <AbsoluteFill style={{justifyContent:'flex-end',alignItems:side==='left'?'flex-start':'flex-end',padding:'0 140px 154px',opacity:leave,textAlign:side, color:'#efeee8'}}>
  <div style={{opacity:entry,translate:`0 ${(1-entry)*24}px`,fontSize:19,letterSpacing:6,color:scene===2?'#dfa45e':'#a6c5ce',marginBottom:25,fontWeight:500}}>{kicker}</div>
  <div style={{overflow:'hidden',paddingBottom:12}}><div style={{translate:`0 ${(1-entry)*115}%`,fontSize:scene===6?94:106,letterSpacing:12,fontWeight:300,lineHeight:1.15,textShadow:'0 2px 40px #0008'}}>{title}</div></div>
  <div style={{opacity:entry*.85,translate:`0 ${(1-entry)*20}px`,fontSize:24,letterSpacing:4,marginTop:20,fontWeight:300}}>{sub}</div>
 </AbsoluteFill>;
};

const Intro:React.FC=()=>{
 const f=useCurrentFrame();const{fps}=useVideoConfig();
 const enter=interpolate(f,[fps*.7,fps*2.6],[0,1],{...clamp,easing:ease});
 const leave=interpolate(f,[fps*6.3,fps*7.4],[1,0],clamp);
 return <AbsoluteFill style={{color:'#e8eff0',padding:'200px 142px',justifyContent:'center',opacity:leave}}>
  <div style={{fontSize:18,letterSpacing:8,opacity:enter*.7,marginBottom:32}}>AN AUDIOVISUAL ODYSSEY</div>
  <div style={{fontSize:124,fontWeight:300,letterSpacing:26,lineHeight:1.15,opacity:enter,filter:`blur(${(1-enter)*12}px)`,translate:`0 ${(1-enter)*30}px`}}>越过永夜</div>
  <div style={{fontSize:28,fontWeight:300,letterSpacing:14,marginTop:28,opacity:enter*.8}}>B E Y O N D</div>
  <div style={{width:interpolate(f,[fps*2,fps*4.5],[0,185],{...clamp,easing:ease}),height:1,background:'#a6c7d6',marginTop:48,opacity:.5}}/>
 </AbsoluteFill>;
};

const Finale:React.FC=()=>{
 const f=useCurrentFrame();const{fps}=useVideoConfig();
 const enter=interpolate(f,[fps*.8,fps*2.4],[0,1],{...clamp,easing:ease});
 return <AbsoluteFill style={{alignItems:'center',justifyContent:'center',color:'#f2f2e9',paddingBottom:95}}>
  <div style={{fontSize:20,letterSpacing:9,opacity:enter*.8,marginBottom:30}}>穿过未知，成为光。</div>
  <div style={{fontSize:190,fontWeight:300,letterSpacing:interpolate(f,[fps*.8,fps*5],[35,50],clamp),lineHeight:1,opacity:enter,filter:`blur(${(1-enter)*14}px)`,textShadow:'0 2px 50px #0005',paddingLeft:40}}>BEYOND</div>
  <div style={{marginTop:40,fontSize:27,letterSpacing:15,opacity:enter*.9}}>越 过 永 夜</div>
  <div style={{position:'absolute',bottom:148,fontSize:15,letterSpacing:5,opacity:interpolate(f,[fps*3.5,fps*5],[0,.6],clamp)}}>THE DARK IS ONLY THE BEGINNING</div>
 </AbsoluteFill>;
};

const FilmFinish:React.FC=()=>{
 const f=useCurrentFrame();const{fps,durationInFrames}=useVideoConfig();
 const seconds=f/fps;const scene=Math.min(7,Math.floor(seconds/8));
 const cut=seconds%8;
 const sweep=scene>0?interpolate(cut,[0,.18,.7],[.035,.075,0],clamp):0;
 const pre=Math.floor(seconds/8)<7?interpolate(cut,[7.6,7.86,7.99],[0,.035,0],clamp):0;
 const fade=interpolate(f,[durationInFrames-fps*1.1,durationInFrames-1],[0,1],clamp);
 return <AbsoluteFill style={{pointerEvents:'none'}}>
  <AbsoluteFill style={{background:`radial-gradient(ellipse at 50% 45%,transparent 35%,rgba(0,0,0,.4) 100%)`}}/>
  <div style={{position:'absolute',top:0,left:0,right:0,height:76,background:'#030508'}}/>
  <div style={{position:'absolute',bottom:0,left:0,right:0,height:76,background:'#030508'}}/>
  <div style={{position:'absolute',left:140,top:105,color:'#d0dde0',opacity:.52,fontSize:13,letterSpacing:4,fontWeight:500}}>B / Y N D</div>
  <div style={{position:'absolute',right:140,top:105,color:'#d0dde0',opacity:.42,fontSize:12,letterSpacing:3}}>A JOURNEY THROUGH THE UNKNOWN</div>
  <div style={{position:'absolute',bottom:105,left:140,color:'#d0dde0',opacity:.5,fontSize:12,letterSpacing:3}}>{String(scene+1).padStart(2,'0')} / 08 <span style={{marginLeft:25}}>{labels[scene]}</span></div>
  <div style={{position:'absolute',bottom:109,right:140,display:'flex',gap:6,alignItems:'center'}}>{Array.from({length:24},(_,i)=><div key={i} style={{width:2,height:3+Math.pow(Math.max(0,Math.sin(seconds*6.283+i*.73)),2)*(8+Math.sin(i*.4)*5),background:'#b3d1da',opacity:.2+.3*Math.sin(i*.8)**2}}/>)}</div>
  {sweep+pre>0?<AbsoluteFill style={{background:scene===2||scene===5?'#ffc16b':'#b9dfff',mixBlendMode:'screen',opacity:sweep+pre}}/>:null}
  {scene>0&&cut<.8?<div style={{position:'absolute',inset:0,background:`linear-gradient(105deg,transparent 34%,rgba(185,222,255,${(1-cut/.8)*.15}) 49%,transparent 64%)`,translate:`${(cut/.8-.4)*160}% 0`,mixBlendMode:'screen'}}/>:null}
  <AbsoluteFill style={{background:'#030508',opacity:fade}}/>
 </AbsoluteFill>;
};

export const Beyond:React.FC=()=>{
 const{fps}=useVideoConfig();
 return <AbsoluteFill style={{background:'#030508',fontFamily:'"Segoe UI", "Microsoft YaHei", sans-serif',overflow:'hidden'}}>
  <Sequence name="01 · 微光 / Eclipse" durationInFrames={8.6*fps}><Scene scene={0}/></Sequence>
  <Sequence name="02 · 星云 / Matter" from={8*fps} durationInFrames={8.6*fps}><Scene scene={1}/></Sequence>
  <Sequence name="03 · 黑洞 / Event horizon" from={16*fps} durationInFrames={8.6*fps}><Scene scene={2}/></Sequence>
  <Sequence name="04 · 穿越 / Hyperspace" from={24*fps} durationInFrames={8.6*fps}><Scene scene={3}/></Sequence>
  <Sequence name="05 · 秩序 / Interlocked light" from={32*fps} durationInFrames={8.6*fps}><Scene scene={4}/></Sequence>
  <Sequence name="06 · 异星 / Uncharted" from={40*fps} durationInFrames={8.6*fps}><Scene scene={5}/></Sequence>
  <Sequence name="07 · 文明 / Megastructure" from={48*fps} durationInFrames={8.6*fps}><Scene scene={6}/></Sequence>
  <Sequence name="08 · 曙光 / Planetary dawn" from={56*fps} durationInFrames={8*fps}><Scene scene={7}/></Sequence>
  <Sequence name="片名 / 越过永夜" durationInFrames={8*fps}><Intro/></Sequence>
  <Sequence name="物质诞生" from={8*fps} durationInFrames={8*fps}><ChapterType scene={1} kicker="01 — GENESIS" title="万物，始于涌动。" sub="EVERYTHING BEGINS IN MOTION"/></Sequence>
  <Sequence name="进入视界" from={16*fps} durationInFrames={8*fps}><ChapterType scene={2} kicker="02 — GRAVITY" title="向不可知，靠近。" sub="AT THE EDGE OF EVERYTHING"/></Sequence>
  <Sequence name="突破" from={24*fps} durationInFrames={8*fps}><ChapterType scene={3} kicker="03 — VELOCITY" title="打破边界。" sub="THROUGH SPACE. BEYOND TIME." side="right"/></Sequence>
  <Sequence name="新的秩序" from={32*fps} durationInFrames={8*fps}><ChapterType scene={4} kicker="04 — RESONANCE" title="混沌，自有回响。" sub="ORDER EMERGES FROM THE UNKNOWN"/></Sequence>
  <Sequence name="异星远征" from={40*fps} durationInFrames={8*fps}><ChapterType scene={5} kicker="05 — FRONTIER" title="远方，仍有远方。" sub="WORLDS WAITING TO BE FOUND"/></Sequence>
  <Sequence name="文明之光" from={48*fps} durationInFrames={8*fps}><ChapterType scene={6} kicker="06 — ASCENT" title="让想象，成为世界。" sub="WE BUILD WHAT WE DARE TO DREAM"/></Sequence>
  <Sequence name="终章 / BEYOND" from={56*fps} durationInFrames={8*fps}><Finale/></Sequence>
  <Audio src={staticFile('beyond/beyond-score.wav')}/>
  <FilmFinish/>
 </AbsoluteFill>;
};

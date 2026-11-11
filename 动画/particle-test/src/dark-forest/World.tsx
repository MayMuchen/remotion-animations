import React,{useLayoutEffect,useRef,useState} from 'react';
import {AbsoluteFill,interpolate,useCurrentFrame,useVideoConfig,Easing} from 'remotion';
import {fragment,vertex} from './shaders';
import {groove,narrativeTime,chapters} from './timing';

type Engine={gl:WebGLRenderingContext;program:WebGLProgram;buffer:WebGLBuffer;uniforms:Record<string,WebGLUniformLocation|null>};

export const World:React.FC<{scene:number;start:number;duration:number}>=({scene,start,duration})=>{
 const frame=useCurrentFrame();const{fps,width,height}=useVideoConfig();
 const canvas=useRef<HTMLCanvasElement>(null);const engine=useRef<Engine|null>(null);const[error,setError]=useState('');
 useLayoutEffect(()=>{
  const gl=canvas.current!.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  if(!gl){setError('WebGL unavailable');return;}
  try{
   const compile=(kind:number,source:string)=>{const s=gl.createShader(kind)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Shader compilation');return s;};
   const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram()!;
   gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Shader link');
   gl.useProgram(program);const buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const a=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
   const uniforms:Engine['uniforms']={};for(const n of ['uResolution','uTime','uClock','uProgress','uPulse','uScene','uEnergy'])uniforms[n]=gl.getUniformLocation(program,n);
   engine.current={gl,program,buffer,uniforms};
  }catch(e){setError(String(e));}
  return()=>{if(engine.current){gl.deleteProgram(engine.current.program);gl.deleteBuffer(engine.current.buffer);engine.current=null;}gl.getExtension('WEBGL_lose_context')?.loseContext();};
 },[]);
 useLayoutEffect(()=>{
  const s=engine.current;if(!s)return;const{gl,program,buffer,uniforms:u}=s;
  gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const a=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.viewport(0,0,width,height);
  const time=narrativeTime(frame,scene,fps);gl.uniform2f(u.uResolution,width,height);gl.uniform1f(u.uTime,time);gl.uniform1f(u.uClock,frame/fps+start);gl.uniform1f(u.uProgress,time/chapters[scene].sourceDuration);gl.uniform1f(u.uPulse,groove(frame/fps+start).kick);gl.uniform1i(u.uScene,scene);gl.uniform1f(u.uEnergy,1);gl.drawArrays(gl.TRIANGLES,0,6);gl.finish();
 },[frame,fps,scene,start,duration,width,height]);
 const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
 const entrance=interpolate(frame,[0,fps*.16],[0,1],{...clamp,easing:Easing.bezier(.16,1,.3,1)});
 const exit=interpolate(frame,[(duration-.16)*fps,(duration+.18)*fps],[0,1],clamp);
 const g=groove(frame/fps+start),progress=Math.min(1,frame/fps/duration);
 const hero=[0,1,7,9,13].includes(scene);
 // A continuous dolly keeps the universe alive between beats. Planet/diagram
 // alignment stays fixed in explanatory shots; only hero shots drift laterally.
 const shot=hero?1.025+progress*.055:1;
 return <AbsoluteFill style={{filter:`blur(${(1-entrance)*6+exit*5}px)`,scale:shot+(1-entrance)*.075+exit*.05+g.kick*(hero?.009:.003),translate:`${hero?Math.sin(progress*1.8+scene)*8:0}px ${hero?Math.sin(progress*1.3)*4:0}px`}}>
  <canvas ref={canvas} width={width} height={height} style={{width:'100%',height:'100%'}}/>
  {error?<AbsoluteFill style={{background:'#180c12',color:'#fff',fontSize:30,padding:100}}>{error}</AbsoluteFill>:null}
 </AbsoluteFill>;
};

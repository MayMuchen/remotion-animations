import React from 'react';
import {interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import {narrativeTime,groove,chapters} from './timing';

const cyan='#79c9e5',gold='#e5b06d',white='#e5ebeb',muted='#748c99';
const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const baseFont='"Segoe UI", "Microsoft YaHei", sans-serif';
const Label:React.FC<{x:number;y:number;children:React.ReactNode;size?:number;color?:string;anchor?:'middle'|'start'|'end'}>=({x,y,children,size=30,color=white,anchor='middle'})=><text x={x} y={y} fill={color} fontFamily={baseFont} fontSize={size} textAnchor={anchor} letterSpacing={3}>{children}</text>;

const Binary:React.FC<{time:number;communication?:boolean;pulse?:number}>=({time,communication=false,pulse=0})=>{
 const p=interpolate(time,[1.5,5.5,9.5],[0,1,0],clamp);
 const y=590;
 return <>
  <Label x={490} y={385} size={30} color={cyan}>文明 A</Label><Label x={1430} y={385} size={30} color={gold}>文明 B</Label>
  <line x1={700} y1={y} x2={1220} y2={y} stroke={muted} strokeOpacity={.5} strokeDasharray="3 12"/>
  {!communication?<>
   <Label x={960} y={575} size={128} color={gold}>?</Label>
   <Label x={960} y={650} size={27} color={muted}>意图不可直接观测</Label>
  </>:<>
   <Label x={960} y={445} size={76}>10 光年</Label>
   {time>=1.5&&time<=9.5?Array.from({length:8},(_,i)=>{
    const trail=Math.max(0,Math.min(1,p+(time<5.5?-1:1)*i*.018));
    return <circle key={i} cx={700+trail*520} cy={y} r={7-i*.6} fill={time<5.5?cyan:gold} opacity={Math.exp(-i*.4)}/>;
   }):null}
   {[1.5,5.5,9.5].map((at,i)=>{
    const age=time-at;if(age<0||age>1)return null;
    return <circle key={at} cx={i===1?1220:700} cy={y} r={12+age*62} fill="none" stroke={i===1?gold:cyan} strokeWidth={2} opacity={(1-age)*.7}/>;
   })}
   <g transform={`translate(960 660) scale(${1+pulse*.045}) translate(-960 -660)`}><Label x={960} y={690} size={80} color={gold}>{Math.min(20,Math.floor(Math.max(0,time-1.5)*2.5)).toString().padStart(2,'0')} 年</Label></g>
   <Label x={960} y={745} size={25} color={muted}>{time<5.5?'去程：10 年':'回程：再等 10 年'}</Label>
  </>}
 </>;
};

const Suspicion:React.FC<{time:number}>=({time})=>{
 const depth=Math.min(4,Math.floor(Math.max(0,time-.5)/2+1e-7)+1);
 const age=time-(time>=8?8:.5+(depth-1)*2);
 const pop=age>=0?1+.13*Math.exp(-age*12):1;
 return <>
  {[0,1,2,3].map(i=>{
   const alpha=interpolate(time,[i*2+.5,i*2+1.],[0,1],clamp);
   const height=80+i*43;
   const p=interpolate(time,[i*2+.5,i*2+1.4],[0,1],clamp),q=1-p;
   const dotX=q*q*q*550+3*q*q*p*720+3*q*p*p*1200+p*p*p*1370;
   const dotY=q*q*q*580+3*q*q*p*(580-height*2)+3*q*p*p*(580-height*2)+p*p*p*580;
   return <g key={i} opacity={alpha*(1-i*.12)}>
    <path d={`M 550 580 C 720 ${580-height*2} 1200 ${580-height*2} 1370 580`} pathLength={1} stroke={i%2?gold:cyan} strokeWidth={1.8} fill="none" strokeDasharray="1" strokeDashoffset={1-p}/>
    <path d={`M 1370 590 C 1200 ${590+height*1.25} 720 ${590+height*1.25} 550 590`} stroke={i%2?cyan:gold} strokeWidth={1} fill="none" opacity={.5}/>
    {p>0&&p<1?<><circle cx={dotX} cy={dotY} r={16} fill={i%2?gold:cyan} opacity={.12}/><circle cx={dotX} cy={dotY} r={5} fill="#e8f5ff"/></>:null}
   </g>;
  })}
  <circle cx={550} cy={580} r={54} fill="#07131d" stroke={cyan} strokeWidth={2}/><circle cx={1370} cy={580} r={54} fill="#19140e" stroke={gold} strokeWidth={2}/>
  <Label x={550} y={598} size={48} color={cyan}>A</Label><Label x={1370} y={598} size={48} color={gold}>B</Label>
  <Label x={960} y={557} size={26} color={muted}>猜 疑 层 数</Label>
  <g transform={`translate(960 620) scale(${pop}) translate(-960 -620)`}><Label x={960} y={655} size={102} color={white}>{time>=8?'∞':String(depth).padStart(2,'0')}</Label></g>
 </>;
};

const Growth:React.FC<{time:number}>=({time})=>{
 const p=interpolate(time,[1,9],[0,1],clamp);
 const path=(explosive:boolean)=>Array.from({length:81},(_,i)=>{
  const x=i/80*p;const value=explosive?Math.pow(x,5):.12+x*.25;
  return `${i?'L':'M'}${300+x*900},${735-value*340}`;
 }).join(' ');
 return <>
  {[0,1,2,3].map(i=><line key={i} x1={300} x2={1200} y1={735-i*95} y2={735-i*95} stroke={muted} strokeOpacity={.12}/>)}
  <path d="M300 375 V735 H1230" stroke={muted} strokeWidth={1.3} fill="none"/>
  <Label x={300} y={388} size={23} color={muted} anchor="start">技术能力（示意）</Label>
  <Label x={1220} y={778} size={25} color={muted} anchor="end">时间（示意）</Label>
  <path d={path(false)} stroke={cyan} strokeWidth={3} fill="none"/>
  <path d={path(true)} stroke={gold} strokeWidth={4} fill="none"/>
  <path d={path(true)} stroke={gold} strokeWidth={13} strokeOpacity={.12} fill="none"/>
  <circle cx={300+p*900} cy={735-Math.pow(p,5)*340} r={16} fill={gold} opacity={.15}/>
  <circle cx={300+p*900} cy={735-Math.pow(p,5)*340} r={6} fill={gold}/>
  <Label x={1475} y={817} size={30} color={gold}>技术跃迁</Label>
  <Label x={370} y={794} size={24} color={muted}>今天</Label>
  <Label x={1100} y={388} size={27} color={gold}>下一次相遇？</Label>
 </>;
};

const Conditions:React.FC<{time:number}>=({time})=><>
 {[{x:420,text:'能发现',sub:'DETECTION'},{x:960,text:'能定位',sub:'LOCALIZATION'},{x:1500,text:'能打击',sub:'REACH'}].map((item,i)=>{
  const show=interpolate(time,[.8+i*1.5,1.4+i*1.5],[0,1],clamp);
  return <g key={item.text} opacity={show}>
   <circle cx={item.x} cy={525} r={66} fill="none" stroke={i===2?gold:cyan} strokeWidth={1.4} strokeDasharray={i===0?'3 9':undefined}/>
   {i===0?<><circle cx={item.x} cy={525} r={34} fill="none" stroke={cyan}/><line x1={item.x} y1={525} x2={item.x+Math.cos(time)*66} y2={525+Math.sin(time)*66} stroke={cyan}/></>:i===1?<><path d={`M${item.x-85} 500 V470 H${item.x-55} M${item.x+85} 500 V470 H${item.x+55} M${item.x-85} 550 V580 H${item.x-55} M${item.x+85} 550 V580 H${item.x+55}`} stroke={cyan} fill="none"/><circle cx={item.x} cy={525} r={6} fill={cyan}/></>:<path d={`M${item.x-35} 550 L${item.x+35} 500 M${item.x+8} 500 H${item.x+35} V527`} stroke={gold} strokeWidth={3} fill="none"/>}
   <Label x={item.x} y={670} size={57}>{item.text}</Label><Label x={item.x} y={720} size={22} color={muted}>{item.sub}</Label>
   <Label x={item.x} y={390} size={20} color={muted}>条件 0{i+1}</Label>
  </g>;
 })}
 <Label x={690} y={550} size={50} color={muted}>∧</Label><Label x={1230} y={550} size={50} color={muted}>∧</Label>
</>;

const Telescope:React.FC<{time:number}>=({time})=><>
 <defs><linearGradient id="dish-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#617f91"/><stop offset=".42" stopColor="#142632"/><stop offset=".7" stopColor="#355468"/><stop offset="1" stopColor="#101922"/></linearGradient></defs>
 <g transform={`translate(0 ${Math.sin(time*.2)*2})`}>
  <path d="M490 766 L615 551 L741 766 M580 766 L615 640 L675 766" stroke="#273d4d" strokeWidth={16} fill="none"/>
  <path d="M450 770 H780" stroke="#405b6a" strokeWidth={7}/>
  <g transform="rotate(-25 610 530)">
   <path d="M390 515 Q610 805 830 515 Q610 620 390 515" fill="url(#dish-metal)" stroke="#7a9faf" strokeWidth={1.5}/>
   <ellipse cx={610} cy={515} rx={220} ry={68} fill="#101f2c" stroke="#7a9faf" strokeWidth={2}/>
   {[-140,-70,0,70,140].map((x,i)=><path key={i} d={`M${610+x} ${515-Math.sqrt(1-(x/220)**2)*68} Q610 655 ${610+x} ${515+Math.sqrt(1-(x/220)**2)*68}`} fill="none" stroke="#365464" strokeWidth={1}/>)}
   <path d="M400 520 L610 400 L820 520 M610 400 L610 540" fill="none" stroke="#91a9b4" strokeWidth={3}/>
   <circle cx={610} cy={400} r={8} fill={gold}/>
  </g>
 </g>
 <Label x={1390} y={510} size={60} color={white}>未确认</Label><Label x={1390} y={615} size={92} color={gold}>≠</Label><Label x={1390} y={705} size={60} color={white}>不存在</Label>
</>;

export const Diagrams:React.FC<{scene:number}>=({scene})=>{
 const f=useCurrentFrame();const{fps}=useVideoConfig();const t=narrativeTime(f,scene,fps);
 const pulse=groove(f/fps+chapters[scene].start).kick;
 const opacity=interpolate(f,[2,7],[0,1],clamp);
 return <svg viewBox="0 0 1920 1080" style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity}}>
  {scene===0?<>
   <Label x={155} y={600} size={150} color={gold} anchor="start">你好。</Label>
   <Label x={165} y={675} size={24} color={muted} anchor="start">TRANSMISSION / 001</Label>
   {t>=4.5?<g>
    <circle cx={1690} cy={735} r={63} stroke={gold} strokeOpacity={.2} fill="#050b12aa"/>
    <circle cx={1690} cy={735} r={63} pathLength={1} stroke={gold} strokeWidth={2.5} fill="none" strokeDasharray="1" strokeDashoffset={Math.min(1,(t-4.5)/3)} transform="rotate(-90 1690 735)"/>
    <g transform={`translate(1690 735) scale(${1+pulse*.12}) translate(-1690 -735)`}><Label x={1690} y={758} size={62} color={gold}>{String(Math.max(1,3-Math.floor(t-4.5))).padStart(2,'0')}</Label></g>
   </g>:null}
  </>:null}
  {scene===2?<><Label x={960} y={605} size={126}>生 存</Label><Label x={960} y={730} size={26} color={cyan}>文明的第一需要</Label></>:null}
  {scene===3?<><Label x={345} y={545} size={50} color={gold}>文明 ↑</Label><Label x={345} y={608} size={24} color={muted}>持续增长与扩张</Label><Label x={1575} y={545} size={50} color={cyan}>物质 =</Label><Label x={1575} y={608} size={24} color={muted}>模型中总量不变</Label></>:null}
  {scene===4?<Binary time={t}/>:null}
  {scene===5?<Suspicion time={t}/>:null}
  {scene===6?<Binary time={t} communication pulse={pulse}/>:null}
  {scene===7?<Growth time={t}/>:null}
  {scene===8?<><Label x={490} y={410} size={28} color={cyan}>潜在决策者</Label><Label x={1430} y={410} size={28} color={gold}>潜在威胁</Label>{t>7.2?<Label x={960} y={720} size={30} color={gold}>仅为极端模型中的策略推演</Label>:null}</>:null}
  {scene===9?<Label x={960} y={770} size={26} color={muted}>信号抵达，也可能意味着坐标暴露。</Label>:null}
  {scene===11?<Conditions time={t}/>:null}
  {scene===12?<Telescope time={t}/>:null}
 </svg>;
};

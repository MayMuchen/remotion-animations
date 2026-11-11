import React from 'react';
import {AbsoluteFill,Sequence,staticFile,useCurrentFrame,useVideoConfig,interpolate,Easing} from 'remotion';
import {Audio} from '@remotion/media';
import {World} from './World';
import {Diagrams} from './Diagrams';
import {EditLight,EventLight,ForegroundDust,SceneEnvelope,TypeEnvelope} from './Details';
import story from './story.json';
import {chapters,DURATION,BEAT,groove} from './timing';

const clamp={extrapolateLeft:'clamp',extrapolateRight:'clamp'} as const;
const ease=Easing.bezier(.16,1,.3,1);
const cards=[
 [{at:.5,end:5.6,text:'一句问候，也可能暴露位置。'},{at:6,end:11.7,text:'你会继续，还是沉默？'}],
 [{at:.5,end:6,text:'每个文明，都是隐蔽的猎人。'},{at:6.5,end:11.7,text:'暴露位置，可能招来危险。'}],
 [{at:.5,end:6,text:'公理 01：生存，是第一需要。'},{at:6.5,end:11.7,text:'安全，成为选择的底线。'}],
 [{at:.5,end:8,text:'公理 02：文明持续增长和扩张。'},{at:8.5,end:15.7,text:'物质总量不变，是小说模型的前提。'}],
 [{at:.5,end:8,text:'对方是否友善？你不知道。'},{at:8.5,end:15.7,text:'对方如何判断你？你也不知道。'}],
 [{at:.5,end:6.4,text:'“我相信你，但你相信我吗？”'},{at:6.7,end:13,text:'“你相信，我相信你吗？”'},{at:13.4,end:19.7,text:'无法验证的信任，层层递归。'}],
 [{at:.5,end:9.5,text:'相距 10 光年，以光速交换信息。'},{at:10,end:19.7,text:'一次问答，往返至少 20 年。'}],
 [{at:.5,end:6.4,text:'技术进步，未必匀速。'},{at:6.7,end:13,text:'今天的弱小，可能发生技术跃迁。'},{at:13.4,end:19.7,text:'未来优势，无法保证。'}],
 [{at:.5,end:8,text:'善意未知，未来实力也未知。'},{at:8.5,end:15.7,text:'极端假设下，可能选择先清除威胁。'}],
 [{at:.5,end:6,text:'广播信息，也可能暴露坐标。'},{at:6.5,end:11.7,text:'你无法选择，谁会听到。'}],
 [{at:.5,end:7.7,text:'隐蔽，成为看似安全的选择。'}],
 [{at:.5,end:9,text:'推演还依赖：发现、定位、跨星际打击。'},{at:9.5,end:19.7,text:'能力与决策方式，现实中均未确定。'}],
 [{at:.5,end:7,text:'尚未确认地外技术文明。'},{at:7.5,end:13.5,text:'生命稀少 / 距离遥远 / 搜索有限'},{at:14,end:19.7,text:'黑暗森林，并非定论。'}],
 [{at:.5,end:11.7,text:'科幻思想实验 · 不是已证实的宇宙法则'}],
];

const Message:React.FC<{scene:number}>=({scene})=>{
 const f=useCurrentFrame();const{fps}=useVideoConfig();const t=f/fps/BEAT;
 const card=cards[scene].find(c=>t>=c.at&&t<=c.end);
 if(!card)return null;
 const alpha=interpolate(t,[card.at,card.at+.25,card.end-.2,card.end],[0,1,1,0],clamp);
 const pop=interpolate(t,[card.at,card.at+.35,card.at+.7],[1.035,.995,1],clamp);
 return <div style={{position:'absolute',bottom:132,left:160,right:160,display:'flex',justifyContent:'center',textAlign:'center',opacity:alpha,translate:`0 ${(1-alpha)*18}px`,scale:pop}}>
  <div style={{fontSize:scene===13?30:43,fontWeight:400,letterSpacing:2.5,lineHeight:1.5,color:scene===13?'#92a6b2':'#e7ebeb',textShadow:'0 2px 18px #000,0 0 35px #000',maxWidth:1600}}>{card.text.split(/(生存|20 年|技术跃迁|暴露|威胁|未确定|并非定论)/g).map((part,i)=><span key={i} style={i%2?{color:'#edbd7b',fontWeight:500}:undefined}>{part}</span>)}</div>
 </div>;
};

const Heading:React.FC<{scene:number}>=({scene})=>{
 const f=useCurrentFrame();const{fps}=useVideoConfig();const t=f/fps;
 const entry=interpolate(t,[.05,.4],[0,1],{...clamp,easing:ease});
 if(scene===1)return <AbsoluteFill style={{justifyContent:'center',alignItems:'center',paddingBottom:100,opacity:entry,color:'#f1e9d9'}}>
  <div style={{fontSize:23,letterSpacing:11,marginBottom:28,color:'#a8bdc8'}}>THE DARK FOREST</div>
  <div style={{fontSize:172,fontWeight:300,letterSpacing:interpolate(t,[0,.65],[49,35],clamp),paddingLeft:35,filter:`blur(${(1-entry)*9}px)`,translate:`0 ${(1-entry)*30}px`,textShadow:'0 3px 28px #020609cc'}}>黑暗森林</div>
  <div style={{fontSize:30,letterSpacing:4,marginTop:35,color:'#c3cbc9'}}>刘慈欣《三体》中的宇宙社会学思想实验</div>
 </AbsoluteFill>;
 if(scene===10)return <AbsoluteFill style={{alignItems:'center',justifyContent:'center',paddingBottom:115,color:'#d8e5e9',opacity:entry}}>
  <div style={{fontSize:166,fontWeight:300,letterSpacing:65,paddingLeft:65}}>沉默</div>
  <div style={{fontSize:24,letterSpacing:9,color:'#879ca6',marginTop:35}}>THE SILENT EQUILIBRIUM</div>
 </AbsoluteFill>;
 if(scene===13)return <AbsoluteFill style={{alignItems:'center',justifyContent:'center',paddingBottom:80,opacity:entry}}>
  <div style={{fontSize:20,letterSpacing:10,color:'#d4ad78',marginBottom:40}}>THE QUESTION THAT REMAINS</div>
  <div style={{fontSize:112,letterSpacing:10,fontWeight:300,color:'#edf0e9'}}>当信任，无法验证。</div>
  <div style={{fontSize:64,letterSpacing:10,fontWeight:300,color:'#afc7d3',marginTop:42,opacity:interpolate(t,[.85,1.25],[0,1],clamp)}}>你会如何选择？</div>
 </AbsoluteFill>;
 return <div style={{position:'absolute',left:140,right:140,top:156,opacity:entry,translate:`0 ${(1-entry)*25}px`}}>
  <div style={{fontSize:18,letterSpacing:6,color:scene===8?'#dca56b':'#89a9b8',marginBottom:24}}>{story[scene].en}</div>
  <div style={{fontSize:scene===6?94:99,fontWeight:300,letterSpacing:8,lineHeight:1.14,color:'#e6eeec',textShadow:'0 2px 40px #000'}}>{story[scene].title}</div>
  {scene===3?<div style={{fontSize:21,letterSpacing:3,color:'#c39b65',marginTop:18}}>以下为小说模型的前提</div>:null}
  {scene===6?<div style={{fontSize:19,letterSpacing:3,color:'#849eae',marginTop:18}}>光速通信 · 忽略处理时间的理想示意</div>:null}
 </div>;
};

const Chapter:React.FC<{scene:number}>=({scene})=>{
 const chapter=chapters[scene];
 return <SceneEnvelope scene={scene}>
  <World scene={scene} start={chapter.start} duration={chapter.duration}/>
  <BeatLight scene={scene}/>
  <EventLight scene={scene}/>
  <ForegroundDust scene={scene}/>
  <AbsoluteFill style={{background:'linear-gradient(180deg,rgba(1,5,9,.1),transparent 40%,transparent 68%,rgba(1,5,9,.6))'}}/>
  <TypeEnvelope scene={scene}>
   <Heading scene={scene}/>
   <Diagrams scene={scene}/>
   <Message scene={scene}/>
  </TypeEnvelope>
 </SceneEnvelope>;
};

const BeatLight:React.FC<{scene:number}>=({scene})=>{
 const f=useCurrentFrame();const{fps}=useVideoConfig();const g=groove(f/fps+chapters[scene].start);
 const energetic=[0,3,5,7,8,9].includes(scene);
 const strength=energetic?.075:.028;
 return <AbsoluteFill style={{pointerEvents:'none',mixBlendMode:'screen',background:`radial-gradient(ellipse at ${g.index%2?90:10}% 58%,rgba(${g.index%2?'224,138,52':'72,159,212'},${g.kick*strength}),transparent 58%)`}}/>;
};

const Finish:React.FC=()=>{
 const f=useCurrentFrame();const{fps}=useVideoConfig();const t=f/fps;
 const i=Math.max(0,chapters.findIndex(c=>t>=c.start&&t<c.start+c.duration));
 const chapter=chapters[i];const since=t-chapter.start;
 const hit=i>0?interpolate(since,[0,.033,.18],[.035,.085,0],clamp):0;
 const fade=interpolate(t,[DURATION-.7,DURATION-1/30],[0,1],clamp);
 return <AbsoluteFill style={{pointerEvents:'none'}}>
  <AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 50%,transparent 30%,rgba(0,0,0,.18) 100%)'}}/>
  <div style={{position:'absolute',top:0,left:0,right:0,height:68,background:'#020609'}}/>
  <div style={{position:'absolute',bottom:0,left:0,right:0,height:68,background:'#020609'}}/>
  <div style={{position:'absolute',top:94,left:140,color:'#7e96a3',fontSize:13,letterSpacing:4}}>D / F — THE DARK FOREST</div>
  <div style={{position:'absolute',top:94,right:140,color:'#7e96a3',fontSize:13,letterSpacing:3}}>一 场 关 于 信 任 的 思 想 实 验</div>
  <div style={{position:'absolute',bottom:92,left:140,color:'#6f8b9b',fontSize:12,letterSpacing:3}}>{String(i+1).padStart(2,'0')} / 14 <span style={{marginLeft:24}}>{story[i].en}</span></div>
  <div style={{position:'absolute',bottom:92,right:140,color:'#6f8b9b',fontSize:12,letterSpacing:3}}>SCIENCE × FICTION</div>
  <div style={{position:'absolute',bottom:68,left:140,right:140,height:1,background:'#7b9caf22'}}><div style={{height:1,width:`${t/DURATION*100}%`,background:'#91b4c0',opacity:.45}}/></div>
  {hit>0?<AbsoluteFill style={{background:'#c5def0',opacity:hit,mixBlendMode:'screen'}}/>:null}
  <AbsoluteFill style={{background:'#020609',opacity:fade}}/>
 </AbsoluteFill>;
};

export const DarkForest:React.FC<{score?:'groove'|'abyss'}>=({score='groove'})=>{
 const{fps}=useVideoConfig();
 return <AbsoluteFill style={{background:'#020609',fontFamily:'"Segoe UI", "Microsoft YaHei", sans-serif',overflow:'hidden'}}>
  <Sequence name="01 · 被听见的问候" durationInFrames={5.2*fps}><Chapter scene={0}/></Sequence>
  <Sequence name="02 · 黑暗森林" from={5*fps} durationInFrames={5.2*fps}><Chapter scene={1}/></Sequence>
  <Sequence name="03 · 生存公理" from={10*fps} durationInFrames={5.2*fps}><Chapter scene={2}/></Sequence>
  <Sequence name="04 · 有限资源" from={15*fps} durationInFrames={206*fps/30}><Chapter scene={3}/></Sequence>
  <Sequence name="05 · 未知的善意" from={650*fps/30} durationInFrames={206*fps/30}><Chapter scene={4}/></Sequence>
  <Sequence name="06 · 猜疑链" from={850*fps/30} durationInFrames={256*fps/30}><Chapter scene={5}/></Sequence>
  <Sequence name="07 · 光年的等待" from={1100*fps/30} durationInFrames={256*fps/30}><Chapter scene={6}/></Sequence>
  <Sequence name="08 · 技术爆炸" from={45*fps} durationInFrames={256*fps/30}><Chapter scene={7}/></Sequence>
  <Sequence name="09 · 极端策略" from={1600*fps/30} durationInFrames={206*fps/30}><Chapter scene={8}/></Sequence>
  <Sequence name="10 · 广播与暴露" from={60*fps} durationInFrames={5.2*fps}><Chapter scene={9}/></Sequence>
  <Sequence name="11 · 沉默均衡" from={65*fps} durationInFrames={106*fps/30}><Chapter scene={10}/></Sequence>
  <Sequence name="12 · 模型的边界" from={2050*fps/30} durationInFrames={256*fps/30}><Chapter scene={11}/></Sequence>
  <Sequence name="13 · 科学仍在寻找" from={2300*fps/30} durationInFrames={256*fps/30}><Chapter scene={12}/></Sequence>
  <Sequence name="14 · 你的选择" from={85*fps} durationInFrames={5*fps}><Chapter scene={13}/></Sequence>
  <Audio src={staticFile(score==='abyss'?'dark-forest/score-abyss.wav':'dark-forest/score-groove.wav')}/>
  <EditLight/>
  <Finish/>
 </AbsoluteFill>;
};

export const DarkForestDeepSpace:React.FC=()=> <DarkForest score="abyss"/>;

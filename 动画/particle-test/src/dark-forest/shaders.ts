import {fragment as beyondFragment,vertex} from '../beyond/shaders';
export {vertex};
const shared=beyondFragment.slice(0,beyondFragment.lastIndexOf('void main(){'));

export const fragment=shared+`
uniform float uClock;
vec3 planet(vec2 uv,vec2 center,float radius,vec3 tint,float time){
 vec2 p=(uv-center)/radius;float r=length(p);vec3 c=vec3(0.);
 float halo=exp(-abs(r-1.)*16.);c+=tint*halo*.13;
 if(r<1.){
  vec3 n=vec3(p,sqrt(max(0.,1.-dot(p,p))));vec3 light=normalize(vec3(-.85,.52,.35));
  vec3 surface=n;surface.xz=rot(time*.085)*surface.xz;
  float sunlight=dot(n,light),dif=max(0.,sunlight);
  float land=fbm(surface*5.3+vec3(0.,1.,3.)+tint*4.);
  float clouds=smoothstep(.49,.72,fbm(surface*12.+vec3(time*.045,2.,0.)+tint*2.));
  vec3 ocean=tint*vec3(.17,.27,.38),continents=mix(tint*.75,vec3(.32,.37,.3),.28);
  float landMask=smoothstep(.43,.57,land);
  float relief=fbm(surface*28.+tint*4.);
  c=mix(ocean,continents,landMask)*(.035+dif*1.18)*(.82+relief*.3);
  float cloudShadow=smoothstep(.49,.72,fbm((surface+light*.024)*12.+vec3(time*.045,2.,0.)+tint*2.));
  c*=1.-cloudShadow*.25;
  c=mix(c,vec3(.73,.82,.88)*(.045+dif*.8),clouds*.73);
  float glint=pow(max(0.,dot(reflect(-light,n),vec3(0.,0.,1.))),55.);
  c+=vec3(.55,.72,.85)*glint*(1.-landMask)*(1.-clouds)*.32;
  float cities=pow(max(0.,noise(surface*170.)-.65)*3.,4.);
  c+=vec3(1.,.56,.19)*cities*(1.-smoothstep(-.15,.2,sunlight))*landMask*.42;
  c+=tint*pow(1.-n.z,4.)*(.10+dif*.92);
 }
 float sunward=.22+.78*max(0.,dot(normalize(p+vec2(.00001)),normalize(vec2(-.85,.52))));
 c+=tint*exp(-abs(r-1.)*85.)*(.25+sunward*.6);
 c+=tint*exp(-abs(r-1.)*12.)*.09;
 return c;
}

// Opaque planets occlude the starfield instead of having stars shine through them.
vec3 overPlanet(vec3 background,vec2 uv,vec2 center,float radius,vec3 tint,float t){
 float mask=1.-smoothstep(.993,1.,length(uv-center)/radius);
 return background*(1.-mask)+planet(uv,center,radius,tint,uClock*.85);
}

float groveSdf(vec3 p){
 vec2 id=floor((p.xz+1.25)/2.5),q=mod(p.xz+1.25,2.5)-1.25;
 float h=4.+hash2(id)*7.;float radius=.45+hash2(id+2.)*.3;
 float exist=smoothstep(1.25,2.2,abs(p.x));
 h*=exist;
 float trunk=max(length(q)-.055,abs(p.y-h*.48)-h*.48);
 float crown=max(length(q)-radius*(1.-p.y/max(h,.01)),abs(p.y-h*.58)-h*.4);
 return min(min(trunk,crown)*.8,p.y+.08);
}
vec3 grove(vec2 uv,float t){
 vec3 ro=vec3(.25*sin(t*.08),1.3,t*.65),rd=normalize(vec3(uv.x,uv.y+.05,1.45));
 float d=0.;bool hit=false;vec3 p;
 for(int i=0;i<90;i++){p=ro+rd*d;float h=groveSdf(p);if(h<.005){hit=true;break;}d+=max(.02,h*.85);if(d>58.)break;}
 vec3 fog=vec3(.012,.027,.044)+vec3(.14,.19,.22)*exp(-length(uv-vec2(.12,.03))*3.2);
 vec3 c=fog;
 if(hit){float n=fbm(p*2.);c=vec3(.005,.012,.018)+n*vec3(.009,.02,.027);c=mix(c,fog,1.-exp(-d*.055));}
 for(int i=0;i<8;i++){float k=float(i);vec2 pos=vec2(sin(k*12.7)*1.7,cos(k*4.1)*.27-.12);float light=exp(-length(uv-pos)*(50.+k*5.));c+=mix(vec3(.21,.52,.75),vec3(1.,.47,.13),hash(k))*light*(.55+.2*sin(t*.7+k));}
 c+=vec3(.12,.24,.34)*exp(-abs(uv.x-.1)*6.)*smoothstep(-.6,.6,uv.y)*.07;
 return c;
}

vec3 deepStars(vec2 uv,float t){
 vec3 c=vec3(0.);
 for(int i=0;i<3;i++){
  float layer=float(i),depth=1.+layer*1.7;
  vec2 p=(uv+vec2(t*.012,t*.003)/depth)*(39.+layer*34.);
  vec2 id=floor(p),q=fract(p)-.5;float h=hash2(id+layer*53.);
  q-=(vec2(hash2(id+7.),hash2(id+21.))-.5)*.65;
  float r=length(q),visible=step(.965+layer*.005,h);
  float core=exp(-r*r*(190.+layer*90.));
  float glint=exp(-abs(q.x)*110.-abs(q.y)*14.)+exp(-abs(q.y)*110.-abs(q.x)*14.);
  float twinkle=.82+.18*sin(t*(.45+hash2(id+4.))+h*80.);
  c+=mix(vec3(.42,.65,1.),vec3(1.,.78,.48),hash2(id+9.))*(core+glint*.16)*visible*twinkle*(.7-layer*.16);
 }
 return c;
}

vec3 cosmos(vec2 uv,float t){
 // Emission along a shallow volumetric cloud: foreground dust, mid-distance
 // filaments and a distant stellar background move at different velocities.
 vec2 drift=uv+vec2(uClock*.008,sin(uClock*.11)*.025);
 vec3 c=vec3(.003,.008,.019);float trans=1.;
 for(int i=0;i<8;i++){
  float z=float(i)*.36;
  vec3 p=vec3(drift*(1.+z*.12),z+uClock*.035);
  float density=fbm(p*1.9+vec3(3.,1.,0.));
  float band=exp(-pow((p.y-p.x*.35-.18)*2.,2.));
  float d=smoothstep(.39,.77,density)*band*.17;
  vec3 tint=mix(vec3(.06,.23,.48),vec3(.38,.13,.055),smoothstep(-.3,1.6,p.x));
  c+=trans*d*tint;trans*=1.-d*.7;
 }
 float dust=fbm(vec3(drift*3.4,1.+uClock*.018));
 c*=.62+.38*smoothstep(.3,.65,dust);
 c+=deepStars(uv,uClock)*(trans*.8+.2);
 c+=vec3(.04,.13,.23)*exp(-length(uv-vec2(-1.25,.2))*2.5)*.2;
 return c;
}

vec3 pair(vec2 uv,float t){
 vec3 c=cosmos(uv,t);
 c=overPlanet(c,uv,vec2(-.87,-.11),.37,vec3(.19,.58,.9),t);
 c=overPlanet(c,uv,vec2(.87,-.11),.37,vec3(1.,.48,.16),t*.7);
 return c;
}

vec3 signal(vec2 uv,float t){
 vec2 pos=vec2(.58,-.14);float radius=.59+sin(t*.13)*.015;
 vec3 c=overPlanet(cosmos(uv,t),uv,pos,radius,vec3(.16,.47,.86),t);
 c=overPlanet(c,uv,vec2(1.26+sin(uClock*.12)*.025,.38+cos(uClock*.12)*.015),.085,vec3(.45,.52,.65),t*.6);
 vec2 sun=uv-(pos+vec2(-.41,.43));
 c+=vec3(.35,.68,1.)*(exp(-length(sun)*48.)*.48+exp(-abs(sun.y)*190.-abs(sun.x)*3.)*.095);
 for(int i=0;i<4;i++){
  float phase=fract(t*.13+float(i)*.25);float r=length(uv-pos);
  c+=vec3(.17,.56,.87)*exp(-abs(r-(radius+.02+phase*1.65))*115.)*pow(1.-phase,2.)*.32;
 }
 float watcher=exp(-length(uv-vec2(-1.13,.22))*50.);
 c+=vec3(.9,.4,.12)*watcher*smoothstep(2.,4.,t);
 return c;
}

vec3 life(vec2 uv,float t){
 vec2 pos=vec2(.0,-.10);float r=length(uv-pos);
 vec3 c=overPlanet(cosmos(uv,t),uv,pos,.5,vec3(.2,.55,.83),t);
 float shield=exp(-abs(r-.57)*110.);
 c+=vec3(.18,.67,.84)*shield*(.32+uPulse*.18);
 float swe=atan(uv.y-pos.y,uv.x-pos.x)+t*.25;
 c+=vec3(.23,.62,.8)*shield*pow(max(0.,cos(swe)),12.)*.5;
 return c;
}

vec3 lattice(vec2 uv,float t){
 vec3 c=overPlanet(cosmos(uv,t),uv,vec2(0.,-.12),.57,vec3(.16,.43,.68),t);float r=length(uv-vec2(0.,-.12));
 float boundary=exp(-abs(r-.61)*120.);c+=vec3(.26,.53,.68)*boundary*.65;
 float extent=smoothstep(0.,9.,t)*.62;
 vec2 p=(uv-vec2(0.,-.12))*19.;vec2 id=floor(p),f=fract(p)-.5;
 float h=hash2(id);float dotlight=exp(-dot(f,f)*120.);
 float population=step(length(id)/19.,extent)*step(.27,h)*step(r,.6);
 c+=vec3(1.,.56,.17)*dotlight*population*(.5+uPulse*.2);
 return c;
}

vec3 accelerating(vec2 uv,float t){
 vec3 c=cosmos(uv,t);
 c=overPlanet(c,uv,vec2(.95,-.1),.33,vec3(.8,.39,.14),t*1.4);
 vec2 p=uv-vec2(.95,-.1);float a=atan(p.y,p.x),r=length(p);
 float speed=.2+pow(clamp(t/12.,0.,1.),3.)*3.;
 for(int i=0;i<4;i++){float k=float(i);float ringR=.37+k*.065;float arc=exp(-abs(r-ringR)*150.)*pow(max(0.,sin(a*(3.+k)-t*speed*(k+1.))),8.);c+=vec3(.9,.52,.18)*arc*(.45+k*.1);}
 c+=vec3(.23,.49,.76)*exp(-length(p)*8.)*.2;
 return c;
}

vec3 attack(vec2 uv,float t){
 float age=max(0.,t-7.),impact=step(7.,t);
 vec2 warpCenter=uv-vec2(.87,-.11);float wr=length(warpCenter);
 float shock=exp(-pow((wr-(.37+age*.9))*27.,2.))*exp(-age*1.4)*impact;
 vec2 refracted=uv-normalize(warpCenter+vec2(.00001))*shock*.014;
 vec3 c=pair(refracted,t);float fire=smoothstep(5.3,5.5,t);
 float charge=smoothstep(4.5,5.5,t)*(1.-smoothstep(5.5,5.8,t));
 c+=vec3(.25,.64,1.)*exp(-length(uv-vec2(-.5,-.11))*44.)*charge*.65;
 float travel=clamp((t-5.5)/1.5,0.,1.);vec2 head=mix(vec2(-.87,-.11),vec2(.87,-.11),travel);
 float beam=exp(-abs(uv.y+.11)*280.)*smoothstep(-.9,-.8,uv.x)*(1.-smoothstep(head.x,head.x+.02,uv.x));
 c+=vec3(1.,.24,.055)*beam*fire*(1.-smoothstep(7.35,8.3,t))*1.2;
 c+=vec3(1.,.6,.25)*exp(-length(uv-head)*75.)*fire*(1.-impact)*1.5;
 vec2 p=uv-vec2(.87,-.11);float r=length(p);
 float burst=exp(-abs(r-(t-7.)*1.4)*65.)*exp(-max(0.,t-7.)*1.8)*impact;
 c+=vec3(1.,.42,.12)*burst*1.6;
 c+=vec3(1.,.7,.4)*exp(-r*8.)*impact*exp(-max(0.,t-7.)*3.)*.7;
 c+=vec3(1.,.58,.22)*shock*.55;
 c+=vec3(1.,.8,.5)*exp(-abs(p.y)*160.-abs(p.x)*2.)*impact*exp(-age*5.)*.65;
 for(int i=0;i<24;i++){
  float k=float(i),a=k*2.39996;
  vec2 dir=vec2(cos(a),sin(a));float distance=.37+age*(.25+hash(k+2.)*.7);
  vec2 q=p-dir*distance;
  float along=dot(q,dir),across=dot(q,vec2(-dir.y,dir.x));
  float streak=exp(-abs(across)*400.-abs(along)*80.)*exp(-age*1.8)*impact;
  c+=mix(vec3(.33,.65,1.),vec3(1.,.55,.18),hash(k))*streak*.85;
 }
 return c;
}

vec3 broadcast(vec2 uv,float t){
 vec3 c=overPlanet(cosmos(uv,t),uv,vec2(0.,-.08),.40,vec3(.19,.55,.8),t);
 float r=length(uv-vec2(0.,-.08));
 for(int i=0;i<5;i++){float phase=fract(t*.13+float(i)*.2);float ring=exp(-abs(r-(.42+phase*1.7))*130.);c+=vec3(.22,.67,.87)*ring*(1.-phase)*.48;}
 for(int i=0;i<12;i++){float k=float(i);float a=k*2.39996;vec2 pos=vec2(cos(a)*1.38,sin(a)*.56-.05);float awake=smoothstep(3.+k*.5,3.3+k*.5,t);c+=vec3(.9,.39,.13)*exp(-length(uv-pos)*90.)*awake*.8;}
 return c;
}

vec3 silence(vec2 uv,float t){
 vec3 c=overPlanet(cosmos(uv,t)*.65,uv,vec2(1.22,-.62),.72,vec3(.09,.24,.44),t)*.75;
 for(int i=0;i<30;i++){float k=float(i);vec2 pos=vec2((hash(k*17.)-.5)*3.1,(hash(k*23.+3.)-.5)*1.25);float visible=1.-smoothstep(1.+hash(k+1.)*5.,1.6+hash(k+1.)*5.,t);float r=length(uv-pos);c+=mix(vec3(.22,.52,.76),vec3(1.,.56,.21),hash(k+5.))*exp(-r*100.)*visible*.9;}
 return c;
}

vec3 telescope(vec2 uv,float t){
 vec3 c=cosmos(uv,t)*2.;
 float milky=exp(-pow((uv.y-uv.x*.22-.27)*2.4,2.));float n=fbm(vec3(uv*4.,t*.008));c+=vec3(.06,.09,.14)*milky*pow(n,2.);
 float ground=-.66+.055*sin(uv.x*2.3)+.025*sin(uv.x*7.);
 c*=smoothstep(ground-.005,ground+.01,uv.y);
 return c;
}

void main(){
 vec2 uv=(vUv-.5)*vec2(uResolution.x/uResolution.y,1.)*2.;
 uv*=1.-uPulse*.002;vec3 col;
 if(uScene==0)col=signal(uv,uTime);
 else if(uScene==1){col=overPlanet(cosmos(uv,uTime),uv,vec2(1.07,-.1),.70,vec3(.16,.38,.65),uTime);col+=grove(uv,uTime)*.24;}
 else if(uScene==2)col=life(uv,uTime);
 else if(uScene==3)col=lattice(uv,uTime);
 else if(uScene==4)col=pair(uv,uTime);
 else if(uScene==5)col=overPlanet(cosmos(uv,uTime),uv,vec2(1.52,-.68),.76,vec3(.16,.38,.64),uTime)*.8;
 else if(uScene==6)col=pair(uv,uTime);
 else if(uScene==7)col=accelerating(uv,uTime);
 else if(uScene==8)col=attack(uv,uTime);
 else if(uScene==9)col=broadcast(uv,uTime);
 else if(uScene==10)col=silence(uv,uTime);
 else if(uScene==11)col=overPlanet(cosmos(uv,uTime),uv,vec2(.1,-1.54),1.10,vec3(.12,.37,.63),uTime)*.85;
 else if(uScene==12)col=telescope(uv,uTime);
 else col=overPlanet(cosmos(uv,uTime),uv,vec2(.62,-.19),.70,vec3(.12,.38,.69),uTime);
 col=1.-exp(-max(col,0.)*1.65);col=pow(col,vec3(.92));
 col*=1.-.25*pow(length((vUv-.5)*1.1),1.7);
 col+=(hash2(gl_FragCoord.xy+mod(floor(uTime*30.),120.)*17.)-.5)*.008;
 gl_FragColor=vec4(max(col,0.),1.);
}`;

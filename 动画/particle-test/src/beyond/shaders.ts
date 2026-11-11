// Original deterministic GLSL cinematography. All motion is driven by the Remotion frame.
export const vertex = `attribute vec2 aPosition;
varying vec2 vUv;
void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;

export const fragment = `precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime;
uniform float uProgress;
uniform float uPulse;
uniform float uEnergy;
uniform int uScene;
const float PI=3.14159265359;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float hash(float n){return fract(sin(n)*43758.5453123);}
float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=dot(i,vec3(1.,57.,113.));return mix(mix(mix(hash(n),hash(n+1.),f.x),mix(hash(n+57.),hash(n+58.),f.x),f.y),mix(mix(hash(n+113.),hash(n+114.),f.x),mix(hash(n+170.),hash(n+171.),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*noise(p);p=mat3(.00,.80,.60,-.80,.36,-.48,-.60,-.48,.64)*p*2.07+1.8;a*=.49;}return s;}
vec3 palette(float x){return .53+.47*cos(6.28318*(vec3(.03,.27,.52)+x));}
vec3 stars(vec2 uv,float t){vec3 c=vec3(0.);for(int k=0;k<3;k++){float layer=float(k);vec2 p=uv*(160.+layer*87.);p+=vec2(t*.17*(layer+1.),layer*43.);vec2 id=floor(p),f=fract(p)-.5;float h=hash2(id+layer);vec2 off=vec2(hash2(id+10.),hash2(id+23.))*.5-.25;float r=length(f-off);float star=exp(-r*r*(700.+layer*300.))*step(.986,h);c+=star*mix(vec3(.48,.67,1.),vec3(1.,.79,.57),hash2(id+4.))*(.55+hash2(id+5.));}return c;}
vec3 sky(vec2 uv,float t){float n=fbm(vec3(uv*2.4,t*.025));return vec3(.004,.009,.018)+pow(n,4.)*vec3(.018,.028,.055)+stars(uv,t)*.7;}

// Eclipse: a vast, black body emerging from a blue-white rim.
vec3 eclipse(vec2 p,float t){
 vec2 q=p-vec2(.22,.025);q*=.88-.13*uProgress;
 float r=length(q),a=atan(q.y,q.x);float radius=.53;
 vec3 c=sky(p,t);float edge=exp(-abs(r-radius)*105.);
 float corona=exp(-abs(r-radius)*12.)*(.25+.75*pow(max(0.,sin(a-.4)),2.));
 c+=vec3(.25,.62,1.05)*(edge*.75+corona*.35);
 float band=exp(-abs(q.y+.035)*180.)*exp(-abs(q.x)*1.8);
 c+=vec3(.45,.78,1.)*band*.55;
 c*=smoothstep(radius-.005,radius+.002,r);
 float sun=length(q-vec2(-.36,.388));c+=vec3(.62,.82,1.)*exp(-sun*42.)*2.;
 c+=vec3(.11,.26,.43)*exp(-sun*5.)*.16;
 return c;
}

// Front-to-back emission/absorption in a moving, turbulent cloud.
vec3 nebula(vec2 p,float t){
 vec3 ro=vec3(0.,0.,-3.3+uProgress*.8),rd=normalize(vec3(p,1.5));
 rd.xy*=rot(-.16+uProgress*.18);vec3 c=sky(p,t)*.5;float trans=1.;
 for(int i=0;i<36;i++){
  float d=float(i)*.115;vec3 x=ro+rd*d;x.xy*=rot(x.z*.37+t*.018);
  float n=fbm(x*1.65+vec3(t*.035,0.,0.));
  float ridge=abs(x.y+.36*sin(x.x*2.+x.z*.5));
  float den=smoothstep(.43,.76,n)*exp(-ridge*ridge*3.)*.19;
  float hot=pow(max(0.,n-.37)*2.,3.);
  vec3 col=mix(vec3(.025,.19,.45),vec3(1.3,.17,.035),smoothstep(-.65,.8,x.x+x.z*.2));
  col+=vec3(1.2,.68,.33)*hot*.8;
  c+=trans*den*col*2.3;trans*=1.-den;
 }
 float core=length(p-vec2(.28,.02));c+=vec3(.8,.68,.5)*exp(-core*24.)*.5;
 return c;
}

// Curved light paths, a lensed rear disk, and a dark event horizon.
vec3 blackhole(vec2 p,float t){
 p-=vec2(.12,.03);p*=rot(-.17);p*=.9-.1*uProgress;
 float r=length(p),a=atan(p.y,p.x);float lens=.11/max(r,.12);
 vec2 warped=p*(1.+lens*lens);vec3 c=sky(warped,t)*.7;
 float ringR=length(vec2(p.x,p.y*3.8));
 float width=.024+.024*noise(vec3(a*12.,t*.6,r*7.));
 float disk=exp(-abs(ringR-.68)/width);
 float diskHalo=exp(-abs(ringR-.68)*9.);
 float swirl=.65+.35*sin(a*43.+t*2.5+ringR*60.);
 float texture=fbm(vec3(p.x*18.,p.y*53.,t*.3));
 vec3 amber=mix(vec3(.9,.12,.015),vec3(1.7,1.05,.43),texture);
 c+=amber*(disk*swirl*1.5+diskHalo*.19);
 float rear=length(vec2(p.x,p.y+.025));
 float arc=exp(-abs(rear-.35)*75.)*smoothstep(-.1,.08,p.y);
 c+=vec3(1.3,.62,.18)*arc*1.2;
 float photon=exp(-abs(r-.292)*190.);
 c+=vec3(1.8,1.16,.58)*photon*(.8+.2*sin(a*5.+t));
 c*=smoothstep(.276,.285,r);
 c+=vec3(1.,.35,.06)*exp(-abs(r-.305)*23.)*.09;
 float streak=exp(-abs(p.y+.025)*260.)*exp(-abs(p.x)*1.1);
 c+=vec3(1.,.47,.15)*streak*.6;
 return c;
}

// Continuous flight through a three-dimensional, twisting light tunnel.
vec3 warp(vec2 p,float t){
 p+=vec2(.055*sin(t*.8),.04*cos(t*.7));p*=rot(.12*sin(t*.25));float r=length(p),a=atan(p.y,p.x);vec3 c=vec3(.002,.008,.016);
 float travel=t*(1.7+uEnergy*.8);float z=1./max(r,.025);
 a+=sin(z*.16+t*.25)*.1;
 float rings=pow(max(0.,sin(z*2.8-travel*7.)),30.);
 float lanes=pow(max(0.,cos(a*28.+sin(z*.18+t)*1.8)),45.);
 float secondary=pow(max(0.,cos(a*65.-z*.7)),65.);
 float tube=exp(-abs(r-.6)*.8)*smoothstep(.025,.15,r);
 vec3 col=mix(vec3(.025,.45,.9),vec3(1.1,.43,.12),.5+.5*sin(a*2.+z*.25));
 c+=col*(rings*.55+lanes*.75+secondary*.16)*tube;
 float streak=pow(max(0.,cos(a*113.+sin(floor(a*17.))*4.)),130.);
 float dashes=pow(max(0.,sin(z*3.-travel*19.+floor(a*17.)*7.)),12.);
 c+=vec3(.5,.8,1.)*streak*dashes*smoothstep(.1,.45,r)*1.4;
 c+=vec3(.16,.47,.75)*.025/max(r*r,.025);
 c+=stars(p/(r*.2+1.),t*7.)*.2;
 return c;
}

float torusSdf(vec3 p){p.xz*=rot(uTime*.19);p.xy*=rot(.5+uTime*.08);float major=.78;vec2 q=vec2(length(p.xz)-major,p.y);return length(q)-.19;}
float sculptureSdf(vec3 p){float a=torusSdf(p);p.yz*=rot(1.5708);p.xz*=rot(.3);float b=torusSdf(p)*1.;return min(a,b);}
vec3 sculptureNormal(vec3 p){vec2 e=vec2(.001,0.);return normalize(vec3(sculptureSdf(p+e.xyy)-sculptureSdf(p-e.xyy),sculptureSdf(p+e.yxy)-sculptureSdf(p-e.yxy),sculptureSdf(p+e.yyx)-sculptureSdf(p-e.yyx)));}
// A physically lit interlocked sculpture, with soft studio strip reflections.
vec3 sculpture(vec2 uv,float t){
 vec3 ro=vec3(.4*sin(t*.15),.15,3.5-uProgress*.5);vec3 rd=normalize(vec3(uv,-1.8));
 float d=0.;vec3 p;bool hit=false;
 for(int i=0;i<90;i++){p=ro+rd*d;float h=sculptureSdf(p);if(h<.001){hit=true;break;}d+=h*.85;if(d>9.)break;}
 vec3 c=vec3(.008,.014,.022)+vec3(.014,.035,.06)*exp(-length(uv)*2.);
 if(hit){vec3 n=sculptureNormal(p);vec3 reflected=reflect(rd,n);float fres=pow(1.-max(0.,dot(n,-rd)),3.);
 float strip1=pow(max(0.,dot(reflected,normalize(vec3(-1.,1.,2.)))),44.);
 float strip2=pow(max(0.,dot(reflected,normalize(vec3(1.,.2,1.)))),19.);
 float rim=pow(max(0.,dot(n,normalize(vec3(-1.,.5,-1.)))),3.);
 c=vec3(.018,.034,.044)+vec3(.15,.7,.85)*rim*.5+vec3(.8,.94,1.)*strip1*3.+vec3(1.,.55,.23)*strip2*1.8;
 c+=vec3(.08,.28,.35)*fres;
 float veins=pow(max(0.,sin(p.y*18.+p.x*11.+t*.7)),36.);c+=vec3(.16,.74,1.)*veins*.11;
 }
 return c;
}

float terrain(vec2 p){float n=fbm(vec3(p*.19,2.));float dune=sin(p.x*.27+sin(p.y*.11)*2.)*.65;return n*3.3+dune;}
// Alien ridgelines, aerial perspective and low amber sunlight.
vec3 desert(vec2 uv,float t){
 vec3 ro=vec3(1.+t*.3,3.3,-t*1.1),rd=normalize(vec3(uv.x,uv.y-.11,1.6));
 vec3 sun=normalize(vec3(.65,.14,1.));float sd=max(0.,dot(rd,sun));
 vec3 skycol=mix(vec3(.095,.16,.22),vec3(.58,.29,.15),pow(max(0.,1.-abs(rd.y)),5.));
 skycol+=vec3(1.5,.9,.36)*pow(sd,600.)+vec3(.5,.25,.11)*pow(sd,16.);
 float dist=0.;vec3 p;bool hit=false;
 for(int i=0;i<100;i++){p=ro+rd*dist;float h=p.y-terrain(p.xz);if(h<.005){hit=true;break;}dist+=max(.035,h*.6);if(dist>75.)break;}
 if(!hit)return skycol;
 float e=.04;vec3 n=normalize(vec3(terrain(p.xz-vec2(e,0.))-terrain(p.xz+vec2(e,0.)),2.*e,terrain(p.xz-vec2(0.,e))-terrain(p.xz+vec2(0.,e))));
 float dif=max(0.,dot(n,sun));float sand=fbm(p*8.);
 vec3 c=mix(vec3(.12,.115,.13),vec3(.42,.24,.13),dif)*(.7+.3*sand);
 float ridges=pow(.5+.5*sin(p.x*6.+p.z*2.+fbm(p*.8)*6.),12.);c+=vec3(.15,.085,.04)*ridges*dif*.3;
 return mix(c,skycol,1.-exp(-dist*.021));
}

float citySdf(vec3 p){vec2 id=floor((p.xz+1.)/2.);vec2 q=mod(p.xz+1.,2.)-1.;float h=.9+hash2(id)*8.;h*=smoothstep(1.6,3.,abs(p.x));float setback=step(h*.78,p.y)*.15;vec3 d=abs(vec3(q.x,p.y-h*.5,q.y))-vec3(.48-setback,h*.5,.48-setback);float b=length(max(d,0.))+min(max(d.x,max(d.y,d.z)),0.);return min(b,p.y+.08);}
vec3 cityNormal(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(citySdf(p+e.xyy)-citySdf(p-e.xyy),citySdf(p+e.yxy)-citySdf(p-e.yxy),citySdf(p+e.yyx)-citySdf(p-e.yyx)));}
// Monolithic future city. A corridor gives the camera an unbroken fly-through.
vec3 city(vec2 uv,float t){
 vec3 ro=vec3(.3*sin(t*.3),2.0+uProgress*1.7,t*2.4),rd=normalize(vec3(uv.x,uv.y+.08,1.45));
 float dist=0.;vec3 p;bool hit=false;
 for(int i=0;i<100;i++){p=ro+rd*dist;float h=citySdf(p);if(h<.006){hit=true;break;}dist+=max(.015,h*.8);if(dist>65.)break;}
 vec3 glow=vec3(.65,.32,.11)*exp(-length(uv-vec2(0.,.06))*2.5);
 vec3 skycol=vec3(.018,.033,.052)+glow*.5;
 if(!hit)return skycol;
 vec3 n=cityNormal(p);float light=max(0.,dot(n,normalize(vec3(-.4,.6,-.7))));
 vec3 c=vec3(.022,.039,.052)*(.5+light*2.);
 float windows=step(.86,fract(p.y*4.))*step(.57,fract((p.x+p.z)*4.))*step(.35,hash2(floor(vec2(p.x+p.z,p.y)*4.)));
 c+=vec3(1.,.56,.19)*windows*.8*step(.2,p.y);
 float seams=pow(max(0.,cos((p.x+p.z)*PI*4.)),60.)*.025;
 c+=vec3(.16,.31,.43)*seams;
 float rim=pow(1.-max(0.,dot(n,-rd)),3.);c+=vec3(.17,.29,.38)*rim*.18;
 if(p.y<.02){float path=exp(-abs(abs(p.x)-1.1)*45.);c+=vec3(.1,.55,.8)*path;}
 c=mix(c,skycol,1.-exp(-dist*.042));
 c+=glow*.16;
 return c;
}

// Dawn over an enormous planetary horizon, glowing atmosphere and night lights.
vec3 dawn(vec2 uv,float t){
 vec2 center=vec2(.0,-2.2-uProgress*.06);float r=length(uv-center),R=2.38;
 vec3 c=sky(uv,t)*.8;
 float rim=exp(-abs(r-R)*120.);float atm=exp(-abs(r-R)*22.);
 c+=vec3(.15,.45,.95)*atm*.5+vec3(.6,.84,1.)*rim*.9;
 if(r<R){float surface=fbm(vec3(uv*9.,t*.008));float clouds=pow(fbm(vec3(uv*16.,4.)),3.);
 c=vec3(.006,.018,.033)+vec3(.015,.045,.08)*surface+clouds*vec3(.09,.13,.17);
 float lights=pow(max(0.,noise(vec3(uv*190.,1.))-.68)*3.1,4.)*smoothstep(.4,.8,surface);
 c+=vec3(1.,.48,.12)*lights*.7;
 c*=.5+.5*smoothstep(R-.6,R,r);
 }
 vec2 sunpos=vec2(.36,.16+uProgress*.04);float sun=length(uv-sunpos);
 c+=vec3(1.,.71,.37)*exp(-sun*28.)*1.5;
 c+=vec3(.5,.27,.12)*exp(-sun*3.)*.36;
 c+=vec3(.4,.58,.8)*exp(-abs(uv.y-sunpos.y)*180.)*exp(-abs(uv.x-sunpos.x)*2.)*.35;
 return c;
}

void main(){
 vec2 uv=(vUv-.5)*vec2(uResolution.x/uResolution.y,1.)*2.;
 uv*=1.-uPulse*.006;vec3 col;
 if(uScene==0)col=eclipse(uv,uTime);
 else if(uScene==1)col=nebula(uv,uTime);
 else if(uScene==2)col=blackhole(uv,uTime);
 else if(uScene==3)col=warp(uv,uTime);
 else if(uScene==4)col=sculpture(uv,uTime);
 else if(uScene==5)col=desert(uv,uTime);
 else if(uScene==6)col=city(uv,uTime);
 else col=dawn(uv,uTime);
 // Filmic highlight rolloff, gentle vignette, fine deterministic film grain.
 col*=1.+uPulse*.035;
 col=1.-exp(-max(col,0.)*1.45);
 col=pow(col,vec3(.92));
 col*=1.-.25*pow(length((vUv-.5)*1.1),1.7);
 col+=(hash2(gl_FragCoord.xy+mod(floor(uTime*30.),120.)*17.)-.5)*.011;
 gl_FragColor=vec4(max(col,0.),1.);
}`;

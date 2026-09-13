import { clamp, randomBetween, TAU } from './math.js';
import type { Fighter, GameState, GameStateName } from './types.js';

interface Star {x:number;y:number;radius:number;phase:number;speed:number}
interface Cloud {x:number;y:number;scale:number;velocity:number;alpha:number}
interface Grass {x:number;height:number;phase:number;width:number;tip:boolean}
interface Ember {x:number;y:number;velocity:number;phase:number;radius:number;color:string}
interface Gust {x:number;y:number;velocity:number;length:number;alpha:number}

export interface SceneMetrics {width:number;height:number;scale:number;groundY:number}

export class SceneRenderer {
  private readonly context:CanvasRenderingContext2D;
  private width=360;
  private height=640;
  private scale=.5;
  private groundY=512;
  private stars:Star[]=[];
  private clouds:Cloud[]=[];
  private grass:Grass[]=[];
  private embers:Ember[]=[];
  private gusts:Gust[]=[];
  private mountainFar:HTMLCanvasElement|null=null;
  private mountainNear:HTMLCanvasElement|null=null;
  private cloudSprite:HTMLCanvasElement|null=null;

  constructor(context:CanvasRenderingContext2D){this.context=context;}

  resize(metrics:SceneMetrics):void{
    this.width=metrics.width;
    this.height=metrics.height;
    this.scale=metrics.scale;
    this.groundY=metrics.groundY;
    this.regenerateBackground();
  }

  updateAmbient(time:number,delta:number,state:GameStateName):void{
    for(const cloud of this.clouds){
      cloud.x+=cloud.velocity*delta/1000;
      if(cloud.x>this.width+320)cloud.x=-320;
      if(cloud.x<-320)cloud.x=this.width+320;
    }
    for(const ember of this.embers){
      ember.y-=ember.velocity*delta/1000;
      ember.x+=Math.sin(time/700+ember.phase)*.3;
      if(ember.y<-10){ember.y=this.height+10;ember.x=randomBetween(0,this.width);}
    }
    if((state==='wait'||state==='flash'||state==='title')&&Math.random()<delta*.0011){
      this.gusts.push({x:-260,y:randomBetween(this.height*.15,this.height*.72),velocity:randomBetween(900,1500),length:randomBetween(120,280),alpha:randomBetween(.05,.12)});
    }
    for(const gust of this.gusts)gust.x+=gust.velocity*delta/1000;
    this.gusts=this.gusts.filter(gust=>gust.x<this.width+320);
  }

  render(time:number,state:GameState,player:Fighter,enemy:Fighter):void{
    const ctx=this.context;
    ctx.save();
    if(state.shake>0)ctx.translate(randomBetween(-state.shake,state.shake),randomBetween(-state.shake,state.shake));
    this.drawSky();
    this.drawStars(time);
    this.drawMoon();
    this.drawClouds();
    if(this.mountainFar)ctx.drawImage(this.mountainFar,0,0);
    if(this.mountainNear)ctx.drawImage(this.mountainNear,0,0);
    this.drawGround();
    this.drawGrass(time);
    this.drawEmbersAndGusts();
    this.drawFighter(enemy,time,state,enemy);
    this.drawFighter(player,time,state,enemy);
    this.drawHats(state);
    this.drawFx(time,state);
    this.drawBang(time,state);
    ctx.restore();
    if(state.flashAlpha>0){
      ctx.fillStyle=`rgba(${state.flashColor},${state.flashAlpha})`;
      ctx.fillRect(0,0,this.width,this.height);
    }
  }

  private regenerateBackground():void{
    this.stars=Array.from({length:90},()=>({x:Math.random()*this.width,y:Math.random()*this.height*.55,radius:randomBetween(.5,1.6),phase:randomBetween(0,TAU),speed:randomBetween(.5,1.5)}));
    this.clouds=Array.from({length:7},(_,index)=>({x:randomBetween(0,this.width),y:randomBetween(this.height*.08,this.height*.4),scale:randomBetween(.6,1.6),velocity:randomBetween(5,14)*(index%2?1:-1),alpha:randomBetween(.07,.18)}));
    this.grass=Array.from({length:26},(_,index)=>({x:index/25*this.width+randomBetween(-18,18),height:randomBetween(34,88),phase:randomBetween(0,TAU),width:randomBetween(1,2.2),tip:Math.random()<.5}));
    this.embers=Array.from({length:26},()=>({x:randomBetween(0,this.width),y:randomBetween(0,this.height),velocity:randomBetween(8,26),phase:randomBetween(0,TAU),radius:randomBetween(1,2.6),color:Math.random()<.5?'240,194,94':'232,72,47'}));
    this.mountainFar=this.makeMountain(this.height*.30,this.height*.13,'#181f40');
    this.mountainNear=this.makeMountain(this.height*.36,this.height*.19,'#10152e');
    this.cloudSprite??=this.makeCloudSprite();
  }

  private makeMountain(base:number,amplitude:number,color:string):HTMLCanvasElement{
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(2,this.width);
    canvas.height=Math.max(2,this.height);
    const g=canvas.getContext('2d');
    if(!g)throw new Error('Offscreen canvas context unavailable');
    g.fillStyle=color;
    g.beginPath();
    g.moveTo(0,this.height);
    let y=base;
    for(let x=0;x<=this.width;x+=36){
      y=clamp(y+randomBetween(-amplitude*.45,amplitude*.45),base-amplitude,base+amplitude*.3);
      g.lineTo(x,y);
    }
    g.lineTo(this.width,this.height);
    g.closePath();
    g.fill();
    return canvas;
  }

  private makeCloudSprite():HTMLCanvasElement{
    const canvas=document.createElement('canvas');
    canvas.width=300;canvas.height=120;
    const g=canvas.getContext('2d');
    if(!g)throw new Error('Cloud canvas context unavailable');
    const blob=(x:number,y:number,radius:number)=>{
      const gradient=g.createRadialGradient(x,y,0,x,y,radius);
      gradient.addColorStop(0,'rgba(210,218,255,.9)');
      gradient.addColorStop(1,'rgba(210,218,255,0)');
      g.fillStyle=gradient;
      g.beginPath();g.arc(x,y,radius,0,TAU);g.fill();
    };
    blob(150,70,60);blob(90,80,42);blob(210,80,46);blob(120,55,38);blob(185,55,40);
    return canvas;
  }

  private drawSky():void{
    const g=this.context.createLinearGradient(0,0,0,this.height);
    g.addColorStop(0,'#0d1128');g.addColorStop(.45,'#1b2148');g.addColorStop(.75,'#2a2b57');g.addColorStop(1,'#463a5c');
    this.context.fillStyle=g;this.context.fillRect(0,0,this.width,this.height);
  }

  private drawStars(time:number):void{
    for(const star of this.stars){
      const alpha=.25+.55*Math.abs(Math.sin(time/1000*star.speed+star.phase));
      this.context.fillStyle=`rgba(240,235,220,${alpha})`;
      this.context.beginPath();this.context.arc(star.x,star.y,star.radius,0,TAU);this.context.fill();
    }
  }

  private drawMoon():void{
    const ctx=this.context,mx=this.width*.74,my=this.height*.22,radius=Math.min(this.width,this.height)*.15;
    const g=ctx.createRadialGradient(mx,my,radius*.4,mx,my,radius*2.6);
    g.addColorStop(0,'rgba(250,232,170,.30)');g.addColorStop(1,'rgba(250,232,170,0)');
    ctx.fillStyle=g;ctx.fillRect(mx-radius*3,my-radius*3,radius*6,radius*6);
    ctx.fillStyle='#f7e7b5';ctx.beginPath();ctx.arc(mx,my,radius,0,TAU);ctx.fill();
    ctx.fillStyle='rgba(190,160,90,.18)';ctx.beginPath();ctx.arc(mx-radius*.3,my-radius*.2,radius*.18,0,TAU);ctx.fill();ctx.beginPath();ctx.arc(mx+radius*.25,my+radius*.3,radius*.12,0,TAU);ctx.fill();
  }

  private drawClouds():void{
    if(!this.cloudSprite)return;
    for(const cloud of this.clouds){
      this.context.globalAlpha=cloud.alpha;
      this.context.drawImage(this.cloudSprite,cloud.x-150*cloud.scale,cloud.y-60*cloud.scale,300*cloud.scale,120*cloud.scale);
    }
    this.context.globalAlpha=1;
  }

  private drawGround():void{
    const ctx=this.context;
    ctx.fillStyle='#0d1124';ctx.fillRect(0,this.groundY,this.width,this.height-this.groundY);
    ctx.strokeStyle='rgba(240,194,94,.22)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,this.groundY);ctx.lineTo(this.width,this.groundY);ctx.stroke();
    const g=ctx.createRadialGradient(this.width*.5,this.groundY,10,this.width*.5,this.groundY,this.width*.5);
    g.addColorStop(0,'rgba(60,70,130,.14)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,this.groundY,this.width,this.height-this.groundY);
  }

  private drawGrass(time:number):void{
    const ctx=this.context;
    for(const grass of this.grass){
      const sway=Math.sin(time/900+grass.phase)*(5+grass.height*.07);
      ctx.strokeStyle='rgba(20,26,52,.95)';ctx.lineWidth=grass.width;ctx.beginPath();ctx.moveTo(grass.x,this.height+4);ctx.quadraticCurveTo(grass.x+sway*.3,this.height-grass.height*.55,grass.x+sway,this.height-grass.height);ctx.stroke();
      ctx.fillStyle=grass.tip?'rgba(240,194,94,.5)':'rgba(120,130,180,.4)';ctx.beginPath();ctx.ellipse(grass.x+sway,this.height-grass.height,2.4,5.5,sway*.05,0,TAU);ctx.fill();
    }
  }

  private drawEmbersAndGusts():void{
    const ctx=this.context;
    for(const ember of this.embers){ctx.fillStyle=`rgba(${ember.color},.55)`;ctx.beginPath();ctx.arc(ember.x,ember.y,ember.radius,0,TAU);ctx.fill();}
    for(const gust of this.gusts){
      const g=ctx.createLinearGradient(gust.x,gust.y,gust.x+gust.length,gust.y);
      g.addColorStop(0,'rgba(220,230,255,0)');g.addColorStop(.5,`rgba(220,230,255,${gust.alpha})`);g.addColorStop(1,'rgba(220,230,255,0)');ctx.fillStyle=g;ctx.fillRect(gust.x,gust.y,gust.length,1.6);
    }
  }

  private shadow(x:number,width:number):void{
    this.context.fillStyle='rgba(0,0,0,.38)';this.context.beginPath();this.context.ellipse(x,this.groundY+4,width,width*.22,0,0,TAU);this.context.fill();
  }

  private drawFighter(fighter:Fighter,time:number,state:GameState,enemy:Fighter):void{
    const ctx=this.context,r=fighter.radius,elapsed=time-fighter.t0,palette=fighter.palette;
    let rotation=0,squash=1,sword=2.6,face:'idle'|'blink'|'sharp'|'dizzy'='idle',bob=0,noHat=false,noSword=false;
    switch(fighter.pose){
      case'idle':bob=Math.sin(time/620+fighter.seed)*r*.04;sword=2.6+Math.sin(time/900+fighter.seed)*.06;face=Math.sin(time/900+fighter.seed)>.985?'blink':'idle';break;
      case'enter':bob=-Math.abs(Math.sin(elapsed/130))*5*this.scale;break;
      case'stance':{const k=Math.min(1,elapsed/200);squash=1-.09*k;rotation=.06*k*fighter.facing;sword=-2.7;face='sharp';break;}
      case'lunge':case'slashWin':{const duration=fighter.pose==='lunge'?fighter.lungeDuration:140,k=Math.min(1,elapsed/duration);rotation=.14*k*fighter.facing;squash=.96;sword=-2.7+3.1*Math.min(1,elapsed/(duration*.8));face='sharp';break;}
      case'whiff':{const k=Math.min(1,elapsed/220);sword=2.6-3*Math.min(1,k*1.7);rotation=.08*fighter.facing*Math.sin(k*Math.PI);break;}
      case'stand2':sword=.6;face='sharp';rotation=.04*fighter.facing;break;
      case'fall':rotation=fighter.rot;face='dizzy';noHat=true;noSword=true;break;
    }
    const yBase=this.groundY+(fighter.pose==='fall'?fighter.fy:0);
    this.shadow(fighter.x,r*1.05);
    ctx.save();ctx.translate(fighter.x,yBase);ctx.rotate(rotation);ctx.scale(fighter.facing,1);ctx.scale(1,squash);
    const cy=-r+bob;
    const drawSword=()=>{
      const sx=-r*.05,sy=cy-r*.15,length=r*1.7,ex=sx+Math.cos(sword)*length,ey=sy+Math.sin(sword)*length;
      ctx.lineCap='round';ctx.strokeStyle='#5c1f18';ctx.lineWidth=6*this.scale;ctx.beginPath();ctx.moveTo(sx-Math.cos(sword)*r*.4,sy-Math.sin(sword)*r*.4);ctx.lineTo(sx,sy);ctx.stroke();
      const gradient=ctx.createLinearGradient(sx,sy,ex,ey);gradient.addColorStop(0,'#cfd6ea');gradient.addColorStop(1,'#ffffff');ctx.strokeStyle=gradient;ctx.lineWidth=4.5*this.scale;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(ex,ey);ctx.stroke();ctx.fillStyle='#f0c25e';ctx.beginPath();ctx.arc(sx,sy,3.6*this.scale,0,TAU);ctx.fill();
    };
    if(!noSword&&Math.cos(sword)<0)drawSword();
    ctx.fillStyle=palette.body;ctx.strokeStyle=palette.line;ctx.lineWidth=3*this.scale;ctx.beginPath();ctx.arc(0,cy,r,0,TAU);ctx.fill();ctx.stroke();
    ctx.save();ctx.beginPath();ctx.arc(0,cy,r-1.5*this.scale,0,TAU);ctx.clip();ctx.fillStyle=palette.scarf;ctx.fillRect(-r,cy+r*.28,r*2,r*.34);
    const flap=Math.sin(time/150+fighter.seed)*4*this.scale;ctx.beginPath();ctx.moveTo(-r*.9,cy+r*.4);ctx.lineTo(-r*1.5,cy+r*.3+flap);ctx.lineTo(-r*.95,cy+r*.62);ctx.closePath();ctx.fill();ctx.restore();
    const eyeColor=fighter.glow?'#ff5a44':palette.eye;if(fighter.glow){ctx.shadowColor='rgba(255,80,60,.9)';ctx.shadowBlur=10*this.scale;}ctx.fillStyle=eyeColor;ctx.strokeStyle=eyeColor;
    const eyeY=cy-r*.28;
    if(face==='dizzy'){
      ctx.lineWidth=2.6*this.scale;
      for(const ex of[r*.16,r*.5]){ctx.beginPath();ctx.moveTo(ex-4*this.scale,eyeY-4*this.scale);ctx.lineTo(ex+4*this.scale,eyeY+4*this.scale);ctx.moveTo(ex+4*this.scale,eyeY-4*this.scale);ctx.lineTo(ex-4*this.scale,eyeY+4*this.scale);ctx.stroke();}
      ctx.beginPath();ctx.arc(r*.33,cy-r*.02,4*this.scale,0,TAU);ctx.fill();
    }else{
      const ry=face==='sharp'?r*.07:face==='blink'?r*.02:r*.16;
      for(const ex of[r*.16,r*.5]){ctx.beginPath();ctx.ellipse(ex,eyeY,r*.06,Math.max(1.5*this.scale,ry),0,0,TAU);ctx.fill();}
      if(face==='sharp'){ctx.lineWidth=2.4*this.scale;ctx.beginPath();ctx.moveTo(r*.06,cy-r*.5);ctx.lineTo(r*.3,cy-r*.44);ctx.moveTo(r*.64,cy-r*.5);ctx.lineTo(r*.42,cy-r*.44);ctx.stroke();}
      ctx.lineWidth=2.4*this.scale;ctx.beginPath();if(face==='idle')ctx.arc(r*.34,cy-r*.05,4*this.scale,.2,Math.PI-.4);else{ctx.moveTo(r*.24,cy-r*.04);ctx.lineTo(r*.46,cy-r*.04);}ctx.stroke();
    }
    ctx.shadowBlur=0;
    if(!noSword&&Math.cos(sword)>=0)drawSword();
    if(!noHat){
      ctx.fillStyle=palette.hatD;ctx.strokeStyle=palette.line;ctx.lineWidth=3*this.scale;ctx.beginPath();ctx.ellipse(0,cy-r*.82,r*1.08,r*.3,0,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle=palette.hat;ctx.beginPath();ctx.moveTo(0,cy-r*1.62);ctx.quadraticCurveTo(-r*.7,cy-r*1.1,-r*1.05,cy-r*.84);ctx.quadraticCurveTo(0,cy-r*.66,r*1.05,cy-r*.84);ctx.quadraticCurveTo(r*.7,cy-r*1.1,0,cy-r*1.62);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle=palette.scarf;ctx.lineWidth=3*this.scale;ctx.beginPath();ctx.moveTo(-r*.62,cy-r*1.05);ctx.quadraticCurveTo(0,cy-r*.9,r*.62,cy-r*1.05);ctx.stroke();
    }
    ctx.restore();
    if(fighter===enemy&&['intro','wait','flash'].includes(state.state)){
      ctx.font=`${13*this.scale+8}px sans-serif`;ctx.textAlign='center';ctx.fillStyle='rgba(240,194,94,.85)';ctx.fillText(fighter.meta?.name??'',fighter.x,this.groundY-fighter.radius*2.35+fighter.fy);
    }
  }

  private drawHats(state:GameState):void{
    const ctx=this.context;
    for(const hat of state.hats){
      const alpha=clamp(1-(hat.age-.8)/.6,0,1);ctx.save();ctx.globalAlpha=alpha;ctx.translate(hat.x,hat.y);ctx.rotate(hat.rot);ctx.fillStyle=hat.palette.hat;ctx.strokeStyle=hat.palette.line;ctx.lineWidth=2*this.scale;ctx.beginPath();ctx.moveTo(0,-hat.radius*.5);ctx.lineTo(-hat.radius*.8,hat.radius*.1);ctx.quadraticCurveTo(0,hat.radius*.28,hat.radius*.8,hat.radius*.1);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    }
    ctx.globalAlpha=1;
  }

  private drawBang(time:number,state:GameState):void{
    if(!state.bangOn)return;
    const age=time-state.bangT;
    let alpha=1;
    if(state.state==='win')alpha=Math.max(0,1-age/260);
    if(state.state==='lose'&&state.lose)alpha=Math.max(0,1-(time-state.lose.t0)/420);
    if(alpha<=0){state.bangOn=false;return;}
    const ctx=this.context,cx=this.width/2+randomBetween(-2,2),cy=this.height*.30+randomBetween(-2,2),pulse=1+Math.max(0,1-age/140)*.9,size=Math.min(this.width*.26,this.height*.24)*pulse;
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='rgba(255,190,90,.8)';ctx.lineWidth=3*this.scale;
    for(let i=0;i<8;i++){const angle=i/8*TAU+age*.002;ctx.beginPath();ctx.moveTo(cx+Math.cos(angle)*size*.72,cy+Math.sin(angle)*size*.72);ctx.lineTo(cx+Math.cos(angle)*size*1.05,cy+Math.sin(angle)*size*1.05);ctx.stroke();}
    ctx.font=`800 ${size}px Georgia,serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='rgba(255,70,40,.9)';ctx.shadowBlur=30;ctx.lineWidth=size*.07;ctx.strokeStyle='#fff';ctx.lineJoin='round';ctx.strokeText('！',cx,cy);ctx.fillStyle='#ff4530';ctx.fillText('！',cx,cy);ctx.restore();ctx.textBaseline='alphabetic';
  }

  private drawFx(time:number,state:GameState):void{
    const ctx=this.context;
    for(const particle of state.particles){const alpha=1-particle.age/particle.life;ctx.fillStyle=`rgba(${particle.color},${particle.soft?alpha*.45:alpha})`;ctx.beginPath();ctx.arc(particle.x,particle.y,particle.radius,0,TAU);ctx.fill();}
    if(state.trail){
      const age=time-state.trail.t0;
      if(age<280){
        const alpha=1-age/280,trail=state.trail;ctx.strokeStyle=`rgba(255,255,245,${alpha*.95})`;ctx.lineWidth=9*this.scale*alpha+1;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(trail.x-250*this.scale,trail.y-160*this.scale);ctx.lineTo(trail.x+250*this.scale,trail.y+150*this.scale);ctx.stroke();ctx.strokeStyle=`rgba(240,194,94,${alpha*.6})`;ctx.lineWidth=2.5*this.scale;ctx.beginPath();ctx.moveTo(trail.x-250*this.scale,trail.y-160*this.scale);ctx.lineTo(trail.x+250*this.scale,trail.y+150*this.scale);ctx.stroke();
      }else state.trail=null;
    }
    for(const floating of state.floats){const alpha=1-floating.age/.95;ctx.font=`${(floating.big?24:15)*this.scale}px sans-serif`;ctx.textAlign='center';ctx.fillStyle=floating.color;ctx.globalAlpha=alpha;ctx.fillText(floating.text,floating.x,floating.y-floating.age*60*this.scale);ctx.globalAlpha=1;}
  }
}

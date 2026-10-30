import {LIFE_LAYOUT as L} from './life-layout.js';

// Each prop has a physical home and a single owner. Activities end before changing
// location; no cargo is spawned by walking, and no cosmetic handoff affects progress.
const smooth=u=>{u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);};
export function residentSeat(index){
 const chair=index===6?L.music.seat:L.coffee.seats[index===7?1:0],target=index===6?L.music.cabinet:L.coffee.table;
 const yaw=Math.atan2(target[0]-chair[0],target[2]-chair[2]),side=index===6?-1:(Math.sin(yaw)>0?-1:1);
 return{chair,yaw,stand:[chair[0]+Math.cos(yaw)*side*L.seating.exitDistance,chair[2]-Math.sin(yaw)*side*L.seating.exitDistance]};
}
export function createResidentLife({actors,setFloorGoal,stepPath,clearance=.58,canMove=()=>true}) {
  const music={remaining:45,angle:0,wind:0};let coffeeWalker=null;
  const schedules={
    5:[['coffee-pick',1.1],['coffee-sip',7],['coffee-place',1.1],['coffee-read',4],['rise',L.seating.transitionSeconds],['display-walk',0],['display-look',4],['far-plant-walk',0],['plant-look',3],['coffee-walk',0],['sit',L.seating.transitionSeconds],['coffee-chat',5]],
    6:[['music-listen',14],['rise',L.seating.transitionSeconds],['music-walk',0],['record-check',2.5],['music-wind',2.8],['music-seat-walk',0],['sit',L.seating.transitionSeconds],['music-listen',28]],
    7:[['coffee-chat',9],['coffee-pick',1.1],['coffee-sip',15],['coffee-place',1.1],['rise',L.seating.transitionSeconds],['plant-walk',0],['plant-look',9],['coffee-walk',0],['sit',L.seating.transitionSeconds]]
  };
  for(const a of actors.filter(a=>a.index>=5)){const seat=residentSeat(a.index);a.p=[seat.chair[0],seat.chair[2]];a.yaw=seat.yaw;a.life={step:0,time:0,cycles:0,action:schedules[a.index][0][0],seated:1,cup:0};}
  function update(a,dt){
    const l=a.life,list=schedules[a.index];
    if(a.index===6){music.remaining=Math.max(0,music.remaining-dt);music.angle+=dt*8.168*Math.min(1,music.remaining/3);}
    const [action,duration]=list[l.step];l.action=action;l.time+=dt;a.stage='life';a.moving=false;a.r.activity='';
    const seat=residentSeat(a.index);
    let done=l.time>=duration,goal=null;
    if(action.endsWith('-walk')){
      if(a.index!==6){
        if(coffeeWalker!==null&&coffeeWalker!==a.index){a.r.activity='在咖啡桌旁休息，等夥伴通過';a.r.state='resting';l.time=0;return;}
        coffeeWalker=a.index;
      }
      goal=action==='display-walk'?[-3.30,1.20]:action==='far-plant-walk'?[-5.72,1.20]:action==='plant-walk'?[-5.0,1.10]:action==='music-walk'?L.music.operator.filter((_,i)=>i!==1):seat.stand;
      const returning=action==='coffee-walk'||action==='music-seat-walk';
      if(!l.align){setFloorGoal(a,goal);done=stepPath(a,dt,.65,.015);if(done&&returning){l.align=true;a.path=[];a.goal=null;}}
      if(returning&&l.align){
        // Navigation lands on a grid point. Walk the final centimetres to the
        // exact chair-side anchor before bending; do not snap or bend inside it.
        const dx=seat.stand[0]-a.p[0],dz=seat.stand[1]-a.p[1],distance=Math.hypot(dx,dz),k=distance<1e-9?1:Math.min(1,dt*.65/distance);
        const next=[a.p[0]+dx*k,a.p[1]+dz*k];done=false;
        if(canMove(a,next)&&!actors.some(b=>b!==a&&Math.abs(b.y-a.y)<.75&&Math.hypot(next[0]-b.p[0],next[1]-b.p[1])<clearance-.001)){
          a.p=next;a.moving=distance>1e-8;if(a.moving)a.yaw=Math.atan2(dx,dz);done=k===1;if(done)l.approach=[...a.p];
        }
      }
      l.seated=0;a.r.activity=action.includes('music')?'走向留聲機與聆聽座位':'走向休息區';
    }else{
      a.yaw=(action==='rise'||action==='sit'||l.seated>0)?seat.yaw:a.index===6?Math.atan2(L.music.cabinet[0]-a.p[0],L.music.cabinet[2]-a.p[1]):Math.atan2(L.coffee.table[0]-a.p[0],L.coffee.table[2]-a.p[1]);
      if(action==='rise'||action==='sit'){
        if(a.index!==6&&coffeeWalker!==null&&coffeeWalker!==a.index){l.time=Math.max(0,l.time-dt);a.r.activity='等夥伴通過後再起身';a.r.state='resting';return;}
        const u=Math.min(1,l.time/L.seating.transitionSeconds);
        // Leave the cushion sideways before lowering the legs. On return, bend
        // outside the chair first, then slide onto it; never stand through it.
        const shift=action==='rise'?smooth(u/.55):1-smooth((u-.45)/.55);
        const outside=action==='sit'?(l.approach||seat.stand):seat.stand;
        const next=[seat.chair[0]+(outside[0]-seat.chair[0])*shift,seat.chair[2]+(outside[1]-seat.chair[2])*shift];
        if(!canMove(a,next)||actors.some(b=>b!==a&&Math.abs(b.y-a.y)<.75&&Math.hypot(next[0]-b.p[0],next[1]-b.p[1])<clearance-.001)){
          l.time=Math.max(0,l.time-dt);a.r.activity='留出座位旁的通道，稍等夥伴通過';a.r.state='resting';return;
        }
        if(a.index!==6)coffeeWalker=a.index;
        a.p=next;l.seated=action==='rise'?1-smooth((u-.55)/.45):smooth(u/.45);
        a.r.activity=action==='rise'?'從座椅側邊起身':'在座椅旁屈膝坐下';
      }
      if(action==='coffee-pick'){l.cup=Math.min(1,l.time/1.1);a.r.activity='從桌上拿起咖啡杯';}
      if(action==='coffee-sip'){l.cup=1;a.r.activity='坐著喝咖啡，享受休息時光';}
      if(action==='coffee-place'){l.cup=1-Math.min(1,l.time/1.1);a.r.activity='將咖啡杯放回杯碟';}
      if(action==='coffee-read')a.r.activity='坐在咖啡桌旁閱讀工坊筆記';
      if(action==='coffee-chat')a.r.activity=actors[a.index===5?7:5].life.seated>.5?'坐在咖啡桌旁與夥伴聊聊天':'坐在咖啡桌旁閱讀工坊筆記';
      if(action==='display-look'){a.yaw=Math.atan2(-4.0-a.p[0],2.08-a.p[1]);a.r.activity='走到圖卡櫃前，看看整理好的圖卡';}
      if(action==='plant-look'){a.yaw=-2.8;a.r.activity='停下腳步欣賞樹與盆栽';}
      if(action==='record-check')a.r.activity='查看唱片與留聲機唱針';
      if(action==='music-wind'){music.remaining=60;music.wind+=dt*5;a.r.activity='轉動留聲機手柄上發條';}
      if(action==='music-listen')a.r.activity=music.remaining>0?'坐著聆聽留聲機音樂':'坐在音樂角休息，看看唱片';
    }
    a.r.state=a.moving?'returning':'resting';
    if(done){l.align=false;if(action==='sit'&&a.index!==6)coffeeWalker=null;l.step=(l.step+1)%list.length;if(!l.step)l.cycles++;l.time=0;a.goal=null;a.path=[];}
  }
  return {music,update};
}

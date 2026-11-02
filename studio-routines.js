import {LIFE_LAYOUT as L} from './life-layout.js';

// Work has a visible destination and object of attention. No cosmetic routine
// takes the earned component or counts as a delivery. Each studio stays local.
export const STUDIO_ROUTINES = [
  [
    {at:[-4.18,-.78],look:[-3.75,4.85,-1.9],kind:'observe',seconds:3.6,text:'走到鐘面前觀察指針與方位'},
    {at:[-3.74,.98],look:[-3.55,3.75,-.05],kind:'observe',seconds:3.4,text:'繞到木模前方，比對立體形狀'},
    {at:[-2.64,-.34],look:[-3.75,4.85,-1.9],kind:'observe',seconds:2.6,text:'換個角度查看空間配置'},
    {at:L.couriers[0].pickup,look:L.couriers[0].source,kind:'inspect',seconds:2.8,text:'檢查備料座上的組件盒'}
  ],
  [
    {at:[3.30,-.78],look:[4.22,3.95,-.02],kind:'observe',seconds:3.2,text:'走到標本後方，比對成對細節'},
    {at:[4.18,.98],look:[4.22,3.95,-.02],kind:'observe',seconds:3.8,text:'從展示臺前方查看標本差異'},
    {at:[2.64,.32],look:[3.12,4.05,.05],kind:'observe',seconds:2.7,text:'查看放大鏡與觀察工具'},
    {at:L.couriers[1].pickup,look:L.couriers[1].source,kind:'inspect',seconds:2.6,text:'檢查已整理好的精密組件盒'}
  ],
  [
    {at:[-2.86,1.20],look:[-4.0,.99,2.08],kind:'observe',seconds:3.8,text:'走到圖卡櫃前，記住材料順序'},
    {at:[-3.52,-.56],look:[-3.85,1.55,-1.38],kind:'observe',seconds:3.4,text:'回到檔案櫃旁核對分類標籤'},
    {at:[-3.08,.32],look:[-4.40,.8,.54],kind:'observe',seconds:2.4,text:'停下來看看咖啡角與夥伴'},
    {at:L.couriers[2].pickup,look:L.couriers[2].source,kind:'inspect',seconds:2.5,text:'檢查備料座上的記憶組件盒'}
  ],
  [
    {at:[3.08,1.20],look:[4.34,1.2,2.02],kind:'observe',seconds:3.4,text:'走到分類臺前查看彩木與圖形'},
    {at:[3.52,-.56],look:[4.22,1.76,-1.86],kind:'observe',seconds:3.5,text:'回到規則板前核對分類條件'},
    {at:[3.74,.32],look:[4.65,1.25,-.06],kind:'observe',seconds:2.6,text:'到音樂角旁看看留聲機'},
    {at:L.couriers[3].pickup,look:L.couriers[3].source,kind:'inspect',seconds:2.7,text:'檢查備料座上的分類組件盒'}
  ]
];

export function createStudioRoutines({actors,setFloorGoal,stepPath}){
  for(const a of actors.slice(0,4))a.routine={step:0,phase:'walk',time:0,waiting:0,cycles:0,visits:0,distance:0,active:false,kind:'walk',look:null};
  function interrupt(a){a.routine.active=false;a.routine.phase='walk';a.routine.time=0;a.routine.waiting=0;a.r.activity='';}
  function update(a,dt){
    const q=a.routine,list=STUDIO_ROUTINES[a.index],stop=list[q.step];q.active=true;a.stage='working';
    if(q.phase==='walk'){
      q.kind='walk';q.look=null;const before=[...a.p];setFloorGoal(a,stop.at);
      const arrived=stepPath(a,dt,.73,.015),moved=Math.hypot(a.p[0]-before[0],a.p[1]-before[1]);q.distance+=moved;
      a.r.state=a.moving?'returning':'observing';a.r.activity=a.moving?stop.text:'留出通道，稍等夥伴通過';
      q.waiting=moved>.001?0:q.waiting+dt;
      if(arrived){q.phase='act';q.time=0;q.visits++;q.waiting=0;a.goal=null;a.path=[];}
      else if(q.waiting>3.5){next(a);}
    }else{
      a.moving=false;q.kind=stop.kind;q.look=stop.look;q.time+=dt;
      a.yaw=Math.atan2(stop.look[0]-a.p[0],stop.look[2]-a.p[1]);
      a.r.state=stop.kind==='inspect'?'inspecting':'observing';a.r.activity=stop.text;
      if(q.time>=stop.seconds+.25*Math.sin(q.cycles+a.index))next(a);
    }
  }
  function next(a){const q=a.routine;q.step=(q.step+1)%STUDIO_ROUTINES[a.index].length;if(!q.step)q.cycles++;q.phase='walk';q.time=0;q.waiting=0;a.goal=null;a.path=[];}
  return {update,interrupt};
}

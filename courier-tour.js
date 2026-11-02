// 小郵's social rounds. Only authored walking/looking anchors; no score or cargo changes.
export const COURIER_ROOMS = [
 {id:'memory',floor:1,name:'工作記憶',at:[-4.40,-.78],look:[-3.85,-1.38],resident:2},
 {id:'executive',floor:1,name:'語意判斷',at:[4.40,-.78],look:[4.22,-1.38],resident:3},
 {id:'spatial',floor:2,name:'空間認知',at:[-4.40,-.78],look:[-3.75,-1.90],resident:0},
 {id:'attention',floor:2,name:'視覺注意力',at:[4.18,-.78],look:[4.22,-.02],resident:1}
];

export function createCourierTour({actors,setFloorGoal,stepPath,requestElevator,elevator,lanes,clearGoal}) {
 const a=actors[4];a.tour={floor:null,step:0,round:0,room:null,lane:null,waiting:0,distance:0,visits:Object.fromEntries(COURIER_ROOMS.map(r=>[r.id,0]))};
 const center=[0,-.42];
 function release(){if(a.tour.lane!==null){const lane=lanes[a.tour.lane];if(lane.owner===4)lane.owner=null;a.tour.lane=null;}}
 function reserve(side){
  const q=a.tour,index=side<0?0:1,lane=lanes[index];if(q.lane===index)return true;
  if(lane.owner!==null||lane.queue.length||actors.some(b=>b.index<4&&b.index%2===index&&((b.floor===a.floor&&(b.priorityDelivery||!['working','resting'].includes(b.stage)))||(a.floor===2&&b.index<2&&b.stage==='stair-up'))))return false;
  lane.owner=4;q.lane=index;return true;
 }
 function next(stage){a.stage=stage;a.elapsed=0;clearGoal(a);}
 function walk(at,dt){const before=[...a.p];setFloorGoal(a,at);const done=stepPath(a,dt,.85,.06),distance=Math.hypot(a.p[0]-before[0],a.p[1]-before[1]);a.tour.distance+=distance;a.tour.waiting=distance>.001?0:a.tour.waiting+dt;return done;}
 function update(dt){
  const q=a.tour,r=a.r;
  if(a.stage==='working'){r.state='observing';r.activity='看看連通廊，準備下樓拜訪工作室';a.moving=false;if(a.elapsed>=2.6)next('to-lift-2f');return;}
  if(a.stage==='to-lift-2f'||a.stage==='to-lift-1f'){
   r.state='walking';r.activity='走向升降臺，準備拜訪另一樓的夥伴';
   const wait=a.floor===2?elevator.wait2F:elevator.wait1F;
   if(walk([wait[0],wait[2]],dt)){release();requestElevator(a,'tour-select');}return;
  }
  if(a.stage==='tour-select'){
   if(q.floor!==a.floor){q.floor=a.floor;q.step=0;q.round++;}
   const rooms=COURIER_ROOMS.filter(room=>room.floor===a.floor);if(Math.floor((q.round-1)/2)%2)rooms.reverse();
   if(q.step>=rooms.length){next(a.floor===1?'tour-center':'to-lift-2f');return;}
   q.room=rooms[q.step];q.waiting=0;q.hostReady=false;next('tour-out');return;
  }
  if(a.stage==='tour-out'){
   const stop=q.room,side=Math.sign(stop.at[0]);r.state='walking';r.activity='走進'+stop.name+'工作室，拜訪夥伴';
   if((Math.abs(a.p[0])<.8&&q.lane===null&&!q.hostReady)||(Math.abs(a.p[0])<2.9&&!reserve(side))){r.state='observing';r.activity='在入口旁等候，讓零件配送先通過';a.moving=false;return;}
   const approach=a.floor===1?[side*2.86,-.78]:[side*2.86,-1.00];
   const target=side*a.p[0]<(a.floor===1?2.80:2.58)?approach:stop.at;
   const arrived=walk(target,dt)&&target===stop.at;
   if(q.waiting>1.5&&Math.abs(a.p[0])<.8){release();clearGoal(a);q.waiting=0;}
   if(arrived){release();q.visits[stop.id]++;next('tour-visit');}
   return;
  }
  if(a.stage==='tour-visit'){
   const stop=q.room;r.state='observing';r.activity='在'+stop.name+'工作室看看工作內容，與夥伴碰面';a.moving=false;
   const friend=actors[stop.resident],look=friend.floor===a.floor&&Math.abs(friend.p[0])>2.9?friend.p:stop.look;
   a.yaw=Math.atan2(look[0]-a.p[0],look[1]-a.p[1]);
   if(a.elapsed>=3.5||(a.floor===1&&actors.some(b=>b.index<4&&b.priorityDelivery)&&a.elapsed>=1.0))next('tour-return');return;
  }
  if(a.stage==='tour-return'){
   const side=Math.sign(q.room.at[0]);r.state='returning';r.activity='回到連通處，準備拜訪下一間工作室';
   if(side*a.p[0]>.75&&((q.lane===null&&!q.hostReady)||!reserve(side))){a.moving=false;r.state='observing';r.activity='在房內稍候，讓搬零件的夥伴先通過';return;}
   const arrived=walk(center,dt);if(Math.abs(a.p[0])<=.75)release();
   if(arrived){release();q.step++;next('tour-select');}return;
  }
  if(a.stage==='tour-center'){
   r.state='observing';r.activity='看看中央組裝作品，稍後再上樓';a.moving=false;a.yaw=0;
   if(a.elapsed>=3.2){r.inspections=(r.inspections||0)+1;next('to-lift-1f');}return;
  }
 }
 function hostUpdate(host,dt){
  const q=a.tour,stop=q.room;
  if(!stop||host.index!==stop.resident||host.floor!==a.floor||!['tour-out','tour-visit','tour-return'].includes(a.stage))return false;
  // Wait outside the music corner until its listener has a long seated interval.
  if(stop.id==='executive'&&a.stage==='tour-out'&&Math.abs(a.p[0])<.8&&q.lane===null){const l=actors[6].life;if(l.seated<.99||l.step!==7||l.time>8){q.hostReady=false;return false;}}
  const points=[[-2.86,-.34],[2.86,.32],[-2.86,1.20],[2.86,1.20]];
  const point=points[host.index],side=host.index%2===0?-1:1;
  const target=host.floor===1&&side*host.p[0]>2.96&&host.p[1]<.4?[side*2.86,-.56]:point;
  host.r.activity='留出通道，在工作室裡與小郵碰面';
  setFloorGoal(host,target);q.hostReady=stepPath(host,dt,.80,.06)&&target===point;host.r.state=q.hostReady?'observing':'walking';
  if(q.hostReady){host.moving=false;host.yaw=Math.atan2(a.p[0]-host.p[0],a.p[1]-host.p[1]);}
  return true;
 }
 return {update,hostUpdate};
}

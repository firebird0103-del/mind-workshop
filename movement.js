import {createStudioRoutines} from './studio-routines.js';
import {LANDING_LAYOUT} from './landing-layout.js';
import {LIFE_LAYOUT} from './life-layout.js';
import {createResidentLife} from './resident-life.js';
// Multi-floor obstacle avoidance, stair climbing, central elevator state machine,
// real doorway locks, and 360-degree slot-reserved resident movement for Brain Workshop v3.0.
import {
  WORKSHOP,
  BALCONIES,
  CENTRAL_WORKBENCH,
  STAIRS,
  ELEVATOR,
  DOORS,
  OBSTACLES_1F,
  OBSTACLES_2F,
  sampleStair
} from './layout.js';

// Foot clearance against furniture is separate from the wider character-to-character envelope.
export const ACTOR_RADIUS = 0.15;
export const RESIDENT_CLEARANCE = 0.58;

function pointSegmentDistance(p, a, b) {
  const dx = b[0]-a[0], dz = b[1]-a[1];
  const t = Math.max(0, Math.min(1, ((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz || 1)));
  return Math.hypot(p[0]-a[0]-t*dx, p[1]-a[1]-t*dz);
}

function pointInPolygon([x,z],poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    if(pointSegmentDistance([x,z],a,b)<1e-7)return true;
    if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
export function upperFloorSupported(p){
  const at=([x,z])=>(x>=-5.25&&x<=-2.28&&z>=-2.05&&z<=.60)||(x>=2.28&&x<=5.42&&z>=-2.05&&z<=.60)||BALCONIES.some(b=>Math.hypot(x-b.cx,z-b.cz)<=b.radius-.003)||pointInPolygon([x,z],LANDING_LAYOUT.outline);
  const m=LANDING_LAYOUT.footMargin;
  return [[0,0],[m,0],[-m,0],[0,m],[0,-m]].every(([dx,dz])=>at([p[0]+dx,p[1]+dz]));
}

export function isClearOnFloor([x, z], floor = 1) {
  if (floor === 1) {
    if (Math.abs(x) > 6.45 || z < -1.85 || z > 4.12) return false;
    if (z>2.74 && Math.hypot(x,z-1.68)>3.24-ACTOR_RADIUS) return false;
    for (const ob of OBSTACLES_1F) {
      if (ob.shape === 'circle') {
        if (Math.hypot(x-ob.x,z-ob.z) < ob.radius+ACTOR_RADIUS) return false;
        continue;
      }
      if (
        x > ob.x - ob.hx - ACTOR_RADIUS &&
        x < ob.x + ob.hx + ACTOR_RADIUS &&
        z > ob.z - ob.hz - ACTOR_RADIUS &&
        z < ob.z + ob.hz + ACTOR_RADIUS
      ) {
        return false;
      }
    }
    return true;
  }
  if(!upperFloorSupported([x,z]))return false;
  for (const ob of OBSTACLES_2F) {
    if(ob.shape==='circle'){if(Math.hypot(x-ob.x,z-ob.z)<ob.radius+ACTOR_RADIUS)return false;continue;}
    if (
      x > ob.x - ob.hx - ACTOR_RADIUS &&
      x < ob.x + ob.hx + ACTOR_RADIUS &&
      z > ob.z - ob.hz - ACTOR_RADIUS &&
      z < ob.z + ob.hz + ACTOR_RADIUS
    ) {
      return false;
    }
  }
  return true;
}

function crossesRect(a, b, x0, x1, z0, z1) {
  let lo = 0, hi = 1;
  for (const [v, w, min, max] of [[a[0], b[0], x0, x1], [a[1], b[1], z0, z1]]) {
    const d = w - v;
    if (Math.abs(d) < 1e-12) {
      if (v <= min || v >= max) return false;
    } else {
      const p = (min - v) / d, q = (max - v) / d;
      lo = Math.max(lo, Math.min(p, q));
      hi = Math.min(hi, Math.max(p, q));
      if (lo >= hi) return false;
    }
  }
  return hi > 0 && lo < 1;
}

export function segmentClearOnFloor(a, b, floor = 1) {
  if (!isClearOnFloor(a, floor) || !isClearOnFloor(b, floor)) return false;
  const list = floor === 1 ? OBSTACLES_1F : OBSTACLES_2F;
  for (const ob of list) {
    if (ob.shape === 'circle') {
      if (pointSegmentDistance([ob.x,ob.z],a,b) < ob.radius+ACTOR_RADIUS) return false;
      continue;
    }
    if (crossesRect(a, b, ob.x - ob.hx - ACTOR_RADIUS, ob.x + ob.hx + ACTOR_RADIUS, ob.z - ob.hz - ACTOR_RADIUS, ob.z + ob.hz + ACTOR_RADIUS)) {
      return false;
    }
  }
  return true;
}

export function createFloorNav(floor = 1) {
  const step = 0.22;
  const nodes = [];
  const byGrid = new Map();
  for (let iz = 0; iz <= 29; iz++) {
    for (let ix = 0; ix <= 60; ix++) {
      const p = [-6.6 + ix * step, -2.1 + iz * step];
      if (isClearOnFloor(p, floor)) {
        const n = {id: nodes.length, ix, iz, p, edges: []};
        nodes.push(n);
        byGrid.set(ix + ',' + iz, n);
      }
    }
  }
  for (const n of nodes) {
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nb = byGrid.get((n.ix + dx) + ',' + (n.iz + dz));
      if (nb && segmentClearOnFloor(n.p, nb.p, floor)) {
        n.edges.push(nb);
      }
    }
  }
  function nearest(p, requireLineOfSight = false) {
    let best = null, bestD = Infinity;
    for (const n of nodes) {
      const d = Math.hypot(n.p[0] - p[0], n.p[1] - p[1]);
      if (d < bestD && (!requireLineOfSight || segmentClearOnFloor(p, n.p, floor))) {
        best = n;
        bestD = d;
      }
    }
    return best || nodes.reduce((acc, n) => (Math.hypot(n.p[0] - p[0], n.p[1] - p[1]) < Math.hypot(acc.p[0] - p[0], acc.p[1] - p[1]) ? n : acc), nodes[0]);
  }
  function route(from, to, blockers = [], allowed=()=>true) {
    const blocked = p => blockers.some(ob => Math.hypot(p[0]-ob[0], p[1]-ob[1]) < (ob.clearance??RESIDENT_CLEARANCE)+0.015);
    // A nearby occupied grid node is not a valid start. Pick a reachable free node;
    // otherwise two legally spaced actors can both get stuck trying to snap into each other.
    const candidates = nodes.filter(n => allowed(n.p) && !blocked(n.p) &&
      segmentClearOnFloor(from,n.p,floor) &&
      blockers.every(ob => pointSegmentDistance(ob,from,n.p) >= (ob.clearance??RESIDENT_CLEARANCE)-1e-6));
    const a = candidates.reduce((best,n) => !best || Math.hypot(n.p[0]-from[0],n.p[1]-from[1]) < Math.hypot(best.p[0]-from[0],best.p[1]-from[1]) ? n : best,null);
    const b = nearest(to);
    if (!a || !b || !allowed(b.p) || blocked(b.p)) return [];
    if (a === b) return [[...a.p]];
    const open = [a];
    const cost = new Map([[a.id, 0]]);
    const prior = new Map();
    const closed = new Set();
    while (open.length) {
      open.sort((x, y) => (cost.get(x.id) + Math.hypot(x.p[0] - b.p[0], x.p[1] - b.p[1])) - (cost.get(y.id) + Math.hypot(y.p[0] - b.p[0], y.p[1] - b.p[1])));
      const cur = open.shift();
      if (closed.has(cur.id)) continue;
      if (cur === b) {
        const path = [cur.p];
        let at = cur;
        while (prior.has(at.id)) {
          at = prior.get(at.id);
          path.push(at.p);
        }
        path.reverse();
        return path.map(pt => [...pt]);
      }
      closed.add(cur.id);
      for (const e of cur.edges) {
        if (!allowed(e.p) || closed.has(e.id) || blocked(e.p) || blockers.some(ob => pointSegmentDistance(ob, cur.p, e.p) < (ob.clearance??RESIDENT_CLEARANCE)+0.015)) continue;
        const c = cost.get(cur.id) + Math.hypot(cur.p[0] - e.p[0], cur.p[1] - e.p[1]);
        if (c < (cost.get(e.id) ?? Infinity)) {
          cost.set(e.id, c);
          prior.set(e.id, cur);
          open.push(e);
        }
      }
    }
    return [];
  }
  function escape(from,goal,blockers,avoid,allowed=()=>true){
    let best=null,score=Infinity;const initial=Math.hypot(from[0]-avoid[0],from[1]-avoid[1]);
    for(const n of nodes){const d=Math.hypot(n.p[0]-from[0],n.p[1]-from[1]);if(!allowed(n.p)||d<.30||d>1.10||Math.hypot(n.p[0]-avoid[0],n.p[1]-avoid[1])<Math.max(1.0,initial+.20))continue;
      if(!segmentClearOnFloor(from,n.p,floor)||blockers.some(ob=>pointSegmentDistance(ob,from,n.p)<(ob.clearance??RESIDENT_CLEARANCE)-1e-6))continue;
      const value=d+1.5*Math.hypot(n.p[0]-goal[0],n.p[1]-goal[1]);if(value<score){best=n;score=value;}}
    return best?[[...best.p]]:[];
  }
  return {route,escape,snap:p=>nearest(p)?.p||[...p]};
}

export function createWorkshopNavigation() {
  const nav1 = createFloorNav(1);
  const nav2 = createFloorNav(2);
  return {
    nav1,
    nav2,
    isClearOnFloor,
    segmentClearOnFloor
  };
}

export function createWorkshopTown(residents, nav, {dynamicObstacles=()=>[]}={}) {
  const doors = new Map(DOORS.map(d => [d.id, {...d, angle: 0, owner: null}]));
  const elevator = {
    floor: 2,
    y: WORKSHOP.floor2Y,
    targetFloor: 2,
    state: 'idle',
    owner: null,
    timer: 0,
    queue: []
  };

  // Well-spaced initial positions & staggered schedules so the central atrium is spacious and never crowded!
  const initialConfigs = [
    // 0: 小時 (Spatial 2F Left - behind the polyhedron worktable)
    {floor: 2, pos: [-3.55, -1.02], homePos: [-3.55, -1.02], homeFloor: 2, workPos: [-4.25, -0.55], transport: 'stair-left', deliverySpot: CENTRAL_WORKBENCH.deliverySpots[0], initDelay: -1.0},
    // 1: 阿鏡 (Attention 2F Right - beside the giant magnifier)
    {floor: 2, pos: [2.68, -0.52], homePos: [2.68, -0.52], homeFloor: 2, workPos: [3.65, -0.78], transport: 'stair-right', deliverySpot: CENTRAL_WORKBENCH.deliverySpots[1], initDelay: -6.5},
    // 2: 芽芽 (Memory 1F Left - examining memory cards in the green studio)
    {floor: 1, pos: [-3.42, -0.57], homePos: [-3.42, -0.57], homeFloor: 1, workPos: [-3.55, 0.0], transport: 'door-memory', deliverySpot: CENTRAL_WORKBENCH.deliverySpots[2], initDelay: -12.0},
    // 3: 方方 (Switch 1F Right - sorting geometric shapes in the purple studio)
    {floor: 1, pos: [3.42, -0.57], homePos: [3.42, -0.57], homeFloor: 1, workPos: [3.05, 0.0], transport: 'door-switch', deliverySpot: CENTRAL_WORKBENCH.deliverySpots[3], initDelay: -17.5},
    // 4: 小郵 (Elevator operator - starting on 2F bridge / elevator cabin)
    {floor: 2, pos: [-0.45, -0.82], homePos: [-0.88, -1.0], homeFloor: 2, workPos: [0.88, -1.0], transport: 'elevator', deliverySpot: CENTRAL_WORKBENCH.deliverySpots[4], initDelay: -3.0},
    // 5: 朵朵 (Central Workbench Left Assembler - clear of workbench rim & push-cart)
    {floor: 1, pos: [-5.02, 0.52], homePos: [-5.02, 0.52], homeFloor: 1, workPos: [-5.02, 0.52], transport: 'atrium', deliverySpot: CENTRAL_WORKBENCH.deliverySpots[5], initDelay: -2.0},
    // 6: 點點 (Central Workbench Right Assembler - clear of workbench rim & cat-crate)
    {floor: 1, pos: [5.64, 0.24], homePos: [5.64, 0.24], homeFloor: 1, workPos: [3.97, -0.06], transport: 'atrium', deliverySpot: CENTRAL_WORKBENCH.deliverySpots[6], initDelay: -7.5},
    // 7: 圓圓 (Rear & Terrace Courier - stands in open atrium at z = 0.28, clear of both elevator gate and central table)
    {floor: 1, pos: [-3.70, 0.52], homePos: [-3.70, 0.52], homeFloor: 1, workPos: [-3.70, 0.52], transport: 'atrium', deliverySpot: CENTRAL_WORKBENCH.deliverySpots[7], initDelay: -11.0}
  ];

  const actors = residents.map((r, i) => {
    const cfg = initialConfigs[i];
    const floorNav = cfg.floor === 1 ? nav.nav1 : nav.nav2;
    const snapped = floorNav.snap(cfg.pos);
    return {
      r,
      index: i,
      floor: cfg.floor,
      p: [...snapped],
      y: cfg.floor === 1 ? WORKSHOP.floor1Y : WORKSHOP.floor2Y,
      yaw: i === 5 ? 0.65 : i === 6 ? -0.65 : i === 7 ? 0.25 : (i % 2 === 0 ? 0.35 : -0.35),
      moving: false,
      stage: 'working',
      elapsed: cfg.initDelay ?? -i * 2.5,
      path: [],
      goal: null,
      stairSide: 0,
      stairT: 0,
      stairDir: 0,
      doorSession: null,
      usingElevator: false,
      priorityDelivery: false,
      priorityPartName: null,
      parcel: {state:'source',progress:0,cycle:0},
      yieldTimer: 0,
      replanDelay: 0,
      blockedSeconds: 0,
      cfg
    };
  });

  // The side passages between stairs, doors and the round table are single-file.
  // Reserve an entire out-and-back trip so opposing traffic cannot deadlock inside a passage.
  const lanes = [{owner:null, queue:[]}, {owner:null, queue:[]}];
  function acquireLane(a) {
    if (a.index>3) return true;
    const lane=lanes[a.index%2];
    if (lane.owner===a.index) return true;
    if(a.priorityDelivery){
      const owner=actors[lane.owner];
      // An upstairs courier still approaching its stair has not entered the shared ground passage.
      if(owner&&!owner.priorityDelivery&&owner.floor===2&&owner.stage==='to-stair-top'){
        lane.owner=null;owner.stage='working';owner.elapsed=0;owner.goal=null;owner.path=[];
      }
      lane.queue=lane.queue.filter(id=>id!==a.index);lane.queue.unshift(a.index);
    }else if (!lane.queue.includes(a.index)) lane.queue.push(a.index);
    if (lane.owner===null && lane.queue[0]===a.index) {
      lane.owner=lane.queue.shift();return true;
    }
    return false;
  }
  function releaseLane(a) {
    if (a.index<4 && lanes[a.index%2].owner===a.index) lanes[a.index%2].owner=null;
  }

  function blockersFor(a) {
    const floorY = a.floor === 1 ? WORKSHOP.floor1Y : WORKSHOP.floor2Y;
    return [...actors.filter(b=>b!==a&&Math.abs(b.y-floorY)<.70).map(b=>b.p),
      ...dynamicObstacles().filter(b=>b.y<floorY+.94&&b.y+.58>floorY).map(b=>Object.assign([...b.p],{clearance:b.clearance??.70}))];
  }

  function canMove(a, next, nextY = a.y) {
    return actors.every(b => {
      if (b === a || Math.min(a.y, nextY)-b.y > 0.75 || b.y-Math.max(a.y, nextY) > 0.75) return true;
      return pointSegmentDistance(b.p, a.p, next) >= RESIDENT_CLEARANCE-1e-6;
    })&&dynamicObstacles().every(b=>{if(b.y>=Math.max(a.y,nextY)+.94||b.y+.58<=Math.min(a.y,nextY))return true;return pointSegmentDistance(b.p,a.p,next)>=(b.clearance??.70)-1e-6;});
  }

  function allowedFor(a){
    if(a.index<4){const side=a.index%2===0?-1:1;if(a.routine?.active)return([x])=>side*x>=(a.floor===2?2.50:2.64)-1e-6;if(a.floor===2)return([x])=>side*x>=1.55;
      if(a.index>=2)return([x,z])=>side*x>=.88&&side*x<=6.45&&z<=2.10;
      return([x,z])=>side*x>=.75&&side*x<=2.16&&z>=.74;}
    if(a.index===4)return a.floor===2?([x])=>Math.abs(x)<=1.10:([x,z])=>Math.abs(x)<=.70&&z<=.35;
    return a.index===6?([x,z])=>x>=3.65&&z<.85:([x,z])=>x<=-3.30&&z>-.25&&z<1.35;
  }
  function replan(a) {
    if (!a.goal) return;
    const floorNav = a.floor === 1 ? nav.nav1 : nav.nav2;
    const blockers=blockersFor(a);a.path=floorNav.route(a.p,a.goal,blockers,allowedFor(a));
    if(!a.path.length&&a.floor===1&&a.p[0]>2.5&&a.p[1]<1.50){
      const nearby=dynamicObstacles().filter(b=>Math.abs(b.y-a.y)<.70&&Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1])<1.8).sort((x,y)=>Math.hypot(a.p[0]-x.p[0],a.p[1]-x.p[1])-Math.hypot(a.p[0]-y.p[0],a.p[1]-y.p[1]));
      if(nearby[0])a.path=floorNav.escape(a.p,a.goal,blockers,nearby[0].p,allowedFor(a));}
    a.replanDelay = 0.55 + a.index*0.035;
  }

  function setFloorGoal(a, targetXZ) {
    const floorNav = a.floor === 1 ? nav.nav1 : nav.nav2;
    const goal = floorNav.snap(targetXZ);
    if (a.goal && Math.hypot(a.goal[0]-goal[0], a.goal[1]-goal[1]) < 0.1) return;
    a.goal = [...goal];
    a.replanDelay = 0;
    replan(a);
  }

  function stepPath(a, dt, speed = 0.88, tolerance = .10) {
    let budget = dt*speed;
    a.moving = false;
    if (!a.path.length && a.goal && Math.hypot(a.p[0]-a.goal[0], a.p[1]-a.goal[1]) > tolerance && a.replanDelay <= 0) replan(a);
    while (a.path.length && budget > 0) {
      const q = a.path[0];
      const dx = q[0]-a.p[0], dz = q[1]-a.p[1], d = Math.hypot(dx,dz);
      if (d < 1e-9) { a.path.shift(); continue; }
      const k = Math.min(1,budget/d), next = [a.p[0]+dx*k,a.p[1]+dz*k];
      if (!segmentClearOnFloor(a.p,next,a.floor) || !canMove(a,next)) {
        a.blockedSeconds += dt;
        if (a.replanDelay <= 0) replan(a);
        return false;
      }
      a.yaw = Math.atan2(dx,dz);
      a.moving = true;
      a.p = next;
      a.blockedSeconds = 0;
      budget -= d*k;
      if (k === 1) a.path.shift();
    }
    return !!a.goal && Math.hypot(a.p[0]-a.goal[0],a.p[1]-a.goal[1]) < tolerance;
  }

  // Recover coincident actors (including imported/manual states). Routine movement is prevented
  // from penetrating by the swept-distance check above, so this is a recovery, not a visual teleport.
  function resolveOverlaps() {
    for (let pass=0;pass<10;pass++) {
      let changed=false;
      for (let i=0;i<actors.length;i++) for (let j=i+1;j<actors.length;j++) {
        const a=actors[i], b=actors[j];
        if (Math.abs(a.y-b.y)>0.75) continue;
        let dx=a.p[0]-b.p[0], dz=a.p[1]-b.p[1], d=Math.hypot(dx,dz);
        if (d>=RESIDENT_CLEARANCE-1e-6) continue;
        if (d<1e-5) { dx=i%2 ? 0:1; dz=i%2 ? 1:0; d=1; }
        const amount=RESIDENT_CLEARANCE-Math.hypot(a.p[0]-b.p[0],a.p[1]-b.p[1])+0.002;
        const movable=c=>!c.doorSession&&!c.usingElevator&&!c.stage.startsWith('stair');
        for (const [c,sign] of [[a,1],[b,-1]]) {
          if (!movable(c)) continue;
          let recovered=false;
          for(const [ux,uz] of [[dx/d,dz/d],[-dz/d,dx/d],[dz/d,-dx/d]]){
            for(const fraction of [.5,1]){
              const q=[c.p[0]+ux*amount*fraction*sign,c.p[1]+uz*amount*fraction*sign];
              if(allowedFor(c)(q)&&segmentClearOnFloor(c.p,q,c.floor)){
                c.p=q;c.path=[];c.replanDelay=0;changed=true;recovered=true;break;
              }
            }
            if(recovered)break;
          }
        }
      }
      if (!changed) break;
    }
  }

  function stepDoorSession(a, dt) {
    const s = a.doorSession;
    const d = s.door;
    s.elapsed += dt;
    const t = s.elapsed;
    const ease = x => x * x * (3 - 2 * x);
    if (s.phase === 'open') {
      d.angle = ease(Math.min(1, t / 0.45)) * 1.45;
      a.r.state = 'open-in';
      if (t >= 0.45) {
        s.phase = 'walk';
        s.elapsed = 0;
      }
    } else if (s.phase === 'walk') {
      const u = Math.min(1, t / 0.75);
      const next = [s.from[0]+(s.to[0]-s.from[0])*u, s.from[1]+(s.to[1]-s.from[1])*u];
      if (!canMove(a,next)) { s.elapsed-=dt; a.moving=false; return; }
      a.p=next;
      a.yaw = Math.atan2(s.to[0] - s.from[0], s.to[1] - s.from[1]);
      a.moving = true;
      a.r.state = 'enter';
      if (u >= 1) {
        s.phase = 'close';
        s.elapsed = 0;
      }
    } else if (s.phase === 'close') {
      d.angle = (1 - ease(Math.min(1, t / 0.45))) * 1.45;
      a.r.state = 'close-in';
      if (t >= 0.45) {
        d.angle = 0;
        d.owner = null;
        const nextStage = s.nextStage;
        a.doorSession = null;
        a.stage = nextStage;
        if(nextStage==='to-home')releaseLane(a);
        a.elapsed = 0;
        a.goal = null;
      }
    }
  }

  function stepElevator(dt) {
    if (elevator.owner === null) {
      if (elevator.queue.length > 0) {
        const nextIdx = elevator.queue.shift();
        elevator.owner = nextIdx;
        const a = actors[nextIdx];
        const desiredFloor = a.floor;
        if (elevator.floor !== desiredFloor) {
          elevator.state = 'moving-to-pickup';
          elevator.targetFloor = desiredFloor;
        } else {
          elevator.state = 'boarding';
          elevator.entryStart=[...a.p];
          elevator.timer = 0;
        }
      }
      return;
    }

    const a = actors[elevator.owner];
    if (!a) {
      elevator.owner = null;
      elevator.state = 'idle';
      return;
    }

    const rideState = elevator.state;
    if (elevator.state === 'moving-to-pickup') {
      const targetY = elevator.targetFloor === 1 ? WORKSHOP.floor1Y : WORKSHOP.floor2Y;
      const dir = Math.sign(targetY - elevator.y);
      elevator.y += dir * Math.min(Math.abs(targetY-elevator.y),dt*1.35);
      if (Math.abs(targetY - elevator.y) <= 0.04) {
        elevator.y = targetY;
        elevator.floor = elevator.targetFloor;
        elevator.state = 'boarding';
        elevator.entryStart=[...a.p];
        elevator.timer = 0;
      }
    } else if (elevator.state === 'boarding') {
      elevator.timer += dt;
      const cab = elevator.floor === 1 ? ELEVATOR.cabin1F : ELEVATOR.cabin2F;
      const u = Math.min(1, elevator.timer / 1.0);
      const from=elevator.entryStart||a.p;
      const next = [from[0]+(cab[0]-from[0])*u,from[1]+(cab[2]-from[1])*u];
      if (!canMove(a,next)) { elevator.timer-=dt; a.moving=false; return; }
      a.p=next;
      a.yaw = Math.atan2(cab[0]-from[0],cab[2]-from[1]);
      a.moving = true;
      a.r.state = 'lift-enter';
      a.r.activity='走進升降臺，確認轎廂入口';
      if (u >= 1) {
        elevator.state = 'turning';
        elevator.targetFloor = elevator.floor === 1 ? 2 : 1;
        elevator.timer = 0;
      }
    } else if(elevator.state==='turning'){
      elevator.timer+=dt;const u=Math.min(1,elevator.timer/.45);a.yaw=Math.PI*(1-u*u*(3-2*u));a.moving=false;a.r.state='lift-wait';a.r.activity='在轎廂內轉身，等門關妥';
      if(u>=1){elevator.state='moving';elevator.timer=0;}
    } else if (elevator.state === 'moving') {
      const targetY = elevator.targetFloor === 1 ? WORKSHOP.floor1Y : WORKSHOP.floor2Y;
      const dir = Math.sign(targetY - elevator.y);
      elevator.y += dir * Math.min(Math.abs(targetY-elevator.y),dt*1.25);
      a.p[0] = ELEVATOR.x;
      a.p[1] = ELEVATOR.z;
      a.y = elevator.y;
      a.yaw = 0;
      a.moving = false;
      a.r.state = 'lift-move';
      a.r.activity='搭乘升降臺巡視樓層';
      if (Math.abs(targetY - elevator.y) <= 0.04) {
        elevator.y = targetY;
        elevator.floor = elevator.targetFloor;
        a.floor = elevator.floor;
        a.y = elevator.y;
        elevator.state = 'exiting';
        elevator.timer = 0;
      }
    } else if (elevator.state === 'exiting') {
      elevator.timer += dt;
      const waitPt = elevator.floor === 1 ? ELEVATOR.wait1F : ELEVATOR.wait2F;
      const u = Math.min(1, elevator.timer / .95);
      const next = [ELEVATOR.x+(waitPt[0]-ELEVATOR.x)*u,ELEVATOR.z+(waitPt[2]-ELEVATOR.z)*u];
      if (!canMove(a,next)) { elevator.timer-=dt; a.moving=false; return; }
      a.p=next;
      a.yaw = 0;
      a.moving = true;
      a.r.state = 'lift-exit';
      a.r.activity='走出轎廂，查看平台通道';
      if (u >= 1) {
        a.usingElevator = false;
        a.stage = a.targetStageAfterLift || 'to-table';
        a.elapsed = 0;
        a.goal = null;
        elevator.owner = null;
        elevator.state = 'idle';
      }
    }
    if (['boarding','turning','moving','exiting'].includes(rideState)) {
      const front=LANDING_LAYOUT.threshold.localZ+LANDING_LAYOUT.threshold.depth/2;
      const height=LANDING_LAYOUT.cabinFloorRise*Math.max(0,Math.min(1,(front-(a.p[1]-ELEVATOR.z))/LANDING_LAYOUT.thresholdRampRun));
      a.y=elevator.y+height;
    }
  }

  function requestElevator(a, nextStage) {
    a.targetStageAfterLift = nextStage;
    a.usingElevator = true;
    a.stage = 'lift-wait';
    a.r.state = 'lift-wait';
    if (elevator.owner !== a.index && !elevator.queue.includes(a.index)) {
      elevator.queue.push(a.index);
    }
  }

  function triggerStudioDelivery(studioIndex, partName) {
    const actorIndex = [0, 1, 2, 3][studioIndex] ?? 0;
    const a = actors[actorIndex];
    if (!a) return null;
    studioRoutines.interrupt(a);
    a.priorityDelivery = true;
    a.priorityPartName = partName;
    a.r.greeting = 0;
    if(a.floor===a.cfg.homeFloor&&['working','resting','collecting'].includes(a.stage)&&!a.doorSession&&!a.usingElevator){
      a.stage = 'to-source';
      a.elapsed = 0;
      a.goal = null;
    }
    return a;
  }

  const life=createResidentLife({actors,setFloorGoal,stepPath,clearance:RESIDENT_CLEARANCE,canMove:(a,next)=>segmentClearOnFloor(a.p,next,a.floor)&&canMove(a,next)});
  const studioRoutines=createStudioRoutines({actors,setFloorGoal,stepPath});

  function update(dt) {
    dt = Math.max(0, Math.min(dt, 0.25));
    const events = [];

    stepElevator(dt);

    resolveOverlaps();

    for (const a of actors) {
      const r = a.r;
      a.replanDelay = Math.max(0,a.replanDelay-dt);
      r.greeting = Math.max(0, r.greeting - dt);
      r.cooldown = Math.max(0, r.cooldown - dt);
      if (a.yieldTimer > 0) {
        a.yieldTimer = Math.max(0, a.yieldTimer - dt);
        a.moving = false;
        continue;
      }
      if (r.greeting > 0 && !a.priorityDelivery && !a.doorSession && !a.usingElevator && !a.stage.startsWith('stair')) {
        a.moving = false;
        continue;
      }
      if (a.doorSession) {
        stepDoorSession(a, dt);
        continue;
      }
      if (a.usingElevator) {
        continue;
      }

      a.elapsed += dt;
      if(a.index>=5){life.update(a,dt);continue;}
      if(a.index<4&&!a.priorityDelivery&&['working','resting'].includes(a.stage)){studioRoutines.update(a,dt);continue;}
      if(a.index<4&&a.stage==='return-parcel'){
        r.state='retrieving';a.moving=false;
        a.parcel.state='return-pick';a.parcel.progress=Math.min(1,a.elapsed/.65);
        if(a.elapsed>=.65){a.parcel.state='returning';a.stage=a.index<2?'to-stair-bottom':'to-door-in';a.elapsed=0;a.goal=null;}
        continue;
      }
      if(a.index<4&&a.stage==='return-source'){
        r.state='returning';setFloorGoal(a,LIFE_LAYOUT.couriers[a.index].pickup);
        if(stepPath(a,dt,.95)){a.stage='stow';a.elapsed=0;a.goal=null;}
        continue;
      }
      if(a.index<4&&a.stage==='stow'){
        r.state='stowing';a.moving=false;a.parcel.state='stowing';a.parcel.progress=Math.min(1,a.elapsed/.65);
        const source=LIFE_LAYOUT.couriers[a.index].source;a.yaw=Math.atan2(source[0]-a.p[0],source[2]-a.p[1]);
        if(a.elapsed>=.65){a.parcel.state='source';a.parcel.progress=0;a.stage=a.priorityDelivery?'to-source':'home-after-stow';a.elapsed=0;a.goal=null;}
        continue;
      }
      if(a.index<4&&a.stage==='home-after-stow'){
        r.state='returning';setFloorGoal(a,a.cfg.homePos);
        if(stepPath(a,dt,.85,.015)){a.stage=a.priorityDelivery?'to-source':'resting';a.elapsed=0;a.goal=null;}
        continue;
      }
      if(a.index<4&&a.stage==='to-source'){
        r.state='returning';setFloorGoal(a,LIFE_LAYOUT.couriers[a.index].pickup);
        if(stepPath(a,dt,1.60)){a.stage='collecting';a.elapsed=0;a.goal=null;}
        continue;
      }
      if(a.index<4&&a.stage==='collecting'){
        r.state='collecting';a.moving=false;
        const source=LIFE_LAYOUT.couriers[a.index].source;
        a.yaw=Math.atan2(source[0]-a.p[0],source[2]-a.p[1]);
        a.parcel.progress=Math.min(1,a.elapsed/.8);
        if(a.elapsed>=.8){a.parcel.state='carried';a.stage='prepare-priority';a.elapsed=0;a.goal=null;}
        continue;
      }

      const speed = a.priorityDelivery ? 1.60 : 0.85;

      if (a.stage === 'stair-down' || a.stage === 'stair-up') {
        const nextT = Math.max(0, Math.min(1,a.stairT+a.stairDir*dt*(a.priorityDelivery?0.52:0.36)));
        const pose = sampleStair(a.stairSide,nextT);
        if(a.stage==='stair-up'&&a.y>WORKSHOP.floor1Y+.80)releaseLane(a);
        if (!canMove(a,[pose.x,pose.z],pose.y)) { a.moving=false; continue; }
        a.stairT=nextT;
        a.p[0] = pose.x;
        a.p[1] = pose.z;
        a.y = pose.y;
        a.yaw = a.stairDir > 0 ? pose.yaw : pose.yaw + Math.PI;
        a.moving = true;
        r.state = a.stage;
        if (a.stage === 'stair-down' && a.stairT <= 0) {
          a.floor = 1;
          a.y = WORKSHOP.floor1Y;
          a.stage = 'to-table';
          a.goal = null;
        } else if (a.stage === 'stair-up' && a.stairT >= 1) {
          a.floor = 2;
          a.y = WORKSHOP.floor2Y;
          a.stage = 'return-source';
          a.goal = null;
        }
        continue;
      }

      if (a.index === 0 || a.index === 1) {
        const side = a.index === 0 ? -1 : 1;
        const stairTop = (side < 0 ? STAIRS.left : STAIRS.right).waypoints.at(-1);
        const stairBottom = (side < 0 ? STAIRS.left : STAIRS.right).waypoints[0];
        if (a.stage === 'prepare-priority') {
          r.state = 'loading';
          if (a.elapsed >= 0.6 && acquireLane(a)) {
            a.stage = 'to-stair-top';
            a.goal = null;
            events.push([a.index, 'depart']);
          }
        } else if (a.stage === 'working') {
          r.state = 'loading';
          setFloorGoal(a, a.elapsed < 2.2 ? a.cfg.workPos : a.cfg.homePos);
          stepPath(a, dt, 0.68);
          if (a.priorityDelivery && a.elapsed >= 9.5 && acquireLane(a)) {
            a.stage = 'to-stair-top';
            a.elapsed = 0;
            a.goal = null;
            events.push([a.index, 'depart']);
          }
        } else if (a.stage === 'to-stair-top') {
          r.state = 'walking';
          setFloorGoal(a, [stairTop[0], stairTop[2]]);
          if (stepPath(a, dt, speed)) {
            a.stage = 'stair-down';
            a.stairSide = side;
            a.stairT = 1;
            a.stairDir = -1;
            a.yaw = sampleStair(side, 1).yaw + Math.PI;
          }
        } else if (a.stage === 'to-table') {
          r.state = 'walking';
          setFloorGoal(a, [a.cfg.deliverySpot[0], a.cfg.deliverySpot[2]]);
          if (stepPath(a, dt, speed)) {
            a.stage = 'assembling';
            a.elapsed = 0;
          }
        } else if (a.stage === 'assembling') {
          r.state = 'delivering';
          a.parcel.state='placing';a.parcel.progress=Math.min(1,a.elapsed/.85);
          a.yaw = Math.atan2(LIFE_LAYOUT.receivers[a.index][0]-a.p[0],LIFE_LAYOUT.receivers[a.index][2]-a.p[1]);
          a.moving = false;
          if (a.elapsed >= (a.priorityDelivery ? 1.0 : 2.6)) {
            r.completed++;
            events.push([a.index, a.priorityDelivery ? 'priority-handoff' : 'handoff', a.priorityPartName]);
            a.parcel.state='received';a.parcel.progress=1;a.parcel.cycle++;
            a.priorityDelivery = false;
            a.priorityPartName = null;
            a.stage = 'return-parcel';
            a.elapsed = 0;
            a.goal = null;
          }
        } else if (a.stage === 'to-stair-bottom') {
          r.state = 'returning';
          setFloorGoal(a, [stairBottom[0], stairBottom[2]]);
          if (stepPath(a, dt, speed)) {
            a.stage = 'stair-up';
            a.stairSide = side;
            a.stairT = 0;
            a.stairDir = 1;
            a.yaw = sampleStair(side, 0).yaw;
          }
        } else if (a.stage === 'to-home') {
          r.state = 'returning';
          setFloorGoal(a, a.cfg.homePos);
          if (stepPath(a, dt, speed)) {
            a.stage = a.priorityDelivery?'to-source':'resting';
            releaseLane(a);
            a.elapsed = 0;
          }
        } else if (a.stage === 'resting') {
          r.state = 'resting';
          a.moving = false;
          a.yaw = a.index % 2 === 0 ? 0.38 : -0.38;
          if (a.elapsed >= 2.8) {
            a.stage = 'working';
            a.elapsed = 0;
          }
        }
        continue;
      }

      if (a.index === 2 || a.index === 3) {
        const side=a.index===2?-1:1;
        if(a.stage==='prepare-priority'){
          r.state='loading';a.moving=false;
          if(a.elapsed>=.05&&acquireLane(a)){a.stage='to-door-out';a.elapsed=0;a.goal=null;events.push([a.index,'depart']);}
        }else if(a.stage==='working'||a.stage==='resting'){
          r.state='resting';a.moving=false;a.yaw=side<0?-.35:.35;
        }else if(a.stage==='to-door-out'||a.stage==='rear-out'){
          r.state='walking';
          const anchor=a.stage==='to-door-out'?[side*2.75,LIFE_LAYOUT.rearPassageZ]:[side*1.05,LIFE_LAYOUT.rearPassageZ];
          setFloorGoal(a,anchor);
          if(stepPath(a,dt,speed)){a.stage=a.stage==='to-door-out'?'rear-out':'to-table';a.goal=null;a.elapsed=0;}
        }else if(a.stage==='to-table'){
          r.state='walking';setFloorGoal(a,[a.cfg.deliverySpot[0],a.cfg.deliverySpot[2]]);
          if(stepPath(a,dt,speed)){a.stage='assembling';a.elapsed=0;a.goal=null;}
        }else if(a.stage==='assembling'){
          r.state='delivering';a.moving=false;a.yaw=Math.atan2(-a.p[0],0);
          a.parcel.state='placing';a.parcel.progress=Math.min(1,a.elapsed/.85);
          if(a.elapsed>=1.0){
            r.completed++;events.push([a.index,'priority-handoff',a.priorityPartName]);
            a.parcel.state='received';a.parcel.progress=1;a.parcel.cycle++;
            a.priorityDelivery=false;a.priorityPartName=null;a.stage='return-parcel';a.elapsed=0;a.goal=null;
          }
        }else if(a.stage==='to-door-in'||a.stage==='rear-in'){
          r.state='returning';
          const anchor=a.stage==='to-door-in'?[side*1.05,LIFE_LAYOUT.rearPassageZ]:[side*2.75,LIFE_LAYOUT.rearPassageZ];
          setFloorGoal(a,anchor);
          if(stepPath(a,dt,speed)){a.stage=a.stage==='to-door-in'?'rear-in':'return-source';a.goal=null;a.elapsed=0;if(a.stage==='return-source')releaseLane(a);}
        }else if(a.stage==='to-home'){
          r.state='returning';setFloorGoal(a,a.cfg.homePos);
          if(stepPath(a,dt,speed)){a.stage=a.priorityDelivery?'to-source':'resting';a.elapsed=0;a.goal=null;}
        }
        continue;
      }

      if (a.index === 4) {
        r.activity=({working:'查看二樓平台護欄與入口','to-lift-2f':'走向升降臺，準備巡視一樓','to-table':'走到一樓，看看齒輪機構',assembling:'停下來觀察齒輪與入口','to-lift-1f':'返回升降臺，準備上樓','to-home-2f':'巡視二樓平台與連通廊',resting:'在平台停留，看看工坊夥伴'})[a.stage]||'巡視升降臺';
        if (a.stage === 'working') {
          r.state = 'observing';
          setFloorGoal(a, a.cfg.homePos);
          if (stepPath(a, dt, 0.78) && a.elapsed >= 2.6) {
            a.stage = 'to-lift-2f';
            a.elapsed = 0;
            a.goal = null;
            events.push([a.index, 'depart']);
          }
        } else if (a.stage === 'to-lift-2f') {
          r.state = 'walking';
          setFloorGoal(a, [ELEVATOR.wait2F[0], ELEVATOR.wait2F[2]]);
          if (stepPath(a, dt, 0.85)) {
            requestElevator(a, 'to-table');
          }
        } else if (a.stage === 'to-table') {
          r.state = 'walking';
          setFloorGoal(a, [a.cfg.deliverySpot[0], a.cfg.deliverySpot[2]]);
          if (stepPath(a, dt, 0.85)) {
            a.stage = 'assembling';
            a.elapsed = 0;
          }
        } else if (a.stage === 'assembling') {
          r.state = 'resting';
          a.yaw = Math.atan2((0 - a.p[0]) * 0.55, Math.max(0.65, CENTRAL_WORKBENCH.center[2] + 0.85 - a.p[1]));
          a.moving = false;
          if (a.elapsed >= 2.4) {
            r.inspections=(r.inspections||0)+1;
            a.stage = 'to-lift-1f';
            a.elapsed = 0;
            a.goal = null;
          }
        } else if (a.stage === 'to-lift-1f') {
          r.state = 'returning';
          setFloorGoal(a, [ELEVATOR.wait1F[0], ELEVATOR.wait1F[2]]);
          if (stepPath(a, dt, 0.85)) {
            requestElevator(a, 'to-home-2f');
          }
        } else if (a.stage === 'to-home-2f') {
          r.state = 'returning';
          setFloorGoal(a, a.cfg.workPos);
          if (stepPath(a, dt, 0.82)) {
            a.stage = a.priorityDelivery?'to-source':'resting';
            releaseLane(a);
            a.elapsed = 0;
          }
        } else if (a.stage === 'resting') {
          r.state = 'resting';
          a.moving = false;
          a.yaw = a.index % 2 === 0 ? 0.38 : -0.38;
          if (a.elapsed >= 2.6) {
            a.stage = 'working';
            a.elapsed = 0;
          }
        }
        continue;
      }

    }

    resolveOverlaps();
    return events;
  }

  function requestAction(index) {
    const a = actors[index];
    if (!a) return null;
    if (a.index === 4 && !a.usingElevator) {
      a.stage = a.floor === 2 ? 'to-lift-2f' : 'to-lift-1f';
      a.elapsed = 0;
      a.goal = null;
      return {type: 'elevator', actor: a};
    }
    if(index>=5)return {type:'life',actor:a};
    triggerStudioDelivery(index % 4, null);
    return {type: 'workbench', actor: a};
  }

  return {
    actors,
    doors,
    elevator,
    update,
    triggerStudioDelivery,
    requestAction,
    life
  };
}

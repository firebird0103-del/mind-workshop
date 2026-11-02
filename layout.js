import {LIFE_LAYOUT} from './life-layout.js';
import {SPATIAL_LAYOUT} from './spatial-layout.js';
// Ground-up Architectural Layout & Spatial Topology for 《心智大作戰：腦內工坊》 (v7.0 Final Polish)
// Updated per user's 8-point final review:
// 1. Central Workbench moved forward/downward to z = +1.68, side fences moved outward to |x| = 2.18..2.58,
//    giving a spacious 1.56m horizontal run (z = +0.74 to -0.82) for the Twin 10-Step Architectural Staircases
//    so steps never overhang or clip resident legs!

export const WORKSHOP = {
  rx: 7.8,
  rz: 5.0,
  floor1Y: 0.44,
  floor2Y: 3.18,
  roofY: 6.10,
  railH: 0.50,
  tableRadius: 1.32,
  tableY: 0.98,
  perchPos: [-1.22, 4.96, -0.95]
};

// Solid curved bays, shared by navigation and asset acceptance tests.
export const BALCONIES = [
  {cx: -3.73, cz: -0.15, radius: 1.42, rugRadius: 1.26, halfWidth: 1.46},
  {cx: 3.83, cz: -0.15, radius: 1.42, rugRadius: 1.32, halfWidth: 1.56}
];

export const STUDIOS = [
  {
    index: 0,
    id: 'time',
    name: '空間認知',
    title: '空間認知工作室',
    floor: 2,
    y: WORKSHOP.floor2Y,
    center: [-3.75, 3.18, -0.45],
    labelAnchor: [-5.05, 5.35, -0.45],
    focusTarget: [-3.65, 4.10, -0.35],
    focusDistance: 9.8,
    focusAngle: 0.10,
    focusPolar: 0.30,
    bounds: {x0: -5.25, x1: -2.30, z0: -2.05, z1: 0.58},
    workstation: [-3.55, 3.18, -0.78],
    storagePoint: [-4.42, 3.18, -0.62],
    balconyPoint: [-1.82, 3.18, -0.86]
  },
  {
    index: 1,
    id: 'spot',
    name: '視覺注意力',
    title: '視覺注意力工作室',
    floor: 2,
    y: WORKSHOP.floor2Y,
    center: [3.85, 3.18, -0.45],
    labelAnchor: [5.15, 5.35, -0.45],
    focusTarget: [3.75, 4.10, -0.35],
    focusDistance: 9.8,
    focusAngle: -0.10,
    focusPolar: 0.30,
    bounds: {x0: 2.30, x1: 5.42, z0: -2.05, z1: 0.58},
    workstation: [2.68, 3.18, -0.52],
    storagePoint: [3.75, 3.18, -0.82],
    balconyPoint: [1.82, 3.18, -0.86]
  },
  {
    index: 2,
    id: 'memory',
    name: '工作記憶',
    title: '工作記憶工作室',
    floor: 1,
    y: WORKSHOP.floor1Y,
    center: [-4.35, 0.44, 0.85],
    labelAnchor: [-5.65, 2.62, 0.85],
    focusTarget: [-4.15, 1.45, 0.75],
    focusDistance: 10.2,
    focusAngle: 0.14,
    focusPolar: 0.32,
    bounds: {x0: -6.55, x1: -2.42, z0: -1.65, z1: 2.85},
    workstation: [-3.65, 0.44, 0.72],
    storagePoint: [-4.85, 0.44, 0.95],
    entryPoint: [-2.42, 0.44, 0.96]
  },
  {
    index: 3,
    id: 'switch',
    name: '語意判斷',
    title: '語意判斷工作室',
    floor: 1,
    y: WORKSHOP.floor1Y,
    center: [4.35, 0.44, 0.85],
    labelAnchor: [5.65, 2.62, 0.85],
    focusTarget: [4.15, 1.45, 0.75],
    focusDistance: 10.2,
    focusAngle: -0.14,
    focusPolar: 0.32,
    bounds: {x0: 2.42, x1: 6.55, z0: -1.65, z1: 2.85},
    workstation: [4.05, 0.44, 0.92],
    storagePoint: [4.95, 0.44, 0.55],
    entryPoint: [2.42, 0.44, 0.96]
  }
];

// Central round crafting table moved forward/downward to z = +1.68 so the atrium & stairs have generous space!
export const CENTRAL_WORKBENCH = {
  center: [0, WORKSHOP.floor1Y, 1.68],
  radius: 1.36,
  focusTarget: [0, 1.45, 1.55],
  focusDistance: 8.2,
  focusAngle: 0.0,
  focusPolar: 0.34,
  deliverySpots: [
    [-1.65, WORKSHOP.floor1Y, 1.58],
    [1.65, WORKSHOP.floor1Y, 1.58],
    [-1.65, WORKSHOP.floor1Y, 2.02],
    [1.65, WORKSHOP.floor1Y, 2.02],
    [0, WORKSHOP.floor1Y, -0.04],
    [-0.90, WORKSHOP.floor1Y, 3.74],
    [0.90, WORKSHOP.floor1Y, 3.74],
    [0, WORKSHOP.floor1Y, 3.46]
  ]
};

// Twin 10-Step Architectural Staircases spanning a full 1.58m horizontal run (z = +0.74 to -0.84) at x = ±1.76..±1.84.
// Each step has a non-overlapping 0.16m run so steps never overhang or clip resident legs!
export const STAIRS = {
  left: {
    id: 'stair-left',
    side: -1,
    steps: 10,
    waypoints: [
      [-1.72, 0.44, 0.76],
      [-1.78, 0.99, 0.44],
      [-1.84, 1.54, 0.12],
      [-1.86, 2.08, -0.20],
      [-1.84, 2.63, -0.52],
      [-1.80, 3.18, -0.84]
    ]
  },
  right: {
    id: 'stair-right',
    side: 1,
    steps: 10,
    waypoints: [
      [1.72, 0.44, 0.76],
      [1.78, 0.99, 0.44],
      [1.84, 1.54, 0.12],
      [1.86, 2.08, -0.20],
      [1.84, 2.63, -0.52],
      [1.80, 3.18, -0.84]
    ]
  }
};

export const ELEVATOR = {
  id: 'central-lift',
  x: 0,
  z: -1.38,
  radius: 0.56,
  floor1Y: WORKSHOP.floor1Y,
  floor2Y: WORKSHOP.floor2Y,
  wait1F: [0, WORKSHOP.floor1Y, -0.42],
  cabin1F: [0, WORKSHOP.floor1Y, -1.38],
  cabin2F: [0, WORKSHOP.floor2Y, -1.38],
  wait2F: [0, WORKSHOP.floor2Y, -0.56],
  bridgeLeft: [-2.36, WORKSHOP.floor2Y, -0.95],
  bridgeRight: [2.36, WORKSHOP.floor2Y, -0.95]
};

// Side fences & gates moved outward to x = ±2.42 so the central atrium is wide and open!
export const DOORS = [
  {
    id: 'door-memory',
    name: '工作記憶低矮推門',
    floor: 1,
    x: -2.42,
    y: WORKSHOP.floor1Y,
    z: 0.96,
    width: 0.68,
    height: WORKSHOP.railH,
    outside: [-2.82, WORKSHOP.floor1Y, 0.96],
    inside: [-2.02, WORKSHOP.floor1Y, 0.96]
  },
  {
    id: 'door-switch',
    name: '語意判斷低矮推門',
    floor: 1,
    x: 2.42,
    y: WORKSHOP.floor1Y,
    z: 0.96,
    width: 0.68,
    height: WORKSHOP.railH,
    outside: [2.82, WORKSHOP.floor1Y, 0.96],
    inside: [2.02, WORKSHOP.floor1Y, 0.96]
  },
  {
    id: 'door-arch-back',
    name: '後側迴廊低矮推門',
    floor: 1,
    x: 0.92,
    y: WORKSHOP.floor1Y,
    z: -0.82,
    width: 0.64,
    height: WORKSHOP.railH,
    outside: [0.92, WORKSHOP.floor1Y, -0.42],
    inside: [0.92, WORKSHOP.floor1Y, -1.22]
  }
];

export const OBSTACLES_1F = [
  ...[-1,1].map(side=>({id:"lift-post-1f-"+side,shape:"circle",x:side*.54,z:-.87,radius:.105,hx:.105,hz:.105,top:6.1})),
  ...LIFE_LAYOUT.obstacles,
  ...LIFE_LAYOUT.receivers.map((p,i)=>({id:"reception-"+i,shape:"circle",x:p[0],z:p[2],radius:.09,hx:.09,hz:.09,top:.655})),
  ...LIFE_LAYOUT.couriers.slice(2).map((c,i)=>({id:"parcel-source-"+(i+2),shape:"circle",x:c.source[0],z:c.source[2],radius:.115,hx:.115,hz:.115,top:.655})),
  {id: 'central-table', shape: 'circle', radius: 1.24, x: 0, z: 1.68, hx: 1.08, hz: 1.08},
  {id: 'lift-shaft-1f', x: 0, z: -1.38, hx: 0.54, hz: 0.54},
  {id: 'memory-tree', x: -5.78, z: 0.45, hx: 0.52, hz: 0.52},
  {id: 'memory-back-shelf', x: -3.85, z: -1.38, hx: 1.75, hz: 0.36},
  {id: 'memory-front-crates', x: -4.35, z: 2.08, hx: 1.52, hz: 0.40},
  {id: 'switch-back-shelf', x: 4.15, z: -1.38, hx: 1.75, hz: 0.36},
  {id: 'switch-sorting-table', x: 4.45, z: 2.08, hx: 1.38, hz: 0.42},
  {id: 'cat-crate', x: 1.98, z: 2.82, hx: 0.42, hz: 0.28},
  {id: 'push-cart', x: -1.98, z: 2.78, hx: 0.42, hz: 0.28},
  {id: 'fence-left', x: -2.26, z: 1.82, hx: 0.22, hz: 0.42},
  {id: 'fence-right', x: 2.26, z: 1.82, hx: 0.22, hz: 0.42},
  {id: 'gate-post-1f-left-a', x: -2.42, z: 0.60, hx: 0.06, hz: 0.10},
  {id: 'gate-post-1f-left-b', x: -2.42, z: 1.32, hx: 0.06, hz: 0.08},
  {id: 'gate-post-1f-right-a', x: 2.42, z: 0.60, hx: 0.06, hz: 0.10},
  {id: 'gate-post-1f-right-b', x: 2.42, z: 1.32, hx: 0.06, hz: 0.08},
  {id: 'stair-base-left', x: -1.80, z: 0.18, hx: 0.34, hz: 0.42},
  {id: 'stair-base-right', x: 1.80, z: 0.18, hx: 0.34, hz: 0.42},
  ...SPATIAL_LAYOUT.plants.filter(p=>p[1]<.5).map(([x,y,z,scale],i)=>({id:'floor-planter-'+i,shape:'circle',x,z,radius:.24*scale,hx:.24*scale,hz:.24*scale,top:y+.48*scale}))
];

export const OBSTACLES_2F = [
  {id:"landing-front-guard",x:0,z:.06,hx:1.32,hz:.04},
  {id:"stair-guard-2f-left",x:-2.28,z:-0.56,hx:0.06,hz:0.18},
  {id:"stair-guard-2f-right",x:2.28,z:-0.56,hx:0.06,hz:0.18},
  ...[-1,1].map(side=>({id:"lift-post-2f-"+side,shape:"circle",x:side*.54,z:-.87,radius:.105,hx:.105,hz:.105})),
  ...LIFE_LAYOUT.couriers.slice(0,2).map((c,i)=>({id:"parcel-source-"+i,shape:"circle",x:c.source[0],z:c.source[2],radius:.115,hx:.115,hz:.115})),
  {id:'lift-shaft-2f',shape:'circle',x:0,z:-1.38,radius:.65,hx:.65,hz:.65},
  {id: 'spatial-table', x: -3.55, z: -0.05, hx: 0.55, hz: 0.36},
  {id: 'spatial-plinth', x: SPATIAL_LAYOUT.furniture.spatialPlinthX, z: 0.18, hx: 0.36, hz: 0.34},
  {id: 'spatial-drafting', x: SPATIAL_LAYOUT.furniture.spatialDraftX, z: -0.95, hx: 0.38, hz: 0.36},
  {id: 'attention-domes', x: 4.22, z: -0.02, hx: 0.82, hz: 0.36},
  {id: 'attention-magnifier', x: 3.12, z: 0.05, hx: 0.28, hz: 0.28},
  {id: 'attention-back-shelf', x: SPATIAL_LAYOUT.furniture.attentionBookcaseX, z: -1.82, hx: .45, hz: .19},
  {id:'attention-rear-desk',x:SPATIAL_LAYOUT.furniture.attentionDeskX,z:-1.55,hx:.43,hz:.25},
  {id:'attention-perch',x:4.98,z:-.55,hx:.18,hz:.21}
];

export const REST_SPOTS = {
  teaCorner1F: [-1.15, WORKSHOP.floor1Y, 2.68],
  catCorner1F: [1.15, WORKSHOP.floor1Y, 2.68],
  cartSpot1F: [-1.15, WORKSHOP.floor1Y, 2.75],
  windowSpot2F: [4.95, WORKSHOP.floor2Y, -0.35],
  clockBalcony2F: [-2.52, WORKSHOP.floor2Y, -0.25]
};

export function sampleStair(side, t) {
  const stair = side < 0 ? STAIRS.left : STAIRS.right;
  const pts = stair.waypoints;
  const u = Math.max(0, Math.min(1, t)) * (pts.length - 1);
  const idx = Math.min(pts.length - 2, Math.floor(u));
  const frac = u - idx;
  const a = pts[idx];
  const b = pts[idx + 1];
  const x = a[0] + (b[0] - a[0]) * frac;
  const z = a[2] + (b[2] - a[2]) * frac;
  const linearY = a[1] + (b[1] - a[1]) * frac;
  const stepCount = stair.steps;
  const stepProgress = Math.max(0, Math.min(1, t)) * stepCount;
  const stepIdx = Math.min(stepCount, Math.floor(stepProgress));
  const stepFrac = stepProgress - stepIdx;
  const stepH = (WORKSHOP.floor2Y - WORKSHOP.floor1Y) / stepCount;
  const steppedY = WORKSHOP.floor1Y + (stepIdx + Math.pow(stepFrac, 0.72)) * stepH;
  const footClearance = Math.sin(Math.max(0, Math.min(1, t)) * Math.PI) * 0.032;
  const y = linearY * 0.45 + steppedY * 0.55 + footClearance;
  const yaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
  return {x, y, z, yaw, stepIndex: stepIdx};
}

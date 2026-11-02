// Few but finely crafted workshop animals matching the concept art:
// 1) 工坊貓「栗子」 (Chestnut the Calico Cat): naps on the quilted cushion inside the wooden crate at (1.98, 2.82),
//    and when clicked while walking on the floor, reacts IN-PLACE at its current position without teleporting back to the crate!
// 2) 窗臺鳴鳥「小青」 (Azure the Window Songbird): perches on the indoor wooden window-sill stand at x = 4.98.
import {WORKSHOP} from './layout.js';

export const ANIMALS = [
  {
    name: '栗子',
    species: '工坊三花貓',
    icon: '🐈',
    home: '一樓材料木箱、前側圓弧露臺與工作室走道',
    routine: '在木箱軟墊休息後跳下地面，交替沿著中央圓桌前緣露臺或右翼工作室走道散步探索',
    floor: 1,
    center: [1.98, WORKSHOP.floor1Y + 0.32, 2.82],
    restWalk: [1.22, WORKSHOP.floor1Y, 2.66],
    color: '#f5ede2'
  },
  {
    name: '小青',
    species: '窗臺鳴鳥',
    icon: '🐦',
    home: '二樓視覺注意力工作室拱窗棲木臺',
    routine: '停在拱窗前的室內木棲臺上觀察標本與陽光，對打招呼的玩家拍翅鳴叫',
    floor: 2,
    center: [5.38, WORKSHOP.floor2Y + 0.88, -0.55],
    restWalk: [5.38, WORKSHOP.floor2Y + 0.88, -0.38],
    color: '#a16f49'
  }
];

export function createAnimals(THREE, world, {sphere, box, cylinder, shadow}) {
  const animals = ANIMALS.map((data, index) => {
    const g = new THREE.Group();
    world.add(g);
    g.userData.animal = index;
    const limbs = [], ears = [];

    if (index === 0) {
      const body = sphere(g, '#f7f1e6', 0, 0.22, 0, 0.22, 14);
      body.scale.set(0.88, 0.78, 1.32);
      sphere(g, '#cf8244', 0.08, 0.28, -0.04, 0.12, 10);
      sphere(g, '#524136', -0.09, 0.26, 0.08, 0.10, 10);
      sphere(g, '#f7f1e6', 0, 0.36, 0.22, 0.17, 14);
      sphere(g, '#cf8244', 0.07, 0.45, 0.20, 0.09, 10);
      sphere(g, '#524136', -0.07, 0.44, 0.21, 0.08, 10);
      for (const x of [-0.09, 0.09]) {
        const ear = cylinder(g, x > 0 ? '#cf8244' : '#524136', x, 0.52, 0.22, 0, 0.065, 0.12, 4);
        ears.push(ear);
        box(g, '#3f352e', x * 0.72, 0.38, 0.37, 0.045, 0.016, 0.015);
      }
      sphere(g, '#d98a82', 0, 0.34, 0.38, 0.024, 8);
      for (const x of [-0.08, 0.08]) {
        for (const z of [-0.14, 0.16]) {
          const paw = sphere(g, '#f7f1e6', x, 0.08, z, 0.06, 10);
          limbs.push(paw);
        }
      }
      const tail = cylinder(g, '#cf8244', 0, 0.24, -0.28, 0.035, 0.045, 0.28, 8);
      tail.rotation.x = 1.1;
      ears.push(tail);
      shadow(g, 0, 0.01, 0, 0.24, 0.30, 0.26);
    } else {
      const body = sphere(g, '#4e87a8', 0, 0.16, 0, 0.14, 14);
      body.scale.set(0.85, 0.92, 1.35);
      const belly = sphere(g, '#e4b87a', 0, 0.13, 0.04, 0.11, 12);
      belly.scale.set(0.75, 0.75, 1.15);
      sphere(g, '#3f7392', 0, 0.28, 0.12, 0.11, 12);
      const beak = cylinder(g, '#d99838', 0, 0.28, 0.25, 0, 0.032, 0.09, 6);
      beak.rotation.x = Math.PI / 2;
      for (const x of [-0.055, 0.055]) {
        sphere(g, '#262320', x, 0.30, 0.19, 0.018, 8);
      }
      for (const x of [-0.12, 0.12]) {
        const wing = sphere(g, '#386886', x, 0.18, -0.02, 0.09, 10);
        wing.scale.set(0.32, 0.65, 1.35);
        limbs.push(wing);
      }
      const tail = box(g, '#315973', 0, 0.14, -0.20, 0.09, 0.03, 0.16);
      tail.rotation.x = -0.28;
      ears.push(tail);
    }

    const treat = new THREE.Group();
    g.add(treat);
    treat.position.set(0, 0.08, 0.36);
    treat.visible = false;
    if (index === 0) {
      const fish = sphere(treat, '#c99255', 0, 0.04, 0, 0.07, 10);
      fish.scale.set(0.65, 0.45, 1.45);
    } else {
      for (let j = 0; j < 3; j++) {
        sphere(treat, '#dfb85c', (j - 1) * 0.06, 0.02, 0, 0.024, 8);
      }
    }

    g.position.set(...data.center);
    return {
      ...data,
      index,
      g,
      limbs,
      ears,
      treat,
      curPos: [...data.center],
      reactPos: [...data.center],
      phase: index * 1.7,
      reactionUntil: 0,
      visits: 0,
      mood: '悠閒自在',
      status: data.routine
    };
  });

  function update(time) {
    for (const a of animals) {
      const reacting = performance.now() < a.reactionUntil;
      a.treat.visible = reacting && a.action === 'feed';
      if (a.index === 0) {
        const cycle = (time * 0.07) % 1;
        if (reacting) {
          // React IN-PLACE at a.reactPos so clicking the cat while it is walking on the floor never teleports it back to the crate!
          const [rx, ry, rz] = a.reactPos || a.curPos || a.center;
          a.g.position.set(rx, ry + Math.abs(Math.sin(time * 6)) * 0.05, rz);
          a.g.rotation.y = -0.25 + Math.sin(time * 5) * 0.18;
          a.g.scale.y = 1;
        } else if (cycle < 0.72) {
          a.curPos = [a.center[0], a.center[1], a.center[2]];
          a.g.position.set(...a.curPos);
          a.g.rotation.y = -0.25;
          a.g.scale.y = 0.84 + Math.sin(time * 2.2) * 0.03;
          a.status = '窩在齒輪木箱軟墊上香甜打盹';
          a.mood = '呼嚕午睡';
        } else {
          const phase = (cycle - 0.72) / 0.28;
          const u = Math.sin(phase * Math.PI);
          const x = a.center[0] + (a.restWalk[0] - a.center[0]) * u;
          const z = a.center[2] + (a.restWalk[2] - a.center[2]) * u + Math.sin(u * Math.PI) * 0.16;
          const hopArc = Math.sin(u * Math.PI) * 0.14;
          const y = a.center[1] * (1 - u) + a.restWalk[1] * u + hopArc;
          a.curPos = [x, y, z];
          a.g.position.set(x, y, z);
          a.g.rotation.y = phase < 0.5 ? -1.35 : 1.65;
          a.g.scale.y = 1;
          a.status = '跳下木箱到休息角落伸懶腰、巡視工坊';
          a.mood = '散步巡視';
        }
      } else {
        const hop = reacting ? Math.abs(Math.sin(time * 9)) * 0.12 : Math.max(0, Math.sin(time * 3.2)) * 0.03;
        const z = a.center[2] + Math.sin(time * 1.1) * 0.06;
        a.curPos = [a.center[0], a.center[1] + hop, z];
        a.g.position.set(...a.curPos);
        a.g.rotation.y = -Math.PI / 2 + Math.sin(time * 1.8) * 0.25;
        a.limbs.forEach((w, k) => {
          w.rotation.z = (k === 0 ? -1 : 1) * (reacting ? Math.abs(Math.sin(time * 16)) * 0.65 : Math.sin(time * 3) * 0.08);
        });
      }
      a.ears.forEach((e, k) => {
        e.rotation.z = Math.sin(time * (reacting ? 8 : 2.2) + k) * 0.12;
      });
    }
  }

  function interact(index, action = 'pet') {
    const a = animals[index];
    if (!a) return null;
    a.visits++;
    a.action = action;
    a.treat.visible = action === 'feed';
    a.reactPos = [...(a.curPos || a.center)];
    a.reactionUntil = performance.now() + 4500;
    a.mood = action === 'feed' ? '心滿意足' : '開心回應';
    a.status = action === 'feed'
      ? ['聞了聞小魚餅乾，開心地搖搖尾巴！', '低頭啄起香脆穀粒，清脆地啾啾兩聲！'][index]
      : ['呼嚕呼嚕～開心地抬起頭蹭蹭你的手。', '拍拍暖棕色翅膀，在窗臺木棲架上跳了兩下向你問好！'][index];
    return {
      text: a.status,
      mood: a.mood,
      emote: action === 'feed' ? '✦' : '♥'
    };
  }

  update(0);
  return {animals, update, interact};
}

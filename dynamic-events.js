import {LIFE_LAYOUT as L} from './life-layout.js';

// 24-Hour Non-Stop Dynamic Event Director (Mode 2: 動態事件模式)
// Composes spontaneous, context-aware workshop events across 4 categories while keeping
// base studio/life/courier routines as the fallback and immediately yielding to priority deliveries.

const ZONE_2F_FULL = ([x, z]) => z <= 0.60;
const ZONE_1F_LEFT = ([x, z]) => x <= -0.88 && x >= -6.45 && z <= 2.90;
const ZONE_1F_RIGHT = ([x, z]) => x >= 0.88 && x <= 6.45 && z <= 2.90;

function pick(list, rng) {
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

function insideHomeStudio(a) {
  if (a.index === 0) return a.floor === 2 && a.p[0] <= -2.52;
  if (a.index === 1) return a.floor === 2 && a.p[0] >= 2.52;
  if (a.index === 2) return a.floor === 1 && a.p[0] <= -2.66;
  if (a.index === 3) return a.floor === 1 && a.p[0] >= 2.66;
  return true;
}

export function createDynamicEventDirector({
  actors,
  setFloorGoal,
  stepPath,
  elevator,
  lanes,
  life,
  studioRoutines,
  getContext = () => ({workName: '機械小鳥', installedCount: 0, animals: []}),
  random = Math.random
}) {
  for (const a of actors) {
    a.dynamicAllowed = null;
    a.dynamicReturning = false;
    a.dynamicLane = null;
  }

  const stats = {
    triggered: 0,
    completed: 0,
    preempted: 0,
    byCategory: {brainstorm: 0, support: 0, appraisal: 0, animal: 0},
    lastEventId: null
  };

  let active = null;
  let cooldown = 3.2;
  const recentIds = [];

  function rememberId(id) {
    recentIds.push(id);
    if (recentIds.length > 4) recentIds.shift();
    stats.lastEventId = id;
  }

  function releaseActorLane(a) {
    if (a.dynamicLane !== null) {
      const lane = lanes[a.dynamicLane];
      if (lane && lane.owner === a.index) lane.owner = null;
      a.dynamicLane = null;
    }
  }

  function reserveActorLane(a, laneIdx) {
    if (a.dynamicLane === laneIdx && lanes[laneIdx].owner === a.index) return true;
    const lane = lanes[laneIdx];
    if (!lane || lane.owner !== null || lane.queue.length > 0) return false;
    if (
      actors.some(
        b =>
          b.index < 4 &&
          b !== a &&
          b.index % 2 === laneIdx &&
          (b.priorityDelivery || !['working', 'resting'].includes(b.stage))
      )
    ) {
      return false;
    }
    lane.owner = a.index;
    a.dynamicLane = laneIdx;
    return true;
  }

  function isStudioActorFree(idx) {
    const a = actors[idx];
    if (!a || a.priorityDelivery || a.doorSession || a.usingElevator) return false;
    if (a.floor !== a.cfg.homeFloor || !['working', 'resting'].includes(a.stage)) return false;
    if (a.dynamicReturning) return false;
    const tour = actors[4]?.tour;
    if (
      tour?.room?.resident === idx &&
      actors[4].floor === a.floor &&
      ['tour-out', 'tour-visit', 'tour-return'].includes(actors[4].stage)
    ) {
      return false;
    }
    return true;
  }

  function is2FBridgeClear() {
    const c = actors[4];
    if (!c) return true;
    if (c.floor === 2 || c.usingElevator || c.stage === 'to-lift-1f' || elevator.targetFloor === 2) {
      return false;
    }
    return !actors[0].priorityDelivery && !actors[1].priorityDelivery;
  }

  function sendActorHome(a) {
    if (!a || a.index >= 4) return;
    if (insideHomeStudio(a)) {
      releaseActorLane(a);
      a.dynamicReturning = false;
      a.dynamicAllowed = null;
      a.goal = null;
      a.path = [];
      return;
    }
    a.dynamicReturning = true;
    if (a.floor === 2) {
      a.dynamicAllowed = ZONE_2F_FULL;
    } else {
      a.dynamicAllowed = a.index === 2 ? ZONE_1F_LEFT : ZONE_1F_RIGHT;
    }
    a.goal = null;
    a.path = [];
  }

  function abortActiveEvent(reason = 'preempted') {
    if (!active) return;
    const participants = active.actors.map(i => actors[i]).filter(Boolean);
    active = null;
    cooldown = 2.8 + random() * 2.2;
    if (reason === 'preempted') stats.preempted++;
    for (const a of participants) {
      a.r.activity = '';
      sendActorHome(a);
    }
  }

  function finishActiveEvent() {
    if (!active) return;
    const participants = active.actors.map(i => actors[i]).filter(Boolean);
    active = null;
    cooldown = 4.2 + random() * 3.4;
    stats.completed++;
    for (const a of participants) {
      a.r.activity = '';
      sendActorHome(a);
    }
  }

  function interruptActor(a) {
    if (!a) return;
    if (active && (active.actors.includes(a.index) || (a.index < 4 && active.lane === a.index % 2))) {
      abortActiveEvent('preempted');
    }
    if (a.index < 4) {
      if (insideHomeStudio(a)) {
        releaseActorLane(a);
        a.dynamicReturning = false;
        a.dynamicAllowed = null;
      } else {
        a.dynamicReturning = true;
        a.dynamicAllowed = a.floor === 2 ? ZONE_2F_FULL : a.index === 2 ? ZONE_1F_LEFT : ZONE_1F_RIGHT;
      }
    }
  }

  function buildCandidateEvents() {
    const ctx = getContext() || {};
    const workName = ctx.workName || '機械小鳥';
    const installedCount = Number(ctx.installedCount) || 0;
    const animals = Array.isArray(ctx.animals) ? ctx.animals : [];
    const cat = animals.find(x => x.index === 0);
    const candidates = [];

    // =========================================================================
    // Category 1: Cross-Studio Brainstorm & Consultation (跨區腦力激盪／串門子請益)
    // =========================================================================
    if (isStudioActorFree(0) && isStudioActorFree(1) && is2FBridgeClear()) {
      const dialogues = [
        [
          `阿鏡，${workName}的方位齒輪我想微調半格，幫我確認對稱度好嗎？`,
          `沒問題！我剛用放大鏡比對過，對準中軸線後轉起來一定超順暢！`
        ],
        [
          `二樓視野真清楚，我們把空間刻度跟視覺焦點對齊，${workName}會更精緻！`,
          `好主意！左右兩側的黃銅比例我已經標記好了，隨時可以接合。`
        ],
        [
          `聽見鐘擺跟齒輪的共鳴了嗎？今天大家組裝${workName}的節奏特別合拍！`,
          `對呀，連細微的刻痕都分毫不差，這件作品一定很棒！`
        ]
      ];
      const [line0, line1] = pick(dialogues, random);
      candidates.push({
        id: '2f-bridge-summit',
        category: 'brainstorm',
        weight: 1.35,
        actors: [0, 1],
        lane: null,
        logText: `✨ 【動態事件】小時與阿鏡在二樓連通廊交流「${workName}」的精密結構`,
        setup() {
          actors[0].dynamicAllowed = ZONE_2F_FULL;
          actors[1].dynamicAllowed = ZONE_2F_FULL;
          studioRoutines.interrupt(actors[0]);
          studioRoutines.interrupt(actors[1]);
        },
        targets: {0: [-0.66, -0.56], 1: [0.66, -0.56]},
        activityWalk: {
          0: '走向二樓連通廊，找阿鏡討論作品結構',
          1: '走向二樓連通廊，與小時交流觀察細節'
        },
        activityAct: {
          0: `在連通廊與阿鏡腦力激盪「${workName}」的角度配置`,
          1: `在連通廊與小時核對「${workName}」的對稱細節`
        },
        lookAt: {0: () => [actors[1].p[0], actors[1].p[1]], 1: () => [actors[0].p[0], actors[0].p[1]]},
        duration: 4.4,
        speeches: [
          {at: 0.25, actor: 0, text: line0, mood: '腦力激盪', emote: '⚙'},
          {at: 2.15, actor: 1, text: line1, mood: '默契回應', emote: '☺'}
        ]
      });

      const visitSpatial = random() < 0.5;
      if (visitSpatial) {
        candidates.push({
          id: '2f-visit-spatial',
          category: 'brainstorm',
          weight: 1.0,
          actors: [0, 1],
          lane: null,
          logText: `✨ 【動態事件】阿鏡跨過二樓連通廊，前往空間認知工作室與小時切磋`,
          setup() {
            actors[0].dynamicAllowed = ZONE_2F_FULL;
            actors[1].dynamicAllowed = ZONE_2F_FULL;
            studioRoutines.interrupt(actors[0]);
            studioRoutines.interrupt(actors[1]);
          },
          targets: {0: [-3.52, -0.56], 1: [-2.64, -0.56]},
          activityWalk: {
            0: '在空間認知工作室迎接阿鏡來訪',
            1: '跨過二樓連通廊，前往空間認知工作室串門子'
          },
          activityAct: {
            0: '向阿鏡展示多面體木模與大鐘齒輪',
            1: '在空間認知工作室與小時比對立體刻度'
          },
          lookAt: {0: () => [actors[1].p[0], actors[1].p[1]], 1: () => [actors[0].p[0], actors[0].p[1]]},
          duration: 4.2,
          speeches: [
            {
              at: 0.2,
              actor: 1,
              text: `小時，我過來看看多面體木模的傾角，這樣${workName}兩側能接合得更密合！`,
              mood: '串門請益',
              emote: '🔍'
            },
            {
              at: 2.1,
              actor: 0,
              text: `歡迎歡迎！你看這組方位齒輪，加上你的精密校準就更穩了！`,
              mood: '熱情分享',
              emote: '⚙'
            }
          ]
        });
      } else {
        candidates.push({
          id: '2f-visit-attention',
          category: 'brainstorm',
          weight: 1.0,
          actors: [0, 1],
          lane: null,
          logText: `✨ 【動態事件】小時前往二樓視覺注意力工作室，與阿鏡一起檢視標本細節`,
          setup() {
            actors[0].dynamicAllowed = ZONE_2F_FULL;
            actors[1].dynamicAllowed = ZONE_2F_FULL;
            studioRoutines.interrupt(actors[0]);
            studioRoutines.interrupt(actors[1]);
          },
          targets: {0: [2.64, -0.56], 1: [3.52, -0.56]},
          activityWalk: {
            0: '跨過二樓連通廊，前往視覺注意力工作室拜訪阿鏡',
            1: '在放大鏡工作臺旁迎接小時來訪'
          },
          activityAct: {
            0: '在視覺注意力工作室與阿鏡查看放大鏡細節',
            1: '與小時一起討論黃銅組件的對稱紋理'
          },
          lookAt: {0: () => [actors[1].p[0], actors[1].p[1]], 1: () => [actors[0].p[0], actors[0].p[1]]},
          duration: 4.2,
          speeches: [
            {
              at: 0.2,
              actor: 0,
              text: `阿鏡，借你的巨型放大鏡看看，這批核心齒輪的齒距是不是特別勻稱？`,
              mood: '好奇交流',
              emote: '⚙'
            },
            {
              at: 2.1,
              actor: 1,
              text: `哇，連細小的導角都清清楚楚，裝上${workName}一定分毫不差！`,
              mood: '專業讚賞',
              emote: '✨'
            }
          ]
        });
      }
    }

    if (isStudioActorFree(2)) {
      const partner = actors[5]?.life?.seated > 0.5 ? 5 : 7;
      const partnerName = actors[partner]?.r?.name || '朵朵';
      candidates.push({
        id: '1f-memory-coffee-brainstorm',
        category: 'brainstorm',
        weight: 1.15,
        actors: [2],
        lane: null,
        logText: `✨ 【動態事件】芽芽走到茶歇角落旁，與${partnerName}交流「${workName}」的組裝圖譜`,
        setup() {
          actors[2].dynamicAllowed = ZONE_1F_LEFT;
          studioRoutines.interrupt(actors[2]);
        },
        targets: {2: [-2.86, 0.54]},
        activityWalk: {2: `走向茶歇角落旁，與${partnerName}核對組裝筆記`},
        activityAct: {2: `與${partnerName}分享「${workName}」的記憶圖卡順序`},
        lookAt: {2: () => [actors[partner].p[0], actors[partner].p[1]]},
        duration: 4.0,
        speeches: [
          {
            at: 0.2,
            actor: 2,
            text: `${partnerName}，我把「${workName}」的四道組裝步驟編成順口溜了，這樣大家更好記！`,
            mood: '靈感分享',
            emote: '💡'
          },
          {
            at: 2.0,
            actor: partner,
            text: `太棒了芽芽！我趕快寫進工坊筆記裡，邊喝咖啡邊複習！`,
            mood: '開心紀錄',
            emote: '☕'
          }
        ]
      });
    }

    // =========================================================================
    // Category 2: Equipment Inspection, Gramophone Relay & Supply Support
    // =========================================================================
    if (isStudioActorFree(3) && actors[6]?.life?.seated > 0.85) {
      const musicLow = life.music.remaining < 32;
      candidates.push({
        id: '1f-gramophone-relay',
        category: 'support',
        weight: musicLow ? 2.1 : 1.25,
        actors: [3],
        lane: null,
        logText: `✨ 【動態事件】方方前往音樂角幫留聲機接力上發條，與點點共賞旋律`,
        setup() {
          actors[3].dynamicAllowed = ZONE_1F_RIGHT;
          studioRoutines.interrupt(actors[3]);
        },
        targets: {3: [3.74, -0.12]},
        activityWalk: {3: '走向音樂角留聲機，準備幫忙檢查發條與唱針'},
        activityAct: {3: '幫音樂角留聲機接力上發條，與點點一起聽音樂'},
        lookAt: {3: () => [L.music.cabinet[0], L.music.cabinet[2]]},
        duration: 4.2,
        onActTick(dt) {
          life.music.remaining = 60;
          life.music.wind += dt * 4.5;
        },
        speeches: [
          {
            at: 0.25,
            actor: 3,
            text: musicLow
              ? `點點，我聽見留聲機轉速慢下來了，順手幫妳把發條上滿囉！`
              : `點點，這張黑膠唱片的節奏真好聽，我幫留聲機再補幾圈發條！`,
            mood: '熱心支援',
            emote: '🎵'
          },
          {
            at: 2.1,
            actor: 6,
            text: `謝謝方方！有溫暖的旋律陪著，我們敲鉚釘跟分揀彩木都更有精神呢♪`,
            mood: '愜意共賞',
            emote: '☺'
          }
        ]
      });
    }

    if (
      isStudioActorFree(2) &&
      lanes[0].owner === null &&
      lanes[0].queue.length === 0 &&
      !actors[0].priorityDelivery &&
      ['working', 'resting'].includes(actors[0].stage) &&
      (actors[4].floor !== 1 || actors[4].p[0] > -0.5)
    ) {
      candidates.push({
        id: '1f-pushcart-supply',
        category: 'support',
        weight: 1.2,
        actors: [2],
        lane: 0,
        logText: `✨ 【動態事件】芽芽前往前廊材料推車清點備用齒輪與木蠟補給`,
        setup() {
          reserveActorLane(actors[2], 0);
          actors[2].dynamicAllowed = ZONE_1F_LEFT;
          studioRoutines.interrupt(actors[2]);
        },
        targets: {2: [-1.32, 2.52]},
        activityWalk: {2: '前往前廊材料推車，準備盤點備用零件'},
        activityAct: {2: `清點前廊材料推車上的「${workName}」備用齒輪與木蠟`},
        lookAt: {2: () => [-1.98, 2.78]},
        duration: 3.8,
        speeches: [
          {
            at: 0.2,
            actor: 2,
            text: `圓圓，前廊推車裡的備用黃銅齒輪與保養木蠟我都清點好囉，數量很充足！`,
            mood: '補給盤點',
            emote: '📦'
          },
          {
            at: 1.95,
            actor: 7,
            text: `太感謝妳了芽芽！這樣待會組裝「${workName}」隨時都有材料可用！`,
            mood: '安心合作',
            emote: '☺'
          }
        ]
      });
    }

    if (isStudioActorFree(3) && actors[4].floor === 1 && Math.abs(actors[4].p[0]) < 1.5) {
      candidates.push({
        id: '1f-lift-mechanism-check',
        category: 'support',
        weight: 1.15,
        actors: [3],
        lane: null,
        logText: `✨ 【動態事件】方方與升降臺領航員小郵交換中央齒輪塔的運轉紀錄`,
        setup() {
          actors[3].dynamicAllowed = ZONE_1F_RIGHT;
          studioRoutines.interrupt(actors[3]);
        },
        targets: {3: [2.86, -0.56]},
        activityWalk: {3: '走向工作室內側通道口，與小郵確認升降臺狀態'},
        activityAct: {3: '與小郵交換升降臺齒輪與配送動線的巡檢紀錄'},
        lookAt: {3: () => [actors[4].p[0], actors[4].p[1]]},
        duration: 3.8,
        speeches: [
          {
            at: 0.2,
            actor: 3,
            text: `小郵，今天中央升降臺的齒輪咬合聲很清脆，上下樓巡視辛苦囉！`,
            mood: '夥伴關懷',
            emote: '⚙'
          },
          {
            at: 1.9,
            actor: 4,
            text: `哈哈，剛上過保養油超順暢！二樓跟一樓的組件隨時都能支援！`,
            mood: '元氣滿滿',
            emote: '✨'
          }
        ]
      });
    }

    // =========================================================================
    // Category 3: Central Workbench Gathering & Progress Appraisal (中央圓桌圍觀與品評)
    // =========================================================================
    const progressLine =
      installedCount >= 4
        ? `哇！四個組件全部合體的「${workName}」在圓桌上閃閃發亮，真是大家的得意之作！`
        : installedCount > 0
          ? `你看，中央圓桌的「${workName}」已經完成 ${installedCount}/4 個部位了，輪廓越來越生動！`
          : `中央圓桌的「${workName}」底座與托盤都準備就緒了，真期待第一個組件送過來！`;

    if (
      isStudioActorFree(2) &&
      lanes[0].owner === null &&
      lanes[0].queue.length === 0 &&
      !actors[0].priorityDelivery &&
      ['working', 'resting'].includes(actors[0].stage) &&
      (actors[4].floor !== 1 || actors[4].p[0] > -0.5)
    ) {
      candidates.push({
        id: '1f-workbench-left-appraisal',
        category: 'appraisal',
        weight: installedCount > 0 ? 1.55 : 1.15,
        actors: [2],
        lane: 0,
        logText: `✨ 【動態事件】芽芽走到中央製作臺旁，近距離品評「${workName}」（進度 ${installedCount}/4）`,
        setup() {
          reserveActorLane(actors[2], 0);
          actors[2].dynamicAllowed = ZONE_1F_LEFT;
          studioRoutines.interrupt(actors[2]);
        },
        targets: {2: [-1.54, 1.20]},
        activityWalk: {2: `走向中央製作臺，去看看「${workName}」目前的組裝進度`},
        activityAct: {2: `在中央製作臺旁端詳「${workName}」（已完成 ${installedCount}/4）`},
        lookAt: {2: () => [0, 1.68]},
        duration: 3.9,
        speeches: [
          {at: 0.25, actor: 2, text: progressLine, mood: '圍觀品評', emote: '✨'},
          {
            at: 2.05,
            actor: 5,
            text:
              installedCount >= 4
                ? `沒錯！每個齒輪跟卡榫都嚴絲合縫，隨時可以啟動展示囉！`
                : `我們把微調扳手都備好了，只要新零件送達就能立刻組裝！`,
            mood: '協力回應',
            emote: '⚙'
          }
        ]
      });
    }

    if (
      isStudioActorFree(3) &&
      lanes[1].owner === null &&
      lanes[1].queue.length === 0 &&
      !actors[1].priorityDelivery &&
      ['working', 'resting'].includes(actors[1].stage) &&
      (actors[4].floor !== 1 || actors[4].p[0] < 0.5)
    ) {
      candidates.push({
        id: '1f-workbench-right-appraisal',
        category: 'appraisal',
        weight: installedCount > 0 ? 1.55 : 1.15,
        actors: [3],
        lane: 1,
        logText: `✨ 【動態事件】方方走到中央製作臺右側，端詳「${workName}」的機構接合（進度 ${installedCount}/4）`,
        setup() {
          reserveActorLane(actors[3], 1);
          actors[3].dynamicAllowed = ZONE_1F_RIGHT;
          studioRoutines.interrupt(actors[3]);
        },
        targets: {3: [1.54, 1.20]},
        activityWalk: {3: `走向中央製作臺，去欣賞「${workName}」的組裝進展`},
        activityAct: {3: `在中央圓桌旁品評「${workName}」的幾何結構（進度 ${installedCount}/4）`},
        lookAt: {3: () => [0, 1.68]},
        duration: 3.9,
        speeches: [
          {
            at: 0.25,
            actor: 3,
            text:
              installedCount >= 4
                ? `從圓桌正面看過去，「${workName}」的平衡感與配色真是無可挑剔！`
                : `「${workName}」目前完成 ${installedCount}/4，每個托盤的卡槽角度都對得很準呢！`,
            mood: '專業品評',
            emote: '✨'
          },
          {
            at: 2.05,
            actor: 6,
            text: `看著作品一點一滴在圓桌成形，整個腦內工坊都充滿活力了！`,
            mood: '欣喜共鳴',
            emote: '☺'
          }
        ]
      });
    }

    if (isStudioActorFree(0) || isStudioActorFree(1)) {
      const idx = isStudioActorFree(0) && (!isStudioActorFree(1) || random() < 0.5) ? 0 : 1;
      const spot = idx === 0 ? [-2.64, -0.34] : [2.64, 0.32];
      candidates.push({
        id: `2f-balcony-overlook-${idx}`,
        category: 'appraisal',
        weight: 1.1,
        actors: [idx],
        lane: null,
        logText: `✨ 【動態事件】${actors[idx].r.name}在二樓弧形陽台俯瞰一樓中央圓桌的「${workName}」`,
        setup() {
          actors[idx].dynamicAllowed = ZONE_2F_FULL;
          studioRoutines.interrupt(actors[idx]);
        },
        targets: {[idx]: spot},
        activityWalk: {[idx]: '走向二樓弧形欄杆旁，俯瞰一樓中央製作臺'},
        activityAct: {[idx]: `從二樓俯瞰中央圓桌的「${workName}」（進度 ${installedCount}/4）`},
        lookAt: {[idx]: () => [0, 1.68]},
        duration: 3.8,
        speeches: [
          {
            at: 0.25,
            actor: idx,
            text:
              installedCount >= 4
                ? `從二樓陽台往下看，完成的「${workName}」在圓桌中央超有氣勢！`
                : `從二樓俯瞰整個中央圓桌，「${workName}」（${installedCount}/4）的結構比例一目了然！`,
            mood: '登高俯瞰',
            emote: '🔭'
          }
        ]
      });
    }

    // =========================================================================
    // Category 4: Spontaneous Animal Encounters (偶遇栗子貓與小青鳥)
    // =========================================================================
    if (isStudioActorFree(1)) {
      candidates.push({
        id: '2f-azure-songbird-visit',
        category: 'animal',
        weight: 1.3,
        actors: [1],
        lane: null,
        logText: `✨ 【動態事件】阿鏡走到二樓窗臺棲架旁，與小青鳥親切互動`,
        setup() {
          actors[1].dynamicAllowed = ZONE_2F_FULL;
          studioRoutines.interrupt(actors[1]);
        },
        targets: {1: [4.40, -0.56]},
        activityWalk: {1: '走向二樓窗臺木棲架，去看看小青鳥'},
        activityAct: {1: '在窗臺邊向小青鳥揮手問好，聽牠清脆鳴唱'},
        lookAt: {1: () => [4.98, -0.55]},
        duration: 3.9,
        onActStart(events) {
          actors[1].r.greeting = 2.4;
          events.push([
            1,
            'dynamic-animal-speech',
            {
              text: '啾啾～拍拍藍色翅膀，歪著頭回應阿鏡的問候！',
              mood: '開心伴奏',
              emote: '🐦'
            }
          ]);
        },
        speeches: [
          {
            at: 0.2,
            actor: 1,
            text: `嗨小青！今天在窗臺唱得真好聽，像是在替我們的「${workName}」加油呢！`,
            mood: '溫馨偶遇',
            emote: '🐦'
          }
        ]
      });
    }

    if (cat && Array.isArray(cat.p)) {
      const [cx, cz] = cat.p;
      if (cx < -1.2 && cz < 1.6 && isStudioActorFree(2)) {
        candidates.push({
          id: '1f-chestnut-cat-left',
          category: 'animal',
          weight: 1.75,
          actors: [2],
          lane: null,
          logText: `✨ 【動態事件】芽芽偶遇正在一樓散步的栗子貓，停下腳步溫柔打招呼`,
          setup() {
            actors[2].dynamicAllowed = ZONE_1F_LEFT;
            studioRoutines.interrupt(actors[2]);
          },
          targets: {2: [-2.86, 0.54]},
          activityWalk: {2: '看見栗子貓經過工作室旁，放輕腳步走過去打招呼'},
          activityAct: {2: '微笑著向散步中的栗子貓揮手問好'},
          lookAt: {2: () => [cat.p[0], cat.p[1]]},
          duration: 3.6,
          onActStart(events) {
            actors[2].r.greeting = 2.2;
            events.push([
              0,
              'dynamic-animal-speech',
              {
                text: '喵嗚～呼嚕呼嚕地晃晃尾巴，好奇地聞了聞地板上的木香！',
                mood: '悠閒散步',
                emote: '🐱'
              }
            ]);
          },
          speeches: [
            {
              at: 0.2,
              actor: 2,
              text: `咦，栗子散步經過工作記憶工作室啦！毛茸茸的尾巴搖來搖去真可愛～`,
              mood: '驚喜偶遇',
              emote: '🐱'
            }
          ]
        });
      } else if (cx > 1.2 && cz < 1.6 && isStudioActorFree(3)) {
        candidates.push({
          id: '1f-chestnut-cat-right',
          category: 'animal',
          weight: 1.75,
          actors: [3],
          lane: null,
          logText: `✨ 【動態事件】方方偶遇巡視一樓走道的栗子貓，開心地揮手互動`,
          setup() {
            actors[3].dynamicAllowed = ZONE_1F_RIGHT;
            studioRoutines.interrupt(actors[3]);
          },
          targets: {3: [3.08, 0.54]},
          activityWalk: {3: '看見栗子貓走近語意判斷工作室，停下腳步向牠問好'},
          activityAct: {3: '溫柔地看著栗子貓在走道巡視'},
          lookAt: {3: () => [cat.p[0], cat.p[1]]},
          duration: 3.6,
          onActStart(events) {
            actors[3].r.greeting = 2.2;
            events.push([
              0,
              'dynamic-animal-speech',
              {
                text: '呼嚕嚕～抬起頭看了看方方手裡的彩色木塊！',
                mood: '好奇探索',
                emote: '🐱'
              }
            ]);
          },
          speeches: [
            {
              at: 0.2,
              actor: 3,
              text: `栗子今天也在巡視一樓走道呢，是在幫我們檢查地板乾不乾淨嗎？`,
              mood: '開心偶遇',
              emote: '🐱'
            }
          ]
        });
      } else if (
        cat.state === 'rest' &&
        isStudioActorFree(3) &&
        lanes[1].owner === null &&
        lanes[1].queue.length === 0 &&
        !actors[1].priorityDelivery &&
        ['working', 'resting'].includes(actors[1].stage) &&
        (actors[4].floor !== 1 || actors[4].p[0] < 0.5)
      ) {
        candidates.push({
          id: '1f-chestnut-cat-cushion',
          category: 'animal',
          weight: 1.2,
          actors: [3],
          lane: 1,
          logText: `✨ 【動態事件】方方輕步走到木箱軟墊旁，探望正在打盹的栗子貓`,
          setup() {
            reserveActorLane(actors[3], 1);
            actors[3].dynamicAllowed = ZONE_1F_RIGHT;
            studioRoutines.interrupt(actors[3]);
          },
          targets: {3: [1.32, 2.52]},
          activityWalk: {3: '放輕腳步走向前廊木箱軟墊，去看看休息中的栗子貓'},
          activityAct: {3: '在木箱軟墊旁溫柔地看看打盹的栗子貓'},
          lookAt: {3: () => [1.98, 2.82]},
          duration: 3.6,
          onActStart(events) {
            events.push([
              0,
              'dynamic-animal-speech',
              {
                text: '呼嚕……呼嚕……在溫暖的軟墊上安心地動了動耳朵。',
                mood: '呼嚕休息',
                emote: '🐱'
              }
            ]);
          },
          speeches: [
            {
              at: 0.25,
              actor: 3,
              text: `噓——栗子在木箱軟墊上睡得好香，我們經過時腳步要放輕一點喔。`,
              mood: '溫柔守護',
              emote: '🐱'
            }
          ]
        });
      }
    }

    return candidates;
  }

  function tryStartNextEvent(events) {
    const candidates = buildCandidateEvents();
    if (!candidates.length) {
      cooldown = 1.5;
      return;
    }
    const fresh = candidates.filter(c => !recentIds.includes(c.id));
    const pool = fresh.length ? fresh : candidates;
    const totalWeight = pool.reduce((sum, c) => sum + (c.weight || 1), 0);
    let roll = random() * totalWeight;
    let chosen = pool[0];
    for (const c of pool) {
      roll -= c.weight || 1;
      if (roll <= 0) {
        chosen = c;
        break;
      }
    }
    chosen.setup?.();
    active = {
      ...chosen,
      phase: 'walk',
      elapsed: 0,
      walkTime: 0,
      arrived: new Set(),
      spoken: new Set()
    };
    rememberId(chosen.id);
    stats.triggered++;
    stats.byCategory[chosen.category] = (stats.byCategory[chosen.category] || 0) + 1;
    if (chosen.logText) {
      events.push([chosen.actors[0], 'dynamic-log', chosen.logText]);
    }
  }

  function tick(dt, events) {
    // 1. Check if active event must yield to priority deliveries or elevator/lane contention
    if (active) {
      const mustYield =
        active.actors.some(idx => {
          const a = actors[idx];
          return !a || a.priorityDelivery || a.doorSession || a.usingElevator;
        }) ||
        (active.actors.some(idx => actors[idx]?.floor === 2) &&
          active.id.startsWith('2f-') &&
          !active.id.startsWith('2f-balcony') &&
          !active.id.startsWith('2f-azure') &&
          !is2FBridgeClear()) ||
        (active.lane !== null &&
          (lanes[active.lane].queue.length > 0 ||
            actors.some(b => b.index < 4 && b.index % 2 === active.lane && b.priorityDelivery)));

      if (mustYield) {
        abortActiveEvent('preempted');
      }
    }

    // 2. Advance active event state machine
    if (active) {
      if (active.phase === 'walk') {
        active.walkTime += dt;
        if (active.walkTime > 12.0) {
          abortActiveEvent('timeout');
        } else if (active.actors.every(idx => active.arrived.has(idx))) {
          active.phase = 'act';
          active.elapsed = 0;
          active.onActStart?.(events);
        }
      } else if (active.phase === 'act') {
        active.elapsed += dt;
        active.onActTick?.(dt);
        for (let i = 0; i < (active.speeches || []).length; i++) {
          const s = active.speeches[i];
          if (!active.spoken.has(i) && active.elapsed >= s.at) {
            active.spoken.add(i);
            const speaker = actors[s.actor]?.r;
            if (speaker) {
              speaker.mood = s.mood;
              speaker.lastSpeech = s.text;
            }
            events.push([
              s.actor,
              'dynamic-speech',
              {
                text: s.text,
                mood: s.mood,
                emote: s.emote,
                logText: i === 0 ? `${actors[s.actor]?.r?.name || '居民'}：「${s.text}」` : null
              }
            ]);
          }
        }
        if (active.elapsed >= active.duration) {
          finishActiveEvent();
        }
      }
    } else {
      cooldown -= dt;
      if (cooldown <= 0 && !actors.some(a => a.dynamicReturning)) {
        tryStartNextEvent(events);
      }
    }
  }

  function updateActor(a, dt) {
    if (!a || a.index >= 4 || a.priorityDelivery) {
      if (a && a.index < 4 && insideHomeStudio(a)) {
        releaseActorLane(a);
        a.dynamicReturning = false;
        a.dynamicAllowed = null;
      }
      return false;
    }

    // Case 1: Actor is participating in the currently active dynamic event
    if (active && active.actors.includes(a.index)) {
      a.stage = 'working';
      const target = active.targets[a.index];
      if (active.phase === 'walk') {
        if (active.arrived.has(a.index)) {
          a.moving = false;
          a.r.state = 'observing';
          a.r.activity = active.activityAct?.[a.index] || '在工坊裡與夥伴交流';
          const lookFn = active.lookAt?.[a.index];
          if (lookFn) {
            const pt = lookFn();
            if (pt) a.yaw = Math.atan2(pt[0] - a.p[0], pt[1] - a.p[1]);
          }
          return true;
        }
        const side = a.index % 2 === 0 ? -1 : 1;
        let stepTarget = target;
        if (a.floor === 1 && side * a.p[0] > 2.65 && side * target[0] < 2.2) {
          stepTarget = [side * 1.05, L.rearPassageZ];
        }
        setFloorGoal(a, stepTarget);
        const reached = stepPath(a, dt, 0.92, 0.06) && stepTarget === target;
        a.r.state = a.moving ? 'walking' : 'observing';
        a.r.activity = active.activityWalk?.[a.index] || '走向動態事件地點';
        if (reached) {
          active.arrived.add(a.index);
          a.moving = false;
          a.goal = null;
          a.path = [];
        }
        return true;
      }

      if (active.phase === 'act') {
        a.moving = false;
        a.r.state = 'inspecting';
        a.r.activity = active.activityAct?.[a.index] || '與夥伴進行動態交流';
        const lookFn = active.lookAt?.[a.index];
        if (lookFn) {
          const pt = lookFn();
          if (pt) a.yaw = Math.atan2(pt[0] - a.p[0], pt[1] - a.p[1]);
        }
        return true;
      }
    }

    // Case 2: Actor is returning to its home studio after a dynamic event
    if (a.dynamicReturning) {
      if (insideHomeStudio(a)) {
        releaseActorLane(a);
        a.dynamicReturning = false;
        a.dynamicAllowed = null;
        a.goal = null;
        a.path = [];
        return false;
      }
      a.stage = 'working';
      const side = a.index % 2 === 0 ? -1 : 1;
      const home = a.cfg.homePos;
      const waypoint =
        a.floor === 1 && side * a.p[0] < 2.65 ? [side * 2.86, L.rearPassageZ] : home;
      setFloorGoal(a, waypoint);
      stepPath(a, dt, 1.12, 0.05);
      a.r.state = a.moving ? 'returning' : 'observing';
      a.r.activity = '完成交流，返回工作室崗位';
      if (insideHomeStudio(a)) {
        releaseActorLane(a);
        a.dynamicReturning = false;
        a.dynamicAllowed = null;
        a.goal = null;
        a.path = [];
      }
      return true;
    }

    return false;
  }

  return {
    tick,
    updateActor,
    interruptActor,
    getStats: () => ({
      ...stats,
      activeId: active?.id || null,
      activeCategory: active?.category || null,
      activePhase: active?.phase || null
    })
  };
}

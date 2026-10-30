import {PALETTE} from './palette.js';

export const AGES = ['7–12 歲', '13–18 歲', '19–35 歲', '36–55 歲', '56–70 歲', '71 歲以上'];

export const GAMES = [
  {
    id: 'time',
    name: '空間認知',
    zone: '空間認知工作室',
    floorLabel: '2F 左翼',
    partKey: 'core',
    color: PALETTE.studios[0].accent,
    tint: PALETTE.studios[0].tint,
    icon: 'clock',
    shortDesc: '觀察鐘面指針與空間方位，完成本次作品的定位組件。',
    desc: '在鐘面、方位儀與多面體木模之間，居民負責空間配置與組裝準備。完成「空間認知」挑戰後，工匠會配送本次作品的對應組件。',
    facts: ['鐘面空間配置', '校準組件位置', '保留原版計分']
  },
  {
    id: 'spot',
    name: '視覺注意力',
    zone: '視覺注意力工作室',
    floorLabel: '2F 右翼',
    partKey: 'wings',
    color: PALETTE.studios[1].accent,
    tint: PALETTE.studios[1].tint,
    icon: 'search',
    shortDesc: '透過放大鏡比對微小差異，檢查本次作品的精密組件。',
    desc: '觀察臺上擺著放大鏡、模型鳥與蝴蝶標本，居民負責檢查微小差異與零件品質。完成「視覺注意力」挑戰後，觀察員會配送本次作品的對應組件。',
    facts: ['放大鏡細節比對', '檢查零件細節', '保留原版計分']
  },
  {
    id: 'memory',
    name: '工作記憶',
    zone: '工作記憶工作室',
    floorLabel: '1F 左翼',
    partKey: 'melody',
    color: PALETTE.studios[2].accent,
    tint: PALETTE.studios[2].tint,
    icon: 'memory',
    shortDesc: '記住圖卡與材料順序，依序準備本次作品的機構組件。',
    desc: '溫暖的大樹下設有檔案抽屜與圖卡桌，居民依序整理清單與組裝步驟。完成「工作記憶」挑戰後，整理員會配送本次作品的對應組件。',
    facts: ['倒數 4 秒', '每圖 1.2 秒・間隔 0.3 秒', '整理組裝順序']
  },
  {
    id: 'switch',
    name: '語意判斷',
    zone: '語意判斷工作室',
    floorLabel: '1F 右翼',
    partKey: 'plumage',
    color: PALETTE.studios[3].accent,
    tint: PALETTE.studios[3].tint,
    icon: 'shapes',
    shortDesc: '理解題目所指定的規則，判斷符合條件的圖形。',
    desc: '理解題目中的文字規則，判斷符合條件的圖形。完成「語意判斷」挑戰後，居民會配送本次作品的對應組件。',
    facts: ['直接開始作答', '答完接續下一題', '理解文字規則']
  }
];

export const DEFAULTS = {
  sound: true,
  volume: 0.35,
  motion: true,
  cutaway: true,
  quality: 1.4,
  age: -1,
  paths: {
    time: 'legacy/clock_game.html',
    spot: 'legacy/find_diff_game.html',
    memory: 'legacy/memory_game_hard.html',
    switch: 'legacy/shape_color_game.html',
    ranking: 'legacy/index.html?workshopRecords=1',
    config: 'legacy/config.html'
  }
};

export const KEYS = {
  settings: 'brainWorkshop.v1.settings',
  crafting: 'brainWorkshop.v1.crafting',
  residents: 'brainWorkshop.v1.residents',
  pending: 'brainWorkshop.v1.pending',
  result: 'brainWorkshop.v1.result'
};

export function read(key, fallback, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) ?? fallback) : fallback;
  } catch {
    return fallback;
  }
}

export function write(key, value, storage = globalThis.localStorage) {
  try {
    storage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function safePath(path, baseHref = globalThis.location?.href || 'http://127.0.0.1:8766/') {
  if (typeof path !== 'string' || !path.trim()) return null;
  try {
    const u = new URL(path, baseHref);
    const b = new URL(baseHref);
    if (u.origin !== b.origin || !['http:', 'https:'].includes(u.protocol)) return null;
    return u;
  } catch {
    return null;
  }
}

// Crafting & Collection system for Brain Workshop v1.0.
// First complete blueprint: "機械小鳥" (Mechanical Songbird), extensible to future blueprints.
import {GAMES, KEYS, read, write} from './config.js';

export const BLUEPRINTS = [
  {
    id: 'mechanical-bird',
    name: '機械小鳥',
    icon: '🐦',
    subtitle: '發條羽翼共鳴木偶',
    description: '由四座工作室協力打造的第一號作品。結合空間齒輪核心、對稱黃銅羽翼、記憶音筒與彩色尾羽，完成後能在大廳展翅試飛，再回到中央圓桌。',
    parts: [
      {
        id: 'core',
        gameId: 'time',
        studioIndex: 0,
        name: '發條核心與身體木殼',
        shortName: '發條核心',
        desc: '由空間認知工作室校準方位與齒輪比，構成小鳥圓潤的木質軀幹與胸前運轉的黃銅大齒輪。'
      },
      {
        id: 'wings',
        gameId: 'spot',
        studioIndex: 1,
        name: '精密雙翼與青藍羽片',
        shortName: '精密雙翼',
        desc: '由視覺注意力工作室透過放大鏡仔細比對，確保左右羽片與連桿完全對稱。'
      },
      {
        id: 'melody',
        gameId: 'memory',
        studioIndex: 2,
        name: '記憶音筒與頭部機芯',
        shortName: '記憶音筒',
        desc: '由工作記憶工作室依序排列音梳與圖譜，賦予小鳥靈動的雙眼、鳥喙與清脆鳴叫。'
      },
      {
        id: 'plumage',
        gameId: 'switch',
        studioIndex: 3,
        name: '尾羽彩冠與平衡底座',
        shortName: '尾羽彩冠',
        desc: '由語意判斷工作室分揀幾何彩木，組合成優雅的扇形尾羽、頭冠與展示底座。'
      }
    ]
  },
  {
    id:'starlight-orrery', name:'齒輪天體儀', icon:'🪐', subtitle:'掌心裡的行星軌道',
    description:'木質底座、齒輪傳動、中心主軸與行星軌道，由四間工作室協力組裝。啟動搖柄，看齒輪帶動不同速度的行星繞行。',
    parts:[
      {id:'core',gameId:'time',studioIndex:0,name:'木質底座',shortName:'木質底座',desc:'校準底座與定位刻度，讓整組天體儀穩定直立。'},
      {id:'wings',gameId:'spot',studioIndex:1,name:'齒輪傳動與搖柄',shortName:'齒輪傳動',desc:'檢查齒輪齒距、傳動軸與搖柄的接合。'},
      {id:'melody',gameId:'memory',studioIndex:2,name:'中心主軸與太陽球',shortName:'中心主軸',desc:'依組裝順序安裝中心軸、軸套與太陽球。'},
      {id:'plumage',gameId:'switch',studioIndex:3,name:'行星軌道組',shortName:'行星軌道',desc:'依圖譜辨識並配置行星與軌道組。'}
    ]
  },
  {
    id:'clockwork-car',name:'發條機械車',icon:'🚙',subtitle:'齒輪帶動的小小旅程',
    description:'木質底盤、輪軸組、發條動力與車身，由四間工作室協力打造。可開啟車蓋觀察機芯，或切換到模型前方的桌面試車區巡遊後返回。',
    parts:[
      {id:'core',gameId:'time',studioIndex:0,name:'木質底盤',shortName:'木質底盤',desc:'校準車架、輪距與組件安裝位置。'},
      {id:'wings',gameId:'spot',studioIndex:1,name:'四輪與傳動輪軸組',shortName:'輪軸組',desc:'比對四個車輪與輪軸，檢查轉向接頭。'},
      {id:'melody',gameId:'memory',studioIndex:2,name:'發條動力與鑰匙',shortName:'發條動力',desc:'按照順序組裝發條鼓、傳動齒輪與鑰匙。'},
      {id:'plumage',gameId:'switch',studioIndex:3,name:'車身與活動車蓋',shortName:'車身',desc:'辨識車身部位並裝上座椅、擋風玻璃與活動車蓋。'}
    ]
  }
];

const PART_IDS=['core','wings','melody','plumage'];
function shuffled(ids,random=Math.random){
  const a=[...ids];for(let i=a.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[a[i],a[j]]=[a[j],a[i]];}return a;
}
export function defaultCraftingState(random=Math.random) {
  const order=shuffled(BLUEPRINTS.map(b=>b.id),random);
  return {version:2,activeBlueprintId:order[0],blueprintBag:order.slice(1),installedParts:[],
    partContributionCount:Object.fromEntries(PART_IDS.map(k=>[k,0])),processedTokens:[],collections:[],lastEvent:null};
}
export function normalizeCraftingState(raw) {
  if(!raw||typeof raw!=='object')return defaultCraftingState();
  const bp=BLUEPRINTS.find(b=>b.id===raw.activeBlueprintId)||BLUEPRINTS[0];
  const ids=BLUEPRINTS.map(b=>b.id);
  const bag=Array.isArray(raw.blueprintBag)?[...new Set(raw.blueprintBag.filter(id=>ids.includes(id)&&id!==bp.id))]:shuffled(ids.filter(id=>id!==bp.id));
  return {version:2,activeBlueprintId:bp.id,blueprintBag:bag,
    installedParts:[...new Set((Array.isArray(raw.installedParts)?raw.installedParts:[]).filter(id=>PART_IDS.includes(id)))],
    partContributionCount:Object.fromEntries(PART_IDS.map(k=>[k,Math.max(0,Math.floor(Number(raw.partContributionCount?.[k])||0))])),
    processedTokens:[...new Set((Array.isArray(raw.processedTokens)?raw.processedTokens:[]).filter(t=>typeof t==='string'&&t))].slice(-60),
    collections:(Array.isArray(raw.collections)?raw.collections:[]).filter(c=>c&&typeof c==='object'&&typeof c.name==='string'),
    lastEvent:raw.lastEvent&&typeof raw.lastEvent==='object'?raw.lastEvent:null};
}

export function loadCraftingState(storage = globalThis.localStorage) {
  return normalizeCraftingState(read(KEYS.crafting, null, storage));
}

export function saveCraftingState(state, storage = globalThis.localStorage) {
  return write(KEYS.crafting, normalizeCraftingState(state), storage);
}

export function getActiveBlueprint(state) {
  return BLUEPRINTS.find(b => b.id === state?.activeBlueprintId) || BLUEPRINTS[0];
}

// Each completed game grants its studio's module. Repeated studios assist the next missing module.
// Session tokens are consumed once; a completed work is collected only on its 3-to-4 transition.
export function applyGameCompletion(state, {gameId, token, status = 'completed', score = 0, timestamp = new Date().toLocaleString()} = {}) {
  const current = normalizeCraftingState(state);
  if (status !== 'completed') {
    return {state: current, applied: false, reason: 'not-completed'};
  }
  const game = GAMES.find(g => g.id === gameId);
  if (!game) {
    return {state: current, applied: false, reason: 'unknown-game'};
  }
  if (!token || typeof token !== 'string') {
    return {state: current, applied: false, reason: 'missing-token'};
  }
  if (current.processedTokens.includes(token)) {
    return {state: current, applied: false, reason: 'duplicate-token'};
  }

  const blueprint = getActiveBlueprint(current);
  // This cycle is complete as soon as all modules are earned, including the final
  // courier still in transit. Replays remain normal scored games, without new cargo.
  if(current.installedParts.length>=blueprint.parts.length){
    return {state:current,applied:false,reason:'work-complete'};
  }
  const directPart = blueprint.parts.find(p => p.gameId === gameId) || blueprint.parts[0];
  let unlockedPart = directPart;
  let assisted = false;

  if (current.installedParts.includes(directPart.id)) {
    // If this studio's part is already on the table, check if another part is still missing.
    // The studio resident prepares the material and coordinates with the missing part's studio
    // so every completed game visibly advances the central Mechanical Bird!
    const missing = blueprint.parts.find(p => !current.installedParts.includes(p.id));
    if (missing) {
      unlockedPart = missing;
      assisted = true;
    }
  }

  const wasAlreadyInstalled = current.installedParts.includes(unlockedPart.id);
  const nextInstalled = wasAlreadyInstalled
    ? [...current.installedParts]
    : [...current.installedParts, unlockedPart.id];

  const nextCounts = {...current.partContributionCount};
  nextCounts[directPart.id] = (nextCounts[directPart.id] || 0) + 1;

  const justCompletedBird = current.installedParts.length < blueprint.parts.length && nextInstalled.length === blueprint.parts.length;
  let nextCollections = [...current.collections];
  let completedEntry = null;

  if (justCompletedBird) {
    completedEntry = {
      id: `${blueprint.id}-${nextCollections.length + 1}-${Date.now()}`,
      blueprintId: blueprint.id,
      name: blueprint.name,
      subtitle: blueprint.subtitle,
      edition: nextCollections.length + 1,
      completedAt: timestamp,
      lastGameId: gameId,
      lastScore: Number(score) || 0
    };
    nextCollections.push(completedEntry);
  }

  const event = {
    token,
    gameId,
    gameName: game.name,
    studioIndex: directPart.studioIndex,
    partId: unlockedPart.id,
    partName: unlockedPart.name,
    shortPartName: unlockedPart.shortName,
    assisted,
    progressCount: nextInstalled.length,
    totalParts: blueprint.parts.length,
    birdCompleted: justCompletedBird, // compatibility with the v1 delivery adapter
    workCompleted: justCompletedBird,
    blueprintId: blueprint.id,
    workName: blueprint.name,
    collectionEntry: completedEntry,
    timestamp
  };

  const nextState = {
    ...current,
    installedParts: nextInstalled,
    partContributionCount: nextCounts,
    processedTokens: [...current.processedTokens, token].slice(-60),
    collections: nextCollections,
    lastEvent: event
  };

  return {
    state: nextState,
    applied: true,
    event
  };
}

// Start a new crafting cycle on the central table while preserving all collected works and game scores.
export function startNextWork(state, blueprintId=null, random=Math.random) {
  const current=normalizeCraftingState(state);
  let bag=[...current.blueprintBag];
  let next;
  if(blueprintId&&BLUEPRINTS.some(b=>b.id===blueprintId)){
    next=blueprintId;bag=shuffled(BLUEPRINTS.map(b=>b.id).filter(id=>id!==next),random);
  }else{
    if(!bag.length){bag=shuffled(BLUEPRINTS.map(b=>b.id),random);if(bag[0]===current.activeBlueprintId)[bag[0],bag[1]]=[bag[1],bag[0]];}
    next=bag.shift();
  }
  return {...current,activeBlueprintId:next,blueprintBag:bag,installedParts:[],lastEvent:null};
}

// Testing shortcut: finish the active four-studio build without inventing game results.
// Repeated use is idempotent and preserves existing collections and contribution counts.
export function completeAllForTesting(state) {
  const current=normalizeCraftingState(state),bp=getActiveBlueprint(current);
  return {...current,installedParts:bp.parts.map(p=>p.id),lastEvent:null};
}

// Clear collection history only; the active build, contributions and game records survive.
export function clearCollections(state) {
  const current=normalizeCraftingState(state);
  return {...current,collections:[],lastEvent:current.lastEvent?{...current.lastEvent,collectionEntry:null}:null};
}

// Workshop residents: distinct names, roles, studio duties, cargo, greeting responses,
// and contextual awareness of the central Mechanical Bird crafting progress.

export const JOBS = [
  {
    name: '小時',
    role: '空間配置師',
    studioIndex: 0,
    from: '空間認知工作室',
    to: '中央製作臺',
    cargo: '發條核心與方位齒輪',
    color: '#c95b42',
    hatColor: '#be4d36',
    apronColor: '#8d5b3e'
  },
  {
    name: '阿鏡',
    role: '細節觀察員',
    studioIndex: 1,
    from: '視覺注意力工作室',
    to: '中央製作臺',
    cargo: '成對黃銅羽片',
    color: '#c99738',
    hatColor: '#8a6642',
    apronColor: '#5c6b73'
  },
  {
    name: '芽芽',
    role: '圖譜整理員',
    studioIndex: 2,
    from: '工作記憶工作室',
    to: '中央製作臺',
    cargo: '記憶音筒與組裝圖卡',
    color: '#5f8755',
    hatColor: '#4c7043',
    apronColor: '#4f6d46'
  },
  {
    name: '方方',
    role: '規則判讀師',
    studioIndex: 3,
    from: '語意判斷工作室',
    to: '中央製作臺',
    cargo: '幾何彩木與尾羽飾件',
    color: '#88669c',
    hatColor: '#75538a',
    apronColor: '#694d7a'
  },
  {
    name: '小郵',
    role: '升降臺領航員',
    studioIndex: 0,
    from: '二樓連通廊',
    to: '中央升降臺',
    cargo: '黃銅連桿零件箱',
    color: '#6b8ba4',
    hatColor: '#58768e',
    apronColor: '#8b6848'
  },
  {
    name: '朵朵',
    role: '機芯組裝師',
    studioIndex: 2,
    from: '中央製作臺',
    to: '茶歇角落',
    cargo: '微調扳手與發條鑰匙',
    color: '#4e6f82',
    hatColor: '#8b5e3c',
    apronColor: '#435d6d'
  },
  {
    name: '點點',
    role: '精密鉚接師',
    studioIndex: 1,
    from: '中央製作臺',
    to: '零件收納架',
    cargo: '精巧黃銅鉚釘與木槌',
    color: '#739582',
    hatColor: '#628370',
    apronColor: '#4a6478'
  },
  {
    name: '圓圓',
    role: '材料與工坊筆記管理員',
    studioIndex: 3,
    from: '前廊材料車',
    to: '中央製作臺',
    cargo: '備用齒輪與保養木蠟',
    color: '#57738c',
    hatColor: '#4a647a',
    apronColor: '#7a5c3e'
  }
];

export function createResident(index) {
  return {
    ...JOBS[index],
    index,
    state: 'loading',
    elapsed: -index * 0.35,
    progress: 0,
    completed: 0,
    greeting: 0,
    cooldown: 0,
    friendship: 0,
    talkCount: 0,
    reverse: index % 2 === 1
  };
}

export function stepResident(r, dt) {
  dt = Math.max(0, Math.min(dt, 0.25));
  r.cooldown = Math.max(0, r.cooldown - dt);
  if (r.greeting > 0) {
    r.greeting = Math.max(0, r.greeting - dt);
    return null;
  }
  if (r.activity) return null;
  r.elapsed += dt;
  let event = null;
  if (r.state === 'loading' && r.elapsed >= 2) {
    r.state = 'walking';
    r.elapsed = 0;
    event = 'depart';
  } else if (r.state === 'walking') {
    r.progress = Math.min(1, r.progress + dt / 18);
    if (r.progress === 1) {
      r.state = 'delivering';
      r.elapsed = 0;
      event = 'arrive';
    }
  } else if (r.state === 'delivering' && r.elapsed >= 2.5) {
    r.completed++;
    r.state = 'returning';
    r.elapsed = 0;
    event = 'handoff';
  } else if (r.state === 'returning') {
    r.progress = Math.max(0, r.progress - dt / 16);
    if (r.progress === 0) {
      r.state = 'resting';
      r.elapsed = 0;
      event = 'home';
    }
  } else if (r.state === 'resting' && r.elapsed >= 3) {
    r.state = 'loading';
    r.elapsed = 0;
    event = 'prepare';
  }
  return event;
}

export function greetResident(r) {
  if (r.greeting > 0) return false;
  r.greeting = 2.2;
  r.cooldown = 16;
  return true;
}

export function residentStatus(r) {
  if (r.activity) return r.activity;
  if (r.greeting > 0) return '向你揮手打招呼';
  return {
    inspecting:'檢查備料座上的物品',
    observing:'觀察工作室裡的展品與紀錄',
    collecting:'從備料座拿起組件盒',
    retrieving:'取回已交件的空盒',
    stowing:'將空盒放回工作室備料座',
    loading: '在工作室準備' + r.cargo,
    walking: '正把' + r.cargo + '送往' + r.to,
    delivering: '在中央製作臺組裝'+(r.workName||'本次作品'),
    returning: '完成交接，返回' + r.from,
    waiting: '在門前禮讓夥伴通行',
    'open-in': '正在推開工坊木門',
    enter: '通過拱門走道',
    'close-in': '通過後輕輕帶上門',
    'stair-down': '沿著弧形木梯下樓配送',
    'stair-up': '沿著弧形木梯返回二樓工作室',
    'lift-wait': '在中央升降臺前等待轎廂抵達',
    'lift-enter': '走進中央齒輪升降臺',
    'lift-move': '搭乘中央升降臺移動中',
    'lift-exit': '抵達樓層，走出升降臺',
    resting: '在休息角落喝茶歇息、看看窗外'
  }[r.state] || '在工坊裡忙碌中';
}

const PERSONALITIES = [
  [
    '牆上的大鐘與多面體木模都對準角度了，作品的核心一定很穩！',
    '空間認知工作室的發條剛剛上緊，聽見清脆的滴答聲了嗎？'
  ],
  [
    '我用放大鏡檢查過兩座玻璃罩裡的標本，左右羽毛一片都沒差！',
    '窗臺上的小青今天也來看我比對零件細節呢。'
  ],
  [
    '大樹下的檔案抽屜都按順序標好號碼了，圖卡一張也不會漏掉！',
    '記住順序再動手，組件就能順利接合。'
  ],
  [
    '紅圓球、黃方塊、藍三角……規則切換再快，我也分得清清楚楚！',
    '分類臺上的彩木剛挑好，準備拿去拼作品的最後一組零件囉。'
  ],
  [
    '中央齒輪升降臺運作超順暢，上下樓送零件交給我準沒錯！',
    '站在透明升降臺裡往下看，整個圓桌作品一覽無遺呢。'
  ],
  [
    '把大家的零件一塊塊鎖上作品，是最有成就感的時刻！',
    '咖啡準備好了，坐下來聊聊這次的作品吧。'
  ],
  [
    '轉動手柄，唱片就會隨著發條慢慢旋轉。',
    '看著作品在圓桌上慢慢成形，整個工坊都熱鬧起來了。'
  ],
  [
    '工坊筆記記下了每次製作的心得，喝咖啡時也能翻一翻。',
    '栗子窩在旁邊的材料箱睡得好香，我推車經過都特別放輕腳步。'
  ]
];

export function talkResident(r, action = 'hello', hour = 12, craftingProgress = 0) {
  r.talkCount = (r.talkCount || 0) + 1;
  r.friendship = Math.min(5, (r.friendship || 0) + (action === 'encourage' ? 1 : 0));
  r.greeting = 4.5;
  r.cooldown = 18;

  let text, mood, emote;
  if (action === 'task') {
    const progressHint = craftingProgress >= 4
      ? `${r.workName||'作品'}已經完成囉！`
      : `目前${r.workName||'作品'}已完成 ${craftingProgress}/4 個部位。`;
    text = `${residentStatus(r)}。${progressHint}`+(r.index<4?`今天已完成 ${r.completed} 趟組件配送。`:r.index===4?'我負責查看升降臺的運作狀況。':'休息、整理筆記，也是工坊生活的一部分。');
    mood = '專注製作';
    emote = '⚙';
  } else if (action === 'encourage') {
    text = r.friendship > 1
      ? '又收到你的打氣了！我們跟四個工作室的夥伴一定能做出最棒的作品！'
      : '謝謝你的鼓勵！工坊裡瞬間充滿幹勁了！';
    mood = '充滿幹勁';
    emote = '♥';
  } else {
    const lines = PERSONALITIES[r.index] || PERSONALITIES[0];
    const prefix = r.talkCount % 3 === 1
      ? (craftingProgress >= 4
          ? `太棒了，${r.workName||'作品'}完成了！`
          : craftingProgress > 0
            ? `作品進度來到 ${craftingProgress}/4 囉！`
            : '歡迎來到腦內工坊！') + ' '
      : '';
    const line=r.index<4&&r.workName?`我正在準備「${r.cargo}」，一起完成${r.workName}吧！`:lines[(r.talkCount-1)%lines.length];
    text = prefix + line;
    mood = '開心回應';
    emote = '☺';
  }
  r.mood = mood;
  r.lastSpeech = text;
  return {text, mood, emote};
}

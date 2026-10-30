// Autonomous ambient chatter scheduler for Brain Workshop v1.0.
// Triggers every 9–15 seconds for visible residents, lasts ~3 seconds with an [×] close button,
// avoids consecutive repeat speakers, and adapts to work state, mood, and crafting progress.

const STUDIO_LINES = [
  ['鐘面指針與多面體都對齊了，角度剛剛好！', '聽著齒輪規律轉動，心情也跟著沉澱下來。'],
  ['用放大鏡再看一次，左右兩個零件完全對稱！', '窗邊的光線真柔和，連細小的刻痕都看得一清二楚。'],
  ['把圖卡按順序排好，下一步就不會搞混囉。', '大樹下的木抽屜裡，收著每一件作品的記憶。'],
  ['紅色圓球放左邊、黃色方塊放右邊，分揀完成！', '換個規則再檢查一次，彩色木塊全都就定位了。'],
  ['搭乘中央升降臺上下樓，視野真好！', '升降臺的黃銅齒輪剛上過油，動起來好順暢。'],
  ['把零件鎖緊一點，作品就能準備展示了！', '聞到休息角落的茶香了，組完這件去喝一杯吧。'],
  ['每一枚黃銅鉚釘都要敲得平平整整。', '看到大家送來的材料越聚越多，真讓人期待！'],
  ['木推車裡的齒輪都清點過了，隨時可以補給！', '嘘——栗子還在木箱裡睡午覺呢。']
];

export function ambientLine(r, hour = 12, variant = 0, craftingProgress = 0, workName='作品') {
  const n = Math.abs(variant) % 4;
  let text;
  if(r.activity){text=r.activity+'，真是舒服的工坊時光。';}
  else if (n === 0 && craftingProgress >= 4) {
    text = `看呀！我們一起完成的${workName}真漂亮！`;
  } else if (n === 0 && craftingProgress > 0) {
    text = `中央製作臺的${workName}已經完成 ${craftingProgress}/4 囉！`;
  } else if (n === 1 && r.state === 'delivering') {
    text = `正在把零件裝上中央圓桌的${workName}！`;
  } else if (n === 1 && (r.state === 'stair-down' || r.state === 'stair-up')) {
    text = '踩穩木梯階梯，小心捧好手上的零件。';
  } else if (n === 1 && r.state?.startsWith('lift')) {
    text = '中央齒輪升降臺啟動囉，抓穩扶手！';
  } else if (n === 1 && r.state === 'resting') {
    text = '在休息角落喘口氣，看看工坊裡的大家。';
  } else {
    const lines = STUDIO_LINES[r.index] || STUDIO_LINES[0];
    text = lines[n % lines.length];
  }
  return {
    text,
    mood: r.state === 'delivering' ? '協力組裝' : r.state === 'resting' ? '輕鬆愜意' : '專注工作',
    emote: n % 2 ? '⚙' : '☺'
  };
}

export class AmbientChatter {
  constructor(random = Math.random, now = 0) {
    this.random = random;
    this.nextDue = now + 4500 + random() * 2000;
    this.lastSpeaker = null;
    this.spoken = new Map();
  }

  defer(now, duration = 4000) {
    this.nextDue = Math.max(this.nextDue, now + duration);
  }

  ready(now) {
    return now >= this.nextDue;
  }

  canSpeak(index, now) {
    return now - (this.spoken.get(index) ?? -Infinity) >= 28000;
  }

  record(index, now) {
    this.lastSpeaker = index;
    this.spoken.set(index, now);
    // Strict 9–15 seconds interval between spontaneous chatter bubbles
    this.nextDue = now + 9000 + this.random() * 6000;
  }

  update(now, candidates, {blocked = false, hour = 12, craftingProgress = 0,workName='作品'} = {}) {
    if (blocked) {
      this.defer(now, 2200);
      return null;
    }
    if (!this.ready(now)) return null;
    const eligible = candidates.filter(
      r => !r.indoors && !r.session && !r.manual && !r.greeting && r.visible !== false && this.canSpeak(r.index, now)
    );
    if (!eligible.length) {
      this.nextDue = now + 700;
      return null;
    }
    const alternate = eligible.filter(r => r.index !== this.lastSpeaker);
    const pool = alternate.length ? alternate : eligible;
    const r = pool[Math.min(pool.length - 1, Math.floor(this.random() * pool.length))];
    const response = ambientLine(r, hour, Math.floor(this.random() * 4), craftingProgress,workName);
    this.record(r.index, now);
    return {index: r.index, ...response};
  }
}

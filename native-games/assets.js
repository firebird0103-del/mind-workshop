/* 心智大作戰：100 個可辨識的多彩生活物件。每件物件使用經檢查的圖集視窗。 */
(function () {
  'use strict';
  const root = window.BrainChallengeAssets = {};
  const labels = [
    ['小鳥','籃球','電視','香蕉','腳踏車','雨傘','蘋果','椅子','公車','剪刀','馬克杯','檯燈','蝴蝶','葉子','太陽','魚','相機','書本','鑰匙','球鞋'],
    ['汽車','飛機','火車','帆船','直升機','貨車','滑板車','紅綠燈','橋','房屋','大樓','帳篷','燈塔','火箭','氣球','背包','帽子','眼鏡','手錶','電話'],
    ['西瓜','葡萄','草莓','鳳梨','梨子','橘子','櫻桃','胡蘿蔔','玉米','花椰菜','蘑菇','荷包蛋','麵包','起司','甜甜圈','冰淇淋','蛋糕','漢堡','披薩','白飯'],
    ['貓','狗','兔子','烏龜','大象','企鵝','蜜蜂','瓢蟲','蝸牛','螃蟹','章魚','海豚','鯨魚','青蛙','樹','花朵','仙人掌','彩虹','雲朵','雪人'],
    ['足球','網球拍','吉他','鼓','鉛筆','畫筆','尺','水壺','湯匙','叉子','牙刷','梳子','吹風機','襪子','手套','澆水壺','磁鐵','禮物盒','手電筒','電風扇']
  ];
  const categories = ['生活用品','交通與戶外','食物','動物與自然','運動與日用品'];
  // Artwork separators are not exactly uniform. Explicit viewports prevent clipped edges.
  const atlasMaps = [{"width":1402,"height":1122,"rects":[[0,0,303,296],[303,0,255,296],[558,0,273,296],[831,0,262,296],[1093,0,309,296],[0,296,294,272],[294,296,264,272],[558,296,255,272],[813,296,304,272],[1117,296,285,272],[0,568,297,266],[297,568,249,266],[546,568,311,266],[857,568,236,266],[1093,568,309,266],[0,834,286,288],[286,834,266,288],[552,834,295,288],[847,834,249,288],[1096,834,306,288]]},{"width":1402,"height":1122,"rects":[[0,0,289,297],[289,0,290,297],[579,0,273,297],[852,0,264,297],[1116,0,286,297],[0,297,303,259],[303,297,294,259],[597,297,202,259],[799,297,320,259],[1119,297,283,259],[0,556,256,285],[256,556,336,285],[592,556,244,285],[836,556,286,285],[1122,556,280,285],[0,841,272,281],[272,841,286,281],[558,841,310,281],[868,841,214,281],[1082,841,320,281]]},{"width":1402,"height":1122,"rects":[[0,0,302,297],[302,0,268,297],[570,0,275,297],[845,0,270,297],[1115,0,287,297],[0,297,279,271],[279,297,296,271],[575,297,277,271],[852,297,247,271],[1099,297,303,271],[0,568,281,242],[281,568,276,242],[557,568,288,242],[845,568,270,242],[1115,568,287,242],[0,810,267,312],[267,810,286,312],[553,810,284,312],[837,810,279,312],[1116,810,286,312]]},{"width":1402,"height":1122,"rects":[[0,0,290,318],[290,0,294,318],[584,0,229,318],[813,0,281,318],[1094,0,308,318],[0,318,281,256],[281,318,279,256],[560,318,259,256],[819,318,277,256],[1096,318,306,256],[0,574,296,261],[296,574,273,261],[569,574,293,261],[862,574,242,261],[1104,574,298,261],[0,835,284,287],[284,835,252,287],[536,835,309,287],[845,835,273,287],[1118,835,284,287]]},{"width":1402,"height":1122,"rects":[[0,0,281,306],[281,0,278,306],[559,0,290,306],[849,0,283,306],[1132,0,270,306],[0,306,284,257],[284,306,283,257],[567,306,297,257],[864,306,266,257],[1130,306,272,257],[0,563,288,253],[288,563,280,253],[568,563,275,253],[843,563,273,253],[1116,563,286,253],[0,816,301,306],[301,816,257,306],[558,816,282,306],[840,816,291,306],[1131,816,271,306]]}];
  const objects = Object.freeze(labels.flatMap((row, sheet) => row.map((label, index) => {
    const src = new URL('../legacy/assets/objects-' + (sheet + 1) + '.png', import.meta.url).href;
    const atlas = atlasMaps[sheet], rect = atlas.rects[index];
    const scale = 96 / Math.max(rect[2], rect[3]);
    const w = rect[2] * scale, h = rect[3] * scale;
    return Object.freeze({
      id: 'object-' + (sheet + 1) + '-' + String(index + 1).padStart(2, '0'),
      label, category: categories[sheet], src, sheet, index, rect,
      markup: '<svg class="visual-symbol object-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><svg x="'+((100-w)/2)+'" y="'+((100-h)/2)+'" width="'+w+'" height="'+h+'" viewBox="'+rect.join(' ')+'" overflow="hidden"><image href="'+src+'" width="'+atlas.width+'" height="'+atlas.height+'"/></svg></svg>'
    });
  })));
  const colors = [
    {id:'red',label:'紅色',value:'#e45757'}, {id:'blue',label:'藍色',value:'#3f8edb'},
    {id:'yellow',label:'黃色',value:'#f2b94b'}, {id:'green',label:'綠色',value:'#45b992'},
    {id:'purple',label:'紫色',value:'#8b6fd8'}, {id:'orange',label:'橘色',value:'#ef8c43'}
  ];
  const shapes = ['circle','square','triangle','diamond'].map((id,i) => ({id,label:['圓形','方形','三角形','菱形'][i],className:id}));
  const pools = {
    attention: {id:'attention',version:3,sourceType:'illustration-atlas',iconPool:objects,fallback:objects[0]},
    memory: {id:'memory',version:3,sourceType:'illustration-atlas',itemPool:objects,fallback:objects[0]},
    executive: {id:'executive',version:1,sourceType:'shape-color',colors,shapes,fallback:{color:colors[0],shape:shapes[0]}}
  };
  const loads = new Map();
  function shuffled(items) {
    const copy = [...items];
    for (let i=copy.length-1; i>0; i--) { const j=Math.floor(Math.random()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]]; }
    return copy;
  }
  function loadImage(src) {
    if (!loads.has(src)) loads.set(src, new Promise((resolve,reject) => {
      const img = new Image();
      let settled = false;
      const timer = setTimeout(() => fail(), 15000);
      function fail() { if(settled)return; settled=true; clearTimeout(timer); loads.delete(src); reject(new Error('無法載入素材：' + src)); }
      img.onload = () => { if(settled)return; settled=true; clearTimeout(timer); resolve(src); };
      img.onerror = fail;
      img.src = src;
    }));
    return loads.get(src);
  }
  Object.assign(root, pools);
  root.version = '3.1.0';
  root.api = {
    get(id) { return pools[id] || null; },
    getPool(id,key) { const pool=pools[id]; return pool ? (pool[key || (pool.iconPool ? 'iconPool' : 'itemPool')] || []) : []; },
    pick(id,count,key) { const pool=shuffled(this.getPool(id,key)); return typeof count==='number' ? pool.slice(0,Math.max(0,count)) : pool; },
    resolve(id,value) { return value || pools[id]?.fallback; },
    // Least-used first across rounds, randomized within each usage tier.
    // Every draw is unique; unused items are exhausted before repetitions.
    createDeck(id,key) {
      const pool=this.getPool(id,key), uses=new Map();
      return {
        draw(count,excluded=[]) {
          const omit=new Set(excluded.map(item => typeof item==='string' ? item : item.id));
          const eligible=shuffled(pool.filter(item=>!omit.has(item.id)));
          if (!Number.isInteger(count) || count<0 || count>eligible.length) throw new Error('素材數量不足，請降低題目格數或選項數。');
          eligible.sort((a,b)=>(uses.get(a.id)||0)-(uses.get(b.id)||0));
          const result=eligible.slice(0,count);
          result.forEach(item=>uses.set(item.id,(uses.get(item.id)||0)+1));
          return result;
        }
      };
    },
    async preload(ids=Object.keys(pools)) {
      const sources=new Set(ids.flatMap(id=>this.getPool(id).map(item=>item.src).filter(Boolean)));
      await Promise.all([...sources].map(loadImage));
      return ids.map(id=>({id,ready:!!pools[id]}));
    }
  };
})();

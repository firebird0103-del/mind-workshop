// Presentation settings only. No game rules, timing or score settings.
export const layoutFields = [
 ['benchWidth','工作台寬度（%）',72,98,1,88,'共用'],['benchMax','工作台最大寬度',1000,1800,10,1440,'共用'],['benchHeight','工作台高度（%）',80,98,1,95,'共用'],
 ['rail','題目側欄寬度',220,360,5,280,'共用'],['layoutGap','題目與遊戲間距',10,40,2,20,'共用'],['fontSize','內文字級',14,22,1,16,'共用'],
 ['clockMax','鐘面最大直徑',360,800,10,680,'空間認知'],
 ['attentionCell','棋盤每格上限',80,140,2,116,'視覺注意力'],['attentionArt','物件圖示上限',60,120,2,94,'視覺注意力'],
 ['memoryDisplay','記憶展示圖上限',200,400,10,300,'工作記憶'],['memoryOption','回答選項上限',80,140,2,112,'工作記憶'],['memoryGap','回答區群組間距',8,32,2,16,'工作記憶'],
 ['choiceCard','選項卡片上限',150,260,1,224,'語意判斷'],['shapeMax','判斷圖形上限',70,150,2,112,'語意判斷'],
 ['ruleGap','規則框與選項間距',10,60,2,20,'語意判斷'],['tipWidth','玩法框最大寬度',200,380,10,300,'語意判斷']
];
export function normalizeLayout(input={}) {
 const result={};for(const [key,,min,max,step,value] of layoutFields){const n=input?.[key];result[key]=typeof n==='number'&&Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n/step)*step)):value;}result.positions=normalizePositions(input?.positions);return result;
}
export function applyLayoutSettings(dialog,page,input) {
 const s=normalizeLayout(input);
 dialog.style.width=`min(${s.benchWidth}vw, ${s.benchMax}px)`;
 dialog.style.maxWidth=s.benchMax+'px';
 dialog.style.height=`${s.benchHeight}dvh`;
 page.style.setProperty('--rail',s.rail+'px');page.style.setProperty('--game-gap',s.layoutGap+'px');page.style.fontSize=s.fontSize+'px';page.style.setProperty('--ui-font',s.fontSize+'px');
 page.style.setProperty('--attention-art-max',s.attentionArt+'px');page.style.setProperty('--memory-group-gap',s.memoryGap+'px');
 page.style.setProperty('--rule-gap',s.ruleGap+'px');page.style.setProperty('--tip-width',s.tipWidth+'px');
 return s;
}

// Each position is a pixel offset from the responsive layout, constrained to its area.
export const positionTargets = [
 ['timeHud','time','進度與分數','.game-hud','.game-card'],
 ['timeTask','time','題目框','.instruction','.game-card'],
 ['timeTip','time','小提示','.tips','.game-card'],
 ['timeActions','time','操作按鈕','.btn-group','.game-card'],
 ['timeClock','time','鐘面與拖曳區','.clock-stage','.play-area'],
 ['timeResult','time','答題回饋','#result-board','.game-card'],
 ['spotHud','spot','進度與分數','.game-hud','.game-card'],
 ['spotTask','spot','題目說明','.instruction','.game-card'],
 ['spotBoards','spot','兩張比較圖','#game-container','#find-stage'],
 ['spotHint','spot','底部提醒','.round-hint','.round-footer'],
 ['spotResult','spot','本題完成框','#result-board','.round-footer'],
 ['spotNext','spot','下一題／查看結果','#btn-next','.round-footer'],
 ['memoryHud','memory','進度與分數','.game-hud','.game-card'],
 ['memoryTask','memory','題目框','.instruction','.game-card'],
 ['memoryTip','memory','小提示','.tips','.game-card'],
 ['memoryActions','memory','操作按鈕','.memory-actions','.game-card'],
 ['memoryImage','memory','展示圖與倒數','#display-area,#memory-countdown','.memory-stage','showing'],
 ['memoryLabel','memory','展示序號','#sequence-label','.memory-stage','showing'],
 ['memoryAnswer','memory','作答區整組','#sequence-label,#answer-area,#options-area','.memory-stage','answering'],
 ['switchHud','switch','進度與分數','.executive-hud','.game-card'],
 ['switchTask','switch','照規則作答框','.instruction','.play'],
 ['switchTip','switch','玩法框','.tip','.game-card'],
 ['switchChoices','switch','四個選項','#choices','.play'],
 ['switchStart','switch','開始按鈕','.action-row','.play']
];
export function defaultPositions(){return Object.fromEntries(positionTargets.map(([key])=>[key,{x:0,y:key==='memoryImage'?-50:key==='memoryAnswer'?-40:0}]))}
export function normalizePositions(input){
 const defaults=defaultPositions();
 for(const [key] of positionTargets)for(const axis of ['x','y']){const n=input?.[key]?.[axis];if(typeof n==='number'&&Number.isFinite(n))defaults[key][axis]=Math.max(-240,Math.min(240,Math.round(n)));}
 return defaults;
}
export function constrainOffset(box,bounds,offset){
 const clamp=(n,low,high)=>low>high?0:Math.max(low,Math.min(high,n));
 return {x:clamp(offset.x,bounds.left-box.left,bounds.right-box.right),y:clamp(offset.y,bounds.top-box.top,bounds.bottom-box.bottom)};
}
export function resetFramePositions(root){root.querySelectorAll('[data-layout-key]').forEach(el=>{el.style.translate='';el.removeAttribute('data-layout-key');});}
export function applyFramePositions(root,game,settings){
 const phase=root.querySelector('.game-root').dataset.phase,positions=normalizePositions(settings.positions);
 if(phase==='finished')return;
 for(const [key,id,,selector,container,onlyPhase] of positionTargets){
  if(id!==game||onlyPhase&&onlyPhase!==phase)continue;
  const nodes=[...root.querySelectorAll(selector)].filter(el=>!el.hidden&&getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>0);
  const parent=root.querySelector(container);if(!parent||!nodes.length)continue;
  const rects=nodes.map(el=>el.getBoundingClientRect());
  const box={left:Math.min(...rects.map(r=>r.left)),right:Math.max(...rects.map(r=>r.right)),top:Math.min(...rects.map(r=>r.top)),bottom:Math.max(...rects.map(r=>r.bottom))};
  const r=parent.getBoundingClientRect(),bounds={left:r.left+6,right:r.right-6,top:r.top+6,bottom:r.bottom-6};
  if(key==='memoryImage'){const label=root.querySelector('#sequence-label');if(label&&getComputedStyle(label).display!=='none')bounds.top=Math.max(bounds.top,label.getBoundingClientRect().bottom+10);}
  // Keep the boards above the permanently reserved result/action row.
  if(key==='spotBoards')bounds.bottom=Math.min(bounds.bottom,root.querySelector('.round-footer').getBoundingClientRect().top-8);
  const offset=constrainOffset(box,bounds,positions[key]);
  for(const el of nodes){el.style.translate=`${offset.x}px ${offset.y}px`;el.dataset.layoutKey=key;}
 }
}

export const defaultLayout = Object.freeze({...Object.fromEntries(layoutFields.map(([key,,,,,value])=>[key,value])),positions:defaultPositions()});

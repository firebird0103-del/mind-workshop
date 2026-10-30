// Migrated from Fix4. Scoring, questions and timings are preserved.
export const template = "<div class=\"game-root \" data-game-id=\"executive\" data-phase=\"ready\"><main class=\"game-card\"><section class=\"info\"><div class=\"eyebrow\">CHALLENGE 04</div><div class=\"title-row\"><h1>語意判斷</h1><span class=\"tag\">規則切換・抑制反應</span></div><div class=\"status-row\"><div class=\"pill\" id=\"status\">進度 <strong>0 / 10</strong></div><div class=\"pill\">本關分數 <strong id=\"score\">0</strong></div><div class=\"pill\">規則 <strong id=\"rule-pill\">準備中</strong></div></div><div class=\"progress\"><span id=\"progress\"></span></div><div class=\"instruction\" id=\"instruction\">準備好挑戰你的規則切換能力了嗎？<br><span class=\"rule\">看規則，再做判斷</span></div><div class=\"tip\"><strong>玩法：</strong>依照上方規則，點選符合條件的圖形。下一題可能會換規則，別被上一題的判斷方式帶走。</div></section>\n<section class=\"play\"><div class=\"choices\" id=\"choices\"></div><div class=\"game-feedback\" id=\"game-feedback\" role=\"status\" aria-live=\"polite\"></div><div class=\"action-row\"><button class=\"action primary\" id=\"start\" data-action=\"startGame\">開始挑戰</button></div></section></main></div>";
export const stylesheet = new URL('./switch.css', import.meta.url).href;
export function mount(runtime) {
const {document, window, BrainChallenge, BrainChallengeAssets, BrainChallengeConfigAPI,
  BrainChallengeLayout, BrainInterference, Date, performance, setTimeout, clearTimeout} = runtime;

'use strict';
const CONFIG=BrainChallengeConfigAPI.getForModule('executive');
const ASSETS=window.BrainChallengeAssets?.api;
const COLOR_OPTIONS=(ASSETS?.get('executive')?.colors)||[];
const SHAPE_OPTIONS=(ASSETS?.get('executive')?.shapes)||[];
const totalRounds=Math.max(1,Number(CONFIG.rounds)||10);
const optionsPerRound=Math.max(3,Number(CONFIG.optionsPerRound)||4);
const switchEvery=Math.max(1,Number(CONFIG.switchEvery)||1);
const startingRule=CONFIG.startingRule==='shape'?'shape':'color';
const el={status:document.getElementById('status'),score:document.getElementById('score'),rule:document.getElementById('rule-pill'),progress:document.getElementById('progress'),instruction:document.getElementById('instruction'),choices:document.getElementById('choices'),feedback:document.getElementById('game-feedback'),start:document.getElementById('start'),countdown:document.getElementById('countdown'),countdownText:document.getElementById('countdown-text')};
el.status.innerHTML=`進度 <strong>0 / ${totalRounds}</strong>`;
let round=0,totalScore=0,roundStart=0,totalTime=0,currentRule=startingRule,currentTarget=null,locked=false;

function ruleForRound(index){return ((Math.floor(index/switchEvery)%2===0)?startingRule:(startingRule==='color'?'shape':'color'));}
function shuffle(list){const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function buildChoices(rule){
 const colors=shuffle(COLOR_OPTIONS); const shapes=shuffle(SHAPE_OPTIONS);
 const target=rule==='color'?colors[0]:shapes[0]; const combos=[];
 const pickedColors=shuffle(COLOR_OPTIONS).slice(0,Math.max(optionsPerRound,4));
 const pickedShapes=shuffle(SHAPE_OPTIONS).slice(0,Math.max(optionsPerRound,4));
 // Ensure exactly one option matches the target rule.
 for(let i=0;i<optionsPerRound;i++){
   let color=pickedColors[i%pickedColors.length], shape=pickedShapes[i%pickedShapes.length];
   if(i===0){ if(rule==='color') color=target; else shape=target; }
   if(rule==='color' && color===target && i!==0){color=pickedColors.find(c=>c!==target)||color;}
   if(rule==='shape' && shape===target && i!==0){shape=pickedShapes.find(s=>s!==target)||shape;}
   combos.push({color,shape,correct:i===0});
 }
 // Keep the selected target intact; never mutate shapes after correctness is assigned.
 return shuffle(combos);

}
function drawChoice(item,index){const button=document.createElement('button');button.className='choice';button.type='button';button.setAttribute('aria-label',`${index+1}號選項`);button.innerHTML=`<span class="symbol"><span class="shape ${item.shape.className}" style="background:${item.color.value}"></span></span>`;button.addEventListener('click',()=>answer(item,button));return button;}
function labelForRule(rule,target,choices){const color=BrainInterference.choose(choices);return `請找出「<span style="color:${BrainInterference.ink(color)}">${target.label}</span>」`}
function startGame(){
 runtime.markStarted();
 BrainChallenge.audio?.unlock?.(); BrainChallenge.gameShell.hideFeedback();
 round=0;totalScore=0;totalTime=0;el.score.textContent='0';el.start.style.display='none';beginRound();
}
function beginRound(){locked=false;roundStart=performance.now();round++;currentRule=ruleForRound(round-1);currentTarget=currentRule==='color'?COLOR_OPTIONS[0]:SHAPE_OPTIONS[0];const choices=buildChoices(currentRule);currentTarget=choices.find(x=>x.correct)[currentRule==='color'?'color':'shape'];el.status.innerHTML=`進度 <strong>${round} / ${totalRounds}</strong>`;el.rule.textContent=currentRule==='color'?'顏色':'形狀';el.progress.style.width=`${((round-1)/totalRounds)*100}%`;el.instruction.innerHTML=`現在請依照規則作答：<br><span class="rule">${labelForRule(currentRule,currentTarget,choices)}</span>`;BrainChallenge.gameShell.hideFeedback();el.choices.innerHTML='';choices.forEach((c,i)=>el.choices.appendChild(drawChoice(c,i)));}
function answer(item,button){if(locked)return;locked=true;const elapsed=performance.now()-roundStart;totalTime+=elapsed;const correct=item.correct;let earned=correct?Number(CONFIG.scoring?.correct||100):Number(CONFIG.scoring?.wrong||0);if(!correct)earned=Math.max(0,earned);totalScore+=earned;el.score.textContent=totalScore;document.querySelectorAll('.choice').forEach(b=>b.disabled=true);button.classList.add(correct?'good':'bad');BrainChallenge.gameShell.feedback({title:correct?'判斷正確':'再看一次規則',message:correct?'規則切換成功。':'這一題抓錯規則了。',type:correct?'correct':'wrong',duration:450});el.progress.style.width=`${(round/totalRounds)*100}%`;if(round<totalRounds){beginRound();}else{finishGame();}}
function finishGame(){const seconds=Math.max(1,Math.floor(totalTime/1000));const avgScore=Math.round(totalScore/totalRounds);el.choices.innerHTML='';el.status.innerHTML='挑戰完成';el.rule.textContent='完成';el.instruction.innerHTML=`<div class="finish"><div style="font-size:1.55rem;font-weight:1000">本關完成</div><div>你的執行功能・認知彈性挑戰結果</div><div class="score">${avgScore}</div><div class="meta">平均得分 ・ 作答時間 ${seconds} 秒</div><div class="actions"><button class="again" data-action="retry">再挑戰一次</button><button class="home" data-action="home">回到工坊</button></div></div>`;const record={gameName:'語意判斷',playerName:BrainChallenge.player.getName(),score:avgScore,totalSeconds:seconds,timeText:`${seconds}秒`,age:BrainChallenge.player.getAge(),timestamp:new Date().toLocaleString()};BrainChallenge.scores.save(record);BrainChallenge.audio?.play?.('complete');}

runtime.bindActions({startGame});

}

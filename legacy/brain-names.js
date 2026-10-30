/* 本機隨機暱稱：不連網、不含真實姓名，400 組依序洗牌。 */
(function(root){
  'use strict';
  const adjectives=['開心','好奇','靈巧','勇敢','自在','活力','晴天','微笑','閃亮','悠遊','飛躍','元氣','樂活','幸運','機智','輕快','晨光','星光','彩虹','清風'];
  const nouns=['海豚','小鳥','企鵝','松鼠','水獺','海星','小鹿','白鯨','熊貓','小兔','青蛙','蝴蝶','海龜','狐狸','山雀','小貓','花栗鼠','小象','蜜蜂','小熊'];
  const all=adjectives.flatMap(a=>nouns.map(b=>a+b));
  let bag=[];
  function next(current=''){
    if(!bag.length){
      bag=[...all];
      for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}
    }
    if(bag[bag.length-1]===current){
      if(bag.length===1){const only=bag.pop();const alternative=next(current);bag.unshift(only);return alternative}
      [bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];
    }
    return bag.pop();
  }
  root.BrainChallengeNames=Object.freeze({next,count:all.length});
})(window);

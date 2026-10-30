/* Additive adapter: the original score calculation, game rules and config stay intact.
   Supports both Brain Workshop (brainWorkshop*) and Brain Park (brainPark*) parameters. */
(function(){
 const q=new URLSearchParams(location.search);
 const id=q.get('brainWorkshopGame')||q.get('brainParkGame');
 const token=q.get('brainWorkshopToken')||q.get('brainParkToken');
 const isWorkshop=q.has('brainWorkshopGame')||q.has('brainWorkshopToken');
 const resultKey=isWorkshop?'brainWorkshop.v1.result':'brainPark.v1.result';
 const ageIdx=q.has('brainWorkshopAgeIndex')?q.get('brainWorkshopAgeIndex'):q.get('brainParkAgeIndex');
 const ids={time:'clock',spot:'attention',memory:'memory',switch:'executive'};
 if(!token||!ids[id]||!window.BrainChallenge)return;
 let home=new URL('../index.html',location.href).href;
 const retParam=q.get('brainWorkshopReturn')||q.get('brainParkReturn');
 if(retParam){try{const u=new URL(retParam,location.href);if(u.origin===location.origin&&/^https?:$/.test(u.protocol))home=u.href}catch{}}
 const save=BrainChallenge.scores.save;
 BrainChallenge.scores.save=function(record){
  const result=save.call(this,record);
  const last=Array.isArray(result)?result[result.length-1]:null;
  try{localStorage.setItem(resultKey,JSON.stringify({gameId:id,token,status:'completed',recordId:last?.recordId||null,score:last?.score??record?.score??0,completedAt:Date.now()}))}catch{}
  return result;
 };
 BrainChallenge.navigation.homeUrl=home;
 const age=['7-12','13-18','19-35','36-55','56-70','71+'][Number(ageIdx)];
 if(age)BrainChallenge.player.setAge(age);
})();

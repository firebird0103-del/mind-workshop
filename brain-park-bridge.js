/* Load this classic script in the EXISTING game. It never changes scores, Audio,
   Config, leaderboard, Assets or difficulty. Call completed() only from the
   game's existing end-of-game lifecycle, once its own scoring has finished. */
(function(){'use strict';
 const q=new URLSearchParams(location.search);
 const isWorkshop=q.has('brainWorkshopGame')||q.has('brainWorkshopToken');
 const gameId=q.get('brainWorkshopGame')||q.get('brainParkGame');
 const token=q.get('brainWorkshopToken')||q.get('brainParkToken');
 const rawReturn=q.get('brainWorkshopReturn')||q.get('brainParkReturn');
 const rawAge=q.has('brainWorkshopAgeIndex')?q.get('brainWorkshopAgeIndex'):q.get('brainParkAgeIndex');
 const resultKey=isWorkshop?'brainWorkshop.v1.result':'brainPark.v1.result';
 let returnURL=null;try{const u=new URL(rawReturn);if(u.origin===location.origin&&/^https?:$/.test(u.protocol))returnURL=u.href}catch{}
 const valid=['time','spot','memory','switch'].includes(gameId)&&!!token&&!!returnURL;
 function result(status){if(!valid)return false;try{localStorage.setItem(resultKey,JSON.stringify({gameId,token,status}));return true}catch{return false}}
 const api=Object.freeze({
  connected:valid,
  ageIndex:valid&&/^[0-5]$/.test(rawAge||'')?Number(rawAge):null,
  completed(){return result('completed')},
  returnToPark(){if(valid)location.assign(returnURL)},
  returnToWorkshop(){if(valid)location.assign(returnURL)},
  cancel(){if(valid){result('cancelled');location.assign(returnURL)}}
 });
 window.BrainPark=api;
 window.BrainWorkshopBridge=api;
})();

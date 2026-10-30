export function applyBirdExplode(bird,amount) {
  const p=Math.max(0,Math.min(1,amount));
  bird.parts.melody?.position.set(0,.48*p,.12*p);
  bird.leftWingPivot?.position.set(-.28-.40*p,.70+.12*p,0);
  bird.rightWingPivot?.position.set(.28+.40*p,.70+.12*p,0);
  const plume=bird.parts.plumage;
  if(plume){
    plume.position.set(0,0,0);
    plume.getObjectByName('Plumage_Tail')?.position.set(0,.08*p,-.44*p);
    plume.getObjectByName('Plumage_Crest')?.position.set(0,.70*p,.12*p);
    // The ornamental base ring remains on its own fitted base, above the tabletop.
    plume.getObjectByName('Plumage_Ring')?.position.set(0,0,0);
  }
}

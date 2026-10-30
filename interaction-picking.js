const interactive=o=>Number.isInteger(o.userData.resident)||Number.isInteger(o.userData.animal)||
  o.userData.centerWorkbench||o.userData.deskLamp||Number.isInteger(o.userData.studio);
export function pickInteraction(ray,targets) {
  let fallback=null;
  for(const hit of ray.intersectObjects(targets,true)) {
    let owner=null,visible=true;
    for(let node=hit.object;node;node=node.parent) {
      if(!node.visible)visible=false;
      if(!owner&&interactive(node))owner=node;
    }
    if(!visible||!owner)continue;
    // Large invisible room/table hit volumes are fallbacks, never foreground surfaces.
    if(hit.object.userData.interactionProxy){fallback??=owner;continue;}
    return owner;
  }
  return fallback;
}

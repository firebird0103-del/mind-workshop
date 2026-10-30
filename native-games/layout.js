import {resetFramePositions,applyFramePositions} from './layout-settings.js';
// V3.0 presentation only: use the actual workbench, never viewport offsets.
// Exported planners are pure so minimum target sizes and fit limits can be tested.
export function planAttention({width, height, size, overhead = 52, gap = 5, pairGap = 14, maximum = 116}) {
  const minTarget = 44, minReference = 28, padding = 18;
  const gridMin = cell => size * cell + Math.max(0, size - 1) * gap;
  const horizontal = width >= Math.max(620, 2 * (gridMin(minTarget) + padding) + pairGap);
  if (horizontal) {
    // Square cells, bounded art size: extra screen space becomes breathing room.
    const gridHeight = Math.max(gridMin(minTarget), Math.floor(Math.min(
      height - overhead, (width - pairGap) / 2 - padding, gridMin(maximum))));
    return {direction:'row', gridHeights:[gridHeight,gridHeight],
      pairWidth:2*(gridHeight+padding)+pairGap, pairHeight:gridHeight+overhead,
      minHeight: gridMin(minTarget) + overhead,
      fits: height >= gridMin(minTarget) + overhead};
  }
  const available = height - overhead * 2 - pairGap;
  const aMin = gridMin(minReference), bMin = gridMin(minTarget);
  const spare = Math.max(0, available - aMin - bMin);
  const a = aMin + Math.floor(spare * .42), b = bMin + spare - Math.floor(spare * .42);
  return {direction:'column',gridHeights:[a,b],minHeight:aMin+bMin+overhead*2+pairGap,
    fits: available >= aMin + bMin && width >= gridMin(minTarget) + padding};
}

export function planMemoryGrid({width, height, count, gap = 8, minimum = 48, maximum = 112}) {
  let best = null;
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns);
    const size = Math.floor(Math.min(maximum, (width-gap*(columns-1))/columns, (height-gap*(rows-1))/rows));
    if (size < minimum) continue;
    const waste = rows * columns - count;
    if (!best || size > best.size || size === best.size && rows < best.rows ||
      size === best.size && rows === best.rows && waste < best.waste) best = {columns, rows, size, waste, fits:true};
  }
  if (best) return best;
  const columns = Math.max(1, Math.min(count, Math.floor((width+gap)/(minimum+gap))));
  return {columns,rows:Math.ceil(count/columns),size:minimum,fits:false};
}

export function planMemoryDisplay({width,height,maximum=300}) {
  return Math.max(44, Math.floor(Math.min(maximum,width,height-40,Math.max(120,height*.52))));
}

export function planSemanticChoices({width,height,count=4,gap=12,maximum=224,symbolMax=112}) {
  const card = Math.floor(Math.min(maximum,(width-gap*Math.max(0,count-1))/Math.max(1,count),height-6));
  return {card:Math.max(44,card),symbol:Math.max(24,Math.floor(Math.min(symbolMax,card*.55))),fits:card>=44};
}

export function prepareLayout(root, gameId) {
  const $ = selector => root.querySelector(selector);
  const info = $('.info-area');
  // Keep feedback and actions in the task rail. The clock no longer shrinks or
  // pushes its confirmation button off-screen when per-question results appear.
  if (gameId === 'time') {
    info.append($('#result-board'), $('.btn-group'));
  }
  if (gameId === 'memory') {
    const actions = document.createElement('div'); actions.className = 'memory-actions';
    for (const id of ['btn-start','btn-submit','btn-next']) actions.append($('#'+id));
    info.append(actions);
    const art = document.createElement('div'); art.id = 'memoryReadyArt';art.setAttribute('aria-hidden','true');
    const pool = window.BrainChallengeAssets.api.getPool('memory','itemPool');
    art.innerHTML = pool.slice(0,3).map(item => '<span>'+item.markup+'</span>').join('');
    $('#memory-content').prepend(art);
  }
  if (gameId === 'switch') {
    const hud=document.createElement('div');hud.className='executive-hud';
    $('.info').prepend(hud);hud.append($('.status-row'),$('.progress'));
    $('.play').prepend($('.instruction'));
    const assets = window.BrainChallengeAssets.api.get('executive');
    $('#choices').innerHTML = assets.shapes.map((shape,i) =>
      `<div class="choice choice-preview" aria-hidden="true"><span class="symbol"><span class="shape ${shape.className}" style="background:${assets.colors[i].value}"></span></span></div>`).join('');
  }
}

export function observeLayout(root, body, gameId, settings = {}) {
  const $ = selector => root.querySelector(selector);
  const page = $('.game-root'), card = $('.game-card');
  let frame = 0, disposed = false;
  const visible = el => !!el && getComputedStyle(el).display !== 'none' && !el.hidden;
  const height = el => visible(el) ? el.getBoundingClientRect().height : 0;
  const prop = (el, key, value) => {if (el.style.getPropertyValue(key) !== value) el.style.setProperty(key,value);};
  function fit() {
    frame = 0; if (disposed || !page.isConnected) return;
    resetFramePositions(root);
    if(gameId==='switch'&&page.dataset.phase==='finished'&&$('.play>.instruction'))$('.info').append($('.play>.instruction'));
    // Try the one-screen layout first; fall back only if controls would become
    // smaller than their usable minimum, e.g. a large custom grid on a phone.
    body.dataset.layout = 'fit'; page.dataset.layout = 'fit';
    page.dataset.orientation = card.clientWidth < 720 ? 'portrait' : 'landscape';
    let fits = true;
    if (page.dataset.phase === 'finished') {
      fits = card.scrollHeight <= card.clientHeight + 2;
    } else if (gameId === 'spot' && visible($('#find-stage'))) {
      const pair = $('#game-container'), stage = $('#find-stage');
      const size = Number($('#grid-a').style.getPropertyValue('--grid-size')) || 4;
      const footerHeight=attentionFooterHeight(settings.fontSize ?? 16);
      prop(page,'--attention-footer-height',footerHeight+'px');
      const gridHeight = stage.clientHeight - footerHeight - 8;
      const titleHeight = Math.max(...[...root.querySelectorAll('.grid-title')].map(height));
      const wrapper = getComputedStyle($('.grid-wrapper'));
      const overhead = titleHeight + ['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth','rowGap'].reduce((sum,key)=>sum+(parseFloat(wrapper[key])||0),0);
      const plan = planAttention({width:stage.clientWidth,height:gridHeight,size,overhead,maximum:settings.attentionCell});
      page.dataset.boards = plan.direction;
      pair.style.gridTemplateColumns = plan.direction === 'row' ? 'repeat(2,minmax(0,1fr))' : 'minmax(0,1fr)';
      pair.style.gridTemplateRows = plan.direction === 'row' ? 'minmax(0,1fr)' : plan.gridHeights.map(h => (h+overhead)+'px').join(' ');
      pair.style.width = plan.direction === 'row' ? plan.pairWidth+'px' : '100%';
      pair.style.height = plan.direction === 'row' ? plan.pairHeight+'px' : '100%';
      pair.style.minHeight = plan.fits ? '0px' : plan.minHeight+'px';
      fits = plan.fits;
    } else if (gameId === 'time') {
      const area = $('.play-area');
      const available = area.clientHeight - height($('.bc-game-hint')) - 6;
      const size = Math.floor(Math.min(area.clientWidth, available, settings.clockMax ?? 680));
      prop(page,'--clock-size',Math.max(180,size)+'px');
      fits = size >= 180 && card.scrollHeight <= card.clientHeight + 2;
    } else if (gameId === 'memory') {
      const content = $('#memory-content'), availableWidth = content.clientWidth;
      const slotCount = $('#answer-area').children.length || 5;
      const slot = Math.max(44, Math.min(84, Math.floor((availableWidth-(slotCount-1)*8)/slotCount)));
      prop(page,'--memory-slot-size',slot+'px');
      const displaySize = planMemoryDisplay({width:availableWidth,height:content.clientHeight,maximum:settings.memoryDisplay});
      prop(page,'--memory-display-size',displaySize+'px');
      if (visible($('#options-area'))) {
        const options = $('#options-area');
        const availableHeight = content.clientHeight - height($('#sequence-label')) - height($('#answer-area')) - height($('#micro-notice')) - (settings.memoryGap ?? 16)*3 - 24;
        const plan = planMemoryGrid({width:availableWidth,height:availableHeight,count:options.children.length,maximum:settings.memoryOption});
        prop(page,'--memory-cols',String(plan.columns));prop(page,'--memory-cell',plan.size+'px');
        prop(page,'--memory-grid-height',(plan.rows*plan.size+(plan.rows-1)*8)+'px');
        fits = plan.fits;
      }
      fits = fits && $('.info-area').scrollHeight <= $('.info-area').clientHeight + 2 && content.scrollHeight <= content.clientHeight + 2;
    } else if (gameId === 'switch') {
      const choices = $('#choices'), count = choices.children.length;
      const plan = planSemanticStage({width:$('.play').clientWidth,height:$('.play').clientHeight,count,fontSize:settings.fontSize,ruleGap:settings.ruleGap,maximum:settings.choiceCard,symbolMax:settings.shapeMax});
      prop(page,'--semantic-top-band',plan.topBand+'px');
      prop(page,'--semantic-bottom-band',plan.bottomBand+'px');
      prop(page,'--semantic-min-height',plan.fits?'0px':plan.minimumHeight+'px');
      prop(page,'--choice-cols',String(Math.max(1,count)));
      prop(page,'--choice-size',plan.card+'px');
      prop(page,'--shape-size',plan.symbol+'px');
      fits = plan.fits && $('.info').scrollHeight <= $('.info').clientHeight+2;
    }
    // A scroll bar is never used as a substitute for fitting ordinary layouts.
    if (!fits) {body.dataset.layout='scroll';page.dataset.layout='scroll';}
    applyFramePositions(root,gameId,settings);
    // Also provides a deterministic completion signal for real viewport QA.
    const view = body.ownerDocument.defaultView;
    body.dataset.fittedViewport = `${view.innerWidth}x${view.innerHeight}`;
    body.dataset.fittedPhase = page.dataset.phase;
  }
  function request() {if (!disposed && !frame) frame = requestAnimationFrame(fit);}
  const resize = new ResizeObserver(request);resize.observe(body);
  const changes = new MutationObserver(request);
  changes.observe(page,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','data-phase']});
  document.fonts?.ready.then(request);
  request();
  return {request,dispose(){disposed=true;resize.disconnect();changes.disconnect();cancelAnimationFrame(frame);}};
}

export function attentionFooterHeight(fontSize=16){return Math.max(64,Math.ceil(fontSize*3+16));}

// Reserved task/action bands make ready and playing share the same choice anchor.
export function planSemanticStage({width,height,count=4,fontSize=16,ruleGap=20,maximum=224,symbolMax=112}) {
 const taskReserve=Math.ceil(fontSize*8)+ruleGap,actionReserve=72;
 const choice=planSemanticChoices({width,height:height-taskReserve-actionReserve+6,count,maximum,symbolMax});
 const spare=Math.max(0,height-taskReserve-actionReserve-choice.card);
 return {...choice,topBand:taskReserve+Math.floor(spare/2),bottomBand:actionReserve+spare-Math.floor(spare/2),minimumHeight:taskReserve+actionReserve+44};
}

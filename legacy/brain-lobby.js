/* Playground apparatus illustrations. Game 02/03 render the original shared atlas. */
(function () {
  'use strict';
  const art = (index, x, y, size = 54) => `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 100 100">${window.BrainChallengeAssets.attention.iconPool[index].markup}</svg>`;
  function scene(id, body) {
    return `<svg class="apparatus apparatus-${id}" viewBox="0 0 420 300" xmlns="http://www.w3.org/2000/svg" focusable="false"><defs>
      <linearGradient id="${id}-blue" x2=".9" y2="1"><stop stop-color="#2986ff"/><stop offset=".55" stop-color="#075df5"/><stop offset="1" stop-color="#003db4"/></linearGradient>
      <linearGradient id="${id}-coral" x2=".8" y2="1"><stop stop-color="#ff8b70"/><stop offset=".5" stop-color="#ff6251"/><stop offset="1" stop-color="#d43c30"/></linearGradient>
      <linearGradient id="${id}-yellow" x2=".5" y2="1"><stop stop-color="#fff176"/><stop offset=".5" stop-color="#ffd62c"/><stop offset="1" stop-color="#eeb900"/></linearGradient>
      <linearGradient id="${id}-teal" x2=".8" y2="1"><stop stop-color="#48dad1"/><stop offset=".6" stop-color="#00b2b3"/><stop offset="1" stop-color="#008082"/></linearGradient>
      <linearGradient id="${id}-white" x2="0" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#fffaf0"/></linearGradient>
    </defs>${body}</svg>`;
  }
  function clock() {
    const ticks=Array.from({length:12},(_,i)=>`<path d="M210 48v${i%3===0?12:7}" transform="rotate(${i*30} 210 139)" stroke="#102c53" stroke-width="${i%3===0?5:3}" stroke-linecap="round"/>`).join('');
    const numbers=[['12',210,77],['3',274,145],['6',210,209],['9',146,145]].map(([n,x,y])=>`<text x="${x}" y="${y}" text-anchor="middle" fill="#102c53" font-size="16" font-weight="800">${n}</text>`).join('');
    return scene('clock',`<ellipse cx="211" cy="274" rx="156" ry="17" fill="#075cfa" opacity=".09"/><ellipse cx="224" cy="268" rx="101" ry="17" fill="#e2b400"/><ellipse cx="217" cy="260" rx="102" ry="16" fill="url(#clock-yellow)"/><path d="M184 238v21h55v-21" fill="#0044c6"/><path d="M187 229v26h43v-26" fill="url(#clock-blue)"/><circle cx="222" cy="144" r="116" fill="#0043bc"/><circle cx="210" cy="137" r="116" fill="url(#clock-blue)" stroke="#7fc2ff" stroke-width="2"/><circle cx="210" cy="137" r="99" fill="url(#clock-white)" stroke="#003aa2" stroke-width="3"/><circle cx="210" cy="137" r="90" fill="none" stroke="#bfdaff" stroke-width="1.5"/>${ticks}${numbers}<g class="clock-hands"><path d="M213 144 176 100" stroke="#c54c30" stroke-width="12" stroke-linecap="round"/><path d="M210 138 174 94" stroke="url(#clock-coral)" stroke-width="11" stroke-linecap="round"/><path d="M214 145 270 109" stroke="#c54c30" stroke-width="9" stroke-linecap="round"/><path d="M210 138 269 102" stroke="url(#clock-coral)" stroke-width="8" stroke-linecap="round"/><circle cx="210" cy="137" r="13" fill="#0657df"/><circle cx="207" cy="134" r="5" fill="#ffd62c"/></g><path d="M109 100C21 76 28 147 210 186S399 164 315 128" fill="none" stroke="#ffd220" stroke-width="5"/><circle cx="82" cy="101" r="12" fill="url(#clock-coral)"/><circle cx="333" cy="132" r="11" fill="url(#clock-teal)"/><circle cx="264" cy="193" r="12" fill="url(#clock-yellow)"/><path d="M126 62A107 107 0 0 1 204 30" fill="none" stroke="#b0d6ff" stroke-width="3" stroke-linecap="round"/>`);
  }
  function attention() {
    let cells='';
    [0,6,1,15,2,8,3,4,12].forEach((n,i)=>{const x=110+(i%3)*67,y=44+Math.floor(i/3)*64;cells+=`<rect x="${x}" y="${y}" width="64" height="61" rx="4" fill="#fffdf6" stroke="#e8dfd3"/>${art(n,x+7,y+4,51)}`;if(i===1)cells+=`<circle cx="${x+32}" cy="${y+30}" r="27" fill="none" stroke="#ff604f" stroke-width="3"/>`;});
    return scene('attention',`<ellipse cx="220" cy="279" rx="164" ry="17" fill="#ff6453" opacity=".12"/><path d="m83 239-12 27h55l9-27" fill="#c83d31"/><path d="m299 238 19 27h54l-22-27" fill="#c83d31"/><path d="m101 143-25 111h31l18-110" fill="url(#attention-coral)"/><path d="m324 141 33 113h-31l-24-110" fill="url(#attention-coral)"/><circle cx="110" cy="146" r="9" fill="url(#attention-yellow)"/><circle cx="320" cy="146" r="9" fill="url(#attention-yellow)"/><path d="m96 24 225-13 17 15v214l-19 11H96Z" fill="#c1392e"/><path d="m96 19 224-9v226l-224 8Z" fill="url(#attention-coral)"/><path d="m102 26 211-8" stroke="#ffbc9e" stroke-width="3"/><rect x="106" y="39" width="204" height="196" rx="5" fill="#a12c27"/>${cells}<path d="m61 86 13 5m-23 13 17 1m-7 16 13-5" stroke="#ffce12" stroke-width="5" stroke-linecap="round"/><path d="M75 254h42m213 0h30" stroke="#ff9b85" stroke-width="3" stroke-linecap="round"/>`);
  }
  function memory() {
    let tokens='';
    [[104,158,0,1],[214,191,6,2],[324,224,1,3]].forEach(([x,y,n,k])=>{tokens+=`<path d="M${x-42} ${y+17}v15m84-15v15" stroke="#0871d9" stroke-width="7"/><ellipse cx="${x+3}" cy="${y+8}" rx="48" ry="18" fill="#dca900"/><ellipse cx="${x}" cy="${y}" rx="48" ry="18" fill="url(#memory-yellow)" stroke="#ffe980" stroke-width="1.5"/><text x="${x}" y="${y+7}" fill="#133455" text-anchor="middle" font-size="25" font-weight="900">${k}</text><path d="M${x} ${y-14}v-45" stroke="#6688a0" stroke-width="4"/><circle cx="${x+3}" cy="${y-82}" r="34" fill="#e3dacb"/><circle cx="${x}" cy="${y-84}" r="34" fill="url(#memory-white)" stroke="#e5d9c9" stroke-width="2"/>${art(n,x-25,y-109,50)}`;});
    return scene('memory',`<ellipse cx="213" cy="268" rx="171" ry="18" fill="#ffce12" opacity=".16"/><path d="M65 169C26 137 89 131 170 162L344 212C404 231 392 260 331 246L95 181" fill="none" stroke="#034cc4" stroke-width="7"/><path d="M65 165C26 133 89 127 170 158L344 208C404 227 392 256 331 242L95 177" fill="none" stroke="#489bff" stroke-width="5"/><path d="m138 181 31 8m80 23 33 9" stroke="#284a70" stroke-width="2" stroke-dasharray="3 5"/>${tokens}<path d="m55 57 11 8m-20 6 13 2" stroke="#ffce12" stroke-width="5" stroke-linecap="round"/>`);
  }
  function executive() {
    return `<svg class="apparatus apparatus-executive" viewBox="0 0 420 300" xmlns="http://www.w3.org/2000/svg" focusable="false"><ellipse cx="215" cy="280" rx="157" ry="16" fill="#00a6a6" opacity=".12"/><image href="assets/shape-switch-apparatus.png" x="0" y="0" width="420" height="300" preserveAspectRatio="xMidYMid meet"/></svg>`;
  }
  const apparatus={clock,attention,memory,executive};
  window.BrainLobby = {preview(id) {return apparatus[id]?.() || '';}};
  let dialogState = null;
  window.BrainLobby.openDialog = function (id, close, focusId) {
    window.BrainLobby.closeDialog();
    const modal = document.getElementById(id);
    const previous = document.activeElement;
    const background = Array.from(document.body.children).filter(el =>
      el !== modal && !['SCRIPT','LINK','STYLE'].includes(el.tagName));
    const inertBefore = background.map(el => el.inert);
    background.forEach(el => { el.inert = true; });
    const controls = () => Array.from(modal.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex="0"]')).filter(el => el.getClientRects().length);
    const handler = event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const items = controls(), first = items[0], last = items[items.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    dialogState = {previous, background, inertBefore, handler};
    document.addEventListener('keydown', handler);
    (focusId ? document.getElementById(focusId) : controls()[0])?.focus();
  };
  window.BrainLobby.closeDialog = function () {
    if (!dialogState) return;
    const {previous, background, inertBefore, handler} = dialogState;
    document.removeEventListener('keydown', handler);
    background.forEach((el,i) => { el.inert = inertBefore[i]; });
    dialogState = null;
    previous?.focus();
  };
})();

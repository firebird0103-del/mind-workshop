// One player per crafting cycle. Never infer confirmation from legacy caches.
import {read, write} from './config.js';
export const ROUND_KEY = 'brainWorkshop.v2.round';
const gameIds = ['time', 'spot', 'memory', 'switch'];
export const createSessionToken = () => globalThis.crypto.randomUUID?.() ||
  Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8,'0')).join('-');
export function createRoundSession(storage = globalThis.localStorage) {
  const raw = read(ROUND_KEY, null, storage);
  let state = {
    id: typeof raw?.id === 'string' ? raw.id : createSessionToken(),
    player: raw?.player && typeof raw.player.name === 'string' && raw.player.name.trim() &&
      Number.isInteger(raw.player.ageIndex) && raw.player.ageIndex >= 0 && raw.player.ageIndex < 6
      ? {name: raw.player.name.trim().slice(0, 10), ageIndex: raw.player.ageIndex} : null,
    pending: Array.isArray(raw?.pending) ? raw.pending.filter(r => gameIds.includes(r.gameId) && typeof r.token === 'string' && Number.isFinite(r.score)) : []
  };
  const persist = () => write(ROUND_KEY, state, storage);
  return {
    get player() { return state.player ? {...state.player} : null; },
    get id() { return state.id; },
    get pending() { return state.pending.map(r => ({...r})); },
    confirm(name, ageIndex) {
      if (!Number.isInteger(ageIndex) || ageIndex < 0 || ageIndex > 5) throw new Error('請選擇年齡組別');
      if (state.player) return this.player;
      state.player = {name: String(name || '').trim().slice(0, 10) || '訪客', ageIndex};
      persist(); return this.player;
    },
    queue(result) {
      if (!state.player || !gameIds.includes(result.gameId) || !result.token || !Number.isFinite(result.score)) return false;
      if (state.pending.some(r => r.token === result.token)) return false;
      state.pending.push({gameId: result.gameId, token: result.token, score: result.score});
      persist(); return true;
    },
    acknowledge(token) { state.pending = state.pending.filter(r => r.token !== token); persist(); },
    reset() { state = {id: createSessionToken(), player: null, pending: []}; persist(); }
  };
}

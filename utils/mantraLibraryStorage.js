import { safeGet, safeSet, KEYS } from './storage';

export const idsFrom = value => [...new Set((Array.isArray(value) ? value : []).map(item => typeof item === 'string' ? item : item?.id).filter(Boolean))];
export async function getFavoriteIds() { const ids = idsFrom(await safeGet(KEYS.MANTRA_FAVORITES, [])); await safeSet(KEYS.MANTRA_FAVORITES, ids); return ids; }
export async function setFavoriteIds(ids) { const stable = idsFrom(ids); await safeSet(KEYS.MANTRA_FAVORITES, stable); return stable; }
export async function getRecentIds() { const ids = idsFrom(await safeGet(KEYS.MANTRA_RECENT, [])).slice(0, 20); await safeSet(KEYS.MANTRA_RECENT, ids); return ids; }
export async function addRecentId(id) { const ids = await getRecentIds(); const next = [id, ...ids.filter(value => value !== id)].slice(0, 20); await safeSet(KEYS.MANTRA_RECENT, next); return next; }

'use strict';

const STORAGE_KEY = 'dharmasetu_panchang_daily_v1';
const MAX_ENTRIES = 24;
const RESPONSE_VERSION = 'prokerala-v2-lahiri-20260827+dharmasetu-panchang-periods-v1';

function roundedCoordinate(value) { return Number(value).toFixed(3); }
function localDateInTimezone(now, timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
}
function cacheKey(date, location, calculationVersion = RESPONSE_VERSION) {
  return [date, roundedCoordinate(location.latitude), roundedCoordinate(location.longitude), location.timezone || '', calculationVersion].join('|');
}
function isUsableEntry(entry, { date, location, now = Date.now(), calculationVersion } = {}) {
  if (!entry?.data || entry.key !== cacheKey(date, location, calculationVersion)) return false;
  const localToday = localDateInTimezone(now, location.timezone);
  if (entry.todaySnapshot && entry.date !== localToday) return false;
  return true;
}
async function readCache(storage) {
  try { const value = JSON.parse(await storage.getItem(STORAGE_KEY) || '{}'); return Array.isArray(value.entries) ? value : { entries: [] }; }
  catch { return { entries: [] }; }
}
async function getCachedPanchang(storage, context) {
  const cache = await readCache(storage); const key = cacheKey(context.date, context.location, context.calculationVersion);
  const entry = cache.entries.find(row => row.key === key);
  return isUsableEntry(entry, context) ? entry.data : null;
}
async function setCachedPanchang(storage, context, data) {
  const cache = await readCache(storage); const key = cacheKey(context.date, context.location, context.calculationVersion);
  const todaySnapshot = context.date === localDateInTimezone(context.now || Date.now(), context.location.timezone);
  const entry = { key, date: context.date, timezone: context.location.timezone, todaySnapshot, storedAt: new Date(context.now || Date.now()).toISOString(), data };
  const entries = cache.entries.filter(row => row.key !== key); entries.push(entry);
  await storage.setItem(STORAGE_KEY, JSON.stringify({ entries: entries.slice(-MAX_ENTRIES) }));
  return data;
}

module.exports = { STORAGE_KEY, MAX_ENTRIES, RESPONSE_VERSION, localDateInTimezone, cacheKey, isUsableEntry, getCachedPanchang, setCachedPanchang };

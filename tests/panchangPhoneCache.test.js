'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { STORAGE_KEY, MAX_ENTRIES, RESPONSE_VERSION, cacheKey, getCachedPanchang, setCachedPanchang } = require('../utils/panchangPhoneCache');

function storage() {
  const values = new Map();
  return { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => values.set(key, value), values };
}
const delhi = { latitude: 28.61391, longitude: 77.20901, timezone: 'Asia/Kolkata' };
function validData(date) {
  return { available: true, modernDate: { isoDate: date, formattedLocalDate: date }, traditionalDate: {},
    panchang: { tithi: { name: 'Tithi' }, nakshatra: { name: 'Nakshatra' }, yoga: { name: 'Yoga' }, karana: { name: 'Karana' } },
    sunMoon: {}, muhurta: {}, avoidPeriods: {}, events: [], metadata: { provider: 'prokerala', ayanamsa: { name: 'Lahiri' } } };
}

test('phone cache hit returns data without requiring a backend operation', async () => {
  const db = storage(); const context = { date: '2026-09-02', location: delhi, now: '2026-09-02T04:00:00Z' };
  const value = validData(context.date); await setCachedPanchang(db, context, value);
  assert.deepEqual(await getCachedPanchang(db, context), value);
});

test('local midnight expires a today snapshot but retains historical entries', async () => {
  const db = storage();
  await setCachedPanchang(db, { date: '2026-09-02', location: delhi, now: '2026-09-02T12:00:00Z' }, validData('2026-09-02'));
  assert.equal(await getCachedPanchang(db, { date: '2026-09-02', location: delhi, now: '2026-09-02T19:00:00Z' }), null);
  const historical = validData('2026-09-01');
  await setCachedPanchang(db, { date: '2026-09-01', location: delhi, now: '2026-09-02T12:00:00Z' }, historical);
  assert.deepEqual(await getCachedPanchang(db, { date: '2026-09-01', location: delhi, now: '2026-09-03T12:00:00Z' }), historical);
});

test('date, normalized location, and timezone participate in the key', () => {
  assert.notEqual(cacheKey('2026-09-02', delhi), cacheKey('2026-09-03', delhi));
  assert.notEqual(cacheKey('2026-09-02', delhi), cacheKey('2026-09-02', { ...delhi, latitude: 19.076 }));
  assert.notEqual(cacheKey('2026-09-02', delhi), cacheKey('2026-09-02', { ...delhi, timezone: 'UTC' }));
});

test('persistent phone cache is bounded', async () => {
  const db = storage();
  for (let day = 1; day <= MAX_ENTRIES + 2; day += 1) await setCachedPanchang(db, {
    date: `2026-08-${String(day).padStart(2, '0')}`, location: delhi, now: '2026-09-02T12:00:00Z'
  }, validData(`2026-08-${String(day).padStart(2, '0')}`));
  const raw = JSON.parse(db.values.values().next().value); assert.equal(raw.entries.length, MAX_ENTRIES);
});

test('corrupt matching phone cache entry is removed and returned as a miss', async () => {
  const db = storage(); const context = { date: '2026-09-20', location: delhi, now: '2026-09-20T04:00:00Z' };
  await setCachedPanchang(db, context, { truthy: true });
  assert.equal(await getCachedPanchang(db, context), null);
  assert.deepEqual(JSON.parse(db.values.get(STORAGE_KEY)).entries, []);
});

test('pre-Phase-2 response cache entries miss once so shared rows can be enriched', async () => {
  const db = storage();
  await setCachedPanchang(db, { date: '2026-09-01', location: delhi, calculationVersion: 'prokerala-v2-lahiri-20260827' }, { old: true });
  assert.match(RESPONSE_VERSION, /dharmasetu-panchang-periods-v1/);
  assert.equal(await getCachedPanchang(db, { date: '2026-09-01', location: delhi }), null);
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.dirname(require.resolve('../package.json'));
const screen = fs.readFileSync(path.join(root, 'app', 'panchang.js'), 'utf8');
const home = fs.readFileSync(path.join(root, 'app', '(tabs)', 'index.js'), 'utf8');
const config = fs.readFileSync(path.join(root, 'utils', 'backend-config.js'), 'utf8');
const helperSource = screen.match(/\/\/ PANCHANG_CONTRACT_HELPERS_START([\s\S]*?)\/\/ PANCHANG_CONTRACT_HELPERS_END/)?.[1];
assert.ok(helperSource, 'Panchang contract helpers must be present');
const contracts = {};
vm.runInNewContext(`${helperSource}; this.normalizeMonthData = normalizeMonthData; this.normalizeYearData = normalizeYearData; this.daysInMonth = daysInMonth; this.isValidDailyData = isValidDailyData; this.dayCacheKey = dayCacheKey; this.getCachedDay = getCachedDay; this.setCachedDay = setCachedDay; this.MAX_DAY_CACHE_SIZE = MAX_DAY_CACHE_SIZE;`, contracts);

const productionMonthFixture = { available: true, year: 2026, month: 8, days: [
  { date: '2026-08-09', available: true, tithi: 'Ekadashi', events: [{ name: 'Ekadashi', providerDerived: true }] },
  { date: '2026-08-11', available: false, error: 'PROVIDER_RATE_LIMITED' },
], events: [{ name: 'Ekadashi', date: '2026-08-09' }], partial: true };
const productionYearFixture = { available: true, year: 2026, months: Array.from({ length: 12 }, (_, index) => (
  { month: index + 1, status: 'LOAD_MONTH_ON_DEMAND', events: [] }
)), events: [] };

test('home replaces only the Premium quick shortcut with Panchang', () => {
  assert.match(home, /id:\s*'panchang'[\s\S]{0,150}route:\s*'\/panchang'/);
  assert.doesNotMatch(home.match(/const QUICK_ACTIONS =[\s\S]*?\];/)?.[0] || '', /id:\s*'payment'/);
  assert.match(home, /View Full Panchang|पूरा पंचांग/);
});

test('dedicated screen provides daily month year without fabricated Panchang values', () => {
  assert.match(screen, /const TABS = \['today', 'month', 'year'\]/);
  assert.match(screen, /PANCHANG_DAY/); assert.match(screen, /PANCHANG_MONTH/); assert.match(screen, /PANCHANG_YEAR/);
  assert.match(screen, /No approximate values are substituted/);
  assert.doesNotMatch(screen, /utils\/panchang|calculatePanchang|fake|fallback.*tithi/i);
});

test('all Panchang endpoints are backend-only configuration paths', () => {
  for (const endpoint of ['PANCHANG_TODAY', 'PANCHANG_DAY', 'PANCHANG_MONTH', 'PANCHANG_YEAR']) assert.match(config, new RegExp(endpoint));
  assert.doesNotMatch(screen, /PROKERALA_CLIENT|api\.prokerala\.com|Bearer\s/);
});

test('August month shell always contains all 31 dates and retains authoritative summaries', () => {
  const result = contracts.normalizeMonthData(productionMonthFixture);
  assert.equal(result.days.length, 31);
  assert.equal(result.days[8].summary.tithi, 'Ekadashi');
  assert.equal(result.days[10].status, 'NOT_LOADED');
  assert.equal(result.days[30].isoDate, '2026-08-31');
  for (const day of [5, 17, 29, 31]) assert.equal(result.days[day - 1].status, 'NOT_LOADED');
  assert.equal(result.partial, true);
});

test('October and leap-year February generate exact Gregorian date ranges', () => {
  assert.equal(contracts.normalizeMonthData({ year: 2026, month: 10, days: [] }).days.length, 31);
  assert.equal(contracts.normalizeMonthData({ year: 2026, month: 2, days: [] }).days.length, 28);
  assert.equal(contracts.normalizeMonthData({ year: 2028, month: 2, days: [] }).days.length, 29);
  assert.equal(contracts.daysInMonth(2026, 2), 28);
  assert.equal(contracts.daysInMonth(2028, 2), 29);
});

test('Year normalizes the actual production response and retains all 12 navigation months', () => {
  const result = contracts.normalizeYearData(productionYearFixture);
  assert.equal(result.months.length, 12); assert.equal(result.months[11].month, 12); assert.equal(result.partial, false);
});

test('Year safely fills missing month navigation and handles empty annual events', () => {
  const result = contracts.normalizeYearData({ year: 2026, months: [{ month: 8, status: 'PARTIAL' }] });
  assert.equal(result.months.length, 12); assert.equal(result.months[7].events.length, 0); assert.equal(result.events.length, 0);
  assert.equal(result.partial, true);
});

test('unknown array values are normalized before Month and Year map operations', () => {
  assert.equal(contracts.normalizeMonthData({ year: 2026, month: 8, days: null }).days.length, 31);
  assert.equal(contracts.normalizeYearData({ months: null }).months.length, 12);
  assert.match(screen, /events: safeArray\(source\.events\)/); assert.match(screen, /events: safeArray\(row\?\.events\)/);
});

test('Daily Panchang renders only after full response validation', () => {
  assert.match(screen, /function Daily\(\{ data \}\) \{ if \(!isValidDailyData\(data\)\) return null/);
  assert.equal(contracts.isValidDailyData({}), false);
  for (const field of ['modernDate', 'traditionalDate', 'sunMoon', 'muhurta', 'avoidPeriods', 'metadata']) assert.match(screen, new RegExp(`data\\.${field}`));
});

test('Month date tap still opens the selected Daily Panchang', () => {
  assert.match(screen, /const selectDate = value => \{ requestId\.current \+= 1; setDate\(value\); setTab\('today'\); \}/);
  assert.match(screen, /onDay=\{selectDate\}/);
  assert.match(screen, /onPress=\{\(\) => onDay\(day\.isoDate\)\}/);
  assert.match(screen, /PANCHANG_DAY\}\?date=\$\{date\}/);
});

test('Year month tap still opens the selected Month view', () => {
  assert.match(screen, /onMonth=\{month => \{ requestId\.current \+= 1; setMonthState\(\{ year, month \}\); setTab\('month'\); \}\}/);
  assert.match(screen, /onPress=\{\(\) => onMonth\(row\.month\)\}/);
});

test('Month cache enriches a previously empty date after authoritative day success', () => {
  const cached = { '2026-08-17': { panchang: { tithi: { name: 'Navami' } }, events: [] } };
  const result = contracts.normalizeMonthData({ year: 2026, month: 8, days: [] }, 2026, 8, cached);
  assert.equal(result.days[16].status, 'LOADED');
  assert.equal(result.days[16].summary.tithi, 'Navami');
  assert.match(screen, /setCachedDay\(dayCache\.current, cacheKey/);
});

test('daily cache is bounded LRU and isolates location, timezone, and calculation version', () => {
  const cache = new Map();
  const delhi = { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' };
  const mumbai = { latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Kolkata' };
  assert.notEqual(contracts.dayCacheKey('2026-08-05', delhi), contracts.dayCacheKey('2026-08-05', mumbai));
  assert.notEqual(contracts.dayCacheKey('2026-08-05', delhi), contracts.dayCacheKey('2026-08-05', { ...delhi, timezone: 'UTC' }));
  assert.notEqual(contracts.dayCacheKey('2026-08-05', delhi), contracts.dayCacheKey('2026-08-05', { ...delhi, calculationVersion: 'v2' }));
  for (let index = 0; index < 30; index += 1) contracts.setCachedDay(cache, `key-${index}`, { index });
  assert.equal(cache.size, contracts.MAX_DAY_CACHE_SIZE);
  assert.equal(cache.has('key-0'), false);
  const newest = contracts.getCachedDay(cache, 'key-29');
  assert.equal(newest.index, 29);
  assert.equal(Array.from(cache.keys()).at(-1), 'key-29');
});

test('failed requests are marked ERROR and never inserted into successful cache', () => {
  assert.match(screen, /setDayStates\(current => \(\{ \.\.\.current, \[date\]: 'ERROR' \}\)\)/);
  assert.match(screen, /setCachedDay\(dayCache\.current, cacheKey[\s\S]*setDayStates\(current => \(\{ \.\.\.current, \[date\]: 'LOADED' \}\)\)/);
});

test('loading and retry UX are explicit and no large persistent or cookie cache is created', () => {
  assert.match(screen, /Loading Panchang…/);
  assert.match(screen, /Could not load Panchang — tap to retry/);
  assert.match(screen, /Tap to retry/);
  assert.doesNotMatch(screen, /document\.cookie|Cookie|365.*AsyncStorage/i);
  assert.equal(contracts.MAX_DAY_CACHE_SIZE, 24);
});

test('navigation handles month and year boundaries and Go to Today resets all selections', () => {
  assert.match(screen, /shiftMonth\(monthState\.year, monthState\.month, -1\)/);
  assert.match(screen, /shiftMonth\(monthState\.year, monthState\.month, 1\)/);
  assert.match(screen, /setDate\(iso\(now\)\)/);
  assert.match(screen, /setMonthState\(\{ year: now\.getFullYear\(\), month: now\.getMonth\(\) \+ 1 \}\)/);
  assert.match(screen, /setYear\(now\.getFullYear\(\)\)/);
  assert.match(screen, /setTab\('today'\)/);
});

test('stale day responses cannot overwrite a newer selected date', () => {
  assert.match(screen, /const activeRequest = \+\+requestId\.current/);
  assert.match(screen, /activeRequest !== requestId\.current/);
});

test('production UI omits implementation and false unavailable wording', () => {
  for (const forbidden of ['LOAD MONTH ON DEMAND', 'provider-returned values', 'authoritative annual events are currently cached', '365 provider calls']) {
    assert.doesNotMatch(screen, new RegExp(forbidden, 'i'));
  }
  assert.match(screen, /Tap any date to view the complete Panchang/);
  assert.match(screen, /Choose a month to view its detailed Panchang/);
});

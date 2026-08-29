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
vm.runInNewContext(`${helperSource}; this.normalizeMonthData = normalizeMonthData; this.normalizeYearData = normalizeYearData;`, contracts);

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

test('dedicated screen provides daily month year and truthful unavailable UX', () => {
  assert.match(screen, /const TABS = \['today', 'month', 'year'\]/);
  assert.match(screen, /PANCHANG_DAY/); assert.match(screen, /PANCHANG_MONTH/); assert.match(screen, /PANCHANG_YEAR/);
  assert.match(screen, /No approximate values are substituted/);
  assert.doesNotMatch(screen, /utils\/panchang|calculatePanchang|fake|fallback.*tithi/i);
});

test('all Panchang endpoints are backend-only configuration paths', () => {
  for (const endpoint of ['PANCHANG_TODAY', 'PANCHANG_DAY', 'PANCHANG_MONTH', 'PANCHANG_YEAR']) assert.match(config, new RegExp(endpoint));
  assert.doesNotMatch(screen, /PROKERALA_CLIENT|api\.prokerala\.com|Bearer\s/);
});

test('Month normalizes the actual production response without losing authoritative days', () => {
  const result = contracts.normalizeMonthData(productionMonthFixture);
  assert.equal(result.days.length, 2); assert.equal(result.days[0].tithi, 'Ekadashi'); assert.equal(result.partial, true);
});

test('Month safely handles missing or partial days and empty events', () => {
  assert.equal(contracts.normalizeMonthData({ partial: true }).days.length, 0);
  assert.equal(contracts.normalizeMonthData({ days: [], events: [] }).events.length, 0);
  assert.match(screen, /No authoritative Panchang dates are available for this month/);
});

test('Year normalizes the actual production response and retains all 12 navigation months', () => {
  const result = contracts.normalizeYearData(productionYearFixture);
  assert.equal(result.months.length, 12); assert.equal(result.months[11].month, 12); assert.equal(result.partial, false);
});

test('Year safely fills missing month navigation and handles empty annual events', () => {
  const result = contracts.normalizeYearData({ year: 2026, months: [{ month: 8, status: 'PARTIAL' }] });
  assert.equal(result.months.length, 12); assert.equal(result.months[7].events.length, 0); assert.equal(result.events.length, 0);
  assert.equal(result.partial, true); assert.match(screen, /Annual event coverage is incomplete/);
});

test('unknown array values are normalized before Month and Year map operations', () => {
  assert.equal(contracts.normalizeMonthData({ days: null }).days.length, 0);
  assert.equal(contracts.normalizeYearData({ months: null }).months.length, 12);
  assert.match(screen, /safeArray\(day\.events\)/); assert.match(screen, /events: safeArray\(row\?\.events\)/);
});

test('Daily Panchang contract remains unchanged', () => {
  assert.match(screen, /function Daily\(\{ data \}\) \{ const p = data\.panchang/);
  for (const field of ['modernDate', 'traditionalDate', 'sunMoon', 'muhurta', 'avoidPeriods', 'metadata']) assert.match(screen, new RegExp(`data\\.${field}`));
});

test('Month date tap still opens the selected Daily Panchang', () => {
  assert.match(screen, /onDay=\{value => \{ setDate\(value\); setTab\('today'\); \}\}/);
  assert.match(screen, /day\.available && onDay\(day\.date\)/);
});

test('Year month tap still opens the selected Month view', () => {
  assert.match(screen, /onMonth=\{month => \{ setMonthState\(\{ year, month \}\); setTab\('month'\); \}\}/);
  assert.match(screen, /onPress=\{\(\) => onMonth\(row\.month\)\}/);
});

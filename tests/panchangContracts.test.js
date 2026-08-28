'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.dirname(require.resolve('../package.json'));
const screen = fs.readFileSync(path.join(root, 'app', 'panchang.js'), 'utf8');
const home = fs.readFileSync(path.join(root, 'app', '(tabs)', 'index.js'), 'utf8');
const config = fs.readFileSync(path.join(root, 'utils', 'backend-config.js'), 'utf8');

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

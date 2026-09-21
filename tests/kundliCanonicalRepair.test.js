'use strict';
/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const form = require('../utils/kundliForm');
const setup = require('../utils/kundliSetup');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('friendly date parts produce a valid canonical date only', () => {
  assert.equal(form.canonicalDateFromParts('17', '9', '1998', new Date('2026-09-17T12:00:00Z')), '1998-09-17');
  assert.equal(form.canonicalDateFromParts('31', '2', '2020'), null);
  assert.equal(form.canonicalDateFromParts('29', '2', '2021'), null);
  assert.equal(form.canonicalDateFromParts('29', '2', '2020'), '2020-02-29');
  assert.equal(form.canonicalDateFromParts('18', '9', '2026', new Date('2026-09-17T12:00:00Z')), null);
});

test('12-hour display time converts to canonical HH:mm', () => {
  assert.equal(form.canonicalTimeFrom12Hour('12', '00', 'AM'), '00:00');
  assert.equal(form.canonicalTimeFrom12Hour('12', '00', 'PM'), '12:00');
  assert.equal(form.canonicalTimeFrom12Hour('07', '35', 'AM'), '07:35');
  assert.equal(form.canonicalTimeFrom12Hour('07', '35', 'PM'), '19:35');
  assert.equal(form.canonicalTimeFrom12Hour('13', '00', 'PM'), null);
});

test('certainty labels map to canonical values and UNKNOWN does not fabricate time', () => {
  assert.deepEqual(setup.TIME_KNOWLEDGE.map(item => item.value), ['EXACT', 'APPROXIMATE', 'PERIOD_ONLY', 'UNKNOWN']);
  const screen = read('app/birth_details.js');
  assert.deepEqual(setup.timePayload('PERIOD_ONLY', '09:00', 'MORNING'), { birthTime: null, birthTimeCertainty: 'PERIOD_ONLY', birthTimePeriod: 'MORNING' });
  assert.deepEqual(setup.timePayload('UNKNOWN', '09:00', 'MORNING'), { birthTime: null, birthTimeCertainty: 'UNKNOWN', birthTimePeriod: null });
  assert.match(screen, /No time will be guessed/);
  assert.equal(setup.TIME_KNOWLEDGE.at(-1).label, "I don't know");
});

test('birth detail decisions distinguish initial, changed, current and generation-only flows', () => {
  assert.equal(form.birthDetailsAction({ hasBirthProfile: false, calculationChanged: true }), 'SAVE');
  assert.equal(form.birthDetailsAction({ hasBirthProfile: true, calculationChanged: true }), 'CONFIRM_AND_SAVE');
  assert.equal(form.birthDetailsAction({ hasBirthProfile: true, calculationChanged: false, currentReady: true, profileReady: true }), 'NAVIGATE');
  assert.equal(form.birthDetailsAction({ hasBirthProfile: true, calculationChanged: false, currentReady: false, profileReady: true }), 'GENERATE_ONLY');
});

test('Home and tab use canonical My Kundli without legacy primary ownership', () => {
  assert.match(read('app/(tabs)/index.js'), /id: 'kundli'[\s\S]{0,130}route: '\/my_kundli'/);
  const tab = read('app/(tabs)/kundli.js');
  assert.match(tab, /import MyKundliScreen from '\.\.\/my_kundli'/);
  assert.doesNotMatch(tab, /FlatList|useFocusEffect|LegacyKundliScreen|kundli_storage|kundli_account|Redirect|router\./);
});

test('incomplete My Kundli returns a focused state before advanced sections', () => {
  const screen = read('app/my_kundli.js');
  assert.match(screen, /if\(!hasReady&&!canGenerate\)return[\s\S]*Create Your Kundli/);
  assert.match(screen, /if\(!hasReady\)return[\s\S]*Preparing your Kundli/);
  assert.match(screen, /jyotish\?\.chart_data\?\.normalized/);
});

test('save pipeline is canonical, retry avoids rewriting details, and logs are metadata-only', () => {
  const birth = read('app/birth_details.js'); const lifecycle = read('utils/accountLifecycle.js'); const flow = read('utils/kundliSaveFlow.js');
  assert.match(birth, /saveAndPreparePrimaryKundli/); assert.doesNotMatch(birth, /retryPrimaryKundli\(\)/);
  assert.match(read('app/my_kundli.js'), /retryPrimaryKundli\(\)/);
  assert.match(flow, /save\(profile\)[\s\S]*generate\(\)[\s\S]*restore\(\)/);
  assert.match(birth, /Your details were saved, but your Kundli could not be prepared/);
  const logs = [...`${birth}\n${lifecycle}\n${flow}`.matchAll(/console\.log\(([^\n]+)\)/g)].map(match => match[1]).join('\n');
  assert.doesNotMatch(logs, /dateOfBirth|birthTime|birthplace|latitude|longitude|timezone|phone|token|Authorization|profile\)/);
});

test('development build and route identity markers are present', () => {
  assert.match(read('app/my_kundli.js'), /\[KundliBuild\] kundli-phase1-final-complete-20260921/);
  assert.match(read('app/my_kundli.js'), /\[KundliRoute\] My Kundli mounted/);
  assert.match(read('app/birth_details.js'), /\[KundliFlow\] guided setup mounted/);
  assert.match(read('app/(tabs)/kundli.js'), /\[KundliRoute\] Kundli tab mounted/);
});

'use strict';
/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { confirmMapLocation, isStep3Ready } = require('../utils/kundliSetup');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('Leaflet map owns gestures and provides pan, pinch and zoom controls', () => {
  const screen = read('app/birth_details.js');
  assert.match(screen, /#map\{touch-action:none\}/);
  assert.match(screen, /dragging:true,touchZoom:true[\s\S]*zoomControl:true/);
  assert.match(screen, /onTouchStart=\{\(\) => setMapInteracting\(true\)\}/);
  assert.match(screen, /nativeEvent\.touches\?\.length/);
  assert.match(screen, /scrollEnabled=\{!mapInteracting\}/);
  assert.match(screen, /nestedScrollEnabled/);
});

test('only a real map click changes the candidate coordinates', () => {
  const screen = read('app/birth_details.js');
  assert.match(screen, /map\.on\('click',[\s\S]*source:'USER_MAP_TAP'/);
  assert.match(screen, /point\.source === 'USER_MAP_TAP'[\s\S]*setMapPoint\(point\)/);
  assert.doesNotMatch(screen, /getCurrentPosition|requestForegroundPermissions|expo-location/);
});

test('search failure falls back to map and explicit confirmation gates submission', () => {
  const screen = read('app/birth_details.js'); const lifecycle = read('utils/accountLifecycle.js');
  assert.match(lifecycle, /authFetch\('\/account\/birthplace\/resolve'/);
  assert.match(lifecycle, /authFetch\('\/account\/onboarding'/);
  assert.ok(screen.indexOf('searchBirthplace(') < screen.indexOf('saveAndPreparePrimaryKundli('));
  assert.match(screen, /latitude: Number\(result\.location\?\.latitude\), longitude: Number\(result\.location\?\.longitude\)/);
  assert.match(screen, /setLocationState\(\['BIRTHPLACE_UNRESOLVED', 'BIRTHPLACE_AMBIGUOUS'\]\.includes/);
  assert.match(screen, /Couldn’t locate automatically\. Select the exact birthplace on the map/);
  assert.match(screen, /Confirm Birthplace/);
  assert.match(screen, /const placeValid = isStep3Ready\(confirmedLocation, placeContext\)/);
  assert.match(screen, /locationSelection: confirmedLocation/);
  assert.match(screen, /source: 'MAP_CONFIRMED'/);
});

test('location repair build marker is present', () => {
  assert.match(read('app/my_kundli.js'), /\[KundliBuild\] kundli-phase1-final-complete-20260921/);
});

test('manual candidate requires explicit confirmation and then makes step 3 ready', () => {
  const context = { villageCity: 'Village', state: 'State', country: 'India' };
  const candidate = { latitude: 24.123, longitude: 77.456, source: 'USER_MAP_TAP' };
  assert.equal(isStep3Ready(null, context), false);
  assert.equal(isStep3Ready(candidate, context), false);
  const confirmed = confirmMapLocation(candidate, context);
  assert.equal(confirmed.valid, true);
  assert.deepEqual(confirmed.locationSelection, { source: 'MAP_CONFIRMED', latitude: 24.123, longitude: 77.456 });
  assert.equal(isStep3Ready(confirmed.locationSelection, context), true);
});

test('zero coordinates are valid and missing context has a specific reason', () => {
  const zero = confirmMapLocation({ latitude: 0, longitude: 0 }, { villageCity: 'Null Island', state: 'Atlantic', country: 'International waters' });
  assert.equal(zero.valid, true); assert.equal(zero.locationSelection.latitude, 0); assert.equal(zero.locationSelection.longitude, 0);
  assert.equal(confirmMapLocation({ latitude: 0, longitude: 0 }, { villageCity: '', state: 'State', country: 'India' }).reason, 'VILLAGE_CITY_REQUIRED');
});

test('map or context edits invalidate confirmation without saving or generating', () => {
  const screen = read('app/birth_details.js');
  assert.match(screen, /setMapPoint\(point\); setConfirmedLocation\(null\); setLocationState\('SELECTED'\)/);
  assert.match(screen, /setter\(nextValue\); setConfirmedLocation\(null\); setLocationState\('IDLE'\)/);
  const handler = screen.slice(screen.indexOf('const confirmBirthplace'), screen.indexOf('const submit'));
  assert.doesNotMatch(handler, /saveAndPreparePrimaryKundli|saveAccountOnboarding|generatePrimaryKundli|searchBirthplace/);
  assert.match(screen, /const next = \(\) => validateStep\(\) \? setStep\(value => Math\.min\(3, value \+ 1\)\)/);
});

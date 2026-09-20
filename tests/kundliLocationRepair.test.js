'use strict';
/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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
  assert.match(screen, /const placeValid = placeContextValid && validMapPoint\(confirmedLocation\)/);
  assert.match(screen, /locationSelection: confirmedLocation/);
  assert.match(screen, /source: 'MAP_CONFIRMED'/);
});

test('location repair build marker is present', () => {
  assert.match(read('app/my_kundli.js'), /\[KundliBuild\] kundli-phase1-final-location-repair-20260921/);
});

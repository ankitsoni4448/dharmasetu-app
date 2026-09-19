'use strict';
/* global __dirname */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('home and main Kundli entry open the same canonical screen', () => {
  assert.match(source('app/(tabs)/index.js'), /id: 'kundli'[\s\S]{0,130}route: '\/my_kundli'/);
  const tab = source('app/(tabs)/kundli.js');
  assert.match(tab, /return <MyKundliScreen \/>/);
  assert.doesNotMatch(tab, /FlatList|useFocusEffect|LegacyKundliScreen|kundli_storage|kundli_account|Redirect/);
});

test('profile edits the one canonical birth form, not another Kundli', () => {
  assert.match(source('app/(tabs)/profile.js'), /onPress=\{\(\) => router\.push\('\/birth_details'\)\}/);
  const birth = source('app/birth_details.js');
  assert.match(birth, /restoreAccountLifecycle\(\)/);
  assert.match(birth, /saveAndPreparePrimaryKundli\(/);
  assert.match(birth, /await saveAndPreparePrimaryKundli\(/);
  assert.match(birth, /await saveAndPreparePrimaryKundli\([\s\S]+router\.replace\('\/my_kundli'\)/);
});

test('stale authoritative chart stays visible while replacement is pending', () => {
  const kundli = source('app/my_kundli.js');
  assert.match(kundli, /jyotish\.input_fingerprint !== birth\.input_fingerprint/);
  assert.match(kundli, /previous valid Kundli is shown while the updated calculation is prepared/);
  assert.match(kundli, /normalized\.charts\?\.d1\?\.data/);
  assert.doesNotMatch(kundli, /kundli_calc|calculateKundli/);
});

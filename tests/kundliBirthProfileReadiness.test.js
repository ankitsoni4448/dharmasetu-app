'use strict';
/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { isCanonicalBirthProfileReady, resolveKundliReadiness } = require('../utils/kundliReadiness');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

const readyBirthProfile = { date_of_birth: '2000-01-01', birth_time: '12:30:00', birth_time_certainty: 'EXACT',
  place_name: 'Present', latitude: 1, longitude: 2, timezone: 'Asia/Kolkata', utc_offset_minutes: 330,
  input_fingerprint: 'present', profile_version: 1 };

test('canonical birth profile readiness rejects missing authoritative inputs', () => {
  assert.equal(isCanonicalBirthProfileReady(null), false);
  assert.equal(isCanonicalBirthProfileReady(readyBirthProfile), true);
  assert.equal(isCanonicalBirthProfileReady({ ...readyBirthProfile, birth_time: null }), false);
  assert.equal(isCanonicalBirthProfileReady({ ...readyBirthProfile, birth_time_certainty: 'UNKNOWN' }), false);
});

test('readiness reuses a saved profile and generates only for a complete missing chart', async () => {
  let generations = 0;
  const missing = await resolveKundliReadiness({ restore: async () => ({ birthProfile: null }), loadExisting: async () => null,
    generate: async () => { generations += 1; return {}; } });
  assert.equal(missing.status, 'NEEDS_BIRTH_PROFILE'); assert.equal(generations, 0);
  const saved = { id: 'saved-primary' };
  const reused = await resolveKundliReadiness({ restore: async () => ({ birthProfile: readyBirthProfile }), loadExisting: async () => saved,
    generate: async () => { generations += 1; return {}; } });
  assert.equal(reused.profile, saved); assert.equal(generations, 0);
  const generated = await resolveKundliReadiness({ restore: async () => ({ birthProfile: readyBirthProfile }), loadExisting: async () => null,
    generate: async () => { generations += 1; return { id: 'new-primary' }; } });
  assert.equal(generated.status, 'READY'); assert.equal(generations, 1);
});

test('primary routes and presentation use canonical account data only', () => {
  const tab = read('app/(tabs)/kundli.js'); const myKundli = read('app/my_kundli.js');
  assert.match(tab, /MyKundliScreen/);
  assert.doesNotMatch(tab, /kundli_storage|kundli_account|FlatList|useFocusEffect/);
  assert.match(myKundli, /router\.push\('\/birth_details'\)/);
  assert.match(myKundli, /fact\?\.status === 'AVAILABLE'/);
  assert.match(myKundli, /normalized\.charts\?\.d1\?\.data/);
  assert.match(myKundli, /normalized\.houses\?\.status === 'AVAILABLE'/);
  assert.doesNotMatch(myKundli, /kundli_calc|calculateKundli/);
});

test('legacy result remains quarantined and does not fabricate primary facts', () => {
  const result = read('app/kundli_result.js');
  assert.doesNotMatch(result, /\|\| 'Mesh'/); assert.doesNotMatch(result, /\|\| 'Ashwini'/);
  assert.match(result, /showLegacyInterpretation && Array\.isArray\(calc\.remedies\)/);
  assert.match(result, /showLegacyInterpretation && Array\.isArray\(calc\.yogas\)/);
  assert.match(result, /showLegacyInterpretation && Array\.isArray\(calc\.dosh\)/);
});

test('login remains usable while canonical Kundli completion is independent', () => {
  const login = read('app/login.js'); const index = read('app/index.js');
  assert.match(login, /router\.replace\('\/\(tabs\)'\)/);
  assert.match(login, /const existing = await getUserFromBackend\(localPhone\)/);
  assert.match(login, /registerUserToBackend\(\{ name:/);
  assert.doesNotMatch(login, /saveAccountOnboarding|generatePrimaryKundli/);
  assert.match(index, /router\.replace\('\/\(tabs\)'\)/);
});

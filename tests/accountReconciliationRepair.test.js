'use strict';
/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { profilePresentation, onboardingErrorMessage } = require('../utils/accountBirthPresentation');
const legacy = require('../utils/legacyBirthProfileMigration');
const { canonicalTimeFrom12Hour } = require('../utils/kundliForm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const draft = { name: 'Person', gender: 'other', dateOfBirth: '1990-01-01', birthTime: '09:05',
  birthTimeCertainty: 'EXACT', birthplace: 'Village, District, State, India', language: 'english', birthDataConsent: true };

function restoreHarness(account, snapshot) {
  const calls = []; let saved = false;
  const src = read('utils/accountLifecycle.js');
  const code = src.slice(src.indexOf('export async function restoreAccountLifecycle'), src.indexOf('export async function saveAccountOnboarding')).replace('export ', '');
  const context = { legacyBirthMigration: legacy, AsyncStorage: { getItem: async () => JSON.stringify(snapshot) },
    parseResponse: async value => value,
    authFetch: async () => { calls.push('restore'); return structuredClone(saved ? { ...account, birthProfile: { input_fingerprint: 'saved' } } : account); },
    saveAccountOnboarding: async input => { calls.push(input); saved = true; } };
  vm.createContext(context); vm.runInContext(code, context);
  return { calls, restore: context.restoreAccountLifecycle };
}
test('complete authenticated legacy server draft saves once and refetches canonical account', async () => {
  const h = restoreHarness({ account: { authUserId: 'owner', phone: 'phone' }, legacyBirthInput: { ...draft, automaticMigrationAllowed: true } });
  const result = await h.restore({ reconcile: true });
  assert.equal(result.birthProfile.input_fingerprint, 'saved');
  assert.equal(h.calls.length, 3); assert.equal(h.calls[1].reconcileLegacy, true);
});
test('partial legacy inputs prefill without writes, invented times or promoted labels', async () => {
  const snapshot = { authUserId: 'owner', phone: 'phone', name: 'Person', dob: '1990-01-01', birthCity: 'Village', rashi: 'OLD', timeSlot: 'morning' };
  const h = restoreHarness({ account: { authUserId: 'owner', phone: 'phone' } }, snapshot);
  const result = await h.restore({ reconcile: true });
  assert.equal(result.legacyBirthInput.dateOfBirth, '1990-01-01');
  assert.equal(result.legacyBirthInput.birthTime, null); assert.equal(result.legacyBirthInput.rashi, undefined);
  assert.deepEqual(h.calls, ['restore']);
  assert.equal(legacy.legacyBirthPrefill(snapshot, 'different-owner', 'phone'), null);
});
test('invalid legacy date and slot-derived clock values do not migrate', () => {
  const snapshot = { ...draft, authUserId: 'owner', phone: 'phone', dob: '2023-02-29', birthCity: draft.birthplace };
  assert.equal(legacy.validatedLegacyBirthInput(snapshot, 'owner', 'phone'), null);
  assert.equal(legacy.legacyBirthPrefill({ ...snapshot, dob: '1990-01-01', timeMode: 'slot', birthTime: '09:00' }, 'owner', 'phone').birthTime, null);
  assert.equal(canonicalTimeFrom12Hour('9', '', 'AM'), null);
});
test('canonical record is never overwritten by automatic reconciliation', async () => {
  const h = restoreHarness({ birthProfile: { input_fingerprint: 'current' }, legacyBirthInput: { ...draft, automaticMigrationAllowed: true } });
  assert.equal((await h.restore({ reconcile: true })).birthProfile.input_fingerprint, 'current');
  assert.deepEqual(h.calls, ['restore']);
});
test('conflicting server and local legacy inputs require review', async () => {
  const snapshot = { ...draft, authUserId: 'owner', phone: 'phone', dob: draft.dateOfBirth, birthCity: draft.birthplace };
  const h = restoreHarness({ account: { authUserId: 'owner', phone: 'phone' }, legacyBirthInput: { ...draft, dateOfBirth: '1991-01-01', automaticMigrationAllowed: false } }, snapshot);
  const result = await h.restore({ reconcile: true });
  assert.equal(result.legacyBirthInput.dateOfBirth, '1991-01-01'); assert.deepEqual(h.calls, ['restore']);
});
test('Profile prefers canonical inputs and current provider facts, hides legacy labels', () => {
  const cache = { auth_user_id: 'owner', name: 'Old', dob: '1980-01-01', rashi: 'OLD', nakshatra: 'OLD', deity: 'OLD' };
  const account = { account: { authUserId: 'owner' }, profile: { name: 'New' }, birthProfile: { date_of_birth: '1990-01-01', place_name: 'Village', input_fingerprint: 'current' },
    jyotishProfile: { status: 'KUNDLI_READY', input_fingerprint: 'current', chart_data: { normalized: { moon_sign: { status: 'AVAILABLE', sign: 'Provider sign' } } } } };
  const p = profilePresentation(account, cache);
  assert.equal(p.name, 'New'); assert.equal(p.dob, '1990-01-01'); assert.equal(p.birthCity, 'Village');
  assert.equal(p.rashi, 'Provider sign'); assert.equal(p.nakshatra, ''); assert.equal(p.deity, '');
  account.jyotishProfile.input_fingerprint = 'old'; assert.equal(profilePresentation(account, cache).rashi, '');
  assert.equal(profilePresentation(null, cache).rashi, '');
});
test('resolver errors have distinct helpful messages without technical codes', () => {
  for (const code of ['BIRTHPLACE_UNRESOLVED', 'BIRTHPLACE_TIMEZONE_UNRESOLVED', 'BIRTHPLACE_SERVICE_UNAVAILABLE', 'BIRTHPLACE_AMBIGUOUS', 'ONBOARDING_SAVE_FAILED']) {
    assert.doesNotMatch(onboardingErrorMessage(code), /BIRTHPLACE_|ONBOARDING_/);
  }
  assert.match(onboardingErrorMessage('BIRTHPLACE_SERVICE_UNAVAILABLE'), /temporarily unavailable/);
  assert.match(onboardingErrorMessage('BIRTHPLACE_UNRESOLVED'), /district, state, and country/);
});
test('signup is account-only and the optional Kundli flow owns birth save and generation', () => {
  const login = read('app/login.js');
  assert.doesNotMatch(login, /SLOT_TIMES|timeMode|timeSlot/);
  assert.doesNotMatch(login, /birthplaceDetails|saveAccountOnboarding|generatePrimaryKundli|dateOfBirth|birthTime/);
  assert.match(login, /registerUserToBackend\(\{ name:/);
  assert.match(login, /cacheAndEnter[\s\S]*router\.replace\('\/\(tabs\)'\)/);
  const birth = read('app/birth_details.js');
  assert.match(birth, /birthplaceDetails: \{ villageCity, district, state: region, country \}/);
  assert.match(birth, /saveAndPreparePrimaryKundli\(/);
  assert.match(birth, /birthDataConsent: true/);
  assert.match(read('app/(tabs)/profile.js'), /profilePresentation\(account, cache\)/);
});

test('account-load failures have retry states before incomplete forms and never resume signup writes', () => {
  const birth = read('app/birth_details.js'); const kundli = read('app/my_kundli.js');
  assert.ok(birth.indexOf('if (loadError || !account) return') < birth.indexOf('<ScrollView'));
  assert.match(birth, /setLoadAttempt\(v => v \+ 1\)/);
  assert.ok(kundli.indexOf('if (!account && error) return') < kundli.indexOf('if (!hasReadyChart && !canGenerate) return'));
  const login = read('app/login.js');
  assert.doesNotMatch(login, /try \{ lifecycle = await restoreAccountLifecycle[^\n]*catch \{\}/);
  assert.match(login, /setStep\('load_error'\)/);
  assert.match(login, /Your existing account will not be replaced/);
  assert.match(login, /const account = await restoreAccountLifecycle\(\);/);
});

test('invalid JSON account response rejects instead of pretending the profile is absent', async () => {
  const src = read('utils/accountLifecycle.js');
  const context = { __DEV__: false };
  vm.createContext(context);
  vm.runInContext(src.slice(src.indexOf('async function parseResponse('), src.indexOf('export async function restoreAccountLifecycle')), context);
  await assert.rejects(context.parseResponse({ status: 200, ok: true, json: async () => { throw new SyntaxError('invalid'); } }, 'ACCOUNT_RESTORE_FAILED'),
    error => error.code === 'ACCOUNT_RESTORE_FAILED');
});

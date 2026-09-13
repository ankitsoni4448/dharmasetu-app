'use strict';
/* global __dirname */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  isCanonicalBirthProfileReady,
  resolveKundliReadiness,
} = require('../utils/kundliReadiness');

const readyBirthProfile = {
  date_of_birth: '2000-01-01',
  birth_time: '12:30:00',
  birth_time_certainty: 'EXACT',
  place_name: 'Present',
  latitude: 1,
  longitude: 2,
  timezone: 'Asia/Kolkata',
  utc_offset_minutes: 330,
  input_fingerprint: 'present',
  profile_version: 1,
};

assert.equal(isCanonicalBirthProfileReady(null), false);
assert.equal(isCanonicalBirthProfileReady(readyBirthProfile), true);
assert.equal(isCanonicalBirthProfileReady({ ...readyBirthProfile, birth_time: null }), false);
assert.equal(isCanonicalBirthProfileReady({ ...readyBirthProfile, birth_time_certainty: 'UNKNOWN' }), false);

(async () => {
  let generations = 0;
  const missing = await resolveKundliReadiness({
    restore: async () => ({ birthProfile: null }),
    loadExisting: async () => null,
    generate: async () => { generations += 1; return {}; },
  });
  assert.equal(missing.status, 'NEEDS_BIRTH_PROFILE');
  assert.equal(generations, 0, 'missing canonical profile must never trigger generation');

  const saved = { id: 'saved-primary' };
  const reused = await resolveKundliReadiness({
    restore: async () => ({ birthProfile: readyBirthProfile }),
    loadExisting: async () => saved,
    generate: async () => { generations += 1; return {}; },
  });
  assert.equal(reused.status, 'READY');
  assert.equal(reused.profile, saved);
  assert.equal(generations, 0, 'saved Kundli must not regenerate');

  const generated = await resolveKundliReadiness({
    restore: async () => ({ birthProfile: readyBirthProfile }),
    loadExisting: async () => null,
    generate: async () => { generations += 1; return { id: 'new-primary' }; },
  });
  assert.equal(generated.status, 'READY');
  assert.equal(generations, 1, 'ready profile without a saved Kundli should generate once');

  const raced = await resolveKundliReadiness({
    restore: async () => ({ birthProfile: readyBirthProfile }),
    loadExisting: async () => null,
    generate: async () => { const error = new Error('BIRTH_PROFILE_REQUIRED'); throw error; },
  });
  assert.equal(raced.status, 'NEEDS_BIRTH_PROFILE');

  const screen = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'kundli.js'), 'utf8');
  assert.match(screen, /router\.push\('\/birth_details'\)/, 'CTA must use the canonical birth-details route');
  assert.match(screen, /अपनी कुंडली बनाने के लिए जन्म विवरण पूरा करें/);
  assert.match(screen, /Complete your birth details/);
  assert.doesNotMatch(screen, /params:\s*\{[^}]*birth/i, 'private birth values must not be navigation parameters');

  const lifecycle = fs.readFileSync(path.join(__dirname, '..', 'utils', 'kundli_account.js'), 'utf8');
  assert.match(lifecycle, /restore:\s*restoreAccountLifecycle[\s\S]*loadExisting:[\s\S]*generate:/,
    'restore/readiness must precede generation');
  assert.match(lifecycle, /jyotishProfile\?\.status === 'KUNDLI_READY'[\s\S]*cachePrimaryKundliFromAccount/,
    'a saved authoritative Kundli must be restored without a generation request');
  assert.match(lifecycle, /parsed\.ownerId === ownerId/,
    'primary Kundli cache must be isolated by authenticated account');
  assert.doesNotMatch(lifecycle, /console\.(?:log|warn|error)\([^\n]*(?:birthData|birthProfile|date_of_birth|birth_time|place_name)/,
    'private birth data must not be logged');

  const accountLifecycle = fs.readFileSync(path.join(__dirname, '..', 'utils', 'accountLifecycle.js'), 'utf8');
  assert.match(accountLifecycle, /clearAuthenticatedLocalData[\s\S]*dharmasetu_primary_kundli_/,
    'logout must clear account-linked Kundli readiness/cache state');
  assert.doesNotMatch(screen, /saveAccountOnboarding|\/account\/onboarding/,
    'opening Kundli must not mutate canonical birth data');
  assert.match(screen, /isPrimaryKundli\(id\)[\s\S]*router\.push\('\/my_kundli'\)/,
    'authoritative primary Kundli must use the canonical provider-backed screen');
  assert.match(screen, /profile\.ownerId === ownerId/,
    'local Kundli profiles must be isolated to the authenticated account');

  const resultScreen = fs.readFileSync(path.join(__dirname, '..', 'app', 'kundli_result.js'), 'utf8');
  assert.doesNotMatch(resultScreen, /\|\| 'Mesh'/, 'missing Lagna or Rashi must not become Mesh');
  assert.doesNotMatch(resultScreen, /\|\| 'Ashwini'/, 'missing Nakshatra must not become Ashwini');
  assert.doesNotMatch(resultScreen, /\|\| ["']0°00/, 'missing degree must not become zero');
  assert.match(resultScreen, /showLegacyInterpretation && Array\.isArray\(calc\.remedies\)/,
    'legacy remedies must remain quarantined from the provider-backed result');
  assert.match(resultScreen, /showLegacyInterpretation && calc\.insights/,
    'legacy deterministic insights must remain quarantined');

  const myKundli = fs.readFileSync(path.join(__dirname, '..', 'app', 'my_kundli.js'), 'utf8');
  assert.match(myKundli, /fact\?\.status === 'AVAILABLE'/,
    'authoritative UI must display only explicitly available canonical facts');
  assert.match(myKundli, /normalized\.charts\?\.d1\?\.data/,
    'canonical provider chart wrapper must be consumed');
  assert.doesNotMatch(myKundli, /kundli_calc|calculateKundli/,
    'authoritative screen must never call the legacy approximate calculator');

  const storage = fs.readFileSync(path.join(__dirname, '..', 'utils', 'kundli_storage.js'), 'utf8');
  assert.doesNotMatch(storage, /Source: DharmaSetu Vedic Calculator/,
    'provider-backed exports must not be labelled as a local calculator');

  const login = fs.readFileSync(path.join(__dirname, '..', 'app', 'login.js'), 'utf8');
  const index = fs.readFileSync(path.join(__dirname, '..', 'app', 'index.js'), 'utf8');
  assert.match(login, /router\.replace\('\/\(tabs\)'\)/, 'missing Kundli data must not block other app features');
  assert.match(index, /router\.replace\('\/\(tabs\)'\)/, 'legacy startup must remain usable outside Kundli');

  console.log('Kundli birth-profile readiness tests: PASS');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

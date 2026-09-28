'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const practice = require('../utils/mantraPractice');
const catalog = require('../utils/mantraCatalog');

test('general preparation contract contains no generated guidance', () => {
  const value = practice.createGeneralPreparation();
  assert.ok(Object.values(value).every(item => item === null));
});

test('missing preparation and practice remain empty', () => {
  const record = catalog.normalizeMantraRecord({ id: 'empty-practice', canonical_name: 'Fixture', sanskrit_text: 'fixture-content' });
  assert.deepEqual(record.preparation, {});
  assert.deepEqual(record.practice, {});
  assert.deepEqual(practice.populatedEntries(record.preparation), []);
  assert.deepEqual(practice.populatedEntries(record.practice), []);
});

test('initiation and restricted records guard advanced instructions', () => {
  for (const record of [
    { requires_initiation: true, practice_level: 'GENERAL_DEVOTIONAL' },
    { requires_guru_guidance: true, practice_level: 'GENERAL_DEVOTIONAL' },
    { practice_level: 'INITIATION_GUIDANCE' },
    { practice_level: 'RESTRICTED' },
  ]) assert.equal(practice.advancedPracticeState(record).mayDisplayInstructions, false);
});

test('advanced instructions require reviewed practice provenance', () => {
  assert.equal(practice.advancedPracticeState({ advanced_practice_available: true }).mayDisplayInstructions, false);
  assert.equal(practice.advancedPracticeState({ advanced_practice_available: true, provenance: { practice: [{}] }, verification: { practice: 'VERIFIED' } }).mayDisplayInstructions, true);
});

test('manual tap guard accepts at most one increment during lock interval', () => {
  let now = 1000; const accept = practice.createTapGuard(350, () => now);
  assert.equal(accept(), true);
  assert.equal(accept(), false);
  now = 1349; assert.equal(accept(), false);
  now = 1350; assert.equal(accept(), true);
});

test('guided Japa state is inert and has no prescribed default target', () => {
  assert.deepEqual(practice.createGuidedJapaState(), {
    guidedVoiceEnabled: false, autoAdvance: false, playbackSpeed: 1, currentRepetition: 0, target: null, paused: true,
  });
});

test('user counter targets remain separate from sourced recommended counts', () => {
  const record = catalog.normalizeMantraRecord({ id: 'counts', canonical_name: 'Fixture', sanskrit_text: 'fixture-content', practice: { recommended_counts: [7] } });
  assert.deepEqual(record.practice.recommended_counts, [7]);
  assert.equal(practice.createGuidedJapaState().target, null);
});

test('synthetic audio never becomes verified through normalization', () => {
  const record = catalog.normalizeMantraRecord({ id: 'audio', canonical_name: 'Fixture', sanskrit_text: 'fixture-content', audio_metadata: { synthetic: true, pronunciation_verified: true } });
  assert.equal(record.audio.synthetic, true);
  assert.equal(record.verification.audio, 'UNVERIFIED');
});

test('presentation helper renders primitives and omits structured objects safely', () => {
  assert.equal(practice.presentationValue(' guidance '), 'guidance');
  assert.equal(practice.presentationValue(12), '12');
  assert.equal(practice.presentationValue(true), 'Yes');
  assert.equal(practice.presentationValue(['one', 2, { unsafe: true }, ['three']]), 'one, 2, three');
  assert.equal(practice.presentationValue({ nested: 'instruction' }), null);
  assert.equal(practice.presentationValue([{}, null, Number.NaN]), null);
  assert.notEqual(practice.presentationValue({}), '[object Object]');
});

test('every supported practice level has a distinct truthful label', () => {
  const levels = ['GENERAL_DEVOTIONAL','SOURCE_SPECIFIC','TRADITION_SPECIFIC','INITIATION_GUIDANCE','RESTRICTED'];
  const labels = levels.map(practice.practiceLevelLabel);
  assert.deepEqual(labels, ['General devotional practice','Source-specific practice','Tradition-specific practice','Initiation guidance','Restricted practice']);
  assert.equal(new Set(labels).size, levels.length);
});

test('replacement-character corruption is withheld from explanatory presentation', () => {
  assert.equal(practice.hasReplacementCorruption(`broken\uFFFDtext`), true);
  assert.equal(practice.hasReplacementCorruption('ï¿½ï¿½ï¿½'), true);
  assert.equal(practice.explanatoryText(`broken\uFFFDtext`), 'Content under review');
  assert.equal(practice.presentationValue(`broken\uFFFDtext`, 'सामग्री की समीक्षा जारी है।'), 'सामग्री की समीक्षा जारी है।');
  assert.equal(practice.explanatoryText('reviewed text'), 'reviewed text');
});

test('serialized persistence cannot complete a newer count before an older write', async () => {
  const started = []; const completed = []; const resolvers = [];
  const persist = practice.createSerializedWriter(value => new Promise(resolve => { started.push(value); resolvers.push(() => { completed.push(value); resolve(); }); }));
  const first = persist(1); const second = persist(2);
  await new Promise(resolve => setImmediate(resolve)); assert.deepEqual(started, [1]);
  resolvers.shift()(); await first; await new Promise(resolve => setImmediate(resolve)); assert.deepEqual(started, [1, 2]);
  resolvers.shift()(); await second; assert.deepEqual(completed, [1, 2]);
});

test('confirmed reset value is serialized after pending count writes', async () => {
  const written = []; const persist = practice.createSerializedWriter(async value => { written.push(value); });
  await Promise.all([persist(4), persist(5), persist(0)]);
  assert.deepEqual(written, [4, 5, 0]);
});

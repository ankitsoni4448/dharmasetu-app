'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const preparation = require('../utils/generalJapaPreparation');
const catalog = require('../utils/mantraCatalog');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('general Japa preparation is centralized, bilingual and categorized', () => {
  const value = preparation.GENERAL_JAPA_PREPARATION;
  assert.equal(value.titleHi, 'सामान्य जप की तैयारी');
  assert.equal(value.titleEn, 'General Japa Preparation');
  assert.equal(value.items.length, 9);
  assert.ok(value.items.every(item => item.hi && item.en && ['RECOMMENDED','TRADITION_DEPENDENT','INFORMATIONAL'].includes(item.category)));
});

test('general guidance remains separate from canonical mantra practice', () => {
  const record = catalog.normalizeMantraRecord({ id:'separate', canonical_name:'Fixture', sanskrit_text:'fixture-content' });
  assert.deepEqual(record.preparation, {}); assert.deepEqual(record.practice, {});
  assert.equal(Object.hasOwn(record, 'general_preparation'), false);
});

test('Detail and Japa use the shared preparation component and preserve practice separation', () => {
  const detail = read('app/mantra_detail.js'); const japa = read('app/mantra_japa.js');
  assert.match(detail, /<GeneralJapaPreparation \/>/); assert.match(japa, /<GeneralJapaPreparation summary=\{!showPreparation\}/);
  assert.match(detail, /Reviewed mantra-specific practice guidance is not currently available/);
  assert.match(japa, /DIGITAL MALA · COUNTING TOOL/);
  assert.match(japa, /Counting target — not a mantra-specific prescription/);
  assert.match(japa, /Reviewed mantra-specific count:/);
});

test('synthetic audio and corrupt sacred-text presentation remain explicit', () => {
  const detail = read('app/mantra_detail.js'); const japa = read('app/mantra_japa.js');
  assert.match(detail, /Synthetic pronunciation aid · not verified recitation/);
  assert.match(detail, /Pronunciation verification is pending/);
  assert.match(detail, /sanskrit_text_corrupted \? 'Sacred text under review'/);
  assert.match(japa, /sanskrit_text_corrupted\?'Sacred text under review'/);
});

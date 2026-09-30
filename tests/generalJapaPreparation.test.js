'use strict';
/* global __dirname */

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
  assert.equal(value.items.length, 6);
  assert.ok(value.items.every(item => item.hi && item.en && item.category === 'RECOMMENDED'));
});

test('general guidance remains separate from canonical mantra practice', () => {
  const record = catalog.normalizeMantraRecord({ id:'separate', canonical_name:'Fixture', sanskrit_text:'fixture-content' });
  assert.deepEqual(record.preparation, {}); assert.deepEqual(record.practice, {});
  assert.equal(Object.hasOwn(record, 'general_preparation'), false);
});

test('Detail owns full preparation and Japa offers only a compact link', () => {
  const detail = read('app/mantra_detail.js'); const japa = read('app/mantra_japa.js');
  assert.match(detail, /<GeneralJapaPreparation \/>/); assert.doesNotMatch(japa, /GeneralJapaPreparation/);
  assert.doesNotMatch(detail, /Reviewed mantra-specific practice guidance is not currently available/);
  assert.match(detail, /Mantra-specific Practice/);
  assert.match(japa, /<DigitalMala/);
  assert.match(japa, /personal counting target, not mantra-specific practice guidance/);
  assert.match(japa, /View preparation/);
});

test('pronunciation lives in Japa and corrupt sacred-text presentation remains explicit', () => {
  const detail = read('app/mantra_detail.js'); const japa = read('app/mantra_japa.js');
  assert.doesNotMatch(detail, /Pronunciation \/ Audio|Learn pronunciation|device speech/i);
  assert.match(japa, /Learn pronunciation/);
  assert.match(japa, /device speech and is not verified recitation/);
  assert.match(detail, /sanskrit_text_corrupted \? 'Sacred text under review'/);
  assert.match(japa, /sanskrit_text_corrupted\?'Sacred text under review'/);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const explore = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'explore.js'), 'utf8');
const kundli = fs.readFileSync(path.join(__dirname, '..', 'app', 'my_kundli.js'), 'utf8');

test('Kundli CTA passes only area route state and existing preset question', () => {
  const lifeCard = kundli.slice(kundli.indexOf('function LifeCard'), kundli.indexOf('function LifeAreas'));
  assert.match(lifeCard, /dharmasetu_preset_question/);
  assert.match(lifeCard, /params:\{kundli_area:area\.id\.toLowerCase\(\)\}/);
  assert.doesNotMatch(lifeCard, /params:\{[^}]*?(?:planets|houses|chart_data|birth_time|date_of_birth)/);
});

test('explore validates route area and sends only Personal Kundli conversation marker', () => {
  assert.match(explore, /useLocalSearchParams\(\)/);
  assert.match(explore, /validKundliArea\(params\.kundli_area\)/);
  assert.match(explore, /\{ type: 'PERSONAL_KUNDLI', area: routeArea \}/);
  assert.match(explore, /conversationContextRef\.current/);
  assert.match(explore, /JSON\.stringify\(\{ messages, mode, panchangLocation, \.\.\.\(conversationContext/);
  const api = explore.slice(explore.indexOf('async function callBackendAI'), explore.indexOf('function getError'));
  assert.doesNotMatch(api, /birth_time|date_of_birth|chart_data|planets|houses|K4\.1|life_areas/);
});

test('initial auto-send and manual follow-ups use the active context ref', () => {
  assert.match(explore, /callBackendAI\(messages, profile,[^\n]+conversationContextRef\.current\)/);
  assert.match(explore, /autoSendDirect\(presetQ/);
  assert.match(explore, /include history/);
  for (const followUp of ['Why?', 'क्यों?', 'Job or business?', 'What about Jupiter?', 'Which fields?']) {
    assert.ok(followUp.length > 1);
    assert.match(explore, /conversationContextRef\.current/);
  }
});

test('bounded persistence is scoped to authenticated account and contains no Kundli payload', () => {
  assert.match(explore, /u\.auth_user_id \|\| u\.authUserId/);
  assert.match(explore, /ownerId === accountIdRef\.current/);
  assert.match(explore, /boundedChatHistory/);
  assert.match(explore, /history: next, conversationContext: conversationContextRef\.current/);
  const persistence = explore.slice(explore.indexOf('const DHARMACHAT_SESSION_PREFIX'), explore.indexOf('// ── RATE LIMITER'))
    + explore.slice(explore.indexOf('AsyncStorage.setItem(`${DHARMACHAT_SESSION_PREFIX'), explore.indexOf('return next;', explore.indexOf('AsyncStorage.setItem(`${DHARMACHAT_SESSION_PREFIX')));
  assert.doesNotMatch(persistence, /birth_time|date_of_birth|chart_data|provider_response|auth token/i);
});

test('build marker identifies D2 implementation', () => {
  assert.match(explore, /\[DharmaChatBuild\] personal-kundli-v1-d2-20260923/);
});

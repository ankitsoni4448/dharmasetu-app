'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'explore.js'), 'utf8');

test('DharmaChat uses authenticated backend request with a bounded deadline', () => {
  assert.match(source, /authenticatedFetch\(getBackendUrl\(BACKEND_CONFIG\.ENDPOINTS\.AI_DHARMA_CHAT\)/);
  assert.match(source, /setTimeout\(\(\) => controller\.abort\(\), 45000\)/);
  assert.doesNotMatch(source, /Authorization[^\n]+userProfile|userId:\s*userProfile/);
});

test('duplicate sends and retry are bounded', () => {
  assert.match(source, /if \(loadingRef\.current\) return false;/);
  assert.match(source, /loadingRef\.current = true;/);
  assert.match(source, /loadingRef\.current = false;/);
  assert.match(source, /retryMessage = useCallback/);
});

test('full backend answer renders atomically without a fake word stream', () => {
  const render = source.match(/const streamText = useCallback\([\s\S]*?\n\s*}, \[scrollDown\]\);/)?.[0] || '';
  assert.match(render, /body: fullText, streaming: false/);
  assert.doesNotMatch(render, /setInterval|split\(['"]\s['"]\)/);
});

test('Kundli readiness and provider failures stay structured and user-safe', () => {
  assert.match(source, /KUNDLI_CONTEXT_NOT_READY/);
  assert.match(source, /AI_PROVIDER_UNAVAILABLE/);
  assert.doesNotMatch(source, /response\.providerError|err\.stack/);
});

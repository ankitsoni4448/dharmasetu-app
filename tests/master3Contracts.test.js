'use strict';
/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const home = read(path.join('app', '(tabs)', 'index.js'));
const inbox = read(path.join('utils', 'notificationInbox.js'));
const futureScale = read(path.join('app', 'utils', 'futureScale.js'));
const voiceInput = read(path.join('app', 'utils', 'voiceInput.js'));
const privacy = read(path.join('app', 'privacy_policy.js'));
assert.doesNotMatch(home, /function getLocalFallback\s*\(/);
assert.match(inbox, /'\/panchang': '\/\(tabs\)'/);
assert.match(futureScale, /authenticatedFetch\(`\$\{BACKEND\}\/users\/push-token`/);
assert.doesNotMatch(futureScale, /body:\s*JSON\.stringify\(\{ phone, token \}\)/);
assert.match(voiceInput, /authenticatedFetch\(`\$\{BACKEND\}\/voice\/transcribe`/);
assert.doesNotMatch(privacy, /birth data never leaves your phone/i);
console.log('Master 3 frontend contract tests: PASS');
